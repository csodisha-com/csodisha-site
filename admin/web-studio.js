/**
 * CS Odisha Admin Studio — Folder #8: Web & Page Studio (v310)
 * Sub-tabs:
 *   1. Homepage & Blocks            (embeds CSOHomepageStudio)
 *   2. Institutional & Legal Pages  (structured bilingual editors for about, terms, privacy,
 *                                    copyright, disclaimer, contact + full About Transparency Studio)
 *   3. Global Snippets & Menus      (footer_copyright & official_source_disclaimer + Nav Manager)
 * Strict CSP: pure DOM APIs only; zero innerHTML, outerHTML, insertAdjacentHTML, or .style.*.
 */
(function (window, document) {
  'use strict';

  var S = {
    root: null,
    headerActions: null,
    activeTab: 'homepage',
    legalView: 'editors',
    pages: [],
    selectedSlug: 'about',
    snippets: []
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function toast(msg, kind) {
    if (typeof window.showToast === 'function') window.showToast(msg, kind || 'info');
  }

  function formatTs(iso) {
    if (!iso) return 'Not customized in D1 yet (serving static HTML fallback)';
    try {
      var d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : String(iso).replace(' ', 'T') + 'Z');
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    } catch (_) {
      return String(iso);
    }
  }

  function api(path, method, body) {
    var opts = {
      method: method || 'GET',
      credentials: 'same-origin',
      headers: { 'X-CSO-CSRF': '1' }
    };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch('/api/admin/web-studio/' + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error((d && d.error) || ('HTTP ' + r.status));
        return d;
      });
    });
  }

  function renderTabs(shell) {
    var bar = el('div', 'ws-tabs');
    bar.setAttribute('role', 'tablist');
    bar.setAttribute('aria-label', 'Web & Page Studio sections');

    var defs = [
      { key: 'homepage', label: '🏠 Homepage & Blocks' },
      { key: 'legal', label: '📜 Institutional & Legal Pages' },
      { key: 'snippets', label: '🧩 Global Snippets & Menus' }
    ];

    defs.forEach(function (d) {
      var b = el('button', 'ws-tab' + (S.activeTab === d.key ? ' is-active' : ''), d.label);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(S.activeTab === d.key));
      b.setAttribute('data-ws-tab', d.key);
      b.addEventListener('click', function () {
        S.activeTab = d.key;
        if (window.CSOStudio && window.CSOStudio.setWebStudioSubTab) {
          window.CSOStudio.setWebStudioSubTab(d.key);
        }
        renderCurrent();
      });
      bar.appendChild(b);
    });

    shell.appendChild(bar);
  }

  function renderHomepageTab(host) {
    var wrap = el('div', 'ws-embed-host');
    host.appendChild(wrap);
    if (window.CSOHomepageStudio && typeof window.CSOHomepageStudio.render === 'function') {
      window.CSOHomepageStudio.render(wrap, S.headerActions);
    } else {
      var card = el('section', 'ws-card');
      card.appendChild(el('h2', 'ws-title', 'Homepage Studio unavailable'));
      card.appendChild(el('p', 'ws-sub', 'Reload the page to initialize Homepage Studio blocks.'));
      wrap.appendChild(card);
    }
  }

  function renderInstitutionalEditors(container) {
    clear(container);

    var card = el('section', 'ws-card');
    var head = el('div', 'ws-card-head');
    var left = el('div');
    left.appendChild(el('h2', 'ws-title', 'Institutional & Legal Pages (Live D1 → Public Website)'));
    left.appendChild(el('p', 'ws-sub', 'Edit bilingual pages for /about/, /terms/, /privacy/, /copyright/, /disclaimer/, and /contact/. Saving writes live to D1 institutional_pages with automatic Effective / Last Updated timestamps.'));
    head.appendChild(left);
    card.appendChild(head);

    var pills = el('div', 'ws-page-pills');
    S.pages.forEach(function (p) {
      var btn = el('button', 'ws-pill' + (S.selectedSlug === p.slug ? ' is-active' : ''));
      btn.type = 'button';
      btn.setAttribute('data-page-slug', p.slug);
      btn.appendChild(el('span', '', p.label));
      btn.appendChild(el('span', 'ws-badge ' + (p.customized ? 'ws-badge--live' : 'ws-badge--fallback'), p.customized ? 'Live D1' : 'Static Fallback'));
      btn.addEventListener('click', function () {
        S.selectedSlug = p.slug;
        renderInstitutionalEditors(container);
      });
      pills.appendChild(btn);
    });
    card.appendChild(pills);

    var current = S.pages.find(function (p) { return p.slug === S.selectedSlug; }) || S.pages[0];
    if (!current) {
      card.appendChild(el('p', 'ws-sub', 'Loading institutional pages from D1…'));
      container.appendChild(card);
      return;
    }

    var metaBar = el('div', 'ws-meta-bar');
    metaBar.appendChild(el('span', '', 'Public URL: ' + current.public_path + ' · Effective / Last Updated: ' + formatTs(current.updated_at) + (current.updated_by ? ' by ' + current.updated_by : '')));
    var viewLink = el('a', 'ws-btn', 'Open Live Page ↗');
    viewLink.href = current.public_path;
    viewLink.target = '_blank';
    viewLink.rel = 'noopener noreferrer';
    metaBar.appendChild(viewLink);
    card.appendChild(metaBar);

    var form = el('form', 'ws-card');
    form.noValidate = true;

    var titleRow = el('div', 'ws-grid-2');
    var fTitleEn = el('div', 'ws-field');
    var lTitleEn = el('label', 'ws-label', 'Page Title (English) *');
    lTitleEn.setAttribute('for', 'wsPageTitleEn');
    var iTitleEn = el('input', 'ws-input');
    iTitleEn.id = 'wsPageTitleEn';
    iTitleEn.name = 'title_en';
    iTitleEn.type = 'text';
    iTitleEn.required = true;
    iTitleEn.value = current.title_en || current.label || '';
    fTitleEn.appendChild(lTitleEn);
    fTitleEn.appendChild(iTitleEn);

    var fTitleOr = el('div', 'ws-field');
    var lTitleOr = el('label', 'ws-label', 'Page Title (ଓଡ଼ିଆ)');
    lTitleOr.setAttribute('for', 'wsPageTitleOr');
    var iTitleOr = el('input', 'ws-input');
    iTitleOr.id = 'wsPageTitleOr';
    iTitleOr.name = 'title_or';
    iTitleOr.type = 'text';
    iTitleOr.value = current.title_or || '';
    fTitleOr.appendChild(lTitleOr);
    fTitleOr.appendChild(iTitleOr);

    titleRow.appendChild(fTitleEn);
    titleRow.appendChild(fTitleOr);
    form.appendChild(titleRow);

    var bodyRow = el('div', 'ws-grid-2');
    var fBodyEn = el('div', 'ws-field');
    var lBodyEn = el('label', 'ws-label', 'Body Content (English — use ## Heading and blank lines for sections)');
    lBodyEn.setAttribute('for', 'wsPageBodyEn');
    var tBodyEn = el('textarea', 'ws-textarea');
    tBodyEn.id = 'wsPageBodyEn';
    tBodyEn.name = 'body_en';
    tBodyEn.placeholder = '## Overview\nWrite the authoritative policy or institutional text here...';
    tBodyEn.value = current.body_en || '';
    fBodyEn.appendChild(lBodyEn);
    fBodyEn.appendChild(tBodyEn);

    var fBodyOr = el('div', 'ws-field');
    var lBodyOr = el('label', 'ws-label', 'Body Content (ଓଡ଼ିଆ)');
    lBodyOr.setAttribute('for', 'wsPageBodyOr');
    var tBodyOr = el('textarea', 'ws-textarea');
    tBodyOr.id = 'wsPageBodyOr';
    tBodyOr.name = 'body_or';
    tBodyOr.placeholder = 'ଓଡ଼ିଆରେ ବିସ୍ତୃତ ବିବରଣୀ ଲେଖନ୍ତୁ...';
    tBodyOr.value = current.body_or || '';
    fBodyOr.appendChild(lBodyOr);
    fBodyOr.appendChild(tBodyOr);

    bodyRow.appendChild(fBodyEn);
    bodyRow.appendChild(fBodyOr);
    form.appendChild(bodyRow);

    var actions = el('div', 'ws-actions');
    var saveBtn = el('button', 'ws-btn ws-btn--primary', 'Save & Publish Live →');
    saveBtn.type = 'submit';
    var status = el('span', 'ws-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    actions.appendChild(saveBtn);

    if (window.CSOFilePicker && window.CSOFilePicker.createPickerButton) {
      actions.appendChild(window.CSOFilePicker.createPickerButton({
        folder: 'Legal',
        className: 'ws-btn',
        label: '📁 Upload or Pick File from R2',
        onSelect: function (cleanUrl) {
          tBodyEn.value = (tBodyEn.value ? tBodyEn.value + '\n\n' : '') + 'Official Document: ' + cleanUrl;
        }
      }));
    }

    if (current.customized) {
      var resetBtn = el('button', 'ws-btn ws-btn--danger', 'Revert to Static HTML Fallback');
      resetBtn.type = 'button';
      resetBtn.addEventListener('click', function () {
        if (!window.confirm('Revert "' + current.label + '" to the built-in static HTML fallback?')) return;
        api('pages/' + encodeURIComponent(current.slug), 'DELETE').then(function () {
          toast('Reverted "' + current.label + '" to static fallback', 'ok');
          loadInstitutionalPages(container);
        }).catch(function (err) {
          toast('Revert failed: ' + err.message, 'crimson');
        });
      });
      actions.appendChild(resetBtn);
    }

    actions.appendChild(status);
    form.appendChild(actions);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      saveBtn.disabled = true;
      status.textContent = 'Saving to D1 & purging public edge cache…';
      api('pages/' + encodeURIComponent(current.slug), 'PUT', {
        title_en: iTitleEn.value.trim(),
        title_or: iTitleOr.value.trim(),
        body_en: tBodyEn.value.trim(),
        body_or: tBodyOr.value.trim()
      }).then(function () {
        status.textContent = 'Published live with automatic timestamp.';
        toast('Saved ' + current.label + ' live to D1', 'ok');
        loadInstitutionalPages(container);
      }).catch(function (err) {
        status.textContent = err.message;
        toast('Save failed: ' + err.message, 'crimson');
      }).finally(function () {
        saveBtn.disabled = false;
      });
    });

    card.appendChild(form);
    container.appendChild(card);
  }

  function loadInstitutionalPages(container) {
    api('pages', 'GET').then(function (d) {
      S.pages = d.items || [];
      renderInstitutionalEditors(container);
    }).catch(function (err) {
      clear(container);
      var card = el('section', 'ws-card');
      card.appendChild(el('h2', 'ws-title', 'Could not load institutional pages'));
      card.appendChild(el('p', 'ws-sub', err.message));
      container.appendChild(card);
    });
  }

  function renderLegalTab(host) {
    var switcher = el('div', 'ws-sub-switch');
    var btnEditors = el('button', 'ws-pill' + (S.legalView === 'editors' ? ' is-active' : ''), '📝 Legal & Institutional Page Editors (6 Pages)');
    btnEditors.type = 'button';
    var btnAbout = el('button', 'ws-pill' + (S.legalView === 'about_studio' ? ' is-active' : ''), '🏛️ About Portal, Verified .gov.in Sources & Inquiries');
    btnAbout.type = 'button';

    var bodyHost = el('div', 'ws-embed-host');

    btnEditors.addEventListener('click', function () {
      S.legalView = 'editors';
      renderLegalTabBody(bodyHost, btnEditors, btnAbout);
    });
    btnAbout.addEventListener('click', function () {
      S.legalView = 'about_studio';
      renderLegalTabBody(bodyHost, btnEditors, btnAbout);
    });

    switcher.appendChild(btnEditors);
    switcher.appendChild(btnAbout);
    host.appendChild(switcher);
    host.appendChild(bodyHost);
    renderLegalTabBody(bodyHost, btnEditors, btnAbout);
  }

  function renderLegalTabBody(bodyHost, btnEditors, btnAbout) {
    btnEditors.className = 'ws-pill' + (S.legalView === 'editors' ? ' is-active' : '');
    btnAbout.className = 'ws-pill' + (S.legalView === 'about_studio' ? ' is-active' : '');
    clear(bodyHost);
    clear(S.headerActions);

    if (S.legalView === 'about_studio') {
      if (window.CSOAboutPublishingStudio && typeof window.CSOAboutPublishingStudio.render === 'function') {
        window.CSOAboutPublishingStudio.render(bodyHost, S.headerActions, 'pages');
      } else {
        var c = el('section', 'ws-card');
        c.appendChild(el('h2', 'ws-title', 'About Studio unavailable'));
        c.appendChild(el('p', 'ws-sub', 'Reload the page to load the About Transparency Studio.'));
        bodyHost.appendChild(c);
      }
      return;
    }

    bodyHost.appendChild(el('p', 'ws-sub', 'Loading institutional pages from D1…'));
    loadInstitutionalPages(bodyHost);
  }

  function renderSnippetsList(container) {
    clear(container);

    var card = el('section', 'ws-card');
    card.appendChild(el('h2', 'ws-title', 'Global Public Snippets (Live Edge Injection)'));
    card.appendChild(el('p', 'ws-sub', 'Values saved here are immediately injected into the public website footer and legal disclaimers via Cloudflare HTMLRewriter. Leave blank to keep built-in defaults.'));

    S.snippets.forEach(function (snip) {
      var form = el('form', 'ws-card');
      form.noValidate = true;

      var head = el('div', 'ws-card-head');
      var hLeft = el('div');
      hLeft.appendChild(el('h3', 'ws-title', snip.label));
      hLeft.appendChild(el('p', 'ws-sub', snip.description + ' · Key: ' + snip.key));
      head.appendChild(hLeft);
      head.appendChild(el('span', 'ws-badge ' + (snip.customized ? 'ws-badge--live' : 'ws-badge--fallback'), snip.customized ? 'Active Override · ' + formatTs(snip.updated_at) : 'Default Fallback'));
      form.appendChild(head);

      var row = el('div', 'ws-grid-2');
      var fEn = el('div', 'ws-field');
      var lEn = el('label', 'ws-label', 'Text (English)');
      lEn.setAttribute('for', 'wsSnipEn_' + snip.key);
      var tEn = el('textarea', 'ws-textarea ws-textarea--short');
      tEn.id = 'wsSnipEn_' + snip.key;
      tEn.name = 'value_en';
      tEn.placeholder = snip.placeholder_en || '';
      tEn.value = snip.value_en || '';
      fEn.appendChild(lEn);
      fEn.appendChild(tEn);

      var fOr = el('div', 'ws-field');
      var lOr = el('label', 'ws-label', 'Text (ଓଡ଼ିଆ)');
      lOr.setAttribute('for', 'wsSnipOr_' + snip.key);
      var tOr = el('textarea', 'ws-textarea ws-textarea--short');
      tOr.id = 'wsSnipOr_' + snip.key;
      tOr.name = 'value_or';
      tOr.placeholder = snip.placeholder_or || '';
      tOr.value = snip.value_or || '';
      fOr.appendChild(lOr);
      fOr.appendChild(tOr);

      row.appendChild(fEn);
      row.appendChild(fOr);
      form.appendChild(row);

      var acts = el('div', 'ws-actions');
      var save = el('button', 'ws-btn ws-btn--primary', 'Save Live Snippet');
      save.type = 'submit';
      var st = el('span', 'ws-status');
      st.setAttribute('role', 'status');
      acts.appendChild(save);
      acts.appendChild(st);
      form.appendChild(acts);

      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        save.disabled = true;
        st.textContent = 'Saving snippet…';
        api('snippets/' + encodeURIComponent(snip.key), 'PUT', {
          value_en: tEn.value.trim(),
          value_or: tOr.value.trim()
        }).then(function () {
          st.textContent = 'Saved live and purged public cache.';
          toast('Updated snippet: ' + snip.key, 'ok');
          loadSnippets(container);
        }).catch(function (err) {
          st.textContent = err.message;
          toast('Snippet save failed: ' + err.message, 'crimson');
        }).finally(function () {
          save.disabled = false;
        });
      });

      card.appendChild(form);
    });

    container.appendChild(card);

    var navCard = el('section', 'ws-card');
    var navHead = el('div', 'ws-card-head');
    var nLeft = el('div');
    nLeft.appendChild(el('h2', 'ws-title', 'Navigation & Header Menus'));
    nLeft.appendChild(el('p', 'ws-sub', 'Manage header menu links, categories, and clean-slate 5-pillar navigation structure synced to /api/nav/config.'));
    navHead.appendChild(nLeft);
    var openNavBtn = el('button', 'ws-btn', 'Open Full Navigation Manager →');
    openNavBtn.type = 'button';
    openNavBtn.addEventListener('click', function () {
      if (window.CSOStudio && window.CSOStudio.openRoute) {
        window.CSOStudio.openRoute('nav-manager');
      }
    });
    navHead.appendChild(openNavBtn);
    navCard.appendChild(navHead);
    container.appendChild(navCard);
  }

  function loadSnippets(container) {
    api('snippets', 'GET').then(function (d) {
      S.snippets = d.items || [];
      renderSnippetsList(container);
    }).catch(function (err) {
      clear(container);
      var c = el('section', 'ws-card');
      c.appendChild(el('h2', 'ws-title', 'Could not load global snippets'));
      c.appendChild(el('p', 'ws-sub', err.message));
      container.appendChild(c);
    });
  }

  function renderCurrent() {
    if (!S.root) return;
    clear(S.root);
    clear(S.headerActions);

    var shell = el('div', 'ws-shell');
    renderTabs(shell);
    var body = el('div', 'ws-embed-host');
    shell.appendChild(body);
    S.root.appendChild(shell);

    if (S.activeTab === 'homepage') {
      renderHomepageTab(body);
    } else if (S.activeTab === 'legal') {
      renderLegalTab(body);
    } else {
      body.appendChild(el('p', 'ws-sub', 'Loading global snippets…'));
      loadSnippets(body);
    }
  }

  window.CSOWebStudio = {
    render: function (root, headerActions, initialTab, initialLegalView) {
      S.root = root;
      S.headerActions = headerActions;
      if (initialTab && ['homepage', 'legal', 'snippets'].indexOf(initialTab) !== -1) {
        S.activeTab = initialTab;
      }
      if (initialLegalView && ['editors', 'about_studio'].indexOf(initialLegalView) !== -1) {
        S.legalView = initialLegalView;
      }
      renderCurrent();
    }
  };
})(window, document);
