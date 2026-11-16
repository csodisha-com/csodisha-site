/* Categories & Navigation Batch 1 (01-04) Content Command Workspace — Strict CSP */
(() => {
  'use strict';

  const MODULE_META = {
    'module-06-001': { num: '01', endpoint: '/api/admin/nav/categories', kind: 'master_categories', title: 'Master Categories' },
    'module-06-002': { num: '02', endpoint: '/api/admin/nav/categories', kind: 'subcategories', title: 'Subcategories' },
    'module-06-003': { num: '03', endpoint: '/api/admin/nav/tags', kind: 'tags', title: 'Tags & Taxonomies' },
    'module-06-004': { num: '04', endpoint: '/api/admin/nav/header', kind: 'header_nav', title: 'Header Navigation' }
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
      masters: [],
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

      if (meta.kind === 'tags') {
        const btnMerge = el('button', 'cso-edu-btn', 'Merge Duplicate Tags');
        btnMerge.type = 'button';
        btnMerge.addEventListener('click', openMergeModal);
        actions.appendChild(btnMerge);
      } else if (meta.kind === 'header_nav') {
        const btnPrev = el('button', 'cso-edu-btn', 'Preview Header Bar');
        btnPrev.type = 'button';
        btnPrev.addEventListener('click', openHeaderPreviewModal);
        actions.appendChild(btnPrev);
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

    const qInput = el('input', 'cso-edu-input');
    qInput.type = 'search';
    qInput.placeholder = `Search ${meta.title}...`;
    filtersWrap.appendChild(qInput);

    if (meta.kind === 'master_categories') {
      const sel = el('select', 'cso-edu-select');
      [['', 'All Portals'], ['all', 'Global'], ['study-library', 'Study Library'], ['jobs-careers', 'Jobs & Careers'], ['schemes', 'Schemes'], ['community', 'Community'], ['about', 'About']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; sel.appendChild(o);
      });
      sel.addEventListener('change', () => { state.filterA = sel.value; loadItems(); });
      filtersWrap.appendChild(sel);
    } else if (meta.kind === 'tags') {
      const sel = el('select', 'cso-edu-select');
      [['', 'All Taxonomy Groups'], ['exam_body', 'Exam Body'], ['subject', 'Subject'], ['class_stage', 'Class Stage'], ['scheme_type', 'Scheme Type'], ['district_odisha', 'Odisha District'], ['general', 'General']].forEach(([v, l]) => {
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
        if (meta.kind === 'master_categories') params.set('level', 'master');
        else if (meta.kind === 'subcategories') params.set('level', 'sub');
        if (state.statusTab !== 'all') params.set('status', state.statusTab);
        if (state.q) params.set('q', state.q);
        if (state.filterA) {
          if (meta.kind === 'master_categories') params.set('target_portal', state.filterA);
          else if (meta.kind === 'tags') params.set('taxonomy_group', state.filterA);
        }
        const data = await api(`${meta.endpoint}?${params.toString()}`);
        state.items = data.items || [];
        state.masters = data.masters || [];
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
      const ov = state.overview || {};
      const cards = [
        ['01 · Master Categories', ov.master_categories ?? '—'],
        ['02 · Subcategories', ov.subcategories ?? '—'],
        ['03 · Canonical Tags', ov.canonical_tags ?? '—'],
        ['04 · Header Links', `${ov.header_links ?? '—'} (${ov.bilingual_pct ?? 100}% OR)`]
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

      const cols = meta.kind === 'tags'
        ? ['Canonical Tag', 'Group', 'Synonyms', 'Usage', 'Status', 'Actions']
        : meta.kind === 'header_nav'
          ? ['Label (EN / OR)', 'URL', 'Badge & Visibility', 'Order', 'Status', 'Actions']
          : ['Category Name', meta.kind === 'subcategories' ? 'Parent Master' : 'Code & Portal', 'Landing URL', 'Order', 'Status', 'Actions'];

      cols.forEach(c => hr.appendChild(el('th', '', c)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const masterMap = new Map(state.masters.map(m => [m.id, m.name_en]));
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

        if (meta.kind === 'tags') {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', `${it.label_en} (${it.canonical_tag})`), el('div', 'cso-edu-title-or', it.label_or || it.slug));
          tr.append(td1, el('td', '', it.taxonomy_group), el('td', '', (it.synonyms || []).join(', ') || '—'), el('td', '', String(it.usage_count || 0)));
        } else if (meta.kind === 'header_nav') {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', `${it.icon_key ? it.icon_key + ' ' : ''}${it.label_en}`), el('div', 'cso-edu-title-or', it.label_or || '—'));
          tr.append(td1, el('td', '', it.url), el('td', '', `${it.badge_text_en || '—'} · ${it.visibility_rule}`), el('td', '', `#${it.sort_order}`));
        } else {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', it.name_en), el('div', 'cso-edu-title-or', it.name_or || it.slug));
          const col2 = meta.kind === 'subcategories' ? (masterMap.get(it.parent_id) || it.parent_id || '—') : `${it.code || '—'} · ${it.target_portal}`;
          tr.append(td1, el('td', '', col2), el('td', '', it.landing_url || '—'), el('td', '', `#${it.sort_order}`));
        }

        const tdSt = el('td');
        const stCls = it.status === 'published' ? 'pub' : it.status === 'archived' ? 'arch' : 'draft';
        tdSt.appendChild(el('span', `cso-edu-badge cso-edu-badge--${stCls}`, it.status));
        tr.appendChild(tdSt);

        const tdAct = el('td', 'cso-edu-actions');
        if (meta.kind !== 'tags') {
          const bUp = el('button', 'cso-edu-btn', '↑'); bUp.type = 'button';
          bUp.addEventListener('click', () => moveItem(idx, -1));
          const bDn = el('button', 'cso-edu-btn', '↓'); bDn.type = 'button';
          bDn.addEventListener('click', () => moveItem(idx, 1));
          tdAct.append(bUp, bDn);
        }
        const btnEdit = el('button', 'cso-edu-btn', 'Edit'); btnEdit.type = 'button';
        btnEdit.addEventListener('click', () => openEditor(it.id));
        tdAct.appendChild(btnEdit);

        if (meta.kind !== 'tags') {
          const btnClone = el('button', 'cso-edu-btn', 'Clone'); btnClone.type = 'button';
          btnClone.addEventListener('click', async () => {
            try {
              await api(`${meta.endpoint}/${it.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'clone' }) });
              toast('Cloned as draft', 'success');
              loadAll();
            } catch (e) { toast(e.message, 'error'); }
          });
          tdAct.appendChild(btnClone);
        }

        const btnDel = el('button', 'cso-edu-btn cso-edu-btn--danger', 'Del'); btnDel.type = 'button';
        btnDel.addEventListener('click', async () => {
          if (!confirm(`Delete this ${meta.title} item?`)) return;
          try {
            await api(`${meta.endpoint}/${it.id}`, { method: 'DELETE' });
            toast('Deleted', 'success');
            loadAll();
          } catch (e) { toast(e.message, 'error'); }
        });
        tdAct.appendChild(btnDel);
        tr.appendChild(tdAct);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      tableWrap.appendChild(tbl);
    }

    function openMergeModal() {
      const backdrop = el('div', 'cso-edu-drawer-backdrop');
      const drawer = el('div', 'cso-edu-drawer');
      const head = el('div', 'cso-edu-drawer-head');
      head.appendChild(el('h3', '', 'Merge Duplicate Tags into Canonical Tag'));
      const closeBtn = el('button', 'cso-edu-btn', 'Close'); closeBtn.type = 'button';
      closeBtn.addEventListener('click', () => backdrop.remove());
      head.appendChild(closeBtn);

      const body = el('div', 'cso-edu-drawer-body');
      const srcSel = el('select', 'cso-edu-select cso-edu-select-full');
      const tgtSel = el('select', 'cso-edu-select cso-edu-select-full');
      state.items.forEach(t => {
        const o1 = el('option', '', `${t.label_en} (${t.canonical_tag})`); o1.value = t.id;
        const o2 = el('option', '', `${t.label_en} (${t.canonical_tag})`); o2.value = t.id;
        srcSel.appendChild(o1); tgtSel.appendChild(o2);
      });
      body.append(buildField('Source Tag (will be merged & removed)', srcSel), buildField('Target Canonical Tag', tgtSel));

      const foot = el('div', 'cso-edu-drawer-foot');
      const runBtn = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Merge Tags'); runBtn.type = 'button';
      runBtn.addEventListener('click', async () => {
        try {
          await api('/api/admin/nav/tags/merge', {
            method: 'POST',
            body: JSON.stringify({ source_tag_id: srcSel.value, target_tag_id: tgtSel.value })
          });
          toast('Merged duplicate tag into canonical tag', 'success');
          backdrop.remove();
          loadAll();
        } catch (e) { toast(e.message, 'error'); }
      });
      foot.append(runBtn);
      drawer.append(head, body, foot);
      backdrop.appendChild(drawer);
      document.body.appendChild(backdrop);
    }

    async function openHeaderPreviewModal() {
      const backdrop = el('div', 'cso-edu-drawer-backdrop');
      const drawer = el('div', 'cso-edu-drawer');
      const head = el('div', 'cso-edu-drawer-head');
      head.appendChild(el('h3', '', 'Live Desktop & Mobile Header Preview (/api/nav/config)'));
      const closeBtn = el('button', 'cso-edu-btn', 'Close'); closeBtn.type = 'button';
      closeBtn.addEventListener('click', () => backdrop.remove());
      head.appendChild(closeBtn);

      const body = el('div', 'cso-edu-drawer-body');
      try {
        const cfg = await api('/api/nav/config');
        const bar = el('div', 'cso-edu-preview-card');
        bar.appendChild(el('div', 'cso-edu-label', `Published Header Links (${(cfg.header || []).length})`));
        const list = el('div', 'cso-edu-badges');
        (cfg.header || []).forEach(h => {
          list.appendChild(el('span', 'cso-edu-badge cso-edu-badge--pub', `${h.icon_key ? h.icon_key + ' ' : ''}${h.label_en}${h.badge_text_en ? ' [' + h.badge_text_en + ']' : ''}`));
        });
        bar.appendChild(list);
        body.appendChild(bar);
      } catch (e) {
        body.appendChild(el('div', 'cso-edu-empty', e.message));
      }

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

      if (meta.kind === 'tags') {
        const lblEn = el('input', 'cso-edu-input cso-edu-input-full'); lblEn.value = item?.label_en || ''; refs.label_en = lblEn;
        const lblOr = el('input', 'cso-edu-input cso-edu-input-full'); lblOr.value = item?.label_or || ''; refs.label_or = lblOr;
        const canIn = el('input', 'cso-edu-input cso-edu-input-full'); canIn.value = item?.canonical_tag || ''; canIn.disabled = Boolean(item); refs.canonical_tag = canIn;
        const grpSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['exam_body', 'subject', 'class_stage', 'scheme_type', 'district_odisha', 'general'].forEach(g => { const o = el('option', '', g); o.value = g; grpSel.appendChild(o); });
        grpSel.value = item?.taxonomy_group || 'general'; refs.taxonomy_group = grpSel;
        const synIn = el('input', 'cso-edu-input cso-edu-input-full'); synIn.value = (item?.synonyms || []).join(', '); refs.synonyms = synIn;

        body.append(
          buildField('Label (English) *', lblEn),
          buildField('Label (Odia)', lblOr),
          buildField('Canonical Tag Slug', canIn),
          buildField('Taxonomy Group', grpSel),
          buildField('Synonyms (comma-separated)', synIn)
        );
      } else if (meta.kind === 'header_nav') {
        const lblEn = el('input', 'cso-edu-input cso-edu-input-full'); lblEn.value = item?.label_en || ''; refs.label_en = lblEn;
        const lblOr = el('input', 'cso-edu-input cso-edu-input-full'); lblOr.value = item?.label_or || ''; refs.label_or = lblOr;
        const urlIn = el('input', 'cso-edu-input cso-edu-input-full'); urlIn.value = item?.url || '/'; refs.url = urlIn;
        const icIn = el('input', 'cso-edu-input cso-edu-input-full'); icIn.value = item?.icon_key || ''; refs.icon_key = icIn;
        const bdgIn = el('input', 'cso-edu-input cso-edu-input-full'); bdgIn.value = item?.badge_text_en || ''; refs.badge_text_en = bdgIn;
        const visSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['all', 'logged_in', 'logged_out'].forEach(v => { const o = el('option', '', v); o.value = v; visSel.appendChild(o); });
        visSel.value = item?.visibility_rule || 'all'; refs.visibility_rule = visSel;
        const hlSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['default', 'pill', 'accent'].forEach(h => { const o = el('option', '', h); o.value = h; hlSel.appendChild(o); });
        hlSel.value = item?.highlight_style || 'default'; refs.highlight_style = hlSel;
        const sortIn = el('input', 'cso-edu-input cso-edu-input-full'); sortIn.type = 'number'; sortIn.value = item?.sort_order ?? 10; refs.sort_order = sortIn;
        const tabChk = el('input'); tabChk.type = 'checkbox'; tabChk.checked = Boolean(item?.open_new_tab); refs.open_new_tab = tabChk;

        body.append(
          buildField('Label (English) *', lblEn),
          buildField('Label (Odia)', lblOr),
          buildField('URL *', urlIn),
          buildField('Icon / Emoji', icIn),
          buildField('Badge (e.g. NEW / LIVE)', bdgIn),
          buildField('Visibility Rule', visSel),
          buildField('Highlight Style', hlSel),
          buildField('Sort Order', sortIn),
          buildField('Open in New Tab', tabChk)
        );
      } else {
        const nameEn = el('input', 'cso-edu-input cso-edu-input-full'); nameEn.value = item?.name_en || ''; refs.name_en = nameEn;
        const nameOr = el('input', 'cso-edu-input cso-edu-input-full'); nameOr.value = item?.name_or || ''; refs.name_or = nameOr;
        if (meta.kind === 'subcategories') {
          const parSel = el('select', 'cso-edu-select cso-edu-select-full');
          state.masters.forEach(m => { const o = el('option', '', m.name_en); o.value = m.id; parSel.appendChild(o); });
          if (item?.parent_id) parSel.value = item.parent_id;
          refs.parent_id = parSel;
          body.appendChild(buildField('Parent Master Category *', parSel));
        }
        const codeIn = el('input', 'cso-edu-input cso-edu-input-full'); codeIn.value = item?.code || ''; refs.code = codeIn;
        const portSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['all', 'study-library', 'jobs-careers', 'schemes', 'community', 'about'].forEach(p => { const o = el('option', '', p); o.value = p; portSel.appendChild(o); });
        portSel.value = item?.target_portal || 'all'; refs.target_portal = portSel;
        const urlIn = el('input', 'cso-edu-input cso-edu-input-full'); urlIn.value = item?.landing_url || ''; refs.landing_url = urlIn;
        const descEn = el('textarea', 'cso-edu-textarea cso-edu-textarea-full'); descEn.value = item?.description_en || ''; refs.description_en = descEn;
        const sortIn = el('input', 'cso-edu-input cso-edu-input-full'); sortIn.type = 'number'; sortIn.value = item?.sort_order ?? 10; refs.sort_order = sortIn;

        body.append(
          buildField('Name (English) *', nameEn),
          buildField('Name (Odia)', nameOr),
          buildField('Short Code', codeIn),
          buildField('Target Portal', portSel),
          buildField('Landing URL', urlIn),
          buildField('Description (English)', descEn),
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
          if (meta.kind === 'tags') {
            Object.assign(payload, {
              label_en: refs.label_en.value.trim(),
              label_or: refs.label_or.value.trim(),
              canonical_tag: refs.canonical_tag.value.trim(),
              taxonomy_group: refs.taxonomy_group.value,
              synonyms: refs.synonyms.value.split(',').map(s => s.trim()).filter(Boolean)
            });
          } else if (meta.kind === 'header_nav') {
            Object.assign(payload, {
              label_en: refs.label_en.value.trim(),
              label_or: refs.label_or.value.trim(),
              url: refs.url.value.trim(),
              icon_key: refs.icon_key.value.trim(),
              badge_text_en: refs.badge_text_en.value.trim(),
              visibility_rule: refs.visibility_rule.value,
              highlight_style: refs.highlight_style.value,
              sort_order: Number(refs.sort_order.value || 10),
              open_new_tab: refs.open_new_tab.checked
            });
          } else {
            Object.assign(payload, {
              parent_id: meta.kind === 'subcategories' ? refs.parent_id.value : null,
              name_en: refs.name_en.value.trim(),
              name_or: refs.name_or.value.trim(),
              code: refs.code.value.trim(),
              target_portal: refs.target_portal.value,
              landing_url: refs.landing_url.value.trim(),
              description_en: refs.description_en.value.trim(),
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

  window.CSOCatNavBatch1 = { render, MODULE_META };
})();
