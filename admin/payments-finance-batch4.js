/* Payments & Finance Batch 4 (13-16) Content Command Workspace — Strict CSP: no inline scripts/styles */
(() => {
  'use strict';

  const API = '/api/admin/finance';
  const MODULES = {
    'module-08-013': { num: '13', ep: 'tax-rules', title: 'Tax Configuration' },
    'module-08-014': { num: '14', ep: 'settlements', title: 'Payouts & Settlements' },
    'module-08-015': { num: '15', ep: 'reconciliation', title: 'Reconciliation' },
    'module-08-016': { num: '16', ep: 'reports', title: 'Finance Reports' }
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
        kpis.replaceChildren();
        [
          ['Active Tax Rules', o.active_tax_rules_count ?? 0],
          ['Settled Payouts', o.settled_payouts_inr || '₹0.00'],
          ['Open Variances', o.open_variances_count ?? 0],
          ['Saved Reports', o.saved_reports_count ?? 0]
        ].forEach(([l, v]) => {
          const c = el('div', 'cso-edu-kpi');
          c.append(el('div', 'cso-edu-kpi-lbl', l), el('div', 'cso-edu-kpi-val', v));
          kpis.appendChild(c);
        });
      } catch (e) {
        kpis.replaceChildren(el('div', 'cso-edu-empty', e.message));
      }
    }

    if (meta.num === '13') renderTaxRules(actions, tabsWrap, filters, content, loadKpis);
    else if (meta.num === '14') renderSettlements(actions, tabsWrap, filters, content, loadKpis);
    else if (meta.num === '15') renderReconciliation(actions, tabsWrap, filters, content, loadKpis);
    else if (meta.num === '16') renderReports(actions, tabsWrap, filters, content, loadKpis);

    loadKpis();
    return true;
  }

  // ---------- Module 13: Tax Configuration ----------
  function renderTaxRules(actions, tabsWrap, filters, content, loadKpis) {
    let statusFilter = '';
    if (actions) {
      actions.replaceChildren(
        btn('+ New Tax Rule', 'cso-edu-btn--primary', () => openTaxModal(null, load)),
        btn('Live GST Split Calculator', '', openGstCalculator)
      );
    }
    function drawTabs() {
      tabsWrap.replaceChildren();
      [['', 'All'], ['published', 'Published'], ['draft', 'Drafts'], ['archived', 'Archived']].forEach(([s, l]) => {
        const b = el('button', `cso-edu-tab${s === statusFilter ? ' is-active' : ''}`, l);
        b.type = 'button';
        b.addEventListener('click', () => { statusFilter = s; load(); });
        tabsWrap.appendChild(b);
      });
    }
    async function load() {
      drawTabs();
      filters.replaceChildren(el('span', 'cso-edu-badge cso-edu-badge--pub', 'Home State: Odisha (Code 21)'));
      content.replaceChildren(el('div', 'cso-edu-empty', 'Loading tax rules...'));
      try {
        const d = await api(`${API}/tax-rules${statusFilter ? `?status=${statusFilter}` : ''}`);
        content.replaceChildren();
        if (!d.items.length) { content.appendChild(el('div', 'cso-edu-empty', 'No tax rules found.')); return; }
        const tbl = el('table', 'cso-edu-table');
        const thead = el('thead', '', el('tr', '', [
          el('th', '', 'Rule Code / Name'), el('th', '', 'Regime & Scope'), el('th', '', 'SAC / HSN'),
          el('th', '', 'Slab (CGST+SGST / IGST)'), el('th', '', 'Pricing Mode'), el('th', '', 'Status'), el('th', '', 'Actions')
        ]));
        const tbody = el('tbody');
        d.items.forEach(r => {
          const acts = el('div', 'cso-edu-actions');
          acts.append(
            btn('Edit', '', () => openTaxModal(r, load)),
            btn(r.status === 'published' ? 'Unpublish' : 'Publish', '', async () => {
              try { await api(`${API}/tax-rules/${r.id}`, 'PATCH', { status: r.status === 'published' ? 'draft' : 'published' }); load(); }
              catch (e) { toast(e.message, 'error'); }
            }),
            btn('Archive', 'cso-edu-btn--danger', async () => {
              try { await api(`${API}/tax-rules/${r.id}`, 'DELETE'); load(); }
              catch (e) { toast(e.message, 'error'); }
            })
          );
          const badges = el('div', 'cso-edu-badges', [
            el('span', `cso-edu-badge cso-edu-badge--${r.status === 'published' ? 'ok' : 'draft'}`, r.status)
          ]);
          if (r.is_default) badges.appendChild(el('span', 'cso-edu-badge cso-edu-badge--pub', 'Default'));
          tbody.appendChild(el('tr', '', [
            el('td', '', [el('strong', '', r.rule_code), el('div', 'cso-fin-meta', r.rule_name_en)]),
            el('td', '', `${r.tax_regime} · ${r.applicable_scope}`),
            el('td', '', `${r.hsn_sac_code} (State ${r.home_state_code})`),
            el('td', 'cso-fin-amt', `${r.total_gst_pct}% (${r.cgst_pct}%+${r.sgst_pct}% / ${r.igst_pct}%)`),
            el('td', '', r.is_tax_inclusive ? 'Tax Inclusive' : 'Tax Exclusive'),
            el('td', '', badges),
            el('td', '', acts)
          ]));
        });
        tbl.append(thead, tbody);
        content.appendChild(tbl);
      } catch (e) { content.replaceChildren(el('div', 'cso-edu-empty', e.message)); }
      loadKpis();
    }

    function openTaxModal(r, onDone) {
      const codeIn = textInput('text', r ? r.rule_code : '', 'e.g. GST-EDU-18');
      const nameIn = textInput('text', r ? r.rule_name_en : '', 'Rule Name (English)');
      const nameOr = textInput('text', r ? r.rule_name_or : '', 'Rule Name (Odia)');
      const regSel = selectOf([['indian_gst', 'Indian GST'], ['exempt_educational', 'Exempt Educational'], ['donation_80g', '80G Donation Exempt']], r ? r.tax_regime : 'indian_gst');
      const scopeSel = selectOf([['all_taxable', 'All Taxable'], ['paid_resources', 'Paid Resources'], ['mock_tests', 'Mock Tests'], ['subscriptions', 'Subscriptions'], ['memberships', 'Memberships'], ['donations', 'Donations']], r ? r.applicable_scope : 'all_taxable');
      const sacIn = textInput('text', r ? r.hsn_sac_code : '999293', '999293');
      const slabSel = selectOf([['0', '0% (Exempt)'], ['5', '5% GST'], ['12', '12% GST'], ['18', '18% GST']], String(r ? r.total_gst_pct : 18));
      const incChk = el('input'); incChk.type = 'checkbox'; incChk.checked = !!(r && r.is_tax_inclusive);
      const defChk = el('input'); defChk.type = 'checkbox'; defChk.checked = !!(r && r.is_default);
      const stSel = selectOf([['draft', 'Draft'], ['published', 'Published'], ['archived', 'Archived']], r ? r.status : 'draft');

      const d = openDrawer(r ? `Edit Tax Rule: ${r.rule_code}` : 'Create Tax Rule', [
        field('Rule Code *', codeIn),
        field('Rule Name (English) *', nameIn),
        field('Rule Name (Odia)', nameOr),
        field('Tax Regime', regSel),
        field('Applicable Scope', scopeSel),
        field('HSN / SAC Code', sacIn),
        field('GST Slab', slabSel),
        el('label', 'cso-edu-toggle-row', [incChk, document.createTextNode(' Tax-inclusive pricing')]),
        el('label', 'cso-edu-toggle-row', [defChk, document.createTextNode(' Default tax rule')]),
        field('Status', stSel)
      ]);
      d.foot.appendChild(btn('Save Tax Rule', 'cso-edu-btn--primary', async () => {
        try {
          const payload = {
            rule_code: codeIn.value.trim().toUpperCase(),
            rule_name_en: nameIn.value.trim(),
            rule_name_or: nameOr.value.trim(),
            tax_regime: regSel.value,
            applicable_scope: scopeSel.value,
            hsn_sac_code: sacIn.value.trim(),
            total_gst_pct: Number(slabSel.value),
            is_tax_inclusive: incChk.checked,
            is_default: defChk.checked,
            status: stSel.value
          };
          if (r) await api(`${API}/tax-rules/${r.id}`, 'PATCH', payload);
          else await api(`${API}/tax-rules`, 'POST', payload);
          d.backdrop.remove();
          toast('Tax rule saved', 'success');
          onDone();
        } catch (e) { toast(e.message, 'error'); }
      }));
      if (r) attachRevisions(d.body, '13', r.id, () => { d.backdrop.remove(); onDone(); });
    }

    function openGstCalculator() {
      const amtIn = textInput('number', '499.00', 'Amount in ₹');
      const stateIn = textInput('text', 'Odisha', 'Customer State (e.g. Odisha, West Bengal)');
      const slabSel = selectOf([['18', '18% GST'], ['12', '12% GST'], ['5', '5% GST'], ['0', '0% Exempt']], '18');
      const incChk = el('input'); incChk.type = 'checkbox';
      const outBox = el('div', 'cso-fin-calc-res', el('span', 'cso-fin-meta', 'Enter amount and state to compute CGST+SGST vs IGST.'));
      const d = openDrawer('Live GST Split Calculator', [
        field('Amount (₹) *', amtIn),
        field('Customer State *', stateIn),
        field('GST Slab', slabSel),
        el('label', 'cso-edu-toggle-row', [incChk, document.createTextNode(' Amount is GST-inclusive')]),
        outBox
      ]);
      d.foot.appendChild(btn('Calculate GST Split', 'cso-edu-btn--primary', async () => {
        try {
          const res = await api(`${API}/tax-rules/calculate`, 'POST', {
            amount_paise: Math.round(Number(amtIn.value || 0) * 100),
            customer_state: stateIn.value.trim() || 'Odisha',
            total_gst_pct: Number(slabSel.value),
            is_tax_inclusive: incChk.checked
          });
          outBox.replaceChildren(
            el('div', 'cso-fin-amt', `Supply Type: ${res.is_intra_state ? 'Intra-State Odisha (CGST + SGST)' : 'Inter-State (IGST)'}`),
            el('div', '', `Taxable Value: ${res.taxable_inr}`),
            el('div', '', `CGST: ${res.cgst_inr} · SGST: ${res.sgst_inr} · IGST: ${res.igst_inr}`),
            el('div', 'cso-fin-amt', `Grand Total: ${res.total_inr}`)
          );
        } catch (e) { toast(e.message, 'error'); }
      }));
    }
    load();
  }

  // ---------- Module 14: Payouts & Settlements ----------
  function renderSettlements(actions, tabsWrap, filters, content, loadKpis) {
    let stFilter = '';
    if (actions) {
      actions.replaceChildren(btn('+ Record Bank Settlement', 'cso-edu-btn--primary', () => openSettlementModal(null, load)));
    }
    function drawTabs() {
      tabsWrap.replaceChildren();
      [['', 'All'], ['scheduled', 'Scheduled'], ['processing', 'Processing'], ['settled', 'Settled'], ['on_hold', 'On Hold']].forEach(([s, l]) => {
        const b = el('button', `cso-edu-tab${s === stFilter ? ' is-active' : ''}`, l);
        b.type = 'button';
        b.addEventListener('click', () => { stFilter = s; load(); });
        tabsWrap.appendChild(b);
      });
    }
    async function load() {
      drawTabs();
      filters.replaceChildren();
      content.replaceChildren(el('div', 'cso-edu-empty', 'Loading settlements...'));
      try {
        const d = await api(`${API}/settlements${stFilter ? `?settlement_status=${stFilter}` : ''}`);
        content.replaceChildren();
        if (!d.items.length) { content.appendChild(el('div', 'cso-edu-empty', 'No settlements found.')); return; }
        const tbl = el('table', 'cso-edu-table');
        const thead = el('thead', '', el('tr', '', [
          el('th', '', 'UTR / Gateway'), el('th', '', 'Period / Bank'), el('th', '', 'Gross Captured'),
          el('th', '', 'Fee + GST on Fee'), el('th', '', 'Net Bank Payout'), el('th', '', 'Status'), el('th', '', 'Actions')
        ]));
        const tbody = el('tbody');
        d.items.forEach(s => {
          const acts = el('div', 'cso-edu-actions');
          acts.append(btn('Details', '', () => openSettlementModal(s, load)));
          if (s.settlement_status !== 'settled') {
            acts.append(btn('Mark Settled', 'cso-edu-btn--primary', async () => {
              try {
                await api(`${API}/settlements/${s.id}`, 'PATCH', { settlement_status: 'settled' });
                toast(`Marked ${s.settlement_utr} settled`, 'success');
                load();
              } catch (e) { toast(e.message, 'error'); }
            }));
          }
          tbody.appendChild(el('tr', '', [
            el('td', '', [el('strong', '', s.settlement_utr), el('div', 'cso-fin-meta', `${s.gateway_key} (${s.txn_count} txns)`)]),
            el('td', '', [el('div', '', `${s.period_start || '—'} -> ${s.period_end || '—'}`), el('div', 'cso-fin-meta', s.bank_account_masked)]),
            el('td', 'cso-fin-amt', inr(s.gross_captured_paise)),
            el('td', 'cso-fin-amt', `${inr(s.gateway_fee_paise)} + ${inr(s.gst_on_fee_paise)}`),
            el('td', 'cso-fin-amt', inr(s.net_settled_paise)),
            el('td', '', el('span', `cso-edu-badge cso-edu-badge--${s.settlement_status === 'settled' ? 'ok' : s.settlement_status === 'on_hold' ? 'arch' : 'warn'}`, s.settlement_status)),
            el('td', '', acts)
          ]));
        });
        tbl.append(thead, tbody);
        content.appendChild(tbl);
      } catch (e) { content.replaceChildren(el('div', 'cso-edu-empty', e.message)); }
      loadKpis();
    }

    function openSettlementModal(s, onDone) {
      const utrIn = textInput('text', s ? s.settlement_utr : '', 'UTR-RZP-20260003');
      if (s) utrIn.disabled = true;
      const gwIn = textInput('text', s ? s.gateway_key : 'razorpay-live', 'razorpay-live');
      const grossIn = textInput('number', s ? (s.gross_captured_paise / 100).toFixed(2) : '0.00', 'Gross ₹');
      const feeIn = textInput('number', s ? (s.gateway_fee_paise / 100).toFixed(2) : '0.00', 'Gateway Fee ₹');
      const bankIn = textInput('text', s ? s.bank_account_masked : 'SBI •••• 4821', 'SBI •••• 4821');
      const stSel = selectOf([['scheduled', 'Scheduled'], ['processing', 'Processing'], ['settled', 'Settled'], ['on_hold', 'On Hold']], s ? s.settlement_status : 'scheduled');
      const notesIn = el('textarea', 'cso-edu-textarea-full'); notesIn.value = s ? s.notes || '' : '';

      const d = openDrawer(s ? `Settlement ${s.settlement_utr}` : 'Record Bank Settlement', [
        field('Settlement UTR *', utrIn),
        field('Gateway Key', gwIn),
        field('Gross Captured (₹)', grossIn),
        field('Gateway Fee (₹)', feeIn),
        field('Bank Account (Masked)', bankIn),
        field('Status', stSel),
        field('Notes', notesIn)
      ]);
      d.foot.appendChild(btn('Save Settlement', 'cso-edu-btn--primary', async () => {
        try {
          if (s) {
            await api(`${API}/settlements/${s.id}`, 'PATCH', {
              settlement_status: stSel.value,
              bank_account_masked: bankIn.value.trim(),
              notes: notesIn.value.trim()
            });
          } else {
            await api(`${API}/settlements`, 'POST', {
              settlement_utr: utrIn.value.trim(),
              gateway_key: gwIn.value.trim(),
              gross_captured_paise: Math.round(Number(grossIn.value || 0) * 100),
              gateway_fee_paise: Math.round(Number(feeIn.value || 0) * 100),
              bank_account_masked: bankIn.value.trim(),
              settlement_status: stSel.value,
              notes: notesIn.value.trim()
            });
          }
          d.backdrop.remove();
          toast('Settlement saved', 'success');
          onDone();
        } catch (e) { toast(e.message, 'error'); }
      }));
      if (s) attachRevisions(d.body, '14', s.id, () => { d.backdrop.remove(); onDone(); });
    }
    load();
  }

  // ---------- Module 15: Reconciliation ----------
  function renderReconciliation(actions, tabsWrap, filters, content, loadKpis) {
    if (actions) {
      actions.replaceChildren(btn('Run Auto-Reconciliation', 'cso-edu-btn--primary', openRunModal));
    }
    async function load() {
      tabsWrap.replaceChildren();
      filters.replaceChildren();
      content.replaceChildren(el('div', 'cso-edu-empty', 'Loading reconciliation runs...'));
      try {
        const d = await api(`${API}/reconciliation`);
        content.replaceChildren();
        if (!d.items.length) { content.appendChild(el('div', 'cso-edu-empty', 'No reconciliation runs yet.')); return; }
        const tbl = el('table', 'cso-edu-table');
        const thead = el('thead', '', el('tr', '', [
          el('th', '', 'Run Code / Gateway'), el('th', '', 'Expected Ledger'), el('th', '', 'Gateway Reported'),
          el('th', '', 'Variance'), el('th', '', 'Matched / Unmatched'), el('th', '', 'Status'), el('th', '', 'Actions')
        ]));
        const tbody = el('tbody');
        d.items.forEach(r => {
          const acts = el('div', 'cso-edu-actions');
          acts.append(btn('Inspect', '', () => openInspectModal(r)));
          if (r.run_status === 'variance_detected') {
            acts.append(btn('Mark Resolved', 'cso-edu-btn--primary', async () => {
              try {
                await api(`${API}/reconciliation/${r.id}`, 'PATCH', { run_status: 'resolved', resolution_note: 'Resolved via admin console' });
                toast(`${r.run_code} marked resolved`, 'success');
                load();
              } catch (e) { toast(e.message, 'error'); }
            }));
          }
          const badgeTone = r.run_status === 'balanced' || r.run_status === 'resolved' ? 'ok' : 'warn';
          const varLabel = r.variance_paise === 0 ? '₹0.00 Balanced' : inr(r.variance_paise);
          tbody.appendChild(el('tr', '', [
            el('td', '', [el('strong', '', r.run_code), el('div', 'cso-fin-meta', r.gateway_key)]),
            el('td', 'cso-fin-amt', inr(r.expected_ledger_paise)),
            el('td', 'cso-fin-amt', inr(r.gateway_reported_paise)),
            el('td', 'cso-fin-amt', el('span', `cso-edu-badge cso-edu-badge--${badgeTone}`, varLabel)),
            el('td', '', `${r.matched_txn_count} / ${r.unmatched_txn_count}`),
            el('td', '', el('span', `cso-edu-badge cso-edu-badge--${badgeTone}`, r.run_status)),
            el('td', '', acts)
          ]));
        });
        tbl.append(thead, tbody);
        content.appendChild(tbl);
      } catch (e) { content.replaceChildren(el('div', 'cso-edu-empty', e.message)); }
      loadKpis();
    }

    function openRunModal() {
      const gwSel = selectOf([['all', 'All Gateways'], ['razorpay-live', 'Razorpay Live'], ['manual-upi-qr', 'Manual UPI QR']], 'all');
      const repIn = textInput('number', '', 'Gateway Reported Total (₹, leave blank to match D1)');
      const d = openDrawer('Run Auto-Reconciliation', [
        field('Gateway Scope', gwSel),
        field('Gateway Reported Total (₹, optional)', repIn)
      ]);
      d.foot.appendChild(btn('Execute Reconciliation Pass', 'cso-edu-btn--primary', async () => {
        try {
          const payload = { gateway_key: gwSel.value };
          if (repIn.value.trim() !== '') payload.gateway_reported_paise = Math.round(Number(repIn.value) * 100);
          const res = await api(`${API}/reconciliation/run`, 'POST', payload);
          d.backdrop.remove();
          toast(`Run ${res.item.run_code}: ${res.item.run_status}`, res.item.run_status === 'balanced' ? 'success' : 'info');
          load();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    function openInspectModal(r) {
      const list = el('div', 'cso-fin-picker');
      const items = r.discrepancy_items || [];
      if (!items.length) list.appendChild(el('div', 'cso-edu-empty', 'No discrepancies detected in this run.'));
      items.forEach(it => {
        list.appendChild(el('div', 'cso-fin-picker-item', [
          el('span', '', `${it.txn_reference} (${it.order_number}) · ${it.issue_type} — ${it.resolution_note}`),
          el('span', 'cso-fin-amt', inr(it.amount_paise))
        ]));
      });
      const d = openDrawer(`Discrepancies — ${r.run_code}`, [list]);
      d.foot.appendChild(btn('Close', '', () => d.backdrop.remove()));
      attachRevisions(d.body, '15', r.id, () => { d.backdrop.remove(); load(); });
    }
    load();
  }

  // ---------- Module 16: Finance Reports ----------
  function renderReports(actions, tabsWrap, filters, content, loadKpis) {
    let reportType = 'gst_gstr1_summary';
    const typeSel = selectOf([
      ['gst_gstr1_summary', 'GST GSTR-1 Summary'],
      ['revenue_by_product', 'Revenue by Product'],
      ['gateway_settlement_ledger', 'Gateway Settlement Ledger'],
      ['refund_chargeback_register', 'Refund & Chargeback Register'],
      ['donation_80g_ledger', '80G Donation Ledger']
    ], reportType);
    typeSel.addEventListener('change', () => { reportType = typeSel.value; load(); });

    const exportFile = (fmt) => {
      window.open(`${API}/reports/export?report_type=${encodeURIComponent(reportType)}&format=${fmt}`, '_blank', 'noopener');
    };

    if (actions) {
      actions.replaceChildren(
        btn('Save Snapshot', 'cso-edu-btn--primary', async () => {
          try {
            await api(`${API}/reports`, 'POST', { report_type: reportType });
            toast('Report snapshot saved', 'success');
            load();
          } catch (e) { toast(e.message, 'error'); }
        }),
        btn('Export CSV', '', () => exportFile('csv')),
        btn('Export JSON', '', () => exportFile('json'))
      );
    }

    async function load() {
      tabsWrap.replaceChildren();
      filters.replaceChildren(typeSel);
      content.replaceChildren(el('div', 'cso-edu-empty', 'Generating live financial report...'));
      try {
        const d = await api(`${API}/reports?report_type=${encodeURIComponent(reportType)}`);
        content.replaceChildren();
        const live = d.live_report || { columns: [], rows: [], summary: {} };
        const sumBox = el('div', 'cso-edu-section-box', [
          el('div', 'cso-edu-section-title', `Live Summary (${live.report_type})`),
          el('div', 'cso-fin-meta', Object.entries(live.summary || {}).filter(([k]) => !k.endsWith('_paise')).map(([k, v]) => `${k}: ${v}`).join(' · '))
        ]);
        content.appendChild(sumBox);

        if (!live.rows.length) {
          content.appendChild(el('div', 'cso-edu-empty', 'No rows in this report period.'));
        } else {
          const tbl = el('table', 'cso-edu-table');
          tbl.appendChild(el('thead', '', el('tr', '', live.columns.map(c => el('th', '', c)))));
          const tbody = el('tbody');
          live.rows.forEach(r => tbody.appendChild(el('tr', '', live.columns.map(c => el('td', c.endsWith('_inr') ? 'cso-fin-amt' : '', r[c] ?? '—')))));
          tbl.appendChild(tbody);
          content.appendChild(tbl);
        }

        if (d.saved_reports && d.saved_reports.length) {
          const snapBox = el('div', 'cso-edu-section-box');
          snapBox.appendChild(el('div', 'cso-edu-section-title', 'Saved Report Snapshots'));
          d.saved_reports.slice(0, 6).forEach(s => {
            snapBox.appendChild(el('div', 'cso-fin-feed-item', [
              el('span', '', `${s.report_code} · ${s.title_en}`),
              el('span', 'cso-fin-meta', `${s.generated_by || 'admin'} · ${s.created_at}`)
            ]));
          });
          content.appendChild(snapBox);
        }
      } catch (e) { content.replaceChildren(el('div', 'cso-edu-empty', e.message)); }
      loadKpis();
    }
    load();
  }

  window.CSOPaymentsFinanceBatch4 = { render, MODULES };
})();
