/* Communications, Alerts & Candidate Notifications Batch 1 (01-04) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/communications';
  const MODULES = {
    'module-comms-001': { num: '01', title: 'Transactional SMS Gateway & TRAI DLT Template Manager' },
    'module-comms-002': { num: '02', title: 'Multilingual Candidate Email Campaigns & HTML Authoring' },
    'module-comms-003': { num: '03', title: 'Instant Exam Admit Card & Hall Ticket Push Alerts' },
    'module-comms-004': { num: '04', title: 'Recruitment Application Deadline Countdown Broadcaster' }
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

  function statusBadge(st) {
    let cls = 'cso-urc-badge-status';
    if (st === 'approved_dlt' || st === 'sent' || st === 'dispatched_live' || st === 'active_countdown') cls += ' is-active';
    else if (st === 'pending_dlt' || st === 'draft' || st === 'scheduled' || st === 'high_priority') cls += ' is-pending';
    else if (st === 'rejected' || st === 'archived' || st === 'urgent_hall_ticket' || st === 'closed_expired') cls += ' is-danger';
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

  /* ================= MODULE 01: SMS & TRAI DLT ================= */
  async function renderSmsDlt(root) {
    const state = { status: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const ov = await api(`${API}/overview`).catch(() => ({}));
      const kpis = el('div', 'cso-edu-kpis');
      [
        ['Approved DLT Templates', ov.approved_dlt_templates || 0],
        ['Sent Email Campaigns', ov.sent_email_campaigns || 0],
        ['Live Admit Card Alerts', ov.live_admit_card_alerts || 0],
        ['Active Deadlines', ov.active_deadline_countdowns || 0]
      ].forEach(([lbl, val]) => {
        const c = el('div', 'cso-edu-kpi');
        c.append(el('div', 'cso-edu-kpi-lbl', lbl), el('div', 'cso-edu-kpi-val', String(val)));
        kpis.appendChild(c);
      });
      wrap.appendChild(kpis);

      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '01 · Transactional SMS Gateway & TRAI DLT Manager'),
        el('div', 'cso-edu-sub', 'Manage TRAI DLT-registered SMS templates, Sender IDs, {#var#} slots, and masked gateway credentials.')
      );
      const acts = el('div', 'cso-edu-actions');
      acts.append(
        btn('DLT & Segment Validator', '', openValidatorDrawer),
        btn('+ New DLT Template', 'cso-edu-btn-primary', openNewDrawer)
      );
      head.append(tb, acts);
      wrap.appendChild(head);

      const qs = new URLSearchParams();
      if (state.status) qs.set('approval_status', state.status);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/sms-dlt?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No DLT templates found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Code & Sender', 'DLT Template ID', 'Template Body & {#var#}', 'Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(s => {
        const tr = el('tr');
        const cs = el('td');
        cs.append(el('strong', '', s.template_code), el('div', 'cso-edu-sub', `${s.sender_id} · ${s.gateway_provider} (${s.lang_code.toUpperCase()})`));
        tr.appendChild(cs);
        tr.appendChild(el('td', '', s.dlt_template_id));
        const bd = el('td');
        bd.append(el('div', '', s.template_body), el('div', 'cso-edu-sub', `${s.var_count} {#var#} slot(s) · ${s.sent_count} sent`));
        tr.appendChild(bd);
        tr.appendChild(el('td', '', statusBadge(s.approval_status)));
        tr.appendChild(el('td', 'cso-edu-actions', btn('Revisions', 'cso-edu-btn-sm', () => {
          const { backdrop, body } = openDrawer(`Revisions · ${s.template_code}`, []);
          attachRevisions(body, '01', s.id, () => { backdrop.remove(); draw(); });
        })));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openValidatorDrawer() {
      const senderIn = textInput('text', 'CSODSH', '6-char uppercase');
      const dltIn = textInput('text', '1107170000000000101', '19-digit DLT Template ID');
      const langSel = selectOf([['en', 'English (GSM-7)'], ['or', 'Odia (UCS-2 Unicode)']], 'en');
      const bodyIn = textareaOf('Your CS Odisha OTP is {#var#}. Valid for 10 mins.', 'Template body...');
      const resBox = el('pre', 'cso-fin-calc-res', 'Click Validate to inspect DLT & SMS segments.');

      const { foot } = openDrawer('TRAI DLT & SMS Segment Validator', [
        field('Sender ID (6 chars)', senderIn),
        field('19-Digit DLT Template ID', dltIn),
        field('Language', langSel),
        field('Template Body', bodyIn),
        resBox
      ]);
      foot.appendChild(btn('Validate Template', 'cso-edu-btn-primary', async () => {
        try {
          const r = await api(`${API}/sms-dlt/validate`, 'POST', {
            sender_id: senderIn.value.trim(),
            dlt_template_id: dltIn.value.trim(),
            lang_code: langSel.value,
            template_body: bodyIn.value
          });
          resBox.textContent = JSON.stringify(r, null, 2);
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    function openNewDrawer() {
      const gwSel = selectOf([['msg91', 'MSG91'], ['kaleyra', 'Kaleyra'], ['fast2sms_dlt', 'Fast2SMS DLT'], ['gupshup', 'Gupshup'], ['twilio_in', 'Twilio India']], 'msg91');
      const senderIn = textInput('text', 'CSODSH', 'CSODSH');
      const dltIn = textInput('text', '', '19-digit DLT Template ID');
      const catSel = selectOf([['transactional_otp', 'Transactional OTP'], ['service_implicit', 'Service Implicit'], ['service_explicit', 'Service Explicit']], 'service_implicit');
      const langSel = selectOf([['en', 'English'], ['or', 'Odia']], 'en');
      const bodyIn = textareaOf('', 'Template body with {#var#}');
      const keyIn = textInput('password', '', 'Optional gateway API key (masked before save)');

      const { backdrop, foot } = openDrawer('New TRAI DLT Template', [
        field('Gateway Provider', gwSel),
        field('Sender ID', senderIn),
        field('19-Digit DLT Template ID', dltIn),
        field('Category', catSel),
        field('Language', langSel),
        field('Template Body', bodyIn),
        field('Gateway API Key (optional, masked)', keyIn)
      ]);
      foot.appendChild(btn('Create DLT Template', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/sms-dlt`, 'POST', {
            gateway_provider: gwSel.value,
            sender_id: senderIn.value.trim(),
            dlt_template_id: dltIn.value.trim(),
            template_category: catSel.value,
            lang_code: langSel.value,
            template_body: bodyIn.value.trim(),
            raw_api_key: keyIn.value.trim(),
            approval_status: 'approved_dlt'
          });
          toast('DLT template created', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 02: EMAIL CAMPAIGNS ================= */
  async function renderEmails(root) {
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '02 · Multilingual Candidate Email Campaigns'),
        el('div', 'cso-edu-sub', 'Structured bilingual EN/OR email blocks with safe DOM preview and instant dispatch.')
      );
      head.append(tb, btn('+ New Email Campaign', 'cso-edu-btn-primary', openNewEmailDrawer));
      wrap.appendChild(head);

      const data = await api(`${API}/emails`);
      const items = data.items || [];
      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No email campaigns found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Code & Segment', 'Subject (EN/OR)', 'Metrics', 'Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(c => {
        const tr = el('tr');
        const cs = el('td');
        cs.append(el('strong', '', c.campaign_code), el('div', 'cso-edu-sub', `${c.audience_segment} · ${c.campaign_type}`));
        tr.appendChild(cs);

        const sb = el('td');
        sb.append(el('strong', '', c.subject_en), el('div', 'cso-edu-sub', c.subject_or || c.preheader_en));
        tr.appendChild(sb);

        tr.appendChild(el('td', '', `${c.recipient_count} sent · ${c.open_rate_pct}% open`));
        tr.appendChild(el('td', '', statusBadge(c.campaign_status)));

        const act = el('td', 'cso-edu-actions');
        act.append(
          btn('Preview', 'cso-edu-btn-sm', () => openPreviewModal(c)),
          btn('Send Campaign', 'cso-edu-btn-sm cso-edu-btn-primary', async () => {
            try {
              await api(`${API}/emails/${encodeURIComponent(c.id)}/send`, 'PATCH', { recipient_count: c.recipient_count || 1200 });
              toast(`Campaign ${c.campaign_code} sent!`, 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }),
          btn('Revisions', 'cso-edu-btn-sm', () => {
            const { backdrop, body } = openDrawer(`Revisions · ${c.campaign_code}`, []);
            attachRevisions(body, '02', c.id, () => { backdrop.remove(); draw(); });
          })
        );
        tr.appendChild(act);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openPreviewModal(c) {
      const card = el('div', 'cso-urc-pubcard');
      card.append(
        el('h3', '', c.subject_en),
        el('div', 'cso-urc-pubcard-meta', `${c.subject_or || ''} · Segment: ${c.audience_segment}`)
      );
      (c.body_blocks || []).forEach(b => {
        card.appendChild(el('div', 'cso-urc-pubcard-bio', [
          el('strong', '', b.heading_en || ''),
          el('div', '', b.paragraph_en || ''),
          el('div', '', b.paragraph_or || '')
        ]));
      });
      openDrawer(`Email Preview · ${c.campaign_code}`, [card]);
    }

    function openNewEmailDrawer() {
      const typeSel = selectOf([['exam_bulletin', 'Exam Bulletin'], ['weekly_study_digest', 'Weekly Study Digest'], ['scheme_alert', 'Scheme Alert'], ['mock_test_invite', 'Mock Test Invite']], 'exam_bulletin');
      const segSel = selectOf([['all_subscribers', 'All Subscribers'], ['opsc_oas_aspirants', 'OPSC OAS Aspirants'], ['ossc_osssc_aspirants', 'OSSC / OSSSC'], ['ugc_net_scholars', 'UGC NET Scholars'], ['odia_medium_learners', 'Odia Medium Learners']], 'all_subscribers');
      const subjEnIn = textInput('text', '', 'Email subject (English)');
      const subjOrIn = textInput('text', '', 'ଇମେଲ୍ ବିଷୟ (ଓଡ଼ିଆ)');
      const headEnIn = textInput('text', '', 'Section heading (EN)');
      const paraEnIn = textareaOf('', 'Paragraph (EN)...');
      const paraOrIn = textareaOf('', 'ଓଡ଼ିଆ ଅନୁଚ୍ଛେଦ...');

      const { backdrop, foot } = openDrawer('New Multilingual Email Campaign', [
        field('Campaign Type', typeSel),
        field('Audience Segment', segSel),
        field('Subject (English)', subjEnIn),
        field('Subject (Odia)', subjOrIn),
        field('Block Heading (EN)', headEnIn),
        field('Block Paragraph (EN)', paraEnIn),
        field('Block Paragraph (OR)', paraOrIn)
      ]);
      foot.appendChild(btn('Save Draft Campaign', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/emails`, 'POST', {
            campaign_type: typeSel.value,
            audience_segment: segSel.value,
            subject_en: subjEnIn.value.trim(),
            subject_or: subjOrIn.value.trim(),
            body_blocks: [{
              heading_en: headEnIn.value.trim(),
              paragraph_en: paraEnIn.value.trim(),
              paragraph_or: paraOrIn.value.trim()
            }]
          });
          toast('Email campaign saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 03: ADMIT CARD ALERTS ================= */
  async function renderAdmitCards(root) {
    const state = { comm: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '03 · Instant Exam Admit Card & Hall Ticket Alerts'),
        el('div', 'cso-edu-sub', 'Multi-channel hall ticket push alerts across Web Push, TRAI DLT SMS, and Email.')
      );
      head.append(tb, btn('+ New Admit Card Alert', 'cso-edu-btn-primary', openNewAdmitDrawer));
      wrap.appendChild(head);

      const tabs = el('div', 'cso-urc-tabs');
      [['', 'All'], ['opsc', 'OPSC'], ['ossc', 'OSSC'], ['osssc', 'OSSSC'], ['nta_ugc_net', 'NTA UGC NET']].forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.comm === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.comm = val; draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      const qs = state.comm ? `?commission_key=${encodeURIComponent(state.comm)}` : '';
      const data = await api(`${API}/admit-cards${qs}`);
      const items = data.items || [];
      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No admit card alerts found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Alert Code', 'Exam & Channels', 'Urgency & Dispatched', 'Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(a => {
        const tr = el('tr');
        tr.appendChild(el('td', '', `${a.alert_code} (${a.commission_key.toUpperCase()})`));
        const ex = el('td');
        ex.append(el('strong', '', a.exam_title_en), el('div', 'cso-edu-sub', `Channels: ${(a.channels || []).join(', ')} · Exam: ${a.exam_date || 'TBA'}`));
        tr.appendChild(ex);
        tr.appendChild(el('td', '', `${a.urgency_level} · ${a.dispatched_count} sent`));
        tr.appendChild(el('td', '', statusBadge(a.dispatch_status)));

        const act = el('td', 'cso-edu-actions');
        act.append(
          btn('Dispatch Instant Alert', 'cso-edu-btn-sm cso-edu-btn-primary', async () => {
            try {
              await api(`${API}/admit-cards/${encodeURIComponent(a.id)}/dispatch`, 'PATCH', { batch_size: 500 });
              toast(`Dispatched ${a.alert_code} live!`, 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }),
          btn('Revisions', 'cso-edu-btn-sm', () => {
            const { backdrop, body } = openDrawer(`Revisions · ${a.alert_code}`, []);
            attachRevisions(body, '03', a.id, () => { backdrop.remove(); draw(); });
          })
        );
        tr.appendChild(act);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openNewAdmitDrawer() {
      const commSel = selectOf([['opsc', 'OPSC'], ['ossc', 'OSSC'], ['osssc', 'OSSSC'], ['nta_ugc_net', 'NTA UGC NET']], 'opsc');
      const titleEnIn = textInput('text', '', 'Exam Admit Card Title (EN)');
      const titleOrIn = textInput('text', '', 'ଓଡ଼ିଆ ଶୀର୍ଷକ');
      const dateIn = textInput('text', '2026-12-28', 'YYYY-MM-DD');
      const urlIn = textInput('text', 'https://www.opsc.gov.in', 'Official portal URL');

      const { backdrop, foot } = openDrawer('New Admit Card Push Alert', [
        field('Commission', commSel),
        field('Exam Title (EN)', titleEnIn),
        field('Exam Title (OR)', titleOrIn),
        field('Exam Date', dateIn),
        field('Download Portal URL', urlIn)
      ]);
      foot.appendChild(btn('Create Alert Draft', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/admit-cards`, 'POST', {
            commission_key: commSel.value,
            exam_title_en: titleEnIn.value.trim(),
            exam_title_or: titleOrIn.value.trim(),
            exam_date: dateIn.value.trim(),
            download_portal_url: urlIn.value.trim()
          });
          toast('Admit card alert created', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 04: DEADLINE COUNTDOWN BROADCASTER ================= */
  async function renderDeadlines(root) {
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '04 · Recruitment Application Deadline Broadcaster'),
        el('div', 'cso-edu-sub', 'Automated 7d / 3d / 24h countdown reminders for Odisha govt job applications.')
      );
      head.append(tb, btn('+ New Deadline Broadcaster', 'cso-edu-btn-primary', openNewDeadlineDrawer));
      wrap.appendChild(head);

      const data = await api(`${API}/deadlines`);
      const items = data.items || [];
      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No deadline broadcasters found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Code & Commission', 'Post & Vacancies', 'Deadline & Cadence', 'Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(d => {
        const tr = el('tr');
        tr.appendChild(el('td', '', `${d.broadcast_code} (${d.commission_key.toUpperCase()})`));
        const pc = el('td');
        pc.append(el('strong', '', d.post_title_en), el('div', 'cso-edu-sub', `${d.vacancy_count} vacancies · ${d.subscribers_notified} notified`));
        tr.appendChild(pc);
        tr.appendChild(el('td', '', `${d.application_deadline_at.slice(0, 10)} · ${d.reminder_cadence}`));
        tr.appendChild(el('td', '', statusBadge(d.broadcast_status)));

        const act = el('td', 'cso-edu-actions');
        act.append(
          btn('Trigger Countdown Blast', 'cso-edu-btn-sm cso-edu-btn-primary', async () => {
            try {
              await api(`${API}/deadlines/${encodeURIComponent(d.id)}/trigger-reminder`, 'PATCH', { batch_size: 200 });
              toast(`Triggered countdown blast for ${d.broadcast_code}`, 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }),
          btn('Revisions', 'cso-edu-btn-sm', () => {
            const { backdrop, body } = openDrawer(`Revisions · ${d.broadcast_code}`, []);
            attachRevisions(body, '04', d.id, () => { backdrop.remove(); draw(); });
          })
        );
        tr.appendChild(act);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openNewDeadlineDrawer() {
      const commSel = selectOf([['osssc', 'OSSSC'], ['ossc', 'OSSC'], ['opsc', 'OPSC']], 'osssc');
      const titleEnIn = textInput('text', '', 'Post Title (EN)');
      const vacIn = textInput('number', '500', '500');
      const ddlIn = textInput('text', '2026-12-31T23:59:00Z', 'ISO deadline');
      const cadSel = selectOf([['7d_3d_24h_final', '7d / 3d / 24h Final'], ['48h_6h_closing', '48h / 6h Closing'], ['single_final_call', 'Single Final Call']], '7d_3d_24h_final');

      const { backdrop, foot } = openDrawer('New Deadline Countdown Broadcaster', [
        field('Commission', commSel),
        field('Post Title (EN)', titleEnIn),
        field('Vacancy Count', vacIn),
        field('Application Deadline (ISO)', ddlIn),
        field('Reminder Cadence', cadSel)
      ]);
      foot.appendChild(btn('Create Broadcaster', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/deadlines`, 'POST', {
            commission_key: commSel.value,
            post_title_en: titleEnIn.value.trim(),
            vacancy_count: Number(vacIn.value || 0),
            application_deadline_at: ddlIn.value.trim(),
            reminder_cadence: cadSel.value
          });
          toast('Deadline broadcaster created', 'success');
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
    if (moduleId === 'module-comms-001') { renderSmsDlt(root); return true; }
    if (moduleId === 'module-comms-002') { renderEmails(root); return true; }
    if (moduleId === 'module-comms-003') { renderAdmitCards(root); return true; }
    if (moduleId === 'module-comms-004') { renderDeadlines(root); return true; }
    return false;
  }

  window.CSOCommunicationsBatch1 = { render: renderModule };
})();
