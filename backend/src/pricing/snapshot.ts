// Price snapshot pass: simulates marketplace price movement (no real
// scraping in hackathon scope), then records every active listing's
// current price in price_snapshots — Price Memory grows on each run.
// Designed to run on a schedule (locally now, Lambda + EventBridge later).
import { pool } from "../db/client.js";

// Sellers cut prices far more often than they raise them.
const MOVE_PROBABILITY = 0.35;
const DROP_PROBABILITY = 0.75;
const MIN_PRICE = 5;

function nextPrice(current: number): number {
  if (Math.random() > MOVE_PROBABILITY) return current;
  const magnitude = 0.03 + Math.random() * 0.09; // 3–12%
  const factor = Math.random() < DROP_PROBABILITY ? 1 - magnitude : 1 + magnitude;
  const moved = Math.max(MIN_PRICE, current * factor);
  return Math.round(moved * 2) / 2; // price like a human: .00 / .50 steps
}

async function main() {
  const { rows } = await pool.query<{ id: string; title: string; current_price: string; currency: string }>(
    "SELECT id, title, current_price, currency FROM listings WHERE is_active",
  );

  let moved = 0;
  for (const listing of rows) {
    const current = Number(listing.current_price);
    const price = nextPrice(current);

    if (price !== current) {
      await pool.query(
        "UPDATE listings SET current_price = $1, last_seen_at = now() WHERE id = $2",
        [price, listing.id],
      );
      const pct = (((price - current) / current) * 100).toFixed(1);
      console.log(`${listing.title}: ${current} -> ${price} ${listing.currency} (${pct}%)`);
      moved++;
    }

    await pool.query(
      "INSERT INTO price_snapshots (listing_id, price, currency) VALUES ($1, $2, $3)",
      [listing.id, price, listing.currency],
    );
  }

  console.log(`snapshot pass done — ${rows.length} listings recorded, ${moved} price change(s).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
