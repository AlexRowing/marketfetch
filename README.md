# MarketFetch 🛒🤖

An AI buying agent for second-hand marketplaces. It remembers what you like
(**Buyer Memory**) and what things should cost (**Price Memory**), then surfaces
deals worth acting on — with reasoning grounded in its own database.

Built for a hackathon by a 2-person team.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend + API | Next.js 16 (App Router) · TypeScript · Tailwind CSS |
| Agent worker | Node.js + TypeScript (`backend/`) |
| Memory layer | **CockroachDB Cloud** — incl. **vector indexing** for taste/listing embeddings |
| Agent ⇄ DB | **CockroachDB MCP Server** |
| AI | **Amazon Bedrock** — Claude (reasoning) + Titan Embeddings V2 (vectors) |
| Hosting | AWS (Amplify + Lambda/EventBridge) |

## Repository layout

```
marketfetch/
├── frontend/    # Next.js app: feed, listing detail, preferences, agent chat + API routes
│   └── src/
│       ├── app/          # routes (App Router)
│       ├── components/   # listings/ chat/ ui/
│       ├── lib/          # client helpers
│       └── types/        # shared domain types (mirrors the DB schema)
├── backend/     # agent worker: ingestion, price snapshots, Bedrock+MCP agent loop
├── database/    # CockroachDB migrations (raw SQL)
└── docs/        # product spec, architecture, database schema
```

## Getting started

```sh
cd frontend
npm install
npm run dev      # http://localhost:3000
```

The backend worker and database are **not wired yet** — this is the foundation commit.
Schema and contracts are frozen in `docs/` so both developers can build in parallel.

## Scheduled price snapshots (AWS Lambda + EventBridge)

Price Memory grows on its own: Lambda function `marketfetch-price-snapshot`
(us-east-1) runs the snapshot pass every 6 hours via EventBridge rule
`marketfetch-price-snapshot-6h`, appending one `price_snapshots` row per active
listing. The CLI (`cd backend && npm run prices:snapshot`) and the Lambda share
the same core in `backend/src/pricing/snapshot-pass.ts`.

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

The execution role has `AWSLambdaBasicExecutionRole` only (CloudWatch Logs);
the DB connection string lives in a Lambda environment variable set at deploy
time from `backend/.env` — never committed.

## Docs

- [Product spec](docs/product-spec.md) — what we're building, MVP scope, demo script
- [Architecture](docs/architecture.md) — components, data flows, AWS deployment
- [Database schema](docs/database-schema.md) — both memory systems as tables + key queries

## Team workflow

- **Dev A — product surface:** frontend pages, API routes, UI state.
- **Dev B — agent & data:** ingestion, price snapshots, Bedrock agent, MCP wiring.
- Integration contract: `docs/database-schema.md` + `frontend/src/types/index.ts`. Change the schema doc first, then the types, then the code.
