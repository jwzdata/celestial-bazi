// ============================
// 紫微斗数排盘算法
// 基于倪海夏《天纪》体系
// ============================

// 确保依赖的常量已加载
import { ZIWEI_CONSTANTS } from './constants.js';
import { getTrueSolarDate, getHourIndexFromTime } from '../bazi.js';
const ZW = ZIWEI_CONSTANTS;

// iztro 在浏览器 UMD 包中导出为 window.iztro，旧集成代码曾假设存在
// window.astro；这里统一取到 astro 模块，方便浏览器和 Node 验证脚本共用。
function getIztroAstro() {
  if (typeof window !== 'undefined' && window.iztro?.astro?.bySolar) {
    return window.iztro.astro;
  }
  if (typeof window !== 'undefined' && window.astro?.bySolar) {
    return window.astro;
  }
  if (typeof globalThis !== 'undefined' && globalThis.iztro?.astro?.bySolar) {
    return globalThis.iztro.astro;
  }
  if (typeof globalThis !== 'undefined' && globalThis.astro?.bySolar) {
    return globalThis.astro;
  }
  return null;
}

function normalizePalaceName(name) {
  if (!name) return '';
  if (name === '仆役') return '交友宫';
  return name.endsWith('宫') ? name : `${name}宫`;
}

// 亮度映射
function mapBrightness(b) {
  if (!b) return 'normal';
  if (b === '庙' || b === '旺') return 'bright';
  if (b === '陷' || b === '不') return 'dim';
  return 'normal';
}

// 星曜类型映射
function mapStarType(starName, iztroType) {
  if (ZW.SHA_STARS.has(starName)) return 'sha';
  if (ZW.LUCKY_STARS.has(starName)) return 'lucky';
  const t = (iztroType ?? '').toLowerCase();
  if (t === '主星' || t === 'major') return 'major';
  if (t === '煞星' || t === 'tough') return 'sha';
  if (t === '吉星' || t === 'soft' || t === '禄存' || t === '天马') return 'lucky';
  return 'minor';
}

// 五行局名称 → 数字
function parseWuxingJu(name) {
  if (name.includes('二')) return 2;
  if (name.includes('三')) return 3;
  if (name.includes('四')) return 4;
  if (name.includes('五')) return 5;
  if (name.includes('六')) return 6;
  return 3; // 默认木三局
}

// 获取农历信息（复用八字项目的函数）
function getZiweiLunarInfo(year, month, day, hour = 12, minute = 0, timezoneOffset = -480) {
  try {
    // Local Time (For Lunar Day - changes at local midnight)
    const localSolar = Solar.fromYmdHms(year, month, day, hour, minute, 0);
    const localLunar = localSolar.getLunar();
    
    // Absolute Astronomical Time (For Lunar Month & Leap Month)
    const localEpoch = Date.UTC(year, month - 1, day, hour, minute, 0);
    const absoluteUtcEpoch = localEpoch + (timezoneOffset * 60000);
    const beijingEpoch = absoluteUtcEpoch + (480 * 60000); // UTC+8
    const bjd = new Date(beijingEpoch);
    const astroSolar = Solar.fromYmdHms(bjd.getUTCFullYear(), bjd.getUTCMonth() + 1, bjd.getUTCDate(), bjd.getUTCHours(), bjd.getUTCMinutes(), 0);
    const astroLunar = astroSolar.getLunar();

    const yearStem = ZW.STEMS.indexOf(astroLunar.getYearGan());
    const yearBranch = ZW.BRANCHES.indexOf(astroLunar.getYearZhi());
    const rawMonth = astroLunar.getMonth(); // Astro month
    return {
      lunarYear: astroLunar.getYear(),
      lunarMonth: Math.abs(rawMonth),
      lunarDay: localLunar.getDay(), // Local day
      yearStem: yearStem >= 0 ? yearStem : 0,
      yearBranch: yearBranch >= 0 ? yearBranch : 0,
      isLeapMonth: rawMonth < 0,
    };
  } catch (e) {
    console.warn('lunar-javascript not available, using basic conversion');
    return {
      lunarYear: year,
      lunarMonth: month,
      lunarDay: day,
      yearStem: (year - 4) % 10,
      yearBranch: (year - 4) % 12,
      isLeapMonth: false,
    };
  }
}

// 主要的紫微斗数排盘函数

// ==========================================
// 专业级紫微斗数分析引擎 (Professional Analytics)
// ==========================================

