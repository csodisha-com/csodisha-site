import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import {
  ensureMarketingAdvertisingBatch1Schema,
  handleMarketingAdvertisingBatch1Admin as H1
} from '../functions/_lib/marketing-advertising-batch1.js';
import {
  buildCanonicalUtmUrl,
  ensureMarketingAdvertisingBatch2Schema,
  getMarketingBatch2Overview,
  handleMarketingAdvertisingBatch2Admin as H2,
  handlePublicMarketingRefApi
} from '../functions/_lib/marketing-advertising-batch2.js';
import { requireRole, verifyCsrf, STAFF_ROLES } from '../functions/_lib/rbac.js';

function createMockDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, role TEXT NOT NULL DEFAULT 'candidate');
    CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL);
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT, actor_user_id TEXT, action TEXT NOT NULL,
      target_type TEXT, target_id TEXT, metadata_json TEXT, ip_address TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE TABLE admin_rate_limits (key TEXT PRIMARY KEY, window_start INTEGER NOT NULL, count INTEGER NOT NULL DEFAULT 0);
  `);
  return {
    async batch(stmts) {
      const out = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    },
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async first() { return db.prepare(sql).get(...args) || null; },
            async all() { return { results: db.prepare(sql).all(...args) }; },
            async run() {
              const info = db.prepare(sql).run(...args);
              return { success: true, meta: { changes: info.changes } };
            }
          };
        },
        async first() { return db.prepare(sql).get() || null; },
        async all() { return { results: db.prepare(sql).all() }; },
        async run() {
          const info = db.prepare(sql).run();
          return { success: true, meta: { changes: info.changes } };
        }
      };
    }
  };
}

const env = { DB: createMockDb() };
const staff = { userId: 'u_staff', email: 'editor@csodisha.com', role: 'editor' };
const req = (method, url, body = null) => {
  const opts = { method, headers: { Origin: 'https://csodisha.com', 'X-CSO-CSRF': '1' } };
  if (body !== null) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  return new Request(url, opts);
};
const B = 'https://csodisha.com/api/admin/marketing';
const jcall2 = async (method, path, id, sub, extra, body) => (await H2(req(method, `${B}/${path}`, body), env, staff, id, sub, extra)).json();
const jcall1 = async (method, path, id, sub, extra, body) => (await H1(req(method, `${B}/${path}`, body), env, staff, id, sub, extra)).json();
const rej = (p, status) => assert.rejects(() => p, err => err.status === status);

// 1. RBAC & CSRF protection
await rej(requireRole(new Request(`${B}/referrals`, { method: 'GET' }), env, STAFF_ROLES), 401);
assert.throws(
  () => verifyCsrf(new Request(`${B}/utm`, { method: 'POST', headers: { Origin: 'https://csodisha.com' } })),
  err => err.status === 403
);
assert.throws(
  () => verifyCsrf(new Request(`${B}/social-cards`, { method: 'POST', headers: { Origin: 'https://evil.example', 'X-CSO-CSRF': '1' } })),
  err => err.status === 403
);

// 2. Idempotent schema & starter seeds
await ensureMarketingAdvertisingBatch1Schema(env.DB);
await ensureMarketingAdvertisingBatch2Schema(env.DB);
await ensureMarketingAdvertisingBatch2Schema(env.DB);
const cnt = async t => (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${t}`).first()).n;
assert.equal(await cnt('mkt_referrals'), 3);
assert.equal(await cnt('mkt_campaign_analytics'), 4);
assert.equal(await cnt('mkt_utm_links'), 3);
assert.equal(await cnt('mkt_social_share_cards'), 2);

const ov = await getMarketingBatch2Overview(env);
assert.equal(ov.active_referral_partners, 3);
assert.equal(ov.governed_utm_links, 3);
assert.equal(ov.modules['05'].status, 'active');
assert.equal(ov.modules['08'].status, 'active');
assert.ok(ov.blended_campaign_roas > 1);

// 3. Module 05: Referral attribution & INR commission math + rollback
const rNew = (await jcall2('POST', 'referrals', 'referrals', undefined, undefined, {
  referral_code: 'SAMBALPUR-UNIV-26',
  partner_name: 'Sambalpur Study Circle',
  partner_type: 'campus_ambassador',
  district_odisha: 'Sambalpur',
  reward_paise_per_conv: 5000
})).item;
assert.equal(rNew.total_commission_paise, 0);

