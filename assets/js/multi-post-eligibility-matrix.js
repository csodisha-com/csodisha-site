/**
 * Common Sense Odisha — Interactive Odisha Govt Recruitment Fee & Age Relaxation
 * Multi-Post Eligibility Matrix (/jobs/ & /tools/, v434)
 * Evaluates exact Age-on-Cutoff (Y/M/D), Odisha GA&PG Dept & Central upper-age relaxations,
 * qualification fit, and State/Central application fee exemptions across active notices.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations;
 * bilingual EN / ଓଡ଼ିଆ; 4-theme var(--cso-*) semantic tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOMultiPostEligibilityMatrix = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOMultiPostEligibilityMatrix = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v434';
  var ROOT_ID = 'cso-multi-post-eligibility-root';
  var PREFS_KEY = 'cso_multi_post_profile_v1';

  var QUAL_LEVELS = [
    { id: '10th', rank: 1, en: '10th Pass (HSC)', or: '୧୦ମ ପାସ୍ (HSC)' },
    { id: 'plus-2', rank: 2, en: '12th / +2 Pass', or: '+୨ ପାସ୍' },
    { id: 'iti-diploma', rank: 3, en: 'ITI / Polytechnic Diploma', or: 'ITI / ପଲିଟେକ୍ନିକ୍ ଡିପ୍ଲୋମା' },
    { id: 'graduate', rank: 4, en: 'Graduate (+3 / B.Tech / Any Degree)', or: 'ସ୍ନାତକ (+୩ / B.Tech / ଡିଗ୍ରୀ)' },
    { id: 'bed-deled', rank: 5, en: 'B.Ed. / D.El.Ed. / ITEP', or: 'B.Ed. / D.El.Ed. / ITEP' },
    { id: 'pg', rank: 6, en: 'Post-Graduate (PG / M.Sc / M.A)', or: 'ସ୍ନାତକୋତ୍ତର (PG)' }
  ];

  var DEFAULT_NOTICES = [
    {
      id: 'opsc-oas-2026',
      board: 'OPSC',
      isState: true,
      titleEn: 'OPSC Odisha Civil Services (OAS / OFS / OPS)',
      titleOr: 'OPSC ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସେସ୍ (OAS / OFS / OPS)',
      cutoffDate: '2026-01-01',
      minAge: 21,
      maxAge: 38,
      minQualRank: 4,
      minQualLabel: 'Graduate',
      feeGeneral: 0,
      url: '/jobs/'
    },
    {
      id: 'ossc-cglre-2026',
      board: 'OSSC',
      isState: true,
      titleEn: 'OSSC Combined Graduate Level (CGLRE)',
      titleOr: 'OSSC ସମ୍ମିଳିତ ସ୍ନାତକ ସ୍ତରୀୟ (CGLRE)',
      cutoffDate: '2026-01-01',
      minAge: 21,
      maxAge: 38,
      minQualRank: 4,
      minQualLabel: 'Graduate',
      feeGeneral: 0,
      url: '/jobs/'
    },
    {
      id: 'osssc-district-2026',
      board: 'OSSSC',
      isState: true,
      titleEn: 'OSSSC Combined District Cadre (RI / ARI / Amin / SFS)',
      titleOr: 'OSSSC ଜିଲ୍ଲା କ୍ୟାଡର୍ (RI / ARI / ଅମିନ / SFS)',
      cutoffDate: '2026-01-01',
      minAge: 20,
      maxAge: 38,
      minQualRank: 2,
      minQualLabel: '12th / +2 or Graduate',
      feeGeneral: 0,
      url: '/jobs/'
    },
    {
      id: 'oprb-police-si-2026',
      board: 'OPRB',
      isState: true,
      titleEn: 'Odisha Police Sub-Inspector (OPRB SI — CPSE)',
      titleOr: 'ଓଡ଼ିଶା ପୋଲିସ୍ ସବ୍-ଇନ୍ସପେକ୍ଟର (OPRB SI)',
      cutoffDate: '2026-01-01',
      minAge: 21,
      maxAge: 25,
      minQualRank: 4,
      minQualLabel: 'Graduate',
      feeGeneral: 0,
      url: '/jobs/'
    },
    {
      id: 'osssc-forest-2026',
      board: 'OSSSC',
      isState: true,
      titleEn: 'OSSSC Forest Guard / Forester / Livestock Inspector',
      titleOr: 'OSSSC ଫରେଷ୍ଟ ଗାର୍ଡ / ଫରେଷ୍ଟର / ପ୍ରାଣୀଧନ ନିରୀକ୍ଷକ',
      cutoffDate: '2026-01-01',
      minAge: 18,
      maxAge: 38,
      minQualRank: 1,
      minQualLabel: '10th / +2 Pass',
      feeGeneral: 0,
      url: '/jobs/'
    },
    {
      id: 'oavs-ltr-teacher-2026',
      board: 'OSSC / OAVS',
      isState: true,
      titleEn: 'Odisha Secondary Teacher (LTR / SSD / OAV TGT-PGT)',
      titleOr: 'ଓଡ଼ିଶା ମାଧ୍ୟମିକ ଶିକ୍ଷକ (LTR / SSD / OAV TGT-PGT)',
      cutoffDate: '2026-01-01',
      minAge: 21,
      maxAge: 38,
      minQualRank: 5,
      minQualLabel: 'Graduate + B.Ed.',
      feeGeneral: 0,
      url: '/exams/#cso-teacher-eligibility-root'
    },
    {
      id: 'ssc-cgl-2026',
      board: 'SSC (Central)',
      isState: false,
      titleEn: 'Central SSC Combined Graduate Level (CGL)',
      titleOr: 'କେନ୍ଦ୍ରୀୟ SSC ସମ୍ମିଳିତ ସ୍ନାତକ ସ୍ତରୀୟ (CGL)',
      cutoffDate: '2026-08-01',
      minAge: 18,
      maxAge: 30,
      minQualRank: 4,
      minQualLabel: 'Graduate',
      feeGeneral: 100,
      url: '/jobs/'
    },
    {
      id: 'rrb-ntpc-2026',
      board: 'RRB (Central)',
      isState: false,
      titleEn: 'Railway RRB NTPC (Graduate & 12th Level)',
      titleOr: 'ରେଳବାଇ RRB NTPC (ସ୍ନାତକ ଓ +୨ ସ୍ତର)',
      cutoffDate: '2026-07-01',
      minAge: 18,
      maxAge: 33,
      minQualRank: 2,
      minQualLabel: '12th / +2 or Graduate',
      feeGeneral: 500,
      url: '/jobs/'
    }
  ];

  function getQualRank(qualId) {
    var q = String(qualId || 'graduate').toLowerCase();
    for (var i = 0; i < QUAL_LEVELS.length; i += 1) {
      if (QUAL_LEVELS[i].id === q) return QUAL_LEVELS[i].rank;
    }
    return 4;
  }

  function parseIsoDate(iso) {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return { y: parseInt(m[1], 10), m: parseInt(m[2], 10), d: parseInt(m[3], 10) };
  }

  function computeExactAge(dobIso, cutoffIso) {
    var dob = parseIsoDate(dobIso) || { y: 1999, m: 3, d: 4 };
    var cut = parseIsoDate(cutoffIso) || { y: 2026, m: 1, d: 1 };
    var years = cut.y - dob.y;
    var months = cut.m - dob.m;
    var days = cut.d - dob.d;
    if (days < 0) {
      months -= 1;
      var prevMonthDays = new Date(Date.UTC(cut.y, cut.m - 1, 0)).getUTCDate();
      days += prevMonthDays;
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    if (years < 0) {
      years = 0;
      months = 0;
      days = 0;
    }
    var decimalYears = years + (months / 12) + (days / 365.25);
    return {
      years: years,
      months: months,
      days: days,
      decimalYears: Number(decimalYears.toFixed(3)),
      label: years + 'y ' + months + 'm ' + days + 'd'
    };
  }

  function computeRelaxationYears(profile, isState) {
    var cat = String(profile.category || 'ur').toLowerCase();
    var gender = String(profile.gender || 'male').toLowerCase();
    var pwbd = Boolean(profile.pwbd);
    var exServiceman = Boolean(profile.exServiceman);
    var inService = Boolean(profile.inService);

    var catRelax = 0;
    if (isState) {
      if (cat === 'sc' || cat === 'st' || cat === 'sebc' || gender === 'female') catRelax = 5;
    } else {
      if (cat === 'sc' || cat === 'st') catRelax = 5;
      else if (cat === 'sebc') catRelax = 3;
    }

    var totalRelax = catRelax;
    if (pwbd) {
      totalRelax = 10 + catRelax;
    }
    if (exServiceman) {
      totalRelax = Math.max(totalRelax, isState ? 5 : 3);
    }
    if (inService) {
      totalRelax = Math.max(totalRelax, isState ? 7 : 5);
    }
    return totalRelax;
  }

  function computeFeeRule(profile, notice) {
    if (notice.isState || Number(notice.feeGeneral || 0) === 0) {
      return { feeAmount: 0, isFeeExempt: true, labelEn: '₹0 (Odisha State Fee Exempted)', labelOr: '₹0 (ଓଡ଼ିଶା ସରକାରୀ ଫି ଛାଡ଼)' };
    }
    var cat = String(profile.category || 'ur').toLowerCase();
    var gender = String(profile.gender || 'male').toLowerCase();
    var exemptCentral = (cat === 'sc' || cat === 'st' || gender === 'female' || Boolean(profile.pwbd) || Boolean(profile.exServiceman));
    if (exemptCentral) {
      return { feeAmount: 0, isFeeExempt: true, labelEn: '₹0 (Central Category/Women/PwBD Waiver)', labelOr: '₹0 (କେନ୍ଦ୍ରୀୟ ବର୍ଗ/ମହିଳା/ଭିନ୍ନକ୍ଷମ ଫି ଛାଡ଼)' };
    }
    var amt = Math.max(0, Math.round(Number(notice.feeGeneral || 0)));
    return { feeAmount: amt, isFeeExempt: amt === 0, labelEn: '₹' + amt + ' (General / UR / EWS)', labelOr: '₹' + amt + ' (ସାଧାରଣ / EWS)' };
  }

  function evaluateMultiPostEligibility(profile, notices) {
    var p = Object.assign({
      dob: '1999-03-04',
      gender: 'male',
      category: 'ur',
      qualification: 'graduate',
      pwbd: false,
      exServiceman: false,
      inService: false
    }, profile || {});

    var list = (Array.isArray(notices) && notices.length > 0) ? notices : DEFAULT_NOTICES;
    var candQualRank = getQualRank(p.qualification);

    var eligibleCount = 0;
    var ageBlockedCount = 0;
    var feeExemptCount = 0;

    var rows = list.map(function (notice) {
      var age = computeExactAge(p.dob, notice.cutoffDate || '2026-01-01');
      var relaxYears = computeRelaxationYears(p, Boolean(notice.isState));
      var effectiveMaxAge = notice.maxAge + relaxYears;

      var underAge = age.years < notice.minAge;
      var overAge = age.years > effectiveMaxAge || (age.years === effectiveMaxAge && (age.months > 0 || age.days > 0));
      var ageEligible = !underAge && !overAge;
      var qualEligible = candQualRank >= (notice.minQualRank || 1);
      var fee = computeFeeRule(p, notice);

      var status = 'eligible';
      if (underAge) status = 'under-age';
      else if (overAge) status = 'over-age';
      else if (!qualEligible) status = 'qual-mismatch';

      if (status === 'eligible') eligibleCount += 1;
      if (!ageEligible) ageBlockedCount += 1;
      if (fee.isFeeExempt) feeExemptCount += 1;

      return {
        notice: notice,
        ageOnCutoff: age,
        relaxYears: relaxYears,
        effectiveMaxAge: effectiveMaxAge,
        ageEligible: ageEligible,
        qualEligible: qualEligible,
        status: status,
        fee: fee
      };
    });

    return {
      profile: p,
      summary: {
        total: rows.length,
        eligibleCount: eligibleCount,
        ageBlockedCount: ageBlockedCount,
        feeExemptCount: feeExemptCount
      },
      rows: rows
    };
  }

  function loadPrefs() {
    try {
      var raw = win.localStorage && win.localStorage.getItem(PREFS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function savePrefs(state) {
    try {
      if (win.localStorage) win.localStorage.setItem(PREFS_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function copyText(str) {
    if (win.navigator && win.navigator.clipboard && typeof win.navigator.clipboard.writeText === 'function') {
      return win.navigator.clipboard.writeText(str);
    }
    return new Promise(function (resolve) {
      try {
        var ta = doc.createElement('textarea');
        ta.value = str;
        ta.className = 'cso-sr-only';
        doc.body.appendChild(ta);
        ta.select();
        doc.execCommand('copy');
        ta.remove();
      } catch (_) {}
      resolve();
    });
  }

  function mount(container) {
    if (!doc || !container) return null;
    var saved = loadPrefs() || {};
    var state = {
      lang: saved.lang === 'or' ? 'or' : 'en',
      dob: saved.dob || '1999-03-04',
      gender: saved.gender || 'male',
      category: saved.category || 'ur',
      qualification: saved.qualification || 'graduate',
      pwbd: Boolean(saved.pwbd),
      exServiceman: Boolean(saved.exServiceman),
      inService: Boolean(saved.inService),
      viewFilter: saved.viewFilter || 'all'
    };

    var activeNotices = DEFAULT_NOTICES.slice();

    // Hydrate any live D1 job notices from /api/public/search-index without blocking initial render
    if (typeof win.fetch === 'function') {
      win.fetch('/api/public/search-index').then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (data) {
        var items = data && Array.isArray(data.items) ? data.items : [];
        var existingIds = {};
        activeNotices.forEach(function (n) { existingIds[n.id] = true; });
        var added = 0;
        items.forEach(function (it) {
          if (added >= 4) return;
          if (it && it.type === 'job' && it.slug && !existingIds['d1-' + it.slug]) {
            existingIds['d1-' + it.slug] = true;
            activeNotices.push({
              id: 'd1-' + it.slug,
              board: it.org || 'Odisha Govt',
              isState: true,
              titleEn: it.title || it.slug,
              titleOr: it.title_or || it.title || it.slug,
              cutoffDate: '2026-01-01',
              minAge: 21,
              maxAge: 38,
              minQualRank: 4,
              minQualLabel: 'Graduate / Post-Specific',
              feeGeneral: 0,
              url: it.url || ('/jobs/?slug=' + encodeURIComponent(it.slug))
            });
            added += 1;
          }
        });
        if (added > 0) render();
      }).catch(function () {});
    }

    function persistAndRender() {
      savePrefs(state);
      render();
    }

    function render() {
      var orMode = state.lang === 'or';
      var evalRes = evaluateMultiPostEligibility(state, activeNotices);

      var card = el('div', 'cso-mpe-card');
      card.setAttribute('data-cso-multi-post-matrix', '1');

      // Header
      var head = el('div', 'cso-mpe-head');
      var headCopy = el('div', 'cso-mpe-head-copy');
      headCopy.appendChild(el('div', 'cso-mpe-eyebrow', orMode
        ? '🧮 ଏକାଧିକ ପଦବୀ ବୟସ ଛାଡ଼ ଓ ପରୀକ୍ଷା ଫି ଛାଡ଼ ମ୍ୟାଟ୍ରିକ୍ସ'
        : '🧮 MULTI-POST AGE RELAXATION & FEE EXEMPTION ELIGIBILITY MATRIX'));
      headCopy.appendChild(el('h2', 'cso-mpe-title', orMode
        ? 'ଓଡ଼ିଶା ଓ କେନ୍ଦ୍ରୀୟ ନିଯୁକ୍ତି ବୟସ ଓ ଫି ଯୋଗ୍ୟତା ଯାଞ୍ଚ (ଗୋଟିଏ କ୍ଲିକ୍)'
        : 'Check Age & Fee Eligibility Across All Active Odisha Recruitment Drives'));
      headCopy.appendChild(el('p', 'cso-mpe-sub', orMode
        ? 'ନିଜ ଜନ୍ମ ତାରିଖ, ବର୍ଗ, ଲିଙ୍ଗ ଓ ଯୋଗ୍ୟତା ଦିଅନ୍ତୁ — OPSC, OSSC, OSSSC, OPRB, OAVS, SSC ଓ RRB ପାଇଁ ସଠିକ୍ ବୟସ ଓ ₹0 ଫି ଛାଡ଼ ଯାଞ୍ଚ କରନ୍ତୁ।'
        : 'Enter your DOB, category, gender & qualification once to verify exact age-on-cutoff, GA&PG Dept relaxations & ₹0 fee exemptions across all active drives.'));
      head.appendChild(headCopy);

      var langToggle = el('div', 'cso-mpe-lang-toggle');
      langToggle.setAttribute('role', 'group');
      langToggle.setAttribute('aria-label', 'Language toggle');
      ['en', 'or'].forEach(function (lk) {
        var lb = el('button', 'cso-mpe-lang-btn' + (state.lang === lk ? ' is-active' : ''), lk === 'en' ? 'English' : 'ଓଡ଼ିଆ');
        lb.type = 'button';
        lb.setAttribute('aria-pressed', state.lang === lk ? 'true' : 'false');
        lb.addEventListener('click', function () { state.lang = lk; persistAndRender(); });
        langToggle.appendChild(lb);
      });
      head.appendChild(langToggle);
      card.appendChild(head);

      // Profile Form
      var form = el('div', 'cso-mpe-form');
      var grid = el('div', 'cso-mpe-grid');

      function addField(label, ctrl) {
        var box = el('div', 'cso-mpe-field');
        var lbl = el('label', 'cso-mpe-label', label);
        if (ctrl.id) lbl.setAttribute('for', ctrl.id);
        box.appendChild(lbl);
        box.appendChild(ctrl);
        grid.appendChild(box);
      }

      var dobInp = el('input', 'cso-mpe-input');
      dobInp.id = 'cso-mpe-dob';
      dobInp.type = 'date';
      dobInp.value = state.dob;
      dobInp.addEventListener('change', function () { state.dob = dobInp.value || '1999-03-04'; persistAndRender(); });
      addField(orMode ? 'ଜନ୍ମ ତାରିଖ (Date of Birth)' : 'Date of Birth (YYYY-MM-DD)', dobInp);

      var genSel = el('select', 'cso-mpe-input');
      genSel.id = 'cso-mpe-gender';
      [
        { id: 'male', en: 'Male', or: 'ପୁରୁଷ (Male)' },
        { id: 'female', en: 'Female (+5 yrs State / Fee Waiver)', or: 'ମହିଳା (+5 ବର୍ଷ ଛାଡ଼)' },
        { id: 'transgender', en: 'Transgender', or: 'ତୃତୀୟ ଲିଙ୍ଗ' }
      ].forEach(function (g) {
        var opt = el('option', '', orMode ? g.or : g.en);
        opt.value = g.id;
        if (g.id === state.gender) opt.selected = true;
        genSel.appendChild(opt);
      });
      genSel.addEventListener('change', function () { state.gender = genSel.value; persistAndRender(); });
      addField(orMode ? 'ଲିଙ୍ଗ (Gender)' : 'Gender', genSel);

      var catSel = el('select', 'cso-mpe-input');
      catSel.id = 'cso-mpe-cat';
      [
        { id: 'ur', en: 'UR / General', or: 'ସାଧାରଣ (UR)' },
        { id: 'ews', en: 'EWS (Economically Weaker)', or: 'EWS' },
        { id: 'sebc', en: 'SEBC / OBC', or: 'SEBC / OBC' },
        { id: 'sc', en: 'SC (Scheduled Caste)', or: 'SC (ଅନୁସୂଚିତ ଜାତି)' },
        { id: 'st', en: 'ST (Scheduled Tribe)', or: 'ST (ଅନୁସୂଚିତ ଜନଜାତି)' }
      ].forEach(function (c) {
        var opt = el('option', '', orMode ? c.or : c.en);
        opt.value = c.id;
        if (c.id === state.category) opt.selected = true;
        catSel.appendChild(opt);
      });
      catSel.addEventListener('change', function () { state.category = catSel.value; persistAndRender(); });
      addField(orMode ? 'ସାମାଜିକ ବର୍ଗ (Category)' : 'Social Category', catSel);

      var qualSel = el('select', 'cso-mpe-input');
      qualSel.id = 'cso-mpe-qual';
      QUAL_LEVELS.forEach(function (q) {
        var opt = el('option', '', orMode ? q.or : q.en);
        opt.value = q.id;
        if (q.id === state.qualification) opt.selected = true;
        qualSel.appendChild(opt);
      });
      qualSel.addEventListener('change', function () { state.qualification = qualSel.value; persistAndRender(); });
      addField(orMode ? 'ଶିକ୍ଷାଗତ ଯୋଗ୍ୟତା' : 'Highest Qualification', qualSel);

      form.appendChild(grid);

      // Special Toggles
      var toggles = el('div', 'cso-mpe-toggles');
      [
        { key: 'pwbd', en: 'PwBD (≥ 40% Disability · +10/+15 yrs)', or: 'ଭିନ୍ନକ୍ଷମ PwBD (≥ 40% · +10/+15 ବର୍ଷ)' },
        { key: 'exServiceman', en: 'Ex-Serviceman', or: 'ପୂର୍ବତନ ସୈନିକ (Ex-Serviceman)' },
        { key: 'inService', en: 'In-Service Odisha Govt Employee', or: 'ଓଡ଼ିଶା ସରକାରୀ କର୍ମଚାରୀ (In-Service)' }
      ].forEach(function (tg) {
        var lbl = el('label', 'cso-mpe-check-pill');
        var cb = el('input', 'cso-mpe-checkbox');
        cb.type = 'checkbox';
        cb.checked = Boolean(state[tg.key]);
        cb.addEventListener('change', function () { state[tg.key] = cb.checked; persistAndRender(); });
        lbl.appendChild(cb);
        lbl.appendChild(el('span', '', orMode ? tg.or : tg.en));
        toggles.appendChild(lbl);
      });
      form.appendChild(toggles);
      card.appendChild(form);

      // KPI Strip
      var kpis = el('div', 'cso-mpe-kpis');
      [
        { lbl: orMode ? '✅ ଯୋଗ୍ୟ ପଦବୀ' : '✅ Eligible Posts', val: String(evalRes.summary.eligibleCount) + ' / ' + evalRes.summary.total, mod: ' cso-mpe-kpi--ok' },
        { lbl: orMode ? '⚠️ ବୟସ ସୀମା ବାହାରେ' : '⚠️ Over-Age / Under-Age', val: String(evalRes.summary.ageBlockedCount), mod: '' },
        { lbl: orMode ? '💸 ₹0 ଫି ଛାଡ଼ ପଦବୀ' : '💸 ₹0 Fee Exempt Count', val: String(evalRes.summary.feeExemptCount) + ' / ' + evalRes.summary.total, mod: ' cso-mpe-kpi--ok' }
      ].forEach(function (k) {
        var b = el('div', 'cso-mpe-kpi' + k.mod);
        b.appendChild(el('span', 'cso-mpe-kpi-lbl', k.lbl));
        b.appendChild(el('strong', 'cso-mpe-kpi-val', k.val));
        kpis.appendChild(b);
      });
      card.appendChild(kpis);

      // View Filter Pills
      var filterBar = el('div', 'cso-mpe-filters');
      [
        { id: 'all', en: 'All Active Drives (' + evalRes.summary.total + ')', or: 'ସବୁ ନିଯୁକ୍ତି (' + evalRes.summary.total + ')' },
        { id: 'eligible', en: 'Eligible Posts Only (' + evalRes.summary.eligibleCount + ')', or: 'କେବଳ ଯୋଗ୍ୟ ପଦବୀ (' + evalRes.summary.eligibleCount + ')' },
        { id: 'fee-exempt', en: '₹0 Fee Exempt Only (' + evalRes.summary.feeExemptCount + ')', or: 'କେବଳ ₹0 ଫି ଛାଡ଼ (' + evalRes.summary.feeExemptCount + ')' }
      ].forEach(function (vf) {
        var b = el('button', 'cso-mpe-pill' + (state.viewFilter === vf.id ? ' is-active' : ''), orMode ? vf.or : vf.en);
        b.type = 'button';
        b.addEventListener('click', function () { state.viewFilter = vf.id; persistAndRender(); });
        filterBar.appendChild(b);
      });
      card.appendChild(filterBar);

      // Results Table
      var visibleRows = evalRes.rows.filter(function (r) {
        if (state.viewFilter === 'eligible') return r.status === 'eligible';
        if (state.viewFilter === 'fee-exempt') return r.fee.isFeeExempt;
        return true;
      });

      var tableWrap = el('div', 'cso-mpe-table-wrap');
      var tbl = el('table', 'cso-mpe-table');
      var thead = el('thead');
      var htr = el('tr');
      [
        orMode ? 'ନିଯୁକ୍ତି / ବୋର୍ଡ' : 'Recruitment Drive / Board',
        orMode ? 'କଟ୍-ଅଫ୍ ବୟସ' : 'Age on Cutoff',
        orMode ? 'ଆପଣଙ୍କ ସୀମା (ଛାଡ଼ ସହିତ)' : 'Your Age Band (Relaxed)',
        orMode ? 'ଆବେଦନ ଫି' : 'Application Fee',
        orMode ? 'ସ୍ଥିତି' : 'Status',
        orMode ? 'ସେଭ୍' : 'Action'
      ].forEach(function (h) { htr.appendChild(el('th', '', h)); });
      thead.appendChild(htr);
      tbl.appendChild(thead);

      var tbody = el('tbody');
      visibleRows.forEach(function (r) {
        var tr = el('tr');
        var tdTitle = el('td');
        tdTitle.appendChild(el('strong', '', orMode ? r.notice.titleOr : r.notice.titleEn));
        tdTitle.appendChild(el('div', 'cso-mpe-subcell', r.notice.board + ' · Cutoff: ' + r.notice.cutoffDate + ' · Min: ' + r.notice.minQualLabel));
        tr.appendChild(tdTitle);

        tr.appendChild(el('td', '', r.ageOnCutoff.label));
        tr.appendChild(el('td', '', r.notice.minAge + '–' + r.effectiveMaxAge + ' yrs' + (r.relaxYears > 0 ? (' (+' + r.relaxYears + 'y)') : '')));
        tr.appendChild(el('td', '', orMode ? r.fee.labelOr : r.fee.labelEn));

        var stLabel = r.status === 'eligible'
          ? (orMode ? '✅ ଯୋଗ୍ୟ' : '✅ ELIGIBLE')
          : (r.status === 'under-age'
            ? (orMode ? '⚠️ କମ୍ ବୟସ' : '⚠️ UNDER-AGE')
            : (r.status === 'over-age' ? (orMode ? '❌ ଅଧିକ ବୟସ' : '❌ OVER-AGE') : (orMode ? '⚠️ ଯୋଗ୍ୟତା ଆବଶ୍ୟକ' : '⚠️ QUALIFICATION')));
        var tdSt = el('td');
        tdSt.appendChild(el('span', 'cso-mpe-badge cso-mpe-badge--' + (r.status === 'eligible' ? 'ok' : 'warn'), stLabel));
        tr.appendChild(tdSt);

        var tdAct = el('td');
        var isSaved = Boolean(win.CSOSavedAlerts && typeof win.CSOSavedAlerts.isSaved === 'function' && win.CSOSavedAlerts.isSaved('mpe-' + r.notice.id));
        var saveBtn = el('button', 'cso-mpe-mini-btn', isSaved ? '★ Saved' : '☆ Save Post');
        saveBtn.type = 'button';
        saveBtn.addEventListener('click', function () {
          if (win.CSOSavedAlerts && typeof win.CSOSavedAlerts.toggleAlert === 'function') {
            win.CSOSavedAlerts.toggleAlert({
              id: 'mpe-' + r.notice.id,
              title: r.notice.titleEn,
              category: 'Recruitment',
              deadline: r.notice.cutoffDate,
              url: r.notice.url
            });
            render();
          }
        });
        tdAct.appendChild(saveBtn);
        tr.appendChild(tdAct);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      tableWrap.appendChild(tbl);
      card.appendChild(tableWrap);

      // Footer Actions
      var actions = el('div', 'cso-mpe-actions');
      var statusEl = el('span', 'cso-mpe-copy-status');
      statusEl.setAttribute('aria-live', 'polite');

      var copyBtn = el('button', 'cso-mpe-btn cso-mpe-btn--primary', orMode ? '📋 ଯୋଗ୍ୟତା ମ୍ୟାଟ୍ରିକ୍ସ କପି କରନ୍ତୁ' : '📋 Copy Eligibility Matrix');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        var lines = [
          'CS Odisha — Multi-Post Age & Fee Eligibility Matrix',
          'Profile: DOB=' + state.dob + ' | Gender=' + state.gender + ' | Category=' + state.category.toUpperCase() + ' | Qual=' + state.qualification,
          'Summary: ' + evalRes.summary.eligibleCount + '/' + evalRes.summary.total + ' Eligible | ' + evalRes.summary.feeExemptCount + ' ₹0 Fee Exempt'
        ];
        evalRes.rows.forEach(function (r) {
          lines.push('- ' + r.notice.titleEn + ': ' + r.status.toUpperCase() + ' (Age ' + r.ageOnCutoff.label + ', Band ' + r.notice.minAge + '–' + r.effectiveMaxAge + 'y, Fee: ' + r.fee.labelEn + ')');
        });
        copyText(lines.join('\n')).then(function () {
          statusEl.textContent = orMode ? '✅ କପି ହୋଇଗଲା!' : '✅ Eligibility matrix copied!';
          setTimeout(function () { statusEl.textContent = ''; }, 2400);
        });
      });
      actions.appendChild(copyBtn);

      var printBtn = el('button', 'cso-mpe-btn', orMode ? '🖨️ ଯୋଗ୍ୟତା ଶିଟ୍ ପ୍ରିଣ୍ଟ୍ କରନ୍ତୁ' : '🖨️ Print Multi-Post Eligibility Sheet');
      printBtn.type = 'button';
      printBtn.addEventListener('click', function () { if (typeof win.print === 'function') win.print(); });
      actions.appendChild(printBtn);
      actions.appendChild(statusEl);
      card.appendChild(actions);

      container.replaceChildren(card);
    }

    render();
    return { render: render, getState: function () { return Object.assign({}, state); } };
  }

  function autoMount() {
    if (!doc) return;
    var root = doc.getElementById(ROOT_ID);
    if (root) mount(root);
  }

  if (doc) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', autoMount);
    } else {
      autoMount();
    }
  }

  return {
    VERSION: VERSION,
    ROOT_ID: ROOT_ID,
    PREFS_KEY: PREFS_KEY,
    QUAL_LEVELS: QUAL_LEVELS,
    DEFAULT_NOTICES: DEFAULT_NOTICES,
    computeExactAge: computeExactAge,
    computeRelaxationYears: computeRelaxationYears,
    computeFeeRule: computeFeeRule,
    evaluateMultiPostEligibility: evaluateMultiPostEligibility,
    mount: mount
  };
});
