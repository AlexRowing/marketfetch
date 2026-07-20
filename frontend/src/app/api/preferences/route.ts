import crypto from "crypto";
import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import type { PreferenceKind } from "@/types";

const KINDS: PreferenceKind[] = ["brand", "size", "color", "category_budget"];

export async function POST(request: Request) {
  const user = await getSessionUser();
  // Guests can add preferences in the UI, but they aren't saved: hand back a
  // throwaway id so the optimistic chip sticks for the session without writing.
  if (!user) {
    return NextResponse.json(
      { id: `guest-${crypto.randomUUID()}` },
      { status: 200 }
    );
  }

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
    [user.id, kind, value.trim(), numericValue]
  );
  return NextResponse.json({ id: rows[0].id }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  // Guests have nothing persisted to delete; treat removal as a no-op success.
  if (!user) {
    return NextResponse.json({ ok: true, guest: true }, { status: 200 });
  }

  const body = await request.json().catch(() => null);
  const id: unknown = body?.id;
  if (typeof id !== "string") {
    return NextResponse.json({ error: "expected { id }" }, { status: 400 });
  }
  await query(
    `DELETE FROM user_preferences WHERE id = $1 AND user_id = $2`,
    [id, user.id]
  );
  return NextResponse.json({ ok: true });
}
