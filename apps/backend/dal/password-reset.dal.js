const db = require("./db");

async function invalidateActiveByUserId(userId, client) {
  const executor = client || db;
  await executor.query(
    `UPDATE password_reset_requests
     SET invalidated_at = NOW()
     WHERE user_id = $1
       AND used_at IS NULL
       AND invalidated_at IS NULL`,
    [userId]
  );
}

async function create({ userId, requestEmail, codeHash, expiresAt, requestIp, requestUserAgent }, client) {
  const executor = client || db;
  const result = await executor.query(
    `INSERT INTO password_reset_requests (
        user_id, request_email, code_hash, expires_at, request_ip, request_user_agent
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, user_id, request_email, expires_at, created_at`,
    [userId, requestEmail, codeHash, expiresAt, requestIp || null, requestUserAgent || null]
  );
  return result.rows[0] || null;
}

async function findLatestActiveByEmail(requestEmail, client) {
  const executor = client || db;
  const result = await executor.query(
    `SELECT pr.id, pr.user_id, pr.request_email, pr.code_hash, pr.reset_token_hash,
            pr.attempt_count, pr.expires_at, pr.verified_at, pr.used_at,
            pr.invalidated_at, pr.last_attempt_at, pr.created_at, pr.updated_at,
            u.email, u.full_name, u.role, u.is_active
     FROM password_reset_requests pr
     JOIN users u ON u.id = pr.user_id
     WHERE LOWER(pr.request_email) = LOWER($1)
       AND pr.used_at IS NULL
       AND pr.invalidated_at IS NULL
     ORDER BY pr.created_at DESC
     LIMIT 1`,
    [requestEmail]
  );
  return result.rows[0] || null;
}

async function incrementAttempts(id, client) {
  const executor = client || db;
  const result = await executor.query(
    `UPDATE password_reset_requests
     SET attempt_count = attempt_count + 1,
         last_attempt_at = NOW()
     WHERE id = $1
     RETURNING id, attempt_count, last_attempt_at`,
    [id]
  );
  return result.rows[0] || null;
}

async function markVerified(id, resetTokenHash, client) {
  const executor = client || db;
  const result = await executor.query(
    `UPDATE password_reset_requests
     SET verified_at = NOW(),
         reset_token_hash = $2
     WHERE id = $1
     RETURNING id, user_id, request_email, expires_at, verified_at`,
    [id, resetTokenHash]
  );
  return result.rows[0] || null;
}

async function invalidateById(id, client) {
  const executor = client || db;
  await executor.query(
    `UPDATE password_reset_requests
     SET invalidated_at = NOW()
     WHERE id = $1`,
    [id]
  );
}

async function findVerifiedByEmailAndToken(requestEmail, resetTokenHash, client) {
  const executor = client || db;
  const result = await executor.query(
    `SELECT pr.id, pr.user_id, pr.request_email, pr.code_hash, pr.reset_token_hash,
            pr.attempt_count, pr.expires_at, pr.verified_at, pr.used_at,
            pr.invalidated_at, pr.last_attempt_at, pr.created_at, pr.updated_at,
            u.email, u.full_name, u.role, u.is_active
     FROM password_reset_requests pr
     JOIN users u ON u.id = pr.user_id
     WHERE LOWER(pr.request_email) = LOWER($1)
       AND pr.reset_token_hash = $2
       AND pr.used_at IS NULL
       AND pr.invalidated_at IS NULL
     ORDER BY pr.verified_at DESC NULLS LAST, pr.created_at DESC
     LIMIT 1`,
    [requestEmail, resetTokenHash]
  );
  return result.rows[0] || null;
}

async function markUsed(id, client) {
  const executor = client || db;
  await executor.query(
    `UPDATE password_reset_requests
     SET used_at = NOW()
     WHERE id = $1`,
    [id]
  );
}

module.exports = {
  invalidateActiveByUserId,
  create,
  findLatestActiveByEmail,
  incrementAttempts,
  markVerified,
  invalidateById,
  findVerifiedByEmailAndToken,
  markUsed,
};
