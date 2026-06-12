import { WX_GAN, CANG_GAN, CG_WEIGHT, ELEMENT_CYCLE, WX_ZHI, DZ, TG, SHI_SHEN_MAP, CS_POWER, getChangSheng, TIAN_YI_GUI_REN, WEN_CHANG, YI_MA, TAO_HUA, HUA_GAI, JIANG_XING, LU_SHEN, YANG_REN, JIN_YU, XING_GROUPS, SAN_HE_GROUPS, SAN_HUI_GROUPS, LIU_CHONG, DZ_LIU_HE, LIU_HAI, HOUR_BRANCH_NAMES, HOUR_BRANCH_RANGES } , getKongWang, LIU_HE_TRANSFORM } from './data.js';

// ============================
// 排盤計算核心
// ============================

// 預設柱位權重（年月日時）。若不傳權重則退化為舊版統一權重，
// 使 renderCalendar 等舊呼叫端維持同樣的日柱吉凶評分。
export const DEFAULT_PILLAR_WEIGHTS = [1.0, 1.0, 1.0, 1.0];
export const BAZI_PILLAR_WEIGHTS   = [1.0, 1.5, 1.2, 1.0];


const COMMANDER_RULES = {
  '寅': [{gan:'戊', days:7}, {gan:'丙', days:7}, {gan:'甲', days:16}],
  '卯': [{gan:'甲', days:10}, {gan:'乙', days:20}],
  '辰': [{gan:'乙', days:9}, {gan:'癸', days:3}, {gan:'戊', days:18}],
  '巳': [{gan:'戊', days:7}, {gan:'庚', days:7}, {gan:'丙', days:16}],
  '午': [{gan:'丙', days:10}, {gan:'己', days:9}, {gan:'丁', days:11}],
  '未': [{gan:'丁', days:9}, {gan:'乙', days:3}, {gan:'己', days:18}],
  '申': [{gan:'戊', days:7}, {gan:'壬', days:7}, {gan:'庚', days:16}],
  '酉': [{gan:'庚', days:10}, {gan:'辛', days:20}],
  '戌': [{gan:'辛', days:9}, {gan:'丁', days:3}, {gan:'戊', days:18}],
  '亥': [{gan:'戊', days:7}, {gan:'甲', days:7}, {gan:'壬', days:16}],
  '子': [{gan:'壬', days:10}, {gan:'癸', days:20}],
  '丑': [{gan:'癸', days:9}, {gan:'辛', days:3}, {gan:'己', days:18}]
};

function getCommander(zhi, daysPassed) {
  const rules = COMMANDER_RULES[zhi];
  if (!rules) return null;
  let accumulated = 0;
  for (let rule of rules) {
    accumulated += rule.days;
    if (daysPassed <= accumulated) return rule.gan;
  }
  return rules[rules.length - 1].gan; // fallback to the last one
}

