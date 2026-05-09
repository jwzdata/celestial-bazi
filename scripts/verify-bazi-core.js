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
  const dataSrc = fs.readFileSync(DATA_PATH, 'utf8');
  const baziSrc = fs.readFileSync(BAZI_PATH, 'utf8');

  // Shared sandbox so `const` declared in data.js is visible to bazi.js
  // (mirrors the browser's shared global scope across <script> tags).
  const sandbox = {
    module: { exports: {} },
    console,
    // Stub `window` so the window.* attach block is a no-op under Node.
    // We intentionally leave `Solar` undefined; nothing invoked by this
    // self-check calls getPillarsUsingLunar, which is the only path that
    // touches the CDN-provided Solar global.
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  // data.js first so its consts exist when bazi.js runs.
  vm.runInContext(dataSrc, sandbox, { filename: 'public/js/data.js' });

  const sharedModule = { exports: {} };
  sandbox.module = sharedModule;
  vm.runInContext(baziSrc, sandbox, { filename: 'public/js/bazi.js' });

  return sharedModule.exports;
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
    computeChartShenSha, computeYongShenFrameworks, detectBranchInteractions
  } = bazi;

  if (typeof countWuXing !== 'function') fail('countWuXing not exported');
  if (typeof judgeStrength !== 'function') fail('judgeStrength not exported');
  if (typeof getShiShen !== 'function') fail('getShiShen not exported');
  if (typeof getShiShenForHiddenStems !== 'function') fail('getShiShenForHiddenStems not exported');
  if (typeof computeChartShenSha !== 'function') fail('computeChartShenSha not exported');
  if (typeof computeYongShenFrameworks !== 'function') fail('computeYongShenFrameworks not exported');
  if (typeof detectBranchInteractions !== 'function') fail('detectBranchInteractions not exported');

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
    if (!ss.驛馬 || !ss.驛馬.includes(1)) {
      fail(`年支子 驛馬 should land on 寅 (month pillar), got ${JSON.stringify(ss.驛馬)}`);
    }
    // 羊刃 甲刃卯 – not in chart, so bucket should be absent or empty
    if (ss.羊刃 && ss.羊刃.length) {
      fail(`羊刃 should not appear (no 卯), got ${JSON.stringify(ss.羊刃)}`);
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
  // The fix is that year/month/day pillars come from the raw Beijing
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
    const hourLine  = /const\s+hp\s*=\s*\{\s*gan:\s*ganIdx\(trueSolarBazi\.getTimeGan/;
    if (!yearLine.test(src))  fail('true-solar invariant: year pillar must read from rawLunar (un-shifted)');
    if (!monthLine.test(src)) fail('true-solar invariant: month pillar must read from rawLunar (un-shifted)');
    if (!dayLine.test(src))   fail('true-solar invariant: day pillar must read from rawLunar (un-shifted)');
    if (!hourLine.test(src))  fail('true-solar invariant: hour pillar must read from trueSolarBazi (shifted)');
  }

  console.log('OK');
}

try {
  run();
} catch (e) {
  fail(e && e.stack ? e.stack : String(e));
}
