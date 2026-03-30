const db = require("./db");

async function findAll({ limit, offset }) {
  const result = await db.query(
    `SELECT a.id, a.title, a.body, a.is_pinned, a.published_at,
            a.created_at, a.updated_at,
            u.full_name AS author_name, u.email AS author_email
     FROM announcements a
     JOIN users u ON u.id = a.author_id
     WHERE a.deleted_at IS NULL
     ORDER BY a.is_pinned DESC, a.published_at DESC NULLS LAST, a.created_at DESC
     LIMIT $1 OFFSET $2`,
    [limit || 20, offset || 0]
  );
  return result.rows;
}

async function findById(id) {
  const result = await db.query(
    `SELECT a.id, a.title, a.body, a.is_pinned, a.published_at,
            a.created_at, a.updated_at, a.author_id,
            u.full_name AS author_name
     FROM announcements a
     JOIN users u ON u.id = a.author_id
     WHERE a.id = $1 AND a.deleted_at IS NULL`,
    [id]
  );
  return result.rows[0] || null;
}

async function create({ title, body, authorId, isPinned, publishedAt }) {
  const result = await db.query(
    `INSERT INTO announcements (title, body, author_id, is_pinned, published_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, title, is_pinned, published_at, created_at`,
    [title, body, authorId, isPinned || false, publishedAt || null]
  );
  return result.rows[0];
}

async function update(id, { title, body, isPinned, publishedAt }) {
  const result = await db.query(
    `UPDATE announcements
     SET title = COALESCE($2, title),
         body = COALESCE($3, body),
         is_pinned = COALESCE($4, is_pinned),
         published_at = COALESCE($5, published_at)
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id, title, is_pinned, published_at, updated_at`,
    [id, title, body, isPinned, publishedAt]
  );
  return result.rows[0] || null;
}

async function softDelete(id) {
  const result = await db.query(
    `UPDATE announcements SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`,
    [id]
  );
  return result.rowCount > 0;
}

async function count() {
  const result = await db.query(
    "SELECT COUNT(*)::int AS total FROM announcements WHERE deleted_at IS NULL"
  );
  return result.rows[0].total;
}

module.exports = { findAll, findById, create, update, softDelete, count };
