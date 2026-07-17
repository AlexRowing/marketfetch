import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/**
 * Connects to the CockroachDB Cloud managed MCP Server, which exposes the
 * database (both memory systems) as tools the agent can call.
 * Auth: service-account API key. One client per request - the managed
 * endpoint is stateless-HTTP and a chat turn makes only a handful of calls.
 */
export async function connectMcp(): Promise<Client> {
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
  return client;
}
