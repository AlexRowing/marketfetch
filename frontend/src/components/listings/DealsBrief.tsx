import Link from "next/link";
import { ListingImage } from "@/components/listings/ListingImage";
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
    <section className="mb-8 rounded-2xl border border-brand-100 bg-brand-50/50 p-4 dark:border-brand-700/40 dark:bg-brand-700/5 sm:p-5">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-brand-700 dark:text-brand-300">
          <span aria-hidden>🤖</span> Deals for you
        </h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          the agent found these in your feed, priced to move
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
    <Link
      href={`/listings/${deal.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg hover:shadow-brand-500/5 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-brand-700/60"
    >
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-linear-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950">
        <ListingImage
          imageUrl={deal.imageUrl}
          category={deal.category}
          alt={deal.title}
        />
        {drop !== null && (
          <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-1 text-xs font-semibold text-white shadow-sm">
            ↓ {drop}%
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {deal.title}
        </h3>
        <span className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {formatPrice(deal.currentPrice, deal.currency)}
        </span>
        <p className="mt-1 text-xs font-medium leading-4 text-brand-700 dark:text-brand-300">
          {deal.reason}
        </p>
      </div>
    </Link>
  );
}
