-- Migration: 20260401000000_add_description_to_team_members.sql
-- Adds optional free-text description/bio field to team member profiles.

ALTER TABLE team_members ADD COLUMN IF NOT EXISTS description TEXT;
