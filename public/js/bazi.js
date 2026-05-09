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
//   direction    'strong' | 'weak' | 'neutral'；由 tier 推出，供新版 getXiYong
//                避免 isStrong 在 中和 區間跳變造成的喜/忌相反
//   deLing       月令是否助日主（月支本氣為日主或印星）
//   deDi         非日柱柱位索引陣列，地支藏干含日主或印星之五行（通根 / 有印庫）
//   deShi        非日柱柱位索引陣列，天干同屬日主或印星（比劫 / 印透干）
//   rootedBranches / penetratedStems  可讀字串陣列
//   motherEl / childWX / wealthEl / ctrlEl  與舊版 getXiYong 相容
function judgeStrength(dayGan, monthZhi, wxCount, pillars) {
  const dayWX = WX_GAN[dayGan];
  const mi = ELEMENT_CYCLE.indexOf(dayWX);
  const motherEl    = ELEMENT_CYCLE[(mi - 1 + 5) % 5]; // 生我者（印）
  const childWX     = ELEMENT_CYCLE[(mi + 1) % 5];     // 我生者（食傷）
  const wealthEl    = ELEMENT_CYCLE[(mi + 2) % 5];     // 我剋者（財）
  const ctrlEl      = ELEMENT_CYCLE[(mi + 3) % 5];     // 剋我者（官殺）

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
  let direction; // 'strong' / 'weak' / 'neutral'
  if (score < 30)       { tier = '極弱'; direction = 'weak';    }
  else if (score < 45)  { tier = '偏弱'; direction = 'weak';    }
  else if (score < 55)  { tier = '中和'; direction = 'neutral'; }
  else if (score < 70)  { tier = '偏強'; direction = 'strong';  }
  else                  { tier = '極強'; direction = 'strong';  }
  // isStrong 保留為 boolean 供舊呼叫端（renderTraits/舊版 getXiYong）使用；
  // 新版 getXiYong 改以 direction 判斷方向，避免 中和 區間 49/50 的跳變。
  const isStrong = score >= 50;

  return {
    score, tier, isStrong, direction,
    deLing, deDi, deShi,
    rootedBranches, penetratedStems,
    motherEl, childWX, wealthEl, ctrlEl
  };
}

