
// 全局狀態
let currentUser = null;
let currentPayMethod = 'wechat';
let currentOrderId = null;

// 檢查邀請碼
const urlParams = new URLSearchParams(window.location.search);
const refCode = urlParams.get('ref');
if (refCode) {
  sessionStorage.setItem('bazi_ref', refCode);
}

// API 請求封裝
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('bazi_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch(endpoint, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '請求失敗');
  return data;
}

// 初始化用戶狀態
async function initAuth() {
  try {
    const user = await apiFetch('/api/user');
    currentUser = user;
    document.getElementById('userStatusText').textContent = '用戶中心';
  } catch (err) {
    currentUser = null;
    localStorage.removeItem('bazi_token');
    document.getElementById('userStatusText').textContent = '登錄 / 註冊';
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

// 頭部按鈕點擊
document.getElementById('btnUser').addEventListener('click', () => {
  if (currentUser) {
    document.getElementById('uName').textContent = currentUser.username;
    document.getElementById('uVip').textContent = currentUser.isVip ? `VIP (至 ${new Date(currentUser.vip_expire_time).toLocaleDateString()})` : '普通用戶';
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

// 登錄/註冊邏輯
let isLoginMode = true;
function toggleAuthMode() {
  const title = document.getElementById('authTitle');
  const btn = document.getElementById('btnAuthSubmit');
  const toggleText = document.getElementById('authToggleText');
  const toggleBtn = document.getElementById('btnAuthToggle');
  
  if (isLoginMode) {
    title.textContent = '用戶登錄';
    btn.textContent = '登錄';
    toggleText.textContent = '沒有賬號？';
    toggleBtn.textContent = '立即註冊';
  } else {
    title.textContent = '賬號註冊';
    btn.textContent = '註冊';
    toggleText.textContent = '已有賬號？';
    toggleBtn.textContent = '直接登錄';
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
  
  if(!username || !password) return alert('請填寫用戶名和密碼');
  
  btn.disabled = true;
  btn.textContent = '處理中...';
  
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
  document.getElementById('userStatusText').textContent = '登錄 / 註冊';
  closeModals();
}

function copyRef() {
  const input = document.getElementById('refLink');
  const text = input.value;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      alert('推廣鏈接已複製！發送給好友，好友訂閱您將獲得 30% 佣金。');
    }).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
    alert('推廣鏈接已複製！發送給好友，好友訂閱您將獲得 30% 佣金。');
  }
}
function fallbackCopy(text) {
  const tmp = document.createElement('textarea');
  tmp.value = text;
  tmp.style.position = 'fixed';
  tmp.style.opacity = '0';
  document.body.appendChild(tmp);
  tmp.select();
  try { document.execCommand('copy'); } catch(_) {}
  tmp.remove();
}

// 支付邏輯
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
    document.getElementById('payMethodText').textContent = '支付寶';
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
    // 實際項目中這裏會把 res.payUrl 生成二維碼顯示
    console.log('訂單已創建:', res);
  } catch (err) {
    alert('訂單創建失敗：' + err.message);
  }
}

async function mockPaySuccess() {
  if (!currentOrderId) return alert('訂單未生成');
  try {
    const res = await apiFetch('/api/pay/mock-success', {
      method: 'POST',
      body: JSON.stringify({ orderId: currentOrderId })
    });
    alert(res.message);
    closeModals();
    await initAuth();
    // 重新觸發分析
    document.getElementById('btnAnalyze').click();
  } catch (err) {
    alert(err.message);
  }
}

// 頁面加載完成初始化
window.addEventListener('DOMContentLoaded', () => {
  initAuth();
});
