// Synthetic secondhand-clothing marketplace seed.
//
// MarketFetch's product concept is a GENERAL secondhand marketplace where the
// agent reasons about listings (not just filters them). Clothing is the primary
// demo category because size / brand / color / budget become meaningful there.
// The real marketplace adapters (Reverb music gear, Discogs vinyl) still exist
// as OPTIONAL sources — this script doesn't touch them; it just populates a rich
// clothing catalog so the agent + preference system can demonstrate the concept.
//
// The data is synthetic but shaped to feel like real listings: realistic brands
// and product archetypes, per-listing variation in size/color/condition/price,
// seeded price histories (some sellers keep cutting, some don't), and clusters
// of similar items so embedding-based "comparable price" reasoning has a cohort.
// Listings carry realistic marketplace `source` labels (vinted/depop/grailed/
// ebay) — SourceBadge already renders those — with namespaced external_ids
// ("mf-…") so a future REAL adapter for any of them can't collide.
//
// Run from backend/:
//   npm run seed:clothing          add/refresh the catalog (idempotent)
//   npm run seed:clothing:reset    wipe the catalog first, then seed (recommended
//                                  so the visible feed is clothing-only)
//
// Idempotent without --reset: listings upsert on (source, external_id) and their
// price history is only written for freshly-inserted rows. Embeds any listing
// still missing an embedding at the end (reuses the Titan pipeline).

import { pool, toVectorLiteral } from "../db/client.js";
import { embedText, listingEmbeddingText } from "../embeddings/titan.js";

// ---------------------------------------------------------------------------
// Deterministic RNG so the whole dataset is stable across runs (same prices,
// same drops, same narrative). mulberry32 — small, fast, good enough for seed.
// ---------------------------------------------------------------------------
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = (rng: () => number, lo: number, hi: number) => lo + rng() * (hi - lo);
const int = (rng: () => number, lo: number, hi: number) =>
  Math.floor(rand(rng, lo, hi + 1));
const pick = <T,>(rng: () => number, arr: readonly T[]): T =>
  arr[Math.floor(rng() * arr.length)];
/** Round to a "marketplace-looking" price (nearest $0.50). */
const price05 = (n: number) => Math.round(n * 2) / 2;

// ---------------------------------------------------------------------------
// Vocab
// ---------------------------------------------------------------------------
type SizePool = "tops" | "jeans" | "pants" | "shoes" | "onesize";
const SIZES: Record<SizePool, readonly string[]> = {
  tops: ["XS", "S", "M", "L", "XL", "XXL"],
  jeans: ["W28 L30", "W30 L30", "W30 L32", "W32 L30", "W32 L32", "W34 L32", "W34 L34", "W36 L32"],
  pants: ["W30 L32", "W32 L30", "W32 L32", "W34 L32", "W36 L32", "W38 L32"],
  shoes: ["39", "40", "41", "42", "43", "44", "45"],
  onesize: ["one size"],
};

const CONDITIONS = [
  { value: "like new", weight: 0.15, mult: 1.12 },
  { value: "very good", weight: 0.3, mult: 1.0 },
  { value: "good", weight: 0.4, mult: 0.9 },
  { value: "fair", weight: 0.15, mult: 0.78 },
] as const;

const SELLERS = [
  "denim_archive", "thrifted_gold", "vintage_vault", "closet_clearout",
  "grail_hunter", "second_life_co", "the_reup", "attic_finds",
  "worn_well", "north_loop_vtg", "citykid_resale", "loved_again",
  "fadedglory", "the_sorting_bin", "midwest_thrift", "eastside_exchange",
] as const;

// Marketplace sources by "flavor": hype/streetwear skews to grailed/depop.
const SRC_GENERAL = ["vinted", "vinted", "depop", "ebay", "vinted", "depop"] as const;
const SRC_HYPE = ["grailed", "grailed", "depop", "ebay"] as const;

type DealType = "great" | "good" | "fair" | "over" | "hype";

