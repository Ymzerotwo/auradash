-- 1. Create Article_Comments table
CREATE TABLE Article_Comments (
    id TEXT PRIMARY KEY,
    article_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_email TEXT,
    parent_id TEXT,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'spam')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    approved_by TEXT,
    FOREIGN KEY (article_id) REFERENCES Articles(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES Users(id)
);

-- 2. Create indexes for querying and foreign keys
CREATE INDEX idx_comments_article ON Article_Comments(article_id, status);
CREATE INDEX idx_comments_approved_by ON Article_Comments(approved_by);
CREATE INDEX idx_comments_parent ON Article_Comments(parent_id);
CREATE INDEX idx_comments_status ON Article_Comments(status);
