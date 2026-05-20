// ============================
// 紫微斗数基础常量
// 基于倪海夏《天纪》体系
// ============================

// 天干 Heavenly Stems
const ZIWEI_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

// 地支 Earthly Branches
const ZIWEI_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 时辰对应地支
const ZIWEI_SHICHEN = [
  { branch: 0, name: '子时', range: '23:00-01:00' },
  { branch: 1, name: '丑时', range: '01:00-03:00' },
  { branch: 2, name: '寅时', range: '03:00-05:00' },
  { branch: 3, name: '卯时', range: '05:00-07:00' },
  { branch: 4, name: '辰时', range: '07:00-09:00' },
  { branch: 5, name: '巳时', range: '09:00-11:00' },
  { branch: 6, name: '午时', range: '11:00-13:00' },
  { branch: 7, name: '未时', range: '13:00-15:00' },
  { branch: 8, name: '申时', range: '15:00-17:00' },
  { branch: 9, name: '酉时', range: '17:00-19:00' },
  { branch: 10, name: '戌时', range: '19:00-21:00' },
  { branch: 11, name: '亥时', range: '21:00-23:00' },
];

// 十二宫名，从命宫顺时针
const ZIWEI_PALACE_NAMES = [
  '命宫', '兄弟宫', '夫妻宫', '子女宫', '财帛宫', '疾厄宫',
  '迁移宫', '交友宫', '官禄宫', '田宅宫', '福德宫', '父母宫'
];

// 十四主星
const ZIWEI_MAJOR_STARS = [
  '紫微', '天机', '太阳', '武曲', '天同', '廉贞', '天府',
  '太阴', '贪狼', '巨门', '天相', '天梁', '七杀', '破军'
];

// 常见辅星
const ZIWEI_AUX_STARS = [
  '左辅', '右弼', '文昌', '文曲', '天魁', '天钺',
  '禄存', '天马', '擎羊', '陀罗', '火星', '铃星',
  '地空', '地劫', '天空', '旬空', '截路', '大耗'
];

// 四化飞星
const SI_HUA_NAMES = ['禄', '权', '科', '忌'];

// 五行 → 局数
const ZIWEI_ELEMENT_TO_JU = {
  '水': 2, '木': 3, '金': 4, '土': 5, '火': 6
};

// 局数名称
const ZIWEI_JU_NAMES = {
  2: '水二局', 3: '木三局', 4: '金四局', 5: '土五局', 6: '火六局'
};

// 四化表（年干 → [化禄, 化权, 化科, 化忌]）
const ZIWEI_SI_HUA_TABLE = {
  0: ['廉贞', '破军', '武曲', '太阳'],   // 甲
  1: ['天机', '天梁', '紫微', '太阴'],   // 乙
  2: ['天同', '天机', '文昌', '廉贞'],   // 丙
  3: ['太阴', '天同', '天机', '巨门'],   // 丁
  4: ['贪狼', '太阴', '右弼', '天机'],   // 戊
  5: ['武曲', '贪狼', '天梁', '文曲'],   // 己
  6: ['太阳', '武曲', '太阴', '天同'],   // 庚
  7: ['巨门', '太阳', '文曲', '文昌'],   // 辛
  8: ['天梁', '紫微', '左辅', '武曲'],   // 壬
  9: ['破军', '巨门', '太阴', '贪狼'],   // 癸
};

// 天魁天钺表（年干 → [天魁branch, 天钺branch]）
const ZIWEI_TIANKUI_TABLE = {
  0: [1, 7],   // 甲: 魁丑 钺未
  1: [0, 8],   // 乙: 魁子 钺申
  2: [11, 9],  // 丙: 魁亥 钺酉
  3: [11, 9],  // 丁: 魁亥 钺酉
  4: [1, 7],   // 戊: 魁丑 钺未
  5: [0, 8],   // 己: 魁子 钺申
  6: [1, 7],   // 庚: 魁丑 钺未
  7: [6, 2],   // 辛: 魁午 钺寅
  8: [3, 5],   // 壬: 魁卯 钺巳
  9: [3, 5],   // 癸: 魁卯 钺巳
};

