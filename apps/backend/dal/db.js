const Database = require("better-sqlite3");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const DB_PATH =
  process.env.SQLITE_DB_PATH ||
  path.resolve(__dirname, "../../../database/itportal.db");

let _db;

function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    _db.function("gen_random_uuid", () => uuidv4());
  }
  return _db;
}

// Convert PostgreSQL $1, $2, ... placeholders to SQLite ?
function convertPlaceholders(sql) {
  return sql.replace(/\$\d+/g, "?");
}

function isReadQuery(sql) {
  return /^\s*SELECT\b/i.test(sql) || /\bRETURNING\b/i.test(sql);
}

function executeQuery(db, rawSql, params) {
  const sql = convertPlaceholders(rawSql);
  const stmt = db.prepare(sql);
  if (isReadQuery(sql)) {
    const rows = stmt.all(params);
    return { rows, rowCount: rows.length };
  }
  const info = stmt.run(params);
  return { rows: [], rowCount: info.changes };
}

async function query(text, params = []) {
  return executeQuery(getDb(), text, params);
}

async function getClient() {
  const db = getDb();
  let inTransaction = false;

  return {
    async query(text, params = []) {
      if (/^\s*BEGIN\b/i.test(text)) {
        db.prepare("BEGIN").run();
        inTransaction = true;
        return { rows: [], rowCount: 0 };
      }
      if (/^\s*COMMIT\b/i.test(text)) {
        db.prepare("COMMIT").run();
        inTransaction = false;
        return { rows: [], rowCount: 0 };
      }
      if (/^\s*ROLLBACK\b/i.test(text)) {
        db.prepare("ROLLBACK").run();
        inTransaction = false;
        return { rows: [], rowCount: 0 };
      }
      return executeQuery(db, text, params);
    },
    release() {
      if (inTransaction) {
        try {
          db.prepare("ROLLBACK").run();
        } catch (_) {}
        inTransaction = false;
      }
    },
  };
}

async function healthCheck() {
  const db = getDb();
  return db.prepare("SELECT datetime('now') AS now").get();
}

module.exports = { query, getClient, healthCheck, getDb };
