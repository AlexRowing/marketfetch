import Link from "next/link";
import { redirect } from "next/navigation";
import { FeedGrid } from "@/components/listings/FeedGrid";
import { DealsBrief } from "@/components/listings/DealsBrief";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  countFeedListings,
  getFeedCategories,
  getFeedListings,
} from "@/lib/listings";
import { getDealsForUser } from "@/lib/deals";
import { getSessionUser } from "@/lib/auth";

// The feed reads live data from CockroachDB on every request.
export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  // First taste-ranked page; FeedGrid pulls the rest via /api/listings.
  // Deals brief is the agent's proactive pick, computed over the whole catalog.
  const [listings, total, categories, deals] = await Promise.all([
    getFeedListings(user.id),
    countFeedListings(user.id),
    getFeedCategories(user.id),
    getDealsForUser(user.id),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <PageHeader maxWidth="max-w-5xl" user={user}>
        <nav className="flex items-center gap-3 text-sm">
          <span className="hidden rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-500 sm:inline-block dark:bg-zinc-900 dark:text-zinc-400">
            {total} listings
          </span>
          <Link
            href="/preferences"
            className="font-medium text-zinc-600 transition-colors hover:text-brand-600 dark:text-zinc-300 dark:hover:text-brand-400"
          >
            Preferences
          </Link>
        </nav>
      </PageHeader>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="mb-7">
          <h1 className="text-3xl font-semibold tracking-tight text-balance text-black dark:text-zinc-50">
            Your feed
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
            Deals ranked by your taste — the agent surfaces what&apos;s worth acting on.
          </p>
        </div>
        <DealsBrief deals={deals} />
        <FeedGrid
          initialItems={listings}
          initialTotal={total}
          categories={categories}
        />
      </main>
    </div>
  );
}
