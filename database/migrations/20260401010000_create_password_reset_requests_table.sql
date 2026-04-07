-- Migration: 20260401010000_create_password_reset_requests_table.sql
-- Stores one-time password reset codes and verification tokens for admin recovery.

CREATE TABLE IF NOT EXISTS password_reset_requests (
    id TEXT PRIMARY KEY DEFAULT (
        lower(hex(randomblob(4))) || '-' ||
        lower(hex(randomblob(2))) || '-4' ||
        substr(lower(hex(randomblob(2))),2) || '-' ||
        substr('89ab', abs(random()) % 4 + 1, 1) ||
        substr(lower(hex(randomblob(2))),2) || '-' ||
        lower(hex(randomblob(6)))
    ),
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    reset_token_hash TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    expires_at TEXT NOT NULL,
    verified_at TEXT,
    used_at TEXT,
    invalidated_at TEXT,
    last_attempt_at TEXT,
    request_ip TEXT,
    request_user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_user_id
    ON password_reset_requests (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_email
    ON password_reset_requests (request_email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_password_reset_requests_active
    ON password_reset_requests (request_email, expires_at DESC)
    WHERE used_at IS NULL AND invalidated_at IS NULL;

CREATE TRIGGER IF NOT EXISTS trg_password_reset_requests_updated_at
    AFTER UPDATE ON password_reset_requests
    FOR EACH ROW
    WHEN NEW.updated_at = OLD.updated_at
    BEGIN
        UPDATE password_reset_requests SET updated_at = datetime('now') WHERE id = NEW.id;
    END;
