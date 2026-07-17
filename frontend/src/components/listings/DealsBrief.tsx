import Link from "next/link";
import { ListingImage } from "@/components/listings/ListingImage";
import { SparkIcon, TrendDownIcon } from "@/components/ui/icons";
import { formatPrice } from "@/lib/format";
import type { Deal } from "@/lib/deals";

/**
 * The agent's proactive "here's what I found for you" strip, above the feed.
 * Server-rendered from getDealsForUser - deterministic, grounded, instant.
 * Renders nothing when there are no genuine deals (never fabricate one).
 */
export function DealsBrief({ deals }: { deals: Deal[] }) {
  if (deals.length === 0) return null;

  return (
    <section className="mb-11">
      <div className="mb-5 flex items-end justify-between gap-4 border-b border-line pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
            <SparkIcon className="h-4 w-4" />
          </span>
          <h2 className="font-serif text-xl font-semibold tracking-tight text-ink">
            The agent&apos;s picks
          </h2>
        </div>
        <span className="hidden shrink-0 pb-1 font-mono text-[11px] tracking-tight text-ink-soft sm:block">
          priced to move
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4">
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}
      </div>
    </section>
  );
}

function DealCard({ deal }: { deal: Deal }) {
  const drop =
    deal.dropPct !== null && deal.dropPct < -0.01
      ? Math.round(Math.abs(deal.dropPct) * 100)
      : null;

  return (
    <Link href={`/listings/${deal.id}`} className="group flex flex-col">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-surface shadow-[0_1px_2px_rgba(20,16,12,0.05)] ring-1 ring-line transition-all duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_-14px_rgba(20,16,12,0.28)] group-hover:ring-line-strong">
        <div className="absolute inset-0 flex items-center justify-center">
          <ListingImage
            imageUrl={deal.imageUrl}
            category={deal.category}
            alt={deal.title}
          />
        </div>
        {drop !== null && (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white shadow-sm">
            <TrendDownIcon className="h-3 w-3" strokeWidth={2.25} />
            {drop}%
          </span>
        )}
      </div>
      <div className="flex flex-col gap-0.5 px-0.5 pt-3">
        <h3 className="truncate text-[13px] font-medium text-ink">
          {deal.title}
        </h3>
        <span className="font-serif text-xl font-semibold tracking-tight tabular-nums text-ink">
          {formatPrice(deal.currentPrice, deal.currency)}
        </span>
        <p className="mt-1 line-clamp-2 text-xs font-medium leading-4 text-brand-700 dark:text-brand-400">
          {deal.reason}
        </p>
      </div>
    </Link>
  );
}
