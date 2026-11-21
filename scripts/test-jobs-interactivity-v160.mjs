import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const html = read('jobs-careers/index.html');
const js = read('jobs-careers/assets/dashboard.js');
const css = read('jobs-careers/assets/dashboard.css');
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

// 1. Directory at a Glance removed everywhere
for (const page of ['jobs-careers', 'jobs', 'schemes', 'schemes-benefits', 'study-library', 'community']) {
  const h = read(`${page}/index.html`);
  ok(!/Directory at a Glance/i.test(h), `${page}: Directory at a Glance present`);
  ok(!/statistics-section|statistics-grid/.test(h), `${page}: statistics markup present`);
}
ok(!/Directory at a Glance|renderStatistics|statistics-grid/.test(js), 'jobs-careers JS still renders statistics');
ok(!/Navigation Groups|Detailed Entries/.test(html + js), 'stat labels still present');

// 2. Duplicate bars/filters removed
ok(!/data-cso-subpage-topbar/.test(html), 'Back to Explorer strip still enabled');
ok(!/jc-quick-pills|cso-jobs-quick-pills|cso-jobs-pill/.test(html + js), 'hero pill row still present');
ok((html.match(/id="live-jobs-search"/g) || []).length === 1, 'must have exactly one live search bar');
ok((html.match(/class="live-filter-strip"/g) || []).length === 1, 'must have exactly one pill strip');
ok((html.match(/data-chip="/g) || []).length === 7, 'pill strip must have 7 pills');
for (const label of ['All Jobs', 'OPSC', 'OSSC / OSSSC', 'Teaching &amp; Education', 'Police &amp; Defence', 'Central &amp; Banking', 'Admit Card &amp; Result', 'All States', 'All Categories', 'Match my Candidate Hub goals', 'Reset All Filters']) {
  ok(html.includes(label), `missing control label: ${label}`);
}
ok(/\.top-search\[hidden\]/.test(css) && /<div class="top-search" hidden>/.test(html), 'top search not hidden on overview');

// 3. Job card actions
ok(/'★ Save'/.test(js) && /'★ Saved'/.test(js), 'compact Save labels missing');
ok(!/Save to Dashboard/.test(js), 'long Save to Dashboard label remains');
ok(/grid-template-columns:\s*1fr 1fr/.test(css), '2x2 mobile grid missing');
ok(/navigator\.share/.test(js) && /clipboard\.writeText/.test(js) && /Link Copied!/.test(js), 'share/clipboard/toast not wired');
ok(/target = '_blank'/.test(js) && /noopener noreferrer/.test(js), 'Apply Online target/rel missing');
ok(/addEventListener\('click', \(\) => openJobDetail/.test(js), 'View Details handler missing');
ok(/jobCache\.get\(slug\)/.test(js), 'detail fallback missing');
ok(/aria-pressed/.test(js) && /Reset All Filters/.test(js), 'pill state / reset missing');
for (const ev of ["liveSearchEl.addEventListener('input'", "liveStateEl.addEventListener('change'", "liveCategoryEl.addEventListener('change'", "liveChipsWrap.addEventListener('click'", "liveGoalToggleBtn.addEventListener('click'", "liveResetBtn.addEventListener('click'"]) {
  ok(js.includes(ev), `missing handler: ${ev}`);
}

// 4. Accordions
ok(/noteTotal <= 3/.test(js) && /buildAccordion/.test(js), 'flatten <=3 entries missing');
ok(/plural\(/.test(js), 'entry pluralisation missing');

// 5. Every static <button> / interactive control is wired
const wiredIds = new Set([...js.matchAll(/\$\('([\w-]+)'\)/g)].map(m => m[1]));
const delegated = [/data-chip=/, /data-section-index=/, /data-cso-lang=/];
ok(/data-cso-lang|csoLang/.test(read('assets/shared-header.js') + (fs.existsSync(path.join(root, 'assets/js')) ? fs.readdirSync(path.join(root, 'assets/js')).filter(f => f.endsWith('.js')).map(f => read('assets/js/' + f)).join('') : '')), 'footer language pills have no shared handler');
const buttons = [...html.matchAll(/<button\b([^>]*)>/g)].map(m => m[1]);
ok(buttons.length > 0, 'no buttons found');
const sharedHeaderIds = new Set(['cso-sidebar-toggle', 'cso-sidebar-toggle-top']);
for (const attrs of buttons) {
  const id = (attrs.match(/\bid="([^"]+)"/) || [])[1];
  if (id) {
    ok(wiredIds.has(id) || js.includes(id) || sharedHeaderIds.has(id), `button #${id} not referenced by JS`);
  } else {
    ok(delegated.some(re => re.test(attrs)), `anonymous button without delegated handler: ${attrs.trim()}`);
  }
}
for (const sel of ["document.addEventListener('keydown'"]) ok(js.includes(sel), `missing ${sel}`);

// Dead links
const hrefs = [...(html + js).matchAll(/href="([^"]*)"/g)].map(m => m[1]);
for (const h of hrefs) {
  ok(h !== '' && h !== '#' && !/^javascript:/i.test(h), `dead href: "${h}"`);
}
ok(!/href\s*=\s*['"](#|javascript:)/i.test(js), 'dead href set from JS');
ok(!/\.href\s*=\s*['"]#?['"]/.test(js), 'empty href set from JS');

// CSP compliance
ok(!/<style[\s>]/i.test(html), 'inline <style>');
ok(!/\sstyle\s*=/i.test(html), 'style= attribute in html');
ok(!/\son[a-z]+\s*=/i.test(html), 'inline event handler in html');
const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)].map(m => m[1]);
for (const a of scripts) ok(/\bsrc=/.test(a), `inline <script> block: ${a}`);
ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write/.test(js), 'innerHTML sink in JS');
ok(!/\.style\.cssText|setAttribute\(\s*['"]style['"]/.test(js), 'inline style set from JS');
ok(!/\bonclick\s*=/.test(js), 'onclick= in JS');

// Cache bump
ok(/CACHE_NAME = 'cso-candidate-cache-v1(6\d|[7-9]\d)'/.test(read('sw.js')), 'sw.js not bumped');
ok(/ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v1(6\d|[7-9]\d)'/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel not bumped');
ok(/cso-candidate-cache-v1\d\d/.test(read('scripts/test-ops-sentinel.mjs')), 'ops test not bumped');

console.log(`test-jobs-interactivity-v160: ${passed} assertions passed`);
