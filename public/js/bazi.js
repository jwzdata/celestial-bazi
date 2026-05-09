// ============================
// 排盤計算核心
// ============================

// 預設柱位權重（年月日時）。若不傳權重則退化為舊版統一權重，
// 使 renderCalendar 等舊呼叫端維持同樣的日柱吉凶評分。
const DEFAULT_PILLAR_WEIGHTS = [1.0, 1.0, 1.0, 1.0];
const BAZI_PILLAR_WEIGHTS   = [1.0, 1.5, 1.2, 1.0];

function countWuXing(pillars, pillarWeights) {
  const weights = Array.isArray(pillarWeights) && pillarWeights.length === 4
    ? pillarWeights
    : DEFAULT_PILLAR_WEIGHTS;
  let count = {'金':0,'木':0,'水':0,'火':0,'土':0};
  pillars.forEach((p, i) => {
    const w = weights[i] ?? 1.0;
    count[WX_GAN[p.gan]] += 1.5 * w;
    let cg = CANG_GAN[p.zhi];
    cg.forEach((g, ci) => { count[WX_GAN[g]] += CG_WEIGHT[ci] * w; });
  });
  return count;
}

// ============================
// 得令 / 得地 / 得勢 強弱模型
// ============================
// 回傳：
//   score        0~100，deLing 30 / deDi 每柱 6（封頂 18）/ deShi 每柱 6（封頂 18）/
//                扶抑差額縮放為 ±12
//   tier         極弱 / 偏弱 / 中和 / 偏強 / 極強
//   isStrong     score >= 50（向下相容 getXiYong 與舊 renderTraits）
//   deLing       月令是否助日主（月支本氣為日主或印星）
//   deDi         非日柱柱位索引陣列，地支藏干含日主或印星之五行（通根 / 有印庫）
//   deShi        非日柱柱位索引陣列，天干同屬日主或印星（比劫 / 印透干）
//   rootedBranches / penetratedStems  可讀字串陣列
//   motherEl / childWX / wealthEl / ctrlEl / ctrlEnemyEl  與舊版 getXiYong 相容
function judgeStrength(dayGan, monthZhi, wxCount, pillars) {
  const dayWX = WX_GAN[dayGan];
  const mi = ELEMENT_CYCLE.indexOf(dayWX);
  const motherEl    = ELEMENT_CYCLE[(mi - 1 + 5) % 5]; // 生我者（印）
  const childWX     = ELEMENT_CYCLE[(mi + 1) % 5];     // 我生者（食傷）
  const wealthEl    = ELEMENT_CYCLE[(mi + 2) % 5];     // 我剋者（財）
  const ctrlEl      = ELEMENT_CYCLE[(mi + 3) % 5];     // 剋我者（官殺）
  const ctrlEnemyEl = ELEMENT_CYCLE[(mi + 4) % 5] === motherEl
    ? motherEl
    : ELEMENT_CYCLE[(mi + 4) % 5];                     // 剋制官殺者（同 motherEl）

  // 得令：月支本氣或主氣（第一個藏干）同屬日主或印星
  const monthHidden = CANG_GAN[monthZhi] || [];
  const monthMainEl = monthHidden.length ? WX_GAN[monthHidden[0]] : null;
  const monthBenQiEl = WX_ZHI[monthZhi];
  const deLing = (monthMainEl === dayWX) || (monthMainEl === motherEl) ||
                 (monthBenQiEl === dayWX) || (monthBenQiEl === motherEl);

  // 得地 / 得勢：掃描非日柱的柱位
  const deDi = [];
  const deShi = [];
  const rootedBranches = [];
  const penetratedStems = [];
  if (Array.isArray(pillars)) {
    for (let i = 0; i < pillars.length; i++) {
      if (i === 2) continue; // 跳過日柱
      const p = pillars[i];
      if (!p) continue;
      const hidden = CANG_GAN[p.zhi] || [];
      let rooted = false;
      for (const g of hidden) {
        const el = WX_GAN[g];
        if (el === dayWX || el === motherEl) { rooted = true; break; }
      }
      if (rooted) {
        deDi.push(i);
        rootedBranches.push(DZ[p.zhi]);
      }
      const stemEl = WX_GAN[p.gan];
      if (stemEl === dayWX || stemEl === motherEl) {
        deShi.push(i);
        penetratedStems.push(TG[p.gan]);
      }
    }
  }

  // 分數合成
  let score = 0;
  if (deLing) score += 30;
  score += Math.min(deDi.length * 6, 18);
  score += Math.min(deShi.length * 6, 18);
  const support = (wxCount[dayWX] || 0) + (wxCount[motherEl] || 0);
  const drain = (wxCount[childWX] || 0) + (wxCount[wealthEl] || 0) + (wxCount[ctrlEl] || 0);
  const delta = Math.max(-12, Math.min(12, (support - drain) * 2));
  score += delta;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let tier;
  if (score < 30) tier = '極弱';
  else if (score < 45) tier = '偏弱';
  else if (score < 55) tier = '中和';
  else if (score < 70) tier = '偏強';
  else tier = '極強';
  const isStrong = score >= 50;

  return {
    score, tier, isStrong,
    deLing, deDi, deShi,
    rootedBranches, penetratedStems,
    motherEl, childWX, wealthEl, ctrlEl, ctrlEnemyEl
  };
}

