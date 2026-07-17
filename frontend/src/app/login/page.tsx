import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { BrandMark } from "@/components/ui/BrandMark";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/");

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-canvas px-6 py-12 font-sans">
      <div className="flex flex-col items-center gap-4 text-center">
        <BrandMark />
        <p className="max-w-xs font-serif text-lg italic leading-snug text-ink-muted">
          Your AI buying agent for second-hand marketplaces.
        </p>
      </div>
      <AuthForm />
    </div>
  );
}
