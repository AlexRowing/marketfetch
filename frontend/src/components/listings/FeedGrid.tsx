"use client";

import { useRef, useState } from "react";
import type { FeedItem, ListingStatus } from "@/lib/listings";
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
const PAGE_SIZE = 24;

interface ListingsResponse {
  listings: FeedItem[];
  total: number;
  hasMore: boolean;
}

/**
 * Server-driven feed: search, category filter, and pagination all hit
 * /api/listings so the whole catalog is reachable, not just the first page.
 * Search is typo-tolerant and ranked by relevance + Buyer Memory server-side.
 */
export function FeedGrid({
  initialItems,
  initialTotal,
  categories,
}: {
  initialItems: FeedItem[];
  initialTotal: number;
  categories: string[];
}) {
  const [items, setItems] = useState(initialItems);
  const [total, setTotal] = useState(initialTotal);
  // What's typed in the box vs. the query actually applied (on Enter / Search).
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(ALL);
  // Available listings vs the Facebook-style "what sold" research view.
  const [status, setStatus] = useState<ListingStatus>("active");
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Drop responses that arrive after a newer request was issued.
  const requestSeq = useRef(0);

  const fetchListings = async (
    opts: { q: string; category: string; status: ListingStatus; offset: number },
    mode: "replace" | "append"
  ) => {
    const seq = ++requestSeq.current;
    const setBusy = mode === "replace" ? setLoading : setLoadingMore;
    setBusy(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (opts.q) params.set("q", opts.q);
      if (opts.category !== ALL) params.set("category", opts.category);
      if (opts.status !== "active") params.set("status", opts.status);
      params.set("offset", String(opts.offset));
      params.set("limit", String(PAGE_SIZE));
      const res = await fetch(`/api/listings?${params}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as ListingsResponse;
      if (seq !== requestSeq.current) return; // stale
      setTotal(data.total);
      setItems((list) =>
        mode === "append"
          ? [...list, ...data.listings.filter((n) => !list.some((i) => i.id === n.id))]
          : data.listings
      );
    } catch {
      if (seq === requestSeq.current) {
        setError("Couldn't load listings — try again.");
      }
    } finally {
      if (seq === requestSeq.current) setBusy(false);
    }
  };

  const submitSearch = () => {
    const q = draft.trim();
    setQuery(q);
    fetchListings({ q, category, status, offset: 0 }, "replace");
  };

  const pickCategory = (c: string) => {
    setCategory(c);
    fetchListings({ q: query, category: c, status, offset: 0 }, "replace");
  };

  const pickStatus = (s: ListingStatus) => {
    if (s === status) return;
    setStatus(s);
    fetchListings({ q: query, category, status: s, offset: 0 }, "replace");
  };

  const clearFilters = () => {
    setDraft("");
    setQuery("");
    setCategory(ALL);
    fetchListings({ q: "", category: ALL, status, offset: 0 }, "replace");
  };

  const loadMore = () =>
    fetchListings({ q: query, category, status, offset: items.length }, "append");

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
    setTotal((t) => Math.max(0, t - 1));
    recordInteraction(item.id, "reject").catch(() => {
      setItems((list) => (list.some((i) => i.id === item.id) ? list : [...list, item]));
      setTotal((t) => t + 1);
    });
  };

  const filtersActive = category !== ALL || query !== "";
  const hasMore = items.length < total;

  if (items.length === 0 && !filtersActive && !loading && status === "active") {
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
              disabled={loading}
              className="flex h-7 items-center gap-1.5 rounded-md bg-brand-600 px-3 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-600"
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
              {loading ? "…" : "Search"}
            </button>
          </div>
        </form>
        <div className="flex items-center gap-3">
          {/* Available vs sold — like Facebook Marketplace's sold filter. */}
          <div
            role="group"
            aria-label="Listing status"
            className="flex shrink-0 rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700"
          >
            {(
              [
                ["active", "Available"],
                ["sold", "Sold"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => pickStatus(value)}
                aria-pressed={status === value}
                className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                  status === value
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <CategoryChip
              label="All"
              active={category === ALL}
              onClick={() => pickCategory(ALL)}
            />
            {categories.map((c) => (
              <CategoryChip
                key={c}
                label={c}
                active={category === c}
                onClick={() => pickCategory(c)}
              />
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {items.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 py-14 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {filtersActive
              ? "No listings match your filters."
              : "Nothing has sold yet — sold listings appear here once the tracker notices them."}
          </p>
          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-2 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <>
          {filtersActive && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {query !== ""
                ? `${total} result${total === 1 ? "" : "s"} for “${query}” — ranked by match & your preferences`
                : `${total} listing${total === 1 ? "" : "s"}`}
            </p>
          )}
          <div
            className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${loading ? "opacity-50" : ""}`}
          >
            {items.map((item) => (
              <ListingCard
                key={item.id}
                item={item}
                onToggleSave={toggleSave}
                onReject={reject}
              />
            ))}
          </div>
          {hasMore && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore || loading}
              className="mx-auto rounded-lg border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:border-brand-300 hover:text-brand-700 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-brand-700 dark:hover:text-brand-400"
            >
              {loadingMore
                ? "Loading…"
                : `Load more (${total - items.length} left)`}
            </button>
          )}
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
