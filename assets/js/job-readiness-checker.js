/**
 * Common Sense Odisha — Interactive Application Document Checklist & Age Eligibility Quick-Checker (v397)
 * Mounted exclusively on /jobs/<slug> detail pages (above the 25-MCQ practice drill).
 * Local-first persistence:
 *   - Shared Global Document Wallet: `cso_doc_wallet_v1`
 *   - Per-Slug Checklist Overrides & Custom Docs: `cso_doc_checklist_v1:<slug>`
 *   - Optional Local DOB Memory: `cso_candidate_dob_v1`
 * Strict CSP-compliant: DOM APIs only, zero inline styles/handlers, EN / ଓଡ଼ିଆ bilingual.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOJobReadiness = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOJobReadiness = api;
})(function (win, doc) {
  'use strict';

  var WALLET_KEY = 'cso_doc_wallet_v1';
  var CHECKLIST_PREFIX = 'cso_doc_checklist_v1:';
  var DOB_KEY = 'cso_candidate_dob_v1';

  var DEFAULT_DOCS = [
    { id: 'aadhaar', en: 'Aadhaar Card / Valid Govt. Photo ID', or: 'ଆଧାର କାର୍ଡ / ସରକାରୀ ପରିଚୟ ପତ୍ର' },
    { id: 'abc_id', en: 'Academic Bank of Credits (ABC ID / APAAR)', or: 'ଏକାଡେମିକ୍ ବ୍ୟାଙ୍କ ଅଫ୍ କ୍ରେଡିଟ୍ସ (ABC ID)' },
    { id: 'matric', en: '10th / Matriculation Certificate & Marksheet (DOB Proof)', or: '୧୦ମ ପ୍ରମାଣପତ୍ର ଓ ମାର୍କସିଟ୍ (ଜନ୍ମ ତାରିଖ ପ୍ରମାଣ)' },
    { id: 'plus2_grad', en: '+2 / Graduation / PG Marksheets & Certificates', or: '+୨ / ସ୍ନାତକ / ସ୍ନାତକୋତ୍ତର ମାର୍କସିଟ୍ ଓ ସାର୍ଟିଫିକେଟ୍' },
    { id: 'bed_net', en: 'B.Ed / M.Ed / NET / TET Qualifying Certificate (if applicable)', or: 'B.Ed / M.Ed / NET / TET ଯୋଗ୍ୟତା ପ୍ରମାଣପତ୍ର' },
    { id: 'caste_res', en: 'Odisha Caste / SEBC / Residence / Income Certificate', or: 'ଓଡ଼ିଶା ଜାତି / SEBC / ବାସିନ୍ଦା / ଆୟ ପ୍ରମାଣପତ୍ର' },
    { id: 'photo_sig', en: 'Passport Photo & Signature Scan (JPG, 20–50 KB)', or: 'ପାସପୋର୍ଟ ଫଟୋ ଓ ଦସ୍ତଖତ ସ୍କାନ୍ (JPG, ୨୦–୫୦ KB)' }
  ];

  var RELAX_PRESETS = [
    { key: 'ur', years: 0, en: 'UR / General (+0 yrs)', or: 'ସାଧାରଣ / UR (+୦ ବର୍ଷ)' },
    { key: 'sebc', years: 3, en: 'SEBC / OBC (+3 yrs)', or: 'SEBC / OBC (+୩ ବର୍ଷ)' },
    { key: 'scst', years: 5, en: 'SC / ST (+5 yrs)', or: 'SC / ST (+୫ ବର୍ଷ)' },
    { key: 'women', years: 5, en: 'Women (+5 yrs)', or: 'ମହିଳା (+୫ ବର୍ଷ)' },
    { key: 'pwbd', years: 10, en: 'PwBD (+10 yrs)', or: 'PwBD (+୧୦ ବର୍ଷ)' },
    { key: 'custom', years: 0, en: 'Custom Relaxation', or: 'ଅନ୍ୟାନ୍ୟ ରିହାତି' }
  ];

  function pad2(n) {
    return n < 10 ? ('0' + n) : String(n);
  }

  function getIstTodayYmd(nowDate) {
    var d = nowDate instanceof Date ? nowDate : new Date();
    var ist = new Date(d.getTime() + (330 * 60 * 1000));
    return String(ist.getUTCFullYear()) + '-' + pad2(ist.getUTCMonth() + 1) + '-' + pad2(ist.getUTCDate());
  }

  function parseYmdParts(iso) {
    var m = String(iso || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    var y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    var dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || (dt.getUTCMonth() + 1) !== mo || dt.getUTCDate() !== d) return null;
    return { y: y, m: mo, d: d };
  }

  function daysInMonthUtc(year, month1Based) {
    return new Date(Date.UTC(year, month1Based, 0)).getUTCDate();
  }

  /**
   * Computes exact chronological age (years, months, days) between dobIso and cutoffIso
   * using pure integer calendar arithmetic (accurate across leap years & month boundaries).
   */
  function calculateExactAge(dobIso, cutoffIso) {
    var dob = parseYmdParts(dobIso);
    var cut = parseYmdParts(cutoffIso);
    if (!dob || !cut) return null;
    if (dob.y > cut.y || (dob.y === cut.y && (dob.m > cut.m || (dob.m === cut.m && dob.d > cut.d)))) {
      return null;
    }
    var years = cut.y - dob.y;
    var months = cut.m - dob.m;
    var days = cut.d - dob.d;

    if (days < 0) {
      months -= 1;
      var prevMonth = cut.m === 1 ? 12 : (cut.m - 1);
      var prevYear = cut.m === 1 ? (cut.y - 1) : cut.y;
      var prevMonthDays = daysInMonthUtc(prevYear, prevMonth);
      days = cut.d + (prevMonthDays - Math.min(dob.d, prevMonthDays));
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    return { years: years, months: months, days: days };
  }

  function evaluateAgeEligibility(dobIso, cutoffIso, minAge, maxAge, relaxYears) {
    var age = calculateExactAge(dobIso, cutoffIso);
    if (!age) return null;
    var minN = Number(minAge);
    var maxN = Number(maxAge);
    var relax = Math.max(0, Math.min(25, Number(relaxYears) || 0));
    var hasMin = Number.isFinite(minN) && minN > 0;
    var hasMax = Number.isFinite(maxN) && maxN > 0;
    var effMax = hasMax ? (maxN + relax) : null;

    var ageTotalMonths = (age.years * 12) + age.months + (age.days > 0 ? 0.001 : 0);

    if (hasMin && ageTotalMonths < (minN * 12)) {
      var underMonths = Math.max(0, Math.floor((minN * 12) - ((age.years * 12) + age.months)));
      var uy = Math.floor(underMonths / 12);
      var um = underMonths % 12;
      return {
        status: 'below_min',
        eligible: false,
        age: age,
        effective_max: effMax,
        diff_years: uy,
        diff_months: um,
        label_en: '⚠️ Below Min Age by ' + uy + ' yrs ' + um + ' mos',
        label_or: '⚠️ ସର୍ବନିମ୍ନ ବୟସଠାରୁ ' + uy + ' ବର୍ଷ ' + um + ' ମାସ କମ୍'
      };
    }
    if (hasMax && (age.years > effMax || (age.years === effMax && (age.months > 0 || age.days > 0)))) {
      var overMonths = Math.max(0, ((age.years - effMax) * 12) + age.months);
      var oy = Math.floor(overMonths / 12);
      var om = overMonths % 12;
      return {
        status: 'over_max',
        eligible: false,
        age: age,
        effective_max: effMax,
        diff_years: oy,
        diff_months: om,
        label_en: '⚠️ Over Max Age by ' + oy + ' yrs ' + om + ' mos',
        label_or: '⚠️ ସର୍ବାଧିକ ବୟସଠାରୁ ' + oy + ' ବର୍ଷ ' + om + ' ମାସ ଅଧିକ'
      };
    }
    if (hasMin || hasMax) {
      return {
        status: 'eligible',
        eligible: true,
        age: age,
        effective_max: effMax,
        diff_years: 0,
        diff_months: 0,
        label_en: '✅ Eligible on Cutoff Date',
        label_or: '✅ ନିର୍ଦ୍ଧାରିତ ତାରିଖରେ ଯୋଗ୍ୟ'
      };
    }
    return {
      status: 'calculated',
      eligible: null,
      age: age,
      effective_max: null,
      diff_years: 0,
      diff_months: 0,
      label_en: 'ℹ️ Exact Age Calculated',
      label_or: 'ℹ️ ସଠିକ୍ ବୟସ ଗଣନା ହୋଇଛି'
    };
  }

  // ---------- Local-First Checklist Storage ----------
  function readJson(key, fallback) {
    try {
      var raw = win.localStorage && win.localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, val) {
    try {
      if (win.localStorage) win.localStorage.setItem(key, JSON.stringify(val));
    } catch (_) {}
  }

  function loadChecklistState(slug) {
    var wallet = readJson(WALLET_KEY, {});
    var perJob = readJson(CHECKLIST_PREFIX + String(slug || 'default'), { overrides: {}, custom: [] });
    var overrides = (perJob && perJob.overrides && typeof perJob.overrides === 'object') ? perJob.overrides : {};
    var custom = Array.isArray(perJob && perJob.custom) ? perJob.custom : [];

    var items = DEFAULT_DOCS.map(function (d) {
      var hasOverride = Object.prototype.hasOwnProperty.call(overrides, d.id);
      var checked = hasOverride ? Boolean(overrides[d.id]) : Boolean(wallet[d.id]);
      return { id: d.id, en: d.en, or: d.or, checked: checked, isCustom: false };
    });
    custom.forEach(function (c) {
      if (!c || !c.id || !c.en) return;
      items.push({ id: String(c.id), en: String(c.en), or: String(c.or || c.en), checked: Boolean(c.checked), isCustom: true });
    });
    return { items: items, wallet: wallet, overrides: overrides, custom: custom };
  }

  function setDocumentChecked(slug, docId, checked, isCustom) {
    var key = CHECKLIST_PREFIX + String(slug || 'default');
    var perJob = readJson(key, { overrides: {}, custom: [] });
    if (!perJob.overrides || typeof perJob.overrides !== 'object') perJob.overrides = {};
    if (!Array.isArray(perJob.custom)) perJob.custom = [];

    if (isCustom) {
      perJob.custom = perJob.custom.map(function (c) {
        if (c && c.id === docId) return Object.assign({}, c, { checked: Boolean(checked) });
        return c;
      });
    } else {
      perJob.overrides[docId] = Boolean(checked);
      var wallet = readJson(WALLET_KEY, {});
      wallet[docId] = Boolean(checked);
      writeJson(WALLET_KEY, wallet);
    }
    writeJson(key, perJob);
    return computeChecklistProgress(loadChecklistState(slug).items);
  }

  function addCustomDocument(slug, label) {
    var clean = String(label || '').trim().slice(0, 140);
    if (!clean) return null;
    var key = CHECKLIST_PREFIX + String(slug || 'default');
    var perJob = readJson(key, { overrides: {}, custom: [] });
    if (!Array.isArray(perJob.custom)) perJob.custom = [];
    var item = { id: 'cust_' + Date.now().toString(36), en: clean, or: clean, checked: false };
    perJob.custom.push(item);
    writeJson(key, perJob);
    return item;
  }

  function resetChecklist(slug) {
    var key = CHECKLIST_PREFIX + String(slug || 'default');
    var overrides = {};
    DEFAULT_DOCS.forEach(function (d) { overrides[d.id] = false; });
    writeJson(key, { overrides: overrides, custom: [] });
    return computeChecklistProgress(loadChecklistState(slug).items);
  }

  function computeChecklistProgress(items) {
    var list = Array.isArray(items) ? items : [];
    var total = list.length;
    var ready = 0;
    for (var i = 0; i < total; i += 1) {
      if (list[i] && list[i].checked) ready += 1;
    }
    var pct = total > 0 ? Math.round((ready / total) * 100) : 0;
    return { ready: ready, total: total, percent: pct };
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

  /**
   * Mounts the Interactive Document Readiness Checklist & Exact Age-on-Cutoff Calculator
   * into `mountEl` on /jobs/<slug> detail pages.
   */
  function mount(mountEl, article, lang) {
    if (!doc || !mountEl || !article) return;
    var isOr = lang === 'or';
    var slug = String(article.slug || article.id || 'job');
    mountEl.replaceChildren();

    var card = el('section', 'cso-jr-card');
    card.setAttribute('aria-label', isOr ? 'ଆବେଦନ ପ୍ରସ୍ତୁତି ଓ ବୟସ ଯୋଗ୍ୟତା ଯାଞ୍ଚ' : 'Application Document Readiness and Age Eligibility Checker');

    var head = el('div', 'cso-jr-head');
    head.appendChild(el('h2', 'cso-jr-title', isOr
      ? '🗂️ ଆବେଦନ ଡକ୍ୟୁମେଣ୍ଟ ଚେକଲିଷ୍ଟ ଓ ବୟସ ଯୋଗ୍ୟତା ଯାଞ୍ଚ'
      : '🗂️ Application Document Checklist & Age Eligibility Quick-Checker'));
    head.appendChild(el('p', 'cso-jr-sub', isOr
      ? 'ଆପଣଙ୍କ ଡିଭାଇସରେ ସୁରକ୍ଷିତ ଭାବେ ସେଭ୍ ହୁଏ (ଅଫଲାଇନ୍) — ଥରେ ପ୍ରସ୍ତୁତ ଚିହ୍ନିତ କଲେ ଅନ୍ୟ ଚାକିରିରେ ମଧ୍ୟ ପ୍ରି-ଫିଲ୍ ହେବ।'
      : 'Saved locally on your device (100% offline) — documents marked Ready pre-fill across other Odisha recruitment notices.'));
    card.appendChild(head);

    var grid = el('div', 'cso-jr-grid');

    // ========== PART A: Interactive Document Readiness Checklist ==========
    var docPanel = el('div', 'cso-jr-panel');
    var docHead = el('div', 'cso-jr-panel-head');
    docHead.appendChild(el('h3', 'cso-jr-h3', isOr ? '📋 ଡକ୍ୟୁମେଣ୍ଟ ପ୍ରସ୍ତୁତି ତାଲିକା' : '📋 Document Readiness Checklist'));
    var progBadge = el('span', 'cso-jr-badge');
    docHead.appendChild(progBadge);
    docPanel.appendChild(docHead);

    var progBar = doc.createElement('progress');
    progBar.className = 'cso-jr-progress';
    progBar.max = 100;
    progBar.value = 0;
    docPanel.appendChild(progBar);

    var listBox = el('div', 'cso-jr-list');
    docPanel.appendChild(listBox);

    var addRow = el('div', 'cso-jr-add-row');
    var addInput = el('input', 'cso-jr-input');
    addInput.type = 'text';
    addInput.placeholder = isOr ? 'ନୂଆ ଡକ୍ୟୁମେଣ୍ଟ ଯୋଡନ୍ତୁ…' : 'Add custom document (e.g., Experience Certificate)…';
    addInput.setAttribute('aria-label', 'Add custom document');
    var addBtn = el('button', 'cso-jr-btn', isOr ? '+ ଯୋଡନ୍ତୁ' : '+ Add Custom Document');
    addBtn.type = 'button';
    addRow.append(addInput, addBtn);
    docPanel.appendChild(addRow);

    var docActions = el('div', 'cso-jr-actions');
    var resetBtn = el('button', 'cso-jr-btn cso-jr-btn--muted', isOr ? '↻ ରିସେଟ୍ କରନ୍ତୁ' : '↻ Reset Checklist');
    resetBtn.type = 'button';
    var copyBtn = el('button', 'cso-jr-btn', isOr ? '📋 ତାଲିକା କପି କରନ୍ତୁ' : '📋 Copy Readiness Summary');
    copyBtn.type = 'button';
    docActions.append(copyBtn, resetBtn);
    docPanel.appendChild(docActions);

    function renderChecklist() {
      var st = loadChecklistState(slug);
      var prog = computeChecklistProgress(st.items);
      progBadge.textContent = isOr
        ? ('ପ୍ରସ୍ତୁତ: ' + prog.ready + ' / ' + prog.total + ' ଡକ୍ୟୁମେଣ୍ଟ')
        : ('Ready: ' + prog.ready + ' / ' + prog.total + ' Documents');
      progBadge.className = 'cso-jr-badge' + (prog.ready === prog.total && prog.total > 0 ? ' is-ready' : '');
      progBar.value = prog.percent;

      listBox.replaceChildren();
      st.items.forEach(function (item) {
        var row = el('label', 'cso-jr-check-row' + (item.checked ? ' is-checked' : ''));
        var chk = doc.createElement('input');
        chk.type = 'checkbox';
        chk.className = 'cso-jr-checkbox';
        chk.checked = item.checked;
        chk.addEventListener('change', function () {
          setDocumentChecked(slug, item.id, chk.checked, item.isCustom);
          renderChecklist();
        });
        row.append(chk, el('span', 'cso-jr-check-txt', isOr ? item.or : item.en));
        listBox.appendChild(row);
      });
    }

    addBtn.addEventListener('click', function () {
      if (!addInput.value.trim()) return;
      addCustomDocument(slug, addInput.value.trim());
      addInput.value = '';
      renderChecklist();
    });
    addInput.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        addBtn.click();
      }
    });
    resetBtn.addEventListener('click', function () {
      resetChecklist(slug);
      renderChecklist();
    });
    copyBtn.addEventListener('click', function () {
      var st = loadChecklistState(slug);
      var prog = computeChecklistProgress(st.items);
      var lines = [
        (article.title_en || 'Job Application') + ' — Document Readiness (' + prog.ready + '/' + prog.total + ')'
      ];
      st.items.forEach(function (it) {
        lines.push((it.checked ? '[x] ' : '[ ] ') + (isOr ? it.or : it.en));
      });
      copyText(lines.join('\n')).then(function () {
        var orig = copyBtn.textContent;
        copyBtn.textContent = isOr ? '✅ କପି ହେଲା!' : '✅ Copied!';
        setTimeout(function () { copyBtn.textContent = orig; }, 2200);
      });
    });

    renderChecklist();

    // ========== PART B: Exact Age-on-Cutoff Eligibility Calculator ==========
    var agePanel = el('div', 'cso-jr-panel');
    agePanel.appendChild(el('h3', 'cso-jr-h3', isOr ? '🎂 ସଠିକ୍ ବୟସ ଓ ଯୋଗ୍ୟତା କାଲକୁଲେଟର' : '🎂 Exact Age-on-Cutoff Eligibility Calculator'));

    var defaultCutoff = parseYmdParts(article.age_cutoff_date)
      ? article.age_cutoff_date
      : (parseYmdParts(article.last_date) ? article.last_date : getIstTodayYmd());
    var savedDob = '';
    try { savedDob = (win.localStorage && win.localStorage.getItem(DOB_KEY)) || ''; } catch (_) {}

    var form = el('div', 'cso-jr-form');

    var dobField = el('div', 'cso-jr-field');
    var dobLbl = el('label', 'cso-jr-label', isOr ? 'ଜନ୍ମ ତାରିଖ (Date of Birth)' : 'Your Date of Birth');
    var dobInput = el('input', 'cso-jr-input');
    dobInput.type = 'date';
    dobInput.value = savedDob;
    dobInput.setAttribute('aria-label', 'Date of Birth');
    dobField.append(dobLbl, dobInput);

    var cutField = el('div', 'cso-jr-field');
    var cutLbl = el('label', 'cso-jr-label', isOr ? 'ବୟସ ଗଣନା ତାରିଖ (Cutoff Date)' : 'Age Cutoff Date');
    var cutInput = el('input', 'cso-jr-input');
    cutInput.type = 'date';
    cutInput.value = defaultCutoff;
    cutInput.setAttribute('aria-label', 'Age Cutoff Date');
    cutField.append(cutLbl, cutInput);

    var catField = el('div', 'cso-jr-field');
    var catLbl = el('label', 'cso-jr-label', isOr ? 'ବର୍ଗ / ବୟସ ରିହାତି (Category Relaxation)' : 'Category / Age Relaxation');
    var catSelect = el('select', 'cso-jr-input');
    catSelect.setAttribute('aria-label', 'Category age relaxation');
    RELAX_PRESETS.forEach(function (p) {
      var opt = doc.createElement('option');
      opt.value = p.key;
      opt.textContent = isOr ? p.or : p.en;
      catSelect.appendChild(opt);
    });
    catField.append(catLbl, catSelect);

    var customRelaxField = el('div', 'cso-jr-field');
    customRelaxField.hidden = true;
    var customRelaxLbl = el('label', 'cso-jr-label', isOr ? 'ରିହାତି ବର୍ଷ (Custom Years)' : 'Custom Relaxation (Years)');
    var customRelaxInput = el('input', 'cso-jr-input');
    customRelaxInput.type = 'number';
    customRelaxInput.min = '0';
    customRelaxInput.max = '25';
    customRelaxInput.value = '0';
    customRelaxField.append(customRelaxLbl, customRelaxInput);

    var remWrap = el('label', 'cso-jr-rem-row');
    var remChk = doc.createElement('input');
    remChk.type = 'checkbox';
    remChk.className = 'cso-jr-checkbox';
    remChk.checked = Boolean(savedDob);
    remWrap.append(remChk, el('span', '', isOr ? 'ଏହି ଡିଭାଇସରେ ଜନ୍ମ ତାରିଖ ମନେରଖନ୍ତୁ' : 'Remember DOB on this device'));

    form.append(dobField, cutField, catField, customRelaxField, remWrap);
    agePanel.appendChild(form);

    var resultBox = el('div', 'cso-jr-result');
    resultBox.setAttribute('role', 'status');
    resultBox.setAttribute('aria-live', 'polite');
    agePanel.appendChild(resultBox);

    function getSelectedRelaxYears() {
      var key = catSelect.value;
      if (key === 'custom') return Math.max(0, Math.min(25, Number(customRelaxInput.value) || 0));
      var found = RELAX_PRESETS.find(function (p) { return p.key === key; });
      return found ? found.years : 0;
    }

    function renderAgeResult() {
      resultBox.replaceChildren();
      var dobVal = dobInput.value;
      var cutVal = cutInput.value;
      if (remChk.checked && dobVal) {
        try { if (win.localStorage) win.localStorage.setItem(DOB_KEY, dobVal); } catch (_) {}
      } else if (!remChk.checked) {
        try { if (win.localStorage) win.localStorage.removeItem(DOB_KEY); } catch (_) {}
      }

      if (!dobVal) {
        resultBox.appendChild(el('div', 'cso-jr-muted', isOr
          ? 'ସଠିକ୍ ବୟସ ଓ ଯୋଗ୍ୟତା ଜାଣିବାକୁ ଆପଣଙ୍କ ଜନ୍ମ ତାରିଖ ବାଛନ୍ତୁ।'
          : 'Select your Date of Birth above to calculate your exact age on the cutoff date.'));
        return;
      }

      var evalRes = evaluateAgeEligibility(dobVal, cutVal, article.min_age, article.max_age, getSelectedRelaxYears());
      if (!evalRes) {
        resultBox.appendChild(el('div', 'cso-jr-pill cso-jr-pill--warn', isOr
          ? '⚠️ ଜନ୍ମ ତାରିଖ କଟ୍-ଅଫ୍ ତାରିଖଠାରୁ ପୂର୍ବର ହେବା ଆବଶ୍ୟକ।'
          : '⚠️ Date of Birth must be on or before the Cutoff Date.'));
        return;
      }

      var ageLine = isOr
        ? (evalRes.age.years + ' ବର୍ଷ, ' + evalRes.age.months + ' ମାସ, ' + evalRes.age.days + ' ଦିନ')
        : (evalRes.age.years + ' Years, ' + evalRes.age.months + ' Months, ' + evalRes.age.days + ' Days');
      resultBox.appendChild(el('strong', 'cso-jr-age-readout', ageLine));

      var pillTone = evalRes.status === 'eligible' ? 'ok' : (evalRes.status === 'calculated' ? 'info' : 'warn');
      resultBox.appendChild(el('span', 'cso-jr-pill cso-jr-pill--' + pillTone, isOr ? evalRes.label_or : evalRes.label_en));

      if (article.min_age || article.max_age) {
        var limTxt = (article.min_age || 18) + '–' + (evalRes.effective_max || article.max_age || '—') + (isOr ? ' ବର୍ଷ (ରିହାତି ସହ)' : ' yrs (incl. relaxation)');
        resultBox.appendChild(el('div', 'cso-jr-muted', (isOr ? 'ନିର୍ଦ୍ଧାରିତ ବୟସ ସୀମା: ' : 'Notice Age Window: ') + limTxt));
      }
    }

    dobInput.addEventListener('change', renderAgeResult);
    cutInput.addEventListener('change', renderAgeResult);
    catSelect.addEventListener('change', function () {
      customRelaxField.hidden = catSelect.value !== 'custom';
      renderAgeResult();
    });
    customRelaxInput.addEventListener('input', renderAgeResult);
    remChk.addEventListener('change', renderAgeResult);

    renderAgeResult();

    grid.append(docPanel, agePanel);
    card.appendChild(grid);
    mountEl.appendChild(card);
  }

  return {
    version: 'v397',
    WALLET_KEY: WALLET_KEY,
    CHECKLIST_PREFIX: CHECKLIST_PREFIX,
    DOB_KEY: DOB_KEY,
    DEFAULT_DOCS: DEFAULT_DOCS,
    RELAX_PRESETS: RELAX_PRESETS,
    calculateExactAge: calculateExactAge,
    evaluateAgeEligibility: evaluateAgeEligibility,
    loadChecklistState: loadChecklistState,
    setDocumentChecked: setDocumentChecked,
    addCustomDocument: addCustomDocument,
    resetChecklist: resetChecklist,
    computeChecklistProgress: computeChecklistProgress,
    mount: mount
  };
});
