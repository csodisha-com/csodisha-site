import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const jsPath = 'assets/js/subscription-alert-hub.js';
const src = fs.readFileSync(jsPath, 'utf8');

// 1. Strict CSP static checks
assert.ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML\b/.test(src), 'Zero unsafe HTML sinks');
assert.ok(!/\.style\.[a-zA-Z]/.test(src), 'Zero .style.* mutations');
assert.ok(!/\bon(click|change|input|submit|keydown)\s*=/.test(src), 'Zero inline on* handlers');

// 2. Execute in clean sandbox and verify feed URL builder + batch ICS exporter
const sandbox = {
  window: {},
  document: { readyState: 'complete', addEventListener: () => {}, getElementById: () => null },
  console,
  Date,
  Math
};
vm.runInNewContext(src, sandbox, { filename: jsPath });

const api = sandbox.window.CSOSubscriptionAlertHub;
assert.ok(api, 'window.CSOSubscriptionAlertHub must be exposed');
assert.equal(api.ODISHA_DISTRICTS.length, 31, 'All Districts + 30 Odisha districts');

const cfg = api.buildFilteredFeedConfig({ category: 'jobs', district: 'Khordha', language: 'or', limit: 10 });
assert.equal(cfg.rssUrl, 'https://csodisha.com/feed.xml?category=jobs&district=Khordha&lang=or&limit=10');
assert.equal(cfg.jsonFeedUrl, 'https://csodisha.com/feed.json?category=jobs&district=Khordha&lang=or&limit=10');
assert.equal(cfg.hubUrl, 'https://csodisha.com/jobs/?district=Khordha');

const rssXml = api.formatRssPreview(api.FALLBACK_ITEMS, cfg);
assert.ok(rssXml.includes('<rss version="2.0">') && rssXml.includes('<item>'), 'Valid RSS 2.0 XML preview');

const jsonFeed = JSON.parse(api.formatJsonFeedPreview(api.FALLBACK_ITEMS, cfg));
assert.equal(jsonFeed.version, 'https://jsonfeed.org/version/1.1');
assert.ok(Array.isArray(jsonFeed.items) && jsonFeed.items.length >= 5);

const ics = api.buildBatchIcsCalendar(api.FALLBACK_ITEMS);
assert.ok(ics.startsWith('BEGIN:VCALENDAR'), 'ICS starts with BEGIN:VCALENDAR');
assert.ok(ics.includes('BEGIN:VEVENT') && ics.includes('BEGIN:VALARM') && ics.includes('TRIGGER:-PT24H'), 'ICS contains VEVENT & 24h VALARM');
assert.ok(ics.trim().endsWith('END:VCALENDAR'), 'ICS ends with END:VCALENDAR');

// 3. Verify mounts in updates/index.html & tools/index.html + Quick-Jump registration
for (const htmlPath of ['updates/index.html', 'tools/index.html']) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  assert.ok(html.includes('id="cso-subscription-alert-hub-root"'), `${htmlPath} mounts #cso-subscription-alert-hub-root`);
  assert.ok(html.includes('/assets/js/subscription-alert-hub.js?v=20261128v450'), `${htmlPath} loads subscription-alert-hub.js v446`);
}

const qj = fs.readFileSync('assets/js/tools-quick-jump-directory.js', 'utf8');
assert.ok(qj.includes("id: 'subscription-alert-hub'") && qj.includes("targetId: 'cso-subscription-alert-hub-root'"), 'Registered in tools-quick-jump-directory.js');

// 4. Verify CSS, SW cache & ops-sentinel sync
const css = fs.readFileSync('assets/style.css', 'utf8');
assert.ok(css.includes('.cso-sah-root') && css.includes('.cso-sah-preview'), 'CSS defines .cso-sah-* styles');
const sw = fs.readFileSync('sw.js', 'utf8');
assert.ok(sw.includes("const CACHE_NAME = 'cso-candidate-cache-v450';"), 'sw.js CACHE_NAME is cso-candidate-cache-v450');
assert.ok(sw.includes("'/assets/js/subscription-alert-hub.js?v=20261128v450'"), 'sw.js precaches subscription-alert-hub.js');
const ops = fs.readFileSync('functions/_lib/ops-sentinel.js', 'utf8');
assert.ok(ops.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v450'"), 'ops-sentinel.js synced to v446');

console.log('PASS: v446 Multi-Channel RSS/JSON/ICS Subscription & Alert Hub suite verified.');
