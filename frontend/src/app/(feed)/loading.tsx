import { PageHeader } from "@/components/ui/PageHeader";
import { ListingCardSkeleton } from "@/components/listings/ListingCardSkeleton";
import { Skeleton } from "@/components/ui/Skeleton";

// Streamed instantly while the feed's CockroachDB query resolves.
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <PageHeader maxWidth="max-w-5xl">
        <Skeleton className="h-5 w-24" />
      </PageHeader>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Your feed
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Deals ranked by your taste — the agent surfaces what&apos;s worth acting on.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}