const rHit = (await jcall2('PATCH', `referrals/${rNew.id}/record-hit`, 'referrals', rNew.id, 'record-hit', {
  clicks: 12,
  signups: 4,
  paid_conversions: 3
})).item;
assert.equal(rHit.clicks_count, 12);
assert.equal(rHit.paid_conversions, 3);
assert.equal(rHit.total_commission_paise, 15000);
assert.equal(rHit.total_commission_inr, '₹150.00');

const revs05 = await jcall1('GET', `revisions?module_code=05&entity_id=${rNew.id}`, 'revisions');
assert.ok(revs05.items.length >= 2);
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs05.items[0].id });

// 4. Module 06: Campaign CTR/CVR/ROAS analytics & bucket ingest
const anaIng = (await jcall2('POST', 'analytics/ingest', 'analytics', 'ingest', undefined, {
  campaign_id: 'mkt-cmp-01',
  bucket_date: '2026-11-17',
  channel_key: 'social_organic',
  impressions: 10000,
  clicks: 500,
  paid_conversions: 25,
  spend_paise: 100000,
  attributed_revenue_paise: 500000
})).item;
assert.equal(anaIng.ctr_pct, 5);
assert.equal(anaIng.cvr_pct, 5);
assert.equal(anaIng.roas, 5);

const anaList = await jcall2('GET', 'analytics', 'analytics');
assert.ok(anaList.by_channel.length >= 4);
assert.ok(anaList.by_campaign.length >= 2);

// 5. Module 07: Canonical UTM URL generation & rollback
const built = buildCanonicalUtmUrl({
  base_url: 'https://csodisha.com/schemes/',
  utm_source: 'WhatsApp Channel',
  utm_medium: 'Social Share',
  utm_campaign: 'Subhadra Yojana 2026'
});
assert.equal(
  built.full_tagged_url,
  'https://csodisha.com/schemes/?utm_source=whatsapp_channel&utm_medium=social_share&utm_campaign=subhadra_yojana_2026'
);
const uNew = (await jcall2('POST', 'utm', 'utm', undefined, undefined, {
  label_en: 'Telegram OSSC CGL',
  base_url: 'https://csodisha.com/jobs/',
  utm_source: 'Telegram',
  utm_medium: 'Social',
  utm_campaign: 'OSSC CGL 2026'
})).item;
await jcall2('PATCH', `utm/${uNew.id}`, 'utm', uNew.id, undefined, { governance_status: 'draft' });
const revs07 = await jcall1('GET', `revisions?module_code=07&entity_id=${uNew.id}`, 'revisions');
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs07.items[0].id });

// 6. Module 08: Bilingual Social Share Card CRUD & rollback
const scNew = (await jcall2('POST', 'social-cards', 'social-cards', undefined, undefined, {
  target_path: '/mock-tests/',
  platform_preset: 'telegram_instant',
  og_title_en: '<script>x</script>OSSC CGL Mock Test',
  og_title_or: 'OSSC CGL ମକ୍ ଟେଷ୍ଟ'
})).item;
assert.equal(scNew.og_title_en, 'OSSC CGL Mock Test');
await jcall2('PATCH', `social-cards/${scNew.id}/status`, 'social-cards', scNew.id, 'status', { card_status: 'draft' });
const revs08 = await jcall1('GET', `revisions?module_code=08&entity_id=${scNew.id}`, 'revisions');
await jcall1('POST', 'revisions/rollback', 'revisions', 'rollback', undefined, { revision_id: revs08.items[0].id });

// 7. Public cookieless POST /api/marketing/ref
const refPub = await handlePublicMarketingRefApi(
  new Request('https://csodisha.com/api/marketing/ref', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ referral_code: 'CUTTACK-CAMPUS-26' })
  }),
  env
);
assert.equal(refPub.status, 200);
assert.equal(refPub.headers.get('Set-Cookie'), null);
const refPubJson = await refPub.json();
assert.equal(refPubJson.ok, true);
assert.equal(refPubJson.recorded, true);
assert.equal(refPubJson.cookieless, true);

console.log('✅ All Marketing & Advertising Batch 2 (05-08) tests passed!');
