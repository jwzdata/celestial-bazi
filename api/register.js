// POST /api/register
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, initDb } = require('./_db');

const JWT_SECRET = process.env.JWT_SECRET || 'bazi-secret-key-change-me-in-production';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { username, password, ref } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请填写完整信息' });
  if (!/^[a-zA-Z0-9_]{2,20}$/.test(username)) {
    return res.status(400).json({ error: '用户名需2-20位，仅支持字母、数字和下划线' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: '密码至少6位' });
  }

  try {
    await initDb();
    const db = getDb();

    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE username = ?',
      args: [username]
    });
    if (existing.rows.length > 0) return res.status(400).json({ error: '用户名已存在' });

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const result = await db.execute({
      sql: 'INSERT INTO users (username, password, invite_code, invited_by) VALUES (?, ?, ?, ?)',
      args: [username, hash, inviteCode, ref || null]
    });

    const token = jwt.sign(
      { id: Number(result.lastInsertRowid), username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, message: '注册成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '注册失败' });
  }
};
