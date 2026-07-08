# MarketFetch — Architecture

## Overview

```
┌────────────────────────────────────────────────────────────────┐
│                          User (browser)                        │
└───────────────┬────────────────────────────────────────────────┘
                │
┌───────────────▼────────────────────────────────────────────────┐
│  frontend/  — Next.js 15 (App Router, TypeScript, Tailwind)    │
│  • Feed, listing detail, preferences, agent chat UI            │
│  • API routes (/api/*) — the app's entire HTTP backend         │
└───────┬──────────────────────────────┬─────────────────────────┘
        │ SQL (pg)                     │ Bedrock Runtime API
┌───────▼──────────────┐   ┌───────────▼────────────────────────┐
│  CockroachDB Cloud   │   │  Amazon Bedrock                    │
│  • Buyer Memory      │   │  • Claude Sonnet — agent reasoning │
│  • Price Memory      │◄──┤  • Titan Embed v2 — 1024-d vectors │
│  • Vector indexes    │   └───────────▲────────────────────────┘
└───────▲──────────────┘               │
        │ MCP (tools: query memory)    │
┌───────┴───────────────────────────────┴────────────────────────┐
│  backend/  — Agent worker (Node.js + TypeScript)               │
│  • Listing ingestion / seed pipeline                           │
│  • Price snapshot job (writes price history)                   │
│  • Agent loop: Bedrock ⇄ CockroachDB MCP Server                │
└────────────────────────────────────────────────────────────────┘
```

## Components

### frontend/ — Next.js app
- **App Router + `src/` layout.** Pages: feed (`/`), listing detail (`/listings/[id]`), preferences (`/preferences`), agent chat (`/chat`).
- **API routes** under `src/app/api/` serve the UI: listings CRUD-lite, interactions (save/reject/view), preferences, and a `/api/chat` endpoint that proxies to the agent.
- **No separate HTTP backend.** For a 2-person hackathon, Next.js API routes remove a whole deploy target, CORS, and duplicated types.

### backend/ — Agent worker
Everything that is *not* request/response:
- **Ingestion:** seed or scrape listings into CockroachDB.
- **Price snapshots:** periodic job recording current prices → `price_snapshots` (Price Memory grows automatically).
- **Agent loop:** receives a user question, calls Claude on Bedrock with the **CockroachDB MCP Server** attached as its toolset. The agent answers by *actually querying* Buyer Memory and Price Memory — that's the demo story.

### CockroachDB — the persistent memory layer
- Single source of truth for both memory systems. Schema in [database-schema.md](database-schema.md), migrations in `database/migrations/`.
- **Vector indexing:** listing embeddings and user taste embeddings stored as `VECTOR(1024)` with vector indexes for similarity search ("more like what I saved").
- **Access pattern:** raw SQL via `pg`. No ORM — CockroachDB's `VECTOR` type has weak ORM support, and raw SQL keeps migrations honest.

### Amazon Bedrock
- **Claude (Sonnet)** — agent reasoning + chat responses.
- **Titan Text Embeddings V2** — 1024-dimension embeddings for listings (title + description + brand + category) and user taste profiles. The dimension is fixed in the schema; changing models later means re-embedding.

### CockroachDB MCP Server
- Runs alongside the agent worker; exposes the database as MCP tools (query, schema inspection).
- The Bedrock agent uses it to read/write memory instead of hand-rolled function calls — one integration, and it satisfies the hackathon requirement directly.

## Data flows

1. **Browse:** UI → API route → SQL → CockroachDB. Feed query combines hard filters (size, budget from Buyer Memory) with vector similarity to the user's taste embedding.
2. **Interact (save/reject/view):** UI → API route → insert into `interactions` → (async) recompute user taste embedding from saved/viewed listing embeddings.
3. **Price memory:** worker snapshots listing prices on a schedule → deltas and listing age computed in SQL → deal score surfaced in UI.
4. **Agent chat:** UI → `/api/chat` → agent worker → Bedrock (Claude) ⇄ CockroachDB MCP Server ⇄ CockroachDB → grounded answer with citations to memory.

## Deployment (AWS)

| Piece | Target |
|---|---|
| Frontend + API routes | AWS Amplify Hosting (or Vercel if time is short — Amplify keeps it all-AWS) |
| Agent worker | AWS Lambda (chat handler) + EventBridge schedule (price snapshots) — or a single small EC2/App Runner instance for hackathon simplicity |
| Database | CockroachDB Cloud (serverless) |
| AI | Amazon Bedrock (us-east-1) |

## Environment variables (contract, not yet wired)

```
DATABASE_URL=            # CockroachDB Cloud connection string
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=        # Claude model id
BEDROCK_EMBED_MODEL_ID=amazon.titan-embed-text-v2:0
```

Never commit `.env*` files — the root `.gitignore` excludes them.
