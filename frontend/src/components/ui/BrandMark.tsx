import Link from "next/link";

/**
 * MarketFetch logo: a price-tag glyph with an AI "spark", in the brand gradient,
 * next to the wordmark. Links home. Used in page headers.
 */
export function BrandMark() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-brand-500 to-brand-700 shadow-sm transition-transform group-hover:scale-105">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 text-white"
          fill="none"
          aria-hidden
        >
          {/* price tag */}
          <path
            d="M12.6 3H6a3 3 0 0 0-3 3v6.6a2 2 0 0 0 .59 1.4l6.8 6.8a2 2 0 0 0 2.83 0l5.58-5.58a2 2 0 0 0 0-2.83l-6.8-6.8A2 2 0 0 0 12.6 3Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {/* tag hole / spark */}
          <circle cx="7.75" cy="7.75" r="1.35" fill="currentColor" />
        </svg>
      </span>
      <span className="text-lg font-semibold tracking-tight text-black dark:text-zinc-50">
        Market<span className="text-brand-600 dark:text-brand-400">Fetch</span>
      </span>
    </Link>
  );
}
