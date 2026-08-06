import { NextResponse } from "next/server";
import {
  countFeedListings,
  getFeedListings,
  getSearchCandidates,
} from "@/lib/listings";
import { getPreferences } from "@/lib/preferences";
import { scoreListing, tokenize } from "@/lib/search";
import { getSessionUser, ANON_USER_ID } from "@/lib/auth";

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 48;

/**
 * Feed + search over the whole catalog (the page itself only server-renders
 * the first taste-ranked page).
 *
 * ?q=        typo-tolerant search, ranked by relevance + Buyer Memory boosts
 * ?category= exact category filter (combines with q)
 * ?status=   active (default) or sold - sold browses delisted items
 * ?offset/limit= pagination, applied after ranking
 *
 * Search ranks in the route rather than SQL: candidates are fetched
 * taste-ranked and scored with the shared fuzzy scorer, so ties keep taste
 * order and the ranking matches what the client used to compute. Fine at
 * catalog scale for now; move into SQL (trigram) if listings reach 10k+.
 */
export async function GET(request: Request) {
  // Public feed: guests browse unpersonalized via the sentinel viewer id.
  const user = await getSessionUser();
  const viewerId = user?.id ?? ANON_USER_ID;

  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim() ?? "";
  const category = params.get("category")?.trim() || null;
  const status = params.get("status") === "sold" ? "sold" : "active";
  const offset = Math.max(0, Number(params.get("offset")) || 0);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(params.get("limit")) || DEFAULT_LIMIT)
  );

  const tokens = tokenize(q);

  if (tokens.length === 0) {
    const [listings, total] = await Promise.all([
      getFeedListings(viewerId, { status, category, offset, limit }),
      countFeedListings(viewerId, status, category),
    ]);
    return NextResponse.json({
      listings,
      total,
      hasMore: offset + listings.length < total,
    });
  }

  const [candidates, preferences] = await Promise.all([
    getSearchCandidates(viewerId, status, category),
    getPreferences(viewerId),
  ]);
  const ranked = candidates
    .map((item, idx) => ({ item, idx, score: scoreListing(item, tokens, preferences) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.idx - b.idx)
    .map((r) => r.item);

  return NextResponse.json({
    listings: ranked.slice(offset, offset + limit),
    total: ranked.length,
    hasMore: offset + limit < ranked.length,
  });
}
