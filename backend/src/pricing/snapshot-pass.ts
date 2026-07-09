// Core price snapshot pass, shared by the CLI (src/pricing/snapshot.ts) and
// the Lambda handler (src/lambda/snapshot-handler.ts). Two halves:
//   1. Seed listings (source='seed') get SIMULATED price movement — they have
//      no real marketplace behind them.
//   2. Real marketplace listings get their actual current price re-fetched
//      via their adapter; ended/sold listings are deactivated. Never simulate
//      prices for items that link to a real listing page.
// Both halves append to price_snapshots — Price Memory grows on each run.
import type pg from "pg";
import type { MarketplaceAdapter } from "../marketplaces/adapter.js";
import { createReverbAdapter } from "../marketplaces/reverb.js";

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

export interface SnapshotResult {
  recorded: number;
  moved: number;
  refreshed: number;
  deactivated: number;
}

/** Adapters built from whatever tokens the environment provides. */
export function adaptersFromEnv(): Map<string, MarketplaceAdapter> {
  const adapters = new Map<string, MarketplaceAdapter>();
  if (process.env.REVERB_API_TOKEN) {
    adapters.set("reverb", createReverbAdapter(process.env.REVERB_API_TOKEN));
  }
  return adapters;
}

async function refreshRealListings(
  pool: pg.Pool,
  adapters: Map<string, MarketplaceAdapter>,
): Promise<{ refreshed: number; deactivated: number }> {
  const { rows } = await pool.query<{
    id: string; source: string; external_id: string; title: string; current_price: string;
  }>(
    "SELECT id, source, external_id, title, current_price FROM listings WHERE is_active AND source != 'seed'",
  );

  let refreshed = 0;
  let deactivated = 0;
  for (const listing of rows) {
    const adapter = adapters.get(listing.source);
    if (!adapter) continue; // no token for this source in this environment

    let current;
    try {
      current = await adapter.fetchCurrent(listing.external_id);
    } catch (err) {
      // One flaky fetch shouldn't kill the whole pass; skip and move on.
      console.error(`refresh failed for ${listing.source}:${listing.external_id}:`, err);
      continue;
    }

    if (current === null) {
      await pool.query("UPDATE listings SET is_active = false, last_seen_at = now() WHERE id = $1", [
        listing.id,
      ]);
      console.log(`ended: ${listing.title.slice(0, 60)}`);
      deactivated++;
      continue;
    }

    if (Number(listing.current_price) !== current.price) {
      const pct = (((current.price - Number(listing.current_price)) / Number(listing.current_price)) * 100).toFixed(1);
      console.log(`${listing.title.slice(0, 60)}: ${listing.current_price} -> ${current.price} ${current.currency} (${pct}%)`);
      await pool.query(
        "UPDATE listings SET current_price = $1, currency = $2, last_seen_at = now() WHERE id = $3",
        [current.price, current.currency, listing.id],
      );
    } else {
      await pool.query("UPDATE listings SET last_seen_at = now() WHERE id = $1", [listing.id]);
    }

    await pool.query(
      "INSERT INTO price_snapshots (listing_id, price, currency) VALUES ($1, $2, $3)",
      [listing.id, current.price, current.currency],
    );
    refreshed++;
  }

  return { refreshed, deactivated };
}

export async function runSnapshotPass(pool: pg.Pool): Promise<SnapshotResult> {
  const { rows } = await pool.query<{ id: string; title: string; current_price: string; currency: string }>(
    "SELECT id, title, current_price, currency FROM listings WHERE is_active AND source = 'seed'",
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

  const adapters = adaptersFromEnv();
  const { refreshed, deactivated } = await refreshRealListings(pool, adapters);
  if (adapters.size === 0) {
    console.log("no marketplace tokens in env — real-listing refresh skipped.");
  }

  console.log(
    `snapshot pass done — ${rows.length} seed listings simulated (${moved} moved), ` +
      `${refreshed} real listings refreshed, ${deactivated} deactivated.`,
  );
  return { recorded: rows.length + refreshed, moved, refreshed, deactivated };
}
