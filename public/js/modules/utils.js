import { state } from './state.js';
import { CITY_LONGITUDES } from '../data.js';

export function transitionSection(hideEl, showEl, callback) {
  hideEl.classList.add('section-exit-active');
  setTimeout(() => {
    hideEl.classList.add('hidden');
    hideEl.classList.remove('section-exit-active');
    showEl.classList.remove('hidden');
    showEl.classList.add('section-enter');
    requestAnimationFrame(() => {
      showEl.classList.remove('section-enter');
      showEl.classList.add('section-enter-active');
      setTimeout(() => {
        showEl.classList.remove('section-enter-active');
        if (callback) callback();
      }, 500);
    });
  }, 300);
}

export function formatLongitudeDisplay(longitude) {
  const value = Number(longitude);
  if (!Number.isFinite(value)) return '—';
  return `${Math.abs(value).toFixed(4)}°${value < 0 ? 'W' : 'E'}`;
}

export function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
}

const lazyScriptPromises = {};
export function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  ]);
}

export function loadScriptOnce(url, globalName) {
  if (globalName && window[globalName]) return Promise.resolve();
  if (lazyScriptPromises[url]) return lazyScriptPromises[url];
  lazyScriptPromises[url] = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${url}`));
    document.head.appendChild(script);
  });
  return lazyScriptPromises[url];
}

export async function ensurePosterDependencies() {
  await loadScriptOnce('https://html2canvas.hertzen.com/dist/html2canvas.min.js', 'html2canvas');
  await loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js', 'qrcode');
}

export function generateQRCode(canvas, data) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const modules = 21; // QR version 1
  const cellSize = Math.floor(size / (modules + 2));
  const offset = Math.floor((size - cellSize * modules) / 2);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  const qrLib = window.qrcode;
  if (qrLib) {
    const qr = qrLib(0, 'M');
    qr.addData(data);
    qr.make();
    const moduleCount = qr.getModuleCount();
    const cellSz = size / moduleCount;
    ctx.fillStyle = '#000000';
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (qr.isDark(r, c)) {
          ctx.fillRect(c * cellSz, r * cellSz, cellSz, cellSz);
        }
      }
    }
  } else {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#f0d78c';
    ctx.font = `${Math.floor(size / 15)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('QR Code', size / 2, size / 2 - 10);
    ctx.fillStyle = 'rgba(255,215,0,0.5)';
    ctx.font = `${Math.floor(size / 25)}px sans-serif`;
    ctx.fillText(window.location.origin, size / 2, size / 2 + 15);
  }
}

export function translateNaYin(naYin) {
  if (window.currentLang !== "en") return naYin;

  const naYinMap = {
    "海中金": "Sea Gold", "爐中火": "Furnace Fire", "大林木": "Forest Wood", "路旁土": "Road Earth",
    "劍鋒金": "Sword Gold", "山頭火": "Mountain Fire", "澗下水": "Stream Water", "城頭土": "Wall Earth",
    "白蠟金": "White Wax Gold", "楊柳木": "Willow Wood", "泉中水": "Spring Water", "屋上土": "Roof Earth",
    "霹靂火": "Thunder Fire", "松柏木": "Pine Wood", "長流水": "Flowing Water", "砂石金": "Gravel Gold",
    "山下火": "Mountain Fire", "平地木": "Field Wood", "壁上土": "Wall Earth", "金箔金": "Gold Foil",
    "覆燈火": "Lamp Fire", "天河水": "Heaven River Water", "大驛土": "Post Station Earth", "釵環金": "Hairpin Gold",
    "桑柘木": "Mulberry Wood", "大溪水": "Big Stream Water", "沙中土": "Sand Earth", "天上火": "Heaven Fire",
    "石榴木": "Pomegranate Wood", "大海水": "Ocean Water"
  };

  return naYinMap[naYin] || naYin;
}

