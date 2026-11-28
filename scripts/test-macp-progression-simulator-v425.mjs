#!/usr/bin/env node
/**
 * v425 Automated Audit: Interactive Odisha Govt Employee Promotion,
 * MACP (10/20/30-Yr) & Pay Matrix Progression Simulator (/career-paths/)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
console.log('=== v425 Odisha Govt Promotion, MACP & Pay Matrix Progression Simulator Audit ===');

const jsPath = path.join(ROOT, 'assets/js/macp-progression-simulator.js');
const htmlPath = path.join(ROOT, 'career-paths/index.html');
const cssPath = path.join(ROOT, 'assets/style.css');
const swPath = path.join(ROOT, 'sw.js');
const opsPath = path.join(ROOT, 'functions/_lib/ops-sentinel.js');

const jsSrc = fs.readFileSync(jsPath, 'utf8');
const htmlSrc = fs.readFileSync(htmlPath, 'utf8');
const cssSrc = fs.readFileSync(cssPath, 'utf8');
const swSrc = fs.readFileSync(swPath, 'utf8');
const opsSrc = fs.readFileSync(opsPath, 'utf8');

// 1. Strict CSP checks
assert.ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML/.test(jsSrc), 'JS must not use innerHTML/outerHTML/insertAdjacentHTML');
assert.ok(!/\.style\.[a-zA-Z]/.test(jsSrc), 'JS must not mutate inline .style.*');
assert.ok(!/\son[a-z]+\s*=/i.test(htmlSrc) && !/\sstyle\s*=/i.test(htmlSrc), 'career-paths/index.html must be strict CSP compliant');

// 2. Sandbox module check
const sandbox = { window: {}, globalThis: {} };
sandbox.globalThis = sandbox.window;
vm.runInNewContext(jsSrc, sandbox);

const api = sandbox.window.CSOMacpProgressionSimulator;
assert.ok(api, 'window.CSOMacpProgressionSimulator must be exported');
assert.equal(api.version, 'v425');
assert.equal(api.CADRE_TRACKS.length, 5, 'Must include all 5 Odisha cadre tracks');

// 3. Verify ORSP pay fixation (notional +1 cell -> equal or next higher cell in target level)
const fixedAso = api.fixPayOnPromotion(9, 8, 10);
assert.equal(fixedAso.level, 10);
assert.ok(fixedAso.basicPay >= fixedAso.notionalPay, 'Fixed pay in target level must be >= notional pay in old level');

// 4. Verify monotonic growth, DA/HRA, & UPS 50% pension across all 5 cadre tracks
for (const tr of api.CADRE_TRACKS) {
  const simMacp = api.simulateCareerProgression({ trackKey: tr.key, scenario: 'macp', serviceYears: 30, daPct: 63, hraPct: 20 });
  assert.equal(simMacp.rows.length, 30, `30-year simulation must produce 30 rows for ${tr.key}`);
  for (let i = 1; i < simMacp.rows.length; i++) {
    assert.ok(simMacp.rows[i].basicPay >= simMacp.rows[i - 1].basicPay, `Basic pay must be monotonically non-decreasing in ${tr.key}`);
    assert.ok(simMacp.rows[i].grossPay >= simMacp.rows[i - 1].grossPay, `Gross pay must be monotonically non-decreasing in ${tr.key}`);
  }
  assert.equal(simMacp.rows[9].level, tr.stages[1].level, `Year 10 MACP must upgrade to stage 2 level for ${tr.key}`);
  assert.equal(simMacp.rows[19].level, tr.stages[2].level, `Year 20 MACP must upgrade to stage 3 level for ${tr.key}`);
  assert.equal(simMacp.rows[29].level, tr.stages[3].level, `Year 30 MACP must upgrade to stage 4 level for ${tr.key}`);
  assert.equal(simMacp.upsPension.basicPension, Math.round(simMacp.milestones.retirement.basicPay * 0.5), 'UPS basic pension must be 50% of final basic');

  const simFast = api.simulateCareerProgression({ trackKey: tr.key, scenario: 'fast-track', serviceYears: 30, daPct: 63, hraPct: 10 });
  assert.equal(simFast.rows[6].level, tr.stages[1].level, `Fast-track Yr 7 must upgrade to stage 2 level for ${tr.key}`);
  assert.equal(simFast.rows[14].level, tr.stages[2].level, `Fast-track Yr 15 must upgrade to stage 3 level for ${tr.key}`);
  assert.equal(simFast.rows[23].level, tr.stages[3].level, `Fast-track Yr 24 must upgrade to stage 4 level for ${tr.key}`);
}

// 5. HTML mount, SW & Ops-Sentinel sync
assert.ok(htmlSrc.includes('id="cso-macp-progression-simulator-root"'), 'career-paths/index.html must mount #cso-macp-progression-simulator-root');
assert.ok(htmlSrc.includes('/assets/js/macp-progression-simulator.js?v=20261128v451'), 'career-paths/index.html must load macp-progression-simulator.js?v=20261128v451');
assert.ok(swSrc.includes("const CACHE_NAME = 'cso-candidate-cache-v451'"), 'sw.js must bump CACHE_NAME to v425');
assert.ok(swSrc.includes("'/assets/js/macp-progression-simulator.js?v=20261128v451'"), 'sw.js must precache macp-progression-simulator.js');
assert.ok(opsSrc.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v451'"), 'ops-sentinel.js must bump ACTIVE_SW_CACHE_VERSION to v425');

// 6. CSS 4-theme semantic tokens check
const mpsIdx = cssSrc.indexOf('/* ===== v425:');
assert.ok(mpsIdx !== -1, 'assets/style.css must contain v425 .cso-mps-* CSS block');
const mpsBlock = cssSrc.slice(mpsIdx);
assert.ok(mpsBlock.includes('.cso-mps-wrap') && mpsBlock.includes('var(--cso-'), 'CSS must style .cso-mps-* with var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(mpsBlock), 'v425 .cso-mps-* CSS block must have zero hardcoded hex colors');
assert.ok(mpsBlock.includes('prefers-reduced-motion'), 'v425 CSS must include prefers-reduced-motion guard');
assert.ok(mpsBlock.includes('@media print'), 'v425 CSS must include @media print rules');

console.log('✅ v425 Odisha Govt Promotion, MACP & Pay Matrix Progression Simulator Audit PASSED');
