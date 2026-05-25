-- ============================================================
-- PPSE Migration 003 — Final schema additions
-- Run AFTER 002_auth_upgrade.sql has been applied.
-- Adds columns needed for resend tracking and reset rate limiting.
-- Safe to run on live DB — uses IF NOT EXISTS throughout.
-- ============================================================

-- Verification resend tracking
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS resend_count    INT      NOT NULL DEFAULT 0 AFTER last_login,
  ADD COLUMN IF NOT EXISTS resend_reset_at DATETIME DEFAULT NULL       AFTER resend_count;

-- Password reset rate limiting (separate from verification)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS reset_count    INT      NOT NULL DEFAULT 0 AFTER resend_reset_at,
  ADD COLUMN IF NOT EXISTS reset_reset_at DATETIME DEFAULT NULL        AFTER reset_count;

-- Index for fast verification token lookup (if not already created by 002)
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users (verification_token);
CREATE INDEX IF NOT EXISTS idx_users_reset_token_hash   ON users (reset_token_hash);

-- Verify with: DESCRIBE users;