export function detectDynamicTransformations(pillars) {
  const zhiChars = pillars.map(p => p.zhi);
  const ganChars = pillars.map(p => p.gan);
  let transformedWuxing = null;
  
  // 1. Check San He (三合)
  const sanHeMap = {
    '申子辰': '水', '亥卯未': '木', '寅午戌': '火', '巳酉丑': '金'
  };
  for (let [group, wx] of Object.entries(sanHeMap)) {
    if (group.split('').every(char => zhiChars.includes(char))) {
      // Must have penetrating stem of the transformed Wuxing
      if (ganChars.some(g => WX_GAN[g] === wx)) {
        transformedWuxing = wx;
      }
    }
  }
  
  // 2. Check San Hui (三会)
  const sanHuiMap = {
    '亥子丑': '水', '寅卯辰': '木', '巳午未': '火', '申酉戌': '金'
  };
  for (let [group, wx] of Object.entries(sanHuiMap)) {
    if (group.split('').every(char => zhiChars.includes(char))) {
      // Must have penetrating stem
      if (ganChars.some(g => WX_GAN[g] === wx)) {
        transformedWuxing = wx;
      }
    }
  }

  // 天干五合 (Jia-Ji -> Earth, Yi-Geng -> Metal, Bing-Xin -> Water, Ding-Ren -> Wood, Wu-Gui -> Fire)
  const ganHeMap = {
    '甲己': '土', '乙庚': '金', '丙辛': '水', '丁壬': '木', '戊癸': '火'
  };
  let ganHeWuxing = null;
  // If adjacent stems combine
  for (let i = 0; i < 3; i++) {
    const pair1 = ganChars[i] + ganChars[i+1];
    const pair2 = ganChars[i+1] + ganChars[i];
    const wx = ganHeMap[pair1] || ganHeMap[pair2];
    if (wx) {
      // Must be supported by month branch Wuxing
      if (WX_ZHI[zhiChars[1]] === wx) {
        ganHeWuxing = wx;
      }
    }
  }

  
  // 地支六合 (Liu He)
  let liuHeWuxing = null;
  for (let i = 0; i < zhiChars.length; i++) {
    for (let j = i+1; j < zhiChars.length; j++) {
      const pair = zhiChars[i] + zhiChars[j];
      const wx = LIU_HE_TRANSFORM[pair];
      if (wx) {
        // Condition: penetrating stem or season
        if (ganChars.some(g => WX_GAN[g] === wx) || (WX_ZHI[zhiChars[1]] === wx)) {
          liuHeWuxing = wx;
        }
      }
    }
  }

  return { branchTransformation: transformedWuxing, stemTransformation: ganHeWuxing, liuHeTransformation: liuHeWuxing };

}

