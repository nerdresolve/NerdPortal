-- Migration: 20260329180500_create_systems_table.sql
-- Internal systems catalog with status tracking.

CREATE TABLE systems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'deprecated', 'offline')),
    category TEXT NOT NULL DEFAULT 'internal' CHECK (category IN ('internal', 'external', 'infrastructure', 'saas')),
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_systems_status ON systems (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_systems_category ON systems (category) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_systems_updated_at
    BEFORE UPDATE ON systems
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
