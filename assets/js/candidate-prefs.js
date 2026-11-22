(function (root) {
  'use strict';

  var STORAGE_KEY = 'cso_candidate_prefs_v1';
  var QUALIFICATIONS = ['10th', '+2', 'Graduate', 'Post-Graduate', 'B.Ed / D.El.Ed', 'ITI / Diploma / Technical'];
  var BOARDS = ['OPSC', 'OSSC', 'OSSSC', 'OPRB', 'OSEPA', 'Central / PSU', 'District Collectorate'];

  function normalizePrefs(raw) {
    var obj = raw && typeof raw === 'object' ? raw : {};
    var districts = Array.isArray(obj.districts)
      ? obj.districts.map(function (d) { return String(d || '').trim().toLowerCase(); }).filter(Boolean).slice(0, 3)
      : [];
    var boards = Array.isArray(obj.boards)
      ? obj.boards.map(function (b) { return String(b || '').trim(); }).filter(Boolean)
      : [];
    return {
      districts: Array.from(new Set(districts)),
      qualification: String(obj.qualification || '').trim(),
      boards: Array.from(new Set(boards)),
      updatedAt: String(obj.updatedAt || '')
    };
  }

  function load(storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return normalizePrefs({});
    try {
      var raw = s.getItem(STORAGE_KEY);
      if (!raw) return normalizePrefs({});
      return normalizePrefs(JSON.parse(raw));
    } catch (_) {
      return normalizePrefs({});
    }
  }

  function save(prefs, storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    var norm = normalizePrefs(prefs);
    norm.updatedAt = new Date().toISOString();
    if (s) {
      try { s.setItem(STORAGE_KEY, JSON.stringify(norm)); } catch (_) {}
    }
    if (typeof fetch === 'function') {
      try {
        fetch('/api/sync', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ candidate_watchlist: norm })
        }).catch(function () {});
      } catch (_) {}
    }
    return norm;
  }

  function hasAny(prefs) {
    var p = normalizePrefs(prefs);
    return p.districts.length > 0 || Boolean(p.qualification) || p.boards.length > 0;
  }

  function qualMatches(hay, prefQual) {
    if (!prefQual) return false;
    var q = prefQual.toLowerCase();
    if (q === '10th') return /\b10th\b|matric|hsc|high school/.test(hay);
    if (q === '+2') return /\+2|12th|higher secondary|chse|intermediate/.test(hay);
    if (q === 'graduate') return /graduate|degree|b\.a|b\.sc|b\.com|any degree|oas|cgl|si\b/.test(hay);
    if (q === 'post-graduate') return /post[- ]?graduate|\bpg\b|master|m\.a|m\.sc|ugc net/.test(hay);
    if (q === 'b.ed / d.el.ed') return /b\.?ed|d\.?el\.?ed|otet|osstet|ctet|teacher|teaching/.test(hay);
    if (q === 'iti / diploma / technical') return /\biti\b|diploma|polytechnic|technical|apprentice|engineer/.test(hay);
    return hay.includes(q);
  }

  function boardMatches(hay, board) {
    var b = String(board || '').toLowerCase();
    if (b === 'central / psu') return /\bssc\b|\brrb\b|\bupsc\b|\bibps\b|\bsbi\b|\bpsu\b|central|all india/.test(hay);
    if (b === 'district collectorate') return /collector|district|zilla|gram|block|anganwadi/.test(hay);
    return hay.includes(b);
  }

  function matchItem(item, prefs) {
    var p = normalizePrefs(prefs);
    if (!item || !hasAny(p)) return { matched: false, reasons: [] };

    var hay = [
      item.title,
      item.title_or,
      item.organisation,
      item.organization,
      item.department,
      item.category,
      item.qualification,
      item.summary,
      item.state,
      item.gov_level,
      item.district,
      item.location
    ].join(' ').toLowerCase();

    var reasons = [];

    // 1. District check
    var matchedDist = null;
    for (var i = 0; i < p.districts.length; i++) {
      var slug = p.districts[i];
      if (hay.includes(slug)) {
        matchedDist = slug.charAt(0).toUpperCase() + slug.slice(1);
        reasons.push(matchedDist);
        break;
      }
    }

    // 2. Board check
    for (var j = 0; j < p.boards.length; j++) {
      if (boardMatches(hay, p.boards[j])) {
        reasons.push(p.boards[j]);
        break;
      }
    }

    // 3. Qualification check
    if (p.qualification && qualMatches(hay, p.qualification)) {
      reasons.push(p.qualification);
    }

    // Include state-wide Odisha items when districts are selected alongside matching board or qualification
    var isStateWide = /odisha/.test(hay) && !matchedDist;
    var matched = reasons.length > 0 && (Boolean(matchedDist) || p.districts.length === 0 || isStateWide);

    return {
      matched: matched,
      reasons: reasons
    };
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY,
    QUALIFICATIONS: QUALIFICATIONS,
    BOARDS: BOARDS,
    load: load,
    save: save,
    hasAny: hasAny,
    matchItem: matchItem
  };

  root.CSO_CANDIDATE_PREFS = api;
  root.CSO_MATCH_ITEM = matchItem;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
