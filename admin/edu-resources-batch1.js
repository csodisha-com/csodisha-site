/* Educational Resources Batch 1 (01-04) Content Command Workspace — Strict CSP */
(() => {
  'use strict';

  const MODULE_META = {
    'module-05-001': { num: '01', type: 'digital_library', title: 'Digital Library', desc: 'E-Books, State Textbooks (BSE/CHSE), and Digital Compendiums' },
    'module-05-002': { num: '02', type: 'study_material', title: 'Study Materials', desc: 'Exam-Oriented Study Packs, Odisha GK & Subject Modules' },
    'module-05-003': { num: '03', type: 'notes_pdf', title: 'Notes & PDFs', desc: 'Downloadable Revision Notes, Formula Sheets & Printable PDFs' },
    'module-05-004': { num: '04', type: 'book_reference', title: 'Books & References', desc: 'Standard Reference Books, ISBN Catalogs & Authoritative Guides' }
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
    const res = await fetch(path, {
      method: opts.method || 'GET',
      credentials: 'same-origin',
      headers,
      body: opts.body
    });
    const ct = res.headers.get('Content-Type') || '';
    const data = ct.includes('application/json') ? await res.json().catch(() => ({})) : await res.text();
    if (!res.ok) {
      throw new Error((data && data.error) || `HTTP ${res.status}`);
    }
    return data;
  }

  function toast(msg, kind) {
    if (typeof window.showToast === 'function') {
      window.showToast(msg, kind || 'info');
      return;
    }
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = el('div', 'cso-toast', msg);
    c.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  function formatBytes(bytes) {
    const n = Number(bytes || 0);
    if (n <= 0) return '0 B';
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / (1024 * 1024)).toFixed(2)} MB`;
  }

  function render(moduleId, root, actions) {
    const meta = MODULE_META[moduleId];
    if (!meta || !root) return false;

    const state = {
      statusTab: 'all',
      q: '',
      stage: '',
      subject: '',
      tag: '',
      selectedIds: new Set(),
      items: [],
      counts: { all: 0, published: 0, draft: 0, scheduled: 0, archived: 0, incomplete: 0 },
      facets: { stages: [], subjects: [] },
      overview: null
    };

    if (actions) {
      actions.replaceChildren();
      const btnNew = el('button', 'cso-edu-btn cso-edu-btn--primary', `+ New ${meta.title.replace(/s$/, '')}`);
      btnNew.type = 'button';
      btnNew.addEventListener('click', () => openEditorDrawer(null));

      const btnImport = el('button', 'cso-edu-btn', 'Import JSON/CSV');
      btnImport.type = 'button';
      btnImport.addEventListener('click', openImportExportModal);

      const btnExport = el('button', 'cso-edu-btn', 'Export CSV');
      btnExport.type = 'button';
      btnExport.addEventListener('click', () => {
        window.open(`/api/admin/edu/resources/export?format=csv&resource_type=${encodeURIComponent(meta.type)}`, '_blank', 'noopener');
      });

      actions.append(btnNew, btnImport, btnExport);
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
    qInput.placeholder = 'Search title, Odia, exam, tag...';
    const stageSel = el('select', 'cso-edu-select');
    const subjSel = el('select', 'cso-edu-select');
    filtersWrap.append(qInput, stageSel, subjSel);
    toolbar.append(tabsWrap, filtersWrap);
    wrap.append(kpiGrid, toolbar, bulkBar, tableWrap);
    root.replaceChildren(wrap);

    let searchTimer = null;
    qInput.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.q = qInput.value.trim();
        loadResources();
      }, 220);
    });
    stageSel.addEventListener('change', () => { state.stage = stageSel.value; loadResources(); });
    subjSel.addEventListener('change', () => { state.subject = subjSel.value; loadResources(); });

    async function loadAll() {
      await Promise.all([loadOverview(), loadResources()]);
    }

    async function loadOverview() {
      try {
        state.overview = await api('/api/admin/edu/overview');
        renderKpis();
      } catch (e) {
        toast(`Overview error: ${e.message}`, 'error');
      }
    }

    async function loadResources() {
      try {
        const params = new URLSearchParams({ resource_type: meta.type, limit: '150' });
        if (state.statusTab === 'incomplete') params.set('incomplete_only', '1');
        else if (state.statusTab !== 'all') params.set('status', state.statusTab);
        if (state.q) params.set('q', state.q);
        if (state.stage) params.set('stage_or_class', state.stage);
        if (state.subject) params.set('subject_name', state.subject);
        if (state.tag) params.set('tag', state.tag);

        const data = await api(`/api/admin/edu/resources?${params.toString()}`);
        state.items = data.items || [];
        state.counts = data.counts || state.counts;
        state.facets = data.facets || state.facets;
        renderTabs();
        renderFacets();
        renderTable();
      } catch (e) {
        toast(`Failed to load resources: ${e.message}`, 'error');
      }
    }

    function renderKpis() {
      kpiGrid.replaceChildren();
      const ov = state.overview || {};
      const cards = [
        [`${meta.title} Items`, state.counts.all || 0],
        ['Published (Batch 1)', ov.published || 0],
        ['Drafts', ov.drafts || 0],
        ['Scheduled', ov.scheduled || 0],
        ['Bilingual Parity', `${ov.bilingual_pct || 0}%`],
        ['R2 Storage', formatBytes(ov.r2_storage_bytes || 0)],
        ['Open Reports', ov.open_reports || 0]
      ];
      cards.forEach(([lbl, val]) => {
        const card = el('div', 'cso-edu-kpi');
        card.append(el('div', 'cso-edu-kpi-lbl', lbl), el('div', 'cso-edu-kpi-val', String(val)));
        kpiGrid.appendChild(card);
      });
    }

    function renderTabs() {
      tabsWrap.replaceChildren();
      const defs = [
        ['all', 'All', state.counts.all || 0],
        ['published', 'Published', state.counts.published || 0],
        ['draft', 'Drafts', state.counts.draft || 0],
        ['scheduled', 'Scheduled', state.counts.scheduled || 0],
        ['archived', 'Archived', state.counts.archived || 0],
        ['incomplete', 'Incomplete Parity', state.counts.incomplete || 0]
      ];
      defs.forEach(([key, label, count]) => {
        const btn = el('button', `cso-edu-tab${state.statusTab === key ? ' is-active' : ''}`, `${label} (${count})`);
        btn.type = 'button';
        btn.addEventListener('click', () => {
          state.statusTab = key;
          loadResources();
        });
        tabsWrap.appendChild(btn);
      });
    }

    function renderFacets() {
      const prevStage = state.stage;
      stageSel.replaceChildren(el('option', '', 'All Classes / Stages'));
      stageSel.firstChild.value = '';
      (state.facets.stages || []).forEach(st => {
        const opt = el('option', '', st);
        opt.value = st;
        stageSel.appendChild(opt);
      });
      stageSel.value = prevStage;

      const prevSubj = state.subject;
      subjSel.replaceChildren(el('option', '', 'All Subjects'));
      subjSel.firstChild.value = '';
      (state.facets.subjects || []).forEach(su => {
        const opt = el('option', '', su);
        opt.value = su;
        subjSel.appendChild(opt);
      });
      subjSel.value = prevSubj;
    }

    function updateBulkBar() {
      bulkBar.replaceChildren();
      if (state.selectedIds.size === 0) {
        bulkBar.hidden = true;
        return;
      }
      bulkBar.hidden = false;
      bulkBar.appendChild(el('strong', '', `${state.selectedIds.size} selected`));
      [['published', 'Bulk Publish'], ['draft', 'Bulk Draft'], ['archived', 'Bulk Archive']].forEach(([st, label]) => {
        const b = el('button', 'cso-edu-btn', label);
        b.type = 'button';
        b.addEventListener('click', async () => {
          try {
            await api('/api/admin/edu/resources', {
              method: 'POST',
              body: JSON.stringify({ action: 'bulk_status', ids: [...state.selectedIds], status: st })
            });
            state.selectedIds.clear();
            updateBulkBar();
            toast(`Updated items to ${st}`, 'success');
            loadAll();
          } catch (e) {
            toast(e.message, 'error');
          }
        });
        bulkBar.appendChild(b);
      });
    }

    function statusBadge(st) {
      const cls = st === 'published' ? 'pub' : st === 'scheduled' ? 'sched' : st === 'archived' ? 'arch' : 'draft';
      return el('span', `cso-edu-badge cso-edu-badge--${cls}`, st);
    }

    function renderTable() {
      tableWrap.replaceChildren();
      const table = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      const chkAll = el('input');
      chkAll.type = 'checkbox';
      chkAll.setAttribute('aria-label', 'Select all rows');
      chkAll.addEventListener('change', () => {
        state.selectedIds.clear();
        if (chkAll.checked) state.items.forEach(it => state.selectedIds.add(it.id));
        renderTable();
        updateBulkBar();
      });
      const th0 = el('th');
      th0.appendChild(chkAll);
      hr.append(th0, el('th', '', 'Title & Odia'), el('th', '', 'Class / Subject'), el('th', '', 'Quality & Status'), el('th', '', 'Actions'));
      thead.appendChild(hr);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (!state.items.length) {
        const tr = el('tr');
        const td = el('td', '', 'No educational resources match the current filter. Click + New to create one.');
        td.colSpan = 5;
        tr.appendChild(td);
        tbody.appendChild(tr);
      } else {
        state.items.forEach(item => {
          const tr = el('tr');
          const tdChk = el('td');
          const chk = el('input');
          chk.type = 'checkbox';
          chk.checked = state.selectedIds.has(item.id);
          chk.setAttribute('aria-label', `Select ${item.title_en}`);
          chk.addEventListener('change', () => {
            if (chk.checked) state.selectedIds.add(item.id);
            else state.selectedIds.delete(item.id);
            updateBulkBar();
          });
          tdChk.appendChild(chk);

          const tdTitle = el('td');
          const titleBox = el('div', 'cso-edu-title-cell');
          titleBox.appendChild(el('strong', '', item.title_en));
          if (item.title_or) titleBox.appendChild(el('span', 'cso-edu-title-or', item.title_or));
          if (item.exam_tag) titleBox.appendChild(el('span', 'cso-edu-title-or', `Exam: ${item.exam_tag}`));
          tdTitle.appendChild(titleBox);

          const tdMeta = el('td');
          tdMeta.append(el('div', '', item.stage_or_class || '—'), el('div', 'cso-edu-title-or', item.subject_name || '—'));

          const tdQual = el('td');
          const badges = el('div', 'cso-edu-badges');
          badges.appendChild(statusBadge(item.status));
          badges.appendChild(el('span', `cso-edu-badge cso-edu-badge--${item.parity_complete ? 'ok' : 'warn'}`, item.parity_label));
          if (item.offline_ready) badges.appendChild(el('span', 'cso-edu-badge cso-edu-badge--ok', 'Offline'));
          tdQual.appendChild(badges);

          const tdAct = el('td');
          const actRow = el('div', 'cso-edu-actions');

          const btnStar = el('button', `cso-edu-btn${item.featured ? ' cso-edu-btn--star-on' : ''}`, item.featured ? '★' : '☆');
          btnStar.type = 'button';
          btnStar.title = 'Toggle Featured Spotlight';
          btnStar.addEventListener('click', async () => {
            await api(`/api/admin/edu/resources/${encodeURIComponent(item.id)}`, {
              method: 'PATCH',
              body: JSON.stringify({ featured: !item.featured })
            });
            loadAll();
          });

          const btnEdit = el('button', 'cso-edu-btn', 'Edit');
          btnEdit.type = 'button';
          btnEdit.addEventListener('click', () => openEditorDrawer(item.id));

          const btnPreview = el('button', 'cso-edu-btn', 'Preview');
          btnPreview.type = 'button';
          btnPreview.addEventListener('click', () => openPreviewModal(item));

          const nextStatus = item.status === 'published' ? 'draft' : 'published';
          const btnToggle = el('button', 'cso-edu-btn', item.status === 'published' ? 'Draft' : 'Publish');
          btnToggle.type = 'button';
          btnToggle.addEventListener('click', async () => {
            await api(`/api/admin/edu/resources/${encodeURIComponent(item.id)}`, {
              method: 'PATCH',
              body: JSON.stringify({ status: nextStatus })
            });
            toast(`Marked as ${nextStatus}`, 'success');
            loadAll();
          });

          const btnClone = el('button', 'cso-edu-btn', 'Clone');
          btnClone.type = 'button';
          btnClone.addEventListener('click', async () => {
            await api(`/api/admin/edu/resources/${encodeURIComponent(item.id)}`, {
              method: 'PATCH',
              body: JSON.stringify({ action: 'clone' })
            });
            toast('Cloned as draft', 'success');
            loadAll();
          });

          const btnHist = el('button', 'cso-edu-btn', 'History');
          btnHist.type = 'button';
          btnHist.addEventListener('click', () => openHistoryModal(item.id));

          const btnDel = el('button', 'cso-edu-btn cso-edu-btn--danger', 'Delete');
          btnDel.type = 'button';
          btnDel.addEventListener('click', async () => {
            if (!window.confirm(`Delete "${item.title_en}"?`)) return;
            await api(`/api/admin/edu/resources/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
            toast('Deleted resource', 'success');
            loadAll();
          });

          actRow.append(btnStar, btnEdit, btnPreview, btnToggle, btnClone, btnHist, btnDel);
          tdAct.appendChild(actRow);

          tr.append(tdChk, tdTitle, tdMeta, tdQual, tdAct);
          tbody.appendChild(tr);
        });
      }
      table.appendChild(tbody);
      tableWrap.appendChild(table);
    }

    async function openEditorDrawer(resourceId) {
      let item = null;
      let interlinks = [];
      let suggestions = [];
      if (resourceId) {
        try {
          const detail = await api(`/api/admin/edu/resources/${encodeURIComponent(resourceId)}`);
          item = detail.item;
          interlinks = detail.interlinks || [];
          const linkData = await api(`/api/admin/edu/interlinks?source_id=${encodeURIComponent(resourceId)}`);
          suggestions = linkData.suggestions || [];
        } catch (e) {
          toast(e.message, 'error');
          return;
        }
      }

      const backdrop = el('div', 'cso-edu-drawer-backdrop');
      const drawer = el('aside', 'cso-edu-drawer');
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-modal', 'true');

      const head = el('div', 'cso-edu-drawer-head');
      head.appendChild(el('strong', '', item ? `Edit: ${item.title_en}` : `New ${meta.title} Entry`));
      const closeBtn = el('button', 'cso-edu-btn', 'Close ✕');
      closeBtn.type = 'button';
      closeBtn.addEventListener('click', () => backdrop.remove());
      head.appendChild(closeBtn);

      const bodyEl = el('div', 'cso-edu-drawer-body');

      function mkField(labelTxt, inputEl) {
        const f = el('label', 'cso-edu-field', labelTxt);
        f.appendChild(inputEl);
        return f;
      }
      function mkInput(val, placeholder = '', type = 'text') {
        const i = el('input', 'cso-edu-input cso-edu-input-full');
        i.type = type;
        i.value = val || '';
        i.placeholder = placeholder;
        return i;
      }
      function mkArea(val, placeholder = '') {
        const t = el('textarea', 'cso-edu-textarea cso-edu-textarea-full');
        t.value = val || '';
        t.placeholder = placeholder;
        return t;
      }

      const inTitleEn = mkInput(item?.title_en, 'English Title *');
      const inTitleOr = mkInput(item?.title_or, 'ଓଡ଼ିଆ ଶୀର୍ଷକ');
      const inSlug = mkInput(item?.slug, 'auto-generated-slug');
      const inStage = mkInput(item?.stage_or_class, 'e.g. Class 10 / OPSC OAS');
      const inSubject = mkInput(item?.subject_name, 'e.g. Odia Literature / History');
      const inTopic = mkInput(item?.topic_name, 'Topic / Chapter');
      const inExam = mkInput(item?.exam_tag, 'e.g. OPSC OAS / OTET');
      const inAuthor = mkInput(item?.author_or_board, 'Author / BSE / CHSE');
      const inPublisher = mkInput(item?.publisher_or_source, 'Publisher / Source');
      const inIsbn = mkInput(item?.edition_or_isbn, 'Edition / ISBN');
      const inYear = mkInput(item?.publication_year ? String(item.publication_year) : '2026', '2026', 'number');

      const selLang = el('select', 'cso-edu-select cso-edu-select-full');
      [['bilingual', 'Bilingual (EN + ଓଡ଼ିଆ)'], ['en', 'English Only'], ['or', 'Odia Only']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; selLang.appendChild(o);
      });
      selLang.value = item?.language_code || 'bilingual';

      const selTier = el('select', 'cso-edu-select cso-edu-select-full');
      [['free', 'Free Open Access'], ['registered', 'Registered Candidates'], ['featured', 'Featured Spotlight']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; selTier.appendChild(o);
      });
      selTier.value = item?.access_tier || 'free';

      const inSummaryEn = mkArea(item?.summary_en, 'English summary...');
      const inSummaryOr = mkArea(item?.summary_or, 'ଓଡ଼ିଆ ସାରାଂଶ...');
      const inMdEn = mkArea(item?.content_md_en, '# Markdown Content (EN)');
      const inMdOr = mkArea(item?.content_md_or, '# ଓଡ଼ିଆ ବିଷୟବସ୍ତୁ (Markdown)');

      const inFileUrl = mkInput(item?.file_url, '/api/media/edu-resources/...');
      const inR2Key = mkInput(item?.r2_key, 'R2 key');
      const inCoverUrl = mkInput(item?.cover_image_url, '/api/media/...');
      const inPages = mkInput(item?.page_count ? String(item.page_count) : '0', 'Page count', 'number');
      const inFileSize = mkInput(item?.file_size_bytes ? String(item.file_size_bytes) : '0', 'Bytes', 'number');

      const chkOffline = el('input'); chkOffline.type = 'checkbox'; chkOffline.checked = Boolean(item?.offline_ready);
      const chkWatermark = el('input'); chkWatermark.type = 'checkbox'; chkWatermark.checked = Boolean(item?.watermark_enabled);
      const chkFeatured = el('input'); chkFeatured.type = 'checkbox'; chkFeatured.checked = Boolean(item?.featured);
      const inPublishAt = mkInput(item?.publish_at, 'YYYY-MM-DDTHH:MM:SSZ (optional)');
      const inExpiresAt = mkInput(item?.expires_at, 'YYYY-MM-DDTHH:MM:SSZ (optional)');

      // Basic + Bilingual Sections
      const gMeta = el('div', 'cso-edu-grid2');
      gMeta.append(
        mkField('English Title *', inTitleEn),
        mkField('Odia Title (ଓଡ଼ିଆ)', inTitleOr),
        mkField('Slug', inSlug),
        mkField('Class / Stage', inStage),
        mkField('Subject', inSubject),
        mkField('Topic', inTopic),
        mkField('Exam Tag', inExam),
        mkField('Language', selLang),
        mkField('Author / Board', inAuthor),
        mkField('Publisher / Source', inPublisher),
        mkField('Edition / ISBN', inIsbn),
        mkField('Publication Year', inYear),
        mkField('Access Tier', selTier),
        mkField('Page Count', inPages)
      );

      const gContent = el('div', 'cso-edu-grid2');
      gContent.append(
        mkField('Summary (EN)', inSummaryEn),
        mkField('Summary (ଓଡ଼ିଆ)', inSummaryOr),
        mkField('Markdown Content (EN)', inMdEn),
        mkField('Markdown Content (ଓଡ଼ିଆ)', inMdOr)
      );

      // R2 File Uploader Box
      const r2Box = el('div', 'cso-edu-section-box');
      r2Box.appendChild(el('h4', 'cso-edu-section-title', 'Add File (R2 PDF & Cover Uploader)'));
      const dropzone = el('div', 'cso-edu-dropzone', 'Drag & drop PDF / Cover Image here, or click to browse (max 25 MB)');
      const filePicker = el('input');
      filePicker.type = 'file';
      filePicker.accept = 'application/pdf,image/jpeg,image/png,image/webp';
      filePicker.hidden = true;
      dropzone.addEventListener('click', () => filePicker.click());
      dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('is-dragover'); });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragover'));
      async function handleUploadFile(file) {
        if (!file) return;
        const fd = new FormData();
        fd.append('file', file);
        fd.append('resource_type', meta.type);
        try {
          dropzone.textContent = `Uploading ${file.name}...`;
          const up = await api('/api/admin/edu/resources/upload', { method: 'POST', body: fd });
          if (up.kind === 'image') {
            inCoverUrl.value = up.file_url;
          } else {
            inFileUrl.value = up.file_url;
            inR2Key.value = up.r2_key;
            inFileSize.value = String(up.file_size_bytes || 0);
          }
          dropzone.textContent = `Uploaded: ${up.r2_key} (${formatBytes(up.file_size_bytes)})`;
          toast('Uploaded to R2', 'success');
        } catch (err) {
          dropzone.textContent = `Upload failed: ${err.message}`;
          toast(err.message, 'error');
        }
      }
      filePicker.addEventListener('change', () => handleUploadFile(filePicker.files && filePicker.files[0]));
      dropzone.addEventListener('drop', e => {
        e.preventDefault();
        dropzone.classList.remove('is-dragover');
        handleUploadFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
      });

      const r2Fields = el('div', 'cso-edu-grid2');
      r2Fields.append(
        mkField('File URL', inFileUrl),
        mkField('R2 Object Key', inR2Key),
        mkField('Cover Image URL', inCoverUrl),
        mkField('File Size (Bytes)', inFileSize)
      );
      const toggleRow = el('div', 'cso-edu-toggle-row');
      const lblOff = el('label', '', ' Offline-Ready'); lblOff.prepend(chkOffline);
      const lblWm = el('label', '', ' Watermark Enabled'); lblWm.prepend(chkWatermark);
      const lblFeat = el('label', '', ' Featured Spotlight'); lblFeat.prepend(chkFeatured);
      toggleRow.append(lblOff, lblWm, lblFeat);
      r2Box.append(dropzone, filePicker, r2Fields, toggleRow);

      // External Links Repeater
      const linksBox = el('div', 'cso-edu-section-box');
      linksBox.appendChild(el('h4', 'cso-edu-section-title', 'Add External Links & Link Checker'));
      const linksList = el('div', 'cso-edu-rev-list');
      let extLinks = Array.isArray(item?.external_links) ? item.external_links.map(x => ({ ...x })) : [];

      function renderLinksEditor() {
        linksList.replaceChildren();
        extLinks.forEach((lk, idx) => {
          const row = el('div', 'cso-edu-link-row');
          const lIn = mkInput(lk.label, 'Label');
          const uIn = mkInput(lk.url, 'https://...');
          const tIn = mkInput(lk.type || 'official', 'official');
          lIn.addEventListener('input', () => { extLinks[idx].label = lIn.value; });
          uIn.addEventListener('input', () => { extLinks[idx].url = uIn.value; });
          tIn.addEventListener('input', () => { extLinks[idx].type = tIn.value; });
          const stBadge = el('span', `cso-edu-badge cso-edu-badge--${lk.link_status === 'ok' ? 'ok' : 'warn'}`, lk.link_status || 'unchecked');
          const rmBtn = el('button', 'cso-edu-btn cso-edu-btn--danger', '✕');
          rmBtn.type = 'button';
          rmBtn.addEventListener('click', () => { extLinks.splice(idx, 1); renderLinksEditor(); });
          row.append(lIn, uIn, tIn, stBadge, rmBtn);
          linksList.appendChild(row);
        });
      }
      renderLinksEditor();

      const linksActions = el('div', 'cso-edu-actions');
      const btnAddLink = el('button', 'cso-edu-btn', '+ Add Link');
      btnAddLink.type = 'button';
      btnAddLink.addEventListener('click', () => {
        extLinks.push({ label: '', url: '', type: 'official', link_status: 'unchecked' });
        renderLinksEditor();
      });
      const btnCheckLinks = el('button', 'cso-edu-btn', 'Check Links');
      btnCheckLinks.type = 'button';
      btnCheckLinks.addEventListener('click', async () => {
        if (!item?.id) { toast('Save resource first to check links', 'info'); return; }
        try {
          const chk = await api('/api/admin/edu/link-check', {
            method: 'POST',
            body: JSON.stringify({ resource_id: item.id })
          });
          extLinks = chk.links || extLinks;
          renderLinksEditor();
          toast(`Checked ${chk.checked} link(s); broken: ${chk.broken_count}`, chk.broken_count ? 'error' : 'success');
        } catch (err) {
          toast(err.message, 'error');
        }
      });
      linksActions.append(btnAddLink, btnCheckLinks);
      linksBox.append(linksList, linksActions);

      // Canonical Tag Chips
      const tagBox = el('div', 'cso-edu-section-box');
      tagBox.appendChild(el('h4', 'cso-edu-section-title', 'Canonical Tags'));
      const chipsWrap = el('div', 'cso-edu-chips');
      let tags = Array.isArray(item?.tags) ? [...item.tags] : [];
      function renderTags() {
        chipsWrap.replaceChildren();
        tags.forEach((tg, i) => {
          const chip = el('span', 'cso-edu-chip', tg);
          const x = el('button', '', '×');
          x.type = 'button';
          x.addEventListener('click', () => { tags.splice(i, 1); renderTags(); });
          chip.appendChild(x);
          chipsWrap.appendChild(chip);
        });
      }
      renderTags();
      const tagInput = mkInput('', 'Type tag and press Enter (e.g. opsc, odia-gk)');
      tagInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const v = tagInput.value.trim().toLowerCase();
          if (v && !tags.includes(v)) { tags.push(v); renderTags(); }
          tagInput.value = '';
        }
      });
      tagBox.append(chipsWrap, tagInput);

      // Bidirectional Interlinks Panel
      const interBox = el('div', 'cso-edu-section-box');
      interBox.appendChild(el('h4', 'cso-edu-section-title', 'Bidirectional Cross-Module Interlinks'));
      const interList = el('div', 'cso-edu-rev-list');
      function renderInterlinks() {
        interList.replaceChildren();
        if (!interlinks.length) {
          interList.appendChild(el('div', 'cso-edu-title-or', 'No cross-module links yet.'));
        }
        interlinks.forEach(lk => {
          const row = el('div', 'cso-edu-rev-item');
          row.appendChild(el('span', '', `${lk.relation_type}: ${lk.linked_title_en || lk.target_id}`));
          const rm = el('button', 'cso-edu-btn cso-edu-btn--danger', 'Unlink');
          rm.type = 'button';
          rm.addEventListener('click', async () => {
            await api(`/api/admin/edu/interlinks/${encodeURIComponent(lk.id)}`, { method: 'DELETE' });
            interlinks = interlinks.filter(x => x.id !== lk.id);
            renderInterlinks();
          });
          row.appendChild(rm);
          interList.appendChild(row);
        });
      }
      renderInterlinks();
      if (suggestions.length && item?.id) {
        const sugRow = el('div', 'cso-edu-actions');
        sugRow.appendChild(el('span', 'cso-edu-title-or', 'Auto-match suggestions:'));
        suggestions.slice(0, 4).forEach(sg => {
          const b = el('button', 'cso-edu-btn', `+ Link: ${sg.title_en.slice(0, 28)}`);
          b.type = 'button';
          b.addEventListener('click', async () => {
            const created = await api('/api/admin/edu/interlinks', {
              method: 'POST',
              body: JSON.stringify({
                source_module: meta.num,
                source_id: item.id,
                target_module: sg.target_module || '02',
                target_id: sg.id,
                relation_type: 'related'
              })
            });
            interlinks.unshift({ id: created.id, relation_type: 'related', linked_title_en: sg.title_en, target_id: sg.id });
            renderInterlinks();
            toast('Linked resource', 'success');
          });
          sugRow.appendChild(b);
        });
        interBox.appendChild(sugRow);
      }
      interBox.appendChild(interList);

      // Schedule fields
      const schedGrid = el('div', 'cso-edu-grid2');
      schedGrid.append(
        mkField('Publish At (ISO timestamp)', inPublishAt),
        mkField('Expires At (Auto-expiry)', inExpiresAt)
      );

      bodyEl.append(gMeta, gContent, r2Box, linksBox, tagBox, interBox, schedGrid);

      const foot = el('div', 'cso-edu-drawer-foot');
      const footLeft = el('div', 'cso-edu-actions');
      const btnPrev = el('button', 'cso-edu-btn', 'Student & WhatsApp Preview');
      btnPrev.type = 'button';
      btnPrev.addEventListener('click', () => openPreviewModal(collectPayload('draft')));
      footLeft.appendChild(btnPrev);

      const footRight = el('div', 'cso-edu-actions');
      const btnDraft = el('button', 'cso-edu-btn', 'Save Draft');
      btnDraft.type = 'button';
      const btnSchedule = el('button', 'cso-edu-btn', 'Schedule');
      btnSchedule.type = 'button';
      const btnPublish = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Publish Now');
      btnPublish.type = 'button';

      function collectPayload(targetStatus) {
        return {
          resource_type: meta.type,
          title_en: inTitleEn.value.trim(),
          title_or: inTitleOr.value.trim(),
          slug: inSlug.value.trim(),
          stage_or_class: inStage.value.trim(),
          subject_name: inSubject.value.trim(),
          topic_name: inTopic.value.trim(),
          exam_tag: inExam.value.trim(),
          author_or_board: inAuthor.value.trim(),
          publisher_or_source: inPublisher.value.trim(),
          edition_or_isbn: inIsbn.value.trim(),
          publication_year: Number(inYear.value) || 2026,
          language_code: selLang.value,
          access_tier: selTier.value,
          summary_en: inSummaryEn.value.trim(),
          summary_or: inSummaryOr.value.trim(),
          content_md_en: inMdEn.value,
          content_md_or: inMdOr.value,
          file_url: inFileUrl.value.trim(),
          r2_key: inR2Key.value.trim(),
          cover_image_url: inCoverUrl.value.trim(),
          file_size_bytes: Number(inFileSize.value) || 0,
          page_count: Number(inPages.value) || 0,
          external_links: extLinks.filter(l => l.url && l.url.trim()),
          tags,
          offline_ready: chkOffline.checked,
          watermark_enabled: chkWatermark.checked,
          featured: chkFeatured.checked,
          publish_at: inPublishAt.value.trim() || null,
          expires_at: inExpiresAt.value.trim() || null,
          status: targetStatus
        };
      }

      async function submitStatus(targetStatus) {
        try {
          const payload = collectPayload(targetStatus);
          if (item?.id) {
            await api(`/api/admin/edu/resources/${encodeURIComponent(item.id)}`, {
              method: 'PUT',
              body: JSON.stringify(payload)
            });
          } else {
            await api('/api/admin/edu/resources', {
              method: 'POST',
              body: JSON.stringify(payload)
            });
          }
          toast(`Saved (${targetStatus})`, 'success');
          backdrop.remove();
          loadAll();
        } catch (err) {
          toast(err.message, 'error');
        }
      }

      btnDraft.addEventListener('click', () => submitStatus('draft'));
      btnSchedule.addEventListener('click', () => submitStatus('scheduled'));
      btnPublish.addEventListener('click', () => submitStatus('published'));
      footRight.append(btnDraft, btnSchedule, btnPublish);
      foot.append(footLeft, footRight);

      drawer.append(head, bodyEl, foot);
      backdrop.appendChild(drawer);
      backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
      document.body.appendChild(backdrop);
    }

    function openPreviewModal(item) {
      const modal = document.getElementById('globalModal');
      const mTitle = document.getElementById('modalTitle');
      const mBody = document.getElementById('modalBody');
      const mFoot = document.getElementById('modalFooter');
      if (!modal || !mTitle || !mBody || !mFoot) return;

      mTitle.textContent = 'Live Student & WhatsApp Share Preview';
      mBody.replaceChildren();
      const card = el('div', 'cso-edu-preview-card');
      card.append(
        el('div', '', `${item.stage_or_class || 'Odisha'} · ${item.subject_name || meta.title}`),
        el('h3', '', item.title_en || 'Untitled Resource'),
        el('div', '', item.title_or || '(Odia title missing)'),
        el('p', '', item.summary_en || item.summary_or || '')
      );
      const waMsg = `📚 *${item.title_en || ''}*\n${item.title_or ? `${item.title_or}\n` : ''}🎯 ${item.exam_tag || item.stage_or_class || 'CS Odisha'}\n🔗 https://csodisha.com/study-library/?resource=${encodeURIComponent(item.slug || item.id || '')}`;
      const waArea = el('textarea', 'cso-edu-textarea cso-edu-textarea-full');
      waArea.value = waMsg;
      waArea.readOnly = true;
      mBody.append(card, el('label', 'cso-edu-field', 'WhatsApp / Telegram Announcement Post'), waArea);

      mFoot.replaceChildren();
      const copyBtn = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Copy WhatsApp Post');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', () => {
        navigator.clipboard?.writeText(waMsg);
        toast('Copied announcement post', 'success');
      });
      mFoot.appendChild(copyBtn);
      modal.hidden = false;
    }

    async function openHistoryModal(resourceId) {
      const modal = document.getElementById('globalModal');
      const mTitle = document.getElementById('modalTitle');
      const mBody = document.getElementById('modalBody');
      const mFoot = document.getElementById('modalFooter');
      if (!modal || !mTitle || !mBody || !mFoot) return;

      try {
        const detail = await api(`/api/admin/edu/resources/${encodeURIComponent(resourceId)}`);
        mTitle.textContent = `Revision History (${detail.item.title_en})`;
        mBody.replaceChildren();
        const list = el('div', 'cso-edu-rev-list');
        (detail.revisions || []).forEach(rev => {
          const row = el('div', 'cso-edu-rev-item');
          row.appendChild(el('span', '', `v${rev.version_num} — ${rev.change_note} (${rev.created_by}) · ${rev.created_at}`));
          const rb = el('button', 'cso-edu-btn', 'Rollback');
          rb.type = 'button';
          rb.addEventListener('click', async () => {
            await api(`/api/admin/edu/resources/${encodeURIComponent(resourceId)}`, {
              method: 'PATCH',
              body: JSON.stringify({ action: 'rollback', revision_id: rev.id })
            });
            toast(`Rolled back to v${rev.version_num}`, 'success');
            modal.hidden = true;
            loadAll();
          });
          row.appendChild(rb);
          list.appendChild(row);
        });
        mBody.appendChild(list);
        mFoot.replaceChildren();
        modal.hidden = false;
      } catch (e) {
        toast(e.message, 'error');
      }
    }

    function openImportExportModal() {
      const modal = document.getElementById('globalModal');
      const mTitle = document.getElementById('modalTitle');
      const mBody = document.getElementById('modalBody');
      const mFoot = document.getElementById('modalFooter');
      if (!modal || !mTitle || !mBody || !mFoot) return;

      mTitle.textContent = `Bulk Import / Export (${meta.title})`;
      mBody.replaceChildren();
      const ta = el('textarea', 'cso-edu-textarea cso-edu-textarea-full');
      ta.placeholder = 'Paste JSON array of items or CSV (must include resource_type, title_en)...';
      const statusBox = el('div', 'cso-edu-title-or', '');
      mBody.append(ta, statusBox);

      mFoot.replaceChildren();
      const btnVal = el('button', 'cso-edu-btn', 'Dry-Run Validate');
      btnVal.type = 'button';
      const btnCommit = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Commit Import');
      btnCommit.type = 'button';

      async function runImport(dryRun) {
        const raw = ta.value.trim();
        if (!raw) return;
        const body = raw.startsWith('[') ? { items: JSON.parse(raw), dry_run: dryRun } : { csv: raw, dry_run: dryRun };
        const res = await api('/api/admin/edu/resources/import', { method: 'POST', body: JSON.stringify(body) });
        statusBox.textContent = dryRun
          ? `Dry-run: ${res.valid_count} valid, ${res.error_count} errors`
          : `Imported ${res.imported}, skipped ${res.skipped}`;
        if (!dryRun) {
          toast(`Imported ${res.imported} items`, 'success');
          loadAll();
        }
      }

      btnVal.addEventListener('click', () => runImport(true).catch(e => { statusBox.textContent = e.message; }));
      btnCommit.addEventListener('click', () => runImport(false).catch(e => { statusBox.textContent = e.message; }));
      mFoot.append(btnVal, btnCommit);
      modal.hidden = false;
    }

    loadAll();
    return true;
  }

  window.CSOEduBatch1 = { render, MODULE_META };
})();
