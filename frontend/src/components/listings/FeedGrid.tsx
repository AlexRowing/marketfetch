"use client";

import { useState } from "react";
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

export function FeedGrid({ initialItems }: { initialItems: FeedItem[] }) {
  const [items, setItems] = useState(initialItems);

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

  if (items.length === 0) {
    return (
      <p className="text-zinc-500 dark:text-zinc-400">
        Nothing left in your feed — you&apos;ve rejected everything. More
        listings arrive with the ingestion pipeline.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => (
        <ListingCard
          key={item.id}
          item={item}
          onToggleSave={toggleSave}
          onReject={reject}
        />
      ))}
    </div>
  );
}
