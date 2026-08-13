"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Feed" },
  { href: "/saved", label: "Saved" },
  { href: "/preferences", label: "Preferences" },
  { href: "/chat", label: "Chat" },
] as const;

/**
 * Top-level tab nav, rendered inside PageHeader so it's present on every page -
 * you can jump between Feed / Saved / Preferences / Chat from anywhere without
 * routing home first. The current tab is highlighted.
 */
export function PrimaryNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-3 text-sm sm:gap-4">
      {LINKS.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`font-medium transition-colors hover:text-brand-600 ${
              active ? "text-brand-600" : "text-ink-muted"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
