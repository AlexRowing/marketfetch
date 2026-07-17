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
    <div className="flex flex-1 flex-col bg-canvas font-sans">
      <PageHeader user={user}>
        <span className="text-sm font-medium text-ink-muted">Buyer Memory</span>
      </PageHeader>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <header className="mb-8 border-b border-line pb-6">
          <h1 className="font-serif text-[2.25rem] font-semibold leading-[1.05] tracking-tight text-balance text-ink sm:text-[2.75rem]">
            Buyer Memory
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-muted">
            What the agent knows about you. Everything here shapes your feed and
            recommendations - items marked with a spark were learned from your
            activity.
          </p>
        </header>
        <PreferencesPanel initial={prefs} />
      </main>
    </div>
  );
}
