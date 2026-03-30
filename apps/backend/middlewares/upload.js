const multer = require("multer");
const crypto = require("crypto");
const path = require("path");

const UPLOADS_DIR = path.resolve(__dirname, "../../uploads");

// Cryptographically random filename to prevent collisions and path attacks
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

const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
    files: 1,
  },
});

module.exports = uploadMiddleware;
