-- Migration: Add Inquiries table for public lead/contact form submissions
CREATE TABLE IF NOT EXISTS Inquiries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    service_id TEXT,
    category_id TEXT,
    message TEXT,
    status TEXT DEFAULT 'new',
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES Services(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES Categories(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_inquiries_status ON Inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON Inquiries(created_at DESC);
