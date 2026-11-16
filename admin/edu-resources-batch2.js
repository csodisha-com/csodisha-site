/* Educational Resources Batch 2 (05-08) Content Command Workspace — Strict CSP */
(() => {
  'use strict';

  const MODULE_META = {
    'module-05-005': { num: '05', endpoint: '/api/admin/edu/subjects', kind: 'subjects', title: 'Subjects & Topics' },
    'module-05-006': { num: '06', endpoint: '/api/admin/edu/classes', kind: 'classes', title: 'Class / Grade Management' },
    'module-05-007': { num: '07', endpoint: '/api/admin/edu/examinations', kind: 'examinations', title: 'Examination Management' },
    'module-05-008': { num: '08', endpoint: '/api/admin/edu/recruitments', kind: 'recruitments', title: 'Recruitment & Jobs' }
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

  function render(moduleId, root, actions) {
    const meta = MODULE_META[moduleId];
    if (!meta || !root) return false;

    const state = {
      statusTab: 'all',
      q: '',
      filterA: '',
      items: [],
      counts: { all: 0, published: 0, draft: 0, scheduled: 0, archived: 0 },
      selectedIds: new Set(),
      overview: null
    };

    if (actions) {
      actions.replaceChildren();
      const btnNew = el('button', 'cso-edu-btn cso-edu-btn--primary', `+ Create New`);
      btnNew.type = 'button';
      btnNew.addEventListener('click', () => openEditor(null));
      actions.appendChild(btnNew);
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
        state.overview = await api('/api/admin/edu/overview');
        renderKpis();
      } catch (e) {}
    }

    async function loadItems() {
      try {
        const params = new URLSearchParams();
        if (state.statusTab !== 'all') params.set('status', state.statusTab);
        if (state.q) params.set('q', state.q);
        const qs = params.toString() ? `?${params.toString()}` : '';
        const data = await api(`${meta.endpoint}${qs}`);
        state.items = data.items || [];
        state.counts = data.counts || state.counts;
        renderTabs();
        renderTable();
      } catch (e) {
        toast(`Failed to load ${meta.title}: ${e.message}`, 'error');
      }
    }

    function renderKpis() {
      kpiGrid.replaceChildren();
      const b2 = (state.overview && state.overview.batch2) || {};
      const cards = [
        ['05 Subjects & Topics', b2.subjects || 0],
        ['06 Classes / Grades', b2.classes || 0],
        ['07 Examinations', b2.examinations || 0],
        ['08 Live Recruitments', b2.recruitments || 0],
        ['Current Module Items', state.counts.all || 0],
        ['Published', state.counts.published || 0]
      ];
      cards.forEach(([l, v]) => {
        const c = el('div', 'cso-edu-kpi');
        c.append(el('div', 'cso-edu-kpi-lbl', l), el('div', 'cso-edu-kpi-val', String(v)));
        kpiGrid.appendChild(c);
      });
    }

    function renderTabs() {
      tabsWrap.replaceChildren();
      const defs = [
        ['all', 'All', state.counts.all || 0],
        ['published', 'Published', state.counts.published || 0],
        ['draft', 'Drafts', state.counts.draft || 0]
      ];
      if (meta.kind === 'examinations' || meta.kind === 'recruitments') {
        defs.push(['scheduled', 'Scheduled', state.counts.scheduled || 0]);
      }
      defs.push(['archived', 'Archived', state.counts.archived || 0]);
      defs.forEach(([k, label, cnt]) => {
        const b = el('button', `cso-edu-tab${state.statusTab === k ? ' is-active' : ''}`, `${label} (${cnt})`);
        b.type = 'button';
        b.addEventListener('click', () => { state.statusTab = k; loadItems(); });
        tabsWrap.appendChild(b);
      });
    }

    function updateBulkBar() {
      bulkBar.replaceChildren();
      if (!state.selectedIds.size) { bulkBar.hidden = true; return; }
      bulkBar.hidden = false;
      bulkBar.appendChild(el('strong', '', `${state.selectedIds.size} selected`));
      [['published', 'Bulk Publish'], ['draft', 'Bulk Draft'], ['archived', 'Bulk Archive']].forEach(([st, lbl]) => {
        const b = el('button', 'cso-edu-btn', lbl);
        b.type = 'button';
        b.addEventListener('click', async () => {
          await api(meta.endpoint, { method: 'POST', body: JSON.stringify({ action: 'bulk_status', ids: [...state.selectedIds], status: st }) });
          state.selectedIds.clear();
          updateBulkBar();
          toast(`Updated to ${st}`, 'success');
          loadAll();
        });
        bulkBar.appendChild(b);
      });
    }

    function renderTable() {
      tableWrap.replaceChildren();
      const table = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      const chkAll = el('input');
      chkAll.type = 'checkbox';
      chkAll.addEventListener('change', () => {
        state.selectedIds.clear();
        if (chkAll.checked) state.items.forEach(it => state.selectedIds.add(it.id));
        renderTable();
        updateBulkBar();
      });
      const th0 = el('th'); th0.appendChild(chkAll);
      hr.append(th0, el('th', '', 'Title / Name (EN & ଓଡ଼ିଆ)'), el('th', '', 'Details'), el('th', '', 'Status'), el('th', '', 'Actions'));
      thead.appendChild(hr);
      table.appendChild(thead);

      const tbody = el('tbody');
      if (!state.items.length) {
        const tr = el('tr');
        const td = el('td', '', 'No records found. Click + Create New to add one.');
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
          chk.addEventListener('change', () => {
            if (chk.checked) state.selectedIds.add(item.id);
            else state.selectedIds.delete(item.id);
            updateBulkBar();
          });
          tdChk.appendChild(chk);

          const titleEn = item.title_en || item.name_en || item.title || '';
          const titleOr = item.title_or || item.name_or || '';
          const tdTitle = el('td');
          const box = el('div', 'cso-edu-title-cell');
          box.appendChild(el('strong', '', titleEn));
          if (titleOr) box.appendChild(el('span', 'cso-edu-title-or', titleOr));
          tdTitle.appendChild(box);

          const detailText = meta.kind === 'classes'
            ? `${item.stage_group} · ${item.board_or_body || ''}`
            : meta.kind === 'subjects'
            ? `${item.code || ''} · ${item.parent_topic_id ? 'Sub-topic' : 'Root Subject'}`
            : meta.kind === 'examinations'
            ? `${item.conducting_body} · ${item.exam_level} · ${item.exam_code || ''}`
            : `${item.recruiting_body || ''} · ${item.qualification_tag || ''} · ${item.deadline_date || ''}`;
          const tdDet = el('td', '', detailText);

          const tdSt = el('td');
          const stCls = item.status === 'published' ? 'pub' : item.status === 'scheduled' ? 'sched' : item.status === 'archived' ? 'arch' : 'draft';
          tdSt.appendChild(el('span', `cso-edu-badge cso-edu-badge--${stCls}`, item.status));

          const tdAct = el('td');
          const actRow = el('div', 'cso-edu-actions');

          const btnEdit = el('button', 'cso-edu-btn', 'Edit');
          btnEdit.type = 'button';
          btnEdit.addEventListener('click', () => openEditor(item.id));

          const btnPrev = el('button', 'cso-edu-btn', 'Preview');
          btnPrev.type = 'button';
          btnPrev.addEventListener('click', () => openPreview(item));

          const nextSt = item.status === 'published' ? 'draft' : 'published';
          const btnPub = el('button', 'cso-edu-btn', item.status === 'published' ? 'Draft' : 'Publish');
          btnPub.type = 'button';
          btnPub.addEventListener('click', async () => {
            await api(`${meta.endpoint}/${encodeURIComponent(item.id)}`, { method: 'PATCH', body: JSON.stringify({ status: nextSt }) });
            toast(`Updated to ${nextSt}`, 'success');
            loadAll();
          });

          const btnClone = el('button', 'cso-edu-btn', 'Clone');
          btnClone.type = 'button';
          btnClone.addEventListener('click', async () => {
            await api(`${meta.endpoint}/${encodeURIComponent(item.id)}`, { method: 'PATCH', body: JSON.stringify({ action: 'clone' }) });
            toast('Cloned as draft', 'success');
            loadAll();
          });

          const btnHist = el('button', 'cso-edu-btn', 'History');
          btnHist.type = 'button';
          btnHist.addEventListener('click', () => openHistory(item.id));

          const btnDel = el('button', 'cso-edu-btn cso-edu-btn--danger', 'Delete');
          btnDel.type = 'button';
          btnDel.addEventListener('click', async () => {
            if (!window.confirm(`Delete "${titleEn}"?`)) return;
            await api(`${meta.endpoint}/${encodeURIComponent(item.id)}`, { method: 'DELETE' });
            toast('Deleted', 'success');
            loadAll();
          });

          actRow.append(btnEdit, btnPrev, btnPub, btnClone, btnHist, btnDel);
          tdAct.appendChild(actRow);
          tr.append(tdChk, tdTitle, tdDet, tdSt, tdAct);
          tbody.appendChild(tr);
        });
      }
      table.appendChild(tbody);
      tableWrap.appendChild(table);
    }

    async function openEditor(itemId) {
      let item = null;
      let smartMatches = [];
      let interlinks = [];
      if (itemId) {
        const res = await api(`${meta.endpoint}/${encodeURIComponent(itemId)}`);
        item = res.item;
        smartMatches = res.smart_matches || [];
        interlinks = res.interlinks || [];
      }

      const backdrop = el('div', 'cso-edu-drawer-backdrop');
      const drawer = el('aside', 'cso-edu-drawer');
      drawer.setAttribute('role', 'dialog');
      drawer.setAttribute('aria-modal', 'true');

      const head = el('div', 'cso-edu-drawer-head');
      head.appendChild(el('strong', '', item ? `Edit ${meta.title}` : `New ${meta.title}`));
      const closeBtn = el('button', 'cso-edu-btn', 'Close ✕');
      closeBtn.type = 'button';
      closeBtn.addEventListener('click', () => backdrop.remove());
      head.appendChild(closeBtn);

      const bodyEl = el('div', 'cso-edu-drawer-body');
      const mkField = (lbl, node) => { const f = el('label', 'cso-edu-field', lbl); f.appendChild(node); return f; };
      const mkIn = (v, ph = '', type = 'text') => { const i = el('input', 'cso-edu-input cso-edu-input-full'); i.type = type; i.value = v || ''; i.placeholder = ph; return i; };
      const mkArea = (v, ph = '') => { const t = el('textarea', 'cso-edu-textarea cso-edu-textarea-full'); t.value = v || ''; t.placeholder = ph; return t; };

      const inEn = mkIn(item?.title_en || item?.name_en || '', 'English Title *');
      const inOr = mkIn(item?.title_or || item?.name_or || '', 'ଓଡ଼ିଆ ଶୀର୍ଷକ');
      const inCode = mkIn(item?.code || item?.exam_code || item?.recruiting_body || '', 'Code / Body');
      const inExtraA = mkIn(
        meta.kind === 'classes' ? item?.stage_group : meta.kind === 'subjects' ? item?.class_grade_id : meta.kind === 'examinations' ? item?.conducting_body : item?.qualification_tag,
        meta.kind === 'classes' ? 'school_1_10 / competitive_odisha' : meta.kind === 'subjects' ? 'class_grade_id (e.g. cls-opsc-oas)' : meta.kind === 'examinations' ? 'OPSC / OSSC / OSSSC / BSE Odisha' : 'Qualification Tag'
      );
      const inExtraB = mkIn(
        meta.kind === 'classes' ? item?.board_or_body : meta.kind === 'subjects' ? item?.parent_topic_id : meta.kind === 'examinations' ? item?.exam_level : item?.deadline_date,
        meta.kind === 'classes' ? 'Board / Body' : meta.kind === 'subjects' ? 'Parent Topic ID (optional)' : meta.kind === 'examinations' ? 'State / National / Board' : 'Deadline YYYY-MM-DD'
      );
      const inSumEn = mkArea(item?.summary_en || item?.description_en || '', 'Summary / Description (EN)');
      const inSumOr = mkArea(item?.summary_or || item?.description_or || '', 'ସାରାଂଶ (ଓଡ଼ିଆ)');
      const inFileUrl = mkIn(item?.file_url || '', '/api/media/...');
      const inApplyUrl = mkIn(item?.official_apply_url || '', 'https://...');
      const inTags = mkIn(Array.isArray(item?.tags) ? item.tags.join(', ') : '', 'Comma-separated canonical tags');

      const g = el('div', 'cso-edu-grid2');
      g.append(
        mkField('Title / Name (EN) *', inEn),
        mkField('Title / Name (ଓଡ଼ିଆ)', inOr),
        mkField(meta.kind === 'recruitments' ? 'Recruiting Body' : 'Code', inCode),
        mkField(meta.kind === 'classes' ? 'Stage Group' : meta.kind === 'subjects' ? 'Class ID' : meta.kind === 'examinations' ? 'Conducting Body' : 'Qualification', inExtraA),
        mkField(meta.kind === 'classes' ? 'Board / Body' : meta.kind === 'subjects' ? 'Parent Topic ID' : meta.kind === 'examinations' ? 'Exam Level' : 'Deadline Date', inExtraB),
        mkField('Canonical Tags', inTags),
        mkField('Summary (EN)', inSumEn),
        mkField('Summary (ଓଡ଼ିଆ)', inSumOr)
      );
      bodyEl.appendChild(g);

      if (meta.kind === 'examinations' || meta.kind === 'recruitments') {
        const fGrid = el('div', 'cso-edu-grid2');
        fGrid.append(mkField('Notification PDF URL (R2)', inFileUrl), mkField('Official / Apply URL', inApplyUrl));
        const upBtn = el('input'); upBtn.type = 'file'; upBtn.accept = 'application/pdf';
        upBtn.addEventListener('change', async () => {
          const f = upBtn.files && upBtn.files[0];
          if (!f) return;
          const fd = new FormData();
          fd.append('file', f);
          fd.append('resource_type', 'study_material');
          const up = await api('/api/admin/edu/resources/upload', { method: 'POST', body: fd });
          inFileUrl.value = up.file_url;
          toast('PDF uploaded to R2', 'success');
        });
        bodyEl.append(fGrid, mkField('Upload Notification PDF to R2', upBtn));
      }

      if (smartMatches.length && item?.id) {
        const box = el('div', 'cso-edu-section-box');
        box.appendChild(el('h4', 'cso-edu-section-title', 'Smart Auto-Match Resources (Modules 01-06)'));
        const row = el('div', 'cso-edu-actions');
        smartMatches.slice(0, 5).forEach(m => {
          const b = el('button', 'cso-edu-btn', `+ Link: ${m.title_en.slice(0, 26)}`);
          b.type = 'button';
          b.addEventListener('click', async () => {
            await api('/api/admin/edu/interlinks', {
              method: 'POST',
              body: JSON.stringify({ source_module: meta.num, source_id: item.id, target_module: '02', target_id: m.id, relation_type: 'related' })
            });
            toast('Interlinked resource', 'success');
          });
          row.appendChild(b);
        });
        box.appendChild(row);
        bodyEl.appendChild(box);
      }

      const foot = el('div', 'cso-edu-drawer-foot');
      const btnDraft = el('button', 'cso-edu-btn', 'Save Draft');
      btnDraft.type = 'button';
      const btnPub = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Publish Now');
      btnPub.type = 'button';

      async function save(status) {
        const payload = {
          title_en: inEn.value.trim(),
          name_en: inEn.value.trim(),
          title_or: inOr.value.trim(),
          name_or: inOr.value.trim(),
          code: inCode.value.trim(),
          exam_code: inCode.value.trim(),
          recruiting_body: inCode.value.trim(),
          summary_en: inSumEn.value.trim(),
          description_en: inSumEn.value.trim(),
          summary_or: inSumOr.value.trim(),
          description_or: inSumOr.value.trim(),
          tags: inTags.value.split(',').map(x => x.trim()).filter(Boolean),
          file_url: inFileUrl.value.trim(),
          official_apply_url: inApplyUrl.value.trim(),
          status
        };
        if (meta.kind === 'classes') {
          payload.stage_group = inExtraA.value.trim() || 'school_1_10';
          payload.board_or_body = inExtraB.value.trim();
        } else if (meta.kind === 'subjects') {
          payload.class_grade_id = inExtraA.value.trim();
          payload.parent_topic_id = inExtraB.value.trim() || null;
        } else if (meta.kind === 'examinations') {
          payload.conducting_body = inExtraA.value.trim() || 'OPSC';
          payload.exam_level = inExtraB.value.trim() || 'State';
        } else {
          payload.qualification_tag = inExtraA.value.trim();
          payload.deadline_date = inExtraB.value.trim();
        }

        if (item?.id) {
          await api(`${meta.endpoint}/${encodeURIComponent(item.id)}`, { method: 'PUT', body: JSON.stringify(payload) });
        } else {
          await api(meta.endpoint, { method: 'POST', body: JSON.stringify(payload) });
        }
        toast(`Saved (${status})`, 'success');
        backdrop.remove();
        loadAll();
      }

      btnDraft.addEventListener('click', () => save('draft').catch(e => toast(e.message, 'error')));
      btnPub.addEventListener('click', () => save('published').catch(e => toast(e.message, 'error')));
      foot.append(el('span'), (() => { const d = el('div', 'cso-edu-actions'); d.append(btnDraft, btnPub); return d; })());

      drawer.append(head, bodyEl, foot);
      backdrop.appendChild(drawer);
      backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
      document.body.appendChild(backdrop);
    }

    function openPreview(item) {
      const modal = document.getElementById('globalModal');
      const mTitle = document.getElementById('modalTitle');
      const mBody = document.getElementById('modalBody');
      const mFoot = document.getElementById('modalFooter');
      if (!modal || !mTitle || !mBody || !mFoot) return;
      mTitle.textContent = `Student & WhatsApp Preview — ${meta.title}`;
      mBody.replaceChildren();
      const card = el('div', 'cso-edu-preview-card');
      card.append(
        el('h3', '', item.title_en || item.name_en || ''),
        el('div', '', item.title_or || item.name_or || ''),
        el('p', '', item.summary_en || item.description_en || '')
      );
      mBody.appendChild(card);
      mFoot.replaceChildren();
      modal.hidden = false;
    }

    async function openHistory(itemId) {
      const modal = document.getElementById('globalModal');
      const mTitle = document.getElementById('modalTitle');
      const mBody = document.getElementById('modalBody');
      const mFoot = document.getElementById('modalFooter');
      if (!modal || !mTitle || !mBody || !mFoot) return;
      const detail = await api(`${meta.endpoint}/${encodeURIComponent(itemId)}`);
      mTitle.textContent = 'Revision History';
      mBody.replaceChildren();
      const list = el('div', 'cso-edu-rev-list');
      (detail.revisions || []).forEach(rev => {
        const row = el('div', 'cso-edu-rev-item');
        row.appendChild(el('span', '', `v${rev.version_num} — ${rev.change_note} · ${rev.created_at}`));
        const rb = el('button', 'cso-edu-btn', 'Rollback');
        rb.type = 'button';
        rb.addEventListener('click', async () => {
          await api(`${meta.endpoint}/${encodeURIComponent(itemId)}`, {
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
    }

    loadAll();
    return true;
  }

  window.CSOEduBatch2 = { render, MODULE_META };
})();
