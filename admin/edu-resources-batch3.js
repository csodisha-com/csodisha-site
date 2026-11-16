/* Educational Resources Batch 3 (09-12) Content Command Workspace — Strict CSP */
(() => {
  'use strict';

  const MODULE_META = {
    'module-05-009': { num: '09', endpoint: '/api/admin/edu/admit-results', kind: 'admit_results', title: 'Admit Cards & Results' },
    'module-05-010': { num: '10', endpoint: '/api/admin/edu/syllabi', kind: 'syllabi', title: 'Syllabus & Exam Patterns' },
    'module-05-011': { num: '11', endpoint: '/api/admin/edu/pyqs', kind: 'pyqs', title: 'Previous Year Questions' },
    'module-05-012': { num: '12', endpoint: '/api/admin/edu/questions', kind: 'questions', title: 'Question Bank' }
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
    const lbl = el('label', 'cso-edu-label', labelText);
    f.append(lbl, inputEl);
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
      counts: { all: 0, published: 0, draft: 0, scheduled: 0, archived: 0 },
      selectedIds: new Set(),
      overview: null
    };

    if (actions) {
      actions.replaceChildren();
      const btnNew = el('button', 'cso-edu-btn cso-edu-btn--primary', '+ Create New');
      btnNew.type = 'button';
      btnNew.addEventListener('click', () => openEditor(null));
      actions.appendChild(btnNew);

      if (meta.kind === 'questions') {
        const btnImp = el('button', 'cso-edu-btn', 'Bulk Import JSON');
        btnImp.type = 'button';
        btnImp.addEventListener('click', openBulkImportModal);
        const btnExp = el('button', 'cso-edu-btn', 'Export JSON');
        btnExp.type = 'button';
        btnExp.addEventListener('click', () => {
          window.open('/api/admin/edu/questions/export', '_blank', 'noopener');
        });
        actions.append(btnImp, btnExp);
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

    if (meta.kind === 'admit_results') {
      const sel = el('select', 'cso-edu-select');
      [['', 'All Notice Types'], ['admit_card', 'Admit Card'], ['exam_city_slip', 'Exam City Slip'], ['provisional_result', 'Provisional Result'], ['final_result', 'Final Result'], ['merit_list', 'Merit List'], ['cutoff_scorecard', 'Cut-off & Scorecard']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; sel.appendChild(o);
      });
      sel.addEventListener('change', () => { state.filterA = sel.value; loadItems(); });
      filtersWrap.appendChild(sel);
    } else if (meta.kind === 'pyqs' || meta.kind === 'questions') {
      const sel = el('select', 'cso-edu-select');
      const opts = meta.kind === 'pyqs'
        ? [['', 'All Difficulties'], ['Easy', 'Easy'], ['Moderate', 'Moderate'], ['Hard', 'Hard']]
        : [['', 'All Difficulties'], ['Easy', 'Easy'], ['Medium', 'Medium'], ['Hard', 'Hard']];
      opts.forEach(([v, l]) => {
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
        state.overview = await api('/api/admin/edu/overview');
        renderKpis();
      } catch (e) {}
    }

    async function loadItems() {
      try {
        const params = new URLSearchParams();
        if (state.statusTab !== 'all') params.set('status', state.statusTab);
        if (state.q) params.set('q', state.q);
        if (state.filterA) {
          if (meta.kind === 'admit_results') params.set('notice_type', state.filterA);
          else if (meta.kind === 'pyqs') params.set('difficulty_level', state.filterA);
          else if (meta.kind === 'questions') params.set('difficulty', state.filterA);
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
      const b3 = (state.overview && state.overview.batch3) || {};
      const cards = [
        ['09 · Admit & Results', b3.admit_results ?? '—'],
        ['10 · Syllabi & Patterns', b3.syllabi ?? '—'],
        ['11 · PYQ Papers', b3.pyqs ?? '—'],
        ['12 · Question Bank', `${b3.questions ?? '—'} (${b3.mcq_bilingual_pct ?? 0}% OR)`]
      ];
      cards.forEach(([label, val]) => {
        const card = el('div', 'cso-edu-kpi');
        card.append(el('div', 'cso-edu-kpi-label', label), el('div', 'cso-edu-kpi-val', val));
        kpiGrid.appendChild(card);
      });
    }

    function renderTabs() {
      tabsWrap.replaceChildren();
      const list = meta.kind === 'questions'
        ? [['all', 'All'], ['published', 'Published'], ['draft', 'Draft'], ['archived', 'Archived']]
        : [['all', 'All'], ['published', 'Published'], ['draft', 'Draft'], ['scheduled', 'Scheduled'], ['archived', 'Archived']];
      list.forEach(([k, label]) => {
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
        const b = el('button', 'cso-edu-btn cso-edu-btn--sm', lbl);
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

      const cols = meta.kind === 'admit_results'
        ? ['Title & Body', 'Type', 'Exam / Release Date', 'Cut-offs', 'Status', 'Actions']
        : meta.kind === 'syllabi'
          ? ['Syllabus Title', 'Body & Class', 'Pattern Stages', 'Topics', 'Status', 'Actions']
          : meta.kind === 'pyqs'
            ? ['Paper Title', 'Subject & Year', 'Questions / Marks', 'Difficulty', 'Status', 'Actions']
            : ['Question (EN / OR)', 'Subject & Topic', 'Difficulty', 'Answer', 'Status', 'Actions'];

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

        if (meta.kind === 'admit_results') {
          const td1 = el('td');
          td1.append(el('div', 'cso-edu-cell-title', it.title_en), el('div', 'cso-edu-cell-sub', `${it.conducting_body || 'Odisha'} · ${it.title_or || it.slug}`));
          tr.append(
            td1,
            el('td', '', it.notice_type),
            el('td', '', `${it.exam_date || '—'} / ${it.release_date || '—'}`),
            el('td', '', `${(it.cutoff_table || []).length} rows`)
          );
        } else if (meta.kind === 'syllabi') {
          const td1 = el('td');
          td1.append(el('div', 'cso-edu-cell-title', it.title_en), el('div', 'cso-edu-cell-sub', it.title_or || it.slug));
          tr.append(
            td1,
            el('td', '', `${it.conducting_body || '—'} · ${it.class_grade_id || 'All'}`),
            el('td', '', `${(it.exam_pattern || []).length} stages`),
            el('td', '', `${(it.topics_checklist || []).length} topics`)
          );
        } else if (meta.kind === 'pyqs') {
          const td1 = el('td');
          td1.append(el('div', 'cso-edu-cell-title', it.title_en), el('div', 'cso-edu-cell-sub', it.shift_or_paper || it.slug));
          tr.append(
            td1,
            el('td', '', `${it.subject_name || 'General'} · ${it.exam_year || '—'}`),
            el('td', '', `${it.question_count || 0} Qs / ${it.total_marks || 0} Marks`),
            el('td', '', it.difficulty_level || 'Moderate')
          );
        } else {
          const td1 = el('td');
          td1.append(el('div', 'cso-edu-cell-title', it.question_en), el('div', 'cso-edu-cell-sub', it.question_or || it.exam_tag || it.slug));
          tr.append(
            td1,
            el('td', '', `${it.subject_name || '—'}${it.topic_name ? ' · ' + it.topic_name : ''}`),
            el('td', '', it.difficulty || 'Medium'),
            el('td', '', `Option ${it.correct_option}`)
          );
        }

        const tdSt = el('td');
        tdSt.appendChild(el('span', `cso-edu-badge cso-edu-badge--${it.status}`, it.status));
        tr.appendChild(tdSt);

        const tdAct = el('td', 'cso-edu-actions');
        const btnEdit = el('button', 'cso-edu-btn cso-edu-btn--sm', 'Edit');
        btnEdit.type = 'button';
        btnEdit.addEventListener('click', () => openEditor(it.id));
        tdAct.appendChild(btnEdit);

        if (meta.kind === 'pyqs') {
          const btnParse = el('button', 'cso-edu-btn cso-edu-btn--sm', 'Parse MCQs (12)');
          btnParse.type = 'button';
          btnParse.addEventListener('click', () => openParseMcqModal(it));
          tdAct.appendChild(btnParse);
        }

        const btnClone = el('button', 'cso-edu-btn cso-edu-btn--sm', 'Clone');
        btnClone.type = 'button';
        btnClone.addEventListener('click', async () => {
          try {
            await api(`${meta.endpoint}/${it.id}`, { method: 'PATCH', body: JSON.stringify({ action: 'clone' }) });
            toast('Cloned as draft', 'success');
            loadAll();
          } catch (e) { toast(e.message, 'error'); }
        });

        const btnDel = el('button', 'cso-edu-btn cso-edu-btn--sm cso-edu-btn--danger', 'Del');
        btnDel.type = 'button';
        btnDel.addEventListener('click', async () => {
          if (!confirm(`Delete this ${meta.title} item?`)) return;
          try {
            await api(`${meta.endpoint}/${it.id}`, { method: 'DELETE' });
            toast('Deleted', 'success');
            loadAll();
          } catch (e) { toast(e.message, 'error'); }
        });
        tdAct.append(btnClone, btnDel);
        tr.appendChild(tdAct);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      tableWrap.appendChild(tbl);
    }

    function openParseMcqModal(pyqItem) {
      const backdrop = el('div', 'cso-edu-drawer-backdrop');
      const drawer = el('div', 'cso-edu-drawer');
      const head = el('div', 'cso-edu-drawer-head');
      head.appendChild(el('h3', 'cso-edu-drawer-title', `Parse PYQ MCQs -> Question Bank (12)`));
      const closeBtn = el('button', 'cso-edu-btn cso-edu-btn--sm', 'Close');
      closeBtn.type = 'button';
      closeBtn.addEventListener('click', () => backdrop.remove());
      head.appendChild(closeBtn);

      const body = el('div', 'cso-edu-drawer-body');
      const subjIn = el('input', 'cso-edu-input'); subjIn.value = pyqItem.subject_name || 'General Studies';
      const tagIn = el('input', 'cso-edu-input'); tagIn.value = pyqItem.title_en || 'Odisha Exam';
      const yearIn = el('input', 'cso-edu-input'); yearIn.type = 'number'; yearIn.value = pyqItem.exam_year || 2025;
      const rawIn = el('textarea', 'cso-edu-textarea');
      rawIn.rows = 12;
      rawIn.placeholder = 'Q1. Which river is known as the Sorrow of Odisha?\nA) Mahanadi\nB) Brahmani\nC) Baitarani\nD) Subarnarekha\nAnswer: A\nExplanation: Mahanadi historically caused severe floods in Odisha.\n\nQ2. ...';

      const resBox = el('div', 'cso-edu-preview-card');
      resBox.textContent = 'Paste blank-line separated MCQ blocks above and click Parse & Insert.';

      body.append(
        buildField('Subject Name', subjIn),
        buildField('Exam Tag', tagIn),
        buildField('Exam Year', yearIn),
        buildField('Raw MCQ Text', rawIn),
        resBox
      );

      const foot = el('div', 'cso-edu-drawer-foot');
      const btnRun = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Parse & Insert to Question Bank');
      btnRun.type = 'button';
      btnRun.addEventListener('click', async () => {
        try {
          const out = await api('/api/admin/edu/pyqs/parse-to-bank', {
            method: 'POST',
            body: JSON.stringify({
              pyq_paper_id: pyqItem.id,
              subject_name: subjIn.value.trim(),
              exam_tag: tagIn.value.trim(),
              exam_year: Number(yearIn.value || 2025),
              raw_text: rawIn.value
            })
          });
          resBox.textContent = `Inserted ${out.inserted_count} MCQ(s) into Module 12 (Question Bank)!`;
          toast(`Parsed ${out.inserted_count} MCQs into Question Bank`, 'success');
          loadOverview();
        } catch (e) { toast(e.message, 'error'); }
      });
      foot.append(closeBtn.cloneNode(true), btnRun);
      foot.firstChild.addEventListener('click', () => backdrop.remove());
      drawer.append(head, body, foot);
      backdrop.appendChild(drawer);
      document.body.appendChild(backdrop);
    }

    function openBulkImportModal() {
      const backdrop = el('div', 'cso-edu-drawer-backdrop');
      const drawer = el('div', 'cso-edu-drawer');
      const head = el('div', 'cso-edu-drawer-head');
      head.appendChild(el('h3', 'cso-edu-drawer-title', 'Bulk Import MCQs (JSON)'));
      const closeBtn = el('button', 'cso-edu-btn cso-edu-btn--sm', 'Close');
      closeBtn.type = 'button';
      closeBtn.addEventListener('click', () => backdrop.remove());
      head.appendChild(closeBtn);

      const body = el('div', 'cso-edu-drawer-body');
      const jsonIn = el('textarea', 'cso-edu-textarea');
      jsonIn.rows = 12;
      jsonIn.placeholder = '[{"question_en":"...","A_en":"...","B_en":"...","C_en":"...","D_en":"...","correct_option":"A","subject_name":"Odisha GK","difficulty":"Easy"}]';
      const statusBox = el('div', 'cso-edu-preview-card', 'Run a Dry Run first to check for duplicate questions.');
      body.append(buildField('Questions JSON Array', jsonIn), statusBox);

      const foot = el('div', 'cso-edu-drawer-foot');
      const btnDry = el('button', 'cso-edu-btn', 'Dry Run (Check Duplicates)');
      btnDry.type = 'button';
      const btnImp = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Import Valid Questions');
      btnImp.type = 'button';

      async function runImport(dryRun) {
        try {
          const items = JSON.parse(jsonIn.value || '[]');
          const out = await api('/api/admin/edu/questions/import', {
            method: 'POST',
            body: JSON.stringify({ dry_run: dryRun, items })
          });
          if (dryRun) {
            statusBox.textContent = `Dry Run: ${out.valid_count} valid, ${out.duplicate_count} duplicate(s), ${out.error_count} error(s).`;
          } else {
            toast(`Imported ${out.imported} question(s)`, 'success');
            backdrop.remove();
            loadAll();
          }
        } catch (e) { toast(e.message, 'error'); }
      }
      btnDry.addEventListener('click', () => runImport(true));
      btnImp.addEventListener('click', () => runImport(false));
      foot.append(btnDry, btnImp);
      drawer.append(head, body, foot);
      backdrop.appendChild(drawer);
      document.body.appendChild(backdrop);
    }

    async function openEditor(itemId) {
      let item = null;
      let revisions = [];
      let coverage = null;
      if (itemId) {
        try {
          const res = await api(`${meta.endpoint}/${itemId}`);
          item = res.item;
          revisions = res.revisions || [];
          coverage = (res.item && res.item.heatmap) || res.coverage || null;
        } catch (e) { toast(e.message, 'error'); return; }
      }

      const backdrop = el('div', 'cso-edu-drawer-backdrop');
      const drawer = el('div', 'cso-edu-drawer');
      const head = el('div', 'cso-edu-drawer-head');
      head.appendChild(el('h3', 'cso-edu-drawer-title', `${item ? 'Edit' : 'Create'} ${meta.title}`));
      const btnClose = el('button', 'cso-edu-btn cso-edu-btn--sm', 'Close');
      btnClose.type = 'button';
      btnClose.addEventListener('click', () => backdrop.remove());
      head.appendChild(btnClose);

      const body = el('div', 'cso-edu-drawer-body');
      const previewCard = el('div', 'cso-edu-preview-card');
      const refs = {};

      if (meta.kind === 'admit_results') {
        const noticeSel = el('select', 'cso-edu-select');
        ['admit_card', 'exam_city_slip', 'provisional_result', 'final_result', 'merit_list', 'cutoff_scorecard'].forEach(v => {
          const o = el('option', '', v); o.value = v; noticeSel.appendChild(o);
        });
        noticeSel.value = item?.notice_type || 'admit_card';
        refs.notice_type = noticeSel;

        const bodyIn = el('input', 'cso-edu-input'); bodyIn.value = item?.conducting_body || 'OPSC'; refs.conducting_body = bodyIn;
        const examIn = el('input', 'cso-edu-input'); examIn.value = item?.examination_id || ''; refs.examination_id = examIn;
        const relIn = el('input', 'cso-edu-input'); relIn.type = 'date'; relIn.value = item?.release_date || ''; refs.release_date = relIn;
        const exdIn = el('input', 'cso-edu-input'); exdIn.type = 'date'; exdIn.value = item?.exam_date || ''; refs.exam_date = exdIn;
        const titleEn = el('input', 'cso-edu-input'); titleEn.value = item?.title_en || ''; refs.title_en = titleEn;
        const titleOr = el('input', 'cso-edu-input'); titleOr.value = item?.title_or || ''; refs.title_or = titleOr;
        const sumEn = el('textarea', 'cso-edu-textarea'); sumEn.rows = 2; sumEn.value = item?.summary_en || ''; refs.summary_en = sumEn;
        const dlIn = el('input', 'cso-edu-input'); dlIn.value = item?.download_url || ''; refs.download_url = dlIn;
        const fileIn = el('input', 'cso-edu-input'); fileIn.value = item?.file_url || ''; refs.file_url = fileIn;
        const r2In = el('input', 'cso-edu-input'); r2In.value = item?.r2_key || ''; refs.r2_key = r2In;

        const upInput = el('input', 'cso-edu-input'); upInput.type = 'file'; upInput.accept = '.pdf,image/*';
        upInput.addEventListener('change', async () => {
          if (!upInput.files[0]) return;
          const fd = new FormData();
          fd.append('file', upInput.files[0]);
          try {
            const up = await api('/api/admin/edu/resources/upload', { method: 'POST', body: fd });
            r2In.value = up.r2_key || '';
            fileIn.value = up.file_url || '';
            toast('PDF uploaded to R2', 'success');
          } catch (e) { toast(e.message, 'error'); }
        });

        // Cut-off table builder
        const cutoffRows = Array.isArray(item?.cutoff_table) ? item.cutoff_table.map(r => ({ ...r })) : [];
        const cutoffBox = el('div', 'cso-edu-section');
        const cutoffList = el('div');
        function renderCutoffs() {
          cutoffList.replaceChildren();
          cutoffRows.forEach((row, idx) => {
            const rDiv = el('div', 'cso-edu-row-inline');
            const catSel = el('select', 'cso-edu-select');
            ['UR', 'SEBC', 'SC', 'ST', 'PwD', 'Women'].forEach(c => { const o = el('option', '', c); o.value = c; catSel.appendChild(o); });
            catSel.value = row.category || 'UR';
            catSel.addEventListener('change', () => { row.category = catSel.value; });
            const marksIn = el('input', 'cso-edu-input'); marksIn.placeholder = 'Marks (e.g. 112.5)'; marksIn.value = row.marks ?? '';
            marksIn.addEventListener('input', () => { row.marks = marksIn.value; });
            const pctIn = el('input', 'cso-edu-input'); pctIn.placeholder = 'Qualifying %'; pctIn.value = row.qualifying_pct ?? '';
            pctIn.addEventListener('input', () => { row.qualifying_pct = pctIn.value; });
            const rm = el('button', 'cso-edu-btn cso-edu-btn--sm cso-edu-btn--danger', '×');
            rm.type = 'button';
            rm.addEventListener('click', () => { cutoffRows.splice(idx, 1); renderCutoffs(); });
            rDiv.append(catSel, marksIn, pctIn, rm);
            cutoffList.appendChild(rDiv);
          });
        }
        renderCutoffs();
        const addCutoffBtn = el('button', 'cso-edu-btn cso-edu-btn--sm', '+ Add Cut-off Row');
        addCutoffBtn.type = 'button';
        addCutoffBtn.addEventListener('click', () => { cutoffRows.push({ category: 'UR', marks: '', qualifying_pct: '' }); renderCutoffs(); });
        cutoffBox.append(el('div', 'cso-edu-label', 'Category Cut-off Table Builder'), cutoffList, addCutoffBtn);
        refs._getCutoffs = () => cutoffRows;

        body.append(
          buildField('Notice Type', noticeSel),
          buildField('Conducting Body', bodyIn),
          buildField('Linked Examination ID', examIn),
          buildField('Release Date', relIn),
          buildField('Exam Date', exdIn),
          buildField('Title (English) *', titleEn),
          buildField('Title (Odia)', titleOr),
          buildField('Summary (English)', sumEn),
          buildField('Official Download URL', dlIn),
          buildField('R2 PDF File URL', fileIn),
          buildField('Upload PDF to R2', upInput),
          cutoffBox
        );
      } else if (meta.kind === 'syllabi') {
        const titleEn = el('input', 'cso-edu-input'); titleEn.value = item?.title_en || ''; refs.title_en = titleEn;
        const titleOr = el('input', 'cso-edu-input'); titleOr.value = item?.title_or || ''; refs.title_or = titleOr;
        const bodyIn = el('input', 'cso-edu-input'); bodyIn.value = item?.conducting_body || 'OPSC'; refs.conducting_body = bodyIn;
        const examIn = el('input', 'cso-edu-input'); examIn.value = item?.examination_id || ''; refs.examination_id = examIn;
        const gradeIn = el('input', 'cso-edu-input'); gradeIn.value = item?.class_grade_id || ''; refs.class_grade_id = gradeIn;
        const sumEn = el('textarea', 'cso-edu-textarea'); sumEn.rows = 2; sumEn.value = item?.summary_en || ''; refs.summary_en = sumEn;

        const patternRows = Array.isArray(item?.exam_pattern) ? item.exam_pattern.map(r => ({ ...r })) : [];
        const patternBox = el('div', 'cso-edu-section');
        const patternList = el('div');
        function renderPattern() {
          patternList.replaceChildren();
          patternRows.forEach((row, idx) => {
            const rDiv = el('div', 'cso-edu-row-inline');
            const stg = el('input', 'cso-edu-input'); stg.placeholder = 'Stage'; stg.value = row.stage || '';
            stg.addEventListener('input', () => { row.stage = stg.value; });
            const ppr = el('input', 'cso-edu-input'); ppr.placeholder = 'Paper'; ppr.value = row.paper || '';
            ppr.addEventListener('input', () => { row.paper = ppr.value; });
            const mrk = el('input', 'cso-edu-input'); mrk.type = 'number'; mrk.placeholder = 'Marks'; mrk.value = row.marks ?? 100;
            mrk.addEventListener('input', () => { row.marks = Number(mrk.value || 0); });
            const rm = el('button', 'cso-edu-btn cso-edu-btn--sm cso-edu-btn--danger', '×'); rm.type = 'button';
            rm.addEventListener('click', () => { patternRows.splice(idx, 1); renderPattern(); });
            rDiv.append(stg, ppr, mrk, rm);
            patternList.appendChild(rDiv);
          });
        }
        renderPattern();
        const addPatBtn = el('button', 'cso-edu-btn cso-edu-btn--sm', '+ Add Pattern Stage'); addPatBtn.type = 'button';
        addPatBtn.addEventListener('click', () => { patternRows.push({ stage: 'Prelims', paper: 'Paper I', questions: 100, marks: 200, duration_mins: 120 }); renderPattern(); });
        patternBox.append(el('div', 'cso-edu-label', 'Exam Pattern Builder'), patternList, addPatBtn);
        refs._getPattern = () => patternRows;

        const topicRows = Array.isArray(item?.topics_checklist) ? item.topics_checklist.map(r => ({ ...r })) : [];
        const topicBox = el('div', 'cso-edu-section');
        const topicList = el('div');
        function renderTopics() {
          topicList.replaceChildren();
          topicRows.forEach((row, idx) => {
            const rDiv = el('div', 'cso-edu-row-inline');
            const tIn = el('input', 'cso-edu-input'); tIn.placeholder = 'Topic Title'; tIn.value = row.title_en || '';
            tIn.addEventListener('input', () => { row.title_en = tIn.value; });
            const sIn = el('input', 'cso-edu-input'); sIn.placeholder = 'Subject'; sIn.value = row.subject_name || '';
            sIn.addEventListener('input', () => { row.subject_name = sIn.value; });
            const rm = el('button', 'cso-edu-btn cso-edu-btn--sm cso-edu-btn--danger', '×'); rm.type = 'button';
            rm.addEventListener('click', () => { topicRows.splice(idx, 1); renderTopics(); });
            rDiv.append(tIn, sIn, rm);
            topicList.appendChild(rDiv);
          });
        }
        renderTopics();
        const addTopBtn = el('button', 'cso-edu-btn cso-edu-btn--sm', '+ Add Syllabus Topic'); addTopBtn.type = 'button';
        addTopBtn.addEventListener('click', () => { topicRows.push({ title_en: '', subject_name: 'General Studies', weightage_marks: 10 }); renderTopics(); });
        topicBox.append(el('div', 'cso-edu-label', 'Topics Checklist'), topicList, addTopBtn);
        refs._getTopics = () => topicRows;

        body.append(
          buildField('Title (English) *', titleEn),
          buildField('Title (Odia)', titleOr),
          buildField('Conducting Body', bodyIn),
          buildField('Linked Examination ID', examIn),
          buildField('Linked Class / Grade ID', gradeIn),
          buildField('Summary (English)', sumEn),
          patternBox,
          topicBox
        );

        if (coverage) {
          const covBox = el('div', 'cso-edu-preview-card');
          const prog = el('progress');
          prog.max = 100;
          prog.value = coverage.coverage_pct || 0;
          covBox.append(
            el('div', 'cso-edu-label', `Topic Coverage Heatmap: ${coverage.covered_topics}/${coverage.total_topics} (${coverage.coverage_pct}%)`),
            prog
          );
          (coverage.details || []).forEach(d => {
            covBox.appendChild(el('div', 'cso-edu-cell-sub', `${d.covered ? '✓' : '○'} ${d.title_en} [${d.has_notes ? 'Notes ' : ''}${d.has_pyq ? 'PYQ ' : ''}${d.has_questions ? 'QBank' : ''}]`));
          });
          body.appendChild(covBox);
        }
      } else if (meta.kind === 'pyqs') {
        const titleEn = el('input', 'cso-edu-input'); titleEn.value = item?.title_en || ''; refs.title_en = titleEn;
        const titleOr = el('input', 'cso-edu-input'); titleOr.value = item?.title_or || ''; refs.title_or = titleOr;
        const subjIn = el('input', 'cso-edu-input'); subjIn.value = item?.subject_name || 'General Studies'; refs.subject_name = subjIn;
        const yearIn = el('input', 'cso-edu-input'); yearIn.type = 'number'; yearIn.value = item?.exam_year || 2025; refs.exam_year = yearIn;
        const shiftIn = el('input', 'cso-edu-input'); shiftIn.value = item?.shift_or_paper || ''; refs.shift_or_paper = shiftIn;
        const qCnt = el('input', 'cso-edu-input'); qCnt.type = 'number'; qCnt.value = item?.question_count ?? 100; refs.question_count = qCnt;
        const durIn = el('input', 'cso-edu-input'); durIn.type = 'number'; durIn.value = item?.duration_mins ?? 120; refs.duration_mins = durIn;
        const mrkIn = el('input', 'cso-edu-input'); mrkIn.type = 'number'; mrkIn.value = item?.total_marks ?? 100; refs.total_marks = mrkIn;
        const diffSel = el('select', 'cso-edu-select');
        ['Easy', 'Moderate', 'Hard'].forEach(v => { const o = el('option', '', v); o.value = v; diffSel.appendChild(o); });
        diffSel.value = item?.difficulty_level || 'Moderate'; refs.difficulty_level = diffSel;
        const fileIn = el('input', 'cso-edu-input'); fileIn.value = item?.file_url || ''; refs.file_url = fileIn;
        const r2In = el('input', 'cso-edu-input'); r2In.value = item?.r2_key || ''; refs.r2_key = r2In;
        const ansIn = el('input', 'cso-edu-input'); ansIn.value = item?.answer_key_url || ''; refs.answer_key_url = ansIn;
        const offChk = el('input'); offChk.type = 'checkbox'; offChk.checked = Boolean(item?.offline_ready); refs.offline_ready = offChk;

        const upInput = el('input', 'cso-edu-input'); upInput.type = 'file'; upInput.accept = '.pdf';
        upInput.addEventListener('change', async () => {
          if (!upInput.files[0]) return;
          const fd = new FormData(); fd.append('file', upInput.files[0]);
          try {
            const up = await api('/api/admin/edu/resources/upload', { method: 'POST', body: fd });
            r2In.value = up.r2_key || ''; fileIn.value = up.file_url || '';
            toast('PYQ PDF uploaded to R2', 'success');
          } catch (e) { toast(e.message, 'error'); }
        });

        body.append(
          buildField('Paper Title (English) *', titleEn),
          buildField('Paper Title (Odia)', titleOr),
          buildField('Subject Name', subjIn),
          buildField('Exam Year', yearIn),
          buildField('Shift / Paper', shiftIn),
          buildField('Question Count', qCnt),
          buildField('Duration (Mins)', durIn),
          buildField('Total Marks', mrkIn),
          buildField('Difficulty', diffSel),
          buildField('PDF File URL', fileIn),
          buildField('Upload PYQ PDF to R2', upInput),
          buildField('Answer Key URL', ansIn),
          buildField('Offline Ready', offChk)
        );
      } else {
        const subjIn = el('input', 'cso-edu-input'); subjIn.value = item?.subject_name || 'General Studies'; refs.subject_name = subjIn;
        const topIn = el('input', 'cso-edu-input'); topIn.value = item?.topic_name || ''; refs.topic_name = topIn;
        const tagIn = el('input', 'cso-edu-input'); tagIn.value = item?.exam_tag || ''; refs.exam_tag = tagIn;
        const yearIn = el('input', 'cso-edu-input'); yearIn.type = 'number'; yearIn.value = item?.exam_year || 2025; refs.exam_year = yearIn;
        const diffSel = el('select', 'cso-edu-select');
        ['Easy', 'Medium', 'Hard'].forEach(v => { const o = el('option', '', v); o.value = v; diffSel.appendChild(o); });
        diffSel.value = item?.difficulty || 'Medium'; refs.difficulty = diffSel;
        const qEn = el('textarea', 'cso-edu-textarea'); qEn.rows = 2; qEn.value = item?.question_en || ''; refs.question_en = qEn;
        const qOr = el('textarea', 'cso-edu-textarea'); qOr.rows = 2; qOr.value = item?.question_or || ''; refs.question_or = qOr;

        const opts = item?.options || {};
        ['A', 'B', 'C', 'D'].forEach(k => {
          const oe = el('input', 'cso-edu-input'); oe.value = opts[`${k}_en`] || ''; refs[`opt_${k}_en`] = oe;
          const oo = el('input', 'cso-edu-input'); oo.value = opts[`${k}_or`] || ''; refs[`opt_${k}_or`] = oo;
          body.append(buildField(`Option ${k} (EN)`, oe), buildField(`Option ${k} (OR)`, oo));
        });

        const ansSel = el('select', 'cso-edu-select');
        ['A', 'B', 'C', 'D'].forEach(v => { const o = el('option', '', v); o.value = v; ansSel.appendChild(o); });
        ansSel.value = item?.correct_option || 'A'; refs.correct_option = ansSel;
        const expEn = el('textarea', 'cso-edu-textarea'); expEn.rows = 2; expEn.value = item?.explanation_en || ''; refs.explanation_en = expEn;
        const expOr = el('textarea', 'cso-edu-textarea'); expOr.rows = 2; expOr.value = item?.explanation_or || ''; refs.explanation_or = expOr;

        body.prepend(
          buildField('Subject Name', subjIn),
          buildField('Topic Name', topIn),
          buildField('Exam Tag', tagIn),
          buildField('Exam Year', yearIn),
          buildField('Difficulty', diffSel),
          buildField('Question (English) *', qEn),
          buildField('Question (Odia)', qOr)
        );
        body.append(
          buildField('Correct Option', ansSel),
          buildField('Explanation (English)', expEn),
          buildField('Explanation (Odia)', expOr)
        );
      }

      // Shared Status, Tags, Featured, Preview, Revisions
      const statusSel = el('select', 'cso-edu-select');
      const statuses = meta.kind === 'questions' ? ['draft', 'published', 'archived'] : ['draft', 'published', 'scheduled', 'archived'];
      statuses.forEach(s => { const o = el('option', '', s); o.value = s; statusSel.appendChild(o); });
      statusSel.value = item?.status || 'published';
      refs.status = statusSel;

      const tagsIn = el('input', 'cso-edu-input'); tagsIn.value = (item?.tags || []).join(', '); refs.tags = tagsIn;
      const featChk = el('input'); featChk.type = 'checkbox'; featChk.checked = Boolean(item?.featured); refs.featured = featChk;
      body.append(buildField('Tags (comma-separated)', tagsIn), buildField('Status', statusSel), buildField('Featured', featChk));

      if (meta.kind === 'admit_results' || meta.kind === 'syllabi') {
        const btnCheck = el('button', 'cso-edu-btn cso-edu-btn--sm', 'Check Links');
        btnCheck.type = 'button';
        btnCheck.addEventListener('click', async () => {
          const urls = [refs.download_url?.value, refs.file_url?.value].filter(Boolean);
          if (!urls.length) { toast('No URLs to check', 'info'); return; }
          try {
            const res = await api('/api/admin/utils/check-links', { method: 'POST', body: JSON.stringify({ urls }) });
            const bad = (res.results || []).filter(r => !r.ok);
            toast(bad.length ? `${bad.length} broken link(s)` : 'All links reachable', bad.length ? 'error' : 'success');
          } catch (e) { toast(e.message, 'error'); }
        });
        body.appendChild(btnCheck);
      }

      function updatePreview() {
        const headText = refs.title_en?.value || refs.question_en?.value || 'Preview';
        const subText = refs.title_or?.value || refs.question_or?.value || '';
        previewCard.textContent = `Student & WhatsApp Preview: ${headText}${subText ? ' | ' + subText : ''} [${statusSel.value}]`;
      }
      updatePreview();
      body.appendChild(previewCard);

      if (revisions.length) {
        const revBox = el('div', 'cso-edu-section');
        revBox.appendChild(el('div', 'cso-edu-label', 'Revision History'));
        revisions.slice(0, 6).forEach(r => {
          const row = el('div', 'cso-edu-rev-row');
          row.appendChild(el('span', 'cso-edu-rev-meta', `v${r.version_num} · ${r.change_note || 'Update'} · ${r.created_at}`));
          const rbBtn = el('button', 'cso-edu-btn cso-edu-btn--sm', 'Rollback');
          rbBtn.type = 'button';
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
      const btnSave = el('button', 'cso-edu-btn cso-edu-btn--primary', item ? 'Save Changes' : 'Create Entry');
      btnSave.type = 'button';
      btnSave.addEventListener('click', async () => {
        try {
          const payload = {
            status: refs.status.value,
            featured: refs.featured.checked,
            tags: refs.tags.value.split(',').map(s => s.trim()).filter(Boolean)
          };
          if (meta.kind === 'admit_results') {
            Object.assign(payload, {
              notice_type: refs.notice_type.value,
              conducting_body: refs.conducting_body.value.trim(),
              examination_id: refs.examination_id.value.trim(),
              release_date: refs.release_date.value,
              exam_date: refs.exam_date.value,
              title_en: refs.title_en.value.trim(),
              title_or: refs.title_or.value.trim(),
              summary_en: refs.summary_en.value.trim(),
              download_url: refs.download_url.value.trim(),
              file_url: refs.file_url.value.trim(),
              r2_key: refs.r2_key.value.trim(),
              cutoff_table: refs._getCutoffs()
            });
          } else if (meta.kind === 'syllabi') {
            Object.assign(payload, {
              title_en: refs.title_en.value.trim(),
              title_or: refs.title_or.value.trim(),
              conducting_body: refs.conducting_body.value.trim(),
              examination_id: refs.examination_id.value.trim(),
              class_grade_id: refs.class_grade_id.value.trim(),
              summary_en: refs.summary_en.value.trim(),
              exam_pattern: refs._getPattern(),
              topics_checklist: refs._getTopics()
            });
          } else if (meta.kind === 'pyqs') {
            Object.assign(payload, {
              title_en: refs.title_en.value.trim(),
              title_or: refs.title_or.value.trim(),
              subject_name: refs.subject_name.value.trim(),
              exam_year: Number(refs.exam_year.value || 2025),
              shift_or_paper: refs.shift_or_paper.value.trim(),
              question_count: Number(refs.question_count.value || 0),
              duration_mins: Number(refs.duration_mins.value || 120),
              total_marks: Number(refs.total_marks.value || 100),
              difficulty_level: refs.difficulty_level.value,
              file_url: refs.file_url.value.trim(),
              r2_key: refs.r2_key.value.trim(),
              answer_key_url: refs.answer_key_url.value.trim(),
              offline_ready: refs.offline_ready.checked
            });
          } else {
            Object.assign(payload, {
              subject_name: refs.subject_name.value.trim(),
              topic_name: refs.topic_name.value.trim(),
              exam_tag: refs.exam_tag.value.trim(),
              exam_year: Number(refs.exam_year.value || 2025),
              difficulty: refs.difficulty.value,
              question_en: refs.question_en.value.trim(),
              question_or: refs.question_or.value.trim(),
              options: {
                A_en: refs.opt_A_en.value.trim(), A_or: refs.opt_A_or.value.trim(),
                B_en: refs.opt_B_en.value.trim(), B_or: refs.opt_B_or.value.trim(),
                C_en: refs.opt_C_en.value.trim(), C_or: refs.opt_C_or.value.trim(),
                D_en: refs.opt_D_en.value.trim(), D_or: refs.opt_D_or.value.trim()
              },
              correct_option: refs.correct_option.value,
              explanation_en: refs.explanation_en.value.trim(),
              explanation_or: refs.explanation_or.value.trim()
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

      const cancelBtn = el('button', 'cso-edu-btn', 'Cancel');
      cancelBtn.type = 'button';
      cancelBtn.addEventListener('click', () => backdrop.remove());
      foot.append(cancelBtn, btnSave);
      drawer.append(head, body, foot);
      backdrop.appendChild(drawer);
      document.body.appendChild(backdrop);
    }

    loadAll();
    return true;
  }

  window.CSOEduBatch3 = { render, MODULE_META };
})();
