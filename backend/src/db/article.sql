-- ==========================================
-- AuraDash Articles Schema
-- ==========================================

-- 1. Article_Categories Table
-- Stores the parent categories for articles.
CREATE TABLE Article_Categories (
    id TEXT PRIMARY KEY,                       -- Unique identifier (UUIDv4)
    title TEXT NOT NULL,                       -- Main category title (displayed in page header)
    slug TEXT UNIQUE NOT NULL,                 -- Clean URL slug (e.g., tech-articles), must be unique for routing
    excerpt TEXT,                              -- Short summary of the category (used in external cards)
    preview_image_url TEXT,                    -- Preview image URL (used in external cards or category header)
    meta_data JSON,                            -- Flexible JSON metadata
    seo_data JSON,                             -- JSON data for Search Engine Optimization
    sort_order INTEGER DEFAULT 0,              -- Sorting priority (0 means default, 1+ higher priority)
    is_active INTEGER DEFAULT 1,               -- Visibility flag (1 = active, 0 = inactive)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp of category creation
    created_by TEXT,                           -- ID of the user who created this category (references Users.id)
    updated_at DATETIME,                       -- Timestamp of the last update
    updated_by TEXT,                           -- ID of the user who last updated this category (references Users.id)
    FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES Users (id) ON DELETE SET NULL
);

-- Optimize queries for categories
CREATE INDEX idx_article_categories_is_active ON Article_Categories (is_active);
CREATE INDEX idx_article_categories_slug ON Article_Categories (slug);
CREATE INDEX idx_article_categories_sort ON Article_Categories (sort_order);
CREATE INDEX idx_article_categories_title ON Article_Categories (title);

-- --------------------------------------------------------
-- 2. Articles Table
-- Stores individual articles linked to categories.
CREATE TABLE Articles (
    id TEXT PRIMARY KEY,                       -- Unique identifier (UUIDv4)
    category_id TEXT,                          -- Foreign key reference to Article_Categories
    title TEXT NOT NULL,                       -- Main article title
    slug TEXT UNIQUE NOT NULL,                 -- Clean URL slug, must be unique for routing
    excerpt TEXT,                              -- Short summary of the article
    preview_image_url TEXT,                    -- Preview image URL
    reading_time_minutes INTEGER,              -- Estimated reading time in minutes
    author_id TEXT,                            -- ID of the author (references Users.id)
    published_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Publishing timestamp
    meta_data JSON,                            -- Flexible JSON metadata
    seo_data JSON,                             -- JSON data for Search Engine Optimization
    is_active INTEGER DEFAULT 1,               -- Visibility flag (1 = active, 0 = inactive)
    sort_order INTEGER DEFAULT 0,              -- Sorting priority
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp of article creation
    created_by TEXT,                           -- ID of the user who created this article (references Users.id)
    updated_at DATETIME,                       -- Timestamp of the last update
    updated_by TEXT,                           -- ID of the user who last updated this article (references Users.id)
    FOREIGN KEY (category_id) REFERENCES Article_Categories (id) ON DELETE SET NULL,
    FOREIGN KEY (author_id) REFERENCES Users (id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES Users (id) ON DELETE SET NULL
);

-- Optimize queries for articles
CREATE INDEX idx_articles_is_active ON Articles (is_active);
CREATE INDEX idx_articles_category_active ON Articles (category_id, is_active);
CREATE INDEX idx_articles_published ON Articles (published_at DESC);
CREATE INDEX idx_articles_slug ON Articles (slug);
CREATE INDEX idx_articles_title ON Articles (title);
CREATE INDEX idx_articles_author ON Articles (author_id);
-- Composite index for optimal category page rendering (filtering by category, active status, sorted by publish date)
CREATE INDEX idx_articles_category_active_published ON Articles (category_id, is_active, published_at DESC);

-- Indexes for sorting by creation date and referencing audits
CREATE INDEX IF NOT EXISTS idx_article_categories_created_at ON Article_Categories (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_categories_created_by ON Article_Categories (created_by);
CREATE INDEX IF NOT EXISTS idx_article_categories_updated_by ON Article_Categories (updated_by);
CREATE INDEX IF NOT EXISTS idx_articles_created_at ON Articles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_created_by ON Articles (created_by);
CREATE INDEX IF NOT EXISTS idx_articles_updated_by ON Articles (updated_by);