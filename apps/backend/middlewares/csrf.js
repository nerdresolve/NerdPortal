const crypto = require("crypto");

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

function csrfProtection(req, res, next) {
  if (!req.cookies[CSRF_COOKIE]) {
    const token = generateToken();
    // "strict" would stop the browser sending this cookie when the frontend
    // is served from a different origin than the API (the default Docker
    // layout: :3000 and :4000). "lax" keeps CSRF protection — the token still
    // has to be echoed back in the X-CSRF-Token header, which a cross-site
    // attacker cannot read — while letting the real frontend work.
    const crossSite = String(process.env.COOKIE_SAMESITE || "lax").toLowerCase();
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: crossSite,
      secure: crossSite === "none" || process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 3600000,
    });
    req.csrfToken = token;
  } else {
    req.csrfToken = req.cookies[CSRF_COOKIE];
  }

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
