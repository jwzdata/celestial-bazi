// ============================
// 排盤計算核心
// ============================

function countWuXing(pillars) {
  let count = {'金':0,'木':0,'水':0,'火':0,'土':0};
  pillars.forEach(p => {
    count[WX_GAN[p.gan]] += 1.5;
    let cg = CANG_GAN[p.zhi];
    cg.forEach((g, i) => { count[WX_GAN[g]] += CG_WEIGHT[i]; });
  });
  return count;
}

function judgeStrength(dayGan, monthZhi, wxCount) {
  let dayWX = WX_GAN[dayGan];
  let score = 50;

  let monthWX = WX_ZHI[monthZhi];
  let mi = ELEMENT_CYCLE.indexOf(dayWX);
  let motherWX = ELEMENT_CYCLE[(mi + 4) % 5];
  if (monthWX === dayWX) score += 20;
  else if (monthWX === motherWX) score += 15;
  let ctrlWX = ELEMENT_CYCLE[(mi + 2) % 5];
  if (monthWX === ctrlWX) score -= 20;

  let childWX = ELEMENT_CYCLE[(mi + 1) % 5];
  let wealthEl = ELEMENT_CYCLE[(mi + 2) % 5];
  let ctrlEl = ELEMENT_CYCLE[(mi - 2 + 5) % 5];
  let motherEl = ELEMENT_CYCLE[(mi - 1 + 5) % 5];

  if (monthWX === ctrlEl) score -= 18;
  if (monthWX === childWX) score -= 10;
  if (monthWX === wealthEl) score -= 5;

  let support = wxCount[dayWX] + wxCount[motherEl];
  let drain = wxCount[childWX] + wxCount[wealthEl] + wxCount[ctrlEl];
  score += (support - drain) * 3;

  score = Math.max(0, Math.min(100, score));
  let isStrong = score >= 50;
  return { score, isStrong, motherEl, childWX, wealthEl, ctrlEl };
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

function getPillarsUsingLunar(year, month, day, timeArg = '12:00', longitude = 120) {
  const parsed = parseTimeArg(timeArg);
  const trueSolar = getTrueSolarDate(year, month, day, parsed.hour, parsed.minute, longitude);
  const d = trueSolar.date;
  const hourIndex = getHourIndexFromTime(d.getUTCHours(), d.getUTCMinutes());

  const solar = Solar.fromYmdHms(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), 0);
  const lunar = solar.getLunar();
  const bazi = lunar.getEightChar();

  const ganIdx = (str) => TG.indexOf(str);
  const zhiIdx = (str) => DZ.indexOf(str);
  const call = (obj, method, fallback) => (obj && typeof obj[method] === 'function') ? obj[method]() : fallback;

  const yp = { gan: ganIdx(call(lunar, 'getYearGanExact', bazi.getYearGan())), zhi: zhiIdx(call(lunar, 'getYearZhiExact', bazi.getYearZhi())) };
  const mp = { gan: ganIdx(call(lunar, 'getMonthGanExact', bazi.getMonthGan())), zhi: zhiIdx(call(lunar, 'getMonthZhiExact', bazi.getMonthZhi())) };
  const dp = { gan: ganIdx(call(lunar, 'getDayGanExact', bazi.getDayGan())), zhi: zhiIdx(call(lunar, 'getDayZhiExact', bazi.getDayZhi())) };
  const hp = { gan: ganIdx(bazi.getTimeGan()), zhi: zhiIdx(bazi.getTimeZhi()) };

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
    solar,
    lunar,
    eightChar: bazi
  };

  return pillars;
}

window.getPillarsUsingLunar = getPillarsUsingLunar;
window.getTrueSolarDate = getTrueSolarDate;
window.getHourIndexFromTime = getHourIndexFromTime;

// 十神
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
