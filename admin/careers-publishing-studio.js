/**
 * Common Sense Odisha — Admin Studio: Careers Publishing House (v269)
 * Bilingual (English / ଓଡ଼ିଆ) Career Roadmap Composer & Live Search/Filter Manager.
 * Strict CSP-compliant: zero innerHTML, outerHTML, insertAdjacentHTML, .style.*, or inline handlers.
 */
(function (window, document) {
  'use strict';

  var state = {
    root: null,
    headerActions: null,
    tab: 'list', // 'list' | 'composer'
    items: [],
    taxonomy: { tracks: [], regions: [], stages: [] },
    stats: { total: 0, published: 0, draft: 0, archived: 0 },
    filters: { q: '', track: '', region: '', status: '' },
    editing: null,
    linksDraft: [{ label: '', url: '' }],
    inlineTaxKind: ''
  };

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function toast(msg, kind) {
    if (typeof window.showToast === 'function') window.showToast(msg, kind || 'info');
  }

  function slugify(raw) {
    return String(raw || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
  }

  function api(path, method, body) {
    var opts = {
      method: method || 'GET',
      credentials: 'same-origin',
      headers: { 'X-CSO-CSRF': '1' }
    };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error((d && d.error) || ('HTTP ' + r.status));
        return d;
      });
    });
  }

  function emptyFormModel() {
    return {
      id: '',
      slug: '',
      title_en: '',
      title_or: '',
      track_slug: (state.taxonomy.tracks[0] && state.taxonomy.tracks[0].slug) || 'civil-services',
      region_scope: 'odisha',
      career_stage: 'graduate',
      eligibility_summary: '',
      salary_band: '',
      key_exams: '',
      summary_en: '',
      summary_or: '',
      roadmap_body_en: '',
      roadmap_body_or: '',
      official_links: [],
      status: 'draft',
      featured: 0
    };
  }

  function findLabel(list, slug) {
    var hit = (list || []).find(function (x) { return x.slug === slug; });
    return hit ? hit.label_en : (slug || '—');
  }

  function loadData() {
    var qs = new URLSearchParams();
    if (state.filters.q) qs.set('q', state.filters.q);
    if (state.filters.track) qs.set('track', state.filters.track);
    if (state.filters.region) qs.set('region', state.filters.region);
    if (state.filters.status) qs.set('status', state.filters.status);
    return api('/api/admin/careers' + (qs.toString() ? '?' + qs.toString() : ''), 'GET').then(function (d) {
      state.items = Array.isArray(d.items) ? d.items : [];
      if (d.taxonomy) state.taxonomy = d.taxonomy;
      if (d.stats) state.stats = d.stats;
      if (window.CSOStudio && typeof window.CSOStudio.setCareersCount === 'function') {
        window.CSOStudio.setCareersCount(state.stats.total || 0);
      }
      renderView();
    }).catch(function (err) {
      toast('Failed to load careers studio: ' + err.message, 'crimson');
    });
  }

  function startNewGuide() {
    state.editing = emptyFormModel();
    state.linksDraft = [{ label: '', url: '' }];
    state.inlineTaxKind = '';
    state.tab = 'composer';
    renderView();
  }

  function startEditGuide(item) {
    state.editing = Object.assign(emptyFormModel(), item || {});
    var existingLinks = Array.isArray(item && item.official_links) && item.official_links.length
      ? item.official_links.map(function (l) { return { label: l.label || '', url: l.url || '' }; })
      : [{ label: '', url: '' }];
    state.linksDraft = existingLinks;
    state.inlineTaxKind = '';
    state.tab = 'composer';
    renderView();
  }

  function renderHeaderActions() {
    if (!state.headerActions) return;
    clear(state.headerActions);

    var liveLink = el('a', 'cps-btn', 'View /careers/ ↗');
    liveLink.href = '/careers/';
    liveLink.target = '_blank';
    liveLink.rel = 'noopener noreferrer';

    var newBtn = el('button', 'cps-btn cps-btn-primary', '+ New Career Guide');
    newBtn.type = 'button';
    newBtn.addEventListener('click', startNewGuide);

    state.headerActions.append(liveLink, newBtn);
  }

  function renderKpis() {
    var wrap = el('div', 'cps-kpis');
    [
      ['Total Career Guides', state.stats.total || 0],
      ['Published Live', state.stats.published || 0],
      ['Drafts', state.stats.draft || 0],
      ['Career Tracks', (state.taxonomy.tracks || []).length || 6]
    ].forEach(function (pair) {
      var tile = el('div', 'cps-kpi');
      tile.append(el('span', 'cps-kpi-label', pair[0]), el('strong', 'cps-kpi-val', String(pair[1])));
      wrap.appendChild(tile);
    });
    return wrap;
  }

  function renderTabs() {
    var tabs = el('div', 'cps-tabs');
    [
      ['list', 'Career Guides Directory (' + (state.stats.total || 0) + ')'],
      ['composer', state.editing && state.editing.id ? 'Edit Career Roadmap' : 'New Career Roadmap Composer']
    ].forEach(function (pair) {
      var btn = el('button', 'cps-tab' + (state.tab === pair[0] ? ' is-active' : ''), pair[1]);
      btn.type = 'button';
      btn.addEventListener('click', function () {
        if (pair[0] === 'composer' && !state.editing) {
          startNewGuide();
          return;
        }
        state.tab = pair[0];
        renderView();
      });
      tabs.appendChild(btn);
    });
    return tabs;
  }

  function renderListPanel() {
    var card = el('section', 'cps-card');
    var head = el('div', 'cps-card-head');
    head.appendChild(el('h2', 'cps-card-title', 'Career Roadmaps & Guides (Live D1)'));

    var refreshBtn = el('button', 'cps-btn', '↻ Refresh');
    refreshBtn.type = 'button';
    refreshBtn.addEventListener('click', loadData);
    head.appendChild(refreshBtn);

    // Filters
    var filterBar = el('div', 'cps-filter-bar');
    var searchInp = el('input', 'cps-input');
    searchInp.type = 'search';
    searchInp.placeholder = 'Search title, slug, or key exams…';
    searchInp.value = state.filters.q;
    searchInp.addEventListener('change', function () {
      state.filters.q = searchInp.value.trim();
      loadData();
    });

    var trackSel = el('select', 'cps-select');
    trackSel.appendChild(new Option('All Tracks', ''));
    (state.taxonomy.tracks || []).forEach(function (tr) {
      trackSel.appendChild(new Option(tr.label_en, tr.slug));
    });
    trackSel.value = state.filters.track;
    trackSel.addEventListener('change', function () {
      state.filters.track = trackSel.value;
      loadData();
    });

    var regSel = el('select', 'cps-select');
    regSel.appendChild(new Option('All Regions', ''));
    (state.taxonomy.regions || []).forEach(function (rg) {
      regSel.appendChild(new Option(rg.label_en, rg.slug));
    });
    regSel.value = state.filters.region;
    regSel.addEventListener('change', function () {
      state.filters.region = regSel.value;
      loadData();
    });

    var stSel = el('select', 'cps-select');
    [['', 'All Statuses'], ['published', 'Published'], ['draft', 'Draft'], ['archived', 'Archived']].forEach(function (p) {
      stSel.appendChild(new Option(p[1], p[0]));
    });
    stSel.value = state.filters.status;
    stSel.addEventListener('change', function () {
      state.filters.status = stSel.value;
      loadData();
    });

    filterBar.append(searchInp, trackSel, regSel, stSel);

    // Table
    var tableWrap = el('div', 'cps-table-wrap');
    if (!state.items.length) {
      var emptyMsg = el('p', 'cps-status-msg', 'No career roadmaps found yet. Click "+ New Career Guide" to publish your first bilingual career guide.');
      tableWrap.appendChild(emptyMsg);
    } else {
      var table = el('table', 'cps-table');
      var thead = document.createElement('thead');
      var trHead = document.createElement('tr');
      ['Title (EN / ଓଡ଼ିଆ)', 'Track', 'Region', 'Stage', 'Status', 'Actions'].forEach(function (col) {
        trHead.appendChild(el('th', '', col));
      });
      thead.appendChild(trHead);
      var tbody = document.createElement('tbody');

      state.items.forEach(function (item) {
        var tr = document.createElement('tr');

        var tdTitle = document.createElement('td');
        var tCell = el('div', 'cps-title-cell');
        tCell.appendChild(el('strong', '', item.title_en + (item.featured ? ' ★' : '')));
        tCell.appendChild(el('span', 'cps-title-sub', (item.title_or ? item.title_or + ' · ' : '') + '/' + item.slug));
        tdTitle.appendChild(tCell);

        var tdTrack = el('td', '', findLabel(state.taxonomy.tracks, item.track_slug));
        var tdRegion = el('td', '', findLabel(state.taxonomy.regions, item.region_scope));
        var tdStage = el('td', '', findLabel(state.taxonomy.stages, item.career_stage));

        var tdStatus = document.createElement('td');
        tdStatus.appendChild(el('span', 'cps-status-pill is-' + (item.status || 'draft'), item.status || 'draft'));

        var tdAct = document.createElement('td');
        var actWrap = el('div', 'cps-row-actions');

        var editBtn = el('button', 'cps-btn cps-btn-sm', 'Edit');
        editBtn.type = 'button';
        editBtn.addEventListener('click', function () { startEditGuide(item); });

        var toggleBtn = el('button', 'cps-btn cps-btn-sm', item.status === 'published' ? 'Unpublish' : 'Publish');
        toggleBtn.type = 'button';
        toggleBtn.addEventListener('click', function () {
          api('/api/admin/careers', 'POST', { action: 'toggle_status', id: item.id })
            .then(function () {
              toast('Status updated & public cache purged.', 'emerald');
              loadData();
            })
            .catch(function (err) { toast(err.message, 'crimson'); });
        });

        var previewA = el('a', 'cps-btn cps-btn-sm', 'Preview Draft ↗');
        previewA.href = '/careers/?preview_id=' + encodeURIComponent(item.id);
        previewA.target = '_blank';
        previewA.rel = 'noopener noreferrer';

        var delBtn = el('button', 'cps-btn cps-btn-sm cps-btn-danger', 'Delete');
        delBtn.type = 'button';
        delBtn.addEventListener('click', function () {
          if (!window.confirm('Delete "' + item.title_en + '" permanently?')) return;
          api('/api/admin/careers', 'POST', { action: 'delete', id: item.id })
            .then(function () {
              toast('Career guide deleted.', 'emerald');
              loadData();
            })
            .catch(function (err) { toast(err.message, 'crimson'); });
        });

        actWrap.append(editBtn, toggleBtn, previewA, delBtn);
        tdAct.appendChild(actWrap);

        tr.append(tdTitle, tdTrack, tdRegion, tdStage, tdStatus, tdAct);
        tbody.appendChild(tr);
      });

      table.append(thead, tbody);
      tableWrap.appendChild(table);
    }

    card.append(head, filterBar, tableWrap);
    return card;
  }

  function renderComposerPanel() {
    var model = state.editing || emptyFormModel();
    var card = el('section', 'cps-card');
    var head = el('div', 'cps-card-head');
    head.appendChild(el('h2', 'cps-card-title', model.id ? 'Edit Bilingual Career Roadmap' : 'Author New Bilingual Career Roadmap'));
    if (model.id) {
      var prevTop = el('a', 'cps-btn', '👁 Preview Draft ↗');
      prevTop.href = '/careers/?preview_id=' + encodeURIComponent(model.id);
      prevTop.target = '_blank';
      prevTop.rel = 'noopener noreferrer';
      head.appendChild(prevTop);
    }

    var form = document.createElement('form');
    form.id = 'csoCareersComposerForm';
    form.noValidate = true;

    var grid = el('div', 'cps-form-grid');

    function makeField(labelText, inputEl, spanFull, extraHeaderEl) {
      var f = el('div', 'cps-field' + (spanFull ? ' cps-span-full' : ''));
      var row = el('div', 'cps-label-row');
      var lbl = el('label', 'cps-label', labelText);
      if (inputEl.id) lbl.setAttribute('for', inputEl.id);
      row.appendChild(lbl);
      if (extraHeaderEl) row.appendChild(extraHeaderEl);
      f.append(row, inputEl);
      return f;
    }

    // Title EN + auto slug
    var inpTitleEn = el('input', 'cps-input');
    inpTitleEn.id = 'cps-title-en';
    inpTitleEn.type = 'text';
    inpTitleEn.required = true;
    inpTitleEn.placeholder = 'e.g., Odisha Administrative Service (OAS) Complete Career Roadmap';
    inpTitleEn.value = model.title_en || '';

    var inpTitleOr = el('input', 'cps-input');
    inpTitleOr.id = 'cps-title-or';
    inpTitleOr.type = 'text';
    inpTitleOr.placeholder = 'e.g., ଓଡ଼ିଶା ପ୍ରଶାସନିକ ସେବା (OAS) ସମ୍ପୂର୍ଣ୍ଣ କ୍ୟାରିୟର୍ ମାର୍ଗଦର୍ଶିକା';
    inpTitleOr.value = model.title_or || '';

    var inpSlug = el('input', 'cps-input');
    inpSlug.id = 'cps-slug';
    inpSlug.type = 'text';
    inpSlug.placeholder = 'odisha-administrative-service-oas-roadmap';
    inpSlug.value = model.slug || '';

    inpTitleEn.addEventListener('input', function () {
      if (!model.id && (!inpSlug.dataset.manual)) {
        inpSlug.value = slugify(inpTitleEn.value);
      }
    });
    inpSlug.addEventListener('input', function () {
      inpSlug.dataset.manual = '1';
    });

    // Career Track dropdown + inline "+ Add Option"
    var selTrack = el('select', 'cps-select');
    selTrack.id = 'cps-track';
    (state.taxonomy.tracks || []).forEach(function (n) {
      selTrack.appendChild(new Option(n.label_en + (n.label_or ? ' (' + n.label_or + ')' : ''), n.slug));
    });
    selTrack.value = model.track_slug || 'civil-services';

    var btnAddTrack = el('button', 'cps-inline-add-btn', '+ Add Option');
    btnAddTrack.type = 'button';
    btnAddTrack.id = 'cps-add-track-btn';
    btnAddTrack.addEventListener('click', function () {
      state.inlineTaxKind = state.inlineTaxKind === 'track' ? '' : 'track';
      renderView();
    });

    // Region Scope dropdown + inline "+ Add Option"
    var selRegion = el('select', 'cps-select');
    selRegion.id = 'cps-region';
    (state.taxonomy.regions || []).forEach(function (n) {
      selRegion.appendChild(new Option(n.label_en, n.slug));
    });
    selRegion.value = model.region_scope || 'odisha';

    var btnAddRegion = el('button', 'cps-inline-add-btn', '+ Add Option');
    btnAddRegion.type = 'button';
    btnAddRegion.addEventListener('click', function () {
      state.inlineTaxKind = state.inlineTaxKind === 'region' ? '' : 'region';
      renderView();
    });

    // Career Stage dropdown + inline "+ Add Option"
    var selStage = el('select', 'cps-select');
    selStage.id = 'cps-stage';
    (state.taxonomy.stages || []).forEach(function (n) {
      selStage.appendChild(new Option(n.label_en, n.slug));
    });
    selStage.value = model.career_stage || 'graduate';

    var btnAddStage = el('button', 'cps-inline-add-btn', '+ Add Option');
    btnAddStage.type = 'button';
    btnAddStage.addEventListener('click', function () {
      state.inlineTaxKind = state.inlineTaxKind === 'stage' ? '' : 'stage';
      renderView();
    });

    // Status dropdown
    var selStatus = el('select', 'cps-select');
    selStatus.id = 'cps-status';
    [['draft', 'Draft'], ['published', 'Published'], ['archived', 'Archived']].forEach(function (p) {
      selStatus.appendChild(new Option(p[1], p[0]));
    });
    selStatus.value = model.status || 'draft';

    var inpElig = el('input', 'cps-input');
    inpElig.id = 'cps-eligibility';
    inpElig.type = 'text';
    inpElig.placeholder = 'e.g., Bachelor Degree in any stream, Age 21-38 yrs, Odia proficiency';
    inpElig.value = model.eligibility_summary || '';

    var inpSalary = el('input', 'cps-input');
    inpSalary.id = 'cps-salary';
    inpSalary.type = 'text';
    inpSalary.placeholder = 'e.g., ORSP Level-12 (₹56,100 – ₹1,77,500)';
    inpSalary.value = model.salary_band || '';

    var inpExams = el('input', 'cps-input');
    inpExams.id = 'cps-key-exams';
    inpExams.type = 'text';
    inpExams.placeholder = 'e.g., OPSC OCS, UPSC CSE, OSSC CGL';
    inpExams.value = model.key_exams || '';

    var txtSumEn = el('textarea', 'cps-textarea');
    txtSumEn.id = 'cps-summary-en';
    txtSumEn.rows = 3;
    txtSumEn.placeholder = 'Concise English summary shown on the Careers Explorer card...';
    txtSumEn.value = model.summary_en || '';

    var txtSumOr = el('textarea', 'cps-textarea');
    txtSumOr.id = 'cps-summary-or';
    txtSumOr.rows = 3;
    txtSumOr.placeholder = 'ଓଡ଼ିଆରେ ସଂକ୍ଷିପ୍ତ ବିବରଣୀ...';
    txtSumOr.value = model.summary_or || '';

    var txtBodyEn = el('textarea', 'cps-textarea');
    txtBodyEn.id = 'cps-body-en';
    txtBodyEn.rows = 8;
    txtBodyEn.placeholder = '### Step 1: Qualification & Age\n...\n\n### Step 2: Selection Pattern\n...\n\n### Step 3: Career Growth & Promotions\n...';
    txtBodyEn.value = model.roadmap_body_en || '';

    var txtBodyOr = el('textarea', 'cps-textarea');
    txtBodyOr.id = 'cps-body-or';
    txtBodyOr.rows = 8;
    txtBodyOr.placeholder = '### ପର୍ଯ୍ୟାୟ ୧: ଶିକ୍ଷାଗତ ଯୋଗ୍ୟତା\n...\n\n### ପର୍ଯ୍ୟାୟ ୨: ପରୀକ୍ଷା ପଦ୍ଧତି\n...';
    txtBodyOr.value = model.roadmap_body_or || '';

    // Quick roadmap template bar
    var snipBar = el('div', 'cps-snippets-bar');
    [
      ['+ Eligibility Block', '\n\n### Eligibility & Age Limit\n- Minimum Qualification: \n- Age Limit & Relaxations: '],
      ['+ Exam Stages Block', '\n\n### Exam & Selection Pattern\n- Stage 1 (Preliminary): \n- Stage 2 (Mains): \n- Stage 3 (Interview / Skill Test): '],
      ['+ Growth Ladder', '\n\n### Career Progression & Pay Ladder\n- Entry Grade: \n- Mid-Career Promotion: \n- Senior Cadre: ']
    ].forEach(function (pair) {
      var chip = el('button', 'cps-chip-btn', pair[0]);
      chip.type = 'button';
      chip.addEventListener('click', function () {
        txtBodyEn.value = (txtBodyEn.value || '') + pair[1];
        txtBodyEn.focus();
      });
      snipBar.appendChild(chip);
    });

    grid.append(
      makeField('Title (English) *', inpTitleEn, false),
      makeField('Title (ଓଡ଼ିଆ)', inpTitleOr, false),
      makeField('URL Slug', inpSlug, false),
      makeField('Status', selStatus, false),
      makeField('Career Track', selTrack, false, btnAddTrack),
      makeField('Region / Scope', selRegion, false, btnAddRegion),
      makeField('Career Stage', selStage, false, btnAddStage),
      makeField('Salary / Pay Level Band', inpSalary, false)
    );

    // Inline "+ Add Option" taxonomy creator box
    if (state.inlineTaxKind) {
      var taxBox = el('div', 'cps-inline-tax-box cps-span-full');
      var taxEn = el('input', 'cps-input');
      taxEn.id = 'cps-inline-tax-en';
      taxEn.type = 'text';
      taxEn.placeholder = 'New ' + state.inlineTaxKind + ' label (English) *';
      var taxOr = el('input', 'cps-input');
      taxOr.id = 'cps-inline-tax-or';
      taxOr.type = 'text';
      taxOr.placeholder = 'Label (ଓଡ଼ିଆ, optional)';
      var taxSave = el('button', 'cps-btn cps-btn-primary', 'Add ' + state.inlineTaxKind);
      taxSave.type = 'button';
      taxSave.addEventListener('click', function () {
        var lblEn = taxEn.value.trim();
        if (!lblEn) { toast('Enter an English label first.', 'amber'); return; }
        api('/api/admin/careers/taxonomy', 'POST', {
          kind: state.inlineTaxKind,
          label_en: lblEn,
          label_or: taxOr.value.trim()
        }).then(function (d) {
          toast('Added new ' + state.inlineTaxKind + ' option!', 'emerald');
          if (d && d.node) {
            if (state.inlineTaxKind === 'track') state.editing.track_slug = d.node.slug;
            if (state.inlineTaxKind === 'region') state.editing.region_scope = d.node.slug;
            if (state.inlineTaxKind === 'stage') state.editing.career_stage = d.node.slug;
          }
          state.inlineTaxKind = '';
          loadData();
        }).catch(function (err) { toast(err.message, 'crimson'); });
      });
      var taxCancel = el('button', 'cps-btn', 'Cancel');
      taxCancel.type = 'button';
      taxCancel.addEventListener('click', function () {
        state.inlineTaxKind = '';
        renderView();
      });
      taxBox.append(taxEn, taxOr, taxSave, taxCancel);
      grid.appendChild(taxBox);
    }

    grid.append(
      makeField('Eligibility Summary', inpElig, false),
      makeField('Key Exams (comma-separated)', inpExams, false),
      makeField('Summary (English)', txtSumEn, false),
      makeField('Summary (ଓଡ଼ିଆ)', txtSumOr, false),
      makeField('Structured Roadmap Content (English)', txtBodyEn, true, snipBar),
      makeField('Structured Roadmap Content (ଓଡ଼ିଆ)', txtBodyOr, true)
    );

    // Official Links editor
    var linksWrap = el('div', 'cps-field cps-span-full');
    var linksHead = el('div', 'cps-label-row');
    linksHead.appendChild(el('span', 'cps-label', 'Official Portal Links (.gov.in / Verified URLs)'));
    var addLinkBtn = el('button', 'cps-inline-add-btn', '+ Add Link');
    addLinkBtn.type = 'button';
    addLinkBtn.addEventListener('click', function () {
      state.linksDraft.push({ label: '', url: '' });
      renderLinksRows();
    });
    linksHead.appendChild(addLinkBtn);
    var linksList = el('div', 'cps-links-editor');
    function renderLinksRows() {
      clear(linksList);
      state.linksDraft.forEach(function (lk, idx) {
        var row = el('div', 'cps-link-row');
        var lInp = el('input', 'cps-input');
        lInp.type = 'text';
        lInp.placeholder = 'Portal Label (e.g., OPSC Official Portal)';
        lInp.value = lk.label || '';
        lInp.addEventListener('input', function () { lk.label = lInp.value; });

        var uInp = el('input', 'cps-input');
        uInp.type = 'url';
        uInp.placeholder = 'https://www.opsc.gov.in/';
        uInp.value = lk.url || '';
        uInp.addEventListener('input', function () { lk.url = uInp.value; });

        var rmBtn = el('button', 'cps-btn cps-btn-sm', '✕');
        rmBtn.type = 'button';
        rmBtn.addEventListener('click', function () {
          state.linksDraft.splice(idx, 1);
          if (!state.linksDraft.length) state.linksDraft.push({ label: '', url: '' });
          renderLinksRows();
        });
        row.append(lInp, uInp, rmBtn);
        linksList.appendChild(row);
      });
    }
    renderLinksRows();
    linksWrap.append(linksHead, linksList);
    grid.appendChild(linksWrap);

    // Featured checkbox
    var featWrap = el('div', 'cps-field cps-span-full');
    var featLbl = el('label', 'cps-check-label');
    var chkFeat = document.createElement('input');
    chkFeat.type = 'checkbox';
    chkFeat.id = 'cps-featured';
    chkFeat.checked = Boolean(model.featured);
    featLbl.append(chkFeat, document.createTextNode(' Feature this career roadmap on /careers/'));
    featWrap.appendChild(featLbl);
    grid.appendChild(featWrap);

    // Actions
    var actions = el('div', 'cps-actions');
    var saveBtn = el('button', 'cps-btn cps-btn-primary', model.id ? 'Save Career Roadmap' : 'Create Career Roadmap');
    saveBtn.type = 'submit';
    var cancelBtn = el('button', 'cps-btn', 'Back to List');
    cancelBtn.type = 'button';
    cancelBtn.addEventListener('click', function () {
      state.tab = 'list';
      renderView();
    });
    var statusMsg = el('span', 'cps-status-msg', '');
    actions.append(saveBtn, cancelBtn);
    if (model.id) {
      var prevBtn = el('a', 'cps-btn', '👁 Preview Draft ↗');
      prevBtn.href = '/careers/?preview_id=' + encodeURIComponent(model.id);
      prevBtn.target = '_blank';
      prevBtn.rel = 'noopener noreferrer';
      actions.appendChild(prevBtn);
    }
    actions.appendChild(statusMsg);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var payload = {
        id: model.id || undefined,
        title_en: inpTitleEn.value.trim(),
        title_or: inpTitleOr.value.trim(),
        slug: inpSlug.value.trim() || slugify(inpTitleEn.value),
        track_slug: selTrack.value,
        region_scope: selRegion.value,
        career_stage: selStage.value,
        eligibility_summary: inpElig.value.trim(),
        salary_band: inpSalary.value.trim(),
        key_exams: inpExams.value.trim(),
        summary_en: txtSumEn.value.trim(),
        summary_or: txtSumOr.value.trim(),
        roadmap_body_en: txtBodyEn.value.trim(),
        roadmap_body_or: txtBodyOr.value.trim(),
        official_links: state.linksDraft.filter(function (x) { return x.url && x.url.trim(); }),
        status: selStatus.value,
        featured: chkFeat.checked ? 1 : 0
      };
      if (!payload.title_en) {
        statusMsg.textContent = 'English title is required.';
        inpTitleEn.focus();
        return;
      }
      saveBtn.disabled = true;
      statusMsg.textContent = 'Saving to D1…';
      api('/api/admin/careers', 'POST', payload).then(function (d) {
        saveBtn.disabled = false;
        statusMsg.textContent = 'Saved live to D1.';
        toast('Career roadmap saved & edge cache purged!', 'emerald');
        if (d && d.item) {
          state.editing = d.item;
        }
        loadData();
      }).catch(function (err) {
        saveBtn.disabled = false;
        statusMsg.textContent = err.message;
        toast(err.message, 'crimson');
      });
    });

    form.append(grid, actions);
    card.append(head, form);
    return card;
  }

  function renderView() {
    if (!state.root) return;
    renderHeaderActions();
    var wrap = el('div', 'cps-root');
    wrap.appendChild(renderKpis());
    wrap.appendChild(renderTabs());
    if (state.tab === 'composer') {
      wrap.appendChild(renderComposerPanel());
    } else {
      wrap.appendChild(renderListPanel());
    }
    state.root.replaceChildren(wrap);
  }

  window.CSOCareersPublishingStudio = {
    render: function (rootEl, headerActionsEl, initialTab) {
      state.root = rootEl;
      state.headerActions = headerActionsEl;
      if (initialTab === 'new' || initialTab === 'composer') {
        state.editing = emptyFormModel();
        state.linksDraft = [{ label: '', url: '' }];
        state.tab = 'composer';
      } else {
        state.tab = 'list';
      }
      renderView();
      loadData();
    }
  };
})(window, document);
