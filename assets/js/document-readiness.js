(function (root) {
  'use strict';

  var STORAGE_KEY = 'cso_doc_readiness_v1';

  var ITEMS = [
    {
      id: 'aadhaar-digilocker',
      title_en: 'Aadhaar-Linked Mobile & DigiLocker',
      title_or: 'ଆଧାର-ଲିଙ୍କ୍ ମୋବାଇଲ୍ ଓ ଡିଜିଲକର',
      validityNote: 'Mandatory for Aadhaar e-KYC, OTR verification & instant certificate fetch.',
      links: [
        { label: 'DigiLocker ↗', url: 'https://www.digilocker.gov.in/' }
      ]
    },
    {
      id: 'hsc-10th',
      title_en: '10th / HSC Certificate & Marksheet',
      title_or: 'ଦଶମ / HSC ସାର୍ଟିଫିକେଟ୍ ଓ ମାର୍କସିଟ୍',
      validityNote: 'Primary proof of Date of Birth (DOB) & Odia language pass up to ME/HSC standard.',
      links: [
        { label: 'BSE Odisha ↗', url: 'https://bseodisha.ac.in/' }
      ]
    },
    {
      id: 'degree-marksheets',
      title_en: 'Graduation / +2 / Technical Degree & Marksheets',
      title_or: 'ସ୍ନାତକ / +୨ / ଟେକ୍ନିକାଲ୍ ଡିଗ୍ରୀ ଓ ମାର୍କସିଟ୍',
      validityNote: 'Keep all semester marksheets & Provisional/Original Degree certificate scanned.',
      links: [
        { label: 'DigiLocker ↗', url: 'https://www.digilocker.gov.in/' }
      ]
    },
    {
      id: 'odisha-resident',
      title_en: 'Odisha Resident / Nativity Certificate',
      title_or: 'ଓଡ଼ିଶା ବାସିନ୍ଦା (ରେସିଡେଣ୍ଟ) ପ୍ରମାଣପତ୍ର',
      validityNote: 'Verify Tahasildar e-District certificate number & QR validity before OTR.',
      links: [
        { label: 'e-District Odisha ↗', url: 'https://edistrict.odisha.gov.in/' }
      ]
    },
    {
      id: 'caste-sebc-ews',
      title_en: 'Caste / SEBC / EWS Certificate',
      title_or: 'ଜାତି / SEBC / EWS ପ୍ରମାଣପତ୍ର',
      validityNote: 'Financial-year renewal check: SEBC (non-creamy layer) & EWS must be valid for current FY.',
      links: [
        { label: 'e-District Odisha ↗', url: 'https://edistrict.odisha.gov.in/' }
      ]
    },
    {
      id: 'employment-exchange',
      title_en: 'Odisha Employment Exchange Registration Card',
      title_or: 'ଓଡ଼ିଶା ନିଯୁକ୍ତି ବିନିମୟ ପଞ୍ଜୀକରଣ କାର୍ଡ',
      validityNote: 'Required by OSSSC/OSSC group C & district cadres; check active renewal date.',
      links: [
        { label: 'Emp Mission Odisha ↗', url: 'https://empmissionodisha.gov.in/' }
      ]
    },
    {
      id: 'otr-portals',
      title_en: 'OPSC / OSSC / OSSSC One-Time Registration (OTR)',
      title_or: 'OPSC / OSSC / OSSSC ୱାନ୍-ଟାଇମ୍ ରେଜିଷ୍ଟ୍ରେସନ୍ (OTR)',
      validityNote: 'Keep OTR login ID, registered mobile & email active across all three state boards.',
      links: [
        { label: 'OPSC ↗', url: 'https://www.opsc.gov.in/' },
        { label: 'OSSC ↗', url: 'https://www.ossc.gov.in/' },
        { label: 'OSSSC ↗', url: 'https://www.osssc.gov.in/' }
      ]
    },
    {
      id: 'photo-signature-scan',
      title_en: 'Recent Passport Photo & Signature Scan',
      title_or: 'ସାମ୍ପ୍ରତିକ ପାସପୋର୍ଟ ଫଟୋ ଓ ଦସ୍ତଖତ ସ୍କାନ୍',
      validityNote: '20–50 KB JPG dimensions ready (use CSO Photo & Signature Resizer on /tools/).',
      links: [
        { label: 'Photo Resizer →', url: '/tools/#photo-resizer' }
      ]
    }
  ];

  function normalizeState(raw) {
    var obj = raw && typeof raw === 'object' ? raw : {};
    var checked = obj.checked && typeof obj.checked === 'object' ? obj.checked : {};
    var cleanChecked = {};
    for (var i = 0; i < ITEMS.length; i++) {
      var id = ITEMS[i].id;
      cleanChecked[id] = Boolean(checked[id]);
    }
    return {
      checked: cleanChecked,
      updatedAt: String(obj.updatedAt || '')
    };
  }

  function load(storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return normalizeState({});
    try {
      var raw = s.getItem(STORAGE_KEY);
      if (!raw) return normalizeState({});
      return normalizeState(JSON.parse(raw));
    } catch (_) {
      return normalizeState({});
    }
  }

  function save(state, storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    var norm = normalizeState(state);
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
          body: JSON.stringify({ document_readiness: norm })
        }).catch(function () {});
      } catch (_) {}
    }
    return norm;
  }

  function toggle(id, storage) {
    var st = load(storage);
    if (Object.prototype.hasOwnProperty.call(st.checked, id)) {
      st.checked[id] = !st.checked[id];
      return save(st, storage);
    }
    return st;
  }

  function getSummary(state) {
    var norm = normalizeState(state);
    var ready = 0;
    for (var i = 0; i < ITEMS.length; i++) {
      if (norm.checked[ITEMS[i].id]) ready++;
    }
    var total = ITEMS.length;
    return {
      ready: ready,
      total: total,
      pct: total ? Math.round((ready / total) * 100) : 0
    };
  }

  root.CSO_DOCUMENT_READINESS = {
    STORAGE_KEY: STORAGE_KEY,
    ITEMS: ITEMS,
    load: load,
    save: save,
    toggle: toggle,
    getSummary: getSummary
  };
})(typeof window !== 'undefined' ? window : globalThis);
