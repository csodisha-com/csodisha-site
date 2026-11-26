/**
 * Common Sense Odisha — Floating Live EN -> Odia Translator Widget (v354)
 * - Collapsible, dockable, pointer-draggable floating translator available across all 10 Admin Studio folders
 * - Minimized by default to a compact bottom-right pill (`Live Odia Translator`) so it never blocks editor fields
 * - Markdown-preserving live translation via POST /api/admin/ai-coauthor (`mode: 'translate_markdown'`)
 *   powered by the $0/month Gemini Pro-first -> Flash -> Workers AI fallback cascade
 * - Debounced 800ms Live Auto-Translate toggle + instant Translate Now button + AbortController race protection
 * - 1-click Copy Odia, Insert into active Body (Odia) editor at cursor position, and Clear
 * Strict CSP-compliant: pure DOM APIs only, CSS-class dock positioning (zero inline attributes, zero DOM property mutation).
 */
(function (window, document) {
  'use strict';

  var POS_STORAGE_KEY = 'cso_studio_translator_pos_v354';
  var DOCK_POSITIONS = ['br', 'bl', 'tr', 'tl', 'mr', 'ml'];
  var DOCK_LABELS = {
    br: 'Bottom Right',
    bl: 'Bottom Left',
    tr: 'Top Right',
    tl: 'Top Left',
    mr: 'Middle Right',
    ml: 'Middle Left'
  };
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

  function mountFloatingTranslator() {
    if (document.getElementById('csoStudioTranslatorRoot')) return;

    var lastFocusedOdiaField = null;
    var lastFocusedAnyTextarea = null;

    document.addEventListener('focusin', function (ev) {
      var target = ev.target;
      if (!target || (target.tagName !== 'TEXTAREA' && target.tagName !== 'INPUT')) return;
      if (target.closest && target.closest('#csoStudioTranslatorRoot')) return;
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

    var savedPos = 'br';
    try {
      var stored = window.localStorage.getItem(POS_STORAGE_KEY);
      if (stored && DOCK_POSITIONS.indexOf(stored) !== -1) savedPos = stored;
    } catch (_e) {}

    var root = el('aside', 'cso-ftr-root is-pos-' + savedPos);
    root.id = 'csoStudioTranslatorRoot';
    root.setAttribute('aria-label', 'Floating Live English to Odia Translator');

    // Minimized Pill Launcher
    var launcher = el('button', 'cso-ftr-launcher');
    launcher.type = 'button';
    launcher.id = 'btnCsoFloatTranslatorToggle';
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-controls', 'csoFloatTranslatorPanel');
    launcher.title = 'Open Floating Live EN \u2192 \u0B13\u0B21\u0B3C\u0B3F\u0B06 Translator';
    launcher.append(
      el('span', 'cso-ftr-launcher-ico', '\uD83C\uDF10'),
      el('span', 'cso-ftr-launcher-txt', 'Live \u0B13\u0B21\u0B3C\u0B3F\u0B06 Translator')
    );

    // Expanded Floating Panel
    var panel = el('section', 'cso-ftr-panel');
    panel.id = 'csoFloatTranslatorPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Live English to Odia Markdown Translator');
    panel.hidden = true;

    // Draggable Header Bar
    var header = el('div', 'cso-ftr-header');
    header.id = 'csoFloatTranslatorDragHandle';
    header.title = 'Drag header to dock translator to any screen corner';

    var headerLeft = el('div', 'cso-ftr-header-left');
    var grip = el('span', 'cso-ftr-grip', '\u22EE\u22EE');
    grip.setAttribute('aria-hidden', 'true');
    var titleEl = el('strong', 'cso-ftr-title', '\uD83C\uDF10 Live EN \u2192 \u0B13\u0B21\u0B3C\u0B3F\u0B06');
    var mdBadge = el('span', 'cso-ftr-md-badge', 'Markdown-Safe');
    headerLeft.append(grip, titleEl, mdBadge);

    var headerRight = el('div', 'cso-ftr-header-actions');
    var btnDock = el('button', 'cso-ftr-icon-btn', '\u21C4');
    btnDock.type = 'button';
    btnDock.id = 'btnCsoFloatDockCycle';
    btnDock.setAttribute('aria-label', 'Switch translator dock corner');
    btnDock.title = 'Switch dock corner (' + DOCK_LABELS[savedPos] + ')';

    var btnClose = el('button', 'cso-ftr-icon-btn', '\u2715');
    btnClose.type = 'button';
    btnClose.id = 'btnCsoFloatClose';
    btnClose.setAttribute('aria-label', 'Minimize Live Translator');
    btnClose.title = 'Minimize (Esc)';
    headerRight.append(btnDock, btnClose);

    header.append(headerLeft, headerRight);

    // Body wrapper
    var body = el('div', 'cso-ftr-body');

    // Top Box: English Input
    var topSec = el('div', 'cso-ftr-section');
    var topHead = el('div', 'cso-ftr-sec-head');
    var lblEn = el('label', 'cso-ftr-label', 'English Input (Text, Lists & Tables)');
    lblEn.setAttribute('for', 'csoFloatInputEn');
    var charCount = el('span', 'cso-ftr-char-count', '0 chars');
    charCount.id = 'csoFloatCharCount';
    topHead.append(lblEn, charCount);

    var inputEn = el('textarea', 'cso-form-textarea cso-ftr-textarea');
    inputEn.id = 'csoFloatInputEn';
    inputEn.rows = 5;
    inputEn.placeholder = 'Paste or type any English paragraph, bullet list, or Markdown table...';

    var ctrlRow = el('div', 'cso-ftr-ctrl-row');
    var autoLbl = el('label', 'cso-ftr-auto-check');
    var chkAuto = el('input');
    chkAuto.type = 'checkbox';
    chkAuto.id = 'chkCsoFloatAutoTranslate';
    chkAuto.checked = true;
    autoLbl.append(chkAuto, el('span', '', 'Live Auto-Translate (0.8s)'));

    var btnRun = el('button', 'cso-btn cso-btn-primary cso-ftr-run-btn', '\u26A1 Translate Now');
    btnRun.type = 'button';
    btnRun.id = 'btnCsoFloatTranslateNow';
    ctrlRow.append(autoLbl, btnRun);

    topSec.append(topHead, inputEn, ctrlRow);

    // Status Strip
    var statusStrip = el('div', 'cso-ftr-status', 'Ready \u00B7 Preserves headings, pipe tables, lists & links');
    statusStrip.id = 'csoFloatStatus';
    statusStrip.setAttribute('role', 'status');
    statusStrip.setAttribute('aria-live', 'polite');

    // Bottom Box: Live Odia Output
    var botSec = el('div', 'cso-ftr-section');
    var botHead = el('div', 'cso-ftr-sec-head');
    var lblOr = el('label', 'cso-ftr-label', 'Live \u0B13\u0B21\u0B3C\u0B3F\u0B06 Output (Markdown Preserved)');
    lblOr.setAttribute('for', 'csoFloatOutputOr');
    var provTag = el('span', 'cso-ftr-prov-tag', '');
    provTag.id = 'csoFloatProviderTag';
    provTag.hidden = true;
    botHead.append(lblOr, provTag);

    var outputOr = el('textarea', 'cso-form-textarea cso-ftr-textarea is-output');
    outputOr.id = 'csoFloatOutputOr';
    outputOr.rows = 6;
    outputOr.placeholder = '\u0B13\u0B21\u0B3C\u0B3F\u0B06 \u0B05\u0B28\u0B41\u0B2C\u0B3E\u0B26 \u0B0F\u0B20\u0B3E\u0B30\u0B47 \u0B26\u0B47\u0B16\u0B3E\u0B2F\u0B3F\u0B2C...';

    var actionsRow = el('div', 'cso-ftr-actions');
    var btnCopy = el('button', 'cso-pill-btn cso-ftr-act-btn', '\uD83D\uDCCB Copy \u0B13\u0B21\u0B3C\u0B3F\u0B06');
    btnCopy.type = 'button';
    btnCopy.id = 'btnCsoFloatCopy';

    var btnInsert = el('button', 'cso-pill-btn is-accent cso-ftr-act-btn', '\u2795 Insert into Body (\u0B13\u0B21\u0B3C\u0B3F\u0B06)');
    btnInsert.type = 'button';
    btnInsert.id = 'btnCsoFloatInsert';

    var btnClear = el('button', 'cso-pill-btn cso-ftr-act-btn', '\uD83E\uDDF9 Clear');
    btnClear.type = 'button';
    btnClear.id = 'btnCsoFloatClear';

    actionsRow.append(btnCopy, btnInsert, btnClear);
    botSec.append(botHead, outputOr, actionsRow);

    body.append(topSec, statusStrip, botSec);
    panel.append(header, body);
    root.append(panel, launcher);
    document.body.appendChild(root);

    // ---- Dock Position Management (100% CSS-Class Driven, Zero Inline Styles) ----
    var currentPos = savedPos;
    function setDockPosition(posKey) {
      var next = DOCK_POSITIONS.indexOf(posKey) !== -1 ? posKey : 'br';
      DOCK_POSITIONS.forEach(function (k) { root.classList.remove('is-pos-' + k); });
      root.classList.add('is-pos-' + next);
      currentPos = next;
      btnDock.title = 'Switch dock corner (' + DOCK_LABELS[next] + ')';
      try { window.localStorage.setItem(POS_STORAGE_KEY, next); } catch (_e) {}
    }

    btnDock.addEventListener('click', function () {
      var idx = DOCK_POSITIONS.indexOf(currentPos);
      var nextPos = DOCK_POSITIONS[(idx + 1) % DOCK_POSITIONS.length];
      setDockPosition(nextPos);
      statusStrip.textContent = 'Docked to ' + DOCK_LABELS[nextPos];
    });

    // Pointer drag on header snaps smoothly to viewport edges/corners via CSS classes
    var dragActive = false;
    var dragPointerId = null;

    header.addEventListener('pointerdown', function (ev) {
      if (ev.target && ev.target.closest && ev.target.closest('button')) return;
      if (ev.button !== undefined && ev.button !== 0) return;
      dragActive = true;
      dragPointerId = ev.pointerId;
      root.classList.add('is-dragging');
      try { header.setPointerCapture(ev.pointerId); } catch (_e) {}
      ev.preventDefault();
    });

    header.addEventListener('pointermove', function (ev) {
      if (!dragActive || (dragPointerId !== null && ev.pointerId !== dragPointerId)) return;
      var vw = window.innerWidth || 1280;
      var vh = window.innerHeight || 800;
      var horiz = ev.clientX < vw * 0.5 ? 'l' : 'r';
      var vert = ev.clientY < vh * 0.34 ? 't' : (ev.clientY > vh * 0.66 ? 'b' : 'm');
      var zone = vert + horiz;
      if (zone !== currentPos) {
        setDockPosition(zone);
      }
    });

    function finishDrag(ev) {
      if (!dragActive) return;
      dragActive = false;
      root.classList.remove('is-dragging');
      if (ev && dragPointerId !== null) {
        try { header.releasePointerCapture(dragPointerId); } catch (_e) {}
      }
      dragPointerId = null;
    }

    header.addEventListener('pointerup', finishDrag);
    header.addEventListener('pointercancel', finishDrag);

    // ---- Open / Close Panel ----
    function openPanel() {
      panel.hidden = false;
      launcher.hidden = true;
      launcher.setAttribute('aria-expanded', 'true');
      root.classList.add('is-expanded');
      inputEn.focus();
    }

    function closePanel() {
      panel.hidden = true;
      launcher.hidden = false;
      launcher.setAttribute('aria-expanded', 'false');
      root.classList.remove('is-expanded');
    }

    launcher.addEventListener('click', openPanel);
    btnClose.addEventListener('click', closePanel);
    panel.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        closePanel();
        launcher.focus();
      }
    });

    // ---- Live Debounced & Manual Translation ----
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
        body: JSON.stringify({ mode: 'translate_markdown', input: src })
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
          var prov = (res && (res.provider_label || res.provider)) || 'Gemini Pro';
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
        statusStrip.textContent = 'Ready \u00B7 Preserves headings, pipe tables, lists & links';
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
        toast('Nothing to copy yet — enter English text to translate.', 'amber');
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
        toast('Selected \u0B13\u0B21\u0B3C\u0B3F\u0B06 output — press Ctrl+C to copy.', 'info');
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
        toast('Open a composer with Body (\u0B13\u0B21\u0B3C\u0B3F\u0B06) first — output copied to clipboard.', 'amber');
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
      open: openPanel,
      close: closePanel,
      toggle: function () { if (panel.hidden) openPanel(); else closePanel(); },
      translateNow: function () { return runTranslation(true); },
      openWithText: function (enText, autoRun) {
        openPanel();
        if (typeof enText === 'string') {
          inputEn.value = enText;
          updateCharCount();
          if (autoRun !== false && enText.trim().length >= 2) {
            runTranslation(true);
          }
        }
      },
      setDockPosition: setDockPosition
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountFloatingTranslator);
  } else {
    mountFloatingTranslator();
  }
})(window, document);
