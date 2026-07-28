// Pure presentation helpers - safe to import from client components.
// Keep DB-touching code out of this file so it never leaks into the browser bundle.

/** Display name for a marketplace slug, e.g. "vinted" → "Vinted". */
export function formatSource(source: string): string {
  if (!source) return "the original site";
  return source.charAt(0).toUpperCase() + source.slice(1);
}

/**
 * Money in USD, e.g. 45 → "$45", 45.5 → "$45.50". Listings are shown in
 * dollars regardless of the source marketplace's own currency, so the whole
 * app speaks one currency. The stored `currency` column is intentionally
 * ignored here.
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
