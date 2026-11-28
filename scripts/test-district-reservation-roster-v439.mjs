#!/usr/bin/env node
/**
 * v439 Test Suite — Interactive Odisha District & Block-Level
 * Reservation Roster & Vacancy Distribution Explorer (/jobs/ & /odisha-special/)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const jsCode = read('assets/js/district-reservation-roster.js');
const sandbox = { window: {}, globalThis: {}, console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(jsCode, sandbox);
const api = sandbox.window.CSODistrictReservationRoster;

assert.ok(api, 'window.CSODistrictReservationRoster must be exposed');
assert.equal(api.VERSION, 'v439');
assert.equal(api.ROOT_ID, 'cso-district-reservation-root');
assert.equal(api.PREFS_KEY, 'cso_district_roster_prefs_v1');

// 1. Verify all 30 Odisha districts and exact 314 block total
const dists = Array.from(api.DISTRICTS);
assert.equal(dists.length, 30, 'Must cover all 30 Odisha districts');
const totalBlocks = dists.reduce((sum, d) => sum + d.blocks, 0);
assert.equal(totalBlocks, 314, 'Total Odisha blocks across 30 districts must equal exactly 314');
const fullTsp = dists.filter((d) => d.tsp === 'full');
assert.equal(fullTsp.length, 9, 'Must tag all 9 Fully Scheduled / TSP districts');

// 2. Verify exact sum conservation across standard ORV Act vertical quotas (UR 50% / ST 22.5% / SC 16.25% / SEBC 11.25%)
for (const n of [1, 17, 80, 120, 243, 1000]) {
  const split = api.computeOdishaReservationSplit({ totalPosts: n, district: 'khordha', useScheduledAreaNorms: false });
  const sum = split.vertical.ur + split.vertical.st + split.vertical.sc + split.vertical.sebc;
  assert.equal(sum, n, `Vertical seats must sum identically to ${n}`);
}

const std400 = api.computeOdishaReservationSplit({ totalPosts: 400, district: 'cuttack', useScheduledAreaNorms: false });
assert.equal(std400.vertical.ur, 200, 'UR 50% of 400 = 200');
assert.equal(std400.vertical.st, 90, 'ST 22.5% of 400 = 90');
assert.equal(std400.vertical.sc, 65, 'SC 16.25% of 400 = 65');
assert.equal(std400.vertical.sebc, 45, 'SEBC 11.25% of 400 = 45');
assert.equal(std400.matrix.ur.women, 66, 'Women 33% of 200 UR = 66');
assert.equal(std400.matrix.ur.pwbd, 8, 'PwBD 4% of 200 UR = 8');
assert.equal(std400.matrix.ur.esm, 6, 'ESM 3% of 200 UR = 6');
assert.equal(std400.matrix.ur.sports, 2, 'Sports 1% of 200 UR = 2');

// 3. Verify Scheduled-Area / TSP mode for Mayurbhanj
const tsp100 = api.computeOdishaReservationSplit({ totalPosts: 100, district: 'mayurbhanj', useScheduledAreaNorms: true });
assert.equal(tsp100.useScheduledAreaNorms, true);
assert.equal(tsp100.vertical.st, 45, 'TSP local mode elevates ST to 45%');
assert.equal(tsp100.vertical.ur + tsp100.vertical.st + tsp100.vertical.sc + tsp100.vertical.sebc, 100);

// 4. CSP, /jobs/ + /odisha-special/ mounts, 4-theme CSS & SW sync
assert.ok(!/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML/i.test(jsCode));
assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(jsCode));

for (const htmlPath of ['jobs/index.html', 'odisha-special/index.html']) {
  const html = read(htmlPath);
  assert.equal((html.match(/id=["']cso-district-reservation-root["']/g) || []).length, 1, `${htmlPath} must mount #cso-district-reservation-root`);
  assert.ok(html.includes('/assets/js/district-reservation-roster.js?v=20261128v452'));
  assert.ok(!/\son[a-z]+\s*=/i.test(html) && !/\sstyle\s*=/i.test(html));
}

const css = read('assets/style.css');
const blk = css.slice(css.indexOf('v438 / v439 / v440: Document Pack Validator'));
assert.ok(blk.includes('.cso-drr-card') && blk.includes('var(--cso-') && !/#[0-9a-fA-F]{3,8}\b/.test(blk));

const sw = read('sw.js');
assert.ok(sw.includes('/assets/js/district-reservation-roster.js?v=20261128v452'));

console.log('✅ v439 Odisha 30-District & 314-Block Reservation Roster Explorer tests passed!');
