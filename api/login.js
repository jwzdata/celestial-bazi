// POST /api/login
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, initDb } = require('./_db');

const JWT_SECRET = process.env.JWT_SECRET || 'bazi-secret-key-change-me-in-production';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请填写用户名和密码' });

  try {
    await initDb();
    const db = getDb();

    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE username = ?',
      args: [username]
    });
    const user = result.rows[0];

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(400).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { id: Number(user.id), username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, message: '登录成功' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '登录失败' });
  }
};
