/* Payments & Finance Batch 2 (05-08) Content Command Workspace — Strict CSP: no inline scripts/styles */
(() => {
  'use strict';

  const API = '/api/admin/finance';
  const TITLE = { 'paid-resources': 'title_en', products: 'title_en', subscriptions: 'name_en', memberships: 'tier_name_en' };
  const OPT = {
    access_model: [['one_time_purchase', 'One-time purchase'], ['freemium_preview', 'Freemium preview'], ['member_only', 'Member only']],
    source: [['01', '01 · Resource'], ['14', '14 · Mock Test'], ['16', '16 · Collection'], ['02', '02'], ['03', '03'], ['04', '04'], ['11', '11']],
    product_type: [['study_kit', 'Study kit'], ['mock_test_bundle', 'Mock test bundle'], ['ebook_pack', 'e-Book pack'], ['mentorship_session', 'Mentorship session'], ['foundation_batch', 'Foundation batch']],
    interval: [['monthly', 'Monthly'], ['quarterly', 'Quarterly'], ['half_yearly', 'Half-yearly'], ['annual', 'Annual']],
    tier: [['free_scholar', 'Free Scholar'], ['pro_aspirant', 'Pro Aspirant'], ['opsc_elite', 'OPSC Elite'], ['institutional', 'Institutional']],
    mock: [['free_only', 'Free mocks only'], ['all_mocks', 'All mocks'], ['all_mocks_plus_mentorship', 'All mocks + mentorship']],
    status: [['draft', 'Draft'], ['published', 'Published'], ['archived', 'Archived']]
  };
  // f: [key, label, kind]; kinds: text, area, paise (₹ input -> integer paise), int, select:<opt>, bool
  const MODULES = {
    'module-08-005': {
      num: '05', ep: 'paid-resources', title: 'Paid Resources', filter: ['access_model', 'All access models', OPT.access_model], picker: true,
      cols: ['Resource', 'Source', 'Access', 'Price', 'Sales'],
      row: it => [it.title_en, `${it.source_module_code} · ${it.source_entity_id || '—'}`, it.access_model, priceNode(it), `${it.sales_count} · ${inr(it.revenue_paise)}`],
      fields: [['title_en', 'Title (English)', 'text'], ['title_or', 'Title (Odia)', 'text'], ['access_model', 'Access model', 'select:access_model'],
        ['price_paise', 'Selling price (₹)', 'paise'], ['mrp_paise', 'MRP (₹)', 'paise'], ['gst_rate_pct', 'GST %', 'int'], ['preview_page_limit', 'Preview pages (freemium)', 'int'],
        ['validity_days', 'Validity days (0 = lifetime)', 'int'], ['featured', 'Featured', 'bool'], ['status', 'Status', 'select:status']],
      preview: it => ({ title: it.title_en, price: it.price_paise, mrp: it.mrp_paise, lines: [`Access: ${it.access_model}`, it.validity_days ? `${it.validity_days} days validity` : 'Lifetime access', it.preview_page_limit ? `${it.preview_page_limit}-page free preview` : ''] })
    },
    'module-08-006': {
      num: '06', ep: 'products', title: 'Products & Pricing', filter: ['product_type', 'All product types', OPT.product_type],
      cols: ['Product', 'SKU', 'Type', 'Price', 'GST / HSN', 'Sold'],
      row: it => [it.title_en, it.sku_code, it.product_type, priceNode(it), `${it.gst_rate_pct}% · ${it.hsn_sac_code}`, `${it.sold_count}${it.stock_or_seat_limit ? ' / ' + it.stock_or_seat_limit : ''}`],
      fields: [['sku_code', 'SKU code', 'text'], ['title_en', 'Title (English)', 'text'], ['title_or', 'Title (Odia)', 'text'], ['product_type', 'Product type', 'select:product_type'],
        ['summary_en', 'Summary (English)', 'area'], ['summary_or', 'Summary (Odia)', 'area'], ['price_paise', 'Selling price (₹)', 'paise'], ['mrp_paise', 'MRP (₹)', 'paise'],
        ['gst_rate_pct', 'GST %', 'int'], ['hsn_sac_code', 'HSN/SAC code', 'text'], ['stock_or_seat_limit', 'Stock / seats (0 = unlimited)', 'int'], ['featured', 'Featured', 'bool'],
        ['status', 'Status', 'select:status'], ['included_items', 'Included items', 'items']],
      preview: it => ({ title: it.title_en, price: it.price_paise, mrp: it.mrp_paise, lines: (it.included_items || []).map(i => i.title_en).concat([`SKU ${it.sku_code} · GST ${it.gst_rate_pct}%`]) })
    },
    'module-08-007': {
      num: '07', ep: 'subscriptions', title: 'Subscriptions', filter: ['billing_interval', 'All intervals', OPT.interval],
      cols: ['Plan', 'Code', 'Interval', 'Price', 'Trial', 'Subscribers'],
      row: it => [it.name_en, it.plan_code, it.billing_interval, priceNode(it), it.trial_days ? `${it.trial_days} days` : '—', it.active_subscribers_count],
      fields: [['plan_code', 'Plan code', 'text'], ['name_en', 'Name (English)', 'text'], ['name_or', 'Name (Odia)', 'text'], ['billing_interval', 'Billing interval', 'select:interval'],
        ['price_paise', 'Price (₹)', 'paise'], ['mrp_paise', 'MRP (₹)', 'paise'], ['trial_days', 'Trial days', 'int'], ['gst_rate_pct', 'GST %', 'int'],
        ['auto_renew_default', 'Auto-renew by default', 'bool'], ['featured', 'Featured', 'bool'], ['status', 'Status', 'select:status'], ['perks', 'Perks', 'perks']],
      preview: it => ({ title: it.name_en, price: it.price_paise, mrp: it.mrp_paise, per: it.billing_interval, lines: (it.perks || []).map(p => p.perk_en).concat(it.trial_days ? [`${it.trial_days}-day free trial`] : []) })
    },
    'module-08-008': {
      num: '08', ep: 'memberships', title: 'Memberships', filter: ['tier_code', 'All tiers', OPT.tier], compare: true,
      cols: ['Tier', 'Badge', 'Price', 'Duration', 'Downloads/day', 'Mocks', 'Members'],
      row: it => [it.tier_name_en, it.badge_label_en || '—', priceNode(it), `${it.duration_days} days`, it.download_quota_daily, it.mock_test_access_level, it.active_members_count],
      fields: [['tier_code', 'Tier code', 'select:tier'], ['tier_name_en', 'Tier name (English)', 'text'], ['tier_name_or', 'Tier name (Odia)', 'text'], ['badge_label_en', 'Badge (English)', 'text'],
        ['badge_label_or', 'Badge (Odia)', 'text'], ['price_paise', 'Price (₹)', 'paise'], ['duration_days', 'Duration days', 'int'], ['download_quota_daily', 'Daily download quota', 'int'],
        ['mock_test_access_level', 'Mock test access', 'select:mock'], ['offline_packs_allowed', 'Offline packs allowed', 'bool'], ['ad_free_experience', 'Ad-free experience', 'bool'],
        ['sort_order', 'Sort order', 'int'], ['status', 'Status', 'select:status']],
      preview: it => ({ title: it.tier_name_en, price: it.price_paise, mrp: 0, per: `${it.duration_days} days`, lines: [`${it.download_quota_daily} downloads / day`, `Mocks: ${it.mock_test_access_level}`, it.offline_packs_allowed ? 'Offline packs' : '', it.ad_free_experience ? 'Ad-free' : ''] })
    }
  };
  const MOD_ID = { 'paid-resources': '05', products: '06', subscriptions: '07', memberships: '08' };

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
    return '₹' + (Number(paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function priceNode(it) {
    const w = el('span');
    w.appendChild(el('span', 'cso-fin-price', inr(it.price_paise)));
    if (it.discount_pct > 0) {
      w.appendChild(el('span', 'cso-fin-mrp', inr(it.mrp_paise)));
      w.appendChild(el('span', 'cso-fin-discount', `${it.discount_pct}% OFF`));
    }
    return w;
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
  function pricingCard(spec) {
    const c = el('div', 'cso-fin-pricecard');
    c.appendChild(el('h3', '', spec.title));
    const price = el('div');
    price.appendChild(el('span', 'cso-fin-price', inr(spec.price)));
    if (spec.per) price.appendChild(document.createTextNode(` / ${spec.per.replace('_', '-')}`));
    if (spec.mrp > spec.price) {
      price.appendChild(el('span', 'cso-fin-mrp', inr(spec.mrp)));
      price.appendChild(el('span', 'cso-fin-discount', `${Math.round((spec.mrp - spec.price) * 100 / spec.mrp)}% OFF`));
    }
    c.appendChild(price);
    const ul = el('ul');
    (spec.lines || []).filter(Boolean).forEach(l => ul.appendChild(el('li', '', l)));
    c.appendChild(ul);
    return c;
  }

  function render(moduleId, root, actions) {
    const meta = MODULES[moduleId];
    if (!meta || !root) return false;
    const st = { status: '', q: '', filter: '', items: [], counts: {} };
    const wrap = el('div', 'cso-edu-wrap');
    const kpis = el('div', 'cso-edu-kpis');
    const toolbar = el('div', 'cso-edu-toolbar');
    const tabsWrap = el('div', 'cso-edu-tabs');
    const filters = el('div', 'cso-edu-filters');
    const bulk = el('div', 'cso-edu-bulkbar');
    const content = el('div', 'cso-edu-table-wrap');
    toolbar.append(tabsWrap, filters);
    wrap.append(kpis, toolbar, bulk, content);
    root.replaceChildren(wrap);
    const selected = new Set();

    if (actions) {
      actions.replaceChildren();
      actions.appendChild(btn('+ Create New', 'cso-edu-btn--primary', () => openEditor(null)));
      if (meta.compare) actions.appendChild(btn('Compare Tiers', '', openCompare));
    }

    const q = textInput('search', st.q, 'Search…');
    q.addEventListener('keydown', e => { if (e.key === 'Enter') { st.q = q.value.trim(); load(); } });
    const fsel = selectOf([['', meta.filter[1]], ...meta.filter[2]], '');
    fsel.addEventListener('change', () => { st.filter = fsel.value; load(); });
    filters.append(q, fsel);

    async function loadKpis() {
      try {
        const o = await api(`${API}/overview`);
        kpis.replaceChildren();
        [['Paid Resources', o.paid_resources_count], ['Active SKUs', o.active_product_skus], ['Active Subscribers', o.active_subscribers],
          ['Active Members', o.active_members], ['MRR Estimate', inr(o.mrr_estimate_paise)]].forEach(([l, v]) => {
          const c = el('div', 'cso-edu-kpi'); c.append(el('div', 'cso-edu-kpi-lbl', l), el('div', 'cso-edu-kpi-val', v)); kpis.appendChild(c);
        });
      } catch (e) { kpis.replaceChildren(el('div', 'cso-edu-empty', e.message)); }
    }

    async function load() {
      const p = new URLSearchParams();
      if (st.status) p.set('status', st.status);
      if (st.q) p.set('q', st.q);
      if (st.filter) p.set(meta.filter[0], st.filter);
      try {
        const d = await api(`${API}/${meta.ep}?${p}`);
        st.items = d.items; st.counts = d.counts || {};
        selected.clear();
        drawTabs(); drawBulk(); drawTable();
      } catch (e) { content.replaceChildren(el('div', 'cso-edu-empty', e.message)); }
      loadKpis();
    }

    function drawTabs() {
      tabsWrap.replaceChildren();
      [['', 'All', st.counts.all], ['published', 'Published', st.counts.published], ['draft', 'Drafts', st.counts.draft], ['archived', 'Archived', st.counts.archived]].forEach(([v, l, n]) => {
        const t = el('button', `cso-edu-tab${v === st.status ? ' is-active' : ''}`, `${l} (${n || 0})`);
        t.type = 'button';
        t.addEventListener('click', () => { st.status = v; load(); });
        tabsWrap.appendChild(t);
      });
    }

    function drawBulk() {
      bulk.replaceChildren();
      const run = status => async () => {
        if (!selected.size) { toast('Select rows first', 'info'); return; }
        try {
          const r = await api(`${API}/${meta.ep}`, 'PATCH', { action: 'bulk_status', ids: [...selected], status });
          toast(`${r.updated} updated${r.skipped.length ? `, ${r.skipped.length} skipped` : ''}`, r.skipped.length ? 'info' : 'success');
          load();
        } catch (e) { toast(e.message, 'error'); }
      };
      bulk.append(btn('Publish selected', '', run('published')), btn('Move to drafts', '', run('draft')), btn('Archive selected', 'cso-edu-btn--danger', run('archived')));
      if (meta.ep === 'memberships') {
        bulk.appendChild(btn('Reverse order', '', async () => {
          try { await api(`${API}/memberships`, 'PATCH', { action: 'reorder', ids: st.items.map(i => i.id).reverse() }); load(); } catch (e) { toast(e.message, 'error'); }
        }));
      }
    }

    function drawTable() {
      content.replaceChildren();
      if (!st.items.length) { content.appendChild(el('div', 'cso-edu-empty', `No ${meta.title.toLowerCase()} match. Use + Create New.`)); return; }
      const tbl = el('table', 'cso-edu-table');
      const hr = el('tr');
      const all = el('input'); all.type = 'checkbox';
      all.addEventListener('change', () => {
        selected.clear();
        if (all.checked) st.items.forEach(i => selected.add(i.id));
        tbl.querySelectorAll('tbody input[type="checkbox"]').forEach(c => { c.checked = all.checked; });
      });
      const th0 = el('th'); th0.appendChild(all); hr.appendChild(th0);
      [...meta.cols, 'Status', 'Actions'].forEach(c => hr.appendChild(el('th', '', c)));
      const thead = el('thead'); thead.appendChild(hr);
      const tbody = el('tbody');
      st.items.forEach(it => {
        const tr = el('tr');
        const c0 = el('td'); const chk = el('input'); chk.type = 'checkbox';
        chk.addEventListener('change', () => { if (chk.checked) selected.add(it.id); else selected.delete(it.id); });
        c0.appendChild(chk); tr.appendChild(c0);
        meta.row(it).forEach(cell => {
          const td = el('td');
          if (cell instanceof Node) td.appendChild(cell); else td.textContent = cell === null || cell === undefined ? '' : String(cell);
          tr.appendChild(td);
        });
        const ts = el('td');
        ts.appendChild(el('span', `cso-edu-badge cso-edu-badge--${it.status === 'published' ? 'pub' : it.status === 'archived' ? 'arch' : 'draft'}`, it.status));
        if (it.featured) ts.appendChild(el('span', 'cso-edu-badge cso-edu-badge--warn', '★'));
        tr.appendChild(ts);
        const ta = el('td', 'cso-edu-actions');
        ta.append(
          btn('Edit', '', () => openEditor(it)),
          btn('Clone', '', async () => { try { await api(`${API}/${meta.ep}/${it.id}`, 'POST', { action: 'clone' }); toast('Cloned as draft', 'success'); load(); } catch (e) { toast(e.message, 'error'); } }),
          btn(it.status === 'published' ? 'Unpublish' : 'Publish', '', async () => {
            try { await api(`${API}/${meta.ep}/${it.id}`, 'PATCH', { status: it.status === 'published' ? 'draft' : 'published' }); load(); } catch (e) { toast(e.message, 'error'); }
          }),
          btn('Preview', '', () => openPreview(it)),
          btn('Archive', 'cso-edu-btn--danger', async () => { try { await api(`${API}/${meta.ep}/${it.id}`, 'DELETE'); load(); } catch (e) { toast(e.message, 'error'); } })
        );
        tr.appendChild(ta);
        tbody.appendChild(tr);
      });
      tbl.append(thead, tbody);
      content.appendChild(tbl);
    }

    function openPreview(it) {
      const d = openDrawer(`Live Pricing Card — ${it[TITLE[meta.ep]]}`, [pricingCard(meta.preview(it))]);
      d.foot.appendChild(btn('Close', '', () => d.backdrop.remove()));
    }

    function openCompare() {
      const published = st.items.filter(i => i.status === 'published').sort((a, b) => a.sort_order - b.sort_order);
      const grid = el('div', 'cso-fin-compare');
      if (!published.length) grid.appendChild(el('div', 'cso-edu-empty', 'No published tiers to compare.'));
      const yn = v => el('div', v ? 'cso-fin-yes' : 'cso-fin-no', v ? '✓ Included' : '✗ Not included');
      published.forEach(t => {
        const col = el('div', 'cso-fin-compare-col');
        col.append(el('h4', '', `${t.tier_name_en}${t.badge_label_en ? ` · ${t.badge_label_en}` : ''}`), el('div', 'cso-fin-price', inr(t.price_paise)),
          el('div', '', `${t.duration_days} days`), el('div', '', `${t.download_quota_daily} downloads / day`), el('div', '', `Mocks: ${t.mock_test_access_level}`),
          el('div', 'cso-edu-label', 'Offline packs'), yn(t.offline_packs_allowed), el('div', 'cso-edu-label', 'Ad-free'), yn(t.ad_free_experience), el('div', 'cso-edu-label', `${t.active_members_count} members`));
        grid.appendChild(col);
      });
      const d = openDrawer('Membership Tier Comparison', [grid]);
      d.foot.appendChild(btn('Close', '', () => d.backdrop.remove()));
    }

    function openEditor(it) {
      const inputs = {};
      const nodes = [];
      let pickerBox = null;
      meta.fields.forEach(([key, label, kind]) => {
        let node;
        if (kind === 'text') node = textInput('text', it ? it[key] : '');
        else if (kind === 'area') { node = el('textarea', 'cso-edu-textarea-full'); node.value = it ? it[key] || '' : ''; }
        else if (kind === 'paise') node = textInput('number', it ? (it[key] / 100).toFixed(2) : '0.00');
        else if (kind === 'int') node = textInput('number', it ? it[key] : '');
        else if (kind === 'bool') { node = el('input'); node.type = 'checkbox'; node.checked = !!(it && it[key]); }
        else if (kind.startsWith('select:')) node = selectOf(OPT[kind.slice(7)], it ? it[key] : undefined);
        else if (kind === 'perks') node = perksBuilder(it ? it.perks : []);
        else if (kind === 'items') node = itemsBuilder(it ? it.included_items : []);
        inputs[key] = { node, kind };
        if (!it && kind === 'int' && key === 'gst_rate_pct') node.value = 18;
        if (!it && kind === 'int' && key === 'duration_days') node.value = 365;
        if (!it && kind === 'int' && key !== 'gst_rate_pct' && key !== 'duration_days' && key !== 'sort_order') node.value = 0;
        if (!it && key === 'sort_order') node.value = 100;
        nodes.push(kind === 'bool' ? field(label, node) : field(label, node.root || node));
      });

      let source = { source_module_code: it ? it.source_module_code : '01', source_entity_id: it ? it.source_entity_id : '' };
      if (meta.picker) {
        const sIn = textInput('search', '', 'Search Educational Resources, Mock Tests, Collections…');
        const list = el('div', 'cso-fin-picker');
        const info = el('div', 'cso-fin-meta', source.source_entity_id ? `Linked: ${source.source_module_code} · ${source.source_entity_id}` : 'No resource linked yet');
        const search = async () => {
          try {
            const d = await api(`${API}/paid-resources/search-edu?q=${encodeURIComponent(sIn.value.trim())}`);
            list.replaceChildren();
            if (!d.items.length) list.appendChild(el('div', 'cso-edu-empty', 'No matching study resources.'));
            d.items.forEach(r => {
              const row = el('div', 'cso-fin-picker-item');
              row.appendChild(el('span', '', `[${r.source_module_code} ${r.source_kind}] ${r.title_en}${r.already_paid ? ' — already paid' : ''}`));
              row.appendChild(btn('Monetize', 'cso-edu-btn--primary', () => {
                source = { source_module_code: r.source_module_code, source_entity_id: r.source_entity_id };
                info.textContent = `Linked: ${r.source_module_code} · ${r.source_entity_id}`;
                if (!inputs.title_en.node.value) inputs.title_en.node.value = r.title_en;
                if (!inputs.title_or.node.value) inputs.title_or.node.value = r.title_or;
              }));
              list.appendChild(row);
            });
          } catch (e) { toast(e.message, 'error'); }
        };
        sIn.addEventListener('keydown', e => { if (e.key === 'Enter') search(); });
        pickerBox = el('div', 'cso-edu-section-box');
        pickerBox.append(el('div', 'cso-edu-section-title', 'Educational Resource picker'), sIn, btn('Search', '', search), info, list);
        search();
      }

      const d = openDrawer(it ? `Edit ${it[TITLE[meta.ep]]}` : `Create ${meta.title}`, pickerBox ? [pickerBox, ...nodes] : nodes);
      d.foot.appendChild(btn('Save', 'cso-edu-btn--primary', async () => {
        const payload = {};
        for (const [key, { node, kind }] of Object.entries(inputs)) {
          if (kind === 'bool') payload[key] = node.checked;
          else if (kind === 'paise') payload[key] = Math.round(Number(node.value || 0) * 100);
          else if (kind === 'int') payload[key] = Number(node.value || 0);
          else if (kind === 'perks' || kind === 'items') payload[key] = node.read();
          else payload[key] = node.value;
        }
        if (meta.picker) Object.assign(payload, source);
        try {
          if (it) await api(`${API}/${meta.ep}/${it.id}`, 'PUT', payload); else await api(`${API}/${meta.ep}`, 'POST', payload);
          d.backdrop.remove(); toast('Saved', 'success'); load();
        } catch (e) { toast(e.message, 'error'); }
      }));
      if (it) {
        const hist = el('div', 'cso-edu-rev-list');
        d.body.append(el('div', 'cso-edu-section-title', 'Revision history'), hist);
        api(`${API}/revisions?module_code=${MOD_ID[meta.ep]}&entity_id=${encodeURIComponent(it.id)}`).then(r => {
          if (!r.items.length) hist.appendChild(el('div', 'cso-edu-empty', 'No revisions yet.'));
          r.items.slice(0, 8).forEach(rev => {
            const row = el('div', 'cso-edu-rev-item');
            row.appendChild(el('span', '', `v${rev.version_num} · ${rev.change_note || 'update'} · ${rev.created_at}`));
            row.appendChild(btn('Rollback', '', async () => {
              try { await api(`${API}/revisions/rollback`, 'POST', { revision_id: rev.id }); toast(`Rolled back to v${rev.version_num}`, 'success'); d.backdrop.remove(); load(); } catch (e) { toast(e.message, 'error'); }
            }));
            hist.appendChild(row);
          });
        }).catch(e => hist.appendChild(el('div', 'cso-edu-empty', e.message)));
      }
    }

    // Row-based builders (no inline styles)
    function perksBuilder(initial) {
      const box = el('div'); const rows = el('div');
      const add = (en, or) => {
        const r = el('div', 'cso-fin-perk-row');
        const a = textInput('text', en || '', 'Perk (English)'); const b = textInput('text', or || '', 'ପର୍କ (Odia)');
        r.append(a, b, btn('✕', 'cso-edu-btn--danger', () => r.remove()));
        r._a = a; r._b = b; rows.appendChild(r);
      };
      (initial || []).forEach(p => add(p.perk_en, p.perk_or));
      box.append(rows, btn('+ Add perk', '', () => add('', '')));
      return { root: box, read: () => [...rows.children].filter(r => r._a.value.trim()).map(r => ({ perk_en: r._a.value.trim(), perk_or: r._b.value.trim() })) };
    }
    function itemsBuilder(initial) {
      const box = el('div'); const rows = el('div');
      const add = (m, id, t) => {
        const r = el('div', 'cso-fin-perk-row');
        const a = textInput('text', t || '', 'Item title'); const b = textInput('text', `${m || ''}${id ? ':' + id : ''}`, 'module:item_id (e.g. 14:edu-mock-…)');
        r.append(a, b, btn('✕', 'cso-edu-btn--danger', () => r.remove()));
        r._a = a; r._b = b; rows.appendChild(r);
      };
      (initial || []).forEach(i => add(i.module_code, i.item_id, i.title_en));
      box.append(rows, btn('+ Add included item', '', () => add('', '', '')));
      return {
        root: box,
        read: () => [...rows.children].filter(r => r._a.value.trim()).map(r => {
          const [m, ...rest] = r._b.value.split(':');
          return { module_code: (rest.length ? m : '').trim(), item_id: (rest.length ? rest.join(':') : m).trim(), title_en: r._a.value.trim() };
        })
      };
    }

    load();
    return true;
  }

  window.CSOPaymentsFinanceBatch2 = { render, MODULES };
})();
