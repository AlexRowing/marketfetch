// Pure presentation helpers — safe to import from client components.
// Keep DB-touching code out of this file so it never leaks into the browser bundle.

/** Display name for a marketplace slug, e.g. "vinted" → "Vinted". */
export function formatSource(source: string): string {
  if (!source) return "the original site";
  return source.charAt(0).toUpperCase() + source.slice(1);
}
