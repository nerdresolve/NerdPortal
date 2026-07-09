const fs = require("fs");
const teamDal = require("../dal/team.dal");
const { escapeHtml } = require("../utils/sanitize");
const {
  buildManagedPhotoUrl,
  isValidPhotoFilename,
  resolvePhotoPath,
  isWithinTeamPhotosDir,
  removeFileAtPath,
  removeManagedPhoto,
} = require("../services/teamPhotos");

function normalizeOptionalString(value) {
  if (typeof value !== "string") return null;
  const sanitized = escapeHtml(value).trim();
  return sanitized ? sanitized : null;
}

function normalizeBoolean(value) {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
}

function normalizeSortOrder(value) {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(parsed, 0);
}

function getTeamPayload(body, file) {
  return {
    fullName: normalizeOptionalString(body.fullName),
    jobTitle: normalizeOptionalString(body.jobTitle),
    email: normalizeOptionalString(body.email),
    phone: normalizeOptionalString(body.phone),
    photoUrl: file ? buildManagedPhotoUrl(file.filename) : null,
    photoUrlProvided: !!file,
    department: normalizeOptionalString(body.department) || "TI",
    description: normalizeOptionalString(body.description),
    isActive: normalizeBoolean(body.isActive),
    sortOrder: normalizeSortOrder(body.sortOrder),
  };
}

async function list(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const offset = parseInt(req.query.offset, 10) || 0;
    const activeOnly = req.query.active !== "false";

    const items = await teamDal.findAll({ activeOnly, limit, offset });
    res.status(200).json({ success: true, data: { items } });
  } catch (err) {
    console.error("Team list error:", err.stack || err.message);
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
    console.error("Team get error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function servePhoto(req, res) {
  const filename = req.params.filename;

  if (!isValidPhotoFilename(filename)) {
    return res.status(404).json({ success: false, error: "Photo not found" });
  }

  const filePath = resolvePhotoPath(filename);
  if (!isWithinTeamPhotosDir(filePath)) {
    return res.status(403).json({ success: false, error: "Access denied" });
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: "Photo not found" });
  }

  res.setHeader("Cache-Control", "public, max-age=3600, immutable");
  res.setHeader("Content-Disposition", "inline");
  res.sendFile(filePath);
}

async function create(req, res) {
  const payload = getTeamPayload(req.body, req.file);

  if (!payload.fullName || !payload.jobTitle || !payload.email) {
    removeFileAtPath(req.file?.path);
    return res.status(400).json({
      success: false,
      error: "Full name, job title, and email are required",
    });
  }

  try {
    const item = await teamDal.create(payload);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    removeFileAtPath(req.file?.path);
    console.error("Team create error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function update(req, res) {
  const payload = getTeamPayload(req.body, req.file);

  try {
    const existing = await teamDal.findById(req.params.id);
    if (!existing) {
      removeFileAtPath(req.file?.path);
      return res.status(404).json({ success: false, error: "Team member not found" });
    }

    const item = await teamDal.update(req.params.id, payload);
    if (!item) {
      removeFileAtPath(req.file?.path);
      return res.status(404).json({ success: false, error: "Team member not found" });
    }

    if (req.file && existing.photo_url) {
      removeManagedPhoto(existing.photo_url);
    }

    res.status(200).json({ success: true, data: item });
  } catch (err) {
    removeFileAtPath(req.file?.path);
    console.error("Team update error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function remove(req, res) {
  try {
    const existing = await teamDal.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: "Team member not found" });
    }

    const deleted = await teamDal.softDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: "Team member not found" });
    }

    removeManagedPhoto(existing.photo_url);
    res.status(200).json({ success: true, data: { message: "Team member deleted" } });
  } catch (err) {
    console.error("Team delete error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

module.exports = { list, getById, servePhoto, create, update, remove };
