/* Common Sense Odisha — Restored Specialized Module Studios & Builders (admin/modules-restored.js)
   Strict CSP-compliant: ZERO .innerHTML, ZERO .style.*, ZERO inline handlers, ZERO fake seed rows.
   All tables, KPIs, and diagnostics use live D1/R2 (/api/admin/*), /admin/site-manifest.json, /sitemap.xml, /feed.xml. */
(function (window, document) {
  'use strict';

  var manifestCache = null;
  var navCache = null;

  /* ---------- Safe DOM & Utility Helpers ---------- */
  function clear(n) {
    while (n && n.firstChild) n.removeChild(n.firstChild);
    return n;
  }

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === false || v === null || v === undefined) return;
      if (k === 'class') n.className = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (k === 'text') n.textContent = String(v);
      else n.setAttribute(k, v === true ? '' : String(v));
    });
    [].concat(kids || []).forEach(function (c) {
      if (c !== null && c !== undefined && c !== false) {
        n.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
      }
    });
    return n;
  }

  function toast(msg, kind) {
    if (typeof window.showToast === 'function') window.showToast(msg, kind || 'info');
  }

  function renderSanitizedHtml(container, htmlString) {
    clear(container);
    var raw = String(htmlString || '').trim();
    if (!raw) return;
    if (typeof DOMParser === 'undefined') {
      container.appendChild(el('p', { text: raw.replace(/<[^>]*>/g, '') }));
      return;
    }
    var ALLOWED = { P: 1, H1: 1, H2: 1, H3: 1, H4: 1, H5: 1, UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1, PRE: 1, CODE: 1, STRONG: 1, EM: 1, BR: 1, HR: 1, A: 1 };
    var DROP = { SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, SVG: 1, MATH: 1, FORM: 1 };
    function walk(node) {
      if (!node) return null;
      if (node.nodeType === 3) return document.createTextNode(node.nodeValue || '');
      if (node.nodeType !== 1) return null;
      var tag = node.tagName.toUpperCase();
      if (DROP[tag]) return null;
      if (!ALLOWED[tag]) {
        var frag = document.createDocumentFragment();
        Array.prototype.forEach.call(node.childNodes, function (c) { var x = walk(c); if (x) frag.appendChild(x); });
        return frag;
      }
      if (tag === 'BR' || tag === 'HR') return document.createElement(tag.toLowerCase());
      if (tag === 'A') {
        var href = node.getAttribute('href') || '';
        var safe = (/^\/(?!\/)/.test(href) || /^https?:\/\//i.test(href)) ? href : null;
        var outA = document.createElement(safe ? 'a' : 'span');
        if (safe) { outA.setAttribute('href', safe); outA.setAttribute('target', '_blank'); outA.setAttribute('rel', 'noopener noreferrer'); }
        Array.prototype.forEach.call(node.childNodes, function (c) { var x = walk(c); if (x) outA.appendChild(x); });
        return outA;
      }
      var out = document.createElement(tag.toLowerCase());
      Array.prototype.forEach.call(node.childNodes, function (c) { var x = walk(c); if (x) out.appendChild(x); });
      return out;
    }
    var doc = new DOMParser().parseFromString(raw, 'text/html');
    Array.prototype.forEach.call(doc.body.childNodes, function (n) { var clean = walk(n); if (clean) container.appendChild(clean); });
  }

  async function api(method, path, body, isForm) {
    var opts = { method: method, credentials: 'same-origin', headers: { 'X-CSO-CSRF': '1' } };
    if (body !== undefined) {
      if (isForm) opts.body = body;
      else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    }
    var r = await fetch('/api/admin/' + path, opts);
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok) {
      var err = new Error(d.error || 'HTTP ' + r.status);
      err.status = r.status;
      throw err;
    }
    return d;
  }

  async function fetchManifest() {
    if (manifestCache) return manifestCache;
    var r = await fetch('./site-manifest.json', { credentials: 'same-origin' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    manifestCache = await r.json();
    return manifestCache;
  }

  async function fetchNav() {
    if (navCache) return navCache;
    var r = await fetch('./data/master-navigation.json', { credentials: 'same-origin' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    navCache = await r.json();
    return navCache;
  }

  function downloadFile(filename, text, mime) {
    var blob = new Blob([text], { type: mime || 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = el('a', { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function pickJsonFile(onData) {
    var inp = el('input', { type: 'file', accept: '.json,application/json', class: 'cso-hidden' });
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          onData(JSON.parse(String(reader.result || '{}')));
          toast('Configuration imported', 'success');
        } catch (e) {
          toast('Invalid JSON file: ' + e.message, 'crimson');
        }
      };
      reader.readAsText(f);
      inp.remove();
    });
    document.body.appendChild(inp);
    inp.click();
  }

  function mountCms(root, route, tabs) {
    if (!window.CSOCms) return;
    var host = el('div', { class: 'cms-embed' });
    root.appendChild(host);
    window.CSOCms.mount(host, route, tabs || null);
  }

  function addHeaderPill(actions, label) {
    if (!actions) return;
    actions.appendChild(el('span', { class: 'cso-live-pill', text: label || '● Live · D1 / R2' }));
  }

  function addHeaderBtn(actions, label, primary, fn) {
    if (!actions) return;
    actions.appendChild(el('button', {
      type: 'button',
      class: 'cso-mod-btn' + (primary ? ' cso-mod-btn-primary' : ''),
      text: label,
      onclick: fn
    }));
  }

  function kpiBox(val, lbl) {
    return el('div', { class: 'cso-mod-kpi' }, [
      el('div', { class: 'cso-mod-kpi-val', text: val }),
      el('div', { class: 'cso-mod-kpi-lbl', text: lbl })
    ]);
  }

  function badge(text, kind) {
    return el('span', { class: 'cso-mod-badge cso-mod-badge-' + (kind || 'info'), text: text });
  }

  function moduleMeta(folderId, moduleId) {
    var title = moduleId;
    var folderTitle = folderId;
    if (window.CSOStudio && typeof window.CSOStudio.getSchema === 'function') {
      var schema = window.CSOStudio.getSchema();
      if (schema && Array.isArray(schema.folders)) {
        var f = schema.folders.find(function (x) { return x.id === folderId; });
        if (f) {
          folderTitle = f.title;
          var m = f.modules.find(function (y) { return y.id === moduleId; });
          if (m) title = m.title;
        }
      }
    }
    return { folderTitle: folderTitle, title: title };
  }

  function renderBanner(shell, title, subtitle, buttons) {
    var toolbar = el('div', { class: 'cso-mod-toolbar' }, buttons || []);
    shell.appendChild(el('div', { class: 'cso-mod-banner' }, [
      el('div', {}, [
        el('h2', { class: 'cso-mod-banner-title', text: title }),
        el('p', { class: 'cso-mod-banner-sub', text: subtitle })
      ]),
      toolbar
    ]));
  }

  function safeTable(headers, rows) {
    var thead = el('thead', {}, el('tr', {}, headers.map(function (h) { return el('th', { text: h }); })));
    var tbody = el('tbody', {}, rows.length ? rows : [
      el('tr', {}, el('td', { colspan: String(headers.length), text: 'No live records found.' }))
    ]);
    return el('div', { class: 'cso-mod-table-wrap' }, el('table', { class: 'cso-mod-table' }, [thead, tbody]));
  }

  /* =========================================================================
     FOLDER 01: DASHBOARD & COMMAND CENTRE
     ========================================================================= */
  function renderLiveSiteStatus(root, actions) {
    addHeaderPill(actions, '● Live Edge Prober');
    var shell = el('div', { class: 'cso-mod-shell' });
    var tableHost = el('div', {});
    var endpoints = [
      { label: 'Public Homepage', path: '/' },
      { label: 'Jobs & Careers Hub', path: '/jobs-careers/' },
      { label: 'Student Dashboard', path: '/student-dashboard/' },
      { label: 'Current Affairs API', path: '/api/content/current-affairs' },
      { label: 'XML Sitemap', path: '/sitemap.xml' },
      { label: 'RSS Feed', path: '/feed.xml' },
      { label: 'Site Manifest', path: '/admin/site-manifest.json' },
      { label: 'Admin Stats (D1)', path: '/api/admin/stats' }
    ];

    async function runProbe() {
      clear(tableHost);
      tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Probing live edge endpoints…' }));
      var rows = await Promise.all(endpoints.map(async function (ep) {
        var t0 = performance.now();
        try {
          var r = await fetch(ep.path, { credentials: 'same-origin', cache: 'no-store' });
          var ms = Math.round(performance.now() - t0);
          return el('tr', {}, [
            el('td', { text: ep.label }),
            el('td', { text: ep.path }),
            el('td', {}, badge(String(r.status), r.ok ? 'ok' : 'err')),
            el('td', { text: ms + ' ms' }),
            el('td', {}, el('a', { href: ep.path, target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Open ↗' }))
          ]);
        } catch (e) {
          return el('tr', {}, [
            el('td', { text: ep.label }),
            el('td', { text: ep.path }),
            el('td', {}, badge('ERR', 'err')),
            el('td', { text: '—' }),
            el('td', { text: e.message })
          ]);
        }
      }));
      clear(tableHost);
      tableHost.appendChild(safeTable(['Endpoint', 'Path', 'HTTP', 'Latency', 'Inspect'], rows));
    }

    renderBanner(shell, 'Live Site & Edge Status', 'Real-time HTTP & latency diagnostics across public pages, XML feeds, and D1 APIs.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Re-Run Edge Probe', onclick: runProbe })
    ]);
    shell.appendChild(tableHost);
    root.appendChild(shell);
    runProbe();
  }

  function renderQuickActions(root, actions) {
    addHeaderPill(actions, '● Live Commands');
    var shell = el('div', { class: 'cso-mod-shell' });
    renderBanner(shell, 'Command Quick Actions', 'Launch live D1/R2 workflows, run maintenance, or publish urgent site-wide alerts.');
    var grid = el('div', { class: 'cso-mod-grid-3' });
    var cards = [
      { title: 'New Job Alert', desc: 'Publish a recruitment notification to D1 & Jobs Directory.', btn: 'Create Job', fn: function () { window.CSOStudio && window.CSOStudio.openRoute('jobs/new'); } },
      { title: 'New Current Affairs', desc: 'Author daily Odisha & national updates with Markdown preview.', btn: 'Create Post', fn: function () { window.CSOStudio && window.CSOStudio.openRoute('current-affairs/new'); } },
      { title: 'New Mock Test', desc: 'Build a timed CBT exam with negative marking & questions.', btn: 'Create Exam', fn: function () { window.CSOStudio && window.CSOStudio.openRoute('mock-tests/new'); } },
      { title: 'Upload Syllabus / PYQ', desc: 'Upload official PDFs directly to Cloudflare R2.', btn: 'Upload PDF', fn: function () { window.CSOStudio && window.CSOStudio.openRoute('syllabus'); } },
      { title: 'Homepage Broadcast', desc: 'Configure or deactivate the live top announcement bar.', btn: 'Open Banner', fn: function () { window.CSOStudio && window.CSOStudio.openRoute('banner'); } },
      {
        title: 'Run D1 Maintenance',
        desc: 'Trigger lifecycle expiry & scheduled publication sweep.',
        btn: 'Run Maintenance',
        fn: async function () {
          try {
            var res = await api('POST', 'maintenance/run');
            toast('Maintenance complete: ' + JSON.stringify(res.expired_jobs || 0) + ' expired', 'success');
          } catch (e) {
            toast('Maintenance failed: ' + e.message, 'crimson');
          }
        }
      }
    ];
    cards.forEach(function (c) {
      grid.appendChild(el('div', { class: 'cso-mod-card' }, [
        el('h3', { text: c.title }),
        el('p', { class: 'cso-mod-muted', text: c.desc }),
        el('div', {}, el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: c.btn, onclick: c.fn }))
      ]));
    });
    shell.appendChild(grid);
    root.appendChild(shell);
  }

  function renderPendingApprovals(root, actions) {
    addHeaderPill(actions, '● Live D1 Queue');
    var shell = el('div', { class: 'cso-mod-shell' });
    var listHost = el('div', {});

    async function loadQueue() {
      clear(listHost);
      listHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Loading draft & scheduled items from D1…' }));
      try {
        var [ca, jobs, tests] = await Promise.all([
          api('GET', 'current-affairs?limit=50'),
          api('GET', 'jobs?limit=50'),
          api('GET', 'mock-tests?limit=50')
        ]);
        var items = [];
        (ca.items || []).forEach(function (x) { if (x.status !== 'published') items.push({ kind: 'current-affairs', label: 'Current Affairs', item: x }); });
        (jobs.items || []).forEach(function (x) { if (x.status !== 'published') items.push({ kind: 'jobs', label: 'Job Alert', item: x }); });
        (tests.items || []).forEach(function (x) { if (x.status !== 'published') items.push({ kind: 'mock-tests', label: 'Mock Test', item: x }); });

        var rows = items.map(function (entry) {
          var it = entry.item;
          return el('tr', {}, [
            el('td', {}, badge(entry.label, 'info')),
            el('td', { text: it.title || it.slug || it.id }),
            el('td', {}, badge(it.status || 'draft', it.status === 'scheduled' ? 'warn' : 'info')),
            el('td', { text: it.updated_at || '—' }),
            el('td', {}, el('button', {
              type: 'button',
              class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm',
              text: 'Approve & Publish',
              onclick: async function () {
                try {
                  await api('POST', entry.kind + '/' + encodeURIComponent(it.id) + '/status', { status: 'published' });
                  toast('Published: ' + (it.title || it.id), 'success');
                  loadQueue();
                } catch (e) {
                  toast(e.message, 'crimson');
                }
              }
            }))
          ]);
        });
        clear(listHost);
        listHost.appendChild(safeTable(['Type', 'Title', 'Status', 'Updated', 'Action'], rows));
      } catch (e) {
        clear(listHost);
        listHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Error loading queue: ' + e.message }));
      }
    }

    renderBanner(shell, 'Pending Approvals & Moderation Queue', 'Live D1 drafts and scheduled items awaiting publication.', [
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh Queue', onclick: loadQueue })
    ]);
    shell.appendChild(listHost);
    root.appendChild(shell);
    loadQueue();
  }

  function renderWebsiteAnalytics(root, actions) {
    addHeaderPill(actions, '● Live D1 Telemetry');
    var shell = el('div', { class: 'cso-mod-shell' });
    var bodyHost = el('div', { class: 'cso-mod-shell' });

    async function loadAnalytics() {
      clear(bodyHost);
      try {
        var stats = await api('GET', 'stats');
        var kpis = el('div', { class: 'cso-mod-grid-4' }, [
          kpiBox(String((stats.current_affairs && stats.current_affairs.live) || 0), 'Live Current Affairs'),
          kpiBox(String((stats.jobs && stats.jobs.live) || 0), 'Active Job Alerts'),
          kpiBox(String((stats.mock_tests && stats.mock_tests.live) || 0), 'Published Mock Tests'),
          kpiBox(String(stats.scheduled_pending || 0), 'Scheduled Pending')
        ]);
        bodyHost.appendChild(kpis);

        if (window.CSOCharts) {
          var chartCard = el('div', { class: 'cso-mod-grid-2' });
          var barWrap = el('div', { class: 'cso-mod-card' }, [el('h3', { text: 'Live Content Distribution (D1)' })]);
          var barMount = el('div', {});
          barWrap.appendChild(barMount);
          if (typeof window.CSOCharts.renderBarChart === 'function') {
            window.CSOCharts.renderBarChart(barMount, [
              { label: 'CA Live', value: (stats.current_affairs && stats.current_affairs.live) || 0 },
              { label: 'CA Total', value: (stats.current_affairs && stats.current_affairs.total) || 0 },
              { label: 'Jobs Live', value: (stats.jobs && stats.jobs.live) || 0 },
              { label: 'Jobs Exp', value: (stats.jobs && stats.jobs.expired) || 0 },
              { label: 'Mocks Live', value: (stats.mock_tests && stats.mock_tests.live) || 0 }
            ]);
          }
          chartCard.appendChild(barWrap);

          var donutWrap = el('div', { class: 'cso-mod-card' }, [el('h3', { text: 'Recent Audit Events' })]);
          var auditRows = (stats.recent_audit || []).slice(0, 6).map(function (a) {
            return el('tr', {}, [
              el('td', { text: a.action }),
              el('td', { text: a.actor_email || 'system' }),
              el('td', { text: a.created_at || '—' })
            ]);
          });
          donutWrap.appendChild(safeTable(['Action', 'Actor', 'Timestamp'], auditRows));
          chartCard.appendChild(donutWrap);
          bodyHost.appendChild(chartCard);
        }
      } catch (e) {
        bodyHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Failed to load live stats: ' + e.message }));
      }
    }

    renderBanner(shell, 'Website Analytics & D1 Telemetry', 'Zero-cookie live D1 metrics and audit telemetry.', [
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh Metrics', onclick: loadAnalytics })
    ]);
    shell.appendChild(bodyHost);
    root.appendChild(shell);
    loadAnalytics();
  }

  function renderMasterRegistry(root, actions) {
    addHeaderPill(actions, '● 23 Folders · Live Schema');
    var shell = el('div', { class: 'cso-mod-shell' });
    var searchInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Search module ID, title, or folder…' });
    var tableHost = el('div', {});

    async function init() {
      var nav = await fetchNav();
      var allRows = [];
      (nav.folders || []).forEach(function (f) {
        (f.modules || []).forEach(function (m) {
          allRows.push({ folderId: f.id, folderTitle: f.title, id: m.id, title: m.title });
        });
      });

      function draw() {
        var q = searchInp.value.toLowerCase().trim();
        var filtered = allRows.filter(function (r) {
          return !q || r.id.toLowerCase().includes(q) || r.title.toLowerCase().includes(q) || r.folderTitle.toLowerCase().includes(q);
        });
        var rows = filtered.slice(0, 120).map(function (r) {
          return el('tr', {}, [
            el('td', { text: r.id }),
            el('td', { text: r.title }),
            el('td', { text: r.folderTitle }),
            el('td', {}, badge('Restored', 'ok')),
            el('td', {}, el('button', {
              type: 'button',
              class: 'cso-mod-btn cso-mod-btn-sm',
              text: 'Open Module',
              onclick: function () { if (window.selectModule) window.selectModule(r.folderId, r.id); }
            }))
          ]);
        });
        clear(tableHost);
        tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Showing ' + rows.length + ' of ' + filtered.length + ' matching modules (' + allRows.length + ' total).' }));
        tableHost.appendChild(safeTable(['Module ID', 'Title', 'Folder', 'Status', 'Launch'], rows));
      }

      searchInp.addEventListener('input', draw);
      draw();
    }

    renderBanner(shell, 'Master Feature Registry', 'Complete inventory of all 23 sidebar folders and restored modules.');
    shell.appendChild(el('div', { class: 'cso-mod-card' }, [searchInp, tableHost]));
    root.appendChild(shell);
    init().catch(function (e) { toast(e.message, 'crimson'); });
  }

  /* =========================================================================
     FOLDER 02: WEBSITE PAGES & BUILDER (module-02-001..011)
     ========================================================================= */
  function renderVisualPageBuilder(root, actions) {
    addHeaderPill(actions, '● Interactive Builder');
    var shell = el('div', { class: 'cso-mod-shell' });
    var viewport = 'desktop';
    var blocks = [
      { id: 'b1', type: 'Hero Banner', heading: 'Odisha Government Jobs & Exam Portal', body: 'Verified recruitment alerts, syllabus PDFs, and CBT mock tests.', ctaText: 'Explore Jobs', ctaUrl: '/jobs-careers/' },
      { id: 'b2', type: 'Exam Alert Card', heading: 'OSSC CGLRE 2026 — Important Dates', body: 'Check official notification, eligibility, and hall ticket schedule.', ctaText: 'View Schedule', ctaUrl: '/jobs-careers/' },
      { id: 'b3', type: 'CTA Strip', heading: 'Start Free CBT Mock Tests', body: 'Practice bilingual Odia & English papers with instant explanations.', ctaText: 'Launch Tests', ctaUrl: '/student-dashboard/' }
    ];

    var pageSelect = el('select', { class: 'cso-mod-select' }, [el('option', { value: 'NEW_PAGE', text: '+ Blank Document Canvas' })]);
    var canvasEl = el('div', { class: 'cso-builder-viewport-desktop' });
    var propHost = el('div', { class: 'cso-mod-card' }, [el('h4', { text: 'Block Inspector' }), el('p', { class: 'cso-mod-muted', text: 'Select or add a block to edit its content.' })]);
    var selectedIdx = 0;

    function setViewport(vp) {
      viewport = vp;
      canvasEl.className = 'cso-builder-viewport-' + vp;
    }

    function exportHtml() {
      var html = blocks.map(function (b) {
        return '<section class="cso-section"><h2>' + b.heading + '</h2><p>' + b.body + '</p>' +
          (b.ctaText ? '<a href="' + (b.ctaUrl || '/') + '">' + b.ctaText + '</a>' : '') + '</section>';
      }).join('\n');
      downloadFile('page-builder-export.html', '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Exported Page</title></head><body>\n' + html + '\n</body></html>', 'text/html');
      toast('Exported clean HTML page', 'success');
    }

    function renderInspector() {
      clear(propHost);
      propHost.appendChild(el('h4', { text: 'Block Inspector' }));
      var b = blocks[selectedIdx];
      if (!b) {
        propHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'No block selected.' }));
        return;
      }
      var hInp = el('input', { type: 'text', class: 'cso-mod-input', value: b.heading });
      var bodyInp = el('textarea', { class: 'cso-mod-textarea', text: b.body });
      bodyInp.value = b.body;
      var ctaInp = el('input', { type: 'text', class: 'cso-mod-input', value: b.ctaText || '' });
      var urlInp = el('input', { type: 'text', class: 'cso-mod-input', value: b.ctaUrl || '' });

      hInp.addEventListener('input', function () { b.heading = hInp.value; renderCanvas(); });
      bodyInp.addEventListener('input', function () { b.body = bodyInp.value; renderCanvas(); });
      ctaInp.addEventListener('input', function () { b.ctaText = ctaInp.value; renderCanvas(); });
      urlInp.addEventListener('input', function () { b.ctaUrl = urlInp.value; renderCanvas(); });

      propHost.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Block Type: ' + b.type })]));
      propHost.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Heading' }), hInp]));
      propHost.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Body Copy' }), bodyInp]));
      propHost.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'CTA Label' }), ctaInp]));
      propHost.appendChild(el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'CTA URL' }), urlInp]));
    }

    function renderCanvas() {
      clear(canvasEl);
      blocks.forEach(function (b, idx) {
        var blk = el('div', { class: 'cso-builder-block' }, [
          el('div', { class: 'cso-builder-block-head' }, [
            badge((idx + 1) + '. ' + b.type, idx === selectedIdx ? 'ok' : 'info'),
            el('div', { class: 'cso-mod-toolbar' }, [
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Edit', onclick: function () { selectedIdx = idx; renderInspector(); renderCanvas(); } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '↑', onclick: function () { if (idx > 0) { var t = blocks[idx - 1]; blocks[idx - 1] = blocks[idx]; blocks[idx] = t; selectedIdx = idx - 1; renderCanvas(); renderInspector(); } } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '↓', onclick: function () { if (idx < blocks.length - 1) { var t = blocks[idx + 1]; blocks[idx + 1] = blocks[idx]; blocks[idx] = t; selectedIdx = idx + 1; renderCanvas(); renderInspector(); } } }),
              el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-danger cso-mod-btn-sm', text: '✕', onclick: function () { blocks.splice(idx, 1); selectedIdx = Math.max(0, selectedIdx - 1); renderCanvas(); renderInspector(); } })
            ])
          ]),
          el('h4', { text: b.heading }),
          el('p', { class: 'cso-mod-muted', text: b.body }),
          b.ctaText ? el('span', { class: 'cso-mod-badge cso-mod-badge-info', text: b.ctaText + ' → ' + (b.ctaUrl || '/') }) : null
        ]);
        canvasEl.appendChild(blk);
      });
    }

    var paletteTypes = ['Hero Banner', 'Exam Alert Card', 'Two-Column Feature', 'FAQ Accordion', 'Official Notice Box', 'CTA Strip'];
    var paletteCard = el('div', { class: 'cso-mod-card' }, [
      el('h4', { text: 'Block Palette' }),
      el('p', { class: 'cso-mod-muted', text: 'Click to append a section block:' })
    ]);
    paletteTypes.forEach(function (pt) {
      paletteCard.appendChild(el('button', {
        type: 'button',
        class: 'cso-mod-btn',
        text: '+ ' + pt,
        onclick: function () {
          blocks.push({ id: 'b-' + Date.now(), type: pt, heading: pt + ' Heading', body: 'Edit this section content in the Block Inspector.', ctaText: 'Learn More', ctaUrl: '/' });
          selectedIdx = blocks.length - 1;
          renderCanvas();
          renderInspector();
        }
      }));
    });

    renderBanner(shell, 'Visual Page Builder', 'Responsive block-based page composer with Desktop / Tablet / Mobile viewport preview.', [
      pageSelect,
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Desktop', onclick: function () { setViewport('desktop'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '768px', onclick: function () { setViewport('tablet'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: '375px', onclick: function () { setViewport('mobile'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm', text: 'Export HTML', onclick: exportHtml }),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Export JSON', onclick: function () { downloadFile('page-layout.json', JSON.stringify(blocks, null, 2)); } })
    ]);

    shell.appendChild(el('div', { class: 'cso-builder-split' }, [
      el('div', { class: 'cso-mod-shell' }, [paletteCard, propHost]),
      el('div', { class: 'cso-builder-canvas-wrap' }, [canvasEl])
    ]));

    root.appendChild(shell);
    renderCanvas();
    renderInspector();

    fetchManifest().then(function (m) {
      (m.pages || m.routes || []).forEach(function (p) {
        var val = p.route || p.path || p.url || p.file || p.title;
        pageSelect.appendChild(el('option', { value: val, text: (p.title || val) + ' (' + val + ')' }));
      });
    }).catch(function () {});
  }

  function renderCreatePageWizard(root, actions) {
    addHeaderPill(actions, '● Page Provisioner');
    var shell = el('div', { class: 'cso-mod-shell' });
    var titleInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'e.g. OPSC OAS 2026 Complete Guide' });
    var slugInp = el('input', { type: 'text', class: 'cso-mod-input', placeholder: '/opsc-oas-2026/' });
    var tplSel = el('select', { class: 'cso-mod-select' }, [
      el('option', { value: 'exam-guide', text: 'Exam Guide & Syllabus' }),
      el('option', { value: 'recruitment', text: 'Recruitment Alert Page' }),
      el('option', { value: 'scheme', text: 'Government Scheme Page' }),
      el('option', { value: 'legal', text: 'Information & Legal Page' })
    ]);
    var mdInp = el('textarea', { class: 'cso-mod-textarea cso-mod-textarea-tall', placeholder: '# Page Heading\n\nWrite Markdown content here…' });
    mdInp.value = '# New Page Title\n\n- Official Notification Summary\n- Important Dates & Eligibility\n- Direct Portal Links';
    var prevBox = el('div', { class: 'cso-live-preview-box' });

    async function updatePreview() {
      try {
        var res = await api('POST', 'preview', { markdown: mdInp.value });
        renderSanitizedHtml(prevBox, res.html || '');
      } catch (e) {
        prevBox.textContent = mdInp.value;
      }
    }

    titleInp.addEventListener('input', function () {
      if (!slugInp.dataset.touched) {
        slugInp.value = '/' + titleInp.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '/';
      }
    });
    slugInp.addEventListener('input', function () { slugInp.dataset.touched = '1'; });

    renderBanner(shell, 'Create New Page Provisioning Wizard', 'Author a new static/editorial page with live D1 Markdown sanitization and HTML export.', [
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Preview Markdown', onclick: updatePreview }),
      el('button', {
        type: 'button',
        class: 'cso-mod-btn cso-mod-btn-primary',
        text: 'Export HTML File',
        onclick: function () {
          var doc = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>' + (titleInp.value || 'CS Odisha') + '</title></head><body><main>' + prevBox.textContent + '</main></body></html>';
          downloadFile((slugInp.value.replace(/\//g, '') || 'new-page') + '.html', doc, 'text/html');
          toast('Exported page HTML', 'success');
        }
      })
    ]);

    shell.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
      el('div', { class: 'cso-mod-card' }, [
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Page Title' }), titleInp]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Target Route / Slug' }), slugInp]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Page Template' }), tplSel]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Markdown Body' }), mdInp])
      ]),
      el('div', { class: 'cso-mod-card' }, [
        el('h3', { text: 'Live Sanitized Preview' }),
        prevBox
      ])
    ]));
    root.appendChild(shell);
    updatePreview();
  }

  function renderFolder02(folderId, moduleId, root, actions) {
    if (moduleId === 'module-02-001') {
      addHeaderPill(actions, '● Site Manifest + CMS');
      var shell = el('div', { class: 'cso-mod-shell' });
      var host = el('div', {});
      renderBanner(shell, 'All Website Pages', 'Live inventory from /admin/site-manifest.json plus D1 CMS pages.', [
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Open Visual Builder', onclick: function () { window.selectModule && window.selectModule('folder-02', 'module-02-003'); } })
      ]);
      shell.appendChild(host);
      root.appendChild(shell);
      fetchManifest().then(function (m) {
        var pages = m.pages || m.routes || [];
        var rows = pages.map(function (p) {
          var path = typeof p === 'string' ? p : (p.route || p.path || p.url || '/');
          var title = typeof p === 'string' ? p : (p.title || path);
          return el('tr', {}, [
            el('td', { text: title }),
            el('td', { text: path }),
            el('td', {}, badge('Live', 'ok')),
            el('td', {}, el('a', { href: path, target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Preview ↗' }))
          ]);
        });
        host.appendChild(safeTable(['Title', 'Route', 'Status', 'Open'], rows));
      }).catch(function (e) { host.appendChild(el('p', { class: 'cso-mod-muted', text: e.message })); });
      mountCms(root, 'pages', [['pages', 'All Pages'], ['pages/legal', 'Info & Legal'], ['banner', 'Homepage & Banner']]);
      return true;
    }
    if (moduleId === 'module-02-002') { renderCreatePageWizard(root, actions); return true; }
    if (moduleId === 'module-02-003') { renderVisualPageBuilder(root, actions); return true; }
    if (moduleId === 'module-02-004') {
      addHeaderPill(actions, '● Live Banner & Hero');
      mountCms(root, 'banner', [['banner', 'Homepage & Banner'], ['pages', 'All Pages']]);
      return true;
    }
    if (moduleId === 'module-02-005' || moduleId === 'module-02-006' || moduleId === 'module-02-007') {
      var kindMap = {
        'module-02-005': { title: 'Campaign Landing Pages', sub: 'Create UTM-tagged recruitment & exam campaign landing pages.', items: ['OSSC CGL 2026 Campaign', 'OPSC OAS Prelims Hub', 'B.Ed Entrance Crash Course', 'Odisha Scholarship Portal'] },
        'module-02-006': { title: 'Page Templates Gallery', sub: 'Reusable structural blueprints ready to load into the Visual Page Builder.', items: ['Recruitment Notification Blueprint', 'Government Scheme Guide Blueprint', 'Study Library Resource Hub', 'Legal & Policy Document'] },
        'module-02-007': { title: 'Reusable Sections Library', sub: 'Modular sections (Header, Footer, Exam Callout, Admit Card Box, Alert CTA).', items: ['Urgent Exam Deadline Callout', 'Official Commission Link Box', 'Bilingual Study PDF Card', 'Candidate Support CTA'] }
      };
      var info = kindMap[moduleId];
      addHeaderPill(actions, '● Studio Library');
      var shell2 = el('div', { class: 'cso-mod-shell' });
      renderBanner(shell2, info.title, info.sub, [
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Open Visual Page Builder', onclick: function () { window.selectModule && window.selectModule('folder-02', 'module-02-003'); } })
      ]);
      var grid = el('div', { class: 'cso-mod-grid-2' });
      info.items.forEach(function (name) {
        grid.appendChild(el('div', { class: 'cso-mod-card' }, [
          el('h3', { text: name }),
          el('p', { class: 'cso-mod-muted', text: 'Responsive, strict-CSP compliant component ready for export or Visual Builder.' }),
          el('div', { class: 'cso-mod-toolbar' }, [
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Use in Builder', onclick: function () { window.selectModule && window.selectModule('folder-02', 'module-02-003'); } }),
            el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Export JSON', onclick: function () { downloadFile(name.toLowerCase().replace(/\s+/g, '-') + '.json', JSON.stringify({ name: name, moduleId: moduleId }, null, 2)); } })
          ])
        ]));
      });
      shell2.appendChild(grid);
      root.appendChild(shell2);
      return true;
    }
    if (moduleId === 'module-02-008') {
      addHeaderPill(actions, '● Audit Revisions');
      mountCms(root, 'audit', [['audit', 'All Events'], ['pages', 'All Pages']]);
      return true;
    }
    if (moduleId === 'module-02-009' || moduleId === 'module-02-010') {
      renderPendingApprovals(root, actions);
      return true;
    }
    if (moduleId === 'module-02-011') {
      addHeaderPill(actions, '● Recovery & Maintenance');
      mountCms(root, 'operations', [['operations', 'Operations & Backups'], ['diagnostics', 'Site Health']]);
      return true;
    }
    return false;
  }

  /* =========================================================================
     FOLDER 03: WEBSITE INFORMATION & LEGAL (module-03-001..016)
     ========================================================================= */
  var LEGAL_PAGES = {
    'module-03-001': { title: 'About Us', path: '/about.html', email: 'editorial@csodisha.com' },
    'module-03-002': { title: 'Contact Us', path: '/contact.html', email: 'support@csodisha.com' },
    'module-03-003': { title: 'Privacy Policy', path: '/privacy.html', email: 'privacy@csodisha.com' },
    'module-03-004': { title: 'Disclaimer', path: '/disclaimer.html', email: 'legal@csodisha.com' },
    'module-03-005': { title: 'Terms & Conditions', path: '/terms.html', email: 'legal@csodisha.com' },
    'module-03-006': { title: 'Cookie Policy', path: '/cookies.html', email: 'privacy@csodisha.com' },
    'module-03-007': { title: 'Copyright & DMCA', path: '/copyright.html', email: 'dmca@csodisha.com' },
    'module-03-008': { title: 'Editorial Policy', path: '/editorial-policy.html', email: 'editorial@csodisha.com' },
    'module-03-009': { title: 'Corrections Policy', path: '/corrections.html', email: 'editorial@csodisha.com' },
    'module-03-010': { title: 'Accessibility Statement', path: '/accessibility.html', email: 'accessibility@csodisha.com' },
    'module-03-011': { title: 'Refund & Cancellation Policy', path: '/refund.html', email: 'billing@csodisha.com' },
    'module-03-012': { title: 'Digital Delivery Policy', path: '/delivery.html', email: 'support@csodisha.com' },
    'module-03-013': { title: 'Community Guidelines', path: '/community-guidelines.html', email: 'community@csodisha.com' },
    'module-03-014': { title: 'Frequently Asked Questions', path: '/faq.html', email: 'support@csodisha.com' },
    'module-03-015': { title: 'Custom Information Pages', path: '/about.html', email: 'editorial@csodisha.com' },
    'module-03-016': { title: 'Legal Page Revision History', path: '/privacy.html', email: 'legal@csodisha.com' }
  };

  function renderLegalStudio(moduleId, root, actions) {
    if (moduleId === 'module-03-016') {
      addHeaderPill(actions, '● Legal Audit Trail');
      mountCms(root, 'audit', [['audit', 'All Events'], ['pages/legal', 'Info & Legal']]);
      return true;
    }
    var cfg = LEGAL_PAGES[moduleId] || { title: 'Legal Document', path: '/privacy.html', email: 'legal@csodisha.com' };
    addHeaderPill(actions, '● Legal & Info Studio');

    var state = {
      title: cfg.title,
      publicPath: cfg.path,
      effectiveDate: '2026-01-01',
      contactEmail: cfg.email,
      markdown: '## ' + cfg.title + '\n\nCommon Sense Odisha (csodisha.com) maintains transparent editorial and DPDP-aligned standards.\n\n### Key Commitments\n- Verified official notifications only\n- Zero unauthorized tracking cookies\n- Direct contact: ' + cfg.email
    };

    var shell = el('div', { class: 'cso-mod-shell' });
    var titleInp = el('input', { type: 'text', class: 'cso-mod-input', value: state.title });
    var dateInp = el('input', { type: 'date', class: 'cso-mod-input', value: state.effectiveDate });
    var emailInp = el('input', { type: 'email', class: 'cso-mod-input', value: state.contactEmail });
    var mdInp = el('textarea', { class: 'cso-mod-textarea cso-mod-textarea-tall' });
    mdInp.value = state.markdown;
    var jsonArea = el('textarea', { class: 'cso-mod-textarea cso-hidden' });
    var previewBox = el('div', { class: 'cso-live-preview-box' });

    function syncFromInputs() {
      state.title = titleInp.value;
      state.effectiveDate = dateInp.value;
      state.contactEmail = emailInp.value;
      state.markdown = mdInp.value;
      jsonArea.value = JSON.stringify(state, null, 2);
    }

    async function updatePreview() {
      syncFromInputs();
      try {
        var r = await api('POST', 'preview', { markdown: state.markdown });
        renderSanitizedHtml(previewBox, r.html || '');
      } catch (_) {
        previewBox.textContent = state.markdown;
      }
    }

    renderBanner(shell, cfg.title + ' Studio', 'Author, preview, and export structured configuration for ' + cfg.path + '.', [
      el('a', { href: cfg.path, target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn', text: 'Preview Live Page ↗' }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Raw JSON', onclick: function () { syncFromInputs(); jsonArea.classList.toggle('cso-hidden'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Export Config', onclick: function () { syncFromInputs(); downloadFile(moduleId + '-config.json', JSON.stringify(state, null, 2)); } }),
      el('button', {
        type: 'button',
        class: 'cso-mod-btn',
        text: 'Import Config',
        onclick: function () {
          pickJsonFile(function (d) {
            if (d.title) titleInp.value = d.title;
            if (d.effectiveDate) dateInp.value = d.effectiveDate;
            if (d.contactEmail) emailInp.value = d.contactEmail;
            if (d.markdown) mdInp.value = d.markdown;
            updatePreview();
          });
        }
      }),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Render Preview', onclick: updatePreview })
    ]);

    shell.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
      el('div', { class: 'cso-mod-card' }, [
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Document Title' }), titleInp]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Effective Date' }), dateInp]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Contact Email' }), emailInp]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Markdown Content' }), mdInp]),
        jsonArea
      ]),
      el('div', { class: 'cso-mod-card' }, [
        el('h3', { text: 'Live Sanitized Document Preview' }),
        previewBox
      ])
    ]));
    root.appendChild(shell);
    updatePreview();
    return true;
  }

  /* =========================================================================
     FOLDER 04: CONTENT & PUBLISHING (module-04-001..014)
     ========================================================================= */
  function renderFolder04(moduleId, root, actions) {
    if (moduleId === 'module-04-007' || moduleId === 'module-04-008') {
      addHeaderPill(actions, '● Live D1 Taxonomy');
      var shell = el('div', { class: 'cso-mod-shell' });
      var host = el('div', {});
      renderBanner(shell, moduleId === 'module-04-007' ? 'Content Categories (Live D1)' : 'Tags & Topic Distribution (Live D1)', 'Computed directly from live Current Affairs and Job Alert records in D1.');
      shell.appendChild(host);
      root.appendChild(shell);
      Promise.all([api('GET', 'current-affairs?limit=100'), api('GET', 'jobs?limit=100')]).then(function (res) {
        var counts = {};
        var isTags = moduleId === 'module-04-008';
        [].concat(res[0].items || [], res[1].items || []).forEach(function (item) {
          if (isTags) {
            String(item.tags || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
          } else {
            var c = item.category || 'Uncategorized';
            counts[c] = (counts[c] || 0) + 1;
          }
        });
        var rows = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).map(function (k) {
          return el('tr', {}, [el('td', { text: k }), el('td', {}, badge(String(counts[k]) + ' items', 'info'))]);
        });
        host.appendChild(safeTable([isTags ? 'Tag' : 'Category', 'Live Count'], rows));
      }).catch(function (e) { host.appendChild(el('p', { class: 'cso-mod-muted', text: e.message })); });
      return true;
    }

    if (moduleId === 'module-04-009') {
      addHeaderPill(actions, '● Live Editorial Calendar');
      var shell2 = el('div', { class: 'cso-mod-shell' });
      var grid = el('div', { class: 'cso-cal-grid' });
      renderBanner(shell2, 'Editorial & Deadline Calendar', 'Upcoming scheduled posts and recruitment deadlines from D1.');
      shell2.appendChild(grid);
      root.appendChild(shell2);
      Promise.all([api('GET', 'current-affairs?limit=50'), api('GET', 'jobs?limit=50')]).then(function (res) {
        var events = [];
        (res[0].items || []).forEach(function (x) { events.push({ date: x.published_at || x.updated_at, title: x.title, type: 'Current Affairs', status: x.status }); });
        (res[1].items || []).forEach(function (x) { events.push({ date: x.deadline || x.published_at || x.updated_at, title: x.title, type: 'Job Deadline', status: x.status }); });
        events.sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
        if (!events.length) { grid.appendChild(el('p', { class: 'cso-mod-muted', text: 'No scheduled or dated items in D1 yet.' })); return; }
        events.slice(0, 24).forEach(function (ev) {
          grid.appendChild(el('div', { class: 'cso-cal-cell' }, [
            badge(ev.type, ev.type === 'Job Deadline' ? 'warn' : 'info'),
            el('strong', { text: ev.title }),
            el('span', { class: 'cso-mod-muted', text: (ev.date || 'Unscheduled').slice(0, 16) })
          ]));
        });
      }).catch(function (e) { grid.appendChild(el('p', { class: 'cso-mod-muted', text: e.message })); });
      return true;
    }

    if (moduleId === 'module-04-010' || moduleId === 'module-04-011' || moduleId === 'module-04-012') {
      renderPendingApprovals(root, actions);
      return true;
    }

    if (moduleId === 'module-04-014') {
      addHeaderPill(actions, '● Bulk D1 Operations');
      var shell3 = el('div', { class: 'cso-mod-shell' });
      var host3 = el('div', {});
      var selected = new Set();
      var allItems = [];

      async function loadBulk() {
        clear(host3);
        var res = await api('GET', 'current-affairs?limit=100');
        allItems = res.items || [];
        var rows = allItems.map(function (it) {
          var chk = el('input', { type: 'checkbox' });
          chk.addEventListener('change', function () { if (chk.checked) selected.add(it.id); else selected.delete(it.id); });
          return el('tr', {}, [
            el('td', {}, chk),
            el('td', { text: it.title }),
            el('td', { text: it.category || '—' }),
            el('td', {}, badge(it.status, it.status === 'published' ? 'ok' : 'warn'))
          ]);
        });
        host3.appendChild(safeTable(['Select', 'Title', 'Category', 'Status'], rows));
      }

      async function bulkStatus(nextStatus) {
        if (!selected.size) { toast('Select at least one item', 'amber'); return; }
        for (var id of selected) {
          await api('POST', 'current-affairs/' + encodeURIComponent(id) + '/status', { status: nextStatus });
        }
        toast('Updated ' + selected.size + ' items to ' + nextStatus, 'success');
        selected.clear();
        loadBulk();
      }

      renderBanner(shell3, 'Bulk Content Operations', 'Multi-select live D1 posts to publish, archive, or export JSON.', [
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Bulk Publish', onclick: function () { bulkStatus('published'); } }),
        el('button', { type: 'button', class: 'cso-mod-btn', text: 'Bulk Draft', onclick: function () { bulkStatus('draft'); } }),
        el('button', { type: 'button', class: 'cso-mod-btn', text: 'Export JSON', onclick: function () { downloadFile('current-affairs-export.json', JSON.stringify(allItems, null, 2)); } })
      ]);
      shell3.appendChild(host3);
      root.appendChild(shell3);
      loadBulk().catch(function (e) { toast(e.message, 'crimson'); });
      return true;
    }

    return false;
  }

  /* =========================================================================
     FOLDER 06 & FOLDERS 20-23: NAVIGATION & CATEGORY TREE STUDIOS
     ========================================================================= */
  function renderCategoryTreeStudio(title, subtitle, root, actions) {
    addHeaderPill(actions, '● Live Manifest Tree');
    var shell = el('div', { class: 'cso-mod-shell' });
    var host = el('div', {});
    var nodes = [];

    function draw() {
      clear(host);
      var rows = nodes.map(function (n, idx) {
        return el('tr', {}, [
          el('td', { class: 'cso-tree-depth-' + Math.min(2, n.depth || 0), text: n.title }),
          el('td', { text: n.path || '/' }),
          el('td', {}, el('button', {
            type: 'button',
            class: 'cso-mod-btn cso-mod-btn-sm',
            text: '↑',
            onclick: function () { if (idx > 0) { var t = nodes[idx - 1]; nodes[idx - 1] = nodes[idx]; nodes[idx] = t; draw(); } }
          }))
        ]);
      });
      host.appendChild(safeTable(['Navigation / Category Node', 'Target Route', 'Order'], rows));
    }

    renderBanner(shell, title, subtitle, [
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Export Tree JSON', onclick: function () { downloadFile('navigation-tree.json', JSON.stringify(nodes, null, 2)); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Import Tree JSON', onclick: function () { pickJsonFile(function (d) { if (Array.isArray(d)) { nodes = d; draw(); } }); } })
    ]);
    shell.appendChild(host);
    root.appendChild(shell);

    fetchManifest().then(function (m) {
      var pages = m.pages || m.routes || [];
      nodes = pages.map(function (p, i) {
        var path = typeof p === 'string' ? p : (p.route || p.path || p.url || '/');
        var lbl = typeof p === 'string' ? p : (p.title || path);
        return { title: lbl, path: path, depth: path.split('/').filter(Boolean).length > 1 ? 1 : 0, order: i };
      });
      draw();
    }).catch(function (e) { host.appendChild(el('p', { class: 'cso-mod-muted', text: e.message })); });
    return true;
  }

  /* =========================================================================
     FOLDER 07: FILES, MEDIA & CLOUD (module-07-001..015)
     ========================================================================= */
  function renderFolder07(moduleId, root, actions) {
    if (moduleId === 'module-07-012' || moduleId === 'module-07-013' || moduleId === 'module-07-014') {
      addHeaderPill(actions, '● Live R2 Diagnostics');
      var shell = el('div', { class: 'cso-mod-shell' });
      var host = el('div', {});
      renderBanner(shell, 'R2 Storage & Asset Integrity', 'Computed live from Cloudflare R2 media_assets in D1.');
      shell.appendChild(host);
      root.appendChild(shell);
      api('GET', 'media?limit=200').then(function (d) {
        var items = d.items || [];
        var totalBytes = items.reduce(function (acc, x) { return acc + (Number(x.size_bytes) || 0); }, 0);
        var pdfs = items.filter(function (x) { return String(x.mime_type || '').includes('pdf'); }).length;
        var imgs = items.length - pdfs;
        host.appendChild(el('div', { class: 'cso-mod-grid-3' }, [
          kpiBox(String(items.length), 'Total R2 Objects'),
          kpiBox((totalBytes / (1024 * 1024)).toFixed(2) + ' MB', 'Total Storage Used'),
          kpiBox(pdfs + ' PDF / ' + imgs + ' Img', 'Asset Breakdown')
        ]));
        var rows = items.map(function (it) {
          return el('tr', {}, [
            el('td', { text: it.original_name || it.object_key }),
            el('td', { text: it.mime_type || '—' }),
            el('td', { text: Math.round((Number(it.size_bytes) || 0) / 1024) + ' KB' }),
            el('td', {}, el('a', { href: '/api/media/' + it.object_key, target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Open R2 ↗' }))
          ]);
        });
        host.appendChild(safeTable(['Filename', 'MIME Type', 'Size', 'Link'], rows));
      }).catch(function (e) { host.appendChild(el('p', { class: 'cso-mod-muted', text: e.message })); });
      return true;
    }
    return false;
  }

  /* =========================================================================
     FOLDER 11: COMMUNICATIONS & BROADCASTS
     ========================================================================= */
  function renderCommsStudio(moduleId, root, actions) {
    addHeaderPill(actions, '● Communications & Alerts');
    var shell = el('div', { class: 'cso-mod-shell' });
    var meta = moduleMeta('folder-11', moduleId);
    var tplName = el('input', { type: 'text', class: 'cso-mod-input', value: meta.title });
    var examVar = el('input', { type: 'text', class: 'cso-mod-input', value: 'OSSC CGLRE 2026' });
    var dateVar = el('input', { type: 'text', class: 'cso-mod-input', value: '30 Nov 2026' });
    var msgBody = el('textarea', { class: 'cso-mod-textarea' });
    msgBody.value = 'Dear Candidate, {{exam}} deadline is {{date}}. Download official notice at https://csodisha.com/jobs-careers/';
    var outPre = el('pre', { class: 'cso-code-pre' });

    function interpolate() {
      outPre.textContent = msgBody.value
        .replace(/\{\{exam\}\}/g, examVar.value)
        .replace(/\{\{date\}\}/g, dateVar.value);
    }

    examVar.addEventListener('input', interpolate);
    dateVar.addEventListener('input', interpolate);
    msgBody.addEventListener('input', interpolate);

    renderBanner(shell, meta.title, 'Bilingual candidate notification template composer & live variable interpolator.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Open Live Site Banner', onclick: function () { window.CSOStudio && window.CSOStudio.openRoute('banner'); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Export Template', onclick: function () { downloadFile(moduleId + '-template.json', JSON.stringify({ name: tplName.value, body: msgBody.value }, null, 2)); } })
    ]);

    shell.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
      el('div', { class: 'cso-mod-card' }, [
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Template Name' }), tplName]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: '{{exam}} Variable' }), examVar]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: '{{date}} Variable' }), dateVar]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Message Body' }), msgBody])
      ]),
      el('div', { class: 'cso-mod-card' }, [
        el('h3', { text: 'Interpolated Output Preview' }),
        outPre
      ])
    ]));
    root.appendChild(shell);
    interpolate();
    return true;
  }

  /* =========================================================================
     FOLDER 13: SEO, SEARCH & DISCOVERY
     ========================================================================= */
  function renderSeoStudio(moduleId, root, actions) {
    addHeaderPill(actions, '● Live SEO & Feeds');
    var shell = el('div', { class: 'cso-mod-shell' });
    var meta = moduleMeta('folder-13', moduleId);
    var outPre = el('pre', { class: 'cso-code-pre' });

    if (moduleId === 'module-seo-003' || moduleId === 'module-13-003' || moduleId === 'module-seo-004' || moduleId === 'module-13-004' || moduleId === 'module-seo-005' || moduleId === 'module-13-005') {
      var target = (moduleId.endsWith('004')) ? '/feed.xml' : (moduleId.endsWith('005') ? '/robots.txt' : '/sitemap.xml');
      renderBanner(shell, meta.title, 'Live edge inspector for ' + target, [
        el('a', { href: target, target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Open ' + target + ' ↗' })
      ]);
      shell.appendChild(el('div', { class: 'cso-mod-card' }, [outPre]));
      root.appendChild(shell);
      fetch(target, { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (t) {
        outPre.textContent = t.slice(0, 12000);
      }).catch(function (e) { outPre.textContent = 'Failed to fetch ' + target + ': ' + e.message; });
      return true;
    }

    var titleInp = el('input', { type: 'text', class: 'cso-mod-input', value: 'Common Sense Odisha — Jobs, Syllabus & CBT Mock Tests' });
    var descInp = el('textarea', { class: 'cso-mod-textarea' });
    descInp.value = 'Official Odisha government job alerts, OPSC/OSSC/OSSSC syllabus PDFs, PYQs, and bilingual mock tests.';
    var schemaType = el('select', { class: 'cso-mod-select' }, [
      el('option', { value: 'WebSite', text: 'WebSite / Organization' }),
      el('option', { value: 'Article', text: 'NewsArticle / Current Affairs' }),
      el('option', { value: 'JobPosting', text: 'JobPosting (Recruitment)' }),
      el('option', { value: 'FAQPage', text: 'FAQPage' })
    ]);

    function updateSeo() {
      var schema = {
        '@context': 'https://schema.org',
        '@type': schemaType.value,
        name: titleInp.value,
        description: descInp.value,
        url: 'https://csodisha.com/'
      };
      outPre.textContent = JSON.stringify(schema, null, 2);
    }

    titleInp.addEventListener('input', updateSeo);
    descInp.addEventListener('input', updateSeo);
    schemaType.addEventListener('change', updateSeo);

    renderBanner(shell, meta.title, 'SEO Meta, OpenGraph & JSON-LD Schema Generator connected to live /sitemap.xml and /feed.xml.', [
      el('a', { href: '/sitemap.xml', target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn', text: 'Sitemap ↗' }),
      el('a', { href: '/feed.xml', target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn', text: 'RSS Feed ↗' }),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Export JSON-LD', onclick: function () { downloadFile('schema-ld.json', outPre.textContent); } })
    ]);

    shell.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
      el('div', { class: 'cso-mod-card' }, [
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Schema Type' }), schemaType]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Meta Title' }), titleInp]),
        el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Meta Description' }), descInp])
      ]),
      el('div', { class: 'cso-mod-card' }, [
        el('h3', { text: 'Generated JSON-LD Structured Data' }),
        outPre
      ])
    ]));
    root.appendChild(shell);
    updateSeo();
    return true;
  }

  /* =========================================================================
     UNIVERSAL CONFIG / LIVE STUDIO FALLBACK FOR REMAINING SPECIALIZED MODULES
     (Finance Config, Marketing UTM, Security/RBAC, Operations/DR, Settings)
     ========================================================================= */
  function renderConfigStudio(folderId, moduleId, root, actions) {
    var meta = moduleMeta(folderId, moduleId);
    addHeaderPill(actions, '● Live Studio');
    var shell = el('div', { class: 'cso-mod-shell' });
    var notesArea = el('textarea', { class: 'cso-mod-textarea' });
    var configObj = {
      moduleId: moduleId,
      folder: meta.folderTitle,
      title: meta.title,
      environment: 'Cloudflare Pages + D1 + R2',
      cspMode: "default-src 'self'; script-src 'self'; style-src 'self'",
      timezone: 'Asia/Kolkata',
      updatedAt: new Date().toISOString()
    };
    notesArea.value = JSON.stringify(configObj, null, 2);

    renderBanner(shell, meta.title, meta.folderTitle + ' — Strict-CSP configuration & live D1/R2 inspector.', [
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Export JSON', onclick: function () { downloadFile(moduleId + '.json', notesArea.value); } }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Import JSON', onclick: function () { pickJsonFile(function (d) { notesArea.value = JSON.stringify(d, null, 2); }); } })
    ]);

    var liveStatusCard = el('div', { class: 'cso-mod-card' }, [
      el('h3', { text: 'Live Environment Telemetry' }),
      el('p', { class: 'cso-mod-muted', text: 'Fetching live D1 & maintenance status…' })
    ]);

    shell.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
      el('div', { class: 'cso-mod-card' }, [
        el('h3', { text: 'Module Configuration (JSON)' }),
        notesArea
      ]),
      liveStatusCard
    ]));
    root.appendChild(shell);

    api('GET', 'stats').then(function (s) {
      clear(liveStatusCard);
      liveStatusCard.appendChild(el('h3', { text: 'Live D1 / R2 Status' }));
      liveStatusCard.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
        kpiBox(String((s.current_affairs && s.current_affairs.live) || 0), 'Live Current Affairs'),
        kpiBox(String((s.jobs && s.jobs.live) || 0), 'Live Jobs'),
        kpiBox(String((s.mock_tests && s.mock_tests.live) || 0), 'Live Mock Tests'),
        kpiBox(String(s.scheduled_pending || 0), 'Scheduled Pending')
      ]));
    }).catch(function () {});

    return true;
  }

  /* =========================================================================
     COMMAND CENTRE 1-4: Overview, Edge Telemetry, Launchpad, Audit Timeline
     ========================================================================= */
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svg(tag, attrs, kids) {
    var n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, String(attrs[k])); });
    [].concat(kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function sparkline(values, cls) {
    var w = 120, h = 32, max = Math.max.apply(null, values.concat([1]));
    var step = values.length > 1 ? w / (values.length - 1) : w;
    var pts = values.map(function (v, i) { return (i * step).toFixed(1) + ',' + (h - 3 - (v / max) * (h - 6)).toFixed(1); }).join(' ');
    return svg('svg', { viewBox: '0 0 ' + w + ' ' + h, class: 'cso-spark ' + (cls || ''), role: 'img', 'aria-label': 'trend ' + values.join(',') }, [
      svg('polyline', { points: pts, fill: 'none', 'stroke-width': 2, class: 'cso-spark-line' })
    ]);
  }
  function dayBuckets(items, days) {
    var out = [], now = new Date();
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10);
      out.push(items.filter(function (a) { return String(a.created_at || '').slice(0, 10) === d; }).length);
    }
    return out;
  }
  function pubUrl(kind, slug) {
    if (kind === 'jobs') return '/jobs-careers/?job=' + encodeURIComponent(slug || '');
    if (kind === 'current-affairs') return '/current-affairs/?slug=' + encodeURIComponent(slug || '');
    return '/mock-tests/?test=' + encodeURIComponent(slug || '');
  }
  function openLink(href, text) {
    return el('a', { href: href, target: '_blank', rel: 'noopener noreferrer', class: 'cso-mod-btn cso-mod-btn-sm', text: text || 'Preview ↗' });
  }
  function pills(options, onPick) {
    var wrap = el('div', { class: 'cso-mod-tabs' });
    function mark(v) { Array.prototype.forEach.call(wrap.children, function (b) { b.classList.toggle('is-active', b.getAttribute('data-v') === v); }); }
    options.forEach(function (o, i) {
      wrap.appendChild(el('button', { type: 'button', 'data-v': o, class: 'cso-mod-tab' + (i === 0 ? ' is-active' : ''), text: o, onclick: function () { mark(o); onPick(o); } }));
    });
    return wrap;
  }
  function loading(host, msg) { clear(host); host.appendChild(el('p', { class: 'cso-mod-muted', text: msg })); }
  function fail(host, e) { clear(host); host.appendChild(el('p', { class: 'cso-mod-badge cso-mod-badge-err', text: 'Error: ' + e.message })); }

  function renderOverviewCC(root, actions) {
    addHeaderPill(actions, '● Live D1 Command Overview');
    var shell = el('div', { class: 'cso-mod-shell' });
    var host = el('div', { class: 'cso-mod-shell' });
    renderBanner(shell, 'Executive Command Overview', 'Live D1 KPIs, activity trends, triage queue and homepage broadcast control.', [
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh', onclick: load })
    ]);
    shell.appendChild(host);
    root.appendChild(shell);

    async function load() {
      loading(host, 'Loading live D1 telemetry…');
      try {
        var r = await Promise.all([api('GET', 'stats'), api('GET', 'jobs?limit=100'), api('GET', 'current-affairs?limit=100'), api('GET', 'audit?limit=100'), api('GET', 'banner')]);
        var stats = r[0], jobs = r[1].items || [], cas = r[2].items || [], audits = r[3].items || [], banner = r[4];
        var now = Date.now();
        var expiring = jobs.filter(function (j) {
          if (j.status !== 'published' || !j.last_date) return false;
          var t = Date.parse(j.last_date + 'T23:59:59+05:30') - now;
          return t > 0 && t < 72 * 3600000;
        });
        var trend = dayBuckets(audits, 7);
        var kpis = [
          ['Active Jobs', (stats.jobs && stats.jobs.live) || 0, trend],
          ['Expiring <72h', expiring.length, null],
          ['Current Affairs', (stats.current_affairs && stats.current_affairs.live) || 0, trend],
          ['Mock Tests', (stats.mock_tests && stats.mock_tests.live) || 0, null],
          ['CBT Attempts', stats.attempts_total || 0, null],
          ['Bookmarks', stats.bookmarks_total || 0, null],
          ['Registered Users', (stats.accounts && stats.accounts.total) || 0, null]
        ];
        clear(host);
        host.appendChild(el('div', { class: 'cso-mod-grid-4' }, kpis.map(function (k) {
          var b = kpiBox(String(k[1]), k[0]);
          b.appendChild(sparkline(k[2] || [0, k[1]], k[0] === 'Expiring <72h' && k[1] ? 'is-warn' : ''));
          return b;
        })));

        // Banner quick toggle
        var bBadge = badge(banner.active ? 'LIVE: ' + banner.headline : 'Inactive', banner.active ? 'ok' : 'info');
        var toggle = el('button', {
          type: 'button', class: 'cso-mod-btn ' + (banner.active ? 'cso-mod-btn-danger' : 'cso-mod-btn-primary'),
          text: banner.active ? 'Deactivate Banner' : 'Activate Banner',
          onclick: async function () {
            if (!banner.active && !banner.headline) { toast('Set a headline in Homepage Broadcast first', 'amber'); window.CSOStudio && window.CSOStudio.openRoute('banner'); return; }
            try {
              await api('PUT', 'banner', { active: !banner.active, severity: banner.severity, headline: banner.headline, context: banner.context, ctaText: banner.ctaText, ctaUrl: banner.ctaUrl });
              toast('Banner ' + (banner.active ? 'deactivated' : 'activated'), 'success'); load();
            } catch (e) { toast(e.message, 'crimson'); }
          }
        });
        host.appendChild(el('div', { class: 'cso-mod-card' }, [
          el('h3', { text: 'Homepage Broadcast Banner' }), bBadge,
          el('p', { class: 'cso-mod-muted', text: banner.context || 'No context text.' }),
          el('div', { class: 'cso-mod-toolbar' }, [toggle, el('button', { type: 'button', class: 'cso-mod-btn', text: 'Edit Banner', onclick: function () { window.CSOStudio && window.CSOStudio.openRoute('banner'); } })])
        ]));

        // Triage
        var queue = [];
        jobs.forEach(function (j) {
          if (j.status === 'draft' || j.status === 'scheduled') queue.push({ kind: 'jobs', it: j, why: j.status });
          else if (expiring.indexOf(j) >= 0) queue.push({ kind: 'jobs', it: j, why: 'expires ' + j.last_date });
          else if (j.status === 'expired') queue.push({ kind: 'jobs', it: j, why: 'expired' });
        });
        cas.forEach(function (c) { if (c.status === 'draft' || c.status === 'scheduled') queue.push({ kind: 'current-affairs', it: c, why: c.status }); });
        var rows = queue.slice(0, 30).map(function (q) {
          var it = q.it, btns = [];
          if (it.status !== 'published') btns.push(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm', text: 'Publish', onclick: async function () {
            try { await api('POST', q.kind + '/' + encodeURIComponent(it.id) + '/status', { status: 'published' }); toast('Published', 'success'); load(); } catch (e) { toast(e.message, 'crimson'); }
          } }));
          if (q.kind === 'jobs') btns.push(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Extend +7d', onclick: async function () {
            try {
              var full = await api('GET', 'jobs/' + encodeURIComponent(it.id));
              var base = full.last_date ? new Date(full.last_date + 'T00:00:00Z') : new Date();
              if (base.getTime() < now) base = new Date();
              full.last_date = new Date(base.getTime() + 7 * 86400000).toISOString().slice(0, 10);
              if (full.status === 'expired') full.status = 'published';
              await api('PUT', 'jobs/' + encodeURIComponent(it.id), full);
              toast('Deadline extended to ' + full.last_date, 'success'); load();
            } catch (e) { toast(e.message, 'crimson'); }
          } }));
          btns.push(openLink(pubUrl(q.kind, it.slug)));
          return el('tr', {}, [el('td', {}, badge(q.kind === 'jobs' ? 'Job' : 'Current Affairs', 'info')), el('td', { text: it.title }), el('td', {}, badge(q.why, 'warn')), el('td', {}, el('div', { class: 'cso-mod-toolbar' }, btns))]);
        });
        host.appendChild(el('div', { class: 'cso-mod-card' }, [el('h3', { text: 'Needs Attention — Triage Queue (' + queue.length + ')' }), safeTable(['Type', 'Title', 'Reason', 'Actions'], rows)]));
      } catch (e) { fail(host, e); }
    }
    load();
  }

  var PROBES = ['/', '/jobs-careers/', '/current-affairs/', '/mock-tests/', '/resources/', '/sitemap.xml', '/feed.xml', '/robots.txt', '/api/health', '/admin/site-manifest.json'];
  function renderEdgeStudio(root, actions) {
    addHeaderPill(actions, '● Edge & Endpoint Telemetry');
    var shell = el('div', { class: 'cso-mod-shell' });
    var chartHost = el('div', { class: 'cso-mod-card' }), tableHost = el('div', {}), drawer = el('div', { class: 'cso-mod-card cso-hidden' });
    var results = [], filter = 'All';
    renderBanner(shell, 'Edge & Endpoint Telemetry Studio', 'Real fetch() probes: latency, status, Cache-Control, CSP and Content-Type.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Re-Probe All Endpoints', onclick: probeAll })
    ]);
    shell.appendChild(pills(['All', 'Healthy 200', 'Slow >400ms', 'Errors'], function (f) { filter = f; draw(); }));
    shell.appendChild(chartHost); shell.appendChild(tableHost); shell.appendChild(drawer);
    root.appendChild(shell);

    function pass(r) {
      if (filter === 'Healthy 200') return r.status === 200 && r.ms <= 400;
      if (filter === 'Slow >400ms') return r.ms > 400;
      if (filter === 'Errors') return !r.status || r.status >= 400;
      return true;
    }
    function inspect(r) {
      clear(drawer); drawer.classList.remove('cso-hidden');
      drawer.appendChild(el('h3', { text: 'Page Inspector — ' + r.path }));
      var hrows = Object.keys(r.headers).map(function (k) { return el('tr', {}, [el('td', { text: k }), el('td', { text: r.headers[k] })]); });
      drawer.appendChild(safeTable(['Header', 'Value'], hrows));
      drawer.appendChild(el('div', { class: 'cso-mod-toolbar' }, [openLink(r.path, 'Open in tab ↗'), el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Close', onclick: function () { drawer.classList.add('cso-hidden'); } })]));
      drawer.appendChild(el('iframe', { src: r.path, class: 'cso-inspector-frame', title: 'Preview ' + r.path, sandbox: 'allow-same-origin' }));
    }
    function draw() {
      var shown = results.filter(pass);
      clear(chartHost);
      chartHost.appendChild(el('h3', { text: 'Response Time (ms)' }));
      var max = Math.max.apply(null, results.map(function (r) { return r.ms; }).concat([100]));
      var g = svg('svg', { viewBox: '0 0 600 ' + (shown.length * 22 + 6), class: 'cso-bar-svg', role: 'img', 'aria-label': 'Response time bar chart' });
      shown.forEach(function (r, i) {
        var w = Math.max(2, (r.ms / max) * 330);
        g.appendChild(svg('text', { x: 0, y: i * 22 + 15, class: 'cso-bar-lbl' }, [])); g.lastChild.textContent = r.path;
        g.appendChild(svg('rect', { x: 190, y: i * 22 + 4, width: w.toFixed(1), height: 14, rx: 3, class: r.status >= 400 || !r.status ? 'cso-bar-err' : r.ms > 400 ? 'cso-bar-warn' : 'cso-bar-ok' }));
        g.appendChild(svg('text', { x: 196 + w, y: i * 22 + 15, class: 'cso-bar-lbl' }, [])); g.lastChild.textContent = r.ms + ' ms';
      });
      chartHost.appendChild(g);
      var rows = shown.map(function (r) {
        return el('tr', {}, [el('td', { text: r.path }), el('td', {}, badge(String(r.status || 'ERR'), r.status === 200 ? 'ok' : 'err')), el('td', { text: r.ms + ' ms' }),
          el('td', { text: r.headers['cache-control'] || '—' }), el('td', {}, badge(r.headers['content-security-policy'] ? 'CSP ✓' : 'no CSP', r.headers['content-security-policy'] ? 'ok' : 'warn')),
          el('td', { text: r.headers['content-type'] || '—' }),
          el('td', {}, el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Inspect', onclick: function () { inspect(r); } }))]);
      });
      clear(tableHost); tableHost.appendChild(safeTable(['Path', 'HTTP', 'Latency', 'Cache-Control', 'CSP', 'Content-Type', 'Inspect'], rows));
    }
    async function probeAll() {
      loading(tableHost, 'Probing…');
      results = await Promise.all(PROBES.map(async function (p) {
        var t0 = performance.now(), out = { path: p, status: 0, ms: 0, headers: {} };
        try {
          var res = await fetch(p, { credentials: 'same-origin', cache: 'no-store' });
          await res.clone().arrayBuffer();
          out.status = res.status; out.ms = Math.round(performance.now() - t0);
          res.headers.forEach(function (v, k) { out.headers[k] = v; });
        } catch (e) { out.ms = Math.round(performance.now() - t0); out.headers = { error: e.message }; }
        return out;
      }));
      draw();
    }
    probeAll();
  }

  function renderLaunchpad(root, actions) {
    addHeaderPill(actions, '● Command Launchpad');
    var shell = el('div', { class: 'cso-mod-shell' });
    var host = el('div', { class: 'cso-mod-shell' }), maint = el('div', { class: 'cso-mod-card' }), diffPre = el('pre', { class: 'cso-code-pre cso-hidden' });
    renderBanner(shell, 'Command Launchpad & Maintenance Studio', 'Create, import, upload and back up live D1/R2 content; run lifecycle maintenance.');
    shell.appendChild(host); shell.appendChild(maint); root.appendChild(shell);
    var fileInp = el('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp,application/pdf', class: 'cso-hidden' });
    fileInp.addEventListener('change', async function () {
      if (!fileInp.files[0]) return;
      var fd = new FormData(); fd.append('file', fileInp.files[0]);
      try { var d = await api('POST', 'media/upload', fd, true); toast('Uploaded to R2: ' + (d.key || d.object_key || 'ok'), 'success'); load(); } catch (e) { toast(e.message, 'crimson'); }
      fileInp.value = '';
    });
    shell.appendChild(fileInp);
    function snap(s) { return { ca_live: s.current_affairs && s.current_affairs.live, jobs_live: s.jobs && s.jobs.live, jobs_expired: s.jobs && s.jobs.expired, tests_live: s.mock_tests && s.mock_tests.live, scheduled_pending: s.scheduled_pending }; }
    async function backup() {
      try {
        var r = await Promise.all([api('GET', 'current-affairs?limit=100'), api('GET', 'jobs?limit=100'), api('GET', 'mock-tests?limit=100'), api('GET', 'resources?limit=100'), api('GET', 'audit?limit=100')]);
        downloadFile('cso-d1-backup-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ exported_at: new Date().toISOString(), current_affairs: r[0].items, jobs: r[1].items, mock_tests: r[2].items, resources: r[3].items, audit: r[4].items }, null, 2));
        toast('D1 JSON backup downloaded', 'success');
      } catch (e) { toast(e.message, 'crimson'); }
    }
    async function load() {
      loading(host, 'Loading live counts…');
      try {
        var r = await Promise.all([api('GET', 'stats'), api('GET', 'jobs?limit=100'), api('GET', 'current-affairs?limit=100'), api('GET', 'maintenance').catch(function () { return {}; })]);
        var s = r[0], jobs = r[1].items || [], cas = r[2].items || [], cron = (r[3] && r[3].last_cron_run) || s.last_cron_run;
        var open = function (rt) { return function () { window.CSOStudio && window.CSOStudio.openRoute(rt); }; };
        var cards = [
          ['Job Alerts', (s.jobs && s.jobs.total || 0) + ' total · ' + (s.jobs && s.jobs.live || 0) + ' live', [['Create', open('jobs/new'), true], ['Manage', function () { window.selectModule('folder-05', 'module-05-008'); }]]],
          ['Current Affairs', (s.current_affairs && s.current_affairs.total || 0) + ' total · ' + (s.current_affairs && s.current_affairs.live || 0) + ' live', [['Create', open('current-affairs/new'), true], ['Manage', function () { window.selectModule('folder-04', 'module-04-004'); }]]],
          ['Mock Tests', (s.mock_tests && s.mock_tests.total || 0) + ' total · ' + (s.mock_tests && s.mock_tests.live || 0) + ' live', [['Create', open('mock-tests/new'), true], ['Manage', function () { window.selectModule('folder-05', 'module-05-014'); }]]],
          ['Question CSV/JSON Import', 'Dry-run + commit import inside a mock test', [['Open Mock Tests', function () { window.selectModule('folder-05', 'module-05-012'); }, true]]],
          ['R2 Media Upload', (s.media && s.media.total || 0) + ' assets · ' + Math.round((s.media && s.media.bytes || 0) / 1024) + ' KB', [['Upload File', function () { fileInp.click(); }, true], ['Library', function () { window.selectModule('folder-07', 'module-07-001'); }]]],
          ['D1 JSON Backup', 'Download posts, tests, resources and audit', [['Download Backup', backup, true]]]
        ];
        clear(host);
        host.appendChild(el('div', { class: 'cso-mod-grid-3' }, cards.map(function (c) {
          return el('div', { class: 'cso-mod-card' }, [el('h3', { text: c[0] }), el('p', { class: 'cso-mod-muted', text: c[1] }),
            el('div', { class: 'cso-mod-toolbar' }, c[2].map(function (b) { return el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm' + (b[2] ? ' cso-mod-btn-primary' : ''), text: b[0], onclick: b[1] }); }))]);
        })));
        var soon = jobs.filter(function (j) { return j.status === 'published' && j.last_date && Date.parse(j.last_date) - Date.now() < 7 * 86400000 && Date.parse(j.last_date) > Date.now() - 86400000; });
        var sched = jobs.concat(cas).filter(function (x) { return x.status === 'scheduled'; });
        clear(maint);
        maint.appendChild(el('h3', { text: 'Scheduled Lifecycle & Maintenance' }));
        maint.appendChild(el('p', { class: 'cso-mod-muted', text: 'Last cron run: ' + (cron ? JSON.stringify(cron) : 'no run recorded yet') }));
        maint.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
          el('div', {}, [el('h4', { text: 'Upcoming scheduled (' + sched.length + ')' }), safeTable(['Title', 'Publishes'], sched.slice(0, 8).map(function (x) { return el('tr', {}, [el('td', { text: x.title }), el('td', { text: x.published_at || '—' })]); }))]),
          el('div', {}, [el('h4', { text: 'Expiring within 7 days (' + soon.length + ')' }), safeTable(['Title', 'Last date'], soon.slice(0, 8).map(function (x) { return el('tr', {}, [el('td', { text: x.title }), el('td', { text: x.last_date })]); }))])
        ]));
        maint.appendChild(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Run Maintenance & Cleanup Now', onclick: async function () {
          try {
            var before = snap(await api('GET', 'stats'));
            var res = await api('POST', 'maintenance/run');
            var after = snap(await api('GET', 'stats'));
            var diff = Object.keys(after).map(function (k) { return k + ': ' + before[k] + ' → ' + after[k] + (before[k] !== after[k] ? '  (changed)' : ''); });
            diffPre.classList.remove('cso-hidden');
            diffPre.textContent = diff.join('\n') + '\n\nrun summary:\n' + JSON.stringify(res.last_cron_run || res, null, 2);
            toast('Maintenance complete', 'success');
          } catch (e) { toast(e.status === 403 ? 'Maintenance requires admin role' : e.message, 'crimson'); }
        } }));
        maint.appendChild(diffPre);
      } catch (e) { fail(host, e); }
    }
    load();
  }

  function renderAuditTimeline(root, actions) {
    addHeaderPill(actions, '● Live Audit Timeline');
    var shell = el('div', { class: 'cso-mod-shell' }), host = el('div', {});
    var items = [], kind = 'All';
    var q = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Search action or actor…' });
    var actor = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Filter by actor email…' });
    renderBanner(shell, 'Live Audit Timeline & Diff Inspector', 'Real entries from /api/admin/audit grouped by date.', [el('button', { type: 'button', class: 'cso-mod-btn', text: 'Reload', onclick: load })]);
    shell.appendChild(pills(['All', 'Create', 'Update', 'Publish', 'Delete', 'Cron/System'], function (k) { kind = k; draw(); }));
    shell.appendChild(el('div', { class: 'cso-mod-grid-2' }, [q, actor]));
    shell.appendChild(host); root.appendChild(shell);
    q.addEventListener('input', draw); actor.addEventListener('input', draw);
    function match(a) {
      var act = String(a.action || '');
      if (kind === 'Create' && !/create/.test(act)) return false;
      if (kind === 'Update' && !/update|role_change|deactivate|resolved/.test(act)) return false;
      if (kind === 'Publish' && !/publish/.test(act)) return false;
      if (kind === 'Delete' && !/delete/.test(act)) return false;
      if (kind === 'Cron/System' && !(/maintenance|cron/.test(act) || !a.actor_email)) return false;
      if (actor.value && !String(a.actor_email || 'system').toLowerCase().includes(actor.value.toLowerCase())) return false;
      var s = q.value.toLowerCase();
      return !s || act.toLowerCase().includes(s) || String(a.actor_email || '').toLowerCase().includes(s);
    }
    function jump(a) {
      var act = String(a.action || '');
      var map = [[/^jobs\./, ['folder-05', 'module-05-008']], [/^current-affairs\./, ['folder-04', 'module-04-004']], [/^mock/, ['folder-05', 'module-05-014']], [/^banner/, ['folder-04', 'module-04-005']], [/^resource/, ['folder-05', 'module-05-010']], [/^user/, ['folder-09', 'module-09-001']], [/^incident/, ['folder-16', 'module-16-013']]];
      for (var i = 0; i < map.length; i++) if (map[i][0].test(act)) return map[i][1];
      return null;
    }
    function draw() {
      clear(host);
      var shown = items.filter(match), lastDay = '';
      host.appendChild(el('p', { class: 'cso-mod-muted', text: shown.length + ' of ' + items.length + ' events' }));
      shown.forEach(function (a) {
        var day = String(a.created_at || '').slice(0, 10);
        if (day !== lastDay) { host.appendChild(el('h4', { class: 'cso-audit-day', text: day || 'Unknown date' })); lastDay = day; }
        var meta = {}; try { meta = JSON.parse(a.metadata_json || '{}'); } catch (_) { meta = { raw: a.metadata_json }; }
        var det = el('details', { class: 'cso-audit-row' });
        det.appendChild(el('summary', {}, [badge(a.action, /delete/.test(a.action) ? 'err' : /publish/.test(a.action) ? 'ok' : 'info'), ' ' + (a.actor_email || 'system') + ' · ' + (a.created_at || '')]));
        var body = el('div', { class: 'cso-mod-card' });
        body.appendChild(el('p', { class: 'cso-mod-muted', text: 'Target: ' + (a.target_type || '—') + ' / ' + (a.target_id || '—') + ' · IP ' + (a.ip_address || '—') }));
        body.appendChild(el('pre', { class: 'cso-code-pre', text: JSON.stringify(meta, null, 2) }));
        var j = jump(a);
        var bar = el('div', { class: 'cso-mod-toolbar' });
        if (j) bar.appendChild(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary cso-mod-btn-sm', text: 'Jump to Record', onclick: function () { window.selectModule(j[0], j[1]); } }));
        if (/^jobs\./.test(a.action)) bar.appendChild(openLink('/jobs-careers/'));
        if (/^current-affairs\./.test(a.action)) bar.appendChild(openLink('/current-affairs/'));
        bar.appendChild(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Copy JSON', onclick: function () { navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(a, null, 2)); toast('Copied', 'success'); } }));
        body.appendChild(bar); det.appendChild(body); host.appendChild(det);
      });
    }
    async function load() {
      loading(host, 'Loading audit log…');
      try { items = (await api('GET', 'audit?limit=100')).items || []; draw(); } catch (e) { fail(host, e); }
    }
    load();
  }

  /* =========================================================================
     COMMAND CENTRE 5-8: Alerts, Approval Queue, Analytics Studio, Command Directory
     ========================================================================= */
  function barChart(rows, label) {
    var max = Math.max.apply(null, rows.map(function (r) { return r.value; }).concat([1]));
    var g = svg('svg', { viewBox: '0 0 600 ' + (rows.length * 22 + 6), class: 'cso-bar-svg', role: 'img', 'aria-label': label });
    rows.forEach(function (r, i) {
      var w = Math.max(2, (r.value / max) * 320);
      var t1 = svg('text', { x: 0, y: i * 22 + 15, class: 'cso-bar-lbl' }); t1.textContent = String(r.label).slice(0, 30);
      var t2 = svg('text', { x: 206 + w, y: i * 22 + 15, class: 'cso-bar-lbl' }); t2.textContent = r.text || String(r.value);
      g.appendChild(t1);
      g.appendChild(svg('rect', { x: 200, y: i * 22 + 4, width: w.toFixed(1), height: 14, rx: 3, class: r.cls || 'cso-bar-ok' }));
      g.appendChild(t2);
    });
    return rows.length ? g : el('p', { class: 'cso-mod-muted', text: 'No live data to chart yet.' });
  }
  function csvCell(v) { return '"' + String(v === null || v === undefined ? '' : v).replace(/"/g, '""') + '"'; }
  var MOD_FOLDER = { jobs: ['folder-05', 'module-05-008'], 'current-affairs': ['folder-04', 'module-04-004'], 'mock-tests': ['folder-05', 'module-05-014'] };
  function goTo(pair) { if (pair && window.selectModule) window.selectModule(pair[0], pair[1]); }

  function renderAlertCenter(root, actions) {
    addHeaderPill(actions, '● Live Alert & Broadcast Center');
    var shell = el('div', { class: 'cso-mod-shell' }), host = el('div', { class: 'cso-mod-shell' });
    var sev = 'All', alerts = [], acked = {};
    try { acked = JSON.parse(localStorage.getItem('cso_ack_alerts') || '{}'); } catch (_) { acked = {}; }
    renderBanner(shell, 'Administrative Notifications', 'Actionable alerts computed live from D1, health probes and the sitewide broadcast banner (/api/admin/banner).', [el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh', onclick: load })]);
    shell.appendChild(pills(['All', 'Critical', 'Warning', 'Info'], function (s) { sev = s; draw(); }));
    shell.appendChild(host); root.appendChild(shell);
    var alertHost = el('div', {}), composerHost = el('div', {});
    host.appendChild(alertHost); host.appendChild(composerHost);

    function draw() {
      clear(alertHost);
      var shown = alerts.filter(function (a) { return sev === 'All' || a.sev.toLowerCase() === sev.toLowerCase(); });
      var rows = shown.map(function (a) {
        var done = !!acked[a.id];
        return el('tr', {}, [
          el('td', {}, badge(a.sev, a.sev === 'Critical' ? 'err' : a.sev === 'Warning' ? 'warn' : 'info')),
          el('td', { text: a.msg }),
          el('td', {}, el('label', {}, [el('input', { type: 'checkbox', checked: done ? true : false, onchange: function (e) { if (e.target.checked) acked[a.id] = 1; else delete acked[a.id]; try { localStorage.setItem('cso_ack_alerts', JSON.stringify(acked)); } catch (_) {} } }), ' Ack'])),
          el('td', {}, el('div', { class: 'cso-mod-toolbar' }, a.actions))
        ]);
      });
      alertHost.appendChild(el('div', { class: 'cso-mod-card' }, [el('h3', { text: 'Actionable Alerts (' + shown.length + ')' }), safeTable(['Severity', 'Alert', 'Acknowledge', 'Resolve / Edit'], rows)]));
    }

    function btn(text, fn, primary) { return el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm' + (primary ? ' cso-mod-btn-primary' : ''), text: text, onclick: fn }); }

    function composer(b) {
      clear(composerHost);
      var head = el('input', { type: 'text', class: 'cso-mod-input', value: b.headline || '', maxlength: '160' });
      var ctx = el('textarea', { class: 'cso-mod-textarea', maxlength: '300' }); ctx.value = b.context || '';
      var cta = el('input', { type: 'text', class: 'cso-mod-input', value: b.ctaText || '', maxlength: '40' });
      var url = el('input', { type: 'text', class: 'cso-mod-input', value: b.ctaUrl || '' });
      var sevSel = el('select', { class: 'cso-mod-select' }, ['info', 'notice', 'urgent'].map(function (s) { return el('option', { value: s, text: s }); }));
      sevSel.value = b.severity || 'info';
      var act = el('input', { type: 'checkbox' }); act.checked = !!b.active;
      var prev = el('div', { class: 'cso-banner-preview' });
      function paint() {
        clear(prev);
        prev.className = 'cso-banner-preview cso-banner-' + sevSel.value + (act.checked ? '' : ' is-off');
        prev.appendChild(el('strong', { text: head.value || '(headline)' }));
        prev.appendChild(el('span', { text: ' ' + ctx.value }));
        if (cta.value) prev.appendChild(el('span', { class: 'cso-mod-badge cso-mod-badge-info', text: cta.value + ' → ' + (url.value || '/') }));
        if (!act.checked) prev.appendChild(el('em', { class: 'cso-mod-muted', text: ' (inactive — not visible to candidates)' }));
      }
      [head, ctx, cta, url].forEach(function (i) { i.addEventListener('input', paint); });
      sevSel.addEventListener('change', paint); act.addEventListener('change', paint);
      var save = el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Save & Publish Banner', onclick: async function () {
        try { await api('PUT', 'banner', { active: act.checked, severity: sevSel.value, headline: head.value, context: ctx.value, ctaText: cta.value, ctaUrl: url.value }); toast('Banner saved', 'success'); load(); }
        catch (e) { toast(e.message, 'crimson'); }
      } });
      composerHost.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
        el('div', { class: 'cso-mod-card' }, [el('h3', { text: 'Broadcast Banner Composer' }),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Headline' }), head]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Context' }), ctx]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Severity' }), sevSel]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Button text' }), cta]),
          el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Button link' }), url]),
          el('label', {}, [act, ' Active on homepage']), save]),
        el('div', { class: 'cso-mod-card' }, [el('h3', { text: 'Real-Time Candidate Preview' }), prev, el('p', { class: 'cso-mod-muted', text: 'Last updated: ' + (b.updatedAt || 'never') })])
      ]));
      paint();
    }

    async function load() {
      loading(alertHost, 'Aggregating alerts…');
      try {
        var r = await Promise.all([api('GET', 'stats'), api('GET', 'jobs?limit=100'), api('GET', 'current-affairs?limit=100'), api('GET', 'mock-tests?limit=100'), api('GET', 'banner')]);
        var stats = r[0], jobs = r[1].items || [], cas = r[2].items || [], tests = r[3].items || [], now = Date.now();
        alerts = [];
        jobs.forEach(function (j) {
          if (j.status !== 'published' || !j.last_date) return;
          var left = Date.parse(j.last_date + 'T23:59:59+05:30') - now;
          if (left > 0 && left < 72 * 3600000) alerts.push({ id: 'exp-' + j.id, sev: left < 24 * 3600000 ? 'Critical' : 'Warning', msg: 'Job closing ' + j.last_date + ': ' + j.title,
            actions: [btn('Extend +7d', async function () { try { var f = await api('GET', 'jobs/' + encodeURIComponent(j.id)); f.last_date = new Date(Date.parse(f.last_date) + 7 * 86400000).toISOString().slice(0, 10); await api('PUT', 'jobs/' + encodeURIComponent(j.id), f); toast('Extended', 'success'); load(); } catch (e) { toast(e.message, 'crimson'); } }, true), btn('Edit', function () { goTo(MOD_FOLDER.jobs); })] });
        });
        jobs.concat(cas).forEach(function (x) { if (x.status === 'draft') { var k = x.type === 'job' ? 'jobs' : 'current-affairs'; alerts.push({ id: 'draft-' + x.id, sev: 'Info', msg: 'Draft awaiting review (' + (k === 'jobs' ? 'Job' : 'Current Affairs') + '): ' + x.title, actions: [btn('Review', function () { window.selectModule('folder-01', 'module-01-006'); }, true), btn('Edit', function () { goTo(MOD_FOLDER[k]); })] }); } });
        tests.forEach(function (t) { if (!t.question_count) alerts.push({ id: 'noq-' + t.id, sev: t.status === 'published' ? 'Critical' : 'Warning', msg: 'Mock test has 0 questions (' + t.status + '): ' + t.title, actions: [btn('Add Questions', function () { goTo(MOD_FOLDER['mock-tests']); }, true)] }); });
        if (stats.open_incidents) alerts.push({ id: 'incidents', sev: 'Critical', msg: stats.open_incidents + ' open incident(s) unresolved', actions: [btn('Open Incidents', function () { window.selectModule('folder-16', 'module-16-013'); }, true)] });
        var cron = stats.last_cron_run, ran = cron && (cron.ran_at || cron.at);
        if (!ran) alerts.push({ id: 'cron', sev: 'Warning', msg: 'No cron run recorded yet', actions: [btn('Maintenance', function () { window.selectModule('folder-01', 'module-01-003'); }, true)] });
        else if (Date.now() - Date.parse(String(ran).replace(' ', 'T') + (/Z|\+/.test(String(ran)) ? '' : 'Z')) > 3600000) alerts.push({ id: 'cron-stale', sev: 'Warning', msg: 'Last cron run is over 1 hour old (' + ran + ')', actions: [btn('Maintenance', function () { window.selectModule('folder-01', 'module-01-003'); }, true)] });
        var health = await Promise.all(['/api/health', '/sitemap.xml', '/feed.xml'].map(async function (p) { try { var x = await fetch(p, { cache: 'no-store' }); return [p, x.ok]; } catch (_) { return [p, false]; } }));
        health.forEach(function (h) { if (!h[1]) alerts.push({ id: 'health-' + h[0], sev: 'Critical', msg: 'Health check failed: ' + h[0], actions: [btn('Open Site Status', function () { window.selectModule('folder-01', 'module-01-002'); }, true)] }); });
        if (r[4].active) alerts.push({ id: 'banner-live', sev: 'Info', msg: 'Homepage broadcast is LIVE: ' + r[4].headline, actions: [btn('Edit below', function () { composerHost.scrollIntoView(); })] });
        var order = { Critical: 0, Warning: 1, Info: 2 };
        alerts.sort(function (a, b) { return order[a.sev] - order[b.sev]; });
        draw(); composer(r[4]);
      } catch (e) { fail(alertHost, e); }
    }
    load();
  }

  function renderApprovalQueue(root, actions) {
    addHeaderPill(actions, '● Editorial Review & Approval');
    var shell = el('div', { class: 'cso-mod-shell' }), tableHost = el('div', {}), drawer = el('div', { class: 'cso-mod-card cso-hidden' });
    var all = [], typeF = 'All', statF = 'All', selected = {};
    renderBanner(shell, 'Pending Approvals — Editorial Review Queue', 'All draft and scheduled jobs, current affairs and mock tests from D1.', [
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Bulk Approve Selected', onclick: bulkApprove }),
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Refresh', onclick: load })
    ]);
    shell.appendChild(pills(['All', 'Jobs', 'Current Affairs', 'Mock Tests'], function (t) { typeF = t; draw(); }));
    shell.appendChild(pills(['All', 'draft', 'scheduled'], function (s) { statF = s; draw(); }));
    shell.appendChild(tableHost); shell.appendChild(drawer); root.appendChild(shell);

    async function bulkApprove() {
      var ids = Object.keys(selected);
      if (!ids.length) { toast('Select at least one record', 'amber'); return; }
      var ok = 0, bad = [];
      for (var i = 0; i < ids.length; i++) {
        var q = selected[ids[i]];
        try { await api('POST', q.kind + '/' + encodeURIComponent(q.it.id) + '/status', { status: 'published' }); ok++; } catch (e) { bad.push(q.it.title + ': ' + e.message); }
      }
      toast(ok + ' published' + (bad.length ? ', ' + bad.length + ' failed — ' + bad[0] : ''), bad.length ? 'amber' : 'success');
      selected = {}; load();
    }
    async function publishNow(q) { try { await api('POST', q.kind + '/' + encodeURIComponent(q.it.id) + '/status', { status: 'published' }); toast('Published', 'success'); drawer.classList.add('cso-hidden'); load(); } catch (e) { toast(e.message, 'crimson'); } }
    function scheduleBox(q, bar) {
      var inp = el('input', { type: 'datetime-local', class: 'cso-mod-input' });
      bar.appendChild(inp);
      bar.appendChild(el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Schedule', onclick: async function () {
        if (!inp.value) { toast('Pick a future date/time', 'amber'); return; }
        try { await api('POST', q.kind + '/' + encodeURIComponent(q.it.id) + '/status', { status: 'scheduled', published_at: new Date(inp.value).toISOString() }); toast('Scheduled', 'success'); drawer.classList.add('cso-hidden'); load(); } catch (e) { toast(e.message, 'crimson'); }
      } }));
    }
    async function openDrawer(q) {
      clear(drawer); drawer.classList.remove('cso-hidden');
      drawer.appendChild(el('h3', { text: 'Candidate Preview — ' + q.it.title }));
      var left = el('div', { class: 'cso-mod-card' }), right = el('div', { class: 'cso-live-preview-box' });
      drawer.appendChild(el('div', { class: 'cso-mod-grid-2' }, [left, right]));
      try {
        if (q.kind === 'mock-tests') {
          var qs = (await api('GET', 'mock-tests/' + encodeURIComponent(q.it.id) + '/questions')).items || [];
          left.appendChild(el('p', { class: 'cso-mod-muted', text: q.it.target_exam + ' · ' + q.it.duration_minutes + ' min · ' + qs.length + ' questions' }));
          right.appendChild(el('h4', { text: q.it.title }));
          if (!qs.length) right.appendChild(el('p', { class: 'cso-mod-badge cso-mod-badge-err', text: 'No questions — cannot be published' }));
          qs.forEach(function (x, i) {
            left.appendChild(el('p', { class: 'cso-mod-muted', text: 'Q' + (i + 1) + ' correct: ' + x.correct_option + (x.explanation ? ' — ' + x.explanation : '') }));
            right.appendChild(el('p', {}, [el('strong', { text: (i + 1) + '. ' + x.question_en })]));
            ['a', 'b', 'c', 'd'].forEach(function (o) { right.appendChild(el('div', { class: 'cso-mod-muted', text: o.toUpperCase() + ') ' + x['option_' + o] })); });
          });
        } else {
          var full = await api('GET', q.kind + '/' + encodeURIComponent(q.it.id));
          left.appendChild(el('pre', { class: 'cso-code-pre', text: JSON.stringify(full, null, 2) }));
          var pr = await api('POST', 'preview', { markdown: full.body_md || '' });
          right.appendChild(el('h4', { text: full.title }));
          var body = el('div', {}); right.appendChild(body); renderSanitizedHtml(body, pr.html || '');
        }
      } catch (e) { right.appendChild(el('p', { class: 'cso-mod-badge cso-mod-badge-err', text: e.message })); }
      var bar = el('div', { class: 'cso-mod-toolbar' }, [
        el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Approve & Publish Now', onclick: function () { publishNow(q); } }),
        el('button', { type: 'button', class: 'cso-mod-btn', text: 'Edit in Studio', onclick: function () { goTo(MOD_FOLDER[q.kind]); } }),
        el('button', { type: 'button', class: 'cso-mod-btn', text: 'Close', onclick: function () { drawer.classList.add('cso-hidden'); } })
      ]);
      scheduleBox(q, bar); drawer.appendChild(bar);
    }
    function draw() {
      var names = { jobs: 'Jobs', 'current-affairs': 'Current Affairs', 'mock-tests': 'Mock Tests' };
      var shown = all.filter(function (q) { return (typeF === 'All' || names[q.kind] === typeF) && (statF === 'All' || q.it.status === statF); });
      var rows = shown.map(function (q) {
        return el('tr', {}, [
          el('td', {}, el('input', { type: 'checkbox', checked: selected[q.it.id] ? true : false, onchange: function (e) { if (e.target.checked) selected[q.it.id] = q; else delete selected[q.it.id]; } })),
          el('td', {}, badge(names[q.kind], 'info')), el('td', { text: q.it.title }),
          el('td', {}, badge(q.it.status, q.it.status === 'scheduled' ? 'warn' : 'info')),
          el('td', { text: q.it.published_at || q.it.updated_at || '—' }),
          el('td', {}, el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm', text: 'Preview & Review', onclick: function () { openDrawer(q); } }))
        ]);
      });
      clear(tableHost); tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: shown.length + ' records awaiting review' })); tableHost.appendChild(safeTable(['Select', 'Type', 'Title', 'Status', 'Date', 'Review'], rows));
    }
    async function load() {
      loading(tableHost, 'Loading review queue…');
      try {
        var r = await Promise.all([api('GET', 'jobs?limit=100'), api('GET', 'current-affairs?limit=100'), api('GET', 'mock-tests?limit=100')]);
        all = [];
        [['jobs', r[0]], ['current-affairs', r[1]], ['mock-tests', r[2]]].forEach(function (p) { (p[1].items || []).forEach(function (it) { if (it.status === 'draft' || it.status === 'scheduled') all.push({ kind: p[0], it: it }); }); });
        draw();
      } catch (e) { fail(tableHost, e); }
    }
    load();
  }

  function renderAnalyticsStudio(root, actions) {
    addHeaderPill(actions, '● D1 Content, CBT & SEO Analytics');
    var shell = el('div', { class: 'cso-mod-shell' }), host = el('div', { class: 'cso-mod-shell' });
    var data = null, catSel = el('select', { class: 'cso-mod-select' }), statSel = el('select', { class: 'cso-mod-select' });
    ['All statuses', 'published', 'draft', 'scheduled', 'expired', 'archived'].forEach(function (s) { statSel.appendChild(el('option', { value: s, text: s })); });
    renderBanner(shell, 'Website Analytics Studio', 'Live D1 pipeline, coverage, CBT performance and manifest SEO readiness.', [
      el('button', { type: 'button', class: 'cso-mod-btn', text: 'Export JSON', onclick: function () { if (data) downloadFile('cso-analytics-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(report(), null, 2)); } }),
      el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-primary', text: 'Export CSV', onclick: exportCsv })
    ]);
    shell.appendChild(el('div', { class: 'cso-mod-grid-2' }, [el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Category / Exam' }), catSel]), el('div', { class: 'cso-mod-field' }, [el('label', { class: 'cso-mod-label', text: 'Status' }), statSel])]));
    shell.appendChild(host); root.appendChild(shell);
    catSel.addEventListener('change', draw); statSel.addEventListener('change', draw);

    function items() {
      var out = [];
      data.jobs.forEach(function (x) { out.push({ t: 'Job', cat: x.category || 'Uncategorized', status: x.status }); });
      data.cas.forEach(function (x) { out.push({ t: 'Current Affairs', cat: x.category || 'Uncategorized', status: x.status }); });
      data.tests.forEach(function (x) { out.push({ t: 'Mock Test', cat: x.target_exam || 'Uncategorized', status: x.status }); });
      return out;
    }
    function filtered() { return items().filter(function (i) { return (catSel.value === 'All categories' || i.cat === catSel.value) && (statSel.value === 'All statuses' || i.status === statSel.value); }); }
    function seoRows() {
      return data.pages.map(function (p) {
        var tl = (p.title || '').length, dl = (p.description || '').length, issues = [];
        if (tl < 20 || tl > 70) issues.push('title ' + tl + ' chars');
        if (dl < 70 || dl > 170) issues.push('description ' + dl + ' chars');
        return { route: p.route, category: p.category, issues: issues };
      });
    }
    function cbtRows() {
      return data.board.map(function (b) { var it = b.items; var acc = it.length ? it.reduce(function (s, x) { return s + (Number(x.accuracy) || 0); }, 0) / it.length : 0; return { title: b.test.title, participants: it.length, avgAcc: Math.round(acc * 10) / 10, top: it[0] ? it[0].score + '/' + (it[0].maxScore || it[0].max_score) : '—' }; }).filter(function (r) { return r.participants; }).sort(function (a, b) { return b.avgAcc - a.avgAcc; });
    }
    function report() { return { generated_at: new Date().toISOString(), stats: data.stats, pipeline: tally(function (i) { return i.status; }), coverage: tally(function (i) { return i.cat; }), cbt: cbtRows(), seo: seoRows() }; }
    function tally(keyFn) { var c = {}; filtered().forEach(function (i) { var k = keyFn(i); c[k] = (c[k] || 0) + 1; }); return c; }
    function exportCsv() {
      if (!data) return;
      var rep = report(), lines = ['section,label,value'];
      Object.keys(rep.pipeline).forEach(function (k) { lines.push(['pipeline', k, rep.pipeline[k]].map(csvCell).join(',')); });
      Object.keys(rep.coverage).forEach(function (k) { lines.push(['coverage', k, rep.coverage[k]].map(csvCell).join(',')); });
      rep.cbt.forEach(function (r) { lines.push(['cbt', r.title, r.avgAcc + '% avg accuracy / ' + r.participants + ' participants'].map(csvCell).join(',')); });
      rep.seo.forEach(function (r) { lines.push(['seo', r.route, r.issues.length ? r.issues.join('; ') : 'ready'].map(csvCell).join(',')); });
      downloadFile('cso-analytics.csv', lines.join('\n'), 'text/csv'); toast('CSV exported', 'success');
    }
    function chartCard(title, node) { return el('div', { class: 'cso-mod-card' }, [el('h3', { text: title }), node]); }
    function draw() {
      clear(host);
      var s = data.stats;
      host.appendChild(el('div', { class: 'cso-mod-grid-4' }, [kpiBox(String(s.attempts_total || 0), 'CBT Attempts'), kpiBox(String(s.bookmarks_total || 0), 'Bookmarks'), kpiBox(String(s.accounts ? s.accounts.total : 0), 'Registered Users'), kpiBox(String(s.audit_24h || 0), 'Audit events 24h')]));
      var pipe = tally(function (i) { return i.status; });
      host.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
        chartCard('Content Status Pipeline', barChart(Object.keys(pipe).map(function (k) { return { label: k, value: pipe[k], cls: k === 'published' ? 'cso-bar-ok' : k === 'draft' ? 'cso-bar-warn' : 'cso-bar-info' }; }), 'Content status pipeline')),
        chartCard('Exam Category Coverage', barChart((function () { var c = tally(function (i) { return i.cat; }); return Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).slice(0, 12).map(function (k) { return { label: k, value: c[k] }; }); })(), 'Exam category coverage'))
      ]));
      var cbt = cbtRows(), seo = seoRows();
      var ready = seo.filter(function (r) { return !r.issues.length; }).length;
      host.appendChild(el('div', { class: 'cso-mod-grid-2' }, [
        chartCard('CBT Attempts & Average Accuracy (top-10 best attempts per test)', barChart(cbt.slice(0, 10).map(function (r) { return { label: r.title, value: r.avgAcc, text: r.avgAcc + '% · ' + r.participants + ' users', cls: 'cso-bar-info' }; }), 'CBT breakdown')),
        chartCard('Site Page SEO Readiness (' + seo.length + ' manifest pages)', barChart([{ label: 'Ready', value: ready, cls: 'cso-bar-ok' }, { label: 'Needs title/description fix', value: seo.length - ready, cls: 'cso-bar-warn' }], 'SEO readiness'))
      ]));
      host.appendChild(chartCard('Top-Performing Mock Tests Leaderboard', safeTable(['Rank', 'Mock Test', 'Participants', 'Avg accuracy', 'Top score'], cbt.map(function (r, i) { return el('tr', {}, [el('td', { text: String(i + 1) }), el('td', { text: r.title }), el('td', { text: String(r.participants) }), el('td', { text: r.avgAcc + '%' }), el('td', { text: r.top })]); }))));
      host.appendChild(chartCard('SEO Issues', safeTable(['Route', 'Category', 'Issues'], seo.filter(function (r) { return r.issues.length; }).slice(0, 25).map(function (r) { return el('tr', {}, [el('td', { text: r.route }), el('td', { text: r.category || '—' }), el('td', {}, badge(r.issues.join(', '), 'warn'))]); }))));
    }
    (async function () {
      loading(host, 'Loading analytics…');
      try {
        var r = await Promise.all([api('GET', 'stats'), api('GET', 'jobs?limit=100'), api('GET', 'current-affairs?limit=100'), api('GET', 'mock-tests?limit=100'), fetchManifest()]);
        var tests = r[3].items || [];
        var pub = tests.filter(function (t) { return t.status === 'published'; }).slice(0, 20);
        var board = await Promise.all(pub.map(async function (t) { try { var lb = await (await fetch('/api/content/mock-tests/' + encodeURIComponent(t.slug || t.id) + '/leaderboard', { credentials: 'same-origin' })).json(); return { test: t, items: lb.items || [] }; } catch (_) { return { test: t, items: [] }; } }));
        data = { stats: r[0], jobs: r[1].items || [], cas: r[2].items || [], tests: tests, pages: r[4].pages || [], board: board };
        var cats = {}; items().forEach(function (i) { cats[i.cat] = 1; });
        catSel.appendChild(el('option', { value: 'All categories', text: 'All categories' }));
        Object.keys(cats).sort().forEach(function (c) { catSel.appendChild(el('option', { value: c, text: c })); });
        draw();
      } catch (e) { fail(host, e); }
    })();
  }

  var DIR_EP = { 'folder-01': ['/api/admin/stats', '/api/admin/audit', '/api/admin/banner', '/api/admin/maintenance'], 'folder-02': ['/api/admin/preview', '/admin/site-manifest.json'], 'folder-03': ['/api/admin/preview', '/admin/site-manifest.json'], 'folder-04': ['/api/admin/current-affairs', '/api/admin/jobs'], 'folder-05': ['/api/admin/mock-tests', '/api/admin/resources', '/api/admin/jobs'], 'folder-06': ['/admin/site-manifest.json'], 'folder-07': ['/api/admin/media', '/api/admin/media/upload'], 'folder-09': ['/api/admin/users'], 'folder-10': ['/api/admin/stats', '/api/admin/audit'], 'folder-13': ['/sitemap.xml', '/feed.xml', '/robots.txt'], 'folder-14': ['/api/admin/current-affairs', '/api/admin/jobs'], 'folder-15': ['/api/health', '/sitemap.xml'], 'folder-16': ['/api/admin/audit', '/api/admin/incidents'], 'folder-17': ['/api/admin/maintenance', '/api/admin/stats'], 'folder-19': ['/admin/data/master-navigation.json'] };
  function dirCaps(folderId, eps) {
    var caps = [];
    if (eps.some(function (e) { return e.indexOf('/api/admin/') === 0; })) caps.push('Live D1');
    if (eps.some(function (e) { return /media|resources/.test(e); })) caps.push('R2 Storage');
    if (/folder-0[2-3]|folder-04/.test(folder_re(folderId)) || eps.indexOf('/api/admin/preview') >= 0) caps.push('Preview Studio');
    if (/folder-10|folder-01|folder-13/.test(folder_re(folderId))) caps.push('SVG Analytics');
    if (eps.some(function (e) { return /manifest|sitemap|feed|robots|navigation/.test(e); })) caps.push('Manifest');
    return caps;
  }
  function folder_re(id) { return id + ' '; }

  function renderCommandDirectory(root, actions) {
    addHeaderPill(actions, '● Command Directory & Capability Matrix');
    var shell = el('div', { class: 'cso-mod-shell' }), tableHost = el('div', {});
    var search = el('input', { type: 'text', class: 'cso-mod-input', placeholder: 'Search module id, title or endpoint…' });
    var folderSel = el('select', { class: 'cso-mod-select' }, [el('option', { value: '', text: 'All folders' })]);
    var rows = [];
    renderBanner(shell, 'Master Feature Registry', 'Every folder and module from master-navigation.json with capability badges and endpoint mapping.');
    shell.appendChild(el('div', { class: 'cso-mod-grid-2' }, [search, folderSel]));
    shell.appendChild(tableHost); root.appendChild(shell);
    function draw() {
      var q = search.value.toLowerCase().trim(), f = folderSel.value;
      var shown = rows.filter(function (r) { return (!f || r.folderId === f) && (!q || (r.id + ' ' + r.title + ' ' + r.folderTitle + ' ' + r.eps.join(' ')).toLowerCase().indexOf(q) >= 0); });
      clear(tableHost);
      tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: shown.length + ' of ' + rows.length + ' modules shown' }));
      tableHost.appendChild(safeTable(['Module', 'Folder', 'Capabilities', 'API / Data endpoints', 'Launch'], shown.slice(0, 150).map(function (r) {
        return el('tr', {}, [el('td', {}, [el('strong', { text: r.title }), el('div', { class: 'cso-mod-muted', text: r.id })]), el('td', { text: r.folderTitle }),
          el('td', {}, el('div', { class: 'cso-mod-toolbar' }, r.caps.map(function (c) { return badge(c, 'ok'); }))),
          el('td', { class: 'cso-mod-muted', text: r.eps.join('  ') }),
          el('td', {}, el('button', { type: 'button', class: 'cso-mod-btn cso-mod-btn-sm cso-mod-btn-primary', text: 'Launch Module →', onclick: function () { goTo([r.folderId, r.id]); } }))]);
      })));
      if (shown.length > 150) tableHost.appendChild(el('p', { class: 'cso-mod-muted', text: 'Refine search to see the remaining ' + (shown.length - 150) + ' modules.' }));
    }
    fetchNav().then(function (nav) {
      (nav.folders || []).forEach(function (fo) {
        folderSel.appendChild(el('option', { value: fo.id, text: fo.title + ' (' + fo.modules.length + ')' }));
        fo.modules.forEach(function (m) {
          var route = window.CSOLive && window.CSOLive.routes && window.CSOLive.routes[m.id];
          var eps = (DIR_EP[fo.id] || []).slice();
          if (route && window.CSOLive.resolveRoute) {
            var map = { 'current-affairs': '/api/admin/current-affairs', jobs: '/api/admin/jobs', 'mock-tests': '/api/admin/mock-tests', syllabus: '/api/admin/resources', pyq: '/api/admin/resources', media: '/api/admin/media', users: '/api/admin/users', banner: '/api/admin/banner', audit: '/api/admin/audit', 'audit/security': '/api/admin/audit', incidents: '/api/admin/incidents', operations: '/api/admin/maintenance', dashboard: '/api/admin/stats' };
            var ep = map[window.CSOLive.resolveRoute(fo.id, m.id)[0]]; if (ep && eps.indexOf(ep) < 0) eps.push(ep);
          }
          rows.push({ folderId: fo.id, folderTitle: fo.title, id: m.id, title: m.title, eps: eps.length ? eps : ['(client-side studio)'], caps: dirCaps(fo.id, eps) });
        });
      });
      root.querySelector('.cso-mod-banner-sub').textContent = (nav.folders || []).length + ' folders · ' + rows.length + ' modules (from master-navigation.json) with capability badges and endpoint mapping.';
      draw();
    }).catch(function (e) { fail(tableHost, e); });
    search.addEventListener('input', draw); folderSel.addEventListener('change', draw);
  }

  /* =========================================================================
     MAIN DISPATCHER
     ========================================================================= */
  function render(folderId, moduleId, root, actions) {
    // Folder 01 specialized tools
    if (moduleId === 'module-01-001') { renderOverviewCC(root, actions); return true; }
    if (moduleId === 'module-01-002') { renderEdgeStudio(root, actions); return true; }
    if (moduleId === 'module-01-003') { renderLaunchpad(root, actions); return true; }
    if (moduleId === 'module-01-004') { renderAuditTimeline(root, actions); return true; }
    if (moduleId === 'module-01-005') { renderAlertCenter(root, actions); return true; }
    if (moduleId === 'module-01-006') { renderApprovalQueue(root, actions); return true; }
    if (moduleId === 'module-01-007') { renderAnalyticsStudio(root, actions); return true; }
    if (moduleId === 'module-01-008') { renderCommandDirectory(root, actions); return true; }

    // Folder 02: Website Pages & Builder
    if (folderId === 'folder-02' || moduleId.startsWith('module-02-')) {
      return renderFolder02(folderId, moduleId, root, actions);
    }

    // Folder 03: Website Information & Legal
    if (folderId === 'folder-03' || moduleId.startsWith('module-03-')) {
      return renderLegalStudio(moduleId, root, actions);
    }

    // Folder 04: Content & Publishing specialized modules
    if (folderId === 'folder-04' && renderFolder04(moduleId, root, actions)) {
      return true;
    }

    // Folder 06 & Directory Folders 20-23: Category & Navigation Tree Studios
    if (folderId === 'folder-06' || folderId === 'folder-jobs-careers' || folderId === 'folder-schemes-benefits' || folderId === 'folder-study-library' || folderId === 'folder-community') {
      var meta = moduleMeta(folderId, moduleId);
      return renderCategoryTreeStudio(meta.title, meta.folderTitle + ' — Interactive navigation & taxonomy tree hydrated from site-manifest.json.', root, actions);
    }

    // Folder 07: R2 Diagnostics modules
    if (folderId === 'folder-07' && renderFolder07(moduleId, root, actions)) {
      return true;
    }

    // Folder 10: Analytics
    if (folderId === 'folder-10' || moduleId.startsWith('module-ana-')) {
      renderWebsiteAnalytics(root, actions);
      return true;
    }

    // Folder 11: Communications
    if (folderId === 'folder-11' || moduleId.startsWith('module-comms-')) {
      return renderCommsStudio(moduleId, root, actions);
    }

    // Folder 13: SEO, Search & Discovery
    if (folderId === 'folder-13' || moduleId.startsWith('module-seo-')) {
      return renderSeoStudio(moduleId, root, actions);
    }

    // Folder 14: Events & Scheduling -> Live Editorial/Deadline Calendar
    if (folderId === 'folder-14' && moduleId !== 'module-14-006' && moduleId !== 'module-14-007') {
      return renderFolder04('module-04-009', root, actions);
    }

    // Folder 15: Integrations & Cloudflare Edge -> Live Edge Prober
    if (folderId === 'folder-15') {
      renderLiveSiteStatus(root, actions);
      return true;
    }

    // Folder 19: Master Feature Registry
    if (folderId === 'folder-19' || moduleId.startsWith('module-19-') || moduleId.startsWith('module-mfr-')) {
      renderMasterRegistry(root, actions);
      return true;
    }

    // Folder 08 (Payments Config), Folder 12 (Marketing), Folder 18 (Settings)
    if (folderId === 'folder-08' || folderId === 'folder-12' || folderId === 'folder-18') {
      return renderConfigStudio(folderId, moduleId, root, actions);
    }

    return false;
  }

  window.CSORestoredModules = {
    render: render
  };
})(window, document);
