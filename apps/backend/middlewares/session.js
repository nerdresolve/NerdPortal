const session = require("express-session");
const { Store } = require("express-session");
const { getDb } = require("../dal/db");

class SQLiteSessionStore extends Store {
  constructor(options = {}) {
    super(options);
    this.pruneInterval = options.pruneInterval || 15 * 60 * 1000; // 15 minutes
    this._startPruning();
  }

  get(sid, callback) {
    try {
      const db = getDb();
      const row = db
        .prepare("SELECT sess FROM sessions WHERE sid = ? AND expire > ?")
        .get(sid, Date.now());
      callback(null, row ? JSON.parse(row.sess) : null);
    } catch (err) {
      callback(err);
    }
  }

  set(sid, session, callback) {
    try {
      const db = getDb();
      const maxAge = (session.cookie && session.cookie.maxAge) || 8 * 60 * 60 * 1000;
      const expire = Date.now() + maxAge;
      db.prepare(
        "INSERT OR REPLACE INTO sessions (sid, sess, expire) VALUES (?, ?, ?)"
      ).run(sid, JSON.stringify(session), expire);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  destroy(sid, callback) {
    try {
      const db = getDb();
      db.prepare("DELETE FROM sessions WHERE sid = ?").run(sid);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  touch(sid, session, callback) {
    try {
      const db = getDb();
      const maxAge = (session.cookie && session.cookie.maxAge) || 8 * 60 * 60 * 1000;
      const expire = Date.now() + maxAge;
      db.prepare("UPDATE sessions SET expire = ? WHERE sid = ?").run(expire, sid);
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  _startPruning() {
    this._pruneTimer = setInterval(() => {
      try {
        getDb().prepare("DELETE FROM sessions WHERE expire <= ?").run(Date.now());
      } catch (err) {
        console.error("Session prune failed:", err.message);
      }
    }, this.pruneInterval);
    if (this._pruneTimer.unref) this._pruneTimer.unref();
  }
}

function sessionMiddleware() {
  return session({
    store: new SQLiteSessionStore(),
    name: "itportal.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
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
module.exports.SQLiteSessionStore = SQLiteSessionStore;
