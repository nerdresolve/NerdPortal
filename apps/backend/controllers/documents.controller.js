const path = require("path");
const fs = require("fs");
const documentsDal = require("../dal/documents.dal");
const { ensureUploadsDir, resolveUploadPath, isPathWithinUploads } = require("../services/uploads");

const MAX_FILE_SIZE = 10 * 1024 * 1024;

ensureUploadsDir();

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

async function list(req, res) {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = parseInt(req.query.offset) || 0;
    const category = req.query.category || null;

    const [items, total] = await Promise.all([
      documentsDal.findAll({ category, limit, offset }),
      documentsDal.count(category),
    ]);

    res.status(200).json({
      success: true,
      data: { items, total, limit, offset },
    });
  } catch (err) {
    console.error("Documents list error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function getById(req, res) {
  try {
    const item = await documentsDal.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    console.error("Document get error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function upload(req, res) {
  if (!req.file) {
    return res.status(400).json({ success: false, error: "No file provided" });
  }

  const { originalname, mimetype, size, filename } = req.file;
  const category = req.body.category || "general";
  const description = req.body.description || null;

  if (!ALLOWED_MIME_TYPES.has(mimetype)) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ success: false, error: "File type not allowed" });
  }

  if (size > MAX_FILE_SIZE) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ success: false, error: "File exceeds 10MB limit" });
  }

  try {
    const item = await documentsDal.create({
      originalName: sanitizeFilename(originalname),
      storedName: filename,
      mimeType: mimetype,
      sizeBytes: size,
      category,
      description,
      uploaderId: req.session.userId,
    });

    res.status(201).json({ success: true, data: item });
  } catch (err) {
    console.error("Document upload error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function download(req, res) {
  try {
    const item = await documentsDal.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }

    const filePath = resolveUploadPath(item.stored_name);

    if (!isPathWithinUploads(filePath)) {
      return res.status(403).json({ success: false, error: "Access denied" });
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "File not found on disk" });
    }

    res.setHeader("Content-Disposition", `attachment; filename="${item.original_name}"`);
    res.setHeader("Content-Type", item.mime_type);
    res.sendFile(filePath);
  } catch (err) {
    console.error("Document download error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

async function remove(req, res) {
  try {
    const item = await documentsDal.softDelete(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, error: "Document not found" });
    }

    const filePath = resolveUploadPath(item.stored_name);
    if (isPathWithinUploads(filePath) && fs.existsSync(filePath)) {
      fs.unlink(filePath, (err) => {
        if (err) console.error("File removal failed:", err.message);
      });
    }

    res.status(200).json({ success: true, data: { message: "Document deleted" } });
  } catch (err) {
    console.error("Document delete error:", err.stack || err.message);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
}

function sanitizeFilename(name) {
  return path
    .basename(name)
    .replace(/[^a-zA-Z0-9._\-\s]/g, "_")
    .substring(0, 255);
}

module.exports = { list, getById, upload, download, remove };
