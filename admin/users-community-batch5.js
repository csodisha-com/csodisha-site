/* Users, Roles & Community Batch 5 (17-19) Content Command Workspace — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/users';
  const MODULES = {
    'module-09-017': { num: '17', title: 'Share Knowledge' },
    'module-09-018': { num: '18', title: 'Suggest a Topic' },
    'module-09-019': { num: '19', title: 'Report an Error' }
  };

  const KNOWLEDGE_KINDS = [
    ['study_note', 'Study Note'],
    ['exam_strategy', 'Exam Strategy'],
    ['mnemonics_cheat_sheet', 'Mnemonics Cheat Sheet'],
    ['odisha_gk_digest', 'Odisha GK Digest'],
    ['teaching_pedagogy', 'Teaching Pedagogy']
  ];
  const TOPIC_PORTALS = [
    ['study-library', 'Study Library'],
    ['mock-tests', 'Mock Tests'],
    ['jobs-careers', 'Jobs & Careers'],
    ['schemes', 'Schemes'],
    ['educational-tools', 'Educational Tools']
  ];
  const ERRATA_AREAS = [
    ['study_note_pdf', 'Study Note / PDF'],
    ['mcq_answer_key', 'MCQ Answer Key'],
    ['job_notification', 'Job Notification'],
    ['scheme_eligibility', 'Scheme Eligibility'],
    ['broken_download', 'Broken Download'],
    ['translation_typo', 'Translation Typo']
  ];
  const ERRATA_TYPES = [
    ['wrong_answer_key', 'Wrong Answer Key'],
    ['outdated_date_fee', 'Outdated Date / Fee'],
    ['odia_translation_error', 'Odia Translation Error'],
    ['broken_link_pdf', 'Broken Link / PDF'],
    ['factual_typo', 'Factual Typo']
  ];

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (Array.isArray(text)) {
      text.forEach(ch => {
        if (ch instanceof Node) n.appendChild(ch);
        else if (ch !== undefined && ch !== null) n.appendChild(document.createTextNode(String(ch)));
      });
    } else if (text instanceof Node) {
      n.appendChild(text);
    } else if (text !== undefined && text !== null) {
      n.textContent = String(text);
    }
    return n;
  }

  function btn(label, cls, onClick) {
    const b = el('button', `cso-edu-btn ${cls || ''}`.trim(), label);
    b.type = 'button';
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }

  function toast(msg, kind) {
    if (typeof window.showToast === 'function') { window.showToast(msg, kind || 'info'); return; }
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = el('div', 'cso-toast', msg);
    c.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  async function api(path, method, body) {
    const headers = {};
    if (method && method !== 'GET') {
      headers['X-CSO-CSRF'] = '1';
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(path, {
      method: method || 'GET',
      credentials: 'same-origin',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
    return data;
  }

  function field(labelText, node) {
    const f = el('div', 'cso-edu-field');
    f.append(el('label', 'cso-edu-label', labelText), node);
    return f;
  }

  function textInput(type, value, placeholder) {
    const i = el('input', 'cso-edu-input cso-edu-input-full');
    i.type = type || 'text';
    if (placeholder) i.placeholder = placeholder;
    if (value !== undefined && value !== null) i.value = value;
    return i;
  }

  function textareaOf(value, placeholder) {
    const t = el('textarea', 'cso-edu-textarea');
    if (placeholder) t.placeholder = placeholder;
    if (value !== undefined && value !== null) t.value = value;
    return t;
  }

  function selectOf(options, value) {
    const s = el('select', 'cso-edu-select cso-edu-input-full');
    options.forEach(([v, l]) => {
      const o = el('option', '', l);
      o.value = v;
      s.appendChild(o);
    });
    if (value !== undefined && value !== null) s.value = value;
    return s;
  }

  function statusBadge(st) {
    let cls = 'cso-urc-badge-status';
    if (st === 'approved_community' || st === 'promoted_to_library' || st === 'published' || st === 'fixed_deployed') cls += ' is-active';
    else if (st === 'pending_review' || st === 'new' || st === 'under_review' || st === 'planned' || st === 'in_production' || st === 'open' || st === 'verifying') cls += ' is-pending';
    else if (st === 'rejected' || st === 'needs_revision' || st === 'declined' || st === 'high' || st === 'critical') cls += ' is-danger';
    return el('span', cls, st);
  }

  function openDrawer(title, bodyNodes) {
    const backdrop = el('div', 'cso-edu-drawer-backdrop');
    const drawer = el('div', 'cso-edu-drawer');
    const head = el('div', 'cso-edu-drawer-head');
    head.append(el('h3', '', title), btn('Close', '', () => backdrop.remove()));
    const body = el('div', 'cso-edu-drawer-body');
    bodyNodes.forEach(n => body.appendChild(n));
    const foot = el('div', 'cso-edu-drawer-foot');
    drawer.append(head, body, foot);
    backdrop.appendChild(drawer);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
    document.body.appendChild(backdrop);
    return { backdrop, body, foot };
  }

  function attachRevisions(body, moduleCode, entityId, onDone) {
    if (!entityId) return;
    const hist = el('div', 'cso-edu-rev-list');
    body.append(el('div', 'cso-edu-section-title', 'Revision history'), hist);
    api(`${API}/revisions?module_code=${moduleCode}&entity_id=${encodeURIComponent(entityId)}`).then(r => {
      const items = r.items || [];
      if (!items.length) {
        hist.appendChild(el('div', 'cso-edu-empty', 'No revisions yet.'));
        return;
      }
      items.slice(0, 8).forEach(rev => {
        const row = el('div', 'cso-edu-rev-item');
        row.appendChild(el('span', '', `v${rev.version_num} · ${rev.change_note || 'update'} · ${rev.created_at}`));
        row.appendChild(btn('Rollback', '', async () => {
          try {
            await api(`${API}/revisions/rollback`, 'POST', { revision_id: rev.id });
            toast(`Rolled back to v${rev.version_num}`, 'success');
            onDone();
          } catch (e) { toast(e.message, 'error'); }
        }));
        hist.appendChild(row);
      });
    }).catch(() => {});
  }

  /* ================= MODULE 17: SHARE KNOWLEDGE ================= */
  async function renderSharedKnowledge(root) {
    const state = { status: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '17 · Share Knowledge Submissions'),
        el('div', 'cso-edu-sub', 'Review community study notes & promote top Odisha resources directly into Study Library (edu_resources).')
      );
      head.append(tb, btn('+ Add Submission', 'cso-edu-btn-primary', openNewShkDrawer));
      wrap.appendChild(head);

      const tabs = el('div', 'cso-urc-tabs');
      [
        ['', 'All'],
        ['pending_review', 'Pending Review'],
        ['approved_community', 'Approved Community'],
        ['promoted_to_library', 'Promoted to Library'],
        ['needs_revision', 'Needs Revision']
      ].forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.status === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.status = val; draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search code, title, contributor, exam...');
      qIn.className = 'cso-edu-input';
      bar.append(qIn, btn('Filter', 'cso-edu-btn-primary', () => { state.q = qIn.value.trim(); draw(); }));
      wrap.appendChild(bar);

      const qs = new URLSearchParams();
      if (state.status) qs.set('review_status', state.status);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/shared-knowledge?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No shared knowledge submissions found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Code', 'Submission (EN/OR)', 'Contributor', 'Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(s => {
        const tr = el('tr');
        tr.appendChild(el('td', '', s.submission_code));
        const tc = el('td');
        tc.append(el('strong', '', s.title_en), el('div', 'cso-edu-sub', `${s.title_or || s.subject_or_exam} · ${s.content_kind}`));
        tr.appendChild(tc);

        const cc = el('td');
        cc.append(el('div', '', s.contributor_name), el('span', 'cso-urc-badge-district', s.district_odisha || 'Khordha'));
        tr.appendChild(cc);

        const sc = el('td');
        sc.append(statusBadge(s.review_status));
        if (s.promoted_edu_resource_id) sc.appendChild(el('div', 'cso-edu-sub', `Lib: ${s.promoted_edu_resource_id}`));
        tr.appendChild(sc);

        const act = el('td', 'cso-edu-actions');
        act.append(
          btn('Preview', 'cso-edu-btn-sm', () => openPreviewModal(s)),
          btn('Promote to Study Library', 'cso-edu-btn-sm cso-edu-btn-primary', async () => {
            try {
              const res = await api(`${API}/shared-knowledge/${encodeURIComponent(s.id)}`, 'PATCH', { action: 'promote_to_library' });
              toast(`Promoted to edu_resources (${res.item.promoted_edu_resource_id})`, 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }),
          btn('Approve', 'cso-edu-btn-sm', async () => {
            try {
              await api(`${API}/shared-knowledge/${encodeURIComponent(s.id)}`, 'PATCH', { action: 'approve_community' });
              toast('Approved for community', 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }),
          btn('Revisions', 'cso-edu-btn-sm', () => {
            const { backdrop, body } = openDrawer(`Revisions · ${s.submission_code}`, []);
            attachRevisions(body, '17', s.id, () => { backdrop.remove(); draw(); });
          })
        );
        tr.appendChild(act);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openPreviewModal(s) {
      const card = el('div', 'cso-urc-pubcard');
      card.append(
        el('h3', '', s.title_en),
        el('div', 'cso-urc-pubcard-meta', `${s.contributor_name} · ${s.district_odisha} · ${s.subject_or_exam} · ${s.content_kind}`),
        el('div', 'cso-urc-pubcard-bio', [
          el('strong', '', 'English: '),
          document.createTextNode(s.body_en || '—'),
          el('br'),
          el('strong', '', 'ଓଡ଼ିଆ: '),
          document.createTextNode(s.body_or || '—')
        ])
      );
      openDrawer(`Preview · ${s.submission_code}`, [card]);
    }

    function openNewShkDrawer() {
      const nameIn = textInput('text', '', 'Contributor name');
      const kindSel = selectOf(KNOWLEDGE_KINDS, 'study_note');
      const subjIn = textInput('text', 'OPSC OAS', 'Subject / Exam');
      const titleEnIn = textInput('text', '', 'Title (English)');
      const titleOrIn = textInput('text', '', 'ଶୀର୍ଷକ (ଓଡ଼ିଆ)');
      const bodyEnIn = textareaOf('', 'Study note content (English)...');
      const bodyOrIn = textareaOf('', 'ଓଡ଼ିଆ ବିଷୟବସ୍ତୁ...');

      const { backdrop, foot } = openDrawer('Add Shared Knowledge Submission', [
        field('Contributor Name', nameIn),
        field('Content Kind', kindSel),
        field('Subject / Exam', subjIn),
        field('Title (English)', titleEnIn),
        field('Title (Odia)', titleOrIn),
        field('Body (English)', bodyEnIn),
        field('Body (Odia)', bodyOrIn)
      ]);
      foot.appendChild(btn('Submit Knowledge', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/shared-knowledge`, 'POST', {
            contributor_name: nameIn.value.trim(),
            content_kind: kindSel.value,
            subject_or_exam: subjIn.value.trim(),
            title_en: titleEnIn.value.trim(),
            title_or: titleOrIn.value.trim(),
            body_en: bodyEnIn.value.trim(),
            body_or: bodyOrIn.value.trim()
          });
          toast('Submission added', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 18: SUGGEST A TOPIC ================= */
  async function renderTopicSuggestions(root) {
    const state = { status: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '18 · Suggest a Topic Pipeline'),
        el('div', 'cso-edu-sub', 'Upvoted student topic requests mapped to Study Library, Mock Tests, Jobs, and Schemes.')
      );
      head.append(tb, btn('+ Suggest Topic', 'cso-edu-btn-primary', openNewTopicDrawer));
      wrap.appendChild(head);

      const tabs = el('div', 'cso-urc-tabs');
      [
        ['', 'All'],
        ['new', 'New'],
        ['planned', 'Planned'],
        ['in_production', 'In Production'],
        ['published', 'Published'],
        ['declined', 'Declined']
      ].forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.status === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.status = val; draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search code, topic title, exam...');
      qIn.className = 'cso-edu-input';
      bar.append(qIn, btn('Filter', 'cso-edu-btn-primary', () => { state.q = qIn.value.trim(); draw(); }));
      wrap.appendChild(bar);

      const qs = new URLSearchParams();
      if (state.status) qs.set('workflow_status', state.status);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/topic-suggestions?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No topic suggestions found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Code & Votes', 'Topic (EN/OR)', 'Portal & Exam', 'Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(t => {
        const tr = el('tr');
        const vc = el('td');
        vc.append(el('div', '', t.suggestion_code), el('span', 'cso-urc-badge-edu', `${t.votes_count} votes`));
        tr.appendChild(vc);

        const tc = el('td');
        tc.append(el('strong', '', t.topic_title_en), el('div', 'cso-edu-sub', t.topic_title_or || t.rationale_text));
        tr.appendChild(tc);

        const pe = el('td');
        pe.append(el('div', '', t.target_portal), el('div', 'cso-edu-sub', `${t.exam_or_class} · ${t.suggested_by_name}`));
        tr.appendChild(pe);

        tr.appendChild(el('td', '', statusBadge(t.workflow_status)));

        const act = el('td', 'cso-edu-actions');
        act.append(
          btn('+1 Vote', 'cso-edu-btn-sm', async () => {
            try {
              await api(`${API}/topic-suggestions/${encodeURIComponent(t.id)}`, 'PATCH', { action: 'upvote' });
              toast('Upvoted topic suggestion', 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }),
          btn('Plan Topic', 'cso-edu-btn-sm cso-edu-btn-primary', async () => {
            try {
              await api(`${API}/topic-suggestions/${encodeURIComponent(t.id)}`, 'PATCH', { workflow_status: 'planned' });
              toast(`Marked ${t.suggestion_code} as planned`, 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }),
          btn('Revisions', 'cso-edu-btn-sm', () => {
            const { backdrop, body } = openDrawer(`Revisions · ${t.suggestion_code}`, []);
            attachRevisions(body, '18', t.id, () => { backdrop.remove(); draw(); });
          })
        );
        tr.appendChild(act);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openNewTopicDrawer() {
      const nameIn = textInput('text', '', 'Student name');
      const portSel = selectOf(TOPIC_PORTALS, 'study-library');
      const examIn = textInput('text', 'OSSC CGL', 'Exam or Class');
      const titleEnIn = textInput('text', '', 'Topic title (English)');
      const titleOrIn = textInput('text', '', 'ବିଷୟ ଶୀର୍ଷକ (ଓଡ଼ିଆ)');
      const ratIn = textareaOf('', 'Why is this topic needed?');

      const { backdrop, foot } = openDrawer('Suggest a New Topic', [
        field('Suggested By', nameIn),
        field('Target Portal', portSel),
        field('Exam / Class', examIn),
        field('Topic Title (English)', titleEnIn),
        field('Topic Title (Odia)', titleOrIn),
        field('Rationale', ratIn)
      ]);
      foot.appendChild(btn('Submit Suggestion', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/topic-suggestions`, 'POST', {
            suggested_by_name: nameIn.value.trim(),
            target_portal: portSel.value,
            exam_or_class: examIn.value.trim(),
            topic_title_en: titleEnIn.value.trim(),
            topic_title_or: titleOrIn.value.trim(),
            rationale_text: ratIn.value.trim()
          });
          toast('Topic suggestion added', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 19: REPORT AN ERROR (ERRATA) ================= */
  async function renderErrorReports(root) {
    const state = { status: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '19 · Report an Error (Errata Desk)'),
        el('div', 'cso-edu-sub', 'Track MCQ answer key corrections, outdated job/scheme dates, broken PDFs, and Odia typos.')
      );
      head.append(tb, btn('+ Log Errata', 'cso-edu-btn-primary', openNewErrataDrawer));
      wrap.appendChild(head);

      const tabs = el('div', 'cso-urc-tabs');
      [
        ['', 'All'],
        ['open', 'Open'],
        ['verifying', 'Verifying'],
        ['fixed_deployed', 'Fixed & Deployed'],
        ['duplicate', 'Duplicate']
      ].forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.status === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.status = val; draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search errata code, item title, description...');
      qIn.className = 'cso-edu-input';
      bar.append(qIn, btn('Filter', 'cso-edu-btn-primary', () => { state.q = qIn.value.trim(); draw(); }));
      wrap.appendChild(bar);

      const qs = new URLSearchParams();
      if (state.status) qs.set('fix_status', state.status);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/error-reports?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No error reports found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Errata Code', 'Target Item & URL', 'Issue & Correction', 'Severity & Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(e => {
        const tr = el('tr');
        tr.appendChild(el('td', '', e.errata_code));

        const tc = el('td');
        tc.append(el('strong', '', e.item_title || e.target_area), el('div', 'cso-edu-sub', e.page_or_item_url || e.target_area));
        tr.appendChild(tc);

        const ic = el('td');
        ic.append(el('div', '', e.description_text), e.suggested_correction ? el('div', 'cso-edu-sub', `Suggested: ${e.suggested_correction}`) : el('div', '', ''));
        tr.appendChild(ic);

        const ss = el('td');
        ss.append(statusBadge(e.severity), document.createTextNode(' '), statusBadge(e.fix_status));
        tr.appendChild(ss);

        const act = el('td', 'cso-edu-actions');
        act.append(
          btn('Mark Fixed & Deployed', 'cso-edu-btn-sm cso-edu-btn-primary', () => openResolveErrDrawer(e)),
          btn('Revisions', 'cso-edu-btn-sm', () => {
            const { backdrop, body } = openDrawer(`Revisions · ${e.errata_code}`, []);
            attachRevisions(body, '19', e.id, () => { backdrop.remove(); draw(); });
          })
        );
        tr.appendChild(act);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openResolveErrDrawer(e) {
      const stSel = selectOf([
        ['fixed_deployed', 'Fixed & Deployed'],
        ['verifying', 'Verifying'],
        ['duplicate', 'Duplicate'],
        ['wont_fix', 'Won\'t Fix']
      ], e.fix_status === 'open' ? 'fixed_deployed' : e.fix_status);
      const noteIn = textareaOf(e.resolution_note || '', 'Resolution note...');

      const { backdrop, body, foot } = openDrawer(`Resolve Errata · ${e.errata_code}`, [
        field('Issue', el('div', 'cso-edu-sub', e.description_text)),
        field('Fix Status', stSel),
        field('Resolution Note', noteIn)
      ]);
      attachRevisions(body, '19', e.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn('Save Resolution', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/error-reports/${encodeURIComponent(e.id)}`, 'PATCH', {
            fix_status: stSel.value,
            resolution_note: noteIn.value.trim()
          });
          toast(`Errata ${e.errata_code} updated`, 'success');
          backdrop.remove();
          draw();
        } catch (err) { toast(err.message, 'error'); }
      }));
    }

    function openNewErrataDrawer() {
      const repIn = textInput('text', '', 'Reporter name');
      const areaSel = selectOf(ERRATA_AREAS, 'mcq_answer_key');
      const typeSel = selectOf(ERRATA_TYPES, 'wrong_answer_key');
      const titleIn = textInput('text', '', 'Item title');
      const urlIn = textInput('text', '', '/study-library/...');
      const descIn = textareaOf('', 'Describe the error...');
      const corrIn = textareaOf('', 'Suggested correction...');

      const { backdrop, foot } = openDrawer('Log New Errata Report', [
        field('Reporter Name', repIn),
        field('Target Area', areaSel),
        field('Error Type', typeSel),
        field('Item Title', titleIn),
        field('Page / Item URL', urlIn),
        field('Description', descIn),
        field('Suggested Correction', corrIn)
      ]);
      foot.appendChild(btn('Log Errata', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/error-reports`, 'POST', {
            reporter_name: repIn.value.trim(),
            target_area: areaSel.value,
            error_type: typeSel.value,
            item_title: titleIn.value.trim(),
            page_or_item_url: urlIn.value.trim(),
            description_text: descIn.value.trim(),
            suggested_correction: corrIn.value.trim()
          });
          toast('Errata report logged', 'success');
          backdrop.remove();
          draw();
        } catch (err) { toast(err.message, 'error'); }
      }));
    }

    await draw();
  }

  function renderModule(moduleId, root) {
    if (!MODULES[moduleId]) return false;
    root.textContent = '';
    if (moduleId === 'module-09-017') { renderSharedKnowledge(root); return true; }
    if (moduleId === 'module-09-018') { renderTopicSuggestions(root); return true; }
    if (moduleId === 'module-09-019') { renderErrorReports(root); return true; }
    return false;
  }

  window.CSOUsersCommunityBatch5 = { render: renderModule };
})();
