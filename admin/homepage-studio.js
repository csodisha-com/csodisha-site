/**
 * CS Odisha Admin Studio — Homepage Studio (v242).
 * D1-backed manager for every homepage feature block: Popular Searches, Latest Updates tabs,
 * Opportunity Compass, Trending Topics, Important Tools and Action Hub.
 * Strict CSP: DOM APIs only (no innerHTML / inline style / inline handlers).
 */
(function (window, document) {
  'use strict';

  var API = '/api/admin/homepage-blocks';
  var MODULE_ID = 'module-homepage-studio';
  var SECTION_META = [
    { key: 'popular_searches', label: 'Popular Searches', hint: 'Quick-filter chips under the hero search box.', accents: [] },
    { key: 'latest_updates_tabs', label: 'Latest Updates Tabs', hint: 'Filter tabs on the Latest Updates panel.', accents: [] },
    { key: 'opportunity_compass', label: 'Opportunity Compass', hint: 'CSO Opportunity Compass pathway cards.', accents: ['jobs', 'study', 'schemes', 'guidance'] },
    { key: 'trending_topics', label: 'Trending Topics', hint: 'Trending & Popular Topics cards.', accents: ['jobs', 'exams', 'schemes', 'study', 'career', 'odisha'] },
    { key: 'important_tools', label: 'Important Tools', hint: 'Interactive utility cards (icon is an emoji).', accents: ['age', 'marks', 'doc', 'plan', 'resume', 'flash'] },
    { key: 'action_hub', label: 'Action Hub', hint: 'Bottom community / library / alerts cards.', accents: ['community', 'library', 'alerts'] }
  ];
  var THEMES = [
    { id: 'system', label: 'System' },
    { id: 'dark', label: 'Dark Night' },
    { id: 'reading', label: 'Reading Mode' },
    { id: 'utkal-bharat', label: 'Odisha & Bharat' }
  ];

  var state = {
    items: [], stats: null, tab: 'all', query: '', status: 'all',
    selected: new Set(), editing: null, previewLang: 'en', root: null, refs: {}, busy: false
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); return n; }
  function toast(msg, kind) { if (typeof window.showToast === 'function') window.showToast(msg, kind || 'info'); }
  function sectionLabel(key) {
    var s = SECTION_META.find(function (m) { return m.key === key; });
    return s ? s.label : key;
  }
  function sectionMeta(key) { return SECTION_META.find(function (m) { return m.key === key; }) || SECTION_META[0]; }

  function api(path, method, body) {
    var opts = { method: method || 'GET', credentials: 'same-origin', headers: { 'X-CSO-CSRF': '1' } };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    return fetch(API + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error((d && d.error) || ('HTTP ' + r.status));
        return d;
      });
    });
  }

  function notifyCount() {
    var n = state.stats ? state.stats.published : 0;
    if (window.CSOStudio && typeof window.CSOStudio.setHomepageCount === 'function') window.CSOStudio.setHomepageCount(n);
  }

  function load() {
    return api('').then(function (d) {
      state.items = d.items || [];
      state.stats = d.stats || null;
      notifyCount();
    });
  }

  function mutate(promise, okMsg) {
    state.busy = true;
    return promise.then(function (d) { toast(okMsg, 'ok'); return load().then(function () { renderAll(); return d; }); })
      .catch(function (e) { toast(e.message || 'Request failed', 'crimson'); })
      .then(function (d) { state.busy = false; return d; });
  }

  // ---------- Rendering ----------
  function visibleItems() {
    var q = state.query.toLowerCase().trim();
    return state.items.filter(function (i) {
      if (state.tab !== 'all' && i.section_key !== state.tab) return false;
      if (state.status === 'published' && !i.is_published) return false;
      if (state.status === 'draft' && i.is_published) return false;
      if (!q) return true;
      return (i.title_en + ' ' + i.title_or + ' ' + i.subtitle_en + ' ' + i.href + ' ' + i.id).toLowerCase().indexOf(q) !== -1;
    });
  }

  function kpi(label, value, cls) {
    var c = el('div', 'hs-kpi' + (cls ? ' ' + cls : ''));
    c.appendChild(el('span', 'hs-kpi__value cso-tabular', value));
    c.appendChild(el('span', 'hs-kpi__label', label));
    return c;
  }

  function renderKpis() {
    var box = clear(state.refs.kpis);
    var s = state.stats || { total: 0, published: 0, draft: 0, clicks: 0, sections: {} };
    box.appendChild(kpi('Total blocks', s.total));
    box.appendChild(kpi('Published', s.published, 'is-ok'));
    box.appendChild(kpi('Draft', s.draft, s.draft ? 'is-warn' : ''));
    box.appendChild(kpi('Total clicks', s.clicks));
    var br = el('div', 'hs-kpi hs-kpi--wide');
    br.appendChild(el('span', 'hs-kpi__label', 'Section breakdown (published / total · clicks)'));
    var list = el('div', 'hs-breakdown');
    SECTION_META.forEach(function (m) {
      var x = (s.sections && s.sections[m.key]) || { total: 0, published: 0, clicks: 0 };
      var row = el('span', 'hs-breakdown__item', m.label + ': ' + x.published + '/' + x.total + ' · ' + x.clicks);
      list.appendChild(row);
    });
    br.appendChild(list);
    box.appendChild(br);
  }

  function renderTabs() {
    var box = clear(state.refs.tabs);
    var all = [{ key: 'all', label: 'All Sections' }].concat(SECTION_META.map(function (m) { return { key: m.key, label: m.label }; }));
    all.forEach(function (t) {
      var count = t.key === 'all' ? state.items.length : state.items.filter(function (i) { return i.section_key === t.key; }).length;
      var b = el('button', 'hs-tab' + (state.tab === t.key ? ' is-active' : ''));
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(state.tab === t.key));
      b.appendChild(el('span', '', t.label));
      b.appendChild(el('span', 'hs-tab__count cso-tabular', count));
      b.addEventListener('click', function () { state.tab = t.key; state.selected.clear(); renderAll(); });
      box.appendChild(b);
    });
  }

  function iconBtn(label, title, handler, disabled, extra) {
    var b = el('button', 'hs-icon-btn' + (extra ? ' ' + extra : ''), label);
    b.type = 'button';
    b.title = title;
    b.setAttribute('aria-label', title);
    if (disabled) b.disabled = true;
    else b.addEventListener('click', handler);
    return b;
  }

  function rowFor(item, siblings, idx) {
    var row = el('div', 'hs-row' + (item.is_published ? '' : ' is-draft') + (state.editing && state.editing.id === item.id ? ' is-editing' : ''));
    var sel = el('input', 'hs-check');
    sel.type = 'checkbox';
    sel.checked = state.selected.has(item.id);
    sel.setAttribute('aria-label', 'Select ' + item.title_en);
    sel.addEventListener('change', function () {
      if (sel.checked) state.selected.add(item.id); else state.selected.delete(item.id);
      renderBulkState();
    });

    var main = el('div', 'hs-row__main');
    var title = el('div', 'hs-row__title');
    if (item.icon) title.appendChild(el('span', 'hs-row__icon', item.icon.length <= 3 ? item.icon : '◆'));
    title.appendChild(el('strong', '', item.title_en));
    if (item.title_or) title.appendChild(el('span', 'hs-row__or', item.title_or));
    main.appendChild(title);
    var meta = el('div', 'hs-row__meta');
    meta.appendChild(el('span', 'hs-pill', sectionLabel(item.section_key)));
    if (item.href) meta.appendChild(el('span', 'hs-row__href', item.href));
    if (item.subtitle_en) meta.appendChild(el('span', 'hs-row__sub', item.subtitle_en));
    main.appendChild(meta);

    var sw = el('label', 'hs-switch');
    var swIn = el('input', '');
    swIn.type = 'checkbox';
    swIn.checked = !!item.is_published;
    swIn.setAttribute('aria-label', (item.is_published ? 'Unpublish ' : 'Publish ') + item.title_en);
    swIn.addEventListener('change', function () {
      mutate(api('/' + encodeURIComponent(item.id) + '/' + (swIn.checked ? 'publish' : 'unpublish'), 'POST', {}), swIn.checked ? 'Published live' : 'Moved to draft');
    });
    sw.appendChild(swIn);
    sw.appendChild(el('span', 'hs-switch__track'));
    sw.appendChild(el('span', 'hs-switch__text', item.is_published ? 'Live' : 'Draft'));

    var clicks = el('span', 'hs-row__clicks cso-tabular', item.clicks_count + ' clicks');
    var actions = el('div', 'hs-row__actions');
    var secSiblings = state.items.filter(function (i) { return i.section_key === item.section_key; });
    var pos = secSiblings.findIndex(function (i) { return i.id === item.id; });
    actions.appendChild(iconBtn('\u2191', 'Move up', function () { move(item, 'up'); }, pos <= 0));
    actions.appendChild(iconBtn('\u2193', 'Move down', function () { move(item, 'down'); }, pos >= secSiblings.length - 1));
    actions.appendChild(iconBtn('Edit', 'Edit block', function () { startEdit(item); }));
    actions.appendChild(iconBtn('Copy', 'Duplicate block', function () {
      mutate(api('/' + encodeURIComponent(item.id) + '/duplicate', 'POST', {}), 'Block duplicated as draft');
    }));
    actions.appendChild(iconBtn('Delete', 'Delete block', function () {
      if (window.confirm('Delete "' + item.title_en + '" from the homepage?')) {
        if (state.editing && state.editing.id === item.id) state.editing = null;
        mutate(api('/' + encodeURIComponent(item.id), 'DELETE'), 'Block deleted');
      }
    }, false, 'is-danger'));

    row.appendChild(sel);
    row.appendChild(main);
    row.appendChild(sw);
    row.appendChild(clicks);
    row.appendChild(actions);
    return row;
  }

  function move(item, dir) {
    mutate(api('/' + encodeURIComponent(item.id) + '/move', 'POST', { direction: dir }), 'Order updated');
  }

  function renderList() {
    var box = clear(state.refs.list);
    var items = visibleItems();
    if (!items.length) {
      var empty = el('div', 'cso-empty-state');
      empty.appendChild(el('h3', '', 'No homepage blocks match'));
      empty.appendChild(el('p', '', 'Adjust the filters or use + Add block to create one.'));
      box.appendChild(empty);
      return;
    }
    var lastSection = '';
    items.forEach(function (item, idx) {
      if (state.tab === 'all' && item.section_key !== lastSection) {
        lastSection = item.section_key;
        var head = el('div', 'hs-group-head');
        head.appendChild(el('strong', '', sectionLabel(item.section_key)));
        head.appendChild(el('span', '', sectionMeta(item.section_key).hint));
        box.appendChild(head);
      }
      box.appendChild(rowFor(item, items, idx));
    });
    renderBulkState();
  }

  function renderBulkState() {
    var n = state.selected.size;
    if (state.refs.bulkInfo) state.refs.bulkInfo.textContent = n ? n + ' selected' : 'No selection';
    ['bulkPublish', 'bulkUnpublish', 'bulkDelete'].forEach(function (k) { if (state.refs[k]) state.refs[k].disabled = !n; });
  }

  // ---------- Form ----------
  var FIELDS = [
    ['title_en', 'Title (EN)', 'text', true], ['title_or', 'Title (ଓଡ଼ିଆ)', 'text'],
    ['subtitle_en', 'Subtitle / description (EN)', 'text'], ['subtitle_or', 'Subtitle / description (ଓଡ଼ିଆ)', 'text'],
    ['href', 'Target URL / route', 'text'], ['badge_en', 'Badge text', 'text'],
    ['cta_label_en', 'CTA button label (EN)', 'text'], ['cta_label_or', 'CTA button label (ଓଡ଼ିଆ)', 'text'],
    ['icon', 'Icon (key or emoji)', 'text'], ['accent_variant', 'Accent / theme style', 'text'],
    ['sort_order', 'Sort order', 'number']
  ];

  function blankItem() {
    var section = state.tab === 'all' ? 'popular_searches' : state.tab;
    var max = state.items.filter(function (i) { return i.section_key === section; }).reduce(function (m, i) { return Math.max(m, i.sort_order); }, 0);
    return { id: '', section_key: section, title_en: '', title_or: '', subtitle_en: '', subtitle_or: '', badge_en: '', icon: '', href: '', cta_label_en: '', cta_label_or: '', accent_variant: '', sort_order: max + 10, is_published: 0, meta: {} };
  }

  function startEdit(item) {
    state.editing = item ? JSON.parse(JSON.stringify(item)) : blankItem();
    renderForm();
    renderList();
    renderPreview();
    if (state.refs.formCard && state.refs.formCard.scrollIntoView) state.refs.formCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function draftFromForm() {
    var f = state.refs.form;
    if (!f) return null;
    var d = Object.assign({}, state.editing);
    d.section_key = f.elements.section_key.value;
    FIELDS.forEach(function (fd) { d[fd[0]] = fd[2] === 'number' ? Number(f.elements[fd[0]].value || 0) : f.elements[fd[0]].value; });
    d.is_published = f.elements.is_published.checked ? 1 : 0;
    return d;
  }

  function renderForm() {
    var card = clear(state.refs.formBody);
    var it = state.editing;
    if (!it) {
      state.refs.form = null;
      card.appendChild(el('p', 'hs-muted', 'Select a block to edit, or press "+ Add block" to create a new one.'));
      return;
    }
    var form = el('form', 'hs-form');
    form.noValidate = true;
    form.appendChild(el('h3', 'hs-form__title', it.id ? 'Edit block' : 'New block'));

    var grid = el('div', 'hs-form__grid');
    var g0 = el('div', 'cso-form-group');
    var l0 = el('label', 'cso-form-label', 'Section');
    l0.setAttribute('for', 'hsSection');
    var sel = el('select', 'cso-form-select');
    sel.id = 'hsSection';
    sel.name = 'section_key';
    SECTION_META.forEach(function (m) {
      var o = el('option', '', m.label);
      o.value = m.key;
      if (m.key === it.section_key) o.selected = true;
      sel.appendChild(o);
    });
    g0.appendChild(l0); g0.appendChild(sel);
    grid.appendChild(g0);

    FIELDS.forEach(function (fd) {
      var wide = fd[0].indexOf('title_') === 0 || fd[0].indexOf('subtitle_') === 0 || fd[0] === 'href';
      var g = el('div', 'cso-form-group' + (wide ? ' hs-span-2' : ''));
      var id = 'hsf_' + fd[0];
      var l = el('label', 'cso-form-label', fd[1] + (fd[3] ? ' *' : ''));
      l.setAttribute('for', id);
      var inp = el('input', 'cso-form-input');
      inp.id = id; inp.name = fd[0]; inp.type = fd[2];
      if (fd[2] === 'number') inp.min = '0';
      inp.value = it[fd[0]] === undefined || it[fd[0]] === null ? '' : it[fd[0]];
      if (fd[0] === 'icon') inp.setAttribute('list', 'hsIconList');
      if (fd[0] === 'accent_variant') inp.setAttribute('list', 'hsAccentList');
      g.appendChild(l); g.appendChild(inp);
      grid.appendChild(g);
    });

    var dl1 = el('datalist'); dl1.id = 'hsIconList';
    (window.CSOHomeBlocks ? window.CSOHomeBlocks.ICON_KEYS : []).forEach(function (k) { var o = el('option'); o.value = k; dl1.appendChild(o); });
    var dl2 = el('datalist'); dl2.id = 'hsAccentList';
    function fillAccents() {
      clear(dl2);
      sectionMeta(sel.value).accents.forEach(function (a) { var o = el('option'); o.value = a; dl2.appendChild(o); });
    }
    fillAccents();
    sel.addEventListener('change', fillAccents);
    grid.appendChild(dl1); grid.appendChild(dl2);

    var pubWrap = el('div', 'cso-form-group hs-span-2');
    var pubLabel = el('label', 'hs-switch');
    var pubIn = el('input');
    pubIn.type = 'checkbox'; pubIn.name = 'is_published'; pubIn.checked = !!it.is_published;
    pubLabel.appendChild(pubIn);
    pubLabel.appendChild(el('span', 'hs-switch__track'));
    pubLabel.appendChild(el('span', 'hs-switch__text', 'Published (visible on the live homepage)'));
    pubWrap.appendChild(pubLabel);
    grid.appendChild(pubWrap);
    form.appendChild(grid);

    var err = el('p', 'hs-error');
    err.setAttribute('role', 'alert');
    state.refs.formError = err;
    form.appendChild(err);

    var bar = el('div', 'hs-form__actions');
    var save = el('button', 'cso-btn-primary', it.id ? 'Save changes' : 'Create block');
    save.type = 'submit';
    var cancel = el('button', 'hs-btn', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', function () { state.editing = null; renderForm(); renderList(); renderPreview(); });
    bar.appendChild(save);
    if (it.id) {
      var dup = el('button', 'hs-btn', 'Duplicate');
      dup.type = 'button';
      dup.addEventListener('click', function () {
        mutate(api('/' + encodeURIComponent(it.id) + '/duplicate', 'POST', {}), 'Block duplicated as draft');
      });
      bar.appendChild(dup);
    }
    bar.appendChild(cancel);
    form.appendChild(bar);

    form.addEventListener('input', renderPreview);
    form.addEventListener('change', renderPreview);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = draftFromForm();
      if (!d.title_en.trim()) { err.textContent = 'English title is required.'; return; }
      err.textContent = '';
      var payload = {
        section_key: d.section_key, title_en: d.title_en, title_or: d.title_or, subtitle_en: d.subtitle_en, subtitle_or: d.subtitle_or,
        badge_en: d.badge_en, icon: d.icon, href: d.href, cta_label_en: d.cta_label_en, cta_label_or: d.cta_label_or,
        accent_variant: d.accent_variant, sort_order: d.sort_order, is_published: d.is_published, meta: it.meta || {}
      };
      var req = it.id ? api('/' + encodeURIComponent(it.id), 'PUT', payload) : api('', 'POST', payload);
      mutate(req, it.id ? 'Block saved & live caches refreshed' : 'Block created').then(function (res) {
        if (res && res.item) { state.editing = res.item; renderForm(); renderList(); renderPreview(); }
      });
    });
    state.refs.form = form;
    card.appendChild(form);
  }

  // ---------- Preview ----------
  function renderPreview() {
    var box = clear(state.refs.previewBody);
    var d = draftFromForm() || state.editing;
    if (!d) {
      box.appendChild(el('p', 'hs-muted', 'Open a block to preview how it renders in every theme before publishing.'));
      return;
    }
    var lang = el('div', 'hs-pv-lang');
    ['en', 'or'].forEach(function (code) {
      var b = el('button', 'hs-tab' + (state.previewLang === code ? ' is-active' : ''), code === 'en' ? 'EN' : 'ଓଡ଼ିଆ');
      b.type = 'button';
      b.addEventListener('click', function () { state.previewLang = code; renderPreview(); });
      lang.appendChild(b);
    });
    box.appendChild(lang);
    var grid = el('div', 'hs-pv-grid');
    THEMES.forEach(function (t) {
      var tile = el('div', 'hs-pv hs-pv--' + t.id.replace(/[^a-z-]/g, ''));
      tile.setAttribute('data-pv-theme', t.id);
      tile.appendChild(el('div', 'hs-pv__label', t.label));
      var stage = el('div', 'hs-pv__stage hs-pv__stage--' + d.section_key);
      if (window.CSOHomeBlocks && d.title_en) {
        var node = window.CSOHomeBlocks.createNode(d.section_key, d, state.previewLang);
        if (node.tagName === 'A') node.removeAttribute('href');
        stage.appendChild(node);
      } else {
        stage.appendChild(el('span', 'hs-muted', 'Enter a title to preview'));
      }
      tile.appendChild(stage);
      grid.appendChild(tile);
    });
    box.appendChild(grid);
    box.appendChild(el('p', 'hs-muted', d.is_published ? 'Status: Published — appears live after saving.' : 'Status: Draft — hidden from the public homepage.'));
  }

  // ---------- Shell ----------
  function renderAll() {
    renderKpis(); renderTabs(); renderList(); renderPreview();
    if (state.editing && state.editing.id) {
      var fresh = state.items.find(function (i) { return i.id === state.editing.id; });
      if (!fresh) { state.editing = null; renderForm(); }
    }
  }

  function bulk(action) {
    var ids = Array.from(state.selected);
    if (!ids.length) return;
    if (action === 'delete' && !window.confirm('Delete ' + ids.length + ' selected block(s)?')) return;
    state.selected.clear();
    mutate(api('/bulk', 'POST', { ids: ids, action: action }), 'Bulk ' + action + ' complete');
  }

  function render(root, headerActions) {
    state.root = root;
    clear(root);
    var wrap = el('div', 'hs-studio');

    var intro = el('div', 'hs-intro');
    intro.appendChild(el('p', '', 'Add, reorder, publish and monitor every homepage feature. Changes go live instantly and refresh public caches.'));
    wrap.appendChild(intro);

    state.refs.kpis = el('div', 'hs-kpis');
    wrap.appendChild(state.refs.kpis);
    state.refs.tabs = el('div', 'hs-tabs');
    state.refs.tabs.setAttribute('role', 'tablist');
    wrap.appendChild(state.refs.tabs);

    var bar = el('div', 'hs-toolbar');
    var search = el('input', 'cso-form-input hs-search');
    search.type = 'search'; search.placeholder = 'Search title, URL or id...';
    search.setAttribute('aria-label', 'Search homepage blocks');
    search.value = state.query;
    search.addEventListener('input', function () { state.query = search.value; renderList(); });
    var status = el('select', 'cso-form-select hs-status');
    status.setAttribute('aria-label', 'Filter by status');
    [['all', 'All status'], ['published', 'Published'], ['draft', 'Draft']].forEach(function (p) {
      var o = el('option', '', p[1]); o.value = p[0]; if (state.status === p[0]) o.selected = true; status.appendChild(o);
    });
    status.addEventListener('change', function () { state.status = status.value; renderList(); });
    bar.appendChild(search); bar.appendChild(status);
    state.refs.bulkInfo = el('span', 'hs-muted hs-bulk-info', 'No selection');
    bar.appendChild(state.refs.bulkInfo);
    [['bulkPublish', 'Publish selected', 'publish'], ['bulkUnpublish', 'Unpublish selected', 'unpublish'], ['bulkDelete', 'Delete selected', 'delete']].forEach(function (b) {
      var btn = el('button', 'hs-btn' + (b[2] === 'delete' ? ' is-danger' : ''), b[1]);
      btn.type = 'button'; btn.disabled = true;
      btn.addEventListener('click', function () { bulk(b[2]); });
      state.refs[b[0]] = btn;
      bar.appendChild(btn);
    });
    var reset = el('button', 'hs-btn', 'Reset analytics');
    reset.type = 'button';
    reset.addEventListener('click', function () {
      var scope = state.tab === 'all' ? 'all homepage blocks' : sectionLabel(state.tab);
      if (!window.confirm('Reset click counts for ' + scope + '?')) return;
      mutate(api('/reset-analytics', 'POST', state.tab === 'all' ? {} : { section_key: state.tab }), 'Click analytics reset');
    });
    bar.appendChild(reset);
    wrap.appendChild(bar);

    var cols = el('div', 'hs-cols');
    var left = el('section', 'cso-card studio-card hs-card');
    left.setAttribute('aria-label', 'Homepage blocks');
    state.refs.list = el('div', 'hs-list');
    left.appendChild(state.refs.list);
    var right = el('div', 'hs-side');
    var formCard = el('section', 'cso-card studio-card hs-card');
    formCard.setAttribute('aria-label', 'Block editor');
    state.refs.formCard = formCard;
    state.refs.formBody = el('div', '');
    formCard.appendChild(state.refs.formBody);
    var pvCard = el('section', 'cso-card studio-card hs-card');
    pvCard.setAttribute('aria-label', 'Live preview');
    pvCard.appendChild(el('h3', 'hs-form__title', 'Live preview — all 4 themes'));
    state.refs.previewBody = el('div', '');
    pvCard.appendChild(state.refs.previewBody);
    right.appendChild(formCard); right.appendChild(pvCard);
    cols.appendChild(left); cols.appendChild(right);
    wrap.appendChild(cols);
    root.appendChild(wrap);

    if (headerActions) {
      var add = el('button', 'cso-btn-primary', '+ Add block');
      add.type = 'button';
      add.addEventListener('click', function () { startEdit(null); });
      var refresh = el('button', 'hs-btn', 'Refresh');
      refresh.type = 'button';
      refresh.addEventListener('click', function () { load().then(function () { renderAll(); toast('Homepage blocks refreshed', 'ok'); }).catch(function (e) { toast(e.message, 'crimson'); }); });
      var open = el('a', 'hs-btn', 'View homepage');
      open.href = '/'; open.target = '_blank'; open.rel = 'noopener noreferrer';
      headerActions.appendChild(refresh); headerActions.appendChild(open); headerActions.appendChild(add);
    }

    renderForm();
    renderAll();
    load().then(renderAll).catch(function (e) {
      clear(state.refs.list).appendChild(el('p', 'hs-error', 'Could not load homepage blocks: ' + e.message));
    });
  }

  window.CSOHomepageStudio = { MODULE_ID: MODULE_ID, render: render, refreshCount: function () { return load(); } };
})(window, document);
