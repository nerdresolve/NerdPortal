const session = require("express-session");
const BetterSqlite3Store = require("better-sqlite3-session-store")(session);
const { db } = require("../dal/db");

function sessionMiddleware() {
  return session({
    store: new BetterSqlite3Store({
      client: db,
      expired: {
        clear: true,
        intervalMs: 15 * 60 * 1000,
      },
    }),
    name: "itportal.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 8 * 60 * 60 * 1000,
      path: "/",
    },
  });
}

module.exports = sessionMiddleware;
