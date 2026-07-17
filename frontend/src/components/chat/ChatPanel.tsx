"use client";

import { useEffect, useRef, useState } from "react";
import { SparkIcon } from "@/components/ui/icons";

interface Message {
  role: "user" | "agent";
  text: string;
  /** Number of memory queries the agent ran to produce this reply. */
  toolCallCount?: number;
  /** Error placeholders are shown in the UI but kept out of agent history. */
  isError?: boolean;
}

// sessionStorage (not localStorage): the conversation survives reloads and
// navigation within a browsing session, but clears when the browser/tab closes
// - so it doesn't stick forever. Also cleared on logout (see UserMenu).
export const CHAT_STORAGE_KEY = "marketfetch.chat";
const GREETING: Message = {
  role: "agent",
  text: "Hi! Ask me about deals - I remember your preferences, saves, and the price history of every listing I've seen.",
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

  // Restore a saved conversation on mount (client-only - no SSR hydration mismatch).
  useEffect(() => {
    // Purge any history left in localStorage by older builds, which stuck forever.
    try {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    } catch {
      // ignore
    }
    try {
      const saved = sessionStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        // Keep only well-formed messages - a corrupt entry would crash the render.
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
      sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore quota or unavailable storage
    }
  }, [messages, hydrated]);

  const clearChat = () => {
    setMessages([GREETING]);
    try {
      sessionStorage.removeItem(CHAT_STORAGE_KEY);
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
          text: res.ok ? data.reply : "Something went wrong - try again.",
          toolCallCount: res.ok ? (data.toolCalls?.length ?? 0) : undefined,
          isError: !res.ok,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "agent",
          text: "Couldn't reach the agent - try again.",
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
            className="text-xs text-ink-soft hover:text-ink disabled:opacity-50"
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
              className={`rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                m.role === "user"
                  ? "bg-brand-600 text-white shadow-sm shadow-brand-600/20"
                  : "border border-line bg-surface text-ink shadow-sm"
              }`}
            >
              {m.text}
            </div>
            {m.role === "agent" && (m.toolCallCount ?? 0) > 0 && (
              <p className="mt-1 inline-flex items-center gap-1 pl-2 text-xs text-ink-soft">
                <SparkIcon className="h-3 w-3 text-brand-600" />
                queried memory {m.toolCallCount}×
              </p>
            )}
          </div>
        ))}
        {busy && (
          <div className="self-start rounded-2xl border border-line bg-surface px-4 py-2 text-sm text-ink-soft">
            thinking…
          </div>
        )}
      </div>
      <form
        className="flex gap-2 border-t border-line py-4"
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
          className="flex-1 rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink placeholder:text-ink-soft focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
