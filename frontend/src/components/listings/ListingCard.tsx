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
  // "seed" is placeholder data - only badge a real marketplace source.
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
        className="absolute inset-0 z-[1] rounded-xl"
      />

      {/* The photo is the card - floats on the canvas with a hairline ring,
          lifts and deepens its shadow on hover. */}
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-surface shadow-[0_1px_2px_rgba(20,16,12,0.05)] ring-1 ring-line transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_-14px_rgba(20,16,12,0.28)] group-hover:ring-line-strong">
        <div
          className={`absolute inset-0 flex items-center justify-center ${
            sold ? "opacity-55 saturate-[0.4]" : ""
          }`}
        >
          <ListingImage
            imageUrl={item.imageUrl}
            category={item.category}
            alt={item.title}
          />
        </div>

        {/* Badges - top-left. Sold takes precedence over a price drop. */}
        {sold ? (
          <span className="absolute left-2.5 top-2.5 z-[2] rounded-full bg-ink/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-canvas shadow-sm backdrop-blur-sm">
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

        {/* Save / dismiss - frosted controls above the link overlay. Save is
            always present; dismiss fades in on hover (still tappable on touch). */}
        {!sold && (
          <div className="absolute right-2.5 top-2.5 z-[2] flex gap-1.5">
            <button
              type="button"
              aria-label={item.isSaved ? "Remove from saved" : "Save"}
              aria-pressed={item.isSaved}
              title={item.isSaved ? "Saved" : "Save"}
              onClick={handleSave}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface/85 text-ink shadow-sm ring-1 ring-line backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-surface active:scale-95"
            >
              <HeartIcon
                filled={item.isSaved}
                onAnimationEnd={() => setPopping(false)}
                className={`h-[18px] w-[18px] ${
                  item.isSaved ? "text-brand-600" : ""
                } ${popping ? "animate-heart-pop" : ""}`}
              />
            </button>
            <button
              type="button"
              aria-label="Not interested"
              title="Not interested"
              onClick={() => onReject(item)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface/85 text-ink-muted opacity-0 shadow-sm ring-1 ring-line backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:bg-surface hover:text-ink focus-visible:opacity-100 active:scale-95 group-hover:opacity-100 max-sm:opacity-100"
            >
              <CloseIcon className="h-[18px] w-[18px]" />
            </button>
          </div>
        )}
      </div>

      {/* Editorial caption: quiet name + meta, price set in the serif. */}
      <div className="flex flex-col gap-0.5 px-0.5 pt-3">
        <h2 className="truncate text-[13px] font-medium text-ink">
          {item.title}
        </h2>
        {meta && (
          <p className="truncate text-xs text-ink-soft">{meta}</p>
        )}
        <div className="mt-1.5 flex items-baseline justify-between gap-2">
          <span className="font-serif text-xl font-semibold tracking-tight tabular-nums text-ink">
            {formatPrice(item.currentPrice, item.currency)}
          </span>
          <span className="shrink-0 text-[11px] text-ink-soft">
            {item.listingAgeDays}d ago
          </span>
        </div>
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            // Sits above the card's full-surface Link overlay (z-[1]).
            className="relative z-[2] mt-2 inline-flex items-center gap-1 self-start text-[11px] text-ink-soft transition-colors hover:text-brand-600"
          >
            View on {formatSource(item.source)}
            <ArrowUpRightIcon className="h-3 w-3" strokeWidth={2} />
          </a>
        )}
      </div>
    </article>
  );
}
