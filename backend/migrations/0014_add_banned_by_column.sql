-- Migration to add banned_by column to Users table
ALTER TABLE Users ADD COLUMN banned_by TEXT;
