import type { SVGProps } from "react";

/**
 * Crafted SVG icon set — replaces emoji affordances across the app so the UI
 * reads as a designed marketplace, not a starter template. All icons are 24×24,
 * inherit `currentColor`, and take standard SVG props (className, aria, …).
 * Stroke icons share 1.75 weight + round joins for a single, coherent voice.
 */

type IconProps = SVGProps<SVGSVGElement>;

const strokeBase = {
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Wishlist heart. `filled` swaps outline → solid for the saved state. */
export function HeartIcon({
  filled = false,
  ...props
}: IconProps & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <path d="M12 20.5S3.5 15.2 3.5 9.3A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 8.5 2.3c0 5.9-8.5 11.2-8.5 11.2Z" />
    </svg>
  );
}

/** Dismiss / not-interested. */
export function CloseIcon(props: IconProps) {
  return (
    <svg {...strokeBase} {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

/** Outbound link — "view on <marketplace>". */
export function ArrowUpRightIcon(props: IconProps) {
  return (
    <svg {...strokeBase} {...props}>
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  );
}

/** Agent / AI mark — a four-point spark. Replaces the 🤖 emoji. */
export function SparkIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 2c.5 3.9 2.1 5.5 6 6-3.9.5-5.5 2.1-6 6-.5-3.9-2.1-5.5-6-6 3.9-.5 5.5-2.1 6-6Z" />
      <path d="M18.5 13c.28 1.9 1.05 2.7 3 3-1.95.3-2.72 1.1-3 3-.28-1.9-1.05-2.7-3-3 1.95-.3 2.72-1.1 3-3Z" opacity={0.55} />
    </svg>
  );
}

/** Downward price trend — replaces the "↓" glyph on drop badges. */
export function TrendDownIcon(props: IconProps) {
  return (
    <svg {...strokeBase} {...props}>
      <path d="M4 7l6.5 6.5L14 10l6 6" />
      <path d="M20 11.5V16h-4.5" />
    </svg>
  );
}

/** Search — shared magnifier. */
export function SearchIcon(props: IconProps) {
  return (
    <svg {...strokeBase} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-4-4" />
    </svg>
  );
}

/** Generic listing / bag — empty states and image fallbacks. */
export function BagIcon(props: IconProps) {
  return (
    <svg {...strokeBase} {...props}>
      <path d="M6 8h12l-1 12H7L6 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
