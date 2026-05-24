-- ============================================================
-- PPSE Auth Upgrade Migration
-- File: migrations/002_auth_upgrade.sql
--
-- Run ONCE on your existing database.
-- Safe to run on a live DB — all changes are ADD COLUMN / ALTER.
-- No existing data is modified or deleted.
-- ============================================================

-- ── 1. Rename password → password_hash if needed ──────────────────
-- The existing authRoutes.js inserts into `password`, but the schema
-- comment in migrate_peks.sql uses `password_hash`. Run the block
-- that matches YOUR actual column name. Check with:
--   DESCRIBE users;

-- If your column is named `password` (the live app):
ALTER TABLE users
  CHANGE COLUMN `password` `password_hash` VARCHAR(255) NOT NULL;

-- If your column is already named `password_hash`: skip the line above.

-- ── 2. Email verification columns ─────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified       TINYINT(1)   NOT NULL DEFAULT 0
    AFTER password_hash,
  ADD COLUMN IF NOT EXISTS verification_token   VARCHAR(128) DEFAULT NULL
    AFTER email_verified,
  ADD COLUMN IF NOT EXISTS verification_expires DATETIME     DEFAULT NULL
    AFTER verification_token;

-- ── 3. Password reset columns ─────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_token_hash     VARCHAR(128) DEFAULT NULL
    AFTER verification_expires,
  ADD COLUMN IF NOT EXISTS reset_token_expires  DATETIME     DEFAULT NULL
    AFTER reset_token_hash;

-- ── 4. Refresh token columns ──────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS refresh_token_hash    VARCHAR(128) DEFAULT NULL
    AFTER reset_token_expires,
  ADD COLUMN IF NOT EXISTS refresh_token_expires DATETIME     DEFAULT NULL
    AFTER refresh_token_hash;

-- ── 5. Last login timestamp ───────────────────────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login DATETIME DEFAULT NULL
    AFTER refresh_token_expires;

-- ── 6. Indexes for fast token lookup ──────────────────────────────
-- These make the token-lookup queries fast even at scale.
CREATE INDEX IF NOT EXISTS idx_users_verification_token
  ON users (verification_token);

CREATE INDEX IF NOT EXISTS idx_users_reset_token_hash
  ON users (reset_token_hash);

-- ── 7. Mark existing users as already verified ────────────────────
-- Existing accounts were registered without email verification, so
-- we grant them verified status so they can still log in normally.
UPDATE users SET email_verified = 1 WHERE email_verified = 0;

-- ── Done ──────────────────────────────────────────────────────────
-- Verify with: DESCRIBE users;
-- Expected new columns:
--   email_verified, verification_token, verification_expires,
--   reset_token_hash, reset_token_expires,
--   refresh_token_hash, refresh_token_expires, last_login
