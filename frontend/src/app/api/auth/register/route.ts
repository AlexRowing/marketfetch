import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const displayName =
    typeof body?.displayName === "string" && body.displayName.trim() !== ""
      ? body.displayName.trim()
      : email.split("@")[0];

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const existing = await query<{ id: string }>(
    `SELECT id FROM users WHERE email = $1`,
    [email]
  );
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    );
  }

  const rows = await query<{ id: string }>(
    `INSERT INTO users (email, display_name, password_hash)
     VALUES ($1, $2, $3) RETURNING id`,
    [email, displayName, hashPassword(password)]
  );
  await createSession(rows[0].id);
  return NextResponse.json({ ok: true }, { status: 201 });
}
