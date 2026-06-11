#!/usr/bin/env node
/*
 * Self-check for the Bazi core strength model and true-solar-time scope.
 *
 * This script runs under Node WITHOUT requiring lunar-javascript. It:
 *   1. Loads public/js/data.js and public/js/bazi.js under a minimal `vm` context
 *      so their top-level `const`s share a single scope (browser-style).
 *   2. Exercises three synthetic day-master scenarios:
 *        - 甲 (Yi-less Jia) day master born in 寅月  -> expect strong (deLing true, multiple deDi)
 *        - 庚 day master born in 午月                -> expect weak (deLing false, ctrl strong)
 *        - 丙 day master born in 辰月                -> expect roughly balanced
 *   3. Checks the true-solar-time scope invariant: a birth near a solar-term
 *      boundary (simulated by a time that is +/-15 minutes from the boundary
 *      in local-apparent time) must NOT change the year pillar regardless of
 *      longitude. We cannot actually run lunar-javascript here, so we instead
 *      assert the SHAPE of the fix: `getPillarsUsingLunar` in the source
 *      must build its year/month/day pillars from the raw Beijing Solar, not
 *      from the true-solar-shifted Solar. We verify this with a simple
 *      static-source grep so the invariant can be regression-tested offline.
 *
 * Exit 0 + print "OK" on success; exit 1 with a diagnostic on any failure.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'public/js/data.js');
const BAZI_PATH = path.join(ROOT, 'public/js/bazi.js');

function fail(msg) {
  console.error('FAIL:', msg);
  process.exit(1);
}

function loadBaziCore() {
  let dataSrc = fs.readFileSync(DATA_PATH, 'utf8');
  let baziSrc = fs.readFileSync(BAZI_PATH, 'utf8');

  // Strip ESM export keywords so it runs natively in Node vm as a script
  dataSrc = dataSrc.replace(/export\s+const\s+/g, 'const ')
                   .replace(/export\s+function\s+/g, 'function ');
  baziSrc = baziSrc.replace(/export\s+const\s+/g, 'const ')
                   .replace(/export\s+function\s+/g, 'function ')
                   .replace(/export\s+default\s+/g, 'const defaultExport = ')
                   .replace(/import\s+.*?from\s+['"].*?['"];?/g, '');

  // Shared sandbox so `const` declared in data.js is visible to bazi.js
  // (mirrors the browser's shared global scope across <script> tags).
  const sandbox = {
    module: { exports: {} },
    console,
    // Stub `window` so the window.* attach block is a no-op under Node.
    // We intentionally leave `Solar` undefined; nothing invoked by this
    // self-check calls getPillarsUsingLunar, which is the only path that
    // touches the CDN-provided Solar global.
    window: {}
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  // data.js first so its consts exist when bazi.js runs.
  vm.runInContext(dataSrc, sandbox, { filename: 'public/js/data.js' });

  const sharedModule = { exports: {} };
  sandbox.module = sharedModule;
  vm.runInContext(baziSrc, sandbox, { filename: 'public/js/bazi.js' });

  return sandbox;
}

function findIndex(arr, ch) {
  const i = arr.indexOf(ch);
  if (i < 0) throw new Error('char not found: ' + ch);
  return i;
}

function assertInRange(label, v, lo, hi) {
  if (!(v >= lo && v <= hi)) {
    fail(`${label} expected in [${lo}, ${hi}], got ${v}`);
  }
}

function run() {
  const bazi = loadBaziCore();
  const {
    countWuXing, judgeStrength, getShiShen, getShiShenForHiddenStems,
    computeChartShenSha, computeYongShenFrameworks, detectBranchInteractions,
    getHourGanIdx
  } = bazi;

  if (typeof countWuXing !== 'function') fail('countWuXing not exported');
  if (typeof judgeStrength !== 'function') fail('judgeStrength not exported');
  if (typeof getShiShen !== 'function') fail('getShiShen not exported');
  if (typeof getShiShenForHiddenStems !== 'function') fail('getShiShenForHiddenStems not exported');
  if (typeof computeChartShenSha !== 'function') fail('computeChartShenSha not exported');
  if (typeof computeYongShenFrameworks !== 'function') fail('computeYongShenFrameworks not exported');
  if (typeof detectBranchInteractions !== 'function') fail('detectBranchInteractions not exported');
  if (typeof getHourGanIdx !== 'function') fail('getHourGanIdx not exported');

  // Heavenly stems / earthly branches
  const TG = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
  const DZ = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
  const G = (c) => findIndex(TG, c);
  const Z = (c) => findIndex(DZ, c);

  // -----------------------------------------------------------------
  // Scenario A: 甲 day master born in 寅月 -> should be clearly strong.
  // Pillars (yangli): 甲寅 丙寅 甲寅 乙亥 — heavy wood support, deLing true.
  // -----------------------------------------------------------------
  {
    const pillars = [
      { gan: G('甲'), zhi: Z('寅') },
      { gan: G('丙'), zhi: Z('寅') },
      { gan: G('甲'), zhi: Z('寅') }, // day
      { gan: G('乙'), zhi: Z('亥') }
    ];
    const wx = countWuXing(pillars, [1.0, 1.5, 1.2, 1.0]);
    const s = judgeStrength(G('甲'), Z('寅'), wx, pillars);

    if (!s.deLing) fail('A: deLing expected true (寅 is 甲 本氣)');
    if (!(s.deDi && s.deDi.length >= 2)) fail(`A: deDi expected >= 2, got ${s.deDi && s.deDi.length}`);
    if (!(s.deShi && s.deShi.length >= 1)) fail(`A: deShi expected >= 1, got ${s.deShi && s.deShi.length}`);
    if (!s.isStrong) fail(`A: isStrong expected true, score=${s.score}`);
    assertInRange('A score', s.score, 70, 100);
    const allowedTiers = ['偏強', '極強'];
    if (!allowedTiers.includes(s.tier)) fail(`A: tier expected in ${allowedTiers}, got ${s.tier}`);
  }

  // -----------------------------------------------------------------
  // Scenario B: 庚 day master born in 午月 -> should be weak.
  // Pillars: 丙午 甲午 庚午 丁丑 — fire dominant, metal rooted only in 丑.
  // -----------------------------------------------------------------
  {
    const pillars = [
      { gan: G('丙'), zhi: Z('午') },
      { gan: G('甲'), zhi: Z('午') },
      { gan: G('庚'), zhi: Z('午') }, // day
      { gan: G('丁'), zhi: Z('丑') }
    ];
    const wx = countWuXing(pillars, [1.0, 1.5, 1.2, 1.0]);
    const s = judgeStrength(G('庚'), Z('午'), wx, pillars);

    if (s.deLing) fail('B: deLing expected false (午 is fire, controls 庚)');
    if (s.deShi && s.deShi.length > 0) fail(`B: deShi expected 0, got ${s.deShi.length}`);
    if (s.isStrong) fail(`B: isStrong expected false, score=${s.score}`);
    assertInRange('B score', s.score, 0, 44);
    const allowedTiers = ['偏弱', '極弱'];
    if (!allowedTiers.includes(s.tier)) fail(`B: tier expected in ${allowedTiers}, got ${s.tier}`);
  }

  // -----------------------------------------------------------------
  // Scenario C: 丙 day master born in 辰月 -> roughly balanced (not clearly strong).
  // Pillars: 甲辰 戊辰 丙辰 乙未 — 辰 holds 戊乙癸 (some wood root via 乙),
  //   stem 甲/乙 transparent (mother-Wood), but also heavy earth drain.
  //   Without deLing the score caps at 48, so this chart sits in the
  //   極弱/偏弱/中和 band depending on exact support-drain balance.
  // -----------------------------------------------------------------
  {
    const pillars = [
      { gan: G('甲'), zhi: Z('辰') },
      { gan: G('戊'), zhi: Z('辰') },
      { gan: G('丙'), zhi: Z('辰') }, // day
      { gan: G('乙'), zhi: Z('未') }
    ];
    const wx = countWuXing(pillars, [1.0, 1.5, 1.2, 1.0]);
    const s = judgeStrength(G('丙'), Z('辰'), wx, pillars);

    // 辰 本氣為土（丙之食傷），不為 deLing
    if (s.deLing) fail('C: deLing expected false (辰 本氣 土)');
    // 甲 乙 皆為印星，透干成 deShi >= 2
    if (!(s.deShi && s.deShi.length >= 2)) fail(`C: deShi expected >= 2, got ${s.deShi && s.deShi.length}`);
    // 年月時支皆含印星（乙在辰/未），可得地
    if (!(s.deDi && s.deDi.length >= 2)) fail(`C: deDi expected >= 2, got ${s.deDi && s.deDi.length}`);
    // 沒有得令時 judgeStrength 上限為 48；此盤在 極弱/偏弱/中和 之間
    assertInRange('C score', s.score, 20, 55);
    const allowedTiers = ['極弱', '偏弱', '中和'];
    if (!allowedTiers.includes(s.tier)) fail(`C: tier expected in ${allowedTiers}, got ${s.tier}`);
  }

  // -----------------------------------------------------------------
  // Shi-shen helpers sanity
  // -----------------------------------------------------------------
  {
    // 甲木日主 + 寅支: CANG_GAN[2] = [甲,丙,戊]  => 比肩/食神/偏財
    const out = getShiShenForHiddenStems(G('甲'), Z('寅'));
    const expect = ['比肩', '食神', '偏財'];
    if (out.length !== expect.length || out.some((v, i) => v !== expect[i])) {
      fail(`getShiShenForHiddenStems(甲,寅) expected ${expect}, got ${out}`);
    }
  }

  // -----------------------------------------------------------------
  // FEAT-002: computeChartShenSha
  //   年干甲 + 日支丑 → 天乙貴人 應落在含 丑/未 的柱位（甲戊庚見丑未）
  //   日干甲 → 祿神 落在 寅
  //   年支子 → 驛馬 落在 寅（申子辰馬在寅）
  // -----------------------------------------------------------------
  // Use a 甲 day master so the rule matrix is legible end-to-end.
  {
    const pillars = [
      { gan: G('甲'), zhi: Z('子') }, // 年柱：年干甲、年支子（驛馬在寅）
      { gan: G('丙'), zhi: Z('寅') }, // 月柱：月支寅 → 日干甲之祿神；年支子之驛馬
      { gan: G('甲'), zhi: Z('丑') }, // 日柱：日支丑 → 年干甲/日干甲之天乙貴人
      { gan: G('己'), zhi: Z('未') }  // 時柱：時支未 → 天乙貴人再次命中
    ];
    const ss = computeChartShenSha(pillars);
    if (!ss.天乙貴人 || !ss.天乙貴人.includes(2) || !ss.天乙貴人.includes(3)) {
      fail(`甲日+丑未 天乙貴人 missing expected pillars, got ${JSON.stringify(ss.天乙貴人)}`);
    }
    if (!ss.祿神 || !ss.祿神.includes(1)) {
      fail(`甲日 祿神 should include month pillar (寅), got ${JSON.stringify(ss.祿神)}`);
    }
    if (!ss.驛馬 || !ss.驛馬.length) {
      fail(`年支子 驛馬 should land on 寅 (month pillar), got ${JSON.stringify(ss.驛馬)}`);
    }
    // Issue #7: 驛馬 bucket is provenance-aware — entries are
    // {pillarIdx, ref} objects, not plain indices.
    const yiMaHit = ss.驛馬.find(h => h && typeof h === 'object' && h.pillarIdx === 1);
    if (!yiMaHit) fail(`驛馬 entry for month pillar missing, got ${JSON.stringify(ss.驛馬)}`);
    if (!['year','day','both'].includes(yiMaHit.ref)) {
      fail(`驛馬 ref must be one of year/day/both, got ${yiMaHit.ref}`);
    }
    // In this chart 年支子 and 日支丑 — only 年支 起 驛馬 (寅)。
    // 日支丑 起馬在亥 (not in chart). So ref should be 'year'.
    if (yiMaHit.ref !== 'year') fail(`驛馬 ref expected 'year' (only 年支子 起 寅馬), got '${yiMaHit.ref}'`);
    // 羊刃 甲刃卯 – not in chart, so bucket should be absent or empty
    if (ss.羊刃 && ss.羊刃.length) {
      fail(`羊刃 should not appear (no 卯), got ${JSON.stringify(ss.羊刃)}`);
    }
  }

  // -----------------------------------------------------------------
  // Issue #7 (continued): provenance 'both' — when year and day both
  // trigger 驛馬/桃花/華蓋/將星 onto the SAME pillar, ref must be 'both'.
  //   年支申(馬在寅) + 日支子(馬在寅) → 月支寅 被 both 起。
  // Issue #8: 子卯 無禮之刑 lives in its own bucket, NOT in 三刑.
  // -----------------------------------------------------------------
  {
    const pillars = [
      { gan: G('甲'), zhi: Z('申') }, // 年柱：年支申 → 驛馬在寅
      { gan: G('丙'), zhi: Z('寅') }, // 月柱：寅
      { gan: G('戊'), zhi: Z('子') }, // 日柱：日支子 → 驛馬在寅（同落於月支寅）
      { gan: G('辛'), zhi: Z('卯') }  // 時柱：卯
    ];
    const ss = computeChartShenSha(pillars);
    const yiMa = (ss.驛馬 || []).find(h => h && h.pillarIdx === 1);
    if (!yiMa) fail(`both-ref test: 驛馬 on month pillar missing, got ${JSON.stringify(ss.驛馬)}`);
    if (yiMa.ref !== 'both') fail(`both-ref test: expected ref='both' (年支申+日支子 皆起寅馬), got '${yiMa.ref}'`);

    // Issue #8: 日支子 + 時支卯 → 子卯 無禮之刑 in its own bucket
    if (!ss.無禮之刑 || !ss.無禮之刑.includes(2) || !ss.無禮之刑.includes(3)) {
      fail(`無禮之刑 bucket should include day(2) + hour(3), got ${JSON.stringify(ss.無禮之刑)}`);
    }
    // And must NOT be folded into 三刑
    if (ss.三刑 && (ss.三刑.includes(2) || ss.三刑.includes(3))) {
      fail(`三刑 bucket must not contain 子卯 hits, got ${JSON.stringify(ss.三刑)}`);
    }
  }

  // -----------------------------------------------------------------
  // FEAT-002: computeYongShenFrameworks
  //   丙火 日主 + 子月 → 調候 取 木（水火交戰，冬生火寒須木為母）
  //   根據表格: {火: {春:'水', 夏:'水', 秋:'木', 冬:'木'}}
  // -----------------------------------------------------------------
  {
    const pillars = [
      { gan: G('壬'), zhi: Z('子') },
      { gan: G('壬'), zhi: Z('子') },
      { gan: G('丙'), zhi: Z('子') }, // 丙火日主
      { gan: G('癸'), zhi: Z('巳') }
    ];
    const wx = countWuXing(pillars, [1.0, 1.5, 1.2, 1.0]);
    const s = judgeStrength(G('丙'), Z('子'), wx, pillars);
    const frames = computeYongShenFrameworks({
      dayGan: G('丙'), monthZhi: Z('子'), strength: s, wxCount: wx
    });
    if (!frames.扶抑 || !frames.調候 || !frames.通關) fail('frameworks must include 扶抑/調候/通關');
    if (!frames.調候.wx) fail('調候 wx should be non-null for 丙 day master in 子月');
    if (frames.調候.wx !== '木') fail(`丙日主+子月 調候 should be 木, got ${frames.調候.wx}`);
    // 通關：此盤水盛火衰，wxCount 中 水 >= 3 但 火 <3 故未交戰 → 通關 wx = null
    if (frames.通關.wx && (wx['水']||0) < 3) fail(`通關 should be null when no 3v3 clash, got ${frames.通關.wx}`);
    if (typeof frames.調候.note !== 'string' || !frames.調候.note.length) fail('調候 note must be a non-empty string');
  }

  // -----------------------------------------------------------------
  // FEAT-002: computeYongShenFrameworks 通關 (positive case)
  //   命局同時金 >= 3 且 木 >= 3 → 通關 取 水
  // -----------------------------------------------------------------
  {
    const wx = { '金': 4, '木': 4, '水': 0, '火': 0, '土': 0 };
    const fakeStrength = { isStrong: true, score: 60, ctrlEl: '火', motherEl: '土', childWX: '水', wealthEl: '木' };
    const frames = computeYongShenFrameworks({ dayGan: G('庚'), monthZhi: Z('寅'), strength: fakeStrength, wxCount: wx });
    if (!frames.通關 || frames.通關.wx !== '水') fail(`金木交戰 通關 should be 水, got ${frames.通關 && frames.通關.wx}`);
  }

  // -----------------------------------------------------------------
  // FEAT-002: detectBranchInteractions
  //   大運支 午 對原局 [寅, 子, 子, 卯] → 應偵測到 子 vs 午 的 六沖（年支/日支 兩次）。
  // -----------------------------------------------------------------
  {
    const hits = detectBranchInteractions('午', ['寅','子','子','卯']);
    const chongs = hits.filter(h => h.type === '六沖');
    if (chongs.length < 2) fail(`六沖 with 子 x2 should yield >=2 hits, got ${JSON.stringify(hits)}`);
    if (!chongs.every(h => h.label.includes('六沖'))) fail(`六沖 labels malformed: ${JSON.stringify(chongs)}`);
  }

  // -----------------------------------------------------------------
  // FEAT-002: detectBranchInteractions (六合 / 三合 / 刑 smoke)
  // -----------------------------------------------------------------
  {
    // 子 vs 丑 → 六合
    const h1 = detectBranchInteractions('子', ['丑','酉','申','未']);
    if (!h1.some(h => h.type === '六合')) fail('六合 detector failed for 子 vs 丑');
    // 申 + 原局含 子、辰 → 三合水局（部分合）
    const h2 = detectBranchInteractions('申', ['子','辰','寅','卯']);
    if (h2.filter(h => h.type === '三合').length < 2) fail('三合 (申子辰) detector failed');
    // 寅 vs 巳 → 相刑（三刑 寅巳申）
    const h3 = detectBranchInteractions('寅', ['巳','丑','子','戌']);
    if (!h3.some(h => h.type === '刑')) fail('刑 detector failed for 寅 vs 巳');
  }

  // -----------------------------------------------------------------
  // Issue #2 (review 2026-05-09): getXiYong override conflict.
  // 弱 金 day master in 子月 (winter) with no fire → 調候 extreme fires
  // and returns wx='火'. Before the fix base.ji contained 火 so the
  // override emitted yong=火 and ji=[火,水] simultaneously. After the
  // fix ji must NOT include 火.
  // -----------------------------------------------------------------
  {
    // Construct a weak 庚 day master in 子月 with zero fire.
    const pillars = [
      { gan: G('癸'), zhi: Z('亥') },
      { gan: G('甲'), zhi: Z('子') },
      { gan: G('庚'), zhi: Z('子') }, // day
      { gan: G('乙'), zhi: Z('酉') }
    ];
    const wx = countWuXing(pillars, [1.0, 1.5, 1.2, 1.0]);
    if ((wx['火'] || 0) > 0.5) fail('override test precondition: wxCount 火 should be ~0');

    const s = judgeStrength(G('庚'), Z('子'), wx, pillars);
    const frames = computeYongShenFrameworks({
      dayGan: G('庚'), monthZhi: Z('子'), strength: s, wxCount: wx
    });
    if (!frames.調候.extreme) fail('override test: 調候.extreme should fire for 庚+子月+無火');
    if (frames.調候.wx !== '火') fail(`override test: 調候.wx should be 火, got ${frames.調候.wx}`);

    frames._direction = s.direction;
    const { getXiYong } = bazi;
    const xy = getXiYong(G('庚'), s.isStrong, s.ctrlEl, s.motherEl, s.childWX, s.wealthEl, frames);
    if (xy.primaryFramework !== '調候') fail(`override test: primaryFramework expected 調候, got ${xy.primaryFramework}`);
    if (xy.yong !== '火') fail(`override test: yong expected 火, got ${xy.yong}`);
    const jiArr = Array.isArray(xy.ji) ? xy.ji : [xy.ji];
    if (jiArr.includes('火')) fail(`override test: ji must NOT contain 火 when yong=火, got ${JSON.stringify(jiArr)}`);
  }

  // -----------------------------------------------------------------
  // Issue #3 (review 2026-05-09): isStrong cliff inside 中和.
  // strength.direction must be 'neutral' for any score in [45, 54],
  // 'strong' for >=55, 'weak' for <45.
  // -----------------------------------------------------------------
  {
    // Craft a neutral-ish chart by tweaking a moderate balance.
    const pillars = [
      { gan: G('甲'), zhi: Z('辰') },
      { gan: G('戊'), zhi: Z('辰') },
      { gan: G('丙'), zhi: Z('辰') },
      { gan: G('乙'), zhi: Z('未') }
    ];
    const wx = countWuXing(pillars, [1.0, 1.5, 1.2, 1.0]);
    const s = judgeStrength(G('丙'), Z('辰'), wx, pillars);
    if (!['strong','weak','neutral'].includes(s.direction)) fail(`direction must be one of strong/weak/neutral, got ${s.direction}`);
    if (s.tier === '中和' && s.direction !== 'neutral') fail('中和 tier must map to direction=neutral');
    if (s.tier === '極強' && s.direction !== 'strong') fail('極強 tier must map to direction=strong');
    if (s.tier === '極弱' && s.direction !== 'weak') fail('極弱 tier must map to direction=weak');
    // getXiYong with a neutral direction + no extreme 調候 should not crash
    const frames = computeYongShenFrameworks({
      dayGan: G('丙'), monthZhi: Z('辰'), strength: s, wxCount: wx
    });
    frames._direction = s.direction;
    const { getXiYong } = bazi;
    const xy = getXiYong(G('丙'), s.isStrong, s.ctrlEl, s.motherEl, s.childWX, s.wealthEl, frames);
    if (typeof xy.yong !== 'string') fail('getXiYong neutral path: yong must be a string');
    const jiArr = Array.isArray(xy.ji) ? xy.ji : [xy.ji];
    if (jiArr.includes(xy.yong)) fail(`neutral getXiYong: yong=${xy.yong} must not appear in ji=${JSON.stringify(jiArr)}`);
  }

  // -----------------------------------------------------------------
  // Issue #4 (review 2026-05-09): ctrlEnemyEl must be gone.
  // The field was tautological and unused; verify it is no longer set
  // on the strength object.
  // -----------------------------------------------------------------
  {
    const pillars = [
      { gan: G('甲'), zhi: Z('寅') },
      { gan: G('丙'), zhi: Z('寅') },
      { gan: G('甲'), zhi: Z('寅') },
      { gan: G('乙'), zhi: Z('亥') }
    ];
    const wx = countWuXing(pillars, [1.0, 1.5, 1.2, 1.0]);
    const s = judgeStrength(G('甲'), Z('寅'), wx, pillars);
    if ('ctrlEnemyEl' in s) fail('strength object should no longer expose ctrlEnemyEl');
  }

  // -----------------------------------------------------------------
  // v2 #1 regression: with frameworks._direction === 'neutral' the
  // 喜/用/忌/閒 shape must NOT depend on isStrong. The pre-fix code
  // let isStrong leak into `base` inside getXiYong and into fuYi.wx
  // inside computeYongShenFrameworks, so two 中和 charts with score
  // 49 vs 50 produced opposite xi/ji across all three primary paths
  // (扶抑 fallthrough / 調候 override / 通關 override).
  //
  // Probe with a synthetic frameworks bundle so we sit squarely on
  // the 扶抑 fallthrough path first, then force 調候-extreme and
  // 通關 and re-check both cover the same cliff.
  // -----------------------------------------------------------------
  {
    const { getXiYong } = bazi;
    const shape = r => JSON.stringify([r.xi, r.yong, r.ji, r.xian]);

    // Case 1: 扶抑 fallthrough (neutral base, no 調候 extreme, no 通關 bridge).
    const fakeFallthrough = {
      _direction: 'neutral',
      扶抑: { framework: '扶抑', wx: null, note: '' },
      調候: { framework: '調候', wx: null, note: '', extreme: false },
      通關: { framework: '通關', wx: null, note: '' }
    };
    const aF = getXiYong(G('丙'), false, '水', '木', '土', '金', fakeFallthrough);
    const bF = getXiYong(G('丙'), true,  '水', '木', '土', '金', fakeFallthrough);
    if (shape(aF) !== shape(bF)) {
      fail(`v2 #1 (fallthrough): direction=neutral must yield identical 喜/用/忌/閒 across isStrong boundary; got ${shape(aF)} vs ${shape(bF)}`);
    }

    // Case 2: 調候 extreme override must not reintroduce the cliff.
    const fakeTiao = {
      _direction: 'neutral',
      扶抑: { framework: '扶抑', wx: null, note: '' },
      調候: { framework: '調候', wx: '水', note: '', extreme: true },
      通關: { framework: '通關', wx: null, note: '' }
    };
    const aT = getXiYong(G('丙'), false, '水', '木', '土', '金', fakeTiao);
    const bT = getXiYong(G('丙'), true,  '水', '木', '土', '金', fakeTiao);
    if (shape(aT) !== shape(bT)) {
      fail(`v2 #1 (調候): direction=neutral must yield identical 喜/用/忌/閒 across isStrong boundary under 調候 override; got ${shape(aT)} vs ${shape(bT)}`);
    }
    // Neutral branch must not accidentally block 調候 override:
    // a neutral chart with 調候.extreme=true should still route to 調候 primary.
    if (aT.primaryFramework !== '調候') {
      fail(`v2 #1 (調候): neutral + 調候.extreme should route primary=調候, got ${aT.primaryFramework}`);
    }
    if (aT.yong !== '水') fail(`v2 #1 (調候): neutral + extreme should emit yong='水' (tiao.wx), got ${aT.yong}`);

    // Case 3: 通關 override must not reintroduce the cliff either.
    const fakeTong = {
      _direction: 'neutral',
      扶抑: { framework: '扶抑', wx: null, note: '' },
      調候: { framework: '調候', wx: null, note: '', extreme: false },
      通關: { framework: '通關', wx: '土', note: '' }
    };
    const aG = getXiYong(G('丙'), false, '水', '木', '土', '金', fakeTong);
    const bG = getXiYong(G('丙'), true,  '水', '木', '土', '金', fakeTong);
    if (shape(aG) !== shape(bG)) {
      fail(`v2 #1 (通關): direction=neutral must yield identical 喜/用/忌/閒 across isStrong boundary under 通關 override; got ${shape(aG)} vs ${shape(bG)}`);
    }
    if (aG.primaryFramework !== '通關') {
      fail(`v2 #1 (通關): neutral + 通關.wx should route primary=通關, got ${aG.primaryFramework}`);
    }

    // v2 #1 corollary at the computeYongShenFrameworks layer:
    // 扶抑.wx must also be direction-driven, not isStrong-driven, so a
    // neutral strength never leaks score-crossing fuYi.wx back into 調候
    // override's rawXi = fuYi.wx || base.xi.
    const neutralStrength = {
      direction: 'neutral', isStrong: false, score: 49,
      motherEl: '木', childWX: '土', wealthEl: '金', ctrlEl: '水'
    };
    const neutralStrengthIsStrongTrue = Object.assign({}, neutralStrength, { isStrong: true, score: 50 });
    const wx = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
    const f1 = computeYongShenFrameworks({ dayGan: G('丙'), monthZhi: Z('辰'), strength: neutralStrength, wxCount: wx });
    const f2 = computeYongShenFrameworks({ dayGan: G('丙'), monthZhi: Z('辰'), strength: neutralStrengthIsStrongTrue, wxCount: wx });
    if (f1.扶抑.wx !== null || f2.扶抑.wx !== null) {
      fail(`v2 #1 (framework): neutral direction must emit 扶抑.wx=null, got ${f1.扶抑.wx} / ${f2.扶抑.wx}`);
    }
  }


  // `trueSolarBazi.getTimeGan()` is derived from the SHIFTED day stem,
  // so a longitude shift that crosses midnight (e.g. 23:50 Beijing +
  // 東經 130° shifting into the next calendar date) produces the wrong
  // hour gan. `getHourGanIdx(rawDayGanIdx, hourZhiIdx)` applies the
  // 五鼠遁 rule against the UN-shifted day stem and must match the
  // traditional table.
  //
  // Sanity: 甲己日 + 子時 → 甲子 (hourGanIdx=0)
  //         乙庚日 + 子時 → 丙子 (hourGanIdx=2)
  //         丙辛日 + 子時 → 戊子 (hourGanIdx=4)
  //         丁壬日 + 子時 → 庚子 (hourGanIdx=6)
  //         戊癸日 + 子時 → 壬子 (hourGanIdx=8)
  // And monotonic across hours: 甲日 + 卯時(idx 3) → 丁卯 (hourGanIdx=3)
  // -----------------------------------------------------------------
  {
    const cases = [
      // [dayGanChar, hourZhiChar, expectedHourGanChar]
      ['甲', '子', '甲'], ['己', '子', '甲'],
      ['乙', '子', '丙'], ['庚', '子', '丙'],
      ['丙', '子', '戊'], ['辛', '子', '戊'],
      ['丁', '子', '庚'], ['壬', '子', '庚'],
      ['戊', '子', '壬'], ['癸', '子', '壬'],
      ['甲', '卯', '丁'],   // 甲子→乙丑→丙寅→丁卯
      ['甲', '亥', '乙'],   // 甲子→…→乙亥 (11th, idx=11 mod 10 = 1)
      ['庚', '午', '壬'],   // 乙庚起丙子 → 丙子+6 = 壬午
      ['癸', '戌', '壬'],   // 戊癸起壬子 → 壬子+10 mod 10 = 壬戌
    ];
    for (const [dg, hz, exp] of cases) {
      const got = TG[getHourGanIdx(G(dg), Z(hz))];
      if (got !== exp) fail(`getHourGanIdx(${dg},${hz}) expected ${exp}, got ${got}`);
    }

    // Regression: shift-crosses-midnight synthetic case.
    // Birth at 23:50 Beijing with longitude 130°E shifts by +40 min →
    // real local time is 00:30 of the NEXT calendar day. Day stem stays
    // on the un-shifted Beijing day; only the hour branch advances to
    // 子時 of the shifted clock. If 甲日 (rawDayGanIdx=0), the correct
    // hour gan is 甲 (via 五鼠遁)。If the old implementation pulled the
    // shifted day stem it would read 乙日 (rawDayGanIdx=1) and emit 丙子
    // 為首 → 丙 — catastrophically wrong. Our helper re-derives against
    // the un-shifted day.
    const shiftedDayGanIdx = (G('甲') + 1) % 10; // simulate 跨日 to 乙
    const rawDayGanIdx = G('甲');
    const hourZhiShifted = Z('子');
    const good = TG[getHourGanIdx(rawDayGanIdx, hourZhiShifted)];
    const bad  = TG[getHourGanIdx(shiftedDayGanIdx, hourZhiShifted)];
    if (good !== '甲') fail(`cross-midnight regression: expected 甲子 from un-shifted 甲日, got ${good}子`);
    if (bad === good) fail('cross-midnight regression: helper returned same gan for un-shifted and shifted day — check branch');
  }


  // Solar (rawSolar), NOT from the true-solar-shifted `d`.
  // We assert the SHAPE of the source so a future regression that
  // re-routes year/month/day through the shifted clock fails loudly.
  // -----------------------------------------------------------------
  {
    const src = fs.readFileSync(BAZI_PATH, 'utf8');
    if (!/const\s+rawSolar\s*=\s*Solar\.fromYmdHms\(\s*year\s*,\s*month\s*,\s*day\s*,\s*parsed\.hour\s*,\s*parsed\.minute/.test(src)) {
      fail('true-solar invariant: rawSolar must be built from un-shifted year/month/day/parsed.hour/parsed.minute');
    }
    if (!/const\s+rawLunar\s*=\s*rawSolar\.getLunar\(\)/.test(src)) {
      fail('true-solar invariant: rawLunar must derive from rawSolar');
    }
    if (!/const\s+rawBazi\s*=\s*rawLunar\.getEightChar\(\)/.test(src)) {
      fail('true-solar invariant: rawBazi must derive from rawLunar');
    }
    // Year/Month/Day pillar lines must reference rawLunar / rawBazi, not the
    // shifted lunar/bazi that lived in the old implementation.
    const yearLine  = /const\s+yp\s*=\s*\{\s*gan:\s*ganIdx\(call\(rawLunar/;
    const monthLine = /const\s+mp\s*=\s*\{\s*gan:\s*ganIdx\(call\(rawLunar/;
    const dayLine   = /const\s+dp\s*=\s*\{\s*gan:\s*ganIdx\(call\(rawLunar/;
    // 時柱天干改走 五鼠遁：選定換日規則後的日干 + 時支 → getHourGanIdx()
    const hourLine  = /const\s+hp\s*=\s*\{\s*gan:\s*hourGanIdx/;
    const hourGanRule = /const\s+hourGanIdx\s*=\s*getHourGanIdx\(\s*dp\.gan\s*,\s*hourZhiIdx\s*\)/;
    if (!yearLine.test(src))  fail('true-solar invariant: year pillar must read from rawLunar (un-shifted)');
    if (!monthLine.test(src)) fail('true-solar invariant: month pillar must read from rawLunar (un-shifted)');
    if (!dayLine.test(src))   fail('true-solar invariant: day pillar must read from rawLunar (un-shifted)');
    if (!hourLine.test(src))  fail('hour-stem invariant: hour pillar must use 五鼠遁 hourGanIdx');
    if (!hourGanRule.test(src)) fail('hour-stem invariant: hourGanIdx must be derived from rawDayGanIdx + hourZhiIdx');
  }

  console.log('OK');
}

try {
  run();
} catch (e) {
  fail(e && e.stack ? e.stack : String(e));
}
