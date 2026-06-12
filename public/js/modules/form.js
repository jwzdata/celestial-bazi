import { state } from './state.js';
import { countWuXing, judgeStrength, getXiYong, getPillarsUsingLunar, computeYongShenFrameworks } from '../bazi.js';
import { WX_GAN } from '../data.js';
import { transitionSection, fallbackCopy } from './utils.js';
import { renderPillars, renderPrecisionMeta, renderProInfo, renderWuXing, renderStrength, renderTraits, renderXiYong, renderLucky } from './chart-ui.js';
import { renderCalendar } from './calendar-ui.js';

export function analyze() {
  const dateStr = document.getElementById('inputDate').value;
  const timeStr = document.getElementById('inputTime').value;
  const longitudeStr = document.getElementById('inputLongitude').value;
  const gender = parseInt(document.getElementById('inputGender').value);
  const rules = {
    dayChangeRule: document.getElementById('inputDayChangeRule').value,
    useTrueSolarTime: document.getElementById('inputUseTrueSolarTime').checked,
    timezoneOffset: parseInt(document.getElementById('inputTimezone').value) || -480
  };

  const errEl = document.getElementById('errorMsg');
  const btnEl = document.getElementById('btnAnalyze');
  errEl.classList.add('hidden');

  if (!dateStr || !timeStr || !longitudeStr) {
    errEl.textContent = '請填寫完整的出生日期、時間和經度。';
    errEl.classList.remove('hidden');
    return;
  }

  let [year, month, day] = dateStr.split('-').map(Number);
  let timeVal = timeStr;
  let longitudeVal = parseFloat(longitudeStr);

  btnEl.disabled = true;
  btnEl.textContent = '解析中...';
  
  transitionSection(
    document.getElementById('heroSection'),
    document.getElementById('loadingSection')
  );

  let p = 0;
  let lBar = document.getElementById('loadingBar');
  let loadInterval = setInterval(() => {
    p += 15;
    if (p > 90) p = 90;
    lBar.style.width = p + '%';
  }, 150);

  setTimeout(() => {
    let success = false;
    try {
      let pillars = getPillarsUsingLunar(year, month, day, timeVal, longitudeVal, rules);
      let yp = pillars[0];
      let mp = pillars[1];
      let dp = pillars[2];
      let hp = pillars[3];
      
      let wxCount = countWuXing(pillars, [1.0, 1.5, 1.2, 1.0]);
      let strength = judgeStrength(dp.gan, mp.zhi, wxCount, pillars);
      
      const frameworks = computeYongShenFrameworks ? computeYongShenFrameworks({
        dayGan: dp.gan, monthZhi: mp.zhi, strength, wxCount
      }) : null;
      if (frameworks && strength && strength.direction) {
        frameworks._direction = strength.direction;
      }

      let xiYong = getXiYong(dp.gan, strength.isStrong, strength.ctrlEl, strength.motherEl, strength.childWX, strength.wealthEl, frameworks);
      
      state.baziResult = {
        pillars, wxCount, strength, xiYong,
        dayGan: dp.gan,
        dayGanWX: WX_GAN[dp.gan],
        monthZhi: mp.zhi,
        isStrong: strength.isStrong,
        gender,
        frameworks,
        rules,
        precision: pillars.meta
      };
      
      state.calYear = new Date().getFullYear();
      state.calMonth = new Date().getMonth();
      
      renderPillars(pillars, dp.gan);
      renderPrecisionMeta();
      renderProInfo();
      renderWuXing(wxCount);
      renderStrength(dp.gan, mp.zhi, strength);
      renderTraits(dp.gan, strength.isStrong);
      renderXiYong(xiYong);
      renderCalendar();
      renderLucky();
      
      success = true;
      transitionSection(
        document.getElementById('loadingSection'),
        document.getElementById('resultSection'),
        () => {
          initScrollReveal();
          if (window.innerWidth < 768) {
            document.getElementById('bottomNav').classList.remove('hidden');
          }
        }
      );
      document.getElementById('btnReset').classList.remove('hidden');
      
      btnEl.disabled = false;
      btnEl.textContent = '開始解析';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      errEl.textContent = '排盤失敗，請檢查輸入後重試。';
      errEl.classList.remove('hidden');
      document.getElementById('bottomNav').classList.add('hidden');
      transitionSection(
        document.getElementById('loadingSection'),
        document.getElementById('heroSection')
      );
    } finally {
      clearInterval(loadInterval);
      btnEl.disabled = false;
      btnEl.textContent = '開始解析';
      if (!success) document.getElementById('btnReset').classList.add('hidden');
    }
  }, 1200);
}

export function initScrollReveal() {
  let observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal, .reveal-left, .reveal-scale').forEach(el => {
    el.classList.remove('visible');
    observer.observe(el);
  });
}

export function initParticles() {
  const container = document.getElementById('particles');
  if(!container) return;
  const count = window.innerWidth < 768 ? 20 : 40;
  for (let i = 0; i < count; i++) {
    let p = document.createElement('div');
    p.className = 'particle';
    let size = 1 + Math.random() * 2;
    let left = Math.random() * 100;
    let delay = Math.random() * 20;
    let duration = 15 + Math.random() * 20;
    p.style.cssText = `
      width:${size}px;height:${size}px;
      left:${left}%;bottom:-10px;
      animation:particleRise ${duration}s linear ${delay}s infinite;
      opacity:${0.15 + Math.random() * 0.3};
    `;
    container.appendChild(p);
  }
}

