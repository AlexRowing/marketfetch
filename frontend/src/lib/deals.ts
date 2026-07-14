import { query } from "@/lib/db";
import { getPreferences } from "@/lib/preferences";

/**
 * "Deals for you" — the agent's proactive brief. Deterministic and grounded in
 * the DB (no LLM call, so it's instant and reliable): among the user's
 * top taste-ranked listings, keep the ones that are genuinely well-priced —
 * either dropped since listing, or below the median of embedding-similar items —
 * and explain why, tying in Buyer Memory when it applies.
 */

export interface Deal {
  id: string;
  title: string;
  brand: string | null;
  category: string;
  size: string | null;
  condition: string | null;
  imageUrl: string | null;
  source: string;
  url: string | null;
  currentPrice: number;
  currency: string;
  listingAgeDays: number;
  /** Change vs first recorded price (negative = dropped). */
  dropPct: number | null;
  /** Vs similar-items median (negative = below), null if cohort too thin. */
  vsSimilarPct: number | null;
  /** One-line, human explanation of why this made the cut. */
  reason: string;
}

/** A listing must beat the market by at least this much to count as a deal. */
const MIN_SIGNAL = 0.08;
/** Similar-items cohort must have at least this many members to trust it. */
const MIN_SIMILAR = 4;
/** How many taste-ranked listings to consider, and how many deals to show. */
const CANDIDATES = 40;
const MAX_DEALS = 4;

interface DealRow {
  id: string;
  title: string;
  brand: string | null;
  category: string;
  size: string | null;
  condition: string | null;
  image_url: string | null;
  source: string;
  url: string | null;
  current_price: string;
  currency: string;
  listing_age_days: string;
  first_price: string | null;
  median: string | null;
  p25: string | null;
  p75: string | null;
  n: number;
}

export async function getDealsForUser(userId: string): Promise<Deal[]> {
  const [rows, prefs] = await Promise.all([
    query<DealRow>(
      `WITH cand AS (
         SELECT l.id, l.title, l.brand, l.category, l.size, l.condition,
                l.image_url, l.source, l.url, l.current_price, l.currency, l.embedding,
                extract(day FROM now() - COALESCE(l.listed_at, l.first_seen_at))::INT AS listing_age_days,
                (l.embedding <=> t.embedding) AS taste_distance,
                fp.first_price
         FROM listings l
         LEFT JOIN user_taste_embeddings t ON t.user_id = $1
         LEFT JOIN LATERAL (
           SELECT price AS first_price FROM price_snapshots
           WHERE listing_id = l.id ORDER BY captured_at ASC LIMIT 1
         ) fp ON true
         WHERE l.is_active
           AND NOT EXISTS (
             SELECT 1 FROM interactions r
             WHERE r.user_id = $1 AND r.listing_id = l.id AND r.kind = 'reject'
           )
         ORDER BY taste_distance ASC NULLS LAST, l.first_seen_at DESC, l.id
         LIMIT ${CANDIDATES}
       )
       SELECT c.id, c.title, c.brand, c.category, c.size, c.condition,
              c.image_url, c.source, c.url, c.current_price, c.currency,
              c.listing_age_days, c.first_price, s.median, s.p25, s.p75, s.n
       FROM cand c
       LEFT JOIN LATERAL (
         SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY o.price) AS median,
                percentile_cont(0.25) WITHIN GROUP (ORDER BY o.price) AS p25,
                percentile_cont(0.75) WITHIN GROUP (ORDER BY o.price) AS p75,
                count(*)::INT AS n
         FROM (
           SELECT comp.current_price::FLOAT8 AS price
           FROM listings comp
           WHERE comp.id != c.id AND (comp.embedding <=> c.embedding) < 0.5
           ORDER BY comp.embedding <=> c.embedding ASC
           LIMIT 15
         ) o
       ) s ON true`,
      [userId]
    ),
    getPreferences(userId),
  ]);

  const brands = new Set(
    prefs.filter((p) => p.kind === "brand").map((p) => p.value.toLowerCase())
  );
  const budgets = new Map(
    prefs
      .filter((p) => p.kind === "category_budget" && p.numericValue !== null)
      .map((p) => [p.value.toLowerCase(), p.numericValue as number])
  );

  const scored = rows
    .map((r) => {
      const price = Number(r.current_price);
      const first = r.first_price === null ? null : Number(r.first_price);

      // Only trust "vs similar" when the cohort is price-coherent (tight
      // interquartile spread). Otherwise the median is meaningless and cheap
      // items in a wide-ranging group (a €24 mini pedal among boutique units)
      // look like impossible 80%-off "deals". Same guard as the detail page.
      const median = r.median === null ? null : Number(r.median);
      const p25 = r.p25 === null ? null : Number(r.p25);
      const p75 = r.p75 === null ? null : Number(r.p75);
      const coherent =
        median !== null &&
        p25 !== null &&
        p75 !== null &&
        Number(r.n) >= MIN_SIMILAR &&
        median > 0 &&
        (p75 - p25) / median <= 0.5;

      const dropPct = first && first > 0 ? (price - first) / first : null;
      const vsSimilarPct =
        coherent && median ? (price - median) / median : null;

      const drop = dropPct !== null && dropPct <= -MIN_SIGNAL ? dropPct : null;
      const vs = vsSimilarPct !== null && vsSimilarPct <= -MIN_SIGNAL ? vsSimilarPct : null;
      if (drop === null && vs === null) return null;

      // Lead with the stronger signal; add a Buyer-Memory hook when one fits.
      const useVs = vs !== null && (drop === null || Math.abs(vs) >= Math.abs(drop));
      const priceLead = useVs
        ? `${Math.round(-(vs as number) * 100)}% below similar listings`
        : `Down ${Math.round(-(drop as number) * 100)}% since listed`;

      const budget = budgets.get(r.category.toLowerCase());
      let hook: string | null = null;
      if (r.brand && brands.has(r.brand.toLowerCase())) {
        hook = `${r.brand} is a brand you follow`;
      } else if (budget !== undefined && price <= budget) {
        hook = `within your ${r.category} budget`;
      }

      const strength = Math.max(drop !== null ? -drop : 0, vs !== null ? -vs : 0);
      return {
        deal: {
          id: r.id,
          title: r.title,
          brand: r.brand,
          category: r.category,
          size: r.size,
          condition: r.condition,
          imageUrl: r.image_url,
          source: r.source,
          url: r.url,
          currentPrice: price,
          currency: r.currency,
          listingAgeDays: Number(r.listing_age_days),
          dropPct,
          vsSimilarPct,
          reason: hook ? `${priceLead} · ${hook}` : priceLead,
        } satisfies Deal,
        // Preference-matched deals edge ahead of equally-cheap unmatched ones.
        score: strength + (hook ? 0.05 : 0),
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, MAX_DEALS).map((x) => x.deal);
}
