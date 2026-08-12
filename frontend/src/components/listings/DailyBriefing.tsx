import Link from "next/link";
import { SparkIcon } from "@/components/ui/icons";
import type { Briefing } from "@/lib/briefing";
import type { Deal } from "@/lib/deals";

/**
 * The agent's daily briefing - a calm, spoken-word summary above the feed that
 * says "I'm watching the market for you". Deterministic and grounded in the DB
 * (counts from getBriefing, standout from the deals it already surfaced), so it
 * reads like the agent talking rather than a dashboard. `opportunities` is the
 * number of genuine below-market / dropped picks; `deals[0]` is the standout.
 */
export function DailyBriefing({
  briefing,
  deals,
  personalised,
}: {
  briefing: Briefing;
  deals: Deal[];
  /** True for logged-in users (picks are taste-ranked), false for guests. */
  personalised: boolean;
}) {
  const { checked, priceDrops } = briefing;
  const opportunities = deals.length;
  const featured = deals[0] ?? null;

  // Nothing to watch yet (empty catalog) - don't render a hollow band.
  if (checked === 0) return null;

  const today = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  // One spoken sentence, assembled from what's actually true today.
  const dropClause =
    priceDrops > 0
      ? `${priceDrops} ${priceDrops === 1 ? "has" : "have"} dropped in price recently`
      : null;
  const oppClause =
    opportunities > 0
      ? `${opportunities} ${opportunities === 1 ? "is" : "are"} sitting below what comparable pieces sell for`
      : null;

  let summary: string;
  if (dropClause && oppClause) {
    summary = `I went through ${checked} listings on the board. ${cap(dropClause)}, and ${oppClause}.`;
  } else if (oppClause) {
    summary = `I went through ${checked} listings on the board, and ${oppClause}.`;
  } else if (dropClause) {
    summary = `I went through ${checked} listings on the board. ${cap(dropClause)}, though nothing is clearly underpriced against its comparables right now.`;
  } else {
    summary = `I went through ${checked} listings on the board. Nothing is screaming underpriced right now - I'd sit tight rather than reach.`;
  }

  return (
    <section className="mb-9 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-white shadow-sm">
          <SparkIcon className="h-3.5 w-3.5" />
        </span>
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-brand-600">
          Daily briefing
        </span>
        <span className="ml-auto font-mono text-[11px] tracking-tight text-ink-soft">
          {today}
        </span>
      </div>

      <p className="mt-3 font-serif text-lg leading-relaxed tracking-tight text-ink text-balance sm:text-xl">
        {summary}
      </p>

      {featured && (
        <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
          {personalised ? "Your standout today is " : "Today's standout is "}
          <Link
            href={`/listings/${featured.id}`}
            className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-800 dark:text-brand-400"
          >
            {featured.title}
          </Link>
          {" - "}
          {lower(featured.reason)}.
        </p>
      )}

      <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-line pt-4">
        <Stat label="Listings watched" value={checked} />
        <Stat label="Recent price drops" value={priceDrops} />
        <Stat label="Opportunities" value={opportunities} />
      </dl>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-serif text-2xl font-semibold tabular-nums text-ink">
        {value.toLocaleString("en-US")}
      </dd>
    </div>
  );
}

/** Uppercase the first letter, leave the rest ("11 have…" → "11 have…"). */
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Lowercase the first letter so a reason reads mid-sentence after " - ". */
function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}