interface Archetype {
  key: string;
  brand: string | null;
  category: string;
  /** Product name used to build titles. */
  name: string;
  /** Fair secondhand market value (very-good condition), the pricing anchor. */
  market: number;
  colors: readonly string[];
  sizes: SizePool;
  /** Free-text style tags folded into the title/description + embedding. */
  style?: "vintage" | "streetwear" | "workwear" | "hype";
  desc: string;
  count: number;
}

// 38 archetypes across the requested categories/brands. Each has >= 5 variants
// so a coherent comparable cohort exists for "usually sells around $X".
const ARCHETYPES: readonly Archetype[] = [
  { key: "carhartt-detroit", brand: "Carhartt", category: "jackets", name: "Carhartt Detroit Jacket", market: 72, colors: ["brown", "black"], sizes: "tops", style: "workwear", desc: "Duck canvas work jacket, blanket lined.", count: 8 },
  { key: "carhartt-chore", brand: "Carhartt", category: "jackets", name: "Carhartt Michigan Chore Coat", market: 66, colors: ["black", "brown", "navy"], sizes: "tops", style: "workwear", desc: "Duck canvas chore coat, blanket lined.", count: 7 },
  { key: "carhartt-active", brand: "Carhartt", category: "jackets", name: "Carhartt Active Hooded Jacket", market: 58, colors: ["black", "brown"], sizes: "tops", style: "workwear", desc: "Hooded duck canvas jacket, flannel lined.", count: 6 },
  { key: "carhartt-dk", brand: "Carhartt", category: "pants", name: "Carhartt Double Knee Pants", market: 46, colors: ["brown", "black", "khaki"], sizes: "pants", style: "workwear", desc: "Double-front work pants, roomy fit.", count: 7 },
  { key: "carhartt-hoodie", brand: "Carhartt", category: "hoodies", name: "Carhartt Hooded Sweatshirt", market: 50, colors: ["black", "grey", "brown"], sizes: "tops", style: "workwear", desc: "Heavyweight hooded sweatshirt, front pocket.", count: 7 },
  { key: "carhartt-beanie", brand: "Carhartt", category: "hats", name: "Carhartt Watch Hat Beanie", market: 18, colors: ["black", "grey", "brown", "orange"], sizes: "onesize", style: "workwear", desc: "Ribbed knit beanie with logo patch.", count: 8 },
  { key: "levis-501", brand: "Levi's", category: "jeans", name: "Levi's 501 Original Jeans", market: 45, colors: ["blue", "black", "light blue"], sizes: "jeans", style: "vintage", desc: "Straight fit, button fly.", count: 9 },
  { key: "levis-511", brand: "Levi's", category: "jeans", name: "Levi's 511 Slim Jeans", market: 40, colors: ["blue", "black"], sizes: "jeans", desc: "Slim fit, mid stretch.", count: 6 },
  { key: "levis-trucker", brand: "Levi's", category: "jackets", name: "Levi's Trucker Jacket", market: 55, colors: ["blue", "black"], sizes: "tops", style: "vintage", desc: "Type III denim trucker.", count: 7 },
  { key: "levis-sherpa", brand: "Levi's", category: "jackets", name: "Levi's Sherpa Trucker Jacket", market: 65, colors: ["blue"], sizes: "tops", desc: "Sherpa-lined denim trucker, warm.", count: 6 },
  { key: "nike-am90", brand: "Nike", category: "shoes", name: "Nike Air Max 90", market: 65, colors: ["white", "black", "grey"], sizes: "shoes", desc: "Classic runner, visible air unit.", count: 8 },
  { key: "nike-af1", brand: "Nike", category: "shoes", name: "Nike Air Force 1 '07", market: 55, colors: ["white", "black"], sizes: "shoes", desc: "Low-top leather, everyday pair.", count: 8 },
  { key: "nike-windrunner", brand: "Nike", category: "jackets", name: "Nike Windrunner Jacket", market: 48, colors: ["black", "navy", "red"], sizes: "tops", desc: "Lightweight nylon windbreaker.", count: 6 },
  { key: "nike-tech", brand: "Nike", category: "hoodies", name: "Nike Tech Fleece Hoodie", market: 62, colors: ["black", "grey"], sizes: "tops", desc: "Full-zip tech fleece hoodie.", count: 7 },
  { key: "nike-tee", brand: "Nike", category: "t-shirts", name: "Nike Sportswear Club Tee", market: 18, colors: ["black", "white", "grey", "navy"], sizes: "tops", desc: "Cotton crewneck tee, embroidered swoosh.", count: 8 },
  { key: "adidas-samba", brand: "Adidas", category: "shoes", name: "Adidas Samba OG", market: 55, colors: ["black", "white"], sizes: "shoes", desc: "Gum sole, suede overlays.", count: 8 },
  { key: "adidas-gazelle", brand: "Adidas", category: "shoes", name: "Adidas Gazelle", market: 50, colors: ["blue", "green", "black"], sizes: "shoes", desc: "Suede low-top, classic silhouette.", count: 6 },
  { key: "adidas-firebird", brand: "Adidas", category: "jackets", name: "Adidas Firebird Track Jacket", market: 45, colors: ["black", "navy"], sizes: "tops", style: "vintage", desc: "Three-stripe track jacket.", count: 6 },
  { key: "dickies-874", brand: "Dickies", category: "pants", name: "Dickies 874 Work Pants", market: 28, colors: ["black", "khaki", "navy"], sizes: "pants", style: "workwear", desc: "Original fit work pants, wrinkle resistant.", count: 8 },
  { key: "dickies-eisen", brand: "Dickies", category: "jackets", name: "Dickies Eisenhower Jacket", market: 42, colors: ["black", "navy"], sizes: "tops", style: "workwear", desc: "Insulated work jacket, knit cuffs.", count: 6 },
  { key: "tnf-nuptse", brand: "The North Face", category: "jackets", name: "The North Face Nuptse Puffer", market: 110, colors: ["black", "navy"], sizes: "tops", desc: "700-fill down puffer, winter staple.", count: 7 },
  { key: "tnf-denali", brand: "The North Face", category: "hoodies", name: "The North Face Denali Fleece", market: 55, colors: ["black", "grey"], sizes: "tops", desc: "Recycled fleece jacket, nylon overlays.", count: 6 },
  { key: "patagonia-better", brand: "Patagonia", category: "sweaters", name: "Patagonia Better Sweater", market: 60, colors: ["navy", "grey", "black"], sizes: "tops", desc: "Quarter-zip knit fleece.", count: 7 },
  { key: "patagonia-snapt", brand: "Patagonia", category: "sweaters", name: "Patagonia Synchilla Snap-T", market: 65, colors: ["navy", "brown"], sizes: "tops", style: "vintage", desc: "Pullover fleece, chest pocket.", count: 6 },
  { key: "patagonia-baggies", brand: "Patagonia", category: "shorts", name: "Patagonia Baggies Shorts", market: 30, colors: ["navy", "black", "green"], sizes: "tops", desc: "5-inch nylon shorts, mesh liner.", count: 6 },
  { key: "rl-oxford", brand: "Ralph Lauren", category: "shirts", name: "Ralph Lauren Oxford Shirt", market: 30, colors: ["white", "blue", "pink"], sizes: "tops", desc: "Classic-fit button-down oxford.", count: 7 },
  { key: "rl-polo", brand: "Ralph Lauren", category: "t-shirts", name: "Ralph Lauren Polo Shirt", market: 25, colors: ["navy", "white", "green", "red"], sizes: "tops", desc: "Cotton mesh polo, embroidered pony.", count: 7 },
  { key: "champion-rw", brand: "Champion", category: "hoodies", name: "Champion Reverse Weave Hoodie", market: 40, colors: ["grey", "black", "navy"], sizes: "tops", style: "vintage", desc: "Heavyweight reverse-weave hoodie.", count: 8 },
  { key: "drmartens-1460", brand: "Dr. Martens", category: "shoes", name: "Dr. Martens 1460 Boots", market: 70, colors: ["black", "cherry"], sizes: "shoes", desc: "8-eye leather boots, air-cushioned sole.", count: 7 },
  { key: "nb-574", brand: "New Balance", category: "shoes", name: "New Balance 574", market: 50, colors: ["grey", "navy"], sizes: "shoes", desc: "Suede/mesh runner, ENCAP sole.", count: 7 },
  { key: "converse-ct70", brand: "Converse", category: "shoes", name: "Converse Chuck 70 High", market: 50, colors: ["black", "white"], sizes: "shoes", desc: "Canvas high-top, vintage details.", count: 6 },
  { key: "vans-oldskool", brand: "Vans", category: "shoes", name: "Vans Old Skool", market: 40, colors: ["black", "navy"], sizes: "shoes", style: "streetwear", desc: "Canvas/suede skate shoe, side stripe.", count: 7 },
  { key: "stussy-tee", brand: "Stüssy", category: "t-shirts", name: "Stüssy Basic Logo Tee", market: 35, colors: ["black", "white"], sizes: "tops", style: "streetwear", desc: "Cotton tee, front logo print.", count: 6 },
  { key: "supreme-boxlogo", brand: "Supreme", category: "t-shirts", name: "Supreme Box Logo Tee", market: 120, colors: ["black", "white", "red"], sizes: "tops", style: "hype", desc: "Box logo tee, collector piece.", count: 5 },
  { key: "columbia-fleece", brand: "Columbia", category: "hoodies", name: "Columbia Steens Mountain Fleece", market: 30, colors: ["black", "green", "blue"], sizes: "tops", desc: "Full-zip midweight fleece.", count: 6 },
  { key: "newera-cap", brand: "New Era", category: "hats", name: "New Era 9FIFTY Snapback", market: 22, colors: ["black", "navy", "red"], sizes: "onesize", style: "streetwear", desc: "Flat-brim snapback cap.", count: 6 },
  { key: "herschel-pack", brand: "Herschel", category: "accessories", name: "Herschel Little America Backpack", market: 40, colors: ["black", "navy", "grey"], sizes: "onesize", desc: "Mountaineering-style backpack, laptop sleeve.", count: 6 },
  { key: "rayban-wayfarer", brand: "Ray-Ban", category: "accessories", name: "Ray-Ban Wayfarer Sunglasses", market: 65, colors: ["black", "tortoise"], sizes: "onesize", desc: "Classic acetate frame, UV lenses, with case.", count: 5 },
];

