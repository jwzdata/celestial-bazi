import { state } from './state.js';
import { calculateDayFortune, getShiShen } from '../bazi.js';
import { TG, DZ, WX_GAN, ACT_JI, ACT_XIONG, ACT_PING } from '../data.js';
import { translateNaYin, translateStarNames } from './utils.js';
import { getPrimaryLuckyElement } from './chart-ui.js';

// Pseudo-random pick helper
function seededRand(seed) { let x = Math.sin(seed * 9301 + 49297) * 49297; return x - Math.floor(x); }
function pickItems(seed, arr, n) {
  let pool = [...arr], res = [];
  for (let i = 0; i < n && pool.length; i++) {
    let idx = Math.floor(seededRand(seed + i * 7) * pool.length);
    res.push(pool.splice(idx, 1)[0]);
  }
  return res;
}

export function renderCalendar() {
  document.getElementById('calYearHeader').textContent = state.calYear;
  document.getElementById('calMonthLabel').textContent = state.calYear + '年' + (state.calMonth + 1) + '月';
  
  const updateTime = () => {
    const now = new Date();
    document.getElementById('calTimeNow').textContent = now.toTimeString().split(' ')[0];
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    document.getElementById('calDateNow').textContent = \`\${now.getMonth()+1}月\${now.getDate()}日 星期\${days[now.getDay()]}\`;
  };
  updateTime();
  if(!state.timeInt) state.timeInt = setInterval(updateTime, 1000);
  
  const daysContainer = document.getElementById('calDays');
  daysContainer.innerHTML = '';
  
  let year = state.calYear, month = state.calMonth + 1;
  let firstDay = new Date(year, month - 1, 1);
  let daysInMonth = new Date(year, month, 0).getDate();
  let startDOW = firstDay.getDay();
  
  for (let i = 0; i < startDOW; i++) {
    let empty = document.createElement('div');
    empty.className = 'cal-day opacity-0';
    daysContainer.appendChild(empty);
  }
  
  let todayDate = new Date();
  
  for (let d = 1; d <= daysInMonth; d++) {
    const dayFortune = calculateDayFortune(
      year,
      month,
      d,
      {
        dayGan: state.baziResult.dayGan,
        dayZhi: state.baziResult.dayZhi,
        monthZhi: state.baziResult.monthZhi,
        xiYong: state.baziResult.xiYong
      },
      state.baziResult.meta ? state.baziResult.meta.longitude : 120
    );

    let percentScore = dayFortune.percentScore;
    let fortune = dayFortune.fortune;

    const solar = window.Solar.fromYmdHms(year, month, d, 12, 0, 0);
    const lunar = solar.getLunar();
    const bazi = lunar.getEightChar();
    const dGan = TG.indexOf(bazi.getDayGan());
    const dZhi = DZ.indexOf(bazi.getDayZhi());
    let shishen = getShiShen(state.baziResult.dayGan, dGan);
    
    let isToday = (year === todayDate.getFullYear() && month === (todayDate.getMonth() + 1) && d === todayDate.getDate());
    let todayStyle = isToday ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg bg-accent/5' : '';
    
    let dayCell = document.createElement('div');
    dayCell.className = \`cal-day \${fortune} \${todayStyle} cursor-pointer hover:-translate-y-1\`;
    let numColor = isToday ? 'color:var(--accent);font-weight:900;' : 'color:rgba(255,215,0,0.6)';
    
    dayCell.innerHTML = \`
      <div class="day-num" style="\${numColor}">\${d}\${isToday ? '<span class="ml-1 text-[10px] text-accent/70">今</span>' : ''}</div>
      <div class="text-[10px] text-accent/40 mt-1">\${TG[dGan]}\${DZ[dZhi]}</div>
      <div class="day-score">\${percentScore}</div>
      <div class="day-shishen">\${shishen}</div>
    \`;
    
    dayCell.onclick = () => {
      document.querySelectorAll('.cal-day').forEach(el => el.classList.remove('ring-1', 'ring-accent'));
      dayCell.classList.add('ring-1', 'ring-accent');
      updateSummary(solar, lunar, bazi, dGan, dZhi, shishen, percentScore, fortune, dayFortune);
    };
    
    daysContainer.appendChild(dayCell);
    
    if (isToday || (d === 1 && !document.getElementById('calSummaryDate').textContent)) {
      updateSummary(solar, lunar, bazi, dGan, dZhi, shishen, percentScore, fortune, dayFortune);
      if(isToday) dayCell.classList.add('ring-1', 'ring-accent');
    }
  }
}

export function updateSummary(solar, lunar, bazi, dGan, dZhi, shishen, percentScore, fortune, dayFortune) {
  document.getElementById('calSummaryDate').textContent = \`\${solar.getMonth()}月\${solar.getDay()}日\`;
  let lunarMonth = lunar.getMonthInChinese().replace('腊', '臘').replace('闰', '閏');
  let lunarDay = lunar.getDayInChinese().replace('廿', '廿');
  document.getElementById('calSummaryLunar').textContent = \`農曆\${lunarMonth}月\${lunarDay}\`;
  
  document.getElementById('calSummaryYear').textContent = bazi.getYear();
  document.getElementById('calSummaryMonth').textContent = bazi.getMonth();
  document.getElementById('calSummaryDay').textContent = bazi.getDay();
  document.getElementById('calSummaryWX').textContent = WX_GAN[dGan];
  
  document.getElementById('calSummaryScoreNum').textContent = percentScore;
  
  let dash = Math.max(0.1, percentScore) + ', 100';
  let ring = document.getElementById('calSummaryScoreRing');
  ring.setAttribute('stroke-dasharray', dash);
  
  let color = fortune === 'ji' ? 'var(--wood)' : (fortune === 'xiong' ? 'var(--fire)' : 'rgba(255,215,0,0.6)');
  ring.setAttribute('stroke', color);
  
  let fortuneText = fortune === 'ji' ? '大吉' : (fortune === 'xiong' ? '大凶' : '小吉');
  document.getElementById('calSummaryFortune').innerHTML = \`<span class="w-2 h-2 rounded-full" style="background:\${color}"></span> <span style="color:\${color}">\${fortuneText}</span>\`;
  
  document.getElementById('calSummaryShiShen').textContent = shishen;

  if (dayFortune && dayFortune.details) {
    const details = dayFortune.details;
    let changShengLabel, naYinLabel, solarTimeLabel;

    if (window.currentLang === 'en') {
      changShengLabel = 'Growth Phase:';
      naYinLabel = 'Na Yin:';
      solarTimeLabel = 'True Solar Time:';
    } else {
      changShengLabel = '長生：';
      naYinLabel = '納音：';
      solarTimeLabel = '真太陽時：';
    }

    let analysisHtml = \`
      <div class="text-xs text-accent/70 mt-2 space-y-1">
        <div>\${changShengLabel} \${details.changSheng} (\${details.changShengScore > 0 ? '+' : ''}\${(details.changShengScore * 20).toFixed(0)})</div>
        <div>\${naYinLabel} \${translateNaYin(details.naYin)}</div>
        <div>\${solarTimeLabel} \${details.trueSolarTime}</div>
      </div>
    \`;
    document.getElementById('calSummaryAnalysis').innerHTML = analysisHtml;
  } else {
    document.getElementById('calSummaryAnalysis').innerHTML = '';
  }

  let seed = solar.getYear() * 10000 + solar.getMonth() * 100 + solar.getDay();
  
  let goods = [], bads = [];
  if (fortune === 'ji') {
    goods = pickItems(seed, ACT_JI, 3);
    bads = pickItems(seed + 1, ACT_XIONG, 1);
  } else if (fortune === 'xiong') {
    goods = pickItems(seed, ACT_PING, 1);
    bads = pickItems(seed + 1, ACT_XIONG, 3);
  } else {
    goods = pickItems(seed, ACT_PING, 2);
    bads = pickItems(seed + 1, ACT_XIONG, 2);
  }
  
  document.getElementById('calSummaryGood').innerHTML = goods.map(g => \`<div class="text-wood"><i class="fas fa-check-square mr-1"></i>\${g}</div>\`).join('');
  document.getElementById('calSummaryBad').innerHTML = bads.map(b => \`<div class="text-fire"><i class="fas fa-exclamation-triangle mr-1"></i>\${b}</div>\`).join('');
  
  let advice = "運勢平穩，按部就班即可。";
  if (fortune === 'ji') advice = "今日運勢極佳，適合推進重要事項，把握機會。";
  if (fortune === 'xiong') advice = "今日運勢低迷，宜靜不宜動，注意情緒管理與風險防範。";

  const callLunar = (name, fb) => (lunar && typeof lunar[name] === 'function') ? lunar[name]() : fb;
  const jiShenRaw   = (callLunar('getDayJiShen', []) || []).slice(0, 6);
  const xiongShaRaw = (callLunar('getDayXiongSha', []) || []).slice(0, 6);

  let jiShen, xiongSha;
  if (window.currentLang === 'en') {
    jiShen = translateStarNames(jiShenRaw).join(', ');
    xiongSha = translateStarNames(xiongShaRaw).join(', ');
  } else {
    jiShen = jiShenRaw.join('、');
    xiongSha = xiongShaRaw.join('、');
  }

  if (jiShen || xiongSha) {
    if (window.currentLang === 'en') {
      advice += (jiShen   ? \` | Auspicious Stars: \${jiShen}\` : '');
      advice += (xiongSha ? \` | Inauspicious Stars: \${xiongSha}\` : '');
    } else {
      advice += (jiShen   ? \`｜吉神：\${jiShen}\` : '');
      advice += (xiongSha ? \`｜凶煞：\${xiongSha}\` : '');
    }
  }
  document.getElementById('calSummaryAdvice').textContent = advice;
}