// 1. 三方四正分析
export function getSanFangSiZheng(palaces, targetBranchIndex) {
  const self = palaces[targetBranchIndex];
  const sanFang1 = palaces[(targetBranchIndex + 4) % 12];
  const sanFang2 = palaces[(targetBranchIndex + 8) % 12];
  const duiGong = palaces[(targetBranchIndex + 6) % 12];
  
  const allStars = [
    ...self.stars, ...sanFang1.stars, ...sanFang2.stars, ...duiGong.stars
  ];
  
  return {
    self,
    sanFang: [sanFang1, sanFang2],
    duiGong,
    allStars
  };
}

// 2. 飞星四化分析 (宫干四化)
export function computeFlyingSiHua(palaces, siHuaTable) {
  const flights = [];
  
  palaces.forEach(fromPalace => {
    const stem = fromPalace.stem;
    const stemIndex = ZW.STEMS.indexOf(stem);
    if (stemIndex === -1) return;
    
    const [luStar, quanStar, keStar, jiStar] = siHuaTable[stemIndex];
    const siHuaMap = { '化禄': luStar, '化权': quanStar, '化科': keStar, '化忌': jiStar };
    
    for (const [siHuaType, starName] of Object.entries(siHuaMap)) {
      if (!starName) continue;
      
      // 寻找该星曜所在的宫位
      for (const toPalace of palaces) {
        if (toPalace.stars.some(s => s.name === starName)) {
          flights.push({
            fromPalace: fromPalace.name,
            toPalace: toPalace.name,
            star: starName,
            siHua: siHuaType
          });
          break;
        }
      }
    }
  });
  
  return flights;
}

// 3. 自化分析
export function computeSelfSiHua(palaces, siHuaTable) {
  palaces.forEach(palace => {
    const stemIndex = ZW.STEMS.indexOf(palace.stem);
    if (stemIndex === -1) return;
    
    const [luStar, quanStar, keStar, jiStar] = siHuaTable[stemIndex];
    const siHuaMap = { '化禄': luStar, '化权': quanStar, '化科': keStar, '化忌': jiStar };
    
    palace.selfSihua = [];
    for (const [siHuaType, starName] of Object.entries(siHuaMap)) {
      if (!starName) continue;
      if (palace.stars.some(s => s.name === starName)) {
        palace.selfSihua.push({ star: starName, siHua: siHuaType });
      }
    }
  });
}

// 4. 宫位六线分析
export function analyzePalaceAxes(palaces) {
  const findPalace = name => palaces.find(p => p.name === name);
  const axes = [
    { name: '命迁线', p1: findPalace('命宫'), p2: findPalace('迁移宫') },
    { name: '夫官线', p1: findPalace('夫妻宫'), p2: findPalace('官禄宫') },
    { name: '兄友线', p1: findPalace('兄弟宫'), p2: findPalace('交友宫') },
    { name: '财福线', p1: findPalace('财帛宫'), p2: findPalace('福德宫') },
    { name: '子田线', p1: findPalace('子女宫'), p2: findPalace('田宅宫') },
    { name: '父疾线', p1: findPalace('父母宫'), p2: findPalace('疾厄宫') }
  ];
  
  return axes.map(axis => {
    if (!axis.p1 || !axis.p2) return axis;
    return {
      ...axis,
      allStars: [...axis.p1.stars, ...axis.p2.stars]
    };
  });
}

