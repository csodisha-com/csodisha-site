/* Educational Resources Batch 6 (21-22) Content Command Workspace — Strict CSP */
(() => {
  'use strict';

  const MODULE_META = {
    'module-05-021': { num: '21', endpoint: '/api/admin/edu/student-dashboard', kind: 'student_dashboard', title: 'Student Dashboard' },
    'module-05-022': { num: '22', endpoint: '/api/admin/edu/tools', kind: 'tools', title: 'Educational Tools' }
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
      filterB: '',
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

      if (meta.kind === 'student_dashboard') {
        const btnSim = el('button', 'cso-edu-btn', 'Preview Student Hub');
        btnSim.type = 'button';
        btnSim.addEventListener('click', openDashboardSimulator);
        actions.appendChild(btnSim);
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

    if (meta.kind === 'student_dashboard') {
      const selA = el('select', 'cso-edu-select');
      [['', 'All Widget Types'], ['pinned_announcement', 'Pinned Announcement'], ['todays_update_digest', "Today's Digest"], ['recommended_track', 'Recommended Track'], ['exam_countdown_banner', 'Exam Countdown'], ['quick_action_card', 'Quick Action'], ['mentor_tip', 'Mentor Tip']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; selA.appendChild(o);
      });
      selA.addEventListener('change', () => { state.filterA = selA.value; loadItems(); });

      const selB = el('select', 'cso-edu-select');
      [['', 'All Stages'], ['All Students', 'All Students'], ['School 6-10', 'School 6-10'], ['Higher Secondary +2', 'Higher Secondary +2'], ['UG / PG', 'UG / PG'], ['OPSC / OSSC / OSSSC', 'OPSC / OSSC / OSSSC'], ['Teaching / UGC NET', 'Teaching / UGC NET']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; selB.appendChild(o);
      });
      selB.addEventListener('change', () => { state.filterB = selB.value; loadItems(); });
      filtersWrap.append(selA, selB);
    } else {
      const selA = el('select', 'cso-edu-select');
      [['', 'All Tool Types'], ['age_eligibility_calculator', 'Age Eligibility Calc'], ['cgpa_percentage_converter', 'CGPA Converter'], ['negative_marking_score_calc', 'Negative Marking Calc'], ['study_timetable_generator', 'Study Timetable'], ['exam_countdown_tracker', 'Countdown Tracker'], ['syllabus_progress_tracker', 'Syllabus Tracker']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; selA.appendChild(o);
      });
      selA.addEventListener('change', () => { state.filterA = selA.value; loadItems(); });
      filtersWrap.appendChild(selA);
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
          if (meta.kind === 'student_dashboard') params.set('widget_type', state.filterA);
          else params.set('tool_type', state.filterA);
        }
        if (state.filterB && meta.kind === 'student_dashboard') params.set('target_stage', state.filterB);
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
      const s22 = (state.overview && state.overview.suite_22) || {};
      const b6 = (state.overview && state.overview.batch6) || {};
      const totals = s22.totals || {};
      const cards = [
        ['22-Module Total Items', `${totals.total_items ?? '—'} (${totals.published ?? 0} pub)`],
        ['Bilingual Parity', `${s22.bilingual_parity_pct ?? 100}%`],
        ['21 · Dashboard Widgets', b6.widgets ?? '—'],
        ['22 · Active Tools', `${b6.tools ?? '—'} (${b6.tool_usage ?? 0} uses)`]
      ];
      cards.forEach(([label, val]) => {
        const card = el('div', 'cso-edu-kpi');
        card.append(el('div', 'cso-edu-kpi-lbl', label), el('div', 'cso-edu-kpi-val', val));
        kpiGrid.appendChild(card);
      });
    }

    function renderTabs() {
      tabsWrap.replaceChildren();
      const tabs = meta.kind === 'tools'
        ? [['all', 'All'], ['published', 'Published'], ['draft', 'Draft'], ['archived', 'Archived']]
        : [['all', 'All'], ['published', 'Published'], ['draft', 'Draft'], ['scheduled', 'Scheduled'], ['archived', 'Archived']];
      tabs.forEach(([k, label]) => {
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

      const cols = meta.kind === 'student_dashboard'
        ? ['Widget Title', 'Type & Stage', 'Priority / Pinned', 'Linked Module', 'Status', 'Actions']
        : ['Tool Title', 'Tool Type', 'Order & Usage', 'Featured', 'Status', 'Actions'];

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

        if (meta.kind === 'student_dashboard') {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', it.title_en), el('div', 'cso-edu-title-or', it.title_or || it.slug));
          tr.append(
            td1,
            el('td', '', `${it.widget_type} · ${it.target_stage}`),
            el('td', '', `#${it.priority_order} · ${it.pinned ? 'Pinned' : 'Normal'}`),
            el('td', '', it.linked_module_code ? `Mod ${it.linked_module_code}` : '—')
          );
        } else {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', it.title_en), el('div', 'cso-edu-title-or', it.title_or || it.slug));
          tr.append(
            td1,
            el('td', '', it.tool_type),
            el('td', '', `#${it.sort_order} · ${it.usage_count || 0} uses`),
            el('td', '', it.featured ? 'Featured' : 'Standard')
          );
        }

        const tdSt = el('td');
        const stCls = it.status === 'published' ? 'pub' : it.status === 'scheduled' ? 'sched' : it.status === 'archived' ? 'arch' : 'draft';
        tdSt.appendChild(el('span', `cso-edu-badge cso-edu-badge--${stCls}`, it.status));
        tr.appendChild(tdSt);

        const tdAct = el('td', 'cso-edu-actions');
        const btnEdit = el('button', 'cso-edu-btn', 'Edit'); btnEdit.type = 'button';
        btnEdit.addEventListener('click', () => openEditor(it.id));
        tdAct.appendChild(btnEdit);

        if (meta.kind === 'tools') {
          const btnTest = el('button', 'cso-edu-btn', 'Test Tool'); btnTest.type = 'button';
          btnTest.addEventListener('click', () => openToolTesterModal(it));
          tdAct.appendChild(btnTest);
        }

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
        tdAct.append(btnClone, btnDel);
        tr.appendChild(tdAct);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      tableWrap.appendChild(tbl);
    }

    async function openDashboardSimulator() {
      const backdrop = el('div', 'cso-edu-drawer-backdrop');
      const drawer = el('div', 'cso-edu-drawer');
      const head = el('div', 'cso-edu-drawer-head');
      head.appendChild(el('h3', '', 'Live Student Dashboard Simulator (/api/edu/student-hub)'));
      const closeBtn = el('button', 'cso-edu-btn', 'Close'); closeBtn.type = 'button';
      closeBtn.addEventListener('click', () => backdrop.remove());
      head.appendChild(closeBtn);

      const body = el('div', 'cso-edu-drawer-body');
      try {
        const hub = await api('/api/edu/student-hub');
        body.appendChild(el('div', 'cso-edu-label', `Pinned & Active Widgets (${(hub.widgets || []).length})`));
        (hub.widgets || []).forEach(w => {
          const card = el('div', 'cso-edu-preview-card');
          card.append(
            el('strong', '', `[${w.widget_type}] ${w.title_en}`),
            el('div', 'cso-edu-title-or', `${w.target_stage}${w.countdown_target_date ? ' · Target: ' + w.countdown_target_date : ''}`),
            el('div', '', w.body_en)
          );
          body.appendChild(card);
        });
        body.appendChild(el('div', 'cso-edu-label', `Today's Odisha Updates Digest (${(hub.todays_updates || []).length})`));
        (hub.todays_updates || []).forEach(u => {
          const row = el('div', 'cso-edu-preview-card');
          row.textContent = `[Mod ${u.module_code} · ${u.kind}] ${u.title_en}`;
          body.appendChild(row);
        });
      } catch (e) {
        body.appendChild(el('div', 'cso-edu-empty', `Preview failed: ${e.message}`));
      }

      drawer.append(head, body);
      backdrop.appendChild(drawer);
      document.body.appendChild(backdrop);
    }

    function openToolTesterModal(tool) {
      const backdrop = el('div', 'cso-edu-drawer-backdrop');
      const drawer = el('div', 'cso-edu-drawer');
      const head = el('div', 'cso-edu-drawer-head');
      head.appendChild(el('h3', '', `Live Tool Tester: ${tool.title_en}`));
      const closeBtn = el('button', 'cso-edu-btn', 'Close'); closeBtn.type = 'button';
      closeBtn.addEventListener('click', () => backdrop.remove());
      head.appendChild(closeBtn);

      const body = el('div', 'cso-edu-drawer-body');
      const outBox = el('div', 'cso-edu-preview-card', 'Enter test inputs below and click Run Calculation.');
      const cfg = tool.config || {};

      if (tool.tool_type === 'age_eligibility_calculator') {
        const dobIn = el('input', 'cso-edu-input'); dobIn.type = 'date'; dobIn.value = '1998-06-15';
        const catSel = el('select', 'cso-edu-select');
        Object.keys(cfg.relaxations || { UR: 0, SEBC: 5, SC: 5, ST: 5, Women: 5, PwD: 10 }).forEach(c => {
          const o = el('option', '', c); o.value = c; catSel.appendChild(o);
        });
        const runBtn = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Check Eligibility'); runBtn.type = 'button';
        runBtn.addEventListener('click', () => {
          const cutoff = new Date(cfg.default_cutoff_date || '2026-01-01');
          const dob = new Date(dobIn.value);
          const age = Math.floor((cutoff - dob) / (365.25 * 86400000));
          const relax = Number((cfg.relaxations && cfg.relaxations[catSel.value]) || 0);
          const maxAllowed = Number(cfg.max_age_ur || 38) + relax;
          const ok = age >= Number(cfg.min_age || 21) && age <= maxAllowed;
          outBox.textContent = `Age on ${cfg.default_cutoff_date || '2026-01-01'}: ${age} yrs | Max Allowed (${catSel.value}): ${maxAllowed} yrs -> ${ok ? 'ELIGIBLE' : 'NOT ELIGIBLE'}`;
        });
        body.append(buildField('Date of Birth', dobIn), buildField('Category', catSel), runBtn, outBox);
      } else if (tool.tool_type === 'cgpa_percentage_converter') {
        const cgpaIn = el('input', 'cso-edu-input'); cgpaIn.type = 'number'; cgpaIn.step = '0.01'; cgpaIn.value = '8.4';
        const runBtn = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Convert CGPA'); runBtn.type = 'button';
        runBtn.addEventListener('click', () => {
          const v = Number(cgpaIn.value || 0);
          const ugc = ((v - 0.5) * 10).toFixed(2);
          const cbse = (v * 9.5).toFixed(2);
          outBox.textContent = `UGC / Odisha Univ ((CGPA - 0.5) × 10): ${ugc}% | CBSE (CGPA × 9.5): ${cbse}%`;
        });
        body.append(buildField('CGPA (0-10)', cgpaIn), runBtn, outBox);
      } else if (tool.tool_type === 'negative_marking_score_calc') {
        const cIn = el('input', 'cso-edu-input'); cIn.type = 'number'; cIn.value = '65';
        const wIn = el('input', 'cso-edu-input'); wIn.type = 'number'; wIn.value = '15';
        const mpqIn = el('input', 'cso-edu-input'); mpqIn.type = 'number'; mpqIn.step = '0.25'; mpqIn.value = '2';
        const negIn = el('input', 'cso-edu-input'); negIn.type = 'number'; negIn.step = '0.01'; negIn.value = '0.66';
        const runBtn = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Calculate Net Score'); runBtn.type = 'button';
        runBtn.addEventListener('click', () => {
          const net = (Number(cIn.value) * Number(mpqIn.value)) - (Number(wIn.value) * Number(negIn.value));
          outBox.textContent = `Net Score: ${net.toFixed(2)} (Correct: +${(Number(cIn.value) * Number(mpqIn.value)).toFixed(2)}, Penalty: -${(Number(wIn.value) * Number(negIn.value)).toFixed(2)})`;
        });
        body.append(buildField('Correct Answers', cIn), buildField('Wrong Answers', wIn), buildField('Marks/Q', mpqIn), buildField('Negative/Wrong', negIn), runBtn, outBox);
      } else {
        const hrsIn = el('input', 'cso-edu-input'); hrsIn.type = 'number'; hrsIn.value = String(cfg.default_hours_per_day || 6);
        const runBtn = el('button', 'cso-edu-btn cso-edu-btn--primary', 'Generate Timetable'); runBtn.type = 'button';
        runBtn.addEventListener('click', () => {
          const hrs = Number(hrsIn.value || 6);
          const split = cfg.recommended_split || [{ block: 'Core Study', pct: 50 }, { block: 'Practice & Revision', pct: 50 }];
          outBox.textContent = split.map(s => `${s.block}: ${((hrs * s.pct) / 100).toFixed(1)}h`).join(' | ');
        });
        body.append(buildField('Daily Study Hours', hrsIn), runBtn, outBox);
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

      if (meta.kind === 'student_dashboard') {
        const titleEn = el('input', 'cso-edu-input cso-edu-input-full'); titleEn.value = item?.title_en || ''; refs.title_en = titleEn;
        const titleOr = el('input', 'cso-edu-input cso-edu-input-full'); titleOr.value = item?.title_or || ''; refs.title_or = titleOr;
        const wtSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['pinned_announcement', 'todays_update_digest', 'recommended_track', 'exam_countdown_banner', 'quick_action_card', 'mentor_tip'].forEach(w => { const o = el('option', '', w); o.value = w; wtSel.appendChild(o); });
        wtSel.value = item?.widget_type || 'pinned_announcement'; refs.widget_type = wtSel;
        const stgSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['All Students', 'School 6-10', 'Higher Secondary +2', 'UG / PG', 'OPSC / OSSC / OSSSC', 'Teaching / UGC NET'].forEach(s => { const o = el('option', '', s); o.value = s; stgSel.appendChild(o); });
        stgSel.value = item?.target_stage || 'All Students'; refs.target_stage = stgSel;
        const bodyEn = el('textarea', 'cso-edu-textarea cso-edu-textarea-full'); bodyEn.value = item?.body_en || ''; refs.body_en = bodyEn;
        const bodyOr = el('textarea', 'cso-edu-textarea cso-edu-textarea-full'); bodyOr.value = item?.body_or || ''; refs.body_or = bodyOr;
        const ctaLbl = el('input', 'cso-edu-input cso-edu-input-full'); ctaLbl.value = item?.cta_label_en || 'Open'; refs.cta_label_en = ctaLbl;
        const ctaUrl = el('input', 'cso-edu-input cso-edu-input-full'); ctaUrl.value = item?.cta_url || '/study-library/'; refs.cta_url = ctaUrl;
        const modIn = el('input', 'cso-edu-input cso-edu-input-full'); modIn.value = item?.linked_module_code || ''; refs.linked_module_code = modIn;
        const itemIn = el('input', 'cso-edu-input cso-edu-input-full'); itemIn.value = item?.linked_item_id || ''; refs.linked_item_id = itemIn;
        const cdIn = el('input', 'cso-edu-input cso-edu-input-full'); cdIn.type = 'date'; cdIn.value = item?.countdown_target_date || ''; refs.countdown_target_date = cdIn;
        const prioIn = el('input', 'cso-edu-input cso-edu-input-full'); prioIn.type = 'number'; prioIn.value = item?.priority_order ?? 10; refs.priority_order = prioIn;
        const pinChk = el('input'); pinChk.type = 'checkbox'; pinChk.checked = Boolean(item?.pinned); refs.pinned = pinChk;

        body.append(
          buildField('Title (English) *', titleEn),
          buildField('Title (Odia)', titleOr),
          buildField('Widget Type', wtSel),
          buildField('Target Stage', stgSel),
          buildField('Body (English)', bodyEn),
          buildField('Body (Odia)', bodyOr),
          buildField('CTA Label (EN)', ctaLbl),
          buildField('CTA URL', ctaUrl),
          buildField('Linked Module Code (01-20)', modIn),
          buildField('Linked Item ID', itemIn),
          buildField('Countdown Target Date', cdIn),
          buildField('Priority Order', prioIn),
          buildField('Pinned to Top', pinChk)
        );
      } else {
        const titleEn = el('input', 'cso-edu-input cso-edu-input-full'); titleEn.value = item?.title_en || ''; refs.title_en = titleEn;
        const titleOr = el('input', 'cso-edu-input cso-edu-input-full'); titleOr.value = item?.title_or || ''; refs.title_or = titleOr;
        const ttSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['age_eligibility_calculator', 'cgpa_percentage_converter', 'negative_marking_score_calc', 'study_timetable_generator', 'exam_countdown_tracker', 'syllabus_progress_tracker'].forEach(t => { const o = el('option', '', t); o.value = t; ttSel.appendChild(o); });
        ttSel.value = item?.tool_type || 'age_eligibility_calculator'; refs.tool_type = ttSel;
        const sumEn = el('textarea', 'cso-edu-textarea cso-edu-textarea-full'); sumEn.value = item?.summary_en || ''; refs.summary_en = sumEn;
        const cfgIn = el('textarea', 'cso-edu-textarea cso-edu-textarea-full'); cfgIn.value = JSON.stringify(item?.config || {}, null, 2); refs.config = cfgIn;
        const urlIn = el('input', 'cso-edu-input cso-edu-input-full'); urlIn.value = item?.tool_url || '/student/#tools'; refs.tool_url = urlIn;
        const sortIn = el('input', 'cso-edu-input cso-edu-input-full'); sortIn.type = 'number'; sortIn.value = item?.sort_order ?? 10; refs.sort_order = sortIn;
        const featChk = el('input'); featChk.type = 'checkbox'; featChk.checked = Boolean(item?.featured); refs.featured = featChk;

        body.append(
          buildField('Tool Title (English) *', titleEn),
          buildField('Tool Title (Odia)', titleOr),
          buildField('Tool Type', ttSel),
          buildField('Summary (English)', sumEn),
          buildField('Rule Configuration (JSON)', cfgIn),
          buildField('Tool URL', urlIn),
          buildField('Sort Order', sortIn),
          buildField('Featured', featChk)
        );
      }

      const statusSel = el('select', 'cso-edu-select cso-edu-select-full');
      const stOpts = meta.kind === 'tools' ? ['draft', 'published', 'archived'] : ['draft', 'published', 'scheduled', 'archived'];
      stOpts.forEach(s => { const o = el('option', '', s); o.value = s; statusSel.appendChild(o); });
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
          if (meta.kind === 'student_dashboard') {
            Object.assign(payload, {
              title_en: refs.title_en.value.trim(),
              title_or: refs.title_or.value.trim(),
              widget_type: refs.widget_type.value,
              target_stage: refs.target_stage.value,
              body_en: refs.body_en.value.trim(),
              body_or: refs.body_or.value.trim(),
              cta_label_en: refs.cta_label_en.value.trim(),
              cta_url: refs.cta_url.value.trim(),
              linked_module_code: refs.linked_module_code.value.trim(),
              linked_item_id: refs.linked_item_id.value.trim(),
              countdown_target_date: refs.countdown_target_date.value,
              priority_order: Number(refs.priority_order.value || 10),
              pinned: refs.pinned.checked
            });
          } else {
            Object.assign(payload, {
              title_en: refs.title_en.value.trim(),
              title_or: refs.title_or.value.trim(),
              tool_type: refs.tool_type.value,
              summary_en: refs.summary_en.value.trim(),
              config: JSON.parse(refs.config.value || '{}'),
              tool_url: refs.tool_url.value.trim(),
              sort_order: Number(refs.sort_order.value || 10),
              featured: refs.featured.checked
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

  window.CSOEduBatch6 = { render, MODULE_META };
})();
