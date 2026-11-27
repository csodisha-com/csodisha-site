/**
 * v405: Interactive Odisha Govt Pay Matrix & In-Hand Salary Estimator Verification Suite
 * Validates:
 *  1. Exact ORSP Level 1–17 Pay Matrix entry basic pays and gross-to-net arithmetic
 *     (Level 9 Cell 1 Basic ₹35,400 + 63% DA ₹22,302 + 16% HRA ₹5,664 = ₹63,366 Gross
 *      − ₹5,770 NPS − ₹0 PT = ₹57,596 Net In-Hand)
 *  2. Odisha HRA slabs (16%, 12%, 8%, 4%, 0%), NPS vs GPF toggle, ₹0 post-April 2026 PT default
 *     (plus legacy PT compare), and 5-year 3% increment progression
 *  3. Both career-paths/index.html and tools/index.html mount #cso-orsp-salary-estimator-root
 *     and load assets/js/orsp-salary-estimator.js with strict CSP compliance & zero hardcoded hex
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync('assets/js/orsp-salary-estimator.js', 'utf8');
assert.ok(!/\.innerHTML\b/.test(src), 'Zero .innerHTML in orsp-salary-estimator.js');
assert.ok(!/\.outerHTML\b/.test(src), 'Zero .outerHTML in orsp-salary-estimator.js');
assert.ok(!/insertAdjacentHTML/.test(src), 'Zero insertAdjacentHTML in orsp-salary-estimator.js');
assert.ok(!/\.style\./.test(src), 'Zero .style.* mutations in orsp-salary-estimator.js');

const sandbox = { globalThis: {} };
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
vm.runInNewContext(src, sandbox);
const est = sandbox.CSOOrspSalaryEstimator;
assert.ok(est && est.version === 'v405', 'CSOOrspSalaryEstimator v405 loaded');

// 1. Exact ORSP Level 1–17 entry basic pays
const expectedEntries = [
  [1, 16600], [2, 17200], [3, 18000], [4, 19900], [5, 21700],
  [6, 23600], [7, 25500], [8, 29200], [9, 35400], [10, 44900],
  [11, 47600], [12, 56100], [13, 67700], [14, 78800], [15, 123100],
  [16, 127100], [17, 135100]
];
assert.equal(est.ORSP_LEVELS.length, 17, 'Must include all 17 ORSP pay levels');
for (const [lv, basic] of expectedEntries) {
  assert.equal(est.getCellBasicPay(lv, 1), basic, `ORSP Level ${lv} Cell 1 must be ₹${basic}`);
}

// 1b. Exact Level 9 Cell 1 Gross-to-Net calculation
const l9 = est.calculateOrspSalary({ level: 9, cell: 1, daRate: 63, hraRate: 16, scheme: 'nps', legacyPt: false });
assert.equal(l9.basic, 35400);
assert.equal(l9.da, 22302);
assert.equal(l9.hra, 5664);
assert.equal(l9.gross_monthly, 63366);
assert.equal(l9.retirement_employee, 5770);
assert.equal(l9.nps_employer_govt, 8078);
assert.equal(l9.professional_tax, 0);
assert.equal(l9.total_deductions, 5770);
assert.equal(l9.net_monthly, 57596);
assert.equal(l9.annual_net, 57596 * 12);

// 2. Odisha HRA slabs (16%, 12%, 8%, 4%, 0%), NPS vs GPF, & legacy PT comparison
assert.deepEqual(Array.from(est.ODISHA_HRA_SLABS, (s) => s.rate), [16, 12, 8, 4, 0]);
const l9Rural = est.calculateOrspSalary({ level: 9, cell: 1, daRate: 63, hraRate: 4, scheme: 'nps' });
assert.equal(l9Rural.hra, 1416);

const l9Gpf = est.calculateOrspSalary({ level: 9, cell: 1, daRate: 63, hraRate: 16, scheme: 'gpf', gpfRate: 10 });
assert.equal(l9Gpf.retirement_employee, 3540);
assert.equal(l9Gpf.nps_employer_govt, 0);

const l9LegacyPt = est.calculateOrspSalary({ level: 9, cell: 1, daRate: 63, hraRate: 16, scheme: 'nps', legacyPt: true });
assert.equal(l9LegacyPt.professional_tax, 200);
assert.equal(l9LegacyPt.net_monthly, 57396);

const proj = est.computeFiveYearProjection({ level: 9, cell: 1, daRate: 63, hraRate: 16, scheme: 'nps' });
assert.equal(proj.length, 5);
assert.equal(proj[0].basic, 35400);
assert.ok(proj[1].basic > proj[0].basic && proj[4].net_monthly > proj[0].net_monthly, '5-year 3% increment projection increases steadily');

// 3. Mounts on career-paths/index.html & tools/index.html + strict CSP + CSS tokens
const cpHtml = fs.readFileSync('career-paths/index.html', 'utf8');
const toolsHtml = fs.readFileSync('tools/index.html', 'utf8');
const styleCss = fs.readFileSync('assets/style.css', 'utf8');

assert.ok(cpHtml.includes('id="cso-orsp-salary-estimator-root"'), 'career-paths/index.html mounts #cso-orsp-salary-estimator-root');
assert.ok(cpHtml.includes('/assets/js/orsp-salary-estimator.js?v=20261127v415'), 'career-paths/index.html loads orsp-salary-estimator.js');
assert.ok(toolsHtml.includes('id="cso-orsp-salary-estimator-root"'), 'tools/index.html mounts #cso-orsp-salary-estimator-root');
assert.ok(toolsHtml.includes('/assets/js/orsp-salary-estimator.js?v=20261127v415'), 'tools/index.html loads orsp-salary-estimator.js');

assert.ok(!/\sstyle\s*=\s*["']/i.test(cpHtml) && !/\son[a-z]+\s*=\s*["']/i.test(cpHtml), 'career-paths/index.html has zero inline styles/handlers');
assert.ok(!/\sstyle\s*=\s*["']/i.test(toolsHtml) && !/\son[a-z]+\s*=\s*["']/i.test(toolsHtml), 'tools/index.html has zero inline styles/handlers');

const v405Css = styleCss.slice(styleCss.indexOf('v405:'));
assert.ok(v405Css.includes('.cso-orsp-card') && v405Css.includes('min-height: 44px'), 'assets/style.css defines .cso-orsp-* styles with >=44px touch targets');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v405Css), 'Zero hardcoded hex colors in v405 CSS');

console.log('✅ v405 Interactive Odisha Govt Pay Matrix & In-Hand Salary Estimator test suite passed!');
