-- Seed the default System Administrator account on first deployment.
-- This migration runs automatically when D1 migrations execute during deploy.
-- Default credentials: username = admin / password = AuraDash@2026
-- IMPORTANT: Change the default password immediately after first login.
--
-- The WHERE NOT EXISTS guard ensures this INSERT is idempotent:
-- if an Admin already exists (e.g., from a previous deployment), this is a no-op.

INSERT INTO Users (id, email, full_name, username, password_hash, role, permissions, is_active, is_banned)
SELECT
    'a0000000-0000-0000-0000-000000000001',
    'admin@auradash.local',
    'System Administrator',
    'admin',
    '1c1c44e38df284c6ccbf4b56b6bb70c0d32978c160e7c4f0001be2b4b968d1a0:5f883d3b72b610c6a738f71b270008d02a2f250d136527931c1c25b417d3643f',
    'Admin',
    '{}',
    1,
    0
WHERE NOT EXISTS (
    SELECT 1 FROM Users WHERE role = 'Admin'
);
