#!/usr/bin/env node
/**
 * v424 Automated Audit: Interactive Odisha Typing, Stenography &
 * Computer Skill Test Practice Arena (/tools/ & /mock-tests/)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
console.log('=== v424 Odisha Typing, Stenography & Computer Skill Test Practice Arena Audit ===');

const jsPath = path.join(ROOT, 'assets/js/typing-skill-arena.js');
const toolsHtmlPath = path.join(ROOT, 'tools/index.html');
const mtHtmlPath = path.join(ROOT, 'mock-tests/index.html');
const cssPath = path.join(ROOT, 'assets/style.css');
const swPath = path.join(ROOT, 'sw.js');
const opsPath = path.join(ROOT, 'functions/_lib/ops-sentinel.js');

const jsSrc = fs.readFileSync(jsPath, 'utf8');
const toolsHtml = fs.readFileSync(toolsHtmlPath, 'utf8');
const mtHtml = fs.readFileSync(mtHtmlPath, 'utf8');
const cssSrc = fs.readFileSync(cssPath, 'utf8');
const swSrc = fs.readFileSync(swPath, 'utf8');
const opsSrc = fs.readFileSync(opsPath, 'utf8');

// 1. Strict CSP checks
assert.ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML/.test(jsSrc), 'JS must not use innerHTML/outerHTML/insertAdjacentHTML');
assert.ok(!/\.style\.[a-zA-Z]/.test(jsSrc), 'JS must not mutate inline .style.*');
assert.ok(!/\son[a-z]+\s*=/i.test(toolsHtml) && !/\sstyle\s*=/i.test(toolsHtml), 'tools/index.html must be strict CSP compliant');
assert.ok(!/\son[a-z]+\s*=/i.test(mtHtml) && !/\sstyle\s*=/i.test(mtHtml), 'mock-tests/index.html must be strict CSP compliant');

// 2. Sandbox module check
const sandbox = { window: {}, globalThis: {} };
sandbox.globalThis = sandbox.window;
vm.runInNewContext(jsSrc, sandbox);

const api = sandbox.window.CSOTypingSkillArena;
assert.ok(api, 'window.CSOTypingSkillArena must be exported');
assert.equal(api.version, 'v424');
assert.equal(api.EXAM_PRESETS.length, 5, 'Must include all 5 verified Odisha typing exam presets');
assert.equal(api.PASSAGES.en.length, 6, 'Must include 6 curated English passages');
assert.equal(api.PASSAGES.or.length, 4, 'Must include 4 curated Odia passages');

for (const p of [...api.PASSAGES.en, ...api.PASSAGES.or]) {
  assert.ok(p.id && p.title && p.text.trim().length > 80, `Passage must be non-empty: ${p.id}`);
}

// 3. Test evaluateTypingSession math (English 40 WPM Qualified, High Court 100-Mark Scale, Odia 20 WPM)
const target200 = 'a'.repeat(200); // 40 words
const resEnPass = api.evaluateTypingSession({
  targetText: target200,
  typedText: target200,
  elapsedSeconds: 60,
  targetWpm: 40,
  maxErrorPct: 5,
  courtScale100: true
});
assert.equal(resEnPass.grossWpm, 40);
assert.equal(resEnPass.netWpm, 40);
assert.equal(resEnPass.accuracyPct, 100);
assert.equal(resEnPass.kdph, 12000);
assert.equal(resEnPass.courtScore, 100);
assert.equal(resEnPass.courtDisqualified, false);
assert.equal(resEnPass.qualified, true);

// High Court >20 mistakes disqualification check
const typed21Err = 'b'.repeat(21) + 'a'.repeat(179);
const resCourtDisq = api.evaluateTypingSession({
  targetText: target200,
  typedText: typed21Err,
  elapsedSeconds: 60,
  targetWpm: 40,
  maxErrorPct: 5,
  courtScale100: true
});
assert.equal(resCourtDisq.errors, 21);
assert.equal(resCourtDisq.courtDisqualified, true);
assert.equal(resCourtDisq.qualified, false);

// Odia 20 WPM check (100 chars in 60s = 20 WPM)
const odiaTarget = 'ଓ'.repeat(100);
const resOdiaPass = api.evaluateTypingSession({
  targetText: odiaTarget,
  typedText: odiaTarget,
  elapsedSeconds: 60,
  targetWpm: 20,
  maxErrorPct: 5,
  courtScale100: false
});
assert.equal(resOdiaPass.grossWpm, 20);
assert.equal(resOdiaPass.netWpm, 20);
assert.equal(resOdiaPass.qualified, true);

// Needs practice check (slow speed)
const resSlow = api.evaluateTypingSession({
  targetText: target200,
  typedText: 'a'.repeat(75), // 15 WPM
  elapsedSeconds: 60,
  targetWpm: 30,
  maxErrorPct: 5,
  courtScale100: false
});
assert.equal(resSlow.qualified, false);
assert.equal(resSlow.gapWpm, 15);

// 4. Mounts on /tools/ & /mock-tests/, SW & Ops-Sentinel sync
assert.ok(toolsHtml.includes('id="cso-typing-skill-arena-root"'), 'tools/index.html must mount #cso-typing-skill-arena-root');
assert.ok(toolsHtml.includes('/assets/js/typing-skill-arena.js?v=20261128v452'), 'tools/index.html must load typing-skill-arena.js?v=20261128v452');
assert.ok(mtHtml.includes('id="cso-typing-skill-arena-root"'), 'mock-tests/index.html must mount #cso-typing-skill-arena-root');
assert.ok(mtHtml.includes('/assets/js/typing-skill-arena.js?v=20261128v452'), 'mock-tests/index.html must load typing-skill-arena.js?v=20261128v452');
assert.ok(swSrc.includes("const CACHE_NAME = 'cso-candidate-cache-v452'"), 'sw.js must bump CACHE_NAME to v424');
assert.ok(swSrc.includes("'/assets/js/typing-skill-arena.js?v=20261128v452'"), 'sw.js must precache typing-skill-arena.js');
assert.ok(opsSrc.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v452'"), 'ops-sentinel.js must bump ACTIVE_SW_CACHE_VERSION to v424');

// 5. CSS semantic 4-theme tokens check
const tsaIdx = cssSrc.indexOf('/* ===== v424:');
assert.ok(tsaIdx !== -1, 'assets/style.css must contain v424 .cso-tsa-* CSS block');
const tsaBlock = cssSrc.slice(tsaIdx);
assert.ok(tsaBlock.includes('.cso-tsa-wrap') && tsaBlock.includes('var(--cso-'), 'CSS must style .cso-tsa-* with var(--cso-*) tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(tsaBlock), 'v424 .cso-tsa-* CSS block must have zero hardcoded hex colors');
assert.ok(tsaBlock.includes('prefers-reduced-motion'), 'v424 CSS must include prefers-reduced-motion guard');
assert.ok(tsaBlock.includes('@media print'), 'v424 CSS must include @media print rules');

console.log('✅ v424 Odisha Typing, Stenography & Computer Skill Test Practice Arena Audit PASSED');
