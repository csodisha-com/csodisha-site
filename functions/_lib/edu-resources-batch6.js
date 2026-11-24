// Educational Resources Batch 6 (v83): Modules 21-22 + Unified 22-Module Overview
// 21 Student Dashboard | 22 Educational Tools
import { HttpError, json, readJson, validationError } from './http.js';
import { audit } from './rbac.js';
import { cleanStr, slugify, likeEscape } from './validate.js';
import { ensureEduResourcesBatch5Schema } from './edu-resources-batch5.js';

export const B6_STATUSES = ['draft', 'scheduled', 'published', 'archived'];
export const WIDGET_TYPES = [
  'pinned_announcement', 'todays_update_digest', 'recommended_track',
  'exam_countdown_banner', 'quick_action_card', 'mentor_tip'
];
export const TARGET_STAGES = [
  'All Students', 'School 6-10', 'Higher Secondary +2', 'UG / PG',
  'OPSC / OSSC / OSSSC', 'Teaching / UGC NET'
];
export const TOOL_TYPES = [
  'age_eligibility_calculator', 'cgpa_percentage_converter', 'negative_marking_score_calc',
  'study_timetable_generator', 'exam_countdown_tracker', 'syllabus_progress_tracker'
];

const _b6Ready = new WeakSet();

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

async function saveB6Revision(db, moduleCode, entityId, snapshot, note, actorEmail) {
  const verRow = await db.prepare(
    `SELECT COALESCE(MAX(version_num), 0) AS max_v FROM edu_batch6_revisions WHERE module_code = ? AND entity_id = ?`
  ).bind(moduleCode, entityId).first();
  const nextVer = Number(verRow?.max_v || 0) + 1;
  const revId = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO edu_batch6_revisions (id, module_code, entity_id, version_num, snapshot_json, change_note, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(revId, moduleCode, entityId, nextVer, JSON.stringify(snapshot), cleanStr(note || '', 200), cleanStr(actorEmail || 'system', 120)).run();
}

const STARTER_WIDGETS = [];

const STARTER_TOOLS = [];

export async function ensureEduResourcesBatch6Schema(db) {
  if (!db) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
  await ensureEduResourcesBatch5Schema(db);
  if (_b6Ready.has(db)) return;

  const ddl = [
    `CREATE TABLE IF NOT EXISTS edu_student_dashboard_widgets (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      widget_type TEXT NOT NULL DEFAULT 'pinned_announcement' CHECK (widget_type IN (
        'pinned_announcement', 'todays_update_digest', 'recommended_track', 'exam_countdown_banner', 'quick_action_card', 'mentor_tip'
      )),
      target_stage TEXT NOT NULL DEFAULT 'All Students' CHECK (target_stage IN (
        'All Students', 'School 6-10', 'Higher Secondary +2', 'UG / PG', 'OPSC / OSSC / OSSSC', 'Teaching / UGC NET'
      )),
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      body_en TEXT NOT NULL DEFAULT '',
      body_or TEXT NOT NULL DEFAULT '',
      cta_label_en TEXT NOT NULL DEFAULT '',
      cta_label_or TEXT NOT NULL DEFAULT '',
      cta_url TEXT NOT NULL DEFAULT '',
      linked_module_code TEXT NOT NULL DEFAULT '',
      linked_item_id TEXT NOT NULL DEFAULT '',
      countdown_target_date TEXT NOT NULL DEFAULT '',
      priority_order INTEGER NOT NULL DEFAULT 10,
      pinned INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
      publish_at TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_sdw_status_stage ON edu_student_dashboard_widgets(status, target_stage, priority_order)`,
    `CREATE TABLE IF NOT EXISTS edu_tools_registry (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      tool_type TEXT NOT NULL DEFAULT 'age_eligibility_calculator' CHECK (tool_type IN (
        'age_eligibility_calculator', 'cgpa_percentage_converter', 'negative_marking_score_calc',
        'study_timetable_generator', 'exam_countdown_tracker', 'syllabus_progress_tracker'
      )),
      title_en TEXT NOT NULL,
      title_or TEXT NOT NULL DEFAULT '',
      summary_en TEXT NOT NULL DEFAULT '',
      summary_or TEXT NOT NULL DEFAULT '',
      instructions_en TEXT NOT NULL DEFAULT '',
      instructions_or TEXT NOT NULL DEFAULT '',
      config_json TEXT NOT NULL DEFAULT '{}',
      tool_url TEXT NOT NULL DEFAULT '',
      icon_key TEXT NOT NULL DEFAULT 'calculator',
      sort_order INTEGER NOT NULL DEFAULT 10,
      tags_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
      featured INTEGER NOT NULL DEFAULT 0,
      usage_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_tools_status_type ON edu_tools_registry(status, tool_type, sort_order)`,
    `CREATE TABLE IF NOT EXISTS edu_batch6_revisions (
      id TEXT PRIMARY KEY,
      module_code TEXT NOT NULL CHECK (module_code IN ('21', '22')),
      entity_id TEXT NOT NULL,
      version_num INTEGER NOT NULL,
      snapshot_json TEXT NOT NULL,
      change_note TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_edu_b6_rev_entity ON edu_batch6_revisions(module_code, entity_id, version_num DESC)`
  ];

  for (const sql of ddl) await db.prepare(sql).run();

  // Clean-slate v232: starter auto-seeding disabled; widgets and tools are managed via Admin Studio (/admin/).
  _b6Ready.add(db);
}

export async function getBatch6Overview(env) {
  await ensureEduResourcesBatch6Schema(env.DB);
  const [wRow, tRow] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS n FROM edu_student_dashboard_widgets`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(usage_count), 0) AS usage FROM edu_tools_registry`).first()
  ]);
  return {
    widgets: Number(wRow?.n || 0),
    tools: Number(tRow?.n || 0),
    tool_usage: Number(tRow?.usage || 0)
  };
}

