// Integration test for the CMS against a LOCAL `wrangler dev` (default http://localhost:8799).
// Prereqs: local migrations applied + `node scripts/seed-local-users.mjs | wrangler d1 execute cso-database --local --file /dev/stdin`
const BASE = process.env.BASE || 'http://localhost:8799';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('  ✓', m); } else { fail++; console.log('  ✗ FAIL:', m); } };
async function login(email) {
  const r = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'Test-Pass-12345' }) });
  const c = (r.headers.get('set-cookie') || '').match(/cso_session=[^;]+/);
  if (!c) throw new Error('login failed for ' + email + ' ' + r.status);
  return c[0];
}
const call = (cookie, method, path, body, extra = {}) => fetch(BASE + path, {
  method, redirect: 'manual',
  headers: { ...(cookie ? { Cookie: cookie } : {}), ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
    ...(method !== 'GET' ? { Origin: BASE, 'X-CSO-CSRF': '1' } : {}), ...extra },
  body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined
});
const j = async r => { try { return await r.json(); } catch { return {}; } };

const admin = await login('admin@test.local'), editor = await login('editor@test.local'), cand = await login('cand@test.local');

console.log('Access control');
ok((await call(null, 'GET', '/api/admin/stats')).status === 401, 'anonymous → 401');
ok((await call(cand, 'GET', '/api/admin/stats')).status === 403, 'candidate → 403 on stats');
ok((await call(cand, 'POST', '/api/admin/current-affairs', { title: 'x' })).status === 403, 'candidate → 403 on create');
ok((await call(editor, 'GET', '/api/admin/stats')).status === 200, 'editor → 200 on stats');
ok((await call(editor, 'GET', '/api/admin/users')).status === 403, 'editor → 403 on users (admin-only)');
ok((await call(admin, 'GET', '/api/admin/users')).status === 200, 'admin → 200 on users');
const noCsrf = await fetch(BASE + '/api/admin/current-affairs', { method: 'POST', headers: { Cookie: editor, 'Content-Type': 'application/json' }, body: '{"title":"t"}' });
ok(noCsrf.status === 403 && (await j(noCsrf)).code === 'CSRF_REJECTED', 'missing CSRF header/origin → 403');
const badOrigin = await call(editor, 'POST', '/api/admin/current-affairs', { title: 't' }, { Origin: 'https://evil.example' });
ok(badOrigin.status === 403, 'cross-origin → 403');

console.log('Admin pages');
let r = await call(null, 'GET', '/admin/', null, { Accept: 'text/html' });
ok(r.status === 302 && r.headers.get('location').startsWith('/admin/login'), 'anonymous /admin/ → redirect to login');
r = await call(cand, 'GET', '/admin/', null, { Accept: 'text/html' });
ok(r.status === 403, 'candidate /admin/ → 403');
r = await call(editor, 'GET', '/admin/', null, { Accept: 'text/html' });
ok(r.status === 200 && /noindex/.test(r.headers.get('x-robots-tag') || '') && /script-src 'self'/.test(r.headers.get('content-security-policy') || ''), 'editor /admin/ → 200 + noindex + strict CSP');
ok(/script-src 'self'/.test(r.headers.get('content-security-policy') || '') && !/unsafe-(inline|eval)/.test(r.headers.get('content-security-policy') || ''), 'suite CSP has no unsafe-inline / unsafe-eval');
const html = await (await call(editor, 'GET', '/admin/', null, { Accept: 'text/html' })).text();
ok(/241 Modules/.test(html) && !/cdn\.tailwindcss|<style|<script>|\sonclick=|\sstyle=/.test(html), '/admin/ is the 241-module suite with no inline script/style/CDN');
r = await call(editor, 'GET', '/admin/legacy', null, { Accept: 'text/html' });
ok(r.status === 301 && r.headers.get('location') === '/admin/', '/admin/legacy redirects to the suite');
ok((await call(editor, 'GET', '/admin/admin.js')).status === 200 && (await call(cand, 'GET', '/admin/admin.js')).status === 403 && (await call(null, 'GET', '/admin/admin.js')).status === 401, 'suite assets are role-gated');
ok((await call(editor, 'GET', '/admin/data/legacy-api/verify.json')).status === 403, 'legacy fixtures stay admin-only');
ok((await call(admin, 'GET', '/admin/data/legacy-api/verify.json')).status === 200, 'admin can read legacy fixtures');
r = await call(null, 'GET', '/admin/login');
ok(r.status === 200, 'login page is public');
ok((await call(null, 'GET', '/migrations/0001_baseline.sql')).status === 404, 'migrations not publicly served');
ok((await call(null, 'GET', '/schema.sql')).status === 404, 'schema.sql not publicly served');

