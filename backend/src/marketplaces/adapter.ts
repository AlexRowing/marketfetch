// Marketplace adapter contract: one implementation per marketplace.
// Adding a marketplace = one new file implementing MarketplaceAdapter and one
// entry in ingestion/queries.ts. Only official APIs — no scraping (public,
// judged repo; see docs/architecture.md).

/** A listing in the shape our `listings` table expects, source-agnostic. */
export interface MarketplaceListing {
  source: string;
  externalId: string;
  title: string;
  description: string;
  brand: string | null;
  category: string;
  size: string | null;
  color: string | null;
  condition: string | null;
  imageUrl: string | null;
  url: string;
  price: number;
  currency: string;
  isActive: boolean;
}

/** Current price of a live listing, or null if it ended/sold/vanished. */
export interface CurrentPrice {
  price: number;
  currency: string;
}

export interface MarketplaceAdapter {
  /** Matches listings.source, e.g. "reverb". */
  source: string;
  search(query: string, limit: number): Promise<MarketplaceListing[]>;
  fetchCurrent(externalId: string): Promise<CurrentPrice | null>;
}
