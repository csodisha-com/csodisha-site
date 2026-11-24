// Educational Resources Batch 5 (v82): Modules 17-20
// 17 Downloads & Access Rules | 18 Government Schemes | 19 Scholarships | 20 Career Explorer
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, slugify, likeEscape } from './validate.js';
import { ensureEduResourcesBatch4Schema } from './edu-resources-batch4.js';
import { ensureSchemesDirectoryStudioSchema } from './schemes-directory-studio.js';

export const B5_STATUSES = ['draft', 'scheduled', 'published', 'archived'];
export const RULE_SCOPES = ['all_resources', 'notes_pdf', 'book_reference', 'pyq_paper', 'mock_test', 'collection'];
export const RULE_POLICIES = ['public_open', 'registered_free', 'verified_student', 'rate_limited'];
export const SCHOLARSHIP_PROVIDERS = ['Odisha State Govt', 'Central Govt / NSP', 'UGC / AICTE / CSIR', 'Private / CSR Foundation'];
export const SCHOLARSHIP_CATEGORIES = ['All', 'SC/ST', 'OBC/SEBC', 'Minority', 'EWS', 'Girls/Women', 'PwD'];
export const CAREER_STAGES = ['After Class 10', 'After +2 Science', 'After +2 Arts', 'After +2 Commerce', 'After Graduation', 'After Post-Graduation'];
export const CAREER_DOMAINS = ['Civil Services & Admin', 'Teaching & Academia', 'Engineering & IT', 'Medical & Allied Health', 'Banking & Finance', 'Defence & Police', 'Skill & Entrepreneurship'];

const _b5Ready = new WeakSet();

function parseJson(raw, fallback) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || !raw.trim()) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

function parseTags(raw) {
  let arr = raw;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (t.startsWith('[')) { try { arr = JSON.parse(t); } catch { arr = t.split(','); } }
    else arr = t ? t.split(',') : [];
  }
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map(x => cleanStr(x, 48).toLowerCase()).filter(Boolean))].slice(0, 16);
}

function validateSafeUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^(javascript|data|vbscript)\s*:/i.test(s)) {
    throw new HttpError(400, 'INVALID_URL', 'URL cannot use javascript:, data:, or vbscript: schemes.');
  }
  if (s.startsWith('/')) return s.slice(0, 500);
  let u;
  try { u = new URL(s); } catch {
    throw new HttpError(400, 'INVALID_URL', 'URL must be a relative path (/...) or valid http(s) URL.');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new HttpError(400, 'INVALID_URL', 'URL must use http:// or https://.');
  }
  return u.toString().slice(0, 500);
}

function sanitizeLinks(raw) {
  const list = parseJson(raw, []);
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const entry of list.slice(0, 15)) {
    if (!entry || typeof entry !== 'object') continue;
    const label = cleanStr(entry.label || entry.title || 'Official Link', 100);
    const url = validateSafeUrl(entry.url || '');
    if (!url) continue;
    out.push({
      label,
      url,
      type: cleanStr(entry.type || 'official', 30) || 'official',
      link_status: cleanStr(entry.link_status || 'unchecked', 20) || 'unchecked'
    });
  }
  return out;
}

