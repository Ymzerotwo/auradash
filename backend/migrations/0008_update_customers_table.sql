-- Migration: Add missing columns to Customers table
-- These columns were defined in Customers.sql but never migrated

ALTER TABLE Customers ADD COLUMN gender TEXT;
ALTER TABLE Customers ADD COLUMN date_of_birth DATE;
ALTER TABLE Customers ADD COLUMN city TEXT;
ALTER TABLE Customers ADD COLUMN acquisition_source TEXT;
ALTER TABLE Customers ADD COLUMN tags TEXT;
ALTER TABLE Customers ADD COLUMN last_visit_at DATETIME;
ALTER TABLE Customers ADD COLUMN spam BOOLEAN DEFAULT 0;
ALTER TABLE Customers ADD COLUMN spam_reason TEXT;
ALTER TABLE Customers ADD COLUMN add_spam_by TEXT;
ALTER TABLE Customers ADD COLUMN add_spam_at DATETIME;
ALTER TABLE Customers ADD COLUMN notes TEXT;

-- For Indexes:
CREATE INDEX IF NOT EXISTS idx_customers_last_visit ON Customers (last_visit_at);
CREATE INDEX IF NOT EXISTS idx_customers_spam ON Customers (spam);
CREATE INDEX IF NOT EXISTS idx_customers_source ON Customers (acquisition_source);
