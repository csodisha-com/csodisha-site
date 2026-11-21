/* v177: Unified Candidate Hub — Profile Summary, Live Eligibility Matches,
   Upcoming Deadlines, Study Revise Again Tracker, Quick Toolkit & JSON Backup/Restore.
   Strict CSP: DOM APIs (createElement / textContent / addEventListener) only. */
(function (root) {
  'use strict';

  var PROFILE_KEY = 'cso_eligibility_profile';
  var MISTAKE_DECK_KEY = 'cso_study_mistake_deck';
  var LANG_MODE_KEY = 'cso_study_lang_mode';
  var BOOKMARKS_KEY = 'cso_candidate_bookmarks_v1';

  var DISTRICTS = [
    'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 'Deogarh',
    'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi',
    'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj',
    'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'
  ];
  var QUALIFICATIONS = ['10th', '12th', 'Graduate', 'Post-Graduate', 'B.Ed / Diploma', 'B.Tech / Engineering'];
  var CATEGORIES = ['UR', 'SEBC', 'SC', 'ST', 'EWS', 'PwD', 'Women'];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }

  function readJson(key, fallback, storage) {
    var st = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    try {
      var raw = st && st.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) { return fallback; }
  }

  function writeJson(key, val, storage) {
    var st = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    try { if (st) st.setItem(key, JSON.stringify(val)); } catch (_) {}
  }

  function computeDaysLeft(dateStr, nowMs) {
    var target = Date.parse(String(dateStr || ''));
    if (isNaN(target)) return null;
    var now = new Date(nowMs === undefined ? Date.now() : nowMs);
    var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    var tDate = new Date(target);
    var targetStart = new Date(tDate.getFullYear(), tDate.getMonth(), tDate.getDate()).getTime();
    return Math.round((targetStart - todayStart) / 86400000);
  }

  function formatCountdownLabel(daysLeft) {
    if (daysLeft === null) return 'Upcoming';
    if (daysLeft < 0) return 'Closed';
    if (daysLeft === 0) return 'Closing Today';
    if (daysLeft === 1) return '1 day left';
    return daysLeft + ' days left';
  }

  function evaluateMatch(item, profile) {
    if (!profile) return { eligible: false, districtMatch: false };
    var hay = [item.title, item.qualification, item.category, item.summary, item.state, item.district].filter(Boolean).join(' ').toLowerCase();
    var eligible = true;
    if (profile.qualification) {
      var q = String(profile.qualification).toLowerCase();
      if (q.includes('10th') && /\b(graduate|post-graduate|b\.tech)\b/.test(hay) && !/\b10th\b/.test(hay)) {
        eligible = false;
      }
    }
    var dist = String(profile.district || '').trim().toLowerCase();
    var districtMatch = Boolean(dist && hay.includes(dist));
    return { eligible: eligible, districtMatch: districtMatch };
  }

  function buildBackupPayload(storage) {
    var st = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    return {
      version: 177,
      exported_at: new Date().toISOString(),
      cso_eligibility_profile: readJson(PROFILE_KEY, null, st),
      cso_study_mistake_deck: readJson(MISTAKE_DECK_KEY, [], st),
      cso_study_lang_mode: (st && st.getItem(LANG_MODE_KEY)) || 'en',
      cso_candidate_bookmarks_v1: readJson(BOOKMARKS_KEY, { jobs: [], schemes: [], study: [] }, st)
    };
  }

  function validateBackupPayload(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return { ok: false, error: 'Invalid backup JSON object.' };
    if (obj.cso_eligibility_profile !== undefined && obj.cso_eligibility_profile !== null && typeof obj.cso_eligibility_profile !== 'object') {
      return { ok: false, error: 'Invalid eligibility profile format.' };
    }
    if (obj.cso_study_mistake_deck !== undefined && !Array.isArray(obj.cso_study_mistake_deck)) {
      return { ok: false, error: 'Invalid mistake deck format.' };
    }
    if (obj.cso_study_lang_mode !== undefined && !['en', 'or', 'dual'].includes(String(obj.cso_study_lang_mode))) {
      return { ok: false, error: 'Invalid language mode value.' };
    }
    var hasKnown = ['cso_eligibility_profile', 'cso_study_mistake_deck', 'cso_study_lang_mode', 'cso_candidate_bookmarks_v1']
      .some(function (k) { return Object.prototype.hasOwnProperty.call(obj, k); });
    if (!hasKnown) return { ok: false, error: 'Backup file does not contain CSO Candidate Hub data.' };
    return { ok: true };
  }

  function restoreBackupPayload(obj, storage) {
    var check = validateBackupPayload(obj);
    if (!check.ok) return check;
    var st = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (Object.prototype.hasOwnProperty.call(obj, 'cso_eligibility_profile')) {
      if (obj.cso_eligibility_profile) writeJson(PROFILE_KEY, obj.cso_eligibility_profile, st);
      else if (st) st.removeItem(PROFILE_KEY);
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'cso_study_mistake_deck')) {
      writeJson(MISTAKE_DECK_KEY, obj.cso_study_mistake_deck || [], st);
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'cso_study_lang_mode')) {
      try { if (st) st.setItem(LANG_MODE_KEY, String(obj.cso_study_lang_mode || 'en')); } catch (_) {}
    }
    if (Object.prototype.hasOwnProperty.call(obj, 'cso_candidate_bookmarks_v1')) {
      writeJson(BOOKMARKS_KEY, obj.cso_candidate_bookmarks_v1 || { jobs: [], schemes: [], study: [] }, st);
    }
    return { ok: true };
  }

  function notify(msg) {
    if (typeof window !== 'undefined' && window.CSOStudentUtils && typeof window.CSOStudentUtils.showToast === 'function') {
      window.CSOStudentUtils.showToast(msg);
      return;
    }
    var box = document.getElementById('cso-toast-container');
    if (!box) return;
    var t = el('div', 'cso-toast', msg);
    box.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 3200);
  }

  function initUnifiedHub() {
    var rootEl = document.getElementById('cso-unified-hub-root');
    if (!rootEl) return;

    var liveJobs = [];
    var liveSchemes = [];
    var editOpen = false;

    function renderAll() {
      clear(rootEl);
      var profile = readJson(PROFILE_KEY, null);
      var bookmarks = readJson(BOOKMARKS_KEY, { jobs: [], schemes: [], study: [] });
      var mistakeDeck = readJson(MISTAKE_DECK_KEY, []);
      var langMode = (typeof localStorage !== 'undefined' && localStorage.getItem(LANG_MODE_KEY)) || 'en';

      // 1. Profile Summary Card + Inline Edit Profile
      var profCard = el('section', 'cso-uh-card');
      var profHead = el('div', 'cso-uh-head');
      profHead.appendChild(el('h2', 'cso-uh-title', '👤 Candidate Eligibility Profile'));
      var editBtn = el('button', 'cso-uh-btn', editOpen ? 'Close Editor' : 'Edit Profile');
      editBtn.type = 'button';
      editBtn.id = 'cso-uh-edit-profile-btn';
      editBtn.addEventListener('click', function () { editOpen = !editOpen; renderAll(); });
      profHead.appendChild(editBtn);
      profCard.appendChild(profHead);

      if (profile) {
        var metaGrid = el('div', 'cso-uh-pills');
        metaGrid.append(
          el('span', 'cso-uh-pill', 'Age: ' + (profile.age || 'Not set')),
          el('span', 'cso-uh-pill', 'Qualification: ' + (profile.qualification || 'Any')),
          el('span', 'cso-uh-pill', 'Category: ' + (profile.category || 'UR')),
          el('span', 'cso-uh-pill', 'District: ' + (profile.district || 'All Odisha'))
        );
        profCard.appendChild(metaGrid);
      } else {
        profCard.appendChild(el('p', 'cso-uh-muted', 'Set your Age, Qualification, Category, and Home District to unlock personalized job & scheme matches.'));
      }

      if (editOpen) {
        var form = el('form', 'cso-uh-form');
        var ageInp = el('input', 'cso-uh-input');
        ageInp.type = 'number'; ageInp.min = '16'; ageInp.max = '65'; ageInp.placeholder = 'Age (e.g. 24)';
        ageInp.setAttribute('aria-label', 'Candidate Age');
        ageInp.value = (profile && profile.age) ? String(profile.age) : '';

        var qualSel = el('select', 'cso-uh-input');
        qualSel.setAttribute('aria-label', 'Highest Qualification');
        qualSel.appendChild(el('option', '', 'Qualification…'));
        qualSel.firstChild.value = '';
        QUALIFICATIONS.forEach(function (q) {
          var o = el('option', '', q); o.value = q; qualSel.appendChild(o);
        });
        qualSel.value = (profile && profile.qualification) || '';

        var catSel = el('select', 'cso-uh-input');
        catSel.setAttribute('aria-label', 'Reservation Category');
        CATEGORIES.forEach(function (c) {
          var o = el('option', '', c); o.value = c; catSel.appendChild(o);
        });
        catSel.value = (profile && profile.category) || 'UR';

        var distSel = el('select', 'cso-uh-input');
        distSel.setAttribute('aria-label', 'Home District in Odisha');
        distSel.appendChild(el('option', '', 'All Odisha Districts'));
        distSel.firstChild.value = '';
        DISTRICTS.forEach(function (d) {
          var o = el('option', '', d); o.value = d; distSel.appendChild(o);
        });
        distSel.value = (profile && profile.district) || '';

        var saveBtn = el('button', 'cso-uh-btn cso-uh-btn--primary', 'Save Profile');
        saveBtn.type = 'submit';
        form.append(ageInp, qualSel, catSel, distSel, saveBtn);
        form.addEventListener('submit', function (e) {
          e.preventDefault();
          var next = {
            age: ageInp.value ? Number(ageInp.value) : null,
            qualification: qualSel.value,
            category: catSel.value,
            district: distSel.value
          };
          writeJson(PROFILE_KEY, next);
          editOpen = false;
          notify('Profile saved! Updating matches…');
          renderAll();
        });
        profCard.appendChild(form);
      }
      rootEl.appendChild(profCard);

      // 2. Matching Your Profile
      var matchCard = el('section', 'cso-uh-card');
      matchCard.appendChild(el('h2', 'cso-uh-title', '🎯 Matching Your Profile'));
      var combined = liveJobs.map(function (j) {
        return { kind: 'job', title: j.title, org: j.organisation || 'Odisha Govt', url: '/jobs-careers/?job=' + encodeURIComponent(j.slug || ''), last_date: j.last_date || '', qualification: j.qualification || '', category: j.category || '', summary: j.summary || '', state: j.state || 'Odisha' };
      }).concat(liveSchemes.map(function (s) {
        return { kind: 'scheme', title: s.title, org: s.department || s.gov_level || 'Odisha Scheme', url: '/schemes/?q=' + encodeURIComponent(s.title || ''), last_date: '', qualification: '', category: s.category || '', summary: s.benefit_summary || s.summary || '', state: 'Odisha' };
      }));

      var matches = combined.map(function (it) {
        var res = evaluateMatch(it, profile);
        return Object.assign({}, it, res);
      }).filter(function (it) { return !profile || it.eligible; }).slice(0, 4);

      if (!matches.length) {
        var emptyMatch = el('div', 'cso-uh-empty');
        emptyMatch.appendChild(el('p', 'cso-uh-muted', 'No active notices loaded yet. Browse the full directories below.'));
        var jLink = el('a', 'cso-uh-btn', 'Browse Jobs & Careers'); jLink.href = '/jobs-careers/';
        var sLink = el('a', 'cso-uh-btn', 'Browse Schemes'); sLink.href = '/schemes/';
        emptyMatch.append(jLink, sLink);
        matchCard.appendChild(emptyMatch);
      } else {
        var matchGrid = el('div', 'cso-uh-grid');
        matches.forEach(function (it) {
          var itemEl = el('article', 'cso-uh-item');
          var badges = el('div', 'cso-uh-pills');
          if (profile && it.eligible) badges.appendChild(el('span', 'cso-uh-badge is-ok', '✓ Eligible'));
          if (profile && it.districtMatch) badges.appendChild(el('span', 'cso-uh-badge is-info', '📍 District Match'));
          itemEl.append(badges, el('h3', 'cso-uh-item-title', it.title), el('p', 'cso-uh-muted', it.org));

          var acts = el('div', 'cso-uh-actions');
          var viewA = el('a', 'cso-uh-btn cso-uh-btn--primary', 'View Details');
          viewA.href = it.url;
          var shareBtn = el('button', 'cso-uh-btn', '📲 Share');
          shareBtn.type = 'button';
          shareBtn.addEventListener('click', function () {
            if (window.CSOStudentUtils && typeof window.CSOStudentUtils.openShareSheet === 'function') {
              window.CSOStudentUtils.openShareSheet({ title: it.title, organisation: it.org, lastDate: it.last_date, url: window.location.origin + it.url });
            }
          });
          acts.append(viewA, shareBtn);
          if (it.last_date) {
            var remBtn = el('button', 'cso-uh-btn', '📅 Remind');
            remBtn.type = 'button';
            remBtn.addEventListener('click', function () {
              if (window.CSOStudentUtils && typeof window.CSOStudentUtils.downloadJobIcs === 'function') {
                window.CSOStudentUtils.downloadJobIcs({ title: it.title, organisation: it.org, lastDate: it.last_date, url: window.location.origin + it.url });
              }
            });
            acts.appendChild(remBtn);
          }
          itemEl.appendChild(acts);
          matchGrid.appendChild(itemEl);
        });
        matchCard.appendChild(matchGrid);
      }
      rootEl.appendChild(matchCard);

      // 3. Upcoming Deadlines Countdown & Saved Items
      var dlCard = el('section', 'cso-uh-card');
      dlCard.appendChild(el('h2', 'cso-uh-title', '⏳ Upcoming Deadlines'));
      var savedJobs = Array.isArray(bookmarks.jobs) ? bookmarks.jobs : [];
      var savedSchemes = Array.isArray(bookmarks.schemes) ? bookmarks.schemes : [];
      var deadlinePool = savedJobs.concat(savedSchemes).map(function (b) {
        return { title: b.title || b.slug, org: b.organisation || 'Saved Item', last_date: b.last_date || '', url: b.url || '/jobs-careers/' };
      }).concat(matches.filter(function (m) { return Boolean(m.last_date); }));

      var upcoming = deadlinePool.map(function (d) {
        return Object.assign({}, d, { daysLeft: computeDaysLeft(d.last_date) });
      }).filter(function (d) { return d.daysLeft !== null && d.daysLeft >= 0; })
        .sort(function (a, b) { return a.daysLeft - b.daysLeft; })
        .slice(0, 5);

      if (!upcoming.length && !savedJobs.length && !savedSchemes.length) {
        var emptyDl = el('div', 'cso-uh-empty');
        emptyDl.appendChild(el('p', 'cso-uh-muted', 'No saved jobs or upcoming deadlines yet. Save notices from Jobs or Schemes to track them here.'));
        var jB = el('a', 'cso-uh-btn', 'Explore Jobs & Careers →'); jB.href = '/jobs-careers/';
        var sB = el('a', 'cso-uh-btn', 'Explore Schemes →'); sB.href = '/schemes/';
        emptyDl.append(jB, sB);
        dlCard.appendChild(emptyDl);
      } else {
        var dlList = el('div', 'cso-uh-list');
        upcoming.forEach(function (d) {
          var row = el('div', 'cso-uh-row');
          var badgeCls = d.daysLeft <= 2 ? 'cso-uh-badge is-warn' : 'cso-uh-badge is-ok';
          var info = el('div', 'cso-uh-row-info');
          info.append(el('strong', '', d.title), el('span', badgeCls, formatCountdownLabel(d.daysLeft)));
          var remBtn = el('button', 'cso-uh-btn', '📅 Remind (.ics)');
          remBtn.type = 'button';
          remBtn.addEventListener('click', function () {
            if (window.CSOStudentUtils && typeof window.CSOStudentUtils.downloadJobIcs === 'function') {
              window.CSOStudentUtils.downloadJobIcs({ title: d.title, organisation: d.org, lastDate: d.last_date, url: window.location.origin + d.url });
            }
          });
          row.append(info, remBtn);
          dlList.appendChild(row);
        });
        dlCard.appendChild(dlList);
      }
      rootEl.appendChild(dlCard);

      // 4. Study & Revision Tracker + Quick Student Toolkit
      var dualGrid = el('div', 'cso-uh-grid');

      var studyCard = el('section', 'cso-uh-card');
      studyCard.appendChild(el('h2', 'cso-uh-title', '📖 Study & Revision Tracker'));
      var langLabel = langMode === 'or' ? 'ଓଡ଼ିଆ' : (langMode === 'dual' ? 'Dual (EN + ଓଡ଼ିଆ)' : 'EN');
      studyCard.append(
        el('div', 'cso-uh-pills', ''),
        el('p', 'cso-uh-muted', 'Flagged flashcards and PYQs waiting for mastery.')
      );
      studyCard.querySelector('.cso-uh-pills').append(
        el('span', 'cso-uh-badge is-info', '🔁 Revise Again (' + mistakeDeck.length + ')'),
        el('span', 'cso-uh-pill', 'Reader Mode: ' + langLabel)
      );
      var studyLink = el('a', 'cso-uh-btn cso-uh-btn--primary', 'Open Study Library →');
      studyLink.href = '/study-library/';
      studyCard.appendChild(studyLink);

      var tkCard = el('section', 'cso-uh-card');
      tkCard.appendChild(el('h2', 'cso-uh-title', '🧰 Quick Student Toolkit'));
      tkCard.appendChild(el('p', 'cso-uh-muted', '100% offline browser tools for Odisha exam aspirants.'));
      var tkActions = el('div', 'cso-uh-actions');
      var t1 = el('a', 'cso-uh-btn', '📸 Photo / Sign Resizer'); t1.href = '/tools/#photo-resizer';
      var t2 = el('a', 'cso-uh-btn', '🎂 Age Calculator'); t2.href = '/tools/#age-calculator';
      var t3 = el('a', 'cso-uh-btn', '🔍 Scam-Check'); t3.href = '/tools/#scam-checker';
      tkActions.append(t1, t2, t3);
      tkCard.appendChild(tkActions);

      dualGrid.append(studyCard, tkCard);
      rootEl.appendChild(dualGrid);

      // 5. One-Tap Local Backup & Restore (.json)
      var bakCard = el('section', 'cso-uh-card');
      bakCard.appendChild(el('h2', 'cso-uh-title', '💾 Local Data Backup & Restore (.json)'));
      bakCard.appendChild(el('p', 'cso-uh-muted', 'Export or restore your eligibility profile, saved bookmarks, study mistake deck, and language preference locally.'));
      var bakActions = el('div', 'cso-uh-actions');
      var expBtn = el('button', 'cso-uh-btn cso-uh-btn--primary', '⬇ Export My Data');
      expBtn.type = 'button';
      expBtn.id = 'cso-uh-export-btn';
      expBtn.addEventListener('click', function () {
        var payload = buildBackupPayload();
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'cso-candidate-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        notify('Exported Candidate Hub backup (.json)');
      });

      var fileInp = el('input', 'cso-uh-file-hidden');
      fileInp.type = 'file';
      fileInp.accept = 'application/json,.json';
      fileInp.setAttribute('aria-label', 'Select backup JSON file');
      var impBtn = el('button', 'cso-uh-btn', '⬆ Restore Backup');
      impBtn.type = 'button';
      impBtn.id = 'cso-uh-restore-btn';
      impBtn.addEventListener('click', function () { fileInp.click(); });
      fileInp.addEventListener('change', function () {
        var f = fileInp.files && fileInp.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var parsed = JSON.parse(String(reader.result || ''));
            var res = restoreBackupPayload(parsed);
            if (!res.ok) { notify(res.error || 'Invalid backup file'); return; }
            notify('Backup restored successfully!');
            renderAll();
          } catch (_) {
            notify('Invalid JSON backup file.');
          }
        };
        reader.readAsText(f);
        fileInp.value = '';
      });

      bakActions.append(expBtn, impBtn, fileInp);
      bakCard.appendChild(bakActions);
      rootEl.appendChild(bakCard);
    }

    renderAll();

    if (typeof fetch === 'function') {
      Promise.all([
        fetch('/api/public/jobs?limit=20', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : { items: [] }; }).catch(function () { return { items: [] }; }),
        fetch('/api/public/schemes?limit=20', { credentials: 'same-origin' }).then(function (r) { return r.ok ? r.json() : { items: [] }; }).catch(function () { return { items: [] }; })
      ]).then(function (res) {
        liveJobs = Array.isArray(res[0] && res[0].items) ? res[0].items : [];
        liveSchemes = Array.isArray(res[1] && res[1].items) ? res[1].items : [];
        renderAll();
      }).catch(function () {});
    }
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUnifiedHub);
    else initUnifiedHub();
  }

  root.CSOCandidateHub = {
    DISTRICTS: DISTRICTS,
    computeDaysLeft: computeDaysLeft,
    formatCountdownLabel: formatCountdownLabel,
    evaluateMatch: evaluateMatch,
    buildBackupPayload: buildBackupPayload,
    validateBackupPayload: validateBackupPayload,
    restoreBackupPayload: restoreBackupPayload
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.CSOCandidateHub;
})(typeof window !== 'undefined' ? window : globalThis);
