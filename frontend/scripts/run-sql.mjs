// Runs a .sql file against DATABASE_URL. Used by `npm run db:migrate` / `db:seed`.
// DATABASE_URL is injected by node's --env-file=.env.local (see package.json).
import { readFileSync } from "node:fs";
import pg from "pg";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/run-sql.mjs <path-to-sql-file>");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url || url.includes("ENTER-SQL-USER-PASSWORD")) {
  console.error(
    "DATABASE_URL is missing or still has the password placeholder.\n" +
      "Edit frontend/.env.local and replace <ENTER-SQL-USER-PASSWORD> with the real password."
  );
  process.exit(1);
}

const sql = readFileSync(file, "utf8");
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(sql);
  console.log(`✓ applied ${file}`);
} finally {
  await client.end();
}