console.log('Current affairs lifecycle');
r = await call(editor, 'POST', '/api/admin/current-affairs', { title: '' });
ok(r.status === 422 && (await j(r)).fields.title, 'validation error with field details');
r = await call(editor, 'POST', '/api/admin/current-affairs', { title: 'Test <b>Update</b>', body_md: '# Hi\n<script>alert(1)</script> [x](javascript:alert(1)) **bold**', category: 'State', tags: 'a, b' });
const ca = await j(r); ok(r.status === 201 && ca.slug.startsWith('test-b-update-b'), 'create draft + auto slug');
r = await call(null, 'GET', '/api/content/current-affairs/' + ca.slug); ok(r.status === 404, 'draft not public');
r = await call(editor, 'POST', `/api/admin/current-affairs/${ca.id}/status`, { status: 'published' });
ok(r.status === 200, 'publish');
r = await call(null, 'GET', '/api/content/current-affairs/' + ca.slug); let d = await j(r);
ok(r.status === 200 && !/<script/i.test(d.body_html) && !/javascript:/i.test(d.body_html) && /<strong>bold<\/strong>/.test(d.body_html), 'public detail sanitised');
ok(/s-maxage=300/.test(r.headers.get('cache-control')), 'public cache headers');
r = await call(editor, 'POST', `/api/admin/current-affairs/${ca.id}/status`, { status: 'scheduled', published_at: new Date(Date.now() - 1000).toISOString() });
ok(r.status === 422, 'scheduling in the past rejected');
r = await call(editor, 'POST', `/api/admin/current-affairs/${ca.id}/status`, { status: 'scheduled', published_at: new Date(Date.now() + 3600e3).toISOString() });
ok(r.status === 200, 'schedule in future');
ok((await call(null, 'GET', '/api/content/current-affairs/' + ca.slug)).status === 404, 'scheduled-future not public');
const ca2 = await j(await call(editor, 'POST', '/api/admin/current-affairs', { title: 'Goes live', status: 'draft' }));
await call(editor, 'POST', `/api/admin/current-affairs/${ca2.id}/status`, { status: 'published' });
r = await call(null, 'GET', '/api/content/current-affairs?limit=5'); d = await j(r);
ok(d.items.some(i => i.id === ca2.id) && !d.items.some(i => i.id === ca.id), 'list shows only live items');
r = await call(editor, 'DELETE', `/api/admin/current-affairs/${ca2.id}`);
ok(r.status === 200 && (await call(null, 'GET', '/api/content/current-affairs/' + ca2.slug)).status === 404, 'soft delete hides item');

