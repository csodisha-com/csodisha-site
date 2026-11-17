/* Files, Media & Cloud Batch 4 (13-15) Content Command Workspace — Strict CSP */
(() => {
  'use strict';

  const MODULE_META = {
    'module-07-013': { num: '13', endpoint: '/api/admin/media/duplicates', kind: 'duplicates', title: 'Duplicate Detection' },
    'module-07-014': { num: '14', endpoint: '/api/admin/media/broken-links', kind: 'broken_links', title: 'Broken File Links' },
    'module-07-015': { num: '15', endpoint: '/api/admin/media/optimize', kind: 'optimize', title: 'Media Optimization' }
  };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function fmtBytes(bytes) {
    const b = Number(bytes || 0);
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(2)} MB`;
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
      filterA: '',
      items: [],
      selectedIds: new Set(),
      overview: null
    };

    const presetSel = el('select', 'cso-edu-select');
    [['high_90', 'High Quality (90%)'], ['balanced_80', 'Balanced (80%)'], ['compact_65', 'Compact (65%)']].forEach(([v, l]) => {
      const o = el('option', '', l); o.value = v; presetSel.appendChild(o);
    });
    presetSel.value = 'balanced_80';

    if (actions) {
      actions.replaceChildren();
      if (meta.kind === 'duplicates') {
        const btnScan = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Run Duplicate Scan'); btnScan.type = 'button';
        btnScan.addEventListener('click', async () => {
          try {
            const out = await api('/api/admin/media/duplicates/scan', { method: 'POST', body: '{}' });
            toast(`Scan complete: ${out.groups_found} duplicate group(s) found`, 'success');
            loadAll();
          } catch (e) { toast(e.message, 'error'); }
        });
        actions.appendChild(btnScan);
      } else if (meta.kind === 'broken_links') {
        const btnScan = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Scan All R2 & Cloud Links'); btnScan.type = 'button';
        btnScan.addEventListener('click', async () => {
          try {
            const out = await api('/api/admin/media/broken-links/scan', { method: 'POST', body: '{}' });
            toast(`Scan complete: ${out.broken_count} broken link(s) detected`, out.broken_count ? 'error' : 'success');
            loadAll();
          } catch (e) { toast(e.message, 'error'); }
        });
        actions.appendChild(btnScan);
      } else {
        const btnDisc = el('button', 'cso-edu-btn', 'Discover Unoptimized Assets'); btnDisc.type = 'button';
        btnDisc.addEventListener('click', async () => {
          try {
            const out = await api('/api/admin/media/optimize/scan', { method: 'POST', body: '{}' });
            toast(`Queued ${out.newly_queued} new candidate(s)`, 'success');
            loadAll();
          } catch (e) { toast(e.message, 'error'); }
        });
        const btnOpt = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Optimize Selected'); btnOpt.type = 'button';
        btnOpt.addEventListener('click', async () => {
          const ids = state.selectedIds.size ? [...state.selectedIds] : state.items.filter(i => i.job_status === 'queued').map(i => i.id);
          if (!ids.length) { toast('No queued jobs to optimize', 'info'); return; }
          try {
            const out = await api('/api/admin/media/optimize/run', {
              method: 'POST',
              body: JSON.stringify({ job_ids: ids, quality_preset: presetSel.value })
            });
            toast(`Optimized ${out.processed} asset(s) at ${out.quality_preset}`, 'success');
            loadAll();
          } catch (e) { toast(e.message, 'error'); }
        });
        actions.append(btnDisc, presetSel, btnOpt);
      }
    }

    const wrap = el('div', 'cso-edu-wrap');
    const kpiGrid = el('div', 'cso-edu-kpis');
    const toolbar = el('div', 'cso-edu-toolbar');
    const tabsWrap = el('div', 'cso-edu-tabs');
    const filtersWrap = el('div', 'cso-edu-filters');
    const tableWrap = el('div', 'cso-edu-table-wrap');
    const meterCard = el('div', 'cso-edu-preview-card');
    meterCard.hidden = meta.kind !== 'optimize';

    if (meta.kind === 'broken_links') {
      const sel = el('select', 'cso-edu-select');
      [['', 'All Issues'], ['missing_r2_object', 'Missing R2 Object'], ['http_404', 'HTTP 404'], ['http_403_restricted', 'Restricted 403'], ['empty_url', 'Empty URL']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; sel.appendChild(o);
      });
      sel.addEventListener('change', () => { state.filterA = sel.value; loadItems(); });
      filtersWrap.appendChild(sel);
    }

    toolbar.append(tabsWrap, filtersWrap);
    wrap.append(kpiGrid, meterCard, toolbar, tableWrap);
    root.replaceChildren(wrap);

    async function loadAll() {
      await Promise.all([loadOverview(), loadItems()]);
    }

    async function loadOverview() {
      try {
        state.overview = await api('/api/admin/media/overview');
        renderKpis();
      } catch (e) {}
    }

    async function loadItems() {
      try {
        const params = new URLSearchParams();
        if (state.filterA && meta.kind === 'broken_links') params.set('issue_type', state.filterA);
        const data = await api(`${meta.endpoint}?${params.toString()}`);
        state.items = data.items || [];
        state.selectedIds.clear();
        renderMeter();
        renderTable();
      } catch (err) {
        tableWrap.replaceChildren(el('div', 'cso-edu-empty', `Failed to load ${meta.title}: ${err.message}`));
      }
    }

    function renderKpis() {
      kpiGrid.replaceChildren();
      const s15 = (state.overview && state.overview.suite_15) || {};
      const cards = [
        ['15-Module Files', s15.total_files ?? '—'],
        ['13 · Open Duplicates', `${s15.open_duplicate_groups ?? 0} (${fmtBytes(s15.reclaimable_bytes)})`],
        ['14 · Broken Links', s15.open_broken_links ?? 0],
        ['15 · Bandwidth Saved', `${s15.optimization_savings_pct ?? 0}%`]
      ];
      cards.forEach(([label, val]) => {
        const card = el('div', 'cso-edu-kpi');
        card.append(el('div', 'cso-edu-kpi-lbl', label), el('div', 'cso-edu-kpi-val', val));
        kpiGrid.appendChild(card);
      });
    }

    function renderMeter() {
      if (meta.kind !== 'optimize') return;
      const s15 = (state.overview && state.overview.suite_15) || {};
      const pct = s15.optimization_savings_pct ?? 0;
      const prog = el('progress'); prog.max = 100; prog.value = pct;
      meterCard.replaceChildren(
        el('div', 'cso-edu-label', `Media Bandwidth Savings Meter: ${pct}% average reduction across completed jobs`),
        prog
      );
    }

    function renderTable() {
      tableWrap.replaceChildren();
      if (!state.items.length) {
        tableWrap.appendChild(el('div', 'cso-edu-empty', `No records in ${meta.title}. Run a scan above.`));
        return;
      }
      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');

      if (meta.kind === 'optimize') {
        const thChk = el('th');
        const chkAll = el('input'); chkAll.type = 'checkbox';
        chkAll.addEventListener('change', () => {
          state.selectedIds.clear();
          if (chkAll.checked) state.items.forEach(it => state.selectedIds.add(it.id));
          tableWrap.querySelectorAll('tbody input[type="checkbox"]').forEach(c => { c.checked = chkAll.checked; });
        });
        thChk.appendChild(chkAll);
        hr.appendChild(thChk);
      }

      const cols = meta.kind === 'duplicates'
        ? ['Fingerprint & Basis', 'Canonical File', 'Duplicate Copies', 'Reclaimable', 'Status', 'Actions']
        : meta.kind === 'broken_links'
          ? ['Resource Title', 'Source Table', 'Issue & Target', 'Fix Status', 'Actions']
          : ['Asset Title', 'Kind & Target Format', 'Original -> Optimized', 'Preset & Savings', 'Status'];

      cols.forEach(c => hr.appendChild(el('th', '', c)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      state.items.forEach(it => {
        const tr = el('tr');
        if (meta.kind === 'optimize') {
          const tdChk = el('td');
          const chk = el('input'); chk.type = 'checkbox';
          chk.checked = state.selectedIds.has(it.id);
          chk.addEventListener('change', () => {
            if (chk.checked) state.selectedIds.add(it.id);
            else state.selectedIds.delete(it.id);
          });
          tdChk.appendChild(chk);
          tr.appendChild(tdChk);
        }

        if (meta.kind === 'duplicates') {
          tr.append(
            el('td', '', `${it.match_basis} (${it.fingerprint_key.slice(0, 24)}...)`),
            el('td', '', it.canonical_file_id),
            el('td', '', `${(it.duplicate_file_ids || []).length} redundant`),
            el('td', '', fmtBytes(it.reclaimable_bytes))
          );
          const tdSt = el('td');
          tdSt.appendChild(el('span', `cso-edu-badge ${it.resolution_status === 'merged' ? 'cso-edu-badge--ok' : 'cso-edu-badge--warn'}`, it.resolution_status));
          tr.appendChild(tdSt);

          const tdAct = el('td', 'cso-edu-actions');
          if (it.resolution_status === 'open') {
            const btnM = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Merge & Reclaim'); btnM.type = 'button';
            btnM.addEventListener('click', async () => {
              try {
                await api('/api/admin/media/duplicates/merge', {
                  method: 'POST',
                  body: JSON.stringify({ group_id: it.id, canonical_file_id: it.canonical_file_id, action: 'merge' })
                });
                toast(`Merged duplicates & reclaimed ${fmtBytes(it.reclaimable_bytes)}`, 'success');
                loadAll();
              } catch (e) { toast(e.message, 'error'); }
            });
            const btnI = el('button', 'cso-edu-btn', 'Ignore'); btnI.type = 'button';
            btnI.addEventListener('click', async () => {
              try {
                await api('/api/admin/media/duplicates/merge', {
                  method: 'POST',
                  body: JSON.stringify({ group_id: it.id, action: 'ignore' })
                });
                loadAll();
              } catch (e) { toast(e.message, 'error'); }
            });
            tdAct.append(btnM, btnI);
          }
          tr.appendChild(tdAct);
        } else if (meta.kind === 'broken_links') {
          tr.append(
            el('td', '', it.title_en || it.source_id),
            el('td', '', it.source_table),
            el('td', '', `${it.issue_type}: ${it.target_url || it.r2_key || 'empty'}`)
          );
          const tdSt = el('td');
          tdSt.appendChild(el('span', `cso-edu-badge ${it.fix_status === 'repaired' ? 'cso-edu-badge--ok' : 'cso-edu-badge--arch'}`, it.fix_status));
          tr.appendChild(tdSt);

          const tdAct = el('td', 'cso-edu-actions');
          if (it.fix_status === 'open') {
            const btnRep = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Repair URL'); btnRep.type = 'button';
            btnRep.addEventListener('click', () => openRepairModal(it));
            const btnArch = el('button', 'cso-edu-btn cso-edu-btn--danger', 'Archive'); btnArch.type = 'button';
            btnArch.addEventListener('click', async () => {
              try {
                await api(`/api/admin/media/broken-links/${it.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'archive' }) });
                toast('Archived broken entry', 'success');
                loadAll();
              } catch (e) { toast(e.message, 'error'); }
            });
            tdAct.append(btnRep, btnArch);
          }
          tr.appendChild(tdAct);
        } else {
          tr.append(
            el('td', '', it.title_en || it.file_id),
            el('td', '', `${it.asset_kind} -> ${it.target_format}`),
            el('td', '', `${fmtBytes(it.original_bytes)} -> ${it.optimized_bytes ? fmtBytes(it.optimized_bytes) : 'Pending'}`),
            el('td', '', `${it.quality_preset} (${it.savings_pct || 0}%)`)
          );
          const tdSt = el('td');
          tdSt.appendChild(el('span', `cso-edu-badge ${it.job_status === 'completed' ? 'cso-edu-badge--ok' : 'cso-edu-badge--draft'}`, it.job_status));
          tr.appendChild(tdSt);
        }
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      tableWrap.appendChild(tbl);
    }

    function openRepairModal(brkItem) {
      const backdrop = el('div', 'cso-edu-drawer-backdrop');
      const drawer = el('div', 'cso-edu-drawer');
      const head = el('div', 'cso-edu-drawer-head');
      head.appendChild(el('h3', '', `Repair Broken Link: ${brkItem.title_en}`));
      const closeBtn = el('button', 'cso-edu-btn', 'Close'); closeBtn.type = 'button';
      closeBtn.addEventListener('click', () => backdrop.remove());
      head.appendChild(closeBtn);

      const body = el('div', 'cso-edu-drawer-body');
      const urlIn = el('input', 'cso-edu-input cso-edu-input-full');
      urlIn.placeholder = '/api/media/vault/... or https://...';
      body.appendChild(buildField('Replacement URL *', urlIn));

      const foot = el('div', 'cso-edu-drawer-foot');
      const saveBtn = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Save Repair'); saveBtn.type = 'button';
      saveBtn.addEventListener('click', async () => {
        try {
          await api(`/api/admin/media/broken-links/${brkItem.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ action: 'repair', replacement_url: urlIn.value.trim() })
          });
          toast('Link repaired', 'success');
          backdrop.remove();
          loadAll();
        } catch (e) { toast(e.message, 'error'); }
      });
      foot.appendChild(saveBtn);
      drawer.append(head, body, foot);
      backdrop.appendChild(drawer);
      document.body.appendChild(backdrop);
    }

    loadAll();
    return true;
  }

  window.CSOFilesMediaBatch4 = { render, MODULE_META };
})();
