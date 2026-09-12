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

const ADMIN_EMAIL = process.env.ADMIN_SEED_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_SEED_NAME || "IT Administrator";

async function seed() {
  // There is no built-in default password: an unattended install must never
  // come up with a publicly known admin credential.
  if (!ADMIN_PASSWORD) {
    console.error(
      "ADMIN_SEED_PASSWORD is not set. Refusing to create an admin account."
    );
    console.error("Set it in your .env and run the seed again.");
    process.exit(1);
  }

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
    console.log("IMPORTANT: sign in and change this password now.");
  } finally {
    db.close();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
