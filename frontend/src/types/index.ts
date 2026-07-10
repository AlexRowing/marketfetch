/**
 * Shared domain types — the TypeScript mirror of docs/database-schema.md.
 * If the schema changes, change it there first, then here.
 */

export type PreferenceKind = "brand" | "size" | "color" | "category_budget";
export type PreferenceSource = "explicit" | "inferred";
export type InteractionKind = "view" | "save" | "reject" | "unsave";

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface UserPreference {
  id: string;
  userId: string;
  kind: PreferenceKind;
  value: string;
  /** Budget amount when kind === "category_budget" */
  numericValue: number | null;
  source: PreferenceSource;
  createdAt: string;
}

export interface Listing {
  id: string;
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
  url: string | null;
  currentPrice: number;
  currency: string;
  /** When the seller listed it on the marketplace; null until ingestion maps it. */
  listedAt: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  isActive: boolean;
}

export interface PriceSnapshot {
  id: string;
  listingId: string;
  price: number;
  currency: string;
  capturedAt: string;
}

export interface Interaction {
  id: string;
  userId: string;
  listingId: string;
  kind: InteractionKind;
  createdAt: string;
}

/** Computed Price Memory summary for a listing (derived in SQL, not stored). */
export interface DealInfo {
  listingId: string;
  currentPrice: number;
  marketAvg60d: number | null;
  /** Negative = below market (a deal). e.g. -0.22 → 22% below market. */
  deltaVsMarket: number | null;
  listingAgeDays: number;
  priceHistory: PriceSnapshot[];
}
