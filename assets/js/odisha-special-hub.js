/**
 * Common Sense Odisha — Unified 30-District & 314-Block Atlas + Odisha Special Hub (v457)
 * Merges live district recruitment counters (/api/public/search-index), Odisha Hub heritage
 * metadata (/api/public/odisha-hub), and the exact 30-District / 58-Sub-Division / 314-Block
 * Administrative Directory (window.CSOOdishaAdminDirectory) into ONE unified 30-district atlas
 * with Revenue Division pills, Active Jobs Only toggle, Cards vs Compact Table toggle,
 * accessible ARIA 314-Block drawer, and 1-click Exam Travel planner integration.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection, zero inline style mutations.
 */
(function (window, document) {
  'use strict';

  var HUB_ID = 'cso-odisha-hub-root';

  var RTO_CODES = {
    balasore: 'OD-01', khordha: 'OD-02', balangir: 'OD-03', jajpur: 'OD-04', cuttack: 'OD-05',
    dhenkanal: 'OD-06', ganjam: 'OD-07', kalahandi: 'OD-08', kendujhar: 'OD-09', koraput: 'OD-10',
    mayurbhanj: 'OD-11', kandhamal: 'OD-12', puri: 'OD-13', sundargarh: 'OD-14', sambalpur: 'OD-15',
    bargarh: 'OD-17', rayagada: 'OD-18', angul: 'OD-19', gajapati: 'OD-20', jagatsinghpur: 'OD-21',
    bhadrak: 'OD-22', jharsuguda: 'OD-23', nabarangpur: 'OD-24', nayagarh: 'OD-25', nuapada: 'OD-26',
    boudh: 'OD-27', deogarh: 'OD-28', kendrapara: 'OD-29', malkangiri: 'OD-30', subarnapur: 'OD-31'
  };

  var state = {
    lang: (function () {
      var root = document && document.documentElement;
      if (root && (root.getAttribute('lang') === 'or' || root.getAttribute('data-cso-lang') === 'or')) return 'or';
      try {
        if (window.localStorage && window.localStorage.getItem('cso_lang_pref') === 'or') return 'or';
      } catch (_) {}
      return 'en';
    })(),
    districts: [],
    items: [],
    quiz: [],
    answers: {},
    districtStats: { bySlug: {}, totalDistrictTagged: 0, totalLive: 0 },
    filters: {
      division: 'all',
      distQ: '',
      activeJobsOnly: false,
      viewMode: 'cards',
      tab: 'all',
      itemQ: ''
    }
  };

  var blockDrawerRefs = null;
  var lastFocusedEl = null;

  function resolveCanonicalDistrictSlug(d, dfApi) {
    var api = dfApi || window.CSODistrictFilter;
    var raw = (d && (d.slug || d.name_en || d.en)) || '';
    if (api && typeof api.resolveDistrictSlug === 'function') {
      var r = api.resolveDistrictSlug(raw);
      if (r) return r;
    }
    return String(raw).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function extractPinCode(collectorateStr) {
    var m = String(collectorateStr || '').match(/\b(7[567]\d{4})\b/);
    return m ? m[1] : '751001';
  }

  function computeDistrictLiveStats(searchItems, dfApi) {
    var api = dfApi || window.CSODistrictFilter;
    var list = Array.isArray(searchItems) ? searchItems : [];
    var nonHub = list.filter(function (it) {
      return it && it.type !== 'hub';
    });
    var bySlug = {};
    var matchedItemIds = {};
    var districtsList = (api && Array.isArray(api.DISTRICTS)) ? api.DISTRICTS : [];

    for (var i = 0; i < districtsList.length; i += 1) {
      var slug = districtsList[i].slug;
      var activeJobs = 0;
      var totalUpdates = 0;
      for (var k = 0; k < nonHub.length; k += 1) {
        var it = nonHub[k];
        if (api && typeof api.matchDistrict === 'function' && api.matchDistrict(it, slug, { includeStatewide: false })) {
          totalUpdates += 1;
          if (it.type === 'job_alert') activeJobs += 1;
          matchedItemIds[it.id || it.url || String(k)] = true;
        }
      }
      bySlug[slug] = {
        slug: slug,
        active_jobs: activeJobs,
        total_updates: totalUpdates,
        jobs_url: '/jobs/?district=' + encodeURIComponent(slug),
        updates_url: '/updates/?district=' + encodeURIComponent(slug)
      };
    }

    return {
      bySlug: bySlug,
      totalDistrictTagged: Object.keys(matchedItemIds).length,
      totalLive: nonHub.length
    };
  }

  function getUnifiedDistrictRecords() {
    var adminDir = window.CSOOdishaAdminDirectory;
    var adminList = (adminDir && Array.isArray(adminDir.DISTRICTS)) ? adminDir.DISTRICTS : [];
    var hubBySlug = {};
    (state.districts || []).forEach(function (hd) {
      var s = resolveCanonicalDistrictSlug(hd);
      if (s) hubBySlug[s] = hd;
    });

    if (!adminList.length && state.districts.length) {
      return state.districts.map(function (hd) {
        var s = resolveCanonicalDistrictSlug(hd);
        return {
          slug: s,
          name_en: hd.name_en || s,
          name_or: hd.name_or || hd.name_en || s,
          division: String(hd.division || 'central').toLowerCase(),
          hq_en: hd.hq_en || hd.name_en || '',
          hq_or: hd.hq_or || hd.hq_en || '',
          famous_for_en: hd.famous_for_en || '',
          famous_for_or: hd.famous_for_or || '',
          portal: hd.district_portal_url || 'https://odisha.gov.in/',
          collectorate: '',
          edistrict: 'https://edistrict.odisha.gov.in/',
          pin: '751001',
          rto: RTO_CODES[s] || 'OD-02',
          subDivisions: [],
          blocks: [],
          examCenters: []
        };
      });
    }

    return adminList.slice().sort(function (a, b) {
      return a.en.localeCompare(b.en);
    }).map(function (ad) {
      var hd = hubBySlug[ad.slug] || {};
      return {
        slug: ad.slug,
        name_en: ad.en,
        name_or: ad.or,
        division: String(ad.division || 'central').toLowerCase(),
        hq_en: ad.hq || hd.hq_en || ad.en,
        hq_or: hd.hq_or || ad.or,
        famous_for_en: hd.famous_for_en || ('Sub-Divisions: ' + (ad.subDivisions || []).join(', ') + ' · Exam Hub: ' + (ad.examCenters || []).slice(0, 2).join(', ')),
        famous_for_or: hd.famous_for_or || ('ଉପଖଣ୍ଡ: ' + (ad.subDivisions || []).join(', ')),
        portal: ad.portal || hd.district_portal_url || 'https://odisha.gov.in/',
        collectorate: ad.collectorate || '',
        edistrict: ad.edistrict || 'e-District & Tehsil Sewa Kendra',
        pin: extractPinCode(ad.collectorate),
        rto: RTO_CODES[ad.slug] || 'OD-02',
        subDivisions: Array.isArray(ad.subDivisions) ? ad.subDivisions : [],
        blocks: Array.isArray(ad.blocks) ? ad.blocks : [],
        examCenters: Array.isArray(ad.examCenters) ? ad.examCenters : []
      };
    });
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function isOdia() {
    if (state.lang === 'or') return true;
    var root = document.documentElement;
    return Boolean(root && (root.getAttribute('lang') === 'or' || root.getAttribute('data-cso-lang') === 'or'));
  }

  function divisionLabel(divKey, orMode) {
    var k = String(divKey || '').toLowerCase();
    if (k === 'central') return orMode ? 'କେନ୍ଦ୍ରୀୟ ଡିଭିଜନ୍' : 'Central Division';
    if (k === 'northern') return orMode ? 'ଉତ୍ତରାଞ୍ଚଳ ଡିଭିଜନ୍' : 'Northern Division';
    if (k === 'southern') return orMode ? 'ଦକ୍ଷିଣାଞ୍ଚଳ ଡିଭିଜନ୍' : 'Southern Division';
    return divKey;
  }

  function monogramFor(name) {
    var clean = String(name || 'OD').replace(/[^A-Za-z]/g, '').toUpperCase();
    return clean.slice(0, 2) || 'OD';
  }

  function updateLiveStrip() {
    var strip = document.getElementById('cso-od-dist-live-strip');
    var root = document.getElementById(HUB_ID);
    var orMode = isOdia();
    var tagged = state.districtStats.totalDistrictTagged || 0;
    var totalLive = state.districtStats.totalLive || 0;

    if (strip) {
      var txtEl = strip.querySelector('.cso-od-live-strip__text');
      if (txtEl) {
        txtEl.textContent = orMode
          ? ('📍 ଓଡ଼ିଶାର ୩୦ ଜିଲ୍ଲା ଓ ୩୧୪ ବ୍ଲକ୍ ରେ ' + tagged + ' ଟି ଜିଲ୍ଲା-ସ୍ତରୀୟ ବିଜ୍ଞପ୍ତି (ମୋଟ ' + totalLive + ' ଟି ଲାଇଭ୍ ଅପଡେଟ୍)')
          : ('📍 ' + tagged + ' district-tagged notices live across Odisha\'s 30 districts & 314 blocks (' + totalLive + ' total live alerts)');
      }
    }
    if (root) {
      var liveKpi = root.querySelector('[data-od-kpi="live-jobs"]');
      if (liveKpi) liveKpi.textContent = String(totalLive || tagged || 0);
    }
  }

  function updateSummary(summary) {
    var root = document.getElementById(HUB_ID);
    if (!root || !summary) return;
    var map = {
      districts: Number(summary.districts_covered || 30),
      capsules: Number(summary.gk_capsules || 4),
      gi: Number(summary.gi_and_culture_highlights || 16),
      updates: Number(summary.live_state_updates || 4)
    };
    Object.keys(map).forEach(function (k) {
      var node = root.querySelector('[data-od-kpi="' + k + '"]');
      if (node) node.textContent = map[k].toLocaleString('en-IN');
    });
  }

  /* ========================================================================
   * ACCESSIBLE ARIA 314-BLOCK & COLLECTORATE DRAWER (Item 2)
   * ======================================================================== */
  function ensureBlockDrawer() {
    if (blockDrawerRefs) return blockDrawerRefs;
    var backdrop = el('div', 'cso-od-drawer-backdrop');
    backdrop.id = 'cso-od-blocks-drawer-backdrop';
    backdrop.hidden = true;

    var dialog = el('aside', 'cso-od-drawer');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'cso-od-drawer-title');

    var head = el('div', 'cso-od-drawer__head');
    var headCopy = el('div', 'cso-od-drawer__copy');
    var badges = el('div', 'cso-od-drawer__badges');
    var title = el('h2', 'cso-od-drawer__title', '');
    title.id = 'cso-od-drawer-title';
    headCopy.append(badges, title);

    var closeBtn = el('button', 'cso-od-drawer__close', '×');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close district blocks drawer');
    closeBtn.addEventListener('click', closeBlockDrawer);
    head.append(headCopy, closeBtn);

    var body = el('div', 'cso-od-drawer__body');
    var foot = el('div', 'cso-od-drawer__foot');
    dialog.append(head, body, foot);
    backdrop.appendChild(dialog);

    backdrop.addEventListener('click', function (ev) {
      if (ev.target === backdrop) closeBlockDrawer();
    });
    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && !backdrop.hidden) closeBlockDrawer();
    });
    document.body.appendChild(backdrop);

    blockDrawerRefs = {
      backdrop: backdrop,
      badges: badges,
      title: title,
      closeBtn: closeBtn,
      body: body,
      foot: foot
    };
    return blockDrawerRefs;
  }

  function closeBlockDrawer() {
    if (blockDrawerRefs) blockDrawerRefs.backdrop.hidden = true;
    document.body.classList.remove('cso-modal-open');
    if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
      try { lastFocusedEl.focus(); } catch (_) {}
    }
    lastFocusedEl = null;
  }

  function openBlockDrawer(d, st) {
    lastFocusedEl = document.activeElement;
    var refs = ensureBlockDrawer();
    var orMode = isOdia();
    document.body.classList.add('cso-modal-open');

    refs.badges.replaceChildren(
      el('span', 'cso-od-div-badge cso-od-div--' + d.division, divisionLabel(d.division, orMode)),
      el('span', 'cso-od-hq-badge', 'PIN ' + d.pin + ' · ' + d.rto),
      el('span', 'cso-od-hq-badge', d.blocks.length + (orMode ? ' ବ୍ଲକ୍' : ' Blocks'))
    );
    refs.title.textContent = (orMode ? d.name_or + ' (' + d.name_en + ')' : d.name_en + ' · ' + d.name_or);

    refs.body.replaceChildren();

    var infoGrid = el('div', 'cso-od-drawer__meta');
    [
      { k: orMode ? 'ଜିଲ୍ଲା ମୁଖ୍ୟାଳୟ' : 'District HQ', v: orMode ? d.hq_or : d.hq_en },
      { k: orMode ? 'ଜିଲ୍ଲାପାଳ କାର୍ଯ୍ୟାଳୟ' : 'Collectorate', v: d.collectorate || d.hq_en },
      { k: (orMode ? 'ଉପଖଣ୍ଡ (' : 'Sub-Divisions (') + d.subDivisions.length + ')', v: d.subDivisions.join(' · ') || d.hq_en },
      { k: orMode ? 'e-District ଓ ତହସିଲ୍' : 'e-District & Tehsil', v: d.edistrict },
      { k: orMode ? 'ପ୍ରମୁଖ ପରୀକ୍ଷା କେନ୍ଦ୍ର' : 'Exam Centers (CBT/OMR)', v: d.examCenters.join(' · ') || d.hq_en }
    ].forEach(function (row) {
      var box = el('div', 'cso-od-drawer__box');
      box.append(el('span', 'cso-od-drawer__key', row.k), el('span', 'cso-od-drawer__val', row.v));
      infoGrid.appendChild(box);
    });
    refs.body.appendChild(infoGrid);

    var blkSec = el('section', 'cso-od-drawer__blocks');
    blkSec.appendChild(el('h3', 'cso-od-drawer__sec-title',
      (orMode ? '🏛️ ପଞ୍ଚାୟତ ସମିତି ବ୍ଲକ୍ ତାଲିକା (' : '🏛️ All Panchayat Samiti Blocks (') + d.blocks.length + ')'
    ));
    var blkWrap = el('div', 'cso-od-drawer__pills');
    d.blocks.forEach(function (bName) {
      blkWrap.appendChild(el('span', 'cso-od-block-chip', bName));
    });
    blkSec.appendChild(blkWrap);
    refs.body.appendChild(blkSec);

    refs.foot.replaceChildren();
    var leftActs = el('div', 'cso-od-drawer__foot-links');

    var jobsA = el('a', 'cso-od-btn cso-od-btn--primary', orMode ? '💼 ଜିଲ୍ଲା ଚାକିରି →' : '💼 Live District Jobs →');
    jobsA.href = st.jobs_url;

    var updA = el('a', 'cso-od-btn cso-od-btn--outline', orMode ? '📰 ସମସ୍ତ ଅପଡେଟ୍' : '📰 All Updates');
    updA.href = st.updates_url;

    var travelBtn = el('button', 'cso-od-btn cso-od-btn--outline', orMode ? '🚆 ପରୀକ୍ଷା ଯାତାୟାତ' : '🚆 Exam Travel');
    travelBtn.type = 'button';
    travelBtn.addEventListener('click', function () {
      closeBlockDrawer();
      jumpToExamTravel(d.slug);
    });

    var govA = el('a', 'cso-od-btn cso-od-btn--gov', orMode ? '✓ ଅଫିସିଆଲ୍ ପୋର୍ଟାଲ୍ ↗' : '✓ Official Portal ↗');
    govA.href = d.portal;
    govA.target = '_blank';
    govA.rel = 'noopener noreferrer';

    leftActs.append(jobsA, updA, travelBtn, govA);
    var closeAct = el('button', 'cso-od-btn cso-od-btn--outline', orMode ? 'ବନ୍ଦ କରନ୍ତୁ' : 'Close');
    closeAct.type = 'button';
    closeAct.addEventListener('click', closeBlockDrawer);
    refs.foot.append(leftActs, closeAct);

    refs.backdrop.hidden = false;
    try { refs.closeBtn.focus(); } catch (_) {}
  }

  function jumpToExamTravel(districtSlug) {
    if (typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('cso:odisha-open-tab', {
        detail: { tab: 'travel', district: districtSlug, scroll: true }
      }));
    } else if (window.CSOOdishaSpecialWorkspaceTabs && typeof window.CSOOdishaSpecialWorkspaceTabs.preselectDistrictInTravelPlanner === 'function') {
      window.CSOOdishaSpecialWorkspaceTabs.preselectDistrictInTravelPlanner(districtSlug);
    }
  }

  function getDistrictStats(slug) {
    return (state.districtStats && state.districtStats.bySlug && state.districtStats.bySlug[slug]) || {
      active_jobs: 0,
      total_updates: 0,
      jobs_url: '/jobs/?district=' + encodeURIComponent(slug),
      updates_url: '/updates/?district=' + encodeURIComponent(slug)
    };
  }

  function renderDistricts() {
    var grid = document.getElementById('cso-od-districts-grid');
    var countEl = document.getElementById('cso-od-dist-count');
    if (!grid) return;
    var orMode = isOdia();
    var div = state.filters.division;
    var q = state.filters.distQ.toLowerCase();
    var activeOnly = state.filters.activeJobsOnly;
    var allRecords = getUnifiedDistrictRecords();

    var filtered = allRecords.filter(function (d) {
      if (div !== 'all' && d.division !== div) return false;
      var st = getDistrictStats(d.slug);
      if (activeOnly && !(st.active_jobs > 0 || st.total_updates > 0)) return false;
      if (q) {
        var hay = [
          d.name_en, d.name_or, d.hq_en, d.hq_or, d.division,
          d.pin, d.rto, d.famous_for_en, d.famous_for_or,
          d.subDivisions.join(' '), d.blocks.join(' '), d.examCenters.join(' ')
        ].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    var blockSum = filtered.reduce(function (acc, d) { return acc + (d.blocks ? d.blocks.length : 0); }, 0);
    if (countEl) {
      countEl.textContent = orMode
        ? ('ଦେଖାଯାଉଛି ' + filtered.length + ' / ' + allRecords.length + ' ଜିଲ୍ଲା (' + blockSum + ' ପଞ୍ଚାୟତ ସମିତି ବ୍ଲକ୍)')
        : ('Showing ' + filtered.length + ' of ' + allRecords.length + ' Odisha districts (' + blockSum + ' Panchayat Samiti blocks)');
    }

    if (!filtered.length) {
      var empty = el('div', 'cso-od-empty');
      empty.appendChild(el('p', '', orMode
        ? 'ଏହି ଫିଲ୍ଟର୍ ପାଇଁ କୌଣସି ଜିଲ୍ଲା ମିଳିଲା ନାହିଁ। ଦୟାକରି ଫିଲ୍ଟର୍ ପରିବର୍ତ୍ତନ କରନ୍ତୁ।'
        : 'No Odisha districts match this filter. Try turning off Active Jobs Only or clearing search.'));
      grid.classList.remove('is-table-view');
      grid.replaceChildren(empty);
      return;
    }

    // Compact Directory Table View
    if (state.filters.viewMode === 'table') {
      grid.classList.add('is-table-view');
      var wrap = el('div', 'cso-od-table-wrap');
      var table = el('table', 'cso-od-dir-table');
      table.setAttribute('aria-label', 'Odisha 30-District Compact Directory');

      var thead = document.createElement('thead');
      var hr = document.createElement('tr');
      [
        orMode ? 'ଜିଲ୍ଲା' : 'District',
        orMode ? 'ଡିଭିଜନ୍ ଓ ମୁଖ୍ୟାଳୟ' : 'Division & HQ',
        orMode ? 'ବ୍ଲକ୍ · PIN · RTO' : 'Blocks · PIN · RTO',
        orMode ? 'ଲାଇଭ୍ ବିଜ୍ଞପ୍ତି' : 'Live Openings',
        orMode ? 'ଦ୍ରୁତ କାର୍ଯ୍ୟ' : 'Quick Actions'
      ].forEach(function (label) {
        var th = el('th', '', label);
        th.setAttribute('scope', 'col');
        hr.appendChild(th);
      });
      thead.appendChild(hr);
      table.appendChild(thead);

      var tbody = document.createElement('tbody');
      filtered.forEach(function (d) {
        var st = getDistrictStats(d.slug);
        var tr = document.createElement('tr');

        var tdName = el('td', 'cso-od-td-name');
        tdName.append(
          el('strong', '', orMode ? d.name_or : d.name_en),
          el('span', 'cso-od-td-sub', orMode ? d.name_en : d.name_or)
        );

        var tdDiv = el('td', '');
        tdDiv.append(
          el('span', 'cso-od-div-badge cso-od-div--' + d.division, divisionLabel(d.division, orMode)),
          el('div', 'cso-od-td-sub', (orMode ? 'ମୁଖ୍ୟାଳୟ: ' : 'HQ: ') + (orMode ? d.hq_or : d.hq_en))
        );

        var tdMeta = el('td', '', d.blocks.length + (orMode ? ' ବ୍ଲକ୍' : ' Blocks') + ' · PIN ' + d.pin + ' · ' + d.rto);

        var tdLive = el('td', '');
        if (st.active_jobs > 0) {
          tdLive.appendChild(el('span', 'cso-od-live-badge is-jobs', '🟢 ' + st.active_jobs + (orMode ? ' ଚାକିରି' : ' Jobs')));
        } else if (st.total_updates > 0) {
          tdLive.appendChild(el('span', 'cso-od-live-badge is-updates', '📋 ' + st.total_updates + (orMode ? ' ଅପଡେଟ୍' : ' Updates')));
        } else {
          tdLive.appendChild(el('span', 'cso-od-live-badge is-statewide', orMode ? '🌐 ରାଜ୍ୟ-ସ୍ତରୀୟ' : '🌐 Statewide'));
        }

        var tdAct = el('td', 'cso-od-td-acts');
        var actWrap = el('div', 'cso-od-table-acts');
        var jA = el('a', 'cso-od-btn cso-od-btn--primary cso-od-btn--sm', orMode ? 'ଚାକିରି' : 'Live Jobs');
        jA.href = st.jobs_url;
        var bBtn = el('button', 'cso-od-btn cso-od-btn--outline cso-od-btn--sm', d.blocks.length + (orMode ? ' ବ୍ଲକ୍' : ' Blocks'));
        bBtn.type = 'button';
        bBtn.addEventListener('click', function () { openBlockDrawer(d, st); });
        var tBtn = el('button', 'cso-od-btn cso-od-btn--outline cso-od-btn--sm', orMode ? 'ଯାତାୟାତ' : 'Exam Travel');
        tBtn.type = 'button';
        tBtn.addEventListener('click', function () { jumpToExamTravel(d.slug); });
        actWrap.append(jA, bBtn, tBtn);
        tdAct.appendChild(actWrap);

        tr.append(tdName, tdDiv, tdMeta, tdLive, tdAct);
        tbody.appendChild(tr);
      });

      table.appendChild(tbody);
      wrap.appendChild(table);
      grid.replaceChildren(wrap);
      return;
    }

    // Unified 30-District Card Grid View
    grid.classList.remove('is-table-view');
    var frag = document.createDocumentFragment();
    filtered.forEach(function (d) {
      var st = getDistrictStats(d.slug);
      var card = el('article', 'cso-od-dist-card cso-od-dist-card--v457 cso-od-div--' + d.division);
      card.setAttribute('data-od-district', d.slug);

      var accent = el('div', 'cso-od-dist-accent');
      accent.setAttribute('aria-hidden', 'true');
      card.appendChild(accent);

      // Header Row: Monogram + Title + Live Badge
      var head = el('div', 'cso-od-dist-head');
      var mono = el('span', 'cso-od-dist-monogram', monogramFor(d.name_en));
      mono.setAttribute('aria-hidden', 'true');

      var titleWrap = el('div', 'cso-od-dist-title-wrap');
      titleWrap.appendChild(el('h3', 'cso-od-dist-card__title', orMode ? d.name_or : d.name_en));
      var altEl = el('p', 'cso-od-dist-card__alt', orMode ? d.name_en : d.name_or);
      if (!orMode) altEl.setAttribute('lang', 'or');
      titleWrap.appendChild(altEl);

      var livePill;
      if (st.active_jobs > 0) {
        livePill = el('span', 'cso-od-live-badge is-jobs', '🟢 ' + st.active_jobs + (orMode ? ' ଚାକିରି' : (st.active_jobs === 1 ? ' Job' : ' Jobs')));
      } else if (st.total_updates > 0) {
        livePill = el('span', 'cso-od-live-badge is-updates', '📋 ' + st.total_updates + (orMode ? ' ଅପଡେଟ୍' : ' Alerts'));
      } else {
        livePill = el('span', 'cso-od-live-badge is-statewide', orMode ? '🌐 ରାଜ୍ୟ-ସ୍ତରୀୟ' : '🌐 Statewide');
      }
      head.append(mono, titleWrap, livePill);
      card.appendChild(head);

      // Metadata Badges: Division, HQ, Blocks + PIN/RTO
      var metaRow = el('div', 'cso-od-dist-meta-pills');
      metaRow.append(
        el('span', 'cso-od-div-badge cso-od-div--' + d.division, divisionLabel(d.division, orMode)),
        el('span', 'cso-od-hq-badge', (orMode ? 'ମୁଖ୍ୟାଳୟ: ' : 'HQ: ') + (orMode ? d.hq_or : d.hq_en)),
        el('span', 'cso-od-hq-badge', d.blocks.length + (orMode ? ' ବ୍ଲକ୍' : ' Blocks') + ' · ' + d.pin + ' · ' + d.rto)
      );
      card.appendChild(metaRow);

      // 2-line Famous / Highlights Summary
      card.appendChild(el('p', 'cso-od-dist-card__famous', orMode ? d.famous_for_or : d.famous_for_en));

      // Single-Row Pinned Action Footer: Live Jobs | N Blocks | Exam Travel
      var acts = el('div', 'cso-od-dist-card__actions cso-od-dist-card__actions--v457');

      var jobsLink = el('a', 'cso-od-btn cso-od-btn--primary', orMode ? '💼 ଚାକିରି' : '💼 Live Jobs');
      jobsLink.setAttribute('href', st.jobs_url);
      acts.appendChild(jobsLink);

      var blocksBtn = el('button', 'cso-od-btn cso-od-btn--outline', (orMode ? '🏛️ ' + d.blocks.length + ' ବ୍ଲକ୍' : '🏛️ ' + d.blocks.length + ' Blocks'));
      blocksBtn.type = 'button';
      blocksBtn.setAttribute('data-od-open-blocks', d.slug);
      blocksBtn.addEventListener('click', function () {
        openBlockDrawer(d, st);
      });
      acts.appendChild(blocksBtn);

      var travelBtn = el('button', 'cso-od-btn cso-od-btn--outline', orMode ? '🚆 ଯାତାୟାତ' : '🚆 Exam Travel');
      travelBtn.type = 'button';
      travelBtn.setAttribute('data-od-jump-travel', d.slug);
      travelBtn.addEventListener('click', function () {
        jumpToExamTravel(d.slug);
      });
      acts.appendChild(travelBtn);

      card.appendChild(acts);
      frag.appendChild(card);
    });
    grid.replaceChildren(frag);
  }

  function renderItems() {
    var grid = document.getElementById('cso-od-items-grid');
    if (!grid) return;
    var orMode = isOdia();
    var tab = state.filters.tab;
    var q = state.filters.itemQ.toLowerCase();

    var filtered = state.items.filter(function (it) {
      if (tab !== 'all' && it.tab_key !== tab) return false;
      if (q) {
        var hay = [it.title_en, it.title_or, it.summary_en, it.summary_or, it.category_label].join(' ').toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    if (!filtered.length) {
      var empty = el('div', 'cso-od-empty');
      empty.appendChild(el('p', '', orMode ? 'ଏହି ବର୍ଗରେ କୌଣସି ସୂଚନା ମିଳିଲା ନାହିଁ।' : 'No Odisha GK capsules matched your filter.'));
      grid.replaceChildren(empty);
      return;
    }

    var frag = document.createDocumentFragment();
    filtered.forEach(function (it) {
      var card = el('article', 'cso-od-card');
      card.appendChild(el('span', 'cso-od-cat-badge', it.category_label || 'Odisha Special'));

      var primary = (orMode && it.title_or) ? it.title_or : it.title_en;
      var secondary = (orMode && it.title_or) ? it.title_en : (it.title_or || '');
      var h3 = el('h3', 'cso-od-card__title');
      var a = el('a', 'cso-od-card__link', primary);
      a.setAttribute('href', it.detail_url || '/guides/?category=odisha-gk');
      h3.appendChild(a);
      card.appendChild(h3);

      if (secondary) card.appendChild(el('p', 'cso-od-card__bi', secondary));
      var desc = (orMode && it.summary_or) ? it.summary_or : it.summary_en;
      if (desc) card.appendChild(el('p', 'cso-od-card__desc', desc));

      var acts = el('div', 'cso-od-card__actions');
      var shareUrl = (window.location.origin || 'https://csodisha.com') + (it.detail_url || '/odisha-special/');
      var waText = it.title_en + ' — Odisha Special GK on CSOdisha: ' + shareUrl;
      var wa = el('a', 'cso-od-btn cso-od-btn--wa', 'WhatsApp');
      wa.setAttribute('href', 'https://wa.me/?text=' + encodeURIComponent(waText));
      wa.setAttribute('target', '_blank');
      wa.setAttribute('rel', 'noopener noreferrer');
      wa.setAttribute('aria-label', 'Share on WhatsApp: ' + it.title_en);
      acts.appendChild(wa);

      var open = el('a', 'cso-od-btn cso-od-btn--primary', orMode ? 'ସମ୍ପୂର୍ଣ୍ଣ ପଢ଼ନ୍ତୁ →' : 'Read Capsule →');
      open.setAttribute('href', it.detail_url || '/guides/?category=odisha-gk');
      acts.appendChild(open);
      card.appendChild(acts);

      frag.appendChild(card);
    });
    grid.replaceChildren(frag);
  }

  function renderQuiz() {
    var root = document.getElementById('cso-od-quiz-root');
    if (!root) return;
    var orMode = isOdia();
    var total = state.quiz.length;
    var answered = 0;
    var score = 0;

    state.quiz.forEach(function (q) {
      if (Object.prototype.hasOwnProperty.call(state.answers, q.id)) {
        answered += 1;
        if (state.answers[q.id] === q.correct_index) score += 1;
      }
    });

    var scoreEl = document.getElementById('cso-od-quiz-score');
    if (scoreEl) {
      scoreEl.textContent = orMode
        ? ('ସ୍କୋର୍: ' + score + ' / ' + total + ' (' + answered + ' ଉତ୍ତର ଦିଆଯାଇଛି)')
        : ('Score: ' + score + ' / ' + total + ' (' + answered + ' answered)');
    }

    var frag = document.createDocumentFragment();
    state.quiz.forEach(function (q, idx) {
      var box = el('article', 'cso-od-q-card');
      var head = el('div', 'cso-od-q-head');
      head.appendChild(el('span', 'cso-od-q-num', 'Q' + (idx + 1)));
      head.appendChild(el('span', 'cso-od-div-badge', q.exam_tag));
      box.appendChild(head);

      box.appendChild(el('p', 'cso-od-q-text', (orMode && q.question_or) ? q.question_or : q.question_en));

      var optsWrap = el('div', 'cso-od-q-opts');
      var chosen = Object.prototype.hasOwnProperty.call(state.answers, q.id) ? state.answers[q.id] : -1;
      var opts = (orMode && Array.isArray(q.options_or)) ? q.options_or : q.options_en;

      opts.forEach(function (txt, oi) {
        var cls = 'cso-od-q-opt';
        if (chosen !== -1) {
          if (oi === q.correct_index) cls += ' is-correct';
          else if (oi === chosen) cls += ' is-wrong';
        }
        var btn = el('button', cls, String.fromCharCode(65 + oi) + '. ' + txt);
        btn.type = 'button';
        btn.setAttribute('data-qid', q.id);
        btn.setAttribute('data-opt', String(oi));
        if (chosen !== -1) btn.disabled = true;
        optsWrap.appendChild(btn);
      });
      box.appendChild(optsWrap);

      if (chosen !== -1) {
        var right = chosen === q.correct_index;
        var fb = el('div', 'cso-od-q-feedback ' + (right ? 'is-correct' : 'is-wrong'));
        fb.textContent = (right ? (orMode ? '✓ ଠିକ୍ ଉତ୍ତର! ' : '✓ Correct! ') : (orMode ? '✕ ଭୁଲ୍ ଉତ୍ତର। ' : '✕ Not quite. ')) + ((orMode && q.explanation_or) ? q.explanation_or : q.explanation_en);
        box.appendChild(fb);
      }
      frag.appendChild(box);
    });
    root.replaceChildren(frag);
  }

  function localizeStaticCopy() {
    var root = document.getElementById(HUB_ID);
    if (!root) return;
    var orMode = isOdia();
    root.querySelectorAll('[data-en]').forEach(function (n) {
      var txt = orMode ? n.getAttribute('data-or') : n.getAttribute('data-en');
      if (txt) n.textContent = txt;
    });
  }

  function syncControls() {
    var root = document.getElementById(HUB_ID);
    if (!root) return;
    root.querySelectorAll('.cso-od-div-pill').forEach(function (p) {
      var on = (p.getAttribute('data-division') || 'all') === state.filters.division;
      p.classList.toggle('is-active', on);
      p.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    root.querySelectorAll('.cso-od-tab').forEach(function (t) {
      var on = (t.getAttribute('data-tab') || 'all') === state.filters.tab;
      t.classList.toggle('is-active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    var activeToggle = document.getElementById('cso-od-active-jobs-toggle');
    if (activeToggle) {
      activeToggle.classList.toggle('is-active', state.filters.activeJobsOnly);
      activeToggle.setAttribute('aria-pressed', state.filters.activeJobsOnly ? 'true' : 'false');
    }
    root.querySelectorAll('[data-od-view-mode]').forEach(function (b) {
      var on = b.getAttribute('data-od-view-mode') === state.filters.viewMode;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function bindEvents() {
    var root = document.getElementById(HUB_ID);
    if (!root || root.getAttribute('data-bound') === '1') return;
    root.setAttribute('data-bound', '1');

    var distInput = document.getElementById('cso-od-dist-search');
    var t1 = null;
    if (distInput) {
      distInput.addEventListener('input', function () {
        clearTimeout(t1);
        t1 = setTimeout(function () {
          state.filters.distQ = (distInput.value || '').trim();
          renderDistricts();
        }, 120);
      });
    }

    var itemInput = document.getElementById('cso-od-item-search');
    var t2 = null;
    if (itemInput) {
      itemInput.addEventListener('input', function () {
        clearTimeout(t2);
        t2 = setTimeout(function () {
          state.filters.itemQ = (itemInput.value || '').trim();
          renderItems();
        }, 120);
      });
    }

    var resetQuizBtn = document.getElementById('cso-od-quiz-reset');
    if (resetQuizBtn) {
      resetQuizBtn.addEventListener('click', function () { state.answers = {}; renderQuiz(); });
    }

    root.addEventListener('click', function (ev) {
      var t = ev.target && ev.target.closest ? ev.target : null;
      if (!t) return;
      var divBtn = t.closest('.cso-od-div-pill');
      if (divBtn) {
        state.filters.division = divBtn.getAttribute('data-division') || 'all';
        syncControls();
        renderDistricts();
        return;
      }
      var activeBtn = t.closest('#cso-od-active-jobs-toggle');
      if (activeBtn) {
        state.filters.activeJobsOnly = !state.filters.activeJobsOnly;
        syncControls();
        renderDistricts();
        return;
      }
      var viewBtn = t.closest('[data-od-view-mode]');
      if (viewBtn) {
        state.filters.viewMode = viewBtn.getAttribute('data-od-view-mode') === 'table' ? 'table' : 'cards';
        syncControls();
        renderDistricts();
        return;
      }
      var tabBtn = t.closest('.cso-od-tab');
      if (tabBtn) {
        state.filters.tab = tabBtn.getAttribute('data-tab') || 'all';
        syncControls();
        renderItems();
        return;
      }
      var optBtn = t.closest('.cso-od-q-opt');
      if (optBtn && !optBtn.disabled) {
        var qid = optBtn.getAttribute('data-qid');
        var oi = Number(optBtn.getAttribute('data-opt'));
        if (qid && isFinite(oi)) {
          state.answers[qid] = oi;
          renderQuiz();
        }
      }
    });

    window.addEventListener('cso:lang-change', function (ev) {
      var l = ev && ev.detail && ev.detail.lang;
      if (l === 'or' || l === 'en') {
        state.lang = l;
        localizeStaticCopy();
        updateLiveStrip();
        renderDistricts();
        renderItems();
        renderQuiz();
      }
    });
  }

  function init() {
    var root = document.getElementById(HUB_ID);
    if (!root) return;
    bindEvents();
    syncControls();
    localizeStaticCopy();

    // Instant zero-blank render of all 30 districts from CSOOdishaAdminDirectory
    renderDistricts();

    Promise.all([
      fetch('/api/public/odisha-hub', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; }),
      fetch('/api/public/search-index', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; })
    ]).then(function (results) {
      var data = results[0];
      var searchData = results[1];
      if (data && data.ok) {
        state.districts = Array.isArray(data.districts) ? data.districts : [];
        state.items = Array.isArray(data.items) ? data.items : [];
        state.quiz = Array.isArray(data.odisha_quiz) ? data.odisha_quiz : [];
        updateSummary(data.summary);
      }
      if (searchData && Array.isArray(searchData.items)) {
        state.districtStats = computeDistrictLiveStats(searchData.items, window.CSODistrictFilter);
      }
      updateLiveStrip();
      renderDistricts();
      renderItems();
      renderQuiz();
    });
  }

  var hubApi = {
    version: 'v401',
    unifiedVersion: 'v457',
    RTO_CODES: RTO_CODES,
    init: init,
    getUnifiedDistrictRecords: getUnifiedDistrictRecords,
    computeDistrictLiveStats: computeDistrictLiveStats,
    resolveCanonicalDistrictSlug: resolveCanonicalDistrictSlug
  };
  window.CSOOdishaSpecialHub = hubApi;
  window.CSOOdishaHub = hubApi;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
