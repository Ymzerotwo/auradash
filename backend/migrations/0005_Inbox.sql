-- ==========================================
-- AuraDash Inbox Schema
-- ==========================================

-- 1. Inbox Table
-- Stores messages submitted through public contact forms and tracks their lifecycle (unread, read, converted, spam).
CREATE TABLE IF NOT EXISTS Inbox (
    id TEXT PRIMARY KEY,                       -- Unique identifier (UUIDv4)
    full_name TEXT NOT NULL,                   -- Sender's full name
    phone TEXT NOT NULL,                       -- Sender's phone number
    email TEXT NOT NULL,                       -- Sender's email address
    inquiry_type TEXT NOT NULL DEFAULT 'general' CHECK (inquiry_type IN ('general', 'service', 'offer')), -- Type of inquiry
    message TEXT,                              -- The message content
    status TEXT NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'converted', 'spam', 'profile_created')), -- Message lifecycle state
    metadata TEXT,                             -- JSON field storing extra context (e.g., service details, UTM tags)
    
    -- Timestamps and Audit Trail
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Read Audit
    read_at DATETIME,                          -- Timestamp when the message was first opened
    read_by TEXT,                              -- ID of the user who read the message
    
    -- Conversion Audit
    converted_at DATETIME,                     -- Timestamp when the message was converted into a lead/booking
    converted_by TEXT,                         -- ID of the user who converted the message
    
    -- Profile Creation Audit (For General Inquiries)
    profile_created_at DATETIME,               -- Timestamp when a customer profile was created without a booking
    profile_created_by TEXT,                   -- ID of the user who created the profile
    
    -- Spam Audit
    add_to_spam_at DATETIME,                   -- Timestamp when marked as spam
    add_to_spam_by TEXT,                       -- ID of the user who marked it as spam
    spam_reason TEXT,                          -- Reason for marking as spam
    
    -- Foreign Key Constraints linking to the Users table
    FOREIGN KEY (read_by) REFERENCES Users (id) ON DELETE SET NULL,
    FOREIGN KEY (converted_by) REFERENCES Users (id) ON DELETE SET NULL,
    FOREIGN KEY (add_to_spam_by) REFERENCES Users (id) ON DELETE SET NULL,
    FOREIGN KEY (profile_created_by) REFERENCES Users (id) ON DELETE SET NULL
);

-- ==========================================
-- Indexes for Performance Optimization
-- ==========================================

-- Optimize dashboard queries filtering by status and ordered by date (Very common)
CREATE INDEX IF NOT EXISTS idx_inbox_status_created ON Inbox (status, created_at DESC);

-- Optimize searches and filtering by inquiry type
CREATE INDEX IF NOT EXISTS idx_inbox_type ON Inbox (inquiry_type);

-- Optimize searching for messages from specific customers (Anti-spam / Lead history)
CREATE INDEX IF NOT EXISTS idx_inbox_email ON Inbox (email);
CREATE INDEX IF NOT EXISTS idx_inbox_phone ON Inbox (phone);

-- Optimize audit queries for staff performance tracking
CREATE INDEX IF NOT EXISTS idx_inbox_converted_by ON Inbox (converted_by);
CREATE INDEX IF NOT EXISTS idx_inbox_read_by ON Inbox (read_by);
CREATE INDEX IF NOT EXISTS idx_inbox_profile_created_by ON Inbox (profile_created_by);

-- Optimize spam audit checks
CREATE INDEX IF NOT EXISTS idx_inbox_add_to_spam_by ON Inbox (add_to_spam_by);