import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  // One generic message for every failure mode — don't leak which emails exist.
  const invalid = () =>
    NextResponse.json({ error: "Wrong email or password." }, { status: 401 });

  if (!email || !password) return invalid();

  const rows = await query<{ id: string; password_hash: string | null }>(
    `SELECT id, password_hash FROM users WHERE email = $1`,
    [email]
  );
  const user = rows[0];
  if (!user?.password_hash || !verifyPassword(password, user.password_hash)) {
    return invalid();
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
