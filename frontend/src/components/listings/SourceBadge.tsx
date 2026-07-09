import { formatSource } from "@/lib/format";

/**
 * Marketplace identity: brand-colored logo tile + name. Known marketplaces get
 * their brand color and mark; unknown sources fall back to a neutral monogram,
 * so new marketplaces from ingestion render fine with zero frontend changes.
 *
 * Marks are monogram tiles for now — swap the `mark` for an official SVG per
 * marketplace when we add real brand assets.
 */
const SOURCES: Record<string, { bg: string; mark: string }> = {
  vinted: { bg: "#09B1BA", mark: "V" },
  ebay: { bg: "#E53238", mark: "e" },
  depop: { bg: "#FF2300", mark: "d" },
  grailed: { bg: "#1F1F1F", mark: "G" },
  vestiaire: { bg: "#F56600", mark: "V" },
  etsy: { bg: "#F1641E", mark: "E" },
};

function SourceLogo({ source, size = 16 }: { source: string; size?: number }) {
  const s = SOURCES[source.toLowerCase()];
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        backgroundColor: s?.bg ?? "#71717a",
        fontSize: size * 0.62,
      }}
      className="flex shrink-0 items-center justify-center rounded-[4px] font-bold leading-none text-white"
    >
      {s?.mark ?? formatSource(source).charAt(0)}
    </span>
  );
}

/** Compact pill for listing cards (overlaid on the image area). */
export function SourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 py-0.5 pl-1 pr-2 text-[11px] font-medium text-zinc-700 shadow-sm backdrop-blur-sm dark:bg-black/70 dark:text-zinc-200">
      <SourceLogo source={source} size={16} />
      {formatSource(source)}
    </span>
  );
}

/** Larger inline variant for the listing detail page. */
export function SourceBadgeLarge({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white py-1 pl-1.5 pr-2.5 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
      <SourceLogo source={source} size={20} />
      {formatSource(source)}
    </span>
  );
}
