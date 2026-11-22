// Verification for v196 Odisha Candidate Utility Calculators (/tools/)
// Run: node scripts/test-candidate-calculators-v196.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const calc = require(path.join(ROOT, 'tools', 'assets', 'tools.js'));

// 1. Verify Odisha Age & Category Relaxation rules (DD/MM/YYYY)
const urOk = calc.calculateOdishaExamAge({
  dob: '15/05/1995',
  cutoff: '01/01/2026',
  minAge: 21,
  maxAge: 38,
  category: 'UR'
});
assert.equal(urOk.valid, true);
assert.equal(urOk.years, 30);
assert.equal(urOk.months, 7);
assert.equal(urOk.days, 17);
assert.equal(urOk.effectiveMaxAge, 38);
assert.equal(urOk.eligible, true);
assert.equal(urOk.status, 'Eligible');

const sebc = calc.calculateOdishaExamAge({
  dob: '15/05/1984',
  cutoff: '01/01/2026',
  minAge: 21,
  maxAge: 38,
  category: 'SEBC'
});
assert.equal(sebc.relaxation, 5);
assert.equal(sebc.effectiveMaxAge, 43);
assert.equal(sebc.eligible, true);

const scst = calc.calculateOdishaExamAge({
  dob: '15/05/1984',
  cutoff: '01/01/2026',
  minAge: 21,
  maxAge: 38,
  category: 'SC / ST'
});
assert.equal(scst.relaxation, 5);
assert.equal(scst.effectiveMaxAge, 43);

const women = calc.calculateOdishaExamAge({
  dob: '15/05/1984',
  cutoff: '01/01/2026',
  minAge: 21,
  maxAge: 38,
  category: 'Women'
});
assert.equal(women.relaxation, 5);
assert.ok(women.nonCumulativeNote.includes('non-cumulative'));

const pwdGen = calc.calculateOdishaExamAge({
  dob: '15/05/1980',
  cutoff: '01/01/2026',
  minAge: 21,
  maxAge: 38,
  category: 'PwD (General)'
});
assert.equal(pwdGen.relaxation, 10);
assert.equal(pwdGen.effectiveMaxAge, 48);

const pwdScst = calc.calculateOdishaExamAge({
  dob: '15/05/1975',
  cutoff: '01/01/2026',
  minAge: 21,
  maxAge: 38,
  category: 'PwD (SC/ST/SEBC)'
});
assert.equal(pwdScst.relaxation, 15);
assert.equal(pwdScst.effectiveMaxAge, 53);

const exSvc = calc.calculateOdishaExamAge({
  dob: '15/05/1980',
  cutoff: '01/01/2026',
  minAge: 21,
  maxAge: 38,
  category: 'Ex-Serviceman',
  serviceYears: 10
});
assert.equal(exSvc.relaxation, 13);
assert.equal(exSvc.effectiveMaxAge, 51);

const underAge = calc.calculateOdishaExamAge({
  dob: '15/05/2010',
  cutoff: '01/01/2026',
  minAge: 21,
  maxAge: 38,
  category: 'UR'
});
assert.equal(underAge.eligible, false);
assert.equal(underAge.status, 'Under-Age');

// 2. Verify CBT Negative-Marking math (1/3, 1/4, 0)
const opscCbt = calc.calculateCbtScore({ total: 100, attempted: 80, correct: 65, posMark: 2, negMark: 0.66 });
assert.equal(opscCbt.wrong, 15);
assert.equal(opscCbt.marksLost, 9.9);
assert.equal(opscCbt.netScore, 120.1);
assert.equal(opscCbt.accuracyPct, 81.25);

const policeCbt = calc.calculateCbtScore({ total: 100, attempted: 80, correct: 60, posMark: 1, negMark: 0.25 });
assert.equal(policeCbt.wrong, 20);
assert.equal(policeCbt.marksLost, 5);
assert.equal(policeCbt.netScore, 55);

const otetCbt = calc.calculateCbtScore({ total: 150, attempted: 150, correct: 120, posMark: 1, negMark: 0 });
assert.equal(otetCbt.marksLost, 0);
assert.equal(otetCbt.netScore, 120);

// 3. Verify tools/index.html, tools.js, tools.css & 100% CSP compliance
const html = fs.readFileSync(path.join(ROOT, 'tools', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'tools', 'assets', 'tools.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'tools', 'assets', 'tools.css'), 'utf8');

assert.ok(html.includes('/tools/assets/tools.css?v=20261122v196'));
assert.ok(html.includes('/tools/assets/tools.js?v=20261122v196'));
assert.ok(html.includes('id="age-board-preset"'));
assert.ok(html.includes('id="cbt-calc-form"'));
assert.ok(!/<style\b/i.test(html), 'No <style> in tools/index.html');
assert.ok(!/\sstyle\s*=/i.test(html), 'No style= in tools/index.html');
assert.ok(!/\sonclick\s*=/i.test(html), 'No onclick= in tools/index.html');
const noExt = html.replace(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi, '');
const noJsonLd = noExt.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');
assert.ok(!/<script\b/i.test(noJsonLd), 'No executable inline <script> in tools/index.html');
assert.ok(!/\.innerHTML\b/.test(js), 'No .innerHTML in tools/assets/tools.js');
assert.ok(css.includes('min-height: 44px'), '44px touch targets in tools.css');

console.log('PASS: Odisha Age Relaxation, CBT Negative-Marking Estimator & strict CSP verified (v196)');
