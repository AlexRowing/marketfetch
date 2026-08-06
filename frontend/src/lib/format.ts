// Pure presentation helpers - safe to import from client components.
// Keep DB-touching code out of this file so it never leaks into the browser bundle.

/** Display name for a marketplace slug, e.g. "vinted" → "Vinted". */
export function formatSource(source: string): string {
  if (!source) return "the original site";
  return source.charAt(0).toUpperCase() + source.slice(1);
}

/**
 * Money in USD, e.g. 45 → "$45", 45.5 → "$45.50". Every stored price is USD
 * end to end - marketplace adapters request USD directly, and the one-time
 * EUR→USD backfill (2026-08-06, rate 1.1542) converted everything already in
 * the DB - so the `currency` column and this formatter always agree.
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
