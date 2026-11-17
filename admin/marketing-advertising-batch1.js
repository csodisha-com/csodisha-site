/* Marketing & Advertising Batch 1 (01-04) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/marketing';
  const MODULES = {
    'module-12-001': { num: '01', title: 'Advertising Placements' },
    'module-12-002': { num: '02', title: 'Sponsors' },
    'module-12-003': { num: '03', title: 'Promotional Banners' },
    'module-12-004': { num: '04', title: 'Campaigns' }
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
    if (st === 'active' || st === 'active_live' || st === 'completed') cls += ' is-active';
    else if (st === 'draft' || st === 'scheduled' || st === 'pending_approval' || st === 'reserved_sponsor' || st === 'paused') cls += ' is-pending';
    else if (st === 'expired' || st === 'archived' || st === 'renewal_due') cls += ' is-danger';
    return el('span', cls, st);
  }

  function progressBar(pct, labelText) {
    const p = document.createElement('progress');
    p.className = 'cso-urc-progress';
    p.max = 100;
    p.value = Math.min(100, Math.max(0, Number(pct || 0)));
    return el('span', '', [p, document.createTextNode(` ${labelText || `${p.value}%`}`)]);
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
      el('div', 'cso-edu-kicker', `Marketing & Advertising · Module ${info.num} of 10`),
      el('h2', 'cso-edu-title', info.title),
      el('p', 'cso-edu-sub', subtitle)
    );
    const right = el('div', 'cso-edu-actions');
    (extraBtns || []).forEach(b => right.appendChild(b));
    bar.append(left, right);
    return bar;
  }

  /* ==================== MODULE 01: ADVERTISING PLACEMENTS ==================== */
  async function renderPlacements(root) {
    let curSection = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-12-001', 'Portal ad slots across Study Library, Jobs & Careers, Schemes, and Mock Tests with INR ₹ pricing.', [
        btn('+ New Placement', 'cso-edu-btn-primary', () => openPlacementDrawer(null))
      ]));

      const tabs = el('div', 'cso-edu-tabs');
      [['', 'All'], ['study-library', 'Study Library'], ['jobs-careers', 'Jobs & Careers'], ['schemes', 'Schemes'], ['educational-tools', 'Mock Tests']].forEach(([v, l]) => {
        tabs.appendChild(btn(l, `cso-edu-tab ${curSection === v ? 'is-active' : ''}`, () => { curSection = v; draw(); }));
      });
      root.appendChild(el('div', 'cso-edu-toolbar', [tabs]));

      const qs = curSection ? `?portal_section=${encodeURIComponent(curSection)}` : '';
      const data = await api(`${API}/placements${qs}`);
      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Slot Code', 'Placement Name', 'Section / Zone', 'Pricing (INR)', '30d CTR', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(p => {
        const nextSt = p.slot_status === 'active' ? 'paused' : 'active';
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', p.slot_code),
          el('td', '', `${p.slot_name_en} (${p.dimensions_label})`),
          el('td', '', `${p.portal_section} · ${p.position_zone}`),
          el('td', '', `${p.pricing_model} · ${p.rate_inr}`),
          el('td', '', `${p.ctr_pct}% (${p.clicks_30d}/${p.impressions_30d})`),
          el('td', '', statusBadge(p.slot_status)),
          el('td', 'cso-edu-row-actions', [
            btn('Edit', 'cso-edu-btn-sm', () => openPlacementDrawer(p)),
            btn(p.slot_status === 'active' ? 'Pause' : 'Activate', 'cso-edu-btn-sm', async () => {
              try {
                await api(`${API}/placements/${encodeURIComponent(p.id)}/status`, 'PATCH', { slot_status: nextSt });
                toast(`Slot ${nextSt}`, 'success');
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

    function openPlacementDrawer(item) {
      const isEdit = Boolean(item);
      const nameEn = textInput('text', item ? item.slot_name_en : '', 'Slot name (EN)');
      const nameOr = textInput('text', item ? item.slot_name_or : '', 'Slot name (OR)');
      const secSel = selectOf([
        ['study-library', 'study-library'], ['jobs-careers', 'jobs-careers'],
        ['schemes', 'schemes'], ['educational-tools', 'educational-tools'],
        ['community', 'community'], ['home', 'home']
      ], item ? item.portal_section : 'study-library');
      const zoneSel = selectOf([
        ['top_leaderboard', 'top_leaderboard'], ['sidebar_card', 'sidebar_card'],
        ['in_feed_native', 'in_feed_native'], ['pdf_viewer_footer', 'pdf_viewer_footer'],
        ['mock_test_interstitial', 'mock_test_interstitial']
      ], item ? item.position_zone : 'top_leaderboard');
      const dimIn = textInput('text', item ? item.dimensions_label : '728x90 / Responsive', 'Dimensions');
      const modelSel = selectOf([['cpm_paise', 'cpm_paise'], ['cpc_paise', 'cpc_paise'], ['flat_weekly_paise', 'flat_weekly_paise']], item ? item.pricing_model : 'cpm_paise');
      const rateIn = textInput('number', item ? String(item.rate_paise) : '4500', 'Rate in integer paise');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Placement · ${item.slot_code}` : 'New Advertising Placement', [
        field('Slot Name (English)', nameEn),
        field('Slot Name (Odia)', nameOr),
        field('Portal Section', secSel),
        field('Position Zone', zoneSel),
        field('Dimensions Label', dimIn),
        field('Pricing Model', modelSel),
        field('Rate (Paise · ₹1 = 100 paise)', rateIn)
      ]);
      if (isEdit) attachRevisions(body, '01', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Placement' : 'Create Placement', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            slot_name_en: nameEn.value.trim(),
            slot_name_or: nameOr.value.trim(),
            portal_section: secSel.value,
            position_zone: zoneSel.value,
            dimensions_label: dimIn.value.trim(),
            pricing_model: modelSel.value,
            rate_paise: Math.max(0, Math.round(Number(rateIn.value || 0)))
          };
          if (isEdit) await api(`${API}/placements/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/placements`, 'POST', payload);
          toast('Placement saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 02: SPONSORS ==================== */
  async function renderSponsors(root) {
    let curStatus = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-12-002', 'Odisha educational institutes, publishers, and CSR sponsors with INR ₹ contract tracking.', [
        btn('+ Add Sponsor', 'cso-edu-btn-primary', () => openSponsorDrawer(null))
      ]));

      const tabs = el('div', 'cso-edu-tabs');
      [['', 'All'], ['active', 'Active'], ['pending_approval', 'Pending Approval'], ['renewal_due', 'Renewal Due']].forEach(([v, l]) => {
        tabs.appendChild(btn(l, `cso-edu-tab ${curStatus === v ? 'is-active' : ''}`, () => { curStatus = v; draw(); }));
      });
      root.appendChild(el('div', 'cso-edu-toolbar', [tabs]));

      const qs = curStatus ? `?sponsor_status=${encodeURIComponent(curStatus)}` : '';
      const data = await api(`${API}/sponsors${qs}`);
      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code', 'Organization / Brand', 'Tier', 'Contract vs Paid (INR)', 'GSTIN (Masked)', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(s => {
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', s.sponsor_code),
          el('td', '', `${s.organization_name} (${s.brand_display_en})`),
          el('td', '', s.sponsorship_tier),
          el('td', '', progressBar(s.paid_pct, `${s.amount_paid_inr} / ${s.contract_value_inr}`)),
          el('td', 'cso-edu-mono', s.gstin_masked || '—'),
          el('td', '', statusBadge(s.sponsor_status)),
          el('td', 'cso-edu-row-actions', [
            btn('Edit', 'cso-edu-btn-sm', () => openSponsorDrawer(s))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openSponsorDrawer(item) {
      const isEdit = Boolean(item);
      const orgIn = textInput('text', item ? item.organization_name : '', 'Organization name');
      const brandEnIn = textInput('text', item ? item.brand_display_en : '', 'Brand display (EN)');
      const catSel = selectOf([
        ['odisha_edtech_institute', 'odisha_edtech_institute'], ['university_college', 'university_college'],
        ['book_publisher', 'book_publisher'], ['skill_academy', 'skill_academy'], ['csr_foundation', 'csr_foundation']
      ], item ? item.sponsor_category : 'odisha_edtech_institute');
      const tierSel = selectOf([
        ['title_partner', 'title_partner'], ['gold_sponsor', 'gold_sponsor'],
        ['portal_sponsor', 'portal_sponsor'], ['scholarship_supporter', 'scholarship_supporter']
      ], item ? item.sponsorship_tier : 'portal_sponsor');
      const cvIn = textInput('number', item ? String(item.contract_value_paise) : '5000000', 'Contract value in paise');
      const pvIn = textInput('number', item ? String(item.amount_paid_paise) : '2500000', 'Amount paid in paise');
      const gstIn = textInput('text', item ? item.gstin_masked : '', 'Optional GSTIN (auto-masked)');
      const stSel = selectOf([['active', 'active'], ['pending_approval', 'pending_approval'], ['renewal_due', 'renewal_due'], ['expired', 'expired']], item ? item.sponsor_status : 'active');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Sponsor · ${item.sponsor_code}` : 'Add Odisha Sponsor', [
        field('Organization Name', orgIn),
        field('Brand Display (EN)', brandEnIn),
        field('Category', catSel),
        field('Sponsorship Tier', tierSel),
        field('Contract Value (Paise)', cvIn),
        field('Amount Paid (Paise)', pvIn),
        field('GSTIN (Masked on save)', gstIn),
        field('Status', stSel)
      ]);
      if (isEdit) attachRevisions(body, '02', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Sponsor' : 'Create Sponsor', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            organization_name: orgIn.value.trim(),
            brand_display_en: brandEnIn.value.trim() || orgIn.value.trim(),
            sponsor_category: catSel.value,
            sponsorship_tier: tierSel.value,
            contract_value_paise: Math.max(0, Math.round(Number(cvIn.value || 0))),
            amount_paid_paise: Math.max(0, Math.round(Number(pvIn.value || 0))),
            gstin: gstIn.value.trim(),
            sponsor_status: stSel.value
          };
          if (isEdit) await api(`${API}/sponsors/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/sponsors`, 'POST', payload);
          toast('Sponsor saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 03: PROMOTIONAL BANNERS ==================== */
  async function renderBanners(root) {
    let curStatus = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-12-003', 'Bilingual EN/OR promotional banners with pure CSS themes and zero inline script injection.', [
        btn('+ Create Banner', 'cso-edu-btn-primary', () => openBannerDrawer(null))
      ]));

      const tabs = el('div', 'cso-edu-tabs');
      [['', 'All'], ['active_live', 'Active Live'], ['scheduled', 'Scheduled'], ['draft', 'Drafts'], ['paused', 'Paused']].forEach(([v, l]) => {
        tabs.appendChild(btn(l, `cso-edu-tab ${curStatus === v ? 'is-active' : ''}`, () => { curStatus = v; draw(); }));
      });
      root.appendChild(el('div', 'cso-edu-toolbar', [tabs]));

      const qs = curStatus ? `?banner_status=${encodeURIComponent(curStatus)}` : '';
      const data = await api(`${API}/banners${qs}`);
      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code', 'Headline (EN)', 'Placement / Theme', 'CTR', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(b => {
        const nextSt = b.banner_status === 'active_live' ? 'paused' : 'active_live';
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', b.banner_code),
          el('td', '', b.headline_en),
          el('td', '', `${b.slot_code || 'unassigned'} · ${b.theme_variant}`),
          el('td', '', `${b.ctr_pct}% (${b.clicks_count}/${b.impressions_count})`),
          el('td', '', statusBadge(b.banner_status)),
          el('td', 'cso-edu-row-actions', [
            btn('Preview EN/OR', 'cso-edu-btn-sm', () => openPreviewDrawer(b)),
            btn('Edit', 'cso-edu-btn-sm', () => openBannerDrawer(b)),
            btn(b.banner_status === 'active_live' ? 'Pause' : 'Go Live', 'cso-edu-btn-sm', async () => {
              try {
                await api(`${API}/banners/${encodeURIComponent(b.id)}/status`, 'PATCH', { banner_status: nextSt });
                toast(`Banner ${nextSt}`, 'success');
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

    function openPreviewDrawer(b) {
      const enCard = el('div', `cso-mkt-banner-preview theme-${b.theme_variant || 'forest_gold'}`, [
        el('span', 'cso-mkt-banner-badge', b.badge_tag_en || 'Sponsored'),
        el('h4', 'cso-mkt-banner-head', b.headline_en),
        el('p', 'cso-mkt-banner-sub', b.subcopy_en || ''),
        el('span', 'cso-mkt-banner-cta', b.cta_label_en || 'Learn More')
      ]);
      const orCard = el('div', `cso-mkt-banner-preview theme-${b.theme_variant || 'forest_gold'}`, [
        el('span', 'cso-mkt-banner-badge', b.badge_tag_or || 'ପ୍ରାୟୋଜିତ'),
        el('h4', 'cso-mkt-banner-head', b.headline_or || b.headline_en),
        el('p', 'cso-mkt-banner-sub', b.subcopy_or || b.subcopy_en || ''),
        el('span', 'cso-mkt-banner-cta', b.cta_label_or || 'ଅଧିକ ଜାଣନ୍ତୁ')
      ]);
      openDrawer(`Bilingual Banner Preview · ${b.banner_code}`, [
        el('div', 'cso-edu-label', 'English Preview'), enCard,
        el('div', 'cso-edu-label', 'Odia (ଓଡ଼ିଆ) Preview'), orCard
      ]);
    }

    function openBannerDrawer(item) {
      const isEdit = Boolean(item);
      const hEn = textInput('text', item ? item.headline_en : '', 'Headline (EN)');
      const hOr = textInput('text', item ? item.headline_or : '', 'Headline (OR)');
      const sEn = textareaOf(item ? item.subcopy_en : '', 'Subcopy (EN)');
      const sOr = textareaOf(item ? item.subcopy_or : '', 'Subcopy (OR)');
      const ctaEn = textInput('text', item ? item.cta_label_en : 'Learn More', 'CTA (EN)');
      const urlIn = textInput('url', item ? item.target_url : 'https://csodisha.com/mock-tests/', 'https://...');
      const thSel = selectOf([
        ['forest_gold', 'forest_gold'], ['alabaster_emerald', 'alabaster_emerald'],
        ['amber_highlight', 'amber_highlight'], ['royal_indigo', 'royal_indigo']
      ], item ? item.theme_variant : 'forest_gold');
      const stSel = selectOf([['draft', 'draft'], ['scheduled', 'scheduled'], ['active_live', 'active_live'], ['paused', 'paused']], item ? item.banner_status : 'draft');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Banner · ${item.banner_code}` : 'Create Promotional Banner', [
        field('Headline (English)', hEn),
        field('Headline (Odia)', hOr),
        field('Subcopy (English)', sEn),
        field('Subcopy (Odia)', sOr),
        field('CTA Label (English)', ctaEn),
        field('Target URL', urlIn),
        field('Theme Variant', thSel),
        field('Status', stSel)
      ]);
      if (isEdit) attachRevisions(body, '03', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Banner' : 'Create Banner', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            headline_en: hEn.value.trim(),
            headline_or: hOr.value.trim(),
            subcopy_en: sEn.value.trim(),
            subcopy_or: sOr.value.trim(),
            cta_label_en: ctaEn.value.trim(),
            target_url: urlIn.value.trim(),
            theme_variant: thSel.value,
            banner_status: stSel.value
          };
          if (isEdit) await api(`${API}/banners/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/banners`, 'POST', payload);
          toast('Banner saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 04: CAMPAIGNS ==================== */
  async function renderCampaigns(root) {
    let curStatus = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-12-004', 'Multi-channel Odisha aspirant campaigns with INR ₹ budget burn and conversion meters.', [
        btn('+ Launch Campaign', 'cso-edu-btn-primary', () => openCampaignDrawer(null))
      ]));

      const tabs = el('div', 'cso-edu-tabs');
      [['', 'All'], ['active', 'Active'], ['draft', 'Draft'], ['paused', 'Paused'], ['completed', 'Completed']].forEach(([v, l]) => {
        tabs.appendChild(btn(l, `cso-edu-tab ${curStatus === v ? 'is-active' : ''}`, () => { curStatus = v; draw(); }));
      });
      root.appendChild(el('div', 'cso-edu-toolbar', [tabs]));

      const qs = curStatus ? `?campaign_status=${encodeURIComponent(curStatus)}` : '';
      const data = await api(`${API}/campaigns${qs}`);
      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code', 'Campaign / Audience', 'Objective', 'Budget Burn (INR)', 'Conversions', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(c => {
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', c.campaign_code),
          el('td', '', `${c.campaign_name_en} (${c.target_exam_audience})`),
          el('td', '', c.objective),
          el('td', '', progressBar(c.budget_used_pct, `${c.spent_inr} / ${c.budget_inr}`)),
          el('td', '', progressBar(c.conversion_pct, `${c.actual_conversions}/${c.target_conversions}`)),
          el('td', '', statusBadge(c.campaign_status)),
          el('td', 'cso-edu-row-actions', [
            btn('Edit', 'cso-edu-btn-sm', () => openCampaignDrawer(c))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openCampaignDrawer(item) {
      const isEdit = Boolean(item);
      const nameEn = textInput('text', item ? item.campaign_name_en : '', 'Campaign name (EN)');
      const nameOr = textInput('text', item ? item.campaign_name_or : '', 'Campaign name (OR)');
      const objSel = selectOf([
        ['mock_test_enrollment', 'mock_test_enrollment'], ['study_library_traffic', 'study_library_traffic'],
        ['sponsor_brand_awareness', 'sponsor_brand_awareness'], ['scholarship_drive', 'scholarship_drive'],
        ['app_pwa_install', 'app_pwa_install']
      ], item ? item.objective : 'mock_test_enrollment');
      const audSel = selectOf([
        ['OPSC OAS', 'OPSC OAS'], ['OSSC/OSSSC', 'OSSC/OSSSC'], ['UGC NET', 'UGC NET'],
        ['CHSE +2', 'CHSE +2'], ['All Odisha Aspirants', 'All Odisha Aspirants']
      ], item ? item.target_exam_audience : 'All Odisha Aspirants');
      const bIn = textInput('number', item ? String(item.budget_paise) : '2500000', 'Budget (paise)');
      const sIn = textInput('number', item ? String(item.spent_paise) : '0', 'Spent (paise)');
      const tcIn = textInput('number', item ? String(item.target_conversions) : '1000', 'Target conversions');
      const acIn = textInput('number', item ? String(item.actual_conversions) : '0', 'Actual conversions');
      const stSel = selectOf([['draft', 'draft'], ['active', 'active'], ['paused', 'paused'], ['completed', 'completed']], item ? item.campaign_status : 'active');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Campaign · ${item.campaign_code}` : 'Launch Marketing Campaign', [
        field('Campaign Name (English)', nameEn),
        field('Campaign Name (Odia)', nameOr),
        field('Objective', objSel),
        field('Target Exam Audience', audSel),
        field('Budget (Paise)', bIn),
        field('Spent (Paise)', sIn),
        field('Target Conversions', tcIn),
        field('Actual Conversions', acIn),
        field('Status', stSel)
      ]);
      if (isEdit) attachRevisions(body, '04', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Campaign' : 'Launch Campaign', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            campaign_name_en: nameEn.value.trim(),
            campaign_name_or: nameOr.value.trim(),
            objective: objSel.value,
            target_exam_audience: audSel.value,
            budget_paise: Math.max(0, Math.round(Number(bIn.value || 0))),
            spent_paise: Math.max(0, Math.round(Number(sIn.value || 0))),
            target_conversions: Math.max(0, Math.round(Number(tcIn.value || 0))),
            actual_conversions: Math.max(0, Math.round(Number(acIn.value || 0))),
            campaign_status: stSel.value
          };
          if (isEdit) await api(`${API}/campaigns/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/campaigns`, 'POST', payload);
          toast('Campaign saved', 'success');
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
    if (moduleId === 'module-12-001') { renderPlacements(root); return true; }
    if (moduleId === 'module-12-002') { renderSponsors(root); return true; }
    if (moduleId === 'module-12-003') { renderBanners(root); return true; }
    if (moduleId === 'module-12-004') { renderCampaigns(root); return true; }
    return false;
  }

  window.CSOMarketingBatch1 = { render: renderModule };
})();