function getXiYong(dayGan, isStrong, ctrlEl, motherEl, childWX, wealthEl) {
  if (isStrong) {
    return {
      xi: childWX,
      yong: ctrlEl,
      ji: [WX_GAN[dayGan], motherEl],
      xian: wealthEl
    };
  } else {
    return {
      xi: motherEl,
      yong: WX_GAN[dayGan],
      ji: [ctrlEl, childWX],
      xian: wealthEl
    };
  }
}

// 僞隨機
function seededRand(seed) { let x = Math.sin(seed * 9301 + 49297) * 49297; return x - Math.floor(x); }
function pickItems(seed, arr, n) {
  let pool = [...arr], res = [];
  for (let i = 0; i < n && pool.length; i++) {
    let idx = Math.floor(seededRand(seed + i * 7) * pool.length);
    res.push(pool.splice(idx, 1)[0]);
  }
  return res;
}

function getDayOfYear(year, month, day) {
  const start = Date.UTC(year, 0, 0);
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - start) / 86400000);
}

function getEquationOfTimeMinutes(year, month, day) {
  const n = getDayOfYear(year, month, day);
  const b = 2 * Math.PI * (n - 81) / 364;
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

function parseTimeArg(timeArg) {
  if (typeof timeArg === 'string') {
    const [h, m] = timeArg.split(':').map(v => parseInt(v, 10));
    return { hour: Number.isFinite(h) ? h : 12, minute: Number.isFinite(m) ? m : 0, source: 'time' };
  }
  const hourMap = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
  const idx = Number.isFinite(Number(timeArg)) ? Number(timeArg) : 6;
  return { hour: hourMap[idx] ?? 12, minute: 0, source: 'branch', hourIndex: idx };
}

function getTrueSolarDate(year, month, day, hour, minute, longitude = 120) {
  const lng = Number.isFinite(Number(longitude)) ? Number(longitude) : 120;
  const longitudeOffset = (lng - 120) * 4;
  const equationOffset = getEquationOfTimeMinutes(year, month, day);
  const totalOffset = longitudeOffset + equationOffset;
  const utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const date = new Date(utc + totalOffset * 60000);
  return { date, longitudeOffset, equationOffset, totalOffset, longitude: lng };
}

function getHourIndexFromTime(hour, minute = 0) {
  const total = hour * 60 + minute;
  if (total >= 23 * 60 || total < 60) return 0;
  return Math.floor((total - 60) / 120) + 1;
}

function pad2(n) { return String(n).padStart(2, '0'); }
function formatDateTime(date) {
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} ${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}`;
}
function formatSignedMinutes(value) {
  const sign = value >= 0 ? '+' : '-';
  const abs = Math.abs(value);
  const min = Math.floor(abs);
  const sec = Math.round((abs - min) * 60);
  return `${sign}${min}分${sec ? sec + '秒' : ''}`;
}

// 四柱排盤。
// 真太陽時校正僅影響「時柱」——時柱本來就是靠真太陽時分劃十二時辰。
// 年/月/日柱一律以使用者輸入的北京時間直送 lunar-javascript，
// 以避免出生於立春等節氣分界時，因經度位移而把整個年柱或月柱跳換成前後一天的問題
// （節氣是全球統一時刻，不應再被視太陽時二次位移）。
// meta.solar / meta.lunar / meta.eightChar 也都採用原始北京時間，
// 讓 getYun / getMingGong / getShenGong / getTaiYuan / getXunKong 等下游 API
// 以同一份未位移的命盤為基準。
function getPillarsUsingLunar(year, month, day, timeArg = '12:00', longitude = 120) {
  const parsed = parseTimeArg(timeArg);
  const trueSolar = getTrueSolarDate(year, month, day, parsed.hour, parsed.minute, longitude);
  const d = trueSolar.date;
  const hourIndex = getHourIndexFromTime(d.getUTCHours(), d.getUTCMinutes());

  // 未位移的北京時間——決定年/月/日柱
  const rawSolar = Solar.fromYmdHms(year, month, day, parsed.hour, parsed.minute, 0);
  const rawLunar = rawSolar.getLunar();
  const rawBazi = rawLunar.getEightChar();

  // 真太陽時位移後的時間——只用來取時柱與判定時辰索引
  const trueSolarSolar = Solar.fromYmdHms(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), 0);
  const trueSolarLunar = trueSolarSolar.getLunar();
  const trueSolarBazi = trueSolarLunar.getEightChar();

  const ganIdx = (str) => TG.indexOf(str);
  const zhiIdx = (str) => DZ.indexOf(str);
  const call = (obj, method, fallback) => (obj && typeof obj[method] === 'function') ? obj[method]() : fallback;

  const yp = { gan: ganIdx(call(rawLunar, 'getYearGanExact', rawBazi.getYearGan())), zhi: zhiIdx(call(rawLunar, 'getYearZhiExact', rawBazi.getYearZhi())) };
  const mp = { gan: ganIdx(call(rawLunar, 'getMonthGanExact', rawBazi.getMonthGan())), zhi: zhiIdx(call(rawLunar, 'getMonthZhiExact', rawBazi.getMonthZhi())) };
  const dp = { gan: ganIdx(call(rawLunar, 'getDayGanExact', rawBazi.getDayGan())), zhi: zhiIdx(call(rawLunar, 'getDayZhiExact', rawBazi.getDayZhi())) };
  const hp = { gan: ganIdx(trueSolarBazi.getTimeGan()), zhi: zhiIdx(trueSolarBazi.getTimeZhi()) };

  const pillars = [yp, mp, dp, hp];
  pillars.meta = {
    inputTime: `${pad2(parsed.hour)}:${pad2(parsed.minute)}`,
    trueSolarTime: `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`,
    trueSolarDateTime: formatDateTime(d),
    longitude: trueSolar.longitude,
    longitudeOffset: trueSolar.longitudeOffset,
    equationOffset: trueSolar.equationOffset,
    totalOffset: trueSolar.totalOffset,
    longitudeOffsetText: formatSignedMinutes(trueSolar.longitudeOffset),
    equationOffsetText: formatSignedMinutes(trueSolar.equationOffset),
    totalOffsetText: formatSignedMinutes(trueSolar.totalOffset),
    hourIndex,
    hourName: HOUR_BRANCH_NAMES[hourIndex],
    hourRange: HOUR_BRANCH_RANGES[hourIndex],
    // 主要下游 API（getYun / getMingGong / getShenGong / getTaiYuan / getXunKong）
    // 一律走原始北京時間這份 bazi，以保證節氣分界穩定
    solar: rawSolar,
    lunar: rawLunar,
    eightChar: rawBazi,
    // 只作為除錯/檢視用
    trueSolarSolar,
    trueSolarLunar,
    trueSolarEightChar: trueSolarBazi
  };

  return pillars;
}

// 十神：以日主為我
function getShiShen(dayGan, otherGan) {
  let me = WX_GAN[dayGan], ot = WX_GAN[otherGan];
  if (me === ot) return (dayGan % 2 === otherGan % 2) ? '比肩' : '劫財';
  let mi = ELEMENT_CYCLE.indexOf(me), oi = ELEMENT_CYCLE.indexOf(ot);
  let rel;
  if ((mi + 1) % 5 === oi) rel = 'iGenerate';
  else if ((oi + 1) % 5 === mi) rel = 'generatesMe';
  else if ((mi + 2) % 5 === oi) rel = 'iControl';
  else rel = 'controlsMe';
  let sameP = (dayGan % 2 === otherGan % 2);
  return SHI_SHEN_MAP[rel][sameP ? 0 : 1];
}

// 為某地支的藏干序列回傳對應的十神（與 CANG_GAN[zhiIdx] 對齊）
function getShiShenForHiddenStems(dayGan, zhiIdx) {
  const hidden = CANG_GAN[zhiIdx] || [];
  return hidden.map(g => getShiShen(dayGan, g));
}

// 將計算函式暴露給瀏覽器全域（app.js 當前以 hoisted globals 呼叫；
// 明確掛上 window 只是讓契約更清晰，並與舊有 getPillarsUsingLunar 對齊）。
if (typeof window !== 'undefined') {
  window.getPillarsUsingLunar = getPillarsUsingLunar;
  window.getTrueSolarDate = getTrueSolarDate;
  window.getHourIndexFromTime = getHourIndexFromTime;
  window.countWuXing = countWuXing;
  window.judgeStrength = judgeStrength;
  window.getXiYong = getXiYong;
  window.getShiShen = getShiShen;
  window.getShiShenForHiddenStems = getShiShenForHiddenStems;
}

// Node 端（僅 scripts/verify-bazi-core.js 使用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    countWuXing,
    judgeStrength,
    getXiYong,
    getShiShen,
    getShiShenForHiddenStems,
    getTrueSolarDate,
    getHourIndexFromTime,
    BAZI_PILLAR_WEIGHTS,
    DEFAULT_PILLAR_WEIGHTS
  };
}
