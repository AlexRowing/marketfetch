-- 0004: explicit synthetic/demo flag.
-- Some listings are generated demo data wearing real marketplace source labels
-- (vinted/depop/ebay/grailed - see backend/src/ingestion/seed-clothing.ts) so
-- the agent has a rich clothing catalog to reason over. Without an explicit
-- flag, the UI has no reliable way to distinguish them from listings that came
-- through a real MarketplaceAdapter (Reverb, Discogs), which always populate
-- `url`. This makes the distinction a first-class column instead of an
-- incidental "url is null" inference.
--
-- Real adapters (backend/src/marketplaces/*) never set this - it defaults to
-- false, which is correct for every INSERT that doesn't mention it.

ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_synthetic BOOL NOT NULL DEFAULT false;
