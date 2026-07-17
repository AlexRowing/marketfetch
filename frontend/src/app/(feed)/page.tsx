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
    <div className="flex flex-1 flex-col bg-canvas font-sans">
      <PageHeader maxWidth="max-w-5xl" user={user}>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/preferences"
            className="font-medium text-ink-muted transition-colors hover:text-brand-600"
          >
            Preferences
          </Link>
        </nav>
      </PageHeader>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <header className="mb-9 flex items-end justify-between gap-6 border-b border-line pb-6">
          <div className="animate-rise">
            <h1 className="font-serif text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-balance text-ink sm:text-5xl">
              Your feed
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-muted">
              Deals ranked by your taste - the agent surfaces what&apos;s worth
              acting on.
            </p>
          </div>
          <span className="hidden shrink-0 pb-1 font-mono text-xs tracking-tight text-ink-soft sm:block">
            {total.toLocaleString("en-IE")} listings
          </span>
        </header>
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
