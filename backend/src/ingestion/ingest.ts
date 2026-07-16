// Marketplace ingestion CLI: npm run ingest
// For each curated query: search the marketplace, upsert listings on
// (source, external_id), record a price snapshot for new listings and price
// changes, then embed everything that still lacks an embedding.
import { pool, toVectorLiteral } from "../db/client.js";
import { embedText, listingEmbeddingText } from "../embeddings/titan.js";
import type { MarketplaceListing } from "../marketplaces/adapter.js";
import { adaptersFromEnv } from "../pricing/snapshot-pass.js";
import { INGEST_QUERIES } from "./queries.js";

async function upsert(listing: MarketplaceListing): Promise<"inserted" | "price_changed" | "unchanged"> {
  const existing = await pool.query<{ id: string; current_price: string }>(
    "SELECT id, current_price FROM listings WHERE source = $1 AND external_id = $2",
    [listing.source, listing.externalId],
  );

  if (existing.rows.length === 0) {
    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO listings
         (source, external_id, title, description, brand, category, size, color,
          condition, image_url, url, current_price, currency, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING id`,
      [
        listing.source, listing.externalId, listing.title, listing.description,
        listing.brand, listing.category, listing.size, listing.color,
        listing.condition, listing.imageUrl, listing.url, listing.price,
        listing.currency, listing.isActive,
      ],
    );
    await pool.query(
      "INSERT INTO price_snapshots (listing_id, price, currency) VALUES ($1, $2, $3)",
      [inserted.rows[0].id, listing.price, listing.currency],
    );
    return "inserted";
  }

  const row = existing.rows[0];
  const priceChanged = Number(row.current_price) !== listing.price;
  await pool.query(
    `UPDATE listings SET current_price = $1, currency = $2, image_url = $3,
       is_active = $4, last_seen_at = now() WHERE id = $5`,
    [listing.price, listing.currency, listing.imageUrl, listing.isActive, row.id],
  );
  if (priceChanged) {
    await pool.query(
      "INSERT INTO price_snapshots (listing_id, price, currency) VALUES ($1, $2, $3)",
      [row.id, listing.price, listing.currency],
    );
    return "price_changed";
  }
  return "unchanged";
}

async function embedMissing(): Promise<number> {
  const { rows } = await pool.query<{
    id: string; title: string; description: string; brand: string | null; category: string;
  }>(
    "SELECT id, title, description, brand, category FROM listings WHERE embedding IS NULL ORDER BY first_seen_at",
  );
  for (const listing of rows) {
    const embedding = await embedText(listingEmbeddingText(listing));
    await pool.query("UPDATE listings SET embedding = $1::vector WHERE id = $2", [
      toVectorLiteral(embedding), listing.id,
    ]);
    console.log(`embedded: ${listing.title.slice(0, 60)}`);
  }
  return rows.length;
}

async function main() {
  const adapters = adaptersFromEnv();
  if (adapters.size === 0) {
    throw new Error(
      "no marketplace adapters configured — set REVERB_API_TOKEN / DISCOGS_API_TOKEN in backend/.env",
    );
  }

  let inserted = 0, changed = 0, unchanged = 0;
  for (const q of INGEST_QUERIES) {
    const adapter = adapters.get(q.adapter);
    if (!adapter) {
      console.warn(`skipping "${q.query}" — no adapter for ${q.adapter}`);
      continue;
    }
    // One failing query (rate limit, outage) shouldn't abort the whole run.
    let results: MarketplaceListing[];
    try {
      results = await adapter.search(q.query, q.limit);
    } catch (err) {
      console.error(`search "${q.query}" (${q.adapter}) failed:`, err);
      continue;
    }
    for (const listing of results) {
      const outcome = await upsert(listing);
      if (outcome === "inserted") inserted++;
      else if (outcome === "price_changed") changed++;
      else unchanged++;
    }
    console.log(`"${q.query}" (${q.adapter}): ${results.length} listings`);
  }

  const embedded = await embedMissing();
  console.log(
    `ingest done — ${inserted} new, ${changed} price changes, ${unchanged} unchanged, ${embedded} embedded.`,
  );
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
