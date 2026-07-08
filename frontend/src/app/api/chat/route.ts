import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/demo-user";

/**
 * Agent chat seam — the contract Dev A and Dev B build against:
 *   POST { message: string }  →  { reply: string }
 *
 * STUB: answers from Buyer Memory with plain SQL until Dev B's Bedrock
 * agent (Claude + CockroachDB MCP Server) replaces the body of this
 * function. The request/response shape must not change.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const message: unknown = body?.message;
  if (typeof message !== "string" || message.trim() === "") {
    return NextResponse.json(
      { error: "expected { message: string }" },
      { status: 400 }
    );
  }

  const prefs = await query<{ kind: string; value: string }>(
    `SELECT kind, value FROM user_preferences WHERE user_id = $1 ORDER BY kind`,
    [DEMO_USER_ID]
  );
  const saved = await query<{ n: string }>(
    `SELECT count(DISTINCT listing_id) AS n FROM interactions
     WHERE user_id = $1 AND kind = 'save'`,
    [DEMO_USER_ID]
  );

  const brandList = prefs
    .filter((p) => p.kind === "brand")
    .map((p) => p.value)
    .join(", ");

  const reply =
    `(agent stub) I can see your Buyer Memory: ${prefs.length} preferences` +
    (brandList ? ` — brands: ${brandList}` : "") +
    ` — and ${saved[0].n} saved item(s). ` +
    `The real Bedrock agent with CockroachDB MCP tools plugs in here soon and will actually answer: "${message.trim()}"`;

  return NextResponse.json({ reply });
}
