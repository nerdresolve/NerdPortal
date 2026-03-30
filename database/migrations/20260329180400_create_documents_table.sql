-- Migration: 20260329180400_create_documents_table.sql
-- File repository metadata. Actual files stored in /uploads.

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'policy', 'procedure', 'template', 'report')),
    description TEXT,
    uploader_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_documents_category ON documents (category) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_uploader ON documents (uploader_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_created ON documents (created_at DESC) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
