// Pure presentation helpers — safe to import from client components.
// Keep DB-touching code out of this file so it never leaks into the browser bundle.

/** Display name for a marketplace slug, e.g. "vinted" → "Vinted". */
export function formatSource(source: string): string {
  if (!source) return "the original site";
  return source.charAt(0).toUpperCase() + source.slice(1);
}

/** Money, e.g. 45 → "€45", 45.5 → "€45.50". */
export function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
