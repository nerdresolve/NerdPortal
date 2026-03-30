const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
  database: process.env.POSTGRES_DB || "itportal",
  user: process.env.POSTGRES_USER || "itportal_user",
  password: process.env.POSTGRES_PASSWORD,
});

const MIGRATIONS_DIR = path.resolve(__dirname, "../../../database/migrations");

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getExecutedMigrations(client) {
  const result = await client.query(
    "SELECT filename FROM _migrations ORDER BY filename"
  );
  return new Set(result.rows.map((row) => row.filename));
}

async function run() {
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);
    const executed = await getExecutedMigrations(client);

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

      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO _migrations (filename) VALUES ($1)",
          [file]
        );
        await client.query("COMMIT");
        console.log("[OK]   %s", file);
        applied++;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error("[FAIL] %s: %s", file, err.message);
        process.exit(1);
      }
    }

    console.log("\nMigrations complete. Applied: %d, Skipped: %d", applied, files.length - applied);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error("Migration runner failed:", err.message);
  process.exit(1);
});
