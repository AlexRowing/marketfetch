import { Skeleton } from "@/components/ui/Skeleton";

/** Placeholder matching ListingCard's shape, shown while the feed loads. */
export function ListingCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <Skeleton className="aspect-square rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="mt-2 flex items-center justify-between">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </div>
  );
}
