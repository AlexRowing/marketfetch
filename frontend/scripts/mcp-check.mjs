// Health check for the CockroachDB Cloud managed MCP Server.
// Run with: npm run mcp:check
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({ name: "mcp-check", version: "0.1.0" });
const transport = new StreamableHTTPClientTransport(
  new URL(process.env.CRDB_MCP_URL),
  {
    requestInit: {
      headers: {
        Authorization: `Bearer ${process.env.CRDB_MCP_API_KEY}`,
        "mcp-cluster-id": process.env.CRDB_MCP_CLUSTER_ID,
      },
    },
  },
);
await client.connect(transport);

const { tools } = await client.listTools();
console.log("tools:", tools.map((t) => t.name).join(", "));

const result = await client.callTool({
  name: "select_query",
  arguments: {
    query:
      "SELECT title, current_price FROM defaultdb.public.listings ORDER BY current_price LIMIT 3",
  },
});
console.log(JSON.stringify(result.content, null, 2));
await client.close();