console.log('Jobs + media');
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
let fd = new FormData(); fd.append('file', new Blob([png], { type: 'image/png' }), 'c.png');
r = await call(editor, 'POST', '/api/admin/media/upload', fd); const up = await j(r);
ok(r.status === 201 && /^\/api\/media\/[0-9a-f-]{36}\.png$/.test(up.url), 'image upload');
fd = new FormData(); fd.append('file', new Blob([new Uint8Array([1, 2, 3, 4, 5, 6])], { type: 'image/png' }), 'fake.png');
r = await call(editor, 'POST', '/api/admin/media/upload', fd); ok(r.status === 415, 'magic-byte mismatch rejected');
fd = new FormData(); fd.append('file', new Blob(['hello'], { type: 'text/html' }), 'x.html');
r = await call(editor, 'POST', '/api/admin/media/upload', fd); ok(r.status === 415, 'disallowed MIME rejected');
fd = new FormData(); fd.append('file', new Blob([png], { type: 'image/png' }), 'c.png');
ok((await call(cand, 'POST', '/api/admin/media/upload', fd)).status === 403, 'candidate cannot upload');
r = await call(null, 'GET', up.url);
ok(r.status === 200 && /immutable/.test(r.headers.get('cache-control')) && r.headers.get('content-type') === 'image/png', 'public media served with immutable cache');
const pdf = new Blob(['%PDF-1.4\n%test'], { type: 'application/pdf' });
fd = new FormData(); fd.append('file', pdf, 'n.pdf'); const up2 = await j(await call(editor, 'POST', '/api/admin/media/upload', fd));
r = await call(editor, 'POST', '/api/admin/jobs', { title: 'Odisha Police SI', organisation: 'OSSC', vacancies: 100, last_date: '2027-01-31', apply_url: 'https://example.org/apply', notification_media_key: up2.key, cover_media_key: up.key, status: 'published' });
const job = await j(r); ok(r.status === 201, 'create published job with media');
r = await call(editor, 'POST', '/api/admin/jobs', { title: 'Bad', organisation: 'X', apply_url: 'javascript:alert(1)' });
ok(r.status === 422, 'non-http apply URL rejected');
d = await j(await call(null, 'GET', '/api/content/jobs')); ok(d.items.some(i => i.id === job.id && i.notification_url === '/api/media/' + up2.key && i.cover_url === up.url), 'job in public list with media URLs');

console.log('Mock tests + import');
r = await call(editor, 'POST', '/api/admin/mock-tests', { title: 'OSSC CGL Mock 1', target_exam: 'OSSC', duration_minutes: 60, total_marks: 100, negative_marking: 0.25 });
const t = await j(r); ok(r.status === 201, 'create mock test');
r = await call(editor, 'POST', `/api/admin/mock-tests/${t.id}/status`, { status: 'published' });
ok(r.status === 422, 'cannot publish test without questions');
const rows = [
  { question_en: 'Capital of Odisha?', option_a: 'Cuttack', option_b: 'Bhubaneswar', option_c: 'Puri', option_d: 'Sambalpur', correct_option: 'B', explanation: 'Bhubaneswar.' },
  { question_en: 'Bad row', option_a: 'a', option_b: 'b', option_c: 'c', option_d: 'd', correct_option: 'Z' }
];
r = await call(editor, 'POST', `/api/admin/mock-tests/${t.id}/import`, { rows }); d = await j(r);
ok(r.status === 200 && d.dry_run && d.valid_count === 1 && d.invalid_count === 1 && d.invalid[0].errors.correct_option, 'import dry-run report');
r = await call(editor, 'POST', `/api/admin/mock-tests/${t.id}/import`, { rows, dry_run: false });
ok(r.status === 422, 'commit with invalid rows rejected');
r = await call(editor, 'POST', `/api/admin/mock-tests/${t.id}/import`, { rows, dry_run: false, skip_invalid: true }); d = await j(r);
ok(r.status === 200 && d.imported === 1, 'import skipping invalid rows');
ok((await call(editor, 'POST', `/api/admin/mock-tests/${t.id}/status`, { status: 'published' })).status === 200, 'publish test with questions');
d = await j(await call(null, 'GET', '/api/content/mock-tests/' + 'ossc-cgl-mock-1'));
ok(d.questions && d.questions.length === 1 && !('correct_option' in d.questions[0]) && !('explanation' in d.questions[0]), 'public test hides answers');

