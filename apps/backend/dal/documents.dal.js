const db = require("./db");

async function findAll({ category, limit, offset }) {
  const params = [limit || 20, offset || 0];
  let whereClause = "d.deleted_at IS NULL";

  if (category) {
    params.push(category);
    whereClause += ` AND d.category = $${params.length}`;
  }

  const result = await db.query(
    `SELECT d.id, d.original_name, d.mime_type, d.size_bytes, d.category,
            d.description, d.created_at,
            u.full_name AS uploader_name
     FROM documents d
     JOIN users u ON u.id = d.uploader_id
     WHERE ${whereClause}
     ORDER BY d.created_at DESC
     LIMIT $1 OFFSET $2`,
    params
  );
  return result.rows;
}

async function findById(id) {
  const result = await db.query(
    `SELECT d.id, d.original_name, d.stored_name, d.mime_type, d.size_bytes,
            d.category, d.description, d.uploader_id, d.created_at, d.updated_at,
            u.full_name AS uploader_name
     FROM documents d
     JOIN users u ON u.id = d.uploader_id
     WHERE d.id = $1 AND d.deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
}

async function create({ originalName, storedName, mimeType, sizeBytes, category, description, uploaderId }) {
  const result = await db.query(
    `INSERT INTO documents (original_name, stored_name, mime_type, size_bytes, category, description, uploader_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, original_name, category, created_at`,
    [originalName, storedName, mimeType, sizeBytes, category || "general", description || null, uploaderId]
  );
  return result.rows[0];
}

async function softDelete(id) {
  const result = await db.query(
    `UPDATE documents SET deleted_at = datetime('now') WHERE id = $1 AND deleted_at IS NULL RETURNING id, stored_name`,
    [id]
  );
  return result.rows[0] || null;
}

async function count(category) {
  const params = [];
  let where = "deleted_at IS NULL";
  if (category) {
    params.push(category);
    where += ` AND category = $${params.length}`;
  }
  const result = await db.query(
    `SELECT COUNT(*) AS total FROM documents WHERE ${where}`,
    params
  );
  return result.rows[0].total;
}

module.exports = { findAll, findById, create, softDelete, count };
