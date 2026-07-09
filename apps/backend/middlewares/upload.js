const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const { ensureUploadsDir } = require("../services/uploads");

const UPLOADS_DIR = ensureUploadsDir();

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomName = crypto.randomBytes(24).toString("hex");
    cb(null, randomName + ext);
  },
});

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

function uploadMiddleware(req, res, next) {
  upload.single("file")(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "File exceeds 10MB limit",
      });
    }

    return res.status(400).json({
      success: false,
      error: err.message || "Failed to process the uploaded file",
    });
  });
}

module.exports = uploadMiddleware;