console.log('Roles + audit');
const users = await j(await call(admin, 'GET', '/api/admin/users?q=cand'));
const cu = users.items[0];
r = await call(admin, 'PUT', `/api/admin/users/${cu.id}/role`, { role: 'editor' }); ok(r.status === 200, 'admin promotes candidate → editor');
ok((await call(cand, 'GET', '/api/admin/stats')).status === 200, 'promotion applies immediately (live role lookup)');
r = await call(admin, 'PUT', `/api/admin/users/${cu.id}/role`, { role: 'candidate' }); ok(r.status === 200, 'demoted again');
ok((await call(cand, 'GET', '/api/admin/stats')).status === 403, 'demotion applies immediately');
r = await call(admin, 'PUT', '/api/admin/users/u-admin/role', { role: 'editor' }); ok(r.status === 409, 'cannot demote self');
d = await j(await call(admin, 'GET', '/api/admin/audit')); ok(d.items.length > 5 && d.items.some(a => a.action === 'user.role_change'), 'audit log records actions');
r = await call(admin, 'POST', '/api/admin/preview', { markdown: '<img src=x onerror=alert(1)>' }); d = await j(r);
ok(!/<img/i.test(d.html), 'preview escapes raw HTML');
r = await call(null, 'GET', '/api/auth/me'); ok(r.status === 401, 'auth/me unaffected for anonymous');
d = await j(await call(editor, 'GET', '/api/auth/me')); ok(d.user && d.user.role === 'editor', 'auth/me reports live role');


console.log('Suite telemetry, banner, resources, incidents, accounts');
d = await j(await call(editor, 'GET', '/api/admin/stats'));
ok(d.accounts && d.accounts.total >= 3 && typeof d.audit_24h === 'number' && d.media && d.resources && 'open_incidents' in d && d.banner, 'stats exposes D1 telemetry (accounts, audit, media, resources, incidents, banner)');
d = await j(await call(null, 'GET', '/api/content/banner')); ok(d.active === false, 'banner inactive by default');
r = await call(editor, 'PUT', '/api/admin/banner', { active: true, headline: '', severity: 'info' }); ok(r.status === 422, 'cannot activate banner without headline');
r = await call(editor, 'PUT', '/api/admin/banner', { active: true, headline: 'x', ctaText: 'Go', ctaUrl: 'javascript:alert(1)' }); ok(r.status === 422, 'banner rejects javascript: link');
r = await call(editor, 'PUT', '/api/admin/banner', { active: true, headline: 'Hall ticket <b>out</b>', context: 'Download now', severity: 'urgent', ctaText: 'Open', ctaUrl: '/jobs-careers/' });
ok(r.status === 200, 'editor publishes banner');
r = await call(null, 'GET', '/api/content/banner'); d = await j(r);
ok(d.active === true && d.headline === 'Hall ticket <b>out</b>' && d.severity === 'urgent' && /max-age=15/.test(r.headers.get('cache-control')), 'public banner reflects D1 (raw text; client renders with textContent)');
ok((await call(cand, 'PUT', '/api/admin/banner', { active: false })).status === 403, 'candidate cannot edit banner');
ok((await call(null, 'PUT', '/api/admin/banner', { active: false })).status === 401, 'anonymous cannot edit banner');
r = await call(editor, 'PUT', '/api/admin/banner', { active: false, headline: '' }); ok(r.status === 200 && (await j(await call(null, 'GET', '/api/content/banner'))).active === false, 'banner deactivates');

