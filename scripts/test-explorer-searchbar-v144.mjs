import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');

const pages = {
  'study-library/index.html': { bar: 'class="topbar"', search: 'id="directory-search"', pill: 'class="home-link"', toggle: 'id="cso-sidebar-toggle-top"' },
  'jobs-careers/index.html': { bar: 'class="topbar"', search: 'class="top-search"', pill: 'class="home-link"', toggle: 'menu-toggle' },
  'schemes/index.html': { bar: 'class="cso-dir-topbar"', search: 'id="schemes-topbar-search"', pill: 'id="schemes-context-pill"', toggle: 'id="schemes-topbar-toggle"' },
  'community/index.html': { bar: 'class="cso-dir-topbar"', search: 'id="community-topbar-search"', pill: 'id="community-context-pill"', toggle: 'id="community-topbar-toggle"' }
};

for (const [file, m] of Object.entries(pages)) {
  const html = read(file);
  assert.ok(html.includes(m.bar), `${file}: top bar`);
  assert.ok(html.includes(m.search), `${file}: search input`);
  assert.ok(html.includes(m.pill), `${file}: context pill`);
  assert.ok(html.includes(m.toggle), `${file}: sidebar toggle`);
  assert.ok(html.includes('Overview'), `${file}: Overview pill text`);
  assert.ok(/<input[^>]*type="search"[^>]*aria-label=/.test(html) || /aria-label="[^"]*"[^>]*type="search"/.test(html), `${file}: search aria-label`);
  assert.ok(!/\sstyle\s*=\s*["']/i.test(html), `${file}: no inline style=""`);
  assert.ok(!/<script(?![^>]*\ssrc=)(?![^>]*type="application\/ld\+json")[^>]*>/i.test(html), `${file}: no inline <script>`);
}

for (const [P, C, js, css] of [
  ['schemes', 'cso-schemes', 'schemes/assets/schemes-explorer.js', 'schemes/assets/schemes-explorer.css'],
  ['community', 'cso-comm', 'community/assets/community-explorer.js', 'community/assets/community-explorer.css']
]) {
  const src = read(js);
  assert.ok(src.includes(`${P}-topbar-search`), `${js}: binds top search`);
  assert.ok(/addEventListener\('input'/.test(src) && src.includes("addEventListener('keydown'"), `${js}: input + keydown`);
  assert.ok(src.includes(`${P}-context-pill`) && src.includes('setContext('), `${js}: context pill updates`);
  assert.ok(src.includes('highlightMatches'), `${js}: highlights matches`);
  assert.ok(!/\.innerHTML\b/.test(src), `${js}: no .innerHTML`);
  const c = read(css);
  for (const v of ['--cso-surface', '--cso-border', '--cso-text', '--cso-highlight-ring']) {
    assert.ok(c.slice(c.indexOf('v144')).includes(`var(${v}`), `${css}: uses ${v}`);
  }
  assert.ok(c.includes('position:sticky'), `${css}: sticky bar`);
}

assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v144'"), 'sw.js v144');
assert.ok(read('functions/_lib/ops-sentinel.js').includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v144'"), 'ops-sentinel v144');
console.log('Explorer search bar v144 checks passed.');
