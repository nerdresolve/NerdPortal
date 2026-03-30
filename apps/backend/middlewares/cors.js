const cors = require("cors");

function corsMiddleware() {
  const allowedOrigins = [
    "http://localhost:3000",
    "http://itportal_frontend:3000",
  ];

  return cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (server-to-server, curl, etc) in dev
      if (!origin && process.env.NODE_ENV === "development") {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS policy: origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "X-CSRF-Token"],
    maxAge: 600,
  });
}

module.exports = corsMiddleware;
