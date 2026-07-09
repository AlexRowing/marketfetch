"use client";

import Link from "next/link";
import { formatSource } from "@/lib/format";
import { ListingImage } from "@/components/listings/ListingImage";
import { SourceBadge } from "@/components/listings/SourceBadge";
import type { FeedItem } from "@/lib/listings";

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
  // "seed" is placeholder data — only badge a real marketplace source.
  const showSource = item.source && item.source !== "seed";

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-500/5 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-brand-700/60">
      <Link
        href={`/listings/${item.id}`}
        aria-label={item.title}
        className="absolute inset-0 z-[1]"
      />
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-linear-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950">
        <ListingImage
          imageUrl={item.imageUrl}
          category={item.category}
          alt={item.title}
        />
        {dropPct !== null && (
          <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-1 text-xs font-semibold text-white shadow-sm">
            ↓ {dropPct}%
          </span>
        )}
        {showSource && (
          <span className="absolute bottom-2 left-2">
            <SourceBadge source={item.source} />
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
          <span className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {formatPrice(item.currentPrice, item.currency)}
          </span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {item.listingAgeDays}d ago
          </span>
        </div>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            // Sits above the card's full-surface Link overlay (z-[1]).
            className="relative z-10 mt-2 inline-flex items-center gap-1 self-start text-xs text-zinc-500 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            View on {formatSource(item.source)}
            <span aria-hidden>↗</span>
          </a>
        )}
      </div>
    </article>
  );
}
