// 共享数据库连接模块
// 本地开发使用文件 SQLite，Vercel 生产环境使用 Turso
const { createClient } = require('@libsql/client');

let _client = null;
// 标记 preferences 列迁移是否已经完成（成功 ALTER 或观察到 duplicate column）
// 避免每次请求都发起 ALTER TABLE + 触发一次异常
let _migrated = false;

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
  // 幂等迁移：为 users 表添加 preferences 列，用于记住用户最近一次输入
  // 首次成功 ALTER 或观察到 "duplicate column" 后，后续请求短路跳过，省一次 Turso 往返 + 异常
  if (!_migrated) {
    try {
      await db.execute(`ALTER TABLE users ADD COLUMN preferences TEXT`);
      _migrated = true;
    } catch (e) {
      const msg = (e && e.message ? String(e.message) : '').toLowerCase();
      if (msg.includes('duplicate column')) {
        // 列已存在：迁移相当于已完成，后续请求不再尝试
        _migrated = true;
      } else {
        // 其他错误（权限、连接中断等）不应被静默吞掉
        throw e;
      }
    }
  }
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