export function translateStarNames(starNames) {
  if (window.currentLang !== "en") return starNames;

  const starMap = {
    "天乙貴人": "Tian Yi Noble", "文昌貴人": "Wen Chang Noble", "華蓋": "Hua Gai (Canopy)",
    "將星": "General Star", "祿神": "Lu (Prosperity) Star", "羊刃": "Yang Ren (Blade)",
    "金輿": "Jin Yu (Golden Carriage)", "天德": "Heavenly Virtue", "月德": "Monthly Virtue",
    "天醫": "Heavenly Doctor", "太極貴人": "Taiji Noble", "福星貴人": "Lucky Star Noble",
    "三奇": "Three Wonders", "三合": "Three Harmony", "臨官": "Official Position",
    "临官": "Official Position", "帝旺": "Imperial Power", "長生": "Growth", "长生": "Growth",
    "沐浴": "Bath", "冠帶": "Crown", "冠带": "Crown", "養": "Nurture", "养": "Nurture",
    "胎": "Conception", "胎": "Conception", "時陰": "Hour Yin", "时阴": "Hour Yin",
    "敬安": "Respectful Peace", "除神": "Dispelling Spirit", "金匱": "Golden Treasury",
    "金匮": "Golden Treasury", "月厭": "Month Hate", "月厌": "Month Hate", "地火": "Earth Fire",
    "死氣": "Death Qi", "死气": "Death Qi", "往亡": "Gone and Lost", "五離": "Five Separations",
    "五离": "Five Separations", "行狠": "Cruel Action", "劫煞": "Robbery Spirit", "災煞": "Disaster Spirit",
    "歲煞": "Year Spirit", "勾絞": "Hook and Twist", "孤辰": "Lonely Stem", "寡宿": "Widowed Branch",
    "天狗": "Heavenly Dog", "白虎": "White Tiger", "朱雀": "Vermilion Bird", "玄武": "Black Tortoise",
    "病符": "Sickness Token", "大耗": "Great Loss", "小耗": "Small Loss", "破敗": "Broken and Defeated",
    "咸池": "Salty Pool", "桃花": "Peach Blossom", "空亡": "Void and Extinct"
  };

  return starNames.map(star => starMap[star] || star);
}

export function translatePengZuGan(pengZuGan) {
  if (!pengZuGan) return "";
  const ganMap = {
    "甲不經絡織機虛張": "Jia: Do not engage in weaving or networking (excessive expansion)",
    "乙不祭祀神鬼不尝": "Yi: Do not perform sacrifices to spirits (offerings will not be accepted)",
    "丙不修灶必見火殃": "Bing: Do not repair stoves (fire disaster may occur)",
    "丁不剃頭頭必生瘡": "Ding: Do not cut hair (sores may develop on the head)",
    "戊不伐樹誰克斧頭": "Wu: Do not cut trees (conflict with tools)",
    "己不買豬猡必見瘟": "Ji: Do not buy pigs (disease may occur)",
    "庚不修倉必見凶殃": "Geng: Do not repair granaries (bad omen may appear)",
    "庚不经络织机虚张": "Geng: Do not repair granaries (bad omen may appear)",
    "辛不合醬必有瘟疾": "Xin: Do not make sauce (plague or illness may occur)",
    "壬不決水水必反": "Ren: Do not drain water (water will flow back)",
    "癸不詞訟必見凶": "Gui: Do not engage in lawsuits (bad outcome guaranteed)"
  };
  return ganMap[pengZuGan] || pengZuGan;
}

export function translatePengZuZhi(pengZuZhi) {
  if (!pengZuZhi) return "";
  const zhiMap = {
    "子不問卜自惹禍殃": "Zi: Do not consult divination (will invite disaster)",
    "丑不冠帶主不還鄉": "Chou: Do not wear hats/crowns (will not return home)",
    "寅不祭祀神鬼不尝": "Yin: Do not perform sacrifices (spirits will not accept)",
    "卯不穿井常常更換": "Mao: Do not dig wells (will need constant replacement)",
    "辰不哭泣必主重喪": "Chen: Do not cry (major funeral may occur)",
    "巳不遠行財物伏藏": "Si: Do not travel far (wealth will be hidden/lost)",
    "午不苫蓋屋主更張": "Wu: Do not thatch roofs (house will need reconstruction)",
    "未不服藥毒氣入腸": "Wei: Do not take medicine (poison will enter intestines)",
    "申不安床鬼祟入房": "Shen: Do not arrange beds (ghosts will enter room)",
    "酉不會客賓主相傷": "You: Do not receive guests (both host and guest will be harmed)",
    "戌不吃犬作怪上床": "Xu: Do not eat dog meat (strange things will happen)",
    "亥不嫁娶不利新郎": "Hai: Do not marry (bad for the groom)"
  };
  return zhiMap[pengZuZhi] || pengZuZhi;
}

