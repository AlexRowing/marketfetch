"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChatPanel } from "@/components/chat/ChatPanel";

/**
 * Floating agent chat, mounted app-wide in the root layout so the agent is
 * reachable from any page. Shares state with the full-page /chat view via
 * ChatPanel's localStorage persistence, so the conversation stays in sync.
 */
export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // The dedicated /chat page already renders a full-height ChatPanel — a
  // floating copy on top of it would be redundant.
  if (pathname === "/chat") return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[70vh] max-h-[600px] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 shadow-xl dark:border-zinc-800 dark:bg-black">
          <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-2">
              <span aria-hidden className="text-base">
                🤖
              </span>
              <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
                Agent
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <Link
                href="/chat"
                aria-label="Open full-page chat"
                title="Open full page"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                ↗
              </Link>
              <button
                type="button"
                aria-label="Close chat"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              >
                ✕
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
        className="flex h-13 w-13 items-center justify-center rounded-full bg-zinc-900 text-white shadow-md shadow-zinc-900/20 transition-transform hover:scale-105 dark:bg-zinc-100 dark:text-zinc-900 dark:shadow-black/40"
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
