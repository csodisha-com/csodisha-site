/**
 * CS Odisha — Study Library & Curriculum Publishing House (v251)
 * Strict CSP-compliant Admin Studio module (Alt+3):
 *  - Zero HTML string sinks, zero inline style attributes, zero inline event handlers.
 *  - 4 integrated tabs:
 *      1. Published & Draft Study Materials (KPIs, 3-layer filters, full 10-feature composer)
 *      2. 3-Layer Curriculum Hierarchy Studio (Exam Track L1 -> Subject L2 -> Chapter/Format L3)
 *      3. Reusable Bilingual Snippets Library
 *      4. Reader Doubts & PYQ Corrections Queue
 */
(function (window, document) {
  'use strict';

  var RESOURCE_TYPES = [
    'Study Notes',
    'Previous Year Paper (PYQ)',
    'Official Syllabus',
    'Current Affairs Digest',
    'Practice Set / E-Book',
    'Revision Sheet',
    'Reference Digest'
  ];
  var DIFFICULTY_LEVELS = ['Foundation', 'Moderate', 'Advanced'];
  var HIGH_YIELD_PRIORITIES = ['Must-Study', 'High', 'Standard'];
  var NEGATIVE_RULES = ['None', '-0.25 (OSSC/OSSSC)', '-0.33 (OPSC/UPSC)', '-0.50'];
  var MEDIUMS = ['Bilingual', 'English', 'Odia', 'Bilingual (EN + OR)', 'Odia (ଓଡ଼ିଆ)'];
  var ACCENTS = ['indigo', 'emerald', 'cobalt', 'violet', 'amber', 'rose', 'teal'];
  var PUBLIC_STUDY_DROPDOWN_CACHE_KEY = 'cso_study_library_dropdown_v286';

  function bustPublicStudyDropdownCache() {
    try {
      window.sessionStorage.removeItem(PUBLIC_STUDY_DROPDOWN_CACHE_KEY);
      window.sessionStorage.removeItem('cso_study_library_dropdown_v285');
    } catch (_e) {}
  }

  var S = {
    root: null,
    headerActions: null,
    activeTab: 'articles',
    taxonomyNodes: [],
    articles: [],
    kpis: { total_modules: 0, published_live: 0, scheduled_drafts: 0, pyq_syllabus_sets: 0, total_pdf_downloads: 0, total_completions: 0, open_doubts: 0 },
    snippets: [],
    jobOptions: [],
    doubts: [],
    doubtsOpenCount: 0,
    doubtsFilter: 'open',
    filters: { l1: '', l2: '', l3: '', type: '', difficulty: '', priority: '', status: '', search: '' },
    taxSelL1: '',
    taxSelL2: '',
    editingArticle: null,
    revisions: [],
    composerOpen: false,
    extractedDraft: null,
    cbtTests: [],
    cbtKpis: { total_tests: 0, published_tests: 0, total_questions: 0, total_attempts: 0 },
    cbtEditingTest: null,
    cbtSelectedTestId: '',
    cbtQuestions: [],
    cbtEditingQuestion: null,
    cbtCsvDraft: '',
    cbtCsvPreview: null
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function toast(msg, kind) {
    if (typeof window.showToast === 'function') window.showToast(msg, kind || 'info');
  }

  function csrfToken() {
    var m = document.cookie.match(/(?:^|;\s*)cso_csrf=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  async function api(url, opts) {
    var o = Object.assign({ credentials: 'same-origin' }, opts || {});
    var headers = Object.assign({}, o.headers || {});
    var method = String(o.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      var tok = csrfToken();
      if (tok) headers['X-CSRF-Token'] = tok;
      if (o.body && typeof o.body === 'object' && !(o.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        o.body = JSON.stringify(o.body);
      }
    }
    o.headers = headers;
    var res = await fetch(url, o);
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.error || ('Request failed (' + res.status + ')'));
    if (method !== 'GET' && method !== 'HEAD') {
      bustPublicStudyDropdownCache();
    }
    return data;
  }

  function slugify(v) {
    return String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
  }

  function nodesByLevel(lvl, parentId) {
    return S.taxonomyNodes.filter(function (n) {
      if (Number(n.level) !== lvl) return false;
      if (lvl === 1) return true;
      return String(n.parent_id || '') === String(parentId || '');
    });
  }

  function nodeName(id) {
    var f = S.taxonomyNodes.find(function (n) { return n.id === id; });
    return f ? f.title_en : '';
  }

  function formatBroadcastText(a) {
    var base = window.location.origin || 'https://csodisha.com';
    var url = base + '/study-library/?slug=' + encodeURIComponent(a.slug || '');
    var lines = [
      '📚 ' + (a.title_en || 'New Study Module') + ' (' + (a.resource_type_badge || 'Study Notes') + ')',
      a.title_or ? '📖 ' + a.title_or : '',
      '🎯 Priority: ' + (a.high_yield_priority || 'High') + ' · Difficulty: ' + (a.difficulty_level || 'Moderate') + ' · ⏱ ' + (a.estimated_read_mins || 10) + ' mins',
      a.exam_board_tag ? '🏛 Exam: ' + a.exam_board_tag + (a.paper_code ? ' (' + a.paper_code + ')' : '') : '',
      a.summary_en ? '📝 ' + a.summary_en.slice(0, 180) : '',
      a.summary_or ? '📝 ' + a.summary_or.slice(0, 180) : '',
      '🔗 Read Notes, Flip-Cards & Free PDF: ' + url
    ].filter(Boolean);
    return lines.join('\n');
  }

  function copyBroadcast(a) {
    var txt = formatBroadcastText(a);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () {
        toast('Bilingual EN + ଓଡ଼ିଆ study alert copied for Telegram / WhatsApp.', 'success');
      }).catch(function () {
        toast('Unable to access clipboard.', 'error');
      });
    } else {
      toast('Clipboard unavailable in this browser.', 'error');
    }
  }

  // ============================================================================
  // DATA LOADERS
  // ============================================================================
  async function loadAllData() {
    var q = new URLSearchParams();
    Object.keys(S.filters).forEach(function (k) {
      if (S.filters[k]) q.set(k, S.filters[k]);
    });
    var qs = q.toString() ? ('?' + q.toString()) : '';
    var results = await Promise.all([
      api('/api/admin/study/taxonomy').catch(function () { return { nodes: [] }; }),
      api('/api/admin/study/articles' + qs).catch(function () { return { items: [], kpis: S.kpis }; }),
      api('/api/admin/jobs/snippets').catch(function () { return { items: [] }; }),
      api('/api/admin/study/job-options').catch(function () { return { items: [] }; }),
      api('/api/admin/study/doubts?status=' + encodeURIComponent(S.doubtsFilter)).catch(function () { return { items: [], open_count: 0 }; }),
      api('/api/admin/mock-tests?limit=100').catch(function () { return { items: [], kpis: S.cbtKpis }; })
    ]);
    S.taxonomyNodes = results[0].nodes || [];
    S.articles = results[1].items || [];
    S.kpis = results[1].kpis || S.kpis;
    S.snippets = results[2].items || [];
    S.jobOptions = results[3].items || [];
    S.doubts = results[4].items || [];
    S.doubtsOpenCount = Number(results[4].open_count || S.kpis.open_doubts || 0);
    S.cbtTests = results[5].items || [];
    S.cbtKpis = results[5].kpis || {
      total_tests: S.cbtTests.length,
      published_tests: S.cbtTests.filter(function (t) { return t.status === 'published'; }).length,
      total_questions: S.cbtTests.reduce(function (n, t) { return n + Number(t.question_count || 0); }, 0),
      total_attempts: S.cbtTests.reduce(function (n, t) { return n + Number(t.attempt_count || 0); }, 0)
    };
    if (S.cbtSelectedTestId) {
      await loadCbtQuestions(S.cbtSelectedTestId);
    }
    if (window.CSOStudio && window.CSOStudio.setStudyCount) {
      window.CSOStudio.setStudyCount(S.kpis.total_modules || S.articles.length);
    }
    if (window.CSOStudio && window.CSOStudio.setStudyTrackNodes) {
      window.CSOStudio.setStudyTrackNodes(S.taxonomyNodes);
    }
  }

  async function refreshAndRender() {
    try {
      await loadAllData();
      renderWorkspace();
    } catch (e) {
      toast(e.message || 'Failed to load Study Library studio.', 'error');
    }
  }

  // ============================================================================
  // HEADER ACTIONS & TOP TABS
  // ============================================================================
  function renderHeaderActions() {
    if (!S.headerActions) return;
    clear(S.headerActions);

    var btnNew = el('button', 'stps-btn stps-btn-primary', '+ Publish New Study Material');
    btnNew.type = 'button';
    btnNew.addEventListener('click', function () {
      openComposer(null);
    });

    var btnBulk = el('button', 'stps-btn', '📥 Bulk CSV/JSON Import');
    btnBulk.type = 'button';
    btnBulk.addEventListener('click', function () {
      if (window.CSOPublishTools && window.CSOPublishTools.openBulkImporter) {
        window.CSOPublishTools.openBulkImporter('study', function () { refreshAndRender(); });
      }
    });

    var btnPortal = el('a', 'stps-btn', 'View Live Study Portal ↗');
    btnPortal.href = '/study-library/?refresh=1';
    btnPortal.target = '_blank';
    btnPortal.rel = 'noopener noreferrer';

    var btnRefresh = el('button', 'stps-btn', '↻ Sync D1');
    btnRefresh.type = 'button';
    btnRefresh.addEventListener('click', function () {
      refreshAndRender();
      toast('Synced Study Library from live D1.', 'info');
    });

    S.headerActions.append(btnNew, btnBulk, btnPortal, btnRefresh);
  }

  function renderTabs(container) {
    var syncBanner = el('div', 'stps-live-sync-banner');
    syncBanner.setAttribute('role', 'status');
    syncBanner.appendChild(el('span', 'stps-live-sync-dot'));
    syncBanner.appendChild(el('span', '', 'Live Synced to Public Study Library ▾ Menu — Every track or resource publish immediately purges edge caches & updates the public dropdown.'));
    container.appendChild(syncBanner);

    var tabs = el('div', 'stps-tabs');
    tabs.setAttribute('role', 'tablist');
    var defs = [
      { id: 'articles', label: '📚 Published & Draft Study Materials', count: S.kpis.total_modules || 0 },
      { id: 'mock_tests', label: '📝 CBT Mock Tests', count: S.cbtKpis.total_tests || S.cbtTests.length || 0 },
      { id: 'taxonomy', label: '🗂 3-Layer Curriculum Hierarchy', count: S.taxonomyNodes.length },
      { id: 'snippets', label: '🧩 Reusable Bilingual Snippets', count: S.snippets.length },
      { id: 'doubts', label: '💬 Reader Doubts & PYQ Corrections', count: S.doubtsOpenCount, alert: S.doubtsOpenCount > 0 }
    ];
    defs.forEach(function (d) {
      var b = el('button', 'stps-tab-btn' + (S.activeTab === d.id && !S.composerOpen ? ' is-active' : ''));
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(S.activeTab === d.id && !S.composerOpen));
      b.appendChild(el('span', '', d.label));
      b.appendChild(el('span', 'stps-tab-badge' + (d.alert ? ' is-alert' : ''), String(d.count)));
      b.addEventListener('click', function () {
        S.composerOpen = false;
        S.activeTab = d.id;
        renderWorkspace();
      });
      tabs.appendChild(b);
    });
    container.appendChild(tabs);
  }

  // ============================================================================
  // TAB 1: ARTICLES MANAGER (KPIs + 3-Layer Filters + Table)
  // ============================================================================
  function renderArticlesTab(container) {
    var kpiGrid = el('div', 'stps-kpi-grid');
    [
      ['Total Study Modules', S.kpis.total_modules || 0, ''],
      ['Published Live', S.kpis.published_live || 0, 'is-emerald'],
      ['Scheduled / Drafts', S.kpis.scheduled_drafts || 0, 'is-amber'],
      ['PYQ & Syllabus Sets', S.kpis.pyq_syllabus_sets || 0, 'is-cobalt'],
      ['PDF Downloads / Completions', (S.kpis.total_pdf_downloads || 0) + ' / ' + (S.kpis.total_completions || 0), 'is-violet'],
      ['Open Reader Doubts', S.doubtsOpenCount || 0, 'is-rose']
    ].forEach(function (k) {
      var c = el('div', 'stps-kpi ' + k[2]);
      c.appendChild(el('span', 'stps-kpi-label', k[0]));
      c.appendChild(el('strong', 'stps-kpi-val', String(k[1])));
      kpiGrid.appendChild(c);
    });
    container.appendChild(kpiGrid);

    var fbar = el('div', 'stps-filter-bar');

    var selL1 = el('select', 'stps-select');
    selL1.setAttribute('aria-label', 'Filter by Exam Track (Level 1)');
    selL1.appendChild(new Option('All Exam Tracks (L1)', ''));
    nodesByLevel(1).filter(function (n) { return Number(n.is_published) !== 0; }).forEach(function (n) { selL1.appendChild(new Option(n.title_en, n.id)); });
    selL1.value = S.filters.l1;
    selL1.addEventListener('change', function () {
      S.filters.l1 = selL1.value;
      S.filters.l2 = '';
      S.filters.l3 = '';
      refreshAndRender();
    });

    var selL2 = el('select', 'stps-select');
    selL2.setAttribute('aria-label', 'Filter by Subject / Paper (Level 2)');
    selL2.appendChild(new Option('All Subjects / Papers (L2)', ''));
    if (S.filters.l1) {
      nodesByLevel(2, S.filters.l1).forEach(function (n) { selL2.appendChild(new Option(n.title_en, n.id)); });
    }
    selL2.value = S.filters.l2;
    selL2.addEventListener('change', function () {
      S.filters.l2 = selL2.value;
      S.filters.l3 = '';
      refreshAndRender();
    });

    var selL3 = el('select', 'stps-select');
    selL3.setAttribute('aria-label', 'Filter by Chapter / Format (Level 3)');
    selL3.appendChild(new Option('All Chapters / Formats (L3)', ''));
    if (S.filters.l2) {
      nodesByLevel(3, S.filters.l2).forEach(function (n) { selL3.appendChild(new Option(n.title_en, n.id)); });
    }
    selL3.value = S.filters.l3;
    selL3.addEventListener('change', function () {
      S.filters.l3 = selL3.value;
      refreshAndRender();
    });

    var selType = el('select', 'stps-select');
    selType.setAttribute('aria-label', 'Filter by Resource Type');
    selType.appendChild(new Option('All Resource Types', ''));
    RESOURCE_TYPES.forEach(function (t) { selType.appendChild(new Option(t, t)); });
    selType.value = S.filters.type;
    selType.addEventListener('change', function () { S.filters.type = selType.value; refreshAndRender(); });

    var selDiff = el('select', 'stps-select');
    selDiff.setAttribute('aria-label', 'Filter by Difficulty');
    selDiff.appendChild(new Option('All Difficulty', ''));
    DIFFICULTY_LEVELS.forEach(function (d) { selDiff.appendChild(new Option(d, d)); });
    selDiff.value = S.filters.difficulty;
    selDiff.addEventListener('change', function () { S.filters.difficulty = selDiff.value; refreshAndRender(); });

    var selPrio = el('select', 'stps-select');
    selPrio.setAttribute('aria-label', 'Filter by High-Yield Priority');
    selPrio.appendChild(new Option('All Yield Priority', ''));
    HIGH_YIELD_PRIORITIES.forEach(function (p) { selPrio.appendChild(new Option(p, p)); });
    selPrio.value = S.filters.priority;
    selPrio.addEventListener('change', function () { S.filters.priority = selPrio.value; refreshAndRender(); });

    var selStat = el('select', 'stps-select');
    selStat.setAttribute('aria-label', 'Filter by Publication Status');
    [['', 'All Status'], ['published', 'Published'], ['scheduled', 'Scheduled'], ['draft', 'Draft']].forEach(function (p) {
      selStat.appendChild(new Option(p[1], p[0]));
    });
    selStat.value = S.filters.status;
    selStat.addEventListener('change', function () { S.filters.status = selStat.value; refreshAndRender(); });

    var searchInp = el('input', 'stps-input stps-filter-search');
    searchInp.type = 'search';
    searchInp.placeholder = 'Search title, exam board, paper code, PYQ year...';
    searchInp.value = S.filters.search;
    searchInp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { S.filters.search = searchInp.value.trim(); refreshAndRender(); }
    });

    var btnGo = el('button', 'stps-btn', 'Filter');
    btnGo.type = 'button';
    btnGo.addEventListener('click', function () { S.filters.search = searchInp.value.trim(); refreshAndRender(); });

    fbar.append(selL1, selL2, selL3, selType, selDiff, selPrio, selStat, searchInp, btnGo);
    container.appendChild(fbar);

    if (!S.articles.length) {
      var emp = el('div', 'stps-empty');
      emp.appendChild(el('p', '', 'No study modules match your filters yet. Click "+ Publish New Study Material" to author syllabi, study notes, PYQs, flashcards & practice quizzes.'));
      var btnStart = el('button', 'stps-btn stps-btn-primary', '+ Publish New Study Material');
      btnStart.type = 'button';
      btnStart.addEventListener('click', function () { openComposer(null); });
      emp.appendChild(btnStart);
      container.appendChild(emp);
      return;
    }

    var wrap = el('div', 'stps-table-wrap');
    var table = el('table', 'stps-table');
    var thead = el('thead');
    var hr = el('tr');
    ['Study Module & Slug', '3-Layer Curriculum Breadcrumb', 'Type & Yield', 'Read Time & Medium', 'Status & Telemetry', 'Actions'].forEach(function (h) {
      hr.appendChild(el('th', '', h));
    });
    thead.appendChild(hr);
    table.appendChild(thead);

    var tbody = el('tbody');
    S.articles.forEach(function (a) {
      var tr = el('tr');

      var tdTitle = el('td');
      tdTitle.appendChild(el('div', 'stps-row-title', a.title_en));
      if (a.title_or) tdTitle.appendChild(el('div', 'stps-row-sub', a.title_or));
      tdTitle.appendChild(el('div', 'stps-row-sub', '/study-library/?slug=' + a.slug + (a.paper_code ? ' · ' + a.paper_code : '') + (a.pyq_year ? ' · PYQ ' + a.pyq_year : '')));
      tr.appendChild(tdTitle);

      var tdCrumb = el('td');
      var cr = el('div', 'stps-crumb');
      var parts = [
        (a.taxonomy && a.taxonomy.l1 && a.taxonomy.l1.title_en) || nodeName(a.category_l1_id),
        (a.taxonomy && a.taxonomy.l2 && a.taxonomy.l2.title_en) || nodeName(a.category_l2_id),
        (a.taxonomy && a.taxonomy.l3 && a.taxonomy.l3.title_en) || nodeName(a.category_l3_id)
      ].filter(Boolean);
      cr.textContent = parts.length ? parts.join(' › ') : 'Unassigned';
      tdCrumb.appendChild(cr);
      if (a.exam_board_tag) tdCrumb.appendChild(el('div', 'stps-row-sub', a.exam_board_tag));
      tr.appendChild(tdCrumb);

      var tdType = el('td');
      tdType.appendChild(el('span', 'stps-pill', a.resource_type_badge || 'Study Notes'));
      tdType.appendChild(document.createTextNode(' '));
      var prioCls = a.high_yield_priority === 'Must-Study' ? 'is-must' : (a.high_yield_priority === 'High' ? 'is-high' : '');
      tdType.appendChild(el('span', 'stps-pill ' + prioCls, a.high_yield_priority || 'High'));
      tdType.appendChild(el('div', 'stps-row-sub', (a.difficulty_level || 'Moderate') + ' · ' + (a.mcq_count || 0) + ' MCQs · ' + (a.flashcard_count || 0) + ' Cards'));
      tr.appendChild(tdType);

      var tdTime = el('td');
      tdTime.appendChild(el('div', '', (a.estimated_read_mins || 10) + ' mins read'));
      tdTime.appendChild(el('div', 'stps-row-sub', a.language_medium || 'Bilingual (EN + OR)'));
      tr.appendChild(tdTime);

      var tdTel = el('td');
      tdTel.appendChild(el('span', 'stps-pill is-' + a.status, a.status.toUpperCase()));
      var tel = el('div', 'stps-telemetry');
      tel.appendChild(el('span', '', '👁 ' + (a.views_count || 0)));
      tel.appendChild(el('span', '', '⬇ ' + (a.pdf_downloads_count || 0)));
      tel.appendChild(el('span', '', '✅ ' + (a.completions_count || 0)));
      tel.appendChild(el('span', '', '🔖 ' + (a.bookmarks_count || 0)));
      tdTel.appendChild(tel);
      tr.appendChild(tdTel);

      var tdAct = el('td');
      var acts = el('div', 'stps-actions');

      var bEdit = el('button', 'stps-btn stps-btn-sm stps-btn-primary', 'Edit');
      bEdit.type = 'button';
      bEdit.addEventListener('click', function () { loadArticleIntoComposer(a.id); });

      var bPrev = el('button', 'stps-btn stps-btn-sm', 'Preview ↗');
      bPrev.type = 'button';
      bPrev.addEventListener('click', function () { openPublicPreviewById(a.id, a.slug, a.is_published); });

      var bDup = el('button', 'stps-btn stps-btn-sm', 'Duplicate');
      bDup.type = 'button';
      bDup.addEventListener('click', function () {
        if (window.CSOPublishTools && window.CSOPublishTools.duplicateItem) {
          window.CSOPublishTools.duplicateItem('study', a.id, function (cloned) {
            refreshAndRender().then(function () { if (cloned && cloned.id) loadArticleIntoComposer(cloned.id); });
          });
        }
      });

      var bCopy = el('button', 'stps-btn stps-btn-sm', 'Alert Copy');
      bCopy.type = 'button';
      bCopy.addEventListener('click', function () { copyBroadcast(a); });

      var bDel = el('button', 'stps-btn stps-btn-sm stps-btn-danger', 'Delete');
      bDel.type = 'button';
      bDel.addEventListener('click', async function () {
        if (!window.confirm('Delete study module "' + a.title_en + '" permanently?')) return;
        try {
          await api('/api/admin/study/articles/' + encodeURIComponent(a.id), { method: 'DELETE' });
          toast('Study module deleted and public caches invalidated.', 'success');
          refreshAndRender();
        } catch (err) {
          toast(err.message, 'error');
        }
      });

      acts.append(bEdit, bPrev, bDup, bCopy, bDel);
      tdAct.appendChild(acts);
      tr.appendChild(tdAct);
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    wrap.appendChild(table);
    container.appendChild(wrap);
  }

  async function openPublicPreviewById(id, slug, isPublished) {
    try {
      if (isPublished) {
        window.open('/study-library/?slug=' + encodeURIComponent(slug) + '&refresh=1', '_blank', 'noopener');
        return;
      }
      var res = await api('/api/admin/study/' + encodeURIComponent(id) + '/preview-token', { method: 'POST', body: {} });
      window.open(res.preview_url, '_blank', 'noopener');
      toast('Opened real public-page draft preview (expires in 2h).', 'success');
    } catch (e) {
      toast(e.message || 'Could not mint preview token.', 'error');
    }
  }

  async function loadArticleIntoComposer(id) {
    try {
      var res = await api('/api/admin/study/articles/' + encodeURIComponent(id));
      S.revisions = res.revisions || [];
      openComposer(res.item);
    } catch (e) {
      toast(e.message || 'Failed to load study module.', 'error');
    }
  }

  function openComposer(item) {
    S.editingArticle = item ? JSON.parse(JSON.stringify(item)) : {
      id: '',
      slug: '',
      category_l1_id: '',
      category_l2_id: '',
      category_l3_id: '',
      resource_type_badge: 'Study Notes',
      difficulty_level: 'Moderate',
      high_yield_priority: 'High',
      estimated_read_mins: 12,
      negative_marking_rule: '-0.25 (OSSC/OSSSC)',
      title_en: '',
      title_or: '',
      subtitle_en: '',
      subtitle_or: '',
      summary_en: '',
      summary_or: '',
      exam_board_tag: '',
      paper_code: '',
      pyq_year: '',
      language_medium: 'Bilingual (EN + OR)',
      cover_image_url: '',
      cover_image_caption: '',
      article_body_en: '',
      article_body_or: '',
      syllabus_topics: [],
      key_facts_table: [],
      pyq_analysis: [],
      practice_mcqs: [],
      reference_links: [],
      linked_job_ids: [],
      notes_pdf_url: '',
      pyq_pdf_url: '',
      answer_key_pdf_url: '',
      pdf_index_bookmarks: [],
      extra_attachments: [],
      edition_note_en: '',
      edition_note_or: '',
      scheduled_publish_at: '',
      is_featured: false,
      is_free_access: true,
      is_published: false
    };
    if (!item) S.revisions = [];
    S.extractedDraft = null;
    S.composerOpen = true;
    renderWorkspace();
  }

  // ============================================================================
  // INLINE QUICK-CREATE TAXONOMY MODAL (L1 / L2 / L3)
  // ============================================================================
  function openQuickAddTaxonomyModal(level, parentId, onCreated) {
    var modal = document.getElementById('globalModal');
    var titleEl = document.getElementById('modalTitle');
    var bodyEl = document.getElementById('modalBody');
    var footEl = document.getElementById('modalFooter');
    if (!modal || !bodyEl || !footEl) return;

    var labelMap = { 1: 'Exam Track / Stream (Level 1)', 2: 'Subject / Paper (Level 2)', 3: 'Chapter / Resource Format (Level 3)' };
    titleEl.textContent = '+ Add ' + labelMap[level];
    clear(bodyEl);
    clear(footEl);

    var fEn = el('input', 'stps-input'); fEn.placeholder = 'English title (e.g. Odisha Economy & Budget)';
    var fOr = el('input', 'stps-input'); fOr.placeholder = 'ଓଡ଼ିଆ ଶୀର୍ଷକ (Optional)';
    var fSub = el('input', 'stps-input'); fSub.placeholder = 'Short subtitle (EN)';
    var fIcon = el('input', 'stps-input'); fIcon.placeholder = 'Emoji icon (e.g. 📘)'; fIcon.value = level === 1 ? '🎓' : (level === 2 ? '📚' : '📝');
    var fAcc = el('select', 'stps-select');
    ACCENTS.forEach(function (a) { fAcc.appendChild(new Option(a, a)); });

    [
      ['Title (English) *', fEn],
      ['Title (ଓଡ଼ିଆ)', fOr],
      ['Subtitle (EN)', fSub],
      ['Icon', fIcon],
      ['Accent Color', fAcc]
    ].forEach(function (pair) {
      var fg = el('div', 'stps-field');
      fg.appendChild(el('label', '', pair[0]));
      fg.appendChild(pair[1]);
      bodyEl.appendChild(fg);
    });

    var btnCancel = el('button', 'stps-btn', 'Cancel');
    btnCancel.type = 'button';
    btnCancel.addEventListener('click', function () { modal.hidden = true; });

    var btnSave = el('button', 'stps-btn stps-btn-primary', 'Create & Select');
    btnSave.type = 'button';
    btnSave.addEventListener('click', async function () {
      var t = fEn.value.trim();
      if (!t) { toast('English title is required.', 'error'); return; }
      try {
        var res = await api('/api/admin/study/taxonomy', {
          method: 'POST',
          body: {
            level: level,
            parent_id: level === 1 ? null : parentId,
            title_en: t,
            title_or: fOr.value.trim(),
            subtitle_en: fSub.value.trim(),
            icon: fIcon.value.trim(),
            accent_variant: fAcc.value,
            is_published: 1
          }
        });
        modal.hidden = true;
        var taxRes = await api('/api/admin/study/taxonomy');
        S.taxonomyNodes = taxRes.nodes || [];
        toast('Created "' + t + '" in 3-layer curriculum taxonomy.', 'success');
        if (typeof onCreated === 'function') onCreated(res.node);
      } catch (e) {
        toast(e.message, 'error');
      }
    });

    footEl.append(btnCancel, btnSave);
    modal.hidden = false;
  }

  // ============================================================================
  // EDITORIAL COMPOSER (10 CAPABILITIES)
  // ============================================================================
  function renderComposer(container) {
    var a = S.editingArticle;
    var wrap = el('div', 'stps-composer');

    // Top navigation bar
    var topBar = el('div', 'stps-section-head');
    var btnBack = el('button', 'stps-btn', '← Back to Study Modules');
    btnBack.type = 'button';
    btnBack.addEventListener('click', function () { S.composerOpen = false; renderWorkspace(); });
    topBar.appendChild(btnBack);
    topBar.appendChild(el('h2', 'stps-section-title', a.id ? ('Edit Study Module: ' + a.title_en) : 'Publish New Study Material'));
    wrap.appendChild(topBar);

    // 1. Cascading 3-Layer Curriculum Selector with Inline "+ Add Option"
    var secTax = el('section', 'stps-section');
    secTax.appendChild(el('h3', 'stps-section-title', '1. 3-Layer Curriculum Taxonomy (Exam Track → Subject → Chapter / Format)'));
    var gTax = el('div', 'stps-grid-3');

    var selL1 = el('select', 'stps-select');
    var selL2 = el('select', 'stps-select');
    var selL3 = el('select', 'stps-select');

    function populateL1() {
      clear(selL1);
      selL1.appendChild(new Option('Select Exam Track (L1)...', ''));
      nodesByLevel(1).forEach(function (n) { selL1.appendChild(new Option((n.icon ? n.icon + ' ' : '') + n.title_en, n.id)); });
      selL1.value = a.category_l1_id || '';
    }
    function populateL2() {
      clear(selL2);
      selL2.appendChild(new Option('Select Subject / Paper (L2)...', ''));
      if (a.category_l1_id) {
        nodesByLevel(2, a.category_l1_id).forEach(function (n) { selL2.appendChild(new Option((n.icon ? n.icon + ' ' : '') + n.title_en, n.id)); });
      }
      selL2.value = a.category_l2_id || '';
    }
    function populateL3() {
      clear(selL3);
      selL3.appendChild(new Option('Select Chapter / Format (L3)...', ''));
      if (a.category_l2_id) {
        nodesByLevel(3, a.category_l2_id).forEach(function (n) { selL3.appendChild(new Option((n.icon ? n.icon + ' ' : '') + n.title_en, n.id)); });
      }
      selL3.value = a.category_l3_id || '';
    }

    populateL1(); populateL2(); populateL3();
    selL1.addEventListener('change', function () { a.category_l1_id = selL1.value; a.category_l2_id = ''; a.category_l3_id = ''; populateL2(); populateL3(); });
    selL2.addEventListener('change', function () { a.category_l2_id = selL2.value; a.category_l3_id = ''; populateL3(); });
    selL3.addEventListener('change', function () { a.category_l3_id = selL3.value; });

    function makeTaxField(label, sel, btnText, lvl) {
      var f = el('div', 'stps-field');
      f.appendChild(el('label', '', label));
      var row = el('div', 'stps-inline-row');
      row.appendChild(sel);
      var btnAdd = el('button', 'stps-btn stps-btn-sm', btnText);
      btnAdd.type = 'button';
      btnAdd.addEventListener('click', function () {
        if (lvl === 2 && !a.category_l1_id) { toast('Select a Level-1 Exam Track first.', 'error'); return; }
        if (lvl === 3 && !a.category_l2_id) { toast('Select a Level-2 Subject first.', 'error'); return; }
        var pId = lvl === 2 ? a.category_l1_id : (lvl === 3 ? a.category_l2_id : null);
        openQuickAddTaxonomyModal(lvl, pId, function (node) {
          if (lvl === 1) { a.category_l1_id = node.id; a.category_l2_id = ''; a.category_l3_id = ''; }
          if (lvl === 2) { a.category_l2_id = node.id; a.category_l3_id = ''; }
          if (lvl === 3) { a.category_l3_id = node.id; }
          populateL1(); populateL2(); populateL3();
        });
      });
      row.appendChild(btnAdd);
      f.appendChild(row);
      return f;
    }

    gTax.append(
      makeTaxField('Exam Track / Stream (L1)', selL1, '+ Add Exam Track', 1),
      makeTaxField('Subject / Paper (L2)', selL2, '+ Add Subject', 2),
      makeTaxField('Chapter / Resource Format (L3)', selL3, '+ Add Chapter / Format', 3)
    );
    secTax.appendChild(gTax);
    wrap.appendChild(secTax);

    // 2. Identity, Metadata & PDF-to-Study-Notes Auto-Draft Helper
    var secMeta = el('section', 'stps-section');
    secMeta.appendChild(el('h3', 'stps-section-title', '2. Curriculum Metadata, Cover Banner & PDF-to-Study-Notes Auto-Draft'));

    var titleEnInp = el('input', 'stps-input'); titleEnInp.value = a.title_en || ''; titleEnInp.placeholder = 'e.g. Odisha Modern History & Paika Rebellion — Complete OPSC OAS Notes';
    var titleOrInp = el('input', 'stps-input'); titleOrInp.value = a.title_or || ''; titleOrInp.placeholder = 'ଓଡ଼ିଆ ଶୀର୍ଷକ (e.g. ଆଧୁନିକ ଓଡ଼ିଶା ଇତିହାସ ଓ ପାଇକ ବିଦ୍ରୋହ)';
    var slugInp = el('input', 'stps-input'); slugInp.value = a.slug || ''; slugInp.placeholder = 'auto-generated-from-title';
    titleEnInp.addEventListener('input', function () {
      a.title_en = titleEnInp.value;
      if (!a.id && !slugInp.dataset.touched) { slugInp.value = slugify(a.title_en); a.slug = slugInp.value; }
    });
    titleOrInp.addEventListener('input', function () { a.title_or = titleOrInp.value; });
    slugInp.addEventListener('input', function () { slugInp.dataset.touched = '1'; a.slug = slugInp.value; });

    var subEnInp = el('input', 'stps-input'); subEnInp.value = a.subtitle_en || ''; subEnInp.placeholder = 'Subtitle / Chapter Number (EN)';
    subEnInp.addEventListener('input', function () { a.subtitle_en = subEnInp.value; });
    var subOrInp = el('input', 'stps-input'); subOrInp.value = a.subtitle_or || ''; subOrInp.placeholder = 'ଉପଶୀର୍ଷକ (ଓଡ଼ିଆ)';
    subOrInp.addEventListener('input', function () { a.subtitle_or = subOrInp.value; });

    var boardInp = el('input', 'stps-input'); boardInp.value = a.exam_board_tag || ''; boardInp.placeholder = 'e.g. OPSC / OSSC / OSSSC / BSE Odisha';
    boardInp.addEventListener('input', function () { a.exam_board_tag = boardInp.value; });
    var paperInp = el('input', 'stps-input'); paperInp.value = a.paper_code || ''; paperInp.placeholder = 'e.g. GS-I / Paper-2';
    paperInp.addEventListener('input', function () { a.paper_code = paperInp.value; });
    var pyqYrInp = el('input', 'stps-input'); pyqYrInp.value = a.pyq_year || ''; pyqYrInp.placeholder = 'e.g. 2025 or 2019–2025';
    pyqYrInp.addEventListener('input', function () { a.pyq_year = pyqYrInp.value; });

    var resTypeSel = el('select', 'stps-select');
    RESOURCE_TYPES.forEach(function (t) { resTypeSel.appendChild(new Option(t, t)); });
    resTypeSel.value = a.resource_type_badge || 'Study Notes';
    resTypeSel.addEventListener('change', function () { a.resource_type_badge = resTypeSel.value; });

    var diffSel = el('select', 'stps-select');
    DIFFICULTY_LEVELS.forEach(function (d) { diffSel.appendChild(new Option(d, d)); });
    diffSel.value = a.difficulty_level || 'Moderate';
    diffSel.addEventListener('change', function () { a.difficulty_level = diffSel.value; });

    var prioSel = el('select', 'stps-select');
    HIGH_YIELD_PRIORITIES.forEach(function (p) { prioSel.appendChild(new Option(p, p)); });
    prioSel.value = a.high_yield_priority || 'High';
    prioSel.addEventListener('change', function () { a.high_yield_priority = prioSel.value; });

    var readMinInp = el('input', 'stps-input'); readMinInp.type = 'number'; readMinInp.min = '1'; readMinInp.max = '240'; readMinInp.value = String(a.estimated_read_mins || 10);
    readMinInp.addEventListener('input', function () { a.estimated_read_mins = Number(readMinInp.value) || 10; });

    var negSel = el('select', 'stps-select');
    NEGATIVE_RULES.forEach(function (r) { negSel.appendChild(new Option(r, r)); });
    negSel.value = a.negative_marking_rule || 'None';
    negSel.addEventListener('change', function () { a.negative_marking_rule = negSel.value; });

    var medSel = el('select', 'stps-select');
    MEDIUMS.forEach(function (m) { medSel.appendChild(new Option(m, m)); });
    medSel.value = a.language_medium || 'Bilingual (EN + OR)';
    medSel.addEventListener('change', function () { a.language_medium = medSel.value; });

    var sumEn = el('textarea', 'stps-textarea'); sumEn.rows = 3; sumEn.value = a.summary_en || ''; sumEn.placeholder = 'Concise English summary (shown on Study Library cards & SEO meta)';
    sumEn.addEventListener('input', function () { a.summary_en = sumEn.value; });
    var sumOr = el('textarea', 'stps-textarea'); sumOr.rows = 3; sumOr.value = a.summary_or || ''; sumOr.placeholder = 'ଓଡ଼ିଆରେ ସଂକ୍ଷିପ୍ତ ବିବରଣୀ';
    sumOr.addEventListener('input', function () { a.summary_or = sumOr.value; });

    function fld(lbl, ctrl) {
      var d = el('div', 'stps-field');
      d.appendChild(el('label', '', lbl));
      d.appendChild(ctrl);
      return d;
    }

    var gMeta1 = el('div', 'stps-grid-2');
    gMeta1.append(fld('Title (English) *', titleEnInp), fld('Title (ଓଡ଼ିଆ)', titleOrInp), fld('URL Slug', slugInp), fld('Exam Board Tag', boardInp));
    var gMeta2 = el('div', 'stps-grid-3');
    gMeta2.append(
      fld('Subtitle (EN)', subEnInp), fld('Subtitle (ଓଡ଼ିଆ)', subOrInp), fld('Paper Code', paperInp),
      fld('PYQ Year / Cycle', pyqYrInp), fld('Resource Type Badge', resTypeSel), fld('Difficulty Level', diffSel),
      fld('High-Yield Priority', prioSel), fld('Estimated Read (mins)', readMinInp), fld('Negative Marking Rule', negSel),
      fld('Language Medium', medSel)
    );
    var gSum = el('div', 'stps-grid-2');
    gSum.append(fld('Executive Summary (EN)', sumEn), fld('Executive Summary (ଓଡ଼ିଆ)', sumOr));
    secMeta.append(gMeta1, gMeta2, gSum);

    // Cover Banner Photo Upload + Live Preview
    var gMedia = el('div', 'stps-grid-2');
    var coverBox = el('div', 'stps-dropzone');
    coverBox.appendChild(el('strong', '', '🖼 Cover Banner Photo (Direct R2 Upload)'));
    var coverUrlInp = el('input', 'stps-input'); coverUrlInp.value = a.cover_image_url || ''; coverUrlInp.placeholder = '/api/media/study-publishing/...';
    coverUrlInp.addEventListener('input', function () { a.cover_image_url = coverUrlInp.value; updateCoverImg(); });
    var coverCapInp = el('input', 'stps-input'); coverCapInp.value = a.cover_image_caption || ''; coverCapInp.placeholder = 'Cover photo caption / credit';
    coverCapInp.addEventListener('input', function () { a.cover_image_caption = coverCapInp.value; });
    var coverFile = el('input', 'stps-input'); coverFile.type = 'file'; coverFile.accept = 'image/jpeg,image/png,image/webp';
    var coverPreviewWrap = el('div');
    function updateCoverImg() {
      clear(coverPreviewWrap);
      if (a.cover_image_url) {
        var img = el('img', 'stps-cover-preview');
        img.src = a.cover_image_url;
        img.alt = a.cover_image_caption || 'Study cover preview';
        coverPreviewWrap.appendChild(img);
      }
    }
    updateCoverImg();
    coverFile.addEventListener('change', async function () {
      if (!coverFile.files || !coverFile.files[0]) return;
      await uploadStudyFile(coverFile.files[0], 'cover', function (res) {
        a.cover_image_url = res.url;
        coverUrlInp.value = res.url;
        updateCoverImg();
      });
    });
    coverBox.append(coverFile, coverUrlInp, coverCapInp, coverPreviewWrap);

    // PDF-to-Study-Notes Auto-Draft Dropzone
    var pdfAutoBox = el('div', 'stps-dropzone');
    pdfAutoBox.appendChild(el('strong', '', '📄 Primary Study Notes / PYQ / Syllabus PDF + Auto-Draft Extractor'));
    pdfAutoBox.appendChild(el('span', 'stps-row-sub', 'Drop or select a PDF to upload to Cloudflare R2 and auto-extract Title, Exam Board, Paper Code, PYQ Year & Summary.'));
    var primaryPdfFile = el('input', 'stps-input'); primaryPdfFile.type = 'file'; primaryPdfFile.accept = 'application/pdf';
    var autoDraftSlot = el('div');
    function renderAutoDraftBanner() {
      clear(autoDraftSlot);
      if (!S.extractedDraft) return;
      var d = S.extractedDraft;
      var bar = el('div', 'stps-autodraft-bar');
      bar.appendChild(el('span', '', '✨ Extracted from PDF: ' + [d.exam_board_tag, d.paper_code, d.pyq_year, d.resource_type_badge].filter(Boolean).join(' · ')));
      var btnApply = el('button', 'stps-btn stps-btn-sm stps-btn-emerald', 'One-Click Pre-Fill Fields');
      btnApply.type = 'button';
      btnApply.addEventListener('click', function () {
        if (d.title_en && !a.title_en) { a.title_en = d.title_en; titleEnInp.value = d.title_en; if (!a.slug) { a.slug = slugify(d.title_en); slugInp.value = a.slug; } }
        if (d.exam_board_tag) { a.exam_board_tag = d.exam_board_tag; boardInp.value = d.exam_board_tag; }
        if (d.paper_code) { a.paper_code = d.paper_code; paperInp.value = d.paper_code; }
        if (d.pyq_year) { a.pyq_year = d.pyq_year; pyqYrInp.value = d.pyq_year; }
        if (d.resource_type_badge) { a.resource_type_badge = d.resource_type_badge; resTypeSel.value = d.resource_type_badge; }
        if (d.summary_en && !a.summary_en) { a.summary_en = d.summary_en; sumEn.value = d.summary_en; }
        if (d.estimated_read_mins) { a.estimated_read_mins = d.estimated_read_mins; readMinInp.value = String(d.estimated_read_mins); }
        toast('Pre-filled study metadata from uploaded PDF.', 'success');
      });
      bar.appendChild(btnApply);
      autoDraftSlot.appendChild(bar);
    }
    primaryPdfFile.addEventListener('change', async function () {
      if (!primaryPdfFile.files || !primaryPdfFile.files[0]) return;
      await uploadStudyFile(primaryPdfFile.files[0], 'notes-pdf', function (res) {
        a.notes_pdf_url = res.url;
        if (notesPdfInp) notesPdfInp.value = res.url;
        if (res.extracted_draft) {
          S.extractedDraft = res.extracted_draft;
          renderAutoDraftBanner();
        }
      });
    });
    pdfAutoBox.append(primaryPdfFile, autoDraftSlot);
    gMedia.append(coverBox, pdfAutoBox);
    secMeta.appendChild(gMedia);
    wrap.appendChild(secMeta);

    // 3. Rich Bilingual Lesson & Notes Editor + Reusable Snippets Drawer
    var secBody = el('section', 'stps-section');
    var bodyHead = el('div', 'stps-section-head');
    bodyHead.appendChild(el('h3', 'stps-section-title', '3. Rich Bilingual Lesson & Study Notes Editor (EN & ଓଡ଼ିଆ) + Snippets'));
    var snipWrap = el('div', 'stps-inline-row');
    var snipSel = el('select', 'stps-select');
    snipSel.appendChild(new Option('Insert Reusable Snippet...', ''));
    S.snippets.forEach(function (sn) {
      snipSel.appendChild(new Option('[' + (sn.category || 'general') + '] ' + sn.title_en, sn.id));
    });
    var btnInsertSnip = el('button', 'stps-btn stps-btn-sm stps-btn-emerald', '+ Insert Snippet');
    btnInsertSnip.type = 'button';
    btnInsertSnip.addEventListener('click', function () {
      var sn = S.snippets.find(function (x) { return x.id === snipSel.value; });
      if (!sn) { toast('Choose a snippet first.', 'error'); return; }
      a.article_body_en = (a.article_body_en ? a.article_body_en + '\n\n' : '') + (sn.body_en || '');
      a.article_body_or = (a.article_body_or ? a.article_body_or + '\n\n' : '') + (sn.body_or || '');
      bodyEnTa.value = a.article_body_en;
      bodyOrTa.value = a.article_body_or;
      toast('Inserted "' + sn.title_en + '" into EN & ଓଡ଼ିଆ lesson bodies.', 'success');
    });
    snipWrap.append(snipSel, btnInsertSnip);
    bodyHead.appendChild(snipWrap);
    secBody.appendChild(bodyHead);

    var bodyEnTa = el('textarea', 'stps-textarea'); bodyEnTa.rows = 10; bodyEnTa.value = a.article_body_en || '';
    bodyEnTa.placeholder = 'Write structured lesson content using ## Headings, **Bold**, - Bullet Lists, > Callout Boxes, [Link Text](https://...), ![Caption](/api/media/...)';
    bodyEnTa.addEventListener('input', function () { a.article_body_en = bodyEnTa.value; });

    var bodyOrTa = el('textarea', 'stps-textarea'); bodyOrTa.rows = 10; bodyOrTa.value = a.article_body_or || '';
    bodyOrTa.placeholder = 'ଓଡ଼ିଆରେ ସମ୍ପୂର୍ଣ୍ଣ ଅଧ୍ୟାୟ ନୋଟ୍ସ ଲେଖନ୍ତୁ...';
    bodyOrTa.addEventListener('input', function () { a.article_body_or = bodyOrTa.value; });

    function makeToolbar(targetTa, prop) {
      var tb = el('div', 'stps-toolbar');
      [
        ['H2', '\n## Section Heading\n'],
        ['Bold', '**Important Term**'],
        ['Bullet List', '\n- Point 1\n- Point 2\n'],
        ['Highlight Box', '\n> **High-Yield Callout:** Key exam takeaway here.\n'],
        ['Formula / Rule', '\n> **Formula / Rule:** Speed = Distance / Time\n'],
        ['Diagram / Photo', '\n![Diagram Caption](/api/media/study-publishing/diagram.png)\n'],
        ['Hyperlink', '[Official Reference](https://odisha.gov.in/)']
      ].forEach(function (tool) {
        var b = el('button', 'stps-btn stps-btn-sm', tool[0]);
        b.type = 'button';
        b.addEventListener('click', function () {
          var start = targetTa.selectionStart || targetTa.value.length;
          var end = targetTa.selectionEnd || start;
          targetTa.value = targetTa.value.slice(0, start) + tool[1] + targetTa.value.slice(end);
          a[prop] = targetTa.value;
          targetTa.focus();
        });
        tb.appendChild(b);
      });
      return tb;
    }

    var gBody = el('div', 'stps-grid-2');
    var bCol1 = el('div', 'stps-field');
    bCol1.append(el('label', '', 'Lesson & Notes Body (English)'), makeToolbar(bodyEnTa, 'article_body_en'), bodyEnTa);
    var bCol2 = el('div', 'stps-field');
    bCol2.append(el('label', '', 'Lesson & Notes Body (ଓଡ଼ିଆ)'), makeToolbar(bodyOrTa, 'article_body_or'), bodyOrTa);
    gBody.append(bCol1, bCol2);
    secBody.appendChild(gBody);
    wrap.appendChild(secBody);

    // 4. Structured Builders: Syllabus Units, Key Facts / Flashcards, PYQ Analysis, Interactive Practice MCQs
    wrap.appendChild(renderRepeaterSection(
      '4a. Syllabus Units & Marks Weightage Table',
      a.syllabus_topics,
      [
        { key: 'unit', label: 'Unit / Paper', ph: 'Unit 1' },
        { key: 'topic_en', label: 'Topic (EN)', ph: 'Ancient & Medieval Odisha' },
        { key: 'topic_or', label: 'Topic (ଓଡ଼ିଆ)', ph: 'ପ୍ରାଚୀନ ଓଡ଼ିଶା' },
        { key: 'weightage', label: 'Marks / Weightage', ph: '15–20 Marks' },
        { key: 'priority', label: 'Priority', ph: 'Must-Study' }
      ],
      function () { return { unit: '', topic_en: '', topic_or: '', weightage: '', priority: 'High' }; }
    ));

    wrap.appendChild(renderRepeaterSection(
      '4b. Key Facts, Formulas & Interactive Flip-Card Pairs (Powers Flip-Card Revision Mode)',
      a.key_facts_table,
      [
        { key: 'term_en', label: 'Front / Term (EN)', ph: 'Paika Rebellion Year & Leader' },
        { key: 'term_or', label: 'Term (ଓଡ଼ିଆ)', ph: 'ପାଇକ ବିଦ୍ରୋହ' },
        { key: 'fact_en', label: 'Back / Key Fact or Formula (EN)', ph: '1817, led by Bakshi Jagabandhu in Khordha' },
        { key: 'fact_or', label: 'Fact (ଓଡ଼ିଆ)', ph: '୧୮୧୭, ବକ୍ସି ଜଗବନ୍ଧୁ' },
        { key: 'tag', label: 'Tag', ph: 'History' }
      ],
      function () { return { term_en: '', term_or: '', fact_en: '', fact_or: '', tag: '' }; }
    ));

    wrap.appendChild(renderRepeaterSection(
      '4c. PYQ Year-Wise Trend & Cutoff Analysis Table',
      a.pyq_analysis,
      [
        { key: 'year', label: 'Exam Year', ph: '2024' },
        { key: 'exam', label: 'Exam Name', ph: 'OPSC OAS Prelims' },
        { key: 'questions_asked', label: 'Questions Asked', ph: '6 Qs' },
        { key: 'difficulty', label: 'Difficulty', ph: 'Moderate' },
        { key: 'cutoff_or_trend', label: 'Trend / Cutoff Note', ph: 'Focus on Ganga dynasty & temple architecture' }
      ],
      function () { return { year: '', exam: '', questions_asked: '', difficulty: 'Moderate', cutoff_or_trend: '' }; }
    ));

    wrap.appendChild(renderMcqBuilderSection(a));

    // 5. Link to Active Jobs ("Prepare for This Exam" Sync)
    var secJobs = el('section', 'stps-section');
    secJobs.appendChild(el('h3', 'stps-section-title', '5. Link to Active Jobs ("Prepare for This Exam" Kit Sync)'));
    secJobs.appendChild(el('span', 'stps-row-sub', 'Select active recruitment notices so this study module automatically appears inside their "Recommended Preparation Kit" and links back to the Job page.'));
    var jPick = el('div', 'stps-job-picker');
    if (!S.jobOptions.length) {
      jPick.appendChild(el('span', 'stps-row-sub', 'No Job Articles published yet. Create jobs in Jobs Publishing House (Alt+1) to cross-link.'));
    } else {
      S.jobOptions.forEach(function (j) {
        var lbl = el('label', 'stps-job-check');
        var cb = el('input'); cb.type = 'checkbox';
        cb.checked = Array.isArray(a.linked_job_ids) && a.linked_job_ids.indexOf(j.id) !== -1;
        cb.addEventListener('change', function () {
          if (!Array.isArray(a.linked_job_ids)) a.linked_job_ids = [];
          if (cb.checked) {
            if (a.linked_job_ids.indexOf(j.id) === -1) a.linked_job_ids.push(j.id);
          } else {
            a.linked_job_ids = a.linked_job_ids.filter(function (x) { return x !== j.id; });
          }
        });
        var info = el('div');
        info.appendChild(el('strong', '', j.title_en));
        info.appendChild(el('div', 'stps-row-sub', (j.organisation_en || '') + (j.last_date ? ' · Last Date: ' + j.last_date : '')));
        lbl.append(cb, info);
        jPick.appendChild(lbl);
      });
    }
    secJobs.appendChild(jPick);
    wrap.appendChild(secJobs);

    // 6. Direct R2 PDF Uploads, Quick-Jump Page Bookmarks & Reference Links
    var secPdf = el('section', 'stps-section');
    secPdf.appendChild(el('h3', 'stps-section-title', '6. Direct R2 PDF Uploads (Notes / PYQ / Answer Key) & Quick-Jump Bookmarks'));
    var gPdf = el('div', 'stps-grid-3');

    var notesPdfInp = el('input', 'stps-input'); notesPdfInp.value = a.notes_pdf_url || ''; notesPdfInp.placeholder = '/api/media/study-publishing/...';
    notesPdfInp.addEventListener('input', function () { a.notes_pdf_url = notesPdfInp.value; });
    var pyqPdfInp = el('input', 'stps-input'); pyqPdfInp.value = a.pyq_pdf_url || ''; pyqPdfInp.placeholder = '/api/media/study-publishing/...';
    pyqPdfInp.addEventListener('input', function () { a.pyq_pdf_url = pyqPdfInp.value; });
    var keyPdfInp = el('input', 'stps-input'); keyPdfInp.value = a.answer_key_pdf_url || ''; keyPdfInp.placeholder = '/api/media/study-publishing/...';
    keyPdfInp.addEventListener('input', function () { a.answer_key_pdf_url = keyPdfInp.value; });

    function makePdfUploader(title, inp, purpose, prop) {
      var box = el('div', 'stps-field');
      box.appendChild(el('label', '', title));
      var f = el('input', 'stps-input'); f.type = 'file'; f.accept = 'application/pdf';
      f.addEventListener('change', async function () {
        if (!f.files || !f.files[0]) return;
        await uploadStudyFile(f.files[0], purpose, function (res) {
          a[prop] = res.url;
          inp.value = res.url;
        });
      });
      box.append(f, inp);
      if (window.CSOFilePicker && window.CSOFilePicker.createPickerButton) {
        box.appendChild(window.CSOFilePicker.createPickerButton({
          label: '📁 Upload or Pick File from R2',
          folder: 'Study',
          className: 'stps-btn stps-btn-sm',
          onSelect: function (item) {
            a[prop] = item.clean_url;
            inp.value = item.clean_url;
          }
        }));
      }
      return box;
    }

    gPdf.append(
      makePdfUploader('Study Notes / E-Book PDF', notesPdfInp, 'notes-pdf', 'notes_pdf_url'),
      makePdfUploader('Previous Year Paper (PYQ) PDF', pyqPdfInp, 'pyq-pdf', 'pyq_pdf_url'),
      makePdfUploader('Official Answer Key / Solution PDF', keyPdfInp, 'answer-key-pdf', 'answer_key_pdf_url')
    );
    secPdf.appendChild(gPdf);
    wrap.appendChild(secPdf);

    wrap.appendChild(renderRepeaterSection(
      '6b. PDF Quick-Jump Page Bookmarks',
      a.pdf_index_bookmarks,
      [
        { key: 'page', label: 'Page #', ph: '2', type: 'number' },
        { key: 'label', label: 'Bookmark Label', ph: 'Unit-1 Odisha History Overview' }
      ],
      function () { return { page: 1, label: '' }; }
    ));

    wrap.appendChild(renderRepeaterSection(
      '6c. Official Reference & Further Reading Links',
      a.reference_links,
      [
        { key: 'label_en', label: 'Label (EN)', ph: 'OPSC Official Syllabus Portal' },
        { key: 'label_or', label: 'Label (ଓଡ଼ିଆ)', ph: 'ସରକାରୀ ପୋର୍ଟାଲ୍' },
        { key: 'url', label: 'URL', ph: 'https://www.opsc.gov.in/' },
        { key: 'kind', label: 'Type', ph: 'Official Portal' }
      ],
      function () { return { label_en: '', label_or: '', url: '', kind: 'Reference' }; }
    ));

    // 7. Scheduled Publishing, Edition Note & Revision History
    var secPub = el('section', 'stps-section');
    secPub.appendChild(el('h3', 'stps-section-title', '7. Edition Note, Scheduled Publishing & Revision History'));
    var gPub = el('div', 'stps-grid-3');

    var edEn = el('input', 'stps-input'); edEn.value = a.edition_note_en || ''; edEn.placeholder = 'e.g. Updated for 2026 Revised Syllabus';
    edEn.addEventListener('input', function () { a.edition_note_en = edEn.value; });
    var edOr = el('input', 'stps-input'); edOr.value = a.edition_note_or || ''; edOr.placeholder = 'e.g. ୨୦୨୬ ସଂଶୋଧିତ ସିଲାବସ୍ ଅନୁଯାୟୀ ଅଦ୍ୟତନ';
    edOr.addEventListener('input', function () { a.edition_note_or = edOr.value; });
    var schedInp = el('input', 'stps-input'); schedInp.type = 'datetime-local';
    if (a.scheduled_publish_at) schedInp.value = String(a.scheduled_publish_at).replace(' ', 'T').slice(0, 16);
    schedInp.addEventListener('input', function () { a.scheduled_publish_at = schedInp.value; });

    gPub.append(
      fld('Edition / Revision Banner Note (EN)', edEn),
      fld('Edition Note (ଓଡ଼ିଆ)', edOr),
      fld('Scheduled Publish Date/Time (Optional)', schedInp)
    );
    secPub.appendChild(gPub);

    var flagsRow = el('div', 'stps-inline-row');
    var lblFeat = el('label', 'stps-check-inline');
    var cbFeat = el('input'); cbFeat.type = 'checkbox'; cbFeat.checked = Boolean(a.is_featured);
    cbFeat.addEventListener('change', function () { a.is_featured = cbFeat.checked; });
    lblFeat.append(cbFeat, document.createTextNode('Featured Module'));

    var lblFree = el('label', 'stps-check-inline');
    var cbFree = el('input'); cbFree.type = 'checkbox'; cbFree.checked = a.is_free_access !== false;
    cbFree.addEventListener('change', function () { a.is_free_access = cbFree.checked; });
    lblFree.append(cbFree, document.createTextNode('Free Open Access'));

    var lblOffline = el('label', 'stps-check-inline');
    var cbOffline = el('input'); cbOffline.type = 'checkbox'; cbOffline.checked = Boolean(a.offline_pack);
    cbOffline.addEventListener('change', function () { a.offline_pack = cbOffline.checked ? 1 : 0; });
    lblOffline.append(cbOffline, document.createTextNode('Include in Offline Low-Bandwidth PWA Study Pack'));
    flagsRow.append(lblFeat, lblFree, lblOffline);
    secPub.appendChild(flagsRow);

    if (a.id && S.revisions.length) {
      var revList = el('div', 'stps-repeater-list');
      revList.appendChild(el('strong', '', 'Revision History (' + S.revisions.length + ' snapshots)'));
      S.revisions.slice(0, 8).forEach(function (rv) {
        var rr = el('div', 'stps-inline-row');
        rr.appendChild(el('span', 'stps-row-sub', 'Rev #' + rv.revision_number + ' · ' + (rv.change_summary || 'Update') + ' · ' + (rv.created_by || 'staff') + ' · ' + (rv.created_at || '')));
        var bRoll = el('button', 'stps-btn stps-btn-sm', 'Rollback');
        bRoll.type = 'button';
        bRoll.addEventListener('click', async function () {
          if (!window.confirm('Restore revision #' + rv.revision_number + '?')) return;
          try {
            var res = await api('/api/admin/study/' + encodeURIComponent(a.id) + '/rollback', {
              method: 'POST',
              body: { revision_id: rv.id }
            });
            toast('Rolled back to revision #' + rv.revision_number, 'success');
            loadArticleIntoComposer(res.item.id);
          } catch (err) {
            toast(err.message, 'error');
          }
        });
        rr.appendChild(bRoll);
        revList.appendChild(rr);
      });
      secPub.appendChild(revList);
    }
    wrap.appendChild(secPub);

    // 8. Sticky Action Bar: Save Draft, Real Public Preview, Publish Live, Bilingual Broadcast Copy
    var saveBar = el('div', 'stps-save-bar');
    var leftBtns = el('div', 'stps-actions');
    var rightBtns = el('div', 'stps-actions');

    var btnDraft = el('button', 'stps-btn', 'Save Draft');
    btnDraft.type = 'button';
    btnDraft.addEventListener('click', function () { saveArticle(false, false); });

    var btnPreview = el('button', 'stps-btn stps-btn-amber', 'Save Draft & Open Public Preview ↗');
    btnPreview.type = 'button';
    btnPreview.addEventListener('click', function () { saveArticle(a.is_published, true); });

    var btnCopyAlert = el('button', 'stps-btn', '📋 Copy EN + ଓଡ଼ିଆ Alert');
    btnCopyAlert.type = 'button';
    btnCopyAlert.addEventListener('click', function () { copyBroadcast(a); });

    var btnSanity = el('button', 'stps-btn', '✅ Sanity Check');
    btnSanity.type = 'button';
    btnSanity.addEventListener('click', function () {
      if (window.CSOPublishTools && window.CSOPublishTools.runSanityCheck) {
        window.CSOPublishTools.runSanityCheck('study', a, function () { saveArticle(true, false); });
      }
    });

    var btnPublish = el('button', 'stps-btn stps-btn-emerald', a.is_published ? 'Update Live Module' : '🚀 Publish Live Now');
    btnPublish.type = 'button';
    btnPublish.addEventListener('click', function () { saveArticle(true, false); });

    leftBtns.append(btnDraft, btnPreview, btnCopyAlert);
    rightBtns.append(btnSanity, btnPublish);
    saveBar.append(leftBtns, rightBtns);
    wrap.appendChild(saveBar);

    container.appendChild(wrap);
  }

  async function uploadStudyFile(file, purpose, onDone) {
    try {
      var fd = new FormData();
      fd.append('file', file);
      fd.append('purpose', purpose);
      toast('Uploading ' + file.name + ' to Cloudflare R2...', 'info');
      var res = await api('/api/admin/study/upload', { method: 'POST', body: fd });
      toast('Uploaded ' + res.filename + ' to R2.', 'success');
      if (typeof onDone === 'function') onDone(res);
    } catch (e) {
      toast(e.message || 'Upload failed.', 'error');
    }
  }

  async function saveArticle(publishFlag, openPreviewAfter) {
    var a = S.editingArticle;
    if (!a.title_en || !a.title_en.trim()) {
      toast('English title is required.', 'error');
      return;
    }
    var payload = Object.assign({}, a, { is_published: publishFlag ? 1 : 0 });
    try {
      var res;
      if (a.id) {
        res = await api('/api/admin/study/articles/' + encodeURIComponent(a.id), { method: 'PUT', body: payload });
      } else {
        res = await api('/api/admin/study/articles', { method: 'POST', body: payload });
      }
      S.editingArticle = res.item;
      toast(publishFlag ? 'Study module published live & edge caches purged!' : 'Draft saved to D1.', 'success');
      if (publishFlag && window.CSOPublishTools && window.CSOPublishTools.runPublishChain) {
        window.CSOPublishTools.runPublishChain('study', res.item);
      }
      if (openPreviewAfter) {
        await openPublicPreviewById(res.item.id, res.item.slug, false);
      }
      await loadAllData();
      renderWorkspace();
    } catch (e) {
      toast(e.message || 'Failed to save study module.', 'error');
    }
  }

  function renderRepeaterSection(title, listRef, cols, factoryFn) {
    var sec = el('section', 'stps-section');
    var head = el('div', 'stps-section-head');
    head.appendChild(el('h3', 'stps-section-title', title));
    var btnAdd = el('button', 'stps-btn stps-btn-sm stps-btn-primary', '+ Add Row');
    btnAdd.type = 'button';
    head.appendChild(btnAdd);
    sec.appendChild(head);

    var listWrap = el('div', 'stps-repeater-list');
    function drawRows() {
      clear(listWrap);
      if (!listRef.length) {
        listWrap.appendChild(el('span', 'stps-row-sub', 'No rows added yet. Click "+ Add Row" to build structured tables without HTML.'));
        return;
      }
      listRef.forEach(function (row, idx) {
        var rEl = el('div', 'stps-repeater-row');
        cols.forEach(function (c) {
          var fg = el('div', 'stps-field');
          fg.appendChild(el('label', '', c.label));
          var inp = el('input', 'stps-input');
          inp.type = c.type || 'text';
          inp.placeholder = c.ph || '';
          inp.value = row[c.key] !== undefined ? String(row[c.key]) : '';
          inp.addEventListener('input', function () {
            row[c.key] = c.type === 'number' ? Number(inp.value || 1) : inp.value;
          });
          fg.appendChild(inp);
          rEl.appendChild(fg);
        });
        var bRem = el('button', 'stps-btn stps-btn-sm stps-btn-danger', 'Remove');
        bRem.type = 'button';
        bRem.addEventListener('click', function () {
          listRef.splice(idx, 1);
          drawRows();
        });
        rEl.appendChild(bRem);
        listWrap.appendChild(rEl);
      });
    }
    btnAdd.addEventListener('click', function () {
      listRef.push(factoryFn());
      drawRows();
    });
    drawRows();
    sec.appendChild(listWrap);
    return sec;
  }

  function renderMcqBuilderSection(a) {
    if (!Array.isArray(a.practice_mcqs)) a.practice_mcqs = [];
    var sec = el('section', 'stps-section');
    var head = el('div', 'stps-section-head');
    head.appendChild(el('h3', 'stps-section-title', '4d. Embedded Self-Check Practice MCQs (Instant Tutor Mode & Timed Exam Simulation)'));
    var btnAdd = el('button', 'stps-btn stps-btn-sm stps-btn-primary', '+ Add Practice MCQ');
    btnAdd.type = 'button';
    head.appendChild(btnAdd);
    sec.appendChild(head);

    var listWrap = el('div', 'stps-repeater-list');
    function drawMcqs() {
      clear(listWrap);
      if (!a.practice_mcqs.length) {
        listWrap.appendChild(el('span', 'stps-row-sub', 'Add bilingual MCQs to power both Instant Tutor Mode and Timed Exam Simulation with negative marking on the public reader.'));
        return;
      }
      a.practice_mcqs.forEach(function (q, idx) {
        if (!Array.isArray(q.options)) q.options = ['', '', '', ''];
        var card = el('div', 'stps-mcq-card');
        var ch = el('div', 'stps-section-head');
        ch.appendChild(el('strong', '', 'Question #' + (idx + 1)));
        var bDel = el('button', 'stps-btn stps-btn-sm stps-btn-danger', 'Remove Q');
        bDel.type = 'button';
        bDel.addEventListener('click', function () { a.practice_mcqs.splice(idx, 1); drawMcqs(); });
        ch.appendChild(bDel);
        card.appendChild(ch);

        var qEn = el('input', 'stps-input'); qEn.value = q.question_en || ''; qEn.placeholder = 'Question text (English)';
        qEn.addEventListener('input', function () { q.question_en = qEn.value; });
        var qOr = el('input', 'stps-input'); qOr.value = q.question_or || ''; qOr.placeholder = 'ପ୍ରଶ୍ନ (ଓଡ଼ିଆ — Optional)';
        qOr.addEventListener('input', function () { q.question_or = qOr.value; });

        var optGrid = el('div', 'stps-grid-2');
        ['A', 'B', 'C', 'D'].forEach(function (lbl, oi) {
          var oiInp = el('input', 'stps-input');
          oiInp.placeholder = 'Option ' + lbl;
          oiInp.value = q.options[oi] || '';
          oiInp.addEventListener('input', function () { q.options[oi] = oiInp.value; });
          optGrid.appendChild(oiInp);
        });

        var ansRow = el('div', 'stps-grid-2');
        var ansSel = el('select', 'stps-select');
        [['0', 'Correct: Option A'], ['1', 'Correct: Option B'], ['2', 'Correct: Option C'], ['3', 'Correct: Option D']].forEach(function (p) {
          ansSel.appendChild(new Option(p[1], p[0]));
        });
        ansSel.value = String(q.correct_index || 0);
        ansSel.addEventListener('change', function () { q.correct_index = Number(ansSel.value); });

        var expEn = el('input', 'stps-input'); expEn.value = q.explanation_en || ''; expEn.placeholder = 'Detailed explanation (EN)';
        expEn.addEventListener('input', function () { q.explanation_en = expEn.value; });
        var expOr = el('input', 'stps-input'); expOr.value = q.explanation_or || ''; expOr.placeholder = 'ବ୍ୟାଖ୍ୟା (ଓଡ଼ିଆ — Optional)';
        expOr.addEventListener('input', function () { q.explanation_or = expOr.value; });

        ansRow.append(ansSel, expEn);
        card.append(qEn, qOr, optGrid, ansRow, expOr);
        listWrap.appendChild(card);
      });
    }

    btnAdd.addEventListener('click', function () {
      a.practice_mcqs.push({
        id: 'q' + (a.practice_mcqs.length + 1),
        question_en: '',
        question_or: '',
        options: ['', '', '', ''],
        correct_index: 0,
        explanation_en: '',
        explanation_or: ''
      });
      drawMcqs();
    });
    drawMcqs();
    sec.appendChild(listWrap);
    return sec;
  }

  // ============================================================================
  // TAB 2: 3-LAYER CURRICULUM HIERARCHY STUDIO
  // ============================================================================
  function renderTaxonomyTab(container) {
    var l1List = nodesByLevel(1);
    if (!S.taxSelL1 && l1List.length) S.taxSelL1 = l1List[0].id;
    var l2List = S.taxSelL1 ? nodesByLevel(2, S.taxSelL1) : [];
    if (S.taxSelL2 && !l2List.some(function (n) { return n.id === S.taxSelL2; })) S.taxSelL2 = '';
    if (!S.taxSelL2 && l2List.length) S.taxSelL2 = l2List[0].id;
    var l3List = S.taxSelL2 ? nodesByLevel(3, S.taxSelL2) : [];

    var grid = el('div', 'stps-tax-grid');

    function renderCol(level, title, list, parentId, selectedId, onSelect) {
      var col = el('div', 'stps-tax-col');
      var head = el('div', 'stps-section-head');
      head.appendChild(el('strong', '', title + ' (' + list.length + ')'));
      var btnAdd = el('button', 'stps-btn stps-btn-sm stps-btn-primary', '+ Add');
      btnAdd.type = 'button';
      btnAdd.addEventListener('click', function () {
        if (level > 1 && !parentId) { toast('Select a parent Level ' + (level - 1) + ' node first.', 'error'); return; }
        openQuickAddTaxonomyModal(level, parentId, function () { refreshAndRender(); });
      });
      head.appendChild(btnAdd);
      col.appendChild(head);

      if (!list.length) {
        col.appendChild(el('div', 'stps-empty', level === 1 ? 'No Exam Tracks yet.' : 'No child items under selected parent.'));
      } else {
        list.forEach(function (node) {
          var item = el('div', 'stps-tax-item' + (selectedId === node.id ? ' is-selected' : ''));
          item.addEventListener('click', function () {
            if (typeof onSelect === 'function') onSelect(node.id);
          });
          var top = el('div', 'stps-row-title', (node.icon ? node.icon + ' ' : '') + node.title_en);
          item.appendChild(top);
          if (node.title_or) item.appendChild(el('div', 'stps-row-sub', node.title_or));
          item.appendChild(el('div', 'stps-row-sub', 'Published: ' + (node.published_modules || 0) + ' / Total: ' + (node.total_modules || 0) + (node.is_published ? '' : ' · Hidden')));

          var acts = el('div', 'stps-actions');
          var bUp = el('button', 'stps-btn stps-btn-sm', '↑'); bUp.type = 'button'; bUp.title = 'Move Up';
          bUp.addEventListener('click', async function (ev) {
            ev.stopPropagation();
            await api('/api/admin/study/taxonomy/' + encodeURIComponent(node.id) + '/move', { method: 'POST', body: { direction: 'up' } });
            refreshAndRender();
          });
          var bDn = el('button', 'stps-btn stps-btn-sm', '↓'); bDn.type = 'button'; bDn.title = 'Move Down';
          bDn.addEventListener('click', async function (ev) {
            ev.stopPropagation();
            await api('/api/admin/study/taxonomy/' + encodeURIComponent(node.id) + '/move', { method: 'POST', body: { direction: 'down' } });
            refreshAndRender();
          });
          var bTog = el('button', 'stps-btn stps-btn-sm', node.is_published ? 'Hide' : 'Publish'); bTog.type = 'button';
          bTog.addEventListener('click', async function (ev) {
            ev.stopPropagation();
            await api('/api/admin/study/taxonomy/' + encodeURIComponent(node.id), { method: 'PUT', body: { is_published: node.is_published ? 0 : 1 } });
            refreshAndRender();
          });
          var bDel = el('button', 'stps-btn stps-btn-sm stps-btn-danger', '×'); bDel.type = 'button'; bDel.title = 'Delete';
          bDel.addEventListener('click', async function (ev) {
            ev.stopPropagation();
            if (!window.confirm('Delete "' + node.title_en + '"?')) return;
            try {
              await api('/api/admin/study/taxonomy/' + encodeURIComponent(node.id), { method: 'DELETE' });
              refreshAndRender();
            } catch (err) { toast(err.message, 'error'); }
          });
          acts.append(bUp, bDn, bTog, bDel);
          item.appendChild(acts);
          col.appendChild(item);
        });
      }
      return col;
    }

    grid.append(
      renderCol(1, 'L1: Exam Track / Stream', l1List, null, S.taxSelL1, function (id) { S.taxSelL1 = id; S.taxSelL2 = ''; renderWorkspace(); }),
      renderCol(2, 'L2: Subject / Paper', l2List, S.taxSelL1, S.taxSelL2, function (id) { S.taxSelL2 = id; renderWorkspace(); }),
      renderCol(3, 'L3: Chapter / Format', l3List, S.taxSelL2, '', null)
    );
    container.appendChild(grid);
  }

  // ============================================================================
  // TAB 3: REUSABLE BILINGUAL SNIPPETS LIBRARY
  // ============================================================================
  function renderSnippetsTab(container) {
    var sec = el('section', 'stps-section');
    var head = el('div', 'stps-section-head');
    head.appendChild(el('h3', 'stps-section-title', 'Reusable Bilingual Study & Exam Rule Snippets'));
    sec.appendChild(head);

    var form = el('div', 'stps-grid-2');
    var fTitleEn = el('input', 'stps-input'); fTitleEn.placeholder = 'Snippet Title (EN)';
    var fTitleOr = el('input', 'stps-input'); fTitleOr.placeholder = 'Snippet Title (ଓଡ଼ିଆ)';
    var fBodyEn = el('textarea', 'stps-textarea'); fBodyEn.placeholder = 'Markdown body (EN)';
    var fBodyOr = el('textarea', 'stps-textarea'); fBodyOr.placeholder = 'Markdown body (ଓଡ଼ିଆ)';
    var btnSave = el('button', 'stps-btn stps-btn-primary', '+ Save Study Snippet');
    btnSave.type = 'button';
    btnSave.addEventListener('click', async function () {
      if (!fTitleEn.value.trim()) { toast('Snippet English title is required.', 'error'); return; }
      try {
        await api('/api/admin/jobs/snippets', {
          method: 'POST',
          body: { category: 'study', title_en: fTitleEn.value.trim(), title_or: fTitleOr.value.trim(), body_en: fBodyEn.value, body_or: fBodyOr.value }
        });
        toast('Reusable study snippet saved.', 'success');
        refreshAndRender();
      } catch (e) { toast(e.message, 'error'); }
    });
    form.append(fTitleEn, fTitleOr, fBodyEn, fBodyOr);
    sec.append(form, btnSave);
    container.appendChild(sec);

    var list = el('div', 'stps-repeater-list');
    S.snippets.forEach(function (sn) {
      var card = el('div', 'stps-section');
      var sh = el('div', 'stps-section-head');
      sh.appendChild(el('strong', '', '[' + (sn.category || 'general') + '] ' + sn.title_en + (sn.title_or ? ' · ' + sn.title_or : '')));
      var bDel = el('button', 'stps-btn stps-btn-sm stps-btn-danger', 'Delete');
      bDel.type = 'button';
      bDel.addEventListener('click', async function () {
        if (!window.confirm('Delete snippet "' + sn.title_en + '"?')) return;
        await api('/api/admin/jobs/snippets/' + encodeURIComponent(sn.id), { method: 'DELETE' });
        refreshAndRender();
      });
      sh.appendChild(bDel);
      card.append(sh, el('div', 'stps-row-sub', (sn.body_en || '').slice(0, 240)));
      list.appendChild(card);
    });
    container.appendChild(list);
  }

  // ============================================================================
  // TAB 4: READER DOUBTS & PYQ CORRECTIONS QUEUE
  // ============================================================================
  function renderDoubtsTab(container) {
    var fbar = el('div', 'stps-filter-bar');
    [['open', 'Open Queue'], ['resolved', 'Resolved'], ['all', 'All']].forEach(function (opt) {
      var b = el('button', 'stps-btn stps-btn-sm' + (S.doubtsFilter === opt[0] ? ' stps-btn-primary' : ''), opt[1]);
      b.type = 'button';
      b.addEventListener('click', function () {
        S.doubtsFilter = opt[0];
        refreshAndRender();
      });
      fbar.appendChild(b);
    });
    container.appendChild(fbar);

    if (!S.doubts.length) {
      container.appendChild(el('div', 'stps-empty', 'No reader doubts or PYQ typo reports in this filter.'));
      return;
    }

    var list = el('div', 'stps-repeater-list');
    S.doubts.forEach(function (d) {
      var card = el('div', 'stps-doubt-card' + (d.status === 'resolved' ? ' is-resolved' : ''));
      var head = el('div', 'stps-section-head');
      var meta = el('div');
      meta.appendChild(el('span', 'stps-pill ' + (d.status === 'open' ? 'is-open' : 'is-published'), (d.status || 'open').toUpperCase()));
      meta.appendChild(document.createTextNode(' '));
      meta.appendChild(el('span', 'stps-pill', String(d.doubt_type || 'chapter_doubt').replace(/_/g, ' ')));
      meta.appendChild(document.createTextNode(' '));
      meta.appendChild(el('strong', '', d.article_title || d.article_id));
      head.appendChild(meta);
      head.appendChild(el('span', 'stps-row-sub', (d.reader_name || 'Learner') + ' · ' + (d.created_at || '')));
      card.appendChild(head);

      card.appendChild(el('div', '', d.message_text || ''));

      var replyTa = el('textarea', 'stps-textarea');
      replyTa.rows = 2;
      replyTa.placeholder = 'Write official clarification or PYQ correction note...';
      replyTa.value = d.admin_reply || '';

      var acts = el('div', 'stps-actions');
      var btnResolve = el('button', 'stps-btn stps-btn-sm stps-btn-emerald', d.status === 'resolved' ? 'Update Reply' : 'Reply & Mark Resolved');
      btnResolve.type = 'button';
      btnResolve.addEventListener('click', async function () {
        await api('/api/admin/study/doubts/' + encodeURIComponent(d.id), {
          method: 'PUT',
          body: { admin_reply: replyTa.value.trim(), status: 'resolved' }
        });
        toast('Reader doubt marked resolved.', 'success');
        refreshAndRender();
      });

      var btnToggle = el('button', 'stps-btn stps-btn-sm', d.status === 'resolved' ? 'Reopen' : 'Mark Resolved');
      btnToggle.type = 'button';
      btnToggle.addEventListener('click', async function () {
        await api('/api/admin/study/doubts/' + encodeURIComponent(d.id), {
          method: 'PUT',
          body: { status: d.status === 'resolved' ? 'open' : 'resolved' }
        });
        refreshAndRender();
      });

      var btnDel = el('button', 'stps-btn stps-btn-sm stps-btn-danger', 'Delete');
      btnDel.type = 'button';
      btnDel.addEventListener('click', async function () {
        if (!window.confirm('Delete this reader submission?')) return;
        await api('/api/admin/study/doubts/' + encodeURIComponent(d.id), { method: 'DELETE' });
        refreshAndRender();
      });

      acts.append(btnResolve, btnToggle, btnDel);
      card.append(replyTa, acts);
      list.appendChild(card);
    });
    container.appendChild(list);
  }

  // ============================================================================
  // TAB 5 (v312): CBT MOCK TESTS & BILINGUAL QUESTION BANK STUDIO
  // ============================================================================
  var CBT_EXAM_CATEGORIES = [
    'OPSC', 'OSSC', 'OSSSC', 'OTET', 'OSSTET', 'CTET', 'OAVS', 'Odisha Police', 'Banking & PSU', 'SSC & Railways', 'UPSC', 'General GK'
  ];

  async function loadCbtQuestions(testId) {
    if (!testId) { S.cbtQuestions = []; return; }
    try {
      var res = await api('/api/admin/mock-tests/' + encodeURIComponent(testId) + '/questions');
      S.cbtQuestions = res.items || [];
    } catch (_) {
      S.cbtQuestions = [];
    }
  }

  function renderCbtMockTestsTab(container) {
    var kpiGrid = el('div', 'stps-kpi-grid');
    [
      ['Total CBT Mock Tests', S.cbtKpis.total_tests || 0, ''],
      ['Published Live (/mock-tests/)', S.cbtKpis.published_tests || 0, 'is-emerald'],
      ['Total Questions in Bank', S.cbtKpis.total_questions || 0, 'is-cobalt'],
      ['Real Candidate Attempts', S.cbtKpis.total_attempts || 0, 'is-violet']
    ].forEach(function (k) {
      var c = el('div', 'stps-kpi ' + k[2]);
      c.appendChild(el('span', 'stps-kpi-label', k[0]));
      c.appendChild(el('strong', 'stps-kpi-val', String(k[1])));
      kpiGrid.appendChild(c);
    });
    container.appendChild(kpiGrid);

    // 1. Create / Edit Mock Test Card
    var edTest = S.cbtEditingTest || {
      title_en: '',
      title_or: '',
      slug: '',
      exam_category: 'OPSC',
      duration_minutes: 30,
      negative_mark: 0.25,
      status: 'draft'
    };
    var formCard = el('section', 'stps-section');
    var fHead = el('div', 'stps-section-head');
    fHead.appendChild(el('h3', 'stps-section-title', edTest.id ? 'Edit CBT Mock Test' : 'Create Timed CBT Mock Test'));
    var liveLink = el('a', 'stps-btn stps-btn-sm', 'Open Public /mock-tests/ ↗');
    liveLink.href = '/mock-tests/';
    liveLink.target = '_blank';
    liveLink.rel = 'noopener noreferrer';
    fHead.appendChild(liveLink);
    formCard.appendChild(fHead);

    var tForm = el('form', 'stps-grid-2');
    tForm.noValidate = true;

    function mkField(labelTxt, inputNode) {
      var g = el('div', 'stps-field');
      var l = el('label', 'stps-label', labelTxt);
      if (inputNode.id) l.setAttribute('for', inputNode.id);
      g.append(l, inputNode);
      return g;
    }

    var inTitleEn = el('input', 'stps-input');
    inTitleEn.id = 'cbtTitleEn';
    inTitleEn.placeholder = 'e.g., OPSC OAS Prelims GS Paper I — Full Mock 01';
    inTitleEn.value = edTest.title_en || '';

    var inTitleOr = el('input', 'stps-input');
    inTitleOr.id = 'cbtTitleOr';
    inTitleOr.placeholder = 'ଓଡ଼ିଆ ଶୀର୍ଷକ (ଇଚ୍ଛାଧୀନ)';
    inTitleOr.value = edTest.title_or || '';

    var inSlug = el('input', 'stps-input');
    inSlug.id = 'cbtSlug';
    inSlug.placeholder = 'auto-generated-from-title';
    inSlug.value = edTest.slug || '';

    var selCat = el('select', 'stps-select');
    selCat.id = 'cbtExamCategory';
    CBT_EXAM_CATEGORIES.forEach(function (c) { selCat.appendChild(new Option(c, c)); });
    if (edTest.exam_category && CBT_EXAM_CATEGORIES.indexOf(edTest.exam_category) === -1) {
      selCat.appendChild(new Option(edTest.exam_category, edTest.exam_category));
    }
    selCat.value = edTest.exam_category || 'OPSC';

    var inDur = el('input', 'stps-input');
    inDur.id = 'cbtDuration';
    inDur.type = 'number';
    inDur.min = '1';
    inDur.max = '600';
    inDur.value = String(edTest.duration_minutes || 30);

    var inNeg = el('input', 'stps-input');
    inNeg.id = 'cbtNegMark';
    inNeg.type = 'number';
    inNeg.step = '0.01';
    inNeg.min = '0';
    inNeg.max = '10';
    inNeg.value = String(edTest.negative_mark !== undefined ? edTest.negative_mark : 0.25);

    var selSt = el('select', 'stps-select');
    selSt.id = 'cbtStatus';
    selSt.appendChild(new Option('Draft (Hidden)', 'draft'));
    selSt.appendChild(new Option('Published (Live on /mock-tests/)', 'published'));
    selSt.value = edTest.status || 'draft';

    tForm.append(
      mkField('Mock Test Title (EN) *', inTitleEn),
      mkField('Mock Test Title (ଓଡ଼ିଆ)', inTitleOr),
      mkField('URL Slug (optional)', inSlug),
      mkField('Exam Category', selCat),
      mkField('Duration (Minutes)', inDur),
      mkField('Negative Mark per Wrong Answer', inNeg),
      mkField('Status', selSt)
    );

    var tActs = el('div', 'stps-actions');
    var saveTestBtn = el('button', 'stps-btn stps-btn-primary', edTest.id ? 'Update Mock Test' : '+ Create Mock Test');
    saveTestBtn.type = 'submit';
    tActs.appendChild(saveTestBtn);
    if (edTest.id) {
      var cancelEditBtn = el('button', 'stps-btn', 'Cancel Edit');
      cancelEditBtn.type = 'button';
      cancelEditBtn.addEventListener('click', function () {
        S.cbtEditingTest = null;
        renderWorkspace();
      });
      tActs.appendChild(cancelEditBtn);
    }
    tForm.appendChild(tActs);

    tForm.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      if (!inTitleEn.value.trim()) {
        toast('Mock Test Title (EN) is required.', 'error');
        return;
      }
      var payload = {
        title_en: inTitleEn.value.trim(),
        title_or: inTitleOr.value.trim(),
        slug: inSlug.value.trim() || undefined,
        exam_category: selCat.value,
        duration_minutes: Number(inDur.value) || 30,
        negative_mark: Number(inNeg.value) || 0,
        status: selSt.value
      };
      try {
        var res = edTest.id
          ? await api('/api/admin/mock-tests/' + encodeURIComponent(edTest.id), { method: 'PUT', body: payload })
          : await api('/api/admin/mock-tests', { method: 'POST', body: payload });
        S.cbtEditingTest = null;
        S.cbtSelectedTestId = res.id || (res.item && res.item.id) || S.cbtSelectedTestId;
        toast(edTest.id ? 'Mock test updated.' : 'Mock test created. Now add questions below!', 'success');
        await refreshAndRender();
      } catch (err) {
        toast(err.message, 'error');
      }
    });

    formCard.appendChild(tForm);
    container.appendChild(formCard);

    // 2. Existing Mock Tests Table
    var listCard = el('section', 'stps-section');
    listCard.appendChild(el('h3', 'stps-section-title', 'D1 CBT Mock Tests (' + S.cbtTests.length + ')'));

    if (!S.cbtTests.length) {
      listCard.appendChild(el('div', 'stps-empty', 'No CBT mock tests created yet (0). Use the form above to author your first timed bilingual exam.'));
    } else {
      var tblWrap = el('div', 'stps-table-wrap');
      var tbl = el('table', 'stps-table');
      var thead = el('thead');
      var hr = el('tr');
      ['Exam Title', 'Category', 'Timing & Neg.', 'Questions', 'Attempts', 'Status', 'Actions'].forEach(function (h) {
        hr.appendChild(el('th', '', h));
      });
      thead.appendChild(hr);
      tbl.appendChild(thead);

      var tbody = el('tbody');
      S.cbtTests.forEach(function (t) {
        var tr = el('tr');
        var tdT = el('td');
        tdT.appendChild(el('strong', '', t.title_en || t.title));
        if (t.title_or) tdT.appendChild(el('div', 'stps-row-sub', t.title_or));
        tdT.appendChild(el('div', 'stps-row-sub', '/mock-tests/?test=' + t.slug));
        tr.appendChild(tdT);

        tr.appendChild(el('td', '', t.exam_category || '—'));
        tr.appendChild(el('td', '', (t.duration_minutes || 30) + 'm · −' + (t.negative_mark || 0)));
        tr.appendChild(el('td', '', String(t.question_count || 0)));
        tr.appendChild(el('td', '', String(t.attempt_count || 0)));

        var tdSt = el('td');
        tdSt.appendChild(el('span', 'stps-pill ' + (t.status === 'published' ? 'is-published' : 'is-draft'), String(t.status || 'draft').toUpperCase()));
        tr.appendChild(tdSt);

        var tdAct = el('td');
        var acts = el('div', 'stps-actions');

        var qBtn = el('button', 'stps-btn stps-btn-sm' + (S.cbtSelectedTestId === t.id ? ' stps-btn-primary' : ''), 'Manage Questions (' + (t.question_count || 0) + ')');
        qBtn.type = 'button';
        qBtn.addEventListener('click', async function () {
          S.cbtSelectedTestId = t.id;
          S.cbtEditingQuestion = null;
          S.cbtCsvPreview = null;
          await loadCbtQuestions(t.id);
          renderWorkspace();
        });

        var edBtn = el('button', 'stps-btn stps-btn-sm', 'Edit');
        edBtn.type = 'button';
        edBtn.addEventListener('click', function () {
          S.cbtEditingTest = Object.assign({}, t);
          renderWorkspace();
        });

        var togBtn = el('button', 'stps-btn stps-btn-sm', t.status === 'published' ? 'Unpublish' : 'Publish');
        togBtn.type = 'button';
        togBtn.addEventListener('click', async function () {
          try {
            var nextSt = t.status === 'published' ? 'draft' : 'published';
            await api('/api/admin/mock-tests/' + encodeURIComponent(t.id) + '/status', { method: 'POST', body: { status: nextSt } });
            toast('Mock test ' + nextSt + '.', 'success');
            await refreshAndRender();
          } catch (err) {
            toast(err.message, 'error');
          }
        });

        var delBtn = el('button', 'stps-btn stps-btn-sm stps-btn-danger', 'Delete');
        delBtn.type = 'button';
        delBtn.addEventListener('click', async function () {
          if (!window.confirm('Delete mock test "' + (t.title_en || t.title) + '" and its questions?')) return;
          try {
            await api('/api/admin/mock-tests/' + encodeURIComponent(t.id), { method: 'DELETE' });
            if (S.cbtSelectedTestId === t.id) { S.cbtSelectedTestId = ''; S.cbtQuestions = []; }
            toast('Mock test deleted.', 'success');
            await refreshAndRender();
          } catch (err) {
            toast(err.message, 'error');
          }
        });

        acts.append(qBtn, edBtn, togBtn, delBtn);
        tdAct.appendChild(acts);
        tr.appendChild(tdAct);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      tblWrap.appendChild(tbl);
      listCard.appendChild(tblWrap);
    }
    container.appendChild(listCard);

    // 3. Selected Test Question Bank & CSV Bulk Importer
    var activeTest = S.cbtTests.find(function (t) { return t.id === S.cbtSelectedTestId; });
    if (!activeTest) return;

    var qCard = el('section', 'stps-section');
    var qHead = el('div', 'stps-section-head');
    qHead.appendChild(el('h3', 'stps-section-title', 'Question Bank: ' + (activeTest.title_en || activeTest.title) + ' (' + S.cbtQuestions.length + ' Questions)'));
    var prevTestLink = el('a', 'stps-btn stps-btn-sm', 'Take Live CBT Test ↗');
    prevTestLink.href = '/mock-tests/?test=' + encodeURIComponent(activeTest.slug);
    prevTestLink.target = '_blank';
    prevTestLink.rel = 'noopener noreferrer';
    qHead.appendChild(prevTestLink);
    qCard.appendChild(qHead);

    // Add / Edit Question Form
    var eq = S.cbtEditingQuestion || {
      question_en: '',
      question_or: '',
      options: ['', '', '', ''],
      correct_index: 0,
      explanation_en: '',
      explanation_or: ''
    };
    var qForm = el('form', 'stps-grid-2');
    qForm.noValidate = true;

    var qEn = el('textarea', 'stps-textarea');
    qEn.id = 'cbtQEn';
    qEn.rows = 2;
    qEn.placeholder = 'Enter question stem in English…';
    qEn.value = eq.question_en || '';

    var qOr = el('textarea', 'stps-textarea');
    qOr.id = 'cbtQOr';
    qOr.rows = 2;
    qOr.placeholder = 'ଓଡ଼ିଆରେ ପ୍ରଶ୍ନ ଲେଖନ୍ତୁ (ଇଚ୍ଛାଧୀନ)…';
    qOr.value = eq.question_or || '';

    var optInputs = ['A', 'B', 'C', 'D'].map(function (ltr, idx) {
      var inp = el('input', 'stps-input');
      inp.id = 'cbtOpt' + ltr;
      inp.placeholder = 'Option ' + ltr;
      inp.value = (eq.options && eq.options[idx]) || '';
      return inp;
    });

    var selCorr = el('select', 'stps-select');
    selCorr.id = 'cbtCorrectIdx';
    [['0', 'Option A (Index 0)'], ['1', 'Option B (Index 1)'], ['2', 'Option C (Index 2)'], ['3', 'Option D (Index 3)']].forEach(function (pair) {
      selCorr.appendChild(new Option(pair[1], pair[0]));
    });
    selCorr.value = String(eq.correct_index !== undefined ? eq.correct_index : 0);

    var expEn = el('textarea', 'stps-textarea');
    expEn.id = 'cbtExpEn';
    expEn.rows = 2;
    expEn.placeholder = 'Official solution / explanation (EN)…';
    expEn.value = eq.explanation_en || '';

    var expOr = el('textarea', 'stps-textarea');
    expOr.id = 'cbtExpOr';
    expOr.rows = 2;
    expOr.placeholder = 'ସମାଧାନ / ବ୍ୟାଖ୍ୟା (ଓଡ଼ିଆ)…';
    expOr.value = eq.explanation_or || '';

    qForm.append(
      mkField('Question (EN) *', qEn),
      mkField('Question (ଓଡ଼ିଆ)', qOr),
      mkField('Option A *', optInputs[0]),
      mkField('Option B *', optInputs[1]),
      mkField('Option C *', optInputs[2]),
      mkField('Option D *', optInputs[3]),
      mkField('Correct Answer *', selCorr),
      mkField('Explanation (EN)', expEn),
      mkField('Explanation (ଓଡ଼ିଆ)', expOr)
    );

    var qFormActs = el('div', 'stps-actions');
    var saveQBtn = el('button', 'stps-btn stps-btn-primary', eq.id ? 'Update Question' : '+ Add Question to Bank');
    saveQBtn.type = 'submit';
    qFormActs.appendChild(saveQBtn);
    if (eq.id) {
      var cancelQBtn = el('button', 'stps-btn', 'Cancel Edit');
      cancelQBtn.type = 'button';
      cancelQBtn.addEventListener('click', function () { S.cbtEditingQuestion = null; renderWorkspace(); });
      qFormActs.appendChild(cancelQBtn);
    }
    qForm.appendChild(qFormActs);

    qForm.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var payload = {
        question_en: qEn.value.trim(),
        question_or: qOr.value.trim(),
        options: optInputs.map(function (i) { return i.value.trim(); }),
        correct_index: Number(selCorr.value),
        explanation_en: expEn.value.trim(),
        explanation_or: expOr.value.trim()
      };
      try {
        if (eq.id) {
          await api('/api/admin/mock-tests/' + encodeURIComponent(activeTest.id) + '/questions/' + encodeURIComponent(eq.id), { method: 'PUT', body: payload });
          toast('Question updated.', 'success');
        } else {
          await api('/api/admin/mock-tests/' + encodeURIComponent(activeTest.id) + '/questions', { method: 'POST', body: payload });
          toast('Question added to bank.', 'success');
        }
        S.cbtEditingQuestion = null;
        await refreshAndRender();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
    qCard.appendChild(qForm);

    // Bulk CSV Importer sub-panel
    var csvBox = el('div', 'stps-section');
    csvBox.appendChild(el('h4', 'stps-section-title', '📥 Bulk Import Questions via CSV'));
    csvBox.appendChild(el('p', 'stps-row-sub', 'CSV header columns: question_en,question_or,option_a,option_b,option_c,option_d,correct_index,explanation_en,explanation_or (correct_index accepts 0–3 or A–D).'));

    var csvFile = el('input', 'stps-input');
    csvFile.type = 'file';
    csvFile.accept = '.csv,text/csv';
    csvFile.setAttribute('aria-label', 'Upload CSV file of CBT questions');

    var csvTa = el('textarea', 'stps-textarea');
    csvTa.id = 'cbtCsvInput';
    csvTa.rows = 4;
    csvTa.placeholder = 'question_en,question_or,option_a,option_b,option_c,option_d,correct_index,explanation_en,explanation_or';
    csvTa.value = S.cbtCsvDraft || '';
    csvTa.addEventListener('input', function () { S.cbtCsvDraft = csvTa.value; });

    csvFile.addEventListener('change', function () {
      var file = csvFile.files && csvFile.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        S.cbtCsvDraft = String(reader.result || '');
        csvTa.value = S.cbtCsvDraft;
        toast('Loaded ' + file.name + ' into CSV preview box.', 'info');
      };
      reader.readAsText(file);
    });

    var csvActs = el('div', 'stps-actions');
    var btnDry = el('button', 'stps-btn', 'Validate CSV (Dry Run)');
    btnDry.type = 'button';
    btnDry.addEventListener('click', async function () {
      if (!csvTa.value.trim()) { toast('Paste CSV rows or select a .csv file first.', 'error'); return; }
      try {
        var r = await api('/api/admin/mock-tests/' + encodeURIComponent(activeTest.id) + '/import-csv', {
          method: 'POST',
          body: { csv: csvTa.value, dry_run: true }
        });
        S.cbtCsvPreview = r;
        toast('Validated: ' + r.valid_count + ' valid, ' + r.invalid_count + ' invalid.', r.invalid_count ? 'info' : 'success');
        renderWorkspace();
      } catch (err) { toast(err.message, 'error'); }
    });

    var btnCommit = el('button', 'stps-btn stps-btn-primary', 'Import Valid CSV Questions');
    btnCommit.type = 'button';
    btnCommit.addEventListener('click', async function () {
      if (!csvTa.value.trim()) { toast('Paste CSV rows or select a .csv file first.', 'error'); return; }
      try {
        var r = await api('/api/admin/mock-tests/' + encodeURIComponent(activeTest.id) + '/import-csv', {
          method: 'POST',
          body: { csv: csvTa.value, dry_run: false, skip_invalid: true }
        });
        S.cbtCsvDraft = '';
        S.cbtCsvPreview = null;
        toast('Imported ' + r.imported + ' question(s) into D1 (skipped ' + (r.skipped || 0) + ').', 'success');
        await refreshAndRender();
      } catch (err) { toast(err.message, 'error'); }
    });

    csvActs.append(btnDry, btnCommit);
    csvBox.append(csvFile, csvTa, csvActs);
    if (S.cbtCsvPreview) {
      csvBox.appendChild(el('p', 'stps-row-sub', 'Dry-run report: ' + S.cbtCsvPreview.valid_count + ' valid / ' + S.cbtCsvPreview.invalid_count + ' invalid out of ' + S.cbtCsvPreview.total + ' rows.'));
    }
    qCard.appendChild(csvBox);

    // Existing Questions list
    if (!S.cbtQuestions.length) {
      qCard.appendChild(el('div', 'stps-empty', 'No questions added to this test yet (0). Add manually or bulk-import via CSV above.'));
    } else {
      var qList = el('div', 'stps-doubt-list');
      S.cbtQuestions.forEach(function (q, idx) {
        var item = el('div', 'stps-doubt-card');
        var qh = el('div', 'stps-section-head');
        qh.appendChild(el('strong', '', 'Q' + (idx + 1) + '. ' + q.question_en));
        qh.appendChild(el('span', 'stps-pill is-published', 'Correct: ' + (q.correct_option || ['A', 'B', 'C', 'D'][q.correct_index] || 'A')));
        item.appendChild(qh);
        if (q.question_or) item.appendChild(el('div', 'stps-row-sub', q.question_or));
        var optsTxt = (q.options || []).map(function (o, i) { return ['A', 'B', 'C', 'D'][i] + ') ' + o; }).join('  ·  ');
        item.appendChild(el('div', 'stps-row-sub', optsTxt));
        if (q.explanation_en) item.appendChild(el('div', 'stps-row-sub', 'Explanation: ' + q.explanation_en));

        var qa = el('div', 'stps-actions');
        var qEd = el('button', 'stps-btn stps-btn-sm', 'Edit');
        qEd.type = 'button';
        qEd.addEventListener('click', function () {
          S.cbtEditingQuestion = Object.assign({}, q);
          renderWorkspace();
        });
        var qDel = el('button', 'stps-btn stps-btn-sm stps-btn-danger', 'Delete');
        qDel.type = 'button';
        qDel.addEventListener('click', async function () {
          if (!window.confirm('Delete Q' + (idx + 1) + '?')) return;
          await api('/api/admin/mock-tests/' + encodeURIComponent(activeTest.id) + '/questions/' + encodeURIComponent(q.id), { method: 'DELETE' });
          toast('Question removed.', 'success');
          await refreshAndRender();
        });
        qa.append(qEd, qDel);
        item.appendChild(qa);
        qList.appendChild(item);
      });
      qCard.appendChild(qList);
    }

    container.appendChild(qCard);
  }

  // ============================================================================
  // MASTER RENDER
  // ============================================================================
  function renderWorkspace() {
    if (!S.root) return;
    renderHeaderActions();
    clear(S.root);
    var shell = el('div', 'stps-root');
    renderTabs(shell);

    if (S.composerOpen) {
      renderComposer(shell);
    } else if (S.activeTab === 'mock_tests') {
      renderCbtMockTestsTab(shell);
    } else if (S.activeTab === 'taxonomy') {
      renderTaxonomyTab(shell);
    } else if (S.activeTab === 'snippets') {
      renderSnippetsTab(shell);
    } else if (S.activeTab === 'doubts') {
      renderDoubtsTab(shell);
    } else {
      renderArticlesTab(shell);
    }
    S.root.appendChild(shell);
  }

  window.CSOStudyPublishingStudio = {
    render: function (workspaceRoot, headerActions, initialTab, initialTrackId) {
      S.root = workspaceRoot;
      S.headerActions = headerActions;
      if (typeof initialTrackId === 'string') {
        S.filters.l1 = initialTrackId;
        S.filters.l2 = '';
        S.filters.l3 = '';
        if (window.CSOStudio && window.CSOStudio.setStudyActiveTrack) {
          window.CSOStudio.setStudyActiveTrack(initialTrackId);
        }
      }
      if (initialTab === 'new') {
        S.activeTab = 'articles';
        loadAllData().then(function () { openComposer(null); }).catch(function () { openComposer(null); });
        return;
      }
      S.composerOpen = false;
      S.activeTab = ['articles', 'mock_tests', 'taxonomy', 'snippets', 'doubts'].indexOf(initialTab) !== -1 ? initialTab : 'articles';
      renderWorkspace();
      refreshAndRender();
    }
  };
})(window, document);
