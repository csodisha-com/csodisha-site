import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(join(root, p), 'utf8');
const style = read('assets/style.css');
const detail = read('assets/css/pages/cso-detail-page.css');
const hub = read('assets/css/student-dashboard-bp.css');
const studio = read('admin/studio.css');
const dash = read('study-library/assets/dashboard.css');
const all = { style, detail, hub, studio, dash };

for (const t of ['--cso-fs-h1: clamp(1.375rem, 3.2vw + 0.75rem, 2.25rem)', '--cso-fs-h2: clamp(1.125rem, 2vw + 0.65rem, 1.5rem)', '--cso-fs-body: clamp(0.9375rem, 0.4vw + 0.85rem, 1.05rem)', '--cso-pad-x: clamp(12px, 3.5vw, 28px)', '--cso-gap: clamp(12px, 2.5vw, 24px)'])
  assert.ok(style.includes(t), 'token ' + t);
assert.match(style, /html, body \{ overflow-x: clip; \}/);
assert.match(style, /overflow-wrap: anywhere/);
for (const [n, c] of Object.entries(all)) {
  assert.ok(/minmax\(min\(100%, \d+px\)/.test(c) || /minmax\(min\(100%,\d+px\)/.test(c), n + ' intrinsic grid');
  assert.ok(/@container \(max-width: ?340px\)/.test(c), n + ' @container');
  assert.ok(/@media \(prefers-reduced-motion: reduce\)/.test(c), n + ' reduced motion');
  assert.ok(/@media \(prefers-contrast: more\)/.test(c), n + ' contrast');
  assert.ok(/scroll-snap-type: ?x proximity/.test(c), n + ' scroll containers');
}
for (const n of ['style', 'hub', 'studio', 'dash']) {
  assert.ok(/100dvh/.test(all[n]), n + ' 100dvh');
  assert.ok(/safe-area-inset/.test(all[n]), n + ' safe-area');
}
for (const n of ['style', 'hub', 'studio', 'dash']) assert.ok(/@media \(pointer: coarse\)/.test(all[n]), n + ' pointer coarse');
for (const n of ['style', 'hub', 'studio', 'dash']) assert.ok(/max\(16px, 1rem\)/.test(all[n]), n + ' zoom guard');
assert.ok(/container-type: inline-size/.test(style) && /@supports \(grid-template-rows: subgrid\)/.test(hub));
for (const s of ['env(safe-area-inset-top)', 'env(safe-area-inset-bottom)', 'env(safe-area-inset-left)', 'env(safe-area-inset-right)'])
  assert.ok(Object.values(all).some((c) => c.includes(s)), s);

const VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">';
function walk(d, out = []) {
  for (const f of readdirSync(d)) {
    if (['.git', 'node_modules'].includes(f)) continue;
    const p = join(d, f);
    statSync(p).isDirectory() ? walk(p, out) : /\.(html|js|mjs)$/.test(f) && out.push(p);
  }
  return out;
}
let checked = 0;
for (const f of walk(root)) {
  const s = readFileSync(f, 'utf8');
  for (const m of s.matchAll(/<meta name="viewport" content="[^"]*">/g)) {
    assert.equal(m[0], VIEWPORT, 'viewport in ' + f);
    checked++;
  }
}
assert.ok(checked > 100, 'viewport count ' + checked);
assert.ok(read('functions/_lib/ssr-shell.js').includes('viewport') || read('functions/_lib/site-pages.js').includes('viewport-fit=cover'));

for (const [n, src] of [['admin html', read('admin/index.html')], ['hub html', read('student-dashboard/index.html')], ...Object.entries(all)]) {
  assert.ok(!/<style[\s>]/i.test(src), n + ' <style>');
  if (n.endsWith('html')) {
    assert.ok(!/\sstyle\s*=\s*["']/i.test(src), n + ' style=');
    assert.ok(!/<script(?![^>]*\ssrc=)[^>]*>/i.test(src), n + ' inline script');
  }
}
for (const f of ['admin/admin.js', 'assets/shared-header.js', 'assets/js/student-dashboard.js', 'functions/_lib/ssr-shell.js'])
  assert.ok(!/\.innerHTML\b/.test(read(f)), f + ' innerHTML');
console.log('intrinsic responsive v159: OK (' + checked + ' viewport metas)');