// 禄存表（年干 → 禄存branch）
const ZIWEI_LUCUN_TABLE = {
  0: 2,   // 甲: 寅
  1: 3,   // 乙: 卯
  2: 5,   // 丙: 巳
  3: 6,   // 丁: 午
  4: 5,   // 戊: 巳
  5: 6,   // 己: 午
  6: 8,   // 庚: 申
  7: 9,   // 辛: 酉
  8: 11,  // 壬: 亥
  9: 0,   // 癸: 子
};

// 天马表（年支三合 → 天马branch）
// 寅午戌→申, 申子辰→寅, 巳酉丑→亥, 亥卯未→巳
const ZIWEI_TIANMA_TABLE = {
  2: 8,   // 寅年 → 申
  6: 8,   // 午年 → 申
  10: 8,  // 戌年 → 申
  8: 2,   // 申年 → 寅
  0: 2,   // 子年 → 寅
  4: 2,   // 辰年 → 寅
  5: 11,  // 巳年 → 亥
  9: 11,  // 酉年 → 亥
  1: 11,  // 丑年 → 亥
  11: 5,  // 亥年 → 巳
  3: 5,   // 卯年 → 巳
  7: 5,   // 未年 → 巳
};

// 主星亮度表 [branch]: 主星亮度映射
// 庙(bright) 旺(bright) 利(normal) 平(normal) 不利(dim) 陷(dim)
const ZIWEI_STAR_BRIGHTNESS = {
  '紫微': { 2: 'bright', 5: 'bright', 8: 'bright', 11: 'bright',
            1: 'normal', 4: 'normal', 7: 'bright', 10: 'normal',
            0: 'normal', 3: 'dim', 6: 'dim', 9: 'normal' },
  '天机': { 5: 'bright', 11: 'bright', 3: 'bright', 9: 'bright',
            1: 'normal', 7: 'normal', 2: 'dim', 8: 'dim',
            0: 'normal', 4: 'normal', 6: 'normal', 10: 'normal' },
  '太阳': { 3: 'bright', 4: 'bright', 5: 'bright', 6: 'bright',
            7: 'normal', 8: 'normal', 9: 'normal', 10: 'dim',
            11: 'dim', 0: 'dim', 1: 'dim', 2: 'normal' },
  '武曲': { 2: 'bright', 5: 'bright', 8: 'bright', 11: 'bright',
            0: 'normal', 3: 'normal', 6: 'normal', 9: 'normal',
            1: 'dim', 4: 'dim', 7: 'dim', 10: 'dim' },
  '天同': { 0: 'bright', 3: 'bright', 6: 'bright', 9: 'bright',
            2: 'normal', 5: 'normal', 8: 'normal', 11: 'normal',
            1: 'dim', 4: 'dim', 7: 'dim', 10: 'dim' },
  '廉贞': { 2: 'bright', 5: 'bright', 8: 'bright', 11: 'bright',
            0: 'normal', 3: 'normal', 6: 'normal', 9: 'normal',
            1: 'dim', 4: 'dim', 7: 'dim', 10: 'dim' },
};

// 主星描述（倪海夏体系）
const ZIWEI_STAR_DESCRIPTIONS = {
  '紫微': { keywords: '帝王·尊贵·独立', nature: '中性偏吉', element: '土' },
  '天机': { keywords: '智慧·机变·谋略', nature: '吉星', element: '木' },
  '太阳': { keywords: '阳刚·官贵·慷慨', nature: '吉星', element: '火' },
  '武曲': { keywords: '财富·刚毅·果断', nature: '中性', element: '金' },
  '天同': { keywords: '温和·享福·随缘', nature: '吉星', element: '水' },
  '廉贞': { keywords: '才艺·刑囚·桃花', nature: '凶中带吉', element: '火' },
  '天府': { keywords: '财库·稳重·保守', nature: '吉星', element: '土' },
  '太阴': { keywords: '柔美·财富·阴柔', nature: '吉星', element: '水' },
  '贪狼': { keywords: '欲望·桃花·多才', nature: '中性', element: '木' },
  '巨门': { keywords: '口舌·是非·善辩', nature: '凶中带吉', element: '水' },
  '天相': { keywords: '辅佐·行政·印绶', nature: '吉星', element: '水' },
  '天梁': { keywords: '荫护·医药·长辈', nature: '吉星', element: '土' },
  '七杀': { keywords: '将星·果决·孤克', nature: '凶星', element: '金' },
  '破军': { keywords: '开创·变动·破坏', nature: '凶星', element: '水' },
};

