const announcementsDal = require("../dal/announcements.dal");

async function list(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    const [items, total] = await Promise.all([
      announcementsDal.findAll({ limit, offset }),
      announcementsDal.count(),
    ]);

    res.status(200).json({
      success: true,
      data: { items, total, limit, offset },
    });
  } catch (err) {
    console.error("Announcements list error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function getById(req, res) {
  try {
    const item = await announcementsDal.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: "Announcement not found" });
    }
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    console.error("Announcement get error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function create(req, res) {
  const { title, body, isPinned, publishedAt } = req.body;

  if (!title || !body) {
    return res.status(400).json({ success: false, error: "Title and body are required" });
  }

  try {
    const item = await announcementsDal.create({
      title,
      body,
      authorId: req.session.userId,
      isPinned,
      publishedAt,
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) {
    console.error("Announcement create error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function update(req, res) {
  const { title, body, isPinned, publishedAt } = req.body;

  try {
    const item = await announcementsDal.update(req.params.id, {
      title,
      body,
      isPinned,
      publishedAt,
    });

    if (!item) {
      return res.status(404).json({ success: false, error: "Announcement not found" });
    }
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    console.error("Announcement update error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function remove(req, res) {
  try {
    const deleted = await announcementsDal.softDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Announcement not found" });
    }
    res.status(200).json({ success: true, data: { message: "Announcement deleted" } });
  } catch (err) {
    console.error("Announcement delete error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

module.exports = { list, getById, create, update, remove };
