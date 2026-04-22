-- Migration: 20260329180600_create_team_members_table.sql

CREATE TABLE team_members (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    job_title TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    photo_url TEXT,
    department TEXT NOT NULL DEFAULT 'TI',
    is_active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX idx_team_members_active ON team_members (is_active, sort_order) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_team_members_updated_at
    AFTER UPDATE ON team_members
    FOR EACH ROW
BEGIN
    UPDATE team_members SET updated_at = datetime('now') WHERE id = NEW.id;
END;
