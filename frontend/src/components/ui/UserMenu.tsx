"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CHAT_STORAGE_KEY } from "@/components/chat/ChatPanel";

/** Logged-in user chip + sign-out, shown in the shared page header. */
export function UserMenu({ displayName }: { displayName: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      // Don't let one account's conversation carry over to the next sign-in.
      try {
        sessionStorage.removeItem(CHAT_STORAGE_KEY);
        localStorage.removeItem(CHAT_STORAGE_KEY);
      } catch {
        // ignore unavailable storage
      }
      router.push("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span
        title={displayName}
        className="hidden max-w-28 truncate text-sm font-medium text-zinc-600 sm:inline-block dark:text-zinc-300"
      >
        {displayName}
      </span>
      <button
        type="button"
        onClick={logout}
        disabled={busy}
        aria-label="Log out"
        title="Log out"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      >
        {/* door-with-arrow sign-out icon */}
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" aria-hidden>
          <path
            d="M14 6V5a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M9 12h11m0 0-3-3m3 3-3 3"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
