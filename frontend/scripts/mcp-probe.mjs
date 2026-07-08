// Probes each MCP tool to see which are authorized for our service account.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({ name: "mcp-probe", version: "0.1.0" });
await client.connect(
  new StreamableHTTPClientTransport(new URL(process.env.CRDB_MCP_URL), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${process.env.CRDB_MCP_API_KEY}`,
        "mcp-cluster-id": process.env.CRDB_MCP_CLUSTER_ID,
      },
    },
  }),
);

const probes = [
  ["list_clusters", {}],
  ["get_cluster", {}],
  ["list_databases", {}],
  ["list_tables", { database: "defaultdb" }],
  ["get_table_schema", { database: "defaultdb", table: "listings" }],
  ["select_query", { query: "SELECT 1" }],
];

for (const [name, args] of probes) {
  try {
    const r = await client.callTool({ name, arguments: args });
    const text = r.content?.map((c) => c.text ?? "").join(" ").slice(0, 120);
    console.log(`OK    ${name}: ${text}`);
  } catch (err) {
    console.log(`FAIL  ${name}: ${err.message}`);
  }
}
await client.close();
