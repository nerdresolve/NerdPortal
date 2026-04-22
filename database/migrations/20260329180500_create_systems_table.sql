-- Migration: 20260329180500_create_systems_table.sql

CREATE TABLE systems (
    id TEXT PRIMARY KEY,
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

CREATE INDEX idx_systems_status ON systems (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_systems_category ON systems (category) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_systems_updated_at
    AFTER UPDATE ON systems
    FOR EACH ROW
BEGIN
    UPDATE systems SET updated_at = datetime('now') WHERE id = NEW.id;
END;
