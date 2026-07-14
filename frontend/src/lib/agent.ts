import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message,
  type Tool,
  type ToolResultContentBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { connectMcp } from "@/lib/mcp";

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

const MODEL_ID = process.env.BEDROCK_MODEL_ID ?? "us.anthropic.claude-sonnet-4-6";
const MAX_TOOL_ROUNDS = 8;

/** One tool invocation the agent made, surfaced to the UI for transparency. */
export interface AgentToolCall {
  tool: string;
  input: unknown;
}

export interface AgentReply {
  reply: string;
  toolCalls: AgentToolCall[];
}

const systemPrompt = (
  userId: string
) => `You are MarketFetch, an AI buying agent for second-hand marketplaces.
You have direct access to your own memory — a CockroachDB database — through tools.
Answer ONLY from what you find in the database; query it rather than guessing.

The database is "defaultdb". Schema:
- users(id, email, display_name)
- user_preferences(id, user_id, kind, value, numeric_value, source) — Buyer Memory.
  kind: brand|size|color|category_budget; numeric_value holds the budget amount;
  source is 'explicit' (user set it) or 'inferred' (you learned it).
- user_taste_embeddings(user_id, embedding VECTOR) — the user's taste profile.
- listings(id, source, external_id, title, description, brand, category, size,
  color, condition, image_url, url, current_price, currency, first_seen_at,
  last_seen_at, is_active, embedding VECTOR) — Price info is in EUR.
- price_snapshots(id, listing_id, price, currency, captured_at) — Price Memory,
  append-only history.
- interactions(id, user_id, listing_id, kind view|save|reject|unsave, created_at)

The current user id is '${userId}'.

Ranking by taste: ORDER BY l.embedding <=> t.embedding using the user's row in
user_taste_embeddings — do the comparison INSIDE the SQL (join or subquery).
NEVER put an embedding column in a SELECT list: vectors are 1024 numbers of
useless text that will drown you. Deal context: compare current_price to the
listing's own price_snapshots history and to avg price of same category+brand
listings.

When you answer:
- Cite your memory concretely ("you saved X", "your jackets budget is 60 EUR",
  "this dropped from 48 to 38 EUR over the last snapshots").
- When the user states a new lasting preference (brand, size, color, budget),
  save it: insert into user_preferences with source='inferred', then confirm.
- Never invent listings or prices. If memory has no answer, say so.
- Keep replies short and conversational; this is a chat UI.
- Finish the job before replying: run every query you need first. Never end
  your reply with "let me search/check" — the reply IS the final answer.`;

/**
 * Agent loop: Claude on Bedrock with the CockroachDB MCP Server's tools.
 * Claude decides which queries to run against Buyer/Price Memory; we bridge
 * tool calls to MCP until it produces a final text answer.
 */
export async function runAgent(
  userMessage: string,
  history: { role: "user" | "assistant"; content: string }[],
  userId: string,
): Promise<AgentReply> {
  const mcp = await connectMcp();
  const toolCalls: AgentToolCall[] = [];

  try {
    const { tools: mcpTools } = await mcp.listTools();
    const tools: Tool[] = mcpTools.map(
      (t) =>
        ({
          toolSpec: {
            name: t.name,
            description: t.description ?? t.name,
            inputSchema: { json: t.inputSchema as Record<string, unknown> },
          },
        }) as Tool,
    );

    const messages: Message[] = [
      ...history.map((m) => ({
        role: m.role,
        content: [{ text: m.content }],
      })),
      { role: "user" as const, content: [{ text: userMessage }] },
    ];

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const response = await bedrock.send(
        new ConverseCommand({
          modelId: MODEL_ID,
          system: [{ text: systemPrompt(userId) }],
          messages,
          toolConfig: { tools },
          inferenceConfig: { maxTokens: 1500 },
        }),
      );

      const output = response.output?.message;
      if (!output) throw new Error("Bedrock returned no message");
      messages.push(output);

      if (response.stopReason !== "tool_use") {
        const reply = (output.content ?? [])
          .map((block) => block.text ?? "")
          .join("")
          .trim();
        return { reply, toolCalls };
      }

      const results: { toolResult: { toolUseId: string; content: ToolResultContentBlock[]; status?: "success" | "error" } }[] = [];
      for (const block of output.content ?? []) {
        if (!block.toolUse?.toolUseId || !block.toolUse.name) continue;
        toolCalls.push({ tool: block.toolUse.name, input: block.toolUse.input });
        try {
          const result = await mcp.callTool({
            name: block.toolUse.name,
            arguments: (block.toolUse.input ?? {}) as Record<string, unknown>,
          });
          const text = (result.content as { type: string; text?: string }[])
            .map((c) => (c.type === "text" ? c.text ?? "" : ""))
            .join("\n");
          results.push({
            toolResult: {
              toolUseId: block.toolUse.toolUseId,
              content: [{ text: text || "(empty result)" }],
              status: result.isError ? "error" : "success",
            },
          });
        } catch (err) {
          results.push({
            toolResult: {
              toolUseId: block.toolUse.toolUseId,
              content: [{ text: `tool error: ${err instanceof Error ? err.message : String(err)}` }],
              status: "error",
            },
          });
        }
      }
      messages.push({ role: "user", content: results });
    }

    return {
      reply: "I couldn't finish reasoning about that within my tool budget — try a more specific question.",
      toolCalls,
    };
  } finally {
    await mcp.close().catch(() => {});
  }
}
