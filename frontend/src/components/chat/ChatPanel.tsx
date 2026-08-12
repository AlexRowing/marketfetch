"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SparkIcon } from "@/components/ui/icons";

// Renders the small, safe subset of Markdown the agent actually produces:
// paragraphs, line breaks, **bold**, "- "/"1. " lists, and
// [label](/listings/id or https://…) links. No dangerouslySetInnerHTML
// anywhere - every node below is a real React element or a plain string, so
// there's no injection surface no matter what the model outputs.
//
// Verified against real model output (2026-08-19): under the current system
// prompt Claude never emits bold or lists, but a "go deeper" follow-up
// routinely comes back as 3-4 blank-line-separated paragraphs - which the
// previous single-pass renderer collapsed into one run-on block, since plain
// text nodes don't preserve whitespace in HTML. That's the paragraph-splitting
// logic below; bold/list support is defensive, cheap to keep once the
// block-level structure exists, and future-proofs against prompt changes.

// Matches a link OR a bold span, whichever comes first - one left-to-right
// scan keeps the two interleaved correctly instead of two passes fighting
// over overlapping ranges.
const INLINE_RE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  INLINE_RE.lastIndex = 0;
  while ((m = INLINE_RE.exec(text)) !== null) {
    const [full, linkLabel, href, boldText] = m;
    if (href !== undefined) {
      const internal = href.startsWith("/");
      const external = href.startsWith("http://") || href.startsWith("https://");
      if (!internal && !external) continue; // unsafe/relative href - leave as literal text
      if (m.index > last) nodes.push(text.slice(last, m.index));
      const className =
        "font-medium text-brand-600 underline underline-offset-2 hover:text-brand-700";
      nodes.push(
        internal ? (
          <Link key={`${keyPrefix}-${key++}`} href={href} className={className}>
            {linkLabel}
          </Link>
        ) : (
          <a
            key={`${keyPrefix}-${key++}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
          >
            {linkLabel}
          </a>
        ),
      );
      last = m.index + full.length;
    } else if (boldText !== undefined) {
      if (m.index > last) nodes.push(text.slice(last, m.index));
      nodes.push(
        <strong key={`${keyPrefix}-${key++}`} className="font-semibold text-ink">
          {boldText}
        </strong>,
      );
      last = m.index + full.length;
    }
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length > 0 ? nodes : [text];
}

const BULLET_LINE = /^[-*]\s+/;
const NUMBERED_LINE = /^\d+\.\s+/;

function renderMessage(text: string): ReactNode[] {
  const blocks = text.trim().split(/\n\s*\n/);
  return blocks.map((block, bi) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0 && lines.every((l) => BULLET_LINE.test(l))) {
      return (
        <ul key={bi} className={`list-disc space-y-1 pl-4 ${bi > 0 ? "mt-2" : ""}`}>
          {lines.map((l, li) => (
            <li key={li}>{renderInline(l.replace(BULLET_LINE, ""), `${bi}-${li}`)}</li>
          ))}
        </ul>
      );
    }
    if (lines.length > 0 && lines.every((l) => NUMBERED_LINE.test(l))) {
      return (
        <ol key={bi} className={`list-decimal space-y-1 pl-4 ${bi > 0 ? "mt-2" : ""}`}>
          {lines.map((l, li) => (
            <li key={li}>{renderInline(l.replace(NUMBERED_LINE, ""), `${bi}-${li}`)}</li>
          ))}
        </ol>
      );
    }
    return (
      <p key={bi} className={bi > 0 ? "mt-2" : undefined}>
        {lines.map((l, li) => (
          <span key={li}>
            {li > 0 && <br />}
            {renderInline(l, `${bi}-${li}`)}
          </span>
        ))}
      </p>
    );
  });
}

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
  text: "I watch the marketplace for you - jackets, jeans, sneakers, the lot - and I remember your taste, your saves, and every price I've seen. Ask me what's worth buying, or whether a listing is a good price.",
};

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  // Gate persistence until the saved conversation is restored, so the default
  // greeting never clobbers real history in storage on first render.
  const [hydrated, setHydrated] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
      // If the agent saved a preference this turn, re-rank the feed live so the
      // change is visible without a manual reload.
      const savedPref =
        res.ok &&
        Array.isArray(data.toolCalls) &&
        data.toolCalls.some(
          (c: { tool?: string }) => c.tool === "save_preference",
        );
      if (savedPref) router.refresh();
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
              {m.role === "agent" ? renderMessage(m.text) : m.text}
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
          placeholder="Find me a Carhartt jacket under $60…"
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