// 十二宫位含义
const ZIWEI_PALACE_MEANINGS = {
  '命宫': { element: '通用', meaning: '性格、天赋、人生主线', aspect: '核心宫位' },
  '兄弟宫': { element: '通用', meaning: '兄弟姐妹、朋友关系', aspect: '人际关系' },
  '夫妻宫': { element: '通用', meaning: '婚姻、配偶、合作关系', aspect: '感情婚姻' },
  '子女宫': { element: '通用', meaning: '子女、创作、桃花', aspect: '后代创造' },
  '财帛宫': { element: '通用', meaning: '财运、理财、价值观', aspect: '财富管理' },
  '疾厄宫': { element: '通用', meaning: '健康、灾难、工作环境', aspect: '健康事业' },
  '迁移宫': { element: '通用', meaning: '外出、变动、社会关系', aspect: '变动发展' },
  '交友宫': { element: '通用', meaning: '朋友、下属、人际关系', aspect: '人际网络' },
  '官禄宫': { element: '通用', meaning: '事业、工作、名声', aspect: '事业成就' },
  '田宅宫': { element: '通用', meaning: '房产、家庭、固定资产', aspect: '家庭资产' },
  '福德宫': { element: '通用', meaning: '福气、精神、享受', aspect: '精神享受' },
  '父母宫': { element: '通用', meaning: '父母、长辈、学业', aspect: '长辈学业' }
};

// 煞星集合
const ZIWEI_SHA_STARS = new Set(['擎羊', '陀罗', '火星', '铃星', '地空', '地劫']);

// 吉星集合
const ZIWEI_LUCKY_STARS = new Set(['文昌', '文曲', '左辅', '右弼', '天魁', '天钺',
  '禄存', '天马', '天官', '天福', '天才', '天寿', '三台', '八座', '恩光',
  '天贵', '台辅', '龙池', '凤阁', '红鸾', '天喜']);

// 导出常量供其他模块使用
window.ZIWEI_CONSTANTS = {
  STEMS: ZIWEI_STEMS,
  BRANCHES: ZIWEI_BRANCHES,
  SHICHEN: ZIWEI_SHICHEN,
  PALACE_NAMES: ZIWEI_PALACE_NAMES,
  MAJOR_STARS: ZIWEI_MAJOR_STARS,
  AUX_STARS: ZIWEI_AUX_STARS,
  SI_HUA_NAMES,
  ELEMENT_TO_JU: ZIWEI_ELEMENT_TO_JU,
  JU_NAMES: ZIWEI_JU_NAMES,
  SI_HUA_TABLE: ZIWEI_SI_HUA_TABLE,
  TIANKUI_TABLE: ZIWEI_TIANKUI_TABLE,
  LUCUN_TABLE: ZIWEI_LUCUN_TABLE,
  TIANMA_TABLE: ZIWEI_TIANMA_TABLE,
  STAR_BRIGHTNESS: ZIWEI_STAR_BRIGHTNESS,
  STAR_DESCRIPTIONS: ZIWEI_STAR_DESCRIPTIONS,
  PALACE_MEANINGS: ZIWEI_PALACE_MEANINGS,
  SHA_STARS: ZIWEI_SHA_STARS,
  LUCKY_STARS: ZIWEI_LUCKY_STARS
};
