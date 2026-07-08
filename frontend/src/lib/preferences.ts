import { query } from "@/lib/db";
import type { PreferenceKind, PreferenceSource } from "@/types";

export interface Preference {
  id: string;
  kind: PreferenceKind;
  value: string;
  numericValue: number | null;
  source: PreferenceSource;
}

interface PreferenceRow {
  id: string;
  kind: PreferenceKind;
  value: string;
  numeric_value: string | null;
  source: PreferenceSource;
}

export async function getPreferences(userId: string): Promise<Preference[]> {
  const rows = await query<PreferenceRow>(
    `SELECT id, kind, value, numeric_value, source
     FROM user_preferences
     WHERE user_id = $1
     ORDER BY kind, created_at`,
    [userId]
  );
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    value: r.value,
    numericValue: r.numeric_value === null ? null : Number(r.numeric_value),
    source: r.source,
  }));
}
