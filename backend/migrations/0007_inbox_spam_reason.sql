-- Migration number: 0007_inbox_spam_reason
-- Purpose: Add spam_reason column to Inbox table

ALTER TABLE Inbox ADD COLUMN spam_reason TEXT;
