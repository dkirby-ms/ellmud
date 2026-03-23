-- 009_add_role_to_identities.sql
-- Add role column to player_identities for admin user management.
-- Values: 'player' (default), 'viewer', 'moderator', 'admin'

ALTER TABLE player_identities
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'player';
