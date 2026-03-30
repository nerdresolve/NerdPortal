-- Migration: 20260329180100_create_sessions_table.sql
-- Server-side session store for express-session (connect-pg-simple compatible).

CREATE TABLE sessions (
    sid TEXT PRIMARY KEY NOT NULL,
    sess JSONB NOT NULL,
    expire TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sessions_expire ON sessions (expire);
