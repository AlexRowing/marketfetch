# MarketFetch — Database Schema (CockroachDB)

The schema is the contract between both developers. Draft DDL lives in
[`database/migrations/0001_init.sql`](../database/migrations/0001_init.sql) — this doc explains it.
**Not yet applied anywhere** — foundation only.

## Conventions

- `UUID` primary keys with `gen_random_uuid()`.
- `TIMESTAMPTZ` everywhere, `DEFAULT now()`.
- Embeddings are `VECTOR(1024)` — matches Amazon Titan Text Embeddings V2. If the embedding model changes, the dimension changes and all vectors must be regenerated.
- Money as `DECIMAL(10,2)` + `currency` char code. Never floats.

## Entity overview

```
users ──< user_preferences        (Buyer Memory — structured)
users ──< user_taste_embeddings   (Buyer Memory — vector)
users ──< interactions >── listings
listings ──< price_snapshots      (Price Memory)
listings ──  embedding column     (vector-indexed)
```

## Tables

### `users`
| column | type | notes |
|---|---|---|
| id | UUID PK | |
| email | STRING UNIQUE | lowercased before insert/lookup |
| display_name | STRING | |
| password_hash | STRING NULL | `s1$<saltHex>$<scryptHex>` (Node crypto.scrypt, N=16384 r=8 p=1, 64-byte key); NULL = account can't log in yet (migration 0003) |
| created_at | TIMESTAMPTZ | |

### `user_preferences` — Buyer Memory (structured)
One row per (user, kind, value) so preferences are individually addable/removable by the agent.

| column | type | notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| kind | STRING | `brand` \| `size` \| `color` \| `category_budget` |
| value | STRING | e.g. `"Carhartt"`, `"M"`, `"black"`, `"jackets"` |
| numeric_value | DECIMAL(10,2) NULL | budget amount when kind = `category_budget` |
| source | STRING | `explicit` (user set it) \| `inferred` (agent learned it) |
| created_at | TIMESTAMPTZ | |

Unique on `(user_id, kind, value)`.

### `user_taste_embeddings` — Buyer Memory (vector)
| column | type | notes |
|---|---|---|
| user_id | UUID PK, FK → users | one live taste profile per user |
| embedding | VECTOR(1024) | mean of saved/viewed listing embeddings (saves weighted higher) |
| updated_at | TIMESTAMPTZ | recomputed after interactions |

### `listings`
| column | type | notes |
|---|---|---|
| id | UUID PK | |
| source | STRING | marketplace name (`vinted`, `ebay`, `seed`, …) |
| external_id | STRING | id on the source marketplace |
| title | STRING | |
| description | STRING | |
| brand | STRING NULL | |
| category | STRING | |
| size | STRING NULL | |
| color | STRING NULL | |
| condition | STRING NULL | |
| image_url | STRING NULL | |
| url | STRING NULL | link to original listing |
| current_price | DECIMAL(10,2) | denormalized from latest snapshot for fast feed queries |
| currency | STRING | ISO 4217, default `EUR` |
| listed_at | TIMESTAMPTZ NULL | when the seller listed it on the marketplace (e.g. Reverb `published_at`); populated by ingestion. NULL → UI falls back to first_seen_at (migration 0002) |
| first_seen_at | TIMESTAMPTZ | when *we* first ingested it; listing-age fallback |
| last_seen_at | TIMESTAMPTZ | listings vanish; don't hard-delete |
| is_active | BOOL | |
| embedding | VECTOR(1024) NULL | from title+description+brand+category |

Unique on `(source, external_id)`. **Vector index** on `embedding` (CockroachDB vector indexing — a hackathon requirement).

### `price_snapshots` — Price Memory
Append-only. Written by the backend worker on each ingestion pass.

| column | type | notes |
|---|---|---|
| id | UUID PK | |
| listing_id | UUID FK → listings | |
| price | DECIMAL(10,2) | |
| currency | STRING | |
| captured_at | TIMESTAMPTZ | |

Index on `(listing_id, captured_at DESC)`. Price *changes*, listing *age*, and *market averages* are derived in SQL (window functions / aggregates over comparable listings), not stored.

### `interactions`
Append-only event log — the raw signal Buyer Memory learns from.

| column | type | notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | |
| listing_id | UUID FK → listings | |
| kind | STRING | `view` \| `save` \| `reject` \| `unsave` |
| created_at | TIMESTAMPTZ | |

Index on `(user_id, kind, created_at DESC)`. "Saved items" = latest `save` without a later `unsave`; rejected items are excluded from the feed and used as negative ranking signal.

## Key queries (sketches)

**Personalized feed** — hard filters from structured Buyer Memory, ranked by vector similarity to the taste profile:

```sql
SELECT l.*, l.embedding <=> t.embedding AS distance
FROM listings l, user_taste_embeddings t
WHERE t.user_id = $1
  AND l.is_active
  AND l.id NOT IN (SELECT listing_id FROM interactions
                   WHERE user_id = $1 AND kind = 'reject')
ORDER BY distance
LIMIT 40;
```

**Deal score** — current price vs. 60-day market average of comparable listings:

```sql
SELECT l.current_price,
       avg(ps.price) AS market_avg_60d
FROM listings l
JOIN listings comp ON comp.category = l.category
                  AND comp.brand IS NOT DISTINCT FROM l.brand
JOIN price_snapshots ps ON ps.listing_id = comp.id
                       AND ps.captured_at > now() - INTERVAL '60 days'
WHERE l.id = $1
GROUP BY l.current_price;
```

## Open decisions (agree before applying migrations)

1. Vector index parameters and distance metric (cosine assumed above).
2. Whether taste embedding recompute is synchronous on interaction or a worker job (start synchronous — simplest).
3. Comparable-listing definition for market average (category+brand assumed; may need size/condition).
