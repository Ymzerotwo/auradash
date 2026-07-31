-- Migration to remove is_active column and add password update tracking columns
ALTER TABLE Users DROP COLUMN is_active;
ALTER TABLE Users ADD COLUMN password_updated_at DATETIME;
ALTER TABLE Users ADD COLUMN password_updated_by TEXT;
