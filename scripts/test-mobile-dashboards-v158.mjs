import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const adminCss = read('admin/studio.css');
const hubCss = read('assets/css/student-dashboard-bp.css');
const adminHtml = read('admin/index.html');
const hubHtml = read('student-dashboard/index.html');
const adminJs = read('admin/admin.js');

for (const [name, css] of [['admin', adminCss], ['hub', hubCss]]) {
  assert.match(css, /@media \(max-width: (360|430|480|640|768|900)px\)/, name + ' mobile media queries');
}
assert.match(hubCss, /v158 Mobile overhaul[\s\S]*\.bp-topbar \{\s*position: relative;/, 'hub header in normal flow');
assert.match(hubCss, /\.bp-topbar-actions \{[^}]*flex-wrap: wrap/, 'hub actions wrap');
assert.match(hubCss, /min-height: 44px;\s*min-width: 44px;/, 'hub 44px touch targets');
assert.match(adminCss, /\.cso-form-grid \{ grid-template-columns: 1fr; \}/, 'study form single column');
assert.match(adminCss, /font-size: 16px; min-height: 44px/, 'admin 16px inputs');
assert.match(adminCss, /overflow-x: auto; -webkit-overflow-scrolling: touch/, 'table scroll');
assert.match(adminCss, /\.cso-kpi-card \{ padding-bottom: 18px; \}/, 'kpi padding');
assert.match(adminCss, /\.cso-user-admin-label/, 'Admin pill');
assert.match(adminHtml, /id="sidebarCloseBtn"/, 'drawer close button');
assert.ok(!adminHtml.includes('>module-01-001<'), 'raw module badge removed');
assert.ok(!/textContent = mod\.id/.test(adminJs), 'raw module id not rendered');

const inlineScript = /<script(?![^>]*\ssrc=)[^>]*>/i;
for (const [name, src] of [['admin html', adminHtml], ['hub html', hubHtml], ['hub css', hubCss]]) {
  assert.ok(!/<style[\s>]/i.test(src), name + ' inline <style>');
  assert.ok(!/\sstyle\s*=\s*["']/i.test(src), name + ' style attr');
  assert.ok(!inlineScript.test(src), name + ' inline <script>');
}
for (const [name, src] of [['admin.js', adminJs], ['shared-header.js', read('assets/shared-header.js')], ['student-dashboard.js', read('assets/js/student-dashboard.js')]]) {
  assert.ok(!/\.innerHTML\b/.test(src), name + ' .innerHTML');
}
console.log('mobile dashboards v158: OK');
