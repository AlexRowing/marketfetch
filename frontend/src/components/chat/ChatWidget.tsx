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
        className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-2xl text-white shadow-lg transition-transform hover:scale-105 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {open ? "⌄" : "💬"}
      </button>
    </div>
  );
}
