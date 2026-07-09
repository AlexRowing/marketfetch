"use client";

import { useMemo, useState } from "react";
import type { FeedItem } from "@/lib/listings";
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

export function FeedGrid({ initialItems }: { initialItems: FeedItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [search, setSearch] = useState("");
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

  // Filter in-memory (feed is capped at 60): category tab + free-text search
  // across the fields a shopper would type.
  const q = search.trim().toLowerCase();
  const visible = useMemo(
    () =>
      items.filter((i) => {
        const inCategory = category === ALL || i.category === category;
        const inSearch =
          q === "" ||
          [i.title, i.brand, i.category, i.color, i.size]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q);
        return inCategory && inSearch;
      }),
    [items, category, q]
  );

  const clearFilters = () => {
    setSearch("");
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

  const filtersActive = category !== ALL || q !== "";

  return (
    <div className="flex flex-col gap-5">
      {/* Filter bar */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
            fill="none"
          >
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="m20.5 20.5-4.2-4.2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, brand, colour…"
            aria-label="Search listings"
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
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
              {visible.length} of {items.length} listings
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
