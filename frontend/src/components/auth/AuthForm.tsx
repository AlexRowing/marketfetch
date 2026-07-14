"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";

/** Email+password sign-in / sign-up card. POSTs to /api/auth/*. */
export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "register" ? { email, password, displayName } : { email, password }
        ),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "Something went wrong — try again.");
        return;
      }
      // Full refresh so every server component re-renders with the session.
      router.push("/");
      router.refresh();
    } catch {
      setError("Couldn't reach the server — try again.");
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

  return (
    <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
      {/* Mode switch */}
      <div className="mb-5 flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-700">
        {(
          [
            ["login", "Log in"],
            ["register", "Sign up"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setMode(value);
              setError(null);
            }}
            aria-pressed={mode === value}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === value
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {mode === "register" && (
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Name"
            aria-label="Name"
            autoComplete="name"
            className={inputClass}
          />
        )}
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          aria-label="Email"
          type="email"
          required
          autoComplete="email"
          className={inputClass}
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "register" ? "Password (8+ characters)" : "Password"}
          aria-label="Password"
          type="password"
          required
          minLength={mode === "register" ? 8 : undefined}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          className={inputClass}
        />
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="mt-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-600"
        >
          {busy ? "…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-zinc-400 dark:text-zinc-500">
        {mode === "login"
          ? "The agent remembers your taste, saves, and budgets."
          : "Your Buyer Memory starts fresh — teach it in Preferences."}
      </p>
    </div>
  );
}
