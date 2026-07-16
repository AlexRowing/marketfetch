"use client";

import { useState } from "react";
import { BagIcon } from "@/components/ui/icons";

/**
 * Listing photo with graceful degradation: renders the real image when
 * ingestion provides one, and falls back to a clean icon + category label when
 * the URL is missing — or turns out to be broken (scraped image links rot).
 * Plain <img> (not next/image): marketplace image hosts are unknown ahead of
 * time, so we skip the remotePatterns allowlist.
 */
export function ListingImage({
  imageUrl,
  category,
  alt,
}: {
  imageUrl: string | null;
  category: string;
  alt: string;
}) {
  const [broken, setBroken] = useState(false);
  const showImage = imageUrl !== null && !broken;

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={alt}
        loading="lazy"
        onError={() => setBroken(true)}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 text-zinc-400 transition-transform duration-500 ease-out group-hover:scale-105 dark:text-zinc-600">
      <BagIcon className="h-9 w-9" strokeWidth={1.5} />
      <span className="text-[11px] font-medium uppercase tracking-widest">
        {category}
      </span>
    </div>
  );
}
