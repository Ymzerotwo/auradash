-- ==============================================================
-- AuraDash Migration: Add ApiKeys Table
-- ==============================================================
-- 
-- Stores API Key metadata for the AuraDash platform.
-- CRITICAL NOTE: The full generated key is NEVER stored here. 
-- Only the short_key (which includes the payload but not the signature) is saved.
-- 
CREATE TABLE
  IF NOT EXISTS ApiKeys (
    id TEXT PRIMARY KEY, -- Unique Identifier
    name TEXT NOT NULL, -- Key Name or Purpose
    -- Domain: Actual domain for production keys, or simply 'test' for test keys
    domain TEXT NOT NULL,
    -- Short Key: Contains the base data without the signature
    short_key TEXT NOT NULL,
    created_by TEXT, -- User ID of the key creator
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Creation Date and Time
    -- Reference to the user who created this key
    FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL
  );

-- ==============================================================
-- Indexes for Performance Optimization
-- ==============================================================
-- Index to accelerate sorting and fetching by creation date (used in listing)
CREATE INDEX IF NOT EXISTS idx_apikeys_created_at ON ApiKeys (created_at DESC);

-- Index to accelerate fetching keys associated with a specific user
CREATE INDEX IF NOT EXISTS idx_apikeys_created_by ON ApiKeys (created_by);