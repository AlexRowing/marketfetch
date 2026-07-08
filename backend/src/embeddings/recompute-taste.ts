// Recomputes a user's taste embedding from their interactions:
// weighted mean of listing embeddings — saves count 3x, views 1x,
// rejected listings excluded entirely (they are a negative signal in
// feed ranking, not part of taste). See docs/database-schema.md.
import { pool, toVectorLiteral, fromVectorLiteral } from "../db/client.js";
import { EMBEDDING_DIMENSIONS } from "./titan.js";

const SAVE_WEIGHT = 3;
const VIEW_WEIGHT = 1;

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

async function recomputeFor(userId: string) {
  // Per listing, the latest save/unsave/reject wins (a later save overrides
  // an earlier reject and vice versa); views only matter if there is no
  // stronger signal.
  const { rows } = await pool.query<{
    listing_id: string;
    state: string | null;
    viewed: boolean;
    embedding: string | null;
  }>(
    `SELECT i.listing_id,
            bool_or(i.kind = 'view') AS viewed,
            (SELECT s.kind
             FROM interactions s
             WHERE s.user_id = i.user_id AND s.listing_id = i.listing_id
               AND s.kind IN ('save', 'unsave', 'reject')
             ORDER BY s.created_at DESC
             LIMIT 1) AS state,
            l.embedding::STRING AS embedding
     FROM interactions i
     JOIN listings l ON l.id = i.listing_id
     WHERE i.user_id = $1
     GROUP BY i.user_id, i.listing_id, l.embedding`,
    [userId],
  );

  const sum = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  let totalWeight = 0;

  for (const row of rows) {
    if (row.state === "reject" || !row.embedding) continue;
    const weight =
      row.state === "save" ? SAVE_WEIGHT : row.viewed ? VIEW_WEIGHT : 0;
    if (weight === 0) continue;
    const vec = fromVectorLiteral(row.embedding);
    for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) sum[i] += weight * vec[i];
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    console.log(`user ${userId}: no positive interactions with embedded listings — nothing to do.`);
    return;
  }

  const mean = sum.map((v) => v / totalWeight);
  await pool.query(
    `UPSERT INTO user_taste_embeddings (user_id, embedding, updated_at)
     VALUES ($1, $2::vector, now())`,
    [userId, toVectorLiteral(mean)],
  );
  console.log(`user ${userId}: taste embedding updated from ${totalWeight} weighted signal(s).`);
}

async function main() {
  const userId = process.argv[2] ?? DEMO_USER_ID;
  await recomputeFor(userId);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
