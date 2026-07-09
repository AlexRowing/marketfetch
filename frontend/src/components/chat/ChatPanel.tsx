"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "agent";
  text: string;
  /** Number of memory queries the agent ran to produce this reply. */
  toolCallCount?: number;
  /** Error placeholders are shown in the UI but kept out of agent history. */
  isError?: boolean;
}

const STORAGE_KEY = "marketfetch.chat";
const GREETING: Message = {
  role: "agent",
  text: "Hi! Ask me about deals — I remember your preferences, saves, and the price history of every listing I've seen.",
};

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  // Gate persistence until the saved conversation is restored, so the default
  // greeting never clobbers real history in storage on first render.
  const [hydrated, setHydrated] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Keep the newest message in view: on restore, on every new message, and
  // when the thinking indicator appears. Scrolls the list itself (not
  // scrollIntoView) so the surrounding page never jumps.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy, hydrated]);

  // Restore a saved conversation on mount (client-only — no SSR hydration mismatch).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        // Keep only well-formed messages — a corrupt entry would crash the render.
        const valid = Array.isArray(parsed)
          ? (parsed as Message[]).filter(
              (m) =>
                (m?.role === "user" || m?.role === "agent") &&
                typeof m?.text === "string",
            )
          : [];
        // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is client-only; restoring in a mount effect is what avoids an SSR hydration mismatch
        if (valid.length > 0) setMessages(valid);
      }
    } catch {
      // ignore corrupt or unavailable storage
    }
    setHydrated(true);
  }, []);

  // Persist the conversation whenever it changes, after the initial restore.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore quota or unavailable storage
    }
  }, [messages, hydrated]);

  const clearChat = () => {
    setMessages([GREETING]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    // Prior turns, in the {role, content} shape the agent expects.
    const history = messages
      .filter((m) => !m.isError)
      .map((m) => ({
        role: m.role === "agent" ? ("assistant" as const) : ("user" as const),
        content: m.text,
      }));
    setMessages((m) => [...m, { role: "user", text }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "agent",
          text: res.ok ? data.reply : "Something went wrong — try again.",
          toolCallCount: res.ok ? (data.toolCalls?.length ?? 0) : undefined,
          isError: !res.ok,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "agent",
          text: "Couldn't reach the agent — try again.",
          isError: true,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    // min-h-0 lets this shrink inside a bounded container (the popup widget),
    // so the message list scrolls and the input form stays pinned + visible.
    <div className="flex min-h-0 flex-1 flex-col">
      {messages.length > 1 && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={clearChat}
            disabled={busy}
            className="text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-50 dark:text-zinc-500 dark:hover:text-zinc-200"
          >
            Clear chat
          </button>
        </div>
      )}
      <div
        ref={listRef}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto py-4"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] ${m.role === "user" ? "self-end" : "self-start"}`}
          >
            <div
              className={`rounded-2xl px-4 py-2 text-sm leading-6 ${
                m.role === "user"
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-200 bg-white text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
              }`}
            >
              {m.text}
            </div>
            {m.role === "agent" && (m.toolCallCount ?? 0) > 0 && (
              <p className="mt-1 pl-2 text-xs text-zinc-400 dark:text-zinc-500">
                🧠 queried memory {m.toolCallCount}×
              </p>
            )}
          </div>
        ))}
        {busy && (
          <div className="self-start rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-500">
            thinking…
          </div>
        )}
      </div>
      <form
        className="flex gap-2 border-t border-zinc-200 py-4 dark:border-zinc-800"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Find me a Carhartt jacket under €60…"
          aria-label="Message the agent"
          className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Send
        </button>
      </form>
    </div>
  );
}
