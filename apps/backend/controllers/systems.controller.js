const systemsDal = require("../dal/systems.dal");

async function list(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status || null;
    const category = req.query.category || null;

    const items = await systemsDal.findAll({ status, category, limit, offset });
    res.status(200).json({ success: true, data: { items } });
  } catch (err) {
    console.error("Systems list error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function getById(req, res) {
  try {
    const item = await systemsDal.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: "System not found" });
    }
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    console.error("System get error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function create(req, res) {
  const { name, url, description, status, category, ownerId } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: "Name is required" });
  }

  try {
    const item = await systemsDal.create({ name, url, description, status, category, ownerId });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    console.error("System create error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function update(req, res) {
  const { name, url, description, status, category, ownerId } = req.body;

  try {
    const item = await systemsDal.update(req.params.id, { name, url, description, status, category, ownerId });
    if (!item) {
      return res.status(404).json({ success: false, error: "System not found" });
    }
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    console.error("System update error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function remove(req, res) {
  try {
    const deleted = await systemsDal.softDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "System not found" });
    }
    res.status(200).json({ success: true, data: { message: "System deleted" } });
  } catch (err) {
    console.error("System delete error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

module.exports = { list, getById, create, update, remove };