function weightedCondition(rng: () => number) {
  const r = rng();
  let acc = 0;
  for (const c of CONDITIONS) {
    acc += c.weight;
    if (r <= acc) return c;
  }
  return CONDITIONS[CONDITIONS.length - 1];
}

// Deal type is assigned by POSITION so every archetype is guaranteed a clear
// spread: one strong deal, a couple of good ones, mostly fair, and at least one
// overpriced — the exact mix the agent needs to give real opinions.
function dealTypeFor(k: number, count: number, style?: string): DealType {
  if (style === "hype") return k === 0 ? "hype" : k === 1 ? "good" : "fair";
  if (k === 0) return "great";
  if (k === 1) return "good";
  if (k === count - 1) return "over";
  if (k === count - 2 && count >= 6) return "over";
  return k % 3 === 0 ? "good" : "fair";
}

interface Snapshot { price: number; at: Date; }

/** Build a plausible price path ending at `current`. */
function priceHistory(
  rng: () => number,
  current: number,
  dealType: DealType,
  listedAt: Date,
): Snapshot[] {
  const now = Date.now();
  let drops: number;
  if (dealType === "great") drops = int(rng, 2, 3);
  else if (dealType === "good") drops = int(rng, 1, 2);
  else if (dealType === "fair") drops = rng() < 0.4 ? 1 : 0;
  else drops = 0; // over / hype: sellers holding firm

  if (drops === 0) return [{ price: current, at: listedAt }];

  const totalDropPct =
    dealType === "great" ? rand(rng, 0.22, 0.36) :
    dealType === "good" ? rand(rng, 0.12, 0.2) :
    rand(rng, 0.05, 0.1);
  const original = price05(current / (1 - totalDropPct));

  const pts = drops + 1;
  const startT = listedAt.getTime();
  const endT = now - int(rng, 1, 5) * 86400000; // last cut a few days ago
  const snaps: Snapshot[] = [];
  let prev = -1;
  for (let i = 0; i < pts; i++) {
    const f = i / (pts - 1);
    const raw = i === pts - 1 ? current : original + (current - original) * f;
    let p = price05(raw);
    if (p <= prev) p = prev - 0.5; // keep strictly decreasing after snapping
    prev = p;
    const at = new Date(startT + (endT - startT) * f);
    snaps.push({ price: p, at });
  }
  snaps[snaps.length - 1].price = current; // exact
  return snaps;
}

