-- Migration: 20260401000000_add_description_to_team_members.sql

ALTER TABLE team_members ADD COLUMN description TEXT;
