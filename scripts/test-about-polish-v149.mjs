import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(p, 'utf8');

const aboutHtml = read('about/index.html');
const aboutCss = read('about/assets/about-explorer.css');
const aboutJs = read('about/assets/about-explorer.js');
const styleCss = read('assets/style.css');
const studyCss = read('study-library/assets/dashboard.css');
const commCss = read('community/assets/community-explorer.css');
const studentHtml = read('student-dashboard/index.html');
const studentJs = read('assets/js/student-dashboard.js');
const authGuardJs = read('assets/js/student-auth-guard.js');
const swJs = read('sw.js');
const opsSentinel = read('functions/_lib/ops-sentinel.js');

// 1. /about/ sticky sidebar, collapse chevron, and semantic portal link icons
assert.match(aboutCss, /\.about-sidebar,\s*\.cso-about-rail\s*\{[\s\S]*?position:\s*sticky;[\s\S]*?top:\s*106px;[\s\S]*?align-self:\s*flex-start;[\s\S]*?max-height:\s*calc\(100vh - 106px\);[\s\S]*?overflow-y:\s*auto;[\s\S]*?scrollbar-width:\s*thin;/, '/about/ sticky sidebar rules present');
assert.ok(aboutHtml.includes('id="about-rail-toggle"') && aboutHtml.includes('aria-label="Collapse sidebar"') && aboutHtml.includes('>◀</button>'), '/about/ sidebar toggle uses clean ◀ chevron');
assert.ok(!aboutHtml.includes('⇄'), '/about/ no longer uses ⇄ toggle icon');
for (const icon of ['🏠', '📚', '💼', '🏛️', '👥']) {
  assert.ok(aboutHtml.includes(icon), `/about/ PORTAL LINKS includes semantic icon ${icon}`);
}

// 2. Prevent * Saved 0 clipping in .main-nav & footer map padding
const styleV149 = styleCss.slice(styleCss.indexOf('v149: Prevent * Saved 0 Clipping'));
assert.match(styleV149, /#cso-main-navbar,[\s\S]*?padding:\s*6px\s+16px\s*!important;[\s\S]*?gap:\s*4px\s*!important;[\s\S]*?overflow:\s*visible\s*!important;/, 'main-nav padding 6px 16px, gap 4px, overflow visible');
assert.match(styleV149, /padding:\s*0\s+11px\s*!important;/, 'nav parent pill horizontal padding 0 11px');
assert.match(styleV149, /\.nav-saved,\s*\.cso-nav-saved-pill\s*\{[\s\S]*?flex-shrink:\s*0\s*!important;[\s\S]*?white-space:\s*nowrap\s*!important;[\s\S]*?margin-left:\s*auto\s*!important;/, '.nav-saved / .cso-nav-saved-pill flex-shrink: 0, nowrap, margin-left: auto');
assert.match(styleV149, /\.cso-footer-zone3\s*\{[\s\S]*?padding-bottom:\s*28px\s*!important;/, 'footer map column has padding-bottom: 28px');

// 3. /about/ hero padding & spacing
assert.match(aboutCss, /\.about-hero,\s*\.cso-about-hero\s*\{[\s\S]*?padding:\s*24px\s+28px;/, 'about hero padding 24px 28px');

// 4. Cross-explorer parity (/study-library/ & /community/)
assert.match(studyCss, /min-height:\s*30px\s*!important;[\s\S]*?max-height:\s*34px\s*!important;[\s\S]*?border-radius:\s*999px\s*!important;[\s\S]*?font-size:\s*13px\s*!important;/, 'study-library compact breadcrumb pill');
assert.match(commCss, /\.cso-comm-crumb\{[\s\S]*?min-height:30px;max-height:34px;border-radius:999px;font-size:13px;/, 'community compact breadcrumb pill');

// 5. Candidate Hub Auth Sync: single Sign Out button & cso_portal_theme
const signOutMatches = studentHtml.match(/>Sign Out<\/span>|>Sign Out<\/button>/g) || [];
assert.equal(signOutMatches.length, 1, `student-dashboard/index.html must have strictly 1 Sign Out button (found ${signOutMatches.length})`);
assert.ok(!studentHtml.includes('bp-profile-logout-btn'), 'secondary profile Sign Out button removed from student-dashboard/index.html');
assert.ok(!studentJs.includes('bp-profile-logout-btn'), 'secondary profile Sign Out listener removed from student-dashboard.js');
assert.ok(authGuardJs.includes("localStorage.getItem('cso_portal_theme')"), 'student-auth-guard.js uses cso_portal_theme');
assert.ok(!authGuardJs.includes('cso_student_theme'), 'student-auth-guard.js has zero cso_student_theme references');

// 6. CSP compliance (zero inline style="", <script>, or .innerHTML)
for (const [name, html] of [['about/index.html', aboutHtml], ['student-dashboard/index.html', studentHtml]]) {
  assert.ok(!/\sstyle\s*=\s*["']/i.test(html), `${name}: zero inline style=""`);
  assert.ok(!/<script(?![^>]*\ssrc=)(?![^>]*type="application\/ld\+json")[^>]*>/i.test(html), `${name}: zero inline <script>`);
}
for (const [name, js] of [['about/assets/about-explorer.js', aboutJs], ['assets/js/student-dashboard.js', studentJs], ['assets/js/student-auth-guard.js', authGuardJs]]) {
  assert.ok(!/\sstyle\s*=\s*["']/i.test(js), `${name}: zero inline style=""`);
  assert.ok(!/\.innerHTML\b/.test(js), `${name}: zero .innerHTML`);
}

// 7. Cache version v149
assert.ok(swJs.includes("const CACHE_NAME = 'cso-candidate-cache-v149'"), 'sw.js CACHE_NAME bumped to v149');
assert.ok(opsSentinel.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v149'"), 'ops-sentinel ACTIVE_SW_CACHE_VERSION bumped to v149');

console.log('About Polish & Cross-Explorer Parity v149 tests passed.');
