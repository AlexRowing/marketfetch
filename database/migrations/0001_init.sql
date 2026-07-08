-- MarketFetch initial schema (CockroachDB)
-- Mirrors docs/database-schema.md. Idempotent: safe to re-run.
-- VECTOR(1024) matches Amazon Titan Text Embeddings V2.

CREATE TABLE IF NOT EXISTS users (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email        STRING NOT NULL UNIQUE,
    display_name STRING NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Buyer Memory (structured): one row per individual preference so the
-- agent can add/remove them independently.
CREATE TABLE IF NOT EXISTS user_preferences (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users (id),
    kind          STRING NOT NULL,            -- brand | size | color | category_budget
    value         STRING NOT NULL,
    numeric_value DECIMAL(10,2),              -- budget amount for category_budget
    source        STRING NOT NULL DEFAULT 'explicit',  -- explicit | inferred
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, kind, value)
);

-- Buyer Memory (vector): one live taste profile per user, recomputed
-- from saved/viewed listing embeddings after interactions.
CREATE TABLE IF NOT EXISTS user_taste_embeddings (
    user_id    UUID PRIMARY KEY REFERENCES users (id),
    embedding  VECTOR(1024) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS listings (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source        STRING NOT NULL,            -- vinted | ebay | seed | ...
    external_id   STRING NOT NULL,
    title         STRING NOT NULL,
    description   STRING NOT NULL DEFAULT '',
    brand         STRING,
    category      STRING NOT NULL,
    size          STRING,
    color         STRING,
    condition     STRING,
    image_url     STRING,
    url           STRING,
    current_price DECIMAL(10,2) NOT NULL,     -- denormalized latest snapshot
    currency      STRING NOT NULL DEFAULT 'EUR',
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active     BOOL NOT NULL DEFAULT true,
    embedding     VECTOR(1024),               -- title+description+brand+category
    UNIQUE (source, external_id)
);

-- Price Memory: append-only snapshots written by the backend worker.
CREATE TABLE IF NOT EXISTS price_snapshots (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id  UUID NOT NULL REFERENCES listings (id),
    price       DECIMAL(10,2) NOT NULL,
    currency    STRING NOT NULL DEFAULT 'EUR',
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    INDEX price_snapshots_listing_time_idx (listing_id, captured_at DESC)
);

-- Raw interaction event log — the signal Buyer Memory learns from.
CREATE TABLE IF NOT EXISTS interactions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users (id),
    listing_id UUID NOT NULL REFERENCES listings (id),
    kind       STRING NOT NULL,               -- view | save | reject | unsave
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    INDEX interactions_user_kind_time_idx (user_id, kind, created_at DESC)
);

-- CockroachDB vector index for taste-similarity feed ranking.
-- Kept last: requires a recent cluster version (v25.2+); if this statement
-- fails, all tables above are still created and the app works without
-- vector search until the cluster is upgraded.
CREATE VECTOR INDEX IF NOT EXISTS listings_embedding_idx ON listings (embedding);
