// Backfill product images for synthetic clothing listings.
//
// Real marketplace listings (reverb/discogs) already carry photos from their
// APIs, so we ONLY touch the synthetic clothing sources and ONLY rows without an
// image. For each, render a deterministic per-listing SVG (see listing-image.ts),
// write it to frontend/public/listings/<external_id>.svg, and point image_url at
// it. Idempotent: re-runs skip rows that already have an image.
//
// Run from backend/:  npm run images:backfill

import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { pool } from "../db/client.js";
import { listingImageSvg, seedFromString } from "./listing-image.js";

// Synthetic clothing marketplaces (real photo sources are excluded on purpose).
const CLOTHING_SOURCES = ["vinted", "depop", "grailed", "ebay"];

// repo/frontend/public/listings — served at /listings/<file> by Next.
const OUT_DIR = fileURLToPath(new URL("../../../frontend/public/listings/", import.meta.url));

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const { rows } = await pool.query<{
    id: string; external_id: string; brand: string | null; category: string; color: string | null; title: string;
  }>(
    `SELECT id, external_id, brand, category, color, title
     FROM listings
     WHERE source = ANY($1)
       AND (image_url IS NULL OR image_url = '')`,
    [CLOTHING_SOURCES],
  );

  if (rows.length === 0) {
    console.log("all clothing listings already have images.");
    await pool.end();
    return;
  }

  let written = 0;
  for (const r of rows) {
    const svg = listingImageSvg({
      brand: r.brand,
      category: r.category,
      color: r.color,
      title: r.title,
      seed: seedFromString(r.external_id),
    });
    const file = `${r.external_id}.svg`;
    await writeFile(`${OUT_DIR}${file}`, svg, "utf8");
    await pool.query("UPDATE listings SET image_url = $1 WHERE id = $2", [`/listings/${file}`, r.id]);
    written++;
  }

  console.log(`done — wrote ${written} image(s) to ${OUT_DIR} and set image_url.`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
