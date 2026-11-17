/* Files, Media & Cloud Batch 3 (09-12) Content Command Workspace — Strict CSP */
(() => {
  'use strict';

  const MODULE_META = {
    'module-07-009': { num: '09', endpoint: '/api/admin/media/providers', kind: 'providers', title: 'Storage Providers' },
    'module-07-010': { num: '10', endpoint: '/api/admin/media/versions', kind: 'versions', title: 'File Versions' },
    'module-07-011': { num: '11', endpoint: '/api/admin/media/permissions', kind: 'permissions', title: 'File Permissions' },
    'module-07-012': { num: '12', endpoint: '/api/admin/media/usage', kind: 'usage', title: 'Storage Usage' }
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
    if (b < 1073741824) return `${(b / 1048576).toFixed(2)} MB`;
    return `${(b / 1073741824).toFixed(2)} GB`;
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
      files: [],
      counts: { all: 0, published: 0, draft: 0, archived: 0 },
      selectedIds: new Set(),
      overview: null
    };

    if (actions) {
      actions.replaceChildren();
      if (meta.kind === 'providers' || meta.kind === 'permissions') {
        const btnNew = el('button', 'cso-edu-btn cso-edu-btn--primary', '+ Create New');
        btnNew.type = 'button';
        btnNew.addEventListener('click', () => openEditor(null));
        actions.appendChild(btnNew);
      }
      if (meta.kind === 'providers') {
        const btnPing = el('button', 'cso-edu-btn', 'Run Health Ping');
        btnPing.type = 'button';
        btnPing.addEventListener('click', async () => {
          try {
            const out = await api('/api/admin/media/providers/health-check', { method: 'POST', body: '{}' });
            toast(`Pinged ${(out.checked || []).length} providers`, 'success');
            loadAll();
          } catch (e) { toast(e.message, 'error'); }
        });
        actions.appendChild(btnPing);
      } else if (meta.kind === 'versions') {
        const btnVer = el('button', 'cso-edu-btn cso-edu-btn--primary', '+ Upload New Version');
        btnVer.type = 'button';
        btnVer.addEventListener('click', openNewVersionModal);
        actions.appendChild(btnVer);
      } else if (meta.kind === 'permissions') {
        const btnSim = el('button', 'cso-edu-btn', 'Test Role Access');
        btnSim.type = 'button';
        btnSim.addEventListener('click', openSimulatorModal);
        actions.appendChild(btnSim);
      }
    }

    const wrap = el('div', 'cso-edu-wrap');
    const kpiGrid = el('div', 'cso-edu-kpis');
    wrap.appendChild(kpiGrid);

    async function loadOverview() {
      try {
        state.overview = await api('/api/admin/media/overview');
        renderKpis();
      } catch (e) {}
    }

    function renderKpis() {
      kpiGrid.replaceChildren();
      const b3 = (state.overview && state.overview.batch3) || {};
      const cards = [
        ['09 · Providers', b3.providers ?? '—'],
        ['10 · Tracked Versions', b3.versions ?? '—'],
        ['11 · Active Policies', b3.policies ?? '—'],
        ['12 · Quota Used', `${fmtBytes(b3.used_bytes)} (${b3.usage_pct ?? 0}%)`]
      ];
      cards.forEach(([label, val]) => {
        const card = el('div', 'cso-edu-kpi');
        card.append(el('div', 'cso-edu-kpi-lbl', label), el('div', 'cso-edu-kpi-val', val));
        kpiGrid.appendChild(card);
      });
    }

    if (meta.kind === 'usage') {
      const usageBox = el('div', 'cso-edu-wrap');
      wrap.appendChild(usageBox);
      root.replaceChildren(wrap);
      loadOverview();
      loadUsage(usageBox);
      return true;
    }

    async function loadUsage(container) {
      try {
        const u = await api('/api/admin/media/usage');
        container.replaceChildren();

        const quotaCard = el('div', 'cso-edu-preview-card');
        const prog = el('progress');
        prog.max = 100;
        prog.value = Math.min(100, u.usage_pct || 0);
        quotaCard.append(
          el('div', 'cso-edu-label', `R2 Storage Quota: ${fmtBytes(u.total_bytes)} / ${fmtBytes(u.quota_bytes)} (${u.usage_pct}%) · ${u.total_files} files`),
          prog
        );
        container.appendChild(quotaCard);

        const catCard = el('div', 'cso-edu-preview-card');
        catCard.appendChild(el('div', 'cso-edu-label', 'Breakdown by File Category'));
        (u.by_category || []).forEach(c => {
          const p = el('progress'); p.max = 100; p.value = c.pct || 0;
          catCard.append(el('div', 'cso-edu-title-or', `${c.file_category.toUpperCase()}: ${c.file_count} files · ${fmtBytes(c.total_bytes)} (${c.pct}%)`), p);
        });
        container.appendChild(catCard);

        const tblWrap = el('div', 'cso-edu-table-wrap');
        const tbl = el('table', 'cso-edu-table');
        const thead = el('thead');
        const hr = el('tr');
        ['Largest Files', 'Category', 'Size', 'Downloads', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
        thead.appendChild(hr);
        tbl.appendChild(thead);
        const tbody = el('tbody');
        (u.largest_files || []).forEach(f => {
          const tr = el('tr');
          tr.append(
            el('td', '', f.title_en),
            el('td', '', f.file_category.toUpperCase()),
            el('td', '', fmtBytes(f.file_size_bytes)),
            el('td', '', String(f.download_count || 0))
          );
          const tdAct = el('td', 'cso-edu-actions');
          const bDel = el('button', 'cso-edu-btn cso-edu-btn--danger', 'Delete'); bDel.type = 'button';
          bDel.addEventListener('click', async () => {
            if (!confirm(`Delete ${f.title_en}?`)) return;
            try {
              await api(`/api/admin/media/files/${f.id}`, { method: 'DELETE' });
              toast('File deleted', 'success');
              loadOverview();
              loadUsage(container);
            } catch (e) { toast(e.message, 'error'); }
          });
          tdAct.appendChild(bDel);
          tr.appendChild(tdAct);
          tbody.appendChild(tr);
        });
        tbl.appendChild(tbody);
        tblWrap.appendChild(tbl);
        container.appendChild(tblWrap);
      } catch (e) {
        container.replaceChildren(el('div', 'cso-edu-empty', `Failed to load usage: ${e.message}`));
      }
    }

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

    if (meta.kind === 'permissions') {
      const sel = el('select', 'cso-edu-select');
      [['', 'All Targets'], ['folder', 'Folder'], ['file_category', 'File Category'], ['specific_file', 'Specific File'], ['storage_provider', 'Storage Provider']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; sel.appendChild(o);
      });
      sel.addEventListener('change', () => { state.filterA = sel.value; loadItems(); });
      filtersWrap.appendChild(sel);
    }

    toolbar.append(tabsWrap, filtersWrap);
    wrap.append(toolbar, bulkBar, tableWrap);
    root.replaceChildren(wrap);

    let timer = null;
    qInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.q = qInput.value.trim(); loadItems(); }, 220);
    });

    async function loadAll() {
      await Promise.all([loadOverview(), loadItems()]);
    }

    async function loadItems() {
      try {
        const params = new URLSearchParams();
        if (state.statusTab !== 'all' && meta.kind !== 'versions') params.set('status', state.statusTab);
        if (state.q) params.set('q', state.q);
        if (state.filterA && meta.kind === 'permissions') params.set('target_type', state.filterA);
        const data = await api(`${meta.endpoint}?${params.toString()}`);
        state.items = data.items || [];
        state.files = data.files || [];
        state.counts = data.counts || state.counts;
        state.selectedIds.clear();
        renderTabs();
        renderBulkBar();
        renderTable();
      } catch (err) {
        tableWrap.replaceChildren(el('div', 'cso-edu-empty', `Failed to load ${meta.title}: ${err.message}`));
      }
    }

    function renderTabs() {
      tabsWrap.replaceChildren();
      if (meta.kind === 'versions') {
        tabsWrap.appendChild(el('span', 'cso-edu-badge cso-edu-badge--pub', `${state.items.length} binary versions tracked`));
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
      if (!state.selectedIds.size || meta.kind === 'versions') { bulkBar.hidden = true; return; }
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

    function renderTable() {
      tableWrap.replaceChildren();
      if (!state.items.length) {
        tableWrap.appendChild(el('div', 'cso-edu-empty', `No records in ${meta.title}.`));
        return;
      }
      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      if (meta.kind !== 'versions') {
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

      const cols = meta.kind === 'providers'
        ? ['Provider Name', 'Key & Bucket', 'Quota & Default', 'Health', 'Status', 'Actions']
        : meta.kind === 'versions'
          ? ['File Title', 'Version', 'Size & SHA-256', 'Change Summary', 'Current', 'Actions']
          : ['Policy Name', 'Target', 'Allowed Roles', 'Caps & Login', 'Status', 'Actions'];

      cols.forEach(c => hr.appendChild(el('th', '', c)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      state.items.forEach(it => {
        const tr = el('tr');
        if (meta.kind !== 'versions') {
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

        if (meta.kind === 'providers') {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', it.name_en), el('div', 'cso-edu-title-or', it.name_or || it.base_url_prefix));
          const tdH = el('td');
          const hCls = it.health_status === 'healthy' ? 'ok' : it.health_status === 'degraded' ? 'warn' : 'arch';
          tdH.appendChild(el('span', `cso-edu-badge cso-edu-badge--${hCls}`, `${it.health_status} (${it.last_ping_ms || 0}ms)`));
          tr.append(
            td1,
            el('td', '', `${it.provider_key} · ${it.bucket_or_root_label}`),
            el('td', '', `${fmtBytes(it.quota_limit_bytes)}${it.is_default_upload_target ? ' · Default' : ''}`),
            tdH
          );
        } else if (meta.kind === 'versions') {
          tr.append(
            el('td', '', it.file_title_en || it.file_id),
            el('td', '', it.version_label),
            el('td', '', `${fmtBytes(it.file_size_bytes)} · ${(it.sha256_hash || '—').slice(0, 12)}`),
            el('td', '', it.change_summary_en || '—')
          );
          const tdCur = el('td');
          tdCur.appendChild(el('span', `cso-edu-badge ${it.is_current ? 'cso-edu-badge--ok' : 'cso-edu-badge--draft'}`, it.is_current ? 'Current' : 'Archive'));
          tr.appendChild(tdCur);
        } else {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', it.policy_name_en), el('div', 'cso-edu-title-or', it.policy_name_or || it.slug));
          tr.append(
            td1,
            el('td', '', `${it.target_type}: ${it.target_ref_id || 'All'}`),
            el('td', '', (it.allowed_roles || []).join(', ')),
            el('td', '', `${it.require_login ? 'Login Req' : 'Open'} · Cap: ${it.daily_download_cap || '∞'}`)
          );
        }

        if (meta.kind !== 'versions') {
          const tdSt = el('td');
          const stCls = it.status === 'published' ? 'pub' : it.status === 'archived' ? 'arch' : 'draft';
          tdSt.appendChild(el('span', `cso-edu-badge cso-edu-badge--${stCls}`, it.status));
          tr.appendChild(tdSt);
        }

        const tdAct = el('td', 'cso-edu-actions');
        if (meta.kind === 'versions') {
          if (!it.is_current) {
            const btnRest = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Restore This Version'); btnRest.type = 'button';
            btnRest.addEventListener('click', async () => {
              try {
                await api('/api/admin/media/versions', {
                  method: 'PATCH',
                  body: JSON.stringify({ action: 'restore_version', version_id: it.id })
                });
                toast(`Restored ${it.version_label}`, 'success');
                loadAll();
              } catch (e) { toast(e.message, 'error'); }
            });
            tdAct.appendChild(btnRest);
          }
        } else {
          const btnEdit = el('button', 'cso-edu-btn', 'Edit'); btnEdit.type = 'button';
          btnEdit.addEventListener('click', () => openEditor(it.id));
          tdAct.appendChild(btnEdit);
          if (meta.kind === 'permissions') {
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
        }
        tr.appendChild(tdAct);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      tableWrap.appendChild(tbl);
    }

    function openNewVersionModal() {
      const backdrop = el('div', 'cso-edu-drawer-backdrop');
      const drawer = el('div', 'cso-edu-drawer');
      const head = el('div', 'cso-edu-drawer-head');
      head.appendChild(el('h3', '', 'Upload / Register New File Version'));
      const closeBtn = el('button', 'cso-edu-btn', 'Close'); closeBtn.type = 'button';
      closeBtn.addEventListener('click', () => backdrop.remove());
      head.appendChild(closeBtn);

      const body = el('div', 'cso-edu-drawer-body');
      const fSel = el('select', 'cso-edu-select cso-edu-select-full');
      state.files.forEach(f => { const o = el('option', '', f.title_en); o.value = f.id; fSel.appendChild(o); });
      const lblIn = el('input', 'cso-edu-input cso-edu-input-full'); lblIn.placeholder = 'v2.0';
      const urlIn = el('input', 'cso-edu-input cso-edu-input-full'); urlIn.placeholder = '/api/media/vault/...';
      const sumIn = el('input', 'cso-edu-input cso-edu-input-full'); sumIn.placeholder = 'Updated 2026 Odisha syllabus pages';
      const upIn = el('input', 'cso-edu-input'); upIn.type = 'file';
      let uploadedMeta = {};
      upIn.addEventListener('change', async () => {
        if (!upIn.files[0]) return;
        const fd = new FormData(); fd.append('files', upIn.files[0]);
        try {
          const out = await api('/api/admin/media/upload', { method: 'POST', body: fd });
          const first = (out.items || [])[0] || {};
          urlIn.value = out.url || '';
          uploadedMeta = { r2_key: out.key, file_size_bytes: first.file_size_bytes, sha256_hash: first.sha256_hash };
          toast('Uploaded binary to R2', 'success');
        } catch (e) { toast(e.message, 'error'); }
      });

      body.append(
        buildField('Target File *', fSel),
        buildField('Version Label', lblIn),
        buildField('Upload Replacement Binary to R2', upIn),
        buildField('Public URL', urlIn),
        buildField('Change Summary', sumIn)
      );

      const foot = el('div', 'cso-edu-drawer-foot');
      const saveBtn = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Save New Version'); saveBtn.type = 'button';
      saveBtn.addEventListener('click', async () => {
        try {
          await api('/api/admin/media/versions', {
            method: 'POST',
            body: JSON.stringify({
              file_id: fSel.value,
              version_label: lblIn.value.trim(),
              public_url: urlIn.value.trim(),
              change_summary_en: sumIn.value.trim(),
              ...uploadedMeta
            })
          });
          toast('New version registered', 'success');
          backdrop.remove();
          loadAll();
        } catch (e) { toast(e.message, 'error'); }
      });
      foot.append(saveBtn);
      drawer.append(head, body, foot);
      backdrop.appendChild(drawer);
      document.body.appendChild(backdrop);
    }

    function openSimulatorModal() {
      const backdrop = el('div', 'cso-edu-drawer-backdrop');
      const drawer = el('div', 'cso-edu-drawer');
      const head = el('div', 'cso-edu-drawer-head');
      head.appendChild(el('h3', '', 'File Permission Access Simulator'));
      const closeBtn = el('button', 'cso-edu-btn', 'Close'); closeBtn.type = 'button';
      closeBtn.addEventListener('click', () => backdrop.remove());
      head.appendChild(closeBtn);

      const body = el('div', 'cso-edu-drawer-body');
      const rSel = el('select', 'cso-edu-select cso-edu-select-full');
      ['public', 'student', 'educator', 'moderator', 'admin'].forEach(r => { const o = el('option', '', r); o.value = r; rSel.appendChild(o); });
      const logChk = el('input'); logChk.type = 'checkbox';
      const tSel = el('select', 'cso-edu-select cso-edu-select-full');
      ['folder', 'file_category', 'specific_file', 'storage_provider'].forEach(t => { const o = el('option', '', t); o.value = t; tSel.appendChild(o); });
      const refIn = el('input', 'cso-edu-input cso-edu-input-full'); refIn.value = 'mf-pyq-archive';
      const outBox = el('div', 'cso-edu-preview-card', 'Click Run Simulation to test access.');
      const runBtn = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Run Simulation'); runBtn.type = 'button';
      runBtn.addEventListener('click', async () => {
        try {
          const out = await api('/api/admin/media/permissions/simulate', {
            method: 'POST',
            body: JSON.stringify({ role: rSel.value, logged_in: logChk.checked, target_type: tSel.value, target_ref_id: refIn.value.trim() })
          });
          outBox.textContent = `Preview: ${out.allowed_preview ? 'ALLOWED' : 'DENIED'} | Download: ${out.allowed_download ? 'ALLOWED' : 'DENIED'}\nPolicy: ${out.matched_policy || 'Default'}\nReason: ${out.reason}`;
        } catch (e) { toast(e.message, 'error'); }
      });

      body.append(buildField('Role', rSel), buildField('Logged In', logChk), buildField('Target Type', tSel), buildField('Target Ref ID', refIn), runBtn, outBox);
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

      if (meta.kind === 'providers') {
        const nameEn = el('input', 'cso-edu-input cso-edu-input-full'); nameEn.value = item?.name_en || ''; refs.name_en = nameEn;
        const nameOr = el('input', 'cso-edu-input cso-edu-input-full'); nameOr.value = item?.name_or || ''; refs.name_or = nameOr;
        const pSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['r2_primary', 'google_drive', 'cloudflare_images', 'internet_archive', 'github_releases', 'custom_s3_cdn'].forEach(p => { const o = el('option', '', p); o.value = p; pSel.appendChild(o); });
        pSel.value = item?.provider_key || 'custom_s3_cdn'; refs.provider_key = pSel;
        const bktIn = el('input', 'cso-edu-input cso-edu-input-full'); bktIn.value = item?.bucket_or_root_label || ''; refs.bucket_or_root_label = bktIn;
        const urlIn = el('input', 'cso-edu-input cso-edu-input-full'); urlIn.value = item?.base_url_prefix || ''; refs.base_url_prefix = urlIn;
        const defChk = el('input'); defChk.type = 'checkbox'; defChk.checked = Boolean(item?.is_default_upload_target); refs.is_default_upload_target = defChk;

        body.append(
          buildField('Provider Name (EN) *', nameEn),
          buildField('Provider Name (OR)', nameOr),
          buildField('Provider Key', pSel),
          buildField('Bucket / Root Label', bktIn),
          buildField('Base URL Prefix', urlIn),
          buildField('Default Upload Target', defChk)
        );
      } else {
        const nameEn = el('input', 'cso-edu-input cso-edu-input-full'); nameEn.value = item?.policy_name_en || ''; refs.policy_name_en = nameEn;
        const nameOr = el('input', 'cso-edu-input cso-edu-input-full'); nameOr.value = item?.policy_name_or || ''; refs.policy_name_or = nameOr;
        const tSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['folder', 'file_category', 'specific_file', 'storage_provider'].forEach(t => { const o = el('option', '', t); o.value = t; tSel.appendChild(o); });
        tSel.value = item?.target_type || 'folder'; refs.target_type = tSel;
        const refIn = el('input', 'cso-edu-input cso-edu-input-full'); refIn.value = item?.target_ref_id || ''; refs.target_ref_id = refIn;
        const rolesIn = el('input', 'cso-edu-input cso-edu-input-full'); rolesIn.value = (item?.allowed_roles || ['public', 'student']).join(', '); refs.allowed_roles = rolesIn;
        const logChk = el('input'); logChk.type = 'checkbox'; logChk.checked = Boolean(item?.require_login); refs.require_login = logChk;
        const capIn = el('input', 'cso-edu-input cso-edu-input-full'); capIn.type = 'number'; capIn.value = item?.daily_download_cap ?? 0; refs.daily_download_cap = capIn;

        body.append(
          buildField('Policy Name (EN) *', nameEn),
          buildField('Policy Name (OR)', nameOr),
          buildField('Target Type', tSel),
          buildField('Target Ref ID', refIn),
          buildField('Allowed Roles (comma-separated)', rolesIn),
          buildField('Require Login', logChk),
          buildField('Daily Download Cap (0 = unlimited)', capIn)
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
          if (meta.kind === 'providers') {
            Object.assign(payload, {
              name_en: refs.name_en.value.trim(),
              name_or: refs.name_or.value.trim(),
              provider_key: refs.provider_key.value,
              bucket_or_root_label: refs.bucket_or_root_label.value.trim(),
              base_url_prefix: refs.base_url_prefix.value.trim(),
              is_default_upload_target: refs.is_default_upload_target.checked
            });
          } else {
            Object.assign(payload, {
              policy_name_en: refs.policy_name_en.value.trim(),
              policy_name_or: refs.policy_name_or.value.trim(),
              target_type: refs.target_type.value,
              target_ref_id: refs.target_ref_id.value.trim(),
              allowed_roles: refs.allowed_roles.value.split(',').map(s => s.trim()).filter(Boolean),
              require_login: refs.require_login.checked,
              daily_download_cap: Number(refs.daily_download_cap.value || 0)
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

  window.CSOFilesMediaBatch3 = { render, MODULE_META };
})();
