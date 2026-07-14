import { redirect } from "next/navigation";
import { PreferencesPanel } from "@/components/preferences/PreferencesPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { getPreferences } from "@/lib/preferences";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function PreferencesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const prefs = await getPreferences(user.id);

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <PageHeader user={user}>
        <span className="text-sm font-medium text-zinc-400 dark:text-zinc-500">
          Buyer Memory
        </span>
      </PageHeader>
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
