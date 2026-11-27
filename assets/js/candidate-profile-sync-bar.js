/**
 * Common Sense Odisha — Interactive Candidate Profile Auto-Fill
 * & Cross-Tool Sync Bar (/tools/, /jobs/, /exams/, /results/, v437)
 * Persists a single unified localStorage profile (cso_unified_candidate_profile_v1)
 * and propagates DOB, Category, Gender, Home District, Qualification & PwBD
 * across Multi-Post Eligibility Matrix, PET/PST Checker, Teacher Eligibility Checker,
 * District Exam Center Planner, and live page inputs in one click.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations;
 * bilingual EN / ଓଡ଼ିଆ; 4-theme var(--cso-*) semantic tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOCandidateProfileSyncBar = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOCandidateProfileSyncBar = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v437';
  var ROOT_ID = 'cso-candidate-profile-sync-root';
  var PROFILE_KEY = 'cso_unified_candidate_profile_v1';
  var DOWNSTREAM_KEYS = {
    multiPost: 'cso_multi_post_profile_v1',
    petPst: 'cso_pet_pst_prefs_v1',
    teacher: 'cso_teacher_eligibility_prefs_v1',
    districtExam: 'cso_district_exam_center_prefs_v1'
  };

  var ODISHA_DISTRICTS = [
    'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh',
    'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur',
    'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar',
    'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh',
    'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'
  ];

  var DEFAULT_PROFILE = {
    dob: '1999-03-04',
    category: 'ur',
    gender: 'male',
    homeDistrict: 'Khordha',
    qualification: 'graduate',
    pwbd: false
  };

  function normalizeProfile(input) {
    var p = input || {};
    var dob = /^\d{4}-\d{2}-\d{2}$/.test(String(p.dob || '')) ? String(p.dob) : DEFAULT_PROFILE.dob;
    var catRaw = String(p.category || DEFAULT_PROFILE.category).toLowerCase();
    var category = (['ur', 'ews', 'sebc', 'sc', 'st'].indexOf(catRaw) !== -1) ? catRaw : 'ur';
    var genRaw = String(p.gender || DEFAULT_PROFILE.gender).toLowerCase();
    var gender = (['male', 'female', 'transgender'].indexOf(genRaw) !== -1) ? genRaw : 'male';
    var distRaw = String(p.homeDistrict || DEFAULT_PROFILE.homeDistrict).trim();
    var homeDistrict = ODISHA_DISTRICTS.indexOf(distRaw) !== -1 ? distRaw : 'Khordha';
    var qualRaw = String(p.qualification || DEFAULT_PROFILE.qualification).toLowerCase();
    var qualification = (['10th', 'plus-2', 'iti-diploma', 'graduate', 'bed-deled', 'pg'].indexOf(qualRaw) !== -1) ? qualRaw : 'graduate';
    var pwbd = Boolean(p.pwbd);

    return {
      dob: dob,
      category: category,
      gender: gender,
      homeDistrict: homeDistrict,
      homeDistrictSlug: homeDistrict.toLowerCase(),
      qualification: qualification,
      pwbd: pwbd
    };
  }

  function readJson(key) {
    try {
      var raw = win.localStorage && win.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function writeJson(key, obj) {
    try {
      if (win.localStorage) win.localStorage.setItem(key, JSON.stringify(obj));
    } catch (_) {}
  }

  function setInputValueAndNotify(id, val) {
    if (!doc) return false;
    var elNode = doc.getElementById(id);
    if (!elNode) return false;
    elNode.value = String(val);
    try {
      elNode.dispatchEvent(new win.Event('input', { bubbles: true }));
      elNode.dispatchEvent(new win.Event('change', { bubbles: true }));
    } catch (_) {}
    return true;
  }

  function syncProfileAcrossTools(inputProfile) {
    var profile = normalizeProfile(inputProfile);
    writeJson(PROFILE_KEY, profile);

    // 1. Multi-Post Eligibility Matrix (cso_multi_post_profile_v1)
    var mpPrev = readJson(DOWNSTREAM_KEYS.multiPost) || {};
    writeJson(DOWNSTREAM_KEYS.multiPost, Object.assign({}, mpPrev, {
      dob: profile.dob,
      gender: profile.gender,
      category: profile.category,
      qualification: profile.qualification,
      pwbd: profile.pwbd
    }));

    // 2. PET/PST Standards Checker (cso_pet_pst_prefs_v1)
    var petPrev = readJson(DOWNSTREAM_KEYS.petPst) || {};
    writeJson(DOWNSTREAM_KEYS.petPst, Object.assign({}, petPrev, {
      gender: profile.gender === 'female' ? 'female' : 'male',
      category: (profile.category === 'sc' || profile.category === 'st') ? 'sc-st' : 'ur-sebc',
      rawCategory: profile.category
    }));

    // 3. Teacher Eligibility Checker (cso_teacher_eligibility_prefs_v1)
    var tecPrev = readJson(DOWNSTREAM_KEYS.teacher) || {};
    var teacherCat = (profile.pwbd || profile.category === 'sc' || profile.category === 'st' || profile.category === 'sebc')
      ? 'sc-st-sebc-pwbd'
      : 'ur-ews';
    writeJson(DOWNSTREAM_KEYS.teacher, Object.assign({}, tecPrev, {
      category: teacherCat,
      pwbd: profile.pwbd,
      qualification: profile.qualification
    }));

    // 4. District Exam Center Planner (cso_district_exam_center_prefs_v1)
    var decPrev = readJson(DOWNSTREAM_KEYS.districtExam) || {};
    writeJson(DOWNSTREAM_KEYS.districtExam, Object.assign({}, decPrev, {
      homeDistrict: profile.homeDistrictSlug
    }));

    // 5. Auto-populate active page controls & notify mounted widgets
    setInputValueAndNotify('cso-mpe-dob', profile.dob);
    setInputValueAndNotify('cso-mpe-gender', profile.gender);
    setInputValueAndNotify('cso-mpe-cat', profile.category);
    setInputValueAndNotify('cso-mpe-qual', profile.qualification);
    setInputValueAndNotify('cso-dec-home', profile.homeDistrictSlug);
    setInputValueAndNotify('cso-jh-district', profile.homeDistrict);

    try {
      if (typeof win.dispatchEvent === 'function' && typeof win.CustomEvent === 'function') {
        win.dispatchEvent(new win.CustomEvent('cso:profile-synced', { detail: profile }));
      }
    } catch (_) {}

    return {
      profile: profile,
      syncedKeys: [
        PROFILE_KEY,
        DOWNSTREAM_KEYS.multiPost,
        DOWNSTREAM_KEYS.petPst,
        DOWNSTREAM_KEYS.teacher,
        DOWNSTREAM_KEYS.districtExam
      ],
      syncedCount: 5
    };
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function mount(container) {
    if (!doc || !container) return null;
    var saved = readJson(PROFILE_KEY);
    var state = Object.assign({ lang: 'en', lastSynced: Boolean(saved) }, normalizeProfile(saved || DEFAULT_PROFILE));

    function render() {
      var orMode = state.lang === 'or';
      var card = el('div', 'cso-cps-card');
      card.setAttribute('data-cso-profile-sync-bar', '1');

      // Header
      var head = el('div', 'cso-cps-head');
      var headCopy = el('div', 'cso-cps-head-copy');
      headCopy.appendChild(el('div', 'cso-cps-eyebrow', orMode
        ? '⚡ ଏକୀକୃତ ପ୍ରାର୍ଥୀ ପ୍ରୋଫାଇଲ୍ ଅଟୋ-ଫିଲ୍ ଓ କ୍ରସ୍-ଟୁଲ୍ ସିଙ୍କ୍'
        : '⚡ UNIFIED CANDIDATE PROFILE AUTO-FILL & CROSS-TOOL SYNC'));
      headCopy.appendChild(el('h2', 'cso-cps-title', orMode
        ? 'ଥରେ ନିଜ ବିବରଣୀ ଦିଅନ୍ତୁ — ସମସ୍ତ ୫ଟି ଟୁଲ୍ ଅଟୋ-ଫିଲ୍ ହେବ'
        : 'Set Your Profile Once — Auto-Fill All 5 Odisha Candidate Tools'));
      head.appendChild(headCopy);

      var headCtl = el('div', 'cso-cps-head-ctl');
      var statusBadge = el('span', 'cso-cps-badge', state.lastSynced
        ? (orMode ? '✅ ୫ଟି ପ୍ରାର୍ଥୀ ଟୁଲ୍ ରେ ସିଙ୍କ୍ ହୋଇଛି' : '✅ Synced Across 5 Candidate Tools')
        : (orMode ? 'ℹ️ ସିଙ୍କ୍ ପାଇଁ ପ୍ରସ୍ତୁତ' : 'ℹ️ Ready to Sync'));
      statusBadge.setAttribute('role', 'status');
      statusBadge.setAttribute('aria-live', 'polite');
      headCtl.appendChild(statusBadge);

      var langToggle = el('div', 'cso-cps-lang-toggle');
      ['en', 'or'].forEach(function (lk) {
        var lb = el('button', 'cso-cps-lang-btn' + (state.lang === lk ? ' is-active' : ''), lk === 'en' ? 'EN' : 'ଓଡ଼ିଆ');
        lb.type = 'button';
        lb.setAttribute('aria-pressed', state.lang === lk ? 'true' : 'false');
        lb.addEventListener('click', function () { state.lang = lk; render(); });
        langToggle.appendChild(lb);
      });
      headCtl.appendChild(langToggle);
      head.appendChild(headCtl);
      card.appendChild(head);

      // Compact Grid
      var grid = el('div', 'cso-cps-grid');
      function addField(label, ctrl) {
        var box = el('div', 'cso-cps-field');
        var lbl = el('label', 'cso-cps-label', label);
        if (ctrl.id) lbl.setAttribute('for', ctrl.id);
        box.appendChild(lbl);
        box.appendChild(ctrl);
        grid.appendChild(box);
      }

      var dobInp = el('input', 'cso-cps-input');
      dobInp.id = 'cso-cps-dob';
      dobInp.type = 'date';
      dobInp.value = state.dob;
      dobInp.addEventListener('change', function () { state.dob = dobInp.value || DEFAULT_PROFILE.dob; });
      addField(orMode ? 'ଜନ୍ମ ତାରିଖ (DOB)' : 'Date of Birth', dobInp);

      var catSel = el('select', 'cso-cps-input');
      catSel.id = 'cso-cps-cat';
      [
        { id: 'ur', en: 'UR / General', or: 'ସାଧାରଣ (UR)' },
        { id: 'ews', en: 'EWS', or: 'EWS' },
        { id: 'sebc', en: 'SEBC', or: 'SEBC' },
        { id: 'sc', en: 'SC', or: 'SC' },
        { id: 'st', en: 'ST', or: 'ST' }
      ].forEach(function (c) {
        var opt = el('option', '', orMode ? c.or : c.en);
        opt.value = c.id;
        if (c.id === state.category) opt.selected = true;
        catSel.appendChild(opt);
      });
      catSel.addEventListener('change', function () { state.category = catSel.value; });
      addField(orMode ? 'ବର୍ଗ (Category)' : 'Social Category', catSel);

      var genSel = el('select', 'cso-cps-input');
      genSel.id = 'cso-cps-gender';
      [
        { id: 'male', en: 'Male', or: 'ପୁରୁଷ' },
        { id: 'female', en: 'Female', or: 'ମହିଳା' },
        { id: 'transgender', en: 'Transgender', or: 'ତୃତୀୟ ଲିଙ୍ଗ' }
      ].forEach(function (g) {
        var opt = el('option', '', orMode ? g.or : g.en);
        opt.value = g.id;
        if (g.id === state.gender) opt.selected = true;
        genSel.appendChild(opt);
      });
      genSel.addEventListener('change', function () { state.gender = genSel.value; });
      addField(orMode ? 'ଲିଙ୍ଗ (Gender)' : 'Gender', genSel);

      var distSel = el('select', 'cso-cps-input');
      distSel.id = 'cso-cps-dist';
      ODISHA_DISTRICTS.forEach(function (d) {
        var opt = el('option', '', d);
        opt.value = d;
        if (d === state.homeDistrict) opt.selected = true;
        distSel.appendChild(opt);
      });
      distSel.addEventListener('change', function () { state.homeDistrict = distSel.value; });
      addField(orMode ? 'ନିଜ ଜିଲ୍ଲା (Home District)' : 'Home District (30 Odisha)', distSel);

      var qualSel = el('select', 'cso-cps-input');
      qualSel.id = 'cso-cps-qual';
      [
        { id: '10th', en: '10th Pass', or: '୧୦ମ ପାସ୍' },
        { id: 'plus-2', en: '12th / +2', or: '+୨ ପାସ୍' },
        { id: 'iti-diploma', en: 'ITI / Diploma', or: 'ITI / ଡିପ୍ଲୋମା' },
        { id: 'graduate', en: 'Graduate', or: 'ସ୍ନାତକ' },
        { id: 'bed-deled', en: 'B.Ed. / D.El.Ed.', or: 'B.Ed. / D.El.Ed.' },
        { id: 'pg', en: 'Post-Graduate', or: 'ସ୍ନାତକୋତ୍ତର (PG)' }
      ].forEach(function (q) {
        var opt = el('option', '', orMode ? q.or : q.en);
        opt.value = q.id;
        if (q.id === state.qualification) opt.selected = true;
        qualSel.appendChild(opt);
      });
      qualSel.addEventListener('change', function () { state.qualification = qualSel.value; });
      addField(orMode ? 'ସର୍ବୋଚ୍ଚ ଯୋଗ୍ୟତା' : 'Highest Qualification', qualSel);

      card.appendChild(grid);

      // Footer Row: PwBD checkbox + Sync & Reset Buttons
      var foot = el('div', 'cso-cps-actions');
      var pwbdLbl = el('label', 'cso-cps-check-pill');
      var pwbdCb = el('input', 'cso-cps-checkbox');
      pwbdCb.type = 'checkbox';
      pwbdCb.checked = Boolean(state.pwbd);
      pwbdCb.addEventListener('change', function () { state.pwbd = pwbdCb.checked; });
      pwbdLbl.appendChild(pwbdCb);
      pwbdLbl.appendChild(el('span', '', orMode ? 'ଭିନ୍ନକ୍ଷମ PwBD (≥ 40%)' : 'PwBD (≥ 40% Disability)'));
      foot.appendChild(pwbdLbl);

      var syncBtn = el('button', 'cso-cps-btn cso-cps-btn--primary', orMode ? '⚡ ସମସ୍ତ ୫ଟି ଟୁଲ୍ ସିଙ୍କ୍ ଓ ଅଟୋ-ଫିଲ୍ କରନ୍ତୁ' : '⚡ Sync & Auto-Fill All Tools');
      syncBtn.type = 'button';
      syncBtn.addEventListener('click', function () {
        syncProfileAcrossTools(state);
        state.lastSynced = true;
        render();
      });
      foot.appendChild(syncBtn);

      var resetBtn = el('button', 'cso-cps-btn', orMode ? '↺ ପ୍ରୋଫାଇଲ୍ ରିସେଟ୍' : '↺ Reset Profile');
      resetBtn.type = 'button';
      resetBtn.addEventListener('click', function () {
        Object.assign(state, normalizeProfile(DEFAULT_PROFILE));
        syncProfileAcrossTools(state);
        state.lastSynced = false;
        render();
      });
      foot.appendChild(resetBtn);

      card.appendChild(foot);
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
    PROFILE_KEY: PROFILE_KEY,
    DOWNSTREAM_KEYS: DOWNSTREAM_KEYS,
    ODISHA_DISTRICTS: ODISHA_DISTRICTS,
    DEFAULT_PROFILE: DEFAULT_PROFILE,
    normalizeProfile: normalizeProfile,
    syncProfileAcrossTools: syncProfileAcrossTools,
    mount: mount
  };
});