const pdfRes = new Blob(['%PDF-1.4\n%syl'], { type: 'application/pdf' });
fd = new FormData(); fd.append('file', pdfRes, 'syl.pdf'); const up3 = await j(await call(editor, 'POST', '/api/admin/media/upload', fd));
r = await call(editor, 'POST', '/api/admin/resources', { kind: 'syllabus', title: 'OSSC CGL syllabus', exam: 'OSSC CGL', year: 2026, media_key: 'ffffffff-ffff-ffff-ffff-ffffffffffff.pdf' });
ok(r.status === 422, 'resource must reference an uploaded media asset');
r = await call(editor, 'POST', '/api/admin/resources', { kind: 'bogus', title: 'x', media_key: up3.key }); ok(r.status === 422, 'resource kind validated');
r = await call(editor, 'POST', '/api/admin/resources', { kind: 'pyq', title: 'OSSC CGL 2024 paper', exam: 'OSSC CGL', year: 2024, media_key: up3.key, status: 'draft' }); const res1 = await j(r);
ok(r.status === 201, 'create PYQ resource');
d = await j(await call(null, 'GET', '/api/content/resources?kind=pyq')); ok(!d.items.some(i => i.id === res1.id), 'draft resource not public');
ok((await call(editor, 'PUT', `/api/admin/resources/${res1.id}`, { status: 'published' })).status === 200, 'publish resource');
d = await j(await call(null, 'GET', '/api/content/resources?kind=pyq')); ok(d.items.some(i => i.id === res1.id && i.file_url === '/api/media/' + up3.key && !('media_key' in i)), 'published resource is public with R2 url');
d = await j(await call(editor, 'GET', '/api/admin/resources?kind=pyq&q=2024')); ok(d.total >= 1, 'resource list + search');
ok((await call(editor, 'DELETE', `/api/admin/resources/${res1.id}`)).status === 200 && !(await j(await call(null, 'GET', '/api/content/resources?kind=pyq'))).items.some(i => i.id === res1.id), 'resource soft delete hides it');
d = await j(await call(editor, 'GET', '/api/admin/media?kind=pdf')); ok(d.total >= 1 && d.items[0].url.startsWith('/api/media/'), 'media library lists R2 assets');
ok((await call(cand, 'GET', '/api/admin/media')).status === 403, 'candidate cannot list media');

r = await call(editor, 'POST', '/api/admin/incidents', { severity: 'bogus', title: 'x' }); ok(r.status === 422, 'incident severity validated');
r = await call(editor, 'POST', '/api/admin/incidents', { severity: 'high', title: 'OTP provider timeout', details: 'Resend latency > 10s' }); const inc = await j(r);
ok(r.status === 201 && inc.id, 'log incident');
d = await j(await call(editor, 'GET', '/api/admin/incidents')); ok(d.open >= 1 && d.items.some(i => i.id === inc.id && i.severity === 'high' && !i.resolved), 'incident stream shows open incident');
ok((await call(editor, 'POST', `/api/admin/incidents/${inc.id}/resolve`, {})).status === 200, 'resolve incident');
d = await j(await call(editor, 'GET', '/api/admin/incidents')); ok(d.items.some(i => i.id === inc.id && i.resolved), 'incident marked resolved');
d = await j(await call(editor, 'GET', '/api/admin/audit?kind=incident')); ok(d.items.length >= 2 && d.items.every(a => a.action.startsWith('incident.')), 'audit filter: incidents');
d = await j(await call(editor, 'GET', '/api/admin/audit?kind=content')); ok(d.items.length > 0 && d.items.every(a => !/^(incident|user)\./.test(a.action)), 'audit filter: content');
ok((await call(editor, 'GET', '/api/admin/audit?kind=nope')).status === 422, 'audit filter validated');

d = await j(await call(admin, 'GET', '/api/admin/users?q=cand'));
ok(d.items.length >= 1 && 'full_name' in d.items[0] && 'district' in d.items[0], 'candidate accounts include profile fields from D1');
d = await j(await call(admin, 'GET', '/api/admin/users?role=admin')); ok(d.items.length >= 1 && d.items.every(u => u.role === 'admin'), 'accounts role filter');

