/* Users, Roles & Community Batch 3 (09-12) Content Command Workspace — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/users';
  const MODULES = {
    'module-09-009': { num: '09', title: 'Comments & Replies' },
    'module-09-010': { num: '10', title: 'Moderation Queue' },
    'module-09-011': { num: '11', title: 'User Reports' },
    'module-09-012': { num: '12', title: 'Blocked Accounts' }
  };

  const VIOLATIONS = [
    ['spam_promotion', 'Spam / Promotion'],
    ['harassment_abuse', 'Harassment / Abuse'],
    ['misinformation_exam', 'Exam Misinformation'],
    ['copyright_piracy', 'Copyright / Piracy'],
    ['impersonation', 'Impersonation']
  ];
  const BLOCK_SCOPES = [
    ['full_account', 'Full Account Block'],
    ['community_posting_only', 'Community Posting Only'],
    ['ip_rate_block', 'IP Rate Block']
  ];
  const BLOCK_REASONS = [
    ['repeated_spam', 'Repeated Spam'],
    ['exam_leak_fraud', 'Exam Leak / Fraud'],
    ['harassment', 'Harassment'],
    ['payment_chargeback_abuse', 'Payment Chargeback Abuse'],
    ['bot_scraping', 'Bot Scraping']
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
    if (st === 'published' || st === 'approved' || st === 'action_taken' || st === 'unblocked') cls += ' is-active';
    else if (st === 'pending_review' || st === 'pending' || st === 'open' || st === 'investigating' || st === 'escalated') cls += ' is-pending';
    else if (st === 'hidden_spam' || st === 'rejected' || st === 'active' || st === 'high' || st === 'urgent' || st === 'critical') cls += ' is-danger';
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

  /* ================= MODULE 09: COMMENTS & REPLIES ================= */
  async function renderComments(root) {
    const state = { status: '', q: '', selected: new Set() };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '09 · Comments & Replies'),
        el('div', 'cso-edu-sub', 'Threaded community discussions, Official Mentor Reply badges, bulk moderation, and revision rollback.')
      );
      head.append(tb, btn('+ Post Mentor Reply', 'cso-edu-btn-primary', () => openCommentDrawer(null)));
      wrap.appendChild(head);

      const tabs = el('div', 'cso-urc-tabs');
      [
        ['', 'All'],
        ['published', 'Published'],
        ['pending_review', 'Pending Review'],
        ['hidden_spam', 'Hidden Spam']
      ].forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.status === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.status = val; state.selected.clear(); draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search author, comment text, post ID...');
      qIn.className = 'cso-edu-input';
      bar.append(qIn, btn('Filter', 'cso-edu-btn-primary', () => { state.q = qIn.value.trim(); draw(); }));
      wrap.appendChild(bar);

      const bulkBar = el('div', 'cso-urc-bulkbar');
      const bulkCount = el('span', '', `${state.selected.size} selected`);
      bulkBar.append(
        bulkCount,
        btn('Approve Selected', 'cso-edu-btn-sm', () => runBulk('published')),
        btn('Hide Spam Selected', 'cso-edu-btn-sm cso-edu-btn-danger', () => runBulk('hidden_spam'))
      );
      wrap.appendChild(bulkBar);

      async function runBulk(nextStatus) {
        if (!state.selected.size) { toast('Select at least one comment', 'error'); return; }
        try {
          const r = await api(`${API}/comments/bulk-status`, 'PATCH', {
            ids: Array.from(state.selected),
            status: nextStatus
          });
          toast(`Updated ${r.updated} comment(s) to ${nextStatus}`, 'success');
          state.selected.clear();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }

      const qs = new URLSearchParams();
      if (state.status) qs.set('status', state.status);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/comments?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No comments found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['', 'Author', 'Comment (EN/OR)', 'Mentor Badge', 'Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(c => {
        const tr = el('tr');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = state.selected.has(c.id);
        cb.addEventListener('change', () => {
          if (cb.checked) state.selected.add(c.id);
          else state.selected.delete(c.id);
          bulkCount.textContent = `${state.selected.size} selected`;
        });
        tr.appendChild(el('td', '', cb));

        const auth = el('td');
        auth.append(el('strong', '', c.author_name), el('div', 'cso-edu-sub', `${c.post_id}${c.parent_comment_id ? ' ↳ reply' : ''}`));
        tr.appendChild(auth);

        const bodyCell = el('td');
        bodyCell.append(el('div', '', c.body_en), c.body_or ? el('div', 'cso-edu-sub', c.body_or) : el('div', '', ''));
        tr.appendChild(bodyCell);

        const mentorCell = el('td');
        mentorCell.appendChild(btn(
          c.is_official_mentor_reply ? 'Official Mentor ✓' : 'Mark Mentor',
          `cso-edu-btn-sm ${c.is_official_mentor_reply ? 'cso-edu-btn-primary' : ''}`.trim(),
          async () => {
            try {
              await api(`${API}/comments/${encodeURIComponent(c.id)}`, 'PATCH', {
                is_official_mentor_reply: !c.is_official_mentor_reply
              });
              toast('Mentor reply badge updated', 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }
        ));
        tr.appendChild(mentorCell);

        tr.appendChild(el('td', '', statusBadge(c.status)));

        const act = el('td', 'cso-edu-actions');
        act.append(
          btn('Edit', 'cso-edu-btn-sm', () => openCommentDrawer(c)),
          btn('Archive', 'cso-edu-btn-sm cso-edu-btn-danger', async () => {
            try {
              await api(`${API}/comments/${encodeURIComponent(c.id)}`, 'DELETE');
              toast('Comment archived', 'info');
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

    function openCommentDrawer(c) {
      const isEdit = Boolean(c);
      const postIn = textInput('text', c?.post_id || 'urc-post-001', 'urc-post-001');
      if (isEdit) postIn.disabled = true;
      const bodyEnIn = textareaOf(c?.body_en || '', 'English reply...');
      const bodyOrIn = textareaOf(c?.body_or || '', 'ଓଡ଼ିଆ ଉତ୍ତର...');
      const statusIn = selectOf([
        ['published', 'Published'],
        ['pending_review', 'Pending Review'],
        ['hidden_spam', 'Hidden Spam']
      ], c?.status || 'published');
      const mentorCb = document.createElement('input');
      mentorCb.type = 'checkbox';
      mentorCb.checked = c ? Boolean(c.is_official_mentor_reply) : true;

      const { backdrop, body, foot } = openDrawer(isEdit ? 'Edit Comment / Reply' : 'Post Official Mentor Reply', [
        field('Target Post ID', postIn),
        field('Reply (English)', bodyEnIn),
        field('Reply (Odia / ଓଡ଼ିଆ)', bodyOrIn),
        field('Status', statusIn),
        field('Official Mentor Reply', mentorCb)
      ]);
      if (isEdit) attachRevisions(body, '09', c.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Comment' : 'Post Reply', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            post_id: postIn.value.trim(),
            body_en: bodyEnIn.value.trim(),
            body_or: bodyOrIn.value.trim(),
            status: statusIn.value,
            is_official_mentor_reply: mentorCb.checked
          };
          if (isEdit) await api(`${API}/comments/${encodeURIComponent(c.id)}`, 'PUT', payload);
          else await api(`${API}/comments`, 'POST', payload);
          toast(isEdit ? 'Comment updated' : 'Mentor reply posted', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 10: MODERATION QUEUE ================= */
  async function renderModerationQueue(root) {
    const state = { decision: 'pending', priority: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '10 · Moderation Queue'),
        el('div', 'cso-edu-sub', 'Approve or reject flagged posts & comments; decisions cascade atomically to source content.')
      );
      head.appendChild(tb);
      wrap.appendChild(head);

      const tabs = el('div', 'cso-urc-tabs');
      [
        ['pending', 'Pending'],
        ['escalated', 'Escalated'],
        ['approved', 'Approved'],
        ['rejected', 'Rejected'],
        ['', 'All']
      ].forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.decision === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.decision = val; draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search queue code, author, excerpt...');
      qIn.className = 'cso-edu-input';
      const priSel = selectOf([['', 'All Priorities'], ['urgent', 'Urgent'], ['high', 'High'], ['normal', 'Normal'], ['low', 'Low']], state.priority);
      priSel.className = 'cso-edu-select';
      bar.append(qIn, priSel, btn('Filter', 'cso-edu-btn-primary', () => {
        state.q = qIn.value.trim();
        state.priority = priSel.value;
        draw();
      }));
      wrap.appendChild(bar);

      const qs = new URLSearchParams();
      if (state.decision) qs.set('decision_status', state.decision);
      if (state.priority) qs.set('priority', state.priority);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/moderation?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'Moderation queue is clear for this view.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Queue Code', 'Content & Excerpt', 'Risk & Flag', 'Priority', 'Decision', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(m => {
        const tr = el('tr');
        tr.appendChild(el('td', '', m.queue_code));
        const ex = el('td');
        ex.append(el('strong', '', `${m.content_type} · ${m.author_name}`), el('div', 'cso-edu-sub', m.excerpt_text));
        tr.appendChild(ex);
        const rf = el('td');
        rf.append(el('div', '', m.flag_source), el('div', 'cso-edu-sub', m.risk_reason));
        tr.appendChild(rf);
        tr.appendChild(el('td', '', statusBadge(m.priority)));
        tr.appendChild(el('td', '', statusBadge(m.decision_status)));

        const act = el('td', 'cso-edu-actions');
        act.append(
          btn('Approve & Publish', 'cso-edu-btn-sm cso-edu-btn-primary', async () => {
            try {
              await api(`${API}/moderation/${encodeURIComponent(m.id)}`, 'PATCH', { decision: 'approved', moderator_note: 'Approved via Queue' });
              toast(`Approved ${m.queue_code} & published source`, 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }),
          btn('Reject & Hide', 'cso-edu-btn-sm cso-edu-btn-danger', async () => {
            try {
              await api(`${API}/moderation/${encodeURIComponent(m.id)}`, 'PATCH', { decision: 'rejected', moderator_note: 'Rejected via Queue' });
              toast(`Rejected ${m.queue_code} & hid source`, 'info');
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

    await draw();
  }

  /* ================= MODULE 11: USER REPORTS ================= */
  async function renderUserReports(root) {
    const state = { status: '', severity: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '11 · User Reports & Abuse Desk'),
        el('div', 'cso-edu-sub', 'Investigate user reports with one-click Resolve & Block User escalation.')
      );
      head.append(tb, btn('+ Log Report', 'cso-edu-btn-primary', openNewReportDrawer));
      wrap.appendChild(head);

      const tabs = el('div', 'cso-urc-tabs');
      [
        ['', 'All'],
        ['open', 'Open'],
        ['investigating', 'Investigating'],
        ['action_taken', 'Action Taken'],
        ['dismissed', 'Dismissed']
      ].forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.status === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.status = val; draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search report code, user, description...');
      qIn.className = 'cso-edu-input';
      bar.append(qIn, btn('Filter', 'cso-edu-btn-primary', () => { state.q = qIn.value.trim(); draw(); }));
      wrap.appendChild(bar);

      const qs = new URLSearchParams();
      if (state.status) qs.set('report_status', state.status);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/reports?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No user reports found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Report Code', 'Reported User', 'Violation & Details', 'Severity', 'Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(r => {
        const tr = el('tr');
        tr.appendChild(el('td', '', r.report_code));
        const ru = el('td');
        ru.append(el('strong', '', r.reported_user_name || 'Unknown'), el('div', 'cso-edu-sub', r.reported_email || r.target_url_or_ref));
        tr.appendChild(ru);
        const det = el('td');
        det.append(el('div', '', r.violation_category), el('div', 'cso-edu-sub', r.description_text));
        tr.appendChild(det);
        tr.appendChild(el('td', '', statusBadge(r.severity)));
        tr.appendChild(el('td', '', statusBadge(r.report_status)));
        tr.appendChild(el('td', 'cso-edu-actions', btn('Resolve / Escalate', 'cso-edu-btn-sm cso-edu-btn-primary', () => openResolveDrawer(r))));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openNewReportDrawer() {
      const nameIn = textInput('text', '', 'Reported user name');
      const emailIn = textInput('email', '', 'reported@example.in');
      const catSel = selectOf(VIOLATIONS, 'spam_promotion');
      const sevSel = selectOf([['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['critical', 'Critical']], 'medium');
      const descIn = textareaOf('', 'Describe the violation...');

      const { backdrop, foot } = openDrawer('Log New User Report', [
        field('Reported User Name', nameIn),
        field('Reported Email', emailIn),
        field('Violation Category', catSel),
        field('Severity', sevSel),
        field('Description', descIn)
      ]);
      foot.appendChild(btn('Submit Report', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/reports`, 'POST', {
            reported_user_name: nameIn.value.trim(),
            reported_email: emailIn.value.trim(),
            violation_category: catSel.value,
            severity: sevSel.value,
            description_text: descIn.value.trim()
          });
          toast('User report logged', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    function openResolveDrawer(r) {
      const stSel = selectOf([
        ['action_taken', 'Action Taken'],
        ['investigating', 'Investigating'],
        ['dismissed', 'Dismissed'],
        ['open', 'Open']
      ], r.report_status === 'open' ? 'action_taken' : r.report_status);
      const sumIn = textareaOf(r.action_summary || '', 'Resolution summary...');
      const blkCb = document.createElement('input');
      blkCb.type = 'checkbox';

      const { backdrop, body, foot } = openDrawer(`Resolve Report · ${r.report_code}`, [
        field('Resolution Status', stSel),
        field('Action Summary', sumIn),
        field('Auto-Block Reported User (Module 12)', blkCb)
      ]);
      attachRevisions(body, '11', r.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn('Save Resolution', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/reports/${encodeURIComponent(r.id)}`, 'PATCH', {
            report_status: stSel.value,
            action_summary: sumIn.value.trim(),
            auto_block_user: blkCb.checked
          });
          toast(blkCb.checked ? 'Report resolved & user blocked' : 'Report updated', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 12: BLOCKED ACCOUNTS ================= */
  async function renderBlockedAccounts(root) {
    const state = { status: '', scope: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '12 · Blocked Accounts & IP Guard'),
        el('div', 'cso-edu-sub', 'Enforce account/posting/IP blocks with Super Admin protection and one-click Unblock & Restore.')
      );
      head.append(tb, btn('+ Block Account / Email / IP', 'cso-edu-btn-primary', openBlockDrawer));
      wrap.appendChild(head);

      const tabs = el('div', 'cso-urc-tabs');
      [
        ['', 'All'],
        ['active', 'Active Blocks'],
        ['unblocked', 'Unblocked'],
        ['expired', 'Expired']
      ].forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.status === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.status = val; draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search block code, email, IP hash...');
      qIn.className = 'cso-edu-input';
      bar.append(qIn, btn('Filter', 'cso-edu-btn-primary', () => { state.q = qIn.value.trim(); draw(); }));
      wrap.appendChild(bar);

      const qs = new URLSearchParams();
      if (state.status) qs.set('block_status', state.status);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/blocked-accounts?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No blocked accounts or rules found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Block Code', 'Target', 'Scope & Reason', 'Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(b => {
        const tr = el('tr');
        tr.appendChild(el('td', '', b.block_code));
        const tgt = el('td');
        tgt.append(el('strong', '', b.blocked_email || b.user_id || 'IP Rule'), el('div', 'cso-edu-sub', b.blocked_ip_hash || 'No IP hash'));
        tr.appendChild(tgt);
        const sr = el('td');
        sr.append(el('div', '', `${b.block_scope} · ${b.reason_category}`), el('div', 'cso-edu-sub', b.reason_notes));
        tr.appendChild(sr);
        tr.appendChild(el('td', '', statusBadge(b.block_status)));

        const act = el('td', 'cso-edu-actions');
        if (b.block_status === 'active') {
          act.appendChild(btn('Unblock & Restore', 'cso-edu-btn-sm cso-edu-btn-primary', async () => {
            try {
              await api(`${API}/blocked-accounts/${encodeURIComponent(b.id)}`, 'PATCH', { action: 'unblock' });
              toast(`Unblocked ${b.block_code}`, 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }));
        }
        act.appendChild(btn('Revisions', 'cso-edu-btn-sm', () => {
          const { backdrop, body } = openDrawer(`Revisions · ${b.block_code}`, []);
          attachRevisions(body, '12', b.id, () => { backdrop.remove(); draw(); });
        }));
        tr.appendChild(act);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openBlockDrawer() {
      const emailIn = textInput('email', '', 'user@example.in');
      const ipIn = textInput('text', '', 'Optional sha256 IP hash');
      const scopeSel = selectOf(BLOCK_SCOPES, 'full_account');
      const reasonSel = selectOf(BLOCK_REASONS, 'repeated_spam');
      const notesIn = textareaOf('', 'Reason notes...');
      const permCb = document.createElement('input');
      permCb.type = 'checkbox';

      const { backdrop, foot } = openDrawer('Block Account / Email / IP', [
        field('Target Email', emailIn),
        field('Target IP Hash (optional)', ipIn),
        field('Block Scope', scopeSel),
        field('Reason Category', reasonSel),
        field('Reason Notes', notesIn),
        field('Permanent Block', permCb)
      ]);
      foot.appendChild(btn('Apply Block', 'cso-edu-btn-danger', async () => {
        try {
          await api(`${API}/blocked-accounts`, 'POST', {
            blocked_email: emailIn.value.trim(),
            blocked_ip_hash: ipIn.value.trim(),
            block_scope: scopeSel.value,
            reason_category: reasonSel.value,
            reason_notes: notesIn.value.trim(),
            is_permanent: permCb.checked
          });
          toast('Block rule created', 'success');
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
    if (moduleId === 'module-09-009') { renderComments(root); return true; }
    if (moduleId === 'module-09-010') { renderModerationQueue(root); return true; }
    if (moduleId === 'module-09-011') { renderUserReports(root); return true; }
    if (moduleId === 'module-09-012') { renderBlockedAccounts(root); return true; }
    return false;
  }

  window.CSOUsersCommunityBatch3 = { render: renderModule };
})();
