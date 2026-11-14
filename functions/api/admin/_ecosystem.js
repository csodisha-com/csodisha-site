// Admin handlers for Phase 1-4 ecosystem tables: jobs_directory_nodes, schemes_directory,
// community_feedback, push_subscriptions alerts, and Content Freshness & Expiry Audit.
import { HttpError, json, readJson, validationError } from '../../_lib/http.js';
import { audit } from '../../_lib/rbac.js';
import { cleanStr, slugify, SLUG_RE, likeEscape, parsePaging } from '../../_lib/validate.js';

function safeJsonArr(val, max = 20) {
  let arr = val;
  if (typeof arr === 'string') {
    const trimmed = arr.trim();
    if (trimmed.startsWith('[')) {
      try { arr = JSON.parse(trimmed); } catch { arr = []; }
    } else {
      arr = trimmed.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map(x => cleanStr(x, 140)).filter(Boolean))].slice(0, max);
}

function validHttpOrEmpty(urlStr) {
  const s = cleanStr(urlStr, 500);
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol === 'https:' || u.protocol === 'http:') return s;
  } catch {}
  return false;
}

export async function handleJobsDirectoryAdmin(request, env, actor, id) {
  const url = new URL(request.url);
  const method = request.method;

  if (!id) {
    if (method === 'GET') {
      const { page, limit, offset } = parsePaging(url, 40, 200);
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const levelRaw = url.searchParams.get('level');
      const where = ['1=1'];
      const binds = [];
      if (levelRaw !== null && levelRaw !== '') {
        where.push('level = ?');
        binds.push(Number(levelRaw) || 0);
      }
      if (q) {
        where.push(`(title LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR code LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')`);
        const l = likeEscape(q);
        binds.push(l, l, l, l);
      }
      const w = where.join(' AND ');
      const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM jobs_directory_nodes WHERE ${w}`).bind(...binds).first()).n;
      const { results } = await env.DB.prepare(
        `SELECT * FROM jobs_directory_nodes WHERE ${w} ORDER BY level ASC, sort_order ASC, code ASC LIMIT ? OFFSET ?`
      ).bind(...binds, limit, offset).all();
      return json({
        items: results.map(r => ({
          ...r,
          notes: (() => { try { return JSON.parse(r.notes_json || '[]'); } catch { return []; } })()
        })),
        page,
        limit,
        total
      });
    }

    if (method === 'POST') {
      const body = await readJson(request);
      const errors = {};
      const title = cleanStr(body.title, 200, { required: true });
      if (!title) errors.title = 'Node title is required';
      const level = Number(body.level);
      if (![0, 1, 2, 3].includes(level)) errors.level = 'Level must be 0, 1, 2, or 3';
      const offUrl = validHttpOrEmpty(body.official_url);
      if (offUrl === false) errors.official_url = 'Official URL must be http(s)';
      const mirUrl = validHttpOrEmpty(body.mirror_url);
      if (mirUrl === false) errors.mirror_url = 'Mirror URL must be http(s)';
      if (Object.keys(errors).length) throw validationError(errors);

      const nodeId = cleanStr(body.id, 120) || crypto.randomUUID();
      const notes = safeJsonArr(body.notes !== undefined ? body.notes : body.notes_json, 30);
      await env.DB.prepare(
        `INSERT INTO jobs_directory_nodes (
           id, parent_id, level, code, title, title_or, slug, description,
           official_url, mirror_url, exam_slug, notes_json, sort_order, is_active, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(
        nodeId,
        cleanStr(body.parent_id, 120) || null,
        level,
        cleanStr(body.code, 40) || '',
        title,
        cleanStr(body.title_or, 200) || '',
        cleanStr(body.slug, 120) || slugify(title),
        cleanStr(body.description, 1000, { multiline: true }) || '',
        offUrl || '',
        mirUrl || '',
        cleanStr(body.exam_slug, 80) || '',
        JSON.stringify(notes),
        Number(body.sort_order) || 0,
        body.is_active === false || body.is_active === 0 ? 0 : 1
      ).run();
      await audit(env, request, actor, 'jobs_directory.create', 'jobs_directory_node', nodeId, { title, level });
      return json({ id: nodeId }, 201);
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  const existing = await env.DB.prepare('SELECT * FROM jobs_directory_nodes WHERE id = ?').bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Directory node not found');

  if (method === 'PUT') {
    const body = await readJson(request);
    const errors = {};
    const title = body.title !== undefined ? cleanStr(body.title, 200, { required: true }) : existing.title;
    if (!title) errors.title = 'Node title is required';
    const offUrl = body.official_url !== undefined ? validHttpOrEmpty(body.official_url) : existing.official_url;
    if (offUrl === false) errors.official_url = 'Official URL must be http(s)';
    const mirUrl = body.mirror_url !== undefined ? validHttpOrEmpty(body.mirror_url) : existing.mirror_url;
    if (mirUrl === false) errors.mirror_url = 'Mirror URL must be http(s)';
    if (Object.keys(errors).length) throw validationError(errors);

    const notes = body.notes !== undefined || body.notes_json !== undefined
      ? safeJsonArr(body.notes !== undefined ? body.notes : body.notes_json, 30)
      : (() => { try { return JSON.parse(existing.notes_json || '[]'); } catch { return []; } })();

    await env.DB.prepare(
      `UPDATE jobs_directory_nodes
       SET code = ?, title = ?, title_or = ?, description = ?, official_url = ?, mirror_url = ?,
           exam_slug = ?, notes_json = ?, sort_order = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.code !== undefined ? cleanStr(body.code, 40) : existing.code,
      title,
      body.title_or !== undefined ? cleanStr(body.title_or, 200) : existing.title_or,
      body.description !== undefined ? cleanStr(body.description, 1000, { multiline: true }) : existing.description,
      offUrl || '',
      mirUrl || '',
      body.exam_slug !== undefined ? cleanStr(body.exam_slug, 80) : existing.exam_slug,
      JSON.stringify(notes),
      body.sort_order !== undefined ? (Number(body.sort_order) || 0) : existing.sort_order,
      body.is_active !== undefined ? (body.is_active === false || body.is_active === 0 ? 0 : 1) : existing.is_active,
      id
    ).run();
    await audit(env, request, actor, 'jobs_directory.update', 'jobs_directory_node', id, { title });
    return json({ id, updated: true });
  }

  if (method === 'DELETE') {
    await env.DB.prepare(`UPDATE jobs_directory_nodes SET is_active = 0, updated_at = datetime('now') WHERE id = ?`).bind(id).run();
    await audit(env, request, actor, 'jobs_directory.deactivate', 'jobs_directory_node', id, { title: existing.title });
    return json({ id, is_active: 0 });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

function parseStructuredDocs(val) {
  let raw = val;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return [];
    if (t.startsWith('[')) {
      try { raw = JSON.parse(t); } catch { raw = []; }
    } else {
      raw = t.split('\n').map(s => s.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 20).map(item => {
    if (item && typeof item === 'object') {
      const doc = cleanStr(item.doc || item.name || item.title || '', 180);
      if (!doc) return null;
      return {
        doc,
        where: cleanStr(item.where || item.source || '', 120) || '',
        mandatory: item.mandatory !== false
      };
    }
    const doc = cleanStr(item, 180);
    return doc ? { doc, where: '', mandatory: true } : null;
  }).filter(Boolean);
}

function presentSchemeAdmin(r) {
  const arr = s => { try { const p = JSON.parse(s || '[]'); return Array.isArray(p) ? p : []; } catch { return []; } };
  return {
    ...r,
    target_groups: arr(r.target_groups),
    beneficiary_categories: arr(r.beneficiary_categories),
    documents_required: arr(r.documents_required),
    required_docs_json: arr(r.required_docs_json),
    application_steps_json: arr(r.application_steps_json),
    disbursement_mode: r.disbursement_mode || '',
    helpline: r.helpline || '',
    verified_date: r.verified_date || '',
    application_status_label: r.application_status_label || '',
    exam_slug: r.exam_slug || '',
    is_featured: Boolean(r.is_featured)
  };
}

export async function handleSchemesAdmin(request, env, actor, id) {
  const url = new URL(request.url);
  const method = request.method;

  if (!id) {
    if (method === 'GET') {
      const { page, limit, offset } = parsePaging(url, 30, 100);
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
      const status = (url.searchParams.get('status') || '').trim();
      const where = ['deleted_at IS NULL'];
      const binds = [];
      if (status) { where.push('status = ?'); binds.push(status); }
      if (q) {
        where.push(`(title LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\' OR department LIKE ? ESCAPE '\\')`);
        const l = likeEscape(q);
        binds.push(l, l, l, l);
      }
      const w = where.join(' AND ');
      const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM schemes_directory WHERE ${w}`).bind(...binds).first()).n;
      const { results } = await env.DB.prepare(
        `SELECT * FROM schemes_directory WHERE ${w} ORDER BY is_featured DESC, sort_order ASC, title ASC LIMIT ? OFFSET ?`
      ).bind(...binds, limit, offset).all();
      return json({ items: results.map(presentSchemeAdmin), page, limit, total });
    }

    if (method === 'POST') {
      const body = await readJson(request);
      const errors = {};
      const title = cleanStr(body.title, 200, { required: true });
      if (!title) errors.title = 'Scheme title is required';
      const applyUrl = validHttpOrEmpty(body.apply_url);
      if (applyUrl === false) errors.apply_url = 'Apply URL must be a valid http(s) link';
      let slug = cleanStr(body.slug, 90);
      slug = slug ? slug.toLowerCase() : slugify(title);
      if (!slug) slug = 'scheme-' + crypto.randomUUID().slice(0, 6);
      if (!SLUG_RE.test(slug)) errors.slug = 'Slug may contain lowercase letters, digits and hyphens only';
      const gender = ['all', 'female', 'male'].includes(body.gender_eligible) ? body.gender_eligible : 'all';
      const status = ['draft', 'published', 'archived'].includes(body.status) ? body.status : 'published';
      if (Object.keys(errors).length) throw validationError(errors);

      const dup = await env.DB.prepare('SELECT id FROM schemes_directory WHERE slug = ? AND deleted_at IS NULL').bind(slug).first();
      if (dup) slug = `${slug}-${crypto.randomUUID().slice(0, 5)}`;

      const docsSimple = safeJsonArr(body.documents_required, 15);
      const requiredDocs = body.required_docs_json !== undefined
        ? parseStructuredDocs(body.required_docs_json)
        : docsSimple.map(d => ({ doc: d, where: '', mandatory: true }));
      const appSteps = safeJsonArr(body.application_steps_json, 12);

      const newId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO schemes_directory (
           id, slug, title, title_or, summary, summary_or, body_md, body_md_or,
           category, department, gov_level, target_groups, min_age, max_age, max_income,
           gender_eligible, beneficiary_categories, benefit_summary, benefit_summary_or,
           documents_required, required_docs_json, application_steps_json, disbursement_mode,
           helpline, verified_date, application_status_label, exam_slug,
           apply_url, is_featured, sort_order, status,
           created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).bind(
        newId,
        slug,
        title,
        cleanStr(body.title_or, 200) || '',
        cleanStr(body.summary, 600, { multiline: true }) || '',
        cleanStr(body.summary_or, 600, { multiline: true }) || '',
        cleanStr(body.body_md, 40000, { multiline: true }) || '',
        cleanStr(body.body_md_or, 40000, { multiline: true }) || '',
        cleanStr(body.category, 60) || 'Welfare',
        cleanStr(body.department, 120) || 'Government of Odisha',
        cleanStr(body.gov_level, 30) || 'Odisha',
        JSON.stringify(safeJsonArr(body.target_groups, 10).map(s => s.toLowerCase())),
        body.min_age !== '' && body.min_age != null ? Number(body.min_age) : null,
        body.max_age !== '' && body.max_age != null ? Number(body.max_age) : null,
        body.max_income !== '' && body.max_income != null ? Number(body.max_income) : null,
        gender,
        JSON.stringify(safeJsonArr(body.beneficiary_categories, 10)),
        cleanStr(body.benefit_summary, 300) || '',
        cleanStr(body.benefit_summary_or, 300) || '',
        JSON.stringify(docsSimple),
        JSON.stringify(requiredDocs),
        JSON.stringify(appSteps),
        cleanStr(body.disbursement_mode, 120) || '',
        cleanStr(body.helpline, 120) || '',
        cleanStr(body.verified_date, 30) || '',
        cleanStr(body.application_status_label, 60) || 'Open Year-Round',
        cleanStr(body.exam_slug, 80) || '',
        applyUrl || '',
        body.is_featured ? 1 : 0,
        Number(body.sort_order) || 0,
        status
      ).run();
      await audit(env, request, actor, 'scheme.create', 'scheme', newId, { title, slug });
      return json({ id: newId, slug }, 201);
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  const existing = await env.DB.prepare('SELECT * FROM schemes_directory WHERE id = ? AND deleted_at IS NULL').bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Scheme not found');

  if (method === 'GET') return json(presentSchemeAdmin(existing));

  if (method === 'PUT') {
    const body = await readJson(request);
    const errors = {};
    const title = body.title !== undefined ? cleanStr(body.title, 200, { required: true }) : existing.title;
    if (!title) errors.title = 'Scheme title is required';
    const applyUrl = body.apply_url !== undefined ? validHttpOrEmpty(body.apply_url) : existing.apply_url;
    if (applyUrl === false) errors.apply_url = 'Apply URL must be http(s)';
    if (Object.keys(errors).length) throw validationError(errors);

    const gender = body.gender_eligible && ['all', 'female', 'male'].includes(body.gender_eligible)
      ? body.gender_eligible
      : existing.gender_eligible;
    const status = body.status && ['draft', 'published', 'archived'].includes(body.status)
      ? body.status
      : existing.status;

    await env.DB.prepare(
      `UPDATE schemes_directory SET
         title = ?, title_or = ?, summary = ?, summary_or = ?, body_md = ?, body_md_or = ?,
         category = ?, department = ?, gov_level = ?, target_groups = ?,
         min_age = ?, max_age = ?, max_income = ?, gender_eligible = ?, beneficiary_categories = ?,
         benefit_summary = ?, benefit_summary_or = ?, documents_required = ?,
         required_docs_json = ?, application_steps_json = ?, disbursement_mode = ?,
         helpline = ?, verified_date = ?, application_status_label = ?, exam_slug = ?,
         apply_url = ?, is_featured = ?, sort_order = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      title,
      body.title_or !== undefined ? cleanStr(body.title_or, 200) : existing.title_or,
      body.summary !== undefined ? cleanStr(body.summary, 600, { multiline: true }) : existing.summary,
      body.summary_or !== undefined ? cleanStr(body.summary_or, 600, { multiline: true }) : existing.summary_or,
      body.body_md !== undefined ? cleanStr(body.body_md, 40000, { multiline: true }) : existing.body_md,
      body.body_md_or !== undefined ? cleanStr(body.body_md_or, 40000, { multiline: true }) : existing.body_md_or,
      body.category !== undefined ? cleanStr(body.category, 60) : existing.category,
      body.department !== undefined ? cleanStr(body.department, 120) : existing.department,
      body.gov_level !== undefined ? cleanStr(body.gov_level, 30) : existing.gov_level,
      body.target_groups !== undefined ? JSON.stringify(safeJsonArr(body.target_groups, 10).map(s => s.toLowerCase())) : existing.target_groups,
      body.min_age !== undefined ? (body.min_age === '' || body.min_age == null ? null : Number(body.min_age)) : existing.min_age,
      body.max_age !== undefined ? (body.max_age === '' || body.max_age == null ? null : Number(body.max_age)) : existing.max_age,
      body.max_income !== undefined ? (body.max_income === '' || body.max_income == null ? null : Number(body.max_income)) : existing.max_income,
      gender,
      body.beneficiary_categories !== undefined ? JSON.stringify(safeJsonArr(body.beneficiary_categories, 10)) : existing.beneficiary_categories,
      body.benefit_summary !== undefined ? cleanStr(body.benefit_summary, 300) : existing.benefit_summary,
      body.benefit_summary_or !== undefined ? cleanStr(body.benefit_summary_or, 300) : existing.benefit_summary_or,
      body.documents_required !== undefined ? JSON.stringify(safeJsonArr(body.documents_required, 15)) : existing.documents_required,
      body.required_docs_json !== undefined ? JSON.stringify(parseStructuredDocs(body.required_docs_json)) : (existing.required_docs_json || '[]'),
      body.application_steps_json !== undefined ? JSON.stringify(safeJsonArr(body.application_steps_json, 12)) : (existing.application_steps_json || '[]'),
      body.disbursement_mode !== undefined ? cleanStr(body.disbursement_mode, 120) : (existing.disbursement_mode || ''),
      body.helpline !== undefined ? cleanStr(body.helpline, 120) : (existing.helpline || ''),
      body.verified_date !== undefined ? cleanStr(body.verified_date, 30) : (existing.verified_date || ''),
      body.application_status_label !== undefined ? cleanStr(body.application_status_label, 60) : (existing.application_status_label || ''),
      body.exam_slug !== undefined ? cleanStr(body.exam_slug, 80) : (existing.exam_slug || ''),
      applyUrl || '',
      body.is_featured !== undefined ? (body.is_featured ? 1 : 0) : existing.is_featured,
      body.sort_order !== undefined ? (Number(body.sort_order) || 0) : existing.sort_order,
      status,
      id
    ).run();
    await audit(env, request, actor, 'scheme.update', 'scheme', id, { title, status });
    return json({ id, updated: true });
  }

  if (method === 'DELETE') {
    await env.DB.prepare(`UPDATE schemes_directory SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`).bind(id).run();
    await audit(env, request, actor, 'scheme.delete', 'scheme', id, { title: existing.title });
    return json({ id, deleted: true });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleFeedbackAdmin(request, env, actor, id) {
  const url = new URL(request.url);
  const method = request.method;

  if (!id) {
    if (method === 'GET') {
      const { page, limit, offset } = parsePaging(url, 25, 100);
      const status = (url.searchParams.get('status') || '').trim();
      const where = ['1=1'];
      const binds = [];
      if (status) { where.push('status = ?'); binds.push(status); }
      const w = where.join(' AND ');
      const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM community_feedback WHERE ${w}`).bind(...binds).first()).n;
      const { results } = await env.DB.prepare(
        `SELECT * FROM community_feedback WHERE ${w} ORDER BY CASE status WHEN 'open' THEN 0 WHEN 'reviewed' THEN 1 ELSE 2 END, created_at DESC LIMIT ? OFFSET ?`
      ).bind(...binds, limit, offset).all();
      return json({ items: results, page, limit, total });
    }
    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  const existing = await env.DB.prepare('SELECT * FROM community_feedback WHERE id = ?').bind(id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Feedback item not found');

  if (method === 'PUT' || method === 'POST') {
    const body = await readJson(request);
    const status = ['open', 'reviewed', 'resolved', 'dismissed'].includes(body.status) ? body.status : existing.status;
    const note = body.admin_note !== undefined ? cleanStr(body.admin_note, 500, { multiline: true }) : existing.admin_note;
    const resolvedAt = (status === 'resolved' || status === 'dismissed') ? new Date().toISOString() : null;
    await env.DB.prepare(
      `UPDATE community_feedback SET status = ?, admin_note = ?, resolved_at = COALESCE(?, resolved_at) WHERE id = ?`
    ).bind(status, note || '', resolvedAt, id).run();
    await audit(env, request, actor, 'feedback.triage', 'community_feedback', id, { status });
    return json({ id, status });
  }

  if (method === 'DELETE') {
    await env.DB.prepare('DELETE FROM community_feedback WHERE id = ?').bind(id).run();
    await audit(env, request, actor, 'feedback.delete', 'community_feedback', id, {});
    return json({ id, deleted: true });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleFreshnessAudit(env) {
  const [expiredLiveJobs, expiringSoonJobs, staleCa, pendingDrafts, openFeedback, pushSubs] = await Promise.all([
    env.DB.prepare(
      `SELECT id, slug, title, organisation, last_date, status
       FROM posts
       WHERE type = 'job' AND deleted_at IS NULL AND status = 'published'
         AND last_date IS NOT NULL AND last_date < date('now')
       ORDER BY last_date ASC LIMIT 25`
    ).all(),
    env.DB.prepare(
      `SELECT id, slug, title, organisation, last_date
       FROM posts
       WHERE type = 'job' AND deleted_at IS NULL AND status = 'published'
         AND last_date IS NOT NULL AND last_date >= date('now') AND last_date <= date('now', '+7 days')
       ORDER BY last_date ASC LIMIT 25`
    ).all(),
    env.DB.prepare(
      `SELECT id, slug, title, published_at, updated_at
       FROM posts
       WHERE type = 'current_affair' AND deleted_at IS NULL AND status = 'published'
         AND COALESCE(published_at, updated_at) < datetime('now', '-180 days')
       ORDER BY published_at ASC LIMIT 20`
    ).all(),
    env.DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM posts WHERE deleted_at IS NULL AND status = 'draft') AS draft_posts,
         (SELECT COUNT(*) FROM mock_tests WHERE deleted_at IS NULL AND status = 'draft') AS draft_tests,
         (SELECT COUNT(*) FROM schemes_directory WHERE deleted_at IS NULL AND status = 'draft') AS draft_schemes`
    ).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM community_feedback WHERE status = 'open'`).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM push_subscriptions`).first()
  ]);

  return json({
    expired_but_published_jobs: expiredLiveJobs.results || [],
    expiring_within_7_days: expiringSoonJobs.results || [],
    stale_current_affairs: staleCa.results || [],
    drafts: pendingDrafts || { draft_posts: 0, draft_tests: 0, draft_schemes: 0 },
    open_feedback_count: openFeedback ? openFeedback.n : 0,
    push_subscriber_count: pushSubs ? pushSubs.n : 0,
    audited_at: new Date().toISOString()
  });
}

export async function handleAboutDirectoryAdmin(request, env, actor, id) {
  const url = new URL(request.url);
  const method = request.method;

  if (!id) {
    if (method === 'GET') {
      const { page, limit, offset } = parsePaging(url, 50, 200);
      const level = (url.searchParams.get('level') || '').trim();
      const groupSlug = (url.searchParams.get('group') || '').trim();
      const status = (url.searchParams.get('status') || '').trim();
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);

      const where = ['1=1'];
      const binds = [];
      if (level && ['group', 'section', 'entry'].includes(level)) {
        where.push('level = ?');
        binds.push(level);
      }
      if (status && ['published', 'draft'].includes(status)) {
        where.push('status = ?');
        binds.push(status);
      }
      if (groupSlug) {
        where.push(`(slug = ? OR parent_slug = ? OR parent_slug IN (SELECT slug FROM about_directory_nodes WHERE parent_slug = ? AND level = 'section'))`);
        binds.push(groupSlug, groupSlug, groupSlug);
      }
      if (q) {
        where.push(`(title LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR subtitle LIKE ? ESCAPE '\\' OR body_text LIKE ? ESCAPE '\\' OR slug LIKE ? ESCAPE '\\')`);
        const l = likeEscape(q);
        binds.push(l, l, l, l, l);
      }

      const w = where.join(' AND ');
      const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM about_directory_nodes WHERE ${w}`).bind(...binds).first()).n;
      const { results } = await env.DB.prepare(
        `SELECT * FROM about_directory_nodes
         WHERE ${w}
         ORDER BY CASE level WHEN 'group' THEN 0 WHEN 'section' THEN 1 ELSE 2 END, sort_order ASC, title ASC
         LIMIT ? OFFSET ?`
      ).bind(...binds, limit, offset).all();
      const { results: groupList } = await env.DB.prepare(
        `SELECT slug, title, level FROM about_directory_nodes WHERE level IN ('group', 'section') ORDER BY level ASC, sort_order ASC`
      ).all();
      return json({ items: results || [], parents: groupList || [], page, limit, total });
    }

    if (method === 'POST') {
      const body = await readJson(request);
      const errors = {};
      const title = cleanStr(body.title, 220, { required: true });
      if (!title) errors.title = 'Title is required';
      const level = cleanStr(body.level, 20) || 'entry';
      if (!['group', 'section', 'entry'].includes(level)) errors.level = 'Level must be group, section, or entry';
      const status = body.status === 'draft' ? 'draft' : 'published';
      const offUrl = cleanStr(body.official_url, 500);
      if (offUrl && !/^(\/|https?:\/\/)/i.test(offUrl)) {
        errors.official_url = 'Official URL must start with / or http(s)://';
      }
      if (Object.keys(errors).length) throw validationError(errors);

      const rawSlug = cleanStr(body.slug, 100) || slugify(title);
      let finalSlug = rawSlug;
      const dup = await env.DB.prepare('SELECT id FROM about_directory_nodes WHERE slug = ?').bind(finalSlug).first();
      if (dup) finalSlug = `${rawSlug}-${Date.now().toString(36).slice(-4)}`;

      const nodeId = cleanStr(body.id, 120) || `about-${level}-${crypto.randomUUID().slice(0, 8)}`;
      await env.DB.prepare(
        `INSERT INTO about_directory_nodes (
           id, slug, parent_slug, level, title, title_or, subtitle, subtitle_or,
           body_text, body_text_or, badge_text, icon_name, official_url, sort_order, status, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(
        nodeId,
        finalSlug,
        cleanStr(body.parent_slug, 100) || null,
        level,
        title,
        cleanStr(body.title_or, 220) || '',
        cleanStr(body.subtitle, 300) || '',
        cleanStr(body.subtitle_or, 300) || '',
        cleanStr(body.body_text, 4000, { multiline: true }) || '',
        cleanStr(body.body_text_or, 4000, { multiline: true }) || '',
        cleanStr(body.badge_text, 60) || '',
        cleanStr(body.icon_name, 16) || '📄',
        offUrl || '',
        Number(body.sort_order) || 0,
        status
      ).run();
      await audit(env, request, actor, 'about_directory.create', 'about_directory_node', nodeId, { title, level, slug: finalSlug });
      return json({ id: nodeId, slug: finalSlug }, 201);
    }

    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  const existing = await env.DB.prepare('SELECT * FROM about_directory_nodes WHERE id = ? OR slug = ?').bind(id, id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'About directory node not found');

  if (method === 'PUT') {
    const body = await readJson(request);
    const errors = {};
    const title = body.title !== undefined ? cleanStr(body.title, 220, { required: true }) : existing.title;
    if (!title) errors.title = 'Title is required';
    const level = body.level !== undefined ? cleanStr(body.level, 20) : existing.level;
    if (!['group', 'section', 'entry'].includes(level)) errors.level = 'Level must be group, section, or entry';
    const offUrl = body.official_url !== undefined ? cleanStr(body.official_url, 500) : existing.official_url;
    if (offUrl && !/^(\/|https?:\/\/)/i.test(offUrl)) {
      errors.official_url = 'Official URL must start with / or http(s)://';
    }
    if (Object.keys(errors).length) throw validationError(errors);

    const status = body.status !== undefined ? (body.status === 'draft' ? 'draft' : 'published') : existing.status;
    await env.DB.prepare(
      `UPDATE about_directory_nodes
       SET parent_slug = ?, level = ?, title = ?, title_or = ?, subtitle = ?, subtitle_or = ?,
           body_text = ?, body_text_or = ?, badge_text = ?, icon_name = ?, official_url = ?,
           sort_order = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.parent_slug !== undefined ? (cleanStr(body.parent_slug, 100) || null) : existing.parent_slug,
      level,
      title,
      body.title_or !== undefined ? cleanStr(body.title_or, 220) : existing.title_or,
      body.subtitle !== undefined ? cleanStr(body.subtitle, 300) : existing.subtitle,
      body.subtitle_or !== undefined ? cleanStr(body.subtitle_or, 300) : existing.subtitle_or,
      body.body_text !== undefined ? cleanStr(body.body_text, 4000, { multiline: true }) : existing.body_text,
      body.body_text_or !== undefined ? cleanStr(body.body_text_or, 4000, { multiline: true }) : existing.body_text_or,
      body.badge_text !== undefined ? cleanStr(body.badge_text, 60) : existing.badge_text,
      body.icon_name !== undefined ? (cleanStr(body.icon_name, 16) || '📄') : existing.icon_name,
      offUrl || '',
      body.sort_order !== undefined ? (Number(body.sort_order) || 0) : existing.sort_order,
      status,
      existing.id
    ).run();
    await audit(env, request, actor, 'about_directory.update', 'about_directory_node', existing.id, { title, status });
    return json({ id: existing.id, updated: true, status });
  }

  if (method === 'DELETE') {
    await env.DB.prepare('DELETE FROM about_directory_nodes WHERE id = ?').bind(existing.id).run();
    await audit(env, request, actor, 'about_directory.delete', 'about_directory_node', existing.id, { title: existing.title });
    return json({ id: existing.id, deleted: true });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}

export async function handleSchemesDirectoryTreeAdmin(request, env, actor, id) {
  const url = new URL(request.url);
  const method = request.method;
  const LEVELS = ['group', 'section', 'subcategory', 'entry'];

  if (!id) {
    if (method === 'GET') {
      const { page, limit, offset } = parsePaging(url, 50, 200);
      const level = (url.searchParams.get('level') || '').trim();
      const groupSlug = (url.searchParams.get('group') || '').trim();
      const status = (url.searchParams.get('status') || '').trim();
      const q = (url.searchParams.get('q') || '').trim().slice(0, 100);

      const where = ['1=1'];
      const binds = [];
      if (level && LEVELS.includes(level)) {
        where.push('level = ?');
        binds.push(level);
      }
      if (status && ['published', 'draft'].includes(status)) {
        where.push('status = ?');
        binds.push(status);
      }
      if (groupSlug) {
        where.push(`(
          slug = ? OR parent_slug = ?
          OR parent_slug IN (SELECT slug FROM schemes_directory_nodes WHERE parent_slug = ? AND level = 'section')
          OR parent_slug IN (SELECT slug FROM schemes_directory_nodes WHERE level = 'subcategory' AND parent_slug IN (
            SELECT slug FROM schemes_directory_nodes WHERE parent_slug = ? AND level = 'section'
          ))
        )`);
        binds.push(groupSlug, groupSlug, groupSlug, groupSlug);
      }
      if (q) {
        where.push(`(title LIKE ? ESCAPE '\\' OR title_or LIKE ? ESCAPE '\\' OR subtitle LIKE ? ESCAPE '\\' OR badge_text LIKE ? ESCAPE '\\' OR slug LIKE ? ESCAPE '\\')`);
        const l = likeEscape(q);
        binds.push(l, l, l, l, l);
      }

      const w = where.join(' AND ');
      const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM schemes_directory_nodes WHERE ${w}`).bind(...binds).first()).n;
      const { results } = await env.DB.prepare(
        `SELECT * FROM schemes_directory_nodes
         WHERE ${w}
         ORDER BY CASE level WHEN 'group' THEN 0 WHEN 'section' THEN 1 WHEN 'subcategory' THEN 2 ELSE 3 END, sort_order ASC, title ASC
         LIMIT ? OFFSET ?`
      ).bind(...binds, limit, offset).all();
      const { results: parentList } = await env.DB.prepare(
        `SELECT slug, title, level, parent_slug FROM schemes_directory_nodes
         WHERE level IN ('group', 'section', 'subcategory')
         ORDER BY CASE level WHEN 'group' THEN 0 WHEN 'section' THEN 1 ELSE 2 END, sort_order ASC, title ASC`
      ).all();
      return json({ items: results || [], parents: parentList || [], page, limit, total });
    }

    if (method === 'POST') {
      const body = await readJson(request);
      const errors = {};
      const title = cleanStr(body.title, 240, { required: true });
      if (!title) errors.title = 'Title is required';
      const level = cleanStr(body.level, 20) || 'entry';
      if (!LEVELS.includes(level)) errors.level = 'Level must be group, section, subcategory, or entry';
      const status = body.status === 'draft' ? 'draft' : 'published';
      const offUrl = cleanStr(body.official_url, 500);
      if (offUrl && !/^(\/|https?:\/\/)/i.test(offUrl)) {
        errors.official_url = 'Official URL must start with / or http(s)://';
      }
      if (Object.keys(errors).length) throw validationError(errors);

      const rawSlug = cleanStr(body.slug, 100) || slugify(title);
      let finalSlug = rawSlug || `sch-node-${Date.now().toString(36)}`;
      const dup = await env.DB.prepare('SELECT id FROM schemes_directory_nodes WHERE slug = ?').bind(finalSlug).first();
      if (dup) finalSlug = `${finalSlug}-${Date.now().toString(36).slice(-4)}`;

      let metaJson = '{}';
      if (typeof body.metadata_json === 'string' && body.metadata_json.trim()) {
        try { JSON.parse(body.metadata_json); metaJson = body.metadata_json.trim().slice(0, 2000); } catch { metaJson = '{}'; }
      } else if (body.metadata && typeof body.metadata === 'object') {
        metaJson = JSON.stringify(body.metadata).slice(0, 2000);
      }

      const nodeId = cleanStr(body.id, 120) || `sch-node-${level}-${crypto.randomUUID().slice(0, 8)}`;
      await env.DB.prepare(
        `INSERT INTO schemes_directory_nodes (
           id, slug, parent_slug, level, title, title_or, subtitle, subtitle_or,
           badge_text, icon_name, official_url, metadata_json, sort_order, status, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(
        nodeId,
        finalSlug,
        cleanStr(body.parent_slug, 100) || null,
        level,
        title,
        cleanStr(body.title_or, 240) || '',
        cleanStr(body.subtitle, 320) || '',
        cleanStr(body.subtitle_or, 320) || '',
        cleanStr(body.badge_text, 60) || '',
        cleanStr(body.icon_name, 16) || '📄',
        offUrl || '',
        metaJson,
        Number(body.sort_order) || 0,
        status
      ).run();
      await audit(env, request, actor, 'schemes_directory.create', 'schemes_directory_node', nodeId, { title, level, slug: finalSlug });
      return json({ id: nodeId, slug: finalSlug }, 201);
    }

    throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
  }

  const existing = await env.DB.prepare('SELECT * FROM schemes_directory_nodes WHERE id = ? OR slug = ?').bind(id, id).first();
  if (!existing) throw new HttpError(404, 'NOT_FOUND', 'Schemes directory node not found');

  if (method === 'PUT') {
    const body = await readJson(request);
    const errors = {};
    const title = body.title !== undefined ? cleanStr(body.title, 240, { required: true }) : existing.title;
    if (!title) errors.title = 'Title is required';
    const level = body.level !== undefined ? cleanStr(body.level, 20) : existing.level;
    if (!LEVELS.includes(level)) errors.level = 'Level must be group, section, subcategory, or entry';
    const offUrl = body.official_url !== undefined ? cleanStr(body.official_url, 500) : existing.official_url;
    if (offUrl && !/^(\/|https?:\/\/)/i.test(offUrl)) {
      errors.official_url = 'Official URL must start with / or http(s)://';
    }
    if (Object.keys(errors).length) throw validationError(errors);

    let metaJson = existing.metadata_json || '{}';
    if (typeof body.metadata_json === 'string' && body.metadata_json.trim()) {
      try { JSON.parse(body.metadata_json); metaJson = body.metadata_json.trim().slice(0, 2000); } catch {}
    }

    const status = body.status !== undefined ? (body.status === 'draft' ? 'draft' : 'published') : existing.status;
    await env.DB.prepare(
      `UPDATE schemes_directory_nodes
       SET parent_slug = ?, level = ?, title = ?, title_or = ?, subtitle = ?, subtitle_or = ?,
           badge_text = ?, icon_name = ?, official_url = ?, metadata_json = ?,
           sort_order = ?, status = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).bind(
      body.parent_slug !== undefined ? (cleanStr(body.parent_slug, 100) || null) : existing.parent_slug,
      level,
      title,
      body.title_or !== undefined ? cleanStr(body.title_or, 240) : existing.title_or,
      body.subtitle !== undefined ? cleanStr(body.subtitle, 320) : existing.subtitle,
      body.subtitle_or !== undefined ? cleanStr(body.subtitle_or, 320) : existing.subtitle_or,
      body.badge_text !== undefined ? cleanStr(body.badge_text, 60) : existing.badge_text,
      body.icon_name !== undefined ? (cleanStr(body.icon_name, 16) || '📄') : existing.icon_name,
      offUrl || '',
      metaJson,
      body.sort_order !== undefined ? (Number(body.sort_order) || 0) : existing.sort_order,
      status,
      existing.id
    ).run();
    await audit(env, request, actor, 'schemes_directory.update', 'schemes_directory_node', existing.id, { title, status });
    return json({ id: existing.id, updated: true, status });
  }

  if (method === 'DELETE') {
    await env.DB.prepare('DELETE FROM schemes_directory_nodes WHERE id = ?').bind(existing.id).run();
    await audit(env, request, actor, 'schemes_directory.delete', 'schemes_directory_node', existing.id, { title: existing.title });
    return json({ id: existing.id, deleted: true });
  }

  throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
}