interface GenListing {
  source: string;
  externalId: string;
  title: string;
  description: string;
  brand: string | null;
  category: string;
  size: string | null;
  color: string;
  condition: string;
  price: number;
  listedAt: Date;
  lastSeenAt: Date;
  isActive: boolean;
  snapshots: Snapshot[];
}

function generate(): GenListing[] {
  const rng = makeRng(0x9e3779b9); // fixed seed → identical dataset every run
  const out: GenListing[] = [];
  let gid = 0;

  for (const a of ARCHETYPES) {
    for (let k = 0; k < a.count; k++) {
      gid++;
      const dealType = dealTypeFor(k, a.count, a.style);
      const cond = weightedCondition(rng);

      // Guaranteed on-persona hero: the first Michigan Chore Coat is a size-M,
      // black, strong deal — the "this is the one I'd look at first" listing.
      const forceHero = a.key === "carhartt-chore" && k === 0;
      const color = forceHero ? "black" : pick(rng, a.colors);
      const size = a.sizes === "onesize"
        ? "one size"
        : forceHero ? "M" : pick(rng, SIZES[a.sizes]);

      // Price: market anchored, adjusted for condition, then the deal multiplier.
      const base = a.market * cond.mult;
      const mult =
        dealType === "great" ? rand(rng, 0.6, 0.75) :
        dealType === "good" ? rand(rng, 0.78, 0.9) :
        dealType === "fair" ? rand(rng, 0.93, 1.08) :
        dealType === "over" ? rand(rng, 1.15, 1.4) :
        rand(rng, 1.6, 2.4); // hype
      const price = Math.max(4, price05(base * mult));

      // Age: deals have been sitting (older, dropping); fair/over skew fresher,
      // with a slice listed in the last few days.
      let ageDays: number;
      if (dealType === "great" || dealType === "good") ageDays = int(rng, 18, 72);
      else if (rng() < 0.2) ageDays = int(rng, 1, 4);
      else ageDays = int(rng, 3, 45);
      const listedAt = new Date(Date.now() - ageDays * 86400000);

      const isActive = rng() < 0.92;
      const lastSeenAt = isActive
        ? new Date()
        : new Date(Date.now() - int(rng, 1, 10) * 86400000);

      const snapshots = priceHistory(rng, price, dealType, listedAt);

      // Title: prepend a style word sometimes for texture.
      const styleWord =
        a.style === "vintage" && rng() < 0.6 ? "Vintage " :
        a.style === "streetwear" && rng() < 0.4 ? "" : "";
      const title = `${styleWord}${a.name}`;

      const seller = pick(rng, SELLERS);
      const rating = (rand(rng, 3.8, 5.0)).toFixed(1);
      const sales = int(rng, 5, 780);
      const condNote =
        cond.value === "like new" ? "Barely worn, no flaws." :
        cond.value === "very good" ? "Light wear, well kept." :
        cond.value === "good" ? "Honest wear, plenty of life left." :
        "Visible wear, priced to reflect it.";
      const description =
        `${a.desc} ${color[0].toUpperCase()}${color.slice(1)}, size ${size}. ` +
        `${condNote} Sold by @${seller} (${rating}★, ${sales} sales).`;

      const source = pick(rng, a.style === "hype" ? SRC_HYPE : SRC_GENERAL);

      out.push({
        source,
        externalId: `mf-${a.key}-${String(gid).padStart(4, "0")}`,
        title,
        description,
        brand: a.brand,
        category: a.category,
        size,
        color,
        condition: cond.value,
        price,
        listedAt,
        lastSeenAt,
        isActive,
        snapshots,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------
const DEMO_USER = "00000000-0000-0000-0000-000000000001";

/** Ensure the demo user + a clean clothing preference baseline exist. */
async function ensureDemoPreferences() {
  await pool.query(
    `INSERT INTO users (id, email, display_name)
     VALUES ($1, 'demo@marketfetch.dev', 'Alex (demo)')
     ON CONFLICT DO NOTHING`,
    [DEMO_USER],
  );
  const prefs: [string, string, number | null][] = [
    ["brand", "Carhartt", null],
    ["brand", "Levi's", null],
    ["size", "M", null],
    ["color", "black", null],
    ["category_budget", "jackets", 69.5],
  ];
  for (const [kind, value, num] of prefs) {
    await pool.query(
      `INSERT INTO user_preferences (user_id, kind, value, numeric_value, source)
       VALUES ($1, $2, $3, $4, 'explicit')
       ON CONFLICT (user_id, kind, value) DO NOTHING`,
      [DEMO_USER, kind, value, num],
    );
  }
}

async function wipeCatalog() {
  // FK-safe order. Clears the whole catalog (gear, vinyl, old seed, and any
  // prior clothing) plus interactions and taste so the feed is clothing-only
  // and the taste profile rebuilds live from clothing.
  await pool.query("DELETE FROM interactions");
  await pool.query("DELETE FROM price_snapshots");
  await pool.query("DELETE FROM listings");
  await pool.query("DELETE FROM user_taste_embeddings");
}

async function insertListing(l: GenListing): Promise<boolean> {
  const res = await pool.query<{ id: string }>(
    `INSERT INTO listings
       (source, external_id, title, description, brand, category, size, color,
        condition, current_price, currency, listed_at, first_seen_at,
        last_seen_at, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'USD',$11,$11,$12,$13)
     ON CONFLICT (source, external_id) DO NOTHING
     RETURNING id`,
    [
      l.source, l.externalId, l.title, l.description, l.brand, l.category,
      l.size, l.color, l.condition, l.price, l.listedAt, l.lastSeenAt, l.isActive,
    ],
  );
  const id = res.rows[0]?.id;
  if (!id) return false; // already existed — leave its history untouched
  for (const s of l.snapshots) {
    await pool.query(
      "INSERT INTO price_snapshots (listing_id, price, currency, captured_at) VALUES ($1,$2,'USD',$3)",
      [id, s.price, s.at],
    );
  }
  return true;
}

async function embedMissing(): Promise<number> {
  const { rows } = await pool.query<{
    id: string; title: string; description: string; brand: string | null; category: string;
  }>(
    "SELECT id, title, description, brand, category FROM listings WHERE embedding IS NULL ORDER BY first_seen_at",
  );
  let done = 0;
  for (const listing of rows) {
    try {
      const embedding = await embedText(listingEmbeddingText(listing));
      await pool.query("UPDATE listings SET embedding = $1::vector WHERE id = $2", [
        toVectorLiteral(embedding), listing.id,
      ]);
      done++;
    } catch (err) {
      console.error(`  embed failed for "${listing.title}": ${(err as Error).message}`);
    }
  }
  return done;
}

async function main() {
  const reset = process.argv.includes("--reset");
  const listings = generate();

  if (reset) {
    console.log("--reset: wiping existing catalog, interactions, and taste…");
    await wipeCatalog();
  }
  await ensureDemoPreferences();

  let inserted = 0, skipped = 0;
  for (const l of listings) {
    (await insertListing(l)) ? inserted++ : skipped++;
  }

  const byCat = new Map<string, number>();
  for (const l of listings) byCat.set(l.category, (byCat.get(l.category) ?? 0) + 1);
  console.log(
    `seeded clothing — ${inserted} inserted, ${skipped} already present, ` +
    `${listings.length} generated across ${byCat.size} categories.`,
  );

  console.log("embedding listings that still need it (Titan)…");
  let embedded = 0;
  try {
    embedded = await embedMissing();
  } catch (err) {
    console.error("embedding step failed:", (err as Error).message);
    console.error("Listings are still seeded. Run `npm run embed:backfill` once AWS creds work.");
  }
  console.log(`done — ${embedded} listing(s) embedded.`);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
