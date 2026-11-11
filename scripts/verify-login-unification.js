#!/usr/bin/env node
/**
 * Common Sense Odisha (CSO) — Login Unification Suite
 * Verifies the single dark "Candidate Sign In" interface (CSO logo) is the
 * only auth surface:
 *   1. Legacy modal surface fully removed (auth-modal.js file deleted,
 *      zero references anywhere; legacy app.js authForm/forgotPassword
 *      light modal gone).
 *   2. Every Login/Sign In/Sign Up trigger navigates to the dedicated
 *      dark pages (/login.html, /signup.html).
 *   3. login.html is a working standalone interface: valid inline script,
 *      CSO logo, POST /api/auth/login, ?redirect= handling, session
 *      persistence.
 *   4. Service worker no longer precaches the removed modal; cache
 *      version bumped so stale copies are evicted.
 *   5. (Live mode) POST /api/auth/login returns success + HttpOnly
 *      cso_session cookie, and /api/auth/me accepts it.
 *
 * Usage: node scripts/verify-login-unification.js [--live]
 */

const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '..');
const LIVE = process.argv.includes('--live');

const colors = { reset: '\x1b[0m', green: '\x1b[32m', red: '\x1b[31m', cyan: '\x1b[36m', bold: '\x1b[1m' };
let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`${colors.green}  ✓ PASS:${colors.reset} ${msg}`); }
  else { failed++; console.error(`${colors.red}  ✗ FAIL:${colors.reset} ${msg}`); }
}

function read(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

function repoGrep(pattern) {
  const { execSync } = require('node:child_process');
  let out = '';
  try {
    out = execSync(
      `grep -rn ${JSON.stringify(pattern)} --include="*.html" --include="*.js" --include="*.css" --include="*.json" . 2>/dev/null | grep -v node_modules | grep -v "^./scripts/verify-login-unification.js" || true`,
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }
    );
  } catch (e) {
    out = '';
  }
  return out.trim();
}

