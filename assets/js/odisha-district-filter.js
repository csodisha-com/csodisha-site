/**
 * Common Sense Odisha — Shared 30-District Odisha Directory & Smart District Matcher (v400)
 * Powers 1-click District-Wise Odisha Recruitment & Exam Filtering on /jobs/?district= & /updates/?district=.
 * Strict CSP-compliant: DOM APIs only, zero inline styles/handlers, EN / ଓଡ଼ିଆ bilingual.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSODistrictFilter = api;
  if (typeof globalThis !== 'undefined') globalThis.CSODistrictFilter = api;
})(function (win, doc) {
  'use strict';

  var DISTRICTS = [
    { slug: 'angul', en: 'Angul', or: 'ଅନୁଗୁଳ', hq: 'Angul', aliases: ['angul', 'anugul', 'talcher'] },
    { slug: 'balangir', en: 'Balangir', or: 'ବଲାଙ୍ଗୀର', hq: 'Balangir', aliases: ['balangir', 'bolangir', 'titilagarh', 'titlagarh'] },
    { slug: 'balasore', en: 'Balasore', or: 'ବାଲେଶ୍ୱର', hq: 'Balasore', aliases: ['balasore', 'baleswar', 'baleshwar'] },
    { slug: 'bargarh', en: 'Bargarh', or: 'ବରଗଡ଼', hq: 'Bargarh', aliases: ['bargarh', 'baragarh', 'padampur'] },
    { slug: 'bhadrak', en: 'Bhadrak', or: 'ଭଦ୍ରକ', hq: 'Bhadrak', aliases: ['bhadrak', 'chandbali', 'dhamra'] },
    { slug: 'boudh', en: 'Boudh', or: 'ବୌଦ୍ଧ', hq: 'Boudh', aliases: ['boudh', 'baudh', 'baud'] },
    { slug: 'cuttack', en: 'Cuttack', or: 'କଟକ', hq: 'Cuttack', aliases: ['cuttack', 'katak', 'athagarh', 'banki', 'choudwar'] },
    { slug: 'deogarh', en: 'Deogarh', or: 'ଦେବଗଡ଼', hq: 'Deogarh', aliases: ['deogarh', 'debagarh'] },
    { slug: 'dhenkanal', en: 'Dhenkanal', or: 'ଢେଙ୍କାନାଳ', hq: 'Dhenkanal', aliases: ['dhenkanal', 'kamakhyanagar', 'hindol'] },
    { slug: 'gajapati', en: 'Gajapati', or: 'ଗଜପତି', hq: 'Paralakhemundi', aliases: ['gajapati', 'paralakhemundi', 'parlakhemundi'] },
    { slug: 'ganjam', en: 'Ganjam', or: 'ଗଞ୍ଜାମ', hq: 'Chhatrapur', aliases: ['ganjam', 'chhatrapur', 'chatrapur', 'berhampur', 'brahmapur', 'bhanjanagar', 'aska'] },
    { slug: 'jagatsinghpur', en: 'Jagatsinghpur', or: 'ଜଗତସିଂହପୁର', hq: 'Jagatsinghpur', aliases: ['jagatsinghpur', 'paradip', 'paradeep'] },
    { slug: 'jajpur', en: 'Jajpur', or: 'ଯାଜପୁର', hq: 'Panikoili', aliases: ['jajpur', 'panikoili', 'vyasanagar', 'kalinganagar'] },
    { slug: 'jharsuguda', en: 'Jharsuguda', or: 'ଝାରସୁଗୁଡ଼ା', hq: 'Jharsuguda', aliases: ['jharsuguda', 'brajrajnagar', 'belpahar'] },
    { slug: 'kalahandi', en: 'Kalahandi', or: 'କଳାହାଣ୍ଡି', hq: 'Bhawanipatna', aliases: ['kalahandi', 'bhawanipatna', 'dharamgarh', 'kesinga', 'junagarh'] },
    { slug: 'kandhamal', en: 'Kandhamal', or: 'କନ୍ଧମାଳ', hq: 'Phulbani', aliases: ['kandhamal', 'phulbani', 'balliguda', 'baliguda', 'g udayagiri'] },
    { slug: 'kendrapara', en: 'Kendrapara', or: 'କେନ୍ଦ୍ରାପଡ଼ା', hq: 'Kendrapara', aliases: ['kendrapara', 'kendrapada', 'pattamundai'] },
    { slug: 'kendujhar', en: 'Kendujhar', or: 'କେନ୍ଦୁଝର', hq: 'Kendujhar', aliases: ['kendujhar', 'keonjhar', 'barbil', 'joda', 'anandapur'] },
    { slug: 'khordha', en: 'Khordha', or: 'ଖୋର୍ଦ୍ଧା', hq: 'Khordha', chipEn: 'Khordha / BBSR', aliases: ['khordha', 'khurda', 'bhubaneswar', 'bbsr', 'jatni', 'banpur'] },
    { slug: 'koraput', en: 'Koraput', or: 'କୋରାପୁଟ', hq: 'Koraput', aliases: ['koraput', 'jeypore', 'sunabeda', 'semiliguda'] },
    { slug: 'malkangiri', en: 'Malkangiri', or: 'ମାଲକାନଗିରି', hq: 'Malkangiri', aliases: ['malkangiri', 'chitrakonda', 'kalimela'] },
    { slug: 'mayurbhanj', en: 'Mayurbhanj', or: 'ମୟୂରଭଞ୍ଜ', hq: 'Baripada', aliases: ['mayurbhanj', 'baripada', 'rairangpur', 'karanjia', 'udala'] },
    { slug: 'nabarangpur', en: 'Nabarangpur', or: 'ନବରଙ୍ଗପୁର', hq: 'Nabarangpur', aliases: ['nabarangpur', 'nowrangpur', 'nabarangapur', 'umerkote'] },
    { slug: 'nayagarh', en: 'Nayagarh', or: 'ନୟାଗଡ଼', hq: 'Nayagarh', aliases: ['nayagarh', 'odagaon', 'khandapada', 'daspalla'] },
    { slug: 'nuapada', en: 'Nuapada', or: 'ନୂଆପଡ଼ା', hq: 'Nuapada', aliases: ['nuapada', 'khariar', 'sinapali'] },
    { slug: 'puri', en: 'Puri', or: 'ପୁରୀ', hq: 'Puri', aliases: ['puri', 'konark', 'pipili', 'nimapada', 'satyabadi'] },
    { slug: 'rayagada', en: 'Rayagada', or: 'ରାୟଗଡ଼ା', hq: 'Rayagada', aliases: ['rayagada', 'gunupur', 'bissam cuttack'] },
    { slug: 'sambalpur', en: 'Sambalpur', or: 'ସମ୍ବଲପୁର', hq: 'Sambalpur', aliases: ['sambalpur', 'burla', 'hirakud', 'kuchinda', 'rairakhol'] },
    { slug: 'subarnapur', en: 'Subarnapur', or: 'ସୁବର୍ଣ୍ଣପୁର', hq: 'Sonepur', aliases: ['subarnapur', 'sonepur', 'sonapur', 'binka', 'tarbha'] },
    { slug: 'sundargarh', en: 'Sundargarh', or: 'ସୁନ୍ଦରଗଡ଼', hq: 'Sundargarh', aliases: ['sundargarh', 'sundergarh', 'rourkela', 'rajgangpur', 'bonai'] }
  ];

  var FEATURED_SLUGS = [
    'khordha', 'cuttack', 'kalahandi', 'ganjam', 'sambalpur',
    'balasore', 'mayurbhanj', 'sundargarh', 'koraput'
  ];

  var BY_SLUG = {};
  var ALIAS_TO_SLUG = {};
  for (var i = 0; i < DISTRICTS.length; i += 1) {
    var d = DISTRICTS[i];
    BY_SLUG[d.slug] = d;
    ALIAS_TO_SLUG[d.slug] = d.slug;
    ALIAS_TO_SLUG[d.en.toLowerCase()] = d.slug;
    ALIAS_TO_SLUG[d.or.toLowerCase()] = d.slug;
    ALIAS_TO_SLUG[d.hq.toLowerCase()] = d.slug;
    for (var j = 0; j < d.aliases.length; j += 1) {
      ALIAS_TO_SLUG[d.aliases[j].toLowerCase()] = d.slug;
    }
  }

  function normText(raw) {
    return String(raw || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  function resolveDistrictSlug(raw) {
    var s = normText(raw);
    if (!s || s === 'all' || s === 'all odisha' || s === 'odisha' || s === 'statewide') return '';
    if (ALIAS_TO_SLUG[s]) return ALIAS_TO_SLUG[s];
    var slugified = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (ALIAS_TO_SLUG[slugified]) return ALIAS_TO_SLUG[slugified];
    var keys = Object.keys(ALIAS_TO_SLUG);
    for (var k = 0; k < keys.length; k += 1) {
      var alias = keys[k];
      if (alias.length >= 4 && s.indexOf(alias) !== -1) {
        return ALIAS_TO_SLUG[alias];
      }
    }
    return '';
  }

  function getDistrictBySlug(slug) {
    var clean = resolveDistrictSlug(slug);
    return clean ? (BY_SLUG[clean] || null) : null;
  }

  function extractItemText(item) {
    if (!item || typeof item !== 'object') return { structured: '', combined: '' };
    var bi = item._cso_bilingual || {};
    var structured = [
      item.district,
      item.location_district,
      item.venue,
      item.location,
      bi.district
    ].filter(Boolean).join(' ');
    var combined = [
      structured,
      item.title,
      item.title_en,
      item.title_or,
      item.summary,
      item.summary_en,
      item.summary_or,
      item.org,
      item.organization,
      item.organisation_en,
      bi.title_en,
      bi.title_or,
      bi.summary_en,
      bi.org,
      item.keywords
    ].filter(Boolean).join(' ');
    return {
      structured: normText(structured),
      combined: normText(combined)
    };
  }

  function hasAliasMatch(text, districtObj) {
    if (!text || !districtObj) return false;
    var terms = districtObj.aliases.concat([districtObj.en.toLowerCase(), districtObj.or.toLowerCase()]);
    for (var t = 0; t < terms.length; t += 1) {
      var term = terms[t];
      if (!term) continue;
      if (text.indexOf(term) !== -1) return true;
    }
    return false;
  }

  function detectSpecificDistricts(item) {
    var txt = extractItemText(item);
    var found = [];
    for (var i = 0; i < DISTRICTS.length; i += 1) {
      if (hasAliasMatch(txt.combined, DISTRICTS[i])) {
        found.push(DISTRICTS[i].slug);
      }
    }
    return found;
  }

  function isStatewideItem(item) {
    var txt = extractItemText(item);
    if (/(all\s+odisha|all\s+30\s+districts|all\s+india|statewide|online|central\s+govt)/i.test(txt.structured)) {
      return detectSpecificDistricts(item).length === 0;
    }
    if (!txt.structured || txt.structured === 'odisha') {
      return detectSpecificDistricts(item).length === 0;
    }
    return false;
  }

  function matchDistrict(item, districtSlug, options) {
    var slug = resolveDistrictSlug(districtSlug);
    if (!slug) return true;
    var distObj = BY_SLUG[slug];
    if (!distObj) return true;
    var opts = options || {};
    var includeStatewide = opts.includeStatewide !== undefined ? Boolean(opts.includeStatewide) : true;
    var txt = extractItemText(item);
    if (hasAliasMatch(txt.structured, distObj) || hasAliasMatch(txt.combined, distObj)) {
      return true;
    }
    if (includeStatewide && isStatewideItem(item)) {
      return true;
    }
    return false;
  }

  function countByDistrict(items, options) {
    var list = Array.isArray(items) ? items : [];
    var counts = {};
    for (var i = 0; i < DISTRICTS.length; i += 1) {
      var slug = DISTRICTS[i].slug;
      var n = 0;
      for (var k = 0; k < list.length; k += 1) {
        if (matchDistrict(list[k], slug, options)) n += 1;
      }
      counts[slug] = n;
    }
    return counts;
  }

  function readUrlParams(urlStr) {
    try {
      var u = new URL(urlStr || (win.location && win.location.href) || 'https://csodisha.com/');
      var d = resolveDistrictSlug(u.searchParams.get('district') || '');
      var swRaw = u.searchParams.get('include_statewide');
      var includeStatewide = swRaw === '0' || swRaw === 'false' ? false : true;
      return { district: d, includeStatewide: includeStatewide };
    } catch (_) {
      return { district: '', includeStatewide: true };
    }
  }

  function syncUrlParams(districtSlug, includeStatewide) {
    try {
      if (!win.history || typeof win.history.replaceState !== 'function' || !win.location) return;
      var u = new URL(win.location.href);
      var slug = resolveDistrictSlug(districtSlug);
      if (slug) u.searchParams.set('district', slug);
      else u.searchParams.delete('district');
      if (slug && includeStatewide === false) u.searchParams.set('include_statewide', '0');
      else if (slug && includeStatewide === true) u.searchParams.set('include_statewide', '1');
      else u.searchParams.delete('include_statewide');
      win.history.replaceState({}, '', u.toString());
    } catch (_) {}
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function mountSelectorBar(container, config) {
    if (!doc || !container) return null;
    var cfg = config || {};
    var drawerOpen = false;
    var current = {
      district: resolveDistrictSlug(cfg.district || ''),
      includeStatewide: cfg.includeStatewide !== undefined ? Boolean(cfg.includeStatewide) : true,
      lang: cfg.lang === 'or' ? 'or' : 'en',
      items: Array.isArray(cfg.items) ? cfg.items : []
    };

    function notify(nextDistrict, nextSw) {
      current.district = resolveDistrictSlug(nextDistrict);
      if (nextSw !== undefined) current.includeStatewide = Boolean(nextSw);
      syncUrlParams(current.district, current.includeStatewide);
      render();
      if (typeof cfg.onChange === 'function') {
        cfg.onChange({ district: current.district, includeStatewide: current.includeStatewide });
      }
    }

    function render() {
      var orMode = current.lang === 'or';
      var counts = countByDistrict(current.items, { includeStatewide: current.includeStatewide });
      var wrap = el('section', 'cso-df-bar');
      wrap.setAttribute('aria-label', orMode ? 'ଓଡ଼ିଶା ଜିଲ୍ଲା ଫିଲ୍ଟର' : 'Filter by Odisha District');

      var head = el('div', 'cso-df-head');
      head.appendChild(el('div', 'cso-df-title', orMode
        ? '📍 ଜିଲ୍ଲା ଅନୁଯାୟୀ ଖୋଜନ୍ତୁ (୩୦ ଜିଲ୍ଲା)'
        : '📍 Filter by Odisha District | ଜିଲ୍ଲା ଅନୁଯାୟୀ ଖୋଜନ୍ତୁ'));

      var rightCtl = el('div', 'cso-df-head-ctl');

      var swLabel = el('label', 'cso-df-sw-toggle');
      var swCheck = doc.createElement('input');
      swCheck.type = 'checkbox';
      swCheck.className = 'cso-df-sw-check';
      swCheck.checked = current.includeStatewide;
      swCheck.addEventListener('change', function () {
        notify(current.district, swCheck.checked);
      });
      swLabel.append(swCheck, el('span', '', orMode ? 'ସାରା ଓଡ଼ିଶା ପୋଷ୍ଟ ସାମିଲ କରନ୍ତୁ' : 'Include Statewide / All-Odisha Posts'));
      rightCtl.appendChild(swLabel);

      var sel = el('select', 'cso-df-select');
      sel.setAttribute('aria-label', orMode ? 'ଓଡ଼ିଶା ଜିଲ୍ଲା ବାଛନ୍ତୁ' : 'Select Odisha district');
      var optAll = el('option', '', (orMode ? 'ସବୁ ୩୦ ଜିଲ୍ଲା (ସାରା ଓଡ଼ିଶା)' : 'All 30 Districts (Odisha)') + ' (' + current.items.length + ')');
      optAll.value = '';
      sel.appendChild(optAll);
      DISTRICTS.forEach(function (d) {
        var o = el('option', '', (orMode ? d.or : d.en) + ' (' + (counts[d.slug] || 0) + ')');
        o.value = d.slug;
        if (d.slug === current.district) o.selected = true;
        sel.appendChild(o);
      });
      sel.addEventListener('change', function () {
        notify(sel.value, current.includeStatewide);
      });
      rightCtl.appendChild(sel);

      var drawerBtn = el('button', 'cso-df-drawer-btn' + (drawerOpen ? ' is-open' : ''), orMode
        ? (drawerOpen ? '୩୦ ଜିଲ୍ଲା ବନ୍ଦ ▴' : 'ସବୁ ୩୦ ଜିଲ୍ଲା ▾')
        : (drawerOpen ? 'Hide 30 Districts ▴' : 'All 30 Districts ▾'));
      drawerBtn.type = 'button';
      drawerBtn.setAttribute('aria-expanded', drawerOpen ? 'true' : 'false');
      drawerBtn.addEventListener('click', function () {
        drawerOpen = !drawerOpen;
        render();
      });
      rightCtl.appendChild(drawerBtn);

      head.appendChild(rightCtl);
      wrap.appendChild(head);

      var chips = el('div', 'cso-df-chips');
      chips.setAttribute('role', 'group');
      chips.setAttribute('aria-label', orMode ? 'ପ୍ରମୁଖ ଜିଲ୍ଲା' : 'Featured Odisha Districts');

      var allBtn = el('button', 'cso-df-chip' + (!current.district ? ' is-active' : ''), orMode ? 'ସାରା ଓଡ଼ିଶା' : 'All Odisha');
      allBtn.type = 'button';
      allBtn.setAttribute('data-df-slug', '');
      allBtn.setAttribute('aria-pressed', !current.district ? 'true' : 'false');
      allBtn.addEventListener('click', function () { notify('', current.includeStatewide); });
      chips.appendChild(allBtn);

      FEATURED_SLUGS.forEach(function (slug) {
        var d = BY_SLUG[slug];
        if (!d) return;
        var act = current.district === slug;
        var lbl = orMode ? d.or : (d.chipEn || d.en);
        var b = el('button', 'cso-df-chip' + (act ? ' is-active' : ''), lbl + ' (' + (counts[slug] || 0) + ')');
        b.type = 'button';
        b.setAttribute('data-df-slug', slug);
        b.setAttribute('aria-pressed', act ? 'true' : 'false');
        b.addEventListener('click', function () { notify(slug, current.includeStatewide); });
        chips.appendChild(b);
      });
      wrap.appendChild(chips);

      if (drawerOpen) {
        var grid = el('div', 'cso-df-grid');
        DISTRICTS.forEach(function (d) {
          var act = current.district === d.slug;
          var b = el('button', 'cso-df-grid-pill' + (act ? ' is-active' : ''), (orMode ? d.or : d.en) + ' (' + (counts[d.slug] || 0) + ')');
          b.type = 'button';
          b.setAttribute('data-df-slug', d.slug);
          b.setAttribute('aria-pressed', act ? 'true' : 'false');
          b.addEventListener('click', function () {
            drawerOpen = false;
            notify(d.slug, current.includeStatewide);
          });
          grid.appendChild(b);
        });
        wrap.appendChild(grid);
      }

      if (current.district && BY_SLUG[current.district]) {
        var activeDist = BY_SLUG[current.district];
        var banner = el('div', 'cso-df-active-banner');
        banner.setAttribute('role', 'status');
        var modeTxt = current.includeStatewide
          ? (orMode ? 'ଜିଲ୍ଲା + ସାରା ଓଡ଼ିଶା ପୋଷ୍ଟ' : 'District + All-Odisha Eligible')
          : (orMode ? 'କେବଳ ଜିଲ୍ଲା-ସ୍ତରୀୟ ପୋଷ୍ଟ' : 'District-Specific Only');
        banner.appendChild(el('span', 'cso-df-active-text', (orMode ? '📍 ସକ୍ରିୟ ଜିଲ୍ଲା: ' : '📍 Active District: ') +
          activeDist.en + ' (' + activeDist.or + ') · ' + modeTxt + ' (' + (counts[current.district] || 0) + ')'));
        var clearBtn = el('button', 'cso-df-clear-btn', orMode ? '✕ ଜିଲ୍ଲା ସଫା କରନ୍ତୁ' : '✕ Clear District');
        clearBtn.type = 'button';
        clearBtn.addEventListener('click', function () { notify('', current.includeStatewide); });
        banner.appendChild(clearBtn);
        wrap.appendChild(banner);
      }

      container.replaceChildren(wrap);
    }

    render();
    return {
      update: function (next) {
        if (!next) return;
        if (next.district !== undefined) current.district = resolveDistrictSlug(next.district);
        if (next.includeStatewide !== undefined) current.includeStatewide = Boolean(next.includeStatewide);
        if (next.lang !== undefined) current.lang = next.lang === 'or' ? 'or' : 'en';
        if (Array.isArray(next.items)) current.items = next.items;
        render();
      }
    };
  }

  return {
    version: 'v400',
    DISTRICTS: DISTRICTS,
    FEATURED_SLUGS: FEATURED_SLUGS,
    resolveDistrictSlug: resolveDistrictSlug,
    getDistrictBySlug: getDistrictBySlug,
    isStatewideItem: isStatewideItem,
    matchDistrict: matchDistrict,
    countByDistrict: countByDistrict,
    readUrlParams: readUrlParams,
    syncUrlParams: syncUrlParams,
    mountSelectorBar: mountSelectorBar
  };
});
