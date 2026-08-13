"use client";

import { useState } from "react";
import { HeartIcon } from "@/components/ui/icons";

/** Save/unsave toggle for the listing detail page - mirrors the feed card's heart. */
export function SaveToggleButton({
  listingId,
  initialSaved,
}: {
  listingId: string;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (busy) return;
    const next = !saved;
    setSaved(next);
    setBusy(true);
    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, kind: next ? "save" : "unsave" }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      setSaved(!next);
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium shadow-sm transition-colors ${
        saved
          ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-800/40 dark:bg-brand-500/[0.08] dark:text-brand-400"
          : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink"
      }`}
    >
      <HeartIcon filled={saved} className="h-4 w-4" />
      {saved ? "Saved" : "Save"}
    </button>
  );
}
