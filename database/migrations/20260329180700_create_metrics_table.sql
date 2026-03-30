-- Migration: 20260329180700_create_metrics_table.sql
-- Dashboard KPI data with period tracking.

CREATE TABLE metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_name TEXT NOT NULL,
    kpi_value NUMERIC NOT NULL,
    kpi_unit TEXT NOT NULL DEFAULT 'count',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    category TEXT NOT NULL DEFAULT 'operational' CHECK (category IN ('operational', 'security', 'performance', 'financial')),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_metrics_kpi ON metrics (kpi_name, period_start DESC);
CREATE INDEX idx_metrics_category ON metrics (category);

CREATE TRIGGER trg_metrics_updated_at
    BEFORE UPDATE ON metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
