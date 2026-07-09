import { PageHeader } from "@/components/ui/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";

// Streamed instantly while a listing's detail + price history resolve.
export default function Loading() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <PageHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-8">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>

        {/* Price Memory panel */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <Skeleton className="h-3 w-24" />
          <div className="mt-3 flex items-center gap-4">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-7 w-36 rounded-full" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-4 border-t border-zinc-100 pt-4 dark:border-zinc-900">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </section>

        {/* Price history */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <Skeleton className="mb-3 h-4 w-28" />
          <Skeleton className="h-[220px] w-full" />
        </section>
      </main>
    </div>
  );
}
