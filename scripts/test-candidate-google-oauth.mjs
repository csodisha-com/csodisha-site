import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { handleGoogleAuthStart, handleGoogleAuthCallback } from '../functions/api/auth/google.js';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

function createMockDb(seedUsers = [], seedCandidates = []) {
  const users = [...seedUsers];
  const candidates = [...seedCandidates];
  const sessions = [];

  const execSql = (sql, params = []) => {
    const s = sql.replace(/\s+/g, ' ').trim();
    if (/^SELECT .* FROM users WHERE google_sub = \? OR LOWER\(email\) = \?/i.test(s)) {
      const [sub, email] = params;
      return { first: users.find((u) => u.google_sub === sub || String(u.email).toLowerCase() === email) || null };
    }
    if (/^SELECT .* FROM candidates WHERE google_sub = \? OR LOWER\(email\) = \?/i.test(s)) {
      const [sub, email] = params;
      return { first: candidates.find((c) => c.google_sub === sub || String(c.email).toLowerCase() === email) || null };
    }
    if (/^INSERT INTO users/i.test(s)) {
      const [id, email, password_hash, salt, google_sub, avatar_url, created_at, updated_at] = params;
      users.push({ id, email, password_hash, salt, role: 'candidate', google_sub, avatar_url, auth_provider: 'google', created_at, updated_at });
      return { run: { success: true } };
    }
    if (/^INSERT INTO candidates/i.test(s)) {
      const [id, full_name, email, password_hash, salt, google_sub, avatar_url] = params;
      candidates.push({ id, full_name, email, password_hash, salt, google_sub, avatar_url, auth_provider: 'google' });
      return { run: { success: true } };
    }
    if (/^UPDATE users/i.test(s)) {
      const [sub, avatar, updatedAt, id] = params;
      const u = users.find((x) => x.id === id);
      if (u) {
        u.google_sub = u.google_sub || sub;
        u.avatar_url = u.avatar_url || avatar;
        u.updated_at = updatedAt;
      }
      return { run: { success: true } };
    }
    if (/^UPDATE candidates/i.test(s)) {
      const [sub, avatar, id] = params;
      const c = candidates.find((x) => x.id === id);
      if (c) {
        c.google_sub = c.google_sub || sub;
        c.avatar_url = c.avatar_url || avatar;
      }
      return { run: { success: true } };
    }
    if (/^INSERT INTO sessions/i.test(s)) {
      const [token, user_id, email, role, created_at, expires_at] = params;
      sessions.push({ token, user_id, email, role, created_at, expires_at });
      return { run: { success: true } };
    }
    return { first: null, run: { success: true } };
  };

  return {
    users,
    candidates,
    sessions,
    prepare(sql) {
      let bound = [];
      return {
        bind(...args) {
          bound = args;
          return this;
        },
        async first() {
          return execSql(sql, bound).first;
        },
        async run() {
          return execSql(sql, bound).run;
        },
        _exec() {
          return execSql(sql, bound);
        }
      };
    },
    async batch(stmts) {
      return stmts.map((st) => st._exec());
    }
  };
}

let passed = 0;
async function test(name, fn) {
  await fn();
  console.log(`  PASS  ${name}`);
  passed += 1;
}

console.log('\n=== Candidate Google OAuth 2.0 Verification ===\n');

await test('1. GET /api/auth/google handles unconfigured credentials gracefully', async () => {
  const resLogin = await handleGoogleAuthStart({
    request: new Request('https://csodisha.com/api/auth/google?mode=login'),
    env: {}
  });
  assert.equal(resLogin.status, 302);
  assert.equal(resLogin.headers.get('Location'), '/login.html?error=google_not_configured');

  const resSignup = await handleGoogleAuthStart({
    request: new Request('https://csodisha.com/api/auth/google?mode=signup'),
    env: {}
  });
  assert.equal(resSignup.status, 302);
  assert.equal(resSignup.headers.get('Location'), '/signup.html?error=google_not_configured');
});

await test('2. GET /api/auth/google redirects to Google with state & HttpOnly cookie', async () => {
  const res = await handleGoogleAuthStart({
    request: new Request('https://csodisha.com/api/auth/google?mode=signup'),
    env: { GOOGLE_CLIENT_ID: 'cid_test_123', GOOGLE_CLIENT_SECRET: 'sec_test_456' }
  });
  assert.equal(res.status, 302);
  const loc = new URL(res.headers.get('Location'));
  assert.equal(loc.origin + loc.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(loc.searchParams.get('client_id'), 'cid_test_123');
  assert.equal(loc.searchParams.get('redirect_uri'), 'https://csodisha.com/api/auth/google/callback');
  assert.equal(loc.searchParams.get('scope'), 'openid email profile');
  assert.equal(loc.searchParams.get('prompt'), 'select_account');
  const state = loc.searchParams.get('state');
  assert.ok(state && state.length >= 32);

  const setCookie = res.headers.get('Set-Cookie') || '';
  assert.ok(setCookie.includes('cso_oauth_state='), 'sets state cookie');
  assert.ok(setCookie.includes('HttpOnly') && setCookie.includes('Secure') && setCookie.includes('SameSite=Lax'));
});

await test('3. GET /api/auth/google/callback rejects CSRF state mismatch & clears cookie', async () => {
  const db = createMockDb();
  const res = await handleGoogleAuthCallback({
    request: new Request('https://csodisha.com/api/auth/google/callback?code=abc&state=wrong_state', {
      headers: { Cookie: `cso_oauth_state=${encodeURIComponent('0123456789abcdef0123456789abcdef0123456789abcdef:login')}` }
    }),
    env: { DB: db, GOOGLE_CLIENT_ID: 'cid_test_123', GOOGLE_CLIENT_SECRET: 'sec_test_456' }
  });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('Location'), '/login.html?error=google_auth_failed');
  assert.ok((res.headers.get('Set-Cookie') || '').includes('Max-Age=0'));
});

