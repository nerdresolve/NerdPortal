const db = require("./db");

async function findAll({ status, category, limit, offset }) {
  const params = [limit || 50, offset || 0];
  let where = "s.deleted_at IS NULL";

  if (status) {
    params.push(status);
    where += ` AND s.status = $${params.length}`;
  }
  if (category) {
    params.push(category);
    where += ` AND s.category = $${params.length}`;
  }

  const result = await db.query(
    `SELECT s.id, s.name, s.url, s.description, s.status, s.category,
            s.created_at, s.updated_at,
            u.full_name AS owner_name
     FROM systems s
     LEFT JOIN users u ON u.id = s.owner_id
     WHERE ${where}
     ORDER BY s.name ASC
     LIMIT $1 OFFSET $2`,
    params
  );
  return result.rows;
}

async function findById(id) {
  const result = await db.query(
    `SELECT s.id, s.name, s.url, s.description, s.status, s.category,
            s.owner_id, s.created_at, s.updated_at,
            u.full_name AS owner_name
     FROM systems s
     LEFT JOIN users u ON u.id = s.owner_id
     WHERE s.id = $1 AND s.deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
}

async function create({ name, url, description, status, category, ownerId }) {
  const result = await db.query(
    `INSERT INTO systems (name, url, description, status, category, owner_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, status, category, created_at`,
    [name, url || null, description || null, status || "active", category || "internal", ownerId || null]
  );
  return result.rows[0];
}

async function update(id, { name, url, description, status, category, ownerId }) {
  const result = await db.query(
    `UPDATE systems
     SET name = COALESCE($2, name),
         url = COALESCE($3, url),
         description = COALESCE($4, description),
         status = COALESCE($5, status),
         category = COALESCE($6, category),
         owner_id = COALESCE($7, owner_id)
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id, name, status, updated_at`,
    [id, name, url, description, status, category, ownerId]
  );
  return result.rows[0] || null;
}

async function softDelete(id) {
  const result = await db.query(
    `UPDATE systems SET deleted_at = datetime('now') WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
    [id]
  );
  return result.rowCount > 0;
}

module.exports = { findAll, findById, create, update, softDelete };
