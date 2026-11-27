#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

console.log('=== v416 Odisha Govt Leave, TA/DA & NPS vs. UPS Pension Quick-Reference Audit ===');

const srpSrc = read('assets/js/service-rules-pension-guide.js');
const cpHtml = read('career-paths/index.html');
const guidesSsr = read('functions/_lib/informative-guides.js');
const styleCss = read('assets/style.css');
const swJs = read('sw.js');
const opsJs = read('functions/_lib/ops-sentinel.js');

const sandbox = { window: {}, globalThis: {}, console };
vm.runInNewContext(srpSrc, sandbox);
const SRP = sandbox.window.CSOServiceRulesGuide;
assert.ok(SRP, 'window.CSOServiceRulesGuide must be exported');
assert.equal(SRP.version, 'v416');
assert.equal(SRP.PREFS_KEY, 'cso_service_rules_prefs_v1');

// 1. Verify all 6 Orissa Service Code leave rules & EL encashment arithmetic
assert.equal(SRP.LEAVE_RULES.length, 6, 'Must define all 6 core Orissa Service Code leave rules');
const lKeys = Array.from(SRP.LEAVE_RULES, l => l.key);
assert.deepEqual(lKeys, ['casual-leave', 'earned-leave', 'half-pay-leave', 'maternity-leave', 'paternity-leave', 'eol-study-leave']);
for (const l of SRP.LEAVE_RULES) {
  assert.ok(l.name_en && l.name_or && l.rule_en && l.rule_or, `${l.key} must have bilingual labels & rules`);
}

const elCalc = SRP.computeElEncashment(35400, 63, 350); // capped at 300 days
assert.equal(elCalc.cappedDays, 300, 'EL encashment must cap at 300 days');
assert.equal(elCalc.dailyRate, Math.round((35400 * 1.63) / 30));
assert.equal(elCalc.totalAmount, 300 * elCalc.dailyRate);

// 2. Verify TA/DA slabs & exact UPS assured pension arithmetic
assert.equal(SRP.TADA_SLABS.length, 4, 'Must define 4 ORSP TA/DA slabs');
assert.ok(SRP.getTaDaSlabForLevel(12).rail_air.includes('Air'), 'Level 12+ must include Air eligibility');
assert.equal(SRP.computeCompositeTransferGrant(50000), 40000, 'Composite Transfer Grant must be 80% of Basic Pay');

// UPS Full 25+ years
const upsFull = SRP.computeUpsVsNps(60000, 25, 63);
assert.equal(upsFull.ups.basicPension, 30000, '25+ years must grant 50% assured basic pension');
assert.equal(upsFull.ups.dearnessRelief, 18900, 'DR at 63% on ₹30,000 must be ₹18,900');
assert.equal(upsFull.ups.totalMonthly, 48900);
assert.equal(upsFull.ups.familyBasic, 18000, 'Family pension must be 60% of employee pension');
assert.equal(upsFull.ups.lumpSum, Math.round((60000 * 1.63 / 10) * 50), 'Lump-sum must be 1/10th per completed 6 months (50 periods)');

// UPS Pro-rata 15 years (180/300)
const upsPro = SRP.computeUpsVsNps(60000, 15, 63);
assert.equal(upsPro.ups.basicPension, 18000, '15 years (180/300) of ₹30,000 must equal ₹18,000');

// UPS Minimum ₹10,000 floor for >= 10 years low basic pay
const upsFloor = SRP.computeUpsVsNps(20000, 10, 63);
assert.equal(upsFloor.ups.basicPension, 10000, 'UPS must enforce ₹10,000/month minimum floor for >= 10 years');

// 3. Markup (/career-paths/ + /guides/ SSR), Strict CSP, 4-Theme CSS & v416 SW Cache Sync
assert.match(cpHtml, /id="cso-service-rules-guide-root"/, 'career-paths/index.html must mount #cso-service-rules-guide-root');
assert.match(cpHtml, /\/assets\/js\/service-rules-pension-guide\.js\?v=20261127v431/, 'career-paths/index.html must load service-rules-pension-guide.js?v=20261127v431');
assert.ok(guidesSsr.includes('id="cso-service-rules-guide-root"'), 'informative-guides.js (/guides/) must mount #cso-service-rules-guide-root');
assert.ok(guidesSsr.includes('/assets/js/service-rules-pension-guide.js?v=20261127v431'), 'informative-guides.js must load service-rules-pension-guide.js?v=20261127v431');
assert.ok(!/\sstyle="/i.test(cpHtml), 'career-paths/index.html must have zero inline style attributes');
assert.ok(!/\son[a-z]+="/i.test(cpHtml), 'career-paths/index.html must have zero inline on* handlers');
assert.ok(!srpSrc.includes('.innerHTML') && !srpSrc.includes('.outerHTML') && !srpSrc.includes('insertAdjacentHTML') && !srpSrc.includes('.style.'), 'service-rules-pension-guide.js must obey strict CSP');

const v416CssIdx = styleCss.indexOf('v416: Odisha Govt Leave, TA/DA & NPS vs. UPS Pension Quick-Reference');
assert.ok(v416CssIdx !== -1, 'assets/style.css must contain v416 Service Rules CSS block');
const v416Css = styleCss.slice(v416CssIdx);
assert.ok(v416Css.includes('.cso-srp-card') && v416Css.includes('var(--cso-surface-elevated)') && v416Css.includes('var(--cso-ink)'), 'v416 CSS must use semantic --cso-* tokens');
assert.ok(v416Css.includes('min-height: 44px'), 'v416 CSS must enforce >=44px touch targets');
assert.ok(v416Css.includes('prefers-reduced-motion: reduce'), 'v416 CSS must respect prefers-reduced-motion');
assert.ok(v416Css.includes('@media print'), 'v416 CSS must include @media print support');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v416Css), 'v416 CSS block must have zero hardcoded hex values');

assert.ok(swJs.includes("CACHE_NAME = 'cso-candidate-cache-v431'"), 'sw.js CACHE_NAME must be v416');
assert.ok(swJs.includes("'/assets/js/service-rules-pension-guide.js?v=20261127v431'"), 'sw.js must pre-cache service-rules-pension-guide.js');
assert.ok(opsJs.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v431'"), 'ops-sentinel.js ACTIVE_SW_CACHE_VERSION must be v416');

console.log('✅ v416 Odisha Govt Leave, TA/DA & NPS vs. UPS Pension Quick-Reference Audit PASSED');
