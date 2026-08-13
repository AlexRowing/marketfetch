import { query } from "@/lib/db";
import { formatPrice } from "@/lib/format";

/** A listing shaped for the feed, with Price Memory context attached. */
export interface FeedItem {
  id: string;
  title: string;
  brand: string | null;
  category: string;
  size: string | null;
  color: string | null;
  condition: string | null;
  imageUrl: string | null;
  /** Marketplace the listing came from, e.g. "vinted". */
  source: string;
  /** Link to the original listing on the source marketplace. */
  url: string | null;
  currentPrice: number;
  currency: string;
  listingAgeDays: number;
  /** Change vs. the first recorded price. Negative = price has dropped. */
  priceChangePct: number | null;
  /** Whether the user's latest save/unsave action left this listing saved. */
  isSaved: boolean;
  /** False once the listing is sold / delisted on the source marketplace. */
  isActive: boolean;
  /** True = generated demo data wearing a real marketplace's source label. */
  isSynthetic: boolean;
  /**
   * Median of embedding-similar listings, when that cohort is price-coherent
   * (tight interquartile spread); null otherwise. The "usually sells around $X".
   */
  marketMedian: number | null;
  /** Current price vs marketMedian (negative = below). Null if no coherent cohort. */
  vsMarketPct: number | null;
  /**
   * How many times the seller has lowered the price across its snapshot history.
   * 2+ is a real "motivated seller" signal (they keep cutting).
   */
  priceCuts: number;
  /**
   * One short, honest line of agent context for the card, or null when there's
   * nothing worth saying. Computed server-side so the client stays presentational.
   */
  insight: string | null;
}

/** Which listings a feed query returns. */
export type ListingStatus = "active" | "sold";

interface FeedRow {
  id: string;
  title: string;
  brand: string | null;
  category: string;
  size: string | null;
  color: string | null;
  condition: string | null;
  image_url: string | null;
  source: string;
  url: string | null;
  current_price: string; // DECIMAL comes back as string from pg
  currency: string;
  listing_age_days: string;
  first_price: string | null;
  save_state: string | null;
  is_active: boolean;
  is_synthetic: boolean;
  // Similar-items price stats (present on the feed query, absent on detail).
  sim_median: number | null;
  sim_p25: number | null;
  sim_p75: number | null;
  sim_n: number | null;
  // Number of downward price moves across the listing's snapshot history.
  price_cuts: number | null;
}

/** Cohort is too wide (or too thin) to trust its median as "what these sell for". */
const CARD_MIN_SIMILAR = 4;

/**
 * One honest line of context for a feed card, or null. Order matters: surface
 * the most decision-useful signal, one per card, so cards stay uncluttered.
 * The green "-X%" badge already shows the drop amount, so the drop lines here
 * speak to seller behaviour ("keeps cutting the price") rather than repeating it.
 */
function feedInsight(opts: {
  isActive: boolean;
  priceChangePct: number | null;
  vsMarketPct: number | null;
  marketMedian: number | null;
  priceCuts: number;
  listingAgeDays: number;
}): string | null {
  const { isActive, priceChangePct, vsMarketPct, marketMedian, priceCuts, listingAgeDays } =
    opts;
  if (!isActive) return null;
  if (vsMarketPct !== null && marketMedian !== null && vsMarketPct <= -0.08) {
    return `Usually ~${formatPrice(marketMedian)} · ${Math.round(-vsMarketPct * 100)}% under`;
  }
  // Repeated cuts are the strongest "will take an offer" tell.
  if (priceCuts >= 2) {
    return `Price cut ${priceCuts}× · seller likely open to offers`;
  }
  if (priceCuts === 1 || (priceChangePct !== null && priceChangePct <= -0.05)) {
    return "Seller has already cut the price once";
  }
  if (listingAgeDays >= 60) {
    return `Up ${listingAgeDays} days · seller may take an offer`;
  }
  return null;
}

export interface PricePoint {
  price: number;
  capturedAt: string;
}

/**
 * Price stats over the listing's most similar items, found by vector
 * similarity on the CockroachDB embeddings (sold listings included - sold
 * prices are real market data). Null when nothing is similar enough.
 */