console.log('CBT grading, persistent attempts & leaderboards');
const cbtRes = await call(editor, 'POST', '/api/admin/mock-tests', {
  title: 'OPSC OCS Prelims GS Mock',
  target_exam: 'OPSC',
  duration_minutes: 30,
  total_marks: 5,
  negative_marking: 0.25
});
const cbtTest = await j(cbtRes);
ok(cbtRes.status === 201 && cbtTest.id, 'create CBT grading mock test');
const cbtQuestions = [
  { section: 'Polity', question_en: 'Capital of Odisha?', option_a: 'Cuttack', option_b: 'Bhubaneswar', option_c: 'Puri', option_d: 'Sambalpur', correct_option: 'B', marks: 2, explanation: 'Bhubaneswar became capital in 1948.' },
  { section: 'Geography', question_en: 'Longest river of Odisha?', option_a: 'Mahanadi', option_b: 'Brahmani', option_c: 'Baitarani', option_d: 'Rushikulya', correct_option: 'A', marks: 2, explanation: 'Mahanadi is the longest river in Odisha.' },
  { section: 'History', question_en: 'Builder of Konark Sun Temple?', option_a: 'Kharavela', option_b: 'Anantavarman', option_c: 'Narasimhadeva I', option_d: 'Kapilendra Deva', correct_option: 'C', marks: 1, explanation: 'Built by King Narasimhadeva I of Eastern Ganga dynasty.' }
];
await call(editor, 'POST', `/api/admin/mock-tests/${cbtTest.id}/import`, { rows: cbtQuestions, dry_run: false });
await call(editor, 'POST', `/api/admin/mock-tests/${cbtTest.id}/status`, { status: 'published' });

const pubTest = await j(await call(null, 'GET', `/api/content/mock-tests/${cbtTest.slug}`));
ok(
  pubTest.questions && pubTest.questions.length === 3 &&
  pubTest.questions.every(q => !('correct_option' in q) && !('explanation' in q)),
  'public test payload conceals correct_option and explanation before submit'
);
const [q1, q2, q3] = pubTest.questions;

const cbtNoCsrf = await fetch(`${BASE}/api/content/mock-tests/${cbtTest.slug}/submit`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ answers: { [q1.id]: 'B' }, timeTakenSec: 30 })
});
ok(cbtNoCsrf.status === 403 && (await j(cbtNoCsrf)).code === 'CSRF_REJECTED', 'CBT submit enforces CSRF protection');

// Guest submission: Q1 correct (+2), Q2 wrong (-0.25), Q3 unanswered (0) => 1.75 / 5, accuracy 50%
const guestSubRes = await call(null, 'POST', `/api/content/mock-tests/${cbtTest.slug}/submit`, {
  answers: { [q1.id]: 'B', [q2.id]: 'D' },
  timeTakenSec: 95,
  score: 999 // server must ignore client-supplied score
});
const guestSub = await j(guestSubRes);
ok(
  guestSubRes.status === 200 &&
  guestSub.persisted === false &&
  guestSub.score === 1.75 &&
  guestSub.maxScore === 5 &&
  guestSub.correctCount === 1 &&
  guestSub.wrongCount === 1 &&
  guestSub.unansweredCount === 1 &&
  guestSub.accuracy === 50 &&
  guestSub.breakdown.length === 3 &&
  guestSub.breakdown[0].correctOption === 'B' &&
  guestSub.breakdown[0].explanation.includes('1948'),
  'guest CBT submission grades server-side (+marks / -negative) without persisting'
);

// Authenticated candidate submission #1: 1.75 / 5 in 80s
const candSub1 = await j(await call(cand, 'POST', `/api/content/mock-tests/${cbtTest.slug}/submit`, {
  answers: { [q1.id]: 'B', [q2.id]: 'D' },
  timeTakenSec: 80
}));
ok(
  candSub1.persisted === true &&
  typeof candSub1.attemptId === 'string' &&
  candSub1.score === 1.75 &&
  candSub1.rank === 1 &&
  candSub1.totalAttempts === 1,
  'authenticated candidate CBT attempt persists to D1 and computes rank #1'
);

// Second user (editor) submits perfect score 5 / 5 in 45s -> claims rank #1
const edSub = await j(await call(editor, 'POST', `/api/content/mock-tests/${cbtTest.slug}/submit`, {
  answers: { [q1.id]: 'B', [q2.id]: 'A', [q3.id]: 'C' },
  timeTakenSec: 45
}));
ok(edSub.persisted === true && edSub.score === 5 && edSub.accuracy === 100 && edSub.rank === 1, 'higher score claims rank #1');

