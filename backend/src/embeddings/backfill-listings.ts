// Embeds every listing that doesn't have an embedding yet.
// Idempotent: re-runs only touch listings where embedding IS NULL.
import { pool, toVectorLiteral } from "../db/client.js";
import { embedText, listingEmbeddingText } from "./titan.js";

async function main() {
  const { rows } = await pool.query<{
    id: string;
    title: string;
    description: string;
    brand: string | null;
    category: string;
  }>(
    `SELECT id, title, description, brand, category
     FROM listings
     WHERE embedding IS NULL
     ORDER BY first_seen_at`,
  );

  if (rows.length === 0) {
    console.log("all listings already embedded.");
  }

  for (const listing of rows) {
    const embedding = await embedText(listingEmbeddingText(listing));
    await pool.query(
      "UPDATE listings SET embedding = $1::vector WHERE id = $2",
      [toVectorLiteral(embedding), listing.id],
    );
    console.log(`embedded ${listing.title}`);
  }

  console.log(`done — ${rows.length} listing(s) embedded.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
