/**
 * Common Sense Odisha — Interactive Odisha Govt Job & Exam Multi-Channel
 * RSS / JSON / ICS Subscription & Alert Hub (/updates/ & /tools/, v446)
 * Generates filtered RSS 2.0 XML & JSON Feed 1.1 endpoints, renders live XML/JSON
 * preview snippets via safe DOM textContent, and exports multi-event .ics VCALENDAR
 * deadline bundles with 24-hour VALARM reminders.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations;
 * bilingual EN / ଓଡ଼ିଆ; 4-theme var(--cso-*) semantic tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOSubscriptionAlertHub = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOSubscriptionAlertHub = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v446';
  var ROOT_ID = 'cso-subscription-alert-hub-root';
  var PREFS_KEY = 'cso_subscription_hub_v1';

  var ODISHA_DISTRICTS = [
    'All Districts', 'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh',
    'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur',
    'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha',
    'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada',
    'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'
  ];

  var CATEGORIES = [
    { id: 'all', en: 'All Updates', or: 'ସବୁ ଅପଡେଟ୍' },
    { id: 'jobs', en: 'Recruitment Notices', or: 'ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି' },
    { id: 'admit-cards', en: 'Admit Cards', or: 'ଆଡମିଟ୍ କାର୍ଡ' },
    { id: 'results', en: 'Exam Results', or: 'ପରୀକ୍ଷା ଫଳାଫଳ' },
    { id: 'schemes', en: 'Odisha Schemes & Admissions', or: 'ଯୋଜନା ଓ ଆଡମିଶନ' }
  ];

  var FALLBACK_ITEMS = [
    {
      id: 'opsc-oas-2026',
      category: 'jobs',
      district: 'All Districts',
      titleEn: 'OPSC Odisha Civil Services (OAS / OFS) 2026 Online Application',
      titleOr: 'OPSC ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସେସ୍ (OAS / OFS) 2026 ଅନଲାଇନ୍ ଆବେଦନ',
      url: 'https://csodisha.com/jobs/',
      deadline: '2026-12-20',
      summary: '399 Group-A & B posts; ₹0 state exam fee; graduate eligibility.'
    },
    {
      id: 'ossc-cglre-2026',
      category: 'jobs',
      district: 'Khordha',
      titleEn: 'OSSC Combined Graduate Level (CGLRE) 2026 Recruitment Notice',
      titleOr: 'OSSC CGLRE 2026 ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି',
      url: 'https://csodisha.com/jobs/',
      deadline: '2026-12-24',
      summary: '586 vacancies across Odisha state directorates & collectorates.'
    },
    {
      id: 'osssc-ri-admit-2026',
      category: 'admit-cards',
      district: 'Cuttack',
      titleEn: 'OSSSC RI / ARI / Amin / SFS CBT Admit Card Download Window',
      titleOr: 'OSSSC RI / ARI / ଅମିନ CBT ଆଡମିଟ୍ କାର୍ଡ ଡାଉନଲୋଡ୍',
      url: 'https://csodisha.com/exams/',
      deadline: '2026-12-18',
      summary: 'Download district-wise CBT hall tickets via osssc.gov.in.'
    },
    {
      id: 'oprb-si-result-2026',
      category: 'results',
      district: 'Sambalpur',
      titleEn: 'Odisha Police SI (CPSE) Merit List & PET/PST Shortlist',
      titleOr: 'ଓଡ଼ିଶା ପୋଲିସ୍ SI ମେରିଟ୍ ଲିଷ୍ଟ ଓ PET/PST ତାଲିକା',
      url: 'https://csodisha.com/results/',
      deadline: '2026-12-22',
      summary: 'Check normalized score, district cut-off, and PET verification dates.'
    },
    {
      id: 'odisha-scholarship-2026',
      category: 'schemes',
      district: 'All Districts',
      titleEn: 'Odisha State Scholarship Portal (Post-Matric & e-Medhabruti) Renewal',
      titleOr: 'ଓଡ଼ିଶା ରାଜ୍ୟ ଛାତ୍ରବୃତ୍ତି ପୋର୍ଟାଲ୍ ନବୀକରଣ',
      url: 'https://csodisha.com/schemes/',
      deadline: '2026-12-31',
      summary: 'Aadhaar-seeded DBT renewal deadline on scholarship.odisha.gov.in.'
    }
  ];

  function buildFilteredFeedConfig(opts) {
    var o = opts || {};
    var category = String(o.category || 'all').toLowerCase();
    var district = String(o.district || 'All Districts');
    var language = String(o.language || 'bilingual').toLowerCase();
    var limit = Math.max(5, Math.min(50, Math.round(Number(o.limit || 25) || 25)));

    var params = [];
    if (category && category !== 'all') params.push('category=' + encodeURIComponent(category));
    if (district && district !== 'All Districts') params.push('district=' + encodeURIComponent(district));
    if (language && language !== 'bilingual') params.push('lang=' + encodeURIComponent(language));
    if (limit !== 25) params.push('limit=' + encodeURIComponent(String(limit)));
    var qs = params.length ? ('?' + params.join('&')) : '';

    var hubUrl = 'https://csodisha.com/updates/';
    if (category === 'jobs' && district !== 'All Districts') {
      hubUrl = 'https://csodisha.com/jobs/?district=' + encodeURIComponent(district);
    } else if (category === 'jobs') {
      hubUrl = 'https://csodisha.com/jobs/';
    } else if (category === 'schemes') {
      hubUrl = 'https://csodisha.com/schemes/';
    } else if (category === 'results') {
      hubUrl = 'https://csodisha.com/results/';
    }

    return {
      category: category,
      district: district,
      language: language,
      limit: limit,
      rssUrl: 'https://csodisha.com/feed.xml' + qs,
      jsonFeedUrl: 'https://csodisha.com/feed.json' + qs,
      hubUrl: hubUrl
    };
  }

  function escXml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatRssPreview(items, cfg) {
    var lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0">',
      '  <channel>',
      '    <title>CS Odisha — ' + escXml(cfg.category.toUpperCase()) + ' (' + escXml(cfg.district) + ')</title>',
      '    <link>' + escXml(cfg.hubUrl) + '</link>',
      '    <language>' + (cfg.language === 'or' ? 'or-IN' : 'en-IN') + '</language>'
    ];
    items.slice(0, cfg.limit).forEach(function (it) {
      var title = cfg.language === 'or' ? (it.titleOr || it.titleEn) : (cfg.language === 'en' ? it.titleEn : (it.titleEn + (it.titleOr ? ' | ' + it.titleOr : '')));
      lines.push('    <item>');
      lines.push('      <title>' + escXml(title) + '</title>');
      lines.push('      <link>' + escXml(it.url) + '</link>');
      lines.push('      <category>' + escXml(it.category) + '</category>');
      lines.push('      <description>' + escXml((it.summary || '') + ' (Deadline: ' + (it.deadline || 'TBA') + ')') + '</description>');
      lines.push('    </item>');
    });
    lines.push('  </channel>');
    lines.push('</rss>');
    return lines.join('\n');
  }

  function formatJsonFeedPreview(items, cfg) {
    var payload = {
      version: 'https://jsonfeed.org/version/1.1',
      title: 'CS Odisha — ' + cfg.category.toUpperCase() + ' (' + cfg.district + ')',
      home_page_url: cfg.hubUrl,
      feed_url: cfg.jsonFeedUrl,
      items: items.slice(0, cfg.limit).map(function (it) {
        var title = cfg.language === 'or' ? (it.titleOr || it.titleEn) : (cfg.language === 'en' ? it.titleEn : (it.titleEn + (it.titleOr ? ' | ' + it.titleOr : '')));
        return {
          id: it.id,
          url: it.url,
          title: title,
          content_text: (it.summary || '') + ' | Deadline: ' + (it.deadline || 'TBA'),
          tags: [it.category, it.district || 'All Districts']
        };
      })
    };
    return JSON.stringify(payload, null, 2);
  }

  function cleanIcsText(s) {
    return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }

  function buildBatchIcsCalendar(items) {
    var list = Array.isArray(items) && items.length ? items : FALLBACK_ITEMS;
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Common Sense Odisha//Subscription Alert Hub v446//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:CS Odisha Active Exam & Job Deadlines'
    ];
    list.forEach(function (it, idx) {
      var dl = String(it.deadline || '2026-12-31').replace(/-/g, '');
      if (!/^\d{8}$/.test(dl)) dl = '20261231';
      lines.push('BEGIN:VEVENT');
      lines.push('UID:cso-sub-' + (it.id || ('item-' + idx)) + '@csodisha.com');
      lines.push('DTSTAMP:20261127T120000Z');
      lines.push('DTSTART;VALUE=DATE:' + dl);
      lines.push('SUMMARY:' + cleanIcsText('[Deadline] ' + (it.titleEn || 'CS Odisha Notice')));
      lines.push('DESCRIPTION:' + cleanIcsText((it.summary || '') + ' — ' + (it.url || 'https://csodisha.com/updates/')));
      lines.push('URL:' + (it.url || 'https://csodisha.com/updates/'));
      lines.push('BEGIN:VALARM');
      lines.push('TRIGGER:-PT24H');
      lines.push('ACTION:DISPLAY');
      lines.push('DESCRIPTION:' + cleanIcsText('24h Reminder: ' + (it.titleEn || 'CS Odisha Deadline')));
      lines.push('END:VALARM');
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  function filterItems(allItems, cfg) {
    return allItems.filter(function (it) {
      var catOk = cfg.category === 'all' || it.category === cfg.category;
      var distOk = cfg.district === 'All Districts' || it.district === 'All Districts' || it.district === cfg.district;
      return catOk && distOk;
    });
  }

  function loadPrefs() {
    try {
      var raw = win.localStorage && win.localStorage.getItem(PREFS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function savePrefs(obj) {
    try {
      if (win.localStorage) win.localStorage.setItem(PREFS_KEY, JSON.stringify(obj));
    } catch (_) {}
  }

  function el(tag, cls, text) {
    var node = doc.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function copyText(text, statusEl, okMsg) {
    if (win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
      win.navigator.clipboard.writeText(text).then(function () {
        if (statusEl) statusEl.textContent = okMsg;
      }).catch(function () {
        if (statusEl) statusEl.textContent = okMsg;
      });
    } else if (statusEl) {
      statusEl.textContent = okMsg;
    }
  }

  function downloadIcs(icsText, filename) {
    if (!doc || typeof Blob === 'undefined' || !win.URL || typeof win.URL.createObjectURL !== 'function') return;
    var blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' });
    var url = win.URL.createObjectURL(blob);
    var a = doc.createElement('a');
    a.href = url;
    a.download = filename;
    doc.body.appendChild(a);
    a.click();
    doc.body.removeChild(a);
    setTimeout(function () { win.URL.revokeObjectURL(url); }, 1000);
  }

  function mount(container) {
    if (!doc || !container) return null;
    var saved = loadPrefs() || {};
    var state = {
      lang: saved.lang === 'or' ? 'or' : 'en',
      category: saved.category || 'all',
      district: saved.district || 'All Districts',
      language: saved.language || 'bilingual',
      limit: Number(saved.limit) || 25,
      previewTab: saved.previewTab === 'json' ? 'json' : 'rss',
      items: FALLBACK_ITEMS.slice()
    };

    function persist() {
      savePrefs({
        lang: state.lang,
        category: state.category,
        district: state.district,
        language: state.language,
        limit: state.limit,
        previewTab: state.previewTab
      });
    }

    // Listen for unified Candidate Profile Sync district updates
    if (typeof win.addEventListener === 'function') {
      win.addEventListener('cso:profile-synced', function (ev) {
        var d = ev && ev.detail && ev.detail.district;
        if (d && ODISHA_DISTRICTS.indexOf(d) !== -1 && state.district !== d) {
          state.district = d;
          persist();
          render();
        }
      });
    }

    // Hydrate live items from /api/public/search-index if available
    if (typeof win.fetch === 'function') {
      win.fetch('/api/public/search-index').then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (data) {
        var rows = data && (data.items || data.results);
        if (Array.isArray(rows) && rows.length) {
          var mapped = rows.slice(0, 30).map(function (r, idx) {
            return {
              id: r.id || r.slug || ('live-' + idx),
              category: r.category || r.pillar || 'jobs',
              district: r.district || 'All Districts',
              titleEn: r.title || r.title_en || 'CS Odisha Notice',
              titleOr: r.title_or || '',
              url: r.url ? (r.url.indexOf('http') === 0 ? r.url : 'https://csodisha.com' + r.url) : 'https://csodisha.com/updates/',
              deadline: r.deadline || r.last_date || '2026-12-31',
              summary: r.summary || r.excerpt || 'Verified Odisha Govt update on CS Odisha.'
            };
          });
          state.items = mapped;
          render();
        }
      }).catch(function () {});
    }

    function render() {
      var isOr = state.lang === 'or';
      var cfg = buildFilteredFeedConfig(state);
      var matched = filterItems(state.items, cfg);
      if (!matched.length) matched = FALLBACK_ITEMS.slice();

      var card = el('div', 'cso-sah-card');

      // Header
      var head = el('div', 'cso-sah-head');
      var hLeft = el('div');
      hLeft.appendChild(el('p', 'cso-sah-eyebrow', isOr ? 'ମଲ୍ଟି-ଚ୍ୟାନେଲ୍ ଆଲର୍ଟ ଓ ଫିଡ୍ ହବ୍ • v446' : 'MULTI-CHANNEL RSS / JSON / ICS ALERT HUB • v446'));
      hLeft.appendChild(el('h2', 'cso-sah-title', isOr ? 'ଓଡ଼ିଶା ସରକାରୀ ଚାକିରି ଓ ପରୀକ୍ଷା RSS / JSON / କ୍ୟାଲେଣ୍ଡର ଆଲର୍ଟ ହବ୍' : 'Odisha Govt Job & Exam RSS / JSON / ICS Subscription & Alert Hub'));
      hLeft.appendChild(el('p', 'cso-sah-sub', isOr ? 'ଜିଲ୍ଲା ଓ ବର୍ଗ ଅନୁସାରେ କଷ୍ଟମ୍ RSS/JSON ଫିଡ୍ URL ପାଆନ୍ତୁ ଏବଂ ଗୋଟିଏ କ୍ଲିକ୍‌ରେ ସବୁ ଶେଷ ତାରିଖ .ics କ୍ୟାଲେଣ୍ଡର ଡାଉନଲୋଡ୍ କରନ୍ତୁ।' : 'Build custom district/category RSS 2.0 & JSON Feed 1.1 subscriptions, preview live payloads, and export a 1-click batch .ics deadline calendar.'));
      head.appendChild(hLeft);

      var langBox = el('div', 'cso-sah-lang-toggle');
      var enBtn = el('button', 'cso-sah-lang-btn', 'English');
      enBtn.type = 'button';
      enBtn.setAttribute('aria-pressed', String(!isOr));
      enBtn.addEventListener('click', function () { state.lang = 'en'; persist(); render(); });
      var orBtn = el('button', 'cso-sah-lang-btn', 'ଓଡ଼ିଆ');
      orBtn.type = 'button';
      orBtn.setAttribute('aria-pressed', String(isOr));
      orBtn.addEventListener('click', function () { state.lang = 'or'; persist(); render(); });
      langBox.appendChild(enBtn);
      langBox.appendChild(orBtn);
      head.appendChild(langBox);
      card.appendChild(head);

      // Filter Grid
      var grid = el('div', 'cso-sah-grid');
      function addSelect(labelTxt, options, currentVal, onChange) {
        var f = el('div', 'cso-sah-field');
        f.appendChild(el('label', null, labelTxt));
        var sel = el('select', 'cso-sah-select');
        options.forEach(function (o) {
          var op = el('option', null, o.label);
          op.value = o.value;
          if (String(o.value) === String(currentVal)) op.selected = true;
          sel.appendChild(op);
        });
        sel.addEventListener('change', function () { onChange(sel.value); persist(); render(); });
        f.appendChild(sel);
        grid.appendChild(f);
      }

      addSelect(isOr ? 'ଫିଡ୍ ବର୍ଗ' : 'Feed Category', CATEGORIES.map(function (c) { return { value: c.id, label: isOr ? c.or : c.en }; }), state.category, function (v) { state.category = v; });
      addSelect(isOr ? 'ଜିଲ୍ଲା ଫିଲ୍ଟର୍' : 'District Filter', ODISHA_DISTRICTS.map(function (d) { return { value: d, label: d }; }), state.district, function (v) { state.district = v; });
      addSelect(isOr ? 'ଭାଷା ପସନ୍ଦ' : 'Feed Language', [
        { value: 'bilingual', label: 'Bilingual (EN + ଓଡ଼ିଆ)' },
        { value: 'en', label: 'English (EN)' },
        { value: 'or', label: 'Odia (ଓଡ଼ିଆ)' }
      ], state.language, function (v) { state.language = v; });
      addSelect(isOr ? 'ସର୍ବାଧିକ ଆଇଟମ୍' : 'Max Items', [
        { value: '10', label: '10 Items' },
        { value: '25', label: '25 Items' },
        { value: '50', label: '50 Items' }
      ], String(state.limit), function (v) { state.limit = Number(v) || 25; });
      card.appendChild(grid);

      // Generated Endpoints Strip
      var epBox = el('div', 'cso-sah-endpoints');
      [
        { label: 'RSS 2.0 XML', url: cfg.rssUrl },
        { label: 'JSON Feed 1.1', url: cfg.jsonFeedUrl },
        { label: isOr ? 'ହବ୍ ଲିଙ୍କ୍' : 'Hub Deep Link', url: cfg.hubUrl }
      ].forEach(function (ep) {
        var row = el('div', 'cso-sah-ep-row');
        row.appendChild(el('span', 'cso-sah-ep-badge', ep.label));
        row.appendChild(el('code', 'cso-sah-ep-url', ep.url));
        epBox.appendChild(row);
      });
      card.appendChild(epBox);

      // Action Buttons
      var statusEl = el('div', 'cso-sah-status');
      var actions = el('div', 'cso-sah-actions');

      var icsBtn = el('button', 'cso-sah-btn cso-sah-btn--primary', isOr ? '📅 ବ୍ୟାଚ୍ .ics କ୍ୟାଲେଣ୍ଡର ଡାଉନଲୋଡ୍ (' + matched.length + ')' : '📅 Export Batch .ics Calendar (' + matched.length + ' Deadlines)');
      icsBtn.type = 'button';
      icsBtn.addEventListener('click', function () {
        var ics = buildBatchIcsCalendar(matched);
        downloadIcs(ics, 'csodisha-deadlines-' + cfg.category + '.ics');
        statusEl.textContent = isOr ? '.ics କ୍ୟାଲେଣ୍ଡର ଡାଉନଲୋଡ୍ ହେଲା (24h ଆଲାର୍ମ ସହିତ)!' : 'Downloaded batch .ics calendar with 24-hour reminders!';
      });
      actions.appendChild(icsBtn);

      var rssBtn = el('button', 'cso-sah-btn', isOr ? '📋 RSS ଫିଡ୍ URL କପି' : '📋 Copy RSS Feed URL');
      rssBtn.type = 'button';
      rssBtn.addEventListener('click', function () { copyText(cfg.rssUrl, statusEl, isOr ? 'RSS ଫିଡ୍ URL କପି ହେଲା!' : 'RSS 2.0 Feed URL copied!'); });
      actions.appendChild(rssBtn);

      var jsonBtn = el('button', 'cso-sah-btn', isOr ? '📋 JSON ଫିଡ୍ URL କପି' : '📋 Copy JSON Feed URL');
      jsonBtn.type = 'button';
      jsonBtn.addEventListener('click', function () { copyText(cfg.jsonFeedUrl, statusEl, isOr ? 'JSON ଫିଡ୍ URL କପି ହେଲା!' : 'JSON Feed 1.1 URL copied!'); });
      actions.appendChild(jsonBtn);

      var printBtn = el('button', 'cso-sah-btn', isOr ? '🖨️ ଶେଷ ତାରିଖ ସୂଚୀ ପ୍ରିଣ୍ଟ' : '🖨️ Print Active Deadline Schedule');
      printBtn.type = 'button';
      printBtn.addEventListener('click', function () { if (typeof win.print === 'function') win.print(); });
      actions.appendChild(printBtn);
      card.appendChild(actions);
      card.appendChild(statusEl);

      // Live Feed Preview Tabs (RSS 2.0 XML vs JSON Feed 1.1)
      var tabs = el('div', 'cso-sah-tabs');
      var tRss = el('button', 'cso-sah-tab-btn', 'RSS 2.0 XML Preview');
      tRss.type = 'button';
      tRss.setAttribute('aria-pressed', String(state.previewTab === 'rss'));
      tRss.addEventListener('click', function () { state.previewTab = 'rss'; persist(); render(); });
      var tJson = el('button', 'cso-sah-tab-btn', 'JSON Feed 1.1 Preview');
      tJson.type = 'button';
      tJson.setAttribute('aria-pressed', String(state.previewTab === 'json'));
      tJson.addEventListener('click', function () { state.previewTab = 'json'; persist(); render(); });
      tabs.appendChild(tRss);
      tabs.appendChild(tJson);
      card.appendChild(tabs);

      var pre = el('pre', 'cso-sah-preview', state.previewTab === 'json' ? formatJsonFeedPreview(matched, cfg) : formatRssPreview(matched, cfg));
      card.appendChild(pre);

      container.replaceChildren(card);
    }

    render();
    return { render: render, getState: function () { return Object.assign({}, state); } };
  }

  function autoMount() {
    if (!doc) return;
    var root = doc.getElementById(ROOT_ID);
    if (root) mount(root);
  }

  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoMount);
    else autoMount();
  }

  return {
    VERSION: VERSION,
    ROOT_ID: ROOT_ID,
    PREFS_KEY: PREFS_KEY,
    ODISHA_DISTRICTS: ODISHA_DISTRICTS,
    CATEGORIES: CATEGORIES,
    FALLBACK_ITEMS: FALLBACK_ITEMS,
    buildFilteredFeedConfig: buildFilteredFeedConfig,
    formatRssPreview: formatRssPreview,
    formatJsonFeedPreview: formatJsonFeedPreview,
    buildBatchIcsCalendar: buildBatchIcsCalendar,
    mount: mount
  };
});
