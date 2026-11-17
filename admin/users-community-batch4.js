/* Users, Roles & Community Batch 4 (13-16) Content Command Workspace — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/users';
  const MODULES = {
    'module-09-013': { num: '13', title: 'User Activity' },
    'module-09-014': { num: '14', title: 'Data Access Requests' },
    'module-09-015': { num: '15', title: 'Discussion Forum' },
    'module-09-016': { num: '16', title: 'Ask a Question' }
  };

  const DISTRICTS = ['Khordha', 'Balasore', 'Cuttack', 'Sambalpur', 'Ganjam', 'Puri', 'Mayurbhanj', 'Sundargarh'];
  const ACTIVITY_TYPES = [
    ['login_success', 'Login Success'],
    ['login_failed', 'Login Failed'],
    ['pdf_download', 'PDF Download'],
    ['mock_test_submit', 'Mock Test Submit'],
    ['forum_post', 'Forum Post'],
    ['question_asked', 'Question Asked'],
    ['profile_update', 'Profile Update'],
    ['order_placed', 'Order Placed']
  ];
  const PORTAL_AREAS = [
    ['study-library', 'Study Library'],
    ['jobs-careers', 'Jobs & Careers'],
    ['schemes', 'Schemes'],
    ['community', 'Community'],
    ['student-hub', 'Student Hub'],
    ['auth', 'Auth']
  ];
  const FORUM_CATS = [
    ['', 'All'],
    ['opsc_oas_prep', 'OPSC OAS'],
    ['ossc_osssc_exams', 'OSSC / OSSSC'],
    ['ugc_net_academia', 'UGC NET'],
    ['odisha_gk_history', 'Odisha GK'],
    ['b_ed_teaching', 'B.Ed'],
    ['career_guidance', 'Career']
  ];
  const QNA_SUBJECTS = [
    'Odisha History & Culture', 'Indian Polity', 'English Literature',
    'Teaching Aptitude & B.Ed', 'Reasoning & Quant', 'Odisha Govt Schemes'
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
    if (st === 'fulfilled' || st === 'published' || st === 'answered_verified' || st === 'featured_faq' || st === 'identity_verified') cls += ' is-active';
    else if (st === 'open' || st === 'processing' || st === 'unanswered' || st === 'pending_otp') cls += ' is-pending';
    else if (st === 'rejected' || st === 'locked' || st === 'archived') cls += ' is-danger';
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

  /* ================= MODULE 13: USER ACTIVITY ================= */
  async function renderActivity(root) {
    const state = { activity_type: '', portal_area: '', district: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '13 · User Activity & Telemetry'),
        el('div', 'cso-edu-sub', 'Portal activity stream with masked IPs, device summaries, and Odisha district breakdown.')
      );
      head.append(tb, btn('+ Log Telemetry Event', 'cso-edu-btn-primary', openLogDrawer));
      wrap.appendChild(head);

      const qs = new URLSearchParams();
      if (state.activity_type) qs.set('activity_type', state.activity_type);
      if (state.portal_area) qs.set('portal_area', state.portal_area);
      if (state.district) qs.set('district_odisha', state.district);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/activity?${qs.toString()}`);

      // Breakdown KPI strip
      const kpis = el('div', 'cso-edu-kpis');
      ((data.breakdown && data.breakdown.by_portal) || []).slice(0, 5).forEach(b => {
        const c = el('div', 'cso-edu-kpi');
        c.append(el('div', 'cso-edu-kpi-lbl', b.portal_area), el('div', 'cso-edu-kpi-val', String(b.count)));
        kpis.appendChild(c);
      });
      wrap.appendChild(kpis);

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search user, target, device...');
      qIn.className = 'cso-edu-input';
      const typeSel = selectOf([['', 'All Event Types'], ...ACTIVITY_TYPES], state.activity_type);
      typeSel.className = 'cso-edu-select';
      const portSel = selectOf([['', 'All Portals'], ...PORTAL_AREAS], state.portal_area);
      portSel.className = 'cso-edu-select';
      const distSel = selectOf([['', 'All Districts'], ...DISTRICTS.map(d => [d, d])], state.district);
      distSel.className = 'cso-edu-select';
      bar.append(qIn, typeSel, portSel, distSel, btn('Filter', 'cso-edu-btn-primary', () => {
        state.q = qIn.value.trim();
        state.activity_type = typeSel.value;
        state.portal_area = portSel.value;
        state.district = distSel.value;
        draw();
      }));
      wrap.appendChild(bar);

      const items = data.items || [];
      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No activity events match the filter.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['User', 'Event & Portal', 'Target Ref', 'District', 'Masked IP & Device', 'Timestamp'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(a => {
        const tr = el('tr');
        const u = el('td');
        u.append(el('strong', '', a.user_name || 'Guest'), el('div', 'cso-edu-sub', a.user_email));
        tr.appendChild(u);
        const ev = el('td');
        ev.append(el('div', '', a.activity_type), el('div', 'cso-edu-sub', a.portal_area));
        tr.appendChild(ev);
        tr.appendChild(el('td', '', a.target_ref || '—'));
        tr.appendChild(el('td', '', el('span', 'cso-urc-badge-district', a.district_odisha || 'Khordha')));
        const dev = el('td');
        dev.append(el('div', '', a.ip_hash_masked || '—'), el('div', 'cso-edu-sub', a.device_summary || '—'));
        tr.appendChild(dev);
        tr.appendChild(el('td', '', a.created_at));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openLogDrawer() {
      const nameIn = textInput('text', '', 'User name');
      const emailIn = textInput('email', '', 'user@example.in');
      const typeSel = selectOf(ACTIVITY_TYPES, 'pdf_download');
      const portSel = selectOf(PORTAL_AREAS, 'study-library');
      const refIn = textInput('text', '', 'e.g. opsc-oas-2026.pdf');
      const distSel = selectOf(DISTRICTS.map(d => [d, d]), 'Khordha');
      const devIn = textInput('text', 'Desktop Chrome', 'Device summary');

      const { backdrop, foot } = openDrawer('Log Telemetry Event', [
        field('User Name', nameIn),
        field('User Email', emailIn),
        field('Activity Type', typeSel),
        field('Portal Area', portSel),
        field('Target Reference', refIn),
        field('District', distSel),
        field('Device Summary', devIn)
      ]);
      foot.appendChild(btn('Record Event', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/activity`, 'POST', {
            user_name: nameIn.value.trim(),
            user_email: emailIn.value.trim(),
            activity_type: typeSel.value,
            portal_area: portSel.value,
            target_ref: refIn.value.trim(),
            district_odisha: distSel.value,
            device_summary: devIn.value.trim()
          });
          toast('Activity event recorded', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 14: DATA ACCESS REQUESTS (DPDP) ================= */
  async function renderDataRequests(root) {
    const state = { status: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '14 · Data Access Requests (DPDP Act 2023)'),
        el('div', 'cso-edu-sub', 'Sanitized JSON data exports (secrets stripped) & PII anonymization with Super Admin protection.')
      );
      head.append(tb, btn('+ New DPDP Request', 'cso-edu-btn-primary', openNewDpdpDrawer));
      wrap.appendChild(head);

      const tabs = el('div', 'cso-urc-tabs');
      [
        ['', 'All'],
        ['open', 'Open'],
        ['processing', 'Processing'],
        ['fulfilled', 'Fulfilled'],
        ['rejected', 'Rejected']
      ].forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.status === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.status = val; draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search DPDP code, requester name/email...');
      qIn.className = 'cso-edu-input';
      bar.append(qIn, btn('Filter', 'cso-edu-btn-primary', () => { state.q = qIn.value.trim(); draw(); }));
      wrap.appendChild(bar);

      const qs = new URLSearchParams();
      if (state.status) qs.set('fulfillment_status', state.status);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/data-requests?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No DPDP requests found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Request Code', 'Requester', 'Type & Due Date', 'Verification & Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(r => {
        const tr = el('tr');
        tr.appendChild(el('td', '', r.request_code));
        const reqCell = el('td');
        reqCell.append(el('strong', '', r.requester_name), el('div', 'cso-edu-sub', r.requester_email));
        tr.appendChild(reqCell);
        const typeCell = el('td');
        typeCell.append(el('div', '', r.request_type), el('div', 'cso-edu-sub', `Due: ${r.statutory_due_date}`));
        tr.appendChild(typeCell);
        const stCell = el('td');
        stCell.append(statusBadge(r.verification_status), document.createTextNode(' '), statusBadge(r.fulfillment_status));
        tr.appendChild(stCell);

        const act = el('td', 'cso-edu-actions');
        act.append(
          btn('Generate Export', 'cso-edu-btn-sm cso-edu-btn-primary', async () => {
            try {
              const res = await api(`${API}/data-requests/${encodeURIComponent(r.id)}`, 'PATCH', { action: 'generate_export' });
              toast(`Generated sanitized export for ${r.request_code}`, 'success');
              const pre = el('pre', 'cso-fin-calc-res', JSON.stringify(res.export_bundle, null, 2));
              openDrawer(`Sanitized DPDP Export · ${r.request_code}`, [pre]);
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }),
          btn('Anonymize PII', 'cso-edu-btn-sm cso-edu-btn-danger', async () => {
            try {
              await api(`${API}/data-requests/${encodeURIComponent(r.id)}`, 'PATCH', { action: 'anonymize_erase' });
              toast(`Anonymized PII for ${r.request_code}`, 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }),
          btn('Revisions', 'cso-edu-btn-sm', () => {
            const { backdrop, body } = openDrawer(`Revisions · ${r.request_code}`, []);
            attachRevisions(body, '14', r.id, () => { backdrop.remove(); draw(); });
          })
        );
        tr.appendChild(act);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openNewDpdpDrawer() {
      const nameIn = textInput('text', '', 'Requester name');
      const emailIn = textInput('email', '', 'requester@example.in');
      const typeSel = selectOf([
        ['data_export_json', 'Data Export (JSON)'],
        ['account_erasure_anonymize', 'Account Erasure / Anonymize'],
        ['rectification', 'Rectification'],
        ['consent_withdrawal', 'Consent Withdrawal']
      ], 'data_export_json');
      const verSel = selectOf([['identity_verified', 'Identity Verified'], ['pending_otp', 'Pending OTP']], 'identity_verified');
      const noteIn = textareaOf('', 'Handler note...');

      const { backdrop, foot } = openDrawer('New DPDP Data Access Request', [
        field('Requester Name', nameIn),
        field('Requester Email', emailIn),
        field('Request Type', typeSel),
        field('Verification Status', verSel),
        field('Handler Note', noteIn)
      ]);
      foot.appendChild(btn('Create Request', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/data-requests`, 'POST', {
            requester_name: nameIn.value.trim(),
            requester_email: emailIn.value.trim(),
            request_type: typeSel.value,
            verification_status: verSel.value,
            handler_note: noteIn.value.trim()
          });
          toast('DPDP request created', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 15: DISCUSSION FORUM ================= */
  async function renderForum(root) {
    const state = { category: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '15 · Discussion Forum'),
        el('div', 'cso-edu-sub', 'Bilingual EN/OR Odisha exam threads with Pin/Lock controls and revision rollback.')
      );
      head.append(tb, btn('+ New Thread', 'cso-edu-btn-primary', () => openThreadDrawer(null)));
      wrap.appendChild(head);

      const tabs = el('div', 'cso-urc-tabs');
      FORUM_CATS.forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.category === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.category = val; draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search thread title or author...');
      qIn.className = 'cso-edu-input';
      bar.append(qIn, btn('Filter', 'cso-edu-btn-primary', () => { state.q = qIn.value.trim(); draw(); }));
      wrap.appendChild(bar);

      const qs = new URLSearchParams();
      if (state.category) qs.set('category_key', state.category);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/forum?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No forum threads found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Thread', 'Category & Author', 'Pin / Lock', 'Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(t => {
        const tr = el('tr');
        const tc = el('td');
        const badges = el('div', '');
        if (t.is_pinned) badges.appendChild(el('span', 'cso-urc-badge-pin', 'PINNED'));
        if (t.is_locked) badges.appendChild(el('span', 'cso-urc-badge-mfa', 'LOCKED'));
        tc.append(badges, el('strong', '', t.title_en), el('div', 'cso-edu-sub', t.title_or || t.slug));
        tr.appendChild(tc);

        const ca = el('td');
        ca.append(el('div', '', t.category_key), el('div', 'cso-edu-sub', `${t.author_name} · ${t.views_count} views`));
        tr.appendChild(ca);

        const pl = el('td', 'cso-edu-actions');
        pl.append(
          btn(t.is_pinned ? 'Unpin' : 'Pin', 'cso-edu-btn-sm', async () => {
            try {
              await api(`${API}/forum/${encodeURIComponent(t.id)}`, 'PATCH', { is_pinned: !t.is_pinned });
              toast(t.is_pinned ? 'Unpinned' : 'Pinned', 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }),
          btn(t.is_locked ? 'Unlock' : 'Lock', 'cso-edu-btn-sm', async () => {
            try {
              await api(`${API}/forum/${encodeURIComponent(t.id)}`, 'PATCH', { is_locked: !t.is_locked });
              toast(t.is_locked ? 'Unlocked' : 'Locked', 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          })
        );
        tr.appendChild(pl);
        tr.appendChild(el('td', '', statusBadge(t.status)));

        const act = el('td', 'cso-edu-actions');
        act.append(
          btn('Edit', 'cso-edu-btn-sm', () => openThreadDrawer(t)),
          btn('Archive', 'cso-edu-btn-sm cso-edu-btn-danger', async () => {
            try {
              await api(`${API}/forum/${encodeURIComponent(t.id)}`, 'DELETE');
              toast('Thread archived', 'info');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          })
        );
        tr.appendChild(act);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openThreadDrawer(t) {
      const isEdit = Boolean(t);
      const titleEnIn = textInput('text', t?.title_en || '', 'English title');
      const titleOrIn = textInput('text', t?.title_or || '', 'ଓଡ଼ିଆ ଶୀର୍ଷକ');
      const catSel = selectOf(FORUM_CATS.filter(([v]) => v), t?.category_key || 'opsc_oas_prep');
      const stSel = selectOf([['published', 'Published'], ['draft', 'Draft'], ['locked', 'Locked'], ['archived', 'Archived']], t?.status || 'published');
      const tagsIn = textInput('text', (t?.tags || []).join(', '), 'OPSC OAS, Prelims');
      const bodyEnIn = textareaOf(t?.body_en || '', 'English thread body...');
      const bodyOrIn = textareaOf(t?.body_or || '', 'ଓଡ଼ିଆ ବିଷୟବସ୍ତୁ...');

      const { backdrop, body, foot } = openDrawer(isEdit ? 'Edit Forum Thread' : 'New Forum Thread', [
        field('Title (English)', titleEnIn),
        field('Title (Odia)', titleOrIn),
        field('Category', catSel),
        field('Status', stSel),
        field('Tags (comma-separated)', tagsIn),
        field('Body (English)', bodyEnIn),
        field('Body (Odia)', bodyOrIn)
      ]);
      if (isEdit) attachRevisions(body, '15', t.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Thread' : 'Create Thread', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            title_en: titleEnIn.value.trim(),
            title_or: titleOrIn.value.trim(),
            category_key: catSel.value,
            status: stSel.value,
            tags: tagsIn.value.split(',').map(x => x.trim()).filter(Boolean),
            body_en: bodyEnIn.value.trim(),
            body_or: bodyOrIn.value.trim()
          };
          if (isEdit) await api(`${API}/forum/${encodeURIComponent(t.id)}`, 'PUT', payload);
          else await api(`${API}/forum`, 'POST', payload);
          toast(isEdit ? 'Thread updated' : 'Thread created', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 16: ASK A QUESTION ================= */
  async function renderQuestions(root) {
    const state = { status: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '16 · Ask a Question (Student Q&A)'),
        el('div', 'cso-edu-sub', 'Bilingual EN/OR mentor answers, Verified Answer badges, and public /api/community/qna publishing.')
      );
      head.append(tb, btn('+ Add Question', 'cso-edu-btn-primary', openNewQuestionDrawer));
      wrap.appendChild(head);

      const tabs = el('div', 'cso-urc-tabs');
      [
        ['', 'All'],
        ['unanswered', 'Unanswered'],
        ['answered_verified', 'Answered & Verified'],
        ['featured_faq', 'Featured FAQ']
      ].forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.status === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.status = val; draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search QNA code, asker, question...');
      qIn.className = 'cso-edu-input';
      bar.append(qIn, btn('Filter', 'cso-edu-btn-primary', () => { state.q = qIn.value.trim(); draw(); }));
      wrap.appendChild(bar);

      const qs = new URLSearchParams();
      if (state.status) qs.set('answer_status', state.status);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/questions?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No student questions found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Code & Subject', 'Question (EN/OR)', 'Asker & District', 'Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(q => {
        const tr = el('tr');
        const cs = el('td');
        cs.append(el('strong', '', q.question_code), el('div', 'cso-edu-sub', q.subject_or_exam));
        tr.appendChild(cs);

        const qc = el('td');
        qc.append(el('div', '', q.question_en), q.answer_en ? el('div', 'cso-edu-sub', `Ans: ${q.answer_en.slice(0, 90)}...`) : el('div', '', ''));
        tr.appendChild(qc);

        const ad = el('td');
        ad.append(el('div', '', q.asker_name), el('span', 'cso-urc-badge-district', q.district_odisha || 'Khordha'));
        tr.appendChild(ad);

        tr.appendChild(el('td', '', statusBadge(q.answer_status)));

        const act = el('td', 'cso-edu-actions');
        act.append(
          btn('Write Mentor Answer', 'cso-edu-btn-sm cso-edu-btn-primary', () => openAnswerDrawer(q)),
          btn('Archive', 'cso-edu-btn-sm cso-edu-btn-danger', async () => {
            try {
              await api(`${API}/questions/${encodeURIComponent(q.id)}`, 'DELETE');
              toast('Question archived', 'info');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          })
        );
        tr.appendChild(act);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openNewQuestionDrawer() {
      const subjSel = selectOf(QNA_SUBJECTS.map(s => [s, s]), QNA_SUBJECTS[0]);
      const askerIn = textInput('text', '', 'Student name');
      const distSel = selectOf(DISTRICTS.map(d => [d, d]), 'Khordha');
      const qEnIn = textareaOf('', 'Question in English...');
      const qOrIn = textareaOf('', 'ଓଡ଼ିଆରେ ପ୍ରଶ୍ନ...');

      const { backdrop, foot } = openDrawer('Add Student Question', [
        field('Subject / Exam', subjSel),
        field('Asker Name', askerIn),
        field('District', distSel),
        field('Question (English)', qEnIn),
        field('Question (Odia)', qOrIn)
      ]);
      foot.appendChild(btn('Create Question', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/questions`, 'POST', {
            subject_or_exam: subjSel.value,
            asker_name: askerIn.value.trim(),
            district_odisha: distSel.value,
            question_en: qEnIn.value.trim(),
            question_or: qOrIn.value.trim()
          });
          toast('Question added', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    function openAnswerDrawer(q) {
      const aEnIn = textareaOf(q.answer_en || '', 'Mentor answer in English...');
      const aOrIn = textareaOf(q.answer_or || '', 'ଓଡ଼ିଆରେ ଉତ୍ତର...');
      const stSel = selectOf([
        ['answered_verified', 'Answered & Verified'],
        ['featured_faq', 'Featured FAQ'],
        ['unanswered', 'Unanswered']
      ], q.answer_status === 'unanswered' ? 'answered_verified' : q.answer_status);
      const verCb = document.createElement('input');
      verCb.type = 'checkbox';
      verCb.checked = q.answer_status === 'unanswered' ? true : Boolean(q.is_verified_answer);

      const { backdrop, body, foot } = openDrawer(`Answer · ${q.question_code}`, [
        field('Student Question', el('div', 'cso-edu-sub', q.question_en)),
        field('Mentor Answer (English)', aEnIn),
        field('Mentor Answer (Odia / ଓଡ଼ିଆ)', aOrIn),
        field('Answer Status', stSel),
        field('Verified Answer Badge', verCb)
      ]);
      attachRevisions(body, '16', q.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn('Publish Mentor Answer', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/questions/${encodeURIComponent(q.id)}`, 'PATCH', {
            answer_en: aEnIn.value.trim(),
            answer_or: aOrIn.value.trim(),
            answer_status: stSel.value,
            is_verified_answer: verCb.checked
          });
          toast('Mentor answer published', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  function renderModule(moduleId, root) {
    if (!MODULES[moduleId]) return false;
    root.textContent = '';
    if (moduleId === 'module-09-013') { renderActivity(root); return true; }
    if (moduleId === 'module-09-014') { renderDataRequests(root); return true; }
    if (moduleId === 'module-09-015') { renderForum(root); return true; }
    if (moduleId === 'module-09-016') { renderQuestions(root); return true; }
    return false;
  }

  window.CSOUsersCommunityBatch4 = { render: renderModule };
})();
