// Deterministic per-listing product image (SVG).
//
// Synthetic clothing listings have no real photos. Rather than hotlink random
// stock (wrong colours, rots, repeats), we render a clean flat-design product
// image that actually matches the listing's category, colour and brand. Each
// listing gets its own file with per-listing variation, so no two look alike.
// Self-contained SVG (no external fonts/assets) → loads instantly and never
// breaks, on both the feed cards and the detail page.

interface ImageOpts {
  brand: string | null;
  category: string;
  color: string | null;
  title: string;
  /** Stable per-listing number → deterministic variation. */
  seed: number;
}

// ---- tiny deterministic RNG ------------------------------------------------
function makeRng(seed: number): () => number {
  let a = (seed >>> 0) || 1;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- colour helpers --------------------------------------------------------
const COLORS: Record<string, string> = {
  black: "#33353c", white: "#eceee8", grey: "#9aa0a6", gray: "#9aa0a6",
  navy: "#2c3a5c", blue: "#3661ad", "light blue": "#a1bfe1",
  brown: "#6f4b2e", khaki: "#b7a175", beige: "#dccbb0", cream: "#e7dcc6",
  green: "#3f6b46", olive: "#6d6a3c", red: "#b83b34", cherry: "#7f2333",
  orange: "#d3762f", pink: "#dd9bb2", purple: "#6b4a86", yellow: "#dcb63f",
  gold: "#c9a44a", silver: "#bcc0c6", tan: "#c9a982", tortoise: "#7c5327",
};
function colorHex(name: string | null): string {
  if (!name) return "#7a7d84";
  return COLORS[name.trim().toLowerCase()] ?? "#7a7d84";
}
function hexToRgb(h: string): [number, number, number] {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}
function rgbToHex(r: number[]): string {
  return "#" + r.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
}
function mix(hex: string, target: string, amt: number): string {
  const a = hexToRgb(hex), b = hexToRgb(target);
  return rgbToHex(a.map((v, i) => v + (b[i] - v) * amt));
}
const darken = (h: string, a: number) => mix(h, "#000000", a);
const lighten = (h: string, a: number) => mix(h, "#ffffff", a);
function isDark(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

// ---- category → silhouette -------------------------------------------------
type Shape = "jacket" | "hoodie" | "tee" | "shirt" | "trousers" | "shorts" | "shoe" | "hat" | "bag" | "glasses";
function shapeFor(category: string, title: string): Shape {
  const c = category.toLowerCase();
  if (c === "jackets" || c === "coats") return "jacket";
  if (c === "hoodies" || c === "sweaters" || c === "fleeces") return "hoodie";
  if (c === "t-shirts" || c === "tops") return "tee";
  if (c === "shirts") return "shirt";
  if (c === "jeans" || c === "pants") return "trousers";
  if (c === "shorts") return "shorts";
  if (c === "shoes" || c === "sneakers" || c === "boots") return "shoe";
  if (c === "hats") return "hat";
  if (c === "bags") return "bag";
  if (c === "accessories") {
    const t = title.toLowerCase();
    if (t.includes("sunglass") || t.includes("wayfarer") || t.includes("glasses")) return "glasses";
    return "bag";
  }
  return "tee";
}

// ---- silhouette drawing ----------------------------------------------------
// Each returns SVG markup drawn in an 800×1000 canvas, centred on x=400. Fill
// references the shared gradient #g; `st` = outline, `dt` = detail colour.
function draw(shape: Shape, st: string, dt: string): string {
  const body = (d: string) => `<path d="${d}" fill="url(#g)" stroke="${st}" stroke-width="3" stroke-linejoin="round"/>`;
  const line = (x1: number, y1: number, x2: number, y2: number, w = 3) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${dt}" stroke-width="${w}" stroke-linecap="round"/>`;
  const dot = (x: number, y: number, r = 5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${dt}"/>`;

  switch (shape) {
    case "tee":
    case "shirt": {
      const parts = [
        body("M330 384 L266 414 Q255 420 259 434 L278 482 Q282 494 296 489 L332 471 Z"),
        body("M470 384 L534 414 Q545 420 541 434 L522 482 Q518 494 504 489 L468 471 Z"),
        body("M330 382 Q346 373 368 373 Q400 402 432 373 Q454 373 470 382 L470 728 Q470 746 452 746 L348 746 Q330 746 330 728 Z"),
      ];
      if (shape === "shirt") {
        parts.push(`<path d="M372 375 L400 405 L356 398 Z" fill="${dt}"/>`, `<path d="M428 375 L400 405 L444 398 Z" fill="${dt}"/>`);
        parts.push(line(400, 405, 400, 742), dot(400, 470), dot(400, 545), dot(400, 620), dot(400, 695));
      } else {
        parts.push(`<path d="M368 375 Q400 400 432 375" fill="none" stroke="${st}" stroke-width="3"/>`);
      }
      return parts.join("");
    }
    case "hoodie": {
      return [
        `<path d="M336 414 Q400 356 464 414 Q432 398 400 398 Q368 398 336 414 Z" fill="${dt}" stroke="${st}" stroke-width="3"/>`,
        body("M330 416 L284 446 L316 704 L360 694 Z"),
        body("M470 416 L516 446 L484 704 L440 694 Z"),
        body("M322 414 Q346 400 372 400 L428 400 Q454 400 478 414 L478 732 Q478 750 458 750 L342 750 Q322 750 322 732 Z"),
        `<path d="M352 566 Q352 558 360 558 L440 558 Q448 558 448 566 L448 650 Q448 658 440 658 L360 658 Q352 658 352 650 Z" fill="none" stroke="${dt}" stroke-width="3"/>`,
        line(390, 414, 388, 470), line(410, 414, 412, 470), dot(388, 472, 6), dot(412, 472, 6),
      ].join("");
    }
    case "jacket": {
      return [
        body("M330 414 L282 446 L314 706 L358 696 Z"),
        body("M470 414 L518 446 L486 706 L442 696 Z"),
        body("M322 412 Q346 398 372 398 L400 398 L400 750 L342 750 Q322 750 322 732 Z"),
        body("M478 412 Q454 398 428 398 L400 398 L400 750 L458 750 Q478 750 478 732 Z"),
        `<path d="M372 398 L400 438 L362 430 Z" fill="${dt}"/>`, `<path d="M428 398 L400 438 L438 430 Z" fill="${dt}"/>`,
        `<line x1="400" y1="438" x2="400" y2="748" stroke="${dt}" stroke-width="4" stroke-dasharray="2 9"/>`,
        `<rect x="344" y="632" width="46" height="60" rx="6" fill="none" stroke="${dt}" stroke-width="3"/>`,
        `<rect x="410" y="632" width="46" height="60" rx="6" fill="none" stroke="${dt}" stroke-width="3"/>`,
      ].join("");
    }
    case "trousers":
    case "shorts": {
      const legBottom = shape === "shorts" ? 556 : 748;
      return [
        `<rect x="316" y="338" width="168" height="42" rx="9" fill="${dt}"/>`,
        body(`M316 380 L397 380 L390 ${legBottom} Q390 ${legBottom + 10} 380 ${legBottom + 10} L332 ${legBottom + 10} Q322 ${legBottom + 10} 322 ${legBottom} Z`),
        body(`M403 380 L484 380 L484 ${legBottom} Q484 ${legBottom + 10} 474 ${legBottom + 10} L426 ${legBottom + 10} Q416 ${legBottom + 10} 416 ${legBottom} Z`),
        line(400, 380, 400, 472), `<path d="M330 392 Q360 410 384 392" fill="none" stroke="${dt}" stroke-width="3"/>`,
        `<path d="M470 392 Q440 410 416 392" fill="none" stroke="${dt}" stroke-width="3"/>`, dot(360, 360, 6),
      ].join("");
    }
    case "shoe": {
      return [
        `<path d="M246 600 Q244 624 272 626 L556 624 Q576 622 568 602 L560 590 L258 586 Q246 588 246 600 Z" fill="${dt}"/>`,
        body("M258 588 Q286 520 356 512 Q404 508 452 516 Q520 528 542 578 L548 590 L262 590 Z"),
        `<path d="M360 528 L392 556 M388 522 L420 552 M418 520 L448 548" stroke="${dt}" stroke-width="4" stroke-linecap="round" fill="none"/>`,
        `<path d="M470 528 Q516 546 540 582" fill="none" stroke="${dt}" stroke-width="6"/>`,
        `<rect x="250" y="606" width="316" height="12" rx="6" fill="${lighten(dt, 0.12)}"/>`,
      ].join("");
    }
    case "hat": {
      return [
        body("M272 566 Q272 424 400 424 Q528 424 528 566 Z"),
        `<rect x="260" y="558" width="280" height="66" rx="22" fill="${dt}"/>`,
        `<path d="M330 560 Q330 452 372 434 M400 560 L400 430 M470 560 Q470 452 428 434" fill="none" stroke="${st}" stroke-width="2.5" opacity="0.5"/>`,
      ].join("");
    }
    case "bag": {
      return [
        `<path d="M372 404 Q400 366 428 404" fill="none" stroke="${dt}" stroke-width="9"/>`,
        body("M308 430 Q308 408 330 408 L470 408 Q492 408 492 430 L492 726 Q492 748 470 748 L330 748 Q308 748 308 726 Z"),
        `<path d="M308 486 Q400 520 492 486" fill="none" stroke="${dt}" stroke-width="3"/>`,
        `<rect x="346" y="566" width="108" height="128" rx="22" fill="none" stroke="${dt}" stroke-width="3"/>`,
        `<path d="M356 430 Q332 560 344 720" fill="none" stroke="${dt}" stroke-width="3" opacity="0.7"/>`,
        `<path d="M444 430 Q468 560 456 720" fill="none" stroke="${dt}" stroke-width="3" opacity="0.7"/>`,
      ].join("");
    }
    case "glasses": {
      return [
        `<rect x="276" y="452" width="112" height="86" rx="34" fill="url(#g)" stroke="${st}" stroke-width="7"/>`,
        `<rect x="412" y="452" width="112" height="86" rx="34" fill="url(#g)" stroke="${st}" stroke-width="7"/>`,
        `<path d="M388 476 Q400 462 412 476" fill="none" stroke="${st}" stroke-width="7"/>`,
        `<path d="M276 470 L236 452 M524 470 L564 452" stroke="${st}" stroke-width="7" stroke-linecap="round"/>`,
      ].join("");
    }
  }
}

/** Full standalone SVG string for one listing. */
export function listingImageSvg(opts: ImageOpts): string {
  const rng = makeRng(opts.seed);
  const base = colorHex(opts.color);
  const st = darken(base, isDark(base) ? 0.22 : 0.34);
  const dt = isDark(base) ? lighten(base, 0.3) : darken(base, 0.3);
  const shape = shapeFor(opts.category, opts.title);

  // Subtle per-listing variation: paper tone, garment tilt, optional hang tag.
  const tones = ["#f6f2ec", "#f4efe8", "#f7f3ed", "#f2ede5", "#f5f1ea"];
  const tone = tones[Math.floor(rng() * tones.length)];
  const tone2 = darken(tone, 0.06);
  const tilt = (rng() * 4 - 2).toFixed(2);
  const brand = (opts.brand ?? "").toUpperCase().slice(0, 22);
  const tag = rng() < 0.5
    ? `<g transform="translate(${shape === "trousers" || shape === "shorts" ? 470 : 486} 372) rotate(14)"><line x1="0" y1="0" x2="0" y2="26" stroke="${dt}" stroke-width="2"/><rect x="-16" y="26" width="32" height="24" rx="4" fill="${lighten(tone, 0.4)}" stroke="${dt}" stroke-width="2"/><line x1="-9" y1="36" x2="9" y2="36" stroke="${dt}" stroke-width="2"/><line x1="-9" y1="43" x2="4" y2="43" stroke="${dt}" stroke-width="2"/></g>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" role="img" aria-label="${escapeXml(opts.title)}">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tone}"/><stop offset="1" stop-color="${tone2}"/></linearGradient>
<radialGradient id="hl" cx="0.5" cy="0.36" r="0.62"><stop offset="0" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
<linearGradient id="g" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${lighten(base, 0.16)}"/><stop offset="1" stop-color="${darken(base, 0.14)}"/></linearGradient>
</defs>
<rect width="800" height="1000" fill="url(#bg)"/>
<rect width="800" height="1000" fill="url(#hl)"/>
<ellipse cx="400" cy="812" rx="150" ry="24" fill="#000000" opacity="0.08"/>
<g transform="rotate(${tilt} 400 560)">${draw(shape, st, dt)}${tag}</g>
${brand ? `<text x="400" y="936" text-anchor="middle" font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif" font-size="30" font-weight="600" letter-spacing="3" fill="#9a9086">${escapeXml(brand)}</text>` : ""}
</svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Stable numeric seed from a listing's external_id (or any string). */
export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
