/**
 * Common Sense Odisha — Candidate Saved-Search & District Alert Watchlist (v404)
 * Local-first preferences in localStorage (`cso_candidate_watchlist_v1`) with cross-tab sync.
 * Lets candidates pin preferred Odisha districts, exam tracks, and saved keywords so a live
 * "Matching Your Watchlist" filter pill and card highlight badge work across /jobs/ and /updates/.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOWatchlist = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOWatchlist = api;
})(function (win, doc) {
  'use strict';

  var STORAGE_KEY = 'cso_candidate_watchlist_v1';

  var EXAM_TRACKS = [
    {
      key: 'teaching-tet',
      en: 'Teaching / TET',
      or: 'ଶିକ୍ଷକ / TET',
      pattern: /\b(oavs|otet|osstet|ctet|tet|teacher|teaching|professor|lecturer|b\.?ed|itep|prt|tgt|pgt|nvs|kvs|ssb|bed)\b/i
    },
    {
      key: 'opsc-ossc',
      en: 'OPSC / OSSC / OSSSC',
      or: 'OPSC / OSSC / OSSSC',
      pattern: /\b(opsc|ossc|osssc|oas|ocs|cgl|chsl|ri\b|ari\b|amin|peo|ja\b|junior\s+assistant|odisha\s+civil|forest\s+guard|livestock)\b/i
    },
    {
      key: 'central-exams',
      en: 'Central Exams',
      or: 'କେନ୍ଦ୍ରୀୟ ପରୀକ୍ଷା',
      pattern: /\b(upsc|ssc|rrb|railway|ibps|sbi|rbi|bank|banking|ugc\s*net|nta|csir|gate|central|esic|epfo|post\s+office|india\s+post)\b/i
    },
    {
      key: 'police-defence',
      en: 'Police & Defence',
      or: 'ପୋଲିସ୍ ଓ ପ୍ରତିରକ୍ଷା',
      pattern: /\b(police|constable|si\b|sub\s*inspector|fireman|home\s+guard|army|navy|air\s*force|agniveer|defence|bsf|crpf|cisf|nda|cds)\b/i
    },
    {
      key: 'medical-health',
      en: 'Medical & Health',
      or: 'ସ୍ୱାସ୍ଥ୍ୟ ଓ ମେଡିକାଲ୍',
      pattern: /\b(nursing|nurse|anm|gnm|nhm|aiims|medical|doctor|pharmacist|lab\s+technician|health|hospital|scb|mkcg|vimsar)\b/i
    },
    {
      key: 'scholarships-schemes',
      en: 'Scholarships & Schemes',
      or: 'ବୃତ୍ତି ଓ ଯୋଜନା',
      pattern: /\b(scholarship|stipend|nsp|medhabruti|gopabandhu|subhadra|scheme|yojana|welfare|fellowship)\b/i
    }
  ];

  var QUICK_DISTRICTS = [
    'khordha', 'cuttack', 'kalahandi', 'ganjam', 'sambalpur',
    'balasore', 'mayurbhanj', 'sundargarh', 'koraput', 'puri',
    'balangir', 'angul', 'jajpur', 'bhadrak', 'rayagada'
  ];

  function normalizePrefs(raw) {
    var obj = raw && typeof raw === 'object' ? raw : {};
    var dists = Array.isArray(obj.districts) ? obj.districts : [];
    var tracks = Array.isArray(obj.tracks) ? obj.tracks : [];
    var kws = Array.isArray(obj.keywords) ? obj.keywords : [];

    var dfApi = win && win.CSODistrictFilter;
    var cleanDists = [];
    dists.forEach(function (d) {
      var slug = (dfApi && typeof dfApi.resolveDistrictSlug === 'function')
        ? dfApi.resolveDistrictSlug(d)
        : String(d || '').toLowerCase().trim();
      if (slug && cleanDists.indexOf(slug) === -1) cleanDists.push(slug);
    });

    var validTrackKeys = EXAM_TRACKS.map(function (t) { return t.key; });
    var cleanTracks = [];
    tracks.forEach(function (t) {
      var k = String(t || '').toLowerCase().trim();
      if (validTrackKeys.indexOf(k) !== -1 && cleanTracks.indexOf(k) === -1) cleanTracks.push(k);
    });

    var cleanKws = [];
    kws.forEach(function (kw) {
      var s = String(kw || '').trim().slice(0, 48);
      if (s && cleanKws.indexOf(s.toLowerCase()) === -1) cleanKws.push(s);
    });

    return {
      districts: cleanDists,
      tracks: cleanTracks,
      keywords: cleanKws.slice(0, 10)
    };
  }

  function loadPreferences() {
    try {
      var raw = win && win.localStorage && win.localStorage.getItem(STORAGE_KEY);
      if (raw) return normalizePrefs(JSON.parse(raw));
    } catch (_) {}
    return { districts: [], tracks: [], keywords: [] };
  }

  function savePreferences(prefs) {
    var clean = normalizePrefs(prefs);
    try {
      if (win && win.localStorage) {
        win.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
      }
    } catch (_) {}
    return clean;
  }

  function hasPreferences(prefs) {
    var p = prefs || loadPreferences();
    return Boolean((p.districts && p.districts.length) || (p.tracks && p.tracks.length) || (p.keywords && p.keywords.length));
  }

  function extractHaystack(item) {
    if (!item || typeof item !== 'object') return '';
    var bi = item._cso_bilingual || {};
    return [
      item.title, item.title_en, item.title_or,
      item.summary, item.summary_en, item.summary_or,
      item.org, item.organization, item.organisation_en,
      item.category, item.district, item.location_district,
      item.qualification, item.keywords,
      bi.title_en, bi.title_or, bi.summary_en, bi.org, bi.district, bi.category,
      Array.isArray(item.tags) ? item.tags.join(' ') : ''
    ].filter(Boolean).join(' ');
  }

  function matchesWatchlist(item, prefs, dfApiOverride) {
    var p = normalizePrefs(prefs || loadPreferences());
    if (!hasPreferences(p)) return { matched: false, reasons: [] };

    var dfApi = dfApiOverride || (win && win.CSODistrictFilter);
    var hay = extractHaystack(item);
    var hayLower = hay.toLowerCase();
    var reasons = [];

    for (var i = 0; i < p.districts.length; i += 1) {
      var slug = p.districts[i];
      var hitDist = false;
      if (dfApi && typeof dfApi.matchDistrict === 'function') {
        hitDist = dfApi.matchDistrict(item, slug, { includeStatewide: false });
      } else {
        hitDist = hayLower.indexOf(slug) !== -1;
      }
      if (hitDist) {
        var dObj = dfApi && typeof dfApi.getDistrictBySlug === 'function' ? dfApi.getDistrictBySlug(slug) : null;
        reasons.push(dObj ? dObj.en : slug);
      }
    }

    for (var ti = 0; ti < p.tracks.length; ti += 1) {
      var tKey = p.tracks[ti];
      var trackDef = EXAM_TRACKS.find(function (t) { return t.key === tKey; });
      if (trackDef && trackDef.pattern.test(hay)) {
        reasons.push(trackDef.en);
      }
    }

    for (var ki = 0; ki < p.keywords.length; ki += 1) {
      var kw = p.keywords[ki];
      if (kw && hayLower.indexOf(kw.toLowerCase()) !== -1) {
        reasons.push('"' + kw + '"');
      }
    }

    return {
      matched: reasons.length > 0,
      reasons: reasons
    };
  }

  function countMatches(items, prefs, dfApiOverride) {
    var list = Array.isArray(items) ? items : [];
    var n = 0;
    for (var i = 0; i < list.length; i += 1) {
      if (matchesWatchlist(list[i], prefs, dfApiOverride).matched) n += 1;
    }
    return n;
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function createMatchBadge(item, prefs, isOr, dfApiOverride) {
    if (!doc) return null;
    var res = matchesWatchlist(item, prefs, dfApiOverride);
    if (!res.matched) return null;
    var reasonTxt = res.reasons.slice(0, 2).join(' · ');
    var label = isOr
      ? ('⭐ ୱାଚଲିଷ୍ଟ ମ୍ୟାଚ୍' + (reasonTxt ? (' · ' + reasonTxt) : ''))
      : ('⭐ Watchlist Match' + (reasonTxt ? (' · ' + reasonTxt) : ''));
    return el('span', 'cso-wl-match-badge', label);
  }

  function mountWatchlistBar(container, config) {
    if (!doc || !container) return null;
    var cfg = config || {};
    var drawerOpen = false;
    var current = {
      activeOnly: Boolean(cfg.activeOnly),
      lang: cfg.lang === 'or' ? 'or' : 'en',
      items: Array.isArray(cfg.items) ? cfg.items : [],
      prefs: loadPreferences()
    };

    function emitChange() {
      render();
      if (typeof cfg.onChange === 'function') {
        cfg.onChange({ activeOnly: current.activeOnly, prefs: current.prefs });
      }
    }

    function toggleDistrict(slug) {
      var list = current.prefs.districts.slice();
      var idx = list.indexOf(slug);
      if (idx === -1) list.push(slug);
      else list.splice(idx, 1);
      current.prefs = savePreferences({
        districts: list,
        tracks: current.prefs.tracks,
        keywords: current.prefs.keywords
      });
      if (!hasPreferences(current.prefs)) current.activeOnly = false;
      emitChange();
    }

    function toggleTrack(trackKey) {
      var list = current.prefs.tracks.slice();
      var idx = list.indexOf(trackKey);
      if (idx === -1) list.push(trackKey);
      else list.splice(idx, 1);
      current.prefs = savePreferences({
        districts: current.prefs.districts,
        tracks: list,
        keywords: current.prefs.keywords
      });
      if (!hasPreferences(current.prefs)) current.activeOnly = false;
      emitChange();
    }

    function addKeyword(kw) {
      var clean = String(kw || '').trim();
      if (!clean) return;
      var list = current.prefs.keywords.slice();
      if (!list.some(function (x) { return x.toLowerCase() === clean.toLowerCase(); })) {
        list.push(clean);
      }
      current.prefs = savePreferences({
        districts: current.prefs.districts,
        tracks: current.prefs.tracks,
        keywords: list
      });
      emitChange();
    }

    function removeKeyword(kw) {
      var list = current.prefs.keywords.filter(function (x) { return x !== kw; });
      current.prefs = savePreferences({
        districts: current.prefs.districts,
        tracks: current.prefs.tracks,
        keywords: list
      });
      if (!hasPreferences(current.prefs)) current.activeOnly = false;
      emitChange();
    }

    function render() {
      var orMode = current.lang === 'or';
      var hasPrefs = hasPreferences(current.prefs);
      var matchCount = hasPrefs ? countMatches(current.items, current.prefs) : 0;
      var dfApi = win && win.CSODistrictFilter;

      var bar = el('section', 'cso-wl-bar');
      bar.setAttribute('aria-label', orMode ? 'ମୋର ୱାଚଲିଷ୍ଟ ଓ ସେଭ୍ ସର୍ଚ୍ଚ' : 'Candidate Alert Watchlist');

      var top = el('div', 'cso-wl-top');

      var matchBtn = el('button', 'cso-wl-filter-btn' + (current.activeOnly ? ' is-active' : ''), orMode
        ? ('⭐ ମୋର ୱାଚଲିଷ୍ଟ ସହ ମେଳ (' + matchCount + ')')
        : ('⭐ Matching Your Watchlist (' + matchCount + ')'));
      matchBtn.type = 'button';
      matchBtn.setAttribute('aria-pressed', current.activeOnly ? 'true' : 'false');
      matchBtn.addEventListener('click', function () {
        if (!hasPrefs) {
          drawerOpen = true;
          render();
          return;
        }
        current.activeOnly = !current.activeOnly;
        emitChange();
      });
      top.appendChild(matchBtn);

      var summary = el('div', 'cso-wl-pinned');
      if (!hasPrefs) {
        summary.appendChild(el('span', 'cso-wl-hint', orMode
          ? 'ଆପଣଙ୍କ ପ୍ରିୟ ଜିଲ୍ଲା ଓ ପରୀକ୍ଷା ଟ୍ରାକ୍ ପିନ୍ କରନ୍ତୁ।'
          : 'Pin your preferred Odisha districts & exam tracks for 1-click alert highlighting.'));
      } else {
        current.prefs.districts.forEach(function (slug) {
          var dObj = dfApi && dfApi.getDistrictBySlug ? dfApi.getDistrictBySlug(slug) : null;
          summary.appendChild(el('span', 'cso-wl-chip', '📍 ' + (dObj ? (orMode ? dObj.or : dObj.en) : slug)));
        });
        current.prefs.tracks.forEach(function (tk) {
          var tObj = EXAM_TRACKS.find(function (t) { return t.key === tk; });
          summary.appendChild(el('span', 'cso-wl-chip', '🎯 ' + (tObj ? (orMode ? tObj.or : tObj.en) : tk)));
        });
        current.prefs.keywords.forEach(function (kw) {
          summary.appendChild(el('span', 'cso-wl-chip', '🔎 ' + kw));
        });
      }
      top.appendChild(summary);

      var editBtn = el('button', 'cso-wl-edit-btn' + (drawerOpen ? ' is-open' : ''), orMode
        ? (drawerOpen ? '✓ ସେଭ୍ ଓ ବନ୍ଦ' : '⚙️ ୱାଚଲିଷ୍ଟ ସେଟ୍ କରନ୍ତୁ')
        : (drawerOpen ? '✓ Done' : '⚙️ Edit Watchlist'));
      editBtn.type = 'button';
      editBtn.setAttribute('aria-expanded', drawerOpen ? 'true' : 'false');
      editBtn.addEventListener('click', function () {
        drawerOpen = !drawerOpen;
        render();
      });
      top.appendChild(editBtn);

      bar.appendChild(top);

      if (drawerOpen) {
        var drawer = el('div', 'cso-wl-drawer');

        // 1. Exam Tracks
        drawer.appendChild(el('div', 'cso-wl-sec-label', orMode ? '🎯 ପରୀକ୍ଷା ଟ୍ରାକ୍ ପିନ୍ କରନ୍ତୁ' : '🎯 Pin Exam Tracks'));
        var trackWrap = el('div', 'cso-wl-pill-group');
        EXAM_TRACKS.forEach(function (t) {
          var on = current.prefs.tracks.indexOf(t.key) !== -1;
          var tb = el('button', 'cso-wl-toggle-pill' + (on ? ' is-selected' : ''), (on ? '✓ ' : '+ ') + (orMode ? t.or : t.en));
          tb.type = 'button';
          tb.setAttribute('aria-pressed', on ? 'true' : 'false');
          tb.addEventListener('click', function () { toggleTrack(t.key); });
          trackWrap.appendChild(tb);
        });
        drawer.appendChild(trackWrap);

        // 2. Districts
        drawer.appendChild(el('div', 'cso-wl-sec-label', orMode ? '📍 ପ୍ରିୟ ଓଡ଼ିଶା ଜିଲ୍ଲା ପିନ୍ କରନ୍ତୁ' : '📍 Pin Preferred Odisha Districts'));
        var distWrap = el('div', 'cso-wl-pill-group');
        var distList = (dfApi && Array.isArray(dfApi.DISTRICTS)) ? dfApi.DISTRICTS : QUICK_DISTRICTS.map(function (s) { return { slug: s, en: s, or: s }; });
        distList.forEach(function (d) {
          var on = current.prefs.districts.indexOf(d.slug) !== -1;
          var db = el('button', 'cso-wl-toggle-pill' + (on ? ' is-selected' : ''), (on ? '✓ ' : '+ ') + (orMode ? d.or : d.en));
          db.type = 'button';
          db.setAttribute('aria-pressed', on ? 'true' : 'false');
          db.addEventListener('click', function () { toggleDistrict(d.slug); });
          distWrap.appendChild(db);
        });
        drawer.appendChild(distWrap);

        // 3. Custom Saved Keywords
        drawer.appendChild(el('div', 'cso-wl-sec-label', orMode ? '🔎 କଷ୍ଟମ୍ ସର୍ଚ୍ଚ କୀୱାର୍ଡ ସେଭ୍ କରନ୍ତୁ' : '🔎 Save Custom Search Keywords'));
        var kwForm = el('div', 'cso-wl-kw-row');
        var kwInp = el('input', 'cso-wl-kw-input');
        kwInp.type = 'text';
        kwInp.placeholder = orMode ? 'ଯଥା: ITEP, Librarian, RI…' : 'e.g. ITEP, Librarian, RI, Walk-in…';
        kwInp.setAttribute('aria-label', orMode ? 'କୀୱାର୍ଡ ଯୋଡ଼ନ୍ତୁ' : 'Add saved search keyword');
        var kwAdd = el('button', 'cso-wl-edit-btn', orMode ? '+ ଯୋଡ଼ନ୍ତୁ' : '+ Pin Keyword');
        kwAdd.type = 'button';
        kwAdd.addEventListener('click', function () {
          if (kwInp.value.trim()) {
            addKeyword(kwInp.value);
            kwInp.value = '';
          }
        });
        kwInp.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' && kwInp.value.trim()) {
            ev.preventDefault();
            addKeyword(kwInp.value);
            kwInp.value = '';
          }
        });
        kwForm.append(kwInp, kwAdd);
        if (hasPrefs) {
          var clearAll = el('button', 'cso-wl-clear-btn', orMode ? 'ସବୁ ସଫା କରନ୍ତୁ' : 'Clear Watchlist');
          clearAll.type = 'button';
          clearAll.addEventListener('click', function () {
            current.prefs = savePreferences({ districts: [], tracks: [], keywords: [] });
            current.activeOnly = false;
            emitChange();
          });
          kwForm.appendChild(clearAll);
        }
        drawer.appendChild(kwForm);

        if (current.prefs.keywords.length) {
          var kwChips = el('div', 'cso-wl-pill-group');
          current.prefs.keywords.forEach(function (kw) {
            var kb = el('button', 'cso-wl-toggle-pill is-selected', '✕ ' + kw);
            kb.type = 'button';
            kb.addEventListener('click', function () { removeKeyword(kw); });
            kwChips.appendChild(kb);
          });
          drawer.appendChild(kwChips);
        }

        bar.appendChild(drawer);
      }

      container.replaceChildren(bar);
    }

    if (win && typeof win.addEventListener === 'function') {
      win.addEventListener('storage', function (ev) {
        if (ev && ev.key === STORAGE_KEY) {
          current.prefs = loadPreferences();
          if (!hasPreferences(current.prefs)) current.activeOnly = false;
          emitChange();
        }
      });
    }

    render();
    return {
      update: function (next) {
        if (!next) return;
        if (next.activeOnly !== undefined) current.activeOnly = Boolean(next.activeOnly);
        if (next.lang !== undefined) current.lang = next.lang === 'or' ? 'or' : 'en';
        if (Array.isArray(next.items)) current.items = next.items;
        current.prefs = loadPreferences();
        render();
      }
    };
  }

  return {
    version: 'v404',
    STORAGE_KEY: STORAGE_KEY,
    EXAM_TRACKS: EXAM_TRACKS,
    loadPreferences: loadPreferences,
    savePreferences: savePreferences,
    hasPreferences: hasPreferences,
    matchesWatchlist: matchesWatchlist,
    countMatches: countMatches,
    createMatchBadge: createMatchBadge,
    mountWatchlistBar: mountWatchlistBar
  };
});