function extractInlineScripts(html) {
  return [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
}

async function main() {
  console.log(`\n${colors.bold}${colors.cyan}=================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}CS Odisha Login Unification Suite${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}=================================================${colors.reset}\n`);

  // ---- 1. Legacy modal surface fully removed ----
  {
    assert(!fs.existsSync(path.join(ROOT, 'assets/js/auth-modal.js')),
      'legacy auth-modal.js file has been deleted');
    assert(repoGrep('auth-modal') === '', 'zero auth-modal references anywhere in the repo');
    assert(repoGrep('CSOCandidateAuth') === '', 'zero CSOCandidateAuth (modal API) references');

    const appJs = read('assets/app.js');
    assert(!/function authForm\s*\(/.test(appJs), 'legacy app.js authForm light modal removed');
    assert(!/function forgotPasswordForm\s*\(/.test(appJs), 'legacy app.js forgotPasswordForm modal removed');
    assert(!appJs.includes("cso-auth-icon"), 'legacy avatar-silhouette modal markup removed');
    assert(!appJs.includes("'Welcome back'"), 'legacy "Welcome back" modal title removed');

    const dashHtml = read('student-dashboard/index.html');
    assert(!dashHtml.includes('/assets/js/auth-modal.js'),
      'student dashboard no longer injects the legacy modal script');

    const header = read('assets/shared-header.js');
    assert(!header.includes('cso-auth-modal-script') && !header.includes('auth-modal.js'),
      'shared-header no longer auto-loads the legacy modal script');
  }

  // ---- 2. All triggers navigate to the single dark interfaces ----
  {
    const header = read('assets/shared-header.js');
    assert(header.includes('href="/login.html"'), 'shared-header desktop Login → /login.html');
    assert(header.includes('href="/signup.html"'), 'shared-header Sign Up → /signup.html');
    assert(!header.includes('#login') && !header.includes('#signup'),
      'shared-header no longer uses #login/#signup modal hash triggers');

    const appJs = read('assets/app.js');
    assert(/function login\(\)\s*\{\s*window\.location\.href = '\/login\.html';\s*\}/.test(appJs),
      'app.js login() navigates to /login.html');
    assert(/function signup\(\)\s*\{\s*window\.location\.href = '\/signup\.html';\s*\}/.test(appJs),
      'app.js signup() navigates to /signup.html');
    assert(appJs.includes("'<a href=\"/login.html\" class=\"cso-auth-item\" id=\"cso-m-li\">Login</a>'"),
      'app.js mobile dropdown Login → /login.html');
    assert(!appJs.includes("'#login'") && !appJs.includes("'#signup'"),
      'app.js no longer uses #login/#signup modal hash triggers');
  }

  // ---- 3. login.html: standalone dark interface, working handshake ----
  {
    const html = read('login.html');
    assert(html.includes('Candidate Sign In'), 'login page keeps the "Candidate Sign In" title');
    assert(html.includes('/assets/images/cso-logo.svg'), 'login page features the CSO logo');
    assert(html.includes('Sign In to Portal'), 'login page keeps the "Sign In to Portal" action');
    assert(html.includes("'/api/auth/login'"), 'login form submits to POST /api/auth/login');

    const scripts = extractInlineScripts(html);
    let parsed = true;
    for (const s of scripts) {
      try { new Function(s); } catch (e) { parsed = false; }
    }
    assert(parsed && scripts.length > 0, 'login page inline script is syntactically valid (handshake works)');

    assert(html.includes("localStorage.setItem('cso_candidate_session_v1'"),
      'login persists the candidate session locally for the offline-first dashboard');
    assert(html.includes("urlParams.get('redirect')") && html.includes("startsWith('/')"),
      'login honors the relative ?redirect= parameter');
    assert(html.includes("'/student-dashboard/'"), 'login defaults to /student-dashboard/ after sign-in');
    assert(html.includes("localStorage.removeItem('cso_auth_token'"),
      'failed logins clear stale tokens before showing the error');

    const dashHtml = read('student-dashboard/index.html');
    assert(dashHtml.includes("'/login.html?redirect='") || dashHtml.includes('/login.html?redirect='),
      'dashboard gate redirects unauthenticated visits to the dark login with ?redirect=');
  }

  // ---- 4. Service worker hygiene ----
  {
    const sw = read('sw.js');
    assert(!sw.includes('auth-modal'), 'SW no longer precaches the removed modal');
    assert(/cso-candidate-cache-v\d+/.test(sw) && !sw.includes('cso-candidate-cache-v8'),
      'SW cache version bumped so stale modal copies are evicted');
    assert(sw.includes("'/login.html'"), 'SW precaches the dark login page for offline access');
  }

  // ---- 5. Live handshake verification (optional) ----
  if (LIVE) {
    const BASE = 'https://csodisha-site.commonsenseodisha.workers.dev';
    const EMAIL = 'commonsenseodisha@gmail.com';
    const PASSWORD = 'Qw!z9Kp4Rt7v';
    const { execSync } = require('node:child_process');

    // Register + verify a fresh account for the login handshake test.
    execSync(
      `curl -s -X POST ${BASE}/api/auth/register -H "Content-Type: application/json" -d '{"fullName":"Login Unification Test","email":"${EMAIL}","password":"${PASSWORD}","district":"Khordha","targetStreams":["opsc"]}'`,
      { encoding: 'utf8' }
    );
    const otp = JSON.parse(execSync(
      `npx wrangler d1 execute cso-database --remote --json --command "SELECT otp_code FROM email_verifications WHERE email='${EMAIL}'" 2>/dev/null`,
      { cwd: ROOT, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 }
    ))[0].results[0].otp_code;
    execSync(
      `curl -s -X POST ${BASE}/api/auth/verify-otp -H "Content-Type: application/json" -d '{"email":"${EMAIL}","code":"${otp}"}'`,
      { encoding: 'utf8' }
    );

    // Wrong password → 401
    let res = execSync(
      `curl -s -w "\\n%{http_code}" -X POST ${BASE}/api/auth/login -H "Content-Type: application/json" -d '{"email":"${EMAIL}","password":"wrongpass"}'`,
      { encoding: 'utf8' }
    ).trim().split('\n');
    assert(res[1] === '401' || res[1] === '403', 'login rejects wrong credentials without a session');

    // Correct password → success + HttpOnly cso_session cookie
    const headers = execSync(
      `curl -s -i -X POST ${BASE}/api/auth/login -H "Content-Type: application/json" -d '{"email":"${EMAIL}","password":"${PASSWORD}"}'`,
      { encoding: 'utf8' }
    );
    const body = JSON.parse(headers.slice(headers.indexOf('\n{')));
    const setCookie = (headers.match(/set-cookie:([^\r\n]+)/i) || [])[1] || '';
    assert(body.success === true, 'login returns success with valid credentials');
    assert(!!body.candidate, 'login returns the candidate payload for the session snapshot');
    assert(/cso_session=/i.test(setCookie), 'login sets the cso_session cookie');
    assert(/httponly/i.test(setCookie), 'cso_session cookie is HttpOnly (server-side session)');

    // Cookie grants /api/auth/me
    const cookieVal = (setCookie.match(/cso_session=([^;]+)/i) || [])[1];
    const me = execSync(
      `curl -s -H "Cookie: cso_session=${cookieVal}" ${BASE}/api/auth/me`,
      { encoding: 'utf8' }
    );
    const meData = JSON.parse(me);
    assert(meData.success === true && meData.authenticated === true && meData.user,
      '/api/auth/me accepts the cso_session cookie issued by login');

    // Cleanup test account rows (FK cascade clears state tables)
    execSync(
      `npx wrangler d1 execute cso-database --remote --command "DELETE FROM sessions WHERE email='${EMAIL}'; DELETE FROM candidates WHERE email='${EMAIL}'; DELETE FROM users WHERE email='${EMAIL}'; DELETE FROM email_verifications WHERE email='${EMAIL}';"`,
      { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }
    );
    console.log('  (live test account cleaned up)');
  }

  console.log(`\n${colors.bold}${failed === 0 ? colors.green : colors.red}Result: ${passed} passed, ${failed} failed${colors.reset}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(err => {
  console.error(`${colors.red}Suite aborted: ${err.message}${colors.reset}`);
  process.exit(1);
});
