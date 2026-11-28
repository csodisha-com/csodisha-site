import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const jsPath = 'assets/js/pay-arrear-calculator.js';
const src = fs.readFileSync(jsPath, 'utf8');

// 1. Strict CSP static checks
assert.ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\b/.test(src), 'Zero unsafe HTML sinks');
assert.ok(!/\.style\.[a-zA-Z]/.test(src), 'Zero .style.* mutations');
assert.ok(!/\bon(click|change|input|submit|keydown)\s*=/.test(src), 'Zero inline on* handlers');

// 2. Execute in clean sandbox and verify arrear math
const sandbox = {
  window: {},
  document: {
    readyState: 'complete',
    addEventListener: () => {},
    getElementById: () => null
  },
  console,
  Date,
  Math
};
vm.runInNewContext(src, sandbox, { filename: jsPath });

const api = sandbox.window.CSOPayArrearCalculator;
assert.ok(api, 'window.CSOPayArrearCalculator must be exposed');
assert.ok(Array.isArray(api.ARREAR_PRESETS) && api.ARREAR_PRESETS.length >= 4, 'At least 4 verified DA/Increment presets');

// Check inclusive month listing
const months = Array.from(api.listMonthsInclusive('2026-07', '2026-10'));
assert.deepEqual(months, ['2026-07', '2026-08', '2026-09', '2026-10']);

// Test DA Hike Arrear: Basic 50,000, Old DA 60% -> New DA 63% (+3% = 1,500/mo) for 4 months, NPS 10%
const daRes = api.calculateOdishaPayArrears({
  oldBasic: 50000,
  newBasic: 50000,
  oldDaRate: 60,
  newDaRate: 63,
  hraRate: 8,
  startMonth: '2026-07',
  endMonth: '2026-10',
  pensionTrack: 'nps'
});
assert.equal(daRes.monthCount, 4);
assert.equal(daRes.totals.grossArrear, 6000, '4 months x 1500 DA diff = 6000 gross');
assert.equal(daRes.totals.empPensionDed, 600, '10% employee NPS on 6000 = 600');
assert.equal(daRes.totals.govt80CCD2, 840, '14% govt NPS on 6000 = 840');
assert.equal(daRes.totals.netCashPayable, 5400, '6000 - 600 NPS = 5400 net cash');

// Test Delayed Increment / MACP Arrear with OPS (0 NPS deduction)
const incRes = api.calculateOdishaPayArrears({
  oldBasic: 44900,
  newBasic: 46200,
  oldDaRate: 60,
  newDaRate: 60,
  hraRate: 16,
  startMonth: '2026-01',
  endMonth: '2026-03',
  pensionTrack: 'ops'
});
assert.equal(incRes.monthCount, 3);
// Basic diff = 1300; DA diff = 1300*0.60 = 780; HRA diff = 1300*0.16 = 208 -> 2288/mo -> 6864 for 3 months
assert.equal(incRes.totals.grossArrear, 6864, '3 months increment arrear including Basic+DA+HRA');
assert.equal(incRes.totals.empPensionDed, 0, 'OPS has 0 NPS deduction');
assert.equal(incRes.totals.netCashPayable, 6864);

// Test ORSP 3% cell rounding to nearest 100
assert.equal(api.nextOrspCell(44900), 46200);

// 3. Verify HTML mount in career-paths/index.html
const html = fs.readFileSync('career-paths/index.html', 'utf8');
assert.ok(html.includes('id="cso-pay-arrear-calculator-root"'), 'career-paths/index.html mounts #cso-pay-arrear-calculator-root');
assert.ok(html.includes('/assets/js/pay-arrear-calculator.js?v=20261128v455'), 'career-paths/index.html loads pay-arrear-calculator.js v443');

// 4. Verify CSS & Service Worker precache
const css = fs.readFileSync('assets/style.css', 'utf8');
assert.ok(css.includes('.cso-pac-root') && css.includes('.cso-pac-table'), 'CSS defines .cso-pac-* styles');

const sw = fs.readFileSync('sw.js', 'utf8');
assert.ok(sw.includes("'/assets/js/pay-arrear-calculator.js?v=20261128v455'"), 'sw.js precaches pay-arrear-calculator.js');

console.log('PASS: v442 Odisha Govt Pay Arrear, DA Hike & Back-Pay Calculator suite verified.');
