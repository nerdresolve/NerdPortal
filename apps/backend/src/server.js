require("dotenv").config({ path: require("path").join(__dirname, "../../../.env") });
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

app.set("trust proxy", 1);

app.use(securityHeaders());
app.use(corsMiddleware());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());
app.use(sessionMiddleware());
app.use(xssSanitizer);
app.use(csrfProtection);
app.use("/api/", apiLimiter);
app.use(auditMiddleware);

app.use("/api/v1", routes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

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

app.listen(PORT, "0.0.0.0", () => {
  console.log("ITPortal Backend running on port %d", PORT);
  console.log("Environment: %s", process.env.NODE_ENV || "development");
});

module.exports = app;
