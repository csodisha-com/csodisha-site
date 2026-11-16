/* Categories & Navigation Batch 2 (05-08) Content Command Workspace — Strict CSP */
(() => {
  'use strict';

  const MODULE_META = {
    'module-06-005': { num: '05', endpoint: '/api/admin/nav/mega-menu', kind: 'mega_menu', title: 'Mega Menu' },
    'module-06-006': { num: '06', endpoint: '/api/admin/nav/footer', kind: 'footer', title: 'Footer Navigation' },
    'module-06-007': { num: '07', endpoint: '/api/admin/nav/sidebars', kind: 'sidebars', title: 'Sidebar Menus' },
    'module-06-008': { num: '08', endpoint: '/api/admin/nav/breadcrumbs', kind: 'breadcrumbs', title: 'Breadcrumbs' }
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
      items: [],
      headerParents: [],
      counts: { all: 0, published: 0, draft: 0, archived: 0 },
      selectedIds: new Set(),
      overview: null
    };

    if (actions) {
      actions.replaceChildren();
      const btnNew = el('button', 'cso-edu-btn cso-edu-btn--primary', '+ Create New');
      btnNew.type = 'button';
      btnNew.addEventListener('click', () => openEditor(null));
      actions.appendChild(btnNew);

      const prevLbl = meta.kind === 'mega_menu' ? 'Mega Menu Grid Preview'
        : meta.kind === 'footer' ? '4-Column Footer Preview'
          : meta.kind === 'sidebars' ? 'Portal Sidebar Preview'
            : 'Live URL Breadcrumb & JSON-LD Tester';
      const btnPrev = el('button', 'cso-edu-btn', prevLbl);
      btnPrev.type = 'button';
      btnPrev.addEventListener('click', () => {
        if (meta.kind === 'breadcrumbs') openBreadcrumbTester();
        else openVisualPreviewModal();
      });
      actions.appendChild(btnPrev);
    }

    const wrap = el('div', 'cso-edu-wrap');
    const kpiGrid = el('div', 'cso-edu-kpis');
    const toolbar = el('div', 'cso-edu-toolbar');
    const tabsWrap = el('div', 'cso-edu-tabs');
    const filtersWrap = el('div', 'cso-edu-filters');
    const bulkBar = el('div', 'cso-edu-bulkbar');
    bulkBar.hidden = true;
    const tableWrap = el('div', 'cso-edu-table-wrap');

    const qInput = el('input', 'cso-edu-input');
    qInput.type = 'search';
    qInput.placeholder = `Search ${meta.title}...`;
    filtersWrap.appendChild(qInput);

    if (meta.kind === 'mega_menu') {
      const sel = el('select', 'cso-edu-select');
      [['', 'All Columns'], ['Column 1: Quick Tracks', 'Col 1: Quick Tracks'], ['Column 2: Exam Bodies', 'Col 2: Exam Bodies'], ['Column 3: Study Tools', 'Col 3: Study Tools'], ['Featured Spotlight', 'Featured Spotlight']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; sel.appendChild(o);
      });
      sel.addEventListener('change', () => { state.filterA = sel.value; loadItems(); });
      filtersWrap.appendChild(sel);
    } else if (meta.kind === 'footer') {
      const sel = el('select', 'cso-edu-select');
      [['', 'All Footer Columns'], ['Portals & Directories', 'Portals & Directories'], ['Odisha Exam Boards', 'Odisha Exam Boards'], ['Student Resources', 'Student Resources'], ['About & Legal', 'About & Legal']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; sel.appendChild(o);
      });
      sel.addEventListener('change', () => { state.filterA = sel.value; loadItems(); });
      filtersWrap.appendChild(sel);
    } else if (meta.kind === 'sidebars') {
      const sel = el('select', 'cso-edu-select');
      [['', 'All Portal Sidebars'], ['sidebar_library', 'Study Library'], ['sidebar_jobs', 'Jobs & Careers'], ['sidebar_schemes', 'Schemes & Benefits'], ['sidebar_community', 'Community']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; sel.appendChild(o);
      });
      sel.addEventListener('change', () => { state.filterA = sel.value; loadItems(); });
      filtersWrap.appendChild(sel);
    }

    toolbar.append(tabsWrap, filtersWrap);
    wrap.append(kpiGrid, toolbar, bulkBar, tableWrap);
    root.replaceChildren(wrap);

    let timer = null;
    qInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.q = qInput.value.trim(); loadItems(); }, 220);
    });

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
        const params = new URLSearchParams();
        if (state.statusTab !== 'all') params.set('status', state.statusTab);
        if (state.q) params.set('q', state.q);
        if (state.filterA) {
          if (meta.kind === 'sidebars') params.set('menu_location', state.filterA);
          else params.set('column_group', state.filterA);
        }
        const data = await api(`${meta.endpoint}?${params.toString()}`);
        state.items = data.items || [];
        state.headerParents = data.header_parents || [];
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
      const b2 = (state.overview && state.overview.batch2) || {};
      const cards = [
        ['05 · Mega Menu Items', b2.mega_menu_items ?? '—'],
        ['06 · Footer Links', b2.footer_links ?? '—'],
        ['07 · Sidebar Items', b2.sidebar_items ?? '—'],
        ['08 · Breadcrumb Rules', b2.breadcrumb_rules ?? '—']
      ];
      cards.forEach(([label, val]) => {
        const card = el('div', 'cso-edu-kpi');
        card.append(el('div', 'cso-edu-kpi-lbl', label), el('div', 'cso-edu-kpi-val', val));
        kpiGrid.appendChild(card);
      });
    }

    function renderTabs() {
      tabsWrap.replaceChildren();
      [['all', 'All'], ['published', 'Published'], ['draft', 'Draft'], ['archived', 'Archived']].forEach(([k, label]) => {
        const btn = el('button', `cso-edu-tab${state.statusTab === k ? ' is-active' : ''}`, `${label} (${state.counts[k] ?? 0})`);
        btn.type = 'button';
        btn.addEventListener('click', () => { state.statusTab = k; loadItems(); });
        tabsWrap.appendChild(btn);
      });
    }

    function renderBulkBar() {
      bulkBar.replaceChildren();
      if (!state.selectedIds.size) { bulkBar.hidden = true; return; }
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

    async function moveItem(idx, delta) {
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
        tableWrap.appendChild(el('div', 'cso-edu-empty', `No records in ${meta.title}. Click "+ Create New" to add one.`));
        return;
      }
      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
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

      const cols = meta.kind === 'breadcrumbs'
        ? ['Route Pattern', 'Portal', 'Trail Steps', 'JSON-LD / Sep', 'Status', 'Actions']
        : ['Label (EN / OR)', meta.kind === 'sidebars' ? 'Portal & Section' : 'Column Group', 'URL', 'Order', 'Status', 'Actions'];

      cols.forEach(c => hr.appendChild(el('th', '', c)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      state.items.forEach((it, idx) => {
        const tr = el('tr');
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

        if (meta.kind === 'breadcrumbs') {
          tr.append(
            el('td', '', it.route_pattern),
            el('td', '', it.portal_key),
            el('td', '', `${(it.trail || []).length} steps`),
            el('td', '', `${it.schema_org_enabled ? 'JSON-LD' : 'Plain'} (${it.separator_symbol})`)
          );
        } else {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', `${it.icon_key ? it.icon_key + ' ' : ''}${it.label_en}`), el('div', 'cso-edu-title-or', it.label_or || '—'));
          const col2 = meta.kind === 'sidebars' ? `${it.menu_location.replace('sidebar_', '')} · ${it.column_group || 'General'}` : (it.column_group || '—');
          tr.append(td1, el('td', '', col2), el('td', '', it.url), el('td', '', `#${it.sort_order}`));
        }

        const tdSt = el('td');
        const stCls = it.status === 'published' ? 'pub' : it.status === 'archived' ? 'arch' : 'draft';
        tdSt.appendChild(el('span', `cso-edu-badge cso-edu-badge--${stCls}`, it.status));
        tr.appendChild(tdSt);

        const tdAct = el('td', 'cso-edu-actions');
        if (meta.kind !== 'breadcrumbs') {
          const bUp = el('button', 'cso-edu-btn', '↑'); bUp.type = 'button';
          bUp.addEventListener('click', () => moveItem(idx, -1));
          const bDn = el('button', 'cso-edu-btn', '↓'); bDn.type = 'button';
          bDn.addEventListener('click', () => moveItem(idx, 1));
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
        tr.appendChild(tdAct);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      tableWrap.appendChild(tbl);
    }

    function openVisualPreviewModal() {
      const backdrop = el('div', 'cso-edu-drawer-backdrop');
      const drawer = el('div', 'cso-edu-drawer');
      const head = el('div', 'cso-edu-drawer-head');
      head.appendChild(el('h3', '', `${meta.title} Live Preview`));
      const closeBtn = el('button', 'cso-edu-btn', 'Close'); closeBtn.type = 'button';
      closeBtn.addEventListener('click', () => backdrop.remove());
      head.appendChild(closeBtn);

      const body = el('div', 'cso-edu-drawer-body');
      const groups = new Map();
      state.items.filter(x => x.status === 'published').forEach(it => {
        const g = meta.kind === 'sidebars' ? `${it.menu_location} (${it.column_group || 'General'})` : (it.column_group || 'Default');
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g).push(it);
      });
      if (!groups.size) {
        body.appendChild(el('div', 'cso-edu-empty', 'No published items yet.'));
      } else {
        groups.forEach((arr, grp) => {
          const card = el('div', 'cso-edu-preview-card');
          card.appendChild(el('div', 'cso-edu-label', grp));
          arr.forEach(it => card.appendChild(el('div', 'cso-edu-title-or', `${it.icon_key ? it.icon_key + ' ' : ''}${it.label_en} -> ${it.url}`)));
          body.appendChild(card);
        });
      }

      drawer.append(head, body);
      backdrop.appendChild(drawer);
      document.body.appendChild(backdrop);
    }

    function openBreadcrumbTester() {
      const backdrop = el('div', 'cso-edu-drawer-backdrop');
      const drawer = el('div', 'cso-edu-drawer');
      const head = el('div', 'cso-edu-drawer-head');
      head.appendChild(el('h3', '', 'Live URL Breadcrumb & Schema.org JSON-LD Tester'));
      const closeBtn = el('button', 'cso-edu-btn', 'Close'); closeBtn.type = 'button';
      closeBtn.addEventListener('click', () => backdrop.remove());
      head.appendChild(closeBtn);

      const body = el('div', 'cso-edu-drawer-body');
      const urlIn = el('input', 'cso-edu-input cso-edu-input-full'); urlIn.value = '/study-library/opsc-oas-notes';
      const titleIn = el('input', 'cso-edu-input cso-edu-input-full'); titleIn.value = 'OPSC OAS History Notes';
      const runBtn = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Test Route Match'); runBtn.type = 'button';
      const outBox = el('pre', 'cso-edu-preview-card', 'Click Test Route Match to preview trail & JSON-LD.');

      runBtn.addEventListener('click', async () => {
        try {
          const res = await api('/api/admin/nav/breadcrumbs/test', {
            method: 'POST',
            body: JSON.stringify({ url: urlIn.value.trim(), title: titleIn.value.trim() })
          });
          if (!res.matched) { outBox.textContent = 'No published breadcrumb rule matched that URL.'; return; }
          const trailStr = (res.matched.trail || []).map(s => (s.is_dynamic_title ? titleIn.value.trim() : s.label_en)).join(` ${res.matched.separator_symbol} `);
          outBox.textContent = `Matched: ${res.matched.route_pattern}\nTrail: ${trailStr}\n\nJSON-LD:\n${JSON.stringify(res.json_ld, null, 2)}`;
        } catch (e) { toast(e.message, 'error'); }
      });

      body.append(buildField('Sample URL Path', urlIn), buildField('Dynamic Page Title', titleIn), runBtn, outBox);
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

      if (meta.kind === 'breadcrumbs') {
        const patIn = el('input', 'cso-edu-input cso-edu-input-full'); patIn.value = item?.route_pattern || '/study-library/*'; refs.route_pattern = patIn;
        const portIn = el('input', 'cso-edu-input cso-edu-input-full'); portIn.value = item?.portal_key || 'study-library'; refs.portal_key = portIn;
        const sepSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['›', '/', '→'].forEach(s => { const o = el('option', '', s); o.value = s; sepSel.appendChild(o); });
        sepSel.value = item?.separator_symbol || '›'; refs.separator_symbol = sepSel;
        const schChk = el('input'); schChk.type = 'checkbox'; schChk.checked = item ? Boolean(item.schema_org_enabled) : true; refs.schema_org_enabled = schChk;
        const trailIn = el('textarea', 'cso-edu-textarea cso-edu-textarea-full');
        trailIn.value = JSON.stringify(item?.trail || [{ step_no: 1, label_en: 'Home', url_template: '/', is_dynamic_title: false }], null, 2);
        refs.trail = trailIn;

        body.append(
          buildField('Route Pattern *', patIn),
          buildField('Portal Key', portIn),
          buildField('Separator Symbol', sepSel),
          buildField('Enable BreadcrumbList JSON-LD', schChk),
          buildField('Trail Steps (JSON)', trailIn)
        );
      } else {
        const lblEn = el('input', 'cso-edu-input cso-edu-input-full'); lblEn.value = item?.label_en || ''; refs.label_en = lblEn;
        const lblOr = el('input', 'cso-edu-input cso-edu-input-full'); lblOr.value = item?.label_or || ''; refs.label_or = lblOr;
        const urlIn = el('input', 'cso-edu-input cso-edu-input-full'); urlIn.value = item?.url || '/'; refs.url = urlIn;
        const icIn = el('input', 'cso-edu-input cso-edu-input-full'); icIn.value = item?.icon_key || ''; refs.icon_key = icIn;
        const bdgIn = el('input', 'cso-edu-input cso-edu-input-full'); bdgIn.value = item?.badge_text_en || ''; refs.badge_text_en = bdgIn;
        const sortIn = el('input', 'cso-edu-input cso-edu-input-full'); sortIn.type = 'number'; sortIn.value = item?.sort_order ?? 10; refs.sort_order = sortIn;
        const tabChk = el('input'); tabChk.type = 'checkbox'; tabChk.checked = Boolean(item?.open_new_tab); refs.open_new_tab = tabChk;

        if (meta.kind === 'mega_menu') {
          const parSel = el('select', 'cso-edu-select cso-edu-select-full');
          state.headerParents.forEach(p => { const o = el('option', '', p.label_en); o.value = p.id; parSel.appendChild(o); });
          if (item?.parent_item_id) parSel.value = item.parent_item_id;
          refs.parent_item_id = parSel;

          const colSel = el('select', 'cso-edu-select cso-edu-select-full');
          ['Column 1: Quick Tracks', 'Column 2: Exam Bodies', 'Column 3: Study Tools', 'Featured Spotlight'].forEach(c => { const o = el('option', '', c); o.value = c; colSel.appendChild(o); });
          colSel.value = item?.column_group || 'Column 1: Quick Tracks';
          refs.column_group = colSel;
          body.append(buildField('Parent Header Trigger', parSel), buildField('Column Group', colSel));
        } else if (meta.kind === 'footer') {
          const colSel = el('select', 'cso-edu-select cso-edu-select-full');
          ['Portals & Directories', 'Odisha Exam Boards', 'Student Resources', 'About & Legal'].forEach(c => { const o = el('option', '', c); o.value = c; colSel.appendChild(o); });
          colSel.value = item?.column_group || 'Portals & Directories';
          refs.column_group = colSel;
          body.append(buildField('Footer Column', colSel));
        } else {
          const locSel = el('select', 'cso-edu-select cso-edu-select-full');
          [['sidebar_library', 'Study Library'], ['sidebar_jobs', 'Jobs & Careers'], ['sidebar_schemes', 'Schemes & Benefits'], ['sidebar_community', 'Community']].forEach(([v, l]) => { const o = el('option', '', l); o.value = v; locSel.appendChild(o); });
          locSel.value = item?.menu_location || 'sidebar_library';
          refs.menu_location = locSel;
          const secIn = el('input', 'cso-edu-input cso-edu-input-full'); secIn.value = item?.column_group || 'Core Links';
          refs.column_group = secIn;
          body.append(buildField('Portal Sidebar', locSel), buildField('Section Group', secIn));
        }

        body.append(
          buildField('Label (English) *', lblEn),
          buildField('Label (Odia)', lblOr),
          buildField('URL *', urlIn),
          buildField('Icon / Emoji', icIn),
          buildField('Badge / Rel (e.g. FREE / nofollow)', bdgIn),
          buildField('Sort Order', sortIn),
          buildField('Open in New Tab', tabChk)
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
          if (meta.kind === 'breadcrumbs') {
            Object.assign(payload, {
              route_pattern: refs.route_pattern.value.trim(),
              portal_key: refs.portal_key.value.trim(),
              separator_symbol: refs.separator_symbol.value,
              schema_org_enabled: refs.schema_org_enabled.checked,
              trail: JSON.parse(refs.trail.value || '[]')
            });
          } else {
            Object.assign(payload, {
              label_en: refs.label_en.value.trim(),
              label_or: refs.label_or.value.trim(),
              url: refs.url.value.trim(),
              icon_key: refs.icon_key.value.trim(),
              badge_text_en: refs.badge_text_en.value.trim(),
              column_group: refs.column_group.value.trim(),
              sort_order: Number(refs.sort_order.value || 10),
              open_new_tab: refs.open_new_tab.checked
            });
            if (refs.parent_item_id) payload.parent_item_id = refs.parent_item_id.value;
            if (refs.menu_location) payload.menu_location = refs.menu_location.value;
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

  window.CSOCatNavBatch2 = { render, MODULE_META };
})();
