const db = require("./db");

async function findAll({ activeOnly, limit, offset }) {
  const params = [limit || 50, offset || 0];
  let where = "deleted_at IS NULL";

  if (activeOnly) {
    where += " AND is_active = true";
  }

  const result = await db.query(
    `SELECT id, full_name, job_title, email, phone, photo_url,
            department, is_active, sort_order, created_at, updated_at
     FROM team_members
     WHERE ${where}
     ORDER BY sort_order ASC, full_name ASC
     LIMIT $1 OFFSET $2`,
    params
  );
  return result.rows;
}

async function findById(id) {
  const result = await db.query(
    `SELECT id, full_name, job_title, email, phone, photo_url,
            department, is_active, sort_order, created_at, updated_at
     FROM team_members
     WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
}

async function create({ fullName, jobTitle, email, phone, photoUrl, department, sortOrder }) {
  const result = await db.query(
    `INSERT INTO team_members (full_name, job_title, email, phone, photo_url, department, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, full_name, job_title, created_at`,
    [fullName, jobTitle, email, phone || null, photoUrl || null, department || "TI", sortOrder || 0]
  );
  return result.rows[0];
}

async function update(id, { fullName, jobTitle, email, phone, photoUrl, department, isActive, sortOrder }) {
  const result = await db.query(
    `UPDATE team_members
     SET full_name = COALESCE($2, full_name),
         job_title = COALESCE($3, job_title),
         email = COALESCE($4, email),
         phone = COALESCE($5, phone),
         photo_url = COALESCE($6, photo_url),
         department = COALESCE($7, department),
         is_active = COALESCE($8, is_active),
         sort_order = COALESCE($9, sort_order)
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id, full_name, job_title, updated_at`,
    [id, fullName, jobTitle, email, phone, photoUrl, department, isActive, sortOrder]
  );
  return result.rows[0] || null;
}

async function softDelete(id) {
  const result = await db.query(
    `UPDATE team_members SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
    [id]
  );
  return result.rowCount > 0;
}

module.exports = { findAll, findById, create, update, softDelete };
