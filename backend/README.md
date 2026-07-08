# backend/ — Agent worker

Everything that is **not** request/response lives here. The frontend's API routes serve the UI;
this worker handles the agent and the data pipeline.

Planned layout (not yet implemented — see [docs/architecture.md](../docs/architecture.md)):

```
backend/
└── src/
    ├── agent/       # Bedrock (Claude) agent loop + CockroachDB MCP Server wiring
    ├── ingestion/   # listing seed/scrape pipeline → CockroachDB
    ├── pricing/     # scheduled price snapshot job (feeds Price Memory)
    └── db/          # pg client + query helpers (raw SQL, no ORM)
```

Owner: **Dev B** (agent & data). Nothing here is wired yet by design — the foundation
freezes the schema and contracts first (see docs/database-schema.md).
