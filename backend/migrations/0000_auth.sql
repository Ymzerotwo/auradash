-- ==========================================
-- AuraDash Authentication Schema
-- ==========================================

-- 1. Users Table
-- Stores all system administrators and staff members.
CREATE TABLE IF NOT EXISTS Users (
    id TEXT PRIMARY KEY,                       -- Unique identifier (UUIDv4)
    email TEXT UNIQUE NOT NULL,                -- User's email address (must be unique)
    full_name TEXT NOT NULL,                   -- User's full display name
    username TEXT UNIQUE NOT NULL,             -- Unique login username
    photo_url TEXT,                            -- Optional URL to the user's profile photo
    password_hash TEXT NOT NULL,               -- Salted PBKDF2 hash of the password
    role TEXT NOT NULL CHECK (role IN ('Admin', 'User')), -- System role for permission levels ('Admin' or 'User')
    permissions JSON,                          -- Granular JSON permissions (e.g., {"articles": {"write": true}})
    job_title TEXT,                            -- Job title or role description of the staff member
    is_banned INTEGER DEFAULT 0,               -- Account ban flag (1 = banned, 0 = clean)
    banned_by TEXT,                            -- ID of the user who banned this account (self-referencing Users.id)
    password_updated_at DATETIME,              -- Timestamp of the last password update
    password_updated_by TEXT,                  -- User ID who updated the password, or 'self' if updated by user themselves
    created_by TEXT,                           -- ID of the user who created this account (self-referencing Users.id)
    updated_by TEXT,                           -- ID of the user who last updated this account (self-referencing Users.id)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp of user registration
    updated_at DATETIME,                       -- Timestamp of the last profile update
    FOREIGN KEY (created_by) REFERENCES Users (id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES Users (id) ON DELETE SET NULL,
    FOREIGN KEY (banned_by) REFERENCES Users (id) ON DELETE SET NULL
);

-- Optimize login and lookup queries
CREATE INDEX IF NOT EXISTS idx_users_username ON Users (username);
CREATE INDEX IF NOT EXISTS idx_users_email ON Users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON Users (role);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON Users (created_by);
CREATE INDEX IF NOT EXISTS idx_users_updated_by ON Users (updated_by);
CREATE INDEX IF NOT EXISTS idx_users_banned_by ON Users (banned_by);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON Users (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_is_banned ON Users (is_banned);

-- 2. Sessions Table [DISABLED]
-- Disallowed per project specifications; sessions are managed purely statelessly in Cloudflare KV.
/*
CREATE TABLE Sessions (
    id TEXT PRIMARY KEY,                       -- Unique session identifier
    user_id TEXT NOT NULL,                     -- Foreign key reference to Users
    expires_at DATETIME NOT NULL,              -- Session expiration timestamp
    is_revoked INTEGER DEFAULT 0,              -- Revocation flag (1 = revoked, 0 = active)
    user_agent TEXT,                           -- Client device browser signature
    ip_address TEXT,                           -- Client connecting IP address
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp of session creation
    FOREIGN KEY (user_id) REFERENCES Users (id) ON DELETE CASCADE
);

CREATE INDEX idx_sessions_user_id ON Sessions (user_id);
CREATE INDEX idx_sessions_expires_at ON Sessions (expires_at);
*/

-- 3. Verification Codes Table
-- Stores temporary 6-digit codes for password recovery and 2FA.
CREATE TABLE IF NOT EXISTS VerificationCodes (
    id TEXT PRIMARY KEY,                       -- Unique identifier (UUIDv4)
    user_id TEXT NOT NULL,                     -- Foreign key reference to Users (relates to Users.id)
    code TEXT NOT NULL,                        -- Temporary 6-digit OTP verification code
    expires_at DATETIME NOT NULL,              -- Expiration timestamp of the OTP code
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP, -- Timestamp of verification code generation
    FOREIGN KEY (user_id) REFERENCES Users (id) ON DELETE CASCADE
);

-- Optimize lookups on VerificationCodes table
CREATE INDEX IF NOT EXISTS idx_verification_code ON VerificationCodes (code);
-- Composite index for fast OTP validation queries (WHERE user_id = ? AND code = ?)
CREATE INDEX IF NOT EXISTS idx_verification_user_code ON VerificationCodes (user_id, code);

-- Seed the default System Administrator account on first deployment.
-- This migration runs automatically when D1 migrations execute during deploy.
-- Default credentials: username = admin / password = AuraDash@2026
-- IMPORTANT: Change the default password immediately after first login.
--
-- The WHERE NOT EXISTS guard ensures this INSERT is idempotent:
-- if an Admin already exists (e.g., from a previous deployment), this is a no-op.
INSERT INTO Users (
    id,
    email,
    full_name,
    username,
    password_hash,
    role,
    permissions,
    is_banned
)
SELECT
    'a0000000-0000-0000-0000-000000000001',
    'admin@auradash.local',
    'System Administrator',
    'admin',
    '24c62f1485d8d848b5bcd573c087159fb501e9e8a13c88bea8af55a110af4649:6522ba925395bfeb7f9ecc4132675319e0a752dcc238b28073ad053236e12afe',
    'Admin',
    '{}',
    0
WHERE NOT EXISTS (
    SELECT 1 FROM Users WHERE role = 'Admin'
);