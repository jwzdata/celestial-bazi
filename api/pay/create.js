// POST /api/pay/create
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getDb, initDb } = require('../_db');

const JWT_SECRET = process.env.JWT_SECRET || 'bazi-secret-key-change-me-in-production';

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未登录' });

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(403).json({ error: '登录已过期' });
  }

  const { method } = req.body;
  const orderId = uuidv4();
  const amount = 10.00;

  try {
    await initDb();
    const db = getDb();

    await db.execute({
      sql: 'INSERT INTO orders (id, user_id, amount, payment_method) VALUES (?, ?, ?, ?)',
      args: [orderId, decoded.id, amount, method]
    });

    res.json({
      orderId,
      payUrl: `mock://pay?orderId=${orderId}&method=${method}`,
      message: '订单创建成功，请扫码支付'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建订单失败' });
  }
};
