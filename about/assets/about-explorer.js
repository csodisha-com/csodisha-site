(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const ODISHA_DISTRICTS = [
    { name: 'Angul', or: 'ଅନୁଗୁଳ', zone: 'central' },
    { name: 'Balangir', or: 'ବଲାଙ୍ଗୀର', zone: 'western' },
    { name: 'Balasore', or: 'ବାଲେଶ୍ୱର', zone: 'northern' },
    { name: 'Bargarh', or: 'ବରଗଡ଼', zone: 'western' },
    { name: 'Bhadrak', or: 'ଭଦ୍ରକ', zone: 'northern' },
    { name: 'Boudh', or: 'ବୌଦ୍ଧ', zone: 'western' },
    { name: 'Cuttack', or: 'କଟକ', zone: 'coastal' },
    { name: 'Deogarh', or: 'ଦେବଗଡ଼', zone: 'western' },
    { name: 'Dhenkanal', or: 'ଢେଙ୍କାନାଳ', zone: 'central' },
    { name: 'Gajapati', or: 'ଗଜପତି', zone: 'southern' },
    { name: 'Ganjam', or: 'ଗଞ୍ଜାମ', zone: 'southern' },
    { name: 'Jagatsinghpur', or: 'ଜଗତସିଂହପୁର', zone: 'coastal' },
    { name: 'Jajpur', or: 'ଜାଜପୁର', zone: 'coastal' },
    { name: 'Jharsuguda', or: 'ଝାରସୁଗୁଡ଼ା', zone: 'western' },
    { name: 'Kalahandi', or: 'କଳାହାଣ୍ଡି', zone: 'southern' },
    { name: 'Kandhamal', or: 'କନ୍ଧମାଳ', zone: 'southern' },
    { name: 'Kendrapara', or: 'କେନ୍ଦ୍ରାପଡ଼ା', zone: 'coastal' },
    { name: 'Kendujhar', or: 'କେନ୍ଦୁଝର', zone: 'northern' },
    { name: 'Khordha', or: 'ଖୋର୍ଦ୍ଧା', zone: 'coastal' },
    { name: 'Koraput', or: 'କୋରାପୁଟ', zone: 'southern' },
    { name: 'Malkangiri', or: 'ମାଲକାନଗିରି', zone: 'southern' },
    { name: 'Mayurbhanj', or: 'ମୟୂରଭଞ୍ଜ', zone: 'northern' },
    { name: 'Nabarangpur', or: 'ନବରଙ୍ଗପୁର', zone: 'southern' },
    { name: 'Nayagarh', or: 'ନୟାଗଡ଼', zone: 'central' },
    { name: 'Nuapada', or: 'ନୂଆପଡ଼ା', zone: 'western' },
    { name: 'Puri', or: 'ପୁରୀ', zone: 'coastal' },
    { name: 'Rayagada', or: 'ରାୟଗଡ଼ା', zone: 'southern' },
    { name: 'Sambalpur', or: 'ସମ୍ବଲପୁର', zone: 'western' },
    { name: 'Subarnapur', or: 'ସୁବର୍ଣ୍ଣପୁର', zone: 'western' },
    { name: 'Sundargarh', or: 'ସୁନ୍ଦରଗଡ଼', zone: 'western' }
  ];

  const VERIFIED_PORTAL_ALLOWLIST = [
    'opsc.gov.in',
    'osssc.gov.in',
    'ossc.gov.in',
    'samsodisha.gov.in',
    'scholarship.odisha.gov.in',
    'subhadra.odisha.gov.in',
    'cmkisan.odisha.gov.in',
    'edistrict.odisha.gov.in',
    'odisha.gov.in',
    'ugc.gov.in',
    'nta.ac.in',
    'upsc.gov.in',
    'ssc.gov.in',
    'csodisha.com'
  ];

  const SHORTENER_HOSTS = new Set([
    'bit.ly', 'tinyurl.com', 't.co', 'rb.gy', 'shorturl.at', 'goo.gl', 'is.gd', 'cutt.ly', 'ow.ly'
  ]);

  const SUSPICIOUS_TLDS = ['.xyz', '.top', '.tk', '.ml', '.ga', '.cf', '.gq', '.click', '.loan', '.buzz'];

  let currentLang = 'en';
  let currentZone = 'all';

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function formatNum(val) {
    const n = Number(val || 0);
    return Number.isFinite(n) ? n.toLocaleString('en-IN') : '0';
  }

  function pick(en, or) {
    return currentLang === 'or' && or ? or : en;
  }

  function applyLanguage(lang) {
    currentLang = lang === 'or' ? 'or' : 'en';
    document.documentElement.lang = currentLang === 'or' ? 'or' : 'en';
    try { localStorage.setItem('cso_lang_pref', currentLang); } catch { /* ignore */ }

    document.querySelectorAll('[data-i18n-or]').forEach((node) => {
      if (!node.dataset.i18nEn) node.dataset.i18nEn = node.textContent;
      node.textContent = currentLang === 'or' ? node.dataset.i18nOr : node.dataset.i18nEn;
    });
    document.querySelectorAll('[data-i18n-placeholder-or]').forEach((inp) => {
      if (!inp.dataset.i18nPlaceholderEn) inp.dataset.i18nPlaceholderEn = inp.getAttribute('placeholder') || '';
      inp.setAttribute(
        'placeholder',
        currentLang === 'or' ? inp.dataset.i18nPlaceholderOr : inp.dataset.i18nPlaceholderEn
      );
    });

    const toggleBtn = $('about-lang-toggle');
    if (toggleBtn) {
      toggleBtn.textContent = currentLang === 'or' ? 'ଓଡ଼ିଆ / EN' : 'EN / ଓଡ଼ିଆ';
    }
    renderDistricts(currentZone);
  }

  function initSidebar() {
    const shell = $('about-shell');
    const rail = document.querySelector('.cso-about-rail');
    const toggleBtn = $('about-rail-toggle');
    const mobileOpenBtn = $('about-mobile-open');
    const railCloseBtn = $('about-rail-close');
    const backdrop = $('about-backdrop');

    if (shell && toggleBtn) {
      let collapsed = false;
      try { collapsed = localStorage.getItem('cso_about_rail_collapsed') === '1'; } catch { /* ignore */ }
      shell.classList.toggle('is-collapsed', collapsed);
      toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');

      toggleBtn.addEventListener('click', () => {
        const next = !shell.classList.contains('is-collapsed');
        shell.classList.toggle('is-collapsed', next);
        toggleBtn.setAttribute('aria-expanded', next ? 'false' : 'true');
        try { localStorage.setItem('cso_about_rail_collapsed', next ? '1' : '0'); } catch { /* ignore */ }
      });
    }

    const closeDrawer = () => {
      if (rail) rail.classList.remove('is-open');
      if (backdrop) backdrop.classList.remove('is-open');
    };
    const openDrawer = () => {
      if (rail) rail.classList.add('is-open');
      if (backdrop) backdrop.classList.add('is-open');
    };

    if (mobileOpenBtn) mobileOpenBtn.addEventListener('click', openDrawer);
    if (railCloseBtn) railCloseBtn.addEventListener('click', closeDrawer);
    if (backdrop) backdrop.addEventListener('click', closeDrawer);

    document.querySelectorAll('#about-rail-nav .cso-about-nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        document.querySelectorAll('#about-rail-nav .cso-about-nav-link').forEach((n) => n.classList.remove('is-active'));
        link.classList.add('is-active');
        if (window.innerWidth <= 1024) closeDrawer();
      });
    });
  }

  function renderTelemetry(data) {
    const kpiMount = $('about-kpis');
    const barMount = $('about-telemetry-bars');
    if (!kpiMount || !barMount) return;

    const t = data?.totals || {};
    const dirs = Array.isArray(data?.directories) ? data.directories : [
      { key: 'study-library', label: 'Study Library', labelOr: 'ଅଧ୍ୟୟନ ପାଠାଗାର', href: '/study-library/', folders: 0, items: 0 },
      { key: 'jobs', label: 'Jobs & Careers', labelOr: 'ନିଯୁକ୍ତି ଓ କ୍ୟାରିଅର୍', href: '/jobs/', folders: 0, items: 0 },
      { key: 'schemes', label: 'Schemes & Benefits', labelOr: 'ସରକାରୀ ଯୋଜନା', href: '/schemes/', folders: 0, items: 0 },
      { key: 'community', label: 'Community Directory', labelOr: 'ସମୁଦାୟ ଡିରେକ୍ଟୋରୀ', href: '/community/', folders: 0, items: 0 }
    ];

    const kpis = [
      { val: formatNum(t.totalPublishedResources || 0), lbl: pick('Total Verified Resources', 'ମୋଟ ଯାଞ୍ଚ ହୋଇଥିବା ସମ୍ବଳ') },
      { val: formatNum(t.studyItems || 0), lbl: pick('Study Library Guides', 'ଅଧ୍ୟୟନ ଗାଇଡ୍') },
      { val: formatNum(t.jobsItems || 0), lbl: pick('Jobs & Career Notices', 'ନିଯୁକ୍ତି ସୂଚନା') },
      { val: formatNum(t.schemesItems || 0), lbl: pick('Welfare Schemes', 'ସରକାରୀ ଯୋଜନା') },
      { val: formatNum(t.communityItems || 0), lbl: pick('Community Chapters', 'ସମୁଦାୟ ଶାଖା') },
      { val: formatNum(t.totalFolders || 0), lbl: pick('Curated Topic Guides', 'ବିଷୟ ଗାଇଡ୍') },
      { val: formatNum(t.resolvedFeedbackCount || 0), lbl: pick('Verified Corrections', 'ସମାଧାନ ହୋଇଥିବା ତ୍ରୁଟି') },
      { val: String(t.districtsCount || 30), lbl: pick('Odisha Districts Covered', 'ଓଡ଼ିଶାର ଜିଲ୍ଲା') }
    ];

    kpiMount.textContent = '';
    for (const item of kpis) {
      const card = el('div', 'cso-about-kpi');
      card.append(el('div', 'cso-about-kpi-val', item.val), el('div', 'cso-about-kpi-lbl', item.lbl));
      kpiMount.appendChild(card);
    }

    barMount.textContent = '';
    for (const d of dirs) {
      const card = el('a', 'cso-about-telemetry-card');
      card.href = d.href;
      const top = el('div', 'cso-about-telemetry-top');
      top.append(
        el('span', '', pick(d.label, d.labelOr)),
        el('span', '', `${formatNum(d.items)} ${pick('guides', 'ଟି')}`)
      );
      const sub = el('div', 'cso-about-telemetry-sub', `${formatNum(d.folders)} ${pick('curated guides →', 'ଗାଇଡ୍ →')}`);
      card.append(top, sub);
      barMount.appendChild(card);
    }
  }

  async function loadOverview() {
    try {
      const res = await fetch('/api/public/about-overview', { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const data = await res.json();
        renderTelemetry(data);
        return;
      }
    } catch { /* fallback below */ }

    try {
      const res = await fetch('/api/content/platform-stats', { headers: { Accept: 'application/json' } });
      if (res.ok) {
        const d = await res.json();
        renderTelemetry({
          totals: {
            totalPublishedResources: (d.activeJobsCount || 0) + (d.schemesCount || 0) + (d.resourcesCount || 0) + (d.mockTestsCount || 0),
            totalFolders: d.directoryNodesCount || d.aboutNodesCount || 0,
            studyItems: d.resourcesCount || 0,
            jobsItems: d.activeJobsCount || 0,
            schemesItems: d.schemesCount || 0,
            communityItems: 0,
            resolvedFeedbackCount: d.resolvedFeedbackCount || 0,
            districtsCount: d.districtsCount || 30
          }
        });
        return;
      }
    } catch { /* static fallback below */ }

    renderTelemetry({ totals: { districtsCount: 30 } });
  }

  async function loadAboutDirectory() {
    const mount = $('about-directory-grid');
    if (!mount) return;
    try {
      const res = await fetch('/api/content/about-directory', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('Directory unavailable');
      const data = await res.json();
      const items = Array.isArray(data?.nodes) ? data.nodes : (Array.isArray(data?.items) ? data.items : []);
      if (items.length > 0) {
        mount.textContent = '';
        items.slice(0, 9).forEach((node) => {
          const card = el('article', 'cso-about-dir-card');
          card.append(
            el('span', 'cso-about-tag', node.badge_text || node.level || 'Charter'),
            el('h3', '', pick(node.title, node.title_or)),
            el('p', '', node.subtitle || node.description || 'Verified institutional standard on Common Sense Odisha.')
          );
          if (node.official_url && /^https?:\/\//i.test(node.official_url)) {
            const link = el('a', '', pick('Open Reference →', 'ସୂଚନା ଦେଖନ୍ତୁ →'));
            link.href = node.official_url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            card.appendChild(link);
          }
          mount.appendChild(card);
        });
        return;
      }
    } catch { /* clean empty state rendered below */ }

    mount.textContent = '';
    const emptyCard = el('article', 'cso-about-dir-card');
    emptyCard.append(
      el('h3', '', pick('No items published yet', 'ଏପର୍ଯ୍ୟନ୍ତ କୌଣସି ବିଷୟ ପ୍ରକାଶିତ ହୋଇନାହିଁ')),
      el('p', '', 'No items published yet — add categories or content in Admin Studio.')
    );
    mount.appendChild(emptyCard);
  }

  function evaluatePortalUrl(rawInput) {
    const raw = String(rawInput || '').trim();
    if (!raw) {
      return {
        status: 'is-warn',
        title: pick('Enter a URL to inspect', 'ଯାଞ୍ଚ କରିବା ପାଇଁ ଏକ ଲିଙ୍କ୍ ଦିଅନ୍ତୁ'),
        detail: pick('Paste any WhatsApp, SMS, or website link (e.g. https://opsc.gov.in).', 'ଯେକୌଣସି WhatsApp ବା SMS ଲିଙ୍କ୍ ପେଷ୍ଟ କରନ୍ତୁ।')
      };
    }

    const normalized = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    let parsed;
    try {
      parsed = new URL(normalized);
    } catch {
      return {
        status: 'is-danger',
        title: pick('Caution / Malformed URL', 'ସତର୍କତା / ଅବୈଧ ଲିଙ୍କ୍'),
        detail: pick('This does not appear to be a valid web URL. Do not enter Aadhaar, bank, or OTP details.', 'ଏହା ଏକ ବୈଧ ୱେବ୍ ଲିଙ୍କ୍ ନୁହେଁ।')
      };
    }

    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const isHttp = /^http:\/\//i.test(raw);
    const isAllowlisted = VERIFIED_PORTAL_ALLOWLIST.some((d) => host === d || host.endsWith(`.${d}`));
    const isOfficialSuffix = host.endsWith('.gov.in') || host.endsWith('.nic.in') || host.endsWith('.odisha.gov.in') || host.endsWith('.ac.in') || host.endsWith('.org.in');
    const isShortener = SHORTENER_HOSTS.has(host);
    const hasSuspiciousTld = SUSPICIOUS_TLDS.some((tld) => host.endsWith(tld));
    const hasLookalikeKeyword = /(opsc|ossc|osssc|subhadra|cmkisan|odisha|scholarship|pmkisan)/i.test(host) && !isOfficialSuffix && !isAllowlisted;

    if (isShortener || hasSuspiciousTld || hasLookalikeKeyword) {
      return {
        status: 'is-danger',
        title: pick(`Caution / Unverified Domain: ${host}`, `ସତର୍କତା / ଅଯାଞ୍ଚିତ ଡୋମେନ୍: ${host}`),
        detail: isShortener
          ? pick('Shortened links hide the real destination. Never enter Aadhaar, OTP, or fee payments via shortlinks.', 'ସର୍ଟ ଲିଙ୍କ୍ ପ୍ରକୃତ ୱେବସାଇଟ୍ ଲୁଚାଇଥାଏ — ସତର୍କ ରୁହନ୍ତୁ।')
          : pick('This looks like a lookalike or unverified non-government domain. Official Odisha portals end in .gov.in or .nic.in.', 'ଏହା ସରକାରୀ .gov.in ବା .nic.in ପୋର୍ଟାଲ୍ ନୁହେଁ — ଠକେଇରୁ ସତର୍କ ରୁହନ୍ତୁ।')
      };
    }

    if ((isAllowlisted || isOfficialSuffix) && isHttp) {
      return {
        status: 'is-warn',
        title: pick(`Caution: Insecure http:// on ${host}`, `ସତର୍କତା: ଅସୁରକ୍ଷିତ http:// (${host})`),
        detail: pick('Domain matches an official suffix, but uses unencrypted http:// instead of https://. Use https:// directly.', 'ଡୋମେନ୍ ସରକାରୀ କିନ୍ତୁ https:// ବଦଳରେ http:// ଅଛି — https:// ବ୍ୟବହାର କରନ୍ତୁ।')
      };
    }

    if (isAllowlisted || isOfficialSuffix) {
      return {
        status: 'is-safe',
        title: pick(`Verified Official Portal: ${host}`, `ଯାଞ୍ଚ ହୋଇଥିବା ସରକାରୀ ପୋର୍ଟାଲ୍: ${host}`),
        detail: pick('Uses HTTPS on a verified government / institutional domain (.gov.in / .nic.in / .odisha.gov.in / .ac.in / .org.in).', 'ଏହା HTTPS ସହିତ ପ୍ରାମାଣିକ ସରକାରୀ ଡୋମେନ୍ ଅଟେ।')
      };
    }

    return {
      status: 'is-warn',
      title: pick(`Caution / Unverified Third-Party Domain: ${host}`, `ସତର୍କତା / ତୃତୀୟ-ପକ୍ଷ ଡୋମେନ୍: ${host}`),
      detail: pick('Not on the .gov.in / .nic.in / CSO allowlist. Double-check on the official department portal before submitting personal details.', 'ଏହା ସରକାରୀ .gov.in ତାଲିକାରେ ନାହିଁ — ବ୍ୟକ୍ତିଗତ ତଥ୍ୟ ଦେବା ପୂର୍ବରୁ ଯାଞ୍ଚ କରନ୍ତୁ।')
    };
  }

  function initUrlVerifier() {
    const input = $('scam-url-input');
    const btn = $('scam-verify-btn');
    const out = $('scam-verify-result');
    if (!input || !btn || !out) return;

    const runCheck = () => {
      const verdict = evaluatePortalUrl(input.value);
      out.hidden = false;
      out.className = `cso-about-verifier-result ${verdict.status}`;
      out.textContent = '';
      out.append(el('strong', '', verdict.title), el('p', 'cso-about-muted', verdict.detail));
    };

    btn.addEventListener('click', runCheck);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        runCheck();
      }
    });
    document.querySelectorAll('.cso-about-preset-btn').forEach((preset) => {
      preset.addEventListener('click', () => {
        input.value = preset.dataset.testUrl || '';
        runCheck();
      });
    });
  }

  function renderDistricts(zone) {
    currentZone = zone || 'all';
    const grid = $('about-districts-grid');
    if (!grid) return;
    const filtered = currentZone === 'all'
      ? ODISHA_DISTRICTS
      : ODISHA_DISTRICTS.filter((d) => d.zone === currentZone);

    grid.textContent = '';
    filtered.forEach((d) => {
      const card = el('a', 'cso-about-district-chip');
      card.href = `/community/?region=${encodeURIComponent(d.name)}`;
      card.append(
        el('strong', '', pick(d.name, d.or)),
        el('span', '', `${d.zone.toUpperCase()} · ${pick('Community & Schemes', 'ସମୁଦାୟ ଓ ଯୋଜନା')}`)
      );
      grid.appendChild(card);
    });
  }

  function initDistrictTabs() {
    const tabs = document.querySelectorAll('#district-zone-tabs .cso-about-zone-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => {
          t.classList.remove('is-active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected', 'true');
        renderDistricts(tab.dataset.zone || 'all');
      });
    });
    renderDistricts('all');
  }

  async function loadChangelog() {
    const list = $('about-changelog-list');
    if (!list) return;
    try {
      const res = await fetch('/api/content/changelog?limit=8', { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error('Changelog unavailable');
      const data = await res.json();
      const entries = Array.isArray(data?.entries) ? data.entries : (Array.isArray(data?.items) ? data.items : []);
      if (entries.length > 0) {
        list.textContent = '';
        entries.forEach((entry) => {
          const row = el('a', 'cso-about-changelog-item');
          row.href = entry.url || '/about/';
          const meta = el('div', 'cso-about-changelog-meta');
          const cleanBadge = String(entry.badge || 'Update').replace(/\bv\d+(?:\.\d+)*\b/gi, '').trim() || 'Update';
          meta.append(
            el('span', 'cso-about-tag', cleanBadge),
            el('strong', '', pick(entry.title, entry.title_or)),
            el('span', 'cso-about-muted', entry.summary || '')
          );
          const dateText = entry.timestamp ? String(entry.timestamp).slice(0, 10) : 'Verified';
          row.append(meta, el('span', 'cso-about-changelog-time', dateText));
          list.appendChild(row);
        });
        return;
      }
    } catch { /* clean empty state rendered below */ }

    list.textContent = '';
    list.appendChild(el('p', 'cso-about-muted', 'No items published yet — add categories or content in Admin Studio.'));
  }

  function initHelplineActions() {
    const status = $('about-copy-status');
    document.querySelectorAll('.cso-about-copy-btn').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const val = btn.dataset.copyVal || '';
        if (!val) return;
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(val);
          }
          if (status) {
            status.hidden = false;
            status.textContent = pick(`Copied to clipboard: ${val}`, `କପି ହୋଇଗଲା: ${val}`);
          }
        } catch {
          if (status) {
            status.hidden = false;
            status.textContent = `${pick('Contact:', 'ସମ୍ପର୍କ:')} ${val}`;
          }
        }
      });
    });

    const printBtn = $('btnPrintAbout');
    if (printBtn) {
      printBtn.addEventListener('click', () => window.print());
    }
  }


  function initEmblemFallback() {
    document.querySelectorAll('img.cso-brand-emblem').forEach((img) => {
      img.addEventListener('error', () => {
        if (img.dataset.fallbackApplied === '1') return;
        img.dataset.fallbackApplied = '1';
        img.src = '/assets/img/cso-logo-96.png';
      });
      if (img.complete && img.naturalWidth === 0 && img.dataset.fallbackApplied !== '1') {
        img.dataset.fallbackApplied = '1';
        img.src = '/assets/img/cso-logo-96.png';
      }
    });
  }

  function initTopSearchAndContext() {
    const shell = $('about-shell');
    const rail = document.querySelector('.cso-about-rail');
    const backdrop = $('about-backdrop');
    const railToggle = $('about-rail-toggle');
    const topToggle = $('about-topbar-toggle');
    const topSearch = $('about-topbar-search');
    const topClear = $('about-topbar-clear');
    const ctxPill = $('about-context-pill');
    const navLinks = Array.from(document.querySelectorAll('#about-rail-nav .cso-about-nav-link'));
    let activeLabel = 'Overview';
    let activeHref = '#overview';
    let timer = null;

    function setContext(label, href) {
      if (!ctxPill) return;
      ctxPill.textContent = '⌂ ' + (label || 'Overview');
      if (href) ctxPill.setAttribute('href', href);
    }

    function setActiveNav(href) {
      navLinks.forEach((n) => n.classList.toggle('is-active', n.getAttribute('href') === href));
    }

    function filterSections(q, jumpToFirst) {
      const needle = String(q || '').trim().toLowerCase();
      if (topClear) topClear.hidden = !needle;

      const panels = Array.from(document.querySelectorAll(
        '.cso-about-main > .cso-about-panel, .cso-about-main > .cso-about-notice'
      ));
      const cards = Array.from(document.querySelectorAll(
        '.cso-about-step-card, .cso-about-charter-card, .cso-about-faq-item, .cso-about-helpline-card, .cso-about-district-chip'
      ));

      if (!needle) {
        panels.forEach((elNode) => {
          elNode.classList.remove('is-search-match', 'is-search-dim');
        });
        cards.forEach((c) => {
          c.classList.remove('is-search-match', 'is-search-dim');
        });
        setContext(activeLabel, activeHref);
        return;
      }

      let firstMatch = null;
      let matchCount = 0;

      panels.forEach((panel) => {
        const hit = (panel.textContent || '').toLowerCase().includes(needle);
        panel.classList.toggle('is-search-match', hit);
        panel.classList.toggle('is-search-dim', !hit);
        if (hit) {
          matchCount += 1;
          if (!firstMatch) firstMatch = panel;
        }
      });

      cards.forEach((card) => {
        const hit = (card.textContent || '').toLowerCase().includes(needle);
        card.classList.toggle('is-search-match', hit);
        card.classList.toggle('is-search-dim', !hit);
        if (hit && !firstMatch) firstMatch = card;
      });

      setContext(`Search: ${q.trim()} (${matchCount})`, firstMatch && firstMatch.id ? '#' + firstMatch.id : '#overview');
      if (jumpToFirst && firstMatch && firstMatch.scrollIntoView) {
        firstMatch.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    if (topToggle && shell) {
      topToggle.addEventListener('click', () => {
        if (window.matchMedia && window.matchMedia('(max-width: 1024px)').matches) {
          const open = !(rail && rail.classList.contains('is-open'));
          if (rail) rail.classList.toggle('is-open', open);
          if (backdrop) backdrop.classList.toggle('is-open', open);
          topToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        } else {
          const next = !shell.classList.contains('is-collapsed');
          shell.classList.toggle('is-collapsed', next);
          topToggle.setAttribute('aria-expanded', next ? 'false' : 'true');
          if (railToggle) railToggle.setAttribute('aria-expanded', next ? 'false' : 'true');
          try { localStorage.setItem('cso_about_rail_collapsed', next ? '1' : '0'); } catch { /* ignore */ }
        }
      });
    }

    if (topSearch) {
      topSearch.addEventListener('input', () => {
        clearTimeout(timer);
        if (topClear) topClear.hidden = !topSearch.value;
        timer = setTimeout(() => filterSections(topSearch.value, false), 180);
      });
      topSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          clearTimeout(timer);
          filterSections(topSearch.value, true);
        } else if (e.key === 'Escape') {
          topSearch.value = '';
          clearTimeout(timer);
          filterSections('', false);
        }
      });
    }

    if (topClear) {
      topClear.addEventListener('click', () => {
        if (topSearch) {
          topSearch.value = '';
          topSearch.focus();
        }
        filterSections('', false);
      });
    }

    navLinks.forEach((link) => {
      link.addEventListener('click', () => {
        const lbl = link.querySelector('.cso-about-rail-label');
        activeLabel = lbl ? lbl.textContent.trim() : 'Overview';
        activeHref = link.getAttribute('href') || '#overview';
        setContext(activeLabel, activeHref);
      });
    });

    const sectionEntries = navLinks
      .map((link) => {
        const href = link.getAttribute('href') || '';
        const target = href.startsWith('#') ? document.getElementById(href.slice(1)) : null;
        const lbl = link.querySelector('.cso-about-rail-label');
        return target ? { href, target, label: lbl ? lbl.textContent.trim() : 'Overview' } : null;
      })
      .filter(Boolean);

    if (sectionEntries.length) {
      const onScrollUpdate = () => {
        if (topSearch && topSearch.value.trim()) return;
        let current = sectionEntries[0];
        const offset = 140;
        for (let i = 0; i < sectionEntries.length; i += 1) {
          const rect = sectionEntries[i].target.getBoundingClientRect();
          if (rect.top <= offset) current = sectionEntries[i];
        }
        if (current && current.href !== activeHref) {
          activeHref = current.href;
          activeLabel = current.label;
          setActiveNav(activeHref);
          setContext(activeLabel, activeHref);
        }
      };
      window.addEventListener('scroll', onScrollUpdate, { passive: true });
    }
  }

  function boot() {
    let savedLang = 'en';
    try {
      if (localStorage.getItem('cso_lang_pref') === 'or') savedLang = 'or';
    } catch { /* ignore */ }

    initSidebar();
    initEmblemFallback();
    initTopSearchAndContext();
    initUrlVerifier();
    initDistrictTabs();
    initHelplineActions();
    applyLanguage(savedLang);

    const langToggle = $('about-lang-toggle');
    if (langToggle) {
      langToggle.addEventListener('click', () => {
        applyLanguage(currentLang === 'or' ? 'en' : 'or');
        loadOverview();
        loadAboutDirectory();
        loadChangelog();
      });
    }

    loadOverview();
    loadAboutDirectory();
    loadChangelog();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
