import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";
import { getSessionUser } from "@/lib/auth";

// Agent turns routinely take 10-30s (several Bedrock + MCP round trips).
export const maxDuration = 60;

interface HistoryEntry {
  role: "user" | "assistant";
  content: string;
}

// The client stores the full conversation forever; cap what we replay to the
// model so long-lived chats don't make every turn slower and pricier.
const MAX_HISTORY = 20;

export async function POST(request: Request) {
  const user = await getSessionUser();
  // Guests can open the chat, but the agent's value is its memory of your
  // taste, saves, and prices - which needs an account. Answer as the agent
  // and nudge sign-in rather than running a memoryless turn.
  if (!user) {
    return NextResponse.json({
      reply:
        "You're chatting as a guest, so I can't save anything or recall your history yet. Log in and I'll remember your taste, saves, and the price history of everything I've seen. In the meantime, the whole feed is live to browse.",
      toolCalls: [],
    });
  }

  const body = await request.json().catch(() => null);
  const message: unknown = body?.message;
  const history: HistoryEntry[] = Array.isArray(body?.history)
    ? body.history
        .filter(
          (m: HistoryEntry) =>
            (m.role === "user" || m.role === "assistant") &&
            typeof m.content === "string",
        )
        .slice(-MAX_HISTORY)
    : [];

  if (typeof message !== "string" || message.trim() === "") {
    return NextResponse.json(
      { error: "expected { message: string, history?: {role, content}[] }" },
      { status: 400 },
    );
  }

  // Agent needs the CockroachDB MCP Server (its DB connection) configured.
  // When it isn't (e.g. env vars unset on a deploy), answer calmly as the agent
  // instead of surfacing a red error - the rest of the app still works.
  if (
    !process.env.CRDB_MCP_URL ||
    !process.env.CRDB_MCP_API_KEY ||
    !process.env.CRDB_MCP_CLUSTER_ID
  ) {
    return NextResponse.json({
      reply:
        "I can't reach my memory right now - my data connection isn't set up in this environment yet. Your feed, saved items, and deals all still work normally.",
      toolCalls: [],
    });
  }

  try {
    const result = await runAgent(message.trim(), history, user.id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("agent error:", err);
    return NextResponse.json(
      { error: "agent failed - check server logs" },
      { status: 500 },
    );
  }
}
