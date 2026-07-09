// CLI entry for the price snapshot pass: npm run prices:snapshot.
// The same pass runs on a schedule in AWS — see src/lambda/snapshot-handler.ts
// and backend/deploy/deploy-snapshot-lambda.ps1.
import { pool } from "../db/client.js";
import { runSnapshotPass } from "./snapshot-pass.js";

async function main() {
  await runSnapshotPass(pool);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
