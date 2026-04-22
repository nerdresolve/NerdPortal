const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, "../../../itportal.db");
const MIGRATIONS_DIR = path.resolve(__dirname, "../../../database/migrations");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

function ensureMigrationsTable() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      executed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();
}

function getExecutedMigrations() {
  return new Set(
    db.prepare("SELECT filename FROM _migrations ORDER BY filename").all().map((r) => r.filename)
  );
}

function run() {
  ensureMigrationsTable();
  const executed = getExecutedMigrations();

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let applied = 0;

  for (const file of files) {
    if (executed.has(file)) {
      console.log("[SKIP] %s (already applied)", file);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");

    const txn = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO _migrations (filename) VALUES (?)").run(file);
    });

    try {
      txn();
      console.log("[OK]   %s", file);
      applied++;
    } catch (err) {
      console.error("[FAIL] %s: %s", file, err.message);
      process.exit(1);
    }
  }

  console.log("\nMigrations complete. Applied: %d, Skipped: %d", applied, files.length - applied);
  db.close();
}

run();
