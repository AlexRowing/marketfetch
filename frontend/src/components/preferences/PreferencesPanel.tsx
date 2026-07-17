"use client";

import { useState } from "react";
import type { Preference } from "@/lib/preferences";
import type { PreferenceKind } from "@/types";
import { CloseIcon, SparkIcon } from "@/components/ui/icons";

const SECTIONS: {
  kind: PreferenceKind;
  title: string;
  /** One-line description shown under the title. */
  note: string;
  hint: string;
  /** Common values offered as one-click chips (budgets pre-fill the category). */
  suggestions: string[];
}[] = [
  {
    kind: "brand",
    title: "Brands & makers",
    note: "Labels, makers, or artists you look for, in any category.",
    hint: "e.g. Carhartt, Sony, Blue Note",
    suggestions: [
      "Carhartt",
      "Nike",
      "Sony",
      "Apple",
      "Levi's",
      "Fender",
      "New Balance",
      "Nikon",
      "Uniqlo",
      "IKEA",
    ],
  },
  {
    kind: "category_budget",
    title: "Budgets",
    note: "Set a ceiling per category so the agent flags what's in range.",
    hint: "category",
    suggestions: [
      "Vinyl",
      "Records",
      "Electronics",
      "Books",
      "Cameras",
      "Sneakers",
      "Jackets",
      "Homeware",
    ],
  },
  {
    kind: "color",
    title: "Colours",
    note: "Optional. Colours or finishes you gravitate toward.",
    hint: "e.g. black, navy, walnut",
    suggestions: ["Black", "White", "Navy", "Green", "Brown", "Beige", "Grey", "Silver"],
  },
  {
    kind: "size",
    title: "Sizes",
    note: "Only relevant if you shop for clothing or shoes.",
    hint: "e.g. M, 42, W32",
    suggestions: ["XS", "S", "M", "L", "XL", "W30", "W32", "W34", "41", "42", "43"],
  },
];

async function postPreference(
  kind: PreferenceKind,
  value: string,
  numericValue: number | null
): Promise<string> {
  const res = await fetch("/api/preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind, value, numericValue }),
  });
  if (!res.ok) throw new Error(`add failed: ${res.status}`);
  const data = await res.json();
  return data.id;
}

async function deletePreference(id: string) {
  const res = await fetch("/api/preferences", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  if (!res.ok) throw new Error(`delete failed: ${res.status}`);
}

function Chip({ pref, onRemove }: { pref: Preference; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface py-1 pl-3 pr-1.5 text-sm text-ink shadow-sm">
      {pref.value}
      {pref.numericValue !== null && (
        <span className="text-ink-muted">€{pref.numericValue}</span>
      )}
      {pref.source === "inferred" && (
        <span title="Learned by the agent" className="flex items-center">
          <SparkIcon className="h-3.5 w-3.5 text-brand-500 dark:text-brand-400" />
        </span>
      )}
      <button
        type="button"
        aria-label={`Remove ${pref.value}`}
        onClick={onRemove}
        className="flex h-5 w-5 items-center justify-center rounded-full text-ink-soft hover:bg-surface-2 hover:text-ink"
      >
        <CloseIcon className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

function Section({
  kind,
  title,
  note,
  hint,
  suggestions,
  prefs,
  onAdd,
  onRemove,
}: {
  kind: PreferenceKind;
  title: string;
  note: string;
  hint: string;
  suggestions: string[];
  prefs: Preference[];
  onAdd: (kind: PreferenceKind, value: string, numericValue: number | null) => void;
  onRemove: (pref: Preference) => void;
}) {
  const [value, setValue] = useState("");
  const [amount, setAmount] = useState("");
  const isBudget = kind === "category_budget";

  const submit = () => {
    const v = value.trim();
    if (!v) return;
    const n = isBudget ? Number(amount) : null;
    if (isBudget && (!amount || Number.isNaN(n) || n! <= 0)) return;
    onAdd(kind, v, n);
    setValue("");
    setAmount("");
  };

  // Hide suggestions the user has already added (case-insensitive).
  const taken = new Set(prefs.map((p) => p.value.toLowerCase()));
  const openSuggestions = suggestions.filter((s) => !taken.has(s.toLowerCase()));

  // A suggestion click adds directly - except budgets, which still need an
  // amount, so it pre-fills the category input for the user to complete.
  const pickSuggestion = (s: string) => {
    if (isBudget) setValue(s);
    else onAdd(kind, s, null);
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <h2 className="font-serif text-lg font-semibold tracking-tight text-ink">
        {title}
      </h2>
      <p className="mt-0.5 text-xs text-ink-soft">{note}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {prefs.length === 0 && (
          <p className="text-sm text-ink-soft">Nothing yet.</p>
        )}
        {prefs.map((p) => (
          <Chip key={p.id} pref={p} onRemove={() => onRemove(p)} />
        ))}
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={hint}
          aria-label={`Add ${title.toLowerCase()}`}
          className="w-40 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-soft focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        />
        {isBudget && (
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="€ max"
            inputMode="decimal"
            aria-label="Budget amount"
            className="w-20 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-ink-soft focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
          />
        )}
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          Add
        </button>
      </form>
      {openSuggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-ink-soft">
            {isBudget ? "Set budget for:" : "Suggestions:"}
          </span>
          {openSuggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => pickSuggestion(s)}
              aria-label={
                isBudget ? `Set budget for ${s}` : `Add ${s} to ${title.toLowerCase()}`
              }
              className="rounded-full border border-dashed border-line-strong px-2.5 py-1 text-xs text-ink-muted transition-colors hover:border-solid hover:border-brand-400 hover:bg-surface-2 hover:text-ink"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function PreferencesPanel({ initial }: { initial: Preference[] }) {
  const [prefs, setPrefs] = useState(initial);

  const add = (
    kind: PreferenceKind,
    value: string,
    numericValue: number | null
  ) => {
    const tempId = `tmp-${Date.now()}`;
    const optimistic: Preference = {
      id: tempId,
      kind,
      value,
      numericValue,
      source: "explicit",
    };
    setPrefs((list) => [...list, optimistic]);
    postPreference(kind, value, numericValue)
      .then((id) =>
        setPrefs((list) =>
          list.map((p) => (p.id === tempId ? { ...p, id } : p))
        )
      )
      .catch(() =>
        setPrefs((list) => list.filter((p) => p.id !== tempId))
      );
  };

  const remove = (pref: Preference) => {
    setPrefs((list) => list.filter((p) => p.id !== pref.id));
    deletePreference(pref.id).catch(() =>
      setPrefs((list) => [...list, pref])
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {SECTIONS.map((s) => (
        <Section
          key={s.kind}
          {...s}
          prefs={prefs.filter((p) => p.kind === s.kind)}
          onAdd={add}
          onRemove={remove}
        />
      ))}
    </div>
  );
}
