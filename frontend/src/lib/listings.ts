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
  currentPrice: number;
  currency: string;
  listingAgeDays: number;
  /** Change vs. the first recorded price. Negative = price has dropped. */
  priceChangePct: number | null;
  /** Whether the user's latest save/unsave action left this listing saved. */
  isSaved: boolean;
}

interface FeedRow {
  id: string;
  title: string;
  brand: string | null;
  category: string;
  size: string | null;
  color: string | null;
  condition: string | null;
  image_url: string | null;
  current_price: string; // DECIMAL comes back as string from pg
  currency: string;
  listing_age_days: string;
  first_price: string | null;
  save_state: string | null;
}

export interface PricePoint {
  price: number;
  capturedAt: string;
}

/** Full listing plus Price Memory context for the detail page. */
export interface ListingDetail extends FeedItem {
  description: string;
  url: string | null;
  /** Avg snapshot price over comparable listings (category+brand), last 60d. */
  marketAvg60d: number | null;
  /** current price vs market avg. Negative = below market (a deal). */
  deltaVsMarket: number | null;
  priceHistory: PricePoint[];
}

export async function getListingDetail(
  listingId: string,
  userId: string
): Promise<ListingDetail | null> {
  const [listingRows, historyRows, marketRows] = await Promise.all([
    query<FeedRow & { description: string; url: string | null }>(
      `SELECT l.id, l.title, l.description, l.url,
              l.brand, l.category, l.size, l.color, l.condition,
              l.image_url, l.current_price, l.currency,
              extract(day FROM now() - l.first_seen_at)::INT AS listing_age_days,
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
       WHERE l.id = $1`,
      [listingId, userId]
    ),
    query<{ price: string; captured_at: string }>(
      `SELECT price, captured_at FROM price_snapshots
       WHERE listing_id = $1 ORDER BY captured_at ASC`,
      [listingId]
    ),
    query<{ market_avg: string | null }>(
      `SELECT avg(ps.price) AS market_avg
       FROM listings l
       JOIN listings comp ON comp.category = l.category
                         AND comp.brand IS NOT DISTINCT FROM l.brand
       JOIN price_snapshots ps ON ps.listing_id = comp.id
                              AND ps.captured_at > now() - INTERVAL '60 days'
       WHERE l.id = $1`,
      [listingId]
    ),
  ]);

  const r = listingRows[0];
  if (!r) return null;

  const currentPrice = Number(r.current_price);
  const firstPrice = r.first_price === null ? null : Number(r.first_price);
  const marketAvg60d =
    marketRows[0]?.market_avg == null ? null : Number(marketRows[0].market_avg);

  return {
    id: r.id,
    title: r.title,
    description: r.description,
    url: r.url,
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
    marketAvg60d,
    deltaVsMarket:
      marketAvg60d && marketAvg60d > 0
        ? (currentPrice - marketAvg60d) / marketAvg60d
        : null,
    priceHistory: historyRows.map((h) => ({
      price: Number(h.price),
      capturedAt: h.captured_at,
    })),
  };
}

/**
 * Feed for one user: active listings they haven't rejected, with price-drop
 * context and their current saved state.
 *
 * Ranking: cosine distance between the listing embedding and the user's
 * taste embedding (Buyer Memory, vector half). Listings without an
 * embedding — or a user without a taste profile yet — get a NULL distance
 * and fall back to newest-first via NULLS LAST.
 */
export async function getFeedListings(userId: string): Promise<FeedItem[]> {
  const rows = await query<FeedRow>(
    `SELECT l.id, l.title, l.brand, l.category, l.size, l.color, l.condition,
            l.image_url, l.current_price, l.currency,
            extract(day FROM now() - l.first_seen_at)::INT AS listing_age_days,
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
     WHERE l.is_active
       AND NOT EXISTS (
         SELECT 1 FROM interactions r
         WHERE r.user_id = $1 AND r.listing_id = l.id AND r.kind = 'reject'
       )
     ORDER BY taste_distance ASC NULLS LAST, l.first_seen_at DESC
     LIMIT 60`,
    [userId]
  );

  return rows.map((r) => {
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
      currentPrice,
      currency: r.currency,
      listingAgeDays: Number(r.listing_age_days),
      priceChangePct:
        firstPrice && firstPrice > 0
          ? (currentPrice - firstPrice) / firstPrice
          : null,
      isSaved: r.save_state === "save",
    };
  });
}
