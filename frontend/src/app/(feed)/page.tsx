import { FeedGrid } from "@/components/listings/FeedGrid";
import { DailyBriefing } from "@/components/listings/DailyBriefing";
import { DealsBrief } from "@/components/listings/DealsBrief";
import { PageHeader } from "@/components/ui/PageHeader";
import { GuestBanner } from "@/components/ui/GuestBanner";
import {
  countFeedListings,
  getFeedCategories,
  getFeedListings,
} from "@/lib/listings";
import { getDealsForUser } from "@/lib/deals";
import { getBriefing } from "@/lib/briefing";
import { getSessionUser, ANON_USER_ID } from "@/lib/auth";

// The feed reads live data from CockroachDB on every request.
export const dynamic = "force-dynamic";

export default async function Home() {
  // The feed is public: logged-out visitors browse as guests (unpersonalized),
  // logged-in users get taste-ranking, saved state, and rejects.
  const user = await getSessionUser();
  const viewerId = user?.id ?? ANON_USER_ID;

  // First taste-ranked page; FeedGrid pulls the rest via /api/listings.
  // Deals + briefing are the agent's proactive read, computed over the catalog.
  const [listings, total, categories, deals, briefing] = await Promise.all([
    getFeedListings(viewerId),
    countFeedListings(viewerId),
    getFeedCategories(viewerId),
    getDealsForUser(viewerId),
    getBriefing(),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-canvas font-sans">
      <PageHeader maxWidth="max-w-5xl" user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <header className="mb-9 flex items-end justify-between gap-6 border-b border-line pb-6">
          <div className="animate-rise">
            <h1 className="font-serif text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-balance text-ink sm:text-5xl">
              {user ? "Your feed" : "The feed"}
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-muted">
              {user
                ? "The agent is watching the marketplace for you - ranked by your taste, with a read on every price."
                : "A live look at the marketplace the agent is tracking. Log in to rank it by your taste."}
            </p>
          </div>
          <span className="hidden shrink-0 pb-1 font-mono text-xs tracking-tight text-ink-soft sm:block">
            {total.toLocaleString("en-US")} listings
          </span>
        </header>
        {!user && <GuestBanner className="mb-8" />}
        <DailyBriefing briefing={briefing} deals={deals} personalised={!!user} />
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
