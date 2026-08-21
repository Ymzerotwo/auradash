-- ==========================================
-- AuraDash Services & service_category Schema
-- ==========================================

-- 1. service_category Table
-- Stores all parent departments/categservice_categoryories for services.
-- @CRITICAL: service_category form the root of the hierarchy. Deleting a user who created a category 
-- will only SET NULL (to preserve the taxonomy), but deleting the Category itself 
-- will CASCADE destroy all underlying services to avoid orphaned database records.
CREATE TABLE IF NOT EXISTS
    service_category (
        id TEXT PRIMARY KEY, -- Unique identifier (UUIDv4)
        name TEXT NOT NULL, -- Display name of the category
        slug TEXT UNIQUE NOT NULL, -- Unique URL slug for category routing
        meta_data JSON, -- Additional custom attributes (e.g. icon, image, description)
        seo_data JSON, -- SEO metadata (e.g., meta title, description)
        sort_order INTEGER DEFAULT 0, -- Sorting order weight for lists
        is_active INTEGER DEFAULT 1, -- Active status flag (1 = active, 0 = inactive)
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp of category creation
        created_by TEXT, -- User ID who created this category (refers to Users.id)
        updated_at DATETIME, -- Timestamp of the last category update
        updated_by TEXT, -- User ID who last updated this category (refers to Users.id)
        FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL,
        FOREIGN KEY (updated_by) REFERENCES Users (id) ON DELETE SET NULL
    );

-- @CRITICAL: Optimization indexes ensuring blazing fast pagination and active filtering.
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON service_category (is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON service_category (sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_created_by ON service_category (created_by);
CREATE INDEX IF NOT EXISTS idx_categories_updated_by ON service_category (updated_by);
CREATE INDEX IF NOT EXISTS idx_categories_created_at ON service_category (created_at DESC);

-- 2. Services Table
-- Stores all individual services offered under categories.
CREATE TABLE IF NOT EXISTS
    Services (
        id TEXT PRIMARY KEY, -- Unique identifier (UUIDv4)
        service_category_id TEXT, -- Foreign key reference to service_category (relates to service_category.id)
        name TEXT NOT NULL, -- Name of the service
        slug TEXT UNIQUE NOT NULL, -- Unique URL slug for service routing
        meta_data JSON, -- Additional custom attributes for the service
        seo_data JSON, -- SEO metadata for the service
        is_active INTEGER DEFAULT 1, -- Active status flag (1 = active, 0 = inactive)
        sort_order INTEGER DEFAULT 0, -- Sorting order weight for lists
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp of service creation
        created_by TEXT, -- User ID who created this service (refers to Users.id)
        updated_at DATETIME, -- Timestamp of the last service update
        updated_by TEXT, -- User ID who last updated this service (refers to Users.id)
        -- @CRITICAL: ON DELETE CASCADE guarantees referential integrity when a category is wiped.
        FOREIGN KEY (service_category_id) REFERENCES service_category (id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL,
        FOREIGN KEY (updated_by) REFERENCES Users (id) ON DELETE SET NULL
    );

-- Optimize service queries and joins
CREATE INDEX IF NOT EXISTS idx_services_is_active ON Services (is_active);
CREATE INDEX IF NOT EXISTS idx_services_category_active ON Services (service_category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_services_slug ON Services (slug);
CREATE INDEX IF NOT EXISTS idx_services_sort ON Services (sort_order);
CREATE INDEX IF NOT EXISTS idx_services_created_by ON Services (created_by);
CREATE INDEX IF NOT EXISTS idx_services_updated_by ON Services (updated_by);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON Services (created_at DESC);