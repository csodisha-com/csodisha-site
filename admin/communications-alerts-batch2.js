/* Communications, Alerts & Candidate Notifications Batch 2 (05-08) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/communications';
  const MODULES = {
    'module-comms-005': { num: '05', title: 'State Welfare Scheme Sanction & Direct Benefit Alerts' },
    'module-comms-006': { num: '06', title: 'WhatsApp Notification Templates & Meta WABA Registry' },
    'module-comms-007': { num: '07', title: 'Telegram Community Broadcasting & Channel Automations' },
    'module-comms-008': { num: '08', title: 'Candidate Notification Preferences & Frequency Caps' }
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
    if (st === 'dispatched_live' || st === 'approved_meta' || st === 'posted_live' || st === 'UTILITY') cls += ' is-active';
    else if (st === 'draft' || st === 'pending_meta_review' || st === 'scheduled' || st === 'AUTHENTICATION') cls += ' is-pending';
    else if (st === 'archived' || st === 'rejected' || st === 'paused' || st === 'MARKETING') cls += ' is-danger';
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

  /* ================= MODULE 05: SCHEME DBT ALERTS ================= */
  async function renderSchemeAlerts(root) {
    const state = { scheme: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '05 · State Welfare Scheme & DBT Alerts'),
        el('div', 'cso-edu-sub', 'Bilingual EN/OR alerts for Subhadra Yojana, CM-Kisan, Post-Matric Scholarship & BSKY.')
      );
      head.append(tb, btn('+ New Scheme DBT Alert', 'cso-edu-btn-primary', openNewDrawer));
      wrap.appendChild(head);

      const tabs = el('div', 'cso-urc-tabs');
      [
        ['', 'All Schemes'],
        ['subhadra_yojana', 'Subhadra'],
        ['cm_kisan_kalia', 'CM-Kisan'],
        ['post_matric_scholarship_odisha', 'Post-Matric Scholarship'],
        ['biju_swasthya_kalyan', 'BSKY']
      ].forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.scheme === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.scheme = val; draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      const qs = state.scheme ? `?scheme_key=${encodeURIComponent(state.scheme)}` : '';
      const data = await api(`${API}/scheme-alerts${qs}`);
      const items = data.items || [];
      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No scheme DBT alerts found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Alert Code', 'Scheme & Stage', 'Message (EN/OR)', 'Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(s => {
        const tr = el('tr');
        tr.appendChild(el('td', '', s.alert_code));
        const sc = el('td');
        sc.append(el('strong', '', s.scheme_name_en), el('div', 'cso-edu-sub', `${s.alert_stage} · ${s.dispatched_count} sent`));
        tr.appendChild(sc);

        const mc = el('td');
        mc.append(el('div', '', s.message_en), s.message_or ? el('div', 'cso-edu-sub', s.message_or) : el('div', '', ''));
        tr.appendChild(mc);
        tr.appendChild(el('td', '', statusBadge(s.alert_status)));

        const act = el('td', 'cso-edu-actions');
        act.append(
          btn('Dispatch DBT Alert', 'cso-edu-btn-sm cso-edu-btn-primary', async () => {
            try {
              await api(`${API}/scheme-alerts/${encodeURIComponent(s.id)}/dispatch`, 'PATCH', { batch_size: 500 });
              toast(`Dispatched ${s.alert_code} live!`, 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }),
          btn('Revisions', 'cso-edu-btn-sm', () => {
            const { backdrop, body } = openDrawer(`Revisions · ${s.alert_code}`, []);
            attachRevisions(body, '05', s.id, () => { backdrop.remove(); draw(); });
          })
        );
        tr.appendChild(act);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openNewDrawer() {
      const schSel = selectOf([
        ['subhadra_yojana', 'Subhadra Yojana'],
        ['cm_kisan_kalia', 'CM-Kisan / KALIA'],
        ['post_matric_scholarship_odisha', 'Post-Matric Scholarship'],
        ['biju_swasthya_kalyan', 'BSKY']
      ], 'subhadra_yojana');
      const nameIn = textInput('text', 'Subhadra Yojana Odisha', 'Scheme Name (EN)');
      const stageSel = selectOf([
        ['dbt_installment_credited', 'DBT Installment Credited'],
        ['ekyc_npci_seeding_reminder', 'e-KYC / NPCI Seeding Reminder'],
        ['sanction_list_released', 'Sanction List Released'],
        ['application_window_open', 'Application Window Open']
      ], 'dbt_installment_credited');
      const msgEnIn = textareaOf('', 'Message (English)...');
      const msgOrIn = textareaOf('', 'ଓଡ଼ିଆ ସନ୍ଦେଶ...');

      const { backdrop, foot } = openDrawer('New Scheme DBT Alert', [
        field('Scheme Key', schSel),
        field('Scheme Name (EN)', nameIn),
        field('Alert Stage', stageSel),
        field('Message (English)', msgEnIn),
        field('Message (Odia)', msgOrIn)
      ]);
      foot.appendChild(btn('Save Alert Draft', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/scheme-alerts`, 'POST', {
            scheme_key: schSel.value,
            scheme_name_en: nameIn.value.trim(),
            alert_stage: stageSel.value,
            message_en: msgEnIn.value.trim(),
            message_or: msgOrIn.value.trim()
          });
          toast('Scheme DBT alert created', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 06: WHATSAPP WABA REGISTRY ================= */
  async function renderWhatsapp(root) {
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '06 · WhatsApp Notification Templates & Meta WABA'),
        el('div', 'cso-edu-sub', 'Meta WABA template registry with sequential {{1}}..{{N}} validator & masked access tokens.')
      );
      const acts = el('div', 'cso-edu-actions');
      acts.append(
        btn('Meta Variable Validator', '', openValidatorDrawer),
        btn('+ New WABA Template', 'cso-edu-btn-primary', openNewDrawer)
      );
      head.append(tb, acts);
      wrap.appendChild(head);

      const data = await api(`${API}/whatsapp`);
      const items = data.items || [];
      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No WABA templates found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Template & Category', 'Body & CTA', 'Review Status', 'Delivered', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(w => {
        const tr = el('tr');
        const tc = el('td');
        tc.append(el('strong', '', w.waba_template_name), el('div', '', statusBadge(w.meta_category)));
        tr.appendChild(tc);

        const bc = el('td');
        bc.append(el('div', '', w.body_text), el('div', 'cso-edu-sub', `${w.lang_code.toUpperCase()} · CTA: ${w.cta_button_label || 'None'}`));
        tr.appendChild(bc);

        tr.appendChild(el('td', '', statusBadge(w.meta_review_status)));
        tr.appendChild(el('td', '', String(w.delivered_count)));

        const act = el('td', 'cso-edu-actions');
        act.append(
          btn('Preview', 'cso-edu-btn-sm', () => openPreviewModal(w)),
          btn('Revisions', 'cso-edu-btn-sm', () => {
            const { backdrop, body } = openDrawer(`Revisions · ${w.template_code}`, []);
            attachRevisions(body, '06', w.id, () => { backdrop.remove(); draw(); });
          })
        );
        tr.appendChild(act);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openPreviewModal(w) {
      const card = el('div', 'cso-urc-pubcard');
      card.append(
        el('h3', '', w.header_text || w.waba_template_name),
        el('div', 'cso-urc-pubcard-bio', w.body_text),
        el('div', 'cso-urc-pubcard-meta', `${w.footer_text || ''} · Button: ${w.cta_button_label || '—'}`)
      );
      openDrawer(`WhatsApp Preview · ${w.template_code}`, [card]);
    }

    function openValidatorDrawer() {
      const nameIn = textInput('text', 'cso_exam_admit_card_alert', 'snake_case_name');
      const catSel = selectOf([['UTILITY', 'UTILITY'], ['AUTHENTICATION', 'AUTHENTICATION'], ['MARKETING', 'MARKETING']], 'UTILITY');
      const bodyIn = textareaOf('Hello {{1}}, your Admit Card for {{2}} is ready.', 'Body with {{1}}, {{2}}...');
      const resBox = el('pre', 'cso-fin-calc-res', 'Click Validate to test Meta WABA rules.');

      const { foot } = openDrawer('Meta WABA Template & Variable Validator', [
        field('Template Name (snake_case)', nameIn),
        field('Meta Category', catSel),
        field('Body Text ({{1}}, {{2}})', bodyIn),
        resBox
      ]);
      foot.appendChild(btn('Validate WABA', 'cso-edu-btn-primary', async () => {
        try {
          const r = await api(`${API}/whatsapp/validate`, 'POST', {
            waba_template_name: nameIn.value.trim(),
            meta_category: catSel.value,
            body_text: bodyIn.value
          });
          resBox.textContent = JSON.stringify(r, null, 2);
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    function openNewDrawer() {
      const nameIn = textInput('text', '', 'e.g. cso_ossc_deadline_alert');
      const catSel = selectOf([['UTILITY', 'UTILITY'], ['AUTHENTICATION', 'AUTHENTICATION'], ['MARKETING', 'MARKETING']], 'UTILITY');
      const langSel = selectOf([['en', 'English'], ['or', 'Odia']], 'en');
      const hdrIn = textInput('text', 'CS Odisha Alert', 'Header text');
      const bodyIn = textareaOf('', 'Hello {{1}}, ...');
      const tokIn = textInput('password', '', 'Optional Meta WABA access token (masked before save)');

      const { backdrop, foot } = openDrawer('New Meta WABA Template', [
        field('Template Name (snake_case)', nameIn),
        field('Meta Category', catSel),
        field('Language', langSel),
        field('Header Text', hdrIn),
        field('Body Text ({{1}}, {{2}})', bodyIn),
        field('Meta Access Token (optional, masked)', tokIn)
      ]);
      foot.appendChild(btn('Register WABA Template', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/whatsapp`, 'POST', {
            waba_template_name: nameIn.value.trim(),
            meta_category: catSel.value,
            lang_code: langSel.value,
            header_text: hdrIn.value.trim(),
            body_text: bodyIn.value.trim(),
            raw_access_token: tokIn.value.trim(),
            meta_review_status: 'approved_meta'
          });
          toast('WABA template registered', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 07: TELEGRAM BROADCASTING ================= */
  async function renderTelegram(root) {
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '07 · Telegram Community Broadcasting'),
        el('div', 'cso-edu-sub', 'Channel automations (@csodisha_official) with pin/silent controls and masked Bot tokens.')
      );
      head.append(tb, btn('+ New Telegram Broadcast', 'cso-edu-btn-primary', openNewTgDrawer));
      wrap.appendChild(head);

      const data = await api(`${API}/telegram`);
      const items = data.items || [];
      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No Telegram broadcasts found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Post & Channel', 'Headline & Trigger', 'Reach', 'Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(t => {
        const tr = el('tr');
        const pc = el('td');
        pc.append(el('strong', '', t.post_code), el('div', 'cso-edu-sub', t.channel_handle));
        tr.appendChild(pc);

        const hc = el('td');
        hc.append(el('strong', '', t.headline_en), el('div', 'cso-edu-sub', `${t.automation_trigger}${t.pin_in_channel ? ' · PIN' : ''}`));
        tr.appendChild(hc);

        tr.appendChild(el('td', '', `${t.reach_views_count} views`));
        tr.appendChild(el('td', '', statusBadge(t.broadcast_status)));

        const act = el('td', 'cso-edu-actions');
        act.append(
          btn('Post to Telegram', 'cso-edu-btn-sm cso-edu-btn-primary', async () => {
            try {
              await api(`${API}/telegram/${encodeURIComponent(t.id)}/publish`, 'PATCH', { reach_inc: 1000 });
              toast(`Posted ${t.post_code} to ${t.channel_handle}`, 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }),
          btn('Revisions', 'cso-edu-btn-sm', () => {
            const { backdrop, body } = openDrawer(`Revisions · ${t.post_code}`, []);
            attachRevisions(body, '07', t.id, () => { backdrop.remove(); draw(); });
          })
        );
        tr.appendChild(act);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openNewTgDrawer() {
      const chanIn = textInput('text', '@csodisha_official', '@csodisha_official');
      const trigSel = selectOf([['manual_broadcast', 'Manual Broadcast'], ['auto_new_job_pdf', 'Auto Job PDF'], ['auto_pyq_upload', 'Auto PYQ Upload'], ['auto_daily_quiz', 'Auto Daily Quiz']], 'manual_broadcast');
      const headEnIn = textInput('text', '', 'Headline (EN)');
      const bodyEnIn = textareaOf('', 'Message body (EN)...');
      const pinCb = document.createElement('input');
      pinCb.type = 'checkbox';
      const tokIn = textInput('password', '', 'Optional Bot Token (masked before save)');

      const { backdrop, foot } = openDrawer('New Telegram Broadcast', [
        field('Channel Handle', chanIn),
        field('Automation Trigger', trigSel),
        field('Headline (English)', headEnIn),
        field('Message Body (English)', bodyEnIn),
        field('Pin in Channel', pinCb),
        field('Telegram Bot Token (optional, masked)', tokIn)
      ]);
      foot.appendChild(btn('Save Broadcast', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/telegram`, 'POST', {
            channel_handle: chanIn.value.trim(),
            automation_trigger: trigSel.value,
            headline_en: headEnIn.value.trim(),
            message_body_en: bodyEnIn.value.trim(),
            pin_in_channel: pinCb.checked,
            raw_bot_token: tokIn.value.trim()
          });
          toast('Telegram broadcast saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 08: FREQUENCY CAPS ================= */
  async function renderFrequencyCaps(root) {
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '08 · Candidate Notification Preferences & Frequency Caps'),
        el('div', 'cso-edu-sub', '5-channel anti-fatigue daily/weekly limits & IST quiet hours (21:30–07:30).')
      );
      head.append(tb, btn('Send Throttling Simulator', 'cso-edu-btn-primary', openSimDrawer));
      wrap.appendChild(head);

      const data = await api(`${API}/frequency-caps`);
      const items = data.items || [];

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Channel', 'Daily / Weekly Cap', 'IST Quiet Hours', 'Urgent Bypass & Mode', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(c => {
        const tr = el('tr');
        const ch = el('td');
        ch.append(el('strong', '', c.channel_label_en), el('div', 'cso-edu-sub', `${c.policy_code} · ${c.channel_key}`));
        tr.appendChild(ch);
        tr.appendChild(el('td', '', `${c.max_per_day}/day · ${c.max_per_week}/week`));
        tr.appendChild(el('td', '', `${c.quiet_hours_start} – ${c.quiet_hours_end} IST`));
        tr.appendChild(el('td', '', `${c.bypass_for_urgent_admit_cards ? 'Bypass ON' : 'Strict'} · ${c.enforcement_mode}`));
        tr.appendChild(el('td', 'cso-edu-actions', btn('Edit Policy', 'cso-edu-btn-sm', () => openEditCapDrawer(c))));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openEditCapDrawer(c) {
      const dayIn = textInput('number', String(c.max_per_day), '2');
      const wkIn = textInput('number', String(c.max_per_week), '6');
      const qsIn = textInput('text', c.quiet_hours_start, '21:30');
      const qeIn = textInput('text', c.quiet_hours_end, '07:30');
      const modeSel = selectOf([['defer_to_morning', 'Defer to Morning'], ['strict_drop', 'Strict Drop'], ['digest_rollup', 'Digest Rollup']], c.enforcement_mode);

      const { backdrop, body, foot } = openDrawer(`Edit Policy · ${c.channel_label_en}`, [
        field('Max Per Day', dayIn),
        field('Max Per Week', wkIn),
        field('Quiet Hours Start (IST)', qsIn),
        field('Quiet Hours End (IST)', qeIn),
        field('Enforcement Mode', modeSel)
      ]);
      attachRevisions(body, '08', c.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn('Save Policy', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/frequency-caps/${encodeURIComponent(c.id)}`, 'PUT', {
            max_per_day: Number(dayIn.value || 2),
            max_per_week: Number(wkIn.value || 6),
            quiet_hours_start: qsIn.value.trim(),
            quiet_hours_end: qeIn.value.trim(),
            enforcement_mode: modeSel.value
          });
          toast('Frequency cap updated', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    function openSimDrawer() {
      const chSel = selectOf([['sms_dlt', 'sms_dlt'], ['email', 'email'], ['whatsapp_waba', 'whatsapp_waba'], ['telegram', 'telegram'], ['web_push', 'web_push']], 'sms_dlt');
      const hrIn = textInput('text', '22:15', 'HH:MM IST');
      const dayIn = textInput('number', '1', '0');
      const urgCb = document.createElement('input');
      urgCb.type = 'checkbox';
      const resBox = el('pre', 'cso-fin-calc-res', 'Click Run Simulation to test throttling.');

      const { foot } = openDrawer('Send Throttling Simulator', [
        field('Channel', chSel),
        field('Current IST Time (HH:MM)', hrIn),
        field('Already Sent Today', dayIn),
        field('Urgent Admit Card Alert?', urgCb),
        resBox
      ]);
      foot.appendChild(btn('Run Simulation', 'cso-edu-btn-primary', async () => {
        try {
          const r = await api(`${API}/frequency-caps/simulate-check`, 'POST', {
            channel_key: chSel.value,
            ist_hour_str: hrIn.value.trim(),
            daily_sent: Number(dayIn.value || 0),
            is_urgent_admit_card: urgCb.checked
          });
          resBox.textContent = JSON.stringify(r, null, 2);
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  function renderModule(moduleId, root) {
    if (!MODULES[moduleId]) return false;
    root.textContent = '';
    if (moduleId === 'module-comms-005') { renderSchemeAlerts(root); return true; }
    if (moduleId === 'module-comms-006') { renderWhatsapp(root); return true; }
    if (moduleId === 'module-comms-007') { renderTelegram(root); return true; }
    if (moduleId === 'module-comms-008') { renderFrequencyCaps(root); return true; }
    return false;
  }

  window.CSOCommunicationsBatch2 = { render: renderModule };
})();
