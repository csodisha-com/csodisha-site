/**
 * v397: Interactive Application Document Checklist & Age Eligibility Quick-Checker Verification Suite
 * Validates:
 *  1. Exact calendar age arithmetic (Years, Months, Days) across leap years (Feb 29) & month boundaries
 *  2. Odisha category age-relaxation offsets (UR +0, SEBC +3, SC/ST +5, Women +5, PwBD +10)
 *  3. Per-slug localStorage checklist persistence, global wallet pre-fill, custom docs & progress
 *  4. /jobs/<slug> detail mounts #cso-job-readiness-root & loads job-readiness-checker.js with strict CSP,
 *     while /jobs/ hub index omits #cso-job-readiness-root
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const jrSrc = fs.readFileSync('assets/js/job-readiness-checker.js', 'utf8');
const store = {};
const mockStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};
const sandbox = { localStorage: mockStorage, globalThis: {} };
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.runInNewContext(jrSrc, sandbox);
const jr = sandbox.CSOJobReadiness;
assert.ok(jr && jr.version === 'v397', 'CSOJobReadiness v397 loaded');

// 1. Exact calendar age across leap years & month boundaries
const exact1 = jr.calculateExactAge('1996-02-29', '2026-12-10');
assert.deepEqual({ ...exact1 }, { years: 30, months: 9, days: 11 });

const exact2 = jr.calculateExactAge('2000-01-31', '2026-03-01');
assert.deepEqual({ ...exact2 }, { years: 26, months: 1, days: 1 });

const exact3 = jr.calculateExactAge('2004-02-29', '2024-02-29');
assert.deepEqual({ ...exact3 }, { years: 20, months: 0, days: 0 });

assert.equal(jr.calculateExactAge('2027-01-01', '2026-12-10'), null, 'DOB after cutoff returns null');

// 2. Age eligibility with Odisha category relaxation
const eligUr = jr.evaluateAgeEligibility('1987-06-15', '2026-12-10', 21, 38, 0);
assert.equal(eligUr.status, 'over_max');
assert.equal(eligUr.eligible, false);
assert.ok(eligUr.label_en.includes('Over Max Age'));

const eligScSt = jr.evaluateAgeEligibility('1987-06-15', '2026-12-10', 21, 38, 5);
assert.equal(eligScSt.status, 'eligible');
assert.equal(eligScSt.eligible, true);
assert.equal(eligScSt.effective_max, 43);
assert.equal(eligScSt.label_en, '✅ Eligible on Cutoff Date');

const eligYoung = jr.evaluateAgeEligibility('2008-05-01', '2026-12-10', 21, 38, 0);
assert.equal(eligYoung.status, 'below_min');
assert.equal(eligYoung.eligible, false);
assert.ok(eligYoung.label_en.includes('Below Min Age'));

const eligNoLimit = jr.evaluateAgeEligibility('1995-08-15', '2026-12-10', null, null, 0);
assert.equal(eligNoLimit.status, 'calculated');
assert.equal(eligNoLimit.label_en, 'ℹ️ Exact Age Calculated');

// 3. Per-slug localStorage persistence + shared global wallet pre-fill
const p1 = jr.setDocumentChecked('mmu-bhawanipatna', 'aadhaar', true, false);
assert.equal(p1.ready, 1);
assert.equal(p1.total, jr.DEFAULT_DOCS.length);

// Another job automatically inherits 'aadhaar' from shared wallet
const otherState = jr.loadChecklistState('opsc-oas-2026');
const aadhaarInOther = otherState.items.find((d) => d.id === 'aadhaar');
assert.equal(aadhaarInOther.checked, true, 'Global wallet pre-fills Aadhaar on another job');

// Custom document on slug 1 does NOT leak to slug 2
const cust = jr.addCustomDocument('mmu-bhawanipatna', 'Experience Certificate');
assert.ok(cust && cust.id);
assert.equal(jr.loadChecklistState('mmu-bhawanipatna').items.length, jr.DEFAULT_DOCS.length + 1);
assert.equal(jr.loadChecklistState('opsc-oas-2026').items.length, jr.DEFAULT_DOCS.length);

const afterReset = jr.resetChecklist('mmu-bhawanipatna');
assert.equal(afterReset.ready, 0);

// 4. Mount & strict CSP checks
const jobsHtml = fs.readFileSync('jobs/index.html', 'utf8');
const jobsPortalJs = fs.readFileSync('assets/js/jobs-portal.js', 'utf8');
const styleCss = fs.readFileSync('assets/style.css', 'utf8');

assert.ok(jobsHtml.includes('/assets/js/job-readiness-checker.js'), 'jobs/index.html loads job-readiness-checker.js');
assert.ok(!jobsHtml.includes('id="cso-job-readiness-root"'), '/jobs/ hub static HTML omits detail readiness root');
assert.ok(jobsPortalJs.includes("readinessMount.id = 'cso-job-readiness-root'"), 'jobs-portal.js mounts #cso-job-readiness-root inside detail view');
assert.ok(jobsPortalJs.includes('CSOJobReadiness.mount'), 'jobs-portal.js invokes CSOJobReadiness.mount');
assert.ok(styleCss.includes('.cso-jr-card') && styleCss.includes('.cso-jr-progress'), 'assets/style.css defines .cso-jr-* 4-theme styles');
assert.ok(!/\.innerHTML\s*=/.test(jrSrc), 'Zero unsafe DOM markup injection in job-readiness-checker.js');
assert.ok(!/\.style\./.test(jrSrc), 'Zero inline .style.* mutations in job-readiness-checker.js');

console.log('✅ v397 Interactive Application Document Checklist & Age Eligibility Quick-Checker test suite passed!');
