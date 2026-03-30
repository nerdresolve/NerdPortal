const db = require("./db");

async function logAction({ userId, action, entity, entityId, details, ipAddress, userAgent }) {
  await db.query(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, details, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [userId, action, entity, entityId || null, details ? JSON.stringify(details) : null, ipAddress, userAgent || null]
  );
}

async function findByEntity(entity, entityId, limit) {
  const result = await db.query(
    `SELECT id, user_id, action, entity, entity_id, details, ip_address, created_at
     FROM audit_logs
     WHERE entity = $1 AND entity_id = $2
     ORDER BY created_at DESC
     LIMIT $3`,
    [entity, entityId, limit || 50]
  );
  return result.rows;
}

module.exports = { logAction, findByEntity };