export interface SimilarPriceStats {
  /** How many similar listings the stats are computed over (max 15). */
  count: number;
  median: number;
  /** Interquartile price range of the similar items. */
  p25: number;
  p75: number;
}

/** Cohorts smaller than this are too thin to price-check against. */
export const MIN_SIMILAR = 4;

/** Full listing plus Price Memory context for the detail page. */
export interface ListingDetail extends FeedItem {
  description: string;
  /** Price stats over embedding-similar listings; null if none close enough. */
  similar: SimilarPriceStats | null;
  /**
   * Current price vs the similar-items median. Negative = below similar
   * items (a deal). Null when the cohort is below MIN_SIMILAR.
   */
  deltaVsMarket: number | null;
  priceHistory: PricePoint[];
}

export async function getListingDetail(
  listingId: string,
  userId: string
): Promise<ListingDetail | null> {
  const [listingRows, historyRows, marketRows] = await Promise.all([
    query<FeedRow & { description: string }>(
      `SELECT l.id, l.title, l.description, l.url, l.source, l.is_active, l.is_synthetic,
              l.brand, l.category, l.size, l.color, l.condition,
              l.image_url, l.current_price, l.currency,
              extract(day FROM now() - COALESCE(l.listed_at, l.first_seen_at))::INT AS listing_age_days,
              fp.first_price,
              ss.save_state
       FROM listings l
       LEFT JOIN LATERAL (
         SELECT price AS first_price FROM price_snapshots
         WHERE listing_id = l.id ORDER BY captured_at ASC LIMIT 1
       ) fp ON true
       LEFT JOIN LATERAL (
         SELECT kind AS save_state FROM interactions
         WHERE user_id = $2 AND listing_id = l.id AND kind IN ('save', 'unsave')
         ORDER BY created_at DESC LIMIT 1
       ) ss ON true
       WHERE l.id = $1 AND l.source <> 'seed'`,
      [listingId, userId]
    ),
    query<{ price: string; captured_at: string }>(
      `SELECT price, captured_at FROM price_snapshots
       WHERE listing_id = $1 ORDER BY captured_at ASC`,
      [listingId]
    ),
    // Comparables via vector similarity: the 15 nearest listings by embedding
    // cosine distance, gated at < 0.5 so "nearest" still means "similar".
    // Sold listings stay in - a sold price is the market speaking. Median +
    // IQR instead of a mean so one 33k vintage outlier can't skew anything.
    query<{ n: number; median: number | null; p25: number | null; p75: number | null }>(
      `SELECT count(*)::INT AS n,
              percentile_cont(0.5) WITHIN GROUP (ORDER BY price) AS median,
              percentile_cont(0.25) WITHIN GROUP (ORDER BY price) AS p25,
              percentile_cont(0.75) WITHIN GROUP (ORDER BY price) AS p75
       FROM (
         SELECT c.current_price::FLOAT8 AS price
         FROM listings c
         JOIN listings t ON t.id = $1
         WHERE c.id != t.id
           AND c.source <> 'seed'
           AND (c.embedding <=> t.embedding) < 0.5
         ORDER BY c.embedding <=> t.embedding ASC
         LIMIT 15
       ) comp`,
      [listingId]
    ),
  ]);

  const r = listingRows[0];
  if (!r) return null;

  const currentPrice = Number(r.current_price);
  const firstPrice = r.first_price === null ? null : Number(r.first_price);
  const m = marketRows[0];
  const similar: SimilarPriceStats | null =
    m && m.median != null && Number(m.n) > 0
      ? {
          count: Number(m.n),
          median: Number(m.median),
          p25: Number(m.p25),
          p75: Number(m.p75),
        }
      : null;

  return {
    id: r.id,
    title: r.title,
    description: r.description,
    url: r.url,
    source: r.source,
    brand: r.brand,
    category: r.category,
    size: r.size,
    color: r.color,
    condition: r.condition,
    imageUrl: r.image_url,
    currentPrice,
    currency: r.currency,
    listingAgeDays: Number(r.listing_age_days),
    priceChangePct:
      firstPrice && firstPrice > 0
        ? (currentPrice - firstPrice) / firstPrice
        : null,
    isSaved: r.save_state === "save",
    isActive: r.is_active,
    isSynthetic: r.is_synthetic,
    // Feed-card context fields (the detail page renders its own richer Price
    // Memory panel, so it doesn't use `insight`).
    marketMedian: similar ? similar.median : null,
    vsMarketPct:
      similar && similar.count >= MIN_SIMILAR && similar.median > 0
        ? (currentPrice - similar.median) / similar.median
        : null,
    priceCuts: historyRows.reduce(
      (n, h, i) =>
        i > 0 && Number(h.price) < Number(historyRows[i - 1].price) ? n + 1 : n,
      0
    ),
    insight: null,
    similar,
    deltaVsMarket:
      similar && similar.count >= MIN_SIMILAR && similar.median > 0
        ? (currentPrice - similar.median) / similar.median
        : null,
    priceHistory: historyRows.map((h) => ({
      price: Number(h.price),
      capturedAt: h.captured_at,
    })),
  };
}

