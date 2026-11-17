/* Payments & Finance Batch 1 (01-04) Content Command Workspace — Strict CSP: no inline scripts/styles */
(() => {
  'use strict';

  const MODULE_META = {
    'module-08-001': { num: '01', kind: 'overview', title: 'Payment Overview' },
    'module-08-002': { num: '02', kind: 'gateways', title: 'Payment Gateway Settings' },
    'module-08-003': { num: '03', kind: 'transactions', title: 'Transactions' },
    'module-08-004': { num: '04', kind: 'orders', title: 'Orders' }
  };
  const API = '/api/admin/finance';

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }
  function btn(label, cls, onClick) {
    const b = el('button', `cso-edu-btn ${cls || ''}`.trim(), label);
    b.type = 'button';
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }
  function inr(paise) {
    const v = Number(paise || 0) / 100;
    return '₹' + v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function toast(msg, kind) {
    if (typeof window.showToast === 'function') { window.showToast(msg, kind || 'info'); return; }
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = el('div', 'cso-toast', msg);
    c.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }
  async function api(path, opts = {}) {
    const headers = Object.assign({}, opts.headers || {});
    if (opts.method && opts.method !== 'GET') {
      headers['X-CSO-CSRF'] = '1';
      if (!headers['Content-Type']) headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(path, { method: opts.method || 'GET', credentials: 'same-origin', headers, body: opts.body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
    return data;
  }
  const post = (path, method, body) => api(path, { method, body: JSON.stringify(body || {}) });
  function field(labelText, input) {
    const f = el('div', 'cso-edu-field');
    f.append(el('label', 'cso-edu-label', labelText), input);
    return f;
  }
  function input(type, placeholder, value) {
    const i = el('input', 'cso-edu-input cso-edu-input-full');
    i.type = type || 'text';
    if (placeholder) i.placeholder = placeholder;
    if (value !== undefined && value !== null) i.value = value;
    return i;
  }
  function select(options, value) {
    const s = el('select', 'cso-edu-select cso-edu-input-full');
    options.forEach(([v, l]) => { const o = el('option', '', l); o.value = v; s.appendChild(o); });
    if (value !== undefined) s.value = value;
    return s;
  }
  function badge(text, tone) { return el('span', `cso-edu-badge cso-edu-badge--${tone || 'draft'}`, text); }
  const TXN_TONE = { captured: 'ok', authorized: 'sched', initiated: 'draft', failed: 'warn', refunded: 'arch' };
  const PAY_TONE = { paid: 'ok', pending: 'warn', failed: 'warn', refunded: 'arch', partially_refunded: 'arch' };

  function openDrawer(title, bodyNodes, footNodes) {
    const backdrop = el('div', 'cso-edu-drawer-backdrop');
    const drawer = el('div', 'cso-edu-drawer');
    const head = el('div', 'cso-edu-drawer-head');
    head.append(el('h3', '', title), btn('Close', '', () => backdrop.remove()));
    const body = el('div', 'cso-edu-drawer-body');
    bodyNodes.forEach(n => body.appendChild(n));
    const foot = el('div', 'cso-edu-drawer-foot');
    (footNodes || []).forEach(n => foot.appendChild(n));
    drawer.append(head, body, foot);
    backdrop.appendChild(drawer);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
    document.body.appendChild(backdrop);
    return backdrop;
  }

  function table(cols, rows) {
    const tbl = el('table', 'cso-edu-table');
    const hr = el('tr');
    cols.forEach(c => hr.appendChild(el('th', '', c)));
    const thead = el('thead'); thead.appendChild(hr);
    const tbody = el('tbody');
    rows.forEach(r => {
      const tr = el('tr');
      r.forEach(cell => {
        const td = el('td');
        if (cell instanceof Node) td.appendChild(cell); else td.textContent = cell === null || cell === undefined ? '' : String(cell);
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    tbl.append(thead, tbody);
    return tbl;
  }

  function tabs(container, items, current, onPick) {
    container.replaceChildren();
    items.forEach(([v, l]) => {
      const t = el('button', `cso-edu-tab${v === current ? ' is-active' : ''}`, l);
      t.type = 'button';
      t.addEventListener('click', () => onPick(v));
      container.appendChild(t);
    });
  }

  function kpiCards(grid, cards) {
    grid.replaceChildren();
    cards.forEach(([label, val]) => {
      const c = el('div', 'cso-edu-kpi');
      c.append(el('div', 'cso-edu-kpi-lbl', label), el('div', 'cso-edu-kpi-val', val));
      grid.appendChild(c);
    });
  }

  async function revisionBox(moduleCode, entityId, onDone) {
    const box = el('div', 'cso-edu-rev-list');
    try {
      const d = await api(`${API}/revisions?module_code=${moduleCode}&entity_id=${encodeURIComponent(entityId)}`);
      if (!d.items.length) box.appendChild(el('div', 'cso-edu-empty', 'No revisions yet.'));
      d.items.slice(0, 8).forEach(r => {
        const row = el('div', 'cso-edu-rev-item');
        row.appendChild(el('span', '', `v${r.version_num} · ${r.change_note || 'update'} · ${r.created_at}`));
        row.appendChild(btn('Rollback', '', async () => {
          try { await post(`${API}/revisions/rollback`, 'POST', { revision_id: r.id }); toast(`Rolled back to v${r.version_num}`, 'success'); onDone(); } catch (e) { toast(e.message, 'error'); }
        }));
        box.appendChild(row);
      });
    } catch (e) { box.appendChild(el('div', 'cso-edu-empty', e.message)); }
    return box;
  }

  function render(moduleId, root, actions) {
    const meta = MODULE_META[moduleId];
    if (!meta || !root) return false;
    if (actions) actions.replaceChildren();
    const wrap = el('div', 'cso-edu-wrap');
    const kpis = el('div', 'cso-edu-kpis');
    const toolbar = el('div', 'cso-edu-toolbar');
    const tabsWrap = el('div', 'cso-edu-tabs');
    const filters = el('div', 'cso-edu-filters');
    const content = el('div', 'cso-edu-table-wrap');
    toolbar.append(tabsWrap, filters);
    wrap.append(kpis, toolbar, content);
    root.replaceChildren(wrap);

    const refresh = () => (RENDERERS[meta.kind] || (() => {}))();
    const jump = id => {
      const link = document.querySelector(`[data-module-id="${id}"], [data-module="${id}"]`);
      if (link) link.click(); else toast('Open the module from the sidebar: ' + id, 'info');
    };

    async function loadKpis() {
      try {
        const o = await api(`${API}/overview`);
        kpiCards(kpis, [
          ['Gross Revenue', inr(o.gross_revenue_paise)],
          ['Net Settled', inr(o.net_settled_paise)],
          ['Pending Orders', o.pending_orders],
          ['Gateway Health', `${o.active_gateways}/${o.total_gateways} active`]
        ]);
        return o;
      } catch (e) { kpis.replaceChildren(el('div', 'cso-edu-empty', e.message)); return null; }
    }

    const RENDERERS = {
      async overview() {
        tabsWrap.replaceChildren(); filters.replaceChildren();
        const o = await loadKpis();
        content.replaceChildren();
        if (!o) return;
        const box = el('div', 'cso-edu-section-box');
        box.appendChild(el('div', 'cso-edu-section-title', `Payment Method Share · Conversion ${o.conversion_rate_pct}% · ${o.captured_count} captured / ${o.failed_count} failed`));
        const names = { upi: 'UPI', card: 'Cards', netbanking: 'NetBanking', wallet: 'Wallet', manual_bank: 'Bank Transfer' };
        if (!o.payment_method_breakdown.length) box.appendChild(el('div', 'cso-edu-empty', 'No captured payments yet.'));
        o.payment_method_breakdown.forEach(m => {
          const row = el('div', 'cso-fin-bar-row');
          const p = el('progress'); p.max = 100; p.value = m.share_pct;
          row.append(el('span', '', `${names[m.method] || m.method} (${m.count})`), p, el('span', 'cso-fin-amt', `${m.share_pct}% · ${inr(m.amount_paise)}`));
          box.appendChild(row);
        });
        const feed = el('div', 'cso-fin-feed');
        const ordBox = el('div', 'cso-edu-section-box');
        ordBox.appendChild(el('div', 'cso-edu-section-title', 'Recent Orders'));
        o.recent_orders.forEach(r => {
          const row = el('div', 'cso-fin-feed-item');
          row.append(el('span', '', `${r.order_number} · ${r.customer_name}`), badge(r.payment_status, PAY_TONE[r.payment_status]), el('span', 'cso-fin-amt', inr(r.total_paise)));
          ordBox.appendChild(row);
        });
        ordBox.appendChild(btn('Open Orders →', '', () => jump('module-08-004')));
        const txBox = el('div', 'cso-edu-section-box');
        txBox.appendChild(el('div', 'cso-edu-section-title', 'Recent Transactions'));
        o.recent_transactions.forEach(r => {
          const row = el('div', 'cso-fin-feed-item');
          row.append(el('span', '', `${r.txn_reference} · ${r.payment_method}`), badge(r.txn_status, TXN_TONE[r.txn_status]), el('span', 'cso-fin-amt', inr(r.amount_paise)));
          txBox.appendChild(row);
        });
        txBox.appendChild(btn('Open Transactions →', '', () => jump('module-08-003')));
        feed.append(ordBox, txBox);
        const gwLink = btn('Open Gateway Settings →', '', () => jump('module-08-002'));
        content.append(box, feed, gwLink);
      },

      async gateways() {
        tabsWrap.replaceChildren(); filters.replaceChildren();
        if (actions) {
          actions.replaceChildren(btn('+ Add Gateway', 'cso-edu-btn--primary', () => openGatewayEditor(null)));
        }
        await loadKpis();
        let items = [];
        try { items = (await api(`${API}/gateways`)).items; } catch (e) { content.replaceChildren(el('div', 'cso-edu-empty', e.message)); return; }
        content.replaceChildren();
        const grid = el('div', 'cso-fin-grid');
        items.forEach(g => {
          const card = el('div', `cso-fin-card${g.is_primary ? ' cso-fin-card--primary' : ''}`);
          card.append(
            el('h4', '', g.display_name_en),
            el('div', 'cso-fin-meta', `${g.provider_key} · key ${g.merchant_id_or_key_id || '—'} · secret ${g.secret_masked_hint || 'not set'}`),
            el('div', 'cso-fin-meta', `Webhook ${g.webhook_endpoint_path || '—'} · fee ${g.convenience_fee_pct}%`)
          );
          const bs = el('div', 'cso-edu-badges');
          bs.append(badge(g.environment_mode === 'live_production' ? 'Live' : 'Sandbox', g.environment_mode === 'live_production' ? 'ok' : 'sched'),
            badge(g.health_status, g.health_status === 'disabled' ? 'arch' : 'ok'), badge(g.status, g.status === 'published' ? 'pub' : 'draft'));
          if (g.is_primary) bs.appendChild(badge('Primary', 'pub'));
          const acts = el('div', 'cso-edu-actions');
          acts.append(
            btn('Test Connection', 'cso-edu-btn--primary', async () => {
              try {
                const r = await post(`${API}/gateways/ping`, 'POST', { id: g.id });
                const failed = r.checks.filter(c => !c.ok).map(c => c.check);
                toast(r.ready ? `${g.display_name_en}: ready (${r.health_status})` : `Not ready: ${failed.join(', ')}`, r.ready ? 'success' : 'error');
                refresh();
              } catch (e) { toast(e.message, 'error'); }
            }),
            btn(g.is_primary ? 'Primary ✓' : 'Make Primary', '', async () => {
              if (g.is_primary) return;
              try { await post(`${API}/gateways/${g.id}`, 'PATCH', { is_primary: true, change_note: 'Set as primary' }); refresh(); } catch (e) { toast(e.message, 'error'); }
            }),
            btn('Edit', '', () => openGatewayEditor(g)),
            btn('Archive', 'cso-edu-btn--danger', async () => {
              try { await api(`${API}/gateways/${g.id}`, { method: 'DELETE' }); refresh(); } catch (e) { toast(e.message, 'error'); }
            })
          );
          card.append(bs, acts);
          grid.appendChild(card);
        });
        content.appendChild(grid);
        content.appendChild(table(['Gateway', 'Provider', 'Mode', 'Methods', 'Health', 'Priority'],
          items.map(g => [g.display_name_en, g.provider_key, g.environment_mode, (g.supported_methods || []).join(', '), g.health_status, g.priority_order])));
      },

      async transactions() {
        const st = RENDERERS._txn || (RENDERERS._txn = { status: '', q: '' });
        if (actions) actions.replaceChildren(btn('+ Record Manual UPI/Bank Txn', 'cso-edu-btn--primary', openManualTxn));
        tabs(tabsWrap, [['', 'All'], ['captured', 'Captured'], ['authorized', 'Authorized'], ['failed', 'Failed'], ['refunded', 'Refunded']], st.status, v => { st.status = v; refresh(); });
        filters.replaceChildren();
        const q = input('search', 'Search ref, order, payer…', st.q);
        q.addEventListener('keydown', e => { if (e.key === 'Enter') { st.q = q.value.trim(); refresh(); } });
        filters.appendChild(q);
        await loadKpis();
        const p = new URLSearchParams();
        if (st.status) p.set('txn_status', st.status);
        if (st.q) p.set('q', st.q);
        try {
          const d = await api(`${API}/transactions?${p}`);
          content.replaceChildren();
          if (!d.items.length) { content.appendChild(el('div', 'cso-edu-empty', 'No transactions match.')); return; }
          content.appendChild(table(['Reference', 'Order', 'Method', 'Amount', 'Gateway Fee', 'Net Settled', 'Status', ''],
            d.items.map(t => [t.txn_reference, t.order_number || '—', `${t.payment_method} ${t.upi_vpa_or_last4 || ''}`, inr(t.amount_paise), inr(t.gateway_fee_paise), inr(t.net_settled_paise),
              badge(t.txn_status, TXN_TONE[t.txn_status]), btn('Receipt', '', () => openReceipt(t))])));
        } catch (e) { content.replaceChildren(el('div', 'cso-edu-empty', e.message)); }
      },

      async orders() {
        const st = RENDERERS._ord || (RENDERERS._ord = { status: '', q: '' });
        if (actions) actions.replaceChildren(btn('+ Create Assisted Order', 'cso-edu-btn--primary', openOrderForm));
        tabs(tabsWrap, [['', 'All'], ['paid', 'Paid'], ['pending', 'Pending'], ['failed', 'Failed'], ['refunded', 'Refunded']], st.status, v => { st.status = v; refresh(); });
        filters.replaceChildren();
        const q = input('search', 'Search order, customer…', st.q);
        q.addEventListener('keydown', e => { if (e.key === 'Enter') { st.q = q.value.trim(); refresh(); } });
        filters.appendChild(q);
        await loadKpis();
        const p = new URLSearchParams();
        if (st.status) p.set('payment_status', st.status);
        if (st.q) p.set('q', st.q);
        try {
          const d = await api(`${API}/orders?${p}`);
          content.replaceChildren();
          if (!d.items.length) { content.appendChild(el('div', 'cso-edu-empty', 'No orders match.')); return; }
          content.appendChild(table(['Order', 'Customer', 'Type', 'Total', 'Payment', 'Fulfilment', 'Actions'],
            d.items.map(o => {
              const acts = el('div', 'cso-edu-actions');
              acts.appendChild(btn('Details', '', () => openOrderDetail(o)));
              if (o.payment_status === 'paid' && o.fulfillment_status !== 'access_granted' && o.fulfillment_status !== 'cancelled') {
                acts.appendChild(btn('Grant Digital Access', 'cso-edu-btn--primary', async () => {
                  try { await post(`${API}/orders/${o.id}`, 'PATCH', { action: 'grant_access' }); toast('Digital access granted', 'success'); refresh(); } catch (e) { toast(e.message, 'error'); }
                }));
              }
              if (o.fulfillment_status === 'access_granted') {
                acts.appendChild(btn('Revoke', 'cso-edu-btn--danger', async () => {
                  try { await post(`${API}/orders/${o.id}`, 'PATCH', { action: 'revoke_access' }); refresh(); } catch (e) { toast(e.message, 'error'); }
                }));
              }
              if (o.payment_status === 'pending' && o.fulfillment_status !== 'cancelled') {
                acts.appendChild(btn('Cancel', 'cso-edu-btn--danger', async () => {
                  try { await api(`${API}/orders/${o.id}`, { method: 'DELETE' }); refresh(); } catch (e) { toast(e.message, 'error'); }
                }));
              }
              return [o.order_number, `${o.customer_name} (${o.customer_phone || o.customer_email || '—'})`, o.order_type, inr(o.total_paise),
                badge(o.payment_status, PAY_TONE[o.payment_status]), badge(o.fulfillment_status, o.fulfillment_status === 'access_granted' ? 'ok' : 'draft'), acts];
            })));
        } catch (e) { content.replaceChildren(el('div', 'cso-edu-empty', e.message)); }
      }
    };

    function openGatewayEditor(g) {
      const provider = select([['razorpay', 'Razorpay'], ['cashfree', 'Cashfree'], ['phonepe_upi', 'PhonePe UPI'], ['paytm_business', 'Paytm Business'], ['stripe', 'Stripe'], ['manual_upi_qr', 'Manual UPI QR']], g ? g.provider_key : 'razorpay');
      const name = input('text', 'Display name', g ? g.display_name_en : '');
      const nameOr = input('text', 'Odia name', g ? g.display_name_or : '');
      const mode = select([['test_sandbox', 'Sandbox / Test'], ['live_production', 'Live / Production']], g ? g.environment_mode : 'test_sandbox');
      const key = input('text', 'Key ID / Merchant ID', g ? g.merchant_id_or_key_id : '');
      const secret = input('password', g && g.secret_masked_hint ? `Current: ${g.secret_masked_hint} (leave blank to keep)` : 'Secret key (write-only)', '');
      secret.autocomplete = 'off';
      const hook = input('text', '/api/webhooks/…', g ? g.webhook_endpoint_path : '');
      const fee = input('number', '0', g ? g.convenience_fee_pct : 0);
      const prio = input('number', '100', g ? g.priority_order : 100);
      const status = select([['draft', 'Draft'], ['published', 'Published'], ['archived', 'Archived']], g ? g.status : 'draft');
      const primary = el('input'); primary.type = 'checkbox'; primary.checked = !!(g && g.is_primary);
      const prow = el('label', 'cso-edu-toggle-row'); prow.append(primary, document.createTextNode(' Primary gateway'));
      const body = [field('Provider', provider), field('Display name', name), field('Odia name', nameOr), field('Environment', mode), field('Key ID / Merchant ID', key),
        field('Secret key (stored masked only)', secret), field('Webhook path', hook), field('Convenience fee %', fee), field('Priority', prio), field('Status', status), prow];
      const foot = [];
      const dr = openDrawer(g ? `Edit ${g.display_name_en}` : 'Add Gateway', body, foot);
      foot.push(btn('Save Gateway', 'cso-edu-btn--primary', async () => {
        const payload = { provider_key: provider.value, display_name_en: name.value, display_name_or: nameOr.value, environment_mode: mode.value,
          merchant_id_or_key_id: key.value, webhook_endpoint_path: hook.value, convenience_fee_pct: Number(fee.value || 0), priority_order: Number(prio.value || 100),
          status: status.value, is_primary: primary.checked };
        if (secret.value.trim()) payload.secret_key = secret.value.trim();
        try {
          if (g) await post(`${API}/gateways/${g.id}`, 'PATCH', payload); else await post(`${API}/gateways`, 'POST', payload);
          secret.value = '';
          dr.remove(); toast('Gateway saved', 'success'); refresh();
        } catch (e) { toast(e.message, 'error'); }
      }));
      dr.querySelector('.cso-edu-drawer-foot').appendChild(foot[0]);
      if (g) revisionBox('02', g.id, () => { dr.remove(); refresh(); }).then(box => {
        dr.querySelector('.cso-edu-drawer-body').append(el('div', 'cso-edu-section-title', 'Revision history'), box);
      });
    }

    function openReceipt(t) {
      const dl = el('dl', 'cso-fin-receipt');
      [['Reference', t.txn_reference], ['Order', t.order_number || '—'], ['Customer', t.customer_name || '—'], ['Gateway', t.gateway_key],
        ['Gateway payment ID', t.gateway_payment_id || '—'], ['Gateway order ID', t.gateway_order_id || '—'], ['Method', `${t.payment_method} ${t.upi_vpa_or_last4 || ''}`],
        ['Amount', inr(t.amount_paise)], ['Gateway fee', inr(t.gateway_fee_paise)], ['Net settled', inr(t.net_settled_paise)], ['Status', t.txn_status],
        ['Failure reason', t.failure_reason || '—'], ['Captured at', t.captured_at || '—'], ['Created', t.created_at]].forEach(([k, v]) => { dl.append(el('dt', '', k), el('dd', '', v)); });
      const foot = [];
      const dr = openDrawer(`Receipt ${t.txn_reference}`, [dl], foot);
      const f = dr.querySelector('.cso-edu-drawer-foot');
      [['captured', 'Mark Captured'], ['failed', 'Mark Failed'], ['refunded', 'Mark Refunded']].forEach(([s, l]) => {
        if (t.txn_status !== s) f.appendChild(btn(l, '', async () => {
          try { await post(`${API}/transactions/${t.id}`, 'PATCH', { txn_status: s }); dr.remove(); refresh(); } catch (e) { toast(e.message, 'error'); }
        }));
      });
      f.appendChild(btn('Sync Gateway State', 'cso-edu-btn--primary', async () => {
        try { const r = await post(`${API}/transactions/${t.id}`, 'PATCH', { action: 'sync' }); toast(`Order payment: ${r.order_payment_status || 'n/a'}`, 'success'); refresh(); } catch (e) { toast(e.message, 'error'); }
      }));
    }

    function openManualTxn() {
      const order = input('text', 'Order ID (optional, e.g. ford-005)', '');
      const amount = input('number', 'Amount in ₹', '');
      const method = select([['upi', 'UPI'], ['manual_bank', 'Bank transfer'], ['netbanking', 'NetBanking'], ['card', 'Card'], ['wallet', 'Wallet']], 'upi');
      const payer = input('text', 'Payer VPA / last 4', '');
      const utr = input('text', 'UTR / reference no.', '');
      const dr = openDrawer('Record Manual UPI/Bank Transaction', [field('Order ID', order), field('Amount (₹)', amount), field('Method', method), field('Payer VPA / last 4', payer), field('UTR / Reference', utr)], []);
      dr.querySelector('.cso-edu-drawer-foot').appendChild(btn('Record Receipt', 'cso-edu-btn--primary', async () => {
        try {
          await post(`${API}/transactions`, 'POST', { order_id: order.value.trim(), amount_paise: Math.round(Number(amount.value || 0) * 100), payment_method: method.value, upi_vpa_or_last4: payer.value, utr: utr.value, txn_status: 'captured' });
          dr.remove(); toast('Receipt recorded', 'success'); refresh();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    function openOrderForm() {
      const cname = input('text', 'Customer name', '');
      const email = input('email', 'Email', '');
      const phone = input('tel', 'Phone', '');
      const type = select([['study_pack', 'Study Pack'], ['mock_test_series', 'Mock Test Series'], ['membership', 'Membership'], ['ebook', 'e-Book'], ['donation', 'Donation']], 'study_pack');
      const title = input('text', 'Item title (e.g. OPSC OAS Mock Test Series)', '');
      const price = input('number', 'Unit price in ₹', '');
      const qty = input('number', '1', 1);
      const gst = input('number', 'GST %', 18);
      const coupon = input('text', 'Coupon (optional)', '');
      const dr = openDrawer('Create Assisted Order', [field('Customer', cname), field('Email', email), field('Phone', phone), field('Order type', type), field('Item title', title), field('Unit price (₹)', price), field('Qty', qty), field('GST %', gst), field('Coupon', coupon)], []);
      dr.querySelector('.cso-edu-drawer-foot').appendChild(btn('Create Order', 'cso-edu-btn--primary', async () => {
        try {
          await post(`${API}/orders`, 'POST', {
            customer_name: cname.value, customer_email: email.value, customer_phone: phone.value, order_type: type.value, coupon_code: coupon.value,
            items: [{ item_type: type.value, item_id: '', title_en: title.value, qty: Number(qty.value || 1), unit_price_paise: Math.round(Number(price.value || 0) * 100), gst_rate_pct: Number(gst.value || 0) }]
          });
          dr.remove(); toast('Order created', 'success'); refresh();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    function openOrderDetail(o) {
      const lines = el('table', 'cso-fin-lines');
      const hr = el('tr'); ['Item', 'Qty', 'Unit', 'GST', 'Line'].forEach(h => hr.appendChild(el('th', '', h)));
      const th = el('thead'); th.appendChild(hr); lines.appendChild(th);
      const tb = el('tbody');
      (o.items || []).forEach(it => {
        const tr = el('tr');
        [it.title_en, it.qty, inr(it.unit_price_paise), `${it.gst_rate_pct}%`, inr(it.qty * it.unit_price_paise)].forEach(v => tr.appendChild(el('td', '', v)));
        tb.appendChild(tr);
      });
      lines.appendChild(tb);
      const dl = el('dl', 'cso-fin-receipt');
      [['Subtotal', inr(o.subtotal_paise)], ['Discount', `− ${inr(o.discount_paise)}${o.coupon_code ? ` (${o.coupon_code})` : ''}`], ['GST', inr(o.tax_paise)], ['Total', inr(o.total_paise)],
        ['Customer', `${o.customer_name} · ${o.customer_state}`], ['Contact', `${o.customer_phone || '—'} · ${o.customer_email || '—'}`]].forEach(([k, v]) => dl.append(el('dt', '', k), el('dd', '', v)));
      const dr = openDrawer(`Order ${o.order_number}`, [el('div', 'cso-edu-section-title', 'Line items'), lines, dl, el('div', 'cso-edu-section-title', 'Revision history')], []);
      revisionBox('04', o.id, () => { dr.remove(); refresh(); }).then(box => dr.querySelector('.cso-edu-drawer-body').appendChild(box));
    }

    refresh();
    return true;
  }

  window.CSOPaymentsFinanceBatch1 = { render, MODULE_META };
})();
