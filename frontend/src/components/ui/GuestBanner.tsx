import Link from "next/link";
import { SparkIcon } from "@/components/ui/icons";

/**
 * Shown to logged-out visitors: browsing works, but saving, preferences, and
 * chat memory need an account. A calm nudge, not a wall.
 */
export function GuestBanner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-brand-100 bg-brand-50/60 px-4 py-3 dark:border-brand-800/40 dark:bg-brand-500/[0.06] ${className}`}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
        <SparkIcon className="h-4 w-4" />
      </span>
      <p className="min-w-0 flex-1 text-sm text-ink-muted">
        You&apos;re browsing as a guest. Saves, preferences, and chat memory
        won&apos;t be kept.
      </p>
      <Link
        href="/login"
        className="shrink-0 rounded-full bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        Log in to save
      </Link>
    </div>
  );
}