function getXiYong(dayGan, isStrong, ctrlEl, motherEl, childWX, wealthEl, frameworks) {
  const dayWX = WX_GAN[dayGan];
  // 基礎 扶抑 結果（向下相容：不帶 frameworks 時與舊版完全一致）
  const base = isStrong
    ? { xi: childWX, yong: ctrlEl, ji: [dayWX, motherEl], xian: wealthEl }
    : { xi: motherEl, yong: dayWX, ji: [ctrlEl, childWX], xian: wealthEl };

  if (!frameworks || !frameworks.扶抑) return base;

  // 新版路徑：以 strength.direction 取代 isStrong 作為方向來源，
  // 避免 中和 區間 49/50 的跳變。direction 可能由呼叫端注入於 frameworks._direction。
  const direction = frameworks._direction || (isStrong ? 'strong' : 'weak');
  const fuYi = frameworks.扶抑;
  const tiao = frameworks.調候;
  const tiaoWX = tiao && tiao.wx;

  // 中和：扶抑 本身方向不明，僅採 調候（若有）或 通關，否則退回基礎 base。
  let primary;
  if (direction === 'neutral') {
    primary = (tiaoWX && tiao.extreme) ? '調候'
            : (frameworks.通關 && frameworks.通關.wx) ? '通關'
            : '扶抑';
  } else if (tiaoWX && tiao.extreme) {
    primary = '調候';
  } else {
    primary = '扶抑';
  }

  // helper: 剔除某五行於 ji 陣列。
  const pruneJi = (jiArr, wxList) => jiArr.filter(v => !wxList.includes(v));

  if (primary === '調候' && tiaoWX) {
    // 以 調候 用神覆蓋 yong，並重新推導 ji 使其不再包含調候用神
    // （否則會出現同一五行同時為用神與忌神的荒謬狀態）。
    // 若調候用神原屬 base.xi，將其升級為新的 yong；原 xi 退為舊 base.xi 或 fuYi.wx。
    const newJi = pruneJi(base.ji, [tiaoWX]);
    // 被從 ji 剔除的元素，若原為忌神則視為新的 喜神候選（中和之象）
    const removed = base.ji.filter(v => v === tiaoWX);
    const extraXi = removed.length ? removed : [];
    const rawXi = (fuYi && fuYi.wx) ? fuYi.wx : base.xi;
    const xiArr = Array.from(new Set([rawXi, ...extraXi].filter(v => v && v !== tiaoWX)));
    return {
      xi: xiArr.length === 1 ? xiArr[0] : (xiArr[0] || base.xi),
      yong: tiaoWX,
      ji: newJi,
      xian: base.xian,
      primaryFramework: '調候',
      secondaryFramework: '扶抑'
    };
  }

  if (primary === '通關' && frameworks.通關 && frameworks.通關.wx) {
    const bridge = frameworks.通關.wx;
    // 通關用神不應同時在忌神內
    return {
      xi: base.xi,
      yong: bridge,
      ji: pruneJi(base.ji, [bridge]),
      xian: base.xian,
      primaryFramework: '通關',
      secondaryFramework: '扶抑'
    };
  }

  // primary === '扶抑'
  return Object.assign({}, base, { primaryFramework: '扶抑' });
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

// 五鼠遁：以未位移之日主（rawDayGanIdx）+ 時辰地支索引 推時干。
//   甲己日 夜半甲子頭 → 甲子 乙丑 丙寅 ...
//   乙庚日 丙子為首
//   丙辛日 戊子為首
//   丁壬日 庚子為首
//   戊癸日 壬子為首
// 起始時干 = (dayGanIdx % 5) * 2；對應 十干 索引 0/2/4/6/8（甲丙戊庚壬）。
function getHourGanIdx(dayGanIdx, hourZhiIdx) {
  return (((dayGanIdx % 5) * 2) + hourZhiIdx) % 10;
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
  // 時柱天干採「五鼠遁」：以未位移之日主為準，搭配真太陽時位移後的時支。
  // 直接沿用 trueSolarBazi.getTimeGan() 會讓經度位移跨過子夜時（如 23:50
  // 北京時間 + 東經 130° 位移到隔日 00:10）使用了錯誤的日干，導致時干誤推一輪。
  const rawDayGanIdx = dp.gan;
  const hourZhiIdx = zhiIdx(trueSolarBazi.getTimeZhi());
  const hourGanIdx = getHourGanIdx(rawDayGanIdx, hourZhiIdx);
  const hp = { gan: hourGanIdx, zhi: hourZhiIdx };

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

// ============================
// 命盤神煞（以原局四柱為對象）
// ============================
// pillars = [{gan,zhi}, ...]（索引皆為 TG/DZ 內的 index）
// 回傳：
//   常規桶（legacy 形狀）[pillarIdx,...]：
//     天乙貴人 / 文昌貴人 / 祿神 / 羊刃 / 金輿 / 自刑 / 三刑
//   起三合 桶（provenance-aware）[{pillarIdx, ref}]：
//     驛馬 / 桃花 / 華蓋 / 將星
//     ref = 'year' | 'day' | 'both'（起於年支、日支，或同時）
//   無禮之刑（子卯）單獨成桶 [pillarIdx,...]，與三刑(寅巳申/丑戌未) 區分
// 僅回傳非空的桶。
function computeChartShenSha(pillars) {
  if (!Array.isArray(pillars) || pillars.length < 4) return {};
  const res = {};
  const push = (key, idx) => {
    if (!res[key]) res[key] = [];
    if (!res[key].includes(idx)) res[key].push(idx);
  };
  // 帶來源 provenance 的 push：桶值為 [{pillarIdx, ref}]。
  // 若同一 pillar 被 year 與 day 同時命中，合併為 ref='both'。
  const pushWithRef = (key, idx, ref) => {
    if (!res[key]) res[key] = [];
    const existing = res[key].find(h => h.pillarIdx === idx);
    if (!existing) {
      res[key].push({ pillarIdx: idx, ref });
      return;
    }
    if (existing.ref !== ref && existing.ref !== 'both') {
      existing.ref = 'both';
    }
  };

  const yearGan = TG[pillars[0].gan];
  const dayGan  = TG[pillars[2].gan];
  const yearZhi = DZ[pillars[0].zhi];
  const dayZhi  = DZ[pillars[2].zhi];

  // 依年干 + 日干 各自對照一次：天乙貴人 / 文昌貴人 以 年干、日干 為主
  const ganRefs = [yearGan, dayGan].filter(Boolean);
  // 日干 為主：祿神 / 羊刃 / 金輿（傳統以日主起）
  const dayGanRefs = [dayGan].filter(Boolean);
  // 年支 + 日支 各自對照一次：驛馬 / 桃花 / 華蓋 / 將星（三合起神煞）
  // 以 {zhi, refName} tuple 追蹤來源（'year' or 'day'）。
  const zhiRefsWithName = [];
  if (yearZhi) zhiRefsWithName.push({ z: yearZhi, ref: 'year' });
  if (dayZhi)  zhiRefsWithName.push({ z: dayZhi,  ref: 'day'  });

  for (let i = 0; i < 4; i++) {
    const zChar = DZ[pillars[i].zhi];

    // 天乙貴人（陣列匹配）
    for (const g of ganRefs) {
      const arr = TIAN_YI_GUI_REN[g];
      if (arr && arr.includes(zChar)) { push('天乙貴人', i); break; }
    }
    // 文昌貴人
    for (const g of ganRefs) {
      if (WEN_CHANG[g] === zChar) { push('文昌貴人', i); break; }
    }
    // 驛馬 / 桃花 / 華蓋 / 將星（以年支或日支起；provenance-aware）
    for (const { z, ref } of zhiRefsWithName) {
      if (YI_MA[z] === zChar)      pushWithRef('驛馬', i, ref);
      if (TAO_HUA[z] === zChar)    pushWithRef('桃花', i, ref);
      if (HUA_GAI[z] === zChar)    pushWithRef('華蓋', i, ref);
      if (JIANG_XING[z] === zChar) pushWithRef('將星', i, ref);
    }
    // 祿神 / 羊刃 / 金輿（以日干起）
    for (const g of dayGanRefs) {
      if (LU_SHEN[g] === zChar)  push('祿神', i);
      if (YANG_REN[g] === zChar) push('羊刃', i);
      if (JIN_YU[g] === zChar)   push('金輿', i);
    }
  }

  // 三刑：四柱中若三刑集全（寅巳申 或 丑戌未），記下相關柱位
  const branchIdxByChar = {};
  for (let i = 0; i < 4; i++) {
    const c = DZ[pillars[i].zhi];
    branchIdxByChar[c] = branchIdxByChar[c] || [];
    branchIdxByChar[c].push(i);
  }
  if (typeof XING_GROUPS !== 'undefined') {
    (XING_GROUPS.三刑 || []).forEach(triple => {
      const allPresent = triple.every(c => branchIdxByChar[c]);
      if (allPresent) {
        triple.forEach(c => branchIdxByChar[c].forEach(idx => push('三刑', idx)));
      }
    });
    // 自刑：同一地支出現兩次以上
    (XING_GROUPS.自刑 || []).forEach(c => {
      const list = branchIdxByChar[c];
      if (list && list.length >= 2) list.forEach(idx => push('自刑', idx));
    });
    // 子卯 無禮之刑：獨立桶以與 三刑(寅巳申/丑戌未) 分開
    const ziMao = XING_GROUPS.子卯;
    if (ziMao && ziMao.every(c => branchIdxByChar[c])) {
      ziMao.forEach(c => branchIdxByChar[c].forEach(idx => push('無禮之刑', idx)));
    }
  }

  return res;
}

// ============================
// 三框架用神：扶抑 / 調候 / 通關
// ============================
// 輸入：{ dayGan, monthZhi, strength, wxCount }
//   dayGan/monthZhi 為 TG/DZ 索引；strength 為 judgeStrength 的回傳；wxCount 為 countWuXing 結果。
// 回傳：{ 扶抑:{framework,wx,note}, 調候:{framework,wx,note,extreme}, 通關:{framework,wx,note} }
// 通關 僅在兩個相剋五行各 >= 3 時啟動，否則 wx = null 並記 note = '無交戰，不需通關'。
//
// 調候 以壓縮版《窮通寶鑑》四季要訣建表（dayWX × 季節）。對應原則：
//   冬生金水須火     /  夏生火土須水
//   春木須金削       /  秋木須水潤
//   冬木須火暖       /  夏木須水潤
//   金夏須水 / 冬須火煖 / 春須土培 / 秋本位須火煉
//   水夏須金潤 / 冬取火暖 / 春須火暖 / 秋須木洩
//   土春須火解凍 / 夏須水潤 / 秋須水潤 / 冬須火暖
//   火冬須木火 / 春須水土 / 夏須金水 / 秋須木助
function computeYongShenFrameworks(input) {
  input = input || {};
  const dayGan = input.dayGan;
  const monthZhi = input.monthZhi;
  const strength = input.strength || {};
  const wxCount = input.wxCount || {};
  const dayWX = WX_GAN[dayGan];

  // 季節判定：寅卯辰=春、巳午未=夏、申酉戌=秋、亥子丑=冬
  const SEASON_MAP = {
    '寅':'春','卯':'春','辰':'春',
    '巳':'夏','午':'夏','未':'夏',
    '申':'秋','酉':'秋','戌':'秋',
    '亥':'冬','子':'冬','丑':'冬'
  };
  const season = SEASON_MAP[DZ[monthZhi]] || null;

  // 調候表：dayWX × 季 → 首選五行（簡化版窮通寶鑑要訣）
  const TIAO_HOU = {
    '木': { '春':'金', '夏':'水', '秋':'水', '冬':'火' },
    '火': { '春':'水', '夏':'水', '秋':'木', '冬':'木' },
    '土': { '春':'火', '夏':'水', '秋':'水', '冬':'火' },
    '金': { '春':'土', '夏':'水', '秋':'火', '冬':'火' },
    '水': { '春':'火', '夏':'金', '秋':'木', '冬':'火' }
  };
  const TIAO_NOTES = {
    '木-春': '甲乙木生於春月，正位過旺，須金削斫以成器。',
    '木-夏': '木生於夏月火炎之時，枝葉易枯，須水潤之方得生機。',
    '木-秋': '木生於秋月金旺，根葉凋零，須水滋潤以續氣。',
    '木-冬': '木生於冬月寒凝，非火暖不能發生。',
    '火-春': '火生於春月，木多火塞，須水調和。',
    '火-夏': '火生於夏月炎燥，得水濟之方成既濟之功。',
    '火-秋': '火生於秋月氣衰，見木生扶方可繼明。',
    '火-冬': '火生於冬月寒甚，得木相資、始能禦寒。',
    '土-春': '土生於春月木盛克土，須火生扶以解木剋。',
    '土-夏': '土生於夏月，得水潤之方能萬物滋生。',
    '土-秋': '土生於秋月氣寒，得水潤澤始見生機。',
    '土-冬': '土生於冬月寒凝，須火暖方能發育。',
    '金-春': '金生於春月餘寒未盡，須土生扶方得堅實。',
    '金-夏': '金生於夏月火炎，恐遭熔化，須水調劑。',
    '金-秋': '金生於秋月當令，須火煅煉方成器用。',
    '金-冬': '金生於冬月寒凍，須火溫暖以解寒威。',
    '水-春': '水生於春月木盛洩氣，須火暖木以成既濟。',
    '水-夏': '水生於夏月盡涸，須金相生以續源。',
    '水-秋': '水生於秋月清冷，須木洩秀以通其流。',
    '水-冬': '水生於冬月旺極，須火解凍方成大用。'
  };
  let tiao = { framework: '調候', wx: null, note: '日主季節資訊不足，調候暫略。', extreme: false };
  if (season && TIAO_HOU[dayWX] && TIAO_HOU[dayWX][season]) {
    const wx = TIAO_HOU[dayWX][season];
    // 季節極端判定：放寬為「候氣不足」而非「完全缺席」，以捕捉一絲火光都缺的深冬金水。
    //   冬 + 金/水 + 命局火 < 2                → 寒冬須火暖局
    //   夏 + 火/土 + 命局水 < 2                → 夏炎須水潤局
    //   秋 + 甲乙木 + 命局水 < 2               → 秋木逢金，無水則枯
    //   春 + 丙丁火 + 命局水 < 2               → 春火燥烈，無水則焚
    // 範圍刻意不完全覆蓋窮通寶鑑全部 20 節，主要補齊古典 "秋木須水"/"春火須水"
    // 兩組被原版遺漏的場景；其餘節氣仍取 TIAO_HOU 表的首選五行但不作 extreme。
    const wxFire  = wxCount['火'] || 0;
    const wxWater = wxCount['水'] || 0;
    const dayGanChar = TG[dayGan];
    const isJiaYi = (dayGanChar === '甲' || dayGanChar === '乙');
    const isBingDing = (dayGanChar === '丙' || dayGanChar === '丁');
    const extreme =
      (season === '冬' && (dayWX === '金' || dayWX === '水') && wxFire < 2) ||
      (season === '夏' && (dayWX === '火' || dayWX === '土') && wxWater < 2) ||
      (season === '秋' && isJiaYi && wxWater < 2) ||
      (season === '春' && isBingDing && wxWater < 2);
    tiao = {
      framework: '調候',
      wx,
      note: TIAO_NOTES[`${dayWX}-${season}`] || `${dayWX}日主生於${season}月宜取${wx}以調候。`,
      extreme
    };
  }

  // 扶抑
  let fuYi;
  if (strength.isStrong) {
    if (strength.score > 70) {
      fuYi = { framework: '扶抑', wx: strength.ctrlEl, note: `日主偏強，取${strength.ctrlEl}剋之以制其旺。` };
    } else {
      fuYi = { framework: '扶抑', wx: strength.childWX, note: `日主偏強，取${strength.childWX}洩秀以通其氣。` };
    }
  } else {
    if (strength.score < 30) {
      fuYi = { framework: '扶抑', wx: strength.motherEl, note: `日主極弱，取${strength.motherEl}印生以扶身。` };
    } else {
      fuYi = { framework: '扶抑', wx: dayWX, note: `日主偏弱，取同類${dayWX}比劫助身。` };
    }
  }

  // 通關：若兩剋制五行各 >= 3 則以中介行通之
  const BRIDGE_PAIRS = [
    { a: '金', b: '木', bridge: '水', note: '金木交戰，取水通關（金生水、水生木）。' },
    { a: '水', b: '火', bridge: '木', note: '水火交戰，取木通關（水生木、木生火）。' },
    { a: '木', b: '土', bridge: '火', note: '木土交戰，取火通關（木生火、火生土）。' },
    { a: '火', b: '金', bridge: '土', note: '火金交戰，取土通關（火生土、土生金）。' },
    { a: '土', b: '水', bridge: '金', note: '土水交戰，取金通關（土生金、金生水）。' }
  ];
  let tong = { framework: '通關', wx: null, note: '無交戰，不需通關。' };
  for (const p of BRIDGE_PAIRS) {
    if ((wxCount[p.a] || 0) >= 3 && (wxCount[p.b] || 0) >= 3) {
      tong = { framework: '通關', wx: p.bridge, note: p.note };
      break;
    }
  }

  return { 扶抑: fuYi, 調候: tiao, 通關: tong };
}

// ============================
// 大運/流年 × 原局四支 的互動（六合 / 六沖 / 三合 / 三會 / 刑 / 害）
// ============================
// target: 單一地支字符（例如 '寅'）
// originZhiChars: 原局四柱地支字符陣列 [年,月,日,時]
// 回傳： [{type, pillarIdx, label}, ...]
function detectBranchInteractions(target, originZhiChars) {
  const out = [];
  if (!target || !Array.isArray(originZhiChars)) return out;
  const pillarLabels = ['年支','月支','日支','時支'];
  for (let i = 0; i < originZhiChars.length; i++) {
    const z = originZhiChars[i];
    if (!z) continue;
    const pl = pillarLabels[i] || `第${i+1}柱`;
    // 六沖
    if (LIU_CHONG[target] === z) out.push({ type: '六沖', pillarIdx: i, label: `${pl}六沖` });
    // 六合
    if (DZ_LIU_HE[target] === z) out.push({ type: '六合', pillarIdx: i, label: `${pl}六合` });
    // 六害
    if (LIU_HAI[target] === z) out.push({ type: '六害', pillarIdx: i, label: `${pl}六害` });
  }
  // 三合（局部）：若 target + 任兩個原局支落在同一 SAN_HE_GROUPS
  (typeof SAN_HE_GROUPS !== 'undefined' ? SAN_HE_GROUPS : []).forEach(group => {
    if (!group.includes(target)) return;
    const hits = [];
    for (let i = 0; i < originZhiChars.length; i++) {
      if (originZhiChars[i] && group.includes(originZhiChars[i]) && originZhiChars[i] !== target) {
        hits.push(i);
      }
    }
    if (hits.length >= 1) {
      // 至少兩支成合（target + 1 或以上）
      hits.forEach(i => out.push({ type: '三合', pillarIdx: i, label: `${['年支','月支','日支','時支'][i]}三合` }));
    }
  });
  // 三會
  (typeof SAN_HUI_GROUPS !== 'undefined' ? SAN_HUI_GROUPS : []).forEach(group => {
    if (!group.includes(target)) return;
    const hits = [];
    for (let i = 0; i < originZhiChars.length; i++) {
      if (originZhiChars[i] && group.includes(originZhiChars[i]) && originZhiChars[i] !== target) {
        hits.push(i);
      }
    }
    if (hits.length >= 1) {
      hits.forEach(i => out.push({ type: '三會', pillarIdx: i, label: `${['年支','月支','日支','時支'][i]}三會` }));
    }
  });
  // 刑
  if (typeof XING_GROUPS !== 'undefined') {
    (XING_GROUPS.三刑 || []).forEach(triple => {
      if (!triple.includes(target)) return;
      for (let i = 0; i < originZhiChars.length; i++) {
        if (originZhiChars[i] && triple.includes(originZhiChars[i]) && originZhiChars[i] !== target) {
          out.push({ type: '刑', pillarIdx: i, label: `${['年支','月支','日支','時支'][i]}相刑` });
        }
      }
    });
    const ziMao = XING_GROUPS.子卯;
    if (ziMao && ziMao.includes(target)) {
      for (let i = 0; i < originZhiChars.length; i++) {
        if (originZhiChars[i] && ziMao.includes(originZhiChars[i]) && originZhiChars[i] !== target) {
          out.push({ type: '刑', pillarIdx: i, label: `${['年支','月支','日支','時支'][i]}子卯刑（無禮之刑）` });
        }
      }
    }
    (XING_GROUPS.自刑 || []).forEach(c => {
      if (target !== c) return;
      for (let i = 0; i < originZhiChars.length; i++) {
        if (originZhiChars[i] === c) {
          out.push({ type: '刑', pillarIdx: i, label: `${['年支','月支','日支','時支'][i]}自刑` });
        }
      }
    });
  }
  // 去重（同 柱位 + 同 type）
  const dedup = [];
  const seen = new Set();
  for (const it of out) {
    const k = `${it.type}-${it.pillarIdx}`;
    if (seen.has(k)) continue;
    seen.add(k);
    dedup.push(it);
  }
  return dedup;
}

// 將計算函式暴露給瀏覽器全域（app.js 當前以 hoisted globals 呼叫；
// 明確掛上 window 只是讓契約更清晰，並與舊有 getPillarsUsingLunar 對齊）。
if (typeof window !== 'undefined') {
  window.getPillarsUsingLunar = getPillarsUsingLunar;
  window.getTrueSolarDate = getTrueSolarDate;
  window.getHourIndexFromTime = getHourIndexFromTime;
  window.getHourGanIdx = getHourGanIdx;
  window.countWuXing = countWuXing;
  window.judgeStrength = judgeStrength;
  window.getXiYong = getXiYong;
  window.getShiShen = getShiShen;
  window.getShiShenForHiddenStems = getShiShenForHiddenStems;
  window.computeChartShenSha = computeChartShenSha;
  window.computeYongShenFrameworks = computeYongShenFrameworks;
  window.detectBranchInteractions = detectBranchInteractions;
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
    getHourGanIdx,
    computeChartShenSha,
    computeYongShenFrameworks,
    detectBranchInteractions,
    BAZI_PILLAR_WEIGHTS,
    DEFAULT_PILLAR_WEIGHTS
  };
}
