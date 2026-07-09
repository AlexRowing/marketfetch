// Curated ingestion queries: what the catalog pulls from each marketplace.
// Sized for the demo (~150 listings total) — bump limits when the catalog
// should grow. Queries skew toward recognizable, budget-friendly used gear.
export interface IngestQuery {
  adapter: string; // MarketplaceAdapter.source
  query: string;
  limit: number;
}

export const INGEST_QUERIES: IngestQuery[] = [
  { adapter: "reverb", query: "fender stratocaster", limit: 15 },
  { adapter: "reverb", query: "fender telecaster", limit: 15 },
  { adapter: "reverb", query: "gibson les paul", limit: 15 },
  { adapter: "reverb", query: "used bass guitar", limit: 15 },
  { adapter: "reverb", query: "acoustic guitar", limit: 15 },
  { adapter: "reverb", query: "analog synthesizer", limit: 15 },
  { adapter: "reverb", query: "drum machine", limit: 15 },
  { adapter: "reverb", query: "overdrive pedal", limit: 15 },
  { adapter: "reverb", query: "delay pedal", limit: 15 },
  { adapter: "reverb", query: "tube amplifier", limit: 15 },
];
