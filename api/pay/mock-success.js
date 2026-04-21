// POST /api/pay/mock-success
const jwt = require('jsonwebtoken');
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

  const { orderId } = req.body;

  try {
    await initDb();
    const db = getDb();

    const orderRes = await db.execute({
      sql: 'SELECT * FROM orders WHERE id = ? AND status = "pending"',
      args: [orderId]
    });
    const order = orderRes.rows[0];
    if (!order) return res.status(400).json({ error: '订单无效或已支付' });

    // 更新订单状态
    await db.execute({
      sql: 'UPDATE orders SET status = "paid" WHERE id = ?',
      args: [orderId]
    });

    // 更新用户 VIP 时间（增加 30 天）
    const extraTime = 30 * 24 * 60 * 60 * 1000;
    const userRes = await db.execute({
      sql: 'SELECT vip_expire_time, invited_by FROM users WHERE id = ?',
      args: [order.user_id]
    });
    const user = userRes.rows[0];

    let currentExpire = user.vip_expire_time ? new Date(user.vip_expire_time).getTime() : Date.now();
    if (currentExpire < Date.now()) currentExpire = Date.now();
    const newExpire = new Date(currentExpire + extraTime).toISOString();

    await db.execute({
      sql: 'UPDATE users SET vip_expire_time = ? WHERE id = ?',
      args: [newExpire, order.user_id]
    });

    // 处理分销佣金（30% = 3元）
    if (user.invited_by) {
      await db.execute({
        sql: 'UPDATE users SET balance = balance + 3 WHERE invite_code = ?',
        args: [user.invited_by]
      });
    }

    res.json({ message: '支付成功，已升级为 VIP！' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '支付处理失败' });
  }
};
