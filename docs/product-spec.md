# MarketFetch — Product Spec

## Goal

An AI buying agent for second-hand marketplaces. It remembers what you like (Buyer Memory) and what things should cost (Price Memory), then proactively surfaces deals that match both — "this jacket is your size, your brand, and 30% below its 60-day average price."

## Why it wins

Most marketplace search is stateless: you re-type filters every session and have no idea whether a price is good. MarketFetch's agent has **persistent memory backed by CockroachDB**, so every interaction (save, reject, view) makes it smarter, and every listing it has ever seen contributes to a price history that tells you whether *today* is the day to buy.

## Core Memory Systems

### 1. Buyer Memory (who you are)

| Data | Source | Used for |
|---|---|---|
| Favorite brands | explicit settings + inferred from saves | ranking, alerts |
| Sizes | explicit settings | hard filter |
| Colors | explicit + inferred | ranking |
| Budget (per category) | explicit settings | hard filter + deal scoring |
| Saved items | user action | preference embedding, "watch" alerts |
| Rejected items | user action | negative signal in ranking |
| Viewing history | implicit | preference embedding, recency signals |

Preferences are stored both as **structured rows** (sizes, budgets — used as hard SQL filters) and as **vector embeddings** (taste profile derived from saved/viewed items — used for semantic similarity search via CockroachDB vector indexes).

### 2. Price Memory (what things cost)

| Data | Source | Used for |
|---|---|---|
| Listing price history | ingestion pipeline snapshots | price-drop detection |
| Price changes | computed deltas between snapshots | "dropped 15% yesterday" |
| Listing age | first-seen timestamp | "listed 45 days ago — seller may negotiate" |
| Market pricing | aggregates over comparable listings | deal score ("22% below market") |

## MVP Features (hackathon scope)

1. **User accounts** — minimal: a user row + preferences page. No real auth needed for the demo (single demo user is acceptable).
2. **Listing feed** — browsable grid of second-hand listings (seeded/scraped dataset), filtered by Buyer Memory.
3. **User interactions** — save ❤️ / reject ✖️ / view tracking on listings.
4. **Buyer Memory** — preferences page + interactions feed back into stored preferences and taste embeddings.
5. **Price Memory** — price history sparkline on each listing detail page; deal badge ("X% below market").
6. **AI recommendations** — chat with the agent ("find me a Carhartt jacket under €60"); agent uses the CockroachDB MCP Server to query both memories and explain *why* each result fits.

## Demo script (target)

1. Open feed → generic listings.
2. Save 3 vintage jackets, reject 2 fast-fashion items.
3. Feed re-ranks visibly toward the taste profile.
4. Open a listing → price history chart shows a recent drop → "Good deal: 25% below 60-day average."
5. Ask the agent in chat: "anything like the jacket I saved, but cheaper?" → agent answers with reasoning that cites memory ("you saved X, your budget for jackets is Y…").

## Non-goals (hackathon)

- Real marketplace checkout / payments.
- Real-time scraping at scale (a seeded dataset + a small ingestion script is enough).
- Production auth, multi-tenancy hardening, mobile apps.

## Team split (2 developers)

- **Dev A — Product surface:** Next.js frontend, API routes, preferences UI, feed, listing detail, chat UI.
- **Dev B — Agent & data:** ingestion/seed pipeline, price snapshot job, CockroachDB schema + vector indexes, Bedrock agent loop, MCP server wiring.

Integration point: the database schema (see [database-schema.md](database-schema.md)) — agree on it first, then work in parallel.
