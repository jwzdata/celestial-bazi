// ============================
// 紫微斗数类型定义 (JavaScript注释版本)
// ============================

/**
 * 出生信息接口
 * @typedef {Object} BirthInfo
 * @property {number} year - 公历年
 * @property {number} month - 公历月 (1-12)
 * @property {number} day - 公历日
 * @property {number} hour - 时辰地支索引 (0=子, 1=丑, ... 11=亥)
 * @property {'male' | 'female'} gender - 性别
 * @property {string} [name] - 姓名
 * @property {string} [province] - 出生省份
 * @property {string} [city] - 出生城市
 * @property {number} [longitude] - 出生地经度（用于真太阳时校正）
 */

/**
 * 农历信息接口
 * @typedef {Object} LunarInfo
 * @property {number} lunarYear - 农历年
 * @property {number} lunarMonth - 农历月
 * @property {number} lunarDay - 农历日
 * @property {number} yearStem - 年干索引 (0-9)
 * @property {number} yearBranch - 年支索引 (0-11)
 * @property {boolean} isLeapMonth - 是否闰月
 */

/**
 * 四化类型
 * @typedef {'禄' | '权' | '科' | '忌'} SiHua
 */

/**
 * 星曜接口
 * @typedef {Object} Star
 * @property {string} name - 星曜名称
 * @property {'major' | 'minor' | 'lucky' | 'sha'} type - 星曜类型
 * @property {SiHua} [siHua] - 四化
 * @property {'bright' | 'normal' | 'dim'} [brightness] - 亮度（庙旺利陷）
 */

/**
 * 自化标记接口
 * @typedef {Object} SelfSihuaMark
 * @property {SiHua} siHua - 四化类型
 * @property {string} starName - 自化的星曜名称
 */

/**
 * 宫位接口
 * @typedef {Object} Palace
 * @property {number} branch - 地支索引 (0-11)
 * @property {number} stem - 天干索引 (0-9)
 * @property {string} name - 宫位名称
 * @property {Star[]} stars - 星曜数组
 * @property {[number, number]} [daXianAge] - 大限年龄段
 * @property {boolean} [isCurrentDaXian] - 是否当前大限
 * @property {boolean} [isMingGong] - 是否命宫
 * @property {boolean} [isShenGong] - 是否身宫
 * @property {SelfSihuaMark[]} [selfSihua] - 宫干自化
 * @property {number} [oppositeBranch] - 对宫地支索引
 * @property {boolean} [isEmpty] - 是否空宫
 * @property {number} [borrowedFromBranch] - 借自哪个宫的地支索引
 * @property {string} [borrowedFromName] - 借自哪个宫名
 * @property {string[]} [borrowedStars] - 借到的对宫主星名列表
 */

/**
 * 大限四化接口
 * @typedef {Object} DaXianSiHua
 * @property {number} stemIndex - 天干索引
 * @property {string} stemName - 天干名称
 * @property {string} lu - 化禄星名
 * @property {string} quan - 化权星名
 * @property {string} ke - 化科星名
 * @property {string} ji - 化忌星名
 */

/**
 * 大限接口
 * @typedef {Object} DaXian
 * @property {number} startAge - 起始年龄
 * @property {number} endAge - 结束年龄
 * @property {number} palaceBranch - 宫位地支索引
 * @property {string} palaceName - 宫位名称
 * @property {number} [stemIndex] - 大限宫的天干索引
 * @property {string} [stemName] - 天干名称
 * @property {DaXianSiHua} [siHua] - 该大限四化
 */

/**
 * 紫微斗数命盘接口
 * @typedef {Object} ZiweiChart
 * @property {BirthInfo} birthInfo - 出生信息
 * @property {LunarInfo} lunarInfo - 农历信息
 * @property {number} mingGongBranch - 命宫地支索引
 * @property {number} shenGongBranch - 身宫地支索引
 * @property {number} wuxingJu - 五行局 (2,3,4,5,6)
 * @property {string} wuxingJuName - 五行局名称 (e.g. '水二局')
 * @property {number} ziweiPos - 紫微星位置
 * @property {Palace[]} palaces - 十二宫位数组
 * @property {DaXian[]} daXians - 大限数组
 * @property {number} currentAge - 当前年龄
 * @property {number} currentDaXianIndex - 当前大限索引
 */

/**
 * 格局条件接口
 * @typedef {Object} PatternCondition
 * @property {string[]} required - 必须满足条件
 * @property {string[]} [bonus] - 加分项
 * @property {string[]} [breaking] - 破格警示
 */

/**
 * 格局接口
 * @typedef {Object} Pattern
 * @property {string} name - 格局名称
 * @property {'excellent' | 'good' | 'neutral' | 'caution'} level - 格局等级
 * @property {string} description - 格局描述
 * @property {string[]} palaces - 涉及宫位
 * @property {PatternCondition} [conditions] - 成立条件
 * @property {string} [source] - 古籍出处
 */

// 导出类型定义（用于IDE提示）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // 类型定义仅用于文档，实际运行时不导出
  };
}

// 全局类型别名（用于简化代码中的类型引用）
window.ZiweiTypes = {
  /** @type {BirthInfo} */
  BirthInfo: null,
  /** @type {LunarInfo} */
  LunarInfo: null,
  /** @type {Star} */
  Star: null,
  /** @type {Palace} */
  Palace: null,
  /** @type {ZiweiChart} */
  ZiweiChart: null,
  /** @type {Pattern} */
  Pattern: null
};
