#!/usr/bin/env node

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const CONSTANTS_PATH = path.join(ROOT, 'public/js/ziwei/constants.js');
const ALGORITHM_PATH = path.join(ROOT, 'public/js/ziwei/algorithm.js');

function fail(msg) {
  console.error('FAIL:', msg);
  process.exit(1);
}

function assert(condition, msg) {
  if (!condition) fail(msg);
}

function assertInRange(label, value, min, max) {
  assert(Number.isInteger(value) && value >= min && value <= max, `${label} expected integer in [${min}, ${max}], got ${value}`);
}

function loadZiweiCore() {
  const sandbox = {
    module: { exports: {} },
    console: {
      log() {},
      warn() {},
      error() {},
    },
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  vm.runInContext(fs.readFileSync(CONSTANTS_PATH, 'utf8'), sandbox, { filename: 'public/js/ziwei/constants.js' });
  vm.runInContext(fs.readFileSync(ALGORITHM_PATH, 'utf8'), sandbox, { filename: 'public/js/ziwei/algorithm.js' });

  return sandbox.window;
}

function assertPalaceShape(palace, index) {
  assert(palace && typeof palace === 'object', `palace ${index} must be object`);
  assertInRange(`palace ${index}.branch`, palace.branch, 0, 11);
  assertInRange(`palace ${index}.stem`, palace.stem, 0, 9);
  assert(typeof palace.name === 'string' && palace.name.length > 0, `palace ${index}.name must be non-empty string`);
  assert(Array.isArray(palace.stars), `palace ${index}.stars must be array`);
  assert(typeof palace.isEmpty === 'boolean', `palace ${index}.isEmpty must be boolean`);
  assert(typeof palace.isMingGong === 'boolean', `palace ${index}.isMingGong must be boolean`);
  assert(typeof palace.isShenGong === 'boolean', `palace ${index}.isShenGong must be boolean`);
  assertInRange(`palace ${index}.oppositeBranch`, palace.oppositeBranch, 0, 11);
}

function assertChartShape(chart, label) {
  assert(chart && typeof chart === 'object', `${label} must return chart object`);
  assert(chart.birthInfo && typeof chart.birthInfo === 'object', `${label}.birthInfo missing`);
  assert(chart.lunarInfo && typeof chart.lunarInfo === 'object', `${label}.lunarInfo missing`);
  assertInRange(`${label}.mingGongBranch`, chart.mingGongBranch, 0, 11);
  assertInRange(`${label}.shenGongBranch`, chart.shenGongBranch, 0, 11);
  assertInRange(`${label}.ziweiPos`, chart.ziweiPos, 0, 11);
  assert([2, 3, 4, 5, 6].includes(chart.wuxingJu), `${label}.wuxingJu invalid: ${chart.wuxingJu}`);
  assert(typeof chart.wuxingJuName === 'string' && chart.wuxingJuName.length > 0, `${label}.wuxingJuName missing`);
  assert(Array.isArray(chart.palaces) && chart.palaces.length === 12, `${label}.palaces expected 12 palaces`);
  chart.palaces.forEach(assertPalaceShape);
  assert(Array.isArray(chart.daXians), `${label}.daXians must be array`);
  assert(typeof chart.currentAge === 'number' && chart.currentAge >= 0, `${label}.currentAge invalid`);
  assert(Number.isInteger(chart.currentDaXianIndex), `${label}.currentDaXianIndex must be integer`);
}

function run() {
  const win = loadZiweiCore();
  const constants = win.ZIWEI_CONSTANTS;
  const algorithm = win.ZIWEI_ALGORITHM;

  assert(constants && typeof constants === 'object', 'ZIWEI_CONSTANTS not exported');
  assert(algorithm && typeof algorithm === 'object', 'ZIWEI_ALGORITHM not exported');
  assert(Array.isArray(constants.PALACE_NAMES) && constants.PALACE_NAMES.length === 12, 'PALACE_NAMES expected 12 entries');
  assert(typeof algorithm.generateZiweiChart === 'function', 'generateZiweiChart not exported');
  assert(typeof algorithm.generateSimpleZiweiChart === 'function', 'generateSimpleZiweiChart not exported');
  assert(algorithm.mapBrightness('庙') === 'bright', 'mapBrightness should map 庙 to bright');
  assert(algorithm.mapBrightness('陷') === 'dim', 'mapBrightness should map 陷 to dim');
  assert(algorithm.parseWuxingJu('水二局') === 2, 'parseWuxingJu should parse 水二局');
  assert(algorithm.parseWuxingJu('火六局') === 6, 'parseWuxingJu should parse 火六局');

  const samples = [
    { year: 1990, month: 1, day: 27, hour: 0, gender: 'male', name: 'sample-a' },
    { year: 1988, month: 8, day: 8, hour: 6, gender: 'female', name: 'sample-b' },
    { year: 2001, month: 12, day: 22, hour: 11, gender: 'male', name: 'sample-c' },
  ];

  samples.forEach((sample, index) => {
    const simpleChart = algorithm.generateSimpleZiweiChart(sample);
    assertChartShape(simpleChart, `simple sample ${index}`);
    assert(simpleChart.isSimple === true, `simple sample ${index}.isSimple expected true`);

    const fallbackChart = algorithm.generateZiweiChart(sample);
    assertChartShape(fallbackChart, `fallback sample ${index}`);
    assert(typeof fallbackChart.error === 'string' && fallbackChart.error.includes('iztro'), `fallback sample ${index}.error should mention iztro`);
  });

  console.log('OK: Ziwei core verification passed');
}

run();
