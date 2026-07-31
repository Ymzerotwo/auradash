-- ==========================================
-- AuraDash Customers Schema
-- ==========================================

-- 1. Customers Table
-- Stores customer profiles, marketing data, and spam status for marketing and scheduling.
CREATE TABLE IF NOT EXISTS Customers (
    id TEXT PRIMARY KEY,                           -- Unique identifier (UUIDv4)
    full_name TEXT NOT NULL,                       -- Customer's full name
    phone TEXT NOT NULL UNIQUE,                    -- Unique phone number to prevent duplicates and link bookings
    email TEXT NOT NULL UNIQUE,                    -- Unique email address
    
    -- Personal Data for Custom Marketing (Personalization)
    gender TEXT,                                   -- Gender ('male', 'female')
    date_of_birth TEXT,                            -- Date of birth stored as YYYY-MM-DD for birthday offers
    city TEXT,                                     -- Customer's city or region
    
    -- Marketing & Analytics Fields
    acquisition_source TEXT,                       -- How the customer found the business (e.g., 'facebook_ads', 'google')
    tags TEXT,                                     -- JSON string storing category tags (e.g., ["VIP", "Interested in CMS"])
    last_visit_at DATETIME,                        -- Timestamp of the customer's last booking or visit
    
    -- Internal CRM Spam & Ban System
    spam INTEGER DEFAULT 0,                        -- Flag to mark spam/unreliable customers (0 = Active, 1 = Spam)
    spam_reason TEXT,                              -- Reason for marking as spam (e.g., "Missed appointments 3 times")
    add_spam_by TEXT,                              -- ID of the user (staff) who marked them as spam
    add_spam_at DATETIME,                          -- Timestamp when the spam status was set
    
    -- Administrative Fields
    notes TEXT,                                    -- Internal staff notes
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Record creation timestamp
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Record last update timestamp
    created_by TEXT,                               -- ID of the user who created this record
    updated_by TEXT                                -- ID of the user who last updated this record
);

-- Optimize query for listing customers by spam status and sorting chronologically
CREATE INDEX IF NOT EXISTS idx_customers_spam_created ON Customers (spam, created_at DESC);

-- Optimize name-based searches or ordering
CREATE INDEX IF NOT EXISTS idx_customers_full_name ON Customers (full_name);

-- Optimize filtering or analytics by acquisition source
CREATE INDEX IF NOT EXISTS idx_customers_source ON Customers (acquisition_source);

-- Optimize queries tracking last visits
CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON Customers (last_visit_at DESC);

-- Optimize audits and foreign key tracking
CREATE INDEX IF NOT EXISTS idx_customers_add_spam_by ON Customers (add_spam_by);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON Customers (created_by);
CREATE INDEX IF NOT EXISTS idx_customers_updated_by ON Customers (updated_by);