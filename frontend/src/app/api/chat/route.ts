import { NextResponse } from "next/server";
import { runAgent } from "@/lib/agent";

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

  try {
    const result = await runAgent(message.trim(), history);
    return NextResponse.json(result);
  } catch (err) {
    console.error("agent error:", err);
    return NextResponse.json(
      { error: "agent failed — check server logs" },
      { status: 500 },
    );
  }
}
