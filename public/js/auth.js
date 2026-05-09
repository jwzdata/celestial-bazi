
// 全局狀態
let currentUser = null;
let currentPayMethod = 'wechat';
let currentOrderId = null;

// 表單五個欄位的出廠預設值，與 public/index.html 上的 value= 屬性對齊。
// 用作 applyPreferencesToForm 的「還是預設狀態嗎？」比較基準，避免在兩處重複寫死字串。
// 若要調整 HTML 的預設，這裡也要同步更新。
const BAZI_INPUT_DEFAULTS = {
  inputDate: '',
  inputTime: '12:00',
  inputGender: '1',
  inputCity: '北京',
  inputLongitude: '116.4074'
};

// 使用者是否已經在表單上動過手腳；一旦為 true，偏好還原會自動跳過以免蓋掉使用者輸入。
// 第一個 input/change 事件會把它翻成 true（見 DOMContentLoaded 裡的綁定）。
let baziFormTouched = false;

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
    await loadUserPreferences();
  } catch (err) {
    currentUser = null;
    localStorage.removeItem('bazi_token');
    document.getElementById('userStatusText').textContent = '登錄 / 註冊';
  }
}

// 載入已登入用戶的偏好設定並填入表單
async function loadUserPreferences() {
  try {
    const res = await apiFetch('/api/preferences');
    if (res && res.preferences && typeof res.preferences === 'object') {
      applyPreferencesToForm(res.preferences);
    }
  } catch (err) {
    // 靜默失敗：載入偏好不應該打擾使用者
    return null;
  }
}

// 將偏好值套用到表單，但只覆蓋仍是出廠預設的欄位，避免蓋掉使用者當前輸入
function applyPreferencesToForm(prefs, options = {}) {
  if (!prefs || typeof prefs !== 'object') return;
  const force = options.force === true;
  // 使用者在兩次網路往返之間已經動過表單 → 不要還原，避免覆蓋他剛輸入/選擇的值
  if (baziFormTouched && !force) return;

  const dateEl = document.getElementById('inputDate');
  const timeEl = document.getElementById('inputTime');
  const genderEl = document.getElementById('inputGender');
  const cityEl = document.getElementById('inputCity');
  const longitudeEl = document.getElementById('inputLongitude');

  // inputDate 的出廠預設是空字串；但 app.js 的 DOMContentLoaded 會把它填成今天的日期，
  // 因此把「今天的日期」也視為仍是預設狀態，讓還原的生日能覆蓋它。
  const today = new Date().toISOString().split('T')[0];
  const isDateDefault = dateEl && (dateEl.value === BAZI_INPUT_DEFAULTS.inputDate || dateEl.value === today);
  if (dateEl && (force || isDateDefault) && typeof prefs.inputDate === 'string' && prefs.inputDate !== '') {
    dateEl.value = prefs.inputDate;
  }

  if (timeEl && (force || timeEl.value === BAZI_INPUT_DEFAULTS.inputTime) && typeof prefs.inputTime === 'string' && prefs.inputTime !== '') {
    timeEl.value = prefs.inputTime;
  }

  if (genderEl && (force || genderEl.value === BAZI_INPUT_DEFAULTS.inputGender) && typeof prefs.inputGender === 'string' && prefs.inputGender !== '') {
    genderEl.value = prefs.inputGender;
  }

  const cityWasDefault = cityEl && cityEl.value === BAZI_INPUT_DEFAULTS.inputCity;
  if (cityEl && (force || cityWasDefault) && typeof prefs.inputCity === 'string' && prefs.inputCity !== '') {
    cityEl.value = prefs.inputCity;
    // 如果沒有提供經度，就讓城市查找補上對應經度
    const longitudeProvided = typeof prefs.inputLongitude === 'string' && prefs.inputLongitude !== '';
    if (!longitudeProvided && longitudeEl && longitudeEl.value === BAZI_INPUT_DEFAULTS.inputLongitude && typeof updateLongitudeFromCity === 'function') {
      updateLongitudeFromCity();
    }
  }

  // 最後套用經度，讓明確提供的經度能勝過城市查找得到的預設值
  if (longitudeEl && (force || longitudeEl.value === BAZI_INPUT_DEFAULTS.inputLongitude) && typeof prefs.inputLongitude === 'string' && prefs.inputLongitude !== '') {
    longitudeEl.value = prefs.inputLongitude;
  }
}

function getCurrentFormPreferences() {
  const dateEl = document.getElementById('inputDate');
  const timeEl = document.getElementById('inputTime');
  const genderEl = document.getElementById('inputGender');
  const cityEl = document.getElementById('inputCity');
  const longitudeEl = document.getElementById('inputLongitude');
  if (!dateEl || !timeEl || !genderEl || !cityEl || !longitudeEl) return null;

  return {
    inputDate: dateEl.value,
    inputTime: timeEl.value,
    inputGender: genderEl.value,
    inputCity: cityEl.value,
    inputLongitude: longitudeEl.value
  };
}

