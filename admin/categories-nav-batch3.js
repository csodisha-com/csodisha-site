/* Categories & Navigation Batch 3 (09-11) Content Command Workspace — Strict CSP */
(() => {
  'use strict';

  const MODULE_META = {
    'module-06-009': { num: '09', endpoint: '/api/admin/nav/internal-links', kind: 'internal_links', title: 'Internal Links' },
    'module-06-010': { num: '10', endpoint: '/api/admin/nav/ordering', kind: 'ordering', title: 'Menu Ordering' },
    'module-06-011': { num: '11', endpoint: '/api/admin/nav/social-links', kind: 'social_links', title: 'Social Links' }
  };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  async function api(path, opts = {}) {
    const headers = Object.assign({}, opts.headers || {});
    if (opts.method && opts.method !== 'GET' && opts.method !== 'HEAD') {
      headers['X-CSO-CSRF'] = '1';
      if (!(opts.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }
    const res = await fetch(path, { method: opts.method || 'GET', credentials: 'same-origin', headers, body: opts.body });
    const ct = res.headers.get('Content-Type') || '';
    const data = ct.includes('application/json') ? await res.json().catch(() => ({})) : await res.text();
    if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
    return data;
  }

  function toast(msg, kind) {
    if (typeof window.showToast === 'function') { window.showToast(msg, kind || 'info'); return; }
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = el('div', 'cso-toast', msg);
    c.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  function buildField(labelText, inputEl) {
    const f = el('div', 'cso-edu-field');
    f.append(el('label', 'cso-edu-label', labelText), inputEl);
    return f;
  }

  function render(moduleId, root, actions) {
    const meta = MODULE_META[moduleId];
    if (!meta || !root) return false;

    const state = {
      statusTab: 'all',
      q: '',
      filterA: '',
      filterB: '',
      orderLocation: 'header',
      dirtyOrder: false,
      items: [],
      counts: { all: 0, published: 0, draft: 0, archived: 0 },
      selectedIds: new Set(),
      overview: null
    };

    if (actions) {
      actions.replaceChildren();
      if (meta.kind === 'ordering') {
        const btnSaveOrder = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Save Order');
        btnSaveOrder.type = 'button';
        btnSaveOrder.addEventListener('click', saveBatchOrder);
        actions.appendChild(btnSaveOrder);
      } else {
        const btnNew = el('button', 'cso-edu-btn cso-edu-btn--primary', '+ Create New');
        btnNew.type = 'button';
        btnNew.addEventListener('click', () => openEditor(null));
        actions.appendChild(btnNew);

        if (meta.kind === 'internal_links') {
          const btnVerify = el('button', 'cso-edu-btn', 'Verify Internal Routes');
          btnVerify.type = 'button';
          btnVerify.addEventListener('click', async () => {
            try {
              const res = await api('/api/admin/nav/internal-links/verify', { method: 'POST', body: '{}' });
              toast(`Verified ${res.checked} links: ${res.ok_count} OK, ${res.broken_count} broken`, res.broken_count ? 'error' : 'success');
              loadAll();
            } catch (e) { toast(e.message, 'error'); }
          });
          actions.appendChild(btnVerify);
        } else if (meta.kind === 'social_links') {
          const btnPrev = el('button', 'cso-edu-btn', 'Social Bar Preview');
          btnPrev.type = 'button';
          btnPrev.addEventListener('click', openSocialPreviewModal);
          actions.appendChild(btnPrev);
        }
      }
    }

    const wrap = el('div', 'cso-edu-wrap');
    const kpiGrid = el('div', 'cso-edu-kpis');
    const toolbar = el('div', 'cso-edu-toolbar');
    const tabsWrap = el('div', 'cso-edu-tabs');
    const filtersWrap = el('div', 'cso-edu-filters');
    const bulkBar = el('div', 'cso-edu-bulkbar');
    bulkBar.hidden = true;
    const tableWrap = el('div', 'cso-edu-table-wrap');

    if (meta.kind === 'ordering') {
      const locSel = el('select', 'cso-edu-select');
      [
        ['header', 'Header Navigation'],
        ['mega_menu', 'Mega Menu'],
        ['footer', 'Footer Navigation'],
        ['sidebar_library', 'Sidebar: Study Library'],
        ['sidebar_jobs', 'Sidebar: Jobs & Careers'],
        ['sidebar_schemes', 'Sidebar: Schemes & Benefits'],
        ['sidebar_community', 'Sidebar: Community'],
        ['categories_master', 'Master Categories (01)'],
        ['categories_sub', 'Subcategories (02)']
      ].forEach(([v, l]) => { const o = el('option', '', l); o.value = v; locSel.appendChild(o); });
      locSel.addEventListener('change', () => { state.orderLocation = locSel.value; state.dirtyOrder = false; loadItems(); });
      filtersWrap.appendChild(locSel);
    } else {
      const qInput = el('input', 'cso-edu-input');
      qInput.type = 'search';
      qInput.placeholder = `Search ${meta.title}...`;
      filtersWrap.appendChild(qInput);
      let timer = null;
      qInput.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(() => { state.q = qInput.value.trim(); loadItems(); }, 220);
      });

      if (meta.kind === 'internal_links') {
        const selA = el('select', 'cso-edu-select');
        [['', 'All Link Groups'], ['quick_access_bar', 'Quick Access Bar'], ['related_hub_links', 'Related Hub Links'], ['seo_anchor_rules', 'SEO Anchor Rules'], ['contextual_cta', 'Contextual CTA']].forEach(([v, l]) => {
          const o = el('option', '', l); o.value = v; selA.appendChild(o);
        });
        selA.addEventListener('change', () => { state.filterA = selA.value; loadItems(); });

        const selB = el('select', 'cso-edu-select');
        [['', 'All Portals'], ['all', 'Global'], ['home', 'Home'], ['study-library', 'Study Library'], ['jobs-careers', 'Jobs & Careers'], ['schemes', 'Schemes'], ['community', 'Community'], ['student', 'Student Hub']].forEach(([v, l]) => {
          const o = el('option', '', l); o.value = v; selB.appendChild(o);
        });
        selB.addEventListener('change', () => { state.filterB = selB.value; loadItems(); });
        filtersWrap.append(selA, selB);
      } else {
        const selA = el('select', 'cso-edu-select');
        [['', 'All Placements'], ['header_and_footer', 'Header & Footer'], ['footer_only', 'Footer Only'], ['community_hub', 'Community Hub'], ['all', 'Everywhere']].forEach(([v, l]) => {
          const o = el('option', '', l); o.value = v; selA.appendChild(o);
        });
        selA.addEventListener('change', () => { state.filterA = selA.value; loadItems(); });
        filtersWrap.appendChild(selA);
      }
    }

    toolbar.append(tabsWrap, filtersWrap);
    wrap.append(kpiGrid, toolbar, bulkBar, tableWrap);
    root.replaceChildren(wrap);

    async function loadAll() {
      await Promise.all([loadOverview(), loadItems()]);
    }

    async function loadOverview() {
      try {
        state.overview = await api('/api/admin/nav/overview');
        renderKpis();
      } catch (e) {}
    }

    async function loadItems() {
      try {
        if (meta.kind === 'ordering') {
          const data = await api(`/api/admin/nav/ordering?location=${encodeURIComponent(state.orderLocation)}`);
          state.items = data.items || [];
          renderTabs();
          renderTable();
          return;
        }
        const params = new URLSearchParams();
        if (state.statusTab !== 'all') params.set('status', state.statusTab);
        if (state.q) params.set('q', state.q);
        if (state.filterA) {
          if (meta.kind === 'internal_links') params.set('link_group', state.filterA);
          else params.set('placement', state.filterA);
        }
        if (state.filterB && meta.kind === 'internal_links') params.set('source_portal', state.filterB);
        const data = await api(`${meta.endpoint}?${params.toString()}`);
        state.items = data.items || [];
        state.counts = data.counts || state.counts;
        state.selectedIds.clear();
        renderTabs();
        renderBulkBar();
        renderTable();
      } catch (err) {
        tableWrap.replaceChildren(el('div', 'cso-edu-empty', `Failed to load ${meta.title}: ${err.message}`));
      }
    }

    function renderKpis() {
      kpiGrid.replaceChildren();
      const s11 = (state.overview && state.overview.suite_11) || {};
      const totals = s11.totals || {};
      const cards = [
        ['11-Module Suite Items', `${totals.total_items ?? '—'} (${totals.published ?? 0} pub)`],
        ['Bilingual Parity', `${s11.bilingual_parity_pct ?? 100}%`],
        ['09 · Internal Link Health', `${s11.internal_links_ok ?? 0} OK / ${s11.internal_links_broken ?? 0} Broken`],
        ['11 · Social Channels', s11.social_channels ?? '—']
      ];
      cards.forEach(([label, val]) => {
        const card = el('div', 'cso-edu-kpi');
        card.append(el('div', 'cso-edu-kpi-lbl', label), el('div', 'cso-edu-kpi-val', val));
        kpiGrid.appendChild(card);
      });
    }

    function renderTabs() {
      tabsWrap.replaceChildren();
      if (meta.kind === 'ordering') {
        tabsWrap.appendChild(el('span', 'cso-edu-badge cso-edu-badge--pub', `${state.items.length} items in ${state.orderLocation}${state.dirtyOrder ? ' (unsaved order)' : ''}`));
        return;
      }
      [['all', 'All'], ['published', 'Published'], ['draft', 'Draft'], ['archived', 'Archived']].forEach(([k, label]) => {
        const btn = el('button', `cso-edu-tab${state.statusTab === k ? ' is-active' : ''}`, `${label} (${state.counts[k] ?? 0})`);
        btn.type = 'button';
        btn.addEventListener('click', () => { state.statusTab = k; loadItems(); });
        tabsWrap.appendChild(btn);
      });
    }

    function renderBulkBar() {
      bulkBar.replaceChildren();
      if (!state.selectedIds.size || meta.kind === 'ordering') { bulkBar.hidden = true; return; }
      bulkBar.hidden = false;
      bulkBar.appendChild(el('span', 'cso-edu-bulk-count', `${state.selectedIds.size} selected`));
      [['published', 'Publish'], ['draft', 'Move to Draft'], ['archived', 'Archive']].forEach(([st, lbl]) => {
        const b = el('button', 'cso-edu-btn', lbl);
        b.type = 'button';
        b.addEventListener('click', async () => {
          try {
            await api(meta.endpoint, {
              method: 'POST',
              body: JSON.stringify({ action: 'bulk_status', ids: [...state.selectedIds], status: st })
            });
            toast(`Updated ${state.selectedIds.size} item(s) to ${st}`, 'success');
            loadAll();
          } catch (e) { toast(e.message, 'error'); }
        });
        bulkBar.appendChild(b);
      });
    }

    async function saveBatchOrder() {
      try {
        const orderedIds = state.items.map(x => x.id);
        await api('/api/admin/nav/ordering', {
          method: 'POST',
          body: JSON.stringify({ location: state.orderLocation, ordered_ids: orderedIds })
        });
        state.dirtyOrder = false;
        toast(`Saved order for ${state.orderLocation}`, 'success');
        loadAll();
      } catch (e) { toast(e.message, 'error'); }
    }

    async function moveSocial(idx, delta) {
      const target = idx + delta;
      if (target < 0 || target >= state.items.length) return;
      const ordered = state.items.map(x => x.id);
      [ordered[idx], ordered[target]] = [ordered[target], ordered[idx]];
      try {
        await api(meta.endpoint, { method: 'POST', body: JSON.stringify({ action: 'reorder', ordered_ids: ordered }) });
        toast('Order updated', 'success');
        loadAll();
      } catch (e) { toast(e.message, 'error'); }
    }

    function renderTable() {
      tableWrap.replaceChildren();
      if (!state.items.length) {
        tableWrap.appendChild(el('div', 'cso-edu-empty', `No records in ${meta.title}.`));
        return;
      }
      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');

      if (meta.kind !== 'ordering') {
        const thChk = el('th');
        const chkAll = el('input'); chkAll.type = 'checkbox';
        chkAll.addEventListener('change', () => {
          state.selectedIds.clear();
          if (chkAll.checked) state.items.forEach(it => state.selectedIds.add(it.id));
          renderBulkBar();
          tableWrap.querySelectorAll('tbody input[type="checkbox"]').forEach(c => { c.checked = chkAll.checked; });
        });
        thChk.appendChild(chkAll);
        hr.appendChild(thChk);
      }

      const cols = meta.kind === 'ordering'
        ? ['Position', 'Label (EN / OR)', 'URL', 'Status', 'Move']
        : meta.kind === 'internal_links'
          ? ['Anchor Text (EN / OR)', 'Group & Portal', 'Target URL', 'Health', 'Status', 'Actions']
          : ['Platform & Label', 'Handle & Badge', 'Placement', 'Order', 'Status', 'Actions'];

      cols.forEach(c => hr.appendChild(el('th', '', c)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      state.items.forEach((it, idx) => {
        const tr = el('tr');
        if (meta.kind !== 'ordering') {
          const tdChk = el('td');
          const chk = el('input'); chk.type = 'checkbox';
          chk.checked = state.selectedIds.has(it.id);
          chk.addEventListener('change', () => {
            if (chk.checked) state.selectedIds.add(it.id);
            else state.selectedIds.delete(it.id);
            renderBulkBar();
          });
          tdChk.appendChild(chk);
          tr.appendChild(tdChk);
        }

        if (meta.kind === 'ordering') {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', it.label_en), el('div', 'cso-edu-title-or', it.label_or || it.column_group || '—'));
          tr.append(el('td', '', `#${idx + 1}`), td1, el('td', '', it.url || '—'));
        } else if (meta.kind === 'internal_links') {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', it.anchor_text_en), el('div', 'cso-edu-title-or', it.anchor_text_or || it.slug));
          const tdH = el('td');
          const hCls = it.link_health_status === 'ok' ? 'ok' : it.link_health_status === 'broken' ? 'arch' : 'draft';
          tdH.appendChild(el('span', `cso-edu-badge cso-edu-badge--${hCls}`, it.link_health_status));
          tr.append(td1, el('td', '', `${it.link_group} · ${it.source_portal}`), el('td', '', it.target_url), tdH);
        } else {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', `${it.label_en} (${it.platform_key})`), el('div', 'cso-edu-title-or', it.label_or || it.slug));
          tr.append(td1, el('td', '', `${it.handle_text || '—'} · ${it.follower_badge_text || '—'}`), el('td', '', it.placement), el('td', '', `#${it.sort_order}`));
        }

        const tdSt = el('td');
        const stCls = it.status === 'published' ? 'pub' : it.status === 'archived' ? 'arch' : 'draft';
        tdSt.appendChild(el('span', `cso-edu-badge cso-edu-badge--${stCls}`, it.status));
        tr.appendChild(tdSt);

        const tdAct = el('td', 'cso-edu-actions');
        if (meta.kind === 'ordering') {
          const bTop = el('button', 'cso-edu-btn', 'Top'); bTop.type = 'button';
          bTop.addEventListener('click', () => { const [x] = state.items.splice(idx, 1); state.items.unshift(x); state.dirtyOrder = true; renderTabs(); renderTable(); });
          const bUp = el('button', 'cso-edu-btn', '↑'); bUp.type = 'button';
          bUp.addEventListener('click', () => { if (idx > 0) { [state.items[idx - 1], state.items[idx]] = [state.items[idx], state.items[idx - 1]]; state.dirtyOrder = true; renderTabs(); renderTable(); } });
          const bDn = el('button', 'cso-edu-btn', '↓'); bDn.type = 'button';
          bDn.addEventListener('click', () => { if (idx < state.items.length - 1) { [state.items[idx + 1], state.items[idx]] = [state.items[idx], state.items[idx + 1]]; state.dirtyOrder = true; renderTabs(); renderTable(); } });
          const bBot = el('button', 'cso-edu-btn', 'Bottom'); bBot.type = 'button';
          bBot.addEventListener('click', () => { const [x] = state.items.splice(idx, 1); state.items.push(x); state.dirtyOrder = true; renderTabs(); renderTable(); });
          tdAct.append(bTop, bUp, bDn, bBot);
        } else {
          if (meta.kind === 'social_links') {
            const bUp = el('button', 'cso-edu-btn', '↑'); bUp.type = 'button';
            bUp.addEventListener('click', () => moveSocial(idx, -1));
            const bDn = el('button', 'cso-edu-btn', '↓'); bDn.type = 'button';
            bDn.addEventListener('click', () => moveSocial(idx, 1));
            tdAct.append(bUp, bDn);
          }
          const btnEdit = el('button', 'cso-edu-btn', 'Edit'); btnEdit.type = 'button';
          btnEdit.addEventListener('click', () => openEditor(it.id));
          const btnClone = el('button', 'cso-edu-btn', 'Clone'); btnClone.type = 'button';
          btnClone.addEventListener('click', async () => {
            try {
              await api(`${meta.endpoint}/${it.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'clone' }) });
              toast('Cloned as draft', 'success');
              loadAll();
            } catch (e) { toast(e.message, 'error'); }
          });
          const btnDel = el('button', 'cso-edu-btn cso-edu-btn--danger', 'Del'); btnDel.type = 'button';
          btnDel.addEventListener('click', async () => {
            if (!confirm(`Delete this ${meta.title} item?`)) return;
            try {
              await api(`${meta.endpoint}/${it.id}`, { method: 'DELETE' });
              toast('Deleted', 'success');
              loadAll();
            } catch (e) { toast(e.message, 'error'); }
          });
          tdAct.append(btnEdit, btnClone, btnDel);
        }
        tr.appendChild(tdAct);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      tableWrap.appendChild(tbl);
    }

    function openSocialPreviewModal() {
      const backdrop = el('div', 'cso-edu-drawer-backdrop');
      const drawer = el('div', 'cso-edu-drawer');
      const head = el('div', 'cso-edu-drawer-head');
      head.appendChild(el('h3', '', 'Social Strip Live Preview'));
      const closeBtn = el('button', 'cso-edu-btn', 'Close'); closeBtn.type = 'button';
      closeBtn.addEventListener('click', () => backdrop.remove());
      head.appendChild(closeBtn);

      const body = el('div', 'cso-edu-drawer-body');
      const card = el('div', 'cso-edu-preview-card');
      card.appendChild(el('div', 'cso-edu-label', 'Published Social Channels'));
      const badges = el('div', 'cso-edu-badges');
      state.items.filter(s => s.status === 'published').forEach(s => {
        badges.appendChild(el('span', 'cso-edu-badge cso-edu-badge--pub', `${s.label_en}: ${s.handle_text || s.profile_url}`));
      });
      card.appendChild(badges);
      body.appendChild(card);

      drawer.append(head, body);
      backdrop.appendChild(drawer);
      document.body.appendChild(backdrop);
    }

    async function openEditor(itemId) {
      let item = null;
      let revisions = [];
      if (itemId) {
        try {
          const res = await api(`${meta.endpoint}/${itemId}`);
          item = res.item;
          revisions = res.revisions || [];
        } catch (e) { toast(e.message, 'error'); return; }
      }

      const backdrop = el('div', 'cso-edu-drawer-backdrop');
      const drawer = el('div', 'cso-edu-drawer');
      const head = el('div', 'cso-edu-drawer-head');
      head.appendChild(el('h3', '', `${item ? 'Edit' : 'Create'} ${meta.title}`));
      const btnClose = el('button', 'cso-edu-btn', 'Close'); btnClose.type = 'button';
      btnClose.addEventListener('click', () => backdrop.remove());
      head.appendChild(btnClose);

      const body = el('div', 'cso-edu-drawer-body');
      const refs = {};

      if (meta.kind === 'internal_links') {
        const ancEn = el('input', 'cso-edu-input cso-edu-input-full'); ancEn.value = item?.anchor_text_en || ''; refs.anchor_text_en = ancEn;
        const ancOr = el('input', 'cso-edu-input cso-edu-input-full'); ancOr.value = item?.anchor_text_or || ''; refs.anchor_text_or = ancOr;
        const urlIn = el('input', 'cso-edu-input cso-edu-input-full'); urlIn.value = item?.target_url || '/study-library/'; refs.target_url = urlIn;
        const grpSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['quick_access_bar', 'related_hub_links', 'seo_anchor_rules', 'contextual_cta'].forEach(g => { const o = el('option', '', g); o.value = g; grpSel.appendChild(o); });
        grpSel.value = item?.link_group || 'quick_access_bar'; refs.link_group = grpSel;
        const portSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['all', 'home', 'study-library', 'jobs-careers', 'schemes', 'community', 'student'].forEach(p => { const o = el('option', '', p); o.value = p; portSel.appendChild(o); });
        portSel.value = item?.source_portal || 'all'; refs.source_portal = portSel;
        const prioIn = el('input', 'cso-edu-input cso-edu-input-full'); prioIn.type = 'number'; prioIn.value = item?.priority_weight ?? 10; refs.priority_weight = prioIn;

        body.append(
          buildField('Anchor Text (English) *', ancEn),
          buildField('Anchor Text (Odia)', ancOr),
          buildField('Target URL *', urlIn),
          buildField('Link Group', grpSel),
          buildField('Source Portal', portSel),
          buildField('Priority Weight', prioIn)
        );
      } else {
        const platSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['instagram', 'telegram', 'whatsapp', 'youtube', 'x_twitter', 'facebook', 'linkedin', 'github'].forEach(p => { const o = el('option', '', p); o.value = p; platSel.appendChild(o); });
        platSel.value = item?.platform_key || 'instagram'; refs.platform_key = platSel;
        const lblEn = el('input', 'cso-edu-input cso-edu-input-full'); lblEn.value = item?.label_en || ''; refs.label_en = lblEn;
        const lblOr = el('input', 'cso-edu-input cso-edu-input-full'); lblOr.value = item?.label_or || ''; refs.label_or = lblOr;
        const hdlIn = el('input', 'cso-edu-input cso-edu-input-full'); hdlIn.value = item?.handle_text || ''; refs.handle_text = hdlIn;
        const urlIn = el('input', 'cso-edu-input cso-edu-input-full'); urlIn.value = item?.profile_url || 'https://instagram.com/csodisha'; refs.profile_url = urlIn;
        const plSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['header_and_footer', 'footer_only', 'community_hub', 'all'].forEach(p => { const o = el('option', '', p); o.value = p; plSel.appendChild(o); });
        plSel.value = item?.placement || 'header_and_footer'; refs.placement = plSel;
        const bdgIn = el('input', 'cso-edu-input cso-edu-input-full'); bdgIn.value = item?.follower_badge_text || ''; refs.follower_badge_text = bdgIn;
        const sortIn = el('input', 'cso-edu-input cso-edu-input-full'); sortIn.type = 'number'; sortIn.value = item?.sort_order ?? 10; refs.sort_order = sortIn;

        body.append(
          buildField('Platform', platSel),
          buildField('Label (English) *', lblEn),
          buildField('Label (Odia)', lblOr),
          buildField('Handle Text', hdlIn),
          buildField('Profile URL *', urlIn),
          buildField('Placement', plSel),
          buildField('Follower / Tag Badge', bdgIn),
          buildField('Sort Order', sortIn)
        );
      }

      const statusSel = el('select', 'cso-edu-select cso-edu-select-full');
      ['draft', 'published', 'archived'].forEach(s => { const o = el('option', '', s); o.value = s; statusSel.appendChild(o); });
      statusSel.value = item?.status || 'published'; refs.status = statusSel;
      body.appendChild(buildField('Status', statusSel));

      if (revisions.length) {
        const revBox = el('div', 'cso-edu-section');
        revBox.appendChild(el('div', 'cso-edu-label', 'Revision History'));
        revisions.slice(0, 6).forEach(r => {
          const row = el('div', 'cso-edu-rev-row');
          row.appendChild(el('span', 'cso-edu-rev-meta', `v${r.version_num} · ${r.change_note || 'Update'} · ${r.created_at}`));
          const rbBtn = el('button', 'cso-edu-btn', 'Rollback'); rbBtn.type = 'button';
          rbBtn.addEventListener('click', async () => {
            try {
              await api(`${meta.endpoint}/${item.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'rollback', revision_id: r.id }) });
              toast(`Rolled back to v${r.version_num}`, 'success');
              backdrop.remove();
              loadAll();
            } catch (e) { toast(e.message, 'error'); }
          });
          row.appendChild(rbBtn);
          revBox.appendChild(row);
        });
        body.appendChild(revBox);
      }

      const foot = el('div', 'cso-edu-drawer-foot');
      const btnCancel = el('button', 'cso-edu-btn', 'Cancel'); btnCancel.type = 'button';
      btnCancel.addEventListener('click', () => backdrop.remove());
      const btnSave = el('button', 'cso-edu-btn cso-edu-btn--primary', item ? 'Save Changes' : 'Create Entry'); btnSave.type = 'button';
      btnSave.addEventListener('click', async () => {
        try {
          const payload = { status: refs.status.value };
          if (meta.kind === 'internal_links') {
            Object.assign(payload, {
              anchor_text_en: refs.anchor_text_en.value.trim(),
              anchor_text_or: refs.anchor_text_or.value.trim(),
              target_url: refs.target_url.value.trim(),
              link_group: refs.link_group.value,
              source_portal: refs.source_portal.value,
              priority_weight: Number(refs.priority_weight.value || 10)
            });
          } else {
            Object.assign(payload, {
              platform_key: refs.platform_key.value,
              label_en: refs.label_en.value.trim(),
              label_or: refs.label_or.value.trim(),
              handle_text: refs.handle_text.value.trim(),
              profile_url: refs.profile_url.value.trim(),
              placement: refs.placement.value,
              follower_badge_text: refs.follower_badge_text.value.trim(),
              sort_order: Number(refs.sort_order.value || 10)
            });
          }

          await api(item ? `${meta.endpoint}/${item.id}` : meta.endpoint, {
            method: item ? 'PUT' : 'POST',
            body: JSON.stringify(payload)
          });
          toast(item ? 'Saved changes' : 'Created successfully', 'success');
          backdrop.remove();
          loadAll();
        } catch (e) { toast(e.message, 'error'); }
      });
      foot.append(btnCancel, btnSave);
      drawer.append(head, body, foot);
      backdrop.appendChild(drawer);
      document.body.appendChild(backdrop);
    }

    loadAll();
    return true;
  }

  window.CSOCatNavBatch3 = { render, MODULE_META };
})();
