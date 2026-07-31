-- 1. Create Inbox table
CREATE TABLE IF NOT EXISTS Inbox (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    inquiry_type TEXT NOT NULL DEFAULT 'general',
    message TEXT,
    status TEXT NOT NULL DEFAULT 'unread',
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    converted_by TEXT,
    converted_at DATETIME,
    read_at DATETIME,
    read_by TEXT,
    add_to_spam_at DATETIME,
    add_to_spam_by TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inbox_status ON Inbox (status);
CREATE INDEX IF NOT EXISTS idx_inbox_created_at ON Inbox (created_at);
