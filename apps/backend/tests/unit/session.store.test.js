'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// Uses a real SQLite file (no mocks) to validate SQLiteSessionStore.

let dbFile;
let SQLiteSessionStore;
let db;

beforeAll(() => {
  dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'itportal-session-store-')), 'test.db');
  process.env.SQLITE_DB_PATH = dbFile;
  jest.resetModules();

  const Database = require('better-sqlite3');
  db = new Database(dbFile);
  db.exec(`
    CREATE TABLE sessions (
      sid TEXT PRIMARY KEY NOT NULL,
      sess TEXT NOT NULL,
      expire INTEGER NOT NULL
    )
  `);
  db.close();

  ({ SQLiteSessionStore } = require('../../middlewares/session'));
});

afterAll(() => {
  fs.rmSync(path.dirname(dbFile), { recursive: true, force: true });
});

function getStoreInstance() {
  return new SQLiteSessionStore();
}

function toCallback(fn) {
  return new Promise((resolve, reject) => {
    fn((err, result) => (err ? reject(err) : resolve(result)));
  });
}

describe('SQLiteSessionStore (real SQLite file, no mocks)', () => {
  let store;

  beforeEach(() => {
    store = getStoreInstance();
  });

  afterEach(() => {
    clearInterval(store._pruneTimer);
  });

  test('set() then get() round-trips the session payload', async () => {
    const sid = 'sid-roundtrip';
    const session = { cookie: { maxAge: 60000 }, userId: 'u1', userRole: 'admin' };

    await toCallback((cb) => store.set(sid, session, cb));
    const loaded = await toCallback((cb) => store.get(sid, cb));

    expect(loaded).toEqual(session);
  });

  test('get() returns null for a session that was never set', async () => {
    const loaded = await toCallback((cb) => store.get('sid-does-not-exist', cb));
    expect(loaded).toBeNull();
  });

  test('get() returns null for an expired session', async () => {
    const sid = 'sid-expired';
    // maxAge of -1000ms puts the expiry in the past immediately.
    await toCallback((cb) => store.set(sid, { cookie: { maxAge: -1000 } }, cb));

    const loaded = await toCallback((cb) => store.get(sid, cb));
    expect(loaded).toBeNull();
  });

  test('destroy() removes the session so a subsequent get() returns null', async () => {
    const sid = 'sid-destroy';
    await toCallback((cb) => store.set(sid, { cookie: { maxAge: 60000 } }, cb));
    await toCallback((cb) => store.destroy(sid, cb));

    const loaded = await toCallback((cb) => store.get(sid, cb));
    expect(loaded).toBeNull();
  });

  test('touch() extends the expiry without changing the stored payload', async () => {
    const sid = 'sid-touch';
    const session = { cookie: { maxAge: 1000 }, userId: 'u2' };
    await toCallback((cb) => store.set(sid, session, cb));

    // Touch with a much longer maxAge; the row should now survive past the
    // original short expiry window.
    await toCallback((cb) => store.touch(sid, { cookie: { maxAge: 60000 } }, cb));

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const loaded = await toCallback((cb) => store.get(sid, cb));
    expect(loaded).toEqual(session);
  });

  test('set() with no explicit maxAge falls back to the 8-hour default', async () => {
    const sid = 'sid-default-maxage';
    const before = Date.now();
    await toCallback((cb) => store.set(sid, { cookie: {} }, cb));

    const { db: rawDb } = require('../../dal/db');
    const row = rawDb.prepare('SELECT expire FROM sessions WHERE sid = ?').get(sid);

    expect(row.expire).toBeGreaterThan(before + 7 * 60 * 60 * 1000);
    expect(row.expire).toBeLessThanOrEqual(before + 8 * 60 * 60 * 1000 + 5000);
  });

  test('a second admin login can invalidate a first session by deleting its row directly (single active-admin-session pattern)', async () => {
    const sidA = 'sid-admin-a';
    const sidB = 'sid-admin-b';
    await toCallback((cb) => store.set(sidA, { cookie: { maxAge: 60000 }, userRole: 'admin' }, cb));
    await toCallback((cb) => store.set(sidB, { cookie: { maxAge: 60000 }, userRole: 'admin' }, cb));

    const { db: rawDb } = require('../../dal/db');
    rawDb.prepare("DELETE FROM sessions WHERE json_extract(sess, '$.userRole') = 'admin'").run();

    const loadedA = await toCallback((cb) => store.get(sidA, cb));
    const loadedB = await toCallback((cb) => store.get(sidB, cb));
    expect(loadedA).toBeNull();
    expect(loadedB).toBeNull();
  });
});
