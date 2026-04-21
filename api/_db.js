// 共享数据库连接模块
// 本地开发使用文件 SQLite，Vercel 生产环境使用 Turso
const { createClient } = require('@libsql/client');

let _client = null;

function getDb() {
  if (_client) return _client;

  const url = (process.env.TURSO_DATABASE_URL || 'file:../bazi.db').replace(/^\uFEFF/, '').trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.replace(/^\uFEFF/, '').trim();

  _client = createClient({ url, authToken });
  return _client;
}

async function initDb() {
  const db = getDb();
  await db.execute(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    invite_code TEXT UNIQUE,
    invited_by TEXT,
    vip_expire_time DATETIME,
    balance REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    amount REAL,
    status TEXT DEFAULT 'pending',
    payment_method TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
}

module.exports = { getDb, initDb };
