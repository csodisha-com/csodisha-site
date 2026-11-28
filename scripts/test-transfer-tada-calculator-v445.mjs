import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const jsPath = 'assets/js/transfer-tada-calculator.js';
const src = fs.readFileSync(jsPath, 'utf8');

// 1. Strict CSP static checks
assert.ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\b/.test(src), 'Zero unsafe HTML sinks');
assert.ok(!/\.style\.[a-zA-Z]/.test(src), 'Zero .style.* mutations');
assert.ok(!/\bon(click|change|input|submit|keydown)\s*=/.test(src), 'Zero inline on* handlers');

// 2. Execute in clean sandbox and verify Orissa Service Code Joining Time & Odisha TA Rules
const sandbox = {
  window: {},
  document: { readyState: 'complete', addEventListener: () => {}, getElementById: () => null },
  console,
  Date,
  Math
};
vm.runInNewContext(src, sandbox, { filename: jsPath });

const api = sandbox.window.CSOTransferTadaCalculator;
assert.ok(api, 'window.CSOTransferTadaCalculator must be exposed');

// <= 1,000 km -> 10 days (12 days with >200km road), 80% CTG, L-9 tier (₹2,250 hotel, ₹900 food DA, 3,000 kg @ ₹25/km)
const r1 = api.calculateTransferAndTada({
  payLevel: 9,
  basicPay: 50000,
  transferType: 'outstation',
  distanceKm: 400,
  roadOver200Km: false,
  reliefDate: '2026-12-01',
  daysActuallyAvailed: 4,
  familyMembers: 3,
  farePerPerson: 1000,
  transitDays: 2
});
assert.equal(r1.joiningDays, 10, '<= 1,000 km grants 10 days joining time');
assert.equal(r1.unavailedElCredit, 6, '10 - 4 = 6 unavailed days credited to EL');
assert.equal(r1.ctgAmount, 40000, '80% CTG of 50,000 = 40,000');
assert.equal(r1.hotelPerDay, 2250, 'Level 9 hotel ceiling ₹2,250/day');
assert.equal(r1.foodDaPerDay, 900, 'Level 9 food DA ₹900/day');
assert.equal(r1.goodsTransportAmount, 10000, '400 km x ₹25/km = ₹10,000');
assert.equal(r1.totalTransferClaim, 40000 + 10000 + 3000 + 1800, 'Total transfer claim matches sum');

// 1,001 - 2,000 km -> 12 days (15 days with >200km road)
const r2 = api.calculateTransferAndTada({ payLevel: 14, basicPay: 144200, transferType: 'outstation', distanceKm: 1500, roadOver200Km: false });
assert.equal(r2.joiningDays, 12, '1,001–2,000 km grants 12 days joining time');
assert.equal(r2.hotelPerDay, 7500, 'Level 14 hotel ceiling ₹7,500/day');
assert.equal(r2.foodDaPerDay, 1200, 'Level 14 food DA ₹1,200/day');

const r2Road = api.calculateTransferAndTada({ payLevel: 12, basicPay: 80000, transferType: 'outstation', distanceKm: 1500, roadOver200Km: true });
assert.equal(r2Road.joiningDays, 15, '1,001–2,000 km with >200 km road grants 15 days');
assert.equal(r2Road.hotelPerDay, 4500, 'Level 12 hotel ceiling ₹4,500/day');
assert.equal(r2Road.foodDaPerDay, 1000, 'Level 12 food DA ₹1,000/day');

// > 2,000 km -> 15 days; L-1 tier (₹450 hotel, ₹500 DA); Same HQ -> 1 day & 0 CTG
const r3 = api.calculateTransferAndTada({ payLevel: 3, basicPay: 21700, transferType: 'outstation', distanceKm: 2200 });
assert.equal(r3.joiningDays, 15, '> 2,000 km grants 15 days');
assert.equal(r3.hotelPerDay, 450, 'Level 3 hotel ceiling ₹450/day');
assert.equal(r3.foodDaPerDay, 500, 'Level 3 food DA ₹500/day');

const rHq = api.calculateTransferAndTada({ payLevel: 7, basicPay: 30000, transferType: 'same-hq', distanceKm: 5 });
assert.equal(rHq.joiningDays, 1, 'Same HQ grants 1 day joining time');
assert.equal(rHq.ctgAmount, 0, 'Same HQ has 0 CTG');
assert.equal(rHq.hotelPerDay, 750, 'Level 7 hotel ceiling ₹750/day');
assert.equal(rHq.foodDaPerDay, 800, 'Level 7 food DA ₹800/day');

// 3. Verify mounts in career-paths/index.html & functions/_lib/informative-guides.js
for (const p of ['career-paths/index.html', 'functions/_lib/informative-guides.js']) {
  const txt = fs.readFileSync(p, 'utf8');
  assert.ok(txt.includes('id="cso-transfer-tada-calculator-root"'), `${p} mounts #cso-transfer-tada-calculator-root`);
  assert.ok(txt.includes('/assets/js/transfer-tada-calculator.js?v=20261127v449'), `${p} loads transfer-tada-calculator.js v446`);
}

// 4. Verify CSS & SW precache
const css = fs.readFileSync('assets/style.css', 'utf8');
assert.ok(css.includes('.cso-ttc-root') && css.includes('.cso-ttc-table'), 'CSS defines .cso-ttc-* styles');
const sw = fs.readFileSync('sw.js', 'utf8');
assert.ok(sw.includes("'/assets/js/transfer-tada-calculator.js?v=20261127v449'"), 'sw.js precaches transfer-tada-calculator.js');

console.log('PASS: v445 Odisha Govt Employee Transfer, Joining Time & TA/DA Rule Calculator suite verified.');
