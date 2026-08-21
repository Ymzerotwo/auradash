-- ==========================================
-- AuraDash Article Comments Schema
-- ==========================================

-- 1. Article_Comments Table
-- Stores user comments and admin replies for blog articles, supporting moderation and nested threads.
CREATE TABLE IF NOT EXISTS Article_Comments (
    id TEXT PRIMARY KEY,                       -- Unique identifier (UUIDv4)
    article_id TEXT NOT NULL,                  -- Foreign key reference to the Articles table
    user_name TEXT,                            -- Display name of the commenter (guest or registered)
    user_email TEXT,                           -- Optional email address of the commenter
    parent_id TEXT,                            -- Optional foreign key reference to another comment for nested replies
    user_id TEXT,                              -- Optional foreign key to Users if the reply is from a registered admin/staff
    content TEXT NOT NULL,                     -- The actual text content of the comment
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'spam')), -- Moderation status
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp of comment submission
    approved_at DATETIME,                      -- Timestamp when the comment was approved
    approved_by TEXT,                          -- ID of the user (admin) who approved the comment
    FOREIGN KEY (article_id) REFERENCES Articles (id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES Article_Comments (id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES Users (id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES Users (id) ON DELETE SET NULL
);

-- Optimize queries for fetching approved comments on an article
CREATE INDEX IF NOT EXISTS idx_article_comments_article_status ON Article_Comments (article_id, status);

-- Optimize queries for sorting comments chronologically
CREATE INDEX IF NOT EXISTS idx_article_comments_created_at ON Article_Comments (created_at);

-- Optimize lookups for nested replies
CREATE INDEX IF NOT EXISTS idx_article_comments_parent_id ON Article_Comments (parent_id);

-- Optimize tracking of comments made or approved by specific users
CREATE INDEX IF NOT EXISTS idx_article_comments_user_id ON Article_Comments (user_id);
CREATE INDEX IF NOT EXISTS idx_article_comments_approved_by ON Article_Comments (approved_by);

-- Optimize queries for comments filtered by status globally
CREATE INDEX IF NOT EXISTS idx_article_comments_status ON Article_Comments (status);

-- Optimize fetching comment history by customer email
CREATE INDEX IF NOT EXISTS idx_article_comments_user_email ON Article_Comments (user_email, created_at DESC);