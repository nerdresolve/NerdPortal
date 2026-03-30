const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { pool } = require("../dal/db");

function sessionMiddleware() {
  return session({
    store: new pgSession({
      pool: pool,
      tableName: "sessions",
      createTableIfMissing: false, // Table is managed by migrations
      pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 min
    }),
    name: "itportal.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true, // Reset expiry on each request
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 8 * 60 * 60 * 1000, // 8 hours
      path: "/",
    },
  });
}

module.exports = sessionMiddleware;
