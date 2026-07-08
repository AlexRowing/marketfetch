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
}

export async function getFeedListings(): Promise<FeedItem[]> {
  const rows = await query<FeedRow>(
    `SELECT l.id, l.title, l.brand, l.category, l.size, l.color, l.condition,
            l.image_url, l.current_price, l.currency,
            extract(day FROM now() - l.first_seen_at)::INT AS listing_age_days,
            fp.first_price
     FROM listings l
     LEFT JOIN LATERAL (
       SELECT price AS first_price
       FROM price_snapshots
       WHERE listing_id = l.id
       ORDER BY captured_at ASC
       LIMIT 1
     ) fp ON true
     WHERE l.is_active
     ORDER BY l.first_seen_at DESC`
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
    };
  });
}
