/* Users, Roles & Community Batch 1 (01-04) Content Command Workspace — Strict CSP: no inline scripts/styles */
(() => {
  'use strict';

  const API = '/api/admin/users';
  const MODULES = {
    'module-09-001': { num: '01', title: 'All Users' },
    'module-09-002': { num: '02', title: 'User Profiles' },
    'module-09-003': { num: '03', title: 'Roles & Permissions' },
    'module-09-004': { num: '04', title: 'Admin Accounts' }
  };

  const DISTRICTS = [
    'Khordha', 'Balasore', 'Cuttack', 'Sambalpur', 'Ganjam', 'Puri',
    'Mayurbhanj', 'Sundargarh', 'Kendrapara', 'Jajpur', 'Bhadrak', 'Angul', 'Koraput'
  ];
  const STAGES = [
    'Class 6-10', 'Higher Secondary +2', 'Undergraduate',
    'Postgraduate', 'B.Ed / Teaching', 'Competitive Aspirant'
  ];
  const VISIBILITIES = [
    ['public', 'Public'],
    ['community_only', 'Community Only'],
    ['private', 'Private']
  ];
  const DOMAIN_LABELS = {
    edu_resources: 'Educational Resources',
    nav_cms: 'Categories & Navigation',
    media_cloud: 'Files & Media Cloud',
    payments_finance: 'Payments & Finance',
    users_community: 'Users & Community',
    system_ops: 'System & Security Ops'
  };
  const CAPS = ['view', 'create', 'edit', 'delete', 'publish'];

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

  function renderKpis(container, ov) {
    const grid = el('div', 'cso-edu-kpis');
    const cards = [
      ['Total Users', ov.total_users || 0],
      ['Active Users', ov.active_users || 0],
      ['Pending Verification', ov.pending_verifications || 0],
      ['Verified Educators', ov.verified_educators || 0],
      ['Active Admins', ov.active_admins || 0]
    ];
    cards.forEach(([lbl, val]) => {
      const c = el('div', 'cso-edu-kpi');
      c.append(el('div', 'cso-edu-kpi-lbl', lbl), el('div', 'cso-edu-kpi-val', String(val)));
      grid.appendChild(c);
    });
    container.appendChild(grid);
  }

  /* ================= MODULE 01: ALL USERS ================= */
  async function renderAllUsers(root) {
    const state = { status: '', role: '', district: '', q: '', selected: new Set() };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const ov = await api(`${API}/overview`).catch(() => ({}));
      renderKpis(wrap, ov);

      const head = el('div', 'cso-edu-head');
      const titleBox = el('div', '');
      titleBox.append(
        el('h2', 'cso-edu-title', '01 · All Users Directory'),
        el('div', 'cso-edu-sub', 'Unified Odisha user registry bridged with D1 auth accounts & candidate profiles.')
      );
      head.append(titleBox, btn('+ Add User', 'cso-edu-btn-primary', () => openUserDrawer(null)));
      wrap.appendChild(head);

      // Status tabs
      const tabs = el('div', 'cso-urc-tabs');
      [
        ['', 'All'],
        ['active', 'Active'],
        ['pending_verification', 'Pending'],
        ['suspended', 'Suspended'],
        ['blocked', 'Blocked']
      ].forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.status === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.status = val; state.selected.clear(); draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      // Filters
      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search name, email, UID, district...');
      qIn.className = 'cso-edu-input';
      const roleSel = selectOf([
        ['', 'All Roles'],
        ['super_admin', 'Super Admin'],
        ['admin', 'Admin'],
        ['moderator', 'Moderator'],
        ['educator', 'Educator'],
        ['student', 'Student']
      ], state.role);
      roleSel.className = 'cso-edu-select';
      const distSel = selectOf([['', 'All Odisha Districts'], ...DISTRICTS.map(d => [d, d])], state.district);
      distSel.className = 'cso-edu-select';
      const goBtn = btn('Filter', 'cso-edu-btn-primary', () => {
        state.q = qIn.value.trim();
        state.role = roleSel.value;
        state.district = distSel.value;
        draw();
      });
      bar.append(qIn, roleSel, distSel, goBtn);
      wrap.appendChild(bar);

      // Bulk bar
      const bulkBar = el('div', 'cso-urc-bulkbar');
      const bulkCount = el('span', '', `${state.selected.size} selected`);
      bulkBar.append(
        bulkCount,
        btn('Activate Selected', 'cso-edu-btn-sm', () => runBulk('active')),
        btn('Suspend Selected', 'cso-edu-btn-sm', () => runBulk('suspended'))
      );
      wrap.appendChild(bulkBar);

      async function runBulk(nextStatus) {
        if (!state.selected.size) { toast('Select at least one user first', 'error'); return; }
        try {
          const r = await api(`${API}/directory/bulk-status`, 'PATCH', {
            ids: Array.from(state.selected),
            account_status: nextStatus
          });
          toast(`Updated ${r.updated} user(s) to ${nextStatus}`, 'success');
          state.selected.clear();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }

      const qs = new URLSearchParams();
      if (state.q) qs.set('q', state.q);
      if (state.role) qs.set('role_key', state.role);
      if (state.status) qs.set('account_status', state.status);
      if (state.district) qs.set('district_odisha', state.district);
      const data = await api(`${API}/directory?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No users match the current filter.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['', 'UID', 'User', 'District', 'Role', 'Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(u => {
        const tr = el('tr');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = state.selected.has(u.id);
        cb.addEventListener('change', () => {
          if (cb.checked) state.selected.add(u.id);
          else state.selected.delete(u.id);
          bulkCount.textContent = `${state.selected.size} selected`;
        });
        tr.appendChild(el('td', '', cb));
        tr.appendChild(el('td', '', u.user_uid));

        const info = el('td');
        info.append(el('strong', '', u.full_name), el('div', 'cso-edu-sub', `${u.email}${u.phone ? ' · ' + u.phone : ''}`));
        tr.appendChild(info);

        tr.appendChild(el('td', '', el('span', 'cso-urc-badge-district', u.district_odisha || 'Khordha')));

        // Quick role switcher
        const rolePick = selectOf([
          ['super_admin', 'super_admin'],
          ['admin', 'admin'],
          ['moderator', 'moderator'],
          ['educator', 'educator'],
          ['student', 'student']
        ], u.role_key);
        rolePick.className = 'cso-edu-select';
        rolePick.addEventListener('change', async () => {
          try {
            await api(`${API}/directory/${encodeURIComponent(u.id)}`, 'PATCH', { role_key: rolePick.value });
            toast(`Role updated to ${rolePick.value}`, 'success');
            draw();
          } catch (e) { toast(e.message, 'error'); rolePick.value = u.role_key; }
        });
        tr.appendChild(el('td', '', rolePick));

        // Quick status switcher
        const stPick = selectOf([
          ['active', 'active'],
          ['pending_verification', 'pending_verification'],
          ['suspended', 'suspended'],
          ['blocked', 'blocked']
        ], u.account_status);
        stPick.className = 'cso-edu-select';
        stPick.addEventListener('change', async () => {
          try {
            await api(`${API}/directory/${encodeURIComponent(u.id)}`, 'PATCH', { account_status: stPick.value });
            toast(`Status updated to ${stPick.value}`, 'success');
            draw();
          } catch (e) { toast(e.message, 'error'); stPick.value = u.account_status; }
        });
        tr.appendChild(el('td', '', stPick));

        const act = el('td', 'cso-edu-actions');
        act.append(
          btn('Edit', 'cso-edu-btn-sm', () => openUserDrawer(u)),
          btn('Archive', 'cso-edu-btn-sm cso-edu-btn-danger', async () => {
            try {
              await api(`${API}/directory/${encodeURIComponent(u.id)}`, 'DELETE');
              toast('User archived (blocked)', 'success');
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

    function openUserDrawer(u) {
      const isEdit = Boolean(u);
      const nameIn = textInput('text', u?.full_name || '', 'e.g. Ananya Senapati');
      const emailIn = textInput('email', u?.email || '', 'user@example.in');
      if (isEdit) emailIn.disabled = true;
      const phoneIn = textInput('text', u?.phone || '', '+91-...');
      const distIn = selectOf(DISTRICTS.map(d => [d, d]), u?.district_odisha || 'Khordha');
      const roleIn = selectOf([
        ['super_admin', 'Super Admin'],
        ['admin', 'Platform Admin'],
        ['moderator', 'Content Moderator'],
        ['educator', 'Verified Educator'],
        ['student', 'Student / Aspirant']
      ], u?.role_key || 'student');
      const statusIn = selectOf([
        ['active', 'Active'],
        ['pending_verification', 'Pending Verification'],
        ['suspended', 'Suspended'],
        ['blocked', 'Blocked']
      ], u?.account_status || 'active');
      const langIn = selectOf([['both', 'Odia + English'], ['en', 'English'], ['or', 'Odia']], u?.preferred_lang || 'both');

      const { backdrop, body, foot } = openDrawer(
        isEdit ? `Edit User · ${u.user_uid}` : 'Add New User',
        [
          field('Full Name', nameIn),
          field('Email', emailIn),
          field('Phone', phoneIn),
          field('Odisha District', distIn),
          field('Role', roleIn),
          field('Account Status', statusIn),
          field('Preferred Language', langIn)
        ]
      );
      if (isEdit) attachRevisions(body, '01', u.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Changes' : 'Create User', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            full_name: nameIn.value.trim(),
            email: emailIn.value.trim(),
            phone: phoneIn.value.trim(),
            district_odisha: distIn.value,
            role_key: roleIn.value,
            account_status: statusIn.value,
            preferred_lang: langIn.value
          };
          if (isEdit) await api(`${API}/directory/${encodeURIComponent(u.id)}`, 'PUT', payload);
          else await api(`${API}/directory`, 'POST', payload);
          toast(isEdit ? 'User updated' : 'User created', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 02: USER PROFILES ================= */
  async function renderUserProfiles(root) {
    const state = { q: '', stage: '', vis: '', verEdu: false };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const titleBox = el('div', '');
      titleBox.append(
        el('h2', 'cso-edu-title', '02 · User Profiles (CMS)'),
        el('div', 'cso-edu-sub', 'Bilingual EN/OR bios, Odisha academic stages, target exams, and Verified Educator badges.')
      );
      head.appendChild(titleBox);
      wrap.appendChild(head);

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search name, @handle, institution...');
      qIn.className = 'cso-edu-input';
      const stSel = selectOf([['', 'All Academic Stages'], ...STAGES.map(s => [s, s])], state.stage);
      stSel.className = 'cso-edu-select';
      const visSel = selectOf([['', 'All Visibility'], ...VISIBILITIES], state.vis);
      visSel.className = 'cso-edu-select';
      const verLbl = el('label', 'cso-edu-label');
      const verCb = document.createElement('input');
      verCb.type = 'checkbox';
      verCb.checked = state.verEdu;
      verLbl.append(verCb, document.createTextNode(' Verified Educators Only'));
      const goBtn = btn('Filter', 'cso-edu-btn-primary', () => {
        state.q = qIn.value.trim();
        state.stage = stSel.value;
        state.vis = visSel.value;
        state.verEdu = verCb.checked;
        draw();
      });
      bar.append(qIn, stSel, visSel, verLbl, goBtn);
      wrap.appendChild(bar);

      const qs = new URLSearchParams();
      if (state.q) qs.set('q', state.q);
      if (state.stage) qs.set('academic_stage', state.stage);
      if (state.vis) qs.set('profile_visibility', state.vis);
      if (state.verEdu) qs.set('verified_educator', '1');
      const data = await api(`${API}/profiles?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No user profiles found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['User & Handle', 'Stage & Exams', 'Completeness', 'Educator Badge', 'Visibility', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(p => {
        const tr = el('tr');
        const userCell = el('td');
        userCell.append(
          el('strong', '', p.full_name),
          el('div', 'cso-edu-sub', `${p.display_handle || '@user'} · ${p.district_odisha || 'Odisha'}`)
        );
        tr.appendChild(userCell);

        const examCell = el('td');
        examCell.appendChild(el('div', '', p.academic_stage));
        const tags = el('div', 'cso-urc-tags');
        (p.target_exams || []).forEach(ex => tags.appendChild(el('span', 'cso-urc-tag', ex)));
        examCell.appendChild(tags);
        tr.appendChild(examCell);

        const progCell = el('td');
        const prog = document.createElement('progress');
        prog.className = 'cso-urc-progress';
        prog.max = 100;
        prog.value = p.profile_completion_pct || 0;
        progCell.append(prog, el('span', 'cso-urc-pct', `${p.profile_completion_pct || 0}%`));
        tr.appendChild(progCell);

        const eduCell = el('td');
        const eduBtn = btn(
          p.verified_educator ? 'Verified Educator ✓' : 'Mark Verified',
          `cso-edu-btn-sm ${p.verified_educator ? 'cso-edu-btn-primary' : ''}`.trim(),
          async () => {
            try {
              await api(`${API}/profiles/${encodeURIComponent(p.id)}`, 'PATCH', { verified_educator: !p.verified_educator });
              toast('Educator verification updated', 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }
        );
        eduCell.appendChild(eduBtn);
        tr.appendChild(eduCell);

        tr.appendChild(el('td', '', p.profile_visibility));

        const act = el('td', 'cso-edu-actions');
        act.append(
          btn('Preview', 'cso-edu-btn-sm', () => openPreviewModal(p)),
          btn('Edit Profile', 'cso-edu-btn-sm', () => openProfileDrawer(p))
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
        el('h3', '', `${p.full_name} (${p.display_handle || '@aspirant'})`),
        el('div', 'cso-urc-pubcard-meta', `${p.academic_stage} · ${p.institution_name || 'Odisha'} · ${p.district_odisha}`),
        p.verified_educator ? el('div', '', el('span', 'cso-urc-badge-edu', p.badge_label || 'Verified Educator')) : el('div', '', ''),
        el('div', 'cso-urc-pubcard-bio', [
          el('strong', '', 'English Bio: '),
          document.createTextNode(p.bio_en || 'No English bio provided.'),
          el('br'),
          el('strong', '', 'ଓଡ଼ିଆ ପରିଚୟ: '),
          document.createTextNode(p.bio_or || 'ଓଡ଼ିଆ ପରିଚୟ ଦିଆଯାଇନାହିଁ।')
        ]),
        el('div', 'cso-urc-pubcard-meta', `Target Exams: ${(p.target_exams || []).join(', ') || 'None specified'} · Profile ${p.profile_completion_pct}% complete`)
      );
      openDrawer('Public Profile Card Preview', [card]);
    }

    function openProfileDrawer(p) {
      const handleIn = textInput('text', p.display_handle || '', '@handle');
      const bioEnIn = textareaOf(p.bio_en || '', 'English bio...');
      const bioOrIn = textareaOf(p.bio_or || '', 'ଓଡ଼ିଆ ପରିଚୟ...');
      const stageIn = selectOf(STAGES.map(s => [s, s]), p.academic_stage || 'Competitive Aspirant');
      const examsIn = textInput('text', (p.target_exams || []).join(', '), 'OPSC OAS, OSSC CGL, UGC NET');
      const instIn = textInput('text', p.institution_name || '', 'College / University');
      const badgeIn = textInput('text', p.badge_label || '', 'e.g. Verified Educator');
      const visIn = selectOf(VISIBILITIES, p.profile_visibility || 'public');
      const verCb = document.createElement('input');
      verCb.type = 'checkbox';
      verCb.checked = Boolean(p.verified_educator);

      const { backdrop, body, foot } = openDrawer(`Edit Profile · ${p.full_name}`, [
        field('Display Handle', handleIn),
        field('Bio (English)', bioEnIn),
        field('Bio (Odia / ଓଡ଼ିଆ)', bioOrIn),
        field('Academic Stage', stageIn),
        field('Target Exams (comma-separated)', examsIn),
        field('Institution Name', instIn),
        field('Badge Label', badgeIn),
        field('Profile Visibility', visIn),
        field('Verified Educator', verCb)
      ]);
      attachRevisions(body, '02', p.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn('Save Profile', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/profiles/${encodeURIComponent(p.id)}`, 'PUT', {
            display_handle: handleIn.value.trim(),
            bio_en: bioEnIn.value.trim(),
            bio_or: bioOrIn.value.trim(),
            academic_stage: stageIn.value,
            target_exams: examsIn.value.split(',').map(x => x.trim()).filter(Boolean),
            institution_name: instIn.value.trim(),
            badge_label: badgeIn.value.trim(),
            profile_visibility: visIn.value,
            verified_educator: verCb.checked
          });
          toast('Profile updated', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 03: ROLES & PERMISSIONS ================= */
  async function renderRolesPermissions(root) {
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const titleBox = el('div', '');
      titleBox.append(
        el('h2', 'cso-edu-title', '03 · Roles & Permissions (RBAC Matrix)'),
        el('div', 'cso-edu-sub', 'Granular capability matrix across all 6 Admin Command domains. Super Admin core permissions are protected.')
      );
      head.append(titleBox, btn('+ Create Custom Role', 'cso-edu-btn-primary', openCreateRoleDrawer));
      wrap.appendChild(head);

      const data = await api(`${API}/roles`);
      const roles = data.items || [];
      const domains = data.domains || Object.keys(DOMAIN_LABELS);
      const caps = data.capabilities || CAPS;

      roles.forEach(role => {
        const card = el('div', 'cso-urc-role-card');
        const rHead = el('div', 'cso-urc-role-head');
        const info = el('div', '');
        info.append(
          el('strong', '', `${role.role_name_en} (${role.role_key})`),
          el('div', 'cso-edu-sub', `${role.role_name_or || ''} · ${role.description_en || ''}`)
        );

        const matrixState = JSON.parse(JSON.stringify(role.permissions || {}));
        const actions = el('div', 'cso-edu-actions');
        actions.appendChild(btn('Save Matrix', 'cso-edu-btn-primary cso-edu-btn-sm', async () => {
          try {
            await api(`${API}/roles/${encodeURIComponent(role.id)}`, 'PUT', { permissions: matrixState });
            toast(`Saved permissions for ${role.role_key}`, 'success');
            draw();
          } catch (e) { toast(e.message, 'error'); }
        }));
        actions.appendChild(btn('Revisions', 'cso-edu-btn-sm', () => {
          const { backdrop, body } = openDrawer(`Revisions · ${role.role_key}`, []);
          attachRevisions(body, '03', role.id, () => { backdrop.remove(); draw(); });
        }));
        if (!role.is_system_role) {
          actions.appendChild(btn('Archive', 'cso-edu-btn-sm cso-edu-btn-danger', async () => {
            try {
              await api(`${API}/roles/${encodeURIComponent(role.id)}`, 'DELETE');
              toast(`Archived role ${role.role_key}`, 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }));
        }
        rHead.append(info, actions);
        card.appendChild(rHead);

        const tbl = el('table', 'cso-urc-matrix');
        const thead = el('thead');
        const hr = el('tr');
        hr.appendChild(el('th', '', 'Admin Command Domain'));
        caps.forEach(c => hr.appendChild(el('th', '', c.toUpperCase())));
        thead.appendChild(hr);
        tbl.appendChild(thead);

        const tbody = el('tbody');
        domains.forEach(d => {
          const tr = el('tr');
          tr.appendChild(el('td', '', DOMAIN_LABELS[d] || d));
          if (!matrixState[d]) matrixState[d] = {};
          caps.forEach(c => {
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = Boolean(matrixState[d][c]);
            cb.addEventListener('change', () => { matrixState[d][c] = cb.checked; });
            tr.appendChild(el('td', '', cb));
          });
          tbody.appendChild(tr);
        });
        tbl.appendChild(tbody);
        card.appendChild(tbl);
        wrap.appendChild(card);
      });
    }

    function openCreateRoleDrawer() {
      const keyIn = textInput('text', '', 'e.g. district_coordinator');
      const nameEnIn = textInput('text', '', 'District Coordinator');
      const nameOrIn = textInput('text', '', 'ଜିଲ୍ଲା ସଂଯୋଜକ');
      const descIn = textareaOf('', 'Role responsibilities...');
      const rankIn = textInput('number', '15', '15');

      const { backdrop, foot } = openDrawer('Create Custom Role', [
        field('Role Key (lowercase_underscore)', keyIn),
        field('Role Name (English)', nameEnIn),
        field('Role Name (Odia)', nameOrIn),
        field('Description', descIn),
        field('Priority Rank', rankIn)
      ]);
      foot.appendChild(btn('Create Role', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/roles`, 'POST', {
            role_key: keyIn.value.trim(),
            role_name_en: nameEnIn.value.trim(),
            role_name_or: nameOrIn.value.trim(),
            description_en: descIn.value.trim(),
            priority_rank: Number(rankIn.value || 20),
            permissions: { edu_resources: { view: true } }
          });
          toast('Custom role created', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 04: ADMIN ACCOUNTS ================= */
  async function renderAdminAccounts(root) {
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const titleBox = el('div', '');
      titleBox.append(
        el('h2', 'cso-edu-title', '04 · Admin Accounts & Staff Security'),
        el('div', 'cso-edu-sub', 'Privileged staff roster with MFA enforcement, session timeouts, and self-lockout protection.')
      );
      head.append(titleBox, btn('+ Provision Admin', 'cso-edu-btn-primary', () => openAdminDrawer(null)));
      wrap.appendChild(head);

      const data = await api(`${API}/admins`);
      const items = data.items || [];
      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No admin accounts found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Code', 'Staff Member', 'Admin Role', 'Department', 'MFA & Timeout', 'Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(a => {
        const tr = el('tr');
        tr.appendChild(el('td', '', a.admin_code));
        const info = el('td');
        info.append(el('strong', '', a.full_name), el('div', 'cso-edu-sub', a.email));
        tr.appendChild(info);
        tr.appendChild(el('td', '', a.admin_role_key));
        tr.appendChild(el('td', '', a.department_label));

        const secCell = el('td');
        secCell.append(
          el('span', 'cso-urc-badge-mfa', a.mfa_enforced ? 'MFA Enforced' : 'MFA Off'),
          el('div', 'cso-edu-sub', `${a.session_timeout_mins} mins${a.ip_allowlist_hint ? ' · ' + a.ip_allowlist_hint : ''}`)
        );
        tr.appendChild(secCell);
        tr.appendChild(el('td', '', a.status));

        const act = el('td', 'cso-edu-actions');
        act.append(
          btn('Edit', 'cso-edu-btn-sm', () => openAdminDrawer(a)),
          btn(a.status === 'active' ? 'Suspend' : 'Activate', 'cso-edu-btn-sm cso-edu-btn-danger', async () => {
            try {
              const next = a.status === 'active' ? 'suspended' : 'active';
              await api(`${API}/admins/${encodeURIComponent(a.id)}`, 'PATCH', { status: next });
              toast(`Admin account ${next}`, 'success');
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

    function openAdminDrawer(a) {
      const isEdit = Boolean(a);
      const nameIn = textInput('text', a?.full_name || '', 'Staff Full Name');
      const emailIn = textInput('email', a?.email || '', 'staff@csodisha.com');
      if (isEdit) emailIn.disabled = true;
      const roleIn = selectOf([
        ['super_admin', 'Super Admin'],
        ['admin', 'Platform Admin'],
        ['moderator', 'Content Moderator'],
        ['educator', 'Educator']
      ], a?.admin_role_key || 'admin');
      const deptIn = textInput('text', a?.department_label || 'Platform Operations', 'Department');
      const timeoutIn = textInput('number', String(a?.session_timeout_mins || 60), '60');
      const ipIn = textInput('text', a?.ip_allowlist_hint || '', 'e.g. 103.21.0.0/16');
      const mfaCb = document.createElement('input');
      mfaCb.type = 'checkbox';
      mfaCb.checked = a ? Boolean(a.mfa_enforced) : true;

      const { backdrop, body, foot } = openDrawer(
        isEdit ? `Edit Admin · ${a.admin_code}` : 'Provision New Admin Account',
        [
          field('Full Name', nameIn),
          field('Email', emailIn),
          field('Admin Role', roleIn),
          field('Department Label', deptIn),
          field('Session Timeout (minutes)', timeoutIn),
          field('IP Allowlist Hint', ipIn),
          field('Enforce MFA / 2FA', mfaCb)
        ]
      );
      if (isEdit) attachRevisions(body, '04', a.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Admin' : 'Provision Admin', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            full_name: nameIn.value.trim(),
            email: emailIn.value.trim(),
            admin_role_key: roleIn.value,
            department_label: deptIn.value.trim(),
            session_timeout_mins: Number(timeoutIn.value || 60),
            ip_allowlist_hint: ipIn.value.trim(),
            mfa_enforced: mfaCb.checked
          };
          if (isEdit) await api(`${API}/admins/${encodeURIComponent(a.id)}`, 'PUT', payload);
          else await api(`${API}/admins`, 'POST', payload);
          toast(isEdit ? 'Admin account updated' : 'Admin account provisioned', 'success');
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
    if (moduleId === 'module-09-001') { renderAllUsers(root); return true; }
    if (moduleId === 'module-09-002') { renderUserProfiles(root); return true; }
    if (moduleId === 'module-09-003') { renderRolesPermissions(root); return true; }
    if (moduleId === 'module-09-004') { renderAdminAccounts(root); return true; }
    return false;
  }

  window.CSOUsersCommunityBatch1 = { render: renderModule };
})();
