/**
 * CS Odisha Admin Studio — Schemes & Welfare Publishing House, 3-Layer Taxonomy & Citizen Eligibility Engine (v250)
 * 3 Integrated Tabs:
 *   1. Published & Draft Schemes (Article Manager + Full Editorial Composer with inline + Add L1/L2/L3,
 *      PDF-to-Scheme Auto-Draft, Cover Banner R2 Upload/Picker, Rich Bilingual Editor + Snippets Drawer,
 *      No-Code Visual Tables & FAQ Builder, Citizen Eligibility & DBT Readiness Parameters,
 *      Official Links + R2 PDFs + Page Bookmarks, Scheduled Publish + Revisions/Rollback,
 *      Real Public-Page Preview Token Link, Bilingual Broadcast Copy)
 *   2. 3-Layer Category Hierarchy Studio (Gov Level L1 -> Welfare Domain L2 -> Benefit Type L3)
 *   3. Reusable Bilingual Snippets Library (shared editorial_snippets CRUD)
 * Strict CSP-compliant: safe DOM APIs only, zero unsafe HTML string sinks, inline styles, or inline handlers.
 */
(function (window, document) {
  'use strict';

  var SOCIAL_CATEGORIES = ['UR', 'SEBC', 'SC', 'ST', 'EWS', 'PwBD', 'Minority'];
  var SCHEME_STATUS_OPTS = [
    ['active', 'Active / Open'],
    ['ongoing', 'Ongoing Year-Round'],
    ['upcoming', 'Upcoming'],
    ['closed', 'Closed']
  ];
  var RENEWAL_OPTS = ['Fresh', 'Renewal', 'Fresh & Renewal', 'One-Time'];
  var GENDER_OPTS = ['All', 'Female Only', 'Male Only', 'Transgender / All'];
  var APP_MODES = ['Online Portal', 'Mo Seba Kendra / CSC', 'Block / District Office', 'Hybrid (Online + MSK/Offline)'];
  var GOV_SCOPE_OPTS = ['Odisha State', 'Central Government', 'Joint (Centre + State)'];
  var BENEFICIARY_GROUPS = ['All Citizens', 'Women & Girls', 'Farmers', 'Students', 'Senior Citizens & Divyangjan', 'Workers & Entrepreneurs'];
  var OCCUPATIONS = ['', 'All Citizens', 'Women & Girls', 'Farmers', 'Students', 'Senior Citizens & Divyangjan', 'Workers & Entrepreneurs', 'Student', 'Farmer', 'Women / Homemaker', 'Construction / Unorganised Worker', 'Unemployed Youth / Entrepreneur', 'Senior Citizen / Widow / PwD', 'General / Any'];
  var SCHEMES_FLYOUT_CACHE_KEY = 'cso_schemes_flyout_v283';
  var ACCENTS = ['emerald', 'cobalt', 'violet', 'amber', 'rose', 'teal'];

  function clearSchemesFlyoutCache() {
    try { sessionStorage.removeItem(SCHEMES_FLYOUT_CACHE_KEY); } catch (_) {}
    if (window.CSOAdmin && typeof window.CSOAdmin.setSchemesCategoryNodes === 'function') {
      window.CSOAdmin.setSchemesCategoryNodes(state.taxonomyNodes || []);
    }
  }

  var state = {
    tab: 'articles',
    mode: 'list',
    root: null,
    headerActions: null,
    kpis: null,
    articles: [],
    taxonomyNodes: [],
    snippets: [],
    revisions: [],
    filters: { l1: '', l2: '', l3: '', renewal: '', scheme_status: '', status: '', q: '' },
    taxSel: { l1: '', l2: '' },
    draft: null,
    extractedDraft: null,
    activePreviewUrl: '',
    activePreviewExp: ''
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; }
  function toast(msg, kind) { if (typeof window.showToast === 'function') window.showToast(msg, kind || 'info'); }
  function num(v) { try { return Number(v || 0).toLocaleString('en-IN'); } catch (_) { return String(v || 0); } }
  function btn(label, cls, onClick) {
    var b = el('button', cls || 'sph-btn', label);
    b.type = 'button';
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }

  function api(url, method, body, isForm) {
    var opts = { method: method || 'GET', credentials: 'same-origin', headers: { 'X-CSO-CSRF': '1' } };
    if (body !== undefined) {
      if (isForm) opts.body = body;
      else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    }
    return fetch(url, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error((d && (d.error || d.message)) || ('HTTP ' + r.status));
        return d;
      });
    });
  }

  function isGovUrl(raw) {
    try {
      var u = new URL(String(raw || '').trim());
      return u.protocol === 'https:' && /(^|\.)(gov\.in|nic\.in|odisha\.gov\.in|ac\.in|edu\.in)$/i.test(u.hostname);
    } catch (_) { return false; }
  }

  function slugify(raw) {
    return String(raw || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 110);
  }

  function emptyDraft() {
    return {
      id: '', slug: '', category_l1_id: '', category_l2_id: '', category_l3_id: '', gov_badge: '',
      title_en: '', title_or: '', summary_en: '', summary_or: '', department_en: '', department_or: '', scheme_code: '',
      benefit_amount_summary: '', benefit_frequency: 'Annual', dbt_mode: 'NPCI Aadhaar DBT', npci_seeding_required: 1,
      prerequisite_otr_label: '', prerequisite_otr_url: '', target_beneficiaries: '',
      min_age: '', max_age: '', gender_eligibility: 'All', allowed_categories: ['UR', 'SEBC', 'SC', 'ST', 'EWS', 'PwBD'],
      max_annual_income: '', min_qualifying_marks: '', occupation_tag: '', odisha_domicile_required: 1,
      renewal_type: 'Fresh & Renewal', stackable_policy: '', application_mode: 'Online Portal',
      application_start_date: '', last_date: '', institute_verification_date: '', dwo_sanction_date: '', is_ongoing: 0,
      helpline_number: '', grievance_url: '', track_status_url: '', cover_image_url: '', cover_image_caption: '',
      article_body_en: '', article_body_or: '',
      benefits_breakdown: [], eligibility_rules: [], required_documents: [], application_steps: [], important_dates: [], faq_items: [],
      official_apply_url: '', official_portal_url: '', guidelines_pdf_url: '', application_form_pdf_url: '',
      pdf_index_bookmarks: [], extra_attachments: [], scheme_status: 'active',
      amendment_note_en: '', amendment_note_or: '', scheduled_publish_at: '', is_featured: 0, is_published: 0, change_summary: ''
    };
  }

  function copyToClipboard(text, okMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg || 'Copied!', 'ok'); }, function () { toast('Copy failed', 'crimson'); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; ta.className = 'sph-file-hidden';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast(okMsg || 'Copied!', 'ok'); } catch (_) {}
      ta.remove();
    }
  }

  function buildBroadcastText(art) {
    var titleEn = art.title_en || 'Government Welfare Scheme';
    var titleOr = art.title_or || titleEn;
    var ben = art.benefit_amount_summary || 'See Official Guidelines';
    var inc = art.max_annual_income ? ('Income <= ₹' + num(art.max_annual_income)) : 'As per norms';
    var dl = art.is_ongoing ? 'Open Year-Round' : (art.last_date || 'Check Portal');
    var url = 'https://csodisha.com/schemes/?slug=' + encodeURIComponent(art.slug || '');
    return [
      '🏛️ SCHEME ALERT | ' + titleEn,
      '💰 Benefit: ' + ben + (art.benefit_frequency ? (' (' + art.benefit_frequency + ')') : ''),
      '✅ Eligibility: ' + (art.target_beneficiaries || 'Eligible Citizens') + ' · ' + inc,
      '📅 Window: ' + dl + (art.helpline_number ? (' · Helpline: ' + art.helpline_number) : ''),
      '',
      '📢 ଓଡ଼ିଆ ସୂଚନା: ' + titleOr,
      '👉 ସମ୍ପୂର୍ଣ୍ଣ ଯୋଗ୍ୟତା, ଆବଶ୍ୟକ କାଗଜପତ୍ର ଓ ସରକାରୀ ଲିଙ୍କ୍:',
      '🔗 ' + url,
      '',
      '— Common Sense Odisha (csodisha.com)'
    ].join('\n');
  }

  function openStudioModal(title, bodyBuilder, footerButtons) {
    var modal = document.getElementById('globalModal');
    var mTitle = document.getElementById('modalTitle');
    var mBody = document.getElementById('modalBody');
    var mFoot = document.getElementById('modalFooter');
    if (!modal || !mTitle || !mBody || !mFoot) return;
    mTitle.textContent = title; clear(mBody); clear(mFoot);
    if (bodyBuilder) bodyBuilder(mBody);
    (footerButtons || []).forEach(function (b) { mFoot.appendChild(b); });
    modal.hidden = false;
  }

  function closeStudioModal() {
    if (typeof window.closeModal === 'function') window.closeModal();
    else { var m = document.getElementById('globalModal'); if (m) m.hidden = true; }
  }

  function nodesByLevel(level, parentId) {
    return (state.taxonomyNodes || []).filter(function (n) {
      if (Number(n.level) !== Number(level)) return false;
      if (level > 1 && parentId !== undefined) return String(n.parent_id || '') === String(parentId || '');
      return true;
    });
  }

  function findNode(id) { return (state.taxonomyNodes || []).find(function (n) { return n.id === id; }) || null; }

  // ---------- Inline + Add / Edit Scheme Taxonomy Modal ----------
  function openTaxonomyModal(opts) {
    opts = opts || {};
    var level = Number(opts.level || 1);
    var parentId = opts.parentId || null;
    var editing = opts.node || null;
    var levelLabel = level === 1 ? 'Government / Sponsor Level (L1)' : (level === 2 ? 'Welfare Domain / Department (L2)' : 'Beneficiary / Benefit Type (L3)');
    var parentNode = parentId ? findNode(parentId) : null;

    var fTitleEn = el('input', 'sph-input'); fTitleEn.value = editing ? editing.title_en : ''; fTitleEn.placeholder = level === 1 ? 'e.g., Odisha State Government' : (level === 2 ? 'e.g., Education & Scholarships' : 'e.g., Direct Cash Transfer (DBT)');
    var fTitleOr = el('input', 'sph-input'); fTitleOr.value = editing ? editing.title_or : ''; fTitleOr.placeholder = 'ଓଡ଼ିଆ ନାମ';
    var fSubEn = el('input', 'sph-input'); fSubEn.value = editing ? editing.subtitle_en : ''; fSubEn.placeholder = 'Short subtitle (EN)';
    var fSubOr = el('input', 'sph-input'); fSubOr.value = editing ? editing.subtitle_or : ''; fSubOr.placeholder = 'ସଂକ୍ଷିପ୍ତ ବିବରଣୀ (ଓଡ଼ିଆ)';
    var fIcon = el('input', 'sph-input'); fIcon.value = editing ? editing.icon : (level === 1 ? '🏛️' : (level === 2 ? '🎓' : '💸'));
    var fAccent = el('select', 'sph-select');
    ACCENTS.forEach(function (ac) {
      var o = el('option', '', ac); o.value = ac;
      if ((editing ? editing.accent_variant : 'emerald') === ac) o.selected = true;
      fAccent.appendChild(o);
    });
    var fPub = el('input'); fPub.type = 'checkbox'; fPub.checked = editing ? Boolean(editing.is_published) : true;

    openStudioModal((editing ? 'Edit ' : '+ Add ') + levelLabel, function (body) {
      var g = el('div', 'sph-form-grid sph-form-grid--2');
      if (parentNode) g.appendChild(el('div', 'sph-span-2 sph-muted', 'Parent: ' + parentNode.title_en));
      function add(lbl, ctrl) {
        var w = el('div', 'sph-field'); w.appendChild(el('label', 'sph-label', lbl)); w.appendChild(ctrl); g.appendChild(w);
      }
      add('Title (EN) *', fTitleEn); add('Title (ଓଡ଼ିଆ)', fTitleOr);
      add('Subtitle (EN)', fSubEn); add('Subtitle (ଓଡ଼ିଆ)', fSubOr);
      add('Icon Emoji', fIcon); add('Accent Variant', fAccent);
      var pl = el('label', 'sph-check-label sph-span-2'); pl.appendChild(fPub); pl.appendChild(el('span', '', 'Published on Live Portal')); g.appendChild(pl);
      body.appendChild(g);
    }, [
      btn('Cancel', 'sph-btn', closeStudioModal),
      btn(editing ? 'Save Changes' : 'Create Category', 'sph-btn sph-btn--primary', function () {
        var t = fTitleEn.value.trim();
        if (!t) { toast('English title is required', 'crimson'); return; }
        var payload = {
          level: level, parent_id: level === 1 ? null : parentId, title_en: t, title_or: fTitleOr.value.trim(),
          subtitle_en: fSubEn.value.trim(), subtitle_or: fSubOr.value.trim(),
          icon: fIcon.value.trim(), accent_variant: fAccent.value, is_published: fPub.checked ? 1 : 0
        };
        var req = editing
          ? api('/api/admin/schemes/taxonomy/' + encodeURIComponent(editing.id), 'PUT', payload)
          : api('/api/admin/schemes/taxonomy', 'POST', payload);
        req.then(function (d) {
          closeStudioModal();
          toast((editing ? 'Updated ' : 'Created ') + t + ' (D1 & Edge Cache synced)', 'ok');
          return loadTaxonomy().then(function () {
            if (opts.onSaved && d && d.node) opts.onSaved(d.node);
            renderCurrentView();
          });
        }).catch(function (err) { toast(err.message, 'crimson'); });
      })
    ]);
  }

  // ---------- Loaders ----------
  function loadArticles() {
    var qs = new URLSearchParams();
    if (state.filters.l1) qs.set('l1', state.filters.l1);
    if (state.filters.l2) qs.set('l2', state.filters.l2);
    if (state.filters.l3) qs.set('l3', state.filters.l3);
    if (state.filters.renewal) qs.set('renewal', state.filters.renewal);
    if (state.filters.scheme_status) qs.set('scheme_status', state.filters.scheme_status);
    if (state.filters.status) qs.set('status', state.filters.status);
    if (state.filters.q) qs.set('q', state.filters.q);
    return api('/api/admin/schemes/articles?' + qs.toString()).then(function (d) {
      state.kpis = d.kpis || null;
      state.articles = d.items || [];
      if (Array.isArray(d.taxonomy_nodes)) state.taxonomyNodes = d.taxonomy_nodes;
      if (window.CSOStudio && window.CSOStudio.refreshBrandSummary) window.CSOStudio.refreshBrandSummary();
      return d;
    });
  }

  function loadTaxonomy() {
    return api('/api/admin/schemes/taxonomy').then(function (d) { state.taxonomyNodes = d.nodes || []; return d; });
  }

  function loadSnippets() {
    return api('/api/admin/jobs/snippets').then(function (d) { state.snippets = d.items || []; return d; }).catch(function () { state.snippets = []; });
  }

  // ---------- R2 Direct Upload Helper ----------
  function uploadSchemeFile(file, purpose, onDone, statusNode) {
    if (!file) return;
    var fd = new FormData();
    fd.append('file', file);
    fd.append('purpose', purpose || 'scheme-asset');
    if (statusNode) statusNode.textContent = 'Uploading ' + file.name + ' to R2…';
    api('/api/admin/schemes/upload', 'POST', fd, true).then(function (d) {
      if (statusNode) statusNode.textContent = 'Uploaded: ' + d.filename + ' (' + Math.round((d.size_bytes || 0) / 1024) + ' KB)';
      toast('Uploaded ' + d.filename + ' to R2', 'ok');
      if (onDone) onDone(d);
    }).catch(function (err) {
      if (statusNode) statusNode.textContent = 'Upload failed: ' + err.message;
      toast('Upload error: ' + err.message, 'crimson');
    });
  }

  function buildDropzone(opts) {
    var dz = el('div', 'sph-dropzone');
    var status = el('div', 'sph-muted', opts.hint || 'Drag & drop file here or choose from device');
    var input = el('input', 'sph-file-hidden');
    input.type = 'file';
    input.accept = opts.accept || 'application/pdf,image/jpeg,image/png,image/webp';
    input.id = 'sph_up_' + Math.random().toString(36).slice(2, 8);
    var lbl = el('label', 'sph-btn sph-btn--xs', opts.buttonLabel || 'Choose File & Upload to R2');
    lbl.setAttribute('for', input.id);
    input.addEventListener('change', function () {
      if (input.files && input.files[0]) { uploadSchemeFile(input.files[0], opts.purpose, opts.onUploaded, status); input.value = ''; }
    });
    dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('is-dragover'); });
    dz.addEventListener('dragleave', function () { dz.classList.remove('is-dragover'); });
    dz.addEventListener('drop', function (e) {
      e.preventDefault(); dz.classList.remove('is-dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) uploadSchemeFile(e.dataTransfer.files[0], opts.purpose, opts.onUploaded, status);
    });
    dz.appendChild(input);
    var row = el('div', 'sph-actions-row');
    row.appendChild(lbl);
    if (opts.extraButton) row.appendChild(opts.extraButton);
    dz.appendChild(row);
    dz.appendChild(status);
    return dz;
  }

  function buildDynamicTableCard(title, subtitle, rowsArr, columns) {
    var card = el('div', 'sph-card');
    var head = el('div', 'sph-card-head');
    var tw = el('div');
    tw.appendChild(el('h3', 'sph-card-title', title));
    if (subtitle) tw.appendChild(el('div', 'sph-muted', subtitle));
    head.appendChild(tw);
    var box = el('div', 'sph-rows-box');

    function redraw() {
      clear(box);
      if (!rowsArr.length) { box.appendChild(el('div', 'sph-muted', 'No rows added yet — click "+ Add Row".')); return; }
      rowsArr.forEach(function (row, idx) {
        var item = el('div', 'sph-row-item');
        columns.forEach(function (col) {
          if (col.type === 'checkbox') {
            var cl = el('label', 'sph-check-label');
            var cb = el('input'); cb.type = 'checkbox'; cb.checked = Boolean(row[col.key]);
            cb.addEventListener('change', function () { row[col.key] = cb.checked; });
            cl.appendChild(cb); cl.appendChild(el('span', '', col.label));
            item.appendChild(cl);
          } else if (col.type === 'select') {
            var sel = el('select', 'sph-select');
            (col.options || []).forEach(function (o) {
              var op = el('option', '', Array.isArray(o) ? o[1] : o); op.value = Array.isArray(o) ? o[0] : o;
              if (String(row[col.key] || '') === op.value) op.selected = true;
              sel.appendChild(op);
            });
            sel.addEventListener('change', function () { row[col.key] = sel.value; });
            item.appendChild(sel);
          } else {
            var inp = el('input', 'sph-input');
            inp.type = col.type || 'text';
            inp.placeholder = col.placeholder || col.label;
            inp.value = row[col.key] == null ? '' : String(row[col.key]);
            inp.setAttribute('aria-label', col.label);
            inp.addEventListener('input', function () { row[col.key] = inp.value; });
            item.appendChild(inp);
          }
        });
        item.appendChild(btn('✕', 'sph-btn sph-btn--xs sph-btn--danger', function () { rowsArr.splice(idx, 1); redraw(); }));
        box.appendChild(item);
      });
    }

    head.appendChild(btn('+ Add Row', 'sph-btn sph-btn--xs', function () {
      var blank = {};
      columns.forEach(function (c) { blank[c.key] = c.defaultValue !== undefined ? c.defaultValue : ''; });
      rowsArr.push(blank); redraw();
    }));
    card.appendChild(head); card.appendChild(box);
    redraw();
    return card;
  }

  // ======================================================================
  // TAB 1A: SCHEMES LIST VIEW
  // ======================================================================
  function renderArticlesList(container) {
    var k = state.kpis || { total_schemes: 0, published_live: 0, scheduled_or_draft: 0, active_or_ongoing: 0, total_apply_clicks: 0, total_pdf_downloads: 0 };
    var kpiGrid = el('div', 'sph-kpi-grid');
    [
      ['Total Schemes', num(k.total_schemes), 'All welfare articles', 'emerald'],
      ['Published Live', num(k.published_live), 'Live on /schemes/', 'teal'],
      ['Scheduled / Drafts', num(k.scheduled_or_draft), 'Editorial queue', 'amber'],
      ['Active / Ongoing', num(k.active_or_ongoing), 'Open for citizens', 'cobalt'],
      ['Engagement', num((k.total_apply_clicks || 0) + (k.total_pdf_downloads || 0)), num(k.total_apply_clicks) + ' Apply · ' + num(k.total_pdf_downloads) + ' PDFs', 'violet']
    ].forEach(function (t) {
      var c = el('div', 'sph-kpi sph-kpi--' + t[3]);
      c.appendChild(el('span', 'sph-kpi__label', t[0]));
      c.appendChild(el('strong', 'sph-kpi__value', t[1]));
      c.appendChild(el('span', 'sph-kpi__sub', t[2]));
      kpiGrid.appendChild(c);
    });
    container.appendChild(kpiGrid);

    var card = el('section', 'sph-card');
    var head = el('div', 'sph-card-head');
    var hl = el('div');
    hl.appendChild(el('h2', 'sph-card-title', 'Published & Draft Welfare Schemes'));
    hl.appendChild(el('div', 'sph-muted', 'Filter by 3-layer taxonomy (Gov Level → Domain → Benefit Type), renewal policy, window, and publish status.'));
    head.appendChild(hl);
    var hr = el('div', 'sph-actions-row');
    hr.appendChild(btn('↻ Refresh', 'sph-btn', function () { loadArticles().then(renderCurrentView); }));
    hr.appendChild(btn('+ Publish New Scheme Article', 'sph-btn sph-btn--primary', function () { openComposer(null); }));
    head.appendChild(hr);
    card.appendChild(head);

    var fg = el('div', 'sph-filter-grid');
    function makeSel(label, opts, val, onChange) {
      var w = el('div', 'sph-field');
      w.appendChild(el('label', 'sph-label', label));
      var s = el('select', 'sph-select');
      opts.forEach(function (o) {
        var op = el('option', '', o[1]); op.value = o[0];
        if (o[0] === val) op.selected = true;
        s.appendChild(op);
      });
      s.addEventListener('change', function () { onChange(s.value); });
      w.appendChild(s); return w;
    }

    var l1Opts = [['', 'All Government Levels']].concat(nodesByLevel(1).map(function (n) { return [n.id, (n.icon ? n.icon + ' ' : '') + n.title_en]; }));
    var l2Opts = [['', 'All Welfare Domains']].concat((state.filters.l1 ? nodesByLevel(2, state.filters.l1) : nodesByLevel(2)).map(function (n) { return [n.id, n.title_en]; }));
    var l3Opts = [['', 'All Benefit Types']].concat((state.filters.l2 ? nodesByLevel(3, state.filters.l2) : nodesByLevel(3)).map(function (n) { return [n.id, n.title_en]; }));

    fg.appendChild(makeSel('1. Gov Level (L1)', l1Opts, state.filters.l1, function (v) { state.filters.l1 = v; state.filters.l2 = ''; state.filters.l3 = ''; loadArticles().then(renderCurrentView); }));
    fg.appendChild(makeSel('2. Welfare Domain (L2)', l2Opts, state.filters.l2, function (v) { state.filters.l2 = v; state.filters.l3 = ''; loadArticles().then(renderCurrentView); }));
    fg.appendChild(makeSel('3. Benefit Type (L3)', l3Opts, state.filters.l3, function (v) { state.filters.l3 = v; loadArticles().then(renderCurrentView); }));
    fg.appendChild(makeSel('Renewal Type', [['', 'All Renewal Types'], ['fresh', 'Fresh'], ['renewal', 'Renewal'], ['both', 'Fresh & Renewal']], state.filters.renewal, function (v) { state.filters.renewal = v === 'both' ? 'Fresh & Renewal' : v; loadArticles().then(renderCurrentView); }));
    fg.appendChild(makeSel('Scheme Window', [['', 'All Windows']].concat(SCHEME_STATUS_OPTS), state.filters.scheme_status, function (v) { state.filters.scheme_status = v; loadArticles().then(renderCurrentView); }));
    fg.appendChild(makeSel('Publish Status', [['', 'All Statuses'], ['published', 'Published'], ['scheduled', 'Scheduled'], ['draft', 'Draft']], state.filters.status, function (v) { state.filters.status = v; loadArticles().then(renderCurrentView); }));

    var qWrap = el('div', 'sph-field sph-span-2');
    qWrap.appendChild(el('label', 'sph-label', 'Search Schemes'));
    var qInp = el('input', 'sph-input'); qInp.type = 'search'; qInp.placeholder = 'Title, Department, Scheme Code, Beneficiary…'; qInp.value = state.filters.q;
    var qt = null;
    qInp.addEventListener('input', function () { state.filters.q = qInp.value; clearTimeout(qt); qt = setTimeout(function () { loadArticles().then(renderCurrentView); }, 280); });
    qWrap.appendChild(qInp);
    fg.appendChild(qWrap);
    card.appendChild(fg);

    var tw = el('div', 'sph-table-wrap');
    var table = el('table', 'sph-table');
    var thead = el('thead'); var trH = el('tr');
    ['Scheme Article & 3-Layer Taxonomy', 'Department & Benefit', 'Window / Deadline', 'Engagement Telemetry', 'Actions'].forEach(function (h) { trH.appendChild(el('th', '', h)); });
    thead.appendChild(trH); table.appendChild(thead);

    var tbody = el('tbody');
    if (!state.articles.length) {
      var er = el('tr'); var td = el('td'); td.colSpan = 5;
      td.appendChild(el('div', 'sph-muted', 'No scheme articles published yet. Click "+ Publish New Scheme Article" to author your first welfare scheme.'));
      er.appendChild(td); tbody.appendChild(er);
    } else {
      state.articles.forEach(function (a) {
        var tr = el('tr');
        var td1 = el('td');
        var tc = el('div', 'sph-title-cell');
        tc.appendChild(el('div', 'sph-title-main', a.title_en));
        if (a.title_or) tc.appendChild(el('div', 'sph-title-or', a.title_or));
        var crumbs = el('div', 'sph-crumb-pills');
        var stCls = a.publication_status === 'published' ? 'published' : (a.publication_status === 'scheduled' ? 'scheduled' : 'draft');
        crumbs.appendChild(el('span', 'sph-pill sph-pill--' + stCls, a.publication_status.toUpperCase()));
        if (a.taxonomy && a.taxonomy.l1) crumbs.appendChild(el('span', 'sph-pill', a.taxonomy.l1.title_en));
        if (a.taxonomy && a.taxonomy.l2) crumbs.appendChild(el('span', 'sph-pill', '› ' + a.taxonomy.l2.title_en));
        if (a.taxonomy && a.taxonomy.l3) crumbs.appendChild(el('span', 'sph-pill', '› ' + a.taxonomy.l3.title_en));
        tc.appendChild(crumbs); td1.appendChild(tc); tr.appendChild(td1);

        var td2 = el('td');
        td2.appendChild(el('div', '', a.department_en || '—'));
        td2.appendChild(el('div', 'sph-muted', (a.benefit_amount_summary || 'See guidelines') + (a.benefit_frequency ? ' · ' + a.benefit_frequency : '')));
        tr.appendChild(td2);

        var td3 = el('td');
        td3.appendChild(el('div', '', a.is_ongoing ? 'Ongoing Year-Round' : (a.last_date || 'No deadline')));
        td3.appendChild(el('span', 'sph-pill ' + (a.is_expired ? 'sph-pill--closed' : 'sph-pill--published'), a.status_badge || a.scheme_status_label));
        tr.appendChild(td3);

        var td4 = el('td');
        var tel = el('div', 'sph-telemetry');
        tel.appendChild(el('span', '', '👁 ' + num(a.views_count)));
        tel.appendChild(el('span', '', '🔗 ' + num(a.apply_clicks_count)));
        tel.appendChild(el('span', '', '⬇ ' + num(a.pdf_downloads_count)));
        tel.appendChild(el('span', '', '🔖 ' + num(a.bookmarks_count)));
        td4.appendChild(tel); tr.appendChild(td4);

        var td5 = el('td');
        var acts = el('div', 'sph-actions-row');
        acts.appendChild(btn('Edit', 'sph-btn sph-btn--xs', function () {
          api('/api/admin/schemes/articles/' + encodeURIComponent(a.id)).then(function (d) {
            state.revisions = d.revisions || [];
            openComposer(d.item || a);
          }).catch(function () { openComposer(a); });
        }));
        acts.appendChild(btn('Preview ↗', 'sph-btn sph-btn--xs sph-btn--preview', function () {
          if (a.is_published) {
            window.open('/schemes/?slug=' + encodeURIComponent(a.slug), '_blank', 'noopener');
          } else {
            api('/api/admin/schemes/' + encodeURIComponent(a.id) + '/preview-token', 'POST', {}).then(function (p) {
              window.open(p.preview_url, '_blank', 'noopener');
              toast('Opened live draft preview (expires in 2h)', 'ok');
            }).catch(function (e) { toast(e.message, 'crimson'); });
          }
        }));
        acts.appendChild(btn('Broadcast', 'sph-btn sph-btn--xs', function () {
          copyToClipboard(buildBroadcastText(a), 'Copied bilingual Scheme broadcast!');
        }));
        acts.appendChild(btn('Delete', 'sph-btn sph-btn--xs sph-btn--danger', function () {
          if (!window.confirm('Delete "' + a.title_en + '" permanently?')) return;
          api('/api/admin/schemes/articles/' + encodeURIComponent(a.id), 'DELETE').then(function () {
            clearSchemesFlyoutCache();
            toast('Scheme deleted & caches purged', 'ok');
            loadArticles().then(function () { clearSchemesFlyoutCache(); renderCurrentView(); });
          }).catch(function (e) { toast(e.message, 'crimson'); });
        }));
        td5.appendChild(acts); tr.appendChild(td5);
        tbody.appendChild(tr);
      });
    }
    table.appendChild(tbody); tw.appendChild(table); card.appendChild(tw);
    container.appendChild(card);
  }

  // ======================================================================
  // TAB 1B: FULL SCHEME EDITORIAL COMPOSER (All 10 Capabilities)
  // ======================================================================
  function openComposer(article) {
    state.mode = 'composer';
    state.extractedDraft = null;
    state.activePreviewUrl = '';
    state.activePreviewExp = '';
    if (article) {
      var cloneArr = function (arr) { return Array.isArray(arr) ? arr.map(function (x) { return typeof x === 'object' && x ? Object.assign({}, x) : x; }) : []; };
      state.draft = Object.assign(emptyDraft(), article, {
        allowed_categories: Array.isArray(article.allowed_categories) ? article.allowed_categories.slice() : [],
        benefits_breakdown: cloneArr(article.benefits_breakdown),
        eligibility_rules: cloneArr(article.eligibility_rules),
        required_documents: cloneArr(article.required_documents),
        application_steps: cloneArr(article.application_steps),
        important_dates: cloneArr(article.important_dates),
        faq_items: cloneArr(article.faq_items),
        pdf_index_bookmarks: cloneArr(article.pdf_index_bookmarks),
        extra_attachments: cloneArr(article.extra_attachments),
        change_summary: ''
      });
    } else {
      state.draft = emptyDraft();
      state.revisions = [];
    }
    loadSnippets().then(renderCurrentView);
  }

  function saveDraft(publishFlag, openPreview) {
    var d = state.draft;
    if (!d.title_en || !d.title_en.trim()) { toast('English Scheme Title is required.', 'crimson'); return; }
    if (!d.slug) d.slug = slugify(d.title_en);
    var payload = Object.assign({}, d, { is_published: publishFlag ? 1 : 0 });
    var req = d.id
      ? api('/api/admin/schemes/articles/' + encodeURIComponent(d.id), 'PUT', payload)
      : api('/api/admin/schemes/articles', 'POST', payload);
    req.then(function (res) {
      if (res && res.item) state.draft = Object.assign(emptyDraft(), res.item, { change_summary: '' });
      clearSchemesFlyoutCache();
      toast(publishFlag ? 'Scheme published live & Edge Cache purged!' : 'Scheme draft saved to D1!', 'ok');
      if (openPreview && state.draft.id) {
        return api('/api/admin/schemes/' + encodeURIComponent(state.draft.id) + '/preview-token', 'POST', {}).then(function (p) {
          state.activePreviewUrl = p.preview_url;
          state.activePreviewExp = p.preview_expires_at;
          window.open(p.preview_url, '_blank', 'noopener');
          toast('Opened Real Public Page Preview (valid 2h)', 'ok');
          renderCurrentView();
        });
      }
      return api('/api/admin/schemes/' + encodeURIComponent(state.draft.id) + '/revisions').then(function (rv) {
        state.revisions = rv.revisions || [];
        renderCurrentView();
      }).catch(function () { renderCurrentView(); });
    }).catch(function (err) { toast('Save failed: ' + err.message, 'crimson'); });
  }

  function renderComposer(container) {
    var d = state.draft || emptyDraft();

    var bar = el('div', 'sph-composer-bar');
    var bL = el('div', 'sph-actions-row');
    bL.appendChild(btn('← Back to Schemes List', 'sph-btn', function () { state.mode = 'list'; loadArticles().then(renderCurrentView); }));
    bL.appendChild(el('strong', '', d.id ? ('Editing: ' + d.title_en) : 'New Welfare Scheme Composer'));
    bar.appendChild(bL);
    var bR = el('div', 'sph-actions-row');
    bR.appendChild(btn('📋 Copy Broadcast (EN+ଓଡ଼ିଆ)', 'sph-btn', function () { copyToClipboard(buildBroadcastText(d), 'Bilingual Scheme broadcast copied!'); }));
    bR.appendChild(btn('Save Draft & Open Public Preview ↗', 'sph-btn sph-btn--preview', function () { saveDraft(false, true); }));
    bR.appendChild(btn('Save Draft', 'sph-btn', function () { saveDraft(false, false); }));
    bR.appendChild(btn('Publish Live →', 'sph-btn sph-btn--primary', function () { saveDraft(true, false); }));
    bar.appendChild(bR);
    container.appendChild(bar);

    if (state.activePreviewUrl) {
      var pv = el('div', 'sph-preview-box');
      pv.appendChild(el('span', '', 'Live Draft Preview Active (Expires: ' + state.activePreviewExp.slice(0, 19).replace('T', ' ') + ' UTC)'));
      var pActs = el('div', 'sph-actions-row');
      var pA = el('a', 'sph-btn sph-btn--xs sph-btn--preview', 'Open Real Public Page Preview ↗');
      pA.href = state.activePreviewUrl; pA.target = '_blank'; pA.rel = 'noopener noreferrer';
      pActs.appendChild(pA);
      pActs.appendChild(btn('Copy Preview Link', 'sph-btn sph-btn--xs', function () { copyToClipboard(window.location.origin + state.activePreviewUrl, 'Preview URL copied!'); }));
      pv.appendChild(pActs);
      container.appendChild(pv);
    }

    // 1. Cascading 3-Layer Taxonomy Selector with Inline "+ Add Option"
    var taxCard = el('section', 'sph-card');
    taxCard.appendChild(el('h3', 'sph-card-title', '1. Cascading 3-Layer Scheme Taxonomy (Gov Level → Domain → Benefit Type)'));
    var tg = el('div', 'sph-form-grid');

    function taxSelect(level, label, addLabel, list, val, parentId, onChange) {
      var w = el('div', 'sph-field');
      var top = el('div', 'sph-label-row');
      top.appendChild(el('label', 'sph-label', label));
      top.appendChild(btn(addLabel, 'sph-btn sph-btn--xs', function () {
        if (level > 1 && !parentId) { toast('Select Level ' + (level - 1) + ' first', 'crimson'); return; }
        openTaxonomyModal({
          level: level, parentId: parentId,
          onSaved: function (node) { onChange(node.id, node); }
        });
      }));
      var s = el('select', 'sph-select');
      s.appendChild(el('option', '', '-- Select --'));
      list.forEach(function (n) {
        var o = el('option', '', (n.icon ? n.icon + ' ' : '') + n.title_en + (n.title_or ? ' · ' + n.title_or : ''));
        o.value = n.id; if (val === n.id) o.selected = true;
        s.appendChild(o);
      });
      s.addEventListener('change', function () { onChange(s.value, findNode(s.value)); });
      w.appendChild(top); w.appendChild(s); return w;
    }

    tg.appendChild(taxSelect(1, 'Government Level (L1)', '+ Add Main Category', nodesByLevel(1), d.category_l1_id, null, function (id, node) {
      d.category_l1_id = id; d.category_l2_id = ''; d.category_l3_id = '';
      if (node) d.gov_badge = node.title_en;
      renderCurrentView();
    }));
    tg.appendChild(taxSelect(2, 'Welfare Domain / Dept (L2)', '+ Add Subcategory', d.category_l1_id ? nodesByLevel(2, d.category_l1_id) : [], d.category_l2_id, d.category_l1_id, function (id) {
      d.category_l2_id = id; d.category_l3_id = '';
      renderCurrentView();
    }));
    tg.appendChild(taxSelect(3, 'Beneficiary / Benefit Type (L3)', '+ Add Further Subcategory', d.category_l2_id ? nodesByLevel(3, d.category_l2_id) : [], d.category_l3_id, d.category_l2_id, function (id) {
      d.category_l3_id = id;
    }));
    taxCard.appendChild(tg);
    container.appendChild(taxCard);

    // 2. PDF-to-Scheme Auto-Draft Helper & Official PDFs / Links
    var pdfCard = el('section', 'sph-card');
    pdfCard.appendChild(el('h3', 'sph-card-title', '2. Official Guidelines PDF (Auto-Draft Extractor), Offline Form PDF & .gov.in Links'));
    var pg2 = el('div', 'sph-form-grid sph-form-grid--2');

    var guideW = el('div', 'sph-field');
    guideW.appendChild(el('label', 'sph-label', 'Official Scheme Guidelines PDF (Drag & Drop to R2 + Auto-Draft)'));
    var gUrl = el('input', 'sph-input'); gUrl.placeholder = '/api/media/schemes-publishing/...'; gUrl.value = d.guidelines_pdf_url || '';
    gUrl.addEventListener('input', function () { d.guidelines_pdf_url = gUrl.value.trim(); });
    guideW.appendChild(buildDropzone({
      accept: 'application/pdf', purpose: 'guidelines-pdf', buttonLabel: 'Upload Guidelines PDF to R2',
      hint: 'Auto-extracts Department, Benefit Amount, Income Limit, Marks %, Age, Dates, Helpline & .gov.in URL',
      onUploaded: function (res) {
        d.guidelines_pdf_url = res.url; gUrl.value = res.url;
        if (res.extracted_draft) { state.extractedDraft = res.extracted_draft; renderCurrentView(); }
      }
    }));
    guideW.appendChild(gUrl); pg2.appendChild(guideW);

    var formW = el('div', 'sph-field');
    formW.appendChild(el('label', 'sph-label', 'Offline Application Form PDF (Direct R2 Upload)'));
    var fUrl = el('input', 'sph-input'); fUrl.placeholder = '/api/media/schemes-publishing/...'; fUrl.value = d.application_form_pdf_url || '';
    fUrl.addEventListener('input', function () { d.application_form_pdf_url = fUrl.value.trim(); });
    formW.appendChild(buildDropzone({
      accept: 'application/pdf', purpose: 'application-form-pdf', buttonLabel: 'Upload Application Form PDF',
      hint: 'Downloadable printable form for Block Office / Mo Seba Kendra applicants',
      onUploaded: function (res) { d.application_form_pdf_url = res.url; fUrl.value = res.url; }
    }));
    formW.appendChild(fUrl); pg2.appendChild(formW);
    pdfCard.appendChild(pg2);

    if (state.extractedDraft) {
      var ex = state.extractedDraft;
      var hits = [];
      if (ex.department_en) hits.push('Dept: ' + ex.department_en);
      if (ex.benefit_amount_summary) hits.push('Benefit: ' + ex.benefit_amount_summary);
      if (ex.max_annual_income) hits.push('Income <= ₹' + num(ex.max_annual_income));
      if (ex.min_qualifying_marks) hits.push('Marks >= ' + ex.min_qualifying_marks + '%');
      if (ex.min_age || ex.max_age) hits.push('Age: ' + (ex.min_age || 0) + '-' + (ex.max_age || 60));
      if (ex.helpline_number) hits.push('Helpline: ' + ex.helpline_number);
      if (ex.official_apply_url) hits.push('URL: ' + ex.official_apply_url);
      var ab = el('div', 'sph-autodraft-banner');
      ab.appendChild(el('div', '', hits.length ? ('PDF Auto-Draft Detected: ' + hits.join(' · ')) : 'Guidelines PDF uploaded to R2!'));
      if (hits.length) {
        ab.appendChild(btn('Apply Extracted Scheme Fields', 'sph-btn sph-btn--xs sph-btn--primary', function () {
          ['department_en', 'benefit_amount_summary', 'application_start_date', 'last_date', 'helpline_number', 'official_apply_url', 'official_portal_url'].forEach(function (k) {
            if (ex[k] && !d[k]) d[k] = ex[k];
          });
          if (ex.max_annual_income && !d.max_annual_income) d.max_annual_income = ex.max_annual_income;
          if (ex.min_qualifying_marks && !d.min_qualifying_marks) d.min_qualifying_marks = ex.min_qualifying_marks;
          if (ex.min_age !== null && d.min_age === '') d.min_age = ex.min_age;
          if (ex.max_age !== null && d.max_age === '') d.max_age = ex.max_age;
          if (ex.npci_seeding_required) d.npci_seeding_required = 1;
          state.extractedDraft = null;
          toast('Applied extracted scheme metadata!', 'ok');
          renderCurrentView();
        }));
      }
      pdfCard.appendChild(ab);
    }

    var urlGrid = el('div', 'sph-form-grid');
    function makeUrlField(label, key, placeholder) {
      var w = el('div', 'sph-field');
      var top = el('div', 'sph-label-row');
      top.appendChild(el('label', 'sph-label', label));
      var badge = el('span', 'sph-pill', '');
      function sync() {
        var v = String(d[key] || '').trim();
        if (!v) { badge.textContent = 'Optional'; badge.className = 'sph-pill'; }
        else if (isGovUrl(v)) { badge.textContent = '✓ Verified .gov.in'; badge.className = 'sph-pill sph-pill--gov'; }
        else if (/^https:\/\//i.test(v)) { badge.textContent = 'HTTPS'; badge.className = 'sph-pill sph-pill--scheduled'; }
        else { badge.textContent = 'Use HTTPS'; badge.className = 'sph-pill sph-pill--closed'; }
      }
      top.appendChild(badge);
      var inp = el('input', 'sph-input'); inp.type = 'url'; inp.placeholder = placeholder; inp.value = d[key] || '';
      inp.addEventListener('input', function () { d[key] = inp.value.trim(); sync(); });
      sync(); w.appendChild(top); w.appendChild(inp); return w;
    }
    urlGrid.appendChild(makeUrlField('Official Apply Portal URL', 'official_apply_url', 'https://scholarship.odisha.gov.in/'));
    urlGrid.appendChild(makeUrlField('Official Department Portal URL', 'official_portal_url', 'https://odisha.gov.in/'));
    var helpW = el('div', 'sph-field');
    helpW.appendChild(el('label', 'sph-label', 'Toll-Free Helpline Number'));
    var helpInp = el('input', 'sph-input'); helpInp.placeholder = 'e.g., 14678 / 155335 / 1800-345-6770'; helpInp.value = d.helpline_number || '';
    helpInp.addEventListener('input', function () { d.helpline_number = helpInp.value.trim(); });
    helpW.appendChild(helpInp); urlGrid.appendChild(helpW);
    urlGrid.appendChild(makeUrlField('Track Payment / Application Status URL', 'track_status_url', 'https://...gov.in/track'));
    urlGrid.appendChild(makeUrlField('Official Grievance Redressal URL', 'grievance_url', 'https://janasunani.odisha.gov.in/'));
    urlGrid.appendChild(makeUrlField('Prerequisite OTR Portal URL (Optional)', 'prerequisite_otr_url', 'https://scholarship.odisha.gov.in/'));
    pdfCard.appendChild(urlGrid);
    container.appendChild(pdfCard);

    // 3. Core Details, Citizen Eligibility & DBT Readiness Parameters + Cover Banner
    var coreCard = el('section', 'sph-card');
    coreCard.appendChild(el('h3', 'sph-card-title', '3. Core Bilingual Details, Citizen Eligibility & DBT Readiness Parameters'));
    var cg = el('div', 'sph-form-grid');

    function addInp(label, key, opts) {
      opts = opts || {};
      var w = el('div', 'sph-field' + (opts.span ? ' sph-span-' + opts.span : ''));
      w.appendChild(el('label', 'sph-label', label));
      var inp = opts.textarea ? el('textarea', 'sph-textarea') : el('input', 'sph-input');
      if (!opts.textarea) inp.type = opts.type || 'text';
      if (opts.placeholder) inp.placeholder = opts.placeholder;
      inp.value = d[key] == null ? '' : String(d[key]);
      inp.addEventListener('input', function () {
        d[key] = opts.type === 'number' ? (inp.value === '' ? '' : Number(inp.value)) : inp.value;
        if (key === 'title_en' && !d.id && !d._slugTouched) {
          d.slug = slugify(inp.value);
          var sn = document.getElementById('sphSlugInput'); if (sn) sn.value = d.slug;
        }
        if (key === 'slug') d._slugTouched = true;
      });
      if (opts.id) inp.id = opts.id;
      w.appendChild(inp); cg.appendChild(w);
    }

    function addSel(label, key, options, span) {
      var w = el('div', 'sph-field' + (span ? ' sph-span-' + span : ''));
      w.appendChild(el('label', 'sph-label', label));
      var s = el('select', 'sph-select');
      options.forEach(function (o) {
        var val = Array.isArray(o) ? o[0] : o;
        var txt = Array.isArray(o) ? o[1] : (o || '-- Any --');
        var op = el('option', '', txt); op.value = val;
        if (String(d[key] || '') === String(val)) op.selected = true;
        s.appendChild(op);
      });
      s.addEventListener('change', function () { d[key] = s.value; });
      w.appendChild(s); cg.appendChild(w);
    }

    addInp('Scheme Title (EN) *', 'title_en', { span: 2, placeholder: 'e.g., Subhadra Yojana Odisha 2026' });
    addInp('URL Slug', 'slug', { id: 'sphSlugInput', placeholder: 'subhadra-yojana-odisha-2026' });
    addInp('Scheme Title (ଓଡ଼ିଆ)', 'title_or', { span: 2, placeholder: 'ସୁଭଦ୍ରା ଯୋଜନା ଓଡ଼ିଶା ୨୦୨୬' });
    addSel('Application Status', 'scheme_status', SCHEME_STATUS_OPTS);
    addSel('Government Scope', 'gov_badge', [['', '-- Select Government Scope --']].concat(GOV_SCOPE_OPTS.map(function (g) { return [g, g]; })));
    addInp('Implementing Department / Ministry (EN)', 'department_en', { placeholder: 'Women & Child Development Dept, Odisha' });
    addInp('Implementing Department / Ministry (ଓଡ଼ିଆ)', 'department_or', { placeholder: 'ମହିଳା ଓ ଶିଶୁ ବିକାଶ ବିଭାଗ' });
    addInp('Scheme Code / ID', 'scheme_code', { placeholder: 'e.g., ODISHA-WCD-SUBHADRA' });
    addInp('Benefit Amount / Type', 'benefit_amount_summary', { placeholder: 'e.g., ₹10,000 / Year (₹50,000 over 5 yrs)' });
    addInp('Benefit Frequency', 'benefit_frequency', { placeholder: 'Bi-Annual / Annual / Monthly / One-Time' });
    addInp('DBT Mode', 'dbt_mode', { placeholder: 'NPCI Aadhaar-Seeded Direct Bank Transfer' });
    addSel('Beneficiary Group', 'occupation_tag', [['', '-- Select Beneficiary Group --']].concat(BENEFICIARY_GROUPS.map(function (bg) { return [bg, bg]; })));
    addInp('Target Beneficiaries Summary', 'target_beneficiaries', { placeholder: 'Women aged 21–60 (NFSA/SFSS / Income <= ₹2.5L)' });
    addSel('Application Mode / Channel', 'application_mode', APP_MODES);
    addSel('Renewal Type', 'renewal_type', RENEWAL_OPTS);
    addInp('Min Age (Years)', 'min_age', { type: 'number', placeholder: '21' });
    addInp('Max Age (Years)', 'max_age', { type: 'number', placeholder: '60' });
    addSel('Gender Eligibility', 'gender_eligibility', GENDER_OPTS);
    addInp('Max Annual Family Income (₹)', 'max_annual_income', { type: 'number', placeholder: '250000' });
    addInp('Min Qualifying Marks (%)', 'min_qualifying_marks', { type: 'number', placeholder: '60' });
    addInp('Prerequisite OTR / Registration Label', 'prerequisite_otr_label', { placeholder: 'e.g., Odisha State Scholarship OTR Mandatory' });
    addInp('Stackable / Dual-Benefit Policy', 'stackable_policy', { span: 2, placeholder: 'e.g., Cannot be combined with another state pension >= ₹1,500/month' });
    addInp('Application Start Date', 'application_start_date', { type: 'date' });
    addInp('Student / Citizen Last Date', 'last_date', { type: 'date' });
    addInp('Institute Verification Date', 'institute_verification_date', { type: 'date' });
    addInp('DWO / Dept Sanction Date', 'dwo_sanction_date', { type: 'date' });
    addInp('Short Summary (EN)', 'summary_en', { span: 3, textarea: true, placeholder: 'Concise 2-sentence English summary for portal cards & SEO…' });
    addInp('Short Summary (ଓଡ଼ିଆ)', 'summary_or', { span: 3, textarea: true, placeholder: 'ଓଡ଼ିଆରେ ସଂକ୍ଷିପ୍ତ ବିବରଣୀ…' });

    // Allowed Social Categories Multi-Select Chips
    var catWrap = el('div', 'sph-field sph-span-3');
    catWrap.appendChild(el('label', 'sph-label', 'Allowed Social / Beneficiary Categories'));
    var catRow = el('div', 'sph-cat-chips');
    SOCIAL_CATEGORIES.forEach(function (cat) {
      var sel = d.allowed_categories.indexOf(cat) !== -1;
      catRow.appendChild(btn((sel ? '✓ ' : '+ ') + cat, 'sph-cat-chip' + (sel ? ' is-selected' : ''), function () {
        var idx = d.allowed_categories.indexOf(cat);
        if (idx === -1) d.allowed_categories.push(cat);
        else d.allowed_categories.splice(idx, 1);
        renderCurrentView();
      }));
    });
    catWrap.appendChild(catRow); cg.appendChild(catWrap);

    function addToggle(label, key) {
      var l = el('label', 'sph-check-label');
      var cb = el('input'); cb.type = 'checkbox'; cb.checked = Boolean(d[key]);
      cb.addEventListener('change', function () { d[key] = cb.checked ? 1 : 0; });
      l.appendChild(cb); l.appendChild(el('span', '', label)); cg.appendChild(l);
    }
    addToggle('NPCI Aadhaar-Bank Seeding Required', 'npci_seeding_required');
    addToggle('Odisha Domicile / Resident Required', 'odisha_domicile_required');
    addToggle('Ongoing Year-Round (No Fixed Closing Date)', 'is_ongoing');
    addToggle('Featured Scheme (Pin to Top)', 'is_featured');
    coreCard.appendChild(cg);

    // Cover Banner Upload + R2 Picker + Preview
    var covGrid = el('div', 'sph-form-grid sph-form-grid--2');
    var covL = el('div', 'sph-field');
    covL.appendChild(el('label', 'sph-label', 'Cover Banner Photo (Direct R2 Upload or R2 Media Library)'));
    var r2Box = el('div', 'sph-r2-list'); r2Box.hidden = true;
    var r2Pick = btn('Pick from R2 Media Library', 'sph-btn sph-btn--xs', function () {
      r2Box.hidden = !r2Box.hidden;
      if (!r2Box.hidden) {
        clear(r2Box).appendChild(el('span', 'sph-muted', 'Loading R2 images…'));
        api('/api/admin/media-library?kind=image').then(function (m) {
          clear(r2Box);
          var list = m.items || [];
          if (!list.length) { r2Box.appendChild(el('span', 'sph-muted', 'No images in R2 library yet.')); return; }
          list.slice(0, 20).forEach(function (f) {
            var r = el('div', 'sph-r2-row');
            r.appendChild(el('span', '', f.name));
            r.appendChild(btn('Select', 'sph-btn sph-btn--xs sph-btn--primary', function () { d.cover_image_url = f.url; r2Box.hidden = true; renderCurrentView(); }));
            r2Box.appendChild(r);
          });
        }).catch(function (e) { clear(r2Box).appendChild(el('span', 'sph-muted', e.message)); });
      }
    });
    covL.appendChild(buildDropzone({
      accept: 'image/jpeg,image/png,image/webp', purpose: 'scheme-cover', buttonLabel: 'Upload Scheme Banner Photo',
      hint: 'JPEG, PNG or WebP (1200×630 recommended)', extraButton: r2Pick,
      onUploaded: function (res) { d.cover_image_url = res.url; renderCurrentView(); }
    }));
    covL.appendChild(r2Box);
    var cUrl = el('input', 'sph-input'); cUrl.placeholder = 'Cover Image URL'; cUrl.value = d.cover_image_url || '';
    cUrl.addEventListener('input', function () { d.cover_image_url = cUrl.value.trim(); }); covL.appendChild(cUrl);
    var cCap = el('input', 'sph-input'); cCap.placeholder = 'Cover Photo Caption (Optional)'; cCap.value = d.cover_image_caption || '';
    cCap.addEventListener('input', function () { d.cover_image_caption = cCap.value; }); covL.appendChild(cCap);
    covGrid.appendChild(covL);

    var covR = el('div', 'sph-field');
    covR.appendChild(el('label', 'sph-label', 'Live Cover Preview'));
    if (d.cover_image_url) {
      var im = el('img', 'sph-cover-preview'); im.src = d.cover_image_url; im.alt = d.cover_image_caption || d.title_en || 'Scheme Banner';
      covR.appendChild(im);
    } else covR.appendChild(el('div', 'sph-dropzone', 'No cover photo selected yet.'));
    covGrid.appendChild(covR);
    coreCard.appendChild(covGrid);
    container.appendChild(coreCard);

    // 4. Rich Bilingual Scheme Article Editor + Reusable Snippets Picker
    var edCard = el('section', 'sph-card');
    var edHead = el('div', 'sph-card-head');
    edHead.appendChild(el('h3', 'sph-card-title', '4. Rich Bilingual Scheme Article Editor (EN & ଓଡ଼ିଆ) + Reusable Snippets'));

    var bodyEn = el('textarea', 'sph-textarea sph-textarea--body'); bodyEn.value = d.article_body_en || '';
    bodyEn.placeholder = 'Write detailed bilingual scheme guide (## Heading, **bold**, - list, > callout box, ![caption](/api/media/...), [Link](https://...))';
    bodyEn.addEventListener('input', function () { d.article_body_en = bodyEn.value; });

    var bodyOr = el('textarea', 'sph-textarea sph-textarea--body'); bodyOr.value = d.article_body_or || '';
    bodyOr.placeholder = 'ଓଡ଼ିଆରେ ସମ୍ପୂର୍ଣ୍ଣ ଯୋଜନା ବିବରଣୀ ଲେଖନ୍ତୁ…';
    bodyOr.addEventListener('input', function () { d.article_body_or = bodyOr.value; });

    var activeTa = bodyEn;
    bodyEn.addEventListener('focus', function () { activeTa = bodyEn; });
    bodyOr.addEventListener('focus', function () { activeTa = bodyOr; });

    function insertText(ta, txt) {
      var s = ta.selectionStart || ta.value.length; var e = ta.selectionEnd || s;
      ta.value = ta.value.slice(0, s) + txt + ta.value.slice(e);
      ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus();
    }

    var snRow = el('div', 'sph-actions-row');
    var snSel = el('select', 'sph-select');
    snSel.appendChild(el('option', '', '-- Insert Reusable Bilingual Snippet --'));
    (state.snippets || []).forEach(function (sn) {
      var o = el('option', '', sn.title_en + (sn.category ? ' [' + sn.category + ']' : '')); o.value = sn.id; snSel.appendChild(o);
    });
    snRow.appendChild(snSel);
    snRow.appendChild(btn('Insert Snippet', 'sph-btn sph-btn--xs sph-btn--primary', function () {
      var sn = (state.snippets || []).find(function (x) { return x.id === snSel.value; });
      if (!sn) { toast('Select a snippet first', 'crimson'); return; }
      if (sn.body_en) insertText(bodyEn, (bodyEn.value ? '\n\n' : '') + sn.body_en);
      if (sn.body_or) insertText(bodyOr, (bodyOr.value ? '\n\n' : '') + sn.body_or);
      toast('Inserted bilingual snippet: ' + sn.title_en, 'ok');
    }));
    edHead.appendChild(snRow); edCard.appendChild(edHead);

    var tb = el('div', 'sph-toolbar');
    [['H2', '\n## Section Heading\n'], ['H3', '\n### Sub Heading\n'], ['Bold', '**important**'], ['Bullet List', '\n- Point 1\n- Point 2\n'], ['Callout Box', '\n> Important DBT / Eligibility Note\n'], ['Inline Photo', '\n![Caption](/api/media/image.webp)\n'], ['Hyperlink', '[Official Portal](https://odisha.gov.in/)']].forEach(function (x) {
      tb.appendChild(btn(x[0], 'sph-btn sph-btn--xs', function () { insertText(activeTa, x[1]); }));
    });
    edCard.appendChild(tb);

    var eCols = el('div', 'sph-editor-cols');
    var c1 = el('div', 'sph-field'); c1.appendChild(el('label', 'sph-label', 'Scheme Article Body (EN)')); c1.appendChild(bodyEn);
    var c2 = el('div', 'sph-field'); c2.appendChild(el('label', 'sph-label', 'Scheme Article Body (ଓଡ଼ିଆ)')); c2.appendChild(bodyOr);
    eCols.appendChild(c1); eCols.appendChild(c2); edCard.appendChild(eCols);
    container.appendChild(edCard);

    // 5. No-Code Visual Tables & FAQ Builder
    container.appendChild(buildDynamicTableCard('5A. Benefit & Financial Assistance Breakdown Table', 'Category/tier-wise scholarship, DBT installment, or subsidy breakup.', d.benefits_breakdown, [
      { key: 'tier_group', label: 'Beneficiary / Course Tier', placeholder: 'e.g., Hosteller / Day Scholar / Installment 1' },
      { key: 'amount', label: 'Benefit Amount', placeholder: '₹5,000 / ₹10,000' },
      { key: 'frequency', label: 'Disbursement', placeholder: 'Rakhi Purnima & Intl Women Day' },
      { key: 'remarks', label: 'Remarks', placeholder: 'Direct to NPCI bank account' }
    ]));

    container.appendChild(buildDynamicTableCard('5B. Detailed Eligibility Rules Table', 'Clear inclusion & exclusion rules for citizens.', d.eligibility_rules, [
      { key: 'criterion', label: 'Criterion', placeholder: 'e.g., Family Income / Landholding / Residency' },
      { key: 'requirement', label: 'Requirement', placeholder: 'Annual income <= ₹2,50,000' },
      { key: 'verification_note', label: 'Verification Proof', placeholder: 'e-District Income Certificate (1-yr valid)' }
    ]));

    container.appendChild(buildDynamicTableCard('5C. Required Documents Checklist (with Format/KB Spec & Candidate Vault Sync)', 'Allows citizens to sync missing docs directly to their Candidate Hub Document Vault.', d.required_documents, [
      { key: 'doc_key', label: 'Doc Key', placeholder: 'income_cert / aadhaar / bank_passbook' },
      { key: 'document_name', label: 'Document Name', placeholder: 'Valid Odisha Income Certificate' },
      { key: 'format_spec', label: 'Format / KB Spec', placeholder: 'PDF/JPG < 500KB (Issued within 1 yr)' },
      { key: 'vault_sync', label: 'Vault Sync', type: 'checkbox', defaultValue: true }
    ]));

    container.appendChild(buildDynamicTableCard('5D. Step-by-Step Application Process (Online Portal / Mo Seba Kendra / Block Office)', 'Guided walkthrough for citizens.', d.application_steps, [
      { key: 'step', label: 'Step #', placeholder: 'Step 1' },
      { key: 'channel', label: 'Channel', type: 'select', options: APP_MODES, defaultValue: 'Online Portal' },
      { key: 'instruction', label: 'Instruction', placeholder: 'Complete Aadhaar e-KYC and upload signed certificates…' }
    ]));

    container.appendChild(buildDynamicTableCard('5E. Multi-Stage Important Dates Timeline', 'Student Closing Date, Institute Verification Date, DWO Sanction Date & Installment Releases.', d.important_dates, [
      { key: 'stage', label: 'Milestone', placeholder: 'Student Closing Date / Institute Verification / DWO Sanction' },
      { key: 'date', label: 'Date', placeholder: '2026-12-31' },
      { key: 'note', label: 'Remarks', placeholder: 'Submit hardcopy to College Nodal Officer' }
    ]));

    container.appendChild(buildDynamicTableCard('5F. Citizen FAQs (EN & ଓଡ଼ିଆ)', 'Bilingual frequently asked questions rendered on the scheme page.', d.faq_items, [
      { key: 'question_en', label: 'Question (EN)', placeholder: 'Is NPCI seeding mandatory?' },
      { key: 'answer_en', label: 'Answer (EN)', placeholder: 'Yes, DBT fails without NPCI mapper seeding.' },
      { key: 'question_or', label: 'Question (ଓଡ଼ିଆ)', placeholder: 'NPCI ସିଡିଂ ବାଧ୍ୟତାମୂଳକ କି?' },
      { key: 'answer_or', label: 'Answer (ଓଡ଼ିଆ)', placeholder: 'ହଁ, NPCI ବିନା ଟଙ୍କା ଖାତାକୁ ଆସିବ ନାହିଁ।' }
    ]));

    container.appendChild(buildDynamicTableCard('6A. PDF Quick-Jump Page Bookmarks', 'Jump straight to Eligibility, Exclusions, or Application Form pages in the inline PDF viewer.', d.pdf_index_bookmarks, [
      { key: 'page', label: 'Page #', type: 'number', placeholder: '4' },
      { key: 'label', label: 'Bookmark Label', placeholder: 'Page 4: Exclusion Criteria' }
    ]));

    container.appendChild(buildDynamicTableCard('6B. Extra Annexures & Government Resolutions (GRs)', 'Additional official PDFs or circulars.', d.extra_attachments, [
      { key: 'title', label: 'Document Name', placeholder: 'SOP / Revised GR PDF' },
      { key: 'url', label: 'PDF URL', placeholder: '/api/media/...' }
    ]));

    // 7. Scheduled Publish, Amendment Banner & Revision History
    var pubCard = el('section', 'sph-card');
    pubCard.appendChild(el('h3', 'sph-card-title', '7. Government Amendment Banner, Scheduled Publish & Revision History'));
    var pubG = el('div', 'sph-form-grid sph-form-grid--2');

    var amEn = el('textarea', 'sph-textarea'); amEn.placeholder = 'Optional Govt Amendment / Deadline Extension banner (EN)…'; amEn.value = d.amendment_note_en || '';
    amEn.addEventListener('input', function () { d.amendment_note_en = amEn.value; });
    var wAmEn = el('div', 'sph-field'); wAmEn.appendChild(el('label', 'sph-label', 'Government Amendment Note (EN)')); wAmEn.appendChild(amEn); pubG.appendChild(wAmEn);

    var amOr = el('textarea', 'sph-textarea'); amOr.placeholder = 'ସରକାରୀ ସଂଶୋଧନ / ତାରିଖ ବୃଦ୍ଧି ସୂଚନା (ଓଡ଼ିଆ)…'; amOr.value = d.amendment_note_or || '';
    amOr.addEventListener('input', function () { d.amendment_note_or = amOr.value; });
    var wAmOr = el('div', 'sph-field'); wAmOr.appendChild(el('label', 'sph-label', 'Government Amendment Note (ଓଡ଼ିଆ)')); wAmOr.appendChild(amOr); pubG.appendChild(wAmOr);

    var schI = el('input', 'sph-input'); schI.type = 'datetime-local';
    schI.value = d.scheduled_publish_at ? String(d.scheduled_publish_at).replace(' ', 'T').slice(0, 16) : '';
    schI.addEventListener('input', function () { d.scheduled_publish_at = schI.value ? schI.value.replace('T', ' ') + ':00' : ''; });
    var wSch = el('div', 'sph-field'); wSch.appendChild(el('label', 'sph-label', 'Scheduled Auto-Publish Time (UTC, Optional)')); wSch.appendChild(schI); pubG.appendChild(wSch);

    var chgI = el('input', 'sph-input'); chgI.placeholder = 'e.g., Updated income ceiling & Institute Verification date'; chgI.value = d.change_summary || '';
    chgI.addEventListener('input', function () { d.change_summary = chgI.value; });
    var wChg = el('div', 'sph-field'); wChg.appendChild(el('label', 'sph-label', 'Revision Change Summary')); wChg.appendChild(chgI); pubG.appendChild(wChg);
    pubCard.appendChild(pubG);

    if (d.id && state.revisions && state.revisions.length) {
      pubCard.appendChild(el('div', 'sph-label', 'Saved Revision History (' + state.revisions.length + ')'));
      var rl = el('div', 'sph-rev-list');
      state.revisions.forEach(function (rv) {
        var row = el('div', 'sph-rev-item');
        row.appendChild(el('span', '', 'Rev #' + rv.revision_number + ' · ' + (rv.change_summary || 'Update') + ' · ' + (rv.created_by || 'staff') + ' (' + String(rv.created_at || '').slice(0, 16) + ')'));
        row.appendChild(btn('Restore Revision', 'sph-btn sph-btn--xs', function () {
          if (!window.confirm('Restore Revision #' + rv.revision_number + '?')) return;
          api('/api/admin/schemes/' + encodeURIComponent(d.id) + '/rollback', 'POST', { revision_id: rv.id }).then(function (r) {
            if (r && r.item) state.draft = Object.assign(emptyDraft(), r.item, { change_summary: '' });
            toast('Restored Revision #' + rv.revision_number, 'ok');
            api('/api/admin/schemes/' + encodeURIComponent(d.id) + '/revisions').then(function (rr) { state.revisions = rr.revisions || []; renderCurrentView(); });
          }).catch(function (e) { toast(e.message, 'crimson'); });
        }));
        rl.appendChild(row);
      });
      pubCard.appendChild(rl);
    }
    container.appendChild(pubCard);
  }

  // ======================================================================
  // TAB 2: 3-LAYER SCHEME TAXONOMY STUDIO
  // ======================================================================
  function renderTaxonomyStudio(container) {
    var l1List = nodesByLevel(1);
    if (!state.taxSel.l1 && l1List.length) state.taxSel.l1 = l1List[0].id;
    var l2List = state.taxSel.l1 ? nodesByLevel(2, state.taxSel.l1) : [];
    if (state.taxSel.l2 && !l2List.some(function (x) { return x.id === state.taxSel.l2; })) state.taxSel.l2 = l2List.length ? l2List[0].id : '';
    else if (!state.taxSel.l2 && l2List.length) state.taxSel.l2 = l2List[0].id;
    var l3List = state.taxSel.l2 ? nodesByLevel(3, state.taxSel.l2) : [];

    var intro = el('div', 'sph-card');
    var ih = el('div', 'sph-card-head');
    var iL = el('div');
    iL.appendChild(el('h2', 'sph-card-title', '3-Layer Scheme Hierarchy Studio (Gov Level → Welfare Domain → Benefit Type)'));
    iL.appendChild(el('div', 'sph-muted', 'All edits sync immediately to Cloudflare D1 and update /schemes/ cascading filters.'));
    ih.appendChild(iL);
    ih.appendChild(btn('↻ Refresh Tree', 'sph-btn', function () { loadTaxonomy().then(renderCurrentView); }));
    intro.appendChild(ih);
    container.appendChild(intro);

    var grid = el('div', 'sph-tax-grid');
    function col(level, title, items, selId, parentId, onSel) {
      var c = el('div', 'sph-tax-col');
      var h = el('div', 'sph-tax-col-head');
      h.appendChild(el('strong', '', title + ' (' + items.length + ')'));
      h.appendChild(btn('+ Add', 'sph-btn sph-btn--xs sph-btn--primary', function () {
        if (level > 1 && !parentId) { toast('Select a Level ' + (level - 1) + ' node first', 'crimson'); return; }
        openTaxonomyModal({ level: level, parentId: parentId });
      }));
      c.appendChild(h);
      var list = el('div', 'sph-tax-list');
      if (!items.length) {
        list.appendChild(el('div', 'sph-muted', 'No nodes at this level yet. Click "+ Add" to create one.'));
      } else {
        items.forEach(function (node) {
          var card = el('div', 'sph-tax-node' + (selId === node.id ? ' is-selected' : ''));
          card.addEventListener('click', function () { if (onSel) onSel(node.id); });
          var top = el('div', 'sph-tax-node-top');
          top.appendChild(el('span', 'sph-tax-node-title', (node.icon ? node.icon + ' ' : '') + node.title_en));
          top.appendChild(el('span', 'sph-pill ' + (node.is_published ? 'sph-pill--published' : 'sph-pill--draft'), node.is_published ? 'Live' : 'Hidden'));
          card.appendChild(top);
          if (node.title_or) card.appendChild(el('div', 'sph-title-or', node.title_or));
          card.appendChild(el('div', 'sph-muted', (node.published_schemes || 0) + ' live schemes · /' + node.slug));
          var acts = el('div', 'sph-actions-row');
          acts.addEventListener('click', function (e) { e.stopPropagation(); });
          acts.appendChild(btn('↑', 'sph-btn sph-btn--xs', function () { api('/api/admin/schemes/taxonomy/' + encodeURIComponent(node.id) + '/move', 'POST', { direction: 'up' }).then(function () { loadTaxonomy().then(renderCurrentView); }); }));
          acts.appendChild(btn('↓', 'sph-btn sph-btn--xs', function () { api('/api/admin/schemes/taxonomy/' + encodeURIComponent(node.id) + '/move', 'POST', { direction: 'down' }).then(function () { loadTaxonomy().then(renderCurrentView); }); }));
          acts.appendChild(btn('Edit', 'sph-btn sph-btn--xs', function () { openTaxonomyModal({ level: level, parentId: node.parent_id, node: node }); }));
          acts.appendChild(btn(node.is_published ? 'Hide' : 'Publish', 'sph-btn sph-btn--xs', function () {
            api('/api/admin/schemes/taxonomy/' + encodeURIComponent(node.id), 'PATCH', { is_published: node.is_published ? 0 : 1 }).then(function () { loadTaxonomy().then(renderCurrentView); });
          }));
          acts.appendChild(btn('Del', 'sph-btn sph-btn--xs sph-btn--danger', function () {
            if (!window.confirm('Delete "' + node.title_en + '" and child categories?')) return;
            api('/api/admin/schemes/taxonomy/' + encodeURIComponent(node.id), 'DELETE').then(function () { toast('Deleted', 'ok'); loadTaxonomy().then(renderCurrentView); });
          }));
          card.appendChild(acts);
          list.appendChild(card);
        });
      }
      c.appendChild(list);
      return c;
    }

    grid.appendChild(col(1, 'Level 1 · Government Level', l1List, state.taxSel.l1, null, function (id) { state.taxSel.l1 = id; state.taxSel.l2 = ''; renderCurrentView(); }));
    grid.appendChild(col(2, 'Level 2 · Welfare Domain', l2List, state.taxSel.l2, state.taxSel.l1, function (id) { state.taxSel.l2 = id; renderCurrentView(); }));
    grid.appendChild(col(3, 'Level 3 · Benefit Type', l3List, '', state.taxSel.l2, null));
    container.appendChild(grid);
  }

  // ======================================================================
  // TAB 3: REUSABLE BILINGUAL SNIPPETS LIBRARY (shared /api/admin/jobs/snippets)
  // ======================================================================
  function openSnippetModal(editing) {
    var fTitleEn = el('input', 'sph-input'); fTitleEn.value = editing ? editing.title_en : ''; fTitleEn.placeholder = 'e.g., NPCI Aadhaar-Bank Seeding Guide';
    var fTitleOr = el('input', 'sph-input'); fTitleOr.value = editing ? editing.title_or : ''; fTitleOr.placeholder = 'ଓଡ଼ିଆ ଶୀର୍ଷକ';
    var fCat = el('input', 'sph-input'); fCat.value = editing ? editing.category : 'schemes'; fCat.placeholder = 'schemes / eligibility / dbt';
    var fBodyEn = el('textarea', 'sph-textarea'); fBodyEn.value = editing ? editing.body_en : '';
    var fBodyOr = el('textarea', 'sph-textarea'); fBodyOr.value = editing ? editing.body_or : '';
    var fPub = el('input'); fPub.type = 'checkbox'; fPub.checked = editing ? Boolean(editing.is_published) : true;

    openStudioModal(editing ? 'Edit Bilingual Snippet' : '+ Add Scheme / Welfare Snippet', function (body) {
      var g = el('div', 'sph-form-grid sph-form-grid--2');
      function add(lbl, ctrl, full) { var w = el('div', 'sph-field' + (full ? ' sph-span-2' : '')); w.appendChild(el('label', 'sph-label', lbl)); w.appendChild(ctrl); g.appendChild(w); }
      add('Snippet Title (EN) *', fTitleEn); add('Snippet Title (ଓଡ଼ିଆ)', fTitleOr);
      add('Category', fCat, true); add('Body (EN)', fBodyEn, true); add('Body (ଓଡ଼ିଆ)', fBodyOr, true);
      var pl = el('label', 'sph-check-label sph-span-2'); pl.appendChild(fPub); pl.appendChild(el('span', '', 'Active in Composer')); g.appendChild(pl);
      body.appendChild(g);
    }, [
      btn('Cancel', 'sph-btn', closeStudioModal),
      btn(editing ? 'Update Snippet' : 'Save Snippet', 'sph-btn sph-btn--primary', function () {
        if (!fTitleEn.value.trim()) { toast('Title (EN) required', 'crimson'); return; }
        var payload = { title_en: fTitleEn.value.trim(), title_or: fTitleOr.value.trim(), category: fCat.value.trim() || 'schemes', body_en: fBodyEn.value, body_or: fBodyOr.value, is_published: fPub.checked ? 1 : 0 };
        var req = editing ? api('/api/admin/jobs/snippets/' + encodeURIComponent(editing.id), 'PUT', payload) : api('/api/admin/jobs/snippets', 'POST', payload);
        req.then(function () { closeStudioModal(); toast('Snippet saved to D1!', 'ok'); loadSnippets().then(renderCurrentView); }).catch(function (e) { toast(e.message, 'crimson'); });
      })
    ]);
  }

  function renderSnippetsTab(container) {
    var card = el('section', 'sph-card');
    var head = el('div', 'sph-card-head');
    var hl = el('div');
    hl.appendChild(el('h2', 'sph-card-title', 'Reusable Bilingual Welfare & DBT Snippets Library'));
    hl.appendChild(el('div', 'sph-muted', 'Insert standardized Odisha e-District, NPCI DBT, OTR Scholarship & Mo Seba Kendra guides in 1 click.'));
    head.appendChild(hl);
    head.appendChild(btn('+ Add New Snippet', 'sph-btn sph-btn--primary', function () { openSnippetModal(null); }));
    card.appendChild(head);

    var grid = el('div', 'sph-snippets-grid');
    if (!state.snippets.length) grid.appendChild(el('div', 'sph-muted', 'No snippets found yet.'));
    else {
      state.snippets.forEach(function (sn) {
        var sc = el('div', 'sph-snippet-card');
        var top = el('div', 'sph-card-head');
        top.appendChild(el('strong', '', sn.title_en));
        top.appendChild(el('span', 'sph-pill', sn.category || 'schemes'));
        sc.appendChild(top);
        if (sn.title_or) sc.appendChild(el('div', 'sph-title-or', sn.title_or));
        sc.appendChild(el('div', 'sph-muted', String(sn.body_en || '').slice(0, 190) + (String(sn.body_en || '').length > 190 ? '…' : '')));
        var acts = el('div', 'sph-actions-row');
        acts.appendChild(btn('Edit', 'sph-btn sph-btn--xs', function () { openSnippetModal(sn); }));
        acts.appendChild(btn('Delete', 'sph-btn sph-btn--xs sph-btn--danger', function () {
          if (!window.confirm('Delete snippet "' + sn.title_en + '"?')) return;
          api('/api/admin/jobs/snippets/' + encodeURIComponent(sn.id), 'DELETE').then(function () { toast('Snippet deleted', 'ok'); loadSnippets().then(renderCurrentView); });
        }));
        sc.appendChild(acts); grid.appendChild(sc);
      });
    }
    card.appendChild(grid); container.appendChild(card);
  }

  function renderCurrentView() {
    if (!state.root) return;
    clear(state.root);
    var wrap = el('div', 'sph-wrap');

    var syncBanner = el('div', 'sph-live-sync-banner');
    var syncBadge = el('span', 'sph-live-sync-badge', '● Live Synced to Public Schemes ▾ Menu');
    var syncNote = el('span', 'sph-live-sync-note', 'Every L1 category, L2 sub-category & published scheme immediately purges Cloudflare Edge Cache and updates the public Schemes & Benefits ▾ cascading menu.');
    syncBanner.appendChild(syncBadge);
    syncBanner.appendChild(syncNote);
    wrap.appendChild(syncBanner);

    var tabs = el('div', 'sph-tabs'); tabs.setAttribute('role', 'tablist');
    [
      ['articles', '🏛️ Published & Draft Schemes', state.kpis ? state.kpis.total_schemes : state.articles.length],
      ['taxonomy', '🗂️ 3-Layer Scheme Hierarchy', state.taxonomyNodes.length],
      ['snippets', '🧩 Reusable Bilingual Snippets', state.snippets.length]
    ].forEach(function (t) {
      var b = el('button', 'sph-tab' + (state.tab === t[0] ? ' is-active' : ''));
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(state.tab === t[0]));
      b.appendChild(el('span', '', t[1])); b.appendChild(el('span', 'sph-tab-badge', String(t[2] || 0)));
      b.addEventListener('click', function () {
        state.tab = t[0]; if (t[0] !== 'articles') state.mode = 'list';
        renderCurrentView();
        if (t[0] === 'taxonomy') loadTaxonomy().then(renderCurrentView);
        if (t[0] === 'snippets') loadSnippets().then(renderCurrentView);
        if (t[0] === 'articles') loadArticles().then(renderCurrentView);
      });
      tabs.appendChild(b);
    });
    wrap.appendChild(tabs);

    if (state.tab === 'articles') {
      if (state.mode === 'composer') renderComposer(wrap);
      else renderArticlesList(wrap);
    } else if (state.tab === 'taxonomy') renderTaxonomyStudio(wrap);
    else if (state.tab === 'snippets') renderSnippetsTab(wrap);

    state.root.appendChild(wrap);
  }

  function render(root, headerActions, initialOpt, initialCategoryId) {
    state.root = root; state.headerActions = headerActions;
    if (initialCategoryId !== undefined) {
      state.filters.l1 = initialCategoryId || '';
      state.filters.l2 = '';
      state.filters.l3 = '';
    }
    if (initialOpt === 'new') { state.tab = 'articles'; state.mode = 'composer'; state.draft = emptyDraft(); }
    else if (initialOpt === 'taxonomy' || initialOpt === 'snippets' || initialOpt === 'articles') { state.tab = initialOpt; state.mode = 'list'; }
    else { state.tab = 'articles'; state.mode = 'list'; }

    if (headerActions) {
      clear(headerActions);
      var liveA = el('a', 'sph-btn', 'Open Live Schemes Portal ↗');
      liveA.href = '/schemes/?refresh=1'; liveA.target = '_blank'; liveA.rel = 'noopener noreferrer';
      headerActions.appendChild(liveA);
      headerActions.appendChild(btn('+ Publish New Scheme Article', 'sph-btn sph-btn--primary', function () { state.tab = 'articles'; openComposer(null); }));
    }

    clear(root);
    root.appendChild(el('div', 'sph-card', 'Loading Schemes & Welfare Publishing House from D1…'));
    Promise.all([loadArticles(), loadSnippets()]).then(function () {
      clearSchemesFlyoutCache();
      renderCurrentView();
    }).catch(function (err) {
      clear(root); root.appendChild(el('div', 'sph-card', 'Failed to load Schemes Publishing House: ' + err.message));
    });
  }

  window.CSOSchemesPublishingStudio = {
    render: render,
    openComposer: function (art) { state.tab = 'articles'; openComposer(art || null); },
    openTab: function (tab) { state.tab = tab; state.mode = 'list'; renderCurrentView(); },
    buildBroadcastText: buildBroadcastText
  };
})(window, document);
