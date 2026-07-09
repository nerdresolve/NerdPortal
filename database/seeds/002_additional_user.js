const path = require("path");
const { createRequire } = require("module");

const requireBackend = createRequire(
  path.join(__dirname, "../../apps/backend/package.json")
);
const Database = requireBackend("better-sqlite3");
const bcrypt = requireBackend("bcryptjs");
const { v4: uuidv4 } = requireBackend("uuid");
const { DB_PATH } = requireBackend("./config/dbPath");

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);

const USER_EMAIL = "admin@example.com";
const USER_PASSWORD = process.env.ADMIN_SEED_PASSWORD;
const USER_NAME = "IT Administrator";
const USER_ROLE = "admin";

async function seed() {
  if (!USER_PASSWORD) {
    console.log("ADMIN_SEED_PASSWORD not set. Skipping seed for %s.", USER_EMAIL);
    return;
  }

  const db = new Database(DB_PATH);
  db.pragma("foreign_keys = ON");

  try {
    const hash = await bcrypt.hash(USER_PASSWORD, BCRYPT_ROUNDS);
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(USER_EMAIL);

    if (existing) {
      db.prepare(
        "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?"
      ).run(hash, existing.id);
      console.log("User already existed, password updated: %s", USER_EMAIL);
      return;
    }

    const id = uuidv4();

    db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, role)
       VALUES (?, ?, ?, ?, ?)`
    ).run(id, USER_EMAIL, hash, USER_NAME, USER_ROLE);

    console.log("User created: %s", USER_EMAIL);
  } finally {
    db.close();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
