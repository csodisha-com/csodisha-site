import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const AUTH_PAIRS = [
  ['login.html', 'assets/css/pages/login.css'],
  ['signup.html', 'assets/css/pages/signup.css'],
  ['reset-password.html', 'assets/css/pages/reset-password.css']
];

for (const [htmlRel, cssRel] of AUTH_PAIRS) {
  const html = fs.readFileSync(path.join(root, htmlRel), 'utf8');
  const css = fs.readFileSync(path.join(root, cssRel), 'utf8');

  // 1. Full-width shell structure: header/nav/footer outside <main class="auth-main">
  assert.ok(html.includes('<main class="auth-main" id="main-content">'), `${htmlRel} must wrap auth-card inside <main class="auth-main">`);
  assert.ok(html.includes(`${cssRel}?v=20261122v186`), `${htmlRel} must reference ${cssRel}?v=20261122v186`);

  // 2. CSS must NOT center or pad body horizontally; must use --cso-* tokens
  const bodyBlockMatch = css.match(/body\s*\{([\s\S]*?)\}/);
  assert.ok(bodyBlockMatch, `${cssRel} must define body rule`);
  const bodyRule = bodyBlockMatch[1];
  assert.equal(/align-items\s*:\s*center/i.test(bodyRule), false, `${cssRel} body must not have align-items: center`);
  assert.equal(/justify-content\s*:\s*center/i.test(bodyRule), false, `${cssRel} body must not have justify-content: center`);
  assert.ok(/padding\s*:\s*0\s*;/i.test(bodyRule), `${cssRel} body must have padding: 0;`);

  assert.ok(css.includes('.auth-main'), `${cssRel} must define .auth-main centering`);
  assert.ok(css.includes('var(--cso-bg'), `${cssRel} must use --cso-bg`);
  assert.ok(css.includes('var(--cso-surface'), `${cssRel} must use --cso-surface`);
  assert.ok(css.includes('var(--cso-text'), `${cssRel} must use --cso-text`);
  assert.ok(css.includes('var(--cso-border'), `${cssRel} must use --cso-border`);
  assert.ok(css.includes('min-height: 44px'), `${cssRel} must enforce 44px touch targets`);

  // 3. 100% CSP compliance
  assert.equal(/<style\b/i.test(html), false, `Zero <style> in ${htmlRel}`);
  assert.equal(/\sstyle="/i.test(html), false, `Zero style="" in ${htmlRel}`);
  assert.equal(/\sonclick=/i.test(html), false, `Zero onclick= in ${htmlRel}`);
  const nonLdScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  for (const s of nonLdScripts) {
    assert.equal(s[2].trim(), '', `Executable scripts in ${htmlRel} must be external`);
  }
}

const swJs = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
assert.ok(swJs.includes("const CACHE_NAME = 'cso-candidate-cache-v186'"), 'sw.js must be bumped to v186');

console.log('test-auth-shell-layout-v186: ALL CHECKS PASSED');
