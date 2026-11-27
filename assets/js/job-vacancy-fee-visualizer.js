/**
 * Common Sense Odisha — Interactive Exam Fee & Category-Wise Vacancy Visualizer (v402)
 * Mounts inside /jobs/<slug> detail view (#cso-vacancy-fee-viz-root).
 * Supports structured vacancy_breakdown / vacancies_json & fee_structure / fees_json
 * with smart fallback parsing from article text for UR, SEBC, SC, ST, and PwBD splits
 * and fee exemptions.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOJobVacancyFeeViz = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOJobVacancyFeeViz = api;
})(function (win, doc) {
  'use strict';

  var CATEGORIES = [
    { key: 'ur', en: 'UR (Unreserved)', shortEn: 'UR', or: 'ସାଧାରଣ (UR)' },
    { key: 'sebc', en: 'SEBC / OBC', shortEn: 'SEBC', or: 'SEBC / OBC' },
    { key: 'sc', en: 'SC', shortEn: 'SC', or: 'ଅନୁସୂଚିତ ଜାତି (SC)' },
    { key: 'st', en: 'ST', shortEn: 'ST', or: 'ଅନୁସୂଚିତ ଜନଜାତି (ST)' },
    { key: 'pwbd', en: 'PwBD / Divyang', shortEn: 'PwBD', or: 'ଦିବ୍ୟାଙ୍ଗ (PwBD)' }
  ];

  function safeParseArray(val) {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val.trim()) {
      try {
        var parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
      } catch (_) {
        return [];
      }
    }
    return [];
  }

  function parsePositiveInt(val) {
    var m = String(val === undefined || val === null ? '' : val).replace(/,/g, '').match(/\d+/);
    if (!m) return 0;
    var n = parseInt(m[0], 10);
    return isFinite(n) && n > 0 ? n : 0;
  }

  function matchCategoryKeys(rawLabel) {
    var s = String(rawLabel || '').toLowerCase();
    var matched = [];
    if (/\b(ur|unreserved|general|gen)\b/.test(s)) matched.push('ur');
    if (/\b(sebc|obc|socially)\b/.test(s)) matched.push('sebc');
    if (/\b(sc|scheduled\s*caste)\b/.test(s)) matched.push('sc');
    if (/\b(st|scheduled\s*tribe)\b/.test(s)) matched.push('st');
    if (/\b(pwbd|pwd|ph|divyang|handicapped|disabled)\b/.test(s)) matched.push('pwbd');
    if (!matched.length && /\b(all\s*categor|all\s*candidat|everyone|all)\b/.test(s)) {
      return ['ur', 'sebc', 'sc', 'st', 'pwbd'];
    }
    return matched;
  }

  function parseFeeAmount(rawAmount) {
    var s = String(rawAmount || '').trim();
    var lower = s.toLowerCase();
    var exempt = /\b(exempt|exempted|nil|free|no\s*fee|waived|zero)\b/.test(lower);
    var cleaned = s.replace(/,/g, '');
    var numMatch = cleaned.match(/(?:rs\.?|inr|₹)?\s*(\d+)/i);
    var num = numMatch ? parseInt(numMatch[1], 10) : 0;
    if (num === 0 && (exempt || /₹\s*0\b|\brs\.?\s*0\b|^0$/.test(lower))) {
      exempt = true;
    }
    var label = exempt
      ? (s && s.length <= 36 ? s : '₹0 (Exempted)')
      : (num > 0 ? ('₹' + num.toLocaleString('en-IN')) : (s || 'See Notification'));
    return {
      amount_num: exempt ? 0 : num,
      is_exempt: exempt,
      amount_label: label
    };
  }

  function quantizePct(pct) {
    var clamped = Math.max(0, Math.min(100, Number(pct) || 0));
    var step = Math.round(clamped / 5) * 5;
    if (clamped > 0 && step === 0) step = 5;
    return step;
  }

  function parseVacancyAndFeeData(article) {
    var a = article && typeof article === 'object' ? article : {};
    var rawVac = safeParseArray(a.vacancies_json).length
      ? safeParseArray(a.vacancies_json)
      : safeParseArray(a.vacancy_breakdown || a.vacancy_breakdown_json);
    var rawFees = safeParseArray(a.fees_json).length
      ? safeParseArray(a.fees_json)
      : safeParseArray(a.fee_structure || a.fee_structure_json);

    var bodyText = [a.summary_en, a.article_body_en].filter(Boolean).join(' ');

    // 1. Category-wise vacancy split (from structured columns, category-labeled rows, or smart text fallback)
    var catCounts = { ur: 0, sebc: 0, sc: 0, st: 0, pwbd: 0 };
    var hasCatSplit = false;
    var postRows = [];

    for (var i = 0; i < rawVac.length; i += 1) {
      var r = rawVac[i];
      if (!r || typeof r !== 'object') continue;
      // Check explicit per-category columns (ur, sebc, sc, st, pwbd)
      var rowHasCols = false;
      for (var c = 0; c < CATEGORIES.length; c += 1) {
        var ck = CATEGORIES[c].key;
        if (r[ck] !== undefined && r[ck] !== '' && r[ck] !== null) {
          var vCol = parsePositiveInt(r[ck]);
          catCounts[ck] += vCol;
          if (vCol > 0) { hasCatSplit = true; rowHasCols = true; }
        }
      }
      var rowCount = parsePositiveInt(r.vacancies || r.posts || r.seats || r.total);
      var rowLabel = String(r.category || r.post_name || r.post || '').trim();

      if (!rowHasCols && rowLabel && rowCount > 0) {
        var catKeys = matchCategoryKeys(rowLabel);
        if (catKeys.length === 1 && /\b(ur|unreserved|sebc|obc|sc|st|pwbd|pwd)\b/i.test(rowLabel)) {
          catCounts[catKeys[0]] += rowCount;
          hasCatSplit = true;
        }
      }
      if (rowLabel && rowCount > 0) {
        postRows.push({
          label: rowLabel,
          count: rowCount,
          qualification: String(r.qualification || '').trim(),
          pay_level: String(r.pay_level || '').trim()
        });
      }
    }

    // Smart fallback parsing from body text if no structured category split was found
    if (!hasCatSplit && bodyText) {
      var patterns = [
        ['ur', /\b(?:UR|Unreserved)\s*[:=\-–]\s*(\d{1,5})\b/i],
        ['sebc', /\b(?:SEBC|OBC)\s*[:=\-–]\s*(\d{1,5})\b/i],
        ['sc', /\bSC\s*[:=\-–]\s*(\d{1,5})\b/i],
        ['st', /\bST\s*[:=\-–]\s*(\d{1,5})\b/i],
        ['pwbd', /\b(?:PwBD|PwD|PH)\s*[:=\-–]\s*(\d{1,5})\b/i]
      ];
      var foundTextCats = 0;
      for (var p = 0; p < patterns.length; p += 1) {
        var m = bodyText.match(patterns[p][1]);
        if (m) {
          var cnt = parseInt(m[1], 10);
          if (isFinite(cnt) && cnt > 0) {
            catCounts[patterns[p][0]] = cnt;
            foundTextCats += 1;
          }
        }
      }
      if (foundTextCats >= 2) hasCatSplit = true;
    }

    var sumCat = catCounts.ur + catCounts.sebc + catCounts.sc + catCounts.st + catCounts.pwbd;
    var sumPosts = postRows.reduce(function (acc, x) { return acc + x.count; }, 0);
    var totalVacancies = parsePositiveInt(a.total_vacancies) || sumCat || sumPosts;

    var categoryVacancies = [];
    if (hasCatSplit && sumCat > 0) {
      var denom = Math.max(totalVacancies, sumCat);
      for (var ci = 0; ci < CATEGORIES.length; ci += 1) {
        var catDef = CATEGORIES[ci];
        var cntVal = catCounts[catDef.key] || 0;
        var pct = denom > 0 ? Math.round((cntVal / denom) * 100) : 0;
        categoryVacancies.push({
          key: catDef.key,
          en: catDef.en,
          shortEn: catDef.shortEn,
          or: catDef.or,
          count: cntVal,
          pct: pct,
          bar_step: quantizePct(pct)
        });
      }
    }

    var postBars = postRows.slice(0, 8).map(function (pr) {
      var pct = totalVacancies > 0 ? Math.round((pr.count / totalVacancies) * 100) : 0;
      return {
        label: pr.label,
        count: pr.count,
        pct: pct,
        bar_step: quantizePct(pct),
        pay_level: pr.pay_level
      };
    });

    // 2. Category-wise Fee Breakdown (structured + fallback text parsing)
    var feesByCat = {};
    for (var fi = 0; fi < rawFees.length; fi += 1) {
      var fr = rawFees[fi];
      if (!fr || typeof fr !== 'object') continue;
      var keys = matchCategoryKeys(fr.category || fr.group || '');
      var parsedFee = parseFeeAmount(fr.amount || fr.fee || '');
      var mode = String(fr.payment_mode || fr.mode || (parsedFee.is_exempt ? 'Exempted' : 'Online')).trim();
      for (var ki = 0; ki < keys.length; ki += 1) {
        feesByCat[keys[ki]] = {
          key: keys[ki],
          amount_num: parsedFee.amount_num,
          is_exempt: parsedFee.is_exempt,
          amount_label: parsedFee.amount_label,
          payment_mode: mode,
          raw_category: String(fr.category || '').trim()
        };
      }
    }

    // Smart fallback fee detection from body text when fee_structure is empty
    if (!Object.keys(feesByCat).length && bodyText) {
      if (/\b(?:no\s+application\s+fee|fee\s+exempted\s+for\s+all|application\s+fee\s*[:=\-–]\s*(?:nil|none|free|₹?\s*0))\b/i.test(bodyText)) {
        for (var ak = 0; ak < CATEGORIES.length; ak += 1) {
          feesByCat[CATEGORIES[ak].key] = {
            key: CATEGORIES[ak].key,
            amount_num: 0,
            is_exempt: true,
            amount_label: '₹0 (Exempted)',
            payment_mode: 'Exempted',
            raw_category: CATEGORIES[ak].shortEn
          };
        }
      } else {
        var urFeeMatch = bodyText.match(/\b(?:UR|General|SEBC|OBC)[^.\n]{0,30}?(?:₹|Rs\.?)\s*(\d{2,5})/i);
        var scExemptMatch = /\b(?:SC|ST|PwBD|PwD)[^.\n]{0,40}?\b(?:exempt|exempted|nil|free|no\s*fee|₹?\s*0)\b/i.test(bodyText);
        if (urFeeMatch) {
          var amt = parseInt(urFeeMatch[1], 10);
          feesByCat.ur = { key: 'ur', amount_num: amt, is_exempt: false, amount_label: '₹' + amt.toLocaleString('en-IN'), payment_mode: 'Online', raw_category: 'UR' };
          feesByCat.sebc = { key: 'sebc', amount_num: amt, is_exempt: false, amount_label: '₹' + amt.toLocaleString('en-IN'), payment_mode: 'Online', raw_category: 'SEBC' };
        }
        if (scExemptMatch) {
          ['sc', 'st', 'pwbd'].forEach(function (k) {
            feesByCat[k] = { key: k, amount_num: 0, is_exempt: true, amount_label: '₹0 (Exempted)', payment_mode: 'Exempted', raw_category: k.toUpperCase() };
          });
        }
      }
    }

    var feeList = [];
    for (var fc = 0; fc < CATEGORIES.length; fc += 1) {
      var def = CATEGORIES[fc];
      if (feesByCat[def.key]) {
        feeList.push(Object.assign({ en: def.en, shortEn: def.shortEn, or: def.or }, feesByCat[def.key]));
      }
    }

    var hasData = totalVacancies > 0 || categoryVacancies.length > 0 || postBars.length > 0 || feeList.length > 0;
    return {
      has_data: hasData,
      total_vacancies: totalVacancies,
      has_category_split: categoryVacancies.length > 0,
      category_vacancies: categoryVacancies,
      post_bars: postBars,
      fees: feeList,
      fees_by_cat: feesByCat
    };
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function mount(container, article, options) {
    if (!doc || !container) return null;
    var opts = options || {};
    var orMode = Boolean(opts.isOr);
    var parsed = parseVacancyAndFeeData(article);
    if (!parsed.has_data) {
      container.hidden = true;
      container.replaceChildren();
      return parsed;
    }

    container.hidden = false;
    var selectedCat = 'all';

    function render() {
      var card = el('div', 'cso-vfv-card');
      card.setAttribute('data-cso-vfv', '1');

      var head = el('div', 'cso-vfv-head');
      var headCopy = el('div', 'cso-vfv-head-copy');
      headCopy.appendChild(el('h2', 'cso-vfv-title', orMode
        ? '📊 ବର୍ଗ-ୱାରୀ ପଦବୀ ଓ ଆବେଦନ ଫି ବିଶ୍ଳେଷକ'
        : '📊 Category-Wise Vacancy & Exam Fee Visualizer'));
      headCopy.appendChild(el('p', 'cso-vfv-sub', orMode
        ? 'UR, SEBC, SC, ST ଓ PwBD ବର୍ଗ ଅନୁଯାୟୀ ପଦବୀ ବଣ୍ଟନ ଏବଂ ଫି ଛାଡ଼ ତୁଳନା କରନ୍ତୁ।'
        : 'Compare UR, SEBC, SC, ST & PwBD seat splits and application fee exemptions at a glance.'));
      head.appendChild(headCopy);

      if (parsed.total_vacancies > 0) {
        head.appendChild(el('span', 'cso-vfv-total-pill', (orMode ? 'ମୋଟ ପଦବୀ: ' : 'Total Posts: ') + parsed.total_vacancies.toLocaleString('en-IN')));
      }
      card.appendChild(head);

      // Interactive Category Comparator Pills
      if (parsed.has_category_split || parsed.fees.length) {
        var pillRow = el('div', 'cso-vfv-pills');
        pillRow.setAttribute('role', 'tablist');
        pillRow.setAttribute('aria-label', orMode ? 'ଆପଣଙ୍କ ବର୍ଗ ବାଛନ୍ତୁ' : 'Compare by candidate category');

        var allBtn = el('button', 'cso-vfv-pill' + (selectedCat === 'all' ? ' is-active' : ''), orMode ? 'ସବୁ ବର୍ଗ' : 'All Categories');
        allBtn.type = 'button';
        allBtn.setAttribute('role', 'tab');
        allBtn.setAttribute('data-vfv-cat', 'all');
        allBtn.setAttribute('aria-selected', selectedCat === 'all' ? 'true' : 'false');
        allBtn.addEventListener('click', function () { selectedCat = 'all'; render(); });
        pillRow.appendChild(allBtn);

        CATEGORIES.forEach(function (c) {
          var active = selectedCat === c.key;
          var b = el('button', 'cso-vfv-pill' + (active ? ' is-active' : ''), orMode ? c.or : c.shortEn);
          b.type = 'button';
          b.setAttribute('role', 'tab');
          b.setAttribute('data-vfv-cat', c.key);
          b.setAttribute('aria-selected', active ? 'true' : 'false');
          b.addEventListener('click', function () { selectedCat = c.key; render(); });
          pillRow.appendChild(b);
        });
        card.appendChild(pillRow);
      }

      // Personalized Category Highlight Banner
      if (selectedCat !== 'all') {
        var catInfo = CATEGORIES.find(function (c) { return c.key === selectedCat; });
        var vacEntry = parsed.category_vacancies.find(function (v) { return v.key === selectedCat; });
        var feeEntry = parsed.fees_by_cat[selectedCat];
        var banner = el('div', 'cso-vfv-highlight');
        banner.setAttribute('role', 'status');
        var parts = [(orMode ? '🎯 ବର୍ଗ: ' : '🎯 Selected: ') + (orMode ? catInfo.or : catInfo.en)];
        if (vacEntry) {
          parts.push((orMode ? 'ପଦବୀ: ' : 'Seats: ') + vacEntry.count + ' (' + vacEntry.pct + '%)');
        }
        if (feeEntry) {
          parts.push((orMode ? 'ଆବେଦନ ଫି: ' : 'Fee: ') + (feeEntry.is_exempt ? '✅ ' + feeEntry.amount_label : '💳 ' + feeEntry.amount_label));
        }
        banner.textContent = parts.join(' · ');
        card.appendChild(banner);
      }

      var cols = el('div', 'cso-vfv-grid');

      // Column 1: Vacancy Split Visual Bars
      if (parsed.has_category_split || parsed.post_bars.length) {
        var vacBox = el('div', 'cso-vfv-panel');
        vacBox.appendChild(el('h3', 'cso-vfv-panel-title', parsed.has_category_split
          ? (orMode ? '🪑 ବର୍ଗ ଅନୁଯାୟୀ ପଦବୀ ବଣ୍ଟନ' : '🪑 Category-Wise Seat Split')
          : (orMode ? '🪑 ପଦବୀ ଅନୁଯାୟୀ ବଣ୍ଟନ' : '🪑 Post-Wise Vacancy Distribution')));

        var barsWrap = el('div', 'cso-vfv-bars');
        var rowsToDraw = parsed.has_category_split ? parsed.category_vacancies : parsed.post_bars;
        rowsToDraw.forEach(function (row) {
          var isHi = parsed.has_category_split && selectedCat !== 'all' && row.key === selectedCat;
          var itemEl = el('div', 'cso-vfv-bar-row' + (isHi ? ' is-selected' : ''));
          var meta = el('div', 'cso-vfv-bar-meta');
          meta.appendChild(el('span', 'cso-vfv-bar-label', parsed.has_category_split ? (orMode ? row.or : row.en) : row.label));
          meta.appendChild(el('span', 'cso-vfv-bar-val', row.count.toLocaleString('en-IN') + ' (' + row.pct + '%)'));
          itemEl.appendChild(meta);

          var track = el('div', 'cso-vfv-bar-track');
          var fill = el('div', 'cso-vfv-bar-fill cso-vfv-bar--w' + row.bar_step);
          track.appendChild(fill);
          itemEl.appendChild(track);
          barsWrap.appendChild(itemEl);
        });
        vacBox.appendChild(barsWrap);
        cols.appendChild(vacBox);
      }

      // Column 2: Application Fee & Exemption Matrix
      if (parsed.fees.length) {
        var feeBox = el('div', 'cso-vfv-panel');
        feeBox.appendChild(el('h3', 'cso-vfv-panel-title', orMode ? '💳 ଆବେଦନ ଫି ଓ ଛାଡ଼ ତୁଳନା' : '💳 Exam Fee & Exemption Comparison'));
        var feeGrid = el('div', 'cso-vfv-fee-list');
        parsed.fees.forEach(function (f) {
          var isHi = selectedCat !== 'all' && f.key === selectedCat;
          var fRow = el('div', 'cso-vfv-fee-row' + (f.is_exempt ? ' is-exempt' : '') + (isHi ? ' is-selected' : ''));
          var left = el('div', 'cso-vfv-fee-cat', orMode ? f.or : f.en);
          var right = el('div', 'cso-vfv-fee-right');
          right.appendChild(el('span', 'cso-vfv-fee-badge' + (f.is_exempt ? ' is-exempt' : ''), f.is_exempt ? ('✓ ' + f.amount_label) : f.amount_label));
          if (f.payment_mode) right.appendChild(el('span', 'cso-vfv-fee-mode', f.payment_mode));
          fRow.append(left, right);
          feeGrid.appendChild(fRow);
        });
        feeBox.appendChild(feeGrid);
        cols.appendChild(feeBox);
      }

      card.appendChild(cols);
      container.replaceChildren(card);
    }

    render();
    return parsed;
  }

  return {
    version: 'v402',
    CATEGORIES: CATEGORIES,
    parseVacancyAndFeeData: parseVacancyAndFeeData,
    mount: mount
  };
});
