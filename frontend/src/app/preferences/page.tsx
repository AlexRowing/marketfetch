import Link from "next/link";
import { PreferencesPanel } from "@/components/preferences/PreferencesPanel";
import { getPreferences } from "@/lib/preferences";
import { DEMO_USER_ID } from "@/lib/demo-user";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const prefs = await getPreferences(DEMO_USER_ID);

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
          <h1 className="text-base font-semibold text-black dark:text-zinc-50">
            Buyer Memory
          </h1>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
          What the agent knows about you. Everything here is stored in
          CockroachDB and shapes your feed and recommendations — items marked ✨
          were learned from your activity.
        </p>
        <PreferencesPanel initial={prefs} />
      </main>
    </div>
  );
}
