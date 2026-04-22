const path = require("path");
const { createRequire } = require("module");

const requireBackend = createRequire(
  path.join(__dirname, "../../apps/backend/package.json")
);
const Database = requireBackend("better-sqlite3");
const bcrypt = requireBackend("bcryptjs");
const { v4: uuidv4 } = requireBackend("uuid");

const DB_PATH = process.env.SQLITE_DB_PATH || path.join(__dirname, "../../itportal.db");
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);

const ADMIN_EMAIL = "admin@bravante.com.br";
const ADMIN_PASSWORD = "Admin@ITPortal2026";
const ADMIN_NAME = "Administrador TI";

async function seed() {
  const db = new Database(DB_PATH);
  db.pragma("foreign_keys = ON");

  try {
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(ADMIN_EMAIL);

    if (existing) {
      console.log("Admin user already exists. Skipping seed.");
      return;
    }

    const hash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);
    const id = uuidv4();

    db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, role)
       VALUES (?, ?, ?, ?, 'admin')`
    ).run(id, ADMIN_EMAIL, hash, ADMIN_NAME);

    console.log("Admin user created: %s", ADMIN_EMAIL);
    console.log("Default password: %s", ADMIN_PASSWORD);
    console.log("IMPORTANT: Change this password after first login.");
  } finally {
    db.close();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
