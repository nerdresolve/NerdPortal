const db = require("./db");

function getExecutor(client) {
  return client || db;
}

async function findByEmail(email, client) {
  const executor = getExecutor(client);
  const result = await executor.query(
    `SELECT id, email, password_hash, full_name, role, is_active,
            last_login_at, created_at, updated_at
     FROM users
     WHERE LOWER(email) = LOWER($1) AND deleted_at IS NULL`,
    [email]
  );
  return result.rows[0] || null;
}

async function findById(id, client) {
  const executor = getExecutor(client);
  const result = await executor.query(
    `SELECT id, email, full_name, role, is_active,
            last_login_at, created_at, updated_at
     FROM users
     WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
}

async function create({ email, passwordHash, fullName, role }) {
  const result = await db.query(
    `INSERT INTO users (email, password_hash, full_name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, role, created_at`,
    [email, passwordHash, fullName, role || "viewer"]
  );
  return result.rows[0];
}

async function updateLastLogin(id, client) {
  const executor = getExecutor(client);
  await executor.query(
    "UPDATE users SET last_login_at = NOW() WHERE id = $1",
    [id]
  );
}

async function updatePassword(id, passwordHash, client) {
  const executor = getExecutor(client);
  await executor.query(
    "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
    [passwordHash, id]
  );
}

module.exports = {
  findByEmail,
  findById,
  create,
  updateLastLogin,
  updatePassword,
};