async function saveB5Revision(db, moduleCode, entityId, snapshot, note, actorEmail) {
  const verRow = await db.prepare(
    `SELECT COALESCE(MAX(version_num), 0) AS max_v FROM edu_batch5_revisions WHERE module_code = ? AND entity_id = ?`
  ).bind(moduleCode, entityId).first();
  const nextVer = Number(verRow?.max_v || 0) + 1;
  const revId = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO edu_batch5_revisions (id, module_code, entity_id, version_num, snapshot_json, change_note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(revId, moduleCode, entityId, nextVer, JSON.stringify(snapshot), cleanStr(note || '', 200), cleanStr(actorEmail || 'system', 120)).run();
}

const STARTER_RULES = [];

const STARTER_SCHOLARSHIPS = [];

const STARTER_CAREERS = [];

export async function ensureEduResourcesBatch5Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureEduResourcesBatch4Schema(db);
  await ensureSchemesDirectoryStudioSchema(db);
  if (_b5Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS edu_access_rules (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      rule_name_en TEXT NOT NULL,
      rule_name_or TEXT NOT NULL DEFAULT '',
      target_scope TEXT NOT NULL DEFAULT 'all_resources' CHECK (target_scope IN (
        'all_resources', 'notes_pdf', 'book_reference', 'pyq_paper', 'mock_test', 'collection'
      )),
      access_policy TEXT NOT NULL DEFAULT 'public_open' CHECK (access_policy IN (
        'public_open', 'registered_free', 'verified_student', 'rate_limited'
      )),
      daily_download_limit INTEGER NOT NULL DEFAULT 0,
      watermark_footer_enabled INTEGER NOT NULL DEFAULT 1,
      watermark_text_template TEXT NOT NULL DEFAULT 'Downloaded from Common Sense Odisha (csodisha.com) — Free Public Education',
      offline_cache_allowed INTEGER NOT NULL DEFAULT 1,
      attribution_required INTEGER NOT NULL DEFAULT 1,
      priority_order INTEGER NOT NULL DEFAULT 10,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_access_rules_scope ON edu_access_rules(target_scope, status, priority_order)`,
    `CREATE TABLE IF NOT EXISTS edu_scholarships (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      provider_type TEXT NOT NULL DEFAULT 'Odisha State Govt' CHECK (provider_type IN (
        'Odisha State Govt', 'Central Govt / NSP', 'UGC / AICTE / CSIR', 'Private / CSR Foundation'
      )),
      department_or_agency TEXT NOT NULL DEFAULT '',
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      eligible_stages_json TEXT NOT NULL DEFAULT '[]',
      category_eligibility TEXT NOT NULL DEFAULT 'All' CHECK (category_eligibility IN (
        'All', 'SC/ST', 'OBC/SEBC', 'Minority', 'EWS', 'Girls/Women', 'PwD'
      )),
      income_limit_inr INTEGER NOT NULL DEFAULT 0,
      min_marks_pct REAL NOT NULL DEFAULT 0,
      award_amount_text TEXT NOT NULL DEFAULT '',
      application_start TEXT NOT NULL DEFAULT '',
      application_deadline TEXT NOT NULL DEFAULT '',
      apply_url TEXT NOT NULL DEFAULT '',
      r2_key TEXT NOT NULL DEFAULT '',
      file_url TEXT NOT NULL DEFAULT '',
      external_links_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_schol_status_cat ON edu_scholarships(status, category_eligibility, application_deadline)`,
    `CREATE TABLE IF NOT EXISTS edu_career_paths (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      entry_stage TEXT NOT NULL DEFAULT 'After +2 Science' CHECK (entry_stage IN (
        'After Class 10', 'After +2 Science', 'After +2 Arts', 'After +2 Commerce', 'After Graduation', 'After Post-Graduation'
      )),
      career_domain TEXT NOT NULL DEFAULT 'Civil Services & Admin' CHECK (career_domain IN (
        'Civil Services & Admin', 'Teaching & Academia', 'Engineering & IT', 'Medical & Allied Health', 'Banking & Finance', 'Defence & Police', 'Skill & Entrepreneurship'
      )),
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      roadmap_steps_json TEXT NOT NULL DEFAULT '[]',
      recommended_exams_json TEXT NOT NULL DEFAULT '[]',
      avg_salary_range TEXT NOT NULL DEFAULT '',
      odisha_opportunities_en TEXT NOT NULL DEFAULT '',
      odisha_opportunities_or TEXT NOT NULL DEFAULT '',
      external_links_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_career_stage_dom ON edu_career_paths(entry_stage, career_domain, status)`,
    `CREATE TABLE IF NOT EXISTS edu_batch5_revisions (
      id TEXT PRIMARY KEY,
      module_code TEXT NOT NULL CHECK (module_code IN ('17', '18', '19', '20')),
      entity_id TEXT NOT NULL,
      version_num INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_b5_rev_entity ON edu_batch5_revisions(module_code, entity_id, version_num DESC)`
  ];

  for (const sql of ddl) await db.prepare(sql).run();

  // Clean-slate v232: starter auto-seeding disabled; access rules, scholarships, and career paths are managed via Admin Studio (/admin/).
  _b5Ready.add(db);
}

export async function getBatch5Overview(env) {
  await ensureEduResourcesBatch5Schema(env.DB);
  const [ar, sch, schol, car] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS n FROM edu_access_rules`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM schemes_directory_items`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM edu_scholarships`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM edu_career_paths`).first()
  ]);
  return {
    access_rules: Number(ar?.n || 0),
    schemes: Number(sch?.n || 0),
    scholarships: Number(schol?.n || 0),
    careers: Number(car?.n || 0)
  };
}

// ---------- Module 17: Downloads & Access Rules ----------
function formatAccessRule(row) {
  if (!row) return null;
  return {
    ...row,
    watermark_footer_enabled: Boolean(row.watermark_footer_enabled),
    offline_cache_allowed: Boolean(row.offline_cache_allowed),
    attribution_required: Boolean(row.attribution_required)
  };
}

async function handleAccessRules(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || '';
      const scope = url.searchParams.get('target_scope') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (status && ['draft', 'published', 'archived'].includes(status)) { where.push('status = ?'); binds.push(status); }
      if (scope && RULE_SCOPES.includes(scope)) { where.push('target_scope = ?'); binds.push(scope); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(rule_name_en LIKE ? ESCAPE '\\' OR rule_name_or LIKE ? ESCAPE '\\')`); binds.push(l, l); }

      const [{ results }, { results: allRows }, resDl, pyqDl] = await Promise.all([
        env.DB.prepare(`SELECT * FROM edu_access_rules WHERE ${where.join(' AND ')} ORDER BY priority_order ASC, updated_at DESC`).bind(...binds).all(),
        env.DB.prepare(`SELECT status FROM edu_access_rules`).all(),
        env.DB.prepare(`SELECT COALESCE(SUM(download_count), 0) AS n FROM edu_resources`).first(),
        env.DB.prepare(`SELECT COALESCE(SUM(download_count), 0) AS n FROM edu_pyq_papers`).first()
      ]);
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({
        ok: true,
        items: (results || []).map(formatAccessRule),
        counts,
        telemetry: { resource_downloads: Number(resDl?.n || 0), pyq_downloads: Number(pyqDl?.n || 0) }
      });
    }
    if (method === 'POST') {
      const body = await readJson(request, 200_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !['draft', 'published', 'archived'].includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE edu_access_rules SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const rule_name_en = cleanStr(body.rule_name_en || '', 200);
      if (!rule_name_en) throw validationError({ rule_name_en: 'rule_name_en is required' });
      const scope = RULE_SCOPES.includes(body.target_scope) ? body.target_scope : 'all_resources';
      const policy = RULE_POLICIES.includes(body.access_policy) ? body.access_policy : 'public_open';
      const status = ['draft', 'published', 'archived'].includes(body.status) ? body.status : 'draft';
      const baseSlug = slugify(body.slug || rule_name_en).slice(0, 90) || 'rule';
      const dup = await env.DB.prepare(`SELECT id FROM edu_access_rules WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `rule-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO edu_access_rules (id, slug, rule_name_en, rule_name_or, target_scope, access_policy, daily_download_limit, watermark_footer_enabled, watermark_text_template, offline_cache_allowed, attribution_required, priority_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, rule_name_en, cleanStr(body.rule_name_or || '', 200), scope, policy,
        Number(body.daily_download_limit ?? 0) || 0, body.watermark_footer_enabled !== false ? 1 : 0,
        cleanStr(body.watermark_text_template || 'Downloaded from Common Sense Odisha (csodisha.com)', 240),
        body.offline_cache_allowed !== false ? 1 : 0, body.attribution_required !== false ? 1 : 0,
        Number(body.priority_order ?? 10), status
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM edu_access_rules WHERE id = ?`).bind(newId).first();
      await saveB5Revision(env.DB, '17', newId, created, 'Created access rule', actor.email);
      await audit(env, request, actor, 'edu.access_rule.create', 'edu_access_rules', newId);
      return json({ ok: true, item: formatAccessRule(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM edu_access_rules WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Access rule not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM edu_batch5_revisions WHERE module_code = '17' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: formatAccessRule(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 200_000);
    const scope = RULE_SCOPES.includes(body.target_scope) ? body.target_scope : existing.target_scope;
    const policy = RULE_POLICIES.includes(body.access_policy) ? body.access_policy : existing.access_policy;
    const status = ['draft', 'published', 'archived'].includes(body.status) ? body.status : existing.status;
    await env.DB.prepare(
      `UPDATE edu_access_rules SET rule_name_en = ?, rule_name_or = ?, target_scope = ?, access_policy = ?, daily_download_limit = ?, watermark_footer_enabled = ?, watermark_text_template = ?, offline_cache_allowed = ?, attribution_required = ?, priority_order = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      cleanStr(body.rule_name_en ?? existing.rule_name_en, 200), cleanStr(body.rule_name_or ?? existing.rule_name_or, 200),
      scope, policy, Number(body.daily_download_limit ?? existing.daily_download_limit),
      body.watermark_footer_enabled !== undefined ? (body.watermark_footer_enabled ? 1 : 0) : existing.watermark_footer_enabled,
      cleanStr(body.watermark_text_template ?? existing.watermark_text_template, 240),
      body.offline_cache_allowed !== undefined ? (body.offline_cache_allowed ? 1 : 0) : existing.offline_cache_allowed,
      body.attribution_required !== undefined ? (body.attribution_required ? 1 : 0) : existing.attribution_required,
      Number(body.priority_order ?? existing.priority_order), status, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM edu_access_rules WHERE id = ?`).bind(id).first();
    await saveB5Revision(env.DB, '17', id, updated, body.change_note || 'Updated access rule', actor.email);
    return json({ ok: true, item: formatAccessRule(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `rule-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO edu_access_rules (id, slug, rule_name_en, rule_name_or, target_scope, access_policy, daily_download_limit, watermark_footer_enabled, watermark_text_template, offline_cache_allowed, attribution_required, priority_order, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, `${existing.rule_name_en} (Copy)`, existing.rule_name_or, existing.target_scope, existing.access_policy, existing.daily_download_limit, existing.watermark_footer_enabled, existing.watermark_text_template, existing.offline_cache_allowed, existing.attribution_required, existing.priority_order).run();
      const cloned = await env.DB.prepare(`SELECT * FROM edu_access_rules WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatAccessRule(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM edu_batch5_revisions WHERE id = ? AND module_code = '17' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE edu_access_rules SET rule_name_en = ?, access_policy = ?, daily_download_limit = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.rule_name_en, snap.access_policy, Number(snap.daily_download_limit || 0), snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM edu_access_rules WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatAccessRule(rolled) });
    }
    if (body.status && ['draft', 'published', 'archived'].includes(body.status)) {
      await env.DB.prepare(`UPDATE edu_access_rules SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, id).run();
      const patched = await env.DB.prepare(`SELECT * FROM edu_access_rules WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatAccessRule(patched) });
    }
    throw validationError({ status: 'No valid patch fields' });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM edu_access_rules WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 18: Government Schemes (Bridged to schemes_directory_items) ----------
function formatScheme(row) {
  if (!row) return null;
  return {
    ...row,
    title_en: row.title,
    links: parseJson(row.links_json, []),
    tags: parseJson(row.tags_json, []),
    official_portal_verified: Boolean(row.official_portal_verified)
  };
}

async function handleSchemes(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (status && B5_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (q) {
        const l = `%${likeEscape(q)}%`;
        where.push(`(title LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR department_name LIKE ? ESCAPE '\\')`);
        binds.push(l, l, l);
      }
      const [{ results }, { results: allRows }] = await Promise.all([
        env.DB.prepare(`SELECT * FROM schemes_directory_items WHERE ${where.join(' AND ')} ORDER BY updated_at DESC LIMIT 200`).bind(...binds).all(),
        env.DB.prepare(`SELECT status FROM schemes_directory_items`).all()
      ]);
      const counts = { all: 0, published: 0, draft: 0, scheduled: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatScheme), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 300_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !B5_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        const now = new Date().toISOString();
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE schemes_directory_items SET status = ?, updated_at = ? WHERE id = ?`).bind(body.status, now, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const title = cleanStr(body.title_en || body.title || '', 200);
      if (!title) throw validationError({ title_en: 'title_en is required' });
      const status = B5_STATUSES.includes(body.status) ? body.status : 'draft';
      const baseSlug = slugify(body.slug || title).slice(0, 90) || 'scheme';
      const dup = await env.DB.prepare(`SELECT id FROM schemes_directory_items WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const folderRow = await env.DB.prepare(`SELECT id, domain_slug FROM schemes_directory_folders LIMIT 1`).first();
      const folderId = cleanStr(body.folder_id || folderRow?.id || 'sf-odisha-state', 100);
      const domainSlug = cleanStr(body.domain_slug || folderRow?.domain_slug || 'schemes', 60);
      const newId = `si-${crypto.randomUUID().slice(0, 12)}`;
      const now = new Date().toISOString();
      const links = sanitizeLinks(body.external_links ?? body.links);
      const tags = parseTags(body.tags ?? body.tags_json);
      await env.DB.prepare(
        `INSERT INTO schemes_directory_items (id, domain_slug, folder_id, title, title_or, slug, scheme_type, sponsor_level, department_name, beneficiary_group, benefit_amount, income_limit, application_mode, application_deadline, official_apply_url, summary, eligibility_criteria, documents_required, pdf_url, links_json, tags_json, status, published_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, domainSlug, folderId, title, cleanStr(body.title_or || '', 200), finalSlug,
        cleanStr(body.scheme_type || 'state_scheme', 40), cleanStr(body.sponsor_level || 'Odisha State', 40),
        cleanStr(body.department_name || '', 140), cleanStr(body.beneficiary_group || 'All Citizens', 120),
        cleanStr(body.benefit_amount || '', 200), cleanStr(body.income_limit || '', 160),
        cleanStr(body.application_mode || 'Online Portal', 40), cleanStr(body.application_deadline || '', 40),
        validateSafeUrl(body.official_apply_url || ''), cleanStr(body.summary || body.summary_en || '', 500),
        cleanStr(body.eligibility_criteria || '', 2000), cleanStr(body.documents_required || '', 2000),
        validateSafeUrl(body.pdf_url || body.file_url || ''), JSON.stringify(links), JSON.stringify(tags),
        status, status === 'published' ? now : null, now, now
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM schemes_directory_items WHERE id = ?`).bind(newId).first();
      await saveB5Revision(env.DB, '18', newId, created, 'Created scheme via Edu Module 18', actor.email);
      await audit(env, request, actor, 'edu.scheme.create', 'schemes_directory_items', newId);
      return json({ ok: true, item: formatScheme(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM schemes_directory_items WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Scheme not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM edu_batch5_revisions WHERE module_code = '18' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: formatScheme(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 300_000);
    const status = B5_STATUSES.includes(body.status) ? body.status : existing.status;
    const now = new Date().toISOString();
    const links = body.external_links !== undefined ? sanitizeLinks(body.external_links) : parseJson(existing.links_json, []);
    const tags = body.tags !== undefined ? parseTags(body.tags) : parseJson(existing.tags_json, []);
    await env.DB.prepare(
      `UPDATE schemes_directory_items SET title = ?, title_or = ?, sponsor_level = ?, department_name = ?, beneficiary_group = ?, benefit_amount = ?, income_limit = ?, application_deadline = ?, official_apply_url = ?, summary = ?, eligibility_criteria = ?, pdf_url = ?, links_json = ?, tags_json = ?, status = ?, updated_at = ? WHERE id = ?`
    ).bind(
      cleanStr(body.title_en ?? body.title ?? existing.title, 200), cleanStr(body.title_or ?? existing.title_or, 200),
      cleanStr(body.sponsor_level ?? existing.sponsor_level, 40), cleanStr(body.department_name ?? existing.department_name, 140),
      cleanStr(body.beneficiary_group ?? existing.beneficiary_group, 120), cleanStr(body.benefit_amount ?? existing.benefit_amount, 200),
      cleanStr(body.income_limit ?? existing.income_limit, 160), cleanStr(body.application_deadline ?? existing.application_deadline, 40),
      validateSafeUrl(body.official_apply_url ?? existing.official_apply_url), cleanStr(body.summary ?? body.summary_en ?? existing.summary, 500),
      cleanStr(body.eligibility_criteria ?? existing.eligibility_criteria, 2000), validateSafeUrl(body.pdf_url ?? body.file_url ?? existing.pdf_url),
      JSON.stringify(links), JSON.stringify(tags), status, now, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM schemes_directory_items WHERE id = ?`).bind(id).first();
    await saveB5Revision(env.DB, '18', id, updated, body.change_note || 'Updated scheme', actor.email);
    return json({ ok: true, item: formatScheme(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    const now = new Date().toISOString();
    if (body.action === 'clone') {
      const cloneId = `si-${crypto.randomUUID().slice(0, 12)}`;
      await env.DB.prepare(
        `INSERT INTO schemes_directory_items (id, domain_slug, folder_id, title, title_or, slug, scheme_type, sponsor_level, department_name, beneficiary_group, benefit_amount, income_limit, application_mode, application_deadline, official_apply_url, summary, eligibility_criteria, documents_required, pdf_url, links_json, tags_json, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`
      ).bind(cloneId, existing.domain_slug, existing.folder_id, `${existing.title} (Copy)`, existing.title_or, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.scheme_type, existing.sponsor_level, existing.department_name, existing.beneficiary_group, existing.benefit_amount, existing.income_limit, existing.application_mode, existing.application_deadline, existing.official_apply_url, existing.summary, existing.eligibility_criteria, existing.documents_required, existing.pdf_url, existing.links_json, existing.tags_json, now, now).run();
      const cloned = await env.DB.prepare(`SELECT * FROM schemes_directory_items WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatScheme(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM edu_batch5_revisions WHERE id = ? AND module_code = '18' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE schemes_directory_items SET title = ?, title_or = ?, summary = ?, status = ?, updated_at = ? WHERE id = ?`)
        .bind(snap.title, snap.title_or || '', snap.summary || '', snap.status || 'draft', now, id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM schemes_directory_items WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatScheme(rolled) });
    }
    if (body.status && B5_STATUSES.includes(body.status)) {
      await env.DB.prepare(`UPDATE schemes_directory_items SET status = ?, updated_at = ? WHERE id = ?`).bind(body.status, now, id).run();
      const patched = await env.DB.prepare(`SELECT * FROM schemes_directory_items WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatScheme(patched) });
    }
    throw validationError({ status: 'No valid patch fields' });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM schemes_directory_items WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 19: Scholarships ----------
function computeDeadlineState(deadlineStr) {
  if (!deadlineStr) return 'open';
  const today = new Date().toISOString().slice(0, 10);
  if (deadlineStr < today) return 'closed';
  const diffDays = Math.ceil((new Date(deadlineStr).getTime() - new Date(today).getTime()) / 86400000);
  return diffDays <= 14 ? 'closing_soon' : 'open';
}

function formatScholarship(row) {
  if (!row) return null;
  return {
    ...row,
    featured: Boolean(row.featured),
    eligible_stages: parseJson(row.eligible_stages_json, []),
    external_links: parseJson(row.external_links_json, []),
    tags: parseJson(row.tags_json, []),
    deadline_state: computeDeadlineState(row.application_deadline)
  };
}

async function handleScholarships(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || '';
      const prov = url.searchParams.get('provider_type') || '';
      const cat = url.searchParams.get('category_eligibility') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (status && B5_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (prov && SCHOLARSHIP_PROVIDERS.includes(prov)) { where.push('provider_type = ?'); binds.push(prov); }
      if (cat && SCHOLARSHIP_CATEGORIES.includes(cat)) { where.push('category_eligibility = ?'); binds.push(cat); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(title_en LIKE ? ESCAPE '\\' OR department_or_agency LIKE ? ESCAPE '\\')`); binds.push(l, l); }
      const { results } = await env.DB.prepare(`SELECT * FROM edu_scholarships WHERE ${where.join(' AND ')} ORDER BY application_deadline ASC, updated_at DESC`).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM edu_scholarships`).all();
      const counts = { all: 0, published: 0, draft: 0, scheduled: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatScholarship), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 300_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !B5_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE edu_scholarships SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const title_en = cleanStr(body.title_en || '', 220);
      if (!title_en) throw validationError({ title_en: 'title_en is required' });
      const prov = SCHOLARSHIP_PROVIDERS.includes(body.provider_type) ? body.provider_type : 'Odisha State Govt';
      const cat = SCHOLARSHIP_CATEGORIES.includes(body.category_eligibility) ? body.category_eligibility : 'All';
      const status = B5_STATUSES.includes(body.status) ? body.status : 'draft';
      const baseSlug = slugify(body.slug || title_en).slice(0, 90) || 'scholarship';
      const dup = await env.DB.prepare(`SELECT id FROM edu_scholarships WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `schol-${crypto.randomUUID().slice(0, 10)}`;
      const stages = parseJson(body.eligible_stages ?? body.eligible_stages_json, []);
      const links = sanitizeLinks(body.external_links ?? body.external_links_json);
      const tags = parseTags(body.tags ?? body.tags_json);
      await env.DB.prepare(
        `INSERT INTO edu_scholarships (id, slug, provider_type, department_or_agency, title_en, title_or, summary_en, summary_or, eligible_stages_json, category_eligibility, income_limit_inr, min_marks_pct, award_amount_text, application_start, application_deadline, apply_url, r2_key, file_url, external_links_json, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, prov, cleanStr(body.department_or_agency || '', 160), title_en, cleanStr(body.title_or || '', 220),
        cleanStr(body.summary_en || '', 1000), cleanStr(body.summary_or || '', 1000), JSON.stringify(stages), cat,
        Number(body.income_limit_inr || 0) || 0, Number(body.min_marks_pct || 0) || 0, cleanStr(body.award_amount_text || '', 140),
        cleanStr(body.application_start || '', 40), cleanStr(body.application_deadline || '', 40), validateSafeUrl(body.apply_url || ''),
        cleanStr(body.r2_key || '', 240), validateSafeUrl(body.file_url || ''), JSON.stringify(links), JSON.stringify(tags), status, body.featured ? 1 : 0
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM edu_scholarships WHERE id = ?`).bind(newId).first();
      await saveB5Revision(env.DB, '19', newId, created, 'Created scholarship', actor.email);
      await audit(env, request, actor, 'edu.scholarship.create', 'edu_scholarships', newId);
      return json({ ok: true, item: formatScholarship(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM edu_scholarships WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Scholarship not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM edu_batch5_revisions WHERE module_code = '19' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: formatScholarship(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 300_000);
    const prov = SCHOLARSHIP_PROVIDERS.includes(body.provider_type) ? body.provider_type : existing.provider_type;
    const cat = SCHOLARSHIP_CATEGORIES.includes(body.category_eligibility) ? body.category_eligibility : existing.category_eligibility;
    const status = B5_STATUSES.includes(body.status) ? body.status : existing.status;
    const stages = body.eligible_stages !== undefined ? parseJson(body.eligible_stages, []) : parseJson(existing.eligible_stages_json, []);
    const links = body.external_links !== undefined ? sanitizeLinks(body.external_links) : parseJson(existing.external_links_json, []);
    const tags = body.tags !== undefined ? parseTags(body.tags) : parseJson(existing.tags_json, []);
    await env.DB.prepare(
      `UPDATE edu_scholarships SET provider_type = ?, department_or_agency = ?, title_en = ?, title_or = ?, summary_en = ?, summary_or = ?, eligible_stages_json = ?, category_eligibility = ?, income_limit_inr = ?, min_marks_pct = ?, award_amount_text = ?, application_start = ?, application_deadline = ?, apply_url = ?, r2_key = ?, file_url = ?, external_links_json = ?, tags_json = ?, status = ?, featured = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      prov, cleanStr(body.department_or_agency ?? existing.department_or_agency, 160),
      cleanStr(body.title_en ?? existing.title_en, 220), cleanStr(body.title_or ?? existing.title_or, 220),
      cleanStr(body.summary_en ?? existing.summary_en, 1000), cleanStr(body.summary_or ?? existing.summary_or, 1000),
      JSON.stringify(stages), cat, Number(body.income_limit_inr ?? existing.income_limit_inr), Number(body.min_marks_pct ?? existing.min_marks_pct),
      cleanStr(body.award_amount_text ?? existing.award_amount_text, 140), cleanStr(body.application_start ?? existing.application_start, 40),
      cleanStr(body.application_deadline ?? existing.application_deadline, 40), validateSafeUrl(body.apply_url ?? existing.apply_url),
      cleanStr(body.r2_key ?? existing.r2_key, 240), validateSafeUrl(body.file_url ?? existing.file_url),
      JSON.stringify(links), JSON.stringify(tags), status, body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM edu_scholarships WHERE id = ?`).bind(id).first();
    await saveB5Revision(env.DB, '19', id, updated, body.change_note || 'Updated scholarship', actor.email);
    return json({ ok: true, item: formatScholarship(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `schol-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO edu_scholarships (id, slug, provider_type, department_or_agency, title_en, title_or, summary_en, summary_or, eligible_stages_json, category_eligibility, income_limit_inr, min_marks_pct, award_amount_text, application_start, application_deadline, apply_url, r2_key, file_url, external_links_json, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0)`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.provider_type, existing.department_or_agency, `${existing.title_en} (Copy)`, existing.title_or, existing.summary_en, existing.summary_or, existing.eligible_stages_json, existing.category_eligibility, existing.income_limit_inr, existing.min_marks_pct, existing.award_amount_text, existing.application_start, existing.application_deadline, existing.apply_url, existing.r2_key, existing.file_url, existing.external_links_json, existing.tags_json).run();
      const cloned = await env.DB.prepare(`SELECT * FROM edu_scholarships WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatScholarship(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM edu_batch5_revisions WHERE id = ? AND module_code = '19' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE edu_scholarships SET title_en = ?, award_amount_text = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.title_en, snap.award_amount_text || '', snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM edu_scholarships WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatScholarship(rolled) });
    }
    const updates = []; const vals = [];
    if (body.status && B5_STATUSES.includes(body.status)) { updates.push('status = ?'); vals.push(body.status); }
    if (body.featured !== undefined) { updates.push('featured = ?'); vals.push(body.featured ? 1 : 0); }
    if (!updates.length) throw validationError({ status: 'No valid patch fields' });
    updates.push(`updated_at = datetime('now')`); vals.push(id);
    await env.DB.prepare(`UPDATE edu_scholarships SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
    const patched = await env.DB.prepare(`SELECT * FROM edu_scholarships WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: formatScholarship(patched) });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM edu_scholarships WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 20: Career Explorer ----------
function formatCareer(row) {
  if (!row) return null;
  return {
    ...row,
    featured: Boolean(row.featured),
    roadmap_steps: parseJson(row.roadmap_steps_json, []),
    recommended_exams: parseJson(row.recommended_exams_json, []),
    external_links: parseJson(row.external_links_json, []),
    tags: parseJson(row.tags_json, [])
  };
}

async function handleCareers(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || '';
      const stage = url.searchParams.get('entry_stage') || '';
      const domain = url.searchParams.get('career_domain') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (status && B5_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (stage && CAREER_STAGES.includes(stage)) { where.push('entry_stage = ?'); binds.push(stage); }
      if (domain && CAREER_DOMAINS.includes(domain)) { where.push('career_domain = ?'); binds.push(domain); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(title_en LIKE ? ESCAPE '\\' OR odisha_opportunities_en LIKE ? ESCAPE '\\')`); binds.push(l, l); }
      const { results } = await env.DB.prepare(`SELECT * FROM edu_career_paths WHERE ${where.join(' AND ')} ORDER BY updated_at DESC`).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM edu_career_paths`).all();
      const counts = { all: 0, published: 0, draft: 0, scheduled: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatCareer), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 300_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !B5_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE edu_career_paths SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const title_en = cleanStr(body.title_en || '', 220);
      if (!title_en) throw validationError({ title_en: 'title_en is required' });
      const stage = CAREER_STAGES.includes(body.entry_stage) ? body.entry_stage : 'After Graduation';
      const domain = CAREER_DOMAINS.includes(body.career_domain) ? body.career_domain : 'Civil Services & Admin';
      const status = B5_STATUSES.includes(body.status) ? body.status : 'draft';
      const baseSlug = slugify(body.slug || title_en).slice(0, 90) || 'career';
      const dup = await env.DB.prepare(`SELECT id FROM edu_career_paths WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `car-${crypto.randomUUID().slice(0, 10)}`;
      const steps = parseJson(body.roadmap_steps ?? body.roadmap_steps_json, []);
      const exams = parseJson(body.recommended_exams ?? body.recommended_exams_json, []);
      const links = sanitizeLinks(body.external_links ?? body.external_links_json);
      const tags = parseTags(body.tags ?? body.tags_json);
      await env.DB.prepare(
        `INSERT INTO edu_career_paths (id, slug, entry_stage, career_domain, title_en, title_or, summary_en, summary_or, roadmap_steps_json, recommended_exams_json, avg_salary_range, odisha_opportunities_en, odisha_opportunities_or, external_links_json, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, stage, domain, title_en, cleanStr(body.title_or || '', 220),
        cleanStr(body.summary_en || '', 1000), cleanStr(body.summary_or || '', 1000),
        JSON.stringify(steps), JSON.stringify(exams), cleanStr(body.avg_salary_range || '', 120),
        cleanStr(body.odisha_opportunities_en || '', 1000), cleanStr(body.odisha_opportunities_or || '', 1000),
        JSON.stringify(links), JSON.stringify(tags), status, body.featured ? 1 : 0
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM edu_career_paths WHERE id = ?`).bind(newId).first();
      await saveB5Revision(env.DB, '20', newId, created, 'Created career roadmap', actor.email);
      await audit(env, request, actor, 'edu.career.create', 'edu_career_paths', newId);
      return json({ ok: true, item: formatCareer(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM edu_career_paths WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Career roadmap not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM edu_batch5_revisions WHERE module_code = '20' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: formatCareer(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 300_000);
    const stage = CAREER_STAGES.includes(body.entry_stage) ? body.entry_stage : existing.entry_stage;
    const domain = CAREER_DOMAINS.includes(body.career_domain) ? body.career_domain : existing.career_domain;
    const status = B5_STATUSES.includes(body.status) ? body.status : existing.status;
    const steps = body.roadmap_steps !== undefined ? parseJson(body.roadmap_steps, []) : parseJson(existing.roadmap_steps_json, []);
    const exams = body.recommended_exams !== undefined ? parseJson(body.recommended_exams, []) : parseJson(existing.recommended_exams_json, []);
    const links = body.external_links !== undefined ? sanitizeLinks(body.external_links) : parseJson(existing.external_links_json, []);
    const tags = body.tags !== undefined ? parseTags(body.tags) : parseJson(existing.tags_json, []);
    await env.DB.prepare(
      `UPDATE edu_career_paths SET entry_stage = ?, career_domain = ?, title_en = ?, title_or = ?, summary_en = ?, summary_or = ?, roadmap_steps_json = ?, recommended_exams_json = ?, avg_salary_range = ?, odisha_opportunities_en = ?, odisha_opportunities_or = ?, external_links_json = ?, tags_json = ?, status = ?, featured = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      stage, domain, cleanStr(body.title_en ?? existing.title_en, 220), cleanStr(body.title_or ?? existing.title_or, 220),
      cleanStr(body.summary_en ?? existing.summary_en, 1000), cleanStr(body.summary_or ?? existing.summary_or, 1000),
      JSON.stringify(steps), JSON.stringify(exams), cleanStr(body.avg_salary_range ?? existing.avg_salary_range, 120),
      cleanStr(body.odisha_opportunities_en ?? existing.odisha_opportunities_en, 1000),
      cleanStr(body.odisha_opportunities_or ?? existing.odisha_opportunities_or, 1000),
      JSON.stringify(links), JSON.stringify(tags), status, body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM edu_career_paths WHERE id = ?`).bind(id).first();
    await saveB5Revision(env.DB, '20', id, updated, body.change_note || 'Updated career roadmap', actor.email);
    return json({ ok: true, item: formatCareer(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `car-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO edu_career_paths (id, slug, entry_stage, career_domain, title_en, title_or, summary_en, summary_or, roadmap_steps_json, recommended_exams_json, avg_salary_range, odisha_opportunities_en, odisha_opportunities_or, external_links_json, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0)`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.entry_stage, existing.career_domain, `${existing.title_en} (Copy)`, existing.title_or, existing.summary_en, existing.summary_or, existing.roadmap_steps_json, existing.recommended_exams_json, existing.avg_salary_range, existing.odisha_opportunities_en, existing.odisha_opportunities_or, existing.external_links_json, existing.tags_json).run();
      const cloned = await env.DB.prepare(`SELECT * FROM edu_career_paths WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatCareer(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM edu_batch5_revisions WHERE id = ? AND module_code = '20' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE edu_career_paths SET title_en = ?, roadmap_steps_json = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.title_en, snap.roadmap_steps_json || '[]', snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM edu_career_paths WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatCareer(rolled) });
    }
    const updates = []; const vals = [];
    if (body.status && B5_STATUSES.includes(body.status)) { updates.push('status = ?'); vals.push(body.status); }
    if (body.featured !== undefined) { updates.push('featured = ?'); vals.push(body.featured ? 1 : 0); }
    if (!updates.length) throw validationError({ status: 'No valid patch fields' });
    updates.push(`updated_at = datetime('now')`); vals.push(id);
    await env.DB.prepare(`UPDATE edu_career_paths SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
    const patched = await env.DB.prepare(`SELECT * FROM edu_career_paths WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: formatCareer(patched) });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM edu_career_paths WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleEduBatch5Admin(request, env, actor, sub, extra) {
  await ensureEduResourcesBatch5Schema(env.DB);
  if (sub === 'access-rules') return handleAccessRules(request, env, actor, extra);
  if (sub === 'schemes') return handleSchemes(request, env, actor, extra);
  if (sub === 'scholarships') return handleScholarships(request, env, actor, extra);
  if (sub === 'careers') return handleCareers(request, env, actor, extra);
  return null;
}

// ---------- Public APIs ----------
export async function handlePublicEduScholarshipsApi(request, env) {
  await ensureEduResourcesBatch5Schema(env.DB);
  const url = new URL(request.url);
  const cat = url.searchParams.get('category_eligibility') || '';
  const prov = url.searchParams.get('provider_type') || '';
  const where = [`status = 'published'`]; const binds = [];
  if (cat && SCHOLARSHIP_CATEGORIES.includes(cat)) { where.push('category_eligibility = ?'); binds.push(cat); }
  if (prov && SCHOLARSHIP_PROVIDERS.includes(prov)) { where.push('provider_type = ?'); binds.push(prov); }
  const { results } = await env.DB.prepare(`SELECT * FROM edu_scholarships WHERE ${where.join(' AND ')} ORDER BY featured DESC, application_deadline ASC LIMIT 80`).bind(...binds).all();
  return json({ ok: true, items: (results || []).map(formatScholarship) });
}

export async function handlePublicEduCareersApi(request, env) {
  await ensureEduResourcesBatch5Schema(env.DB);
  const url = new URL(request.url);
  const stage = url.searchParams.get('entry_stage') || '';
  const domain = url.searchParams.get('career_domain') || '';
  const where = [`status = 'published'`]; const binds = [];
  if (stage && CAREER_STAGES.includes(stage)) { where.push('entry_stage = ?'); binds.push(stage); }
  if (domain && CAREER_DOMAINS.includes(domain)) { where.push('career_domain = ?'); binds.push(domain); }
  const { results } = await env.DB.prepare(`SELECT * FROM edu_career_paths WHERE ${where.join(' AND ')} ORDER BY featured DESC, updated_at DESC LIMIT 80`).bind(...binds).all();
  return json({ ok: true, items: (results || []).map(formatCareer) });
}
