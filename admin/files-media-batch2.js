/* Files, Media & Cloud Batch 2 (05-08) Content Command Workspace — Strict CSP */
(() => {
  'use strict';

  const MODULE_META = {
    'module-07-005': { num: '05', endpoint: '/api/admin/media/images', kind: 'images', title: 'Image Library' },
    'module-07-006': { num: '06', endpoint: '/api/admin/media/av', kind: 'av', title: 'Video & Audio' },
    'module-07-007': { num: '07', endpoint: '/api/admin/media/cloud-links', kind: 'cloud_links', title: 'Cloud Links' },
    'module-07-008': { num: '08', endpoint: '/api/admin/media/gdrive', kind: 'gdrive', title: 'Google Drive Links' }
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

      if (meta.kind === 'cloud_links') {
        const btnVer = el('button', 'cso-edu-btn', 'Verify Links');
        btnVer.type = 'button';
        btnVer.addEventListener('click', async () => {
          try {
            const res = await api('/api/admin/media/cloud-links/verify', { method: 'POST', body: '{}' });
            toast(`Verified ${res.checked} links: ${res.ok_count} OK, ${res.broken_count} broken`, res.broken_count ? 'error' : 'success');
            loadAll();
          } catch (e) { toast(e.message, 'error'); }
        });
        actions.appendChild(btnVer);
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

    if (meta.kind === 'images') {
      const sel = el('select', 'cso-edu-select');
      [['', 'All Contexts'], ['hero_banner', 'Hero Banner'], ['study_diagram', 'Study Diagram'], ['book_cover', 'Book Cover'], ['social_og_card', 'Social OG Card'], ['icon_badge', 'Icon / Badge']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; sel.appendChild(o);
      });
      sel.addEventListener('change', () => { state.filterA = sel.value; loadItems(); });
      filtersWrap.appendChild(sel);
    } else if (meta.kind === 'av') {
      const sel = el('select', 'cso-edu-select');
      [['', 'All Media'], ['video', 'Video'], ['audio', 'Audio']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; sel.appendChild(o);
      });
      sel.addEventListener('change', () => { state.filterA = sel.value; loadItems(); });
      filtersWrap.appendChild(sel);
    } else if (meta.kind === 'cloud_links') {
      const sel = el('select', 'cso-edu-select');
      [['', 'All Connectors'], ['onedrive', 'OneDrive'], ['dropbox', 'Dropbox'], ['internet_archive', 'Internet Archive'], ['github_raw', 'GitHub Raw'], ['custom_cdn', 'Custom CDN']].forEach(([v, l]) => {
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
        state.overview = await api('/api/admin/media/overview');
        renderKpis();
      } catch (e) {}
    }

    async function loadItems() {
      try {
        const params = new URLSearchParams();
        if (state.statusTab !== 'all') params.set('status', state.statusTab);
        if (state.q) params.set('q', state.q);
        if (state.filterA) {
          if (meta.kind === 'images') params.set('usage_context', state.filterA);
          else if (meta.kind === 'av') params.set('media_kind', state.filterA);
          else if (meta.kind === 'cloud_links') params.set('connector_type', state.filterA);
        }
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
      const b2 = (state.overview && state.overview.batch2) || {};
      const cards = [
        ['05 · Images', b2.images ?? '—'],
        ['06 · Video & Audio', b2.av_items ?? '—'],
        ['07 · Cloud Links', b2.cloud_links ?? '—'],
        ['08 · Google Drive', `${b2.gdrive_links ?? '—'} (${b2.healthy_links ?? 0} OK)`]
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

      const cols = meta.kind === 'images'
        ? ['Image Title', 'Context & Dimensions', 'Alt Text', 'WebP', 'Status', 'Actions']
        : meta.kind === 'av'
          ? ['Lecture Title', 'Kind & Source', 'Duration', 'Chapters', 'Status', 'Actions']
          : meta.kind === 'cloud_links'
            ? ['Cloud Resource', 'Connector', 'Size', 'Health', 'Status', 'Actions']
            : ['Google Drive Resource', 'Kind & File ID', 'Size', 'Health', 'Status', 'Actions'];

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

        if (meta.kind === 'images') {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', it.title_en), el('div', 'cso-edu-title-or', it.title_or || it.public_url));
          tr.append(
            td1,
            el('td', '', `${it.usage_context || 'study_diagram'} (${it.width_px || 0}×${it.height_px || 0})`),
            el('td', '', (it.alt_or_caption_en || '—').slice(0, 48)),
            el('td', '', it.webp_optimized ? 'WebP' : 'Raw')
          );
        } else if (meta.kind === 'av') {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', it.title_en), el('div', 'cso-edu-title-or', it.title_or || it.slug));
          tr.append(
            td1,
            el('td', '', `${it.media_kind || it.file_category} · ${it.source_mode || 'embed'}`),
            el('td', '', `${Math.round((it.duration_seconds || 0) / 60)}m`),
            el('td', '', `${(it.chapters || []).length} chapters`)
          );
        } else if (meta.kind === 'cloud_links') {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', it.title_en), el('div', 'cso-edu-title-or', it.raw_share_url));
          const tdH = el('td');
          const hCls = it.link_health_status === 'ok' ? 'ok' : it.link_health_status === 'broken' ? 'arch' : 'draft';
          tdH.appendChild(el('span', `cso-edu-badge cso-edu-badge--${hCls}`, it.link_health_status));
          tr.append(td1, el('td', '', it.connector_type), el('td', '', it.estimated_size_label || '—'), tdH);
        } else {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', it.title_en), el('div', 'cso-edu-title-or', it.title_or || it.raw_share_url));
          const tdH = el('td');
          const hCls = it.link_health_status === 'ok' ? 'ok' : it.link_health_status === 'broken' ? 'arch' : 'draft';
          tdH.appendChild(el('span', `cso-edu-badge cso-edu-badge--${hCls}`, it.link_health_status));
          tr.append(td1, el('td', '', `${it.drive_resource_kind} · ${it.drive_file_id || '—'}`), el('td', '', it.estimated_size_label || '—'), tdH);
        }

        const tdSt = el('td');
        const stCls = it.status === 'published' ? 'pub' : it.status === 'archived' ? 'arch' : 'draft';
        tdSt.appendChild(el('span', `cso-edu-badge cso-edu-badge--${stCls}`, it.status));
        tr.appendChild(tdSt);

        const tdAct = el('td', 'cso-edu-actions');
        if (meta.kind === 'images') {
          const btnCopy = el('button', 'cso-edu-btn', 'Copy <img>'); btnCopy.type = 'button';
          btnCopy.addEventListener('click', () => {
            const tag = `<img src="${it.public_url}" alt="${it.alt_or_caption_en || it.title_en}" loading="lazy">`;
            if (navigator.clipboard) navigator.clipboard.writeText(tag).catch(() => {});
            toast('Copied <img> HTML snippet', 'info');
          });
          tdAct.appendChild(btnCopy);
        }
        const btnPrev = el('button', 'cso-edu-btn', 'Preview'); btnPrev.type = 'button';
        btnPrev.addEventListener('click', () => openPreviewModal(it));
        const btnEdit = el('button', 'cso-edu-btn', 'Edit'); btnEdit.type = 'button';
        btnEdit.addEventListener('click', () => openEditor(it.id));
        tdAct.append(btnPrev, btnEdit);

        if (meta.kind === 'cloud_links' || meta.kind === 'gdrive') {
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

    function openPreviewModal(it) {
      const backdrop = el('div', 'cso-edu-drawer-backdrop');
      const drawer = el('div', 'cso-edu-drawer');
      const head = el('div', 'cso-edu-drawer-head');
      head.appendChild(el('h3', '', `Preview: ${it.title_en}`));
      const closeBtn = el('button', 'cso-edu-btn', 'Close'); closeBtn.type = 'button';
      closeBtn.addEventListener('click', () => backdrop.remove());
      head.appendChild(closeBtn);

      const body = el('div', 'cso-edu-drawer-body');
      if (meta.kind === 'images') {
        const img = el('img');
        img.src = it.public_url;
        img.alt = it.alt_or_caption_en || it.title_en;
        body.appendChild(img);
      } else if (meta.kind === 'av') {
        const src = it.embed_id_or_url || it.public_url;
        if (it.media_kind === 'audio') {
          const aud = el('audio'); aud.controls = true; aud.src = src; body.appendChild(aud);
        } else {
          const frame = el('iframe', 'cso-edu-textarea-full'); frame.src = src; frame.title = it.title_en; body.appendChild(frame);
        }
      } else {
        const card = el('div', 'cso-edu-preview-card');
        card.textContent = `Share URL: ${it.raw_share_url}\nEmbed URL: ${it.preview_embed_url || '—'}\nDirect Download: ${it.direct_download_url || '—'}`;
        body.appendChild(card);
        if (it.preview_embed_url) {
          const frame = el('iframe', 'cso-edu-textarea-full'); frame.src = it.preview_embed_url; frame.title = it.title_en;
          body.appendChild(frame);
        }
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

      if (meta.kind === 'images') {
        const titleEn = el('input', 'cso-edu-input cso-edu-input-full'); titleEn.value = item?.title_en || ''; refs.title_en = titleEn;
        const titleOr = el('input', 'cso-edu-input cso-edu-input-full'); titleOr.value = item?.title_or || ''; refs.title_or = titleOr;
        const urlIn = el('input', 'cso-edu-input cso-edu-input-full'); urlIn.value = item?.public_url || ''; refs.public_url = urlIn;
        const upIn = el('input', 'cso-edu-input'); upIn.type = 'file'; upIn.accept = 'image/*';
        upIn.addEventListener('change', async () => {
          if (!upIn.files[0]) return;
          const fd = new FormData(); fd.append('files', upIn.files[0]);
          try {
            const up = await api('/api/admin/media/upload', { method: 'POST', body: fd });
            urlIn.value = up.url || '';
            toast('Image uploaded to R2', 'success');
          } catch (e) { toast(e.message, 'error'); }
        });
        const ctxSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['hero_banner', 'study_diagram', 'book_cover', 'social_og_card', 'icon_badge'].forEach(c => { const o = el('option', '', c); o.value = c; ctxSel.appendChild(o); });
        ctxSel.value = item?.usage_context || 'study_diagram'; refs.usage_context = ctxSel;
        const altEn = el('input', 'cso-edu-input cso-edu-input-full'); altEn.value = item?.alt_or_caption_en || ''; refs.alt_or_caption_en = altEn;
        const altOr = el('input', 'cso-edu-input cso-edu-input-full'); altOr.value = item?.alt_or_caption_or || ''; refs.alt_or_caption_or = altOr;

        body.append(
          buildField('Title (English) *', titleEn),
          buildField('Title (Odia)', titleOr),
          buildField('Image URL', urlIn),
          buildField('Upload Image to R2', upIn),
          buildField('Usage Context', ctxSel),
          buildField('Alt Text / Caption (EN)', altEn),
          buildField('Alt Text / Caption (OR)', altOr)
        );
      } else if (meta.kind === 'av') {
        const titleEn = el('input', 'cso-edu-input cso-edu-input-full'); titleEn.value = item?.title_en || ''; refs.title_en = titleEn;
        const titleOr = el('input', 'cso-edu-input cso-edu-input-full'); titleOr.value = item?.title_or || ''; refs.title_or = titleOr;
        const kSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['video', 'audio'].forEach(k => { const o = el('option', '', k); o.value = k; kSel.appendChild(o); });
        kSel.value = item?.media_kind || 'video'; refs.media_kind = kSel;
        const mSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['youtube_embed', 'vimeo_embed', 'r2_upload', 'external_stream'].forEach(m => { const o = el('option', '', m); o.value = m; mSel.appendChild(o); });
        mSel.value = item?.source_mode || 'youtube_embed'; refs.source_mode = mSel;
        const urlIn = el('input', 'cso-edu-input cso-edu-input-full'); urlIn.value = item?.embed_id_or_url || ''; refs.embed_id_or_url = urlIn;
        const durIn = el('input', 'cso-edu-input cso-edu-input-full'); durIn.type = 'number'; durIn.value = item?.duration_seconds ?? 600; refs.duration_seconds = durIn;
        const trEn = el('textarea', 'cso-edu-textarea cso-edu-textarea-full'); trEn.value = item?.transcript_en || ''; refs.transcript_en = trEn;

        body.append(
          buildField('Title (English) *', titleEn),
          buildField('Title (Odia)', titleOr),
          buildField('Media Kind', kSel),
          buildField('Source Mode', mSel),
          buildField('Embed URL / Stream URL *', urlIn),
          buildField('Duration (seconds)', durIn),
          buildField('Transcript (English)', trEn)
        );
      } else {
        const titleEn = el('input', 'cso-edu-input cso-edu-input-full'); titleEn.value = item?.title_en || ''; refs.title_en = titleEn;
        const titleOr = el('input', 'cso-edu-input cso-edu-input-full'); titleOr.value = item?.title_or || ''; refs.title_or = titleOr;
        const shareIn = el('input', 'cso-edu-input cso-edu-input-full'); shareIn.value = item?.raw_share_url || ''; refs.raw_share_url = shareIn;
        const szIn = el('input', 'cso-edu-input cso-edu-input-full'); szIn.value = item?.estimated_size_label || ''; refs.estimated_size_label = szIn;

        if (meta.kind === 'gdrive') {
          const parsedBox = el('div', 'cso-edu-preview-card', item ? `File ID: ${item.drive_file_id} | Kind: ${item.drive_resource_kind}` : 'Paste a Google Drive share URL and click Parse Drive Link.');
          const parseBtn = el('button', 'cso-edu-btn', 'Parse Google Drive URL'); parseBtn.type = 'button';
          parseBtn.addEventListener('click', async () => {
            try {
              const out = await api('/api/admin/media/gdrive/parse', { method: 'POST', body: JSON.stringify({ raw_share_url: shareIn.value.trim() }) });
              parsedBox.textContent = `Extracted ID: ${out.drive_file_id || '—'} (${out.drive_resource_kind})\nEmbed: ${out.preview_embed_url}\nDownload: ${out.direct_download_url}`;
              toast('Parsed Google Drive link!', 'success');
            } catch (e) { toast(e.message, 'error'); }
          });
          body.append(buildField('Google Drive Share URL *', shareIn), parseBtn, parsedBox);
        } else {
          const connSel = el('select', 'cso-edu-select cso-edu-select-full');
          ['onedrive', 'dropbox', 'internet_archive', 'github_raw', 'custom_cdn'].forEach(c => { const o = el('option', '', c); o.value = c; connSel.appendChild(o); });
          connSel.value = item?.connector_type || 'custom_cdn'; refs.connector_type = connSel;
          body.append(buildField('Cloud Connector', connSel), buildField('Share / CDN URL *', shareIn));
        }

        body.prepend(buildField('Title (English) *', titleEn), buildField('Title (Odia)', titleOr));
        body.append(buildField('Estimated Size Label (e.g. 25 MB)', szIn));
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
          if (meta.kind === 'images') {
            Object.assign(payload, {
              title_en: refs.title_en.value.trim(),
              title_or: refs.title_or.value.trim(),
              public_url: refs.public_url.value.trim(),
              usage_context: refs.usage_context.value,
              alt_or_caption_en: refs.alt_or_caption_en.value.trim(),
              alt_or_caption_or: refs.alt_or_caption_or.value.trim()
            });
          } else if (meta.kind === 'av') {
            Object.assign(payload, {
              title_en: refs.title_en.value.trim(),
              title_or: refs.title_or.value.trim(),
              media_kind: refs.media_kind.value,
              source_mode: refs.source_mode.value,
              embed_id_or_url: refs.embed_id_or_url.value.trim(),
              duration_seconds: Number(refs.duration_seconds.value || 0),
              transcript_en: refs.transcript_en.value.trim()
            });
          } else {
            Object.assign(payload, {
              title_en: refs.title_en.value.trim(),
              title_or: refs.title_or.value.trim(),
              raw_share_url: refs.raw_share_url.value.trim(),
              estimated_size_label: refs.estimated_size_label.value.trim()
            });
            if (refs.connector_type) payload.connector_type = refs.connector_type.value;
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

  window.CSOFilesMediaBatch2 = { render, MODULE_META };
})();
