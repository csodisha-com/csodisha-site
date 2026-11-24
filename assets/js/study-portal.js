/**
 * CS Odisha — Public Study Library Portal, Editorial Hero, Elevated Exam Track Cards,
 * 5-Column Curriculum Filter Bar & EdTech Reader (v257)
 * Strict CSP-compliant: zero unsafe HTML string sinks, zero .style.* mutations, zero inline handlers.
 * Hydrates /study-library/ and /study/ live from Cloudflare D1 (/api/public/study/*).
 */
(function (window, document) {
  'use strict';

  var FEATURED_TRACKS = [
    { key: 'opsc', match: ['opsc', 'oas'], icon: '🏛️', label_en: 'OPSC OAS', label_or: 'OPSC OAS' },
    { key: 'ossc', match: ['ossc', 'osssc'], icon: '📋', label_en: 'OSSC & OSSSC', label_or: 'OSSC ଓ OSSSC' },
    { key: 'tet', match: ['teaching', 'tet', 'oavs'], icon: '🎓', label_en: 'Teaching & TET', label_or: 'ଶିକ୍ଷକ ଓ TET' },
    { key: 'odisha', match: ['odisha-gk', 'odisha_gk', 'odia'], icon: '🗺️', label_en: 'Odisha GK & Odia', label_or: 'ଓଡ଼ିଶା GK ଓ ଓଡ଼ିଆ' },
    { key: 'central', match: ['central', 'upsc', 'ssc', 'ugc'], icon: '🇮🇳', label_en: 'Central Exams', label_or: 'କେନ୍ଦ୍ରୀୟ ପରୀକ୍ଷା' }
  ];

  var S = {
    root: null,
    tree: [],
    nodes: [],
    allItems: [],
    items: [],
    facets: { types: [], difficulties: [], priorities: [], mediums: [] },
    filters: { l1: '', l2: '', l3: '', type: '', difficulty: '', priority: '', medium: '', search: '' },
    progressSummary: null,
    progressMap: {},
    progressItems: [],
    isAdmin: false,
    langMode: 'en', // 'en' | 'or' | 'dual'
    flipMode: false,
    flipIdx: 0,
    flipRevealed: false,
    quizMode: 'tutor', // 'tutor' | 'timed'
    quizAnswers: {},
    quizSubmitted: false,
    quizTimerId: null,
    quizSecondsLeft: 0,
    activePdfUrl: ''
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

  function num(v) {
    try { return Number(v || 0).toLocaleString('en-IN'); } catch (_e) { return String(v || 0); }
  }

  function pick(obj, field) {
    if (!obj) return '';
    if (S.langMode === 'or' && obj[field + '_or']) return String(obj[field + '_or']);
    return String(obj[field + '_en'] || '');
  }

  function getLangPref() {
    try { return localStorage.getItem('cso_lang_pref') === 'or' ? 'or' : 'en'; } catch (_e) { return 'en'; }
  }

  function setLangPref(lang) {
    S.langMode = lang === 'or' ? 'or' : 'en';
    try { localStorage.setItem('cso_lang_pref', S.langMode); } catch (_e) {}
  }

  function safeUrl(u) {
    var s = String(u || '').trim();
    if (!s) return '';
    if (s.startsWith('/') && !s.startsWith('//')) return s;
    if (/^https?:\/\//i.test(s)) return s;
    return '';
  }

  function qsParam(name) {
    try { return new URLSearchParams(window.location.search).get(name) || ''; } catch (_e) { return ''; }
  }

  function fireTelemetry(event, article) {
    try {
      fetch('/api/public/study/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: event, id: article.id, slug: article.slug })
      }).catch(function () {});
    } catch (_e) {}
  }

  function injectJsonLd(article) {
    try {
      var prev = document.getElementById('cso-study-jsonld');
      if (prev) prev.remove();
      var sc = document.createElement('script');
      sc.type = 'application/ld+json';
      sc.id = 'cso-study-jsonld';
      var ld = {
        '@context': 'https://schema.org',
        '@type': 'LearningResource',
        name: article.title_en,
        alternateName: article.title_or || undefined,
        description: article.summary_en || article.subtitle_en || article.title_en,
        learningResourceType: article.resource_type_badge || 'Study Notes',
        educationalLevel: article.difficulty_level || 'Moderate',
        inLanguage: article.title_or ? ['en', 'or'] : ['en'],
        isAccessibleForFree: article.is_free_access !== false,
        timeRequired: 'PT' + (article.estimated_read_mins || 10) + 'M',
        url: 'https://csodisha.com/study-library/?slug=' + encodeURIComponent(article.slug),
        provider: {
          '@type': 'Organization',
          name: 'Common Sense Odisha',
          url: 'https://csodisha.com/'
        }
      };
      sc.textContent = JSON.stringify(ld);
      document.head.appendChild(sc);
    } catch (_e) {}
  }

  async function detectAdminSession() {
    var hint = false;
    try { hint = localStorage.getItem('cso_admin_active') === '1'; } catch (_e) {}
    if (!hint) return false;
    try {
      var res = await fetch('/api/admin/session', { credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) return false;
      var data = await res.json();
      S.isAdmin = Boolean(data && data.user);
      return S.isAdmin;
    } catch (_e) {
      S.isAdmin = false;
      return false;
    }
  }

  async function loadCandidateProgress() {
    try {
      var res = await fetch('/api/candidate/study-progress', { credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) return;
      var data = await res.json();
      if (data && data.ok) {
        S.progressSummary = data.summary || null;
        S.progressMap = data.by_article || {};
        S.progressItems = data.items || [];
      }
    } catch (_e) {}
  }

  async function saveCandidateProgress(payload) {
    try {
      var res = await fetch('/api/candidate/study-progress', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.status === 401 || res.status === 403) {
        return { authRequired: true };
      }
      var data = await res.json();
      if (data && data.ok && data.progress) {
        S.progressMap[payload.article_id] = data.progress;
      }
      return data;
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async function saveToCandidateVault(article) {
    try {
      var res = await fetch('/api/candidate/bookmarks', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add',
          postId: 'study-' + article.id,
          category: 'study',
          postTitle: article.title_en,
          postUrl: article.notes_pdf_url || ('/study-library/?slug=' + encodeURIComponent(article.slug))
        })
      });
      if (res.status === 401 || res.status === 403) return { authRequired: true };
      fireTelemetry('bookmark', article);
      return { ok: res.ok };
    } catch (_e) {
      return { ok: false };
    }
  }

  // ============================================================================
  // SAFE STRUCTURED MARKDOWN-TO-DOM RENDERER (ZERO HTML SINKS)
  // ============================================================================
  function appendInlineFormatted(parent, text) {
    var s = String(text || '');
    var tokenRe = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
    var last = 0;
    var m;
    while ((m = tokenRe.exec(s)) !== null) {
      if (m.index > last) parent.appendChild(document.createTextNode(s.slice(last, m.index)));
      var tok = m[0];
      if (tok.startsWith('**') && tok.endsWith('**')) {
        parent.appendChild(el('strong', '', tok.slice(2, -2)));
      } else {
        var lm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (lm) {
          var href = safeUrl(lm[2]);
          if (href) {
            var a = el('a', '', lm[1]);
            a.href = href;
            if (/^https?:\/\//i.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
            parent.appendChild(a);
          } else {
            parent.appendChild(document.createTextNode(lm[1]));
          }
        }
      }
      last = tokenRe.lastIndex;
    }
    if (last < s.length) parent.appendChild(document.createTextNode(s.slice(last)));
  }

  function renderProseBlock(container, markdownText) {
    var box = el('div', 'sp-prose');
    var lines = String(markdownText || '').split(/\r?\n/);
    var ul = null;
    function flushUl() {
      if (ul) { box.appendChild(ul); ul = null; }
    }
    lines.forEach(function (rawLine) {
      var line = rawLine.trim();
      if (!line) { flushUl(); return; }
      var imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imgMatch) {
        flushUl();
        var src = safeUrl(imgMatch[2]);
        if (src) {
          var img = el('img', 'sp-prose-img');
          img.src = src;
          img.alt = imgMatch[1] || 'Study diagram';
          img.loading = 'lazy';
          box.appendChild(img);
        }
        return;
      }
      if (line.startsWith('### ')) {
        flushUl();
        box.appendChild(el('h4', '', line.slice(4)));
        return;
      }
      if (line.startsWith('## ') || line.startsWith('# ')) {
        flushUl();
        box.appendChild(el('h3', '', line.replace(/^#{1,3}\s+/, '')));
        return;
      }
      if (line.startsWith('> ')) {
        flushUl();
        var call = el('div', 'sp-callout');
        appendInlineFormatted(call, line.slice(2));
        box.appendChild(call);
        return;
      }
      if (/^[-*•]\s+/.test(line)) {
        if (!ul) ul = el('ul');
        var li = el('li');
        appendInlineFormatted(li, line.replace(/^[-*•]\s+/, ''));
        ul.appendChild(li);
        return;
      }
      flushUl();
      var p = el('p');
      appendInlineFormatted(p, line);
      box.appendChild(p);
    });
    flushUl();
    container.appendChild(box);
  }

  function buildEmptyStudySvg() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 48 48');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'sp-empty-svg');
    var specs = [
      ['path', { d: 'M6 12c6 0 12 2 18 6 6-4 12-6 18-6v24c-6 0-12 2-18 6-6-4-12-6-18-6V12Z', stroke: 'currentColor', 'stroke-width': '2.4', 'stroke-linejoin': 'round' }],
      ['path', { d: 'M24 18v24', stroke: 'currentColor', 'stroke-width': '2.4', 'stroke-linecap': 'round' }],
      ['path', { d: 'M12 20h6M12 26h5M30 20h6M31 26h5', stroke: 'currentColor', 'stroke-width': '2.2', 'stroke-linecap': 'round' }]
    ];
    specs.forEach(function (sp) {
      var node = document.createElementNS(ns, sp[0]);
      Object.keys(sp[1]).forEach(function (k) { node.setAttribute(k, sp[1][k]); });
      svg.appendChild(node);
    });
    return svg;
  }

  function buildLangToggle(onSwitch) {
    var w = el('div', 'sp-lang-toggle');
    [['en', 'English'], ['or', 'ଓଡ଼ିଆ']].forEach(function (p) {
      var b = el('button', 'sp-lang-btn' + (S.langMode === p[0] ? ' is-active' : ''), p[1]);
      b.type = 'button';
      b.addEventListener('click', function () { setLangPref(p[0]); onSwitch(); });
      w.appendChild(b);
    });
    return w;
  }

  function computeStudyHeroKpis() {
    var src = S.allItems.length ? S.allItems : S.items;
    var pyqSylCount = 0;
    var mcqTotal = 0;
    src.forEach(function (m) {
      var badge = String(m.resource_type_badge || '').toLowerCase();
      if (badge.indexOf('pyq') !== -1 || badge.indexOf('syllabus') !== -1 || m.pyq_pdf_url) pyqSylCount++;
      mcqTotal += Number(m.mcq_count || 0);
    });
    var trackCount = S.nodes.filter(function (n) { return Number(n.level) === 1; }).length;
    return {
      moduleCount: src.length,
      pyqSylCount: pyqSylCount,
      mcqTotal: mcqTotal,
      trackCount: trackCount
    };
  }

  // ============================================================================
  // BROWSE MODE: EDITORIAL HERO + PROGRESS STRIP + EXAM TRACK CARDS + 5-COL BAR
  // ============================================================================
  async function fetchPortalData() {
    var q = new URLSearchParams();
    if (S.filters.l1) q.set('l1', S.filters.l1);
    if (S.filters.l2) q.set('l2', S.filters.l2);
    if (S.filters.l3) q.set('l3', S.filters.l3);
    if (S.filters.type) q.set('type', S.filters.type);
    if (S.filters.difficulty) q.set('difficulty', S.filters.difficulty);
    if (S.filters.priority) q.set('priority', S.filters.priority);
    if (S.filters.medium) q.set('medium', S.filters.medium);
    if (S.filters.search) q.set('search', S.filters.search);
    if (qsParam('refresh')) q.set('refresh', '1');
    var qs = q.toString() ? ('?' + q.toString()) : '';

    var res = await Promise.all([
      fetch('/api/public/study/tree' + (qsParam('refresh') ? '?refresh=1' : ''), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; }),
      fetch('/api/public/study' + qs, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; })
    ]);
    S.tree = res[0].tree || [];
    S.nodes = res[0].nodes || [];
    S.items = res[1].items || [];
    if (!qs || (qs === '?refresh=1')) S.allItems = S.items.slice();
    S.facets = res[1].facets || S.facets;
  }

  function renderProgressStrip(shell) {
    if (!S.progressSummary) return;
    var sum = S.progressSummary;
    var card = el('section', 'sp-progress-card');
    card.setAttribute('aria-label', 'Candidate Syllabus Progress');

    var top = el('div', 'sp-progress-top');
    var head = el('div', 'sp-progress-head');
    head.appendChild(el('h2', 'sp-progress-title', S.langMode === 'or'
      ? '🎯 ଆପଣଙ୍କ ସିଲାବସ୍ ସମାପ୍ତି ଓ ଅଧ୍ୟୟନ ଧାରା'
      : '🎯 Your Syllabus Completion & Study Streak'));
    head.appendChild(el('span', 'sp-progress-sub', S.langMode === 'or'
      ? 'ଆପଣଙ୍କ ପ୍ରାର୍ଥୀ ହବ୍ ସହିତ ସ୍ୱୟଂଚାଳିତ ଭାବେ ସିଙ୍କ୍ ହୋଇଛି।'
      : 'Synced live with your Candidate Hub study tracker & revision queue.'));
    top.appendChild(head);

    var stats = el('div', 'sp-progress-stats');
    stats.appendChild(el('span', 'sp-stat-chip is-emerald', '✅ ' + num(sum.completed_count) + '/' + num(sum.total_published) + ' Completed (' + num(sum.completion_pct) + '%)'));
    stats.appendChild(el('span', 'sp-stat-chip is-amber', '🔥 ' + num(sum.streak_days || 0) + ' Day Streak'));
    stats.appendChild(el('span', 'sp-stat-chip', '🔁 ' + num(sum.revision_count || 0) + ' Flagged for Revision'));
    top.appendChild(stats);
    card.appendChild(top);

    var prog = el('progress', 'sp-progress-bar');
    prog.max = 100;
    prog.value = Number(sum.completion_pct || 0);
    card.appendChild(prog);

    var foot = el('div', 'sp-progress-foot');
    var crow = el('div', 'sp-continue-row');
    if (S.progressItems.length) {
      crow.appendChild(el('span', 'sp-muted', '⏱ Recent Chapters:'));
      S.progressItems.slice(0, 3).forEach(function (it) {
        if (!it.slug) return;
        var a = el('a', 'sp-continue-pill', (it.status === 'completed' ? '✅ ' : '📖 ') + (it.title_en || it.slug));
        a.href = '/study-library/?slug=' + encodeURIComponent(it.slug);
        crow.appendChild(a);
      });
    } else {
      crow.appendChild(el('span', 'sp-muted', 'Open any chapter below to start building your daily study streak.'));
    }
    foot.appendChild(crow);

    var latestItem = S.progressItems.find(function (it) { return it && it.slug; });
    var resumeA = el('a', 'sp-btn sp-btn-sm sp-btn-primary', S.langMode === 'or'
      ? 'ଶେଷ ଅଧ୍ୟାୟ ଜାରି ରଖନ୍ତୁ / ରିଭିଜନ୍ କ୍ୟୁ ଦେଖନ୍ତୁ →'
      : 'Resume Last Chapter / View Revision Queue →');
    resumeA.href = latestItem ? ('/study-library/?slug=' + encodeURIComponent(latestItem.slug)) : '/student-dashboard/';
    foot.appendChild(resumeA);

    card.appendChild(foot);
    shell.appendChild(card);
  }

  function renderExamTrackCards(box, l1Nodes) {
    var strip = el('div', 'sp-track-strip');
    strip.setAttribute('role', 'group');
    strip.setAttribute('aria-label', 'Filter by Exam Track');

    var allBtn = el('button', 'sp-track-card' + (!S.filters.l1 ? ' is-active' : ''));
    allBtn.type = 'button';
    var allL = el('span', 'sp-track-left');
    allL.appendChild(el('span', 'sp-track-icon', '📚'));
    allL.appendChild(el('span', 'sp-track-name', S.langMode === 'or' ? 'ସମସ୍ତ ପରୀକ୍ଷା ଟ୍ରାକ୍' : 'All Exam Tracks'));
    allBtn.appendChild(allL);
    allBtn.appendChild(el('span', 'sp-track-count', num(S.allItems.length || S.items.length)));
    allBtn.addEventListener('click', function () {
      S.filters.l1 = ''; S.filters.l2 = ''; S.filters.l3 = '';
      reloadBrowser();
    });
    strip.appendChild(allBtn);

    // Match featured 5 elevated tracks from seeded L1 nodes (plus graceful fallback)
    FEATURED_TRACKS.forEach(function (ft) {
      var matchedNode = l1Nodes.find(function (n) {
        var hay = ((n.slug || '') + ' ' + (n.title_en || '')).toLowerCase();
        return ft.match.some(function (tok) { return hay.indexOf(tok) !== -1; });
      });
      var count = matchedNode ? Number(matchedNode.published_modules_count || 0) : 0;
      var isAct = Boolean(matchedNode && S.filters.l1 === matchedNode.id);

      var b = el('button', 'sp-track-card' + (isAct ? ' is-active' : ''));
      b.type = 'button';
      var lf = el('span', 'sp-track-left');
      lf.appendChild(el('span', 'sp-track-icon', (matchedNode && matchedNode.icon) || ft.icon));
      lf.appendChild(el('span', 'sp-track-name', S.langMode === 'or' ? ft.label_or : ft.label_en));
      b.appendChild(lf);
      b.appendChild(el('span', 'sp-track-count', num(count)));
      b.addEventListener('click', function () {
        if (matchedNode) {
          S.filters.l1 = matchedNode.id;
          S.filters.l2 = '';
          S.filters.l3 = '';
          reloadBrowser();
        }
      });
      strip.appendChild(b);
    });

    box.appendChild(strip);
  }

  function renderCurriculumTracksDirectory(shell) {
    var l1Map = {};
    var l3CountsByL2 = {};
    S.nodes.forEach(function (n) {
      if (Number(n.level) === 1) l1Map[n.id] = n;
      if (Number(n.level) === 3 && n.parent_id) {
        l3CountsByL2[n.parent_id] = (l3CountsByL2[n.parent_id] || 0) + 1;
      }
    });

    var l2Nodes = S.nodes.filter(function (n) {
      return Number(n.level) === 2 && (!S.filters.l1 || n.parent_id === S.filters.l1);
    });
    var displayNodes = l2Nodes.length ? l2Nodes : S.nodes.filter(function (n) { return Number(n.level) === 1; });
    if (!displayNodes.length) return;

    var sec = el('section', 'sp-tracks-section');
    sec.setAttribute('aria-label', 'Browse 3-Layer Exam Tracks & Subjects');
    var head = el('div', 'sp-tracks-head');
    var hl = el('div');
    hl.appendChild(el('h2', 'sp-h2', S.langMode === 'or'
      ? '୩-ସ୍ତରୀୟ ପରୀକ୍ଷା ଟ୍ରାକ୍ ଏବଂ ବିଷୟଗୁଡ଼ିକ ବ୍ରାଉଜ୍ କରନ୍ତୁ'
      : 'Browse 3-Layer Exam Tracks & Subjects'));
    hl.appendChild(el('div', 'sp-muted', S.langMode === 'or'
      ? 'OPSC OAS, OSSC/OSSSC, OTET/OSSTET, ଓଡ଼ିଶା GK, ଓଡ଼ିଆ ବ୍ୟାକରଣ, UGC NET, UPSC/SSC ଏବଂ BSE/CHSE ପାଠ୍ୟକ୍ରମ ଅନୁସନ୍ଧାନ କରନ୍ତୁ।'
      : 'Explore Odisha & Central curriculum tracks (OPSC OAS, OSSC & OSSSC Combined, OTET / OSSTET / OAVS, Odisha GK, Odia Grammar, UGC NET, UPSC / SSC / Banking, BSE Odisha / CHSE).'));
    head.appendChild(hl);
    head.appendChild(el('span', 'sp-badge', num(S.nodes.length) + ' Curriculum Nodes'));
    sec.appendChild(head);

    var grid = el('div', 'sp-tracks-grid');
    displayNodes.forEach(function (d) {
      var isL2 = Number(d.level) === 2;
      var parent = isL2 ? l1Map[d.parent_id] : null;
      var card = el('button', 'sp-curriculum-card' + ((isL2 ? S.filters.l2 === d.id : S.filters.l1 === d.id) ? ' is-active' : ''));
      card.type = 'button';

      var top = el('div', 'sp-curriculum-top');
      top.appendChild(el('span', 'sp-badge', (d.icon ? d.icon + ' ' : '') + (parent ? pick(parent, 'title') : 'Exam Track')));
      var rightTag = Number(d.published_modules_count || 0) > 0
        ? (num(d.published_modules_count) + ' Live')
        : (l3CountsByL2[d.id] ? (num(l3CountsByL2[d.id]) + ' Formats') : 'Ready');
      top.appendChild(el('span', 'sp-badge is-done', rightTag));
      card.appendChild(top);

      card.appendChild(el('div', 'sp-curriculum-title', pick(d, 'title')));
      if (pick(d, 'subtitle')) card.appendChild(el('div', 'sp-curriculum-sub', pick(d, 'subtitle')));

      card.addEventListener('click', function () {
        if (isL2) {
          S.filters.l1 = d.parent_id || '';
          S.filters.l2 = d.id;
          S.filters.l3 = '';
        } else {
          S.filters.l1 = d.id;
          S.filters.l2 = '';
          S.filters.l3 = '';
        }
        reloadBrowser();
      });
      grid.appendChild(card);
    });
    sec.appendChild(grid);
    shell.appendChild(sec);
  }

  function renderBrowserView() {
    var activeEl = document.activeElement;
    var restoreFocusId = (activeEl && activeEl.id === 'sp-study-search') ? activeEl.id : '';

    clear(S.root);
    var hasFilter = Boolean(S.filters.l1 || S.filters.l2 || S.filters.l3 || S.filters.type || S.filters.difficulty || S.filters.priority || S.filters.medium || S.filters.search);
    var kpis = computeStudyHeroKpis();
    var shell = el('div', 'sp-root');

    // 1. Flagship Editorial Hero Banner (v257)
    var hero = el('section', 'sp-hero');
    hero.setAttribute('aria-label', 'Odisha & Central Exam Study Library & PYQ Hub');

    var heroTop = el('div', 'sp-hero-top');
    var eyebrow = el('span', 'sp-eyebrow');
    eyebrow.appendChild(el('span', 'sp-eyebrow-dot'));
    eyebrow.appendChild(el('span', '', S.langMode === 'or'
      ? 'ଓଡ଼ିଶା ଏବଂ କେନ୍ଦ୍ର ପରୀକ୍ଷା ପ୍ରସ୍ତୁତି · ସିଲାବସ୍, ନୋଟ୍ସ, PYQ ଓ ମକ୍ ଟେଷ୍ଟ'
      : 'ODISHA & CENTRAL EXAM PREPARATION · SYLLABI, NOTES, PYQS & MOCKS'));
    heroTop.appendChild(eyebrow);
    heroTop.appendChild(buildLangToggle(function () { renderBrowserView(); }));
    hero.appendChild(heroTop);

    var copy = el('div', 'sp-hero-copy');
    copy.appendChild(el('h1', 'sp-hero-title', S.langMode === 'or'
      ? 'ଓଡ଼ିଶା ଏବଂ କେନ୍ଦ୍ର ପରୀକ୍ଷା ଅଧ୍ୟୟନ ପାଠାଗାର ଓ PYQ ହବ୍'
      : 'Odisha & Central Exam Study Library & PYQ Hub'));
    copy.appendChild(el('p', 'sp-hero-sub', S.langMode === 'or'
      ? 'OPSC, OSSC, OSSSC, OTET/OSSTET, ଓଡ଼ିଶା GK, UPSC ଏବଂ SSC ପାଇଁ ଦ୍ୱିଭାଷୀ ଅଧ୍ୟୟନ ନୋଟ୍ସ, ସରକାରୀ ସିଲାବସ୍, ସମାଧାନ ହୋଇଥିବା ବିଗତ ବର୍ଷର ପ୍ରଶ୍ନପତ୍ର (PYQs), ଇଣ୍ଟରାକ୍ଟିଭ୍ ଫ୍ଲିପ୍-କାର୍ଡ ଏବଂ ଟାଇମ୍ଡ୍ ମିନି-ମକ୍।'
      : 'Structured bilingual study notes, official exam syllabi, solved previous year papers (PYQs), interactive flashcards, and timed mini-mocks across OPSC, OSSC, OSSSC, OTET/OSSTET, Odisha GK, UPSC & SSC.'));
    hero.appendChild(copy);

    var kpiRow = el('div', 'sp-hero-kpis');
    [
      [num(kpis.moduleCount), S.langMode === 'or' ? 'ଅଧ୍ୟୟନ ମଡ୍ୟୁଲ୍' : 'Study Modules'],
      [num(kpis.pyqSylCount), S.langMode === 'or' ? 'PYQ ଓ ସିଲାବସ୍ ସେଟ୍' : 'PYQ & Syllabus Sets'],
      [num(kpis.mcqTotal), S.langMode === 'or' ? 'ଅଭ୍ୟାସ MCQ' : 'Practice MCQs'],
      [num(kpis.trackCount), S.langMode === 'or' ? 'ପରୀକ୍ଷା ଟ୍ରାକ୍' : 'Exam Tracks']
    ].forEach(function (pair) {
      var tile = el('div', 'sp-hero-kpi');
      tile.appendChild(el('strong', 'sp-hero-kpi-val', pair[0]));
      tile.appendChild(el('span', 'sp-hero-kpi-label', pair[1]));
      kpiRow.appendChild(tile);
    });
    hero.appendChild(kpiRow);
    shell.appendChild(hero);

    // 2. Polished Candidate Syllabus Progress & Streak Strip
    renderProgressStrip(shell);

    // 3. Elevated Exam Track Cards + Quick Resource Pills + 5-Column Curriculum Filter Bar
    var box = el('section', 'sp-browser-box');
    box.setAttribute('aria-label', 'Study Library Curriculum Filters');

    var l1Nodes = S.nodes.filter(function (n) { return Number(n.level) === 1; });
    renderExamTrackCards(box, l1Nodes);

    // Quick resource-type pills
    var pills = el('div', 'sp-pill-strip');
    [
      ['All Materials', '', ''],
      ['Syllabus', 'Syllabus', ''],
      ['Study Notes', 'Study Notes', ''],
      ['PYQs', 'PYQ Paper', ''],
      ['Practice Sets', 'Practice Set', ''],
      ['Revision Sheets', 'Revision Sheet', ''],
      ['🔥 Must-Study High-Yield', '', 'Must-Study']
    ].forEach(function (p) {
      var active = p[2] ? (S.filters.priority === p[2]) : (!S.filters.priority && S.filters.type === p[1]);
      var btn = el('button', 'sp-pill-btn' + (active ? ' is-active' : ''), p[0]);
      btn.type = 'button';
      btn.addEventListener('click', function () {
        S.filters.type = p[1];
        S.filters.priority = p[2];
        reloadBrowser();
      });
      pills.appendChild(btn);
    });

    if (hasFilter) {
      var rstBtn = el('button', 'sp-btn sp-btn-sm', '✕ Reset Filters');
      rstBtn.type = 'button';
      rstBtn.addEventListener('click', function () {
        S.filters = { l1: '', l2: '', l3: '', type: '', difficulty: '', priority: '', medium: '', search: '' };
        reloadBrowser();
      });
      pills.appendChild(rstBtn);
    }
    box.appendChild(pills);

    // 5-Column Curriculum Filter Bar
    var row = el('div', 'sp-cascading-row');
    function makeSelectField(id, labelText, defaultLabel, opts, val, onChange) {
      var f = el('div', 'sp-field');
      var lbl = el('label', 'sp-label', labelText);
      lbl.setAttribute('for', id);
      f.appendChild(lbl);
      var sel = el('select', 'sp-select');
      sel.id = id;
      sel.appendChild(new Option(defaultLabel, ''));
      opts.forEach(function (o) { sel.appendChild(new Option(o[1], o[0])); });
      sel.value = val;
      sel.addEventListener('change', function () { onChange(sel.value); });
      f.appendChild(sel);
      return f;
    }

    var l2Nodes = S.nodes.filter(function (n) { return Number(n.level) === 2 && (!S.filters.l1 || n.parent_id === S.filters.l1); });
    var l3Nodes = S.nodes.filter(function (n) { return Number(n.level) === 3 && (!S.filters.l2 || n.parent_id === S.filters.l2); });

    row.appendChild(makeSelectField(
      'sp-sel-track',
      '1. Exam Track',
      S.langMode === 'or' ? 'ସମସ୍ତ ପରୀକ୍ଷା ଟ୍ରାକ୍' : 'All Exam Tracks',
      l1Nodes.map(function (n) { return [n.id, (n.icon ? n.icon + ' ' : '') + pick(n, 'title') + (n.published_modules_count ? ' (' + n.published_modules_count + ')' : '')]; }),
      S.filters.l1,
      function (v) { S.filters.l1 = v; S.filters.l2 = ''; S.filters.l3 = ''; reloadBrowser(); }
    ));

    row.appendChild(makeSelectField(
      'sp-sel-subject',
      '2. Subject / Paper',
      S.langMode === 'or' ? 'ସମସ୍ତ ବିଷୟ / ପେପର୍' : 'All Subjects / Papers',
      l2Nodes.map(function (n) { return [n.id, (n.icon ? n.icon + ' ' : '') + pick(n, 'title')]; }),
      S.filters.l2,
      function (v) { S.filters.l2 = v; S.filters.l3 = ''; reloadBrowser(); }
    ));

    row.appendChild(makeSelectField(
      'sp-sel-chapter',
      '3. Chapter / Format',
      S.langMode === 'or' ? 'ସମସ୍ତ ଅଧ୍ୟାୟ / ଫର୍ମାଟ୍' : 'All Chapters / Formats',
      l3Nodes.map(function (n) { return [n.id, (n.icon ? n.icon + ' ' : '') + pick(n, 'title')]; }),
      S.filters.l3,
      function (v) { S.filters.l3 = v; reloadBrowser(); }
    ));

    row.appendChild(makeSelectField(
      'sp-sel-difficulty',
      '4. Difficulty Level',
      S.langMode === 'or' ? 'ସମସ୍ତ ସ୍ତର' : 'All Difficulty Levels',
      [['Foundation', 'Foundation'], ['Moderate', 'Moderate'], ['Advanced', 'Advanced']],
      S.filters.difficulty,
      function (v) { S.filters.difficulty = v; reloadBrowser(); }
    ));

    var qField = el('div', 'sp-field');
    var qLbl = el('label', 'sp-label', '5. Search Topic or Paper Code');
    qLbl.setAttribute('for', 'sp-study-search');
    qField.appendChild(qLbl);
    var searchInp = el('input', 'sp-input');
    searchInp.id = 'sp-study-search';
    searchInp.type = 'search';
    searchInp.placeholder = S.langMode === 'or' ? 'ବିଷୟ, OPSC/OSSC ପେପର୍ କିମ୍ବା PYQ ବର୍ଷ...' : 'Search topic, OPSC/OSSC paper, PYQ year...';
    searchInp.value = S.filters.search;
    var searchTimer = null;
    searchInp.addEventListener('input', function () {
      S.filters.search = searchInp.value.trim();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { reloadBrowser(); }, 180);
    });
    searchInp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        clearTimeout(searchTimer);
        S.filters.search = searchInp.value.trim();
        reloadBrowser();
      }
    });
    qField.appendChild(searchInp);
    row.appendChild(qField);

    box.appendChild(row);
    shell.appendChild(box);

    // 4. Study Module Cards OR Designed Illustrated Empty State + 3-Layer Exam Tracks & Subjects Grid
    if (!S.items.length) {
      var emptyCard = el('section', 'sp-empty-card');
      emptyCard.setAttribute('aria-label', 'Study Library Status');
      var art = el('div', 'sp-empty-art');
      art.appendChild(buildEmptyStudySvg());
      emptyCard.appendChild(art);

      emptyCard.appendChild(el('h2', 'sp-empty-title', hasFilter
        ? (S.langMode === 'or' ? 'ଆପଣଙ୍କ ଫିଲ୍ଟର୍ ସହିତ କୌଣସି ଅଧ୍ୟୟନ ମଡ୍ୟୁଲ୍ ମିଳିଲା ନାହିଁ' : 'No Study Modules Match Your Selected Filters')
        : (S.langMode === 'or' ? 'ନୂତନ ଦ୍ୱିଭାଷୀ ଅଧ୍ୟୟନ ନୋଟ୍ସ, ସିଲାବସ୍ ଏବଂ PYQ ଶୀଘ୍ର ପ୍ରକାଶିତ ହେବ' : 'Fresh Bilingual Study Notes, Syllabi & PYQs Coming Soon')));

      emptyCard.appendChild(el('p', 'sp-empty-desc', hasFilter
        ? (S.langMode === 'or'
          ? 'ଅନ୍ୟ ପରୀକ୍ଷା ଟ୍ରାକ୍, ବିଷୟ କିମ୍ବା ଫର୍ମାଟ୍ ଚେଷ୍ଟା କରନ୍ତୁ କିମ୍ବା ସମସ୍ତ ଫିଲ୍ଟର୍ ରିସେଟ୍ କରନ୍ତୁ।'
          : 'Try broadening your Exam Track, Subject, Format, or Difficulty filters — or browse our 3-layer Odisha & Central curriculum tracks below.')
        : (S.langMode === 'or'
          ? 'ଏହି ପାଠାଗାରରେ ପ୍ରକାଶିତ ପ୍ରତ୍ୟେକ ନୋଟ୍ସ, ସିଲାବସ୍ ଏବଂ PYQ ଓଡ଼ିଶା ଓ କେନ୍ଦ୍ର ପରୀକ୍ଷାର ସରକାରୀ ପାଠ୍ୟକ୍ରମ ଅନୁସାରେ ପ୍ରସ୍ତୁତ। ତଳେ ଥିବା ପରୀକ୍ଷା ଟ୍ରାକ୍ ଓ ବିଷୟଗୁଡ଼ିକୁ ବ୍ରାଉଜ୍ କରନ୍ତୁ।'
          : 'Every syllabus blueprint, chapter note, solved PYQ set, and MCQ pack published here is structured for Odisha & Central exam aspirants with bilingual EN + ଓଡ଼ିଆ support. Explore the curriculum tracks below.')));

      var empActs = el('div', 'sp-pill-strip');
      if (hasFilter) {
        var rAll = el('button', 'sp-btn sp-btn-primary', S.langMode === 'or' ? 'ସମସ୍ତ ଫିଲ୍ଟର୍ ରିସେଟ୍ କରନ୍ତୁ' : 'Reset All Filters');
        rAll.type = 'button';
        rAll.addEventListener('click', function () {
          S.filters = { l1: '', l2: '', l3: '', type: '', difficulty: '', priority: '', medium: '', search: '' };
          reloadBrowser();
        });
        empActs.appendChild(rAll);
      }
      var jobsA = el('a', 'sp-btn', S.langMode === 'or' ? '💼 ସରକାରୀ ଚାକିରି ଦେଖନ୍ତୁ →' : '💼 Explore Government Jobs →');
      jobsA.href = '/jobs/';
      empActs.appendChild(jobsA);

      if (S.isAdmin) {
        var admA = el('a', 'sp-btn sp-btn-primary', '+ Publish First Study Module in Admin Studio ↗');
        admA.href = '/admin/#folder-study-library';
        empActs.appendChild(admA);
      }
      emptyCard.appendChild(empActs);
      shell.appendChild(emptyCard);

      renderCurriculumTracksDirectory(shell);
    } else {
      var resBar = el('div', 'sp-results-bar');
      resBar.appendChild(el('h2', 'sp-h2', S.langMode === 'or'
        ? (num(S.items.length) + ' ଟି ଦ୍ୱିଭାଷୀ ଅଧ୍ୟୟନ ମଡ୍ୟୁଲ୍ ଓ PYQ ସେଟ୍')
        : (num(S.items.length) + ' Verified Study Module' + (S.items.length === 1 ? '' : 's') + ' & PYQ Resource' + (S.items.length === 1 ? '' : 's'))));
      if (S.isAdmin) {
        var pubMore = el('a', 'sp-btn sp-btn-sm', '+ Publish New Study Module in Admin Studio ↗');
        pubMore.href = '/admin/#folder-study-library';
        resBar.appendChild(pubMore);
      }
      shell.appendChild(resBar);

      var grid = el('div', 'sp-cards-grid');
      S.items.forEach(function (a) {
        var card = el('article', 'sp-card');
        if (a.cover_image_url && safeUrl(a.cover_image_url)) {
          var img = el('img', 'sp-card-cover');
          img.src = safeUrl(a.cover_image_url);
          img.alt = a.title_en;
          img.loading = 'lazy';
          img.decoding = 'async';
          card.appendChild(img);
        }
        var body = el('div', 'sp-card-body');
        var badges = el('div', 'sp-card-badges');
        badges.appendChild(el('span', 'sp-badge', a.resource_type_badge || 'Study Notes'));
        var pCls = a.high_yield_priority === 'Must-Study' ? 'is-must' : (a.high_yield_priority === 'High' ? 'is-high' : '');
        badges.appendChild(el('span', 'sp-badge ' + pCls, a.high_yield_priority || 'High'));
        if (a.pyq_year) badges.appendChild(el('span', 'sp-badge', 'PYQ ' + a.pyq_year));
        var prog = S.progressMap[a.id];
        if (prog && prog.status === 'completed') badges.appendChild(el('span', 'sp-badge is-done', '✅ Completed'));
        if (prog && prog.needs_revision) badges.appendChild(el('span', 'sp-badge is-rev', '🔁 Revise'));
        body.appendChild(badges);

        var h3 = el('h3', 'sp-card-title');
        var link = el('a', '', pick(a, 'title') || a.title_en);
        link.href = '/study-library/?slug=' + encodeURIComponent(a.slug);
        h3.appendChild(link);
        body.appendChild(h3);

        if (a.title_or && S.langMode !== 'or') body.appendChild(el('div', 'sp-card-or', a.title_or));
        var sumTxt = pick(a, 'summary');
        if (sumTxt) body.appendChild(el('p', 'sp-card-summary', sumTxt.slice(0, 155)));

        var foot = el('div', 'sp-card-foot');
        var metaStr = '⏱ ' + (a.estimated_read_mins || 10) + 'm · ' + (a.difficulty_level || 'Moderate');
        if (a.mcq_count) metaStr += ' · ' + a.mcq_count + ' MCQs';
        if (a.flashcard_count) metaStr += ' · ' + a.flashcard_count + ' Cards';
        foot.appendChild(el('span', '', metaStr));
        var openBtn = el('a', 'sp-btn sp-btn-primary sp-btn-sm', S.langMode === 'or' ? 'ମଡ୍ୟୁଲ୍ ପଢ଼ନ୍ତୁ →' : 'Read Module →');
        openBtn.href = '/study-library/?slug=' + encodeURIComponent(a.slug);
        foot.appendChild(openBtn);
        body.appendChild(foot);

        card.appendChild(body);
        grid.appendChild(card);
      });
      shell.appendChild(grid);
    }

    S.root.appendChild(shell);

    if (restoreFocusId) {
      var refocusEl = document.getElementById(restoreFocusId);
      if (refocusEl && typeof refocusEl.focus === 'function') refocusEl.focus();
    }
  }

  async function reloadBrowser() {
    await fetchPortalData();
    renderBrowserView();
  }

  // ============================================================================
  // READER MODE: FULL VISUAL STUDY READER & DRAFT PREVIEW
  // ============================================================================
  function formatCountdown(sec) {
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function parsePenalty(ruleStr) {
    var m = String(ruleStr || '').match(/-(\d+(?:\.\d+)?)/);
    return m ? Number(m[1]) : 0;
  }

  async function renderReaderView(slug, previewToken) {
    clear(S.root);
    S.root.appendChild(el('div', 'sp-empty', 'Loading study module...'));

    var apiUrl = '/api/public/study/article?slug=' + encodeURIComponent(slug);
    if (previewToken) apiUrl += '&preview_token=' + encodeURIComponent(previewToken);
    if (qsParam('refresh')) apiUrl += '&refresh=1';

    var res = await fetch(apiUrl, { credentials: 'same-origin', cache: 'no-store' });
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok || !data.article) {
      clear(S.root);
      var nf = el('div', 'sp-empty-card');
      nf.appendChild(el('h2', 'sp-empty-title', 'Study Module Not Found'));
      nf.appendChild(el('p', 'sp-empty-desc', data.error || 'This study resource may be unpublished or its draft preview link has expired.'));
      var back = el('a', 'sp-btn sp-btn-primary', '← Back to Study Library');
      back.href = '/study-library/';
      nf.appendChild(back);
      S.root.appendChild(nf);
      return;
    }

    var a = data.article;
    document.title = a.title_en + ' | Study Library — Common Sense Odisha';
    if (!data.is_preview) {
      fireTelemetry('view', a);
      injectJsonLd(a);
    }

    S.flipMode = false;
    S.flipIdx = 0;
    S.flipRevealed = false;
    S.quizAnswers = {};
    S.quizSubmitted = false;
    S.activePdfUrl = a.notes_pdf_url || a.pyq_pdf_url || a.answer_key_pdf_url || '';

    drawReaderDom(data);
  }

  function drawReaderDom(data) {
    var a = data.article;
    clear(S.root);
    var shell = el('div', 'sp-root sp-reader');

    // Floating Admin Draft Preview Banner
    if (data.is_preview) {
      var prev = el('div', 'sp-preview-banner');
      var expText = data.preview_expires_at ? ('Expires ' + new Date(data.preview_expires_at).toLocaleTimeString()) : 'Expires in 2h';
      prev.appendChild(el('span', '', '👁 ADMIN DRAFT PREVIEW — Not Yet Public (' + expText + ')'));
      prev.appendChild(el('span', '', 'Switch Theme / Language / A4 Print to verify before publishing'));
      shell.appendChild(prev);
    }

    // Hero Card
    var hero = el('section', 'sp-reader-hero');
    if (a.cover_image_url && safeUrl(a.cover_image_url)) {
      var banner = el('img', 'sp-hero-banner');
      banner.src = safeUrl(a.cover_image_url);
      banner.alt = a.cover_image_caption || a.title_en;
      hero.appendChild(banner);
      if (a.cover_image_caption) hero.appendChild(el('div', 'sp-hero-caption', a.cover_image_caption));
    }
    var hi = el('div', 'sp-hero-inner');

    var crumb = el('nav', 'sp-breadcrumb');
    var homeA = el('a', '', '← Study Library'); homeA.href = '/study-library/';
    crumb.appendChild(homeA);
    [a.taxonomy && a.taxonomy.l1, a.taxonomy && a.taxonomy.l2, a.taxonomy && a.taxonomy.l3].forEach(function (t) {
      if (!t) return;
      crumb.appendChild(el('span', '', '›'));
      crumb.appendChild(el('span', '', t.title_en));
    });
    hi.appendChild(crumb);

    if (a.edition_note_en || a.edition_note_or) {
      var edText = S.langMode === 'or' && a.edition_note_or ? a.edition_note_or : (a.edition_note_en || a.edition_note_or);
      hi.appendChild(el('div', 'sp-edition-banner', '📌 ' + edText));
    }

    hi.appendChild(el('h1', 'sp-reader-title', S.langMode === 'or' && a.title_or ? a.title_or : a.title_en));
    if (a.title_or && S.langMode !== 'or') hi.appendChild(el('p', 'sp-reader-title-or', a.title_or));
    if (a.summary_en || a.summary_or) {
      var sumTxt = S.langMode === 'or' && a.summary_or ? a.summary_or : (a.summary_en || a.summary_or);
      hi.appendChild(el('p', '', sumTxt));
    }

    // 6 Color-Coded At-a-Glance Curriculum Tiles
    var tiles = el('div', 'sp-tiles-6');
    [
      ['Exam Track', (a.taxonomy && a.taxonomy.l1 && a.taxonomy.l1.title_en) || a.exam_board_tag || 'Odisha & Central', 't-emerald'],
      ['Subject & Paper', ((a.taxonomy && a.taxonomy.l2 && a.taxonomy.l2.title_en) || 'General Studies') + (a.paper_code ? ' · ' + a.paper_code : ''), 't-cobalt'],
      ['Resource Type', a.resource_type_badge + (a.pyq_year ? ' (' + a.pyq_year + ')' : ''), 't-amber'],
      ['Difficulty & Yield', (a.difficulty_level || 'Moderate') + ' · ' + (a.high_yield_priority || 'High'), 't-rose'],
      ['Est. Read Time', (a.estimated_read_mins || 10) + ' mins · ' + (a.mcq_count || 0) + ' MCQs', 't-violet'],
      ['Marking / Medium', (a.negative_marking_rule || 'None') + ' · ' + (a.language_medium || 'Bilingual'), 't-teal']
    ].forEach(function (t) {
      var c = el('div', 'sp-tile ' + t[2]);
      c.appendChild(el('span', 'sp-tile-label', t[0]));
      c.appendChild(el('strong', 'sp-tile-val', t[1]));
      tiles.appendChild(c);
    });
    hi.appendChild(tiles);
    hero.appendChild(hi);
    shell.appendChild(hero);

    // Language Mode Bar + Candidate Study Progress & Vault Bar
    var actionBar = el('div', 'sp-action-bar sp-no-print');
    var langGroup = el('div', 'sp-action-group');
    [['en', 'English'], ['or', 'ଓଡ଼ିଆ'], ['dual', 'Bilingual Side-by-Side']].forEach(function (m) {
      var b = el('button', 'sp-btn sp-btn-sm' + (S.langMode === m[0] ? ' sp-btn-primary' : ''), m[1]);
      b.type = 'button';
      b.addEventListener('click', function () { S.langMode = m[0]; drawReaderDom(data); });
      langGroup.appendChild(b);
    });

    var prog = S.progressMap[a.id] || { status: 'not_started', needs_revision: false };
    var candGroup = el('div', 'sp-action-group');
    var statusFeedback = el('span', 'sp-card-or', '');

    var btnDone = el('button', 'sp-btn sp-btn-sm ' + (prog.status === 'completed' ? 'sp-btn-emerald' : ''), prog.status === 'completed' ? '✅ Chapter Completed' : '☐ Mark Chapter Completed');
    btnDone.type = 'button';
    btnDone.addEventListener('click', async function () {
      var nextStatus = prog.status === 'completed' ? 'in_progress' : 'completed';
      var r = await saveCandidateProgress({ article_id: a.id, status: nextStatus });
      if (r && r.authRequired) { statusFeedback.textContent = 'Sign in to Candidate Hub to track syllabus completion.'; return; }
      statusFeedback.textContent = nextStatus === 'completed' ? 'Saved! Syllabus progress & study streak updated.' : 'Marked in progress.';
      drawReaderDom(data);
    });

    var btnRev = el('button', 'sp-btn sp-btn-sm ' + (prog.needs_revision ? 'sp-btn-violet' : ''), prog.needs_revision ? '🔁 Flagged for Revision' : '🔁 Flag for Revision');
    btnRev.type = 'button';
    btnRev.addEventListener('click', async function () {
      var nextRev = !prog.needs_revision;
      var r = await saveCandidateProgress({ article_id: a.id, needs_revision: nextRev });
      if (r && r.authRequired) { statusFeedback.textContent = 'Sign in to Candidate Hub to save revision flags.'; return; }
      drawReaderDom(data);
    });

    var btnVault = el('button', 'sp-btn sp-btn-sm', '📥 Save PDF to Candidate Vault');
    btnVault.type = 'button';
    btnVault.addEventListener('click', async function () {
      var r = await saveToCandidateVault(a);
      if (r && r.authRequired) { statusFeedback.textContent = 'Sign in to save to your Candidate Vault.'; return; }
      statusFeedback.textContent = r && r.ok ? 'Saved to your Candidate Document Vault!' : 'Could not save right now.';
    });

    var btnPrint = el('button', 'sp-btn sp-btn-sm', '🖨 Clean A4 Print');
    btnPrint.type = 'button';
    btnPrint.addEventListener('click', function () { window.print(); });

    candGroup.append(btnDone, btnRev, btnVault, btnPrint);
    actionBar.append(langGroup, candGroup);
    shell.appendChild(actionBar);
    if (statusFeedback.textContent) shell.appendChild(statusFeedback);

    // Structured Syllabus Weightage Table
    if (Array.isArray(a.syllabus_topics) && a.syllabus_topics.length) {
      var secSyl = el('section', 'sp-section');
      secSyl.appendChild(el('h2', 'sp-section-title', '📑 Syllabus Units & Marks Weightage'));
      var tw = el('div', 'sp-table-wrap');
      var tbl = el('table', 'sp-table');
      var th = el('thead');
      var htr = el('tr');
      ['Unit', 'Topic', 'Marks / Weightage', 'Priority'].forEach(function (h) { htr.appendChild(el('th', '', h)); });
      th.appendChild(htr); tbl.appendChild(th);
      var tb = el('tbody');
      a.syllabus_topics.forEach(function (r) {
        var tr = el('tr');
        tr.appendChild(el('td', '', r.unit || '—'));
        var topicTxt = S.langMode === 'or' && r.topic_or ? r.topic_or : (S.langMode === 'dual' && r.topic_or ? (r.topic_en + ' / ' + r.topic_or) : r.topic_en);
        tr.appendChild(el('td', '', topicTxt || '—'));
        tr.appendChild(el('td', '', r.weightage || '—'));
        tr.appendChild(el('td', '', r.priority || 'High'));
        tb.appendChild(tr);
      });
      tbl.appendChild(tb); tw.appendChild(tbl); secSyl.appendChild(tw);
      shell.appendChild(secSyl);
    }

    // Key Facts / Formulas Table + Interactive Flip-Card Revision Mode
    if (Array.isArray(a.key_facts_table) && a.key_facts_table.length) {
      var secKf = el('section', 'sp-section');
      var kfHead = el('div', 'sp-section-head');
      kfHead.appendChild(el('h2', 'sp-section-title', '⚡ High-Yield Key Facts, Formulas & Flashcards (' + a.key_facts_table.length + ')'));
      var btnToggleFlip = el('button', 'sp-btn sp-btn-sm sp-btn-violet sp-no-print', S.flipMode ? '📋 Switch to Table View' : '🗂 Flip-Card Revision Mode');
      btnToggleFlip.type = 'button';
      btnToggleFlip.addEventListener('click', function () {
        S.flipMode = !S.flipMode;
        S.flipRevealed = false;
        drawReaderDom(data);
      });
      kfHead.appendChild(btnToggleFlip);
      secKf.appendChild(kfHead);

      if (S.flipMode) {
        var cardObj = a.key_facts_table[S.flipIdx] || a.key_facts_table[0];
        var stage = el('div', 'sp-flashcard-stage');
        var fc = el('button', 'sp-flashcard' + (S.flipRevealed ? ' is-flipped' : ''));
        fc.type = 'button';
        fc.appendChild(el('span', 'sp-flashcard-side', S.flipRevealed ? 'ANSWER / KEY FACT (Click to Flip Back)' : 'TERM / PROMPT (Click to Reveal Answer)'));
        var frontTxt = S.langMode === 'or' && cardObj.term_or ? cardObj.term_or : (cardObj.term_en || cardObj.term_or);
        var backTxt = S.langMode === 'or' && cardObj.fact_or ? cardObj.fact_or : (cardObj.fact_en || cardObj.fact_or);
        fc.appendChild(el('div', 'sp-flashcard-text', S.flipRevealed ? backTxt : frontTxt));
        fc.addEventListener('click', function () { S.flipRevealed = !S.flipRevealed; drawReaderDom(data); });

        var navRow = el('div', 'sp-action-group');
        var bPrev = el('button', 'sp-btn sp-btn-sm', '← Prev Card'); bPrev.type = 'button';
        bPrev.addEventListener('click', function () { S.flipIdx = (S.flipIdx - 1 + a.key_facts_table.length) % a.key_facts_table.length; S.flipRevealed = false; drawReaderDom(data); });
        var counter = el('span', 'sp-stat-chip', 'Card ' + (S.flipIdx + 1) + ' / ' + a.key_facts_table.length);
        var bNext = el('button', 'sp-btn sp-btn-sm', 'Next Card →'); bNext.type = 'button';
        bNext.addEventListener('click', function () { S.flipIdx = (S.flipIdx + 1) % a.key_facts_table.length; S.flipRevealed = false; drawReaderDom(data); });
        navRow.append(bPrev, counter, bNext);
        stage.append(fc, navRow);
        secKf.appendChild(stage);
      } else {
        var ktw = el('div', 'sp-table-wrap');
        var ktbl = el('table', 'sp-table');
        var kth = el('thead');
        var khtr = el('tr');
        ['Key Term / Concept', 'High-Yield Fact / Formula', 'Tag'].forEach(function (h) { khtr.appendChild(el('th', '', h)); });
        kth.appendChild(khtr); ktbl.appendChild(kth);
        var ktb = el('tbody');
        a.key_facts_table.forEach(function (r) {
          var tr = el('tr');
          var tTxt = S.langMode === 'or' && r.term_or ? r.term_or : (S.langMode === 'dual' && r.term_or ? (r.term_en + ' · ' + r.term_or) : r.term_en);
          var fTxt = S.langMode === 'or' && r.fact_or ? r.fact_or : (S.langMode === 'dual' && r.fact_or ? (r.fact_en + ' / ' + r.fact_or) : r.fact_en);
          tr.appendChild(el('td', '', tTxt));
          tr.appendChild(el('td', '', fTxt));
          tr.appendChild(el('td', '', r.tag || '—'));
          ktb.appendChild(tr);
        });
        ktbl.appendChild(ktb); ktw.appendChild(ktbl); secKf.appendChild(ktw);
      }
      shell.appendChild(secKf);
    }

    // Rich Bilingual Study Notes Content
    if (a.article_body_en || a.article_body_or) {
      var secNotes = el('section', 'sp-section');
      secNotes.appendChild(el('h2', 'sp-section-title', '📖 Complete Study Notes & Chapter Guide'));
      if (S.langMode === 'dual') {
        var dual = el('div', 'sp-body-dual');
        var c1 = el('div'); c1.appendChild(el('strong', '', 'English')); renderProseBlock(c1, a.article_body_en || 'Not provided yet.');
        var c2 = el('div'); c2.appendChild(el('strong', '', 'ଓଡ଼ିଆ (Odia)')); renderProseBlock(c2, a.article_body_or || a.article_body_en);
        dual.append(c1, c2);
        secNotes.appendChild(dual);
      } else if (S.langMode === 'or' && a.article_body_or) {
        renderProseBlock(secNotes, a.article_body_or);
      } else {
        renderProseBlock(secNotes, a.article_body_en || a.article_body_or);
      }
      shell.appendChild(secNotes);
    }

    // PYQ Trend Analysis Table
    if (Array.isArray(a.pyq_analysis) && a.pyq_analysis.length) {
      var secPyq = el('section', 'sp-section');
      secPyq.appendChild(el('h2', 'sp-section-title', '📊 PYQ Year-Wise Trend & Cutoff Analysis'));
      var ptw = el('div', 'sp-table-wrap');
      var ptbl = el('table', 'sp-table');
      var pth = el('thead'); var phtr = el('tr');
      ['Year', 'Exam', 'Questions Asked', 'Difficulty', 'Trend / Cutoff Note'].forEach(function (h) { phtr.appendChild(el('th', '', h)); });
      pth.appendChild(phtr); ptbl.appendChild(pth);
      var ptb = el('tbody');
      a.pyq_analysis.forEach(function (r) {
        var tr = el('tr');
        tr.append(el('td', '', r.year || '—'), el('td', '', r.exam || '—'), el('td', '', r.questions_asked || '—'), el('td', '', r.difficulty || '—'), el('td', '', r.cutoff_or_trend || '—'));
        ptb.appendChild(tr);
      });
      ptbl.appendChild(ptb); ptw.appendChild(ptbl); secPyq.appendChild(ptw);
      shell.appendChild(secPyq);
    }

    // Interactive Self-Check Quiz (Instant Tutor Mode vs. Timed Exam Simulation Mode)
    if (Array.isArray(a.practice_mcqs) && a.practice_mcqs.length) {
      shell.appendChild(renderQuizSection(a, data));
    }

    // Inline PDF Viewer with Quick-Jump Bookmarks + Download Cards
    if (a.notes_pdf_url || a.pyq_pdf_url || a.answer_key_pdf_url) {
      shell.appendChild(renderPdfSection(a, data));
    }

    // Linked Active Jobs ("Apply for Related Recruitment")
    if (Array.isArray(data.linked_jobs) && data.linked_jobs.length) {
      var secJobs = el('section', 'sp-section sp-no-print');
      secJobs.appendChild(el('h2', 'sp-section-title', '💼 Apply for Related Active Recruitments'));
      var jg = el('div', 'sp-pdf-cards');
      data.linked_jobs.forEach(function (j) {
        var jc = el('div', 'sp-pdf-card');
        jc.appendChild(el('strong', '', j.title_en));
        jc.appendChild(el('span', 'sp-card-or', (j.organisation_en || '') + (j.total_vacancies ? ' · ' + j.total_vacancies + ' Posts' : '') + (j.last_date ? ' · Last Date: ' + j.last_date : '')));
        var ja = el('a', 'sp-btn sp-btn-sm sp-btn-primary', 'View Job Notification →');
        ja.href = j.url;
        jc.appendChild(ja);
        jg.appendChild(jc);
      });
      secJobs.appendChild(jg);
      shell.appendChild(secJobs);
    }

    // Sequential Prev / Next Chapter Navigation
    if (data.prev_chapter || data.next_chapter) {
      var seq = el('nav', 'sp-seq-nav sp-no-print');
      seq.setAttribute('aria-label', 'Sequential Chapter Navigation');
      if (data.prev_chapter) {
        var pa = el('a', 'sp-seq-link');
        pa.href = data.prev_chapter.url;
        pa.appendChild(el('span', 'sp-tile-label', '← Previous Chapter'));
        pa.appendChild(el('strong', '', data.prev_chapter.title_en));
        seq.appendChild(pa);
      }
      if (data.next_chapter) {
        var na = el('a', 'sp-seq-link');
        na.href = data.next_chapter.url;
        na.appendChild(el('span', 'sp-tile-label', 'Next Chapter →'));
        na.appendChild(el('strong', '', data.next_chapter.title_en));
        seq.appendChild(na);
      }
      shell.appendChild(seq);
    }

    // Related Chapters (3)
    if (Array.isArray(data.related_chapters) && data.related_chapters.length) {
      var secRel = el('section', 'sp-section sp-no-print');
      secRel.appendChild(el('h2', 'sp-section-title', '📚 Related Study Chapters'));
      var rg = el('div', 'sp-pdf-cards');
      data.related_chapters.forEach(function (rc) {
        var card = el('div', 'sp-pdf-card');
        card.appendChild(el('span', 'sp-badge', rc.resource_type_badge || 'Study Notes'));
        card.appendChild(el('strong', '', rc.title_en));
        var ra = el('a', 'sp-btn sp-btn-sm', 'Open Chapter →');
        ra.href = '/study-library/?slug=' + encodeURIComponent(rc.slug);
        card.appendChild(ra);
        rg.appendChild(card);
      });
      secRel.appendChild(rg);
      shell.appendChild(secRel);
    }

    // Flag Typo / Ask Chapter Doubt Inline Drawer
    shell.appendChild(renderDoubtDrawer(a));

    S.root.appendChild(shell);
  }

  function renderQuizSection(a, data) {
    var sec = el('section', 'sp-section sp-no-print');
    var head = el('div', 'sp-section-head');
    head.appendChild(el('h2', 'sp-section-title', '✅ Practice Self-Check Quiz (' + a.practice_mcqs.length + ' MCQs · Negative Marking: ' + (a.negative_marking_rule || 'None') + ')'));

    var modeBar = el('div', 'sp-action-group');
    var btnTutor = el('button', 'sp-btn sp-btn-sm' + (S.quizMode === 'tutor' ? ' sp-btn-primary' : ''), '💡 Instant Tutor Mode');
    btnTutor.type = 'button';
    btnTutor.addEventListener('click', function () {
      if (S.quizTimerId) { clearInterval(S.quizTimerId); S.quizTimerId = null; }
      S.quizMode = 'tutor';
      S.quizAnswers = {};
      S.quizSubmitted = false;
      drawReaderDom(data);
    });

    var btnTimed = el('button', 'sp-btn sp-btn-sm' + (S.quizMode === 'timed' ? ' sp-btn-primary' : ''), '⏱ Timed Exam Simulation');
    btnTimed.type = 'button';
    btnTimed.addEventListener('click', function () {
      if (S.quizTimerId) clearInterval(S.quizTimerId);
      S.quizMode = 'timed';
      S.quizAnswers = {};
      S.quizSubmitted = false;
      S.quizSecondsLeft = Math.max(60, a.practice_mcqs.length * 45);
      S.quizTimerId = setInterval(function () {
        S.quizSecondsLeft = Math.max(0, S.quizSecondsLeft - 1);
        var tEl = document.getElementById('sp-quiz-countdown');
        if (tEl) tEl.textContent = '⏱ ' + formatCountdown(S.quizSecondsLeft);
        if (S.quizSecondsLeft <= 0) {
          clearInterval(S.quizTimerId);
          S.quizTimerId = null;
          S.quizSubmitted = true;
          drawReaderDom(data);
        }
      }, 1000);
      drawReaderDom(data);
    });

    modeBar.append(btnTutor, btnTimed);
    if (S.quizMode === 'timed' && !S.quizSubmitted) {
      var timerChip = el('span', 'sp-quiz-timer', '⏱ ' + formatCountdown(S.quizSecondsLeft));
      timerChip.id = 'sp-quiz-countdown';
      modeBar.appendChild(timerChip);
    }
    head.appendChild(modeBar);
    sec.appendChild(head);

    a.practice_mcqs.forEach(function (q, qIdx) {
      var qBox = el('div', 'sp-quiz-q');
      var qTxt = S.langMode === 'or' && q.question_or ? q.question_or : q.question_en;
      qBox.appendChild(el('strong', '', 'Q' + (qIdx + 1) + '. ' + qTxt));
      if (S.langMode === 'dual' && q.question_or) qBox.appendChild(el('div', 'sp-card-or', q.question_or));

      var optsWrap = el('div', 'sp-quiz-opts');
      var chosen = S.quizAnswers[qIdx];
      var reveal = (S.quizMode === 'tutor' && chosen !== undefined) || S.quizSubmitted;

      (q.options || []).forEach(function (optText, oi) {
        if (!optText) return;
        var cls = 'sp-quiz-opt';
        if (reveal) {
          if (oi === q.correct_index) cls += ' is-correct';
          else if (chosen === oi) cls += ' is-wrong';
        } else if (chosen === oi) {
          cls += ' is-selected';
        }
        var ob = el('button', cls, String.fromCharCode(65 + oi) + '. ' + optText);
        ob.type = 'button';
        ob.addEventListener('click', function () {
          if (S.quizSubmitted) return;
          S.quizAnswers[qIdx] = oi;
          drawReaderDom(data);
        });
        optsWrap.appendChild(ob);
      });
      qBox.appendChild(optsWrap);

      if (reveal && (q.explanation_en || q.explanation_or)) {
        var expTxt = S.langMode === 'or' && q.explanation_or ? q.explanation_or : (q.explanation_en || q.explanation_or);
        qBox.appendChild(el('div', 'sp-quiz-exp', '💡 Explanation: ' + expTxt));
      }
      sec.appendChild(qBox);
    });

    if (S.quizMode === 'timed' && !S.quizSubmitted) {
      var btnSubmit = el('button', 'sp-btn sp-btn-emerald', 'Submit Exam Simulation & Compute Score');
      btnSubmit.type = 'button';
      btnSubmit.addEventListener('click', async function () {
        if (S.quizTimerId) { clearInterval(S.quizTimerId); S.quizTimerId = null; }
        S.quizSubmitted = true;
        var summary = computeScore(a);
        await saveCandidateProgress({ article_id: a.id, mcq_score: summary.netScore, mcq_total: a.practice_mcqs.length });
        drawReaderDom(data);
      });
      sec.appendChild(btnSubmit);
    }

    if (S.quizSubmitted || (S.quizMode === 'tutor' && Object.keys(S.quizAnswers).length === a.practice_mcqs.length)) {
      var sc = computeScore(a);
      var card = el('div', 'sp-scorecard');
      card.appendChild(el('span', '', '🏆 Score: ' + sc.netScore + ' / ' + a.practice_mcqs.length + ' (✅ ' + sc.correct + ' Correct · ❌ ' + sc.wrong + ' Wrong · Penalty: -' + sc.penaltyTotal + ')'));
      var btnRetry = el('button', 'sp-btn sp-btn-sm', '↻ Retake Quiz');
      btnRetry.type = 'button';
      btnRetry.addEventListener('click', function () {
        S.quizAnswers = {};
        S.quizSubmitted = false;
        drawReaderDom(data);
      });
      card.appendChild(btnRetry);
      sec.appendChild(card);
    }

    return sec;
  }

  function computeScore(a) {
    var penalty = parsePenalty(a.negative_marking_rule);
    var correct = 0;
    var wrong = 0;
    a.practice_mcqs.forEach(function (q, i) {
      if (S.quizAnswers[i] === undefined) return;
      if (S.quizAnswers[i] === q.correct_index) correct++;
      else wrong++;
    });
    var penaltyTotal = Math.round(wrong * penalty * 100) / 100;
    var netScore = Math.round((correct - penaltyTotal) * 100) / 100;
    return { correct: correct, wrong: wrong, penaltyTotal: penaltyTotal, netScore: netScore };
  }

  function renderPdfSection(a, data) {
    var sec = el('section', 'sp-section sp-no-print');
    sec.appendChild(el('h2', 'sp-section-title', '📄 Study PDFs, PYQ Papers & Inline Viewer'));

    var cards = el('div', 'sp-pdf-cards');
    [
      ['Study Notes / E-Book PDF', a.notes_pdf_url],
      ['Previous Year Paper (PYQ) PDF', a.pyq_pdf_url],
      ['Official Answer Key / Solution PDF', a.answer_key_pdf_url]
    ].forEach(function (p) {
      if (!p[1] || !safeUrl(p[1])) return;
      var c = el('div', 'sp-pdf-card');
      c.appendChild(el('strong', '', p[0]));
      var acts = el('div', 'sp-action-group');
      var bView = el('button', 'sp-btn sp-btn-sm sp-btn-primary', 'View Inline');
      bView.type = 'button';
      bView.addEventListener('click', function () { S.activePdfUrl = p[1]; drawReaderDom(data); });
      var aDl = el('a', 'sp-btn sp-btn-sm', '⬇ Download PDF');
      aDl.href = safeUrl(p[1]);
      aDl.target = '_blank';
      aDl.rel = 'noopener noreferrer';
      aDl.addEventListener('click', function () { fireTelemetry('pdf_download', a); });
      acts.append(bView, aDl);
      c.appendChild(acts);
      cards.appendChild(c);
    });
    sec.appendChild(cards);

    if (S.activePdfUrl && safeUrl(S.activePdfUrl)) {
      if (Array.isArray(a.pdf_index_bookmarks) && a.pdf_index_bookmarks.length) {
        var bmRow = el('div', 'sp-pill-strip');
        bmRow.appendChild(el('span', 'sp-tile-label', 'Quick-Jump Pages:'));
        a.pdf_index_bookmarks.forEach(function (bm) {
          var b = el('button', 'sp-pill-btn', 'Page ' + bm.page + ': ' + bm.label);
          b.type = 'button';
          b.addEventListener('click', function () {
            var base = safeUrl(S.activePdfUrl).split('#')[0];
            var frame = document.getElementById('sp-inline-pdf-frame');
            if (frame) frame.src = base + '#page=' + bm.page;
          });
          bmRow.appendChild(b);
        });
        sec.appendChild(bmRow);
      }
      var frame = el('iframe', 'sp-pdf-frame');
      frame.id = 'sp-inline-pdf-frame';
      frame.title = a.title_en + ' PDF Viewer';
      frame.src = safeUrl(S.activePdfUrl);
      sec.appendChild(frame);
    }

    return sec;
  }

  function renderDoubtDrawer(a) {
    var sec = el('section', 'sp-section sp-no-print');
    var det = el('details');
    var sum = el('summary', 'sp-section-title', '💬 Flag PYQ Typo or Ask a Chapter Doubt');
    det.appendChild(sum);

    var form = el('div', 'sp-root');
    var typeSel = el('select', 'sp-select');
    [['chapter_doubt', 'Chapter Concept Doubt'], ['pyq_typo', 'Report PYQ / Answer Key Typo'], ['syllabus_update', 'Request Syllabus Update'], ['other', 'Other Suggestion']].forEach(function (p) {
      typeSel.appendChild(new Option(p[1], p[0]));
    });
    var nameInp = el('input', 'sp-input'); nameInp.placeholder = 'Your name (Optional)';
    var msgTa = el('textarea', 'sp-textarea'); msgTa.placeholder = 'Describe your question, page number, or correction clearly...';
    var statusP = el('p', 'sp-card-or', '');
    var btnSend = el('button', 'sp-btn sp-btn-primary', 'Submit to Study Editors');
    btnSend.type = 'button';
    btnSend.addEventListener('click', async function () {
      if (!msgTa.value.trim() || msgTa.value.trim().length < 5) {
        statusP.textContent = 'Please enter at least 5 characters.';
        return;
      }
      try {
        var r = await fetch('/api/public/study/doubts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            article_id: a.id,
            doubt_type: typeSel.value,
            reader_name: nameInp.value.trim() || 'Reader',
            message_text: msgTa.value.trim()
          })
        });
        var d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Submission failed');
        msgTa.value = '';
        statusP.textContent = '✅ Thank you! Your doubt/report has been queued for our Odisha Study Editors.';
      } catch (e) {
        statusP.textContent = e.message;
      }
    });
    form.append(typeSel, nameInp, msgTa, btnSend, statusP);
    det.appendChild(form);
    sec.appendChild(det);
    return sec;
  }

  // ============================================================================
  // BOOT
  // ============================================================================
  function mountOptimisticSkeleton() {
    if (S.root && S.root.querySelector('.cso-portal-skeleton')) return;
    clear(S.root);
    var skel = el('div', 'cso-portal-skeleton');
    skel.setAttribute('aria-busy', 'true');
    skel.appendChild(el('div', 'cso-skel-hero'));
    skel.appendChild(el('div', 'cso-skel-bar'));
    var g = el('div', 'cso-skel-grid');
    g.append(el('div', 'cso-skel-card'), el('div', 'cso-skel-card'));
    skel.appendChild(g);
    S.root.appendChild(skel);
  }

  async function boot() {
    S.root = document.getElementById('cso-study-portal-root');
    if (!S.root) return;
    document.body.classList.add('cso-portal-active', 'cso-portal-study-active');
    S.langMode = getLangPref();

    var slug = qsParam('slug');
    var previewToken = qsParam('preview_token');

    if (slug) {
      await Promise.all([loadCandidateProgress(), detectAdminSession()]);
      await renderReaderView(slug, previewToken);
      return;
    }

    S.filters.l1 = qsParam('l1');
    S.filters.l2 = qsParam('l2');
    S.filters.l3 = qsParam('l3');
    S.filters.type = qsParam('type');
    S.filters.search = qsParam('q') || qsParam('search');

    mountOptimisticSkeleton();
    var hasInitialFilter = Boolean(S.filters.l1 || S.filters.l2 || S.filters.l3 || S.filters.type || S.filters.search);
    if (!hasInitialFilter) {
      var bootUrl = '/api/public/study/bootstrap' + (qsParam('refresh') ? '?refresh=1' : '');
      var triple = await Promise.all([
        fetch(bootUrl, { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
        loadCandidateProgress(),
        detectAdminSession()
      ]);
      var bd = triple[0];
      if (bd && bd.ok) {
        S.tree = bd.tree || [];
        S.nodes = bd.nodes || [];
        S.items = bd.items || bd.articles || [];
        S.allItems = S.items.slice();
        S.facets = bd.facets || S.facets;
      }
      renderBrowserView();
      return;
    }

    await Promise.all([loadCandidateProgress(), detectAdminSession(), fetchPortalData()]);
    renderBrowserView();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window, document);
