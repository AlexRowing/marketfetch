import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { recomputeTasteEmbedding } from "@/lib/taste";
import type { InteractionKind } from "@/types";

const KINDS: InteractionKind[] = ["view", "save", "reject", "unsave"];

export async function POST(request: Request) {
  const user = await getSessionUser();
  // Guests can interact, but nothing is persisted: accept the action as a
  // no-op so the optimistic UI stays put without writing to the DB.
  if (!user) {
    return NextResponse.json({ ok: true, guest: true }, { status: 200 });
  }

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
      [user.id, listingId, kind]
    );
    // Synchronous per docs/database-schema.md open decision #2. If this
    // gets slow with more listings, move it to the backend worker.
    await recomputeTasteEmbedding(user.id).catch((err) =>
      console.error("taste recompute failed:", err)
    );
    return NextResponse.json({ id: rows[0].id }, { status: 201 });
  } catch {
    // Almost always a foreign-key violation: unknown listing id.
    return NextResponse.json({ error: "unknown listing" }, { status: 400 });
  }
}
