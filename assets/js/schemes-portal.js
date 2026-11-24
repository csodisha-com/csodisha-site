/**
 * Common Sense Odisha — Public Schemes & Benefits Portal, Editorial Hero, Guided "Self or Family"
 * Eligibility Wizard, Side-by-Side 3-Scheme Comparison Tray & Visual Scheme Article Engine (v256)
 * Endpoints:
 *   GET  /api/public/schemes/tree
 *   GET  /api/public/schemes
 *   GET  /api/public/schemes/article?slug=...&preview_token=...
 *   POST /api/public/schemes/telemetry
 * Strict CSP-compliant: DOM APIs only — zero unsafe HTML string sinks, inline styles, or inline handlers.
 */
(function (window, document) {
  'use strict';

  var MOUNT_ID = 'cso-schemes-portal-root';
  var BENEFIT_PRESETS = [
    'Direct Cash Transfer (DBT)',
    'Scholarship / Stipend',
    'Subsidy / Loan',
    'Health Insurance',
    'Monthly Pension'
  ];
  var MODE_PRESETS = [
    'Online Portal',
    'Mo Seba Kendra / CSC',
    'Block / District Office'
  ];
  var STATUS_PRESETS = [
    ['active', 'Open / Active'],
    ['ongoing', 'Ongoing Year-Round'],
    ['renewal', 'Fresh & Renewal']
  ];

  var state = {
    lang: 'en',
    tree: [],
    nodes: [],
    allItems: [],
    items: [],
    facets: { modes: [], occupations: [] },
    filters: { l1: '', l2: '', l3: '', benefit: '', mode: '', renewal: '', status: '', search: '' },
    elig: {
      who: 'Self',
      age: '',
      gender: '',
      category: '',
      income: '',
      marks: '',
      occupation: ''
    },
    compareIds: [],
    showCompareTable: false,
    candidate: null,
    isAdmin: false,
    activePdfUrl: '',
    activePdfPage: 1
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; }
  function num(v) { try { return Number(v || 0).toLocaleString('en-IN'); } catch (_) { return String(v || 0); } }
  function safeHref(raw) {
    var s = String(raw || '').trim();
    if (!s) return '';
    if (s.startsWith('/') && !s.startsWith('//')) return s;
    if (/^https?:\/\//i.test(s)) return s;
    return '';
  }
  function pick(obj, field) {
    if (!obj) return '';
    if (state.lang === 'or' && obj[field + '_or']) return String(obj[field + '_or']);
    return String(obj[field + '_en'] || '');
  }
  function getLangPref() { try { return localStorage.getItem('cso_lang_pref') === 'or' ? 'or' : 'en'; } catch (_) { return 'en'; } }
  function setLangPref(l) { state.lang = l === 'or' ? 'or' : 'en'; try { localStorage.setItem('cso_lang_pref', state.lang); } catch (_) {} }

  function sendTelemetry(eventName, article) {
    if (!article || (!article.id && !article.slug)) return;
    try {
      fetch('/api/public/schemes/telemetry', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin', keepalive: true,
        body: JSON.stringify({ id: article.id, slug: article.slug, event: eventName })
      }).catch(function () {});
    } catch (_) {}
  }

  // ---------- Explainable Citizen Eligibility Engine ----------
  function evaluateSchemeEligibility(scheme, profile) {
    var badges = [];
    var hasInput = Boolean(profile.age || profile.gender || profile.category || profile.income || profile.marks || profile.occupation);
    if (scheme.odisha_domicile_required) {
      badges.push({ ok: true, text: '✓ Odisha Resident' });
    }
    if (!hasInput) return { checked: false, eligible: true, badges: badges };

    var eligible = true;
    var age = Number(profile.age || 0);
    if (age > 0 && (scheme.min_age !== null || scheme.max_age !== null)) {
      var minA = scheme.min_age !== null ? Number(scheme.min_age) : 0;
      var maxA = scheme.max_age !== null ? Number(scheme.max_age) : 120;
      if (age >= minA && age <= maxA) badges.push({ ok: true, text: '✓ Age ' + minA + '–' + maxA });
      else { eligible = false; badges.push({ ok: false, text: '⚠ Age outside ' + minA + '–' + maxA }); }
    }

    if (profile.gender && scheme.gender_eligibility && scheme.gender_eligibility !== 'All') {
      var gReq = scheme.gender_eligibility.toLowerCase();
      var gUser = profile.gender.toLowerCase();
      if (gReq.includes(gUser)) badges.push({ ok: true, text: '✓ ' + scheme.gender_eligibility });
      else { eligible = false; badges.push({ ok: false, text: '⚠ For ' + scheme.gender_eligibility }); }
    }

    if (profile.category && Array.isArray(scheme.allowed_categories) && scheme.allowed_categories.length) {
      var allowed = scheme.allowed_categories.map(function (c) { return String(c).toUpperCase(); });
      if (allowed.indexOf(profile.category.toUpperCase()) !== -1) {
        badges.push({ ok: true, text: '✓ ' + profile.category + ' Eligible' });
      } else {
        eligible = false;
        badges.push({ ok: false, text: '⚠ Only ' + allowed.slice(0, 3).join('/') });
      }
    }

    var inc = Number(profile.income || 0);
    if (inc > 0 && scheme.max_annual_income) {
      var limit = Number(scheme.max_annual_income);
      var lakhStr = limit >= 100000 ? ('₹' + (limit / 100000).toFixed(limit % 100000 === 0 ? 0 : 1) + 'L') : ('₹' + num(limit));
      if (inc <= limit) badges.push({ ok: true, text: '✓ Income ≤ ' + lakhStr });
      else { eligible = false; badges.push({ ok: false, text: '⚠ Income > ' + lakhStr }); }
    }

    var marks = Number(profile.marks || 0);
    if (marks > 0 && scheme.min_qualifying_marks) {
      if (marks >= Number(scheme.min_qualifying_marks)) badges.push({ ok: true, text: '✓ Marks ≥ ' + scheme.min_qualifying_marks + '%' });
      else { eligible = false; badges.push({ ok: false, text: '⚠ Min ' + scheme.min_qualifying_marks + '% Marks' }); }
    }

    if (profile.occupation && scheme.occupation_tag) {
      if (scheme.occupation_tag.toLowerCase().includes(profile.occupation.toLowerCase()) || scheme.occupation_tag.toLowerCase().includes('general')) {
        badges.push({ ok: true, text: '✓ ' + scheme.occupation_tag });
      }
    }

    return { checked: true, eligible: eligible, badges: badges };
  }

  // ---------- CSP-Safe Prose Renderer ----------
  function appendInlineFormatted(parent, text) {
    var str = String(text || '');
    var tokenRe = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g;
    var last = 0; var m;
    while ((m = tokenRe.exec(str)) !== null) {
      if (m.index > last) parent.appendChild(document.createTextNode(str.slice(last, m.index)));
      var tok = m[0];
      if (tok.startsWith('**') && tok.endsWith('**')) parent.appendChild(el('strong', '', tok.slice(2, -2)));
      else if (tok.startsWith('`') && tok.endsWith('`')) parent.appendChild(el('code', '', tok.slice(1, -1)));
      else if (tok.startsWith('[')) {
        var lm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (lm) {
          var href = safeHref(lm[2]);
          if (href) {
            var a = el('a', '', lm[1]); a.href = href;
            if (/^https?:\/\//i.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
            parent.appendChild(a);
          } else parent.appendChild(document.createTextNode(lm[1]));
        }
      }
      last = tokenRe.lastIndex;
    }
    if (last < str.length) parent.appendChild(document.createTextNode(str.slice(last)));
  }

  function renderProse(container, markdownText) {
    clear(container);
    var lines = String(markdownText || '').split(/\r?\n/);
    var ul = null;
    lines.forEach(function (raw) {
      var line = raw.trim();
      if (!line) { ul = null; return; }
      var im = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (im) {
        ul = null;
        var src = safeHref(im[2]);
        if (src) { var img = el('img', 'sp-inline-img'); img.src = src; img.alt = im[1] || ''; img.loading = 'lazy'; container.appendChild(img); }
        return;
      }
      if (line.startsWith('### ')) { ul = null; container.appendChild(el('h3', '', line.slice(4))); return; }
      if (line.startsWith('## ')) { ul = null; container.appendChild(el('h2', '', line.slice(3))); return; }
      if (line.startsWith('> ')) { ul = null; var c = el('div', 'sp-callout'); appendInlineFormatted(c, line.slice(2)); container.appendChild(c); return; }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        if (!ul) { ul = el('ul'); container.appendChild(ul); }
        var li = el('li'); appendInlineFormatted(li, line.slice(2)); ul.appendChild(li); return;
      }
      ul = null;
      var p = el('p'); appendInlineFormatted(p, line); container.appendChild(p);
    });
  }

  function buildStructuredTable(title, rows, cols) {
    if (!Array.isArray(rows) || !rows.length) return null;
    var sec = el('section', 'sp-card');
    sec.appendChild(el('h2', 'sp-h2', title));
    var wrap = el('div', 'sp-table-wrap');
    var table = el('table', 'sp-table');
    var thead = el('thead'); var trH = el('tr');
    cols.forEach(function (c) { trH.appendChild(el('th', '', c[1])); });
    thead.appendChild(trH); table.appendChild(thead);
    var tbody = el('tbody');
    rows.forEach(function (r) {
      var tr = el('tr');
      cols.forEach(function (c) {
        var v = r && r[c[0]] !== undefined && r[c[0]] !== null ? String(r[c[0]]) : '—';
        tr.appendChild(el('td', '', v || '—'));
      });
      tbody.appendChild(tr);
    });
    table.appendChild(tbody); wrap.appendChild(table); sec.appendChild(wrap);
    return sec;
  }

  function buildLangToggle(onSwitch) {
    var w = el('div', 'sp-lang-toggle');
    [['en', 'English'], ['or', 'ଓଡ଼ିଆ']].forEach(function (p) {
      var b = el('button', 'sp-lang-btn' + (state.lang === p[0] ? ' is-active' : ''), p[1]);
      b.type = 'button';
      b.addEventListener('click', function () { setLangPref(p[0]); onSwitch(); });
      w.appendChild(b);
    });
    return w;
  }

  // ---------- Save Scheme & Sync Missing Docs to Candidate Vault ----------
  function syncSchemeToCandidateVault(scheme, btnNode) {
    sendTelemetry('bookmark', scheme);
    var bmReq = fetch('/api/candidate/bookmarks', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'add', postId: scheme.slug || scheme.id, category: 'scheme',
        postTitle: scheme.title_en, postUrl: '/schemes/?slug=' + encodeURIComponent(scheme.slug),
        deadlineDate: scheme.is_ongoing ? null : (scheme.last_date || null)
      })
    }).catch(function () { return null; });

    var vaultDocs = (scheme.required_documents || []).filter(function (d) { return d && d.document_name; });
    try {
      var saved = JSON.parse(localStorage.getItem('cso_scheme_vault_sync') || '[]');
      if (!Array.isArray(saved)) saved = [];
      vaultDocs.forEach(function (d) {
        var key = d.doc_key || d.document_name;
        if (!saved.some(function (x) { return x.doc_key === key; })) {
          saved.push({ doc_key: key, name: d.document_name, spec: d.format_spec || '', scheme: scheme.title_en, addedAt: new Date().toISOString() });
        }
      });
      localStorage.setItem('cso_scheme_vault_sync', JSON.stringify(saved));
    } catch (_) {}

    bmReq.then(function (r) {
      btnNode.textContent = r && r.ok
        ? ('✓ Saved & ' + vaultDocs.length + ' Doc(s) Synced to Vault')
        : ('✓ Saved Locally (' + vaultDocs.length + ' Docs Ready)');
    });
  }

  // ---------- Inject GovernmentService JSON-LD ----------
  function injectGovernmentServiceJsonLd(scheme) {
    var prev = document.getElementById('cso-scheme-service-jsonld');
    if (prev) prev.remove();
    var ld = {
      '@context': 'https://schema.org',
      '@type': 'GovernmentService',
      name: scheme.title_en,
      alternateName: scheme.title_or || undefined,
      description: scheme.summary_en || scheme.title_en,
      serviceType: (scheme.taxonomy && scheme.taxonomy.l2 && scheme.taxonomy.l2.title_en) || 'Welfare Scheme',
      provider: {
        '@type': 'GovernmentOrganization',
        name: scheme.department_en || 'Government of Odisha',
        url: scheme.official_portal_url || 'https://odisha.gov.in/'
      },
      areaServed: { '@type': 'AdministrativeArea', name: scheme.odisha_domicile_required ? 'Odisha, India' : 'India' },
      audience: { '@type': 'Audience', audienceType: scheme.target_beneficiaries || 'Eligible Citizens' },
      url: 'https://csodisha.com/schemes/?slug=' + encodeURIComponent(scheme.slug || '')
    };
    var sc = document.createElement('script');
    sc.id = 'cso-scheme-service-jsonld';
    sc.type = 'application/ld+json';
    sc.textContent = JSON.stringify(ld);
    document.head.appendChild(sc);
  }

  // ======================================================================
  // FULL VISUAL SCHEME ARTICLE VIEW + DRAFT PREVIEW
  // ======================================================================
  function renderArticleView(mount, payload) {
    clear(mount);
    var a = payload.article;
    var wrap = el('div', 'sp-article');
    document.title = (pick(a, 'title') || a.title_en) + ' | CS Odisha Schemes';

    ['schemes-categories-panel', 'schemes-directory-panel', 'live-schemes-section'].forEach(function (id) {
      var n = document.getElementById(id);
      if (n) n.hidden = true;
    });

    // 1. Floating Draft Preview Banner
    if (payload.is_preview) {
      var pv = el('div', 'sp-preview-banner'); pv.setAttribute('role', 'status');
      var left = el('div', 'sp-pills-row');
      left.appendChild(el('span', 'sp-preview-badge', 'DRAFT PREVIEW'));
      var expText = '';
      if (payload.preview_expires_at) {
        var mins = Math.max(1, Math.round((Date.parse(payload.preview_expires_at) - Date.now()) / 60000));
        expText = mins > 60 ? ('Expires in ~' + Math.ceil(mins / 60) + 'h') : ('Expires in ' + mins + 'm');
      }
      left.appendChild(el('span', '', 'ADMIN DRAFT PREVIEW — Not Yet Public' + (expText ? ' (' + expText + ')' : '')));
      pv.appendChild(left);
      var backAdm = el('a', 'sp-btn sp-btn--xs', 'Back to Admin Studio');
      backAdm.href = '/admin/#folder-schemes-benefits';
      pv.appendChild(backAdm);
      wrap.appendChild(pv);
    }

    // 2. Breadcrumb + Lang Switch
    var topBar = el('div', 'sp-article-top');
    var crumbs = el('nav', 'sp-breadcrumbs'); crumbs.setAttribute('aria-label', 'Scheme Taxonomy Breadcrumb');
    var backA = el('a', '', '← All Schemes & Benefits'); backA.href = '/schemes/';
    crumbs.appendChild(backA);
    if (a.taxonomy && a.taxonomy.l1) { crumbs.appendChild(el('span', '', '›')); crumbs.appendChild(el('span', '', pick(a.taxonomy.l1, 'title'))); }
    if (a.taxonomy && a.taxonomy.l2) { crumbs.appendChild(el('span', '', '›')); crumbs.appendChild(el('span', '', pick(a.taxonomy.l2, 'title'))); }
    if (a.taxonomy && a.taxonomy.l3) { crumbs.appendChild(el('span', '', '›')); crumbs.appendChild(el('span', '', pick(a.taxonomy.l3, 'title'))); }
    topBar.appendChild(crumbs);
    topBar.appendChild(buildLangToggle(function () { renderArticleView(mount, payload); }));
    wrap.appendChild(topBar);

    // 3. Government Amendment Banner
    var amend = pick(a, 'amendment_note');
    if (amend) {
      var am = el('section', 'sp-amendment'); am.setAttribute('role', 'alert');
      am.appendChild(el('strong', '', '⚠️ Government Amendment / Deadline Update'));
      am.appendChild(el('div', '', amend));
      wrap.appendChild(am);
    }

    // 4. Hero Card with Cover Banner, Official Trust & Anti-Fraud Badges, Title & CTAs
    var hero = el('article', 'sp-card');
    if (a.cover_image_url && safeHref(a.cover_image_url)) {
      var fig = el('figure', 'sp-cover-fig');
      var img = el('img', 'sp-cover-img'); img.src = safeHref(a.cover_image_url); img.alt = a.cover_image_caption || a.title_en;
      fig.appendChild(img);
      if (a.cover_image_caption) fig.appendChild(el('figcaption', 'sp-cover-cap', a.cover_image_caption));
      hero.appendChild(fig);
    }

    var trustRow = el('div', 'sp-pills-row');
    trustRow.appendChild(el('span', 'sp-badge ' + (a.is_expired ? 'sp-badge--closed' : 'sp-badge--ok'), a.status_badge || 'Active / Open'));
    if (a.is_official_gov_url) trustRow.appendChild(el('span', 'sp-badge sp-badge--gov', '✓ Verified .gov.in Portal'));
    trustRow.appendChild(el('span', 'sp-badge sp-badge--ok', '🛡️ Zero Application Fee (Anti-Fraud)'));
    if (a.npci_seeding_required) {
      var npciA = el('a', 'sp-badge sp-badge--dbt', '🏦 NPCI Aadhaar-Bank Seeding Required (Check Status ↗)');
      npciA.href = 'https://myaadhaar.uidai.gov.in/'; npciA.target = '_blank'; npciA.rel = 'noopener noreferrer';
      trustRow.appendChild(npciA);
    }
    hero.appendChild(trustRow);

    hero.appendChild(el('h1', 'sp-article-h1', pick(a, 'title') || a.title_en));
    if (pick(a, 'department')) hero.appendChild(el('div', 'sp-muted', 'Nodal Department: ' + pick(a, 'department') + (a.scheme_code ? ' · Code: ' + a.scheme_code : '')));
    if (pick(a, 'summary')) hero.appendChild(el('p', '', pick(a, 'summary')));

    var actRow = el('div', 'sp-pills-row');
    if (a.official_apply_url && safeHref(a.official_apply_url)) {
      var appA = el('a', 'sp-btn sp-btn--apply', 'Apply on Official Portal ↗');
      appA.href = safeHref(a.official_apply_url); appA.target = '_blank'; appA.rel = 'noopener noreferrer';
      appA.addEventListener('click', function () { sendTelemetry('apply_click', a); });
      actRow.appendChild(appA);
    }
    var vaultBtn = el('button', 'sp-btn sp-btn--cobalt', '🔖 Save Scheme & Sync Missing Docs to My Candidate Vault');
    vaultBtn.type = 'button';
    vaultBtn.addEventListener('click', function () { syncSchemeToCandidateVault(a, vaultBtn); });
    actRow.appendChild(vaultBtn);
    hero.appendChild(actRow);
    wrap.appendChild(hero);

    // 5. Prerequisite OTR Banner (if required)
    if (a.prerequisite_otr_label || a.prerequisite_otr_url) {
      var otr = el('section', 'sp-otr-banner');
      otr.appendChild(el('div', '', '🔑 Prerequisite Registration Required: ' + (a.prerequisite_otr_label || 'Complete One-Time Registration (OTR) before applying')));
      if (a.prerequisite_otr_url && safeHref(a.prerequisite_otr_url)) {
        var oa = el('a', 'sp-btn sp-btn--xs sp-btn--cobalt', 'Complete OTR First ↗');
        oa.href = safeHref(a.prerequisite_otr_url); oa.target = '_blank'; oa.rel = 'noopener noreferrer';
        otr.appendChild(oa);
      }
      wrap.appendChild(otr);
    }

    // 6. 6 Color-Coded At-a-Glance Benefit & Eligibility Tiles
    var tiles = el('section', 'sp-tiles-grid'); tiles.setAttribute('aria-label', 'At-a-Glance Scheme Highlights');
    var incText = a.max_annual_income ? ('Up to ₹' + num(a.max_annual_income) + ' / yr') : 'No Income Cap / See Rules';
    var ageText = (a.min_age !== null || a.max_age !== null) ? ((a.min_age || 0) + '–' + (a.max_age || 'No Max') + ' yrs · ' + (a.gender_eligibility || 'All')) : (a.gender_eligibility || 'All Citizens');
    [
      ['Financial Benefit', a.benefit_amount_summary || 'See Guidelines', 'emerald'],
      ['Frequency & DBT Mode', [a.benefit_frequency, a.dbt_mode].filter(Boolean).join(' · ') || 'Direct Benefit Transfer', 'cobalt'],
      ['Application Window', a.is_ongoing ? 'Open Year-Round' : (a.last_date ? (a.last_date + ' (' + a.status_badge + ')') : a.status_badge), 'rose'],
      ['Annual Income Limit', incText, 'violet'],
      ['Age & Gender Criteria', ageText, 'amber'],
      ['Renewal & Stackable Policy', a.renewal_type + (a.stackable_policy ? (' · ' + a.stackable_policy.slice(0, 48)) : ''), 'teal']
    ].forEach(function (t) {
      var tile = el('div', 'sp-tile sp-tile--' + t[2]);
      tile.appendChild(el('span', 'sp-tile-label', t[0]));
      tile.appendChild(el('strong', 'sp-tile-val', t[1]));
      tiles.appendChild(tile);
    });
    wrap.appendChild(tiles);

    // 7. Where & How to Apply Channel Strip (Online / MSK / Block Office + Helpline + Track + Grievance)
    var chCard = el('section', 'sp-card');
    chCard.appendChild(el('h2', 'sp-h2', 'Where & How to Apply — Official Citizen Channels'));
    var strip = el('div', 'sp-channel-strip');
    var c1 = el('div', 'sp-channel-item'); c1.appendChild(el('span', 'sp-label', 'Application Channel')); c1.appendChild(el('strong', '', a.application_mode || 'Online Portal / Mo Seba Kendra')); strip.appendChild(c1);
    var c2 = el('div', 'sp-channel-item'); c2.appendChild(el('span', 'sp-label', 'Toll-Free Helpline')); c2.appendChild(el('strong', '', a.helpline_number || 'State Citizen Helpline (155335)')); strip.appendChild(c2);
    if (a.track_status_url && safeHref(a.track_status_url)) {
      var c3 = el('div', 'sp-channel-item'); c3.appendChild(el('span', 'sp-label', 'Payment / Application Status'));
      var trA = el('a', 'sp-btn sp-btn--xs', 'Track Application Status ↗'); trA.href = safeHref(a.track_status_url); trA.target = '_blank'; trA.rel = 'noopener noreferrer';
      c3.appendChild(trA); strip.appendChild(c3);
    }
    if (a.grievance_url && safeHref(a.grievance_url)) {
      var c4 = el('div', 'sp-channel-item'); c4.appendChild(el('span', 'sp-label', 'Official Grievance Portal'));
      var grA = el('a', 'sp-btn sp-btn--xs', 'File Grievance ↗'); grA.href = safeHref(a.grievance_url); grA.target = '_blank'; grA.rel = 'noopener noreferrer';
      c4.appendChild(grA); strip.appendChild(c4);
    }
    chCard.appendChild(strip);
    wrap.appendChild(chCard);

    // 8. Explainable Citizen Eligibility Bar
    var evalRes = evaluateSchemeEligibility(a, state.elig);
    var vBar = el('section', 'sp-vault-bar');
    var vLeft = el('div', 'sp-pills-row');
    vLeft.appendChild(el('strong', '', state.candidate ? ('Eligibility Check (' + (state.candidate.fullName || 'Candidate') + '):') : 'Eligibility Highlights:'));
    evalRes.badges.forEach(function (b) {
      vLeft.appendChild(el('span', 'sp-badge ' + (b.ok ? 'sp-badge--ok' : 'sp-badge--warn'), b.text));
    });
    if (a.allowed_categories && a.allowed_categories.length) {
      vLeft.appendChild(el('span', 'sp-badge', 'Categories: ' + a.allowed_categories.join(', ')));
    }
    vBar.appendChild(vLeft);
    var hubLink = el('a', 'sp-btn sp-btn--xs', 'Open Candidate Vault →'); hubLink.href = '/student-dashboard/';
    vBar.appendChild(hubLink);
    wrap.appendChild(vBar);

    // 9. Rich Bilingual Article Prose
    var bodyMd = pick(a, 'article_body');
    if (bodyMd) {
      var prCard = el('section', 'sp-card');
      prCard.appendChild(el('h2', 'sp-h2', state.lang === 'or' ? 'ବିସ୍ତୃତ ଯୋଜନା ବିବରଣୀ' : 'Detailed Scheme Overview & Guidelines'));
      var prose = el('div', 'sp-prose'); renderProse(prose, bodyMd);
      prCard.appendChild(prose); wrap.appendChild(prCard);
    }

    // 10. Structured Tables (Benefits, Eligibility, Required Documents w/ KB spec, Application Steps, Multi-Stage Timeline)
    var multiDates = [];
    if (a.application_start_date) multiDates.push({ stage: 'Application Opens', date: a.application_start_date, note: 'Online / MSK Window' });
    if (a.last_date) multiDates.push({ stage: 'Student / Citizen Closing Date', date: a.last_date, note: a.status_badge });
    if (a.institute_verification_date) multiDates.push({ stage: 'Institute / College Verification Deadline', date: a.institute_verification_date, note: 'Submit signed copy to Nodal Officer' });
    if (a.dwo_sanction_date) multiDates.push({ stage: 'DWO / Department Sanction Date', date: a.dwo_sanction_date, note: 'DBT disbursement stage' });
    (a.important_dates || []).forEach(function (r) { if (r && (r.stage || r.date)) multiDates.push(r); });

    [
      buildStructuredTable('Benefit & Financial Assistance Breakdown', a.benefits_breakdown, [['tier_group', 'Category / Tier'], ['amount', 'Benefit Amount'], ['frequency', 'Disbursement'], ['remarks', 'Remarks']]),
      buildStructuredTable('Detailed Eligibility Rules', a.eligibility_rules, [['criterion', 'Criterion'], ['requirement', 'Requirement'], ['verification_note', 'Verification Proof']]),
      buildStructuredTable('Required Documents Checklist (with Format / KB Specs)', a.required_documents, [['document_name', 'Document Name'], ['format_spec', 'Format & Size Spec'], ['doc_key', 'Vault Key']]),
      buildStructuredTable('Step-by-Step Application Process', a.application_steps, [['step', 'Step'], ['channel', 'Channel'], ['instruction', 'Instruction']]),
      buildStructuredTable('Multi-Stage Application & Verification Timeline', multiDates, [['stage', 'Milestone'], ['date', 'Date'], ['note', 'Remarks']])
    ].forEach(function (t) { if (t) wrap.appendChild(t); });

    // 11. Citizen FAQs Accordion (Bilingual)
    if (Array.isArray(a.faq_items) && a.faq_items.length) {
      var fqCard = el('section', 'sp-card');
      fqCard.appendChild(el('h2', 'sp-h2', state.lang === 'or' ? 'ସାଧାରଣ ପ୍ରଶ୍ନୋତ୍ତର (FAQ)' : 'Frequently Asked Citizen Questions (FAQs)'));
      var fqList = el('div', 'sp-faq-list');
      a.faq_items.forEach(function (f) {
        var q = (state.lang === 'or' && f.question_or) ? f.question_or : f.question_en;
        var ans = (state.lang === 'or' && f.answer_or) ? f.answer_or : f.answer_en;
        if (!q) return;
        var det = el('details', 'sp-faq-item');
        det.appendChild(el('summary', '', q));
        det.appendChild(el('div', 'sp-faq-ans', ans || ''));
        fqList.appendChild(det);
      });
      fqCard.appendChild(fqList);
      wrap.appendChild(fqCard);
    }

    // 12. Inline PDF Viewer with Quick-Jump Page Bookmarks + Download Cards
    var pdfs = [];
    if (a.guidelines_pdf_url && safeHref(a.guidelines_pdf_url)) pdfs.push({ title: 'Official Scheme Guidelines PDF', url: safeHref(a.guidelines_pdf_url) });
    if (a.application_form_pdf_url && safeHref(a.application_form_pdf_url)) pdfs.push({ title: 'Offline Application Form PDF', url: safeHref(a.application_form_pdf_url) });
    (a.extra_attachments || []).forEach(function (att) {
      if (att && att.url && safeHref(att.url)) pdfs.push({ title: att.title || 'Official Annexure PDF', url: safeHref(att.url) });
    });

    if (pdfs.length) {
      var pdfSec = el('section', 'sp-card');
      pdfSec.appendChild(el('h2', 'sp-h2', 'Official Guidelines, Application Form & Inline PDF Viewer'));
      if (!state.activePdfUrl) state.activePdfUrl = pdfs[0].url;
      var cardsRow = el('div', 'sp-pdf-cards');
      var frameWrap = el('div');

      function mountFrame(url, pg) {
        clear(frameWrap);
        var sameOrig = url.startsWith('/api/media/') || url.indexOf(window.location.origin) === 0;
        if (sameOrig) {
          var ifr = el('iframe', 'sp-pdf-frame'); ifr.title = 'Scheme Guidelines PDF Viewer';
          ifr.src = url + (pg > 1 ? ('#page=' + pg) : '');
          frameWrap.appendChild(ifr);
        } else {
          var note = el('div', 'sp-callout');
          note.appendChild(el('span', '', 'External official PDF hosted on government portal. '));
          var ea = el('a', '', 'Open PDF in New Tab ↗'); ea.href = url + (pg > 1 ? ('#page=' + pg) : ''); ea.target = '_blank'; ea.rel = 'noopener noreferrer';
          note.appendChild(ea); frameWrap.appendChild(note);
        }
      }

      pdfs.forEach(function (p) {
        var c = el('div', 'sp-pdf-card');
        c.appendChild(el('strong', '', '📄 ' + p.title));
        var row = el('div', 'sp-pills-row');
        var vb = el('button', 'sp-btn sp-btn--xs sp-btn--primary', 'View Inline'); vb.type = 'button';
        vb.addEventListener('click', function () { state.activePdfUrl = p.url; state.activePdfPage = 1; mountFrame(p.url, 1); });
        row.appendChild(vb);
        var dl = el('a', 'sp-btn sp-btn--xs', '⬇ Download PDF'); dl.href = p.url; dl.target = '_blank'; dl.rel = 'noopener noreferrer';
        dl.addEventListener('click', function () { sendTelemetry('pdf_download', a); });
        row.appendChild(dl);
        c.appendChild(row); cardsRow.appendChild(c);
      });
      pdfSec.appendChild(cardsRow);

      if (Array.isArray(a.pdf_index_bookmarks) && a.pdf_index_bookmarks.length) {
        var bmRow = el('div', 'sp-pills-row');
        bmRow.appendChild(el('span', 'sp-label', 'Quick-Jump Bookmarks:'));
        a.pdf_index_bookmarks.forEach(function (bm) {
          var pg = Math.max(1, Number(bm.page || 1));
          var b = el('button', 'sp-filter-pill', bm.label || ('Page ' + pg)); b.type = 'button';
          b.addEventListener('click', function () { state.activePdfPage = pg; mountFrame(state.activePdfUrl, pg); });
          bmRow.appendChild(b);
        });
        pdfSec.appendChild(bmRow);
      }

      mountFrame(state.activePdfUrl, state.activePdfPage);
      pdfSec.appendChild(frameWrap);
      wrap.appendChild(pdfSec);
    }

    // 13. Related Schemes
    var rel = payload.related_schemes || [];
    if (rel.length) {
      var relSec = el('section', 'sp-card');
      relSec.appendChild(el('h2', 'sp-h2', 'Related Welfare Schemes & Scholarships'));
      var rGrid = el('div', 'sp-grid');
      rel.forEach(function (s) { rGrid.appendChild(buildSchemeCard(s, mount)); });
      relSec.appendChild(rGrid);
      wrap.appendChild(relSec);
    }

    mount.appendChild(wrap);
    injectGovernmentServiceJsonLd(a);
  }

  // ======================================================================
  // SCHEME CARD, COMPARISON TRAY & PORTAL LISTING MODE (v256)
  // ======================================================================
  function buildEmptySchemeSvg() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 48 48');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'sp-empty-svg');
    var specs = [
      ['path', { d: 'M24 6L8 12v11c0 10.2 6.8 18.8 16 21 9.2-2.2 16-10.8 16-21V12L24 6Z', stroke: 'currentColor', 'stroke-width': '2.4', 'stroke-linejoin': 'round' }],
      ['path', { d: 'M17 24l5 5 10-10', stroke: 'currentColor', 'stroke-width': '2.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }]
    ];
    specs.forEach(function (sp) {
      var node = document.createElementNS(ns, sp[0]);
      Object.keys(sp[1]).forEach(function (k) { node.setAttribute(k, sp[1][k]); });
      svg.appendChild(node);
    });
    return svg;
  }

  function computeSchemeHeroKpis() {
    var src = state.allItems.length ? state.allItems : state.items;
    var activeCount = 0;
    var dbtScholCount = 0;
    var ongoingCount = 0;
    src.forEach(function (s) {
      if (!s.is_expired) activeCount++;
      if (s.is_ongoing) ongoingCount++;
      var hay = ((s.title_en || '') + ' ' + (s.dbt_mode || '') + ' ' + (s.benefit_amount_summary || '') + ' ' + ((s.taxonomy && s.taxonomy.l3 && s.taxonomy.l3.title_en) || '')).toLowerCase();
      if (s.npci_seeding_required || hay.indexOf('dbt') !== -1 || hay.indexOf('scholarship') !== -1) dbtScholCount++;
    });
    var domainCount = state.nodes.filter(function (n) { return Number(n.level) === 2; }).length;
    return {
      activeCount: activeCount,
      dbtScholCount: dbtScholCount,
      ongoingCount: ongoingCount,
      domainCount: domainCount
    };
  }

  function matchesQuickBenefit(sc, benefitLabel) {
    if (!benefitLabel) return true;
    var q = benefitLabel.toLowerCase();
    var hay = [
      sc.title_en, sc.summary_en, sc.dbt_mode, sc.benefit_amount_summary, sc.benefit_frequency,
      sc.taxonomy && sc.taxonomy.l2 ? sc.taxonomy.l2.title_en : '',
      sc.taxonomy && sc.taxonomy.l3 ? sc.taxonomy.l3.title_en : ''
    ].filter(Boolean).join(' ').toLowerCase();
    if (q.indexOf('dbt') !== -1) return Boolean(sc.npci_seeding_required) || hay.indexOf('dbt') !== -1 || hay.indexOf('direct cash') !== -1;
    if (q.indexOf('scholarship') !== -1) return hay.indexOf('scholarship') !== -1 || hay.indexOf('stipend') !== -1;
    if (q.indexOf('subsidy') !== -1) return hay.indexOf('subsidy') !== -1 || hay.indexOf('loan') !== -1 || hay.indexOf('grant') !== -1;
    if (q.indexOf('health') !== -1) return hay.indexOf('health') !== -1 || hay.indexOf('insurance') !== -1;
    if (q.indexOf('pension') !== -1) return hay.indexOf('pension') !== -1 || hay.indexOf('monthly') !== -1;
    return hay.indexOf(q) !== -1;
  }

  function buildSchemeCard(sc, mount) {
    var card = el('article', 'sp-scheme-card');
    if (sc.cover_image_url && safeHref(sc.cover_image_url)) {
      var th = el('img', 'sp-thumb'); th.src = safeHref(sc.cover_image_url); th.alt = sc.title_en; th.loading = 'lazy'; th.decoding = 'async';
      card.appendChild(th);
    }
    var body = el('div', 'sp-card-body');
    var meta = el('div', 'sp-pills-row');
    meta.appendChild(el('span', 'sp-badge ' + (sc.is_expired ? 'sp-badge--closed' : 'sp-badge--ok'), sc.status_badge || 'Active'));
    if (sc.taxonomy && sc.taxonomy.l1) meta.appendChild(el('span', 'sp-badge', pick(sc.taxonomy.l1, 'title')));
    if (sc.taxonomy && sc.taxonomy.l2) meta.appendChild(el('span', 'sp-badge', pick(sc.taxonomy.l2, 'title')));
    if (sc.npci_seeding_required) meta.appendChild(el('span', 'sp-badge sp-badge--dbt', 'NPCI DBT'));
    if (sc.is_official_gov_url) meta.appendChild(el('span', 'sp-badge sp-badge--gov', '✓ .gov.in'));
    body.appendChild(meta);

    var deptText = pick(sc, 'department') || (sc.taxonomy && sc.taxonomy.l2 ? pick(sc.taxonomy.l2, 'title') : '');
    if (deptText) body.appendChild(el('div', 'sp-scheme-org', deptText));

    var h3 = el('h3', 'sp-scheme-title');
    var a = el('a', '', pick(sc, 'title') || sc.title_en);
    a.href = '/schemes/?slug=' + encodeURIComponent(sc.slug);
    h3.appendChild(a); body.appendChild(h3);

    var facts = el('div', 'sp-scheme-facts');
    [
      [state.lang === 'or' ? 'ସହାୟତା ରାଶି' : 'Benefit', sc.benefit_amount_summary || 'See Guidelines'],
      [state.lang === 'or' ? 'ଆୟ ସୀମା' : 'Income Cap', sc.max_annual_income ? ('₹' + num(sc.max_annual_income) + '/yr') : 'As per Rules'],
      [state.lang === 'or' ? 'ଆବେଦନ ମୋଡ୍' : 'Apply Mode', sc.application_mode || 'Online Portal'],
      [state.lang === 'or' ? 'ସମୟ ସୀମା' : 'Window', sc.is_ongoing ? 'Ongoing Year-Round' : (sc.last_date || sc.status_badge || 'Active')]
    ].forEach(function (pair) {
      var cell = el('div', 'sp-scheme-fact');
      cell.appendChild(el('span', 'sp-scheme-fact-k', pair[0]));
      cell.appendChild(el('span', 'sp-scheme-fact-v', pair[1]));
      facts.appendChild(cell);
    });
    body.appendChild(facts);

    if (pick(sc, 'summary')) body.appendChild(el('div', 'sp-muted', pick(sc, 'summary').slice(0, 150)));

    // Explainable Eligibility Badges
    var ev = evaluateSchemeEligibility(sc, state.elig);
    if (ev.badges.length) {
      var bRow = el('div', 'sp-pills-row');
      ev.badges.slice(0, 4).forEach(function (b) {
        bRow.appendChild(el('span', 'sp-badge ' + (b.ok ? 'sp-badge--ok' : 'sp-badge--warn'), b.text));
      });
      body.appendChild(bRow);
    }

    var acts = el('div', 'sp-scheme-foot');
    var leftActs = el('div', 'sp-pills-row');
    var viewA = el('a', 'sp-btn sp-btn--xs sp-btn--primary', state.lang === 'or' ? 'ସମ୍ପୂର୍ଣ୍ଣ ବିବରଣୀ ଦେଖନ୍ତୁ →' : 'View Full Guide →');
    viewA.href = '/schemes/?slug=' + encodeURIComponent(sc.slug);
    leftActs.appendChild(viewA);

    if (sc.official_apply_url && safeHref(sc.official_apply_url) && !sc.is_expired) {
      var appA = el('a', 'sp-btn sp-btn--xs', state.lang === 'or' ? 'ଆବେଦନ କରନ୍ତୁ ↗' : 'Apply ↗');
      appA.href = safeHref(sc.official_apply_url);
      appA.target = '_blank';
      appA.rel = 'noopener noreferrer';
      leftActs.appendChild(appA);
    }
    acts.appendChild(leftActs);

    var isCompared = state.compareIds.indexOf(sc.id) !== -1;
    var cmpBtn = el('button', 'sp-btn sp-btn--xs' + (isCompared ? ' sp-btn--cobalt' : ''), isCompared ? '✓ Comparing' : '+ Compare');
    cmpBtn.type = 'button';
    cmpBtn.addEventListener('click', function () {
      var idx = state.compareIds.indexOf(sc.id);
      if (idx !== -1) state.compareIds.splice(idx, 1);
      else if (state.compareIds.length < 3) state.compareIds.push(sc.id);
      renderPortalListing(mount);
    });
    acts.appendChild(cmpBtn);

    body.appendChild(acts);
    card.appendChild(body);
    return card;
  }

  function renderComparisonTray(wrap, mount) {
    if (!state.compareIds.length) return;
    var chosen = state.compareIds.map(function (id) {
      return state.items.find(function (x) { return x.id === id; });
    }).filter(Boolean);
    if (!chosen.length) return;

    var tray = el('section', 'sp-compare-tray');
    tray.setAttribute('aria-label', 'Side-by-Side 3-Scheme Comparison Tray');
    var head = el('div', 'sp-card-head');
    head.appendChild(el('strong', '', '⚖️ Compare Schemes (' + chosen.length + ' / 3 selected)'));
    var hActs = el('div', 'sp-pills-row');
    var tog = el('button', 'sp-btn sp-btn--xs sp-btn--cobalt', state.showCompareTable ? 'Hide Comparison Table' : 'Compare Side-by-Side');
    tog.type = 'button';
    tog.addEventListener('click', function () { state.showCompareTable = !state.showCompareTable; renderPortalListing(mount); });
    hActs.appendChild(tog);
    var clr = el('button', 'sp-btn sp-btn--xs', 'Clear All'); clr.type = 'button';
    clr.addEventListener('click', function () { state.compareIds = []; state.showCompareTable = false; renderPortalListing(mount); });
    hActs.appendChild(clr);
    head.appendChild(hActs);
    tray.appendChild(head);

    if (state.showCompareTable) {
      var tw = el('div', 'sp-table-wrap');
      var tbl = el('table', 'sp-table');
      var th = el('thead'); var trH = el('tr');
      trH.appendChild(el('th', '', 'Parameter'));
      chosen.forEach(function (s) { trH.appendChild(el('th', '', pick(s, 'title') || s.title_en)); });
      th.appendChild(trH); tbl.appendChild(th);

      var tb = el('tbody');
      var rows = [
        ['Benefit Amount', function (s) { return s.benefit_amount_summary || 'See guidelines'; }],
        ['Frequency', function (s) { return s.benefit_frequency || '—'; }],
        ['Income Limit', function (s) { return s.max_annual_income ? ('₹' + num(s.max_annual_income) + '/yr') : 'No cap / See rules'; }],
        ['NPCI DBT Seeding', function (s) { return s.npci_seeding_required ? 'Mandatory (NPCI Mapper)' : 'Optional / Direct'; }],
        ['Renewal Policy', function (s) { return s.renewal_type || '—'; }],
        ['Window / Deadline', function (s) { return s.is_ongoing ? 'Open Year-Round' : (s.last_date || s.status_badge); }],
        ['Required Docs', function (s) {
          var docs = (s.required_documents || []).map(function (d) { return d.document_name; }).filter(Boolean);
          return docs.length ? docs.slice(0, 4).join(', ') : 'Aadhaar, Residence & Bank Passbook';
        }]
      ];
      rows.forEach(function (spec) {
        var tr = el('tr');
        tr.appendChild(el('td', '', spec[0]));
        chosen.forEach(function (s) { tr.appendChild(el('td', '', spec[1](s))); });
        tb.appendChild(tr);
      });
      tbl.appendChild(tb); tw.appendChild(tbl); tray.appendChild(tw);
    }

    wrap.appendChild(tray);
  }

  function renderWelfareDomainsDirectory(wrap, mount) {
    var l2Nodes = state.nodes.filter(function (n) {
      return Number(n.level) === 2 && (!state.filters.l1 || n.parent_id === state.filters.l1);
    });
    if (!l2Nodes.length) return;

    var l1Map = {};
    state.nodes.forEach(function (n) { if (Number(n.level) === 1) l1Map[n.id] = n; });

    var sec = el('section', 'sp-domain-section');
    sec.setAttribute('aria-label', 'Browse 3-Layer Welfare Domains & Benefit Categories');
    var head = el('div', 'sp-card-head');
    var hl = el('div');
    hl.appendChild(el('h2', 'sp-h2', state.lang === 'or' ? '୩-ସ୍ତରୀୟ କଲ୍ୟାଣ ବିଭାଗ ଏବଂ ସହାୟତା ବର୍ଗ ବ୍ରାଉଜ୍ କରନ୍ତୁ' : 'Browse 3-Layer Welfare Domains & Benefit Categories'));
    hl.appendChild(el('div', 'sp-muted', state.lang === 'or' ? 'ଯୋଜନା ଏବଂ ଛାତ୍ରବୃତ୍ତି ଫିଲ୍ଟର୍ କରିବାକୁ ଯେକୌଣସି କଲ୍ୟାଣ ବିଭାଗ ଚୟନ କରନ୍ତୁ।' : 'Explore Odisha State & Central welfare sectors — click any domain to filter verified schemes immediately.'));
    head.appendChild(hl);
    sec.appendChild(head);

    var grid = el('div', 'sp-domain-grid');
    l2Nodes.forEach(function (d) {
      var parent = l1Map[d.parent_id];
      var card = el('button', 'sp-domain-card' + (state.filters.l2 === d.id ? ' is-active' : ''));
      card.type = 'button';
      var top = el('div', 'sp-domain-top');
      top.appendChild(el('span', 'sp-badge', (d.icon ? d.icon + ' ' : '') + (parent ? pick(parent, 'title') : 'Welfare')));
      top.appendChild(el('span', 'sp-badge sp-badge--ok', num(d.published_schemes_count || 0) + ' Live'));
      card.appendChild(top);
      card.appendChild(el('div', 'sp-domain-title', pick(d, 'title')));
      if (pick(d, 'subtitle')) card.appendChild(el('div', 'sp-domain-sub', pick(d, 'subtitle')));
      card.addEventListener('click', function () {
        state.filters.l1 = d.parent_id || '';
        state.filters.l2 = d.id;
        state.filters.l3 = '';
        loadPortalSchemes(mount);
      });
      grid.appendChild(card);
    });
    sec.appendChild(grid);
    wrap.appendChild(sec);
  }

  function renderPortalListing(mount) {
    var activeEl = document.activeElement;
    var restoreFocusId = (activeEl && activeEl.id && (activeEl.id === 'sp-elig-age' || activeEl.id === 'sp-elig-income' || activeEl.id === 'sp-elig-marks' || activeEl.id === 'sp-portal-search')) ? activeEl.id : '';
    clear(mount);
    var hasFilter = Boolean(state.filters.l1 || state.filters.l2 || state.filters.l3 || state.filters.benefit || state.filters.mode || state.filters.renewal || state.filters.status || state.filters.search);
    var kpis = computeSchemeHeroKpis();

    var wrap = el('div', 'sp-portal');

    // 1. Flagship Editorial Hero Banner (v256)
    var hero = el('section', 'sp-hero');
    hero.setAttribute('aria-label', 'Odisha & Central Government Schemes & Scholarships');
    var heroTop = el('div', 'sp-hero-top');
    var eyebrow = el('span', 'sp-eyebrow');
    eyebrow.appendChild(el('span', 'sp-eyebrow-dot'));
    eyebrow.appendChild(el('span', '', state.lang === 'or'
      ? 'ଓଡ଼ିଶା ଏବଂ କେନ୍ଦ୍ର କଲ୍ୟାଣ ପୋର୍ଟାଲ୍ · ଯାଞ୍ଚିତ .GOV.IN ଓ DBT ଯୋଜନା'
      : 'ODISHA & CENTRAL WELFARE PORTAL · VERIFIED .GOV.IN & DBT SCHEMES'));
    heroTop.appendChild(eyebrow);
    heroTop.appendChild(buildLangToggle(function () { renderPortalListing(mount); }));
    hero.appendChild(heroTop);

    var copy = el('div', 'sp-hero-copy');
    copy.appendChild(el('h1', 'sp-hero-title', state.lang === 'or'
      ? 'ଓଡ଼ିଶା ଏବଂ କେନ୍ଦ୍ର ସରକାରୀ ଯୋଜନା ଓ ଛାତ୍ରବୃତ୍ତି'
      : 'Odisha & Central Government Schemes & Scholarships'));
    copy.appendChild(el('p', 'sp-hero-sub', state.lang === 'or'
      ? 'ଓଡ଼ିଶା ଏବଂ ଭାରତ ସରକାରଙ୍କ ଯାଞ୍ଚିତ କଲ୍ୟାଣକାରୀ ଯୋଜନା, ଆର୍ଥିକ ସହାୟତା, DBT ଛାତ୍ରବୃତ୍ତି, ନାଗରିକ ଯୋଗ୍ୟତା ଯାଞ୍ଚ ଏବଂ ପର୍ଯ୍ୟାୟକ୍ରମେ ଆବେଦନ ମାର୍ଗଦର୍ଶିକା।'
      : 'Verified welfare schemes, financial assistance, DBT scholarships, citizen eligibility auto-matcher, and step-by-step application guides across Odisha & Government of India.'));
    hero.appendChild(copy);

    var kpiRow = el('div', 'sp-hero-kpis');
    [
      [num(kpis.activeCount), state.lang === 'or' ? 'ସକ୍ରିୟ ଯୋଜନା' : 'Active Schemes'],
      [num(kpis.dbtScholCount), state.lang === 'or' ? 'DBT ଓ ଛାତ୍ରବୃତ୍ତି' : 'DBT & Scholarships'],
      [num(kpis.ongoingCount), state.lang === 'or' ? 'ସାରା ବର୍ଷ ଖୋଲା' : 'Ongoing Year-Round'],
      [num(kpis.domainCount), state.lang === 'or' ? 'କଲ୍ୟାଣ ବିଭାଗ' : 'Welfare Domains']
    ].forEach(function (pair) {
      var tile = el('div', 'sp-hero-kpi');
      tile.appendChild(el('strong', 'sp-hero-kpi-val', pair[0]));
      tile.appendChild(el('span', 'sp-hero-kpi-label', pair[1]));
      kpiRow.appendChild(tile);
    });
    hero.appendChild(kpiRow);
    wrap.appendChild(hero);

    // 2. 5 Elevated Government Level Cards + 4-Column Cascading Filter Bar + Quick-Filter Pill Bar
    var filterCard = el('section', 'sp-card');
    filterCard.setAttribute('aria-label', 'Schemes Government Level & Welfare Filters');

    var l1Nodes = state.nodes.filter(function (n) { return Number(n.level) === 1; });
    if (l1Nodes.length) {
      var govStrip = el('div', 'sp-gov-strip');
      govStrip.setAttribute('role', 'group');
      govStrip.setAttribute('aria-label', 'Filter by Government Level');

      var allBtn = el('button', 'sp-gov-card' + (!state.filters.l1 ? ' is-active' : ''));
      allBtn.type = 'button';
      var allL = el('span', 'sp-gov-left');
      allL.appendChild(el('span', 'sp-gov-icon', '🏛️'));
      allL.appendChild(el('span', 'sp-gov-name', state.lang === 'or' ? 'ସମସ୍ତ ସରକାରୀ ସ୍ତର' : 'All Government Levels'));
      allBtn.appendChild(allL);
      allBtn.appendChild(el('span', 'sp-gov-count', num(state.allItems.length || state.items.length)));
      allBtn.addEventListener('click', function () { state.filters.l1 = ''; state.filters.l2 = ''; state.filters.l3 = ''; loadPortalSchemes(mount); });
      govStrip.appendChild(allBtn);

      l1Nodes.forEach(function (n) {
        var b = el('button', 'sp-gov-card' + (state.filters.l1 === n.id ? ' is-active' : ''));
        b.type = 'button';
        var lf = el('span', 'sp-gov-left');
        lf.appendChild(el('span', 'sp-gov-icon', n.icon || '🇮🇳'));
        lf.appendChild(el('span', 'sp-gov-name', pick(n, 'title')));
        b.appendChild(lf);
        b.appendChild(el('span', 'sp-gov-count', num(n.published_schemes_count || 0)));
        b.addEventListener('click', function () { state.filters.l1 = n.id; state.filters.l2 = ''; state.filters.l3 = ''; loadPortalSchemes(mount); });
        govStrip.appendChild(b);
      });
      filterCard.appendChild(govStrip);
    }

    var cGrid = el('div', 'sp-cascade-grid');
    function makeSel(label, opts, val, onChange) {
      var f = el('div', 'sp-field');
      var selId = 'sp-sel-' + label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      var lbl = el('label', 'sp-label', label);
      lbl.setAttribute('for', selId);
      f.appendChild(lbl);
      var s = el('select', 'sp-select');
      s.id = selId;
      opts.forEach(function (o) { var op = el('option', '', o[1]); op.value = o[0]; if (o[0] === val) op.selected = true; s.appendChild(op); });
      s.addEventListener('change', function () { onChange(s.value); });
      f.appendChild(s); return f;
    }
    var l2Nodes = state.nodes.filter(function (n) { return Number(n.level) === 2 && (!state.filters.l1 || n.parent_id === state.filters.l1); });
    var l3Nodes = state.nodes.filter(function (n) { return Number(n.level) === 3 && (!state.filters.l2 || n.parent_id === state.filters.l2); });

    cGrid.appendChild(makeSel('1. Welfare Domain', [['', 'All Domains']].concat(l2Nodes.map(function (n) { return [n.id, pick(n, 'title') + ' (' + (n.published_schemes_count || 0) + ')']; })), state.filters.l2, function (v) { state.filters.l2 = v; state.filters.l3 = ''; loadPortalSchemes(mount); }));
    cGrid.appendChild(makeSel('2. Benefit Type', [['', 'All Benefit Types']].concat(l3Nodes.map(function (n) { return [n.id, pick(n, 'title') + ' (' + (n.published_schemes_count || 0) + ')']; })), state.filters.l3, function (v) { state.filters.l3 = v; loadPortalSchemes(mount); }));

    var qF = el('div', 'sp-field');
    var qLbl = el('label', 'sp-label', '3. Search Schemes');
    qLbl.setAttribute('for', 'sp-portal-search');
    qF.appendChild(qLbl);
    var qI = el('input', 'sp-input'); qI.id = 'sp-portal-search'; qI.type = 'search';
    qI.placeholder = state.lang === 'or' ? 'ଯୋଜନା, ଛାତ୍ରବୃତ୍ତି କିମ୍ବା ବିଭାଗ ଖୋଜନ୍ତୁ...' : 'Search by scheme name, department, or benefit...';
    qI.value = state.filters.search;
    var qt = null;
    qI.addEventListener('input', function () { state.filters.search = qI.value.trim(); clearTimeout(qt); qt = setTimeout(function () { loadPortalSchemes(mount); }, 180); });
    qF.appendChild(qI); cGrid.appendChild(qF);
    filterCard.appendChild(cGrid);

    // Quick-Filter Pill Bar (Benefit Type, Application Mode & Status)
    var qBar = el('div', 'sp-quickbar');

    var benGrp = el('div', 'sp-quick-group');
    benGrp.appendChild(el('span', 'sp-quick-group-label', 'Benefit Type:'));
    BENEFIT_PRESETS.forEach(function (bn) {
      var b = el('button', 'sp-filter-pill' + (state.filters.benefit === bn ? ' is-active' : ''), bn);
      b.type = 'button';
      b.addEventListener('click', function () {
        state.filters.benefit = state.filters.benefit === bn ? '' : bn;
        renderPortalListing(mount);
      });
      benGrp.appendChild(b);
    });
    qBar.appendChild(benGrp);

    var modeGrp = el('div', 'sp-quick-group');
    modeGrp.appendChild(el('span', 'sp-quick-group-label', 'Application Mode:'));
    MODE_PRESETS.forEach(function (md) {
      var b = el('button', 'sp-filter-pill' + (state.filters.mode === md ? ' is-active' : ''), md);
      b.type = 'button';
      b.addEventListener('click', function () {
        state.filters.mode = state.filters.mode === md ? '' : md;
        loadPortalSchemes(mount);
      });
      modeGrp.appendChild(b);
    });
    qBar.appendChild(modeGrp);

    var stGrp = el('div', 'sp-quick-group');
    stGrp.appendChild(el('span', 'sp-quick-group-label', 'Status:'));
    STATUS_PRESETS.forEach(function (pair) {
      var isAct = pair[0] === 'renewal' ? state.filters.renewal === 'Fresh & Renewal' : state.filters.status === pair[0];
      var b = el('button', 'sp-filter-pill' + (isAct ? ' is-active' : ''), pair[1]);
      b.type = 'button';
      b.addEventListener('click', function () {
        if (pair[0] === 'renewal') {
          state.filters.renewal = state.filters.renewal === 'Fresh & Renewal' ? '' : 'Fresh & Renewal';
        } else {
          state.filters.status = state.filters.status === pair[0] ? '' : pair[0];
        }
        loadPortalSchemes(mount);
      });
      stGrp.appendChild(b);
    });
    qBar.appendChild(stGrp);

    if (hasFilter) {
      var rstF = el('button', 'sp-btn sp-btn--xs', '✕ Reset Filters');
      rstF.type = 'button';
      rstF.addEventListener('click', function () {
        state.filters = { l1: '', l2: '', l3: '', benefit: '', mode: '', renewal: '', status: '', search: '' };
        loadPortalSchemes(mount);
      });
      qBar.appendChild(rstF);
    }
    filterCard.appendChild(qBar);
    wrap.appendChild(filterCard);

    // 3. Polished Guided "Check Eligibility (Self or Family Member)" Bar
    var eligCard = el('section', 'sp-card sp-elig-card');
    eligCard.setAttribute('aria-label', 'Citizen Scheme Eligibility Checker');
    var eHead = el('div', 'sp-card-head');
    var eTitleBox = el('div');
    eTitleBox.appendChild(el('h2', 'sp-h2', state.lang === 'or' ? '🎯 ଯୋଗ୍ୟତା ଯାଞ୍ଚ କରନ୍ତୁ (ନିଜେ କିମ୍ବା ପରିବାର ସଦସ୍ୟ)' : '🎯 Check Eligibility (Self or Family Member)'));
    eTitleBox.appendChild(el('div', 'sp-muted', state.lang === 'or' ? 'ପ୍ରତ୍ୟେକ ଯୋଜନା କାର୍ଡରେ ତୁରନ୍ତ ଯୋଗ୍ୟତା ବ୍ୟାଜ୍ ଦେଖନ୍ତୁ।' : 'Enter details below to see instant explainable eligibility badges on every scheme card.'));
    eHead.appendChild(eTitleBox);

    var eActs = el('div', 'sp-elig-actions');
    if (state.candidate) {
      var fillBtn = el('button', 'sp-btn sp-btn--xs sp-btn--cobalt', '✨ Auto-Fill from Candidate Hub');
      fillBtn.type = 'button';
      fillBtn.addEventListener('click', function () {
        state.elig.who = 'Self';
        if (state.candidate.age) state.elig.age = String(state.candidate.age);
        if (state.candidate.category) state.elig.category = String(state.candidate.category).toUpperCase();
        if (state.candidate.gender) state.elig.gender = String(state.candidate.gender);
        renderPortalListing(mount);
      });
      eActs.appendChild(fillBtn);
    } else {
      var fillLink = el('a', 'sp-btn sp-btn--xs', '✨ Auto-Fill from Candidate Hub');
      fillLink.href = '/login.html?next=/schemes/';
      eActs.appendChild(fillLink);
    }
    var resetEligBtn = el('button', 'sp-btn sp-btn--xs', 'Reset Eligibility');
    resetEligBtn.type = 'button';
    resetEligBtn.addEventListener('click', function () {
      state.elig = { who: 'Self', age: '', gender: '', category: '', income: '', marks: '', occupation: '' };
      renderPortalListing(mount);
    });
    eActs.appendChild(resetEligBtn);
    eHead.appendChild(eActs);
    eligCard.appendChild(eHead);

    var eg = el('div', 'sp-elig-grid');
    eg.appendChild(makeSel('Checking For', [['Self', 'Self'], ['Family Member', 'Family Member'], ['Parent / Senior', 'Parent / Senior'], ['Spouse / Woman', 'Spouse / Woman'], ['Student / Child', 'Student / Child']], state.elig.who, function (v) { state.elig.who = v; }));
    var ageF = el('div', 'sp-field');
    var ageLbl = el('label', 'sp-label', 'Age (Yrs)'); ageLbl.setAttribute('for', 'sp-elig-age'); ageF.appendChild(ageLbl);
    var ageI = el('input', 'sp-input'); ageI.id = 'sp-elig-age'; ageI.type = 'number'; ageI.placeholder = '24'; ageI.value = state.elig.age;
    ageI.addEventListener('input', function () { state.elig.age = ageI.value; renderPortalListing(mount); });
    ageF.appendChild(ageI); eg.appendChild(ageF);

    eg.appendChild(makeSel('Gender', [['', 'Any'], ['Female', 'Female'], ['Male', 'Male']], state.elig.gender, function (v) { state.elig.gender = v; renderPortalListing(mount); }));
    eg.appendChild(makeSel('Category', [['', 'Any'], ['UR', 'UR'], ['SEBC', 'SEBC'], ['SC', 'SC'], ['ST', 'ST'], ['EWS', 'EWS'], ['PwBD', 'PwBD']], state.elig.category, function (v) { state.elig.category = v; renderPortalListing(mount); }));

    var incF = el('div', 'sp-field');
    var incLbl = el('label', 'sp-label', 'Annual Income ₹'); incLbl.setAttribute('for', 'sp-elig-income'); incF.appendChild(incLbl);
    var incI = el('input', 'sp-input'); incI.id = 'sp-elig-income'; incI.type = 'number'; incI.placeholder = '200000'; incI.value = state.elig.income;
    incI.addEventListener('input', function () { state.elig.income = incI.value; renderPortalListing(mount); });
    incF.appendChild(incI); eg.appendChild(incF);

    var mkF = el('div', 'sp-field');
    var mkLbl = el('label', 'sp-label', 'Marks %'); mkLbl.setAttribute('for', 'sp-elig-marks'); mkF.appendChild(mkLbl);
    var mkI = el('input', 'sp-input'); mkI.id = 'sp-elig-marks'; mkI.type = 'number'; mkI.placeholder = '65'; mkI.value = state.elig.marks;
    mkI.addEventListener('input', function () { state.elig.marks = mkI.value; renderPortalListing(mount); });
    mkF.appendChild(mkI); eg.appendChild(mkF);

    eg.appendChild(makeSel('Occupation', [['', 'Any'], ['Student', 'Student'], ['Farmer', 'Farmer'], ['Women', 'Women'], ['Worker', 'Construction Worker'], ['Senior', 'Senior / Widow']], state.elig.occupation, function (v) { state.elig.occupation = v; renderPortalListing(mount); }));
    eligCard.appendChild(eg);
    wrap.appendChild(eligCard);

    // 4. Filtered Scheme Cards OR Designed Illustrated Empty State + 3-Layer Welfare Domains Grid
    var visibleSchemes = state.items.filter(function (s) { return matchesQuickBenefit(s, state.filters.benefit); });

    if (!visibleSchemes.length) {
      var emptyCard = el('section', 'sp-empty-card');
      emptyCard.setAttribute('aria-label', 'Welfare Schemes Status');
      var art = el('div', 'sp-empty-art');
      art.appendChild(buildEmptySchemeSvg());
      emptyCard.appendChild(art);

      emptyCard.appendChild(el('h2', 'sp-empty-title', hasFilter
        ? (state.lang === 'or' ? 'ଆପଣଙ୍କ ଫିଲ୍ଟର୍ ସହିତ କୌଣସି ଯୋଜନା ମିଳିଲା ନାହିଁ' : 'No Welfare Schemes Match Your Selected Filters')
        : (state.lang === 'or' ? 'ଯାଞ୍ଚିତ କଲ୍ୟାଣକାରୀ ଯୋଜନା ଓ ଛାତ୍ରବୃତ୍ତି ଶୀଘ୍ର ପ୍ରକାଶିତ ହେବ' : 'Fresh Verified Welfare Schemes & Scholarships Coming Soon')));

      emptyCard.appendChild(el('p', 'sp-empty-desc', hasFilter
        ? (state.lang === 'or'
          ? 'ଅନ୍ୟ ସରକାରୀ ସ୍ତର, କଲ୍ୟାଣ ବିଭାଗ କିମ୍ବା ସହାୟତା ବର୍ଗ ଚେଷ୍ଟା କରନ୍ତୁ କିମ୍ବା ସମସ୍ତ ଫିଲ୍ଟର୍ ରିସେଟ୍ କରନ୍ତୁ।'
          : 'Try broadening your Government Level, Welfare Domain, Benefit Type, or Status filters — or browse our 3-layer Odisha & Central welfare domains below.')
        : (state.lang === 'or'
          ? 'ଏହି ପୋର୍ଟାଲରେ ପ୍ରକାଶିତ ପ୍ରତ୍ୟେକ ଯୋଜନା ସରକାରୀ .gov.in ବିଜ୍ଞପ୍ତି ଏବଂ DBT ନିୟମ ସହିତ ଯାଞ୍ଚ କରାଯାଏ। ତଳେ ଥିବା କଲ୍ୟାଣ ବିଭାଗଗୁଡ଼ିକୁ ବ୍ରାଉଜ୍ କରନ୍ତୁ।'
          : 'Every scheme published here is verified against official Odisha & Government of India .gov.in guidelines with DBT steps, document checklists, and eligibility rules. Explore the welfare domains below.')));

      var emptyActions = el('div', 'sp-pills-row');
      if (hasFilter) {
        var resetBtn = el('button', 'sp-btn sp-btn--primary', state.lang === 'or' ? 'ସମସ୍ତ ଫିଲ୍ଟର୍ ରିସେଟ୍ କରନ୍ତୁ' : 'Reset All Filters');
        resetBtn.type = 'button';
        resetBtn.addEventListener('click', function () {
          state.filters = { l1: '', l2: '', l3: '', benefit: '', mode: '', renewal: '', status: '', search: '' };
          loadPortalSchemes(mount);
        });
        emptyActions.appendChild(resetBtn);
      }
      var jobsLink = el('a', 'sp-btn', state.lang === 'or' ? '💼 ସରକାରୀ ଚାକିରି ଦେଖନ୍ତୁ →' : '💼 Explore Government Jobs →');
      jobsLink.href = '/jobs/';
      emptyActions.appendChild(jobsLink);

      if (state.isAdmin) {
        var adminBtn = el('a', 'sp-btn sp-btn--primary', '+ Publish First Scheme in Admin Studio ↗');
        adminBtn.href = '/admin/#folder-schemes-benefits';
        emptyActions.appendChild(adminBtn);
      }
      emptyCard.appendChild(emptyActions);
      wrap.appendChild(emptyCard);

      renderWelfareDomainsDirectory(wrap, mount);
    } else {
      var resBar = el('div', 'sp-results-bar');
      resBar.appendChild(el('h2', 'sp-h2', state.lang === 'or'
        ? (num(visibleSchemes.length) + ' ଟି ଯାଞ୍ଚିତ ସରକାରୀ ଯୋଜନା ଓ ଛାତ୍ରବୃତ୍ତି')
        : (num(visibleSchemes.length) + ' Verified Welfare Scheme' + (visibleSchemes.length === 1 ? '' : 's') + ' & Scholarship' + (visibleSchemes.length === 1 ? '' : 's'))));
      if (state.isAdmin) {
        var pubMore = el('a', 'sp-btn sp-btn--xs', '+ Publish New Scheme in Admin Studio ↗');
        pubMore.href = '/admin/#folder-schemes-benefits';
        resBar.appendChild(pubMore);
      }
      wrap.appendChild(resBar);

      var grid = el('div', 'sp-grid');
      visibleSchemes.forEach(function (s) { grid.appendChild(buildSchemeCard(s, mount)); });
      wrap.appendChild(grid);
    }

    // 5. Side-by-Side 3-Scheme Comparison Tray
    renderComparisonTray(wrap, mount);
    mount.appendChild(wrap);

    if (restoreFocusId) {
      var refocusEl = document.getElementById(restoreFocusId);
      if (refocusEl && typeof refocusEl.focus === 'function') {
        refocusEl.focus();
      }
    }
  }

  function loadPortalSchemes(mount) {
    var qs = new URLSearchParams();
    if (state.filters.l1) qs.set('l1', state.filters.l1);
    if (state.filters.l2) qs.set('l2', state.filters.l2);
    if (state.filters.l3) qs.set('l3', state.filters.l3);
    if (state.filters.mode) qs.set('mode', state.filters.mode);
    if (state.filters.renewal) qs.set('renewal', state.filters.renewal);
    if (state.filters.status) qs.set('status', state.filters.status);
    if (state.filters.search) qs.set('search', state.filters.search);
    fetch('/api/public/schemes?' + qs.toString(), { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.ok) {
          state.items = d.items || [];
          if (!qs.toString()) state.allItems = state.items.slice();
          if (d.facets) state.facets = d.facets;
          renderPortalListing(mount);
        }
      }).catch(function () {});
  }

  function detectAdminSession() {
    var hint = false;
    try { hint = localStorage.getItem('cso_admin_active') === '1'; } catch (_) {}
    if (!hint) return Promise.resolve(false);
    return fetch('/api/admin/session', { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        state.isAdmin = Boolean(d && d.user);
        return state.isAdmin;
      }).catch(function () { state.isAdmin = false; return false; });
  }

  function loadCandidateProfile() {
    return fetch('/api/candidate/profile', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        if (d && d.ok && d.profile) {
          state.candidate = d.profile;
          if (d.profile.age && !state.elig.age) state.elig.age = String(d.profile.age);
          if (d.profile.category && !state.elig.category) state.elig.category = String(d.profile.category).toUpperCase();
        }
      }).catch(function () { state.candidate = null; });
  }

  function init() {
    var mount = document.getElementById(MOUNT_ID);
    if (!mount) return;
    document.body.classList.add('cso-portal-active', 'cso-portal-schemes-active');
    state.lang = getLangPref();

    var params = new URLSearchParams(window.location.search || '');
    var slug = (params.get('slug') || '').trim();
    var previewToken = (params.get('preview_token') || '').trim();

    if (slug) {
      var url = '/api/public/schemes/article?slug=' + encodeURIComponent(slug) + (previewToken ? '&preview_token=' + encodeURIComponent(previewToken) : '');
      clear(mount).appendChild(el('div', 'sp-card', 'Loading welfare scheme guide…'));
      Promise.all([
        fetch(url, { cache: 'no-store', credentials: 'same-origin' }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); }),
        loadCandidateProfile()
      ]).then(function (pair) {
        var res = pair[0];
        if (!res.ok || !res.data || !res.data.article) {
          clear(mount).appendChild(el('div', 'sp-card', 'Scheme article not found or preview link has expired.'));
          return;
        }
        renderArticleView(mount, res.data);
        if (!res.data.is_preview) sendTelemetry('view', res.data.article);
      }).catch(function () {
        clear(mount).appendChild(el('div', 'sp-card', 'Unable to load scheme article right now.'));
      });
      return;
    }

    // Instant optimistic skeleton shell (<16ms mount) — preserve pre-rendered HTML hero+skeleton if present (CLS = 0)
    if (!mount.querySelector('.cso-portal-skeleton')) {
      clear(mount);
      var skel = el('div', 'cso-portal-skeleton');
      skel.setAttribute('aria-busy', 'true');
      skel.appendChild(el('div', 'cso-skel-hero'));
      skel.appendChild(el('div', 'cso-skel-bar'));
      var skelGrid = el('div', 'cso-skel-grid');
      skelGrid.appendChild(el('div', 'cso-skel-card'));
      skelGrid.appendChild(el('div', 'cso-skel-card'));
      skel.appendChild(skelGrid);
      mount.appendChild(skel);
    }

    Promise.all([
      fetch('/api/public/schemes/bootstrap', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      loadCandidateProfile(),
      detectAdminSession()
    ]).then(function (triple) {
      var boot = triple[0];
      if (boot && boot.ok) {
        state.tree = boot.tree || [];
        state.nodes = boot.nodes || [];
        state.items = boot.items || boot.articles || [];
        state.allItems = state.items.slice();
        if (boot.facets) state.facets = boot.facets;
      }
      renderPortalListing(mount);
    });
  }

  window.CSOSchemesPortal = { init: init, evaluateSchemeEligibility: evaluateSchemeEligibility, renderProse: renderProse };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
