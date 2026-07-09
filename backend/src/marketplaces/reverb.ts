// Reverb (reverb.com, Etsy-owned used music gear) — adapter #1.
// Official open API: personal access token, Accept-Version 3.0, hal+json.
// Docs: https://www.reverb-api.com/
import type { CurrentPrice, MarketplaceAdapter, MarketplaceListing } from "./adapter.js";

const API_BASE = "https://api.reverb.com/api";

// Reverb descriptions are HTML; the DB and embeddings want plain text.
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface ReverbListing {
  id: number;
  make?: string;
  title: string;
  description?: string;
  finish?: string;
  condition?: { display_name?: string };
  categories?: { full_name?: string }[];
  state?: { slug?: string };
  price?: { amount: string; currency: string };
  buyer_price?: { amount: string; currency: string };
  photos?: { _links?: { large_crop?: { href?: string }; full?: { href?: string } } }[];
  _links?: { web?: { href?: string } };
}

function toListing(l: ReverbListing): MarketplaceListing | null {
  const priceInfo = l.buyer_price ?? l.price;
  const url = l._links?.web?.href;
  if (!priceInfo || !url) return null; // unusable without a price and a source link

  const photo = l.photos?.[0]?._links;
  // First segment of e.g. "Electric Guitars / Solid Body" as our category slug.
  const category =
    l.categories?.[0]?.full_name?.split("/")[0]?.trim().toLowerCase() || "music gear";

  return {
    source: "reverb",
    externalId: String(l.id),
    title: l.title,
    description: stripHtml(l.description ?? ""),
    brand: l.make || null,
    category,
    size: null,
    color: l.finish || null,
    condition: l.condition?.display_name?.toLowerCase() ?? null,
    imageUrl: photo?.large_crop?.href ?? photo?.full?.href ?? null,
    url,
    price: Number(priceInfo.amount),
    currency: priceInfo.currency,
    isActive: l.state?.slug === "live",
  };
}

export function createReverbAdapter(token: string): MarketplaceAdapter {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Accept-Version": "3.0",
    Accept: "application/hal+json",
    "Content-Type": "application/hal+json",
    // Keep the whole app in EUR: Reverb converts prices server-side.
    "X-Display-Currency": "EUR",
  };

  return {
    source: "reverb",

    async search(query: string, limit: number): Promise<MarketplaceListing[]> {
      const perPage = Math.min(limit, 50);
      const res = await fetch(
        `${API_BASE}/listings?query=${encodeURIComponent(query)}&per_page=${perPage}`,
        { headers },
      );
      if (!res.ok) throw new Error(`reverb search "${query}" failed: HTTP ${res.status}`);
      const body = (await res.json()) as { listings?: ReverbListing[] };
      return (body.listings ?? [])
        .map(toListing)
        .filter((l): l is MarketplaceListing => l !== null)
        .slice(0, limit);
    },

    async fetchCurrent(externalId: string): Promise<CurrentPrice | null> {
      const res = await fetch(`${API_BASE}/listings/${encodeURIComponent(externalId)}`, {
        headers,
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`reverb fetch ${externalId} failed: HTTP ${res.status}`);
      const l = (await res.json()) as ReverbListing;
      if (l.state?.slug !== "live") return null;
      const priceInfo = l.buyer_price ?? l.price;
      if (!priceInfo) return null;
      return { price: Number(priceInfo.amount), currency: priceInfo.currency };
    },
  };
}
