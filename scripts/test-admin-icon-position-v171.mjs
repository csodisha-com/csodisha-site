// v171: Admin Shield Icon Relocation to Right-Side Auth Cluster.
// Usage: node scripts/test-admin-icon-position-v171.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
let passed = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); passed++; };

// 1. assets/shared-header.js
const sharedHeader = read('assets/shared-header.js');
ok(sharedHeader.includes('acct.append(adm, icon, auth);'), 'shared-header.js appends adm inside .acct before auth');
ok(sharedHeader.includes('header.replaceChildren(brand, ctl, sp, acct);'), 'shared-header.js places ctl right after brand without adm');
ok(!/\.innerHTML\b|\.outerHTML\b|insertAdjacentHTML|document\.write/.test(sharedHeader), 'shared-header.js: zero innerHTML sinks');
ok(!/\bonclick\s*=/.test(sharedHeader), 'shared-header.js: zero onclick=');

// 2. functions/_lib/ssr-shell.js
const ssrShell = read('functions/_lib/ssr-shell.js');
const ssrAcct = ssrShell.indexOf('<div class="acct">');
const ssrAdm = ssrShell.indexOf('cso-adm-icon-only');
const ssrAuth = ssrShell.indexOf('id="auth"');
ok(ssrAcct > 0 && ssrAdm > ssrAcct && ssrAuth > ssrAdm, 'ssr-shell.js places Admin Shield inside .acct before #auth');
ok(ssrShell.includes('/assets/style.css?v=20261121v171') && ssrShell.includes('/assets/shared-header.js?v=20261121v171'), 'ssr-shell.js references v171 assets');

// 3. assets/style.css mobile 44px touch target
const styleCss = read('assets/style.css');
ok(/min-width:\s*44px\s*!important;\s*min-height:\s*44px\s*!important;/.test(styleCss), 'style.css enforces 44px minimum touch target on mobile for Admin Shield');

// 4. All HTML pages with cso-adm-icon-only
const SKIP = new Set(['node_modules', '.git', '.wrangler', 'dist', 'admin']);
const htmlFiles = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.html')) htmlFiles.push(path.relative(root, full));
  }
})(root);

let verifiedAdmPages = 0;
for (const rel of htmlFiles) {
  const html = read(rel);
  if (!html.includes('cso-adm-icon-only')) continue;
  verifiedAdmPages++;
  const acctIdx = html.indexOf('<div class="acct">');
  const admIdx = html.indexOf('cso-adm-icon-only');
  const authIdx = html.indexOf('id="auth"');
  ok(acctIdx > 0 && admIdx > acctIdx && authIdx > admIdx, `${rel}: Admin Shield inside .acct before #auth`);
  ok(!/<style[\s>]/i.test(html), `${rel}: zero inline <style>`);
  ok(!/\sstyle\s*=/i.test(html), `${rel}: zero style="" attributes`);
  ok(!/<[^>]*\son[a-z]+\s*=/i.test(html), `${rel}: zero inline event handlers`);
  for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
    ok(/\bsrc=/.test(m[1]) || /application\/ld\+json/.test(m[1]), `${rel}: zero executable inline <script>`);
  }
}
ok(verifiedAdmPages >= 48, `verified ${verifiedAdmPages} HTML pages with Admin Shield inside .acct`);

// 5. Cache & version bumps (v171)
ok(read('scripts/build-career-hubs.mjs').includes("const V = '20261121v171';"), 'build-career-hubs.mjs bumped to v171');
ok(/CACHE_NAME = 'cso-candidate-cache-v171'/.test(read('sw.js')), 'sw.js bumped to v171');
ok(/ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v171'/.test(read('functions/_lib/ops-sentinel.js')), 'ops-sentinel.js bumped to v171');
ok(/cso-candidate-cache-v171/.test(read('scripts/test-ops-sentinel.mjs')), 'test-ops-sentinel.mjs bumped to v171');

console.log(`test-admin-icon-position-v171: ${passed} assertions passed (${verifiedAdmPages} HTML pages verified)`);