const baziTips = [
  { tag: '十神', text: "「正財」代表正當收入與穩定積累，也常對應男命的妻星。適合用“長期主義”的方式打造財富。" },
  { tag: '五行', text: "「木」主仁，其性直，其情和。木旺之人多重情義，適合做教育、內容、品牌與長期經營。" },
  { tag: '天干', text: "「甲木」如參天大樹，重原則、講擔當。優勢在於扛事與格局，短板是容易剛直不圓融。" },
  { tag: '地支', text: "「子水」爲陽水，主機敏與應變。子旺之人思維快，適合策略、產品、運營與跨界整合。" },
  { tag: '空亡', text: "「空亡」不必然全兇。若忌神落空亡，反而像“消災”，關鍵看命局整體配合與運勢流轉。" },
  { tag: '桃花', text: "「桃花星」主管人緣與魅力。真正的桃花運不是“多”，而是“對”：有邊界、有篩選、有成長。" },
  { tag: '財庫', text: "辰戌丑未爲“四庫”。命局見財庫，往往更擅長存錢與做“資產型選擇”，重在守與積。" },
  { tag: '驛馬', text: "「驛馬星」代表走動與變動。驛馬旺者適合出差、跨城、跨境與流動性更強的行業賽道。" }
];

export function getDailyTipIndex() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  let seed = y * 10000 + m * 100 + d;
  if (state.baziResult && typeof state.baziResult.dayGan === 'number') {
    seed += state.baziResult.dayGan * 97;
  }
  seed = Math.abs(seed);
  return seed % baziTips.length;
}

export function refreshTip(forceRandom = false) {
  const tipEl = document.getElementById('tipContent');
  if (!tipEl) return;
  state.currentTipIndex = forceRandom ? Math.floor(Math.random() * baziTips.length) : getDailyTipIndex();
  const tip = baziTips[state.currentTipIndex];
  tipEl.innerHTML = `<div class="fade-in"><span class="text-xs text-accent/60">【<span>${tip.tag}</span>】</span> <span>${tip.text}</span></div>`;
}

export async function copyTip() {
  const tip = baziTips[state.currentTipIndex >= 0 ? state.currentTipIndex : getDailyTipIndex()];
  const tTag = typeof window.translateText === 'function' ? window.translateText(tip.tag) : tip.tag;
  const tText = typeof window.translateText === 'function' ? window.translateText(tip.text) : tip.text;
  const tTitle = typeof window.translateText === 'function' ? window.translateText('每日命理小貼士') : '每日命理小貼士';
  const tSource = typeof window.translateText === 'function' ? window.translateText('來自星曜命理') : '來自星曜命理';
  const shareText = `【${tTitle} | ${tTag}】${tText} (${tSource})`;
  try {
    await navigator.clipboard.writeText(shareText);
    window.showToast(typeof window.translateText === 'function' ? window.translateText('已複製，可直接粘貼到朋友圈/社羣。') : '已複製，可直接粘貼到朋友圈/社羣。', 'success');
  } catch (e) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(shareText); } catch (_) {
        fallbackCopy(shareText);
      }
    } else {
      fallbackCopy(shareText);
    }
    window.showToast(typeof window.translateText === 'function' ? window.translateText('已複製，可直接粘貼到朋友圈/社羣。') : '已複製，可直接粘貼到朋友圈/社羣。', 'success');
  }
}

export function initBottomNav() {
  const nav = document.getElementById('bottomNav');
  if (!nav) return;

  nav.querySelectorAll('.bottom-nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      nav.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const section = btn.dataset.section;
      const targets = {
        pillars: '#pillarGrid',
        wuxing: '#wxChart',
        calendar: '#calendarGrid',
        features: '#premiumFeaturesGrid',
        user: null
      };

      if (section === 'user') {
        document.getElementById('btnUser').click();
      } else if (targets[section]) {
        const el = document.querySelector(targets[section]);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

export function initModalSwipe() {
  const container = document.getElementById('modalContainer');
  if (!container) return;

  let startY = 0, currentY = 0, isDragging = false;

  container.addEventListener('touchstart', (e) => {
    if (window.innerWidth > 640) return;
    const panel = e.target.closest('.modal-panel');
    if (!panel || panel.scrollTop > 0) return;
    startY = e.touches[0].clientY;
    isDragging = true;
    panel.style.transition = 'none';
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if (diff > 0) {
      const panel = container.querySelector('.modal-panel.active');
      if (panel) panel.style.transform = `translateY(${diff}px)`;
    }
  }, { passive: true });

  container.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    const diff = currentY - startY;
    const panel = container.querySelector('.modal-panel.active');
    if (panel) {
      panel.style.transition = '';
      if (diff > 120) {
        window.closeModals();
      } else {
        panel.style.transform = '';
      }
    }
    currentY = 0;
  });
}
