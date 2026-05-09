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
    countWuXing, judgeStrength, getShiShen, getShiShenForHiddenStems
  } = bazi;

  if (typeof countWuXing !== 'function') fail('countWuXing not exported');
  if (typeof judgeStrength !== 'function') fail('judgeStrength not exported');
  if (typeof getShiShen !== 'function') fail('getShiShen not exported');
  if (typeof getShiShenForHiddenStems !== 'function') fail('getShiShenForHiddenStems not exported');

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
  // True-solar-time scope invariant (source-level check).
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
