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
  async function viewSecurity() {
    setTitle('Security');
    if (me && me.role === 'admin') main.appendChild(securityBackupPanel());
    else main.appendChild(el('div', { class: 'alert', text: 'Security settings are visible to administrators only.' }));
  }

  async function viewOperations() {
    setTitle('Operations & Backups');
    if (me && me.role === 'admin') main.appendChild(securityBackupPanel());
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
  var VIEWS = {
    dashboard: function () { return viewDashboard(); },
    pages: function (parts) { return viewSitePages(parts[1] === 'legal' ? 'Information & Legal' : (parts[1] === 'workspace' ? 'Candidate Workspace' : '')); },
    'jobs-directory': function () { return viewJobsDirectory(); },
    'about-directory': function () { return viewAboutDirectory(); },
    schemes: function (parts) { return viewSchemesManager(parts[1]); },
    'schemes-directory': function () { return viewSchemesDirectoryTree(); },
    'study-library-directory': function () { return viewStudyLibraryDirectory(); },
    freshness: function () { return viewFreshnessAudit(); },
    feedback: function () { return viewFeedbackQueue(); },
    seo: function () { return viewSeoDiscovery(); },
    operations: function () { return viewOperations(); },
    security: function () { return viewSecurity(); },
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
