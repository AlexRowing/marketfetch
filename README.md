# MarketFetch 🛒🤖

An AI buying agent for second-hand marketplaces. It remembers what you like
(**Buyer Memory**) and what things should cost (**Price Memory**), then surfaces
deals worth acting on — with reasoning grounded in its own database.

MarketFetch is a **general** secondhand marketplace. The demo catalog leads with
**clothing** (jackets, jeans, sneakers, hoodies — where size/brand/colour/budget
make preferences meaningful), alongside **real listings** pulled live from the
**Reverb** (used music gear) and **Discogs** (vinyl) APIs. The agent reasons over
all of it: comparable prices, price-drop history, and how well each item fits you.

Built for the CockroachDB × AWS hackathon by a 2-person team.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend + API | Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 |
| Agent worker | Node.js + TypeScript (`backend/`, run via `tsx`) |
| Memory layer | **CockroachDB Cloud** — SQL + `VECTOR(1024)` **vector index** for taste/listing embeddings, accessed via `node-postgres` (no ORM) |
| Agent ⇄ DB | **CockroachDB MCP Server** (Model Context Protocol) |
| AI | **Amazon Bedrock** — Claude Sonnet (reasoning) + Titan Text Embeddings V2 (vectors) |
| Data sources | Reverb API · Discogs API |
| Hosting | **Vercel** (web app + API routes) · **AWS Lambda + EventBridge** (price-snapshot worker) |

## Repository layout

```
marketfetch/
├── frontend/    # Next.js app: feed, saved, listing detail, preferences, agent chat + API routes
│   └── src/
│       ├── app/          # routes (App Router): (feed), saved, preferences, chat, listings/[id], privacy, login
│       ├── components/   # listings/ chat/ ui/ preferences/ auth/
│       ├── lib/          # data access + helpers (agent, listings, deals, briefing, search…)
│       └── types/        # shared domain types (mirrors the DB schema)
│   └── public/listings/  # generated product images for the synthetic clothing catalog
├── backend/     # agent worker: ingestion, clothing seed, image + embedding backfills, price snapshots
├── database/    # CockroachDB migrations + demo reset (raw SQL)
└── docs/        # product spec, architecture, database schema
```

## Getting started (frontend)

```sh
cd frontend
npm install
cp .env.example .env.local     # then fill in the values (see below)
npm run dev                    # http://localhost:3000
```

`.env.local` — `DATABASE_URL` and `AUTH_SECRET` are required for the app to run
(feed, login, session). The `/api/chat` agent additionally needs the CockroachDB
MCP Server vars (`CRDB_MCP_URL`, `CRDB_MCP_API_KEY`, `CRDB_MCP_CLUSTER_ID`) and
AWS Bedrock access (`AWS_REGION`, `BEDROCK_MODEL_ID` + local AWS credentials).
See `frontend/.env.example`. Without the agent vars the site still works; the
chat just answers that its memory isn't reachable.

## Database

Schema lives in `database/migrations/` (`0001_init` … `0004_is_synthetic`) — apply
them in order to your CockroachDB cluster. Highlights: `listings` (with an
`embedding VECTOR(1024)` column + vector index and an `is_synthetic` flag),
`price_snapshots` (append-only Price Memory), `user_preferences` /
`user_taste_embeddings` (Buyer Memory), and `interactions` (view/save/reject).
`database/reset-demo.sql` clears the demo user's activity for a clean on-stage run.

## Demo data (backend)

The backend scripts populate the catalog. They read `backend/.env` (needs
`DATABASE_URL`; `REVERB_API_TOKEN` / `DISCOGS_API_TOKEN` for ingest; local AWS
credentials for embeddings).

```sh
cd backend
npm install

# 1. Synthetic clothing catalog: ~257 deterministic listings across 11 categories
#    (jackets/jeans/shoes/hoodies/tees/…), with seeded price histories, varied
#    sizes/colours/conditions, and a generated product image per listing written
#    to frontend/public/listings/. --reset wipes the catalog first.
npm run seed:clothing:reset

# 2. (only if any listing is missing an image) regenerate product images.
npm run images:backfill

# 3. Embeddings — powers "usually sells around $X" comparables + taste ranking.
#    Needs AWS credentials (Bedrock/Titan). Idempotent.
npm run embed:backfill

# 4. Optional: pull REAL listings from Reverb + Discogs (additive, alongside
#    the clothing). Needs REVERB_API_TOKEN + DISCOGS_API_TOKEN in backend/.env.
npm run ingest
```

Synthetic clothing listings carry `is_synthetic=true` and a realistic marketplace
`source` label (vinted/depop/ebay/grailed) with namespaced `mf-*` external ids, so
a future real adapter for any of those can't collide. Their product images are
self-hosted SVGs (committed under `frontend/public/listings/`), so they render on
cards and detail pages with no external image dependency.

## Marketplace adapters (real listings)

Real listings come in through `MarketplaceAdapter` implementations
(`backend/src/marketplaces/`) — official APIs only, no scraping. Each keeps its
original photo, title, description, and a link back to the source listing.
**Reverb** (used music gear) is adapter #1; **Discogs** (vinyl/music media) is
adapter #2 — its API has no per-seller listing search, so a Discogs listing is a
release priced at its lowest current ask, linking to the release's sell page.

```sh
cd backend
npm run ingest    # pulls the curated queries in src/ingestion/queries.ts,
                  # upserts on (source, external_id), embeds new listings
```

Adding a marketplace: implement `MarketplaceAdapter` in one file, register it in
`ingest.ts`/`snapshot-pass.ts`, add queries. The frontend needs zero changes —
images, source badges, and outbound links all key off the DB columns.

**Price integrity:** real (non-synthetic) listings never get simulated prices —
the snapshot Lambda re-fetches their actual price from the marketplace and
deactivates ended listings. Synthetic listings carry their seeded price history
and aren't live-refreshed.

## Scheduled price snapshots (AWS Lambda + EventBridge)

Price Memory grows on its own: Lambda function `marketfetch-price-snapshot`
(us-east-1) runs the snapshot pass every 6 hours via EventBridge rule
`marketfetch-price-snapshot-6h`. The CLI (`cd backend && npm run prices:snapshot`)
and the Lambda share the same core in `backend/src/pricing/snapshot-pass.ts`.

```powershell
# Deploy or update (idempotent). Needs AWS CLI creds + backend/.env with DATABASE_URL.
powershell -File backend/deploy/deploy-snapshot-lambda.ps1

# Verify a run
aws lambda invoke --function-name marketfetch-price-snapshot --region us-east-1 out.json; cat out.json
aws logs tail /aws/lambda/marketfetch-price-snapshot --region us-east-1 --since 6h

# Pause / resume the schedule
aws events disable-rule --name marketfetch-price-snapshot-6h --region us-east-1
aws events enable-rule  --name marketfetch-price-snapshot-6h --region us-east-1
```

The DB connection string lives in a Lambda environment variable set at deploy
time from `backend/.env` — never committed.

## Docs

- [Product spec](docs/product-spec.md) — what we're building, MVP scope, demo script
- [Architecture](docs/architecture.md) — components, data flows, AWS deployment
- [Database schema](docs/database-schema.md) — both memory systems as tables + key queries

## Team workflow

- **Dev A — product surface:** frontend pages, API routes, UI state.
- **Dev B — agent & data:** ingestion, price snapshots, Bedrock agent, MCP wiring.
- Integration contract: `docs/database-schema.md` + `frontend/src/types/index.ts`. Change the schema doc first, then the types, then the code.
