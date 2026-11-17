/* Events & Scheduling Batch 2 (04-06) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/events';
  const MODULES = {
    'module-es-004': { num: '04', title: 'Admit Card, Hall Ticket & Center Allotment Alerts' },
    'module-es-005': { num: '05', title: 'Answer Key Challenges & Provisional Key Timelines' },
    'module-es-006': { num: '06', title: 'Result Declarations & Document Verification (DV) Rosters' }
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
      ['Live Admit Card Portals', ov.live_admit_card_portals ?? 0],
      ['Open Answer Key Challenges', ov.open_answer_key_challenges ?? 0],
      ['Published Result / DV Rosters', ov.published_results_dv_rosters ?? 0],
      ['Active DV Ongoing', ov.active_dv_ongoing_count ?? 0]
    ];
    cards.forEach(([lbl, val]) => {
      const c = el('div', 'cso-evt-kpi-card');
      c.append(el('span', 'cso-evt-kpi-label', lbl), el('span', 'cso-evt-kpi-val', String(val)));
      strip.appendChild(c);
    });
    return strip;
  }

  /* ==================== MODULE 04: ADMIT CARDS & CENTER ALLOTMENT ==================== */
  async function renderAdmitCards(root) {
    let curStage = '';
    let curQ = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-es-004', 'Hall tickets, exam city intimation slips & Odisha district center allotment alerts in IST.', [
        btn('+ Publish Admit Card Alert', 'cso-edu-btn-primary', () => openAdmitDrawer(null))
      ]));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/admit-cards?release_stage=${encodeURIComponent(curStage)}&q=${encodeURIComponent(curQ)}`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      const stack = el('div', 'cso-evt-filter-stack');
      const stageTabs = el('div', 'cso-edu-tabs');
      [
        ['', 'All'], ['exam_city_intimation', 'City Intimation'],
        ['admit_card_live', 'Admit Card Live'], ['skill_test_call_letter', 'Skill Test']
      ].forEach(([v, l]) => {
        stageTabs.appendChild(btn(l, `cso-edu-tab ${curStage === v ? 'is-active' : ''}`, () => { curStage = v; draw(); }));
      });

      const searchIn = textInput('search', curQ, 'Search exam name, advt number, or release code...');
      searchIn.addEventListener('keydown', ev => { if (ev.key === 'Enter') { curQ = searchIn.value.trim(); draw(); } });
      stack.append(stageTabs, el('div', 'cso-evt-pill-row', [searchIn, btn('Search', 'cso-edu-btn-sm', () => { curQ = searchIn.value.trim(); draw(); })]));
      root.appendChild(el('div', 'cso-edu-toolbar', [stack]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code & Body', 'Exam & Center Zones', 'Stage', 'IST Release / Exam Date', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        const zones = el('div', 'cso-evt-zone-row');
        (it.allotted_districts || []).forEach(z => zones.appendChild(el('span', 'cso-evt-zone-chip', z)));

        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', 'cso-edu-mono', it.release_code), el('div', 'cso-edu-muted', it.commission_body)]),
          el('td', '', [
            el('strong', '', it.exam_name_en),
            it.exam_name_or ? el('div', 'cso-edu-muted', it.exam_name_or) : null,
            it.login_credentials_required ? el('div', 'cso-edu-muted', `Login: ${it.login_credentials_required}`) : null,
            (it.allotted_districts || []).length ? zones : null
          ].filter(Boolean)),
          el('td', '', evtBadge(it.release_stage, it.release_stage)),
          el('td', '', [
            el('div', 'cso-edu-mono', `Released: ${it.released_at_ist}`),
            el('div', 'cso-edu-muted', `Exam Date: ${it.exam_date_ist}`)
          ]),
          el('td', '', evtBadge(it.release_status, it.release_status)),
          el('td', 'cso-edu-row-actions', [
            btn('Edit', 'cso-edu-btn-sm', () => openAdmitDrawer(it)),
            btn('Archive', 'cso-edu-btn-sm', async () => {
              try {
                await api(`${API}/admit-cards/${encodeURIComponent(it.id)}`, 'DELETE');
                toast('Admit card alert archived', 'success');
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

    function openAdmitDrawer(item) {
      const isEdit = Boolean(item);
      const codeIn = textInput('text', item ? item.release_code : '', 'HAL-2026-0004 (auto if blank)');
      if (isEdit) codeIn.disabled = true;
      const bodySel = selectOf([
        ['OPSC', 'OPSC'], ['OSSC', 'OSSC'], ['OSSSC', 'OSSSC'],
        ['NTA_UGC_NET', 'NTA_UGC_NET'], ['OTET_OSSTET', 'OTET_OSSTET'],
        ['RRC_BBS', 'RRC_BBS'], ['OTHER', 'OTHER']
      ], item ? item.commission_body : 'OPSC');
      const nameEn = textInput('text', item ? item.exam_name_en : '', 'Exam / Hall Ticket title (EN)');
      const nameOr = textInput('text', item ? item.exam_name_or : '', 'ଓଡ଼ିଆ ଶୀର୍ଷକ');
      const advtIn = textInput('text', item ? item.advt_number : '', 'Advt. No.');
      const stageSel = selectOf([
        ['exam_city_intimation', 'exam_city_intimation'],
        ['admit_card_live', 'admit_card_live'],
        ['re_exam_hall_ticket', 're_exam_hall_ticket'],
        ['skill_test_call_letter', 'skill_test_call_letter']
      ], item ? item.release_stage : 'admit_card_live');
      const relIn = textInput('text', item ? item.released_at_ist : '2026-11-18T11:00:00+05:30', 'YYYY-MM-DDTHH:mm:ss+05:30');
      const exDateIn = textInput('date', item ? item.exam_date_ist : '2026-12-13');
      const zonesIn = textInput('text', item ? (item.allotted_districts || []).join(', ') : 'Bhubaneswar, Cuttack, Balasore, Berhampur, Sambalpur', 'Comma-separated Odisha center zones');
      const urlIn = textInput('url', item ? item.download_portal_url : '', 'https://www.opsc.gov.in');
      const credIn = textInput('text', item ? item.login_credentials_required : 'PPSAN / User ID + DOB', 'Login credentials required');
      const statusSel = selectOf([
        ['live_download', 'live_download'], ['scheduled_soon', 'scheduled_soon'], ['closed', 'closed']
      ], item ? item.release_status : 'live_download');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Admit Card · ${item.release_code}` : 'Publish Admit Card Alert', [
        field('Release Code', codeIn),
        field('Commission Body', bodySel),
        field('Exam Name (EN)', nameEn),
        field('Exam Name (Odia)', nameOr),
        field('Advertisement Number', advtIn),
        field('Release Stage', stageSel),
        field('Released At (IST)', relIn),
        field('Exam Date (IST)', exDateIn),
        field('Allotted Odisha Center Zones (comma-separated)', zonesIn),
        field('Download Portal URL', urlIn),
        field('Login Credentials Required', credIn),
        field('Release Status', statusSel)
      ]);
      if (isEdit) attachRevisions(body, '04', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Admit Card Alert' : 'Publish Alert', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            release_code: codeIn.value.trim() || undefined,
            commission_body: bodySel.value,
            exam_name_en: nameEn.value.trim(),
            exam_name_or: nameOr.value.trim(),
            advt_number: advtIn.value.trim(),
            release_stage: stageSel.value,
            released_at_ist: relIn.value.trim(),
            exam_date_ist: exDateIn.value,
            allotted_districts: zonesIn.value.split(',').map(s => s.trim()).filter(Boolean),
            download_portal_url: urlIn.value.trim(),
            login_credentials_required: credIn.value.trim(),
            release_status: statusSel.value
          };
          if (isEdit) await api(`${API}/admit-cards/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/admit-cards`, 'POST', payload);
          toast('Admit card alert saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 05: ANSWER KEY CHALLENGES & PROVISIONAL KEY TIMELINES ==================== */
  async function renderAnswerKeys(root) {
    let curStatus = '';
    let curQ = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-es-005', 'Provisional answer keys, INR (₹) objection fee rules & IST challenge deadlines.', [
        btn('+ Add Answer Key Timeline', 'cso-edu-btn-primary', () => openKeyDrawer(null))
      ]));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/answer-keys?status=${encodeURIComponent(curStatus)}&q=${encodeURIComponent(curQ)}`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      const stack = el('div', 'cso-evt-filter-stack');
      const statusTabs = el('div', 'cso-edu-tabs');
      [
        ['', 'All'], ['open_for_challenge', 'Open for Challenge'],
        ['under_expert_review', 'Under Expert Review'], ['final_published', 'Final Published']
      ].forEach(([v, l]) => {
        statusTabs.appendChild(btn(l, `cso-edu-tab ${curStatus === v ? 'is-active' : ''}`, () => { curStatus = v; draw(); }));
      });

      const searchIn = textInput('search', curQ, 'Search exam name, advt number, or key code...');
      searchIn.addEventListener('keydown', ev => { if (ev.key === 'Enter') { curQ = searchIn.value.trim(); draw(); } });
      stack.append(statusTabs, el('div', 'cso-evt-pill-row', [searchIn, btn('Search', 'cso-edu-btn-sm', () => { curQ = searchIn.value.trim(); draw(); })]));
      root.appendChild(el('div', 'cso-edu-toolbar', [stack]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code & Body', 'Exam & Sets Covered', 'INR Fee & Refund', 'IST Objection Deadline', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        const remHrs = Number(it.objection_remaining_hours || 0);
        const remLabel = remHrs > 0 ? `${remHrs.toFixed(1)}h left (IST)` : 'Window Closed (IST)';
        const isUrgent = remHrs > 0 && remHrs <= 48;
        const refundNote = Number(it.is_fee_refundable_if_accepted) === 1 ? 'Refundable if accepted' : 'Non-refundable';

        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', 'cso-edu-mono', it.key_code), el('div', 'cso-edu-muted', it.commission_body)]),
          el('td', '', [
            el('strong', '', it.exam_name_en),
            it.exam_name_or ? el('div', 'cso-edu-muted', it.exam_name_or) : null,
            el('div', 'cso-edu-muted', it.total_sets_covered || 'Sets A, B, C, D')
          ].filter(Boolean)),
          el('td', '', [
            el('span', 'cso-evt-fee-badge', `${it.fee_display_inr || '₹0.00'} / Q`),
            el('div', 'cso-edu-muted', refundNote)
          ]),
          el('td', '', [
            el('div', 'cso-edu-mono', it.objection_deadline_ist),
            el('span', `cso-evt-countdown-pill ${isUrgent ? 'is-urgent' : ''}`, remLabel)
          ]),
          el('td', '', evtBadge(it.status, it.status)),
          el('td', 'cso-edu-row-actions', [
            btn('Edit', 'cso-edu-btn-sm', () => openKeyDrawer(it)),
            btn('Archive', 'cso-edu-btn-sm', async () => {
              try {
                await api(`${API}/answer-keys/${encodeURIComponent(it.id)}`, 'DELETE');
                toast('Answer key timeline archived', 'success');
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

    function openKeyDrawer(item) {
      const isEdit = Boolean(item);
      const codeIn = textInput('text', item ? item.key_code : '', 'ANS-2026-0004 (auto if blank)');
      if (isEdit) codeIn.disabled = true;
      const bodySel = selectOf([
        ['OPSC', 'OPSC'], ['OSSC', 'OSSC'], ['OSSSC', 'OSSSC'],
        ['NTA_UGC_NET', 'NTA_UGC_NET'], ['OTET_OSSTET', 'OTET_OSSTET'],
        ['RRC_BBS', 'RRC_BBS'], ['OTHER', 'OTHER']
      ], item ? item.commission_body : 'OSSC');
      const nameEn = textInput('text', item ? item.exam_name_en : '', 'Exam title (EN)');
      const nameOr = textInput('text', item ? item.exam_name_or : '', 'ଓଡ଼ିଆ ଶୀର୍ଷକ');
      const advtIn = textInput('text', item ? item.advt_number : '', 'Advt. No.');
      const stageSel = selectOf([
        ['provisional_key_open', 'provisional_key_open'],
        ['objection_window_closing', 'objection_window_closing'],
        ['final_revised_key', 'final_revised_key'],
        ['archived_key', 'archived_key']
      ], item ? item.key_stage : 'provisional_key_open');
      const relIn = textInput('text', item ? item.provisional_released_at_ist : '2026-11-17T10:00:00+05:30', 'YYYY-MM-DDTHH:mm:ss+05:30');
      const deadIn = textInput('text', item ? item.objection_deadline_ist : '2026-11-24T23:59:00+05:30', 'YYYY-MM-DDTHH:mm:ss+05:30');
      const feeIn = textInput('number', item ? String(item.fee_per_question_paise ?? 0) : '20000', 'Integer paise (20000 = ₹200.00)');
      const refundChk = checkboxOf(item ? Number(item.is_fee_refundable_if_accepted) === 1 : true, 'Fee Refundable if Objection Accepted');
      const pdfIn = textInput('url', item ? item.answer_key_pdf_url : '', 'https://www.ossc.gov.in/key.pdf');
      const portalIn = textInput('url', item ? item.objection_portal_url : '', 'https://www.ossc.gov.in');
      const setsIn = textInput('text', item ? item.total_sets_covered : 'Sets A, B, C, D', 'Sets A, B, C, D');
      const statusSel = selectOf([
        ['open_for_challenge', 'open_for_challenge'],
        ['under_expert_review', 'under_expert_review'],
        ['final_published', 'final_published']
      ], item ? item.status : 'open_for_challenge');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Answer Key · ${item.key_code}` : 'Add Answer Key Timeline', [
        field('Key Code', codeIn),
        field('Commission Body', bodySel),
        field('Exam Name (EN)', nameEn),
        field('Exam Name (Odia)', nameOr),
        field('Advertisement Number', advtIn),
        field('Key Stage', stageSel),
        field('Provisional Key Released (IST)', relIn),
        field('Objection Deadline (IST)', deadIn),
        field('Objection Fee per Question (Paise, e.g. 20000 = ₹200.00)', feeIn),
        refundChk.wrap,
        field('Answer Key PDF URL', pdfIn),
        field('Objection Portal URL', portalIn),
        field('Sets Covered', setsIn),
        field('Status', statusSel)
      ]);
      if (isEdit) attachRevisions(body, '05', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Answer Key' : 'Create Timeline', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            key_code: codeIn.value.trim() || undefined,
            commission_body: bodySel.value,
            exam_name_en: nameEn.value.trim(),
            exam_name_or: nameOr.value.trim(),
            advt_number: advtIn.value.trim(),
            key_stage: stageSel.value,
            provisional_released_at_ist: relIn.value.trim(),
            objection_deadline_ist: deadIn.value.trim(),
            fee_per_question_paise: parseInt(feeIn.value || '0', 10) || 0,
            is_fee_refundable_if_accepted: refundChk.cb.checked,
            answer_key_pdf_url: pdfIn.value.trim(),
            objection_portal_url: portalIn.value.trim(),
            total_sets_covered: setsIn.value.trim(),
            status: statusSel.value
          };
          if (isEdit) await api(`${API}/answer-keys/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/answer-keys`, 'POST', payload);
          toast('Answer key timeline saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 06: RESULT DECLARATIONS & DV ROSTERS ==================== */
  async function renderResultsDv(root) {
    let curType = '';
    let curQ = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-es-006', 'Privacy-safe result shortlists, cutoff summaries & Odisha Document Verification (DV) board rosters.', [
        btn('+ Publish Result / DV Roster', 'cso-edu-btn-primary', () => openResultDrawer(null))
      ]));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/results-dv?declaration_type=${encodeURIComponent(curType)}&q=${encodeURIComponent(curQ)}`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      const stack = el('div', 'cso-evt-filter-stack');
      const typeTabs = el('div', 'cso-edu-tabs');
      [
        ['', 'All'], ['prelims_shortlist', 'Prelims Shortlist'],
        ['dv_biometric_schedule', 'DV Schedule'], ['final_merit_list', 'Final Merit List']
      ].forEach(([v, l]) => {
        typeTabs.appendChild(btn(l, `cso-edu-tab ${curType === v ? 'is-active' : ''}`, () => { curType = v; draw(); }));
      });

      const searchIn = textInput('search', curQ, 'Search exam name, DV venue, or roster code...');
      searchIn.addEventListener('keydown', ev => { if (ev.key === 'Enter') { curQ = searchIn.value.trim(); draw(); } });
      stack.append(typeTabs, el('div', 'cso-evt-pill-row', [searchIn, btn('Search', 'cso-edu-btn-sm', () => { curQ = searchIn.value.trim(); draw(); })]));
      root.appendChild(el('div', 'cso-edu-toolbar', [stack]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code & Body', 'Exam & Roll Range Summary', 'Type & Shortlisted', 'DV Venue & Dates (IST)', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        const dvDates = it.dv_start_date_ist
          ? (it.dv_end_date_ist && it.dv_end_date_ist !== it.dv_start_date_ist ? `${it.dv_start_date_ist} → ${it.dv_end_date_ist}` : it.dv_start_date_ist)
          : '—';
        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', 'cso-edu-mono', it.roster_code), el('div', 'cso-edu-muted', it.commission_body)]),
          el('td', '', [
            el('strong', '', it.exam_name_en),
            it.roll_range_summary ? el('div', 'cso-edu-mono', it.roll_range_summary) : null,
            it.cutoff_summary_en ? el('div', 'cso-edu-muted', it.cutoff_summary_en) : null
          ].filter(Boolean)),
          el('td', '', [
            evtBadge(it.declaration_type, it.declaration_type),
            el('div', 'cso-edu-mono', `${it.shortlisted_candidates_count || 0} shortlisted`)
          ]),
          el('td', '', [
            el('div', '', it.dv_venue_odisha || '—'),
            el('div', 'cso-edu-mono', dvDates)
          ]),
          el('td', '', evtBadge(it.status, it.status)),
          el('td', 'cso-edu-row-actions', [
            btn('Edit', 'cso-edu-btn-sm', () => openResultDrawer(it)),
            btn('Archive', 'cso-edu-btn-sm', async () => {
              try {
                await api(`${API}/results-dv/${encodeURIComponent(it.id)}`, 'DELETE');
                toast('Result / DV roster archived', 'success');
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

    function openResultDrawer(item) {
      const isEdit = Boolean(item);
      const codeIn = textInput('text', item ? item.roster_code : '', 'RES-2026-0003 (auto if blank)');
      if (isEdit) codeIn.disabled = true;
      const bodySel = selectOf([
        ['OPSC', 'OPSC'], ['OSSC', 'OSSC'], ['OSSSC', 'OSSSC'],
        ['NTA_UGC_NET', 'NTA_UGC_NET'], ['OTET_OSSTET', 'OTET_OSSTET'],
        ['RRC_BBS', 'RRC_BBS'], ['OTHER', 'OTHER']
      ], item ? item.commission_body : 'OSSC');
      const nameEn = textInput('text', item ? item.exam_name_en : '', 'Exam / Result title (EN)');
      const nameOr = textInput('text', item ? item.exam_name_or : '', 'ଓଡ଼ିଆ ଶୀର୍ଷକ');
      const advtIn = textInput('text', item ? item.advt_number : '', 'Advt. No.');
      const typeSel = selectOf([
        ['prelims_shortlist', 'prelims_shortlist'], ['written_result', 'written_result'],
        ['dv_biometric_schedule', 'dv_biometric_schedule'], ['final_merit_list', 'final_merit_list'],
        ['supplementary_list', 'supplementary_list']
      ], item ? item.declaration_type : 'prelims_shortlist');
      const declIn = textInput('text', item ? item.declared_at_ist : '2026-11-17T18:00:00+05:30', 'YYYY-MM-DDTHH:mm:ss+05:30');
      const dvStartIn = textInput('date', item ? item.dv_start_date_ist : '2026-11-26');
      const dvEndIn = textInput('date', item ? item.dv_end_date_ist : '2026-12-03');
      const venueIn = textInput('text', item ? item.dv_venue_odisha : 'OSSC Campus, Unit-II, Bhubaneswar', 'DV Venue in Odisha');
      const countIn = textInput('number', item ? String(item.shortlisted_candidates_count ?? 0) : '500', 'Shortlisted candidates count');
      const rangeIn = textInput('text', item ? item.roll_range_summary : 'Roll 2600101 – 2608450 (District-wise Roster)', 'Privacy-safe roll range summary');
      const cutEn = textareaOf(item ? item.cutoff_summary_en : '', 'Cutoff summary (EN)');
      const cutOr = textareaOf(item ? item.cutoff_summary_or : '', 'କଟ-ଅଫ୍ ସୂଚନା (ଓଡ଼ିଆ)');
      const pdfIn = textInput('url', item ? item.result_pdf_url : '', 'https://www.ossc.gov.in/result.pdf');
      const statusSel = selectOf([
        ['published_live', 'published_live'], ['dv_ongoing', 'dv_ongoing'], ['completed', 'completed']
      ], item ? item.status : 'published_live');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Result / DV · ${item.roster_code}` : 'Publish Result / DV Roster', [
        field('Roster Code', codeIn),
        field('Commission Body', bodySel),
        field('Exam Name (EN)', nameEn),
        field('Exam Name (Odia)', nameOr),
        field('Advertisement Number', advtIn),
        field('Declaration Type', typeSel),
        field('Declared At (IST)', declIn),
        field('DV Start Date (IST)', dvStartIn),
        field('DV End Date (IST)', dvEndIn),
        field('DV Venue (Odisha)', venueIn),
        field('Shortlisted Candidates Count', countIn),
        field('Roll Range Summary (Privacy-Safe)', rangeIn),
        field('Cutoff Summary (EN)', cutEn),
        field('Cutoff Summary (Odia)', cutOr),
        field('Result / Roster PDF URL', pdfIn),
        field('Status', statusSel)
      ]);
      if (isEdit) attachRevisions(body, '06', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Roster' : 'Publish Roster', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            roster_code: codeIn.value.trim() || undefined,
            commission_body: bodySel.value,
            exam_name_en: nameEn.value.trim(),
            exam_name_or: nameOr.value.trim(),
            advt_number: advtIn.value.trim(),
            declaration_type: typeSel.value,
            declared_at_ist: declIn.value.trim(),
            dv_start_date_ist: dvStartIn.value,
            dv_end_date_ist: dvEndIn.value || dvStartIn.value,
            dv_venue_odisha: venueIn.value.trim(),
            shortlisted_candidates_count: parseInt(countIn.value || '0', 10) || 0,
            roll_range_summary: rangeIn.value.trim(),
            cutoff_summary_en: cutEn.value.trim(),
            cutoff_summary_or: cutOr.value.trim(),
            result_pdf_url: pdfIn.value.trim(),
            status: statusSel.value
          };
          if (isEdit) await api(`${API}/results-dv/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/results-dv`, 'POST', payload);
          toast('Result / DV roster saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  window.CSOEventsBatch2 = {
    async render(moduleId, root) {
      if (!MODULES[moduleId] || !root) return false;
      root.className = 'cso-edu-shell';
      if (moduleId === 'module-es-004') await renderAdmitCards(root);
      else if (moduleId === 'module-es-005') await renderAnswerKeys(root);
      else if (moduleId === 'module-es-006') await renderResultsDv(root);
      return true;
    }
  };
})();
