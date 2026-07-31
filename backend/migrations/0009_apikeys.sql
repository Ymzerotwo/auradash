-- ==============================================================
-- Migration: Add ApiKeys Table
-- ==============================================================
CREATE TABLE IF NOT EXISTS ApiKeys (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  short_key TEXT NOT NULL, -- Format: auradash_pk_{base64_payload}
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES Users(id) ON DELETE SET NULL
);
