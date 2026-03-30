-- ============================================================
-- PEKS Database Migration
-- Run this ONCE before starting the upgraded backend
-- ============================================================

-- 1. Add peks_ciphertext column (stores PEKS(publicKey, keyword))
ALTER TABLE documents
  ADD COLUMN peks_ciphertext TEXT DEFAULT NULL
  AFTER keyword_iv;

-- 2. (Optional) drop old keyword columns once migration is verified
-- ALTER TABLE documents
--   DROP COLUMN keyword,
--   DROP COLUMN keyword_hash,
--   DROP COLUMN keyword_iv;

-- ============================================================
-- If you're starting FRESH (no existing data), use this schema:
-- ============================================================
/*
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(100) UNIQUE NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT NOT NULL,
  peks_ciphertext  TEXT NOT NULL,     -- PEKS(pk, keyword) - JSON string
  document         LONGBLOB,          -- AES-256 encrypted file
  iv               VARCHAR(64),       -- AES IV for file
  format           VARCHAR(100) NOT NULL,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
*/