// Candidate submits improved attempt: Q1 correct (+2), Q2 correct (+2), Q3 wrong (-0.25) => 3.75 in 60s -> rank #2
const candSub2 = await j(await call(cand, 'POST', `/api/content/mock-tests/${cbtTest.slug}/submit`, {
  answers: { [q1.id]: 'B', [q2.id]: 'A', [q3.id]: 'D' },
  timeTakenSec: 60
}));
ok(candSub2.persisted === true && candSub2.score === 3.75 && candSub2.rank === 2 && candSub2.totalAttempts === 3, 'candidate improved attempt updates rank (#2 behind 5.0)');

// Leaderboard returns top 10 best-score-per-user (1 row per user, ordered by score DESC, time_taken_sec ASC)
const lbRes = await call(null, 'GET', `/api/content/mock-tests/${cbtTest.slug}/leaderboard`);
const lb = await j(lbRes);
ok(
  lbRes.status === 200 &&
  Array.isArray(lb.items) &&
  lb.items.length === 2 &&
  lb.items[0].rank === 1 && lb.items[0].score === 5 &&
  lb.items[1].rank === 2 && lb.items[1].score === 3.75 &&
  lb.items.every(row => row.displayName && !row.displayName.includes('@')),
  'leaderboard deduplicates best score per user and masks email PII'
);

// User attempts history endpoint
ok((await call(null, 'GET', '/api/user/attempts')).status === 401, 'anonymous /api/user/attempts → 401');
const attHist = await j(await call(cand, 'GET', '/api/user/attempts'));
ok(
  Array.isArray(attHist.items) &&
  attHist.items.length >= 2 &&
  attHist.items[0].score === 3.75 &&
  attHist.items[0].title === 'OPSC OCS Prelims GS Mock' &&
  attHist.items[0].target_exam === 'OPSC',
  'authenticated /api/user/attempts returns user attempts joined with test title & exam'
);

console.log('Cross-device D1 bookmarks & user isolation');
ok((await call(null, 'GET', '/api/user/bookmarks')).status === 401, 'anonymous /api/user/bookmarks → 401');
const bmNoCsrf = await fetch(`${BASE}/api/user/bookmarks`, {
  method: 'POST',
  headers: { Cookie: cand, 'Content-Type': 'application/json' },
  body: JSON.stringify({ item_type: 'job', item_id: 'j1', title: 'Job 1', url: '/jobs-careers/' })
});
ok(bmNoCsrf.status === 403, 'POST /api/user/bookmarks enforces CSRF');
ok((await call(cand, 'POST', '/api/user/bookmarks', { item_type: 'bogus', item_id: 'x', title: 'T', url: '/jobs-careers/' })).status === 422, 'bookmark item_type validated');
ok((await call(cand, 'POST', '/api/user/bookmarks', { item_type: 'job', item_id: 'x', title: 'T', url: 'javascript:alert(1)' })).status === 422, 'bookmark rejects javascript: URL');

r = await call(cand, 'POST', '/api/user/bookmarks', {
  item_type: 'job',
  item_id: 'opsc-ocs-2026',
  title: 'OPSC OCS 2026 Notification',
  url: '/jobs-careers/?job=opsc-ocs-2026',
  meta: { badge: 'OPSC', deadline: '2027-01-31' }
});
ok(r.status === 201, 'candidate saves job bookmark to D1');

r = await call(cand, 'POST', '/api/user/bookmarks', {
  item_type: 'mock-test',
  item_id: cbtTest.slug,
  title: cbtTest.title || 'OPSC OCS Prelims GS Mock',
  url: `/mock-tests/?test=${cbtTest.slug}`,
  meta: { badge: 'Mock Test · OPSC' }
});
ok(r.status === 201, 'candidate saves mock-test bookmark to D1');

d = await j(await call(cand, 'GET', '/api/user/bookmarks'));
ok(d.total === 2 && d.items.some(b => b.item_type === 'job' && b.item_id === 'opsc-ocs-2026' && b.meta.badge === 'OPSC'), 'GET /api/user/bookmarks lists candidate bookmarks');