function mapFeedRow(r: FeedRow): FeedItem {
  const currentPrice = Number(r.current_price);
  const firstPrice = r.first_price === null ? null : Number(r.first_price);
  const priceChangePct =
    firstPrice && firstPrice > 0 ? (currentPrice - firstPrice) / firstPrice : null;
  const listingAgeDays = Number(r.listing_age_days);

  // Trust the similar-items median only when the cohort is real (>= a few
  // members) and price-coherent (tight IQR). Same guard as the detail page and
  // deals, so a lone vintage piece among cheap comparables can't fake a "deal".
  const simMedian = r.sim_median === null ? null : Number(r.sim_median);
  const simP25 = r.sim_p25 === null ? null : Number(r.sim_p25);
  const simP75 = r.sim_p75 === null ? null : Number(r.sim_p75);
  const simN = r.sim_n === null ? 0 : Number(r.sim_n);
  const coherent =
    simMedian !== null &&
    simP25 !== null &&
    simP75 !== null &&
    simN >= CARD_MIN_SIMILAR &&
    simMedian > 0 &&
    (simP75 - simP25) / simMedian <= 0.5;
  const marketMedian = coherent ? simMedian : null;
  const vsMarketPct =
    coherent && simMedian ? (currentPrice - simMedian) / simMedian : null;
  const priceCuts = r.price_cuts === null ? 0 : Number(r.price_cuts);

  return {
    id: r.id,
    title: r.title,
    brand: r.brand,
    category: r.category,
    size: r.size,
    color: r.color,
    condition: r.condition,
    imageUrl: r.image_url,
    source: r.source,
    url: r.url,
    currentPrice,
    currency: r.currency,
    listingAgeDays,
    priceChangePct,
    isSaved: r.save_state === "save",
    isActive: r.is_active,
    isSynthetic: r.is_synthetic,
    marketMedian,
    vsMarketPct,
    priceCuts,
    insight: feedInsight({
      isActive: r.is_active,
      priceChangePct,
      vsMarketPct,
      marketMedian,
      priceCuts,
      listingAgeDays,
    }),
  };
}

/**
 * Feed rows for one user: active listings they haven't rejected, with
 * price-drop context and saved state, taste-ranked (cosine distance between
 * the listing embedding and the user's taste embedding; items or users
 * without embeddings fall back to newest-first via NULLS LAST).
 * `limit: null` fetches everything - used to rank search server-side.
 */
