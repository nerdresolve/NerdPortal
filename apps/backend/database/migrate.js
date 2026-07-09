const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { v4: uuidv4 } = require("uuid");
const { DB_PATH } = require("../config/dbPath");

const MIGRATIONS_DIR = path.resolve(__dirname, "../../../database/migrations");

function run() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.function("gen_random_uuid", () => uuidv4());

  db.prepare(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      executed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();

  const executed = new Set(
    db.prepare("SELECT filename FROM _migrations ORDER BY filename").all().map((r) => r.filename)
  );

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

    const migrate = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO _migrations (filename) VALUES (?)").run(file);
    });

    try {
      migrate();
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
