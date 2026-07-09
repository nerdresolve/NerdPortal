-- Migration: 20260707000000_add_deleted_at_to_metrics.sql
-- Switches metrics deletion from hard delete to soft delete, matching the
-- pattern used by announcements, documents, systems and team_members.

ALTER TABLE metrics ADD COLUMN deleted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_metrics_kpi_active ON metrics (kpi_name, period_start DESC) WHERE deleted_at IS NULL;
