import Link from "next/link";

/** Site-wide footer: mounted once in the root layout, below page content. */
export function Footer() {
  return (
    <footer className="border-t border-line bg-canvas">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-6 py-6 text-xs text-ink-soft sm:flex-row">
        <span>&copy; {new Date().getFullYear()} MarketFetch</span>
        <Link
          href="/privacy"
          className="underline underline-offset-2 hover:text-ink-muted"
        >
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}
