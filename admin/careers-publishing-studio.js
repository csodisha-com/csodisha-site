/**
 * Common Sense Odisha — Admin Studio: Careers Publishing House (v273)
 * Full 3-Tab Schemes & Jobs–Style Publishing House:
 *   1. Published & Draft Career Guides (6 KPIs, cascading L1/L2/Region/Status filters,
 *      Edit, Pop-Up Preview Modal, Temp Link Preview, Publish/Unpublish, Duplicate, Delete)
 *   2. 3-Layer Career Hierarchy (L1 Track -> L2 Sub-Track -> L3 Role/Pathway + Regions + Stages)
 *   3. Reusable Bilingual Snippets (10 pre-seeded EN + Odia blocks, 1-click Insert, CRUD)
 * Plus Full Bilingual Career Roadmap Composer with In-Studio Pop-Up Live Preview Modal
 * AND Time-Limited Temporary Preview Token Link (/careers/?preview_id=...&preview_token=...).
 * Strict CSP-compliant: zero innerHTML, outerHTML, insertAdjacentHTML, .style.*, or inline handlers.
 */
(function (window, document) {
  'use strict';

  var SNIPPET_CATS = [
    ['all', 'All Categories'],
    ['eligibility', 'Eligibility & Age'],
    ['salary', 'Salary & Pay Matrix'],
    ['selection', 'Selection & Exam Stages'],
    ['preparation', 'Preparation Roadmap'],
    ['verification', 'Official Portal Verification'],
    ['general', 'General']
  ];

  var state = {
    root: null,
    headerActions: null,
    tab: 'list', // 'list' | 'taxonomy' | 'snippets' | 'composer'
    items: [],
    taxonomy: { tracks: [], subtracks: [], role_streams: [], regions: [], stages: [], nodes: [] },
    snippets: [],
    stats: {
      total: 0, published: 0, draft: 0, archived: 0, featured: 0,
      tracks_count: 6, subtracks_count: 12, role_streams_count: 12, taxonomy_total: 30, snippets_count: 10
    },
    filters: { q: '', track: '', subtrack: '', region: '', status: '' },
    snipFilters: { q: '', category: 'all' },
    taxSel: { l1Id: '', l2Id: '' },
    editing: null,
    linksDraft: [{ label: '', url: '' }],
    inlineTaxKind: '',
    activePreviewUrl: '',
    activePreviewExp: '',
    editingSnippet: null
  };

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
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

  function slugify(raw) {
    return String(raw || '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 120);
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
    return fetch(path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error((d && (d.error || d.message)) || ('HTTP ' + r.status));
        return d;
      });
    });
  }

  function copyText(text, okMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast(okMsg || 'Copied to clipboard!', 'emerald');
      }, function () {
        toast('Unable to copy automatically — copy from the preview bar.', 'amber');
      });
    } else {
      toast('Copied link ready in preview bar.', 'info');
    }
  }

  function emptyFormModel() {
    var firstTrack = (state.taxonomy.tracks && state.taxonomy.tracks[0] && state.taxonomy.tracks[0].slug) || 'civil-services';
    return {
      id: '',
      slug: '',
      title_en: '',
      title_or: '',
      track_slug: firstTrack,
      subtrack_slug: '',
      role_stream_slug: '',
      region_scope: 'odisha',
      career_stage: 'graduate',
      eligibility_summary: '',
      salary_band: '',
      key_exams: '',
      summary_en: '',
      summary_or: '',
      roadmap_body_en: '',
      roadmap_body_or: '',
      official_links: [],
      status: 'draft',
      featured: 0
    };
  }

  function findBySlug(list, slug) {
    return (list || []).find(function (x) { return x.slug === slug; }) || null;
  }

  function findLabel(list, slug) {
    var hit = findBySlug(list, slug);
    return hit ? hit.label_en : (slug || '—');
  }

  function findLabelByLang(list, slug, lang) {
    var hit = findBySlug(list, slug);
    if (!hit) return slug || '';
    return (lang === 'or' && hit.label_or) ? hit.label_or : hit.label_en;
  }

  function getSubtracksForTrackSlug(trackSlug) {
    var tr = findBySlug(state.taxonomy.tracks, trackSlug);
    if (!tr) return [];
    return (state.taxonomy.subtracks || []).filter(function (s) {
      return s.parent_id === tr.id && Number(s.active ?? 1) === 1;
    });
  }

  function getRolesForSubtrackSlug(subtrackSlug) {
    var sub = findBySlug(state.taxonomy.subtracks, subtrackSlug);
    if (!sub) return [];
    return (state.taxonomy.role_streams || []).filter(function (r) {
      return r.parent_id === sub.id && Number(r.active ?? 1) === 1;
    });
  }

  function syncSidebarSubTab(tabKey) {
    if (window.CSOStudio && typeof window.CSOStudio.setCareersSubTab === 'function') {
      window.CSOStudio.setCareersSubTab(tabKey);
    }
  }

  function syncCareersFlyoutAndSidebar(bustSession) {
    if (bustSession) {
      try { sessionStorage.removeItem('cso_careers_flyout_v278'); } catch (_e) {}
    }
    if (window.CSOStudio && typeof window.CSOStudio.setCareersTrackNodes === 'function') {
      var countsMap = {};
      (state.items || []).forEach(function (it) {
        if (it && it.track_slug && it.status === 'published') {
          countsMap[it.track_slug] = (countsMap[it.track_slug] || 0) + 1;
        }
      });
      window.CSOStudio.setCareersTrackNodes(state.taxonomy.tracks || [], countsMap);
    }
    if (window.CSOStudio && typeof window.CSOStudio.setCareersActiveTrack === 'function') {
      window.CSOStudio.setCareersActiveTrack(state.filters.track || '');
    }
  }

  function loadData(bustSession) {
    var qs = new URLSearchParams();
    if (state.filters.q) qs.set('q', state.filters.q);
    if (state.filters.track) qs.set('track', state.filters.track);
    if (state.filters.subtrack) qs.set('subtrack', state.filters.subtrack);
    if (state.filters.region) qs.set('region', state.filters.region);
    if (state.filters.status) qs.set('status', state.filters.status);
    return api('/api/admin/careers' + (qs.toString() ? '?' + qs.toString() : ''), 'GET').then(function (d) {
      state.items = Array.isArray(d.items) ? d.items : [];
      if (d.taxonomy) state.taxonomy = d.taxonomy;
      if (Array.isArray(d.snippets)) state.snippets = d.snippets;
      if (d.stats) state.stats = d.stats;
      if (!state.taxSel.l1Id && state.taxonomy.tracks && state.taxonomy.tracks.length) {
        state.taxSel.l1Id = state.taxonomy.tracks[0].id;
      }
      if (window.CSOStudio && typeof window.CSOStudio.setCareersCount === 'function') {
        window.CSOStudio.setCareersCount(state.stats.total || 0);
      }
      syncCareersFlyoutAndSidebar(Boolean(bustSession));
      renderView();
    }).catch(function (err) {
      toast('Failed to load careers studio: ' + err.message, 'crimson');
    });
  }

  function startNewGuide() {
    state.editing = emptyFormModel();
    state.linksDraft = [{ label: '', url: '' }];
    state.inlineTaxKind = '';
    state.activePreviewUrl = '';
    state.activePreviewExp = '';
    state.tab = 'composer';
    syncSidebarSubTab('new');
    renderView();
  }

  function startEditGuide(item) {
    state.editing = Object.assign(emptyFormModel(), item || {});
    var existingLinks = Array.isArray(item && item.official_links) && item.official_links.length
      ? item.official_links.map(function (l) { return { label: l.label || '', url: l.url || '' }; })
      : [{ label: '', url: '' }];
    state.linksDraft = existingLinks;
    state.inlineTaxKind = '';
    state.activePreviewUrl = item && item.preview_token && item.id
      ? ('/careers/?preview_id=' + encodeURIComponent(item.id) + '&preview_token=' + encodeURIComponent(item.preview_token))
      : '';
    state.activePreviewExp = (item && item.preview_expires_at) || '';
    state.tab = 'composer';
    syncSidebarSubTab('list');
    renderView();
  }

  // =========================================================================
  // IN-STUDIO POP-UP LIVE PREVIEW MODAL (Renders exact /careers/ Card + Roadmap)
  // =========================================================================
  function renderProse(container, rawText) {
    clear(container);
    var text = String(rawText || '').trim();
    if (!text) {
      container.appendChild(el('p', 'cps-muted', 'No roadmap body authored in this language yet.'));
      return;
    }
    text.split(/\n{2,}/).forEach(function (blk) {
      var trimmed = blk.trim();
      if (!trimmed) return;
      var lines = trimmed.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
      if (lines.length === 1 && /^#{1,3}\s+/.test(lines[0])) {
        container.appendChild(el('h4', '', lines[0].replace(/^#{1,3}\s+/, '')));
        return;
      }
      if (lines.every(function (l) { return /^[-*•]\s+/.test(l); })) {
        var ul = document.createElement('ul');
        lines.forEach(function (l) { ul.appendChild(el('li', '', l.replace(/^[-*•]\s+/, ''))); });
        container.appendChild(ul);
        return;
      }
      if (/^#{1,3}\s+/.test(lines[0])) {
        container.appendChild(el('h4', '', lines[0].replace(/^#{1,3}\s+/, '')));
        var restLines = lines.slice(1);
        if (restLines.length && restLines.every(function (l) { return /^[-*•]\s+/.test(l); })) {
          var ul2 = document.createElement('ul');
          restLines.forEach(function (l) { ul2.appendChild(el('li', '', l.replace(/^[-*•]\s+/, ''))); });
          container.appendChild(ul2);
        } else if (restLines.length) {
          container.appendChild(el('p', '', restLines.join(' ')));
        }
        return;
      }
      container.appendChild(el('p', '', lines.join(' ')));
    });
  }

  function openPopupPreviewModal(item) {
    var modal = document.getElementById('globalModal');
    var mTitle = document.getElementById('modalTitle');
    var mBody = document.getElementById('modalBody');
    var mFoot = document.getElementById('modalFooter');
    if (!modal || !mTitle || !mBody || !mFoot) {
      toast('Preview modal container not found.', 'crimson');
      return;
    }

    var previewLang = 'en';
    mTitle.textContent = 'Live Pre-Publish Preview — Public /careers/ View';

    function drawBody() {
      clear(mBody);
      var wrap = el('div', 'cps-preview-modal-wrap');

      // Toolbar with status pill + EN / Odia switcher
      var bar = el('div', 'cps-preview-toolbar');
      var statusNote = el('div', 'cps-crumb-pills');
      statusNote.appendChild(el('span', 'cps-status-pill is-' + (item.status || 'draft'), (item.status || 'draft').toUpperCase() + ' PREVIEW'));
      statusNote.appendChild(el('span', 'cps-tax-pill', '/' + (item.slug || slugify(item.title_en) || 'career-guide')));

      var langGroup = el('div', 'cps-preview-lang-group');
      langGroup.setAttribute('role', 'group');
      langGroup.setAttribute('aria-label', 'Preview language');
      [['en', 'English'], ['or', 'ଓଡ଼ିଆ']].forEach(function (pair) {
        var lb = el('button', 'cps-preview-lang-btn' + (previewLang === pair[0] ? ' is-active' : ''), pair[1]);
        lb.type = 'button';
        lb.addEventListener('click', function () {
          previewLang = pair[0];
          drawBody();
        });
        langGroup.appendChild(lb);
      });
      bar.append(statusNote, langGroup);
      wrap.appendChild(bar);

      var pick = function (enV, orV) {
        return (previewLang === 'or' && orV && String(orV).trim()) ? String(orV) : String(enV || orV || '');
      };

      var l1Label = findLabelByLang(state.taxonomy.tracks, item.track_slug, previewLang);
      var l2Label = item.subtrack_slug ? findLabelByLang(state.taxonomy.subtracks, item.subtrack_slug, previewLang) : '';
      var l3Label = item.role_stream_slug ? findLabelByLang(state.taxonomy.role_streams, item.role_stream_slug, previewLang) : '';
      var regLabel = findLabelByLang(state.taxonomy.regions, item.region_scope, previewLang);
      var stgLabel = findLabelByLang(state.taxonomy.stages, item.career_stage, previewLang);

      // 1. Public Explorer Card Preview
      var cardSec = el('div');
      cardSec.appendChild(el('p', 'cps-preview-section-label', '1. Public /careers/ Explorer Card Preview'));
      var pubCard = el('div', 'cps-preview-public-card');
      var badges = el('div', 'cps-crumb-pills');
      if (l1Label) badges.appendChild(el('span', 'cps-tax-pill', l1Label));
      if (l2Label) badges.appendChild(el('span', 'cps-tax-pill', l2Label));
      if (l3Label) badges.appendChild(el('span', 'cps-tax-pill', l3Label));
      if (regLabel) badges.appendChild(el('span', 'cps-tax-pill', regLabel));
      if (stgLabel) badges.appendChild(el('span', 'cps-tax-pill', stgLabel));
      if (item.featured) badges.appendChild(el('span', 'cps-status-pill is-published', '★ Featured'));
      pubCard.appendChild(badges);
      pubCard.appendChild(el('h3', 'cps-card-title', pick(item.title_en, item.title_or) || 'Untitled Career Guide'));
      pubCard.appendChild(el('p', 'cps-muted', pick(item.summary_en, item.summary_or) || 'Concise career guide summary appears here on /careers/.'));
      cardSec.appendChild(pubCard);
      wrap.appendChild(cardSec);

      // 2. Interactive Career Roadmap Detail View Preview
      var detailSec = el('div');
      detailSec.appendChild(el('p', 'cps-preview-section-label', '2. Interactive Career Roadmap Drawer Preview'));
      var rBox = el('div', 'cps-preview-roadmap-box');
      var rHead = el('div', 'cps-preview-roadmap-head');
      rHead.appendChild(el('h3', '', pick(item.title_en, item.title_or) || 'Untitled Career Roadmap'));
      rHead.appendChild(el('span', '', [l1Label, l2Label, l3Label, regLabel, stgLabel].filter(Boolean).join(' › ')));

      var rBody = el('div', 'cps-preview-roadmap-body');
      var facts = el('div', 'cps-preview-facts');
      [
        [previewLang === 'or' ? 'ଯୋଗ୍ୟତା' : 'Eligibility', item.eligibility_summary || 'See roadmap details'],
        [previewLang === 'or' ? 'ଦରମା / ପେ-ଲେଭେଲ୍' : 'Salary / Pay Band', item.salary_band || 'As per Govt / Industry Pay Matrix'],
        [previewLang === 'or' ? 'ମୁଖ୍ୟ ପରୀକ୍ଷା' : 'Key Exams', item.key_exams || 'Direct / Competitive Entry']
      ].forEach(function (fp) {
        var f = el('div', 'cps-preview-fact');
        f.append(el('span', 'cps-preview-fact-k', fp[0]), el('span', 'cps-preview-fact-v', fp[1]));
        facts.appendChild(f);
      });
      rBody.appendChild(facts);

      var prose = el('div', 'cps-preview-prose');
      renderProse(prose, pick(item.roadmap_body_en, item.roadmap_body_or));
      rBody.appendChild(prose);

      var links = Array.isArray(item.official_links) ? item.official_links.filter(function (l) { return l && l.url; }) : [];
      if (links.length) {
        var lkRow = el('div', 'cps-row-actions');
        links.forEach(function (lk) {
          var a = el('a', 'cps-btn cps-btn-sm', (lk.label || lk.url) + ' ↗');
          a.href = lk.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          lkRow.appendChild(a);
        });
        rBody.appendChild(lkRow);
      }

      rBox.append(rHead, rBody);
      detailSec.appendChild(rBox);
      wrap.appendChild(detailSec);

      mBody.appendChild(wrap);
    }

    drawBody();
    clear(mFoot);
    if (item.id) {
      var tempBtn = el('button', 'cps-btn cps-btn-preview', 'Open Temporary Preview Link ↗');
      tempBtn.type = 'button';
      tempBtn.addEventListener('click', function () {
        generateAndOpenTempPreview(item.id);
      });
      mFoot.appendChild(tempBtn);
    }
    var closeBtn = el('button', 'cps-btn', 'Close Preview');
    closeBtn.type = 'button';
    closeBtn.addEventListener('click', function () {
      if (typeof window.closeModal === 'function') window.closeModal();
      else modal.hidden = true;
    });
    mFoot.appendChild(closeBtn);
    modal.hidden = false;
  }

  function generateAndOpenTempPreview(articleId) {
    if (!articleId) {
      toast('Save the draft first to generate a temporary preview link.', 'amber');
      return Promise.resolve(null);
    }
    return api('/api/admin/careers/preview-token', 'POST', { id: articleId, ttl_hours: 24 }).then(function (d) {
      if (!d || !d.preview_url) throw new Error('No preview URL returned');
      state.activePreviewUrl = d.preview_url;
      state.activePreviewExp = d.preview_expires_at || '';
      var fullUrl = window.location.origin + d.preview_url;
      toast('Temporary 24h preview link ready — opening public /careers/ tab!', 'emerald');
      window.open(d.preview_url, '_blank', 'noopener');
      if (state.tab === 'composer') renderView();
      return fullUrl;
    }).catch(function (err) {
      toast('Preview link failed: ' + err.message, 'crimson');
      return null;
    });
  }

  // =========================================================================
  // HEADER, KPIs & 3-TAB NAVIGATION
  // =========================================================================
  function renderHeaderActions() {
    if (!state.headerActions) return;
    clear(state.headerActions);

    var liveLink = el('a', 'cps-btn', 'Open Live Careers Portal ↗');
    liveLink.href = '/careers/';
    liveLink.target = '_blank';
    liveLink.rel = 'noopener noreferrer';

    var newBtn = el('button', 'cps-btn cps-btn-primary', '+ Publish New Career Guide');
    newBtn.type = 'button';
    newBtn.id = 'cpsHeaderNewGuideBtn';
    newBtn.addEventListener('click', startNewGuide);

    state.headerActions.append(liveLink, newBtn);
  }

  function renderKpis() {
    var wrap = el('div', 'cps-kpis');
    var s = state.stats || {};
    var l1c = (state.taxonomy.tracks || []).length;
    var l2c = (state.taxonomy.subtracks || []).length;
    var l3c = (state.taxonomy.role_streams || []).length;
    [
      ['Total Career Guides', s.total || 0, 'Live + Draft + Archived', 'emerald'],
      ['Published Live', s.published || 0, 'Visible on /careers/', 'teal'],
      ['Pending Drafts', s.draft || 0, 'Ready for preview & publish', 'amber'],
      ['Featured Guides', s.featured || 0, 'Highlighted on explorer', 'cobalt'],
      ['3-Layer Taxonomy', l1c + l2c + l3c, l1c + ' L1 · ' + l2c + ' L2 · ' + l3c + ' L3', 'violet'],
      ['Bilingual Snippets', (state.snippets || []).length || s.snippets_count || 0, 'EN + ଓଡ଼ିଆ reusable blocks', 'rose']
    ].forEach(function (k) {
      var tile = el('div', 'cps-kpi cps-kpi--' + k[3]);
      tile.append(
        el('span', 'cps-kpi-label', k[0]),
        el('strong', 'cps-kpi-val', String(k[1])),
        el('span', 'cps-kpi-sub', k[2])
      );
      wrap.appendChild(tile);
    });
    return wrap;
  }

  function renderTabs() {
    var tabs = el('div', 'cps-tabs');
    tabs.setAttribute('role', 'tablist');
    var items = [
      ['list', 'Published & Draft Career Guides', String(state.stats.total || 0)],
      ['taxonomy', '3-Layer Career Hierarchy', String((state.taxonomy.tracks || []).length + (state.taxonomy.subtracks || []).length + (state.taxonomy.role_streams || []).length)],
      ['snippets', 'Reusable Bilingual Snippets', String((state.snippets || []).length || 0)]
    ];
    if (state.tab === 'composer') {
      items.push(['composer', state.editing && state.editing.id ? 'Edit Career Roadmap' : '+ New Career Roadmap', 'Editor']);
    }
    items.forEach(function (pair) {
      var b = el('button', 'cps-tab' + (state.tab === pair[0] ? ' is-active' : ''));
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', state.tab === pair[0] ? 'true' : 'false');
      b.append(el('span', '', pair[1]), el('span', 'cps-tab-badge', pair[2]));
      b.addEventListener('click', function () {
        state.tab = pair[0];
        syncSidebarSubTab(pair[0]);
        renderView();
      });
      tabs.appendChild(b);
    });
    return tabs;
  }

  // =========================================================================
  // TAB 1: PUBLISHED & DRAFT CAREER GUIDES DIRECTORY
  // =========================================================================
  function renderListPanel() {
    var card = el('section', 'cps-card');
    var head = el('div', 'cps-card-head');
    head.appendChild(el('h2', 'cps-card-title', 'Published & Draft Career Guides (Live D1)'));

    var headBtns = el('div', 'cps-row-actions');
    var refreshBtn = el('button', 'cps-btn', '↻ Refresh');
    refreshBtn.type = 'button';
    refreshBtn.addEventListener('click', function () {
      toast('Refreshing career guides from D1…', 'info');
      loadData();
    });
    var bulkBtn = el('button', 'cps-btn', '📥 Bulk CSV/JSON Import');
    bulkBtn.type = 'button';
    bulkBtn.addEventListener('click', function () {
      if (window.CSOPublishTools && window.CSOPublishTools.openBulkImporter) {
        window.CSOPublishTools.openBulkImporter('careers', function () { loadData(); });
      }
    });
    var addBtn = el('button', 'cps-btn cps-btn-primary', '+ Publish New Career Guide');
    addBtn.type = 'button';
    addBtn.addEventListener('click', startNewGuide);
    headBtns.append(refreshBtn, bulkBtn, addBtn);
    head.appendChild(headBtns);

    // Cascading Filters
    var filterBar = el('div', 'cps-filter-bar');
    var searchInp = el('input', 'cps-input');
    searchInp.type = 'search';
    searchInp.placeholder = 'Search title, slug, or key exams…';
    searchInp.setAttribute('aria-label', 'Search career guides');
    searchInp.value = state.filters.q;
    searchInp.addEventListener('change', function () {
      state.filters.q = searchInp.value.trim();
      loadData();
    });

    var trackSel = el('select', 'cps-select');
    trackSel.setAttribute('aria-label', 'Filter by L1 Career Track');
    trackSel.appendChild(new Option('All L1 Tracks', ''));
    (state.taxonomy.tracks || []).forEach(function (tr) {
      trackSel.appendChild(new Option(tr.label_en, tr.slug));
    });
    trackSel.value = state.filters.track;
    trackSel.addEventListener('change', function () {
      state.filters.track = trackSel.value;
      state.filters.subtrack = '';
      loadData();
    });

    var subSel = el('select', 'cps-select');
    subSel.setAttribute('aria-label', 'Filter by L2 Sub-Track');
    subSel.appendChild(new Option('All L2 Sub-Tracks', ''));
    var subPool = state.filters.track ? getSubtracksForTrackSlug(state.filters.track) : (state.taxonomy.subtracks || []);
    subPool.forEach(function (sb) {
      subSel.appendChild(new Option(sb.label_en, sb.slug));
    });
    subSel.value = state.filters.subtrack;
    subSel.addEventListener('change', function () {
      state.filters.subtrack = subSel.value;
      loadData();
    });

    var regSel = el('select', 'cps-select');
    regSel.setAttribute('aria-label', 'Filter by Region Scope');
    regSel.appendChild(new Option('All Regions', ''));
    (state.taxonomy.regions || []).forEach(function (rg) {
      regSel.appendChild(new Option(rg.label_en, rg.slug));
    });
    regSel.value = state.filters.region;
    regSel.addEventListener('change', function () {
      state.filters.region = regSel.value;
      loadData();
    });

    var stSel = el('select', 'cps-select');
    stSel.setAttribute('aria-label', 'Filter by Status');
    [['', 'All Statuses'], ['published', 'Published'], ['draft', 'Draft'], ['archived', 'Archived']].forEach(function (p) {
      stSel.appendChild(new Option(p[1], p[0]));
    });
    stSel.value = state.filters.status;
    stSel.addEventListener('change', function () {
      state.filters.status = stSel.value;
      loadData();
    });

    filterBar.append(searchInp, trackSel, subSel, regSel, stSel);

    // Table
    var tableWrap = el('div', 'cps-table-wrap');
    if (!state.items.length) {
      tableWrap.appendChild(el('p', 'cps-status-msg', 'No career roadmaps match this filter yet. Click "+ Publish New Career Guide" to author a bilingual career guide.'));
    } else {
      var table = el('table', 'cps-table');
      var thead = document.createElement('thead');
      var trHead = document.createElement('tr');
      ['Title (EN / ଓଡ଼ିଆ)', '3-Layer Taxonomy', 'Region & Stage', 'Status', 'Actions'].forEach(function (col) {
        trHead.appendChild(el('th', '', col));
      });
      thead.appendChild(trHead);
      var tbody = document.createElement('tbody');

      state.items.forEach(function (item) {
        var tr = document.createElement('tr');

        var tdTitle = document.createElement('td');
        var tCell = el('div', 'cps-title-cell');
        tCell.appendChild(el('strong', '', item.title_en + (item.featured ? ' ★' : '')));
        tCell.appendChild(el('span', 'cps-title-sub', (item.title_or ? item.title_or + ' · ' : '') + '/' + item.slug));
        tdTitle.appendChild(tCell);

        var tdTax = document.createElement('td');
        var crumbs = el('div', 'cps-crumb-pills');
        crumbs.appendChild(el('span', 'cps-tax-pill', findLabel(state.taxonomy.tracks, item.track_slug)));
        if (item.subtrack_slug) crumbs.appendChild(el('span', 'cps-tax-pill', findLabel(state.taxonomy.subtracks, item.subtrack_slug)));
        if (item.role_stream_slug) crumbs.appendChild(el('span', 'cps-tax-pill', findLabel(state.taxonomy.role_streams, item.role_stream_slug)));
        tdTax.appendChild(crumbs);

        var tdMeta = document.createElement('td');
        var metaPills = el('div', 'cps-crumb-pills');
        metaPills.appendChild(el('span', 'cps-tax-pill', findLabel(state.taxonomy.regions, item.region_scope)));
        metaPills.appendChild(el('span', 'cps-tax-pill', findLabel(state.taxonomy.stages, item.career_stage)));
        tdMeta.appendChild(metaPills);

        var tdStatus = document.createElement('td');
        tdStatus.appendChild(el('span', 'cps-status-pill is-' + (item.status || 'draft'), item.status || 'draft'));

        var tdAct = document.createElement('td');
        var actWrap = el('div', 'cps-row-actions');

        var editBtn = el('button', 'cps-btn cps-btn-sm', 'Edit');
        editBtn.type = 'button';
        editBtn.addEventListener('click', function () { startEditGuide(item); });

        var popupBtn = el('button', 'cps-btn cps-btn-sm', 'Pop-Up Preview');
        popupBtn.type = 'button';
        popupBtn.addEventListener('click', function () { openPopupPreviewModal(item); });

        var tempBtn = el('button', 'cps-btn cps-btn-sm cps-btn-preview', 'Temp Link ↗');
        tempBtn.type = 'button';
        tempBtn.addEventListener('click', function () { generateAndOpenTempPreview(item.id); });

        var toggleBtn = el('button', 'cps-btn cps-btn-sm' + (item.status === 'published' ? '' : ' cps-btn-publish'), item.status === 'published' ? 'Unpublish' : 'Publish');
        toggleBtn.type = 'button';
        toggleBtn.addEventListener('click', function () {
          api('/api/admin/careers', 'POST', { action: 'toggle_status', id: item.id })
            .then(function (res) {
              var st = res && res.item ? res.item.status : 'updated';
              toast('Career guide ' + st + ' & public /careers/ cache purged!', 'emerald');
              loadData(true);
            })
            .catch(function (err) { toast(err.message, 'crimson'); });
        });

        var dupBtn = el('button', 'cps-btn cps-btn-sm', 'Duplicate');
        dupBtn.type = 'button';
        dupBtn.addEventListener('click', function () {
          api('/api/admin/careers', 'POST', { action: 'duplicate', id: item.id })
            .then(function () {
              toast('Duplicated as a new draft copy.', 'emerald');
              loadData(true);
            })
            .catch(function (err) { toast(err.message, 'crimson'); });
        });

        var delBtn = el('button', 'cps-btn cps-btn-sm cps-btn-danger', 'Delete');
        delBtn.type = 'button';
        delBtn.addEventListener('click', function () {
          if (!window.confirm('Delete "' + item.title_en + '" permanently?')) return;
          api('/api/admin/careers', 'POST', { action: 'delete', id: item.id })
            .then(function () {
              toast('Career guide deleted & public cache purged.', 'emerald');
              loadData(true);
            })
            .catch(function (err) { toast(err.message, 'crimson'); });
        });

        actWrap.append(editBtn, popupBtn, tempBtn, toggleBtn, dupBtn, delBtn);
        tdAct.appendChild(actWrap);

        tr.append(tdTitle, tdTax, tdMeta, tdStatus, tdAct);
        tbody.appendChild(tr);
      });

      table.append(thead, tbody);
      tableWrap.appendChild(table);
    }

    card.append(head, filterBar, tableWrap);
    return card;
  }

  // =========================================================================
  // TAB 2: 3-LAYER CAREER HIERARCHY STUDIO (L1 -> L2 -> L3 + Region + Stage)
  // =========================================================================
  function openTaxonomyNodeEditor(opts) {
    var modal = document.getElementById('globalModal');
    var mTitle = document.getElementById('modalTitle');
    var mBody = document.getElementById('modalBody');
    var mFoot = document.getElementById('modalFooter');
    if (!modal || !mTitle || !mBody || !mFoot) return;

    var editing = opts.node || null;
    var kind = (editing && editing.kind) || opts.kind || 'track';
    var parentId = (editing && editing.parent_id !== undefined) ? editing.parent_id : (opts.parentId || '');
    var kindLabels = {
      track: 'L1 Career Track',
      subtrack: 'L2 Sub-Track / Domain',
      role_stream: 'L3 Role / Pathway',
      region: 'Region Scope',
      stage: 'Career Stage'
    };

    mTitle.textContent = (editing ? 'Edit ' : '+ Add ') + (kindLabels[kind] || kind);
    clear(mBody);
    clear(mFoot);

    var formBox = el('div', 'cps-form-grid');
    var fEn = el('input', 'cps-input'); fEn.value = editing ? editing.label_en : ''; fEn.placeholder = 'English label *';
    var fOr = el('input', 'cps-input'); fOr.value = editing ? editing.label_or : ''; fOr.placeholder = 'ଓଡ଼ିଆ ନାମ';
    var fIcon = el('input', 'cps-input'); fIcon.value = editing ? (editing.icon || '') : ''; fIcon.placeholder = 'Optional emoji icon (e.g., 🏛️)';
    var fSort = el('input', 'cps-input'); fSort.type = 'number'; fSort.value = editing ? String(editing.sort_order || 0) : ''; fSort.placeholder = 'Sort order';

    function wrapF(label, inp) {
      var d = el('div', 'cps-field');
      d.append(el('label', 'cps-label', label), inp);
      return d;
    }

    formBox.append(
      wrapF('Label (English) *', fEn),
      wrapF('Label (ଓଡ଼ିଆ)', fOr),
      wrapF('Icon', fIcon),
      wrapF('Sort Order', fSort)
    );
    mBody.appendChild(formBox);

    var saveBtn = el('button', 'cps-btn cps-btn-primary', editing ? 'Save Changes' : 'Create Node');
    saveBtn.type = 'button';
    saveBtn.addEventListener('click', function () {
      var lblEn = fEn.value.trim();
      if (!lblEn) { toast('English label is required.', 'amber'); fEn.focus(); return; }
      saveBtn.disabled = true;
      api('/api/admin/careers/taxonomy', 'POST', {
        id: editing ? editing.id : undefined,
        kind: kind,
        parent_id: parentId,
        label_en: lblEn,
        label_or: fOr.value.trim(),
        icon: fIcon.value.trim(),
        sort_order: fSort.value ? Number(fSort.value) : undefined,
        active: editing ? editing.active : 1
      }).then(function () {
        toast('Taxonomy node saved to D1!', 'emerald');
        if (typeof window.closeModal === 'function') window.closeModal();
        else modal.hidden = true;
        loadData();
      }).catch(function (err) {
        saveBtn.disabled = false;
        toast(err.message, 'crimson');
      });
    });

    var cancelBtn = el('button', 'cps-btn', 'Cancel');
    cancelBtn.type = 'button';
    cancelBtn.addEventListener('click', function () {
      if (typeof window.closeModal === 'function') window.closeModal();
      else modal.hidden = true;
    });

    mFoot.append(cancelBtn, saveBtn);
    modal.hidden = false;
  }

  function renderTaxColumn(title, kind, nodes, selectedId, onSelect, parentId, addDisabledMsg) {
    var col = el('section', 'cps-tax-col');
    var head = el('div', 'cps-tax-col-head');
    head.appendChild(el('h3', 'cps-tax-col-title', title + ' (' + nodes.length + ')'));

    var addBtn = el('button', 'cps-btn cps-btn-sm cps-btn-primary', '+ Add Node');
    addBtn.type = 'button';
    addBtn.addEventListener('click', function () {
      if (addDisabledMsg) {
        toast(addDisabledMsg, 'amber');
        return;
      }
      openTaxonomyNodeEditor({ kind: kind, parentId: parentId || '' });
    });
    head.appendChild(addBtn);
    col.appendChild(head);

    var list = el('div', 'cps-tax-list');
    if (!nodes.length) {
      list.appendChild(el('p', 'cps-muted', addDisabledMsg || 'No nodes yet. Click "+ Add Node" to create one.'));
    } else {
      nodes.forEach(function (n) {
        var isSel = selectedId && selectedId === n.id;
        var card = el('div', 'cps-tax-node' + (isSel ? ' is-selected' : '') + (Number(n.active) === 1 ? '' : ' is-inactive'));
        if (onSelect) {
          card.addEventListener('click', function () { onSelect(n.id); });
        }

        var top = el('div', 'cps-tax-node-top');
        top.appendChild(el('span', 'cps-tax-node-title', (n.icon ? n.icon + ' ' : '') + n.label_en));
        top.appendChild(el('span', 'cps-status-pill ' + (Number(n.active) === 1 ? 'is-published' : 'is-archived'), Number(n.active) === 1 ? 'Active' : 'Hidden'));

        var meta = el('div', 'cps-tax-node-meta', (n.label_or ? n.label_or + ' · ' : '') + '/' + n.slug + ' · #' + (n.sort_order || 0));

        var actions = el('div', 'cps-row-actions');
        var ed = el('button', 'cps-btn cps-btn-sm', 'Edit');
        ed.type = 'button';
        ed.addEventListener('click', function (ev) {
          ev.stopPropagation();
          openTaxonomyNodeEditor({ node: n });
        });
        var tog = el('button', 'cps-btn cps-btn-sm', Number(n.active) === 1 ? 'Deactivate' : 'Activate');
        tog.type = 'button';
        tog.addEventListener('click', function (ev) {
          ev.stopPropagation();
          api('/api/admin/careers/taxonomy', 'POST', { action: 'toggle_active', id: n.id })
            .then(function () { toast('Node status updated.', 'emerald'); loadData(); })
            .catch(function (err) { toast(err.message, 'crimson'); });
        });
        var del = el('button', 'cps-btn cps-btn-sm cps-btn-danger', 'Delete');
        del.type = 'button';
        del.addEventListener('click', function (ev) {
          ev.stopPropagation();
          if (!window.confirm('Delete taxonomy node "' + n.label_en + '"?')) return;
          api('/api/admin/careers/taxonomy', 'POST', { action: 'delete', id: n.id })
            .then(function () { toast('Taxonomy node deleted.', 'emerald'); loadData(); })
            .catch(function (err) { toast(err.message, 'crimson'); });
        });
        actions.append(ed, tog, del);
        card.append(top, meta, actions);
        list.appendChild(card);
      });
    }
    col.appendChild(list);
    return col;
  }

  function renderTaxonomyPanel() {
    var wrap = el('div', 'cps-root');
    var allNodes = state.taxonomy.nodes || [];
    var l1Nodes = allNodes.filter(function (n) { return n.kind === 'track'; });
    if (!state.taxSel.l1Id && l1Nodes.length) state.taxSel.l1Id = l1Nodes[0].id;
    var l2Nodes = allNodes.filter(function (n) { return n.kind === 'subtrack' && n.parent_id === state.taxSel.l1Id; });
    if (l2Nodes.length && !l2Nodes.some(function (n) { return n.id === state.taxSel.l2Id; })) {
      state.taxSel.l2Id = l2Nodes[0].id;
    } else if (!l2Nodes.length) {
      state.taxSel.l2Id = '';
    }
    var l3Nodes = allNodes.filter(function (n) { return n.kind === 'role_stream' && n.parent_id === state.taxSel.l2Id; });

    var treeGrid = el('div', 'cps-tax-grid');
    treeGrid.append(
      renderTaxColumn('L1 · Career Tracks', 'track', l1Nodes, state.taxSel.l1Id, function (id) {
        state.taxSel.l1Id = id;
        state.taxSel.l2Id = '';
        renderView();
      }, '', ''),
      renderTaxColumn('L2 · Sub-Tracks / Domains', 'subtrack', l2Nodes, state.taxSel.l2Id, function (id) {
        state.taxSel.l2Id = id;
        renderView();
      }, state.taxSel.l1Id, state.taxSel.l1Id ? '' : 'Select an L1 Career Track first.'),
      renderTaxColumn('L3 · Roles / Pathways', 'role_stream', l3Nodes, '', null, state.taxSel.l2Id, state.taxSel.l2Id ? '' : 'Select or add an L2 Sub-Track first.')
    );
    wrap.appendChild(treeGrid);

    var secondaryGrid = el('div', 'cps-tax-secondary-grid');
    var regions = allNodes.filter(function (n) { return n.kind === 'region'; });
    var stages = allNodes.filter(function (n) { return n.kind === 'stage'; });
    secondaryGrid.append(
      renderTaxColumn('Region Scopes', 'region', regions, '', null, '', ''),
      renderTaxColumn('Career Stages', 'stage', stages, '', null, '', '')
    );
    wrap.appendChild(secondaryGrid);
    return wrap;
  }

  // =========================================================================
  // TAB 3: REUSABLE BILINGUAL SNIPPETS LIBRARY
  // =========================================================================
  function insertSnippetIntoComposer(sn) {
    if (!state.editing) state.editing = emptyFormModel();
    var sepEn = state.editing.roadmap_body_en ? '\n\n' : '';
    var sepOr = state.editing.roadmap_body_or ? '\n\n' : '';
    state.editing.roadmap_body_en = (state.editing.roadmap_body_en || '') + sepEn + (sn.body_en || '');
    state.editing.roadmap_body_or = (state.editing.roadmap_body_or || '') + sepOr + (sn.body_or || '');
    state.tab = 'composer';
    syncSidebarSubTab('new');
    toast('Inserted bilingual snippet "' + sn.title_en + '" into Career Roadmap!', 'emerald');
    renderView();
  }

  function renderSnippetsPanel() {
    var wrap = el('div', 'cps-root');

    // Creator / Editor Card
    var edCard = el('section', 'cps-card');
    var snModel = state.editingSnippet || { id: '', category: 'eligibility', title_en: '', title_or: '', body_en: '', body_or: '' };
    var edHead = el('div', 'cps-card-head');
    edHead.appendChild(el('h2', 'cps-card-title', snModel.id ? 'Edit Bilingual Snippet' : '+ Create New Bilingual Snippet'));
    if (snModel.id) {
      var rst = el('button', 'cps-btn cps-btn-sm', 'Cancel Edit');
      rst.type = 'button';
      rst.addEventListener('click', function () { state.editingSnippet = null; renderView(); });
      edHead.appendChild(rst);
    }

    var formGrid = el('div', 'cps-form-grid');
    var sCat = el('select', 'cps-select');
    SNIPPET_CATS.filter(function (c) { return c[0] !== 'all'; }).forEach(function (c) { sCat.appendChild(new Option(c[1], c[0])); });
    sCat.value = snModel.category || 'eligibility';
    var sTitleEn = el('input', 'cps-input'); sTitleEn.placeholder = 'Snippet Title (English) *'; sTitleEn.value = snModel.title_en || '';
    var sTitleOr = el('input', 'cps-input'); sTitleOr.placeholder = 'Snippet Title (ଓଡ଼ିଆ)'; sTitleOr.value = snModel.title_or || '';
    var sBodyEn = el('textarea', 'cps-textarea'); sBodyEn.placeholder = '### Heading\n- Point 1\n- Point 2'; sBodyEn.value = snModel.body_en || '';
    var sBodyOr = el('textarea', 'cps-textarea'); sBodyOr.placeholder = '### ଶୀର୍ଷକ\n- ପଏଣ୍ଟ ୧\n- ପଏଣ୍ଟ ୨'; sBodyOr.value = snModel.body_or || '';

    function field(lbl, inp, full) {
      var d = el('div', 'cps-field' + (full ? ' cps-span-full' : ''));
      d.append(el('label', 'cps-label', lbl), inp);
      return d;
    }

    formGrid.append(
      field('Title (English) *', sTitleEn, false),
      field('Title (ଓଡ଼ିଆ)', sTitleOr, false),
      field('Category', sCat, true),
      field('English Block Content', sBodyEn, false),
      field('Odia (ଓଡ଼ିଆ) Block Content', sBodyOr, false)
    );

    var saveSnipBtn = el('button', 'cps-btn cps-btn-primary', snModel.id ? 'Update Snippet' : '+ Save Bilingual Snippet');
    saveSnipBtn.type = 'button';
    saveSnipBtn.addEventListener('click', function () {
      if (!sTitleEn.value.trim()) { toast('Snippet English title is required.', 'amber'); sTitleEn.focus(); return; }
      saveSnipBtn.disabled = true;
      api('/api/admin/careers/snippets', 'POST', {
        id: snModel.id || undefined,
        category: sCat.value,
        title_en: sTitleEn.value.trim(),
        title_or: sTitleOr.value.trim(),
        body_en: sBodyEn.value.trim(),
        body_or: sBodyOr.value.trim()
      }).then(function () {
        toast('Bilingual snippet saved to D1!', 'emerald');
        state.editingSnippet = null;
        loadData();
      }).catch(function (err) {
        saveSnipBtn.disabled = false;
        toast(err.message, 'crimson');
      });
    });

    edCard.append(edHead, formGrid, el('div', 'cps-actions'));
    edCard.lastChild.appendChild(saveSnipBtn);
    wrap.appendChild(edCard);

    // Searchable Library Card
    var libCard = el('section', 'cps-card');
    var libHead = el('div', 'cps-card-head');
    libHead.appendChild(el('h2', 'cps-card-title', 'Reusable Bilingual Snippets Library (' + (state.snippets || []).length + ')'));

    var fRow = el('div', 'cps-form-grid');
    var qInp = el('input', 'cps-input');
    qInp.type = 'search';
    qInp.placeholder = 'Search snippets (eligibility, salary, ORSP, OPSC, NATS…)';
    qInp.value = state.snipFilters.q;
    qInp.addEventListener('input', function () {
      state.snipFilters.q = qInp.value.trim().toLowerCase();
      renderView();
    });
    var cSel = el('select', 'cps-select');
    SNIPPET_CATS.forEach(function (c) { cSel.appendChild(new Option(c[1], c[0])); });
    cSel.value = state.snipFilters.category;
    cSel.addEventListener('change', function () {
      state.snipFilters.category = cSel.value;
      renderView();
    });
    fRow.append(qInp, cSel);

    var filtered = (state.snippets || []).filter(function (sn) {
      if (state.snipFilters.category && state.snipFilters.category !== 'all' && sn.category !== state.snipFilters.category) return false;
      if (state.snipFilters.q) {
        var hay = (sn.title_en + ' ' + sn.title_or + ' ' + sn.body_en + ' ' + sn.body_or).toLowerCase();
        if (hay.indexOf(state.snipFilters.q) === -1) return false;
      }
      return true;
    });

    var grid = el('div', 'cps-snippets-grid');
    if (!filtered.length) {
      grid.appendChild(el('p', 'cps-muted', 'No snippets match your search.'));
    } else {
      filtered.forEach(function (sn) {
        var sc = el('article', 'cps-snippet-card');
        var top = el('div', 'cps-tax-node-top');
        top.append(el('strong', 'cps-tax-node-title', sn.title_en), el('span', 'cps-tax-pill', sn.category));
        sc.appendChild(top);
        if (sn.title_or) sc.appendChild(el('div', 'cps-tax-node-meta', sn.title_or));
        sc.appendChild(el('pre', 'cps-snippet-preview', (sn.body_en || '').slice(0, 260)));

        var acts = el('div', 'cps-row-actions');
        var ins = el('button', 'cps-btn cps-btn-sm cps-btn-primary', '+ Insert into Roadmap');
        ins.type = 'button';
        ins.addEventListener('click', function () { insertSnippetIntoComposer(sn); });

        var cp = el('button', 'cps-btn cps-btn-sm', 'Copy EN + ଓଡ଼ିଆ');
        cp.type = 'button';
        cp.addEventListener('click', function () {
          copyText((sn.body_en || '') + '\n\n' + (sn.body_or || ''), 'Copied EN + ଓଡ଼ିଆ snippet!');
        });

        var ed = el('button', 'cps-btn cps-btn-sm', 'Edit');
        ed.type = 'button';
        ed.addEventListener('click', function () {
          state.editingSnippet = sn;
          renderView();
        });

        var del = el('button', 'cps-btn cps-btn-sm cps-btn-danger', 'Delete');
        del.type = 'button';
        del.addEventListener('click', function () {
          if (!window.confirm('Delete snippet "' + sn.title_en + '"?')) return;
          api('/api/admin/careers/snippets', 'POST', { action: 'delete', id: sn.id })
            .then(function () { toast('Snippet deleted.', 'emerald'); loadData(); })
            .catch(function (err) { toast(err.message, 'crimson'); });
        });

        acts.append(ins, cp, ed, del);
        sc.appendChild(acts);
        grid.appendChild(sc);
      });
    }

    libCard.append(libHead, fRow, grid);
    wrap.appendChild(libCard);
    return wrap;
  }

  // =========================================================================
  // COMPOSER: FULL BILINGUAL CAREER ROADMAP AUTHORING + POP-UP & TOKEN PREVIEW
  // =========================================================================
  function renderComposerPanel() {
    var model = state.editing || emptyFormModel();
    var card = el('section', 'cps-card');

    if (window.CSOAiCoAuthor && window.CSOAiCoAuthor.renderDrawer) {
      card.appendChild(window.CSOAiCoAuthor.renderDrawer({
        mode: 'career',
        hint: 'Enter a career role or exam pathway (e.g. "OPSC OAS Officer Roadmap"). Auto-fills bilingual EN + ଓଡ଼ିଆ title, slug, summary & eligibility table.',
        onApply: function (data) {
          if (data.title_en) model.title_en = data.title_en;
          if (data.title_or) model.title_or = data.title_or;
          if (data.slug) model.slug = data.slug;
          if (data.summary_en) model.summary_en = data.summary_en;
          if (data.summary_or) model.summary_or = data.summary_or;
          if (data.eligibility_table_html) {
            model.roadmap_body_en = (model.roadmap_body_en ? model.roadmap_body_en + '\n\n' : '') + data.eligibility_table_html;
          }
          state.editing = model;
          render();
        }
      }));
    }

    var form = document.createElement('form');
    form.id = 'csoCareersComposerForm';
    form.noValidate = true;

    function makeField(labelText, inputEl, spanFull, extraHeaderEl) {
      var f = el('div', 'cps-field' + (spanFull ? ' cps-span-full' : ''));
      var row = el('div', 'cps-label-row');
      var lbl = el('label', 'cps-label', labelText);
      if (inputEl.id) lbl.setAttribute('for', inputEl.id);
      row.appendChild(lbl);
      if (extraHeaderEl) row.appendChild(extraHeaderEl);
      f.append(row, inputEl);
      return f;
    }

    // Inputs
    var inpTitleEn = el('input', 'cps-input');
    inpTitleEn.id = 'cps-title-en';
    inpTitleEn.type = 'text';
    inpTitleEn.required = true;
    inpTitleEn.placeholder = 'e.g., Odisha Administrative Service (OAS) Complete Career Roadmap';
    inpTitleEn.value = model.title_en || '';

    var inpTitleOr = el('input', 'cps-input');
    inpTitleOr.id = 'cps-title-or';
    inpTitleOr.type = 'text';
    inpTitleOr.placeholder = 'e.g., ଓଡ଼ିଶା ପ୍ରଶାସନିକ ସେବା (OAS) ସମ୍ପୂର୍ଣ୍ଣ କ୍ୟାରିୟର୍ ମାର୍ଗଦର୍ଶିକା';
    inpTitleOr.value = model.title_or || '';

    var inpSlug = el('input', 'cps-input');
    inpSlug.id = 'cps-slug';
    inpSlug.type = 'text';
    inpSlug.placeholder = 'odisha-administrative-service-oas-roadmap';
    inpSlug.value = model.slug || '';

    inpTitleEn.addEventListener('input', function () {
      if (!model.id && !inpSlug.dataset.manual) inpSlug.value = slugify(inpTitleEn.value);
    });
    inpSlug.addEventListener('input', function () { inpSlug.dataset.manual = '1'; });

    var selStatus = el('select', 'cps-select');
    selStatus.id = 'cps-status';
    [['draft', 'Draft'], ['published', 'Published'], ['archived', 'Archived']].forEach(function (p) {
      selStatus.appendChild(new Option(p[1], p[0]));
    });
    selStatus.value = model.status || 'draft';

    // 3-Layer Cascading Taxonomy Dropdowns (L1 Track -> L2 Sub-Track -> L3 Role)
    var selTrack = el('select', 'cps-select');
    selTrack.id = 'cps-track';
    (state.taxonomy.tracks || []).forEach(function (n) {
      selTrack.appendChild(new Option(n.label_en + (n.label_or ? ' (' + n.label_or + ')' : ''), n.slug));
    });
    selTrack.value = model.track_slug || 'civil-services';

    var selSubtrack = el('select', 'cps-select');
    selSubtrack.id = 'cps-subtrack';
    function populateSubtracks(selectedVal) {
      clear(selSubtrack);
      selSubtrack.appendChild(new Option('— Select L2 Sub-Track (Optional) —', ''));
      getSubtracksForTrackSlug(selTrack.value).forEach(function (n) {
        selSubtrack.appendChild(new Option(n.label_en, n.slug));
      });
      selSubtrack.value = selectedVal || '';
    }

    var selRole = el('select', 'cps-select');
    selRole.id = 'cps-role-stream';
    function populateRoles(selectedVal) {
      clear(selRole);
      selRole.appendChild(new Option('— Select L3 Role / Pathway (Optional) —', ''));
      getRolesForSubtrackSlug(selSubtrack.value).forEach(function (n) {
        selRole.appendChild(new Option(n.label_en, n.slug));
      });
      selRole.value = selectedVal || '';
    }

    populateSubtracks(model.subtrack_slug);
    populateRoles(model.role_stream_slug);

    selTrack.addEventListener('change', function () {
      populateSubtracks('');
      populateRoles('');
    });
    selSubtrack.addEventListener('change', function () {
      populateRoles('');
    });

    function makeInlineAddBtn(kind, idAttr) {
      var b = el('button', 'cps-inline-add-btn', '+ Add Option');
      b.type = 'button';
      if (idAttr) b.id = idAttr;
      b.addEventListener('click', function () {
        syncDraftFromInputs();
        state.inlineTaxKind = state.inlineTaxKind === kind ? '' : kind;
        renderView();
      });
      return b;
    }

    var btnAddTrack = makeInlineAddBtn('track', 'cps-add-track-btn');
    var btnAddSubtrack = makeInlineAddBtn('subtrack', 'cps-add-subtrack-btn');
    var btnAddRole = makeInlineAddBtn('role_stream', 'cps-add-role-btn');
    var btnAddRegion = makeInlineAddBtn('region', 'cps-add-region-btn');
    var btnAddStage = makeInlineAddBtn('stage', 'cps-add-stage-btn');

    var selRegion = el('select', 'cps-select');
    selRegion.id = 'cps-region';
    (state.taxonomy.regions || []).forEach(function (n) {
      selRegion.appendChild(new Option(n.label_en, n.slug));
    });
    selRegion.value = model.region_scope || 'odisha';

    var selStage = el('select', 'cps-select');
    selStage.id = 'cps-stage';
    (state.taxonomy.stages || []).forEach(function (n) {
      selStage.appendChild(new Option(n.label_en, n.slug));
    });
    selStage.value = model.career_stage || 'graduate';

    var inpElig = el('input', 'cps-input');
    inpElig.id = 'cps-eligibility';
    inpElig.type = 'text';
    inpElig.placeholder = 'e.g., Bachelor Degree in any stream, Age 21-38 yrs, Odia proficiency';
    inpElig.value = model.eligibility_summary || '';

    var inpSalary = el('input', 'cps-input');
    inpSalary.id = 'cps-salary';
    inpSalary.type = 'text';
    inpSalary.placeholder = 'e.g., ORSP Level-12 (₹56,100 – ₹1,77,500)';
    inpSalary.value = model.salary_band || '';

    var inpExams = el('input', 'cps-input');
    inpExams.id = 'cps-key-exams';
    inpExams.type = 'text';
    inpExams.placeholder = 'e.g., OPSC OCS, UPSC CSE, OSSC CGL';
    inpExams.value = model.key_exams || '';

    var txtSumEn = el('textarea', 'cps-textarea');
    txtSumEn.id = 'cps-summary-en';
    txtSumEn.rows = 3;
    txtSumEn.placeholder = 'Concise English summary shown on the Careers Explorer card...';
    txtSumEn.value = model.summary_en || '';

    var txtSumOr = el('textarea', 'cps-textarea');
    txtSumOr.id = 'cps-summary-or';
    txtSumOr.rows = 3;
    txtSumOr.placeholder = 'ଓଡ଼ିଆରେ ସଂକ୍ଷିପ୍ତ ବିବରଣୀ...';
    txtSumOr.value = model.summary_or || '';

    var txtBodyEn = el('textarea', 'cps-textarea cps-textarea--body');
    txtBodyEn.id = 'cps-body-en';
    txtBodyEn.rows = 9;
    txtBodyEn.placeholder = '### Step 1: Qualification & Age\n...\n\n### Step 2: Selection Pattern\n...\n\n### Step 3: Career Growth & Promotions\n...';
    txtBodyEn.value = model.roadmap_body_en || '';

    var txtBodyOr = el('textarea', 'cps-textarea cps-textarea--body');
    txtBodyOr.id = 'cps-body-or';
    txtBodyOr.rows = 9;
    txtBodyOr.placeholder = '### ପର୍ଯ୍ୟାୟ ୧: ଶିକ୍ଷାଗତ ଯୋଗ୍ୟତା\n...\n\n### ପର୍ଯ୍ୟାୟ ୨: ପରୀକ୍ଷା ପଦ୍ଧତି\n...';
    txtBodyOr.value = model.roadmap_body_or || '';

    var chkFeat = document.createElement('input');
    chkFeat.type = 'checkbox';
    chkFeat.id = 'cps-featured';
    chkFeat.checked = Boolean(model.featured);

    var statusMsg = el('span', 'cps-status-msg', '');

    function collectPayload(overrideStatus) {
      return {
        id: (state.editing && state.editing.id) || model.id || undefined,
        title_en: inpTitleEn.value.trim(),
        title_or: inpTitleOr.value.trim(),
        slug: inpSlug.value.trim() || slugify(inpTitleEn.value),
        track_slug: selTrack.value,
        subtrack_slug: selSubtrack.value,
        role_stream_slug: selRole.value,
        region_scope: selRegion.value,
        career_stage: selStage.value,
        eligibility_summary: inpElig.value.trim(),
        salary_band: inpSalary.value.trim(),
        key_exams: inpExams.value.trim(),
        summary_en: txtSumEn.value.trim(),
        summary_or: txtSumOr.value.trim(),
        roadmap_body_en: txtBodyEn.value.trim(),
        roadmap_body_or: txtBodyOr.value.trim(),
        official_links: state.linksDraft.filter(function (x) { return x.url && x.url.trim(); }),
        status: overrideStatus || selStatus.value,
        featured: chkFeat.checked ? 1 : 0
      };
    }

    function syncDraftFromInputs() {
      state.editing = Object.assign(emptyFormModel(), collectPayload());
    }

    function persistGuide(overrideStatus, opts) {
      opts = opts || {};
      var payload = collectPayload(overrideStatus);
      if (!payload.title_en) {
        statusMsg.textContent = 'English title is required.';
        toast('Please enter an English title first.', 'amber');
        inpTitleEn.focus();
        return Promise.resolve(null);
      }
      if (overrideStatus) selStatus.value = overrideStatus;
      statusMsg.textContent = overrideStatus === 'published' ? 'Publishing live to D1 & /careers/…' : 'Saving to D1…';
      return api('/api/admin/careers', 'POST', payload).then(function (d) {
        if (d && d.item) {
          state.editing = d.item;
        }
        statusMsg.textContent = overrideStatus === 'published' ? 'Published live on /careers/!' : 'Draft saved to D1.';
        toast(overrideStatus === 'published' ? 'Career guide published live & public cache purged!' : 'Draft saved to D1!', 'emerald');
        if (overrideStatus === 'published' && d && d.item && window.CSOPublishTools && window.CSOPublishTools.runPublishChain) {
          window.CSOPublishTools.runPublishChain('careers', d.item);
        }
        if (!opts.skipReload) loadData(true);
        return d && d.item ? d.item : null;
      }).catch(function (err) {
        statusMsg.textContent = err.message;
        toast(err.message, 'crimson');
        return null;
      });
    }

    // Sticky Top Composer Action Bar
    var topBar = el('div', 'cps-composer-bar');
    topBar.appendChild(el('h2', 'cps-card-title', model.id ? 'Edit Bilingual Career Roadmap' : 'Author New Bilingual Career Roadmap'));

    var barActions = el('div', 'cps-composer-bar-actions');
    var btnSaveDraft = el('button', 'cps-btn', 'Save Draft');
    btnSaveDraft.type = 'button';
    btnSaveDraft.addEventListener('click', function () { persistGuide('draft'); });

    var btnPopupPreview = el('button', 'cps-btn', '👁 Pop-Up Preview');
    btnPopupPreview.type = 'button';
    btnPopupPreview.id = 'cpsPopupPreviewBtn';
    btnPopupPreview.addEventListener('click', function () {
      openPopupPreviewModal(collectPayload());
    });

    var btnTempLink = el('button', 'cps-btn cps-btn-preview', 'Open Temporary Preview Link ↗');
    btnTempLink.type = 'button';
    btnTempLink.id = 'cpsTempPreviewLinkBtn';
    btnTempLink.addEventListener('click', function () {
      var curId = (state.editing && state.editing.id) || model.id;
      if (curId) {
        persistGuide(selStatus.value, { skipReload: true }).then(function (saved) {
          if (saved && saved.id) generateAndOpenTempPreview(saved.id);
        });
      } else {
        persistGuide('draft', { skipReload: true }).then(function (saved) {
          if (saved && saved.id) generateAndOpenTempPreview(saved.id);
        });
      }
    });

    var btnSanity = el('button', 'cps-btn', '✅ Sanity Check');
    btnSanity.type = 'button';
    btnSanity.addEventListener('click', function () {
      if (window.CSOPublishTools && window.CSOPublishTools.runSanityCheck) {
        window.CSOPublishTools.runSanityCheck('careers', collectPayload(), function () { persistGuide('published'); });
      }
    });

    var btnPublishNow = el('button', 'cps-btn cps-btn-publish', 'Publish Now');
    btnPublishNow.type = 'button';
    btnPublishNow.id = 'cpsPublishNowBtn';
    btnPublishNow.addEventListener('click', function () { persistGuide('published'); });

    if (window.CSOAiCoAuthor && window.CSOAiCoAuthor.createTranslateAllBtn) {
      barActions.appendChild(window.CSOAiCoAuthor.createTranslateAllBtn(function () {
        return [
          { key: 'title_or', getEn: function () { return inpTitleEn.value; }, getOr: function () { return inpTitleOr.value; }, targetInput: inpTitleOr },
          { key: 'summary_or', getEn: function () { return txtSumEn.value; }, getOr: function () { return txtSumOr.value; }, targetInput: txtSumOr },
          { key: 'content_body_or', getEn: function () { return txtBodyEn.value; }, getOr: function () { return txtBodyOr.value; }, targetInput: txtBodyOr }
        ];
      }));
    }
    barActions.append(btnSaveDraft, btnSanity, btnPopupPreview, btnTempLink, btnPublishNow);
    topBar.appendChild(barActions);

    card.appendChild(topBar);

    if (window.CSOAiCoAuthor && window.CSOAiCoAuthor.renderMetaSuggester) {
      card.appendChild(window.CSOAiCoAuthor.renderMetaSuggester({
        kind: 'Odisha career roadmap',
        getSeedText: function () { return [inpTitleEn.value, inpElig.value, txtSumEn.value].filter(Boolean).join(' — '); },
        onApplyTitlePair: function (en, or, sl) {
          inpTitleEn.value = en;
          if (or) inpTitleOr.value = or;
          if (sl && !inpSlug.value.trim()) inpSlug.value = sl;
          toast('Applied bilingual career title pair.', 'emerald');
        },
        onApplySlug: function (sl) { inpSlug.value = sl; toast('Applied SEO slug.', 'emerald'); },
        onApplyTag: function (tag) {
          var cur = inpExams.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          if (cur.indexOf(tag) === -1) cur.push(tag);
          inpExams.value = cur.join(', ');
        },
        onApplyAllTags: function (tags) {
          var cur = inpExams.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          (tags || []).forEach(function (t) { if (cur.indexOf(t) === -1) cur.push(t); });
          inpExams.value = cur.join(', ');
        }
      }));
    }

    // Active temporary preview link banner (if generated)
    if (state.activePreviewUrl) {
      var pBox = el('div', 'cps-preview-link-box');
      var pInfo = el('div');
      pInfo.appendChild(el('strong', '', 'Temporary Shareable Draft Preview Link (24h): '));
      pInfo.appendChild(el('span', 'cps-preview-link-url', window.location.origin + state.activePreviewUrl));
      var pBtns = el('div', 'cps-row-actions');
      var copyBtn = el('button', 'cps-btn cps-btn-sm', 'Copy Link');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () { copyText(window.location.origin + state.activePreviewUrl, 'Temporary preview link copied!'); });
      var openA = el('a', 'cps-btn cps-btn-sm cps-btn-preview', 'Open Tab ↗');
      openA.href = state.activePreviewUrl;
      openA.target = '_blank';
      openA.rel = 'noopener noreferrer';
      pBtns.append(copyBtn, openA);
      pBox.append(pInfo, pBtns);
      card.appendChild(pBox);
    }

    // Quick Bilingual Snippets Bar inside Composer
    var snipBar = el('div', 'cps-snippets-bar');
    (state.snippets || []).slice(0, 6).forEach(function (sn) {
      var chip = el('button', 'cps-chip-btn', '+ ' + sn.title_en);
      chip.type = 'button';
      chip.addEventListener('click', function () {
        txtBodyEn.value = (txtBodyEn.value ? txtBodyEn.value + '\n\n' : '') + (sn.body_en || '');
        txtBodyOr.value = (txtBodyOr.value ? txtBodyOr.value + '\n\n' : '') + (sn.body_or || '');
        toast('Inserted EN + ଓଡ଼ିଆ snippet: ' + sn.title_en, 'emerald');
        txtBodyEn.focus();
      });
      snipBar.appendChild(chip);
    });

    var grid = el('div', 'cps-form-grid');
    grid.append(
      makeField('Title (English) *', inpTitleEn, false),
      makeField('Title (ଓଡ଼ିଆ)', inpTitleOr, false, window.CSOAiCoAuthor && window.CSOAiCoAuthor.createOdiaTranslateBtn ? window.CSOAiCoAuthor.createOdiaTranslateBtn(function () { return inpTitleEn.value; }, inpTitleOr, 'title') : null),
      makeField('URL Slug', inpSlug, false),
      makeField('Publication Status', selStatus, false),
      makeField('1. L1 Career Track', selTrack, false, btnAddTrack),
      makeField('2. L2 Sub-Track / Domain', selSubtrack, false, btnAddSubtrack),
      makeField('3. L3 Role / Pathway', selRole, false, btnAddRole),
      makeField('Region / Scope', selRegion, false, btnAddRegion),
      makeField('Career Stage', selStage, false, btnAddStage),
      makeField('Salary / Pay Level Band', inpSalary, false)
    );

    // Inline "+ Add Option" taxonomy creator box
    if (state.inlineTaxKind) {
      var taxBox = el('div', 'cps-inline-tax-box cps-span-full');
      var taxEn = el('input', 'cps-input');
      taxEn.id = 'cps-inline-tax-en';
      taxEn.type = 'text';
      taxEn.placeholder = 'New ' + state.inlineTaxKind + ' label (English) *';
      var taxOr = el('input', 'cps-input');
      taxOr.id = 'cps-inline-tax-or';
      taxOr.type = 'text';
      taxOr.placeholder = 'Label (ଓଡ଼ିଆ, optional)';
      var taxSave = el('button', 'cps-btn cps-btn-primary', 'Add ' + state.inlineTaxKind);
      taxSave.type = 'button';
      taxSave.addEventListener('click', function () {
        var lblEn = taxEn.value.trim();
        if (!lblEn) { toast('Enter an English label first.', 'amber'); return; }
        var parentId = '';
        if (state.inlineTaxKind === 'subtrack') {
          var trObj = findBySlug(state.taxonomy.tracks, selTrack.value);
          parentId = trObj ? trObj.id : '';
        } else if (state.inlineTaxKind === 'role_stream') {
          var subObj = findBySlug(state.taxonomy.subtracks, selSubtrack.value);
          if (!subObj) { toast('Select an L2 Sub-Track first before adding an L3 Role.', 'amber'); return; }
          parentId = subObj.id;
        }
        api('/api/admin/careers/taxonomy', 'POST', {
          kind: state.inlineTaxKind,
          parent_id: parentId,
          label_en: lblEn,
          label_or: taxOr.value.trim()
        }).then(function (d) {
          toast('Added new ' + state.inlineTaxKind + ' option!', 'emerald');
          if (d && d.node && state.editing) {
            if (state.inlineTaxKind === 'track') state.editing.track_slug = d.node.slug;
            if (state.inlineTaxKind === 'subtrack') state.editing.subtrack_slug = d.node.slug;
            if (state.inlineTaxKind === 'role_stream') state.editing.role_stream_slug = d.node.slug;
            if (state.inlineTaxKind === 'region') state.editing.region_scope = d.node.slug;
            if (state.inlineTaxKind === 'stage') state.editing.career_stage = d.node.slug;
          }
          state.inlineTaxKind = '';
          loadData(true);
        }).catch(function (err) { toast(err.message, 'crimson'); });
      });
      var taxCancel = el('button', 'cps-btn', 'Cancel');
      taxCancel.type = 'button';
      taxCancel.addEventListener('click', function () {
        state.inlineTaxKind = '';
        renderView();
      });
      taxBox.append(taxEn, taxOr, taxSave, taxCancel);
      grid.appendChild(taxBox);
    }

    grid.append(
      makeField('Eligibility Summary', inpElig, false),
      makeField('Key Exams (comma-separated)', inpExams, false),
      makeField('Summary (English)', txtSumEn, false),
      makeField('Summary (ଓଡ଼ିଆ)', txtSumOr, false, window.CSOAiCoAuthor && window.CSOAiCoAuthor.createOdiaTranslateBtn ? window.CSOAiCoAuthor.createOdiaTranslateBtn(function () { return txtSumEn.value; }, txtSumOr, 'summary') : null),
      makeField('Structured Roadmap Content (English)', txtBodyEn, true, snipBar),
      makeField('Structured Roadmap Content (ଓଡ଼ିଆ)', txtBodyOr, true, window.CSOAiCoAuthor && window.CSOAiCoAuthor.createOdiaTranslateBtn ? window.CSOAiCoAuthor.createOdiaTranslateBtn(function () { return txtBodyEn.value; }, txtBodyOr, 'body') : null)
    );

    // Official Links editor
    var linksWrap = el('div', 'cps-field cps-span-full');
    var linksHead = el('div', 'cps-label-row');
    linksHead.appendChild(el('span', 'cps-label', 'Official Portal Links (.gov.in / Verified URLs)'));
    var addLinkBtn = el('button', 'cps-inline-add-btn', '+ Add Link');
    addLinkBtn.type = 'button';
    addLinkBtn.addEventListener('click', function () {
      state.linksDraft.push({ label: '', url: '' });
      renderLinksRows();
    });
    linksHead.appendChild(addLinkBtn);
    var linksList = el('div', 'cps-links-editor');
    function renderLinksRows() {
      clear(linksList);
      state.linksDraft.forEach(function (lk, idx) {
        var row = el('div', 'cps-link-row');
        var lInp = el('input', 'cps-input');
        lInp.type = 'text';
        lInp.placeholder = 'Portal Label (e.g., OPSC Official Portal)';
        lInp.value = lk.label || '';
        lInp.addEventListener('input', function () { lk.label = lInp.value; });

        var uInp = el('input', 'cps-input');
        uInp.type = 'url';
        uInp.placeholder = 'https://www.opsc.gov.in/';
        uInp.value = lk.url || '';
        uInp.addEventListener('input', function () { lk.url = uInp.value; });

        var rmBtn = el('button', 'cps-btn cps-btn-sm', '✕');
        rmBtn.type = 'button';
        rmBtn.setAttribute('aria-label', 'Remove link');
        rmBtn.addEventListener('click', function () {
          state.linksDraft.splice(idx, 1);
          if (!state.linksDraft.length) state.linksDraft.push({ label: '', url: '' });
          renderLinksRows();
        });
        row.append(lInp, uInp);
        if (window.CSOFilePicker && window.CSOFilePicker.createPickerButton) {
          row.appendChild(window.CSOFilePicker.createPickerButton({
            label: '📁 R2 File',
            folder: 'Careers',
            className: 'cps-btn cps-btn-sm',
            onSelect: function (item) {
              lk.url = item.clean_url;
              uInp.value = item.clean_url;
              if (!lk.label) { lk.label = item.original_name; lInp.value = item.original_name; }
            }
          }));
        }
        row.appendChild(rmBtn);
        linksList.appendChild(row);
      });
    }
    renderLinksRows();
    linksWrap.append(linksHead, linksList);
    grid.appendChild(linksWrap);

    // Featured checkbox
    var featWrap = el('div', 'cps-field cps-span-full');
    var featLbl = el('label', 'cps-check-label');
    featLbl.append(chkFeat, document.createTextNode(' Feature this career roadmap on public /careers/'));
    featWrap.appendChild(featLbl);
    grid.appendChild(featWrap);

    // Bottom Actions
    var actions = el('div', 'cps-actions');
    var saveBtn = el('button', 'cps-btn cps-btn-primary', model.id ? 'Save Career Roadmap' : 'Save Draft');
    saveBtn.type = 'submit';
    var pubBottom = el('button', 'cps-btn cps-btn-publish', 'Publish Now');
    pubBottom.type = 'button';
    pubBottom.addEventListener('click', function () { persistGuide('published'); });
    var cancelBtn = el('button', 'cps-btn', '← Back to Directory');
    cancelBtn.type = 'button';
    cancelBtn.addEventListener('click', function () {
      state.tab = 'list';
      syncSidebarSubTab('list');
      renderView();
    });
    actions.append(saveBtn, pubBottom, cancelBtn, statusMsg);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      persistGuide(null);
    });

    form.append(grid, actions);
    card.appendChild(form);
    return card;
  }

  function renderView() {
    if (!state.root) return;
    renderHeaderActions();
    var wrap = el('div', 'cps-root');

    // Live-Sync Badge Banner (v278 — confirms Admin Careers folder powers public Careers ▾ two-stage dropdown)
    var activeL1Count = (state.taxonomy.tracks || []).filter(function (n) { return Number(n.active ?? 1) === 1; }).length;
    var activeL2Count = (state.taxonomy.subtracks || []).filter(function (n) { return Number(n.active ?? 1) === 1; }).length;
    var syncBanner = el('div', 'cps-live-sync-banner');
    syncBanner.setAttribute('role', 'status');
    var syncLeft = el('div', 'cps-live-sync-left');
    var syncPill = el('span', 'cps-live-sync-pill');
    syncPill.appendChild(el('span', 'cps-live-sync-dot'));
    syncPill.appendChild(document.createTextNode(' Live Synced to Public Careers ▾ Menu'));
    syncLeft.appendChild(syncPill);
    syncLeft.appendChild(el('span', 'cps-live-sync-copy', activeL1Count + ' active L1 Career Tracks & ' + activeL2Count + ' active L2 Sub-Tracks in this folder power Stage 1 (vertical dropdown) and Stage 2 (right-side flyout) with instant edge cache purge.'));
    syncBanner.appendChild(syncLeft);
    var syncBtn = el('button', 'cps-btn cps-btn-sm', 'Manage Menu Tracks');
    syncBtn.type = 'button';
    syncBtn.addEventListener('click', function () {
      state.tab = 'taxonomy';
      syncSidebarSubTab('taxonomy');
      renderView();
    });
    syncBanner.appendChild(syncBtn);
    wrap.appendChild(syncBanner);

    wrap.appendChild(renderKpis());
    wrap.appendChild(renderTabs());
    if (state.tab === 'composer') {
      wrap.appendChild(renderComposerPanel());
    } else if (state.tab === 'taxonomy') {
      wrap.appendChild(renderTaxonomyPanel());
    } else if (state.tab === 'snippets') {
      wrap.appendChild(renderSnippetsPanel());
    } else {
      wrap.appendChild(renderListPanel());
    }
    state.root.replaceChildren(wrap);
  }

  window.CSOCareersPublishingStudio = {
    render: function (rootEl, headerActionsEl, initialTab, initialTrackSlug) {
      state.root = rootEl;
      state.headerActions = headerActionsEl;
      if (initialTrackSlug !== undefined) {
        state.filters.track = initialTrackSlug || '';
        state.filters.subtrack = '';
      }
      if (initialTab === 'new' || initialTab === 'composer') {
        state.editing = emptyFormModel();
        state.linksDraft = [{ label: '', url: '' }];
        state.activePreviewUrl = '';
        state.activePreviewExp = '';
        state.tab = 'composer';
      } else if (initialTab === 'taxonomy') {
        state.tab = 'taxonomy';
      } else if (initialTab === 'snippets') {
        state.tab = 'snippets';
      } else {
        state.tab = 'list';
      }
      renderView();
      loadData();
    }
  };
})(window, document);
