-- Migration: Add performance indexes to speed up sorting, filtering, and reference checks
CREATE INDEX IF NOT EXISTS idx_article_categories_created_at ON Article_Categories (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_article_categories_created_by ON Article_Categories (created_by);
CREATE INDEX IF NOT EXISTS idx_article_categories_updated_by ON Article_Categories (updated_by);

CREATE INDEX IF NOT EXISTS idx_articles_created_at ON Articles (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_created_by ON Articles (created_by);
CREATE INDEX IF NOT EXISTS idx_articles_updated_by ON Articles (updated_by);

CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON Bookings (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_updated_by ON Bookings (updated_by);

CREATE INDEX IF NOT EXISTS idx_customers_created_at ON Customers (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_add_spam_by ON Customers (add_spam_by);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON Customers (created_by);
CREATE INDEX IF NOT EXISTS idx_customers_updated_by ON Customers (updated_by);

CREATE INDEX IF NOT EXISTS idx_users_created_at ON Users (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON Users (is_banned);

CREATE INDEX IF NOT EXISTS idx_categories_created_at ON service_category (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_created_at ON Services (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_article_comments_status ON Article_Comments (status);
CREATE INDEX IF NOT EXISTS idx_article_comments_user_email ON Article_Comments (user_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inbox_add_to_spam_by ON Inbox (add_to_spam_by);
