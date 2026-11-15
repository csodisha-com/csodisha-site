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
      { val: formatNum(t.totalFolders || 0), lbl: pick('Topic Collections', 'ବିଷୟ ସଂଗ୍ରହ') },
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
      const sub = el('div', 'cso-about-telemetry-sub', `${formatNum(d.folders)} ${pick('topic sections →', 'ବିଭାଗ →')}`);
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
    } catch { /* static fallback rendered below */ }

    const fallback = [
      { badge: 'Charter', title: 'Non-Government Independence', or: 'ଅଣ-ସରକାରୀ ସ୍ୱାଧୀନତା', desc: 'Independent civic education platform — never collects fees or applications.' },
      { badge: 'Privacy', title: 'DPDP Act 2023 Compliance', or: 'DPDP ଆଇନ ୨୦୨୩ ସୁରକ୍ଷା', desc: 'Zero ad trackers, strict CSP, and local-first IndexedDB candidate tools.' },
      { badge: 'Accuracy', title: '3-Step Gazette Verification', or: '୩-ସ୍ତରୀୟ ଗେଜେଟ୍ ଯାଞ୍ଚ', desc: 'Every job, scheme, and exam update is verified directly against .gov.in PDFs.' }
    ];
    mount.textContent = '';
    fallback.forEach((f) => {
      const card = el('article', 'cso-about-dir-card');
      card.append(el('span', 'cso-about-tag', f.badge), el('h3', '', pick(f.title, f.or)), el('p', '', f.desc));
      mount.appendChild(card);
    });
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
    } catch { /* fallback below */ }

    const fallback = [
      { badge: 'Platform Update', title: 'Unified Citizen Charter & Live Cross-Directory Metrics', summary: 'Added live verified counts across Study Library, Jobs, Schemes & Community plus Anti-Scam URL Checker.', url: '/about/', time: '2026-11-15' },
      { badge: 'Community', title: 'Odisha District Chapters, SHGs, FPOs & Civic Networks', summary: 'Launched bilingual Odisha district chapters, student mentorship circles, NGOs & safety governance.', url: '/community/', time: '2026-11-15' },
      { badge: 'Schemes & Benefits', title: 'Unified Odisha & Central Welfare Schemes Explorer', summary: 'Organised welfare scheme eligibility checklists, required documents, and official portals across Odisha.', url: '/schemes/', time: '2026-11-14' }
    ];
    list.textContent = '';
    fallback.forEach((entry) => {
      const row = el('a', 'cso-about-changelog-item');
      row.href = entry.url;
      const meta = el('div', 'cso-about-changelog-meta');
      meta.append(el('span', 'cso-about-tag', entry.badge), el('strong', '', entry.title), el('span', 'cso-about-muted', entry.summary));
      row.append(meta, el('span', 'cso-about-changelog-time', entry.time));
      list.appendChild(row);
    });
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

  function boot() {
    let savedLang = 'en';
    try {
      if (localStorage.getItem('cso_lang_pref') === 'or') savedLang = 'or';
    } catch { /* ignore */ }

    initSidebar();
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
