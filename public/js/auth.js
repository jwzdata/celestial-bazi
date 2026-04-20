
// 全局状态
let currentUser = null;
let currentPayMethod = 'wechat';
let currentOrderId = null;

// 检查邀请码
const urlParams = new URLSearchParams(window.location.search);
const refCode = urlParams.get('ref');
if (refCode) {
  sessionStorage.setItem('bazi_ref', refCode);
}

// API 请求封装
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('bazi_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(endpoint, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

// 初始化用户状态
async function initAuth() {
  try {
    const user = await apiFetch('/api/user');
    currentUser = user;
    document.getElementById('userStatusText').textContent = '用户中心';
  } catch (err) {
    currentUser = null;
    localStorage.removeItem('bazi_token');
    document.getElementById('userStatusText').textContent = '登录 / 注册';
  }
}

// UI 控制
function showModal(id) {
  document.getElementById('modalContainer').classList.remove('hidden');
  document.querySelectorAll('#modalContainer > div').forEach(el => el.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

function closeModals() {
  document.getElementById('modalContainer').classList.add('hidden');
}

// 头部按钮点击
document.getElementById('btnUser').addEventListener('click', () => {
  if (currentUser) {
    document.getElementById('uName').textContent = currentUser.username;
    document.getElementById('uVip').textContent = currentUser.isVip ? `VIP (至 ${new Date(currentUser.vip_expire_time).toLocaleDateString()})` : '普通用户';
    document.getElementById('uVip').className = currentUser.isVip ? 'font-bold text-fire' : 'font-bold text-accent/50';

    document.getElementById('uBalance').textContent = currentUser.balance.toFixed(2);
    document.getElementById('refLink').value = `${window.location.origin}/?ref=${currentUser.invite_code}`;
    showModal('userModal');
  } else {
    isLoginMode = true;
    toggleAuthMode();
    showModal('authModal');
  }
});

// 登录/注册逻辑
let isLoginMode = true;
function toggleAuthMode() {
  const title = document.getElementById('authTitle');
  const btn = document.getElementById('btnAuthSubmit');
  const toggleText = document.getElementById('authToggleText');
  const toggleBtn = document.getElementById('btnAuthToggle');
  
  if (isLoginMode) {
    title.textContent = '用户登录';
    btn.textContent = '登录';
    toggleText.textContent = '没有账号？';
    toggleBtn.textContent = '立即注册';
  } else {
    title.textContent = '账号注册';
    btn.textContent = '注册';
    toggleText.textContent = '已有账号？';
    toggleBtn.textContent = '直接登录';
  }
}

document.getElementById('btnAuthToggle').addEventListener('click', (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  toggleAuthMode();
});

document.getElementById('btnAuthSubmit').addEventListener('click', async () => {
  const username = document.getElementById('authUsername').value;
  const password = document.getElementById('authPassword').value;
  const btn = document.getElementById('btnAuthSubmit');
  
  if(!username || !password) return alert('请填写用户名和密码');
  
  btn.disabled = true;
  btn.textContent = '处理中...';
  
  try {
    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    const body = { username, password };
    if (!isLoginMode) body.ref = sessionStorage.getItem('bazi_ref');
    
    const res = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) });
    localStorage.setItem('bazi_token', res.token);
    alert(res.message);
    closeModals();
    await initAuth();
  } catch (err) {
    alert(err.message);
  } finally {
    btn.disabled = false;
    toggleAuthMode();
  }
});

function logout() {
  localStorage.removeItem('bazi_token');
  currentUser = null;
  document.getElementById('userStatusText').textContent = '登录 / 注册';
  closeModals();
}

function copyRef() {
  const input = document.getElementById('refLink');
  input.select();
  document.execCommand('copy');
  alert('推广链接已复制！发送给好友，好友订阅您将获得 30% 佣金。');
}

// 支付逻辑
function selectPay(method) {
  currentPayMethod = method;
  const btnW = document.getElementById('btnWechat');
  const btnA = document.getElementById('btnAlipay');
  
  if (method === 'wechat') {
    btnW.className = 'flex-1 py-3 border-2 border-wood bg-wood/10 text-wood rounded-xl font-bold transition-all';
    btnA.className = 'flex-1 py-3 border-2 border-transparent bg-water/10 text-water rounded-xl font-bold transition-all opacity-60';
    document.getElementById('payMethodText').textContent = '微信';
  } else {
    btnW.className = 'flex-1 py-3 border-2 border-transparent bg-wood/10 text-wood rounded-xl font-bold transition-all opacity-60';
    btnA.className = 'flex-1 py-3 border-2 border-water bg-water/10 text-water rounded-xl font-bold transition-all';
    document.getElementById('payMethodText').textContent = '支付宝';
  }
  createOrder();
}

async function createOrder() {
  try {
    const res = await apiFetch('/api/pay/create', { 
      method: 'POST', 
      body: JSON.stringify({ method: currentPayMethod }) 
    });
    currentOrderId = res.orderId;
    // 实际项目中这里会把 res.payUrl 生成二维码显示
    console.log('订单已创建:', res);
  } catch (err) {
    alert('订单创建失败：' + err.message);
  }
}

async function mockPaySuccess() {
  if (!currentOrderId) return alert('订单未生成');
  try {
    const res = await apiFetch('/api/pay/mock-success', {
      method: 'POST',
      body: JSON.stringify({ orderId: currentOrderId })
    });
    alert(res.message);
    closeModals();
    await initAuth();
    // 重新触发分析
    document.getElementById('btnAnalyze').click();
  } catch (err) {
    alert(err.message);
  }
}

// 页面加载完成初始化
window.addEventListener('DOMContentLoaded', () => {
  initAuth();
});
