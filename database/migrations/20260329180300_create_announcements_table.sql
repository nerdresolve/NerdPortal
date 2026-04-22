-- Migration: 20260329180300_create_announcements_table.sql

CREATE TABLE announcements (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    is_pinned INTEGER NOT NULL DEFAULT 0,
    published_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX idx_announcements_published ON announcements (published_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_announcements_author ON announcements (author_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_announcements_updated_at
    AFTER UPDATE ON announcements
    FOR EACH ROW
BEGIN
    UPDATE announcements SET updated_at = datetime('now') WHERE id = NEW.id;
END;
