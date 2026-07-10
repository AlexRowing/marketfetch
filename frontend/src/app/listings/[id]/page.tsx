import { notFound } from "next/navigation";
import { PriceHistoryChart } from "@/components/listings/PriceHistoryChart";
import { ListingImage } from "@/components/listings/ListingImage";
import { SourceBadgeLarge } from "@/components/listings/SourceBadge";
import { PageHeader } from "@/components/ui/PageHeader";
import { getListingDetail, MIN_SIMILAR } from "@/lib/listings";
import { formatSource } from "@/lib/format";
import { query } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/demo-user";

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

  const listing = await getListingDetail(id, DEMO_USER_ID).catch(() => null);
  if (!listing) notFound();

  // Viewing history is Buyer Memory signal — log it, don't block on failure.
  query(
    `INSERT INTO interactions (user_id, listing_id, kind) VALUES ($1, $2, 'view')`,
    [DEMO_USER_ID, listing.id]
  ).catch(() => {});

  // Deal verdict vs the median of embedding-similar listings. The % pill only
  // shows when the cohort is price-coherent (tight interquartile spread) —
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
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <PageHeader>
        {listing.isSaved && (
          <span
            title="Saved"
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 dark:text-zinc-500"
          >
            ❤️ Saved
          </span>
        )}
      </PageHeader>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
        {/* Hero photo — only once ingestion provides a real image URL. */}
        {listing.imageUrl && (
          <div className="group relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-linear-to-br from-zinc-50 to-zinc-100 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
            <ListingImage
              imageUrl={listing.imageUrl}
              category={listing.category}
              alt={listing.title}
            />
          </div>
        )}

        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            {listing.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {listing.source !== "seed" && (
              <SourceBadgeLarge source={listing.source} />
            )}
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              View on {formatSource(listing.source)}
              <span aria-hidden>↗</span>
            </a>
          )}
        </div>

        {/* Price Memory — lead with the current price and the deal verdict. */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">
            Price Memory
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {formatPrice(listing.currentPrice, listing.currency)}
            </span>
            {!listing.isActive && (
              <span className="inline-flex items-center rounded-full bg-zinc-900 px-3 py-1 text-sm font-semibold uppercase tracking-wide text-white dark:bg-zinc-100 dark:text-zinc-900">
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
                      : "bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
                }`}
              >
                {deal < 0
                  ? `↓ ${-deal}% below similar items`
                  : deal > 0
                    ? `↑ ${deal}% above similar items`
                    : "priced like similar items"}
              </span>
            )}
          </div>
          <dl className="mt-5 grid grid-cols-3 gap-4 border-t border-zinc-100 pt-4 dark:border-zinc-900">
            <div>
              <dt
                className="text-xs text-zinc-500 dark:text-zinc-400"
                title="Median price of the closest listings by AI similarity (sold items included)"
              >
                Similar items
              </dt>
              {cohortOk ? (
                <>
                  <dd className="mt-0.5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatPrice(similar.median, listing.currency)}
                  </dd>
                  <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                    {formatPrice(similar.p25, listing.currency)}–
                    {formatPrice(similar.p75, listing.currency)} ·{" "}
                    {similar.count} items
                  </p>
                </>
              ) : (
                <>
                  <dd className="mt-0.5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    —
                  </dd>
                  <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                    not enough similar listings yet
                  </p>
                </>
              )}
            </div>
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">
                Since listed
              </dt>
              <dd
                className={`mt-0.5 text-base font-semibold ${
                  sinceListed !== null && sinceListed < 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-zinc-900 dark:text-zinc-100"
                }`}
              >
                {sinceListed === null
                  ? "—"
                  : sinceListed < 0
                    ? `↓ ${-sinceListed}%`
                    : sinceListed > 0
                      ? `↑ ${sinceListed}%`
                      : "no change"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">Listed</dt>
              <dd className="mt-0.5 text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {listing.listingAgeDays}d ago
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Price history
          </h2>
          <PriceHistoryChart
            points={listing.priceHistory}
            currency={listing.currency}
          />
        </section>

        <section>
          <h2 className="mb-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Description
          </h2>
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            {listing.description || "No description."}
          </p>
        </section>
      </main>
    </div>
  );
}
