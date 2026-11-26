/**
 * CS Odisha Admin Studio — Streamlined + Create New Studio, Quick Publish Mode,
 * AI EN -> Odia Quick Translation, and AI Title/Slug/Tag Suggester (v331)
 * Strict CSP-compliant: pure DOM APIs only, zero raw HTML injection, zero inline style/handlers.
 */
(function (window, document) {
  'use strict';

  var ODISHA_DISTRICTS = [
    'All Odisha', 'All India', 'Foreign / Overseas', 'Angul', 'Balangir', 'Balasore', 'Bargarh',
    'Bhadrak', 'Boudh', 'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur',
    'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha',
    'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri',
    'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'
  ];

  var EXAM_CATEGORIES = [
    'OPSC', 'OSSC', 'OSSSC', 'OTET', 'OSSTET', 'CTET', 'OAVS',
    'Odisha Police', 'Banking & PSU', 'SSC & Railways', 'UPSC', 'UGC NET', 'General GK'
  ];

  var CA_CATEGORIES = [
    'Odisha State', 'National & Economy', 'Polity & Schemes',
    'Science & Environment', 'Exam Special'
  ];

  var SYLLABUS_RESOURCE_TYPES = [
    'Official Syllabus', 'Previous Year Paper (PYQ)', 'Official Answer Key', 'Study Notes', 'Practice Set / E-Book'
  ];

  var FOOTER_COLUMNS = [
    'Portals & Directories', 'Odisha Exam Boards', 'Student Resources', 'About & Legal'
  ];

  var MEGA_COLUMNS = [
    'Column 1: Quick Tracks', 'Column 2: Exam Bodies', 'Column 3: Study Tools', 'Featured Spotlight'
  ];

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function toast(msg, kind) {
    if (typeof window.showToast === 'function') window.showToast(msg, kind || 'info');
  }

  function todayIso() {
    var d = new Date();
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
  }

  function slugify(raw) {
    return String(raw || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  function bustHomeCache(scope) {
    var ts = String(Date.now());
    var sc = String(scope || 'all');
    try { localStorage.setItem('cso_home_feed_bust', ts); } catch (_) {}
    if (sc === 'nav' || sc === 'all') {
      try { localStorage.setItem('cso_nav_cache_bust', ts); } catch (_) {}
    }
    try {
      if (typeof window.BroadcastChannel === 'function') {
        var ch = new BroadcastChannel('cso-publish-sync');
        ch.postMessage({ type: 'published', scope: sc, ts: ts });
        ch.close();
      }
    } catch (_) {}
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CSO_BUST_HOME_CACHE', scope: sc, ts: ts });
      }
    } catch (_) {}
    try {
      fetch('/api/public/home-feed?refresh=1&_cb=' + encodeURIComponent(ts), { cache: 'no-store', credentials: 'same-origin' }).catch(function () {});
      if (sc === 'nav' || sc === 'all') {
        fetch('/api/nav/config?refresh=1&_cb=' + encodeURIComponent(ts), { cache: 'no-store', credentials: 'same-origin' }).catch(function () {});
      }
    } catch (_) {}
  }

  function apiFetch(url, opts) {
    var o = opts || {};
    var method = (o.method || 'GET').toUpperCase();
    var headers = Object.assign({}, o.headers || {});
    if (method !== 'GET' && method !== 'HEAD') {
      headers['X-CSO-CSRF'] = '1';
      if (!(o.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }
    var body = o.body;
    if (body && !(body instanceof FormData) && typeof body !== 'string') {
      body = JSON.stringify(body);
    }
    return fetch(url, {
      method: method,
      credentials: 'same-origin',
      headers: headers,
      body: body
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) {
          var msg = (d && (d.error || d.message)) || ('HTTP ' + r.status);
          var err = new Error(msg);
          err.status = r.status;
          err.fields = d && d.fields;
          throw err;
        }
        if (method !== 'GET' && method !== 'HEAD' && String(url).indexOf('/ai-coauthor') === -1) {
          bustHomeCache();
        }
        return d;
      });
    });
  }

  // =========================================================================
  // 1. INTEGRATED AI TRANSLATION (EN -> ODIA) & AI TITLE/SLUG/TAG SUGGESTER
  // =========================================================================
  function translateToOdia(englishText) {
    var txt = String(englishText || '').trim();
    if (txt.length < 2) return Promise.reject(new Error('Enter English text first to translate into Odia.'));
    return apiFetch('/api/admin/ai-coauthor', {
      method: 'POST',
      body: { mode: 'translate_odia', input: txt }
    }).then(function (res) {
      if (!res || !res.ok || !res.data || !res.data.translated_or) {
        throw new Error((res && res.error) || 'Translation returned empty text.');
      }
      return res;
    });
  }

  function translateFieldsBatch(fieldsMap) {
    var keys = Object.keys(fieldsMap || {}).filter(function (k) {
      return String(fieldsMap[k] || '').trim().length > 0;
    });
    if (!keys.length) return Promise.reject(new Error('No empty Odia fields with English source text found.'));
    var payload = {};
    keys.forEach(function (k) { payload[k] = String(fieldsMap[k]).trim(); });
    return apiFetch('/api/admin/ai-coauthor', {
      method: 'POST',
      body: { mode: 'translate_fields', fields: payload }
    }).then(function (res) {
      if (!res || !res.ok || !res.data || !res.data.translations) {
        throw new Error((res && res.error) || 'Batch translation failed.');
      }
      return res;
    });
  }

  function suggestMeta(seedText, kind) {
    var txt = String(seedText || '').trim();
    if (txt.length < 3) return Promise.reject(new Error('Enter a topic phrase or paste notice text (at least 3 chars).'));
    return apiFetch('/api/admin/ai-coauthor', {
      method: 'POST',
      body: { mode: 'suggest_meta', input: txt, kind: kind || 'article' }
    }).then(function (res) {
      if (!res || !res.ok || !res.data) {
        throw new Error((res && res.error) || 'AI suggestion failed.');
      }
      return res;
    });
  }

  function createOdiaTranslateBtn(opts) {
    var o = opts || {};
    var b = el('button', 'cso-ai-tr-btn', o.label || '\uD83C\uDF10 EN \u2192 \u0B13\u0B21\u0B3C\u0B3F\u0B06');
    b.type = 'button';
    b.title = 'Translate English text to natural Odisha official Odia using AI';
    b.addEventListener('click', function () {
      var src = typeof o.getSource === 'function' ? String(o.getSource() || '').trim() : '';
      if (src.length < 2) {
        toast('Enter the corresponding English field first.', 'amber');
        return;
      }
      var origText = b.textContent;
      b.disabled = true;
      b.textContent = 'Translating\u2026';
      translateToOdia(src)
        .then(function (res) {
          var odia = res.data.translated_or;
          if (typeof o.setTarget === 'function') {
            o.setTarget(odia);
          } else if (o.targetInput) {
            o.targetInput.value = odia;
            o.targetInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
          if (typeof o.onTranslated === 'function') o.onTranslated(odia, res);
          toast('Translated to Odia (\u0B13\u0B21\u0B3C\u0B3F\u0B06)!', 'ok');
        })
        .catch(function (err) {
          toast(err.message || 'Odia translation failed.', 'crimson');
        })
        .finally(function () {
          b.disabled = false;
          b.textContent = origText;
        });
    });
    return b;
  }

  function createTranslateAllBtn(getPairsFn, onDone) {
    var b = el('button', 'cso-ai-tr-all-btn', '\uD83C\uDF10 Translate All Empty Odia Fields');
    b.type = 'button';
    b.title = 'Translate every empty Odia input/textarea from its English counterpart in one AI batch call';
    b.addEventListener('click', function () {
      var pairs = typeof getPairsFn === 'function' ? (getPairsFn() || []) : [];
      var batch = {};
      var byKey = {};
      pairs.forEach(function (p) {
        if (!p || !p.key) return;
        var enVal = String(typeof p.getEn === 'function' ? p.getEn() : (p.en || '')).trim();
        var orVal = String(typeof p.getOr === 'function' ? p.getOr() : (p.or || '')).trim();
        if (enVal && !orVal) {
          batch[p.key] = enVal;
          byKey[p.key] = p;
        }
      });
      var keys = Object.keys(batch);
      if (!keys.length) {
        toast('All Odia fields with English source text are already filled!', 'info');
        return;
      }
      var origLabel = b.textContent;
      b.disabled = true;
      b.textContent = 'Translating ' + keys.length + ' field(s)\u2026';
      translateFieldsBatch(batch)
        .then(function (res) {
          var tr = (res.data && res.data.translations) || {};
          var filled = 0;
          keys.forEach(function (k) {
            if (tr[k] && byKey[k]) {
              if (typeof byKey[k].setOr === 'function') {
                byKey[k].setOr(tr[k]);
              } else if (byKey[k].targetInput) {
                byKey[k].targetInput.value = tr[k];
                byKey[k].targetInput.dispatchEvent(new Event('input', { bubbles: true }));
              }
              filled += 1;
            }
          });
          if (typeof onDone === 'function') onDone(filled, tr, res);
          toast('Filled ' + filled + ' Odia field(s) via ' + (res.provider === 'gemini_free' ? 'Gemini Free' : 'Workers AI') + '!', 'ok');
        })
        .catch(function (err) {
          toast(err.message || 'Batch Odia translation failed.', 'crimson');
        })
        .finally(function () {
          b.disabled = false;
          b.textContent = origLabel;
        });
    });
    return b;
  }

  function renderMetaSuggester(opts) {
    var o = opts || {};
    var box = el('section', 'cso-ai-meta-box');
    var head = el('div', 'cso-ai-meta-head');
    var titleGroup = el('div', 'cso-ai-meta-title-group');
    titleGroup.appendChild(el('strong', 'cso-ai-meta-title', '\u2728 AI Title, Slug & Tag Suggester'));
    titleGroup.appendChild(el('span', 'cso-ai-badge', '$0 Free AI'));
    head.appendChild(titleGroup);
    box.appendChild(head);

    var row = el('div', 'cso-ai-meta-row');
    var seedInp = el('input', 'cso-qc-input cso-ai-meta-input');
    seedInp.type = 'text';
    seedInp.placeholder = o.placeholder || 'Type a rough topic phrase OR paste notice text (or leave blank to read Title/Summary)\u2026';
    seedInp.setAttribute('aria-label', 'Topic phrase or notice text for AI Title, Slug & Tag suggestions');

    var runBtn = el('button', 'cso-qc-btn cso-qc-btn--primary', '\u2728 Suggest Titles, Slug & Tags');
    runBtn.type = 'button';
    row.append(seedInp, runBtn);
    box.appendChild(row);

    var statusEl = el('div', 'cso-ai-meta-status');
    statusEl.setAttribute('role', 'status');
    statusEl.setAttribute('aria-live', 'polite');
    box.appendChild(statusEl);

    var resultsWrap = el('div', 'cso-ai-meta-results');
    resultsWrap.hidden = true;
    box.appendChild(resultsWrap);

    function renderSuggestions(data, meta) {
      clear(resultsWrap);
      resultsWrap.hidden = false;

      var titlesEn = Array.isArray(data.titles_en) ? data.titles_en : [];
      var titlesOr = Array.isArray(data.titles_or) ? data.titles_or : [];
      var slug = String(data.slug || '').trim();
      var tags = Array.isArray(data.tags) ? data.tags : [];

      if (titlesEn.length) {
        var tGroup = el('div', 'cso-ai-meta-group');
        tGroup.appendChild(el('span', 'cso-ai-meta-lbl', '1-Click Bilingual Headline Pairs (EN + \u0B13\u0B21\u0B3C\u0B3F\u0B06):'));
        var tPills = el('div', 'cso-ai-meta-pills');
        titlesEn.forEach(function (enTitle, idx) {
          var orTitle = titlesOr[idx] || '';
          var pill = el('button', 'cso-ai-pill cso-ai-pill--title');
          pill.type = 'button';
          pill.appendChild(el('span', 'cso-ai-pill-en', enTitle));
          if (orTitle) pill.appendChild(el('span', 'cso-ai-pill-or', orTitle));
          pill.addEventListener('click', function () {
            if (typeof o.onApplyTitlePair === 'function') {
              o.onApplyTitlePair(enTitle, orTitle, slug);
            }
            tPills.querySelectorAll('.cso-ai-pill').forEach(function (p) { p.classList.remove('is-applied'); });
            pill.classList.add('is-applied');
            toast('Applied EN + \u0B13\u0B21\u0B3C\u0B3F\u0B06 headline pair!', 'ok');
          });
          tPills.appendChild(pill);
        });
        tGroup.appendChild(tPills);
        resultsWrap.appendChild(tGroup);
      }

      if (slug) {
        var sGroup = el('div', 'cso-ai-meta-group');
        sGroup.appendChild(el('span', 'cso-ai-meta-lbl', 'Clean SEO Slug:'));
        var sPills = el('div', 'cso-ai-meta-pills');
        var sBtn = el('button', 'cso-ai-pill cso-ai-pill--slug', '\uD83D\uDD17 ' + slug);
        sBtn.type = 'button';
        sBtn.addEventListener('click', function () {
          if (typeof o.onApplySlug === 'function') o.onApplySlug(slug);
          sBtn.classList.add('is-applied');
          toast('Applied SEO slug: ' + slug, 'ok');
        });
        sPills.appendChild(sBtn);
        sGroup.appendChild(sPills);
        resultsWrap.appendChild(sGroup);
      }

      if (tags.length) {
        var tgGroup = el('div', 'cso-ai-meta-group');
        var tgHead = el('div', 'cso-ai-meta-subhead');
        tgHead.appendChild(el('span', 'cso-ai-meta-lbl', 'Suggested Tags (' + tags.length + '):'));
        if (typeof o.onApplyAllTags === 'function' || typeof o.onApplyTag === 'function') {
          var allBtn = el('button', 'cso-ai-tr-btn', '+ Insert All Tags');
          allBtn.type = 'button';
          allBtn.addEventListener('click', function () {
            if (typeof o.onApplyAllTags === 'function') o.onApplyAllTags(tags);
            else tags.forEach(function (t) { o.onApplyTag(t); });
            toast('Inserted ' + tags.length + ' suggested tags!', 'ok');
          });
          tgHead.appendChild(allBtn);
        }
        tgGroup.appendChild(tgHead);

        var tgPills = el('div', 'cso-ai-meta-pills');
        tags.forEach(function (tag) {
          var tb = el('button', 'cso-ai-pill cso-ai-pill--tag', '+ ' + tag);
          tb.type = 'button';
          tb.addEventListener('click', function () {
            if (typeof o.onApplyTag === 'function') o.onApplyTag(tag);
            tb.classList.add('is-applied');
            toast('Added tag: ' + tag, 'ok');
          });
          tgPills.appendChild(tb);
        });
        tgGroup.appendChild(tgPills);
        resultsWrap.appendChild(tgGroup);
      }

      if (meta && meta.provider) {
        statusEl.textContent = 'Ready via ' + (meta.provider === 'gemini_free' ? 'Gemini Free' : 'Workers AI') + ' \u2014 click any pill to apply.';
      }
    }

    function triggerSuggest() {
      var seed = seedInp.value.trim();
      if (!seed && typeof o.getSeedText === 'function') {
        seed = String(o.getSeedText() || '').trim();
      }
      if (seed.length < 3) {
        statusEl.textContent = 'Enter a topic phrase above or type a draft title first.';
        seedInp.focus();
        return;
      }
      runBtn.disabled = true;
      runBtn.textContent = 'Suggesting\u2026';
      statusEl.textContent = 'Generating bilingual headlines, SEO slug & tags\u2026';
      suggestMeta(seed, o.kind || 'article')
        .then(function (res) {
          renderSuggestions(res.data || {}, res);
        })
        .catch(function (err) {
          statusEl.textContent = err.message || 'Suggestion failed.';
          toast(err.message || 'AI suggestion failed.', 'crimson');
        })
        .finally(function () {
          runBtn.disabled = false;
          runBtn.textContent = '\u2728 Suggest Titles, Slug & Tags';
        });
    }

    runBtn.addEventListener('click', triggerSuggest);
    seedInp.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        triggerSuggest();
      }
    });

    return box;
  }

  function readQuickModePref(defaultVal) {
    try {
      var v = localStorage.getItem('cso_quick_publish_mode');
      if (v === '0') return false;
      if (v === '1') return true;
    } catch (_) {}
    return defaultVal !== false;
  }

  function saveQuickModePref(on) {
    try { localStorage.setItem('cso_quick_publish_mode', on ? '1' : '0'); } catch (_) {}
  }

  function createQuickModeToggle(initialOn, onChange) {
    var active = Boolean(initialOn);
    var btn = el('button', 'cso-quick-mode-toggle' + (active ? ' is-on' : ''));
    btn.type = 'button';
    btn.setAttribute('aria-pressed', String(active));
    function syncText() {
      btn.textContent = active ? '\u26A1 Quick Publish Mode: ON' : '\u26A1 Quick Publish Mode: OFF (Full)';
      btn.classList.toggle('is-on', active);
      btn.setAttribute('aria-pressed', String(active));
    }
    syncText();
    btn.addEventListener('click', function () {
      active = !active;
      saveQuickModePref(active);
      syncText();
      if (typeof onChange === 'function') onChange(active);
    });
    return {
      node: btn,
      isOn: function () { return active; },
      setOn: function (next) {
        active = Boolean(next);
        syncText();
        if (typeof onChange === 'function') onChange(active);
      }
    };
  }

  function makeField(labelText, inputNode, opts) {
    var o = opts || {};
    var wrap = el('div', 'cso-qc-field' + (o.full ? ' cso-qc-full' : ''));
    var row = el('div', 'cso-qc-label-row');
    var lbl = el('label', 'cso-qc-label', labelText);
    if (inputNode.id) lbl.setAttribute('for', inputNode.id);
    row.appendChild(lbl);
    if (o.actionEl) row.appendChild(o.actionEl);
    wrap.appendChild(row);
    wrap.appendChild(inputNode);
    if (o.hint) wrap.appendChild(el('span', 'cso-qc-hint', o.hint));
    return wrap;
  }

  function addTagToInput(inp, rawTag) {
    var clean = String(rawTag || '').trim();
    if (!clean || !inp) return;
    var existing = inp.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    if (existing.some(function (t) { return t.toLowerCase() === clean.toLowerCase(); })) return;
    existing.push(clean);
    inp.value = existing.slice(0, 12).join(', ');
    inp.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // =========================================================================
  // 2. BULK-PASTE MCQ PARSER (Plain-Text Q/A/B/C/D/Answer + CSV)
  // =========================================================================
  function parseBulkMcqs(rawText) {
    var text = String(rawText || '').replace(/\r\n?/g, '\n').trim();
    if (!text) return [];

    // Detect CSV header format
    if (/^question_en\s*,/i.test(text)) {
      var lines = text.split('\n').filter(function (l) { return l.trim(); });
      var outCsv = [];
      for (var i = 1; i < lines.length; i++) {
        var cols = parseCsvLine(lines[i]);
        if (!cols[0]) continue;
        var rawAns = String(cols[6] || '0').trim().toUpperCase();
        var ansMap = { A: 0, B: 1, C: 2, D: 3 };
        var idx = rawAns in ansMap ? ansMap[rawAns] : Math.max(0, Math.min(3, parseInt(rawAns, 10) || 0));
        outCsv.push({
          question_en: cols[0],
          question_or: cols[1] || '',
          options: [cols[2] || 'Option A', cols[3] || 'Option B', cols[4] || 'Option C', cols[5] || 'Option D'],
          correct_index: idx,
          explanation_en: cols[7] || '',
          explanation_or: cols[8] || ''
        });
      }
      return outCsv;
    }

    // Plain-text flexible MCQ blocks separated by blank lines or Q1./1.
    var blocks = text.split(/\n(?=(?:Q\.?\s*\d+[\.\):]|\d+[\.\)]\s+))/i).map(function (b) { return b.trim(); }).filter(Boolean);
    if (blocks.length === 1 && text.indexOf('\n\n') !== -1) {
      blocks = text.split(/\n{2,}/).map(function (b) { return b.trim(); }).filter(Boolean);
    }

    var parsed = [];
    blocks.forEach(function (blk) {
      var bLines = blk.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      if (!bLines.length) return;
      var qText = '';
      var opts = ['', '', '', ''];
      var ansIdx = 0;
      var expText = '';
      var letterIdx = { A: 0, B: 1, C: 2, D: 3 };

      bLines.forEach(function (ln) {
        var optM = ln.match(/^\(?([A-Da-d])\)?[\.\):\-\s]+(.+)$/);
        var ansM = ln.match(/^(?:Ans(?:wer)?|Correct(?:\s*Answer)?)\s*[:\-=]\s*\(?([A-Da-d0-3])\)?/i);
        var expM = ln.match(/^(?:Exp(?:lanation)?|Solution|Hint)\s*[:\-]\s*(.+)$/i);
        if (ansM) {
          var tok = ansM[1].toUpperCase();
          ansIdx = tok in letterIdx ? letterIdx[tok] : Math.max(0, Math.min(3, parseInt(tok, 10) || 0));
        } else if (expM) {
          expText = expM[1].trim();
        } else if (optM && qText) {
          opts[letterIdx[optM[1].toUpperCase()]] = optM[2].trim();
        } else {
          var cleanQ = ln.replace(/^(?:Q\.?\s*\d+|\d+)[\.\):\-\s]+/i, '').trim();
          qText = qText ? (qText + ' ' + cleanQ) : cleanQ;
        }
      });

      if (qText && opts.filter(Boolean).length >= 2) {
        opts = opts.map(function (o, i) { return o || ('Option ' + ['A', 'B', 'C', 'D'][i]); });
        parsed.push({
          question_en: qText,
          question_or: '',
          options: opts,
          correct_index: ansIdx,
          explanation_en: expText,
          explanation_or: ''
        });
      }
    });
    return parsed;
  }

  function parseCsvLine(line) {
    var res = [];
    var cur = '';
    var inQ = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line[i];
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { cur += '"'; i += 1; }
        else if (ch === '"') inQ = false;
        else cur += ch;
      } else {
        if (ch === '"') inQ = true;
        else if (ch === ',') { res.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
    }
    res.push(cur.trim());
    return res;
  }

  function mcqsToCsv(list) {
    var rows = ['question_en,question_or,option_a,option_b,option_c,option_d,correct_index,explanation_en,explanation_or'];
    (list || []).forEach(function (q) {
      var opts = Array.isArray(q.options) ? q.options : ['', '', '', ''];
      var cols = [
        q.question_en || '',
        q.question_or || '',
        opts[0] || '',
        opts[1] || '',
        opts[2] || '',
        opts[3] || '',
        String(q.correct_index !== undefined ? q.correct_index : 0),
        q.explanation_en || '',
        q.explanation_or || ''
      ].map(function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; });
      rows.push(cols.join(','));
    });
    return rows.join('\n');
  }

  // =========================================================================
  // 2B. LATEST UPDATES PIN/SCOPE CONTROLS & LIVE FEED QUICK-CONTROL PANEL (v337)
  // =========================================================================
  function createLatestUpdatesControls(opts) {
    var cfg = opts || {};
    var box = el('div', 'cso-qc-lu-bar');
    var chkPin = el('input');
    chkPin.type = 'checkbox';
    chkPin.id = cfg.pinId || ('qcLuPin_' + Math.random().toString(36).slice(2, 6));
    chkPin.checked = Boolean(cfg.defaultPinned);

    var pinLbl = el('label', 'cso-qc-check cso-qc-lu-pin-lbl');
    pinLbl.append(chkPin, el('span', '', '\uD83D\uDCCC Pin to Homepage Latest Updates'));

    var chkExam = el('input');
    chkExam.type = 'checkbox';
    chkExam.id = cfg.examId || ('qcLuExam_' + Math.random().toString(36).slice(2, 6));
    chkExam.checked = Boolean(cfg.defaultExam);

    var examLbl = el('label', 'cso-qc-check cso-qc-lu-exam-lbl');
    examLbl.append(chkExam, el('span', '', '\uD83D\uDCDD Exams Tag'));

    var scopeWrap = el('label', 'cso-qc-lu-scope-wrap');
    scopeWrap.appendChild(el('span', 'cso-qc-label', 'Homepage Scope'));
    var selScope = el('select', 'cso-qc-select cso-qc-lu-scope-sel');
    selScope.id = cfg.scopeId || ('qcLuScope_' + Math.random().toString(36).slice(2, 6));
    [['Odisha', 'Odisha'], ['National', 'National']].forEach(function (pair) {
      selScope.appendChild(new Option(pair[1], pair[0]));
    });
    selScope.value = cfg.defaultScope === 'National' ? 'National' : 'Odisha';
    scopeWrap.appendChild(selScope);

    box.append(pinLbl, examLbl, scopeWrap);

    function syncMeta(entityType, entityId) {
      var cleanId = String(entityId || '').trim();
      if (!entityType || !cleanId) return Promise.resolve(null);
      return apiFetch('/api/admin/latest-updates', {
        method: 'POST',
        body: {
          action: 'set_meta',
          entity_type: entityType,
          entity_id: cleanId,
          is_pinned: chkPin.checked ? 1 : 0,
          is_exam: chkExam.checked ? 1 : 0,
          scope: selScope.value || 'Odisha'
        }
      }).catch(function () { return null; });
    }

    return {
      node: box,
      chkPin: chkPin,
      chkExam: chkExam,
      selScope: selScope,
      isPinned: function () { return chkPin.checked; },
      isExam: function () { return chkExam.checked; },
      getScope: function () { return selScope.value || 'Odisha'; },
      setScope: function (v) { selScope.value = v === 'National' ? 'National' : 'Odisha'; },
      syncMeta: syncMeta
    };
  }

  function openEditorForLatestUpdateItem(it) {
    if (!it) return;
    var studio = window.CSOStudio || {};
    if (it.entity_type === 'job' && studio.openJobsPublishingTab) {
      studio.openJobsPublishingTab('articles');
    } else if (it.entity_type === 'mock_test' && studio.openQuickCreateRoute) {
      studio.openQuickCreateRoute('mock-tests/new');
    } else if (it.entity_type === 'career' && studio.openCareersPublishingTab) {
      studio.openCareersPublishingTab('list');
    } else if (it.entity_type === 'scheme' && studio.openSchemesPublishingTab) {
      studio.openSchemesPublishingTab('articles');
    } else if (it.entity_type === 'study' && studio.openStudyPublishingTab) {
      studio.openStudyPublishingTab('articles');
    } else if (it.entity_type === 'guide' && studio.openGuidesPublishingTab) {
      studio.openGuidesPublishingTab('all');
    } else if (it.entity_type === 'current_affairs' && studio.openQuickCreateRoute) {
      studio.openQuickCreateRoute('current-affairs/new');
    } else if (it.url) {
      window.open(it.url, '_blank', 'noopener,noreferrer');
    }
  }

  function renderHomepageSectionsTogglePanel() {
    var SECTION_DEFS = [
      { key: 'jobs', id: 'qcHsJobs', label: '\uD83D\uDCBC Job Alerts & Admit Cards', slot: 'Row 1 \u00B7 Left' },
      { key: 'current_affairs', id: 'qcHsCa', label: '\uD83D\uDCF0 Daily Current Affairs', slot: 'Row 1 \u00B7 Right' },
      { key: 'mock_tests', id: 'qcHsMocks', label: '\u23F1\uFE0F Live CBT Mock Tests', slot: 'Row 2 \u00B7 Left' },
      { key: 'syllabus_pyq', id: 'qcHsSyllabus', label: '\uD83D\uDCD1 Syllabus & PYQ Papers', slot: 'Row 2 \u00B7 Right' },
      { key: 'careers', id: 'qcHsCareers', label: '\uD83E\uDDED Career Roadmaps', slot: 'Row 3 \u00B7 Left' },
      { key: 'schemes', id: 'qcHsSchemes', label: '\uD83C\uDFDB\uFE0F Government Schemes', slot: 'Row 3 \u00B7 Right' }
    ];

    var card = el('section', 'cso-qc-card cso-qc-hs-panel');
    card.id = 'csoQcHomeSectionsCard';
    card.appendChild(el('h3', 'cso-qc-card-title', '\uD83D\uDCD0 Homepage Compact Sections'));
    card.appendChild(el('p', 'cso-qc-hint', 'Toggle visibility for the 6 compact 2-column feed boxes on csodisha.com. Saving updates D1 & busts edge caches immediately.'));

    var grid = el('div', 'cso-qc-hs-grid');
    var checks = {};
    var rows = {};
    var states = {};
    var statusEl = el('span', 'cso-qc-status');
    statusEl.setAttribute('role', 'status');

    function syncVisual(key) {
      var on = Boolean(checks[key] && checks[key].checked);
      if (rows[key]) rows[key].classList.toggle('is-off', !on);
      if (states[key]) states[key].textContent = on ? 'Visible' : 'Hidden';
    }

    function readStateMap() {
      var out = {};
      SECTION_DEFS.forEach(function (d) { out[d.key] = Boolean(checks[d.key] && checks[d.key].checked); });
      return out;
    }

    function applyStateMap(map) {
      var src = (map && typeof map === 'object') ? map : {};
      SECTION_DEFS.forEach(function (d) {
        checks[d.key].checked = src[d.key] !== false;
        syncVisual(d.key);
      });
    }

    function saveSections(overrideMap) {
      var payload = overrideMap || readStateMap();
      if (overrideMap) applyStateMap(overrideMap);
      statusEl.textContent = 'Saving Homepage Compact Sections & busting caches\u2026';
      apiFetch('/api/admin/site', { method: 'PUT', body: { homepage_sections: payload } })
        .then(function (res) {
          if (res && res.homepage_sections) applyStateMap(res.homepage_sections);
          statusEl.textContent = '\u2713 Section layout saved live & edge caches purged!';
          toast('Homepage Compact Sections updated live!', 'ok');
        })
        .catch(function (err) {
          statusEl.textContent = '\u2715 ' + err.message;
          toast(err.message || 'Failed to save section visibility.', 'crimson');
        });
    }

    SECTION_DEFS.forEach(function (def) {
      var item = el('label', 'cso-qc-hs-item');
      item.setAttribute('for', def.id);
      var left = el('span', 'cso-qc-hs-left');
      var cb = el('input', 'cso-qc-hs-check');
      cb.type = 'checkbox';
      cb.id = def.id;
      cb.checked = true;
      cb.addEventListener('change', function () {
        syncVisual(def.key);
        saveSections();
      });
      var txt = el('span', 'cso-qc-hs-text');
      txt.append(el('span', 'cso-qc-hs-name', def.label), el('span', 'cso-qc-hs-slot', def.slot));
      left.append(cb, txt);
      var badge = el('span', 'cso-qc-hs-state', 'Visible');
      item.append(left, badge);
      checks[def.key] = cb;
      rows[def.key] = item;
      states[def.key] = badge;
      grid.appendChild(item);
    });
    card.appendChild(grid);

    var foot = el('div', 'cso-qc-hs-foot');
    var saveBtn = el('button', 'cso-qc-btn cso-qc-btn--primary', 'Save Section Layout \u2192');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', function () { saveSections(); });
    var allOnBtn = el('button', 'cso-qc-btn', 'Show All 6');
    allOnBtn.type = 'button';
    allOnBtn.addEventListener('click', function () {
      var allOn = {};
      SECTION_DEFS.forEach(function (d) { allOn[d.key] = true; });
      saveSections(allOn);
    });
    foot.append(saveBtn, allOnBtn, statusEl);
    card.appendChild(foot);

    apiFetch('/api/admin/site').then(function (data) {
      if (data && (data.homepage_sections || data.sections)) {
        applyStateMap(data.homepage_sections || data.sections);
      }
    }).catch(function () {});

    return { node: card };
  }

  function renderLatestUpdatesControlPanel() {
    var card = el('section', 'cso-qc-card cso-qc-lu-panel');
    var head = el('div', 'cso-qc-label-row');
    head.appendChild(el('h3', 'cso-qc-card-title', '\uD83D\uDCCC Latest Updates Live Feed (Homepage Sync)'));
    var refreshBtn = el('button', 'cso-ai-tr-btn', '\u21BB Refresh Live Feed');
    refreshBtn.type = 'button';
    head.appendChild(refreshBtn);
    card.appendChild(head);
    card.appendChild(el('p', 'cso-qc-hint', 'Exact items currently appearing in the homepage Latest Updates box. Pin, switch Odisha/National scope, edit, or unpublish with instant cache purge.'));

    var listHost = el('div', 'cso-qc-feed');
    card.appendChild(listHost);

    function loadLiveFeed() {
      clear(listHost);
      listHost.appendChild(el('p', 'cso-qc-hint', 'Loading live homepage Latest Updates from D1\u2026'));
      apiFetch('/api/admin/latest-updates?limit=15')
        .then(function (data) {
          clear(listHost);
          var items = (data && Array.isArray(data.items)) ? data.items : [];
          if (!items.length) {
            listHost.appendChild(el('p', 'cso-qc-hint', 'No published items in Latest Updates yet. Publish any Job, Scheme, Study Resource, Career Roadmap, or Current Affairs post to see it live here.'));
            return;
          }
          items.forEach(function (it) {
            var row = el('div', 'cso-qc-feed-row cso-qc-lu-row');
            var info = el('div', 'cso-qc-lu-info');
            var topLine = el('div', 'cso-qc-lu-badges');
            topLine.appendChild(el('span', 'cso-qc-badge', it.badge_type || 'UPDATE'));
            topLine.appendChild(el('span', 'cso-qc-badge', it.scope || 'Odisha'));
            if (it.is_exam) topLine.appendChild(el('span', 'cso-qc-badge', '\uD83D\uDCDD Exams'));
            if (it.is_pinned) topLine.appendChild(el('span', 'cso-qc-badge cso-qc-badge--pin', '\uD83D\uDCCC Pinned'));
            info.appendChild(topLine);
            info.appendChild(el('strong', 'cso-qc-lu-title', it.title_en || 'Untitled'));
            if (it.meta_line) info.appendChild(el('span', 'cso-qc-hint', it.meta_line));

            var acts = el('div', 'cso-qc-feed-actions');
            var btnPin = el('button', 'cso-qc-btn', it.is_pinned ? 'Unpin' : '\uD83D\uDCCC Pin');
            btnPin.type = 'button';
            btnPin.addEventListener('click', function () {
              btnPin.disabled = true;
              apiFetch('/api/admin/latest-updates', {
                method: 'POST',
                body: {
                  action: it.is_pinned ? 'unpin' : 'pin',
                  entity_type: it.entity_type,
                  entity_id: it.entity_id,
                  scope: it.scope || 'Odisha',
                  is_exam: it.is_exam ? 1 : 0
                }
              }).then(function () {
                toast(it.is_pinned ? 'Unpinned from top of Latest Updates.' : 'Pinned to top of Latest Updates!', 'ok');
                loadLiveFeed();
              }).catch(function (e) {
                toast(e.message || 'Pin update failed.', 'crimson');
                btnPin.disabled = false;
              });
            });

            var btnExam = el('button', 'cso-qc-btn', it.is_exam ? '\u2713 Exams' : '+ Exams');
            btnExam.type = 'button';
            btnExam.addEventListener('click', function () {
              btnExam.disabled = true;
              apiFetch('/api/admin/latest-updates', {
                method: 'POST',
                body: {
                  action: it.is_exam ? 'untag_exam' : 'tag_exam',
                  entity_type: it.entity_type,
                  entity_id: it.entity_id,
                  is_pinned: it.is_pinned ? 1 : 0,
                  scope: it.scope || 'Odisha',
                  is_exam: it.is_exam ? 0 : 1
                }
              }).then(function () {
                toast(it.is_exam ? 'Removed Exams tag & purged homepage cache.' : 'Tagged under Exams tab & purged homepage cache!', 'ok');
                loadLiveFeed();
              }).catch(function (e) {
                toast(e.message || 'Exams tag update failed.', 'crimson');
                btnExam.disabled = false;
              });
            });

            var nextScope = it.scope === 'National' ? 'Odisha' : 'National';
            var btnScope = el('button', 'cso-qc-btn', 'Set ' + nextScope);
            btnScope.type = 'button';
            btnScope.addEventListener('click', function () {
              btnScope.disabled = true;
              apiFetch('/api/admin/latest-updates', {
                method: 'POST',
                body: {
                  action: 'set_meta',
                  entity_type: it.entity_type,
                  entity_id: it.entity_id,
                  is_pinned: it.is_pinned ? 1 : 0,
                  is_exam: it.is_exam ? 1 : 0,
                  scope: nextScope
                }
              }).then(function () {
                toast('Moved item scope to ' + nextScope + '.', 'ok');
                loadLiveFeed();
              }).catch(function (e) {
                toast(e.message || 'Scope update failed.', 'crimson');
                btnScope.disabled = false;
              });
            });

            var btnEdit = el('button', 'cso-qc-btn', 'Edit');
            btnEdit.type = 'button';
            btnEdit.addEventListener('click', function () { openEditorForLatestUpdateItem(it); });

            var btnUnpub = el('button', 'cso-qc-btn cso-qc-btn--danger', 'Unpublish');
            btnUnpub.type = 'button';
            btnUnpub.addEventListener('click', function () {
              if (!window.confirm('Unpublish "' + it.title_en + '" and remove it from Homepage Latest Updates?')) return;
              btnUnpub.disabled = true;
              apiFetch('/api/admin/latest-updates', {
                method: 'POST',
                body: {
                  action: 'unpublish',
                  entity_type: it.entity_type,
                  entity_id: it.entity_id
                }
              }).then(function () {
                toast('Unpublished & purged homepage cache.', 'ok');
                loadLiveFeed();
              }).catch(function (e) {
                toast(e.message || 'Unpublish failed.', 'crimson');
                btnUnpub.disabled = false;
              });
            });

            acts.append(btnPin, btnExam, btnScope, btnEdit, btnUnpub);
            row.append(info, acts);
            listHost.appendChild(row);
          });
        })
        .catch(function (err) {
          clear(listHost);
          listHost.appendChild(el('p', 'cso-qc-hint', 'Unable to load Latest Updates feed: ' + err.message));
        });
    }

    refreshBtn.addEventListener('click', loadLiveFeed);
    loadLiveFeed();
    return { node: card, reload: loadLiveFeed };
  }

  // =========================================================================
  // 3. SHARED SHELL FOR ALL 7 QUICK-CREATE WORKFLOWS
  // =========================================================================
  function buildQuickShell(root, headerActions, cfg) {
    clear(root);
    if (headerActions) clear(headerActions);

    var shell = el('div', 'cso-qc-shell');
    var topBar = el('div', 'cso-qc-topbar');
    var left = el('div', 'cso-qc-top-left');
    var badge = el('span', 'cso-qc-badge', cfg.badge || 'Fast Entry');
    left.appendChild(badge);
    left.appendChild(el('span', 'cso-qc-sub', cfg.subtitle || 'Sensible defaults pre-filled — publish in under 60 seconds.'));

    var right = el('div', 'cso-qc-top-actions');
    var luDrawerHost = el('div', 'cso-qc-lu-drawer');
    luDrawerHost.hidden = true;
    var luPanelMounted = null;
    if (cfg.showLiveFeedToggle !== false) {
      var btnLiveFeed = el('button', 'cso-qc-btn', '\uD83D\uDCCC Latest Updates Feed');
      btnLiveFeed.type = 'button';
      btnLiveFeed.addEventListener('click', function () {
        luDrawerHost.hidden = !luDrawerHost.hidden;
        if (!luDrawerHost.hidden) {
          if (!luPanelMounted) {
            luPanelMounted = renderLatestUpdatesControlPanel();
            luDrawerHost.appendChild(luPanelMounted.node);
          } else {
            luPanelMounted.reload();
          }
        }
      });
      right.appendChild(btnLiveFeed);
    }

    var quickToggle = null;
    if (cfg.hasAdvanced !== false) {
      quickToggle = createQuickModeToggle(readQuickModePref(true), function (isQuick) {
        shell.classList.toggle('is-quick-mode', isQuick);
        if (cfg.onQuickModeChange) cfg.onQuickModeChange(isQuick);
      });
      shell.classList.toggle('is-quick-mode', quickToggle.isOn());
      right.appendChild(quickToggle.node);
    }

    if (cfg.translateAllBtn) right.appendChild(cfg.translateAllBtn);
    if (cfg.fullStudioLabel && typeof cfg.onOpenFullStudio === 'function') {
      var fsBtn = el('button', 'cso-qc-btn', cfg.fullStudioLabel);
      fsBtn.type = 'button';
      fsBtn.addEventListener('click', cfg.onOpenFullStudio);
      right.appendChild(fsBtn);
    }

    topBar.append(left, right);
    shell.appendChild(topBar);
    shell.appendChild(luDrawerHost);
    root.appendChild(shell);

    if (headerActions) {
      if (cfg.onSaveDraft) {
        var hdrDraft = el('button', 'cso-qc-btn', cfg.draftLabel || 'Save Draft');
        hdrDraft.type = 'button';
        hdrDraft.addEventListener('click', cfg.onSaveDraft);
        headerActions.appendChild(hdrDraft);
      }
      if (cfg.onPublishNow) {
        var hdrPub = el('button', 'cso-qc-btn cso-qc-btn--primary', cfg.publishLabel || 'Publish Now \u2192');
        hdrPub.type = 'button';
        hdrPub.addEventListener('click', cfg.onPublishNow);
        headerActions.appendChild(hdrPub);
      }
    }

    return { shell: shell, quickToggle: quickToggle };
  }

  function buildAdvAccordion(titleText, quickToggle) {
    var det = el('details', 'cso-adv-accordion');
    det.open = quickToggle ? !quickToggle.isOn() : false;
    det.appendChild(el('summary', 'cso-adv-summary', titleText || 'Advanced SEO, Schema & Optional Fields'));
    var inner = el('div', 'cso-adv-body');
    det.appendChild(inner);
    return { details: det, body: inner };
  }

  // =========================================================================
  // WORKFLOW 1: JOB ALERT (jobs/new)
  // =========================================================================
  function renderQuickJobAlert(root, headerActions) {
    var savedId = '';
    var slugTouched = false;
    var statusEl = el('span', 'cso-qc-status');
    statusEl.setAttribute('role', 'status');
    statusEl.setAttribute('aria-live', 'polite');

    var inTitleEn = el('input', 'cso-qc-input'); inTitleEn.id = 'qcJobTitleEn'; inTitleEn.placeholder = 'e.g., OPSC Odisha Civil Services (OAS) Recruitment 2026';
    var inTitleOr = el('input', 'cso-qc-input'); inTitleOr.id = 'qcJobTitleOr'; inTitleOr.placeholder = '\u0B13\u0B21\u0B3C\u0B3F\u0B36\u0B3E \u0B38\u0B3F\u0B2D\u0B3F\u0B32\u0B4D \u0B38\u0B30\u0B4D\u0B2D\u0B3F\u0B38\u0B47\u0B38\u0B4D (OAS) \u0B28\u0B3F\u0B2F\u0B41\u0B15\u0B4D\u0B24\u0B3F \u0B68\u0B66\u0B68\u0B6C';
    var inSlug = el('input', 'cso-qc-input'); inSlug.id = 'qcJobSlug'; inSlug.placeholder = 'auto-generated-from-title';
    var inOrgEn = el('input', 'cso-qc-input'); inOrgEn.id = 'qcJobOrgEn'; inOrgEn.placeholder = 'e.g., OPSC / OSSC / OSSSC / NTA';
    var inOrgOr = el('input', 'cso-qc-input'); inOrgOr.id = 'qcJobOrgOr'; inOrgOr.placeholder = '\u0B13\u0B21\u0B3C\u0B3F\u0B36\u0B3E \u0B32\u0B4B\u0B15\u0B38\u0B47\u0B2C\u0B3E \u0B06\u0B5F\u0B4B\u0B17';
    var selCat = el('select', 'cso-qc-select'); selCat.id = 'qcJobCat';
    selCat.appendChild(new Option('Government (Default)', 'jtax_l1_government'));
    var selDist = el('select', 'cso-qc-select'); selDist.id = 'qcJobDist';
    ODISHA_DISTRICTS.forEach(function (d) { selDist.appendChild(new Option(d, d)); });
    var inVac = el('input', 'cso-qc-input'); inVac.id = 'qcJobVac'; inVac.type = 'number'; inVac.min = '0'; inVac.placeholder = 'e.g., 399';
    var inLastDate = el('input', 'cso-qc-input'); inLastDate.id = 'qcJobLastDate'; inLastDate.type = 'date';
    var inQual = el('input', 'cso-qc-input'); inQual.id = 'qcJobQual'; inQual.placeholder = 'e.g., Bachelor Degree in any discipline + Odia proficiency';
    var inAge = el('input', 'cso-qc-input'); inAge.id = 'qcJobAge'; inAge.placeholder = 'e.g., 21\u201338 Years (SEBC/SC/ST/Women +5 Yrs)';
    var inApplyUrl = el('input', 'cso-qc-input'); inApplyUrl.id = 'qcJobApplyUrl'; inApplyUrl.type = 'url'; inApplyUrl.placeholder = 'https://www.opsc.gov.in/';
    var taSumEn = el('textarea', 'cso-qc-textarea'); taSumEn.id = 'qcJobSumEn'; taSumEn.rows = 3; taSumEn.placeholder = 'Concise English summary (eligibility, vacancies, how to apply)\u2026';
    var taSumOr = el('textarea', 'cso-qc-textarea'); taSumOr.id = 'qcJobSumOr'; taSumOr.rows = 3; taSumOr.placeholder = '\u0B13\u0B21\u0B3C\u0B3F\u0B06\u0B30\u0B47 \u0B38\u0B02\u0B15\u0B4D\u0B37\u0B3F\u0B2A\u0B4D\u0B24 \u0B2C\u0B3F\u0B2C\u0B30\u0B23\u0B40\u2026';

    // Advanced fields
    var selStage = el('select', 'cso-qc-select'); selStage.id = 'qcJobStage';
    [['notification', 'Notification Open'], ['admit_card', 'Admit Card Out'], ['exam_date', 'Exam Date Announced'], ['answer_key', 'Answer Key Released'], ['result', 'Result Declared']].forEach(function (p) { selStage.appendChild(new Option(p[1], p[0])); });
    var inStartDate = el('input', 'cso-qc-input'); inStartDate.id = 'qcJobStartDate'; inStartDate.type = 'date'; inStartDate.value = todayIso();
    var inPay = el('input', 'cso-qc-input'); inPay.id = 'qcJobPay'; inPay.placeholder = 'e.g., ORSP Level-12 (\u20B956,100 Basic)';
    var inAdvt = el('input', 'cso-qc-input'); inAdvt.id = 'qcJobAdvt'; inAdvt.placeholder = 'e.g., Advt. No. 12 of 2026-27';
    var inPdfUrl = el('input', 'cso-qc-input'); inPdfUrl.id = 'qcJobPdfUrl'; inPdfUrl.placeholder = '/api/media/jobs-publishing/... or https://...pdf';
    var inTags = el('input', 'cso-qc-input'); inTags.id = 'qcJobTags'; inTags.placeholder = 'OPSC, OAS, Odisha Govt Jobs, 2026';
    var taBodyEn = el('textarea', 'cso-qc-textarea'); taBodyEn.id = 'qcJobBodyEn'; taBodyEn.rows = 4; taBodyEn.placeholder = 'Optional Markdown details (## Selection Process, ## Important Dates)\u2026';
    var taBodyOr = el('textarea', 'cso-qc-textarea'); taBodyOr.id = 'qcJobBodyOr'; taBodyOr.rows = 4; taBodyOr.placeholder = '\u0B13\u0B21\u0B3C\u0B3F\u0B06\u0B30\u0B47 \u0B2C\u0B3F\u0B38\u0B4D\u0B24\u0B43\u0B24 \u0B2C\u0B3F\u0B2C\u0B30\u0B23\u0B40\u2026';
    var chkFeat = el('input'); chkFeat.type = 'checkbox'; chkFeat.id = 'qcJobFeat';

    inTitleEn.addEventListener('input', function () {
      if (!slugTouched) inSlug.value = slugify(inTitleEn.value);
    });
    inSlug.addEventListener('input', function () { slugTouched = true; });

    apiFetch('/api/admin/jobs/taxonomy').then(function (d) {
      var l1 = (d && Array.isArray(d.nodes) ? d.nodes : []).filter(function (n) { return Number(n.level) === 1; });
      if (!l1.length) return;
      clear(selCat);
      l1.forEach(function (n) {
        selCat.appendChild(new Option((n.icon ? n.icon + ' ' : '') + n.title_en, n.id));
      });
    }).catch(function () {});

    var translateAllBtn = createTranslateAllBtn(function () {
      return [
        { key: 'title_or', getEn: function () { return inTitleEn.value; }, getOr: function () { return inTitleOr.value; }, targetInput: inTitleOr },
        { key: 'organisation_or', getEn: function () { return inOrgEn.value; }, getOr: function () { return inOrgOr.value; }, targetInput: inOrgOr },
        { key: 'summary_or', getEn: function () { return taSumEn.value; }, getOr: function () { return taSumOr.value; }, targetInput: taSumOr },
        { key: 'article_body_or', getEn: function () { return taBodyEn.value; }, getOr: function () { return taBodyOr.value; }, targetInput: taBodyOr }
      ];
    });

    function submitJob(publishFlag) {
      var titleEn = inTitleEn.value.trim();
      if (!titleEn) {
        statusEl.textContent = 'English Job Title is required.';
        toast('Enter an English Job Title first.', 'amber');
        inTitleEn.focus();
        return;
      }
      var slug = inSlug.value.trim() || slugify(titleEn);
      inSlug.value = slug;
      var payload = {
        title_en: titleEn,
        title_or: inTitleOr.value.trim(),
        slug: slug,
        category_l1_id: selCat.value || 'jtax_l1_government',
        organisation_en: inOrgEn.value.trim(),
        organisation_or: inOrgOr.value.trim(),
        total_vacancies: inVac.value === '' ? null : Number(inVac.value),
        qualification_summary: inQual.value.trim(),
        age_limit_summary: inAge.value.trim(),
        last_date: inLastDate.value,
        expires_at: inLastDate.value,
        application_start_date: inStartDate.value || todayIso(),
        official_apply_url: inApplyUrl.value.trim(),
        apply_url: inApplyUrl.value.trim(),
        notification_pdf_url: inPdfUrl.value.trim(),
        notification_url: inPdfUrl.value.trim(),
        location_district: selDist.value || 'All Odisha',
        region_scope: luCtrl.getScope() === 'National' ? 'central' : (selDist.value === 'Foreign / Overseas' ? 'foreign' : 'odisha'),
        lifecycle_stage: selStage.value || 'notification',
        advt_number: inAdvt.value.trim(),
        salary_pay_scale: inPay.value.trim(),
        summary_en: taSumEn.value.trim(),
        summary_or: taSumOr.value.trim(),
        article_body_en: taBodyEn.value.trim(),
        article_body_or: taBodyOr.value.trim(),
        is_featured: (chkFeat.checked || luCtrl.isPinned()) ? 1 : 0,
        is_published: publishFlag ? 1 : 0
      };
      statusEl.textContent = publishFlag ? 'Publishing Job Alert live & syncing Vectorize\u2026' : 'Saving draft to D1\u2026';
      var url = savedId ? ('/api/admin/jobs/articles/' + encodeURIComponent(savedId)) : '/api/admin/jobs/articles';
      apiFetch(url, { method: savedId ? 'PUT' : 'POST', body: payload })
        .then(function (res) {
          if (res && res.item && res.item.id) savedId = res.item.id;
          return luCtrl.syncMeta('job', savedId || slug).then(function () { return res; });
        })
        .then(function (res) {
          statusEl.textContent = publishFlag
            ? '\u2713 Published live at /jobs/?slug=' + encodeURIComponent((res.item && res.item.slug) || slug) + ' (Vectorize + Latest Updates synced)'
            : '\u2713 Draft saved to D1 (ID: ' + savedId + ')';
          toast(publishFlag ? 'Job Alert published live & synced to Ask CSOdisha!' : 'Job Alert draft saved!', 'ok');
          if (window.CSOStudio && window.CSOStudio.refreshBrandSummary) window.CSOStudio.refreshBrandSummary();
          if (publishFlag && res && res.item && window.CSOPublishTools && window.CSOPublishTools.runPublishChain) {
            window.CSOPublishTools.runPublishChain('jobs', res.item);
          }
        })
        .catch(function (err) {
          statusEl.textContent = '\u2715 ' + err.message;
          toast(err.message || 'Failed to save Job Alert.', 'crimson');
        });
    }

    var built = buildQuickShell(root, headerActions, {
      badge: '1 / 7 \u00B7 Job Alert',
      subtitle: 'Recruitment, vacancies, age/qualification, deadline & bilingual EN/\u0B13\u0B21\u0B3C\u0B3F\u0B06',
      translateAllBtn: translateAllBtn,
      fullStudioLabel: 'Open Full Jobs Studio \u2192',
      onOpenFullStudio: function () { if (window.CSOStudio && window.CSOStudio.openJobsPublishingTab) window.CSOStudio.openJobsPublishingTab('new'); },
      onSaveDraft: function () { submitJob(false); },
      onPublishNow: function () { submitJob(true); }
    });

    // AI Title, Slug & Tag Suggester
    built.shell.appendChild(renderMetaSuggester({
      kind: 'Odisha government job alert',
      getSeedText: function () { return [inTitleEn.value, inOrgEn.value, taSumEn.value].filter(Boolean).join(' \u2014 '); },
      onApplyTitlePair: function (en, or, sl) {
        inTitleEn.value = en;
        if (or) inTitleOr.value = or;
        if (sl && !slugTouched) inSlug.value = sl;
      },
      onApplySlug: function (sl) { inSlug.value = sl; slugTouched = true; },
      onApplyTag: function (t) { addTagToInput(inTags, t); },
      onApplyAllTags: function (arr) { arr.forEach(function (t) { addTagToInput(inTags, t); }); }
    }));

    // Essential Card
    var card = el('section', 'cso-qc-card');
    card.appendChild(el('h3', 'cso-qc-card-title', 'Essential Recruitment Fields'));
    var g = el('div', 'cso-qc-grid');
    g.append(
      makeField('Job Title (English) *', inTitleEn, { full: true }),
      makeField('Job Title (\u0B13\u0B21\u0B3C\u0B3F\u0B06)', inTitleOr, { full: true, actionEl: createOdiaTranslateBtn({ getSource: function () { return inTitleEn.value; }, targetInput: inTitleOr }) }),
      makeField('URL Slug (Auto)', inSlug),
      makeField('Sector / Category', selCat),
      makeField('District / Region', selDist),
      makeField('Organisation / Board (EN)', inOrgEn),
      makeField('Organisation (\u0B13\u0B21\u0B3C\u0B3F\u0B06)', inOrgOr, { actionEl: createOdiaTranslateBtn({ getSource: function () { return inOrgEn.value; }, targetInput: inOrgOr }) }),
      makeField('Total Vacancies', inVac),
      makeField('Last Date to Apply', inLastDate),
      makeField('Official Apply URL', inApplyUrl),
      makeField('Qualification Summary', inQual),
      makeField('Age Limit Summary', inAge),
      makeField('Key Summary (English)', taSumEn, { full: true }),
      makeField('Key Summary (\u0B13\u0B21\u0B3C\u0B3F\u0B06)', taSumOr, { full: true, actionEl: createOdiaTranslateBtn({ getSource: function () { return taSumEn.value; }, targetInput: taSumOr }) })
    );
    var luCtrl = createLatestUpdatesControls({ pinId: 'qcJobLuPin', scopeId: 'qcJobLuScope', defaultScope: 'Odisha' });
    selDist.addEventListener('change', function () {
      if (selDist.value === 'All India') luCtrl.setScope('National');
      else luCtrl.setScope('Odisha');
    });
    card.appendChild(g);
    card.appendChild(luCtrl.node);
    built.shell.appendChild(card);

    // Collapsible Advanced Accordion
    var adv = buildAdvAccordion('Advanced SEO, Official PDF Upload, Lifecycle & Detailed Body', built.quickToggle);
    if (built.quickToggle) {
      built.quickToggle.node.addEventListener('click', function () { adv.details.open = !built.quickToggle.isOn(); });
    }
    var advGrid = el('div', 'cso-qc-grid');
    var pdfUpload = el('input', 'cso-qc-input'); pdfUpload.type = 'file'; pdfUpload.accept = 'application/pdf';
    pdfUpload.addEventListener('change', function () {
      var f = pdfUpload.files && pdfUpload.files[0];
      if (!f) return;
      var fd = new FormData(); fd.append('file', f); fd.append('purpose', 'notification-pdf');
      toast('Uploading notification PDF to R2\u2026', 'info');
      apiFetch('/api/admin/jobs/upload', { method: 'POST', body: fd }).then(function (r) {
        if (r && r.url) inPdfUrl.value = r.url;
        if (r && r.extracted_draft) {
          var ex = r.extracted_draft;
          if (ex.advt_number && !inAdvt.value) inAdvt.value = ex.advt_number;
          if (ex.total_vacancies && !inVac.value) inVac.value = String(ex.total_vacancies);
          if (ex.last_date && !inLastDate.value) inLastDate.value = ex.last_date;
          if (ex.official_apply_url && !inApplyUrl.value) inApplyUrl.value = ex.official_apply_url;
        }
        toast('Notification PDF uploaded to R2!', 'ok');
      }).catch(function (e) { toast(e.message || 'Upload failed.', 'crimson'); });
    });
    advGrid.append(
      makeField('Lifecycle Stage', selStage),
      makeField('Application Start Date', inStartDate),
      makeField('Advt. / Notification No.', inAdvt),
      makeField('Pay Scale / Salary', inPay),
      makeField('Tags (Comma-separated)', inTags),
      makeField('Notification PDF URL (R2)', inPdfUrl),
      makeField('Upload Notification PDF to R2', pdfUpload),
      makeField('Detailed Body (English Markdown)', taBodyEn, { full: true }),
      makeField('Detailed Body (\u0B13\u0B21\u0B3C\u0B3F\u0B06 Markdown)', taBodyOr, { full: true, actionEl: createOdiaTranslateBtn({ getSource: function () { return taBodyEn.value; }, targetInput: taBodyOr }) })
    );
    var featLbl = el('label', 'cso-qc-check');
    featLbl.append(chkFeat, el('span', '', 'Feature this Job Alert at top of /jobs/'));
    adv.body.append(advGrid, featLbl);
    built.shell.appendChild(adv.details);

    // Footer Actions
    var foot = el('div', 'cso-qc-footer');
    var btnDraft = el('button', 'cso-qc-btn', 'Save Draft'); btnDraft.type = 'button';
    btnDraft.addEventListener('click', function () { submitJob(false); });
    var btnPub = el('button', 'cso-qc-btn cso-qc-btn--primary', 'Publish Now \u2192'); btnPub.type = 'button';
    btnPub.addEventListener('click', function () { submitJob(true); });
    foot.append(btnDraft, btnPub, statusEl);
    built.shell.appendChild(foot);
    inTitleEn.focus();
  }

  // =========================================================================
  // WORKFLOW 2: CAREER ROADMAP (careers/new)
  // =========================================================================
  function renderQuickCareerRoadmap(root, headerActions) {
    var savedId = '';
    var slugTouched = false;
    var prepLinks = [{ label: 'Official Exam Portal', url: '' }];
    var statusEl = el('span', 'cso-qc-status');
    statusEl.setAttribute('role', 'status');

    var inTitleEn = el('input', 'cso-qc-input'); inTitleEn.id = 'qcCarTitleEn'; inTitleEn.placeholder = 'e.g., Odisha Administrative Service (OAS) Career Roadmap';
    var inTitleOr = el('input', 'cso-qc-input'); inTitleOr.id = 'qcCarTitleOr'; inTitleOr.placeholder = '\u0B13\u0B21\u0B3C\u0B3F\u0B36\u0B3E \u0B2A\u0B4D\u0B30\u0B36\u0B3E\u0B38\u0B28\u0B3F\u0B15 \u0B38\u0B47\u0B2C\u0B3E (OAS) \u0B15\u0B4D\u0B5F\u0B3E\u0B30\u0B3F\u0B5F\u0B30\u0B4D \u0B2E\u0B3E\u0B30\u0B4D\u0B17\u0B26\u0B30\u0B4D\u0B36\u0B3F\u0B15\u0B3E';
    var inSlug = el('input', 'cso-qc-input'); inSlug.id = 'qcCarSlug'; inSlug.placeholder = 'auto-generated-from-title';
    var selTrack = el('select', 'cso-qc-select'); selTrack.id = 'qcCarTrack';
    [['civil-services', 'Civil Services'], ['engineering-it', 'Engineering & IT'], ['banking-finance', 'Banking & Finance'], ['healthcare', 'Healthcare'], ['agriculture', 'Agriculture'], ['pathways', 'Post-10th/12th Pathways']].forEach(function (p) { selTrack.appendChild(new Option(p[1], p[0])); });
    var selRegion = el('select', 'cso-qc-select'); selRegion.id = 'qcCarRegion';
    [['odisha', 'Odisha State'], ['national', 'All India / Central'], ['international', 'International']].forEach(function (p) { selRegion.appendChild(new Option(p[1], p[0])); });
    var selStage = el('select', 'cso-qc-select'); selStage.id = 'qcCarStage';
    [['graduate', 'Graduate'], ['after-12th', 'After 12th / +2'], ['after-10th', 'After 10th'], ['postgraduate', 'Post Graduate'], ['working-pro', 'Working Professional']].forEach(function (p) { selStage.appendChild(new Option(p[1], p[0])); });
    var inElig = el('input', 'cso-qc-input'); inElig.id = 'qcCarElig'; inElig.placeholder = 'e.g., Bachelor Degree in any stream, Age 21\u201338 yrs';
    var inPay = el('input', 'cso-qc-input'); inPay.id = 'qcCarPay'; inPay.placeholder = 'e.g., ORSP Level-12 (\u20B956,100 \u2013 \u20B91,77,500)';
    var inStages = el('input', 'cso-qc-input'); inStages.id = 'qcCarExams'; inStages.placeholder = 'e.g., OPSC OCS Prelims \u2192 Mains \u2192 Viva-Voce';
    var taSumEn = el('textarea', 'cso-qc-textarea'); taSumEn.id = 'qcCarSumEn'; taSumEn.rows = 3; taSumEn.placeholder = 'Concise career overview in English\u2026';
    var taSumOr = el('textarea', 'cso-qc-textarea'); taSumOr.id = 'qcCarSumOr'; taSumOr.rows = 3; taSumOr.placeholder = '\u0B13\u0B21\u0B3C\u0B3F\u0B06\u0B30\u0B47 \u0B38\u0B02\u0B15\u0B4D\u0B37\u0B3F\u0B2A\u0B4D\u0B24 \u0B2C\u0B3F\u0B2C\u0B30\u0B23\u0B40\u2026';
    var taBodyEn = el('textarea', 'cso-qc-textarea'); taBodyEn.id = 'qcCarBodyEn'; taBodyEn.rows = 5; taBodyEn.placeholder = '### Step 1: Eligibility\n### Step 2: Selection Stages\n### Step 3: Preparation & Promotion Path';
    var taBodyOr = el('textarea', 'cso-qc-textarea'); taBodyOr.id = 'qcCarBodyOr'; taBodyOr.rows = 5; taBodyOr.placeholder = '### \u0B2A\u0B30\u0B4D\u0B2F\u0B4D\u0B5F\u0B3E\u0B5F \u0B67: \u0B2F\u0B4B\u0B17\u0B4D\u0B5F\u0B24\u0B3E\u2026';
    var inTags = el('input', 'cso-qc-input'); inTags.id = 'qcCarTags'; inTags.placeholder = 'OPSC, Civil Services, Odisha Career';
    var chkFeat = el('input'); chkFeat.type = 'checkbox'; chkFeat.id = 'qcCarFeat';

    inTitleEn.addEventListener('input', function () {
      if (!slugTouched) inSlug.value = slugify(inTitleEn.value);
    });
    inSlug.addEventListener('input', function () { slugTouched = true; });

    apiFetch('/api/admin/careers').then(function (d) {
      if (d && d.taxonomy && Array.isArray(d.taxonomy.tracks) && d.taxonomy.tracks.length) {
        clear(selTrack);
        d.taxonomy.tracks.forEach(function (t) { selTrack.appendChild(new Option(t.label_en, t.slug)); });
      }
    }).catch(function () {});

    var translateAllBtn = createTranslateAllBtn(function () {
      return [
        { key: 'title_or', getEn: function () { return inTitleEn.value; }, getOr: function () { return inTitleOr.value; }, targetInput: inTitleOr },
        { key: 'summary_or', getEn: function () { return taSumEn.value; }, getOr: function () { return taSumOr.value; }, targetInput: taSumOr },
        { key: 'roadmap_body_or', getEn: function () { return taBodyEn.value; }, getOr: function () { return taBodyOr.value; }, targetInput: taBodyOr }
      ];
    });

    function submitCareer(statusVal) {
      var titleEn = inTitleEn.value.trim();
      if (!titleEn) {
        statusEl.textContent = 'English Roadmap Title is required.';
        toast('Enter an English Career Roadmap Title first.', 'amber');
        inTitleEn.focus();
        return;
      }
      var slug = inSlug.value.trim() || slugify(titleEn);
      inSlug.value = slug;
      var payload = {
        id: savedId || undefined,
        title_en: titleEn,
        title_or: inTitleOr.value.trim(),
        slug: slug,
        track_slug: selTrack.value || 'civil-services',
        region_scope: selRegion.value || 'odisha',
        career_stage: selStage.value || 'graduate',
        eligibility_summary: inElig.value.trim(),
        salary_band: inPay.value.trim(),
        key_exams: inStages.value.trim(),
        summary_en: taSumEn.value.trim(),
        summary_or: taSumOr.value.trim(),
        roadmap_body_en: taBodyEn.value.trim(),
        roadmap_body_or: taBodyOr.value.trim(),
        official_links: prepLinks.filter(function (l) { return l.url && l.url.trim(); }),
        status: statusVal,
        featured: (chkFeat.checked || luCtrl.isPinned()) ? 1 : 0
      };
      statusEl.textContent = statusVal === 'published' ? 'Publishing Career Roadmap live & syncing Vectorize\u2026' : 'Saving draft to D1\u2026';
      apiFetch('/api/admin/careers', { method: 'POST', body: payload })
        .then(function (res) {
          if (res && res.item && res.item.id) savedId = res.item.id;
          return luCtrl.syncMeta('career', savedId || slug).then(function () { return res; });
        })
        .then(function (res) {
          statusEl.textContent = statusVal === 'published'
            ? '\u2713 Published live at /careers/?slug=' + encodeURIComponent((res.item && res.item.slug) || slug) + ' (Vectorize + Latest Updates synced)'
            : '\u2713 Career draft saved to D1 (ID: ' + savedId + ')';
          toast(statusVal === 'published' ? 'Career Roadmap published live & synced to Ask CSOdisha!' : 'Career Roadmap draft saved!', 'ok');
          if (window.CSOStudio && window.CSOStudio.refreshBrandSummary) window.CSOStudio.refreshBrandSummary();
          if (statusVal === 'published' && res && res.item && window.CSOPublishTools && window.CSOPublishTools.runPublishChain) {
            window.CSOPublishTools.runPublishChain('careers', res.item);
          }
        })
        .catch(function (err) {
          statusEl.textContent = '\u2715 ' + err.message;
          toast(err.message || 'Failed to save Career Roadmap.', 'crimson');
        });
    }

    var built = buildQuickShell(root, headerActions, {
      badge: '2 / 7 \u00B7 Career Roadmap',
      subtitle: 'Bilingual pathway, eligibility, selection stages, pay band & prep links',
      translateAllBtn: translateAllBtn,
      fullStudioLabel: 'Open Full Careers Studio \u2192',
      onOpenFullStudio: function () { if (window.CSOStudio && window.CSOStudio.openCareersPublishingTab) window.CSOStudio.openCareersPublishingTab('new'); },
      onSaveDraft: function () { submitCareer('draft'); },
      onPublishNow: function () { submitCareer('published'); }
    });

    built.shell.appendChild(renderMetaSuggester({
      kind: 'Odisha career roadmap',
      getSeedText: function () { return [inTitleEn.value, inStages.value, taSumEn.value].filter(Boolean).join(' \u2014 '); },
      onApplyTitlePair: function (en, or, sl) {
        inTitleEn.value = en;
        if (or) inTitleOr.value = or;
        if (sl && !slugTouched) inSlug.value = sl;
      },
      onApplySlug: function (sl) { inSlug.value = sl; slugTouched = true; },
      onApplyTag: function (t) { addTagToInput(inTags, t); },
      onApplyAllTags: function (arr) { arr.forEach(function (t) { addTagToInput(inTags, t); }); }
    }));

    var card = el('section', 'cso-qc-card');
    card.appendChild(el('h3', 'cso-qc-card-title', 'Essential Career Pathway Fields'));
    var g = el('div', 'cso-qc-grid');
    g.append(
      makeField('Career Roadmap Title (English) *', inTitleEn, { full: true }),
      makeField('Title (\u0B13\u0B21\u0B3C\u0B3F\u0B06)', inTitleOr, { full: true, actionEl: createOdiaTranslateBtn({ getSource: function () { return inTitleEn.value; }, targetInput: inTitleOr }) }),
      makeField('URL Slug (Auto)', inSlug),
      makeField('Career Track', selTrack),
      makeField('Region Scope', selRegion),
      makeField('Career Stage', selStage),
      makeField('Eligibility Summary', inElig),
      makeField('Pay Band / Salary Range', inPay),
      makeField('Selection Stages / Key Exams', inStages, { full: true }),
      makeField('Key Summary (English)', taSumEn, { full: true }),
      makeField('Key Summary (\u0B13\u0B21\u0B3C\u0B3F\u0B06)', taSumOr, { full: true, actionEl: createOdiaTranslateBtn({ getSource: function () { return taSumEn.value; }, targetInput: taSumOr }) }),
      makeField('Bilingual Pathway & Steps (English Markdown)', taBodyEn, { full: true }),
      makeField('Bilingual Pathway & Steps (\u0B13\u0B21\u0B3C\u0B3F\u0B06 Markdown)', taBodyOr, { full: true, actionEl: createOdiaTranslateBtn({ getSource: function () { return taBodyEn.value; }, targetInput: taBodyOr }) })
    );
    card.appendChild(g);

    // Prep & Official Links Repeater
    var linksWrap = el('div', 'cso-qc-subbox');
    var linksHead = el('div', 'cso-qc-label-row');
    linksHead.appendChild(el('strong', 'cso-qc-label', 'Prep & Official Portal Links'));
    var addLinkBtn = el('button', 'cso-ai-tr-btn', '+ Add Link');
    addLinkBtn.type = 'button';
    linksHead.appendChild(addLinkBtn);
    var linksList = el('div', 'cso-qc-repeater');
    function drawLinks() {
      clear(linksList);
      prepLinks.forEach(function (lk, idx) {
        var row = el('div', 'cso-qc-link-row');
        var lLbl = el('input', 'cso-qc-input'); lLbl.placeholder = 'Link Label (e.g., OPSC Syllabus)'; lLbl.value = lk.label || '';
        lLbl.addEventListener('input', function () { lk.label = lLbl.value; });
        var lUrl = el('input', 'cso-qc-input'); lUrl.type = 'url'; lUrl.placeholder = '/study-library/ or https://www.opsc.gov.in/'; lUrl.value = lk.url || '';
        lUrl.addEventListener('input', function () { lk.url = lUrl.value; });
        var rm = el('button', 'cso-qc-btn cso-qc-btn--danger', '\u00D7'); rm.type = 'button';
        rm.addEventListener('click', function () { prepLinks.splice(idx, 1); drawLinks(); });
        row.append(lLbl, lUrl, rm);
        linksList.appendChild(row);
      });
    }
    addLinkBtn.addEventListener('click', function () { prepLinks.push({ label: '', url: '' }); drawLinks(); });
    drawLinks();
    var luCtrl = createLatestUpdatesControls({ pinId: 'qcCarLuPin', scopeId: 'qcCarLuScope', defaultScope: 'Odisha' });
    selRegion.addEventListener('change', function () {
      luCtrl.setScope(selRegion.value === 'odisha' ? 'Odisha' : 'National');
    });
    linksWrap.append(linksHead, linksList);
    card.appendChild(linksWrap);
    card.appendChild(luCtrl.node);
    built.shell.appendChild(card);

    var adv = buildAdvAccordion('Advanced SEO Tags & Highlight Settings', built.quickToggle);
    if (built.quickToggle) {
      built.quickToggle.node.addEventListener('click', function () { adv.details.open = !built.quickToggle.isOn(); });
    }
    var featLbl = el('label', 'cso-qc-check');
    featLbl.append(chkFeat, el('span', '', 'Feature this Career Roadmap on /careers/'));
    adv.body.append(makeField('SEO Tags (Comma-separated)', inTags), featLbl);
    built.shell.appendChild(adv.details);

    var foot = el('div', 'cso-qc-footer');
    var btnDraft = el('button', 'cso-qc-btn', 'Save Draft'); btnDraft.type = 'button';
    btnDraft.addEventListener('click', function () { submitCareer('draft'); });
    var btnPub = el('button', 'cso-qc-btn cso-qc-btn--primary', 'Publish Now \u2192'); btnPub.type = 'button';
    btnPub.addEventListener('click', function () { submitCareer('published'); });
    foot.append(btnDraft, btnPub, statusEl);
    built.shell.appendChild(foot);
    inTitleEn.focus();
  }

  // =========================================================================
  // WORKFLOW 3: CURRENT AFFAIRS POST (current-affairs/new)
  // =========================================================================
  function renderQuickCurrentAffairs(root, headerActions) {
    var editingId = '';
    var slugTouched = false;
    var mcqs = [];
    var statusEl = el('span', 'cso-qc-status');
    statusEl.setAttribute('role', 'status');

    var inDate = el('input', 'cso-qc-input'); inDate.id = 'qcCaDate'; inDate.type = 'date'; inDate.value = todayIso();
    var selCat = el('select', 'cso-qc-select'); selCat.id = 'qcCaCat';
    CA_CATEGORIES.forEach(function (c) { selCat.appendChild(new Option(c, c)); });
    var inTitleEn = el('input', 'cso-qc-input'); inTitleEn.id = 'qcCaTitleEn'; inTitleEn.placeholder = 'e.g., Odisha Cabinet Approves Rural Connectivity & Irrigation Mission';
    var inTitleOr = el('input', 'cso-qc-input'); inTitleOr.id = 'qcCaTitleOr'; inTitleOr.placeholder = '\u0B13\u0B21\u0B3C\u0B3F\u0B36\u0B3E \u0B15\u0B4D\u0B5F\u0B3E\u0B2C\u0B3F\u0B28\u0B47\u0B1F\u0B4D \u0B17\u0B4D\u0B30\u0B3E\u0B2E\u0B40\u0B23 \u0B38\u0B02\u0B2F\u0B4B\u0B17\u0B40\u0B15\u0B30\u0B23 \u0B2E\u0B3F\u0B36\u0B28\u0B15\u0B41 \u0B05\u0B28\u0B41\u0B2E\u0B4B\u0B26\u0B28 \u0B15\u0B32\u0B47';
    var inSlug = el('input', 'cso-qc-input'); inSlug.id = 'qcCaSlug'; inSlug.placeholder = 'auto-generated-from-title';
    var taSumEn = el('textarea', 'cso-qc-textarea'); taSumEn.id = 'qcCaSumEn'; taSumEn.rows = 2; taSumEn.placeholder = 'Quick 1\u20132 sentence exam-focused summary in English\u2026';
    var taSumOr = el('textarea', 'cso-qc-textarea'); taSumOr.id = 'qcCaSumOr'; taSumOr.rows = 2; taSumOr.placeholder = '\u0B13\u0B21\u0B3C\u0B3F\u0B06\u0B30\u0B47 \u0B38\u0B02\u0B15\u0B4D\u0B37\u0B3F\u0B2A\u0B4D\u0B24 \u0B38\u0B3E\u0B30\u0B3E\u0B02\u0B36\u2026';
    var taHlEn = el('textarea', 'cso-qc-textarea'); taHlEn.id = 'qcCaHlEn'; taHlEn.rows = 4; taHlEn.placeholder = 'Bullet highlight 1 (one per line)\nBullet highlight 2\nBullet highlight 3';
    var taHlOr = el('textarea', 'cso-qc-textarea'); taHlOr.id = 'qcCaHlOr'; taHlOr.rows = 4; taHlOr.placeholder = '\u0B2E\u0B41\u0B16\u0B4D\u0B5F \u0B24\u0B25\u0B4D\u0B5F \u0B67\n\u0B2E\u0B41\u0B16\u0B4D\u0B5F \u0B24\u0B25\u0B4D\u0B5F \u0B68';
    var inTags = el('input', 'cso-qc-input'); inTags.id = 'qcCaTags'; inTags.placeholder = 'Odisha Current Affairs, OPSC Prelims, Daily GK';

    inTitleEn.addEventListener('input', function () {
      if (!slugTouched) inSlug.value = slugify(inTitleEn.value);
    });
    inSlug.addEventListener('input', function () { slugTouched = true; });

    var mcqListHost = el('div', 'cso-qc-repeater');
    function drawMcqs() {
      clear(mcqListHost);
      if (!mcqs.length) {
        mcqListHost.appendChild(el('p', 'cso-qc-hint', 'No practice MCQs attached yet. Click "+ Add Practice MCQ" or use AI to generate 3\u20135 exam MCQs.'));
        return;
      }
      mcqs.forEach(function (q, idx) {
        var row = el('div', 'cso-qc-mcq-card');
        var head = el('div', 'cso-qc-label-row');
        head.appendChild(el('strong', '', 'Practice MCQ #' + (idx + 1)));
        var rm = el('button', 'cso-qc-btn cso-qc-btn--danger', 'Remove'); rm.type = 'button';
        rm.addEventListener('click', function () { mcqs.splice(idx, 1); drawMcqs(); });
        head.appendChild(rm);
        row.appendChild(head);

        var qEn = el('input', 'cso-qc-input'); qEn.placeholder = 'Question (English)'; qEn.value = q.question_en || '';
        qEn.addEventListener('input', function () { q.question_en = qEn.value; });
        var qOr = el('input', 'cso-qc-input'); qOr.placeholder = '\u0B2A\u0B4D\u0B30\u0B36\u0B4D\u0B28 (\u0B13\u0B21\u0B3C\u0B3F\u0B06)'; qOr.value = q.question_or || '';
        qOr.addEventListener('input', function () { q.question_or = qOr.value; });

        var gq = el('div', 'cso-qc-grid');
        gq.append(
          makeField('Question (EN)', qEn, { full: true }),
          makeField('Question (\u0B13\u0B21\u0B3C\u0B3F\u0B06)', qOr, { full: true, actionEl: createOdiaTranslateBtn({ getSource: function () { return qEn.value; }, targetInput: qOr }) })
        );
        ['A', 'B', 'C', 'D'].forEach(function (ltr, oi) {
          var oiInp = el('input', 'cso-qc-input'); oiInp.placeholder = 'Option ' + ltr;
          oiInp.value = (q.options_en && q.options_en[oi]) || '';
          oiInp.addEventListener('input', function () {
            if (!Array.isArray(q.options_en)) q.options_en = ['', '', '', ''];
            q.options_en[oi] = oiInp.value;
          });
          gq.appendChild(makeField('Option ' + ltr, oiInp));
        });
        var selAns = el('select', 'cso-qc-select');
        [['0', 'Option A'], ['1', 'Option B'], ['2', 'Option C'], ['3', 'Option D']].forEach(function (p) { selAns.appendChild(new Option(p[1], p[0])); });
        selAns.value = String(q.answer_index || 0);
        selAns.addEventListener('change', function () { q.answer_index = Number(selAns.value); });
        var expInp = el('input', 'cso-qc-input'); expInp.placeholder = 'Brief rationale (optional)'; expInp.value = q.explanation_en || '';
        expInp.addEventListener('input', function () { q.explanation_en = expInp.value; });
        gq.append(makeField('Correct Option', selAns), makeField('Explanation', expInp));
        row.appendChild(gq);
        mcqListHost.appendChild(row);
      });
    }

    var translateAllBtn = createTranslateAllBtn(function () {
      var list = [
        { key: 'title_or', getEn: function () { return inTitleEn.value; }, getOr: function () { return inTitleOr.value; }, targetInput: inTitleOr },
        { key: 'summary_or', getEn: function () { return taSumEn.value; }, getOr: function () { return taSumOr.value; }, targetInput: taSumOr },
        { key: 'highlights_or', getEn: function () { return taHlEn.value; }, getOr: function () { return taHlOr.value; }, targetInput: taHlOr }
      ];
      mcqs.forEach(function (q, i) {
        if (q.question_en && !q.question_or) {
          list.push({
            key: 'mcq_q_' + i,
            getEn: function () { return q.question_en; },
            getOr: function () { return q.question_or; },
            setOr: function (v) { q.question_or = v; drawMcqs(); }
          });
        }
      });
      return list;
    });

    var feedHost = el('div', 'cso-qc-feed');
    function loadCaFeed() {
      clear(feedHost);
      feedHost.appendChild(el('p', 'cso-qc-hint', 'Loading published & draft Current Affairs capsules from D1\u2026'));
      apiFetch('/api/admin/current-affairs').then(function (d) {
        clear(feedHost);
        var items = (d && Array.isArray(d.items)) ? d.items : [];
        if (!items.length) {
          feedHost.appendChild(el('p', 'cso-qc-hint', 'No Current Affairs posts yet. Publish your first daily capsule above.'));
          return;
        }
        items.slice(0, 15).forEach(function (it) {
          var row = el('div', 'cso-qc-list-row');
          var info = el('div', 'cso-qc-list-info');
          info.appendChild(el('strong', '', it.title_en));
          if (it.title_or) info.appendChild(el('div', 'cso-qc-hint', it.title_or));
          info.appendChild(el('div', 'cso-qc-hint', [it.capsule_date, it.category, String(it.status || 'published').toUpperCase(), (it.quiz ? it.quiz.length : 0) + ' MCQ(s)'].join(' \u00B7 ')));
          var acts = el('div', 'cso-qc-list-acts');
          var bEd = el('button', 'cso-qc-btn', 'Edit'); bEd.type = 'button';
          bEd.addEventListener('click', function () {
            editingId = it.id;
            inDate.value = it.capsule_date || todayIso();
            selCat.value = it.category || 'Odisha State';
            inTitleEn.value = it.title_en || '';
            inTitleOr.value = it.title_or || '';
            inSlug.value = it.id || '';
            slugTouched = true;
            var hEn = Array.isArray(it.highlights_en) ? it.highlights_en : [];
            var hOr = Array.isArray(it.highlights_or) ? it.highlights_or : [];
            taSumEn.value = hEn[0] || '';
            taHlEn.value = hEn.slice(1).join('\n');
            taSumOr.value = hOr[0] || '';
            taHlOr.value = hOr.slice(1).join('\n');
            mcqs = Array.isArray(it.quiz) ? it.quiz.map(function (q) { return Object.assign({}, q); }) : [];
            drawMcqs();
            statusEl.textContent = 'Editing capsule: ' + it.id;
            inTitleEn.focus();
          });
          var bDel = el('button', 'cso-qc-btn cso-qc-btn--danger', 'Delete'); bDel.type = 'button';
          bDel.addEventListener('click', function () {
            if (!window.confirm('Delete "' + it.title_en + '"?')) return;
            apiFetch('/api/admin/current-affairs/' + encodeURIComponent(it.id), { method: 'DELETE' })
              .then(function () { toast('Capsule deleted & removed from Vectorize.', 'ok'); loadCaFeed(); })
              .catch(function (e) { toast(e.message, 'crimson'); });
          });
          acts.append(bEd, bDel);
          row.append(info, acts);
          feedHost.appendChild(row);
        });
      }).catch(function (err) {
        clear(feedHost);
        feedHost.appendChild(el('p', 'cso-qc-hint', 'Failed to load capsules: ' + err.message));
      });
    }

    function submitCa(statusVal) {
      var titleEn = inTitleEn.value.trim();
      if (!titleEn) {
        statusEl.textContent = 'English Title is required.';
        toast('Enter an English Current Affairs title first.', 'amber');
        inTitleEn.focus();
        return;
      }
      var slug = inSlug.value.trim() || slugify(titleEn);
      inSlug.value = slug;
      var payload = {
        id: editingId || undefined,
        slug: slug,
        capsule_date: inDate.value || todayIso(),
        category: selCat.value || 'Odisha State',
        title_en: titleEn,
        title_or: inTitleOr.value.trim(),
        summary_en: taSumEn.value.trim(),
        summary_or: taSumOr.value.trim(),
        highlights_en: taHlEn.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean),
        highlights_or: taHlOr.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean),
        quiz: mcqs.filter(function (q) { return q.question_en && q.question_en.trim(); }).slice(0, 5),
        status: statusVal
      };
      statusEl.textContent = statusVal === 'published' ? 'Publishing Current Affairs post & syncing Vectorize\u2026' : 'Saving draft to D1\u2026';
      apiFetch('/api/admin/current-affairs', { method: 'POST', body: payload })
        .then(function (res) {
          editingId = (res && res.item && res.item.id) || '';
          return luCtrl.syncMeta('current_affairs', editingId).then(function () { return res; });
        })
        .then(function () {
          statusEl.textContent = statusVal === 'published'
            ? '\u2713 Published Current Affairs capsule (' + editingId + ') & synced to Latest Updates + Ask CSOdisha!'
            : '\u2713 Saved draft (' + editingId + ')';
          toast(statusVal === 'published' ? 'Current Affairs post published live!' : 'Current Affairs draft saved!', 'ok');
          if (statusVal === 'published') {
            editingId = '';
            slugTouched = false;
            inTitleEn.value = ''; inTitleOr.value = ''; inSlug.value = '';
            taSumEn.value = ''; taSumOr.value = ''; taHlEn.value = ''; taHlOr.value = '';
            mcqs = [];
            drawMcqs();
          }
          loadCaFeed();
        })
        .catch(function (err) {
          statusEl.textContent = '\u2715 ' + err.message;
          toast(err.message || 'Save failed.', 'crimson');
        });
    }

    var built = buildQuickShell(root, headerActions, {
      badge: '3 / 7 \u00B7 Current Affairs Post',
      subtitle: 'Date, Odisha/National/Exam category, highlights, optional 3\u20135 MCQs & bilingual EN/\u0B13\u0B21\u0B3C\u0B3F\u0B06',
      translateAllBtn: translateAllBtn,
      onSaveDraft: function () { submitCa('draft'); },
      onPublishNow: function () { submitCa('published'); }
    });

    built.shell.appendChild(renderMetaSuggester({
      kind: 'Odisha daily current affairs brief',
      getSeedText: function () { return [inTitleEn.value, taSumEn.value, taHlEn.value].filter(Boolean).join(' \u2014 '); },
      onApplyTitlePair: function (en, or, sl) {
        inTitleEn.value = en;
        if (or) inTitleOr.value = or;
        if (sl && !slugTouched) inSlug.value = sl;
      },
      onApplySlug: function (sl) { inSlug.value = sl; slugTouched = true; },
      onApplyTag: function (t) { addTagToInput(inTags, t); },
      onApplyAllTags: function (arr) { arr.forEach(function (t) { addTagToInput(inTags, t); }); }
    }));

    var card = el('section', 'cso-qc-card');
    card.appendChild(el('h3', 'cso-qc-card-title', 'Daily Current Affairs Essentials'));
    var g = el('div', 'cso-qc-grid');
    g.append(
      makeField('Date (YYYY-MM-DD) *', inDate),
      makeField('Category *', selCat),
      makeField('URL Slug (Auto)', inSlug),
      makeField('Title (English) *', inTitleEn, { full: true }),
      makeField('Title (\u0B13\u0B21\u0B3C\u0B3F\u0B06)', inTitleOr, { full: true, actionEl: createOdiaTranslateBtn({ getSource: function () { return inTitleEn.value; }, targetInput: inTitleOr }) }),
      makeField('Quick Summary (English)', taSumEn, { full: true }),
      makeField('Quick Summary (\u0B13\u0B21\u0B3C\u0B3F\u0B06)', taSumOr, { full: true, actionEl: createOdiaTranslateBtn({ getSource: function () { return taSumEn.value; }, targetInput: taSumOr }) }),
      makeField('Bullet Highlights (English, 1 per line)', taHlEn),
      makeField('Bullet Highlights (\u0B13\u0B21\u0B3C\u0B3F\u0B06, 1 per line)', taHlOr, { actionEl: createOdiaTranslateBtn({ getSource: function () { return taHlEn.value; }, targetInput: taHlOr }) })
    );
    var luCtrl = createLatestUpdatesControls({ pinId: 'qcCaLuPin', scopeId: 'qcCaLuScope', defaultScope: 'Odisha' });
    selCat.addEventListener('change', function () {
      luCtrl.setScope(/national|international|india|central/i.test(selCat.value) ? 'National' : 'Odisha');
    });
    card.appendChild(g);
    card.appendChild(luCtrl.node);
    built.shell.appendChild(card);

    var adv = buildAdvAccordion('Optional 3\u20135 Practice MCQs & SEO Tags', built.quickToggle);
    if (built.quickToggle) {
      built.quickToggle.node.addEventListener('click', function () { adv.details.open = !built.quickToggle.isOn(); });
    }
    var mcqTools = el('div', 'cso-qc-top-actions');
    var addMcqBtn = el('button', 'cso-qc-btn', '+ Add Practice MCQ'); addMcqBtn.type = 'button';
    addMcqBtn.addEventListener('click', function () {
      if (mcqs.length >= 5) { toast('Maximum 5 practice MCQs per capsule.', 'amber'); return; }
      mcqs.push({ question_en: '', question_or: '', options_en: ['', '', '', ''], answer_index: 0, explanation_en: '' });
      drawMcqs();
    });
    var aiMcqBtn = el('button', 'cso-qc-btn cso-qc-btn--primary', '\u2728 AI Generate 5 MCQs from Brief'); aiMcqBtn.type = 'button';
    aiMcqBtn.addEventListener('click', function () {
      var seed = [inTitleEn.value, taSumEn.value, taHlEn.value].filter(Boolean).join('\n');
      if (seed.length < 8) { toast('Enter a title or highlights first.', 'amber'); return; }
      aiMcqBtn.disabled = true; aiMcqBtn.textContent = 'Generating MCQs\u2026';
      apiFetch('/api/admin/ai-coauthor', { method: 'POST', body: { mode: 'mcq', input: seed } })
        .then(function (r) {
          var qs = (r && r.data && Array.isArray(r.data.questions)) ? r.data.questions : [];
          mcqs = qs.slice(0, 5).map(function (q) {
            return {
              question_en: q.question_en || '',
              question_or: q.question_or || '',
              options_en: Array.isArray(q.options_en) ? q.options_en.slice(0, 4) : ['', '', '', ''],
              answer_index: Number(q.correct_index) || 0,
              explanation_en: q.explanation_en || ''
            };
          });
          adv.details.open = true;
          drawMcqs();
          toast('Generated ' + mcqs.length + ' practice MCQ(s)!', 'ok');
        })
        .catch(function (e) { toast(e.message || 'MCQ generation failed.', 'crimson'); })
        .finally(function () { aiMcqBtn.disabled = false; aiMcqBtn.textContent = '\u2728 AI Generate 5 MCQs from Brief'; });
    });
    mcqTools.append(addMcqBtn, aiMcqBtn);
    drawMcqs();
    adv.body.append(makeField('Tags (Comma-separated)', inTags), mcqTools, mcqListHost);
    built.shell.appendChild(adv.details);

    var foot = el('div', 'cso-qc-footer');
    var btnDraft = el('button', 'cso-qc-btn', 'Save Draft'); btnDraft.type = 'button';
    btnDraft.addEventListener('click', function () { submitCa('draft'); });
    var btnPub = el('button', 'cso-qc-btn cso-qc-btn--primary', 'Publish Now \u2192'); btnPub.type = 'button';
    btnPub.addEventListener('click', function () { submitCa('published'); });
    foot.append(btnDraft, btnPub, statusEl);
    built.shell.appendChild(foot);

    var feedCard = el('section', 'cso-qc-card');
    feedCard.appendChild(el('h3', 'cso-qc-card-title', 'Recent Current Affairs Capsules (Live D1)'));
    feedCard.appendChild(feedHost);
    built.shell.appendChild(feedCard);
    loadCaFeed();
    inTitleEn.focus();
  }

  // =========================================================================
  // WORKFLOW 4: MOCK TEST (mock-tests/new)
  // =========================================================================
  function renderQuickMockTest(root, headerActions) {
    var slugTouched = false;
    var queuedQuestions = [];
    var statusEl = el('span', 'cso-qc-status');
    statusEl.setAttribute('role', 'status');

    var inTitleEn = el('input', 'cso-qc-input'); inTitleEn.id = 'qcMockTitleEn'; inTitleEn.placeholder = 'e.g., OPSC OAS Prelims GS-I Full Mock Test 01';
    var inTitleOr = el('input', 'cso-qc-input'); inTitleOr.id = 'qcMockTitleOr'; inTitleOr.placeholder = '\u0B13\u0B21\u0B3C\u0B3F\u0B36\u0B3E \u0B38\u0B3F\u0B2D\u0B3F\u0B32\u0B4D \u0B38\u0B30\u0B4D\u0B2D\u0B3F\u0B38\u0B47\u0B38\u0B4D \u0B2E\u0B15\u0B4D \u0B1F\u0B47\u0B38\u0B4D\u0B1F \u0B66\u0B67';
    var inSlug = el('input', 'cso-qc-input'); inSlug.id = 'qcMockSlug'; inSlug.placeholder = 'auto-generated-from-title';
    var selCat = el('select', 'cso-qc-select'); selCat.id = 'qcMockCat';
    EXAM_CATEGORIES.forEach(function (c) { selCat.appendChild(new Option(c, c)); });
    var inDur = el('input', 'cso-qc-input'); inDur.id = 'qcMockDur'; inDur.type = 'number'; inDur.min = '1'; inDur.max = '600'; inDur.value = '30';
    var inNeg = el('input', 'cso-qc-input'); inNeg.id = 'qcMockNeg'; inNeg.type = 'number'; inNeg.step = '0.05'; inNeg.min = '0'; inNeg.max = '5'; inNeg.value = '0.25';
    var inTags = el('input', 'cso-qc-input'); inTags.id = 'qcMockTags'; inTags.placeholder = 'OPSC, Prelims Mock, CBT';

    inTitleEn.addEventListener('input', function () {
      if (!slugTouched) inSlug.value = slugify(inTitleEn.value);
    });
    inSlug.addEventListener('input', function () { slugTouched = true; });

    var queueHost = el('div', 'cso-qc-repeater');
    var queueTitle = el('h4', 'cso-qc-subhead', 'Queued Questions (0)');
    function renderQueue() {
      queueTitle.textContent = 'Queued Questions (' + queuedQuestions.length + ')';
      clear(queueHost);
      if (!queuedQuestions.length) {
        queueHost.appendChild(el('p', 'cso-qc-hint', 'Use Bulk-Paste Parser, Single-Question Add, or AI Generate 5 MCQs below to attach questions before publishing.'));
        return;
      }
      queuedQuestions.forEach(function (q, idx) {
        var row = el('div', 'cso-qc-list-row');
        var info = el('div', 'cso-qc-list-info');
        info.appendChild(el('strong', '', 'Q' + (idx + 1) + '. ' + q.question_en));
        if (q.question_or) info.appendChild(el('div', 'cso-qc-hint', q.question_or));
        info.appendChild(el('div', 'cso-qc-hint', (q.options || []).map(function (o, i) { return ['A', 'B', 'C', 'D'][i] + ') ' + o; }).join('  \u00B7  ') + '  [Ans: ' + ['A', 'B', 'C', 'D'][q.correct_index || 0] + ']'));
        var rm = el('button', 'cso-qc-btn cso-qc-btn--danger', 'Remove'); rm.type = 'button';
        rm.addEventListener('click', function () { queuedQuestions.splice(idx, 1); renderQueue(); });
        row.append(info, rm);
        queueHost.appendChild(row);
      });
    }

    // Single-question quick inputs
    var sqEn = el('input', 'cso-qc-input'); sqEn.id = 'qcSqEn'; sqEn.placeholder = 'Enter single question in English\u2026';
    var sqOr = el('input', 'cso-qc-input'); sqOr.id = 'qcSqOr'; sqOr.placeholder = '\u0B13\u0B21\u0B3C\u0B3F\u0B06\u0B30\u0B47 \u0B2A\u0B4D\u0B30\u0B36\u0B4D\u0B28 (\u0B07\u0B1A\u0B4D\u0B1B\u0B3E\u0B27\u0B40\u0B28)\u2026';
    var sqOpts = ['A', 'B', 'C', 'D'].map(function (ltr) {
      var i = el('input', 'cso-qc-input'); i.placeholder = 'Option ' + ltr; return i;
    });
    var sqAns = el('select', 'cso-qc-select');
    [['0', 'Option A'], ['1', 'Option B'], ['2', 'Option C'], ['3', 'Option D']].forEach(function (p) { sqAns.appendChild(new Option(p[1], p[0])); });
    var sqExp = el('input', 'cso-qc-input'); sqExp.placeholder = 'Brief solution / explanation (optional)';

    var translateAllBtn = createTranslateAllBtn(function () {
      var pairs = [
        { key: 'title_or', getEn: function () { return inTitleEn.value; }, getOr: function () { return inTitleOr.value; }, targetInput: inTitleOr },
        { key: 'single_q_or', getEn: function () { return sqEn.value; }, getOr: function () { return sqOr.value; }, targetInput: sqOr }
      ];
      queuedQuestions.forEach(function (q, i) {
        if (q.question_en && !q.question_or && i < 12) {
          pairs.push({
            key: 'qq_' + i,
            getEn: function () { return q.question_en; },
            getOr: function () { return q.question_or; },
            setOr: function (v) { q.question_or = v; renderQueue(); }
          });
        }
      });
      return pairs;
    });

    function submitMockTest(statusVal) {
      var titleEn = inTitleEn.value.trim();
      if (!titleEn) {
        statusEl.textContent = 'Exam Title (EN) is required.';
        toast('Enter an Exam Title first.', 'amber');
        inTitleEn.focus();
        return;
      }
      var slug = inSlug.value.trim() || slugify(titleEn);
      inSlug.value = slug;
      statusEl.textContent = 'Creating CBT Mock Test' + (queuedQuestions.length ? (' & importing ' + queuedQuestions.length + ' MCQ(s)') : '') + '\u2026';
      apiFetch('/api/admin/mock-tests', {
        method: 'POST',
        body: {
          title_en: titleEn,
          title_or: inTitleOr.value.trim(),
          slug: slug,
          exam_category: selCat.value || 'OPSC',
          duration_minutes: Number(inDur.value) || 30,
          negative_mark: Number(inNeg.value) || 0,
          status: statusVal
        }
      }).then(function (created) {
        var testId = (created && (created.id || (created.item && created.item.id))) || '';
        var finalSlug = (created && ((created.item && created.item.slug) || created.slug)) || slug;
        if (!testId || !queuedQuestions.length) {
          return { testId: testId, slug: finalSlug, imported: 0 };
        }
        return apiFetch('/api/admin/mock-tests/' + encodeURIComponent(testId) + '/import-csv', {
          method: 'POST',
          body: { csv: mcqsToCsv(queuedQuestions), dry_run: false, skip_invalid: true }
        }).then(function (imp) {
          return { testId: testId, slug: finalSlug, imported: (imp && imp.imported) || queuedQuestions.length };
        });
      }).then(function (done) {
        return luCtrl.syncMeta('mock_test', done.testId || done.slug).then(function () { return done; });
      }).then(function (done) {
        statusEl.textContent = statusVal === 'published'
          ? '\u2713 Published Mock Test live at /mock-tests/?test=' + encodeURIComponent(done.slug) + ' (' + done.imported + ' Qs, Exams tab synced)'
          : '\u2713 Mock Test draft saved (' + done.imported + ' Qs)';
        toast(statusVal === 'published' ? 'CBT Mock Test published live!' : 'Mock Test draft saved!', 'ok');
        queuedQuestions = [];
        renderQueue();
      }).catch(function (err) {
        statusEl.textContent = '\u2715 ' + err.message;
        toast(err.message || 'Mock test creation failed.', 'crimson');
      });
    }

    var built = buildQuickShell(root, headerActions, {
      badge: '4 / 7 \u00B7 Mock Test',
      subtitle: 'Exam timing, negative marking, quick bulk-paste MCQ parser & single-question add',
      translateAllBtn: translateAllBtn,
      fullStudioLabel: 'Open Full CBT Question Bank \u2192',
      onOpenFullStudio: function () { if (window.CSOStudio && window.CSOStudio.openStudyPublishingTab) window.CSOStudio.openStudyPublishingTab('mock_tests'); },
      onSaveDraft: function () { submitMockTest('draft'); },
      onPublishNow: function () { submitMockTest('published'); }
    });

    built.shell.appendChild(renderMetaSuggester({
      kind: 'Odisha CBT mock test',
      getSeedText: function () { return [inTitleEn.value, selCat.value].filter(Boolean).join(' \u2014 '); },
      onApplyTitlePair: function (en, or, sl) {
        inTitleEn.value = en;
        if (or) inTitleOr.value = or;
        if (sl && !slugTouched) inSlug.value = sl;
      },
      onApplySlug: function (sl) { inSlug.value = sl; slugTouched = true; },
      onApplyTag: function (t) { addTagToInput(inTags, t); },
      onApplyAllTags: function (arr) { arr.forEach(function (t) { addTagToInput(inTags, t); }); }
    }));

    var card = el('section', 'cso-qc-card');
    card.appendChild(el('h3', 'cso-qc-card-title', '1. Exam Setup'));
    var g = el('div', 'cso-qc-grid');
    g.append(
      makeField('Mock Test Title (English) *', inTitleEn, { full: true }),
      makeField('Mock Test Title (\u0B13\u0B21\u0B3C\u0B3F\u0B06)', inTitleOr, { full: true, actionEl: createOdiaTranslateBtn({ getSource: function () { return inTitleEn.value; }, targetInput: inTitleOr }) }),
      makeField('URL Slug (Auto)', inSlug),
      makeField('Exam Category', selCat),
      makeField('Duration (Minutes)', inDur),
      makeField('Negative Marking', inNeg)
    );
    var luCtrl = createLatestUpdatesControls({ pinId: 'qcMockLuPin', examId: 'qcMockLuExam', scopeId: 'qcMockLuScope', defaultScope: 'Odisha', defaultExam: true });
    selCat.addEventListener('change', function () {
      luCtrl.setScope(/ugc|ctet|ssc|rrb|central|national/i.test(selCat.value) ? 'National' : 'Odisha');
    });
    card.appendChild(g);
    card.appendChild(luCtrl.node);
    built.shell.appendChild(card);

    // Quick Bulk-Paste MCQ Parser Card
    var bulkCard = el('section', 'cso-qc-card');
    var bulkHead = el('div', 'cso-qc-label-row');
    bulkHead.appendChild(el('h3', 'cso-qc-card-title', '2. Quick Bulk-Paste MCQ Parser (Plain Text or CSV)'));
    var aiGenBtn = el('button', 'cso-ai-tr-btn', '\u2728 AI Generate 5 MCQs'); aiGenBtn.type = 'button';
    bulkHead.appendChild(aiGenBtn);
    bulkCard.appendChild(bulkHead);

    var bulkTa = el('textarea', 'cso-qc-textarea');
    bulkTa.id = 'qcMockBulkPaste';
    bulkTa.rows = 6;
    bulkTa.placeholder = 'Paste numbered MCQs OR CSV rows:\nQ1. Which is the longest river in Odisha?\nA) Brahmani\nB) Mahanadi\nC) Baitarani\nD) Subarnarekha\nAnswer: B\nExplanation: Mahanadi flows ~851 km across Chhattisgarh and Odisha.';
    bulkCard.appendChild(bulkTa);

    var bulkActs = el('div', 'cso-qc-top-actions');
    var parseBtn = el('button', 'cso-qc-btn cso-qc-btn--primary', '\u26A1 Parse & Queue MCQs'); parseBtn.type = 'button';
    parseBtn.addEventListener('click', function () {
      var list = parseBulkMcqs(bulkTa.value);
      if (!list.length) {
        toast('Could not detect MCQs. Use Q1. / A) B) C) D) / Answer: B format or CSV header.', 'amber');
        return;
      }
      queuedQuestions = queuedQuestions.concat(list);
      bulkTa.value = '';
      renderQueue();
      toast('Parsed & queued ' + list.length + ' MCQ(s)!', 'ok');
    });
    aiGenBtn.addEventListener('click', function () {
      var topic = inTitleEn.value.trim() || (selCat.value + ' Odisha GK & Current Affairs');
      if (topic.length < 8) topic = topic + ' competitive exam questions';
      aiGenBtn.disabled = true; aiGenBtn.textContent = 'Generating\u2026';
      apiFetch('/api/admin/ai-coauthor', { method: 'POST', body: { mode: 'mcq', input: topic } })
        .then(function (r) {
          var qs = (r && r.data && Array.isArray(r.data.questions)) ? r.data.questions : [];
          qs.forEach(function (q) {
            queuedQuestions.push({
              question_en: q.question_en || '',
              question_or: q.question_or || '',
              options: Array.isArray(q.options_en) ? q.options_en.slice(0, 4) : ['', '', '', ''],
              correct_index: Number(q.correct_index) || 0,
              explanation_en: q.explanation_en || '',
              explanation_or: q.explanation_or || ''
            });
          });
          renderQueue();
          toast('AI queued ' + qs.length + ' bilingual MCQ(s)!', 'ok');
        })
        .catch(function (e) { toast(e.message || 'AI MCQ generation failed.', 'crimson'); })
        .finally(function () { aiGenBtn.disabled = false; aiGenBtn.textContent = '\u2728 AI Generate 5 MCQs'; });
    });
    bulkActs.appendChild(parseBtn);
    bulkCard.appendChild(bulkActs);

    // Single-Question Add
    var singleBox = el('div', 'cso-qc-subbox');
    singleBox.appendChild(el('strong', 'cso-qc-label', 'Or Add a Single Question'));
    var sqGrid = el('div', 'cso-qc-grid');
    sqGrid.append(
      makeField('Question (EN)', sqEn, { full: true }),
      makeField('Question (\u0B13\u0B21\u0B3C\u0B3F\u0B06)', sqOr, { full: true, actionEl: createOdiaTranslateBtn({ getSource: function () { return sqEn.value; }, targetInput: sqOr }) }),
      makeField('Option A', sqOpts[0]),
      makeField('Option B', sqOpts[1]),
      makeField('Option C', sqOpts[2]),
      makeField('Option D', sqOpts[3]),
      makeField('Correct Option', sqAns),
      makeField('Explanation', sqExp)
    );
    var addSingleBtn = el('button', 'cso-qc-btn', '+ Add Question to Queue'); addSingleBtn.type = 'button';
    addSingleBtn.addEventListener('click', function () {
      if (!sqEn.value.trim()) { toast('Enter question text first.', 'amber'); sqEn.focus(); return; }
      queuedQuestions.push({
        question_en: sqEn.value.trim(),
        question_or: sqOr.value.trim(),
        options: sqOpts.map(function (i, idx) { return i.value.trim() || ('Option ' + ['A', 'B', 'C', 'D'][idx]); }),
        correct_index: Number(sqAns.value) || 0,
        explanation_en: sqExp.value.trim(),
        explanation_or: ''
      });
      sqEn.value = ''; sqOr.value = ''; sqExp.value = '';
      sqOpts.forEach(function (i) { i.value = ''; });
      renderQueue();
      toast('Added question to queue!', 'ok');
    });
    singleBox.append(sqGrid, addSingleBtn);
    bulkCard.append(singleBox, queueTitle, queueHost);
    renderQueue();
    built.shell.appendChild(bulkCard);

    var adv = buildAdvAccordion('Advanced SEO Tags', built.quickToggle);
    if (built.quickToggle) {
      built.quickToggle.node.addEventListener('click', function () { adv.details.open = !built.quickToggle.isOn(); });
    }
    adv.body.appendChild(makeField('SEO Tags (Comma-separated)', inTags));
    built.shell.appendChild(adv.details);

    var foot = el('div', 'cso-qc-footer');
    var btnDraft = el('button', 'cso-qc-btn', 'Save Draft'); btnDraft.type = 'button';
    btnDraft.addEventListener('click', function () { submitMockTest('draft'); });
    var btnPub = el('button', 'cso-qc-btn cso-qc-btn--primary', 'Publish Now \u2192'); btnPub.type = 'button';
    btnPub.addEventListener('click', function () { submitMockTest('published'); });
    foot.append(btnDraft, btnPub, statusEl);
    built.shell.appendChild(foot);
    inTitleEn.focus();
  }

  // =========================================================================
  // WORKFLOW 5: SYLLABUS / PYQ RESOURCE (syllabus)
  // =========================================================================
  function renderQuickSyllabusResource(root, headerActions) {
    var savedId = '';
    var slugTouched = false;
    var statusEl = el('span', 'cso-qc-status');
    statusEl.setAttribute('role', 'status');

    var selType = el('select', 'cso-qc-select'); selType.id = 'qcSylType';
    SYLLABUS_RESOURCE_TYPES.forEach(function (t) { selType.appendChild(new Option(t, t)); });
    var selTrack = el('select', 'cso-qc-select'); selTrack.id = 'qcSylTrack';
    selTrack.appendChild(new Option('Odisha State Exams', 'stl_l1_odisha_state'));
    var inTitleEn = el('input', 'cso-qc-input'); inTitleEn.id = 'qcSylTitleEn'; inTitleEn.placeholder = 'e.g., OPSC OAS 2026 Official Syllabus & Exam Pattern PDF';
    var inTitleOr = el('input', 'cso-qc-input'); inTitleOr.id = 'qcSylTitleOr'; inTitleOr.placeholder = 'OPSC OAS \u0B68\u0B66\u0B68\u0B6C \u0B38\u0B30\u0B15\u0B3E\u0B30\u0B40 \u0B38\u0B3F\u0B32\u0B3E\u0B2C\u0B38\u0B4D \u0B13 \u0B2A\u0B30\u0B40\u0B15\u0B4D\u0B37\u0B3E \u0B2A\u0B26\u0B4D\u0B27\u0B24\u0B3F PDF';
    var inSlug = el('input', 'cso-qc-input'); inSlug.id = 'qcSylSlug'; inSlug.placeholder = 'auto-generated-from-title';
    var inExam = el('input', 'cso-qc-input'); inExam.id = 'qcSylExam'; inExam.placeholder = 'e.g., OPSC / OSSC / OSSSC / UGC NET';
    var inYear = el('input', 'cso-qc-input'); inYear.id = 'qcSylYear'; inYear.placeholder = String(new Date().getFullYear()); inYear.value = String(new Date().getFullYear());
    var inPaper = el('input', 'cso-qc-input'); inPaper.id = 'qcSylPaper'; inPaper.placeholder = 'e.g., Prelims GS-I / Paper-1';
    var inPdfUrl = el('input', 'cso-qc-input'); inPdfUrl.id = 'qcSylPdfUrl'; inPdfUrl.placeholder = '/api/media/study-publishing/... (auto-filled on upload)';
    var taDescEn = el('textarea', 'cso-qc-textarea'); taDescEn.id = 'qcSylDescEn'; taDescEn.rows = 3; taDescEn.placeholder = 'Bilingual overview of syllabus units, marking scheme, or PYQ coverage (EN)\u2026';
    var taDescOr = el('textarea', 'cso-qc-textarea'); taDescOr.id = 'qcSylDescOr'; taDescOr.rows = 3; taDescOr.placeholder = '\u0B13\u0B21\u0B3C\u0B3F\u0B06\u0B30\u0B47 \u0B2C\u0B3F\u0B2C\u0B30\u0B23\u0B40\u2026';
    var inTags = el('input', 'cso-qc-input'); inTags.id = 'qcSylTags'; inTags.placeholder = 'Syllabus PDF, PYQ, OPSC 2026';
    var chkOffline = el('input'); chkOffline.type = 'checkbox'; chkOffline.checked = true;
    var chkFeat = el('input'); chkFeat.type = 'checkbox';

    inTitleEn.addEventListener('input', function () {
      if (!slugTouched) inSlug.value = slugify(inTitleEn.value);
    });
    inSlug.addEventListener('input', function () { slugTouched = true; });

    apiFetch('/api/admin/study/taxonomy').then(function (d) {
      var l1 = (d && Array.isArray(d.nodes) ? d.nodes : []).filter(function (n) { return Number(n.level) === 1; });
      if (!l1.length) return;
      clear(selTrack);
      l1.forEach(function (n) { selTrack.appendChild(new Option((n.icon ? n.icon + ' ' : '') + n.title_en, n.id)); });
    }).catch(function () {});

    // Direct R2 Drag-and-Drop PDF Uploader
    var dropZone = el('div', 'cso-qc-dropzone');
    var dzLabel = el('strong', '', '\uD83D\uDCC4 Drag & Drop Official Syllabus / PYQ PDF Here (Direct Cloudflare R2 Upload)');
    var dzHint = el('span', 'cso-qc-hint', 'PDF up to 20 MB \u2014 auto-extracts Exam Board, Paper Code & Year');
    var fileInp = el('input', 'cso-qc-input'); fileInp.type = 'file'; fileInp.accept = 'application/pdf';
    fileInp.setAttribute('aria-label', 'Select Syllabus or PYQ PDF file');

    function handlePdfUpload(file) {
      if (!file) return;
      var purpose = /pyq/i.test(selType.value) ? 'pyq-pdf' : (/answer/i.test(selType.value) ? 'answer-key-pdf' : 'notes-pdf');
      var fd = new FormData();
      fd.append('file', file);
      fd.append('purpose', purpose);
      dzHint.textContent = 'Uploading ' + file.name + ' to Cloudflare R2\u2026';
      apiFetch('/api/admin/study/upload', { method: 'POST', body: fd })
        .then(function (res) {
          if (res && res.url) inPdfUrl.value = res.url;
          dzHint.textContent = '\u2713 Uploaded to R2: ' + (res.filename || file.name);
          if (res && res.extracted_draft) {
            var ex = res.extracted_draft;
            if (ex.title_en && !inTitleEn.value) { inTitleEn.value = ex.title_en; if (!slugTouched) inSlug.value = slugify(ex.title_en); }
            if (ex.exam_board_tag && !inExam.value) inExam.value = ex.exam_board_tag;
            if (ex.pyq_year) inYear.value = ex.pyq_year;
            if (ex.paper_code && !inPaper.value) inPaper.value = ex.paper_code;
            if (ex.summary_en && !taDescEn.value) taDescEn.value = ex.summary_en;
          } else if (!inTitleEn.value) {
            var baseName = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ').trim();
            inTitleEn.value = baseName;
            if (!slugTouched) inSlug.value = slugify(baseName);
          }
          toast('PDF uploaded to Cloudflare R2!', 'ok');
        })
        .catch(function (err) {
          dzHint.textContent = '\u2715 Upload failed: ' + err.message;
          toast(err.message || 'R2 PDF upload failed.', 'crimson');
        });
    }

    fileInp.addEventListener('change', function () {
      if (fileInp.files && fileInp.files[0]) handlePdfUpload(fileInp.files[0]);
    });
    dropZone.addEventListener('dragover', function (e) { e.preventDefault(); dropZone.classList.add('is-dragover'); });
    dropZone.addEventListener('dragleave', function () { dropZone.classList.remove('is-dragover'); });
    dropZone.addEventListener('drop', function (e) {
      e.preventDefault();
      dropZone.classList.remove('is-dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handlePdfUpload(e.dataTransfer.files[0]);
      }
    });
    dropZone.append(dzLabel, dzHint, fileInp);
    if (window.CSOFilePicker && window.CSOFilePicker.createPickerButton) {
      dropZone.appendChild(window.CSOFilePicker.createPickerButton({
        label: '\uD83D\uDCC1 Or Pick Existing PDF from R2 Vault',
        folder: 'Study',
        className: 'cso-qc-btn',
        onSelect: function (item) {
          var u = typeof item === 'string' ? item : (item && (item.clean_url || item.url));
          if (u) { inPdfUrl.value = u; dzHint.textContent = '\u2713 Selected from R2: ' + u; }
        }
      }));
    }

    var translateAllBtn = createTranslateAllBtn(function () {
      return [
        { key: 'title_or', getEn: function () { return inTitleEn.value; }, getOr: function () { return inTitleOr.value; }, targetInput: inTitleOr },
        { key: 'summary_or', getEn: function () { return taDescEn.value; }, getOr: function () { return taDescOr.value; }, targetInput: taDescOr }
      ];
    });

    function submitSyllabus(publishFlag) {
      var titleEn = inTitleEn.value.trim();
      if (!titleEn) {
        statusEl.textContent = 'Resource Title (EN) is required.';
        toast('Enter a Resource Title first.', 'amber');
        inTitleEn.focus();
        return;
      }
      var slug = inSlug.value.trim() || slugify(titleEn);
      inSlug.value = slug;
      var isPyq = /pyq/i.test(selType.value);
      var isKey = /answer/i.test(selType.value);
      var pdfUrl = inPdfUrl.value.trim();
      var payload = {
        category_l1_id: selTrack.value || 'stl_l1_odisha_state',
        resource_type_badge: selType.value || 'Official Syllabus',
        title_en: titleEn,
        title_or: inTitleOr.value.trim(),
        slug: slug,
        exam_board_tag: inExam.value.trim(),
        pyq_year: inYear.value.trim(),
        paper_code: inPaper.value.trim(),
        summary_en: taDescEn.value.trim(),
        summary_or: taDescOr.value.trim(),
        notes_pdf_url: (!isPyq && !isKey) ? pdfUrl : '',
        pyq_pdf_url: isPyq ? pdfUrl : '',
        answer_key_pdf_url: isKey ? pdfUrl : '',
        offline_pack: chkOffline.checked ? 1 : 0,
        is_featured: (chkFeat.checked || luCtrl.isPinned()) ? 1 : 0,
        is_free_access: 1,
        is_published: publishFlag ? 1 : 0
      };
      statusEl.textContent = publishFlag ? 'Publishing Syllabus / PYQ live & syncing Vectorize\u2026' : 'Saving draft to D1\u2026';
      var url = savedId ? ('/api/admin/study/articles/' + encodeURIComponent(savedId)) : '/api/admin/study/articles';
      apiFetch(url, { method: savedId ? 'PUT' : 'POST', body: payload })
        .then(function (res) {
          if (res && res.item && res.item.id) savedId = res.item.id;
          return luCtrl.syncMeta('study', savedId || slug).then(function () { return res; });
        })
        .then(function (res) {
          statusEl.textContent = publishFlag
            ? '\u2713 Published live at /study-library/?slug=' + encodeURIComponent((res.item && res.item.slug) || slug) + ' (Vectorize + Latest Updates synced)'
            : '\u2713 Draft saved to D1 (ID: ' + savedId + ')';
          toast(publishFlag ? 'Syllabus / PYQ Resource published live!' : 'Resource draft saved!', 'ok');
          if (window.CSOStudio && window.CSOStudio.refreshBrandSummary) window.CSOStudio.refreshBrandSummary();
          if (publishFlag && res && res.item && window.CSOPublishTools && window.CSOPublishTools.runPublishChain) {
            window.CSOPublishTools.runPublishChain('study', res.item);
          }
        })
        .catch(function (err) {
          statusEl.textContent = '\u2715 ' + err.message;
          toast(err.message || 'Save failed.', 'crimson');
        });
    }

    var built = buildQuickShell(root, headerActions, {
      badge: '5 / 7 \u00B7 Syllabus / PYQ Resource',
      subtitle: 'Direct R2 PDF upload, exam & year tags, bilingual description & instant publish',
      translateAllBtn: translateAllBtn,
      fullStudioLabel: 'Open Full Study Library Studio \u2192',
      onOpenFullStudio: function () { if (window.CSOStudio && window.CSOStudio.openStudyPublishingTab) window.CSOStudio.openStudyPublishingTab('new'); },
      onSaveDraft: function () { submitSyllabus(false); },
      onPublishNow: function () { submitSyllabus(true); }
    });

    built.shell.appendChild(renderMetaSuggester({
      kind: 'Odisha exam syllabus or previous year paper PDF',
      getSeedText: function () { return [inTitleEn.value, inExam.value, inYear.value, taDescEn.value].filter(Boolean).join(' \u2014 '); },
      onApplyTitlePair: function (en, or, sl) {
        inTitleEn.value = en;
        if (or) inTitleOr.value = or;
        if (sl && !slugTouched) inSlug.value = sl;
      },
      onApplySlug: function (sl) { inSlug.value = sl; slugTouched = true; },
      onApplyTag: function (t) { addTagToInput(inTags, t); },
      onApplyAllTags: function (arr) { arr.forEach(function (t) { addTagToInput(inTags, t); }); }
    }));

    var card = el('section', 'cso-qc-card');
    card.appendChild(el('h3', 'cso-qc-card-title', 'Upload PDF & Essential Metadata'));
    card.appendChild(dropZone);
    var g = el('div', 'cso-qc-grid');
    g.append(
      makeField('Resource Type *', selType),
      makeField('Exam Track (L1)', selTrack),
      makeField('URL Slug (Auto)', inSlug),
      makeField('Resource Title (English) *', inTitleEn, { full: true }),
      makeField('Resource Title (\u0B13\u0B21\u0B3C\u0B3F\u0B06)', inTitleOr, { full: true, actionEl: createOdiaTranslateBtn({ getSource: function () { return inTitleEn.value; }, targetInput: inTitleOr }) }),
      makeField('Exam / Board Tag', inExam),
      makeField('Year / Cycle', inYear),
      makeField('Paper Code', inPaper),
      makeField('Uploaded R2 PDF URL', inPdfUrl, { full: true }),
      makeField('Bilingual Description (English)', taDescEn, { full: true }),
      makeField('Bilingual Description (\u0B13\u0B21\u0B3C\u0B3F\u0B06)', taDescOr, { full: true, actionEl: createOdiaTranslateBtn({ getSource: function () { return taDescEn.value; }, targetInput: taDescOr }) })
    );
    var luCtrl = createLatestUpdatesControls({ pinId: 'qcSylLuPin', examId: 'qcSylLuExam', scopeId: 'qcSylLuScope', defaultScope: 'Odisha', defaultExam: true });
    card.appendChild(g);
    card.appendChild(luCtrl.node);
    built.shell.appendChild(card);

    var adv = buildAdvAccordion('Advanced SEO Tags & Offline PWA Pack', built.quickToggle);
    if (built.quickToggle) {
      built.quickToggle.node.addEventListener('click', function () { adv.details.open = !built.quickToggle.isOn(); });
    }
    var offLbl = el('label', 'cso-qc-check'); offLbl.append(chkOffline, el('span', '', 'Include in Offline Low-Bandwidth PWA Study Pack'));
    var ftLbl = el('label', 'cso-qc-check'); ftLbl.append(chkFeat, el('span', '', 'Feature at top of Study Library'));
    adv.body.append(makeField('Tags (Comma-separated)', inTags), offLbl, ftLbl);
    built.shell.appendChild(adv.details);

    var foot = el('div', 'cso-qc-footer');
    var btnDraft = el('button', 'cso-qc-btn', 'Save Draft'); btnDraft.type = 'button';
    btnDraft.addEventListener('click', function () { submitSyllabus(false); });
    var btnPub = el('button', 'cso-qc-btn cso-qc-btn--primary', 'Publish Now \u2192'); btnPub.type = 'button';
    btnPub.addEventListener('click', function () { submitSyllabus(true); });
    foot.append(btnDraft, btnPub, statusEl);
    built.shell.appendChild(foot);
    inTitleEn.focus();
  }

  // =========================================================================
  // WORKFLOW 6: HOMEPAGE BROADCAST (banner)
  // =========================================================================
  function renderQuickHomepageBroadcast(root, headerActions) {
    var statusEl = el('span', 'cso-qc-status');
    statusEl.setAttribute('role', 'status');

    var chkActive = el('input'); chkActive.type = 'checkbox'; chkActive.id = 'qcBanActive'; chkActive.checked = true;
    var inBadge = el('input', 'cso-qc-input'); inBadge.id = 'qcBanBadge'; inBadge.maxLength = 32; inBadge.placeholder = 'e.g., LIVE / ADMIT CARD / URGENT / NEW'; inBadge.value = 'LIVE';
    var selSev = el('select', 'cso-qc-select'); selSev.id = 'qcBanSev';
    [['info', 'Info (Emerald)'], ['notice', 'Notice (Amber)'], ['urgent', 'Urgent (Crimson)']].forEach(function (p) { selSev.appendChild(new Option(p[1], p[0])); });
    var inHeadEn = el('input', 'cso-qc-input'); inHeadEn.id = 'qcBanHeadEn'; inHeadEn.maxLength = 160; inHeadEn.placeholder = 'e.g., OPSC OAS 2026 Admit Card Released \u2014 Download Now';
    var inHeadOr = el('input', 'cso-qc-input'); inHeadOr.id = 'qcBanHeadOr'; inHeadOr.maxLength = 220; inHeadOr.placeholder = 'OPSC OAS \u0B68\u0B66\u0B68\u0B6C \u0B06\u0B21\u0B2E\u0B3F\u0B1F\u0B4D \u0B15\u0B3E\u0B30\u0B4D\u0B21 \u0B2A\u0B4D\u0B30\u0B15\u0B3E\u0B36\u0B3F\u0B24 \u2014 \u0B0F\u0B2C\u0B47 \u0B21\u0B3E\u0B09\u0B28\u0B32\u0B4B\u0B21\u0B4D \u0B15\u0B30\u0B28\u0B4D\u0B24\u0B41';
    var inCtaText = el('input', 'cso-qc-input'); inCtaText.id = 'qcBanCtaText'; inCtaText.maxLength = 40; inCtaText.placeholder = 'e.g., View Details / Apply Now';
    var inCtaUrl = el('input', 'cso-qc-input'); inCtaUrl.id = 'qcBanCtaUrl'; inCtaUrl.maxLength = 500; inCtaUrl.placeholder = '/jobs/ or https://www.opsc.gov.in/';
    var taCtxEn = el('textarea', 'cso-qc-textarea'); taCtxEn.id = 'qcBanCtxEn'; taCtxEn.rows = 2; taCtxEn.maxLength = 300; taCtxEn.placeholder = 'Optional supporting detail shown next to announcement (EN)\u2026';
    var taCtxOr = el('textarea', 'cso-qc-textarea'); taCtxOr.id = 'qcBanCtxOr'; taCtxOr.rows = 2; taCtxOr.maxLength = 360; taCtxOr.placeholder = '\u0B07\u0B1A\u0B4D\u0B1B\u0B3E\u0B27\u0B40\u0B28 \u0B05\u0B24\u0B3F\u0B30\u0B3F\u0B15\u0B4D\u0B24 \u0B38\u0B42\u0B1A\u0B28\u0B3E (\u0B13\u0B21\u0B3C\u0B3F\u0B06)\u2026';

    var previewBar = el('div', 'cso-qc-banner-preview');
    function updatePreview() {
      clear(previewBar);
      previewBar.className = 'cso-qc-banner-preview is-' + (selSev.value || 'info');
      previewBar.appendChild(el('span', 'cso-qc-badge', (inBadge.value.trim() || selSev.value || 'LIVE').toUpperCase()));
      previewBar.appendChild(el('strong', '', inHeadEn.value.trim() || 'Live announcement bar preview appears here\u2026'));
      if (inHeadOr.value.trim()) previewBar.appendChild(el('span', 'cso-qc-hint', ' \u00B7 ' + inHeadOr.value.trim()));
      if (inCtaText.value.trim()) previewBar.appendChild(el('span', 'cso-qc-badge', inCtaText.value.trim() + ' \u2192'));
    }
    [inBadge, selSev, inHeadEn, inHeadOr, inCtaText].forEach(function (n) {
      n.addEventListener('input', updatePreview);
      n.addEventListener('change', updatePreview);
    });

    var translateAllBtn = createTranslateAllBtn(function () {
      return [
        { key: 'headline_or', getEn: function () { return inHeadEn.value; }, getOr: function () { return inHeadOr.value; }, targetInput: inHeadOr },
        { key: 'context_or', getEn: function () { return taCtxEn.value; }, getOr: function () { return taCtxOr.value; }, targetInput: taCtxOr }
      ];
    }, updatePreview);

    function submitBanner(activeFlag) {
      chkActive.checked = activeFlag;
      if (activeFlag && !inHeadEn.value.trim()) {
        statusEl.textContent = 'Announcement text (EN) is required to publish live.';
        toast('Enter an English announcement text first.', 'amber');
        inHeadEn.focus();
        return;
      }
      var payload = {
        active: activeFlag,
        badge_label: inBadge.value.trim(),
        headline: inHeadEn.value.trim(),
        headline_or: inHeadOr.value.trim(),
        context: taCtxEn.value.trim(),
        context_or: taCtxOr.value.trim(),
        severity: selSev.value || 'info',
        ctaText: inCtaText.value.trim(),
        ctaUrl: inCtaUrl.value.trim()
      };
      statusEl.textContent = activeFlag ? 'Publishing Homepage Broadcast live\u2026' : 'Saving broadcast (inactive draft)\u2026';
      apiFetch('/api/admin/banner', { method: 'PUT', body: payload })
        .then(function () {
          bustHomeCache('broadcast');
          statusEl.textContent = activeFlag ? '\u2713 Broadcast is LIVE on csodisha.com!' : '\u2713 Saved as inactive draft (hidden on homepage).';
          toast(activeFlag ? 'Homepage Broadcast is LIVE!' : 'Homepage Broadcast saved (inactive).', 'ok');
          updatePreview();
        })
        .catch(function (err) {
          statusEl.textContent = '\u2715 ' + err.message;
          toast(err.message || 'Broadcast save failed.', 'crimson');
        });
    }

    var built = buildQuickShell(root, headerActions, {
      badge: '6 / 7 \u00B7 Homepage Broadcast & Layout',
      subtitle: 'Live announcement bar (EN / \u0B13\u0B21\u0B3C\u0B3F\u0B06), Homepage Compact Sections visibility & Latest Updates feed',
      translateAllBtn: translateAllBtn,
      draftLabel: 'Save Draft (Inactive)',
      publishLabel: 'Publish Live Now \u2192',
      onSaveDraft: function () { submitBanner(false); },
      onPublishNow: function () { submitBanner(true); }
    });

    var card = el('section', 'cso-qc-card');
    card.appendChild(el('h3', 'cso-qc-card-title', 'Live Announcement Bar Settings'));
    var activeLbl = el('label', 'cso-qc-check');
    activeLbl.append(chkActive, el('span', '', 'Show live announcement bar at the top of csodisha.com'));
    card.appendChild(activeLbl);

    var g = el('div', 'cso-qc-grid');
    g.append(
      makeField('Badge Label', inBadge),
      makeField('Banner Tone / Severity', selSev),
      makeField('Announcement Text (English) *', inHeadEn, { full: true }),
      makeField('Announcement Text (\u0B13\u0B21\u0B3C\u0B3F\u0B06)', inHeadOr, { full: true, actionEl: createOdiaTranslateBtn({ getSource: function () { return inHeadEn.value; }, targetInput: inHeadOr, onTranslated: updatePreview }) }),
      makeField('CTA Button Text', inCtaText),
      makeField('CTA Link (/jobs/ or https://\u2026)', inCtaUrl)
    );
    card.appendChild(g);
    card.appendChild(el('div', 'cso-qc-label', 'Live Preview'));
    card.appendChild(previewBar);
    built.shell.appendChild(card);

    var adv = buildAdvAccordion('Optional Supporting Sub-Context (EN / \u0B13\u0B21\u0B3C\u0B3F\u0B06)', built.quickToggle);
    if (built.quickToggle) {
      built.quickToggle.node.addEventListener('click', function () { adv.details.open = !built.quickToggle.isOn(); });
    }
    var ag = el('div', 'cso-qc-grid');
    ag.append(
      makeField('Supporting Context (English)', taCtxEn, { full: true }),
      makeField('Supporting Context (\u0B13\u0B21\u0B3C\u0B3F\u0B06)', taCtxOr, { full: true, actionEl: createOdiaTranslateBtn({ getSource: function () { return taCtxEn.value; }, targetInput: taCtxOr }) })
    );
    adv.body.appendChild(ag);
    built.shell.appendChild(adv.details);

    var foot = el('div', 'cso-qc-footer');
    var btnDraft = el('button', 'cso-qc-btn', 'Save Draft (Inactive)'); btnDraft.type = 'button';
    btnDraft.addEventListener('click', function () { submitBanner(false); });
    var btnPub = el('button', 'cso-qc-btn cso-qc-btn--primary', 'Publish Live Now \u2192'); btnPub.type = 'button';
    btnPub.addEventListener('click', function () { submitBanner(true); });
    var liveLink = el('a', 'cso-qc-btn', 'View Homepage \u2197'); liveLink.href = '/'; liveLink.target = '_blank'; liveLink.rel = 'noopener noreferrer';
    foot.append(btnDraft, btnPub, liveLink, statusEl);
    built.shell.appendChild(foot);
    built.shell.appendChild(renderHomepageSectionsTogglePanel().node);
    built.shell.appendChild(renderLatestUpdatesControlPanel().node);

    // Hydrate current live banner from D1
    apiFetch('/api/admin/banner').then(function (b) {
      if (!b) return;
      chkActive.checked = Boolean(b.active);
      inBadge.value = b.badge_label || 'LIVE';
      selSev.value = b.severity || 'info';
      inHeadEn.value = b.headline || '';
      inHeadOr.value = b.headline_or || '';
      taCtxEn.value = b.context || '';
      taCtxOr.value = b.context_or || '';
      inCtaText.value = b.ctaText || '';
      inCtaUrl.value = b.ctaUrl || '';
      updatePreview();
    }).catch(function () { updatePreview(); });
    updatePreview();
  }

  // =========================================================================
  // WORKFLOW 7: NAVIGATION MANAGER (nav-manager) — Header, Footer & Submenus
  // =========================================================================
  function renderQuickNavManager(root, headerActions) {
    var activeTab = 'header';
    var items = [];
    var headerParents = [];
    var editingItem = null;
    var statusEl = el('span', 'cso-qc-status');
    statusEl.setAttribute('role', 'status');

    var TABS = [
      { key: 'header', label: 'Header Links', endpoint: '/api/admin/nav/header', location: 'header' },
      { key: 'footer', label: 'Footer Links', endpoint: '/api/admin/nav/footer', location: 'footer' },
      { key: 'submenu', label: 'Submenu / Dropdown Links', endpoint: '/api/admin/nav/mega-menu', location: 'mega_menu' }
    ];

    function currentTabCfg() {
      return TABS.find(function (t) { return t.key === activeTab; }) || TABS[0];
    }

    var inLblEn = el('input', 'cso-qc-input'); inLblEn.id = 'qcNavLblEn'; inLblEn.placeholder = 'e.g., Jobs / Schemes / Privacy Policy';
    var inLblOr = el('input', 'cso-qc-input'); inLblOr.id = 'qcNavLblOr'; inLblOr.placeholder = '\u0B1A\u0B3E\u0B15\u0B3F\u0B30\u0B3F / \u0B2F\u0B4B\u0B1C\u0B28\u0B3E';
    var inUrl = el('input', 'cso-qc-input'); inUrl.id = 'qcNavUrl'; inUrl.placeholder = '/jobs/ or https://\u2026';
    var inIcon = el('input', 'cso-qc-input'); inIcon.id = 'qcNavIcon'; inIcon.placeholder = 'Optional icon/emoji (e.g. \uD83D\uDCBC)';
    var inBadge = el('input', 'cso-qc-input'); inBadge.id = 'qcNavBadge'; inBadge.placeholder = 'Optional badge (e.g. NEW)';
    var selCol = el('select', 'cso-qc-select'); selCol.id = 'qcNavCol';
    var selParent = el('select', 'cso-qc-select'); selParent.id = 'qcNavParent';
    var selStatus = el('select', 'cso-qc-select'); selStatus.id = 'qcNavStatus';
    selStatus.append(new Option('Published (Live)', 'published'), new Option('Draft (Hidden)', 'draft'));
    var chkNewTab = el('input'); chkNewTab.type = 'checkbox'; chkNewTab.id = 'qcNavNewTab';

    var colFieldWrap = makeField('Column Group', selCol);
    var parentFieldWrap = makeField('Parent Header Item', selParent);
    var formHeading = el('h3', 'cso-qc-card-title', 'Add Link');
    var saveBtn = el('button', 'cso-qc-btn cso-qc-btn--primary', 'Save & Publish Link \u2192');
    saveBtn.type = 'button';
    var cancelBtn = el('button', 'cso-qc-btn', 'Cancel Edit');
    cancelBtn.type = 'button';
    cancelBtn.hidden = true;

    var tabBar = el('div', 'cso-qc-tabs');
    var listHost = el('div', 'cso-qc-repeater');

    function syncLocationFields() {
      var isFooter = activeTab === 'footer';
      var isSub = activeTab === 'submenu';
      colFieldWrap.hidden = !(isFooter || isSub);
      parentFieldWrap.hidden = !isSub;
      clear(selCol);
      (isFooter ? FOOTER_COLUMNS : MEGA_COLUMNS).forEach(function (c) { selCol.appendChild(new Option(c, c)); });
      clear(selParent);
      selParent.appendChild(new Option('\u2014 Top Level / None \u2014', ''));
      headerParents.forEach(function (p) { selParent.appendChild(new Option(p.label_en, p.id)); });
    }

    function resetForm() {
      editingItem = null;
      formHeading.textContent = 'Add New ' + currentTabCfg().label.replace(/s$/, '');
      saveBtn.textContent = 'Save & Publish Link \u2192';
      cancelBtn.hidden = true;
      inLblEn.value = ''; inLblOr.value = ''; inUrl.value = '/';
      inIcon.value = ''; inBadge.value = '';
      selStatus.value = 'published';
      chkNewTab.checked = false;
    }

    function populateForm(it) {
      editingItem = it;
      formHeading.textContent = 'Edit Link: ' + (it.label_en || '');
      saveBtn.textContent = 'Save Changes';
      cancelBtn.hidden = false;
      inLblEn.value = it.label_en || '';
      inLblOr.value = it.label_or || '';
      inUrl.value = it.url || '/';
      inIcon.value = it.icon_key || '';
      inBadge.value = it.badge_text_en || '';
      if (it.column_group) selCol.value = it.column_group;
      if (it.parent_item_id) selParent.value = it.parent_item_id;
      selStatus.value = it.status || 'published';
      chkNewTab.checked = Boolean(it.open_new_tab);
      inLblEn.focus();
    }

    function moveLink(idx, delta) {
      var tgt = idx + delta;
      if (tgt < 0 || tgt >= items.length) return;
      var ordered = items.map(function (x) { return x.id; });
      var tmp = ordered[idx];
      ordered[idx] = ordered[tgt];
      ordered[tgt] = tmp;
      apiFetch(currentTabCfg().endpoint, { method: 'POST', body: { action: 'reorder', ordered_ids: ordered } })
        .then(function () { bustHomeCache('nav'); toast('Navigation order saved!', 'ok'); loadTab(); })
        .catch(function (e) { toast(e.message, 'crimson'); });
    }

    function drawList() {
      clear(listHost);
      if (!items.length) {
        listHost.appendChild(el('p', 'cso-qc-hint', 'No links configured in ' + currentTabCfg().label + ' yet. Add your first link above.'));
        return;
      }
      items.forEach(function (it, idx) {
        var row = el('div', 'cso-qc-list-row');
        var info = el('div', 'cso-qc-list-info');
        info.appendChild(el('strong', '', (it.icon_key ? it.icon_key + ' ' : '') + it.label_en + (it.label_or ? ' \u00B7 ' + it.label_or : '')));
        info.appendChild(el('div', 'cso-qc-hint', [it.url, it.column_group || '', '#' + (it.sort_order || idx + 1), String(it.status || 'published').toUpperCase()].filter(Boolean).join(' \u00B7 ')));
        var acts = el('div', 'cso-qc-list-acts');
        var bUp = el('button', 'cso-qc-btn', '\u2191'); bUp.type = 'button'; bUp.disabled = idx === 0; bUp.title = 'Move Up';
        bUp.addEventListener('click', function () { moveLink(idx, -1); });
        var bDn = el('button', 'cso-qc-btn', '\u2193'); bDn.type = 'button'; bDn.disabled = idx === items.length - 1; bDn.title = 'Move Down';
        bDn.addEventListener('click', function () { moveLink(idx, 1); });
        var bEd = el('button', 'cso-qc-btn', 'Edit'); bEd.type = 'button';
        bEd.addEventListener('click', function () { populateForm(it); });
        var bDel = el('button', 'cso-qc-btn cso-qc-btn--danger', 'Delete'); bDel.type = 'button';
        bDel.addEventListener('click', function () {
          if (!window.confirm('Delete navigation link "' + it.label_en + '"?')) return;
          apiFetch(currentTabCfg().endpoint + '/' + encodeURIComponent(it.id), { method: 'DELETE' })
            .then(function () { bustHomeCache('nav'); toast('Navigation link deleted!', 'ok'); loadTab(); })
            .catch(function (e) { toast(e.message, 'crimson'); });
        });
        acts.append(bUp, bDn, bEd, bDel);
        row.append(info, acts);
        listHost.appendChild(row);
      });
    }

    function drawTabs() {
      clear(tabBar);
      TABS.forEach(function (t) {
        var b = el('button', 'cso-qc-tab' + (activeTab === t.key ? ' is-active' : ''), t.label);
        b.type = 'button';
        b.addEventListener('click', function () {
          activeTab = t.key;
          resetForm();
          drawTabs();
          syncLocationFields();
          loadTab();
        });
        tabBar.appendChild(b);
      });
    }

    function loadTab() {
      clear(listHost);
      listHost.appendChild(el('p', 'cso-qc-hint', 'Loading ' + currentTabCfg().label + ' from D1\u2026'));
      apiFetch(currentTabCfg().endpoint).then(function (d) {
        items = (d && Array.isArray(d.items)) ? d.items : [];
        if (d && Array.isArray(d.header_parents)) {
          headerParents = d.header_parents;
          syncLocationFields();
        }
        drawList();
      }).catch(function (err) {
        clear(listHost);
        listHost.appendChild(el('p', 'cso-qc-hint', 'Failed to load links: ' + err.message));
      });
    }

    function saveNavLink(overrideStatus) {
      var lblEn = inLblEn.value.trim();
      var urlVal = inUrl.value.trim();
      if (!lblEn || !urlVal) {
        statusEl.textContent = 'Label (EN) and URL are required.';
        toast('Enter both Label (EN) and URL.', 'amber');
        return;
      }
      var cfg = currentTabCfg();
      var payload = {
        menu_location: cfg.location,
        label_en: lblEn,
        label_or: inLblOr.value.trim(),
        url: urlVal,
        icon_key: inIcon.value.trim(),
        badge_text_en: inBadge.value.trim(),
        column_group: (activeTab === 'footer' || activeTab === 'submenu') ? selCol.value : '',
        parent_item_id: activeTab === 'submenu' ? (selParent.value || null) : null,
        open_new_tab: chkNewTab.checked,
        sort_order: editingItem ? Number(editingItem.sort_order || 10) : (items.length + 1),
        status: overrideStatus || selStatus.value || 'published'
      };
      var ep = editingItem ? (cfg.endpoint + '/' + encodeURIComponent(editingItem.id)) : cfg.endpoint;
      statusEl.textContent = 'Saving navigation link to D1\u2026';
      apiFetch(ep, { method: editingItem ? 'PUT' : 'POST', body: payload })
        .then(function () {
          bustHomeCache('nav');
          statusEl.textContent = '\u2713 Saved & edge caches invalidated!';
          toast('Navigation link saved live!', 'ok');
          resetForm();
          loadTab();
        })
        .catch(function (err) {
          statusEl.textContent = '\u2715 ' + err.message;
          toast(err.message || 'Save failed.', 'crimson');
        });
    }

    var translateAllBtn = createTranslateAllBtn(function () {
      return [
        { key: 'label_or', getEn: function () { return inLblEn.value; }, getOr: function () { return inLblOr.value; }, targetInput: inLblOr }
      ];
    });

    var built = buildQuickShell(root, headerActions, {
      badge: '7 / 7 \u00B7 Navigation Manager',
      subtitle: 'Header, footer & submenu link editor with live reorder, add/edit/delete & instant save',
      hasAdvanced: false,
      translateAllBtn: translateAllBtn,
      draftLabel: 'Save Draft',
      publishLabel: 'Save & Publish Link \u2192',
      onSaveDraft: function () { saveNavLink('draft'); },
      onPublishNow: function () { saveNavLink('published'); }
    });

    built.shell.appendChild(tabBar);

    var formCard = el('section', 'cso-qc-card');
    formCard.appendChild(formHeading);
    var g = el('div', 'cso-qc-grid');
    g.append(
      makeField('Link Label (English) *', inLblEn),
      makeField('Link Label (\u0B13\u0B21\u0B3C\u0B3F\u0B06)', inLblOr, { actionEl: createOdiaTranslateBtn({ getSource: function () { return inLblEn.value; }, targetInput: inLblOr }) }),
      makeField('URL (/jobs/, /about/, https://\u2026) *', inUrl),
      makeField('Icon / Emoji (Optional)', inIcon),
      makeField('Badge Text (Optional)', inBadge),
      makeField('Status', selStatus),
      colFieldWrap,
      parentFieldWrap
    );
    var newTabLbl = el('label', 'cso-qc-check');
    newTabLbl.append(chkNewTab, el('span', '', 'Open link in new browser tab'));
    var formFoot = el('div', 'cso-qc-footer');
    saveBtn.addEventListener('click', function () { saveNavLink(); });
    cancelBtn.addEventListener('click', resetForm);
    formFoot.append(saveBtn, cancelBtn, statusEl);
    formCard.append(g, newTabLbl, formFoot);
    built.shell.appendChild(formCard);

    var listCard = el('section', 'cso-qc-card');
    listCard.appendChild(el('h3', 'cso-qc-card-title', 'Live Navigation Links (Reorder with \u2191 / \u2193)'));
    listCard.appendChild(listHost);
    built.shell.appendChild(listCard);

    drawTabs();
    syncLocationFields();
    resetForm();
    loadTab();
  }

  // =========================================================================
  // WORKFLOW 8: INFORMATIVE ARTICLE / GUIDE (guides/new)
  // =========================================================================
  function renderQuickInformativeGuide(root, headerActions) {
    if (window.CSOGuidesPublishingStudio && typeof window.CSOGuidesPublishingStudio.renderComposer === 'function') {
      window.CSOGuidesPublishingStudio.renderComposer(root, headerActions, null, {
        onBack: function () {
          if (window.CSOStudio && typeof window.CSOStudio.openGuidesPublishingTab === 'function') {
            window.CSOStudio.openGuidesPublishingTab('all');
          } else if (window.CSOGuidesPublishingStudio.renderFolderView) {
            window.CSOGuidesPublishingStudio.renderFolderView(root, headerActions, 'all');
          }
        }
      });
      return;
    }
    clear(root);
    var card = el('section', 'cso-qc-card');
    card.appendChild(el('h3', 'cso-qc-card-title', '\uD83D\uDCDA Informative Articles & Guides Studio'));
    card.appendChild(el('p', 'cso-qc-hint', 'Reload Admin Studio to initialize the Informative Guides composer script.'));
    root.appendChild(card);
  }

  // =========================================================================
  // 4. DISPATCHER FOR ALL 8 + CREATE NEW WORKFLOWS
  // =========================================================================
  var ROUTE_META = {
    'guides/new': { folder: 'Informative Articles & Guides', title: 'New Informative Article / Guide', pill: 'Templates \u00B7 R2 Media \u00B7 AI \u00B7 Live Preview', render: renderQuickInformativeGuide },
    'jobs/new': { folder: 'Jobs', title: 'New Job Alert', pill: 'Quick Publish \u00B7 D1 / Vectorize', render: renderQuickJobAlert },
    'careers/new': { folder: 'Careers', title: 'New Career Roadmap', pill: 'Quick Publish \u00B7 D1 / Vectorize', render: renderQuickCareerRoadmap },
    'current-affairs/new': { folder: 'Study Library', title: 'New Current Affairs Post', pill: 'Quick Publish \u00B7 D1 / Vectorize', render: renderQuickCurrentAffairs },
    'mock-tests/new': { folder: 'Study Library', title: 'New Mock Test', pill: 'CBT Quick Builder \u00B7 D1', render: renderQuickMockTest },
    'syllabus': { folder: 'Study Library', title: 'Upload Syllabus / PYQ Resource', pill: 'Direct R2 PDF \u00B7 Vectorize', render: renderQuickSyllabusResource },
    'banner': { folder: 'Web & Page Studio', title: 'Homepage Broadcast', pill: 'Live Sitewide Bar \u00B7 D1', render: renderQuickHomepageBroadcast },
    'nav-manager': { folder: 'Web & Page Studio', title: 'Navigation Manager', pill: 'Header \u00B7 Footer \u00B7 Submenus', render: renderQuickNavManager }
  };

  function open(targetRoute, workspaceRoot, headerActions) {
    var cfg = ROUTE_META[targetRoute];
    if (!cfg || !workspaceRoot) return false;
    cfg.render(workspaceRoot, headerActions);
    return cfg;
  }

  window.CSOAiTools = {
    translateToOdia: translateToOdia,
    translateFieldsBatch: translateFieldsBatch,
    suggestMeta: suggestMeta,
    createOdiaTranslateBtn: createOdiaTranslateBtn,
    createTranslateAllBtn: createTranslateAllBtn,
    renderMetaSuggester: renderMetaSuggester,
    createQuickModeToggle: createQuickModeToggle,
    readQuickModePref: readQuickModePref,
    parseBulkMcqs: parseBulkMcqs
  };

  window.CSOQuickCreate = {
    ROUTE_META: ROUTE_META,
    open: open,
    parseBulkMcqs: parseBulkMcqs,
    bustHomeCache: bustHomeCache
  };
})(window, document);
