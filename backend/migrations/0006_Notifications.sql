-- ==========================================
-- AuraDash Notifications Schema
-- ==========================================

-- 1. Notifications Table
CREATE TABLE IF NOT EXISTS Notifications (
    id TEXT PRIMARY KEY,                       -- Unique identifier (UUIDv4)
    user_id TEXT NOT NULL,                     -- Foreign key to the Users table (recipient of the notification)
    type TEXT NOT NULL,                        -- Type of notification (e.g., NEW_COMMENT, NEW_SERVICE_REQUEST, SYSTEM_ALERT)
    target_id TEXT,                            -- Optional ID of the related entity (e.g., comment ID, order ID)
    message_title TEXT,                        -- Short title or localization key for the notification
    message_body TEXT,                         -- Detailed message content or JSON payload
    url TEXT,                                  -- Direct deep-link URL to navigate when the notification is clicked
    is_read INTEGER DEFAULT 0 CHECK (is_read IN (0, 1)), -- 0 = Unread, 1 = Read
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp of notification creation
    FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- AuraDash (Critical): Optimizes queries for fetching a user's notifications chronologically. 
-- Without this, pagination (`LIMIT ? OFFSET ?`) would cause full table scans.
CREATE INDEX idx_notifications_user_created ON Notifications (user_id, created_at DESC);

-- AuraDash (Critical): Optimizes queries for fetching or updating a user's unread notifications.
-- Extremely important for fast counting of unread badges in the frontend.
CREATE INDEX idx_notifications_user_unread ON Notifications (user_id, is_read);