// 5. 经典格局检测
export function detectZiweiPatterns(palaces) {
  const patterns = [];
  const mingPalace = palaces.find(p => p.name === '命宫');
  if (!mingPalace) return patterns;
  
  const mingIndex = ZW.BRANCHES.indexOf(mingPalace.branch);
  const { sanFang, duiGong, allStars } = getSanFangSiZheng(palaces, mingIndex);
  
  const hasStar = (palace, starName) => palace.stars.some(s => s.name === starName);
  const hasStarsInArray = (starsArray, starNames) => starNames.every(name => starsArray.some(s => s.name === name));
  const hasShaJi = (palace) => palace.stars.some(s => ['擎羊','陀罗','火星','铃星','地空','地劫'].includes(s.name) || s.siHua === '忌');
  
  const mingShaJi = hasShaJi(mingPalace);

  // 1. 紫府同宫
  if (hasStar(mingPalace, '紫微') && hasStar(mingPalace, '天府')) {
    patterns.push({ name: '紫府同宫格', level: 'auspicious', description: '紫微天府同守命宫，帝王与财库同处，主大富大贵。', broken: mingShaJi });
  }
  
  // 2. 日月并明 / 日月反背
  const taiYangPalace = palaces.find(p => hasStar(p, '太阳'));
  const taiYinPalace = palaces.find(p => hasStar(p, '太阴'));
  if (taiYangPalace && taiYinPalace) {
    const sunBranch = taiYangPalace.branch;
    const moonBranch = taiYinPalace.branch;
    if (['巳','午'].includes(sunBranch) && ['亥','子'].includes(moonBranch)) {
      patterns.push({ name: '日月并明格', level: 'auspicious', description: '太阳在巳午得地，太阴在亥子得地，日月交辉，主贵。', broken: false });
    } else if (['亥','子'].includes(sunBranch) && ['巳','午'].includes(moonBranch)) {
      patterns.push({ name: '日月反背格', level: 'inauspicious', description: '太阳落陷于夜，太阴落陷于昼，主辛劳波折。', broken: false });
    }
    // 明珠出海格: 太阳在卯, 太阴在亥
    if (sunBranch === '卯' && moonBranch === '亥' && !mingPalace.stars.some(s => s.type === 'major')) {
      patterns.push({ name: '明珠出海格', level: 'auspicious', description: '命无正曜，太阳在卯太阴在亥会照，主声名远播。', broken: mingShaJi });
    }
  }
  
  // 3. 机月同梁
  if (hasStarsInArray(allStars, ['天机','太阴','天同','天梁'])) {
    patterns.push({ name: '机月同梁格', level: 'auspicious', description: '三方四正会齐机月同梁，利于文职、公教、企划。', broken: mingShaJi });
  }
  
  // 4. 杀破狼
  if (hasStarsInArray(allStars, ['七杀','破军','贪狼'])) {
    patterns.push({ name: '杀破狼格', level: 'neutral', description: '开创力极强，人生起伏大，主动荡与变化。', broken: false });
  }
  
  // 5. 府相朝垣
  if (hasStarsInArray([...sanFang[0].stars, ...sanFang[1].stars, ...duiGong.stars], ['天府','天相'])) {
    patterns.push({ name: '府相朝垣格', level: 'auspicious', description: '天府天相在三方四正朝照命宫，主人际广阔，衣食无忧。', broken: false });
  }
  
  // 6. 火贪/铃贪
  const checkHuoLingTan = (palace) => {
    if (!palace) return;
    if (hasStar(palace, '贪狼') && hasStar(palace, '火星')) {
      patterns.push({ name: '火贪格', level: 'auspicious', description: `火星贪狼同守${palace.name}，主突发，易得意外之财（爆发）。`, broken: hasShaJi(palace) && !hasStar(palace, '火星') });
    }
    if (hasStar(palace, '贪狼') && hasStar(palace, '铃星')) {
      patterns.push({ name: '铃贪格', level: 'auspicious', description: `铃星贪狼同守${palace.name}，主突发，易掌权势（爆发）。`, broken: hasShaJi(palace) && !hasStar(palace, '铃星') });
    }
  };
  checkHuoLingTan(mingPalace);
  checkHuoLingTan(duiGong);
  checkHuoLingTan(palaces.find(p => p.name === '财帛宫'));
  checkHuoLingTan(palaces.find(p => p.name === '官禄宫'));
  
  // 7. 禄马交驰
  if (hasStarsInArray(allStars, ['禄存','天马'])) {
    patterns.push({ name: '禄马交驰格', level: 'auspicious', description: '禄存与天马会照，主在奔波变动中得财。', broken: false });
  }
  
  // 8. 坐贵向贵
  if (hasStar(mingPalace, '天魁') && hasStar(duiGong, '天钺') || hasStar(mingPalace, '天钺') && hasStar(duiGong, '天魁')) {
    patterns.push({ name: '坐贵向贵格', level: 'auspicious', description: '天魁天钺分守命宫与迁移宫，主得贵人相助，逢凶化吉。', broken: mingShaJi });
  }
  
  // 9. 阳梁昌禄
  if (hasStarsInArray(allStars, ['太阳','天梁','文昌','禄存'])) {
    patterns.push({ name: '阳梁昌禄格', level: 'auspicious', description: '主科甲考试极佳，利于学术、仕途。', broken: mingShaJi });
  }
  
  // 10. 君臣庆会
  if (hasStar(mingPalace, '紫微') && hasStarsInArray(allStars, ['左辅','右弼','天魁','天钺'])) {
    patterns.push({ name: '君臣庆会格', level: 'auspicious', description: '紫微帝星得百官朝拱，主大富大贵，掌握极权。', broken: mingShaJi });
  }
  
  // 11. 马头带箭
  if (mingPalace.branch === '午' && hasStar(mingPalace, '擎羊') && (hasStar(mingPalace, '贪狼') || hasStar(mingPalace, '七杀'))) {
    patterns.push({ name: '马头带箭格', level: 'neutral', description: '午宫擎羊遇贪狼或七杀，威镇边疆，武职荣显，但多辛劳。', broken: false });
  }
  
  return patterns;
}

