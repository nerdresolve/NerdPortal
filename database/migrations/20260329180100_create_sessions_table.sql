-- Migration: 20260329180100_create_sessions_table.sql
-- Server-side session store (express-session compatible).

CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY NOT NULL,
    sess TEXT NOT NULL,
    expire INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions (expire);
