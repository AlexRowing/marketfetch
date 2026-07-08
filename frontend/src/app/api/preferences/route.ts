import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/demo-user";
import type { PreferenceKind } from "@/types";

const KINDS: PreferenceKind[] = ["brand", "size", "color", "category_budget"];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const kind: unknown = body?.kind;
  const value: unknown = body?.value;
  const numericValue: unknown = body?.numericValue ?? null;

  if (
    typeof kind !== "string" ||
    !KINDS.includes(kind as PreferenceKind) ||
    typeof value !== "string" ||
    value.trim() === "" ||
    (numericValue !== null && typeof numericValue !== "number")
  ) {
    return NextResponse.json(
      { error: "expected { kind, value, numericValue? }" },
      { status: 400 }
    );
  }

  const rows = await query<{ id: string }>(
    `INSERT INTO user_preferences (user_id, kind, value, numeric_value, source)
     VALUES ($1, $2, $3, $4, 'explicit')
     ON CONFLICT (user_id, kind, value) DO UPDATE SET numeric_value = $4
     RETURNING id`,
    [DEMO_USER_ID, kind, value.trim(), numericValue]
  );
  return NextResponse.json({ id: rows[0].id }, { status: 201 });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  const id: unknown = body?.id;
  if (typeof id !== "string") {
    return NextResponse.json({ error: "expected { id }" }, { status: 400 });
  }
  await query(
    `DELETE FROM user_preferences WHERE id = $1 AND user_id = $2`,
    [id, DEMO_USER_ID]
  );
  return NextResponse.json({ ok: true });
}