// ==========================================

export function generateZiweiChart(birthInfo) {

  const { year, month, day, hour, gender } = birthInfo;

  try {
    const tzOffset = birthInfo.timezoneOffset !== undefined ? Number(birthInfo.timezoneOffset) : -480;
    const longitude = birthInfo.longitude !== undefined && birthInfo.longitude !== '' ? Number(birthInfo.longitude) : 120;
    
    // 1. True Solar Time Correction (真太阳时校正)
    const trueSolarDate = getTrueSolarDate(year, month, day, hour, 0, longitude, tzOffset);
    const tsYear = trueSolarDate.getFullYear();
    const tsMonth = trueSolarDate.getMonth() + 1;
    const tsDay = trueSolarDate.getDate();
    const tsHour = trueSolarDate.getHours();
    const tsMinute = trueSolarDate.getMinutes();

    const lunarInfo = getZiweiLunarInfo(tsYear, tsMonth, tsDay, tsHour, tsMinute, tzOffset);
    const iztroGender = gender === 'male' ? '男' : '女';

    const iztroAstro = getIztroAstro();

    // 检查iztro是否可用
    if (!iztroAstro) {
      throw new Error('iztro library not available');
    }

    // iztro uses hour index (0-11). Local true solar hour index should theoretically be used,
    // but the local hour index directly calculated from local time provides the correct mapping.
    // Use getHourIndexFromTime which accounts for the actual True Solar minute offset properly
    const timeIndex = getHourIndexFromTime(tsHour, tsMinute);
    const lunarDateStr = `${lunarInfo.lunarYear}-${lunarInfo.lunarMonth}-${lunarInfo.lunarDay}`;
    const astrolabe = iztroAstro.byLunar(lunarDateStr, timeIndex, iztroGender, lunarInfo.isLeapMonth, true, 'zh-CN');

    // 组装十二宫
    const palaces = astrolabe.palaces.map(p => {
      const branch = ZW.BRANCHES.indexOf(p.earthlyBranch);
      const stem = ZW.STEMS.indexOf(p.heavenlyStem);

      // 合并所有星：主星 + 次星 + 杂耀
      const allStars = [
        ...(p.majorStars ?? []).map(s => ({
          name: s.name,
          type: 'major',
          brightness: mapBrightness(s.brightness),
          siHua: s.mutagen
        })),
        ...(p.minorStars ?? []).map(s => ({
          name: s.name,
          type: mapStarType(s.name, s.type),
          siHua: s.mutagen
        })),
        ...(p.adjectiveStars ?? []).map(s => ({
          name: s.name,
          type: 'minor',
          siHua: s.mutagen
        }))
      ];

      const range = p.decadal?.range;
      return {
        branch: branch >= 0 ? branch : 0,
        stem: stem >= 0 ? stem : 0,
        name: normalizePalaceName(p.name),
        stars: allStars,
        daXianAge: range ? [range[0], range[1]] : undefined,
        isMingGong: p.name === '命宫' || p.name === '命',
        isShenGong: p.isBodyPalace ?? false,
        isCurrentDaXian: false,
      };
    });

    // 当前年龄 & 大限
    const currentYear = new Date().getFullYear();
    const currentAge = currentYear - year;

    palaces.forEach(p => {
      if (p.daXianAge && currentAge >= p.daXianAge[0] && currentAge <= p.daXianAge[1]) {
        p.isCurrentDaXian = true;
      }
    });

    // 借对宫结构化字段
    palaces.forEach(p => {
      p.oppositeBranch = (p.branch + 6) % 12;
      const mainStars = p.stars.filter(s => s.type === 'major');
      p.isEmpty = mainStars.length === 0;
      if (p.isEmpty) {
        const oppPalace = palaces.find(q => q.branch === p.oppositeBranch);
        if (oppPalace) {
          p.borrowedFromBranch = oppPalace.branch;
          p.borrowedFromName = oppPalace.name;
          p.borrowedStars = oppPalace.stars.filter(s => s.type === 'major').map(s => s.name);
        }
      }
    });

    // 关键宫支
    const mingGongBranch = ZW.BRANCHES.indexOf(astrolabe.earthlyBranchOfSoulPalace);
    const shenGongBranch = ZW.BRANCHES.indexOf(astrolabe.earthlyBranchOfBodyPalace);
    const wuxingJuName = astrolabe.fiveElementsClass;
    const wuxingJu = parseWuxingJu(wuxingJuName);

    // 紫微星位置
    const ziweiPalace = palaces.find(p => p.stars.some(s => s.name === '紫微' && s.type === 'major'));
    const ziweiPos = ziweiPalace?.branch ?? 0;

    // 大限数组
    const daXians = palaces
      .filter(p => p.daXianAge)
      .sort((a, b) => a.daXianAge[0] - b.daXianAge[0])
      .map(p => ({
        startAge: p.daXianAge[0],
        endAge: p.daXianAge[1],
        palaceBranch: p.branch,
        palaceName: p.name,
      }));

    const currentDaXianIndex = daXians.findIndex(
      dx => currentAge >= dx.startAge && currentAge <= dx.endAge,
    );

    // 农历信息
    return {
      birthInfo,
      lunarInfo,
      mingGongBranch: mingGongBranch >= 0 ? mingGongBranch : 0,
      shenGongBranch: shenGongBranch >= 0 ? shenGongBranch : 0,
      wuxingJu,
      wuxingJuName,
      ziweiPos,
      palaces,
      daXians,
      currentAge,
      currentDaXianIndex,
    };

  } catch (error) {
    console.error('紫微斗数排盘失败:', error);

    const fallbackChart = generateSimpleZiweiChart(birthInfo);
    fallbackChart.error = error.message;
    return fallbackChart;
  }
}

