-- Add user_id referencing Users(id) to Article_Comments table
ALTER TABLE Article_Comments ADD COLUMN user_id TEXT REFERENCES Users(id) ON DELETE SET NULL;
CREATE INDEX idx_comments_user_id ON Article_Comments(user_id);
