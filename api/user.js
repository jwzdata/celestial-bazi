// GET /api/user
const jwt = require('jsonwebtoken');
const { getDb, initDb } = require('./_db');

const JWT_SECRET = process.env.JWT_SECRET || 'bazi-secret-key-change-me-in-production';

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });

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

    const result = await db.execute({
      sql: 'SELECT id, username, invite_code, vip_expire_time, balance FROM users WHERE id = ?',
      args: [decoded.id]
    });
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const isVip = user.vip_expire_time && new Date(user.vip_expire_time) > new Date();
    res.json({ ...user, isVip });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取用户信息失败' });
  }
};
