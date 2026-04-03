const crypto = require("crypto");
const multer = require("multer");
const { ensureUploadSubdir } = require("../services/uploads");

const TEAM_PHOTOS_DIR = ensureUploadSubdir("team");
const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2 MB

const ALLOWED_PHOTO_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, TEAM_PHOTOS_DIR);
  },
  filename: function (_req, file, cb) {
    const extension = ALLOWED_PHOTO_TYPES[file.mimetype];
    const randomName = crypto.randomBytes(24).toString("hex");
    cb(null, `${randomName}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_PHOTO_SIZE,
    files: 1,
  },
  fileFilter: function (_req, file, cb) {
    if (!ALLOWED_PHOTO_TYPES[file.mimetype]) {
      return cb(new Error("Formato de foto inválido. Use JPG, PNG, WEBP ou GIF."));
    }
    cb(null, true);
  },
});

function teamPhotoUpload(req, res, next) {
  upload.single("photo")(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: "A foto deve ter no máximo 2 MB.",
      });
    }

    return res.status(400).json({
      success: false,
      error: err.message || "Falha ao processar a foto enviada.",
    });
  });
}

module.exports = teamPhotoUpload;
