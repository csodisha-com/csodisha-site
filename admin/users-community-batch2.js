/* Users, Roles & Community Batch 2 (05-08) Content Command Workspace — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/users';
  const MODULES = {
    'module-09-005': { num: '05', title: 'Account Status' },
    'module-09-006': { num: '06', title: 'Registrations' },
    'module-09-007': { num: '07', title: 'Membership Access' },
    'module-09-008': { num: '08', title: 'Community Posts' }
  };

  const DISTRICTS = [
    'Khordha', 'Balasore', 'Cuttack', 'Sambalpur', 'Ganjam', 'Puri',
    'Mayurbhanj', 'Sundargarh', 'Kendrapara', 'Jajpur', 'Bhadrak', 'Angul', 'Koraput'
  ];
  const REASON_CODES = [
    ['kyc_verified', 'KYC / Email Verified'],
    ['policy_violation', 'Policy Violation'],
    ['spam_activity', 'Spam Activity'],
    ['user_requested_pause', 'User Requested Pause'],
    ['admin_manual_review', 'Admin Manual Review'],
    ['reinstated', 'Reinstated']
  ];
  const GRANT_SOURCES = [
    ['paid_order', 'Paid Order'],
    ['admin_complimentary', 'Admin Complimentary'],
    ['scholarship_waiver', 'Scholarship Waiver'],
    ['educator_grant', 'Educator Grant']
  ];
  const POST_TYPES = [
    ['study_discussion', 'Study Discussion'],
    ['exam_strategy', 'Exam Strategy'],
    ['odisha_current_affairs', 'Odisha Current Affairs'],
    ['peer_announcement', 'Peer Announcement'],
    ['success_story', 'Success Story']
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
    if (st === 'active' || st === 'approved' || st === 'published') cls += ' is-active';
    else if (st === 'pending_verification' || st === 'pending_review' || st === 'pending_moderation' || st === 'expiring_soon') cls += ' is-pending';
    else if (st === 'suspended' || st === 'blocked' || st === 'rejected' || st === 'revoked' || st === 'archived') cls += ' is-danger';
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

  /* ================= MODULE 05: ACCOUNT STATUS ================= */
  async function renderAccountStatus(root) {
    const state = { status: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '05 · Account Status & Transitions'),
        el('div', 'cso-edu-sub', 'Audit-logged account status transitions with timed suspension support and primary Super Admin lockout guard.')
      );
      head.appendChild(tb);
      wrap.appendChild(head);

      const tabs = el('div', 'cso-urc-tabs');
      [
        ['', 'All'],
        ['active', 'Active'],
        ['pending_verification', 'Pending Verification'],
        ['suspended', 'Suspended'],
        ['blocked', 'Blocked']
      ].forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.status === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.status = val; draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search name, email, UID...');
      qIn.className = 'cso-edu-input';
      bar.append(qIn, btn('Filter', 'cso-edu-btn-primary', () => { state.q = qIn.value.trim(); draw(); }));
      wrap.appendChild(bar);

      const qs = new URLSearchParams();
      if (state.status) qs.set('account_status', state.status);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/account-status?${qs.toString()}`);
      const users = data.users || [];
      const logs = data.logs || [];

      if (!users.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No accounts match the filter.'));
      } else {
        const tbl = el('table', 'cso-edu-table');
        const thead = el('thead');
        const hr = el('tr');
        ['UID', 'User', 'Role', 'District', 'Current Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
        thead.appendChild(hr);
        tbl.appendChild(thead);

        const tbody = el('tbody');
        users.forEach(u => {
          const tr = el('tr');
          tr.appendChild(el('td', '', u.user_uid));
          const info = el('td');
          info.append(el('strong', '', u.full_name), el('div', 'cso-edu-sub', u.email));
          tr.appendChild(info);
          tr.appendChild(el('td', '', u.role_key));
          tr.appendChild(el('td', '', el('span', 'cso-urc-badge-district', u.district_odisha || 'Khordha')));
          tr.appendChild(el('td', '', statusBadge(u.account_status)));
          tr.appendChild(el('td', 'cso-edu-actions', btn('Change Status', 'cso-edu-btn-sm cso-edu-btn-primary', () => openTransitionDrawer(u))));
          tbody.appendChild(tr);
        });
        tbl.appendChild(tbody);
        wrap.appendChild(tbl);
      }

      wrap.appendChild(el('div', 'cso-edu-section-title', 'Recent Status Transition Audit Log'));
      const logList = el('div', 'cso-urc-log-list');
      if (!logs.length) {
        logList.appendChild(el('div', 'cso-edu-empty', 'No status transitions logged yet.'));
      } else {
        logs.slice(0, 15).forEach(l => {
          const item = el('div', 'cso-urc-log-item');
          item.append(
            el('span', '', `${l.full_name} (${l.user_uid}): ${l.previous_status} → ${l.new_status} · [${l.reason_code}] ${l.reason_note || ''}`),
            el('span', 'cso-edu-sub', `${l.changed_by} · ${l.created_at}${l.expires_at ? ' · exp: ' + l.expires_at : ''}`)
          );
          logList.appendChild(item);
        });
      }
      wrap.appendChild(logList);
    }

    function openTransitionDrawer(u) {
      const nextStIn = selectOf([
        ['active', 'active'],
        ['pending_verification', 'pending_verification'],
        ['suspended', 'suspended'],
        ['blocked', 'blocked']
      ], u.account_status);
      const reasonIn = selectOf(REASON_CODES, 'admin_manual_review');
      const noteIn = textareaOf('', 'Reason note for audit log...');
      const expIn = textInput('text', '', 'Optional ISO date e.g. 2026-12-31T00:00:00Z');

      const { backdrop, foot } = openDrawer(`Change Status · ${u.full_name}`, [
        field('New Account Status', nextStIn),
        field('Reason Code', reasonIn),
        field('Reason Note', noteIn),
        field('Timed Expiry (optional)', expIn)
      ]);
      foot.appendChild(btn('Apply Status Transition', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/account-status/transition`, 'POST', {
            user_id: u.id,
            new_status: nextStIn.value,
            reason_code: reasonIn.value,
            reason_note: noteIn.value.trim(),
            expires_at: expIn.value.trim() || null
          });
          toast('Account status updated & logged', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 06: REGISTRATIONS ================= */
  async function renderRegistrations(root) {
    const state = { status: '', role: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '06 · Registrations Approval Queue'),
        el('div', 'cso-edu-sub', 'Review Odisha student & educator signups; approving atomically provisions urc_users + urc_user_profiles.')
      );
      head.append(tb, btn('+ Manual Registration', 'cso-edu-btn-primary', openNewRegDrawer));
      wrap.appendChild(head);

      const tabs = el('div', 'cso-urc-tabs');
      [
        ['', 'All'],
        ['pending_review', 'Pending Review'],
        ['approved', 'Approved'],
        ['rejected', 'Rejected']
      ].forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.status === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.status = val; draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search name, email, REG code...');
      qIn.className = 'cso-edu-input';
      const roleSel = selectOf([['', 'All Roles'], ['student', 'Student'], ['educator', 'Educator']], state.role);
      roleSel.className = 'cso-edu-select';
      bar.append(qIn, roleSel, btn('Filter', 'cso-edu-btn-primary', () => {
        state.q = qIn.value.trim();
        state.role = roleSel.value;
        draw();
      }));
      wrap.appendChild(bar);

      const qs = new URLSearchParams();
      if (state.status) qs.set('approval_status', state.status);
      if (state.role) qs.set('requested_role', state.role);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/registrations?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No registrations in this view.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Reg Code', 'Applicant', 'District', 'Role & Source', 'Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(r => {
        const tr = el('tr');
        tr.appendChild(el('td', '', r.reg_code));
        const info = el('td');
        info.append(el('strong', '', r.full_name), el('div', 'cso-edu-sub', `${r.email}${r.phone ? ' · ' + r.phone : ''}`));
        tr.appendChild(info);
        tr.appendChild(el('td', '', el('span', 'cso-urc-badge-district', r.district_odisha || 'Khordha')));
        tr.appendChild(el('td', '', `${r.requested_role} · ${r.signup_source}`));
        tr.appendChild(el('td', '', statusBadge(r.approval_status)));

        const act = el('td', 'cso-edu-actions');
        if (r.approval_status === 'pending_review') {
          act.append(
            btn('Approve & Provision', 'cso-edu-btn-sm cso-edu-btn-primary', async () => {
              try {
                await api(`${API}/registrations/${encodeURIComponent(r.id)}`, 'PATCH', { action: 'approve', reviewer_note: 'Approved via Admin Command' });
                toast(`Approved ${r.full_name} & provisioned user account`, 'success');
                draw();
              } catch (e) { toast(e.message, 'error'); }
            }),
            btn('Reject', 'cso-edu-btn-sm cso-edu-btn-danger', async () => {
              try {
                await api(`${API}/registrations/${encodeURIComponent(r.id)}`, 'PATCH', { action: 'reject', reviewer_note: 'Rejected via Admin Command' });
                toast(`Rejected ${r.full_name}`, 'info');
                draw();
              } catch (e) { toast(e.message, 'error'); }
            })
          );
        } else {
          act.appendChild(el('span', 'cso-edu-sub', r.linked_user_id ? `Linked: ${r.linked_user_id}` : (r.reviewed_by || 'Reviewed')));
        }
        tr.appendChild(act);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openNewRegDrawer() {
      const nameIn = textInput('text', '', 'Full Name');
      const emailIn = textInput('email', '', 'applicant@example.in');
      const phoneIn = textInput('text', '', '+91-...');
      const distIn = selectOf(DISTRICTS.map(d => [d, d]), 'Khordha');
      const roleIn = selectOf([['student', 'Student'], ['educator', 'Educator']], 'student');
      const srcIn = selectOf([
        ['web_portal', 'Web Portal'],
        ['study_library', 'Study Library'],
        ['mock_test_gate', 'Mock Test Gate'],
        ['referral_invite', 'Referral Invite']
      ], 'web_portal');

      const { backdrop, foot } = openDrawer('Add Manual Registration', [
        field('Full Name', nameIn),
        field('Email', emailIn),
        field('Phone', phoneIn),
        field('Odisha District', distIn),
        field('Requested Role', roleIn),
        field('Signup Source', srcIn)
      ]);
      foot.appendChild(btn('Create Registration', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/registrations`, 'POST', {
            full_name: nameIn.value.trim(),
            email: emailIn.value.trim(),
            phone: phoneIn.value.trim(),
            district_odisha: distIn.value,
            requested_role: roleIn.value,
            signup_source: srcIn.value,
            email_verified: true
          });
          toast('Registration created', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 07: MEMBERSHIP ACCESS ================= */
  async function renderMembershipAccess(root) {
    const state = { status: '', tier: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const data = await api(`${API}/membership-access?${new URLSearchParams(Object.entries(state).filter(([, v]) => v)).toString()}`);
      const items = data.items || [];
      const tiers = data.tiers || [];

      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '07 · Membership Access Grants'),
        el('div', 'cso-edu-sub', 'Bridged to fin_memberships tiers (Free Scholar, Pro Aspirant, OPSC Elite, Institutional).')
      );
      head.append(tb, btn('+ Grant Membership', 'cso-edu-btn-primary', () => openGrantDrawer(tiers)));
      wrap.appendChild(head);

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search user, email, MEM code, order...');
      qIn.className = 'cso-edu-input';
      const tierSel = selectOf([['', 'All Tiers'], ...tiers.map(t => [t.tier_code, t.tier_name_en])], state.tier);
      tierSel.className = 'cso-edu-select';
      const stSel = selectOf([
        ['', 'All Statuses'],
        ['active', 'Active'],
        ['expiring_soon', 'Expiring Soon'],
        ['expired', 'Expired'],
        ['revoked', 'Revoked']
      ], state.status);
      stSel.className = 'cso-edu-select';
      bar.append(qIn, tierSel, stSel, btn('Filter', 'cso-edu-btn-primary', () => {
        state.q = qIn.value.trim();
        state.tier = tierSel.value;
        state.status = stSel.value;
        draw();
      }));
      wrap.appendChild(bar);

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No membership grants found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Grant Code', 'User', 'Tier & Quota', 'Source', 'Status & Expiry', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(g => {
        const tr = el('tr');
        tr.appendChild(el('td', '', g.grant_code));
        const uCell = el('td');
        uCell.append(el('strong', '', g.full_name), el('div', 'cso-edu-sub', `${g.email} · ${g.district_odisha || 'Odisha'}`));
        tr.appendChild(uCell);

        const tCell = el('td');
        tCell.append(el('strong', '', g.tier_name_en), el('div', 'cso-edu-sub', `${g.daily_download_cap}/day · ${g.mock_test_access_level}`));
        tr.appendChild(tCell);

        tr.appendChild(el('td', '', `${g.grant_source}${g.order_number ? ' (' + g.order_number + ')' : ''}`));
        const stCell = el('td');
        stCell.append(statusBadge(g.access_status), el('div', 'cso-edu-sub', g.expires_at ? `Exp: ${g.expires_at.slice(0, 10)}` : 'No expiry'));
        tr.appendChild(stCell);

        const act = el('td', 'cso-edu-actions');
        act.append(
          btn('+30d', 'cso-edu-btn-sm', async () => {
            try {
              await api(`${API}/membership-access/${encodeURIComponent(g.id)}`, 'PATCH', { extend_days: 30, access_status: 'active' });
              toast(`Extended ${g.grant_code} by 30 days`, 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }),
          btn('Revisions', 'cso-edu-btn-sm', () => {
            const { backdrop, body } = openDrawer(`Revisions · ${g.grant_code}`, []);
            attachRevisions(body, '07', g.id, () => { backdrop.remove(); draw(); });
          }),
          btn('Revoke', 'cso-edu-btn-sm cso-edu-btn-danger', async () => {
            try {
              await api(`${API}/membership-access/${encodeURIComponent(g.id)}`, 'DELETE');
              toast(`Revoked ${g.grant_code}`, 'info');
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

    async function openGrantDrawer(tiers) {
      const dir = await api(`${API}/directory`).catch(() => ({ items: [] }));
      const userOpts = (dir.items || []).map(u => [u.id, `${u.full_name} (${u.email})`]);
      const userSel = selectOf(userOpts.length ? userOpts : [['urc-u-004', 'Ananya Senapati']], userOpts[0]?.[0]);
      const tierSel = selectOf(
        tiers.length ? tiers.map(t => [t.tier_code, `${t.tier_name_en} (${t.download_quota_daily}/day)`]) : [['pro_aspirant', 'Pro Aspirant']],
        'pro_aspirant'
      );
      const srcSel = selectOf(GRANT_SOURCES, 'admin_complimentary');
      const ordIn = textInput('text', '', 'Optional CSO-ORD-...');
      const daysIn = textInput('number', '365', '365');
      const notesIn = textareaOf('', 'Grant notes...');

      const { backdrop, foot } = openDrawer('Grant Membership Access', [
        field('Select User', userSel),
        field('Membership Tier (fin_memberships)', tierSel),
        field('Grant Source', srcSel),
        field('Order Number (optional)', ordIn),
        field('Duration (days)', daysIn),
        field('Notes', notesIn)
      ]);
      foot.appendChild(btn('Grant Access', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/membership-access`, 'POST', {
            user_id: userSel.value,
            tier_code: tierSel.value,
            grant_source: srcSel.value,
            order_number: ordIn.value.trim(),
            duration_days: Number(daysIn.value || 365),
            notes: notesIn.value.trim()
          });
          toast('Membership access granted', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 08: COMMUNITY POSTS ================= */
  async function renderCommunityPosts(root) {
    const state = { status: '', post_type: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '08 · Community Posts Studio'),
        el('div', 'cso-edu-sub', 'Bilingual EN/OR community discussions, pinning/featuring, and live /api/community/posts publishing.')
      );
      head.append(tb, btn('+ New Post', 'cso-edu-btn-primary', () => openPostDrawer(null)));
      wrap.appendChild(head);

      const tabs = el('div', 'cso-urc-tabs');
      [
        ['', 'All'],
        ['published', 'Published'],
        ['pending_moderation', 'Pending Moderation'],
        ['draft', 'Drafts'],
        ['archived', 'Archived']
      ].forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.status === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.status = val; draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search title, author, exam tag...');
      qIn.className = 'cso-edu-input';
      const typeSel = selectOf([['', 'All Post Types'], ...POST_TYPES], state.post_type);
      typeSel.className = 'cso-edu-select';
      bar.append(qIn, typeSel, btn('Filter', 'cso-edu-btn-primary', () => {
        state.q = qIn.value.trim();
        state.post_type = typeSel.value;
        draw();
      }));
      wrap.appendChild(bar);

      const qs = new URLSearchParams();
      if (state.status) qs.set('status', state.status);
      if (state.post_type) qs.set('post_type', state.post_type);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/community-posts?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No community posts match this filter.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Post', 'Author & Tags', 'Pin / Feature', 'Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(p => {
        const tr = el('tr');
        const titleCell = el('td');
        const badges = el('div', '');
        if (p.is_pinned) badges.appendChild(el('span', 'cso-urc-badge-pin', 'PINNED'));
        if (p.featured) badges.appendChild(el('span', 'cso-urc-badge-edu', 'FEATURED'));
        titleCell.append(badges, el('strong', '', p.title_en), el('div', 'cso-edu-sub', p.title_or || p.slug));
        tr.appendChild(titleCell);

        const authCell = el('td');
        authCell.append(el('div', '', p.author_name), el('div', 'cso-edu-sub', `${p.exam_tag} · ${p.district_tag}`));
        tr.appendChild(authCell);

        const pfCell = el('td', 'cso-edu-actions');
        pfCell.append(
          btn(p.is_pinned ? 'Unpin' : 'Pin', 'cso-edu-btn-sm', async () => {
            try {
              await api(`${API}/community-posts/${encodeURIComponent(p.id)}`, 'PATCH', { is_pinned: !p.is_pinned });
              toast(p.is_pinned ? 'Post unpinned' : 'Post pinned', 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }),
          btn(p.featured ? 'Unfeature' : 'Feature', 'cso-edu-btn-sm', async () => {
            try {
              await api(`${API}/community-posts/${encodeURIComponent(p.id)}`, 'PATCH', { featured: !p.featured });
              toast(p.featured ? 'Removed from featured' : 'Post featured', 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          })
        );
        tr.appendChild(pfCell);

        tr.appendChild(el('td', '', statusBadge(p.status)));

        const act = el('td', 'cso-edu-actions');
        act.append(
          btn('Preview', 'cso-edu-btn-sm', () => openPreviewModal(p)),
          btn('Edit', 'cso-edu-btn-sm', () => openPostDrawer(p)),
          btn('Archive', 'cso-edu-btn-sm cso-edu-btn-danger', async () => {
            try {
              await api(`${API}/community-posts/${encodeURIComponent(p.id)}`, 'DELETE');
              toast('Post archived', 'info');
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

    function openPreviewModal(p) {
      const card = el('div', 'cso-urc-pubcard');
      card.append(
        el('h3', '', p.title_en),
        el('div', 'cso-urc-pubcard-meta', `${p.author_name} · ${p.exam_tag} · ${p.district_tag} · ${p.post_type}`),
        el('div', 'cso-urc-pubcard-bio', [
          el('strong', '', 'English: '),
          document.createTextNode(p.body_en || '—'),
          el('br'),
          el('strong', '', 'ଓଡ଼ିଆ: '),
          document.createTextNode(p.body_or || '—')
        ])
      );
      openDrawer('Community Card Preview', [card]);
    }

    function openPostDrawer(p) {
      const isEdit = Boolean(p);
      const titleEnIn = textInput('text', p?.title_en || '', 'English title');
      const titleOrIn = textInput('text', p?.title_or || '', 'ଓଡ଼ିଆ ଶୀର୍ଷକ');
      const typeIn = selectOf(POST_TYPES, p?.post_type || 'study_discussion');
      const statusIn = selectOf([
        ['published', 'Published'],
        ['pending_moderation', 'Pending Moderation'],
        ['draft', 'Draft'],
        ['archived', 'Archived']
      ], p?.status || 'published');
      const examIn = textInput('text', p?.exam_tag || 'OPSC OAS', 'e.g. OPSC OAS');
      const distIn = selectOf(DISTRICTS.map(d => [d, d]), p?.district_tag || 'Khordha');
      const bodyEnIn = textareaOf(p?.body_en || '', 'English body...');
      const bodyOrIn = textareaOf(p?.body_or || '', 'ଓଡ଼ିଆ ବିଷୟବସ୍ତୁ...');
      const pinCb = document.createElement('input');
      pinCb.type = 'checkbox';
      pinCb.checked = Boolean(p?.is_pinned);
      const featCb = document.createElement('input');
      featCb.type = 'checkbox';
      featCb.checked = Boolean(p?.featured);

      const { backdrop, body, foot } = openDrawer(isEdit ? 'Edit Community Post' : 'Create Community Post', [
        field('Title (English)', titleEnIn),
        field('Title (Odia / ଓଡ଼ିଆ)', titleOrIn),
        field('Post Type', typeIn),
        field('Status', statusIn),
        field('Exam Tag', examIn),
        field('District Tag', distIn),
        field('Body (English)', bodyEnIn),
        field('Body (Odia)', bodyOrIn),
        field('Pin to Top', pinCb),
        field('Featured Post', featCb)
      ]);
      if (isEdit) attachRevisions(body, '08', p.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Post' : 'Publish / Save Post', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            title_en: titleEnIn.value.trim(),
            title_or: titleOrIn.value.trim(),
            post_type: typeIn.value,
            status: statusIn.value,
            exam_tag: examIn.value.trim(),
            district_tag: distIn.value,
            body_en: bodyEnIn.value.trim(),
            body_or: bodyOrIn.value.trim(),
            is_pinned: pinCb.checked,
            featured: featCb.checked
          };
          if (isEdit) await api(`${API}/community-posts/${encodeURIComponent(p.id)}`, 'PUT', payload);
          else await api(`${API}/community-posts`, 'POST', payload);
          toast(isEdit ? 'Community post updated' : 'Community post created', 'success');
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
    if (moduleId === 'module-09-005') { renderAccountStatus(root); return true; }
    if (moduleId === 'module-09-006') { renderRegistrations(root); return true; }
    if (moduleId === 'module-09-007') { renderMembershipAccess(root); return true; }
    if (moduleId === 'module-09-008') { renderCommunityPosts(root); return true; }
    return false;
  }

  window.CSOUsersCommunityBatch2 = { render: renderModule };
})();
