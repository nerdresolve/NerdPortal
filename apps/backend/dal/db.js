const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, "../../../itportal.db");

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function normalizeSql(sql) {
  return sql.replace(/\$\d+/g, "?");
}

function normalizeRow(row) {
  if (!row || typeof row !== "object") return row;
  const out = {};
  for (const [k, v] of Object.entries(row)) {
    if (typeof v === "number" && (k.startsWith("is_") || k === "is_pinned")) {
      out[k] = v !== 0;
    } else {
      out[k] = v;
    }
  }
  return out;
}

function runQuery(sql, params = []) {
  const normalized = normalizeSql(sql);
  const upper = normalized.trimStart().toUpperCase();

  if (/^(BEGIN|COMMIT|ROLLBACK)/.test(upper)) {
    db.prepare(normalized).run();
    return { rows: [], rowCount: 0 };
  }

  if (/^(SELECT|WITH)/.test(upper) || /\bRETURNING\b/i.test(normalized)) {
    const rows = db.prepare(normalized).all(...params).map(normalizeRow);
    return { rows, rowCount: rows.length };
  }

  const info = db.prepare(normalized).run(...params);
  return { rows: [], rowCount: info.changes };
}

async function query(sql, params = []) {
  return runQuery(sql, params);
}

function getClient() {
  const client = {
    query(sql, params = []) {
      return Promise.resolve(runQuery(sql, params));
    },
    release() {},
  };
  return Promise.resolve(client);
}

function healthCheck() {
  const row = db.prepare("SELECT datetime('now') AS now").get();
  return Promise.resolve(row);
}

module.exports = { db, query, getClient, healthCheck };