await test('4. Callback provisions new candidate, signs in existing candidate, and blocks admin accounts', async () => {
  const validState = '0123456789abcdef0123456789abcdef0123456789abcdef';
  const origFetch = globalThis.fetch;

  const idPayload = Buffer.from(JSON.stringify({
    aud: 'cid_test_123',
    sub: 'google_sub_999',
    email: 'aspirant.odisha@example.com',
    email_verified: true,
    name: 'Subham Mohanty'
  })).toString('base64url');
  const fakeIdToken = `hdr.${idPayload}.sig`;

  globalThis.fetch = async (url) => {
    const u = String(url);
    if (u.startsWith('https://oauth2.googleapis.com/token')) {
      return new Response(JSON.stringify({ access_token: 'tok_abc', id_token: fakeIdToken }), { status: 200 });
    }
    if (u.startsWith('https://www.googleapis.com/oauth2/v3/userinfo')) {
      return new Response(JSON.stringify({
        sub: 'google_sub_999',
        email: 'aspirant.odisha@example.com',
        email_verified: true,
        name: 'Subham Mohanty',
        picture: 'https://lh3.googleusercontent.com/a/avatar'
      }), { status: 200 });
    }
    throw new Error('Unexpected fetch: ' + u);
  };

  try {
    // 4a. New candidate
    const dbNew = createMockDb();
    const resNew = await handleGoogleAuthCallback({
      request: new Request(`https://csodisha.com/api/auth/google/callback?code=ok&state=${validState}`, {
        headers: { Cookie: `cso_oauth_state=${encodeURIComponent(validState + ':signup')}` }
      }),
      env: { DB: dbNew, GOOGLE_CLIENT_ID: 'cid_test_123', GOOGLE_CLIENT_SECRET: 'sec_test_456' }
    });
    assert.equal(resNew.status, 302);
    assert.equal(resNew.headers.get('Location'), '/student-dashboard/?welcome=1');
    assert.equal(dbNew.users.length, 1);
    assert.equal(dbNew.candidates.length, 1);
    assert.equal(dbNew.sessions.length, 1);
    assert.equal(dbNew.sessions[0].role, 'candidate');

    // 4b. Existing candidate
    const resExisting = await handleGoogleAuthCallback({
      request: new Request(`https://csodisha.com/api/auth/google/callback?code=ok&state=${validState}`, {
        headers: { Cookie: `cso_oauth_state=${encodeURIComponent(validState + ':login')}` }
      }),
      env: { DB: dbNew, GOOGLE_CLIENT_ID: 'cid_test_123', GOOGLE_CLIENT_SECRET: 'sec_test_456' }
    });
    assert.equal(resExisting.status, 302);
    assert.equal(resExisting.headers.get('Location'), '/student-dashboard/');
    assert.equal(dbNew.users.length, 1);
    assert.equal(dbNew.sessions.length, 2);

    // 4c. Admin isolation
    const dbAdmin = createMockDb([{ id: 'adm_1', email: 'aspirant.odisha@example.com', role: 'admin' }], []);
    const resAdmin = await handleGoogleAuthCallback({
      request: new Request(`https://csodisha.com/api/auth/google/callback?code=ok&state=${validState}`, {
        headers: { Cookie: `cso_oauth_state=${encodeURIComponent(validState + ':login')}` }
      }),
      env: { DB: dbAdmin, GOOGLE_CLIENT_ID: 'cid_test_123', GOOGLE_CLIENT_SECRET: 'sec_test_456' }
    });
    assert.equal(resAdmin.status, 302);
    assert.equal(resAdmin.headers.get('Location'), '/login.html?error=google_admin_blocked');
    assert.equal(dbAdmin.sessions.length, 0);
  } finally {
    globalThis.fetch = origFetch;
  }
});

await test('5. Strict CSP, Admin isolation, migration 0147 & /login.html + /signup.html UI wiring', async () => {
  const mig = read('migrations/0147_candidate_google_oauth.sql');
  assert.ok(mig.includes('google_sub TEXT') && mig.includes('avatar_url TEXT') && mig.includes('auth_provider TEXT'));

  for (const page of ['login.html', 'signup.html']) {
    const html = read(page);
    assert.ok(html.includes('btn-google-oauth'), `${page} must render .btn-google-oauth`);
    assert.ok(html.includes('or continue with email'), `${page} must render email divider`);
    assert.ok(!html.includes('accounts.google.com/gsi/client'), `${page} must not load external GSI script`);
    assert.ok(!/\son[a-z]+\s*=|\sstyle\s*=/i.test(html), `${page} must remain strictly CSP-safe`);
  }

  const adminLogin = read('admin/login.html');
  assert.ok(!adminLogin.includes('/api/auth/google') && !adminLogin.includes('btn-google-oauth'), 'admin/login.html must stay isolated from Google OAuth');
});

console.log(`\n=== Candidate Google OAuth Results: ${passed} passed, 0 failed ===\n`);
