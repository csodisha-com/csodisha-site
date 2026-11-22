/* v174: Admin Studio Fast-Publishing Overhaul.
   Repeatable row builders, Live Preview drawer and Content Health & Expiry Triage.
   Strict CSP: DOM APIs (createElement / textContent / addEventListener) only. */
(function (root) {
  'use strict';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  function btn(label, cls, onClick) {
    var b = el('button', cls, label);
    b.type = 'button';
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }

  /* ---------- pure helpers (also exercised by the test script) ---------- */
  var QUESTIONS_HEADING = '## Practice Questions & FAQs';

  function parseQuestionsBlock(text) {
    var rows = [];
    var m = String(text || '').match(/## Practice Questions & FAQs\s*\n([\s\S]*?)(?=\n## |\s*$)/);
    if (!m) return rows;
    var cur = null;
    m[1].split('\n').forEach(function (line) {
      var q = line.match(/^Q:\s*(.*)$/);
      var a = line.match(/^A:\s*(.*)$/);
      var e = line.match(/^E:\s*(.*)$/);
      if (q) { cur = { question: q[1].trim(), options: '', explanation: '' }; rows.push(cur); }
      else if (a && cur) cur.options = a[1].trim();
      else if (e && cur) cur.explanation = e[1].trim();
    });
    return rows;
  }
  function syncQuestionsBlock(text, rows) {
    var clean = String(text || '').replace(/\n?## Practice Questions & FAQs\s*\n[\s\S]*?(?=\n## |\s*$)/, '').trim();
    var valid = (rows || []).filter(function (r) { return String(r.question || '').trim(); });
    if (!valid.length) return clean;
    var sec = QUESTIONS_HEADING + '\n' + valid.map(function (r) {
      var out = 'Q: ' + String(r.question).trim();
      if (String(r.options || '').trim()) out += '\nA: ' + String(r.options).trim();
      if (String(r.explanation || '').trim()) out += '\nE: ' + String(r.explanation).trim();
      return out;
    }).join('\n');
    return clean ? clean + '\n\n' + sec : sec;
  }

  function parseResources(json) {
    try {
      var v = JSON.parse(String(json || '[]'));
      if (!Array.isArray(v)) return [];
      return v.map(function (x) {
        if (typeof x === 'string') return { title: x, author: '', url: '' };
        return { title: String(x.title || ''), author: String(x.author || x.source || x.board || ''), url: String(x.url || '') };
      });
    } catch (_) { return []; }
  }
  function serializeResources(rows) {
    return JSON.stringify((rows || []).filter(function (r) { return String(r.title || '').trim() || String(r.url || '').trim(); }).map(function (r) {
      return { title: String(r.title || '').trim(), author: String(r.author || '').trim(), url: String(r.url || '').trim() };
    }));
  }

  var PLACEHOLDER_RE = /(^#$|^javascript:|example\.(com|org|net)|localhost|127\.0\.0\.1|your-?url|placeholder|xxx+|^https?:\/\/(www\.)?$)/i;
  var OFFICIAL_RE = /\.(gov\.in|nic\.in|gov|edu\.in|ac\.in)$/i;

  function classifyLink(url) {
    var u = String(url || '').trim();
    if (!u) return 'missing';
    if (PLACEHOLDER_RE.test(u)) return 'placeholder';
    if (/^http:\/\//i.test(u)) return 'insecure';
    if (!/^https:\/\/[^\s/]+\.[^\s/]+/i.test(u)) return 'malformed';
    return 'ok';
  }
  function isOfficialDomain(url) {
    var m = String(url || '').match(/^https?:\/\/([^/\s?#]+)/i);
    return Boolean(m && OFFICIAL_RE.test(m[1].replace(/:\d+$/, '')));
  }
  function isExpired(dateStr, nowMs) {
    var t = Date.parse(dateStr);
    if (isNaN(t)) return false;
    var now = new Date(nowMs === undefined ? Date.now() : nowMs);
    var startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return t < startOfToday;
  }
  var LINK_STATUS_LABEL = {
    missing: 'Missing official URL',
    placeholder: 'Placeholder / broken URL',
    insecure: 'Insecure http:// URL',
    malformed: 'Malformed URL',
    unofficial: 'Non .gov.in source'
  };
  function buildTriage(data, nowMs) {
    var out = { expired: [], links: [] };
    var d = data || {};
    (d.jobs || []).forEach(function (j) {
      var st = String(j.status || '').toLowerCase();
      if ((st === 'published' || st === 'active' || st === 'scheduled') && j.last_date && isExpired(j.last_date, nowMs)) {
        out.expired.push({ kind: 'job', id: j.id, title: j.title || 'Untitled job', date: j.last_date, href: '#/jobs/' + j.id });
      }
      if (st === 'archived') return;
      [['apply_url', 'Apply URL'], ['source_url', 'Source URL']].forEach(function (f) {
        var url = j[f[0]];
        if (f[0] === 'source_url' && !url) return;
        var s = classifyLink(url);
        if (s === 'ok' && !isOfficialDomain(url)) s = 'unofficial';
        if (s !== 'ok') out.links.push({ kind: 'job', id: j.id, title: j.title || 'Untitled job', field: f[1], url: url || '', status: s, href: '#/jobs/' + j.id });
      });
    });
    (d.schemes || []).forEach(function (s) {
      if (String(s.status || 'published').toLowerCase() === 'archived') return;
      var url = s.apply_url;
      var st = classifyLink(url);
      if (st === 'ok' && !isOfficialDomain(url)) st = 'unofficial';
      if (st !== 'ok') out.links.push({ kind: 'scheme', id: s.id, title: s.title || 'Untitled scheme', field: 'Apply URL', url: url || '', status: st, href: '#/schemes/' + s.id });
    });
    var rank = { missing: 0, placeholder: 1, malformed: 2, insecure: 3, unofficial: 4 };
    out.links.sort(function (a, b) { return rank[a.status] - rank[b.status]; });
    return out;
  }

  /* ---------- generic repeatable row builder ---------- */
  function createRowBuilder(cfg) {
    var rows = cfg.rows;
    var wrap = el('div', 'cso-fp-wrap');
    var head = el('div', 'cso-fp-head');
    head.appendChild(el('strong', 'cso-fp-title', cfg.title));
    var list = el('div', 'cso-fp-list');
    var jsonBox = null;
    var jsonArea = null;
    var jsonErr = el('div', 'cso-fp-json-err');
    jsonErr.hidden = true;

    function changed() {
      if (jsonArea && document.activeElement !== jsonArea) jsonArea.value = JSON.stringify(rows, null, 2);
      if (typeof cfg.onChange === 'function') cfg.onChange(rows);
    }
    function render() {
      clear(list);
      if (!rows.length) list.appendChild(el('div', 'cso-fp-empty', cfg.empty || 'Nothing added yet.'));
      rows.forEach(function (row, idx) {
        var rowEl = el('div', 'cso-fp-row');
        cfg.fields.forEach(function (f) {
          var input = f.type === 'area' ? el('textarea', 'cso-fp-input') : el('input', 'cso-fp-input');
          if (f.type !== 'area') input.type = f.type || 'text';
          input.placeholder = f.placeholder || f.label;
          input.setAttribute('aria-label', f.label + ' ' + (idx + 1));
          input.value = row[f.key] || '';
          input.addEventListener('input', function () { row[f.key] = input.value; changed(); });
          if (f.type === 'date') input.addEventListener('change', function () { row[f.key] = input.value; changed(); });
          rowEl.appendChild(input);
        });
        var rm = btn('Remove', 'btn sm danger cso-fp-remove', function () { rows.splice(idx, 1); render(); changed(); });
        rm.setAttribute('aria-label', 'Remove ' + cfg.noun + ' ' + (idx + 1));
        rowEl.appendChild(rm);
        list.appendChild(rowEl);
      });
    }
    head.appendChild(btn(cfg.addLabel, 'btn sm cso-fp-add', function () {
      var blank = {};
      cfg.fields.forEach(function (f) { blank[f.key] = ''; });
      rows.push(blank);
      render();
      changed();
      var inputs = list.querySelectorAll('.cso-fp-row:last-child .cso-fp-input');
      if (inputs.length) inputs[0].focus();
    }));

    wrap.appendChild(head);
    wrap.appendChild(list);

    if (cfg.advancedJson !== false) {
      jsonBox = el('details', 'cso-fp-advanced');
      jsonBox.appendChild(el('summary', 'cso-fp-advanced-sum', 'Advanced JSON (Read/Edit)'));
      jsonArea = el('textarea', 'cso-fp-json');
      jsonArea.rows = 5;
      jsonArea.setAttribute('aria-label', cfg.title + ' advanced JSON');
      jsonArea.value = JSON.stringify(rows, null, 2);
      jsonArea.addEventListener('input', function () {
        try {
          var v = JSON.parse(jsonArea.value || '[]');
          if (!Array.isArray(v)) throw new Error('JSON must be an array');
          rows.length = 0;
          v.forEach(function (x) {
            var r = {};
            cfg.fields.forEach(function (f) { r[f.key] = x && x[f.key] !== undefined ? String(x[f.key]) : ''; });
            rows.push(r);
          });
          jsonErr.hidden = true;
          render();
          if (typeof cfg.onChange === 'function') cfg.onChange(rows);
        } catch (err) {
          jsonErr.hidden = false;
          jsonErr.textContent = 'Invalid JSON: ' + err.message;
        }
      });
      jsonBox.appendChild(jsonArea);
      jsonBox.appendChild(jsonErr);
      wrap.appendChild(jsonBox);
    }
    render();
    return { node: wrap, rows: rows, render: render, getJson: function () { return JSON.stringify(rows); } };
  }

  function createDatesBuilder(rows, onChange) {
    return createRowBuilder({
      title: 'Important Dates', noun: 'date', addLabel: '+ Add Date', rows: rows, onChange: onChange,
      empty: 'No dates yet. Add Last Date to Apply, Exam Date, Admit Card, Result…',
      fields: [
        { key: 'label', label: 'Date label', placeholder: 'e.g. Last Date to Apply / Exam Date' },
        { key: 'date', label: 'Date', type: 'date' }
      ]
    });
  }
  function createResourcesBuilder(rows, onChange) {
    return createRowBuilder({
      title: 'Reference Books / Resources', noun: 'resource', addLabel: '+ Add Resource', rows: rows, onChange: onChange,
      empty: 'No resources yet. Add reference books, official guides or portals.',
      fields: [
        { key: 'title', label: 'Title', placeholder: 'Resource title' },
        { key: 'author', label: 'Author / Source', placeholder: 'Author / Source' },
        { key: 'url', label: 'Official URL', type: 'url', placeholder: 'https://…' }
      ]
    });
  }
  function createQuestionsBuilder(rows, onChange) {
    return createRowBuilder({
      title: 'Practice Questions / FAQs', noun: 'question', addLabel: '+ Add Question', rows: rows, onChange: onChange,
      empty: 'No questions yet. Add practice questions or FAQs with explanations.',
      fields: [
        { key: 'question', label: 'Question', type: 'area', placeholder: 'Question' },
        { key: 'options', label: 'Options / Answer', type: 'area', placeholder: 'Options / Answer' },
        { key: 'explanation', label: 'Explanation', type: 'area', placeholder: 'Explanation' }
      ]
    });
  }

  /* ---------- Live Preview drawer ---------- */
  var drawerState = null;
  function closePreviewDrawer() {
    if (!drawerState) return;
    document.removeEventListener('keydown', drawerState.onKey, true);
    if (drawerState.root.parentNode) drawerState.root.parentNode.removeChild(drawerState.root);
    var back = drawerState.returnFocus;
    drawerState = null;
    if (back && typeof back.focus === 'function') back.focus();
  }
  function previewKicker(kind, d) {
    if (kind === 'job') return (d.organisation || 'Odisha Govt') + ' · ' + (d.state || 'Odisha');
    if (kind === 'scheme') return (d.gov_level || 'Odisha') + ' · ' + (d.category || 'Welfare');
    return [d.resource_type, d.board_or_exam, d.subject_tag].filter(Boolean).join(' · ') || 'Study Library';
  }
  function renderPreviewCard(kind, d) {
    var card = el('article', 'cso-fp-pcard');
    card.appendChild(el('div', 'cso-fp-pkicker', previewKicker(kind, d)));
    card.appendChild(el('h3', 'cso-fp-ptitle', d.title || (kind === 'job' ? 'Untitled job notification' : kind === 'scheme' ? 'Untitled scheme' : 'Untitled study resource')));
    var badges = el('div', 'cso-fp-pbadges');
    badges.appendChild(el('span', 'cso-fp-pbadge', d.status || 'draft'));
    if (kind === 'job') {
      badges.appendChild(el('span', 'cso-fp-pbadge is-warn', d.last_date ? 'Last date: ' + d.last_date : 'Deadline: TBA'));
      if (d.vacancies) badges.appendChild(el('span', 'cso-fp-pbadge is-ok', d.vacancies + ' vacancies'));
    }
    if (kind === 'scheme' && d.application_status_label) badges.appendChild(el('span', 'cso-fp-pbadge is-ok', d.application_status_label));
    card.appendChild(badges);
    var summary = d.summary || d.benefit_summary || '';
    if (summary) card.appendChild(el('p', 'cso-fp-psum', summary));
    if (kind === 'job') {
      var facts = [['Qualification', d.qualification], ['Age limit', d.age_limit], ['Pay', d.salary_pay]].filter(function (f) { return f[1]; });
      if (facts.length) {
        var dl = el('dl', 'cso-fp-pfacts');
        facts.forEach(function (f) { dl.appendChild(el('dt', null, f[0])); dl.appendChild(el('dd', null, f[1])); });
        card.appendChild(dl);
      }
    }
    var dates = (d.dates || []).filter(function (r) { return r.label || r.date; });
    if (dates.length) {
      card.appendChild(el('h4', 'cso-fp-psub', 'Important Dates'));
      var ul = el('ul', 'cso-fp-plist');
      dates.forEach(function (r) { ul.appendChild(el('li', null, (r.label || 'Date') + ': ' + (r.date || 'TBA'))); });
      card.appendChild(ul);
    }
    var res = (d.resources || []).filter(function (r) { return r.title || r.url; });
    if (res.length) {
      card.appendChild(el('h4', 'cso-fp-psub', 'Reference Books & Resources'));
      var rl = el('ul', 'cso-fp-plist');
      res.forEach(function (r) { rl.appendChild(el('li', null, (r.title || 'Resource') + (r.author ? ' — ' + r.author : '') + (r.url ? ' (' + r.url + ')' : ''))); });
      card.appendChild(rl);
    }
    var qs = (d.questions || []).filter(function (r) { return r.question; });
    if (qs.length) {
      card.appendChild(el('h4', 'cso-fp-psub', 'Practice Questions & FAQs'));
      qs.forEach(function (q, i) {
        var det = el('details', 'cso-fp-pq');
        det.appendChild(el('summary', null, 'Q' + (i + 1) + '. ' + q.question));
        if (q.options) det.appendChild(el('p', null, q.options));
        if (q.explanation) det.appendChild(el('p', 'cso-fp-pexp', 'Explanation: ' + q.explanation));
        card.appendChild(det);
      });
    }
    var tags = String(d.tags || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (tags.length) {
      var tg = el('div', 'cso-fp-ptags');
      tags.forEach(function (t) { tg.appendChild(el('span', 'cso-fp-ptag', '#' + t)); });
      card.appendChild(tg);
    }
    var actions = el('div', 'cso-fp-pactions');
    if (d.apply_url) actions.appendChild(el('span', 'cso-fp-pbtn is-primary', kind === 'study' ? 'Open Resource →' : 'Official Apply Link →'));
    if (d.source_url) actions.appendChild(el('span', 'cso-fp-pbtn', 'Official Notification'));
    if (d.pdf_url) actions.appendChild(el('span', 'cso-fp-pbtn', 'Download PDF'));
    if (actions.childNodes.length) card.appendChild(actions);
    return card;
  }
  function openPreviewDrawer(kind, getData) {
    closePreviewDrawer();
    var returnFocus = document.activeElement;
    var rootEl = el('div', 'cso-fp-drawer-root');
    var backdrop = el('div', 'cso-fp-backdrop');
    var panel = el('aside', 'cso-fp-drawer is-desktop');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', 'Live public preview');
    var bar = el('div', 'cso-fp-drawer-bar');
    bar.appendChild(el('strong', null, '👁 Live Preview'));
    var toggle = el('div', 'cso-fp-width-toggle');
    var bMob = btn('Mobile (360px)', 'btn sm', function () { setWidth(true); });
    var bDesk = btn('Desktop', 'btn sm', function () { setWidth(false); });
    toggle.appendChild(bMob);
    toggle.appendChild(bDesk);
    bar.appendChild(toggle);
    var closeBtn = btn('✕', 'btn sm cso-fp-close', closePreviewDrawer);
    closeBtn.setAttribute('aria-label', 'Close live preview');
    bar.appendChild(closeBtn);
    var body = el('div', 'cso-fp-drawer-body');
    var frame = el('div', 'cso-fp-frame');
    body.appendChild(frame);
    panel.appendChild(bar);
    panel.appendChild(body);
    rootEl.appendChild(backdrop);
    rootEl.appendChild(panel);
    function setWidth(mobile) {
      panel.classList.toggle('is-mobile', mobile);
      panel.classList.toggle('is-desktop', !mobile);
      bMob.setAttribute('aria-pressed', String(mobile));
      bDesk.setAttribute('aria-pressed', String(!mobile));
    }
    function paint() {
      clear(frame);
      var data = typeof getData === 'function' ? getData() : (getData || {});
      frame.appendChild(renderPreviewCard(kind, data || {}));
    }
    backdrop.addEventListener('click', closePreviewDrawer);
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); closePreviewDrawer(); } }
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(rootEl);
    drawerState = { root: rootEl, onKey: onKey, returnFocus: returnFocus };
    setWidth(false);
    paint();
    closeBtn.focus();
    return { refresh: paint, close: closePreviewDrawer };
  }

  /* ---------- Content Health & Expiry Triage panel ---------- */
  function renderTriagePanel(container, triage, handlers) {
    var h = handlers || {};
    var panel = el('section', 'panel cso-fp-triage');
    panel.setAttribute('aria-label', 'Content Health and Expiry Triage');
    var head = el('div', 'cso-fp-triage-head');
    head.appendChild(el('h3', null, 'Content Health & Expiry Triage'));
    head.appendChild(el('span', 'cso-fp-pbadge ' + (triage.expired.length ? 'is-bad' : 'is-ok'), triage.expired.length + ' expired'));
    head.appendChild(el('span', 'cso-fp-pbadge ' + (triage.links.length ? 'is-warn' : 'is-ok'), triage.links.length + ' link issues'));
    panel.appendChild(head);

    if (!triage.expired.length && !triage.links.length) {
      panel.appendChild(el('p', 'hint', 'All clear — no expired deadlines or unverified links found in loaded jobs and schemes.'));
      container.appendChild(panel);
      return panel;
    }
    var grid = el('div', 'cso-fp-triage-grid');
    var colA = el('div', 'cso-fp-triage-col');
    colA.appendChild(el('h4', null, 'Expired Deadlines'));
    if (!triage.expired.length) colA.appendChild(el('p', 'hint', 'No active job notices past their last date.'));
    triage.expired.slice(0, 8).forEach(function (it) {
      var row = el('div', 'cso-fp-triage-row');
      row.appendChild(el('span', 'cso-fp-pbadge is-bad', 'Expired ' + it.date));
      row.appendChild(el('strong', null, it.title));
      var act = el('div', 'cso-fp-triage-actions');
      var archive = btn('Archive', 'btn sm', function () {
        if (typeof h.onArchive !== 'function') return;
        archive.disabled = true;
        Promise.resolve(h.onArchive(it)).then(function () { row.hidden = true; }).catch(function () { archive.disabled = false; });
      });
      act.appendChild(archive);
      var edit = el('a', 'btn sm', 'Edit');
      edit.href = it.href;
      act.appendChild(edit);
      row.appendChild(act);
      colA.appendChild(row);
    });
    var colB = el('div', 'cso-fp-triage-col');
    colB.appendChild(el('h4', null, 'Unverified or Malformed Links'));
    if (!triage.links.length) colB.appendChild(el('p', 'hint', 'Every job and scheme has a secure official link.'));
    triage.links.slice(0, 10).forEach(function (it) {
      var row = el('div', 'cso-fp-triage-row');
      var sev = (it.status === 'unofficial') ? 'is-warn' : 'is-bad';
      row.appendChild(el('span', 'cso-fp-pbadge ' + sev, LINK_STATUS_LABEL[it.status] || it.status));
      row.appendChild(el('strong', null, it.title));
      row.appendChild(el('span', 'hint', it.field + (it.url ? ': ' + it.url : '')));
      var edit = el('a', 'btn sm', 'Edit');
      edit.href = it.href;
      var act = el('div', 'cso-fp-triage-actions');
      act.appendChild(edit);
      row.appendChild(act);
      colB.appendChild(row);
    });
    grid.appendChild(colA);
    grid.appendChild(colB);
    panel.appendChild(grid);
    container.appendChild(panel);
    return panel;
  }

  /* ---------- v182: Crawl4AI .gov.in Draft Queue ---------- */
  var GOV_DOMAIN_RE = /(^|\.)(gov\.in|nic\.in|odisha\.gov\.in)$/i;

  function extractGovDomain(url) {
    var u = String(url || '').trim();
    if (!/^https:\/\/[^\s/]+\.[^\s/]+/i.test(u)) return '';
    try {
      var host = new URL(u).hostname.toLowerCase().replace(/\.$/, '');
      return GOV_DOMAIN_RE.test(host) ? host : '';
    } catch (_) {
      var m = u.match(/^https:\/\/([^/\s?#]+)/i);
      if (!m) return '';
      var h = m[1].replace(/:\d+$/, '').toLowerCase();
      return GOV_DOMAIN_RE.test(h) ? h : '';
    }
  }
  function isVerifiedGovDomain(url) {
    return Boolean(extractGovDomain(url));
  }
  function validateDraftItem(raw) {
    if (!raw || typeof raw !== 'object') return { valid: false, reason: 'Invalid draft object' };
    var title = String(raw.title || '').trim();
    var officialUrl = String(raw.official_url || '').trim();
    var domain = extractGovDomain(officialUrl);
    if (!title) return { valid: false, reason: 'Missing title' };
    if (!domain) return { valid: false, reason: 'Rejected non-.gov.in/.nic.in URL' };
    var dates = Array.isArray(raw.important_dates)
      ? raw.important_dates
          .filter(function (d) { return d && (d.label || d.date); })
          .map(function (d) { return { label: String(d.label || 'Date').trim(), date: String(d.date || '').trim() }; })
      : [];
    return {
      valid: true,
      draft: {
        title: title.slice(0, 150),
        agency: String(raw.agency || 'Odisha Govt').trim(),
        official_url: officialUrl,
        last_date: String(raw.last_date || '').trim(),
        important_dates: dates,
        summary: String(raw.summary || '').trim(),
        source_domain: domain,
        fetched_at: String(raw.fetched_at || '').trim()
      }
    };
  }
  function parseDraftQueueJson(jsonText) {
    try {
      var parsed = JSON.parse(String(jsonText || '[]'));
      if (!Array.isArray(parsed)) return { validDrafts: [], rejectedCount: 0, error: 'Queue JSON must be an array' };
      var validDrafts = [];
      var rejectedCount = 0;
      parsed.forEach(function (item) {
        var res = validateDraftItem(item);
        if (res.valid) validDrafts.push(res.draft);
        else rejectedCount += 1;
      });
      return { validDrafts: validDrafts, rejectedCount: rejectedCount, error: null };
    } catch (err) {
      return { validDrafts: [], rejectedCount: 0, error: 'Invalid JSON: ' + err.message };
    }
  }
  function createGovDraftQueuePanel(options) {
    var opts = options || {};
    var drafts = [];
    var panel = el('section', 'card cso-fp-draft-queue');
    panel.setAttribute('aria-label', 'Incoming .gov.in Draft Queue');

    var head = el('div', 'cso-fp-head');
    head.appendChild(el('strong', 'cso-fp-title', '📥 Incoming .gov.in Draft Queue'));
    var fileLabel = el('label', 'btn sm primary cso-fp-file-btn');
    fileLabel.appendChild(el('span', null, 'Load drafts-queue.json'));
    var fileInp = el('input', 'cso-fp-file-input');
    fileInp.type = 'file';
    fileInp.accept = '.json,application/json';
    fileInp.setAttribute('aria-label', 'Load drafts-queue.json');
    fileLabel.appendChild(fileInp);
    head.appendChild(fileLabel);

    var statusLine = el('div', 'hint cso-fp-draft-status', 'Import scripts/crawl4ai/drafts-queue.json to review verified .gov.in notices.');
    var listEl = el('div', 'cso-fp-draft-list');

    function renderQueue() {
      clear(listEl);
      if (!drafts.length) {
        listEl.appendChild(el('div', 'cso-fp-empty', 'No pending .gov.in drafts loaded.'));
        return;
      }
      drafts.forEach(function (d, idx) {
        var row = el('div', 'cso-fp-draft-item');
        var meta = el('div', 'cso-fp-draft-meta');
        meta.appendChild(el('span', 'cso-fp-pbadge', d.agency));
        meta.appendChild(el('span', 'cso-fp-pbadge is-ok', '✓ ' + d.source_domain));
        meta.appendChild(el('span', 'cso-fp-pbadge is-warn', d.last_date ? 'Last date: ' + d.last_date : 'Deadline: TBA'));
        row.appendChild(meta);
        row.appendChild(el('strong', 'cso-fp-draft-title', d.title));
        var act = el('div', 'cso-fp-draft-actions');
        act.appendChild(btn('Load into Editor', 'btn sm primary', function () {
          if (typeof opts.onLoadDraft === 'function') opts.onLoadDraft(d);
        }));
        act.appendChild(btn('Dismiss', 'btn sm danger', function () {
          drafts.splice(idx, 1);
          renderQueue();
        }));
        row.appendChild(act);
        listEl.appendChild(row);
      });
    }

    fileInp.addEventListener('change', function () {
      var file = fileInp.files && fileInp.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        var res = parseDraftQueueJson(reader.result);
        if (res.error) {
          statusLine.textContent = res.error;
          return;
        }
        drafts = res.validDrafts;
        statusLine.textContent = 'Loaded ' + drafts.length + ' verified .gov.in draft(s)' +
          (res.rejectedCount ? ' (' + res.rejectedCount + ' non-.gov.in item(s) rejected).' : '.');
        renderQueue();
      };
      reader.readAsText(file);
    });

    panel.appendChild(head);
    panel.appendChild(statusLine);
    panel.appendChild(listEl);
    renderQueue();
    return { node: panel, setDrafts: function (items) { drafts = items || []; renderQueue(); } };
  }

  root.CSOFastPublish = {
    parseQuestionsBlock: parseQuestionsBlock,
    syncQuestionsBlock: syncQuestionsBlock,
    parseResources: parseResources,
    serializeResources: serializeResources,
    classifyLink: classifyLink,
    isOfficialDomain: isOfficialDomain,
    isVerifiedGovDomain: isVerifiedGovDomain,
    extractGovDomain: extractGovDomain,
    validateDraftItem: validateDraftItem,
    parseDraftQueueJson: parseDraftQueueJson,
    createGovDraftQueuePanel: createGovDraftQueuePanel,
    isExpired: isExpired,
    buildTriage: buildTriage,
    createRowBuilder: createRowBuilder,
    createDatesBuilder: createDatesBuilder,
    createResourcesBuilder: createResourcesBuilder,
    createQuestionsBuilder: createQuestionsBuilder,
    openPreviewDrawer: openPreviewDrawer,
    closePreviewDrawer: closePreviewDrawer,
    renderTriagePanel: renderTriagePanel
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.CSOFastPublish;
})(typeof window !== 'undefined' ? window : globalThis);
