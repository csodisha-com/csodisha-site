/* Payments & Finance Batch 3 (09-12) Content Command Workspace — Strict CSP: no inline scripts/styles */
(() => {
  'use strict';

  const API = '/api/admin/finance';

  const MODULES = {
    'module-08-009': { num: '09', ep: 'donations', title: 'Donations' },
    'module-08-010': { num: '10', ep: 'coupons', title: 'Coupons & Offers' },
    'module-08-011': { num: '11', ep: 'refunds', title: 'Refunds & Disputes' },
    'module-08-012': { num: '12', ep: 'invoices', title: 'Invoices & Receipts' }
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
          ['Donations Raised', o.total_donations_raised_inr || '₹0.00'],
          ['Active Coupons', o.active_coupons_count || 0],
          ['Open Refund Cases', o.open_refunds_count || 0],
          ['Invoices Issued', o.issued_invoices_count || 0]
        ].forEach(([l, v]) => {
          const c = el('div', 'cso-edu-kpi');
          c.append(el('div', 'cso-edu-kpi-lbl', l), el('div', 'cso-edu-kpi-val', v));
          kpis.appendChild(c);
        });
      } catch (e) {
        kpis.replaceChildren(el('div', 'cso-edu-empty', e.message));
      }
    }

    if (meta.num === '09') renderDonationsModule(actions, tabsWrap, filters, content, loadKpis);
    else if (meta.num === '10') renderCouponsModule(actions, tabsWrap, filters, content, loadKpis);
    else if (meta.num === '11') renderRefundsModule(actions, tabsWrap, filters, content, loadKpis);
    else if (meta.num === '12') renderInvoicesModule(actions, tabsWrap, filters, content, loadKpis);

    loadKpis();
    return true;
  }

  // ---------- Module 09: Donations ----------
  function renderDonationsModule(actions, tabsWrap, filters, content, loadKpis) {
    let activeTab = 'campaigns'; // 'campaigns' | 'ledger'
    if (actions) {
      actions.replaceChildren();
      actions.append(
        btn('+ New Campaign', 'cso-edu-btn--primary', () => openCampaignModal(null, load)),
        btn('+ Record Donation', '', () => openRecordDonationModal(load))
      );
    }

    function drawTabs() {
      tabsWrap.replaceChildren();
      [['campaigns', 'Campaigns'], ['ledger', 'Donor Ledger']].forEach(([t, l]) => {
        const b = el('button', `cso-edu-tab${t === activeTab ? ' is-active' : ''}`, l);
        b.type = 'button';
        b.addEventListener('click', () => { activeTab = t; load(); });
        tabsWrap.appendChild(b);
      });
    }

    async function load() {
      drawTabs();
      content.replaceChildren(el('div', 'cso-edu-empty', 'Loading donations...'));
      try {
        if (activeTab === 'campaigns') {
          const d = await api(`${API}/donations`);
          content.replaceChildren();
          if (!d.items.length) {
            content.appendChild(el('div', 'cso-edu-empty', 'No donation campaigns found.'));
            return;
          }
          const grid = el('div', 'cso-fin-grid');
          d.items.forEach(c => {
            const card = el('div', 'cso-fin-camp-card');
            const pct = c.goal_paise > 0 ? Math.min(100, Math.round((c.raised_paise * 100) / c.goal_paise)) : 0;
            const head = el('div', 'cso-fin-camp-head');
            head.append(
              el('div', '', [el('h4', '', c.title_en), el('div', 'cso-fin-meta', `${c.campaign_code} · ${c.cause_category}`)]),
              el('span', `cso-edu-badge cso-edu-badge--${c.status === 'published' ? 'pub' : 'draft'}`, c.status)
            );
            const stats = el('div', 'cso-fin-camp-stats');
            stats.append(
              el('span', '', [document.createTextNode('Raised: '), el('strong', '', inr(c.raised_paise))]),
              el('span', '', [document.createTextNode('Goal: '), el('strong', '', inr(c.goal_paise))]),
              el('span', '', [document.createTextNode('Donors: '), el('strong', '', c.donor_count)])
            );
            const prog = el('progress'); prog.max = 100; prog.value = pct;
            const acts = el('div', 'cso-edu-actions');
            acts.append(
              btn('Donor Wall', '', () => openDonorWall(c.id, c.title_en)),
              btn('Edit', '', () => openCampaignModal(c, load)),
              btn(c.status === 'published' ? 'Unpublish' : 'Publish', '', async () => {
                try {
                  await api(`${API}/donations/${c.id}`, 'PATCH', { status: c.status === 'published' ? 'draft' : 'published' });
                  load();
                } catch (e) { toast(e.message, 'error'); }
              })
            );
            card.append(head, stats, prog, acts);
            grid.appendChild(card);
          });
          content.appendChild(grid);
        } else {
          const d = await api(`${API}/donations/entries`);
          content.replaceChildren();
          if (!d.items.length) {
            content.appendChild(el('div', 'cso-edu-empty', 'No donor contributions recorded yet.'));
            return;
          }
          const tbl = el('table', 'cso-edu-table');
          const thead = el('thead');
          thead.appendChild(el('tr', '', [
            el('th', '', 'Receipt / Date'), el('th', '', 'Donor'), el('th', '', 'Campaign'),
            el('th', '', 'City'), el('th', '', 'Amount'), el('th', '', 'Method'), el('th', '', 'Status')
          ]));
          const tbody = el('tbody');
          d.items.forEach(e => {
            const tr = el('tr', '', [
              el('td', '', `${e.receipt_number || '—'}\n${e.created_at.slice(0, 10)}`),
              el('td', '', e.is_anonymous ? 'Anonymous' : `${e.donor_name}${e.donor_email ? ' (' + e.donor_email + ')' : ''}`),
              el('td', '', e.campaign_title || e.campaign_id),
              el('td', '', e.donor_city || '—'),
              el('td', 'cso-fin-amt', inr(e.amount_paise)),
              el('td', '', `${e.payment_method} ${e.txn_reference || ''}`),
              el('td', '', el('span', 'cso-edu-badge cso-edu-badge--ok', e.status))
            ]);
            tbody.appendChild(tr);
          });
          tbl.append(thead, tbody);
          content.appendChild(tbl);
        }
      } catch (err) {
        content.replaceChildren(el('div', 'cso-edu-empty', err.message));
      }
      loadKpis();
    }

    function openCampaignModal(c, onDone) {
      const titleIn = textInput('text', c ? c.title_en : '', 'Campaign Title (English)');
      const titleOr = textInput('text', c ? c.title_or : '', 'Title (Odia)');
      const codeIn = textInput('text', c ? c.campaign_code : '', 'Code e.g. CSO-DON-XYZ');
      const catSel = selectOf([
        ['free_odia_textbooks', 'Free Odia Textbooks'],
        ['rural_student_scholarships', 'Rural Scholarships'],
        ['open_pyq_digitization', 'PYQ Digitization'],
        ['platform_sustainability', 'Platform Sustainability']
      ], c ? c.cause_category : 'free_odia_textbooks');
      const goalIn = textInput('number', c ? (c.goal_paise / 100).toFixed(2) : '50000.00', 'Goal in ₹');
      const sumIn = el('textarea', 'cso-edu-textarea-full'); sumIn.value = c ? c.summary_en || '' : '';
      const stSel = selectOf([['draft', 'Draft'], ['published', 'Published'], ['archived', 'Archived']], c ? c.status : 'draft');

      const d = openDrawer(c ? `Edit Campaign: ${c.title_en}` : 'Create Donation Campaign', [
        field('Campaign Title (English) *', titleIn),
        field('Title (Odia)', titleOr),
        field('Campaign Code', codeIn),
        field('Cause Category', catSel),
        field('Fundraising Goal (₹) *', goalIn),
        field('Summary', sumIn),
        field('Status', stSel)
      ]);

      d.foot.appendChild(btn('Save Campaign', 'cso-edu-btn--primary', async () => {
        try {
          const payload = {
            title_en: titleIn.value.trim(),
            title_or: titleOr.value.trim(),
            campaign_code: codeIn.value.trim(),
            cause_category: catSel.value,
            goal_paise: Math.round(Number(goalIn.value || 0) * 100),
            summary_en: sumIn.value.trim(),
            status: stSel.value
          };
          if (c) await api(`${API}/donations/${c.id}`, 'PATCH', payload);
          else await api(`${API}/donations`, 'POST', payload);
          d.backdrop.remove();
          toast('Campaign saved', 'success');
          onDone();
        } catch (e) { toast(e.message, 'error'); }
      }));
      if (c) attachRevisions(d.body, '09', c.id, () => { d.backdrop.remove(); onDone(); });
    }

    function openRecordDonationModal(onDone) {
      const campIn = textInput('text', '', 'Campaign ID (e.g. fdon-camp-001)');
      const donorIn = textInput('text', '', 'Donor Name *');
      const emailIn = textInput('email', '', 'Donor Email');
      const cityIn = textInput('text', '', 'Donor City');
      const amtIn = textInput('number', '500.00', 'Amount in ₹ *');
      const refIn = textInput('text', '', 'UPI / Bank Reference (UTR)');
      const anonChk = el('input'); anonChk.type = 'checkbox';
      const anonLabel = el('label', 'cso-edu-toggle-row', [anonChk, document.createTextNode(' Keep anonymous on public donor wall')]);

      const d = openDrawer('Record Donor Contribution', [
        field('Campaign ID *', campIn),
        field('Donor Full Name *', donorIn),
        field('Donor Email', emailIn),
        field('City / District', cityIn),
        field('Donation Amount (₹) *', amtIn),
        field('Payment Ref (UTR)', refIn),
        anonLabel
      ]);

      d.foot.appendChild(btn('Submit Contribution', 'cso-edu-btn--primary', async () => {
        try {
          await api(`${API}/donations/entries`, 'POST', {
            campaign_id: campIn.value.trim(),
            donor_name: donorIn.value.trim(),
            donor_email: emailIn.value.trim(),
            donor_city: cityIn.value.trim(),
            amount_paise: Math.round(Number(amtIn.value || 0) * 100),
            txn_reference: refIn.value.trim(),
            is_anonymous: anonChk.checked
          });
          d.backdrop.remove();
          toast('Donation contribution recorded', 'success');
          onDone();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    async function openDonorWall(campId, campTitle) {
      const d = openDrawer(`Donor Wall: ${campTitle}`, [el('div', 'cso-edu-empty', 'Loading contributors...')]);
      try {
        const res = await api(`${API}/donations/entries?campaign_id=${campId}`);
        d.body.replaceChildren();
        if (!res.items.length) {
          d.body.appendChild(el('div', 'cso-edu-empty', 'No donors have contributed to this campaign yet.'));
        } else {
          const list = el('div', 'cso-fin-picker');
          res.items.forEach(e => {
            const item = el('div', 'cso-fin-picker-item');
            item.append(
              el('span', '', `${e.is_anonymous ? 'Anonymous Supporter' : e.donor_name} (${e.donor_city || 'Odisha'})`),
              el('span', 'cso-fin-amt', inr(e.amount_paise))
            );
            list.appendChild(item);
          });
          d.body.appendChild(list);
        }
      } catch (e) { d.body.replaceChildren(el('div', 'cso-edu-empty', e.message)); }
    }

    load();
  }

  // ---------- Module 10: Coupons & Offers ----------
  function renderCouponsModule(actions, tabsWrap, filters, content, loadKpis) {
    let statusFilter = '';
    if (actions) {
      actions.replaceChildren();
      actions.append(
        btn('+ Create Coupon', 'cso-edu-btn--primary', () => openCouponModal(null, load)),
        btn('Test Coupon Calculator', '', openCouponCalculatorModal)
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
      content.replaceChildren(el('div', 'cso-edu-empty', 'Loading coupons...'));
      try {
        const p = statusFilter ? `?status=${statusFilter}` : '';
        const d = await api(`${API}/coupons${p}`);
        content.replaceChildren();
        if (!d.items.length) {
          content.appendChild(el('div', 'cso-edu-empty', 'No coupons match.'));
          return;
        }
        const tbl = el('table', 'cso-edu-table');
        const thead = el('thead');
        thead.appendChild(el('tr', '', [
          el('th', '', 'Code'), el('th', '', 'Title'), el('th', '', 'Discount'),
          el('th', '', 'Min Order / Cap'), el('th', '', 'Scope'), el('th', '', 'Usage'), el('th', '', 'Status'), el('th', '', 'Actions')
        ]));
        const tbody = el('tbody');
        d.items.forEach(c => {
          const acts = el('div', 'cso-edu-actions');
          acts.append(
            btn('Edit', '', () => openCouponModal(c, load)),
            btn('Clone', '', async () => {
              try { await api(`${API}/coupons/${c.id}`, 'POST', { action: 'clone' }); toast('Coupon cloned', 'success'); load(); }
              catch (e) { toast(e.message, 'error'); }
            }),
            btn(c.status === 'published' ? 'Unpublish' : 'Publish', '', async () => {
              try {
                await api(`${API}/coupons/${c.id}`, 'PATCH', { status: c.status === 'published' ? 'draft' : 'published' });
                load();
              } catch (e) { toast(e.message, 'error'); }
            }),
            btn('Archive', 'cso-edu-btn--danger', async () => {
              try { await api(`${API}/coupons/${c.id}`, 'DELETE'); load(); }
              catch (e) { toast(e.message, 'error'); }
            })
          );
          const discText = c.discount_type === 'percent' ? `${c.discount_value}% OFF` : `Flat ${inr(c.discount_value)} OFF`;
          const capText = `${inr(c.min_order_paise)} min / ${c.max_discount_paise ? inr(c.max_discount_paise) : 'No cap'}`;
          const tr = el('tr', '', [
            el('td', 'cso-fin-amt', el('span', 'cso-edu-badge cso-edu-badge--pub', c.code)),
            el('td', '', c.title_en),
            el('td', '', discText),
            el('td', '', capText),
            el('td', '', c.applicable_scope),
            el('td', '', `${c.used_count}${c.usage_limit_total ? ' / ' + c.usage_limit_total : ''}`),
            el('td', '', el('span', `cso-edu-badge cso-edu-badge--${c.status === 'published' ? 'ok' : 'draft'}`, c.status)),
            el('td', '', acts)
          ]);
          tbody.appendChild(tr);
        });
        tbl.append(thead, tbody);
        content.appendChild(tbl);
      } catch (err) { content.replaceChildren(el('div', 'cso-edu-empty', err.message)); }
      loadKpis();
    }

    function openCouponModal(c, onDone) {
      const codeIn = textInput('text', c ? c.code : '', 'e.g. ODISHA20');
      const titleIn = textInput('text', c ? c.title_en : '', 'Coupon Title');
      const typeSel = selectOf([['percent', 'Percentage (%)'], ['flat_paise', 'Flat INR (₹)']], c ? c.discount_type : 'percent');
      const valIn = textInput('number', c ? (c.discount_type === 'flat_paise' ? c.discount_value / 100 : c.discount_value) : '10', 'Discount value');
      const maxIn = textInput('number', c ? (c.max_discount_paise / 100).toFixed(2) : '0', 'Max discount (₹)');
      const minIn = textInput('number', c ? (c.min_order_paise / 100).toFixed(2) : '0', 'Min order (₹)');
      const scopeSel = selectOf([['all', 'All Products & Study Packs'], ['paid_resources', 'Paid Resources Only'], ['products', 'Products Only'], ['subscriptions', 'Subscriptions Only'], ['memberships', 'Memberships Only']], c ? c.applicable_scope : 'all');
      const limitIn = textInput('number', c ? c.usage_limit_total : '0', 'Total usage limit (0 = unltd)');
      const stSel = selectOf([['draft', 'Draft'], ['published', 'Published'], ['archived', 'Archived']], c ? c.status : 'draft');

      const d = openDrawer(c ? `Edit Coupon: ${c.code}` : 'Create Promo Coupon', [
        field('Coupon Code (UPPERCASE) *', codeIn),
        field('Coupon Title *', titleIn),
        field('Discount Rule *', typeSel),
        field('Discount Value (Percent or ₹) *', valIn),
        field('Max Discount Cap (₹, 0 = no cap)', maxIn),
        field('Minimum Order Amount (₹)', minIn),
        field('Applicable Scope', scopeSel),
        field('Total Usage Limit', limitIn),
        field('Status', stSel)
      ]);

      d.foot.appendChild(btn('Save Coupon', 'cso-edu-btn--primary', async () => {
        try {
          const isFlat = typeSel.value === 'flat_paise';
          const payload = {
            code: codeIn.value.trim().toUpperCase(),
            title_en: titleIn.value.trim(),
            discount_type: typeSel.value,
            discount_value: isFlat ? Math.round(Number(valIn.value || 0) * 100) : Number(valIn.value || 0),
            max_discount_paise: Math.round(Number(maxIn.value || 0) * 100),
            min_order_paise: Math.round(Number(minIn.value || 0) * 100),
            applicable_scope: scopeSel.value,
            usage_limit_total: Number(limitIn.value || 0),
            status: stSel.value
          };
          if (c) await api(`${API}/coupons/${c.id}`, 'PATCH', payload);
          else await api(`${API}/coupons`, 'POST', payload);
          d.backdrop.remove();
          toast('Coupon saved', 'success');
          onDone();
        } catch (e) { toast(e.message, 'error'); }
      }));
      if (c) attachRevisions(d.body, '10', c.id, () => { d.backdrop.remove(); onDone(); });
    }

    function openCouponCalculatorModal() {
      const codeIn = textInput('text', 'ODISHA20', 'Coupon Code');
      const orderIn = textInput('number', '499.00', 'Cart Order Total (₹)');
      const resBox = el('div', 'cso-fin-calc-res');
      resBox.appendChild(el('span', 'cso-fin-meta', 'Enter coupon code and order amount to simulate calculation.'));

      const d = openDrawer('Interactive Coupon Simulator', [
        field('Coupon Code', codeIn),
        field('Order Subtotal (₹)', orderIn),
        resBox
      ]);

      d.foot.appendChild(btn('Calculate Discount', 'cso-edu-btn--primary', async () => {
        try {
          const res = await api(`${API}/coupons/validate`, 'POST', {
            code: codeIn.value.trim(),
            order_paise: Math.round(Number(orderIn.value || 0) * 100)
          });
          resBox.replaceChildren();
          if (res.valid) {
            resBox.append(
              el('div', 'cso-fin-amt', `Discount: - ${res.discount_inr}`),
              el('div', 'cso-fin-amt', `Final Payable: ${res.final_inr}`),
              el('div', 'cso-fin-meta', `Rule: ${res.coupon.discount_type === 'percent' ? res.coupon.discount_value + '%' : inr(res.coupon.discount_value)}`)
            );
          } else {
            resBox.appendChild(el('div', 'cso-edu-badge cso-edu-badge--warn', `Invalid: ${res.reason}`));
          }
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    load();
  }

  // ---------- Module 11: Refunds & Disputes ----------
  function renderRefundsModule(actions, tabsWrap, filters, content, loadKpis) {
    let caseStatus = '';
    if (actions) {
      actions.replaceChildren();
      actions.append(btn('+ File Refund / Dispute', 'cso-edu-btn--primary', () => openNewRefundModal(load)));
    }

    function drawTabs() {
      tabsWrap.replaceChildren();
      [['', 'All Cases'], ['open', 'Open'], ['under_review', 'Under Review'], ['approved_processed', 'Approved'], ['rejected', 'Rejected']].forEach(([s, l]) => {
        const b = el('button', `cso-edu-tab${s === caseStatus ? ' is-active' : ''}`, l);
        b.type = 'button';
        b.addEventListener('click', () => { caseStatus = s; load(); });
        tabsWrap.appendChild(b);
      });
    }

    async function load() {
      drawTabs();
      content.replaceChildren(el('div', 'cso-edu-empty', 'Loading refund cases...'));
      try {
        const p = caseStatus ? `?case_status=${caseStatus}` : '';
        const d = await api(`${API}/refunds${p}`);
        content.replaceChildren();
        if (!d.items.length) {
          content.appendChild(el('div', 'cso-edu-empty', 'No refund or dispute cases match.'));
          return;
        }
        const tbl = el('table', 'cso-edu-table');
        const thead = el('thead');
        thead.appendChild(el('tr', '', [
          el('th', '', 'Case / Order'), el('th', '', 'Customer'), el('th', '', 'Amount'),
          el('th', '', 'Reason'), el('th', '', 'Case Status'), el('th', '', 'Actions')
        ]));
        const tbody = el('tbody');
        d.items.forEach(r => {
          const acts = el('div', 'cso-edu-actions');
          acts.append(
            btn('View Case', '', () => openRefundCaseDetail(r, load))
          );
          if (r.case_status === 'open' || r.case_status === 'under_review') {
            acts.appendChild(btn('Approve & Revoke Access', 'cso-edu-btn--primary', async () => {
              try {
                await api(`${API}/refunds/${r.id}`, 'PATCH', { case_status: 'approved_processed', revoke_digital_access: true });
                toast('Refund approved and access revoked', 'success');
                load();
              } catch (e) { toast(e.message, 'error'); }
            }));
            acts.appendChild(btn('Reject', 'cso-edu-btn--danger', async () => {
              try {
                await api(`${API}/refunds/${r.id}`, 'PATCH', { case_status: 'rejected' });
                toast('Refund rejected', 'info');
                load();
              } catch (e) { toast(e.message, 'error'); }
            }));
          }
          const tr = el('tr', '', [
            el('td', '', `${r.case_number}\n${r.order_number || r.order_id}`),
            el('td', '', `${r.customer_name}\n${r.customer_email}`),
            el('td', 'cso-fin-amt', inr(r.amount_paise)),
            el('td', '', `${r.reason_code}\n${r.reason_notes || ''}`),
            el('td', '', el('span', `cso-edu-badge cso-edu-badge--${r.case_status === 'approved_processed' ? 'ok' : r.case_status === 'rejected' ? 'arch' : 'warn'}`, r.case_status)),
            el('td', '', acts)
          ]);
          tbody.appendChild(tr);
        });
        tbl.append(thead, tbody);
        content.appendChild(tbl);
      } catch (err) { content.replaceChildren(el('div', 'cso-edu-empty', err.message)); }
      loadKpis();
    }

    function openNewRefundModal(onDone) {
      const orderIn = textInput('text', '', 'Order ID (e.g. ford-001)');
      const amtIn = textInput('number', '499.00', 'Refund Amount in ₹');
      const rsnSel = selectOf([
        ['accidental_purchase', 'Accidental Purchase'],
        ['duplicate_payment', 'Duplicate Payment'],
        ['content_mismatch', 'Content Mismatch'],
        ['technical_access_issue', 'Technical Access Issue'],
        ['bank_chargeback', 'Bank Chargeback']
      ], 'accidental_purchase');
      const notesIn = el('textarea', 'cso-edu-textarea-full'); notesIn.placeholder = 'Candidate complaint notes';
      const revokeChk = el('input'); revokeChk.type = 'checkbox'; revokeChk.checked = true;
      const revokeLabel = el('label', 'cso-edu-toggle-row', [revokeChk, document.createTextNode(' Revoke candidate digital access upon approval')]);

      const d = openDrawer('File Refund / Dispute Request', [
        field('Order ID *', orderIn),
        field('Refund Amount (₹) *', amtIn),
        field('Reason Code *', rsnSel),
        field('Reason Notes', notesIn),
        revokeLabel
      ]);

      d.foot.appendChild(btn('Create Case', 'cso-edu-btn--primary', async () => {
        try {
          await api(`${API}/refunds`, 'POST', {
            order_id: orderIn.value.trim(),
            amount_paise: Math.round(Number(amtIn.value || 0) * 100),
            reason_code: rsnSel.value,
            reason_notes: notesIn.value.trim(),
            revoke_digital_access: revokeChk.checked
          });
          d.backdrop.remove();
          toast('Refund case opened', 'success');
          onDone();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    function openRefundCaseDetail(r, onDone) {
      const gwIn = textInput('text', r.gateway_refund_id || '', 'Gateway Refund ID (e.g. rfnd_RZP_123)');
      const evIn = el('textarea', 'cso-edu-textarea-full'); evIn.value = r.evidence_notes || '';
      const stSel = selectOf([['open', 'Open'], ['under_review', 'Under Review'], ['approved_processed', 'Approved'], ['rejected', 'Rejected'], ['won_dispute', 'Won Dispute'], ['lost_dispute', 'Lost Dispute']], r.case_status);

      const d = openDrawer(`Case ${r.case_number}`, [
        el('div', 'cso-fin-receipt', [
          el('dt', '', 'Order ID'), el('dd', '', r.order_id),
          el('dt', '', 'Customer'), el('dd', '', `${r.customer_name} (${r.customer_email})`),
          el('dt', '', 'Amount'), el('dd', '', inr(r.amount_paise)),
          el('dt', '', 'Reason'), el('dd', '', `${r.reason_code}: ${r.reason_notes || '—'}`),
          el('dt', '', 'Resolved By'), el('dd', '', r.resolved_by || 'Unresolved')
        ]),
        field('Gateway Refund ID', gwIn),
        field('Evidence / Investigation Notes', evIn),
        field('Case Status', stSel)
      ]);

      d.foot.appendChild(btn('Update Case', 'cso-edu-btn--primary', async () => {
        try {
          await api(`${API}/refunds/${r.id}`, 'PATCH', {
            gateway_refund_id: gwIn.value.trim(),
            evidence_notes: evIn.value.trim(),
            case_status: stSel.value
          });
          d.backdrop.remove();
          toast('Case updated', 'success');
          onDone();
        } catch (e) { toast(e.message, 'error'); }
      }));
      attachRevisions(d.body, '11', r.id, () => { d.backdrop.remove(); onDone(); });
    }

    load();
  }

  // ---------- Module 12: Invoices & Receipts ----------
  function renderInvoicesModule(actions, tabsWrap, filters, content, loadKpis) {
    if (actions) {
      actions.replaceChildren();
      actions.append(btn('+ Generate from Order', 'cso-edu-btn--primary', () => openGenerateFromOrderModal(load)));
    }

    async function load() {
      tabsWrap.replaceChildren();
      content.replaceChildren(el('div', 'cso-edu-empty', 'Loading invoices...'));
      try {
        const d = await api(`${API}/invoices`);
        content.replaceChildren();
        if (!d.items.length) {
          content.appendChild(el('div', 'cso-edu-empty', 'No GST invoices generated yet.'));
          return;
        }
        const tbl = el('table', 'cso-edu-table');
        const thead = el('thead');
        thead.appendChild(el('tr', '', [
          el('th', '', 'Invoice # / Date'), el('th', '', 'Customer / State'), el('th', '', 'Taxable'),
          el('th', '', 'CGST + SGST (9%+9%)'), el('th', '', 'IGST (18%)'), el('th', '', 'Total (INR)'), el('th', '', 'Status'), el('th', '', 'Actions')
        ]));
        const tbody = el('tbody');
        d.items.forEach(inv => {
          const acts = el('div', 'cso-edu-actions');
          acts.append(
            btn('Print Preview', '', () => openInvoicePrintModal(inv)),
            btn('Void', 'cso-edu-btn--danger', async () => {
              try { await api(`${API}/invoices/${inv.id}`, 'DELETE'); load(); }
              catch (e) { toast(e.message, 'error'); }
            })
          );
          const tr = el('tr', '', [
            el('td', 'cso-fin-amt', `${inv.invoice_number}\n${inv.issued_at.slice(0, 10)}`),
            el('td', '', `${inv.customer_name}\n${inv.customer_state}`),
            el('td', 'cso-fin-amt', inr(inv.taxable_paise)),
            el('td', 'cso-fin-amt', inv.cgst_paise ? `${inr(inv.cgst_paise)} + ${inr(inv.sgst_paise)}` : '—'),
            el('td', 'cso-fin-amt', inv.igst_paise ? inr(inv.igst_paise) : '—'),
            el('td', 'cso-fin-amt', inr(inv.total_paise)),
            el('td', '', el('span', `cso-edu-badge cso-edu-badge--${inv.status === 'issued' ? 'ok' : 'arch'}`, inv.status)),
            el('td', '', acts)
          ]);
          tbody.appendChild(tr);
        });
        tbl.append(thead, tbody);
        content.appendChild(tbl);
      } catch (err) { content.replaceChildren(el('div', 'cso-edu-empty', err.message)); }
      loadKpis();
    }

    function openGenerateFromOrderModal(onDone) {
      const orderIn = textInput('text', '', 'Order ID (e.g. ford-002)');
      const gstinIn = textInput('text', '', 'Customer GSTIN (Optional)');

      const d = openDrawer('Generate GST Invoice from Paid Order', [
        field('Order ID *', orderIn),
        field('Customer GSTIN', gstinIn)
      ]);

      d.foot.appendChild(btn('Generate Tax Invoice', 'cso-edu-btn--primary', async () => {
        try {
          await api(`${API}/invoices/generate-from-order`, 'POST', {
            order_id: orderIn.value.trim(),
            customer_gstin: gstinIn.value.trim()
          });
          d.backdrop.remove();
          toast('GST Tax Invoice generated', 'success');
          onDone();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    function openInvoicePrintModal(inv) {
      const sheet = el('div', 'cso-fin-inv-sheet');
      const head = el('div', 'cso-fin-inv-head', [
        el('div', '', [el('strong', '', 'COMMON SENSE ODISHA'), el('div', '', 'GSTIN: ' + inv.supplier_gstin), el('div', '', 'HSN/SAC: ' + inv.hsn_sac_code)]),
        el('div', '', [el('h3', '', 'TAX INVOICE'), el('div', '', 'Invoice: ' + inv.invoice_number), el('div', '', 'Date: ' + inv.issued_at.slice(0, 10))])
      ]);
      const grid = el('div', 'cso-fin-inv-grid', [
        el('div', '', [el('strong', '', 'Billed To:'), el('div', '', inv.customer_name), el('div', '', inv.customer_email), el('div', '', 'State: ' + inv.customer_state)]),
        el('div', '', [el('strong', '', 'Place of Supply:'), el('div', '', inv.customer_state), el('div', '', 'Customer GSTIN: ' + (inv.customer_gstin || 'Unregistered Candidate'))])
      ]);
      const table = el('table', 'cso-fin-inv-table');
      table.appendChild(el('thead', '', el('tr', '', [el('th', '', 'Item Description'), el('th', '', 'Qty'), el('th', '', 'Amount (INR)')])));
      const tbody = el('tbody');
      (inv.line_items || [{ title: 'Educational Study Pack', qty: 1 }]).forEach(i => {
        tbody.appendChild(el('tr', '', [el('td', '', i.title || i.title_en || 'Study Pack'), el('td', '', String(i.qty || 1)), el('td', '', inr(inv.taxable_paise))]));
      });
      table.appendChild(tbody);

      const totals = el('div', 'cso-fin-inv-totals', [
        el('div', 'cso-fin-inv-row', [el('span', '', 'Taxable Subtotal:'), el('strong', '', inr(inv.taxable_paise))]),
        el('div', 'cso-fin-inv-row', [el('span', '', 'CGST (9%):'), el('span', '', inr(inv.cgst_paise))]),
        el('div', 'cso-fin-inv-row', [el('span', '', 'SGST (9%):'), el('span', '', inr(inv.sgst_paise))]),
        el('div', 'cso-fin-inv-row', [el('span', '', 'IGST (18%):'), el('span', '', inr(inv.igst_paise))]),
        el('div', 'cso-fin-inv-row', [el('strong', '', 'Total Invoice Amount:'), el('strong', '', inr(inv.total_paise))])
      ]);

      sheet.append(head, grid, table, totals);
      const d = openDrawer(`Invoice ${inv.invoice_number}`, [sheet]);
      d.foot.append(
        btn('Print Invoice', 'cso-edu-btn--primary', () => window.print()),
        btn('Close Preview', '', () => d.backdrop.remove())
      );
    }

    load();
  }

  window.CSOPaymentsFinanceBatch3 = { render, MODULES };
})();
