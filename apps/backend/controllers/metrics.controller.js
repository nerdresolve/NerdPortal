const metricsDal = require("../dal/metrics.dal");

async function list(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const category = req.query.category || null;
    const kpiName = req.query.kpi || null;

    const items = await metricsDal.findAll({ category, kpiName, limit, offset });
    res.status(200).json({ success: true, data: { items } });
  } catch (err) {
    console.error("Metrics list error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function getById(req, res) {
  try {
    const item = await metricsDal.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: "Metric not found" });
    }
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    console.error("Metric get error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function create(req, res) {
  const { kpiName, kpiValue, kpiUnit, periodStart, periodEnd, category, notes } = req.body;

  if (!kpiName || kpiValue === undefined || !periodStart || !periodEnd) {
    return res.status(400).json({
      success: false,
      error: "kpiName, kpiValue, periodStart, and periodEnd are required",
    });
  }

  try {
    const item = await metricsDal.create({
      kpiName,
      kpiValue,
      kpiUnit,
      periodStart,
      periodEnd,
      category,
      notes,
      createdBy: req.session.userId,
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    console.error("Metric create error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function update(req, res) {
  const { kpiValue, kpiUnit, notes } = req.body;

  try {
    const item = await metricsDal.update(req.params.id, { kpiValue, kpiUnit, notes });
    if (!item) {
      return res.status(404).json({ success: false, error: "Metric not found" });
    }
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    console.error("Metric update error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function remove(req, res) {
  try {
    const deleted = await metricsDal.softDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Metric not found" });
    }
    res.status(200).json({ success: true, data: { message: "Metric deleted" } });
  } catch (err) {
    console.error("Metric delete error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

module.exports = { list, getById, create, update, remove };