async function queryFeed(
  userId: string,
  status: ListingStatus,
  category: string | null,
  offset: number,
  limit: number | null
): Promise<FeedItem[]> {
  // Active = preference-then-taste-ranked discovery (items matching the user's
  // saved Preferences float to the top, ties broken by taste); sold =
  // recently-sold-first research view.
  const orderBy =
    status === "active"
      ? "pref_boost DESC, taste_distance ASC NULLS LAST, l.first_seen_at DESC, l.id"
      : "l.last_seen_at DESC, l.id";
  const rows = await query<FeedRow>(
    `SELECT l.id, l.title, l.brand, l.category, l.size, l.color, l.condition,
            l.image_url, l.source, l.url, l.current_price, l.currency, l.is_active, l.is_synthetic,
            extract(day FROM now() - COALESCE(l.listed_at, l.first_seen_at))::INT AS listing_age_days,
            fp.first_price,
            ss.save_state,
            (l.embedding <=> t.embedding) AS taste_distance,
            -- Buyer Memory boost: preferred brand (3) beats colour/size/in-budget
            -- (1 each). Guests have no preferences, so this is 0 and order is
            -- pure taste. Mirrors scoreListing's weights in lib/search.ts.
            COALESCE((
              SELECT sum(
                CASE
                  WHEN p.kind = 'brand' AND l.brand IS NOT NULL
                    AND lower(p.value) = lower(l.brand) THEN 3
                  WHEN p.kind = 'color' AND l.color IS NOT NULL
                    AND lower(p.value) = lower(l.color) THEN 1
                  WHEN p.kind = 'size' AND l.size IS NOT NULL
                    AND lower(l.size) LIKE '%' || lower(p.value) || '%' THEN 1
                  WHEN p.kind = 'category_budget'
                    AND lower(p.value) = lower(l.category)
                    AND p.numeric_value IS NOT NULL
                    AND l.current_price <= p.numeric_value THEN 1
                  ELSE 0
                END
              )
              FROM user_preferences p WHERE p.user_id = $1
            ), 0) AS pref_boost,
            sm.sim_median, sm.sim_p25, sm.sim_p75, sm.sim_n,
            pc.price_cuts
     FROM listings l
     LEFT JOIN user_taste_embeddings t ON t.user_id = $1
     LEFT JOIN LATERAL (
       SELECT price AS first_price
       FROM price_snapshots
       WHERE listing_id = l.id
       ORDER BY captured_at ASC
       LIMIT 1
     ) fp ON true
     LEFT JOIN LATERAL (
       SELECT kind AS save_state
       FROM interactions
       WHERE user_id = $1 AND listing_id = l.id AND kind IN ('save', 'unsave')
       ORDER BY created_at DESC
       LIMIT 1
     ) ss ON true
     -- "Usually sells around $X" context: median/IQR of the 15 nearest listings
     -- by embedding distance (sold included). Same shape as the deals + detail
     -- comparables; cheap at catalog scale. mapFeedRow gates on coherence.
     LEFT JOIN LATERAL (
       SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY o.price) AS sim_median,
              percentile_cont(0.25) WITHIN GROUP (ORDER BY o.price) AS sim_p25,
              percentile_cont(0.75) WITHIN GROUP (ORDER BY o.price) AS sim_p75,
              count(*)::INT AS sim_n
       FROM (
         SELECT comp.current_price::FLOAT8 AS price
         FROM listings comp
         WHERE comp.id <> l.id AND comp.source <> 'seed'
           AND (comp.embedding <=> l.embedding) < 0.5
         ORDER BY comp.embedding <=> l.embedding ASC
         LIMIT 15
       ) o
     ) sm ON true
     -- Motivated-seller signal: how many times the price stepped DOWN across the
     -- listing's snapshot history. 2+ = a seller who keeps cutting.
     LEFT JOIN LATERAL (
       SELECT count(*) FILTER (WHERE h.price < h.prev)::INT AS price_cuts
       FROM (
         SELECT price, lag(price) OVER (ORDER BY captured_at) AS prev
         FROM price_snapshots WHERE listing_id = l.id
       ) h
     ) pc ON true
     WHERE l.is_active = $5
       -- Hide hand-curated demo rows; only real ingested marketplace listings.
       AND l.source <> 'seed'
       AND ($2::STRING IS NULL OR l.category = $2)
       AND NOT EXISTS (
         SELECT 1 FROM interactions r
         WHERE r.user_id = $1 AND r.listing_id = l.id AND r.kind = 'reject'
       )
     ORDER BY ${orderBy}
     LIMIT $3 OFFSET $4`,
    // LIMIT NULL means "no limit" in Postgres/CockroachDB.
    [userId, category, limit, offset, status === "active"]
  );
  return rows.map(mapFeedRow);
}

export interface FeedPageOpts {
  status?: ListingStatus;
  category?: string | null;
  offset?: number;
  limit?: number;
}

/** One feed page (taste-ranked when active, recently-sold-first when sold). */
export function getFeedListings(
  userId: string,
  opts: FeedPageOpts = {}
): Promise<FeedItem[]> {
  const { status = "active", category = null, offset = 0, limit = 24 } = opts;
  return queryFeed(userId, status, category, offset, limit);
}

