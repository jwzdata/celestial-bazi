// ============================
// 排盤計算核心
// ============================

// 引入 lunar-javascript
// 假設我們在 index.html 中通過 script 標籤引入了 lunar-javascript

function countWuXing(pillars) {
  let count = {'金':0,'木':0,'水':0,'火':0,'土':0};
  pillars.forEach(p => {
    // 天干
    count[WX_GAN[p.gan]] += 1.5;
    // 地支藏幹
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

function dayFortune(dayGZ_idx, xiElements, jiElements) {
  let dGan = dayGZ_idx % 10, dZhi = dayGZ_idx % 12;
  let dGanWX = WX_GAN[dGan], dZhiWX = WX_ZHI[dZhi];
  let score = 0;
  if (xiElements.includes(dGanWX)) score += 2;
  if (xiElements.includes(dZhiWX)) score += 1.5;
  if (jiElements.includes(dGanWX)) score -= 2;
  if (jiElements.includes(dZhiWX)) score -= 1.5;
  if (score >= 1.5) return 'ji';
  if (score <= -1.5) return 'xiong';
  return 'ping';
}

function getPillarsUsingLunar(year, month, day, hourIndex) {
    // 因爲lunar要求精確的時間，我們用小時的中間值
    const hourMap = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
    const hour = hourMap[hourIndex];
    
    // 創建陽曆對象
    const solar = Solar.fromYmdHms(year, month, day, hour, 0, 0);
    // 獲取八字對象
    const lunar = solar.getLunar();
    const bazi = lunar.getEightChar();
    
    // 解析天干地支索引
    const ganIdx = (str) => TG.indexOf(str);
    const zhiIdx = (str) => DZ.indexOf(str);
    
    const yp = { gan: ganIdx(bazi.getYearGan()), zhi: zhiIdx(bazi.getYearZhi()) };
    const mp = { gan: ganIdx(bazi.getMonthGan()), zhi: zhiIdx(bazi.getMonthZhi()) };
    const dp = { gan: ganIdx(bazi.getDayGan()), zhi: zhiIdx(bazi.getDayZhi()) };
    const hp = { gan: ganIdx(bazi.getTimeGan()), zhi: zhiIdx(bazi.getTimeZhi()) };
    
    return [yp, mp, dp, hp];
}

// 導出供全局使用
window.getPillarsUsingLunar = getPillarsUsingLunar;

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

