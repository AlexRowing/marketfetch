import Link from "next/link";
import { ListingImage } from "@/components/listings/ListingImage";
import { SparkIcon, TrendDownIcon } from "@/components/ui/icons";
import { formatPrice } from "@/lib/format";
import type { Deal } from "@/lib/deals";

/**
 * The agent's proactive "here's what I found for you" strip, above the feed.
 * Server-rendered from getDealsForUser — deterministic, grounded, instant.
 * Renders nothing when there are no genuine deals (never fabricate one).
 */
export function DealsBrief({ deals }: { deals: Deal[] }) {
  if (deals.length === 0) return null;

  return (
    <section className="mb-9 rounded-3xl border border-brand-100 bg-brand-50/50 p-5 dark:border-brand-800/40 dark:bg-brand-500/[0.06] sm:p-6">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm dark:bg-brand-500">
          <SparkIcon className="h-4.5 w-4.5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-brand-800 dark:text-brand-200">
            Deals for you
          </h2>
          <p className="text-xs text-brand-700/70 dark:text-brand-300/70">
            Found in your feed by the agent — priced to move
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-linear-to-br from-white to-zinc-100 shadow-sm ring-1 ring-black/[0.05] transition-all duration-300 ease-out group-hover:shadow-xl group-hover:shadow-black/[0.07] dark:from-zinc-900 dark:to-zinc-950 dark:shadow-none dark:ring-white/[0.08] dark:group-hover:ring-white/15">
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
      <div className="flex flex-col gap-0.5 px-0.5 pt-2.5">
        <h3 className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {deal.title}
        </h3>
        <span className="text-[17px] font-semibold tracking-tight tabular-nums text-zinc-900 dark:text-zinc-50">
          {formatPrice(deal.currentPrice, deal.currency)}
        </span>
        <p className="mt-1 line-clamp-2 text-xs font-medium leading-4 text-brand-700 dark:text-brand-300">
          {deal.reason}
        </p>
      </div>
    </Link>
  );
}
