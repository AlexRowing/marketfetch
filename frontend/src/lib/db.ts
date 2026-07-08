import { Pool, type QueryResultRow } from "pg";

// Reuse one pool across Next.js hot reloads in dev; a fresh module-level
// pool per reload would leak connections against CockroachDB Cloud.
const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;

/** Run a parameterized query and return the rows. */
export async function query<T extends QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}
