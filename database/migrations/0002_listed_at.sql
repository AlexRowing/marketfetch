-- 0002: marketplace listing date.
-- listed_at = when the seller published the listing on the source marketplace
-- (Reverb: `published_at`). Distinct from first_seen_at (when our ingestion
-- first saw it) so listing age reflects the marketplace, not our crawl time.
-- NULL is fine — the frontend falls back to first_seen_at.
-- Ingestion (backend/) should populate this on insert AND backfill on update.

ALTER TABLE listings ADD COLUMN IF NOT EXISTS listed_at TIMESTAMPTZ;
