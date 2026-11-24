/**
 * CS Odisha Admin Studio — Executive Command Suite (v243).
 * Command Overview (live D1/R2 telemetry, launchpad, audit feed, diagnostics, bulk content),
 * Ctrl/Cmd+K Command Palette, keyboard shortcuts, authoring safety (autosave + pre-flight)
 * and the R2 media drawer. Strict CSP: DOM APIs only; no innerHTML, inline styles or handlers.
 */
(function (window, document) {
  'use strict';

  var API = '/api/admin/';
  var OV_FOLDER = 'folder-command-overview';
  var OV_MODULE = 'module-command-overview';
  var HS_FOLDER = 'folder-homepage-studio';
  var HS_MODULE = 'module-homepage-studio';
  var PILLAR_LABELS = { jobs: 'Jobs & Careers', schemes: 'Schemes & Benefits', study: 'Study Library', community: 'Community', about: 'About', current_affairs: 'Current Affairs' };
  var FOLDER_PILLAR = { 'folder-jobs-careers': 'jobs', 'folder-schemes-benefits': 'schemes', 'folder-study-library': 'study', 'folder-community': 'community', 'folder-about': 'about' };

  // ---------- helpers ----------
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); return n; }
  function toast(msg, kind) { if (typeof window.showToast === 'function') window.showToast(msg, kind || 'info'); }
  function num(n) { try { return Number(n || 0).toLocaleString('en-IN'); } catch (_) { return String(n || 0); } }
  function bytes(n) {
    n = Number(n || 0);
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
    return (n / 1073741824).toFixed(2) + ' GB';
  }
  function parseTs(s) {
    var v = String(s || '');
    if (!v) return null;
    var d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : v.replace(' ', 'T') + 'Z');
    return isNaN(d.getTime()) ? null : d;
  }
  function when(s) {
    var d = parseTs(s);
    if (!d) return String(s || '');
    var diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + ' h ago';
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }
  function api(path, method, body, isForm) {
    var opts = { method: method || 'GET', credentials: 'same-origin', headers: { 'X-CSO-CSRF': '1' } };
    if (body !== undefined) {
      if (isForm) opts.body = body;
      else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    }
    return fetch(API + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error((d && d.error) || ('HTTP ' + r.status));
        return d;
      });
    });
  }
  function btn(label, cls, handler) {
    var b = el('button', cls || 'cs-btn', label);
    b.type = 'button';
    if (handler) b.addEventListener('click', handler);
    return b;
  }
  function studio() { return window.CSOStudio || {}; }

  // ======================================================================
  // 1. COMMAND OVERVIEW
  // ======================================================================
  var ov = { tab: 'overview', feed: { pillar: '', type: '', items: [], before: null, more: false }, timer: null, refs: {}, bulk: { pillar: 'jobs', status: '', q: '', items: [], selected: new Set() } };

  function kpiCard(label, value, sub, tone) {
    var c = el('div', 'cs-kpi' + (tone ? ' is-' + tone : ''));
    c.appendChild(el('span', 'cs-kpi__label', label));
    c.appendChild(el('strong', 'cs-kpi__value', value));
    if (sub) c.appendChild(el('span', 'cs-kpi__sub', sub));
    return c;
  }

  function renderKpis(d, va) {
    var box = clear(ov.refs.kpis);
    var posture = d.health && d.health.posture ? d.health.posture : 'UNKNOWN';
    var postureTone = posture === 'HEALTHY' ? 'emerald' : (posture === 'UNKNOWN' ? 'amber' : 'rose');
    var trend = (va && va.trend_14d) || [];
    var regSeries = trend.map(function (x) { return x.registrations; });
    var actSeries = trend.map(function (x) { return x.admin_actions; });
    var pushSeries = trend.map(function (x) { return x.content_pushes; });
    var ackSeries = trend.map(function (x) { return x.candidate_acks; });
    var sum = function (arr) { return arr.reduce(function (a, b) { return a + Number(b || 0); }, 0); };

    if (window.CSOVisualAnalytics) {
      var VA = window.CSOVisualAnalytics;
      box.appendChild(VA.kpiSparklineTile({ label: 'Published Content', value: num(d.totals.published), sub: '5 pillars + Homepage Studio', tone: 'emerald', series: actSeries, deltaText: '14d: ' + num(sum(actSeries)) + ' actions' }));
      box.appendChild(VA.kpiSparklineTile({ label: 'Pending Drafts', value: num(d.totals.draft), sub: 'Awaiting review or publish', tone: 'amber', deltaText: d.totals.draft ? 'Review queue' : 'All clear' }));
      box.appendChild(VA.kpiSparklineTile({ label: 'Registered Candidates', value: num(d.candidates), sub: num(d.staff) + ' staff accounts', tone: 'cobalt', series: regSeries, deltaText: '+14d: ' + num(sum(regSeries)) }));
      box.appendChild(VA.kpiSparklineTile({ label: 'Categories & Menus', value: num(d.categories.published) + ' / ' + num(d.menus.published), sub: num(d.categories.total) + ' cats · ' + num(d.menus.total) + ' menus', tone: 'violet', series: pushSeries, deltaText: '14d pushes: ' + num(sum(pushSeries)) }));
      box.appendChild(VA.kpiSparklineTile({ label: 'Homepage Feature Clicks', value: num(d.homepage.clicks), sub: num(d.homepage.published) + ' of ' + num(d.homepage.total) + ' blocks live', tone: 'violet', series: ackSeries, deltaText: '14d acks: ' + num(sum(ackSeries)) }));
      box.appendChild(VA.kpiSparklineTile({ label: 'Ops Sentinel & Edge', value: posture, sub: d.sw_cache_version + (d.health && d.health.freeze_enabled ? ' · FREEZE' : ''), tone: postureTone, deltaText: d.health && d.health.total_latency_ms ? d.health.total_latency_ms + ' ms' : 'Live' }));
      return;
    }

    var tone = posture === 'HEALTHY' ? 'ok' : (posture === 'UNKNOWN' ? '' : 'warn');
    box.appendChild(kpiCard('Published (5 pillars + Homepage)', num(d.totals.published), 'Live on the public site', 'ok'));
    box.appendChild(kpiCard('Draft / unpublished', num(d.totals.draft), 'Awaiting review or publish', d.totals.draft ? 'warn' : ''));
    box.appendChild(kpiCard('Registered candidates', num(d.candidates), num(d.staff) + ' staff accounts'));
    box.appendChild(kpiCard('Active categories / menus', num(d.categories.published) + ' / ' + num(d.menus.published), num(d.categories.total) + ' categories · ' + num(d.menus.total) + ' menu items'));
    box.appendChild(kpiCard('Homepage feature clicks', num(d.homepage.clicks), num(d.homepage.published) + ' of ' + num(d.homepage.total) + ' blocks live'));
    box.appendChild(kpiCard('Edge cache · Ops Sentinel', posture, d.sw_cache_version + (d.health && d.health.freeze_enabled ? ' · READ-ONLY FREEZE' : ''), tone));
  }

  function renderPipeline(d) {
    var box = clear(ov.refs.pipeline);
    var rows = d.pillars.concat([{ key: 'homepage', label: 'Homepage Studio', available: d.homepage.available, total: d.homepage.total, published: d.homepage.published, draft: d.homepage.draft }]);
    rows.forEach(function (p) {
      var row = el('div', 'cs-pipe-row');
      row.appendChild(el('span', 'cs-pipe-label', p.label));
      var prog = el('progress', 'cs-progress');
      prog.max = Math.max(p.total, 1);
      prog.value = p.published;
      prog.setAttribute('aria-label', p.label + ' published share');
      row.appendChild(prog);
      row.appendChild(el('span', 'cs-pipe-nums', p.available === false ? 'no table yet' : num(p.published) + ' live · ' + num(p.draft) + ' draft'));
      box.appendChild(row);
    });
  }

  function renderHealth(d) {
    var box = clear(ov.refs.health);
    var subs = (d.health && d.health.subsystems) || [];
    if (!subs.length) box.appendChild(el('p', 'cs-muted', d.health && d.health.error ? 'Sentinel unavailable: ' + d.health.error : 'No sentinel data.'));
    subs.forEach(function (s) {
      var row = el('div', 'cs-health-row');
      row.appendChild(el('span', 'cs-dot cs-dot--' + (s.status === 'UP' ? 'ok' : s.status === 'DEGRADED' ? 'warn' : 'bad')));
      row.appendChild(el('strong', '', s.label || s.id));
      row.appendChild(el('span', 'cs-muted', s.status + (s.latency_ms !== null && s.latency_ms !== undefined ? ' · ' + s.latency_ms + ' ms' : '') + ' — ' + (s.detail || '')));
      box.appendChild(row);
    });
  }

  function renderVisualCharts(ovData, va) {
    if (!window.CSOVisualAnalytics || !va) return;
    var VA = window.CSOVisualAnalytics;
    if (ov.refs.trend) {
      clear(ov.refs.trend).appendChild(VA.trendAreaChart({
        series: va.trend_14d || [],
        metrics: [
          { key: 'registrations', label: 'Candidate Registrations', tone: 'cobalt' },
          { key: 'admin_actions', label: 'Admin Publishing Actions', tone: 'emerald' },
          { key: 'content_pushes', label: 'Targeted Pushes', tone: 'violet' },
          { key: 'candidate_acks', label: 'Candidate Views / Downloads', tone: 'amber' }
        ]
      }));
    }
    if (ov.refs.contentDonut) {
      var pub = ovData && ovData.totals ? ovData.totals.published : 0;
      var dr = ovData && ovData.totals ? ovData.totals.draft : 0;
      clear(ov.refs.contentDonut).appendChild(VA.donutChart({
        centerValue: num(pub + dr),
        centerLabel: 'Total Items',
        segments: [
          { label: 'Published Live', value: pub, tone: 'emerald' },
          { label: 'Draft / Review', value: dr, tone: 'amber' }
        ]
      }));
    }
    if (ov.refs.r2Donut) {
      var r2 = va.r2_storage || { total_mb: 0, breakdown: [] };
      var tones = { pdf: 'rose', image: 'cobalt', other: 'violet' };
      clear(ov.refs.r2Donut).appendChild(VA.donutChart({
        centerValue: r2.total_mb + ' MB',
        centerLabel: num(r2.total_files) + ' R2 files',
        segments: (r2.breakdown || []).map(function (b) {
          return { label: b.label, value: b.count, displayValue: num(b.count) + ' · ' + bytes(b.bytes), tone: tones[b.key] || 'cobalt' };
        })
      }));
    }
    if (ov.refs.distBars) {
      clear(ov.refs.distBars).appendChild(VA.horizontalBarChart({
        rows: (va.demographics && va.demographics.districts) || [],
        tone: 'cobalt',
        emptyText: 'No candidate district data recorded yet.'
      }));
    }
    if (ov.refs.examBars) {
      clear(ov.refs.examBars).appendChild(VA.horizontalBarChart({
        rows: (va.demographics && va.demographics.exam_boards) || [],
        tone: 'violet',
        emptyText: 'No target exam preferences set yet.'
      }));
    }
    if (ov.refs.topHpTable) {
      clear(ov.refs.topHpTable).appendChild(VA.dataTable({
        defaultSort: 'clicks_count',
        emptyText: 'No Homepage Studio blocks found.',
        columns: [
          { key: 'title_en', label: 'Block Title' },
          { key: 'section_key', label: 'Section', render: function (r) { return el('span', 'cs-muted', String(r.section_key || '').replace(/_/g, ' ')); } },
          { key: 'is_published', label: 'Status', render: function (r) { return el('span', 'cs-tag cs-tag--' + (r.is_published ? 'publish' : 'update'), r.is_published ? 'Live' : 'Draft'); } },
          { key: 'clicks_count', label: 'Clicks', numeric: true }
        ],
        rows: va.top_homepage_blocks || []
      }));
    }
    if (ov.refs.mutTable) {
      clear(ov.refs.mutTable).appendChild(VA.dataTable({
        defaultSort: 'id',
        emptyText: 'No recent mutations in audit_log.',
        columns: [
          { key: 'actor', label: 'Staff' },
          { key: 'action', label: 'Action', render: function (r) { return el('span', '', String(r.action || '').replace(/[._]/g, ' ')); } },
          { key: 'type', label: 'Type', render: function (r) { return el('span', 'cs-tag cs-tag--' + r.type, r.type); } },
          { key: 'created_at', label: 'When', numeric: true, render: function (r) { return el('span', 'cs-muted cs-num', when(r.created_at)); } }
        ],
        rows: va.recent_mutations || []
      }));
    }
  }

  function loadOverview() {
    return Promise.all([api('overview-stats'), api('visual-analytics').catch(function () { return null; })]).then(function (pair) {
      var d = pair[0]; var va = pair[1];
      renderKpis(d, va); renderPipeline(d); renderHealth(d); renderVisualCharts(d, va);
      if (ov.refs.stamp) ov.refs.stamp.textContent = 'Updated ' + when(d.generated_at);
    }).catch(function (e) { toast('Overview failed: ' + e.message, 'crimson'); });
  }

  function loadDiagnostics() {
    var box = clear(ov.refs.diag);
    box.appendChild(el('p', 'cs-muted', 'Loading diagnostics…'));
    return api('system-diagnostics').then(function (d) {
      clear(box);
      var r2 = el('div', 'cs-health-row');
      r2.appendChild(el('span', 'cs-dot cs-dot--' + (d.r2.reachable ? 'ok' : 'bad')));
      r2.appendChild(el('strong', '', 'R2 bucket ' + d.r2.bucket));
      r2.appendChild(el('span', 'cs-muted', (d.r2.bound ? (d.r2.reachable ? 'reachable' : 'unreachable ' + (d.r2.error || '')) : 'binding missing') + ' · ' + num(d.r2.files) + ' files · ' + bytes(d.r2.bytes)));
      box.appendChild(r2);
      var sw = el('div', 'cs-health-row');
      var swDot = el('span', 'cs-dot cs-dot--warn');
      sw.appendChild(swDot);
      sw.appendChild(el('strong', '', 'Service Worker cache'));
      var swText = el('span', 'cs-muted', 'expected ' + d.service_worker.expected_cache_version + ' · checking…');
      sw.appendChild(swText);
      box.appendChild(sw);
      if (window.caches && window.caches.keys) {
        window.caches.keys().then(function (keys) {
          var ok = keys.indexOf(d.service_worker.expected_cache_version) !== -1;
          swDot.className = 'cs-dot cs-dot--' + (ok ? 'ok' : 'warn');
          swText.textContent = 'expected ' + d.service_worker.expected_cache_version + ' · ' + (ok ? 'active in this browser' : 'this browser has: ' + (keys.join(', ') || 'none (reload the public site to refresh)'));
        }).catch(function () { swText.textContent = 'expected ' + d.service_worker.expected_cache_version + ' · cache API unavailable'; });
      } else swText.textContent = 'expected ' + d.service_worker.expected_cache_version + ' · cache API unavailable';
      box.appendChild(el('h4', 'cs-subhead', 'D1 row counts (' + num(d.d1.table_count) + ' tables total)'));
      var grid = el('div', 'cs-table-grid');
      d.d1.tables.forEach(function (t) {
        var cell = el('div', 'cs-table-cell');
        cell.appendChild(el('span', 'cs-muted', t.table));
        cell.appendChild(el('strong', 'cs-num', t.rows === null ? '—' : num(t.rows)));
        grid.appendChild(cell);
      });
      box.appendChild(grid);
    }).catch(function (e) { clear(box); box.appendChild(el('p', 'cs-error', 'Diagnostics failed: ' + e.message)); });
  }

  function purgeAll() {
    if (!window.confirm('Purge ALL public edge caches now? Pages will rebuild on next request.')) return;
    api('purge-caches', 'POST', {}).then(function () { toast('All edge caches purged', 'ok'); loadOverview(); })
      .catch(function (e) { toast('Purge failed: ' + e.message, 'crimson'); });
  }

  function renderFeed() {
    var box = clear(ov.refs.feed);
    if (!ov.feed.items.length) { box.appendChild(el('p', 'cs-muted', 'No audit events match these filters.')); return; }
    ov.feed.items.forEach(function (it) {
      var row = el('div', 'cs-feed-row');
      row.appendChild(el('span', 'cs-tag cs-tag--' + it.type, it.type));
      var main = el('div', 'cs-feed-main');
      main.appendChild(el('strong', '', it.actor));
      main.appendChild(el('span', '', ' ' + it.action.replace(/[._]/g, ' ') + (it.target_id ? ' · ' + it.target_id : '')));
      var sub = el('div', 'cs-muted', (PILLAR_LABELS[it.pillar] || it.pillar) + (it.meta && it.meta.count ? ' · ' + it.meta.count + ' items' : ''));
      main.appendChild(sub);
      row.appendChild(main);
      var t = el('time', 'cs-num cs-muted', when(it.created_at));
      var d = parseTs(it.created_at);
      if (d) t.setAttribute('datetime', d.toISOString());
      row.appendChild(t);
      box.appendChild(row);
    });
    if (ov.feed.more) box.appendChild(btn('Load more', 'cs-btn', function () { loadFeed(true); }));
  }

  function loadFeed(append) {
    var q = 'audit-feed?limit=25' + (ov.feed.pillar ? '&pillar=' + encodeURIComponent(ov.feed.pillar) : '') + (ov.feed.type ? '&type=' + encodeURIComponent(ov.feed.type) : '') + (append && ov.feed.before ? '&before=' + ov.feed.before : '');
    return api(q).then(function (d) {
      ov.feed.items = append ? ov.feed.items.concat(d.items) : d.items;
      ov.feed.before = d.next_before; ov.feed.more = d.has_more;
      renderFeed();
    }).catch(function (e) { clear(ov.refs.feed).appendChild(el('p', 'cs-error', 'Audit feed failed: ' + e.message)); });
  }

  function launchCard(title, desc, handler) {
    var b = el('button', 'cs-launch');
    b.type = 'button';
    b.appendChild(el('strong', '', title));
    b.appendChild(el('span', 'cs-muted', desc));
    b.addEventListener('click', handler);
    return b;
  }
  function goFolder(id) { if (studio().selectModule) studio().selectModule(id, id); }
  function newHomepageBlock() {
    goFolder(HS_FOLDER);
    if (window.CSOHomepageStudio && window.CSOHomepageStudio.startNew) window.CSOHomepageStudio.startNew();
  }

  function filterSelect(label, options, value, onChange) {
    var wrap = el('label', 'cs-filter');
    wrap.appendChild(el('span', 'cs-muted', label));
    var s = el('select', 'cso-form-select');
    options.forEach(function (o) { var op = el('option', '', o[1]); op.value = o[0]; if (o[0] === value) op.selected = true; s.appendChild(op); });
    s.addEventListener('change', function () { onChange(s.value); });
    wrap.appendChild(s);
    return wrap;
  }

  function section(title, hint) {
    var s = el('section', 'cso-card studio-card cs-card');
    var h = el('div', 'cs-card__head');
    h.appendChild(el('h2', 'cs-card__title', title));
    if (hint) h.appendChild(el('span', 'cs-muted', hint));
    s.appendChild(h);
    return s;
  }

  function renderOverviewTab(wrap) {
    ov.refs.kpis = el('div', 'cs-kpis');
    wrap.appendChild(ov.refs.kpis);

    var launch = section('Quick-Action Launchpad', 'Create content in one click');
    var lg = el('div', 'cs-launch-grid');
    if (window.CSOVisualAnalytics) {
      var VA = window.CSOVisualAnalytics;
      lg.appendChild(VA.quickActionTile({ title: 'Job Notice', desc: 'Recruitment, vacancies & deadlines', icon: '💼', tone: 'emerald', onClick: function () { studio().openRoute('jobs/new'); } }));
      lg.appendChild(VA.quickActionTile({ title: 'Government Scheme', desc: 'Welfare & scholarship schemes', icon: '🏛', tone: 'cobalt', onClick: function () { goFolder('folder-schemes-benefits'); } }));
      lg.appendChild(VA.quickActionTile({ title: 'Study Material / PYQ', desc: 'Notes, syllabus & previous papers', icon: '📚', tone: 'violet', onClick: function () { goFolder('folder-study-library'); } }));
      lg.appendChild(VA.quickActionTile({ title: 'Current Affairs Capsule', desc: 'Daily brief + 5 MCQs', icon: '📰', tone: 'amber', onClick: function () { studio().openRoute('current-affairs/new'); } }));
      lg.appendChild(VA.quickActionTile({ title: 'Homepage Block', desc: 'Chip, card, tool or hub item', icon: '🏠', tone: 'rose', onClick: newHomepageBlock }));
      lg.appendChild(VA.quickActionTile({ title: 'Candidate Push / Hub', desc: 'Roster, UI & direct R2 file push', icon: '🎓', tone: 'cobalt', onClick: function () { goFolder('folder-candidate-hub'); } }));
    } else {
      lg.appendChild(launchCard('Job Notice', 'Recruitment, vacancies & deadlines', function () { studio().openRoute('jobs/new'); }));
      lg.appendChild(launchCard('Government Scheme', 'Welfare & scholarship schemes', function () { goFolder('folder-schemes-benefits'); }));
      lg.appendChild(launchCard('Study Material / PYQ', 'Notes, syllabus & previous papers', function () { goFolder('folder-study-library'); }));
      lg.appendChild(launchCard('Current Affairs Capsule', 'Daily brief + 5 MCQs', function () { studio().openRoute('current-affairs/new'); }));
      lg.appendChild(launchCard('Homepage Block', 'Chip, card, tool or hub item', newHomepageBlock));
      lg.appendChild(launchCard('Navigation Category', 'Header menu & categories', function () { studio().openRoute('nav-manager'); }));
    }
    launch.appendChild(lg);
    wrap.appendChild(launch);

    var trendSec = section('14-Day Activity & Publishing Trend', 'Live D1 time-series (click legend items to toggle)');
    ov.refs.trend = el('div', '');
    trendSec.appendChild(ov.refs.trend);
    wrap.appendChild(trendSec);

    var donutCols = el('div', 'cs-cols');
    var cDonut = section('Content Inventory Ratio', 'Published vs Draft across all pillars');
    ov.refs.contentDonut = el('div', '');
    cDonut.appendChild(ov.refs.contentDonut);
    var r2Donut = section('R2 Media Storage Breakdown', 'cso-media bucket by asset category');
    ov.refs.r2Donut = el('div', '');
    r2Donut.appendChild(ov.refs.r2Donut);
    donutCols.appendChild(cDonut); donutCols.appendChild(r2Donut);
    wrap.appendChild(donutCols);

    var demoCols = el('div', 'cs-cols');
    var distSec = section('Odisha District Concentration', 'Registered aspirants by district');
    ov.refs.distBars = el('div', '');
    distSec.appendChild(ov.refs.distBars);
    var examSec = section('Target Exam Tracks', 'Active candidate exam preferences');
    ov.refs.examBars = el('div', '');
    examSec.appendChild(ov.refs.examBars);
    demoCols.appendChild(distSec); demoCols.appendChild(examSec);
    wrap.appendChild(demoCols);

    var tableCols = el('div', 'cs-cols');
    var hpTblSec = section('Top Performing Homepage Blocks', 'Sortable by clicks');
    ov.refs.topHpTable = el('div', '');
    hpTblSec.appendChild(ov.refs.topHpTable);
    var mutTblSec = section('Recent Admin Mutations', 'Live audit_log summary');
    ov.refs.mutTable = el('div', '');
    mutTblSec.appendChild(ov.refs.mutTable);
    tableCols.appendChild(hpTblSec); tableCols.appendChild(mutTblSec);
    wrap.appendChild(tableCols);

    var cols = el('div', 'cs-cols');
    var pipe = section('Content Pipeline', 'Published vs draft per pillar');
    ov.refs.pipeline = el('div', 'cs-pipeline');
    pipe.appendChild(ov.refs.pipeline);
    var health = section('Ops Sentinel Health', 'D1 · R2 · Edge · Service Worker');
    ov.refs.health = el('div', '');
    health.appendChild(ov.refs.health);
    cols.appendChild(pipe); cols.appendChild(health);
    wrap.appendChild(cols);

    var cols2 = el('div', 'cs-cols');
    var feed = section('Recent Activity & Audit Trail', 'Admin mutations, newest first');
    var filters = el('div', 'cs-filters');
    filters.appendChild(filterSelect('Pillar', [['', 'All pillars'], ['jobs', 'Jobs & Careers'], ['schemes', 'Schemes & Benefits'], ['study', 'Study Library'], ['community', 'Community'], ['about', 'About'], ['homepage', 'Homepage Studio'], ['navigation', 'Navigation'], ['media', 'Media'], ['system', 'System']], ov.feed.pillar, function (v) { ov.feed.pillar = v; loadFeed(false); }));
    filters.appendChild(filterSelect('Action', [['', 'All actions'], ['create', 'Created'], ['update', 'Edited'], ['publish', 'Published'], ['unpublish', 'Unpublished'], ['delete', 'Deleted']], ov.feed.type, function (v) { ov.feed.type = v; loadFeed(false); }));
    feed.appendChild(filters);
    ov.refs.feed = el('div', 'cs-feed');
    feed.appendChild(ov.refs.feed);
    var diag = section('System Health, D1 & R2 Diagnostics', 'Live counts');
    var dbar = el('div', 'cs-filters');
    dbar.appendChild(btn('Refresh diagnostics', 'cs-btn', loadDiagnostics));
    dbar.appendChild(btn('Purge All Edge Caches', 'cs-btn is-danger', purgeAll));
    diag.appendChild(dbar);
    ov.refs.diag = el('div', '');
    diag.appendChild(ov.refs.diag);
    cols2.appendChild(feed); cols2.appendChild(diag);
    wrap.appendChild(cols2);

    loadOverview(); loadFeed(false); loadDiagnostics();
  }

  // ---- Bulk content tab ----
  function csvEscape(v) { var s = String(v === null || v === undefined ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function download(name, text, mime) {
    var blob = new Blob([text], { type: mime });
    var a = el('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  function loadBulk() {
    var b = ov.bulk;
    b.selected.clear();
    return api('bulk-content?pillar=' + encodeURIComponent(b.pillar) + (b.status ? '&status=' + encodeURIComponent(b.status) : '') + (b.q ? '&q=' + encodeURIComponent(b.q) : '')).then(function (d) {
      b.items = d.items || []; b.available = d.available !== false; renderBulk();
    }).catch(function (e) { toast(e.message, 'crimson'); });
  }

  function bulkAct(action) {
    var b = ov.bulk;
    var ids = Array.from(b.selected);
    if (!ids.length) return;
    if (action === 'delete' && !window.confirm('Permanently delete ' + ids.length + ' item(s)?')) return;
    if (action === 'export') {
      api('bulk-content', 'POST', { pillar: b.pillar, action: 'export', ids: ids }).then(function (d) {
        download('cso-' + b.pillar + '-export.json', JSON.stringify(d.items, null, 2), 'application/json');
        toast('Exported ' + d.items.length + ' items (JSON)', 'ok');
      }).catch(function (e) { toast(e.message, 'crimson'); });
      return;
    }
    api('bulk-content', 'POST', { pillar: b.pillar, action: action, ids: ids }).then(function () {
      toast('Bulk ' + action + ' applied to ' + ids.length + ' item(s)', 'ok'); loadBulk();
    }).catch(function (e) { toast(e.message, 'crimson'); });
  }

  function exportCsv() {
    var items = ov.bulk.items.filter(function (i) { return !ov.bulk.selected.size || ov.bulk.selected.has(i.id); });
    var lines = ['id,title,slug,status,updated_at'].concat(items.map(function (i) { return [i.id, i.title, i.slug, i.status, i.updated_at].map(csvEscape).join(','); }));
    download('cso-' + ov.bulk.pillar + '-list.csv', lines.join('\n'), 'text/csv');
  }

  function importStatusJson(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var data;
      try { data = JSON.parse(String(reader.result)); } catch (_) { toast('Invalid JSON file', 'crimson'); return; }
      if (!Array.isArray(data)) { toast('Expected a JSON array of {id, status} objects', 'crimson'); return; }
      var pub = []; var dr = [];
      data.forEach(function (x) { if (x && x.id) { if (x.status === 'published') pub.push(String(x.id)); else if (x.status === 'draft') dr.push(String(x.id)); } });
      var jobs = [];
      if (pub.length) jobs.push(api('bulk-content', 'POST', { pillar: ov.bulk.pillar, action: 'publish', ids: pub }));
      if (dr.length) jobs.push(api('bulk-content', 'POST', { pillar: ov.bulk.pillar, action: 'draft', ids: dr }));
      if (!jobs.length) { toast('No published/draft statuses found in file', 'crimson'); return; }
      Promise.all(jobs).then(function () { toast('Imported statuses for ' + (pub.length + dr.length) + ' items', 'ok'); loadBulk(); })
        .catch(function (e) { toast(e.message, 'crimson'); });
    };
    reader.readAsText(file);
  }

  function renderBulk() {
    var b = ov.bulk;
    var box = clear(ov.refs.bulkBody);
    if (b.available === false) { box.appendChild(el('p', 'cs-muted', 'This pillar has no content table yet — publish content from its module first.')); return; }
    if (!b.items.length) { box.appendChild(el('p', 'cs-muted', 'No items match.')); return; }
    var table = el('table', 'cs-table');
    var head = el('tr');
    var all = el('input'); all.type = 'checkbox'; all.setAttribute('aria-label', 'Select all');
    all.addEventListener('change', function () {
      b.items.forEach(function (i) { if (all.checked) b.selected.add(i.id); else b.selected.delete(i.id); });
      renderBulk();
    });
    var th0 = el('th'); th0.appendChild(all); head.appendChild(th0);
    ['Title', 'Slug', 'Status', 'Updated'].forEach(function (h) { head.appendChild(el('th', '', h)); });
    var thead = el('thead'); thead.appendChild(head); table.appendChild(thead);
    var tbody = el('tbody');
    b.items.forEach(function (i) {
      var tr = el('tr', b.selected.has(i.id) ? 'is-selected' : '');
      var td0 = el('td'); var c = el('input'); c.type = 'checkbox'; c.checked = b.selected.has(i.id); c.setAttribute('aria-label', 'Select ' + i.title);
      c.addEventListener('change', function () { if (c.checked) b.selected.add(i.id); else b.selected.delete(i.id); renderBulk(); });
      td0.appendChild(c); tr.appendChild(td0);
      tr.appendChild(el('td', 'cs-cell-title', i.title));
      tr.appendChild(el('td', 'cs-muted', i.slug));
      var st = el('td'); st.appendChild(el('span', 'cs-tag cs-tag--' + (i.status === 'published' ? 'publish' : 'update'), i.status)); tr.appendChild(st);
      tr.appendChild(el('td', 'cs-num cs-muted', when(i.updated_at)));
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    box.appendChild(table);
    var n = b.selected.size;
    var bar = el('div', 'cs-bulkbar' + (n ? ' is-active' : ''));
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Bulk actions');
    bar.appendChild(el('strong', 'cs-num', n + ' selected'));
    [['Publish Selected', 'publish'], ['Move to Draft', 'draft'], ['Delete Selected', 'delete'], ['Export JSON', 'export']].forEach(function (a) {
      var x = btn(a[0], 'cs-btn' + (a[1] === 'delete' ? ' is-danger' : ''), function () { bulkAct(a[1]); });
      x.disabled = !n; bar.appendChild(x);
    });
    box.appendChild(bar);
  }

  function renderBulkTab(wrap) {
    var b = ov.bulk;
    var s = section('Bulk Content Operations', 'Select rows to publish, unpublish, delete or export');
    var f = el('div', 'cs-filters');
    f.appendChild(filterSelect('Pillar', Object.keys(PILLAR_LABELS).map(function (k) { return [k, PILLAR_LABELS[k]]; }), b.pillar, function (v) { b.pillar = v; loadBulk(); }));
    f.appendChild(filterSelect('Status', [['', 'Any status'], ['published', 'Published'], ['draft', 'Draft']], b.status, function (v) { b.status = v; loadBulk(); }));
    var q = el('input', 'cso-form-input cs-search'); q.type = 'search'; q.placeholder = 'Search titles…'; q.value = b.q; q.setAttribute('aria-label', 'Search titles');
    var t = null;
    q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { b.q = q.value; loadBulk(); }, 300); });
    f.appendChild(q);
    f.appendChild(btn('Export CSV', 'cs-btn', exportCsv));
    var imp = el('input'); imp.type = 'file'; imp.accept = 'application/json,.json'; imp.className = 'cs-file-hidden'; imp.id = 'csImportFile';
    imp.addEventListener('change', function () { if (imp.files[0]) importStatusJson(imp.files[0]); imp.value = ''; });
    var impLabel = el('label', 'cs-btn', 'Import status JSON'); impLabel.setAttribute('for', 'csImportFile');
    f.appendChild(imp); f.appendChild(impLabel);
    s.appendChild(f);
    ov.refs.bulkBody = el('div', 'cs-table-wrap');
    s.appendChild(ov.refs.bulkBody);
    wrap.appendChild(s);
    loadBulk();
  }

  function renderOverview(root, headerActions) {
    clearInterval(ov.timer);
    clear(root);
    var wrap = el('div', 'cs-suite');
    var tabs = el('div', 'cs-tabs'); tabs.setAttribute('role', 'tablist');
    [['overview', 'Command Overview'], ['bulk', 'Bulk Content']].forEach(function (t) {
      var b = btn(t[1], 'cs-tab' + (ov.tab === t[0] ? ' is-active' : ''), function () { ov.tab = t[0]; renderOverview(root, null); });
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(ov.tab === t[0]));
      tabs.appendChild(b);
    });
    wrap.appendChild(tabs);
    root.appendChild(wrap);
    if (ov.tab === 'overview') {
      renderOverviewTab(wrap);
      ov.timer = setInterval(function () {
        if (!document.hidden && ov.refs.kpis && document.body.contains(ov.refs.kpis)) loadOverview(); else if (!document.body.contains(wrap)) clearInterval(ov.timer);
      }, 60000);
    } else renderBulkTab(wrap);
    if (headerActions) {
      ov.refs.stamp = el('span', 'cs-muted cs-num', '');
      headerActions.appendChild(ov.refs.stamp);
      headerActions.appendChild(btn('Command Palette  Ctrl+K', 'cs-btn', function () { openPalette(); }));
      headerActions.appendChild(btn('Media Library', 'cs-btn', function () { toggleDrawer(true); }));
      headerActions.appendChild(btn('Refresh', 'cs-btn', function () { renderOverview(root, null); }));
    }
  }

  // ======================================================================
  // 2. COMMAND PALETTE
  // ======================================================================
  var pal = { root: null, input: null, list: null, items: [], shown: [], active: 0, open: false, remote: null, lastFocus: null };

  function fuzzy(query, text) {
    var q = query.toLowerCase(); var t = text.toLowerCase();
    if (!q) return 1;
    var idx = t.indexOf(q);
    if (idx !== -1) return 1000 - idx - (t.length - q.length) * 0.1;
    var score = 0; var ti = 0; var streak = 0;
    for (var i = 0; i < q.length; i++) {
      var found = t.indexOf(q[i], ti);
      if (found === -1) return 0;
      streak = found === ti ? streak + 1 : 0;
      score += 10 + streak * 5 - Math.min(found - ti, 8);
      ti = found + 1;
    }
    return Math.max(score, 1);
  }

  function buildStaticItems() {
    var items = [];
    items.push({ group: 'Go to', label: 'Command Overview', hint: 'Alt+0', run: function () { goFolder(OV_FOLDER); } });
    var schema = studio().getSchema ? studio().getSchema() : null;
    var folders = (schema && schema.folders) || [];
    folders.forEach(function (f, i) {
      items.push({ group: 'Pillars', label: f.title, hint: 'Alt+' + (i + 1), keywords: f.title_or || '', run: function () { goFolder(f.id); } });
      (f.modules || []).forEach(function (m) {
        items.push({ group: 'Pillars', label: f.title + ' › ' + m.title, keywords: m.title_or || '', run: function () { studio().selectModule(f.id, m.id); } });
      });
    });
    items.push({ group: 'Pillars', label: 'Homepage Studio', hint: 'Alt+6', keywords: 'homepage features blocks', run: function () { goFolder(HS_FOLDER); } });
    items.push({ group: 'Pillars', label: 'Candidate Hub (Roster & Governance)', hint: 'Alt+7', keywords: 'candidates students roster block unblock dashboard ui', run: function () { goFolder('folder-candidate-hub'); } });
    items.push({ group: 'Candidate Hub', label: 'Candidate Hub › Dashboard UI Manager & Preview', keywords: 'theme layout banner grid', run: function () { if (studio().openCandidateHubTab) studio().openCandidateHubTab('ui'); else goFolder('folder-candidate-hub'); } });
    items.push({ group: 'Candidate Hub', label: 'Candidate Hub › Add & Manage Features', keywords: 'feature builder custom widget', run: function () { if (studio().openCandidateHubTab) studio().openCandidateHubTab('features'); else goFolder('folder-candidate-hub'); } });
    items.push({ group: 'Candidate Hub', label: 'Candidate Hub › Provide Content & Targeted Push', keywords: 'assign pdf study pack district', run: function () { if (studio().openCandidateHubTab) studio().openCandidateHubTab('content'); else goFolder('folder-candidate-hub'); } });
    items.push({ group: 'Candidate Hub', label: 'Candidate Hub › Document Vault Templates', keywords: 'checklist odisha certificates', run: function () { if (studio().openCandidateHubTab) studio().openCandidateHubTab('docs'); else goFolder('folder-candidate-hub'); } });
    items.push({ group: 'Jobs Publishing House', label: 'Jobs Publishing House › + Publish New Job Article', keywords: 'jobs new recruitment article opsc ossc osssc', run: function () { if (studio().openJobsPublishingTab) studio().openJobsPublishingTab('new'); else goFolder('folder-jobs-careers'); } });
    items.push({ group: 'Jobs Publishing House', label: 'Jobs Publishing House › 3-Layer Category Hierarchy', keywords: 'taxonomy main subcategory department tenure', run: function () { if (studio().openJobsPublishingTab) studio().openJobsPublishingTab('taxonomy'); else goFolder('folder-jobs-careers'); } });
    items.push({ group: 'Jobs Publishing House', label: 'Jobs Publishing House › Reusable Bilingual Snippets', keywords: 'snippets age relaxation odia rules', run: function () { if (studio().openJobsPublishingTab) studio().openJobsPublishingTab('snippets'); else goFolder('folder-jobs-careers'); } });
    items.push({ group: 'Schemes Publishing House', label: 'Schemes Publishing House › + Publish New Scheme Article', keywords: 'schemes welfare subhadra scholarship cm-kisan dbt', run: function () { if (studio().openSchemesPublishingTab) studio().openSchemesPublishingTab('new'); else goFolder('folder-schemes-benefits'); } });
    items.push({ group: 'Schemes Publishing House', label: 'Schemes Publishing House › 3-Layer Scheme Hierarchy', keywords: 'scheme taxonomy government domain benefit type', run: function () { if (studio().openSchemesPublishingTab) studio().openSchemesPublishingTab('taxonomy'); else goFolder('folder-schemes-benefits'); } });
    items.push({ group: 'Schemes Publishing House', label: 'Schemes Publishing House › Reusable Bilingual Snippets', keywords: 'npci dbt income resident otr snippets', run: function () { if (studio().openSchemesPublishingTab) studio().openSchemesPublishingTab('snippets'); else goFolder('folder-schemes-benefits'); } });
    items.push({ group: 'Study Library Studio', label: 'Study Library Studio › + Publish New Study Material', keywords: 'study notes syllabus pyq mcq flashcards opsc ossc', run: function () { if (studio().openStudyPublishingTab) studio().openStudyPublishingTab('new'); else goFolder('folder-study-library'); } });
    items.push({ group: 'Study Library Studio', label: 'Study Library Studio › 3-Layer Curriculum Hierarchy', keywords: 'exam track subject paper chapter taxonomy', run: function () { if (studio().openStudyPublishingTab) studio().openStudyPublishingTab('taxonomy'); else goFolder('folder-study-library'); } });
    items.push({ group: 'Study Library Studio', label: 'Study Library Studio › Reader Doubts & PYQ Corrections Queue', keywords: 'doubts pyq typo corrections feedback', run: function () { if (studio().openStudyPublishingTab) studio().openStudyPublishingTab('doubts'); else goFolder('folder-study-library'); } });
    document.querySelectorAll('.cso-create-item[data-create-target]').forEach(function (b) {
      var t = b.getAttribute('data-create-target');
      var strong = b.querySelector('strong');
      items.push({ group: 'Quick create', label: 'Create: ' + (strong ? strong.textContent : t), run: function () { studio().openRoute(t); } });
    });
    items.push({ group: 'Quick create', label: 'Create: Homepage Block', run: newHomepageBlock });
    [['system', 'System (Auto Light/Dark)'], ['dark', 'Dark Night'], ['reading', 'Reading Mode'], ['utkal-bharat', 'Odisha & Bharat']].forEach(function (th) {
      items.push({ group: 'Theme', label: 'Theme: ' + th[1], run: function () {
        var o = document.querySelector('.cso-theme-option[data-theme-value="' + th[0] + '"]'); if (o) o.click();
      } });
    });
    items.push({ group: 'Actions', label: 'Purge All Edge Caches', keywords: 'cache clear invalidate', run: purgeAll });
    items.push({ group: 'Actions', label: 'Open Media Library', keywords: 'r2 upload files images pdf', run: function () { toggleDrawer(true); } });
    items.push({ group: 'Actions', label: 'Open Bulk Content Operations', keywords: 'export import delete publish', run: function () { ov.tab = 'bulk'; goFolder(OV_FOLDER); } });
    items.push({ group: 'Actions', label: 'View public website', run: function () { window.open('/', '_blank', 'noopener'); } });
    return items;
  }

  function remoteItems() {
    var out = [];
    var r = pal.remote;
    if (!r) return out;
    (r.homepage_blocks || []).forEach(function (b) {
      out.push({ group: 'Homepage blocks', label: b.title_en + ' (' + String(b.section_key).replace(/_/g, ' ') + ')' + (b.is_published ? '' : ' · draft'), run: function () {
        goFolder(HS_FOLDER);
        if (window.CSOHomepageStudio && window.CSOHomepageStudio.openBlock) window.CSOHomepageStudio.openBlock(b.id);
      } });
    });
    (r.categories || []).forEach(function (c) { out.push({ group: 'Navigation', label: 'Category: ' + c.name_en, keywords: c.name_or || '', run: function () { studio().openRoute('nav-manager'); } }); });
    (r.menu_items || []).forEach(function (m) { out.push({ group: 'Navigation', label: 'Menu: ' + m.label_en, keywords: m.label_or || '', run: function () { studio().openRoute('nav-manager'); } }); });
    (r.job_articles || []).forEach(function (j) {
      out.push({ group: 'Job Articles', label: j.title_en + (j.is_published ? '' : ' · draft'), keywords: j.organisation_en || j.slug || '', run: function () {
        if (studio().openJobsPublishingTab) studio().openJobsPublishingTab('articles');
        else goFolder('folder-jobs-careers');
      } });
    });
    (r.scheme_articles || []).forEach(function (sc) {
      out.push({ group: 'Scheme Articles', label: sc.title_en + (sc.is_published ? '' : ' · draft'), keywords: sc.department_en || sc.slug || '', run: function () {
        if (studio().openSchemesPublishingTab) studio().openSchemesPublishingTab('articles');
        else goFolder('folder-schemes-benefits');
      } });
    });
    (r.study_articles || []).forEach(function (st) {
      out.push({ group: 'Study Modules', label: st.title_en + (st.is_published ? '' : ' · draft'), keywords: (st.resource_type_badge || '') + ' ' + (st.exam_board_tag || '') + ' ' + (st.slug || ''), run: function () {
        if (studio().openStudyPublishingTab) studio().openStudyPublishingTab('articles');
        else goFolder('folder-study-library');
      } });
    });
    return out;
  }

  function paletteRender() {
    var q = pal.input.value.trim();
    var all = pal.items.concat(remoteItems());
    var scored = all.map(function (it) { return { it: it, s: fuzzy(q, it.label + ' ' + (it.keywords || '') + ' ' + it.group) }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, 40).map(function (x) { return x.it; });
    pal.shown = scored;
    pal.active = Math.min(pal.active, Math.max(scored.length - 1, 0));
    clear(pal.list);
    if (!scored.length) { pal.list.appendChild(el('li', 'cs-pal-empty', 'No matching commands')); pal.input.removeAttribute('aria-activedescendant'); return; }
    var lastGroup = '';
    scored.forEach(function (it, i) {
      if (!q && it.group !== lastGroup) { lastGroup = it.group; var g = el('li', 'cs-pal-group', it.group); g.setAttribute('role', 'presentation'); pal.list.appendChild(g); }
      var li = el('li', 'cs-pal-item' + (i === pal.active ? ' is-active' : ''));
      li.id = 'csPalItem' + i;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === pal.active));
      li.appendChild(el('span', 'cs-pal-label', it.label));
      if (q) li.appendChild(el('span', 'cs-pal-group-tag', it.group));
      if (it.hint) li.appendChild(el('kbd', 'cs-kbd', it.hint));
      li.addEventListener('mousemove', function () { if (pal.active !== i) { pal.active = i; paletteRender(); } });
      li.addEventListener('click', function () { paletteRun(i); });
      pal.list.appendChild(li);
    });
    pal.input.setAttribute('aria-activedescendant', 'csPalItem' + pal.active);
    var act = document.getElementById('csPalItem' + pal.active);
    if (act && act.scrollIntoView) act.scrollIntoView({ block: 'nearest' });
  }

  function paletteRun(i) {
    var it = pal.shown[i];
    if (!it) return;
    closePalette(true);
    try { it.run(); } catch (e) { toast('Command failed: ' + e.message, 'crimson'); }
  }

  function buildPalette() {
    if (pal.root) return;
    var root = el('div', 'cs-pal');
    root.hidden = true;
    var backdrop = el('div', 'cs-pal-backdrop');
    backdrop.addEventListener('click', function () { closePalette(); });
    var card = el('div', 'cs-pal-card');
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-label', 'Command palette');
    var input = el('input', 'cs-pal-input');
    input.type = 'text'; input.placeholder = 'Search pillars, blocks, navigation, actions, themes…';
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-expanded', 'true'); input.setAttribute('aria-controls', 'csPalList'); input.setAttribute('aria-autocomplete', 'list');
    input.autocomplete = 'off';
    var list = el('ul', 'cs-pal-list'); list.id = 'csPalList'; list.setAttribute('role', 'listbox');
    var foot = el('div', 'cs-pal-foot cs-muted');
    foot.appendChild(el('span', '', '↑ ↓ navigate · Enter run · Esc close'));
    card.appendChild(input); card.appendChild(list); card.appendChild(foot);
    root.appendChild(backdrop); root.appendChild(card);
    document.body.appendChild(root);
    input.addEventListener('input', function () { pal.active = 0; paletteRender(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); pal.active = Math.min(pal.active + 1, pal.shown.length - 1); paletteRender(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); pal.active = Math.max(pal.active - 1, 0); paletteRender(); }
      else if (e.key === 'Enter') { e.preventDefault(); paletteRun(pal.active); }
      else if (e.key === 'Tab') { e.preventDefault(); }
    });
    pal.root = root; pal.input = input; pal.list = list;
  }

  function openPalette() {
    buildPalette();
    pal.lastFocus = document.activeElement;
    pal.items = buildStaticItems();
    pal.active = 0; pal.open = true;
    pal.root.hidden = false;
    pal.input.value = '';
    paletteRender();
    pal.input.focus();
    api('command-index').then(function (d) { pal.remote = d; if (pal.open) paletteRender(); }).catch(function () {});
  }
  function closePalette(skipFocus) {
    if (!pal.root || !pal.open) return;
    pal.open = false; pal.root.hidden = true;
    if (!skipFocus && pal.lastFocus && pal.lastFocus.focus) pal.lastFocus.focus();
  }

  // ======================================================================
  // 3. KEYBOARD SHORTCUTS
  // ======================================================================
  function activeEditorForm() {
    var root = document.getElementById('workspaceRoot');
    if (!root) return null;
    var focused = document.activeElement && document.activeElement.closest ? document.activeElement.closest('form') : null;
    if (focused && root.contains(focused)) return focused;
    var forms = Array.prototype.slice.call(root.querySelectorAll('form'));
    return forms.find(function (f) { return f.offsetParent !== null && f.querySelector('button[type="submit"], input[type="submit"]'); }) || null;
  }

  function onKeydown(e) {
    var key = (e.key || '').toLowerCase();
    var mod = e.ctrlKey || e.metaKey;
    if (mod && key === 'k') { e.preventDefault(); if (pal.open) closePalette(); else openPalette(); return; }
    if (e.key === 'Escape') {
      if (pal.open) { e.preventDefault(); closePalette(); return; }
      if (drawer.open) { e.preventDefault(); toggleDrawer(false); return; }
      var modal = document.getElementById('globalModal');
      if (modal && !modal.hidden && window.closeModal) { window.closeModal(); }
      return;
    }
    if (mod && key === 's') {
      var form = activeEditorForm();
      if (form) {
        e.preventDefault();
        var live = form.querySelector('[data-cs-action="publish"]');
        if (form.requestSubmit) form.requestSubmit(); else if (live) live.click();
        toast('Saving active editor…', 'info');
      }
      return;
    }
    if (e.altKey && !mod && /^Digit[0-7]$/.test(e.code || '')) {
      var n = Number(e.code.slice(5));
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') { /* still allow Alt shortcuts */ }
      e.preventDefault();
      if (n === 0) { goFolder(OV_FOLDER); return; }
      if (n === 6) { goFolder(HS_FOLDER); return; }
      if (n === 7) { goFolder('folder-candidate-hub'); return; }
      var schema = studio().getSchema ? studio().getSchema() : null;
      var f = schema && schema.folders && schema.folders[n - 1];
      if (f) goFolder(f.id);
    }
  }

  // ======================================================================
  // 4. AUTHORING SAFETY: autosave, workflow bar, pre-flight validator
  // ======================================================================
  var DRAFT_PREFIX = 'cso_draft_v243:';
  var lastField = null;
  var ODIA_RE = /[\u0B00-\u0B7F]/;
  var OFFICIAL_HOST_RE = /(^|\.)(gov\.in|nic\.in|odisha\.gov\.in|gov|edu\.in|ac\.in)$/i;

  function fieldKey(f) { return f.name || f.id || ''; }
  function serialize(form) {
    var out = {};
    Array.prototype.forEach.call(form.elements, function (f) {
      var k = fieldKey(f);
      if (!k || f.type === 'password' || f.type === 'file' || f.type === 'submit' || f.type === 'button' || f.type === 'hidden') return;
      if (f.type === 'checkbox' || f.type === 'radio') out[k] = f.checked;
      else out[k] = f.value;
    });
    return out;
  }
  function restore(form, data) {
    Array.prototype.forEach.call(form.elements, function (f) {
      var k = fieldKey(f);
      if (!k || !Object.prototype.hasOwnProperty.call(data, k)) return;
      if (f.type === 'checkbox' || f.type === 'radio') f.checked = !!data[k]; else f.value = data[k];
      f.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
  function hasContent(d) { return Object.keys(d).some(function (k) { return typeof d[k] === 'string' && d[k].trim().length > 2; }); }
  function readStore(key) { try { return JSON.parse(localStorage.getItem(DRAFT_PREFIX + key) || 'null'); } catch (_) { return null; } }
  function writeStore(key, obj) { try { localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(obj)); } catch (_) {} }

  function findField(form, re) {
    return Array.prototype.find.call(form.elements, function (f) { return re.test(fieldKey(f)) && f.type !== 'checkbox' && f.type !== 'hidden'; }) || null;
  }

  function urlBadge(value) {
    var v = String(value || '').trim();
    if (!v) return null;
    if (/^\/(?!\/)/.test(v) || v.charAt(0) === '#') return ['ok', 'Internal path'];
    var u;
    try { u = new URL(v); } catch (_) { return ['bad', 'Invalid URL syntax']; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return ['bad', 'Unsupported scheme'];
    var official = OFFICIAL_HOST_RE.test(u.hostname);
    if (u.protocol === 'http:') return ['warn', 'HTTP — not secure' + (official ? ' · official domain' : '')];
    return [official ? 'ok' : 'info', official ? 'HTTPS ✓ official (.gov.in/.nic.in)' : 'HTTPS ✓ · not a government domain'];
  }

  function counterText(f) {
    var v = f.value || '';
    var k = fieldKey(f).toLowerCase();
    var words = v.trim() ? v.trim().split(/\s+/).length : 0;
    var parts = [v.length + ' chars', words + ' words'];
    var tone = '';
    if (/title|headline/.test(k) && v.length > 60) { parts.push('title > 60 chars may truncate in search'); tone = 'warn'; }
    if (/summary|description|excerpt|subtitle/.test(k) && v.length > 160) { parts.push('over 160 chars'); tone = 'warn'; }
    var isOr = /_or$|odia/.test(k); var isEn = /_en$/.test(k);
    if (isOr && v.trim() && !ODIA_RE.test(v)) { parts.push('no Odia script detected'); tone = 'warn'; }
    if (isEn && ODIA_RE.test(v)) { parts.push('Odia text in English field'); tone = 'warn'; }
    if (f.tagName === 'TEXTAREA' && !isOr && words > 20) {
      var sentences = v.split(/[.!?।]+/).filter(function (s) { return s.trim(); }).length || 1;
      var avg = Math.round(words / sentences);
      parts.push('avg ' + avg + ' words/sentence' + (avg > 25 ? ' (hard to read)' : ''));
      if (avg > 25) tone = 'warn';
    }
    return [tone, parts.join(' · ')];
  }

  function enhanceForm(form, ctxKey) {
    form.setAttribute('data-cs-enhanced', '1');
    var key = ctxKey + ':' + (form.id || form.getAttribute('name') || 'form');
    var textFields = Array.prototype.filter.call(form.elements, function (f) { return (f.tagName === 'TEXTAREA' || (f.tagName === 'INPUT' && /^(text|url|search)$/.test(f.type || 'text'))); });

    // --- workflow bar ---
    var bar = el('div', 'cs-flowbar');
    bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Draft and publish workflow');
    var status = el('span', 'cs-flow-status cs-muted cs-num', 'Autosave on');
    function statusField() { return form.querySelector('[name="status"]') || form.querySelector('[name="is_published"]'); }
    function setStatus(published) {
      var sf = statusField();
      if (!sf) return false;
      if (sf.type === 'checkbox') sf.checked = published;
      else if (sf.tagName === 'SELECT') {
        var want = published ? ['published', 'live', 'active'] : ['draft'];
        var opt = Array.prototype.find.call(sf.options, function (o) { return want.indexOf(o.value) !== -1; });
        if (!opt) return false;
        sf.value = opt.value;
      } else sf.value = published ? 'published' : 'draft';
      sf.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    function snapshot(label) {
      var data = serialize(form);
      var rec = readStore(key) || { revisions: [] };
      rec.t = Date.now(); rec.fields = data; rec.submittedAt = 0;
      if (label) { rec.revisions = (rec.revisions || []).concat([{ t: rec.t, label: label, fields: data }]).slice(-5); }
      writeStore(key, rec);
      status.textContent = (label || 'Autosaved') + ' ' + new Date().toLocaleTimeString('en-IN');
    }
    var saveDraft = btn('Save Draft', 'cs-btn', function () {
      snapshot('Draft saved');
      if (setStatus(false) && form.requestSubmit) form.requestSubmit();
      else toast('Draft saved locally (recoverable after reload)', 'ok');
    });
    saveDraft.setAttribute('data-cs-action', 'draft');
    var publish = btn('Publish Live', 'cs-btn is-primary', function () {
      setStatus(true);
      if (form.requestSubmit) form.requestSubmit();
    });
    publish.setAttribute('data-cs-action', 'publish');
    var unpub = btn('Unpublish', 'cs-btn', function () {
      if (!setStatus(false)) { toast('This editor has no status field to unpublish', 'crimson'); return; }
      if (form.requestSubmit) form.requestSubmit();
    });
    unpub.setAttribute('data-cs-action', 'unpublish');
    bar.appendChild(saveDraft); bar.appendChild(publish); bar.appendChild(unpub);
    var schedField = findField(form, /schedul|publish_at|publish_date/i);
    if (schedField) {
      bar.appendChild(btn('Schedule…', 'cs-btn', function () { schedField.focus(); toast('Set the schedule date, then press Publish Live', 'info'); }));
    }
    var revSel = el('select', 'cso-form-select cs-rev');
    revSel.setAttribute('aria-label', 'Restore a saved revision');
    function fillRevs() {
      clear(revSel);
      var o = el('option', '', 'Revisions'); o.value = ''; revSel.appendChild(o);
      ((readStore(key) || {}).revisions || []).slice().reverse().forEach(function (r, i) {
        var op = el('option', '', r.label + ' · ' + new Date(r.t).toLocaleTimeString('en-IN')); op.value = String(r.t); revSel.appendChild(op);
      });
    }
    fillRevs();
    revSel.addEventListener('change', function () {
      var r = ((readStore(key) || {}).revisions || []).find(function (x) { return String(x.t) === revSel.value; });
      if (r) { restore(form, r.fields); toast('Revision restored', 'ok'); }
      revSel.value = '';
    });
    bar.appendChild(revSel);
    bar.appendChild(status);
    form.insertBefore(bar, form.firstChild);

    // --- recovery banner ---
    var saved = readStore(key);
    if (saved && saved.fields && hasContent(saved.fields) && (!saved.submittedAt || saved.submittedAt < saved.t) && Date.now() - saved.t < 7 * 86400000) {
      var cur = serialize(form);
      if (JSON.stringify(cur) !== JSON.stringify(saved.fields)) {
        var banner = el('div', 'cs-recover');
        banner.setAttribute('role', 'status');
        banner.appendChild(el('span', '', 'Unsaved draft found from ' + new Date(saved.t).toLocaleString('en-IN') + '.'));
        banner.appendChild(btn('Restore', 'cs-btn is-primary', function () { restore(form, saved.fields); banner.remove(); toast('Draft restored', 'ok'); }));
        banner.appendChild(btn('Discard', 'cs-btn', function () { try { localStorage.removeItem(DRAFT_PREFIX + key); } catch (_) {} banner.remove(); }));
        form.insertBefore(banner, bar.nextSibling);
      }
    }

    // --- autosave ---
    var timer = null;
    form.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(function () { var d = serialize(form); if (hasContent(d)) snapshot(''); }, 900);
    });
    form.addEventListener('submit', function () {
      var rec = readStore(key); if (rec) { rec.submittedAt = Date.now() + 1; writeStore(key, rec); }
    });

    // --- counters + URL badges + slug check ---
    var pillar = FOLDER_PILLAR[(studio().getActiveFolderId && studio().getActiveFolderId()) || ''] || '';
    textFields.forEach(function (f) {
      var k = fieldKey(f).toLowerCase();
      var note = el('div', 'cs-counter cs-muted cs-num');
      note.setAttribute('aria-live', 'off');
      if (f.parentNode) f.parentNode.insertBefore(note, f.nextSibling);
      function update() {
        var parts = [];
        var ct = counterText(f);
        parts.push(ct[1]);
        var tone = ct[0];
        if (/url|href|link/.test(k)) {
          var b = urlBadge(f.value);
          if (b) { parts.push(b[1]); tone = b[0] === 'bad' ? 'bad' : (b[0] === 'warn' ? 'warn' : tone); }
        }
        note.textContent = parts.join(' · ');
        note.className = 'cs-counter cs-num ' + (tone ? 'is-' + tone : 'cs-muted');
      }
      f.addEventListener('input', update);
      f.addEventListener('focus', function () { lastField = f; });
      update();
      if (/slug/.test(k) && pillar) {
        var st = null;
        f.addEventListener('input', function () {
          clearTimeout(st);
          st = setTimeout(function () {
            var exclude = findField(form, /^id$/i);
            api('slug-check?pillar=' + pillar + '&slug=' + encodeURIComponent(f.value) + '&exclude=' + encodeURIComponent(exclude ? exclude.value : '')).then(function (d) {
              var base = counterText(f)[1];
              note.textContent = base + ' · ' + (!d.valid ? d.reason : d.available ? 'Slug available ✓' : 'Slug already used by ' + d.conflict_id);
              note.className = 'cs-counter cs-num is-' + (d.available ? 'ok' : 'bad');
            }).catch(function () {});
          }, 450);
        });
      }
    });

    // --- search & social preview ---
    var titleF = findField(form, /^(title|title_en|headline)$/i);
    var descF = findField(form, /^(summary|description|subtitle_en|excerpt|highlights_en)$/i);
    var slugF = findField(form, /slug/i);
    if (titleF) {
      var det = el('details', 'cs-preview');
      det.appendChild(el('summary', '', 'Search & social card preview'));
      var google = el('div', 'cs-snippet');
      var gUrl = el('div', 'cs-snippet__url cs-muted'); var gTitle = el('div', 'cs-snippet__title'); var gDesc = el('div', 'cs-snippet__desc cs-muted');
      google.appendChild(gUrl); google.appendChild(gTitle); google.appendChild(gDesc);
      var og = el('div', 'cs-ogcard');
      var ogHost = el('div', 'cs-muted'); var ogTitle = el('strong'); var ogDesc = el('div', 'cs-muted');
      og.appendChild(ogHost); og.appendChild(ogTitle); og.appendChild(ogDesc);
      det.appendChild(google); det.appendChild(og);
      var updatePv = function () {
        var t = (titleF.value || 'Untitled').trim();
        var d = descF ? (descF.value || '').trim() : '';
        gUrl.textContent = 'csodisha.com › ' + (slugF && slugF.value ? slugF.value : 'your-page');
        gTitle.textContent = t.length > 60 ? t.slice(0, 57) + '…' : t;
        gDesc.textContent = d.length > 160 ? d.slice(0, 157) + '…' : (d || 'Add a summary to improve the search snippet.');
        ogHost.textContent = 'csodisha.com';
        ogTitle.textContent = t; ogDesc.textContent = d.slice(0, 110);
      };
      ['input', 'change'].forEach(function (ev) { form.addEventListener(ev, updatePv); });
      updatePv();
      form.insertBefore(det, bar.nextSibling);
    }
  }

  var enhanceTimer = null;
  function enhanceAll() {
    var root = document.getElementById('workspaceRoot');
    if (!root) return;
    var ctx = (studio().getActiveModuleId && studio().getActiveModuleId()) || 'studio';
    Array.prototype.forEach.call(root.querySelectorAll('form:not([data-cs-enhanced])'), function (form) {
      var textCount = form.querySelectorAll('textarea, input[type="text"], input:not([type])').length;
      if (textCount < 2 || form.closest('.cs-suite')) return;
      try { enhanceForm(form, ctx); } catch (e) { form.setAttribute('data-cs-enhanced', 'error'); }
    });
  }
  function watchWorkspace() {
    var root = document.getElementById('workspaceRoot');
    if (!root || !window.MutationObserver) return;
    new MutationObserver(function () { clearTimeout(enhanceTimer); enhanceTimer = setTimeout(enhanceAll, 120); }).observe(root, { childList: true, subtree: true });
    document.addEventListener('focusin', function (e) {
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName) && root.contains(e.target)) lastField = e.target;
    });
    enhanceAll();
  }

  // ======================================================================
  // 5. R2 MEDIA DRAWER
  // ======================================================================
  var drawer = { root: null, open: false, grid: null, search: null, kind: '', note: null, lastFocus: null };

  function loadMedia() {
    var q = 'media-library?q=' + encodeURIComponent(drawer.search.value || '') + (drawer.kind ? '&kind=' + drawer.kind : '');
    return api(q).then(function (d) {
      var g = clear(drawer.grid);
      if (!d.items.length) { g.appendChild(el('p', 'cs-muted', 'No media yet — upload images or PDFs above.')); return; }
      d.items.forEach(function (m) {
        var card = el('div', 'cs-media-card');
        var thumb = el('div', 'cs-media-thumb');
        if (/^image\//.test(m.mime)) { var img = el('img'); img.src = m.url; img.alt = m.name; img.loading = 'lazy'; thumb.appendChild(img); }
        else thumb.appendChild(el('span', 'cs-media-ext', (m.mime.split('/')[1] || 'file').toUpperCase()));
        card.appendChild(thumb);
        card.appendChild(el('strong', 'cs-media-name', m.name));
        card.appendChild(el('span', 'cs-muted cs-num', bytes(m.size) + ' · ' + when(m.created_at)));
        var row = el('div', 'cs-media-actions');
        row.appendChild(btn('Copy URL', 'cs-btn', function () {
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(m.absolute_url).then(function () { toast('Public URL copied', 'ok'); }, function () { toast(m.absolute_url, 'info'); });
          else toast(m.absolute_url, 'info');
        }));
        row.appendChild(btn('Attach', 'cs-btn is-primary', function () {
          if (!lastField || !document.body.contains(lastField)) { toast('Click a URL / attachment field in the editor first', 'crimson'); return; }
          lastField.value = m.url;
          lastField.dispatchEvent(new Event('input', { bubbles: true }));
          lastField.dispatchEvent(new Event('change', { bubbles: true }));
          toast('Attached to ' + (lastField.name || lastField.id || 'field'), 'ok');
        }));
        var open = el('a', 'cs-btn', 'Open'); open.href = m.url; open.target = '_blank'; open.rel = 'noopener noreferrer';
        row.appendChild(open);
        card.appendChild(row);
        g.appendChild(card);
      });
    }).catch(function (e) { clear(drawer.grid).appendChild(el('p', 'cs-error', e.message)); });
  }

  function uploadFiles(files) {
    if (!files || !files.length) return;
    var fd = new FormData();
    Array.prototype.forEach.call(files, function (f) { fd.append('files', f); });
    drawer.note.textContent = 'Uploading ' + files.length + ' file(s) to R2…';
    api('media/upload', 'POST', fd, true).then(function (d) {
      drawer.note.textContent = 'Uploaded ' + d.uploaded_count + ' file(s).';
      toast('Uploaded to R2', 'ok'); loadMedia();
    }).catch(function (e) { drawer.note.textContent = 'Upload failed: ' + e.message; toast(e.message, 'crimson'); });
  }

  function buildDrawer() {
    if (drawer.root) return;
    var root = el('aside', 'cs-drawer');
    root.hidden = true;
    root.setAttribute('aria-label', 'Media library');
    var head = el('div', 'cs-drawer__head');
    head.appendChild(el('h2', 'cs-card__title', 'Media Library · R2'));
    head.appendChild(btn('×', 'cs-icon-btn', function () { toggleDrawer(false); }));
    head.lastChild.setAttribute('aria-label', 'Close media library');
    root.appendChild(head);
    var up = el('div', 'cs-upload');
    var file = el('input'); file.type = 'file'; file.multiple = true; file.accept = 'image/jpeg,image/png,image/webp,application/pdf'; file.id = 'csMediaFile'; file.className = 'cs-file-hidden';
    file.addEventListener('change', function () { uploadFiles(file.files); file.value = ''; });
    var lab = el('label', 'cs-btn is-primary', 'Upload images / PDFs'); lab.setAttribute('for', 'csMediaFile');
    drawer.note = el('span', 'cs-muted', 'Max 25 MB per file. Attach inserts the public URL into the last field you focused.');
    up.appendChild(file); up.appendChild(lab); up.appendChild(drawer.note);
    root.appendChild(up);
    var f = el('div', 'cs-filters');
    drawer.search = el('input', 'cso-form-input cs-search'); drawer.search.type = 'search'; drawer.search.placeholder = 'Search files…'; drawer.search.setAttribute('aria-label', 'Search media');
    var t = null; drawer.search.addEventListener('input', function () { clearTimeout(t); t = setTimeout(loadMedia, 300); });
    f.appendChild(drawer.search);
    f.appendChild(filterSelect('Type', [['', 'All'], ['image', 'Images'], ['pdf', 'PDF']], '', function (v) { drawer.kind = v; loadMedia(); }));
    root.appendChild(f);
    drawer.grid = el('div', 'cs-media-grid');
    root.appendChild(drawer.grid);
    document.body.appendChild(root);
    drawer.root = root;
  }
  function toggleDrawer(show) {
    buildDrawer();
    drawer.open = show;
    drawer.root.hidden = !show;
    document.body.classList.toggle('cs-drawer-open', show);
    if (show) { drawer.lastFocus = document.activeElement; loadMedia(); } else if (drawer.lastFocus && drawer.lastFocus.focus) drawer.lastFocus.focus();
  }

  // ======================================================================
  // boot
  // ======================================================================
  function injectTopbar() {
    var center = document.querySelector('.cso-topbar-center');
    if (!center || document.getElementById('csPaletteTrigger')) return;
    var trigger = el('button', 'cs-topbar-search');
    trigger.id = 'csPaletteTrigger'; trigger.type = 'button';
    trigger.setAttribute('aria-label', 'Open command palette (Ctrl+K)');
    trigger.appendChild(el('span', '', 'Search or jump to…'));
    trigger.appendChild(el('kbd', 'cs-kbd', 'Ctrl K'));
    trigger.addEventListener('click', openPalette);
    center.insertBefore(trigger, center.firstChild);
    var media = el('button', 'cs-topbar-media', 'Media');
    media.type = 'button'; media.id = 'csMediaTrigger'; media.setAttribute('aria-label', 'Open media library');
    media.addEventListener('click', function () { toggleDrawer(!drawer.open); });
    center.appendChild(media);
  }

  function init() {
    injectTopbar();
    document.addEventListener('keydown', onKeydown);
    watchWorkspace();
  }

  window.CSOCommandSuite = { OV_FOLDER: OV_FOLDER, OV_MODULE: OV_MODULE, render: renderOverview, openPalette: openPalette, toggleMedia: toggleDrawer, urlBadge: urlBadge, fuzzy: fuzzy };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window, document);
