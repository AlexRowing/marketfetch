import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message,
  type Tool,
  type ToolResultContentBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { getMcp, invalidateMcp } from "@/lib/mcp";
import { query } from "@/lib/db";

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION ?? "us-east-1",
});

const MODEL_ID = process.env.BEDROCK_MODEL_ID ?? "us.anthropic.claude-sonnet-4-6";
const MAX_TOOL_ROUNDS = 10;
// A reply that mentions specific listings but links none of them - matched
// against /listings/<id> since that's the only path the agent ever emits.
const LISTING_LINK_RE = /\/listings\/[0-9a-f-]{8,}/i;

/**
 * A first-class tool for persisting a buyer preference, handled by us directly
 * (not the MCP SQL bridge) so a remembered preference is ALWAYS written the same
 * way the Preferences UI writes it - and therefore re-ranks the feed. Letting
 * the model hand-write INSERTs was unreliable; this makes saving deterministic.
 */
const PREFERENCE_KINDS = ["brand", "size", "color", "category_budget"] as const;
type PreferenceKind = (typeof PREFERENCE_KINDS)[number];
const SAVE_PREFERENCE = "save_preference";

const savePreferenceTool: Tool = {
  toolSpec: {
    name: SAVE_PREFERENCE,
    description:
      "Persist a lasting buyer preference to the user's saved Preferences. " +
      "This is the ONLY correct way to remember a preference - it writes to the " +
      "same store the Preferences page uses, so it also re-ranks the user's feed. " +
      "Call it whenever the user states something durable they want remembered: a " +
      "brand they like (Carhartt, Nike, Levi's), a colour, a clothing/shoe size, " +
      "or a per-category spending budget (e.g. a ceiling for jackets). " +
      "Do not use it for one-off search filters.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: [...PREFERENCE_KINDS],
            description:
              "brand | size (a clothing/shoe size like M or 42) | color | " +
              "category_budget (a max price for a category).",
          },
          value: {
            type: "string",
            description:
              "The brand, size, or colour. For category_budget, the category " +
              "(e.g. 'jackets', 'jeans', 'shoes').",
          },
          numericValue: {
            type: ["number", "null"],
            description:
              "Only for category_budget: the maximum price in US dollars. Null otherwise.",
          },
        },
        required: ["kind", "value"],
      },
    },
  },
};

