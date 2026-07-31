-- Create composite index on Notifications (user_id, is_read) to speed up mark-all-read and unread notifications count operations.
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON Notifications (user_id, is_read);
