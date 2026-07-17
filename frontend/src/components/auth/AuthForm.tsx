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
        setError(data?.error ?? "Something went wrong - try again.");
        return;
      }
      // Full refresh so every server component re-renders with the session.
      router.push("/");
      router.refresh();
    } catch {
      setError("Couldn't reach the server - try again.");
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    "w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25";

  return (
    <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-sm">
      {/* Mode switch */}
      <div className="mb-5 flex rounded-lg border border-line p-0.5">
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
                ? "bg-ink text-canvas"
                : "text-ink-muted hover:text-ink"
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
          className="mt-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-ink-soft">
        {mode === "login"
          ? "The agent remembers your taste, saves, and budgets."
          : "Your Buyer Memory starts fresh - teach it in Preferences."}
      </p>
    </div>
  );
}
