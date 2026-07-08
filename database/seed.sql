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
  ('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000005', 85.00, 'EUR', now() - '5 days'::INTERVAL)
ON CONFLICT DO NOTHING;

-- Single snapshot at current price for the remaining listings.
INSERT INTO price_snapshots (id, listing_id, price, currency, captured_at)
SELECT gen_random_uuid(), l.id, l.current_price, l.currency, l.first_seen_at
FROM listings l
WHERE l.source = 'seed'
  AND NOT EXISTS (SELECT 1 FROM price_snapshots ps WHERE ps.listing_id = l.id);
