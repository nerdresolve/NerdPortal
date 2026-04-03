-- Migration: 20260401010000_create_password_reset_requests_table.sql
-- Stores one-time password reset codes and verification tokens for admin recovery.

CREATE TABLE password_reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    reset_token_hash TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    used_at TIMESTAMPTZ,
    invalidated_at TIMESTAMPTZ,
    last_attempt_at TIMESTAMPTZ,
    request_ip INET,
    request_user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_requests_user_id
    ON password_reset_requests (user_id, created_at DESC);

CREATE INDEX idx_password_reset_requests_email
    ON password_reset_requests (request_email, created_at DESC);

CREATE INDEX idx_password_reset_requests_active
    ON password_reset_requests (request_email, expires_at DESC)
    WHERE used_at IS NULL AND invalidated_at IS NULL;

CREATE TRIGGER trg_password_reset_requests_updated_at
    BEFORE UPDATE ON password_reset_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
