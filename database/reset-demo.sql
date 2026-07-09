-- Reset the demo user to a clean slate before a demo/rehearsal.
-- Clears all activity so the taste profile is rebuilt LIVE on stage as you
-- save/reject items — the feed re-ranks from a blank slate, which is the
-- whole pitch. Leaves listings and price history untouched.
--
-- Run with: npm run db:reset   (from frontend/)

-- Wipe interaction history (views, saves, rejects).
DELETE FROM interactions
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Drop the taste embedding so the feed falls back to newest-first until the
-- first live save recomputes it.
DELETE FROM user_taste_embeddings
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- Remove any preferences the agent inferred during testing, so the
-- preferences page shows only the clean explicit baseline.
DELETE FROM user_preferences
WHERE user_id = '00000000-0000-0000-0000-000000000001'
  AND source = 'inferred';

-- Restore the explicit preference baseline (idempotent — safe if already present).
INSERT INTO user_preferences (id, user_id, kind, value, numeric_value, source) VALUES
  ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'brand', 'Carhartt', NULL, 'explicit'),
  ('c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'brand', 'Levi''s', NULL, 'explicit'),
  ('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'size', 'M', NULL, 'explicit'),
  ('c0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'color', 'black', NULL, 'explicit'),
  ('c0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'category_budget', 'jackets', 60.00, 'explicit')
ON CONFLICT (user_id, kind, value) DO NOTHING;
