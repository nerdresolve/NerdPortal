-- Migration: 20260329180500_create_systems_table.sql
-- Internal systems catalog with status tracking.

CREATE TABLE IF NOT EXISTS systems (
    id TEXT PRIMARY KEY DEFAULT (
        lower(hex(randomblob(4))) || '-' ||
        lower(hex(randomblob(2))) || '-4' ||
        substr(lower(hex(randomblob(2))),2) || '-' ||
        substr('89ab', abs(random()) % 4 + 1, 1) ||
        substr(lower(hex(randomblob(2))),2) || '-' ||
        lower(hex(randomblob(6)))
    ),
    name TEXT NOT NULL,
    url TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'deprecated', 'offline')),
    category TEXT NOT NULL DEFAULT 'internal' CHECK (category IN ('internal', 'external', 'infrastructure', 'saas')),
    owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_systems_status ON systems (status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_systems_category ON systems (category) WHERE deleted_at IS NULL;

CREATE TRIGGER IF NOT EXISTS trg_systems_updated_at
    AFTER UPDATE ON systems
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
    BEGIN
        UPDATE systems SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
