import Link from "next/link";

const LINKS = [
  { href: "/saved", label: "Saved" },
  { href: "/preferences", label: "Preferences" },
  { href: "/chat", label: "Chat" },
] as const;

/** Top-level nav shown next to the brand mark on the feed and Saved pages. */
export function PrimaryNav() {
  return (
    <nav className="flex items-center gap-4 text-sm">
      {LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="font-medium text-ink-muted transition-colors hover:text-brand-600"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
