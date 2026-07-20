import { notFound } from "next/navigation";
import { PriceHistoryChart } from "@/components/listings/PriceHistoryChart";
import { ListingImage } from "@/components/listings/ListingImage";
import { SourceBadgeLarge } from "@/components/listings/SourceBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  ArrowUpRightIcon,
  HeartIcon,
  TrendDownIcon,
  TrendUpIcon,
} from "@/components/ui/icons";
import { getListingDetail, MIN_SIMILAR } from "@/lib/listings";
import { formatSource } from "@/lib/format";
import { query } from "@/lib/db";
import { getSessionUser, ANON_USER_ID } from "@/lib/auth";

export const dynamic = "force-dynamic";

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Public page: guests can view listings; only logged-in users get saved
  // state and have their view logged as Buyer Memory.
  const user = await getSessionUser();
  const viewerId = user?.id ?? ANON_USER_ID;

  const listing = await getListingDetail(id, viewerId).catch(() => null);
  if (!listing) notFound();

  // Viewing history is Buyer Memory signal - log it for real users only, and
  // don't block on failure.
  if (user) {
    query(
      `INSERT INTO interactions (user_id, listing_id, kind) VALUES ($1, $2, 'view')`,
      [user.id, listing.id]
    ).catch(() => {});
  }

  // Deal verdict vs the median of embedding-similar listings. The % pill only
  // shows when the cohort is price-coherent (tight interquartile spread) -
  // a vintage one-off among ordinary comparables gets the range instead of a
  // misleading "+650% above market".
  const similar = listing.similar;
  const cohortOk = similar !== null && similar.count >= MIN_SIMILAR;
  const spreadOk =
    cohortOk && (similar.p75 - similar.p25) / similar.median <= 0.5;
  const deal =
    spreadOk && listing.deltaVsMarket !== null
      ? Math.round(listing.deltaVsMarket * 100)
      : null;
  const sinceListed =
    listing.priceChangePct !== null
      ? Math.round(listing.priceChangePct * 100)
      : null;

  return (
    <div className="flex flex-1 flex-col bg-canvas font-sans">
      <PageHeader user={user}>
        {listing.isSaved && (
          <span
            title="Saved"
            className="flex items-center gap-1.5 text-sm font-medium text-ink-muted"
          >
            <HeartIcon filled className="h-4 w-4 text-brand-600" />
            Saved
          </span>
        )}
      </PageHeader>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-10">
        {/* Hero photo - only once ingestion provides a real image URL. */}
        {listing.imageUrl && (
          <div className="group relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-surface shadow-sm ring-1 ring-line">
            <ListingImage
              imageUrl={listing.imageUrl}
              category={listing.category}
              alt={listing.title}
            />
          </div>
        )}

        <div>
          <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-balance text-ink sm:text-[2.25rem]">
            {listing.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {listing.source !== "seed" && (
              <SourceBadgeLarge source={listing.source} />
            )}
            <p className="text-sm text-ink-muted">
              {[listing.brand, listing.size, listing.color, listing.condition]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          {listing.url && (
            <a
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-canvas shadow-sm transition-opacity hover:opacity-90"
            >
              View on {formatSource(listing.source)}
              <ArrowUpRightIcon className="h-4 w-4" strokeWidth={2} />
            </a>
          )}
        </div>

        {/* Price Memory - lead with the current price and the deal verdict. */}
        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-brand-600">
            Price Memory
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="font-serif text-[2.75rem] font-semibold leading-none tracking-tight text-ink">
              {formatPrice(listing.currentPrice, listing.currency)}
            </span>
            {!listing.isActive && (
              <span className="inline-flex items-center rounded-full bg-ink px-3 py-1 text-sm font-semibold uppercase tracking-wide text-canvas">
                Sold
              </span>
            )}
            {deal !== null && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ${
                  deal < 0
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                    : deal > 0
                      ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400"
                      : "bg-surface-2 text-ink-muted"
                }`}
              >
                {deal < 0 ? (
                  <>
                    <TrendDownIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
                    {-deal}% below similar items
                  </>
                ) : deal > 0 ? (
                  <>
                    <TrendUpIcon className="h-3.5 w-3.5" strokeWidth={2.25} />
                    {deal}% above similar items
                  </>
                ) : (
                  "priced like similar items"
                )}
              </span>
            )}
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-line pt-4">
            <div>
              <dt
                className="text-xs text-ink-muted"
                title="Median price of the closest listings by AI similarity (sold items included)"
              >
                Similar items
              </dt>
              {cohortOk ? (
                <>
                  <dd className="mt-0.5 text-base font-semibold text-ink">
                    {formatPrice(similar.median, listing.currency)}
                  </dd>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {formatPrice(similar.p25, listing.currency)}–
                    {formatPrice(similar.p75, listing.currency)} ·{" "}
                    {similar.count} items
                  </p>
                </>
              ) : (
                <>
                  <dd className="mt-0.5 text-base font-semibold text-ink">
                    -
                  </dd>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    not enough similar listings yet
                  </p>
                </>
              )}
            </div>
            <div>
              <dt className="text-xs text-ink-muted">
                Since listed
              </dt>
              <dd
                className={`mt-0.5 inline-flex items-center gap-1 text-base font-semibold ${
                  sinceListed !== null && sinceListed < 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-ink"
                }`}
              >
                {sinceListed === null ? (
                  "-"
                ) : sinceListed < 0 ? (
                  <>
                    <TrendDownIcon className="h-4 w-4" strokeWidth={2.25} />
                    {-sinceListed}%
                  </>
                ) : sinceListed > 0 ? (
                  <>
                    <TrendUpIcon className="h-4 w-4" strokeWidth={2.25} />
                    {sinceListed}%
                  </>
                ) : (
                  "no change"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Listed</dt>
              <dd className="mt-0.5 text-base font-semibold text-ink">
                {listing.listingAgeDays}d ago
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="mb-3 font-serif text-lg font-semibold tracking-tight text-ink">
            Price history
          </h2>
          <PriceHistoryChart
            points={listing.priceHistory}
            currency={listing.currency}
          />
        </section>

        <section>
          <h2 className="mb-2 font-serif text-lg font-semibold tracking-tight text-ink">
            Description
          </h2>
          <p className="max-w-prose text-sm leading-7 text-ink-muted">
            {listing.description || "No description."}
          </p>
        </section>
      </main>
    </div>
  );
}
