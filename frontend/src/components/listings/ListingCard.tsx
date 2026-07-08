"use client";

import Link from "next/link";
import type { FeedItem } from "@/lib/listings";

const CATEGORY_EMOJI: Record<string, string> = {
  jackets: "🧥",
  jeans: "👖",
  sneakers: "👟",
  shoes: "🥾",
  fleeces: "🧸",
  accessories: "🧢",
  shirts: "👔",
};

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export function ListingCard({
  item,
  onToggleSave,
  onReject,
}: {
  item: FeedItem;
  onToggleSave: (item: FeedItem) => void;
  onReject: (item: FeedItem) => void;
}) {
  const dropPct =
    item.priceChangePct !== null && item.priceChangePct < -0.01
      ? Math.round(Math.abs(item.priceChangePct) * 100)
      : null;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950">
      <Link
        href={`/listings/${item.id}`}
        aria-label={item.title}
        className="absolute inset-0 z-0"
      />
      <div className="relative flex aspect-square items-center justify-center bg-zinc-100 text-6xl dark:bg-zinc-900">
        {/* Images land with Dev B's ingestion pipeline; emoji placeholder until then. */}
        <span aria-hidden>{CATEGORY_EMOJI[item.category] ?? "🛍️"}</span>
        {dropPct !== null && (
          <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
            ↓ {dropPct}% since listed
          </span>
        )}
        <div className="absolute right-2 top-2 z-10 flex gap-1.5">
          <button
            type="button"
            aria-label={item.isSaved ? "Unsave" : "Save"}
            title={item.isSaved ? "Unsave" : "Save"}
            onClick={() => onToggleSave(item)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-base shadow-sm transition-transform hover:scale-110 dark:bg-zinc-800/90"
          >
            {item.isSaved ? "❤️" : "🤍"}
          </button>
          <button
            type="button"
            aria-label="Not interested"
            title="Not interested"
            onClick={() => onReject(item)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm text-zinc-500 shadow-sm transition-transform hover:scale-110 dark:bg-zinc-800/90 dark:text-zinc-300"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h2 className="line-clamp-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {item.title}
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {[item.brand, item.size, item.condition].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-auto flex items-baseline justify-between pt-2">
          <span className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
            {formatPrice(item.currentPrice, item.currency)}
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            listed {item.listingAgeDays}d ago
          </span>
        </div>
      </div>
    </article>
  );
}
