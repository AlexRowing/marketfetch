import type { ReactNode } from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/**
 * Shared app header: brand mark on the left (links home), page-specific content
 * on the right. Sticky + blurred so it stays present while scrolling.
 *
 * `maxWidth` matches the page's main content width — the feed is wider
 * (max-w-5xl) than the focused secondary pages (max-w-3xl).
 */
export function PageHeader({
  maxWidth = "max-w-3xl",
  children,
}: {
  maxWidth?: string;
  children?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div
        className={`mx-auto flex w-full ${maxWidth} items-center justify-between px-6 py-3.5`}
      >
        <BrandMark />
        <div className="flex items-center gap-3">
          {children}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