function hasMeaningfulFormPreferences(prefs) {
  if (!prefs) return false;
  const today = new Date().toISOString().split('T')[0];
  return Boolean(
    (prefs.inputDate && prefs.inputDate !== today) ||
    (prefs.inputTime && prefs.inputTime !== BAZI_INPUT_DEFAULTS.inputTime) ||
    (prefs.inputGender && prefs.inputGender !== BAZI_INPUT_DEFAULTS.inputGender) ||
    (prefs.inputCity && prefs.inputCity !== BAZI_INPUT_DEFAULTS.inputCity) ||
    (prefs.inputLongitude && prefs.inputLongitude !== BAZI_INPUT_DEFAULTS.inputLongitude)
  );
}

// 在背景儲存當前表單的偏好值，供下次登入時還原
async function saveUserPreferences(prefs) {
  if (!currentUser) return;
  try {
    await apiFetch('/api/preferences', {
      method: 'PUT',
      body: JSON.stringify({ preferences: prefs })
    });
  } catch (err) {
    // 靜默失敗：背景儲存不應該打擾使用者
  }
}

// UI 控制
function showModal(id) {
  const container = document.getElementById('modalContainer');
  const panels = container.querySelectorAll(':scope > div');

  panels.forEach(el => {
    el.classList.add('hidden');
    el.classList.remove('active', 'modal-panel');
  });

  container.classList.remove('hidden');
  requestAnimationFrame(() => {
    container.classList.add('active');
    const target = document.getElementById(id);
    target.classList.remove('hidden');
    target.classList.add('modal-panel');
    requestAnimationFrame(() => target.classList.add('active'));
  });

  document.addEventListener('keydown', _handleModalEscape);
  container.addEventListener('click', _handleBackdropClick);
}

function closeModals() {
  const container = document.getElementById('modalContainer');
  const activePanel = container.querySelector('.modal-panel.active');

  if (activePanel) {
    activePanel.classList.remove('active');
    setTimeout(() => {
      container.classList.remove('active');
      setTimeout(() => {
        container.classList.add('hidden');
        activePanel.classList.add('hidden');
        activePanel.classList.remove('modal-panel');
      }, 300);
    }, 300);
  } else {
    container.classList.remove('active');
    container.classList.add('hidden');
  }

  document.removeEventListener('keydown', _handleModalEscape);
  container.removeEventListener('click', _handleBackdropClick);
}

function _handleModalEscape(e) { if (e.key === 'Escape') closeModals(); }
function _handleBackdropClick(e) { if (e.target === document.getElementById('modalContainer')) closeModals(); }

// Toast notification system
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast${type !== 'info' ? ' toast-' + type : ''}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3100);
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
  
  if(!username || !password) return showToast('請填寫用戶名和密碼', 'error');
  
  btn.disabled = true;
  btn.textContent = '處理中...';
  
  try {
    const endpoint = isLoginMode ? '/api/login' : '/api/register';
    const body = { username, password };
    if (!isLoginMode) body.ref = sessionStorage.getItem('bazi_ref');
    
    const pendingPrefs = getCurrentFormPreferences();
    const shouldSavePendingPrefs = hasMeaningfulFormPreferences(pendingPrefs);
    const res = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify(body) });
    localStorage.setItem('bazi_token', res.token);
    showToast(res.message, 'success');
    closeModals();
    await initAuth();
    if (shouldSavePendingPrefs) {
      applyPreferencesToForm(pendingPrefs, { force: true });
      await saveUserPreferences(pendingPrefs);
    }
  } catch (err) {
    showToast(err.message, 'error');
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
      showToast('推廣鏈接已複製！發送給好友，好友訂閱您將獲得 30% 佣金。', 'success');
    }).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
    showToast('推廣鏈接已複製！發送給好友，好友訂閱您將獲得 30% 佣金。', 'success');
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
    showToast('訂單創建失敗：' + err.message, 'error');
  }
}

async function mockPaySuccess() {
  if (!currentOrderId) return showToast('訂單未生成', 'error');
  try {
    const res = await apiFetch('/api/pay/mock-success', {
      method: 'POST',
      body: JSON.stringify({ orderId: currentOrderId })
    });
    showToast(res.message, 'success');
    closeModals();
    await initAuth();
    // 重新觸發分析
    document.getElementById('btnAnalyze').click();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// 頁面加載完成初始化
window.addEventListener('DOMContentLoaded', () => {
  initAuth();

  // 監聽五個輸入欄位，一旦使用者互動就把 baziFormTouched 翻為 true，
  // applyPreferencesToForm 會據此跳過覆蓋，避免還原流程蓋掉使用者剛輸入的值。
  const touchFieldIds = ['inputDate', 'inputTime', 'inputGender', 'inputCity', 'inputLongitude'];
  const markTouched = () => { baziFormTouched = true; };
  touchFieldIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', markTouched, { once: true });
    el.addEventListener('change', markTouched, { once: true });
  });
});
