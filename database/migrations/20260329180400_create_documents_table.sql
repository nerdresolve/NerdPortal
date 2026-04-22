-- Migration: 20260329180400_create_documents_table.sql

CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'policy', 'procedure', 'template', 'report')),
    description TEXT,
    uploader_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    deleted_at TEXT
);

CREATE INDEX idx_documents_category ON documents (category) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_uploader ON documents (uploader_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_created ON documents (created_at DESC) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_documents_updated_at
    AFTER UPDATE ON documents
    FOR EACH ROW
BEGIN
    UPDATE documents SET updated_at = datetime('now') WHERE id = NEW.id;
END;