/** Every feed-eligible listing, taste-ranked - input for server-side search. */
export function getSearchCandidates(
  userId: string,
  status: ListingStatus = "active",
  category: string | null = null
): Promise<FeedItem[]> {
  return queryFeed(userId, status, category, 0, null);
}

/** Total feed-eligible listings (drives pagination / the header count). */
export async function countFeedListings(
  userId: string,
  status: ListingStatus = "active",
  category: string | null = null
): Promise<number> {
  const rows = await query<{ total: string }>(
    `SELECT count(*) AS total
     FROM listings l
     WHERE l.is_active = $3
       AND l.source <> 'seed'
       AND ($2::STRING IS NULL OR l.category = $2)
       AND NOT EXISTS (
         SELECT 1 FROM interactions r
         WHERE r.user_id = $1 AND r.listing_id = l.id AND r.kind = 'reject'
       )`,
    [userId, category, status === "active"]
  );
  return Number(rows[0]?.total ?? 0);
}

/**
 * A user's saved listings, most recently saved first - so they can keep an
 * eye on price without re-searching. Includes sold listings (the point is
 * tracking something you cared about, even after it's gone); excludes
 * anything since unsaved.
 */
export async function getSavedListings(userId: string): Promise<FeedItem[]> {
  const rows = await query<FeedRow>(
    `SELECT l.id, l.title, l.brand, l.category, l.size, l.color, l.condition,
            l.image_url, l.source, l.url, l.current_price, l.currency, l.is_active, l.is_synthetic,
            extract(day FROM now() - COALESCE(l.listed_at, l.first_seen_at))::INT AS listing_age_days,
            fp.first_price,
            s.kind AS save_state,
            sm.sim_median, sm.sim_p25, sm.sim_p75, sm.sim_n,
            pc.price_cuts
     FROM listings l
     -- Latest save/unsave for this user+listing; filtered to 'save' below so
     -- an item that was later unsaved drops out.
     JOIN LATERAL (
       SELECT kind, created_at
       FROM interactions
       WHERE user_id = $1 AND listing_id = l.id AND kind IN ('save', 'unsave')
       ORDER BY created_at DESC
       LIMIT 1
     ) s ON true
     LEFT JOIN LATERAL (
       SELECT price AS first_price
       FROM price_snapshots
       WHERE listing_id = l.id
       ORDER BY captured_at ASC
       LIMIT 1
     ) fp ON true
     LEFT JOIN LATERAL (
       SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY o.price) AS sim_median,
              percentile_cont(0.25) WITHIN GROUP (ORDER BY o.price) AS sim_p25,
              percentile_cont(0.75) WITHIN GROUP (ORDER BY o.price) AS sim_p75,
              count(*)::INT AS sim_n
       FROM (
         SELECT comp.current_price::FLOAT8 AS price
         FROM listings comp
         WHERE comp.id <> l.id AND comp.source <> 'seed'
           AND (comp.embedding <=> l.embedding) < 0.5
         ORDER BY comp.embedding <=> l.embedding ASC
         LIMIT 15
       ) o
     ) sm ON true
     LEFT JOIN LATERAL (
       SELECT count(*) FILTER (WHERE h.price < h.prev)::INT AS price_cuts
       FROM (
         SELECT price, lag(price) OVER (ORDER BY captured_at) AS prev
         FROM price_snapshots WHERE listing_id = l.id
       ) h
     ) pc ON true
     WHERE s.kind = 'save' AND l.source <> 'seed'
     ORDER BY s.created_at DESC`,
    [userId]
  );
  return rows.map(mapFeedRow);
}

/** Distinct categories across the user's feed-eligible listings. */
export async function getFeedCategories(userId: string): Promise<string[]> {
  const rows = await query<{ category: string }>(
    `SELECT DISTINCT l.category
     FROM listings l
     WHERE l.is_active
       AND l.source <> 'seed'
       AND NOT EXISTS (
         SELECT 1 FROM interactions r
         WHERE r.user_id = $1 AND r.listing_id = l.id AND r.kind = 'reject'
       )
     ORDER BY l.category`,
    [userId]
  );
  return rows.map((r) => r.category);
}
