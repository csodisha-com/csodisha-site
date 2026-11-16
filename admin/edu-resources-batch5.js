/* Educational Resources Batch 5 (17-20) Content Command Workspace — Strict CSP */
(() => {
  'use strict';

  const MODULE_META = {
    'module-05-017': { num: '17', endpoint: '/api/admin/edu/access-rules', kind: 'access_rules', title: 'Downloads & Access Rules' },
    'module-05-018': { num: '18', endpoint: '/api/admin/edu/schemes', kind: 'schemes', title: 'Government Schemes' },
    'module-05-019': { num: '19', endpoint: '/api/admin/edu/scholarships', kind: 'scholarships', title: 'Scholarships' },
    'module-05-020': { num: '20', endpoint: '/api/admin/edu/careers', kind: 'careers', title: 'Career Explorer' }
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
      if (meta.kind === 'schemes') {
        actions.appendChild(el('span', 'cso-edu-badge cso-edu-badge--ok', 'Synced with /schemes/'));
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

    if (meta.kind === 'access_rules') {
      const sel = el('select', 'cso-edu-select');
      [['', 'All Scopes'], ['all_resources', 'All Resources'], ['notes_pdf', 'Notes PDF'], ['book_reference', 'Books'], ['pyq_paper', 'PYQs'], ['mock_test', 'Mock Tests'], ['collection', 'Collections']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; sel.appendChild(o);
      });
      sel.addEventListener('change', () => { state.filterA = sel.value; loadItems(); });
      filtersWrap.appendChild(sel);
    } else if (meta.kind === 'scholarships') {
      const selA = el('select', 'cso-edu-select');
      [['', 'All Providers'], ['Odisha State Govt', 'Odisha State Govt'], ['Central Govt / NSP', 'Central Govt / NSP'], ['UGC / AICTE / CSIR', 'UGC / AICTE / CSIR'], ['Private / CSR Foundation', 'Private / CSR']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; selA.appendChild(o);
      });
      selA.addEventListener('change', () => { state.filterA = selA.value; loadItems(); });

      const selB = el('select', 'cso-edu-select');
      [['', 'All Categories'], ['All', 'All'], ['SC/ST', 'SC/ST'], ['OBC/SEBC', 'OBC/SEBC'], ['Minority', 'Minority'], ['EWS', 'EWS'], ['Girls/Women', 'Girls/Women'], ['PwD', 'PwD']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; selB.appendChild(o);
      });
      selB.addEventListener('change', () => { state.filterB = selB.value; loadItems(); });
      filtersWrap.append(selA, selB);
    } else if (meta.kind === 'careers') {
      const selA = el('select', 'cso-edu-select');
      [['', 'All Entry Stages'], ['After Class 10', 'After Class 10'], ['After +2 Science', 'After +2 Science'], ['After +2 Arts', 'After +2 Arts'], ['After +2 Commerce', 'After +2 Commerce'], ['After Graduation', 'After Graduation'], ['After Post-Graduation', 'After Post-Graduation']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; selA.appendChild(o);
      });
      selA.addEventListener('change', () => { state.filterA = selA.value; loadItems(); });

      const selB = el('select', 'cso-edu-select');
      [['', 'All Domains'], ['Civil Services & Admin', 'Civil Services & Admin'], ['Teaching & Academia', 'Teaching & Academia'], ['Engineering & IT', 'Engineering & IT'], ['Medical & Allied Health', 'Medical & Allied Health'], ['Banking & Finance', 'Banking & Finance'], ['Defence & Police', 'Defence & Police'], ['Skill & Entrepreneurship', 'Skill & Entrepreneurship']].forEach(([v, l]) => {
        const o = el('option', '', l); o.value = v; selB.appendChild(o);
      });
      selB.addEventListener('change', () => { state.filterB = selB.value; loadItems(); });
      filtersWrap.append(selA, selB);
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
          if (meta.kind === 'access_rules') params.set('target_scope', state.filterA);
          else if (meta.kind === 'scholarships') params.set('provider_type', state.filterA);
          else if (meta.kind === 'careers') params.set('entry_stage', state.filterA);
        }
        if (state.filterB) {
          if (meta.kind === 'scholarships') params.set('category_eligibility', state.filterB);
          else if (meta.kind === 'careers') params.set('career_domain', state.filterB);
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
      const b5 = (state.overview && state.overview.batch5) || {};
      const cards = [
        ['17 · Access Rules', b5.access_rules ?? '—'],
        ['18 · Synced Schemes', b5.schemes ?? '—'],
        ['19 · Scholarships', b5.scholarships ?? '—'],
        ['20 · Career Roadmaps', b5.careers ?? '—']
      ];
      cards.forEach(([label, val]) => {
        const card = el('div', 'cso-edu-kpi');
        card.append(el('div', 'cso-edu-kpi-lbl', label), el('div', 'cso-edu-kpi-val', val));
        kpiGrid.appendChild(card);
      });
    }

    function renderTabs() {
      tabsWrap.replaceChildren();
      const tabs = meta.kind === 'access_rules'
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

      const cols = meta.kind === 'access_rules'
        ? ['Rule Name', 'Scope & Policy', 'Daily Limit', 'Watermark / Offline', 'Status', 'Actions']
        : meta.kind === 'schemes'
          ? ['Scheme Title', 'Sponsor & Dept', 'Benefit & Group', 'Deadline', 'Status', 'Actions']
          : meta.kind === 'scholarships'
            ? ['Scholarship Title', 'Provider & Category', 'Award & Income Cap', 'Deadline', 'Status', 'Actions']
            : ['Career Roadmap', 'Entry Stage & Domain', 'Steps & Salary', 'Recommended Exams', 'Status', 'Actions'];

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

        if (meta.kind === 'access_rules') {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', it.rule_name_en), el('div', 'cso-edu-title-or', it.rule_name_or || it.slug));
          tr.append(
            td1,
            el('td', '', `${it.target_scope} · ${it.access_policy}`),
            el('td', '', it.daily_download_limit > 0 ? `${it.daily_download_limit}/day` : 'Unlimited'),
            el('td', '', `${it.watermark_footer_enabled ? 'Watermark' : 'No WM'} · ${it.offline_cache_allowed ? 'Offline OK' : 'Online Only'}`)
          );
        } else if (meta.kind === 'schemes') {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', it.title_en || it.title), el('div', 'cso-edu-title-or', it.title_or || it.slug));
          tr.append(
            td1,
            el('td', '', `${it.sponsor_level || 'Odisha'} · ${it.department_name || '—'}`),
            el('td', '', `${it.benefit_amount || '—'} · ${it.beneficiary_group || 'All'}`),
            el('td', '', it.application_deadline || 'Ongoing')
          );
        } else if (meta.kind === 'scholarships') {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', it.title_en), el('div', 'cso-edu-title-or', it.title_or || it.slug));
          const tdDl = el('td');
          const dlCls = it.deadline_state === 'closing_soon' ? 'warn' : it.deadline_state === 'closed' ? 'arch' : 'ok';
          tdDl.appendChild(el('span', `cso-edu-badge cso-edu-badge--${dlCls}`, `${it.deadline_state.replace('_', ' ')} (${it.application_deadline || 'Open'})`));
          tr.append(
            td1,
            el('td', '', `${it.provider_type} · ${it.category_eligibility}`),
            el('td', '', `${it.award_amount_text || '—'} (<= ₹${it.income_limit_inr || 0})`),
            tdDl
          );
        } else {
          const td1 = el('td', 'cso-edu-title-cell');
          td1.append(el('strong', '', it.title_en), el('div', 'cso-edu-title-or', it.title_or || it.slug));
          tr.append(
            td1,
            el('td', '', `${it.entry_stage} · ${it.career_domain}`),
            el('td', '', `${(it.roadmap_steps || []).length} steps · ${it.avg_salary_range || '—'}`),
            el('td', '', (it.recommended_exams || []).slice(0, 3).join(', ') || '—')
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

      if (meta.kind === 'access_rules') {
        const nameEn = el('input', 'cso-edu-input cso-edu-input-full'); nameEn.value = item?.rule_name_en || ''; refs.rule_name_en = nameEn;
        const nameOr = el('input', 'cso-edu-input cso-edu-input-full'); nameOr.value = item?.rule_name_or || ''; refs.rule_name_or = nameOr;
        const scopeSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['all_resources', 'notes_pdf', 'book_reference', 'pyq_paper', 'mock_test', 'collection'].forEach(s => { const o = el('option', '', s); o.value = s; scopeSel.appendChild(o); });
        scopeSel.value = item?.target_scope || 'all_resources'; refs.target_scope = scopeSel;
        const polSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['public_open', 'registered_free', 'verified_student', 'rate_limited'].forEach(p => { const o = el('option', '', p); o.value = p; polSel.appendChild(o); });
        polSel.value = item?.access_policy || 'public_open'; refs.access_policy = polSel;
        const limIn = el('input', 'cso-edu-input cso-edu-input-full'); limIn.type = 'number'; limIn.value = item?.daily_download_limit ?? 0; refs.daily_download_limit = limIn;
        const wmChk = el('input'); wmChk.type = 'checkbox'; wmChk.checked = item ? Boolean(item.watermark_footer_enabled) : true; refs.watermark_footer_enabled = wmChk;
        const wmTxt = el('input', 'cso-edu-input cso-edu-input-full'); wmTxt.value = item?.watermark_text_template || 'Downloaded from Common Sense Odisha (csodisha.com)'; refs.watermark_text_template = wmTxt;
        const offChk = el('input'); offChk.type = 'checkbox'; offChk.checked = item ? Boolean(item.offline_cache_allowed) : true; refs.offline_cache_allowed = offChk;
        const attChk = el('input'); attChk.type = 'checkbox'; attChk.checked = item ? Boolean(item.attribution_required) : true; refs.attribution_required = attChk;

        const simBox = el('div', 'cso-edu-preview-card');
        function updateSim() {
          const lim = Number(limIn.value || 0);
          simBox.textContent = `Policy Simulator — Guest: ${polSel.value} (${lim > 0 ? lim + ' downloads/day' : 'Unlimited'}) | Logged-in Student: Full Access | Offline PWA: ${offChk.checked ? 'Enabled' : 'Disabled'} | Watermark: ${wmChk.checked ? 'On' : 'Off'}`;
        }
        [polSel, limIn, wmChk, offChk].forEach(c => c.addEventListener('change', updateSim));
        updateSim();

        body.append(
          buildField('Rule Name (English) *', nameEn),
          buildField('Rule Name (Odia)', nameOr),
          buildField('Target Scope', scopeSel),
          buildField('Access Policy', polSel),
          buildField('Daily Download Limit (0 = unlimited)', limIn),
          buildField('Watermark Footer Enabled', wmChk),
          buildField('Watermark Template', wmTxt),
          buildField('Offline Cache Allowed', offChk),
          buildField('Attribution Required', attChk),
          simBox
        );
      } else if (meta.kind === 'schemes') {
        const titleEn = el('input', 'cso-edu-input cso-edu-input-full'); titleEn.value = item?.title_en || item?.title || ''; refs.title_en = titleEn;
        const titleOr = el('input', 'cso-edu-input cso-edu-input-full'); titleOr.value = item?.title_or || ''; refs.title_or = titleOr;
        const sponIn = el('input', 'cso-edu-input cso-edu-input-full'); sponIn.value = item?.sponsor_level || 'Odisha State'; refs.sponsor_level = sponIn;
        const deptIn = el('input', 'cso-edu-input cso-edu-input-full'); deptIn.value = item?.department_name || ''; refs.department_name = deptIn;
        const benIn = el('input', 'cso-edu-input cso-edu-input-full'); benIn.value = item?.benefit_amount || ''; refs.benefit_amount = benIn;
        const grpIn = el('input', 'cso-edu-input cso-edu-input-full'); grpIn.value = item?.beneficiary_group || 'All Citizens'; refs.beneficiary_group = grpIn;
        const dlIn = el('input', 'cso-edu-input cso-edu-input-full'); dlIn.value = item?.application_deadline || ''; refs.application_deadline = dlIn;
        const urlIn = el('input', 'cso-edu-input cso-edu-input-full'); urlIn.value = item?.official_apply_url || ''; refs.official_apply_url = urlIn;
        const pdfIn = el('input', 'cso-edu-input cso-edu-input-full'); pdfIn.value = item?.pdf_url || ''; refs.pdf_url = pdfIn;
        const sumEn = el('textarea', 'cso-edu-textarea cso-edu-textarea-full'); sumEn.value = item?.summary || ''; refs.summary = sumEn;
        const eligIn = el('textarea', 'cso-edu-textarea cso-edu-textarea-full'); eligIn.value = item?.eligibility_criteria || ''; refs.eligibility_criteria = eligIn;

        const upIn = el('input', 'cso-edu-input'); upIn.type = 'file'; upIn.accept = '.pdf';
        upIn.addEventListener('change', async () => {
          if (!upIn.files[0]) return;
          const fd = new FormData(); fd.append('file', upIn.files[0]);
          try {
            const up = await api('/api/admin/edu/resources/upload', { method: 'POST', body: fd });
            pdfIn.value = up.file_url || '';
            toast('Scheme Guideline PDF uploaded to R2', 'success');
          } catch (e) { toast(e.message, 'error'); }
        });

        body.append(
          buildField('Scheme Title (English) *', titleEn),
          buildField('Scheme Title (Odia)', titleOr),
          buildField('Sponsor Level', sponIn),
          buildField('Department Name', deptIn),
          buildField('Benefit Amount', benIn),
          buildField('Beneficiary Group', grpIn),
          buildField('Application Deadline', dlIn),
          buildField('Official Apply URL', urlIn),
          buildField('Guideline PDF URL', pdfIn),
          buildField('Upload Guideline PDF to R2', upIn),
          buildField('Summary', sumEn),
          buildField('Eligibility Criteria', eligIn)
        );
      } else if (meta.kind === 'scholarships') {
        const titleEn = el('input', 'cso-edu-input cso-edu-input-full'); titleEn.value = item?.title_en || ''; refs.title_en = titleEn;
        const titleOr = el('input', 'cso-edu-input cso-edu-input-full'); titleOr.value = item?.title_or || ''; refs.title_or = titleOr;
        const provSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['Odisha State Govt', 'Central Govt / NSP', 'UGC / AICTE / CSIR', 'Private / CSR Foundation'].forEach(p => { const o = el('option', '', p); o.value = p; provSel.appendChild(o); });
        provSel.value = item?.provider_type || 'Odisha State Govt'; refs.provider_type = provSel;
        const deptIn = el('input', 'cso-edu-input cso-edu-input-full'); deptIn.value = item?.department_or_agency || ''; refs.department_or_agency = deptIn;
        const catSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['All', 'SC/ST', 'OBC/SEBC', 'Minority', 'EWS', 'Girls/Women', 'PwD'].forEach(c => { const o = el('option', '', c); o.value = c; catSel.appendChild(o); });
        catSel.value = item?.category_eligibility || 'All'; refs.category_eligibility = catSel;
        const incIn = el('input', 'cso-edu-input cso-edu-input-full'); incIn.type = 'number'; incIn.value = item?.income_limit_inr ?? 250000; refs.income_limit_inr = incIn;
        const mrkIn = el('input', 'cso-edu-input cso-edu-input-full'); mrkIn.type = 'number'; mrkIn.value = item?.min_marks_pct ?? 50; refs.min_marks_pct = mrkIn;
        const awdIn = el('input', 'cso-edu-input cso-edu-input-full'); awdIn.value = item?.award_amount_text || ''; refs.award_amount_text = awdIn;
        const dlIn = el('input', 'cso-edu-input cso-edu-input-full'); dlIn.type = 'date'; dlIn.value = item?.application_deadline || ''; refs.application_deadline = dlIn;
        const urlIn = el('input', 'cso-edu-input cso-edu-input-full'); urlIn.value = item?.apply_url || ''; refs.apply_url = urlIn;
        const fileIn = el('input', 'cso-edu-input cso-edu-input-full'); fileIn.value = item?.file_url || ''; refs.file_url = fileIn;
        const r2In = el('input', 'cso-edu-input cso-edu-input-full'); r2In.value = item?.r2_key || ''; refs.r2_key = r2In;

        const upIn = el('input', 'cso-edu-input'); upIn.type = 'file'; upIn.accept = '.pdf';
        upIn.addEventListener('change', async () => {
          if (!upIn.files[0]) return;
          const fd = new FormData(); fd.append('file', upIn.files[0]);
          try {
            const up = await api('/api/admin/edu/resources/upload', { method: 'POST', body: fd });
            r2In.value = up.r2_key || ''; fileIn.value = up.file_url || '';
            toast('Scholarship PDF uploaded to R2', 'success');
          } catch (e) { toast(e.message, 'error'); }
        });

        body.append(
          buildField('Title (English) *', titleEn),
          buildField('Title (Odia)', titleOr),
          buildField('Provider Type', provSel),
          buildField('Department / Agency', deptIn),
          buildField('Category Eligibility', catSel),
          buildField('Family Income Limit (INR)', incIn),
          buildField('Min Marks %', mrkIn),
          buildField('Award Amount Text', awdIn),
          buildField('Application Deadline', dlIn),
          buildField('Official Apply URL', urlIn),
          buildField('PDF File URL', fileIn),
          buildField('Upload PDF to R2', upIn)
        );
      } else {
        const titleEn = el('input', 'cso-edu-input cso-edu-input-full'); titleEn.value = item?.title_en || ''; refs.title_en = titleEn;
        const titleOr = el('input', 'cso-edu-input cso-edu-input-full'); titleOr.value = item?.title_or || ''; refs.title_or = titleOr;
        const stgSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['After Class 10', 'After +2 Science', 'After +2 Arts', 'After +2 Commerce', 'After Graduation', 'After Post-Graduation'].forEach(s => { const o = el('option', '', s); o.value = s; stgSel.appendChild(o); });
        stgSel.value = item?.entry_stage || 'After Graduation'; refs.entry_stage = stgSel;
        const domSel = el('select', 'cso-edu-select cso-edu-select-full');
        ['Civil Services & Admin', 'Teaching & Academia', 'Engineering & IT', 'Medical & Allied Health', 'Banking & Finance', 'Defence & Police', 'Skill & Entrepreneurship'].forEach(d => { const o = el('option', '', d); o.value = d; domSel.appendChild(o); });
        domSel.value = item?.career_domain || 'Civil Services & Admin'; refs.career_domain = domSel;
        const salIn = el('input', 'cso-edu-input cso-edu-input-full'); salIn.value = item?.avg_salary_range || ''; refs.avg_salary_range = salIn;
        const examsIn = el('input', 'cso-edu-input cso-edu-input-full'); examsIn.value = (item?.recommended_exams || []).join(', '); refs.recommended_exams = examsIn;
        const oppEn = el('textarea', 'cso-edu-textarea cso-edu-textarea-full'); oppEn.value = item?.odisha_opportunities_en || ''; refs.odisha_opportunities_en = oppEn;

        const steps = Array.isArray(item?.roadmap_steps) ? item.roadmap_steps.map(s => ({ ...s })) : [];
        const stepBox = el('div', 'cso-edu-section');
        const stepList = el('div');
        function renderSteps() {
          stepList.replaceChildren();
          steps.forEach((st, idx) => {
            st.step_no = idx + 1;
            const rBox = el('div', 'cso-edu-preview-card');
            const lbl = el('input', 'cso-edu-input'); lbl.placeholder = `Step ${idx + 1} Stage`; lbl.value = st.stage_label_en || '';
            lbl.addEventListener('input', () => { st.stage_label_en = lbl.value; });
            const act = el('input', 'cso-edu-input cso-edu-input-full'); act.placeholder = 'Action / Milestone'; act.value = st.action_en || '';
            act.addEventListener('input', () => { st.action_en = act.value; });
            const dur = el('input', 'cso-edu-input'); dur.placeholder = 'Duration'; dur.value = st.duration_text || '';
            dur.addEventListener('input', () => { st.duration_text = dur.value; });
            const rm = el('button', 'cso-edu-btn cso-edu-btn--danger', '×'); rm.type = 'button';
            rm.addEventListener('click', () => { steps.splice(idx, 1); renderSteps(); });
            rBox.append(lbl, dur, act, rm);
            stepList.appendChild(rBox);
          });
        }
        renderSteps();
        const addStepBtn = el('button', 'cso-edu-btn', '+ Add Roadmap Step'); addStepBtn.type = 'button';
        addStepBtn.addEventListener('click', () => { steps.push({ step_no: steps.length + 1, stage_label_en: '', action_en: '', duration_text: '' }); renderSteps(); });
        stepBox.append(el('div', 'cso-edu-label', 'Career Roadmap Step Builder'), stepList, addStepBtn);
        refs._getSteps = () => steps;

        body.append(
          buildField('Career Title (English) *', titleEn),
          buildField('Career Title (Odia)', titleOr),
          buildField('Entry Stage', stgSel),
          buildField('Career Domain', domSel),
          buildField('Avg Salary Range', salIn),
          buildField('Recommended Exams (comma-separated)', examsIn),
          buildField('Odisha Opportunities (EN)', oppEn),
          stepBox
        );
      }

      const statusSel = el('select', 'cso-edu-select cso-edu-select-full');
      const stOpts = meta.kind === 'access_rules' ? ['draft', 'published', 'archived'] : ['draft', 'published', 'scheduled', 'archived'];
      stOpts.forEach(s => { const o = el('option', '', s); o.value = s; statusSel.appendChild(o); });
      statusSel.value = item?.status || 'published'; refs.status = statusSel;

      if (meta.kind !== 'access_rules') {
        const tagsIn = el('input', 'cso-edu-input cso-edu-input-full'); tagsIn.value = (item?.tags || []).join(', '); refs.tags = tagsIn;
        body.appendChild(buildField('Tags (comma-separated)', tagsIn));
      }
      body.appendChild(buildField('Status', statusSel));

      if (meta.kind === 'schemes' || meta.kind === 'scholarships') {
        const btnCheck = el('button', 'cso-edu-btn', 'Check Links'); btnCheck.type = 'button';
        btnCheck.addEventListener('click', async () => {
          const urls = [refs.official_apply_url?.value, refs.apply_url?.value, refs.pdf_url?.value, refs.file_url?.value].filter(Boolean);
          if (!urls.length) { toast('No URLs to check', 'info'); return; }
          try {
            const res = await api('/api/admin/utils/check-links', { method: 'POST', body: JSON.stringify({ urls }) });
            const bad = (res.results || []).filter(r => !r.ok);
            toast(bad.length ? `${bad.length} broken link(s)` : 'All links reachable', bad.length ? 'error' : 'success');
          } catch (e) { toast(e.message, 'error'); }
        });
        body.appendChild(btnCheck);
      }

      previewCard.textContent = `Student & WhatsApp Preview: ${refs.title_en?.value || refs.rule_name_en?.value || 'New Entry'} [${statusSel.value}]`;
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
          const payload = { status: refs.status.value };
          if (refs.tags) payload.tags = refs.tags.value.split(',').map(s => s.trim()).filter(Boolean);
          if (meta.kind === 'access_rules') {
            Object.assign(payload, {
              rule_name_en: refs.rule_name_en.value.trim(),
              rule_name_or: refs.rule_name_or.value.trim(),
              target_scope: refs.target_scope.value,
              access_policy: refs.access_policy.value,
              daily_download_limit: Number(refs.daily_download_limit.value || 0),
              watermark_footer_enabled: refs.watermark_footer_enabled.checked,
              watermark_text_template: refs.watermark_text_template.value.trim(),
              offline_cache_allowed: refs.offline_cache_allowed.checked,
              attribution_required: refs.attribution_required.checked
            });
          } else if (meta.kind === 'schemes') {
            Object.assign(payload, {
              title_en: refs.title_en.value.trim(),
              title_or: refs.title_or.value.trim(),
              sponsor_level: refs.sponsor_level.value.trim(),
              department_name: refs.department_name.value.trim(),
              benefit_amount: refs.benefit_amount.value.trim(),
              beneficiary_group: refs.beneficiary_group.value.trim(),
              application_deadline: refs.application_deadline.value.trim(),
              official_apply_url: refs.official_apply_url.value.trim(),
              pdf_url: refs.pdf_url.value.trim(),
              summary: refs.summary.value.trim(),
              eligibility_criteria: refs.eligibility_criteria.value.trim()
            });
          } else if (meta.kind === 'scholarships') {
            Object.assign(payload, {
              title_en: refs.title_en.value.trim(),
              title_or: refs.title_or.value.trim(),
              provider_type: refs.provider_type.value,
              department_or_agency: refs.department_or_agency.value.trim(),
              category_eligibility: refs.category_eligibility.value,
              income_limit_inr: Number(refs.income_limit_inr.value || 0),
              min_marks_pct: Number(refs.min_marks_pct.value || 0),
              award_amount_text: refs.award_amount_text.value.trim(),
              application_deadline: refs.application_deadline.value,
              apply_url: refs.apply_url.value.trim(),
              file_url: refs.file_url.value.trim(),
              r2_key: refs.r2_key.value.trim()
            });
          } else {
            Object.assign(payload, {
              title_en: refs.title_en.value.trim(),
              title_or: refs.title_or.value.trim(),
              entry_stage: refs.entry_stage.value,
              career_domain: refs.career_domain.value,
              avg_salary_range: refs.avg_salary_range.value.trim(),
              recommended_exams: refs.recommended_exams.value.split(',').map(s => s.trim()).filter(Boolean),
              odisha_opportunities_en: refs.odisha_opportunities_en.value.trim(),
              roadmap_steps: refs._getSteps()
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

  window.CSOEduBatch5 = { render, MODULE_META };
})();
