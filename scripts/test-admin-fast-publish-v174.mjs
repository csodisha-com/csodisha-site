// v174: Admin Studio Fast-Publishing Overhaul Verification.
// Usage: node scripts/test-admin-fast-publish-v174.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

const fp = require(path.join(root, 'admin/fast-publish.js'));
const fpSrc = read('admin/fast-publish.js');
const cmsSrc = read('admin/cms/cms.js');
const studioCss = read('admin/studio.css');
const adminHtml = read('admin/index.html');
const portalHtml = read('admin/portal.html');

// 1. Repeatable row builders & pure round-trip helpers
ok(fpSrc.includes("addLabel: '+ Add Date'"), 'fast-publish.js defines + Add Date builder');
ok(fpSrc.includes("addLabel: '+ Add Resource'"), 'fast-publish.js defines + Add Resource builder');
ok(fpSrc.includes("addLabel: '+ Add Question'"), 'fast-publish.js defines + Add Question builder');
ok(fpSrc.includes('Advanced JSON (Read/Edit)'), 'fast-publish.js includes collapsible Advanced JSON toggle');

const qMd = fp.syncQuestionsBlock('## Overview\nUnit 1 notes.', [
  { question: 'Capital of Odisha?', options: 'A) Cuttack B) Bhubaneswar', explanation: 'Bhubaneswar since 1948' }
]);
ok(qMd.includes('## Practice Questions & FAQs') && qMd.includes('Q: Capital of Odisha?'), 'syncQuestionsBlock formats Q/A/E block');
const parsedQs = fp.parseQuestionsBlock(qMd);
ok(parsedQs.length === 1 && parsedQs[0].question === 'Capital of Odisha?' && parsedQs[0].explanation === 'Bhubaneswar since 1948', 'parseQuestionsBlock round-trips Q/A/E');

const resJson = fp.serializeResources([{ title: 'Odisha GK', author: 'SCERT', url: 'https://scertodisha.nic.in/' }]);
const parsedRes = fp.parseResources(resJson);
ok(parsedRes.length === 1 && parsedRes[0].title === 'Odisha GK' && parsedRes[0].author === 'SCERT', 'serializeResources/parseResources round-trip');

// 2. Live Preview Drawer
ok(fpSrc.includes('👁 Live Preview') && fpSrc.includes('Mobile (360px)') && fpSrc.includes('Desktop'), 'Live Preview drawer includes Mobile (360px) / Desktop toggle');
ok(fpSrc.includes("e.key === 'Escape'") && fpSrc.includes("backdrop.addEventListener('click'"), 'Live Preview drawer closes on Escape & backdrop click');
ok(cmsSrc.includes('openPreviewDrawer('), 'cms.js wires openPreviewDrawer');

// 3. Content Health & Expiry Triage
ok(fpSrc.includes('Content Health & Expiry Triage') && fpSrc.includes('Expired Deadlines') && fpSrc.includes('Unverified or Malformed Links'), 'Triage panel headings present');
const nowMs = Date.parse('2026-11-21T12:00:00Z');
const triage = fp.buildTriage({
  jobs: [
    { id: 'j1', title: 'Expired OPSC', status: 'published', last_date: '2026-11-10', apply_url: 'https://opsc.gov.in/' },
    { id: 'j2', title: 'Bad Link Job', status: 'published', last_date: '2026-12-10', apply_url: 'http://example.com/apply' }
  ],
  schemes: [
    { id: 's1', title: 'Missing URL Scheme', status: 'published', apply_url: '' }
  ]
}, nowMs);
ok(triage.expired.length === 1 && triage.expired[0].id === 'j1', 'buildTriage flags expired active job');
ok(triage.links.some(l => l.id === 'j2' && l.status === 'placeholder'), 'buildTriage flags placeholder URL');
ok(triage.links.some(l => l.id === 's1' && l.status === 'missing'), 'buildTriage flags missing URL');
ok(fp.classifyLink('http://odisha.gov.in/') === 'insecure', 'classifyLink flags http:// as insecure');
ok(fp.isOfficialDomain('https://opsc.gov.in/'), 'isOfficialDomain recognizes .gov.in');
ok(cmsSrc.includes('renderTriagePanel('), 'cms.js renders triage panel on dashboard');

// 4. 100% CSP compliance
for (const [rel, html] of [['admin/index.html', adminHtml], ['admin/portal.html', portalHtml]]) {
  ok(!/<style[\s>]/i.test(html), `${rel}: zero inline <style>`);
  ok(!/\sstyle\s*=/i.test(html), `${rel}: zero style="" attributes`);
  ok(!/<[^>]*\son[a-z]+\s*=/i.test(html), `${rel}: zero inline event handlers`);
  for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
    ok(/\bsrc=/.test(m[1]) || /application\/ld\+json/.test(m[1]), `${rel}: zero executable inline <script>`);
  }
}
ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write/.test(fpSrc), 'admin/fast-publish.js: zero innerHTML sinks');
ok(!/\bonclick\s*=/.test(fpSrc), 'admin/fast-publish.js: zero onclick=');
ok(!/\.style\./.test(fpSrc), 'admin/fast-publish.js: zero inline .style assignments');
ok(studioCss.includes('.cso-fp-drawer') && studioCss.includes('.cso-fp-triage'), 'admin/studio.css includes v174 classes');

// 5. Asset & Cache version bumps (v174)
ok(adminHtml.includes('/admin/studio.css?v=20261121v174'), 'admin/index.html references studio.css v174');
ok(adminHtml.includes('/admin/fast-publish.js?v=20261121v174'), 'admin/index.html references fast-publish.js v174');
ok(adminHtml.includes('/admin/cms/cms.js?v=20261121v174'), 'admin/index.html references cms.js v174');
ok(/CACHE_NAME = 'cso-candidate-cache-v174'/.test(read('sw.js')), 'sw.js bumped to v174');
ok(/ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v174'/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel.js bumped to v174');
ok(/cso-candidate-cache-v174/.test(read('scripts/test-ops-sentinel.mjs')), 'test-ops-sentinel.mjs bumped to v174');

console.log(`test-admin-fast-publish-v174: ${passed} assertions passed`);
