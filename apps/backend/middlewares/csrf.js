const crypto = require("crypto");

// Double-submit cookie CSRF protection.
// A CSRF token is set in a readable cookie and must be echoed
// back via the X-CSRF-Token header on state-changing requests.

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function csrfProtection(req, res, next) {
  // Ensure a CSRF token cookie exists
  if (!req.cookies[CSRF_COOKIE]) {
    const token = generateToken();
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // Must be readable by frontend JS
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 3600000, // 1 hour
    });
    req.csrfToken = token;
  } else {
    req.csrfToken = req.cookies[CSRF_COOKIE];
  }

  // Skip validation for safe methods
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const headerToken = req.headers[CSRF_HEADER];
  const cookieToken = req.cookies[CSRF_COOKIE];

  if (!headerToken || !cookieToken) {
    return res.status(403).json({
      success: false,
      error: "CSRF token missing",
    });
  }

  // Constant-time comparison to prevent timing attacks
  const headerBuf = Buffer.from(headerToken);
  const cookieBuf = Buffer.from(cookieToken);

  if (headerBuf.length !== cookieBuf.length || !crypto.timingSafeEqual(headerBuf, cookieBuf)) {
    return res.status(403).json({
      success: false,
      error: "CSRF token mismatch",
    });
  }

  next();
}

module.exports = csrfProtection;
