-- Migration number: 0002 	 2024-06-02T19:00:00Z
-- Create Notifications Table
CREATE TABLE IF NOT EXISTS Notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  target_id TEXT,
  message_title TEXT NOT NULL,
  message_body TEXT NOT NULL,
  url TEXT,
  is_read INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id) ON DELETE CASCADE
);

-- Create indexes for fast querying
CREATE INDEX idx_notifications_user_id ON Notifications (user_id);
CREATE INDEX idx_notifications_is_read ON Notifications (is_read);
CREATE INDEX idx_notifications_created_at ON Notifications (created_at DESC);
