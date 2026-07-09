"use client";

import { useState } from "react";
import type { PricePoint } from "@/lib/listings";

const W = 640;
const H = 220;
const PAD = { top: 16, right: 72, bottom: 28, left: 44 };

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IE", {
    day: "numeric",
    month: "short",
  });
}

/**
 * Single-series price line in the brand accent (brand-600 light / brand-400
 * dark), matching the app's indigo; 2px line, 8px markers with a surface ring,
 * per-point hover tooltip, direct label on the latest price only.
 */
export function PriceHistoryChart({
  points,
  currency,
}: {
  points: PricePoint[];
  currency: string;
}) {
  const [hover, setHover] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Only one price recorded so far — history builds as the tracker sees
        this listing again.
      </p>
    );
  }

  const prices = points.map((p) => p.price);
  const times = points.map((p) => new Date(p.capturedAt).getTime());
  const firstP = prices[0];
  const maxP = Math.max(...prices);
  // Fixed, honest scale: 0 at the bottom, the starting price dead-center,
  // double the starting price at the top — so a 5% drop looks like 5%, not a
  // cliff. Only expands if the price ever rises past 2x (keeps the line on
  // the chart).
  const yLo = 0;
  const yHi = Math.max(firstP * 2, maxP * 1.05);
  const minT = times[0];
  const spanT = times[times.length - 1] - minT || 1;

  const x = (t: number) => PAD.left + ((t - minT) / spanT) * (W - PAD.left - PAD.right);
  const y = (p: number) => PAD.top + ((yHi - p) / (yHi - yLo)) * (H - PAD.top - PAD.bottom);

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(times[i]).toFixed(1)},${y(p.price).toFixed(1)}`)
    .join(" ");

  // Quarter gridlines convey the scale; the starting price gets its own dashed
  // reference line, so drop any quarter line it would sit on top of.
  const gridPrices = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => f * yHi)
    .filter((gp) => Math.abs(gp - firstP) > yHi * 0.01);
  const last = points.length - 1;

  return (
    <figure>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full text-brand-600 dark:text-brand-400"
          role="img"
          aria-label={`Price history: ${points.length} snapshots from ${formatPrice(points[0].price, currency)} to ${formatPrice(points[last].price, currency)}`}
        >
          {/* recessive grid + tick labels */}
          {gridPrices.map((gp, i) => (
            <g key={i}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(gp)}
                y2={y(gp)}
                className="stroke-zinc-200 dark:stroke-zinc-800"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={y(gp) + 4}
                textAnchor="end"
                className="fill-zinc-400 text-[11px] [font-variant-numeric:tabular-nums] dark:fill-zinc-500"
              >
                {Math.round(gp)}
              </text>
            </g>
          ))}
          {/* starting-price reference: dashed, sits mid-chart by construction */}
          <g>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(firstP)}
              y2={y(firstP)}
              strokeDasharray="4 4"
              className="stroke-zinc-300 dark:stroke-zinc-700"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 8}
              y={y(firstP) + 4}
              textAnchor="end"
              className="fill-zinc-500 text-[11px] font-medium [font-variant-numeric:tabular-nums] dark:fill-zinc-400"
            >
              {Math.round(firstP)}
            </text>
          </g>
          {/* x labels: first and last snapshot dates */}
          <text
            x={x(times[0])}
            y={H - 8}
            textAnchor="start"
            className="fill-zinc-400 text-[11px] dark:fill-zinc-500"
          >
            {formatDate(points[0].capturedAt)}
          </text>
          <text
            x={x(times[last])}
            y={H - 8}
            textAnchor="end"
            className="fill-zinc-400 text-[11px] dark:fill-zinc-500"
          >
            {formatDate(points[last].capturedAt)}
          </text>

          <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />

          {points.map((p, i) => (
            <g key={p.capturedAt}>
              <circle
                cx={x(times[i])}
                cy={y(p.price)}
                r="4"
                fill="currentColor"
                className="stroke-white dark:stroke-zinc-950"
                strokeWidth="2"
              />
              {/* oversized hit target for the tooltip */}
              <circle
                cx={x(times[i])}
                cy={y(p.price)}
                r="14"
                fill="transparent"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            </g>
          ))}

          {/* direct label: latest price only */}
          <text
            x={x(times[last]) + 10}
            y={y(points[last].price) + 4}
            className="fill-zinc-900 text-[13px] font-semibold dark:fill-zinc-100"
          >
            {formatPrice(points[last].price, currency)}
          </text>
        </svg>

        {hover !== null && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-zinc-900 px-2 py-1 text-xs text-white shadow dark:bg-zinc-100 dark:text-zinc-900"
            style={{
              left: `${(x(times[hover]) / W) * 100}%`,
              top: `${(y(points[hover].price) / H) * 100 - 4}%`,
            }}
          >
            {formatPrice(points[hover].price, currency)} ·{" "}
            {formatDate(points[hover].capturedAt)}
          </div>
        )}
      </div>

      {/* table view of the same data for screen readers */}
      <table className="sr-only">
        <caption>Price history</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.capturedAt}>
              <td>{formatDate(p.capturedAt)}</td>
              <td>{formatPrice(p.price, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
