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
  ('c0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'category_budget', 'jackets', 60.00, 'explicit')
ON CONFLICT DO NOTHING;

-- Listings ---------------------------------------------------------------
INSERT INTO listings
  (id, source, external_id, title, description, brand, category, size, color, condition, current_price, currency, first_seen_at, last_seen_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'seed', 'seed-001', 'Carhartt Detroit Jacket', 'Classic duck canvas work jacket, blanket lined. Light fading, no tears.', 'Carhartt', 'jackets', 'M', 'brown', 'good', 58.00, 'EUR', now() - '45 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000002', 'seed', 'seed-002', 'Levi''s 501 Original Jeans', 'Straight fit, button fly. Barely worn.', 'Levi''s', 'jeans', 'W32 L32', 'blue', 'very good', 35.00, 'EUR', now() - '12 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000003', 'seed', 'seed-003', 'Nike Air Max 90', 'White/grey colorway, some creasing on toebox, soles in great shape.', 'Nike', 'sneakers', '42', 'white', 'good', 48.00, 'EUR', now() - '30 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000004', 'seed', 'seed-004', 'Patagonia Better Sweater Fleece', 'Quarter-zip fleece, navy. Small pull on left sleeve.', 'Patagonia', 'fleeces', 'M', 'navy', 'good', 40.00, 'EUR', now() - '8 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000005', 'seed', 'seed-005', 'The North Face Nuptse Puffer', '700-fill down puffer, black. Winter staple, fully functional zips.', 'The North Face', 'jackets', 'L', 'black', 'very good', 85.00, 'EUR', now() - '60 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000006', 'seed', 'seed-006', 'Dr. Martens 1460 Boots', '8-eye smooth leather boots, nicely broken in.', 'Dr. Martens', 'shoes', '41', 'black', 'good', 55.00, 'EUR', now() - '20 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000007', 'seed', 'seed-007', 'Adidas Samba OG', 'Black/white, gum sole. Light wear.', 'Adidas', 'sneakers', '42', 'black', 'good', 38.00, 'EUR', now() - '5 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000008', 'seed', 'seed-008', 'Uniqlo Wool Blend Coat', 'Single-breasted grey overcoat, minimal wear.', 'Uniqlo', 'jackets', 'M', 'grey', 'very good', 30.00, 'EUR', now() - '15 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000009', 'seed', 'seed-009', 'New Balance 574', 'Grey suede/mesh, classic runner. Clean condition.', 'New Balance', 'sneakers', '43', 'grey', 'very good', 42.00, 'EUR', now() - '10 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000010', 'seed', 'seed-010', 'Carhartt Watch Hat Beanie', 'Acid black knit beanie with logo patch. Like new.', 'Carhartt', 'accessories', 'one size', 'black', 'like new', 12.00, 'EUR', now() - '3 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000011', 'seed', 'seed-011', 'Vintage Levi''s Denim Trucker Jacket', 'Type III trucker from the 90s, beautiful fade.', 'Levi''s', 'jackets', 'L', 'blue', 'good', 45.00, 'EUR', now() - '25 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000012', 'seed', 'seed-012', 'Ralph Lauren Oxford Shirt', 'Classic fit button-down, white. Crisp condition.', 'Ralph Lauren', 'shirts', 'M', 'white', 'very good', 22.00, 'EUR', now() - '7 days'::INTERVAL, now())
ON CONFLICT DO NOTHING;

-- Clothing/lifestyle expansion: the first 12 were dominated by outerwear and
-- sneakers, and after ingestion the real catalog skews music gear + vinyl
-- (Reverb/Discogs). These round out categories the real adapters don't cover.
INSERT INTO listings
  (id, source, external_id, title, description, brand, category, size, color, condition, current_price, currency, first_seen_at, last_seen_at) VALUES
  ('a0000000-0000-0000-0000-000000000013', 'seed', 'seed-013', 'Carhartt Michigan Chore Coat', 'Duck canvas chore coat, blanket lined, black. A couple small marks, no damage.', 'Carhartt', 'jackets', 'M', 'black', 'good', 52.00, 'EUR', now() - '40 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000014', 'seed', 'seed-014', 'Levi''s Trucker Jacket', 'Classic trucker in black denim, lightly worn.', 'Levi''s', 'jackets', 'M', 'black', 'very good', 48.00, 'EUR', now() - '18 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000015', 'seed', 'seed-015', 'Wrangler Denim Jacket', 'Mid-wash blue trucker style, broken in.', 'Wrangler', 'jackets', 'L', 'blue', 'good', 35.00, 'EUR', now() - '22 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000016', 'seed', 'seed-016', 'Barbour Wax Jacket', 'Waxed cotton, olive, corduroy collar. Needs a re-wax but structurally excellent.', 'Barbour', 'jackets', 'L', 'olive', 'good', 78.00, 'EUR', now() - '33 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000017', 'seed', 'seed-017', 'Levi''s 505 Jeans', 'Regular fit, mid-blue wash. Great everyday condition.', 'Levi''s', 'jeans', 'W34 L32', 'blue', 'good', 30.00, 'EUR', now() - '27 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000018', 'seed', 'seed-018', 'Diesel Slim Jeans', 'Black slim fit, minimal fading.', 'Diesel', 'jeans', 'W32 L30', 'black', 'good', 38.00, 'EUR', now() - '9 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000019', 'seed', 'seed-019', 'Converse Chuck 70', 'Black high-top, canvas in great shape, soles show light wear.', 'Converse', 'sneakers', '43', 'black', 'very good', 45.00, 'EUR', now() - '14 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000020', 'seed', 'seed-020', 'Vans Old Skool', 'Black/white classic, some scuffing on the toe.', 'Vans', 'sneakers', '42', 'black', 'good', 32.00, 'EUR', now() - '6 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000021', 'seed', 'seed-021', 'Puma Suede Classic', 'Green suede, gum sole. Light wear throughout.', 'Puma', 'sneakers', '44', 'green', 'good', 36.00, 'EUR', now() - '11 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000022', 'seed', 'seed-022', 'Flannel Check Shirt', 'Red buffalo check, brushed cotton. Cozy and warm.', NULL, 'shirts', 'M', 'red', 'very good', 18.00, 'EUR', now() - '4 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000023', 'seed', 'seed-023', 'Champion Reverse Weave Hoodie', 'Grey heavyweight hoodie, small logo embroidery, no pilling.', 'Champion', 'hoodies', 'M', 'grey', 'very good', 28.00, 'EUR', now() - '17 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000024', 'seed', 'seed-024', 'Carhartt WIP Beanie', 'Ribbed knit beanie, black, small logo patch. Like new.', 'Carhartt', 'accessories', 'one size', 'black', 'like new', 15.00, 'EUR', now() - '2 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000025', 'seed', 'seed-025', 'Fjallraven Kanken Backpack', 'Ochre yellow, classic silhouette. Minor fading, straps intact.', 'Fjallraven', 'bags', 'one size', 'yellow', 'good', 42.00, 'EUR', now() - '24 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000026', 'seed', 'seed-026', 'Herschel Weekend Duffel', 'Navy canvas weekender, roomy main compartment, one small stain inside.', 'Herschel', 'bags', 'one size', 'navy', 'good', 34.00, 'EUR', now() - '13 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000027', 'seed', 'seed-027', 'Ray-Ban Wayfarer Sunglasses', 'Classic black frame, UV lenses, comes with case.', 'Ray-Ban', 'accessories', 'one size', 'black', 'very good', 55.00, 'EUR', now() - '19 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000028', 'seed', 'seed-028', 'Casio Vintage Watch', 'Gold-tone digital watch, classic square face, new battery.', 'Casio', 'accessories', 'one size', 'gold', 'good', 28.00, 'EUR', now() - '31 days'::INTERVAL, now()),
  ('a0000000-0000-0000-0000-000000000029', 'seed', 'seed-029', 'Polaroid Now Instant Camera', 'White body, autofocus, tested and working. Comes with a half-used film pack.', 'Polaroid', 'electronics', 'one size', 'white', 'very good', 65.00, 'EUR', now() - '8 days'::INTERVAL, now())
ON CONFLICT DO NOTHING;

-- Price Memory: history for three listings so charts/deal badges have data.
-- Carhartt jacket: 75 → 65 → 58 (the demo's "good deal" story)
-- Air Max 90:      60 → 52 → 48
-- Nuptse puffer:  110 → 95 → 85
INSERT INTO price_snapshots (id, listing_id, price, currency, captured_at) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 75.00, 'EUR', now() - '45 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 65.00, 'EUR', now() - '20 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 58.00, 'EUR', now() - '2 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 60.00, 'EUR', now() - '30 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 52.00, 'EUR', now() - '14 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 48.00, 'EUR', now() - '3 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000005', 110.00, 'EUR', now() - '60 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000005', 95.00, 'EUR', now() - '28 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000005', 85.00, 'EUR', now() - '5 days'::INTERVAL),
  -- Carhartt Michigan Chore Coat: 62 → 55 → 52 (on-persona: Carhartt, black, under jackets budget)
  ('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000013', 62.00, 'EUR', now() - '40 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000013', 55.00, 'EUR', now() - '18 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000013', 52.00, 'EUR', now() - '3 days'::INTERVAL),
  -- Barbour Wax Jacket: 95 → 85 → 78 (contrast: drops but stays above the 60 EUR jackets budget)
  ('b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000016', 95.00, 'EUR', now() - '33 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000016', 85.00, 'EUR', now() - '15 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000016', 78.00, 'EUR', now() - '4 days'::INTERVAL),
  -- Levi's 505 Jeans: 36 → 32 → 30
  ('b0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000017', 36.00, 'EUR', now() - '27 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000017', 32.00, 'EUR', now() - '11 days'::INTERVAL),
  ('b0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000017', 30.00, 'EUR', now() - '2 days'::INTERVAL)
ON CONFLICT DO NOTHING;

-- Single snapshot at current price for the remaining listings.
INSERT INTO price_snapshots (id, listing_id, price, currency, captured_at)
SELECT gen_random_uuid(), l.id, l.current_price, l.currency, l.first_seen_at
FROM listings l
WHERE l.source = 'seed'
  AND NOT EXISTS (SELECT 1 FROM price_snapshots ps WHERE ps.listing_id = l.id);
