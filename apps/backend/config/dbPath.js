const path = require("path");

// Single SQLite path, shared by dal/db.js and migrate.js.
const DB_PATH = process.env.SQLITE_DB_PATH || path.resolve(__dirname, "../../../database/itportal.db");

module.exports = { DB_PATH };
