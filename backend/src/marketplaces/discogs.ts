// Discogs (vinyl/music media) — adapter #2.
// Official open API: personal token, mandatory User-Agent, 60 req/min.
// Docs: https://www.discogs.com/developers
//
// Discogs' API has no per-seller listing search, so a "listing" here is a
// RELEASE currently for sale, priced at its LOWEST current ask
// (/marketplace/stats), linking to the release's sell page where every copy
// is listed. Price Memory then tracks "cheapest available copy over time".
// Consequence: `condition` is null — the price aggregates many sellers.
import type { CurrentPrice, MarketplaceAdapter, MarketplaceListing } from "./adapter.js";

const API_BASE = "https://api.discogs.com";
const USER_AGENT = "MarketFetch/0.1 +https://github.com/AlexRowing/marketfetch";
// Discogs allows 60 requests/minute; space calls so ingest and the Lambda
// refresh never trip 429s regardless of network latency.
const MIN_REQUEST_SPACING_MS = 1100;

interface SearchResult {
  id: number;
  master_id?: number; // album-level grouping: many pressings share one master
  title: string; // "Artist - Title"
  year?: string;
  cover_image?: string;
  format?: string[];
  label?: string[];
  genre?: string[];
}

interface MarketStats {
  num_for_sale: number;
  lowest_price: { value: number; currency: string } | null;
  blocked_from_sale: boolean;
}

export function createDiscogsAdapter(token: string): MarketplaceAdapter {
  const headers = {
    Authorization: `Discogs token=${token}`,
    "User-Agent": USER_AGENT,
  };

  let lastRequestAt = 0;
  async function throttledGet(path: string): Promise<Response> {
    const wait = lastRequestAt + MIN_REQUEST_SPACING_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
    return fetch(`${API_BASE}${path}`, { headers });
  }

  async function fetchStats(releaseId: string): Promise<MarketStats | null> {
    const res = await throttledGet(`/marketplace/stats/${releaseId}?curr_abbr=EUR`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`discogs stats ${releaseId} failed: HTTP ${res.status}`);
    return (await res.json()) as MarketStats;
  }

  return {
    source: "discogs",

    async search(query: string, limit: number): Promise<MarketplaceListing[]> {
      const res = await throttledGet(
        `/database/search?q=${encodeURIComponent(query)}&type=release&per_page=${Math.min(limit, 25)}`,
      );
      if (!res.ok) throw new Error(`discogs search "${query}" failed: HTTP ${res.status}`);
      const body = (await res.json()) as { results?: SearchResult[] };

      const listings: MarketplaceListing[] = [];
      // Every pressing is its own release on Discogs; without this, one album
      // query fills the feed with near-identical cards. Keep the first (most
      // relevant) release per master.
      const seenMasters = new Set<number>();
      for (const r of body.results ?? []) {
        if (listings.length >= limit) break;
        const masterKey = r.master_id || r.id;
        if (seenMasters.has(masterKey)) continue;
        seenMasters.add(masterKey);
        const stats = await fetchStats(String(r.id));
        // Only releases someone is actually selling become listings.
        if (!stats || stats.blocked_from_sale || stats.num_for_sale === 0 || !stats.lowest_price) {
          continue;
        }

        const [artist] = r.title.split(" - ");
        const details = [
          r.year,
          r.format?.join(", "),
          r.label?.[0] && `on ${r.label[0]}`,
          r.genre?.length && `Genre: ${r.genre.join(", ")}.`,
        ]
          .filter(Boolean)
          .join(" · ");

        listings.push({
          source: "discogs",
          externalId: String(r.id),
          title: r.title,
          description: `${details} Lowest of ${stats.num_for_sale} copies currently for sale on Discogs.`,
          brand: artist?.trim() || null,
          category: r.genre?.[0]?.toLowerCase() ?? "vinyl",
          size: null,
          color: null,
          condition: null, // aggregate across sellers — no single condition
          imageUrl: r.cover_image ?? null,
          url: `https://www.discogs.com/sell/release/${r.id}`,
          price: stats.lowest_price.value,
          currency: stats.lowest_price.currency,
          isActive: true,
        });
      }
      return listings;
    },

    async fetchCurrent(externalId: string): Promise<CurrentPrice | null> {
      const stats = await fetchStats(externalId);
      if (!stats || stats.blocked_from_sale || stats.num_for_sale === 0 || !stats.lowest_price) {
        return null; // nothing for sale anymore — deactivate
      }
      return { price: stats.lowest_price.value, currency: stats.lowest_price.currency };
    },
  };
}
