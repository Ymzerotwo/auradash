-- ==========================================
-- AuraDash Web Settings and Media Schema
-- ==========================================

-- Table for business settings (used to feed the landing page and general configurations)
CREATE TABLE Business_Settings (
    id TEXT PRIMARY KEY,                 -- Unique identifier for the settings record
    business_name TEXT NOT NULL,         -- The official name of the business
    logo_url TEXT,                       -- URL to the business logo image
    contact_info JSON,                   -- JSON object storing contact details (email, phone, address, etc.)
    social_links JSON,                   -- JSON object storing social media profile links
    locations JSON,                      -- JSON array storing business branch locations or coordinates
    working_hours JSON,                  -- JSON object storing operational hours
   -- currency TEXT DEFAULT 'USD',         -- Default currency used by the business
   -- timezone TEXT DEFAULT 'UTC',         -- Default timezone of the business operations
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP -- Timestamp of the last update
);

-- Table for media files management (images, documents, etc. uploaded to the platform)
CREATE TABLE Media (
    id TEXT PRIMARY KEY,                 -- Unique identifier for the media file
    file_name TEXT NOT NULL,             -- The original name of the uploaded file (e.g., hero-bg.png)
    file_url TEXT NOT NULL,              -- The public CDN URL (e.g., from Cloudflare R2)
    mime_type TEXT NOT NULL,             -- The MIME type of the file (e.g., image/jpeg, application/pdf)
    size_bytes INTEGER NOT NULL,         -- The size of the file in bytes (useful for storage quotas and client limits)
    alt_text TEXT,                       -- Alternative text for the media, crucial for SEO on the marketing site
    folder TEXT DEFAULT '/',             -- Virtual folder path for organizing files (e.g., /marketing, /products)
    created_by TEXT,                     -- ID of the user who uploaded the media file
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP -- Timestamp when the media was uploaded
);

-- Indexes to optimize filtering, sorting, and searching operations within the dashboard
-- Indexes for Media table
CREATE INDEX idx_media_mime ON Media(mime_type);       -- Speeds up filtering files by type (e.g., showing only images)
CREATE INDEX idx_media_folder ON Media(folder);        -- Speeds up fetching files within a specific virtual folder
CREATE INDEX idx_media_created ON Media(created_at);   -- Speeds up sorting files by upload date (e.g., newest first)
CREATE INDEX idx_media_created_by ON Media(created_by); -- Speeds up finding all media uploaded by a specific user