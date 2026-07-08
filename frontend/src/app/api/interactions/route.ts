import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { DEMO_USER_ID } from "@/lib/demo-user";
import type { InteractionKind } from "@/types";

const KINDS: InteractionKind[] = ["view", "save", "reject", "unsave"];

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const listingId: unknown = body?.listingId;
  const kind: unknown = body?.kind;

  if (
    typeof listingId !== "string" ||
    typeof kind !== "string" ||
    !KINDS.includes(kind as InteractionKind)
  ) {
    return NextResponse.json(
      { error: "expected { listingId: string, kind: view|save|reject|unsave }" },
      { status: 400 }
    );
  }

  try {
    const rows = await query<{ id: string }>(
      `INSERT INTO interactions (user_id, listing_id, kind)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [DEMO_USER_ID, listingId, kind]
    );
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch {
    // Almost always a foreign-key violation: unknown listing id.
    return NextResponse.json({ error: "unknown listing" }, { status: 400 });
  }
}
