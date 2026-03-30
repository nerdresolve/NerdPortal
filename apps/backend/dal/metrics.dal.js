const db = require("./db");

async function findAll({ category, kpiName, limit, offset }) {
  const params = [limit || 50, offset || 0];
  let where = "1=1";

  if (category) {
    params.push(category);
    where += ` AND m.category = $${params.length}`;
  }
  if (kpiName) {
    params.push(kpiName);
    where += ` AND m.kpi_name = $${params.length}`;
  }

  const result = await db.query(
    `SELECT m.id, m.kpi_name, m.kpi_value, m.kpi_unit, m.period_start,
            m.period_end, m.category, m.notes, m.created_at, m.updated_at,
            u.full_name AS created_by_name
     FROM metrics m
     LEFT JOIN users u ON u.id = m.created_by
     WHERE ${where}
     ORDER BY m.period_start DESC, m.kpi_name ASC
     LIMIT $1 OFFSET $2`,
    params
  );
  return result.rows;
}

async function findById(id) {
  const result = await db.query(
    `SELECT m.id, m.kpi_name, m.kpi_value, m.kpi_unit, m.period_start,
            m.period_end, m.category, m.notes, m.created_by,
            m.created_at, m.updated_at,
            u.full_name AS created_by_name
     FROM metrics m
     LEFT JOIN users u ON u.id = m.created_by
     WHERE m.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

async function create({ kpiName, kpiValue, kpiUnit, periodStart, periodEnd, category, notes, createdBy }) {
  const result = await db.query(
    `INSERT INTO metrics (kpi_name, kpi_value, kpi_unit, period_start, period_end, category, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, kpi_name, kpi_value, period_start, created_at`,
    [kpiName, kpiValue, kpiUnit || "count", periodStart, periodEnd, category || "operational", notes || null, createdBy]
  );
  return result.rows[0];
}

async function update(id, { kpiValue, kpiUnit, notes }) {
  const result = await db.query(
    `UPDATE metrics
     SET kpi_value = COALESCE($2, kpi_value),
         kpi_unit = COALESCE($3, kpi_unit),
         notes = COALESCE($4, notes)
     WHERE id = $1
     RETURNING id, kpi_name, kpi_value, updated_at`,
    [id, kpiValue, kpiUnit, notes]
  );
  return result.rows[0] || null;
}

async function getLatestByKpi(kpiName) {
  const result = await db.query(
    `SELECT id, kpi_name, kpi_value, kpi_unit, period_start, period_end, category
     FROM metrics
     WHERE kpi_name = $1
     ORDER BY period_end DESC
     LIMIT 1`,
    [kpiName]
  );
  return result.rows[0] || null;
}

module.exports = { findAll, findById, create, update, getLatestByKpi };
