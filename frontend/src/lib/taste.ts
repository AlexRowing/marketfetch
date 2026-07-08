import { query } from "@/lib/db";

// Must match VECTOR(1024) in the schema (Titan Embeddings V2).
const EMBEDDING_DIMENSIONS = 1024;

// Saves say more about taste than views; rejected listings are excluded
// entirely (negative signal lives in feed filtering, not in the profile).
const SAVE_WEIGHT = 3;
const VIEW_WEIGHT = 1;

interface SignalRow {
  listing_id: string;
  viewed: boolean;
  state: string | null;
  embedding: string | null;
}

/**
 * Recompute a user's taste embedding as the weighted mean of the listing
 * embeddings they've interacted with. Per listing, the latest
 * save/unsave/reject wins (a later save overrides an earlier reject).
 * Mirrors backend/src/embeddings/recompute-taste.ts — keep the two in sync.
 */
export async function recomputeTasteEmbedding(userId: string): Promise<void> {
  const rows = await query<SignalRow>(
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
    [userId]
  );

  const sum = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
  let totalWeight = 0;

  for (const row of rows) {
    if (row.state === "reject" || !row.embedding) continue;
    const weight =
      row.state === "save" ? SAVE_WEIGHT : row.viewed ? VIEW_WEIGHT : 0;
    if (weight === 0) continue;
    const vec = JSON.parse(row.embedding) as number[];
    for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) sum[i] += weight * vec[i];
    totalWeight += weight;
  }

  if (totalWeight === 0) return;

  const mean = sum.map((v) => v / totalWeight);
  await query(
    `UPSERT INTO user_taste_embeddings (user_id, embedding, updated_at)
     VALUES ($1, $2::vector, now())`,
    [userId, `[${mean.join(",")}]`]
  );
}
