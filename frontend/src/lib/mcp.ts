import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Tool as McpTool } from "@modelcontextprotocol/sdk/types.js";

export interface McpConnection {
  client: Client;
  /** The MCP server's tool list - fetched once and reused, since it never changes. */
  tools: McpTool[];
}

/**
 * Connects to the CockroachDB Cloud managed MCP Server, which exposes the
 * database (both memory systems) as tools the agent can call.
 * Auth: service-account API key.
 */
async function connect(): Promise<McpConnection> {
  const url = process.env.CRDB_MCP_URL;
  const apiKey = process.env.CRDB_MCP_API_KEY;
  const clusterId = process.env.CRDB_MCP_CLUSTER_ID;
  if (!url || !apiKey || !clusterId) {
    throw new Error(
      "CRDB_MCP_URL / CRDB_MCP_API_KEY / CRDB_MCP_CLUSTER_ID not set in .env.local",
    );
  }

  const client = new Client({ name: "marketfetch-agent", version: "0.1.0" });
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "mcp-cluster-id": clusterId,
      },
    },
  });
  await client.connect(transport);
  const { tools } = await client.listTools();
  return { client, tools };
}

// Reused across requests (and hot reloads in dev) so a chat turn doesn't pay
// for a fresh connect + listTools round trip every message - the tool list
// never changes. Held as a promise so concurrent requests share one connect.
const globalForMcp = globalThis as unknown as { mcpConnection?: Promise<McpConnection> };

export function getMcp(): Promise<McpConnection> {
  if (!globalForMcp.mcpConnection) {
    globalForMcp.mcpConnection = connect().catch((err) => {
      globalForMcp.mcpConnection = undefined;
      throw err;
    });
  }
  return globalForMcp.mcpConnection;
}

/** Drop the cached connection so the next call reconnects from scratch. */
export function invalidateMcp(): void {
  globalForMcp.mcpConnection = undefined;
}
