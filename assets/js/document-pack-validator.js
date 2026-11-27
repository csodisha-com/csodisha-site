/**
 * Common Sense Odisha — 100% Client-Side Odisha Govt Document Pack,
 * Image-to-PDF & Size Validator (/tools/, v438)
 * Validates OPSC, OSSC, OSSSC & OJEE/SAMS upload specs across 5 document slots,
 * compresses JPG images via offscreen canvas binary-search quality, and exports
 * pure-JS binary %PDF-1.4 single-page PDFs with zero server uploads.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations;
 * bilingual EN / ଓଡ଼ିଆ; 4-theme var(--cso-*) semantic tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSODocumentPackValidator = api;
  if (typeof globalThis !== 'undefined') globalThis.CSODocumentPackValidator = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v438';
  var ROOT_ID = 'cso-document-pack-validator-root';
  var PREFS_KEY = 'cso_doc_pack_validator_v1';

  var PORTAL_SPECS = {
    opsc: {
      key: 'opsc',
      en: 'OPSC (opsconline.gov.in)',
      or: 'OPSC (opsconline.gov.in)',
      slots: {
        photo: { labelEn: 'Passport Photo', labelOr: 'ପାସପୋର୍ଟ ଫଟୋ', accept: ['image/jpeg', 'image/jpg'], exts: ['jpg', 'jpeg'], minKB: 20, maxKB: 100, recW: 200, recH: 230, minW: 110, maxW: 400, minH: 140, maxH: 450, minAR: 0.70, maxAR: 1.0, noteEn: 'Light/white background; JPG 20–100 KB' },
        signature: { labelEn: 'Full Signature', labelOr: 'ସମ୍ପୂର୍ଣ୍ଣ ଦସ୍ତଖତ', accept: ['image/jpeg', 'image/jpg'], exts: ['jpg', 'jpeg'], minKB: 20, maxKB: 50, recW: 140, recH: 60, minW: 100, maxW: 350, minH: 40, maxH: 180, minAR: 1.6, maxAR: 3.6, noteEn: 'Black/blue ink on white paper; JPG 20–50 KB' },
        thumb: { labelEn: 'Left/Right Thumb Impression', labelOr: 'ଆଙ୍ଗୁଠି ଛାପ', accept: ['image/jpeg', 'image/jpg'], exts: ['jpg', 'jpeg'], minKB: 20, maxKB: 50, recW: 140, recH: 60, minW: 100, maxW: 350, minH: 40, maxH: 180, minAR: 1.4, maxAR: 3.6, noteEn: 'Clear blue/black pad impression; JPG 20–50 KB' },
        'id-proof': { labelEn: 'Photo ID Proof (Aadhaar / Voter / PAN / DL)', labelOr: 'ପରିଚୟ ପତ୍ର (ଆଧାର / ଭୋଟର / PAN)', accept: ['application/pdf', 'image/jpeg', 'image/jpg'], exts: ['pdf', 'jpg', 'jpeg'], minKB: 50, maxKB: 300, recW: 1000, recH: 1400, noteEn: 'PDF or JPG 50–300 KB; readable front & back' },
        certificates: { labelEn: 'Educational & Caste/SEBC/EWS Certificates', labelOr: 'ଶିକ୍ଷାଗତ ଓ ଜାତି/SEBC/EWS ପ୍ରମାଣପତ୍ର', accept: ['application/pdf'], exts: ['pdf'], minKB: 100, maxKB: 500, recW: 1240, recH: 1754, noteEn: 'A4 portrait PDF 100–500 KB; barcode legible' }
      }
    },
    ossc: {
      key: 'ossc',
      en: 'OSSC (ossc.gov.in)',
      or: 'OSSC (ossc.gov.in)',
      slots: {
        photo: { labelEn: 'Passport Photo', labelOr: 'ପାସପୋର୍ଟ ଫଟୋ', accept: ['image/jpeg', 'image/jpg'], exts: ['jpg', 'jpeg'], minKB: 20, maxKB: 50, recW: 200, recH: 230, minW: 140, maxW: 320, minH: 160, maxH: 360, minAR: 0.75, maxAR: 0.95, noteEn: 'JPG 20–50 KB; 200×230 px (AR 0.75–0.95)' },
        signature: { labelEn: 'Full Signature', labelOr: 'ସମ୍ପୂର୍ଣ୍ଣ ଦସ୍ତଖତ', accept: ['image/jpeg', 'image/jpg'], exts: ['jpg', 'jpeg'], minKB: 10, maxKB: 20, recW: 140, recH: 60, minW: 100, maxW: 300, minH: 40, maxH: 120, minAR: 1.8, maxAR: 3.2, noteEn: 'JPG 10–20 KB; 140×60 px (AR 1.8–3.2)' },
        thumb: { labelEn: 'Thumb / Special Declaration', labelOr: 'ଆଙ୍ଗୁଠି ଛାପ / ଘୋଷଣାପତ୍ର', accept: ['image/jpeg', 'image/jpg', 'application/pdf'], exts: ['jpg', 'jpeg', 'pdf'], minKB: 10, maxKB: 100, recW: 140, recH: 60, noteEn: 'JPG/PDF 10–100 KB' },
        'id-proof': { labelEn: 'PwBD / Ex-Serviceman / Sports / ID Proof', labelOr: 'PwBD / ପୂର୍ବତନ ସୈନିକ / ପରିଚୟ ପତ୍ର', accept: ['application/pdf'], exts: ['pdf'], minKB: 50, maxKB: 500, recW: 1240, recH: 1754, noteEn: 'PDF 50–500 KB' },
        certificates: { labelEn: 'Self-Attested Certificate Bundle', labelOr: 'ସ୍ୱ-ପ୍ରମାଣିତ ପ୍ରମାଣପତ୍ର ବଣ୍ଡଲ୍', accept: ['application/pdf'], exts: ['pdf'], minKB: 50, maxKB: 500, recW: 1240, recH: 1754, noteEn: 'PDF 50–500 KB; clear scan' }
      }
    },
    osssc: {
      key: 'osssc',
      en: 'OSSSC (osssc.gov.in)',
      or: 'OSSSC (osssc.gov.in)',
      slots: {
        photo: { labelEn: 'Passport Photo', labelOr: 'ପାସପୋର୍ଟ ଫଟୋ', accept: ['image/jpeg', 'image/jpg'], exts: ['jpg', 'jpeg'], minKB: 20, maxKB: 50, recW: 200, recH: 230, minW: 140, maxW: 320, minH: 160, maxH: 360, minAR: 0.72, maxAR: 0.98, noteEn: 'JPG 20–50 KB; 200×230 px' },
        signature: { labelEn: 'Full Signature', labelOr: 'ସମ୍ପୂର୍ଣ୍ଣ ଦସ୍ତଖତ', accept: ['image/jpeg', 'image/jpg'], exts: ['jpg', 'jpeg'], minKB: 10, maxKB: 20, recW: 140, recH: 60, minW: 100, maxW: 300, minH: 40, maxH: 120, minAR: 1.6, maxAR: 3.4, noteEn: 'JPG 10–20 KB; 140×60 px' },
        thumb: { labelEn: 'Left Thumb Impression', labelOr: 'ବାମ ଆଙ୍ଗୁଠି ଛାପ', accept: ['image/jpeg', 'image/jpg'], exts: ['jpg', 'jpeg'], minKB: 10, maxKB: 50, recW: 140, recH: 60, noteEn: 'JPG 10–50 KB' },
        'id-proof': { labelEn: 'Aadhaar / Photo ID Proof', labelOr: 'ଆଧାର / ପରିଚୟ ପତ୍ର', accept: ['image/jpeg', 'image/jpg', 'application/pdf'], exts: ['jpg', 'jpeg', 'pdf'], minKB: 50, maxKB: 300, recW: 1000, recH: 1400, noteEn: 'JPG or PDF 50–300 KB' },
        certificates: { labelEn: 'Certificate & RoR / Employment Exchange Card', labelOr: 'ପ୍ରମାଣପତ୍ର ଓ ରୋଜଗାର ପଞ୍ଜୀକରଣ କାର୍ଡ', accept: ['image/jpeg', 'image/jpg', 'application/pdf'], exts: ['jpg', 'jpeg', 'pdf'], minKB: 50, maxKB: 300, recW: 1240, recH: 1754, noteEn: 'JPG or PDF 50–300 KB' }
      }
    },
    'ojee-sams': {
      key: 'ojee-sams',
      en: 'OJEE / SAMS Odisha (ojee.nic.in / samsodisha.gov.in)',
      or: 'OJEE / SAMS ଓଡ଼ିଶା (ojee.nic.in / samsodisha.gov.in)',
      slots: {
        photo: { labelEn: 'Passport Photo', labelOr: 'ପାସପୋର୍ଟ ଫଟୋ', accept: ['image/jpeg', 'image/jpg'], exts: ['jpg', 'jpeg'], minKB: 10, maxKB: 200, recW: 200, recH: 230, minW: 120, maxW: 500, minH: 140, maxH: 600, minAR: 0.70, maxAR: 1.0, noteEn: 'JPG 10–200 KB; 200×230 px' },
        signature: { labelEn: 'Full Signature', labelOr: 'ସମ୍ପୂର୍ଣ୍ଣ ଦସ୍ତଖତ', accept: ['image/jpeg', 'image/jpg'], exts: ['jpg', 'jpeg'], minKB: 10, maxKB: 100, recW: 140, recH: 60, minW: 100, maxW: 400, minH: 40, maxH: 200, minAR: 1.5, maxAR: 3.6, noteEn: 'JPG 10–100 KB; 140×60 px' },
        thumb: { labelEn: 'Guardian Signature / Thumb', labelOr: 'ଅଭିଭାବକ ଦସ୍ତଖତ / ଆଙ୍ଗୁଠି ଛାପ', accept: ['image/jpeg', 'image/jpg'], exts: ['jpg', 'jpeg'], minKB: 10, maxKB: 100, recW: 140, recH: 60, noteEn: 'JPG 10–100 KB' },
        'id-proof': { labelEn: 'Aadhaar / Resident Domicile Proof', labelOr: 'ଆଧାର / ବାସିନ୍ଦା ପ୍ରମାଣପତ୍ର', accept: ['application/pdf', 'image/jpeg', 'image/jpg'], exts: ['pdf', 'jpg', 'jpeg'], minKB: 50, maxKB: 1024, recW: 1240, recH: 1754, noteEn: 'PDF/JPG 50 KB–1 MB' },
        certificates: { labelEn: 'Marksheet / Income / Caste Certificate', labelOr: 'ମାର୍କସିଟ୍ / ଆୟ / ଜାତି ପ୍ରମାଣପତ୍ର', accept: ['application/pdf'], exts: ['pdf'], minKB: 50, maxKB: 1024, recW: 1240, recH: 1754, noteEn: 'PDF 50–1024 KB (<= 1 MB)' }
      }
    }
  };

  var SLOT_ORDER = ['photo', 'signature', 'thumb', 'id-proof', 'certificates'];

  function getSlotSpec(presetKey, slotType) {
    var portal = PORTAL_SPECS[String(presetKey || 'opsc').toLowerCase()] || PORTAL_SPECS.opsc;
    var slot = portal.slots[String(slotType || 'photo').toLowerCase()] || portal.slots.photo;
    return { portal: portal, slot: slot };
  }

  function validateUploadFileMeta(meta) {
    var m = meta || {};
    var info = getSlotSpec(m.presetKey, m.slotType);
    var spec = info.slot;
    var fileName = String(m.fileName || 'document.jpg');
    var extMatch = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
    var ext = extMatch ? extMatch[1] : '';
    var mime = String(m.mimeType || '').toLowerCase();
    var sizeBytes = Math.max(0, Number(m.sizeBytes || 0));
    var actualKB = Number((sizeBytes / 1024).toFixed(1));
    var width = Number(m.width || 0);
    var height = Number(m.height || 0);
    var aspectRatio = (width > 0 && height > 0) ? Number((width / height).toFixed(2)) : null;

    var issues = [];
    var fixRecommendations = [];
    var code = 'OK';

    var mimeOk = (mime && spec.accept.indexOf(mime) !== -1) || (ext && spec.exts.indexOf(ext) !== -1);
    if (!mimeOk) {
      code = 'INVALID_FORMAT';
      issues.push('Unsupported file type (' + (mime || ext || 'unknown') + '). Expected: ' + spec.exts.join(', ').toUpperCase());
      fixRecommendations.push('Convert file to ' + spec.exts[0].toUpperCase() + ' using the on-device converter below.');
    }

    if (actualKB < spec.minKB) {
      if (code === 'OK') code = 'UNDERSIZE';
      issues.push('File too small (' + actualKB + ' KB < ' + spec.minKB + ' KB minimum).');
      fixRecommendations.push('Re-scan or export at higher JPEG quality so size is between ' + spec.minKB + '–' + spec.maxKB + ' KB.');
    } else if (actualKB > spec.maxKB) {
      if (code === 'OK') code = 'OVERSIZE';
      issues.push('File exceeds portal limit (' + actualKB + ' KB > ' + spec.maxKB + ' KB maximum).');
      fixRecommendations.push('Use 1-Click Compress to Target KB (' + spec.maxKB + ' KB) before uploading.');
    }

    if (width > 0 && height > 0) {
      if (spec.minW && (width < spec.minW || width > spec.maxW || height < spec.minH || height > spec.maxH)) {
        if (code === 'OK') code = 'DIMENSION_MISMATCH';
        issues.push('Dimensions ' + width + '×' + height + ' px outside portal bounds (' + spec.minW + '–' + spec.maxW + ' × ' + spec.minH + '–' + spec.maxH + ' px).');
        fixRecommendations.push('Resize to recommended ' + spec.recW + '×' + spec.recH + ' px.');
      }
      if (spec.minAR && aspectRatio !== null && (aspectRatio < spec.minAR || aspectRatio > spec.maxAR)) {
        if (code === 'OK') code = 'ASPECT_RATIO';
        issues.push('Aspect ratio ' + aspectRatio + ' distorted (expected ' + spec.minAR + '–' + spec.maxAR + ').');
        fixRecommendations.push('Crop to standard ' + spec.recW + '×' + spec.recH + ' proportion.');
      }
    }

    var valid = issues.length === 0;
    return {
      valid: valid,
      status: valid ? 'PASS' : 'FAIL',
      code: code,
      portalKey: info.portal.key,
      slotType: String(m.slotType || 'photo'),
      actualKB: actualKB,
      minKB: spec.minKB,
      maxKB: spec.maxKB,
      width: width,
      height: height,
      aspectRatio: aspectRatio,
      issues: issues,
      fixRecommendations: fixRecommendations
    };
  }

  /**
   * Pure-JS Binary %PDF-1.4 Single-Page PDF Generator from JPEG bytes (Zero External Libraries)
   * Embeds raw JPEG directly via /Filter /DCTDecode on A4 (595x842 pt) with 36 pt margins.
   */
  function buildSinglePagePdfFromJpeg(jpegUint8Array, imgWidthPx, imgHeightPx) {
    var jpegBytes = jpegUint8Array instanceof Uint8Array ? jpegUint8Array : new Uint8Array(jpegUint8Array || []);
    var iw = Math.max(1, Math.round(Number(imgWidthPx) || 595));
    var ih = Math.max(1, Math.round(Number(imgHeightPx) || 842));

    var pageW = 595;
    var pageH = 842;
    var margin = 36;
    var availW = pageW - (margin * 2);
    var availH = pageH - (margin * 2);
    var scale = Math.min(availW / iw, availH / ih);
    var drawW = Number((iw * scale).toFixed(2));
    var drawH = Number((ih * scale).toFixed(2));
    var drawX = Number(((pageW - drawW) / 2).toFixed(2));
    var drawY = Number(((pageH - drawH) / 2).toFixed(2));

    function asciiBytes(str) {
      var out = new Uint8Array(str.length);
      for (var i = 0; i < str.length; i += 1) out[i] = str.charCodeAt(i) & 0xff;
      return out;
    }

    var chunks = [];
    var byteLen = 0;
    function pushBytes(u8) {
      chunks.push(u8);
      byteLen += u8.length;
    }
    function pushStr(s) {
      pushBytes(asciiBytes(s));
    }

    var offsets = [0]; // object 0
    pushStr('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

    // 1: Catalog
    offsets.push(byteLen);
    pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

    // 2: Pages
    offsets.push(byteLen);
    pushStr('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

    // 3: Page (A4 595x842)
    offsets.push(byteLen);
    pushStr('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n');

    // 4: Image XObject (/DCTDecode)
    offsets.push(byteLen);
    pushStr('4 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + iw + ' /Height ' + ih + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpegBytes.length + ' >>\nstream\n');
    pushBytes(jpegBytes);
    pushStr('\nendstream\nendobj\n');

    // 5: Content Stream
    var content = 'q ' + drawW + ' 0 0 ' + drawH + ' ' + drawX + ' ' + drawY + ' cm /Im0 Do Q\n';
    offsets.push(byteLen);
    pushStr('5 0 obj\n<< /Length ' + content.length + ' >>\nstream\n' + content + 'endstream\nendobj\n');

    // xref table
    var xrefStart = byteLen;
    pushStr('xref\n0 ' + offsets.length + '\n');
    pushStr('0000000000 65535 f \n');
    for (var idx = 1; idx < offsets.length; idx += 1) {
      var offStr = String(offsets[idx]);
      while (offStr.length < 10) offStr = '0' + offStr;
      pushStr(offStr + ' 00000 n \n');
    }
    pushStr('trailer\n<< /Size ' + offsets.length + ' /Root 1 0 R >>\nstartxref\n' + xrefStart + '\n%%EOF\n');

    var pdf = new Uint8Array(byteLen);
    var cursor = 0;
    for (var c = 0; c < chunks.length; c += 1) {
      pdf.set(chunks[c], cursor);
      cursor += chunks[c].length;
    }
    return pdf;
  }

  /**
   * Offscreen <canvas> iterative binary-search JPEG compressor
   */
  function compressImageToTargetKB(imgElement, opts) {
    return new Promise(function (resolve, reject) {
      if (!doc || !imgElement) {
        reject(new Error('Image element required'));
        return;
      }
      var o = opts || {};
      var targetMaxKB = Math.max(10, Number(o.targetMaxKB || 50));
      var w = Math.max(40, Math.round(Number(o.targetWidth || imgElement.naturalWidth || 200)));
      var h = Math.max(40, Math.round(Number(o.targetHeight || imgElement.naturalHeight || 230)));

      var canvas = doc.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(imgElement, 0, 0, w, h);

      var lo = 0.35;
      var hi = 0.92;
      var bestBlob = null;
      var bestQuality = 0.80;

      function tryQuality(q, iter) {
        canvas.toBlob(function (blob) {
          if (!blob) {
            reject(new Error('Canvas JPEG export failed'));
            return;
          }
          var kb = blob.size / 1024;
          if (!bestBlob || (kb <= targetMaxKB && (!bestBlob || bestBlob.size > targetMaxKB * 1024 || blob.size > bestBlob.size))) {
            bestBlob = blob;
            bestQuality = q;
          }
          if (iter >= 6) {
            resolve({ blob: bestBlob, quality: Number(bestQuality.toFixed(2)), sizeKB: Number((bestBlob.size / 1024).toFixed(1)), width: w, height: h });
            return;
          }
          if (kb > targetMaxKB) hi = q;
          else lo = q;
          tryQuality((lo + hi) / 2, iter + 1);
        }, 'image/jpeg', q);
      }

      tryQuality(0.82, 0);
    });
  }

  function loadPrefs() {
    try {
      var raw = win.localStorage && win.localStorage.getItem(PREFS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function savePrefs(obj) {
    try {
      if (win.localStorage) win.localStorage.setItem(PREFS_KEY, JSON.stringify(obj));
    } catch (_) {}
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function downloadBlob(blob, filename) {
    try {
      var url = URL.createObjectURL(blob);
      var a = doc.createElement('a');
      a.href = url;
      a.download = filename;
      doc.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (_) {}
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
      presetKey: saved.presetKey && PORTAL_SPECS[saved.presetKey] ? saved.presetKey : 'opsc',
      slotType: saved.slotType || 'photo',
      readySlots: (saved.readySlots && typeof saved.readySlots === 'object') ? saved.readySlots : {}
    };
    var activeFileResult = null;
    var activeCompressed = null;
    var activeImageEl = null;

    function persist() {
      savePrefs({ lang: state.lang, presetKey: state.presetKey, slotType: state.slotType, readySlots: state.readySlots });
    }

    function render() {
      var orMode = state.lang === 'or';
      var info = getSlotSpec(state.presetKey, state.slotType);
      var readyCount = SLOT_ORDER.filter(function (s) { return Boolean(state.readySlots[s]); }).length;

      var card = el('div', 'cso-dpv-card');
      card.setAttribute('data-cso-doc-pack-validator', '1');

      // Header
      var head = el('div', 'cso-dpv-head');
      var headCopy = el('div', 'cso-dpv-head-copy');
      headCopy.appendChild(el('div', 'cso-dpv-eyebrow', orMode
        ? '📄 ୧୦୦% ଅନ୍-ଡିଭାଇସ୍ ଡକ୍ୟୁମେଣ୍ଟ ପ୍ୟାକ୍, ଇମେଜ୍-ଟୁ-PDF ଓ ସାଇଜ୍ ଯାଞ୍ଚ'
        : '📄 100% CLIENT-SIDE ODISHA DOCUMENT PACK, IMAGE-TO-PDF & SIZE VALIDATOR'));
      headCopy.appendChild(el('h2', 'cso-dpv-title', orMode
        ? 'OPSC / OSSC / OSSSC / OJEE ଡକ୍ୟୁମେଣ୍ଟ ସାଇଜ୍ ଯାଞ୍ଚ ଓ PDF ରୂପାନ୍ତର'
        : 'Odisha Govt Portal Upload Validator, KB Compressor & Image-to-PDF Exporter'));
      headCopy.appendChild(el('p', 'cso-dpv-sub', orMode
        ? 'ସର୍ଭରକୁ ଅପଲୋଡ୍ ନକରି ନିଜ ଫଟୋ, ଦସ୍ତଖତ, ଆଇଡି ଓ ପ୍ରମାଣପତ୍ର ର KB ସାଇଜ୍ ଯାଞ୍ଚ, କମ୍ପ୍ରେସ୍ ଓ A4 PDF ପ୍ରସ୍ତୁତ କରନ୍ତୁ।'
        : 'Verify exact OPSC, OSSC, OSSSC & OJEE/SAMS upload KB/pixel specs, compress JPGs on-device, and export clean A4 single-page PDFs privately in your browser.'));
      head.appendChild(headCopy);

      var langToggle = el('div', 'cso-dpv-lang-toggle');
      ['en', 'or'].forEach(function (lk) {
        var lb = el('button', 'cso-dpv-lang-btn' + (state.lang === lk ? ' is-active' : ''), lk === 'en' ? 'English' : 'ଓଡ଼ିଆ');
        lb.type = 'button';
        lb.setAttribute('aria-pressed', state.lang === lk ? 'true' : 'false');
        lb.addEventListener('click', function () { state.lang = lk; persist(); render(); });
        langToggle.appendChild(lb);
      });
      head.appendChild(langToggle);
      card.appendChild(head);

      // Controls: Portal + Slot + File Picker
      var controls = el('div', 'cso-dpv-grid');

      var pBox = el('div', 'cso-dpv-field');
      var pLbl = el('label', 'cso-dpv-label', orMode ? 'ପୋର୍ଟାଲ୍ ବାଛନ୍ତୁ' : 'Target Odisha Portal');
      pLbl.setAttribute('for', 'cso-dpv-portal');
      var pSel = el('select', 'cso-dpv-input');
      pSel.id = 'cso-dpv-portal';
      Object.keys(PORTAL_SPECS).forEach(function (k) {
        var opt = el('option', '', orMode ? PORTAL_SPECS[k].or : PORTAL_SPECS[k].en);
        opt.value = k;
        if (k === state.presetKey) opt.selected = true;
        pSel.appendChild(opt);
      });
      pSel.addEventListener('change', function () { state.presetKey = pSel.value; activeFileResult = null; persist(); render(); });
      pBox.appendChild(pLbl);
      pBox.appendChild(pSel);
      controls.appendChild(pBox);

      var sBox = el('div', 'cso-dpv-field');
      var sLbl = el('label', 'cso-dpv-label', orMode ? 'ଡକ୍ୟୁମେଣ୍ଟ ସ୍ଲଟ୍' : 'Document Slot');
      sLbl.setAttribute('for', 'cso-dpv-slot');
      var sSel = el('select', 'cso-dpv-input');
      sSel.id = 'cso-dpv-slot';
      SLOT_ORDER.forEach(function (sk) {
        var sl = info.portal.slots[sk];
        var opt = el('option', '', orMode ? sl.labelOr : sl.labelEn);
        opt.value = sk;
        if (sk === state.slotType) opt.selected = true;
        sSel.appendChild(opt);
      });
      sSel.addEventListener('change', function () { state.slotType = sSel.value; activeFileResult = null; persist(); render(); });
      sBox.appendChild(sLbl);
      sBox.appendChild(sSel);
      controls.appendChild(sBox);

      var fBox = el('div', 'cso-dpv-field');
      var fLbl = el('label', 'cso-dpv-label', orMode ? 'ଫାଇଲ୍ ବାଛନ୍ତୁ (JPG / PNG / PDF)' : 'Select File to Inspect (100% On-Device)');
      fLbl.setAttribute('for', 'cso-dpv-file');
      var fInp = el('input', 'cso-dpv-input');
      fInp.id = 'cso-dpv-file';
      fInp.type = 'file';
      fInp.accept = '.jpg,.jpeg,.png,.pdf';
      fInp.addEventListener('change', function () {
        var file = fInp.files && fInp.files[0];
        if (!file) return;
        activeCompressed = null;
        activeImageEl = null;
        if (file.type && file.type.indexOf('image/') === 0) {
          var img = new win.Image();
          var objUrl = URL.createObjectURL(file);
          img.onload = function () {
            activeImageEl = img;
            activeFileResult = validateUploadFileMeta({
              fileName: file.name,
              mimeType: file.type,
              sizeBytes: file.size,
              width: img.naturalWidth,
              height: img.naturalHeight,
              presetKey: state.presetKey,
              slotType: state.slotType
            });
            if (activeFileResult.valid) {
              state.readySlots[state.slotType] = true;
              persist();
            }
            URL.revokeObjectURL(objUrl);
            render();
          };
          img.src = objUrl;
        } else {
          activeFileResult = validateUploadFileMeta({
            fileName: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            presetKey: state.presetKey,
            slotType: state.slotType
          });
          if (activeFileResult.valid) {
            state.readySlots[state.slotType] = true;
            persist();
          }
          render();
        }
      });
      fBox.appendChild(fLbl);
      fBox.appendChild(fInp);
      controls.appendChild(fBox);
      card.appendChild(controls);

      // Active Slot Spec Banner
      var specBar = el('div', 'cso-dpv-spec-bar');
      specBar.textContent = (orMode ? '📌 ପୋର୍ଟାଲ୍ ନିୟମ: ' : '📌 Required Spec: ') + info.slot.labelEn + ' · ' + info.slot.minKB + '–' + info.slot.maxKB + ' KB · ' + info.slot.noteEn;
      card.appendChild(specBar);

      // Validation Diagnostic Card (when a file is inspected)
      if (activeFileResult) {
        var diag = el('div', 'cso-dpv-diag ' + (activeFileResult.valid ? 'cso-dpv-diag--ok' : 'cso-dpv-diag--warn'));
        diag.appendChild(el('strong', '', activeFileResult.valid
          ? ('✅ PASS — ' + activeFileResult.actualKB + ' KB' + (activeFileResult.width ? (' (' + activeFileResult.width + '×' + activeFileResult.height + ' px)') : ''))
          : ('⚠️ ' + activeFileResult.code + ' — ' + activeFileResult.actualKB + ' KB (Allowed: ' + activeFileResult.minKB + '–' + activeFileResult.maxKB + ' KB)')));
        if (activeFileResult.issues.length > 0) {
          var ul = el('ul', 'cso-dpv-list');
          activeFileResult.issues.forEach(function (iss) { ul.appendChild(el('li', '', iss)); });
          activeFileResult.fixRecommendations.forEach(function (rec) { ul.appendChild(el('li', '', '💡 ' + rec)); });
          diag.appendChild(ul);
        }
        card.appendChild(diag);
      }

      // Multi-Slot Readiness Board
      var board = el('div', 'cso-dpv-board');
      var bHead = el('div', 'cso-dpv-board-head');
      bHead.appendChild(el('h3', 'cso-dpv-sec-title', orMode ? '📋 ୫-ସ୍ଲଟ୍ ପୋର୍ଟାଲ୍ ଅପଲୋଡ୍ ପ୍ରସ୍ତୁତି ତାଲିକା' : '📋 5-Slot Portal Upload Readiness Board'));
      bHead.appendChild(el('span', 'cso-dpv-meter', readyCount + ' / ' + SLOT_ORDER.length + (orMode ? ' ଅପଲୋଡ୍ ପାଇଁ ପ୍ରସ୍ତୁତ' : ' Ready for Portal Upload')));
      board.appendChild(bHead);

      var slotGrid = el('div', 'cso-dpv-slots');
      SLOT_ORDER.forEach(function (sk) {
        var sl = info.portal.slots[sk];
        var done = Boolean(state.readySlots[sk]);
        var lbl = el('label', 'cso-dpv-slot-item' + (done ? ' is-done' : ''));
        var cb = el('input', 'cso-dpv-checkbox');
        cb.type = 'checkbox';
        cb.checked = done;
        cb.addEventListener('change', function () { state.readySlots[sk] = cb.checked; persist(); render(); });
        lbl.appendChild(cb);
        var txt = el('span', 'cso-dpv-slot-text');
        txt.appendChild(el('strong', '', orMode ? sl.labelOr : sl.labelEn));
        txt.appendChild(el('span', 'cso-dpv-slot-sub', sl.exts.join('/').toUpperCase() + ' · ' + sl.minKB + '–' + sl.maxKB + ' KB'));
        lbl.appendChild(txt);
        slotGrid.appendChild(lbl);
      });
      board.appendChild(slotGrid);
      card.appendChild(board);

      // Action Buttons
      var actions = el('div', 'cso-dpv-actions');
      var statusEl = el('span', 'cso-dpv-copy-status');
      statusEl.setAttribute('aria-live', 'polite');

      var compBtn = el('button', 'cso-dpv-btn cso-dpv-btn--primary', orMode ? '📥 କମ୍ପ୍ରେସ୍ଡ JPG ଡାଉନଲୋଡ୍' : '📥 Download Compressed JPG');
      compBtn.type = 'button';
      compBtn.addEventListener('click', function () {
        if (!activeImageEl) {
          statusEl.textContent = orMode ? 'ℹ️ ପ୍ରଥମେ ଏକ JPG/PNG ଛବି ବାଛନ୍ତୁ' : 'ℹ️ Select a JPG/PNG image above first.';
          return;
        }
        compressImageToTargetKB(activeImageEl, {
          targetMaxKB: info.slot.maxKB,
          targetWidth: info.slot.recW,
          targetHeight: info.slot.recH
        }).then(function (out) {
          activeCompressed = out;
          downloadBlob(out.blob, state.presetKey + '-' + state.slotType + '-' + out.sizeKB + 'kb.jpg');
          state.readySlots[state.slotType] = true;
          persist();
          statusEl.textContent = '✅ Exported ' + out.sizeKB + ' KB JPG (' + out.width + '×' + out.height + ' px)!';
        }).catch(function () {
          statusEl.textContent = '⚠️ Could not compress image.';
        });
      });
      actions.appendChild(compBtn);

      var pdfBtn = el('button', 'cso-dpv-btn', orMode ? '📄 ସିଙ୍ଗଲ୍-ପେଜ୍ A4 PDF ଏକ୍ସପୋର୍ଟ' : '📄 Export Single-Page PDF');
      pdfBtn.type = 'button';
      pdfBtn.addEventListener('click', function () {
        if (!activeImageEl) {
          statusEl.textContent = orMode ? 'ℹ️ PDF ପାଇଁ ପ୍ରଥମେ ଏକ ଛବି ବାଛନ୍ତୁ' : 'ℹ️ Select an image above to export as A4 PDF.';
          return;
        }
        compressImageToTargetKB(activeImageEl, {
          targetMaxKB: Math.min(info.slot.maxKB, 450),
          targetWidth: Math.min(activeImageEl.naturalWidth || 1000, 1240),
          targetHeight: Math.min(activeImageEl.naturalHeight || 1400, 1754)
        }).then(function (out) {
          return out.blob.arrayBuffer().then(function (buf) {
            var pdfBytes = buildSinglePagePdfFromJpeg(new Uint8Array(buf), out.width, out.height);
            downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), state.presetKey + '-' + state.slotType + '.pdf');
            state.readySlots[state.slotType] = true;
            persist();
            statusEl.textContent = '✅ Exported A4 PDF (' + Math.round(pdfBytes.length / 1024) + ' KB)!';
          });
        }).catch(function () {
          statusEl.textContent = '⚠️ PDF export failed.';
        });
      });
      actions.appendChild(pdfBtn);

      var copyBtn = el('button', 'cso-dpv-btn', orMode ? '📋 ପୋର୍ଟାଲ୍ ନିୟମ କପି କରନ୍ତୁ' : '📋 Copy Portal Spec Checklist');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        var lines = ['CS Odisha — ' + info.portal.en + ' Document Upload Specs:'];
        SLOT_ORDER.forEach(function (sk) {
          var sl = info.portal.slots[sk];
          lines.push('- ' + sl.labelEn + ': ' + sl.exts.join('/').toUpperCase() + ' (' + sl.minKB + '–' + sl.maxKB + ' KB) — ' + sl.noteEn);
        });
        copyText(lines.join('\n')).then(function () {
          statusEl.textContent = orMode ? '✅ କପି ହୋଇଗଲା!' : '✅ Portal checklist copied!';
          setTimeout(function () { statusEl.textContent = ''; }, 2400);
        });
      });
      actions.appendChild(copyBtn);

      var printBtn = el('button', 'cso-dpv-btn', orMode ? '🖨️ ପ୍ରସ୍ତୁତି ଶିଟ୍ ପ୍ରିଣ୍ଟ୍' : '🖨️ Print Document Readiness Sheet');
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
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoMount);
    else autoMount();
  }

  return {
    VERSION: VERSION,
    ROOT_ID: ROOT_ID,
    PREFS_KEY: PREFS_KEY,
    PORTAL_SPECS: PORTAL_SPECS,
    SLOT_ORDER: SLOT_ORDER,
    getSlotSpec: getSlotSpec,
    validateUploadFileMeta: validateUploadFileMeta,
    compressImageToTargetKB: compressImageToTargetKB,
    buildSinglePagePdfFromJpeg: buildSinglePagePdfFromJpeg,
    mount: mount
  };
});
