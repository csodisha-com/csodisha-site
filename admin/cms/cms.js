(function () {
  'use strict';
  var main = document.getElementById('main');
  var me = null;
  var embedded = false;          // true when mounted inside the Master Command Suite
  var curPath = '';              // embedded-mode route (standalone uses location.hash)
  var embedGroup = null;         // optional tab group for embedded views

  /* ---------- helpers ---------- */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === false || v === null || v === undefined) return;
      if (k === 'class') n.className = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else if (k === 'text') n.textContent = v;
      else n.setAttribute(k, v === true ? '' : v);
    });
    [].concat(kids || []).forEach(function (c) { if (c !== null && c !== undefined && c !== false) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function overlayHost() {
    if (!embedded) return document.body;
    var h = document.getElementById('cmsOverlayHost');
    if (!h) { h = el('div', { id: 'cmsOverlayHost', class: 'cms-embed' }); document.body.appendChild(h); }
    return h;
  }
  function go(path) {
    if (embedded) { curPath = path; route(); } else location.hash = '#/' + path.replace(/^\//, '');
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
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
  function toast(msg, bad) {
    var t = el('div', { class: 'toast' + (bad ? ' bad' : ''), text: msg });
    if (embedded && typeof window.showToast === 'function') { window.showToast(msg, bad ? 'crimson' : 'success'); return; }
    document.getElementById('toasts').appendChild(t);
    setTimeout(function () { t.remove(); }, 4500);
  }
  async function api(method, path, body, isForm) {
    var opts = { method: method, credentials: 'same-origin', headers: { 'X-CSO-CSRF': '1' } };
    if (body !== undefined) {
      if (isForm) opts.body = body;
      else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    }
    var r = await fetch('/api/admin/' + path, opts);
    var d = await r.json().catch(function () { return {}; });
    if (r.status === 401) { location.replace('/admin/login?next=' + encodeURIComponent(location.pathname)); throw new Error('Signed out'); }
    if (!r.ok) { var e = new Error(d.error || 'Request failed'); e.fields = d.fields || {}; e.code = d.code; throw e; }
    return d;
  }
  function fmtDate(sql) {
    if (!sql) return '—';
    var d = new Date(sql.replace(' ', 'T') + 'Z');
    return isNaN(d) ? sql : d.toLocaleString();
  }
  function toLocalInput(sql) {
    if (!sql) return '';
    var d = new Date(sql.replace(' ', 'T') + 'Z'); if (isNaN(d)) return '';
    var p = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function badge(s) { return el('span', { class: 'badge ' + s, text: s }); }
  function confirmModal(title, text, okLabel, danger) {
    return new Promise(function (resolve) {
      var prev = document.activeElement;
      var done = function (v) { ov.remove(); document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); resolve(v); };
      var onKey = function (e) { if (e.key === 'Escape') done(false); };
      var ok = el('button', { class: 'btn ' + (danger ? 'danger' : 'primary'), text: okLabel || 'Confirm', onclick: function () { done(true); } });
      var ov = el('div', { class: 'overlay' }, el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, [
        el('h2', { text: title }), el('p', { text: text }),
        el('div', { class: 'actions' }, [el('button', { class: 'btn', text: 'Cancel', onclick: function () { done(false); } }), ok])
      ]));
      document.addEventListener('keydown', onKey);
      overlayHost().appendChild(ov); ok.focus();
    });
  }
  function scheduleModal() {
    return new Promise(function (resolve) {
      var inp = el('input', { type: 'datetime-local', id: 'sch-at', required: true });
      var done = function (v) { ov.remove(); resolve(v); };
      var ov = el('div', { class: 'overlay' }, el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Schedule' }, [
        el('h2', { text: 'Schedule publication' }), el('label', { for: 'sch-at', text: 'Go live at (your local time)' }), inp,
        el('div', { class: 'actions' }, [
          el('button', { class: 'btn', text: 'Cancel', onclick: function () { done(null); } }),
          el('button', { class: 'btn primary', text: 'Schedule', onclick: function () { done(inp.value ? new Date(inp.value).toISOString() : null); } })])
      ]));
      overlayHost().appendChild(ov); inp.focus();
    });
  }
  function field(label, input, id, hint) {
    var wrap = el('div', {}, [el('label', { for: id, text: label }), input, hint ? el('div', { class: 'hint', text: hint }) : null, el('div', { class: 'err', 'data-err': id, hidden: true })]);
    return wrap;
  }
  function showErrors(form, fields) {
    form.querySelectorAll('[data-err]').forEach(function (n) { n.hidden = true; n.textContent = ''; });
    form.querySelectorAll('.invalid').forEach(function (n) { n.classList.remove('invalid'); n.removeAttribute('aria-invalid'); });
    var first = null;
    Object.keys(fields || {}).forEach(function (k) {
      var n = form.querySelector('[data-err="f-' + k + '"]'); var i = form.querySelector('#f-' + k);
      if (n) { n.textContent = fields[k]; n.hidden = false; }
      if (i) { i.classList.add('invalid'); i.setAttribute('aria-invalid', 'true'); i.setAttribute('aria-describedby', 'f-' + k); if (!first) first = i; }
    });
    if (first) first.focus();
  }
  function pager(state, total, onChange) {
    var pages = Math.max(1, Math.ceil(total / state.limit));
    return el('div', { class: 'pager' }, [
      el('button', { class: 'btn sm', text: '← Prev', disabled: state.page <= 1, onclick: function () { state.page--; onChange(); } }),
      el('span', { class: 'muted', text: 'Page ' + state.page + ' of ' + pages + ' · ' + total + ' items' }),
      el('button', { class: 'btn sm', text: 'Next →', disabled: state.page >= pages, onclick: function () { state.page++; onChange(); } })
    ]);
  }
  function setTitle(t) {
    if (embedded) { main.appendChild(embedTabs()); return; }
    main.appendChild(el('h1', { text: t })); document.title = t + ' — CS Odisha Admin';
  }
  function embedTabs() {
    var wrap = el('div', { class: 'tabs', role: 'tablist' });
    if (!embedGroup) return wrap;
    var cur = curPath.replace(/^\//, '').split('/')[0];
    embedGroup.forEach(function (t) {
      wrap.appendChild(el('a', { class: 'tab', role: 'tab', href: '#/' + t[0], 'aria-selected': String(t[0] === cur), text: t[1] }));
    });
    return wrap;
  }

  /* ---------- uploader ---------- */
  function uploader(id, kind, current, onChange) {
    var accept = kind === 'pdf' ? 'application/pdf' : kind === 'any' ? 'application/pdf,image/jpeg,image/png,image/webp' : 'image/jpeg,image/png,image/webp';
    var status = el('div', { class: 'hint', text: current ? 'Current file: ' + current : 'No file selected' });
    var input = el('input', { type: 'file', accept: accept, id: id });
    async function send(file) {
      if (!file) return;
      var fd = new FormData(); fd.append('file', file);
      status.textContent = 'Uploading…';
      try {
        var d = await api('POST', 'media/upload', fd, true);
        status.textContent = 'Uploaded: ' + file.name + ' (' + Math.round(d.size_bytes / 1024) + ' KB)';
        onChange(d.key);
      } catch (e) { status.textContent = e.message; toast(e.message, true); }
    }
    var zone = el('div', { class: 'drop', tabindex: '0', role: 'button', 'aria-label': 'Upload ' + (kind === 'pdf' ? 'PDF' : kind === 'any' ? 'file' : 'image') + ': click or drop a file',
      onclick: function () { input.click(); },
      onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } },
      ondragover: function (e) { e.preventDefault(); zone.classList.add('over'); },
      ondragleave: function () { zone.classList.remove('over'); },
      ondrop: function (e) { e.preventDefault(); zone.classList.remove('over'); send(e.dataTransfer.files[0]); }
    }, [kind === 'any' ? 'Drop a PDF or image here or click to browse (PDF ≤ 15 MB, images ≤ 5 MB)' : kind === 'pdf' ? 'Drop a PDF here or click to browse (max 15 MB)' : 'Drop an image here or click to browse (JPEG/PNG/WebP, max 5 MB)', input]);
    input.addEventListener('change', function () { send(input.files[0]); });
    var clearBtn = el('button', { type: 'button', class: 'btn sm', text: 'Remove file', onclick: function () { onChange(''); status.textContent = 'No file selected'; } });
    return el('div', {}, [zone, status, clearBtn]);
  }

  /* ---------- dashboard / telemetry ---------- */
  function fmtBytes(n) { n = Number(n) || 0; return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB'; }
  function stat(label, value, sub) { return el('div', { class: 'card' }, [el('div', { class: 'muted', text: label }), el('div', { class: 'num cso-tabular', text: String(value) }), sub ? el('div', { class: 'muted', text: sub }) : null]); }
  async function viewDashboard() {
    setTitle('Overview');
    var res = await Promise.all([
      api('GET', 'stats'),
      api('GET', 'jobs?limit=100').catch(function () { return { items: [] }; }),
      api('GET', 'current-affairs?limit=100').catch(function () { return { items: [] }; }),
      api('GET', 'mock-tests?limit=100').catch(function () { return { items: [] }; }),
      api('GET', 'resources?limit=100').catch(function () { return { items: [] }; }),
      api('GET', 'audit?limit=100').catch(function () { return { items: [] }; })
    ]);
    var s = res[0] || {};
    var jobsList = (res[1] && res[1].items) || [];
    var caList = (res[2] && res[2].items) || [];
    var mockList = (res[3] && res[3].items) || [];
    var resList = (res[4] && res[4].items) || [];
    var auditList = (res[5] && res[5].items) || [];

    function card(label, o) { return stat(label, o.live, 'live of ' + o.total + ' total'); }
    var acc = s.accounts || {};
    main.appendChild(el('h2', { text: 'Live D1 telemetry' }));
    main.appendChild(el('div', { class: 'cards' }, [card('Current affairs', s.current_affairs), card('Job alerts', s.jobs), card('Mock tests', s.mock_tests),
      stat('Scheduled (pending)', s.scheduled_pending),
      stat('Candidate accounts', acc.total, '+' + acc.new_24h + ' today · +' + acc.new_7d + ' this week'),
      stat('Staff accounts', acc.staff, acc.active_sessions + ' active sessions'),
      stat('Media in R2', (s.media || {}).total, fmtBytes((s.media || {}).bytes)),
      stat('Syllabus / PYQ', (s.resources || {}).live, 'live of ' + (s.resources || {}).total),
      stat('Audit events (24h)', s.audit_24h),
      stat('Open incidents', s.open_incidents, s.open_incidents ? 'needs attention' : 'all clear')]));

    if (window.CSOCharts) {
      main.appendChild(el('h2', { text: 'Content analytics & engagement' }));
      var chartsGrid = el('div', { class: 'cso-charts-grid' });
      var pipeCard = el('div', { class: 'panel cso-chart-panel' });
      var actCard = el('div', { class: 'panel cso-chart-panel' });
      var catCard = el('div', { class: 'panel cso-chart-panel' });
      chartsGrid.appendChild(pipeCard);
      chartsGrid.appendChild(actCard);
      chartsGrid.appendChild(catCard);
      main.appendChild(chartsGrid);

      var allContent = jobsList.concat(caList, mockList);
      var pipeCounts = { published: 0, scheduled: 0, draft: 0, expired: 0, archived: 0 };
      allContent.forEach(function (item) {
        var k = String(item.status || 'draft').toLowerCase();
        if (Object.prototype.hasOwnProperty.call(pipeCounts, k)) pipeCounts[k] += 1;
        else pipeCounts.draft += 1;
      });
      window.CSOCharts.renderContentPipeline(pipeCard, pipeCounts, function () {
        location.hash = '#/jobs';
      });

      var now = Date.now();
      var dayBuckets = [];
      for (var dIdx = 6; dIdx >= 0; dIdx -= 1) {
        var dt = new Date(now - dIdx * 86400000);
        dayBuckets.push({
          key: dt.toISOString().slice(0, 10),
          label: dt.toLocaleDateString('en-IN', { weekday: 'short' }),
          posts: 0,
          audits: 0
        });
      }
      var bucketByKey = {};
      dayBuckets.forEach(function (bk) { bucketByKey[bk.key] = bk; });
      allContent.concat(resList).forEach(function (item) {
        var ts = String(item.updated_at || item.created_at || '').slice(0, 10);
        if (bucketByKey[ts]) bucketByKey[ts].posts += 1;
      });
      auditList.forEach(function (ev) {
        var ts = String(ev.created_at || '').slice(0, 10);
        if (bucketByKey[ts]) bucketByKey[ts].audits += 1;
      });
      window.CSOCharts.renderActivityAndCbtChart(actCard, {
        days: dayBuckets,
        attemptsTotal: s.attempts_total || 0,
        bookmarksTotal: s.bookmarks_total || 0,
        audit24h: s.audit_24h || 0,
        newCandidates7d: acc.new_7d || 0
      });

      var tracks = { OPSC: 0, OSSC: 0, OSSSC: 0, Teaching: 0, Banking: 0, SSC: 0, 'Police/Defence': 0 };
      allContent.concat(resList).forEach(function (item) {
        var txt = [item.title, item.organization, item.category, item.exam, item.tags].filter(Boolean).join(' ');
        var track = window.CSOCharts.classifyExamTrack(txt);
        tracks[track] = (tracks[track] || 0) + 1;
      });
      window.CSOCharts.renderExamCategoryChart(catCard, tracks, function () {
        location.hash = '#/jobs';
      });
    }

    var attentionItems = [];
    var nowMs = Date.now();
    var in72h = nowMs + 72 * 3600000;
    jobsList.forEach(function (j) {
      if (j.status === 'published' && j.last_date) {
        var exp = Date.parse(j.last_date);
        if (!isNaN(exp) && exp >= nowMs - 86400000 && exp <= in72h) {
          attentionItems.push({ kind: 'Expiring soon', label: j.title, meta: 'Deadline: ' + fmtDate(j.last_date), href: '#/jobs/' + j.id, badge: 'scheduled' });
        }
      }
      if (j.status === 'draft') {
        attentionItems.push({ kind: 'Draft job', label: j.title, meta: j.organization || 'Needs review', href: '#/jobs/' + j.id, badge: 'draft' });
      }
    });
    mockList.forEach(function (m) {
      if (Number(m.question_count || 0) === 0) {
        attentionItems.push({ kind: 'Empty mock test', label: m.title, meta: '0 questions added', href: '#/mock-tests/' + m.id, badge: 'draft' });
      }
    });
    if ((s.open_incidents || 0) > 0) {
      attentionItems.unshift({ kind: 'Open incidents', label: s.open_incidents + ' active operational incident(s)', meta: 'Inspect Ops Health & Diagnostics', href: '#/operations', badge: 'expired' });
    }

    main.appendChild(el('h2', { text: 'Needs attention' }));
    if (!attentionItems.length) {
      main.appendChild(el('div', { class: 'card' }, [el('p', { class: 'muted', text: 'All clear — no drafts, expiring deadlines, or empty mock tests require action.' })]));
    } else {
      var attGrid = el('div', { class: 'cso-attention-grid' });
      attentionItems.slice(0, 6).forEach(function (it) {
        attGrid.appendChild(el('div', { class: 'card cso-attention-item' }, [
          el('div', { class: 'cso-attention-head' }, [badge(it.badge), el('span', { class: 'hint', text: it.kind })]),
          el('strong', { text: it.label }),
          el('div', { class: 'hint', text: it.meta }),
          el('div', { class: 'actions' }, [el('a', { class: 'btn sm', href: it.href, text: 'Review' })])
        ]));
      });
      main.appendChild(attGrid);
    }

    var b = s.banner || {};
    main.appendChild(el('h2', { text: 'Homepage broadcast banner' }));
    main.appendChild(el('div', { class: 'card' }, [
      el('div', {}, [badge(b.active ? 'published' : 'draft'), ' ', el('strong', { text: b.active ? b.headline : 'No banner is live on the homepage' })]),
      el('div', { class: 'actions' }, [el('a', { class: 'btn sm', href: '#/banner', text: b.active ? 'Edit / deactivate banner' : 'Compose banner' })])]));
    var cr = s.last_cron_run || {};
    var cronSub = cr.ran_at
      ? 'Last run: ' + fmtDate(cr.ran_at) + ' · Promoted: ' + (cr.promoted || 0) + ' · Expired jobs: ' + (cr.expired || 0) + ' · Cleaned rows: ' + (cr.cleaned || 0)
      : 'No maintenance run recorded yet (Cron schedule: */15 * * * *)';
    var cronActions = [];
    if (me && me.role === 'admin') {
      var runBtn = el('button', {
        type: 'button',
        class: 'btn sm primary',
        text: 'Run maintenance now',
        onclick: async function () {
          runBtn.disabled = true;
          runBtn.textContent = 'Running…';
          try {
            var res = await api('POST', 'maintenance/run', {});
            toast('Maintenance complete: ' + (res.promoted || 0) + ' promoted, ' + (res.expired || 0) + ' expired, ' + (res.cleaned || 0) + ' cleaned');
            clear(main);
            await viewDashboard();
          } catch (err) {
            toast(err.message, true);
            runBtn.disabled = false;
            runBtn.textContent = 'Run maintenance now';
          }
        }
      });
      cronActions.push(runBtn);
    }
    main.appendChild(el('h2', { text: 'Cron lifecycle & D1 maintenance' }));
    main.appendChild(el('div', { class: 'card' }, [
      el('div', {}, [badge(cr.ran_at ? 'published' : 'scheduled'), ' ', el('strong', { text: 'Automated 15-minute Worker Cron Trigger (*/15 * * * *)' })]),
      el('div', { class: 'muted', text: cronSub }),
      cronActions.length ? el('div', { class: 'actions' }, cronActions) : null
    ]));
    main.appendChild(el('h2', { text: 'Recent activity' }));
    main.appendChild(auditTable(s.recent_audit));
  }
  function auditTable(items) {
    var tb = el('tbody');
    items.forEach(function (a) {
      var sev = /^incident\.(high|critical)/.test(a.action) ? 'bad' : '';
      tb.appendChild(el('tr', {}, [el('td', { text: fmtDate(a.created_at) }), el('td', { text: a.actor_email || '—' }), el('td', { class: sev, text: a.action }),
        el('td', { text: (a.target_type || '') + (a.target_id ? ' ' + String(a.target_id).slice(0, 8) : '') }), el('td', { text: a.metadata_json || '' })]));
    });
    if (!items.length) tb.appendChild(el('tr', {}, el('td', { colspan: '5', class: 'muted', text: 'No activity yet.' })));
    return el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [el('caption', { class: 'muted', text: 'Audit log' }),
      el('thead', {}, el('tr', {}, ['When', 'Who', 'Action', 'Target', 'Details'].map(function (h) { return el('th', { scope: 'col', text: h }); }))), tb]));
  }
  async function viewAudit(kind) {
    setTitle('Audit log');
    var st = { page: 1, limit: 25, kind: kind || 'all', q: '' }; var box = el('div'); var t;
    var sel = el('select', { 'aria-label': 'Event type' }, [['all', 'All events'], ['content', 'Content & media'], ['security', 'Security (roles + incidents)'], ['incident', 'Incidents only']]
      .map(function (o) { return el('option', { value: o[0], text: o[1], selected: o[0] === st.kind }); }));
    var q = el('input', { type: 'search', placeholder: 'Filter by action or actor…', 'aria-label': 'Filter audit events' });
    sel.addEventListener('change', function () { st.kind = sel.value; st.page = 1; load(); });
    q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { st.q = q.value; st.page = 1; load(); }, 300); });
    var live = el('button', { class: 'btn sm', text: 'Refresh', onclick: function () { load(); } });
    main.appendChild(el('div', { class: 'toolbar' }, [sel, q, live])); main.appendChild(box);
    async function load() {
      var d = await api('GET', 'audit?page=' + st.page + '&limit=' + st.limit + '&kind=' + st.kind + '&q=' + encodeURIComponent(st.q));
      clear(box).appendChild(auditTable(d.items)); box.appendChild(pager(st, d.total, load));
    }
    await load();
  }

  /* ---------- incidents ---------- */
  async function viewIncidents() {
    setTitle('Incidents');
    var st = { page: 1, limit: 20 }; var box = el('div'); var form = el('form', { novalidate: true, class: 'panel' });
    var sev = el('select', { id: 'f-severity' }, ['low', 'medium', 'high', 'critical'].map(function (x) { return el('option', { value: x, text: x }); }));
    var title = el('input', { id: 'f-title', type: 'text', maxlength: '150' });
    var details = el('textarea', { id: 'f-details' });
    var save = el('button', { type: 'submit', class: 'btn primary', text: 'Log incident' });
    form.appendChild(el('h2', { text: 'Log a new incident' }));
    form.appendChild(el('div', { class: 'grid2' }, [field('Severity', sev, 'f-severity'), field('Title', title, 'f-title')]));
    form.appendChild(field('Details', details, 'f-details'));
    form.appendChild(el('div', { class: 'actions' }, save));
    form.addEventListener('submit', async function (e) {
      e.preventDefault(); save.disabled = true; showErrors(form, {});
      try { await api('POST', 'incidents', { severity: sev.value, title: title.value, details: details.value }); toast('Incident logged'); title.value = ''; details.value = ''; st.page = 1; await load(); }
      catch (err) { showErrors(form, err.fields); toast(err.message, true); }
      save.disabled = false;
    });
    main.appendChild(form); main.appendChild(box);
    async function load() {
      var d = await api('GET', 'incidents?page=' + st.page + '&limit=' + st.limit); var tb = el('tbody');
      d.items.forEach(function (i) {
        var act = i.resolved ? el('span', { class: 'muted', text: 'Resolved' }) : el('button', { class: 'btn sm', text: 'Mark resolved', onclick: async function () {
          try { await api('POST', 'incidents/' + i.id + '/resolve', {}); toast('Incident resolved'); load(); } catch (e) { toast(e.message, true); } } });
        tb.appendChild(el('tr', {}, [el('td', { text: fmtDate(i.created_at) }), el('td', {}, el('span', { class: 'badge sev-' + i.severity, text: i.severity })),
          el('td', {}, [el('strong', { text: i.title }), i.details ? el('div', { class: 'hint', text: i.details }) : null]), el('td', { text: i.actor_email || '—' }), el('td', {}, act)]));
      });
      if (!d.items.length) tb.appendChild(el('tr', {}, el('td', { colspan: '5', class: 'muted', text: 'No incidents logged.' })));
      clear(box).appendChild(el('p', { class: d.open ? 'bad' : 'muted', text: d.open + ' open incident(s)' }));
      box.appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [el('caption', { class: 'muted', text: 'Incident stream' }),
        el('thead', {}, el('tr', {}, ['When', 'Severity', 'Incident', 'Reported by', 'Status'].map(function (h) { return el('th', { scope: 'col', text: h }); }))), tb])));
      box.appendChild(pager(st, d.total, load));
    }
    await load();
  }

  /* ---------- homepage live broadcast banner ---------- */
  async function viewBanner() {
    setTitle('Homepage banner');
    var b = await api('GET', 'banner');
    var form = el('form', { novalidate: true, class: 'panel' });
    var active = el('input', { id: 'f-active', type: 'checkbox' }); active.checked = !!b.active;
    var headline = el('input', { id: 'f-headline', type: 'text', maxlength: '160' }); headline.value = b.headline || '';
    var context = el('textarea', { id: 'f-context' }); context.value = b.context || '';
    var sev = el('select', { id: 'f-severity' }, [['info', 'Info (green)'], ['notice', 'Notice (amber)'], ['urgent', 'Urgent (red)']].map(function (o) { return el('option', { value: o[0], text: o[1], selected: b.severity === o[0] }); }));
    var ctaText = el('input', { id: 'f-ctaText', type: 'text', maxlength: '40' }); ctaText.value = b.ctaText || '';
    var ctaUrl = el('input', { id: 'f-ctaUrl', type: 'text', maxlength: '500', placeholder: '/jobs-careers/ or https://…' }); ctaUrl.value = b.ctaUrl || '';
    var preview = el('div', { class: 'banner-preview', 'aria-live': 'polite' });
    function renderPreview() {
      clear(preview);
      if (!headline.value) { preview.appendChild(el('span', { class: 'muted', text: 'Preview appears here' })); return; }
      preview.className = 'banner-preview sev-' + sev.value;
      preview.appendChild(el('strong', { text: headline.value }));
      if (context.value) preview.appendChild(el('span', { text: ' ' + context.value }));
      if (ctaText.value) preview.appendChild(el('span', { class: 'cta', text: ' ' + ctaText.value + ' →' }));
    }
    [headline, context, sev, ctaText].forEach(function (i) { i.addEventListener('input', renderPreview); i.addEventListener('change', renderPreview); });
    renderPreview();
    var save = el('button', { type: 'submit', class: 'btn primary', text: 'Save & publish to homepage' });
    form.appendChild(el('div', {}, [el('label', { class: 'check' }, [active, ' Banner is live on csodisha.com'])]));
    form.appendChild(field('Headline', headline, 'f-headline'));
    form.appendChild(field('Context (optional)', context, 'f-context'));
    form.appendChild(el('div', { class: 'grid2' }, [field('Severity', sev, 'f-severity'), el('div')]));
    form.appendChild(el('div', { class: 'grid2' }, [field('Button text', ctaText, 'f-ctaText'), field('Button link', ctaUrl, 'f-ctaUrl')]));
    form.appendChild(el('h2', { text: 'Live banner preview' })); form.appendChild(preview);

    var seoTitle = el('input', { id: 'f-seo-title', type: 'text', maxlength: '90', placeholder: 'CSOdisha — Odisha Exam & Job Alerts Portal' });
    seoTitle.value = headline.value ? headline.value + ' | CSOdisha' : 'CSOdisha — Odisha Exam & Job Alerts Portal';
    var seoDesc = el('textarea', { id: 'f-seo-desc', maxlength: '220', placeholder: 'Official Odisha govt job notifications, OPSC/OSSC/OSSSC mock tests, daily current affairs & syllabus PDFs.' });
    seoDesc.value = context.value || 'Official Odisha govt job notifications, OPSC/OSSC/OSSSC mock tests, daily current affairs & syllabus PDFs.';
    var seoCount = el('div', { class: 'hint' });
    var seoSnippet = el('div', { class: 'cso-seo-snippet' });
    function renderSeoPreview() {
      var tVal = (seoTitle.value || '').trim();
      var dVal = (seoDesc.value || '').trim();
      seoCount.textContent = 'Title: ' + tVal.length + '/60 chars · Meta description: ' + dVal.length + '/160 chars';
      seoCount.className = (tVal.length > 60 || dVal.length > 160) ? 'hint cso-warn-text' : 'hint';
      clear(seoSnippet);
      seoSnippet.appendChild(el('div', { class: 'cso-seo-url', text: 'https://csodisha.com › ' + (ctaUrl.value ? ctaUrl.value.replace(/^\/+/, '') : '') }));
      seoSnippet.appendChild(el('div', { class: 'cso-seo-title', text: tVal || 'CSOdisha — Odisha Exam Portal' }));
      seoSnippet.appendChild(el('div', { class: 'cso-seo-desc', text: dVal || 'Live Odisha exam alerts, mock tests, and daily current affairs.' }));
    }
    [seoTitle, seoDesc, ctaUrl].forEach(function (inp) { inp.addEventListener('input', renderSeoPreview); });
    renderSeoPreview();
    form.appendChild(el('h2', { text: 'Google search snippet preview' }));
    form.appendChild(el('div', { class: 'grid2' }, [field('SEO Title preview', seoTitle, 'f-seo-title'), field('Meta description preview', seoDesc, 'f-seo-desc')]));
    form.appendChild(seoCount);
    form.appendChild(seoSnippet);

    form.appendChild(el('p', { class: 'hint', text: b.updatedAt ? 'Last saved ' + fmtDate(b.updatedAt) + ' (UTC server time). Visitors see changes within ~15 seconds.' : 'Never published.' }));
    form.appendChild(el('div', { class: 'actions' }, [save, el('a', { class: 'btn', href: '/', target: '_blank', rel: 'noopener', text: 'Open homepage' })]));
    form.addEventListener('submit', async function (e) {
      e.preventDefault(); save.disabled = true; showErrors(form, {});
      try { await api('PUT', 'banner', { active: active.checked, headline: headline.value, context: context.value, severity: sev.value, ctaText: ctaText.value, ctaUrl: ctaUrl.value }); toast(active.checked ? 'Banner is live' : 'Banner saved (inactive)'); }
      catch (err) { showErrors(form, err.fields); toast(err.message, true); }
      save.disabled = false;
    });
    main.appendChild(form);
  }

  /* ---------- media library (R2) ---------- */
  async function viewMedia() {
    setTitle('Media');
    var st = { page: 1, limit: 24, kind: '' }; var box = el('div');
    var sel = el('select', { 'aria-label': 'Filter by type' }, [['', 'All files'], ['image', 'Images'], ['pdf', 'PDFs']].map(function (o) { return el('option', { value: o[0], text: o[1] }); }));
    sel.addEventListener('change', function () { st.kind = sel.value; st.page = 1; load(); });
    main.appendChild(el('div', { class: 'panel' }, [el('label', { text: 'Upload to R2' }),
      uploader('f-media-up', 'any', '', function (k) { if (k) { toast('Uploaded'); load(); } })]));
    main.appendChild(el('div', { class: 'toolbar' }, sel)); main.appendChild(box);
    async function load() {
      var d = await api('GET', 'media?page=' + st.page + '&limit=' + st.limit + (st.kind ? '&kind=' + st.kind : '')); var tb = el('tbody');
      d.items.forEach(function (m) {
        tb.appendChild(el('tr', {}, [el('td', {}, el('a', { href: m.url, target: '_blank', rel: 'noopener', text: m.original_name || m.object_key })), el('td', { text: m.kind }), el('td', { text: fmtBytes(m.size_bytes) }), el('td', { text: fmtDate(m.created_at) }),
          el('td', {}, el('code', { text: m.object_key.slice(0, 13) + '…' }))]));
      });
      if (!d.items.length) tb.appendChild(el('tr', {}, el('td', { colspan: '5', class: 'muted', text: 'No files uploaded yet.' })));
      clear(box).appendChild(el('p', { class: 'muted', text: d.total + ' files · ' + fmtBytes(d.total_bytes) + ' stored in R2' }));
      box.appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [el('thead', {}, el('tr', {}, ['File', 'Type', 'Size', 'Uploaded', 'Key'].map(function (h) { return el('th', { scope: 'col', text: h }); }))), tb])));
      box.appendChild(pager(st, d.total, load));
    }
    await load();
  }

  /* ---------- syllabus & PYQ resources (R2 PDF / image) ---------- */
  async function viewResources(kind) {
    var label = kind === 'syllabus' ? 'Syllabus & exam patterns' : 'Previous-year questions (PYQ)';
    setTitle(label);
    var st = { page: 1, limit: 20, q: '' }; var box = el('div'); var t;
    var q = el('input', { type: 'search', placeholder: 'Search title or exam…', 'aria-label': 'Search' });
    q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { st.q = q.value; st.page = 1; load(); }, 300); });
    main.appendChild(el('div', { class: 'toolbar' }, [q, el('span', { class: 'spacer' }), el('button', { class: 'btn primary', text: '+ Add ' + (kind === 'syllabus' ? 'syllabus' : 'question paper'), onclick: function () { form(null); } })]));
    main.appendChild(box);
    function form(item) {
      var isNew = !item; var key = item ? item.media_key : '';
      var f = el('form', { novalidate: true });
      var title = el('input', { id: 'f-title', type: 'text' }); title.value = item ? item.title : '';
      var exam = el('input', { id: 'f-exam', type: 'text', placeholder: 'e.g. OSSC CGL' }); exam.value = item ? item.exam || '' : '';
      var year = el('input', { id: 'f-year', type: 'number', min: '1990', max: '2100' }); year.value = item && item.year ? item.year : '';
      var desc = el('textarea', { id: 'f-description' }); desc.value = item ? item.description || '' : '';
      var st2 = el('select', { id: 'f-status' }, ['draft', 'published'].map(function (x) { return el('option', { value: x, text: x[0].toUpperCase() + x.slice(1), selected: item && item.status === x }); }));
      var resPrev = el('div', { class: 'cso-preview-card', 'aria-live': 'polite' });
      var r2Status = el('div', { class: 'hint', text: key ? 'R2 key: ' + key : 'No file uploaded yet' });
      function updateResPrev() {
        clear(resPrev);
        resPrev.appendChild(el('div', { class: 'cso-preview-kicker', text: (kind === 'syllabus' ? 'SYLLABUS' : 'PYQ PAPER') + (exam.value ? ' · ' + exam.value : '') + (year.value ? ' (' + year.value + ')' : '') }));
        resPrev.appendChild(el('strong', { text: title.value || 'Untitled resource' }));
        if (desc.value) resPrev.appendChild(el('p', { class: 'muted', text: desc.value }));
        resPrev.appendChild(el('div', { class: 'actions' }, [badge(st2.value), key ? el('span', { class: 'hint', text: 'PDF/Scan attached' }) : el('span', { class: 'hint', text: 'Attach a file above' })]));
      }
      async function checkR2Url(url) {
        if (!url) { r2Status.textContent = 'No file URL yet (save or upload first)'; return; }
        r2Status.textContent = 'Checking R2 file availability…';
        try {
          var r = await fetch(url, { method: 'HEAD', credentials: 'same-origin' });
          r2Status.textContent = r.ok ? 'R2 file reachable (HTTP ' + r.status + ')' : 'R2 check returned HTTP ' + r.status;
        } catch (e) {
          r2Status.textContent = 'R2 file check unavailable offline';
        }
      }
      [title, exam, year, desc, st2].forEach(function (inp) { inp.addEventListener('input', updateResPrev); inp.addEventListener('change', updateResPrev); });
      updateResPrev();
      if (item && item.file_url) checkR2Url(item.file_url);
      var save = el('button', { type: 'submit', class: 'btn primary', text: 'Save' });
      var ov;
      f.appendChild(el('h2', { text: (isNew ? 'Add ' : 'Edit ') + (kind === 'syllabus' ? 'syllabus' : 'question paper') }));
      f.appendChild(field('Title', title, 'f-title')); f.appendChild(el('div', { class: 'grid2' }, [field('Exam', exam, 'f-exam'), field('Year', year, 'f-year')]));
      f.appendChild(field('Description', desc, 'f-description'));
      f.appendChild(el('div', {}, [el('label', { text: 'File (PDF, or image scan)' }), uploader('f-media_key-up', 'any', key, function (k) { key = k; r2Status.textContent = k ? 'Uploaded R2 key: ' + k : 'No file'; updateResPrev(); }), el('div', { class: 'err', 'data-err': 'f-media_key', hidden: true }), r2Status]));
      f.appendChild(field('Status', st2, 'f-status'));
      f.appendChild(el('h3', { text: 'Live candidate resource card preview' }));
      f.appendChild(resPrev);
      f.appendChild(el('div', { class: 'actions' }, [save, el('button', { type: 'button', class: 'btn', text: 'Cancel', onclick: function () { ov.remove(); } })]));
      f.addEventListener('submit', async function (e) {
        e.preventDefault(); save.disabled = true; showErrors(f, {});
        var body = { kind: kind, title: title.value, exam: exam.value, year: year.value, description: desc.value, media_key: key, status: st2.value };
        try { if (isNew) await api('POST', 'resources', body); else await api('PUT', 'resources/' + item.id, body); toast('Saved'); ov.remove(); load(); }
        catch (err) { showErrors(f, err.fields); toast(err.message, true); }
        save.disabled = false;
      });
      ov = el('div', { class: 'overlay' }, el('div', { class: 'modal wide', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Resource' }, f));
      overlayHost().appendChild(ov); title.focus();
    }
    async function del(r) {
      if (!(await confirmModal('Delete "' + r.title + '"?', 'It will be removed from the site.', 'Delete', true))) return;
      try { await api('DELETE', 'resources/' + r.id); toast('Deleted'); load(); } catch (e) { toast(e.message, true); }
    }
    async function load() {
      var d = await api('GET', 'resources?kind=' + kind + '&page=' + st.page + '&limit=' + st.limit + '&q=' + encodeURIComponent(st.q)); var tb = el('tbody');
      d.items.forEach(function (r) {
        tb.appendChild(el('tr', {}, [el('td', { text: r.title }), el('td', { text: r.exam || '—' }), el('td', { text: r.year || '—' }), el('td', {}, badge(r.status)), el('td', { text: fmtDate(r.updated_at) }),
          el('td', {}, el('div', { class: 'actions' }, [el('a', { class: 'btn sm', href: r.file_url, target: '_blank', rel: 'noopener', text: 'Open file' }), el('button', { class: 'btn sm', text: 'Edit', onclick: function () { form(r); } }),
            el('button', { class: 'btn sm danger', text: 'Delete', 'aria-label': 'Delete ' + r.title, onclick: function () { del(r); } })]))]));
      });
      if (!d.items.length) tb.appendChild(el('tr', {}, el('td', { colspan: '6', class: 'muted', text: 'Nothing here yet.' })));
      clear(box).appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [el('caption', { class: 'muted', text: label }),
        el('thead', {}, el('tr', {}, ['Title', 'Exam', 'Year', 'Status', 'Updated', 'Actions'].map(function (h) { return el('th', { scope: 'col', text: h }); }))), tb])));
      box.appendChild(pager(st, d.total, load));
    }
    await load();
  }

  /* ---------- generic list ---------- */
  var TYPES = {
    'current-affairs': { label: 'Current Affairs', path: 'current-affairs', cols: ['Title', 'Category', 'Date', 'Status', 'Updated'], row: function (r) { return [r.title, r.category || '—', r.event_date || '—']; } },
    jobs: { label: 'Job Alerts', path: 'jobs', cols: ['Title', 'Organisation', 'Last date', 'Status', 'Updated'], row: function (r) { return [r.title, r.organisation || '—', r.last_date || '—']; } },
    'mock-tests': { label: 'Mock Tests', path: 'mock-tests', cols: ['Title', 'Exam', 'Questions', 'Status', 'Updated'], row: function (r) { return [r.title, r.target_exam || '—', String(r.question_count)]; } }
  };
  async function viewList(key) {
    var T = TYPES[key]; setTitle(T.label);
    var st = { page: 1, limit: 20, q: '', status: '' };
    var q = el('input', { type: 'search', placeholder: 'Search…', 'aria-label': 'Search' });
    var sel = el('select', { 'aria-label': 'Filter by status' }, [['', 'All statuses'], ['draft', 'Draft'], ['published', 'Published'], ['scheduled', 'Scheduled'], ['expired', 'Expired'], ['archived', 'Archived']].map(function (o) { return el('option', { value: o[0], text: o[1] }); }));
    var box = el('div');
    var bulkBar = el('div', { class: 'cso-bulk-bar', hidden: true });
    var selectedIds = {};
    var t;
    q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { st.q = q.value; st.page = 1; load(); }, 300); });
    sel.addEventListener('change', function () { st.status = sel.value; st.page = 1; load(); });
    main.appendChild(el('div', { class: 'toolbar' }, [q, sel, el('span', { class: 'spacer' }), el('a', { class: 'btn primary', href: '#/' + key + '/new', text: '+ New' })]));
    main.appendChild(bulkBar);
    main.appendChild(box);
    function updateBulkBar() {
      var ids = Object.keys(selectedIds).filter(function (id) { return selectedIds[id]; });
      clear(bulkBar);
      bulkBar.hidden = ids.length === 0;
      if (!ids.length) return;
      bulkBar.appendChild(el('strong', { text: ids.length + ' selected' }));
      bulkBar.appendChild(el('button', { type: 'button', class: 'btn sm primary', text: 'Bulk Publish', onclick: function () { bulkStatus(ids, 'published'); } }));
      bulkBar.appendChild(el('button', { type: 'button', class: 'btn sm', text: 'Bulk Archive', onclick: function () { bulkStatus(ids, 'archived'); } }));
      bulkBar.appendChild(el('button', { type: 'button', class: 'btn sm', text: 'Clear', onclick: function () { selectedIds = {}; load(); } }));
    }
    async function bulkStatus(ids, status) {
      try {
        await Promise.all(ids.map(function (id) { return api('POST', T.path + '/' + id + '/status', { status: status }); }));
        toast(ids.length + ' item(s) marked ' + status);
        selectedIds = {};
        load();
      } catch (e) { toast(e.message, true); }
    }
    async function duplicateRow(r) {
      try {
        var full = await api('GET', T.path + '/' + r.id);
        var copy = Object.assign({}, full);
        delete copy.id;
        delete copy.created_at;
        delete copy.updated_at;
        copy.title = (copy.title || 'Untitled') + ' (Copy)';
        copy.slug = (copy.slug || 'copy') + '-copy-' + String(Date.now()).slice(-4);
        copy.status = 'draft';
        await api('POST', T.path, copy);
        toast('Duplicated as draft');
        load();
      } catch (e) { toast(e.message, true); }
    }
    async function extendDeadline(r) {
      try {
        var full = await api('GET', T.path + '/' + r.id);
        var base = full.last_date ? new Date(full.last_date) : new Date();
        if (isNaN(base.getTime())) base = new Date();
        base.setDate(base.getDate() + 7);
        full.last_date = base.toISOString().slice(0, 10);
        if (full.status === 'expired') full.status = 'published';
        await api('PUT', T.path + '/' + r.id, full);
        toast('Deadline extended to ' + full.last_date);
        load();
      } catch (e) { toast(e.message, true); }
    }
    async function act(r, status) {
      try {
        var body = { status: status };
        if (status === 'scheduled') { var at = await scheduleModal(); if (!at) return; body.published_at = at; }
        await api('POST', T.path + '/' + r.id + '/status', body); toast('Updated'); load();
      } catch (e) { toast(e.message, true); }
    }
    async function del(r) {
      if (!(await confirmModal('Delete "' + r.title + '"?', 'It will be removed from the site and can only be restored by a database admin.', 'Delete', true))) return;
      try { await api('DELETE', T.path + '/' + r.id); toast('Deleted'); load(); } catch (e) { toast(e.message, true); }
    }
    async function load() {
      try {
        var d = await api('GET', T.path + '?page=' + st.page + '&limit=' + st.limit + '&q=' + encodeURIComponent(st.q) + '&status=' + st.status);
        var tb = el('tbody');
        var allCheck = el('input', { type: 'checkbox', 'aria-label': 'Select all rows' });
        allCheck.addEventListener('change', function () {
          d.items.forEach(function (item) { selectedIds[item.id] = allCheck.checked; });
          load();
        });
        d.items.forEach(function (r) {
          var cb = el('input', { type: 'checkbox', 'aria-label': 'Select ' + r.title });
          cb.checked = !!selectedIds[r.id];
          cb.addEventListener('change', function () { selectedIds[r.id] = cb.checked; updateBulkBar(); });
          var a = [el('a', { class: 'btn sm', href: '#/' + key + '/' + r.id, text: 'Edit' })];
          if (r.status !== 'published') a.push(el('button', { class: 'btn sm', text: 'Publish', onclick: function () { act(r, 'published'); } }));
          if (r.status === 'published') a.push(el('button', { class: 'btn sm', text: 'Unpublish', onclick: function () { act(r, 'draft'); } }));
          if (key === 'jobs') a.push(el('button', { class: 'btn sm', text: '+7d Deadline', onclick: function () { extendDeadline(r); } }));
          a.push(el('button', { class: 'btn sm', text: 'Duplicate', onclick: function () { duplicateRow(r); } }));
          a.push(el('button', { class: 'btn sm', text: 'Schedule', onclick: function () { act(r, 'scheduled'); } }));
          if (r.status !== 'archived') a.push(el('button', { class: 'btn sm', text: 'Archive', onclick: function () { act(r, 'archived'); } }));
          a.push(el('button', { class: 'btn sm danger', text: 'Delete', 'aria-label': 'Delete ' + r.title, onclick: function () { del(r); } }));
          var cells = [el('td', {}, cb)].concat(T.row(r).map(function (c) { return el('td', { text: c }); }));
          cells.push(el('td', {}, [badge(r.status), r.status === 'scheduled' ? el('div', { class: 'hint', text: fmtDate(r.published_at) }) : null]));
          cells.push(el('td', { text: fmtDate(r.updated_at) })); cells.push(el('td', {}, el('div', { class: 'actions' }, a)));
          tb.appendChild(el('tr', {}, cells));
        });
        if (!d.items.length) {
          var singularLabel = T.label.replace(/s$/, '');
          tb.appendChild(el('tr', {}, el('td', { colspan: '7', class: 'muted' }, el('div', { class: 'cso-empty-state' }, [
            el('div', { text: 'No ' + T.label.toLowerCase() + ' found matching the current filter.' }),
            el('a', { class: 'btn sm primary', href: '#/' + key + '/new', text: '+ Create New ' + singularLabel })
          ]))));
        }
        allCheck.checked = d.items.length > 0 && d.items.every(function (item) { return !!selectedIds[item.id]; });
        updateBulkBar();
        clear(box).appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [el('caption', { class: 'muted', text: T.label }),
          el('thead', {}, el('tr', {}, [el('th', { scope: 'col' }, allCheck)].concat(T.cols.concat(['Actions']).map(function (h) { return el('th', { scope: 'col', text: h }); })))), tb])));
        box.appendChild(pager(st, d.total, load));
      } catch (e) { toast(e.message, true); }
    }
    await load();
  }

  /* ---------- status block (shared by post + mock forms) ---------- */
  function statusBlock(item) {
    var sel = el('select', { id: 'f-status' }, ['draft', 'published', 'scheduled'].map(function (s) { return el('option', { value: s, text: s[0].toUpperCase() + s.slice(1), selected: (item && item.status) === s }); }));
    var at = el('input', { type: 'datetime-local', id: 'f-published_at', value: toLocalInput(item && item.published_at) });
    var atWrap = field('Go live at (your local time)', at, 'f-published_at');
    function sync() { atWrap.hidden = sel.value !== 'scheduled'; }
    sel.addEventListener('change', sync); sync();
    return { node: el('div', { class: 'grid2' }, [field('Status', sel, 'f-status'), atWrap]), get: function () {
      var o = { status: sel.value }; if (sel.value === 'scheduled') o.published_at = at.value ? new Date(at.value).toISOString() : '';
      return o; } };
  }

  /* ---------- post form ---------- */
  var POST_FIELDS = {
    'current-affairs': [['title', 'Title', 'text'], ['title_or', 'Title (Odia, optional)', 'text'], ['slug', 'Slug', 'text', 'Leave blank to generate from the title'], ['event_date', 'Date', 'date'], ['category', 'Category', 'text'], ['tags', 'Tags', 'tags', 'Comma-separated, max 10'], ['summary', 'Summary', 'area'], ['summary_or', 'Summary (Odia)', 'area'], ['body_md', 'Body (Markdown)', 'md'], ['body_md_or', 'Body (Odia, Markdown)', 'md'], ['cover_media_key', 'Cover image', 'image']],
    jobs: [['title', 'Title', 'text'], ['title_or', 'Title (Odia, optional)', 'text'], ['slug', 'Slug', 'text', 'Leave blank to generate from the title'], ['organisation', 'Organisation', 'text', 'e.g. OPSC, OSSC, OSSSC'], ['vacancies', 'Total vacancies', 'number'], ['qualification', 'Qualification', 'area'], ['last_date', 'Last date to apply', 'date'], ['apply_url', 'Official apply URL', 'url'], ['category', 'Category', 'text'], ['state', 'State', 'text'], ['tags', 'Tags', 'tags'], ['summary', 'Summary', 'area'], ['body_md', 'Details (Markdown)', 'md'], ['body_md_or', 'Details (Odia, Markdown)', 'md'], ['cover_media_key', 'Cover image', 'image'], ['notification_media_key', 'Notification PDF', 'pdf']]
  };
  function parseImportantDates(md) {
    var rows = [];
    var m = String(md || '').match(/## Important Dates\s*\n([\s\S]*?)(?=\n## |\s*$)/);
    if (!m) return rows;
    m[1].split('\n').forEach(function (line) {
      var lm = line.match(/^-\s*\*\*([^*]+)\*\*:\s*(.+)$/);
      if (lm) rows.push({ label: lm[1].trim(), date: lm[2].trim() });
    });
    return rows;
  }
  function syncImportantDatesMd(md, rows) {
    var clean = String(md || '').replace(/\n?## Important Dates\s*\n[\s\S]*?(?=\n## |\s*$)/, '').trim();
    var valid = rows.filter(function (r) { return r.label.trim() || r.date.trim(); });
    if (!valid.length) return clean;
    var sec = '## Important Dates\n' + valid.map(function (r) { return '- **' + (r.label.trim() || 'Milestone') + '**: ' + (r.date.trim() || 'TBA'); }).join('\n');
    return clean ? clean + '\n\n' + sec : sec;
  }

  async function viewPostForm(key, id) {
    var T = TYPES[key]; var isNew = id === 'new';
    var item = isNew ? { tags: [], state: key === 'jobs' ? 'Odisha' : '', status: 'draft' } : await api('GET', T.path + '/' + id);
    setTitle((isNew ? 'New ' : 'Edit ') + T.label.replace(/s$/, ''));
    var form = el('form', { novalidate: true }); var getters = {};
    var left = el('div', { class: 'panel' });
    var previewPane = el('aside', { class: 'panel cso-preview-pane', 'aria-live': 'polite' });
    var splitWrap = el('div', { class: 'cso-split-editor' }, [left, previewPane]);
    var previewVisible = true;
    var toggleBtn = el('button', { type: 'button', class: 'btn sm', text: 'Hide Live Preview', onclick: function () {
      previewVisible = !previewVisible;
      previewPane.hidden = !previewVisible;
      toggleBtn.textContent = previewVisible ? 'Hide Live Preview' : 'Show Live Preview';
    } });

    var dateRows = key === 'jobs' ? parseImportantDates(item.body_md) : [];
    var schedulePreviewRender = function () {};

    POST_FIELDS[key].forEach(function (f) {
      var name = f[0], type = f[2], fid = 'f-' + name, val = item[name];
      if (type === 'image' || type === 'pdf') {
        var cur = val || '';
        getters[name] = function () { return cur; };
        left.appendChild(el('div', {}, [el('label', { text: f[1] }), uploader(fid, type, cur, function (k) { cur = k; schedulePreviewRender(); }), el('div', { class: 'err', 'data-err': fid, hidden: true })]));
      } else if (type === 'md') {
        var ta = el('textarea', { id: fid, class: 'tall' }); ta.value = val || '';
        var prev = el('div', { class: 'preview', 'aria-live': 'polite' }); var t;
        function render() { api('POST', 'preview', { markdown: ta.value }).then(function (d) { renderSanitizedHtml(prev, d.html); }).catch(function () {}); }
        ta.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { render(); schedulePreviewRender(); }, 350); });
        getters[name] = function () { return ta.value; }; render();
        left.appendChild(el('div', {}, [el('label', { for: fid, text: f[1] }), el('div', { class: 'grid2' }, [ta, prev]), el('div', { class: 'err', 'data-err': fid, hidden: true })]));
      } else {
        var inp = type === 'area' ? el('textarea', { id: fid }) : el('input', { id: fid, type: type === 'tags' ? 'text' : type });
        inp.value = type === 'tags' ? (val || []).join(', ') : (val === null || val === undefined ? '' : val);
        inp.addEventListener('input', function () { schedulePreviewRender(); });
        inp.addEventListener('change', function () { schedulePreviewRender(); });
        getters[name] = function () { return inp.value; };
        left.appendChild(field(f[1], inp, fid, f[3]));
      }
    });

    if (key === 'jobs') {
      var datesList = el('div', { class: 'cso-repeat-list' });
      function renderDateRows() {
        clear(datesList);
        if (!dateRows.length) {
          datesList.appendChild(el('div', { class: 'hint', text: 'No important dates added yet. Use "+ Add Date Row" to build structured timelines without raw Markdown.' }));
        }
        dateRows.forEach(function (row, idx) {
          var lbl = el('input', { type: 'text', placeholder: 'e.g. Application Start / Exam Date', 'aria-label': 'Date label ' + (idx + 1) });
          lbl.value = row.label;
          lbl.addEventListener('input', function () { row.label = lbl.value; schedulePreviewRender(); });
          var dt = el('input', { type: 'date', 'aria-label': 'Date value ' + (idx + 1) });
          dt.value = row.date;
          dt.addEventListener('input', function () { row.date = dt.value; schedulePreviewRender(); });
          var upBtn = el('button', { type: 'button', class: 'btn sm', text: '↑', 'aria-label': 'Move date row up', disabled: idx === 0, onclick: function () {
            var tmp = dateRows[idx - 1]; dateRows[idx - 1] = dateRows[idx]; dateRows[idx] = tmp; renderDateRows(); schedulePreviewRender();
          } });
          var dnBtn = el('button', { type: 'button', class: 'btn sm', text: '↓', 'aria-label': 'Move date row down', disabled: idx === dateRows.length - 1, onclick: function () {
            var tmp = dateRows[idx + 1]; dateRows[idx + 1] = dateRows[idx]; dateRows[idx] = tmp; renderDateRows(); schedulePreviewRender();
          } });
          var rmBtn = el('button', { type: 'button', class: 'btn sm danger', text: '×', 'aria-label': 'Remove date row', onclick: function () {
            dateRows.splice(idx, 1); renderDateRows(); schedulePreviewRender();
          } });
          datesList.appendChild(el('div', { class: 'cso-repeat-row' }, [lbl, dt, upBtn, dnBtn, rmBtn]));
        });
      }
      renderDateRows();
      left.appendChild(el('div', { class: 'cso-repeat-wrap' }, [
        el('div', { class: 'cso-repeat-head' }, [
          el('label', { text: 'Important Dates (Repeatable Rows)' }),
          el('button', { type: 'button', class: 'btn sm', text: '+ Add Date Row', onclick: function () { dateRows.push({ label: '', date: '' }); renderDateRows(); } })
        ]),
        datesList
      ]));
    }

    var sb = statusBlock(isNew ? null : item); left.appendChild(sb.node);

    var livePrevTimer;
    function renderLivePreview() {
      var snap = {};
      Object.keys(getters).forEach(function (k) { snap[k] = getters[k](); });
      Object.assign(snap, sb.get());
      clear(previewPane);
      previewPane.appendChild(el('h3', { text: key === 'jobs' ? 'Live Job Alert Preview' : 'Live Article Reader Preview' }));
      var card = el('div', { class: 'cso-preview-card' });
      var tagsArr = String(snap.tags || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);

      if (key === 'jobs') {
        var dlText = snap.last_date ? 'Last date: ' + snap.last_date : 'Deadline: TBA';
        card.appendChild(el('div', { class: 'cso-preview-kicker', text: (snap.organisation || 'Odisha Govt') + ' · ' + (snap.state || 'Odisha') }));
        card.appendChild(el('h4', { text: snap.title || 'Untitled Job Notification' }));
        card.appendChild(el('div', { class: 'actions' }, [
          badge(snap.status || 'draft'),
          el('span', { class: 'badge scheduled', text: dlText }),
          snap.vacancies ? el('span', { class: 'badge published', text: snap.vacancies + ' vacancies' }) : null
        ]));
        if (snap.qualification) card.appendChild(el('p', { class: 'hint', text: 'Qualification: ' + snap.qualification }));
        if (snap.summary) card.appendChild(el('p', { text: snap.summary }));
        if (dateRows.length) {
          var ul = el('ul', { class: 'cso-preview-dates' });
          dateRows.forEach(function (r) { if (r.label || r.date) ul.appendChild(el('li', { text: (r.label || 'Date') + ': ' + (r.date || 'TBA') })); });
          card.appendChild(ul);
        }
        if (snap.apply_url) card.appendChild(el('div', { class: 'actions' }, [el('span', { class: 'btn sm primary', text: 'Official Apply Link →' })]));
        card.appendChild(el('div', { class: 'hint', text: 'JobPosting schema: ' + (snap.organisation || 'CSOdisha') + ' · ' + (snap.category || 'General') }));
      } else {
        card.appendChild(el('div', { class: 'cso-preview-kicker', text: (snap.category || 'Current Affairs') + (snap.event_date ? ' · ' + snap.event_date : '') }));
        card.appendChild(el('h4', { text: snap.title || 'Untitled Current Affairs Article' }));
        card.appendChild(el('div', { class: 'actions' }, [
          badge(snap.status || 'draft'),
          snap.published_at ? el('span', { class: 'hint', text: 'Scheduled: ' + fmtDate(snap.published_at) }) : null
        ]));
        if (snap.summary) card.appendChild(el('p', { text: snap.summary }));
      }
      if (tagsArr.length) {
        card.appendChild(el('div', { class: 'cso-preview-tags' }, tagsArr.map(function (tg) { return el('span', { class: 'badge draft', text: '#' + tg }); })));
      }
      var bodyPrev = el('div', { class: 'preview cso-preview-body' });
      var mdSource = key === 'jobs' ? syncImportantDatesMd(snap.body_md, dateRows) : (snap.body_md || '');
      if (mdSource.trim()) {
        api('POST', 'preview', { markdown: mdSource }).then(function (d) { renderSanitizedHtml(bodyPrev, d.html); }).catch(function () {});
      } else {
        bodyPrev.appendChild(el('span', { class: 'muted', text: 'Markdown body preview appears here…' }));
      }
      card.appendChild(bodyPrev);
      previewPane.appendChild(card);
    }
    schedulePreviewRender = function () { clearTimeout(livePrevTimer); livePrevTimer = setTimeout(renderLivePreview, 250); };
    renderLivePreview();

    var save = el('button', { type: 'submit', class: 'btn primary', text: 'Save' });
    form.appendChild(el('div', { class: 'toolbar' }, [el('span', { class: 'hint', text: 'Changes update the live candidate preview in real time.' }), el('span', { class: 'spacer' }), toggleBtn]));
    form.appendChild(splitWrap);
    form.appendChild(el('div', { class: 'actions' }, [save, el('a', { class: 'btn', href: '#/' + key, text: 'Cancel' })]));
    form.addEventListener('submit', async function (e) {
      e.preventDefault(); save.disabled = true;
      var body = {}; Object.keys(getters).forEach(function (k) { body[k] = getters[k](); });
      if (key === 'jobs') body.body_md = syncImportantDatesMd(body.body_md, dateRows);
      Object.assign(body, sb.get());
      try {
        showErrors(form, {});
        var r = isNew ? await api('POST', T.path, body) : await api('PUT', T.path + '/' + id, body);
        toast('Saved'); if (isNew) go('/' + key + '/' + r.id); else { clear(main); await viewPostForm(key, id); return; }
      } catch (err) { showErrors(form, err.fields); toast(err.message, true); }
      save.disabled = false;
    });
    main.appendChild(form);
  }

  /* ---------- mock tests ---------- */
  var Q_OPTS = ['A', 'B', 'C', 'D'];
  async function viewMockForm(id) {
    var isNew = id === 'new';
    var item = isNew ? { duration_minutes: 60, total_marks: 100, negative_marking: 0.25, status: 'draft' } : await api('GET', 'mock-tests/' + id);
    setTitle(isNew ? 'New Mock Test' : 'Edit Mock Test');
    var form = el('form', { novalidate: true }); var inputs = {};
    var panel = el('div', { class: 'panel' });
    [['title', 'Title', 'text'], ['title_or', 'Title (Odia, optional)', 'text'], ['slug', 'Slug', 'text'], ['target_exam', 'Target exam', 'text'], ['duration_minutes', 'Duration (minutes)', 'number'], ['total_marks', 'Total marks', 'number'], ['negative_marking', 'Negative marking per wrong answer', 'number']].forEach(function (f) {
      var i = el('input', { id: 'f-' + f[0], type: f[2], step: f[2] === 'number' ? 'any' : false }); i.value = item[f[0]] === null || item[f[0]] === undefined ? '' : item[f[0]];
      inputs[f[0]] = i; panel.appendChild(field(f[1], i, 'f-' + f[0]));
    });
    var sb = statusBlock(isNew ? null : item); panel.appendChild(sb.node);
    var save = el('button', { type: 'submit', class: 'btn primary', text: 'Save' });
    form.appendChild(panel); form.appendChild(el('div', { class: 'actions' }, [save, el('a', { class: 'btn', href: '#/mock-tests', text: 'Back' })]));
    form.addEventListener('submit', async function (e) {
      e.preventDefault(); save.disabled = true; showErrors(form, {});
      var body = {}; Object.keys(inputs).forEach(function (k) { body[k] = inputs[k].value; }); Object.assign(body, sb.get());
      try { var r = isNew ? await api('POST', 'mock-tests', body) : await api('PUT', 'mock-tests/' + id, body); toast('Saved'); if (isNew) go('/mock-tests/' + r.id); }
      catch (err) { showErrors(form, err.fields); toast(err.message, true); }
      save.disabled = false;
    });
    main.appendChild(form);
    if (!isNew) { var qbox = el('div'); main.appendChild(qbox); await questionsPanel(id, qbox, item); }
    else main.appendChild(el('p', { class: 'muted', text: 'Save the test first, then add questions.' }));
  }

  function studentPreviewModal(testItem, questions) {
    if (!questions.length) { toast('Add at least one question before previewing as student', true); return; }
    var idx = 0;
    var answers = {};
    var submitted = false;
    var box = el('div', { class: 'cso-student-sim' });
    var ov = el('div', { class: 'overlay' }, el('div', { class: 'modal wide', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Preview as Student' }, box));

    function renderStep() {
      clear(box);
      var q = questions[idx];
      box.appendChild(el('div', { class: 'cso-sim-head' }, [
        el('div', {}, [el('strong', { text: testItem.title || 'Mock Test Preview' }), el('div', { class: 'hint', text: 'Duration: ' + (testItem.duration_minutes || 60) + ' min · Negative: -' + (testItem.negative_marking || 0) + ' · Question ' + (idx + 1) + ' of ' + questions.length })]),
        el('button', { type: 'button', class: 'btn sm', text: 'Close', onclick: function () { ov.remove(); } })
      ]));
      var qCard = el('div', { class: 'card' }, [
        el('div', { class: 'hint', text: (q.section ? q.section + ' · ' : '') + (q.marks || 1) + ' mark(s)' }),
        el('p', {}, el('strong', { text: (idx + 1) + '. ' + q.question_en })),
        q.question_or ? el('p', { class: 'muted', text: q.question_or }) : null
      ]);
      var optsWrap = el('div', { class: 'cso-sim-opts' });
      Q_OPTS.forEach(function (opt) {
        var isSel = answers[idx] === opt;
        var isRight = submitted && q.correct_option === opt;
        var isWrong = submitted && isSel && q.correct_option !== opt;
        var cls = 'btn cso-sim-opt' + (isSel ? ' primary' : '') + (isRight ? ' cso-opt-ok' : '') + (isWrong ? ' danger' : '');
        optsWrap.appendChild(el('button', {
          type: 'button',
          class: cls,
          text: opt + '. ' + (q['option_' + opt.toLowerCase()] || ''),
          disabled: submitted,
          onclick: function () { answers[idx] = opt; renderStep(); }
        }));
      });
      qCard.appendChild(optsWrap);
      if (submitted) {
        qCard.appendChild(el('div', { class: 'hint', text: 'Correct answer: ' + q.correct_option + (q.explanation ? ' — ' + q.explanation : '') }));
      }
      box.appendChild(qCard);

      if (submitted) {
        var score = 0; var right = 0; var wrong = 0;
        var neg = Number(testItem.negative_marking || 0);
        questions.forEach(function (item, qIdx) {
          if (!answers[qIdx]) return;
          if (answers[qIdx] === item.correct_option) { score += Number(item.marks || 1); right += 1; }
          else { score -= neg; wrong += 1; }
        });
        box.appendChild(el('div', { class: 'card' }, [
          el('strong', { text: 'Simulated Student Score: ' + score.toFixed(2) + ' / ' + (testItem.total_marks || questions.length) }),
          el('div', { class: 'hint', text: right + ' correct · ' + wrong + ' wrong · ' + (questions.length - right - wrong) + ' unattempted' })
        ]));
      }

      box.appendChild(el('div', { class: 'actions' }, [
        el('button', { type: 'button', class: 'btn sm', text: '← Previous', disabled: idx === 0, onclick: function () { idx -= 1; renderStep(); } }),
        el('button', { type: 'button', class: 'btn sm', text: 'Next →', disabled: idx === questions.length - 1, onclick: function () { idx += 1; renderStep(); } }),
        el('span', { class: 'spacer' }),
        !submitted
          ? el('button', { type: 'button', class: 'btn primary', text: 'Submit & Check Score', onclick: function () { submitted = true; renderStep(); } })
          : el('button', { type: 'button', class: 'btn', text: 'Reset Simulator', onclick: function () { answers = {}; submitted = false; idx = 0; renderStep(); } })
      ]));
    }
    renderStep();
    overlayHost().appendChild(ov);
  }

  async function questionsPanel(testId, box, testItem) {
    function qPayload(q) {
      return {
        section: q.section || '',
        question_en: q.question_en || '',
        question_or: q.question_or || '',
        option_a: q.option_a || '',
        option_b: q.option_b || '',
        option_c: q.option_c || '',
        option_d: q.option_d || '',
        correct_option: q.correct_option || 'A',
        marks: q.marks || 1,
        explanation: q.explanation || '',
        image_media_key: q.image_media_key || ''
      };
    }
    async function load() {
      var d = await api('GET', 'mock-tests/' + testId + '/questions');
      clear(box);
      box.appendChild(el('h2', { text: 'Questions (' + d.total + ')' }));
      box.appendChild(el('div', { class: 'toolbar' }, [
        el('button', { class: 'btn primary', text: '+ Add question', onclick: function () { questionModal(testId, null, load); } }),
        el('button', { class: 'btn', text: 'Bulk import (CSV / JSON)', onclick: function () { importModal(testId, load); } }),
        el('button', { class: 'btn', text: 'Preview as Student', onclick: function () { studentPreviewModal(testItem || {}, d.items || []); } })
      ]));
      d.items.forEach(function (q, i) {
        box.appendChild(el('div', { class: 'qrow' }, [el('div', { class: 'q' }, [el('strong', { text: (i + 1) + '. ' + q.question_en }),
          el('div', { class: 'muted', text: (q.section ? q.section + ' · ' : '') + q.marks + ' mark(s)' }),
          el('div', {}, Q_OPTS.map(function (o) { return el('div', { class: q.correct_option === o ? 'ok-opt' : '', text: o + '. ' + q['option_' + o.toLowerCase()] }); }))]),
          el('div', { class: 'actions' }, [
            el('button', { class: 'btn sm', text: '↑', 'aria-label': 'Move question ' + (i + 1) + ' up', disabled: i === 0, onclick: async function () {
              try {
                var prevQ = d.items[i - 1];
                await api('PUT', 'questions/' + prevQ.id, qPayload(q));
                await api('PUT', 'questions/' + q.id, qPayload(prevQ));
                load();
              } catch (e) { toast(e.message, true); }
            } }),
            el('button', { class: 'btn sm', text: '↓', 'aria-label': 'Move question ' + (i + 1) + ' down', disabled: i === d.items.length - 1, onclick: async function () {
              try {
                var nextQ = d.items[i + 1];
                await api('PUT', 'questions/' + nextQ.id, qPayload(q));
                await api('PUT', 'questions/' + q.id, qPayload(nextQ));
                load();
              } catch (e) { toast(e.message, true); }
            } }),
            el('button', { class: 'btn sm', text: 'Duplicate', onclick: async function () {
              try { await api('POST', 'mock-tests/' + testId + '/questions', qPayload(q)); toast('Question duplicated'); load(); }
              catch (e) { toast(e.message, true); }
            } }),
            el('button', { class: 'btn sm', text: 'Edit', onclick: function () { questionModal(testId, q, load); } }),
            el('button', { class: 'btn sm danger', text: 'Delete', 'aria-label': 'Delete question ' + (i + 1), onclick: async function () {
              if (!(await confirmModal('Delete question ' + (i + 1) + '?', 'This cannot be undone from the UI.', 'Delete', true))) return;
              try { await api('DELETE', 'questions/' + q.id); load(); } catch (e) { toast(e.message, true); } } })])]));
      });
    }
    await load();
  }

  function questionModal(testId, q, reload) {
    var isNew = !q; q = q || { correct_option: 'A', marks: 1 };
    var form = el('form', { novalidate: true }); var inputs = {}; var imgKey = q.image_media_key || '';
    [['section', 'Section / subject', 'text'], ['question_en', 'Question (English)', 'area'], ['question_or', 'Question (Odia, optional)', 'area'], ['option_a', 'Option A', 'text'], ['option_b', 'Option B', 'text'], ['option_c', 'Option C', 'text'], ['option_d', 'Option D', 'text']].forEach(function (f) {
      var i = f[2] === 'area' ? el('textarea', { id: 'f-' + f[0] }) : el('input', { id: 'f-' + f[0], type: 'text' }); i.value = q[f[0]] || ''; inputs[f[0]] = i; form.appendChild(field(f[1], i, 'f-' + f[0]));
    });
    var co = el('select', { id: 'f-correct_option' }, Q_OPTS.map(function (o) { return el('option', { value: o, text: o, selected: q.correct_option === o }); }));
    var marks = el('input', { id: 'f-marks', type: 'number', step: 'any', value: q.marks });
    form.appendChild(el('div', { class: 'grid2' }, [field('Correct option', co, 'f-correct_option'), field('Marks', marks, 'f-marks')]));
    var ex = el('textarea', { id: 'f-explanation' }); ex.value = q.explanation || ''; form.appendChild(field('Explanation', ex, 'f-explanation'));
    form.appendChild(el('div', {}, [el('label', { text: 'Diagram (optional)' }), uploader('f-image_media_key', 'image', imgKey, function (k) { imgKey = k; })]));
    var done = function () { ov.remove(); };
    var save = el('button', { type: 'submit', class: 'btn primary', text: 'Save question' });
    form.appendChild(el('div', { class: 'actions' }, [el('button', { type: 'button', class: 'btn', text: 'Cancel', onclick: done }), save]));
    form.addEventListener('submit', async function (e) {
      e.preventDefault(); save.disabled = true; showErrors(form, {});
      var body = { correct_option: co.value, marks: marks.value, explanation: ex.value, image_media_key: imgKey };
      Object.keys(inputs).forEach(function (k) { body[k] = inputs[k].value; });
      try { if (isNew) await api('POST', 'mock-tests/' + testId + '/questions', body); else await api('PUT', 'questions/' + q.id, body); toast('Saved'); done(); reload(); }
      catch (err) { showErrors(form, err.fields); toast(err.message, true); }
      save.disabled = false;
    });
    var ov = el('div', { class: 'overlay' }, el('div', { class: 'modal wide', role: 'dialog', 'aria-modal': 'true', 'aria-label': isNew ? 'Add question' : 'Edit question' }, [el('h2', { text: isNew ? 'Add question' : 'Edit question' }), form]));
    overlayHost().appendChild(ov); inputs.question_en.focus();
  }

  /* CSV/JSON import with validation preview */
  function parseCsv(text) {
    var rows = [], row = [], cur = '', inQ = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQ) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; } else cur += c; }
      else if (c === '"') inQ = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return x.trim(); }); });
  }
  var ALIASES = { question: 'question_en', question_en: 'question_en', question_or: 'question_or', odia_question: 'question_or', a: 'option_a', option_a: 'option_a', b: 'option_b', option_b: 'option_b', c: 'option_c', option_c: 'option_c', d: 'option_d', option_d: 'option_d', correct: 'correct_option', answer: 'correct_option', correct_option: 'correct_option', explanation: 'explanation', section: 'section', subject: 'section', marks: 'marks' };
  function rowsFromText(text, name) {
    text = text.replace(/^\uFEFF/, '').trim();
    if (!text) return [];
    if (/\.json$/i.test(name || '') || text[0] === '[' || text[0] === '{') {
      var j = JSON.parse(text); return Array.isArray(j) ? j : (j.rows || j.questions || []);
    }
    var t = parseCsv(text); var head = t.shift().map(function (h) { return ALIASES[h.trim().toLowerCase().replace(/[\s-]+/g, '_')] || null; });
    return t.map(function (r) { var o = {}; head.forEach(function (h, i) { if (h) o[h] = r[i]; }); return o; });
  }
  function importModal(testId, reload) {
    var ta = el('textarea', { id: 'imp-text', class: 'tall', placeholder: 'Paste CSV or JSON here, or choose a file.\nCSV columns: question, option_a, option_b, option_c, option_d, correct, explanation, section, marks, question_or' });
    var file = el('input', { type: 'file', accept: '.csv,.json,text/csv,application/json', 'aria-label': 'Choose CSV or JSON file' });
    var out = el('div'); var rows = null;
    file.addEventListener('change', function () { var f = file.files[0]; if (!f) return; var r = new FileReader(); r.onload = function () { ta.value = String(r.result); ta.dataset.name = f.name; validate(); }; r.readAsText(f); });
    var commit = el('button', { class: 'btn primary', text: 'Import valid rows', disabled: true });
    async function validate() {
      clear(out); commit.disabled = true;
      try { rows = rowsFromText(ta.value, ta.dataset.name); } catch (e) { out.appendChild(el('div', { class: 'alert', text: 'Could not parse input: ' + e.message })); return; }
      if (!rows.length) { out.appendChild(el('div', { class: 'alert', text: 'No rows found.' })); return; }
      try {
        var d = await api('POST', 'mock-tests/' + testId + '/import', { rows: rows, dry_run: true });
        out.appendChild(el('div', { class: d.invalid_count ? 'alert' : 'alert ok', text: d.valid_count + ' valid, ' + d.invalid_count + ' with errors (of ' + d.total + ').' }));
        var tb = el('tbody');
        d.invalid.forEach(function (x) { tb.appendChild(el('tr', {}, [el('td', { text: String(x.row) }), el('td', { text: 'Error' }), el('td', { text: Object.keys(x.errors).map(function (k) { return k + ': ' + x.errors[k]; }).join('; ') })])); });
        d.preview.forEach(function (x) { tb.appendChild(el('tr', {}, [el('td', { text: String(x.row) }), el('td', { text: 'OK' }), el('td', { text: x.question_en + ' → ' + x.correct_option })])); });
        out.appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [el('thead', {}, el('tr', {}, ['Row', 'Result', 'Details'].map(function (h) { return el('th', { scope: 'col', text: h }); }))), tb])));
        if (d.valid_count > 50) out.appendChild(el('p', { class: 'hint', text: 'Showing first 50 valid rows.' }));
        commit.disabled = d.valid_count === 0; commit.dataset.skip = d.invalid_count ? '1' : '';
      } catch (e) { out.appendChild(el('div', { class: 'alert', text: e.message })); }
    }
    commit.addEventListener('click', async function () {
      commit.disabled = true;
      try { var r = await api('POST', 'mock-tests/' + testId + '/import', { rows: rows, dry_run: false, skip_invalid: !!commit.dataset.skip }); toast('Imported ' + r.imported + ' question(s)'); ov.remove(); reload(); }
      catch (e) { toast(e.message, true); commit.disabled = false; }
    });
    var ov = el('div', { class: 'overlay' }, el('div', { class: 'modal wide', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Bulk import' }, [
      el('h2', { text: 'Bulk import questions' }), el('label', { for: 'imp-text', text: 'CSV or JSON' }), ta, el('div', { class: 'toolbar' }, [file, el('button', { class: 'btn', text: 'Validate', onclick: validate })]), out,
      el('div', { class: 'actions' }, [el('button', { class: 'btn', text: 'Close', onclick: function () { ov.remove(); } }), commit])]));
    overlayHost().appendChild(ov);
  }

  /* ---------- candidate accounts (admin only) ---------- */
  async function viewUsers() {
    setTitle('Candidate accounts');
    var q = el('input', { type: 'search', placeholder: 'Search email, name, phone, district…', 'aria-label': 'Search accounts' });
    var roleSel = el('select', { 'aria-label': 'Filter by role' }, [['', 'All roles'], ['candidate', 'Candidates'], ['editor', 'Editors'], ['admin', 'Admins']].map(function (o) { return el('option', { value: o[0], text: o[1] }); }));
    var box = el('div'); var st = { page: 1, limit: 20 }; var t;
    q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { st.page = 1; load(); }, 300); });
    roleSel.addEventListener('change', function () { st.page = 1; load(); });
    main.appendChild(el('div', { class: 'toolbar' }, [q, roleSel])); main.appendChild(box);
    async function load() {
      var d = await api('GET', 'users?page=' + st.page + '&limit=' + st.limit + '&q=' + encodeURIComponent(q.value) + (roleSel.value ? '&role=' + roleSel.value : '')); var tb = el('tbody');
      d.items.forEach(function (u) {
        var sel = el('select', { 'aria-label': 'Role for ' + u.email }, ['candidate', 'editor', 'admin'].map(function (r) { return el('option', { value: r, text: r, selected: u.role === r }); }));
        sel.addEventListener('change', async function () {
          if (!(await confirmModal('Change role?', u.email + ' → ' + sel.value, 'Change'))) { sel.value = u.role; return; }
          try { await api('PUT', 'users/' + u.id + '/role', { role: sel.value }); u.role = sel.value; toast('Role updated'); } catch (e) { toast(e.message, true); sel.value = u.role; }
        });
        tb.appendChild(el('tr', {}, [el('td', {}, [el('strong', { text: u.full_name || '—' }), el('div', { class: 'hint', text: u.email })]), el('td', { text: u.phone || '—' }), el('td', { text: u.district || '—' }), el('td', {}, sel),
          el('td', { text: u.created_at ? new Date(u.created_at * 1000).toLocaleDateString() : '—' }), el('td', { text: u.last_login_at ? fmtDate(String(u.last_login_at)) : '—' })]));
      });
      if (!d.items.length) tb.appendChild(el('tr', {}, el('td', { colspan: '6', class: 'muted', text: 'No accounts match.' })));
      clear(box).appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [el('thead', {}, el('tr', {}, ['Candidate', 'Phone', 'District', 'Role', 'Joined', 'Last login'].map(function (h) { return el('th', { scope: 'col', text: h }); }))), tb])));
      box.appendChild(pager(st, d.total, load));
    }
    await load();
  }

  /* ---------- operations, backups, diagnostics & registry ---------- */
  async function viewOperations() {
    setTitle('Operations & Backups');
    var s = await api('GET', 'stats');
    var cr = s.last_cron_run || {};
    var cronCard = el('div', { class: 'panel' }, [
      el('h2', { text: 'Cron Lifecycle & D1 Maintenance' }),
      el('p', { class: 'muted', text: cr.ran_at ? ('Last run: ' + fmtDate(cr.ran_at) + ' · Promoted: ' + (cr.promoted || 0) + ' · Expired: ' + (cr.expired || 0) + ' · Cleaned: ' + (cr.cleaned || 0)) : 'No maintenance run recorded yet (Schedule: */15 * * * *)' })
    ]);
    if (me && me.role === 'admin') {
      var runBtn = el('button', {
        type: 'button',
        class: 'btn primary',
        text: 'Run maintenance now',
        onclick: async function () {
          runBtn.disabled = true;
          runBtn.textContent = 'Running…';
          try {
            var res = await api('POST', 'maintenance/run', {});
            toast('Maintenance complete: ' + (res.promoted || 0) + ' promoted, ' + (res.expired || 0) + ' expired');
            clear(main);
            await viewOperations();
          } catch (err) {
            toast(err.message, true);
            runBtn.disabled = false;
            runBtn.textContent = 'Run maintenance now';
          }
        }
      });
      cronCard.appendChild(el('div', { class: 'actions' }, runBtn));
    }
    main.appendChild(cronCard);

    var healthBox = el('div', { class: 'panel' }, [
      el('h2', { text: 'Content Health Audit' }),
      el('p', { class: 'muted', text: 'Scans live D1 jobs, current affairs, mock tests, and resources for drafts, expired jobs, or missing metadata.' })
    ]);
    var healthList = el('div', { class: 'actions' });
    healthBox.appendChild(healthList);
    main.appendChild(healthBox);

    var backupBtn = el('button', {
      type: 'button',
      class: 'btn primary',
      text: 'Export Live D1 JSON Backup',
      onclick: async function () {
        backupBtn.disabled = true;
        backupBtn.textContent = 'Exporting…';
        try {
          var [stats, ca, jobs, tests, syl, pyq, banner] = await Promise.all([
            api('GET', 'stats'),
            api('GET', 'current-affairs?limit=100'),
            api('GET', 'jobs?limit=100'),
            api('GET', 'mock-tests?limit=100'),
            api('GET', 'resources?kind=syllabus&limit=100'),
            api('GET', 'resources?kind=pyq&limit=100'),
            api('GET', 'banner')
          ]);
          var payload = {
            exported_at: new Date().toISOString(),
            exported_by: me ? me.email : 'staff',
            stats: stats,
            banner: banner,
            current_affairs: ca.items || [],
            jobs: jobs.items || [],
            mock_tests: tests.items || [],
            syllabus: syl.items || [],
            pyq: pyq.items || []
          };
          var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'csodisha-d1-backup-' + new Date().toISOString().slice(0, 10) + '.json';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
          toast('Live D1 JSON backup downloaded');
        } catch (err) {
          toast(err.message, true);
        }
        backupBtn.disabled = false;
        backupBtn.textContent = 'Export Live D1 JSON Backup';
      }
    });

    main.appendChild(el('div', { class: 'panel' }, [
      el('h2', { text: 'Live D1 JSON Backup Export' }),
      el('p', { class: 'muted', text: 'Downloads a full JSON snapshot of live D1 tables (stats, banner, jobs, current affairs, mock tests, syllabus, and PYQs).' }),
      el('div', { class: 'actions' }, backupBtn)
    ]));

    try {
      var [jRes, mRes] = await Promise.all([api('GET', 'jobs?limit=50'), api('GET', 'mock-tests?limit=50')]);
      var warnings = [];
      (jRes.items || []).forEach(function (j) {
        if (j.status === 'expired') warnings.push('Expired job: ' + j.title);
      });
      (mRes.items || []).forEach(function (m) {
        if (!m.question_count) warnings.push('Mock test with 0 questions: ' + m.title);
      });
      if (s.open_incidents > 0) warnings.push(s.open_incidents + ' open incident(s) require resolution');
      if (!warnings.length) {
        healthList.appendChild(el('div', { class: 'alert ok', text: 'All content health checks passed with zero warnings.' }));
      } else {
        warnings.slice(0, 10).forEach(function (w) {
          healthList.appendChild(el('div', { class: 'alert', text: w }));
        });
      }
    } catch (_) {}
  }

  async function viewDiagnostics() {
    setTitle('Live Site Health');
    var box = el('div');
    var probeBtn = el('button', { type: 'button', class: 'btn primary', text: 'Run Live Endpoint Probes', onclick: runProbes });
    main.appendChild(el('div', { class: 'toolbar' }, [probeBtn]));
    main.appendChild(box);

    async function runProbes() {
      probeBtn.disabled = true;
      probeBtn.textContent = 'Probing…';
      var endpoints = [
        ['Public Homepage', '/'],
        ['Jobs & Careers Portal', '/jobs-careers/'],
        ['Current Affairs Portal', '/current-affairs/'],
        ['Mock Tests Portal', '/mock-tests/'],
        ['Resources Portal', '/resources/'],
        ['Admin Stats API', '/api/admin/stats'],
        ['Public Banner API', '/api/content/banner']
      ];
      var tb = el('tbody');
      for (var i = 0; i < endpoints.length; i++) {
        var ep = endpoints[i];
        var t0 = performance.now();
        var statusTxt = 'FAILED', okFlag = false, rtt = 0;
        try {
          var r = await fetch(ep[1], { method: 'GET', credentials: 'same-origin', cache: 'no-store' });
          rtt = Math.round(performance.now() - t0);
          statusTxt = r.status + ' ' + (r.statusText || 'OK');
          okFlag = r.ok;
        } catch (err) {
          rtt = Math.round(performance.now() - t0);
          statusTxt = 'Network Error';
        }
        tb.appendChild(el('tr', {}, [
          el('td', { text: ep[0] }),
          el('td', {}, el('code', { text: ep[1] })),
          el('td', {}, el('span', { class: 'badge ' + (okFlag ? 'published' : 'expired'), text: statusTxt })),
          el('td', { class: 'cso-tabular', text: rtt + ' ms' })
        ]));
      }
      clear(box).appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
        el('thead', {}, el('tr', {}, ['Endpoint', 'Path', 'HTTP Status', 'Latency'].map(function (h) { return el('th', { scope: 'col', text: h }); }))),
        tb
      ])));
      probeBtn.disabled = false;
      probeBtn.textContent = 'Run Live Endpoint Probes';
    }
    await runProbes();
  }

  async function viewRegistry() {
    setTitle('241-Module Registry');
    var schema = window.CSOStudio && window.CSOStudio.getSchema ? window.CSOStudio.getSchema() : null;
    if (!schema || !Array.isArray(schema.folders)) {
      main.appendChild(el('div', { class: 'alert', text: 'Navigation schema not loaded.' }));
      return;
    }
    var tb = el('tbody');
    schema.folders.forEach(function (f) {
      (f.modules || []).forEach(function (m) {
        tb.appendChild(el('tr', {}, [
          el('td', {}, el('code', { text: m.id })),
          el('td', { text: m.title }),
          el('td', { text: f.title }),
          el('td', {}, el('button', {
            type: 'button',
            class: 'btn sm',
            text: 'Open',
            onclick: function () {
              if (typeof window.selectModule === 'function') window.selectModule(f.id, m.id);
            }
          }))
        ]));
      });
    });
    main.appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
      el('thead', {}, el('tr', {}, ['Module ID', 'Title', 'Domain', 'Action'].map(function (h) { return el('th', { scope: 'col', text: h }); }))),
      tb
    ])));
  }

  /* ---------- router ---------- */
  function buildNav() {
    var nav = clear(document.getElementById('nav'));
    [['#/', 'Overview'], ['#/current-affairs', 'Current Affairs'], ['#/jobs', 'Job Alerts'], ['#/mock-tests', 'Mock Tests'], ['#/syllabus', 'Syllabus'], ['#/pyq', 'PYQs'], ['#/media', 'Media'], ['#/banner', 'Homepage banner'], ['#/operations', 'Operations & Backups'], ['#/audit', 'Audit log'], ['#/incidents', 'Incidents']].concat(me.role === 'admin' ? [['#/users', 'Candidate accounts'], ['/admin/', 'Master Command Suite']] : [['/admin/', 'Master Command Suite']])
      .forEach(function (l) { nav.appendChild(el('a', { href: l[0] }, l[1])); });
  }
  var VIEWS = {
    dashboard: function () { return viewDashboard(); },
    operations: function () { return viewOperations(); },
    diagnostics: function () { return viewDiagnostics(); },
    registry: function () { return viewRegistry(); },
    audit: function (parts) { return viewAudit(parts[1]); },
    incidents: function () { return viewIncidents(); },
    banner: function () { return viewBanner(); },
    media: function () { return viewMedia(); },
    syllabus: function () { return viewResources('syllabus'); },
    pyq: function () { return viewResources('pyq'); },
    users: function (parts) { return me.role === 'admin' ? viewUsers(parts[1]) : Promise.resolve(forbidden('Candidate accounts are visible to administrators only.')); }
  };
  function forbidden(msg) { main.appendChild(el('div', { class: 'alert', text: msg })); }
  async function renderPath(parts) {
    clear(main);
    try {
      var k = parts[0];
      if (!k) await viewDashboard();
      else if (VIEWS[k]) await VIEWS[k](parts);
      else if (k === 'mock-tests') await (parts[1] ? viewMockForm(parts[1]) : viewList(k));
      else if (TYPES[k]) await (parts[1] ? viewPostForm(k, parts[1]) : viewList(k));
      else main.appendChild(el('p', { text: 'Page not found.' }));
    } catch (e) { main.appendChild(el('div', { class: 'alert', text: e.message })); }
  }
  async function route() {
    if (embedded) { await renderPath(curPath.replace(/^\//, '').split('/').filter(Boolean)); return; }
    var h = location.hash.replace(/^#\/?/, ''); var parts = h.split('/').filter(Boolean);
    document.querySelectorAll('#nav a').forEach(function (a) {
      var href = a.getAttribute('href'); var on = href === '#/' + (parts[0] || '') || (href === '#/' && !parts[0]);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.getElementById('nav').classList.remove('open'); document.getElementById('navToggle').setAttribute('aria-expanded', 'false');
    await renderPath(parts);
    main.focus();
  }
  /* Embedded mode: the Master Command Suite mounts a section into its workspace. */
  async function mount(container, path, group) {
    if (main !== container) {
      embedded = true; main = container;
      container.classList.add('cms-embed');
      container.addEventListener('click', function (e) {
        var a = e.target.closest && e.target.closest('a[href^="#/"]');
        if (a) { e.preventDefault(); go(a.getAttribute('href').slice(1)); }
      });
    }
    embedGroup = group || null; curPath = path || '';
    if (!me) { try { me = (await api('GET', 'session')).user; } catch (e) { clear(container).appendChild(el('div', { class: 'alert', text: e.message })); return; } }
    await route();
  }
  window.CSOCms = { mount: mount };
  async function init() {
    try { me = (await api('GET', 'session')).user; } catch (e) { return; }
    document.getElementById('who').textContent = me.email + ' (' + me.role + ')';
    buildNav();
    document.getElementById('navToggle').addEventListener('click', function () { var o = document.getElementById('nav').classList.toggle('open'); this.setAttribute('aria-expanded', String(o)); });
    document.getElementById('signOut').addEventListener('click', async function () { try { await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } finally { location.replace('/admin/login?reason=out'); } });
    window.addEventListener('hashchange', route); route();
  }
  if (document.getElementById('nav')) init();
})();
