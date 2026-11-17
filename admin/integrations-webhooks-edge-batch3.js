/* Integrations, Webhooks & Cloudflare Edge Suite Batch 3 (09-11) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/integrations';
  const MODULES = {
    'module-int-009': { num: '09', title: 'SMS Gateway Integration & OTP Dispatch Engine' },
    'module-int-010': { num: '10', title: 'Third-Party Service Health Monitors & Ping Heartbeats' },
    'module-int-011': { num: '11', title: 'Integration Logs, Webhook Payloads & Dead-Letter Queue (DLQ)' }
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

  function intBadge(val, label) {
    const safe = String(val || 'unknown').replace(/[^a-z0-9_-]/gi, '');
    return el('span', `cso-int-badge is-${safe}`, label || val || '—');
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
      el('div', 'cso-edu-kicker', `Integrations, Webhooks & Cloudflare Edge · Module ${info.num} of 11`),
      el('h2', 'cso-edu-title', info.title),
      el('p', 'cso-edu-sub', subtitle)
    );
    const right = el('div', 'cso-edu-actions');
    (extraBtns || []).forEach(b => right.appendChild(b));
    bar.append(left, right);
    return bar;
  }

  function renderKpiStrip(ov) {
    const strip = el('div', 'cso-int-kpi-strip');
    const s = ov.suite_11 || ov;
    const cards = [
      ['Active SMS/OTP Gateways', s.active_sms_otp_gateways ?? 0],
      ['Operational Monitors', s.operational_service_monitors ?? 0],
      ['Pending DLQ Retries', s.pending_dlq_count ?? 0],
      ['Suite 01–11 Active', `${s.active_modules || 11} / ${s.total_modules || 11} Active`]
    ];
    cards.forEach(([lbl, val]) => {
      const c = el('div', 'cso-int-kpi-card');
      c.append(el('span', 'cso-int-kpi-label', lbl), el('span', 'cso-int-kpi-val', String(val)));
      strip.appendChild(c);
    });
    return strip;
  }

  /* ==================== MODULE 09: SMS GATEWAY & ZERO-PII OTP ENGINE ==================== */
  async function renderSmsGateways(root) {
    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-int-009', 'TRAI DLT SMS gateways & Zero-PII SHA-256 OTP dispatch engine (no raw OTP or mobile persisted).', [
        btn('+ Add SMS Gateway', 'cso-edu-btn-primary', () => openSmsDrawer(null))
      ]));

      const [ov, data] = await Promise.all([api(`${API}/overview`), api(`${API}/sms-otp-gateways`)]);
      root.appendChild(renderKpiStrip(ov));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code & Provider', 'Sender ID & Route', 'Delivery Rate %', 'Key Hint & Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        const prog = document.createElement('progress');
        prog.className = 'cso-int-parity-bar';
        prog.max = 100;
        prog.value = Math.min(100, Math.max(0, Number(it.delivery_rate_pct || 0)));

        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', 'cso-edu-mono', it.gateway_code), el('strong', '', it.provider_name)]),
          el('td', '', [el('span', 'cso-int-secret-badge', it.sender_id), el('div', '', intBadge(it.route_type, it.route_type))]),
          el('td', '', [prog, el('div', 'cso-edu-mono', `${it.delivery_rate_pct}% · ${it.dispatched_24h_count} sent`)]),
          el('td', '', [el('span', 'cso-int-secret-badge', it.api_key_masked_hint), el('div', '', intBadge(it.gateway_status, it.gateway_status))]),
          el('td', 'cso-edu-row-actions', [
            btn('Zero-PII OTP Simulator', 'cso-edu-btn-sm cso-edu-btn-primary', () => openOtpSimDrawer(it)),
            btn('Edit', 'cso-edu-btn-sm', () => openSmsDrawer(it))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openOtpSimDrawer(item) {
      const phoneIn = textInput('text', '9437012109', '10-digit test mobile (auto-masked)');
      const outBox = el('div', 'cso-edu-mono', 'OTP is generated in-memory and stored only as SHA-256 hash.');
      const { foot } = openDrawer(`Zero-PII OTP Dispatch Simulator · ${item.gateway_code}`, [
        field('Test Mobile Number (masked before logging)', phoneIn),
        outBox
      ]);
      foot.appendChild(btn('Simulate Hashed OTP Dispatch', 'cso-edu-btn-primary', async () => {
        try {
          const res = await api(`${API}/sms-otp-gateways/${encodeURIComponent(item.id)}/simulate-otp`, 'POST', {
            phone: phoneIn.value.trim()
          });
          outBox.textContent = `Logged ${res.log_event_uid} · phone=${res.phone_masked} · hash=${String(res.otp_hash_sha256).slice(0, 18)}…`;
          toast('Zero-PII OTP simulation logged', 'success');
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    function openSmsDrawer(item) {
      const isEdit = Boolean(item);
      const codeIn = textInput('text', item ? item.gateway_code : '', 'SMSGW-003 (auto if blank)');
      if (isEdit) codeIn.disabled = true;
      const provSel = selectOf([
        ['MSG91 India', 'MSG91 India'], ['Kaleyra Cloud', 'Kaleyra Cloud'],
        ['Gupshup Enterprise', 'Gupshup Enterprise'], ['Twilio India', 'Twilio India']
      ], item ? item.provider_name : 'MSG91 India');
      const routeSel = selectOf([['transactional_otp', 'transactional_otp'], ['service_implicit_alert', 'service_implicit_alert']], item ? item.route_type : 'transactional_otp');
      const senderIn = textInput('text', item ? item.sender_id : 'CSODSH', '6-char Sender ID');
      if (isEdit) senderIn.disabled = true;
      const dltIn = textInput('text', item ? item.default_dlt_template_id : '', 'TRAI DLT Template ID');
      const keyIn = textInput('password', '', isEdit ? 'Leave blank to keep existing key hash' : 'Provider API key (SHA-256 hashed)');
      const statusSel = selectOf([['active_primary', 'active_primary'], ['standby_failover', 'standby_failover'], ['paused', 'paused']], item ? item.gateway_status : 'standby_failover');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit SMS Gateway · ${item.gateway_code}` : 'Add SMS Gateway', [
        field('Gateway Code', codeIn),
        field('Provider', provSel),
        field('Route Type', routeSel),
        field('TRAI Sender ID (6 chars)', senderIn),
        field('DLT Template ID', dltIn),
        field('Provider API Key (SHA-256 hashed)', keyIn),
        field('Gateway Status', statusSel)
      ]);
      if (isEdit) attachRevisions(body, '09', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Gateway' : 'Create Gateway', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            gateway_code: codeIn.value.trim() || undefined,
            provider_name: provSel.value,
            route_type: routeSel.value,
            sender_id: senderIn.value.trim().toUpperCase(),
            default_dlt_template_id: dltIn.value.trim(),
            api_key: keyIn.value.trim() || undefined,
            gateway_status: statusSel.value
          };
          if (isEdit) await api(`${API}/sms-otp-gateways/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/sms-otp-gateways`, 'POST', payload);
          toast('SMS gateway saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 10: THIRD-PARTY HEALTH MONITORS ==================== */
  async function renderHealthMonitors(root) {
    let curCat = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-int-010', 'Real-time heartbeat probes, latency (ms) & 30-day uptime tracking across Cloudflare & messaging APIs.', [
        btn('Run Live Heartbeat Ping', 'cso-edu-btn-primary', async () => {
          try {
            const res = await api(`${API}/health-monitors/ping-all`, 'POST', {});
            toast(`Heartbeat ping OK (D1 probe: ${res.d1_probe_ms}ms)`, 'success');
            draw();
          } catch (e) { toast(e.message, 'error'); }
        })
      ]));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/health-monitors?service_category=${encodeURIComponent(curCat)}`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      const tabs = el('div', 'cso-edu-tabs');
      [
        ['', 'All'], ['cloudflare_edge', 'Cloudflare Edge'],
        ['messaging_api', 'Messaging API'], ['payment_gateway', 'Payment Gateway']
      ].forEach(([v, l]) => {
        tabs.appendChild(btn(l, `cso-edu-tab ${curCat === v ? 'is-active' : ''}`, () => { curCat = v; draw(); }));
      });
      root.appendChild(el('div', 'cso-edu-toolbar', [tabs]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Monitor & Service', 'Category & Endpoint', 'Latency & 30d Uptime', 'Status', 'Last Ping (IST)'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        const upPct = (Number(it.uptime_30d_pct_x100 || 0) / 100).toFixed(2);
        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', 'cso-edu-mono', it.monitor_code), el('strong', '', it.service_name)]),
          el('td', '', [el('div', 'cso-edu-muted', it.service_category), el('div', 'cso-edu-mono', it.endpoint_label)]),
          el('td', 'cso-edu-mono', `${it.latency_ms} ms · ${upPct}%`),
          el('td', '', intBadge(it.health_status, it.health_status)),
          el('td', 'cso-edu-mono', it.last_ping_at_ist || '—')
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    await draw();
  }

  /* ==================== MODULE 11: INTEGRATION LOGS & DLQ REPLAY ==================== */
  async function renderDlqLogs(root) {
    let curState = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-int-011', 'Scrubbed integration payload audit logs & one-click Dead-Letter Queue (DLQ) event replay.', []));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/dlq-logs?queue_state=${encodeURIComponent(curState)}`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      const tabs = el('div', 'cso-edu-tabs');
      [
        ['', 'All Logs'], ['dlq_failed_retryable', 'DLQ Retryable'],
        ['delivered_ok', 'Delivered OK'], ['replayed_success', 'Replayed Success']
      ].forEach(([v, l]) => {
        tabs.appendChild(btn(l, `cso-edu-tab ${curState === v ? 'is-active' : ''}`, () => { curState = v; draw(); }));
      });
      root.appendChild(el('div', 'cso-edu-toolbar', [tabs]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Event UID & Direction', 'Topic & Ref Code', 'HTTP & Attempts', 'Queue State', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', 'cso-edu-mono', it.event_uid), el('div', 'cso-edu-muted', it.direction)]),
          el('td', '', [el('strong', '', it.event_topic), el('div', 'cso-edu-mono', `${it.integration_ref_code} · ${it.endpoint_or_channel}`)]),
          el('td', 'cso-edu-mono', `HTTP ${it.http_status_code} · Try ${it.attempt_count}/${it.max_retries}`),
          el('td', '', [intBadge(it.queue_state, it.queue_state), it.error_summary ? el('div', 'cso-edu-muted', it.error_summary) : null].filter(Boolean)),
          el('td', 'cso-edu-row-actions', [
            btn('Inspect Payload', 'cso-edu-btn-sm', () => {
              let pretty = it.sanitized_payload_json || '{}';
              try { pretty = JSON.stringify(JSON.parse(pretty), null, 2); } catch {}
              const { body } = openDrawer(`Sanitized Payload · ${it.event_uid}`, [
                el('pre', 'cso-evt-ics-pre', pretty)
              ]);
              attachRevisions(body, '11', it.id, () => draw());
            }),
            it.queue_state === 'dlq_failed_retryable' ? btn('Replay DLQ Event', 'cso-edu-btn-sm cso-edu-btn-primary', async () => {
              try {
                await api(`${API}/dlq-logs/${encodeURIComponent(it.id)}/replay`, 'POST', {});
                toast(`Replayed ${it.event_uid} successfully`, 'success');
                draw();
              } catch (e) { toast(e.message, 'error'); }
            }) : null
          ].filter(Boolean))
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    await draw();
  }

  window.CSOIntegrationsBatch3 = {
    async render(moduleId, root) {
      if (!MODULES[moduleId] || !root) return false;
      root.className = 'cso-edu-shell';
      if (moduleId === 'module-int-009') await renderSmsGateways(root);
      else if (moduleId === 'module-int-010') await renderHealthMonitors(root);
      else if (moduleId === 'module-int-011') await renderDlqLogs(root);
      return true;
    }
  };
})();
