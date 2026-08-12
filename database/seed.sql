-- MarketFetch seed data — hand-curated listings so Dev A can build the UI
-- before Dev B's ingestion pipeline exists. Idempotent: fixed UUIDs +
-- ON CONFLICT DO NOTHING, safe to re-run.

-- Demo user ------------------------------------------------------------
INSERT INTO users (id, email, display_name) VALUES
  ('00000000-0000-0000-0000-000000000001', 'demo@marketfetch.dev', 'Alex (demo)')
ON CONFLICT DO NOTHING;

-- Buyer Memory: explicit starting preferences ---------------------------
INSERT INTO user_preferences (id, user_id, kind, value, numeric_value, source) VALUES
  ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'brand', 'Carhartt', NULL, 'explicit'),
  ('c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'brand', 'Levi''s', NULL, 'explicit'),
  ('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'size', 'M', NULL, 'explicit'),
  ('c0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'color', 'black', NULL, 'explicit'),
  ('c0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'category_budget', 'jackets', 69.50, 'explicit')
ON CONFLICT DO NOTHING;

-- Listings ---------------------------------------------------------------
INSERT INTO listings
  (id, source, external_id, title, description, brand, category, size, color, condition, current_price, currency, first_seen_at, last_seen_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'seed', 'seed-001', 'Carhartt Detroit Jacket', 'Classic duck canvas work jacket, blanket lined. Light fading, no tears.', 'Carhartt', 'jackets', 'M', 'brown', 'good', 67.00, 'USD', now() - '45 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000002', 'seed', 'seed-002', 'Levi''s 501 Original Jeans', 'Straight fit, button fly. Barely worn.', 'Levi''s', 'jeans', 'W32 L32', 'blue', 'very good', 40.50, 'USD', now() - '12 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000003', 'seed', 'seed-003', 'Nike Air Max 90', 'White/grey colorway, some creasing on toebox, soles in great shape.', 'Nike', 'sneakers', '42', 'white', 'good', 55.50, 'USD', now() - '30 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000004', 'seed', 'seed-004', 'Patagonia Better Sweater Fleece', 'Quarter-zip fleece, navy. Small pull on left sleeve.', 'Patagonia', 'fleeces', 'M', 'navy', 'good', 46.00, 'USD', now() - '8 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000005', 'seed', 'seed-005', 'The North Face Nuptse Puffer', '700-fill down puffer, black. Winter staple, fully functional zips.', 'The North Face', 'jackets', 'L', 'black', 'very good', 98.00, 'USD', now() - '60 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000006', 'seed', 'seed-006', 'Dr. Martens 1460 Boots', '8-eye smooth leather boots, nicely broken in.', 'Dr. Martens', 'shoes', '41', 'black', 'good', 63.50, 'USD', now() - '20 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000007', 'seed', 'seed-007', 'Adidas Samba OG', 'Black/white, gum sole. Light wear.', 'Adidas', 'sneakers', '42', 'black', 'good', 44.00, 'USD', now() - '5 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000008', 'seed', 'seed-008', 'Uniqlo Wool Blend Coat', 'Single-breasted grey overcoat, minimal wear.', 'Uniqlo', 'jackets', 'M', 'grey', 'very good', 34.50, 'USD', now() - '15 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000009', 'seed', 'seed-009', 'New Balance 574', 'Grey suede/mesh, classic runner. Clean condition.', 'New Balance', 'sneakers', '43', 'grey', 'very good', 48.50, 'USD', now() - '10 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000010', 'seed', 'seed-010', 'Carhartt Watch Hat Beanie', 'Acid black knit beanie with logo patch. Like new.', 'Carhartt', 'accessories', 'one size', 'black', 'like new', 14.00, 'USD', now() - '3 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000011', 'seed', 'seed-011', 'Vintage Levi''s Denim Trucker Jacket', 'Type III trucker from the 90s, beautiful fade.', 'Levi''s', 'jackets', 'L', 'blue', 'good', 52.00, 'USD', now() - '25 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000012', 'seed', 'seed-012', 'Ralph Lauren Oxford Shirt', 'Classic fit button-down, white. Crisp condition.', 'Ralph Lauren', 'shirts', 'M', 'white', 'very good', 25.50, 'USD', now() - '7 days'::INTERVAL, now())
ON CONFLICT DO NOTHING;

-- Clothing/lifestyle expansion: the first 12 were dominated by outerwear and
-- sneakers, and after ingestion the real catalog skews music gear + vinyl
-- (Reverb/Discogs). These round out categories the real adapters don't cover.
INSERT INTO listings
  (id, source, external_id, title, description, brand, category, size, color, condition, current_price, currency, first_seen_at, last_seen_at) VALUES
  ('a0000000-0000-0000-0000-000000000013', 'seed', 'seed-013', 'Carhartt Michigan Chore Coat', 'Duck canvas chore coat, blanket lined, black. A couple small marks, no damage.', 'Carhartt', 'jackets', 'M', 'black', 'good', 60.00, 'USD', now() - '40 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000014', 'seed', 'seed-014', 'Levi''s Trucker Jacket', 'Classic trucker in black denim, lightly worn.', 'Levi''s', 'jackets', 'M', 'black', 'very good', 55.50, 'USD', now() - '18 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000015', 'seed', 'seed-015', 'Wrangler Denim Jacket', 'Mid-wash blue trucker style, broken in.', 'Wrangler', 'jackets', 'L', 'blue', 'good', 40.50, 'USD', now() - '22 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000016', 'seed', 'seed-016', 'Barbour Wax Jacket', 'Waxed cotton, olive, corduroy collar. Needs a re-wax but structurally excellent.', 'Barbour', 'jackets', 'L', 'olive', 'good', 90.00, 'USD', now() - '33 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000017', 'seed', 'seed-017', 'Levi''s 505 Jeans', 'Regular fit, mid-blue wash. Great everyday condition.', 'Levi''s', 'jeans', 'W34 L32', 'blue', 'good', 34.50, 'USD', now() - '27 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000018', 'seed', 'seed-018', 'Diesel Slim Jeans', 'Black slim fit, minimal fading.', 'Diesel', 'jeans', 'W32 L30', 'black', 'good', 44.00, 'USD', now() - '9 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000019', 'seed', 'seed-019', 'Converse Chuck 70', 'Black high-top, canvas in great shape, soles show light wear.', 'Converse', 'sneakers', '43', 'black', 'very good', 52.00, 'USD', now() - '14 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000020', 'seed', 'seed-020', 'Vans Old Skool', 'Black/white classic, some scuffing on the toe.', 'Vans', 'sneakers', '42', 'black', 'good', 37.00, 'USD', now() - '6 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000021', 'seed', 'seed-021', 'Puma Suede Classic', 'Green suede, gum sole. Light wear throughout.', 'Puma', 'sneakers', '44', 'green', 'good', 41.50, 'USD', now() - '11 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000022', 'seed', 'seed-022', 'Flannel Check Shirt', 'Red buffalo check, brushed cotton. Cozy and warm.', NULL, 'shirts', 'M', 'red', 'very good', 21.00, 'USD', now() - '4 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000023', 'seed', 'seed-023', 'Champion Reverse Weave Hoodie', 'Grey heavyweight hoodie, small logo embroidery, no pilling.', 'Champion', 'hoodies', 'M', 'grey', 'very good', 32.50, 'USD', now() - '17 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000024', 'seed', 'seed-024', 'Carhartt WIP Beanie', 'Ribbed knit beanie, black, small logo patch. Like new.', 'Carhartt', 'accessories', 'one size', 'black', 'like new', 17.50, 'USD', now() - '2 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000025', 'seed', 'seed-025', 'Fjallraven Kanken Backpack', 'Ochre yellow, classic silhouette. Minor fading, straps intact.', 'Fjallraven', 'bags', 'one size', 'yellow', 'good', 48.50, 'USD', now() - '24 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000026', 'seed', 'seed-026', 'Herschel Weekend Duffel', 'Navy canvas weekender, roomy main compartment, one small stain inside.', 'Herschel', 'bags', 'one size', 'navy', 'good', 39.00, 'USD', now() - '13 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000027', 'seed', 'seed-027', 'Ray-Ban Wayfarer Sunglasses', 'Classic black frame, UV lenses, comes with case.', 'Ray-Ban', 'accessories', 'one size', 'black', 'very good', 63.50, 'USD', now() - '19 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000028', 'seed', 'seed-028', 'Casio Vintage Watch', 'Gold-tone digital watch, classic square face, new battery.', 'Casio', 'accessories', 'one size', 'gold', 'good', 32.50, 'USD', now() - '31 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000029', 'seed', 'seed-029', 'Polaroid Now Instant Camera', 'White body, autofocus, tested and working. Comes with a half-used film pack.', 'Polaroid', 'electronics', 'one size', 'white', 'very good', 75.00, 'USD', now() - '8 days'::INTERVAL, now())
ON CONFLICT DO NOTHING;

-- All hand-authored demo rows above are synthetic (see 0004_is_synthetic.sql).
-- A follow-up UPDATE (not inline in the INSERTs) so this stays a one-line,
-- idempotent fix instead of touching every VALUES tuple.
UPDATE listings SET is_synthetic = true WHERE source = 'seed' AND NOT is_synthetic;

-- Price Memory: history for three listings so charts/deal badges have data.
-- Carhartt jacket: 86.50 → 75 → 67 (the demo's "good deal" story)
-- Air Max 90:      69.50 → 60 → 55.50
-- Nuptse puffer:  127 → 109.50 → 98
INSERT INTO price_snapshots (id, listing_id, price, currency, captured_at) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 86.50, 'USD', now() - '45 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 75.00, 'USD', now() - '20 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 67.00, 'USD', now() - '2 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 69.50, 'USD', now() - '30 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 60.00, 'USD', now() - '14 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 55.50, 'USD', now() - '3 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000005', 127.00, 'USD', now() - '60 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000005', 109.50, 'USD', now() - '28 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000005', 98.00, 'USD', now() - '5 days'::INTERVAL),
  -- Carhartt Michigan Chore Coat: 71.50 → 63.50 → 60 (on-persona: Carhartt, black, under jackets budget)
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000013', 71.50, 'USD', now() - '40 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000013', 63.50, 'USD', now() - '18 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000013', 60.00, 'USD', now() - '3 days'::INTERVAL),
  -- Barbour Wax Jacket: 109.50 → 98 → 90 (contrast: drops but stays above the $69.50 jackets budget)
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000016', 109.50, 'USD', now() - '33 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000016', 98.00, 'USD', now() - '15 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000016', 90.00, 'USD', now() - '4 days'::INTERVAL),
  -- Levi's 505 Jeans: 41.50 → 37 → 34.50
  ('b0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000017', 41.50, 'USD', now() - '27 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000017', 37.00, 'USD', now() - '11 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000017', 34.50, 'USD', now() - '2 days'::INTERVAL)
ON CONFLICT DO NOTHING;

-- Single snapshot at current price for the remaining listings.
INSERT INTO price_snapshots (id, listing_id, price, currency, captured_at)
SELECT gen_random_uuid(), l.id, l.current_price, l.currency, l.first_seen_at
FROM listings l
WHERE l.source = 'seed'
  AND NOT EXISTS (SELECT 1 FROM price_snapshots ps WHERE ps.listing_id = l.id);