export const CITY_GEOCODE_ALIASES = {
  '伦敦': 'London', '倫敦': 'London', '纽约': 'New York', '紐約': 'New York',
  '巴黎': 'Paris', '东京': 'Tokyo', '東京': 'Tokyo', '首尔': 'Seoul', '首爾': 'Seoul',
  '洛杉矶': 'Los Angeles', '洛杉磯': 'Los Angeles'
};

export function normalizeCityName(name) {
  return String(name || '').trim().replace(/[\s省市县縣區区]/g, '');
}

export function findCityLongitude(name) {
  const raw = String(name || '').trim();
  if (!raw) return null;
  if (CITY_LONGITUDES[raw] != null) return CITY_LONGITUDES[raw];
  const normalized = normalizeCityName(raw);
  for (const [city, longitude] of Object.entries(CITY_LONGITUDES)) {
    const c = normalizeCityName(city);
    if (c === normalized || c.endsWith(normalized) || normalized.endsWith(c)) return longitude;
  }
  return null;
}

export function getCitySearchName(name) {
  const raw = String(name || '').trim();
  return CITY_GEOCODE_ALIASES[raw] || CITY_GEOCODE_ALIASES[normalizeCityName(raw)] || raw;
}

export function pickBestGeocodingResult(results) {
  if (!Array.isArray(results) || results.length === 0) return null;
  return results
    .filter(item => Number.isFinite(Number(item.longitude)))
    .sort((a, b) => (Number(b.population) || 0) - (Number(a.population) || 0))[0] || null;
}

export async function fetchCityLongitude(name) {
  const searchName = getCitySearchName(name);
  if (!searchName) return null;
  const params = new URLSearchParams({ name: searchName, count: '10', language: window.currentLang === 'en' ? 'en' : 'zh', format: 'json' });
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`);
  if (!response.ok) return null;
  const data = await response.json();
  const match = pickBestGeocodingResult(data.results);
  if (!match) return null;
  return Number(match.longitude).toFixed(4);
}

export async function updateLongitudeFromCity(options = {}) {
  const silent = options.silent === true;
  const requestId = ++state.cityLookupRequestId;
  const cityEl = document.getElementById('inputCity');
  const longitudeEl = document.getElementById('inputLongitude');
  const localLongitude = findCityLongitude(cityEl.value);
  if (localLongitude != null) {
    longitudeEl.value = localLongitude;
    return true;
  }
  try {
    const longitude = await fetchCityLongitude(cityEl.value);
    if (requestId !== state.cityLookupRequestId) return false;
    if (longitude == null) {
      if (!silent) window.showToast('未找到該城市，請手動填寫出生地經度', 'error');
      return false;
    }
    longitudeEl.value = longitude;
    return true;
  } catch (err) {
    if (!silent) window.showToast('城市經度查詢失敗，請手動填寫出生地經度', 'error');
    return false;
  }
}

export function initCityDatalist() {
  const list = document.getElementById('cityList');
  if (!list || typeof CITY_LONGITUDES === 'undefined') return;
  list.innerHTML = Object.keys(CITY_LONGITUDES)
    .sort((a, b) => a.localeCompare(b, 'zh-Hant'))
    .map(city => `<option value="${city}"></option>`)
    .join('');
}

export function fallbackCopy(text) {
  const tmp = document.createElement('textarea');
  tmp.value = text;
  tmp.style.position = 'fixed';
  tmp.style.opacity = '0';
  document.body.appendChild(tmp);
  tmp.select();
  try { document.execCommand('copy'); } catch(_) {}
  tmp.remove();
}
