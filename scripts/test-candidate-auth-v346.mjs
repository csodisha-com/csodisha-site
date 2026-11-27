#!/usr/bin/env node
/**
 * Verification Suite: Candidate Login (Email / User ID + Password & Google OAuth) End-to-End (v346)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function createMockD1() {
  const users = new Map();
  const candidates = new Map();
  const sessions = new Map();

  function makeStmt(sql) {
    let args = [];
    const stmt = {
      bind(...params) {
        args = params;
        return stmt;
      },
      async first() {
        const q = sql.replace(/\s+/g, ' ').trim();
        if (q.startsWith('SELECT id, email, username, password_hash, salt')) {
          const ident = String(args[0] || '').toLowerCase();
          for (const u of users.values()) {
            if (
              String(u.email || '').toLowerCase() === ident ||
              String(u.id || '').toLowerCase() === ident ||
              String(u.username || '').toLowerCase() === ident
            ) {
              return { ...u };
            }
          }
          return null;
        }
        if (q.startsWith('SELECT id, full_name, email, username, phone, district, target_streams FROM candidates')) {
          const id = args[0];
          const email = String(args[1] || '').toLowerCase();
          for (const c of candidates.values()) {
            if (c.id === id || String(c.email || '').toLowerCase() === email) return { ...c };
          }
          return null;
        }
        if (q.startsWith('SELECT id, full_name, email, username, phone, district, password_hash')) {
          const ident = String(args[0] || '').toLowerCase();
          for (const c of candidates.values()) {
            if (
              String(c.email || '').toLowerCase() === ident ||
              String(c.id || '').toLowerCase() === ident ||
              String(c.username || '').toLowerCase() === ident
            ) {
              return { ...c };
            }
          }
          return null;
        }
        if (q.startsWith('SELECT token, user_id, email, role, expires_at FROM sessions')) {
          const row = sessions.get(args[0]);
          return row ? { ...row } : null;
        }
        if (q.startsWith('SELECT c.id, c.full_name, c.email, c.phone, c.district, c.target_streams FROM candidates c')) {
          const id = args[0];
          const email = String(args[1] || '').toLowerCase();
          for (const c of candidates.values()) {
            if (c.id === id || String(c.email || '').toLowerCase() === email) return { ...c };
          }
          return null;
        }
        if (q.startsWith('SELECT role FROM users WHERE id = ?')) {
          const u = users.get(args[0]);
          return u ? { role: u.role } : null;
        }
        if (q.startsWith('SELECT id, email, role, status, google_sub, avatar_url FROM users')) {
          const sub = args[0];
          const email = String(args[1] || '').toLowerCase();
          for (const u of users.values()) {
            if ((sub && u.google_sub === sub) || String(u.email || '').toLowerCase() === email) return { ...u };
          }
          return null;
        }
        if (q.startsWith('SELECT id, email, google_sub, avatar_url FROM candidates')) {
          const sub = args[0];
          const email = String(args[1] || '').toLowerCase();
          for (const c of candidates.values()) {
            if ((sub && c.google_sub === sub) || String(c.email || '').toLowerCase() === email) return { ...c };
          }
          return null;
        }
        return null;
      },
      async run() {
        const q = sql.replace(/\s+/g, ' ').trim();
        if (q.startsWith('INSERT INTO sessions')) {
          const [token, user_id, email, role, created_at, expires_at] = args;
          sessions.set(token, { token, user_id, email, role, created_at, expires_at });
        } else if (q.startsWith('INSERT INTO users')) {
          if (q.includes('google_sub')) {
            const [id, email, password_hash, salt, google_sub, avatar_url, created_at, updated_at] = args;
            users.set(id, { id, email, username: null, password_hash, salt, role: 'candidate', status: 'active', google_sub, avatar_url, auth_provider: 'google', failed_attempts: 0, lockout_until: 0, created_at, updated_at });
          } else {
            const [id, email, password_hash, salt, failed_attempts, lockout_until, role, created_at, updated_at] = args;
            users.set(id, { id, email, username: null, password_hash, salt, failed_attempts, lockout_until, role: role || 'candidate', status: 'active', created_at, updated_at });
          }
        } else if (q.startsWith('INSERT INTO candidates')) {
          if (q.includes('google_sub')) {
            const [id, full_name, email, password_hash, salt, google_sub, avatar_url] = args;
            candidates.set(id, { id, full_name, email, username: null, phone: '', district: 'Khordha (Bhubaneswar)', password_hash, salt, failed_attempts: 0, lockout_until: 0, target_streams: '["opsc","ossc"]', google_sub, avatar_url, auth_provider: 'google' });
          } else {
            const [id, full_name, email, phone, district, password_hash, salt, target_streams] = args;
            candidates.set(id, { id, full_name, email, username: null, phone, district, password_hash, salt, failed_attempts: 0, lockout_until: 0, target_streams });
          }
        } else if (q.startsWith('UPDATE users SET failed_attempts = 0')) {
          const u = users.get(args[1]);
          if (u) { u.failed_attempts = 0; u.lockout_until = 0; }
        } else if (q.startsWith('UPDATE users SET failed_attempts = ?')) {
          const u = users.get(args[2] ?? args[3]);
          if (u) { u.failed_attempts = args[0]; u.lockout_until = args[1]; }
        } else if (q.startsWith('UPDATE users SET google_sub')) {
          const u = users.get(args[3]);
          if (u) { u.google_sub = u.google_sub || args[0]; u.avatar_url = u.avatar_url || args[1]; }
        } else if (q.startsWith('UPDATE candidates SET google_sub')) {
          const c = candidates.get(args[2]);
          if (c) { c.google_sub = c.google_sub || args[0]; c.avatar_url = c.avatar_url || args[1]; }
        }
        return { success: true };
      },
      async all() {
        return { results: [] };
      }
    };
    return stmt;
  }

  return {
    users,
    candidates,
    sessions,
    prepare(sql) { return makeStmt(sql); },
    async batch(stmts) {
      const out = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    }
  };
}

let passed = 0;
let failed = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL ${name}: ${err && err.stack ? err.stack : err}`);
    failed++;
  }
}

await check('1. Static CSP, login UI, auth client, and SW cache v346 checks', async () => {
  const loginHtml = read('login.html');
  assert.ok(loginHtml.includes('id="login-email"') && loginHtml.includes('type="text"'), 'login-email must allow Email or User ID');
  assert.ok(loginHtml.includes('id="btn-google-login"') && loginHtml.includes('/api/auth/google?mode=login'), 'Google OAuth button must link to /api/auth/google');
  assert.ok(!/\.innerHTML\s*=|insertAdjacentHTML|style=|onclick=/i.test(read('assets/js/pages/login.js')), 'login.js must be CSP-safe');
  assert.ok(read('assets/js/pages/login.js').includes('identifier'), 'login.js must send identifier');
  assert.ok(read('assets/cso-auth-client.js').includes('data.identifier || data.userId || data.username || data.email'), 'cso-auth-client.js must support User ID or Email');
  assert.ok(read('sw.js').includes("const CACHE_NAME = 'cso-candidate-cache-v423';"), 'sw.js must be v367');
  assert.ok(read('sw.js').includes("url.pathname.startsWith('/api/auth/')"), 'sw.js must bypass /api/auth/');
  assert.ok(read('sw.js').includes("url.pathname.startsWith('/student-dashboard')"), 'sw.js must bypass /student-dashboard');
  const guardSrc = read('assets/js/student-auth-guard.js');
  assert.ok(guardSrc.includes("fetch('/api/auth/me'") && guardSrc.includes("credentials: 'include'"), 'student-auth-guard.js must verify session via /api/auth/me');
  assert.ok(read('assets/js/pages/login.js').includes('window.location.assign(targetUrl)'), 'login.js must navigate with window.location.assign');
  const workerSrc = read('_worker.js');
  assert.ok(workerSrc.includes('findAuthUserByIdentifier(env, rawIdentifier)'), '_worker.js must use findAuthUserByIdentifier');
  assert.ok(workerSrc.includes("startsWith('oauth_disabled_')"), '_worker.js must guard Google-only accounts');
  assert.ok(workerSrc.includes('constantTimeEqual(derivedHex, user.password_hash)'), '_worker.js must use constantTimeEqual');
});

await check('2. Candidate password login by Email & User ID + /api/auth/me roundtrip', async () => {
  const db = createMockD1();
  const { generateSalt, hashPassword } = await import('../functions/api/auth/_utils.js');
  const loginMod = await import('../functions/api/auth/login.js');
  const meMod = await import('../functions/api/auth/me.js');

  const salt = generateSalt();
  const pwHash = await hashPassword('CsoTest@2026', salt, 100000);
  const nowUnix = Math.floor(Date.now() / 1000);

  db.users.set('cso_usr_demo_1', {
    id: 'cso_usr_demo_1',
    email: 'aspirant@csodisha.com',
    username: 'aspirant_odisha',
    password_hash: pwHash,
    salt,
    role: 'candidate',
    status: 'active',
    failed_attempts: 0,
    lockout_until: 0,
    created_at: nowUnix,
    updated_at: nowUnix
  });
  db.candidates.set('cso_usr_demo_1', {
    id: 'cso_usr_demo_1',
    full_name: 'Aarav Mohanty',
    email: 'aspirant@csodisha.com',
    username: 'aspirant_odisha',
    phone: '9876543210',
    district: 'Khordha (Bhubaneswar)',
    password_hash: pwHash,
    salt,
    target_streams: '["opsc","ossc"]'
  });

  // Login by Email
  const emailRes = await loginMod.onRequestPost({
    request: new Request('https://csodisha.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '10.0.0.1' },
      body: JSON.stringify({ email: 'Aspirant@CSOdisha.com', password: 'CsoTest@2026' })
    }),
    env: { DB: db }
  });
  assert.equal(emailRes.status, 200);
  const emailData = await emailRes.json();
  assert.equal(emailData.success, true);
  assert.equal(emailData.candidate.id, 'cso_usr_demo_1');
  assert.ok(emailRes.headers.get('Set-Cookie').includes('cso_session='));
  assert.ok(emailRes.headers.get('Set-Cookie').includes('HttpOnly'));
  assert.ok(emailRes.headers.get('Cache-Control').includes('no-store'));

  // Login by User ID
  const idRes = await loginMod.onRequestPost({
    request: new Request('https://csodisha.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '10.0.0.2' },
      body: JSON.stringify({ identifier: 'CSO_USR_DEMO_1', password: 'CsoTest@2026' })
    }),
    env: { DB: db }
  });
  assert.equal(idRes.status, 200);
  const idData = await idRes.json();
  assert.equal(idData.success, true);
  assert.equal(idData.candidate.email, 'aspirant@csodisha.com');

  // Login by Username
  const userRes = await loginMod.onRequestPost({
    request: new Request('https://csodisha.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '10.0.0.3' },
      body: JSON.stringify({ identifier: 'aspirant_odisha', password: 'CsoTest@2026' })
    }),
    env: { DB: db }
  });
  assert.equal(userRes.status, 200);

  // Wrong password -> 401
  const badRes = await loginMod.onRequestPost({
    request: new Request('https://csodisha.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '10.0.0.4' },
      body: JSON.stringify({ identifier: 'aspirant@csodisha.com', password: 'WrongPassword1!' })
    }),
    env: { DB: db }
  });
  assert.equal(badRes.status, 401);

  // /api/auth/me with session cookie
  const meRes = await meMod.onRequestGet({
    request: new Request('https://csodisha.com/api/auth/me', {
      headers: { Cookie: `cso_session=${idData.token}` }
    }),
    env: { DB: db }
  });
  assert.equal(meRes.status, 200);
  const meData = await meRes.json();
  assert.equal(meData.authenticated, true);
  assert.equal(meData.user.id, 'cso_usr_demo_1');
});

await check('3. Google-only password guard + Google OAuth start & callback flow', async () => {
  const db = createMockD1();
  const loginMod = await import('../functions/api/auth/login.js');
  const { handleGoogleAuthStart, handleGoogleAuthCallback } = await import('../functions/api/auth/google.js');

  // Unconfigured Google OAuth -> graceful redirect with error code
  const unconfRes = await handleGoogleAuthStart({
    request: new Request('https://csodisha.com/api/auth/google?mode=login'),
    env: { DB: db }
  });
  assert.equal(unconfRes.status, 302);
  assert.equal(unconfRes.headers.get('Location'), '/login.html?error=google_not_configured');

  // Configured Google OAuth start -> 302 to Google + state cookie preserving next
  const startRes = await handleGoogleAuthStart({
    request: new Request('https://csodisha.com/api/auth/google?mode=login&next=%2Fstudy-library%2F'),
    env: { DB: db, GOOGLE_CLIENT_ID: 'test-client-id', GOOGLE_CLIENT_SECRET: 'test-secret' }
  });
  assert.equal(startRes.status, 302);
  const authLoc = new URL(startRes.headers.get('Location'));
  assert.equal(authLoc.hostname, 'accounts.google.com');
  assert.equal(authLoc.searchParams.get('redirect_uri'), 'https://csodisha.com/api/auth/google/callback');
  const state = authLoc.searchParams.get('state');
  const stateCookie = startRes.headers.get('Set-Cookie').split(';')[0];

  // Mock Google token + userinfo endpoints for callback
  const origFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.includes('oauth2.googleapis.com/token')) {
      return new Response(JSON.stringify({ access_token: 'mock-access-token' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (u.includes('googleapis.com/oauth2/v3/userinfo')) {
      return new Response(JSON.stringify({
        sub: 'google-sub-12345',
        email: 'google.aspirant@gmail.com',
        email_verified: true,
        name: 'Subham Panda'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    throw new Error('Unexpected fetch: ' + u);
  };

  try {
    const cbRes = await handleGoogleAuthCallback({
      request: new Request(`https://csodisha.com/api/auth/google/callback?code=auth-code&state=${state}`, {
        headers: { Cookie: stateCookie }
      }),
      env: { DB: db, GOOGLE_CLIENT_ID: 'test-client-id', GOOGLE_CLIENT_SECRET: 'test-secret' }
    });
    assert.equal(cbRes.status, 302);
    assert.equal(cbRes.headers.get('Location'), '/study-library/');
    const cookies = cbRes.headers.getSetCookie ? cbRes.headers.getSetCookie() : [cbRes.headers.get('Set-Cookie')];
    assert.ok(cookies.some(c => c.includes('cso_session=')), 'Google callback must set cso_session cookie');

    // Password login attempt on Google-only account returns helpful 401 instead of 500
    const pwOnGoogle = await loginMod.onRequestPost({
      request: new Request('https://csodisha.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '10.0.0.5' },
        body: JSON.stringify({ identifier: 'google.aspirant@gmail.com', password: 'SomePassword1!' })
      }),
      env: { DB: db }
    });
    assert.equal(pwOnGoogle.status, 401);
    const pwErr = await pwOnGoogle.json();
    assert.ok(pwErr.error.includes('Google Sign-In'), 'Should guide Google-only users to Google Sign-In');
  } finally {
    globalThis.fetch = origFetch;
  }
});

await check('4. End-to-end post-login Cookie -> /student-dashboard/ -> /api/auth/me (no redirect loop)', async () => {
  const db = createMockD1();
  const { generateSalt, hashPassword } = await import('../functions/api/auth/_utils.js');
  const loginMod = await import('../functions/api/auth/login.js');
  const meMod = await import('../functions/api/auth/me.js');

  const salt = generateSalt();
  const pwHash = await hashPassword('LoopGuard@2026', salt, 100000);
  const nowUnix = Math.floor(Date.now() / 1000);
  db.users.set('cso_usr_loop_1', {
    id: 'cso_usr_loop_1',
    email: 'looptest@csodisha.com',
    username: 'looptest',
    password_hash: pwHash,
    salt,
    role: 'candidate',
    status: 'active',
    failed_attempts: 0,
    lockout_until: 0,
    created_at: nowUnix,
    updated_at: nowUnix
  });
  db.candidates.set('cso_usr_loop_1', {
    id: 'cso_usr_loop_1',
    full_name: 'Loop Test Candidate',
    email: 'looptest@csodisha.com',
    username: 'looptest',
    phone: '9876543211',
    district: 'Cuttack',
    password_hash: pwHash,
    salt,
    target_streams: '["opsc"]'
  });

  // 1. POST /api/auth/login
  const loginRes = await loginMod.onRequestPost({
    request: new Request('https://csodisha.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': '10.0.0.9' },
      body: JSON.stringify({ identifier: 'looptest@csodisha.com', password: 'LoopGuard@2026' })
    }),
    env: { DB: db }
  });
  assert.equal(loginRes.status, 200);
  const loginJson = await loginRes.json();
  assert.equal(loginJson.ok, true);
  assert.equal(loginJson.authenticated, true);
  assert.ok(loginJson.user && loginJson.user.id === 'cso_usr_loop_1');
  const setCookie = loginRes.headers.get('Set-Cookie');
  assert.ok(setCookie && setCookie.includes('cso_session='));
  assert.ok(!/Domain=/i.test(setCookie), 'Session cookie must not hardcode a mismatched Domain attribute');
  const cookiePair = setCookie.split(';')[0];

  // 2. GET /api/auth/me with captured cookie
  const meRes = await meMod.onRequestGet({
    request: new Request('https://csodisha.com/api/auth/me', {
      headers: { Cookie: cookiePair }
    }),
    env: { DB: db }
  });
  assert.equal(meRes.status, 200);
  const meJson = await meRes.json();
  assert.equal(meJson.ok, true);
  assert.equal(meJson.authenticated, true);
  assert.equal(meJson.user.id, 'cso_usr_loop_1');

  // 3. Simulate student-auth-guard.js with empty localStorage + live /api/auth/me
  const vm = await import('node:vm');
  let redirectedTo = null;
  const store = new Map();
  const sandbox = {
    document: {
      documentElement: { setAttribute() {} },
      getElementById() { return null; }
    },
    window: {
      location: { replace(u) { redirectedTo = u; } },
      matchMedia: () => ({ matches: false })
    },
    localStorage: {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    },
    fetch: async (url) => {
      assert.equal(url, '/api/auth/me');
      return new Response(JSON.stringify(meJson), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  };
  vm.runInNewContext(read('assets/js/student-auth-guard.js'), sandbox);
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(redirectedTo, null, 'Authenticated cookie session must NOT redirect back to /login.html');
  assert.ok(store.get('cso_candidate_session_v1'), 'Guard must sync localStorage from /api/auth/me');
});

console.log(`\nCandidate Auth v346 verification: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
