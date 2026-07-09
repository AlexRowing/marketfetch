// Lambda entry point for the scheduled snapshot job (EventBridge, rate(6 hours)).
// Deployed by backend/deploy/deploy-snapshot-lambda.ps1 as function
// "marketfetch-price-snapshot" with DATABASE_URL set as an env var.
//
// Creates its own pool per invocation instead of reusing db/client.ts: that
// module-level pool would be dead on a warm start after pool.end().
import pg from "pg";
import { runSnapshotPass, type SnapshotResult } from "../pricing/snapshot-pass.js";

export async function handler(): Promise<SnapshotResult> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set on the Lambda function");
  }
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  try {
    return await runSnapshotPass(pool);
  } finally {
    await pool.end();
  }
}