/** Write one preference exactly as /api/preferences does (source='inferred'). */
async function savePreference(
  userId: string,
  input: Record<string, unknown>,
): Promise<string> {
  const kind = input.kind;
  const value = typeof input.value === "string" ? input.value.trim() : "";
  const numericValue =
    typeof input.numericValue === "number" ? input.numericValue : null;
  if (
    typeof kind !== "string" ||
    !PREFERENCE_KINDS.includes(kind as PreferenceKind) ||
    value === ""
  ) {
    return `error: invalid preference - kind must be one of ${PREFERENCE_KINDS.join(", ")} and value must be non-empty`;
  }
  await query(
    `INSERT INTO user_preferences (user_id, kind, value, numeric_value, source)
     VALUES ($1, $2, $3, $4, 'inferred')
     ON CONFLICT (user_id, kind, value) DO UPDATE SET numeric_value = EXCLUDED.numeric_value`,
    [userId, kind, value, numericValue],
  );
  return `saved to Preferences: ${kind} = ${value}${
    numericValue !== null ? ` ($${numericValue})` : ""
  }. The feed will re-rank to favour this.`;
}

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
) => `You are MarketFetch, a buying agent for a general secondhand marketplace.
Most of what's listed is clothing, shoes and accessories - jackets, jeans,
sneakers, hoodies, tees, hats - across brands like Carhartt, Levi's, Nike,
Adidas, The North Face and Patagonia. Think like a sharp thrift/reseller expert
who knows what used pieces actually go for and has no reason to oversell: you are
on the buyer's side.

You have direct access to your own memory - a CockroachDB database - through
tools. Answer ONLY from what you find there; query it rather than guessing.

The database is "defaultdb". Schema:
- users(id, email, display_name)
- user_preferences(id, user_id, kind, value, numeric_value, source) - Buyer Memory.
  kind: brand|size|color|category_budget; size is a clothing/shoe size (M, W32,
  42); numeric_value holds the budget amount; source is 'explicit' (user set it)
  or 'inferred' (you learned it).
- user_taste_embeddings(user_id, embedding VECTOR) - the user's taste profile.
- listings(id, source, external_id, title, description, brand, category, size,
  color, condition, image_url, url, current_price, currency, is_synthetic,
  first_seen_at, last_seen_at, is_active, embedding VECTOR) - color is the
  item's colour; condition is the seller's grade (like new / very good / good
  / fair). current_price is always USD - talk in dollars ($). is_synthetic=true
  means generated demo data - it still carries a real marketplace name in the
  source column (vinted/depop/ebay/grailed) so never say "on Vinted" or similar
  for one of these; call it "this listing" or "a sample listing" instead. Only
  name the real marketplace when is_synthetic=false.
- price_snapshots(id, listing_id, price, currency, captured_at) - Price Memory,
  append-only history. Multiple downward snapshots = a seller who keeps cutting.
- interactions(id, user_id, listing_id, kind view|save|reject|unsave, created_at)

The current user id is '${userId}'.

Ranking by taste: ORDER BY l.embedding <=> t.embedding using the user's row in
user_taste_embeddings - do the comparison INSIDE the SQL (join or subquery).
NEVER put an embedding column in a SELECT list: vectors are 1024 numbers of
useless text that will drown you. A JOIN against user_taste_embeddings that
comes back with zero rows almost always means the user has no taste profile
yet (new/guest users start with none) - do NOT read that as "no matching
listings exist" and start guessing different category names. Immediately
retry the SAME query WITHOUT the taste join, ordered by current_price or
first_seen_at instead. To judge a price, compare current_price to the
listing's own price_snapshots history AND to AVG/MIN/MAX(current_price) of
same-category-or-brand listings - PERCENTILE_CONT is NOT supported by this
SQL bridge, so never use it; AVG/MIN/MAX always work.

How you talk - this is the whole point, get it right:
- Lead with a verdict, then the reason. Say what you would do, not just what the
  data is: "I'd keep an eye on this one", "I'd pass - that's a normal price for a
  used 501", "This is probably the strongest listing on the board today."
- Explain WHY it matters in plain terms: how the price sits against similar
  listings, whether it has dropped, how long it has been up, and what that says
  about the seller ("dropped twice in three weeks - they'll likely take an
  offer"; "been listed 45 days, so there's no rush on their end - room to lowball").
- Be willing to say something is NOT worth buying. "Fairly priced, nothing
  special" is more useful than manufactured excitement.
- Keep it tight: usually 3-5 sentences. A first reply is ONE recommendation, the
  reason behind it, and a next step - do not dump everything you found. Go deeper
  only when they ask a follow-up.
- Plain, spoken English. No emojis, no markdown headings, no bold-for-emphasis,
  no "---" horizontal-rule dividers between items, no hype ("amazing deal",
  "best price ever", exclamation-point energy). This applies even when
  comparing several items - don't reach for bold section labels or dividers to
  organize a longer answer; a paragraph break per item, opening with a plain
  sentence like "Buy this one:" or "Skip this one:", does the same job without
  looking like a listicle. Sound like a knowledgeable person texting a friend,
  not a marketing banner or a spec sheet.

The register to match (copy the tone, not the words; use REAL ids from your
queries in place of <id>):
- "This is the one I'd look at first. That [Carhartt Detroit Jacket](/listings/<id>)
  is your size and one of your brands, but the real draw is price - similar
  jackets sell around $65-80 and this seller has already dropped it a few times."
- "I'd pass. $45 is a normal price for used [Levi's 501s](/listings/<id>) in this
  condition; nothing about it says buy today."
- "It's been up 50 days with no price movement, so the seller isn't in a hurry -
  there's room to lowball. I'd start about 15% under and see what comes back."

Grounding rules - never break these:
- Cite memory concretely ("you follow Carhartt", "your jackets budget is $70",
  "this dropped from $75 to $58 across its snapshots").
- Whenever you mention a specific listing, ALWAYS make it a clickable Markdown
  link to its in-app page, [short title](/listings/<id>), using the id column -
  so SELECT l.id in your queries. Never emit a bare "view" or "here".
- Only ever name or link a listing that came back from a query in THIS turn.
  Never guess or reuse an id, and never invent listings or prices. If memory has
  no answer, say so plainly instead of making something up.
- When the user states a lasting preference (a brand, size, colour, or a
  per-category budget), call the save_preference tool to remember it - never
  write it with raw SQL. Saving this way also re-ranks their feed. Then confirm
  in one short line what you saved.
- Finish the job before replying: run every query you need first. Never end your
  reply with "let me search/check" - the reply IS the final answer.`;

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
  const toolCalls: AgentToolCall[] = [];
  // True once a SELECT against `listings` this turn actually returned rows -
  // i.e. the agent had real, linkable listings in hand. Gates the
  // self-correction retry below so it only fires on the real failure mode
  // (looked at listings, named none of them) and never on legitimate
  // no-listing-needed replies ("what's my budget?").
  let sawListingRows = false;
  let correctionAttempted = false;

  const { client: mcp, tools: mcpTools } = await getMcp();

  // Our deterministic save_preference tool plus the MCP server's SQL tools.
  // Identical for every user/turn, so a cache point here lets Bedrock skip
  // reprocessing the tool definitions on every request, not just every round.
  const tools: Tool[] = [
    savePreferenceTool,
    ...mcpTools.map(
      (t) =>
        ({
          toolSpec: {
            name: t.name,
            description: t.description ?? t.name,
            inputSchema: { json: t.inputSchema as Record<string, unknown> },
          },
        }) as Tool,
    ),
    { cachePoint: { type: "default" } },
  ];

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
        // The system prompt is identical across every round of one turn -
        // a cache point here means only the first round pays to process it.
        system: [{ text: systemPrompt(userId) }, { cachePoint: { type: "default" } }],
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
      if (
        sawListingRows &&
        !correctionAttempted &&
        !LISTING_LINK_RE.test(reply) &&
        round < MAX_TOOL_ROUNDS
      ) {
        // The agent had real listings to point to this turn and didn't link
        // any of them - the exact bug we saw in production. One bounded
        // corrective round instead of trusting the prompt alone.
        correctionAttempted = true;
        messages.push({
          role: "user",
          content: [
            {
              text: "You looked up real listings this turn but your reply doesn't link to any of them. Rewrite your answer so every specific listing you mention is a real [title](/listings/<id>) markdown link, using an id from your query results above. If your reply genuinely names no specific listing (e.g. you're only answering a general question), you can repeat it as-is.",
            },
          ],
        });
        continue;
      }
      return { reply, toolCalls };
    }

    const results: { toolResult: { toolUseId: string; content: ToolResultContentBlock[]; status?: "success" | "error" } }[] = [];
    for (const block of output.content ?? []) {
      if (!block.toolUse?.toolUseId || !block.toolUse.name) continue;
      toolCalls.push({ tool: block.toolUse.name, input: block.toolUse.input });
      const input = (block.toolUse.input ?? {}) as Record<string, unknown>;
      try {
        // save_preference is ours - handle it directly instead of via MCP.
        if (block.toolUse.name === SAVE_PREFERENCE) {
          const text = await savePreference(userId, input);
          results.push({
            toolResult: {
              toolUseId: block.toolUse.toolUseId,
              content: [{ text }],
              status: text.startsWith("error:") ? "error" : "success",
            },
          });
          continue;
        }
        const result = await mcp.callTool({
          name: block.toolUse.name,
          arguments: input,
        });
        const text = (result.content as { type: string; text?: string }[])
          .map((c) => (c.type === "text" ? c.text ?? "" : ""))
          .join("\n");
        // Scoped to actual `listings` queries (not preferences/snapshots-only
        // ones) that came back with real rows, so the link-check above only
        // fires when the agent genuinely had something to point to.
        if (
          !result.isError &&
          /from\s+listings/i.test(String(input.query ?? "")) &&
          /"id"\s*:/.test(text)
        ) {
          sawListingRows = true;
        }
        results.push({
          toolResult: {
            toolUseId: block.toolUse.toolUseId,
            content: [{ text: text || "(empty result)" }],
            status: result.isError ? "error" : "success",
          },
        });
      } catch (err) {
        // A thrown error means the MCP connection itself is broken (not
        // just a bad query) - drop the cached connection so the next turn
        // reconnects instead of reusing a dead one.
        invalidateMcp();
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
    reply: "I couldn't finish reasoning about that within my tool budget - try a more specific question.",
    toolCalls,
  };
}
