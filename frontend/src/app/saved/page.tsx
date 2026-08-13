import { SavedGrid } from "@/components/listings/SavedGrid";
import { PageHeader } from "@/components/ui/PageHeader";
import { GuestBanner } from "@/components/ui/GuestBanner";
import { getSavedListings } from "@/lib/listings";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const user = await getSessionUser();
  // Guests have nothing saved (saves don't persist for them) - skip the
  // query and just point them at logging in.
  const listings = user ? await getSavedListings(user.id) : [];

  return (
    <div className="flex flex-1 flex-col bg-canvas font-sans">
      <PageHeader user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <header className="mb-9 border-b border-line pb-6">
          <h1 className="font-serif text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-balance text-ink sm:text-5xl">
            Saved
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-muted">
            Everything you&apos;ve starred, most recently saved first - keep an eye
            on these and the agent will track the price for you.
          </p>
        </header>
        {!user ? (
          <GuestBanner className="mb-8" />
        ) : (
          <SavedGrid initialItems={listings} />
        )}
      </main>
    </div>
  );
}
