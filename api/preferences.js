// GET /api/preferences -> { preferences: <object|null> }
// PUT /api/preferences { preferences: <object> } -> { success: true }
const jwt = require('jsonwebtoken');
const { getDb, initDb } = require('./_db');
const { rateLimit } = require('./_rateLimit');

const JWT_SECRET = process.env.JWT_SECRET || 'bazi-secret-key-change-me-in-production';
const MAX_PREFS_BYTES = 4096;

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // PUT is the write path that can be spammed; GET runs once per login and is cheap.
  // Apply a per-IP limiter only to PUT, matching the scale used by other authenticated writes.
  if (req.method === 'PUT') {
    const limiter = rateLimit(req, { windowMs: 60000, max: 60 });
    if (!limiter.success) {
      return res.status(429).json({ error: '操作過於頻繁，請稍後再試' });
    }
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未登录' });

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(403).json({ error: '登录已过期' });
  }

  try {
    await initDb();
    const db = getDb();

    if (req.method === 'GET') {
      const result = await db.execute({
        sql: 'SELECT preferences FROM users WHERE id = ?',
        args: [decoded.id]
      });
      const row = result.rows[0];
      if (!row) return res.status(404).json({ error: '用户不存在' });

      let prefs = null;
      const raw = row.preferences;
      if (raw) {
        try {
          prefs = JSON.parse(raw);
        } catch {
          prefs = null;
        }
      }
      return res.json({ preferences: prefs });
    }

    // PUT
    const prefs = req.body && req.body.preferences;
    if (
      prefs === null ||
      typeof prefs !== 'object' ||
      Array.isArray(prefs)
    ) {
      return res.status(400).json({ error: '参数错误' });
    }

    const serialized = JSON.stringify(prefs);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_PREFS_BYTES) {
      return res.status(400).json({ error: '数据过大' });
    }

    await db.execute({
      sql: 'UPDATE users SET preferences = ? WHERE id = ?',
      args: [serialized, decoded.id]
    });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '操作失败' });
  }
};
