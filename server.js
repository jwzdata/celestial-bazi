const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'bazi-secret-key-change-me-in-production';

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Database setup (better-sqlite3 is synchronous)
const db = new Database('./bazi.db');
db.exec(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT,
  invite_code TEXT UNIQUE,
  invited_by TEXT,
  vip_expire_time DATETIME,
  balance REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);
db.exec(`CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id INTEGER,
  amount REAL,
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: '未登录' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: '登录已过期' });
    req.user = user;
    next();
  });
};

// 注册 API
app.post('/api/register', (req, res) => {
  const { username, password, ref } = req.body;
  if (!username || !password) return res.status(400).json({ error: '请填写完整信息' });

  try {
    const row = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (row) return res.status(400).json({ error: '用户名已存在' });

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const result = db.prepare('INSERT INTO users (username, password, invite_code, invited_by) VALUES (?, ?, ?, ?)')
      .run(username, hash, inviteCode, ref || null);
    const token = jwt.sign({ id: result.lastInsertRowid, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, message: '注册成功' });
  } catch (err) {
    res.status(500).json({ error: '注册失败' });
  }
});

// 登录 API
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  try {
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(400).json({ error: '用户名或密码错误' });
    }
    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, message: '登录成功' });
  } catch (err) {
    res.status(500).json({ error: '登录失败' });
  }
});

// 获取用户信息 API
app.get('/api/user', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, invite_code, vip_expire_time, balance FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const isVip = user.vip_expire_time && new Date(user.vip_expire_time) > new Date();
    res.json({ ...user, isVip });
  } catch (err) {
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

// 创建订单 API (微信/支付宝)
app.post('/api/pay/create', authenticateToken, (req, res) => {
  const { method } = req.body; // 'wechat' or 'alipay'
  const orderId = uuidv4();
  const amount = 10.00; // 每次订阅 10 元

  try {
    db.prepare('INSERT INTO orders (id, user_id, amount, payment_method) VALUES (?, ?, ?, ?)')
      .run(orderId, req.user.id, amount, method);
    // 注意：这里在实际生产环境中，应该调用微信支付或支付宝的官方 SDK 生成支付二维码链接或 App 调起参数
    // 因为没有商户号，这里返回模拟数据
    res.json({
      orderId,
      payUrl: `mock://pay?orderId=${orderId}&method=${method}`,
      message: '订单创建成功，请扫码支付'
    });
  } catch (err) {
    res.status(500).json({ error: '创建订单失败' });
  }
});

// 模拟支付成功回调 (Webhook)
app.post('/api/pay/mock-success', authenticateToken, (req, res) => {
  const { orderId } = req.body;

  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND status = "pending"').get(orderId);
    if (!order) return res.status(400).json({ error: '订单无效或已支付' });

    // 更新订单状态
    db.prepare('UPDATE orders SET status = "paid" WHERE id = ?').run(orderId);

    // 更新用户 VIP 时间 (增加 30 天)
    const extraTime = 30 * 24 * 60 * 60 * 1000;
    const user = db.prepare('SELECT vip_expire_time, invited_by FROM users WHERE id = ?').get(order.user_id);
    let currentExpire = user.vip_expire_time ? new Date(user.vip_expire_time).getTime() : Date.now();
    if (currentExpire < Date.now()) currentExpire = Date.now();
    const newExpire = new Date(currentExpire + extraTime).toISOString();

    db.prepare('UPDATE users SET vip_expire_time = ? WHERE id = ?').run(newExpire, order.user_id);

    // 处理分销佣金 (30% 佣金 = 3元)
    if (user.invited_by) {
      db.prepare('UPDATE users SET balance = balance + 3 WHERE invite_code = ?').run(user.invited_by);
    }

    res.json({ message: '支付成功，已升级为 VIP！' });
  } catch (err) {
    res.status(500).json({ error: '支付处理失败' });
  }
});

// Fallback for static frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`服务器已启动：http://localhost:${PORT}`);
});
