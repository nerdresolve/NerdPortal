const teamDal = require("../dal/team.dal");

async function list(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const activeOnly = req.query.active !== "false";

    const items = await teamDal.findAll({ activeOnly, limit, offset });
    res.status(200).json({ success: true, data: { items } });
  } catch (err) {
    console.error("Team list error:", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function getById(req, res) {
  try {
    const item = await teamDal.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: "Team member not found" });
    }
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    console.error("Team get error:", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function create(req, res) {
  const { fullName, jobTitle, email, phone, photoUrl, department, sortOrder } = req.body;

  if (!fullName || !jobTitle || !email) {
    return res.status(400).json({ success: false, error: "Full name, job title, and email are required" });
  }

  try {
    const item = await teamDal.create({ fullName, jobTitle, email, phone, photoUrl, department, sortOrder });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    console.error("Team create error:", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function update(req, res) {
  const { fullName, jobTitle, email, phone, photoUrl, department, isActive, sortOrder } = req.body;

  try {
    const item = await teamDal.update(req.params.id, {
      fullName, jobTitle, email, phone, photoUrl, department, isActive, sortOrder,
    });
    if (!item) {
      return res.status(404).json({ success: false, error: "Team member not found" });
    }
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    console.error("Team update error:", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function remove(req, res) {
  try {
    const deleted = await teamDal.softDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Team member not found" });
    }
    res.status(200).json({ success: true, data: { message: "Team member deleted" } });
  } catch (err) {
    console.error("Team delete error:", err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

module.exports = { list, getById, create, update, remove };
