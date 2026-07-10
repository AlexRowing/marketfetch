import type { Preference } from "@/lib/preferences";

/**
 * Typo-tolerant search scoring, shared by the /api/listings route (server
 * ranking over the whole catalog) and any client-side use. Pure functions
 * only — no DB imports, safe for client components.
 */

/** The listing fields search looks at; FeedItem satisfies this. */
export interface Searchable {
  title: string;
  brand: string | null;
  category: string;
  color: string | null;
  size: string | null;
  currentPrice: number;
}

/** How strongly a query token counts per matched field. */
const FIELD_WEIGHTS: [key: keyof Searchable & string, weight: number][] = [
  ["title", 3],
  ["brand", 2.5],
  ["category", 2],
  ["color", 1.5],
  ["size", 1],
];

/** Lowercase and strip punctuation so "Levi's" and "levis" compare equal. */
export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Split a raw query into normalized tokens. */
export function tokenize(query: string): string[] {
  return query.trim().split(/\s+/).map(normalize).filter(Boolean);
}

/**
 * Damerau-Levenshtein edit distance (insert/delete/substitute/transpose),
 * with a cutoff: returns max+1 as soon as the distance must exceed `max`.
 */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let twoAgo: number[] = [];
  let oneAgo = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(oneAgo[j] + 1, current[j - 1] + 1, oneAgo[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d = Math.min(d, twoAgo[j - 2] + 1);
      }
      current.push(d);
      if (d < rowMin) rowMin = d;
    }
    if (rowMin > max) return max + 1;
    twoAgo = oneAgo;
    oneAgo = current;
  }
  return oneAgo[b.length];
}

/**
 * How well a query token matches one word, 0..1. Exact beats substring beats
 * fuzzy, so clean matches still rank first. Typo tolerance scales with word
 * length (1 edit for 4-6 chars, 2 for 7+) — "carheart" → "carhartt" (2 edits),
 * "jaket" → "jacket" (1 edit) — covering both buyer and seller misspellings.
 */
function matchQuality(token: string, word: string): number {
  if (token === word) return 1;
  // Prefix/fragment: the user typed part of a longer word ("carh" → "carhartt").
  if (token.length >= 3 && word.includes(token)) return 0.9;
  // Plural/suffix: query word barely longer than the field word ("jackets" ⊃
  // "jacket") — the length guard stops long tokens matching tiny words
  // ("xylophone" must not match "one").
  if (word.length >= 3 && word.length >= token.length - 2 && token.includes(word)) {
    return 0.9;
  }
  if (token.length >= 4) {
    const maxD = token.length >= 7 ? 2 : 1;
    const d = editDistance(token, word, maxD);
    if (d <= maxD) return 0.9 - 0.15 * d;
  }
  return 0;
}

/**
 * Relevance score for one listing. Every query token must match some field
 * word (0 = not a result); matches are weighted by field and match quality,
 * then boosted by the user's Buyer Memory so preferred brands/colors/sizes —
 * and items within their category budget — rank first.
 */
export function scoreListing(
  item: Searchable,
  tokens: string[],
  prefs: Preference[]
): number {
  let score = 0;
  for (const token of tokens) {
    let best = 0;
    for (const [field, weight] of FIELD_WEIGHTS) {
      const value = item[field];
      if (typeof value !== "string") continue;
      for (const word of value.split(/\s+/)) {
        const w = normalize(word);
        if (!w) continue;
        const q = matchQuality(token, w) * weight;
        if (q > best) best = q;
      }
    }
    if (best === 0) return 0;
    score += best;
  }
  for (const p of prefs) {
    const v = p.value.toLowerCase();
    if (p.kind === "brand" && item.brand?.toLowerCase() === v) score += 2;
    if (p.kind === "color" && item.color?.toLowerCase() === v) score += 1;
    if (p.kind === "size" && item.size?.toLowerCase().includes(v)) score += 1;
    if (
      p.kind === "category_budget" &&
      item.category.toLowerCase() === v &&
      p.numericValue !== null &&
      item.currentPrice <= p.numericValue
    ) {
      score += 1;
    }
  }
  return score;
}
