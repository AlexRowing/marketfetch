"use client";

import { useRef, useState } from "react";

interface Message {
  role: "user" | "agent";
  text: string;
}

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "agent",
      text: "Hi! Ask me about deals — I remember your preferences, saves, and the price history of every listing I've seen.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "agent", text: res.ok ? data.reply : "Something went wrong — try again." },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "agent", text: "Couldn't reach the agent — try again." },
      ]);
    } finally {
      setBusy(false);
      queueMicrotask(() =>
        endRef.current?.scrollIntoView({ behavior: "smooth" })
      );
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto py-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-6 ${
              m.role === "user"
                ? "self-end bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "self-start border border-zinc-200 bg-white text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
            }`}
          >
            {m.text}
          </div>
        ))}
        {busy && (
          <div className="self-start rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-500">
            thinking…
          </div>
        )}
        <div ref={endRef} />
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
