-- Migration: 20260329180600_create_team_members_table.sql
-- IT team directory with roles and contact info.

CREATE TABLE IF NOT EXISTS team_members (
    id TEXT PRIMARY KEY DEFAULT (
        lower(hex(randomblob(4))) || '-' ||
        lower(hex(randomblob(2))) || '-4' ||
        substr(lower(hex(randomblob(2))),2) || '-' ||
        substr('89ab', abs(random()) % 4 + 1, 1) ||
        substr(lower(hex(randomblob(2))),2) || '-' ||
        lower(hex(randomblob(6)))
    ),
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

CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members (is_active, sort_order) WHERE deleted_at IS NULL;

CREATE TRIGGER IF NOT EXISTS trg_team_members_updated_at
    AFTER UPDATE ON team_members
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
    BEGIN
        UPDATE team_members SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
