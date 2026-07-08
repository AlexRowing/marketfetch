import Link from "next/link";
import { notFound } from "next/navigation";
import { PriceHistoryChart } from "@/components/listings/PriceHistoryChart";
import { getListingDetail } from "@/lib/listings";
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

  const deal =
    listing.deltaVsMarket !== null
      ? Math.round(listing.deltaVsMarket * 100)
      : null;

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-3xl items-baseline justify-between">
          <Link
            href="/"
            className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Feed
          </Link>
          {listing.isSaved && <span title="Saved">❤️ saved</span>}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            {listing.title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {[listing.brand, listing.size, listing.color, listing.condition]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        {/* Price Memory panel */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Price</p>
            <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {formatPrice(listing.currentPrice, listing.currency)}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Market avg (60d)
            </p>
            <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {listing.marketAvg60d !== null
                ? formatPrice(listing.marketAvg60d, listing.currency)
                : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Vs. market
            </p>
            <p
              className={`mt-1 text-xl font-semibold ${
                deal !== null && deal < 0
                  ? "text-[#006300] dark:text-[#0ca30c]"
                  : "text-zinc-900 dark:text-zinc-50"
              }`}
            >
              {deal === null ? "—" : deal < 0 ? `↓ ${-deal}% below` : `↑ ${deal}% above`}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Listed</p>
            <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              {listing.listingAgeDays}d ago
            </p>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
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
