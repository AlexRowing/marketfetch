"use client";

import { useState } from "react";
import type { Preference } from "@/lib/preferences";
import type { PreferenceKind } from "@/types";

const SECTIONS: {
  kind: PreferenceKind;
  title: string;
  hint: string;
  /** Common values offered as one-click chips (budgets pre-fill the category). */
  suggestions: string[];
}[] = [
  {
    kind: "brand",
    title: "Brands",
    hint: "e.g. Carhartt",
    suggestions: [
      "Carhartt",
      "Nike",
      "Levi's",
      "The North Face",
      "Patagonia",
      "Adidas",
      "Dr. Martens",
      "Uniqlo",
      "New Balance",
      "Ralph Lauren",
    ],
  },
  {
    kind: "size",
    title: "Sizes",
    hint: "e.g. M, 42, W32 L32",
    suggestions: ["XS", "S", "M", "L", "XL", "W30", "W32", "W34", "41", "42", "43"],
  },
  {
    kind: "color",
    title: "Colors",
    hint: "e.g. black",
    suggestions: ["Black", "White", "Grey", "Navy", "Blue", "Green", "Brown", "Beige", "Cream"],
  },
  {
    kind: "category_budget",
    title: "Budgets",
    hint: "category",
    suggestions: ["Jackets", "Jeans", "Sneakers", "Shoes", "Fleeces", "Shirts", "Accessories"],
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
    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white py-1 pl-3 pr-1.5 text-sm text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
      {pref.value}
      {pref.numericValue !== null && (
        <span className="text-zinc-500 dark:text-zinc-400">
          €{pref.numericValue}
        </span>
      )}
      {pref.source === "inferred" && (
        <span
          title="Learned by the agent"
          className="text-xs text-zinc-400 dark:text-zinc-500"
        >
          ✨
        </span>
      )}
      <button
        type="button"
        aria-label={`Remove ${pref.value}`}
        onClick={onRemove}
        className="flex h-5 w-5 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        ✕
      </button>
    </span>
  );
}

function Section({
  kind,
  title,
  hint,
  suggestions,
  prefs,
  onAdd,
  onRemove,
}: {
  kind: PreferenceKind;
  title: string;
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

  // A suggestion click adds directly — except budgets, which still need an
  // amount, so it pre-fills the category input for the user to complete.
  const pickSuggestion = (s: string) => {
    if (isBudget) setValue(s);
    else onAdd(kind, s, null);
  };

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
        {title}
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {prefs.length === 0 && (
          <p className="text-sm text-zinc-400 dark:text-zinc-500">
            Nothing yet.
          </p>
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
          className="w-40 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        {isBudget && (
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="€ max"
            inputMode="decimal"
            aria-label="Budget amount"
            className="w-20 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        )}
        <button
          type="submit"
          className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Add
        </button>
      </form>
      {openSuggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
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
              className="rounded-full border border-dashed border-zinc-300 px-2.5 py-1 text-xs text-zinc-500 transition-colors hover:border-solid hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-800 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
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
