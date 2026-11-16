/* Educational Resources Batch 4 (13-16) Content Command Workspace — Strict CSP */
(() => {
  'use strict';

  const MODULE_META = {
    'module-05-013': { num: '13', endpoint: '/api/admin/edu/quizzes', kind: 'quizzes', title: 'MCQ & Quiz Builder' },
    'module-05-014': { num: '14', endpoint: '/api/admin/edu/mock-tests', kind: 'mock_tests', title: 'Mock Tests' },
    'module-05-015': { num: '15', endpoint: '/api/admin/edu/answer-keys', kind: 'answer_keys', title: 'Answer Keys & Explanations' },
    'module-05-016': { num: '16', endpoint: '/api/admin/edu/collections', kind: 'collections', title: 'Resource Collections' }
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

    if (meta.kind === 'mock_tests') {
      const sel = el('select', 'cso-edu-select');
      [['', 'All Tiers'], ['free', 'Free'], ['registered', 'Registered'], ['featured', 'Featured']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; sel.appendChild(o);
      });
      sel.addEventListener('change', () => { state.filterA = sel.value; loadItems(); });
      filtersWrap.appendChild(sel);
    } else if (meta.kind === 'answer_keys') {
      const sel = el('select', 'cso-edu-select');
      [['', 'All Key Types'], ['official_provisional', 'Official Provisional'], ['official_final', 'Official Final'], ['model_expert', 'Model / Expert'], ['detailed_solutions', 'Detailed Solutions']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; sel.appendChild(o);
      });
      sel.addEventListener('change', () => { state.filterA = sel.value; loadItems(); });
      filtersWrap.appendChild(sel);
    } else if (meta.kind === 'collections') {
      const sel = el('select', 'cso-edu-select');
      [['', 'All Collection Types'], ['exam_starter_pack', 'Exam Starter Pack'], ['subject_roadmap', 'Subject Roadmap'], ['crash_course_bundle', 'Crash Course'], ['class_bundle', 'Class Bundle']].forEach(([v, l]) => {
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
          if (meta.kind === 'mock_tests') params.set('access_tier', state.filterA);
          else if (meta.kind === 'answer_keys') params.set('key_type', state.filterA);
          else if (meta.kind === 'collections') params.set('collection_type', state.filterA);
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
      const b4 = (state.overview && state.overview.batch4) || {};
      const cards = [
        ['13 · Quizzes', b4.quizzes ?? '—'],
        ['14 · Mock Tests', b4.mock_tests ?? '—'],
        ['15 · Answer Keys', b4.answer_keys ?? '—'],
        ['16 · Collections', `${b4.collections ?? '—'} (${b4.total_attempts ?? 0} attempts)`]
      ];
      cards.forEach(([label, val]) => {
        const card = el('div', 'cso-edu-kpi');
        card.append(el('div', 'cso-edu-kpi-lbl', label), el('div', 'cso-edu-kpi-val', val));
        kpiGrid.appendChild(card);
      });
    }

    function renderTabs() {
      tabsWrap.replaceChildren();
      [['all', 'All'], ['published', 'Published'], ['draft', 'Draft'], ['scheduled', 'Scheduled'], ['archived', 'Archived']].forEach(([k, label]) => {
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

      const cols = meta.kind === 'quizzes'
        ? ['Quiz Title', 'Subject & Exam', 'Questions / Marks', 'Duration / Attempts', 'Status', 'Actions']
        : meta.kind === 'mock_tests'
          ? ['Mock Test Title', 'Body & Series', 'Sections / Qs / Marks', 'Tier & Attempts', 'Status', 'Actions']
          : meta.kind === 'answer_keys'
            ? ['Answer Key Title', 'Body & Year', 'Key Type & Set', 'Objection Deadline', 'Status', 'Actions']
            : ['Collection Title', 'Type', 'Pathway Steps', 'Offline Pack', 'Status', 'Actions'];

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

        if (meta.kind === 'quizzes') {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', it.title_en), el('div', 'cso-edu-title-or', it.title_or || it.slug));
          tr.append(
            td1,
            el('td', '', `${it.subject_name || '—'} · ${it.exam_tag || 'General'}`),
            el('td', '', `${it.total_questions || 0} Qs / ${it.total_marks || 0} Marks`),
            el('td', '', `${it.duration_mins || 15}m · ${it.attempt_count || 0} tries`)
          );
        } else if (meta.kind === 'mock_tests') {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', it.title_en), el('div', 'cso-edu-title-or', it.title_or || it.slug));
          tr.append(
            td1,
            el('td', '', `${it.conducting_body || 'OPSC'} · ${it.test_series_name || 'Series'}`),
            el('td', '', `${(it.sections || []).length} sec · ${it.total_questions || 0} Qs / ${it.total_marks || 0}m`),
            el('td', '', `${it.access_tier} · ${it.attempt_count || 0} tries`)
          );
        } else if (meta.kind === 'answer_keys') {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', it.title_en), el('div', 'cso-edu-title-or', it.title_or || it.slug));
          const tdObj = el('td');
          if (it.objection_window_end) {
            const isOpen = it.objection_window_end >= new Date().toISOString().slice(0, 10);
            tdObj.appendChild(el('span', `cso-edu-badge ${isOpen ? 'cso-edu-badge--warn' : 'cso-edu-badge--draft'}`, `${isOpen ? 'Open until ' : 'Closed '}${it.objection_window_end}`));
          } else {
            tdObj.textContent = '—';
          }
          tr.append(
            td1,
            el('td', '', `${it.conducting_body || '—'} · ${it.exam_year || '—'}`),
            el('td', '', `${it.key_type} (${it.paper_set_code || 'Set A'})`),
            tdObj
          );
        } else {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', it.title_en), el('div', 'cso-edu-title-or', it.title_or || it.slug));
          tr.append(
            td1,
            el('td', '', it.collection_type),
            el('td', '', `${(it.items || []).length} steps`),
            el('td', '', it.offline_pack_ready ? 'PWA Ready' : 'Online')
          );
        }

        const tdSt = el('td');
        const stCls = it.status === 'published' ? 'pub' : it.status === 'scheduled' ? 'sched' : it.status === 'archived' ? 'arch' : 'draft';
        tdSt.appendChild(el('span', `cso-edu-badge cso-edu-badge--${stCls}`, it.status));
        tr.appendChild(tdSt);

        const tdAct = el('td', 'cso-edu-actions');
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
      const previewCard = el('div', 'cso-edu-preview-card');
      const refs = {};

      if (meta.kind === 'quizzes') {
        const titleEn = el('input', 'cso-edu-input cso-edu-input-full'); titleEn.value = item?.title_en || ''; refs.title_en = titleEn;
        const titleOr = el('input', 'cso-edu-input cso-edu-input-full'); titleOr.value = item?.title_or || ''; refs.title_or = titleOr;
        const subjIn = el('input', 'cso-edu-input cso-edu-input-full'); subjIn.value = item?.subject_name || 'Odisha General Studies'; refs.subject_name = subjIn;
        const topIn = el('input', 'cso-edu-input cso-edu-input-full'); topIn.value = item?.topic_name || ''; refs.topic_name = topIn;
        const examIn = el('input', 'cso-edu-input cso-edu-input-full'); examIn.value = item?.exam_tag || ''; refs.exam_tag = examIn;
        const durIn = el('input', 'cso-edu-input cso-edu-input-full'); durIn.type = 'number'; durIn.value = item?.duration_mins ?? 15; refs.duration_mins = durIn;
        const passIn = el('input', 'cso-edu-input cso-edu-input-full'); passIn.type = 'number'; passIn.value = item?.passing_score_pct ?? 40; refs.passing_score_pct = passIn;
        const mpqIn = el('input', 'cso-edu-input cso-edu-input-full'); mpqIn.type = 'number'; mpqIn.step = '0.25'; mpqIn.value = item?.marks_per_question ?? 1; refs.marks_per_question = mpqIn;
        const negIn = el('input', 'cso-edu-input cso-edu-input-full'); negIn.type = 'number'; negIn.step = '0.25'; negIn.value = item?.negative_marks ?? 0; refs.negative_marks = negIn;
        const shufChk = el('input'); shufChk.type = 'checkbox'; shufChk.checked = item ? Boolean(item.shuffle_questions) : true; refs.shuffle_questions = shufChk;
        const flashChk = el('input'); flashChk.type = 'checkbox'; flashChk.checked = item ? Boolean(item.flashcard_mode_enabled) : true; refs.flashcard_mode_enabled = flashChk;

        // Question Bank (12) Picker + Quick-Add Question
        const selectedQIds = new Set(Array.isArray(item?.question_ids) ? item.question_ids : []);
        const qbPickerBox = el('div', 'cso-edu-section');
        const qbSearch = el('input', 'cso-edu-input'); qbSearch.placeholder = 'Search Question Bank (12)...';
        const qbList = el('div');
        const selSummary = el('div', 'cso-edu-title-or');

        async function loadQbChoices(qStr) {
          try {
            const data = await api(`/api/admin/edu/questions?q=${encodeURIComponent(qStr || '')}`);
            qbList.replaceChildren();
            (data.items || []).slice(0, 12).forEach(qItem => {
              const lbl = el('label', 'cso-edu-tab');
              const chk = el('input'); chk.type = 'checkbox'; chk.checked = selectedQIds.has(qItem.id);
              chk.addEventListener('change', () => {
                if (chk.checked) selectedQIds.add(qItem.id);
                else selectedQIds.delete(qItem.id);
                updateQuizSummary();
              });
              lbl.append(chk, document.createTextNode(`${qItem.question_en.slice(0, 68)} [${qItem.difficulty}]`));
              qbList.appendChild(lbl);
            });
          } catch (e) {}
        }
        function updateQuizSummary() {
          const totalM = (selectedQIds.size * Number(mpqIn.value || 1)).toFixed(2);
          selSummary.textContent = `Selected: ${selectedQIds.size} question(s) · Total Marks: ${totalM}`;
        }
        qbSearch.addEventListener('input', () => loadQbChoices(qbSearch.value.trim()));
        mpqIn.addEventListener('input', updateQuizSummary);

        // Quick-Add Question inline creator
        const quickQ = el('input', 'cso-edu-input'); quickQ.placeholder = 'Quick-Add Question (EN)';
        const quickA = el('input', 'cso-edu-input'); quickA.placeholder = 'Option A';
        const quickB = el('input', 'cso-edu-input'); quickB.placeholder = 'Option B';
        const quickBtn = el('button', 'cso-edu-btn', '+ Quick-Add to Bank & Quiz'); quickBtn.type = 'button';
        quickBtn.addEventListener('click', async () => {
          if (!quickQ.value.trim()) { toast('Enter question text', 'error'); return; }
          try {
            const created = await api('/api/admin/edu/questions', {
              method: 'POST',
              body: JSON.stringify({
                subject_name: subjIn.value.trim() || 'Odisha General Studies',
                question_en: quickQ.value.trim(),
                options: { A_en: quickA.value.trim() || 'Option A', B_en: quickB.value.trim() || 'Option B', C_en: 'Option C', D_en: 'Option D' },
                correct_option: 'A',
                status: 'published'
              })
            });
            selectedQIds.add(created.item.id);
            quickQ.value = ''; quickA.value = ''; quickB.value = '';
            updateQuizSummary();
            loadQbChoices(qbSearch.value.trim());
            toast('Added question to Bank (12) & Quiz (13)', 'success');
          } catch (e) { toast(e.message, 'error'); }
        });

        qbPickerBox.append(
          el('div', 'cso-edu-label', 'Question Bank (12) Selector'),
          selSummary, qbSearch, qbList,
          el('div', 'cso-edu-label', 'Quick-Add Question'),
          quickQ, quickA, quickB, quickBtn
        );
        updateQuizSummary();
        loadQbChoices('');
        refs._getQIds = () => [...selectedQIds];

        body.append(
          buildField('Quiz Title (English) *', titleEn),
          buildField('Quiz Title (Odia)', titleOr),
          buildField('Subject Name', subjIn),
          buildField('Topic Name', topIn),
          buildField('Exam Tag', examIn),
          buildField('Duration (Mins)', durIn),
          buildField('Passing Score %', passIn),
          buildField('Marks per Question', mpqIn),
          buildField('Negative Marks', negIn),
          buildField('Shuffle Questions', shufChk),
          buildField('Flashcard Mode Enabled', flashChk),
          qbPickerBox
        );
      } else if (meta.kind === 'mock_tests') {
        const titleEn = el('input', 'cso-edu-input cso-edu-input-full'); titleEn.value = item?.title_en || ''; refs.title_en = titleEn;
        const titleOr = el('input', 'cso-edu-input cso-edu-input-full'); titleOr.value = item?.title_or || ''; refs.title_or = titleOr;
        const bodyIn = el('input', 'cso-edu-input cso-edu-input-full'); bodyIn.value = item?.conducting_body || 'OPSC'; refs.conducting_body = bodyIn;
        const seriesIn = el('input', 'cso-edu-input cso-edu-input-full'); seriesIn.value = item?.test_series_name || ''; refs.test_series_name = seriesIn;
        const durIn = el('input', 'cso-edu-input cso-edu-input-full'); durIn.type = 'number'; durIn.value = item?.total_duration_mins ?? 120; refs.total_duration_mins = durIn;
        const negRule = el('input', 'cso-edu-input cso-edu-input-full'); negRule.value = item?.negative_marking_rule || '0.25 per wrong answer'; refs.negative_marking_rule = negRule;
        const tierSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['free', 'registered', 'featured'].forEach(t => { const o = el('option', '', t); o.value = t; tierSel.appendChild(o); });
        tierSel.value = item?.access_tier || 'free'; refs.access_tier = tierSel;

        const sections = Array.isArray(item?.sections) ? item.sections.map(s => ({ ...s })) : [];
        const secBox = el('div', 'cso-edu-section');
        const secList = el('div');
        function renderSections() {
          secList.replaceChildren();
          sections.forEach((sec, idx) => {
            const box = el('div', 'cso-edu-preview-card');
            const sName = el('input', 'cso-edu-input'); sName.placeholder = 'Section Name (EN)'; sName.value = sec.section_name_en || '';
            sName.addEventListener('input', () => { sec.section_name_en = sName.value; });
            const sSubj = el('input', 'cso-edu-input'); sSubj.placeholder = 'Subject'; sSubj.value = sec.subject_name || '';
            sSubj.addEventListener('input', () => { sec.subject_name = sSubj.value; });
            const sMarks = el('input', 'cso-edu-input'); sMarks.type = 'number'; sMarks.step = '0.25'; sMarks.placeholder = 'Marks/Q'; sMarks.value = sec.marks_per_q ?? 2;
            sMarks.addEventListener('input', () => { sec.marks_per_q = Number(sMarks.value || 1); });
            const qCountLbl = el('span', 'cso-edu-badge cso-edu-badge--ok', `${(sec.question_ids_json || []).length} Qs`);

            const btnAuto = el('button', 'cso-edu-btn', 'Auto-Fill from Bank (12)'); btnAuto.type = 'button';
            btnAuto.addEventListener('click', async () => {
              try {
                const res = await api('/api/admin/edu/mock-tests/auto-fill', {
                  method: 'POST',
                  body: JSON.stringify({ subject_name: sec.subject_name || '', limit: 20 })
                });
                sec.question_ids_json = res.question_ids || [];
                renderSections();
                toast(`Auto-filled ${sec.question_ids_json.length} question(s)`, 'success');
              } catch (e) { toast(e.message, 'error'); }
            });
            const btnRm = el('button', 'cso-edu-btn cso-edu-btn--danger', 'Remove'); btnRm.type = 'button';
            btnRm.addEventListener('click', () => { sections.splice(idx, 1); renderSections(); });
            box.append(sName, sSubj, sMarks, qCountLbl, btnAuto, btnRm);
            secList.appendChild(box);
          });
        }
        renderSections();
        const addSecBtn = el('button', 'cso-edu-btn', '+ Add Exam Section'); addSecBtn.type = 'button';
        addSecBtn.addEventListener('click', () => {
          sections.push({ section_name_en: `Section ${sections.length + 1}`, subject_name: '', question_ids_json: [], marks_per_q: 2, negative_marks: 0.5, section_time_mins: 30 });
          renderSections();
        });
        secBox.append(el('div', 'cso-edu-label', 'Multi-Section Exam Builder'), secList, addSecBtn);
        refs._getSections = () => sections;

        body.append(
          buildField('Mock Test Title (English) *', titleEn),
          buildField('Mock Test Title (Odia)', titleOr),
          buildField('Conducting Body', bodyIn),
          buildField('Test Series Name', seriesIn),
          buildField('Total Duration (Mins)', durIn),
          buildField('Negative Marking Rule', negRule),
          buildField('Access Tier', tierSel),
          secBox
        );
      } else if (meta.kind === 'answer_keys') {
        const titleEn = el('input', 'cso-edu-input cso-edu-input-full'); titleEn.value = item?.title_en || ''; refs.title_en = titleEn;
        const titleOr = el('input', 'cso-edu-input cso-edu-input-full'); titleOr.value = item?.title_or || ''; refs.title_or = titleOr;
        const ktSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['official_provisional', 'official_final', 'model_expert', 'detailed_solutions'].forEach(k => { const o = el('option', '', k); o.value = k; ktSel.appendChild(o); });
        ktSel.value = item?.key_type || 'official_provisional'; refs.key_type = ktSel;
        const bodyIn = el('input', 'cso-edu-input cso-edu-input-full'); bodyIn.value = item?.conducting_body || 'OSSC'; refs.conducting_body = bodyIn;
        const yearIn = el('input', 'cso-edu-input cso-edu-input-full'); yearIn.type = 'number'; yearIn.value = item?.exam_year || 2025; refs.exam_year = yearIn;
        const setIn = el('input', 'cso-edu-input cso-edu-input-full'); setIn.value = item?.paper_set_code || 'Set A / B / C / D'; refs.paper_set_code = setIn;
        const objIn = el('input', 'cso-edu-input cso-edu-input-full'); objIn.type = 'date'; objIn.value = item?.objection_window_end || ''; refs.objection_window_end = objIn;
        const chgIn = el('input', 'cso-edu-input cso-edu-input-full'); chgIn.value = item?.challenge_url || ''; refs.challenge_url = chgIn;
        const fileIn = el('input', 'cso-edu-input cso-edu-input-full'); fileIn.value = item?.file_url || ''; refs.file_url = fileIn;
        const r2In = el('input', 'cso-edu-input cso-edu-input-full'); r2In.value = item?.r2_key || ''; refs.r2_key = r2In;

        const upIn = el('input', 'cso-edu-input'); upIn.type = 'file'; upIn.accept = '.pdf';
        upIn.addEventListener('change', async () => {
          if (!upIn.files[0]) return;
          const fd = new FormData(); fd.append('file', upIn.files[0]);
          try {
            const up = await api('/api/admin/edu/resources/upload', { method: 'POST', body: fd });
            r2In.value = up.r2_key || ''; fileIn.value = up.file_url || '';
            toast('Answer Key PDF uploaded to R2', 'success');
          } catch (e) { toast(e.message, 'error'); }
        });

        const mapRows = Array.isArray(item?.answer_mapping) ? item.answer_mapping.map(r => ({ ...r })) : [];
        const mapBox = el('div', 'cso-edu-section');
        const mapList = el('div');
        function renderMap() {
          mapList.replaceChildren();
          mapRows.forEach((row, idx) => {
            const rBox = el('div', 'cso-edu-preview-card');
            const qNo = el('input', 'cso-edu-input'); qNo.type = 'number'; qNo.placeholder = 'Q#'; qNo.value = row.q_no ?? idx + 1;
            qNo.addEventListener('input', () => { row.q_no = Number(qNo.value || 1); });
            const sa = el('input', 'cso-edu-input'); sa.placeholder = 'Set A'; sa.value = row.set_a || ''; sa.addEventListener('input', () => { row.set_a = sa.value; });
            const sb = el('input', 'cso-edu-input'); sb.placeholder = 'Set B'; sb.value = row.set_b || ''; sb.addEventListener('input', () => { row.set_b = sb.value; });
            const sc = el('input', 'cso-edu-input'); sc.placeholder = 'Set C'; sc.value = row.set_c || ''; sc.addEventListener('input', () => { row.set_c = sc.value; });
            const sd = el('input', 'cso-edu-input'); sd.placeholder = 'Set D'; sd.value = row.set_d || ''; sd.addEventListener('input', () => { row.set_d = sd.value; });
            const exp = el('input', 'cso-edu-input cso-edu-input-full'); exp.placeholder = 'Explanation (EN)'; exp.value = row.explanation_en || '';
            exp.addEventListener('input', () => { row.explanation_en = exp.value; });
            const rm = el('button', 'cso-edu-btn cso-edu-btn--danger', '×'); rm.type = 'button';
            rm.addEventListener('click', () => { mapRows.splice(idx, 1); renderMap(); });
            rBox.append(qNo, sa, sb, sc, sd, exp, rm);
            mapList.appendChild(rBox);
          });
        }
        renderMap();
        const addMapBtn = el('button', 'cso-edu-btn', '+ Add Q# Set A/B/C/D Row'); addMapBtn.type = 'button';
        addMapBtn.addEventListener('click', () => { mapRows.push({ q_no: mapRows.length + 1, set_a: 'A', set_b: 'B', set_c: 'C', set_d: 'D', explanation_en: '' }); renderMap(); });
        mapBox.append(el('div', 'cso-edu-label', 'Set A/B/C/D Answer Key Grid'), mapList, addMapBtn);
        refs._getMapping = () => mapRows;

        body.append(
          buildField('Title (English) *', titleEn),
          buildField('Title (Odia)', titleOr),
          buildField('Key Type', ktSel),
          buildField('Conducting Body', bodyIn),
          buildField('Exam Year', yearIn),
          buildField('Paper Set Code', setIn),
          buildField('Objection Window End', objIn),
          buildField('Official Challenge URL', chgIn),
          buildField('PDF File URL', fileIn),
          buildField('Upload PDF to R2', upIn),
          mapBox
        );
      } else {
        const titleEn = el('input', 'cso-edu-input cso-edu-input-full'); titleEn.value = item?.title_en || ''; refs.title_en = titleEn;
        const titleOr = el('input', 'cso-edu-input cso-edu-input-full'); titleOr.value = item?.title_or || ''; refs.title_or = titleOr;
        const ctSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['exam_starter_pack', 'subject_roadmap', 'crash_course_bundle', 'class_bundle'].forEach(c => { const o = el('option', '', c); o.value = c; ctSel.appendChild(o); });
        ctSel.value = item?.collection_type || 'exam_starter_pack'; refs.collection_type = ctSel;
        const sumEn = el('textarea', 'cso-edu-textarea cso-edu-textarea-full'); sumEn.value = item?.summary_en || ''; refs.summary_en = sumEn;
        const offChk = el('input'); offChk.type = 'checkbox'; offChk.checked = Boolean(item?.offline_pack_ready); refs.offline_pack_ready = offChk;

        const pathItems = Array.isArray(item?.items) ? item.items.map(x => ({ ...x })) : [];
        const pathBox = el('div', 'cso-edu-section');
        const pathList = el('div');
        function renderPath() {
          pathList.replaceChildren();
          pathItems.forEach((step, idx) => {
            step.step_order = idx + 1;
            const row = el('div', 'cso-edu-preview-card');
            row.appendChild(el('strong', '', `Step ${idx + 1} [Mod ${step.module_code}]: ${step.title_en}`));
            const up = el('button', 'cso-edu-btn', '↑'); up.type = 'button';
            up.addEventListener('click', () => { if (idx > 0) { [pathItems[idx - 1], pathItems[idx]] = [pathItems[idx], pathItems[idx - 1]]; renderPath(); } });
            const dn = el('button', 'cso-edu-btn', '↓'); dn.type = 'button';
            dn.addEventListener('click', () => { if (idx < pathItems.length - 1) { [pathItems[idx + 1], pathItems[idx]] = [pathItems[idx], pathItems[idx + 1]]; renderPath(); } });
            const rm = el('button', 'cso-edu-btn cso-edu-btn--danger', '×'); rm.type = 'button';
            rm.addEventListener('click', () => { pathItems.splice(idx, 1); renderPath(); });
            row.append(up, dn, rm);
            pathList.appendChild(row);
          });
        }
        renderPath();

        const searchIn = el('input', 'cso-edu-input'); searchIn.placeholder = 'Search Notes (03), Syllabi (10), PYQs (11), Quizzes (13), Mocks (14)...';
        const searchResults = el('div');
        searchIn.addEventListener('input', async () => {
          try {
            const res = await api(`/api/admin/edu/collections/search-items?q=${encodeURIComponent(searchIn.value.trim())}`);
            searchResults.replaceChildren();
            (res.items || []).slice(0, 8).forEach(cand => {
              const b = el('button', 'cso-edu-btn', `+ [Mod ${cand.module_code}] ${cand.title_en}`); b.type = 'button';
              b.addEventListener('click', () => {
                pathItems.push({ ...cand, step_order: pathItems.length + 1, is_required: true });
                renderPath();
              });
              searchResults.appendChild(b);
            });
          } catch (e) {}
        });

        pathBox.append(el('div', 'cso-edu-label', 'Study Pathway Composer'), pathList, searchIn, searchResults);
        refs._getPathItems = () => pathItems;

        body.append(
          buildField('Collection Title (English) *', titleEn),
          buildField('Collection Title (Odia)', titleOr),
          buildField('Collection Type', ctSel),
          buildField('Summary (English)', sumEn),
          buildField('Offline PWA Pack Ready', offChk),
          pathBox
        );
      }

      const statusSel = el('select', 'cso-edu-select cso-edu-select-full');
      ['draft', 'published', 'scheduled', 'archived'].forEach(s => { const o = el('option', '', s); o.value = s; statusSel.appendChild(o); });
      statusSel.value = item?.status || 'published'; refs.status = statusSel;
      const tagsIn = el('input', 'cso-edu-input cso-edu-input-full'); tagsIn.value = (item?.tags || []).join(', '); refs.tags = tagsIn;
      const featChk = el('input'); featChk.type = 'checkbox'; featChk.checked = Boolean(item?.featured); refs.featured = featChk;
      body.append(buildField('Tags (comma-separated)', tagsIn), buildField('Status', statusSel), buildField('Featured', featChk));

      if (meta.kind === 'answer_keys') {
        const btnCheck = el('button', 'cso-edu-btn', 'Check Links'); btnCheck.type = 'button';
        btnCheck.addEventListener('click', async () => {
          const urls = [refs.challenge_url?.value, refs.file_url?.value].filter(Boolean);
          if (!urls.length) { toast('No URLs to check', 'info'); return; }
          try {
            const res = await api('/api/admin/utils/check-links', { method: 'POST', body: JSON.stringify({ urls }) });
            const bad = (res.results || []).filter(r => !r.ok);
            toast(bad.length ? `${bad.length} broken link(s)` : 'All links reachable', bad.length ? 'error' : 'success');
          } catch (e) { toast(e.message, 'error'); }
        });
        body.appendChild(btnCheck);
      }

      previewCard.textContent = `Live Student & WhatsApp Preview: ${refs.title_en.value || 'New Entry'} [${statusSel.value}]`;
      body.appendChild(previewCard);

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
          const payload = {
            status: refs.status.value,
            featured: refs.featured.checked,
            tags: refs.tags.value.split(',').map(s => s.trim()).filter(Boolean)
          };
          if (meta.kind === 'quizzes') {
            Object.assign(payload, {
              title_en: refs.title_en.value.trim(),
              title_or: refs.title_or.value.trim(),
              subject_name: refs.subject_name.value.trim(),
              topic_name: refs.topic_name.value.trim(),
              exam_tag: refs.exam_tag.value.trim(),
              duration_mins: Number(refs.duration_mins.value || 15),
              passing_score_pct: Number(refs.passing_score_pct.value || 40),
              marks_per_question: Number(refs.marks_per_question.value || 1),
              negative_marks: Number(refs.negative_marks.value || 0),
              shuffle_questions: refs.shuffle_questions.checked,
              flashcard_mode_enabled: refs.flashcard_mode_enabled.checked,
              question_ids: refs._getQIds()
            });
          } else if (meta.kind === 'mock_tests') {
            Object.assign(payload, {
              title_en: refs.title_en.value.trim(),
              title_or: refs.title_or.value.trim(),
              conducting_body: refs.conducting_body.value.trim(),
              test_series_name: refs.test_series_name.value.trim(),
              total_duration_mins: Number(refs.total_duration_mins.value || 120),
              negative_marking_rule: refs.negative_marking_rule.value.trim(),
              access_tier: refs.access_tier.value,
              sections: refs._getSections()
            });
          } else if (meta.kind === 'answer_keys') {
            Object.assign(payload, {
              title_en: refs.title_en.value.trim(),
              title_or: refs.title_or.value.trim(),
              key_type: refs.key_type.value,
              conducting_body: refs.conducting_body.value.trim(),
              exam_year: Number(refs.exam_year.value || 2025),
              paper_set_code: refs.paper_set_code.value.trim(),
              objection_window_end: refs.objection_window_end.value,
              challenge_url: refs.challenge_url.value.trim(),
              file_url: refs.file_url.value.trim(),
              r2_key: refs.r2_key.value.trim(),
              answer_mapping: refs._getMapping()
            });
          } else {
            Object.assign(payload, {
              title_en: refs.title_en.value.trim(),
              title_or: refs.title_or.value.trim(),
              collection_type: refs.collection_type.value,
              summary_en: refs.summary_en.value.trim(),
              offline_pack_ready: refs.offline_pack_ready.checked,
              items: refs._getPathItems()
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

  window.CSOEduBatch4 = { render, MODULE_META };
})();