// Bulk sync guest localStorage bookmarks
const syncRes = await call(cand, 'POST', '/api/user/bookmarks/sync', {
  items: [
    { item_type: 'current-affair', item_id: 'odisha-budget-2026', title: 'Odisha Budget Highlights', url: '/current-affairs/?slug=odisha-budget-2026', meta: { badge: 'Economy' } },
    { item_type: 'resource', item_id: 'ossc-cgl-syllabus', title: 'OSSC CGL Official Syllabus', url: '/resources/', meta: { badge: 'Syllabus' } }
  ]
});
const syncData = await j(syncRes);
ok(syncRes.status === 200 && syncData.synced === 2 && syncData.total === 4, 'POST /api/user/bookmarks/sync merges guest bookmarks into D1');

// Cross-user isolation: editor cannot read or delete cand's bookmarks
const edBmList = await j(await call(editor, 'GET', '/api/user/bookmarks'));
ok(edBmList.total === 0, 'cross-user isolation: editor sees 0 of candidate bookmarks');
const edDel = await j(await call(editor, 'DELETE', '/api/user/bookmarks/job/opsc-ocs-2026'));
ok(edDel.deleted === false, 'cross-user isolation: editor cannot delete candidate bookmark');
ok((await j(await call(cand, 'GET', '/api/user/bookmarks'))).total === 4, 'candidate bookmarks remain intact after other user delete attempt');

// Candidate deletes own bookmark
const candDel = await j(await call(cand, 'DELETE', '/api/user/bookmarks/job/opsc-ocs-2026'));
ok(candDel.deleted === true && (await j(await call(cand, 'GET', '/api/user/bookmarks'))).total === 3, 'candidate deletes own bookmark from D1');

// Admin stats telemetry includes attempts_total and bookmarks_total
const statsAfter = await j(await call(editor, 'GET', '/api/admin/stats'));
ok(statsAfter.attempts_total >= 3 && statsAfter.bookmarks_total >= 3, 'GET /api/admin/stats includes live attempts_total and bookmarks_total');

console.log('Wired public frontend pages + strict CSP');
for (const [pagePath, scriptPath, apiEndpoint] of [
  ['/jobs-careers/', '/jobs-careers/assets/dashboard.js', '/api/content/jobs'],
  ['/current-affairs/', '/current-affairs/assets/current-affairs.js', '/api/content/current-affairs'],
  ['/mock-tests/', '/mock-tests/assets/mock-tests.js', '/api/content/mock-tests'],
  ['/resources/', '/resources/assets/resources.js', '/api/content/resources']
]) {
  const pr = await call(null, 'GET', pagePath, null, { Accept: 'text/html' });
  const pHtml = await pr.text();
  const csp = pr.headers.get('content-security-policy') || '';
  ok(pr.status === 200 && /script-src 'self'/.test(csp) && /style-src 'self'/.test(csp) && !/unsafe-(inline|eval)/.test(csp), `${pagePath} returns 200 with strict CSP`);
  ok(!/<style|<script(?![^>]*\bsrc=)|\son[a-z]+=|\sstyle=/i.test(pHtml), `${pagePath} has no inline scripts, styles, or handlers`);
  const sr = await call(null, 'GET', scriptPath);
  const sCode = await sr.text();
  ok(sr.status === 200 && sCode.includes(apiEndpoint) && !/\.innerHTML\s*=/.test(sCode) && !/\.style\./.test(sCode), `${scriptPath} wired to ${apiEndpoint} with safe DOM rendering and zero inline style mutations`);
}

for (const sharedScript of ['/assets/js/public-content.js', '/assets/js/bookmark-manager.js', '/assets/shared-header.js']) {
  const sr = await call(null, 'GET', sharedScript);
  const sCode = await sr.text();
  ok(sr.status === 200 && !/\.innerHTML\s*=/.test(sCode) && !/\.style\./.test(sCode), `${sharedScript} has zero innerHTML and zero inline style assignments`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
