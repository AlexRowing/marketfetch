// Quick health check: lists tables, row counts, and vector index presence.
// Run with: npm run db:check
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const tables = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' ORDER BY table_name`
  );
  for (const { table_name } of tables.rows) {
    const count = await client.query(`SELECT count(*) AS n FROM ${table_name}`);
    console.log(`${table_name.padEnd(24)} ${count.rows[0].n} rows`);
  }
  const idx = await client.query(
    `SELECT index_name FROM [SHOW INDEXES FROM listings]
     WHERE index_name = 'listings_embedding_idx' LIMIT 1`
  );
  console.log(
    idx.rows.length > 0
      ? "vector index            listings_embedding_idx ✓"
      : "vector index            MISSING — cluster may not support CREATE VECTOR INDEX"
  );
} finally {
  await client.end();
}
