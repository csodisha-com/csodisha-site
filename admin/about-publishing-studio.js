/**
 * CS Odisha — About & Institutional Transparency Studio (v253)
 * Strict CSP-compliant Admin Studio module (Alt+5):
 *  - Zero HTML string sinks, zero inline style attributes, zero inline event handlers.
 *  - 5 Integrated Tabs:
 *      1. Institutional Pages & Profiles (KPIs, 3-layer filters, full bilingual composer)
 *      2. 3-Layer Institutional Hierarchy Studio (Pillar -> Section -> Format)
 *      3. Verified Official Portals Registry (.gov.in Anti-Fraud Source Directory)
 *      4. Public Contact, Partnership & Grievance Inbox
 *      5. Legacy Pages, Legal & SEO Sitemaps (Preserved Legacy Tools)
 */
(function (window, document) {
  'use strict';

  var DOC_TYPES = ['Institutional Charter', 'Editorial Policy', 'Author / Mentor Profile', 'Legal / Privacy', 'Impact Report', 'Public FAQ'];
  var SECTORS = ['Odisha State', 'Central Govt', 'Scholarships & DBT', 'Recruitment Commissions'];

  var S = {
    root: null,
    headerActions: null,
    activeTab: 'pages',
    taxonomyNodes: [],
    articles: [],
    kpis: { total_pages: 0, published_live: 0, scheduled_drafts: 0, verified_portals: 0, open_inquiries: 0 },
    sources: [],
    inquiries: [],
    inquiryCounts: { open: 0, replied: 0, resolved: 0, archived: 0 },
    inquiryFilter: 'open',
    snippets: [],
    filters: { l1: '', l2: '', l3: '', type: '', status: '', search: '' },
    taxSelL1: '',
    taxSelL2: '',
    composerOpen: false,
    editingArticle: null,
    revisions: [],
    legacyMountId: 'module-pages-all'
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

  function csrfToken() {
    var m = document.cookie.match(/(?:^|;\s*)cso_csrf=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  async function api(url, opts) {
    var o = Object.assign({ credentials: 'same-origin' }, opts || {});
    var headers = Object.assign({}, o.headers || {});
    var method = String(o.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      var tok = csrfToken();
      if (tok) headers['X-CSRF-Token'] = tok;
      if (o.body && typeof o.body === 'object' && !(o.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        o.body = JSON.stringify(o.body);
      }
    }
    o.headers = headers;
    var res = await fetch(url, o);
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.error || ('Request failed (' + res.status + ')'));
    return data;
  }

  function nodesByLevel(lvl, parentId) {
    return S.taxonomyNodes.filter(function (n) {
      if (Number(n.level) !== lvl) return false;
      if (lvl === 1) return true;
      return String(n.parent_id || '') === String(parentId || '');
    });
  }

  async function loadAllData() {
    var q = new URLSearchParams();
    Object.keys(S.filters).forEach(function (k) { if (S.filters[k]) q.set(k, S.filters[k]); });
    var qs = q.toString() ? ('?' + q.toString()) : '';
    var results = await Promise.all([
      api('/api/admin/about/taxonomy').catch(function () { return { nodes: [] }; }),
      api('/api/admin/about/articles' + qs).catch(function () { return { items: [], kpis: S.kpis }; }),
      api('/api/admin/about/sources').catch(function () { return { items: [] }; }),
      api('/api/admin/about/inquiries?status=' + encodeURIComponent(S.inquiryFilter)).catch(function () { return { items: [], counts: S.inquiryCounts }; }),
      api('/api/admin/jobs/snippets').catch(function () { return { items: [] }; })
    ]);
    S.taxonomyNodes = results[0].nodes || [];
    S.articles = results[1].items || [];
    S.kpis = results[1].kpis || S.kpis;
    S.sources = results[2].items || [];
    S.inquiries = results[3].items || [];
    S.inquiryCounts = results[3].counts || S.inquiryCounts;
    S.snippets = results[4].items || [];
    if (window.CSOStudio && window.CSOStudio.setAboutCount) {
      window.CSOStudio.setAboutCount(S.kpis.total_pages || S.articles.length);
    }
  }

  async function refreshAndRender() {
    try {
      await loadAllData();
      renderWorkspace();
    } catch (e) { toast(e.message || 'Failed to sync About Studio.', 'error'); }
  }

  function renderHeaderActions() {
    if (!S.headerActions) return;
    clear(S.headerActions);

    var bNew = el('button', 'abps-btn abps-btn-primary', '+ Publish New Institutional Page / Profile');
    bNew.type = 'button';
    bNew.addEventListener('click', function () { openComposer(null); });

    var aLive = el('a', 'abps-btn', 'View Live About Portal ↗');
    aLive.href = '/about/';
    aLive.target = '_blank';
    aLive.rel = 'noopener noreferrer';

    var bSync = el('button', 'abps-btn', '↻ Sync D1');
    bSync.type = 'button';
    bSync.addEventListener('click', function () { refreshAndRender(); toast('About Studio synced from live D1.', 'info'); });

    S.headerActions.append(bNew, aLive, bSync);
  }

  function renderTabs(shell) {
    var tabs = el('div', 'abps-tabs');
    tabs.setAttribute('role', 'tablist');
    [
      { id: 'pages', label: '🏛 Institutional Pages & Profiles', count: S.kpis.total_pages || 0 },
      { id: 'taxonomy', label: '🗂 3-Layer Institutional Hierarchy', count: S.taxonomyNodes.length },
      { id: 'sources', label: '🛡️ Verified Official Portals Registry', count: S.sources.length },
      { id: 'inquiries', label: '📩 Contact, Partnership & Grievance Inbox', count: S.inquiryCounts.open || 0, alert: (S.inquiryCounts.open || 0) > 0 },
      { id: 'legacy', label: '⚖️ Legacy Pages, Legal & SEO Sitemaps', count: 'Tools' }
    ].forEach(function (d) {
      var b = el('button', 'abps-tab-btn' + (S.activeTab === d.id && !S.composerOpen ? ' is-active' : ''));
      b.type = 'button';
      b.append(el('span', '', d.label), el('span', 'abps-tab-badge' + (d.alert ? ' is-alert' : ''), String(d.count)));
      b.addEventListener('click', function () { S.composerOpen = false; S.activeTab = d.id; renderWorkspace(); });
      tabs.appendChild(b);
    });
    shell.appendChild(tabs);
  }

  // ============================================================================
  // TAB 1: INSTITUTIONAL PAGES & PROFILES
  // ============================================================================
  function renderPagesTab(shell) {
    var kpis = el('div', 'abps-kpi-grid');
    [
      ['Total Institutional Pages', S.kpis.total_pages || 0, ''],
      ['Published Live', S.kpis.published_live || 0, 'is-emerald'],
      ['Scheduled / Drafts', S.kpis.scheduled_drafts || 0, 'is-amber'],
      ['Verified .gov.in Portals', S.kpis.verified_portals || S.sources.length, 'is-cobalt'],
      ['Open Public Inquiries', S.kpis.open_inquiries || S.inquiryCounts.open || 0, 'is-rose']
    ].forEach(function (k) {
      var c = el('div', 'abps-kpi ' + k[2]);
      c.append(el('span', 'abps-kpi-label', k[0]), el('strong', 'abps-kpi-val', String(k[1])));
      kpis.appendChild(c);
    });
    shell.appendChild(kpis);

    var fbar = el('div', 'abps-filter-bar');
    var selL1 = el('select', 'abps-select');
    selL1.appendChild(new Option('All Pillars (L1)', ''));
    nodesByLevel(1).forEach(function (n) { selL1.appendChild(new Option(n.title_en, n.id)); });
    selL1.value = S.filters.l1;
    selL1.addEventListener('change', function () { S.filters.l1 = selL1.value; S.filters.l2 = ''; S.filters.l3 = ''; refreshAndRender(); });

    var selL2 = el('select', 'abps-select');
    selL2.appendChild(new Option('All Sections (L2)', ''));
    if (S.filters.l1) nodesByLevel(2, S.filters.l1).forEach(function (n) { selL2.appendChild(new Option(n.title_en, n.id)); });
    selL2.value = S.filters.l2;
    selL2.addEventListener('change', function () { S.filters.l2 = selL2.value; S.filters.l3 = ''; refreshAndRender(); });

    var selL3 = el('select', 'abps-select');
    selL3.appendChild(new Option('All Formats (L3)', ''));
    if (S.filters.l2) nodesByLevel(3, S.filters.l2).forEach(function (n) { selL3.appendChild(new Option(n.title_en, n.id)); });
    selL3.value = S.filters.l3;
    selL3.addEventListener('change', function () { S.filters.l3 = selL3.value; refreshAndRender(); });

    var selType = el('select', 'abps-select');
    selType.appendChild(new Option('All Document Types', ''));
    DOC_TYPES.forEach(function (t) { selType.appendChild(new Option(t, t)); });
    selType.value = S.filters.type;
    selType.addEventListener('change', function () { S.filters.type = selType.value; refreshAndRender(); });

    var selStat = el('select', 'abps-select');
    [['', 'All Status'], ['published', 'Published'], ['scheduled', 'Scheduled'], ['draft', 'Draft']].forEach(function (p) { selStat.appendChild(new Option(p[1], p[0])); });
    selStat.value = S.filters.status;
    selStat.addEventListener('change', function () { S.filters.status = selStat.value; refreshAndRender(); });

    var qInp = el('input', 'abps-input abps-search');
    qInp.type = 'search'; qInp.placeholder = 'Search pages, policies, author profiles...'; qInp.value = S.filters.search;
    qInp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { S.filters.search = qInp.value.trim(); refreshAndRender(); } });

    var bGo = el('button', 'abps-btn', 'Filter'); bGo.type = 'button';
    bGo.addEventListener('click', function () { S.filters.search = qInp.value.trim(); refreshAndRender(); });
    fbar.append(selL1, selL2, selL3, selType, selStat, qInp, bGo);
    shell.appendChild(fbar);

    if (!S.articles.length) {
      shell.appendChild(el('div', 'abps-empty', 'No institutional pages match your filters yet.'));
      return;
    }

    var tw = el('div', 'abps-table-wrap');
    var tbl = el('table', 'abps-table');
    var th = el('thead'); var hr = el('tr');
    ['Page / Profile', '3-Layer Hierarchy', 'Document Type', 'Status & Views', 'Actions'].forEach(function (h) { hr.appendChild(el('th', '', h)); });
    th.appendChild(hr); tbl.appendChild(th);

    var tb = el('tbody');
    S.articles.forEach(function (a) {
      var tr = el('tr');
      var td1 = el('td');
      td1.appendChild(el('strong', '', a.title_en));
      if (a.title_or) td1.appendChild(el('div', 'abps-row-sub', a.title_or));
      if (a.person_role_en) td1.appendChild(el('div', 'abps-row-sub', '👤 ' + a.person_role_en + (a.person_district ? ' · ' + a.person_district : '')));
      td1.appendChild(el('div', 'abps-row-sub', '/about/?slug=' + a.slug));
      tr.appendChild(td1);

      var crumbs = [a.taxonomy && a.taxonomy.l1 && a.taxonomy.l1.title_en, a.taxonomy && a.taxonomy.l2 && a.taxonomy.l2.title_en, a.taxonomy && a.taxonomy.l3 && a.taxonomy.l3.title_en].filter(Boolean);
      tr.appendChild(el('td', 'abps-row-sub', crumbs.join(' › ') || 'General'));
      tr.appendChild(el('td', '', a.doc_type_badge));

      var tdS = el('td');
      tdS.appendChild(el('span', 'abps-pill is-' + a.status, a.status.toUpperCase()));
      tdS.appendChild(el('div', 'abps-row-sub', '👁 ' + a.views_count + ' · ⬇ ' + a.pdf_downloads_count));
      tr.appendChild(tdS);

      var tdA = el('td');
      var acts = el('div', 'abps-actions');
      var bEdit = el('button', 'abps-btn abps-btn-sm abps-btn-primary', 'Edit'); bEdit.type = 'button';
      bEdit.addEventListener('click', async function () {
        var r = await api('/api/admin/about/articles/' + encodeURIComponent(a.id));
        S.revisions = r.revisions || [];
        openComposer(r.item);
      });
      var bPrev = el('button', 'abps-btn abps-btn-sm', 'Preview ↗'); bPrev.type = 'button';
      bPrev.addEventListener('click', function () { openPreviewById(a.id, a.slug, a.is_published); });
      var bDel = el('button', 'abps-btn abps-btn-sm abps-btn-danger', 'Delete'); bDel.type = 'button';
      bDel.addEventListener('click', async function () {
        if (!window.confirm('Delete "' + a.title_en + '" permanently?')) return;
        await api('/api/admin/about/articles/' + encodeURIComponent(a.id), { method: 'DELETE' });
        toast('Institutional page deleted & caches purged.', 'success');
        refreshAndRender();
      });
      acts.append(bEdit, bPrev, bDel); tdA.appendChild(acts); tr.appendChild(tdA);
      tb.appendChild(tr);
    });
    tbl.appendChild(tb); tw.appendChild(tbl); shell.appendChild(tw);
  }

  async function openPreviewById(id, slug, isPub) {
    try {
      if (isPub) { window.open('/about/?slug=' + encodeURIComponent(slug), '_blank', 'noopener'); return; }
      var res = await api('/api/admin/about/' + encodeURIComponent(id) + '/preview-token', { method: 'POST', body: {} });
      window.open(res.preview_url, '_blank', 'noopener');
      toast('Opened real public-page draft preview (expires in 2h).', 'success');
    } catch (e) { toast(e.message, 'error'); }
  }

  // ============================================================================
  // EDITORIAL & BIO COMPOSER
  // ============================================================================
  function openComposer(item) {
    S.editingArticle = item ? JSON.parse(JSON.stringify(item)) : {
      id: '', slug: '', category_l1_id: '', category_l2_id: '', category_l3_id: '',
      doc_type_badge: 'Institutional Charter', title_en: '', title_or: '', subtitle_en: '', subtitle_or: '',
      summary_en: '', summary_or: '', person_role_en: '', person_role_or: '', person_credentials: '', person_district: '',
      effective_date: '', cover_image_url: '', cover_image_caption: '', article_body_en: '', article_body_or: '',
      highlights_table: [], verification_steps: [], impact_metrics: [], faq_items: [], reference_links: [],
      charter_pdf_url: '', press_kit_pdf_url: '', pdf_index_bookmarks: [], revision_note_en: '', revision_note_or: '',
      scheduled_publish_at: '', is_featured: false, is_published: false
    };
    if (!item) S.revisions = [];
    S.composerOpen = true;
    renderWorkspace();
  }

  function openQuickAddTaxModal(level, parentId, onCreated) {
    var modal = document.getElementById('globalModal');
    var titleEl = document.getElementById('modalTitle');
    var bodyEl = document.getElementById('modalBody');
    var footEl = document.getElementById('modalFooter');
    if (!modal || !bodyEl || !footEl) return;

    titleEl.textContent = '+ Add Institutional Level ' + level + ' Category';
    clear(bodyEl); clear(footEl);
    var fEn = el('input', 'abps-input'); fEn.placeholder = 'English Title *';
    var fOr = el('input', 'abps-input'); fOr.placeholder = 'ଓଡ଼ିଆ ଶୀର୍ଷକ';
    var fIcon = el('input', 'abps-input'); fIcon.value = level === 1 ? '🏛️' : (level === 2 ? '📘' : '📋');
    [['Title (EN) *', fEn], ['Title (ଓଡ଼ିଆ)', fOr], ['Icon', fIcon]].forEach(function (pr) {
      var fg = el('div', 'abps-field'); fg.append(el('label', '', pr[0]), pr[1]); bodyEl.appendChild(fg);
    });
    var bCan = el('button', 'abps-btn', 'Cancel'); bCan.type = 'button'; bCan.addEventListener('click', function () { modal.hidden = true; });
    var bSave = el('button', 'abps-btn abps-btn-primary', 'Create Live'); bSave.type = 'button';
    bSave.addEventListener('click', async function () {
      if (!fEn.value.trim()) { toast('English title required.', 'error'); return; }
      var res = await api('/api/admin/about/taxonomy', { method: 'POST', body: { level: level, parent_id: level === 1 ? null : parentId, title_en: fEn.value.trim(), title_or: fOr.value.trim(), icon: fIcon.value.trim(), is_published: 1 } });
      modal.hidden = true;
      await loadAllData();
      if (onCreated) onCreated(res.node);
    });
    footEl.append(bCan, bSave);
    modal.hidden = false;
  }

  function renderComposer(shell) {
    var a = S.editingArticle;
    var sec = el('section', 'abps-section');
    var head = el('div', 'abps-section-head');
    var bBack = el('button', 'abps-btn', '← Back to Pages'); bBack.type = 'button';
    bBack.addEventListener('click', function () { S.composerOpen = false; renderWorkspace(); });
    head.append(bBack, el('h2', 'abps-section-title', a.id ? 'Edit: ' + a.title_en : 'Publish New Institutional Page / Author Profile'));
    sec.appendChild(head);

    // 3-Layer Taxonomy Selector with inline + Add
    var selL1 = el('select', 'abps-select'), selL2 = el('select', 'abps-select'), selL3 = el('select', 'abps-select');
    function fillTax() {
      clear(selL1); selL1.appendChild(new Option('Institutional Pillar (L1)...', ''));
      nodesByLevel(1).forEach(function (n) { selL1.appendChild(new Option(n.title_en, n.id)); });
      selL1.value = a.category_l1_id || '';
      clear(selL2); selL2.appendChild(new Option('Section / Dept (L2)...', ''));
      if (a.category_l1_id) nodesByLevel(2, a.category_l1_id).forEach(function (n) { selL2.appendChild(new Option(n.title_en, n.id)); });
      selL2.value = a.category_l2_id || '';
      clear(selL3); selL3.appendChild(new Option('Format (L3)...', ''));
      if (a.category_l2_id) nodesByLevel(3, a.category_l2_id).forEach(function (n) { selL3.appendChild(new Option(n.title_en, n.id)); });
      selL3.value = a.category_l3_id || '';
    }
    fillTax();
    selL1.addEventListener('change', function () { a.category_l1_id = selL1.value; a.category_l2_id = ''; a.category_l3_id = ''; fillTax(); });
    selL2.addEventListener('change', function () { a.category_l2_id = selL2.value; a.category_l3_id = ''; fillTax(); });
    selL3.addEventListener('change', function () { a.category_l3_id = selL3.value; });

    function taxField(lbl, sel, lvl) {
      var fg = el('div', 'abps-field'); fg.appendChild(el('label', '', lbl));
      var r = el('div', 'abps-inline-row'); r.appendChild(sel);
      var b = el('button', 'abps-btn abps-btn-sm', '+ Add'); b.type = 'button';
      b.addEventListener('click', function () {
        if (lvl === 2 && !a.category_l1_id) { toast('Select L1 first.', 'error'); return; }
        if (lvl === 3 && !a.category_l2_id) { toast('Select L2 first.', 'error'); return; }
        openQuickAddTaxModal(lvl, lvl === 2 ? a.category_l1_id : (lvl === 3 ? a.category_l2_id : null), function (node) {
          if (lvl === 1) { a.category_l1_id = node.id; a.category_l2_id = ''; a.category_l3_id = ''; }
          if (lvl === 2) { a.category_l2_id = node.id; a.category_l3_id = ''; }
          if (lvl === 3) a.category_l3_id = node.id;
          fillTax();
        });
      });
      r.appendChild(b); fg.appendChild(r); return fg;
    }
    var gTax = el('div', 'abps-grid-3');
    gTax.append(taxField('Pillar (L1)', selL1, 1), taxField('Section (L2)', selL2, 2), taxField('Format (L3)', selL3, 3));
    sec.appendChild(gTax);

    function fld(l, c) { var d = el('div', 'abps-field'); d.append(el('label', '', l), c); return d; }
    var docSel = el('select', 'abps-select'); DOC_TYPES.forEach(function (t) { docSel.appendChild(new Option(t, t)); });
    docSel.value = a.doc_type_badge || 'Institutional Charter'; docSel.addEventListener('change', function () { a.doc_type_badge = docSel.value; });
    var tEn = el('input', 'abps-input'); tEn.value = a.title_en || ''; tEn.addEventListener('input', function () { a.title_en = tEn.value; });
    var tOr = el('input', 'abps-input'); tOr.value = a.title_or || ''; tOr.addEventListener('input', function () { a.title_or = tOr.value; });
    var sEn = el('textarea', 'abps-textarea'); sEn.rows = 2; sEn.value = a.summary_en || ''; sEn.addEventListener('input', function () { a.summary_en = sEn.value; });
    var sOr = el('textarea', 'abps-textarea'); sOr.rows = 2; sOr.value = a.summary_or || ''; sOr.addEventListener('input', function () { a.summary_or = sOr.value; });

    var roleEn = el('input', 'abps-input'); roleEn.value = a.person_role_en || ''; roleEn.placeholder = 'Optional: Senior Editor / OAS Mentor'; roleEn.addEventListener('input', function () { a.person_role_en = roleEn.value; });
    var roleOr = el('input', 'abps-input'); roleOr.value = a.person_role_or || ''; roleOr.placeholder = 'ପଦବୀ (ଓଡ଼ିଆ)'; roleOr.addEventListener('input', function () { a.person_role_or = roleOr.value; });
    var creds = el('input', 'abps-input'); creds.value = a.person_credentials || ''; creds.placeholder = 'Credentials (e.g. M.A. History, Utkal Univ.)'; creds.addEventListener('input', function () { a.person_credentials = creds.value; });
    var dist = el('input', 'abps-input'); dist.value = a.person_district || ''; dist.placeholder = 'Odisha District'; dist.addEventListener('input', function () { a.person_district = dist.value; });
    var effDate = el('input', 'abps-input'); effDate.type = 'date'; effDate.value = a.effective_date || ''; effDate.addEventListener('input', function () { a.effective_date = effDate.value; });

    var gMeta = el('div', 'abps-grid-2');
    gMeta.append(fld('Document Type Badge', docSel), fld('Effective Date', effDate), fld('Title (English) *', tEn), fld('Title (ଓଡ଼ିଆ)', tOr), fld('Summary (EN)', sEn), fld('Summary (ଓଡ଼ିଆ)', sOr));
    var gBio = el('div', 'abps-grid-2');
    gBio.append(fld('Author / Mentor Role (EN — Optional)', roleEn), fld('Role (ଓଡ଼ିଆ)', roleOr), fld('Academic / Exam Credentials', creds), fld('Odisha District', dist));
    sec.append(gMeta, gBio);

    // Media & PDFs
    var covUrl = el('input', 'abps-input'); covUrl.value = a.cover_image_url || ''; covUrl.addEventListener('input', function () { a.cover_image_url = covUrl.value; });
    var covFile = el('input', 'abps-input'); covFile.type = 'file'; covFile.accept = 'image/jpeg,image/png,image/webp';
    covFile.addEventListener('change', async function () {
      if (!covFile.files || !covFile.files[0]) return;
      var fd = new FormData(); fd.append('file', covFile.files[0]); fd.append('purpose', 'cover');
      var r = await api('/api/admin/about/upload', { method: 'POST', body: fd });
      a.cover_image_url = r.url; covUrl.value = r.url; toast('Cover uploaded to R2.', 'success');
    });
    var chPdf = el('input', 'abps-input'); chPdf.value = a.charter_pdf_url || ''; chPdf.addEventListener('input', function () { a.charter_pdf_url = chPdf.value; });
    var chFile = el('input', 'abps-input'); chFile.type = 'file'; chFile.accept = 'application/pdf';
    chFile.addEventListener('change', async function () {
      if (!chFile.files || !chFile.files[0]) return;
      var fd = new FormData(); fd.append('file', chFile.files[0]); fd.append('purpose', 'charter-pdf');
      var r = await api('/api/admin/about/upload', { method: 'POST', body: fd });
      a.charter_pdf_url = r.url; chPdf.value = r.url; toast('Charter PDF uploaded to R2.', 'success');
    });
    var prPdf = el('input', 'abps-input'); prPdf.value = a.press_kit_pdf_url || ''; prPdf.addEventListener('input', function () { a.press_kit_pdf_url = prPdf.value; });
    var prFile = el('input', 'abps-input'); prFile.type = 'file'; prFile.accept = 'application/pdf';
    prFile.addEventListener('change', async function () {
      if (!prFile.files || !prFile.files[0]) return;
      var fd = new FormData(); fd.append('file', prFile.files[0]); fd.append('purpose', 'press-kit');
      var r = await api('/api/admin/about/upload', { method: 'POST', body: fd });
      a.press_kit_pdf_url = r.url; prPdf.value = r.url; toast('Brochure PDF uploaded to R2.', 'success');
    });

    var gMed = el('div', 'abps-grid-3');
    var c1 = el('div', 'abps-field'); c1.append(el('label', '', 'Cover / Portrait Photo (R2)'), covFile, covUrl);
    var c2 = el('div', 'abps-field'); c2.append(el('label', '', 'Charter / Policy PDF (R2)'), chFile, chPdf);
    var c3 = el('div', 'abps-field'); c3.append(el('label', '', 'Media / Brochure PDF (R2)'), prFile, prPdf);
    gMed.append(c1, c2, c3);
    sec.appendChild(gMed);

    // Rich Bilingual Editor + Reusable Snippets
    var snipRow = el('div', 'abps-inline-row');
    var snipSel = el('select', 'abps-select');
    snipSel.appendChild(new Option('Insert Reusable Snippet...', ''));
    S.snippets.forEach(function (sn) { snipSel.appendChild(new Option('[' + (sn.category || 'general') + '] ' + sn.title_en, sn.id)); });
    var bIns = el('button', 'abps-btn abps-btn-sm abps-btn-emerald', '+ Insert Snippet'); bIns.type = 'button';
    bIns.addEventListener('click', function () {
      var sn = S.snippets.find(function (x) { return x.id === snipSel.value; });
      if (!sn) return;
      a.article_body_en = (a.article_body_en ? a.article_body_en + '\n\n' : '') + (sn.body_en || '');
      a.article_body_or = (a.article_body_or ? a.article_body_or + '\n\n' : '') + (sn.body_or || '');
      bEn.value = a.article_body_en; bOr.value = a.article_body_or;
      toast('Inserted bilingual snippet.', 'success');
    });
    snipRow.append(snipSel, bIns);
    sec.appendChild(snipRow);

    var bEn = el('textarea', 'abps-textarea'); bEn.rows = 8; bEn.value = a.article_body_en || ''; bEn.addEventListener('input', function () { a.article_body_en = bEn.value; });
    var bOr = el('textarea', 'abps-textarea'); bOr.rows = 8; bOr.value = a.article_body_or || ''; bOr.addEventListener('input', function () { a.article_body_or = bOr.value; });
    var gBody = el('div', 'abps-grid-2');
    gBody.append(fld('Article Body (English)', bEn), fld('Article Body (ଓଡ଼ିଆ)', bOr));
    sec.appendChild(gBody);

    // No-Code Builders
    sec.appendChild(makeRepeater('Core Principles / Highlights Table', a.highlights_table, [
      { k: 'principle_en', l: 'Principle (EN)' }, { k: 'principle_or', l: 'Principle (OR)' }, { k: 'detail_en', l: 'Detail (EN)' }
    ], function () { return { principle_en: '', principle_or: '', detail_en: '', detail_or: '' }; }));

    sec.appendChild(makeRepeater('Editorial Verification Steps', a.verification_steps, [
      { k: 'step', l: 'Step Title' }, { k: 'detail_en', l: 'Detail (EN)' }, { k: 'detail_or', l: 'Detail (OR)' }
    ], function () { return { step: '', detail_en: '', detail_or: '' }; }));

    sec.appendChild(makeRepeater('Platform Impact & Transparency Metrics', a.impact_metrics, [
      { k: 'metric', l: 'Metric (e.g. 30 Districts)' }, { k: 'label_en', l: 'Label (EN)' }, { k: 'label_or', l: 'Label (OR)' }
    ], function () { return { metric: '', label_en: '', label_or: '' }; }));

    sec.appendChild(makeRepeater('Public FAQs (EN & ଓଡ଼ିଆ)', a.faq_items, [
      { k: 'q_en', l: 'Question (EN)' }, { k: 'a_en', l: 'Answer (EN)' }, { k: 'q_or', l: 'Question (OR)' }, { k: 'a_or', l: 'Answer (OR)' }
    ], function () { return { q_en: '', a_en: '', q_or: '', a_or: '' }; }));

    var schedInp = el('input', 'abps-input'); schedInp.type = 'datetime-local';
    if (a.scheduled_publish_at) schedInp.value = String(a.scheduled_publish_at).replace(' ', 'T').slice(0, 16);
    schedInp.addEventListener('input', function () { a.scheduled_publish_at = schedInp.value; });
    sec.appendChild(fld('Scheduled Publish Date/Time (Optional)', schedInp));

    // Revision History
    if (a.id && S.revisions.length) {
      var rvBox = el('div', 'abps-field');
      rvBox.appendChild(el('strong', '', 'Revision History (' + S.revisions.length + ')'));
      S.revisions.slice(0, 6).forEach(function (rv) {
        var r = el('div', 'abps-inline-row');
        r.appendChild(el('span', 'abps-row-sub', 'Rev #' + rv.revision_number + ' · ' + rv.change_summary + ' · ' + rv.created_at));
        var br = el('button', 'abps-btn abps-btn-sm', 'Rollback'); br.type = 'button';
        br.addEventListener('click', async function () {
          if (!window.confirm('Restore Rev #' + rv.revision_number + '?')) return;
          var res = await api('/api/admin/about/' + encodeURIComponent(a.id) + '/rollback', { method: 'POST', body: { revision_id: rv.id } });
          toast('Rolled back to Rev #' + rv.revision_number, 'success');
          openComposer(res.item);
        });
        r.appendChild(br); rvBox.appendChild(r);
      });
      sec.appendChild(rvBox);
    }

    var foot = el('div', 'abps-actions');
    var bDraft = el('button', 'abps-btn', 'Save Draft'); bDraft.type = 'button';
    bDraft.addEventListener('click', function () { savePage(false, false); });
    var bPrev = el('button', 'abps-btn abps-btn-amber', 'Save Draft & Open Public Preview ↗'); bPrev.type = 'button';
    bPrev.addEventListener('click', function () { savePage(a.is_published, true); });
    var bPub = el('button', 'abps-btn abps-btn-emerald', a.is_published ? 'Update Live Page' : '🚀 Publish Live Now'); bPub.type = 'button';
    bPub.addEventListener('click', function () { savePage(true, false); });
    foot.append(bDraft, bPrev, bPub);
    sec.appendChild(foot);
    shell.appendChild(sec);
  }

  function makeRepeater(title, listRef, cols, factory) {
    var box = el('div', 'abps-field');
    var h = el('div', 'abps-section-head');
    h.appendChild(el('strong', '', title));
    var bAdd = el('button', 'abps-btn abps-btn-sm', '+ Add Row'); bAdd.type = 'button';
    h.appendChild(bAdd);
    box.appendChild(h);
    var rowsWrap = el('div', 'abps-field');
    function draw() {
      clear(rowsWrap);
      listRef.forEach(function (row, idx) {
        var r = el('div', 'abps-repeater-row');
        cols.forEach(function (c) {
          var inp = el('input', 'abps-input'); inp.placeholder = c.l; inp.value = row[c.k] || '';
          inp.addEventListener('input', function () { row[c.k] = inp.value; });
          r.appendChild(inp);
        });
        var bDel = el('button', 'abps-btn abps-btn-sm abps-btn-danger', '×'); bDel.type = 'button';
        bDel.addEventListener('click', function () { listRef.splice(idx, 1); draw(); });
        r.appendChild(bDel); rowsWrap.appendChild(r);
      });
    }
    bAdd.addEventListener('click', function () { listRef.push(factory()); draw(); });
    draw();
    box.appendChild(rowsWrap);
    return box;
  }

  async function savePage(publishFlag, openPrev) {
    var a = S.editingArticle;
    if (!a.title_en || !a.title_en.trim()) { toast('English title is required.', 'error'); return; }
    var payload = Object.assign({}, a, { is_published: publishFlag ? 1 : 0 });
    try {
      var res = a.id
        ? await api('/api/admin/about/articles/' + encodeURIComponent(a.id), { method: 'PUT', body: payload })
        : await api('/api/admin/about/articles', { method: 'POST', body: payload });
      S.editingArticle = res.item;
      if (openPrev) await openPreviewById(res.item.id, res.item.slug, false);
      else toast(publishFlag ? 'Published live & edge caches purged!' : 'Draft saved.', 'success');
      await loadAllData();
      renderWorkspace();
    } catch (e) { toast(e.message, 'error'); }
  }

  // ============================================================================
  // TAB 2: 3-LAYER INSTITUTIONAL HIERARCHY STUDIO
  // ============================================================================
  function renderTaxonomyTab(shell) {
    var l1 = nodesByLevel(1);
    if (!S.taxSelL1 && l1.length) S.taxSelL1 = l1[0].id;
    var l2 = S.taxSelL1 ? nodesByLevel(2, S.taxSelL1) : [];
    if (S.taxSelL2 && !l2.some(function (n) { return n.id === S.taxSelL2; })) S.taxSelL2 = '';
    if (!S.taxSelL2 && l2.length) S.taxSelL2 = l2[0].id;
    var l3 = S.taxSelL2 ? nodesByLevel(3, S.taxSelL2) : [];

    var grid = el('div', 'abps-tax-grid');
    function col(lvl, title, list, pId, selId, onSel) {
      var c = el('div', 'abps-tax-col');
      var h = el('div', 'abps-section-head');
      h.appendChild(el('strong', '', title + ' (' + list.length + ')'));
      var bA = el('button', 'abps-btn abps-btn-sm abps-btn-primary', '+ Add'); bA.type = 'button';
      bA.addEventListener('click', function () {
        if (lvl > 1 && !pId) { toast('Select parent node first.', 'error'); return; }
        openQuickAddTaxModal(lvl, pId, function () { refreshAndRender(); });
      });
      h.appendChild(bA); c.appendChild(h);
      list.forEach(function (n) {
        var it = el('div', 'abps-tax-item' + (selId === n.id ? ' is-selected' : ''));
        it.addEventListener('click', function () { if (onSel) onSel(n.id); });
        it.append(el('strong', '', (n.icon ? n.icon + ' ' : '') + n.title_en), el('div', 'abps-row-sub', (n.title_or || '') + ' · ' + (n.pages_count || 0) + ' pages'));
        var acts = el('div', 'abps-actions');
        var bUp = el('button', 'abps-btn abps-btn-sm', '↑'); bUp.type = 'button';
        bUp.addEventListener('click', async function (ev) { ev.stopPropagation(); await api('/api/admin/about/taxonomy/' + encodeURIComponent(n.id) + '/move', { method: 'POST', body: { direction: 'up' } }); refreshAndRender(); });
        var bDn = el('button', 'abps-btn abps-btn-sm', '↓'); bDn.type = 'button';
        bDn.addEventListener('click', async function (ev) { ev.stopPropagation(); await api('/api/admin/about/taxonomy/' + encodeURIComponent(n.id) + '/move', { method: 'POST', body: { direction: 'down' } }); refreshAndRender(); });
        var bDel = el('button', 'abps-btn abps-btn-sm abps-btn-danger', '×'); bDel.type = 'button';
        bDel.addEventListener('click', async function (ev) {
          ev.stopPropagation();
          if (!window.confirm('Delete "' + n.title_en + '"?')) return;
          try { await api('/api/admin/about/taxonomy/' + encodeURIComponent(n.id), { method: 'DELETE' }); refreshAndRender(); }
          catch (err) { toast(err.message, 'error'); }
        });
        acts.append(bUp, bDn, bDel); it.appendChild(acts); c.appendChild(it);
      });
      return c;
    }
    grid.append(
      col(1, 'L1: Institutional Pillar', l1, null, S.taxSelL1, function (id) { S.taxSelL1 = id; S.taxSelL2 = ''; renderWorkspace(); }),
      col(2, 'L2: Section / Dept', l2, S.taxSelL1, S.taxSelL2, function (id) { S.taxSelL2 = id; renderWorkspace(); }),
      col(3, 'L3: Format', l3, S.taxSelL2, '', null)
    );
    shell.appendChild(grid);
  }

  // ============================================================================
  // TAB 3: VERIFIED OFFICIAL PORTALS REGISTRY (.gov.in ANTI-FRAUD DIRECTORY)
  // ============================================================================
  function renderSourcesTab(shell) {
    var sec = el('section', 'abps-section');
    sec.appendChild(el('h3', 'abps-section-title', 'Add Verified Official .gov.in / .nic.in Portal'));
    var g = el('div', 'abps-grid-3');
    var sSec = el('select', 'abps-select'); SECTORS.forEach(function (x) { sSec.appendChild(new Option(x, x)); });
    var inName = el('input', 'abps-input'); inName.placeholder = 'Authority Name (EN) *';
    var inNameOr = el('input', 'abps-input'); inNameOr.placeholder = 'Authority Name (ଓଡ଼ିଆ)';
    var inUrl = el('input', 'abps-input'); inUrl.placeholder = 'https://www.opsc.gov.in/ *';
    var inPurp = el('input', 'abps-input'); inPurp.placeholder = 'Official purpose (EN)';
    var inHelp = el('input', 'abps-input'); inHelp.placeholder = 'Official helpline / toll-free';
    g.append(sSec, inName, inNameOr, inUrl, inPurp, inHelp);

    var bAdd = el('button', 'abps-btn abps-btn-primary', '+ Add Verified Portal Live'); bAdd.type = 'button';
    bAdd.addEventListener('click', async function () {
      if (!inName.value.trim() || !inUrl.value.trim()) { toast('Name and official URL required.', 'error'); return; }
      try {
        await api('/api/admin/about/sources', {
          method: 'POST',
          body: { sector: sSec.value, authority_name_en: inName.value.trim(), authority_name_or: inNameOr.value.trim(), official_url: inUrl.value.trim(), purpose_en: inPurp.value.trim(), helpline_info: inHelp.value.trim(), is_verified: 1, is_published: 1 }
        });
        toast('Verified portal published live on /about/!', 'success');
        refreshAndRender();
      } catch (e) { toast(e.message, 'error'); }
    });
    sec.append(g, bAdd);
    shell.appendChild(sec);

    var tw = el('div', 'abps-table-wrap');
    var tbl = el('table', 'abps-table');
    var th = el('thead'); var hr = el('tr');
    ['Authority & URL', 'Sector', 'Domain', 'Purpose & Helpline', 'Actions'].forEach(function (h) { hr.appendChild(el('th', '', h)); });
    th.appendChild(hr); tbl.appendChild(th);
    var tb = el('tbody');
    S.sources.forEach(function (s) {
      var tr = el('tr');
      var td1 = el('td');
      td1.append(el('strong', '', s.authority_name_en), el('div', 'abps-row-sub', s.official_url));
      tr.append(td1, el('td', '', s.sector), el('td', '', s.domain_badge), el('td', 'abps-row-sub', (s.purpose_en || '') + (s.helpline_info ? ' · ☎ ' + s.helpline_info : '')));
      var tdA = el('td');
      var bDel = el('button', 'abps-btn abps-btn-sm abps-btn-danger', 'Delete'); bDel.type = 'button';
      bDel.addEventListener('click', async function () {
        if (!window.confirm('Remove "' + s.authority_name_en + '"?')) return;
        await api('/api/admin/about/sources/' + encodeURIComponent(s.id), { method: 'DELETE' });
        refreshAndRender();
      });
      tdA.appendChild(bDel); tr.appendChild(tdA); tb.appendChild(tr);
    });
    tbl.appendChild(tb); tw.appendChild(tbl); shell.appendChild(tw);
  }

  // ============================================================================
  // TAB 4: PUBLIC CONTACT, PARTNERSHIP & GRIEVANCE INBOX
  // ============================================================================
  function renderInquiriesTab(shell) {
    var fbar = el('div', 'abps-filter-bar');
    [['open', 'Open (' + (S.inquiryCounts.open || 0) + ')'], ['replied', 'Replied (' + (S.inquiryCounts.replied || 0) + ')'], ['resolved', 'Resolved (' + (S.inquiryCounts.resolved || 0) + ')'], ['archived', 'Archived'], ['all', 'All']].forEach(function (o) {
      var b = el('button', 'abps-btn abps-btn-sm' + (S.inquiryFilter === o[0] ? ' abps-btn-primary' : ''), o[1]); b.type = 'button';
      b.addEventListener('click', function () { S.inquiryFilter = o[0]; refreshAndRender(); });
      fbar.appendChild(b);
    });
    shell.appendChild(fbar);

    if (!S.inquiries.length) {
      shell.appendChild(el('div', 'abps-empty', 'No public inquiries in this filter.'));
      return;
    }

    S.inquiries.forEach(function (inq) {
      var card = el('section', 'abps-section');
      var head = el('div', 'abps-section-head');
      head.append(el('strong', '', inq.subject_text + ' (' + String(inq.inquiry_type || '').replace(/_/g, ' ') + ')'), el('span', 'abps-pill is-' + inq.status, inq.status.toUpperCase()));
      card.append(head, el('div', 'abps-row-sub', 'From: ' + inq.sender_name + (inq.sender_email ? ' · ' + inq.sender_email : '') + (inq.district ? ' · ' + inq.district : '') + ' · ' + inq.created_at));
      card.appendChild(el('div', '', inq.message_text));
      var repTa = el('textarea', 'abps-textarea'); repTa.rows = 2; repTa.value = inq.admin_reply || ''; repTa.placeholder = 'Write official Admin response / resolution note...';
      var acts = el('div', 'abps-actions');
      [['replied', 'Save Reply'], ['resolved', 'Mark Resolved'], ['archived', 'Archive']].forEach(function (st) {
        var b = el('button', 'abps-btn abps-btn-sm' + (st[0] === 'resolved' ? ' abps-btn-emerald' : ''), st[1]); b.type = 'button';
        b.addEventListener('click', async function () {
          await api('/api/admin/about/inquiries/' + encodeURIComponent(inq.id), { method: 'PUT', body: { admin_reply: repTa.value.trim(), status: st[0] } });
          toast('Inquiry marked ' + st[0] + '.', 'success');
          refreshAndRender();
        });
        acts.appendChild(b);
      });
      var bDel = el('button', 'abps-btn abps-btn-sm abps-btn-danger', 'Delete'); bDel.type = 'button';
      bDel.addEventListener('click', async function () {
        if (!window.confirm('Delete inquiry?')) return;
        await api('/api/admin/about/inquiries/' + encodeURIComponent(inq.id), { method: 'DELETE' });
        refreshAndRender();
      });
      acts.appendChild(bDel);
      card.append(repTa, acts);
      shell.appendChild(card);
    });
  }

  // ============================================================================
  // TAB 5: LEGACY PAGES, LEGAL & SEO SITEMAPS
  // ============================================================================
  function renderLegacyTab(shell) {
    var sec = el('section', 'abps-section');
    sec.appendChild(el('h3', 'abps-section-title', 'Legacy Pages, Legal Disclosures, Homepage Banner & SEO Sitemaps'));
    var bar = el('div', 'abps-actions');
    var mount = el('div');
    [
      ['module-pages-all', '📄 All Pages'],
      ['module-pages-legal', '⚖️ Info & Legal'],
      ['module-site-banner', '📣 Homepage & Banner'],
      ['module-seo-sitemaps', '🔎 SEO & Sitemaps']
    ].forEach(function (t) {
      var b = el('button', 'abps-btn' + (S.legacyMountId === t[0] ? ' abps-btn-primary' : ''), t[1]); b.type = 'button';
      b.addEventListener('click', function () { S.legacyMountId = t[0]; renderWorkspace(); });
      bar.appendChild(b);
    });
    sec.appendChild(bar);
    shell.append(sec, mount);
    if (window.CSOLive && typeof window.CSOLive.render === 'function') {
      var rendered = window.CSOLive.render('folder-about', S.legacyMountId, mount, el('div'));
      if (!rendered) mount.appendChild(el('div', 'abps-empty', 'Legacy module ready — manage live institutional pages in Tab 1 or open Navigation Manager.'));
    }
  }

  function renderWorkspace() {
    if (!S.root) return;
    renderHeaderActions();
    clear(S.root);
    var shell = el('div', 'abps-root');
    renderTabs(shell);
    if (S.composerOpen) renderComposer(shell);
    else if (S.activeTab === 'taxonomy') renderTaxonomyTab(shell);
    else if (S.activeTab === 'sources') renderSourcesTab(shell);
    else if (S.activeTab === 'inquiries') renderInquiriesTab(shell);
    else if (S.activeTab === 'legacy') renderLegacyTab(shell);
    else renderPagesTab(shell);
    S.root.appendChild(shell);
  }

  window.CSOAboutPublishingStudio = {
    render: function (workspaceRoot, headerActions, initialTab) {
      S.root = workspaceRoot;
      S.headerActions = headerActions;
      if (initialTab === 'new') {
        S.activeTab = 'pages';
        loadAllData().then(function () { openComposer(null); }).catch(function () { openComposer(null); });
        return;
      }
      S.composerOpen = false;
      S.activeTab = ['pages', 'taxonomy', 'sources', 'inquiries', 'legacy'].indexOf(initialTab) !== -1 ? initialTab : 'pages';
      renderWorkspace();
      refreshAndRender();
    }
  };
})(window, document);
