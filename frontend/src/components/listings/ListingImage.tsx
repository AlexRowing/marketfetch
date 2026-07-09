"use client";

import { useState } from "react";

const CATEGORY_EMOJI: Record<string, string> = {
  jackets: "🧥",
  jeans: "👖",
  sneakers: "👟",
  shoes: "🥾",
  fleeces: "🧸",
  accessories: "🧢",
  shirts: "👔",
};

/**
 * Listing photo with graceful degradation: renders the real image when
 * ingestion provides one, and falls back to the category emoji when the URL
 * is missing — or turns out to be broken (scraped image links rot).
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
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
    );
  }

  return (
    <span
      aria-hidden
      className="text-6xl transition-transform duration-300 group-hover:scale-110"
    >
      {CATEGORY_EMOJI[category] ?? "🛍️"}
    </span>
  );
}
