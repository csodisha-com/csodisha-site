/**
 * CS Odisha — Public About & Institutional Transparency Portal (v253)
 * Strict CSP-compliant: zero unsafe HTML string sinks, zero .style.* mutations, zero inline handlers.
 * Hydrates /about/ live from Cloudflare D1 (/api/public/about/*) with cache: 'no-store'.
 */
(function (window, document) {
  'use strict';

  var S = {
    root: null,
    nodes: [],
    transparency: { verified_jobs: 0, active_schemes: 0, study_modules: 0, community_members: 0, verified_portals: 0 },
    pages: [],
    sources: [],
    sectors: [],
    lang: 'en',
    activeL1: '',
    sourceSector: '',
    sourceSearch: ''
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

  function qsParam(k) {
    try { return new URLSearchParams(window.location.search).get(k) || ''; } catch (_e) { return ''; }
  }

  async function api(url, opts) {
    var o = Object.assign({ credentials: 'same-origin', cache: 'no-store' }, opts || {});
    var headers = Object.assign({}, o.headers || {});
    if (o.body && typeof o.body === 'object') {
      headers['Content-Type'] = 'application/json';
      o.body = JSON.stringify(o.body);
    }
    o.headers = headers;
    var r = await fetch(url, o);
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(d.error || ('Request failed (' + r.status + ')'));
    return d;
  }

  function fireTelemetry(event, article) {
    try {
      fetch('/api/public/about/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: event, id: article.id, slug: article.slug })
      }).catch(function () {});
    } catch (_e) {}
  }

  function injectInstitutionalJsonLd(article) {
    try {
      var prev = document.getElementById('cso-about-org-jsonld');
      if (prev) prev.remove();
      var sc = document.createElement('script');
      sc.type = 'application/ld+json';
      sc.id = 'cso-about-org-jsonld';
      sc.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            name: 'Common Sense Odisha',
            url: 'https://csodisha.com/',
            logo: 'https://csodisha.com/assets/img/cso-logo.png',
            email: 'contact@csodisha.com',
            areaServed: 'Odisha, India'
          },
          {
            '@type': 'AboutPage',
            name: article ? article.title_en : 'About Common Sense Odisha — Institutional Transparency Portal',
            url: article ? ('https://csodisha.com/about/?slug=' + encodeURIComponent(article.slug)) : 'https://csodisha.com/about/',
            description: article ? (article.summary_en || article.title_en) : 'Independent, open-access civic and educational platform for Odisha.'
          }
        ]
      });
      document.head.appendChild(sc);
    } catch (_e) {}
  }

  function renderProse(container, text) {
    var box = el('div', 'ap-prose');
    var lines = String(text || '').split(/\r?\n/);
    var ul = null;
    function flush() { if (ul) { box.appendChild(ul); ul = null; } }
    lines.forEach(function (raw) {
      var line = raw.trim();
      if (!line) { flush(); return; }
      if (line.startsWith('## ') || line.startsWith('# ')) { flush(); box.appendChild(el('h3', '', line.replace(/^#+\s+/, ''))); return; }
      if (/^[-*•]\s+/.test(line)) {
        if (!ul) ul = el('ul');
        ul.appendChild(el('li', '', line.replace(/^[-*•]\s+/, '').replace(/\*\*/g, '')));
        return;
      }
      flush();
      box.appendChild(el('p', '', line.replace(/\*\*/g, '')));
    });
    flush();
    container.appendChild(box);
  }

  async function loadPortalData() {
    var pUrl = '/api/public/about/pages' + (S.activeL1 ? ('?l1=' + encodeURIComponent(S.activeL1)) : '');
    var sQ = new URLSearchParams();
    if (S.sourceSector) sQ.set('sector', S.sourceSector);
    if (S.sourceSearch) sQ.set('search', S.sourceSearch);
    var sUrl = '/api/public/about/sources' + (sQ.toString() ? ('?' + sQ.toString()) : '');

    var res = await Promise.all([
      api('/api/public/about/tree').catch(function () { return { nodes: [], transparency: S.transparency }; }),
      api(pUrl).catch(function () { return { items: [] }; }),
      api(sUrl).catch(function () { return { items: [], sectors: [] }; })
    ]);
    S.nodes = res[0].nodes || [];
    S.transparency = res[0].transparency || S.transparency;
    S.pages = res[1].items || [];
    S.sources = res[2].items || [];
    S.sectors = res[2].sectors || [];
  }

  function renderOverviewPortal() {
    clear(S.root);
    injectInstitutionalJsonLd(null);
    var shell = el('div', 'ap-root');

    // 1. Live Platform Transparency & Impact Strip
    var strip = el('section', 'ap-transparency-strip');
    strip.setAttribute('aria-label', 'Live Platform Transparency Counters');
    var t = S.transparency;
    [
      [String(t.verified_jobs || 0), 'Verified Jobs Live', 'is-emerald'],
      [String(t.active_schemes || 0), 'Active Welfare Schemes', 'is-cobalt'],
      [String(t.study_modules || 0), 'Study Modules & PYQs', 'is-violet'],
      [String(t.community_members || 0), 'Registered Members', ''],
      [String(t.verified_portals || S.sources.length), 'Verified .gov.in Portals', 'is-amber']
    ].forEach(function (m) {
      var c = el('div', 'ap-metric-card ' + m[2]);
      c.append(el('strong', 'ap-metric-val', m[0]), el('span', 'ap-metric-lbl', m[1]));
      strip.appendChild(c);
    });
    shell.appendChild(strip);

    // 2. 3-Layer Institutional Navigator & Published Pages
    var navPanel = el('section', 'ap-panel');
    var nHead = el('div', 'ap-panel-head');
    nHead.appendChild(el('h2', 'ap-panel-title', '🏛 Institutional Charter, Policies & Mentor Profiles'));
    var langGrp = el('div', 'ap-chips');
    [['en', 'English'], ['or', 'ଓଡ଼ିଆ']].forEach(function (lg) {
      var b = el('button', 'ap-btn ap-btn-sm' + (S.lang === lg[0] ? ' ap-btn-primary' : ''), lg[1]); b.type = 'button';
      b.addEventListener('click', function () { S.lang = lg[0]; renderOverviewPortal(); });
      langGrp.appendChild(b);
    });
    nHead.appendChild(langGrp);
    navPanel.appendChild(nHead);

    var l1Pills = el('div', 'ap-chips');
    var bAll = el('button', 'ap-btn ap-btn-sm' + (!S.activeL1 ? ' ap-btn-primary' : ''), 'All Pillars'); bAll.type = 'button';
    bAll.addEventListener('click', function () { S.activeL1 = ''; reloadOverview(); });
    l1Pills.appendChild(bAll);
    S.nodes.filter(function (n) { return Number(n.level) === 1; }).forEach(function (n) {
      var lbl = (n.icon ? n.icon + ' ' : '') + (S.lang === 'or' && n.title_or ? n.title_or : n.title_en);
      var b = el('button', 'ap-btn ap-btn-sm' + (S.activeL1 === n.id ? ' ap-btn-primary' : ''), lbl); b.type = 'button';
      b.addEventListener('click', function () { S.activeL1 = n.id; reloadOverview(); });
      l1Pills.appendChild(b);
    });
    navPanel.appendChild(l1Pills);

    if (!S.pages.length) {
      navPanel.appendChild(el('div', 'ap-empty', 'No institutional pages published in this pillar yet.'));
    } else {
      var grid = el('div', 'ap-cards-grid');
      S.pages.forEach(function (a) {
        var card = el('article', 'ap-card');
        card.appendChild(el('span', 'ap-badge', a.doc_type_badge));
        var h3 = el('h3', 'ap-card-title');
        var lnk = el('a', '', S.lang === 'or' && a.title_or ? a.title_or : a.title_en);
        lnk.href = '/about/?slug=' + encodeURIComponent(a.slug);
        h3.appendChild(lnk);
        card.appendChild(h3);
        if (a.person_role_en) card.appendChild(el('div', 'ap-muted', '👤 ' + (S.lang === 'or' && a.person_role_or ? a.person_role_or : a.person_role_en) + (a.person_district ? ' · ' + a.person_district : '')));
        var sum = S.lang === 'or' && a.summary_or ? a.summary_or : a.summary_en;
        if (sum) card.appendChild(el('p', 'ap-muted', sum.slice(0, 180)));
        var aRead = el('a', 'ap-btn ap-btn-sm ap-btn-primary', 'Read Full Document →');
        aRead.href = '/about/?slug=' + encodeURIComponent(a.slug);
        card.appendChild(aRead);
        grid.appendChild(card);
      });
      navPanel.appendChild(grid);
    }
    shell.appendChild(navPanel);

    // 3. Verified Official .gov.in Portals Registry (Anti-Fraud Directory)
    var srcPanel = el('section', 'ap-panel');
    var sHead = el('div', 'ap-panel-head');
    sHead.appendChild(el('h2', 'ap-panel-title', '🛡️ Verified Official Government Portals Registry (Anti-Fraud Directory)'));
    var sSearch = el('input', 'ap-input');
    sSearch.type = 'search'; sSearch.placeholder = 'Verify portal (e.g. OPSC, Subhadra, Scholarship)...'; sSearch.value = S.sourceSearch;
    sSearch.addEventListener('keydown', function (e) { if (e.key === 'Enter') { S.sourceSearch = sSearch.value.trim(); reloadOverview(); } });
    sHead.appendChild(sSearch);
    srcPanel.appendChild(sHead);

    var secPills = el('div', 'ap-chips');
    var bSAll = el('button', 'ap-btn ap-btn-sm' + (!S.sourceSector ? ' ap-btn-primary' : ''), 'All Sectors'); bSAll.type = 'button';
    bSAll.addEventListener('click', function () { S.sourceSector = ''; reloadOverview(); });
    secPills.appendChild(bSAll);
    (S.sectors || []).forEach(function (sec) {
      var b = el('button', 'ap-btn ap-btn-sm' + (S.sourceSector === sec ? ' ap-btn-primary' : ''), sec); b.type = 'button';
      b.addEventListener('click', function () { S.sourceSector = sec; reloadOverview(); });
      secPills.appendChild(b);
    });
    srcPanel.appendChild(secPills);

    if (!S.sources.length) {
      srcPanel.appendChild(el('div', 'ap-empty', 'No verified portals match your search.'));
    } else {
      var sGrid = el('div', 'ap-cards-grid');
      S.sources.forEach(function (src) {
        var c = el('article', 'ap-card');
        var top = el('div', 'ap-chips');
        top.append(el('span', 'ap-badge is-gov', '✓ Verified ' + (src.domain_badge || '.gov.in')), el('span', 'ap-badge', src.sector));
        c.append(top, el('h3', 'ap-card-title', S.lang === 'or' && src.authority_name_or ? src.authority_name_or : src.authority_name_en));
        c.appendChild(el('p', 'ap-muted', S.lang === 'or' && src.purpose_or ? src.purpose_or : src.purpose_en));
        if (src.helpline_info) c.appendChild(el('div', 'ap-muted', '☎ Helpline: ' + src.helpline_info));
        var aExt = el('a', 'ap-btn ap-btn-sm ap-btn-primary', 'Visit Official Portal ↗');
        aExt.href = src.official_url; aExt.target = '_blank'; aExt.rel = 'noopener noreferrer';
        c.appendChild(aExt);
        sGrid.appendChild(c);
      });
      srcPanel.appendChild(sGrid);
    }
    shell.appendChild(srcPanel);

    // 4. Interactive Contact, Partnership & Editorial Correction Desk
    shell.appendChild(renderInquiryDesk());

    S.root.appendChild(shell);
  }

  function renderInquiryDesk() {
    var sec = el('section', 'ap-panel');
    sec.appendChild(el('h2', 'ap-panel-title', '📩 Contact, Academic Partnership & Editorial Correction Desk'));
    sec.appendChild(el('p', 'ap-muted', 'Reach Common Sense Odisha editors directly for fact-check corrections, academic collaborations, press inquiries, or grievance escalations.'));

    var g = el('div', 'ap-grid-2');
    var selType = el('select', 'ap-select');
    [['general_inquiry', 'General Inquiry'], ['editorial_correction', 'Report Typo / Editorial Correction'], ['academic_partnership', 'Academic / Coaching Partnership'], ['grievance_escalation', 'Citizen Grievance Escalation'], ['press_media', 'Press & Media Inquiry']].forEach(function (p) {
      selType.appendChild(new Option(p[1], p[0]));
    });
    var inName = el('input', 'ap-input'); inName.placeholder = 'Your Full Name *';
    var inEmail = el('input', 'ap-input'); inEmail.type = 'email'; inEmail.placeholder = 'Email Address (Optional)';
    var inDist = el('input', 'ap-input'); inDist.placeholder = 'Odisha District (Optional)';
    var inSub = el('input', 'ap-input'); inSub.placeholder = 'Subject *';
    var inMsg = el('textarea', 'ap-textarea'); inMsg.placeholder = 'Write your message, URL, or correction details (min 10 chars)... *';
    g.append(selType, inName, inEmail, inDist);

    var statusEl = el('div', 'ap-muted', '');
    var btnSend = el('button', 'ap-btn ap-btn-primary', 'Submit to Editorial Desk →'); btnSend.type = 'button';
    btnSend.addEventListener('click', async function () {
      try {
        await api('/api/public/about/inquiries', {
          method: 'POST',
          body: { inquiry_type: selType.value, sender_name: inName.value.trim(), sender_email: inEmail.value.trim(), district: inDist.value.trim(), subject_text: inSub.value.trim(), message_text: inMsg.value.trim() }
        });
        inName.value = ''; inEmail.value = ''; inSub.value = ''; inMsg.value = '';
        statusEl.textContent = '✅ Thank you! Your inquiry has been logged directly in Admin Studio for review.';
      } catch (e) { statusEl.textContent = e.message; }
    });
    sec.append(g, inSub, inMsg, btnSend, statusEl);
    return sec;
  }

  // ============================================================================
  // ARTICLE / PROFILE READER & DRAFT PREVIEW
  // ============================================================================
  async function renderArticleView(slug, previewToken) {
    clear(S.root);
    S.root.appendChild(el('div', 'ap-empty', 'Loading institutional document...'));
    var url = '/api/public/about/article?slug=' + encodeURIComponent(slug);
    if (previewToken) url += '&preview_token=' + encodeURIComponent(previewToken);
    try {
      var data = await api(url);
      var a = data.article;
      document.title = a.title_en + ' | About Common Sense Odisha';
      if (!data.is_preview) { fireTelemetry('view', a); injectInstitutionalJsonLd(a); }
      drawArticleDom(data);
    } catch (e) {
      clear(S.root);
      var nf = el('div', 'ap-empty');
      nf.append(el('strong', '', e.message || 'Document not found'), el('p', '', ''));
      var bk = el('a', 'ap-btn ap-btn-primary', '← Back to About Portal'); bk.href = '/about/';
      nf.appendChild(bk);
      S.root.appendChild(nf);
    }
  }

  function drawArticleDom(data) {
    var a = data.article;
    clear(S.root);
    var shell = el('div', 'ap-root');

    if (data.is_preview) {
      var pb = el('div', 'ap-preview-banner');
      pb.append(el('span', '', '👁 ADMIN DRAFT PREVIEW — Not Yet Public'), el('span', '', 'Verify bilingual layout, tables & PDFs before publishing'));
      shell.appendChild(pb);
    }

    var topRow = el('div', 'ap-panel-head');
    var backA = el('a', 'ap-btn ap-btn-sm', '← Back to About Portal'); backA.href = '/about/';
    var lGrp = el('div', 'ap-chips');
    [['en', 'English'], ['or', 'ଓଡ଼ିଆ']].forEach(function (lg) {
      var b = el('button', 'ap-btn ap-btn-sm' + (S.lang === lg[0] ? ' ap-btn-primary' : ''), lg[1]); b.type = 'button';
      b.addEventListener('click', function () { S.lang = lg[0]; drawArticleDom(data); });
      lGrp.appendChild(b);
    });
    topRow.append(backA, lGrp);
    shell.appendChild(topRow);

    var hero = el('article', 'ap-panel');
    if (a.cover_image_url) {
      var img = el('img', 'ap-cover'); img.src = a.cover_image_url; img.alt = a.cover_image_caption || a.title_en;
      hero.appendChild(img);
    }
    hero.appendChild(el('span', 'ap-badge', a.doc_type_badge + (a.effective_date ? ' · Effective ' + a.effective_date : '')));
    hero.appendChild(el('h1', 'ap-panel-title', S.lang === 'or' && a.title_or ? a.title_or : a.title_en));
    if (a.person_role_en) hero.appendChild(el('div', 'ap-muted', '👤 ' + (S.lang === 'or' && a.person_role_or ? a.person_role_or : a.person_role_en) + (a.person_credentials ? ' · ' + a.person_credentials : '') + (a.person_district ? ' · ' + a.person_district : '')));
    var bodyTxt = S.lang === 'or' && a.article_body_or ? a.article_body_or : a.article_body_en;
    renderProse(hero, bodyTxt);
    shell.appendChild(hero);

    if (Array.isArray(a.highlights_table) && a.highlights_table.length) {
      var sH = el('section', 'ap-panel');
      sH.appendChild(el('h2', 'ap-panel-title', 'Core Institutional Principles'));
      var tw = el('div', 'ap-table-wrap'), tbl = el('table', 'ap-table'), tb = el('tbody');
      a.highlights_table.forEach(function (r) {
        var tr = el('tr');
        tr.append(el('td', '', S.lang === 'or' && r.principle_or ? r.principle_or : r.principle_en), el('td', '', S.lang === 'or' && r.detail_or ? r.detail_or : r.detail_en));
        tb.appendChild(tr);
      });
      tbl.appendChild(tb); tw.appendChild(tbl); sH.appendChild(tw); shell.appendChild(sH);
    }

    if (Array.isArray(a.verification_steps) && a.verification_steps.length) {
      var sV = el('section', 'ap-panel');
      sV.appendChild(el('h2', 'ap-panel-title', 'Editorial Fact-Checking & Verification Protocol'));
      var gV = el('div', 'ap-cards-grid');
      a.verification_steps.forEach(function (v) {
        var c = el('div', 'ap-card');
        c.append(el('strong', '', v.step), el('p', 'ap-muted', S.lang === 'or' && v.detail_or ? v.detail_or : v.detail_en));
        gV.appendChild(c);
      });
      sV.appendChild(gV); shell.appendChild(sV);
    }

    if (Array.isArray(a.faq_items) && a.faq_items.length) {
      var sF = el('section', 'ap-panel');
      sF.appendChild(el('h2', 'ap-panel-title', 'Public FAQs'));
      a.faq_items.forEach(function (fq) {
        var det = el('details');
        det.append(el('summary', '', S.lang === 'or' && fq.q_or ? fq.q_or : fq.q_en), el('p', 'ap-muted', S.lang === 'or' && fq.a_or ? fq.a_or : fq.a_en));
        sF.appendChild(det);
      });
      shell.appendChild(sF);
    }

    if (a.charter_pdf_url || a.press_kit_pdf_url) {
      var sPdf = el('section', 'ap-panel');
      sPdf.appendChild(el('h2', 'ap-panel-title', '📄 Official Documents & Inline PDF Viewer'));
      var pdfUrl = a.charter_pdf_url || a.press_kit_pdf_url;
      var dlRow = el('div', 'ap-chips');
      [['Download Charter / Policy PDF', a.charter_pdf_url], ['Download Brochure / Press Kit PDF', a.press_kit_pdf_url]].forEach(function (pr) {
        if (!pr[1]) return;
        var aDl = el('a', 'ap-btn ap-btn-sm ap-btn-primary', '⬇ ' + pr[0]);
        aDl.href = pr[1]; aDl.target = '_blank'; aDl.rel = 'noopener noreferrer';
        aDl.addEventListener('click', function () { fireTelemetry('pdf_download', a); });
        dlRow.appendChild(aDl);
      });
      var fr = el('iframe', 'ap-pdf-frame'); fr.src = pdfUrl; fr.title = a.title_en + ' PDF';
      sPdf.append(dlRow, fr);
      shell.appendChild(sPdf);
    }

    shell.appendChild(renderInquiryDesk());
    S.root.appendChild(shell);
  }

  async function reloadOverview() {
    await loadPortalData();
    renderOverviewPortal();
  }

  async function boot() {
    S.root = document.getElementById('cso-about-portal-root');
    if (!S.root) return;
    document.body.classList.add('cso-portal-active', 'cso-portal-about-active');
    var slug = qsParam('slug');
    var prev = qsParam('preview_token');
    if (slug) { await renderArticleView(slug, prev); return; }
    await reloadOverview();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window, document);
