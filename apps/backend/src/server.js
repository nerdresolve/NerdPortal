const express = require("express");
const cookieParser = require("cookie-parser");
const securityHeaders = require("../middlewares/securityHeaders");
const corsMiddleware = require("../middlewares/cors");
const csrfProtection = require("../middlewares/csrf");
const sessionMiddleware = require("../middlewares/session");
const xssSanitizer = require("../middlewares/xssSanitizer");
const auditMiddleware = require("../middlewares/audit");
const { apiLimiter } = require("../middlewares/rateLimit");
const routes = require("../routes");

const app = express();
const PORT = parseInt(process.env.BACKEND_PORT || "4000", 10);

// Trust proxy for correct IP detection behind Docker/nginx
app.set("trust proxy", 1);

// --- Middleware stack (order matters) ---

// 1. Security headers (Helmet)
app.use(securityHeaders());

// 2. CORS
app.use(corsMiddleware());

// 3. Body parsers
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// 4. Cookie parser (required before session and CSRF)
app.use(cookieParser());

// 5. Session management (PostgreSQL-backed, secure cookies)
app.use(sessionMiddleware());

// 6. XSS input sanitization
app.use(xssSanitizer);

// 7. CSRF protection (double-submit cookie)
app.use(csrfProtection);

// 8. General rate limiting
app.use("/api/", apiLimiter);

// 9. Audit logging (state-changing requests)
app.use(auditMiddleware);

// --- Routes ---
app.use("/api/v1", routes);

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

// --- Global error handler ---
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err.message);
  console.error(err.stack);

  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({
      success: false,
      error: "CORS policy violation",
    });
  }

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === "development"
      ? err.message
      : "Internal server error",
  });
});

// --- Start server ---
app.listen(PORT, "0.0.0.0", () => {
  console.log("ITPortal Backend running on port %d", PORT);
  console.log("Environment: %s", process.env.NODE_ENV || "development");
});

module.exports = app;
