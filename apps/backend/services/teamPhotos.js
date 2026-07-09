const fs = require("fs");
const path = require("path");
const { ensureUploadSubdir, resolveUploadPath, isPathWithinUploads } = require("./uploads");

const TEAM_PHOTOS_DIR = ensureUploadSubdir("team");
const MANAGED_PHOTO_PATTERN = /^\/api\/team\/photos\/([a-f0-9]{48}\.(?:jpg|png|webp|gif))$/;
const PHOTO_FILENAME_PATTERN = /^[a-f0-9]{48}\.(jpg|png|webp|gif)$/;

function buildManagedPhotoUrl(filename) {
  return `/api/team/photos/${filename}`;
}

function extractManagedPhotoFilename(photoUrl) {
  if (typeof photoUrl !== "string") return null;
  const match = photoUrl.match(MANAGED_PHOTO_PATTERN);
  return match ? match[1] : null;
}

function isValidPhotoFilename(filename) {
  return PHOTO_FILENAME_PATTERN.test(filename);
}

function resolvePhotoPath(filename) {
  return resolveUploadPath("team", filename);
}

function isWithinTeamPhotosDir(absolutePath) {
  return (
    isPathWithinUploads(absolutePath) &&
    (absolutePath.startsWith(TEAM_PHOTOS_DIR + path.sep) || absolutePath === TEAM_PHOTOS_DIR)
  );
}

function removeFileAtPath(filePath) {
  if (!filePath || !isPathWithinUploads(filePath) || !fs.existsSync(filePath)) return;
  fs.unlink(filePath, (err) => {
    if (err) console.error("Team photo cleanup error:", err.message);
  });
}

function removeManagedPhoto(photoUrl) {
  const filename = extractManagedPhotoFilename(photoUrl);
  if (!filename) return;

  const absolutePath = resolvePhotoPath(filename);
  if (!isWithinTeamPhotosDir(absolutePath)) return;
  removeFileAtPath(absolutePath);
}

module.exports = {
  TEAM_PHOTOS_DIR,
  buildManagedPhotoUrl,
  extractManagedPhotoFilename,
  isValidPhotoFilename,
  resolvePhotoPath,
  isWithinTeamPhotosDir,
  removeFileAtPath,
  removeManagedPhoto,
};
