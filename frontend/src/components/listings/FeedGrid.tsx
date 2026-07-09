"use client";

import { useMemo, useState } from "react";
import type { FeedItem } from "@/lib/listings";
import type { Preference } from "@/lib/preferences";
import type { InteractionKind } from "@/types";
import { ListingCard } from "@/components/listings/ListingCard";

async function recordInteraction(listingId: string, kind: InteractionKind) {
  const res = await fetch("/api/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId, kind }),
  });
  if (!res.ok) throw new Error(`interaction failed: ${res.status}`);
}

const ALL = "all";

/** How strongly a query token counts per matched field. */
const FIELD_WEIGHTS: [key: "title" | "brand" | "category" | "color" | "size", weight: number][] = [
  ["title", 3],
  ["brand", 2.5],
  ["category", 2],
  ["color", 1.5],
  ["size", 1],
];

/** Lowercase and strip punctuation so "Levi's" and "levis" compare equal. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
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
  if (
    token.length >= 3 &&
    word.length >= 3 &&
    (word.includes(token) || token.includes(word))
  ) {
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
function scoreListing(
  item: FeedItem,
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

export function FeedGrid({
  initialItems,
  preferences,
}: {
  initialItems: FeedItem[];
  preferences: Preference[];
}) {
  const [items, setItems] = useState(initialItems);
  // What's typed in the box vs. the query actually applied (on Enter / 🔍).
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);

  // Optimistic updates: flip the UI immediately, revert if the write fails.
  const toggleSave = (item: FeedItem) => {
    const kind: InteractionKind = item.isSaved ? "unsave" : "save";
    const flip = (list: FeedItem[], saved: boolean) =>
      list.map((i) => (i.id === item.id ? { ...i, isSaved: saved } : i));
    setItems((list) => flip(list, !item.isSaved));
    recordInteraction(item.id, kind).catch(() => {
      setItems((list) => flip(list, item.isSaved));
    });
  };

  const reject = (item: FeedItem) => {
    setItems((list) => list.filter((i) => i.id !== item.id));
    recordInteraction(item.id, "reject").catch(() => {
      setItems((list) => (list.some((i) => i.id === item.id) ? list : [...list, item]));
    });
  };

  // Categories present in the current feed — adapts to whatever data exists.
  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category))).sort(),
    [items]
  );

  // Category chips filter live; search applies only on submit, then ranks by
  // relevance + preferences. Ties keep the server's taste ordering.
  const tokens = useMemo(
    () => query.trim().toLowerCase().split(/\s+/).filter(Boolean),
    [query]
  );
  const visible = useMemo(() => {
    const inCategory = items.filter(
      (i) => category === ALL || i.category === category
    );
    if (tokens.length === 0) return inCategory;
    return inCategory
      .map((item, idx) => ({
        item,
        idx,
        score: scoreListing(item, tokens, preferences),
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.idx - b.idx)
      .map((r) => r.item);
  }, [items, category, tokens, preferences]);

  const submitSearch = () => setQuery(draft);

  const clearFilters = () => {
    setDraft("");
    setQuery("");
    setCategory(ALL);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
        <span className="text-4xl" aria-hidden>
          🛍️
        </span>
        <h2 className="mt-3 text-base font-medium text-zinc-900 dark:text-zinc-100">
          You&apos;re all caught up
        </h2>
        <p className="mt-1 max-w-xs text-sm text-zinc-500 dark:text-zinc-400">
          You&apos;ve been through every listing. New deals arrive as the agent
          keeps scanning the marketplaces.
        </p>
      </div>
    );
  }

  const filtersActive = category !== ALL || tokens.length > 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Filter bar */}
      <div className="flex flex-col gap-3">
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            submitSearch();
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search by name, brand, colour…"
            aria-label="Search listings"
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-4 pr-28 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
          <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {query !== "" && (
              <button
                type="button"
                onClick={clearFilters}
                aria-label="Clear search"
                title="Clear search"
                className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              aria-label="Search"
              className="flex h-7 items-center gap-1.5 rounded-md bg-brand-600 px-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                <path
                  d="m20.5 20.5-4.2-4.2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
              Search
            </button>
          </div>
        </form>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          <CategoryChip
            label="All"
            active={category === ALL}
            onClick={() => setCategory(ALL)}
          />
          {categories.map((c) => (
            <CategoryChip
              key={c}
              label={c}
              active={category === c}
              onClick={() => setCategory(c)}
            />
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 py-14 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No listings match your filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {filtersActive && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {tokens.length > 0
                ? `${visible.length} result${visible.length === 1 ? "" : "s"} for “${query.trim()}” — ranked by match & your preferences`
                : `${visible.length} of ${items.length} listings`}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {visible.map((item) => (
              <ListingCard
                key={item.id}
                item={item}
                onToggleSave={toggleSave}
                onReject={reject}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
        active
          ? "bg-brand-600 text-white dark:bg-brand-500"
          : "border border-zinc-200 text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
      }`}
    >
      {label}
    </button>
  );
}
