#!/usr/bin/env node
/**
 * v440 Test Suite — Interactive Odisha Govt Job & Exam
 * Weekly Digest Card & Bulletin Composer (/updates/ & /admin/)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const jsCode = read('assets/js/weekly-digest-composer.js');
const sandbox = { window: {}, globalThis: {}, console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(jsCode, sandbox);
const api = sandbox.window.CSOWeeklyDigestComposer;

assert.ok(api, 'window.CSOWeeklyDigestComposer must be exposed');
assert.equal(api.VERSION, 'v440');
assert.equal(api.ROOT_ID, 'cso-weekly-digest-composer-root');
assert.equal(api.PREFS_KEY, 'cso_weekly_digest_prefs_v1');
assert.equal(api.SECTION_META.length, 4, 'Must define 4 editorial bulletin sections');
assert.ok(api.FALLBACK_ITEMS.length >= 8, 'Must include rich curated Odisha fallback entries');

// 1. Verify EN Telegram Markdown format & 4-section grouping
const tgEn = api.composeWeeklyDigestBulletin({
  language: 'en',
  channelFormat: 'telegram',
  windowDays: 7,
  editionTitle: 'Odisha Weekly Digest #44',
  customHighlight: 'OPSC OAS closing soon!'
});
assert.equal(tgEn.sections.length, 4, 'Fallback items must populate all 4 editorial sections');
assert.ok(tgEn.formattedText.includes('### 🗞️ Odisha Weekly Digest #44'));
assert.ok(tgEn.formattedText.includes('OPSC OAS closing soon!'));
assert.ok(tgEn.formattedText.includes('](https://csodisha.com/'));

// 2. Verify Odia WhatsApp format
const waOr = api.composeWeeklyDigestBulletin({
  language: 'or',
  channelFormat: 'whatsapp',
  windowDays: 14
});
assert.ok(waOr.formattedText.includes('୭ ଦିନ ମଧ୍ୟରେ ଶେଷ'));
assert.ok(waOr.formattedText.includes('▸ *'));

// 3. Verify Bilingual Printable Wall-Chart format
const wcBi = api.composeWeeklyDigestBulletin({
  language: 'bilingual',
  channelFormat: 'wallchart',
  windowDays: 30
});
assert.ok(wcBi.formattedText.includes('=================================================='));
assert.ok(wcBi.formattedText.includes('Closing Within 7 Days') && wcBi.formattedText.includes('୭ ଦିନ ମଧ୍ୟରେ'));

// 4. CSP, /updates/ + /admin/ mounts, 4-theme CSS & SW/ops-sentinel v440 sync
assert.ok(!/\.innerHTML\s*=|\.outerHTML\s*=|insertAdjacentHTML/i.test(jsCode));
assert.ok(!/\.style\.[a-zA-Z]+\s*=/.test(jsCode));

for (const htmlPath of ['updates/index.html', 'admin/index.html']) {
  const html = read(htmlPath);
  assert.equal((html.match(/id=["']cso-weekly-digest-composer-root["']/g) || []).length, 1, `${htmlPath} must mount #cso-weekly-digest-composer-root`);
  assert.ok(html.includes('/assets/js/weekly-digest-composer.js?v=20261127v449'));
}

const updatesHtml = read('updates/index.html');
assert.ok(!/\son[a-z]+\s*=/i.test(updatesHtml) && !/\sstyle\s*=/i.test(updatesHtml));

const css = read('assets/style.css');
const blk = css.slice(css.indexOf('v438 / v439 / v440: Document Pack Validator'));
assert.ok(blk.includes('.cso-wdc-card') && blk.includes('var(--cso-') && !/#[0-9a-fA-F]{3,8}\b/.test(blk));

const sw = read('sw.js');
assert.ok(sw.includes("CACHE_NAME = 'cso-candidate-cache-v449'"));
assert.ok(sw.includes('/assets/js/weekly-digest-composer.js?v=20261127v449'));

const ops = read('functions/_lib/ops-sentinel.js');
assert.ok(ops.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v449'"));

console.log('✅ v440 Odisha Govt Weekly Digest Card & Bulletin Composer tests passed!');
