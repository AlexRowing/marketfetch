-- 0003: login. Adds a password hash to users.
-- Format: s1$<saltHex>$<scryptHex> — Node crypto.scrypt (N=16384, r=8, p=1,
-- 64-byte key), verified with timingSafeEqual in frontend/src/lib/auth.ts.
-- NULL means the account has no credentials yet and cannot log in.

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash STRING;
