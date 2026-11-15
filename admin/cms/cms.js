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
  function toastWithUndo(msg, onUndo) {
    var existing = document.querySelector('.cso-undo-toast');
    if (existing) existing.remove();
    var bar = el('div', { class: 'cso-undo-toast' });
    bar.appendChild(el('span', { text: msg }));
    var undoBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--sm cso-ops-btn--primary', type: 'button', text: 'Undo' });
    var timer = setTimeout(function () { bar.remove(); }, 5000);
    undoBtn.addEventListener('click', async function () {
      clearTimeout(timer);
      undoBtn.disabled = true;
      try {
        await onUndo();
      } finally {
        bar.remove();
      }
    });
    bar.appendChild(undoBtn);
    document.body.appendChild(bar);
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
    if (embedded) { if (embedGroup && embedGroup.length) main.appendChild(embedTabs()); return; }
    main.appendChild(el('h1', { text: t })); document.title = t + ' — CS Odisha Admin';
  }
  function embedTabs() {
    var wrap = el('div', { class: 'tabs', role: 'tablist' });
    if (!embedGroup) return wrap;
    var cleanCur = curPath.replace(/^\//, '');
    var curBase = cleanCur.split('/')[0];
    var curTwo = cleanCur.split('/').slice(0, 2).join('/');
    var exactMatch = embedGroup.some(function (t) { return t[0] === cleanCur; });
    var twoMatch = !exactMatch && embedGroup.some(function (t) { return t[0] === curTwo; });
    embedGroup.forEach(function (t) {
      var selected = exactMatch ? (t[0] === cleanCur) : (twoMatch ? (t[0] === curTwo) : (t[0] === curBase));
      wrap.appendChild(el('a', { class: 'tab', role: 'tab', href: '#/' + t[0], 'aria-selected': String(selected), text: t[1] }));
    });
    return wrap;
  }

  /* ---------- bilingual social post generator (Jobs & Schemes) ---------- */
  var SOCIAL_URLS = {
    telegram: 'https://t.me/csodisha',
    whatsapp: 'https://whatsapp.com/channel/0029Vb9aQYZ1Hspy0nfzRe0w',
    youtube: 'https://www.youtube.com/@CSOdisha'
  };
  function cleanSocialText(v, maxLen) {
    var s = String(v || '').replace(/\s+/g, ' ').trim();
    if (!maxLen || s.length <= maxLen) return s;
    return s.slice(0, Math.max(0, maxLen - 1)).trim() + '…';
  }
  function buildSocialDeepLink(kind, item) {
    var slug = cleanSocialText(item && (item.slug || item.id));
    if (kind === 'schemes') {
      return slug ? ('https://csodisha.com/schemes-benefits/?scheme=' + encodeURIComponent(slug)) : 'https://csodisha.com/schemes-benefits/';
    }
    return slug ? ('https://csodisha.com/jobs-careers/?job=' + encodeURIComponent(slug)) : 'https://csodisha.com/jobs-careers/';
  }
  function buildBilingualSocialPosts(kind, item) {
    var it = item || {};
    var deepUrl = buildSocialDeepLink(kind, it);
    var titleEn = cleanSocialText(it.title) || (kind === 'schemes' ? 'Odisha Welfare Scheme' : 'Odisha Job Notification');
    var titleOr = cleanSocialText(it.title_or);
    var longLines = [];
    var shortPost = '';

    if (kind === 'schemes') {
      var dept = cleanSocialText(it.department);
      var gov = cleanSocialText(it.gov_level) || 'Odisha';
      var cat = cleanSocialText(it.category);
      var deptCat = [dept, gov, cat].filter(Boolean).join(' · ') || 'Odisha Welfare Scheme';
      var benefitEn = cleanSocialText(it.benefit_summary || it.summary, 220) || 'Check scheme benefits, eligibility, and required documents on Common Sense Odisha.';
      var benefitOr = cleanSocialText(it.benefit_summary_or || it.summary_or, 220);
      var eligParts = [];
      if (it.min_age || it.max_age) eligParts.push('Age: ' + (it.min_age || '0') + '–' + (it.max_age || 'Any') + ' yrs');
      if (it.max_income) eligParts.push('Income <= Rs. ' + it.max_income);
      if (it.gender_eligible && it.gender_eligible !== 'all') eligParts.push('Gender: ' + it.gender_eligible);
      if (it.target_groups) eligParts.push(cleanSocialText(Array.isArray(it.target_groups) ? it.target_groups.join(', ') : it.target_groups, 80));
      var windowLabel = cleanSocialText(it.application_status_label) || (it.verified_date ? 'Verified: ' + cleanSocialText(it.verified_date) : 'Open / Check Official Portal');

      longLines.push('🏛️ Odisha Scheme Alert | ସରକାରୀ ଯୋଜନା ସୂଚନା');
      longLines.push('');
      longLines.push('📌 ' + titleEn + (titleOr ? ' (' + titleOr + ')' : ''));
      longLines.push('🏢 Dept / Category: ' + deptCat);
      longLines.push('🎁 Benefit / ଲାଭ: ' + benefitEn);
      if (eligParts.length) longLines.push('✅ Eligibility: ' + eligParts.join(' · '));
      if (benefitOr) longLines.push('📝 ଓଡ଼ିଆ ସୂଚନା: ' + benefitOr);
      longLines.push('🗓️ Last Date / Window: ' + windowLabel);
      longLines.push('');
      longLines.push('👉 ସମ୍ପୂର୍ଣ୍ଣ ବିବରଣୀ ଓ ଆବେଦନ ପ୍ରକ୍ରିୟା:');
      longLines.push('🔗 ' + deepUrl);
      longLines.push('');
      longLines.push('📲 Follow Common Sense Odisha:');
      longLines.push('• Telegram: ' + SOCIAL_URLS.telegram);
      longLines.push('• WhatsApp: ' + SOCIAL_URLS.whatsapp);
      longLines.push('• YouTube: ' + SOCIAL_URLS.youtube);

      var schTags = '#OdishaSchemes #CSOdisha';
      var schSuffix = '\n\n🔗 ' + deepUrl + '\n' + schTags;
      var schPrefix = '🏛️ ' + (dept ? dept + ': ' : (gov ? gov + ' Scheme: ' : ''));
      var schExtra = it.benefit_summary ? ' — ' + cleanSocialText(it.benefit_summary, 70) : '';
      var schBudget = Math.max(0, 279 - schSuffix.length);
      var schBody = cleanSocialText(schPrefix + titleEn + schExtra, schBudget);
      shortPost = (schBody + schSuffix).slice(0, 279);
      if ((schBody + schSuffix).length > 279) {
        shortPost = (cleanSocialText(titleEn, Math.max(0, 279 - schSuffix.length)) + schSuffix).slice(0, 279);
      }
    } else {
      var org = cleanSocialText(it.organisation);
      var jobCat = cleanSocialText(it.category);
      var orgDept = [org, jobCat].filter(Boolean).join(' · ') || 'Odisha Govt / Public Sector';
      var vacText = (it.vacancies !== null && it.vacancies !== undefined && String(it.vacancies) !== '') ? String(it.vacancies) + ' Vacancies' : '';
      var eligSummary = cleanSocialText(it.qualification || it.summary, 220) || 'Check full eligibility criteria, age limit, and official PDF on Common Sense Odisha.';
      var odiaSummary = cleanSocialText(it.summary_or, 220);
      var lastDate = cleanSocialText(it.last_date) || 'See Official Notification';

      longLines.push('📢 Job Alert | ଚାକିରି ସୂଚନା');
      longLines.push('');
      longLines.push('📌 ' + titleEn + (titleOr ? ' (' + titleOr + ')' : ''));
      longLines.push('🏢 Dept / Category: ' + orgDept + (vacText ? ' (' + vacText + ')' : ''));
      longLines.push('🎓 Eligibility / Summary: ' + eligSummary);
      if (odiaSummary) longLines.push('📝 ଓଡ଼ିଆ ସୂଚନା: ' + odiaSummary);
      longLines.push('🗓️ Last Date / ଶେଷ ତାରିଖ: ' + lastDate);
      longLines.push('');
      longLines.push('👉 ସମ୍ପୂର୍ଣ୍ଣ ବିବରଣୀ ଓ ଅଫିସିଆଲ୍ ଲିଙ୍କ୍:');
      longLines.push('🔗 ' + deepUrl);
      longLines.push('');
      longLines.push('📲 Follow Common Sense Odisha:');
      longLines.push('• Telegram: ' + SOCIAL_URLS.telegram);
      longLines.push('• WhatsApp: ' + SOCIAL_URLS.whatsapp);
      longLines.push('• YouTube: ' + SOCIAL_URLS.youtube);

      var jobTags = '#OdishaJobs #CSOdisha';
      var jobSuffix = '\n\n🔗 ' + deepUrl + '\n' + jobTags;
      var jobPrefix = '📢 ' + (org ? org + ': ' : '');
      var jobTail = (vacText ? ' (' + vacText + ')' : '') + (it.last_date ? ' | Last Date: ' + cleanSocialText(it.last_date) : '');
      var jobBudget = Math.max(0, 279 - jobSuffix.length);
      var jobBody = cleanSocialText(jobPrefix + titleEn + jobTail, jobBudget);
      shortPost = (jobBody + jobSuffix).slice(0, 279);
      if ((jobBody + jobSuffix).length > 279) {
        shortPost = (cleanSocialText(titleEn, Math.max(0, 279 - jobSuffix.length)) + jobSuffix).slice(0, 279);
      }
    }
    return { longPost: longLines.join('\n'), shortPost: shortPost, deepUrl: deepUrl };
  }
  async function copySocialText(text, badgeEl, btnEl) {
    var copied = false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch (_) {}
    if (!copied) {
      try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.className = 'cso-sr-copy-ta';
        document.body.appendChild(ta);
        ta.select();
        copied = document.execCommand('copy');
        ta.remove();
      } catch (_) {}
    }
    if (copied) {
      if (badgeEl) {
        badgeEl.textContent = 'Copied!';
        badgeEl.hidden = false;
        clearTimeout(badgeEl._copyTimer);
        badgeEl._copyTimer = setTimeout(function () { badgeEl.hidden = true; }, 2200);
      }
      if (btnEl) {
        btnEl.classList.add('is-copied');
        clearTimeout(btnEl._copyBtnTimer);
        btnEl._copyBtnTimer = setTimeout(function () { btnEl.classList.remove('is-copied'); }, 2200);
      }
      toast('Copied social post to clipboard');
    } else {
      toast('Clipboard permission unavailable — select and copy from the preview box', true);
    }
  }
  function createSocialPostPanel(kind, getItemFn, opts) {
    var o = opts || {};
    var longTa = el('textarea', { class: 'cso-social-textarea cso-social-textarea-lg', rows: '10', 'aria-label': 'Telegram WhatsApp Facebook bilingual post' });
    var shortTa = el('textarea', { class: 'cso-social-textarea cso-social-textarea-sm', rows: '4', 'aria-label': 'X and Instagram short post' });
    var charBadge = el('span', { class: 'cso-social-count', text: '0 / 280 chars' });
    var longCopied = el('span', { class: 'cso-copied-badge', text: 'Copied!', hidden: true });
    var shortCopied = el('span', { class: 'cso-copied-badge', text: 'Copied!', hidden: true });
    var longBtn = el('button', { type: 'button', class: 'btn sm cso-btn-forest', text: 'Copy Telegram / WhatsApp / FB Post (EN + ଓଡ଼ିଆ)', onclick: function () {
      copySocialText(longTa.value, longCopied, longBtn);
    } });
    var shortBtn = el('button', { type: 'button', class: 'btn sm cso-btn-forest-outline', text: 'Copy Short X / Instagram Post (<280 chars)', onclick: function () {
      copySocialText(shortTa.value, shortCopied, shortBtn);
    } });

    function updateCharCount() {
      var len = shortTa.value.length;
      charBadge.textContent = len + ' / 280 chars';
      charBadge.classList.toggle('is-over', len >= 280);
    }
    shortTa.addEventListener('input', updateCharCount);

    function refresh() {
      var gen = buildBilingualSocialPosts(kind, typeof getItemFn === 'function' ? getItemFn() : {});
      longTa.value = gen.longPost;
      shortTa.value = gen.shortPost;
      updateCharCount();
    }
    refresh();

    var content = el('div', { class: 'cso-social-body' }, [
      el('div', { class: 'cso-social-grid' }, [
        el('div', { class: 'cso-social-box' }, [
          el('div', { class: 'cso-social-box-head' }, [
            el('strong', { text: 'Telegram / WhatsApp / Facebook (EN + ଓଡ଼ିଆ)' }),
            longCopied
          ]),
          longTa,
          el('div', { class: 'cso-social-actions' }, [longBtn])
        ]),
        el('div', { class: 'cso-social-box' }, [
          el('div', { class: 'cso-social-box-head' }, [
            el('strong', { text: 'X / Instagram Alert (<280 chars)' }),
            el('div', { class: 'cso-social-meta-badges' }, [charBadge, shortCopied])
          ]),
          shortTa,
          el('div', { class: 'cso-social-actions' }, [shortBtn])
        ])
      ])
    ]);

    if (o.modalMode) {
      return { node: content, refresh: refresh };
    }
    var det = el('details', { class: 'cso-social-panel' }, [
      el('summary', { class: 'cso-social-panel-summary', text: '📣 Bilingual Social Post Generator (Telegram / WhatsApp / FB & X / Instagram)' }),
      content
    ]);
    det.addEventListener('toggle', function () { if (det.open) refresh(); });
    return { node: det, refresh: refresh };
  }
  function openSocialPostModal(kind, item) {
    var prev = document.activeElement;
    var done = function () { ov.remove(); document.removeEventListener('keydown', onKey); if (prev && prev.focus) prev.focus(); };
    var onKey = function (e) { if (e.key === 'Escape') done(); };
    var panel = createSocialPostPanel(kind, function () { return item; }, { modalMode: true });
    var closeTopBtn = el('button', { type: 'button', class: 'btn sm', text: '✕', 'aria-label': 'Close modal', onclick: done });
    var closeFootBtn = el('button', { type: 'button', class: 'btn sm', text: 'Close', onclick: done });
    var ov = el('div', { class: 'overlay' }, el('div', { class: 'modal wide cso-social-modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Social Post Generator' }, [
      el('div', { class: 'cso-social-modal-head' }, [
        el('div', {}, [
          el('h2', { text: 'Bilingual Social Post Generator' }),
          el('p', { class: 'cso-social-modal-sub', text: (item && item.title) ? item.title : (kind === 'schemes' ? 'Scheme Post' : 'Job Alert Post') })
        ]),
        closeTopBtn
      ]),
      panel.node,
      el('div', { class: 'actions' }, [closeFootBtn])
    ]));
    ov.addEventListener('click', function (e) { if (e.target === ov) done(); });
    document.addEventListener('keydown', onKey);
    overlayHost().appendChild(ov);
    var firstBtn = ov.querySelector('.cso-btn-forest');
    if (firstBtn) firstBtn.focus();
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
    main.appendChild(el('div', { class: 'toolbar' }, [
      q,
      el('span', { class: 'spacer' }),
      el('a', { class: 'btn sm', href: '#/study-library-directory', text: '🗂 Study Tree (1,681 Nodes)' }),
      el('button', { class: 'btn primary', text: '+ Add ' + (kind === 'syllabus' ? 'syllabus' : 'question paper'), onclick: function () { form(null); } })
    ]));
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
    async function openJobSocial(r) {
      var item = r;
      try { item = await api('GET', 'jobs/' + encodeURIComponent(r.id)); } catch (_) {}
      openSocialPostModal('jobs', item);
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
          if (key === 'jobs' && r.status === 'published') a.push(el('button', { type: 'button', class: 'btn sm cso-social-trigger', text: 'Copy Social Post', onclick: function () { openJobSocial(r); } }));
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
        var mainScrollEl = document.querySelector('.cso-main');
        var prevMainScroll = mainScrollEl ? mainScrollEl.scrollTop : 0;
        var prevWinY = window.scrollY;
        clear(box).appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [el('caption', { class: 'muted', text: T.label }),
          el('thead', {}, el('tr', {}, [el('th', { scope: 'col' }, allCheck)].concat(T.cols.concat(['Actions']).map(function (h) { return el('th', { scope: 'col', text: h }); })))), tb])));
        box.appendChild(pager(st, d.total, load));
        if (mainScrollEl) mainScrollEl.scrollTop = prevMainScroll;
        if (window.scrollY !== prevWinY) window.scrollTo(window.scrollX, prevWinY);
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
    'current-affairs': [['title', 'Title', 'text'], ['title_or', 'Title (Odia, optional)', 'text'], ['slug', 'Slug', 'text', 'Leave blank to generate from the title'], ['event_date', 'Date', 'date'], ['category', 'Category', 'text'], ['tags', 'Tags', 'tags', 'Comma-separated, max 10'], ['goal_exam_ids', 'Target Exam Goal IDs', 'text', 'Comma-separated exam_taxonomy IDs'], ['summary', 'Summary', 'area'], ['summary_or', 'Summary (Odia)', 'area'], ['body_md', 'Body (Markdown)', 'md'], ['body_md_or', 'Body (Odia, Markdown)', 'md'], ['cover_media_key', 'Cover image', 'image']],
    jobs: [['title', 'Title', 'text'], ['title_or', 'Title (Odia, optional)', 'text'], ['slug', 'Slug', 'text', 'Leave blank to generate from the title'], ['organisation', 'Organisation', 'text', 'e.g. OPSC, OSSC, OSSSC'], ['vacancies', 'Total vacancies', 'number'], ['qualification', 'Qualification', 'area'], ['age_limit', 'Age Limit', 'text', 'e.g. 21-38 yrs (relaxation as per Odisha rules)'], ['salary_pay', 'Salary / Pay Scale', 'text', 'e.g. Level-9 / Rs. 35,400 - 1,12,400'], ['last_date', 'Last date to apply', 'date'], ['apply_url', 'Official apply URL', 'url'], ['source_url', 'Official source / circular URL', 'url'], ['category', 'Category', 'text'], ['state', 'State', 'text'], ['tags', 'Tags', 'tags'], ['goal_exam_ids', 'Target Exam Goal IDs', 'text', 'Comma-separated exam_taxonomy IDs'], ['summary', 'Summary', 'area'], ['body_md', 'Details (Markdown)', 'md'], ['body_md_or', 'Details (Odia, Markdown)', 'md'], ['cover_media_key', 'Cover image', 'image'], ['notification_media_key', 'Notification PDF', 'pdf']]
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

    function setFieldVal(fid, v) {
      var node = left.querySelector('#' + fid);
      if (node && v !== undefined && v !== null) {
        node.value = Array.isArray(v) ? v.join(', ') : String(v);
        node.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    if (key === 'jobs') {
      var parserTa = el('textarea', { rows: '3', placeholder: 'Paste raw OPSC / OSSC / OSSSC / IBPS official notification text here to auto-draft title, vacancies, deadline, age limit, pay & exam tags…', 'aria-label': 'Official Notification Text' });
      var parseStatus = el('span', { class: 'hint' });
      var parseBtn = el('button', { type: 'button', class: 'btn sm primary', text: '✨ Parse Notification Draft', onclick: function () {
        var txt = (parserTa.value || '').trim();
        if (!txt) { parseStatus.textContent = 'Paste notification text first.'; return; }
        var lines = txt.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
        if (lines[0] && !left.querySelector('#f-title').value) setFieldVal('f-title', lines[0].slice(0, 140));
        var orgMatch = txt.match(/\b(OPSC|OSSC|OSSSC|OAVS|ODISHA POLICE|SSB ODISHA|SSC|RRB|IBPS|UPSC|BSE ODISHA|CHSE)\b/i);
        if (orgMatch) setFieldVal('f-organisation', orgMatch[1].toUpperCase());
        var vacMatch = txt.match(/(\d{1,6})\s*(?:posts?|vacancies|seats?|positions?)/i) || txt.match(/vacancies\s*[:\-]\s*(\d{1,6})/i);
        if (vacMatch) setFieldVal('f-vacancies', vacMatch[1]);
        var dmyMatch = txt.match(/(?:last\s*date|closing\s*date|apply\s*(?:till|upto|by))[^\d]*(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](20\d{2})/i);
        if (dmyMatch) {
          var isoD = dmyMatch[3] + '-' + dmyMatch[2].padStart(2, '0') + '-' + dmyMatch[1].padStart(2, '0');
          setFieldVal('f-last_date', isoD);
        } else {
          var ymdMatch = txt.match(/\b(20\d{2}-\d{2}-\d{2})\b/);
          if (ymdMatch) setFieldVal('f-last_date', ymdMatch[1]);
        }
        var ageMatch = txt.match(/(?:age\s*(?:limit)?\s*[:\-]?\s*)(\d{2}\s*(?:to|\-|–)\s*\d{2}\s*(?:years|yrs)?)/i);
        if (ageMatch) setFieldVal('f-age_limit', ageMatch[1]);
        var payMatch = txt.match(/(?:pay\s*(?:level|matrix|scale)\s*[:\-]?\s*[^\n,;]{3,45}|level[\s\-]*\d{1,2}|rs\.?\s*[\d,]{4,8})/i);
        if (payMatch) setFieldVal('f-salary_pay', payMatch[0].trim());
        var qualMatch = txt.match(/(?:qualification|eligibility)\s*[:\-]\s*([^\n]{5,120})/i);
        if (qualMatch) setFieldVal('f-qualification', qualMatch[1].trim());
        setFieldVal('f-summary', lines.slice(0, 3).join(' ').slice(0, 420));
        parseStatus.textContent = '✓ Extracted fields from official circular. Review before publishing.';
        toast('Notification draft populated');
      } });
      left.appendChild(el('div', { class: 'card cso-parser-box' }, [
        el('div', { class: 'cso-repeat-head' }, [el('strong', { text: '📄 Draft from Official Notification (Text Parser)' }), parseBtn]),
        parserTa,
        parseStatus
      ]));
    }

    var tagSugHost = el('div', { class: 'actions cso-tag-suggestions' });
    left.appendChild(el('div', { class: 'card' }, [
      el('div', { class: 'cso-repeat-head' }, [
        el('strong', { text: '🏷️ Keyword-to-Exam Taxonomy Auto-Tag Suggester' }),
        el('button', { type: 'button', class: 'btn sm', text: 'Suggest Matching Tags', onclick: refreshTagSuggestions })
      ]),
      tagSugHost
    ]));

    var taxonomyCache = [];
    function refreshTagSuggestions() {
      clear(tagSugHost);
      var titleEl = left.querySelector('#f-title');
      var orgEl = left.querySelector('#f-organisation');
      var sumEl = left.querySelector('#f-summary');
      var hay = [titleEl ? titleEl.value : '', orgEl ? orgEl.value : '', sumEl ? sumEl.value : ''].join(' ').toLowerCase();
      var matches = taxonomyCache.filter(function (ex) {
        var tokens = [ex.short_code, ex.exam_label, ex.track_label, ex.id].filter(Boolean);
        return tokens.some(function (tok) { return hay.includes(String(tok).toLowerCase().split(' ')[0]); });
      }).slice(0, 8);
      if (!matches.length) {
        tagSugHost.appendChild(el('span', { class: 'hint', text: 'Type title/organisation (e.g. OPSC, OSSC, B.Ed, Police) to see matching exam_taxonomy IDs & tags.' }));
        return;
      }
      matches.forEach(function (ex) {
        tagSugHost.appendChild(el('button', {
          type: 'button',
          class: 'btn sm',
          text: '+ ' + (ex.short_code || ex.exam_label) + ' (' + ex.id + ')',
          onclick: function () {
            var goalsInp = left.querySelector('#f-goal_exam_ids');
            if (goalsInp) {
              var gArr = goalsInp.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
              if (gArr.indexOf(ex.id) === -1) gArr.push(ex.id);
              setFieldVal('f-goal_exam_ids', gArr.join(', '));
            }
            var tagsInp = left.querySelector('#f-tags');
            if (tagsInp && ex.short_code) {
              var tArr = tagsInp.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
              if (tArr.indexOf(ex.short_code) === -1 && tArr.length < 10) tArr.push(ex.short_code);
              setFieldVal('f-tags', tArr.join(', '));
            }
            toast('Added taxonomy tag ' + ex.id);
          }
        }));
      });
    }
    fetch('/api/content/exam-taxonomy', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : { items: [] }; })
      .then(function (d) { taxonomyCache = Array.isArray(d.items) ? d.items : []; refreshTagSuggestions(); })
      .catch(function () {});

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
        inp.value = (type === 'tags' || name === 'goal_exam_ids') && Array.isArray(val)
          ? val.join(', ')
          : (val === null || val === undefined ? '' : val);
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
    var alertChk = el('input', { type: 'checkbox', id: 'f-send-goal-alert' });
    left.appendChild(el('label', { class: 'check-row', for: 'f-send-goal-alert' }, [
      alertChk,
      el('span', { text: '🔔 Send Goal Alert to matching push subscribers upon Publish' })
    ]));

    var jobSocialPanel = key === 'jobs' ? createSocialPostPanel('jobs', function () {
      var snap = { id: item && item.id };
      Object.keys(getters).forEach(function (k) { snap[k] = getters[k](); });
      Object.assign(snap, sb.get());
      return snap;
    }) : null;
    if (jobSocialPanel) left.appendChild(jobSocialPanel.node);

    var livePrevTimer;
    function renderLivePreview() {
      var snap = {};
      Object.keys(getters).forEach(function (k) { snap[k] = getters[k](); });
      Object.assign(snap, sb.get());
      if (jobSocialPanel) jobSocialPanel.refresh();
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
      if (alertChk && alertChk.checked) body.send_goal_alert = true;
      try {
        showErrors(form, {});
        var r = isNew ? await api('POST', T.path, body) : await api('PUT', T.path + '/' + id, body);
        toast(r.goal_alert_queued ? ('Saved & queued Goal Alert (' + r.goal_alert_queued + ' subscribers)') : 'Saved');
        if (isNew) go('/' + key + '/' + r.id); else { clear(main); await viewPostForm(key, id); return; }
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
  /* ---------- admin security: single-use backup recovery codes ---------- */
  function securityBackupPanel() {
    var status = el('p', { class: 'muted cso-sec-status', text: 'Loading…' });
    var list = el('pre', { class: 'cso-sec-codes', hidden: true });
    var copiedBadge = el('span', { class: 'cso-copied-badge', text: 'Copied!', hidden: true });
    var latest = [];
    var copyBtn = el('button', { type: 'button', class: 'btn sm cso-btn-forest', text: 'Copy All Backup Codes', hidden: true, onclick: function () { copySocialText(latest.join('\n'), copiedBadge, copyBtn); } });
    var genBtn = el('button', { type: 'button', class: 'btn primary', text: 'Generate 8 Backup Codes', onclick: async function () {
      if (!(await confirmModal('Generate new backup codes?', 'This replaces ALL existing backup codes. Store the new codes somewhere safe — they are shown only once.', 'Generate', false))) return;
      genBtn.disabled = true;
      try {
        var d = await api('POST', 'auth/backup-codes', {});
        latest = d.codes || [];
        list.textContent = latest.join('\n'); list.hidden = false; copyBtn.hidden = false;
        status.textContent = d.remaining + ' of ' + d.total + ' backup codes unused. Save them now — they will not be shown again.';
        toast('8 backup codes generated');
      } catch (e) { toast(e.message, true); }
      genBtn.disabled = false;
    } });
    api('GET', 'auth/backup-codes').then(function (d) {
      var ch = d.channels || {};
      var on = [ch.totp ? 'Authenticator app' : null, ch.telegram ? 'Telegram OTP' : null, ch.email ? 'Email OTP' : null].filter(Boolean);
      status.textContent = d.remaining + ' of ' + d.total + ' backup codes unused. 2FA is ' + (d.enforced ? 'ENFORCED (' + on.join(', ') + ').' : 'not enforced yet — set ADMIN_TOTP_SECRET, ADMIN_TG_BOT_TOKEN + ADMIN_TG_CHAT_ID, or ADMIN_2FA_EMAIL to enable it.');
    }).catch(function (e) { status.textContent = e.message; });
    return el('div', { class: 'panel cso-sec-panel' }, [
      el('h2', { text: 'Two-factor recovery codes' }),
      el('p', { class: 'hint', text: 'Each code works once at sign-in in place of an authenticator/OTP code. Generating a new set invalidates the old one.' }),
      status, list,
      el('div', { class: 'actions' }, [genBtn, copyBtn, copiedBadge])
    ]);
  }
  /* ---------- Folder 16: Module #1 RBAC Hierarchy & Role Entitlements ---------- */
  function securityRbacHierarchyPanel() {
    var isAdmin = me && me.role === 'admin';
    var wrap = el('div', { class: 'panel cso-sec-studio' }, [
      el('h2', { text: 'RBAC Hierarchy & Role Entitlements' }),
      el('p', { class: 'muted', text: 'Govern Super Admin, Senior Editor, and Reviewer capability boundaries with lockout protection and live permission simulation.' })
    ]);

    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis', 'aria-live': 'polite' });
    var saveBtn = el('button', { type: 'button', class: 'btn primary', disabled: !isAdmin, text: 'Save Role Entitlements' });
    var reloadBtn = el('button', { type: 'button', class: 'btn sm', text: 'Refresh Matrix' });
    var statusEl = el('div', { class: 'cso-ops-vault-summary', 'aria-live': 'polite' });
    var matrixHost = el('div', { class: 'cso-ops-vault-table-host' });

    // Effective Permission Simulator
    var simRoleSel = el('select', { id: 'f-sec-sim-role', class: 'cso-ops-policy-select', 'aria-label': 'Role to simulate' }, [
      el('option', { value: 'admin', text: 'Super Admin (admin)' }),
      el('option', { value: 'editor', text: 'Senior Editor (editor)', selected: true }),
      el('option', { value: 'reviewer', text: 'Reviewer (reviewer)' }),
      el('option', { value: 'candidate', text: 'Candidate (candidate)' })
    ]);
    var simActionSel = el('select', { id: 'f-sec-sim-action', class: 'cso-ops-policy-select', 'aria-label': 'Capability action to simulate' }, [
      el('option', { value: 'publish', text: 'publish — Publish & Schedule' }),
      el('option', { value: 'delete', text: 'delete — Soft / Hard Delete' }),
      el('option', { value: 'restore', text: 'restore — DR Rollback & Snapshots' }),
      el('option', { value: 'export_pii', text: 'export_pii — Export Candidate PII' }),
      el('option', { value: 'manage_users', text: 'manage_users — Manage Staff Accounts' }),
      el('option', { value: 'manage_security', text: 'manage_security — Modify RBAC Policies' })
    ]);
    var simBtn = el('button', { type: 'button', class: 'btn primary sm', text: 'Simulate Permission' });
    var simOut = el('div', { 'aria-live': 'polite' });

    var simBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'Effective Permission Previewer (Non-Destructive)' }),
        simBtn
      ]),
      el('div', { class: 'cso-ops-restore-controls' }, [
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-sec-sim-role', class: 'muted sm', text: 'Target Role' }), simRoleSel]),
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-sec-sim-action', class: 'muted sm', text: 'Target Action' }), simActionSel])
      ]),
      simOut
    ]);

    var auditHost = el('div', { class: 'cso-ops-subbox' });

    wrap.appendChild(kpiStrip);
    wrap.appendChild(el('div', { class: 'cso-ops-subhead' }, [
      el('strong', { text: 'Role Entitlement Matrix' }),
      el('div', { class: 'actions' }, [reloadBtn, saveBtn])
    ]));
    wrap.appendChild(statusEl);
    wrap.appendChild(matrixHost);
    wrap.appendChild(simBox);
    wrap.appendChild(auditHost);

    var draftMatrix = null;
    var stateData = null;
    var saveBusy = false;
    var simBusy = false;

    function renderKpis(d) {
      clear(kpiStrip);
      var uc = d.user_counts || {};
      var cards = [
        ['Active Staff Roles', '3', 'Admin (' + (uc.admin || 0) + ') · Editor (' + (uc.editor || 0) + ') · Reviewer (' + (uc.reviewer || 0) + ')'],
        ['Total Staff Accounts', String(d.total_staff || 0), 'Live users table count'],
        ['Custom Policy Overrides', String(d.custom_overrides || 0), d.custom_overrides ? 'Modified from baseline' : 'Baseline defaults active'],
        ['Last Matrix Update', d.updated_at ? String(d.updated_at).slice(0, 16).replace('T', ' ') : 'Default', d.updated_by || 'System baseline']
      ];
      cards.forEach(function (c) {
        kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('span', { class: 'muted sm', text: c[0] }),
          el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: c[1] }),
          el('span', { class: 'muted sm', text: c[2] })
        ]));
      });
    }

    function renderMatrixTable(d) {
      clear(matrixHost);
      var roles = ['admin', 'editor', 'reviewer'];
      var locked = d.locked || {};
      var tbl = el('table', { class: 'tbl cso-sec-matrix-table' }, [
        el('thead', {}, [el('tr', {}, [
          el('th', { text: 'Capability' }),
          el('th', { text: 'Super Admin' }),
          el('th', { text: 'Senior Editor' }),
          el('th', { text: 'Reviewer' })
        ])])
      ]);
      var tbody = el('tbody');
      (d.capabilities || []).forEach(function (cap) {
        var rowCells = [
          el('td', {}, [
            el('strong', { text: cap.label }),
            el('span', { class: 'cso-sec-cap-desc', text: cap.description })
          ])
        ];
        roles.forEach(function (rKey) {
          var isLocked = Boolean(locked[rKey] && Object.prototype.hasOwnProperty.call(locked[rKey], cap.key));
          var checked = Boolean(draftMatrix[rKey] && draftMatrix[rKey][cap.key]);
          var cb = el('input', {
            type: 'checkbox',
            checked: checked,
            disabled: !isAdmin || isLocked,
            'aria-label': (d.role_labels[rKey] || rKey) + ' ' + cap.key
          });
          cb.addEventListener('change', function () {
            if (!draftMatrix[rKey]) draftMatrix[rKey] = {};
            draftMatrix[rKey][cap.key] = cb.checked;
          });
          var labelNodes = [cb, el('span', { text: checked ? 'Allow' : 'Deny' })];
          if (isLocked) labelNodes.push(el('span', { class: 'cso-sec-lock-tag', text: 'Locked' }));
          cb.addEventListener('change', function () {
            labelNodes[1].textContent = cb.checked ? 'Allow' : 'Deny';
          });
          rowCells.push(el('td', {}, [el('label', { class: 'cso-sec-cell-check' }, labelNodes)]));
        });
        tbody.appendChild(el('tr', {}, rowCells));
      });
      tbl.appendChild(tbody);
      matrixHost.appendChild(tbl);
    }

    function renderRecentAudit(d) {
      clear(auditHost);
      auditHost.appendChild(el('strong', { text: 'Recent RBAC & Role Changes' }));
      var rows = d.recent_changes || [];
      if (!rows.length) {
        auditHost.appendChild(el('p', { class: 'muted sm', text: 'No RBAC matrix changes recorded yet.' }));
        return;
      }
      var tbl = el('table', { class: 'tbl' }, [
        el('thead', {}, [el('tr', {}, [
          el('th', { text: 'Timestamp' }),
          el('th', { text: 'Action' }),
          el('th', { text: 'Actor' }),
          el('th', { text: 'Overrides' })
        ])])
      ]);
      var tbody = el('tbody');
      rows.slice(0, 8).forEach(function (r) {
        tbody.appendChild(el('tr', {}, [
          el('td', { class: 'cso-tabular sm', text: String(r.created_at || '').slice(0, 19).replace('T', ' ') }),
          el('td', { class: 'cso-ops-mono sm', text: r.action }),
          el('td', { class: 'sm', text: r.actor_user_id || 'admin' }),
          el('td', { class: 'cso-tabular sm', text: r.metadata && r.metadata.custom_overrides !== undefined ? String(r.metadata.custom_overrides) : '—' })
        ]));
      });
      tbl.appendChild(tbody);
      auditHost.appendChild(tbl);
    }

    async function load() {
      clear(statusEl);
      statusEl.appendChild(el('p', { class: 'muted sm', text: 'Loading RBAC entitlement matrix…' }));
      try {
        var d = await api('GET', 'security/rbac');
        stateData = d;
        draftMatrix = JSON.parse(JSON.stringify(d.matrix || {}));
        clear(statusEl);
        renderKpis(d);
        renderMatrixTable(d);
        renderRecentAudit(d);
      } catch (e) {
        clear(statusEl);
        statusEl.appendChild(el('div', { class: 'alert', text: e.message || 'Failed to load RBAC matrix' }));
      }
    }

    saveBtn.addEventListener('click', async function () {
      if (!isAdmin || saveBusy || !draftMatrix) return;
      saveBusy = true;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      try {
        var res = await api('PUT', 'security/rbac', { matrix: draftMatrix });
        stateData = res;
        draftMatrix = JSON.parse(JSON.stringify(res.matrix || {}));
        renderKpis(res);
        renderMatrixTable(res);
        renderRecentAudit(res);
        toast('RBAC role entitlements saved');
      } catch (e) {
        toast(e.message || 'Failed to save RBAC matrix', true);
      } finally {
        saveBusy = false;
        saveBtn.disabled = !isAdmin;
        saveBtn.textContent = 'Save Role Entitlements';
      }
    });

    simBtn.addEventListener('click', async function () {
      if (simBusy) return;
      simBusy = true;
      simBtn.disabled = true;
      clear(simOut);
      try {
        var res = await api('POST', 'security/rbac/simulate', {
          role: simRoleSel.value,
          action: simActionSel.value
        });
        simOut.appendChild(el('div', {
          class: 'cso-sec-sim-result ' + (res.allowed ? 'is-allow' : 'is-deny')
        }, [
          el('div', { class: 'cso-ops-subhead' }, [
            el('strong', { text: (res.role_label || res.role) + ' → ' + (res.action_label || res.action) }),
            el('span', { class: 'badge ' + (res.allowed ? 'ok' : 'bad'), text: res.decision })
          ]),
          el('span', { class: 'muted sm', text: res.rationale })
        ]));
      } catch (e) {
        simOut.appendChild(el('div', { class: 'alert', text: e.message || 'Simulation failed' }));
      } finally {
        simBusy = false;
        simBtn.disabled = false;
      }
    });

    reloadBtn.addEventListener('click', load);
    load();
    return wrap;
  }

  /* ---------- Folder 16: Module #2 Publish & Mutation Guard (6 Engines) ---------- */
  function securityEngineGuardsPanel() {
    var isAdmin = me && me.role === 'admin';
    var wrap = el('div', { class: 'panel cso-sec-studio' }, [
      el('h2', { text: 'Publish & Mutation Permissions Guard (6 Engines)' }),
      el('p', { class: 'muted', text: 'Configure reviewer sign-off gates, hard-delete protections, and pre-publish SEO checks across all 6 CS Odisha content engines.' })
    ]);

    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis', 'aria-live': 'polite' });
    var saveBtn = el('button', { type: 'button', class: 'btn primary', disabled: !isAdmin, text: 'Save Engine Guardrails' });
    var reloadBtn = el('button', { type: 'button', class: 'btn sm', text: 'Refresh' });
    var statusEl = el('div', { 'aria-live': 'polite' });
    var gridHost = el('div', { class: 'cso-sec-engine-grid' });

    // Dry-run Mutation Gate Tester
    var testRoleSel = el('select', { id: 'f-sec-gate-role', class: 'cso-ops-policy-select', 'aria-label': 'Actor role' }, [
      el('option', { value: 'editor', text: 'Senior Editor (editor)' }),
      el('option', { value: 'reviewer', text: 'Reviewer (reviewer)' }),
      el('option', { value: 'admin', text: 'Super Admin (admin)' }),
      el('option', { value: 'candidate', text: 'Candidate (candidate)' })
    ]);
    var testEngSel = el('select', { id: 'f-sec-gate-eng', class: 'cso-ops-policy-select', 'aria-label': 'Content engine' });
    var testMutSel = el('select', { id: 'f-sec-gate-mut', class: 'cso-ops-policy-select', 'aria-label': 'Mutation type' }, [
      el('option', { value: 'publish', text: 'publish' }),
      el('option', { value: 'delete', text: 'delete (Hard Delete)' }),
      el('option', { value: 'create', text: 'create (Draft)' })
    ]);
    var testSignoffCb = el('input', { type: 'checkbox', id: 'f-sec-gate-signoff' });
    var testSeoCb = el('input', { type: 'checkbox', id: 'f-sec-gate-seo', checked: true });
    var testBtn = el('button', { type: 'button', class: 'btn primary sm', text: 'Run Dry-Run Gate Check' });
    var testOut = el('div', { 'aria-live': 'polite' });

    var testerBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'Dry-Run Mutation Gate Tester' }),
        testBtn
      ]),
      el('div', { class: 'cso-ops-restore-controls' }, [
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-sec-gate-role', class: 'muted sm', text: 'Actor Role' }), testRoleSel]),
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-sec-gate-eng', class: 'muted sm', text: 'Content Engine' }), testEngSel]),
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-sec-gate-mut', class: 'muted sm', text: 'Mutation' }), testMutSel])
      ]),
      el('div', { class: 'cso-ops-label-row' }, [
        el('label', { class: 'cso-ops-inline-check' }, [testSignoffCb, el('span', { text: 'Has Reviewer Sign-off' })]),
        el('label', { class: 'cso-ops-inline-check' }, [testSeoCb, el('span', { text: 'Has Complete SEO Meta' })])
      ]),
      testOut
    ]);

    wrap.appendChild(kpiStrip);
    wrap.appendChild(el('div', { class: 'cso-ops-subhead' }, [
      el('strong', { text: '6-Engine Mutation Guardrails' }),
      el('div', { class: 'actions' }, [reloadBtn, saveBtn])
    ]));
    wrap.appendChild(statusEl);
    wrap.appendChild(gridHost);
    wrap.appendChild(testerBox);

    var draftGuards = null;
    var saveBusy = false;
    var testBusy = false;

    function renderKpis(d) {
      clear(kpiStrip);
      var st = d.stats || {};
      var cards = [
        ['Protected Engines', (st.protected_engines || 6) + ' / ' + (st.total_engines || 6), 'Full CMS coverage'],
        ['Active Approval Gates', String(st.active_approval_gates || 0), 'Reviewer sign-off enforced'],
        ['Hard-Delete Protections', String(st.hard_delete_protections || 0), 'Non-admin delete blocked'],
        ['Last Policy Audit', d.updated_at ? String(d.updated_at).slice(0, 16).replace('T', ' ') : 'Default', d.updated_by || 'System baseline']
      ];
      cards.forEach(function (c) {
        kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('span', { class: 'muted sm', text: c[0] }),
          el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: c[1] }),
          el('span', { class: 'muted sm', text: c[2] })
        ]));
      });
    }

    function renderEngineCards(d) {
      clear(gridHost);
      clear(testEngSel);
      (d.engines || []).forEach(function (eng) {
        testEngSel.appendChild(el('option', { value: eng.key, text: eng.label }));
        var g = draftGuards[eng.key] || {};
        var toggleDefs = [
          ['require_reviewer_signoff', 'Require Reviewer Sign-off before Publish'],
          ['block_editor_hard_delete', 'Block Non-Admin Hard Delete'],
          ['require_seo_meta_before_publish', 'Require SEO Meta before Publish']
        ];
        var list = el('div', { class: 'cso-sec-toggle-list' });
        toggleDefs.forEach(function (td) {
          var cb = el('input', { type: 'checkbox', checked: Boolean(g[td[0]]), disabled: !isAdmin });
          cb.addEventListener('change', function () {
            if (!draftGuards[eng.key]) draftGuards[eng.key] = {};
            draftGuards[eng.key][td[0]] = cb.checked;
          });
          list.appendChild(el('label', { class: 'cso-sec-toggle-item' }, [cb, el('span', { text: td[1] })]));
        });

        gridHost.appendChild(el('div', { class: 'cso-sec-engine-card' }, [
          el('div', { class: 'cso-sec-engine-head' }, [
            el('strong', { text: eng.label }),
            el('span', { class: 'badge ok', text: 'Guarded' })
          ]),
          el('span', { class: 'muted sm', text: eng.description }),
          list
        ]));
      });
    }

    async function load() {
      clear(statusEl);
      statusEl.appendChild(el('p', { class: 'muted sm', text: 'Loading 6-engine guardrails…' }));
      try {
        var d = await api('GET', 'security/engine-guards');
        draftGuards = JSON.parse(JSON.stringify(d.guards || {}));
        clear(statusEl);
        renderKpis(d);
        renderEngineCards(d);
      } catch (e) {
        clear(statusEl);
        statusEl.appendChild(el('div', { class: 'alert', text: e.message || 'Failed to load engine guards' }));
      }
    }

    saveBtn.addEventListener('click', async function () {
      if (!isAdmin || saveBusy || !draftGuards) return;
      saveBusy = true;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      try {
        var res = await api('PUT', 'security/engine-guards', { guards: draftGuards });
        draftGuards = JSON.parse(JSON.stringify(res.guards || {}));
        renderKpis(res);
        renderEngineCards(res);
        toast('6-engine mutation guardrails saved');
      } catch (e) {
        toast(e.message || 'Failed to save engine guardrails', true);
      } finally {
        saveBusy = false;
        saveBtn.disabled = !isAdmin;
        saveBtn.textContent = 'Save Engine Guardrails';
      }
    });

    testBtn.addEventListener('click', async function () {
      if (testBusy) return;
      testBusy = true;
      testBtn.disabled = true;
      clear(testOut);
      try {
        var res = await api('POST', 'security/engine-guards/test', {
          role: testRoleSel.value,
          engine: testEngSel.value,
          mutation: testMutSel.value,
          has_reviewer_signoff: testSignoffCb.checked,
          has_seo_meta: testSeoCb.checked
        });
        testOut.appendChild(el('div', {
          class: 'cso-sec-sim-result ' + (res.allowed ? 'is-allow' : 'is-deny')
        }, [
          el('div', { class: 'cso-ops-subhead' }, [
            el('strong', { text: res.engine_label + ' · ' + res.mutation.toUpperCase() + ' (' + res.role_label + ')' }),
            el('span', { class: 'badge ' + (res.allowed ? 'ok' : 'bad'), text: res.decision })
          ]),
          el('span', { class: 'muted sm', text: res.rationale })
        ]));
      } catch (e) {
        testOut.appendChild(el('div', { class: 'alert', text: e.message || 'Gate check failed' }));
      } finally {
        testBusy = false;
        testBtn.disabled = false;
      }
    });

    reloadBtn.addEventListener('click', load);
    load();
    return wrap;
  }

  /* ---------- Folder 16: Module #3 Session Lifecycle & Token Expiry ---------- */
  function securitySessionLifecyclePanel() {
    var isAdmin = me && me.role === 'admin';
    var wrap = el('div', { class: 'panel cso-sec-studio' }, [
      el('h2', { text: 'Session Lifecycle, Inactivity Timeouts & Token Expiry' }),
      el('p', { class: 'muted', text: 'Manage idle timeout windows, absolute session TTLs, concurrency caps, and masked active session revocation.' })
    ]);

    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis', 'aria-live': 'polite' });
    var idleInp = el('input', { type: 'number', id: 'f-sec-idle-min', min: '15', max: '480', value: '60', disabled: !isAdmin });
    var ttlInp = el('input', { type: 'number', id: 'f-sec-ttl-hrs', min: '1', max: '168', value: '24', disabled: !isAdmin });
    var maxInp = el('input', { type: 'number', id: 'f-sec-max-sess', min: '1', max: '10', value: '3', disabled: !isAdmin });
    var uaCb = el('input', { type: 'checkbox', id: 'f-sec-bind-ua', checked: true, disabled: !isAdmin });
    var savePolicyBtn = el('button', { type: 'button', class: 'btn primary', disabled: !isAdmin, text: 'Save Session Policy' });

    var policyBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'Session Timeout & Concurrency Policy' }),
        savePolicyBtn
      ]),
      el('div', { class: 'cso-sec-policy-grid' }, [
        el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-idle-min', class: 'muted sm', text: 'Idle Timeout (15–480 min)' }), idleInp]),
        el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-ttl-hrs', class: 'muted sm', text: 'Absolute Token TTL (1–168 hrs)' }), ttlInp]),
        el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-max-sess', class: 'muted sm', text: 'Max Concurrent Sessions (1–10)' }), maxInp])
      ]),
      el('label', { class: 'cso-ops-inline-check' }, [uaCb, el('span', { text: 'Bind session fingerprint to User-Agent header' })])
    ]);

    var revokeConfirmInp = el('input', {
      type: 'text',
      id: 'f-sec-revoke-confirm',
      class: 'cso-ops-confirm-input',
      placeholder: 'Type REVOKE_OTHERS',
      disabled: !isAdmin,
      'aria-label': 'Confirmation phrase to revoke all other sessions'
    });
    var revokeAllBtn = el('button', { type: 'button', class: 'btn danger sm', disabled: !isAdmin, text: 'Revoke All Other Sessions' });
    var dangerBar = el('div', { class: 'cso-sec-danger-bar' }, [
      el('div', {}, [
        el('strong', { text: 'Emergency Session Invalidation' }),
        el('span', { class: 'cso-sec-cap-desc', text: 'Immediately invalidates every active session except your current session.' })
      ]),
      el('div', { class: 'actions' }, [revokeConfirmInp, revokeAllBtn])
    ]);

    var statusEl = el('div', { 'aria-live': 'polite' });
    var tableHost = el('div', { class: 'cso-ops-vault-table-host' });
    var refreshBtn = el('button', { type: 'button', class: 'btn sm', text: 'Refresh Sessions' });

    wrap.appendChild(kpiStrip);
    wrap.appendChild(policyBox);
    wrap.appendChild(dangerBar);
    wrap.appendChild(el('div', { class: 'cso-ops-subhead' }, [
      el('strong', { text: 'Active Masked Session Inventory (Raw Tokens Never Exposed)' }),
      refreshBtn
    ]));
    wrap.appendChild(statusEl);
    wrap.appendChild(tableHost);

    var saveBusy = false;
    var revokeBusy = false;

    function renderKpis(d) {
      clear(kpiStrip);
      var p = d.policy || {};
      var cards = [
        ['Active Sessions', String(d.active_count || 0), (d.admin_active_count || 0) + ' staff · ' + (d.expired_count || 0) + ' expired'],
        ['Idle Timeout Window', (p.idle_timeout_minutes || 60) + ' min', 'Inactivity revocation threshold'],
        ['Absolute Token TTL', (p.absolute_ttl_hours || 24) + ' hrs', 'Hard session expiry cap'],
        ['Max Concurrent Cap', String(p.max_concurrent_sessions || 3), p.bind_user_agent ? 'User-Agent bound' : 'Flexible device']
      ];
      cards.forEach(function (c) {
        kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('span', { class: 'muted sm', text: c[0] }),
          el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: c[1] }),
          el('span', { class: 'muted sm', text: c[2] })
        ]));
      });
    }

    function renderSessionsTable(d) {
      clear(tableHost);
      var list = d.sessions || [];
      if (!list.length) {
        tableHost.appendChild(el('p', { class: 'muted sm', text: 'No active sessions found in D1.' }));
        return;
      }
      var tbl = el('table', { class: 'tbl' }, [
        el('thead', {}, [el('tr', {}, [
          el('th', { text: 'Masked Token' }),
          el('th', { text: 'User & Role' }),
          el('th', { text: 'Client' }),
          el('th', { text: 'Expires (UTC)' }),
          el('th', { text: 'Action' })
        ])])
      ]);
      var tbody = el('tbody');
      list.forEach(function (s) {
        var revBtn = el('button', {
          type: 'button',
          class: 'btn sm danger',
          disabled: !isAdmin || s.is_current,
          text: s.is_current ? 'Current' : 'Revoke'
        });
        revBtn.addEventListener('click', async function () {
          if (!isAdmin || s.is_current || revokeBusy) return;
          revokeBusy = true;
          revBtn.disabled = true;
          try {
            await api('POST', 'security/sessions/revoke', { session_id: s.session_id });
            toast('Session ' + s.masked_token + ' revoked');
            await load();
          } catch (e) {
            toast(e.message || 'Revocation failed', true);
            revBtn.disabled = false;
          } finally {
            revokeBusy = false;
          }
        });
        tbody.appendChild(el('tr', {}, [
          el('td', { class: 'cso-ops-mono sm', text: s.masked_token }),
          el('td', {}, [
            el('div', { text: s.email || s.user_id }),
            el('span', { class: 'badge ' + (s.role === 'admin' ? 'ok' : ''), text: s.role })
          ]),
          el('td', { class: 'sm', text: s.user_agent_summary || 'Browser' }),
          el('td', { class: 'cso-tabular sm', text: s.expires_at_iso ? s.expires_at_iso.slice(0, 16).replace('T', ' ') : '—' }),
          el('td', {}, [revBtn])
        ]));
      });
      tbl.appendChild(tbody);
      tableHost.appendChild(tbl);
    }

    async function load() {
      clear(statusEl);
      if (!isAdmin) {
        statusEl.appendChild(el('div', { class: 'alert', text: 'Active session inventory is restricted to Super Administrators.' }));
        return;
      }
      statusEl.appendChild(el('p', { class: 'muted sm', text: 'Loading active sessions…' }));
      try {
        var d = await api('GET', 'security/sessions');
        clear(statusEl);
        var p = d.policy || {};
        idleInp.value = String(p.idle_timeout_minutes || 60);
        ttlInp.value = String(p.absolute_ttl_hours || 24);
        maxInp.value = String(p.max_concurrent_sessions || 3);
        uaCb.checked = Boolean(p.bind_user_agent);
        renderKpis(d);
        renderSessionsTable(d);
      } catch (e) {
        clear(statusEl);
        statusEl.appendChild(el('div', { class: 'alert', text: e.message || 'Failed to load sessions' }));
      }
    }

    savePolicyBtn.addEventListener('click', async function () {
      if (!isAdmin || saveBusy) return;
      saveBusy = true;
      savePolicyBtn.disabled = true;
      savePolicyBtn.textContent = 'Saving…';
      try {
        await api('PUT', 'security/sessions/policy', {
          idle_timeout_minutes: parseInt(idleInp.value, 10),
          absolute_ttl_hours: parseInt(ttlInp.value, 10),
          max_concurrent_sessions: parseInt(maxInp.value, 10),
          bind_user_agent: uaCb.checked
        });
        toast('Session lifecycle policy updated');
        await load();
      } catch (e) {
        toast(e.message || 'Failed to save session policy', true);
      } finally {
        saveBusy = false;
        savePolicyBtn.disabled = !isAdmin;
        savePolicyBtn.textContent = 'Save Session Policy';
      }
    });

    revokeAllBtn.addEventListener('click', async function () {
      if (!isAdmin || revokeBusy) return;
      revokeBusy = true;
      revokeAllBtn.disabled = true;
      try {
        var res = await api('POST', 'security/sessions/revoke', {
          except_current: true,
          confirm: revokeConfirmInp.value.trim()
        });
        revokeConfirmInp.value = '';
        toast('Revoked ' + (res.revoked_count || 0) + ' other session(s)');
        await load();
      } catch (e) {
        toast(e.message || 'Bulk revocation failed', true);
      } finally {
        revokeBusy = false;
        revokeAllBtn.disabled = !isAdmin;
      }
    });

    refreshBtn.addEventListener('click', load);
    load();
    return wrap;
  }

  /* ---------- Folder 16: Module #4 Cloudflare Turnstile & Edge Bot Deterrence ---------- */
  function securityTurnstileBotPanel() {
    var isAdmin = me && me.role === 'admin';
    var wrap = el('div', { class: 'panel cso-sec-studio' }, [
      el('h2', { text: 'Cloudflare Turnstile & Edge Bot Deterrence Rules' }),
      el('p', { class: 'muted', text: 'Configure Turnstile challenge posture, brute-force rate-limit thresholds, and simulate edge bot requests.' })
    ]);

    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis', 'aria-live': 'polite' });
    var modeSel = el('select', { id: 'f-sec-ts-mode', class: 'cso-ops-policy-select', disabled: !isAdmin }, [
      el('option', { value: 'managed', text: 'Managed (Adaptive Challenge)' }),
      el('option', { value: 'non_interactive', text: 'Non-Interactive' }),
      el('option', { value: 'invisible', text: 'Invisible' }),
      el('option', { value: 'off', text: 'Off (Monitor Rate Limits Only)' })
    ]);
    var rlMaxInp = el('input', { type: 'number', id: 'f-sec-ts-rlmax', min: '3', max: '30', value: '10', disabled: !isAdmin });
    var rlWinInp = el('input', { type: 'number', id: 'f-sec-ts-rlwin', min: '5', max: '60', value: '15', disabled: !isAdmin });
    var loginCb = el('input', { type: 'checkbox', id: 'f-sec-ts-login', checked: true, disabled: !isAdmin });
    var formCb = el('input', { type: 'checkbox', id: 'f-sec-ts-forms', checked: true, disabled: !isAdmin });
    var searchCb = el('input', { type: 'checkbox', id: 'f-sec-ts-search', disabled: !isAdmin });
    var uaCb = el('input', { type: 'checkbox', id: 'f-sec-ts-ua', checked: true, disabled: !isAdmin });
    var saveBtn = el('button', { type: 'button', class: 'btn primary', disabled: !isAdmin, text: 'Save Bot Deterrence Rules' });

    var policyBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'Turnstile & Brute-Force Guardrails' }),
        saveBtn
      ]),
      el('div', { class: 'cso-sec-policy-grid' }, [
        el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-ts-mode', class: 'muted sm', text: 'Challenge Mode' }), modeSel]),
        el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-ts-rlmax', class: 'muted sm', text: 'Login Rate-Limit Max (3–30)' }), rlMaxInp]),
        el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-ts-rlwin', class: 'muted sm', text: 'Window (5–60 min)' }), rlWinInp])
      ]),
      el('div', { class: 'cso-sec-toggle-list' }, [
        el('label', { class: 'cso-sec-toggle-item' }, [loginCb, el('span', { text: 'Protect Login & Auth Endpoints (/api/auth/*)' })]),
        el('label', { class: 'cso-sec-toggle-item' }, [formCb, el('span', { text: 'Protect Public Feedback & Contact Forms' })]),
        el('label', { class: 'cso-sec-toggle-item' }, [searchCb, el('span', { text: 'Protect Public Search & Directory APIs' })]),
        el('label', { class: 'cso-sec-toggle-item' }, [uaCb, el('span', { text: 'Challenge Empty User-Agent Automated Requests' })])
      ])
    ]);

    // Edge Request Challenge Simulator
    var simPathInp = el('input', { type: 'text', id: 'f-sec-bot-path', value: '/api/auth/login', class: 'cso-ops-filter-input' });
    var simUaInp = el('input', { type: 'text', id: 'f-sec-bot-ua', value: 'Mozilla/5.0', class: 'cso-ops-filter-input' });
    var simAttInp = el('input', { type: 'number', id: 'f-sec-bot-att', min: '0', max: '100', value: '1' });
    var simTokCb = el('input', { type: 'checkbox', id: 'f-sec-bot-tok' });
    var simBtn = el('button', { type: 'button', class: 'btn primary sm', text: 'Simulate Edge Request' });
    var simOut = el('div', { 'aria-live': 'polite' });

    var simBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'Edge Request Challenge Simulator' }),
        simBtn
      ]),
      el('div', { class: 'cso-sec-policy-grid' }, [
        el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-bot-path', class: 'muted sm', text: 'Request Path' }), simPathInp]),
        el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-bot-ua', class: 'muted sm', text: 'User-Agent Header' }), simUaInp]),
        el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-bot-att', class: 'muted sm', text: 'Attempts in Window' }), simAttInp])
      ]),
      el('label', { class: 'cso-ops-inline-check' }, [simTokCb, el('span', { text: 'Request includes verified Turnstile token' })]),
      simOut
    ]);

    var statusEl = el('div', { 'aria-live': 'polite' });
    wrap.appendChild(kpiStrip);
    wrap.appendChild(statusEl);
    wrap.appendChild(policyBox);
    wrap.appendChild(simBox);

    var saveBusy = false;
    var simBusy = false;

    function renderKpis(d) {
      clear(kpiStrip);
      var cfg = d.config || {};
      var eb = d.env_bindings || {};
      var cards = [
        ['Turnstile Binding Status', (eb.turnstile_site_key_configured && eb.turnstile_secret_key_configured) ? 'ACTIVE' : 'ENV UNSET', eb.turnstile_site_key_configured ? 'Site + Secret keys bound' : 'Set TURNSTILE_* bindings in CF Pages'],
        ['Active Challenge Mode', String(cfg.turnstile_mode || 'managed').toUpperCase(), cfg.block_empty_user_agent ? 'Empty UA challenged' : 'Empty UA allowed'],
        ['Login Rate-Limit', (cfg.login_rate_limit_max || 10) + ' / ' + (cfg.login_window_minutes || 15) + 'm', 'Max attempts per window'],
        ['Blocked Rate Buckets', String(d.rate_limit_blocks || 0), 'D1 admin_rate_limits hits']
      ];
      cards.forEach(function (c) {
        kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('span', { class: 'muted sm', text: c[0] }),
          el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: c[1] }),
          el('span', { class: 'muted sm', text: c[2] })
        ]));
      });
    }

    async function load() {
      clear(statusEl);
      try {
        var d = await api('GET', 'security/bot-deterrence');
        var cfg = d.config || {};
        modeSel.value = cfg.turnstile_mode || 'managed';
        rlMaxInp.value = String(cfg.login_rate_limit_max || 10);
        rlWinInp.value = String(cfg.login_window_minutes || 15);
        loginCb.checked = Boolean(cfg.protect_login);
        formCb.checked = Boolean(cfg.protect_contact_forms);
        searchCb.checked = Boolean(cfg.protect_public_search_api);
        uaCb.checked = Boolean(cfg.block_empty_user_agent);
        renderKpis(d);
      } catch (e) {
        statusEl.appendChild(el('div', { class: 'alert', text: e.message || 'Failed to load Turnstile policy' }));
      }
    }

    saveBtn.addEventListener('click', async function () {
      if (!isAdmin || saveBusy) return;
      saveBusy = true;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      try {
        var res = await api('PUT', 'security/bot-deterrence', {
          turnstile_mode: modeSel.value,
          login_rate_limit_max: parseInt(rlMaxInp.value, 10),
          login_window_minutes: parseInt(rlWinInp.value, 10),
          protect_login: loginCb.checked,
          protect_contact_forms: formCb.checked,
          protect_public_search_api: searchCb.checked,
          block_empty_user_agent: uaCb.checked
        });
        renderKpis(res);
        toast('Turnstile & bot deterrence rules saved');
      } catch (e) {
        toast(e.message || 'Failed to save bot deterrence rules', true);
      } finally {
        saveBusy = false;
        saveBtn.disabled = !isAdmin;
        saveBtn.textContent = 'Save Bot Deterrence Rules';
      }
    });

    simBtn.addEventListener('click', async function () {
      if (simBusy) return;
      simBusy = true;
      simBtn.disabled = true;
      clear(simOut);
      try {
        var res = await api('POST', 'security/bot-deterrence/simulate', {
          path: simPathInp.value.trim(),
          user_agent: simUaInp.value.trim(),
          attempts_in_window: parseInt(simAttInp.value, 10) || 0,
          has_turnstile_token: simTokCb.checked
        });
        var isPass = res.verdict === 'PASS';
        simOut.appendChild(el('div', { class: 'cso-sec-sim-result ' + (isPass ? 'is-allow' : 'is-deny') }, [
          el('div', { class: 'cso-ops-subhead' }, [
            el('strong', { text: res.path + ' (' + res.reason_code + ')' }),
            el('span', { class: 'badge ' + (isPass ? 'ok' : 'bad'), text: res.verdict })
          ]),
          el('span', { class: 'muted sm', text: res.rationale })
        ]));
      } catch (e) {
        simOut.appendChild(el('div', { class: 'alert', text: e.message || 'Simulation failed' }));
      } finally {
        simBusy = false;
        simBtn.disabled = false;
      }
    });

    load();
    return wrap;
  }

  /* ---------- Folder 16: Module #5 Visual Audit Log Timeline Explorer ---------- */
  function securityAuditTimelinePanel() {
    var wrap = el('div', { class: 'panel cso-sec-studio' }, [
      el('h2', { text: 'Visual Audit Log Timeline Explorer & Event Streams' }),
      el('p', { class: 'muted', text: 'Explore DPDP-redacted security, auth, content, and operations event streams with velocity telemetry and JSON export.' })
    ]);

    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis', 'aria-live': 'polite' });
    var velocityHost = el('div', { class: 'cso-ops-subbox' });

    var state = { category: 'all', offset: 0, limit: 25, total: 0 };
    var categories = [
      ['all', 'All Events'],
      ['auth', 'Auth'],
      ['security', 'Security & RBAC'],
      ['content', 'Content'],
      ['ops', 'Ops & DR']
    ];
    var pillBar = el('div', { class: 'cso-sec-cat-pills' });
    var pillButtons = {};
    categories.forEach(function (c) {
      var b = el('button', {
        type: 'button',
        class: 'btn sm cso-sec-cat-pill' + (c[0] === 'all' ? ' is-active' : ''),
        text: c[1]
      });
      b.addEventListener('click', function () {
        state.category = c[0];
        state.offset = 0;
        Object.keys(pillButtons).forEach(function (k) {
          pillButtons[k].classList.toggle('is-active', k === state.category);
        });
        load();
      });
      pillButtons[c[0]] = b;
      pillBar.appendChild(b);
    });

    var qInp = el('input', { type: 'search', id: 'f-sec-tl-q', class: 'cso-ops-filter-input', placeholder: 'Search action, target, metadata…' });
    var actorInp = el('input', { type: 'text', id: 'f-sec-tl-actor', class: 'cso-ops-filter-input', placeholder: 'Actor email/id…' });
    var hoursSel = el('select', { id: 'f-sec-tl-hrs', class: 'cso-ops-policy-select' }, [
      el('option', { value: '0', text: 'All Time' }),
      el('option', { value: '24', text: 'Last 24 Hours' }),
      el('option', { value: '168', text: 'Last 7 Days' }),
      el('option', { value: '720', text: 'Last 30 Days' })
    ]);
    var applyBtn = el('button', { type: 'button', class: 'btn primary sm', text: 'Filter Stream' });
    var exportLink = el('a', { class: 'btn sm', href: '/api/admin/security/audit-stream?download=1&limit=100', download: 'cso-audit-stream.json', text: 'Export Filtered Stream (JSON)' });

    var filterBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'Stream Filters & Export' }),
        exportLink
      ]),
      pillBar,
      el('div', { class: 'cso-ops-filter-bar' }, [qInp, actorInp, hoursSel, applyBtn])
    ]);

    var listHost = el('div', { class: 'cso-sec-timeline-list' });
    var pagerBar = el('div', { class: 'cso-ops-subhead' });

    wrap.appendChild(kpiStrip);
    wrap.appendChild(velocityHost);
    wrap.appendChild(filterBox);
    wrap.appendChild(listHost);
    wrap.appendChild(pagerBar);

    function syncExportUrl() {
      var qs = 'download=1&category=' + encodeURIComponent(state.category) +
        '&actor=' + encodeURIComponent(actorInp.value.trim()) +
        '&hours=' + encodeURIComponent(hoursSel.value || '0') +
        '&q=' + encodeURIComponent(qInp.value.trim()) + '&limit=100';
      exportLink.setAttribute('href', '/api/admin/security/audit-stream?' + qs);
    }

    function renderKpis(d) {
      clear(kpiStrip);
      var cards = [
        ['Total Audit Events', String(d.total_all_events || 0), (d.total || 0) + ' matching filter'],
        ['High-Risk Security Events', String(d.high_risk_events || 0), 'security.*, auth.fail*, incident.*'],
        ['Active Contributors', String(d.active_contributors || 0), 'Distinct actors logged'],
        ['DPDP Redaction Shield', d.dpdp_redacted ? 'ENFORCED' : 'OFF', 'Secrets scrubbed to [REDACTED_DPDP]']
      ];
      cards.forEach(function (c) {
        kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('span', { class: 'muted sm', text: c[0] }),
          el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: c[1] }),
          el('span', { class: 'muted sm', text: c[2] })
        ]));
      });
    }

    function renderVelocity(d) {
      clear(velocityHost);
      velocityHost.appendChild(el('strong', { text: 'Event Stream Velocity by Domain' }));
      var grid = el('div', { class: 'cso-sec-vel-grid' });
      (d.velocity_buckets || []).forEach(function (b) {
        grid.appendChild(el('div', { class: 'cso-sec-vel-item' }, [
          el('div', { class: 'cso-sec-vel-head' }, [
            el('span', { text: b.label }),
            el('strong', { class: 'cso-tabular', text: b.count + ' (' + b.pct + '%)' })
          ]),
          el('progress', { class: 'cso-sec-vel-prog', max: '100', value: String(b.pct || 0) })
        ]));
      });
      velocityHost.appendChild(grid);
    }

    function renderTimeline(d) {
      clear(listHost);
      var items = d.items || [];
      if (!items.length) {
        listHost.appendChild(el('p', { class: 'muted sm', text: 'No audit events match the active filters.' }));
        return;
      }
      items.forEach(function (it) {
        var metaPre = el('pre', { class: 'cso-ops-diff-pre', text: JSON.stringify(it.metadata || {}, null, 2) });
        listHost.appendChild(el('div', { class: 'cso-sec-tl-card' }, [
          el('div', { class: 'cso-sec-tl-head' }, [
            el('div', {}, [
              el('span', { class: 'cso-ops-mono', text: it.action }),
              el('span', { class: 'muted sm', text: ' · ' + (it.actor_email || 'system') + (it.ip_address ? ' (' + it.ip_address + ')' : '') })
            ]),
            el('span', { class: 'muted sm cso-tabular', text: String(it.created_at || '').slice(0, 19).replace('T', ' ') })
          ]),
          el('details', {}, [
            el('summary', { class: 'muted sm', text: 'Inspect DPDP-redacted event metadata' + (it.target_type ? ' (' + it.target_type + ':' + (it.target_id || '') + ')' : '') }),
            metaPre
          ])
        ]));
      });
    }

    function renderPager(d) {
      clear(pagerBar);
      var total = Number(d.total || 0);
      var prevBtn = el('button', { type: 'button', class: 'btn sm', disabled: state.offset <= 0, text: '← Newer' });
      var nextBtn = el('button', { type: 'button', class: 'btn sm', disabled: state.offset + state.limit >= total, text: 'Older →' });
      prevBtn.addEventListener('click', function () {
        state.offset = Math.max(0, state.offset - state.limit);
        load();
      });
      nextBtn.addEventListener('click', function () {
        state.offset += state.limit;
        load();
      });
      pagerBar.appendChild(el('span', { class: 'muted sm cso-tabular', text: 'Showing ' + (total ? state.offset + 1 : 0) + '–' + Math.min(total, state.offset + state.limit) + ' of ' + total }));
      pagerBar.appendChild(el('div', { class: 'actions' }, [prevBtn, nextBtn]));
    }

    async function load() {
      syncExportUrl();
      try {
        var qs = 'category=' + encodeURIComponent(state.category) +
          '&actor=' + encodeURIComponent(actorInp.value.trim()) +
          '&hours=' + encodeURIComponent(hoursSel.value || '0') +
          '&q=' + encodeURIComponent(qInp.value.trim()) +
          '&limit=' + state.limit + '&offset=' + state.offset;
        var d = await api('GET', 'security/audit-stream?' + qs);
        state.total = d.total || 0;
        renderKpis(d);
        renderVelocity(d);
        renderTimeline(d);
        renderPager(d);
      } catch (e) {
        clear(listHost);
        listHost.appendChild(el('div', { class: 'alert', text: e.message || 'Failed to load audit stream' }));
      }
    }

    applyBtn.addEventListener('click', function () { state.offset = 0; load(); });
    load();
    return wrap;
  }

  /* ---------- Folder 16: Module #6 IP Access Control Lists & Geofencing ---------- */
  function securityIpGeofencePanel() {
    var isAdmin = me && me.role === 'admin';
    var wrap = el('div', { class: 'panel cso-sec-studio' }, [
      el('h2', { text: 'IP Access Control Lists (Allowlist / Blocklist) & Geofencing' }),
      el('p', { class: 'muted', text: 'Enforce IPv4/IPv6 CIDR access rules and ISO country geofences with built-in anti-self-lockout protection.' })
    ]);

    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis', 'aria-live': 'polite' });
    var modeSel = el('select', { id: 'f-sec-ip-mode', class: 'cso-ops-policy-select', disabled: !isAdmin }, [
      el('option', { value: 'monitor_only', text: 'Monitor Only (Log Would-Block)' }),
      el('option', { value: 'enforce', text: 'Enforce (Active Edge Block)' })
    ]);
    var addSelfBtn = el('button', { type: 'button', class: 'btn sm', disabled: !isAdmin, text: 'Add My Current IP to Allowlist' });
    var saveBtn = el('button', { type: 'button', class: 'btn primary', disabled: !isAdmin, text: 'Save IP & Geofence Rules' });

    var allowIpTa = el('textarea', { id: 'f-sec-ip-allow', class: 'cso-sec-acl-textarea', placeholder: 'One IP or CIDR per line (e.g. 203.0.113.0/24)', disabled: !isAdmin });
    var blockIpTa = el('textarea', { id: 'f-sec-ip-block', class: 'cso-sec-acl-textarea', placeholder: 'One IP or CIDR per line', disabled: !isAdmin });
    var allowCountryTa = el('textarea', { id: 'f-sec-ctry-allow', class: 'cso-sec-acl-textarea', placeholder: '2-letter ISO codes (e.g. IN)', disabled: !isAdmin });
    var blockCountryTa = el('textarea', { id: 'f-sec-ctry-block', class: 'cso-sec-acl-textarea', placeholder: '2-letter ISO codes', disabled: !isAdmin });

    var editorBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'ACL & Country Geofence Policy' }),
        el('div', { class: 'actions' }, [addSelfBtn, saveBtn])
      ]),
      el('div', { class: 'cso-ops-restore-field' }, [
        el('label', { for: 'f-sec-ip-mode', class: 'muted sm', text: 'Enforcement Mode' }),
        modeSel
      ]),
      el('div', { class: 'cso-sec-acl-grid' }, [
        el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-ip-allow', class: 'muted sm', text: 'Allowlisted IPs / CIDRs' }), allowIpTa]),
        el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-ip-block', class: 'muted sm', text: 'Blocklisted IPs / CIDRs' }), blockIpTa]),
        el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-ctry-allow', class: 'muted sm', text: 'Allowed Countries (ISO-2)' }), allowCountryTa]),
        el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-ctry-block', class: 'muted sm', text: 'Blocked Countries (ISO-2)' }), blockCountryTa])
      ])
    ]);

    // Simulator
    var simIpInp = el('input', { type: 'text', id: 'f-sec-sim-ip', placeholder: '203.0.113.42', class: 'cso-ops-filter-input' });
    var simCountryInp = el('input', { type: 'text', id: 'f-sec-sim-country', value: 'IN', maxlength: '2', class: 'cso-ops-policy-age' });
    var simBtn = el('button', { type: 'button', class: 'btn primary sm', text: 'Simulate IP / Country Access' });
    var simOut = el('div', { 'aria-live': 'polite' });

    var simBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'IP / Country Access Simulator' }),
        simBtn
      ]),
      el('div', { class: 'cso-ops-filter-bar' }, [
        el('label', { for: 'f-sec-sim-ip', class: 'muted sm', text: 'IP:' }), simIpInp,
        el('label', { for: 'f-sec-sim-country', class: 'muted sm', text: 'Country:' }), simCountryInp
      ]),
      simOut
    ]);

    var statusEl = el('div', { 'aria-live': 'polite' });
    wrap.appendChild(kpiStrip);
    wrap.appendChild(statusEl);
    wrap.appendChild(editorBox);
    wrap.appendChild(simBox);

    var callerCtx = { ip: '', country: 'IN' };
    var saveBusy = false;
    var simBusy = false;

    function splitLines(txt) {
      return String(txt || '').split(/[\r\n,]+/).map(function (s) { return s.trim(); }).filter(Boolean);
    }

    function renderKpis(d) {
      clear(kpiStrip);
      var p = d.policy || {};
      var st = d.stats || {};
      var c = d.caller || {};
      var cards = [
        ['Enforcement Posture', p.enforcement_mode === 'enforce' ? 'ENFORCE' : 'MONITOR ONLY', 'Anti-self-lockout active'],
        ['Your Current Edge IP', c.ip || 'Unknown', 'Country: ' + (c.country || 'IN')],
        ['Allowlisted IPs', String(st.allowlist_count || 0), (st.allowed_countries_count || 0) + ' allowed countries'],
        ['Blocklisted Rules', String((st.blocklist_count || 0) + (st.blocked_countries_count || 0)), st.blocklist_count + ' IPs · ' + st.blocked_countries_count + ' countries']
      ];
      cards.forEach(function (card) {
        kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('span', { class: 'muted sm', text: card[0] }),
          el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: card[1] }),
          el('span', { class: 'muted sm', text: card[2] })
        ]));
      });
    }

    async function load() {
      clear(statusEl);
      try {
        var d = await api('GET', 'security/ip-geofence');
        callerCtx = d.caller || { ip: '', country: 'IN' };
        var p = d.policy || {};
        modeSel.value = p.enforcement_mode || 'monitor_only';
        allowIpTa.value = (p.allowlist_ips || []).join('\n');
        blockIpTa.value = (p.blocklist_ips || []).join('\n');
        allowCountryTa.value = (p.allowed_countries || []).join('\n');
        blockCountryTa.value = (p.blocked_countries || []).join('\n');
        if (!simIpInp.value && callerCtx.ip) simIpInp.value = callerCtx.ip;
        renderKpis(d);
      } catch (e) {
        statusEl.appendChild(el('div', { class: 'alert', text: e.message || 'Failed to load IP & geofence policy' }));
      }
    }

    addSelfBtn.addEventListener('click', function () {
      if (!callerCtx.ip) return;
      var lines = splitLines(allowIpTa.value);
      if (lines.indexOf(callerCtx.ip) === -1) {
        lines.push(callerCtx.ip);
        allowIpTa.value = lines.join('\n');
      }
      toast('Added ' + callerCtx.ip + ' to allowlist draft (click Save to persist)');
    });

    saveBtn.addEventListener('click', async function () {
      if (!isAdmin || saveBusy) return;
      saveBusy = true;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      try {
        var res = await api('PUT', 'security/ip-geofence', {
          enforcement_mode: modeSel.value,
          allowlist_ips: splitLines(allowIpTa.value),
          blocklist_ips: splitLines(blockIpTa.value),
          allowed_countries: splitLines(allowCountryTa.value),
          blocked_countries: splitLines(blockCountryTa.value)
        });
        renderKpis(res);
        toast('IP ACL & geofencing rules saved');
      } catch (e) {
        toast(e.message || 'Failed to save IP & geofence rules', true);
      } finally {
        saveBusy = false;
        saveBtn.disabled = !isAdmin;
        saveBtn.textContent = 'Save IP & Geofence Rules';
      }
    });

    simBtn.addEventListener('click', async function () {
      if (simBusy) return;
      simBusy = true;
      simBtn.disabled = true;
      clear(simOut);
      try {
        var res = await api('POST', 'security/ip-geofence/simulate', {
          ip: simIpInp.value.trim(),
          country: simCountryInp.value.trim().toUpperCase()
        });
        var isAllow = res.decision === 'ALLOW';
        simOut.appendChild(el('div', { class: 'cso-sec-sim-result ' + (isAllow ? 'is-allow' : 'is-deny') }, [
          el('div', { class: 'cso-ops-subhead' }, [
            el('strong', { text: res.ip + ' (' + res.country + ') · ' + res.matching_rule }),
            el('span', { class: 'badge ' + (isAllow ? 'ok' : 'bad'), text: res.decision })
          ]),
          el('span', { class: 'muted sm', text: res.rationale })
        ]));
      } catch (e) {
        simOut.appendChild(el('div', { class: 'alert', text: e.message || 'Simulation failed' }));
      } finally {
        simBusy = false;
        simBtn.disabled = false;
      }
    });

    load();
    return wrap;
  }

  /* ---------- Folder 16: Module #7 Two-Factor Authentication (2FA / TOTP) & Hardware Keys ---------- */
  function securityTwoFactorStudioPanel() {
    var isAdmin = me && me.role === 'admin';
    var wrap = el('div', { class: 'panel cso-sec-studio' }, [
      el('h2', { text: 'Two-Factor Authentication (2FA / TOTP) & Hardware Keys' }),
      el('p', { class: 'muted', text: 'Monitor Cloudflare env secret bindings, manage staff 2FA rollout policy, and test RFC 6238 TOTP enrollment.' })
    ]);

    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis', 'aria-live': 'polite' });
    var enfSel = el('select', { id: 'f-sec-2fa-enf', class: 'cso-ops-policy-select', disabled: !isAdmin }, [
      el('option', { value: 'optional', text: 'Optional (Dev / Gradual Rollout)' }),
      el('option', { value: 'admins_only', text: 'Super Admins Required' }),
      el('option', { value: 'all_staff', text: 'All Staff Required' })
    ]);
    var graceInp = el('input', { type: 'number', id: 'f-sec-2fa-grace', min: '0', max: '90', value: '7', disabled: !isAdmin });
    var webauthnCb = el('input', { type: 'checkbox', id: 'f-sec-2fa-wa', checked: true, disabled: !isAdmin });
    var savePolicyBtn = el('button', { type: 'button', class: 'btn primary', disabled: !isAdmin, text: 'Save 2FA Rollout Policy' });

    var policyBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: '2FA & WebAuthn Governance Policy' }),
        savePolicyBtn
      ]),
      el('div', { class: 'cso-sec-policy-grid' }, [
        el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-2fa-enf', class: 'muted sm', text: 'Enforcement Scope' }), enfSel]),
        el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-2fa-grace', class: 'muted sm', text: 'Grace Period (0–90 days)' }), graceInp])
      ]),
      el('label', { class: 'cso-ops-inline-check' }, [webauthnCb, el('span', { text: 'Allow WebAuthn / FIDO2 Hardware Passkeys' })])
    ]);

    // TOTP Enrollment & RFC 6238 Sandbox
    var genSecretBtn = el('button', { type: 'button', class: 'btn sm', disabled: !isAdmin, text: 'Generate TOTP Setup Preview' });
    var secretInp = el('input', { type: 'text', id: 'f-sec-totp-secret', class: 'cso-ops-confirm-input', placeholder: 'Base32 Secret', disabled: !isAdmin });
    var codeInp = el('input', { type: 'text', id: 'f-sec-totp-code', class: 'cso-ops-policy-age', placeholder: '6-digit code', maxlength: '6', disabled: !isAdmin });
    var verifyBtn = el('button', { type: 'button', class: 'btn primary sm', disabled: !isAdmin, text: 'Verify RFC 6238 Code' });
    var sandboxOut = el('div', { 'aria-live': 'polite' });
    var verifyOut = el('div', { 'aria-live': 'polite' });

    var sandboxBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'TOTP Enrollment & RFC 6238 Code Verifier Sandbox' }),
        genSecretBtn
      ]),
      sandboxOut,
      el('div', { class: 'cso-ops-filter-bar' }, [
        secretInp,
        codeInp,
        verifyBtn
      ]),
      verifyOut
    ]);

    var staffHost = el('div', { class: 'cso-ops-vault-table-host' });
    var statusEl = el('div', { 'aria-live': 'polite' });

    wrap.appendChild(kpiStrip);
    wrap.appendChild(statusEl);
    wrap.appendChild(policyBox);
    wrap.appendChild(sandboxBox);
    wrap.appendChild(staffHost);
    if (isAdmin) wrap.appendChild(securityBackupPanel());

    var saveBusy = false;

    function renderKpis(d) {
      clear(kpiStrip);
      var p = d.policy || {};
      var ch = d.channels || {};
      var cards = [
        ['Runtime 2FA Binding', d.binding_posture === 'ENV_SECRET_ACTIVE' ? 'ACTIVE' : 'DEV MODE', ch.totp ? 'TOTP secret active' : 'ENV_SECRET_UNSET_DEV_MODE'],
        ['Rollout Policy', String(p.enforcement || 'optional').toUpperCase(), (p.grace_period_days || 0) + 'd grace window'],
        ['Enrolled Staff', (d.enrolled_count || 0) + ' / ' + (d.total_staff || 0), (d.backup_codes_remaining || 0) + ' backup codes unused'],
        ['Hardware WebAuthn', p.allow_webauthn_passkeys ? 'ENABLED' : 'DISABLED', 'FIDO2 / Passkey readiness']
      ];
      cards.forEach(function (c) {
        kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('span', { class: 'muted sm', text: c[0] }),
          el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: c[1] }),
          el('span', { class: 'muted sm', text: c[2] })
        ]));
      });
    }

    function renderStaffTable(d) {
      clear(staffHost);
      var list = d.staff_enrollment || [];
      if (!list.length) return;
      var tbl = el('table', { class: 'tbl' }, [
        el('thead', {}, [el('tr', {}, [
          el('th', { text: 'Staff Account' }),
          el('th', { text: 'Role' }),
          el('th', { text: 'TOTP Status' })
        ])])
      ]);
      var tbody = el('tbody');
      list.forEach(function (u) {
        tbody.appendChild(el('tr', {}, [
          el('td', { text: u.email }),
          el('td', { text: u.role }),
          el('td', {}, [el('span', { class: 'badge ' + (u.totp_enabled ? 'ok' : ''), text: u.totp_enabled ? 'Enrolled' : 'Pending' })])
        ]));
      });
      tbl.appendChild(tbody);
      staffHost.appendChild(tbl);
    }

    async function load() {
      clear(statusEl);
      try {
        var d = await api('GET', 'security/2fa');
        var p = d.policy || {};
        enfSel.value = p.enforcement || 'optional';
        graceInp.value = String(p.grace_period_days !== undefined ? p.grace_period_days : 7);
        webauthnCb.checked = Boolean(p.allow_webauthn_passkeys);
        renderKpis(d);
        renderStaffTable(d);
      } catch (e) {
        statusEl.appendChild(el('div', { class: 'alert', text: e.message || 'Failed to load 2FA governance state' }));
      }
    }

    savePolicyBtn.addEventListener('click', async function () {
      if (!isAdmin || saveBusy) return;
      saveBusy = true;
      savePolicyBtn.disabled = true;
      try {
        var res = await api('PUT', 'security/2fa/policy', {
          enforcement: enfSel.value,
          grace_period_days: parseInt(graceInp.value, 10) || 0,
          allow_webauthn_passkeys: webauthnCb.checked
        });
        renderKpis(res);
        toast('2FA rollout policy updated');
      } catch (e) {
        toast(e.message || 'Failed to save 2FA policy', true);
      } finally {
        saveBusy = false;
        savePolicyBtn.disabled = !isAdmin;
      }
    });

    genSecretBtn.addEventListener('click', async function () {
      if (!isAdmin) return;
      clear(sandboxOut);
      try {
        var res = await api('POST', 'security/2fa/setup-preview', {});
        secretInp.value = res.secret_base32;
        sandboxOut.appendChild(el('div', { class: 'cso-sec-totp-uri', text: res.otpauth_uri }));
        sandboxOut.appendChild(el('p', { class: 'muted sm', text: 'Preview recovery codes (not persisted to live D1): ' + (res.recovery_codes || []).join('  ') }));
      } catch (e) {
        sandboxOut.appendChild(el('div', { class: 'alert', text: e.message || 'Preview generation failed' }));
      }
    });

    verifyBtn.addEventListener('click', async function () {
      if (!isAdmin) return;
      clear(verifyOut);
      try {
        var res = await api('POST', 'security/2fa/verify-code', {
          secret_base32: secretInp.value.trim(),
          code: codeInp.value.trim()
        });
        verifyOut.appendChild(el('div', { class: 'cso-sec-sim-result ' + (res.valid ? 'is-allow' : 'is-deny') }, [
          el('div', { class: 'cso-ops-subhead' }, [
            el('strong', { text: res.message }),
            el('span', { class: 'badge ' + (res.valid ? 'ok' : 'bad'), text: res.valid ? 'VALID' : 'INVALID' })
          ])
        ]));
      } catch (e) {
        verifyOut.appendChild(el('div', { class: 'alert', text: e.message || 'Verification failed' }));
      }
    });

    load();
    return wrap;
  }

  /* ---------- Folder 16: Module #8 Sensitive Field Masking & PII Redaction ---------- */
  function securityPiiMaskingPanel() {
    var isAdmin = me && me.role === 'admin';
    var wrap = el('div', { class: 'panel cso-sec-studio' }, [
      el('h2', { text: 'Sensitive Field Masking & PII Redaction Controls' }),
      el('p', { class: 'muted', text: 'Configure India DPDP Act 2023 PII masking rules, custom sensitive field patterns, and test live redaction output.' })
    ]);

    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis', 'aria-live': 'polite' });
    var emailCb = el('input', { type: 'checkbox', id: 'f-sec-pii-email', checked: true, disabled: !isAdmin });
    var phoneCb = el('input', { type: 'checkbox', id: 'f-sec-pii-phone', checked: true, disabled: !isAdmin });
    var ipCb = el('input', { type: 'checkbox', id: 'f-sec-pii-ip', checked: true, disabled: !isAdmin });
    var credCb = el('input', { type: 'checkbox', id: 'f-sec-pii-cred', checked: true, disabled: true });
    var fieldsTa = el('textarea', { id: 'f-sec-pii-fields', class: 'cso-sec-acl-textarea', placeholder: 'One snake_case field per line (e.g. aadhaar, pan, bank_account)', disabled: !isAdmin });
    var saveBtn = el('button', { type: 'button', class: 'btn primary', disabled: !isAdmin, text: 'Save PII Redaction Rules' });

    var policyBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'DPDP Act 2023 Masking & Field Redaction Rules' }),
        saveBtn
      ]),
      el('div', { class: 'cso-sec-toggle-list' }, [
        el('label', { class: 'cso-sec-toggle-item' }, [emailCb, el('span', { text: 'Mask email addresses for Reviewer role (e.g. c***@domain.com)' })]),
        el('label', { class: 'cso-sec-toggle-item' }, [phoneCb, el('span', { text: 'Mask phone numbers for non-Super-Admin views' })]),
        el('label', { class: 'cso-sec-toggle-item' }, [ipCb, el('span', { text: 'Mask last two IPv4 octets in non-admin telemetry' })]),
        el('label', { class: 'cso-sec-toggle-item' }, [credCb, el('span', { text: 'Redact export credentials, password_hash, salts & tokens (Locked ON)' })])
      ]),
      el('div', { class: 'cso-sec-policy-field' }, [
        el('label', { for: 'f-sec-pii-fields', class: 'muted sm', text: 'Custom Redacted Field Keys (one per line or comma-separated)' }),
        fieldsTa
      ])
    ]);

    // Live PII Redaction Sandbox
    var samplePayload = JSON.stringify({
      email: 'aspirant@csodisha.com',
      phone: '+91-9876543210',
      aadhaar: '1234-5678-9012',
      pan: 'ABCDE1234F',
      ip_address: '203.0.113.45',
      password_hash: 'pbkdf2_secret_hash'
    }, null, 2);
    var simPayloadTa = el('textarea', { id: 'f-sec-pii-sample', class: 'cso-sec-acl-textarea', value: samplePayload });
    var simRoleSel = el('select', { id: 'f-sec-pii-role', class: 'cso-ops-policy-select' }, [
      el('option', { value: 'reviewer', text: 'Reviewer (reviewer)' }),
      el('option', { value: 'editor', text: 'Senior Editor (editor)' }),
      el('option', { value: 'admin', text: 'Super Admin (admin)' })
    ]);
    var simBtn = el('button', { type: 'button', class: 'btn primary sm', text: 'Preview Redacted Output' });
    var simOut = el('div', { 'aria-live': 'polite' });

    var simBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'Live PII Redaction Previewer' }),
        simBtn
      ]),
      el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-sec-pii-role', class: 'muted sm', text: 'Viewer Role' }), simRoleSel]),
      el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-pii-sample', class: 'muted sm', text: 'Sample JSON or Text Payload' }), simPayloadTa]),
      simOut
    ]);

    var statusEl = el('div', { 'aria-live': 'polite' });
    wrap.appendChild(kpiStrip);
    wrap.appendChild(statusEl);
    wrap.appendChild(policyBox);
    wrap.appendChild(simBox);

    var saveBusy = false;
    var simBusy = false;

    function parseFields(txt) {
      return String(txt || '').split(/[\r\n,]+/).map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
    }

    function renderKpis(d) {
      clear(kpiStrip);
      var p = d.policy || {};
      var cards = [
        ['DPDP Compliance Mode', 'ENFORCED', 'India DPDP Act 2023 active'],
        ['Protected Field Patterns', String(d.protected_field_count || 0), 'Custom redacted keys'],
        ['Reviewer Email Masking', p.mask_emails_for_reviewers ? 'ON' : 'OFF', p.mask_phone_numbers ? 'Phones masked' : 'Phones unmasked'],
        ['Last Policy Update', d.updated_at ? String(d.updated_at).slice(0, 16).replace('T', ' ') : 'Default', d.updated_by || 'System baseline']
      ];
      cards.forEach(function (c) {
        kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('span', { class: 'muted sm', text: c[0] }),
          el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: c[1] }),
          el('span', { class: 'muted sm', text: c[2] })
        ]));
      });
    }

    async function load() {
      clear(statusEl);
      try {
        var d = await api('GET', 'security/pii-masking');
        var p = d.policy || {};
        emailCb.checked = Boolean(p.mask_emails_for_reviewers);
        phoneCb.checked = Boolean(p.mask_phone_numbers);
        ipCb.checked = Boolean(p.mask_ip_addresses);
        fieldsTa.value = (p.custom_redacted_fields || []).join('\n');
        renderKpis(d);
      } catch (e) {
        statusEl.appendChild(el('div', { class: 'alert', text: e.message || 'Failed to load PII masking policy' }));
      }
    }

    saveBtn.addEventListener('click', async function () {
      if (!isAdmin || saveBusy) return;
      saveBusy = true;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving…';
      try {
        var res = await api('PUT', 'security/pii-masking', {
          mask_emails_for_reviewers: emailCb.checked,
          mask_phone_numbers: phoneCb.checked,
          mask_ip_addresses: ipCb.checked,
          custom_redacted_fields: parseFields(fieldsTa.value)
        });
        renderKpis(res);
        toast('DPDP PII masking rules saved');
      } catch (e) {
        toast(e.message || 'Failed to save PII masking rules', true);
      } finally {
        saveBusy = false;
        saveBtn.disabled = !isAdmin;
        saveBtn.textContent = 'Save PII Redaction Rules';
      }
    });

    simBtn.addEventListener('click', async function () {
      if (simBusy) return;
      simBusy = true;
      simBtn.disabled = true;
      clear(simOut);
      try {
        var res = await api('POST', 'security/pii-masking/preview', {
          payload: simPayloadTa.value,
          viewer_role: simRoleSel.value
        });
        simOut.appendChild(el('div', { class: 'cso-sec-sim-result is-allow' }, [
          el('div', { class: 'cso-ops-subhead' }, [
            el('strong', { text: 'Redacted Preview (' + res.viewer_role + ')' }),
            el('span', { class: 'badge ok', text: res.redaction_count + ' redactions' })
          ]),
          el('pre', { class: 'cso-ops-diff-pre', text: typeof res.redacted_payload === 'string' ? res.redacted_payload : JSON.stringify(res.redacted_payload, null, 2) })
        ]));
      } catch (e) {
        simOut.appendChild(el('div', { class: 'alert', text: e.message || 'Preview failed' }));
      } finally {
        simBusy = false;
        simBtn.disabled = false;
      }
    });

    load();
    return wrap;
  }

  /* ---------- Folder 16: Module #9 API Key Management & Token Scoping ---------- */
  function securityApiKeysPanel() {
    var isAdmin = me && me.role === 'admin';
    var wrap = el('div', { class: 'panel cso-sec-studio' }, [
      el('h2', { text: 'API Key Management & Token Scoping' }),
      el('p', { class: 'muted', text: 'Issue least-privilege scoped API tokens stored strictly as SHA-256 hashes in D1 with instant revocation.' })
    ]);

    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis', 'aria-live': 'polite' });
    var nameInp = el('input', { type: 'text', id: 'f-sec-ak-name', placeholder: 'Integration name (e.g. Mobile App Feed)', disabled: !isAdmin });
    var expSel = el('select', { id: 'f-sec-ak-exp', class: 'cso-ops-policy-select', disabled: !isAdmin }, [
      el('option', { value: '30', text: '30 Days' }),
      el('option', { value: '90', text: '90 Days', selected: true }),
      el('option', { value: '180', text: '180 Days' }),
      el('option', { value: '365', text: '365 Days' })
    ]);
    var rpmInp = el('input', { type: 'number', id: 'f-sec-ak-rpm', min: '10', max: '600', value: '60', disabled: !isAdmin });
    var scopesBox = el('div', { class: 'cso-sec-cat-pills' });
    var scopeCheckboxes = {};
    ['read:schemes', 'read:jobs', 'read:study', 'read:news', 'webhook:deploy'].forEach(function (sc) {
      var cb = el('input', { type: 'checkbox', checked: sc === 'read:schemes', disabled: !isAdmin });
      scopeCheckboxes[sc] = cb;
      scopesBox.appendChild(el('label', { class: 'cso-sec-cell-check' }, [cb, el('span', { class: 'cso-ops-mono sm', text: sc })]));
    });
    var issueBtn = el('button', { type: 'button', class: 'btn primary', disabled: !isAdmin, text: 'Issue Scoped API Key' });
    var receiptHost = el('div', { 'aria-live': 'polite' });

    var issuerBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'Issue New Scoped API Key' }),
        issueBtn
      ]),
      el('div', { class: 'cso-sec-policy-grid' }, [
        el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-ak-name', class: 'muted sm', text: 'Key Label' }), nameInp]),
        el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-ak-exp', class: 'muted sm', text: 'Expiry Window' }), expSel]),
        el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-ak-rpm', class: 'muted sm', text: 'Rate Limit (10–600 RPM)' }), rpmInp])
      ]),
      scopesBox,
      receiptHost
    ]);

    var statusEl = el('div', { 'aria-live': 'polite' });
    var tableHost = el('div', { class: 'cso-ops-vault-table-host' });

    wrap.appendChild(kpiStrip);
    wrap.appendChild(statusEl);
    wrap.appendChild(issuerBox);
    wrap.appendChild(tableHost);

    var issueBusy = false;

    function renderKpis(d) {
      clear(kpiStrip);
      var cards = [
        ['Active Scoped Keys', String(d.active_count || 0), 'SHA-256 hashed in D1'],
        ['Revoked Keys', String(d.revoked_count || 0), 'Invalidated tokens'],
        ['Max RPM Ceiling', String(d.max_rpm_ceiling || 60), 'Per-key rate throttle'],
        ['Plaintext Storage', 'ZERO', 'Tokens shown once at issue']
      ];
      cards.forEach(function (c) {
        kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('span', { class: 'muted sm', text: c[0] }),
          el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: c[1] }),
          el('span', { class: 'muted sm', text: c[2] })
        ]));
      });
    }

    function renderLedger(d) {
      clear(tableHost);
      var list = d.items || [];
      if (!list.length) {
        tableHost.appendChild(el('p', { class: 'muted sm', text: 'No API keys issued yet.' }));
        return;
      }
      var tbl = el('table', { class: 'tbl' }, [
        el('thead', {}, [el('tr', {}, [
          el('th', { text: 'Key Prefix & Name' }),
          el('th', { text: 'Scopes' }),
          el('th', { text: 'RPM / Expiry' }),
          el('th', { text: 'Status' }),
          el('th', { text: 'Action' })
        ])])
      ]);
      var tbody = el('tbody');
      list.forEach(function (k) {
        var revBtn = el('button', {
          type: 'button',
          class: 'btn sm danger',
          disabled: !isAdmin || k.status === 'revoked',
          text: k.status === 'revoked' ? 'Revoked' : 'Revoke'
        });
        revBtn.addEventListener('click', async function () {
          if (!isAdmin || k.status === 'revoked') return;
          revBtn.disabled = true;
          try {
            await api('POST', 'security/api-keys/' + encodeURIComponent(k.id) + '/revoke', {});
            toast('API key ' + k.key_prefix + ' revoked');
            await load();
          } catch (e) {
            toast(e.message || 'Revocation failed', true);
            revBtn.disabled = false;
          }
        });
        tbody.appendChild(el('tr', {}, [
          el('td', {}, [
            el('div', { class: 'cso-ops-mono sm', text: k.key_prefix }),
            el('span', { class: 'muted sm', text: k.name })
          ]),
          el('td', { class: 'cso-ops-mono sm', text: (k.scopes || []).join(', ') }),
          el('td', { class: 'cso-tabular sm', text: k.rate_limit_rpm + ' RPM · ' + (k.expires_at ? k.expires_at.slice(0, 10) : '—') }),
          el('td', {}, [el('span', { class: 'badge ' + (k.status === 'active' ? 'ok' : 'bad'), text: k.status })]),
          el('td', {}, [revBtn])
        ]));
      });
      tbl.appendChild(tbody);
      tableHost.appendChild(tbl);
    }

    async function load() {
      clear(statusEl);
      if (!isAdmin) {
        statusEl.appendChild(el('div', { class: 'alert', text: 'API key management is restricted to Super Administrators.' }));
        return;
      }
      try {
        var d = await api('GET', 'security/api-keys');
        renderKpis(d);
        renderLedger(d);
      } catch (e) {
        statusEl.appendChild(el('div', { class: 'alert', text: e.message || 'Failed to load API keys' }));
      }
    }

    issueBtn.addEventListener('click', async function () {
      if (!isAdmin || issueBusy) return;
      var selectedScopes = Object.keys(scopeCheckboxes).filter(function (s) { return scopeCheckboxes[s].checked; });
      issueBusy = true;
      issueBtn.disabled = true;
      clear(receiptHost);
      try {
        var res = await api('POST', 'security/api-keys', {
          name: nameInp.value.trim(),
          scopes: selectedScopes,
          expires_in_days: parseInt(expSel.value, 10),
          rate_limit_rpm: parseInt(rpmInp.value, 10)
        });
        nameInp.value = '';
        var copyBtn = el('button', { type: 'button', class: 'btn sm', text: 'Copy New API Key' });
        copyBtn.addEventListener('click', function () {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(res.plaintext_token).then(function () { toast('Copied API key to clipboard'); });
          }
        });
        receiptHost.appendChild(el('div', { class: 'cso-sec-sim-result is-allow' }, [
          el('div', { class: 'cso-ops-subhead' }, [
            el('strong', { text: 'One-Time API Key Receipt (Store Securely Now)' }),
            copyBtn
          ]),
          el('div', { class: 'cso-sec-totp-uri', text: res.plaintext_token })
        ]));
        toast('Scoped API key issued');
        await load();
      } catch (e) {
        toast(e.message || 'Failed to issue API key', true);
      } finally {
        issueBusy = false;
        issueBtn.disabled = !isAdmin;
      }
    });

    load();
    return wrap;
  }

  /* ---------- Folder 16: Module #10 CSRF Protection & Origin Integrity Headers ---------- */
  function securityOriginHeadersPanel() {
    var isAdmin = me && me.role === 'admin';
    var wrap = el('div', { class: 'panel cso-sec-studio' }, [
      el('h2', { text: 'CSRF Protection & Origin Integrity Headers' }),
      el('p', { class: 'muted', text: 'Manage trusted CORS/CSRF origins, cookie SameSite posture, CSP frame-ancestors, HSTS, and verify cross-origin requests.' })
    ]);

    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis', 'aria-live': 'polite' });
    var enforceCb = el('input', { type: 'checkbox', id: 'f-sec-ori-enf', checked: true, disabled: !isAdmin });
    var sameSiteSel = el('select', { id: 'f-sec-ori-ss', class: 'cso-ops-policy-select', disabled: !isAdmin }, [
      el('option', { value: 'Lax', text: 'Lax (Recommended)' }),
      el('option', { value: 'Strict', text: 'Strict' })
    ]);
    var frameSel = el('select', { id: 'f-sec-ori-frame', class: 'cso-ops-policy-select', disabled: !isAdmin }, [
      el('option', { value: "'none'", text: "'none' (X-Frame-Options: DENY)" }),
      el('option', { value: "'self'", text: "'self' (X-Frame-Options: SAMEORIGIN)" })
    ]);
    var hstsInp = el('input', { type: 'number', id: 'f-sec-ori-hsts', min: '300', max: '63072000', value: '31536000', disabled: !isAdmin });
    var originsTa = el('textarea', { id: 'f-sec-ori-list', class: 'cso-sec-acl-textarea', placeholder: 'https://csodisha.com', disabled: !isAdmin });
    var saveBtn = el('button', { type: 'button', class: 'btn primary', disabled: !isAdmin, text: 'Save Origin & Header Policy' });

    var policyBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'Trusted Origins & Response Header Policy' }),
        saveBtn
      ]),
      el('label', { class: 'cso-ops-inline-check' }, [enforceCb, el('span', { text: 'Enforce Origin/Referer & X-CSO-CSRF check on all mutating requests' })]),
      el('div', { class: 'cso-sec-policy-grid' }, [
        el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-ori-ss', class: 'muted sm', text: 'Cookie SameSite Policy' }), sameSiteSel]),
        el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-ori-frame', class: 'muted sm', text: 'CSP frame-ancestors' }), frameSel]),
        el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-ori-hsts', class: 'muted sm', text: 'HSTS Max-Age (seconds)' }), hstsInp])
      ]),
      el('div', { class: 'cso-sec-policy-field' }, [el('label', { for: 'f-sec-ori-list', class: 'muted sm', text: 'Allowed Origins (one URL per line)' }), originsTa])
    ]);

    var matrixHost = el('div', { class: 'cso-ops-vault-table-host' });

    // Cross-Origin Request Simulator
    var testMethSel = el('select', { id: 'f-sec-csrf-m', class: 'cso-ops-policy-select' }, [
      el('option', { value: 'POST', text: 'POST' }),
      el('option', { value: 'PUT', text: 'PUT' }),
      el('option', { value: 'DELETE', text: 'DELETE' }),
      el('option', { value: 'GET', text: 'GET' })
    ]);
    var testOrigInp = el('input', { type: 'text', id: 'f-sec-csrf-o', value: 'https://evil-attacker.example', class: 'cso-ops-filter-input' });
    var testBtn = el('button', { type: 'button', class: 'btn primary sm', text: 'Verify Cross-Origin Request' });
    var testOut = el('div', { 'aria-live': 'polite' });

    var simBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'Cross-Origin & CSRF Request Verifier' }),
        testBtn
      ]),
      el('div', { class: 'cso-ops-filter-bar' }, [testMethSel, testOrigInp]),
      testOut
    ]);

    var statusEl = el('div', { 'aria-live': 'polite' });
    wrap.appendChild(kpiStrip);
    wrap.appendChild(statusEl);
    wrap.appendChild(policyBox);
    wrap.appendChild(matrixHost);
    wrap.appendChild(simBox);

    var saveBusy = false;

    function renderKpis(d) {
      clear(kpiStrip);
      var p = d.policy || {};
      var cards = [
        ['CSP Inline-Zero Posture', d.csp_inline_zero ? 'STRICT' : 'WARN', 'Zero inline <script> / style=""'],
        ['Allowed Origins', String((p.allowed_origins || []).length), p.enforce_origin_check ? 'Origin enforced' : 'Monitor'],
        ['Cookie SameSite', String(p.samesite_cookie_policy || 'Lax'), 'Session cookie attribute'],
        ['HSTS Max-Age', String(p.hsts_max_age_seconds || 31536000) + 's', 'preload + includeSubDomains']
      ];
      cards.forEach(function (c) {
        kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('span', { class: 'muted sm', text: c[0] }),
          el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: c[1] }),
          el('span', { class: 'muted sm', text: c[2] })
        ]));
      });
    }

    function renderHeadersMatrix(d) {
      clear(matrixHost);
      var tbl = el('table', { class: 'tbl' }, [
        el('thead', {}, [el('tr', {}, [
          el('th', { text: 'Security Header' }),
          el('th', { text: 'Active Directive' }),
          el('th', { text: 'Status' })
        ])])
      ]);
      var tbody = el('tbody');
      (d.headers_audit || []).forEach(function (h) {
        tbody.appendChild(el('tr', {}, [
          el('td', { class: 'cso-ops-mono sm', text: h.header }),
          el('td', { class: 'cso-ops-mono sm', text: h.value }),
          el('td', {}, [el('span', { class: 'badge ok', text: h.status })])
        ]));
      });
      tbl.appendChild(tbody);
      matrixHost.appendChild(tbl);
    }

    async function load() {
      clear(statusEl);
      try {
        var d = await api('GET', 'security/origin-headers');
        var p = d.policy || {};
        enforceCb.checked = Boolean(p.enforce_origin_check);
        sameSiteSel.value = p.samesite_cookie_policy || 'Lax';
        frameSel.value = p.csp_frame_ancestors || "'none'";
        hstsInp.value = String(p.hsts_max_age_seconds || 31536000);
        originsTa.value = (p.allowed_origins || []).join('\n');
        renderKpis(d);
        renderHeadersMatrix(d);
      } catch (e) {
        statusEl.appendChild(el('div', { class: 'alert', text: e.message || 'Failed to load origin header policy' }));
      }
    }

    saveBtn.addEventListener('click', async function () {
      if (!isAdmin || saveBusy) return;
      saveBusy = true;
      saveBtn.disabled = true;
      try {
        var origins = String(originsTa.value || '').split(/[\r\n,]+/).map(function (s) { return s.trim(); }).filter(Boolean);
        var res = await api('PUT', 'security/origin-headers', {
          enforce_origin_check: enforceCb.checked,
          samesite_cookie_policy: sameSiteSel.value,
          csp_frame_ancestors: frameSel.value,
          hsts_max_age_seconds: parseInt(hstsInp.value, 10),
          allowed_origins: origins
        });
        renderKpis(res);
        renderHeadersMatrix(res);
        toast('Origin integrity & CSRF policy saved');
      } catch (e) {
        toast(e.message || 'Failed to save origin policy', true);
      } finally {
        saveBusy = false;
        saveBtn.disabled = !isAdmin;
      }
    });

    testBtn.addEventListener('click', async function () {
      clear(testOut);
      try {
        var res = await api('POST', 'security/origin-headers/test', {
          method: testMethSel.value,
          origin: testOrigInp.value.trim(),
          has_session_cookie: true
        });
        testOut.appendChild(el('div', { class: 'cso-sec-sim-result ' + (res.allowed ? 'is-allow' : 'is-deny') }, [
          el('div', { class: 'cso-ops-subhead' }, [
            el('strong', { text: res.method + ' · ' + (res.resolved_origin || 'missing-origin') }),
            el('span', { class: 'badge ' + (res.allowed ? 'ok' : 'bad'), text: res.verdict })
          ]),
          el('span', { class: 'muted sm', text: res.rationale })
        ]));
      } catch (e) {
        testOut.appendChild(el('div', { class: 'alert', text: e.message || 'Test failed' }));
      }
    });

    load();
    return wrap;
  }

  function securityLockdownDispatcherPanel() {
    var isAdmin = Boolean(me && me.role === 'admin');
    var wrap = el('div', { class: 'cso-ops-studio' });
    var kpis = el('div', { class: 'cso-ops-kpis' });
    var previewOut = el('div');
    var histBox = el('div');
    var levelSel = el('select', { class: 'select' }, [
      el('option', { value: 'normal', text: 'normal — Normal Platform Operations' }),
      el('option', { value: 'read_only_freeze', text: 'read_only_freeze — Read-Only Freeze (Admin Reads Only)' }),
      el('option', { value: 'public_maintenance', text: 'public_maintenance — Public Maintenance Banner + Freeze' }),
      el('option', { value: 'full_session_lockdown', text: 'full_session_lockdown — Revoke Non-Admin Sessions + Freeze' })
    ]);
    var titleInp = el('input', { class: 'input', type: 'text', placeholder: 'e.g. Scheduled Security Maintenance' });
    var bodyTa = el('textarea', { class: 'textarea', rows: '3', placeholder: 'Public incident / maintenance banner message...' });
    var confirmInp = el('input', { class: 'input', type: 'text', placeholder: 'Type LOCKDOWN (or RESTORE_NORMAL for normal)' });
    var dryBtn = el('button', { class: 'cso-ops-btn', type: 'button', text: 'Preview Dry-Run Impact' });
    var liveBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--danger', type: 'button', text: 'Dispatch Live Lockdown' });
    if (!isAdmin) liveBtn.disabled = true;

    wrap.appendChild(el('div', { class: 'cso-ops-hero' }, [
      el('div', {}, [
        el('span', { class: 'badge warn', text: 'LOCKDOWN DISPATCHER' }),
        el('h2', { text: 'Emergency Maintenance Mode & Lockdown Dispatcher' }),
        el('p', { class: 'muted', text: 'Coordinate Read-Only Freeze, public maintenance banners, and emergency non-admin session revocation with Super Admin bypass.' })
      ])
    ]));
    wrap.appendChild(kpis);

    function renderState(res) {
      clear(kpis);
      clear(histBox);
      var ld = (res && res.lockdown) || {};
      var fr = (res && res.freeze) || {};
      var levelBadge = ld.level === 'normal' ? 'ok' : (ld.level === 'full_session_lockdown' ? 'bad' : 'warn');
      kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
        el('span', { class: 'muted sm', text: 'Lockdown Level' }),
        el('strong', {}, [el('span', { class: 'badge ' + levelBadge, text: ld.level || 'normal' })])
      ]));
      kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
        el('span', { class: 'muted sm', text: 'Read-Only Freeze' }),
        el('strong', { text: fr.enabled ? 'ENABLED' : 'OFF' })
      ]));
      kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
        el('span', { class: 'muted sm', text: 'Non-Admin Sessions' }),
        el('strong', { text: String(res.non_admin_active_sessions || 0) })
      ]));
      kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
        el('span', { class: 'muted sm', text: 'Super Admin Bypass' }),
        el('strong', { text: ld.allow_super_admin_bypass === false ? 'DISABLED' : 'ALWAYS ON' })
      ]));

      if (ld.level) levelSel.value = ld.level;
      titleInp.value = ld.incident_banner_title || '';
      bodyTa.value = ld.incident_banner_body || '';

      var hist = Array.isArray(res.dispatch_history) ? res.dispatch_history : [];
      if (!hist.length) {
        histBox.appendChild(el('div', { class: 'muted sm', text: 'No live lockdown dispatches recorded yet.' }));
      } else {
        var tbody = el('tbody');
        hist.forEach(function (item) {
          var meta = item.metadata || {};
          tbody.appendChild(el('tr', {}, [
            el('td', { text: String(item.created_at || '').slice(0, 19).replace('T', ' ') }),
            el('td', { text: meta.level || '—' }),
            el('td', { text: String(meta.revoked_sessions || 0) }),
            el('td', { text: item.actor_user_id || '—' })
          ]));
        });
        histBox.appendChild(el('div', { class: 'cso-ops-table-wrap' }, [
          el('table', { class: 'table' }, [
            el('thead', {}, [el('tr', {}, [
              el('th', { text: 'Timestamp' }),
              el('th', { text: 'Target Level' }),
              el('th', { text: 'Sessions Revoked' }),
              el('th', { text: 'Actor' })
            ])]),
            tbody
          ])
        ]));
      }
    }

    async function load() {
      try {
        var res = await api('GET', 'security/lockdown');
        renderState(res);
      } catch (e) {
        toast(e.message || 'Failed to load lockdown posture', true);
      }
    }

    var busy = false;
    async function dispatch(isDryRun) {
      if (busy) return;
      if (!isDryRun && !isAdmin) return;
      busy = true;
      dryBtn.disabled = true;
      liveBtn.disabled = true;
      clear(previewOut);
      try {
        var res = await api('POST', 'security/lockdown/dispatch', {
          level: levelSel.value,
          incident_banner_title: titleInp.value.trim(),
          incident_banner_body: bodyTa.value.trim(),
          dry_run: isDryRun,
          confirm: confirmInp.value.trim()
        });
        if (isDryRun) {
          previewOut.appendChild(el('div', { class: 'cso-sec-sim-result ' + (res.would_enable_freeze ? 'is-deny' : 'is-allow') }, [
            el('div', { class: 'cso-ops-subhead' }, [
              el('strong', { text: 'Dry-Run Target: ' + res.target_level }),
              el('span', { class: 'badge ' + (res.would_enable_freeze ? 'warn' : 'ok'), text: res.would_enable_freeze ? 'FREEZE ON' : 'NORMAL' })
            ]),
            el('p', { class: 'muted sm', text: res.rationale }),
            el('span', { class: 'muted sm', text: 'Sessions affected: ' + String(res.would_revoke_non_admin_sessions || 0) })
          ]));
        } else {
          confirmInp.value = '';
          toast('Live lockdown dispatched: ' + res.lockdown.level);
          await load();
        }
      } catch (e) {
        previewOut.appendChild(el('div', { class: 'alert', text: e.message || 'Dispatch failed' }));
        toast(e.message || 'Dispatch failed', true);
      } finally {
        busy = false;
        dryBtn.disabled = false;
        liveBtn.disabled = !isAdmin;
      }
    }

    dryBtn.addEventListener('click', function () { dispatch(true); });
    liveBtn.addEventListener('click', function () { dispatch(false); });

    wrap.appendChild(el('div', { class: 'cso-ops-grid-2' }, [
      el('div', { class: 'cso-ops-card' }, [
        el('h3', { text: 'Lockdown Dispatch Controls' }),
        el('div', { class: 'field' }, [el('label', { text: 'Lockdown Level' }), levelSel]),
        el('div', { class: 'field' }, [el('label', { text: 'Incident Banner Title' }), titleInp]),
        el('div', { class: 'field' }, [el('label', { text: 'Incident Banner Body' }), bodyTa]),
        el('div', { class: 'field' }, [el('label', { text: 'Live Confirmation Phrase (LOCKDOWN or RESTORE_NORMAL)' }), confirmInp]),
        el('div', { class: 'cso-ops-actions' }, [dryBtn, liveBtn]),
        previewOut
      ]),
      el('div', { class: 'cso-ops-card' }, [
        el('h3', { text: 'Recent Lockdown Dispatches' }),
        histBox
      ])
    ]));

    load();
    return wrap;
  }

  function securityDpdpConsentVaultPanel() {
    var isAdmin = Boolean(me && me.role === 'admin');
    var wrap = el('div', { class: 'cso-ops-studio' });
    var kpis = el('div', { class: 'cso-ops-kpis' });
    var dsarBox = el('div');
    var consentBox = el('div');

    var dpoNameInp = el('input', { class: 'input', type: 'text' });
    var dpoEmailInp = el('input', { class: 'input', type: 'email' });
    var noticeVerInp = el('input', { class: 'input', type: 'text' });
    var slaDaysInp = el('input', { class: 'input', type: 'number', min: '7', max: '30' });
    var purgeDaysInp = el('input', { class: 'input', type: 'number', min: '1', max: '365' });
    var savePolicyBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--primary', type: 'button', text: 'Save DPDP Policy' });
    if (!isAdmin) savePolicyBtn.disabled = true;

    var dsarTypeSel = el('select', { class: 'select' }, [
      el('option', { value: 'access', text: 'access — Data Principal Access Request' }),
      el('option', { value: 'correction', text: 'correction — Data Correction Request' }),
      el('option', { value: 'erasure', text: 'erasure — Right to Erasure Request' })
    ]);
    var dsarSubjInp = el('input', { class: 'input', type: 'text', placeholder: 'Email or Candidate ID (hashed server-side)' });
    var dsarNotesInp = el('input', { class: 'input', type: 'text', placeholder: 'Optional verification notes...' });
    var dsarAddBtn = el('button', { class: 'cso-ops-btn', type: 'button', text: 'Log DSAR Request' });
    if (!isAdmin) dsarAddBtn.disabled = true;

    wrap.appendChild(el('div', { class: 'cso-ops-hero' }, [
      el('div', {}, [
        el('span', { class: 'badge ok', text: 'INDIA DPDP ACT 2023' }),
        el('h2', { text: 'Data Privacy, DPDP Act 2023 Compliance & Consent Vault' }),
        el('p', { class: 'muted', text: 'Manage Data Protection Officer governance, Data Principal Rights (DSAR) SLAs, and SHA-256 masked consent records.' })
      ])
    ]));
    wrap.appendChild(kpis);

    function renderState(res) {
      clear(kpis);
      clear(dsarBox);
      clear(consentBox);
      var pol = (res && res.policy) || {};
      var cs = (res && res.consent_summary) || {};
      var ds = (res && res.dsar_summary) || {};

      kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
        el('span', { class: 'muted sm', text: 'Compliance Readiness' }),
        el('strong', {}, [el('span', { class: 'badge ok', text: res.dpdp_readiness || 'COMPLIANT' })])
      ]));
      kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
        el('span', { class: 'muted sm', text: 'Consent Records' }),
        el('strong', { text: String(cs.granted || 0) + ' granted / ' + String(cs.withdrawn || 0) + ' withdrawn' })
      ]));
      kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
        el('span', { class: 'muted sm', text: 'DSAR Queue' }),
        el('strong', { text: String(ds.open_count || 0) + ' open / ' + String(ds.fulfilled_count || 0) + ' fulfilled' })
      ]));
      kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
        el('span', { class: 'muted sm', text: 'DSAR SLA Window' }),
        el('strong', { text: String(pol.dsar_sla_days || 15) + ' days' })
      ]));

      dpoNameInp.value = pol.dpo_name || '';
      dpoEmailInp.value = pol.dpo_email || '';
      noticeVerInp.value = pol.privacy_notice_version || '';
      slaDaysInp.value = String(pol.dsar_sla_days || 15);
      purgeDaysInp.value = String(pol.auto_purge_withdrawn_days || 30);

      var dsars = Array.isArray(res.dsar_requests) ? res.dsar_requests : [];
      if (!dsars.length) {
        dsarBox.appendChild(el('div', { class: 'muted sm', text: 'No DSAR requests logged.' }));
      } else {
        var dtbody = el('tbody');
        dsars.forEach(function (d) {
          var badgeCls = d.status === 'fulfilled' ? 'ok' : (d.status === 'rejected_with_reason' ? 'bad' : 'warn');
          var actionsCell = el('td', { class: 'cso-ops-actions' });
          if (isAdmin && (d.status === 'pending' || d.status === 'in_review')) {
            ['in_review', 'fulfilled', 'rejected_with_reason'].forEach(function (nextSt) {
              if (nextSt === d.status) return;
              var label = nextSt === 'in_review' ? 'Review' : (nextSt === 'fulfilled' ? 'Fulfill' : 'Reject');
              var b = el('button', { class: 'btn sm', type: 'button', text: label });
              b.addEventListener('click', async function () {
                b.disabled = true;
                try {
                  await api('PATCH', 'security/dpdp/dsar/' + encodeURIComponent(d.id), { status: nextSt });
                  toast('DSAR updated to ' + nextSt);
                  await load();
                } catch (err) {
                  toast(err.message || 'DSAR update failed', true);
                  b.disabled = false;
                }
              });
              actionsCell.appendChild(b);
            });
          } else {
            actionsCell.appendChild(el('span', { class: 'muted sm', text: d.resolved_by || '—' }));
          }
          dtbody.appendChild(el('tr', {}, [
            el('td', { text: d.request_type }),
            el('td', { text: d.subject_masked }),
            el('td', {}, [el('span', { class: 'badge ' + badgeCls, text: d.status })]),
            el('td', { text: String(d.sla_due_at || '').slice(0, 10) }),
            actionsCell
          ]));
        });
        dsarBox.appendChild(el('div', { class: 'cso-ops-table-wrap' }, [
          el('table', { class: 'table' }, [
            el('thead', {}, [el('tr', {}, [
              el('th', { text: 'Type' }),
              el('th', { text: 'Subject (Masked)' }),
              el('th', { text: 'Status' }),
              el('th', { text: 'SLA Due' }),
              el('th', { text: 'Actions' })
            ])]),
            dtbody
          ])
        ]));
      }

      var consents = Array.isArray(res.recent_consents) ? res.recent_consents : [];
      if (!consents.length) {
        consentBox.appendChild(el('div', { class: 'muted sm', text: 'No consent ledger entries recorded yet.' }));
      } else {
        var ctbody = el('tbody');
        consents.forEach(function (c) {
          ctbody.appendChild(el('tr', {}, [
            el('td', { text: c.subject_masked }),
            el('td', { text: c.purpose_code }),
            el('td', { text: c.lawful_basis }),
            el('td', {}, [el('span', { class: 'badge ' + (c.status === 'granted' ? 'ok' : 'warn'), text: c.status })]),
            el('td', { text: c.notice_version })
          ]));
        });
        consentBox.appendChild(el('div', { class: 'cso-ops-table-wrap' }, [
          el('table', { class: 'table' }, [
            el('thead', {}, [el('tr', {}, [
              el('th', { text: 'Subject' }),
              el('th', { text: 'Purpose' }),
              el('th', { text: 'Lawful Basis' }),
              el('th', { text: 'Status' }),
              el('th', { text: 'Notice' })
            ])]),
            ctbody
          ])
        ]));
      }
    }

    async function load() {
      try {
        var res = await api('GET', 'security/dpdp');
        renderState(res);
      } catch (e) {
        toast(e.message || 'Failed to load DPDP vault', true);
      }
    }

    var saveBusy = false;
    savePolicyBtn.addEventListener('click', async function () {
      if (!isAdmin || saveBusy) return;
      saveBusy = true;
      savePolicyBtn.disabled = true;
      try {
        var res = await api('PUT', 'security/dpdp/policy', {
          dpo_name: dpoNameInp.value.trim(),
          dpo_email: dpoEmailInp.value.trim(),
          privacy_notice_version: noticeVerInp.value.trim(),
          dsar_sla_days: parseInt(slaDaysInp.value, 10),
          auto_purge_withdrawn_days: parseInt(purgeDaysInp.value, 10)
        });
        renderState(res);
        toast('DPDP Act 2023 governance policy saved');
      } catch (e) {
        toast(e.message || 'Failed to save DPDP policy', true);
      } finally {
        saveBusy = false;
        savePolicyBtn.disabled = !isAdmin;
      }
    });

    var dsarBusy = false;
    dsarAddBtn.addEventListener('click', async function () {
      if (!isAdmin || dsarBusy) return;
      dsarBusy = true;
      dsarAddBtn.disabled = true;
      try {
        await api('POST', 'security/dpdp/dsar', {
          request_type: dsarTypeSel.value,
          subject_identifier: dsarSubjInp.value.trim(),
          notes: dsarNotesInp.value.trim()
        });
        dsarSubjInp.value = '';
        dsarNotesInp.value = '';
        toast('DSAR request logged with SHA-256 subject hash');
        await load();
      } catch (e) {
        toast(e.message || 'Failed to log DSAR request', true);
      } finally {
        dsarBusy = false;
        dsarAddBtn.disabled = !isAdmin;
      }
    });

    wrap.appendChild(el('div', { class: 'cso-ops-grid-2' }, [
      el('div', { class: 'cso-ops-card' }, [
        el('h3', { text: 'DPDP Act 2023 Governance Policy' }),
        el('div', { class: 'field' }, [el('label', { text: 'Data Protection Officer Name' }), dpoNameInp]),
        el('div', { class: 'field' }, [el('label', { text: 'DPO Contact Email' }), dpoEmailInp]),
        el('div', { class: 'field' }, [el('label', { text: 'Privacy Notice Version' }), noticeVerInp]),
        el('div', { class: 'field' }, [el('label', { text: 'DSAR SLA Days (7-30)' }), slaDaysInp]),
        el('div', { class: 'field' }, [el('label', { text: 'Auto-Purge Withdrawn Consents (Days)' }), purgeDaysInp]),
        savePolicyBtn
      ]),
      el('div', { class: 'cso-ops-card' }, [
        el('h3', { text: 'Log Data Principal Rights Request (DSAR)' }),
        el('div', { class: 'field' }, [el('label', { text: 'Request Type' }), dsarTypeSel]),
        el('div', { class: 'field' }, [el('label', { text: 'Data Principal Identifier' }), dsarSubjInp]),
        el('div', { class: 'field' }, [el('label', { text: 'Verification Notes' }), dsarNotesInp]),
        dsarAddBtn
      ])
    ]));
    wrap.appendChild(el('div', { class: 'cso-ops-card' }, [
      el('h3', { text: 'DSAR Fulfillment Queue' }),
      dsarBox
    ]));
    wrap.appendChild(el('div', { class: 'cso-ops-card' }, [
      el('h3', { text: 'Consent Vault Ledger (Masked)' }),
      consentBox
    ]));

    load();
    return wrap;
  }

  function securityIncidentResponsePanel() {
    var isAdmin = Boolean(me && me.role === 'admin');
    var wrap = el('div', { class: 'cso-ops-studio' });
    var kpis = el('div', { class: 'cso-ops-kpis' });
    var packOut = el('div');
    var incBox = el('div');
    var eventsBox = el('div');

    var exportBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--primary', type: 'button', text: 'Export Signed Evidence Pack (JSON)' });
    if (!isAdmin) exportBtn.disabled = true;

    var titleInp = el('input', { class: 'input', type: 'text', placeholder: 'Incident title (min 3 chars)...' });
    var sevSel = el('select', { class: 'select' }, [
      el('option', { value: 'P1-CRITICAL', text: 'P1-CRITICAL' }),
      el('option', { value: 'P2-HIGH', text: 'P2-HIGH' }),
      el('option', { value: 'P3-MEDIUM', text: 'P3-MEDIUM' }),
      el('option', { value: 'P4-LOW', text: 'P4-LOW' })
    ]);
    var vecInp = el('input', { class: 'input', type: 'text', placeholder: 'e.g. credential-stuffing, csrf-probe' });
    var sumTa = el('textarea', { class: 'textarea', rows: '3', placeholder: 'Incident summary & impact...' });
    var openBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--danger', type: 'button', text: 'Open Security Incident' });
    if (!isAdmin) openBtn.disabled = true;

    wrap.appendChild(el('div', { class: 'cso-ops-hero' }, [
      el('div', {}, [
        el('span', { class: 'badge warn', text: 'INCIDENT & EVIDENCE STUDIO' }),
        el('h2', { text: 'Security Incident Response & Audit Snapshot Export' }),
        el('p', { class: 'muted', text: 'Track security incidents through containment and export a SHA-256 signed, DPDP-redacted compliance evidence pack.' })
      ]),
      el('div', {}, [exportBtn])
    ]));
    wrap.appendChild(kpis);
    wrap.appendChild(packOut);

    function renderState(res) {
      clear(kpis);
      clear(incBox);
      clear(eventsBox);
      var sum = (res && res.summary) || {};
      var score = Number(sum.posture_score || 100);
      kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
        el('span', { class: 'muted sm', text: 'Posture Score' }),
        el('strong', {}, [el('span', { class: 'badge ' + (score >= 85 ? 'ok' : (score >= 60 ? 'warn' : 'bad')), text: String(score) + ' / 100' })])
      ]));
      kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
        el('span', { class: 'muted sm', text: 'Open Incidents' }),
        el('strong', { text: String(sum.open_count || 0) })
      ]));
      kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
        el('span', { class: 'muted sm', text: 'Contained / Resolved' }),
        el('strong', { text: String(sum.contained_or_resolved_count || 0) })
      ]));
      kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
        el('span', { class: 'muted sm', text: 'Last Evidence SHA-256' }),
        el('strong', { text: res.last_pack_sha256 ? String(res.last_pack_sha256).slice(0, 14) + '…' : 'None yet' })
      ]));

      var items = Array.isArray(res.items) ? res.items : [];
      if (!items.length) {
        incBox.appendChild(el('div', { class: 'muted sm', text: 'No security incidents recorded.' }));
      } else {
        var tbody = el('tbody');
        items.forEach(function (it) {
          var stCls = it.status === 'resolved' || it.status === 'contained' ? 'ok' : (it.severity === 'P1-CRITICAL' ? 'bad' : 'warn');
          var actCell = el('td', { class: 'cso-ops-actions' });
          if (isAdmin && it.status !== 'resolved') {
            var nextMap = { open: 'investigating', investigating: 'contained', contained: 'resolved' };
            var lblMap = { open: 'Investigate', investigating: 'Contain', contained: 'Resolve' };
            var nextSt = nextMap[it.status] || 'resolved';
            var btn = el('button', { class: 'btn sm', type: 'button', text: lblMap[it.status] || 'Resolve' });
            btn.addEventListener('click', async function () {
              btn.disabled = true;
              try {
                await api('PATCH', 'security/incidents/' + encodeURIComponent(it.id), { status: nextSt });
                toast('Incident ' + it.id + ' -> ' + nextSt);
                await load();
              } catch (err) {
                toast(err.message || 'Failed to update incident', true);
                btn.disabled = false;
              }
            });
            actCell.appendChild(btn);
          } else {
            actCell.appendChild(el('span', { class: 'muted sm', text: it.closed_by || '—' }));
          }
          tbody.appendChild(el('tr', {}, [
            el('td', { text: it.id }),
            el('td', { text: it.title }),
            el('td', {}, [el('span', { class: 'badge ' + (it.severity === 'P1-CRITICAL' ? 'bad' : 'warn'), text: it.severity })]),
            el('td', {}, [el('span', { class: 'badge ' + stCls, text: it.status })]),
            actCell
          ]));
        });
        incBox.appendChild(el('div', { class: 'cso-ops-table-wrap' }, [
          el('table', { class: 'table' }, [
            el('thead', {}, [el('tr', {}, [
              el('th', { text: 'ID' }),
              el('th', { text: 'Title' }),
              el('th', { text: 'Severity' }),
              el('th', { text: 'Status' }),
              el('th', { text: 'Actions' })
            ])]),
            tbody
          ])
        ]));
      }

      var evs = Array.isArray(res.recent_security_events) ? res.recent_security_events : [];
      if (!evs.length) {
        eventsBox.appendChild(el('div', { class: 'muted sm', text: 'No recent security audit events.' }));
      } else {
        var etbody = el('tbody');
        evs.forEach(function (ev) {
          etbody.appendChild(el('tr', {}, [
            el('td', { text: String(ev.created_at || '').slice(0, 19).replace('T', ' ') }),
            el('td', { text: ev.action || '—' }),
            el('td', { text: ev.actor_email || ev.actor_user_id || '—' })
          ]));
        });
        eventsBox.appendChild(el('div', { class: 'cso-ops-table-wrap' }, [
          el('table', { class: 'table' }, [
            el('thead', {}, [el('tr', {}, [
              el('th', { text: 'Time' }),
              el('th', { text: 'Action' }),
              el('th', { text: 'Actor' })
            ])]),
            etbody
          ])
        ]));
      }
    }

    async function load() {
      try {
        var res = await api('GET', 'security/incidents');
        renderState(res);
      } catch (e) {
        toast(e.message || 'Failed to load security incidents', true);
      }
    }

    var exportBusy = false;
    exportBtn.addEventListener('click', async function () {
      if (!isAdmin || exportBusy) return;
      exportBusy = true;
      exportBtn.disabled = true;
      clear(packOut);
      try {
        var res = await api('POST', 'security/incidents/export-pack', {});
        var blob = new Blob([JSON.stringify(res.pack, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = res.filename || 'cso-security-evidence-pack.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        packOut.appendChild(el('div', { class: 'cso-sec-sim-result is-allow' }, [
          el('div', { class: 'cso-ops-subhead' }, [
            el('strong', { text: 'Evidence Pack Exported: ' + res.filename }),
            el('span', { class: 'badge ok', text: 'DPDP REDACTED' })
          ]),
          el('span', { class: 'muted sm', text: 'SHA-256: ' + res.pack_sha256 })
        ]));
        toast('Signed security evidence pack exported');
        await load();
      } catch (e) {
        toast(e.message || 'Evidence pack export failed', true);
      } finally {
        exportBusy = false;
        exportBtn.disabled = !isAdmin;
      }
    });

    var openBusy = false;
    openBtn.addEventListener('click', async function () {
      if (!isAdmin || openBusy) return;
      openBusy = true;
      openBtn.disabled = true;
      try {
        await api('POST', 'security/incidents', {
          title: titleInp.value.trim(),
          severity: sevSel.value,
          vector: vecInp.value.trim(),
          summary: sumTa.value.trim()
        });
        titleInp.value = '';
        vecInp.value = '';
        sumTa.value = '';
        toast('Security incident opened');
        await load();
      } catch (e) {
        toast(e.message || 'Failed to open incident', true);
      } finally {
        openBusy = false;
        openBtn.disabled = !isAdmin;
      }
    });

    wrap.appendChild(el('div', { class: 'cso-ops-grid-2' }, [
      el('div', { class: 'cso-ops-card' }, [
        el('h3', { text: 'Open Security Incident' }),
        el('div', { class: 'field' }, [el('label', { text: 'Title' }), titleInp]),
        el('div', { class: 'field' }, [el('label', { text: 'Severity' }), sevSel]),
        el('div', { class: 'field' }, [el('label', { text: 'Attack Vector / Category' }), vecInp]),
        el('div', { class: 'field' }, [el('label', { text: 'Summary' }), sumTa]),
        openBtn
      ]),
      el('div', { class: 'cso-ops-card' }, [
        el('h3', { text: 'Recent Security Audit Stream' }),
        eventsBox
      ])
    ]));
    wrap.appendChild(el('div', { class: 'cso-ops-card' }, [
      el('h3', { text: 'Security Incidents Registry' }),
      incBox
    ]));

    load();
    return wrap;
  }

  async function viewSecurity(sub) {
    if (sub === 'rbac') {
      setTitle('RBAC Hierarchy & Role Entitlements');
      main.appendChild(securityRbacHierarchyPanel());
      return;
    }
    if (sub === 'engine-guards') {
      setTitle('Publish & Mutation Permissions Guard');
      main.appendChild(securityEngineGuardsPanel());
      return;
    }
    if (sub === 'sessions') {
      setTitle('Session Lifecycle & Token Expiry');
      main.appendChild(securitySessionLifecyclePanel());
      return;
    }
    if (sub === 'turnstile' || sub === 'bot') {
      setTitle('Cloudflare Turnstile & Edge Bot Deterrence');
      main.appendChild(securityTurnstileBotPanel());
      return;
    }
    if (sub === 'audit-timeline' || sub === 'events') {
      setTitle('Visual Audit Log Timeline Explorer');
      main.appendChild(securityAuditTimelinePanel());
      return;
    }
    if (sub === 'ip-acl' || sub === 'geofence') {
      setTitle('IP Access Control Lists & Geofencing');
      main.appendChild(securityIpGeofencePanel());
      return;
    }
    if (sub === '2fa' || sub === 'totp') {
      setTitle('Two-Factor Authentication & Hardware Keys');
      main.appendChild(securityTwoFactorStudioPanel());
      return;
    }
    if (sub === 'pii' || sub === 'masking') {
      setTitle('Sensitive Field Masking & PII Redaction');
      main.appendChild(securityPiiMaskingPanel());
      return;
    }
    if (sub === 'api-keys' || sub === 'tokens') {
      setTitle('API Key Management & Token Scoping');
      main.appendChild(securityApiKeysPanel());
      return;
    }
    if (sub === 'csrf' || sub === 'origin' || sub === 'headers') {
      setTitle('CSRF Protection & Origin Integrity Headers');
      main.appendChild(securityOriginHeadersPanel());
      return;
    }
    if (sub === 'lockdown' || sub === 'maintenance') {
      setTitle('Emergency Maintenance Mode & Lockdown Dispatcher');
      main.appendChild(securityLockdownDispatcherPanel());
      return;
    }
    if (sub === 'dpdp' || sub === 'privacy' || sub === 'consent') {
      setTitle('Data Privacy, DPDP Act 2023 Compliance & Consent Vault');
      main.appendChild(securityDpdpConsentVaultPanel());
      return;
    }
    if (sub === 'incidents' || sub === 'incident-response') {
      setTitle('Security Incident Response & Audit Snapshot Export');
      main.appendChild(securityIncidentResponsePanel());
      return;
    }
    setTitle('Security');
    if (me && me.role === 'admin') main.appendChild(securityBackupPanel());
    else main.appendChild(el('div', { class: 'alert', text: 'Security settings are visible to administrators only.' }));
  }

  function fmtBytes(n) {
    var b = Number(n) || 0;
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function opsSnapshotVaultPanel(mode) {
    var titleMap = {
      vault: 'Cloudflare R2 Immutable Storage Cold Vault',
      verify: 'Snapshot Integrity Hash & Cryptographic Signature Check',
      snapshots: 'Automated Platform Snapshot & Global State Backup'
    };
    var subMap = {
      vault: 'R2 cold storage objects (cso-media › backups/snapshots/*) with SHA-256 custom metadata & D1 row count ledger.',
      verify: 'Recomputes Web Crypto SHA-256 digests over raw R2 snapshot payloads and verifies 1:1 parity with D1 & R2 metadata.',
      snapshots: 'Creates deterministic JSON snapshots via dynamic sqlite_master table discovery (with automatic credential, token, and session scrubbing), persists to Cloudflare R2, and records SHA-256 checksums.'
    };
    var heading = titleMap[mode] || titleMap.snapshots;
    var subtitle = subMap[mode] || subMap.snapshots;

    var wrap = el('div', { class: 'panel cso-ops-vault-panel' });
    wrap.appendChild(el('h2', { text: heading }));
    wrap.appendChild(el('p', { class: 'muted', text: subtitle }));

    var labelInp = el('input', {
      type: 'text',
      id: 'f-ops-snap-label',
      class: 'cso-ops-label-input',
      maxlength: '80',
      placeholder: 'Optional snapshot label (e.g., 2026-11-15-baseline)…'
    });
    var scopeSel = el('select', {
      id: 'f-ops-snap-scope',
      class: 'cso-ops-scope-select',
      'aria-label': 'Snapshot Scope'
    }, [
      el('option', { value: 'all', text: 'All Platform Tables' }),
      el('option', { value: 'content_only', text: 'Core Content Only' })
    ]);
    var createBtn = el('button', {
      type: 'button',
      class: 'btn primary',
      text: 'Create Full Platform Snapshot Now'
    });
    var refreshBtn = el('button', {
      type: 'button',
      class: 'btn',
      text: 'Refresh Vault'
    });

    if (me && me.role === 'admin') {
      var formRow = el('div', { class: 'cso-ops-create-row' }, [
        el('label', { for: 'f-ops-snap-label', class: 'cso-ops-create-label', text: 'Snapshot Label' }),
        labelInp,
        el('label', { for: 'f-ops-snap-scope', class: 'cso-ops-create-label', text: 'Scope' }),
        scopeSel,
        createBtn,
        refreshBtn
      ]);
      wrap.appendChild(formRow);
    } else {
      wrap.appendChild(el('div', { class: 'actions' }, [refreshBtn]));
    }

    var scopePreviewBox = el('div', { class: 'cso-ops-scope-preview', 'aria-live': 'polite' });
    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis' });
    var summaryBar = el('p', { class: 'hint cso-ops-vault-summary', text: 'Loading R2 snapshot vault…' });
    var searchInp = el('input', {
      type: 'search',
      id: 'f-ops-vault-search',
      class: 'cso-ops-filter-input',
      placeholder: 'Search by label or SHA-256…',
      'aria-label': 'Search snapshots by label or SHA-256'
    });
    var filterBar = el('div', { class: 'cso-ops-filter-bar cso-ops-vault-filter', role: 'group', 'aria-label': 'Filter snapshots by trigger type' });
    var tableHost = el('div', { class: 'cso-ops-vault-table-host' });
    wrap.appendChild(scopePreviewBox);
    wrap.appendChild(kpiStrip);
    wrap.appendChild(summaryBar);
    wrap.appendChild(filterBar);
    wrap.appendChild(tableHost);

    var cachedSnapshots = [];
    var cachedPreview = { discovered_tables: [], excluded_tables: [], scrubbed_columns: [] };
    var activeTriggerFilter = 'all';
    var searchQuery = '';
    var isCreatingSnapshot = false;
    var triggerOptions = [
      { id: 'all', label: 'All' },
      { id: 'manual', label: 'Manual' },
      { id: 'scheduled', label: 'Scheduled' },
      { id: 'pre_restore', label: 'Pre-Restore' }
    ];

    function normalizeTriggerType(raw) {
      return String(raw || 'manual').toLowerCase().replace(/-/g, '_');
    }

    function renderScopePreview() {
      clear(scopePreviewBox);
      var discovered = cachedPreview.discovered_tables || [];
      var excluded = cachedPreview.excluded_tables || [];
      var scrubbed = cachedPreview.scrubbed_columns || [];
      var selectedScope = scopeSel ? scopeSel.value : 'all';

      var includedTables = discovered.filter(function (t) {
        return selectedScope !== 'content_only' || t.is_core_content;
      });
      var totalIncludedRows = includedTables.reduce(function (acc, t) { return acc + (Number(t.rows) || 0); }, 0);

      var shieldText = 'DPDP Act 2023 Privacy Shield: Excludes ' +
        (excluded.length ? excluded.join(', ') : 'sessions, admin_otps, admin_rate_limits') +
        ' · Scrubs ' +
        (scrubbed.length ? scrubbed.join(', ') : 'password_hash, salt, code_hash, totp_secret');

      scopePreviewBox.appendChild(el('div', { class: 'cso-ops-scope-preview-head' }, [
        el('span', { class: 'badge published', text: 'DPDP Privacy Shield Active' }),
        el('span', { class: 'hint cso-tabular', text: includedTables.length + ' D1 table(s) · ' + totalIncludedRows + ' live row(s) in scope' })
      ]));
      scopePreviewBox.appendChild(el('p', { class: 'hint cso-ops-privacy-note', text: shieldText }));

      if (discovered.length) {
        scopePreviewBox.appendChild(el('div', { class: 'cso-ops-table-chips' }, discovered.map(function (t) {
          var activeInScope = selectedScope !== 'content_only' || t.is_core_content;
          return el('span', {
            class: 'cso-ops-table-chip' + (activeInScope ? ' is-included' : ' is-excluded'),
            title: activeInScope ? 'Included in selected scope' : 'Skipped in Core Content Only scope',
            text: t.table + ' (' + t.rows + ')'
          });
        })));
      }
    }

    async function handleCreateSnapshot(customLabel) {
      if (isCreatingSnapshot) return;
      isCreatingSnapshot = true;
      createBtn.disabled = true;
      scopeSel.disabled = true;
      labelInp.disabled = true;
      createBtn.textContent = 'Archiving Snapshot to R2…';
      try {
        var rawLabel = typeof customLabel === 'string' ? customLabel : labelInp.value;
        var r = await api('POST', 'ops/snapshots', {
          label: String(rawLabel || '').trim().slice(0, 80),
          scope: scopeSel.value || 'all'
        });
        var sn = r.snapshot || {};
        if (typeof customLabel !== 'string') labelInp.value = '';
        toast('Snapshot saved to R2 (' + fmtBytes(sn.size_bytes) + ', SHA-256 ' + String(sn.sha256 || '').slice(0, 10) + '…)');
        await loadVault();
      } catch (err) {
        toast(err.message || 'Failed to create snapshot', true);
      } finally {
        isCreatingSnapshot = false;
        createBtn.disabled = false;
        scopeSel.disabled = false;
        labelInp.disabled = false;
        createBtn.textContent = 'Create Full Platform Snapshot Now';
      }
    }

    function renderFilterBar() {
      clear(filterBar);
      filterBar.appendChild(searchInp);
      filterBar.appendChild(el('span', { class: 'muted sm', text: 'Trigger Filter:' }));
      triggerOptions.forEach(function (opt) {
        var isActive = activeTriggerFilter === opt.id;
        filterBar.appendChild(el('button', {
          type: 'button',
          class: 'btn sm' + (isActive ? ' primary' : ''),
          'aria-pressed': String(isActive),
          text: opt.label,
          onclick: function () {
            if (activeTriggerFilter === opt.id) return;
            activeTriggerFilter = opt.id;
            renderFilterBar();
            renderVaultTable();
          }
        }));
      });
    }

    function renderVaultTable() {
      clear(tableHost);
      var q = searchQuery.trim().toLowerCase();
      var filtered = cachedSnapshots.filter(function (snap) {
        if (activeTriggerFilter !== 'all' && normalizeTriggerType(snap.trigger_type) !== activeTriggerFilter) {
          return false;
        }
        if (q) {
          var hay = (String(snap.label || '') + ' ' + String(snap.sha256 || '')).toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      });

      if (!cachedSnapshots.length) {
        summaryBar.textContent = '0 R2 snapshot(s) in cold vault · Bucket: cso-media (backups/snapshots/)';
        var emptyCard = el('div', { class: 'cso-ops-empty-vault' }, [
          el('p', { class: 'muted', text: 'No platform snapshots recorded yet. Archive your first baseline snapshot to Cloudflare R2 with SHA-256 verification and DPDP credential scrubbing.' })
        ]);
        if (me && me.role === 'admin') {
          emptyCard.appendChild(el('button', {
            type: 'button',
            class: 'btn primary',
            text: 'Archive First Baseline Snapshot Now',
            onclick: function () {
              handleCreateSnapshot('Baseline Platform Snapshot');
            }
          }));
        }
        tableHost.appendChild(emptyCard);
        return;
      }

      if (activeTriggerFilter === 'all' && !q) {
        summaryBar.textContent = cachedSnapshots.length + ' R2 snapshot(s) in cold vault · Bucket: cso-media (backups/snapshots/)';
      } else {
        summaryBar.textContent = 'Showing ' + filtered.length + ' of ' + cachedSnapshots.length + ' R2 snapshot(s) · Bucket: cso-media (backups/snapshots/)';
      }

      if (!filtered.length) {
        tableHost.appendChild(el('p', { class: 'muted', text: 'No snapshots match the selected trigger filter or search query.' }));
        return;
      }

      var tb = el('tbody');
      filtered.forEach(function (snap) {
        var shaShort = snap.sha256 ? (snap.sha256.slice(0, 12) + '…' + snap.sha256.slice(-6)) : '—';
        var shaCode = el('code', { class: 'cso-ops-sha-code', title: 'SHA-256: ' + (snap.sha256 || '') + '\nR2 Key: ' + (snap.r2_key || ''), text: shaShort });
        var copyShaBtn = el('button', {
          type: 'button',
          class: 'btn sm',
          text: 'Copy SHA-256',
          disabled: !snap.sha256,
          onclick: function () {
            if (!snap.sha256) return;
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
              navigator.clipboard.writeText(snap.sha256).then(function () {
                toast('Copied SHA-256 (' + snap.sha256.slice(0, 12) + '…)');
              }).catch(function () {
                toast('Could not copy SHA-256 to clipboard', true);
              });
            } else {
              toast('Clipboard API unavailable in this browser context', true);
            }
          }
        });
        var verifyBadge = el('span', {
          class: 'badge ' + (snap.r2_exists ? 'published' : 'expired'),
          text: snap.r2_exists ? 'R2 Stored' : 'Missing in R2'
        });
        var verifyDetail = el('div', { class: 'hint cso-ops-verify-detail', hidden: true });

        var labelStrong = el('strong', { text: snap.label });
        var labelCell = el('td', {}, [
          el('div', { class: 'cso-ops-label-row' }, [labelStrong]),
          el('div', { class: 'hint cso-ops-r2key', text: snap.r2_key })
        ]);

        if (me && me.role === 'admin') {
          var renameBtn = el('button', {
            type: 'button',
            class: 'btn sm',
            text: 'Rename',
            onclick: function () {
              var editInp = el('input', {
                type: 'text',
                class: 'cso-ops-rename-input',
                maxlength: '80',
                value: snap.label,
                'aria-label': 'Edit snapshot label'
              });
              var saveBtn = el('button', { type: 'button', class: 'btn sm primary', text: 'Save' });
              var cancelBtn = el('button', { type: 'button', class: 'btn sm', text: 'Cancel' });
              var editForm = el('div', { class: 'cso-ops-rename-row' }, [editInp, saveBtn, cancelBtn]);
              var labelRow = labelCell.firstChild;
              labelRow.hidden = true;
              labelCell.insertBefore(editForm, labelRow);
              editInp.focus();
              editInp.select();

              cancelBtn.addEventListener('click', function () {
                editForm.remove();
                labelRow.hidden = false;
              });
              saveBtn.addEventListener('click', async function () {
                var nextLabel = editInp.value.trim().slice(0, 80);
                if (!nextLabel) {
                  toast('Snapshot label cannot be empty', true);
                  return;
                }
                saveBtn.disabled = true;
                saveBtn.textContent = 'Saving…';
                try {
                  var res = await api('PATCH', 'ops/snapshots/' + encodeURIComponent(snap.id), { label: nextLabel });
                  snap.label = res.label || nextLabel;
                  labelStrong.textContent = snap.label;
                  editForm.remove();
                  labelRow.hidden = false;
                  toast('Snapshot renamed to "' + snap.label + '"');
                } catch (err) {
                  toast(err.message || 'Failed to rename snapshot', true);
                  saveBtn.disabled = false;
                  saveBtn.textContent = 'Save';
                }
              });
            }
          });
          labelCell.firstChild.appendChild(renameBtn);
        }

        var verifyBtn = el('button', {
          type: 'button',
          class: 'btn sm cso-btn-forest-outline',
          text: 'Verify SHA-256',
          onclick: async function () {
            verifyBtn.disabled = true;
            verifyBtn.textContent = 'Verifying…';
            try {
              var res = await api('POST', 'ops/snapshots/' + encodeURIComponent(snap.id) + '/verify', {});
              verifyBadge.className = 'badge ' + (res.valid ? 'published' : 'expired');
              verifyBadge.textContent = res.valid ? '✓ SHA-256 Verified' : '✗ Checksum Mismatch';
              verifyDetail.hidden = false;
              verifyDetail.textContent = res.valid
                ? ('Match: ' + (res.actual_sha256 || '').slice(0, 16) + '… (' + fmtBytes(res.size_bytes) + ')')
                : ('Expected ' + (res.expected_sha256 || '').slice(0, 12) + '…, got ' + (res.actual_sha256 || res.reason || 'none'));
              toast(res.valid ? 'Snapshot integrity verified (SHA-256 match)' : 'Snapshot integrity check FAILED', !res.valid);
            } catch (err) {
              toast(err.message, true);
            }
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify SHA-256';
          }
        });

        var drillRestoreBtn = el('button', {
          type: 'button',
          class: 'btn sm',
          text: 'Drill / Restore',
          onclick: function () {
            go('operations/drill/' + encodeURIComponent(snap.id));
          }
        });

        var dlLink = el('a', {
          class: 'btn sm cso-btn-forest',
          href: '/api/admin/ops/snapshots/' + encodeURIComponent(snap.id) + '/download',
          download: 'cso-snapshot-' + snap.id + '.json',
          text: 'Download JSON'
        });

        var rowActions = [verifyBtn, drillRestoreBtn, dlLink];
        if (me && me.role === 'admin') {
          var delBtn = el('button', {
            type: 'button',
            class: 'btn sm danger',
            text: 'Delete',
            onclick: async function () {
              if (!window.confirm('Delete snapshot "' + snap.label + '" from both R2 Cold Vault and D1?')) return;
              delBtn.disabled = true;
              delBtn.textContent = 'Deleting…';
              try {
                await api('DELETE', 'ops/snapshots/' + encodeURIComponent(snap.id));
                toast('Deleted snapshot "' + snap.label + '" from R2 & D1');
                await loadVault();
              } catch (err) {
                toast(err.message || 'Failed to delete snapshot', true);
                delBtn.disabled = false;
                delBtn.textContent = 'Delete';
              }
            }
          });
          rowActions.push(delBtn);
        }

        var counts = snap.row_counts || {};
        var tableNames = Object.keys(counts).sort();
        var breakdownEl = tableNames.length
          ? el('details', { class: 'cso-ops-row-breakdown' }, [
              el('summary', { class: 'cso-ops-row-breakdown-summary', text: 'Table Row Breakdown (' + tableNames.length + ' tables)' }),
              el('ul', { class: 'cso-ops-row-breakdown-list' }, tableNames.map(function (tbl) {
                return el('li', { class: 'cso-ops-row-breakdown-item' }, [
                  el('code', { text: tbl }),
                  el('span', { class: 'cso-tabular', text: String(counts[tbl]) })
                ]);
              }))
            ])
          : null;

        tb.appendChild(el('tr', {}, [
          el('td', {}, [
            el('div', { class: 'cso-tabular', text: fmtDate(snap.created_at) }),
            el('div', { class: 'hint', text: (snap.created_by || 'staff') + ' · ' + (snap.trigger_type || 'manual') })
          ]),
          labelCell,
          el('td', {}, [
            el('strong', { class: 'cso-tabular', text: String(snap.total_rows || 0) + ' rows' }),
            breakdownEl
          ]),
          el('td', { class: 'cso-tabular', text: fmtBytes(snap.size_bytes) }),
          el('td', {}, [
            el('div', { class: 'cso-ops-sha-row' }, [shaCode, copyShaBtn]),
            el('div', { class: 'cso-ops-badge-wrap' }, [verifyBadge]),
            verifyDetail
          ]),
          el('td', {}, el('div', { class: 'actions' }, rowActions))
        ]));
      });

      tableHost.appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
        el('caption', { class: 'muted', text: 'R2 Snapshot Cold Vault & Cryptographic Checksums' }),
        el('thead', {}, el('tr', {}, ['Timestamp', 'Label & R2 Key', 'D1 Rows', 'Size', 'SHA-256 & Status', 'Actions'].map(function (h) {
          return el('th', { scope: 'col', text: h });
        }))),
        tb
      ])));
    }

    searchInp.addEventListener('input', function () {
      searchQuery = searchInp.value || '';
      renderVaultTable();
    });
    scopeSel.addEventListener('change', renderScopePreview);
    renderFilterBar();

    async function loadVault() {
      clear(tableHost);
      clear(kpiStrip);
      summaryBar.textContent = 'Loading R2 snapshot vault…';
      try {
        var d = await api('GET', 'ops/snapshots');
        cachedSnapshots = (d && d.items) || [];
        cachedPreview = {
          discovered_tables: (d && d.discovered_tables) || [],
          excluded_tables: (d && d.excluded_tables) || [],
          scrubbed_columns: (d && d.scrubbed_columns) || []
        };
        renderScopePreview();

        var totalBytes = cachedSnapshots.reduce(function (acc, it) { return acc + (Number(it.size_bytes) || 0); }, 0);
        var latestSnap = cachedSnapshots[0] || null;
        kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('div', { class: 'muted sm', text: 'Total Snapshots' }),
          el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: String(cachedSnapshots.length) })
        ]));
        kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('div', { class: 'muted sm', text: 'Total R2 Storage Size' }),
          el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: fmtBytes(totalBytes) })
        ]));
        kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('div', { class: 'muted sm', text: 'Latest Snapshot Timestamp' }),
          el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: latestSnap ? fmtDate(latestSnap.created_at) : 'None yet' })
        ]));
        renderVaultTable();
      } catch (e) {
        summaryBar.textContent = 'Snapshot vault unavailable.';
        tableHost.appendChild(el('div', { class: 'alert cso-ops-error-banner', role: 'alert' }, [
          el('span', { text: 'Could not load snapshots: ' + (e && e.message ? e.message : 'Network error') }),
          el('button', { type: 'button', class: 'btn sm', text: 'Retry', onclick: loadVault })
        ]));
      }
    }

    createBtn.addEventListener('click', function () {
      handleCreateSnapshot();
    });

    refreshBtn.addEventListener('click', loadVault);
    loadVault();
    return wrap;
  }

  var DR_RESTORABLE_TABLES = [
    ['site_settings', 'Site Settings & Broadcast Flags'],
    ['site_pages', 'Published & Draft Site Pages'],
    ['site_page_revisions', 'Page Revision History'],
    ['posts', 'Job Alerts & Current Affairs'],
    ['schemes_directory', 'Schemes & Benefits Directory'],
    ['resources', 'Syllabus & PYQ Study Resources'],
    ['media_assets', 'R2 Media Asset Ledger']
  ];

  function opsDrillAndRestorePanel(mode, preselectedId) {
    var isRestoreFocus = mode === 'restore';
    var wrap = el('div', { class: 'panel cso-ops-drill-panel' });
    wrap.appendChild(el('h2', {
      text: isRestoreFocus
        ? 'Point-in-Time Rollback & Granular Engine Restorer'
        : 'Non-Destructive Disaster Recovery Drill & Readiness Verification Studio'
    }));
    wrap.appendChild(el('p', {
      class: 'muted',
      text: isRestoreFocus
        ? 'Execute granular point-in-time table restorations from verified R2 snapshots (protected by an automatic pre-restore R2 backup).'
        : 'Verify SHA-256 snapshot integrity, detect live D1 schema drift via PRAGMA table_info, and measure exact row deltas without modifying any live D1 data.'
    }));

    var lastDrillStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-last-drill-strip', 'aria-live': 'polite' });
    var lastRestoreStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-last-drill-strip', 'aria-live': 'polite' });
    if (!isRestoreFocus) {
      wrap.appendChild(lastDrillStrip);
    } else {
      wrap.appendChild(lastRestoreStrip);
    }

    function renderLastDrillBanner(lastDrill) {
      if (isRestoreFocus) return;
      clear(lastDrillStrip);
      var hasDrill = Boolean(lastDrill && lastDrill.drilled_at);
      var statusText = hasDrill ? (lastDrill.readiness || 'PASS') : 'Not Yet Verified';
      var statusClass = hasDrill
        ? (lastDrill.readiness === 'WARN' ? 'sev-medium' : 'published')
        : 'draft';

      lastDrillStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
        el('div', { class: 'muted sm', text: 'Last Verified DR Drill' }),
        el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: hasDrill ? fmtDate(lastDrill.drilled_at) : 'Never drilled' })
      ]));
      lastDrillStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
        el('div', { class: 'muted sm', text: 'Snapshot Tested' }),
        el('div', { class: 'cso-ops-telemetry-val', text: hasDrill ? (lastDrill.snapshot_label || lastDrill.snapshot_id) : '—' })
      ]));
      lastDrillStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
        el('div', { class: 'muted sm', text: 'Measured Latency' }),
        el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: hasDrill ? ((lastDrill.latency_ms || 1) + ' ms') : '—' })
      ]));
      lastDrillStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
        el('div', { class: 'muted sm', text: 'Readiness Status' }),
        el('div', { class: 'cso-ops-telemetry-val' }, [
          el('span', { class: 'badge ' + statusClass, text: statusText })
        ])
      ]));
    }

    function renderLastRestoreBanner(lastRestore) {
      if (!isRestoreFocus) return;
      clear(lastRestoreStrip);
      var hasRestore = Boolean(lastRestore && lastRestore.restored_at);
      var safetyId = hasRestore ? lastRestore.safety_snapshot_id : '';
      var undoBtn = (hasRestore && safetyId)
        ? el('button', {
            type: 'button',
            class: 'btn sm',
            text: 'Load Safety Backup to Undo',
            onclick: function () {
              if (snapMetaMap[safetyId]) {
                snapSel.value = safetyId;
                updateShaBadge();
                toast('Loaded pre-restore safety backup (' + safetyId.slice(0, 8) + '…)');
              } else {
                populateSnapshots(safetyId);
              }
            }
          })
        : null;

      lastRestoreStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
        el('div', { class: 'muted sm', text: 'Last Restore Timestamp' }),
        el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: hasRestore ? fmtDate(lastRestore.restored_at) : 'Never restored' })
      ]));
      lastRestoreStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
        el('div', { class: 'muted sm', text: 'Restored Snapshot & Mode' }),
        el('div', { class: 'cso-ops-telemetry-val', text: hasRestore ? ((lastRestore.snapshot_label || lastRestore.snapshot_id) + ' (' + String(lastRestore.mode || 'upsert').toUpperCase() + ')') : '—' })
      ]));
      lastRestoreStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
        el('div', { class: 'muted sm', text: 'Auto-Safety Backup ID' }),
        el('div', { class: 'cso-ops-telemetry-val' }, [
          el('code', { text: safetyId ? (safetyId.slice(0, 12) + '…') : '—' }),
          undoBtn
        ])
      ]));
      lastRestoreStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
        el('div', { class: 'muted sm', text: 'Restore Status' }),
        el('div', { class: 'cso-ops-telemetry-val' }, [
          el('span', { class: 'badge ' + (hasRestore ? 'published' : 'draft'), text: hasRestore ? (lastRestore.status || 'SUCCESS') : 'Not Yet Restored' })
        ])
      ]));
    }

    var snapSel = el('select', { id: 'f-ops-drill-snap', class: 'cso-ops-snap-select', 'aria-label': 'Select target R2 snapshot' });
    var shaBadge = el('span', { class: 'badge published', text: 'SHA-256 Ready' });
    var reloadBtn = el('button', { type: 'button', class: 'btn sm', text: 'Reload List' });

    wrap.appendChild(el('div', { class: 'cso-ops-selector-bar' }, [
      el('label', { for: 'f-ops-drill-snap', class: 'cso-ops-create-label', text: 'Target R2 Snapshot:' }),
      snapSel,
      shaBadge,
      reloadBtn
    ]));

    var checkMap = {};
    var checksGrid = el('div', { class: 'cso-ops-table-checks' });
    var tableDescMap = {};
    DR_RESTORABLE_TABLES.forEach(function (pair) { tableDescMap[pair[0]] = pair[1]; });

    function renderTableCheckboxes(snap) {
      clear(checksGrid);
      checkMap = {};
      var counts = (snap && snap.row_counts) || {};
      var keys = Object.keys(counts).filter(function (k) {
        return !isRestoreFocus || (k !== 'ops_snapshots' && k !== 'users');
      }).sort();
      if (!keys.length) {
        keys = DR_RESTORABLE_TABLES.map(function (p) { return p[0]; });
      }
      keys.forEach(function (tbl) {
        var rowCount = Object.prototype.hasOwnProperty.call(counts, tbl) ? Number(counts[tbl] || 0) : null;
        var subText = rowCount !== null
          ? (rowCount + ' snapshot row' + (rowCount === 1 ? '' : 's') + (tableDescMap[tbl] ? ' · ' + tableDescMap[tbl] : ''))
          : (tableDescMap[tbl] || 'D1 Table');
        var chk = el('input', { type: 'checkbox', checked: true, 'data-table': tbl });
        checkMap[tbl] = chk;
        checksGrid.appendChild(el('label', { class: 'cso-ops-check-card' }, [
          chk,
          el('span', {}, [
            el('strong', { text: tbl }),
            el('span', { class: 'hint cso-ops-check-sub', text: subText })
          ])
        ]));
      });
    }
    renderTableCheckboxes(null);

    var selAllBtn = el('button', {
      type: 'button',
      class: 'btn sm',
      text: 'Select All',
      onclick: function () {
        Object.keys(checkMap).forEach(function (k) { checkMap[k].checked = true; });
      }
    });
    var selNoneBtn = el('button', {
      type: 'button',
      class: 'btn sm',
      text: 'Select None',
      onclick: function () {
        Object.keys(checkMap).forEach(function (k) { checkMap[k].checked = false; });
      }
    });

    wrap.appendChild(el('div', { class: 'cso-ops-checks-head' }, [
      el('strong', {
        text: isRestoreFocus
          ? 'Granular D1 Tables (Allowlisted — excludes users credentials & snapshot ledger)'
          : 'Snapshot Table Scope (Dynamic from R2 Manifest)'
      }),
      el('div', { class: 'actions' }, [selAllBtn, selNoneBtn])
    ]));
    wrap.appendChild(checksGrid);

    function selectedTables() {
      return Object.keys(checkMap).filter(function (k) { return checkMap[k].checked; });
    }

    var drillBtn = el('button', {
      type: 'button',
      class: 'btn primary',
      text: 'Run Non-Destructive DR Drill'
    });
    var drillOut = el('div', { class: 'cso-ops-drill-output' });

    if (!isRestoreFocus) {
      wrap.appendChild(el('div', { class: 'actions cso-ops-drill-actions' }, [drillBtn]));
      wrap.appendChild(drillOut);
    }

    var isRunningDrill = false;
    drillBtn.addEventListener('click', async function () {
      if (isRunningDrill) return;
      var snapId = snapSel.value;
      if (!snapId) { toast('Select a snapshot first', true); return; }
      var tbls = selectedTables();
      if (!tbls.length) { toast('Select at least one table for the DR drill', true); return; }
      isRunningDrill = true;
      drillBtn.disabled = true;
      snapSel.disabled = true;
      drillBtn.textContent = 'Running DR Drill…';
      clear(drillOut);
      try {
        var rep = await api('POST', 'ops/snapshots/' + encodeURIComponent(snapId) + '/drill', { tables: tbls });
        if (rep.last_drill) renderLastDrillBanner(rep.last_drill);

        var driftWarnings = Array.isArray(rep.schema_drift_warnings) ? rep.schema_drift_warnings : [];
        var isWarn = rep.readiness === 'WARN' || driftWarnings.length > 0;
        var kpis = el('div', { class: 'cso-ops-drill-kpis' }, [
          el('span', { class: 'badge ' + (isWarn ? 'sev-medium' : 'published'), text: 'DR Readiness: ' + (rep.readiness || 'PASS') }),
          el('span', { class: 'badge published', text: '✓ SHA-256 Verified' }),
          el('span', { class: 'cso-social-count', text: 'Latency: ' + (rep.latency_ms || 1) + ' ms' }),
          el('span', { class: 'cso-social-count', text: 'Snapshot Rows: ' + ((rep.totals && rep.totals.snapshot_rows) || 0) }),
          el('span', { class: 'cso-social-count', text: 'Live Rows: ' + ((rep.totals && rep.totals.live_rows) || 0) }),
          el('span', { class: 'cso-social-count', text: 'Drift Warnings: ' + driftWarnings.length })
        ]);
        drillOut.appendChild(kpis);

        if (driftWarnings.length) {
          drillOut.appendChild(el('details', { class: 'cso-ops-row-breakdown cso-ops-drift-details', open: true }, [
            el('summary', { class: 'cso-ops-row-breakdown-summary', text: 'Schema Drift Warnings (' + driftWarnings.length + ')' }),
            el('ul', { class: 'cso-ops-row-breakdown-list' }, driftWarnings.map(function (w) {
              return el('li', { class: 'cso-ops-row-breakdown-item' }, [
                el('code', { text: w.table }),
                el('span', { text: w.message || w.type })
              ]);
            }))
          ]));
        }

        var tb = el('tbody');
        var diffs = rep.table_diffs || {};
        (rep.tables_checked || tbls).forEach(function (tName) {
          var d = diffs[tName] || {};
          var hasSchemaDrift = d.schema_status === 'DRIFT';
          tb.appendChild(el('tr', {}, [
            el('td', {}, el('code', { text: tName })),
            el('td', {}, el('code', { text: d.primary_key || 'id' })),
            el('td', { class: 'cso-tabular', text: String(d.snapshot_rows || 0) }),
            el('td', { class: 'cso-tabular', text: String(d.live_rows || 0) }),
            el('td', { class: 'cso-tabular', text: '+' + String(d.to_insert || 0) }),
            el('td', { class: 'cso-tabular', text: '~' + String(d.to_update || 0) }),
            el('td', { class: 'cso-tabular', text: String(d.unchanged || 0) }),
            el('td', { class: 'cso-tabular', text: String(d.live_only_rows || 0) }),
            el('td', {}, el('span', {
              class: 'badge ' + (hasSchemaDrift ? 'sev-medium' : 'published'),
              text: hasSchemaDrift ? 'Schema Drift' : 'No Drift'
            }))
          ]));
        });

        drillOut.appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
          el('caption', { class: 'muted', text: 'Non-Destructive DR Drill Comparison Matrix — ' + (rep.snapshot_label || snapId) }),
          el('thead', {}, el('tr', {}, ['Table', 'PK Column', 'Snapshot Rows', 'Live Rows', 'To Insert', 'To Update', 'Unchanged', 'Live-Only', 'Schema Status'].map(function (h) {
            return el('th', { scope: 'col', text: h });
          }))),
          tb
        ])));
        toast('DR drill complete (' + (rep.latency_ms || 1) + ' ms · Readiness: ' + (rep.readiness || 'PASS') + ')');
      } catch (err) {
        drillOut.appendChild(el('div', { class: 'alert cso-ops-error-banner', role: 'alert' }, [
          el('span', { text: 'DR Drill failed: ' + err.message }),
          el('button', { type: 'button', class: 'btn sm', text: 'Retry', onclick: function () { drillBtn.click(); } })
        ]));
        toast(err.message, true);
      } finally {
        isRunningDrill = false;
        drillBtn.disabled = false;
        snapSel.disabled = false;
        drillBtn.textContent = 'Run Non-Destructive DR Drill';
      }
    });

    var restoreOut = el('div', { class: 'cso-ops-restore-output' });
    if (isRestoreFocus) {
      if (me && me.role === 'admin') {
        var restoreBox = el('div', { class: 'cso-ops-restore-box' });
        restoreBox.appendChild(el('h3', { text: 'Granular Point-in-Time Restore Engine' }));
        restoreBox.appendChild(el('p', {
          class: 'hint',
          text: 'Safety Guard: Before modifying any live D1 table, the engine automatically archives an "Auto-Pre-Restore Safety Backup" snapshot to R2 and scrubs credential columns (password_hash, salt, code_hash, totp_secret).'
        }));

        var modeSel = el('select', { id: 'f-ops-restore-mode', class: 'cso-ops-mode-select' }, [
          el('option', { value: 'upsert', text: 'Upsert / Merge (INSERT OR REPLACE — preserves newer live-only rows)' }),
          el('option', { value: 'replace', text: 'Full Table Replace (DELETE + INSERT — exact point-in-time table state)' })
        ]);
        var replaceWarn = el('div', {
          class: 'alert cso-ops-replace-warn',
          role: 'alert',
          hidden: true,
          text: 'Warning: Full Table Replace will DELETE all live-only rows in the selected tables after archiving an automatic R2 pre-restore safety snapshot.'
        });
        modeSel.addEventListener('change', function () {
          replaceWarn.hidden = modeSel.value !== 'replace';
        });

        var confirmInp = el('input', {
          type: 'text',
          id: 'f-ops-restore-confirm',
          class: 'cso-ops-confirm-input',
          placeholder: 'Type RESTORE to confirm',
          autocomplete: 'off',
          spellcheck: 'false'
        });
        var previewBtn = el('button', {
          type: 'button',
          class: 'btn',
          text: 'Preview Restore Impact'
        });
        var restoreBtn = el('button', {
          type: 'button',
          class: 'btn danger',
          text: 'Execute Granular Restore'
        });
        var restorePreviewOut = el('div', { class: 'cso-ops-drill-output' });

        restoreBox.appendChild(el('div', { class: 'cso-ops-restore-controls' }, [
          el('div', { class: 'cso-ops-restore-field' }, [
            el('label', { for: 'f-ops-restore-mode', text: 'Restore Mode' }),
            modeSel
          ]),
          el('div', { class: 'cso-ops-restore-field' }, [
            el('label', { for: 'f-ops-restore-confirm', text: 'Safety Confirmation (type RESTORE)' }),
            confirmInp
          ]),
          previewBtn,
          restoreBtn
        ]));
        restoreBox.appendChild(replaceWarn);
        restoreBox.appendChild(restorePreviewOut);
        restoreBox.appendChild(restoreOut);
        wrap.appendChild(restoreBox);

        var isPreviewingRestore = false;
        var isRestoring = false;

        previewBtn.addEventListener('click', async function () {
          if (isPreviewingRestore || isRestoring) return;
          var snapId = snapSel.value;
          if (!snapId) { toast('Select a target snapshot first', true); return; }
          var tbls = selectedTables();
          if (!tbls.length) { toast('Select at least one table to preview', true); return; }
          isPreviewingRestore = true;
          previewBtn.disabled = true;
          previewBtn.textContent = 'Previewing Impact…';
          clear(restorePreviewOut);
          try {
            var rep = await api('POST', 'ops/snapshots/' + encodeURIComponent(snapId) + '/drill', { tables: tbls });
            var tb = el('tbody');
            var diffs = rep.table_diffs || {};
            (rep.tables_checked || tbls).forEach(function (tName) {
              var d = diffs[tName] || {};
              var hasDrift = d.schema_status === 'DRIFT';
              tb.appendChild(el('tr', {}, [
                el('td', {}, el('code', { text: tName })),
                el('td', {}, el('code', { text: d.primary_key || 'id' })),
                el('td', { class: 'cso-tabular', text: String(d.snapshot_rows || 0) }),
                el('td', { class: 'cso-tabular', text: String(d.live_rows || 0) }),
                el('td', { class: 'cso-tabular', text: '+' + String(d.to_insert || 0) }),
                el('td', { class: 'cso-tabular', text: '~' + String(d.to_update || 0) }),
                el('td', { class: 'cso-tabular', text: String(d.live_only_rows || 0) }),
                el('td', {}, el('span', {
                  class: 'badge ' + (hasDrift ? 'sev-medium' : 'published'),
                  text: hasDrift ? 'Schema Drift' : 'No Drift'
                }))
              ]));
            });
            restorePreviewOut.appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
              el('caption', { class: 'muted', text: 'Non-Destructive Pre-Restore Impact Preview — ' + (rep.snapshot_label || snapId) }),
              el('thead', {}, el('tr', {}, ['Table', 'PK Column', 'Snapshot Rows', 'Live Rows', 'To Insert', 'To Update', 'Live-Only', 'Schema Status'].map(function (h) {
                return el('th', { scope: 'col', text: h });
              }))),
              tb
            ])));
            toast('Impact preview ready (' + (rep.latency_ms || 1) + ' ms)');
          } catch (err) {
            restorePreviewOut.appendChild(el('div', { class: 'alert cso-ops-error-banner', role: 'alert' }, [
              el('span', { text: 'Preview failed: ' + err.message }),
              el('button', { type: 'button', class: 'btn sm', text: 'Retry', onclick: function () { previewBtn.click(); } })
            ]));
            toast(err.message, true);
          } finally {
            isPreviewingRestore = false;
            previewBtn.disabled = false;
            previewBtn.textContent = 'Preview Restore Impact';
          }
        });

        restoreBtn.addEventListener('click', async function () {
          if (isRestoring) return;
          var snapId = snapSel.value;
          if (!snapId) { toast('Select a target snapshot first', true); return; }
          var tbls = selectedTables();
          if (!tbls.length) { toast('Select at least one table to restore', true); return; }
          if (confirmInp.value.trim() !== 'RESTORE') {
            toast('Type RESTORE in the confirmation box to proceed', true);
            confirmInp.focus();
            return;
          }
          isRestoring = true;
          restoreBtn.disabled = true;
          previewBtn.disabled = true;
          modeSel.disabled = true;
          confirmInp.disabled = true;
          snapSel.disabled = true;
          restoreBtn.textContent = 'Creating Safety Backup & Restoring…';
          clear(restoreOut);
          try {
            var res = await api('POST', 'ops/snapshots/' + encodeURIComponent(snapId) + '/restore', {
              tables: tbls,
              mode: modeSel.value,
              confirm_phrase: confirmInp.value.trim()
            });
            confirmInp.value = '';
            if (res.last_restore) renderLastRestoreBanner(res.last_restore);

            restoreOut.appendChild(el('div', {
              class: 'alert ok',
              text: '✓ Restore complete! Pre-restore safety backup: ' + res.safety_snapshot_id + ' · Latency: ' + (res.latency_ms || 1) + ' ms'
            }));

            var receiptTb = el('tbody');
            var summaryMap = res.row_summary || {};
            Object.keys(summaryMap).forEach(function (tbl) {
              var info = summaryMap[tbl] || {};
              var skipped = Array.isArray(info.columns_skipped) && info.columns_skipped.length
                ? info.columns_skipped.join(', ')
                : 'None';
              receiptTb.appendChild(el('tr', {}, [
                el('td', {}, el('code', { text: String(res.safety_snapshot_id || '').slice(0, 12) + '…' })),
                el('td', {}, el('code', { text: tbl })),
                el('td', { text: String(info.mode || res.mode || 'upsert') }),
                el('td', { class: 'cso-tabular', text: String(info.rows_restored !== undefined ? info.rows_restored : (info.restored_rows || 0)) }),
                el('td', { text: skipped }),
                el('td', { class: 'cso-tabular', text: String(res.latency_ms || 1) + ' ms' })
              ]));
            });
            restoreOut.appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
              el('caption', { class: 'muted', text: 'Post-Restore Execution Receipt' }),
              el('thead', {}, el('tr', {}, ['Safety Backup ID', 'Table', 'Mode', 'Rows Restored', 'Skipped Columns', 'Latency (ms)'].map(function (h) {
                return el('th', { scope: 'col', text: h });
              }))),
              receiptTb
            ])));

            toast('Point-in-time restore succeeded (Safety backup: ' + String(res.safety_snapshot_id).slice(0, 8) + '…)');
            await populateSnapshots(snapId);
          } catch (err) {
            restoreOut.appendChild(el('div', { class: 'alert cso-ops-error-banner', role: 'alert' }, [
              el('span', { text: 'Restore aborted: ' + err.message }),
              el('button', { type: 'button', class: 'btn sm', text: 'Retry', onclick: function () { restoreBtn.click(); } })
            ]));
            toast(err.message, true);
          } finally {
            isRestoring = false;
            restoreBtn.disabled = false;
            previewBtn.disabled = false;
            modeSel.disabled = false;
            confirmInp.disabled = false;
            snapSel.disabled = false;
            restoreBtn.textContent = 'Execute Granular Restore';
          }
        });
      } else {
        wrap.appendChild(el('div', { class: 'alert', text: 'Administrator privileges are required to execute point-in-time state restorations.' }));
      }
    }

    var snapMetaMap = {};
    function updateShaBadge() {
      var cur = snapMetaMap[snapSel.value];
      renderTableCheckboxes(cur || null);
      if (!cur) {
        shaBadge.textContent = 'No Snapshot Selected';
        shaBadge.className = 'badge expired';
        return;
      }
      shaBadge.className = 'badge ' + (cur.r2_exists ? 'published' : 'expired');
      shaBadge.textContent = 'SHA-256: ' + String(cur.sha256 || '').slice(0, 12) + '… (' + fmtBytes(cur.size_bytes) + ')';
    }
    snapSel.addEventListener('change', updateShaBadge);

    async function populateSnapshots(preferId) {
      clear(snapSel);
      snapMetaMap = {};
      var activeOut = isRestoreFocus ? restoreOut : drillOut;
      try {
        var d = await api('GET', 'ops/snapshots');
        if (!isRestoreFocus) {
          renderLastDrillBanner(d && d.last_drill ? d.last_drill : null);
        } else {
          renderLastRestoreBanner(d && d.last_restore ? d.last_restore : null);
        }
        var items = (d && d.items) || [];
        if (!items.length) {
          snapSel.appendChild(el('option', { value: '', text: 'No snapshots in R2 vault — create one first' }));
          updateShaBadge();
          clear(activeOut);
          var emptyBox = el('div', { class: 'cso-ops-empty-vault' }, [
            el('p', {
              class: 'muted',
              text: isRestoreFocus
                ? 'No R2 snapshots exist yet. Create a baseline snapshot before executing a point-in-time restore.'
                : 'No R2 snapshots exist yet. Create a baseline snapshot to run a non-destructive Disaster Recovery drill.'
            })
          ]);
          if (me && me.role === 'admin') {
            var quickSnapBtn = el('button', {
              type: 'button',
              class: 'btn primary',
              text: 'Create Baseline Snapshot Now',
              onclick: async function () {
                quickSnapBtn.disabled = true;
                quickSnapBtn.textContent = 'Creating Baseline Snapshot…';
                try {
                  var res = await api('POST', 'ops/snapshots', { label: 'Baseline Snapshot', scope: 'all' });
                  var newId = res && res.snapshot ? res.snapshot.id : '';
                  toast('Baseline snapshot created (' + fmtBytes(res && res.snapshot ? res.snapshot.size_bytes : 0) + ')');
                  await populateSnapshots(newId);
                } catch (err) {
                  toast(err.message || 'Failed to create baseline snapshot', true);
                  quickSnapBtn.disabled = false;
                  quickSnapBtn.textContent = 'Create Baseline Snapshot Now';
                }
              }
            });
            emptyBox.appendChild(quickSnapBtn);
          }
          activeOut.appendChild(emptyBox);
          return;
        }
        items.forEach(function (it) {
          snapMetaMap[it.id] = it;
          var lbl = fmtDate(it.created_at) + ' — ' + it.label + ' (' + (it.total_rows || 0) + ' rows · ' + String(it.sha256 || '').slice(0, 8) + '…)';
          snapSel.appendChild(el('option', { value: it.id, text: lbl, selected: preferId && it.id === preferId }));
        });
        if (preferId && snapMetaMap[preferId]) snapSel.value = preferId;
        updateShaBadge();
      } catch (e) {
        snapSel.appendChild(el('option', { value: '', text: 'Error loading snapshots: ' + e.message }));
        updateShaBadge();
        clear(activeOut);
        activeOut.appendChild(el('div', { class: 'alert cso-ops-error-banner', role: 'alert' }, [
          el('span', { text: 'Could not load R2 snapshots: ' + (e && e.message ? e.message : 'Network error') }),
          el('button', { type: 'button', class: 'btn sm', text: 'Retry', onclick: function () { populateSnapshots(preferId); } })
        ]));
      }
    }

    reloadBtn.addEventListener('click', function () { populateSnapshots(snapSel.value); });
    populateSnapshots(preselectedId);
    return wrap;
  }

  /* ---------- Folder 17: Sentinel, Read-Only Freeze & Edge Cache Studio (Modules #7, #9, #12, #15) ---------- */
  function opsSentinelFreezeCachePanel(focusMode) {
    var isAdmin = me && me.role === 'admin';
    var headingMap = {
      freeze: 'Emergency Read-Only Freeze & Outage Fallback Mode',
      cache: 'Edge Cache State Preservation & Warmer Daemon',
      health: 'Multi-Region Failover Sentinel & Health Heartbeat',
      canary: 'Zero-Downtime Deployment & Rolling Canary Health'
    };
    var wrap = el('div', { class: 'panel cso-ops-sentinel-panel' }, [
      el('h2', { text: headingMap[focusMode] || 'Sentinel, Read-Only Freeze & Edge Cache Studio' }),
      el('p', {
        class: 'muted',
        text: 'Real-time D1 + R2 health probes, Cloudflare edge colo telemetry, rolling canary inspection, edge cache warmer/purger, and instant read-only lockdown.'
      })
    ]);

    /* 1. Emergency Read-Only Freeze Switch (Module #12) */
    var freezeState = { enabled: false, reason: '', activated_by: null, activated_at: null };
    var freezeBanner = el('div', { class: 'alert ok cso-ops-freeze-banner', text: 'Checking platform write-lock state…' });
    var reasonInput = el('input', {
      type: 'text',
      class: 'cso-ops-freeze-input',
      maxLength: '240',
      placeholder: 'Outage / maintenance reason (e.g. D1 schema migration window — read-only mode)'
    });
    var freezeBtn = el('button', {
      type: 'button',
      class: 'btn danger',
      disabled: !isAdmin,
      text: 'Activate Read-Only Freeze',
      onclick: async function () {
        if (!isAdmin) return;
        var nextEnabled = !freezeState.enabled;
        freezeBtn.disabled = true;
        freezeBtn.textContent = nextEnabled ? 'Activating Freeze…' : 'Lifting Freeze…';
        try {
          var res = await api('POST', 'ops/freeze', {
            enabled: nextEnabled,
            reason: (reasonInput.value || '').trim(),
            confirm: nextEnabled ? 'FREEZE' : 'UNFREEZE'
          });
          applyFreezeUi(res.freeze || { enabled: nextEnabled, reason: reasonInput.value });
          toast(nextEnabled ? 'Emergency Read-Only Freeze ACTIVATED (503 on public/editor writes)' : 'Read-Only Freeze lifted — live writes restored');
          runHealthProbe();
        } catch (err) {
          toast(err.message || 'Failed to toggle freeze mode', true);
          freezeBtn.disabled = false;
          applyFreezeUi(freezeState);
        }
      }
    });

    function applyFreezeUi(st) {
      freezeState = st || { enabled: false, reason: '' };
      if (freezeState.enabled) {
        freezeBanner.className = 'alert cso-ops-freeze-banner is-frozen';
        freezeBanner.textContent = 'FROZEN — READ-ONLY LOCKDOWN · Public & editor writes blocked with HTTP 503 (' +
          (freezeState.reason || 'Emergency maintenance') + ')' +
          (freezeState.activated_by ? ' · by ' + freezeState.activated_by : '');
        if (!reasonInput.value && freezeState.reason) reasonInput.value = freezeState.reason;
        freezeBtn.className = 'btn primary';
        freezeBtn.textContent = 'Lift Freeze & Restore Live Writes';
      } else {
        freezeBanner.className = 'alert ok cso-ops-freeze-banner';
        freezeBanner.textContent = 'ACTIVE — LIVE WRITES · All public and editorial endpoints accepting normal traffic.';
        freezeBtn.className = 'btn danger';
        freezeBtn.textContent = 'Activate Read-Only Freeze';
      }
      freezeBtn.disabled = !isAdmin;
    }

    var freezeBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: '1. Emergency Read-Only Freeze Switch (Module #12)' }),
        el('span', { class: 'muted sm', text: 'Allowlists /api/admin/login, /api/admin/auth/*, /api/admin/ops/*, and /api/admin/session' })
      ]),
      freezeBanner,
      el('div', { class: 'cso-ops-freeze-controls' }, [
        reasonInput,
        freezeBtn
      ])
    ]);
    if (focusMode !== 'canary') wrap.appendChild(freezeBox);

    /* 2. Live Health & Rolling Canary Telemetry Cards (Modules #9 & #15) */
    var probeGrid = el('div', { class: 'cso-ops-telemetry-grid' });
    var probeBtn = el('button', {
      type: 'button',
      class: 'btn sm primary',
      text: 'Run Live Health & Canary Probe',
      onclick: function () { runHealthProbe(true); }
    });
    var healthBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: '2. Multi-Region Failover Sentinel & Rolling Canary Health (Modules #9 & #15)' }),
        probeBtn
      ]),
      probeGrid
    ]);
    wrap.appendChild(healthBox);

    async function runHealthProbe(showToast) {
      probeBtn.disabled = true;
      probeBtn.textContent = 'Probing Edge, D1 & R2…';
      try {
        var h = await api('GET', 'ops/health');
        if (h && h.freeze) applyFreezeUi(h.freeze);
        clear(probeGrid);
        var d1 = h.d1 || {};
        var r2 = h.r2 || {};
        var edge = h.edge || {};
        var can = h.canary || {};
        var counts = d1.counts || {};
        var statusCls = h.status === 'HEALTHY' ? 'published' : (h.status === 'FROZEN' ? 'scheduled' : 'expired');

        probeGrid.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('div', { class: 'muted sm', text: 'Platform & Canary Status' }),
          el('div', { class: 'cso-ops-telemetry-val' }, [
            el('span', { class: 'badge ' + statusCls, text: h.status || 'UNKNOWN' }),
            el('span', { class: 'muted sm cso-tabular', text: ' ' + (h.total_latency_ms || 1) + ' ms total' })
          ]),
          el('div', { class: 'muted sm cso-ops-mono', text: 'SW: ' + (can.sw_cache_name || 'v26') + ' (' + (can.sw_status || 'READY') + ')' })
        ]));

        probeGrid.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('div', { class: 'muted sm', text: 'Cloudflare D1 Primary' }),
          el('div', { class: 'cso-ops-telemetry-val' }, [
            el('span', { class: 'badge ' + (d1.status === 'UP' ? 'published' : 'expired'), text: d1.status || 'DOWN' }),
            el('span', { class: 'cso-tabular', text: ' ' + (d1.latency_ms || 0) + ' ms' })
          ]),
          el('div', { class: 'muted sm cso-tabular', text: 'Posts: ' + (counts.posts || 0) + ' · Schemes: ' + (counts.schemes || 0) + ' · Snaps: ' + (counts.snapshots || 0) })
        ]));

        probeGrid.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('div', { class: 'muted sm', text: 'Cloudflare R2 Cold Vault' }),
          el('div', { class: 'cso-ops-telemetry-val' }, [
            el('span', { class: 'badge ' + (r2.status === 'UP' ? 'published' : 'expired'), text: r2.status || 'DOWN' }),
            el('span', { class: 'cso-tabular', text: ' ' + (r2.latency_ms || 0) + ' ms' })
          ]),
          el('div', { class: 'muted sm cso-ops-mono', text: 'Bucket: ' + (r2.bucket || 'cso-media') })
        ]));

        probeGrid.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('div', { class: 'muted sm', text: 'Edge Data Center (request.cf)' }),
          el('div', { class: 'cso-ops-telemetry-val' }, [
            el('code', { class: 'cso-ops-sha-code', text: (edge.colo || 'LOCAL') + ' · ' + (edge.country || 'IN') })
          ]),
          el('div', { class: 'muted sm cso-ops-mono', text: (edge.httpProtocol || 'HTTP/2') + ' · ' + (edge.tlsVersion || 'TLSv1.3') })
        ]));

        if (showToast) toast('Health & Canary probe complete (' + h.status + ' · D1 ' + d1.latency_ms + 'ms · R2 ' + r2.latency_ms + 'ms)');
      } catch (err) {
        clear(probeGrid).appendChild(el('div', { class: 'alert', text: err.message || 'Health probe failed' }));
      }
      probeBtn.disabled = false;
      probeBtn.textContent = 'Run Live Health & Canary Probe';
    }

    /* 3. Edge Cache State Preservation & Warmer / Purger Panel (Module #7) */
    var cacheResultHost = el('div');
    var warmBtn = el('button', {
      type: 'button',
      class: 'btn primary',
      disabled: !isAdmin,
      text: 'Warm Core Routes',
      onclick: function () { runCacheAction('warm'); }
    });
    var purgeBtn = el('button', {
      type: 'button',
      class: 'btn',
      disabled: !isAdmin,
      text: 'Purge Edge Cache',
      onclick: function () { runCacheAction('purge'); }
    });

    async function runCacheAction(act) {
      warmBtn.disabled = true;
      purgeBtn.disabled = true;
      if (act === 'warm') warmBtn.textContent = 'Warming Edge Cache…';
      else purgeBtn.textContent = 'Purging Edge Cache…';
      clear(cacheResultHost).appendChild(el('p', { class: 'muted', text: (act === 'warm' ? 'Pre-fetching and populating edge cache' : 'Evicting canonical routes from caches.default') + '…' }));
      try {
        var res = await api('POST', 'ops/cache', { action: act });
        clear(cacheResultHost);
        var summaryTxt = act === 'warm'
          ? ('Warmed ' + (res.warmed_count || 0) + ' of ' + (res.routes ? res.routes.length : 0) + ' core routes in ' + (res.total_latency_ms || 1) + ' ms.')
          : ('Purged edge cache entries across ' + (res.routes ? res.routes.length : 0) + ' core routes (' + (res.purged_count || 0) + ' active entries evicted) in ' + (res.total_latency_ms || 1) + ' ms.');
        cacheResultHost.appendChild(el('div', { class: 'alert ok', text: summaryTxt }));
        var tb = el('tbody');
        (res.routes || []).forEach(function (r) {
          var okStatus = r.status >= 200 && r.status < 400;
          var stateBadge = act === 'warm'
            ? el('span', { class: 'badge ' + (r.cached ? 'published' : 'scheduled'), text: r.cached ? 'WARMED' : 'FETCHED' })
            : el('span', { class: 'badge ' + (r.evicted ? 'published' : 'draft'), text: r.evicted ? 'EVICTED' : 'CLEAN' });
          tb.appendChild(el('tr', {}, [
            el('td', {}, el('code', { class: 'cso-ops-r2key', text: r.route })),
            el('td', {}, el('span', { class: 'badge ' + (okStatus ? 'published' : 'expired'), text: 'HTTP ' + r.status })),
            el('td', {}, stateBadge),
            el('td', { class: 'cso-tabular', text: (r.latency_ms || 1) + ' ms' })
          ]));
        });
        cacheResultHost.appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
          el('thead', {}, el('tr', {}, ['Canonical Route', 'HTTP Status', 'Edge Cache State', 'Latency'].map(function (h) { return el('th', { scope: 'col', text: h }); }))),
          tb
        ])));
        toast(summaryTxt);
      } catch (err) {
        clear(cacheResultHost).appendChild(el('div', { class: 'alert', text: err.message || 'Edge cache operation failed' }));
        toast(err.message || 'Edge cache operation failed', true);
      }
      warmBtn.disabled = !isAdmin;
      purgeBtn.disabled = !isAdmin;
      warmBtn.textContent = 'Warm Core Routes';
      purgeBtn.textContent = 'Purge Edge Cache';
    }

    var cacheBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: '3. Edge Cache State Preservation & Warmer Daemon (Module #7)' }),
        el('div', { class: 'actions' }, [warmBtn, purgeBtn])
      ]),
      el('p', { class: 'muted sm', text: 'Target routes: /, /jobs-careers/, /schemes-benefits/, /study-library/, /api/posts?limit=20, /api/schemes?limit=20' }),
      cacheResultHost
    ]);
    if (focusMode !== 'canary') wrap.appendChild(cacheBox);

    runHealthProbe(false);
    return wrap;
  }

  /* ---------- Folder 17: Schema Journal, Vacuum, Forensics & Retention Studio (Modules #6, #11, #13, #14) ---------- */
  function opsSchemaVacuumForensicsPanel(focusMode) {
    var isAdmin = me && me.role === 'admin';
    var headingMap = {
      schema: 'Database Migration Version & DDL Schema Journal',
      vacuum: 'Dead-Letter Message Vacuum & Retention Expiry Purge',
      forensics: 'Post-Incident Forensic Audit & State Diff Inspector',
      retention: 'Automated Daily Backup Schedule & Retention Policy'
    };
    var wrap = el('div', { class: 'panel cso-ops-hygiene-panel' }, [
      el('h2', { text: headingMap[focusMode] || 'Schema Journal, Vacuum, Forensics & Retention Studio' }),
      el('p', {
        class: 'muted',
        text: 'Inspect live sqlite_master DDL and SHA-256 schema fingerprints, vacuum expired tokens/revisions, inspect field-level audit diffs, and configure automated Cron backup retention.'
      })
    ]);

    /* 1. Database Migration Version & DDL Schema Journal (Module #6) */
    var schemaHost = el('div', {}, el('p', { class: 'muted sm', text: 'Loading live D1 schema journal…' }));
    var refreshSchemaBtn = el('button', {
      type: 'button',
      class: 'btn sm',
      text: 'Refresh DDL Journal',
      onclick: function () { loadSchemaJournal(true); }
    });
    var schemaBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: '1. Database Migration Version & DDL Schema Journal (Module #6)' }),
        refreshSchemaBtn
      ]),
      schemaHost
    ]);
    if (!focusMode || focusMode === 'schema') wrap.appendChild(schemaBox);

    async function loadSchemaJournal(showToast) {
      refreshSchemaBtn.disabled = true;
      refreshSchemaBtn.textContent = 'Inspecting…';
      try {
        var s = await api('GET', 'ops/schema');
        clear(schemaHost);
        schemaHost.appendChild(el('div', { class: 'cso-ops-drill-kpis' }, [
          el('span', { class: 'badge published', text: (s.table_count || 0) + ' Tables · ' + (s.index_count || 0) + ' Indexes' }),
          el('span', { class: 'muted sm cso-tabular', text: 'Total Rows: ' + (s.total_rows || 0) + ' · Migrations: ' + ((s.migrations && s.migrations.length) || 0) }),
          el('code', { class: 'cso-ops-sha-code', title: s.schema_sha256 || '', text: 'Schema SHA-256: ' + String(s.schema_sha256 || '').slice(0, 20) + '…' })
        ]));

        var ddlList = el('div', { class: 'cso-ops-ddl-list' });
        (s.tables || []).forEach(function (tbl) {
          var det = el('details', { class: 'cso-ops-ddl-details' }, [
            el('summary', { class: 'cso-ops-ddl-summary' }, [
              el('code', { class: 'cso-ops-r2key', text: tbl.name }),
              el('span', { class: 'muted sm cso-tabular', text: (tbl.column_count || 0) + ' cols · ' + (tbl.row_count || 0) + ' rows' })
            ]),
            el('pre', { class: 'cso-ops-ddl-pre', text: tbl.ddl_sql || '-- No DDL SQL available' })
          ]);
          ddlList.appendChild(det);
        });
        schemaHost.appendChild(ddlList);
        if (showToast) toast('DDL Schema fingerprint verified (' + (s.table_count || 0) + ' tables)');
      } catch (err) {
        clear(schemaHost).appendChild(el('div', { class: 'alert', text: err.message || 'Failed to inspect schema' }));
      }
      refreshSchemaBtn.disabled = false;
      refreshSchemaBtn.textContent = 'Refresh DDL Journal';
    }

    /* 2. Dead-Letter Message Vacuum & Retention Expiry Purge (Module #11) */
    var trimRevChk = el('input', { type: 'checkbox', checked: 'checked' });
    var vacuumResultHost = el('div');
    var dryVacuumBtn = el('button', {
      type: 'button',
      class: 'btn',
      disabled: !isAdmin,
      text: 'Preview Vacuum (Dry Run)',
      onclick: function () { executeVacuum(true); }
    });
    var runVacuumBtn = el('button', {
      type: 'button',
      class: 'btn primary',
      disabled: !isAdmin,
      text: 'Execute Purge Now',
      onclick: function () { executeVacuum(false); }
    });

    async function executeVacuum(isDry) {
      dryVacuumBtn.disabled = true;
      runVacuumBtn.disabled = true;
      if (isDry) dryVacuumBtn.textContent = 'Scanning…';
      else runVacuumBtn.textContent = 'Purging…';
      try {
        var res = await api('POST', 'ops/vacuum', {
          dry_run: isDry,
          trim_revisions: Boolean(trimRevChk.checked),
          revision_keep_limit: 25
        });
        clear(vacuumResultHost);
        var t = res.tables || {};
        var bannerMsg = (isDry ? 'Dry-Run Vacuum Preview: ' : 'Dead-Letter Vacuum Complete: ') +
          (res.total_reclaimed || 0) + (isDry ? ' stale row(s) eligible for purge.' : ' stale row(s) permanently reclaimed.');
        vacuumResultHost.appendChild(el('div', { class: 'alert ok', text: bannerMsg }));
        var tb = el('tbody');
        [
          ['admin_otps', 'Expired / Stale Admin 2FA OTPs (>24h)', t.admin_otps || 0],
          ['sessions', 'Expired Authentication Sessions', t.sessions || 0],
          ['admin_rate_limits', 'Stale Fixed-Window Rate Limits (>24h)', t.admin_rate_limits || 0],
          ['site_page_revisions', 'Excess Page Revisions (>25 per route)', t.site_page_revisions || 0]
        ].forEach(function (row) {
          tb.appendChild(el('tr', {}, [
            el('td', {}, el('code', { class: 'cso-ops-r2key', text: row[0] })),
            el('td', { text: row[1] }),
            el('td', {}, el('span', { class: 'badge ' + (row[2] > 0 ? 'scheduled' : 'published'), text: isDry ? 'ELIGIBLE' : 'RECLAIMED' })),
            el('td', { class: 'cso-tabular', text: String(row[2]) })
          ]));
        });
        vacuumResultHost.appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
          el('thead', {}, el('tr', {}, ['Table', 'Retention Target', 'Mode', 'Rows'].map(function (h) { return el('th', { scope: 'col', text: h }); }))),
          tb
        ])));
        toast(bannerMsg);
      } catch (err) {
        clear(vacuumResultHost).appendChild(el('div', { class: 'alert', text: err.message || 'Vacuum failed' }));
        toast(err.message || 'Vacuum failed', true);
      }
      dryVacuumBtn.disabled = !isAdmin;
      runVacuumBtn.disabled = !isAdmin;
      dryVacuumBtn.textContent = 'Preview Vacuum (Dry Run)';
      runVacuumBtn.textContent = 'Execute Purge Now';
    }

    var vacuumBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: '2. Dead-Letter Message Vacuum & Retention Expiry Purge (Module #11)' }),
        el('div', { class: 'actions' }, [dryVacuumBtn, runVacuumBtn])
      ]),
      el('label', { class: 'cso-ops-inline-check' }, [
        trimRevChk,
        el('span', { text: 'Trim excess site_page_revisions beyond newest 25 revisions per page' })
      ]),
      vacuumResultHost
    ]);
    if (!focusMode || focusMode === 'vacuum') wrap.appendChild(vacuumBox);

    /* 3. Post-Incident Forensic Audit & State Diff Inspector (Module #13) */
    var actionFilterInput = el('input', {
      type: 'text',
      class: 'cso-ops-filter-input',
      placeholder: 'Filter by action prefix (e.g. ops., user., page.)'
    });
    var actorFilterInput = el('input', {
      type: 'text',
      class: 'cso-ops-filter-input',
      placeholder: 'Filter by actor email or ID'
    });
    var forensicsBtn = el('button', {
      type: 'button',
      class: 'btn sm primary',
      text: 'Inspect Forensics',
      onclick: function () { loadForensics(true); }
    });
    var forensicsHost = el('div', {}, el('p', { class: 'muted sm', text: 'Loading forensic audit trail…' }));

    function formatDiffSummary(diff) {
      if (!diff) return el('span', { class: 'muted sm', text: '—' });
      var lines = [];
      (diff.added || []).forEach(function (a) {
        lines.push('+ ' + a.field + ': ' + JSON.stringify(a.after));
      });
      (diff.modified || []).forEach(function (m) {
        lines.push('~ ' + m.field + ': ' + JSON.stringify(m.before) + ' → ' + JSON.stringify(m.after));
      });
      (diff.removed || []).forEach(function (r) {
        lines.push('- ' + r.field + ': ' + JSON.stringify(r.before));
      });
      if (!lines.length && diff.payload_fields && diff.payload_fields.length) {
        diff.payload_fields.forEach(function (p) {
          lines.push('• ' + p.field + ': ' + JSON.stringify(p.value));
        });
      }
      if (!lines.length) return el('span', { class: 'muted sm', text: 'No field mutations' });
      return el('pre', { class: 'cso-ops-diff-pre', text: lines.join('\n') });
    }

    async function loadForensics(showToast) {
      forensicsBtn.disabled = true;
      forensicsBtn.textContent = 'Loading…';
      try {
        var qs = '?limit=25';
        if ((actionFilterInput.value || '').trim()) qs += '&action=' + encodeURIComponent(actionFilterInput.value.trim());
        if ((actorFilterInput.value || '').trim()) qs += '&actor=' + encodeURIComponent(actorFilterInput.value.trim());
        var res = await api('GET', 'ops/forensics' + qs);
        clear(forensicsHost);
        var items = res.items || [];
        if (!items.length) {
          forensicsHost.appendChild(el('p', { class: 'muted sm', text: 'No matching audit_log entries found.' }));
        } else {
          var tb = el('tbody');
          items.forEach(function (item) {
            tb.appendChild(el('tr', {}, [
              el('td', { class: 'muted sm cso-tabular', text: fmtDate(item.created_at) }),
              el('td', {}, el('code', { class: 'cso-ops-sha-code', text: item.action })),
              el('td', { class: 'sm', text: item.actor_email || 'system' }),
              el('td', { class: 'muted sm', text: (item.target_type || '—') + (item.target_id ? ' (' + item.target_id + ')' : '') }),
              el('td', {}, formatDiffSummary(item.diff))
            ]));
          });
          forensicsHost.appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
            el('thead', {}, el('tr', {}, ['Timestamp', 'Action', 'Actor', 'Target', 'Forensic State Diff / Payload'].map(function (h) { return el('th', { scope: 'col', text: h }); }))),
            tb
          ])));
        }
        if (showToast) toast('Loaded ' + items.length + ' forensic audit entries');
      } catch (err) {
        clear(forensicsHost).appendChild(el('div', { class: 'alert', text: err.message || 'Failed to load forensic audit' }));
      }
      forensicsBtn.disabled = false;
      forensicsBtn.textContent = 'Inspect Forensics';
    }

    var forensicsBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: '3. Post-Incident Forensic Audit & State Diff Inspector (Module #13)' }),
        el('div', { class: 'cso-ops-filter-bar' }, [actionFilterInput, actorFilterInput, forensicsBtn])
      ]),
      forensicsHost
    ]);
    if (!focusMode || focusMode === 'forensics') wrap.appendChild(forensicsBox);

    /* 4. Automated Daily Backup Schedule & Retention Policy (Module #14) */
    var policyEnabledChk = el('input', { type: 'checkbox' });
    var intervalSel = el('select', { class: 'cso-ops-policy-select' }, [
      el('option', { value: '6', text: 'Every 6 Hours' }),
      el('option', { value: '12', text: 'Every 12 Hours' }),
      el('option', { value: '24', text: 'Every 24 Hours (Daily)' })
    ]);
    var maxSnapsSel = el('select', { class: 'cso-ops-policy-select' }, [
      el('option', { value: '14', text: '14 Scheduled Snapshots' }),
      el('option', { value: '30', text: '30 Scheduled Snapshots' }),
      el('option', { value: '60', text: '60 Scheduled Snapshots' })
    ]);
    var maxAgeInput = el('input', {
      type: 'number',
      class: 'cso-ops-policy-age',
      min: '1',
      max: '365',
      value: '30'
    });
    var policyStatusText = el('div', { class: 'muted sm', text: 'Loading backup retention policy…' });
    var savePolicyBtn = el('button', {
      type: 'button',
      class: 'btn',
      disabled: !isAdmin,
      text: 'Save Retention Policy',
      onclick: function () { submitRetentionPolicy(false); }
    });
    var runPolicyBtn = el('button', {
      type: 'button',
      class: 'btn primary',
      disabled: !isAdmin,
      text: 'Run Policy Now',
      onclick: function () { submitRetentionPolicy(true); }
    });

    function applyPolicyUi(p) {
      if (!p) return;
      policyEnabledChk.checked = Boolean(p.enabled);
      intervalSel.value = String(p.interval_hours || 24);
      if (!intervalSel.value) intervalSel.value = '24';
      maxSnapsSel.value = String(p.max_snapshots || 30);
      if (!maxSnapsSel.value) maxSnapsSel.value = '30';
      maxAgeInput.value = String(p.max_age_days || 30);
      policyStatusText.textContent = 'Status: ' + (p.enabled ? 'ENABLED' : 'DISABLED') +
        ' · Interval: ' + (p.interval_hours || 24) + 'h' +
        ' · Max Scheduled Snapshots: ' + (p.max_snapshots || 30) +
        ' · Max Age: ' + (p.max_age_days || 30) + 'd' +
        (p.last_auto_snapshot_at ? (' · Last Auto-Backup: ' + fmtDate(p.last_auto_snapshot_at)) : ' · Last Auto-Backup: Never');
    }

    async function loadRetentionPolicy() {
      try {
        var res = await api('GET', 'ops/retention');
        if (res && res.policy) applyPolicyUi(res.policy);
      } catch (err) {
        policyStatusText.textContent = 'Could not load retention policy: ' + (err.message || 'error');
      }
    }

    async function submitRetentionPolicy(runNow) {
      savePolicyBtn.disabled = true;
      runPolicyBtn.disabled = true;
      if (runNow) runPolicyBtn.textContent = 'Running Policy…';
      else savePolicyBtn.textContent = 'Saving…';
      try {
        var res = await api('POST', 'ops/retention', {
          enabled: Boolean(policyEnabledChk.checked),
          interval_hours: Number(intervalSel.value) || 24,
          max_snapshots: Number(maxSnapsSel.value) || 30,
          max_age_days: Number(maxAgeInput.value) || 30,
          run_now: Boolean(runNow)
        });
        if (res && res.policy) applyPolicyUi(res.policy);
        if (runNow) {
          toast('Scheduled backup policy executed (Snapshot: ' + ((res.created_snapshot && res.created_snapshot.id) || 'created') + ' · Pruned: ' + (res.pruned_count || 0) + ')');
        } else {
          toast('Automated backup schedule & retention policy saved');
        }
      } catch (err) {
        toast(err.message || 'Failed to update retention policy', true);
      }
      savePolicyBtn.disabled = !isAdmin;
      runPolicyBtn.disabled = !isAdmin;
      savePolicyBtn.textContent = 'Save Retention Policy';
      runPolicyBtn.textContent = 'Run Policy Now';
    }

    var retentionBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: '4. Automated Daily Backup Schedule & Retention Policy (Module #14)' }),
        el('div', { class: 'actions' }, [savePolicyBtn, runPolicyBtn])
      ]),
      policyStatusText,
      el('div', { class: 'cso-ops-restore-controls' }, [
        el('label', { class: 'cso-ops-inline-check' }, [
          policyEnabledChk,
          el('span', { text: 'Enable automatic Cron R2 snapshots' })
        ]),
        el('div', { class: 'cso-ops-restore-field' }, [
          el('label', { class: 'muted sm', text: 'Backup Interval' }),
          intervalSel
        ]),
        el('div', { class: 'cso-ops-restore-field' }, [
          el('label', { class: 'muted sm', text: 'Max Retained Snapshots' }),
          maxSnapsSel
        ]),
        el('div', { class: 'cso-ops-restore-field' }, [
          el('label', { class: 'muted sm', text: 'Max Retention Age (Days)' }),
          maxAgeInput
        ])
      ])
    ]);
    if (!focusMode || focusMode === 'retention') wrap.appendChild(retentionBox);

    loadSchemaJournal(false);
    loadForensics(false);
    loadRetentionPolicy();
    return wrap;
  }

  /* ---------- Folder 17: D1 Replica Switchover, Air-Gapped Bundle & DR Runbook Studio (Modules #4, #8, #16) ---------- */
  function opsContinuityAirgapRunbookPanel(focusMode) {
    var isAdmin = me && me.role === 'admin';
    var isReplicaOnly = focusMode === 'replica';
    var headingMap = {
      replica: 'Cloudflare D1 Distributed Replica & Read-Replication Switchover Studio',
      airgap: 'Offline Air-Gapped Manifest & ZIP Bundle Packager',
      runbooks: 'Disaster Recovery Playbook, SOP & Runbook Studio'
    };
    var subText = isReplicaOnly
      ? 'Inspect live D1 read/write round-trip latency, sequential session bookmark consistency, R2 warm-standby snapshot age, dry-run routing impact, and audited switchover history.'
      : 'D1 read-replica routing & latency telemetry, cryptographically signed offline air-gapped DR bundles, and interactive SOP runbook checklists.';
    var wrap = el('div', { class: 'panel cso-ops-continuity-panel' }, [
      el('h2', { text: headingMap[focusMode] || 'Continuity, Air-Gap Bundle & DR Runbook Studio' }),
      el('p', { class: 'muted', text: subText })
    ]);

    /* 1. Cloudflare D1 Distributed Replica & Read-Routing Telemetry (Module #4) */
    var MODE_LABELS = {
      auto_edge_replica: 'Auto Edge Read-Replica',
      primary_only: 'Primary-Only Strict Consistency',
      pinned_region: 'Pinned Edge Region'
    };
    var d1TelemetryGrid = el('div', { class: 'cso-ops-telemetry-grid', 'aria-live': 'polite' });
    var replicaPreviewHost = el('div', { class: 'cso-ops-drill-output' });
    var replicaHistoryHost = el('div', { class: 'cso-ops-drill-output' });

    var routingModeSel = el('select', { id: 'f-ops-replica-mode', class: 'cso-ops-policy-select' }, [
      el('option', { value: 'auto_edge_replica', text: 'Auto Edge Read-Replica (Global Sequential Bookmarks)' }),
      el('option', { value: 'primary_only', text: 'Primary-Only Strict Consistency (Strong Leader Reads)' }),
      el('option', { value: 'pinned_region', text: 'Pinned Edge Region (Regional Replica Hint)' })
    ]);
    var regionHintSel = el('select', { id: 'f-ops-replica-region', class: 'cso-ops-policy-select' }, [
      el('option', { value: 'APAC', text: 'APAC — Asia Pacific / India' }),
      el('option', { value: 'WEUR', text: 'WEUR — Western Europe' }),
      el('option', { value: 'ENAM', text: 'ENAM — Eastern North America' }),
      el('option', { value: 'WNAM', text: 'WNAM — Western North America' }),
      el('option', { value: 'ME', text: 'ME — Middle East' }),
      el('option', { value: 'AFR', text: 'AFR — Africa' }),
      el('option', { value: 'EEUR', text: 'EEUR — Eastern Europe' }),
      el('option', { value: 'OC', text: 'OC — Oceania' })
    ]);
    var thresholdInput = el('input', {
      type: 'number',
      id: 'f-ops-replica-threshold',
      class: 'cso-ops-policy-age',
      min: '25',
      max: '5000',
      value: '250'
    });
    var switchConfirmInp = el('input', {
      type: 'text',
      id: 'f-ops-replica-confirm',
      class: 'cso-ops-confirm-input',
      placeholder: 'Type SWITCHOVER to confirm',
      autocomplete: 'off',
      spellcheck: 'false'
    });
    var probeBtn = el('button', {
      type: 'button',
      class: 'btn sm',
      text: 'Run Live Latency & Consistency Probe'
    });
    var dryRunBtn = el('button', {
      type: 'button',
      class: 'btn',
      disabled: !isAdmin,
      text: 'Preview Switchover Impact (Dry Run)'
    });
    var saveRoutingBtn = el('button', {
      type: 'button',
      class: 'btn primary',
      disabled: !isAdmin,
      text: 'Commit Live Routing Switchover'
    });

    function renderD1Telemetry(rep) {
      clear(d1TelemetryGrid);
      clear(replicaHistoryHost);
      var tel = (rep && rep.telemetry) || {};
      var pol = (rep && rep.routing_policy) || {};
      var lastSw = pol.last_switchover || null;
      if (pol.mode) routingModeSel.value = pol.mode;
      if (pol.region) regionHintSel.value = pol.region;
      if (pol.failover_threshold_ms) thresholdInput.value = String(pol.failover_threshold_ms);

      var modeBadgeText = MODE_LABELS[pol.mode] || pol.mode || 'Auto Edge Read-Replica';
      var snapAgeText = tel.snapshot_age_minutes !== null && tel.snapshot_age_minutes !== undefined
        ? ('R2 Standby Age: ' + tel.snapshot_age_minutes + 'm')
        : 'R2 Standby: No snapshot yet';

      d1TelemetryGrid.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
        el('div', { class: 'muted sm', text: 'Active Routing Mode & Sync' }),
        el('div', { class: 'cso-ops-telemetry-val' }, [
          el('span', { class: 'badge ' + (tel.replica_status === 'SYNCHRONIZED' ? 'published' : 'scheduled'), text: modeBadgeText })
        ]),
        el('div', { class: 'muted sm cso-ops-mono', text: (tel.replica_status || 'SYNCHRONIZED') + ' · ' + snapAgeText })
      ]));

      d1TelemetryGrid.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
        el('div', { class: 'muted sm', text: 'Measured D1 Query Latency' }),
        el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: 'Read: ' + (tel.read_latency_ms || 1) + ' ms · Write: ' + (tel.write_latency_ms || 1) + ' ms' }),
        el('div', { class: 'muted sm cso-tabular', text: (tel.table_count || 0) + ' D1 tables · Threshold: ' + (pol.failover_threshold_ms || 250) + ' ms' })
      ]));

      d1TelemetryGrid.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
        el('div', { class: 'muted sm', text: 'Region & Bookmark Consistency' }),
        el('div', { class: 'cso-ops-telemetry-val' }, [
          el('code', { class: 'cso-ops-sha-code', text: (pol.region || 'APAC') + ' · Edge ' + (tel.edge_colo || 'LOCAL') })
        ]),
        el('div', { class: 'muted sm', text: tel.consistency_posture || pol.consistency_posture || 'Sequential Session Bookmarks' })
      ]));

      d1TelemetryGrid.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
        el('div', { class: 'muted sm', text: 'Last Switchover & Actor' }),
        el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: lastSw && lastSw.switched_at ? fmtDate(lastSw.switched_at) : 'Default baseline' }),
        el('div', { class: 'muted sm', text: lastSw && lastSw.actor ? ('By ' + lastSw.actor + ' → ' + (MODE_LABELS[lastSw.new_mode] || lastSw.new_mode)) : 'No switchover recorded yet' })
      ]));

      var hist = Array.isArray(rep && rep.switchover_history) ? rep.switchover_history : [];
      if (hist.length) {
        var hTb = el('tbody');
        hist.forEach(function (h) {
          hTb.appendChild(el('tr', {}, [
            el('td', { class: 'cso-tabular', text: fmtDate(h.created_at) }),
            el('td', { text: h.actor || 'admin' }),
            el('td', {}, el('code', { text: h.previous_mode || '—' })),
            el('td', {}, el('code', { text: h.new_mode || '—' })),
            el('td', {}, el('code', { text: h.region || 'APAC' })),
            el('td', { class: 'cso-tabular', text: h.latency_ms ? (h.latency_ms + ' ms') : '—' })
          ]));
        });
        replicaHistoryHost.appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
          el('caption', { class: 'muted', text: 'D1 Replica Switchover History & Audit Log' }),
          el('thead', {}, el('tr', {}, ['Timestamp', 'Actor', 'Previous Mode', 'New Mode', 'Region Hint', 'Latency'].map(function (col) {
            return el('th', { scope: 'col', text: col });
          }))),
          hTb
        ])));
      } else {
        replicaHistoryHost.appendChild(el('p', { class: 'muted sm', text: 'No live switchover events recorded in audit_log yet.' }));
      }
    }

    var isProbingReplica = false;
    var isSwitchingReplica = false;

    async function loadD1Telemetry(showToast) {
      if (isProbingReplica) return;
      isProbingReplica = true;
      probeBtn.disabled = true;
      probeBtn.textContent = 'Probing D1…';
      try {
        var rep = await api('GET', 'ops/replica-switchover');
        renderD1Telemetry(rep);
        if (showToast) toast('D1 probe complete (Read: ' + (rep.telemetry && rep.telemetry.read_latency_ms || 1) + ' ms)');
      } catch (err) {
        clear(d1TelemetryGrid).appendChild(el('div', { class: 'alert cso-ops-error-banner', role: 'alert' }, [
          el('span', { text: err.message || 'Failed to inspect D1 replica telemetry' }),
          el('button', { type: 'button', class: 'btn sm', text: 'Retry', onclick: function () { loadD1Telemetry(false); } })
        ]));
      } finally {
        isProbingReplica = false;
        probeBtn.disabled = false;
        probeBtn.textContent = 'Run Live Latency & Consistency Probe';
      }
    }

    async function runDryRunPreview() {
      if (isSwitchingReplica || !isAdmin) return;
      dryRunBtn.disabled = true;
      dryRunBtn.textContent = 'Simulating Switchover…';
      clear(replicaPreviewHost);
      try {
        var res = await api('POST', 'ops/replica-switchover', {
          mode: routingModeSel.value,
          region: regionHintSel.value,
          failover_threshold_ms: Number(thresholdInput.value) || 250,
          dry_run: true
        });
        var pv = res.preview || {};
        replicaPreviewHost.appendChild(el('div', { class: 'cso-ops-scope-preview' }, [
          el('div', { class: 'cso-ops-scope-preview-head' }, [
            el('span', { class: 'badge scheduled', text: 'Dry-Run Simulation (No Live Changes)' }),
            el('span', { class: 'hint cso-tabular', text: 'Measured Read: ' + (pv.measured_read_latency_ms || 1) + ' ms · Write: ' + (pv.measured_write_latency_ms || 1) + ' ms' })
          ]),
          el('p', { class: 'cso-ops-privacy-note', text: 'Proposed: ' + (MODE_LABELS[pv.proposed_mode] || pv.proposed_mode) + ' (' + (pv.proposed_region || 'APAC') + ') · Consistency: ' + (pv.consistency_posture || '') }),
          el('p', { class: 'hint cso-ops-privacy-note', text: 'Read Tradeoff: ' + (pv.expected_read_impact || '') + ' · Write Path: ' + (pv.expected_write_impact || '') })
        ]));
        toast('Dry-run switchover preview ready');
      } catch (err) {
        replicaPreviewHost.appendChild(el('div', { class: 'alert cso-ops-error-banner', role: 'alert' }, [
          el('span', { text: 'Dry-run failed: ' + (err.message || 'Request failed') }),
          el('button', { type: 'button', class: 'btn sm', text: 'Retry', onclick: runDryRunPreview })
        ]));
        toast(err.message || 'Dry-run preview failed', true);
      } finally {
        dryRunBtn.disabled = !isAdmin;
        dryRunBtn.textContent = 'Preview Switchover Impact (Dry Run)';
      }
    }

    async function commitLiveSwitchover() {
      if (isSwitchingReplica || !isAdmin) return;
      if (switchConfirmInp.value.trim() !== 'SWITCHOVER') {
        toast('Type SWITCHOVER in the confirmation field to commit live routing changes', true);
        switchConfirmInp.focus();
        return;
      }
      isSwitchingReplica = true;
      saveRoutingBtn.disabled = true;
      dryRunBtn.disabled = true;
      routingModeSel.disabled = true;
      regionHintSel.disabled = true;
      thresholdInput.disabled = true;
      switchConfirmInp.disabled = true;
      saveRoutingBtn.textContent = 'Switching & Probing D1…';
      try {
        var rep = await api('POST', 'ops/replica-switchover', {
          mode: routingModeSel.value,
          region: regionHintSel.value,
          failover_threshold_ms: Number(thresholdInput.value) || 250,
          auto_switchover: true,
          confirm: switchConfirmInp.value.trim()
        });
        switchConfirmInp.value = '';
        clear(replicaPreviewHost);
        renderD1Telemetry(rep);
        toast('D1 routing switched to ' + (MODE_LABELS[routingModeSel.value] || routingModeSel.value) + ' (' + regionHintSel.value + ')');
      } catch (err) {
        toast(err.message || 'Failed to update D1 routing policy', true);
      } finally {
        isSwitchingReplica = false;
        saveRoutingBtn.disabled = !isAdmin;
        dryRunBtn.disabled = !isAdmin;
        routingModeSel.disabled = false;
        regionHintSel.disabled = false;
        thresholdInput.disabled = false;
        switchConfirmInp.disabled = false;
        saveRoutingBtn.textContent = 'Commit Live Routing Switchover';
      }
    }

    probeBtn.addEventListener('click', function () { loadD1Telemetry(true); });
    dryRunBtn.addEventListener('click', runDryRunPreview);
    saveRoutingBtn.addEventListener('click', commitLiveSwitchover);

    var replicaBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'Cloudflare D1 Distributed Replica Switchover & Live Telemetry' }),
        probeBtn
      ]),
      d1TelemetryGrid,
      el('div', { class: 'cso-ops-restore-controls' }, [
        el('div', { class: 'cso-ops-restore-field' }, [
          el('label', { for: 'f-ops-replica-mode', class: 'muted sm', text: 'Routing Mode' }),
          routingModeSel
        ]),
        el('div', { class: 'cso-ops-restore-field' }, [
          el('label', { for: 'f-ops-replica-region', class: 'muted sm', text: 'Region Hint' }),
          regionHintSel
        ]),
        el('div', { class: 'cso-ops-restore-field' }, [
          el('label', { for: 'f-ops-replica-threshold', class: 'muted sm', text: 'Failover Threshold (ms)' }),
          thresholdInput
        ]),
        el('div', { class: 'cso-ops-restore-field' }, [
          el('label', { for: 'f-ops-replica-confirm', class: 'muted sm', text: 'Confirmation (type SWITCHOVER)' }),
          switchConfirmInp
        ]),
        dryRunBtn,
        saveRoutingBtn
      ]),
      replicaPreviewHost,
      replicaHistoryHost
    ]);
    wrap.appendChild(replicaBox);

    if (isReplicaOnly) {
      loadD1Telemetry(false);
      return wrap;
    }

    /* 2. Offline Air-Gapped Manifest & Signed Bundle Packager (Module #8) */
    var airgapSummaryHost = el('div', {}, el('p', { class: 'muted sm', text: 'Calculating live air-gapped DR bundle manifest…' }));
    var downloadAirgapBtn = el('button', {
      type: 'button',
      class: 'btn primary',
      disabled: !isAdmin,
      text: 'Download Signed Air-Gapped DR Bundle',
      onclick: async function () {
        downloadAirgapBtn.disabled = true;
        downloadAirgapBtn.textContent = 'Packaging Signed Bundle…';
        try {
          var r = await fetch('/api/admin/ops/airgap-bundle', { method: 'GET', credentials: 'same-origin' });
          if (!r.ok) {
            var errBody = await r.json().catch(function () { return {}; });
            throw new Error((errBody && errBody.message) || ('HTTP ' + r.status));
          }
          var blob = await r.blob();
          var objUrl = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = objUrl;
          a.download = 'cso-airgap-bundle-' + new Date().toISOString().slice(0, 10) + '.cso-bundle.json';
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(function () { URL.revokeObjectURL(objUrl); }, 1500);
          toast('Signed Air-Gapped DR Bundle downloaded');
          loadAirgapSummary();
        } catch (err) {
          toast(err.message || 'Failed to export air-gapped bundle', true);
        }
        downloadAirgapBtn.disabled = !isAdmin;
        downloadAirgapBtn.textContent = 'Download Signed Air-Gapped DR Bundle';
      }
    });

    async function loadAirgapSummary() {
      if (!isAdmin) {
        clear(airgapSummaryHost).appendChild(el('p', { class: 'muted sm', text: 'Super Administrator role required to inspect or export air-gapped recovery bundles.' }));
        return;
      }
      try {
        var res = await api('GET', 'ops/airgap-bundle?summary=1');
        var m = (res && res.manifest) || {};
        clear(airgapSummaryHost).appendChild(el('div', { class: 'cso-ops-drill-kpis' }, [
          el('span', { class: 'badge published', text: (m.bundle_format || 'cso.airgap.dr.bundle.v1') + ' (' + (m.bundle_version || 'v27') + ')' }),
          el('span', { class: 'muted sm cso-tabular', text: (m.table_count || 8) + ' tables · ' + (m.total_rows || 0) + ' rows · ' + (m.runbook_count || 0) + ' SOP runbooks' }),
          el('code', { class: 'cso-ops-sha-code', title: m.payload_sha256 || '', text: 'Payload SHA-256: ' + String(m.payload_sha256 || '').slice(0, 18) + '…' }),
          el('code', { class: 'cso-ops-sha-code', title: m.schema_sha256 || '', text: 'Schema SHA-256: ' + String(m.schema_sha256 || '').slice(0, 18) + '…' })
        ]));
      } catch (err) {
        clear(airgapSummaryHost).appendChild(el('div', { class: 'alert', text: err.message || 'Could not compute air-gap bundle summary' }));
      }
    }

    var airgapBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: '2. Offline Air-Gapped Manifest & Signed Bundle Packager (Module #8)' }),
        downloadAirgapBtn
      ]),
      el('p', { class: 'muted sm', text: 'Exports a single cryptographically signed .cso-bundle.json containing all non-sensitive D1 tables, DDL schema SHA-256, migration manifest, R2 snapshot inventory, and SOP runbooks.' }),
      airgapSummaryHost
    ]);
    wrap.appendChild(airgapBox);

    /* 3. Disaster Recovery Playbook, SOP & Runbook Studio (Module #16) */
    var runbookListHost = el('div', { class: 'cso-ops-runbook-grid' });
    var rbIdInput = el('input', { type: 'text', class: 'cso-ops-rb-id', placeholder: 'ID (e.g. SOP-05)' });
    var rbTitleInput = el('input', { type: 'text', class: 'cso-ops-rb-title', placeholder: 'Runbook Title (e.g. SOP-05: R2 Bucket Failover Drill)' });
    var rbSevSel = el('select', { class: 'cso-ops-rb-sev' }, [
      el('option', { value: 'CRITICAL', text: 'CRITICAL' }),
      el('option', { value: 'HIGH', text: 'HIGH' }),
      el('option', { value: 'MEDIUM', text: 'MEDIUM' }),
      el('option', { value: 'LOW', text: 'LOW' })
    ]);
    var rbRtoInput = el('input', { type: 'number', class: 'cso-ops-policy-age', min: '0', max: '10080', value: '10', title: 'RTO (Minutes)' });
    var rbRpoInput = el('input', { type: 'number', class: 'cso-ops-policy-age', min: '0', max: '10080', value: '15', title: 'RPO (Minutes)' });
    var rbStepsArea = el('textarea', {
      class: 'cso-ops-rb-steps',
      rows: '4',
      placeholder: 'Enter one SOP checklist step per line…'
    });
    var saveRbBtn = el('button', {
      type: 'button',
      class: 'btn primary',
      disabled: !isAdmin,
      text: 'Save SOP Runbook',
      onclick: async function () {
        var title = (rbTitleInput.value || '').trim();
        var lines = (rbStepsArea.value || '').split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
        if (!title || !lines.length) {
          toast('Provide a runbook title and at least one checklist step', true);
          return;
        }
        saveRbBtn.disabled = true;
        saveRbBtn.textContent = 'Saving…';
        try {
          await api('POST', 'ops/runbooks', {
            id: (rbIdInput.value || '').trim(),
            title: title,
            severity: rbSevSel.value,
            rto_minutes: Number(rbRtoInput.value) || 10,
            rpo_minutes: Number(rbRpoInput.value) || 15,
            steps: lines
          });
          toast('SOP Runbook saved');
          rbIdInput.value = '';
          rbTitleInput.value = '';
          rbStepsArea.value = '';
          await loadRunbooks();
        } catch (err) {
          toast(err.message || 'Failed to save runbook', true);
        }
        saveRbBtn.disabled = !isAdmin;
        saveRbBtn.textContent = 'Save SOP Runbook';
      }
    });

    async function loadRunbooks() {
      try {
        var res = await api('GET', 'ops/runbooks');
        clear(runbookListHost);
        (res.items || []).forEach(function (rb) {
          var sevCls = rb.severity === 'CRITICAL' ? 'expired' : (rb.severity === 'HIGH' ? 'scheduled' : 'published');
          var stepChecks = [];
          var stepListEl = el('div', { class: 'cso-ops-rb-checklist' });
          (rb.steps || []).forEach(function (st, idx) {
            var chk = el('input', { type: 'checkbox' });
            chk.checked = Boolean(st.done);
            stepChecks.push({ chk: chk, text: st.step });
            stepListEl.appendChild(el('label', { class: 'cso-ops-rb-step' }, [
              chk,
              el('span', { text: (idx + 1) + '. ' + st.step })
            ]));
          });

          var drillBtn = el('button', {
            type: 'button',
            class: 'btn sm primary',
            disabled: !isAdmin,
            text: 'Mark Drill Completed',
            onclick: async function () {
              drillBtn.disabled = true;
              drillBtn.textContent = 'Recording Drill…';
              try {
                var updatedSteps = stepChecks.map(function (sc) {
                  return { step: sc.text, done: true };
                });
                await api('POST', 'ops/runbooks/' + encodeURIComponent(rb.id) + '/drill', {
                  mark_drilled: true,
                  steps: updatedSteps
                });
                toast('Recorded DR drill completion for ' + rb.id);
                await loadRunbooks();
              } catch (err) {
                toast(err.message || 'Could not record drill completion', true);
                drillBtn.disabled = !isAdmin;
                drillBtn.textContent = 'Mark Drill Completed';
              }
            }
          });

          var editBtn = el('button', {
            type: 'button',
            class: 'btn sm',
            disabled: !isAdmin,
            text: 'Load into Editor',
            onclick: function () {
              rbIdInput.value = rb.id;
              rbTitleInput.value = rb.title;
              rbSevSel.value = rb.severity || 'HIGH';
              rbRtoInput.value = String(rb.rto_minutes || 5);
              rbRpoInput.value = String(rb.rpo_minutes || 0);
              rbStepsArea.value = (rb.steps || []).map(function (s) { return s.step; }).join('\n');
              rbTitleInput.focus();
            }
          });

          runbookListHost.appendChild(el('div', { class: 'cso-ops-rb-card' }, [
            el('div', { class: 'cso-ops-subhead' }, [
              el('strong', { text: rb.title }),
              el('div', { class: 'actions' }, [
                el('span', { class: 'badge ' + sevCls, text: rb.severity }),
                el('span', { class: 'badge draft cso-tabular', text: 'RTO ' + rb.rto_minutes + 'm · RPO ' + rb.rpo_minutes + 'm' })
              ])
            ]),
            stepListEl,
            el('div', { class: 'cso-ops-subhead cso-ops-rb-foot' }, [
              el('span', {
                class: 'muted sm cso-tabular',
                text: rb.last_drilled_at ? ('Last Drilled: ' + fmtDate(rb.last_drilled_at) + (rb.updated_by ? ' by ' + rb.updated_by : '')) : 'Not drilled yet'
              }),
              el('div', { class: 'actions' }, [editBtn, drillBtn])
            ])
          ]));
        });
      } catch (err) {
        clear(runbookListHost).appendChild(el('div', { class: 'alert', text: err.message || 'Failed to load DR runbooks' }));
      }
    }

    var runbookEditor = el('div', { class: 'cso-ops-rb-editor' }, [
      el('strong', { class: 'sm', text: 'Create or Update SOP Runbook' }),
      el('div', { class: 'cso-ops-restore-controls' }, [
        rbIdInput,
        rbTitleInput,
        rbSevSel,
        el('label', { class: 'muted sm', text: 'RTO (m):' }),
        rbRtoInput,
        el('label', { class: 'muted sm', text: 'RPO (m):' }),
        rbRpoInput
      ]),
      rbStepsArea,
      el('div', { class: 'actions' }, [saveRbBtn])
    ]);

    var runbooksBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: '3. Disaster Recovery Playbook, SOP & Runbook Studio (Module #16)' })
      ]),
      runbookListHost,
      runbookEditor
    ]);
    wrap.appendChild(runbooksBox);

    loadD1Telemetry();
    loadAirgapSummary();
    loadRunbooks();
    return wrap;
  }

  /* ---------- Folder 17: Module #5 Cloudflare R2 Immutable Storage & Cold Vault ---------- */
  function opsR2ColdVaultPanel() {
    var isAdmin = me && me.role === 'admin';
    var wrap = el('div', { class: 'panel cso-ops-vault-panel' }, [
      el('h2', { text: 'Cloudflare R2 Immutable Storage & Cold Vault' }),
      el('p', {
        class: 'muted',
        text: 'Seal platform snapshots with WORM immutability locks (DPDP Act 2023 audit retention), verify live R2 blob parity against D1, and reconcile unindexed orphan objects.'
      })
    ]);

    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis', 'aria-live': 'polite' });
    var snapSel = el('select', { id: 'f-ops-r2-lock-snap', class: 'cso-ops-snap-select', 'aria-label': 'Select snapshot to lock' });
    var lockDaysSel = el('select', { id: 'f-ops-r2-lock-days', class: 'cso-ops-policy-select', 'aria-label': 'Lock duration' }, [
      el('option', { value: '7', text: '7 Days' }),
      el('option', { value: '30', text: '30 Days', selected: true }),
      el('option', { value: '90', text: '90 Days' }),
      el('option', { value: '180', text: '180 Days' }),
      el('option', { value: '365', text: '1 Year (365 Days)' }),
      el('option', { value: '1095', text: '3 Years — Audit Archive (1095 Days)' })
    ]);
    var applyLockBtn = el('button', {
      type: 'button',
      class: 'btn primary',
      disabled: !isAdmin,
      text: 'Apply WORM Immutability Lock'
    });
    var refreshVaultBtn = el('button', {
      type: 'button',
      class: 'btn',
      text: 'Refresh R2 Inventory'
    });

    var lockControlsBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'WORM Immutability Seal Controls' }),
        el('span', { class: 'badge published', text: 'DPDP WORM Shield' })
      ]),
      el('div', { class: 'cso-ops-restore-controls' }, [
        el('div', { class: 'cso-ops-restore-field' }, [
          el('label', { for: 'f-ops-r2-lock-snap', class: 'muted sm', text: 'Target Snapshot' }),
          snapSel
        ]),
        el('div', { class: 'cso-ops-restore-field' }, [
          el('label', { for: 'f-ops-r2-lock-days', class: 'muted sm', text: 'Immutability Duration' }),
          lockDaysSel
        ]),
        applyLockBtn,
        refreshVaultBtn
      ])
    ]);

    var ledgerHost = el('div', { class: 'cso-ops-vault-table-host' });
    var reconcileHost = el('div', { class: 'cso-ops-subbox' });
    var previewOrphansBtn = el('button', {
      type: 'button',
      class: 'btn sm',
      disabled: !isAdmin,
      text: 'Scan R2 Orphans (Dry Run)'
    });
    var reconcileOut = el('div', { class: 'cso-ops-drill-output' });

    reconcileHost.appendChild(el('div', { class: 'cso-ops-subhead' }, [
      el('strong', { text: 'Reconcile R2 Orphans (Dry-Run Preview)' }),
      previewOrphansBtn
    ]));
    reconcileHost.appendChild(el('p', {
      class: 'hint',
      text: 'Cross-checks live R2 objects under backups/ against the D1 ops_snapshots ledger to surface unindexed orphan blobs and reclaimable storage.'
    }));
    reconcileHost.appendChild(reconcileOut);

    wrap.appendChild(kpiStrip);
    wrap.appendChild(lockControlsBox);
    wrap.appendChild(ledgerHost);
    wrap.appendChild(reconcileHost);

    var isLocking = false;
    var isScanningOrphans = false;

    async function applyWormLock(targetId, days) {
      if (isLocking || !isAdmin) return;
      var id = targetId || snapSel.value;
      if (!id) { toast('Select a snapshot first', true); return; }
      isLocking = true;
      applyLockBtn.disabled = true;
      snapSel.disabled = true;
      lockDaysSel.disabled = true;
      applyLockBtn.textContent = 'Sealing WORM Lock…';
      try {
        var res = await api('POST', 'ops/r2-vault/lock', {
          id: id,
          lock_days: Number(days || lockDaysSel.value || 30)
        });
        toast('WORM lock applied until ' + fmtDate(res.immutable_until));
        await loadR2Vault();
      } catch (err) {
        toast(err.message || 'Failed to apply WORM lock', true);
      } finally {
        isLocking = false;
        applyLockBtn.disabled = !isAdmin;
        snapSel.disabled = false;
        lockDaysSel.disabled = false;
        applyLockBtn.textContent = 'Apply WORM Immutability Lock';
      }
    }

    function renderOrphanPreview(res) {
      clear(reconcileOut);
      var orphans = Array.isArray(res && res.orphan_objects) ? res.orphan_objects : [];
      if (!orphans.length) {
        reconcileOut.appendChild(el('div', { class: 'alert ok', text: '✓ R2 cold vault is 100% synced with D1 — 0 orphan objects found (0 B reclaimable).' }));
        return;
      }

      reconcileOut.appendChild(el('div', { class: 'alert', text: orphans.length + ' unindexed orphan R2 object(s) detected · Reclaimable: ' + fmtBytes(res.reclaimable_bytes || 0) }));
      var tb = el('tbody');
      orphans.forEach(function (o) {
        tb.appendChild(el('tr', {}, [
          el('td', {}, el('code', { class: 'cso-ops-r2key', text: o.key })),
          el('td', { class: 'cso-tabular', text: fmtBytes(o.size) }),
          el('td', { class: 'cso-tabular', text: o.uploaded ? fmtDate(o.uploaded) : '—' })
        ]));
      });
      reconcileOut.appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
        el('thead', {}, el('tr', {}, ['Orphan R2 Key', 'Size', 'Uploaded'].map(function (h) {
          return el('th', { scope: 'col', text: h });
        }))),
        tb
      ])));

      if (isAdmin) {
        var recConfirm = el('input', {
          type: 'text',
          class: 'cso-ops-confirm-input',
          placeholder: 'Type RECONCILE to purge orphans',
          autocomplete: 'off',
          spellcheck: 'false'
        });
        var recCleanBtn = el('button', {
          type: 'button',
          class: 'btn danger sm',
          text: 'Purge Orphan Blobs',
          onclick: async function () {
            if (recConfirm.value.trim() !== 'RECONCILE') {
              toast('Type RECONCILE to confirm orphan cleanup', true);
              recConfirm.focus();
              return;
            }
            recCleanBtn.disabled = true;
            recCleanBtn.textContent = 'Purging Orphans…';
            try {
              var cleanRes = await api('POST', 'ops/r2-vault/reconcile', {
                dry_run: false,
                confirm: recConfirm.value.trim()
              });
              toast('Reconciled ' + (cleanRes.deleted_count || 0) + ' orphan(s), reclaimed ' + fmtBytes(cleanRes.reclaimed_bytes || 0));
              await loadR2Vault();
            } catch (err) {
              toast(err.message || 'Orphan cleanup failed', true);
              recCleanBtn.disabled = false;
              recCleanBtn.textContent = 'Purge Orphan Blobs';
            }
          }
        });
        reconcileOut.appendChild(el('div', { class: 'cso-ops-restore-controls' }, [recConfirm, recCleanBtn]));
      }
    }

    async function runOrphanDryRun() {
      if (isScanningOrphans || !isAdmin) return;
      isScanningOrphans = true;
      previewOrphansBtn.disabled = true;
      previewOrphansBtn.textContent = 'Scanning R2…';
      try {
        var res = await api('POST', 'ops/r2-vault/reconcile', { dry_run: true });
        renderOrphanPreview(res);
        toast('R2 orphan scan complete (' + (res.orphan_count || 0) + ' orphan(s))');
      } catch (err) {
        clear(reconcileOut).appendChild(el('div', { class: 'alert cso-ops-error-banner', role: 'alert' }, [
          el('span', { text: 'Orphan scan failed: ' + (err.message || 'Network error') }),
          el('button', { type: 'button', class: 'btn sm', text: 'Retry', onclick: runOrphanDryRun })
        ]));
      } finally {
        isScanningOrphans = false;
        previewOrphansBtn.disabled = !isAdmin;
        previewOrphansBtn.textContent = 'Scan R2 Orphans (Dry Run)';
      }
    }

    async function loadR2Vault() {
      clear(kpiStrip);
      clear(ledgerHost);
      clear(snapSel);
      try {
        var d = await api('GET', 'ops/r2-vault');
        var items = Array.isArray(d && d.items) ? d.items : [];
        var isSynced = d && d.sync_health === 'SYNCED';

        kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('div', { class: 'muted sm', text: 'Total Cold-Vault Objects' }),
          el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: String((d && d.total_objects) || 0) })
        ]));
        kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('div', { class: 'muted sm', text: 'Total R2 Storage Footprint' }),
          el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: fmtBytes((d && d.total_bytes) || 0) })
        ]));
        kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('div', { class: 'muted sm', text: 'Immutable-Locked Count' }),
          el('div', { class: 'cso-ops-telemetry-val cso-tabular' }, [
            el('span', { text: String((d && d.immutable_locked_count) || 0) + ' locked' }),
            el('span', { class: 'badge published', text: 'DPDP WORM Shield' })
          ])
        ]));
        kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('div', { class: 'muted sm', text: 'R2-to-D1 Sync Health' }),
          el('div', { class: 'cso-ops-telemetry-val' }, [
            el('span', {
              class: 'badge ' + (isSynced ? 'published' : 'sev-medium'),
              text: isSynced ? 'Synced' : 'Orphans Detected'
            })
          ])
        ]));

        if (!items.length) {
          snapSel.appendChild(el('option', { value: '', text: 'No snapshots in R2 cold vault' }));
          var emptyCard = el('div', { class: 'cso-ops-empty-vault' }, [
            el('p', { class: 'muted', text: 'No snapshots exist in Cloudflare R2 yet. Archive your first cold-vault snapshot to enable WORM immutability sealing.' })
          ]);
          if (isAdmin) {
            var firstSnapBtn = el('button', {
              type: 'button',
              class: 'btn primary',
              text: 'Archive First Cold-Vault Snapshot Now',
              onclick: async function () {
                firstSnapBtn.disabled = true;
                firstSnapBtn.textContent = 'Archiving Snapshot…';
                try {
                  await api('POST', 'ops/snapshots', { label: 'Initial Cold-Vault Baseline', scope: 'all' });
                  toast('Cold-vault baseline snapshot archived to R2');
                  await loadR2Vault();
                } catch (err) {
                  toast(err.message || 'Failed to archive snapshot', true);
                  firstSnapBtn.disabled = false;
                  firstSnapBtn.textContent = 'Archive First Cold-Vault Snapshot Now';
                }
              }
            });
            emptyCard.appendChild(firstSnapBtn);
          }
          ledgerHost.appendChild(emptyCard);
          return;
        }

        items.forEach(function (it) {
          snapSel.appendChild(el('option', {
            value: it.id,
            text: it.label + ' (' + fmtBytes(it.size_bytes) + (it.is_immutable_locked ? ' · Locked' : '') + ')'
          }));
        });

        var tb = el('tbody');
        items.forEach(function (snap) {
          var syncBadge = el('span', {
            class: 'badge ' + (snap.r2_exists ? 'published' : 'expired'),
            text: snap.r2_exists ? 'R2 Synced' : 'Missing in R2'
          });
          var lockBadge = el('span', {
            class: 'badge ' + (snap.is_immutable_locked ? 'published' : 'draft'),
            text: snap.is_immutable_locked ? ('WORM Until ' + fmtDate(snap.immutable_until)) : 'Unlocked'
          });
          var verifyBtn = el('button', {
            type: 'button',
            class: 'btn sm cso-btn-forest-outline',
            text: 'Verify R2 Blob',
            onclick: async function () {
              verifyBtn.disabled = true;
              verifyBtn.textContent = 'Verifying…';
              try {
                var res = await api('POST', 'ops/snapshots/' + encodeURIComponent(snap.id) + '/verify', {});
                syncBadge.className = 'badge ' + (res.valid ? 'published' : 'expired');
                syncBadge.textContent = res.valid ? '✓ Blob Verified' : '✗ Checksum Mismatch';
                toast(res.valid ? 'R2 blob SHA-256 verified' : 'R2 blob verification FAILED', !res.valid);
              } catch (err) {
                toast(err.message || 'Verification failed', true);
              }
              verifyBtn.disabled = false;
              verifyBtn.textContent = 'Verify R2 Blob';
            }
          });
          var rowActions = [verifyBtn];
          if (isAdmin) {
            rowActions.unshift(el('button', {
              type: 'button',
              class: 'btn sm',
              text: 'Seal 30d',
              onclick: function () { applyWormLock(snap.id, 30); }
            }));
          }

          tb.appendChild(el('tr', {}, [
            el('td', {}, [
              el('strong', { text: snap.label }),
              el('div', { class: 'hint cso-ops-mono', text: String(snap.id || '').slice(0, 12) + '…' })
            ]),
            el('td', {}, el('span', {
              class: 'badge ' + (snap.vault_tier === 'cold_immutable' ? 'published' : 'draft'),
              text: snap.vault_tier || 'standard'
            })),
            el('td', {}, [
              el('div', { class: 'hint cso-ops-r2key', text: snap.r2_key }),
              el('div', { class: 'cso-tabular sm', text: fmtBytes(snap.size_bytes) })
            ]),
            el('td', {}, el('code', { class: 'cso-ops-sha-code', title: snap.sha256 || '', text: snap.sha256 ? (snap.sha256.slice(0, 12) + '…') : '—' })),
            el('td', {}, lockBadge),
            el('td', {}, syncBadge),
            el('td', {}, el('div', { class: 'actions' }, rowActions))
          ]));
        });

        ledgerHost.appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
          el('caption', { class: 'muted', text: 'Cloudflare R2 Cold Vault Ledger & WORM Immutability Status' }),
          el('thead', {}, el('tr', {}, ['Snapshot ID & Label', 'Tier', 'R2 Key & Size', 'SHA-256 Digest', 'Immutable Lock Status / Unlock Date', 'Sync State', 'Actions'].map(function (h) {
            return el('th', { scope: 'col', text: h });
          }))),
          tb
        ])));

        if (Array.isArray(d && d.orphan_objects) && d.orphan_objects.length) {
          renderOrphanPreview({
            orphan_objects: d.orphan_objects,
            reclaimable_bytes: d.orphan_objects.reduce(function (a, o) { return a + (Number(o.size) || 0); }, 0)
          });
        }
      } catch (e) {
        ledgerHost.appendChild(el('div', { class: 'alert cso-ops-error-banner', role: 'alert' }, [
          el('span', { text: 'Could not load R2 cold vault: ' + (e && e.message ? e.message : 'Network error') }),
          el('button', { type: 'button', class: 'btn sm', text: 'Retry', onclick: loadR2Vault })
        ]));
      }
    }

    applyLockBtn.addEventListener('click', function () { applyWormLock(snapSel.value, lockDaysSel.value); });
    refreshVaultBtn.addEventListener('click', loadR2Vault);
    previewOrphansBtn.addEventListener('click', runOrphanDryRun);
    loadR2Vault();
    return wrap;
  }

  /* ---------- Folder 17: Module #6 Database Migration Version & DDL Schema Journal ---------- */
  function opsDdlSchemaJournalPanel() {
    var isAdmin = me && me.role === 'admin';
    var wrap = el('div', { class: 'panel cso-ops-hygiene-panel' }, [
      el('h2', { text: 'Database Migration Version & DDL Schema Journal' }),
      el('p', {
        class: 'muted',
        text: 'Introspect live sqlite_master tables, indexes, triggers, and PRAGMA table_info columns; track deterministic SHA-256 schema fingerprints and versioned DDL checkpoints.'
      })
    ]);

    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis', 'aria-live': 'polite' });
    var emptyBaselineHost = el('div');
    var driftHost = el('div');

    var tagInp = el('input', {
      type: 'text',
      id: 'f-ops-ddl-tag',
      placeholder: 'e.g. v1.0.0-baseline or 2026-11-15-ddl',
      'aria-label': 'Checkpoint version tag'
    });
    var noteInp = el('input', {
      type: 'text',
      id: 'f-ops-ddl-note',
      placeholder: 'Migration or schema checkpoint note…',
      'aria-label': 'Checkpoint note'
    });
    var recordBtn = el('button', {
      type: 'button',
      class: 'btn primary',
      disabled: !isAdmin,
      text: 'Record DDL Checkpoint'
    });
    var refreshBtn = el('button', {
      type: 'button',
      class: 'btn',
      text: 'Refresh Live DDL'
    });

    var recorderBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'Record Versioned DDL Checkpoint' }),
        refreshBtn
      ]),
      el('div', { class: 'cso-ops-restore-controls' }, [
        el('div', { class: 'cso-ops-restore-field' }, [
          el('label', { for: 'f-ops-ddl-tag', class: 'muted sm', text: 'Version Tag' }),
          tagInp
        ]),
        el('div', { class: 'cso-ops-restore-field' }, [
          el('label', { for: 'f-ops-ddl-note', class: 'muted sm', text: 'Checkpoint Note' }),
          noteInp
        ]),
        recordBtn
      ])
    ]);

    var journalHost = el('div', { class: 'cso-ops-vault-table-host' });
    var ddlInspectorHost = el('div', { class: 'cso-ops-subbox' });

    wrap.appendChild(kpiStrip);
    wrap.appendChild(emptyBaselineHost);
    wrap.appendChild(driftHost);
    wrap.appendChild(recorderBox);
    wrap.appendChild(journalHost);
    wrap.appendChild(ddlInspectorHost);

    var isRecording = false;

    async function captureCheckpoint(tagVal, noteVal) {
      if (isRecording || !isAdmin) return;
      var tag = String(tagVal || '').trim();
      if (!tag) {
        toast('Enter a version tag before recording a DDL checkpoint', true);
        tagInp.focus();
        return;
      }
      isRecording = true;
      recordBtn.disabled = true;
      recordBtn.textContent = 'Recording…';
      try {
        await api('POST', 'ops/ddl-journal', {
          version_tag: tag,
          note: String(noteVal || '').trim()
        });
        toast('DDL checkpoint "' + tag + '" recorded');
        tagInp.value = '';
        noteInp.value = '';
        await loadDdlJournal(false);
      } catch (err) {
        toast(err && err.message ? err.message : 'Failed to record DDL checkpoint', true);
      } finally {
        isRecording = false;
        recordBtn.disabled = !isAdmin;
        recordBtn.textContent = 'Record DDL Checkpoint';
      }
    }

    async function loadDdlJournal(showToast) {
      refreshBtn.disabled = true;
      refreshBtn.textContent = 'Inspecting…';
      clear(kpiStrip).appendChild(el('p', { class: 'muted sm', text: 'Inspecting live D1 sqlite_master & DDL journal…' }));
      clear(emptyBaselineHost);
      clear(driftHost);
      clear(journalHost);
      clear(ddlInspectorHost);

      try {
        var r = await api('GET', 'ops/ddl-journal');
        var sha = String(r.live_schema_hash || r.schema_sha256 || '');
        var latestTag = r.latest_checkpoint ? r.latest_checkpoint.version_tag : 'None';
        var syncLabel = r.baseline_missing ? 'No Baseline' : (r.drift_detected ? 'Schema Drift' : 'In Sync');
        var syncBadgeCls = r.baseline_missing ? 'scheduled' : (r.drift_detected ? 'expired' : 'published');

        clear(kpiStrip);
        kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('div', { class: 'muted sm', text: 'Live Schema Objects' }),
          el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: (r.table_count || 0) + ' Tables · ' + (r.index_count || 0) + ' Indexes · ' + (r.trigger_count || 0) + ' Triggers' }),
          el('div', { class: 'muted sm cso-tabular', text: 'Total Live Rows: ' + (r.total_rows || 0) })
        ]));
        kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('div', { class: 'muted sm', text: 'Canonical Schema SHA-256' }),
          el('div', { class: 'cso-ops-telemetry-val' }, [
            el('code', { class: 'cso-ops-sha-code', title: sha, text: sha ? (sha.slice(0, 18) + '…') : '—' }),
            el('button', {
              type: 'button',
              class: 'btn sm',
              text: 'Copy SHA-256',
              onclick: function () {
                if (!sha) return;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(sha).then(function () { toast('Copied Schema SHA-256'); });
                } else {
                  toast('SHA-256: ' + sha);
                }
              }
            })
          ]),
          el('div', { class: 'muted sm', text: 'Deterministic table/column/index hash' })
        ]));
        kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('div', { class: 'muted sm', text: 'Latest Checkpoint' }),
          el('div', { class: 'cso-ops-telemetry-val', text: latestTag }),
          el('div', { class: 'muted sm', text: r.latest_checkpoint ? fmtDate(r.latest_checkpoint.created_at) : 'No checkpoint recorded yet' })
        ]));
        kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('div', { class: 'muted sm', text: 'Schema Drift Posture' }),
          el('div', { class: 'cso-ops-telemetry-val' }, el('span', { class: 'badge ' + syncBadgeCls, text: syncLabel })),
          el('div', { class: 'muted sm', text: r.drift_detected ? 'Live DDL differs from checkpoint' : 'Matches latest checkpoint' })
        ]));

        if (r.baseline_missing) {
          var baselineBtn = el('button', {
            type: 'button',
            class: 'btn primary',
            disabled: !isAdmin,
            text: 'Capture Initial Schema Baseline',
            onclick: function () {
              captureCheckpoint('v1.0.0-baseline', 'Initial D1 sqlite_master baseline');
            }
          });
          emptyBaselineHost.appendChild(el('div', { class: 'cso-ops-empty-vault' }, [
            el('strong', { text: 'No DDL baseline recorded yet' }),
            el('p', { class: 'muted sm', text: 'Capture your initial schema baseline so future table, column, or index drift is detected automatically.' }),
            baselineBtn
          ]));
        } else if (r.drift_detected && r.pending_diff) {
          var d = r.pending_diff;
          driftHost.appendChild(el('div', { class: 'alert' }, [
            el('strong', { text: 'Pending Schema Drift Detected — ' }),
            el('span', {
              text: 'Added: ' + ((d.added_tables && d.added_tables.length) ? d.added_tables.join(', ') : 'none') +
                ' · Removed: ' + ((d.removed_tables && d.removed_tables.length) ? d.removed_tables.join(', ') : 'none') +
                ' · Altered: ' + ((d.altered_tables && d.altered_tables.length) ? d.altered_tables.join(', ') : 'none')
            })
          ]));
        }

        // Journal History Table with inline note/tag editing
        var history = Array.isArray(r.journal_history) ? r.journal_history : [];
        journalHost.appendChild(el('h3', { text: 'DDL Version Journal (' + history.length + ')' }));
        if (history.length) {
          var tb = el('tbody');
          history.forEach(function (cp) {
            var noteCell = el('td', { text: cp.note || '—' });
            var tagCell = el('td', {}, el('code', { text: cp.version_tag }));
            var editBtn = el('button', {
              type: 'button',
              class: 'btn sm',
              disabled: !isAdmin,
              text: 'Edit Note',
              onclick: function () {
                var editTagInp = el('input', { type: 'text', value: cp.version_tag || '', 'aria-label': 'Edit version tag' });
                var editNoteInp = el('input', { type: 'text', value: cp.note || '', 'aria-label': 'Edit checkpoint note' });
                var saveEditBtn = el('button', {
                  type: 'button',
                  class: 'btn sm primary',
                  text: 'Save',
                  onclick: async function () {
                    saveEditBtn.disabled = true;
                    try {
                      await api('PATCH', 'ops/ddl-journal/' + cp.id, {
                        version_tag: editTagInp.value.trim(),
                        note: editNoteInp.value.trim()
                      });
                      toast('Checkpoint #' + cp.id + ' updated');
                      await loadDdlJournal(false);
                    } catch (e) {
                      toast(e && e.message ? e.message : 'Update failed', true);
                      saveEditBtn.disabled = false;
                    }
                  }
                });
                clear(tagCell).appendChild(editTagInp);
                clear(noteCell).appendChild(el('div', { class: 'actions' }, [editNoteInp, saveEditBtn]));
              }
            });
            tb.appendChild(el('tr', {}, [
              el('td', { class: 'cso-tabular', text: '#' + cp.id }),
              tagCell,
              el('td', {}, el('code', { class: 'cso-ops-sha-code', title: cp.schema_sha256, text: String(cp.schema_sha256 || '').slice(0, 14) + '…' })),
              el('td', { class: 'cso-tabular', text: (cp.table_count || 0) + 'T / ' + (cp.index_count || 0) + 'I' }),
              noteCell,
              el('td', { class: 'muted sm', text: (cp.created_by || 'admin') + ' · ' + fmtDate(cp.created_at) }),
              el('td', {}, editBtn)
            ]));
          });
          journalHost.appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
            el('thead', {}, el('tr', {}, ['ID', 'Version Tag', 'Schema SHA-256', 'Objects', 'Note', 'Recorded', 'Actions'].map(function (h) {
              return el('th', { scope: 'col', text: h });
            }))),
            tb
          ])));
        }

        // Live D1 DDL Inspector
        ddlInspectorHost.appendChild(el('div', { class: 'cso-ops-subhead' }, [
          el('strong', { text: 'Live D1 DDL Inspector (' + ((r.tables && r.tables.length) || 0) + ' tables)' }),
          el('span', { class: 'muted sm', text: 'PRAGMA table_info + sqlite_master' })
        ]));
        var ddlList = el('div', { class: 'cso-ops-ddl-list' });
        (r.tables || []).forEach(function (tbl) {
          var colNames = Array.isArray(tbl.columns) ? tbl.columns.map(function (c) { return c.name + (c.pk ? ' [PK]' : ''); }).join(', ') : '';
          ddlList.appendChild(el('details', { class: 'cso-ops-ddl-details' }, [
            el('summary', { class: 'cso-ops-ddl-summary' }, [
              el('code', { class: 'cso-ops-r2key', text: tbl.name }),
              el('span', { class: 'muted sm cso-tabular', text: (tbl.column_count || 0) + ' cols · ' + (tbl.row_count || 0) + ' rows' })
            ]),
            colNames ? el('p', { class: 'muted sm', text: 'Columns: ' + colNames }) : el('span'),
            el('pre', { class: 'cso-ops-ddl-pre', text: tbl.ddl_sql || '-- No DDL SQL available' })
          ]));
        });
        ddlInspectorHost.appendChild(ddlList);

        if (showToast) toast('DDL Schema fingerprint verified (' + (r.table_count || 0) + ' tables)');
      } catch (err) {
        clear(kpiStrip).appendChild(el('div', { class: 'alert cso-ops-error-banner', role: 'alert' }, [
          el('span', { text: 'Failed to inspect DDL journal: ' + (err && err.message ? err.message : 'Network error') }),
          el('button', { type: 'button', class: 'btn sm', text: 'Retry', onclick: function () { loadDdlJournal(false); } })
        ]));
      } finally {
        refreshBtn.disabled = false;
        refreshBtn.textContent = 'Refresh Live DDL';
      }
    }

    recordBtn.addEventListener('click', function () { captureCheckpoint(tagInp.value, noteInp.value); });
    refreshBtn.addEventListener('click', function () { loadDdlJournal(true); });
    loadDdlJournal(false);
    return wrap;
  }

  /* ---------- Folder 17: Module #7 Edge Cache State Preservation & Warmer ---------- */
  function opsEdgeCacheWarmerPanel() {
    var isAdmin = me && me.role === 'admin';
    var wrap = el('div', { class: 'panel cso-ops-sentinel-panel' }, [
      el('h2', { text: 'Edge Cache State Preservation & Warmer' }),
      el('p', {
        class: 'muted',
        text: 'Manage custom edge-warmer target routes, preview warm scope via dry run, warm Cloudflare edge caches, and inspect per-route HTTP status, CF-Cache-Status, and latency.'
      })
    ]);

    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis', 'aria-live': 'polite' });
    var routesArea = el('textarea', {
      id: 'f-ops-warmer-routes',
      rows: '6',
      'aria-label': 'Custom warmer routes (one relative path per line)',
      placeholder: '/\n/about/\n/schemes/\n/study/\n/jobs/\n/updates/\n/sw.js'
    });
    var saveRoutesBtn = el('button', {
      type: 'button',
      class: 'btn',
      disabled: !isAdmin,
      text: 'Save Route List'
    });
    var previewWarmBtn = el('button', {
      type: 'button',
      class: 'btn',
      disabled: !isAdmin,
      text: 'Preview Warm Scope (Dry Run)'
    });
    var warmNowBtn = el('button', {
      type: 'button',
      class: 'btn primary',
      disabled: !isAdmin,
      text: 'Warm Edge Cache Now'
    });
    var purgeBtn = el('button', {
      type: 'button',
      class: 'btn',
      disabled: !isAdmin,
      text: 'Purge Edge Cache'
    });

    var routeEditorBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'Configured Warmer Routes (relative paths starting with /, max 30)' }),
        saveRoutesBtn
      ]),
      el('div', { class: 'form' }, [
        el('label', { for: 'f-ops-warmer-routes', text: 'One route per line' }),
        routesArea
      ]),
      el('div', { class: 'actions' }, [previewWarmBtn, warmNowBtn, purgeBtn])
    ]);

    var matrixHost = el('div', { class: 'cso-ops-vault-table-host' });

    wrap.appendChild(kpiStrip);
    wrap.appendChild(routeEditorBox);
    wrap.appendChild(matrixHost);

    var isBusy = false;

    function parseRoutesTextarea() {
      return String(routesArea.value || '')
        .split(/\r?\n/)
        .map(function (l) { return l.trim(); })
        .filter(Boolean);
    }

    function renderKpis(data) {
      var lw = data && data.last_warm ? data.last_warm : null;
      clear(kpiStrip);
      kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
        el('div', { class: 'muted sm', text: 'Active sw.js Cache Version' }),
        el('div', { class: 'cso-ops-telemetry-val' }, el('code', { class: 'cso-ops-sha-code', text: (data && data.cache_version) || 'cso-candidate-cache-v35' })),
        el('div', { class: 'muted sm', text: 'Service Worker atomic asset cache' })
      ]));
      kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
        el('div', { class: 'muted sm', text: 'Monitored Routes Count' }),
        el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: String((data && data.routes_count) || (data && data.routes ? data.routes.length : 0)) }),
        el('div', { class: 'muted sm', text: 'Max 30 canonical routes' })
      ]));
      kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
        el('div', { class: 'muted sm', text: 'Avg Edge Latency' }),
        el('div', { class: 'cso-ops-telemetry-val cso-tabular', text: lw && lw.avg_latency_ms !== undefined ? (lw.avg_latency_ms + ' ms') : '—' }),
        el('div', { class: 'muted sm', text: lw ? ('Warmed ' + (lw.warmed_count || 0) + '/' + (lw.routes_count || 0) + ' routes') : 'No warm run yet' })
      ]));
      kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
        el('div', { class: 'muted sm', text: 'Last Warm Timestamp' }),
        el('div', { class: 'cso-ops-telemetry-val', text: lw && lw.ran_at ? fmtDate(lw.ran_at) : 'Never' }),
        el('div', { class: 'muted sm', text: lw && lw.actor ? ('By ' + lw.actor) : 'Run Warm Edge Cache Now' })
      ]));
    }

    function renderMatrix(routes, summaryBanner) {
      clear(matrixHost);
      if (summaryBanner) {
        matrixHost.appendChild(el('div', { class: 'alert ok', text: summaryBanner }));
      }
      var list = Array.isArray(routes) ? routes : [];
      if (!list.length) return;
      var tb = el('tbody');
      list.forEach(function (r) {
        var isDry = r.status === 'PENDING_DRY_RUN';
        var okStatus = typeof r.status === 'number' && r.status >= 200 && r.status < 400;
        tb.appendChild(el('tr', {}, [
          el('td', {}, el('code', { class: 'cso-ops-r2key', text: r.route })),
          el('td', {}, el('span', { class: 'badge ' + (isDry ? 'scheduled' : (okStatus ? 'published' : 'expired')), text: isDry ? 'DRY RUN' : ('HTTP ' + r.status) })),
          el('td', {}, el('code', { text: r.cf_cache_status || (r.evicted ? 'EVICTED' : '—') })),
          el('td', {}, el('span', { class: 'badge ' + (r.cached ? 'published' : 'draft'), text: r.cached ? 'WARMED' : (r.evicted ? 'PURGED' : (isDry ? 'PREVIEW' : 'FETCHED')) })),
          el('td', { class: 'cso-tabular', text: (r.latency_ms || 0) + ' ms' })
        ]));
      });
      matrixHost.appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
        el('thead', {}, el('tr', {}, ['Canonical Route', 'HTTP Status', 'CF-Cache-Status', 'Edge Cache State', 'Latency'].map(function (h) {
          return el('th', { scope: 'col', text: h });
        }))),
        tb
      ])));
    }

    async function loadWarmerStatus() {
      try {
        var res = await api('GET', 'ops/cache-warmer');
        routesArea.value = Array.isArray(res.routes) ? res.routes.join('\n') : '';
        renderKpis(res);
        if (res.last_warm && Array.isArray(res.last_warm.routes)) {
          renderMatrix(res.last_warm.routes, null);
        }
      } catch (err) {
        clear(kpiStrip).appendChild(el('div', { class: 'alert cso-ops-error-banner', role: 'alert' }, [
          el('span', { text: 'Failed to load cache warmer status: ' + (err && err.message ? err.message : 'Network error') }),
          el('button', { type: 'button', class: 'btn sm', text: 'Retry', onclick: loadWarmerStatus })
        ]));
      }
    }

    async function saveRoutes() {
      if (isBusy || !isAdmin) return;
      isBusy = true;
      saveRoutesBtn.disabled = true;
      saveRoutesBtn.textContent = 'Saving…';
      try {
        var res = await api('PUT', 'ops/cache-warmer/routes', { routes: parseRoutesTextarea() });
        routesArea.value = (res.routes || []).join('\n');
        toast('Saved ' + (res.routes_count || 0) + ' warmer routes');
        await loadWarmerStatus();
      } catch (err) {
        toast(err && err.message ? err.message : 'Failed to save routes', true);
      } finally {
        isBusy = false;
        saveRoutesBtn.disabled = !isAdmin;
        saveRoutesBtn.textContent = 'Save Route List';
      }
    }

    async function executeWarm(dryRun) {
      if (isBusy || !isAdmin) return;
      isBusy = true;
      previewWarmBtn.disabled = true;
      warmNowBtn.disabled = true;
      purgeBtn.disabled = true;
      warmNowBtn.textContent = dryRun ? 'Warm Edge Cache Now' : 'Warming Edge Cache…';
      previewWarmBtn.textContent = dryRun ? 'Previewing…' : 'Preview Warm Scope (Dry Run)';
      try {
        var res = await api('POST', 'ops/cache-warmer/warm', {
          dry_run: Boolean(dryRun),
          routes: parseRoutesTextarea()
        });
        var msg = dryRun
          ? ('Dry-run preview: ' + (res.routes_count || 0) + ' routes queued for edge warming.')
          : ('Warmed ' + (res.warmed_count || 0) + ' of ' + (res.routes_count || 0) + ' routes (avg ' + (res.avg_latency_ms || 0) + ' ms).');
        renderMatrix(res.routes || [], msg);
        if (!dryRun) await loadWarmerStatus();
        toast(msg);
      } catch (err) {
        toast(err && err.message ? err.message : 'Cache warm failed', true);
      } finally {
        isBusy = false;
        previewWarmBtn.disabled = !isAdmin;
        warmNowBtn.disabled = !isAdmin;
        purgeBtn.disabled = !isAdmin;
        warmNowBtn.textContent = 'Warm Edge Cache Now';
        previewWarmBtn.textContent = 'Preview Warm Scope (Dry Run)';
      }
    }

    async function executePurge() {
      if (isBusy || !isAdmin) return;
      isBusy = true;
      purgeBtn.disabled = true;
      purgeBtn.textContent = 'Purging…';
      try {
        var res = await api('POST', 'ops/cache', { action: 'purge', routes: parseRoutesTextarea() });
        var msg = 'Purged edge cache entries across ' + (res.routes ? res.routes.length : 0) + ' routes (' + (res.purged_count || 0) + ' active entries evicted).';
        renderMatrix(res.routes || [], msg);
        toast(msg);
      } catch (err) {
        toast(err && err.message ? err.message : 'Cache purge failed', true);
      } finally {
        isBusy = false;
        purgeBtn.disabled = !isAdmin;
        purgeBtn.textContent = 'Purge Edge Cache';
      }
    }

    saveRoutesBtn.addEventListener('click', saveRoutes);
    previewWarmBtn.addEventListener('click', function () { executeWarm(true); });
    warmNowBtn.addEventListener('click', function () { executeWarm(false); });
    purgeBtn.addEventListener('click', executePurge);
    loadWarmerStatus();
    return wrap;
  }

  /* ---------- Folder 17: Module #8 Offline Air-Gapped Manifest & ZIP Exporter ---------- */
  function opsAirgapExporterPanel() {
    var isAdmin = me && me.role === 'admin';
    var wrap = el('div', { class: 'panel cso-ops-continuity-panel' }, [
      el('h2', { text: 'Offline Air-Gapped Manifest & Bundle Exporter' }),
      el('p', {
        class: 'muted',
        text: 'Generate a portable, DPDP-scrubbed .cso-bundle.json archive with cryptographic SHA-256 manifest verification for offline disaster recovery.'
      })
    ]);

    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis', 'aria-live': 'polite' });
    var scopeSel = el('select', { id: 'f-ops-airgap-scope', class: 'cso-ops-policy-select', 'aria-label': 'Bundle export scope' }, [
      el('option', { value: 'full', text: 'Full Platform Bundle (All Non-Transient Tables)', selected: true }),
      el('option', { value: 'core', text: 'Core Content Only (Pages, Posts, Schemes, Resources, Media)' })
    ]);
    var exportBtn = el('button', {
      type: 'button',
      class: 'btn primary',
      disabled: !isAdmin,
      text: 'Generate & Download Air-Gapped Bundle (.json)'
    });
    var summaryHost = el('div');

    var exportBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'Air-Gapped Bundle Generator' }),
        el('span', { class: 'badge published', text: 'DPDP Act 2023 Scrubbed' })
      ]),
      el('div', { class: 'cso-ops-restore-controls' }, [
        el('div', { class: 'cso-ops-restore-field' }, [
          el('label', { for: 'f-ops-airgap-scope', class: 'muted sm', text: 'Export Scope' }),
          scopeSel
        ]),
        exportBtn
      ]),
      summaryHost
    ]);

    var fileInp = el('input', {
      type: 'file',
      id: 'f-ops-airgap-file',
      accept: '.json,.cso-bundle.json',
      'aria-label': 'Upload .cso-bundle.json file'
    });
    var jsonPaste = el('textarea', {
      id: 'f-ops-airgap-json',
      rows: '6',
      placeholder: 'Or paste raw .cso-bundle.json contents here to verify its SHA-256 signature offline…',
      'aria-label': 'Paste air-gapped bundle JSON'
    });
    var verifyBtn = el('button', {
      type: 'button',
      class: 'btn primary',
      disabled: !isAdmin,
      text: 'Verify Bundle Signature'
    });
    var verifyOut = el('div');

    var verifierBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'Offline Bundle Integrity Verifier' }),
        verifyBtn
      ]),
      el('div', { class: 'form' }, [
        el('label', { for: 'f-ops-airgap-file', text: 'Load .cso-bundle.json file' }),
        fileInp,
        el('label', { for: 'f-ops-airgap-json', text: 'Bundle JSON Payload' }),
        jsonPaste
      ]),
      verifyOut
    ]);

    wrap.appendChild(kpiStrip);
    wrap.appendChild(exportBox);
    wrap.appendChild(verifierBox);

    var isExporting = false;
    var isVerifying = false;

    function renderAirgapKpis(manifest) {
      clear(kpiStrip);
      kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
        el('div', { class: 'muted sm', text: 'DPDP Privacy Scrubbing Status' }),
        el('div', { class: 'cso-ops-telemetry-val' }, el('span', { class: 'badge published', text: 'ACTIVE · SCRUBBED' })),
        el('div', { class: 'muted sm', text: 'Excludes sessions, OTPs, rate limits & secret columns' })
      ]));
      kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
        el('div', { class: 'muted sm', text: 'Last Bundle Export Timestamp' }),
        el('div', { class: 'cso-ops-telemetry-val', text: manifest && manifest.generated_at ? fmtDate(manifest.generated_at) : 'Ready' }),
        el('div', { class: 'muted sm cso-tabular', text: manifest ? ((manifest.table_count || 0) + ' tables · ' + (manifest.total_rows || 0) + ' rows') : 'Live manifest' })
      ]));
      kpiStrip.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
        el('div', { class: 'muted sm', text: 'Manifest Hash Algorithm' }),
        el('div', { class: 'cso-ops-telemetry-val' }, el('code', { class: 'cso-ops-sha-code', text: 'SHA-256 (Canonical)' })),
        el('div', { class: 'muted sm cso-ops-mono', text: manifest && manifest.payload_sha256 ? ('Payload: ' + manifest.payload_sha256.slice(0, 14) + '…') : 'cso.airgap.dr.bundle.v1' })
      ]));
    }

    async function loadAirgapSummary() {
      if (!isAdmin) {
        renderAirgapKpis(null);
        clear(summaryHost).appendChild(el('p', { class: 'muted sm', text: 'Super Administrator role required to inspect or export air-gapped recovery bundles.' }));
        return;
      }
      try {
        var res = await api('GET', 'ops/airgap-bundle?summary=1&scope=' + encodeURIComponent(scopeSel.value || 'full'));
        var m = res.manifest || {};
        renderAirgapKpis(m);
        clear(summaryHost).appendChild(el('div', { class: 'cso-ops-drill-kpis' }, [
          el('span', { class: 'badge published', text: (m.bundle_format || 'cso.airgap.dr.bundle.v1') + ' (' + (m.bundle_version || 'v35') + ')' }),
          el('span', { class: 'muted sm cso-tabular', text: (m.table_count || 0) + ' Tables · ' + (m.total_rows || 0) + ' Rows · ' + (m.runbook_count || 0) + ' Runbooks' }),
          el('code', { class: 'cso-ops-sha-code', title: m.payload_sha256 || '', text: 'Payload SHA-256: ' + String(m.payload_sha256 || '').slice(0, 18) + '…' })
        ]));
      } catch (err) {
        renderAirgapKpis(null);
        clear(summaryHost).appendChild(el('div', { class: 'alert', text: err && err.message ? err.message : 'Could not compute air-gap bundle summary' }));
      }
    }

    async function generateAndDownload() {
      if (isExporting || !isAdmin) return;
      isExporting = true;
      exportBtn.disabled = true;
      exportBtn.textContent = 'Generating Bundle…';
      try {
        var r = await fetch('/api/admin/ops/airgap-bundle', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope: scopeSel.value || 'full' })
        });
        if (!r.ok) {
          var errTxt = await r.text().catch(function () { return 'Export failed'; });
          throw new Error(errTxt || ('HTTP ' + r.status));
        }
        var blob = await r.blob();
        var urlObj = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = urlObj;
        a.download = 'cso-airgap-bundle-' + (scopeSel.value || 'full') + '-' + new Date().toISOString().slice(0, 10) + '.cso-bundle.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(urlObj);
        toast('Air-Gapped DR Bundle downloaded');
        await loadAirgapSummary();
      } catch (err) {
        toast(err && err.message ? err.message : 'Bundle export failed', true);
      } finally {
        isExporting = false;
        exportBtn.disabled = !isAdmin;
        exportBtn.textContent = 'Generate & Download Air-Gapped Bundle (.json)';
      }
    }

    async function verifyBundle() {
      if (isVerifying || !isAdmin) return;
      var raw = String(jsonPaste.value || '').trim();
      if (!raw) {
        toast('Select or paste a .cso-bundle.json file first', true);
        return;
      }
      isVerifying = true;
      verifyBtn.disabled = true;
      verifyBtn.textContent = 'Verifying…';
      clear(verifyOut);
      try {
        var res = await api('POST', 'ops/airgap-bundle/verify', { json_text: raw });
        verifyOut.appendChild(el('div', { class: 'alert ' + (res.valid ? 'ok' : ''), text: res.valid ? 'VALID: Cryptographic SHA-256 signature & DPDP compliance verified.' : 'INVALID: Bundle signature mismatch or DPDP policy violation detected!' }));
        verifyOut.appendChild(el('div', { class: 'cso-ops-drill-kpis' }, [
          el('span', { class: 'badge ' + (res.signature_match ? 'published' : 'expired'), text: res.signature_match ? 'SHA-256 MATCH' : 'SHA-256 MISMATCH' }),
          el('span', { class: 'badge ' + (res.dpdp_compliant ? 'published' : 'expired'), text: res.dpdp_compliant ? 'DPDP COMPLIANT' : 'DPDP VIOLATION' }),
          el('span', { class: 'muted sm cso-tabular', text: (res.table_count || 0) + ' Tables · ' + (res.total_rows || 0) + ' Rows' })
        ]));
        var rcEntries = Object.entries(res.row_counts || {});
        if (rcEntries.length) {
          var tb = el('tbody');
          rcEntries.forEach(function (pair) {
            tb.appendChild(el('tr', {}, [
              el('td', {}, el('code', { text: pair[0] })),
              el('td', { class: 'cso-tabular', text: String(pair[1]) })
            ]));
          });
          verifyOut.appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
            el('thead', {}, el('tr', {}, [el('th', { scope: 'col', text: 'Table' }), el('th', { scope: 'col', text: 'Rows' })])),
            tb
          ])));
        }
      } catch (err) {
        verifyOut.appendChild(el('div', { class: 'alert', text: err && err.message ? err.message : 'Verification failed' }));
      } finally {
        isVerifying = false;
        verifyBtn.disabled = !isAdmin;
        verifyBtn.textContent = 'Verify Bundle Signature';
      }
    }

    fileInp.addEventListener('change', function () {
      var f = fileInp.files && fileInp.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        jsonPaste.value = String(reader.result || '');
      };
      reader.readAsText(f);
    });
    scopeSel.addEventListener('change', loadAirgapSummary);
    exportBtn.addEventListener('click', generateAndDownload);
    verifyBtn.addEventListener('click', verifyBundle);
    loadAirgapSummary();
    return wrap;
  }

  /* ---------- Folder 17 shared helpers for Modules #9–#12 ---------- */
  function opsKpiCard(label, valueNode, sub) {
    return el('div', { class: 'cso-ops-telemetry-card' }, [
      el('div', { class: 'muted sm', text: label }),
      el('div', { class: 'cso-ops-telemetry-val' }, valueNode),
      el('div', { class: 'muted sm', text: sub || '' })
    ]);
  }
  function opsErrorBanner(prefix, err, retryFn) {
    return el('div', { class: 'alert cso-ops-error-banner', role: 'alert' }, [
      el('span', { text: prefix + ': ' + (err && err.message ? err.message : 'Network error') }),
      el('button', { type: 'button', class: 'btn sm', text: 'Retry', onclick: retryFn })
    ]);
  }
  function opsCopyBtn(value, label) {
    return el('button', {
      type: 'button',
      class: 'btn sm',
      text: 'Copy',
      'aria-label': 'Copy ' + (label || 'value'),
      disabled: !value,
      onclick: function () {
        if (!value) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(value).then(function () { toast('Copied ' + (label || 'value')); }, function () { toast('Clipboard blocked — value: ' + value, true); });
        } else {
          toast((label || 'Value') + ': ' + value);
        }
      }
    });
  }
  function opsTable(headers, tbody) {
    return el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
      el('thead', {}, el('tr', {}, headers.map(function (h) { return el('th', { scope: 'col', text: h }); }))),
      tbody
    ]));
  }

  /* ---------- Folder 17: Module #9 Multi-Region Failover Sentinel & Health Monitor ---------- */
  function opsFailoverSentinelPanel() {
    var isAdmin = me && me.role === 'admin';
    var SUBS = [['d1', 'D1 Primary'], ['r2', 'R2 Storage'], ['edge', 'Edge POP'], ['sw', 'sw.js Canary']];
    var wrap = el('div', { class: 'panel cso-ops-sentinel-panel' }, [
      el('h2', { text: 'Multi-Region Failover Sentinel & Health Monitor' }),
      el('p', { class: 'muted', text: 'Live round-trip probes across Cloudflare D1, R2 object storage, the serving edge POP, and the service-worker canary — classified HEALTHY / DEGRADED / CRITICAL against your editable latency policy.' })
    ]);
    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis', 'aria-live': 'polite' });
    var thresholdInp = el('input', { type: 'number', id: 'f-ops-sentinel-threshold', min: '50', max: '5000', step: '10', value: '250', 'aria-label': 'Latency warning threshold in milliseconds' });
    var channelSel = el('select', { id: 'f-ops-sentinel-channel', class: 'cso-ops-policy-select', 'aria-label': 'Alert channel' }, [
      el('option', { value: 'email', text: 'Email' }),
      el('option', { value: 'webhook', text: 'Webhook' })
    ]);
    var alertsChk = el('input', { type: 'checkbox', id: 'f-ops-sentinel-alerts' });
    var subChecks = {};
    var subWrap = el('div', { class: 'cso-ops-restore-controls', role: 'group', 'aria-label': 'Monitored subsystems' });
    SUBS.forEach(function (s) {
      var cb = el('input', { type: 'checkbox', id: 'f-ops-sentinel-sub-' + s[0], checked: 'checked' });
      subChecks[s[0]] = cb;
      subWrap.appendChild(el('label', { for: 'f-ops-sentinel-sub-' + s[0], class: 'muted sm' }, [cb, ' ' + s[1]]));
    });
    var savePolicyBtn = el('button', { type: 'button', class: 'btn', disabled: !isAdmin, text: 'Save Threshold Policy' });
    var probeBtn = el('button', { type: 'button', class: 'btn primary', disabled: !isAdmin, text: 'Run Live Failover Sentinel Probe' });
    var policyBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [el('strong', { text: 'Threshold Policy' }), probeBtn]),
      el('div', { class: 'cso-ops-restore-controls' }, [
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-ops-sentinel-threshold', class: 'muted sm', text: 'Latency Warning (50–5000 ms)' }), thresholdInp]),
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-ops-sentinel-channel', class: 'muted sm', text: 'Alert Channel' }), channelSel]),
        el('label', { for: 'f-ops-sentinel-alerts', class: 'muted sm' }, [alertsChk, ' Alerts enabled']),
        savePolicyBtn
      ]),
      subWrap
    ]);
    var breakdownHost = el('div', { class: 'cso-ops-vault-table-host' });
    wrap.appendChild(kpiStrip);
    wrap.appendChild(policyBox);
    wrap.appendChild(breakdownHost);

    var busy = false;
    function postureCls(p) { return p === 'HEALTHY' ? 'published' : (p === 'DEGRADED' ? 'scheduled' : 'expired'); }

    function render(probe, lastAt) {
      var edge = probe.edge || {};
      clear(kpiStrip);
      kpiStrip.appendChild(opsKpiCard('Overall Posture', el('span', { class: 'badge ' + postureCls(probe.posture), text: probe.posture || 'UNKNOWN' }), 'Threshold ' + (probe.threshold_ms || 0) + ' ms'));
      kpiStrip.appendChild(opsKpiCard('D1 Round-Trip Latency', el('span', { class: 'cso-tabular', text: (probe.d1_latency_ms || 0) + ' ms' }), 'SELECT 1 + row counts'));
      kpiStrip.appendChild(opsKpiCard('R2 Storage Latency', el('span', { class: 'cso-tabular', text: (probe.r2_latency_ms || 0) + ' ms' }), 'list / head reachability'));
      kpiStrip.appendChild(opsKpiCard('Edge Colo / Region', el('code', { class: 'cso-ops-sha-code', text: (edge.colo || 'LOCAL') + ' · ' + (edge.country || 'IN') }), lastAt ? ('Last persisted probe ' + fmtDate(lastAt)) : 'No persisted probe yet'));
      var tb = el('tbody');
      (probe.subsystems || []).forEach(function (s) {
        var st = !s.monitored ? 'UNMONITORED' : (s.status === 'UP' && s.over_threshold ? 'SLOW' : s.status);
        var cls = st === 'UP' ? 'published' : (st === 'SLOW' || st === 'DEGRADED' ? 'scheduled' : (st === 'UNMONITORED' ? 'draft' : 'expired'));
        tb.appendChild(el('tr', {}, [
          el('td', { text: s.label }),
          el('td', {}, el('span', { class: 'badge ' + cls, text: st })),
          el('td', { class: 'cso-tabular', text: s.latency_ms === null || s.latency_ms === undefined ? '—' : s.latency_ms + ' ms' }),
          el('td', { class: 'muted sm', text: s.detail || '' })
        ]));
      });
      clear(breakdownHost);
      breakdownHost.appendChild(el('h3', { text: 'Subsystem Health Breakdown' }));
      breakdownHost.appendChild(opsTable(['Subsystem', 'Status', 'Latency', 'Detail'], tb));
    }

    function applyConfig(cfg) {
      if (!cfg) return;
      thresholdInp.value = String(cfg.latency_warning_ms || 250);
      channelSel.value = cfg.alert_channel || 'email';
      alertsChk.checked = Boolean(cfg.alerts_enabled);
      SUBS.forEach(function (s) { subChecks[s[0]].checked = (cfg.monitored_subsystems || []).indexOf(s[0]) !== -1; });
    }

    async function load() {
      clear(kpiStrip).appendChild(el('p', { class: 'muted sm', text: 'Probing D1, R2 & edge…' }));
      try {
        var res = await api('GET', 'ops/sentinel');
        applyConfig(res.config);
        render(res.live, res.last_probe_at);
      } catch (err) {
        clear(kpiStrip).appendChild(opsErrorBanner('Sentinel status unavailable', err, load));
      }
    }

    async function savePolicy() {
      if (busy || !isAdmin) return;
      var n = Number(thresholdInp.value);
      if (!Number.isInteger(n) || n < 50 || n > 5000) { toast('Threshold must be a whole number between 50 and 5000 ms', true); thresholdInp.focus(); return; }
      var subs = SUBS.map(function (s) { return s[0]; }).filter(function (k) { return subChecks[k].checked; });
      if (!subs.length) { toast('Select at least one subsystem to monitor', true); return; }
      busy = true; savePolicyBtn.disabled = true; savePolicyBtn.textContent = 'Saving…';
      try {
        var res = await api('PUT', 'ops/sentinel/config', { latency_warning_ms: n, monitored_subsystems: subs, alerts_enabled: alertsChk.checked, alert_channel: channelSel.value });
        applyConfig(res.config);
        toast('Sentinel policy saved (' + res.config.latency_warning_ms + ' ms)');
      } catch (err) {
        toast(err && err.message ? err.message : 'Failed to save policy', true);
      } finally {
        busy = false; savePolicyBtn.disabled = !isAdmin; savePolicyBtn.textContent = 'Save Threshold Policy';
      }
    }

    async function probe() {
      if (busy || !isAdmin) return;
      busy = true; probeBtn.disabled = true; probeBtn.textContent = 'Probing…';
      try {
        var res = await api('POST', 'ops/sentinel/probe', {});
        render(res, res.probed_at);
        toast('Sentinel posture: ' + res.posture + ' (D1 ' + res.d1_latency_ms + ' ms · R2 ' + res.r2_latency_ms + ' ms)', res.posture === 'CRITICAL');
      } catch (err) {
        toast(err && err.message ? err.message : 'Sentinel probe failed', true);
      } finally {
        busy = false; probeBtn.disabled = !isAdmin; probeBtn.textContent = 'Run Live Failover Sentinel Probe';
      }
    }

    savePolicyBtn.addEventListener('click', savePolicy);
    probeBtn.addEventListener('click', probe);
    load();
    return wrap;
  }

  /* ---------- Folder 17: Module #10 Snapshot Integrity Hash & Cryptographic Verifier ---------- */
  function opsIntegrityVerifierPanel() {
    var isAdmin = me && me.role === 'admin';
    var wrap = el('div', { class: 'panel cso-ops-vault-panel' }, [
      el('h2', { text: 'Snapshot Integrity Hash & Cryptographic Verifier' }),
      el('p', { class: 'muted', text: 'Recomputes SHA-256 digests directly from live R2 snapshot bytes and compares them 1:1 with the D1 ledger to detect tampered, corrupted, or missing blobs.' })
    ]);
    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis', 'aria-live': 'polite' });
    var verifyAllBtn = el('button', { type: 'button', class: 'btn primary', disabled: !isAdmin, text: 'Verify Entire R2 Vault Now' });
    var controls = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [el('strong', { text: 'Vault-Wide Cryptographic Audit' }), verifyAllBtn]),
      el('p', { class: 'hint', text: 'Read-only: no snapshot is modified. Each run is recorded as ops.integrity.audit in the audit log.' })
    ]);
    var tableHost = el('div', { class: 'cso-ops-vault-table-host' });
    wrap.appendChild(kpiStrip);
    wrap.appendChild(controls);
    wrap.appendChild(tableHost);
    var busy = false;

    function renderKpis(a, snapCount) {
      clear(kpiStrip);
      kpiStrip.appendChild(opsKpiCard('Total Snapshots Audited', el('span', { class: 'cso-tabular', text: String(a ? a.total_audited : 0) }), (snapCount || 0) + ' in D1 ledger'));
      kpiStrip.appendChild(opsKpiCard('Cryptographically Verified', el('span', { class: 'badge published', text: String(a ? a.verified_count : 0) }), 'SHA-256 parity confirmed'));
      var bad = a ? (a.mismatch_count + a.missing_count) : 0;
      kpiStrip.appendChild(opsKpiCard('Mismatches / Missing Blobs', el('span', { class: 'badge ' + (bad ? 'expired' : 'published'), text: (a ? a.mismatch_count : 0) + ' / ' + (a ? a.missing_count : 0) }), a ? ('Vault posture: ' + a.vault_posture) : 'Not audited yet'));
      kpiStrip.appendChild(opsKpiCard('Last Full Audit', el('span', { text: a && a.audited_at ? fmtDate(a.audited_at) : 'Never' }), a && a.audited_by ? ('By ' + a.audited_by) : ''));
    }

    function renderTable(a, snapCount) {
      clear(tableHost);
      if (!snapCount && (!a || !a.total_audited)) {
        tableHost.appendChild(el('div', { class: 'cso-ops-empty-vault' }, [
          el('strong', { text: 'No snapshots to verify yet' }),
          el('p', { class: 'muted sm', text: 'Create your first platform snapshot in Module #1, then return here to verify it cryptographically.' }),
          el('a', { class: 'btn primary', href: '#/operations/snapshots', text: 'Open Snapshot Vault (Module #1)' })
        ]));
        return;
      }
      if (!a || !Array.isArray(a.items) || !a.items.length) {
        tableHost.appendChild(el('p', { class: 'muted', text: 'Run "Verify Entire R2 Vault Now" to compute per-snapshot SHA-256 parity.' }));
        return;
      }
      var tb = el('tbody');
      a.items.forEach(function (it) {
        var cls = it.status === 'VERIFIED' ? 'published' : 'expired';
        tb.appendChild(el('tr', {}, [
          el('td', { text: it.label || it.id }),
          el('td', {}, [el('code', { class: 'cso-ops-sha-code', title: it.expected_sha256 || '', text: String(it.expected_sha256 || '—').slice(0, 16) + '…' }), ' ', opsCopyBtn(it.expected_sha256, 'expected SHA-256')]),
          el('td', {}, [el('code', { class: 'cso-ops-sha-code', title: it.computed_sha256 || '', text: it.computed_sha256 ? it.computed_sha256.slice(0, 16) + '…' : '—' }), ' ', opsCopyBtn(it.computed_sha256, 'computed SHA-256')]),
          el('td', {}, el('span', { class: 'badge ' + cls, text: it.status }))
        ]));
      });
      tableHost.appendChild(el('h3', { text: 'Per-Snapshot SHA-256 Comparison' }));
      tableHost.appendChild(opsTable(['Snapshot', 'Expected D1 SHA-256', 'Computed R2 SHA-256', 'Status'], tb));
    }

    async function load() {
      clear(kpiStrip).appendChild(el('p', { class: 'muted sm', text: 'Loading last integrity audit…' }));
      try {
        var res = await api('GET', 'ops/snapshots/verify-all');
        renderKpis(res.last_audit, res.snapshot_count);
        renderTable(res.last_audit, res.snapshot_count);
      } catch (err) {
        clear(kpiStrip).appendChild(opsErrorBanner('Could not load integrity audit', err, load));
      }
    }

    async function verifyAll() {
      if (busy || !isAdmin) return;
      busy = true; verifyAllBtn.disabled = true; verifyAllBtn.textContent = 'Hashing R2 blobs…';
      try {
        var res = await api('POST', 'ops/snapshots/verify-all', {});
        renderKpis(res, res.total_audited);
        renderTable(res, res.total_audited);
        var bad = res.mismatch_count + res.missing_count;
        toast(bad ? ('Integrity audit: ' + bad + ' snapshot(s) FAILED verification') : ('All ' + res.verified_count + ' snapshots verified'), bad > 0);
      } catch (err) {
        toast(err && err.message ? err.message : 'Integrity audit failed', true);
      } finally {
        busy = false; verifyAllBtn.disabled = !isAdmin; verifyAllBtn.textContent = 'Verify Entire R2 Vault Now';
      }
    }

    verifyAllBtn.addEventListener('click', verifyAll);
    load();
    return wrap;
  }

  /* ---------- Folder 17: Module #11 Dead-Letter Queue & Orphaned Revision Vacuum ---------- */
  function opsDeadLetterVacuumPanel() {
    var isAdmin = me && me.role === 'admin';
    var CATS = [
      ['sessions', 'Expired sessions'],
      ['admin_otps', 'Expired admin OTPs'],
      ['admin_rate_limits', 'Stale rate-limit windows (>24h)'],
      ['site_page_revisions', 'Excess page revisions (beyond keep limit)'],
      ['orphaned_revisions', 'Orphaned revisions (deleted routes, beyond retention)'],
      ['audit_log', 'Audit log entries beyond retention']
    ];
    var wrap = el('div', { class: 'panel cso-ops-hygiene-panel' }, [
      el('h2', { text: 'Dead-Letter Queue & Orphaned Revision Vacuum' }),
      el('p', { class: 'muted', text: 'Preview and purge expired auth tokens, stale rate-limit windows, orphaned page revisions, and audit entries beyond your retention window (DPDP Act 2023 storage limitation).' })
    ]);
    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis', 'aria-live': 'polite' });
    var retentionSel = el('select', { id: 'f-ops-vac-retention', class: 'cso-ops-policy-select', 'aria-label': 'Retention window in days' },
      [7, 30, 60, 90, 180, 365].map(function (d) { return el('option', { value: String(d), text: d + ' days', selected: d === 90 }); }));
    var previewBtn = el('button', { type: 'button', class: 'btn', text: 'Preview Reclaimable Rows (Dry Run)' });
    var confirmInp = el('input', { type: 'text', id: 'f-ops-vac-confirm', class: 'cso-ops-confirm-input', autocomplete: 'off', placeholder: 'Type VACUUM', 'aria-label': 'Type VACUUM to confirm' });
    var execBtn = el('button', { type: 'button', class: 'btn danger', disabled: true, text: 'Execute Dead-Letter Vacuum' });
    var controls = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [el('strong', { text: 'Retention Policy & Execution' }), el('span', { class: 'badge published', text: 'DPDP Storage Limitation' })]),
      el('div', { class: 'cso-ops-restore-controls' }, [
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-ops-vac-retention', class: 'muted sm', text: 'Retention Window' }), retentionSel]),
        previewBtn,
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-ops-vac-confirm', class: 'muted sm', text: 'Confirmation' }), confirmInp]),
        execBtn
      ])
    ]);
    var matrixHost = el('div', { class: 'cso-ops-vault-table-host' });
    wrap.appendChild(kpiStrip);
    wrap.appendChild(controls);
    wrap.appendChild(matrixHost);
    var busy = false;
    var lastVacuum = null;

    function syncExec() { execBtn.disabled = !isAdmin || busy || confirmInp.value.trim() !== 'VACUUM'; }

    function render(rep) {
      var t = rep.tables || {};
      lastVacuum = rep.last_vacuum || lastVacuum;
      clear(kpiStrip);
      kpiStrip.appendChild(opsKpiCard(rep.dry_run ? 'Total Reclaimable Dead Rows' : 'Rows Purged', el('span', { class: 'cso-tabular', text: String(rep.total_reclaimed || 0) }), '≈ ' + fmtBytes(rep.estimated_reclaimable_bytes || 0)));
      kpiStrip.appendChild(opsKpiCard('Orphaned Revisions', el('span', { class: 'cso-tabular', text: String((t.orphaned_revisions || 0) + (t.site_page_revisions || 0)) }), 'Orphaned + excess beyond keep limit'));
      kpiStrip.appendChild(opsKpiCard('Expired Auth / OTP Records', el('span', { class: 'cso-tabular', text: String((t.sessions || 0) + (t.admin_otps || 0)) }), 'sessions + admin_otps'));
      kpiStrip.appendChild(opsKpiCard('Last Vacuum', el('span', { text: lastVacuum && lastVacuum.executed_at ? fmtDate(lastVacuum.executed_at) : 'Never' }), lastVacuum ? ((lastVacuum.total_reclaimed || 0) + ' rows · ' + (lastVacuum.executed_by || 'admin')) : ''));
      var tb = el('tbody');
      CATS.forEach(function (c) {
        var present = !rep.tables_present || rep.tables_present[c[0] === 'orphaned_revisions' ? 'site_page_revisions' : c[0]] !== false;
        tb.appendChild(el('tr', {}, [
          el('td', {}, el('code', { text: c[0] })),
          el('td', { text: c[1] }),
          el('td', { class: 'cso-tabular', text: present ? String(t[c[0]] || 0) : '—' }),
          el('td', {}, el('span', { class: 'badge ' + (!present ? 'draft' : ((t[c[0]] || 0) ? 'scheduled' : 'published')), text: !present ? 'TABLE ABSENT' : ((t[c[0]] || 0) ? (rep.dry_run ? 'RECLAIMABLE' : 'PURGED') : 'CLEAN') }))
        ]));
      });
      clear(matrixHost);
      matrixHost.appendChild(el('h3', { text: (rep.dry_run ? 'Dry-Run Preview' : 'Vacuum Result') + ' · retention ' + rep.retention_days + ' days' }));
      matrixHost.appendChild(opsTable(['Table / Category', 'Description', 'Rows', 'State'], tb));
    }

    async function preview() {
      if (busy) return;
      busy = true; previewBtn.disabled = true; previewBtn.textContent = 'Scanning…'; syncExec();
      try {
        var res = await api('GET', 'ops/vacuum?retention_days=' + encodeURIComponent(retentionSel.value));
        render(res);
      } catch (err) {
        clear(kpiStrip).appendChild(opsErrorBanner('Vacuum preview failed', err, preview));
      } finally {
        busy = false; previewBtn.disabled = false; previewBtn.textContent = 'Preview Reclaimable Rows (Dry Run)'; syncExec();
      }
    }

    async function execute() {
      if (busy || !isAdmin || confirmInp.value.trim() !== 'VACUUM') return;
      busy = true; syncExec(); execBtn.textContent = 'Purging…'; previewBtn.disabled = true;
      try {
        var res = await api('POST', 'ops/vacuum', { dry_run: false, confirm: 'VACUUM', retention_days: Number(retentionSel.value) });
        render(res);
        confirmInp.value = '';
        toast('Vacuum purged ' + (res.total_reclaimed || 0) + ' dead-letter rows');
      } catch (err) {
        toast(err && err.message ? err.message : 'Vacuum failed', true);
      } finally {
        busy = false; execBtn.textContent = 'Execute Dead-Letter Vacuum'; previewBtn.disabled = false; syncExec();
      }
    }

    confirmInp.addEventListener('input', syncExec);
    retentionSel.addEventListener('change', preview);
    previewBtn.addEventListener('click', preview);
    execBtn.addEventListener('click', execute);
    preview();
    return wrap;
  }

  /* ---------- Folder 17: Module #12 Emergency Read-Only Maintenance Freeze ---------- */
  function opsMaintenanceFreezePanel() {
    var isAdmin = me && me.role === 'admin';
    var wrap = el('div', { class: 'panel cso-ops-sentinel-panel' }, [
      el('h2', { text: 'Emergency Read-Only Maintenance Freeze' }),
      el('p', { class: 'muted', text: 'Instantly block public and editor writes (HTTP 503) while Super Admins keep emergency recovery access to login, 2FA, and /api/admin/ops/*.' })
    ]);
    var postureBanner = el('div', { class: 'alert ok cso-ops-freeze-banner', role: 'status', 'aria-live': 'polite', text: 'Checking platform write-lock state…' });
    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis' });
    var reasonInp = el('input', { type: 'text', id: 'f-ops-freeze-reason', class: 'cso-ops-freeze-input', maxLength: '280', placeholder: 'Internal maintenance reason (shown in 503 responses)' });
    var bannerInp = el('textarea', { id: 'f-ops-freeze-banner', rows: '2', maxLength: '280', placeholder: 'Public maintenance banner text' });
    var bannerPreview = el('div', { class: 'alert cso-ops-freeze-banner', role: 'note' });
    var confirmInp = el('input', { type: 'text', id: 'f-ops-freeze-confirm', class: 'cso-ops-confirm-input', autocomplete: 'off', 'aria-label': 'Confirmation phrase' });
    var toggleBtn = el('button', { type: 'button', class: 'btn danger', disabled: true, text: 'Activate Read-Only Freeze' });
    var historyHost = el('div', { class: 'cso-ops-vault-table-host' });
    var editor = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [el('strong', { text: 'Maintenance Notice & Lockdown Control' })]),
      el('div', { class: 'form' }, [
        el('label', { for: 'f-ops-freeze-reason', text: 'Maintenance Reason' }), reasonInp,
        el('label', { for: 'f-ops-freeze-banner', text: 'Public Banner Text' }), bannerInp,
        el('span', { class: 'muted sm', text: 'Live banner preview:' }), bannerPreview
      ]),
      el('div', { class: 'cso-ops-restore-controls' }, [
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-ops-freeze-confirm', class: 'muted sm', text: 'Confirmation' }), confirmInp]),
        toggleBtn
      ])
    ]);
    wrap.appendChild(postureBanner);
    wrap.appendChild(kpiStrip);
    wrap.appendChild(editor);
    wrap.appendChild(historyHost);

    var state = { enabled: false };
    var busy = false;
    function expected() { return state.enabled ? 'UNFREEZE' : 'FREEZE'; }
    function syncBtn() { toggleBtn.disabled = !isAdmin || busy || confirmInp.value.trim() !== expected(); }
    function syncPreview() { bannerPreview.textContent = (bannerInp.value || '').trim() || 'CS Odisha is in scheduled maintenance. Browsing works normally; submissions are paused for a few minutes.'; }

    function render(freeze, history) {
      state = freeze || { enabled: false };
      postureBanner.className = 'alert cso-ops-freeze-banner' + (state.enabled ? ' is-frozen' : ' ok');
      postureBanner.textContent = state.enabled ? 'EMERGENCY READ-ONLY FREEZE ACTIVE — public & editor writes return HTTP 503' : 'NORMAL READ/WRITE — all endpoints accepting traffic';
      clear(kpiStrip);
      kpiStrip.appendChild(opsKpiCard('Lockdown Posture', el('span', { class: 'badge ' + (state.enabled ? 'expired' : 'published'), text: state.enabled ? 'FROZEN' : 'NORMAL' }), state.enabled ? 'Writes blocked' : 'Writes allowed'));
      kpiStrip.appendChild(opsKpiCard('Last Changed', el('span', { text: state.activated_at ? fmtDate(state.activated_at) : 'Never' }), state.activated_by ? ('By ' + state.activated_by) : ''));
      kpiStrip.appendChild(opsKpiCard('Admin Recovery Access', el('span', { class: 'badge published', text: 'RETAINED' }), '/api/admin/login · auth · ops/*'));
      if (document.activeElement !== reasonInp) reasonInp.value = state.reason || '';
      if (document.activeElement !== bannerInp) bannerInp.value = state.banner || '';
      syncPreview();
      confirmInp.value = '';
      confirmInp.placeholder = 'Type ' + expected();
      toggleBtn.className = state.enabled ? 'btn primary' : 'btn danger';
      toggleBtn.textContent = state.enabled ? 'Lift Freeze & Restore Writes' : 'Activate Read-Only Freeze';
      syncBtn();
      clear(historyHost);
      historyHost.appendChild(el('h3', { text: 'Recent Freeze Audit History' }));
      var list = Array.isArray(history) ? history : [];
      if (!list.length) { historyHost.appendChild(el('p', { class: 'muted sm', text: 'No freeze toggles recorded yet.' })); return; }
      var tb = el('tbody');
      list.forEach(function (h) {
        tb.appendChild(el('tr', {}, [
          el('td', { class: 'muted sm', text: fmtDate(h.created_at) }),
          el('td', { text: h.actor }),
          el('td', {}, el('span', { class: 'badge ' + (h.enabled ? 'expired' : 'published'), text: h.enabled ? 'FROZE' : 'LIFTED' })),
          el('td', { class: 'muted sm', text: h.reason || '—' })
        ]));
      });
      historyHost.appendChild(opsTable(['When', 'Actor', 'Action', 'Reason'], tb));
    }

    async function load() {
      try {
        var res = await api('GET', 'ops/freeze');
        render(res.freeze, res.history);
      } catch (err) {
        clear(kpiStrip).appendChild(opsErrorBanner('Could not load freeze state', err, load));
      }
    }

    async function toggle() {
      if (busy || !isAdmin || confirmInp.value.trim() !== expected()) return;
      var next = !state.enabled;
      busy = true; syncBtn(); toggleBtn.textContent = next ? 'Activating Freeze…' : 'Lifting Freeze…';
      try {
        var res = await api('POST', 'ops/freeze', { enabled: next, confirm: expected(), reason: reasonInp.value.trim(), banner: bannerInp.value.trim() });
        busy = false;
        render(res.freeze, res.history);
        toast(next ? 'Emergency Read-Only Freeze ACTIVATED' : 'Freeze lifted — live writes restored');
      } catch (err) {
        busy = false;
        toast(err && err.message ? err.message : 'Failed to toggle freeze', true);
        render(state, null);
        load();
      }
    }

    confirmInp.addEventListener('input', syncBtn);
    bannerInp.addEventListener('input', syncPreview);
    toggleBtn.addEventListener('click', toggle);
    syncPreview();
    load();
    return wrap;
  }

  /* ---------- Folder 17: Module #13 Forensic Audit & State Diff Inspector ---------- */
  function opsForensicsDiffPanel() {
    var isAdmin = me && me.role === 'admin';
    var wrap = el('div', { class: 'panel cso-ops-hygiene-panel' }, [
      el('h2', { text: 'Forensic Audit & State Diff Inspector' }),
      el('p', { class: 'muted', text: 'Search and paginate DPDP-redacted admin/security audit events, export forensic logs, and run non-destructive two-snapshot state diffs.' })
    ]);

    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis', 'aria-live': 'polite' });
    var qInp = el('input', { type: 'search', id: 'f-ops-for-q', class: 'cso-ops-filter-input', placeholder: 'Search action, target, detail…', 'aria-label': 'Search forensic logs' });
    var catSel = el('select', { id: 'f-ops-for-cat', class: 'cso-ops-policy-select', 'aria-label': 'Action category' }, [
      el('option', { value: '', text: 'All Categories' }),
      el('option', { value: 'ops.', text: 'Snapshots & DR (ops.)' }),
      el('option', { value: 'auth.', text: 'Security & Auth (auth.)' }),
      el('option', { value: 'ops.freeze', text: 'Freeze Events (ops.freeze)' }),
      el('option', { value: 'ops.ddl', text: 'Schema & Hygiene (ops.ddl)' }),
      el('option', { value: 'post.', text: 'Content & Users (post.)' })
    ]);
    var actorInp = el('input', { type: 'text', id: 'f-ops-for-actor', class: 'cso-ops-filter-input', placeholder: 'Filter actor email/id…', 'aria-label': 'Filter by actor' });
    var searchBtn = el('button', { type: 'button', class: 'btn primary sm', text: 'Apply Filter' });
    var exportJsonBtn = el('a', { class: 'btn sm', href: '/api/admin/ops/forensics?download=1&limit=100', download: 'cso-forensic-audit.json', text: 'Export Forensic Log (JSON)' });
    var exportCsvBtn = el('a', { class: 'btn sm', href: '/api/admin/ops/forensics?format=csv&limit=100', download: 'cso-forensic-audit.csv', text: 'Export CSV' });

    var filterBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'Forensic Trail Filter & Export' }),
        el('div', { class: 'actions' }, [exportJsonBtn, exportCsvBtn])
      ]),
      el('div', { class: 'cso-ops-filter-bar' }, [qInp, catSel, actorInp, searchBtn])
    ]);

    var tableHost = el('div', { class: 'cso-ops-vault-table-host' });
    var pagerBar = el('div', { class: 'cso-ops-subhead' });

    // Two-Snapshot State Diff Comparator
    var snapASel = el('select', { id: 'f-ops-diff-a', class: 'cso-ops-snap-select', 'aria-label': 'Snapshot A' });
    var snapBSel = el('select', { id: 'f-ops-diff-b', class: 'cso-ops-snap-select', 'aria-label': 'Snapshot B or Live D1' });
    var diffBtn = el('button', { type: 'button', class: 'btn primary', disabled: !isAdmin, text: 'Compare State Diff' });
    var diffHost = el('div');
    var diffBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'Two-Snapshot State Diff Comparator (Read-Only)' }),
        diffBtn
      ]),
      el('div', { class: 'cso-ops-restore-controls' }, [
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-ops-diff-a', class: 'muted sm', text: 'Baseline Snapshot A' }), snapASel]),
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-ops-diff-b', class: 'muted sm', text: 'Target Snapshot B / Live D1' }), snapBSel])
      ]),
      diffHost
    ]);

    wrap.appendChild(kpiStrip);
    wrap.appendChild(filterBox);
    wrap.appendChild(tableHost);
    wrap.appendChild(pagerBar);
    wrap.appendChild(diffBox);

    var state = { offset: 0, limit: 25, total: 0 };
    var diffBusy = false;

    function syncExportUrls() {
      var qs = 'action_prefix=' + encodeURIComponent(catSel.value || '') +
        '&actor=' + encodeURIComponent(actorInp.value.trim()) +
        '&q=' + encodeURIComponent(qInp.value.trim()) + '&limit=100';
      exportJsonBtn.setAttribute('href', '/api/admin/ops/forensics?download=1&' + qs);
      exportCsvBtn.setAttribute('href', '/api/admin/ops/forensics?format=csv&' + qs);
    }

    async function loadLogs() {
      syncExportUrls();
      clear(tableHost).appendChild(el('p', { class: 'muted sm', text: 'Loading DPDP-redacted forensic audit logs…' }));
      try {
        var qs = 'ops/forensics?limit=' + state.limit + '&offset=' + state.offset +
          '&action_prefix=' + encodeURIComponent(catSel.value || '') +
          '&actor=' + encodeURIComponent(actorInp.value.trim()) +
          '&q=' + encodeURIComponent(qInp.value.trim());
        var res = await api('GET', qs);
        state.total = Number(res.total) || 0;

        clear(kpiStrip);
        kpiStrip.appendChild(opsKpiCard('Total Matching Events', el('span', { class: 'cso-tabular', text: String(state.total) }), 'Paginated 25/page'));
        kpiStrip.appendChild(opsKpiCard('Unique Admin Actors', el('span', { class: 'cso-tabular', text: String(res.unique_actors || 0) }), 'Distinct actor IDs'));
        kpiStrip.appendChild(opsKpiCard('Last 24h Operations', el('span', { class: 'cso-tabular', text: String(res.last_24h_count || 0) }), 'Recent mutating events'));
        kpiStrip.appendChild(opsKpiCard('DPDP Redaction Shield', el('span', { class: 'badge published', text: res.dpdp_redacted ? 'ACTIVE · SCRUBBED' : 'ACTIVE' }), 'Tokens/hashes redacted'));

        clear(tableHost);
        var items = Array.isArray(res.items) ? res.items : [];
        if (!items.length) {
          tableHost.appendChild(el('div', { class: 'cso-ops-empty-vault' }, [
            el('strong', { text: 'No matching forensic events' }),
            el('p', { class: 'muted sm', text: 'Clear the search filter or perform an admin operation to populate the forensic audit trail.' })
          ]));
        } else {
          var tb = el('tbody');
          items.forEach(function (ev) {
            var det = el('details', { class: 'cso-ops-ddl-details' }, [
              el('summary', { class: 'cso-ops-ddl-summary', text: 'Inspect redacted JSON (' + ((ev.diff && ev.diff.change_count) || 0) + ' fields)' }),
              el('pre', { class: 'cso-ops-diff-pre', text: JSON.stringify(ev.metadata || {}, null, 2) })
            ]);
            tb.appendChild(el('tr', {}, [
              el('td', { class: 'cso-tabular muted sm', text: '#' + ev.id }),
              el('td', { class: 'muted sm', text: fmtDate(ev.created_at) }),
              el('td', { class: 'sm', text: ev.actor_email || 'system' }),
              el('td', {}, el('code', { text: ev.action })),
              el('td', { class: 'sm', text: (ev.target_type || '—') + (ev.target_id ? ':' + ev.target_id : '') }),
              el('td', {}, det)
            ]));
          });
          tableHost.appendChild(opsTable(['ID', 'Time', 'Actor', 'Action', 'Target', 'Payload / Diff'], tb));
        }

        clear(pagerBar);
        var prevBtn = el('button', { type: 'button', class: 'btn sm', disabled: state.offset <= 0, text: '← Previous', onclick: function () { state.offset = Math.max(0, state.offset - state.limit); loadLogs(); } });
        var nextBtn = el('button', { type: 'button', class: 'btn sm', disabled: state.offset + state.limit >= state.total, text: 'Next →', onclick: function () { state.offset += state.limit; loadLogs(); } });
        var showingFrom = state.total ? (state.offset + 1) : 0;
        var showingTo = Math.min(state.total, state.offset + items.length);
        pagerBar.appendChild(el('span', { class: 'muted sm cso-tabular', text: 'Showing ' + showingFrom + '–' + showingTo + ' of ' + state.total + ' events' }));
        pagerBar.appendChild(el('div', { class: 'actions' }, [prevBtn, nextBtn]));
      } catch (err) {
        clear(kpiStrip).appendChild(opsErrorBanner('Forensic log load failed', err, loadLogs));
        clear(tableHost);
      }
    }

    async function loadSnapshotChoices() {
      try {
        var r = await api('GET', 'ops/snapshots');
        var list = Array.isArray(r.items) ? r.items : [];
        clear(snapASel);
        clear(snapBSel);
        snapBSel.appendChild(el('option', { value: 'LIVE_D1', text: 'Live Cloudflare D1 Database (Current)', selected: true }));
        if (!list.length) {
          snapASel.appendChild(el('option', { value: '', text: 'No snapshots available' }));
        } else {
          list.forEach(function (s, idx) {
            var lbl = (s.label || s.id) + ' (' + fmtDate(s.created_at) + ')';
            snapASel.appendChild(el('option', { value: s.id, text: lbl, selected: idx === 0 }));
            snapBSel.appendChild(el('option', { value: s.id, text: lbl }));
          });
        }
      } catch {}
    }

    async function runDiff() {
      if (diffBusy || !isAdmin) return;
      var a = snapASel.value;
      if (!a) { toast('Select Baseline Snapshot A first', true); return; }
      diffBusy = true; diffBtn.disabled = true; diffBtn.textContent = 'Comparing…';
      clear(diffHost).appendChild(el('p', { class: 'muted sm', text: 'Computing row-by-row state diff…' }));
      try {
        var res = await api('POST', 'ops/forensics/diff', { snapshot_a: a, snapshot_b: snapBSel.value || 'LIVE_D1' });
        clear(diffHost);
        diffHost.appendChild(el('div', { class: 'alert ok', text: 'Compared ' + res.tables_compared + ' tables · ' + res.total_changes + ' total row differences detected between "' + res.snapshot_a.label + '" and "' + res.snapshot_b.label + '".' }));
        var tb = el('tbody');
        (res.table_diffs || []).forEach(function (td) {
          tb.appendChild(el('tr', {}, [
            el('td', {}, el('code', { text: td.table })),
            el('td', { class: 'cso-tabular', text: String(td.rows_a) }),
            el('td', { class: 'cso-tabular', text: String(td.rows_b) }),
            el('td', { class: 'cso-tabular', text: '+' + td.added_rows + ' / ~' + td.modified_rows + ' / -' + td.removed_rows }),
            el('td', {}, el('span', { class: 'badge ' + ((td.added_rows + td.modified_rows + td.removed_rows) > 0 ? 'scheduled' : 'published'), text: (td.added_rows + td.modified_rows + td.removed_rows) > 0 ? 'CHANGED' : 'IDENTICAL' }))
          ]));
        });
        diffHost.appendChild(opsTable(['Table', 'A Rows', 'B Rows', '+Add / ~Mod / -Del', 'Status'], tb));
      } catch (err) {
        clear(diffHost).appendChild(el('div', { class: 'alert', text: err && err.message ? err.message : 'Diff comparison failed' }));
      } finally {
        diffBusy = false; diffBtn.disabled = !isAdmin; diffBtn.textContent = 'Compare State Diff';
      }
    }

    searchBtn.addEventListener('click', function () { state.offset = 0; loadLogs(); });
    catSel.addEventListener('change', function () { state.offset = 0; loadLogs(); });
    diffBtn.addEventListener('click', runDiff);
    loadLogs();
    loadSnapshotChoices();
    return wrap;
  }

  /* ---------- Folder 17: Module #14 Automated Backup Retention & Pruning Policy ---------- */
  function opsRetentionPruningPanel() {
    var isAdmin = me && me.role === 'admin';
    var wrap = el('div', { class: 'panel cso-ops-hygiene-panel' }, [
      el('h2', { text: 'Automated Backup Retention & Pruning Policy' }),
      el('p', { class: 'muted', text: 'Configure retention windows, preview prunable scheduled snapshots vs WORM/pinned safety backups, and prune expired blobs safely with PRUNE confirmation.' })
    ]);

    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis', 'aria-live': 'polite' });
    var dailyDaysInp = el('input', { type: 'number', id: 'f-ops-ret-daily', class: 'cso-ops-policy-age', min: '1', max: '3650', value: '30', 'aria-label': 'Keep daily days' });
    var weeklyInp = el('input', { type: 'number', id: 'f-ops-ret-weekly', class: 'cso-ops-policy-age', min: '0', max: '520', value: '12', 'aria-label': 'Keep weekly count' });
    var monthlyInp = el('input', { type: 'number', id: 'f-ops-ret-monthly', class: 'cso-ops-policy-age', min: '0', max: '120', value: '12', 'aria-label': 'Keep monthly count' });
    var maxTotalInp = el('input', { type: 'number', id: 'f-ops-ret-max', class: 'cso-ops-policy-age', min: '5', max: '500', value: '30', 'aria-label': 'Max total snapshots' });
    var autoPruneChk = el('input', { type: 'checkbox', id: 'f-ops-ret-auto' });
    var savePolicyBtn = el('button', { type: 'button', class: 'btn primary', disabled: !isAdmin, text: 'Save Policy' });

    var policyBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'Retention Policy Configuration' }),
        el('span', { class: 'badge published', text: 'WORM & Pre-Restore Protected' })
      ]),
      el('div', { class: 'cso-ops-restore-controls' }, [
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-ops-ret-daily', class: 'muted sm', text: 'Daily Retention (1–3650d)' }), dailyDaysInp]),
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-ops-ret-weekly', class: 'muted sm', text: 'Keep Weekly Count' }), weeklyInp]),
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-ops-ret-monthly', class: 'muted sm', text: 'Keep Monthly Count' }), monthlyInp]),
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-ops-ret-max', class: 'muted sm', text: 'Max Snapshots (5–500)' }), maxTotalInp]),
        el('label', { for: 'f-ops-ret-auto', class: 'cso-ops-inline-check' }, [autoPruneChk, ' Auto-prune enabled']),
        savePolicyBtn
      ])
    ]);

    var previewPruneBtn = el('button', { type: 'button', class: 'btn', disabled: !isAdmin, text: 'Preview Prune Candidates (Dry Run)' });
    var confirmPruneInp = el('input', { type: 'text', id: 'f-ops-ret-confirm', class: 'cso-ops-confirm-input', autocomplete: 'off', placeholder: 'Type PRUNE', 'aria-label': 'Type PRUNE to confirm' });
    var execPruneBtn = el('button', { type: 'button', class: 'btn danger', disabled: true, text: 'Execute Retention Prune' });
    var execBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [el('strong', { text: 'Safe Retention Prune Execution' }), previewPruneBtn]),
      el('div', { class: 'cso-ops-restore-controls' }, [
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-ops-ret-confirm', class: 'muted sm', text: 'Confirmation Phrase' }), confirmPruneInp]),
        execPruneBtn
      ])
    ]);

    var tableHost = el('div', { class: 'cso-ops-vault-table-host' });
    wrap.appendChild(kpiStrip);
    wrap.appendChild(policyBox);
    wrap.appendChild(execBox);
    wrap.appendChild(tableHost);

    var busy = false;
    function syncPruneBtn() { execPruneBtn.disabled = !isAdmin || busy || confirmPruneInp.value.trim() !== 'PRUNE'; }

    function render(data) {
      var p = data.policy || {};
      var prev = data.preview || data;
      if (document.activeElement !== dailyDaysInp) dailyDaysInp.value = String(p.keep_daily_days || p.max_age_days || 30);
      if (document.activeElement !== weeklyInp) weeklyInp.value = String(p.keep_weekly_count !== undefined ? p.keep_weekly_count : 12);
      if (document.activeElement !== monthlyInp) monthlyInp.value = String(p.keep_monthly_count !== undefined ? p.keep_monthly_count : 12);
      if (document.activeElement !== maxTotalInp) maxTotalInp.value = String(p.max_total_snapshots || p.max_snapshots || 30);
      autoPruneChk.checked = Boolean(p.auto_prune_enabled !== undefined ? p.auto_prune_enabled : p.enabled);

      clear(kpiStrip);
      kpiStrip.appendChild(opsKpiCard('Total Vault Snapshots', el('span', { class: 'cso-tabular', text: String(prev.total_snapshots || 0) }), (prev.pinned_count || 0) + ' pinned manual/pre-restore'));
      kpiStrip.appendChild(opsKpiCard('WORM-Protected Snapshots', el('span', { class: 'badge published', text: String(prev.worm_protected_count || 0) }), 'Never pruned while sealed'));
      kpiStrip.appendChild(opsKpiCard('Prunable Snapshots', el('span', { class: 'badge ' + ((prev.prunable_count || 0) ? 'scheduled' : 'published'), text: String(prev.prunable_count || 0) }), 'Scheduled snapshots outside policy'));
      kpiStrip.appendChild(opsKpiCard('Reclaimable R2 Bytes', el('span', { class: 'cso-tabular', text: fmtBytes(prev.reclaimable_bytes || 0) }), data.last_prune ? ('Last prune: ' + fmtDate(data.last_prune.executed_at)) : 'No prune executed yet'));

      clear(tableHost);
      var cands = Array.isArray(prev.candidates) ? prev.candidates : [];
      if (!cands.length) {
        tableHost.appendChild(el('p', { class: 'muted sm', text: 'No snapshots in vault yet.' }));
        return;
      }
      var tb = el('tbody');
      cands.forEach(function (c) {
        var bCls = c.decision === 'PRUNE' ? 'expired' : (c.decision === 'KEEP_WORM' ? 'published' : 'draft');
        var bLbl = c.decision === 'KEEP_WORM' ? 'KEEP (WORM)' : (c.decision === 'PRUNE' ? 'PRUNE' : 'KEEP (Policy)');
        tb.appendChild(el('tr', {}, [
          el('td', { text: c.label || c.id }),
          el('td', {}, el('code', { text: c.trigger_type })),
          el('td', { class: 'cso-tabular', text: fmtBytes(c.size_bytes) }),
          el('td', { class: 'muted sm', text: fmtDate(c.created_at) }),
          el('td', {}, el('span', { class: 'badge ' + bCls, text: bLbl })),
          el('td', { class: 'muted sm', text: c.reason })
        ]));
      });
      tableHost.appendChild(el('h3', { text: 'Retention Candidate Classification (' + cands.length + ')' }));
      tableHost.appendChild(opsTable(['Snapshot', 'Trigger', 'Size', 'Created', 'Decision', 'Reason'], tb));
    }

    async function load() {
      clear(kpiStrip).appendChild(el('p', { class: 'muted sm', text: 'Evaluating retention candidates…' }));
      try {
        var res = await api('GET', 'ops/retention');
        render(res);
      } catch (err) {
        clear(kpiStrip).appendChild(opsErrorBanner('Could not load retention policy', err, load));
      }
    }

    async function savePolicy() {
      if (busy || !isAdmin) return;
      busy = true; savePolicyBtn.disabled = true; savePolicyBtn.textContent = 'Saving…';
      try {
        var res = await api('PUT', 'ops/retention', {
          keep_daily_days: Number(dailyDaysInp.value),
          keep_weekly_count: Number(weeklyInp.value),
          keep_monthly_count: Number(monthlyInp.value),
          max_total_snapshots: Number(maxTotalInp.value),
          auto_prune_enabled: autoPruneChk.checked
        });
        render(res);
        toast('Retention policy saved');
      } catch (err) {
        toast(err && err.message ? err.message : 'Failed to save retention policy', true);
      } finally {
        busy = false; savePolicyBtn.disabled = !isAdmin; savePolicyBtn.textContent = 'Save Policy'; syncPruneBtn();
      }
    }

    async function runDryPreview() {
      if (busy || !isAdmin) return;
      busy = true; previewPruneBtn.disabled = true; previewPruneBtn.textContent = 'Previewing…';
      try {
        var res = await api('POST', 'ops/retention/prune', { dry_run: true });
        render({ policy: null, preview: res });
        toast('Dry run: ' + (res.prunable_count || 0) + ' snapshots eligible for pruning');
      } catch (err) {
        toast(err && err.message ? err.message : 'Dry-run preview failed', true);
      } finally {
        busy = false; previewPruneBtn.disabled = !isAdmin; previewPruneBtn.textContent = 'Preview Prune Candidates (Dry Run)'; syncPruneBtn();
      }
    }

    async function executePrune() {
      if (busy || !isAdmin || confirmPruneInp.value.trim() !== 'PRUNE') return;
      busy = true; syncPruneBtn(); execPruneBtn.textContent = 'Pruning…';
      try {
        var res = await api('POST', 'ops/retention/prune', { dry_run: false, confirm: 'PRUNE' });
        confirmPruneInp.value = '';
        toast('Pruned ' + (res.pruned_count || 0) + ' expired snapshots (' + fmtBytes(res.reclaimed_bytes || 0) + ' reclaimed)');
        await load();
      } catch (err) {
        toast(err && err.message ? err.message : 'Prune failed', true);
      } finally {
        busy = false; execPruneBtn.textContent = 'Execute Retention Prune'; syncPruneBtn();
      }
    }

    confirmPruneInp.addEventListener('input', syncPruneBtn);
    savePolicyBtn.addEventListener('click', savePolicy);
    previewPruneBtn.addEventListener('click', runDryPreview);
    execPruneBtn.addEventListener('click', executePrune);
    load();
    return wrap;
  }

  /* ---------- Folder 17: Module #15 Zero-Downtime Deployment Canary & Health Gate ---------- */
  function opsCanaryGatePanel() {
    var isAdmin = me && me.role === 'admin';
    var wrap = el('div', { class: 'panel cso-ops-sentinel-panel' }, [
      el('h2', { text: 'Zero-Downtime Deployment Canary & Health Gate' }),
      el('p', { class: 'muted', text: 'Evaluate live release readiness across Service Worker cache version parity, D1 primary latency, R2 cold-vault availability, maintenance freeze posture, and core edge routes.' })
    ]);

    var gateBanner = el('div', { class: 'alert ok cso-ops-freeze-banner', role: 'status', 'aria-live': 'polite', text: 'Evaluating deployment canary gate…' });
    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis' });
    var maxLatInp = el('input', { type: 'number', id: 'f-ops-canary-lat', class: 'cso-ops-policy-age', min: '50', max: '5000', value: '500', 'aria-label': 'Max gate latency ms' });
    var reqD1Chk = el('input', { type: 'checkbox', id: 'f-ops-canary-d1', checked: 'checked' });
    var reqR2Chk = el('input', { type: 'checkbox', id: 'f-ops-canary-r2', checked: 'checked' });
    var reqSwChk = el('input', { type: 'checkbox', id: 'f-ops-canary-sw', checked: 'checked' });
    var saveCfgBtn = el('button', { type: 'button', class: 'btn', disabled: !isAdmin, text: 'Save Gate Thresholds' });
    var evalBtn = el('button', { type: 'button', class: 'btn primary', disabled: !isAdmin, text: 'Run Zero-Downtime Canary Gate' });

    var configBox = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [el('strong', { text: 'Canary Release Gate Thresholds' }), evalBtn]),
      el('div', { class: 'cso-ops-restore-controls' }, [
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-ops-canary-lat', class: 'muted sm', text: 'Max Latency (50–5000 ms)' }), maxLatInp]),
        el('label', { for: 'f-ops-canary-d1', class: 'cso-ops-inline-check' }, [reqD1Chk, ' Require D1 OK']),
        el('label', { for: 'f-ops-canary-r2', class: 'cso-ops-inline-check' }, [reqR2Chk, ' Require R2 OK']),
        el('label', { for: 'f-ops-canary-sw', class: 'cso-ops-inline-check' }, [reqSwChk, ' Require sw.js match']),
        saveCfgBtn
      ])
    ]);
    var checksGrid = el('div', { class: 'cso-ops-telemetry-grid' });

    wrap.appendChild(gateBanner);
    wrap.appendChild(kpiStrip);
    wrap.appendChild(configBox);
    wrap.appendChild(checksGrid);

    var busy = false;

    function renderGate(gate, lastGate) {
      var isGo = gate && gate.verdict === 'GO';
      gateBanner.className = 'alert cso-ops-freeze-banner' + (isGo ? ' ok' : ' is-frozen');
      gateBanner.textContent = isGo
        ? 'RELEASE GATE: GO (PASS) — All required canary checks green for zero-downtime promotion.'
        : 'RELEASE GATE: NO-GO (BLOCKED) — One or more required canary checks failed.';

      clear(kpiStrip);
      kpiStrip.appendChild(opsKpiCard('Active Cache Version', el('code', { class: 'cso-ops-sha-code', text: (gate && gate.active_cache_version) || 'cso-candidate-cache-v37' }), 'Observed: ' + ((gate && gate.observed_sw_cache) || '—')));
      kpiStrip.appendChild(opsKpiCard('End-to-End Gate Latency', el('span', { class: 'cso-tabular', text: ((gate && gate.total_latency_ms) || 0) + ' ms' }), 'Combined D1 + R2 + Route probe'));
      kpiStrip.appendChild(opsKpiCard('Passed Checks Count', el('span', { class: 'badge ' + (isGo ? 'published' : 'expired'), text: ((gate && gate.passed_count) || 0) + ' / ' + ((gate && gate.total_checks) || 5) }), isGo ? 'PASS' : 'BLOCKED'));
      kpiStrip.appendChild(opsKpiCard('Last Gate Evaluation', el('span', { text: lastGate && lastGate.evaluated_at ? fmtDate(lastGate.evaluated_at) : (gate && gate.evaluated_at ? fmtDate(gate.evaluated_at) : '—') }), lastGate && lastGate.evaluated_by ? ('By ' + lastGate.evaluated_by) : 'Live evaluation'));

      clear(checksGrid);
      ((gate && gate.checks) || []).forEach(function (c) {
        checksGrid.appendChild(el('div', { class: 'cso-ops-telemetry-card' }, [
          el('div', { class: 'muted sm', text: c.label + (c.required ? ' (Required)' : ' (Advisory)') }),
          el('div', { class: 'cso-ops-telemetry-val' }, el('span', { class: 'badge ' + (c.status === 'PASS' ? 'published' : 'expired'), text: c.status })),
          el('div', { class: 'muted sm cso-ops-mono', text: c.detail || '' })
        ]));
      });
    }

    async function load() {
      try {
        var res = await api('GET', 'ops/canary');
        var cfg = res.config || {};
        maxLatInp.value = String(cfg.max_latency_ms || 500);
        reqD1Chk.checked = cfg.require_d1_ok !== false;
        reqR2Chk.checked = cfg.require_r2_ok !== false;
        reqSwChk.checked = cfg.require_sw_match !== false;
        renderGate(res.gate, res.last_gate);
      } catch (err) {
        clear(kpiStrip).appendChild(opsErrorBanner('Canary gate status unavailable', err, load));
      }
    }

    async function saveConfig() {
      if (busy || !isAdmin) return;
      busy = true; saveCfgBtn.disabled = true; saveCfgBtn.textContent = 'Saving…';
      try {
        await api('PUT', 'ops/canary/config', {
          max_latency_ms: Number(maxLatInp.value),
          require_d1_ok: reqD1Chk.checked,
          require_r2_ok: reqR2Chk.checked,
          require_sw_match: reqSwChk.checked
        });
        toast('Canary gate thresholds updated');
        await load();
      } catch (err) {
        toast(err && err.message ? err.message : 'Failed to save thresholds', true);
      } finally {
        busy = false; saveCfgBtn.disabled = !isAdmin; saveCfgBtn.textContent = 'Save Gate Thresholds';
      }
    }

    async function evaluate() {
      if (busy || !isAdmin) return;
      busy = true; evalBtn.disabled = true; evalBtn.textContent = 'Evaluating Gate…';
      try {
        var res = await api('POST', 'ops/canary/evaluate', {});
        renderGate(res, res);
        toast('Canary Release Gate: ' + res.verdict + ' (' + res.passed_count + '/' + res.total_checks + ')', res.verdict !== 'GO');
      } catch (err) {
        toast(err && err.message ? err.message : 'Canary gate evaluation failed', true);
      } finally {
        busy = false; evalBtn.disabled = !isAdmin; evalBtn.textContent = 'Run Zero-Downtime Canary Gate';
      }
    }

    saveCfgBtn.addEventListener('click', saveConfig);
    evalBtn.addEventListener('click', evaluate);
    load();
    return wrap;
  }

  /* ---------- Folder 17: Module #16 Disaster Recovery Playbook & Automated Runbook SOPs ---------- */
  function opsDrRunbooksStudioPanel() {
    var isAdmin = me && me.role === 'admin';
    var wrap = el('div', { class: 'panel cso-ops-continuity-panel' }, [
      el('h2', { text: 'Disaster Recovery Playbook & Automated Runbook SOPs' }),
      el('p', { class: 'muted', text: 'Create, edit, and rehearse interactive Disaster Recovery SOP checklists with RTO/RPO targets and audited operator sign-off.' })
    ]);

    var kpiStrip = el('div', { class: 'cso-ops-telemetry-grid cso-ops-vault-kpis', 'aria-live': 'polite' });
    var toggleDrawerBtn = el('button', { type: 'button', class: 'btn primary', disabled: !isAdmin, text: '+ New DR Runbook' });
    var refreshBtn = el('button', { type: 'button', class: 'btn', text: 'Refresh SOPs' });

    // Editor Drawer
    var idInp = el('input', { type: 'text', id: 'f-ops-sop-id', class: 'cso-ops-rb-id', placeholder: 'e.g. SOP-05' });
    var titleInp = el('input', { type: 'text', id: 'f-ops-sop-title', class: 'cso-ops-rb-title', placeholder: 'Runbook title…' });
    var sevSel = el('select', { id: 'f-ops-sop-sev', class: 'cso-ops-rb-sev' }, [
      el('option', { value: 'P1-CRITICAL', text: 'P1-CRITICAL' }),
      el('option', { value: 'P2-HIGH', text: 'P2-HIGH', selected: true }),
      el('option', { value: 'P3-STANDARD', text: 'P3-STANDARD' })
    ]);
    var rtoInp = el('input', { type: 'number', id: 'f-ops-sop-rto', class: 'cso-ops-policy-age', min: '0', max: '10080', value: '15' });
    var rpoInp = el('input', { type: 'number', id: 'f-ops-sop-rpo', class: 'cso-ops-policy-age', min: '0', max: '10080', value: '30' });
    var stepsArea = el('textarea', { id: 'f-ops-sop-steps', class: 'cso-ops-rb-steps', rows: '5', placeholder: 'One actionable SOP step per line…' });
    var saveSopBtn = el('button', { type: 'button', class: 'btn primary', disabled: !isAdmin, text: 'Save SOP Runbook' });
    var cancelDrawerBtn = el('button', { type: 'button', class: 'btn', text: 'Cancel', onclick: function () { editorDrawer.hidden = true; } });

    var editorDrawer = el('div', { class: 'cso-ops-rb-editor', hidden: true }, [
      el('strong', { text: 'DR Runbook Editor' }),
      el('div', { class: 'cso-ops-restore-controls' }, [
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-ops-sop-id', class: 'muted sm', text: 'SOP ID' }), idInp]),
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-ops-sop-title', class: 'muted sm', text: 'Title' }), titleInp]),
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-ops-sop-sev', class: 'muted sm', text: 'Severity' }), sevSel]),
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-ops-sop-rto', class: 'muted sm', text: 'RTO (min)' }), rtoInp]),
        el('div', { class: 'cso-ops-restore-field' }, [el('label', { for: 'f-ops-sop-rpo', class: 'muted sm', text: 'RPO (min)' }), rpoInp])
      ]),
      el('label', { for: 'f-ops-sop-steps', class: 'muted sm', text: 'Checklist Steps (one per line)' }),
      stepsArea,
      el('div', { class: 'actions' }, [saveSopBtn, cancelDrawerBtn])
    ]);

    var topBar = el('div', { class: 'cso-ops-subbox' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('strong', { text: 'Incident Response & Recovery Playbooks' }),
        el('div', { class: 'actions' }, [toggleDrawerBtn, refreshBtn])
      ]),
      editorDrawer
    ]);
    var gridHost = el('div', { class: 'cso-ops-runbook-grid' });

    wrap.appendChild(kpiStrip);
    wrap.appendChild(topBar);
    wrap.appendChild(gridHost);

    var busy = false;

    function openEditor(rb) {
      editorDrawer.hidden = false;
      idInp.value = rb ? rb.id : '';
      titleInp.value = rb ? rb.title : '';
      sevSel.value = rb && ['P1-CRITICAL', 'P2-HIGH', 'P3-STANDARD'].indexOf(rb.severity) !== -1 ? rb.severity : 'P2-HIGH';
      rtoInp.value = rb ? String(rb.rto_minutes) : '15';
      rpoInp.value = rb ? String(rb.rpo_minutes) : '30';
      stepsArea.value = rb ? (rb.steps || []).map(function (s) { return s.step; }).join('\n') : '';
      titleInp.focus();
    }

    async function load() {
      clear(kpiStrip).appendChild(el('p', { class: 'muted sm', text: 'Loading DR runbooks…' }));
      clear(gridHost);
      try {
        var res = await api('GET', 'ops/runbooks');
        var list = Array.isArray(res.items) ? res.items : [];
        var drilled = list.filter(function (x) { return Boolean(x.last_executed_at || x.last_drilled_at); });
        var latestExec = drilled.slice().sort(function (a, b) {
          return String(b.last_executed_at || b.last_drilled_at || '').localeCompare(String(a.last_executed_at || a.last_drilled_at || ''));
        })[0] || null;
        var p1List = list.filter(function (x) { return /CRITICAL/i.test(x.severity); });
        var minRto = p1List.length ? Math.min.apply(null, p1List.map(function (x) { return Number(x.rto_minutes) || 0; })) : (list.length ? Math.min.apply(null, list.map(function (x) { return Number(x.rto_minutes) || 0; })) : 0);

        clear(kpiStrip);
        kpiStrip.appendChild(opsKpiCard('Total DR Playbooks', el('span', { class: 'cso-tabular', text: String(list.length) }), 'Seeded + custom SOPs'));
        kpiStrip.appendChild(opsKpiCard('Target P1 RTO', el('span', { class: 'cso-tabular', text: minRto + ' min' }), 'Fastest critical recovery SLA'));
        kpiStrip.appendChild(opsKpiCard('Verified SOP Drills', el('span', { class: 'badge published', text: drilled.length + ' / ' + list.length }), 'Signed off by admins'));
        kpiStrip.appendChild(opsKpiCard('Last SOP Execution', el('span', { text: latestExec ? fmtDate(latestExec.last_executed_at || latestExec.last_drilled_at) : 'Never' }), latestExec ? (latestExec.id + ' · ' + (latestExec.last_executed_by || 'admin')) : ''));

        list.forEach(function (rb) {
          var stepsState = (rb.steps || []).map(function (s) { return { step: s.step, done: Boolean(s.done) }; });
          var progNode = el('progress', { max: String(Math.max(1, stepsState.length)), value: '0' });
          var progTxt = el('span', { class: 'muted sm cso-tabular' });

          function syncProg() {
            var doneCount = stepsState.filter(function (s) { return s.done; }).length;
            progNode.value = String(doneCount);
            progTxt.textContent = doneCount + ' / ' + stepsState.length + ' steps';
          }
          syncProg();

          var checklist = el('div', { class: 'cso-ops-rb-checklist' });
          stepsState.forEach(function (st, idx) {
            var cb = el('input', { type: 'checkbox', checked: st.done ? 'checked' : false });
            cb.addEventListener('change', function () { stepsState[idx].done = cb.checked; syncProg(); });
            checklist.appendChild(el('label', { class: 'cso-ops-rb-step' }, [cb, el('span', { text: st.step })]));
          });

          var notesInp = el('input', { type: 'text', value: rb.operator_notes || '', placeholder: 'Operator drill notes…', 'aria-label': 'Operator notes for ' + rb.id });
          var editBtn = el('button', { type: 'button', class: 'btn sm', disabled: !isAdmin, text: 'Edit SOP', onclick: function () { openEditor(rb); } });
          var signOffBtn = el('button', {
            type: 'button',
            class: 'btn sm primary',
            disabled: !isAdmin,
            text: 'Sign Off & Log SOP Execution',
            onclick: async function () {
              if (busy || !isAdmin) return;
              busy = true; signOffBtn.disabled = true; signOffBtn.textContent = 'Logging…';
              try {
                await api('POST', 'ops/runbooks/' + encodeURIComponent(rb.id) + '/complete', {
                  steps: stepsState.map(function (s) { return { step: s.step, done: true }; }),
                  operator_notes: notesInp.value.trim()
                });
                toast('Signed off execution of ' + rb.id);
                busy = false;
                await load();
              } catch (err) {
                busy = false;
                toast(err && err.message ? err.message : 'Sign-off failed', true);
                signOffBtn.disabled = !isAdmin; signOffBtn.textContent = 'Sign Off & Log SOP Execution';
              }
            }
          });

          var sevCls = /CRITICAL/i.test(rb.severity) ? 'expired' : (/HIGH/i.test(rb.severity) ? 'scheduled' : 'published');
          gridHost.appendChild(el('div', { class: 'cso-ops-rb-card' }, [
            el('div', { class: 'cso-ops-subhead' }, [
              el('strong', { text: rb.title }),
              el('span', { class: 'badge ' + sevCls, text: rb.severity })
            ]),
            el('div', { class: 'muted sm cso-tabular', text: 'ID: ' + rb.id + ' · RTO: ' + rb.rto_minutes + 'm · RPO: ' + rb.rpo_minutes + 'm' }),
            el('div', { class: 'cso-ops-subhead' }, [progNode, progTxt]),
            checklist,
            notesInp,
            el('div', { class: 'cso-ops-rb-foot' }, [
              el('div', { class: 'muted sm', text: (rb.last_executed_at || rb.last_drilled_at) ? ('Last verified: ' + fmtDate(rb.last_executed_at || rb.last_drilled_at) + ' by ' + (rb.last_executed_by || 'admin')) : 'Not executed yet' }),
              el('div', { class: 'actions' }, [editBtn, signOffBtn])
            ])
          ]));
        });
      } catch (err) {
        clear(kpiStrip).appendChild(opsErrorBanner('Could not load DR runbooks', err, load));
      }
    }

    async function saveSop() {
      if (busy || !isAdmin) return;
      busy = true; saveSopBtn.disabled = true; saveSopBtn.textContent = 'Saving…';
      try {
        await api('POST', 'ops/runbooks', {
          id: idInp.value.trim(),
          title: titleInp.value.trim(),
          severity: sevSel.value,
          rto_minutes: Number(rtoInp.value),
          rpo_minutes: Number(rpoInp.value),
          steps: stepsArea.value
        });
        editorDrawer.hidden = true;
        toast('DR Runbook saved');
        busy = false;
        await load();
      } catch (err) {
        busy = false;
        toast(err && err.message ? err.message : 'Failed to save runbook', true);
      } finally {
        saveSopBtn.disabled = !isAdmin; saveSopBtn.textContent = 'Save SOP Runbook';
      }
    }

    toggleDrawerBtn.addEventListener('click', function () { openEditor(null); });
    refreshBtn.addEventListener('click', load);
    saveSopBtn.addEventListener('click', saveSop);
    load();
    return wrap;
  }

  async function viewOperations(subMode, targetSnapId) {
    var mode = subMode || 'snapshots';
    var titleMap = {
      vault: 'R2 Immutable Storage Cold Vault',
      r2vault: 'R2 Immutable Storage Cold Vault',
      verify: 'Snapshot Integrity & SHA-256 Check',
      drill: 'Disaster Recovery Drill & State Restorer Engine',
      restore: 'Point-in-Time Rollback & Granular Engine Restorer',
      replica: 'Cloudflare D1 Distributed Replica Switchover',
      airgap: 'Offline Air-Gapped Manifest & ZIP Bundle Packager',
      runbooks: 'Disaster Recovery Playbook, SOP & Runbook Studio',
      freeze: 'Emergency Read-Only Freeze & Outage Fallback Mode',
      cache: 'Edge Cache State Preservation & Warmer Daemon',
      health: 'Multi-Region Failover Sentinel & Health Heartbeat',
      canary: 'Zero-Downtime Deployment & Rolling Canary Health',
      schema: 'Database Migration Version & DDL Schema Journal',
      vacuum: 'Dead-Letter Message Vacuum & Retention Expiry Purge',
      forensics: 'Post-Incident Forensic Audit & State Diff Inspector',
      retention: 'Automated Daily Backup Schedule & Retention Policy',
      snapshots: 'Operations, Backups & Recovery'
    };
    setTitle(titleMap[mode] || titleMap.snapshots);

    var groupMap = {
      snapshots: 'snapshots',
      vault: 'r2vault',
      r2vault: 'r2vault',
      verify: 'integrity',
      integrity: 'integrity',
      sha256: 'integrity',
      drill: 'drill',
      restore: 'drill',
      freeze: 'freeze',
      cache: 'warmer',
      warmer: 'warmer',
      health: 'failover',
      sentinel: 'failover',
      failover: 'failover',
      canary: 'canary',
      gate: 'canary',
      schema: 'ddl',
      ddl: 'ddl',
      vacuum: 'vacuum',
      forensics: 'forensics',
      audit: 'forensics',
      retention: 'retention',
      pruning: 'retention',
      replica: 'continuity',
      airgap: 'airgap',
      runbooks: 'runbooks',
      sop: 'runbooks',
      playbook: 'runbooks'
    };
    var activeGroup = groupMap[mode] || 'snapshots';

    if (activeGroup === 'drill') {
      main.appendChild(opsDrillAndRestorePanel(mode === 'restore' ? 'restore' : 'drill', targetSnapId));
    } else if (activeGroup === 'failover') {
      main.appendChild(opsFailoverSentinelPanel());
    } else if (activeGroup === 'integrity') {
      main.appendChild(opsIntegrityVerifierPanel());
    } else if (activeGroup === 'vacuum') {
      main.appendChild(opsDeadLetterVacuumPanel());
    } else if (activeGroup === 'freeze') {
      main.appendChild(opsMaintenanceFreezePanel());
    } else if (activeGroup === 'canary') {
      main.appendChild(opsCanaryGatePanel());
    } else if (activeGroup === 'forensics') {
      main.appendChild(opsForensicsDiffPanel());
    } else if (activeGroup === 'retention') {
      main.appendChild(opsRetentionPruningPanel());
    } else if (activeGroup === 'runbooks') {
      main.appendChild(opsDrRunbooksStudioPanel());
    } else if (activeGroup === 'sentinel') {
      main.appendChild(opsSentinelFreezeCachePanel(mode));
    } else if (activeGroup === 'warmer') {
      main.appendChild(opsEdgeCacheWarmerPanel());
    } else if (activeGroup === 'ddl') {
      main.appendChild(opsDdlSchemaJournalPanel());
    } else if (activeGroup === 'hygiene') {
      main.appendChild(opsSchemaVacuumForensicsPanel(mode));
    } else if (activeGroup === 'airgap') {
      main.appendChild(opsAirgapExporterPanel());
    } else if (activeGroup === 'continuity') {
      main.appendChild(opsContinuityAirgapRunbookPanel(mode));
    } else if (activeGroup === 'r2vault') {
      main.appendChild(opsR2ColdVaultPanel());
    } else {
      main.appendChild(opsSnapshotVaultPanel(mode));
    }
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

  /* ---------- real site pages & portals inventory ---------- */
  async function viewSitePages(filterCategory) {
    setTitle(filterCategory ? 'Site Pages — ' + filterCategory : 'All Pages & Portals');
    var allPages = [];
    try {
      var liveRes = await api('GET', 'pages');
      if (Array.isArray(liveRes.pages)) allPages = liveRes.pages;
    } catch (_) {}
    if (!allPages.length) {
      try {
        if (window.CSOLive && typeof window.CSOLive.getSiteManifest === 'function') {
          var manifest = await window.CSOLive.getSiteManifest();
          allPages = Array.isArray(manifest.pages) ? manifest.pages : [];
        }
      } catch (_) {}
    }

    var st = { q: '', cat: filterCategory || '' };
    var q = el('input', { type: 'search', placeholder: 'Search route, title, or file…', 'aria-label': 'Search site pages' });
    var sel = el('select', { 'aria-label': 'Filter by category' }, [
      ['', 'All categories (' + allPages.length + ')'],
      ['Core Portal', 'Core Portal'],
      ['Candidate Workspace', 'Candidate Workspace'],
      ['Information & Legal', 'Information & Legal'],
      ['Exam Guide', 'Exam Guide'],
      ['Recruitment', 'Recruitment']
    ].map(function (o) { return el('option', { value: o[0], text: o[1], selected: st.cat === o[0] }); }));

    var summaryRow = el('div', { class: 'cards' }, [
      stat('Total live pages', allPages.length, 'on csodisha.com'),
      stat('Core Portals', allPages.filter(function (p) { return p.category === 'Core Portal'; }).length),
      stat('Overrides & Custom', allPages.filter(function (p) { return p.source === 'override' || p.source === 'dynamic'; }).length),
      stat('Information & Legal', allPages.filter(function (p) { return p.category === 'Information & Legal'; }).length)
    ]);
    main.appendChild(summaryRow);
    main.appendChild(el('div', { class: 'toolbar' }, [
      q,
      sel,
      el('span', { class: 'spacer' }),
      el('a', { class: 'btn primary', href: '#/banner', text: 'Homepage & Banner Studio' })
    ]));

    var editBox = el('div');
    var box = el('div');
    main.appendChild(editBox);
    main.appendChild(box);

    function openQuickEdit(p) {
      clear(editBox);
      var tInp = el('input', { type: 'text', value: p.title || '' });
      var dInp = el('textarea', {}, p.meta_description || p.description || '');
      dInp.value = p.meta_description || p.description || '';
      var hInp = el('input', { type: 'text', value: p.hero_title || '' });
      var cLbl = el('input', { type: 'text', value: p.cta_label || '' });
      var cUrl = el('input', { type: 'text', value: p.cta_url || '' });
      editBox.appendChild(el('div', { class: 'panel' }, [
        el('div', { class: 'toolbar' }, [
          el('h2', { text: 'Quick Edit Live SEO & Hero — ' + p.route }),
          el('span', { class: 'spacer' }),
          el('button', { type: 'button', class: 'btn sm', text: 'Close', onclick: function () { clear(editBox); } })
        ]),
        el('div', { class: 'form' }, [
          el('label', {}, ['Page / SEO Title', tInp]),
          el('label', {}, ['Meta Description', dInp]),
          el('label', {}, ['Hero Headline', hInp]),
          el('label', {}, ['CTA Label', cLbl]),
          el('label', {}, ['CTA URL', cUrl]),
          el('div', { class: 'actions' }, [
            el('button', {
              type: 'button',
              class: 'btn primary',
              text: 'Publish Live',
              onclick: async function () {
                try {
                  await api('PUT', 'pages', {
                    route: p.route,
                    title: tInp.value.trim(),
                    meta_description: dInp.value.trim(),
                    hero_title: hInp.value.trim(),
                    cta_label: cLbl.value.trim(),
                    cta_url: cUrl.value.trim(),
                    status: 'published',
                    note: 'CMS Quick Edit'
                  });
                  toast('Published live: ' + p.route);
                  clear(editBox);
                  viewSitePages(filterCategory);
                } catch (e) { toast(e.message, 'error'); }
              }
            })
          ])
        ])
      ]));
    }

    function seoState(p) {
      var tLen = (p.title || '').length;
      var desc = p.meta_description || p.description || '';
      var dLen = desc.length;
      if (dLen >= 40 && dLen <= 170 && tLen > 0 && tLen <= 75) return ['published', 'SEO Ready'];
      if (dLen > 0) return ['scheduled', 'Check length'];
      return ['draft', 'Missing meta'];
    }

    function catBadge(cat) {
      var cls = cat === 'Core Portal' ? 'published' : (cat === 'Candidate Workspace' ? 'scheduled' : 'draft');
      return el('span', { class: 'badge ' + cls, text: cat || 'Portal' });
    }

    function renderTable() {
      var term = st.q.toLowerCase().trim();
      var rows = allPages.filter(function (p) {
        if (st.cat && p.category !== st.cat) return false;
        if (!term) return true;
        var desc = p.meta_description || p.description || '';
        return (p.title || '').toLowerCase().includes(term) ||
          (p.route || '').toLowerCase().includes(term) ||
          (p.file || '').toLowerCase().includes(term) ||
          desc.toLowerCase().includes(term);
      });

      var tb = el('tbody');
      rows.forEach(function (p) {
        var seo = seoState(p);
        var desc = p.meta_description || p.description || '';
        var fullUrl = 'https://csodisha.com' + p.route;
        tb.appendChild(el('tr', {}, [
          el('td', {}, [
            el('strong', { text: p.title }),
            el('div', {}, [el('code', { text: p.route }), ' ', p.source ? el('span', { class: 'badge ' + (p.source === 'static' ? 'draft' : 'published'), text: p.source }) : null])
          ]),
          el('td', {}, catBadge(p.category)),
          el('td', {}, [
            el('div', { class: 'hint', text: desc ? desc.slice(0, 110) + (desc.length > 110 ? '…' : '') : 'No meta description tag found.' }),
            el('div', { class: 'actions' }, [el('span', { class: 'badge ' + seo[0], text: seo[1] })])
          ]),
          el('td', {}, el('div', { class: 'actions' }, [
            el('button', { type: 'button', class: 'btn sm primary', text: 'Quick Edit', onclick: function () { openQuickEdit(p); } }),
            el('a', { class: 'btn sm', href: p.route, target: '_blank', rel: 'noopener', text: 'Open Live ↗' }),
            el('button', { type: 'button', class: 'btn sm', text: 'Copy URL', onclick: function () {
              if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(fullUrl).then(function () { toast('Copied ' + fullUrl); }).catch(function () { toast(fullUrl); });
              } else { toast(fullUrl); }
            } })
          ]))
        ]));
      });
      if (!rows.length) {
        tb.appendChild(el('tr', {}, el('td', { colspan: '4', class: 'muted', text: 'No matching pages found.' })));
      }

      var mainScrollEl = document.querySelector('.cso-main');
      var prevMainScroll = mainScrollEl ? mainScrollEl.scrollTop : 0;
      clear(box).appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
        el('caption', { class: 'muted', text: 'Live pages on csodisha.com (' + rows.length + ' of ' + allPages.length + ')' }),
        el('thead', {}, el('tr', {}, ['Page & Route', 'Category', 'Meta Description & SEO', 'Actions'].map(function (h) { return el('th', { scope: 'col', text: h }); }))),
        tb
      ])));
      if (mainScrollEl) mainScrollEl.scrollTop = prevMainScroll;
    }

    var t;
    q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { st.q = q.value; renderTable(); }, 180); });
    sel.addEventListener('change', function () { st.cat = sel.value; renderTable(); });
    renderTable();
  }

  async function viewSeoDiscovery() {
    setTitle('SEO, Sitemap & Discovery');
    main.appendChild(el('div', { class: 'cards' }, [
      stat('XML Sitemap', '/sitemap.xml', 'Dynamic D1 + static portals'),
      stat('RSS 2.0 Feed', '/feed.xml', 'Live published alerts'),
      stat('Robots Policy', '/robots.txt', 'Crawl directives')
    ]));
    main.appendChild(el('div', { class: 'panel' }, [
      el('h2', { text: 'Live Discovery Endpoints' }),
      el('p', { class: 'muted', text: 'Inspect live Cloudflare Worker SEO feeds and OpenGraph metadata.' }),
      el('div', { class: 'actions' }, [
        el('a', { class: 'btn sm', href: '/sitemap.xml', target: '_blank', rel: 'noopener', text: 'Open /sitemap.xml ↗' }),
        el('a', { class: 'btn sm', href: '/feed.xml', target: '_blank', rel: 'noopener', text: 'Open /feed.xml ↗' }),
        el('a', { class: 'btn sm', href: '/robots.txt', target: '_blank', rel: 'noopener', text: 'Open /robots.txt ↗' }),
        el('a', { class: 'btn sm primary', href: '#/pages', text: 'Audit All 44 Site Pages' }),
        el('a', { class: 'btn sm', href: '#/banner', text: 'Google Snippet & Banner Studio' })
      ])
    ]));
  }

  /* ---------- Phase 4 Ecosystem CMS Views (Jobs Directory, Schemes, Freshness, Feedback) ---------- */
  async function viewJobsDirectory() {
    setTitle('Jobs & Careers Directory (D1 Hierarchy)');
    var st = { page: 1, limit: 35, level: '', q: '' };
    var lvlSel = el('select', { 'aria-label': 'Filter hierarchy level' }, [
      ['', 'All Levels (0-3)'], ['0', 'Level 0 (8 Groups)'], ['1', 'Level 1 (Sections)'], ['2', 'Level 2 (Subcategories)'], ['3', 'Level 3 (Entries)']
    ].map(function (o) { return el('option', { value: o[0], text: o[1] }); }));
    var qInp = el('input', { type: 'search', placeholder: 'Search directory node, Odia title or code…' });
    var createPanel = el('div', { class: 'panel' });
    var box = el('div');
    var formTitle = el('input', { type: 'text', placeholder: 'Node Title (English)', required: true });
    var formTitleOr = el('input', { type: 'text', placeholder: 'Title (Odia _or, optional)' });
    var formLevel = el('select', {}, ['0', '1', '2', '3'].map(function (lv) { return el('option', { value: lv, text: 'Level ' + lv }); }));
    formLevel.value = '2';
    var formCode = el('input', { type: 'text', placeholder: 'Code (e.g. 1.2)' });
    var formSort = el('input', { type: 'number', value: '0', placeholder: 'Sort order' });
    var formUrl = el('input', { type: 'url', placeholder: 'Official URL (optional)' });
    var createForm = el('form', { class: 'grid2' }, [
      field('Title *', formTitle), field('Title (Odia _or)', formTitleOr),
      field('Level', formLevel), field('Code', formCode),
      field('Sort Order', formSort), field('Official URL', formUrl),
      el('div', { class: 'actions' }, [el('button', { type: 'submit', class: 'btn primary sm', text: '+ Add Directory Node' })])
    ]);
    createForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      try {
        await api('POST', 'jobs-directory', {
          title: formTitle.value.trim(),
          title_or: formTitleOr.value.trim(),
          level: Number(formLevel.value),
          code: formCode.value.trim(),
          sort_order: Number(formSort.value) || 0,
          official_url: formUrl.value.trim()
        });
        formTitle.value = ''; formTitleOr.value = ''; formCode.value = ''; formUrl.value = '';
        toast('Directory node created in D1');
        load();
      } catch (err) { toast(err.message, true); }
    });
    createPanel.appendChild(el('h2', { text: 'Add Jobs Directory Node' }));
    createPanel.appendChild(createForm);

    async function load() {
      var d = await api('GET', 'jobs-directory?page=' + st.page + '&limit=' + st.limit + '&level=' + encodeURIComponent(st.level) + '&q=' + encodeURIComponent(st.q));
      var tb = el('tbody');
      (d.items || []).forEach(function (n) {
        var titleInp = el('input', { type: 'text', value: n.title || '', 'aria-label': 'English title' });
        var orInp = el('input', { type: 'text', value: n.title_or || '', placeholder: 'ଓଡ଼ିଆ ଶୀର୍ଷକ', 'aria-label': 'Odia title' });
        var sortInp = el('input', { type: 'number', value: String(n.sort_order || 0), 'aria-label': 'Sort order' });
        var saveBtn = el('button', { type: 'button', class: 'btn sm primary', text: 'Save', onclick: async function () {
          try {
            await api('PUT', 'jobs-directory/' + encodeURIComponent(n.id), {
              title: titleInp.value.trim(),
              title_or: orInp.value.trim(),
              sort_order: Number(sortInp.value) || 0
            });
            toast('Updated node');
          } catch (err) { toast(err.message, true); }
        } });
        var delBtn = el('button', { type: 'button', class: 'btn sm danger', text: n.is_active ? 'Deactivate' : 'Inactive', disabled: !n.is_active, onclick: async function () {
          try {
            await api('DELETE', 'jobs-directory/' + encodeURIComponent(n.id));
            toast('Deactivated');
            load();
          } catch (err) { toast(err.message, true); }
        } });
        tb.appendChild(el('tr', {}, [
          el('td', { text: 'L' + n.level + (n.code ? ' · ' + n.code : '') }),
          el('td', {}, titleInp),
          el('td', {}, orInp),
          el('td', {}, sortInp),
          el('td', {}, el('div', { class: 'actions' }, [saveBtn, delBtn]))
        ]));
      });
      clear(box).appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
        el('caption', { class: 'muted', text: 'Total nodes matching filter: ' + (d.total || 0) }),
        el('thead', {}, el('tr', {}, ['Level / Code', 'Title (EN)', 'Title (Odia _or)', 'Sort Order', 'Actions'].map(function (h) { return el('th', { scope: 'col', text: h }); }))),
        tb
      ])));
      box.appendChild(pager(st, d.total || 0, load));
    }

    var t;
    lvlSel.addEventListener('change', function () { st.level = lvlSel.value; st.page = 1; load(); });
    qInp.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { st.q = qInp.value; st.page = 1; load(); }, 250); });
    main.appendChild(el('div', { class: 'toolbar' }, [lvlSel, qInp]));
    main.appendChild(createPanel);
    main.appendChild(box);
    await load();
  }

  async function viewAboutDirectory() {
    setTitle('About CSO Directory & Charter CMS (D1)');
    var st = { page: 1, limit: 35, group: '', level: '', status: '', q: '' };
    var grpSel = el('select', { 'aria-label': 'Filter parent group' }, [el('option', { value: '', text: 'All Groups' })]);
    var lvlSel = el('select', { 'aria-label': 'Filter hierarchy level' }, [
      ['', 'All Levels'], ['group', 'Groups (6)'], ['section', 'Sections (12)'], ['entry', 'Entries (Detailed)']
    ].map(function (o) { return el('option', { value: o[0], text: o[1] }); }));
    var statusSel = el('select', { 'aria-label': 'Filter status' }, [
      ['', 'All Statuses'], ['published', 'Published'], ['draft', 'Draft']
    ].map(function (o) { return el('option', { value: o[0], text: o[1] }); }));
    var qInp = el('input', { type: 'search', placeholder: 'Search About CSO node, Odia title or slug…' });

    var createPanel = el('div', { class: 'panel' });
    var formTitle = el('input', { type: 'text', placeholder: 'Title (English)', required: true });
    var formTitleOr = el('input', { type: 'text', placeholder: 'ଶୀର୍ଷକ (Odia _or)' });
    var formLevel = el('select', {}, ['group', 'section', 'entry'].map(function (lv) { return el('option', { value: lv, text: lv }); }));
    formLevel.value = 'entry';
    var formParent = el('input', { type: 'text', placeholder: 'Parent slug (e.g. about-cso)' });
    var formSub = el('input', { type: 'text', placeholder: 'Subtitle (EN)' });
    var formSubOr = el('input', { type: 'text', placeholder: 'Subtitle (Odia _or)' });
    var formBody = el('textarea', { rows: 2, placeholder: 'Body description (EN)' });
    var formBodyOr = el('textarea', { rows: 2, placeholder: 'Body description (Odia _or)' });
    var formBadge = el('input', { type: 'text', placeholder: 'Badge text (e.g. Charter)' });
    var formIcon = el('input', { type: 'text', value: '📄', placeholder: 'Emoji icon' });
    var formUrl = el('input', { type: 'text', placeholder: '/about/... or https://...' });
    var formSort = el('input', { type: 'number', value: '10', placeholder: 'Sort order' });
    var formStatus = el('select', {}, ['published', 'draft'].map(function (s) { return el('option', { value: s, text: s }); }));

    var createForm = el('form', { class: 'grid2' }, [
      field('Title (EN) *', formTitle), field('Title (Odia _or)', formTitleOr),
      field('Level', formLevel), field('Parent Slug', formParent),
      field('Subtitle (EN)', formSub), field('Subtitle (Odia _or)', formSubOr),
      field('Body Text (EN)', formBody), field('Body Text (Odia _or)', formBodyOr),
      field('Badge Text', formBadge), field('Icon', formIcon),
      field('Official URL', formUrl), field('Sort Order', formSort),
      field('Status', formStatus),
      el('div', { class: 'actions' }, [el('button', { type: 'submit', class: 'btn primary sm', text: '+ Add About Node' })])
    ]);

    createForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      try {
        await api('POST', 'about-directory', {
          title: formTitle.value.trim(),
          title_or: formTitleOr.value.trim(),
          level: formLevel.value,
          parent_slug: formParent.value.trim() || null,
          subtitle: formSub.value.trim(),
          subtitle_or: formSubOr.value.trim(),
          body_text: formBody.value.trim(),
          body_text_or: formBodyOr.value.trim(),
          badge_text: formBadge.value.trim(),
          icon_name: formIcon.value.trim() || '📄',
          official_url: formUrl.value.trim(),
          sort_order: Number(formSort.value) || 0,
          status: formStatus.value
        });
        formTitle.value = ''; formTitleOr.value = ''; formSub.value = ''; formSubOr.value = '';
        formBody.value = ''; formBodyOr.value = ''; formBadge.value = ''; formUrl.value = '';
        toast('About CSO node created in D1');
        load();
      } catch (err) { toast(err.message, true); }
    });
    createPanel.appendChild(el('h2', { text: 'Add About Directory Node' }));
    createPanel.appendChild(createForm);

    var box = el('div');
    var populatedParents = false;

    async function load() {
      var d = await api(
        'GET',
        'about-directory?page=' + st.page + '&limit=' + st.limit +
        '&group=' + encodeURIComponent(st.group) +
        '&level=' + encodeURIComponent(st.level) +
        '&status=' + encodeURIComponent(st.status) +
        '&q=' + encodeURIComponent(st.q)
      );

      if (!populatedParents && Array.isArray(d.parents)) {
        populatedParents = true;
        d.parents.filter(function (p) { return p.level === 'group'; }).forEach(function (p) {
          grpSel.appendChild(el('option', { value: p.slug, text: p.title }));
        });
      }

      var tb = el('tbody');
      (d.items || []).forEach(function (n) {
        var titleInp = el('input', { type: 'text', value: n.title || '', 'aria-label': 'English title' });
        var orInp = el('input', { type: 'text', value: n.title_or || '', placeholder: 'ଓଡ଼ିଆ ଶୀର୍ଷକ', 'aria-label': 'Odia title' });
        var bodyInp = el('textarea', { rows: 2, placeholder: 'Body copy (EN)', 'aria-label': 'Body copy' });
        bodyInp.value = n.body_text || '';
        var sortInp = el('input', { type: 'number', value: String(n.sort_order || 0), 'aria-label': 'Sort order' });
        var statusNode = el('select', { 'aria-label': 'Publication status' }, ['published', 'draft'].map(function (s) {
          return el('option', { value: s, text: s, selected: n.status === s });
        }));

        var saveBtn = el('button', { type: 'button', class: 'btn sm primary', text: 'Save', onclick: async function () {
          try {
            await api('PUT', 'about-directory/' + encodeURIComponent(n.id), {
              title: titleInp.value.trim(),
              title_or: orInp.value.trim(),
              body_text: bodyInp.value.trim(),
              sort_order: Number(sortInp.value) || 0,
              status: statusNode.value
            });
            toast('Updated About CSO node');
          } catch (err) { toast(err.message, true); }
        } });

        var delBtn = el('button', { type: 'button', class: 'btn sm danger', text: 'Delete', onclick: async function () {
          try {
            await api('DELETE', 'about-directory/' + encodeURIComponent(n.id));
            toast('Removed About node');
            load();
          } catch (err) { toast(err.message, true); }
        } });

        tb.appendChild(el('tr', {}, [
          el('td', {}, [badge(n.level), el('div', { class: 'hint', text: n.slug + (n.parent_slug ? ' ← ' + n.parent_slug : '') })]),
          el('td', {}, [titleInp, bodyInp]),
          el('td', {}, orInp),
          el('td', {}, [sortInp, statusNode]),
          el('td', {}, el('div', { class: 'actions' }, [saveBtn, delBtn]))
        ]));
      });

      clear(box).appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
        el('caption', { class: 'muted', text: 'Total About CSO nodes matching filter: ' + (d.total || 0) }),
        el('thead', {}, el('tr', {}, ['Level / Slug', 'Title & Body (EN)', 'Title (Odia _or)', 'Order & Status', 'Actions'].map(function (h) { return el('th', { scope: 'col', text: h }); }))),
        tb
      ])));
      box.appendChild(pager(st, d.total || 0, load));
    }

    var t;
    grpSel.addEventListener('change', function () { st.group = grpSel.value; st.page = 1; load(); });
    lvlSel.addEventListener('change', function () { st.level = lvlSel.value; st.page = 1; load(); });
    statusSel.addEventListener('change', function () { st.status = statusSel.value; st.page = 1; load(); });
    qInp.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { st.q = qInp.value; st.page = 1; load(); }, 250); });
    main.appendChild(el('div', { class: 'toolbar' }, [grpSel, lvlSel, statusSel, qInp]));
    main.appendChild(createPanel);
    main.appendChild(box);
    await load();
  }

  async function viewSchemesManager(id) {
    if (id) {
      var isNew = id === 'new';
      var s = isNew ? { gov_level: 'Odisha', category: 'Welfare', gender_eligible: 'all', status: 'published', sort_order: 0 } : await api('GET', 'schemes/' + encodeURIComponent(id));
      setTitle(isNew ? 'New Government Scheme' : 'Edit Scheme: ' + (s.title || ''));
      var form = el('form', { novalidate: true, class: 'panel' });
      var fields = [
        ['title', 'Scheme Title (EN)', 'text'], ['title_or', 'Scheme Title (Odia _or)', 'text'],
        ['slug', 'Slug', 'text'], ['gov_level', 'Gov Level (Odisha / Central)', 'text'],
        ['category', 'Category', 'text'], ['department', 'Department', 'text'],
        ['benefit_summary', 'Benefit Summary (EN)', 'text'], ['benefit_summary_or', 'Benefit Summary (Odia _or)', 'text'],
        ['summary', 'Overview Summary (EN)', 'area'], ['summary_or', 'Overview Summary (Odia _or)', 'area'],
        ['min_age', 'Min Age', 'number'], ['max_age', 'Max Age', 'number'],
        ['max_income', 'Max Annual Income (Rs)', 'number'], ['gender_eligible', 'Gender (all / female / male)', 'text'],
        ['target_groups', 'Target Groups (comma-sep)', 'text'], ['beneficiary_categories', 'Beneficiary Categories (SC,ST,SEBC,EWS)', 'text'],
        ['documents_required', 'Documents Required (comma-sep)', 'area'],
        ['required_docs_json', 'Structured Required Docs JSON (optional [{"doc","where","mandatory"}])', 'area'],
        ['application_steps_json', 'Application Steps (comma-sep or JSON array)', 'area'],
        ['disbursement_mode', 'Disbursement Mode (e.g. DBT / Portal)', 'text'],
        ['helpline', 'Official Helpline', 'text'],
        ['verified_date', 'Verified Date (YYYY-MM-DD)', 'text'],
        ['application_status_label', 'Window Status (Open Year-Round / Closing Soon / Renewal Window Open)', 'text'],
        ['exam_slug', 'Exam / Scholarship Cross-Link Slug (optional)', 'text'],
        ['apply_url', 'Official Apply URL', 'url'],
        ['sort_order', 'Sort Order', 'number'], ['status', 'Status (published / draft / archived)', 'text']
      ];
      var inputs = {};
      fields.forEach(function (f) {
        var inp = f[2] === 'area' ? el('textarea', { id: 'sch-' + f[0] }) : el('input', { id: 'sch-' + f[0], type: f[2] });
        var val = s[f[0]];
        if (f[0] === 'required_docs_json') {
          inp.value = Array.isArray(val) && val.length ? JSON.stringify(val) : '';
        } else {
          inp.value = Array.isArray(val) ? val.join(', ') : (val === null || val === undefined ? '' : val);
        }
        inputs[f[0]] = inp;
        form.appendChild(field(f[1], inp, 'sch-' + f[0]));
      });
      var featChk = el('input', { type: 'checkbox', id: 'sch-featured' });
      featChk.checked = Boolean(s.is_featured);
      form.appendChild(el('label', { class: 'check-row', for: 'sch-featured' }, [featChk, el('span', { text: 'Feature as Flagship Odisha / Central Scheme' })]));
      var schemeSocialPanel = createSocialPostPanel('schemes', function () {
        var snap = { id: s && s.id };
        Object.keys(inputs).forEach(function (k) { snap[k] = inputs[k].value; });
        return snap;
      });
      Object.keys(inputs).forEach(function (k) {
        inputs[k].addEventListener('input', function () { schemeSocialPanel.refresh(); });
      });
      form.appendChild(schemeSocialPanel.node);
      form.appendChild(el('div', { class: 'actions' }, [
        el('button', { type: 'submit', class: 'btn primary', text: 'Save Scheme' }),
        el('a', { class: 'btn', href: '#/schemes', text: 'Back to Schemes List' })
      ]));
      form.addEventListener('submit', async function (e) {
        e.preventDefault();
        var body = { is_featured: featChk.checked };
        Object.keys(inputs).forEach(function (k) { body[k] = inputs[k].value; });
        try {
          if (isNew) {
            var res = await api('POST', 'schemes', body);
            toast('Scheme created');
            go('/schemes/' + res.id);
          } else {
            await api('PUT', 'schemes/' + encodeURIComponent(id), body);
            toast('Scheme updated');
          }
        } catch (err) { toast(err.message, true); }
      });
      main.appendChild(form);
      return;
    }

    setTitle('Schemes & Welfare Directory (D1)');
    var st = { page: 1, limit: 25, q: '' };
    var qInp = el('input', { type: 'search', placeholder: 'Filter schemes by title, Odia name, or department…' });
    var box = el('div');
    async function load() {
      var d = await api('GET', 'schemes?page=' + st.page + '&limit=' + st.limit + '&q=' + encodeURIComponent(st.q));
      var tb = el('tbody');
      (d.items || []).forEach(function (s) {
        var sortInp = el('input', { type: 'number', value: String(s.sort_order || 0), 'aria-label': 'Sort order' });
        var saveSortBtn = el('button', { type: 'button', class: 'btn sm', text: 'Sort', onclick: async function () {
          try {
            await api('PUT', 'schemes/' + encodeURIComponent(s.id), { sort_order: Number(sortInp.value) || 0 });
            toast('Sort order saved');
          } catch (err) { toast(err.message, true); }
        } });
        tb.appendChild(el('tr', {}, [
          el('td', {}, [el('strong', { text: s.title }), s.title_or ? el('div', { class: 'hint', text: s.title_or }) : null]),
          el('td', { text: (s.gov_level || 'Odisha') + ' · ' + (s.category || '') }),
          el('td', {}, badge(s.status || 'published')),
          el('td', {}, sortInp),
          el('td', {}, el('div', { class: 'actions' }, [
            saveSortBtn,
            el('a', { class: 'btn sm', href: '#/schemes/' + s.id, text: 'Edit / Odia' }),
            (s.status || 'published') === 'published' ? el('button', { type: 'button', class: 'btn sm cso-social-trigger', text: 'Copy Social Post', onclick: function () { openSocialPostModal('schemes', s); } }) : null,
            el('button', { type: 'button', class: 'btn sm danger', text: 'Delete', onclick: async function () {
              if (!(await confirmModal('Delete "' + s.title + '"?', 'Scheme will be soft-deleted from D1.', 'Delete', true))) return;
              await api('DELETE', 'schemes/' + encodeURIComponent(s.id));
              toast('Scheme removed');
              load();
            } })
          ]))
        ]));
      });
      clear(box).appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
        el('caption', { class: 'muted', text: 'Live schemes in D1: ' + (d.total || 0) }),
        el('thead', {}, el('tr', {}, ['Title & Odia (_or)', 'Gov / Category', 'Status', 'Sort', 'Actions'].map(function (h) { return el('th', { scope: 'col', text: h }); }))),
        tb
      ])));
      box.appendChild(pager(st, d.total || 0, load));
    }
    var t;
    qInp.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { st.q = qInp.value; st.page = 1; load(); }, 220); });
    main.appendChild(el('div', { class: 'toolbar' }, [
      qInp,
      el('span', { class: 'spacer' }),
      el('a', { class: 'btn sm', href: '#/schemes-directory', text: '🗂 Schemes Tree (1,264 Nodes)' }),
      el('a', { class: 'btn primary sm', href: '#/schemes/new', text: '+ New Scheme' })
    ]));
    main.appendChild(box);
    await load();
  }

  async function viewSchemesDirectoryTree() {
    setTitle('Schemes & Benefits Directory Tree (D1)');
    var st = { page: 1, limit: 30, group: '', level: '', status: '', q: '' };
    var grpSel = el('select', { 'aria-label': 'Filter by Parent Group' }, [el('option', { value: '', text: 'All 8 Groups' })]);
    var lvlSel = el('select', { 'aria-label': 'Filter by Level' }, [
      ['', 'All Levels'], ['group', 'Groups'], ['section', 'Sections'], ['subcategory', 'Subcategories'], ['entry', 'Entries']
    ].map(function (o) { return el('option', { value: o[0], text: o[1] }); }));
    var statusSel = el('select', { 'aria-label': 'Filter by Status' }, [
      ['', 'All Status'], ['published', 'Published'], ['draft', 'Draft']
    ].map(function (o) { return el('option', { value: o[0], text: o[1] }); }));
    var qInp = el('input', { type: 'search', placeholder: 'Search 1,264 tree nodes (title, Odia, badge, slug)…' });

    var createPanel = el('details', { class: 'panel cso-create-details' });
    createPanel.appendChild(el('summary', { class: 'btn sm', text: '+ Add Schemes Directory Node (D1)' }));
    var formTitle = el('input', { type: 'text', required: true, placeholder: 'Node Title (EN)' });
    var formTitleOr = el('input', { type: 'text', placeholder: 'Odia Title (_or)' });
    var formLevel = el('select', {}, ['entry', 'subcategory', 'section', 'group'].map(function (l) { return el('option', { value: l, text: l }); }));
    var formParent = el('input', { type: 'text', placeholder: 'Parent Slug (e.g. government-schemes)' });
    var formSub = el('input', { type: 'text', placeholder: 'Subtitle (EN)' });
    var formSubOr = el('input', { type: 'text', placeholder: 'Subtitle (Odia _or)' });
    var formBadge = el('input', { type: 'text', placeholder: 'Badge / Number (e.g. 1.1.9)' });
    var formIcon = el('input', { type: 'text', value: '📄', placeholder: 'Emoji icon' });
    var formUrl = el('input', { type: 'text', placeholder: 'Official https://... portal' });
    var formSort = el('input', { type: 'number', value: '10', placeholder: 'Sort order' });
    var formStatus = el('select', {}, ['published', 'draft'].map(function (s) { return el('option', { value: s, text: s }); }));

    var createForm = el('form', { class: 'grid2' }, [
      field('Title (EN) *', formTitle), field('Title (Odia _or)', formTitleOr),
      field('Level', formLevel), field('Parent Slug', formParent),
      field('Subtitle (EN)', formSub), field('Subtitle (Odia _or)', formSubOr),
      field('Badge / Code', formBadge), field('Icon', formIcon),
      field('Official URL', formUrl), field('Sort Order', formSort),
      field('Status', formStatus),
      el('div', { class: 'actions' }, [el('button', { type: 'submit', class: 'btn primary sm', text: '+ Create Tree Node' })])
    ]);

    createForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      try {
        await api('POST', 'schemes-directory', {
          title: formTitle.value.trim(),
          title_or: formTitleOr.value.trim(),
          level: formLevel.value,
          parent_slug: formParent.value.trim() || null,
          subtitle: formSub.value.trim(),
          subtitle_or: formSubOr.value.trim(),
          badge_text: formBadge.value.trim(),
          icon_name: formIcon.value.trim() || '📄',
          official_url: formUrl.value.trim(),
          sort_order: Number(formSort.value) || 0,
          status: formStatus.value
        });
        formTitle.value = ''; formTitleOr.value = ''; formSub.value = ''; formSubOr.value = '';
        formBadge.value = ''; formUrl.value = '';
        toast('Schemes directory node saved in D1');
        load();
      } catch (err) { toast(err.message, true); }
    });
    createPanel.appendChild(createForm);

    var box = el('div');
    var populatedGroups = false;

    async function load() {
      var d = await api(
        'GET',
        'schemes-directory?page=' + st.page + '&limit=' + st.limit +
        '&group=' + encodeURIComponent(st.group) +
        '&level=' + encodeURIComponent(st.level) +
        '&status=' + encodeURIComponent(st.status) +
        '&q=' + encodeURIComponent(st.q)
      );

      if (!populatedGroups && Array.isArray(d.parents)) {
        populatedGroups = true;
        d.parents.filter(function (p) { return p.level === 'group'; }).forEach(function (p) {
          grpSel.appendChild(el('option', { value: p.slug, text: p.title }));
        });
      }

      var tb = el('tbody');
      (d.items || []).forEach(function (n) {
        var titleInp = el('input', { type: 'text', value: n.title || '', 'aria-label': 'Node title EN' });
        var subInp = el('input', { type: 'text', value: n.subtitle || '', placeholder: 'Subtitle', 'aria-label': 'Subtitle EN' });
        var orInp = el('input', { type: 'text', value: n.title_or || '', placeholder: 'ଓଡ଼ିଆ ଶୀର୍ଷକ', 'aria-label': 'Odia title' });
        var sortInp = el('input', { type: 'number', value: String(n.sort_order || 0), 'aria-label': 'Sort order' });
        var statusNode = el('select', { 'aria-label': 'Node status' }, ['published', 'draft'].map(function (s) {
          return el('option', { value: s, text: s, selected: n.status === s });
        }));

        var saveBtn = el('button', { type: 'button', class: 'btn sm primary', text: 'Save', onclick: async function () {
          try {
            await api('PUT', 'schemes-directory/' + encodeURIComponent(n.id), {
              title: titleInp.value.trim(),
              title_or: orInp.value.trim(),
              subtitle: subInp.value.trim(),
              sort_order: Number(sortInp.value) || 0,
              status: statusNode.value
            });
            toast('Updated Schemes node');
          } catch (err) { toast(err.message, true); }
        } });

        var delBtn = el('button', { type: 'button', class: 'btn sm danger', text: 'Delete', onclick: async function () {
          if (!(await confirmModal('Delete "' + n.title + '"?', 'Remove node permanently from D1 tree.', 'Delete', true))) return;
          try {
            await api('DELETE', 'schemes-directory/' + encodeURIComponent(n.id));
            toast('Removed node');
            load();
          } catch (err) { toast(err.message, true); }
        } });

        tb.appendChild(el('tr', {}, [
          el('td', {}, [badge(n.level), n.badge_text ? el('div', { class: 'hint', text: n.badge_text }) : null, el('div', { class: 'hint', text: n.slug + (n.parent_slug ? ' ← ' + n.parent_slug : '') })]),
          el('td', {}, [titleInp, subInp]),
          el('td', {}, orInp),
          el('td', {}, [sortInp, statusNode]),
          el('td', {}, el('div', { class: 'actions' }, [saveBtn, delBtn]))
        ]));
      });

      clear(box).appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
        el('caption', { class: 'muted', text: 'Schemes tree nodes matching filter: ' + (d.total || 0) }),
        el('thead', {}, el('tr', {}, ['Level / Slug', 'Title & Subtitle (EN)', 'Title (Odia _or)', 'Order & Status', 'Actions'].map(function (h) { return el('th', { scope: 'col', text: h }); }))),
        tb
      ])));
      box.appendChild(pager(st, d.total || 0, load));
    }

    var t;
    grpSel.addEventListener('change', function () { st.group = grpSel.value; st.page = 1; load(); });
    lvlSel.addEventListener('change', function () { st.level = lvlSel.value; st.page = 1; load(); });
    statusSel.addEventListener('change', function () { st.status = statusSel.value; st.page = 1; load(); });
    qInp.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { st.q = qInp.value; st.page = 1; load(); }, 250); });
    main.appendChild(el('div', { class: 'toolbar' }, [grpSel, lvlSel, statusSel, qInp, el('a', { class: 'btn sm', href: '#/schemes', text: '← Flagship Schemes' })]));
    main.appendChild(createPanel);
    main.appendChild(box);
    await load();
  }

  async function viewStudyLibraryDirectory() {
    setTitle('Study Library Directory Tree (D1 · 1,681 Nodes)');
    var st = { page: 1, limit: 30, group: '', level: '', status: '', q: '' };
    var grpSel = el('select', { 'aria-label': 'Filter by Parent Group' }, [el('option', { value: '', text: 'All 10 Academic Groups' })]);
    var lvlSel = el('select', { 'aria-label': 'Filter by Level' }, [
      ['', 'All Levels'], ['group', 'Groups'], ['section', 'Sections'], ['subcategory', 'Subcategories'], ['entry', 'Entries']
    ].map(function (o) { return el('option', { value: o[0], text: o[1] }); }));
    var statusSel = el('select', { 'aria-label': 'Filter by Status' }, [
      ['', 'All Status'], ['published', 'Published'], ['draft', 'Draft']
    ].map(function (o) { return el('option', { value: o[0], text: o[1] }); }));
    var qInp = el('input', { type: 'search', placeholder: 'Search 1,681 study nodes (title, Odia, exam_slug, badge)…' });

    var createPanel = el('details', { class: 'panel cso-create-details' });
    createPanel.appendChild(el('summary', { class: 'btn sm', text: '+ Add Study Library Node (D1)' }));
    var formTitle = el('input', { type: 'text', required: true, placeholder: 'Node Title (EN)' });
    var formTitleOr = el('input', { type: 'text', placeholder: 'Odia Title (_or)' });
    var formLevel = el('select', {}, ['entry', 'subcategory', 'section', 'group'].map(function (l) { return el('option', { value: l, text: l }); }));
    var formParent = el('input', { type: 'text', placeholder: 'Parent Slug (e.g. competitive-exams-teacher-education)' });
    var formExamSlug = el('input', { type: 'text', placeholder: 'Exam Slug (opsc-oas, ossc-cgl, ugc-net, odisha-bed-otet…)' });
    var formSub = el('input', { type: 'text', placeholder: 'Subtitle (EN)' });
    var formBadge = el('input', { type: 'text', placeholder: 'Badge / Number (e.g. 4.1.9)' });
    var formIcon = el('input', { type: 'text', value: '📚', placeholder: 'Emoji icon' });
    var formUrl = el('input', { type: 'text', placeholder: 'Official Academic https://... URL' });
    var formSort = el('input', { type: 'number', value: '10', placeholder: 'Sort order' });
    var formStatus = el('select', {}, ['published', 'draft'].map(function (s) { return el('option', { value: s, text: s }); }));

    var createForm = el('form', { class: 'grid2' }, [
      field('Title (EN) *', formTitle), field('Title (Odia _or)', formTitleOr),
      field('Level', formLevel), field('Parent Slug', formParent),
      field('Exam Track Slug', formExamSlug), field('Subtitle (EN)', formSub),
      field('Badge / Code', formBadge), field('Icon', formIcon),
      field('Resource URL', formUrl), field('Sort Order', formSort),
      field('Status', formStatus),
      el('div', { class: 'actions' }, [el('button', { type: 'submit', class: 'btn primary sm', text: '+ Create Study Node' })])
    ]);

    createForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      try {
        await api('POST', 'study-library-directory', {
          title: formTitle.value.trim(),
          title_or: formTitleOr.value.trim(),
          level: formLevel.value,
          parent_slug: formParent.value.trim() || null,
          exam_slug: formExamSlug.value.trim(),
          subtitle: formSub.value.trim(),
          badge_text: formBadge.value.trim(),
          icon_name: formIcon.value.trim() || '📚',
          resource_url: formUrl.value.trim(),
          sort_order: Number(formSort.value) || 0,
          status: formStatus.value
        });
        formTitle.value = ''; formTitleOr.value = ''; formExamSlug.value = '';
        formSub.value = ''; formBadge.value = ''; formUrl.value = '';
        toast('Study library node saved in D1');
        load();
      } catch (err) { toast(err.message, true); }
    });
    createPanel.appendChild(createForm);

    var box = el('div');
    var populatedGroups = false;

    async function load() {
      var d = await api(
        'GET',
        'study-library-directory?page=' + st.page + '&limit=' + st.limit +
        '&group=' + encodeURIComponent(st.group) +
        '&level=' + encodeURIComponent(st.level) +
        '&status=' + encodeURIComponent(st.status) +
        '&q=' + encodeURIComponent(st.q)
      );

      if (!populatedGroups && Array.isArray(d.parents)) {
        populatedGroups = true;
        d.parents.filter(function (p) { return p.level === 'group'; }).forEach(function (p) {
          grpSel.appendChild(el('option', { value: p.slug, text: p.title }));
        });
      }

      var tb = el('tbody');
      (d.items || []).forEach(function (n) {
        var titleInp = el('input', { type: 'text', value: n.title || '', 'aria-label': 'Node title EN' });
        var examInp = el('input', { type: 'text', value: n.exam_slug || '', placeholder: 'exam-slug', 'aria-label': 'Exam slug' });
        var orInp = el('input', { type: 'text', value: n.title_or || '', placeholder: 'ଓଡ଼ିଆ ଶୀର୍ଷକ', 'aria-label': 'Odia title' });
        var sortInp = el('input', { type: 'number', value: String(n.sort_order || 0), 'aria-label': 'Sort order' });
        var statusNode = el('select', { 'aria-label': 'Node status' }, ['published', 'draft'].map(function (s) {
          return el('option', { value: s, text: s, selected: n.status === s });
        }));

        var saveBtn = el('button', { type: 'button', class: 'btn sm primary', text: 'Save', onclick: async function () {
          try {
            await api('PUT', 'study-library-directory/' + encodeURIComponent(n.id), {
              title: titleInp.value.trim(),
              title_or: orInp.value.trim(),
              exam_slug: examInp.value.trim(),
              sort_order: Number(sortInp.value) || 0,
              status: statusNode.value
            });
            toast('Updated Study Library node');
          } catch (err) { toast(err.message, true); }
        } });

        var delBtn = el('button', { type: 'button', class: 'btn sm danger', text: 'Delete', onclick: async function () {
          if (!(await confirmModal('Delete "' + n.title + '"?', 'Remove study node permanently from D1 tree.', 'Delete', true))) return;
          try {
            await api('DELETE', 'study-library-directory/' + encodeURIComponent(n.id));
            toast('Removed study node');
            load();
          } catch (err) { toast(err.message, true); }
        } });

        tb.appendChild(el('tr', {}, [
          el('td', {}, [badge(n.level), n.badge_text ? el('div', { class: 'hint', text: n.badge_text }) : null, el('div', { class: 'hint', text: n.slug + (n.parent_slug ? ' ← ' + n.parent_slug : '') })]),
          el('td', {}, [titleInp, examInp]),
          el('td', {}, orInp),
          el('td', {}, [sortInp, statusNode]),
          el('td', {}, el('div', { class: 'actions' }, [saveBtn, delBtn]))
        ]));
      });

      clear(box).appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
        el('caption', { class: 'muted', text: 'Study Library nodes matching filter: ' + (d.total || 0) }),
        el('thead', {}, el('tr', {}, ['Level / Slug', 'Title & Exam Slug', 'Title (Odia _or)', 'Order & Status', 'Actions'].map(function (h) { return el('th', { scope: 'col', text: h }); }))),
        tb
      ])));
      box.appendChild(pager(st, d.total || 0, load));
    }

    var t;
    grpSel.addEventListener('change', function () { st.group = grpSel.value; st.page = 1; load(); });
    lvlSel.addEventListener('change', function () { st.level = lvlSel.value; st.page = 1; load(); });
    statusSel.addEventListener('change', function () { st.status = statusSel.value; st.page = 1; load(); });
    qInp.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { st.q = qInp.value; st.page = 1; load(); }, 250); });
    main.appendChild(el('div', { class: 'toolbar' }, [grpSel, lvlSel, statusSel, qInp, el('a', { class: 'btn sm', href: '#/syllabus', text: 'Syllabus' }), el('a', { class: 'btn sm', href: '#/pyq', text: 'PYQs' })]));
    main.appendChild(createPanel);
    main.appendChild(box);
    await load();
  }

  async function viewFreshnessAudit() {
    setTitle('Content Freshness & Expiry Audit');
    var data = await api('GET', 'freshness');
    var expJobs = data.expired_but_published_jobs || [];
    var soonJobs = data.expiring_within_7_days || [];
    var staleCa = data.stale_current_affairs || [];
    var drafts = data.drafts || {};
    main.appendChild(el('div', { class: 'cards' }, [
      stat('Past-Deadline Live Jobs', expJobs.length, 'Require expiry or +7d extension'),
      stat('Expiring <= 7 Days', soonJobs.length, 'Verify deadlines now'),
      stat('Open Feedback Reports', data.open_feedback_count || 0, 'Pending admin triage'),
      stat('Goal Push Subscribers', data.push_subscriber_count || 0, 'Active candidate alerts')
    ]));
    main.appendChild(el('div', { class: 'panel' }, [
      el('h2', { text: 'Jobs Past Last Date Still Status = Published (' + expJobs.length + ')' }),
      expJobs.length
        ? el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
            el('thead', {}, el('tr', {}, ['Title', 'Organisation', 'Last Date', 'Action'].map(function (h) { return el('th', { text: h }); }))),
            el('tbody', {}, expJobs.map(function (j) {
              return el('tr', {}, [
                el('td', { text: j.title }),
                el('td', { text: j.organisation || '—' }),
                el('td', { text: j.last_date || '—' }),
                el('td', {}, [el('a', { class: 'btn sm', href: '#/jobs/' + j.id, text: 'Edit / Archive' })])
              ]);
            }))
          ]))
        : el('p', { class: 'muted', text: 'All published job notices have valid upcoming deadlines.' })
    ]));
    main.appendChild(el('div', { class: 'panel' }, [
      el('h2', { text: 'Expiring Within 7 Days (' + soonJobs.length + ') & Stale CA (>180d: ' + staleCa.length + ')' }),
      el('p', { class: 'muted', text: 'Draft backlog: ' + (drafts.draft_posts || 0) + ' posts · ' + (drafts.draft_tests || 0) + ' mock tests · ' + (drafts.draft_schemes || 0) + ' schemes.' }),
      el('div', { class: 'actions' }, [
        el('button', { type: 'button', class: 'btn sm primary', text: 'Run Auto-Expiry Maintenance Now', onclick: async function () {
          var r = await api('POST', 'maintenance/run', {});
          toast('Expired ' + (r.expired || 0) + ' overdue jobs & promoted ' + (r.promoted || 0));
          clear(main);
          viewFreshnessAudit();
        } }),
        el('a', { class: 'btn sm', href: '#/feedback', text: 'Open Community Feedback Queue →' })
      ])
    ]));
  }

  async function viewFeedbackQueue() {
    setTitle('Community Feedback & Error Queue');
    var st = { page: 1, limit: 25, status: 'open' };
    var sel = el('select', { 'aria-label': 'Feedback status filter' }, [
      ['open', 'Open Reports'], ['reviewed', 'Reviewed'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed'], ['', 'All Feedback']
    ].map(function (o) { return el('option', { value: o[0], text: o[1], selected: o[0] === st.status }); }));
    var box = el('div');
    async function load() {
      var d = await api('GET', 'feedback?page=' + st.page + '&limit=' + st.limit + '&status=' + encodeURIComponent(st.status));
      var tb = el('tbody');
      (d.items || []).forEach(function (f) {
        var noteInp = el('input', { type: 'text', value: f.admin_note || '', placeholder: 'Resolution / admin note…' });
        tb.appendChild(el('tr', {}, [
          el('td', {}, [badge(f.kind || 'error'), el('div', { class: 'hint', text: f.page_url || '/' })]),
          el('td', {}, [el('strong', { text: f.subject || '(No subject)' }), el('div', { class: 'muted', text: f.message || '' }), el('div', { class: 'hint', text: f.contact || 'Anonymous' })]),
          el('td', {}, noteInp),
          el('td', {}, el('div', { class: 'actions' }, [
            el('button', { type: 'button', class: 'btn sm primary', text: 'Resolve', onclick: async function () {
              await api('PUT', 'feedback/' + encodeURIComponent(f.id), { status: 'resolved', admin_note: noteInp.value.trim() });
              toast('Marked resolved');
              load();
            } }),
            el('button', { type: 'button', class: 'btn sm', text: 'Dismiss', onclick: async function () {
              await api('PUT', 'feedback/' + encodeURIComponent(f.id), { status: 'dismissed', admin_note: noteInp.value.trim() });
              toast('Dismissed');
              load();
            } })
          ]))
        ]));
      });
      clear(box).appendChild(el('div', { class: 'table-wrap cso-table-wrap' }, el('table', {}, [
        el('caption', { class: 'muted', text: 'Total feedback items: ' + (d.total || 0) }),
        el('thead', {}, el('tr', {}, ['Type / Page', 'Message & Sender', 'Admin Note', 'Actions'].map(function (h) { return el('th', { scope: 'col', text: h }); }))),
        tb
      ])));
      box.appendChild(pager(st, d.total || 0, load));
    }
    sel.addEventListener('change', function () { st.status = sel.value; st.page = 1; load(); });
    main.appendChild(el('div', { class: 'toolbar' }, [sel]));
    main.appendChild(box);
    await load();
  }

  /* ---------- router ---------- */
  function buildNav() {
    var nav = clear(document.getElementById('nav'));
    [['#/', 'Overview'], ['#/pages', 'All Pages'], ['#/about-directory', 'About CSO'], ['#/current-affairs', 'Current Affairs'], ['#/jobs', 'Job Alerts'], ['#/jobs-directory', 'Jobs Directory'], ['#/schemes', 'Schemes'], ['#/schemes-directory', 'Schemes Tree'], ['#/mock-tests', 'Mock Tests'], ['#/syllabus', 'Syllabus'], ['#/pyq', 'PYQs'], ['#/study-library-directory', 'Study Directory'], ['#/freshness', 'Freshness Audit'], ['#/feedback', 'Feedback Queue'], ['#/media', 'Media'], ['#/banner', 'Homepage banner'], ['#/operations', 'Operations & Backups'], ['#/security', 'Security'], ['#/audit', 'Audit log'], ['#/incidents', 'Incidents']].concat(me.role === 'admin' ? [['#/users', 'Candidate accounts'], ['/admin/', 'Master Command Suite']] : [['/admin/', 'Master Command Suite']])
      .forEach(function (l) { nav.appendChild(el('a', { href: l[0] }, l[1])); });
  }
  function contentPublishingStudioPanel(mode) {
    var canWrite = Boolean(me && (me.role === 'admin' || me.role === 'editor'));
    var canStatus = Boolean(me && (me.role === 'admin' || me.role === 'editor' || me.role === 'reviewer'));
    var isAdmin = Boolean(me && me.role === 'admin');

    var MODE_CFG = {
      all: {
        badge: 'EDITORIAL COMMAND',
        title: 'All Content Management Studio',
        sub: 'Unified cross-type command center for Articles, News Updates, Current Affairs, and Announcements with live SEO preview and revision history.',
        cta: '+ Create New Content',
        fixedType: null,
        defaultCreateType: 'article'
      },
      articles: {
        badge: 'LONG-FORM STUDIO',
        title: 'Articles & Blogs Editorial Studio',
        sub: 'Write, review, and publish long-form strategy essays and Odisha exam guides with live reading-time estimation and SEO gatekeeping.',
        cta: '+ Write New Article',
        fixedType: 'article',
        defaultCreateType: 'article'
      },
      news: {
        badge: 'NEWS DESK',
        title: 'News & Updates Studio',
        sub: 'Publish verified Odisha & National institutional updates with district tagging, source citations, and rapid editorial status toggles.',
        cta: '+ Publish News Update',
        fixedType: 'news',
        defaultCreateType: 'news'
      },
      'current-affairs': {
        badge: 'EXAM DIGEST',
        title: 'Current Affairs Studio',
        sub: 'Curate daily & weekly Current Affairs briefs tagged for OPSC, OSSSC, OSSC, UGC NET, and Banking examinations.',
        cta: '+ Add Current Affairs Brief',
        fixedType: 'current_affairs',
        defaultCreateType: 'current_affairs'
      }
    };
    var cfg = MODE_CFG[mode] || MODE_CFG.all;

    var wrap = el('div', { class: 'cso-ops-studio' });
    var kpis = el('div', { class: 'cso-ops-kpis' });
    var telemetryBox = el('div', { class: 'cso-cnt-telemetry-bar' });
    var composerBox = el('div');
    composerBox.hidden = true;
    var pillsBox = el('div', { class: 'cso-cnt-pills' });
    var tableBox = el('div');
    var pagerBox = el('div', { class: 'cso-cnt-pager' });

    var state = {
      type: cfg.fixedType || 'all',
      status: 'all',
      q: '',
      limit: 25,
      offset: 0,
      total: 0,
      guards: { require_seo_meta_before_publish: true, block_editor_hard_delete: true }
    };

    var createBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--primary', type: 'button', text: cfg.cta });
    if (!canWrite) createBtn.disabled = true;

    wrap.appendChild(el('div', { class: 'cso-ops-hero' }, [
      el('div', {}, [
        el('span', { class: 'badge ok', text: cfg.badge }),
        el('h2', { text: cfg.title }),
        el('p', { class: 'muted', text: cfg.sub })
      ]),
      el('div', {}, [createBtn])
    ]));
    wrap.appendChild(kpis);
    wrap.appendChild(telemetryBox);
    wrap.appendChild(composerBox);

    var statusSel = el('select', { class: 'select' }, [
      el('option', { value: 'all', text: 'All Statuses' }),
      el('option', { value: 'draft', text: 'Draft' }),
      el('option', { value: 'in_review', text: 'In Review' }),
      el('option', { value: 'approved', text: 'Approved' }),
      el('option', { value: 'published', text: 'Published' }),
      el('option', { value: 'scheduled', text: 'Scheduled' }),
      el('option', { value: 'archived', text: 'Archived' })
    ]);
    var searchInp = el('input', { class: 'input', type: 'search', placeholder: 'Search title, slug, district, or exam...' });
    var searchBtn = el('button', { class: 'cso-ops-btn', type: 'button', text: 'Search' });

    if (!cfg.fixedType) {
      var typeDefs = [
        ['all', 'All'],
        ['article', 'Articles & Blogs'],
        ['news', 'News & Updates'],
        ['current_affairs', 'Current Affairs'],
        ['announcement', 'Announcements']
      ];
      typeDefs.forEach(function (td) {
        var b = el('button', {
          type: 'button',
          class: 'cso-cnt-pill' + (state.type === td[0] ? ' is-active' : ''),
          text: td[1]
        });
        b.addEventListener('click', function () {
          state.type = td[0];
          state.offset = 0;
          Array.prototype.forEach.call(pillsBox.children, function (c) { c.classList.remove('is-active'); });
          b.classList.add('is-active');
          load();
        });
        pillsBox.appendChild(b);
      });
    }

    function detectLangParity(it) {
      if (it && it.language) return String(it.language).toUpperCase();
      var txt = ((it && it.title) || '') + ' ' + ((it && it.summary) || '') + ' ' + ((it && it.body_md) || '');
      var hasOr = /[\u0B00-\u0B7F]/.test(txt);
      var hasEn = /[A-Za-z]{3,}/.test(txt);
      if (hasOr && hasEn) return 'EN+OR';
      if (hasOr) return 'OR';
      return 'EN';
    }

    function openComposer(editing, focusField) {
      clear(composerBox);
      composerBox.hidden = false;
      var isEdit = Boolean(editing && editing.id);
      var card = el('div', { class: 'cso-cnt-composer' });
      var titleInp = el('input', { class: 'input', type: 'text', value: (editing && editing.title) || '', placeholder: 'Headline / Title...' });
      var titleCount = el('span', { class: 'cso-cnt-counter', text: '0/60' });
      var slugInp = el('input', { class: 'input', type: 'text', value: (editing && editing.slug) || '', placeholder: 'auto-generated-from-title' });
      var slugPreviewCode = el('code', { class: 'cso-cnt-slug-code', text: '/updates/preview-slug/' });
      var copySlugBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--sm', type: 'button', text: 'Copy URL' });
      var postTypeSel = el('select', { class: 'select' }, [
        el('option', { value: 'article', text: 'Articles & Blogs' }),
        el('option', { value: 'news', text: 'News & Updates' }),
        el('option', { value: 'current_affairs', text: 'Current Affairs' }),
        el('option', { value: 'announcement', text: 'Announcements' })
      ]);
      postTypeSel.value = cfg.fixedType || (editing && editing.post_type) || cfg.defaultCreateType;
      if (cfg.fixedType) postTypeSel.disabled = true;

      var stageSel = el('select', { class: 'select' }, [
        el('option', { value: 'draft', text: 'draft' }),
        el('option', { value: 'in_review', text: 'in_review' }),
        el('option', { value: 'approved', text: 'approved' }),
        el('option', { value: 'published', text: 'published' }),
        el('option', { value: 'scheduled', text: 'scheduled' }),
        el('option', { value: 'archived', text: 'archived' })
      ]);
      stageSel.value = (editing && (editing.workflow_stage || editing.status)) || 'draft';

      var langSel = el('select', { class: 'select' }, [
        el('option', { value: 'EN', text: 'EN (English)' }),
        el('option', { value: 'OR', text: 'OR (Odia)' }),
        el('option', { value: 'EN+OR', text: 'EN+OR (Bilingual)' })
      ]);
      langSel.value = editing ? detectLangParity(editing) : 'EN';

      var catInp = el('input', { class: 'input', type: 'text', value: (editing && editing.category) || '', placeholder: 'e.g. Odisha Polity, Economy, Exams' });

      // Interactive Tag Chip Composer
      var tagsState = (editing && Array.isArray(editing.tags)) ? editing.tags.slice() : [];
      var tagChipsWrap = el('div', { class: 'cso-cnt-tag-chips' });
      var tagInput = el('input', { class: 'cso-cnt-tag-input', type: 'text', placeholder: 'Type tag & press Enter or ,' });
      var tagSuggestBox = el('div', { class: 'cso-cnt-tag-suggestions' });

      function addTagChip(rawTag) {
        var clean = String(rawTag || '').trim().replace(/^#+/, '').slice(0, 40);
        if (!clean) return;
        if (tagsState.length >= 12) { toast('Maximum 12 tags per post', true); return; }
        if (tagsState.some(function (t) { return t.toLowerCase() === clean.toLowerCase(); })) return;
        tagsState.push(clean);
        renderTagChips();
      }
      function renderTagChips() {
        clear(tagChipsWrap);
        tagsState.forEach(function (t, idx) {
          var rmBtn = el('button', { type: 'button', class: 'cso-cnt-tag-chip-rm', text: '×', 'aria-label': 'Remove tag ' + t });
          rmBtn.addEventListener('click', function () {
            tagsState.splice(idx, 1);
            renderTagChips();
          });
          tagChipsWrap.appendChild(el('span', { class: 'cso-cnt-tag-chip' }, [
            document.createTextNode(t),
            rmBtn
          ]));
        });
        tagChipsWrap.appendChild(tagInput);
      }
      tagInput.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ',') {
          ev.preventDefault();
          addTagChip(tagInput.value);
          tagInput.value = '';
        } else if (ev.key === 'Backspace' && !tagInput.value && tagsState.length) {
          tagsState.pop();
          renderTagChips();
        }
      });
      renderTagChips();

      api('GET', 'content/tags').then(function (tagRes) {
        var list = (tagRes && Array.isArray(tagRes.tags)) ? tagRes.tags.slice(0, 8) : [];
        if (!list.length) return;
        clear(tagSuggestBox);
        tagSuggestBox.appendChild(el('span', { class: 'muted sm', text: 'Suggested:' }));
        list.forEach(function (tg) {
          var label = tg.label || tg.name || tg.slug;
          if (!label) return;
          var sb = el('button', { type: 'button', class: 'cso-cnt-tag-suggest', text: '+ ' + label });
          sb.addEventListener('click', function () { addTagChip(label); });
          tagSuggestBox.appendChild(sb);
        });
      }).catch(function () {});

      var districtInp = el('input', { class: 'input', type: 'text', value: (editing && editing.district_tag) || '', placeholder: 'e.g. Bhubaneswar, Balasore, Statewide' });
      var sourceInp = el('input', { class: 'input', type: 'text', value: (editing && editing.source_citation) || '', placeholder: 'e.g. Odisha Gazette / PIB' });
      var examInp = el('input', { class: 'input', type: 'text', value: (editing && editing.exam_relevance) || '', placeholder: 'e.g. OPSC OAS, OSSSC RI, OSSC CGL' });
      var featCb = el('input', { type: 'checkbox' });
      featCb.checked = Boolean(editing && editing.is_featured);

      // Cover Photo / Image Uploader
      var coverUrlInp = el('input', { class: 'input', type: 'url', value: (editing && editing.cover_image_url) || '', placeholder: '/media/content/... or https://...' });
      var coverAltInp = el('input', { class: 'input', type: 'text', value: (editing && editing.cover_image_alt) || '', placeholder: 'Descriptive alt text for accessibility & SEO' });
      var coverFileInp = el('input', { class: 'cso-cnt-file-hidden', type: 'file', accept: 'image/jpeg,image/png,image/webp,image/avif' });
      var coverPickBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--sm', type: 'button', text: 'Choose Image' });
      var coverStatusBadge = el('span', { class: 'badge', text: coverUrlInp.value.trim() ? 'Image Ready' : 'No Cover' });
      var coverThumbImg = el('img', { class: 'cso-cnt-cover-thumb', alt: 'Cover preview' });
      coverThumbImg.hidden = !coverUrlInp.value.trim();
      if (coverUrlInp.value.trim()) coverThumbImg.src = coverUrlInp.value.trim();

      coverPickBtn.addEventListener('click', function () { coverFileInp.click(); });
      coverFileInp.addEventListener('change', async function () {
        var f = coverFileInp.files && coverFileInp.files[0];
        if (!f) return;
        coverPickBtn.disabled = true;
        coverStatusBadge.className = 'badge warn';
        coverStatusBadge.textContent = 'Uploading to R2...';
        try {
          var fd = new FormData();
          fd.append('file', f);
          fd.append('kind', 'image');
          var up = await api('POST', 'content/upload', fd, true);
          coverUrlInp.value = up.url || '';
          if (!coverAltInp.value.trim()) coverAltInp.value = titleInp.value.trim() || f.name.replace(/\.[^.]+$/, '');
          coverStatusBadge.className = 'badge ok';
          coverStatusBadge.textContent = 'Uploaded (' + Math.max(1, Math.round((up.size_bytes || 0) / 1024)) + ' KB)';
          toast('Cover image uploaded to R2');
          refreshLivePreview();
        } catch (err) {
          coverStatusBadge.className = 'badge bad';
          coverStatusBadge.textContent = 'Upload Failed';
          toast(err.message || 'Image upload failed', true);
        } finally {
          coverPickBtn.disabled = false;
          coverFileInp.value = '';
        }
      });

      // PDF & Official Document Attachment Builder
      var attachmentsState = (editing && Array.isArray(editing.attachments)) ? editing.attachments.slice() : [];
      var pdfTitleInp = el('input', { class: 'input', type: 'text', placeholder: 'Document Title (e.g. Official Notification PDF)' });
      var pdfFileInp = el('input', { class: 'cso-cnt-file-hidden', type: 'file', accept: 'application/pdf' });
      var pdfUploadBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--sm', type: 'button', text: 'Upload PDF' });
      var pdfStatusBadge = el('span', { class: 'badge', text: String(attachmentsState.length) + ' PDF(s)' });
      var pdfListBox = el('div', { class: 'cso-cnt-list-items' });

      function renderPdfList() {
        clear(pdfListBox);
        pdfStatusBadge.textContent = String(attachmentsState.length) + ' PDF(s)';
        attachmentsState.forEach(function (att, idx) {
          var rm = el('button', { type: 'button', class: 'cso-ops-btn cso-ops-btn--sm cso-ops-btn--danger', text: 'Remove' });
          rm.addEventListener('click', function () {
            attachmentsState.splice(idx, 1);
            renderPdfList();
            refreshLivePreview();
          });
          var kb = att.size_bytes ? ' · ' + Math.max(1, Math.round(att.size_bytes / 1024)) + ' KB' : '';
          pdfListBox.appendChild(el('div', { class: 'cso-cnt-list-row' }, [
            el('div', { class: 'cso-cnt-list-meta' }, [
              el('strong', { text: att.label || 'Document PDF' }),
              el('span', { text: (att.url || '') + kb })
            ]),
            rm
          ]));
        });
      }
      renderPdfList();

      pdfUploadBtn.addEventListener('click', function () { pdfFileInp.click(); });
      pdfFileInp.addEventListener('change', async function () {
        var f = pdfFileInp.files && pdfFileInp.files[0];
        if (!f) return;
        pdfUploadBtn.disabled = true;
        pdfStatusBadge.className = 'badge warn';
        pdfStatusBadge.textContent = 'Uploading PDF...';
        try {
          var fd = new FormData();
          fd.append('file', f);
          fd.append('kind', 'pdf');
          var up = await api('POST', 'content/upload', fd, true);
          attachmentsState.push({
            label: pdfTitleInp.value.trim() || f.name.replace(/\.pdf$/i, ''),
            url: up.url,
            size_bytes: up.size_bytes || f.size || 0
          });
          pdfTitleInp.value = '';
          pdfStatusBadge.className = 'badge ok';
          renderPdfList();
          refreshLivePreview();
          toast('PDF uploaded to R2');
        } catch (err) {
          pdfStatusBadge.className = 'badge bad';
          pdfStatusBadge.textContent = 'PDF Failed';
          toast(err.message || 'PDF upload failed', true);
        } finally {
          pdfUploadBtn.disabled = false;
          pdfFileInp.value = '';
        }
      });

      // Structured Reference & External Links Builder
      var linksState = (editing && Array.isArray(editing.links)) ? editing.links.slice() : [];
      var linkLabelInp = el('input', { class: 'input', type: 'text', placeholder: 'Link Label (e.g. OPSC Official Portal)' });
      var linkUrlInp = el('input', { class: 'input', type: 'url', placeholder: 'https://...' });
      var addLinkBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--sm', type: 'button', text: '+ Add Reference Link' });
      var linksListBox = el('div', { class: 'cso-cnt-list-items' });

      function renderLinksList() {
        clear(linksListBox);
        linksState.forEach(function (lnk, idx) {
          var rm = el('button', { type: 'button', class: 'cso-ops-btn cso-ops-btn--sm cso-ops-btn--danger', text: 'Remove' });
          rm.addEventListener('click', function () {
            linksState.splice(idx, 1);
            renderLinksList();
            refreshLivePreview();
          });
          linksListBox.appendChild(el('div', { class: 'cso-cnt-list-row' }, [
            el('div', { class: 'cso-cnt-list-meta' }, [
              el('strong', { text: lnk.label || 'Reference Link' }),
              el('span', { text: lnk.url || '' })
            ]),
            rm
          ]));
        });
      }
      renderLinksList();

      addLinkBtn.addEventListener('click', function () {
        var lbl = linkLabelInp.value.trim();
        var url = linkUrlInp.value.trim();
        if (!url || !/^(\/|https?:\/\/)/i.test(url)) {
          toast('Enter a valid https:// or /... reference URL', true);
          return;
        }
        linksState.push({ label: lbl || 'Reference Link', url: url });
        linkLabelInp.value = '';
        linkUrlInp.value = '';
        renderLinksList();
        refreshLivePreview();
      });

      var summaryTa = el('textarea', { class: 'textarea', rows: '2', placeholder: 'Concise excerpt / key takeaway bullets...' });
      summaryTa.value = (editing && editing.summary) || '';
      var bodyTa = el('textarea', { class: 'textarea', rows: '6', placeholder: 'Markdown or structured editorial content...' });
      bodyTa.value = (editing && editing.body_md) || '';

      var seoTitleInp = el('input', { class: 'input', type: 'text', value: (editing && editing.seo_title) || '', placeholder: 'SEO Meta Title (recommended 40-65 chars)' });
      var seoDescInp = el('textarea', { class: 'textarea', rows: '2', placeholder: 'SEO Meta Description (recommended 110-160 chars)' });
      seoDescInp.value = (editing && editing.seo_description) || '';

      var readBadge = el('span', { class: 'badge ok', text: '1 min read' });
      var seoBadge = el('span', { class: 'badge warn', text: 'SEO Meta Incomplete' });
      var seoScoreBadge = el('span', { class: 'badge', text: 'SEO Score: 0/100' });
      var piiWarnBox = el('div', { class: 'cso-cnt-pii-warn' });
      piiWarnBox.hidden = true;

      var previewState = { channel: 'reader', device: 'desktop' };
      var previewFrame = el('div', { class: 'cso-cnt-preview-frame' });
      var chTabs = [
        ['reader', 'csodisha.com Reader'],
        ['serp', 'Google SERP'],
        ['social', 'WhatsApp / Telegram']
      ];
      var chTabBtns = chTabs.map(function (ct) {
        var b = el('button', {
          type: 'button',
          class: 'cso-cnt-pill' + (previewState.channel === ct[0] ? ' is-active' : ''),
          text: ct[1]
        });
        b.addEventListener('click', function () {
          previewState.channel = ct[0];
          chTabBtns.forEach(function (btn, idx) {
            btn.classList.toggle('is-active', chTabs[idx][0] === previewState.channel);
          });
          refreshLivePreview();
        });
        return b;
      });
      var deskBtn = el('button', { type: 'button', class: 'cso-ops-btn cso-ops-btn--sm', text: 'Desktop' });
      var mobBtn = el('button', { type: 'button', class: 'cso-ops-btn cso-ops-btn--sm', text: 'Mobile' });
      deskBtn.addEventListener('click', function () {
        previewState.device = 'desktop';
        previewFrame.classList.remove('is-mobile');
      });
      mobBtn.addEventListener('click', function () {
        previewState.device = 'mobile';
        previewFrame.classList.add('is-mobile');
      });

      function computeSeoScore(title, seoTitle, seoDesc, words, hasSlug) {
        var score = 0;
        var st = seoTitle || title;
        if (st.length >= 30 && st.length <= 65) score += 30;
        else if (st.length >= 10) score += 15;
        if (seoDesc.length >= 100 && seoDesc.length <= 165) score += 30;
        else if (seoDesc.length >= 40) score += 15;
        if (words >= 120) score += 20;
        else if (words >= 30) score += 10;
        if (hasSlug) score += 10;
        if (examInp.value.trim() || districtInp.value.trim()) score += 10;
        return Math.min(100, score);
      }

      function refreshLivePreview() {
        var rawTitle = titleInp.value.trim();
        titleCount.textContent = String(rawTitle.length) + '/60';
        titleCount.classList.toggle('is-over', rawTitle.length > 60);

        var words = ((summaryTa.value || '') + ' ' + (bodyTa.value || '')).trim().split(/\s+/).filter(Boolean).length;
        var mins = Math.max(1, Math.ceil(words / 200));
        readBadge.textContent = mins + ' min read (' + words + ' words)';

        var st = seoTitleInp.value.trim();
        var sd = seoDescInp.value.trim();
        var hasSeo = Boolean(st && sd);
        seoBadge.className = 'badge ' + (hasSeo ? 'ok' : 'warn');
        seoBadge.textContent = hasSeo ? 'SEO Meta Ready' : 'SEO Required for Publish';

        var autoSlug = (slugInp.value.trim() || rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'preview-slug');
        var pathPrefix = (postTypeSel.value === 'news' || postTypeSel.value === 'article') ? '/news/' : '/updates/';
        var fullUrl = 'https://csodisha.com' + pathPrefix + autoSlug + '/';
        slugPreviewCode.textContent = pathPrefix + autoSlug + '/';

        var seoScore = computeSeoScore(rawTitle, st, sd, words, Boolean(autoSlug));
        seoScoreBadge.textContent = 'SEO Score: ' + seoScore + '/100';
        seoScoreBadge.className = 'badge ' + (seoScore >= 75 ? 'ok' : (seoScore >= 45 ? 'warn' : 'bad'));

        var combinedText = [rawTitle, summaryTa.value, bodyTa.value, sourceInp.value].join(' ');
        var phoneHit = /\b[6-9]\d{9}\b/.test(combinedText);
        var aadhaarHit = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(combinedText);
        if (phoneHit || aadhaarHit) {
          piiWarnBox.hidden = false;
          piiWarnBox.textContent = 'DPDP Act 2023 PII Guard: Detected possible ' +
            [phoneHit ? '10-digit mobile number' : '', aadhaarHit ? '12-digit Aadhaar ID' : ''].filter(Boolean).join(' & ') +
            ' in public content. Redact before publishing.';
        } else {
          piiWarnBox.hidden = true;
        }

        var coverUrl = coverUrlInp.value.trim();
        var coverAlt = coverAltInp.value.trim() || rawTitle || 'Cover image';
        if (coverUrl) {
          coverThumbImg.src = coverUrl;
          coverThumbImg.alt = coverAlt;
          coverThumbImg.hidden = false;
          if (coverStatusBadge.textContent === 'No Cover') {
            coverStatusBadge.className = 'badge ok';
            coverStatusBadge.textContent = 'Image Ready';
          }
        } else {
          coverThumbImg.hidden = true;
        }

        clear(previewFrame);
        if (previewState.channel === 'reader') {
          var metaLine = [
            postTypeSel.value.replace('_', ' ').toUpperCase(),
            langSel.value,
            mins + ' min read',
            districtInp.value.trim() || 'Odisha',
            examInp.value.trim()
          ].filter(Boolean).join(' · ');
          var readerChildren = [
            el('div', { class: 'cso-cnt-reader-kicker', text: catInp.value.trim() || 'CS ODISHA EDITORIAL' }),
            el('h4', { class: 'cso-cnt-reader-title', text: rawTitle || 'Headline Preview on csodisha.com' }),
            el('div', { class: 'cso-cnt-reader-meta', text: metaLine })
          ];
          if (coverUrl) {
            readerChildren.push(el('img', { class: 'cso-cnt-reader-cover', src: coverUrl, alt: coverAlt }));
          }
          readerChildren.push(el('div', { class: 'cso-cnt-reader-body', text: (summaryTa.value.trim() ? summaryTa.value.trim() + '\n\n' : '') + (bodyTa.value.trim() || 'Start writing your article or notice body to see live reader typography.') }));
          if (attachmentsState.length) {
            readerChildren.push(el('div', { class: 'cso-cnt-reader-pdfs' }, attachmentsState.map(function (att) {
              var kb = att.size_bytes ? ' (' + Math.max(1, Math.round(att.size_bytes / 1024)) + ' KB)' : '';
              return el('a', { class: 'cso-cnt-reader-pdf-card', href: att.url, target: '_blank', rel: 'noopener' }, [
                el('span', { text: '📄 ' + (att.label || 'Official Document PDF') + kb }),
                el('span', { text: 'Download PDF ↗' })
              ]);
            })));
          }
          if (linksState.length) {
            readerChildren.push(el('div', { class: 'cso-cnt-reader-links' }, linksState.map(function (lnk) {
              return el('a', { class: 'cso-cnt-reader-link-btn', href: lnk.url, target: '_blank', rel: 'noopener', text: (lnk.label || 'Reference') + ' ↗' });
            })));
          }
          previewFrame.appendChild(el('div', { class: 'cso-cnt-reader-card' }, readerChildren));
        } else if (previewState.channel === 'serp') {
          previewFrame.appendChild(el('div', { class: 'cso-cnt-serp-card' }, [
            el('div', { class: 'cso-cnt-serp-url', text: fullUrl }),
            el('div', { class: 'cso-cnt-serp-title', text: st || rawTitle || 'Article SEO Title Preview' }),
            el('div', { class: 'cso-cnt-serp-desc', text: sd || summaryTa.value.trim() || 'Meta description preview appears here as you type (110-160 chars recommended).' })
          ]));
        } else {
          var waMsg = '📢 *' + (rawTitle || 'CS Odisha Update') + '*\n' +
            (examInp.value.trim() ? '🎯 Exam: ' + examInp.value.trim() + '\n' : '') +
            (summaryTa.value.trim() ? summaryTa.value.trim().slice(0, 140) + '\n' : '') +
            '🔗 Read full brief: ' + fullUrl;
          var socialChildren = [
            el('span', { class: 'muted sm', text: 'Aspirant Broadcast Preview (WhatsApp / Telegram)' })
          ];
          if (coverUrl) {
            socialChildren.push(el('img', { class: 'cso-cnt-social-cover', src: coverUrl, alt: coverAlt }));
          }
          socialChildren.push(el('div', { class: 'cso-cnt-social-bubble', text: waMsg }));
          previewFrame.appendChild(el('div', { class: 'cso-cnt-social-card' }, socialChildren));
        }
      }

      copySlugBtn.addEventListener('click', function () {
        var urlToCopy = 'https://csodisha.com' + slugPreviewCode.textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(urlToCopy).then(function () { toast('Copied ' + urlToCopy); });
        } else {
          toast(urlToCopy);
        }
      });

      [titleInp, slugInp, summaryTa, bodyTa, seoTitleInp, seoDescInp, postTypeSel, langSel, catInp, districtInp, examInp, sourceInp, coverUrlInp, coverAltInp].forEach(function (inp) {
        inp.addEventListener('input', refreshLivePreview);
        inp.addEventListener('change', refreshLivePreview);
      });
      refreshLivePreview();

      function closeComposer() {
        clear(composerBox);
        composerBox.hidden = true;
        if (window._csoComposerEscHandler) {
          window.removeEventListener('keydown', window._csoComposerEscHandler);
          window._csoComposerEscHandler = null;
        }
      }
      if (window._csoComposerEscHandler) {
        window.removeEventListener('keydown', window._csoComposerEscHandler);
      }
      window._csoComposerEscHandler = function (ev) {
        if (ev.key === 'Escape') closeComposer();
      };
      window.addEventListener('keydown', window._csoComposerEscHandler);

      var saveBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--primary', type: 'button', text: isEdit ? 'Save Revision & Update' : 'Create Content Item' });
      var cancelBtn = el('button', { class: 'cso-ops-btn', type: 'button', text: 'Cancel (Esc)' });
      cancelBtn.addEventListener('click', closeComposer);

      var saveBusy = false;
      saveBtn.addEventListener('click', async function () {
        if (!canWrite || saveBusy) return;
        saveBusy = true;
        saveBtn.disabled = true;
        try {
          var payload = {
            title: titleInp.value.trim(),
            slug: slugInp.value.trim(),
            post_type: postTypeSel.value,
            workflow_stage: stageSel.value,
            category: catInp.value.trim(),
            tags: tagsState.slice(),
            district_tag: districtInp.value.trim(),
            source_citation: sourceInp.value.trim(),
            exam_relevance: examInp.value.trim(),
            language: langSel.value,
            is_featured: featCb.checked,
            cover_image_url: coverUrlInp.value.trim(),
            cover_image_alt: coverAltInp.value.trim(),
            attachments: attachmentsState.slice(),
            links: linksState.slice(),
            summary: summaryTa.value.trim(),
            body_md: bodyTa.value,
            seo_title: seoTitleInp.value.trim(),
            seo_description: seoDescInp.value.trim()
          };
          if (isEdit) {
            await api('PUT', 'content/posts/' + encodeURIComponent(editing.id), payload);
            toast('Updated post and saved revision snapshot');
          } else {
            await api('POST', 'content/posts', payload);
            toast('Created new content item');
          }
          closeComposer();
          await load();
        } catch (err) {
          toast(err.message || 'Save failed', true);
        } finally {
          saveBusy = false;
          saveBtn.disabled = !canWrite;
        }
      });

      card.appendChild(el('div', { class: 'cso-ops-subhead' }, [
        el('h3', { text: isEdit ? 'Edit Content Item (' + editing.id + ')' : cfg.cta }),
        el('div', { class: 'cso-ops-actions' }, [readBadge, seoBadge, seoScoreBadge])
      ]));
      card.appendChild(piiWarnBox);

      var leftPane = el('div', { class: 'cso-cnt-editor-pane' }, [
        el('div', { class: 'cso-ops-grid-2' }, [
          el('div', { class: 'field' }, [el('label', {}, [document.createTextNode('Title *'), titleCount]), titleInp]),
          el('div', { class: 'field' }, [
            el('label', { text: 'Slug (auto from title)' }),
            slugInp,
            el('div', { class: 'cso-cnt-slug-row' }, [slugPreviewCode, copySlugBtn])
          ]),
          el('div', { class: 'field' }, [el('label', { text: 'Content Type' }), postTypeSel]),
          el('div', { class: 'field' }, [el('label', { text: 'Workflow Stage' }), stageSel]),
          el('div', { class: 'field' }, [el('label', { text: 'Language Parity' }), langSel]),
          el('div', { class: 'field' }, [el('label', { text: 'Category' }), catInp]),
          el('div', { class: 'field' }, [el('label', { text: 'District Tag (News / Regional)' }), districtInp]),
          el('div', { class: 'field' }, [el('label', { text: 'Source Citation' }), sourceInp]),
          el('div', { class: 'field' }, [el('label', { text: 'Exam Relevance (OPSC/OSSSC/OSSC)' }), examInp]),
          el('div', { class: 'field' }, [el('label', {}, [featCb, document.createTextNode(' Feature in Priority Slot')])])
        ]),
        el('div', { class: 'field' }, [
          el('label', { text: 'Interactive Tags (press Enter or , to add)' }),
          el('div', { class: 'cso-cnt-tag-box' }, [tagChipsWrap, tagSuggestBox])
        ]),
        el('div', { class: 'cso-cnt-media-box' }, [
          el('div', { class: 'cso-cnt-media-head' }, [
            el('strong', { text: 'Cover Photo / Featured Image (R2)' }),
            el('div', { class: 'cso-ops-actions' }, [coverStatusBadge, coverPickBtn, coverFileInp])
          ]),
          el('div', { class: 'cso-cnt-media-row' }, [coverUrlInp, coverAltInp]),
          coverThumbImg
        ]),
        el('div', { class: 'cso-cnt-media-box' }, [
          el('div', { class: 'cso-cnt-media-head' }, [
            el('strong', { text: 'PDF & Official Document Attachments (R2)' }),
            el('div', { class: 'cso-ops-actions' }, [pdfStatusBadge, pdfUploadBtn, pdfFileInp])
          ]),
          el('div', { class: 'cso-cnt-media-row' }, [pdfTitleInp]),
          pdfListBox
        ]),
        el('div', { class: 'cso-cnt-media-box' }, [
          el('div', { class: 'cso-cnt-media-head' }, [
            el('strong', { text: 'Structured Reference & External Links' }),
            addLinkBtn
          ]),
          el('div', { class: 'cso-cnt-media-row' }, [linkLabelInp, linkUrlInp]),
          linksListBox
        ]),
        el('div', { class: 'field' }, [el('label', { text: 'Summary / Key Takeaways' }), summaryTa]),
        el('div', { class: 'field' }, [el('label', { text: 'Body (Markdown / Content)' }), bodyTa]),
        el('div', { class: 'cso-ops-grid-2' }, [
          el('div', { class: 'field' }, [el('label', { text: 'SEO Title' }), seoTitleInp]),
          el('div', { class: 'field' }, [el('label', { text: 'SEO Description' }), seoDescInp])
        ]),
        el('div', { class: 'cso-ops-actions' }, [saveBtn, cancelBtn])
      ]);

      var rightPane = el('div', { class: 'cso-cnt-preview-pane' }, [
        el('div', { class: 'cso-cnt-preview-head' }, [
          el('div', { class: 'cso-cnt-preview-tabs' }, chTabBtns),
          el('div', { class: 'cso-ops-actions' }, [deskBtn, mobBtn])
        ]),
        previewFrame
      ]);

      card.appendChild(el('div', { class: 'cso-cnt-workbench' }, [leftPane, rightPane]));
      composerBox.appendChild(card);

      if (focusField === 'seo') seoTitleInp.focus();
      else titleInp.focus();
    }

    createBtn.addEventListener('click', function () { openComposer(null); });

    function renderKpis(k) {
      clear(kpis);
      var items = [];
      if (mode === 'articles') {
        items = [
          ['Total Articles', String(k.total_count || 0)],
          ['Published Articles', String(k.published_count || 0)],
          ['Avg Reading Time', String(k.avg_reading_minutes || 1) + ' min'],
          ['Featured Essays', String(k.featured_count || 0)]
        ];
      } else if (mode === 'news') {
        items = [
          ['Total News Stories', String(k.total_count || 0)],
          ['Published Today', String(k.today_count || 0)],
          ['Pending Review', String((k.in_review_count || 0) + (k.draft_count || 0))],
          ['District-Tagged Stories', String(k.district_tagged_count || 0)]
        ];
      } else if (mode === 'current-affairs') {
        items = [
          ['Total CA Digests', String(k.total_count || 0)],
          ['Exam-Tagged Entries', String(k.exam_tagged_count || 0)],
          ['Published Today', String(k.today_count || 0)],
          ['Published Live', String(k.published_count || 0)]
        ];
      } else {
        items = [
          ['Total Content Items', String(k.total_count || 0)],
          ['Published Live', String(k.published_count || 0)],
          ['In Review / Drafts', String((k.in_review_count || 0) + (k.draft_count || 0))],
          ['Featured Items', String(k.featured_count || 0)]
        ];
      }
      items.forEach(function (pair) {
        kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
          el('span', { class: 'cso-ops-kpi-lbl', text: pair[0] }),
          el('strong', { class: 'cso-ops-kpi-val', text: pair[1] })
        ]));
      });
    }

    function renderTelemetry(k, rows) {
      clear(telemetryBox);
      var total = Number(k.total_count || rows.length || 0);
      var pub = Number(k.published_count || 0);
      var pubPct = total > 0 ? Math.round((pub / total) * 100) : 0;

      var seoReadyCount = rows.filter(function (r) { return Boolean(r.has_seo_meta); }).length;
      var seoPct = rows.length > 0 ? Math.round((seoReadyCount / rows.length) * 100) : 0;

      var pubProg = el('progress', { class: 'cso-cnt-tel-prog', max: String(Math.max(1, total)), value: String(pub) });
      var seoMeter = el('meter', { class: 'cso-cnt-tel-meter', min: '0', max: '100', low: '40', high: '75', optimum: '95', value: String(seoPct) });

      var counts = { article: 0, news: 0, current_affairs: 0, announcement: 0 };
      rows.forEach(function (r) {
        if (counts[r.post_type] !== undefined) counts[r.post_type] += 1;
      });

      telemetryBox.appendChild(el('div', { class: 'cso-cnt-tel-item' }, [
        el('div', { class: 'cso-cnt-tel-head' }, [
          el('span', { text: 'Publishing Ratio' }),
          el('strong', { text: pub + ' / ' + total + ' (' + pubPct + '%)' })
        ]),
        pubProg
      ]));
      telemetryBox.appendChild(el('div', { class: 'cso-cnt-tel-item' }, [
        el('div', { class: 'cso-cnt-tel-head' }, [
          el('span', { text: 'Catalog SEO Readiness' }),
          el('strong', { text: seoPct + '% Ready' })
        ]),
        seoMeter
      ]));
      telemetryBox.appendChild(el('div', { class: 'cso-cnt-tel-item' }, [
        el('div', { class: 'cso-cnt-tel-head' }, [
          el('span', { text: 'Odisha Taxonomy Mix' }),
          el('strong', { text: String(rows.length) + ' shown' })
        ]),
        el('div', { class: 'cso-cnt-tax-bars' }, [
          el('span', { class: 'cso-cnt-tax-chip', text: 'Articles ' + counts.article }),
          el('span', { class: 'cso-cnt-tax-chip', text: 'News ' + counts.news }),
          el('span', { class: 'cso-cnt-tax-chip', text: 'CA ' + counts.current_affairs }),
          el('span', { class: 'cso-cnt-tax-chip', text: 'Notices ' + counts.announcement })
        ])
      ]));
    }

    function renderTable(res) {
      clear(tableBox);
      clear(pagerBox);
      var rows = Array.isArray(res.items) ? res.items : [];
      state.total = Number((res.paging && res.paging.total) || rows.length);

      if (!rows.length) {
        tableBox.appendChild(el('div', { class: 'muted sm', text: 'No content items match the current filter.' }));
      } else {
        var tbody = el('tbody');
        rows.forEach(function (it) {
          var st = it.workflow_stage || it.status || 'draft';
          var stCls = st === 'published' ? 'ok' : (st === 'archived' ? 'bad' : 'warn');
          var actTd = el('td', { class: 'cso-ops-actions' });

          if (canWrite) {
            var editBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--sm', type: 'button', text: 'Edit' });
            editBtn.addEventListener('click', function () { openComposer(it); });
            actTd.appendChild(editBtn);
          }

          if (canStatus) {
            var nextStage = st === 'published' ? 'draft' : 'published';
            var toggleBtn = el('button', {
              class: 'cso-ops-btn cso-ops-btn--sm',
              type: 'button',
              text: st === 'published' ? 'Unpublish' : 'Publish'
            });
            toggleBtn.addEventListener('click', async function () {
              toggleBtn.disabled = true;
              var prevStage = st;
              try {
                await api('PATCH', 'content/posts/' + encodeURIComponent(it.id) + '/status', { workflow_stage: nextStage });
                await load();
                toastWithUndo('Status updated to ' + nextStage, async function () {
                  await api('PATCH', 'content/posts/' + encodeURIComponent(it.id) + '/status', { workflow_stage: prevStage });
                  toast('Reverted status to ' + prevStage);
                  await load();
                });
              } catch (err) {
                toast(err.message || 'Status update blocked', true);
                toggleBtn.disabled = false;
              }
            });
            actTd.appendChild(toggleBtn);
          }

          var prevBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--sm', type: 'button', text: 'Preview' });
          prevBtn.addEventListener('click', function () {
            window.open(it.public_url || ('/updates/' + encodeURIComponent(it.slug) + '/'), '_blank', 'noopener');
          });
          actTd.appendChild(prevBtn);

          if (isAdmin || !(state.guards && state.guards.block_editor_hard_delete)) {
            if (canWrite) {
              var delBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--sm cso-ops-btn--danger', type: 'button', text: 'Delete' });
              delBtn.addEventListener('click', async function () {
                delBtn.disabled = true;
                try {
                  await api('DELETE', 'content/posts/' + encodeURIComponent(it.id));
                  toast('Post deleted');
                  await load();
                } catch (err) {
                  toast(err.message || 'Delete failed', true);
                  delBtn.disabled = false;
                }
              });
              actTd.appendChild(delBtn);
            }
          }

          var metaDetail = it.post_type;
          if (it.district_tag) metaDetail += ' · ' + it.district_tag;
          if (it.exam_relevance) metaDetail += ' · ' + it.exam_relevance;

          var titleEl = el('strong', {
            class: canWrite ? 'cso-cnt-inline-title' : '',
            text: it.title,
            title: canWrite ? 'Double-click to rename headline inline' : ''
          });
          if (canWrite) {
            titleEl.addEventListener('dblclick', function () {
              var inlineInp = el('input', { class: 'input', type: 'text', value: it.title });
              titleEl.replaceWith(inlineInp);
              inlineInp.focus();
              inlineInp.select();
              var done = false;
              async function commitRename(save) {
                if (done) return;
                done = true;
                var nextTitle = inlineInp.value.trim();
                if (!save || !nextTitle || nextTitle === it.title) {
                  inlineInp.replaceWith(titleEl);
                  return;
                }
                try {
                  await api('PUT', 'content/posts/' + encodeURIComponent(it.id), { title: nextTitle });
                  toast('Headline updated');
                  await load();
                } catch (err) {
                  toast(err.message || 'Rename failed', true);
                  inlineInp.replaceWith(titleEl);
                }
              }
              inlineInp.addEventListener('keydown', function (ev) {
                if (ev.key === 'Enter') { ev.preventDefault(); commitRename(true); }
                else if (ev.key === 'Escape') { ev.preventDefault(); commitRename(false); }
              });
              inlineInp.addEventListener('blur', function () { commitRename(true); });
            });
          }

          var seoPill = el('button', {
            type: 'button',
            class: 'badge cso-cnt-seo-pill ' + (it.has_seo_meta ? 'ok' : 'warn'),
            text: it.has_seo_meta ? 'SEO Ready' : 'Missing Meta'
          });
          seoPill.addEventListener('click', function () {
            if (canWrite) openComposer(it, 'seo');
          });

          tbody.appendChild(el('tr', {}, [
            el('td', {}, [
              titleEl,
              el('div', { class: 'muted sm', text: '/' + it.slug + ' · ' + String(it.reading_time_minutes || 1) + 'm read' })
            ]),
            el('td', {}, [
              el('div', { text: metaDetail }),
              el('span', { class: 'cso-cnt-lang-badge', text: detectLangParity(it) })
            ]),
            el('td', {}, [
              el('span', { class: 'badge ' + stCls, text: st }),
              el('div', {}, [seoPill])
            ]),
            el('td', { text: String(it.updated_at || it.created_at || '').slice(0, 16).replace('T', ' ') }),
            actTd
          ]));
        });

        tableBox.appendChild(el('div', { class: 'cso-ops-table-wrap' }, [
          el('table', { class: 'table' }, [
            el('thead', {}, [el('tr', {}, [
              el('th', { text: 'Title & Slug' }),
              el('th', { text: 'Type / Lang' }),
              el('th', { text: 'Stage & SEO' }),
              el('th', { text: 'Updated' }),
              el('th', { text: 'Actions' })
            ])]),
            tbody
          ])
        ]));
      }

      var prevPage = el('button', { class: 'cso-ops-btn cso-ops-btn--sm', type: 'button', text: '← Prev' });
      prevPage.disabled = state.offset <= 0;
      prevPage.addEventListener('click', function () {
        state.offset = Math.max(0, state.offset - state.limit);
        load();
      });
      var nextPage = el('button', { class: 'cso-ops-btn cso-ops-btn--sm', type: 'button', text: 'Next →' });
      nextPage.disabled = state.offset + state.limit >= state.total;
      nextPage.addEventListener('click', function () {
        state.offset += state.limit;
        load();
      });
      pagerBox.appendChild(el('span', { class: 'muted sm', text: 'Showing ' + (state.total ? state.offset + 1 : 0) + '–' + Math.min(state.total, state.offset + rows.length) + ' of ' + state.total }));
      pagerBox.appendChild(el('div', { class: 'cso-ops-actions' }, [prevPage, nextPage]));
    }

    async function load() {
      try {
        var qs = 'type=' + encodeURIComponent(state.type) +
          '&status=' + encodeURIComponent(state.status) +
          '&q=' + encodeURIComponent(state.q) +
          '&limit=' + String(state.limit) +
          '&offset=' + String(state.offset);
        var res = await api('GET', 'content/posts?' + qs);
        if (res.guards) state.guards = res.guards;
        renderKpis(res.kpis || {});
        renderTelemetry(res.kpis || {}, Array.isArray(res.items) ? res.items : []);
        renderTable(res);
      } catch (e) {
        toast(e.message || 'Failed to load content studio', true);
      }
    }

    statusSel.addEventListener('change', function () {
      state.status = statusSel.value;
      state.offset = 0;
      load();
    });
    searchBtn.addEventListener('click', function () {
      state.q = searchInp.value.trim();
      state.offset = 0;
      load();
    });
    searchInp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        state.q = searchInp.value.trim();
        state.offset = 0;
        load();
      }
    });

    var listCard = el('div', { class: 'cso-ops-card' });
    if (!cfg.fixedType) listCard.appendChild(pillsBox);
    listCard.appendChild(el('div', { class: 'cso-cnt-toolbar' }, [
      el('div', { class: 'cso-cnt-toolbar-left' }, [searchInp, searchBtn]),
      statusSel
    ]));
    listCard.appendChild(tableBox);
    listCard.appendChild(pagerBox);
    wrap.appendChild(listCard);

    load();
    return wrap;
  }

  function contentAnnouncementsStudioPanel() {
    var canWrite = Boolean(me && (me.role === 'admin' || me.role === 'editor'));
    var canStatus = Boolean(me && (me.role === 'admin' || me.role === 'editor' || me.role === 'reviewer'));
    var wrap = el('div', { class: 'cso-ops-studio' });
    var kpis = el('div', { class: 'cso-ops-kpis' });
    var previewBox = el('div', { class: 'cso-ops-card' });
    var composerBox = el('div');
    var tableBox = el('div');

    var addBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--primary', type: 'button', text: '+ Post Official Notice / Announcement' });
    if (!canWrite) addBtn.disabled = true;

    wrap.appendChild(el('div', { class: 'cso-ops-hero' }, [
      el('div', {}, [
        el('span', { class: 'badge warn', text: 'OFFICIAL NOTICES' }),
        el('h2', { text: 'Announcements & Notices Studio' }),
        el('p', { class: 'muted', text: 'Publish priority announcements, exam deadline notices, and verified CTA banners with automatic expiry tracking.' })
      ]),
      el('div', {}, [addBtn])
    ]));
    wrap.appendChild(kpis);
    wrap.appendChild(previewBox);
    wrap.appendChild(composerBox);
    wrap.appendChild(el('div', { class: 'cso-ops-card' }, [
      el('h3', { text: 'Official Notices Ledger' }),
      tableBox
    ]));

    function openForm(editing) {
      clear(composerBox);
      var isEdit = Boolean(editing && editing.id);
      var card = el('div', { class: 'cso-cnt-composer' });
      var titleInp = el('input', { class: 'input', type: 'text', value: (editing && editing.title) || '', placeholder: 'Official Notice Headline...' });
      var prioSel = el('select', { class: 'select' }, [
        el('option', { value: 'normal', text: 'normal — Standard Notice' }),
        el('option', { value: 'urgent', text: 'urgent — High-Priority Alert' }),
        el('option', { value: 'deadline', text: 'deadline — Exam / Application Deadline' })
      ]);
      prioSel.value = (editing && editing.notice_priority) || 'normal';
      var stageSel = el('select', { class: 'select' }, [
        el('option', { value: 'draft', text: 'draft' }),
        el('option', { value: 'published', text: 'published' }),
        el('option', { value: 'archived', text: 'archived' })
      ]);
      stageSel.value = (editing && (editing.workflow_stage || editing.status)) || 'draft';
      var expInp = el('input', { class: 'input', type: 'text', value: (editing && editing.notice_expires_at) || '', placeholder: 'YYYY-MM-DDTHH:MM:SSZ (optional)' });
      var ctaLblInp = el('input', { class: 'input', type: 'text', value: (editing && editing.notice_cta_label) || '', placeholder: 'e.g. View Notification' });
      var ctaUrlInp = el('input', { class: 'input', type: 'text', value: (editing && editing.notice_cta_url) || '', placeholder: '/updates/... or https://...' });
      var sumTa = el('textarea', { class: 'textarea', rows: '2', placeholder: 'Short notice summary...' });
      sumTa.value = (editing && editing.summary) || '';
      var seoTitleInp = el('input', { class: 'input', type: 'text', value: (editing && editing.seo_title) || '', placeholder: 'SEO Title (required to publish)' });
      var seoDescInp = el('input', { class: 'input', type: 'text', value: (editing && editing.seo_description) || '', placeholder: 'SEO Description (required to publish)' });

      var saveBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--primary', type: 'button', text: isEdit ? 'Save Notice Changes' : 'Publish Notice' });
      var cancelBtn = el('button', { class: 'cso-ops-btn', type: 'button', text: 'Cancel' });
      cancelBtn.addEventListener('click', function () { clear(composerBox); });

      var busy = false;
      saveBtn.addEventListener('click', async function () {
        if (!canWrite || busy) return;
        busy = true;
        saveBtn.disabled = true;
        try {
          var payload = {
            title: titleInp.value.trim(),
            post_type: 'announcement',
            workflow_stage: stageSel.value,
            notice_priority: prioSel.value,
            notice_expires_at: expInp.value.trim() || null,
            notice_cta_label: ctaLblInp.value.trim(),
            notice_cta_url: ctaUrlInp.value.trim(),
            summary: sumTa.value.trim(),
            seo_title: seoTitleInp.value.trim() || titleInp.value.trim(),
            seo_description: seoDescInp.value.trim() || sumTa.value.trim() || titleInp.value.trim()
          };
          if (isEdit) {
            await api('PUT', 'content/posts/' + encodeURIComponent(editing.id), payload);
            toast('Announcement updated');
          } else {
            await api('POST', 'content/posts', payload);
            toast('Announcement saved');
          }
          clear(composerBox);
          await load();
        } catch (err) {
          toast(err.message || 'Save failed', true);
        } finally {
          busy = false;
          saveBtn.disabled = !canWrite;
        }
      });

      card.appendChild(el('h3', { text: isEdit ? 'Edit Official Notice' : 'Post Official Notice / Announcement' }));
      card.appendChild(el('div', { class: 'cso-ops-grid-2' }, [
        el('div', { class: 'field' }, [el('label', { text: 'Notice Headline *' }), titleInp]),
        el('div', { class: 'field' }, [el('label', { text: 'Priority' }), prioSel]),
        el('div', { class: 'field' }, [el('label', { text: 'Workflow Stage' }), stageSel]),
        el('div', { class: 'field' }, [el('label', { text: 'Expires At (ISO)' }), expInp]),
        el('div', { class: 'field' }, [el('label', { text: 'CTA Button Label' }), ctaLblInp]),
        el('div', { class: 'field' }, [el('label', { text: 'CTA Target URL (/... or https://...)' }), ctaUrlInp]),
        el('div', { class: 'field' }, [el('label', { text: 'SEO Title' }), seoTitleInp]),
        el('div', { class: 'field' }, [el('label', { text: 'SEO Description' }), seoDescInp])
      ]));
      card.appendChild(el('div', { class: 'field' }, [el('label', { text: 'Summary' }), sumTa]));
      card.appendChild(el('div', { class: 'cso-ops-actions' }, [saveBtn, cancelBtn]));
      composerBox.appendChild(card);
    }

    addBtn.addEventListener('click', function () { openForm(null); });

    async function load() {
      try {
        var res = await api('GET', 'content/announcements');
        clear(kpis);
        clear(previewBox);
        clear(tableBox);
        var k = res.kpis || {};
        [
          ['Total Notices', String(k.total_count || 0)],
          ['Active Live Notices', String(k.active_live_count || 0)],
          ['Urgent / Deadline', String(k.urgent_count || 0)],
          ['Expiring Soon (7d)', String(k.expiring_soon_count || 0)]
        ].forEach(function (pair) {
          kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
            el('span', { class: 'muted sm', text: pair[0] }),
            el('strong', { text: pair[1] })
          ]));
        });

        previewBox.appendChild(el('h3', { text: 'Live Public Notice Banner Preview' }));
        var ticker = Array.isArray(res.ticker_preview) ? res.ticker_preview : [];
        if (!ticker.length) {
          previewBox.appendChild(el('div', { class: 'muted sm', text: 'No active published notices currently live.' }));
        } else {
          ticker.slice(0, 3).forEach(function (t) {
            previewBox.appendChild(el('div', { class: 'cso-sec-sim-result ' + (t.notice_priority === 'urgent' ? 'is-deny' : 'is-allow') }, [
              el('div', { class: 'cso-ops-subhead' }, [
                el('strong', { text: t.title }),
                el('span', { class: 'badge ' + (t.notice_priority === 'urgent' ? 'bad' : 'ok'), text: t.notice_priority.toUpperCase() })
              ]),
              el('span', { class: 'muted sm', text: (t.summary || '') + (t.notice_cta_url ? ' · CTA: ' + t.notice_cta_url : '') })
            ]));
          });
        }

        var items = Array.isArray(res.items) ? res.items : [];
        if (!items.length) {
          tableBox.appendChild(el('div', { class: 'muted sm', text: 'No announcements created yet.' }));
          return;
        }
        var tbody = el('tbody');
        items.forEach(function (it) {
          var prioCls = it.notice_priority === 'urgent' ? 'bad' : (it.notice_priority === 'deadline' ? 'warn' : 'ok');
          var actTd = el('td', { class: 'cso-ops-actions' });
          if (canWrite) {
            var eb = el('button', { class: 'btn sm', type: 'button', text: 'Edit' });
            eb.addEventListener('click', function () { openForm(it); });
            actTd.appendChild(eb);
          }
          if (canStatus) {
            var nextSt = it.status === 'published' ? 'archived' : 'published';
            var sb = el('button', { class: 'btn sm', type: 'button', text: it.status === 'published' ? 'Expire / Archive' : 'Publish' });
            sb.addEventListener('click', async function () {
              sb.disabled = true;
              try {
                await api('PATCH', 'content/posts/' + encodeURIComponent(it.id) + '/status', { workflow_stage: nextSt });
                toast('Notice updated to ' + nextSt);
                await load();
              } catch (err) {
                toast(err.message || 'Status update failed', true);
                sb.disabled = false;
              }
            });
            actTd.appendChild(sb);
          }
          tbody.appendChild(el('tr', {}, [
            el('td', {}, [el('strong', { text: it.title }), el('div', { class: 'muted sm', text: it.notice_cta_url || 'No CTA' })]),
            el('td', {}, [el('span', { class: 'badge ' + prioCls, text: it.notice_priority })]),
            el('td', {}, [el('span', { class: 'badge ' + (it.status === 'published' && !it.is_expired ? 'ok' : 'warn'), text: it.is_expired ? 'expired' : it.status })]),
            el('td', { text: it.notice_expires_at ? String(it.notice_expires_at).slice(0, 10) : 'No expiry' }),
            actTd
          ]));
        });
        tableBox.appendChild(el('div', { class: 'cso-ops-table-wrap' }, [
          el('table', { class: 'table' }, [
            el('thead', {}, [el('tr', {}, [
              el('th', { text: 'Headline' }),
              el('th', { text: 'Priority' }),
              el('th', { text: 'Status' }),
              el('th', { text: 'Expiry' }),
              el('th', { text: 'Actions' })
            ])]),
            tbody
          ])
        ]));
      } catch (e) {
        toast(e.message || 'Failed to load announcements', true);
      }
    }

    load();
    return wrap;
  }

  function contentFeaturedStudioPanel() {
    var canWrite = Boolean(me && (me.role === 'admin' || me.role === 'editor'));
    var wrap = el('div', { class: 'cso-ops-studio' });
    var kpis = el('div', { class: 'cso-ops-kpis' });
    var previewBox = el('div', { class: 'cso-ops-card' });
    var queueBox = el('div');

    var pickSel = el('select', { class: 'select' });
    var rankInp = el('input', { class: 'input', type: 'number', min: '1', max: '50', value: '1' });
    var pinBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--primary', type: 'button', text: 'Pin Published Content' });
    if (!canWrite) pinBtn.disabled = true;

    wrap.appendChild(el('div', { class: 'cso-ops-hero' }, [
      el('div', {}, [
        el('span', { class: 'badge ok', text: 'HOMEPAGE SLOTS' }),
        el('h2', { text: 'Featured Content Studio' }),
        el('p', { class: 'muted', text: 'Curate the Hero #1 lead story and Top Highlights #2–#6 across all published editorial content.' })
      ])
    ]));
    wrap.appendChild(kpis);
    wrap.appendChild(previewBox);
    wrap.appendChild(el('div', { class: 'cso-ops-grid-2' }, [
      el('div', { class: 'cso-ops-card' }, [
        el('h3', { text: 'Pin Published Content to Featured' }),
        el('div', { class: 'field' }, [el('label', { text: 'Eligible Published Post' }), pickSel]),
        el('div', { class: 'field' }, [el('label', { text: 'Featured Slot Rank (1 = Hero Lead)' }), rankInp]),
        pinBtn
      ]),
      el('div', { class: 'cso-ops-card' }, [
        el('h3', { text: 'Ordered Featured Queue' }),
        queueBox
      ])
    ]));

    async function mutateFeatured(postId, isFeatured, rank) {
      await api('POST', 'content/featured', { post_id: postId, is_featured: isFeatured, featured_rank: rank });
      await load();
    }

    var pinBusy = false;
    pinBtn.addEventListener('click', async function () {
      if (!canWrite || pinBusy || !pickSel.value) return;
      pinBusy = true;
      pinBtn.disabled = true;
      try {
        await mutateFeatured(pickSel.value, true, parseInt(rankInp.value, 10) || 1);
        toast('Pinned to Featured slot');
      } catch (e) {
        toast(e.message || 'Pin failed', true);
      } finally {
        pinBusy = false;
        pinBtn.disabled = !canWrite;
      }
    });

    async function load() {
      try {
        var res = await api('GET', 'content/featured');
        clear(kpis);
        clear(previewBox);
        clear(queueBox);
        clear(pickSel);
        var k = res.kpis || {};
        [
          ['Active Featured Slots', String(k.slots_used || 0) + ' / ' + String(k.max_slots || 6)],
          ['Hero #1 Lead Story', String(k.hero_lead_title || 'None').slice(0, 28)],
          ['Content Type Mix', String(k.type_mix || 0) + ' types'],
          ['Homepage Ready', k.homepage_ready ? 'READY' : 'EMPTY']
        ].forEach(function (pair) {
          kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
            el('span', { class: 'muted sm', text: pair[0] }),
            el('strong', { text: pair[1] })
          ]));
        });

        var elig = Array.isArray(res.eligible_items) ? res.eligible_items : [];
        if (!elig.length) {
          pickSel.appendChild(el('option', { value: '', text: 'No eligible published posts available' }));
        } else {
          elig.forEach(function (it) {
            pickSel.appendChild(el('option', { value: it.id, text: '[' + it.post_type + '] ' + it.title }));
          });
        }

        var feat = Array.isArray(res.featured_items) ? res.featured_items : [];
        previewBox.appendChild(el('h3', { text: 'Homepage Featured Slot Preview' }));
        if (!feat.length) {
          previewBox.appendChild(el('div', { class: 'muted sm', text: 'Pin a published item to preview Hero #1 and Top Highlights.' }));
        } else {
          feat.slice(0, 6).forEach(function (it, idx) {
            previewBox.appendChild(el('div', { class: 'cso-sec-sim-result is-allow' }, [
              el('div', { class: 'cso-ops-subhead' }, [
                el('strong', { text: (idx === 0 ? 'HERO #1: ' : 'SLOT #' + (idx + 1) + ': ') + it.title }),
                el('span', { class: 'badge ok', text: it.post_type })
              ]),
              el('span', { class: 'muted sm', text: 'Rank #' + String(it.featured_rank || idx + 1) + ' · ' + (it.public_url || '') })
            ]));
          });
        }

        if (!feat.length) {
          queueBox.appendChild(el('div', { class: 'muted sm', text: 'No featured posts pinned yet.' }));
          return;
        }
        var tbody = el('tbody');
        feat.forEach(function (it, idx) {
          var actTd = el('td', { class: 'cso-ops-actions' });
          if (canWrite) {
            if (idx > 0) {
              var upBtn = el('button', { class: 'btn sm', type: 'button', text: '↑' });
              upBtn.addEventListener('click', function () { mutateFeatured(it.id, true, Math.max(1, (it.featured_rank || idx + 1) - 1)); });
              actTd.appendChild(upBtn);
            }
            var dnBtn = el('button', { class: 'btn sm', type: 'button', text: '↓' });
            dnBtn.addEventListener('click', function () { mutateFeatured(it.id, true, (it.featured_rank || idx + 1) + 1); });
            actTd.appendChild(dnBtn);

            if (idx !== 0) {
              var heroBtn = el('button', { class: 'btn sm', type: 'button', text: 'Hero #1' });
              heroBtn.addEventListener('click', function () { mutateFeatured(it.id, true, 1); });
              actTd.appendChild(heroBtn);
            }
            var unpinBtn = el('button', { class: 'btn sm danger', type: 'button', text: 'Unpin' });
            unpinBtn.addEventListener('click', function () { mutateFeatured(it.id, false, 0); });
            actTd.appendChild(unpinBtn);
          }
          tbody.appendChild(el('tr', {}, [
            el('td', { text: '#' + String(it.featured_rank || idx + 1) }),
            el('td', { text: it.title }),
            el('td', { text: it.post_type }),
            actTd
          ]));
        });
        queueBox.appendChild(el('div', { class: 'cso-ops-table-wrap' }, [
          el('table', { class: 'table' }, [
            el('thead', {}, [el('tr', {}, [
              el('th', { text: 'Rank' }),
              el('th', { text: 'Title' }),
              el('th', { text: 'Type' }),
              el('th', { text: 'Actions' })
            ])]),
            tbody
          ])
        ]));
      } catch (e) {
        toast(e.message || 'Failed to load featured content', true);
      }
    }

    load();
    return wrap;
  }

  function contentCategoriesStudioPanel() {
    var canWrite = Boolean(me && (me.role === 'admin' || me.role === 'editor'));
    var isAdmin = Boolean(me && me.role === 'admin');
    var wrap = el('div', { class: 'cso-ops-studio' });
    var kpis = el('div', { class: 'cso-ops-kpis' });
    var tableBox = el('div');

    var nameInp = el('input', { class: 'input', type: 'text', placeholder: 'Category Name (e.g. Odisha Economy)' });
    var slugInp = el('input', { class: 'input', type: 'text', placeholder: 'auto-slugified' });
    var descInp = el('input', { class: 'input', type: 'text', placeholder: 'Short editorial description...' });
    var sortInp = el('input', { class: 'input', type: 'number', value: '10' });
    var activeCb = el('input', { type: 'checkbox' });
    activeCb.checked = true;
    var createBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--primary', type: 'button', text: '+ Create Category' });
    if (!canWrite) createBtn.disabled = true;

    nameInp.addEventListener('input', function () {
      if (!slugInp.dataset.manual) {
        slugInp.value = nameInp.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
    });
    slugInp.addEventListener('input', function () { slugInp.dataset.manual = slugInp.value ? '1' : ''; });

    wrap.appendChild(el('div', { class: 'cso-ops-hero' }, [
      el('div', {}, [
        el('span', { class: 'badge ok', text: 'TAXONOMY GOVERNANCE' }),
        el('h2', { text: 'Content Categories Studio' }),
        el('p', { class: 'muted', text: 'Manage canonical CS Odisha content categories with live post counts and safe reassignment protection.' })
      ])
    ]));
    wrap.appendChild(kpis);
    wrap.appendChild(el('div', { class: 'cso-ops-grid-2' }, [
      el('div', { class: 'cso-ops-card' }, [
        el('h3', { text: 'Create Category' }),
        el('div', { class: 'field' }, [el('label', { text: 'Category Name *' }), nameInp]),
        el('div', { class: 'field' }, [el('label', { text: 'Slug Preview' }), slugInp]),
        el('div', { class: 'field' }, [el('label', { text: 'Description' }), descInp]),
        el('div', { class: 'field' }, [el('label', { text: 'Sort Order' }), sortInp]),
        el('div', { class: 'field' }, [el('label', {}, [activeCb, document.createTextNode(' Active Category')])]),
        createBtn
      ]),
      el('div', { class: 'cso-ops-card' }, [
        el('h3', { text: 'Category Directory' }),
        tableBox
      ])
    ]));

    var busy = false;
    createBtn.addEventListener('click', async function () {
      if (!canWrite || busy) return;
      busy = true;
      createBtn.disabled = true;
      try {
        await api('POST', 'content/categories', {
          name: nameInp.value.trim(),
          slug: slugInp.value.trim(),
          description: descInp.value.trim(),
          sort_order: parseInt(sortInp.value, 10) || 10,
          is_active: activeCb.checked
        });
        nameInp.value = '';
        slugInp.value = '';
        slugInp.dataset.manual = '';
        descInp.value = '';
        toast('Category created');
        await load();
      } catch (e) {
        toast(e.message || 'Category creation failed', true);
      } finally {
        busy = false;
        createBtn.disabled = !canWrite;
      }
    });

    async function load() {
      try {
        var res = await api('GET', 'content/categories');
        clear(kpis);
        clear(tableBox);
        var k = res.kpis || {};
        [
          ['Total Categories', String(k.total_categories || 0)],
          ['Active Categories', String(k.active_categories || 0)],
          ['Categorized Items', String(k.categorized_posts || 0)],
          ['Uncategorized Items', String(k.uncategorized_posts || 0)]
        ].forEach(function (pair) {
          kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
            el('span', { class: 'muted sm', text: pair[0] }),
            el('strong', { text: pair[1] })
          ]));
        });

        var items = Array.isArray(res.items) ? res.items : [];
        var tbody = el('tbody');
        items.forEach(function (cat) {
          var actTd = el('td', { class: 'cso-ops-actions' });
          if (canWrite) {
            var togBtn = el('button', { class: 'btn sm', type: 'button', text: cat.is_active ? 'Disable' : 'Enable' });
            togBtn.addEventListener('click', async function () {
              togBtn.disabled = true;
              try {
                await api('PUT', 'content/categories/' + encodeURIComponent(cat.slug), { is_active: !cat.is_active });
                toast('Category updated');
                await load();
              } catch (e) {
                toast(e.message || 'Update failed', true);
                togBtn.disabled = false;
              }
            });
            actTd.appendChild(togBtn);
          }
          if (isAdmin) {
            var delBtn = el('button', { class: 'btn sm danger', type: 'button', text: 'Delete' });
            delBtn.addEventListener('click', async function () {
              var reassignTo = '';
              if (cat.post_count > 0) {
                var others = items.filter(function (o) { return o.slug !== cat.slug; }).map(function (o) { return o.slug; });
                reassignTo = window.prompt('Category has ' + cat.post_count + ' post(s). Enter target category slug to reassign (' + others.join(', ') + '):', others[0] || '');
                if (!reassignTo) return;
              }
              delBtn.disabled = true;
              try {
                var qs = reassignTo ? ('?reassign_to=' + encodeURIComponent(reassignTo.trim())) : '';
                await api('DELETE', 'content/categories/' + encodeURIComponent(cat.slug) + qs);
                toast('Category deleted');
                await load();
              } catch (e) {
                toast(e.message || 'Delete failed', true);
                delBtn.disabled = false;
              }
            });
            actTd.appendChild(delBtn);
          }
          tbody.appendChild(el('tr', {}, [
            el('td', {}, [el('strong', { text: cat.name }), el('div', { class: 'muted sm', text: '/' + cat.slug })]),
            el('td', { text: String(cat.post_count || 0) + ' (' + String(cat.published_count || 0) + ' live)' }),
            el('td', {}, [el('span', { class: 'badge ' + (cat.is_active ? 'ok' : 'warn'), text: cat.is_active ? 'active' : 'inactive' })]),
            actTd
          ]));
        });
        tableBox.appendChild(el('div', { class: 'cso-ops-table-wrap' }, [
          el('table', { class: 'table' }, [
            el('thead', {}, [el('tr', {}, [
              el('th', { text: 'Category & Slug' }),
              el('th', { text: 'Posts' }),
              el('th', { text: 'Status' }),
              el('th', { text: 'Actions' })
            ])]),
            tbody
          ])
        ]));
      } catch (e) {
        toast(e.message || 'Failed to load categories', true);
      }
    }

    load();
    return wrap;
  }

  function contentTagsStudioPanel() {
    var canWrite = Boolean(me && (me.role === 'admin' || me.role === 'editor'));
    var isAdmin = Boolean(me && me.role === 'admin');
    var wrap = el('div', { class: 'cso-ops-studio' });
    var kpis = el('div', { class: 'cso-ops-kpis' });
    var mergePreview = el('div');
    var tableBox = el('div');

    var newTagInp = el('input', { class: 'input', type: 'text', placeholder: 'Canonical tag label (e.g. OPSC OAS)' });
    var addTagBtn = el('button', { class: 'cso-ops-btn', type: 'button', text: 'Register Canonical Tag' });
    if (!canWrite) addTagBtn.disabled = true;

    var fromInp = el('input', { class: 'input', type: 'text', placeholder: 'Source tag (e.g. opsc-oas)' });
    var toInp = el('input', { class: 'input', type: 'text', placeholder: 'Target tag (e.g. opsc)' });
    var dryBtn = el('button', { class: 'cso-ops-btn', type: 'button', text: 'Preview Impact (Dry-Run)' });
    var mergeBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--primary', type: 'button', text: 'Rename / Merge Tags' });
    if (!canWrite) { dryBtn.disabled = true; mergeBtn.disabled = true; }

    var filterInp = el('input', { class: 'input', type: 'search', placeholder: 'Filter tags...' });
    var allItems = [];

    wrap.appendChild(el('div', { class: 'cso-ops-hero' }, [
      el('div', {}, [
        el('span', { class: 'badge ok', text: 'TAG TAXONOMY' }),
        el('h2', { text: 'Tags & Topic Normalization Studio' }),
        el('p', { class: 'muted', text: 'Audit tag usage across all posts, register canonical tags, and atomically rename or merge duplicate tags.' })
      ])
    ]));
    wrap.appendChild(kpis);
    wrap.appendChild(el('div', { class: 'cso-ops-grid-2' }, [
      el('div', { class: 'cso-ops-card' }, [
        el('h3', { text: 'Register Canonical Tag' }),
        el('div', { class: 'field' }, [el('label', { text: 'Tag Label' }), newTagInp]),
        addTagBtn
      ]),
      el('div', { class: 'cso-ops-card' }, [
        el('h3', { text: 'Rename / Merge Duplicate Tags' }),
        el('div', { class: 'field' }, [el('label', { text: 'From Tag' }), fromInp]),
        el('div', { class: 'field' }, [el('label', { text: 'To Canonical Tag' }), toInp]),
        el('div', { class: 'cso-ops-actions' }, [dryBtn, mergeBtn]),
        mergePreview
      ])
    ]));
    wrap.appendChild(el('div', { class: 'cso-ops-card' }, [
      el('div', { class: 'cso-cnt-toolbar' }, [
        el('h3', { text: 'Tag Cloud & Usage Ledger' }),
        filterInp
      ]),
      tableBox
    ]));

    function renderTable() {
      clear(tableBox);
      var q = filterInp.value.trim().toLowerCase();
      var rows = allItems.filter(function (t) {
        return !q || t.slug.indexOf(q) !== -1 || t.label.toLowerCase().indexOf(q) !== -1;
      });
      if (!rows.length) {
        tableBox.appendChild(el('div', { class: 'muted sm', text: 'No matching tags.' }));
        return;
      }
      var tbody = el('tbody');
      rows.forEach(function (t) {
        var actTd = el('td', { class: 'cso-ops-actions' });
        if (isAdmin) {
          var delBtn = el('button', { class: 'btn sm danger', type: 'button', text: 'Delete' });
          delBtn.addEventListener('click', async function () {
            delBtn.disabled = true;
            try {
              await api('DELETE', 'content/tags/' + encodeURIComponent(t.slug));
              toast('Tag removed');
              await load();
            } catch (e) {
              toast(e.message || 'Delete failed', true);
              delBtn.disabled = false;
            }
          });
          actTd.appendChild(delBtn);
        }
        tbody.appendChild(el('tr', {}, [
          el('td', {}, [el('strong', { text: t.label }), el('div', { class: 'muted sm', text: '#' + t.slug })]),
          el('td', { text: String(t.post_count || 0) + ' posts (' + String(t.published_count || 0) + ' live)' }),
          el('td', { text: (t.sample_titles || []).join(' · ') || '—' }),
          actTd
        ]));
      });
      tableBox.appendChild(el('div', { class: 'cso-ops-table-wrap' }, [
        el('table', { class: 'table' }, [
          el('thead', {}, [el('tr', {}, [
            el('th', { text: 'Tag' }),
            el('th', { text: 'Usage' }),
            el('th', { text: 'Linked Titles' }),
            el('th', { text: 'Actions' })
          ])]),
          tbody
        ])
      ]));
    }

    filterInp.addEventListener('input', renderTable);

    var addBusy = false;
    addTagBtn.addEventListener('click', async function () {
      if (!canWrite || addBusy) return;
      addBusy = true;
      addTagBtn.disabled = true;
      try {
        await api('POST', 'content/tags', { label: newTagInp.value.trim() });
        newTagInp.value = '';
        toast('Canonical tag registered');
        await load();
      } catch (e) {
        toast(e.message || 'Failed to register tag', true);
      } finally {
        addBusy = false;
        addTagBtn.disabled = !canWrite;
      }
    });

    var mergeBusy = false;
    async function runMerge(isDry) {
      if (!canWrite || mergeBusy) return;
      mergeBusy = true;
      dryBtn.disabled = true;
      mergeBtn.disabled = true;
      clear(mergePreview);
      try {
        var res = await api('POST', 'content/tags/merge', {
          from_tag: fromInp.value.trim(),
          to_tag: toInp.value.trim(),
          dry_run: isDry
        });
        if (isDry) {
          mergePreview.appendChild(el('div', { class: 'cso-sec-sim-result is-allow' }, [
            el('strong', { text: 'Dry-Run: ' + String(res.affected_posts_count || 0) + ' post(s) will update (' + res.from_slug + ' → ' + res.to_slug + ')' }),
            el('div', { class: 'muted sm', text: (res.sample_titles || []).join(' · ') || 'No matching posts.' })
          ]));
        } else {
          fromInp.value = '';
          toInp.value = '';
          toast('Merged tags across ' + String(res.affected_posts_count || 0) + ' post(s)');
          await load();
        }
      } catch (e) {
        toast(e.message || 'Tag merge failed', true);
      } finally {
        mergeBusy = false;
        dryBtn.disabled = !canWrite;
        mergeBtn.disabled = !canWrite;
      }
    }

    dryBtn.addEventListener('click', function () { runMerge(true); });
    mergeBtn.addEventListener('click', function () { runMerge(false); });

    async function load() {
      try {
        var res = await api('GET', 'content/tags');
        clear(kpis);
        var k = res.kpis || {};
        [
          ['Total Unique Tags', String(k.total_unique_tags || 0)],
          ['Tagged Content Items', String(k.tagged_posts_count || 0)],
          ['Multi-Use Tags', String(k.multi_use_tags || 0)],
          ['Orphan / Single-Use', String(k.orphan_tags || 0)]
        ].forEach(function (pair) {
          kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
            el('span', { class: 'muted sm', text: pair[0] }),
            el('strong', { text: pair[1] })
          ]));
        });
        allItems = Array.isArray(res.items) ? res.items : [];
        renderTable();
      } catch (e) {
        toast(e.message || 'Failed to load tags', true);
      }
    }

    load();
    return wrap;
  }

  function contentEditorialCalendarPanel() {
    var canWrite = Boolean(me && (me.role === 'admin' || me.role === 'editor'));
    var wrap = el('div', { class: 'cso-ops-studio' });
    var kpis = el('div', { class: 'cso-ops-kpis' });
    var calBox = el('div');

    var curMonth = new Date(Date.now() + 19800000).toISOString().slice(0, 7);
    var curType = 'all';

    var prevBtn = el('button', { class: 'btn sm', type: 'button', text: '← Prev Month' });
    var curBtn = el('button', { class: 'btn sm', type: 'button', text: 'Current Month' });
    var nextBtn = el('button', { class: 'btn sm', type: 'button', text: 'Next Month →' });
    var monthLbl = el('strong', { text: curMonth });
    var typeSel = el('select', { class: 'select' }, [
      el('option', { value: 'all', text: 'All Types' }),
      el('option', { value: 'article', text: 'Articles & Blogs' }),
      el('option', { value: 'news', text: 'News & Updates' }),
      el('option', { value: 'current_affairs', text: 'Current Affairs' }),
      el('option', { value: 'announcement', text: 'Announcements' })
    ]);

    var draftSel = el('select', { class: 'select' });
    var dateInp = el('input', { class: 'input', type: 'date', value: new Date(Date.now() + 19800000).toISOString().slice(0, 10) });
    var slotBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--primary', type: 'button', text: 'Slot Draft onto Date' });
    if (!canWrite) slotBtn.disabled = true;

    function shiftMonth(ym, delta) {
      var parts = ym.split('-');
      var d = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1 + delta, 1));
      return d.toISOString().slice(0, 7);
    }

    wrap.appendChild(el('div', { class: 'cso-ops-hero' }, [
      el('div', {}, [
        el('span', { class: 'badge ok', text: 'EDITORIAL CALENDAR' }),
        el('h2', { text: 'Monthly Editorial & Publishing Calendar' }),
        el('p', { class: 'muted', text: 'Visualize published and scheduled content day-by-day and slot draft backlog items onto target dates.' })
      ])
    ]));
    wrap.appendChild(kpis);
    wrap.appendChild(el('div', { class: 'cso-ops-card' }, [
      el('h3', { text: 'Quick-Slot Draft onto Date' }),
      el('div', { class: 'cso-ops-grid-2' }, [
        el('div', { class: 'field' }, [el('label', { text: 'Unscheduled Draft Backlog' }), draftSel]),
        el('div', { class: 'field' }, [el('label', { text: 'Target Publish Date' }), dateInp])
      ]),
      slotBtn
    ]));
    wrap.appendChild(el('div', { class: 'cso-ops-card' }, [
      el('div', { class: 'cso-cnt-toolbar' }, [
        el('div', { class: 'cso-ops-actions' }, [prevBtn, curBtn, nextBtn, monthLbl]),
        typeSel
      ]),
      calBox
    ]));

    function renderGrid(month, days) {
      clear(calBox);
      var parts = month.split('-');
      var year = Number(parts[0]);
      var monIdx = Number(parts[1]) - 1;
      var firstDow = new Date(Date.UTC(year, monIdx, 1)).getUTCDay();
      var daysInMonth = new Date(Date.UTC(year, monIdx + 1, 0)).getUTCDate();

      var grid = el('div', { class: 'cso-cnt-cal-grid' });
      ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(function (d) {
        grid.appendChild(el('div', { class: 'cso-cnt-cal-head', text: d }));
      });
      for (var pad = 0; pad < firstDow; pad++) {
        grid.appendChild(el('div', { class: 'cso-cnt-cal-cell is-empty' }));
      }
      for (var day = 1; day <= daysInMonth; day++) {
        var key = month + '-' + String(day).padStart(2, '0');
        var list = (days && days[key]) || [];
        var cell = el('div', { class: 'cso-cnt-cal-cell' }, [
          el('div', { class: 'cso-cnt-cal-day', text: String(day) })
        ]);
        list.slice(0, 4).forEach(function (it) {
          var cls = it.status === 'published' ? 'is-pub' : (it.workflow_stage === 'scheduled' || it.status === 'scheduled' ? 'is-sched' : 'is-draft');
          cell.appendChild(el('div', {
            class: 'cso-cnt-cal-pill ' + cls,
            title: '[' + it.post_type + '] ' + it.title + ' (' + (it.workflow_stage || it.status) + ')',
            text: it.title
          }));
        });
        if (list.length > 4) {
          cell.appendChild(el('span', { class: 'muted sm', text: '+' + String(list.length - 4) + ' more' }));
        }
        grid.appendChild(cell);
      }
      calBox.appendChild(grid);
    }

    async function load() {
      monthLbl.textContent = curMonth;
      try {
        var res = await api('GET', 'content/calendar?month=' + encodeURIComponent(curMonth) + '&type=' + encodeURIComponent(curType));
        clear(kpis);
        clear(draftSel);
        var k = res.kpis || {};
        [
          ['Month Total Items', String(k.total_in_month || 0)],
          ['Published on Schedule', String(k.published_in_month || 0)],
          ['Upcoming Scheduled', String(k.scheduled_in_month || 0)],
          ['Unscheduled Drafts', String(k.drafts_backlog || 0)]
        ].forEach(function (pair) {
          kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
            el('span', { class: 'muted sm', text: pair[0] }),
            el('strong', { text: pair[1] })
          ]));
        });

        var backlog = Array.isArray(res.drafts_backlog) ? res.drafts_backlog : [];
        if (!backlog.length) {
          draftSel.appendChild(el('option', { value: '', text: 'No unscheduled drafts in backlog' }));
        } else {
          backlog.forEach(function (d) {
            draftSel.appendChild(el('option', { value: d.id, text: '[' + d.post_type + '] ' + d.title }));
          });
        }
        renderGrid(res.month || curMonth, res.days || {});
      } catch (e) {
        toast(e.message || 'Failed to load editorial calendar', true);
      }
    }

    prevBtn.addEventListener('click', function () { curMonth = shiftMonth(curMonth, -1); load(); });
    curBtn.addEventListener('click', function () { curMonth = new Date(Date.now() + 19800000).toISOString().slice(0, 7); load(); });
    nextBtn.addEventListener('click', function () { curMonth = shiftMonth(curMonth, 1); load(); });
    typeSel.addEventListener('change', function () { curType = typeSel.value; load(); });

    var slotBusy = false;
    slotBtn.addEventListener('click', async function () {
      if (!canWrite || slotBusy || !draftSel.value) return;
      slotBusy = true;
      slotBtn.disabled = true;
      try {
        await api('POST', 'content/calendar/slot', {
          post_id: draftSel.value,
          target_date: dateInp.value
        });
        toast('Draft slotted onto ' + dateInp.value);
        await load();
      } catch (e) {
        toast(e.message || 'Slotting failed', true);
      } finally {
        slotBusy = false;
        slotBtn.disabled = !canWrite;
      }
    });

    load();
    return wrap;
  }

  function contentPublishingWorkflowPanel() {
    var isAdmin = Boolean(me && me.role === 'admin');
    var canReview = Boolean(me && (me.role === 'admin' || me.role === 'reviewer'));
    var canWrite = Boolean(me && (me.role === 'admin' || me.role === 'editor' || me.role === 'reviewer'));

    var wrap = el('div', { class: 'cso-ops-studio' });
    var kpis = el('div', { class: 'cso-ops-kpis' });
    var policyCard = el('div', { class: 'cso-ops-card' });
    var pipeBox = el('div');

    var minWordsInp = el('input', { class: 'input', type: 'number', min: '0', max: '2000' });
    var reqSeoCb = el('input', { type: 'checkbox' });
    var reqSignoffCb = el('input', { type: 'checkbox' });
    var savePolBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--primary', type: 'button', text: 'Save Quality Gate Policy' });
    if (!isAdmin) savePolBtn.disabled = true;

    policyCard.appendChild(el('h3', { text: 'Editorial Quality Gate Policy' }));
    policyCard.appendChild(el('div', { class: 'cso-ops-grid-2' }, [
      el('div', { class: 'field' }, [el('label', { text: 'Minimum Word Count (0-2000)' }), minWordsInp]),
      el('div', { class: 'field' }, [
        el('label', {}, [reqSeoCb, document.createTextNode(' Require SEO Title & Description')]),
        el('label', {}, [reqSignoffCb, document.createTextNode(' Require Reviewer Sign-Off')])
      ])
    ]));
    policyCard.appendChild(savePolBtn);

    wrap.appendChild(el('div', { class: 'cso-ops-hero' }, [
      el('div', {}, [
        el('span', { class: 'badge warn', text: 'APPROVAL PIPELINE' }),
        el('h2', { text: 'Publishing Workflow & Quality Gates' }),
        el('p', { class: 'muted', text: 'Move content through Draft → In Review → Approved → Published with automated SEO/word-count gates and reviewer notes.' })
      ])
    ]));
    wrap.appendChild(kpis);
    wrap.appendChild(policyCard);
    wrap.appendChild(el('div', { class: 'cso-ops-card' }, [
      el('h3', { text: 'Editorial Approval Pipeline' }),
      pipeBox
    ]));

    var polBusy = false;
    savePolBtn.addEventListener('click', async function () {
      if (!isAdmin || polBusy) return;
      polBusy = true;
      savePolBtn.disabled = true;
      try {
        await api('PUT', 'content/workflow/policy', {
          min_word_count: parseInt(minWordsInp.value, 10) || 0,
          require_seo_meta: reqSeoCb.checked,
          require_reviewer_signoff: reqSignoffCb.checked
        });
        toast('Workflow quality gate policy saved');
        await load();
      } catch (e) {
        toast(e.message || 'Policy save failed', true);
      } finally {
        polBusy = false;
        savePolBtn.disabled = !isAdmin;
      }
    });

    async function doTransition(postId, action, notes) {
      await api('POST', 'content/workflow/transition', {
        post_id: postId,
        action: action,
        review_notes: notes
      });
      toast('Workflow stage updated (' + action + ')');
      await load();
    }

    function renderPipeline(stages) {
      clear(pipeBox);
      var grid = el('div', { class: 'cso-cnt-pipe-grid' });
      var defs = [
        ['draft', 'Draft'],
        ['in_review', 'In Review'],
        ['approved', 'Approved'],
        ['published', 'Published']
      ];
      defs.forEach(function (def) {
        var key = def[0];
        var list = (stages && stages[key]) || [];
        var col = el('div', { class: 'cso-cnt-pipe-col' }, [
          el('div', { class: 'cso-ops-subhead' }, [
            el('strong', { text: def[1] }),
            el('span', { class: 'badge ok', text: String(list.length) })
          ])
        ]);
        if (!list.length) {
          col.appendChild(el('div', { class: 'muted sm', text: 'No items in ' + def[1] + '.' }));
        } else {
          list.slice(0, 12).forEach(function (it) {
            var notesInp = el('input', { class: 'input', type: 'text', value: it.review_notes || '', placeholder: 'Reviewer notes...' });
            var btns = el('div', { class: 'cso-ops-actions' });
            if (canWrite && key === 'draft') {
              var subBtn = el('button', { class: 'btn sm', type: 'button', text: 'Submit for Review' });
              subBtn.addEventListener('click', async function () {
                subBtn.disabled = true;
                try { await doTransition(it.id, 'submit_for_review', notesInp.value.trim()); }
                catch (e) { toast(e.message || 'Failed', true); subBtn.disabled = false; }
              });
              btns.appendChild(subBtn);
            }
            if (canReview && key === 'in_review') {
              var appBtn = el('button', { class: 'btn sm', type: 'button', text: 'Approve' });
              appBtn.addEventListener('click', async function () {
                appBtn.disabled = true;
                try { await doTransition(it.id, 'approve', notesInp.value.trim()); }
                catch (e) { toast(e.message || 'Failed', true); appBtn.disabled = false; }
              });
              var chgBtn = el('button', { class: 'btn sm danger', type: 'button', text: 'Request Changes' });
              chgBtn.addEventListener('click', async function () {
                chgBtn.disabled = true;
                try { await doTransition(it.id, 'request_changes', notesInp.value.trim()); }
                catch (e) { toast(e.message || 'Failed', true); chgBtn.disabled = false; }
              });
              btns.appendChild(appBtn);
              btns.appendChild(chgBtn);
            }
            if (canWrite && (key === 'approved' || key === 'in_review' || key === 'draft')) {
              var pubBtn = el('button', { class: 'btn sm primary', type: 'button', text: 'Publish Live' });
              pubBtn.addEventListener('click', async function () {
                pubBtn.disabled = true;
                try { await doTransition(it.id, 'publish', notesInp.value.trim()); }
                catch (e) { toast(e.message || 'Blocked by quality gate', true); pubBtn.disabled = false; }
              });
              btns.appendChild(pubBtn);
            }
            col.appendChild(el('div', { class: 'cso-cnt-pipe-card' }, [
              el('strong', { text: it.title }),
              el('div', { class: 'muted sm', text: it.post_type + ' · ' + String(it.word_count || 0) + ' words · ' + (it.has_seo_meta ? 'SEO ✓' : 'SEO ✗') }),
              key !== 'published' ? notesInp : el('span', { class: 'muted sm', text: it.reviewed_by ? ('Reviewed by ' + it.reviewed_by) : 'Live' }),
              btns
            ]));
          });
        }
        grid.appendChild(col);
      });
      pipeBox.appendChild(grid);
    }

    async function load() {
      try {
        var res = await api('GET', 'content/workflow');
        clear(kpis);
        var k = res.kpis || {};
        [
          ['Drafts in Progress', String(k.drafts_count || 0)],
          ['Awaiting Review', String(k.in_review_count || 0)],
          ['Approved Ready', String(k.approved_count || 0)],
          ['Gate Pass Rate', String(k.gate_pass_rate || 100) + '%']
        ].forEach(function (pair) {
          kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
            el('span', { class: 'muted sm', text: pair[0] }),
            el('strong', { text: pair[1] })
          ]));
        });

        var pol = res.policy || {};
        minWordsInp.value = String(pol.min_word_count !== undefined ? pol.min_word_count : 20);
        reqSeoCb.checked = Boolean(pol.require_seo_meta);
        reqSignoffCb.checked = Boolean(pol.require_reviewer_signoff);
        renderPipeline(res.stages || {});
      } catch (e) {
        toast(e.message || 'Failed to load workflow state', true);
      }
    }

    load();
    return wrap;
  }

  function contentScheduledStudioPanel() {
    var canWrite = Boolean(me && (me.role === 'admin' || me.role === 'editor'));
    var wrap = el('div', { class: 'cso-ops-studio' });
    var kpis = el('div', { class: 'cso-ops-kpis' });
    var dryOut = el('div');
    var tableBox = el('div');

    var dryBtn = el('button', { class: 'cso-ops-btn', type: 'button', text: 'Preview Due Dispatch (Dry Run)' });
    var liveBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--primary', type: 'button', text: 'Dispatch All Due Scheduled Posts Now' });
    if (!canWrite) liveBtn.disabled = true;

    wrap.appendChild(el('div', { class: 'cso-ops-hero' }, [
      el('div', {}, [
        el('span', { class: 'badge ok', text: 'SCHEDULED QUEUE' }),
        el('h2', { text: 'Scheduled Content & Timed Dispatch Studio' }),
        el('p', { class: 'muted', text: 'Inspect due and upcoming scheduled posts, preview batch go-live impact, or reschedule back to draft.' })
      ]),
      el('div', { class: 'cso-ops-actions' }, [dryBtn, liveBtn])
    ]));
    wrap.appendChild(kpis);
    wrap.appendChild(dryOut);
    wrap.appendChild(el('div', { class: 'cso-ops-card' }, [
      el('h3', { text: 'Scheduled Publication Queue' }),
      tableBox
    ]));

    var dispatchBusy = false;
    async function runDispatch(isDry, postId) {
      if (dispatchBusy) return;
      if (!isDry && !canWrite) return;
      dispatchBusy = true;
      dryBtn.disabled = true;
      liveBtn.disabled = true;
      clear(dryOut);
      try {
        var res = await api('POST', 'content/scheduled/dispatch', {
          dry_run: isDry,
          post_id: postId || null
        });
        if (isDry) {
          dryOut.appendChild(el('div', { class: 'cso-sec-sim-result is-allow' }, [
            el('strong', { text: 'Dry-Run: ' + String(res.would_publish_count || 0) + ' due scheduled post(s) ready to publish.' }),
            el('div', { class: 'muted sm', text: (res.candidates || []).map(function (c) { return c.title; }).join(' · ') || 'No due items right now.' })
          ]));
        } else {
          toast('Published ' + String(res.published_count || 0) + ' scheduled post(s)');
          await load();
        }
      } catch (e) {
        toast(e.message || 'Scheduled dispatch failed', true);
      } finally {
        dispatchBusy = false;
        dryBtn.disabled = false;
        liveBtn.disabled = !canWrite;
      }
    }

    dryBtn.addEventListener('click', function () { runDispatch(true, null); });
    liveBtn.addEventListener('click', function () { runDispatch(false, null); });

    async function load() {
      try {
        var res = await api('GET', 'content/scheduled');
        clear(kpis);
        clear(tableBox);
        var k = res.kpis || {};
        [
          ['Total Scheduled Queue', String(k.total_scheduled || 0)],
          ['Due / Ready to Dispatch', String(k.due_count || 0)],
          ['Next Go-Live', k.next_go_live ? String(k.next_go_live).slice(0, 16).replace('T', ' ') : 'None'],
          ['Last Queue Dispatch', k.last_dispatch_at ? String(k.last_dispatch_at).slice(0, 16).replace('T', ' ') : 'Never']
        ].forEach(function (pair) {
          kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
            el('span', { class: 'muted sm', text: pair[0] }),
            el('strong', { text: pair[1] })
          ]));
        });

        var all = [].concat(res.due_queue || [], res.upcoming_queue || []);
        if (!all.length) {
          tableBox.appendChild(el('div', { class: 'muted sm', text: 'No scheduled posts in the queue.' }));
          return;
        }
        var tbody = el('tbody');
        all.forEach(function (it) {
          var actTd = el('td', { class: 'cso-ops-actions' });
          if (canWrite) {
            var pubNow = el('button', { class: 'btn sm primary', type: 'button', text: 'Publish Now' });
            pubNow.addEventListener('click', function () { runDispatch(false, it.id); });
            actTd.appendChild(pubNow);

            var reschBtn = el('button', { class: 'btn sm', type: 'button', text: 'Reschedule' });
            reschBtn.addEventListener('click', async function () {
              var nextIso = window.prompt('Enter new ISO-8601 date/time (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ):', String(it.scheduled_for || '').slice(0, 10));
              if (!nextIso) return;
              try {
                await api('PATCH', 'content/scheduled/' + encodeURIComponent(it.id), { action: 'reschedule', scheduled_for: nextIso.trim() });
                toast('Rescheduled to ' + nextIso.trim());
                await load();
              } catch (e) { toast(e.message || 'Reschedule failed', true); }
            });
            actTd.appendChild(reschBtn);

            var unBtn = el('button', { class: 'btn sm danger', type: 'button', text: 'To Draft' });
            unBtn.addEventListener('click', async function () {
              try {
                await api('PATCH', 'content/scheduled/' + encodeURIComponent(it.id), { action: 'unschedule' });
                toast('Moved back to draft');
                await load();
              } catch (e) { toast(e.message || 'Failed', true); }
            });
            actTd.appendChild(unBtn);
          }
          tbody.appendChild(el('tr', {}, [
            el('td', {}, [el('strong', { text: it.title }), el('div', { class: 'muted sm', text: it.post_type + ' · ' + (it.has_seo_meta ? 'SEO ✓' : 'No SEO') })]),
            el('td', { text: String(it.scheduled_for || '').slice(0, 19).replace('T', ' ') }),
            el('td', {}, [el('span', { class: 'badge ' + (it.is_due ? 'warn' : 'ok'), text: it.is_due ? 'DUE NOW' : 'UPCOMING' })]),
            actTd
          ]));
        });
        tableBox.appendChild(el('div', { class: 'cso-ops-table-wrap' }, [
          el('table', { class: 'table' }, [
            el('thead', {}, [el('tr', {}, [
              el('th', { text: 'Post & SEO' }),
              el('th', { text: 'Scheduled For' }),
              el('th', { text: 'Queue State' }),
              el('th', { text: 'Actions' })
            ])]),
            tbody
          ])
        ]));
      } catch (e) {
        toast(e.message || 'Failed to load scheduled queue', true);
      }
    }

    load();
    return wrap;
  }

  function contentArchiveStudioPanel() {
    var canWrite = Boolean(me && (me.role === 'admin' || me.role === 'editor'));
    var isAdmin = Boolean(me && me.role === 'admin');
    var wrap = el('div', { class: 'cso-ops-studio' });
    var kpis = el('div', { class: 'cso-ops-kpis' });
    var tableBox = el('div');
    var pagerBox = el('div', { class: 'cso-cnt-pager' });

    var state = { type: 'all', q: '', limit: 25, offset: 0, total: 0 };

    var eligSel = el('select', { class: 'select' });
    var reasonInp = el('input', { class: 'input', type: 'text', placeholder: 'Archive reason (e.g. Exam cycle concluded)...' });
    var archBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--primary', type: 'button', text: 'Archive Selected Content' });
    if (!canWrite) archBtn.disabled = true;

    var typeSel = el('select', { class: 'select' }, [
      el('option', { value: 'all', text: 'All Types' }),
      el('option', { value: 'article', text: 'Articles & Blogs' }),
      el('option', { value: 'news', text: 'News & Updates' }),
      el('option', { value: 'current_affairs', text: 'Current Affairs' }),
      el('option', { value: 'announcement', text: 'Announcements' })
    ]);
    var searchInp = el('input', { class: 'input', type: 'search', placeholder: 'Search archived title, slug, or reason...' });
    var searchBtn = el('button', { class: 'cso-ops-btn', type: 'button', text: 'Search' });

    wrap.appendChild(el('div', { class: 'cso-ops-hero' }, [
      el('div', {}, [
        el('span', { class: 'badge warn', text: 'ARCHIVE VAULT' }),
        el('h2', { text: 'Content Archive & Lifecycle Shield' }),
        el('p', { class: 'muted', text: 'Safely retire outdated content without losing history, restore archived posts to draft, or execute guarded permanent purges.' })
      ])
    ]));
    wrap.appendChild(kpis);
    wrap.appendChild(el('div', { class: 'cso-ops-card' }, [
      el('h3', { text: 'Quick-Archive Live Content' }),
      el('div', { class: 'cso-ops-grid-2' }, [
        el('div', { class: 'field' }, [el('label', { text: 'Active / Published Post' }), eligSel]),
        el('div', { class: 'field' }, [el('label', { text: 'Archive Reason' }), reasonInp])
      ]),
      archBtn
    ]));
    wrap.appendChild(el('div', { class: 'cso-ops-card' }, [
      el('div', { class: 'cso-cnt-toolbar' }, [
        el('div', { class: 'cso-cnt-toolbar-left' }, [searchInp, searchBtn]),
        typeSel
      ]),
      tableBox,
      pagerBox
    ]));

    var archBusy = false;
    archBtn.addEventListener('click', async function () {
      if (!canWrite || archBusy || !eligSel.value) return;
      archBusy = true;
      archBtn.disabled = true;
      try {
        await api('POST', 'content/archive', {
          post_id: eligSel.value,
          action: 'archive',
          archive_reason: reasonInp.value.trim()
        });
        reasonInp.value = '';
        toast('Content archived');
        await load();
      } catch (e) {
        toast(e.message || 'Archive failed', true);
      } finally {
        archBusy = false;
        archBtn.disabled = !canWrite;
      }
    });

    async function load() {
      try {
        var qs = 'type=' + encodeURIComponent(state.type) +
          '&q=' + encodeURIComponent(state.q) +
          '&limit=' + String(state.limit) +
          '&offset=' + String(state.offset);
        var res = await api('GET', 'content/archive?' + qs);
        clear(kpis);
        clear(eligSel);
        clear(tableBox);
        clear(pagerBox);
        var k = res.kpis || {};
        [
          ['Total Archived Items', String(k.total_archived || 0)],
          ['Archived This Month', String(k.archived_this_month || 0)],
          ['Active Eligible', String(k.reclaimable_active_count || 0)],
          ['Redirect Safety Shield', 'ACTIVE']
        ].forEach(function (pair) {
          kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
            el('span', { class: 'muted sm', text: pair[0] }),
            el('strong', { text: pair[1] })
          ]));
        });

        var elig = Array.isArray(res.eligible_items) ? res.eligible_items : [];
        if (!elig.length) {
          eligSel.appendChild(el('option', { value: '', text: 'No active posts eligible to archive' }));
        } else {
          elig.forEach(function (it) {
            eligSel.appendChild(el('option', { value: it.id, text: '[' + it.post_type + '] ' + it.title }));
          });
        }

        var rows = Array.isArray(res.items) ? res.items : [];
        state.total = Number((res.paging && res.paging.total) || rows.length);
        if (!rows.length) {
          tableBox.appendChild(el('div', { class: 'muted sm', text: 'No archived content matches the current filter.' }));
        } else {
          var tbody = el('tbody');
          rows.forEach(function (it) {
            var actTd = el('td', { class: 'cso-ops-actions' });
            if (canWrite) {
              var restBtn = el('button', { class: 'btn sm', type: 'button', text: 'Restore to Draft' });
              restBtn.addEventListener('click', async function () {
                restBtn.disabled = true;
                try {
                  await api('POST', 'content/archive', { post_id: it.id, action: 'restore_draft' });
                  toast('Restored to draft');
                  await load();
                } catch (e) { toast(e.message || 'Restore failed', true); restBtn.disabled = false; }
              });
              actTd.appendChild(restBtn);
            }
            if (isAdmin) {
              var purgeBtn = el('button', { class: 'btn sm danger', type: 'button', text: 'Purge' });
              purgeBtn.addEventListener('click', async function () {
                var phrase = window.prompt('Permanent purge cannot be undone. Type PURGE_ARCHIVED to confirm:');
                if (!phrase) return;
                purgeBtn.disabled = true;
                try {
                  await api('DELETE', 'content/archive/' + encodeURIComponent(it.id) + '?confirm=' + encodeURIComponent(phrase.trim()));
                  toast('Archived item permanently purged');
                  await load();
                } catch (e) { toast(e.message || 'Purge failed', true); purgeBtn.disabled = false; }
              });
              actTd.appendChild(purgeBtn);
            }
            tbody.appendChild(el('tr', {}, [
              el('td', {}, [el('strong', { text: it.title }), el('div', { class: 'muted sm', text: '/' + it.slug + ' · ' + it.post_type })]),
              el('td', { text: it.archive_reason || '—' }),
              el('td', { text: String(it.archived_at || it.updated_at || '').slice(0, 16).replace('T', ' ') }),
              actTd
            ]));
          });
          tableBox.appendChild(el('div', { class: 'cso-ops-table-wrap' }, [
            el('table', { class: 'table' }, [
              el('thead', {}, [el('tr', {}, [
                el('th', { text: 'Title & Slug' }),
                el('th', { text: 'Reason' }),
                el('th', { text: 'Archived At' }),
                el('th', { text: 'Actions' })
              ])]),
              tbody
            ])
          ]));
        }

        var prevPage = el('button', { class: 'btn sm', type: 'button', text: '← Prev' });
        prevPage.disabled = state.offset <= 0;
        prevPage.addEventListener('click', function () { state.offset = Math.max(0, state.offset - state.limit); load(); });
        var nextPage = el('button', { class: 'btn sm', type: 'button', text: 'Next →' });
        nextPage.disabled = state.offset + state.limit >= state.total;
        nextPage.addEventListener('click', function () { state.offset += state.limit; load(); });
        pagerBox.appendChild(el('span', { class: 'muted sm', text: 'Showing ' + (state.total ? state.offset + 1 : 0) + '–' + Math.min(state.total, state.offset + rows.length) + ' of ' + state.total }));
        pagerBox.appendChild(el('div', { class: 'cso-ops-actions' }, [prevPage, nextPage]));
      } catch (e) {
        toast(e.message || 'Failed to load archive', true);
      }
    }

    typeSel.addEventListener('change', function () { state.type = typeSel.value; state.offset = 0; load(); });
    searchBtn.addEventListener('click', function () { state.q = searchInp.value.trim(); state.offset = 0; load(); });
    load();
    return wrap;
  }

  function contentRevisionsStudioPanel() {
    var canWrite = Boolean(me && (me.role === 'admin' || me.role === 'editor'));
    var wrap = el('div', { class: 'cso-ops-studio' });
    var kpis = el('div', { class: 'cso-ops-kpis' });
    var diffBox = el('div');
    var tableBox = el('div');
    var pagerBox = el('div', { class: 'cso-cnt-pager' });

    var state = { post_id: '', q: '', limit: 25, offset: 0, total: 0 };

    var postSel = el('select', { class: 'select' });
    var searchInp = el('input', { class: 'input', type: 'search', placeholder: 'Search revision title or change summary...' });
    var searchBtn = el('button', { class: 'cso-ops-btn', type: 'button', text: 'Filter' });

    wrap.appendChild(el('div', { class: 'cso-ops-hero' }, [
      el('div', {}, [
        el('span', { class: 'badge ok', text: 'REVISION VAULT' }),
        el('h2', { text: 'Content Revisions & Zero-Loss Rollback Studio' }),
        el('p', { class: 'muted', text: 'Inspect field-level diffs against the live D1 post and roll back any version with automatic pre-restore snapshotting.' })
      ])
    ]));
    wrap.appendChild(kpis);
    wrap.appendChild(diffBox);
    wrap.appendChild(el('div', { class: 'cso-ops-card' }, [
      el('div', { class: 'cso-cnt-toolbar' }, [
        el('div', { class: 'cso-cnt-toolbar-left' }, [postSel, searchInp, searchBtn])
      ]),
      tableBox,
      pagerBox
    ]));

    async function inspectDiff(revId) {
      clear(diffBox);
      try {
        var res = await api('POST', 'content/revisions/compare', { revision_id: revId, target_revision_id: 'LIVE_POST' });
        var d = res.diffs || {};
        var card = el('div', { class: 'cso-ops-card' }, [
          el('div', { class: 'cso-ops-subhead' }, [
            el('h3', { text: 'Diff Inspector: Revision ' + revId + ' vs. Live Post' }),
            el('span', { class: 'badge ok', text: 'Word Delta: ' + (d.body_word_delta >= 0 ? '+' : '') + String(d.body_word_delta || 0) })
          ])
        ]);
        var tbody = el('tbody');
        ['title', 'slug', 'category_slug', 'workflow_stage', 'excerpt'].forEach(function (field) {
          var fd = d[field] || {};
          tbody.appendChild(el('tr', {}, [
            el('td', { text: field }),
            el('td', { text: String(fd.left || '—').slice(0, 120) }),
            el('td', { text: String(fd.right || '—').slice(0, 120) }),
            el('td', {}, [el('span', { class: 'badge ' + (fd.changed ? 'warn' : 'ok'), text: fd.changed ? 'CHANGED' : 'SAME' })])
          ]));
        });
        card.appendChild(el('div', { class: 'cso-ops-table-wrap' }, [
          el('table', { class: 'table' }, [
            el('thead', {}, [el('tr', {}, [
              el('th', { text: 'Field' }),
              el('th', { text: 'Revision Snapshot' }),
              el('th', { text: 'Live Post' }),
              el('th', { text: 'Status' })
            ])]),
            tbody
          ])
        ]));
        diffBox.appendChild(card);
      } catch (e) {
        toast(e.message || 'Diff compare failed', true);
      }
    }

    async function load() {
      try {
        var qs = 'post_id=' + encodeURIComponent(state.post_id) +
          '&q=' + encodeURIComponent(state.q) +
          '&limit=' + String(state.limit) +
          '&offset=' + String(state.offset);
        var res = await api('GET', 'content/revisions?' + qs);
        clear(kpis);
        clear(tableBox);
        clear(pagerBox);
        var k = res.kpis || {};
        [
          ['Total Saved Revisions', String(k.total_revisions || 0)],
          ['Versioned Posts', String(k.posts_with_history || 0)],
          ['Auto-Snapshot Guard', 'ON'],
          ['Latest Revision', k.latest_revision_at ? String(k.latest_revision_at).slice(0, 16).replace('T', ' ') : 'None']
        ].forEach(function (pair) {
          kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
            el('span', { class: 'muted sm', text: pair[0] }),
            el('strong', { text: pair[1] })
          ]));
        });

        var curSelVal = state.post_id;
        clear(postSel);
        postSel.appendChild(el('option', { value: '', text: 'All Versioned Posts' }));
        (res.posts_selector || []).forEach(function (ps) {
          postSel.appendChild(el('option', { value: ps.post_id, text: (ps.title || ps.post_id) + ' (' + ps.rev_count + ')' }));
        });
        postSel.value = curSelVal;

        var rows = Array.isArray(res.items) ? res.items : [];
        state.total = Number((res.paging && res.paging.total) || rows.length);
        if (!rows.length) {
          tableBox.appendChild(el('div', { class: 'muted sm', text: 'No revisions recorded yet.' }));
        } else {
          var tbody = el('tbody');
          rows.forEach(function (r) {
            var actTd = el('td', { class: 'cso-ops-actions' });
            var diffBtn = el('button', { class: 'btn sm', type: 'button', text: 'Diff vs Live' });
            diffBtn.addEventListener('click', function () { inspectDiff(r.id); });
            actTd.appendChild(diffBtn);

            if (canWrite) {
              var rollBtn = el('button', { class: 'btn sm primary', type: 'button', text: 'Rollback' });
              rollBtn.addEventListener('click', async function () {
                rollBtn.disabled = true;
                try {
                  await api('POST', 'content/revisions/' + encodeURIComponent(r.id) + '/restore', {});
                  toast('Restored revision v' + r.revision_number + ' as draft (current state auto-snapshotted)');
                  await load();
                } catch (e) { toast(e.message || 'Restore failed', true); rollBtn.disabled = false; }
              });
              actTd.appendChild(rollBtn);
            }
            tbody.appendChild(el('tr', {}, [
              el('td', { text: 'v' + String(r.revision_number || 1) }),
              el('td', {}, [el('strong', { text: r.title }), el('div', { class: 'muted sm', text: r.post_id + ' · ' + r.change_summary })]),
              el('td', { text: r.actor_email || 'admin' }),
              el('td', { text: String(r.created_at || '').slice(0, 19).replace('T', ' ') }),
              actTd
            ]));
          });
          tableBox.appendChild(el('div', { class: 'cso-ops-table-wrap' }, [
            el('table', { class: 'table' }, [
              el('thead', {}, [el('tr', {}, [
                el('th', { text: 'Ver' }),
                el('th', { text: 'Title & Change Note' }),
                el('th', { text: 'Actor' }),
                el('th', { text: 'Timestamp' }),
                el('th', { text: 'Actions' })
              ])]),
              tbody
            ])
          ]));
        }

        var prevPage = el('button', { class: 'btn sm', type: 'button', text: '← Prev' });
        prevPage.disabled = state.offset <= 0;
        prevPage.addEventListener('click', function () { state.offset = Math.max(0, state.offset - state.limit); load(); });
        var nextPage = el('button', { class: 'btn sm', type: 'button', text: 'Next →' });
        nextPage.disabled = state.offset + state.limit >= state.total;
        nextPage.addEventListener('click', function () { state.offset += state.limit; load(); });
        pagerBox.appendChild(el('span', { class: 'muted sm', text: 'Showing ' + (state.total ? state.offset + 1 : 0) + '–' + Math.min(state.total, state.offset + rows.length) + ' of ' + state.total }));
        pagerBox.appendChild(el('div', { class: 'cso-ops-actions' }, [prevPage, nextPage]));
      } catch (e) {
        toast(e.message || 'Failed to load revisions', true);
      }
    }

    postSel.addEventListener('change', function () { state.post_id = postSel.value; state.offset = 0; load(); });
    searchBtn.addEventListener('click', function () { state.q = searchInp.value.trim(); state.offset = 0; load(); });
    load();
    return wrap;
  }

  function contentBulkOperationsPanel() {
    var canWrite = Boolean(me && (me.role === 'admin' || me.role === 'editor'));
    var isAdmin = Boolean(me && me.role === 'admin');
    var wrap = el('div', { class: 'cso-ops-studio' });
    var kpis = el('div', { class: 'cso-ops-kpis' });
    var receiptBox = el('div');
    var tableBox = el('div');

    var selected = new Set();
    var visibleRows = [];
    var lastOp = null;

    var typeSel = el('select', { class: 'select' }, [
      el('option', { value: 'all', text: 'All Types' }),
      el('option', { value: 'article', text: 'Articles' }),
      el('option', { value: 'news', text: 'News' }),
      el('option', { value: 'current_affairs', text: 'Current Affairs' }),
      el('option', { value: 'announcement', text: 'Announcements' })
    ]);
    var stageSel = el('select', { class: 'select' }, [
      el('option', { value: 'all', text: 'All Stages' }),
      el('option', { value: 'draft', text: 'draft' }),
      el('option', { value: 'published', text: 'published' }),
      el('option', { value: 'archived', text: 'archived' })
    ]);
    var searchInp = el('input', { class: 'input', type: 'search', placeholder: 'Filter posts...' });
    var loadBtn = el('button', { class: 'cso-ops-btn', type: 'button', text: 'Filter' });

    var actionSel = el('select', { class: 'select' }, [
      el('option', { value: 'publish', text: 'publish — Publish Live (SEO Gate Enforced)' }),
      el('option', { value: 'move_to_draft', text: 'move_to_draft — Move to Draft' }),
      el('option', { value: 'archive', text: 'archive — Move to Archive' }),
      el('option', { value: 'assign_category', text: 'assign_category — Assign Category Slug' }),
      el('option', { value: 'add_tag', text: 'add_tag — Add Tag' }),
      el('option', { value: 'feature', text: 'feature — Pin Featured' }),
      el('option', { value: 'unfeature', text: 'unfeature — Unpin Featured' }),
      el('option', { value: 'delete', text: 'delete — Permanent Soft Delete (Admin Only)' })
    ]);
    var paramInp = el('input', { class: 'input', type: 'text', placeholder: 'Category slug / Tag / BULK_DELETE confirmation...' });
    var dryBtn = el('button', { class: 'cso-ops-btn', type: 'button', text: 'Preview Bulk Impact (Dry Run)' });
    var execBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--primary', type: 'button', text: 'Execute Bulk Operation' });
    if (!canWrite) { dryBtn.disabled = true; execBtn.disabled = true; }

    var selAllBtn = el('button', { class: 'btn sm', type: 'button', text: 'Select All Visible' });
    var clrSelBtn = el('button', { class: 'btn sm', type: 'button', text: 'Clear Selection' });

    wrap.appendChild(el('div', { class: 'cso-ops-hero' }, [
      el('div', {}, [
        el('span', { class: 'badge warn', text: 'BULK ENGINE' }),
        el('h2', { text: 'Bulk Content Operations Studio' }),
        el('p', { class: 'muted', text: 'Execute dry-run validated batch operations (max 100 items) with automatic revision snapshotting and quality gate checks.' })
      ])
    ]));
    wrap.appendChild(kpis);
    wrap.appendChild(el('div', { class: 'cso-ops-card' }, [
      el('h3', { text: 'Batch Action Controls' }),
      el('div', { class: 'cso-ops-grid-2' }, [
        el('div', { class: 'field' }, [el('label', { text: 'Bulk Action' }), actionSel]),
        el('div', { class: 'field' }, [el('label', { text: 'Parameter (Category Slug / Tag / BULK_DELETE)' }), paramInp])
      ]),
      el('div', { class: 'cso-ops-actions' }, [dryBtn, execBtn]),
      receiptBox
    ]));
    wrap.appendChild(el('div', { class: 'cso-ops-card' }, [
      el('div', { class: 'cso-cnt-toolbar' }, [
        el('div', { class: 'cso-cnt-toolbar-left' }, [typeSel, stageSel, searchInp, loadBtn]),
        el('div', { class: 'cso-ops-actions' }, [selAllBtn, clrSelBtn])
      ]),
      tableBox
    ]));

    function renderKpis() {
      clear(kpis);
      [
        ['Selected Items', String(selected.size)],
        ['Max Batch Cap', '100'],
        ['Quality Gate Guard', 'ACTIVE'],
        ['Last Bulk Operation', lastOp ? (lastOp.action + ' (' + lastOp.succeeded_count + ')') : 'None yet']
      ].forEach(function (pair) {
        kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
          el('span', { class: 'muted sm', text: pair[0] }),
          el('strong', { text: pair[1] })
        ]));
      });
    }

    function renderRows() {
      clear(tableBox);
      if (!visibleRows.length) {
        tableBox.appendChild(el('div', { class: 'muted sm', text: 'No posts match the current filter.' }));
        return;
      }
      var tbody = el('tbody');
      visibleRows.forEach(function (it) {
        var cb = el('input', { type: 'checkbox' });
        cb.checked = selected.has(it.id);
        cb.addEventListener('change', function () {
          if (cb.checked) selected.add(it.id);
          else selected.delete(it.id);
          renderKpis();
        });
        tbody.appendChild(el('tr', {}, [
          el('td', {}, [cb]),
          el('td', {}, [el('strong', { text: it.title }), el('div', { class: 'muted sm', text: it.post_type + ' · ' + (it.has_seo_meta ? 'SEO ✓' : 'No SEO') })]),
          el('td', { text: it.category_slug || it.category || '—' }),
          el('td', {}, [el('span', { class: 'badge ' + (it.status === 'published' ? 'ok' : 'warn'), text: it.workflow_stage || it.status })])
        ]));
      });
      tableBox.appendChild(el('div', { class: 'cso-ops-table-wrap' }, [
        el('table', { class: 'table' }, [
          el('thead', {}, [el('tr', {}, [
            el('th', { text: 'Pick' }),
            el('th', { text: 'Title & SEO' }),
            el('th', { text: 'Category' }),
            el('th', { text: 'Stage' })
          ])]),
          tbody
        ])
      ]));
    }

    async function load() {
      try {
        var qs = 'type=' + encodeURIComponent(typeSel.value) +
          '&status=' + encodeURIComponent(stageSel.value) +
          '&q=' + encodeURIComponent(searchInp.value.trim()) +
          '&limit=50&offset=0';
        var results = await Promise.all([api('GET', 'content/posts?' + qs), api('GET', 'content/bulk')]);
        visibleRows = results[0].items || [];
        lastOp = results[1].last_operation || null;
        renderKpis();
        renderRows();
      } catch (e) {
        toast(e.message || 'Failed to load bulk studio', true);
      }
    }

    selAllBtn.addEventListener('click', function () {
      visibleRows.forEach(function (r) { selected.add(r.id); });
      renderKpis();
      renderRows();
    });
    clrSelBtn.addEventListener('click', function () {
      selected.clear();
      renderKpis();
      renderRows();
    });

    var bulkBusy = false;
    async function runBulk(isDry) {
      if (!canWrite || bulkBusy) return;
      if (!selected.size) { toast('Select at least one post', true); return; }
      if (!isDry && actionSel.value === 'delete' && !isAdmin) { toast('Admin role required for bulk delete', true); return; }
      bulkBusy = true;
      dryBtn.disabled = true;
      execBtn.disabled = true;
      clear(receiptBox);
      try {
        var res = await api('POST', 'content/bulk', {
          post_ids: Array.from(selected),
          action: actionSel.value,
          dry_run: isDry,
          category_slug: paramInp.value.trim(),
          tag: paramInp.value.trim(),
          confirm: paramInp.value.trim()
        });
        if (isDry) {
          receiptBox.appendChild(el('div', { class: 'cso-sec-sim-result is-allow' }, [
            el('strong', { text: 'Dry-Run: ' + String(res.eligible_count) + ' eligible, ' + String(res.blocked_count) + ' blocked' }),
            el('div', { class: 'muted sm', text: (res.skipped_reasons || []).map(function (s) { return s.id + ': ' + s.reason; }).join(' · ') || 'All selected items pass guards.' })
          ]));
        } else {
          receiptBox.appendChild(el('div', { class: 'cso-sec-sim-result is-allow' }, [
            el('strong', { text: 'Executed ' + res.action + ': ' + String(res.succeeded_count) + ' succeeded, ' + String(res.skipped_count) + ' skipped, ' + String(res.failed_count) + ' failed' })
          ]));
          toast('Bulk operation complete');
          selected.clear();
          await load();
        }
      } catch (e) {
        toast(e.message || 'Bulk operation failed', true);
      } finally {
        bulkBusy = false;
        dryBtn.disabled = !canWrite;
        execBtn.disabled = !canWrite;
      }
    }

    dryBtn.addEventListener('click', function () { runBulk(true); });
    execBtn.addEventListener('click', function () { runBulk(false); });
    loadBtn.addEventListener('click', load);
    typeSel.addEventListener('change', load);
    stageSel.addEventListener('change', load);

    load();
    return wrap;
  }

  async function viewContentStudio(sub) {
    var mode = sub || 'all';
    if (mode === 'articles') {
      setTitle('Articles & Blogs');
      main.appendChild(contentPublishingStudioPanel('articles'));
      return;
    }
    if (mode === 'news') {
      setTitle('News & Updates');
      main.appendChild(contentPublishingStudioPanel('news'));
      return;
    }
    if (mode === 'current-affairs') {
      setTitle('Current Affairs');
      main.appendChild(contentPublishingStudioPanel('current-affairs'));
      return;
    }
    if (mode === 'announcements') {
      setTitle('Announcements & Notices');
      main.appendChild(contentAnnouncementsStudioPanel());
      return;
    }
    if (mode === 'featured') {
      setTitle('Featured Content');
      main.appendChild(contentFeaturedStudioPanel());
      return;
    }
    if (mode === 'categories') {
      setTitle('Content Categories');
      main.appendChild(contentCategoriesStudioPanel());
      return;
    }
    if (mode === 'tags') {
      setTitle('Tags');
      main.appendChild(contentTagsStudioPanel());
      return;
    }
    if (mode === 'calendar') {
      setTitle('Editorial Calendar');
      main.appendChild(contentEditorialCalendarPanel());
      return;
    }
    if (mode === 'workflow') {
      setTitle('Publishing Workflow');
      main.appendChild(contentPublishingWorkflowPanel());
      return;
    }
    if (mode === 'scheduled') {
      setTitle('Scheduled Content');
      main.appendChild(contentScheduledStudioPanel());
      return;
    }
    if (mode === 'archive') {
      setTitle('Content Archive');
      main.appendChild(contentArchiveStudioPanel());
      return;
    }
    if (mode === 'revisions') {
      setTitle('Content Revisions');
      main.appendChild(contentRevisionsStudioPanel());
      return;
    }
    if (mode === 'bulk') {
      setTitle('Bulk Content Operations');
      main.appendChild(contentBulkOperationsPanel());
      return;
    }
    setTitle('All Content');
    main.appendChild(contentPublishingStudioPanel('all'));
  }

  function studyLibraryStudioPanel(domainSlug) {
    var canWrite = Boolean(me && (me.role === 'admin' || me.role === 'editor'));
    var canStatus = Boolean(me && (me.role === 'admin' || me.role === 'editor' || me.role === 'reviewer'));

    var DOMAIN_CFG = {
      'early-childhood': {
        badge: 'STUDY LIBRARY · MODULE 1',
        title: 'Early Childhood & Primary Education',
        sub: 'Multi-level Odisha academic directory for NIPUN Odisha FLN, Class 1–5 OSEPA textbooks, Odia Varnamala cards, and primary worksheets.',
        defaultBoard: 'OSEPA / NIPUN Odisha'
      },
      'school-higher-sec': {
        badge: 'STUDY LIBRARY · MODULE 2',
        title: 'School & Higher Secondary Education',
        sub: 'Structured BSE Odisha Class 9–10 HSC and CHSE Odisha +2 Science, Arts & Commerce notes, textbooks, and PYQ archives.',
        defaultBoard: 'BSE / CHSE Odisha'
      },
      'ug-pg-research': {
        badge: 'STUDY LIBRARY · MODULE 3',
        title: 'Undergraduate, Postgraduate & Research',
        sub: 'NEP 2020 FYUGP syllabus, MA/MSc/MCom university notes, and PhD research methodology synopses across Odisha universities.',
        defaultBoard: 'Odisha Universities / NEP 2020'
      },
      'competitive-teacher': {
        badge: 'STUDY LIBRARY · MODULE 4',
        title: 'Competitive Exams & Teacher Education',
        sub: 'Recursive exam vault for OPSC OAS, OSSSC RI/ARI/Amin, OSSC CGL, OTET/OSSTET/CTET/B.Ed., and UGC NET digests.',
        defaultBoard: 'OPSC / OSSSC / OSSC / UGC NET',
        subjPlaceholder: 'Subject (e.g. Odisha Polity, GS Paper 1)',
        quickTags: ['OPSC OAS', 'OSSSC', 'OSSC CGL', 'OTET', 'UGC NET']
      },
      'vocational-digital': {
        badge: 'STUDY LIBRARY · MODULE 5',
        title: 'Professional, Vocational & Digital Skills',
        sub: 'Skill Odisha, OS-CIT digital literacy, AI & prompt engineering, ITI/polytechnic trades, and MSME entrepreneurship resources.',
        defaultBoard: 'OS-CIT / Skill Odisha / MSME',
        subjPlaceholder: 'Trade / Skill (e.g. LibreOffice, Cyber Hygiene, ITI)',
        quickTags: ['OS-CIT', 'Skill Odisha', 'AI Literacy', 'ITI', 'Startup Odisha']
      },
      'subjects-materials': {
        badge: 'STUDY LIBRARY · MODULE 6',
        title: 'Subjects, Languages & Study Materials',
        sub: 'Cross-grade repository for Odia Sahitya & Byakarana, English literature, Odisha History & Geography, and STEM quantitative notes.',
        defaultBoard: 'Odia / English / STEM',
        subjPlaceholder: 'Subject (e.g. Odia Sahitya, Odisha History, Quant)',
        quickTags: ['Odia Sahitya', 'English', 'Odisha History', 'Polity', 'STEM']
      },
      'international-inclusive': {
        badge: 'STUDY LIBRARY · MODULE 7',
        title: 'International & Inclusive Education',
        sub: 'RPwD & NEP inclusive CWSN pedagogy, IELTS/TOEFL/GRE global fellowships, and Odisha Tribal Multilingual Education (MLE) bridge kits.',
        defaultBoard: 'Inclusive / MLE / Global',
        subjPlaceholder: 'Focus (e.g. CWSN Pedagogy, IELTS, MLE Odisha)',
        quickTags: ['Inclusive', 'CWSN', 'MLE Odisha', 'IELTS', 'Fellowships']
      },
      'life-skills-culture': {
        badge: 'STUDY LIBRARY · MODULE 8',
        title: 'Life Skills, Culture & Lifelong Learning',
        sub: 'Odisha heritage, Jagannath culture, Sambalpuri handloom, personal finance, fact-checking, and exam wellness toolkits.',
        defaultBoard: 'Odisha Culture / Life Skills',
        subjPlaceholder: 'Theme (e.g. Jagannath Culture, Financial Literacy, Mindfulness)',
        quickTags: ['Odisha Heritage', 'Sambalpuri', 'Financial Literacy', 'Fact-Check', 'Wellness']
      },
      'libraries-support': {
        badge: 'STUDY LIBRARY · MODULE 9',
        title: 'Libraries, Educators & Learning Support',
        sub: 'Odisha district & central library guides, NDLI/e-Pathshala portals, NEP pedagogy rubrics, and scholarship/hostel directories.',
        defaultBoard: 'Odisha Libraries / NEP Educators',
        subjPlaceholder: 'Resource (e.g. Central Library, NDLI, TLM Rubric)',
        quickTags: ['Odisha Libraries', 'NDLI', 'NEP Rubrics', 'TLM', 'Mentorship']
      },
      'odisha-study-hub': {
        badge: 'STUDY LIBRARY · MODULE 10',
        title: 'Odisha Study Hub & Resource Organisation',
        sub: '30-district Odisha study hub directory, Odisha Yearbook & Economic Survey compendiums, master exam calendars, and curation standards.',
        defaultBoard: '30 Districts / Master Index',
        subjPlaceholder: 'Hub / Index (e.g. Khordha, Sambalpur, Economic Survey)',
        quickTags: ['30 Districts', 'Odisha Yearbook', 'Economic Survey', 'Exam Calendar', 'Curation']
      }
    };
    var DOMAIN_PUBLIC_SLUG = {
      'early-childhood': 'early-childhood-primary-education',
      'school-higher-sec': 'school-higher-secondary-education',
      'ug-pg-research': 'undergraduate-postgraduate-research',
      'competitive-teacher': 'competitive-exams-teacher-education',
      'vocational-digital': 'professional-vocational-digital-skills',
      'subjects-materials': 'subjects-languages-study-materials',
      'international-inclusive': 'international-inclusive-education',
      'life-skills-culture': 'life-skills-culture-lifelong-learning',
      'libraries-support': 'libraries-educators-learning-support',
      'odisha-study-hub': 'odisha-study-hub-resource-organisation'
    };
    var cfg = DOMAIN_CFG[domainSlug] || DOMAIN_CFG['early-childhood'];
    var activeDomain = DOMAIN_CFG[domainSlug] ? domainSlug : 'early-childhood';
    var domainPublicUrl = 'https://csodisha.com/study-library/' + (DOMAIN_PUBLIC_SLUG[activeDomain] || activeDomain) + '/';

    var wrap = el('div', { class: 'cso-ops-studio' });
    var kpis = el('div', { class: 'cso-ops-kpis' });
    var telemetryBox = el('div', { class: 'cso-cnt-telemetry-bar' });
    var composerBox = el('div');
    composerBox.hidden = true;
    var folderDrawerBox = el('div');
    folderDrawerBox.hidden = true;
    var healthTabsBox = el('div', { class: 'cso-cnt-pills' });
    var breadcrumbBox = el('div', { class: 'cso-sl-breadcrumb' });
    var folderGridBox = el('div', { class: 'cso-sl-folder-grid' });
    var suggestionsBox = el('div');
    suggestionsBox.hidden = true;
    var pillsBox = el('div', { class: 'cso-cnt-pills' });
    var tableBox = el('div');
    var pagerBox = el('div', { class: 'cso-cnt-pager' });

    var state = {
      parentId: '',
      includeDescendants: true,
      healthFilter: 'all',
      resourceType: 'all',
      status: 'all',
      q: '',
      limit: 25,
      offset: 0,
      total: 0,
      tree: null
    };

    var createBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--primary', type: 'button', text: '+ Add Study Resource' });
    if (!canWrite) createBtn.disabled = true;
    var hubOverviewPill = activeDomain === 'odisha-study-hub'
      ? el('span', { class: 'badge ok', text: 'All 10 Domains: 0 resources' })
      : null;
    var heroRight = hubOverviewPill
      ? el('div', { class: 'cso-ops-actions' }, [hubOverviewPill, createBtn])
      : el('div', {}, [createBtn]);

    wrap.appendChild(el('div', { class: 'cso-ops-hero' }, [
      el('div', {}, [
        el('span', { class: 'badge ok', text: cfg.badge }),
        el('h2', { text: cfg.title }),
        el('p', { class: 'muted', text: cfg.sub })
      ]),
      heroRight
    ]));

    var copyDomainUrlBtn = el('button', { type: 'button', class: 'cso-ops-btn cso-ops-btn--sm', text: 'Copy Directory URL' });
    copyDomainUrlBtn.addEventListener('click', function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(domainPublicUrl).then(function () {
          toast('Copied ' + domainPublicUrl);
        }).catch(function () { toast(domainPublicUrl); });
      } else {
        toast(domainPublicUrl);
      }
    });
    var viewDomainLiveLink = el('a', {
      class: 'cso-ops-btn cso-ops-btn--sm cso-ops-btn--primary',
      href: '/study-library/' + (DOMAIN_PUBLIC_SLUG[activeDomain] || activeDomain) + '/',
      target: '_blank',
      rel: 'noopener noreferrer',
      text: 'View Live Directory ↗'
    });
    wrap.appendChild(el('div', { class: 'cso-sl-domain-live-bar' }, [
      el('div', { class: 'cso-sl-domain-url-wrap' }, [
        el('span', { class: 'badge ok', text: 'LIVE PUBLIC DIRECTORY' }),
        el('code', { class: 'cso-sl-domain-url', text: domainPublicUrl })
      ]),
      el('div', { class: 'cso-ops-actions' }, [copyDomainUrlBtn, viewDomainLiveLink])
    ]));

    wrap.appendChild(kpis);
    wrap.appendChild(telemetryBox);
    wrap.appendChild(composerBox);

    // Multi-Level Sub-Directory Explorer Card
    var newFolderInp = el('input', { class: 'input', type: 'text', placeholder: 'New sub-directory name inside current folder...' });
    var newFolderBtn = el('button', { class: 'cso-ops-btn', type: 'button', text: '+ New Sub-Directory' });
    if (!canWrite) { newFolderInp.disabled = true; newFolderBtn.disabled = true; }

    var descToggleCb = el('input', { type: 'checkbox' });
    descToggleCb.checked = state.includeDescendants;
    descToggleCb.addEventListener('change', function () {
      state.includeDescendants = descToggleCb.checked;
      state.offset = 0;
      loadItems();
    });

    newFolderBtn.addEventListener('click', async function () {
      var name = newFolderInp.value.trim();
      if (!name || !canWrite) return;
      newFolderBtn.disabled = true;
      try {
        await api('POST', 'study-library/folders', {
          domain_slug: activeDomain,
          parent_id: state.parentId || null,
          name: name
        });
        newFolderInp.value = '';
        toast('Sub-directory "' + name + '" created');
        await loadAll();
      } catch (err) {
        toast(err.message || 'Failed to create sub-directory', true);
      } finally {
        newFolderBtn.disabled = !canWrite;
      }
    });

    var explorerCard = el('div', { class: 'cso-ops-card' }, [
      el('div', { class: 'cso-ops-subhead' }, [
        el('h3', { text: 'Multi-Level Sub-Directory Explorer & Page Control' }),
        el('label', { class: 'cso-sl-scope-toggle' }, [
          descToggleCb,
          document.createTextNode('Include All Sub-Directories')
        ])
      ]),
      healthTabsBox,
      breadcrumbBox,
      folderDrawerBox,
      folderGridBox,
      suggestionsBox,
      el('div', { class: 'cso-sl-folder-new' }, [newFolderInp, newFolderBtn])
    ]);
    wrap.appendChild(explorerCard);

    function openFolderDrawer(f) {
      clear(folderDrawerBox);
      folderDrawerBox.hidden = false;
      var nameEnInp = el('input', { class: 'input', type: 'text', value: f.name || '' });
      var titleOrInp = el('input', { class: 'input', type: 'text', value: f.title_or || '', placeholder: 'Odia title (ଓଡ଼ିଆ ଶୀର୍ଷକ)...' });
      var slugInp = el('input', { class: 'input', type: 'text', value: f.slug || '' });
      var badgeInp = el('input', { class: 'input', type: 'text', value: f.featured_badge || '', placeholder: 'e.g. Updated 2026 Syllabus' });
      var introEnInp = el('textarea', { class: 'textarea', rows: '3', placeholder: 'Directory intro in English...' });
      introEnInp.value = f.description_en || f.description || '';
      var introOrInp = el('textarea', { class: 'textarea', rows: '2', placeholder: 'Directory intro in Odia...' });
      introOrInp.value = f.description_or || '';
      var seoTitleInp = el('input', { class: 'input', type: 'text', value: f.seo_title || '', placeholder: 'Custom SEO Meta Title...' });
      var seoDescInp = el('textarea', { class: 'textarea', rows: '2', placeholder: 'Custom SEO Meta Description...' });
      seoDescInp.value = f.seo_description || '';
      var sortInp = el('input', { class: 'input', type: 'number', value: String(f.sort_order || 0) });
      var visSel = el('select', { class: 'select' }, [
        el('option', { value: '1', text: 'Published (Live on Web & Sitemap)' }),
        el('option', { value: '0', text: 'Hidden (404 on Public Web)' })
      ]);
      visSel.value = Number(f.is_active ?? 1) === 1 ? '1' : '0';

      var previewMode = 'hero';
      var previewBody = el('div', { class: 'cso-sl-preview-surface' });
      var previewTabs = el('div', { class: 'cso-cnt-pills' });
      [
        ['hero', 'Public Directory Hero'],
        ['serp', 'Google Search SERP'],
        ['wa', 'WhatsApp Share Card']
      ].forEach(function (pair) {
        var tb = el('button', { type: 'button', class: 'cso-cnt-pill' + (pair[0] === 'hero' ? ' is-active' : ''), text: pair[1] });
        tb.addEventListener('click', function () {
          previewMode = pair[0];
          previewTabs.querySelectorAll('.cso-cnt-pill').forEach(function (b) { b.classList.remove('is-active'); });
          tb.classList.add('is-active');
          renderDrawerPreview();
        });
        previewTabs.appendChild(tb);
      });

      function renderDrawerPreview() {
        clear(previewBody);
        var tEn = nameEnInp.value.trim() || f.name || 'Directory Title';
        var tOr = titleOrInp.value.trim();
        var badge = badgeInp.value.trim();
        var iEn = introEnInp.value.trim() || 'Explore verified syllabus notes, solved PYQs, and reference materials.';
        var sTitle = seoTitleInp.value.trim() || (tEn + ' — CSOdisha Study Library');
        var sDesc = seoDescInp.value.trim() || iEn;
        var pUrl = 'https://csodisha.com' + (f.public_url || ('/study-library/' + (DOMAIN_PUBLIC_SLUG[activeDomain] || activeDomain) + '/'));

        if (previewMode === 'hero') {
          previewBody.appendChild(el('div', { class: 'cso-sl-prev-hero' }, [
            badge ? el('span', { class: 'badge ok', text: badge }) : el('span', { class: 'badge ok', text: cfg.title }),
            el('h4', { text: tEn }),
            tOr ? el('div', { class: 'cso-sl-prev-or', text: tOr }) : el('span', {}),
            el('p', { text: iEn })
          ]));
        } else if (previewMode === 'serp') {
          previewBody.appendChild(el('div', { class: 'cso-sl-prev-serp' }, [
            el('div', { class: 'cso-sl-prev-serp-url', text: pUrl }),
            el('div', { class: 'cso-sl-prev-serp-title', text: sTitle }),
            el('div', { class: 'cso-sl-prev-serp-desc', text: sDesc })
          ]));
        } else {
          previewBody.appendChild(el('div', { class: 'cso-sl-prev-wa' }, [
            el('strong', { text: sTitle }),
            el('p', { text: sDesc }),
            el('span', { class: 'muted sm', text: pUrl })
          ]));
        }
      }
      [nameEnInp, titleOrInp, badgeInp, introEnInp, seoTitleInp, seoDescInp].forEach(function (inp) {
        inp.addEventListener('input', renderDrawerPreview);
      });
      renderDrawerPreview();

      async function saveFolderForm(isActiveOverride, markVerified) {
        var payload = {
          name_en: nameEnInp.value.trim(),
          title_or: titleOrInp.value.trim(),
          slug: slugInp.value.trim(),
          featured_badge: badgeInp.value.trim(),
          description_en: introEnInp.value.trim(),
          description_or: introOrInp.value.trim(),
          seo_title: seoTitleInp.value.trim(),
          seo_description: seoDescInp.value.trim(),
          sort_order: Number(sortInp.value || 0),
          is_active: isActiveOverride !== undefined ? isActiveOverride : (visSel.value === '1')
        };
        if (markVerified) payload.verified_at = new Date().toISOString();
        try {
          await api('PUT', 'study-library/folders/' + encodeURIComponent(f.id), payload);
          toast(markVerified ? 'Directory verified & saved' : 'Directory page settings saved');
          folderDrawerBox.hidden = true;
          await loadAll();
        } catch (err) {
          toast(err.message || 'Failed to save directory settings', true);
        }
      }

      var closeBtn = el('button', { type: 'button', class: 'cso-ops-btn cso-ops-btn--sm', text: 'Close' });
      closeBtn.addEventListener('click', function () { folderDrawerBox.hidden = true; });
      var verifyBtn = el('button', { type: 'button', class: 'cso-ops-btn cso-ops-btn--sm', text: 'Mark Verified Today' });
      verifyBtn.addEventListener('click', function () { saveFolderForm(undefined, true); });
      var draftBtn = el('button', { type: 'button', class: 'cso-ops-btn cso-ops-btn--sm', text: 'Save Draft (Hide)' });
      draftBtn.addEventListener('click', function () { saveFolderForm(false, false); });
      var pubBtn = el('button', { type: 'button', class: 'cso-ops-btn cso-ops-btn--sm cso-ops-btn--primary', text: 'Publish Live' });
      pubBtn.addEventListener('click', function () { saveFolderForm(true, false); });

      folderDrawerBox.appendChild(el('div', { class: 'cso-sl-drawer' }, [
        el('div', { class: 'cso-ops-subhead' }, [
          el('h4', { text: 'Directory Page Info & Live Preview: ' + f.name }),
          closeBtn
        ]),
        el('div', { class: 'cso-sl-drawer-grid' }, [
          el('div', { class: 'cso-sl-drawer-form' }, [
            el('label', { class: 'cso-cnt-field' }, [el('span', { text: 'English Title' }), nameEnInp]),
            el('label', { class: 'cso-cnt-field' }, [el('span', { text: 'Odia Title (ଓଡ଼ିଆ)' }), titleOrInp]),
            el('label', { class: 'cso-cnt-field' }, [el('span', { text: 'URL Slug' }), slugInp]),
            el('label', { class: 'cso-cnt-field' }, [el('span', { text: 'Featured Badge' }), badgeInp]),
            el('label', { class: 'cso-cnt-field' }, [el('span', { text: 'Directory Intro (EN)' }), introEnInp]),
            el('label', { class: 'cso-cnt-field' }, [el('span', { text: 'Directory Intro (OR)' }), introOrInp]),
            el('label', { class: 'cso-cnt-field' }, [el('span', { text: 'SEO Meta Title' }), seoTitleInp]),
            el('label', { class: 'cso-cnt-field' }, [el('span', { text: 'SEO Meta Description' }), seoDescInp]),
            el('div', { class: 'cso-sl-drawer-row' }, [
              el('label', { class: 'cso-cnt-field' }, [el('span', { text: 'Sort Order' }), sortInp]),
              el('label', { class: 'cso-cnt-field' }, [el('span', { text: 'Visibility' }), visSel])
            ]),
            el('div', { class: 'cso-ops-actions' }, [verifyBtn, draftBtn, pubBtn])
          ]),
          el('div', { class: 'cso-sl-drawer-preview' }, [
            previewTabs,
            previewBody
          ])
        ])
      ]));
    }

    async function loadSuggestions() {
      clear(suggestionsBox);
      try {
        var sugRes = await api('GET', 'study-library/suggestions?domain=' + encodeURIComponent(activeDomain) + '&status=pending');
        var list = Array.isArray(sugRes.suggestions) ? sugRes.suggestions : [];
        if (!list.length) {
          suggestionsBox.appendChild(el('div', { class: 'muted sm', text: 'No pending citizen suggestions or outdated-link reports for this domain.' }));
          return;
        }
        list.forEach(function (s) {
          var appBtn = el('button', { type: 'button', class: 'cso-ops-btn cso-ops-btn--sm cso-ops-btn--primary', text: 'Approve' });
          var disBtn = el('button', { type: 'button', class: 'cso-ops-btn cso-ops-btn--sm', text: 'Dismiss' });
          appBtn.addEventListener('click', async function () {
            await api('PATCH', 'study-library/suggestions/' + encodeURIComponent(s.id), { status: 'approved' });
            toast('Suggestion approved');
            await loadAll();
          });
          disBtn.addEventListener('click', async function () {
            await api('PATCH', 'study-library/suggestions/' + encodeURIComponent(s.id), { status: 'dismissed' });
            toast('Suggestion dismissed');
            await loadAll();
          });
          suggestionsBox.appendChild(el('div', { class: 'cso-sl-folder-card' }, [
            el('div', { class: 'cso-sl-folder-head' }, [
              el('strong', { text: '[' + String(s.suggestion_type || 'topic').toUpperCase() + '] ' + s.title }),
              el('div', { class: 'muted sm', text: s.details || s.source_url || 'No extra details' })
            ]),
            el('div', { class: 'cso-ops-actions' }, [appBtn, disBtn])
          ]));
        });
      } catch (err) {
        suggestionsBox.appendChild(el('div', { class: 'muted sm', text: err.message || 'Could not load suggestions.' }));
      }
    }

    function renderTree(treeRes) {
      state.tree = treeRes;
      clear(healthTabsBox);
      clear(breadcrumbBox);
      clear(folderGridBox);

      var allFlat = Array.isArray(treeRes.folders) ? treeRes.folders : [];
      var emptyCount = allFlat.filter(function (f) { return Number(f.total_item_count || 0) === 0; }).length;
      var staleCutoff = Date.now() - (180 * 86400 * 1000);
      var staleCount = allFlat.filter(function (f) {
        var dt = Date.parse(f.verified_at || f.updated_at || '');
        return !dt || dt < staleCutoff;
      }).length;
      var sugCount = Number((treeRes.metrics && treeRes.metrics.pending_suggestions) || 0);

      [
        ['all', 'All Directories (' + allFlat.length + ')'],
        ['empty', 'Empty Directories (0 Items: ' + emptyCount + ')'],
        ['stale', 'Stale > 180 Days (' + staleCount + ')'],
        ['suggestions', 'Citizen Suggestions (Pending: ' + sugCount + ')']
      ].forEach(function (pair) {
        var btn = el('button', {
          type: 'button',
          class: 'cso-cnt-pill' + (state.healthFilter === pair[0] ? ' is-active' : ''),
          text: pair[1]
        });
        btn.addEventListener('click', function () {
          state.healthFilter = pair[0];
          renderTree(treeRes);
        });
        healthTabsBox.appendChild(btn);
      });

      if (state.healthFilter === 'suggestions') {
        folderGridBox.hidden = true;
        suggestionsBox.hidden = false;
        loadSuggestions();
        return;
      }
      folderGridBox.hidden = false;
      suggestionsBox.hidden = true;

      var rootBtn = el('button', {
        type: 'button',
        class: 'cso-sl-crumb-btn' + (!state.parentId ? ' is-current' : ''),
        text: cfg.title
      });
      rootBtn.addEventListener('click', function () {
        if (!state.parentId) return;
        state.parentId = '';
        state.offset = 0;
        loadAll();
      });
      breadcrumbBox.appendChild(rootBtn);

      var crumbs = Array.isArray(treeRes.breadcrumb) ? treeRes.breadcrumb : [];
      crumbs.forEach(function (c, idx) {
        breadcrumbBox.appendChild(el('span', { class: 'cso-sl-crumb-sep', text: '/' }));
        var isLast = idx === crumbs.length - 1;
        var cb = el('button', {
          type: 'button',
          class: 'cso-sl-crumb-btn' + (isLast ? ' is-current' : ''),
          text: c.name
        });
        if (!isLast) {
          cb.addEventListener('click', function () {
            state.parentId = c.id;
            state.offset = 0;
            loadAll();
          });
        }
        breadcrumbBox.appendChild(cb);
      });

      var kids = state.healthFilter === 'all'
        ? (Array.isArray(treeRes.children) ? treeRes.children : [])
        : allFlat.filter(function (f) {
            if (state.healthFilter === 'empty') return Number(f.total_item_count || 0) === 0;
            var dt = Date.parse(f.verified_at || f.updated_at || '');
            return !dt || dt < staleCutoff;
          }).slice(0, 60);

      if (!kids.length) {
        folderGridBox.appendChild(el('div', { class: 'muted sm', text: 'No sub-directories match this view. Add one below or switch filter tabs.' }));
        return;
      }

      kids.forEach(function (f) {
        var pubUrl = f.public_url || ('/study-library/' + (DOMAIN_PUBLIC_SLUG[activeDomain] || activeDomain) + '/' + f.slug + '/');
        var isVis = Number(f.is_active ?? 1) === 1;
        var head = el('div', { class: 'cso-sl-folder-head' }, [
          el('div', {}, [
            el('div', { class: 'cso-sl-folder-name', text: '📁 ' + f.name + (f.title_or ? ' · ' + f.title_or : '') }),
            el('div', { class: 'cso-sl-folder-meta', text: 'L' + (f.depth || 1) + ' · ' + (f.child_count || 0) + ' sub-folders · ' + (f.total_item_count || 0) + ' resources · ' + (isVis ? 'Published' : 'Hidden') }),
            el('div', { class: 'muted sm', text: pubUrl })
          ])
        ]);
        head.addEventListener('click', function () {
          state.healthFilter = 'all';
          state.parentId = f.id;
          state.offset = 0;
          loadAll();
        });

        var actRow = el('div', { class: 'cso-ops-actions' });
        var openBtn = el('button', { type: 'button', class: 'cso-ops-btn cso-ops-btn--sm', text: 'Open' });
        openBtn.addEventListener('click', function () {
          state.healthFilter = 'all';
          state.parentId = f.id;
          state.offset = 0;
          loadAll();
        });
        actRow.appendChild(openBtn);

        if (canWrite) {
          var editPageBtn = el('button', { type: 'button', class: 'cso-ops-btn cso-ops-btn--sm cso-ops-btn--primary', text: 'Edit Page Info & Preview' });
          editPageBtn.addEventListener('click', function () { openFolderDrawer(f); });
          actRow.appendChild(editPageBtn);
        }

        var copyBtn = el('button', { type: 'button', class: 'cso-ops-btn cso-ops-btn--sm', text: 'Copy Link' });
        copyBtn.addEventListener('click', function () {
          var full = 'https://csodisha.com' + pubUrl;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(full).then(function () { toast('Copied ' + full); }).catch(function () { toast(full); });
          } else {
            toast(full);
          }
        });
        actRow.appendChild(copyBtn);

        var liveLink = el('a', { class: 'cso-ops-btn cso-ops-btn--sm', href: pubUrl, target: '_blank', rel: 'noopener noreferrer', text: 'View Live ↗' });
        actRow.appendChild(liveLink);

        if (canWrite) {
          var delBtn = el('button', { type: 'button', class: 'cso-ops-btn cso-ops-btn--sm cso-ops-btn--danger', text: 'Delete' });
          delBtn.addEventListener('click', async function () {
            try {
              await api('DELETE', 'study-library/folders/' + encodeURIComponent(f.id));
              toast('Sub-directory deleted');
              await loadAll();
            } catch (err) {
              toast(err.message || 'Cannot delete non-empty folder', true);
            }
          });
          actRow.appendChild(delBtn);
        }

        folderGridBox.appendChild(el('div', { class: 'cso-sl-folder-card' }, [head, actRow]));
      });
    }

    function openComposer(editing) {
      clear(composerBox);
      composerBox.hidden = false;
      var isEdit = Boolean(editing && editing.id);
      var card = el('div', { class: 'cso-cnt-composer' });

      var titleInp = el('input', { class: 'input', type: 'text', value: (editing && editing.title) || '', placeholder: 'Resource Title (e.g. OPSC OAS Prelims GS-1 Odisha History Notes)...' });
      var titleCount = el('span', { class: 'cso-cnt-counter', text: '0/60' });
      var slugInp = el('input', { class: 'input', type: 'text', value: (editing && editing.slug) || '', placeholder: 'auto-generated-from-title' });

      var folderSel = el('select', { class: 'select' }, [
        el('option', { value: '', text: 'Domain Root (' + cfg.title + ')' })
      ]);
      var allFolders = (state.tree && Array.isArray(state.tree.folders)) ? state.tree.folders : [];
      allFolders.forEach(function (f) {
        folderSel.appendChild(el('option', { value: f.id, text: f.full_path || f.name }));
      });
      folderSel.value = (editing && editing.folder_id) || state.parentId || '';

      var typeSel = el('select', { class: 'select' }, [
        el('option', { value: 'notes', text: 'Study Notes' }),
        el('option', { value: 'pyq', text: 'PYQ Archive' }),
        el('option', { value: 'syllabus', text: 'Official Syllabus' }),
        el('option', { value: 'ebook', text: 'eBook / Textbook' }),
        el('option', { value: 'model-paper', text: 'Model Paper' }),
        el('option', { value: 'guide', text: 'Preparation Guide' })
      ]);
      typeSel.value = (editing && editing.resource_type) || 'notes';

      var statusSelComp = el('select', { class: 'select' }, [
        el('option', { value: 'draft', text: 'draft' }),
        el('option', { value: 'in_review', text: 'in_review' }),
        el('option', { value: 'published', text: 'published' }),
        el('option', { value: 'archived', text: 'archived' })
      ]);
      statusSelComp.value = (editing && editing.status) || 'draft';

      var langSel = el('select', { class: 'select' }, [
        el('option', { value: 'EN', text: 'EN (English)' }),
        el('option', { value: 'OR', text: 'OR (Odia)' }),
        el('option', { value: 'EN+OR', text: 'EN+OR (Bilingual)' })
      ]);
      langSel.value = (editing && editing.language_parity) || 'EN';

      var boardInp = el('input', { class: 'input', type: 'text', value: (editing && editing.board_or_exam) || cfg.defaultBoard, placeholder: 'Board / Exam (e.g. ' + cfg.defaultBoard + ')' });
      var subjInp = el('input', { class: 'input', type: 'text', value: (editing && editing.subject_tag) || '', placeholder: cfg.subjPlaceholder || 'Subject (e.g. Odisha Polity, Mathematics)' });
      var featCb = el('input', { type: 'checkbox' });
      featCb.checked = Boolean(editing && editing.is_featured);

      // Interactive Tag Chips + Domain Quick-Tags
      var tagsState = (editing && Array.isArray(editing.tags)) ? editing.tags.slice() : [];
      var tagChipsWrap = el('div', { class: 'cso-cnt-tag-chips' });
      var tagInput = el('input', { class: 'cso-cnt-tag-input', type: 'text', placeholder: 'Type tag & press Enter or ,' });
      var tagQuickWrap = el('div', { class: 'cso-cnt-tag-suggestions' });
      function addStudyTag(raw) {
        var val = String(raw || '').trim().replace(/^#+/, '').slice(0, 40);
        if (val && !tagsState.includes(val) && tagsState.length < 12) {
          tagsState.push(val);
          renderTagChips();
        }
      }
      function renderTagChips() {
        clear(tagChipsWrap);
        tagsState.forEach(function (t, idx) {
          var rm = el('button', { type: 'button', class: 'cso-cnt-tag-chip-rm', text: '×' });
          rm.addEventListener('click', function () { tagsState.splice(idx, 1); renderTagChips(); });
          tagChipsWrap.appendChild(el('span', { class: 'cso-cnt-tag-chip' }, [document.createTextNode(t), rm]));
        });
        tagChipsWrap.appendChild(tagInput);
      }
      tagInput.addEventListener('keydown', function (ev) {
        if (ev.key === 'Enter' || ev.key === ',') {
          ev.preventDefault();
          addStudyTag(tagInput.value);
          tagInput.value = '';
        } else if (ev.key === 'Backspace' && !tagInput.value && tagsState.length) {
          tagsState.pop();
          renderTagChips();
        }
      });
      renderTagChips();
      if (Array.isArray(cfg.quickTags) && cfg.quickTags.length) {
        tagQuickWrap.appendChild(el('span', { class: 'muted sm', text: 'Quick tags:' }));
        cfg.quickTags.forEach(function (qt) {
          var qb = el('button', { type: 'button', class: 'cso-cnt-tag-suggest', text: '+ ' + qt });
          qb.addEventListener('click', function () { addStudyTag(qt); });
          tagQuickWrap.appendChild(qb);
        });
      }

      // R2 PDF Uploader (up to 15 MB)
      var pdfUrlInp = el('input', { class: 'input', type: 'url', value: (editing && editing.pdf_url) || '', placeholder: '/media/content/... or https://...' });
      var pdfSizeBytes = Number((editing && editing.pdf_size_bytes) || 0);
      var pdfFileInp = el('input', { class: 'cso-cnt-file-hidden', type: 'file', accept: 'application/pdf' });
      var pdfPickBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--sm', type: 'button', text: 'Upload PDF (R2)' });
      var pdfBadge = el('span', { class: 'badge', text: pdfUrlInp.value.trim() ? 'PDF Attached' : 'No PDF' });
      pdfPickBtn.addEventListener('click', function () { pdfFileInp.click(); });
      pdfFileInp.addEventListener('change', async function () {
        var f = pdfFileInp.files && pdfFileInp.files[0];
        if (!f) return;
        pdfPickBtn.disabled = true;
        pdfBadge.className = 'badge warn';
        pdfBadge.textContent = 'Uploading PDF...';
        try {
          var fd = new FormData();
          fd.append('file', f);
          fd.append('kind', 'pdf');
          var up = await api('POST', 'content/upload', fd, true);
          pdfUrlInp.value = up.url || '';
          pdfSizeBytes = Number(up.size_bytes || f.size || 0);
          pdfBadge.className = 'badge ok';
          pdfBadge.textContent = 'PDF (' + Math.max(1, Math.round(pdfSizeBytes / 1024)) + ' KB)';
          toast('PDF uploaded to R2');
          refreshPreview();
        } catch (err) {
          pdfBadge.className = 'badge bad';
          pdfBadge.textContent = 'Upload Failed';
          toast(err.message || 'PDF upload failed', true);
        } finally {
          pdfPickBtn.disabled = false;
          pdfFileInp.value = '';
        }
      });

      // R2 Cover Image Uploader (up to 5 MB)
      var coverUrlInp = el('input', { class: 'input', type: 'url', value: (editing && editing.cover_image_url) || '', placeholder: '/media/content/... or https://...' });
      var coverFileInp = el('input', { class: 'cso-cnt-file-hidden', type: 'file', accept: 'image/jpeg,image/png,image/webp,image/avif' });
      var coverPickBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--sm', type: 'button', text: 'Upload Cover Image' });
      var coverBadge = el('span', { class: 'badge', text: coverUrlInp.value.trim() ? 'Cover Ready' : 'No Cover' });
      coverPickBtn.addEventListener('click', function () { coverFileInp.click(); });
      coverFileInp.addEventListener('change', async function () {
        var f = coverFileInp.files && coverFileInp.files[0];
        if (!f) return;
        coverPickBtn.disabled = true;
        coverBadge.className = 'badge warn';
        coverBadge.textContent = 'Uploading...';
        try {
          var fd = new FormData();
          fd.append('file', f);
          fd.append('kind', 'image');
          var up = await api('POST', 'content/upload', fd, true);
          coverUrlInp.value = up.url || '';
          coverBadge.className = 'badge ok';
          coverBadge.textContent = 'Uploaded';
          toast('Cover image uploaded to R2');
          refreshPreview();
        } catch (err) {
          coverBadge.className = 'badge bad';
          coverBadge.textContent = 'Failed';
          toast(err.message || 'Image upload failed', true);
        } finally {
          coverPickBtn.disabled = false;
          coverFileInp.value = '';
        }
      });

      // Reference Links Builder
      var linksState = (editing && Array.isArray(editing.links)) ? editing.links.slice() : [];
      var linkLabelInp = el('input', { class: 'input', type: 'text', placeholder: 'Reference Label (e.g. Official Syllabus Link)' });
      var linkUrlInp = el('input', { class: 'input', type: 'url', placeholder: 'https://...' });
      var addLinkBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--sm', type: 'button', text: '+ Add Reference Link' });
      var linksBox = el('div', { class: 'cso-cnt-list-items' });
      function renderLinks() {
        clear(linksBox);
        linksState.forEach(function (lnk, idx) {
          var rm = el('button', { type: 'button', class: 'cso-ops-btn cso-ops-btn--sm cso-ops-btn--danger', text: 'Remove' });
          rm.addEventListener('click', function () { linksState.splice(idx, 1); renderLinks(); refreshPreview(); });
          linksBox.appendChild(el('div', { class: 'cso-cnt-list-row' }, [
            el('div', { class: 'cso-cnt-list-meta' }, [el('strong', { text: lnk.label }), el('span', { text: lnk.url })]),
            rm
          ]));
        });
      }
      renderLinks();
      addLinkBtn.addEventListener('click', function () {
        var u = linkUrlInp.value.trim();
        if (!u || !/^(\/|https?:\/\/)/i.test(u)) { toast('Enter a valid https:// or /... URL', true); return; }
        linksState.push({ label: linkLabelInp.value.trim() || 'Reference Link', url: u });
        linkLabelInp.value = '';
        linkUrlInp.value = '';
        renderLinks();
        refreshPreview();
      });

      var summaryTa = el('textarea', { class: 'textarea', rows: '2', placeholder: 'Key syllabus topics or resource overview...' });
      summaryTa.value = (editing && editing.summary) || '';
      var bodyTa = el('textarea', { class: 'textarea', rows: '5', placeholder: 'Detailed study notes, unit breakdown, or instructions...' });
      bodyTa.value = (editing && editing.body_html) || '';
      var seoTitleInp = el('input', { class: 'input', type: 'text', value: (editing && editing.seo_title) || '', placeholder: 'SEO Title (40-65 chars)' });
      var seoDescInp = el('textarea', { class: 'textarea', rows: '2', placeholder: 'SEO Meta Description (110-160 chars)' });
      seoDescInp.value = (editing && editing.seo_description) || '';

      var piiWarnBox = el('div', { class: 'cso-cnt-pii-warn' });
      piiWarnBox.hidden = true;

      var previewState = { channel: 'reader', device: 'desktop' };
      var previewFrame = el('div', { class: 'cso-cnt-preview-frame' });
      var chTabs = [['reader', 'csodisha.com Reader'], ['serp', 'Google SERP'], ['social', 'WhatsApp Study Card']];
      var chBtns = chTabs.map(function (ct) {
        var b = el('button', { type: 'button', class: 'cso-cnt-pill' + (previewState.channel === ct[0] ? ' is-active' : ''), text: ct[1] });
        b.addEventListener('click', function () {
          previewState.channel = ct[0];
          chBtns.forEach(function (btn, i) { btn.classList.toggle('is-active', chTabs[i][0] === previewState.channel); });
          refreshPreview();
        });
        return b;
      });
      var deskBtn = el('button', { type: 'button', class: 'cso-ops-btn cso-ops-btn--sm', text: 'Desktop' });
      var mobBtn = el('button', { type: 'button', class: 'cso-ops-btn cso-ops-btn--sm', text: 'Mobile' });
      deskBtn.addEventListener('click', function () { previewFrame.classList.remove('is-mobile'); });
      mobBtn.addEventListener('click', function () { previewFrame.classList.add('is-mobile'); });

      function refreshPreview() {
        var rawTitle = titleInp.value.trim();
        titleCount.textContent = String(rawTitle.length) + '/60';
        titleCount.classList.toggle('is-over', rawTitle.length > 60);

        var combinedText = [rawTitle, summaryTa.value, bodyTa.value].join(' ');
        var phoneHit = /\b[6-9]\d{9}\b/.test(combinedText);
        var aadhaarHit = /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/.test(combinedText);
        if (phoneHit || aadhaarHit) {
          piiWarnBox.hidden = false;
          piiWarnBox.textContent = 'DPDP Act 2023 PII Guard: Detected possible unmasked ' +
            [phoneHit ? '10-digit phone number' : '', aadhaarHit ? '12-digit Aadhaar ID' : ''].filter(Boolean).join(' & ') + '. Redact before publishing.';
        } else {
          piiWarnBox.hidden = true;
        }

        var selectedFolderText = folderSel.options[folderSel.selectedIndex] ? folderSel.options[folderSel.selectedIndex].textContent : cfg.title;
        var autoSlug = slugInp.value.trim() || rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'study-resource';
        var fullUrl = 'https://csodisha.com/study-library/' + activeDomain + '/' + autoSlug + '/';

        clear(previewFrame);
        if (previewState.channel === 'reader') {
          var children = [
            el('div', { class: 'cso-cnt-reader-kicker', text: selectedFolderText }),
            el('h4', { class: 'cso-cnt-reader-title', text: rawTitle || 'Study Resource Preview' }),
            el('div', { class: 'cso-cnt-reader-meta', text: [typeSel.value.toUpperCase(), langSel.value, boardInp.value.trim(), subjInp.value.trim()].filter(Boolean).join(' · ') })
          ];
          if (coverUrlInp.value.trim()) {
            children.push(el('img', { class: 'cso-cnt-reader-cover', src: coverUrlInp.value.trim(), alt: rawTitle || 'Study resource cover' }));
          }
          children.push(el('div', { class: 'cso-cnt-reader-body', text: (summaryTa.value.trim() ? summaryTa.value.trim() + '\n\n' : '') + (bodyTa.value.trim() || 'Study notes and unit overview appear here.') }));
          if (pdfUrlInp.value.trim()) {
            children.push(el('div', { class: 'cso-cnt-reader-pdfs' }, [
              el('a', { class: 'cso-cnt-reader-pdf-card', href: pdfUrlInp.value.trim(), target: '_blank', rel: 'noopener' }, [
                el('span', { text: '📄 ' + (rawTitle || 'Downloadable Study PDF') }),
                el('span', { text: 'Download PDF ↗' })
              ])
            ]));
          }
          if (linksState.length) {
            children.push(el('div', { class: 'cso-cnt-reader-links' }, linksState.map(function (l) {
              return el('a', { class: 'cso-cnt-reader-link-btn', href: l.url, target: '_blank', rel: 'noopener', text: l.label + ' ↗' });
            })));
          }
          previewFrame.appendChild(el('div', { class: 'cso-cnt-reader-card' }, children));
        } else if (previewState.channel === 'serp') {
          previewFrame.appendChild(el('div', { class: 'cso-cnt-serp-card' }, [
            el('div', { class: 'cso-cnt-serp-url', text: fullUrl }),
            el('div', { class: 'cso-cnt-serp-title', text: seoTitleInp.value.trim() || rawTitle || 'Study Resource SEO Title' }),
            el('div', { class: 'cso-cnt-serp-desc', text: seoDescInp.value.trim() || summaryTa.value.trim() || 'SEO meta description preview.' })
          ]));
        } else {
          var wa = '📚 *' + (rawTitle || 'CS Odisha Study Material') + '*\n' +
            '📂 ' + selectedFolderText + '\n' +
            (pdfUrlInp.value.trim() ? '📄 PDF Included\n' : '') +
            '🔗 ' + fullUrl;
          var sKids = [el('span', { class: 'muted sm', text: 'Aspirant Study Broadcast' })];
          if (coverUrlInp.value.trim()) sKids.push(el('img', { class: 'cso-cnt-social-cover', src: coverUrlInp.value.trim(), alt: 'Cover' }));
          sKids.push(el('div', { class: 'cso-cnt-social-bubble', text: wa }));
          previewFrame.appendChild(el('div', { class: 'cso-cnt-social-card' }, sKids));
        }
      }

      [titleInp, slugInp, folderSel, typeSel, langSel, boardInp, subjInp, summaryTa, bodyTa, pdfUrlInp, coverUrlInp, seoTitleInp, seoDescInp].forEach(function (inp) {
        inp.addEventListener('input', refreshPreview);
        inp.addEventListener('change', refreshPreview);
      });
      refreshPreview();

      function closeComposer() {
        clear(composerBox);
        composerBox.hidden = true;
        if (window._csoComposerEscHandler) {
          window.removeEventListener('keydown', window._csoComposerEscHandler);
          window._csoComposerEscHandler = null;
        }
      }
      if (window._csoComposerEscHandler) window.removeEventListener('keydown', window._csoComposerEscHandler);
      window._csoComposerEscHandler = function (ev) { if (ev.key === 'Escape') closeComposer(); };
      window.addEventListener('keydown', window._csoComposerEscHandler);

      var saveBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--primary', type: 'button', text: isEdit ? 'Save Revision & Update' : 'Create Study Resource' });
      var cancelBtn = el('button', { class: 'cso-ops-btn', type: 'button', text: 'Cancel (Esc)' });
      cancelBtn.addEventListener('click', closeComposer);

      var busy = false;
      saveBtn.addEventListener('click', async function () {
        if (!canWrite || busy) return;
        busy = true;
        saveBtn.disabled = true;
        try {
          var payload = {
            domain_slug: activeDomain,
            folder_id: folderSel.value || null,
            title: titleInp.value.trim(),
            slug: slugInp.value.trim(),
            resource_type: typeSel.value,
            status: statusSelComp.value,
            language_parity: langSel.value,
            board_or_exam: boardInp.value.trim(),
            subject_tag: subjInp.value.trim(),
            is_featured: featCb.checked,
            tags: tagsState.slice(),
            pdf_url: pdfUrlInp.value.trim(),
            pdf_size_bytes: pdfSizeBytes,
            cover_image_url: coverUrlInp.value.trim(),
            links: linksState.slice(),
            summary: summaryTa.value.trim(),
            body_html: bodyTa.value,
            seo_title: seoTitleInp.value.trim(),
            seo_description: seoDescInp.value.trim()
          };
          if (isEdit) {
            await api('PUT', 'study-library/items/' + encodeURIComponent(editing.id), payload);
            toast('Updated study resource & saved revision');
          } else {
            await api('POST', 'study-library/items', payload);
            toast('Created study resource');
          }
          closeComposer();
          await loadAll();
        } catch (err) {
          toast(err.message || 'Save failed', true);
        } finally {
          busy = false;
          saveBtn.disabled = !canWrite;
        }
      });

      card.appendChild(el('div', { class: 'cso-ops-subhead' }, [
        el('h3', { text: isEdit ? 'Edit Study Resource (' + editing.id + ')' : 'Add Study Resource' })
      ]));
      card.appendChild(piiWarnBox);

      var leftPane = el('div', { class: 'cso-cnt-editor-pane' }, [
        el('div', { class: 'cso-ops-grid-2' }, [
          el('div', { class: 'field' }, [el('label', {}, [document.createTextNode('Title *'), titleCount]), titleInp]),
          el('div', { class: 'field' }, [el('label', { text: 'Slug (optional auto)' }), slugInp]),
          el('div', { class: 'field' }, [el('label', { text: 'Sub-Directory Placement' }), folderSel]),
          el('div', { class: 'field' }, [el('label', { text: 'Resource Type' }), typeSel]),
          el('div', { class: 'field' }, [el('label', { text: 'Status' }), statusSelComp]),
          el('div', { class: 'field' }, [el('label', { text: 'Language Parity' }), langSel]),
          el('div', { class: 'field' }, [el('label', { text: 'Board / Exam' }), boardInp]),
          el('div', { class: 'field' }, [el('label', { text: 'Subject Tag' }), subjInp])
        ]),
        el('div', { class: 'field' }, [el('label', {}, [featCb, document.createTextNode(' Feature in Priority Study Slot')])]),
        el('div', { class: 'field' }, [el('label', { text: 'Interactive Tags' }), el('div', { class: 'cso-cnt-tag-box' }, [tagChipsWrap, tagQuickWrap])]),
        el('div', { class: 'cso-cnt-media-box' }, [
          el('div', { class: 'cso-cnt-media-head' }, [el('strong', { text: 'PDF Study Material (R2, max 15 MB)' }), el('div', { class: 'cso-ops-actions' }, [pdfBadge, pdfPickBtn, pdfFileInp])]),
          pdfUrlInp
        ]),
        el('div', { class: 'cso-cnt-media-box' }, [
          el('div', { class: 'cso-cnt-media-head' }, [el('strong', { text: 'Cover Photo (R2, max 5 MB)' }), el('div', { class: 'cso-ops-actions' }, [coverBadge, coverPickBtn, coverFileInp])]),
          coverUrlInp
        ]),
        el('div', { class: 'cso-cnt-media-box' }, [
          el('div', { class: 'cso-cnt-media-head' }, [el('strong', { text: 'Reference Links' }), addLinkBtn]),
          el('div', { class: 'cso-cnt-media-row' }, [linkLabelInp, linkUrlInp]),
          linksBox
        ]),
        el('div', { class: 'field' }, [el('label', { text: 'Summary' }), summaryTa]),
        el('div', { class: 'field' }, [el('label', { text: 'Study Notes / Body' }), bodyTa]),
        el('div', { class: 'cso-ops-grid-2' }, [
          el('div', { class: 'field' }, [el('label', { text: 'SEO Title' }), seoTitleInp]),
          el('div', { class: 'field' }, [el('label', { text: 'SEO Description' }), seoDescInp])
        ]),
        el('div', { class: 'cso-ops-actions' }, [saveBtn, cancelBtn])
      ]);

      var rightPane = el('div', { class: 'cso-cnt-preview-pane' }, [
        el('div', { class: 'cso-cnt-preview-head' }, [
          el('div', { class: 'cso-cnt-preview-tabs' }, chBtns),
          el('div', { class: 'cso-ops-actions' }, [deskBtn, mobBtn])
        ]),
        previewFrame
      ]);

      card.appendChild(el('div', { class: 'cso-cnt-workbench' }, [leftPane, rightPane]));
      composerBox.appendChild(card);
      titleInp.focus();
    }

    createBtn.addEventListener('click', function () { openComposer(null); });

    function renderKpis(k) {
      if (hubOverviewPill) {
        hubOverviewPill.textContent = 'All 10 Domains: ' + String(k.cross_domain_total_items || 0) + ' resources';
      }
      clear(kpis);
      var pairs = [
        ['Total Resources', String(k.total_items || 0)],
        ['Published Live', String(k.published_items || 0)],
        ['Nested Sub-Directories', String(k.folder_count || 0)],
        ['PYQ & Syllabus PDFs', String(k.pyq_and_syllabus_count || 0)]
      ];
      pairs.forEach(function (p) {
        kpis.appendChild(el('div', { class: 'cso-ops-kpi' }, [
          el('span', { class: 'cso-ops-kpi-lbl', text: p[0] }),
          el('strong', { class: 'cso-ops-kpi-val', text: p[1] })
        ]));
      });
    }

    function renderTelemetry(k, rows) {
      clear(telemetryBox);
      var total = Number(k.total_items || rows.length || 0);
      var pub = Number(k.published_items || 0);
      var pubPct = total > 0 ? Math.round((pub / total) * 100) : 0;
      var bi = Number(k.bilingual_count || 0);
      var biPct = total > 0 ? Math.round((bi / total) * 100) : 0;
      var pdfCount = rows.filter(function (r) { return Boolean(r.pdf_url); }).length;
      var pdfPct = rows.length > 0 ? Math.round((pdfCount / rows.length) * 100) : 0;

      telemetryBox.appendChild(el('div', { class: 'cso-cnt-tel-item' }, [
        el('div', { class: 'cso-cnt-tel-head' }, [el('span', { text: 'Publishing Ratio' }), el('strong', { text: pub + ' / ' + total + ' (' + pubPct + '%)' })]),
        el('progress', { class: 'cso-cnt-tel-prog', max: String(Math.max(1, total)), value: String(pub) })
      ]));
      telemetryBox.appendChild(el('div', { class: 'cso-cnt-tel-item' }, [
        el('div', { class: 'cso-cnt-tel-head' }, [el('span', { text: 'Bilingual EN+OR Coverage' }), el('strong', { text: biPct + '%' })]),
        el('meter', { class: 'cso-cnt-tel-meter', min: '0', max: '100', low: '25', high: '60', optimum: '90', value: String(biPct) })
      ]));
      telemetryBox.appendChild(el('div', { class: 'cso-cnt-tel-item' }, [
        el('div', { class: 'cso-cnt-tel-head' }, [el('span', { text: 'PDF Attachment Rate' }), el('strong', { text: pdfPct + '%' })]),
        el('meter', { class: 'cso-cnt-tel-meter', min: '0', max: '100', low: '30', high: '70', optimum: '95', value: String(pdfPct) })
      ]));
    }

    var searchInp = el('input', { class: 'input', type: 'search', placeholder: 'Search title, exam, subject, or folder path...' });
    var searchBtn = el('button', { class: 'cso-ops-btn', type: 'button', text: 'Search' });
    var statusSel = el('select', { class: 'select' }, [
      el('option', { value: 'all', text: 'All Statuses' }),
      el('option', { value: 'draft', text: 'Draft' }),
      el('option', { value: 'in_review', text: 'In Review' }),
      el('option', { value: 'published', text: 'Published' }),
      el('option', { value: 'archived', text: 'Archived' })
    ]);

    [['all', 'All'], ['notes', 'Notes'], ['pyq', 'PYQs'], ['syllabus', 'Syllabus'], ['ebook', 'eBooks'], ['model-paper', 'Model Papers']].forEach(function (td) {
      var b = el('button', { type: 'button', class: 'cso-cnt-pill' + (state.resourceType === td[0] ? ' is-active' : ''), text: td[1] });
      b.addEventListener('click', function () {
        state.resourceType = td[0];
        state.offset = 0;
        Array.prototype.forEach.call(pillsBox.children, function (c) { c.classList.remove('is-active'); });
        b.classList.add('is-active');
        loadItems();
      });
      pillsBox.appendChild(b);
    });

    function renderTable(res) {
      clear(tableBox);
      clear(pagerBox);
      var rows = Array.isArray(res.items) ? res.items : [];
      state.total = Number((res.paging && res.paging.total) || rows.length);

      if (!rows.length) {
        tableBox.appendChild(el('div', { class: 'muted sm', text: 'No study resources in this folder scope yet. Click "+ Add Study Resource" to create one.' }));
      } else {
        var tbody = el('tbody');
        rows.forEach(function (it) {
          var stCls = it.status === 'published' ? 'ok' : (it.status === 'archived' ? 'bad' : 'warn');
          var actTd = el('td', { class: 'cso-ops-actions' });
          if (canWrite) {
            var editBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--sm', type: 'button', text: 'Edit' });
            editBtn.addEventListener('click', function () { openComposer(it); });
            actTd.appendChild(editBtn);
          }
          if (canStatus) {
            var verifyItemBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--sm', type: 'button', text: 'Mark Verified Today' });
            verifyItemBtn.addEventListener('click', async function () {
              verifyItemBtn.disabled = true;
              try {
                await api('POST', 'study-library/items/' + encodeURIComponent(it.id) + '/verify', {});
                toast('Marked resource verified today');
                await loadItems();
              } catch (err) {
                toast(err.message || 'Verify failed', true);
                verifyItemBtn.disabled = false;
              }
            });
            actTd.appendChild(verifyItemBtn);
          }
          if (it.status === 'published') {
            actTd.appendChild(el('a', {
              class: 'cso-ops-btn cso-ops-btn--sm',
              href: '/study-library/item/' + encodeURIComponent(it.slug || it.id) + '/',
              target: '_blank',
              rel: 'noopener noreferrer',
              text: 'View Live Page ↗'
            }));
          }
          if (canStatus) {
            var nextSt = it.status === 'published' ? 'draft' : 'published';
            var prevSt = it.status;
            var togBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--sm', type: 'button', text: it.status === 'published' ? 'Unpublish' : 'Publish' });
            togBtn.addEventListener('click', async function () {
              togBtn.disabled = true;
              try {
                await api('PATCH', 'study-library/items/' + encodeURIComponent(it.id) + '/status', { status: nextSt });
                await loadItems();
                toastWithUndo('Resource status set to ' + nextSt, async function () {
                  await api('PATCH', 'study-library/items/' + encodeURIComponent(it.id) + '/status', { status: prevSt });
                  toast('Reverted status to ' + prevSt);
                  await loadItems();
                });
              } catch (err) {
                toast(err.message || 'Status update failed', true);
                togBtn.disabled = false;
              }
            });
            actTd.appendChild(togBtn);
          }
          if (canWrite) {
            var delBtn = el('button', { class: 'cso-ops-btn cso-ops-btn--sm cso-ops-btn--danger', type: 'button', text: 'Delete' });
            delBtn.addEventListener('click', async function () {
              delBtn.disabled = true;
              try {
                await api('DELETE', 'study-library/items/' + encodeURIComponent(it.id));
                toast('Study resource deleted');
                await loadAll();
              } catch (err) {
                toast(err.message || 'Delete failed', true);
                delBtn.disabled = false;
              }
            });
            actTd.appendChild(delBtn);
          }

          tbody.appendChild(el('tr', {}, [
            el('td', {}, [
              el('strong', { text: it.title }),
              el('div', { class: 'muted sm', text: (it.folder_path || 'Domain Root') + (it.pdf_url ? ' · 📄 PDF' : '') })
            ]),
            el('td', {}, [
              el('div', { text: it.resource_type.toUpperCase() + (it.board_or_exam ? ' · ' + it.board_or_exam : '') }),
              el('span', { class: 'cso-cnt-lang-badge', text: it.language_parity || 'EN' })
            ]),
            el('td', {}, [el('span', { class: 'badge ' + stCls, text: it.status })]),
            el('td', { text: String(it.updated_at || it.created_at || '').slice(0, 16).replace('T', ' ') }),
            actTd
          ]));
        });

        tableBox.appendChild(el('div', { class: 'cso-ops-table-wrap' }, [
          el('table', { class: 'table' }, [
            el('thead', {}, [el('tr', {}, [
              el('th', { text: 'Resource & Folder Path' }),
              el('th', { text: 'Type / Lang' }),
              el('th', { text: 'Status' }),
              el('th', { text: 'Updated' }),
              el('th', { text: 'Actions' })
            ])]),
            tbody
          ])
        ]));
      }

      var prevPage = el('button', { class: 'cso-ops-btn cso-ops-btn--sm', type: 'button', text: '← Prev' });
      prevPage.disabled = state.offset <= 0;
      prevPage.addEventListener('click', function () { state.offset = Math.max(0, state.offset - state.limit); loadItems(); });
      var nextPage = el('button', { class: 'cso-ops-btn cso-ops-btn--sm', type: 'button', text: 'Next →' });
      nextPage.disabled = state.offset + state.limit >= state.total;
      nextPage.addEventListener('click', function () { state.offset += state.limit; loadItems(); });
      pagerBox.appendChild(el('span', { class: 'muted sm', text: 'Showing ' + (state.total ? state.offset + 1 : 0) + '–' + Math.min(state.total, state.offset + rows.length) + ' of ' + state.total }));
      pagerBox.appendChild(el('div', { class: 'cso-ops-actions' }, [prevPage, nextPage]));
    }

    async function loadItems() {
      var qs = 'domain=' + encodeURIComponent(activeDomain) +
        '&folder_id=' + encodeURIComponent(state.parentId) +
        '&include_descendants=' + (state.includeDescendants ? '1' : '0') +
        '&resource_type=' + encodeURIComponent(state.resourceType) +
        '&status=' + encodeURIComponent(state.status) +
        '&q=' + encodeURIComponent(state.q) +
        '&limit=' + String(state.limit) +
        '&offset=' + String(state.offset);
      var res = await api('GET', 'study-library/items?' + qs);
      renderKpis(res.kpis || {});
      renderTelemetry(res.kpis || {}, Array.isArray(res.items) ? res.items : []);
      renderTable(res);
    }

    async function loadAll() {
      try {
        var treeRes = await api('GET', 'study-library/tree?domain=' + encodeURIComponent(activeDomain) + '&parent_id=' + encodeURIComponent(state.parentId));
        renderTree(treeRes);
        await loadItems();
      } catch (e) {
        toast(e.message || 'Failed to load Study Library Studio', true);
      }
    }

    statusSel.addEventListener('change', function () { state.status = statusSel.value; state.offset = 0; loadItems(); });
    searchBtn.addEventListener('click', function () { state.q = searchInp.value.trim(); state.offset = 0; loadItems(); });
    searchInp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); state.q = searchInp.value.trim(); state.offset = 0; loadItems(); } });

    var listCard = el('div', { class: 'cso-ops-card' }, [
      pillsBox,
      el('div', { class: 'cso-cnt-toolbar' }, [
        el('div', { class: 'cso-cnt-toolbar-left' }, [searchInp, searchBtn]),
        statusSel
      ]),
      tableBox,
      pagerBox
    ]);
    wrap.appendChild(listCard);

    loadAll();
    return wrap;
  }

  function viewStudyLibraryStudio(domainSlug) {
    setTitle('Study Library Studio');
    main.appendChild(studyLibraryStudioPanel(domainSlug || 'early-childhood'));
  }

  var VIEWS = {
    dashboard: function () { return viewDashboard(); },
    content: function (parts) { return viewContentStudio(parts[1]); },
    'study-library': function (parts) { return viewStudyLibraryStudio(parts[1]); },
    pages: function (parts) { return viewSitePages(parts[1] === 'legal' ? 'Information & Legal' : (parts[1] === 'workspace' ? 'Candidate Workspace' : '')); },
    'jobs-directory': function () { return viewJobsDirectory(); },
    'about-directory': function () { return viewAboutDirectory(); },
    schemes: function (parts) { return viewSchemesManager(parts[1]); },
    'schemes-directory': function () { return viewSchemesDirectoryTree(); },
    'study-library-directory': function () { return viewStudyLibraryDirectory(); },
    freshness: function () { return viewFreshnessAudit(); },
    feedback: function () { return viewFeedbackQueue(); },
    seo: function () { return viewSeoDiscovery(); },
    operations: function (parts) { return viewOperations(parts[1], parts[2]); },
    security: function (parts) { return viewSecurity(parts[1]); },
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
    if (main && main.focus) main.focus({ preventScroll: true });
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
    document.getElementById('signOut').addEventListener('click', async function () { try { localStorage.removeItem('cso_admin_active'); await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); } finally { location.replace('/admin/login?reason=out'); } });
    window.addEventListener('hashchange', route); route();
  }
  if (document.getElementById('nav')) init();
})();
