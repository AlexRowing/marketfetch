"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ArrowUpRightIcon, CloseIcon, SparkIcon } from "@/components/ui/icons";

/**
 * Floating agent chat, mounted app-wide in the root layout so the agent is
 * reachable from any page. Shares state with the full-page /chat view via
 * ChatPanel's localStorage persistence, so the conversation stays in sync.
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // The dedicated /chat page already renders a full-height ChatPanel - a
  // floating copy on top of it would be redundant. No agent before login.
  if (pathname === "/chat" || pathname === "/login") return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[70vh] max-h-[600px] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-line bg-canvas shadow-2xl shadow-ink/10">
          <header className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
                <SparkIcon className="h-4 w-4" />
              </span>
              <div className="leading-none">
                <h2 className="font-serif text-[15px] font-semibold text-ink">
                  Agent
                </h2>
                <p className="mt-1 text-[11px] text-ink-soft">
                  Knows your taste &amp; prices
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href="/chat"
                aria-label="Open full-page chat"
                title="Open full page"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft hover:bg-surface-2 hover:text-ink"
              >
                <ArrowUpRightIcon className="h-4 w-4" />
              </Link>
              <button
                type="button"
                aria-label="Close chat"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft hover:bg-surface-2 hover:text-ink"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
          </header>
          <div className="flex min-h-0 flex-1 flex-col px-4">
            <ChatPanel />
          </div>
        </div>
      )}
      <button
        type="button"
        aria-label={open ? "Minimize chat" : "Chat with the agent"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-13 w-13 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition-all hover:scale-105 hover:bg-brand-700"
      >
        {open ? (
          // chevron down (minimize)
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
            <path
              d="m6 10 6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          // chat bubble
          <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none" aria-hidden>
            <path
              d="M12 3.5c4.97 0 9 3.53 9 7.9 0 4.36-4.03 7.9-9 7.9-.94 0-1.85-.13-2.7-.36L5 20.5l.83-3.3C4.4 15.83 3 13.9 3 11.4c0-4.37 4.03-7.9 9-7.9Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <circle cx="8.5" cy="11.5" r="1" fill="currentColor" />
            <circle cx="12" cy="11.5" r="1" fill="currentColor" />
            <circle cx="15.5" cy="11.5" r="1" fill="currentColor" />
          </svg>
        )}
      </button>
    </div>
  );
}
