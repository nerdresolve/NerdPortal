const { Pool } = require("pg");
const bcrypt = require("bcrypt");

const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
  database: process.env.POSTGRES_DB || "itportal",
  user: process.env.POSTGRES_USER || "itportal_user",
  password: process.env.POSTGRES_PASSWORD,
});

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);

const ADMIN_EMAIL = "admin@bravante.com.br";
const ADMIN_PASSWORD = "Admin@ITPortal2026";
const ADMIN_NAME = "Administrador TI";

async function seed() {
  const client = await pool.connect();

  try {
    const existing = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [ADMIN_EMAIL]
    );

    if (existing.rows.length > 0) {
      console.log("Admin user already exists. Skipping seed.");
      return;
    }

    const hash = await bcrypt.hash(ADMIN_PASSWORD, BCRYPT_ROUNDS);

    await client.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, 'admin')`,
      [ADMIN_EMAIL, hash, ADMIN_NAME]
    );

    console.log("Admin user created: %s", ADMIN_EMAIL);
    console.log("Default password: %s", ADMIN_PASSWORD);
    console.log("IMPORTANT: Change this password after first login.");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