// 简化的紫微斗数排盘（不依赖iztro）
function generateSimpleZiweiChart(birthInfo) {
  const { year, month, day, hour, gender } = birthInfo;

  // 基础计算逻辑（简化的紫微斗数算法）
  const tzOffset = birthInfo.timezoneOffset !== undefined ? Number(birthInfo.timezoneOffset) : -480;
    const longitude = birthInfo.longitude !== undefined && birthInfo.longitude !== '' ? Number(birthInfo.longitude) : 120;
    
    // 1. True Solar Time Correction (真太阳时校正)
    const trueSolarDate = getTrueSolarDate(year, month, day, hour, 0, longitude, tzOffset);
    const tsYear = trueSolarDate.getFullYear();
    const tsMonth = trueSolarDate.getMonth() + 1;
    const tsDay = trueSolarDate.getDate();
    const tsHour = trueSolarDate.getHours();
    const tsMinute = trueSolarDate.getMinutes();

    const lunarInfo = getZiweiLunarInfo(tsYear, tsMonth, tsDay, tsHour, tsMinute, tzOffset);

  // 这里可以实现一个基于传统紫微斗数算法的简化版本
  // 由于完整的紫微斗数算法非常复杂，这里提供一个基础框架

  const palaces = ZW.PALACE_NAMES.map((name, index) => ({
    branch: index,
    stem: (lunarInfo.yearStem + index) % 10,
    name,
    stars: [], // 简化的星曜排布
    isEmpty: true,
    isMingGong: index === 0,
    isShenGong: false,
    oppositeBranch: (index + 6) % 12
  }));

  return {
    birthInfo,
    lunarInfo,
    mingGongBranch: 0,
    shenGongBranch: 6,
    wuxingJu: 3, // 默认木三局
    wuxingJuName: '木三局',
    ziweiPos: 0,
    palaces,
    daXians: [],
    currentAge: new Date().getFullYear() - year,
    currentDaXianIndex: -1,
    isSimple: true // 标记为简化版本
  };
}

// 导出函数
window.ZIWEI_ALGORITHM = {
  generateZiweiChart,
  generateSimpleZiweiChart,
  mapBrightness,
  mapStarType,
  parseWuxingJu
};
