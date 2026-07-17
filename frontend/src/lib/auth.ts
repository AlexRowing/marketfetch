// Server-only module (imports pg via lib/db) - never import from client components.
import crypto from "crypto";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

/**
 * Zero-dependency auth: scrypt password hashes (users.password_hash) and an
 * HMAC-SHA256-signed session token in an httpOnly cookie. Set/cleared only in
 * route handlers (Next 16: cookies() is async; writes are handler-only).
 */

const COOKIE = "marketfetch.session";
const SESSION_DAYS = 30;
const SCRYPT = { N: 16384, r: 8, p: 1, keyLen: 64 };

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

// ---------- passwords (format: s1$<saltHex>$<scryptHex>) ----------

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keyLen, SCRYPT);
  return `s1$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [version, saltHex, hashHex] = stored.split("$");
  if (version !== "s1" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(
    password,
    Buffer.from(saltHex, "hex"),
    expected.length,
    SCRYPT
  );
  return crypto.timingSafeEqual(actual, expected);
}

// ---------- session token (userId.expiresAt.hmac) ----------

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

function makeToken(userId: string): string {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${userId}.${expires}`;
  return `${payload}.${sign(payload)}`;
}

/** Returns the userId for a valid, unexpired token; null otherwise. */
function parseToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expires, mac] = parts;
  const payload = `${userId}.${expires}`;
  const expected = sign(payload);
  if (
    mac.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))
  ) {
    return null;
  }
  if (Number(expires) < Date.now()) return null;
  return userId;
}

// ---------- cookie helpers (route handlers only for set/clear) ----------

export async function createSession(userId: string): Promise<void> {
  (await cookies()).set(COOKIE, makeToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

// ---------- current user ----------

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
}

/**
 * The logged-in user, or null. Validates the cookie signature AND that the
 * user still exists, so stale sessions for deleted accounts don't ghost around.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const userId = parseToken(token);
  if (!userId) return null;
  const rows = await query<{ id: string; email: string; display_name: string }>(
    `SELECT id, email, display_name FROM users WHERE id = $1`,
    [userId]
  );
  const u = rows[0];
  return u ? { id: u.id, email: u.email, displayName: u.display_name } : null;
}
