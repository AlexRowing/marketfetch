import { query } from "@/lib/db";

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
      `SELECT l.id, l.title, l.description, l.url, l.source, l.is_active,
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
    listingAgeDays: Number(r.listing_age_days),
    priceChangePct:
      firstPrice && firstPrice > 0
        ? (currentPrice - firstPrice) / firstPrice
        : null,
    isSaved: r.save_state === "save",
    isActive: r.is_active,
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
  // Active = taste-ranked discovery; sold = recently-sold-first research view.
  const orderBy =
    status === "active"
      ? "taste_distance ASC NULLS LAST, l.first_seen_at DESC, l.id"
      : "l.last_seen_at DESC, l.id";
  const rows = await query<FeedRow>(
    `SELECT l.id, l.title, l.brand, l.category, l.size, l.color, l.condition,
            l.image_url, l.source, l.url, l.current_price, l.currency, l.is_active,
            extract(day FROM now() - COALESCE(l.listed_at, l.first_seen_at))::INT AS listing_age_days,
            fp.first_price,
            ss.save_state,
            (l.embedding <=> t.embedding) AS taste_distance
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
