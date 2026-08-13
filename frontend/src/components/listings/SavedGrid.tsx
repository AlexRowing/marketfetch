"use client";

import { useState } from "react";
import { ListingCard } from "@/components/listings/ListingCard";
import { HeartIcon } from "@/components/ui/icons";
import type { FeedItem } from "@/lib/listings";

async function recordInteraction(listingId: string, kind: "save" | "unsave") {
  const res = await fetch("/api/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId, kind }),
  });
  if (!res.ok) throw new Error(`interaction failed: ${res.status}`);
}

/**
 * The user's saved listings - no search/category filtering, just a simple
 * list to keep an eye on prices. Unsaving removes the card immediately.
 */
export function SavedGrid({ initialItems }: { initialItems: FeedItem[] }) {
  const [items, setItems] = useState(initialItems);

  const unsave = (item: FeedItem) => {
    setItems((list) => list.filter((i) => i.id !== item.id));
    recordInteraction(item.id, "unsave").catch(() => {
      setItems((list) => (list.some((i) => i.id === item.id) ? list : [...list, item]));
    });
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong py-20 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-ink-soft ring-1 ring-line">
          <HeartIcon className="h-7 w-7" strokeWidth={1.5} />
        </span>
        <h2 className="mt-5 font-serif text-xl font-semibold text-ink">
          Nothing saved yet
        </h2>
        <p className="mt-1.5 max-w-xs text-sm text-ink-muted">
          Save a listing from the feed or its page and it&apos;ll show up here, so
          you can keep an eye on its price.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <ListingCard key={item.id} item={item} onToggleSave={unsave} />
      ))}
    </div>
  );
}
