/* Files, Media & Cloud Batch 1 (01-04) Content Command Workspace — Strict CSP */
(() => {
  'use strict';

  const MODULE_META = {
    'module-07-001': { num: '01', endpoint: '/api/admin/media/files', kind: 'file_library', title: 'File Library' },
    'module-07-002': { num: '02', endpoint: '/api/admin/media/upload', kind: 'bulk_upload', title: 'Bulk Uploads' },
    'module-07-003': { num: '03', endpoint: '/api/admin/media/folders', kind: 'folders', title: 'Folders & Collections' },
    'module-07-004': { num: '04', endpoint: '/api/admin/media/files', kind: 'pdf_manager', title: 'PDF Manager' }
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
      statusTab: 'all',
      q: '',
      filterA: '',
      filterB: '',
      items: [],
      folders: [],
      counts: { all: 0, published: 0, draft: 0, archived: 0 },
      selectedIds: new Set(),
      overview: null
    };

    if (actions) {
      actions.replaceChildren();
      if (meta.kind !== 'bulk_upload') {
        const btnNew = el('button', 'cso-edu-btn cso-edu-btn--primary', '+ Create New');
        btnNew.type = 'button';
        btnNew.addEventListener('click', () => openEditor(null));
        actions.appendChild(btnNew);
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
      const ov = state.overview || {};
      const cards = [
        ['01 · Total Media Files', ov.total_files ?? '—'],
        ['04 · PDF Documents', ov.pdf_count ?? '—'],
        ['03 · Folders', ov.folder_count ?? '—'],
        ['R2 Storage', `${fmtBytes(ov.total_r2_bytes)} (${ov.bilingual_pct ?? 100}% OR)`]
      ];
      cards.forEach(([label, val]) => {
        const card = el('div', 'cso-edu-kpi');
        card.append(el('div', 'cso-edu-kpi-lbl', label), el('div', 'cso-edu-kpi-val', val));
        kpiGrid.appendChild(card);
      });
    }

    if (meta.kind === 'bulk_upload') {
      renderBulkUploadWorkspace();
      root.replaceChildren(wrap);
      loadOverview();
      return true;
    }

    async function renderBulkUploadWorkspace() {
      const box = el('div', 'cso-edu-preview-card');
      const fSel = el('select', 'cso-edu-select cso-edu-select-full');
      const tSel = el('select', 'cso-edu-select cso-edu-select-full');
      [['public', 'Public'], ['registered', 'Registered Students'], ['admin_only', 'Admin Only']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; tSel.appendChild(o);
      });
      const tagsIn = el('input', 'cso-edu-input cso-edu-input-full');
      tagsIn.placeholder = 'odisha-gk, pyq, 2026';

      try {
        const fRes = await api('/api/admin/media/folders');
        state.folders = fRes.items || [];
        const optNone = el('option', '', 'Root / Uncategorized'); optNone.value = '';
        fSel.appendChild(optNone);
        state.folders.forEach(f => { const o = el('option', '', f.name_en); o.value = f.id; fSel.appendChild(o); });
      } catch (e) {}

      const fileIn = el('input', 'cso-edu-input cso-edu-input-full');
      fileIn.type = 'file';
      fileIn.multiple = true;
      fileIn.accept = '.pdf,image/*,.mp3,.mp4,.zip';

      const queueList = el('div', 'cso-edu-section');
      const btnUpload = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Start Bulk Upload to R2');
      btnUpload.type = 'button';

      btnUpload.addEventListener('click', async () => {
        const files = [...(fileIn.files || [])];
        if (!files.length) { toast('Select one or more files first', 'error'); return; }
        queueList.replaceChildren();
        let okCount = 0;
        for (const f of files) {
          const row = el('div', 'cso-edu-rev-row');
          const statusLbl = el('span', 'cso-edu-badge cso-edu-badge--draft', 'Uploading...');
          row.append(el('span', '', `${f.name} (${fmtBytes(f.size)})`), statusLbl);
          queueList.appendChild(row);

          const fd = new FormData();
          fd.append('files', f);
          if (fSel.value) fd.append('folder_id', fSel.value);
          fd.append('access_tier', tSel.value);
          if (tagsIn.value.trim()) fd.append('tags', tagsIn.value.trim());

          try {
            const out = await api('/api/admin/media/upload', { method: 'POST', body: fd });
            statusLbl.className = 'cso-edu-badge cso-edu-badge--ok';
            statusLbl.textContent = `Uploaded (${out.url})`;
            okCount++;
          } catch (e) {
            statusLbl.className = 'cso-edu-badge cso-edu-badge--arch';
            statusLbl.textContent = `Failed: ${e.message}`;
          }
        }
        toast(`Bulk upload finished: ${okCount}/${files.length} succeeded`, okCount ? 'success' : 'error');
        loadOverview();
      });

      box.append(
        el('div', 'cso-edu-label', '02 · Bulk Upload Queue to Cloudflare R2 (Vault)'),
        buildField('Target Folder', fSel),
        buildField('Default Access Tier', tSel),
        buildField('Tags (comma-separated)', tagsIn),
        buildField('Select Multiple Files (PDF, JPG, PNG, WEBP, SVG, MP3, MP4, ZIP <= 25MB)', fileIn),
        btnUpload,
        queueList
      );
      wrap.appendChild(box);
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

    if (meta.kind === 'file_library') {
      const catSel = el('select', 'cso-edu-select');
      [['', 'All File Types'], ['pdf', 'PDF'], ['image', 'Images'], ['video', 'Video'], ['audio', 'Audio'], ['document', 'Documents'], ['archive', 'Archives']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; catSel.appendChild(o);
      });
      catSel.addEventListener('change', () => { state.filterA = catSel.value; loadItems(); });
      filtersWrap.appendChild(catSel);
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
        if (meta.kind === 'pdf_manager') params.set('file_category', 'pdf');
        else if (meta.kind === 'file_library' && state.filterA) params.set('file_category', state.filterA);
        if (state.statusTab !== 'all') params.set('status', state.statusTab);
        if (state.q) params.set('q', state.q);
        const data = await api(`${meta.endpoint}?${params.toString()}`);
        state.items = data.items || [];
        state.folders = data.folders || [];
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

      const cols = meta.kind === 'folders'
        ? ['Folder Name', 'Scope & Access', 'Files / Size', 'Order', 'Status', 'Actions']
        : meta.kind === 'pdf_manager'
          ? ['PDF Title & Filename', 'Pages & Size', 'Watermark / Offline', 'Access Tier', 'Status', 'Actions']
          : ['File Title & Name', 'Type & Provider', 'Size & Tier', 'Downloads', 'Status', 'Actions'];

      cols.forEach(c => hr.appendChild(el('th', '', c)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      state.items.forEach(it => {
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

        if (meta.kind === 'folders') {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', `${it.icon_key || '📁'} ${it.name_en}`), el('div', 'cso-edu-title-or', it.name_or || it.slug));
          tr.append(
            td1,
            el('td', '', `${it.folder_scope} · ${it.access_tier}`),
            el('td', '', `${it.file_count || 0} files (${fmtBytes(it.total_size_bytes)})`),
            el('td', '', `#${it.sort_order}`)
          );
        } else if (meta.kind === 'pdf_manager') {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', it.title_en), el('div', 'cso-edu-title-or', it.original_filename || it.slug));
          tr.append(
            td1,
            el('td', '', `${it.page_count || 0} pp · ${fmtBytes(it.file_size_bytes)}`),
            el('td', '', `${it.watermark_enabled ? 'WM On' : 'WM Off'} · ${it.offline_ready ? 'Offline OK' : 'Online'}`),
            el('td', '', it.access_tier)
          );
        } else {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', it.title_en), el('div', 'cso-edu-title-or', it.original_filename || it.slug));
          tr.append(
            td1,
            el('td', '', `${it.file_category.toUpperCase()} · ${it.storage_provider}`),
            el('td', '', `${fmtBytes(it.file_size_bytes)} · ${it.access_tier}`),
            el('td', '', String(it.download_count || 0))
          );
        }

        const tdSt = el('td');
        const stCls = it.status === 'published' ? 'pub' : it.status === 'archived' ? 'arch' : 'draft';
        tdSt.appendChild(el('span', `cso-edu-badge cso-edu-badge--${stCls}`, it.status));
        tr.appendChild(tdSt);

        const tdAct = el('td', 'cso-edu-actions');
        if (meta.kind !== 'folders') {
          const btnCopy = el('button', 'cso-edu-btn', 'Copy URL'); btnCopy.type = 'button';
          btnCopy.addEventListener('click', () => {
            const url = it.public_url || it.external_url || '';
            if (navigator.clipboard && url) navigator.clipboard.writeText(url).catch(() => {});
            toast(`Copied: ${url || 'No URL'}`, 'info');
          });
          const btnPrev = el('button', 'cso-edu-btn', 'Preview'); btnPrev.type = 'button';
          btnPrev.addEventListener('click', () => openPreviewModal(it));
          tdAct.append(btnCopy, btnPrev);
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

    function openPreviewModal(fileItem) {
      const backdrop = el('div', 'cso-edu-drawer-backdrop');
      const drawer = el('div', 'cso-edu-drawer');
      const head = el('div', 'cso-edu-drawer-head');
      head.appendChild(el('h3', '', `Preview: ${fileItem.title_en}`));
      const closeBtn = el('button', 'cso-edu-btn', 'Close'); closeBtn.type = 'button';
      closeBtn.addEventListener('click', () => backdrop.remove());
      head.appendChild(closeBtn);

      const body = el('div', 'cso-edu-drawer-body');
      const url = fileItem.public_url || fileItem.external_url || '';
      const info = el('div', 'cso-edu-preview-card');
      info.textContent = `MIME: ${fileItem.mime_type} | Size: ${fmtBytes(fileItem.file_size_bytes)} | SHA-256: ${fileItem.sha256_hash || '—'}`;
      body.appendChild(info);

      if (url && fileItem.file_category === 'image') {
        const img = el('img');
        img.src = url;
        img.alt = fileItem.alt_or_caption_en || fileItem.title_en;
        body.appendChild(img);
      } else if (url && fileItem.file_category === 'pdf') {
        const frame = el('iframe', 'cso-edu-textarea-full');
        frame.src = url;
        frame.title = fileItem.title_en;
        body.appendChild(frame);
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

      if (meta.kind === 'folders') {
        const nameEn = el('input', 'cso-edu-input cso-edu-input-full'); nameEn.value = item?.name_en || ''; refs.name_en = nameEn;
        const nameOr = el('input', 'cso-edu-input cso-edu-input-full'); nameOr.value = item?.name_or || ''; refs.name_or = nameOr;
        const scSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['general', 'study_notes', 'pyq_archive', 'syllabus', 'exam_notices', 'schemes', 'branding_assets'].forEach(s => { const o = el('option', '', s); o.value = s; scSel.appendChild(o); });
        scSel.value = item?.folder_scope || 'general'; refs.folder_scope = scSel;
        const tierSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['public', 'registered', 'admin_only'].forEach(t => { const o = el('option', '', t); o.value = t; tierSel.appendChild(o); });
        tierSel.value = item?.access_tier || 'public'; refs.access_tier = tierSel;
        const icIn = el('input', 'cso-edu-input cso-edu-input-full'); icIn.value = item?.icon_key || '📁'; refs.icon_key = icIn;
        const sortIn = el('input', 'cso-edu-input cso-edu-input-full'); sortIn.type = 'number'; sortIn.value = item?.sort_order ?? 10; refs.sort_order = sortIn;

        body.append(
          buildField('Folder Name (English) *', nameEn),
          buildField('Folder Name (Odia)', nameOr),
          buildField('Folder Scope', scSel),
          buildField('Access Tier', tierSel),
          buildField('Icon / Emoji', icIn),
          buildField('Sort Order', sortIn)
        );
      } else {
        const titleEn = el('input', 'cso-edu-input cso-edu-input-full'); titleEn.value = item?.title_en || ''; refs.title_en = titleEn;
        const titleOr = el('input', 'cso-edu-input cso-edu-input-full'); titleOr.value = item?.title_or || ''; refs.title_or = titleOr;
        const fldSel = el('select', 'cso-edu-select cso-edu-select-full');
        const optNone = el('option', '', 'Uncategorized'); optNone.value = ''; fldSel.appendChild(optNone);
        state.folders.forEach(f => { const o = el('option', '', f.name_en); o.value = f.id; fldSel.appendChild(o); });
        fldSel.value = item?.folder_id || ''; refs.folder_id = fldSel;
        const urlIn = el('input', 'cso-edu-input cso-edu-input-full'); urlIn.value = item?.public_url || ''; refs.public_url = urlIn;
        const tierSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['public', 'registered', 'admin_only'].forEach(t => { const o = el('option', '', t); o.value = t; tierSel.appendChild(o); });
        tierSel.value = item?.access_tier || 'public'; refs.access_tier = tierSel;
        const pgIn = el('input', 'cso-edu-input cso-edu-input-full'); pgIn.type = 'number'; pgIn.value = item?.page_count ?? 0; refs.page_count = pgIn;
        const wmChk = el('input'); wmChk.type = 'checkbox'; wmChk.checked = Boolean(item?.watermark_enabled); refs.watermark_enabled = wmChk;
        const offChk = el('input'); offChk.type = 'checkbox'; offChk.checked = Boolean(item?.offline_ready); refs.offline_ready = offChk;
        const tagsIn = el('input', 'cso-edu-input cso-edu-input-full'); tagsIn.value = (item?.tags || []).join(', '); refs.tags = tagsIn;

        body.append(
          buildField('Title (English) *', titleEn),
          buildField('Title (Odia)', titleOr),
          buildField('Folder', fldSel),
          buildField('Public URL', urlIn),
          buildField('Access Tier', tierSel),
          buildField('Page Count (PDF)', pgIn),
          buildField('Watermark Enabled', wmChk),
          buildField('Offline PWA Ready', offChk),
          buildField('Tags (comma-separated)', tagsIn)
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
          if (meta.kind === 'folders') {
            Object.assign(payload, {
              name_en: refs.name_en.value.trim(),
              name_or: refs.name_or.value.trim(),
              folder_scope: refs.folder_scope.value,
              access_tier: refs.access_tier.value,
              icon_key: refs.icon_key.value.trim(),
              sort_order: Number(refs.sort_order.value || 10)
            });
          } else {
            Object.assign(payload, {
              file_category: meta.kind === 'pdf_manager' ? 'pdf' : (item?.file_category || 'pdf'),
              folder_id: refs.folder_id.value || null,
              title_en: refs.title_en.value.trim(),
              title_or: refs.title_or.value.trim(),
              public_url: refs.public_url.value.trim(),
              access_tier: refs.access_tier.value,
              page_count: Number(refs.page_count.value || 0),
              watermark_enabled: refs.watermark_enabled.checked,
              offline_ready: refs.offline_ready.checked,
              tags: refs.tags.value.split(',').map(s => s.trim()).filter(Boolean)
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

  window.CSOFilesMediaBatch1 = { render, MODULE_META };
})();
