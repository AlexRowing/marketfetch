"use client";

import { useState } from "react";
import Link from "next/link";
import { formatSource } from "@/lib/format";
import { ListingImage } from "@/components/listings/ListingImage";
import { SourceBadge } from "@/components/listings/SourceBadge";
import {
  ArrowUpRightIcon,
  CloseIcon,
  HeartIcon,
  TrendDownIcon,
} from "@/components/ui/icons";
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
  // Drives the one-shot pop when the user saves (not on initial render).
  const [popping, setPopping] = useState(false);

  const sold = !item.isActive;
  const dropPct =
    !sold && item.priceChangePct !== null && item.priceChangePct < -0.01
      ? Math.round(Math.abs(item.priceChangePct) * 100)
      : null;
  // "seed" is placeholder data — only badge a real marketplace source.
  const showSource = item.source && item.source !== "seed";

  const handleSave = () => {
    if (!item.isSaved) setPopping(true);
    onToggleSave(item);
  };

  const meta = [item.brand, item.size, item.condition].filter(Boolean).join(" · ");

  return (
    <article className="group relative flex flex-col">
      <Link
        href={`/listings/${item.id}`}
        aria-label={item.title}
        className="absolute inset-0 z-[1] rounded-2xl"
      />

      {/* Image tile — floats on the page with a hairline ring; the photo is
          the card. Lifts and deepens its shadow on hover. */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-linear-to-br from-zinc-100 to-zinc-200/60 shadow-sm ring-1 ring-black/[0.06] transition-all duration-300 ease-out group-hover:shadow-xl group-hover:shadow-black/[0.07] group-hover:ring-black/[0.1] dark:from-zinc-900 dark:to-zinc-950 dark:shadow-none dark:ring-white/[0.08] dark:group-hover:ring-white/15">
        <div
          className={`absolute inset-0 flex items-center justify-center ${
            sold ? "opacity-55 saturate-50" : ""
          }`}
        >
          <ListingImage
            imageUrl={item.imageUrl}
            category={item.category}
            alt={item.title}
          />
        </div>

        {/* Badges — top-left. Sold takes precedence over a price drop. */}
        {sold ? (
          <span className="absolute left-2.5 top-2.5 z-[2] rounded-full bg-zinc-900/85 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm backdrop-blur-sm dark:bg-white/90 dark:text-zinc-900">
            Sold
          </span>
        ) : (
          dropPct !== null && (
            <span className="absolute left-2.5 top-2.5 z-[2] inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white shadow-sm">
              <TrendDownIcon className="h-3 w-3" strokeWidth={2.25} />
              {dropPct}%
            </span>
          )
        )}

        {showSource && (
          <span className="absolute bottom-2.5 left-2.5 z-[2]">
            <SourceBadge source={item.source} />
          </span>
        )}

        {/* Save / dismiss — frosted controls above the link overlay. Save is
            always present; dismiss fades in on hover (still tappable on touch). */}
        {!sold && (
          <div className="absolute right-2.5 top-2.5 z-[2] flex gap-1.5">
            <button
              type="button"
              aria-label={item.isSaved ? "Remove from saved" : "Save"}
              aria-pressed={item.isSaved}
              title={item.isSaved ? "Saved" : "Save"}
              onClick={handleSave}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-zinc-700 shadow-sm ring-1 ring-black/[0.04] backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white active:scale-95 dark:bg-zinc-900/80 dark:text-zinc-200 dark:ring-white/10 dark:hover:bg-zinc-900"
            >
              <HeartIcon
                filled={item.isSaved}
                onAnimationEnd={() => setPopping(false)}
                className={`h-[18px] w-[18px] ${
                  item.isSaved ? "text-brand-600 dark:text-brand-400" : ""
                } ${popping ? "animate-heart-pop" : ""}`}
              />
            </button>
            <button
              type="button"
              aria-label="Not interested"
              title="Not interested"
              onClick={() => onReject(item)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/85 text-zinc-500 opacity-0 shadow-sm ring-1 ring-black/[0.04] backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-white hover:text-zinc-800 focus-visible:opacity-100 active:scale-95 group-hover:opacity-100 max-sm:opacity-100 dark:bg-zinc-900/80 dark:text-zinc-400 dark:ring-white/10 dark:hover:text-zinc-100"
            >
              <CloseIcon className="h-[18px] w-[18px]" />
            </button>
          </div>
        )}
      </div>

      {/* Text sits directly on the page — no card chrome competing with the
          photo. Price is the hero of the row. */}
      <div className="flex flex-col gap-0.5 px-0.5 pt-2.5">
        <h2 className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {item.title}
        </h2>
        {meta && (
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {meta}
          </p>
        )}
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <span className="text-[17px] font-semibold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-50">
            {formatPrice(item.currentPrice, item.currency)}
          </span>
          <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
            {item.listingAgeDays}d ago
          </span>
        </div>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            // Sits above the card's full-surface Link overlay (z-[1]).
            className="relative z-[2] mt-1.5 inline-flex items-center gap-1 self-start text-xs text-zinc-400 transition-colors hover:text-brand-600 dark:text-zinc-500 dark:hover:text-brand-400"
          >
            View on {formatSource(item.source)}
            <ArrowUpRightIcon className="h-3 w-3" strokeWidth={2} />
          </a>
        )}
      </div>
    </article>
  );
}
