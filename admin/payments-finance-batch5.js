/* Payments & Finance Batch 5 (17-18) Content Command Workspace — Strict CSP: no inline scripts/styles */
(() => {
  'use strict';

  const API = '/api/admin/finance';
  const MODULES = {
    'module-08-017': { num: '17', ep: 'webhooks', title: 'Payment Webhooks' },
    'module-08-018': { num: '18', ep: 'fraud', title: 'Fraud & Risk Events' }
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
  function inr(paise) {
    return '₹' + (Number(paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    if (method && method !== 'GET') { headers['X-CSO-CSRF'] = '1'; headers['Content-Type'] = 'application/json'; }
    const res = await fetch(path, { method: method || 'GET', credentials: 'same-origin', headers, body: body === undefined ? undefined : JSON.stringify(body) });
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
    i.type = type;
    if (placeholder) i.placeholder = placeholder;
    if (value !== undefined && value !== null) i.value = value;
    return i;
  }
  function selectOf(options, value) {
    const s = el('select', 'cso-edu-select cso-edu-input-full');
    options.forEach(([v, l]) => { const o = el('option', '', l); o.value = v; s.appendChild(o); });
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
      if (!r.items.length) { hist.appendChild(el('div', 'cso-edu-empty', 'No revisions yet.')); return; }
      r.items.slice(0, 8).forEach(rev => {
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
    }).catch(e => hist.appendChild(el('div', 'cso-edu-empty', e.message)));
  }

  function render(moduleId, root, actions) {
    const meta = MODULES[moduleId];
    if (!meta || !root) return false;

    const wrap = el('div', 'cso-edu-wrap');
    const kpis = el('div', 'cso-edu-kpis');
    const toolbar = el('div', 'cso-edu-toolbar');
    const tabsWrap = el('div', 'cso-edu-tabs');
    const filters = el('div', 'cso-edu-filters');
    const content = el('div', 'cso-edu-table-wrap');
    toolbar.append(tabsWrap, filters);
    wrap.append(kpis, toolbar, content);
    root.replaceChildren(wrap);

    async function loadKpis() {
      try {
        const o = await api(`${API}/overview`);
        const s18 = o.suite_18 || {};
        kpis.replaceChildren();
        [
          ['18-Module Suite', `${s18.total_modules || 18} active`],
          ['Webhook Delivery', `${o.webhook_delivery_success_pct ?? 100}%`],
          ['Open Fraud Alerts', o.open_fraud_alerts_count ?? 0],
          ['Gross Revenue', inr(o.gross_revenue_paise)]
        ].forEach(([l, v]) => {
          const c = el('div', 'cso-edu-kpi');
          c.append(el('div', 'cso-edu-kpi-lbl', l), el('div', 'cso-edu-kpi-val', v));
          kpis.appendChild(c);
        });
      } catch (e) {
        kpis.replaceChildren(el('div', 'cso-edu-empty', e.message));
      }
    }

    if (meta.num === '17') renderWebhooks(actions, tabsWrap, filters, content, loadKpis);
    else if (meta.num === '18') renderFraud(actions, tabsWrap, filters, content, loadKpis);

    loadKpis();
    return true;
  }

  // ---------- Module 17: Payment Webhooks ----------
  function renderWebhooks(actions, tabsWrap, filters, content, loadKpis) {
    let statusFilter = '';
    let gwFilter = '';
    const gwSel = selectOf([['', 'All Gateways'], ['razorpay', 'Razorpay'], ['phonepe_upi', 'PhonePe UPI'], ['cashfree', 'Cashfree'], ['stripe', 'Stripe']], '');
    gwSel.addEventListener('change', () => { gwFilter = gwSel.value; load(); });

    if (actions) {
      actions.replaceChildren(btn('Simulate Webhook', 'cso-edu-btn--primary', openSimulateModal));
    }
    function drawTabs() {
      tabsWrap.replaceChildren();
      [['', 'All'], ['processed', 'Processed'], ['failed_signature', 'Failed Signature'], ['retry_queued', 'Retry Queued'], ['replayed', 'Replayed']].forEach(([s, l]) => {
        const b = el('button', `cso-edu-tab${s === statusFilter ? ' is-active' : ''}`, l);
        b.type = 'button';
        b.addEventListener('click', () => { statusFilter = s; load(); });
        tabsWrap.appendChild(b);
      });
    }
    async function load() {
      drawTabs();
      filters.replaceChildren(gwSel);
      content.replaceChildren(el('div', 'cso-edu-empty', 'Loading webhook events...'));
      try {
        const p = new URLSearchParams();
        if (statusFilter) p.set('processing_status', statusFilter);
        if (gwFilter) p.set('gateway_key', gwFilter);
        const d = await api(`${API}/webhooks?${p}`);
        content.replaceChildren();
        if (!d.items.length) { content.appendChild(el('div', 'cso-edu-empty', 'No webhook events match.')); return; }
        const tbl = el('table', 'cso-edu-table');
        const thead = el('thead', '', el('tr', '', [
          el('th', '', 'Event UID / Gateway'), el('th', '', 'Type & Order'), el('th', '', 'Signature'),
          el('th', '', 'Amount'), el('th', '', 'Status / Replays'), el('th', '', 'Actions')
        ]));
        const tbody = el('tbody');
        d.items.forEach(w => {
          const acts = el('div', 'cso-edu-actions');
          acts.append(
            btn('Inspect Payload', '', () => openPayloadModal(w)),
            btn('Replay Event', 'cso-edu-btn--primary', async () => {
              try {
                await api(`${API}/webhooks/${w.id}/replay`, 'POST', {});
                toast(`Replayed ${w.event_uid}`, 'success');
                load();
              } catch (e) { toast(e.message, 'error'); }
            })
          );
          const tone = w.processing_status === 'processed' || w.processing_status === 'replayed' ? 'ok' : w.processing_status === 'failed_signature' ? 'warn' : 'draft';
          tbody.appendChild(el('tr', '', [
            el('td', '', [el('strong', '', w.event_uid), el('div', 'cso-fin-meta', `${w.gateway_key} · HTTP ${w.http_status_returned}`)]),
            el('td', '', [el('div', '', w.event_type), el('div', 'cso-fin-meta', `${w.linked_order_number || '—'} · ${w.linked_txn_reference || '—'}`)]),
            el('td', '', el('span', `cso-edu-badge cso-edu-badge--${w.signature_verified ? 'ok' : 'warn'}`, w.signature_verified ? 'Verified' : 'Invalid Sig')),
            el('td', 'cso-fin-amt', inr(w.amount_paise)),
            el('td', '', [el('span', `cso-edu-badge cso-edu-badge--${tone}`, w.processing_status), el('div', 'cso-fin-meta', `Replays: ${w.replay_count}`)]),
            el('td', '', acts)
          ]));
        });
        tbl.append(thead, tbody);
        content.appendChild(tbl);
      } catch (e) { content.replaceChildren(el('div', 'cso-edu-empty', e.message)); }
      loadKpis();
    }

    function openPayloadModal(w) {
      const pre = el('textarea', 'cso-edu-textarea-full');
      pre.readOnly = true;
      pre.rows = 12;
      pre.value = JSON.stringify(w.sanitized_payload || {}, null, 2);
      const d = openDrawer(`Webhook Payload — ${w.event_uid}`, [
        el('div', 'cso-fin-meta', w.error_message ? `Error: ${w.error_message}` : `Processed at: ${w.processed_at || 'Pending'}`),
        pre
      ]);
      d.foot.appendChild(btn('Close', '', () => d.backdrop.remove()));
    }

    function openSimulateModal() {
      const gwIn = selectOf([['razorpay', 'Razorpay'], ['phonepe_upi', 'PhonePe UPI'], ['cashfree', 'Cashfree'], ['stripe', 'Stripe']], 'razorpay');
      const evIn = selectOf([['payment.captured', 'payment.captured'], ['order.paid', 'order.paid'], ['payment.failed', 'payment.failed'], ['refund.processed', 'refund.processed']], 'payment.captured');
      const ordIn = textInput('text', 'CSO-ORD-2026-0001', 'Order Number');
      const amtIn = textInput('number', '499.00', 'Amount (₹)');
      const sigChk = el('input'); sigChk.type = 'checkbox'; sigChk.checked = true;
      const d = openDrawer('Simulate Webhook Delivery', [
        field('Gateway', gwIn),
        field('Event Type', evIn),
        field('Order Number', ordIn),
        field('Amount (₹)', amtIn),
        el('label', 'cso-edu-toggle-row', [sigChk, document.createTextNode(' Valid HMAC signature')])
      ]);
      d.foot.appendChild(btn('Send Test Webhook', 'cso-edu-btn--primary', async () => {
        try {
          await api(`${API}/webhooks/simulate`, 'POST', {
            gateway_key: gwIn.value,
            event_type: evIn.value,
            linked_order_number: ordIn.value.trim(),
            amount_paise: Math.round(Number(amtIn.value || 0) * 100),
            simulate_valid_signature: sigChk.checked
          });
          d.backdrop.remove();
          toast('Webhook simulated', 'success');
          load();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }
    load();
  }

  // ---------- Module 18: Fraud & Risk Events ----------
  function renderFraud(actions, tabsWrap, filters, content, loadKpis) {
    let resFilter = '';
    if (actions) {
      actions.replaceChildren(btn('Evaluate Risk', 'cso-edu-btn--primary', openEvaluateModal));
    }
    function drawTabs() {
      tabsWrap.replaceChildren();
      [['', 'All'], ['open', 'Open'], ['investigating', 'Investigating'], ['blocked_confirmed', 'Blocked'], ['false_positive_cleared', 'Cleared Safe']].forEach(([s, l]) => {
        const b = el('button', `cso-edu-tab${s === resFilter ? ' is-active' : ''}`, l);
        b.type = 'button';
        b.addEventListener('click', () => { resFilter = s; load(); });
        tabsWrap.appendChild(b);
      });
    }
    async function load() {
      drawTabs();
      filters.replaceChildren();
      content.replaceChildren(el('div', 'cso-edu-empty', 'Loading fraud & risk events...'));
      try {
        const d = await api(`${API}/fraud${resFilter ? `?resolution_status=${resFilter}` : ''}`);
        content.replaceChildren();

        // Alerts Table
        if (!d.items.length) {
          content.appendChild(el('div', 'cso-edu-empty', 'No fraud alerts match.'));
        } else {
          const tbl = el('table', 'cso-edu-table');
          const thead = el('thead', '', el('tr', '', [
            el('th', '', 'Alert / Rule'), el('th', '', 'Order & Customer'), el('th', '', 'Severity'),
            el('th', '', 'Risk Score (0-100)'), el('th', '', 'Amount'), el('th', '', 'Resolution'), el('th', '', 'Actions')
          ]));
          const tbody = el('tbody');
          d.items.forEach(a => {
            const prog = el('progress'); prog.max = 100; prog.value = a.risk_score;
            const sevTone = a.severity === 'critical' || a.severity === 'high' ? 'warn' : a.severity === 'medium' ? 'sched' : 'ok';
            const resTone = a.resolution_status === 'false_positive_cleared' ? 'ok' : a.resolution_status === 'blocked_confirmed' ? 'arch' : 'warn';
            const acts = el('div', 'cso-edu-actions');
            acts.append(btn('Inspect', '', () => openAlertModal(a)));
            if (a.resolution_status === 'open' || a.resolution_status === 'investigating') {
              acts.append(
                btn('Clear Safe', 'cso-edu-btn--primary', async () => {
                  try { await api(`${API}/fraud/${a.id}`, 'PATCH', { resolution_status: 'false_positive_cleared' }); toast('Marked safe', 'success'); load(); }
                  catch (e) { toast(e.message, 'error'); }
                }),
                btn('Confirm Block', 'cso-edu-btn--danger', async () => {
                  try { await api(`${API}/fraud/${a.id}`, 'PATCH', { resolution_status: 'blocked_confirmed' }); toast('Block confirmed', 'info'); load(); }
                  catch (e) { toast(e.message, 'error'); }
                })
              );
            }
            tbody.appendChild(el('tr', '', [
              el('td', '', [el('strong', '', a.alert_code), el('div', 'cso-fin-meta', a.rule_triggered)]),
              el('td', '', [el('div', '', a.order_number || '—'), el('div', 'cso-fin-meta', `${a.customer_email || '—'} · ${a.ip_hash_masked || ''}`)]),
              el('td', '', el('span', `cso-edu-badge cso-edu-badge--${sevTone}`, a.severity)),
              el('td', '', [el('div', 'cso-fin-meta', `${a.risk_score} / 100`), prog]),
              el('td', 'cso-fin-amt', inr(a.amount_paise)),
              el('td', '', el('span', `cso-edu-badge cso-edu-badge--${resTone}`, a.resolution_status)),
              el('td', '', acts)
            ]));
          });
          tbl.append(thead, tbody);
          content.appendChild(tbl);
        }

        // Guardrail Rules Toggle Panel
        const rulesBox = el('div', 'cso-edu-section-box');
        rulesBox.appendChild(el('div', 'cso-edu-section-title', 'Fraud Guardrail Rules'));
        (d.rules || []).forEach(r => {
          const chk = el('input'); chk.type = 'checkbox'; chk.checked = !!r.enabled;
          chk.addEventListener('change', async () => {
            try {
              await api(`${API}/fraud/rules`, 'PUT', { rule_key: r.rule_key, enabled: chk.checked });
              toast(`${r.rule_key} ${chk.checked ? 'enabled' : 'disabled'}`, 'success');
            } catch (e) { toast(e.message, 'error'); chk.checked = !chk.checked; }
          });
          rulesBox.appendChild(el('div', 'cso-fin-feed-item', [
            el('span', '', [el('strong', '', r.rule_name_en), el('div', 'cso-fin-meta', `${r.rule_key} · threshold ${r.threshold_value} / ${r.window_minutes}m · action: ${r.auto_action}`)]),
            el('label', 'cso-edu-toggle-row', [chk, document.createTextNode(' Enabled')])
          ]));
        });
        content.appendChild(rulesBox);
      } catch (e) { content.replaceChildren(el('div', 'cso-edu-empty', e.message)); }
      loadKpis();
    }

    function openAlertModal(a) {
      const notesIn = el('textarea', 'cso-edu-textarea-full'); notesIn.value = a.analyst_notes || '';
      const stSel = selectOf([['open', 'Open'], ['investigating', 'Investigating'], ['blocked_confirmed', 'Block Confirmed'], ['false_positive_cleared', 'Cleared Safe']], a.resolution_status);
      const d = openDrawer(`Alert ${a.alert_code}`, [
        el('div', 'cso-fin-meta', `Rule: ${a.rule_triggered} · Score: ${a.risk_score}/100 · Order: ${a.order_number || '—'}`),
        field('Resolution Status', stSel),
        field('Analyst Notes', notesIn)
      ]);
      d.foot.appendChild(btn('Save Resolution', 'cso-edu-btn--primary', async () => {
        try {
          await api(`${API}/fraud/${a.id}`, 'PATCH', { resolution_status: stSel.value, analyst_notes: notesIn.value.trim() });
          d.backdrop.remove();
          toast('Alert updated', 'success');
          load();
        } catch (e) { toast(e.message, 'error'); }
      }));
      attachRevisions(d.body, '18', a.id, () => { d.backdrop.remove(); load(); });
    }

    function openEvaluateModal() {
      const amtIn = textInput('number', '6500.00', 'Amount (₹)');
      const failIn = textInput('number', '3', 'Failed card attempts (15m)');
      const ipIn = textInput('number', '2', 'IP requests (15m)');
      const geoChk = el('input'); geoChk.type = 'checkbox';
      const outBox = el('div', 'cso-fin-calc-res', el('span', 'cso-fin-meta', 'Run a live risk evaluation against active guardrail rules.'));
      const d = openDrawer('Evaluate Transaction Risk', [
        field('Amount (₹)', amtIn),
        field('Failed Card Attempts (15m)', failIn),
        field('IP Requests (15m)', ipIn),
        el('label', 'cso-edu-toggle-row', [geoChk, document.createTextNode(' UPI Geo Mismatch')]),
        outBox
      ]);
      d.foot.appendChild(btn('Run Risk Evaluation', 'cso-edu-btn--primary', async () => {
        try {
          const res = await api(`${API}/fraud/evaluate`, 'POST', {
            amount_paise: Math.round(Number(amtIn.value || 0) * 100),
            failed_attempts_15m: Number(failIn.value || 0),
            ip_requests_15m: Number(ipIn.value || 1),
            geo_mismatch: geoChk.checked
          });
          outBox.replaceChildren(
            el('div', 'cso-fin-amt', `Risk Score: ${res.risk_score}/100 (${res.severity.toUpperCase()})`),
            el('div', '', `Action: ${res.action_taken} · Rule: ${res.rule_triggered}`),
            el('div', 'cso-fin-meta', (res.reasons || []).join('; ') || 'No rules triggered')
          );
          load();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }
    load();
  }

  window.CSOPaymentsFinanceBatch5 = { render, MODULES };
})();
