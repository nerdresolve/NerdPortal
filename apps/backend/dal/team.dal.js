const db = require("./db");

async function findAll({ activeOnly, limit, offset }) {
  const params = [limit || 50, offset || 0];
  let where = "deleted_at IS NULL";

  if (activeOnly) {
    where += " AND is_active = true";
  }

  const result = await db.query(
    `SELECT id, full_name, job_title, email, phone, photo_url,
            department, description, is_active, sort_order, created_at, updated_at
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
            department, description, is_active, sort_order, created_at, updated_at
     FROM team_members
     WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
}

async function create({ fullName, jobTitle, email, phone, photoUrl, department, description, sortOrder }) {
  const result = await db.query(
    `INSERT INTO team_members (full_name, job_title, email, phone, photo_url, department, description, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, full_name, job_title, email, phone, photo_url, department, description, is_active, sort_order, created_at, updated_at`,
    [fullName, jobTitle, email, phone || null, photoUrl || null, department || "TI", description || null, sortOrder || 0]
  );
  return result.rows[0];
}

async function update(id, {
  fullName,
  jobTitle,
  email,
  phone,
  photoUrl,
  photoUrlProvided,
  department,
  description,
  isActive,
  sortOrder,
}) {
  const result = await db.query(
    `UPDATE team_members
     SET full_name = COALESCE($2, full_name),
         job_title = COALESCE($3, job_title),
         email = COALESCE($4, email),
         phone = COALESCE($5, phone),
         photo_url = CASE WHEN $6 THEN $7 ELSE photo_url END,
         department = COALESCE($8, department),
         description = $9,
         is_active = COALESCE($10, is_active),
         sort_order = COALESCE($11, sort_order),
         updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id, full_name, job_title, email, phone, photo_url, department, description, is_active, sort_order, created_at, updated_at`,
    [id, fullName, jobTitle, email, phone, !!photoUrlProvided, photoUrl || null, department, description || null, isActive, sortOrder]
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
