const { escapeHtml } = require("../utils/sanitize");

// Credential fields are not HTML-encoded — they are compared as opaque values (hashes), never rendered.
const EXEMPT_BODY_FIELDS = new Set(["password", "newPassword", "resetToken"]);

function sanitizeValue(value, exemptFields) {
  if (typeof value === "string") {
    return escapeHtml(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, exemptFields));
  }
  if (value !== null && typeof value === "object") {
    return sanitizeObject(value, exemptFields);
  }
  return value;
}

function sanitizeObject(obj, exemptFields) {
  const sanitized = {};
  for (const key of Object.keys(obj)) {
    sanitized[key] = exemptFields && exemptFields.has(key) ? obj[key] : sanitizeValue(obj[key], exemptFields);
  }
  return sanitized;
}

function xssSanitizer(req, res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeObject(req.body, EXEMPT_BODY_FIELDS);
  }
  if (req.query && typeof req.query === "object") {
    req.query = sanitizeObject(req.query, EXEMPT_BODY_FIELDS);
  }
  next();
}

module.exports = xssSanitizer;
