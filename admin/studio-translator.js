/**
 * Common Sense Odisha — Top-Header Pinned Live EN -> Odia Translator Popover (v355)
 * - Anchored directly beneath the pinned `#btnHeaderOdiaTranslator` topbar button (`top: 64px; right: 16px; z-index: 1200; width: 420px`)
 * - Zero floating bottom-right widgets or corner overlays blocking the editor canvas
 * - Dismisses via Escape key, outside click, or explicit Close button
 * - Markdown-preserving live translation via POST /api/admin/ai-coauthor (`mode: 'translate_markdown'`)
 *   powered by the $0/month Gemini Pro-first -> Flash -> Workers AI fallback cascade
 * - 800ms debounced Live Auto-Translate toggle + instant Translate Now button + AbortController race protection
 * - 1-click Copy Odia, Insert into active Body (Odia) editor at cursor position, and Clear
 * Strict CSP-compliant: pure DOM APIs only, zero inline attributes, zero DOM layout property writes.
 */
(function (window, document) {
  'use strict';

  var AUTO_DEBOUNCE_MS = 800;

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function toast(msg, kind) {
    if (typeof window.showToast === 'function') window.showToast(msg, kind || 'info');
  }

  function isVisibleControl(node) {
    if (!node || !node.isConnected) return false;
    if (node.disabled || node.readOnly) return false;
    return node.offsetParent !== null;
  }

  function looksLikeOdiaField(node) {
    if (!node) return false;
    if (node.getAttribute('data-cso-odia-body') === '1' || node.getAttribute('data-cso-lang') === 'or') return true;
    var hint = [
      node.id || '',
      node.name || '',
      node.placeholder || '',
      node.getAttribute('aria-label') || ''
    ].join(' ');
    return /(?:_or\b|BodyOr|TitleOr|SummaryOr|HighlightsOr|odia|\u0B13\u0B21\u0B3C\u0B3F\u0B06)/i.test(hint);
  }

  function insertTextAtCursor(control, snippet) {
    if (!control) return false;
    var val = String(control.value || '');
    var start = typeof control.selectionStart === 'number' ? control.selectionStart : val.length;
    var end = typeof control.selectionEnd === 'number' ? control.selectionEnd : start;
    var needsGap = start > 0 && val.charAt(start - 1) !== '\n' && snippet.indexOf('\n') !== -1;
    var prefix = needsGap ? '\n\n' : '';
    control.value = val.slice(0, start) + prefix + snippet + val.slice(end);
    control.focus();
    var nextPos = start + prefix.length + snippet.length;
    try { control.setSelectionRange(nextPos, nextPos); } catch (_e) {}
    control.dispatchEvent(new Event('input', { bubbles: true }));
    control.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }

  function mountHeaderTranslator() {
    var wrap = document.getElementById('headerTranslatorWrap');
    var toggleBtn = document.getElementById('btnHeaderOdiaTranslator');
    if (!wrap || !toggleBtn) return;
    if (document.getElementById('csoHeaderTranslatorPopover')) return;

    var lastFocusedOdiaField = null;
    var lastFocusedAnyTextarea = null;

    document.addEventListener('focusin', function (ev) {
      var target = ev.target;
      if (!target || (target.tagName !== 'TEXTAREA' && target.tagName !== 'INPUT')) return;
      if (target.closest && target.closest('#csoHeaderTranslatorPopover')) return;
      if (target.tagName === 'TEXTAREA') {
        lastFocusedAnyTextarea = target;
      }
      if (looksLikeOdiaField(target)) {
        lastFocusedOdiaField = target;
      }
    });

    function findTargetOdiaEditor() {
      if (isVisibleControl(lastFocusedOdiaField)) return lastFocusedOdiaField;
      var guideOr = document.getElementById('guideBodyOrInput');
      if (isVisibleControl(guideOr)) return guideOr;
      var explicitOr = document.querySelector('[data-cso-odia-body="1"]');
      if (isVisibleControl(explicitOr)) return explicitOr;

      var workspace = document.getElementById('workspaceRoot') || document.body;
      var textareas = workspace.querySelectorAll('textarea');
      for (var i = 0; i < textareas.length; i++) {
        if (isVisibleControl(textareas[i]) && looksLikeOdiaField(textareas[i])) {
          return textareas[i];
        }
      }
      if (isVisibleControl(lastFocusedAnyTextarea)) return lastFocusedAnyTextarea;
      return null;
    }

    // Header-Anchored Dropdown Popover
    var popover = el('section', 'cso-htr-popover');
    popover.id = 'csoHeaderTranslatorPopover';
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-label', 'Live English to Odia Markdown Translator');
    popover.hidden = true;

    // Popover Header Bar
    var header = el('div', 'cso-htr-head');
    var headLeft = el('div', 'cso-htr-head-left');
    var titleEl = el('strong', 'cso-htr-title', '\uD83C\uDF10 Live EN \u2192 \u0B13\u0B21\u0B3C\u0B3F\u0B06 Translator');
    var mdBadge = el('span', 'cso-htr-md-badge', 'Markdown-Safe');
    headLeft.append(titleEl, mdBadge);

    var btnClose = el('button', 'cso-htr-close-btn', '\u2715 Close');
    btnClose.type = 'button';
    btnClose.id = 'btnCsoHeaderTrClose';
    btnClose.setAttribute('aria-label', 'Close Live Translator');
    header.append(headLeft, btnClose);

    // Popover Body
    var body = el('div', 'cso-htr-body');

    // v362 Synced AI Engine Selector Row (shared with #selGuideAiEngine via cso_admin_preferred_ai_model)
    var ENGINE_KEY = 'cso_admin_preferred_ai_model';
    var customProvidersCache = [];
    var envProvidersCache = [];

    function readPrefModel() {
      try {
        return String(window.localStorage.getItem(ENGINE_KEY) || 'auto').trim() || 'auto';
      } catch (_e) {
        return 'auto';
      }
    }

    function writePrefModel(val) {
      var clean = String(val || 'auto').trim() || 'auto';
      try { window.localStorage.setItem(ENGINE_KEY, clean); } catch (_e) {}
      try {
        window.dispatchEvent(new CustomEvent('cso:ai-engine-changed', { detail: { value: clean } }));
      } catch (_e2) {}
    }

    var engineRow = el('div', 'cso-htr-engine-row');
    var engineLbl = el('label', 'cso-htr-engine-lbl', '\uD83E\uDD16 Engine');
    engineLbl.setAttribute('for', 'selHeaderTranslatorAiEngine');

    var selTrEngine = el('select', 'cso-form-select cso-htr-engine-select');
    selTrEngine.id = 'selHeaderTranslatorAiEngine';
    selTrEngine.setAttribute('aria-label', 'Translator AI Engine');

    function populateTranslatorEngineSelect(list, envList) {
      var activeEnvList = Array.isArray(envList) ? envList : envProvidersCache;
      if (window.CSOAiEngineHelper && typeof window.CSOAiEngineHelper.populateSelect === 'function') {
        window.CSOAiEngineHelper.populateSelect(selTrEngine, list, activeEnvList);
        return;
      }
      var wanted = readPrefModel();
      while (selTrEngine.firstChild) selTrEngine.removeChild(selTrEngine.firstChild);
      function addGrp(lbl, opts) {
        if (!opts || !opts.length) return;
        var og = el('optgroup');
        og.label = lbl;
        opts.forEach(function (it) {
          var op = el('option', '', it.label);
          op.value = it.value;
          if (it.disabled) op.disabled = true;
          og.appendChild(op);
        });
        selTrEngine.appendChild(og);
      }
      addGrp('Auto Smart Cascade', [{ value: 'auto', label: '\u2728 Auto Smart Cascade' }]);
      var enabledCustom = (Array.isArray(list) ? list : []).filter(function (p) { return p && p.id && p.enabled !== false; });
      if (enabledCustom.length) {
        addGrp('Custom Added AI APIs', enabledCustom.map(function (p) {
          return { value: 'custom:' + p.id, label: '\uD83D\uDD11 ' + p.label + ' (' + p.model_id + ')' };
        }));
      }
      var activeEnv = activeEnvList.filter(function (ep) { return ep && ep.value && ep.configured !== false; });
      if (activeEnv.length) {
        addGrp('Configured Worker Secrets', activeEnv.map(function (ep) {
          return { value: ep.value, label: '\uD83D\uDD10 ' + ep.label + ' (' + ep.model_id + ')' };
        }));
      }
      addGrp('Google AI Studio ($0 Free Tier)', [
        { value: 'gemini:gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
        { value: 'gemini:gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite' },
        { value: 'gemini:gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
        { value: 'gemini:gemini-2.0-flash-lite', label: 'Gemini 2.0 Flash-Lite' }
      ]);
      addGrp('Cloudflare Workers AI (10K Neurons/Day)', [
        { value: 'workers:@cf/google/gemma-4-26b-a4b-it', label: 'Gemma 4 26B A4B (Low-Neuron)' },
        { value: 'workers:@cf/meta/llama-3.3-70b-instruct-fp8-fast', label: 'Llama 3.3 70B Instruct' },
        { value: 'workers:@cf/meta/llama-3.1-8b-instruct-fp8-fast', label: 'Llama 3.1 8B Fast' }
      ]);
      addGrp('Zero-Quota Local Mode', [
        { value: 'local:deterministic', label: '\u26A1 Local Deterministic (Zero API)' }
      ]);
      var found = false;
      for (var k = 0; k < selTrEngine.options.length; k++) {
        if (selTrEngine.options[k].value === wanted && !selTrEngine.options[k].disabled) { found = true; break; }
      }
      selTrEngine.value = found ? wanted : 'auto';
    }

    populateTranslatorEngineSelect(customProvidersCache, envProvidersCache);
    selTrEngine.addEventListener('change', function () {
      writePrefModel(selTrEngine.value);
    });

    var btnTrManageApis = el('button', 'cso-pill-btn cso-htr-api-btn', '\uD83D\uDD11 APIs');
    btnTrManageApis.type = 'button';
    btnTrManageApis.id = 'btnHeaderTrManageApis';
    btnTrManageApis.title = 'Manage Custom AI Providers (12 Presets: Groq, OpenRouter, Sarvam Odia, Claude, OpenAI, Grok, Meta Muse, HF)';
    btnTrManageApis.addEventListener('click', function () {
      if (typeof window.CSOOpenAiProvidersModal === 'function') {
        closePopover(false);
        window.CSOOpenAiProvidersModal();
      } else {
        toast('Open Informative Articles & Guides to manage custom AI APIs.', 'info');
      }
    });

    engineRow.append(engineLbl, selTrEngine, btnTrManageApis);

    function loadTranslatorCustomProviders() {
      fetch('/api/admin/ai-providers', { method: 'GET', credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (d) {
          if (d && Array.isArray(d.providers)) {
            customProvidersCache = d.providers;
            envProvidersCache = Array.isArray(d.configured_env_providers) ? d.configured_env_providers : [];
            populateTranslatorEngineSelect(customProvidersCache, envProvidersCache);
          }
        })
        .catch(function () {});
    }

    window.addEventListener('cso:ai-providers-updated', function (ev) {
      var list = (ev && ev.detail && ev.detail.providers) || customProvidersCache;
      var envList = (ev && ev.detail && ev.detail.configured_env_providers) || envProvidersCache;
      customProvidersCache = list;
      envProvidersCache = envList;
      populateTranslatorEngineSelect(customProvidersCache, envProvidersCache);
    });
    window.addEventListener('cso:ai-engine-changed', function (ev) {
      var nextVal = ev && ev.detail && ev.detail.value;
      if (nextVal && selTrEngine.value !== nextVal) {
        populateTranslatorEngineSelect(customProvidersCache, envProvidersCache);
      }
    });
    loadTranslatorCustomProviders();

    // Top Box: English Input
    var topSec = el('div', 'cso-htr-section');
    var topHead = el('div', 'cso-htr-sec-head');
    var lblEn = el('label', 'cso-htr-label', 'English Input (Text, Lists & Pipe Tables)');
    lblEn.setAttribute('for', 'csoHeaderTrInputEn');
    var charCount = el('span', 'cso-htr-char-count', '0 chars');
    charCount.id = 'csoHeaderTrCharCount';
    topHead.append(lblEn, charCount);

    var inputEn = el('textarea', 'cso-form-textarea cso-htr-textarea');
    inputEn.id = 'csoHeaderTrInputEn';
    inputEn.rows = 5;
    inputEn.placeholder = 'Paste or type any English paragraph, bullet list, or Markdown table...';

    var ctrlRow = el('div', 'cso-htr-ctrl-row');
    var autoLbl = el('label', 'cso-htr-auto-check');
    var chkAuto = el('input');
    chkAuto.type = 'checkbox';
    chkAuto.id = 'chkCsoHeaderTrAuto';
    chkAuto.checked = true;
    autoLbl.append(chkAuto, el('span', '', 'Live Auto-Translate (0.8s)'));

    var btnRun = el('button', 'cso-btn cso-btn-primary cso-htr-run-btn', '\u26A1 Translate Now');
    btnRun.type = 'button';
    btnRun.id = 'btnCsoHeaderTrRun';
    ctrlRow.append(autoLbl, btnRun);

    topSec.append(topHead, inputEn, ctrlRow);

    // Status Strip
    var statusStrip = el('div', 'cso-htr-status', 'Ready \u00B7 Preserves headings, pipe tables, lists & URLs');
    statusStrip.id = 'csoHeaderTrStatus';
    statusStrip.setAttribute('role', 'status');
    statusStrip.setAttribute('aria-live', 'polite');

    // Bottom Box: Live Odia Output
    var botSec = el('div', 'cso-htr-section');
    var botHead = el('div', 'cso-htr-sec-head');
    var lblOr = el('label', 'cso-htr-label', 'Live \u0B13\u0B21\u0B3C\u0B3F\u0B06 Output (Markdown Preserved)');
    lblOr.setAttribute('for', 'csoHeaderTrOutputOr');
    var provTag = el('span', 'cso-htr-prov-tag', '');
    provTag.id = 'csoHeaderTrProvider';
    provTag.hidden = true;
    botHead.append(lblOr, provTag);

    var outputOr = el('textarea', 'cso-form-textarea cso-htr-textarea is-output');
    outputOr.id = 'csoHeaderTrOutputOr';
    outputOr.rows = 6;
    outputOr.placeholder = '\u0B13\u0B21\u0B3C\u0B3F\u0B06 \u0B05\u0B28\u0B41\u0B2C\u0B3E\u0B26 \u0B0F\u0B20\u0B3E\u0B30\u0B47 \u0B26\u0B47\u0B16\u0B3E\u0B2F\u0B3F\u0B2C...';

    var actionsRow = el('div', 'cso-htr-actions');
    var btnCopy = el('button', 'cso-pill-btn cso-htr-act-btn', '\uD83D\uDCCB Copy \u0B13\u0B21\u0B3C\u0B3F\u0B06');
    btnCopy.type = 'button';
    btnCopy.id = 'btnCsoHeaderTrCopy';

    var btnInsert = el('button', 'cso-pill-btn is-accent cso-htr-act-btn', '\u2795 Insert into Body (\u0B13\u0B21\u0B3C\u0B3F\u0B06)');
    btnInsert.type = 'button';
    btnInsert.id = 'btnCsoHeaderTrInsert';

    var btnClear = el('button', 'cso-pill-btn cso-htr-act-btn', '\uD83E\uDDF9 Clear');
    btnClear.type = 'button';
    btnClear.id = 'btnCsoHeaderTrClear';

    actionsRow.append(btnCopy, btnInsert, btnClear);
    botSec.append(botHead, outputOr, actionsRow);

    body.append(engineRow, topSec, statusStrip, botSec);
    popover.append(header, body);
    wrap.appendChild(popover);

    // ---- Open / Close Popover (Click Toggle, Escape Key & Outside Click) ----
    function openPopover() {
      popover.hidden = false;
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.classList.add('is-active');
      inputEn.focus();
    }

    function closePopover(restoreFocus) {
      if (popover.hidden) return;
      popover.hidden = true;
      toggleBtn.setAttribute('aria-expanded', 'false');
      toggleBtn.classList.remove('is-active');
      if (restoreFocus) toggleBtn.focus();
    }

    function togglePopover() {
      if (popover.hidden) openPopover();
      else closePopover(false);
    }

    toggleBtn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      togglePopover();
    });

    btnClose.addEventListener('click', function () {
      closePopover(true);
    });

    document.addEventListener('click', function (ev) {
      if (popover.hidden) return;
      if (wrap.contains(ev.target)) return;
      closePopover(false);
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !popover.hidden) {
        ev.stopPropagation();
        closePopover(true);
      }
    });

    // ---- Live Debounced & Manual Markdown-Safe Translation ----
    var debounceTimer = null;
    var activeAbort = null;
    var lastTranslatedSource = '';

    function updateCharCount() {
      var len = inputEn.value.length;
      charCount.textContent = len.toLocaleString() + ' chars';
    }

    function runTranslation(forceRun) {
      var src = inputEn.value.trim();
      if (src.length < 2) {
        if (forceRun) {
          statusStrip.textContent = 'Enter at least 2 characters of English text or Markdown.';
          inputEn.focus();
        }
        return Promise.resolve(null);
      }
      if (!forceRun && src === lastTranslatedSource && outputOr.value.trim()) {
        return Promise.resolve(null);
      }
      if (activeAbort && typeof activeAbort.abort === 'function') {
        try { activeAbort.abort(); } catch (_e) {}
      }
      activeAbort = typeof AbortController === 'function' ? new AbortController() : null;

      btnRun.disabled = true;
      statusStrip.classList.remove('is-error', 'is-ok');
      statusStrip.classList.add('is-busy');
      statusStrip.textContent = '\u23F3 Translating Markdown & tables to \u0B13\u0B21\u0B3C\u0B3F\u0B06\u2026';

      var fetchOpts = {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-CSO-CSRF': '1'
        },
        body: JSON.stringify({
          mode: 'translate_markdown',
          input: src,
          preferred_model: (selTrEngine && selTrEngine.value && selTrEngine.value !== '__none_custom__') ? selTrEngine.value : readPrefModel()
        })
      };
      if (activeAbort) fetchOpts.signal = activeAbort.signal;

      return fetch('/api/admin/ai-coauthor', fetchOpts)
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (d) {
            if (!r.ok) throw new Error((d && (d.error || d.message)) || ('HTTP ' + r.status));
            return d;
          });
        })
        .then(function (res) {
          var d = (res && res.data) || {};
          var outMd = String(d.translated_markdown || d.translated_or || '').trim();
          if (!outMd) throw new Error('Empty translation returned.');
          outputOr.value = outMd;
          lastTranslatedSource = src;
          var prov = (res && (res.provider_model || res.provider_label || res.provider)) || 'Gemini Flash';
          var chunks = Number(d.chunks_count || (res && res.chunks_count) || 1);
          provTag.textContent = prov + (chunks > 1 ? (' \u00B7 ' + chunks + ' chunks') : '');
          provTag.hidden = false;
          statusStrip.classList.remove('is-busy', 'is-error');
          statusStrip.classList.add('is-ok');
          statusStrip.textContent = '\u2713 Live \u0B13\u0B21\u0B3C\u0B3F\u0B06 ready (' + outMd.length.toLocaleString() + ' chars \u00B7 Markdown preserved)';
          return outMd;
        })
        .catch(function (err) {
          if (err && err.name === 'AbortError') return null;
          statusStrip.classList.remove('is-busy', 'is-ok');
          statusStrip.classList.add('is-error');
          statusStrip.textContent = '\u2715 ' + (err && err.message ? err.message : 'Translation failed');
          return null;
        })
        .finally(function () {
          btnRun.disabled = false;
        });
    }

    function scheduleAutoTranslate() {
      updateCharCount();
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      if (!chkAuto.checked) return;
      var src = inputEn.value.trim();
      if (src.length < 2) {
        statusStrip.classList.remove('is-busy', 'is-error', 'is-ok');
        statusStrip.textContent = 'Ready \u00B7 Preserves headings, pipe tables, lists & URLs';
        return;
      }
      statusStrip.classList.remove('is-error', 'is-ok');
      statusStrip.textContent = 'Auto-translating in 0.8s\u2026';
      debounceTimer = window.setTimeout(function () {
        debounceTimer = null;
        runTranslation(false);
      }, AUTO_DEBOUNCE_MS);
    }

    inputEn.addEventListener('input', scheduleAutoTranslate);
    inputEn.addEventListener('paste', function () {
      window.setTimeout(scheduleAutoTranslate, 20);
    });
    btnRun.addEventListener('click', function () {
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      runTranslation(true);
    });

    // ---- 1-Click Output Actions ----
    btnCopy.addEventListener('click', function () {
      var val = outputOr.value.trim();
      if (!val) {
        toast('Nothing to copy yet \u2014 enter English text to translate.', 'amber');
        return;
      }
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(val).then(function () {
          statusStrip.textContent = '\u2713 Copied \u0B13\u0B21\u0B3C\u0B3F\u0B06 output to clipboard!';
          toast('Copied \u0B13\u0B21\u0B3C\u0B3F\u0B06 translation to clipboard!', 'ok');
        }).catch(function () {
          outputOr.select();
          toast('Select and copy from the output box.', 'amber');
        });
      } else {
        outputOr.select();
        toast('Selected \u0B13\u0B21\u0B3C\u0B3F\u0B06 output \u2014 press Ctrl+C to copy.', 'info');
      }
    });

    btnInsert.addEventListener('click', function () {
      var val = outputOr.value.trim();
      if (!val) {
        toast('Translate English text first before inserting.', 'amber');
        return;
      }
      var target = findTargetOdiaEditor();
      if (target) {
        insertTextAtCursor(target, val);
        statusStrip.classList.remove('is-error');
        statusStrip.classList.add('is-ok');
        statusStrip.textContent = '\u2713 Inserted into active Body (\u0B13\u0B21\u0B3C\u0B3F\u0B06) editor!';
        toast('Inserted \u0B13\u0B21\u0B3C\u0B3F\u0B06 Markdown at cursor!', 'ok');
      } else {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(val).catch(function () {});
        }
        statusStrip.textContent = 'No open Odia editor detected \u2014 copied to clipboard instead.';
        toast('Open a composer with Body (\u0B13\u0B21\u0B3C\u0B3F\u0B06) first \u2014 output copied to clipboard.', 'amber');
      }
    });

    btnClear.addEventListener('click', function () {
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      if (activeAbort && typeof activeAbort.abort === 'function') {
        try { activeAbort.abort(); } catch (_e) {}
      }
      inputEn.value = '';
      outputOr.value = '';
      lastTranslatedSource = '';
      provTag.hidden = true;
      updateCharCount();
      statusStrip.classList.remove('is-busy', 'is-error', 'is-ok');
      statusStrip.textContent = 'Cleared \u00B7 Ready for next translation';
      inputEn.focus();
    });

    window.CSOStudioTranslator = {
      open: openPopover,
      close: function () { closePopover(false); },
      toggle: togglePopover,
      translateNow: function () { return runTranslation(true); },
      openWithText: function (enText, autoRun) {
        openPopover();
        if (typeof enText === 'string') {
          inputEn.value = enText;
          updateCharCount();
          if (autoRun !== false && enText.trim().length >= 2) {
            runTranslation(true);
          }
        }
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountHeaderTranslator);
  } else {
    mountHeaderTranslator();
  }
})(window, document);
