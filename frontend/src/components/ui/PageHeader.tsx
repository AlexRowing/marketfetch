import type { ReactNode } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/ui/BrandMark";
import { PrimaryNav } from "@/components/ui/PrimaryNav";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { UserMenu } from "@/components/ui/UserMenu";
import type { SessionUser } from "@/lib/auth";

/**
 * Shared app header: brand mark + primary tab nav on the left, page-specific
 * content + account controls on the right. Sticky + blurred so it stays present
 * while scrolling. The bar is a fixed width on every page (independent of the
 * page's own content width) so the logo and tabs never shift between routes.
 */
export function PageHeader({
  user,
  children,
}: {
  /** Logged-in user; pages pass it so the header shows the account menu. */
  user?: SessionUser | null;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-canvas/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-5">
          <BrandMark />
          <PrimaryNav />
        </div>
        <div className="flex items-center gap-3">
          {children}
          <ThemeToggle />
          {user ? (
            <UserMenu displayName={user.displayName} />
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