export function countWuXing(pillars, pillarWeights) {
  const weights = Array.isArray(pillarWeights) && pillarWeights.length === 4
    ? pillarWeights
    : [1.0, 1.5, 1.2, 1.0]; // DEFAULT_PILLAR_WEIGHTS
  let count = {'金':0,'木':0,'水':0,'火':0,'土':0};
  
  const transformations = detectDynamicTransformations(pillars);
  
  
  const dayPillar = pillars[2];
  const kongWangBranches = dayPillar ? getKongWang(dayPillar.gan, dayPillar.zhi) : [];

  pillars.forEach((p, i) => {
    let w = weights[i] ?? 1.0;
    
    // Dynamic Transformation Adjustment for Stems
    let ganWx = WX_GAN[p.gan];
    if (transformations.stemTransformation && (p.gan === '甲' || p.gan === '己' || p.gan === '乙' || p.gan === '庚' || p.gan === '丙' || p.gan === '辛' || p.gan === '丁' || p.gan === '壬' || p.gan === '戊' || p.gan === '癸')) {
       // Simplistic: if there is a valid stem transformation, boost that element.
       // We don't overwrite the physical gan element, we just add heavily to the transformed element.
    }
    
    count[ganWx] += 1.5 * w;
    
    // Hidden stems
    let cg = CANG_GAN[p.zhi];
    let isMonth = (i === 1);
    let commander = null;
    
    if (isMonth && pillars.meta && pillars.meta.daysFromJieQi !== undefined) {
      commander = getCommander(p.zhi, pillars.meta.daysFromJieQi);
    }

    cg.forEach((g, ci) => { 
      let baseW = CG_WEIGHT[ci];
      if (commander === g) {
        // Boost commander
        baseW = 1.2; // Increase Benqi level weight for commander
      } else if (commander) {
        // Diminish non-commander
        baseW *= 0.5;
      }
      // Kong Wang dampening
      if (kongWangBranches.includes(p.zhi)) {
         baseW *= 0.3;
      }
      count[WX_GAN[g]] += baseW * w; 
    });
  });
  
  // Apply massive branch transformation boost
  if (transformations.branchTransformation) {
    count[transformations.branchTransformation] += 5.0; // Massive boost for SanHe/SanHui
  }
  
  if (transformations.liuHeTransformation) {
    count[transformations.liuHeTransformation] += 2.0; // Boost for LiuHe
  }
  if (transformations.stemTransformation) {
    count[transformations.stemTransformation] += 2.0; // Moderate boost for GanHe
  }
  
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
export function judgeStrength(dayGan, monthZhi, wxCount, pillars) {
  const dayWX = WX_GAN[dayGan];
  const mi = ELEMENT_CYCLE.indexOf(dayWX);
  const motherEl    = ELEMENT_CYCLE[(mi - 1 + 5) % 5]; // 生我者（印）
  const childWX     = ELEMENT_CYCLE[(mi + 1) % 5];     // 我生者（食傷）
  const wealthEl    = ELEMENT_CYCLE[(mi + 2) % 5];     // 我剋者（財）
  const ctrlEl      = ELEMENT_CYCLE[(mi + 3) % 5];     // 剋我者（官殺）

  const monthHidden = CANG_GAN[monthZhi] || [];
  const monthMainEl = monthHidden.length ? WX_GAN[monthHidden[0]] : null;
  const monthBenQiEl = WX_ZHI[monthZhi];
  const deLing = (monthMainEl === dayWX) || (monthMainEl === motherEl) ||
                 (monthBenQiEl === dayWX) || (monthBenQiEl === motherEl);

  
  // Determine Kong Wang based on Day Pillar
  const dayPillar = Array.isArray(pillars) ? pillars[2] : null;
  const kongWangBranches = dayPillar ? getKongWang(dayPillar.gan, dayPillar.zhi) : [];

  const deDi = [];
  const deShi = [];
  const rootedBranches = [];
  const penetratedStems = [];
  let deDiScore = 0; // Dynamic distance score
  const branchWeights = [2, 6, 8, 4]; // 年2, 月6, 日8, 時4

  if (Array.isArray(pillars)) {
    for (let i = 0; i < pillars.length; i++) {
      const p = pillars[i];
      if (!p) continue;
      
      const hidden = CANG_GAN[p.zhi] || [];
      let rooted = false;
      for (const g of hidden) {
        const el = WX_GAN[g];
        if (el === dayWX || el === motherEl) { rooted = true; break; }
      }
      if (rooted) {
        if (i !== 2) { deDi.push(i); } // Keep legacy backward compatibility
        let currentWeight = branchWeights[i] || 0;
        
        // Kong Wang dampening
        if (kongWangBranches.includes(p.zhi)) {
          currentWeight *= 0.3;
        }
        
        // Clash/Punishment dampening from other branches
        for (let j = 0; j < pillars.length; j++) {
           if (i === j || !pillars[j]) continue;
           const otherZhiChar = DZ[pillars[j].zhi];
           const thisZhiChar = DZ[p.zhi];
           if (LIU_CHONG[otherZhiChar] === thisZhiChar) {
             currentWeight *= 0.5; // Clash weakens root by 50%
           } else {
             // Check San Xing
             for (const group of XING_GROUPS) {
               if (group.length === 3 && group.includes(otherZhiChar) && group.includes(thisZhiChar)) {
                 currentWeight *= 0.7; // Xing weakens root by 30%
               }
             }
           }
        }
        
        deDiScore += currentWeight;
        rootedBranches.push(DZ[p.zhi]);
      }
      
      if (i !== 2) {
        const stemEl = WX_GAN[p.gan];
        if (stemEl === dayWX || stemEl === motherEl) {
          deShi.push(i);
          penetratedStems.push(TG[p.gan]);
        }
      }
    }
  }

  let score = 0;
  if (deLing) score += 30;
  score += Math.min(deDiScore, 20); // 封頂提高到20
  score += Math.min(deShi.length * 6, 18);
  const support = (wxCount[dayWX] || 0) + (wxCount[motherEl] || 0);
  const drain = (wxCount[childWX] || 0) + (wxCount[wealthEl] || 0) + (wxCount[ctrlEl] || 0);
  const delta = Math.max(-12, Math.min(12, (support - drain) * 2));
  score += delta;
  score = Math.max(0, Math.min(100, Math.round(score)));

  let tier;
  let direction;
  let specialPattern = null;

  // 特殊格局判定 (Special Pattern Detection)
  const isCongRuo = score < 20 && !deLing && deDiScore <= 2;
  const isZhuanWang = score >= 75 && deLing && drain < 2;

  if (isCongRuo) {
    tier = '從弱格'; direction = 'cong_weak'; specialPattern = 'cong_weak';
  } else if (isZhuanWang) {
    tier = '專旺格'; direction = 'cong_strong'; specialPattern = 'cong_strong';
  } else {
    if (score < 30)       { tier = '極弱'; direction = 'weak';    }
    else if (score < 45)  { tier = '偏弱'; direction = 'weak';    }
    else if (score < 55)  { tier = '中和'; direction = 'neutral'; }
    else if (score < 70)  { tier = '偏強'; direction = 'strong';  }
    else                  { tier = '極強'; direction = 'strong';  }
  }

  const isStrong = score >= 50 || direction === 'cong_strong';

  return {
    score, tier, isStrong, direction, specialPattern,
    deLing, deDi, deShi,
    rootedBranches, penetratedStems,
    motherEl, childWX, wealthEl, ctrlEl
  };
}

export function getXiYong(dayGan, isStrong, ctrlEl, motherEl, childWX, wealthEl, frameworks) {
  const dayWX = WX_GAN[dayGan];
  const isNeutral = !!(frameworks && frameworks._direction === 'neutral');
  const isCongWeak = !!(frameworks && frameworks._direction === 'cong_weak');
  const isCongStrong = !!(frameworks && frameworks._direction === 'cong_strong');

  let base;
  if (isNeutral) {
    base = { xi: motherEl, yong: null, ji: [], xian: wealthEl };
  } else if (isCongWeak) {
    const yong = (frameworks && frameworks.扶抑 && frameworks.扶抑.wx) || ctrlEl;
    let xi = wealthEl;
    if (yong === childWX) xi = wealthEl;
    if (yong === wealthEl) xi = childWX;
    if (yong === ctrlEl) xi = wealthEl;
    base = { xi: xi, yong: yong, ji: [dayWX, motherEl], xian: (yong === ctrlEl ? childWX : ctrlEl) };
  } else if (isCongStrong) {
    base = { xi: childWX, yong: motherEl, ji: [ctrlEl, wealthEl], xian: dayWX };
  } else if (isStrong) {
    base = { xi: childWX, yong: ctrlEl, ji: [dayWX, motherEl], xian: wealthEl };
  } else {
    base = { xi: motherEl, yong: dayWX, ji: [ctrlEl, childWX], xian: wealthEl };
  }

  if (!frameworks || !frameworks.扶抑) return base;

  const direction = frameworks._direction || (isStrong ? 'strong' : 'weak');
  const fuYi = frameworks.扶抑;
  const tiao = frameworks.調候;
  const tiaoWX = tiao && tiao.wx;

  let primary;
  if (isCongWeak || isCongStrong) {
    primary = '順勢'; // Special pattern overrides all, using fuyi structure
  } else if (direction === 'neutral') {
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

  // primary === '扶抑' or '順勢'
  return Object.assign({}, base, { primaryFramework: primary });
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

export function getTrueSolarDate(year, month, day, hour, minute, longitude = 120, timezoneOffset = -480) {
  const lng = Number.isFinite(Number(longitude)) ? Number(longitude) : 120;
  const standardMeridian = (timezoneOffset / 60) * -15;
  const longitudeOffset = (lng - standardMeridian) * 4;
  const equationOffset = getEquationOfTimeMinutes(year, month, day);
  const totalOffset = longitudeOffset + equationOffset;
  const utc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const date = new Date(utc + totalOffset * 60000);
  return { date, longitudeOffset, equationOffset, totalOffset, longitude: lng };
}

export function getHourIndexFromTime(hour, minute = 0) {
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
export function getHourGanIdx(dayGanIdx, hourZhiIdx) {
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
export function getPillarsUsingLunar(year, month, day, timeArg = '12:00', longitude = 120, options = {}) {
  const parsed = parseTimeArg(timeArg);
  const useTrueSolarTime = options.useTrueSolarTime !== false;
  const dayChangeRule = options.dayChangeRule === '00:00' ? '00:00' : '23:00';
  const tzOffset = options.timezoneOffset !== undefined ? Number(options.timezoneOffset) : -480;

  const trueSolar = getTrueSolarDate(year, month, day, parsed.hour, parsed.minute, longitude, tzOffset);
  const d = trueSolar.date;
  const localEpoch = Date.UTC(year, month - 1, day, parsed.hour, parsed.minute, 0);
  const appliedHourDate = useTrueSolarTime ? d : new Date(localEpoch);
  const hourIndex = getHourIndexFromTime(appliedHourDate.getUTCHours(), appliedHourDate.getUTCMinutes());

  // 1. Local Time (For Day Pillar - changes at local midnight)
  const localSolar = Solar.fromYmdHms(year, month, day, parsed.hour, parsed.minute, 0);
  const localLunar = localSolar.getLunar();
  const localBazi = localLunar.getEightChar();

  // 2. Astronomical Time as Beijing Time (For Year & Month Pillars based on global Solar Terms)
  // tzOffset is minutes from UTC (e.g. UTC+8 = -480, UTC-5 = 300)
  const absoluteUtcEpoch = localEpoch + (tzOffset * 60000);
  const beijingEpoch = absoluteUtcEpoch + (480 * 60000); // Shift to UTC+8
  const bjd = new Date(beijingEpoch);
  const astroSolar = Solar.fromYmdHms(bjd.getUTCFullYear(), bjd.getUTCMonth() + 1, bjd.getUTCDate(), bjd.getUTCHours(), bjd.getUTCMinutes(), 0);
  const astroLunar = astroSolar.getLunar();
  const astroBazi = astroLunar.getEightChar();

  // 3. True Solar Time (For Hour Pillar)
  const trueSolarSolar = Solar.fromYmdHms(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), 0);
  const trueSolarLunar = trueSolarSolar.getLunar();
  const trueSolarBazi = trueSolarLunar.getEightChar();

  const ganIdx = (str) => TG.indexOf(str);
  const zhiIdx = (str) => DZ.indexOf(str);
  const call = (obj, method, fallback) => (obj && typeof obj[method] === 'function') ? obj[method]() : fallback;
  const dayGanMethod = dayChangeRule === '00:00' ? 'getDayGanExact2' : 'getDayGanExact';
  const dayZhiMethod = dayChangeRule === '00:00' ? 'getDayZhiExact2' : 'getDayZhiExact';

  const yp = { gan: ganIdx(call(astroLunar, 'getYearGanExact', astroBazi.getYearGan())), zhi: zhiIdx(call(astroLunar, 'getYearZhiExact', astroBazi.getYearZhi())) };
  const mp = { gan: ganIdx(call(astroLunar, 'getMonthGanExact', astroBazi.getMonthGan())), zhi: zhiIdx(call(astroLunar, 'getMonthZhiExact', astroBazi.getMonthZhi())) };
  const dp = { gan: ganIdx(call(localLunar, dayGanMethod, localBazi.getDayGan())), zhi: zhiIdx(call(localLunar, dayZhiMethod, localBazi.getDayZhi())) };
  const hourZhiIdx = hourIndex;
  const hourGanIdx = getHourGanIdx(dp.gan, hourZhiIdx);
  const hp = { gan: hourGanIdx, zhi: hourZhiIdx };

  const pillars = [yp, mp, dp, hp];
  pillars.meta = {
    inputTime: `${pad2(parsed.hour)}:${pad2(parsed.minute)}`,
    trueSolarTime: `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`,
    trueSolarDateTime: formatDateTime(d),
    appliedHourTime: `${pad2(appliedHourDate.getUTCHours())}:${pad2(appliedHourDate.getUTCMinutes())}`,
    appliedHourDateTime: formatDateTime(appliedHourDate),
    hourClockSource: useTrueSolarTime ? 'trueSolar' : 'localStandard',
    useTrueSolarTime,
    dayChangeRule,
    dayChangeRuleText: dayChangeRule === '00:00' ? '子正換日（00:00）' : '子初換日（23:00）',
    longitude: trueSolar.longitude,
    timezoneOffset: tzOffset,
    longitudeOffset: trueSolar.longitudeOffset,
    equationOffset: trueSolar.equationOffset,
    totalOffset: trueSolar.totalOffset,
    longitudeOffsetText: formatSignedMinutes(trueSolar.longitudeOffset),
    equationOffsetText: formatSignedMinutes(trueSolar.equationOffset),
    totalOffsetText: formatSignedMinutes(trueSolar.totalOffset),
    hourIndex,
    hourName: HOUR_BRANCH_NAMES[hourIndex],
    hourRange: HOUR_BRANCH_RANGES[hourIndex],
    // Downstream relies on Beijing astronomical time to match global solar terms
    solar: astroSolar,
    lunar: astroLunar,
    eightChar: astroBazi,
    localSolar,
    localLunar,
    localEightChar: localBazi,
    astroSolar,
    astroLunar,
    astroEightChar: astroBazi,
    trueSolarSolar,
    trueSolarLunar,
    trueSolarEightChar: trueSolarBazi
  };

  return pillars;
}

// 十神：以日主為我
export function getShiShen(dayGan, otherGan) {
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
export function calculateDayFortune(year, month, day, userBazi, longitude = 120, timezoneOffset = -480) {
  // 使用真太陽時計算
  const trueSolar = getTrueSolarDate(year, month, day, 12, 0, longitude, timezoneOffset);
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
export function calculateDecadeFortune(userBazi, gender) {
  const { solar, lunar, eightChar } = userBazi;

  // 獲取月柱信息
  const monthGan = TG.indexOf(eightChar.getMonthGan());
  const monthZhi = DZ.indexOf(eightChar.getMonthZhi());

  // 判斷大運順逆
  const isYangMale = userBazi.yearGan % 2 === 0 && gender === 'male';
  const isYinFemale = userBazi.yearGan % 2 === 1 && gender === 'female';
  const forward = isYangMale || isYinFemale; // 陽男陰女順行，其餘逆行

  // 計算起運歲數（簡化為固定值，實際應根據節氣計算）
  
  let startAge = 3;
  if (userBazi.eightChar && typeof userBazi.eightChar.getYun === 'function') {
    try {
      const yun = userBazi.eightChar.getYun(gender === 'male' ? 1 : 0);
      startAge = yun.getStartYear();
    } catch(e) { console.warn('getYun error, fallback to 3', e); }
  }


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
      shiShen: getShiShen(userBazi.dayGan, ganIdx),
      stemPhase: `${age}-${age + 4}歲偏重天干`,
      branchPhase: `${age + 5}-${age + 9}歲偏重地支`
    });
  }

  return daYun;
}

export function getShiShenForHiddenStems(dayGan, zhiIdx) {
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
export function computeChartShenSha(pillars) {
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
export function computeYongShenFrameworks(input) {
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
  
  // 《窮通寶鑑》120 規則
  const TIAO_HOU_FULL = {
    '甲': {
      '子': ['丁','庚'], '丑': ['丁','庚'], '寅': ['丙','癸'], '卯': ['庚','丁'],
      '辰': ['庚','壬'], '巳': ['癸','庚'], '午': ['癸','丁'], '未': ['癸','丁'],
      '申': ['丁','壬'], '酉': ['丁','壬'], '戌': ['壬','甲'], '亥': ['庚','丁']
    },
    '乙': {
      '子': ['丙','戊'], '丑': ['丙','戊'], '寅': ['丙','癸'], '卯': ['丙','癸'],
      '辰': ['癸','丙'], '巳': ['癸','辛'], '午': ['癸','丙'], '未': ['癸','丙'],
      '申': ['丙','癸'], '酉': ['丙','癸'], '戌': ['癸','丙'], '亥': ['丙','戊']
    },
    '丙': {
      '子': ['壬','戊'], '丑': ['壬','甲'], '寅': ['壬','庚'], '卯': ['壬','己'],
      '辰': ['壬','甲'], '巳': ['壬','庚'], '午': ['壬','庚'], '未': ['壬','庚'],
      '申': ['壬','戊'], '酉': ['壬','癸'], '戌': ['甲','壬'], '亥': ['甲','壬']
    },
    '丁': {
      '子': ['甲','庚'], '丑': ['甲','庚'], '寅': ['甲','庚'], '卯': ['庚','甲'],
      '辰': ['甲','壬'], '巳': ['甲','壬'], '午': ['壬','癸'], '未': ['甲','壬'],
      '申': ['甲','庚'], '酉': ['甲','庚'], '戌': ['甲','庚'], '亥': ['甲','庚']
    },
    '戊': {
      '子': ['丙','甲'], '丑': ['丙','甲'], '寅': ['丙','甲'], '卯': ['丙','癸'],
      '辰': ['甲','癸'], '巳': ['甲','丙'], '午': ['壬','甲'], '未': ['癸','丙'],
      '申': ['丙','癸'], '酉': ['丙','癸'], '戌': ['甲','壬'], '亥': ['甲','丙']
    },
    '己': {
      '子': ['丙','甲'], '丑': ['丙','甲'], '寅': ['丙','癸'], '卯': ['甲','癸'],
      '辰': ['丙','癸'], '巳': ['癸','丙'], '午': ['癸','丙'], '未': ['癸','丙'],
      '申': ['丙','癸'], '酉': ['丙','癸'], '戌': ['甲','丙'], '亥': ['丙','甲']
    },
    '庚': {
      '子': ['丁','甲'], '丑': ['丁','甲'], '寅': ['丁','甲'], '卯': ['丁','甲'],
      '辰': ['甲','丁'], '巳': ['壬','丙'], '午': ['壬','癸'], '未': ['丁','甲'],
      '申': ['丁','甲'], '酉': ['丁','甲'], '戌': ['甲','壬'], '亥': ['丁','丙']
    },
    '辛': {
      '子': ['丙','壬'], '丑': ['丙','壬'], '寅': ['己','壬'], '卯': ['壬','甲'],
      '辰': ['壬','甲'], '巳': ['壬','甲'], '午': ['壬','癸'], '未': ['壬','庚'],
      '申': ['壬','甲'], '酉': ['壬','甲'], '戌': ['壬','甲'], '亥': ['壬','丙']
    },
    '壬': {
      '子': ['戊','丙'], '丑': ['丙','甲'], '寅': ['庚','丙'], '卯': ['戊','辛'],
      '辰': ['甲','庚'], '巳': ['壬','辛'], '午': ['癸','庚'], '未': ['辛','甲'],
      '申': ['戊','丁'], '酉': ['甲','庚'], '戌': ['甲','丙'], '亥': ['戊','丙']
    },
    '癸': {
      '子': ['丙','辛'], '丑': ['丙','辛'], '寅': ['辛','丙'], '卯': ['庚','辛'],
      '辰': ['丙','辛'], '巳': ['辛','壬'], '午': ['庚','壬'], '未': ['庚','壬'],
      '申': ['丁','甲'], '酉': ['辛','丙'], '戌': ['辛','甲'], '亥': ['庚','辛']
    }
  };

  let tiao = { framework: '調候', wx: null, note: '日主季節資訊不足，調候暫略。', extreme: false };
  const dayGanChar = TG[dayGan];
  const monthZhiChar = DZ[monthZhi];
  
  if (TIAO_HOU_FULL[dayGanChar] && TIAO_HOU_FULL[dayGanChar][monthZhiChar]) {
    const preferences = TIAO_HOU_FULL[dayGanChar][monthZhiChar];
    const primaryGan = preferences[0];
    const primaryWx = WX_GAN[TG.indexOf(primaryGan)];
    const secondaryGan = preferences.length > 1 ? preferences[1] : null;
    
    // Check extreme condition: if the primary element is almost absent (< 1.5 weight)
    const primaryCount = wxCount[primaryWx] || 0;
    const extreme = primaryCount < 1.5;
    
    let note = `【窮通寶鑑】${dayGanChar}日主生於${monthZhiChar}月，首選${primaryGan}${primaryWx}調候`;
    if (secondaryGan) note += `，次取${secondaryGan}${WX_GAN[TG.indexOf(secondaryGan)]}。`;
    if (extreme) note += ` 命局${primaryWx}氣枯竭，亟需調候！`;

    tiao = {
      framework: '調候',
      wx: primaryWx,
      note: note,
      extreme: extreme
    };
  }
const direction = strength.direction
    || (typeof strength.isStrong === 'boolean' ? (strength.isStrong ? 'strong' : 'weak') : null);
  let fuYi;

  if (direction === 'cong_weak') {
    let maxDrain = Math.max(wxCount[strength.childWX]||0, wxCount[strength.wealthEl]||0, wxCount[strength.ctrlEl]||0);
    let yong = strength.ctrlEl;
    let patternName = '從弱格';
    if (maxDrain === (wxCount[strength.childWX]||0)) { yong = strength.childWX; patternName = '從兒格'; }
    else if (maxDrain === (wxCount[strength.wealthEl]||0)) { yong = strength.wealthEl; patternName = '從財格'; }
    else if (maxDrain === (wxCount[strength.ctrlEl]||0)) { yong = strength.ctrlEl; patternName = '從殺格'; }
    fuYi = { framework: '順勢', wx: yong, note: `日主毫無根氣，命局構成【${patternName}】。不可生扶，應順應局中最旺之${yong}五行。`, patternName };
  } else if (direction === 'cong_strong') {
    let yong = strength.motherEl;
    let patternName = '專旺格';
    if (dayWX === '木') patternName = '曲直格';
    if (dayWX === '火') patternName = '炎上格';
    if (dayWX === '土') patternName = '稼穡格';
    if (dayWX === '金') patternName = '從革格';
    if (dayWX === '水') patternName = '潤下格';
    fuYi = { framework: '順勢', wx: yong, note: `全局印比極旺，命局構成【${patternName}】。不可逆其鋒芒，應順勢取${yong}及同類為喜用。`, patternName };
  } else if (direction === 'neutral') {
    fuYi = { framework: '扶抑', wx: null, note: '日主中和，暫不強扶強抑，取調候或通關為要。' };
  } else if (direction === 'strong') {
    if (strength.score > 70) {
      fuYi = { framework: '扶抑', wx: strength.ctrlEl, note: `日主偏強，取${strength.ctrlEl}剋之以制其旺。` };
    } else {
      fuYi = { framework: '扶抑', wx: strength.childWX, note: `日主偏強，取${strength.childWX}洩秀以通其氣。` };
    }
  } else if (direction === 'weak') {
    if (strength.score < 30) {
      fuYi = { framework: '扶抑', wx: strength.motherEl, note: `日主極弱，取${strength.motherEl}印生以扶身。` };
    } else {
      fuYi = { framework: '扶抑', wx: dayWX, note: `日主偏弱，取同類${dayWX}比劫助身。` };
    }
  } else {
    // direction 缺席且 isStrong 也不是 boolean：退回舊版 isStrong 分支以保持向下相容
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
export function detectBranchInteractions(target, originZhiChars) {
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


