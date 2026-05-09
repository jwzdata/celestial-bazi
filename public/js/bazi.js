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

// ============================
// 優化版八字日曆評分算法
// ============================

/**
 * 計算某日相對於命主的綜合吉凶評分
 * @param {number} year - 年
 * @param {number} month - 月
 * @param {number} day - 日
 * @param {Object} userBazi - 用戶八字信息
 * @param {number} userBazi.dayGan - 用戶日主天干索引
 * @param {number} userBazi.dayZhi - 用戶日主地支索引
 * @param {number} userBazi.monthZhi - 用戶月柱地支索引（用於月令）
 * @param {Object} userBazi.xiYong - 用戶喜用神信息
 * @param {number} longitude - 經度（用於真太陽時校正）
 */
function calculateDayFortune(year, month, day, userBazi, longitude = 120) {
  // 使用真太陽時計算
  const trueSolar = getTrueSolarDate(year, month, day, 12, 0, longitude);
  const d = trueSolar.date;

  // 獲取農曆和八字
  const solar = Solar.fromYmdHms(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), 0);
  const lunar = solar.getLunar();
  const bazi = lunar.getEightChar();

  // 獲取日柱信息
  const dGan = TG.indexOf(bazi.getDayGan());
  const dZhi = DZ.indexOf(bazi.getDayZhi());

  // 獲取當月月令（地支）
  const monthGan = TG.indexOf(bazi.getMonthGan());
  const monthZhi = DZ.indexOf(bazi.getMonthZhi());

  let totalScore = 0;

  // 1. 喜用神評分（40%權重）
  let xiYongScore = 0;
  const xiElements = [userBazi.xiYong.xi, userBazi.xiYong.yong].flat();
  const jiElements = userBazi.xiYong.ji.flat();

  // 天干喜用神評分
  if (xiElements.includes(WX_GAN[dGan])) xiYongScore += 2;
  if (jiElements.includes(WX_GAN[dGan])) xiYongScore -= 2;

  // 地支喜用神評分（包括藏干）
  if (xiElements.includes(WX_ZHI[dZhi])) xiYongScore += 1.5;
  if (jiElements.includes(WX_ZHI[dZhi])) xiYongScore -= 1.5;

  // 地支藏干評分
  const cangGan = CANG_GAN[dZhi];
  cangGan.forEach((gan, i) => {
    const weight = CG_WEIGHT[i];
    if (xiElements.includes(WX_GAN[gan])) xiYongScore += 1 * weight;
    if (jiElements.includes(WX_GAN[gan])) xiYongScore -= 1 * weight;
  });

  totalScore += xiYongScore * 0.4;

  // 2. 月令評分（30%權重）
  let monthScore = 0;
  const userDayWX = WX_GAN[userBazi.dayGan];
  const monthWX = WX_ZHI[monthZhi];

  // 月令對日主的影響
  if (monthWX === userDayWX) monthScore += 2; // 比肩助力

  // 五行生剋關係
  const userWXIdx = ELEMENT_CYCLE.indexOf(userDayWX);
  const monthWXIdx = ELEMENT_CYCLE.indexOf(monthWX);

  if ((userWXIdx + 1) % 5 === monthWXIdx) monthScore += 1.5; // 月令生日主
  if ((monthWXIdx + 1) % 5 === userWXIdx) monthScore -= 1.5; // 月令剋日主

  totalScore += monthScore * 0.3;

  // 3. 長生十二神評分（20%權重）
  let changShengScore = 0;
  const changSheng = getChangSheng(userBazi.dayGan, dZhi);
  changShengScore = CS_POWER[changSheng] / 10; // 轉換為-1到1的範圍

  totalScore += changShengScore * 0.2;

  // 4. 納音評分（10%權重）
  let naYinScore = 0;
  const dayNaYin = bazi.getDayNaYin();
  const dayNaYinType = dayNaYin.slice(-1); // 取最後一個字判斷五行
  const naYinWXMap = {'金': '金', '木': '木', '水': '水', '火': '火', '土': '土'};
  const naYinWX = naYinWXMap[dayNaYinType];

  if (xiElements.includes(naYinWX)) naYinScore += 1;
  if (jiElements.includes(naYinWX)) naYinScore -= 1;

  totalScore += naYinScore * 0.1;

  // 轉換為百分制
  let percentScore = 50 + Math.round(totalScore * 20);
  percentScore = Math.max(0, Math.min(100, percentScore));

  // 確定吉凶等級
  let fortune = 'ping';
  if (percentScore >= 70) fortune = 'ji';
  else if (percentScore <= 30) fortune = 'xiong';

  return {
    score: totalScore,
    percentScore: percentScore,
    fortune: fortune,
    details: {
      xiYongScore: xiYongScore,
      monthScore: monthScore,
      changShengScore: changShengScore,
      naYinScore: naYinScore,
      changSheng: changSheng,
      naYin: dayNaYin,
      trueSolarTime: formatDateTime(d)
    }
  };
}

/**
 * 計算十年大運
 * @param {Object} userBazi - 用戶八字信息
 * @param {string} gender - 性別 ('male' 或 'female')
 * @returns {Array} 大運數組
 */
function calculateDecadeFortune(userBazi, gender) {
  const { solar, lunar, eightChar } = userBazi;

  // 獲取月柱信息
  const monthGan = TG.indexOf(eightChar.getMonthGan());
  const monthZhi = DZ.indexOf(eightChar.getMonthZhi());

  // 判斷大運順逆
  const isYangMale = userBazi.dayGan % 2 === 0 && gender === 'male';
  const isYinFemale = userBazi.dayGan % 2 === 1 && gender === 'female';
  const forward = isYangMale || isYinFemale; // 陽男陰女順行，其餘逆行

  // 計算起運歲數（簡化為固定值，實際應根據節氣計算）
  const startAge = 3; // 簡化為3歲起運

  const daYun = [];

  for (let i = 0; i < 8; i++) { // 計算8步大運
    const age = startAge + i * 10;
    const ganIdx = (monthGan + (forward ? i : -i) + 10) % 10;
    const zhiIdx = (monthZhi + (forward ? i : -i) + 12) % 12;

    daYun.push({
      age: age,
      ageRange: `${age}-${age + 9}`,
      gan: TG[ganIdx],
      zhi: DZ[zhiIdx],
      wuXing: WX_GAN[ganIdx] + WX_ZHI[zhiIdx],
      shiShen: getShiShen(userBazi.dayGan, ganIdx)
    });
  }

  return daYun;
}

// 導出函數
window.calculateDayFortune = calculateDayFortune;
window.calculateDecadeFortune = calculateDecadeFortune;
