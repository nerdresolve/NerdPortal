const fs = require("fs");
const path = require("path");

const DEFAULT_UPLOADS_DIR = path.resolve(__dirname, "../uploads");
const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : DEFAULT_UPLOADS_DIR;

function ensureUploadsDir() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  return UPLOADS_DIR;
}

function resolveUploadPath(...segments) {
  return path.resolve(UPLOADS_DIR, ...segments);
}

function ensureUploadSubdir(...segments) {
  const directory = resolveUploadPath(...segments);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

function isPathWithinUploads(targetPath) {
  const relative = path.relative(UPLOADS_DIR, targetPath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

module.exports = {
  UPLOADS_DIR,
  ensureUploadsDir,
  resolveUploadPath,
  ensureUploadSubdir,
  isPathWithinUploads,
};
