const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const DB_PATH = path.join(__dirname, 'middlemen.db');
let db = null;
async function initDb() {
  if (db) return db;
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) { db = new SQL.Database(fs.readFileSync(DB_PATH)); }
  else { db = new SQL.Database(); }
  initSchema();
  saveDb();
  return db;
}
function saveDb() {
  if (!db) return;
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}
function initSchema() {
  db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, tier TEXT DEFAULT 'free', created_at TEXT DEFAULT (datetime('now')))`);
  db.run(`CREATE TABLE IF NOT EXISTS watchlists (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, name TEXT NOT NULL, description TEXT, keywords TEXT NOT NULL, price_min REAL, price_max REAL, country TEXT DEFAULT 'any', mode TEXT DEFAULT 'local', status TEXT DEFAULT 'active', last_scanned TEXT, created_at TEXT DEFAULT (datetime('now')))`);
  db.run(`CREATE TABLE IF NOT EXISTS query_cache (id INTEGER PRIMARY KEY AUTOINCREMENT, query_key TEXT UNIQUE NOT NULL, raw_results TEXT NOT NULL, result_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), expires_at TEXT NOT NULL)`);
  db.run(`CREATE TABLE IF NOT EXISTS listings (id INTEGER PRIMARY KEY AUTOINCREMENT, source_id TEXT UNIQUE NOT NULL, title TEXT NOT NULL, price REAL, currency TEXT DEFAULT 'USD', location TEXT, image_url TEXT, listing_url TEXT NOT NULL, condition TEXT, source TEXT, raw_data TEXT, first_seen TEXT DEFAULT (datetime('now')), last_seen TEXT DEFAULT (datetime('now')))`);
  db.run(`CREATE TABLE IF NOT EXISTS watch_hits (id INTEGER PRIMARY KEY AUTOINCREMENT, watchlist_id INTEGER NOT NULL, listing_id INTEGER NOT NULL, score INTEGER DEFAULT 0, score_breakdown TEXT, feedback TEXT, seen INTEGER DEFAULT 0, notified INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), UNIQUE(watchlist_id, listing_id))`);
  db.run(`CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, watchlist_id INTEGER, hit_id INTEGER, title TEXT NOT NULL, message TEXT, listing_url TEXT, source TEXT, price REAL, currency TEXT, score INTEGER, read INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')))`);
  db.run(`CREATE TABLE IF NOT EXISTS scan_log (id INTEGER PRIMARY KEY AUTOINCREMENT, batch_id TEXT, queries_run INTEGER DEFAULT 0, cache_hits INTEGER DEFAULT 0, listings_found INTEGER DEFAULT 0, new_hits INTEGER DEFAULT 0, watches_processed INTEGER DEFAULT 0, error TEXT, duration_ms INTEGER, scanned_at TEXT DEFAULT (datetime('now')))`);
  const res = db.exec("SELECT COUNT(*) as c FROM users");
  const count = res[0]?.values[0][0] || 0;
  if (count === 0) {
    const hash = bcrypt.hashSync('password123', 10);
    db.run("INSERT INTO users (email, password_hash) VALUES (?, ?)", ['admin@middlemen.local', hash]);
    console.log('Default user: admin@middlemen.local / password123');
  }
}
function dbGet(sql, params = []) {
  try {
    const stmt = db.prepare(sql); stmt.bind(params);
    const found = stmt.step(); const row = found ? stmt.getAsObject() : undefined;
    stmt.free(); return row;
  } catch(e) { console.error('dbGet error:', e.message); return undefined; }
}
function dbAll(sql, params = []) {
  try {
    const result = db.exec(sql, params);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map(row => { const obj = {}; columns.forEach((col, i) => { obj[col] = row[i]; }); return obj; });
  } catch(e) { console.error('dbAll error:', e.message); return []; }
}
function dbRun(sql, params = []) {
  try {
    db.run(sql, params);
    const lastId = dbGet("SELECT last_insert_rowid() as id");
    const changes = db.getRowsModified();
    saveDb();
    return { lastInsertRowid: lastId?.id, changes };
  } catch(e) { console.error('dbRun error:', e.message); return { lastInsertRowid: null, changes: 0 }; }
}
module.exports = { initDb, getDb: () => db, dbGet, dbAll, dbRun, saveDb };