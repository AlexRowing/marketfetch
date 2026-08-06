import { query } from "@/lib/db";

/**
 * The agent's "daily briefing" numbers - deterministic, grounded, instant (no
 * LLM call). These drive the homepage band that makes the agent feel like it's
 * actively watching the market for the buyer, even on a quiet day. Global to the
 * live catalog (not personalised): they describe the market, not the user.
 */
export interface Briefing {
  /** Active, real (non-seed) listings the agent is tracking. */
  checked: number;
  /** Of those, how many are cheaper now than their first recorded price. */
  priceDrops: number;
  /** How many first appeared in the last few days. */
  freshCount: number;
}

/** A drop must beat this fraction of the first price to count (ignore noise). */
const DROP_THRESHOLD = 0.02;

export async function getBriefing(): Promise<Briefing> {
  const rows = await query<{
    checked: string;
    drops: string;
    fresh: string;
  }>(
    `SELECT
       count(*) FILTER (WHERE l.is_active) AS checked,
       count(*) FILTER (
         WHERE l.is_active AND fp.first_price IS NOT NULL
           AND l.current_price < fp.first_price * ${1 - DROP_THRESHOLD}
       ) AS drops,
       count(*) FILTER (
         WHERE l.is_active
           AND COALESCE(l.listed_at, l.first_seen_at) > now() - INTERVAL '3 days'
       ) AS fresh
     FROM listings l
     LEFT JOIN LATERAL (
       SELECT price AS first_price FROM price_snapshots
       WHERE listing_id = l.id ORDER BY captured_at ASC LIMIT 1
     ) fp ON true
     WHERE l.source <> 'seed'`
  );
  const r = rows[0];
  return {
    checked: Number(r?.checked ?? 0),
    priceDrops: Number(r?.drops ?? 0),
    freshCount: Number(r?.fresh ?? 0),
  };
}
