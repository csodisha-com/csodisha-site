/**
 * Common Sense Odisha — Interactive Odisha Govt Job & Exam
 * Weekly Digest Card & Bulletin Composer (/updates/ & /admin/, v440)
 * Hydrates live D1 notices from /api/public/search-index (with curated offline fallback),
 * buckets items into 4 editorial sections, and formats English / ଓଡ଼ିଆ / Bilingual
 * bulletins for Telegram, WhatsApp, or Printable Weekly Wall-Charts.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations;
 * 4-theme var(--cso-*) semantic tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOWeeklyDigestComposer = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOWeeklyDigestComposer = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v440';
  var ROOT_ID = 'cso-weekly-digest-composer-root';
  var PREFS_KEY = 'cso_weekly_digest_prefs_v1';

  var FALLBACK_ITEMS = [
    {
      id: 'opsc-oas-closing',
      bucket: 'urgent',
      org: 'OPSC',
      titleEn: 'OPSC Odisha Civil Services (OAS / OFS) Online Application Closing Soon',
      titleOr: 'OPSC ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସେସ୍ (OAS / OFS) ଆବେଦନ ଶେଷ ତାରିଖ ନିକଟ',
      deadline: '2026-12-03',
      url: 'https://csodisha.com/jobs/'
    },
    {
      id: 'ossp-scholarship-closing',
      bucket: 'urgent',
      org: 'OSSP',
      titleEn: 'Odisha State Scholarship Portal (Post-Matric / GSSY / e-Medhabruti) Window',
      titleOr: 'ଓଡ଼ିଶା ରାଜ୍ୟ ଛାତ୍ରବୃତ୍ତି ପୋର୍ଟାଲ୍ (ପୋଷ୍ଟ-ମ୍ୟାଟ୍ରିକ୍ / GSSY) ଶେଷ ତାରିଖ',
      deadline: '2026-12-04',
      url: 'https://csodisha.com/schemes/#cso-scholarship-aid-finder-root'
    },
    {
      id: 'ossc-cglre-new',
      bucket: 'new-jobs',
      org: 'OSSC',
      titleEn: 'OSSC Combined Graduate Level (CGLRE) Recruitment Notification (₹0 Fee)',
      titleOr: 'OSSC ସମ୍ମିଳିତ ସ୍ନାତକ ସ୍ତରୀୟ (CGLRE) ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି (₹0 ଫି)',
      deadline: '2026-12-24',
      url: 'https://csodisha.com/jobs/'
    },
    {
      id: 'osssc-district-new',
      bucket: 'new-jobs',
      org: 'OSSSC',
      titleEn: 'OSSSC Combined District Cadre (RI / ARI / Amin / SFS) Recruitment',
      titleOr: 'OSSSC ଜିଲ୍ଲା କ୍ୟାଡର୍ (RI / ARI / ଅମିନ / SFS) ନିଯୁକ୍ତି',
      deadline: '2026-12-28',
      url: 'https://csodisha.com/jobs/'
    },
    {
      id: 'oavs-admit-card',
      bucket: 'exams-admit',
      org: 'OAVS',
      titleEn: 'OAVS TGT / PGT / Principal CBT Exam City & Admit Card Schedule',
      titleOr: 'OAVS TGT / PGT / ପ୍ରିନ୍ସିପାଲ୍ CBT ପରୀକ୍ଷା ଓ ଆଡମିଟ୍ କାର୍ଡ ସୂଚୀ',
      deadline: '2026-12-12',
      url: 'https://csodisha.com/exams/'
    },
    {
      id: 'oprb-si-exam',
      bucket: 'exams-admit',
      org: 'OPRB',
      titleEn: 'Odisha Police SI (CPSE) Written Exam & PET/PST Logistics Notice',
      titleOr: 'ଓଡ଼ିଶା ପୋଲିସ୍ SI (CPSE) ଲିଖିତ ପରୀକ୍ଷା ଓ PET/PST ସୂଚନା',
      deadline: '2026-12-16',
      url: 'https://csodisha.com/exams/'
    },
    {
      id: 'ossc-key-result',
      bucket: 'results-keys',
      org: 'OSSC',
      titleEn: 'OSSC Prelims Provisional Answer Key & Cut-Off Estimator Live',
      titleOr: 'OSSC ପ୍ରିଲିମ୍ସ ପ୍ରୋଭିଜନାଲ୍ ଆନ୍ସର୍ କି ଓ କଟ୍-ଅଫ୍ ପ୍ରକାଶିତ',
      deadline: '2026-12-10',
      url: 'https://csodisha.com/results/'
    },
    {
      id: 'otet-result',
      bucket: 'results-keys',
      org: 'BSE Odisha',
      titleEn: 'OTET / OSSTET Qualifying Scorecard & Certificate Download Guide',
      titleOr: 'OTET / OSSTET ସ୍କୋରକାର୍ଡ ଓ ପ୍ରମାଣପତ୍ର ଡାଉନଲୋଡ୍ ଗାଇଡ୍',
      deadline: '2026-12-14',
      url: 'https://csodisha.com/results/'
    }
  ];

  var SECTION_META = [
    { id: 'urgent', en: '🔥 Closing Within 7 Days (Urgent Deadlines)', or: '🔥 ୭ ଦିନ ମଧ୍ୟରେ ଶେଷ ହେଉଥିବା ଜରୁରୀ ତାରିଖ' },
    { id: 'new-jobs', en: '📢 Newly Published Recruitment Notices', or: '📢 ନୂଆ ପ୍ରକାଶିତ ନିଯୁକ୍ତି ବିଜ୍ଞପ୍ତି' },
    { id: 'exams-admit', en: '🪪 Upcoming Exam Dates & Admit Cards', or: '🪪 ଆଗାମୀ ପରୀକ୍ଷା ତାରିଖ ଓ ଆଡମିଟ୍ କାର୍ଡ' },
    { id: 'results-keys', en: '🏆 Published Results, Answer Keys & Cut-Offs', or: '🏆 ପ୍ରକାଶିତ ଫଳାଫଳ, ଆନ୍ସର୍ କି ଓ କଟ୍-ଅଫ୍' }
  ];

  function classifyItemBucket(item) {
    if (item && ['urgent', 'new-jobs', 'exams-admit', 'results-keys'].indexOf(item.bucket) !== -1) {
      return item.bucket;
    }
    var t = String((item && (item.type || item.category || item.titleEn || item.title)) || '').toLowerCase();
    if (t.indexOf('result') !== -1 || t.indexOf('answer key') !== -1 || t.indexOf('cutoff') !== -1) return 'results-keys';
    if (t.indexOf('admit') !== -1 || t.indexOf('exam') !== -1) return 'exams-admit';
    if (t.indexOf('closing') !== -1 || t.indexOf('urgent') !== -1) return 'urgent';
    return 'new-jobs';
  }

  function formatItemLine(item, language, channelFormat) {
    var en = item.titleEn || item.title || item.id;
    var or = item.titleOr || en;
    var label = language === 'or' ? or : (language === 'bilingual' ? (en + ' / ' + or) : en);
    var suffix = item.deadline ? (' [' + item.deadline + ']') : '';
    var link = item.url || 'https://csodisha.com/updates/';

    if (channelFormat === 'telegram') {
      return '- **[' + (item.org || 'CSO') + ']** [' + label + '](' + link + ')' + suffix;
    }
    if (channelFormat === 'whatsapp') {
      return '▸ *' + (item.org || 'CSO') + '*: ' + label + suffix + ' — ' + link;
    }
    return '• [' + (item.org || 'CSO') + '] ' + label + suffix;
  }

  function composeWeeklyDigestBulletin(opts) {
    var o = opts || {};
    var items = (Array.isArray(o.items) && o.items.length > 0) ? o.items : FALLBACK_ITEMS;
    var language = (['en', 'or', 'bilingual'].indexOf(String(o.language || 'bilingual').toLowerCase()) !== -1)
      ? String(o.language).toLowerCase()
      : 'bilingual';
    var channelFormat = (['telegram', 'whatsapp', 'wallchart'].indexOf(String(o.channelFormat || 'telegram').toLowerCase()) !== -1)
      ? String(o.channelFormat).toLowerCase()
      : 'telegram';
    var windowDays = Math.max(7, Math.min(30, parseInt(o.windowDays, 10) || 7));
    var editionTitle = String(o.editionTitle || 'CS Odisha Weekly Govt Job & Exam Bulletin (Next ' + windowDays + ' Days)').trim();
    var customHighlight = String(o.customHighlight || '').trim();

    var buckets = { urgent: [], 'new-jobs': [], 'exams-admit': [], 'results-keys': [] };
    items.forEach(function (it) {
      var b = classifyItemBucket(it);
      buckets[b].push(it);
    });

    var lines = [];
    if (channelFormat === 'telegram') {
      lines.push('### 🗞️ ' + editionTitle);
    } else if (channelFormat === 'whatsapp') {
      lines.push('*🗞️ ' + editionTitle + '*');
    } else {
      lines.push(editionTitle.toUpperCase());
      lines.push('==================================================');
    }
    if (customHighlight) {
      lines.push((channelFormat === 'whatsapp' ? '_' + customHighlight + '_' : '> ' + customHighlight));
    }
    lines.push('');

    var sections = [];
    SECTION_META.forEach(function (sec) {
      var list = buckets[sec.id] || [];
      if (list.length === 0) return;
      var secTitle = language === 'or' ? sec.or : (language === 'bilingual' ? (sec.en + ' | ' + sec.or) : sec.en);
      sections.push({ id: sec.id, title: secTitle, items: list });
      lines.push(channelFormat === 'telegram' ? ('**' + secTitle + '**') : (channelFormat === 'whatsapp' ? ('*' + secTitle + '*') : secTitle));
      list.forEach(function (it) {
        lines.push(formatItemLine(it, language, channelFormat));
      });
      lines.push('');
    });

    lines.push('🌐 Full Live Directory: https://csodisha.com/updates/ | Tools: https://csodisha.com/tools/');

    return {
      editionTitle: editionTitle,
      language: language,
      channelFormat: channelFormat,
      windowDays: windowDays,
      totalItems: items.length,
      sections: sections,
      formattedText: lines.join('\n')
    };
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
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function copyText(str) {
    if (win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
      return win.navigator.clipboard.writeText(str);
    }
    return new Promise(function (resolve) {
      try {
        var ta = doc.createElement('textarea');
        ta.value = str;
        ta.className = 'cso-sr-only';
        doc.body.appendChild(ta);
        ta.select();
        doc.execCommand('copy');
        ta.remove();
      } catch (_) {}
      resolve();
    });
  }

  function downloadMd(filename, content) {
    try {
      var blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = doc.createElement('a');
      a.href = url;
      a.download = filename;
      doc.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (_) {}
  }

  function mount(container) {
    if (!doc || !container) return null;
    var saved = loadPrefs() || {};
    var state = {
      language: saved.language || 'bilingual',
      channelFormat: saved.channelFormat || 'telegram',
      windowDays: saved.windowDays || 7,
      editionTitle: saved.editionTitle || 'CS Odisha Weekly Govt Job & Exam Bulletin',
      customHighlight: saved.customHighlight || 'Zero Odisha State Govt exam fees across OPSC, OSSC & OSSSC drives.',
      excludedIds: (saved.excludedIds && typeof saved.excludedIds === 'object') ? saved.excludedIds : {}
    };

    var pool = FALLBACK_ITEMS.slice();
    if (typeof win.fetch === 'function') {
      win.fetch('/api/public/search-index').then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (data) {
        var live = data && Array.isArray(data.items) ? data.items : [];
        var seen = {};
        pool.forEach(function (x) { seen[x.id] = true; });
        var added = 0;
        live.forEach(function (it) {
          if (added >= 4 || !it || !it.slug || seen['d1-' + it.slug]) return;
          seen['d1-' + it.slug] = true;
          pool.push({
            id: 'd1-' + it.slug,
            bucket: classifyItemBucket(it),
            org: it.org || 'CS Odisha',
            titleEn: it.title || it.slug,
            titleOr: it.title_or || it.title || it.slug,
            deadline: it.deadline || '',
            url: it.url ? ('https://csodisha.com' + it.url) : 'https://csodisha.com/updates/'
          });
          added += 1;
        });
        if (added > 0) render();
      }).catch(function () {});
    }

    function persistAndRender() {
      savePrefs(state);
      render();
    }

    function render() {
      var selectedItems = pool.filter(function (it) { return !state.excludedIds[it.id]; });
      var digest = composeWeeklyDigestBulletin({
        items: selectedItems,
        language: state.language,
        channelFormat: state.channelFormat,
        windowDays: state.windowDays,
        editionTitle: state.editionTitle,
        customHighlight: state.customHighlight
      });

      var card = el('div', 'cso-wdc-card');
      card.setAttribute('data-cso-weekly-digest', '1');

      // Header
      var head = el('div', 'cso-wdc-head');
      head.appendChild(el('div', 'cso-wdc-eyebrow', '🗞️ WEEKLY JOB & EXAM DIGEST BULLETIN COMPOSER'));
      head.appendChild(el('h2', 'cso-wdc-title', 'Odisha Govt Weekly Digest Card & Multi-Channel Bulletin Composer'));
      head.appendChild(el('p', 'cso-wdc-sub', 'Curate live D1 Odisha recruitment notices, exam dates & results into ready-to-share Telegram, WhatsApp, or Printable Wall-Chart editions in English, ଓଡ଼ିଆ, or Bilingual mode.'));
      card.appendChild(head);

      // Controls Grid
      var grid = el('div', 'cso-wdc-grid');
      function addField(label, ctrl) {
        var box = el('div', 'cso-wdc-field');
        var lbl = el('label', 'cso-wdc-label', label);
        if (ctrl.id) lbl.setAttribute('for', ctrl.id);
        box.appendChild(lbl);
        box.appendChild(ctrl);
        grid.appendChild(box);
      }

      var langSel = el('select', 'cso-wdc-input');
      langSel.id = 'cso-wdc-lang';
      [
        { id: 'en', label: 'English (EN)' },
        { id: 'or', label: 'Odia (ଓଡ଼ିଆ)' },
        { id: 'bilingual', label: 'Bilingual (EN + ଓଡ଼ିଆ)' }
      ].forEach(function (l) {
        var opt = el('option', '', l.label);
        opt.value = l.id;
        if (l.id === state.language) opt.selected = true;
        langSel.appendChild(opt);
      });
      langSel.addEventListener('change', function () { state.language = langSel.value; persistAndRender(); });
      addField('Language Edition', langSel);

      var fmtSel = el('select', 'cso-wdc-input');
      fmtSel.id = 'cso-wdc-fmt';
      [
        { id: 'telegram', label: 'Telegram Channel Post (Markdown + Links)' },
        { id: 'whatsapp', label: 'WhatsApp Broadcast Card (Emoji Bullets)' },
        { id: 'wallchart', label: 'Printable Weekly Wall-Chart Bulletin' }
      ].forEach(function (f) {
        var opt = el('option', '', f.label);
        opt.value = f.id;
        if (f.id === state.channelFormat) opt.selected = true;
        fmtSel.appendChild(opt);
      });
      fmtSel.addEventListener('change', function () { state.channelFormat = fmtSel.value; persistAndRender(); });
      addField('Output Channel Format', fmtSel);

      var winSel = el('select', 'cso-wdc-input');
      winSel.id = 'cso-wdc-win';
      [7, 14, 30].forEach(function (d) {
        var opt = el('option', '', 'Next ' + d + ' Days');
        opt.value = String(d);
        if (d === Number(state.windowDays)) opt.selected = true;
        winSel.appendChild(opt);
      });
      winSel.addEventListener('change', function () { state.windowDays = parseInt(winSel.value, 10) || 7; persistAndRender(); });
      addField('Deadline Window', winSel);

      var titleInp = el('input', 'cso-wdc-input');
      titleInp.id = 'cso-wdc-title';
      titleInp.type = 'text';
      titleInp.value = state.editionTitle;
      titleInp.addEventListener('change', function () { state.editionTitle = titleInp.value.trim() || 'CS Odisha Weekly Bulletin'; persistAndRender(); });
      addField('Edition Header Title', titleInp);

      var noteInp = el('input', 'cso-wdc-input');
      noteInp.id = 'cso-wdc-note';
      noteInp.type = 'text';
      noteInp.value = state.customHighlight;
      noteInp.addEventListener('change', function () { state.customHighlight = noteInp.value.trim(); persistAndRender(); });
      addField('Custom Editor Highlight Note', noteInp);

      card.appendChild(grid);

      // Item Curation Checkboxes
      var curWrap = el('div', 'cso-wdc-curate');
      curWrap.appendChild(el('div', 'cso-wdc-sec-label', 'Select Notices to Include (' + selectedItems.length + ' / ' + pool.length + ' selected):'));
      var curGrid = el('div', 'cso-wdc-curate-grid');
      pool.forEach(function (it) {
        var lbl = el('label', 'cso-wdc-chk-pill');
        var cb = el('input', 'cso-wdc-checkbox');
        cb.type = 'checkbox';
        cb.checked = !state.excludedIds[it.id];
        cb.addEventListener('change', function () {
          if (cb.checked) delete state.excludedIds[it.id];
          else state.excludedIds[it.id] = true;
          persistAndRender();
        });
        lbl.appendChild(cb);
        lbl.appendChild(el('span', '', '[' + it.org + '] ' + it.titleEn));
        curGrid.appendChild(lbl);
      });
      curWrap.appendChild(curGrid);
      card.appendChild(curWrap);

      // Live Preview Card (#cso-weekly-digest-preview)
      var preview = el('div', 'cso-wdc-preview');
      preview.id = 'cso-weekly-digest-preview';
      preview.appendChild(el('h3', 'cso-wdc-preview-title', digest.editionTitle));
      var pre = el('pre', 'cso-wdc-pre', digest.formattedText);
      preview.appendChild(pre);
      card.appendChild(preview);

      // 1-Click Distribution Actions
      var actions = el('div', 'cso-wdc-actions');
      var statusEl = el('span', 'cso-wdc-copy-status');
      statusEl.setAttribute('aria-live', 'polite');

      var copyBtn = el('button', 'cso-wdc-btn cso-wdc-btn--primary', '📋 Copy Telegram / WhatsApp Bulletin');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        copyText(digest.formattedText).then(function () {
          statusEl.textContent = '✅ Bulletin copied for ' + state.channelFormat.toUpperCase() + '!';
          setTimeout(function () { statusEl.textContent = ''; }, 2400);
        });
      });
      actions.appendChild(copyBtn);

      var dlBtn = el('button', 'cso-wdc-btn', '📥 Download Weekly Digest (.md)');
      dlBtn.type = 'button';
      dlBtn.addEventListener('click', function () {
        downloadMd('csodisha-weekly-digest-' + state.language + '.md', digest.formattedText);
        statusEl.textContent = '✅ Downloaded weekly digest .md!';
        setTimeout(function () { statusEl.textContent = ''; }, 2400);
      });
      actions.appendChild(dlBtn);

      var printBtn = el('button', 'cso-wdc-btn', '🖨️ Print Weekly Wall-Chart');
      printBtn.type = 'button';
      printBtn.addEventListener('click', function () { if (typeof win.print === 'function') win.print(); });
      actions.appendChild(printBtn);
      actions.appendChild(statusEl);
      card.appendChild(actions);

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
    FALLBACK_ITEMS: FALLBACK_ITEMS,
    SECTION_META: SECTION_META,
    classifyItemBucket: classifyItemBucket,
    composeWeeklyDigestBulletin: composeWeeklyDigestBulletin,
    mount: mount
  };
});
