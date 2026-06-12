// ============================
// 紫微斗数排盘算法
// 基于倪海夏《天纪》体系
// ============================

// 确保依赖的常量已加载
if (typeof window.ZIWEI_CONSTANTS === 'undefined') {
  console.error('ZIWEI_CONSTANTS not loaded. Please include constants.js first.');
}

const ZW = window.ZIWEI_CONSTANTS;

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
function generateZiweiChart(birthInfo) {
  const { year, month, day, hour, gender } = birthInfo;

  try {
    const tzOffset = birthInfo.timezoneOffset !== undefined ? Number(birthInfo.timezoneOffset) : -480;
    const lunarInfo = getZiweiLunarInfo(year, month, day, hour, 0, tzOffset);
    const iztroGender = gender === 'male' ? '男' : '女';

    const iztroAstro = getIztroAstro();

    // 检查iztro是否可用
    if (!iztroAstro) {
      throw new Error('iztro library not available');
    }

    // iztro uses hour index (0-11). Local true solar hour index should theoretically be used,
    // but the local hour index directly calculated from local time provides the correct mapping.
    const timeIndex = Math.floor((hour + 1) / 2) % 12;
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
  const lunarInfo = getZiweiLunarInfo(year, month, day, hour, 0, tzOffset);

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
