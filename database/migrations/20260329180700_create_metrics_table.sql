-- Migration: 20260329180700_create_metrics_table.sql
-- Dashboard KPI data with period tracking.

CREATE TABLE IF NOT EXISTS metrics (
    id TEXT PRIMARY KEY DEFAULT (
        lower(hex(randomblob(4))) || '-' ||
        lower(hex(randomblob(2))) || '-4' ||
        substr(lower(hex(randomblob(2))),2) || '-' ||
        substr('89ab', abs(random()) % 4 + 1, 1) ||
        substr(lower(hex(randomblob(2))),2) || '-' ||
        lower(hex(randomblob(6)))
    ),
    kpi_name TEXT NOT NULL,
    kpi_value REAL NOT NULL,
    kpi_unit TEXT NOT NULL DEFAULT 'count',
    period_start TEXT NOT NULL,
    period_end TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'operational' CHECK (category IN ('operational', 'security', 'performance', 'financial')),
    notes TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_metrics_kpi ON metrics (kpi_name, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_category ON metrics (category);

CREATE TRIGGER IF NOT EXISTS trg_metrics_updated_at
    AFTER UPDATE ON metrics
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
    BEGIN
        UPDATE metrics SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
