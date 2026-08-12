import { formatSource } from "@/lib/format";

/**
 * Marketplace identity: brand-colored logo tile + name. Known marketplaces get
 * their brand color and mark; unknown sources fall back to a neutral monogram,
 * so new marketplaces from ingestion render fine with zero frontend changes.
 *
 * Marks are monogram tiles for now - swap the `mark` for an official SVG per
 * marketplace when we add real brand assets.
 */
const SOURCES: Record<string, { bg: string; mark: string }> = {
  reverb: { bg: "#F5756C", mark: "R" },
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

/**
 * Compact pill for listing cards (overlaid on the image area). Synthetic
 * listings (backend/src/ingestion/seed-clothing.ts) carry a real marketplace
 * `source` label so the agent has a rich catalog to reason over, but they
 * never actually came from that marketplace - so this badge deliberately
 * does NOT render the brand color/mark for them. Showing a real "Vinted" or
 * "eBay" logo on generated data would misrepresent an integration that
 * doesn't exist; a plain "Demo listing" pill is the honest version.
 */
export function SourceBadge({
  source,
  isSynthetic,
}: {
  source: string;
  isSynthetic: boolean;
}) {
  if (isSynthetic) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line-strong bg-surface/90 py-0.5 pl-1 pr-2 text-[11px] font-medium text-ink-muted shadow-sm backdrop-blur-sm">
        <span
          aria-hidden
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] bg-ink-soft text-[9.9px] font-bold leading-none text-canvas"
        >
          ?
        </span>
        Demo listing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface/90 py-0.5 pl-1 pr-2 text-[11px] font-medium text-ink-muted shadow-sm backdrop-blur-sm">
      <SourceLogo source={source} size={16} />
      {formatSource(source)}
    </span>
  );
}

/** Larger inline variant for the listing detail page. */
export function SourceBadgeLarge({
  source,
  isSynthetic,
}: {
  source: string;
  isSynthetic: boolean;
}) {
  if (isSynthetic) {
    return (
      <span
        title="Generated demo data for this hackathon build - not a real marketplace listing"
        className="inline-flex items-center gap-2 rounded-lg border border-dashed border-line-strong bg-surface py-1 pl-1.5 pr-2.5 text-sm font-medium text-ink-muted"
      >
        <span
          aria-hidden
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] bg-ink-soft text-xs font-bold leading-none text-canvas"
        >
          ?
        </span>
        Demo listing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-line bg-surface py-1 pl-1.5 pr-2.5 text-sm font-medium text-ink-muted">
      <SourceLogo source={source} size={20} />
      {formatSource(source)}
    </span>
  );
}
