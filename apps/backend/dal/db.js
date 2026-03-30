const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.POSTGRES_HOST || "localhost",
  port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
  database: process.env.POSTGRES_DB || "itportal",
  user: process.env.POSTGRES_USER || "itportal_user",
  password: process.env.POSTGRES_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err.message);
});

async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === "development") {
    console.log("DB query (%dms): %s", duration, text.substring(0, 80));
  }
  return result;
}

async function getClient() {
  return pool.connect();
}

async function healthCheck() {
  const result = await pool.query("SELECT NOW()");
  return result.rows[0];
}

module.exports = { pool, query, getClient, healthCheck };
