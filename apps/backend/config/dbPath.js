const path = require("path");

// Caminho único do SQLite, compartilhado por dal/db.js e migrate.js.
const DB_PATH = process.env.SQLITE_DB_PATH || path.resolve(__dirname, "../../../database/itportal.db");

module.exports = { DB_PATH };
