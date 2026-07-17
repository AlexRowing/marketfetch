import Link from "next/link";

/**
 * MarketFetch logo: a flat cobalt price-tag mark next to a serif wordmark.
 * Editorial and confident - the serif carries the brand's "taste" voice.
 * Links home. Used in page headers.
 */
export function BrandMark() {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-brand-600 text-white shadow-sm transition-transform duration-300 ease-out group-hover:-rotate-6">
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
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
          <circle cx="7.75" cy="7.75" r="1.4" fill="currentColor" />
        </svg>
      </span>
      <span className="font-serif text-[1.4rem] font-semibold leading-none tracking-tight text-ink">
        MarketFetch
      </span>
    </Link>
  );
}
