import { FeedGrid } from "@/components/listings/FeedGrid";
import { getFeedListings } from "@/lib/listings";
import { DEMO_USER_ID } from "@/lib/demo-user";

// The feed reads live data from CockroachDB on every request.
export const dynamic = "force-dynamic";

export default async function Home() {
  const listings = await getFeedListings(DEMO_USER_ID);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <header className="border-b border-zinc-200 bg-white px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex w-full max-w-5xl items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
            MarketFetch
          </h1>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {listings.length} listings
          </span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <FeedGrid initialItems={listings} />
      </main>
    </div>
  );
}
