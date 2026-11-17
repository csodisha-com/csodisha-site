/* Communications, Alerts & Candidate Notifications Batch 3 (09-12) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/communications';
  const MODULES = {
    'module-comms-009': { num: '09', title: 'DPDP Act Consent Revocation & Opt-Out Registry' },
    'module-comms-010': { num: '10', title: 'Bilingual Odia & English Variable Tag Interpolator' },
    'module-comms-011': { num: '11', title: 'Delivery Receipts, Bounces & Telecom Carrier Diagnostics' },
    'module-comms-012': { num: '12', title: 'Scheduled Alert Calendar & Notification Broadcast Queue' }
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
    if (st === 'delivered' || st === 'completed' || st === 're_consented' || st === 'normal') cls += ' is-active';
    else if (st === 'scheduled' || st === 'processing' || st === 'high' || st === 'queued' || st === 'bounced_soft') cls += ' is-pending';
    else if (st === 'active_suppressed' || st === 'bounced_hard' || st === 'dlt_scrubbed_failed' || st === 'dnd_blocked' || st === 'urgent_exam' || st === 'cancelled') cls += ' is-danger';
    return el('span', cls, st);
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
      el('div', 'cso-edu-kicker', `Communications Suite · Module ${info.num} of 12`),
      el('h2', 'cso-edu-title', info.title),
      el('p', 'cso-edu-sub', subtitle)
    );
    const right = el('div', 'cso-edu-actions');
    (extraBtns || []).forEach(b => right.appendChild(b));
    bar.append(left, right);
    return bar;
  }

  /* ==================== MODULE 09: DPDP OPT-OUT REGISTRY ==================== */
  async function renderDpdpOptouts(root) {
    let curStatus = '';
    let curQ = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-comms-009', 'DPDP Act 2023 consent revocation registry · SHA-256 contact hashes with zero raw PII.', [
        btn('Check Contact Suppression', '', openCheckDrawer),
        btn('+ Add Opt-Out Suppression', 'cso-edu-btn-primary', openAddDrawer)
      ]));

      const tabs = el('div', 'cso-edu-tabs');
      [['', 'All'], ['active_suppressed', 'Active Suppressed'], ['re_consented', 'Re-Consented']].forEach(([val, lbl]) => {
        const t = btn(lbl, `cso-edu-tab ${curStatus === val ? 'is-active' : ''}`, () => { curStatus = val; draw(); });
        tabs.appendChild(t);
      });

      const toolbar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', curQ, 'Search code or masked hint...');
      const goBtn = btn('Search', '', () => { curQ = qIn.value.trim(); draw(); });
      const badge = el('span', 'cso-urc-badge-status is-active', 'SHA-256 Hashed · Zero Raw PII');
      toolbar.append(tabs, qIn, goBtn, badge);
      root.appendChild(toolbar);

      const qs = new URLSearchParams();
      if (curStatus) qs.set('suppression_status', curStatus);
      if (curQ) qs.set('q', curQ);
      const data = await api(`${API}/dpdp-optouts?${qs.toString()}`);
      const items = data.items || [];

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead', '');
      thead.appendChild(el('tr', '', ['Code', 'Masked Hint', 'SHA-256 Prefix', 'Channel Scope', 'Source', 'Status', 'Actions'].map(h => el('th', '', h))));
      tbl.appendChild(thead);
      const tbody = el('tbody', '');
      items.forEach(item => {
        const tr = el('tr', '');
        const toggleLbl = item.suppression_status === 'active_suppressed' ? 'Record Re-Consent' : 'Re-Suppress';
        const nextSt = item.suppression_status === 'active_suppressed' ? 're_consented' : 'active_suppressed';
        const actTd = el('td', 'cso-edu-row-actions', [
          btn(toggleLbl, 'cso-edu-btn-sm', async () => {
            try {
              await api(`${API}/dpdp-optouts/${encodeURIComponent(item.id)}`, 'PATCH', { suppression_status: nextSt });
              toast(`Updated to ${nextSt}`, 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }),
          btn('Revisions', 'cso-edu-btn-sm', () => openRevDrawer('09', item.id, item.suppression_code))
        ]);
        tr.append(
          el('td', '', item.suppression_code),
          el('td', '', item.contact_masked_hint),
          el('td', 'cso-edu-mono', `${String(item.contact_hash_sha256 || '').slice(0, 14)}…`),
          el('td', '', item.channel_scope),
          el('td', '', item.revocation_source),
          el('td', '', statusBadge(item.suppression_status)),
          actTd
        );
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openRevDrawer(mod, id, title) {
      const { backdrop, body } = openDrawer(`Revisions · ${title}`, []);
      attachRevisions(body, mod, id, () => { backdrop.remove(); draw(); });
    }

    function openAddDrawer() {
      const contactIn = textInput('text', '', '9861001234 or candidate@gmail.com');
      const scopeSel = selectOf([
        ['all_channels', 'all_channels'], ['sms_dlt', 'sms_dlt'], ['email', 'email'],
        ['whatsapp_waba', 'whatsapp_waba'], ['telegram', 'telegram'], ['web_push', 'web_push']
      ], 'all_channels');
      const srcSel = selectOf([
        ['admin_compliance_entry', 'admin_compliance_entry'],
        ['candidate_self_portal', 'candidate_self_portal'],
        ['sms_stop_keyword', 'sms_stop_keyword'],
        ['email_unsubscribe_link', 'email_unsubscribe_link'],
        ['whatsapp_stop_reply', 'whatsapp_stop_reply'],
        ['dpdp_erasure_request', 'dpdp_erasure_request']
      ], 'admin_compliance_entry');
      const noteIn = textareaOf('', 'Reason for DPDP consent revocation...');

      const { backdrop, foot } = openDrawer('Add DPDP Opt-Out Suppression', [
        field('Phone or Email (Hashed immediately via SHA-256)', contactIn),
        field('Channel Scope', scopeSel),
        field('Revocation Source', srcSel),
        field('Compliance Note', noteIn)
      ]);
      foot.appendChild(btn('Hash & Suppress', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/dpdp-optouts/suppress`, 'POST', {
            contact: contactIn.value.trim(),
            channel_scope: scopeSel.value,
            revocation_source: srcSel.value,
            reason_note: noteIn.value.trim()
          });
          toast('Contact hashed & suppressed', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    function openCheckDrawer() {
      const contactIn = textInput('text', '9861004321', 'Phone or Email to verify');
      const chSel = selectOf([
        ['sms_dlt', 'sms_dlt'], ['email', 'email'], ['whatsapp_waba', 'whatsapp_waba'],
        ['telegram', 'telegram'], ['web_push', 'web_push']
      ], 'sms_dlt');
      const resBox = el('pre', 'cso-fin-calc-res', 'Enter contact and click Check Suppression.');
      const { foot } = openDrawer('Check Contact Suppression', [
        field('Contact (Phone or Email)', contactIn),
        field('Target Channel', chSel),
        resBox
      ]);
      foot.appendChild(btn('Check Suppression', 'cso-edu-btn-primary', async () => {
        try {
          const r = await api(`${API}/dpdp-optouts/check`, 'POST', {
            contact: contactIn.value.trim(),
            channel_key: chSel.value
          });
          resBox.textContent = JSON.stringify(r, null, 2);
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 10: BILINGUAL VARIABLE TAG INTERPOLATOR ==================== */
  async function renderVariableTags(root) {
    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-comms-010', 'Bilingual English & Odia (ଓଡ଼ିଆ) variable tag dictionary and live template interpolator.', [
        btn('Live EN + ଓଡ଼ିଆ Interpolator', '', openInterpolatorDrawer),
        btn('+ Add Variable Tag', 'cso-edu-btn-primary', () => openTagDrawer(null))
      ]));

      const data = await api(`${API}/variable-tags`);
      const items = data.items || [];
      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead', '');
      thead.appendChild(el('tr', '', ['Placeholder', 'DLT Slot', 'Category', 'Fallback EN', 'Fallback ଓଡ଼ିଆ', 'Sample EN / OR', 'Actions'].map(h => el('th', '', h))));
      tbl.appendChild(thead);
      const tbody = el('tbody', '');
      items.forEach(t => {
        const tr = el('tr', '');
        tr.append(
          el('td', 'cso-edu-mono', t.placeholder_syntax),
          el('td', 'cso-edu-mono', t.dlt_slot_mapping),
          el('td', '', t.category_group),
          el('td', '', t.fallback_en),
          el('td', '', t.fallback_or),
          el('td', '', `${t.sample_value_en} / ${t.sample_value_or}`),
          el('td', 'cso-edu-row-actions', [
            btn('Edit', 'cso-edu-btn-sm', () => openTagDrawer(t))
          ])
        );
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openTagDrawer(tag) {
      const isEdit = Boolean(tag);
      const keyIn = textInput('text', tag ? tag.tag_key : '', 'e.g. center_city');
      if (isEdit) keyIn.disabled = true;
      const dltIn = textInput('text', tag ? tag.dlt_slot_mapping : '{#var#}', '{#var#}');
      const catSel = selectOf([
        ['identity', 'identity'], ['exam_recruitment', 'exam_recruitment'],
        ['welfare_scheme', 'welfare_scheme'], ['security_otp', 'security_otp']
      ], tag ? tag.category_group : 'identity');
      const fbEn = textInput('text', tag ? tag.fallback_en : '', 'English fallback');
      const fbOr = textInput('text', tag ? tag.fallback_or : '', 'ଓଡ଼ିଆ fallback');
      const smEn = textInput('text', tag ? tag.sample_value_en : '', 'Sample EN');
      const smOr = textInput('text', tag ? tag.sample_value_or : '', 'Sample OR');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Tag · ${tag.placeholder_syntax}` : 'Add Variable Tag', [
        field('Tag Key (snake_case)', keyIn),
        field('TRAI DLT Slot Mapping', dltIn),
        field('Category Group', catSel),
        field('Fallback (English)', fbEn),
        field('Fallback (Odia ଓଡ଼ିଆ)', fbOr),
        field('Sample Value (English)', smEn),
        field('Sample Value (Odia ଓଡ଼ିଆ)', smOr)
      ]);
      if (isEdit) attachRevisions(body, '10', tag.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Tag' : 'Create Tag', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            tag_key: keyIn.value.trim(),
            dlt_slot_mapping: dltIn.value.trim(),
            category_group: catSel.value,
            fallback_en: fbEn.value.trim(),
            fallback_or: fbOr.value.trim(),
            sample_value_en: smEn.value.trim(),
            sample_value_or: smOr.value.trim()
          };
          if (isEdit) await api(`${API}/variable-tags/${encodeURIComponent(tag.id)}`, 'PUT', payload);
          else await api(`${API}/variable-tags`, 'POST', payload);
          toast('Variable tag saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    function openInterpolatorDrawer() {
      const enIn = textareaOf('Dear {{candidate_name}}, your {{exam_title}} admit card is live for {{district_name}} on {{admit_card_date}}.', 'English template with {{tag}}');
      const orIn = textareaOf('ପ୍ରିୟ {{candidate_name}}, ଆପଣଙ୍କର {{exam_title}} ଆଡମିଟ୍ କାର୍ଡ {{admit_card_date}} ରେ ପ୍ରକାଶିତ ହୋଇଛି।', 'ଓଡ଼ିଆ template with {{tag}}');
      const outBox = el('pre', 'cso-fin-calc-res', 'Click Render EN + ଓଡ଼ିଆ Preview.');

      const { foot } = openDrawer('Live EN + ଓଡ଼ିଆ Template Interpolator', [
        field('English Template', enIn),
        field('Odia (ଓଡ଼ିଆ) Template', orIn),
        outBox
      ]);
      foot.appendChild(btn('Render EN + ଓଡ଼ିଆ Preview', 'cso-edu-btn-primary', async () => {
        try {
          const r = await api(`${API}/variable-tags/render-preview`, 'POST', {
            template_en: enIn.value,
            template_or: orIn.value,
            use_samples: true
          });
          outBox.textContent = `EN:\n${r.rendered_en}\n\nଓଡ଼ିଆ:\n${r.rendered_or}\n\nResolved: ${(r.resolved_tags || []).join(', ')}${(r.missing_tags && r.missing_tags.length) ? `\nMissing: ${r.missing_tags.join(', ')}` : ''}`;
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 11: CARRIER DLR & BOUNCE DIAGNOSTICS ==================== */
  async function renderDlr(root) {
    let curCarrier = '';
    let curStatus = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-comms-011', 'Odisha Telecom Circle delivery receipts, DLT scrubs, MX bounces, and carrier latency diagnostics.', [
        btn('+ Ingest DLR Event', 'cso-edu-btn-primary', openIngestDrawer)
      ]));

      const tabs = el('div', 'cso-edu-tabs');
      ['', 'Reliance Jio', 'Bharti Airtel', 'BSNL Odisha', 'Gmail MX', 'Meta Cloud API'].forEach(c => {
        tabs.appendChild(btn(c || 'All Carriers', `cso-edu-tab ${curCarrier === c ? 'is-active' : ''}`, () => { curCarrier = c; draw(); }));
      });
      const stSel = selectOf([
        ['', 'All Statuses'], ['delivered', 'delivered'], ['bounced_hard', 'bounced_hard'],
        ['bounced_soft', 'bounced_soft'], ['dlt_scrubbed_failed', 'dlt_scrubbed_failed'], ['dnd_blocked', 'dnd_blocked']
      ], curStatus);
      stSel.addEventListener('change', () => { curStatus = stSel.value; draw(); });
      const toolbar = el('div', 'cso-edu-toolbar');
      toolbar.append(tabs, stSel);
      root.appendChild(toolbar);

      const qs = new URLSearchParams();
      if (curCarrier) qs.set('carrier_or_mx', curCarrier);
      if (curStatus) qs.set('delivery_status', curStatus);
      const data = await api(`${API}/dlr?${qs.toString()}`);

      const breakdownCard = el('div', 'cso-edu-card');
      breakdownCard.appendChild(el('div', 'cso-edu-label', 'Carrier / MX Delivery Rate Breakdown'));
      const bTbl = el('table', 'cso-edu-table');
      bTbl.appendChild(el('thead', '', el('tr', '', ['Carrier / MX', 'Channel', 'Total', 'Delivered', 'Avg Latency', 'Success Rate'].map(h => el('th', '', h)))));
      const bBody = el('tbody', '');
      (data.carrier_breakdown || []).forEach(r => {
        const prog = document.createElement('progress');
        prog.className = 'cso-urc-progress';
        prog.max = 100;
        prog.value = Number(r.delivery_rate_pct || 0);
        const rateTd = el('td', '', [prog, document.createTextNode(` ${r.delivery_rate_pct}%`)]);
        bBody.appendChild(el('tr', '', [
          el('td', '', r.carrier_or_mx),
          el('td', '', r.channel_key),
          el('td', '', String(r.total_count)),
          el('td', '', String(r.delivered_count)),
          el('td', '', `${r.avg_latency_ms || 0} ms`),
          rateTd
        ]));
      });
      bTbl.appendChild(bBody);
      breakdownCard.appendChild(bTbl);
      root.appendChild(breakdownCard);

      const logCard = el('div', 'cso-edu-card');
      const lTbl = el('table', 'cso-edu-table');
      lTbl.appendChild(el('thead', '', el('tr', '', ['DLR UID', 'Channel', 'Carrier / Circle', 'Template', 'Recipient', 'Status', 'Error Code', 'Latency'].map(h => el('th', '', h)))));
      const lBody = el('tbody', '');
      (data.items || []).forEach(d => {
        lBody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', d.dlr_uid),
          el('td', '', d.channel_key),
          el('td', '', `${d.carrier_or_mx} (${d.circle_region})`),
          el('td', '', d.campaign_or_template_code || '—'),
          el('td', '', d.recipient_masked_hint),
          el('td', '', statusBadge(d.delivery_status)),
          el('td', 'cso-edu-mono', d.carrier_error_code),
          el('td', '', `${d.latency_ms} ms`)
        ]));
      });
      lTbl.appendChild(lBody);
      logCard.appendChild(lTbl);
      root.appendChild(logCard);
    }

    function openIngestDrawer() {
      const chSel = selectOf([['sms_dlt', 'sms_dlt'], ['email', 'email'], ['whatsapp_waba', 'whatsapp_waba'], ['telegram', 'telegram'], ['web_push', 'web_push']], 'sms_dlt');
      const carIn = textInput('text', 'Reliance Jio', 'Carrier or MX');
      const tplIn = textInput('text', 'DLT-CSO-001', 'Campaign/Template code');
      const recIn = textInput('text', '9861009911', 'Recipient phone/email (auto-masked)');
      const stSel = selectOf([
        ['delivered', 'delivered'], ['bounced_hard', 'bounced_hard'], ['bounced_soft', 'bounced_soft'],
        ['dlt_scrubbed_failed', 'dlt_scrubbed_failed'], ['dnd_blocked', 'dnd_blocked'], ['queued', 'queued']
      ], 'delivered');
      const errIn = textInput('text', '000_DELIVERED', 'Carrier error code');
      const latIn = textInput('number', '380', 'Latency ms');

      const { backdrop, foot } = openDrawer('Ingest Carrier DLR Event', [
        field('Channel', chSel),
        field('Carrier / MX', carIn),
        field('Campaign / Template Code', tplIn),
        field('Recipient (Auto-masked)', recIn),
        field('Delivery Status', stSel),
        field('Carrier Error Code', errIn),
        field('Latency (ms)', latIn)
      ]);
      foot.appendChild(btn('Ingest DLR', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/dlr/ingest`, 'POST', {
            channel_key: chSel.value,
            carrier_or_mx: carIn.value.trim(),
            campaign_or_template_code: tplIn.value.trim(),
            recipient: recIn.value.trim(),
            delivery_status: stSel.value,
            carrier_error_code: errIn.value.trim(),
            latency_ms: Number(latIn.value || 0)
          });
          toast('DLR event ingested', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 12: SCHEDULED BROADCAST QUEUE ==================== */
  async function renderQueue(root) {
    let curStatus = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-comms-012', 'IST-scheduled notification queue with one-click DPDP-filtered execution across all channels.', [
        btn('+ Schedule Broadcast', 'cso-edu-btn-primary', openScheduleDrawer)
      ]));

      const tabs = el('div', 'cso-edu-tabs');
      [['', 'All'], ['scheduled', 'Scheduled'], ['completed', 'Completed'], ['paused', 'Paused'], ['cancelled', 'Cancelled']].forEach(([v, l]) => {
        tabs.appendChild(btn(l, `cso-edu-tab ${curStatus === v ? 'is-active' : ''}`, () => { curStatus = v; draw(); }));
      });
      const toolbar = el('div', 'cso-edu-toolbar');
      toolbar.appendChild(tabs);
      root.appendChild(toolbar);

      const qs = curStatus ? `?queue_status=${encodeURIComponent(curStatus)}` : '';
      const data = await api(`${API}/queue${qs}`);
      const items = data.items || [];

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Job Code', 'Title (EN / OR)', 'Channel & Ref', 'Scheduled (IST)', 'Priority', 'Status', 'DPDP Skipped', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      items.forEach(j => {
        const actions = [];
        if (j.queue_status === 'scheduled' || j.queue_status === 'paused') {
          actions.push(btn('Execute Now (DPDP Filtered)', 'cso-edu-btn-sm cso-edu-btn-primary', () => runAction(j.id, 'execute_now')));
        }
        if (j.queue_status === 'scheduled') {
          actions.push(btn('Pause', 'cso-edu-btn-sm', () => runAction(j.id, 'pause')));
        }
        if (j.queue_status === 'paused') {
          actions.push(btn('Resume', 'cso-edu-btn-sm', () => runAction(j.id, 'resume')));
        }
        if (j.queue_status === 'scheduled' || j.queue_status === 'paused') {
          actions.push(btn('Cancel', 'cso-edu-btn-sm', () => runAction(j.id, 'cancel')));
        }
        actions.push(btn('Revisions', 'cso-edu-btn-sm', () => openRevDrawer(j.id, j.job_code)));

        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', j.job_code),
          el('td', '', `${j.title_en}${j.title_or ? ` · ${j.title_or}` : ''}`),
          el('td', '', `${j.channel_key} (${j.source_module_code}:${j.source_ref_code || '—'})`),
          el('td', 'cso-edu-mono', j.scheduled_for_ist),
          el('td', '', statusBadge(j.priority)),
          el('td', '', statusBadge(j.queue_status)),
          el('td', '', `${j.dpdp_optouts_skipped} skipped / ${j.target_count}`),
          el('td', 'cso-edu-row-actions', actions)
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    async function runAction(id, action) {
      try {
        const res = await api(`${API}/queue/${encodeURIComponent(id)}`, 'PATCH', { action });
        toast(`Queue job ${action}: ${res.item.queue_status}`, 'success');
        draw();
      } catch (e) { toast(e.message, 'error'); }
    }

    function openRevDrawer(id, code) {
      const { backdrop, body } = openDrawer(`Revisions · ${code}`, []);
      attachRevisions(body, '12', id, () => { backdrop.remove(); draw(); });
    }

    function openScheduleDrawer() {
      const modSel = selectOf([['01', '01 SMS DLT'], ['02', '02 Email'], ['03', '03 Admit Card'], ['04', '04 Deadline'], ['05', '05 Scheme DBT'], ['06', '06 WhatsApp'], ['07', '07 Telegram']], '03');
      const refIn = textInput('text', 'ADM-2026-0001', 'Source reference code');
      const titleEnIn = textInput('text', '', 'Broadcast Title (English)');
      const titleOrIn = textInput('text', '', 'Broadcast Title (Odia)');
      const chSel = selectOf([['web_push', 'web_push'], ['sms_dlt', 'sms_dlt'], ['email', 'email'], ['whatsapp_waba', 'whatsapp_waba'], ['telegram', 'telegram']], 'web_push');
      const segIn = textInput('text', 'all_odisha_candidates', 'Audience segment');
      const cntIn = textInput('number', '1500', 'Target count');
      const schedIn = textInput('text', '2026-11-19T08:30:00+05:30', 'YYYY-MM-DDTHH:MM:SS+05:30');
      const prioSel = selectOf([['normal', 'normal'], ['high', 'high'], ['urgent_exam', 'urgent_exam']], 'high');

      const { backdrop, foot } = openDrawer('Schedule Broadcast Job', [
        field('Source Module', modSel),
        field('Source Reference Code', refIn),
        field('Title (English)', titleEnIn),
        field('Title (Odia)', titleOrIn),
        field('Channel', chSel),
        field('Audience Segment', segIn),
        field('Target Count', cntIn),
        field('Scheduled For (IST)', schedIn),
        field('Priority', prioSel)
      ]);
      foot.appendChild(btn('Enqueue Broadcast', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/queue`, 'POST', {
            source_module_code: modSel.value,
            source_ref_code: refIn.value.trim(),
            title_en: titleEnIn.value.trim(),
            title_or: titleOrIn.value.trim(),
            channel_key: chSel.value,
            audience_segment: segIn.value.trim(),
            target_count: Number(cntIn.value || 0),
            scheduled_for_ist: schedIn.value.trim(),
            priority: prioSel.value
          });
          toast('Broadcast scheduled in queue', 'success');
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
    if (moduleId === 'module-comms-009') { renderDpdpOptouts(root); return true; }
    if (moduleId === 'module-comms-010') { renderVariableTags(root); return true; }
    if (moduleId === 'module-comms-011') { renderDlr(root); return true; }
    if (moduleId === 'module-comms-012') { renderQueue(root); return true; }
    return false;
  }

  window.CSOCommunicationsBatch3 = { render: renderModule };
})();