export async function getFull22ModuleOverview(env) {
  await ensureEduResourcesBatch6Schema(env.DB);
  const queries = await Promise.all([
    env.DB.prepare(`SELECT resource_type, status, title_or, file_size_bytes FROM edu_resources`).all(),
    env.DB.prepare(`SELECT status, title_or FROM edu_subjects_topics`).all(),
    env.DB.prepare(`SELECT status, name_or AS title_or FROM edu_classes_grades`).all(),
    env.DB.prepare(`SELECT status, title_or FROM edu_examinations`).all(),
    env.DB.prepare(`SELECT status, title_or FROM jobs_directory_items WHERE item_type = 'job-notification'`).all().catch(() => ({ results: [] })),
    env.DB.prepare(`SELECT status, title_or FROM edu_admit_results`).all(),
    env.DB.prepare(`SELECT status, title_or FROM edu_syllabi`).all(),
    env.DB.prepare(`SELECT status, title_or FROM edu_pyq_papers`).all(),
    env.DB.prepare(`SELECT status, question_or AS title_or FROM edu_question_bank`).all(),
    env.DB.prepare(`SELECT status, title_or FROM edu_quizzes`).all(),
    env.DB.prepare(`SELECT status, title_or FROM edu_mock_tests`).all(),
    env.DB.prepare(`SELECT status, title_or FROM edu_answer_keys`).all(),
    env.DB.prepare(`SELECT status, title_or FROM edu_collections`).all(),
    env.DB.prepare(`SELECT status, rule_name_or AS title_or FROM edu_access_rules`).all(),
    env.DB.prepare(`SELECT status, title_or FROM schemes_directory_items`).all(),
    env.DB.prepare(`SELECT status, title_or FROM edu_scholarships`).all(),
    env.DB.prepare(`SELECT status, title_or FROM edu_career_paths`).all(),
    env.DB.prepare(`SELECT status, title_or FROM edu_student_dashboard_widgets`).all(),
    env.DB.prepare(`SELECT status, title_or, usage_count FROM edu_tools_registry`).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM edu_resource_links`).first()
  ]);

  const resRows = queries[0].results || [];
  const byType = (t) => resRows.filter(r => r.resource_type === t);
  const buckets = {
    '01': byType('digital_library'),
    '02': byType('study_material'),
    '03': byType('notes_pdf'),
    '04': byType('book_reference'),
    '05': queries[1].results || [],
    '06': queries[2].results || [],
    '07': queries[3].results || [],
    '08': queries[4].results || [],
    '09': queries[5].results || [],
    '10': queries[6].results || [],
    '11': queries[7].results || [],
    '12': queries[8].results || [],
    '13': queries[9].results || [],
    '14': queries[10].results || [],
    '15': queries[11].results || [],
    '16': queries[12].results || [],
    '17': queries[13].results || [],
    '18': queries[14].results || [],
    '19': queries[15].results || [],
    '20': queries[16].results || [],
    '21': queries[17].results || [],
    '22': queries[18].results || []
  };

  let totalItems = 0;
  let published = 0;
  let draft = 0;
  let bilingual = 0;
  const modules = {};

  for (const [code, rows] of Object.entries(buckets)) {
    const pubCnt = rows.filter(r => r.status === 'published').length;
    const drfCnt = rows.filter(r => r.status === 'draft').length;
    totalItems += rows.length;
    published += pubCnt;
    draft += drfCnt;
    bilingual += rows.filter(r => Boolean(String(r.title_or || '').trim())).length;
    modules[code] = { total: rows.length, published: pubCnt, draft: drfCnt };
  }

  const r2Bytes = resRows.reduce((s, r) => s + Number(r.file_size_bytes || 0), 0);
  const toolUsage = (queries[18].results || []).reduce((s, r) => s + Number(r.usage_count || 0), 0);

  return {
    modules,
    totals: { total_items: totalItems, published, draft },
    bilingual_parity_pct: totalItems ? Math.round((bilingual / totalItems) * 100) : 100,
    r2_storage_bytes: r2Bytes,
    total_interlinks: Number(queries[19]?.n || 0),
    tool_usage: toolUsage
  };
}

// ---------- Module 21: Student Dashboard Widgets ----------
function formatWidget(row) {
  if (!row) return null;
  return { ...row, pinned: Boolean(row.pinned) };
}

async function handleStudentDashboard(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || '';
      const wType = url.searchParams.get('widget_type') || '';
      const stage = url.searchParams.get('target_stage') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (status && B6_STATUSES.includes(status)) { where.push('status = ?'); binds.push(status); }
      if (wType && WIDGET_TYPES.includes(wType)) { where.push('widget_type = ?'); binds.push(wType); }
      if (stage && TARGET_STAGES.includes(stage)) { where.push('target_stage = ?'); binds.push(stage); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(title_en LIKE ? ESCAPE '\\' OR body_en LIKE ? ESCAPE '\\')`); binds.push(l, l); }
      const { results } = await env.DB.prepare(`SELECT * FROM edu_student_dashboard_widgets WHERE ${where.join(' AND ')} ORDER BY pinned DESC, priority_order ASC, updated_at DESC`).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM edu_student_dashboard_widgets`).all();
      const counts = { all: 0, published: 0, draft: 0, scheduled: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatWidget), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 200_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !B6_STATUSES.includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE edu_student_dashboard_widgets SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const title_en = cleanStr(body.title_en || '', 220);
      if (!title_en) throw validationError({ title_en: 'title_en is required' });
      const wType = WIDGET_TYPES.includes(body.widget_type) ? body.widget_type : 'pinned_announcement';
      const stage = TARGET_STAGES.includes(body.target_stage) ? body.target_stage : 'All Students';
      const status = B6_STATUSES.includes(body.status) ? body.status : 'draft';
      const baseSlug = slugify(body.slug || title_en).slice(0, 90) || 'widget';
      const dup = await env.DB.prepare(`SELECT id FROM edu_student_dashboard_widgets WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `sdw-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO edu_student_dashboard_widgets (id, slug, widget_type, target_stage, title_en, title_or, body_en, body_or, cta_label_en, cta_label_or, cta_url, linked_module_code, linked_item_id, countdown_target_date, priority_order, pinned, status, publish_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, wType, stage, title_en, cleanStr(body.title_or || '', 220),
        cleanStr(body.body_en || '', 1000), cleanStr(body.body_or || '', 1000),
        cleanStr(body.cta_label_en || '', 80), cleanStr(body.cta_label_or || '', 80),
        validateSafeUrl(body.cta_url || ''), cleanStr(body.linked_module_code || '', 10),
        cleanStr(body.linked_item_id || '', 120), cleanStr(body.countdown_target_date || '', 40),
        Number(body.priority_order ?? 10), body.pinned ? 1 : 0, status, body.publish_at || null, body.expires_at || null
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM edu_student_dashboard_widgets WHERE id = ?`).bind(newId).first();
      await saveB6Revision(env.DB, '21', newId, created, 'Created student dashboard widget', actor.email);
      await audit(env, request, actor, 'edu.student_widget.create', 'edu_student_dashboard_widgets', newId);
      return json({ ok: true, item: formatWidget(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM edu_student_dashboard_widgets WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Dashboard widget not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM edu_batch6_revisions WHERE module_code = '21' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: formatWidget(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 200_000);
    const wType = WIDGET_TYPES.includes(body.widget_type) ? body.widget_type : existing.widget_type;
    const stage = TARGET_STAGES.includes(body.target_stage) ? body.target_stage : existing.target_stage;
    const status = B6_STATUSES.includes(body.status) ? body.status : existing.status;
    await env.DB.prepare(
      `UPDATE edu_student_dashboard_widgets SET widget_type = ?, target_stage = ?, title_en = ?, title_or = ?, body_en = ?, body_or = ?, cta_label_en = ?, cta_label_or = ?, cta_url = ?, linked_module_code = ?, linked_item_id = ?, countdown_target_date = ?, priority_order = ?, pinned = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      wType, stage, cleanStr(body.title_en ?? existing.title_en, 220), cleanStr(body.title_or ?? existing.title_or, 220),
      cleanStr(body.body_en ?? existing.body_en, 1000), cleanStr(body.body_or ?? existing.body_or, 1000),
      cleanStr(body.cta_label_en ?? existing.cta_label_en, 80), cleanStr(body.cta_label_or ?? existing.cta_label_or, 80),
      validateSafeUrl(body.cta_url ?? existing.cta_url), cleanStr(body.linked_module_code ?? existing.linked_module_code, 10),
      cleanStr(body.linked_item_id ?? existing.linked_item_id, 120), cleanStr(body.countdown_target_date ?? existing.countdown_target_date, 40),
      Number(body.priority_order ?? existing.priority_order), body.pinned !== undefined ? (body.pinned ? 1 : 0) : existing.pinned, status, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM edu_student_dashboard_widgets WHERE id = ?`).bind(id).first();
    await saveB6Revision(env.DB, '21', id, updated, body.change_note || 'Updated widget', actor.email);
    return json({ ok: true, item: formatWidget(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `sdw-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO edu_student_dashboard_widgets (id, slug, widget_type, target_stage, title_en, title_or, body_en, body_or, cta_label_en, cta_label_or, cta_url, linked_module_code, linked_item_id, countdown_target_date, priority_order, pinned, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'draft')`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.widget_type, existing.target_stage, `${existing.title_en} (Copy)`, existing.title_or, existing.body_en, existing.body_or, existing.cta_label_en, existing.cta_label_or, existing.cta_url, existing.linked_module_code, existing.linked_item_id, existing.countdown_target_date, existing.priority_order).run();
      const cloned = await env.DB.prepare(`SELECT * FROM edu_student_dashboard_widgets WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatWidget(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM edu_batch6_revisions WHERE id = ? AND module_code = '21' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE edu_student_dashboard_widgets SET title_en = ?, body_en = ?, pinned = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.title_en, snap.body_en || '', snap.pinned ? 1 : 0, snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM edu_student_dashboard_widgets WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatWidget(rolled) });
    }
    const updates = []; const vals = [];
    if (body.status && B6_STATUSES.includes(body.status)) { updates.push('status = ?'); vals.push(body.status); }
    if (body.pinned !== undefined) { updates.push('pinned = ?'); vals.push(body.pinned ? 1 : 0); }
    if (!updates.length) throw validationError({ status: 'No valid patch fields' });
    updates.push(`updated_at = datetime('now')`); vals.push(id);
    await env.DB.prepare(`UPDATE edu_student_dashboard_widgets SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
    const patched = await env.DB.prepare(`SELECT * FROM edu_student_dashboard_widgets WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: formatWidget(patched) });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM edu_student_dashboard_widgets WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

// ---------- Module 22: Educational Tools Registry ----------
function formatTool(row) {
  if (!row) return null;
  return {
    ...row,
    featured: Boolean(row.featured),
    config: parseJson(row.config_json, {}),
    tags: parseJson(row.tags_json, [])
  };
}

async function handleTools(request, env, actor, id) {
  const method = request.method;
  if (!id) {
    if (method === 'GET') {
      const url = new URL(request.url);
      const status = url.searchParams.get('status') || '';
      const tType = url.searchParams.get('tool_type') || '';
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const where = ['1=1']; const binds = [];
      if (status && ['draft', 'published', 'archived'].includes(status)) { where.push('status = ?'); binds.push(status); }
      if (tType && TOOL_TYPES.includes(tType)) { where.push('tool_type = ?'); binds.push(tType); }
      if (q) { const l = `%${likeEscape(q)}%`; where.push(`(title_en LIKE ? ESCAPE '\\' OR summary_en LIKE ? ESCAPE '\\')`); binds.push(l, l); }
      const { results } = await env.DB.prepare(`SELECT * FROM edu_tools_registry WHERE ${where.join(' AND ')} ORDER BY sort_order ASC, updated_at DESC`).bind(...binds).all();
      const { results: allRows } = await env.DB.prepare(`SELECT status FROM edu_tools_registry`).all();
      const counts = { all: 0, published: 0, draft: 0, archived: 0 };
      for (const r of allRows || []) { counts.all++; if (r.status in counts) counts[r.status]++; }
      return json({ ok: true, items: (results || []).map(formatTool), counts });
    }
    if (method === 'POST') {
      const body = await readJson(request, 200_000);
      if (body.action === 'bulk_status') {
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!ids.length || !['draft', 'published', 'archived'].includes(body.status)) throw validationError({ status: 'Valid ids and status required' });
        for (const itemId of ids.slice(0, 100)) {
          await env.DB.prepare(`UPDATE edu_tools_registry SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(body.status, itemId).run();
        }
        return json({ ok: true, updated: ids.length });
      }
      const title_en = cleanStr(body.title_en || '', 220);
      if (!title_en) throw validationError({ title_en: 'title_en is required' });
      const tType = TOOL_TYPES.includes(body.tool_type) ? body.tool_type : 'age_eligibility_calculator';
      const status = ['draft', 'published', 'archived'].includes(body.status) ? body.status : 'draft';
      const baseSlug = slugify(body.slug || title_en).slice(0, 90) || 'tool';
      const dup = await env.DB.prepare(`SELECT id FROM edu_tools_registry WHERE slug = ?`).bind(baseSlug).first();
      const finalSlug = dup ? `${baseSlug}-${crypto.randomUUID().slice(0, 5)}` : baseSlug;
      const newId = `tool-${crypto.randomUUID().slice(0, 10)}`;
      const cfg = parseJson(body.config ?? body.config_json, {});
      const tags = parseTags(body.tags ?? body.tags_json);
      await env.DB.prepare(
        `INSERT INTO edu_tools_registry (id, slug, tool_type, title_en, title_or, summary_en, summary_or, instructions_en, instructions_or, config_json, tool_url, icon_key, sort_order, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        newId, finalSlug, tType, title_en, cleanStr(body.title_or || '', 220),
        cleanStr(body.summary_en || '', 1000), cleanStr(body.summary_or || '', 1000),
        cleanStr(body.instructions_en || '', 1000), cleanStr(body.instructions_or || '', 1000),
        JSON.stringify(cfg), validateSafeUrl(body.tool_url || '/student/#tools'),
        cleanStr(body.icon_key || 'calculator', 40), Number(body.sort_order ?? 10), JSON.stringify(tags), status, body.featured ? 1 : 0
      ).run();
      const created = await env.DB.prepare(`SELECT * FROM edu_tools_registry WHERE id = ?`).bind(newId).first();
      await saveB6Revision(env.DB, '22', newId, created, 'Created educational tool', actor.email);
      await audit(env, request, actor, 'edu.tool.create', 'edu_tools_registry', newId);
      return json({ ok: true, item: formatTool(created) }, 201);
    }
  }

  const existing = await env.DB.prepare(`SELECT * FROM edu_tools_registry WHERE id = ?`).bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Tool not found');

  if (method === 'GET') {
    const { results: revisions } = await env.DB.prepare(
      `SELECT id, version_num, change_note, created_by, created_at FROM edu_batch6_revisions WHERE module_code = '22' AND entity_id = ? ORDER BY version_num DESC LIMIT 20`
    ).bind(id).all();
    return json({ ok: true, item: formatTool(existing), revisions: revisions || [] });
  }
  if (method === 'PUT') {
    const body = await readJson(request, 200_000);
    const tType = TOOL_TYPES.includes(body.tool_type) ? body.tool_type : existing.tool_type;
    const status = ['draft', 'published', 'archived'].includes(body.status) ? body.status : existing.status;
    const cfg = body.config !== undefined ? parseJson(body.config, {}) : parseJson(existing.config_json, {});
    const tags = body.tags !== undefined ? parseTags(body.tags) : parseJson(existing.tags_json, []);
    await env.DB.prepare(
      `UPDATE edu_tools_registry SET tool_type = ?, title_en = ?, title_or = ?, summary_en = ?, summary_or = ?, instructions_en = ?, instructions_or = ?, config_json = ?, tool_url = ?, icon_key = ?, sort_order = ?, tags_json = ?, status = ?, featured = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(
      tType, cleanStr(body.title_en ?? existing.title_en, 220), cleanStr(body.title_or ?? existing.title_or, 220),
      cleanStr(body.summary_en ?? existing.summary_en, 1000), cleanStr(body.summary_or ?? existing.summary_or, 1000),
      cleanStr(body.instructions_en ?? existing.instructions_en, 1000), cleanStr(body.instructions_or ?? existing.instructions_or, 1000),
      JSON.stringify(cfg), validateSafeUrl(body.tool_url ?? existing.tool_url),
      cleanStr(body.icon_key ?? existing.icon_key, 40), Number(body.sort_order ?? existing.sort_order),
      JSON.stringify(tags), status, body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured, id
    ).run();
    const updated = await env.DB.prepare(`SELECT * FROM edu_tools_registry WHERE id = ?`).bind(id).first();
    await saveB6Revision(env.DB, '22', id, updated, body.change_note || 'Updated tool', actor.email);
    return json({ ok: true, item: formatTool(updated) });
  }
  if (method === 'PATCH') {
    const body = await readJson(request, 50_000);
    if (body.action === 'clone') {
      const cloneId = `tool-${crypto.randomUUID().slice(0, 10)}`;
      await env.DB.prepare(
        `INSERT INTO edu_tools_registry (id, slug, tool_type, title_en, title_or, summary_en, summary_or, instructions_en, instructions_or, config_json, tool_url, icon_key, sort_order, tags_json, status, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 0)`
      ).bind(cloneId, `${existing.slug}-copy-${crypto.randomUUID().slice(0, 4)}`, existing.tool_type, `${existing.title_en} (Copy)`, existing.title_or, existing.summary_en, existing.summary_or, existing.instructions_en, existing.instructions_or, existing.config_json, existing.tool_url, existing.icon_key, existing.sort_order, existing.tags_json).run();
      const cloned = await env.DB.prepare(`SELECT * FROM edu_tools_registry WHERE id = ?`).bind(cloneId).first();
      return json({ ok: true, item: formatTool(cloned) }, 201);
    }
    if (body.action === 'rollback' && body.revision_id) {
      const rev = await env.DB.prepare(`SELECT * FROM edu_batch6_revisions WHERE id = ? AND module_code = '22' AND entity_id = ?`).bind(body.revision_id, id).first();
      if (!rev) throw new HttpError(404, 'NOT_FOUND', 'Revision not found');
      const snap = JSON.parse(rev.snapshot_json);
      await env.DB.prepare(`UPDATE edu_tools_registry SET title_en = ?, config_json = ?, status = ?, updated_at = datetime('now') WHERE id = ?`)
        .bind(snap.title_en, snap.config_json || '{}', snap.status || 'draft', id).run();
      const rolled = await env.DB.prepare(`SELECT * FROM edu_tools_registry WHERE id = ?`).bind(id).first();
      return json({ ok: true, item: formatTool(rolled) });
    }
    const updates = []; const vals = [];
    if (body.status && ['draft', 'published', 'archived'].includes(body.status)) { updates.push('status = ?'); vals.push(body.status); }
    if (body.featured !== undefined) { updates.push('featured = ?'); vals.push(body.featured ? 1 : 0); }
    if (!updates.length) throw validationError({ status: 'No valid patch fields' });
    updates.push(`updated_at = datetime('now')`); vals.push(id);
    await env.DB.prepare(`UPDATE edu_tools_registry SET ${updates.join(', ')} WHERE id = ?`).bind(...vals).run();
    const patched = await env.DB.prepare(`SELECT * FROM edu_tools_registry WHERE id = ?`).bind(id).first();
    return json({ ok: true, item: formatTool(patched) });
  }
  if (method === 'DELETE') {
    await env.DB.prepare(`DELETE FROM edu_tools_registry WHERE id = ?`).bind(id).run();
    return json({ ok: true, deleted: id });
  }
  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleEduBatch6Admin(request, env, actor, sub, extra) {
  await ensureEduResourcesBatch6Schema(env.DB);
  if (sub === 'student-dashboard') return handleStudentDashboard(request, env, actor, extra);
  if (sub === 'tools') return handleTools(request, env, actor, extra);
  return null;
}

// ---------- Public Student Hub & Tools APIs ----------
export async function handlePublicEduStudentHubApi(request, env) {
  await ensureEduResourcesBatch6Schema(env.DB);
  const url = new URL(request.url);
  const stage = url.searchParams.get('target_stage') || '';
  const where = [`status = 'published'`]; const binds = [];
  if (stage && TARGET_STAGES.includes(stage)) {
    where.push(`(target_stage = ? OR target_stage = 'All Students')`);
    binds.push(stage);
  }
  const [wRes, exRes, recRes, admRes, schRes] = await Promise.all([
    env.DB.prepare(`SELECT * FROM edu_student_dashboard_widgets WHERE ${where.join(' AND ')} ORDER BY pinned DESC, priority_order ASC, updated_at DESC LIMIT 20`).bind(...binds).all(),
    env.DB.prepare(`SELECT id, slug, title_en, title_or, conducting_body, updated_at FROM edu_examinations WHERE status = 'published' ORDER BY updated_at DESC LIMIT 5`).all(),
    env.DB.prepare(`SELECT id, slug, title AS title_en, title_or, department_name AS organization_name, application_deadline AS application_end_date, updated_at FROM jobs_directory_items WHERE item_type = 'job-notification' AND status = 'published' ORDER BY updated_at DESC LIMIT 5`).all().catch(() => ({ results: [] })),
    env.DB.prepare(`SELECT id, slug, title_en, title_or, notice_type, conducting_body, release_date, updated_at FROM edu_admit_results WHERE status = 'published' ORDER BY updated_at DESC LIMIT 5`).all(),
    env.DB.prepare(`SELECT id, slug, title_en, title_or, provider_type, application_deadline, updated_at FROM edu_scholarships WHERE status = 'published' ORDER BY updated_at DESC LIMIT 5`).all()
  ]);

  const todaysUpdates = [
    ...(exRes.results || []).map(r => ({ module_code: '07', kind: 'exam', ...r })),
    ...(recRes.results || []).map(r => ({ module_code: '08', kind: 'recruitment', ...r })),
    ...(admRes.results || []).map(r => ({ module_code: '09', kind: 'admit_result', ...r })),
    ...(schRes.results || []).map(r => ({ module_code: '19', kind: 'scholarship', ...r }))
  ].sort((a, b) => String(b.updated_at || '').localeCompare(String(a.updated_at || ''))).slice(0, 12);

  return json({
    ok: true,
    widgets: (wRes.results || []).map(formatWidget),
    todays_updates: todaysUpdates
  });
}

export async function handlePublicEduToolsApi(request, env) {
  await ensureEduResourcesBatch6Schema(env.DB);
  const { results } = await env.DB.prepare(
    `SELECT * FROM edu_tools_registry WHERE status = 'published' ORDER BY sort_order ASC, featured DESC, updated_at DESC LIMIT 40`
  ).all();
  return json({ ok: true, items: (results || []).map(formatTool) });
}
