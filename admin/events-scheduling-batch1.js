/* Events & Scheduling Batch 1 (01-03) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/events';
  const MODULES = {
    'module-es-001': { num: '01', title: 'State Competitive Exam Calendar' },
    'module-es-002': { num: '02', title: 'Entrance & Admission Milestones' },
    'module-es-003': { num: '03', title: 'Recruitment Application Deadlines & Countdown Engine' }
  };

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

  function checkboxOf(checked, labelText) {
    const wrap = el('label', 'cso-edu-check');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = Boolean(checked);
    wrap.append(cb, document.createTextNode(` ${labelText}`));
    return { wrap, cb };
  }

  function evtBadge(val, label) {
    const safe = String(val || 'unknown').replace(/[^a-z0-9_-]/gi, '');
    return el('span', `cso-evt-badge is-${safe}`, label || val || '—');
  }

  function formatRemainingIst(hours) {
    const h = Number(hours || 0);
    if (h <= 0) return 'Closed (IST)';
    if (h < 24) return `${h.toFixed(1)}h left (IST)`;
    const days = Math.floor(h / 24);
    const remH = Math.round(h % 24);
    return `${days}d ${remH}h left (IST)`;
  }

  function openDrawer(title, bodyNodes) {
    const backdrop = el('div', 'cso-edu-drawer-backdrop');
    const drawer = el('div', 'cso-edu-drawer');
    const head = el('div', 'cso-edu-drawer-head');
    head.append(el('h3', '', title), btn('Close', 'cso-edu-btn-ghost', () => backdrop.remove()));
    const body = el('div', 'cso-edu-drawer-body');
    bodyNodes.forEach(n => body.appendChild(n));
    const foot = el('div', 'cso-edu-drawer-foot');
    foot.appendChild(btn('Cancel', '', () => backdrop.remove()));
    drawer.append(head, body, foot);
    backdrop.appendChild(drawer);
    backdrop.addEventListener('click', ev => { if (ev.target === backdrop) backdrop.remove(); });
    document.body.appendChild(backdrop);
    return { backdrop, body, foot };
  }

  function attachRevisions(container, moduleCode, entityId, onRestored) {
    if (!entityId) return;
    const box = el('div', 'cso-edu-rev-list');
    box.appendChild(el('div', 'cso-edu-label', 'Revision History (Rollback)'));
    const list = el('div', 'cso-edu-rev-items');
    box.appendChild(list);
    container.appendChild(box);
    api(`${API}/revisions?module_code=${encodeURIComponent(moduleCode)}&entity_id=${encodeURIComponent(entityId)}`).then(d => {
      const items = d.items || [];
      if (!items.length) { list.appendChild(el('div', 'cso-edu-muted', 'No revisions yet.')); return; }
      items.forEach(r => {
        const row = el('div', 'cso-edu-rev-item');
        row.append(
          el('span', '', `v${r.version_num} · ${r.change_note || 'update'} (${r.created_at || ''})`),
          btn('Rollback', 'cso-edu-btn-sm', async () => {
            try {
              await api(`${API}/revisions/rollback`, 'POST', { revision_id: r.id });
              toast(`Rolled back to v${r.version_num}`, 'success');
              if (onRestored) onRestored();
            } catch (e) { toast(e.message, 'error'); }
          })
        );
        list.appendChild(row);
      });
    }).catch(() => {});
  }

  function buildHeader(modKey, subtitle, extraBtns) {
    const info = MODULES[modKey];
    const bar = el('div', 'cso-edu-header');
    const left = el('div', '');
    left.append(
      el('div', 'cso-edu-kicker', `Events & Scheduling · Module ${info.num} of 9 · IST (Asia/Kolkata)`),
      el('h2', 'cso-edu-title', info.title),
      el('p', 'cso-edu-sub', subtitle)
    );
    const right = el('div', 'cso-edu-actions');
    (extraBtns || []).forEach(b => right.appendChild(b));
    bar.append(left, right);
    return bar;
  }

  function renderKpiStrip(ov) {
    const strip = el('div', 'cso-evt-kpi-strip');
    const cards = [
      ['Confirmed Exam Dates', ov.confirmed_exam_dates ?? 0],
      ['Live Admission Milestones', ov.active_admission_milestones ?? 0],
      ['Open Countdowns', ov.open_application_countdowns ?? 0],
      ['Closing <72h / Final 24h', `${ov.closing_72h_count ?? 0} / ${ov.final_24h_count ?? 0}`]
    ];
    cards.forEach(([lbl, val]) => {
      const c = el('div', 'cso-evt-kpi-card');
      c.append(el('span', 'cso-evt-kpi-label', lbl), el('span', 'cso-evt-kpi-val', String(val)));
      strip.appendChild(c);
    });
    return strip;
  }

  /* ==================== MODULE 01: STATE COMPETITIVE EXAM CALENDAR ==================== */
  async function renderExamCalendar(root) {
    let curBody = '';
    let curStatus = '';
    let curQ = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-es-001', 'Official Odisha competitive exam dates across OPSC, OSSC, OSSSC, NTA UGC NET & OTET/OSSTET normalized to IST.', [
        btn('+ Add Exam Date', 'cso-edu-btn-primary', () => openExamDrawer(null))
      ]));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/exam-calendar?commission_body=${encodeURIComponent(curBody)}&schedule_status=${encodeURIComponent(curStatus)}&q=${encodeURIComponent(curQ)}`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      const stack = el('div', 'cso-evt-filter-stack');
      const bodyTabs = el('div', 'cso-edu-tabs');
      [
        ['', 'All'], ['OPSC', 'OPSC'], ['OSSC', 'OSSC'], ['OSSSC', 'OSSSC'],
        ['NTA_UGC_NET', 'NTA UGC NET'], ['OTET_OSSTET', 'OTET/OSSTET']
      ].forEach(([v, l]) => {
        bodyTabs.appendChild(btn(l, `cso-edu-tab ${curBody === v ? 'is-active' : ''}`, () => { curBody = v; draw(); }));
      });

      const statusRow = el('div', 'cso-evt-pill-row');
      [
        ['', 'All Statuses'], ['confirmed', 'Confirmed'], ['tentative', 'Tentative'],
        ['postponed', 'Postponed'], ['completed', 'Completed']
      ].forEach(([v, l]) => {
        statusRow.appendChild(btn(l, `cso-edu-btn-sm ${curStatus === v ? 'cso-edu-btn-primary' : ''}`, () => { curStatus = v; draw(); }));
      });

      const searchIn = textInput('search', curQ, 'Search exam name, advt number, or code...');
      searchIn.addEventListener('keydown', ev => { if (ev.key === 'Enter') { curQ = searchIn.value.trim(); draw(); } });
      const searchBtn = btn('Search', 'cso-edu-btn-sm', () => { curQ = searchIn.value.trim(); draw(); });
      const searchWrap = el('div', 'cso-evt-pill-row', [searchIn, searchBtn]);

      stack.append(bodyTabs, statusRow, searchWrap);
      root.appendChild(el('div', 'cso-edu-toolbar', [stack]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code & Body', 'Exam Title (EN / ଓଡ଼ିଆ)', 'Stage', 'IST Dates & Shift', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        const titleCell = el('div', '', [
          el('strong', '', it.exam_name_en),
          it.exam_name_or ? el('div', 'cso-edu-muted', it.exam_name_or) : null,
          it.advt_number ? el('div', 'cso-edu-muted', it.advt_number) : null
        ].filter(Boolean));
        const dateLabel = it.exam_date_start === it.exam_date_end ? it.exam_date_start : `${it.exam_date_start} → ${it.exam_date_end}`;
        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', 'cso-edu-mono', it.event_code), el('div', 'cso-edu-muted', it.commission_body)]),
          el('td', '', titleCell),
          el('td', '', evtBadge(it.exam_stage, it.exam_stage)),
          el('td', '', [el('div', 'cso-edu-mono', dateLabel), el('div', 'cso-edu-muted', it.shift_timing_ist)]),
          el('td', '', evtBadge(it.schedule_status, it.schedule_status)),
          el('td', 'cso-edu-row-actions', [
            btn('Edit', 'cso-edu-btn-sm', () => openExamDrawer(it)),
            btn('Archive', 'cso-edu-btn-sm', async () => {
              try {
                await api(`${API}/exam-calendar/${encodeURIComponent(it.id)}`, 'DELETE');
                toast('Exam entry archived', 'success');
                draw();
              } catch (e) { toast(e.message, 'error'); }
            })
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openExamDrawer(item) {
      const isEdit = Boolean(item);
      const codeIn = textInput('text', item ? item.event_code : '', 'EXM-2026-0005 (auto if blank)');
      if (isEdit) codeIn.disabled = true;
      const bodySel = selectOf([
        ['OPSC', 'OPSC'], ['OSSC', 'OSSC'], ['OSSSC', 'OSSSC'],
        ['NTA_UGC_NET', 'NTA_UGC_NET'], ['OTET_OSSTET', 'OTET_OSSTET'],
        ['RRC_BBS', 'RRC_BBS'], ['OTHER', 'OTHER']
      ], item ? item.commission_body : 'OPSC');
      const nameEn = textInput('text', item ? item.exam_name_en : '', 'Exam title in English');
      const nameOr = textInput('text', item ? item.exam_name_or : '', 'ପରୀକ୍ଷା ନାମ (ଓଡ଼ିଆ)');
      const advtIn = textInput('text', item ? item.advt_number : '', 'Advt. No.');
      const stageSel = selectOf([
        ['prelims', 'prelims'], ['mains', 'mains'], ['written_cbt', 'written_cbt'],
        ['skill_physical', 'skill_physical'], ['viva_voce', 'viva_voce']
      ], item ? item.exam_stage : 'prelims');
      const startIn = textInput('date', item ? item.exam_date_start : '2026-12-20');
      const endIn = textInput('date', item ? item.exam_date_end : '2026-12-20');
      const shiftIn = textInput('text', item ? item.shift_timing_ist : '10:00 AM – 12:00 PM IST', '10:00 AM – 12:00 PM IST');
      const urlIn = textInput('url', item ? item.official_notice_url : '', 'https://www.opsc.gov.in');
      const scopeSel = selectOf([
        ['all_30_districts', 'all_30_districts'], ['major_centers', 'major_centers'], ['bhubaneswar_cuttack', 'bhubaneswar_cuttack']
      ], item ? item.district_scope : 'all_30_districts');
      const statusSel = selectOf([
        ['confirmed', 'confirmed'], ['tentative', 'tentative'], ['postponed', 'postponed'], ['completed', 'completed']
      ], item ? item.schedule_status : 'confirmed');
      const feat = checkboxOf(item ? Number(item.is_featured) === 1 : true, 'Featured on Upcoming Calendar');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Exam · ${item.event_code}` : 'Add Competitive Exam Date', [
        field('Event Code', codeIn),
        field('Commission Body', bodySel),
        field('Exam Name (EN)', nameEn),
        field('Exam Name (Odia)', nameOr),
        field('Advertisement Number', advtIn),
        field('Exam Stage', stageSel),
        field('Start Date (IST)', startIn),
        field('End Date (IST)', endIn),
        field('Shift Timing (IST)', shiftIn),
        field('Official Notice URL', urlIn),
        field('District Scope', scopeSel),
        field('Schedule Status', statusSel),
        feat.wrap
      ]);
      if (isEdit) attachRevisions(body, '01', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Exam Date' : 'Create Exam Date', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            event_code: codeIn.value.trim() || undefined,
            commission_body: bodySel.value,
            exam_name_en: nameEn.value.trim(),
            exam_name_or: nameOr.value.trim(),
            advt_number: advtIn.value.trim(),
            exam_stage: stageSel.value,
            exam_date_start: startIn.value,
            exam_date_end: endIn.value || startIn.value,
            shift_timing_ist: shiftIn.value.trim(),
            official_notice_url: urlIn.value.trim(),
            district_scope: scopeSel.value,
            schedule_status: statusSel.value,
            is_featured: feat.cb.checked
          };
          if (isEdit) await api(`${API}/exam-calendar/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/exam-calendar`, 'POST', payload);
          toast('Exam calendar saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 02: ENTRANCE & ADMISSION MILESTONES ==================== */
  async function renderAdmissions(root) {
    let curAuth = '';
    let curStatus = '';
    let curQ = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-es-002', 'SAMS Odisha, OJEE, OSHEC CPET & SCERT B.Ed. admission rounds, CAF windows & merit lists in IST.', [
        btn('+ Add Admission Milestone', 'cso-edu-btn-primary', () => openAdmDrawer(null))
      ]));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/admissions?portal_authority=${encodeURIComponent(curAuth)}&status=${encodeURIComponent(curStatus)}&q=${encodeURIComponent(curQ)}`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      const stack = el('div', 'cso-evt-filter-stack');
      const authTabs = el('div', 'cso-edu-tabs');
      [
        ['', 'All'], ['SAMS_ODISHA', 'SAMS Odisha'], ['OJEE', 'OJEE'],
        ['OSHEC_CPET', 'CPET'], ['TE_SCERT_BED', 'SCERT B.Ed.']
      ].forEach(([v, l]) => {
        authTabs.appendChild(btn(l, `cso-edu-tab ${curAuth === v ? 'is-active' : ''}`, () => { curAuth = v; draw(); }));
      });

      const statusRow = el('div', 'cso-evt-pill-row');
      [['', 'All'], ['active_live', 'Active Live'], ['upcoming', 'Upcoming'], ['closed', 'Closed']].forEach(([v, l]) => {
        statusRow.appendChild(btn(l, `cso-edu-btn-sm ${curStatus === v ? 'cso-edu-btn-primary' : ''}`, () => { curStatus = v; draw(); }));
      });

      const searchIn = textInput('search', curQ, 'Search milestone title, code, or eligibility...');
      searchIn.addEventListener('keydown', ev => { if (ev.key === 'Enter') { curQ = searchIn.value.trim(); draw(); } });
      stack.append(authTabs, statusRow, el('div', 'cso-evt-pill-row', [searchIn, btn('Search', 'cso-edu-btn-sm', () => { curQ = searchIn.value.trim(); draw(); })]));
      root.appendChild(el('div', 'cso-edu-toolbar', [stack]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code & Authority', 'Milestone Title (EN / ଓଡ଼ିଆ)', 'Phase', 'IST Window', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', 'cso-edu-mono', it.milestone_code), el('div', 'cso-edu-muted', it.portal_authority)]),
          el('td', '', [
            el('strong', '', it.title_en),
            it.title_or ? el('div', 'cso-edu-muted', it.title_or) : null,
            it.eligibility_note_en ? el('div', 'cso-edu-muted', it.eligibility_note_en) : null
          ].filter(Boolean)),
          el('td', '', evtBadge(it.milestone_phase, it.milestone_phase)),
          el('td', '', [
            el('div', 'cso-edu-mono', `From: ${it.starts_at_ist}`),
            el('div', 'cso-edu-mono', `To:   ${it.ends_at_ist}`)
          ]),
          el('td', '', evtBadge(it.status, it.status)),
          el('td', 'cso-edu-row-actions', [
            btn('Edit', 'cso-edu-btn-sm', () => openAdmDrawer(it)),
            btn('Archive', 'cso-edu-btn-sm', async () => {
              try {
                await api(`${API}/admissions/${encodeURIComponent(it.id)}`, 'DELETE');
                toast('Milestone archived', 'success');
                draw();
              } catch (e) { toast(e.message, 'error'); }
            })
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openAdmDrawer(item) {
      const isEdit = Boolean(item);
      const codeIn = textInput('text', item ? item.milestone_code : '', 'ADM-2026-0005 (auto if blank)');
      if (isEdit) codeIn.disabled = true;
      const authSel = selectOf([
        ['SAMS_ODISHA', 'SAMS_ODISHA'], ['OJEE', 'OJEE'], ['OSHEC_CPET', 'OSHEC_CPET'],
        ['TE_SCERT_BED', 'TE_SCERT_BED'], ['CHSE_ODISHA', 'CHSE_ODISHA'], ['BSE_ODISHA', 'BSE_ODISHA']
      ], item ? item.portal_authority : 'SAMS_ODISHA');
      const streamSel = selectOf([
        ['plus_two_plus_three', 'plus_two_plus_three'], ['bed_med_teacher_ed', 'bed_med_teacher_ed'],
        ['cpet_pg_entrance', 'cpet_pg_entrance'], ['ojee_technical', 'ojee_technical'], ['iti_diploma', 'iti_diploma']
      ], item ? item.program_stream : 'plus_two_plus_three');
      const titleEn = textInput('text', item ? item.title_en : '', 'Milestone title in English');
      const titleOr = textInput('text', item ? item.title_or : '', 'ଓଡ଼ିଆ ଶୀର୍ଷକ');
      const phaseSel = selectOf([
        ['caf_application', 'caf_application'], ['entrance_test', 'entrance_test'],
        ['merit_list_round_1', 'merit_list_round_1'], ['slide_freeze_float', 'slide_freeze_float'],
        ['spot_admission', 'spot_admission']
      ], item ? item.milestone_phase : 'caf_application');
      const startIn = textInput('text', item ? item.starts_at_ist : '2026-11-25T10:00:00+05:30', 'YYYY-MM-DDTHH:mm:ss+05:30');
      const endIn = textInput('text', item ? item.ends_at_ist : '2026-12-10T17:00:00+05:30', 'YYYY-MM-DDTHH:mm:ss+05:30');
      const urlIn = textInput('url', item ? item.official_portal_url : '', 'https://samsodisha.gov.in');
      const eligEn = textareaOf(item ? item.eligibility_note_en : '', 'Eligibility note (EN)');
      const eligOr = textareaOf(item ? item.eligibility_note_or : '', 'ଯୋଗ୍ୟତା ସୂଚନା (ଓଡ଼ିଆ)');
      const statusSel = selectOf([
        ['active_live', 'active_live'], ['upcoming', 'upcoming'], ['closed', 'closed']
      ], item ? item.status : 'active_live');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Milestone · ${item.milestone_code}` : 'Add Admission Milestone', [
        field('Milestone Code', codeIn),
        field('Portal Authority', authSel),
        field('Program Stream', streamSel),
        field('Title (EN)', titleEn),
        field('Title (Odia)', titleOr),
        field('Milestone Phase', phaseSel),
        field('Starts At (IST)', startIn),
        field('Ends At (IST)', endIn),
        field('Official Portal URL', urlIn),
        field('Eligibility Note (EN)', eligEn),
        field('Eligibility Note (Odia)', eligOr),
        field('Status', statusSel)
      ]);
      if (isEdit) attachRevisions(body, '02', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Milestone' : 'Create Milestone', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            milestone_code: codeIn.value.trim() || undefined,
            portal_authority: authSel.value,
            program_stream: streamSel.value,
            title_en: titleEn.value.trim(),
            title_or: titleOr.value.trim(),
            milestone_phase: phaseSel.value,
            starts_at_ist: startIn.value.trim(),
            ends_at_ist: endIn.value.trim(),
            official_portal_url: urlIn.value.trim(),
            eligibility_note_en: eligEn.value.trim(),
            eligibility_note_or: eligOr.value.trim(),
            status: statusSel.value
          };
          if (isEdit) await api(`${API}/admissions/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/admissions`, 'POST', payload);
          toast('Admission milestone saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 03: RECRUITMENT DEADLINES & COUNTDOWN ENGINE ==================== */
  async function renderDeadlines(root) {
    let curUrgency = '';
    let curQ = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-es-003', 'Live IST countdown engine for Odisha recruitment closing dates, 72h/24h urgency badges & portal ticker pins.', [
        btn('+ Add Deadline Countdown', 'cso-edu-btn-primary', () => openDeadlineDrawer(null))
      ]));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/deadlines?urgency_badge=${encodeURIComponent(curUrgency)}&q=${encodeURIComponent(curQ)}`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      const stack = el('div', 'cso-evt-filter-stack');
      const urgTabs = el('div', 'cso-edu-tabs');
      [
        ['', 'All'], ['final_24h', 'Final 24h'], ['closing_72h', 'Closing <72h'],
        ['open_normal', 'Open'], ['extended', 'Extended']
      ].forEach(([v, l]) => {
        urgTabs.appendChild(btn(l, `cso-edu-tab ${curUrgency === v ? 'is-active' : ''}`, () => { curUrgency = v; draw(); }));
      });

      const searchIn = textInput('search', curQ, 'Search post title, advt number, or code...');
      searchIn.addEventListener('keydown', ev => { if (ev.key === 'Enter') { curQ = searchIn.value.trim(); draw(); } });
      stack.append(urgTabs, el('div', 'cso-evt-pill-row', [searchIn, btn('Search', 'cso-edu-btn-sm', () => { curQ = searchIn.value.trim(); draw(); })]));
      root.appendChild(el('div', 'cso-edu-toolbar', [stack]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code & Body', 'Post Title (EN / ଓଡ଼ିଆ)', 'Vacancies', 'IST Closing & Remaining', 'Urgency', 'Ticker & Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        const isPinned = Number(it.is_pinned_ticker) === 1;
        const isUrgent = it.urgency_badge === 'final_24h' || it.urgency_badge === 'closing_72h';
        const pinBtn = btn(isPinned ? 'Pinned to Ticker' : 'Pin to Portal Ticker', `cso-edu-btn-sm cso-evt-ticker-btn ${isPinned ? 'is-pinned' : ''}`, async () => {
          try {
            await api(`${API}/deadlines/${encodeURIComponent(it.id)}/status`, 'PATCH', { is_pinned_ticker: isPinned ? 0 : 1 });
            toast(isPinned ? 'Unpinned from ticker' : 'Pinned to portal ticker', 'success');
            draw();
          } catch (e) { toast(e.message, 'error'); }
        });

        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', 'cso-edu-mono', it.deadline_code), el('div', 'cso-edu-muted', it.commission_body)]),
          el('td', '', [
            el('strong', '', it.post_title_en),
            it.post_title_or ? el('div', 'cso-edu-muted', it.post_title_or) : null,
            it.advt_number ? el('div', 'cso-edu-muted', it.advt_number) : null
          ].filter(Boolean)),
          el('td', 'cso-edu-mono', String(it.total_vacancies || 0)),
          el('td', '', [
            el('div', 'cso-edu-mono', it.registration_closes_ist),
            el('span', `cso-evt-countdown-pill ${isUrgent ? 'is-urgent' : ''}`, formatRemainingIst(it.remaining_hours))
          ]),
          el('td', '', evtBadge(it.urgency_badge, it.urgency_badge)),
          el('td', 'cso-edu-row-actions', [
            pinBtn,
            btn('Edit', 'cso-edu-btn-sm', () => openDeadlineDrawer(it)),
            btn('Archive', 'cso-edu-btn-sm', async () => {
              try {
                await api(`${API}/deadlines/${encodeURIComponent(it.id)}`, 'DELETE');
                toast('Deadline archived', 'success');
                draw();
              } catch (e) { toast(e.message, 'error'); }
            })
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openDeadlineDrawer(item) {
      const isEdit = Boolean(item);
      const codeIn = textInput('text', item ? item.deadline_code : '', 'DDL-2026-0005 (auto if blank)');
      if (isEdit) codeIn.disabled = true;
      const bodySel = selectOf([
        ['OPSC', 'OPSC'], ['OSSC', 'OSSC'], ['OSSSC', 'OSSSC'],
        ['NTA_UGC_NET', 'NTA_UGC_NET'], ['OTET_OSSTET', 'OTET_OSSTET'],
        ['RRC_BBS', 'RRC_BBS'], ['OTHER', 'OTHER']
      ], item ? item.commission_body : 'OPSC');
      const titleEn = textInput('text', item ? item.post_title_en : '', 'Post / Recruitment title (EN)');
      const titleOr = textInput('text', item ? item.post_title_or : '', 'ପଦବୀ ଶୀର୍ଷକ (ଓଡ଼ିଆ)');
      const advtIn = textInput('text', item ? item.advt_number : '', 'Advt. No.');
      const vacIn = textInput('number', item ? String(item.total_vacancies ?? 0) : '100', 'Total vacancies');
      const opensIn = textInput('text', item ? item.registration_opens_ist : '2026-11-15T10:00:00+05:30', 'YYYY-MM-DDTHH:mm:ss+05:30');
      const closesIn = textInput('text', item ? item.registration_closes_ist : '2026-11-28T23:59:00+05:30', 'YYYY-MM-DDTHH:mm:ss+05:30');
      const feeIn = textInput('text', item ? item.fee_payment_closes_ist : '2026-11-29T23:59:00+05:30', 'YYYY-MM-DDTHH:mm:ss+05:30');
      const corrIn = textInput('text', item ? item.correction_window_note : '', 'Correction window note');
      const urlIn = textInput('url', item ? item.apply_portal_url : '', 'https://www.opsc.gov.in');
      const urgSel = selectOf([
        ['open_normal', 'open_normal'], ['closing_72h', 'closing_72h'],
        ['final_24h', 'final_24h'], ['extended', 'extended'], ['closed', 'closed']
      ], item ? item.urgency_badge : 'open_normal');
      const statusSel = selectOf([
        ['active_live', 'active_live'], ['scheduled', 'scheduled'], ['expired', 'expired']
      ], item ? item.status : 'active_live');
      const pinChk = checkboxOf(item ? Number(item.is_pinned_ticker) === 1 : true, 'Pin to Portal Ticker');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Deadline · ${item.deadline_code}` : 'Add Deadline Countdown', [
        field('Deadline Code', codeIn),
        field('Commission Body', bodySel),
        field('Post Title (EN)', titleEn),
        field('Post Title (Odia)', titleOr),
        field('Advertisement Number', advtIn),
        field('Total Vacancies', vacIn),
        field('Registration Opens (IST)', opensIn),
        field('Registration Closes (IST)', closesIn),
        field('Fee Payment Closes (IST)', feeIn),
        field('Correction Window Note', corrIn),
        field('Apply Portal URL', urlIn),
        field('Urgency Override', urgSel),
        field('Status', statusSel),
        pinChk.wrap
      ]);
      if (isEdit) attachRevisions(body, '03', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Deadline' : 'Create Deadline', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            deadline_code: codeIn.value.trim() || undefined,
            commission_body: bodySel.value,
            post_title_en: titleEn.value.trim(),
            post_title_or: titleOr.value.trim(),
            advt_number: advtIn.value.trim(),
            total_vacancies: parseInt(vacIn.value || '0', 10) || 0,
            registration_opens_ist: opensIn.value.trim(),
            registration_closes_ist: closesIn.value.trim(),
            fee_payment_closes_ist: feeIn.value.trim(),
            correction_window_note: corrIn.value.trim(),
            apply_portal_url: urlIn.value.trim(),
            urgency_badge: urgSel.value,
            status: statusSel.value,
            is_pinned_ticker: pinChk.cb.checked
          };
          if (isEdit) await api(`${API}/deadlines/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/deadlines`, 'POST', payload);
          toast('Deadline countdown saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  window.CSOEventsBatch1 = {
    async render(moduleId, root) {
      if (!MODULES[moduleId] || !root) return false;
      root.className = 'cso-edu-shell';
      if (moduleId === 'module-es-001') await renderExamCalendar(root);
      else if (moduleId === 'module-es-002') await renderAdmissions(root);
      else if (moduleId === 'module-es-003') await renderDeadlines(root);
      return true;
    }
  };
})();
