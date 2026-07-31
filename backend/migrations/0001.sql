DROP TABLE IF EXISTS Users;

CREATE TABLE Users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL, 
    email TEXT UNIQUE,             
    full_name TEXT NOT NULL,
    photo_url TEXT,
    job_title TEXT,                -- 👈 هذا هو العمود الجديد الذي سبب المشكلة
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('Admin', 'User')), 
    permissions JSON,              
    is_active INTEGER DEFAULT 1,
    is_banned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON Users(username);
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_role ON Users(role);