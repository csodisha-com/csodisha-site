/**
 * Common Sense Odisha — Browser-Side Photo, Signature & Thumb Impression Resizer / Compressor (v409)
 * 100% On-Device HTML5 Canvas utility mounted on /tools/ (#cso-photo-signature-resizer-root).
 * Zero network uploads — crops, resizes, rotates, enhances ink contrast, adds optional Name & Date
 * strip, and binary-searches JPEG quality to match exact OPSC, OSSC, OSSSC, CTET, and NTA pixel/KB limits.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOPhotoSignatureResizer = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOPhotoSignatureResizer = api;
})(function (win, doc) {
  'use strict';

  var PRESETS = [
    {
      key: 'opsc-photo',
      en: 'OPSC / OSSC / OSSSC Passport Photo',
      or: 'OPSC / OSSC / OSSSC ପାସପୋର୍ଟ ଫଟୋ',
      kind: 'photo',
      width: 200,
      height: 230,
      minKb: 20,
      maxKb: 50,
      note: '200 × 230 px · 20–50 KB (JPG)'
    },
    {
      key: 'opsc-sign',
      en: 'OPSC / OSSC / OSSSC Signature',
      or: 'OPSC / OSSC / OSSSC ଦସ୍ତଖତ',
      kind: 'signature',
      width: 140,
      height: 60,
      minKb: 10,
      maxKb: 20,
      note: '140 × 60 px · 10–20 KB (JPG)'
    },
    {
      key: 'opsc-lti',
      en: 'OPSC / OSSC Left Thumb Impression (LTI)',
      or: 'OPSC / OSSC ବାମ ବୁଢ଼ା ଆଙ୍ଗୁଠି ଛାପ (LTI)',
      kind: 'thumb',
      width: 240,
      height: 240,
      minKb: 10,
      maxKb: 50,
      note: '240 × 240 px · 10–50 KB (JPG)'
    },
    {
      key: 'ctet-photo',
      en: 'CBSE CTET / KVS / NVS Photo',
      or: 'CBSE CTET / KVS / NVS ଫଟୋ',
      kind: 'photo',
      width: 276,
      height: 354,
      minKb: 10,
      maxKb: 100,
      note: '276 × 354 px (3.5 × 4.5 cm) · 10–100 KB (JPG)'
    },
    {
      key: 'ctet-sign',
      en: 'CBSE CTET / KVS / NVS Signature',
      or: 'CBSE CTET / KVS / NVS ଦସ୍ତଖତ',
      kind: 'signature',
      width: 276,
      height: 118,
      minKb: 3,
      maxKb: 30,
      note: '276 × 118 px (3.5 × 1.5 cm) · 3–30 KB (JPG)'
    },
    {
      key: 'nta-photo',
      en: 'NTA (UGC NET / JEE / CUET) Photo',
      or: 'NTA (UGC NET / JEE / CUET) ଫଟୋ',
      kind: 'photo',
      width: 200,
      height: 230,
      minKb: 10,
      maxKb: 200,
      note: '200 × 230 px · 10–200 KB (JPG)'
    },
    {
      key: 'nta-sign',
      en: 'NTA Signature',
      or: 'NTA ଦସ୍ତଖତ',
      kind: 'signature',
      width: 140,
      height: 60,
      minKb: 4,
      maxKb: 30,
      note: '140 × 60 px · 4–30 KB (JPG)'
    },
    {
      key: 'custom',
      en: 'Custom Dimensions & KB Target',
      or: 'କଷ୍ଟମ୍ ଆକାର ଓ KB ଲକ୍ଷ୍ୟ',
      kind: 'custom',
      width: 200,
      height: 230,
      minKb: 15,
      maxKb: 50,
      note: 'Editable W × H px & Min–Max KB'
    }
  ];

  function dataUrlToBytes(dataUrl) {
    var s = String(dataUrl || '');
    var comma = s.indexOf(',');
    if (comma === -1) return 0;
    var b64 = s.slice(comma + 1).trim();
    if (!b64) return 0;
    var pad = 0;
    if (b64.endsWith('==')) pad = 2;
    else if (b64.endsWith('=')) pad = 1;
    return Math.max(0, Math.floor((b64.length * 3) / 4) - pad);
  }

  function bytesToKb(bytes) {
    var n = Number(bytes) || 0;
    return Math.round((n / 1024) * 10) / 10;
  }

  function fitCanvasToTargetKb(canvas, minKb, maxKb) {
    var minK = Math.max(1, Number(minKb) || 10);
    var maxK = Math.max(minK, Number(maxKb) || 50);
    var targetMidK = (minK + maxK) / 2;

    if (!canvas || typeof canvas.toDataURL !== 'function') {
      return { dataUrl: '', quality: 0.85, bytes: 0, kb: 0, status: 'below_min' };
    }

    function encodeAt(q) {
      var clamped = Math.max(0.1, Math.min(0.95, Math.round(q * 1000) / 1000));
      var url = canvas.toDataURL('image/jpeg', clamped);
      var bytes = dataUrlToBytes(url);
      var kb = bytesToKb(bytes);
      return { dataUrl: url, quality: clamped, bytes: bytes, kb: kb };
    }

    var highRes = encodeAt(0.95);
    if (highRes.kb < minK) {
      highRes.status = 'below_min';
      return highRes;
    }
    if (highRes.kb <= maxK && highRes.kb >= minK) {
      highRes.status = 'within';
      return highRes;
    }

    var lowRes = encodeAt(0.10);
    if (lowRes.kb > maxK) {
      lowRes.status = 'above_max';
      return lowRes;
    }

    // Binary search quality between 0.10 and 0.95 to converge cleanly within [minK, maxK]
    var lo = 0.10;
    var hi = 0.95;
    var bestWithin = null;
    var bestFallback = lowRes;

    for (var i = 0; i < 10; i += 1) {
      var mid = (lo + hi) / 2;
      var probe = encodeAt(mid);
      if (probe.kb >= minK && probe.kb <= maxK) {
        if (!bestWithin || Math.abs(probe.kb - targetMidK) < Math.abs(bestWithin.kb - targetMidK)) {
          bestWithin = probe;
        }
        if (probe.kb > targetMidK) hi = mid;
        else lo = mid;
      } else if (probe.kb > maxK) {
        hi = mid;
      } else {
        lo = mid;
        if (Math.abs(probe.kb - minK) < Math.abs(bestFallback.kb - minK)) {
          bestFallback = probe;
        }
      }
    }

    if (bestWithin) {
      bestWithin.status = 'within';
      return bestWithin;
    }
    bestFallback.status = bestFallback.kb > maxK ? 'above_max' : (bestFallback.kb < minK ? 'below_min' : 'within');
    return bestFallback;
  }

  function buildOutputFilename(presetKey, width, height, kb) {
    var safeKey = String(presetKey || 'exam-doc').toLowerCase().replace(/[^a-z0-9-]+/g, '-');
    var w = Math.max(10, Math.round(Number(width) || 200));
    var h = Math.max(10, Math.round(Number(height) || 230));
    var k = Math.max(1, Math.round(Number(kb) || 20));
    return safeKey + '-' + w + 'x' + h + '-' + k + 'kb.jpg';
  }

  function detectLang() {
    try {
      if (doc && doc.documentElement && doc.documentElement.getAttribute('lang') === 'or') return 'or';
      if (win && win.localStorage) {
        if (win.localStorage.getItem('cso_lang_pref') === 'or' || win.localStorage.getItem('cso_lang') === 'or') return 'or';
      }
    } catch (_) {}
    return 'en';
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
    return n;
  }

  function createSampleSourceCanvas(kind) {
    var c = doc.createElement('canvas');
    var isSig = kind === 'signature';
    var isThumb = kind === 'thumb';
    c.width = isSig ? 480 : 440;
    c.height = isSig ? 200 : 500;
    var ctx = c.getContext('2d');
    if (!ctx) return c;

    // Crisp light paper background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, c.width, c.height);

    if (isSig) {
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(48, 128);
      ctx.bezierCurveTo(95, 42, 138, 162, 195, 92);
      ctx.bezierCurveTo(235, 52, 265, 148, 320, 88);
      ctx.bezierCurveTo(360, 58, 395, 132, 435, 95);
      ctx.stroke();
      ctx.fillStyle = '#334155';
      ctx.font = 'italic 20px sans-serif';
      ctx.fillText('A. Mohanty', 165, 166);
    } else if (isThumb) {
      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 3;
      for (var r = 18; r <= 120; r += 11) {
        ctx.beginPath();
        ctx.ellipse(220, 250, r * 0.68, r, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else {
      // Sample passport portrait silhouette
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(220, 185, 76, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(220, 420, 145, 130, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SAMPLE CANDIDATE PHOTO', 220, 468);
    }
    return c;
  }

  function applyHighContrastInk(ctx, w, h) {
    try {
      var imgData = ctx.getImageData(0, 0, w, h);
      var d = imgData.data;
      for (var i = 0; i < d.length; i += 4) {
        var lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        // Boost paper to clean white and darken ink strokes
        var boosted = lum > 185 ? 255 : Math.max(0, Math.round((lum - 30) * 1.18));
        d[i] = boosted;
        d[i + 1] = boosted;
        d[i + 2] = boosted;
      }
      ctx.putImageData(imgData, 0, 0);
    } catch (_) {}
  }

  function mount(container) {
    if (!doc || !container) return null;

    var state = {
      lang: detectLang(),
      presetKey: 'opsc-photo',
      width: 200,
      height: 230,
      minKb: 20,
      maxKb: 50,
      zoom: 100,
      offsetX: 0,
      offsetY: 0,
      rotation: 0,
      highContrastInk: false,
      addNameDateStrip: false,
      candidateName: '',
      photoDate: '27-11-2026',
      sourceImage: null,
      sourceLabel: '',
      sourceWidth: 0,
      sourceHeight: 0,
      sourceKb: 0,
      output: null
    };

    var previewCanvas = null;
    var statusHost = null;
    var downloadBtn = null;
    var isDragging = false;
    var dragStartX = 0;
    var dragStartY = 0;
    var dragBaseX = 0;
    var dragBaseY = 0;

    function getPreset(key) {
      for (var i = 0; i < PRESETS.length; i += 1) {
        if (PRESETS[i].key === key) return PRESETS[i];
      }
      return PRESETS[0];
    }

    function selectPreset(key) {
      var p = getPreset(key);
      state.presetKey = p.key;
      if (p.key !== 'custom') {
        state.width = p.width;
        state.height = p.height;
        state.minKb = p.minKb;
        state.maxKb = p.maxKb;
      }
      state.highContrastInk = p.kind === 'signature' || p.kind === 'thumb';
      if (p.kind !== 'photo' && p.kind !== 'custom') {
        state.addNameDateStrip = false;
      }
      render();
    }

    function renderCanvasAndCompress() {
      if (!previewCanvas) return;
      var w = Math.max(40, Math.min(1600, Math.round(Number(state.width) || 200)));
      var h = Math.max(30, Math.min(1600, Math.round(Number(state.height) || 230)));
      previewCanvas.width = w;
      previewCanvas.height = h;
      var ctx = previewCanvas.getContext('2d');
      if (!ctx) return;

      // Crisp white background so transparent PNGs never turn black in JPEG
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      var stripH = state.addNameDateStrip ? Math.max(26, Math.round(h * 0.17)) : 0;
      var drawH = h - stripH;

      if (state.sourceImage) {
        var srcW = state.sourceImage.naturalWidth || state.sourceImage.width || w;
        var srcH = state.sourceImage.naturalHeight || state.sourceImage.height || drawH;
        var rad = (state.rotation * Math.PI) / 180;
        var swapped = state.rotation % 180 !== 0;
        var effW = swapped ? srcH : srcW;
        var effH = swapped ? srcW : srcH;

        // Cover-fit into target frame, then apply zoom & offset
        var baseScale = Math.max(w / effW, drawH / effH);
        var scale = baseScale * (state.zoom / 100);
        var tx = w / 2 + (state.offsetX / 100) * (w * 0.5);
        var ty = drawH / 2 + (state.offsetY / 100) * (drawH * 0.5);

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, w, drawH);
        ctx.clip();
        ctx.translate(tx, ty);
        ctx.rotate(rad);
        ctx.scale(scale, scale);
        ctx.drawImage(state.sourceImage, -srcW / 2, -srcH / 2, srcW, srcH);
        ctx.restore();

        if (state.highContrastInk) {
          applyHighContrastInk(ctx, w, drawH);
        }
      } else {
        ctx.fillStyle = '#64748b';
        ctx.font = '600 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(w + ' × ' + h + ' px', w / 2, h / 2 - 4);
        ctx.font = '500 11px sans-serif';
        ctx.fillText(state.minKb + '–' + state.maxKb + ' KB JPG', w / 2, h / 2 + 14);
      }

      if (stripH > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, drawH, w, stripH);
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, drawH);
        ctx.lineTo(w, drawH);
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        var line1 = String(state.candidateName || 'CANDIDATE NAME').trim().toUpperCase().slice(0, 26);
        var line2 = String(state.photoDate || '').trim().slice(0, 18);
        var fontSize = Math.max(9, Math.min(13, Math.floor(stripH * 0.42)));
        ctx.font = 'bold ' + fontSize + 'px sans-serif';
        if (line2) {
          ctx.fillText(line1, w / 2, drawH + Math.round(stripH * 0.45));
          ctx.font = '600 ' + Math.max(8, fontSize - 1) + 'px sans-serif';
          ctx.fillText('DOP: ' + line2, w / 2, drawH + Math.round(stripH * 0.86));
        } else {
          ctx.fillText(line1, w / 2, drawH + Math.round(stripH * 0.65));
        }
      }

      if (state.sourceImage) {
        state.output = fitCanvasToTargetKb(previewCanvas, state.minKb, state.maxKb);
      } else {
        state.output = null;
      }
      updateReadout();
    }

    function updateReadout() {
      if (!statusHost) return;
      var isOr = state.lang === 'or';
      statusHost.replaceChildren();

      if (!state.output) {
        statusHost.appendChild(el('div', 'cso-psr-readout-empty', isOr
          ? 'ଏକ ଫଟୋ କିମ୍ବା ଦସ୍ତଖତ ଅପଲୋଡ୍ କରନ୍ତୁ (କିମ୍ବା ନମୁନା ଚିତ୍ର ଚେଷ୍ଟା କରନ୍ତୁ)।'
          : 'Select an image file or click "Try Sample Photo / Signature" to preview exact KB output.'));
        if (downloadBtn) downloadBtn.disabled = true;
        return;
      }

      if (downloadBtn) downloadBtn.disabled = false;
      var out = state.output;
      var statusCls = out.status === 'within' ? 'cso-psr-status is-ok' : 'cso-psr-status is-warn';
      var statusMsg = out.status === 'within'
        ? (isOr
          ? ('✅ ' + out.kb + ' KB — ' + state.minKb + '–' + state.maxKb + ' KB ସୀମା ଭିତରେ ଅଛି')
          : ('✅ ' + out.kb + ' KB — Within ' + state.minKb + '–' + state.maxKb + ' KB Limit'))
        : (out.status === 'below_min'
          ? (isOr
            ? ('⚠️ ' + out.kb + ' KB — ସର୍ବନିମ୍ନ ' + state.minKb + ' KB ଠାରୁ କମ୍ (ଉଚ୍ଚ ରିଜୋଲ୍ୟୁସନ୍ ଫଟୋ ବ୍ୟବହାର କରନ୍ତୁ)')
            : ('⚠️ ' + out.kb + ' KB — Below ' + state.minKb + ' KB min (try a higher-detail source photo)'))
          : (isOr
            ? ('⚠️ ' + out.kb + ' KB — ସର୍ବାଧିକ ' + state.maxKb + ' KB ଠାରୁ ଅଧିକ')
            : ('⚠️ ' + out.kb + ' KB — Above ' + state.maxKb + ' KB max (try cropping tighter)')));

      statusHost.appendChild(el('div', statusCls, statusMsg));

      var stats = el('div', 'cso-psr-stats-grid');
      [
        [isOr ? 'ମୂଳ ଫାଇଲ୍' : 'Original', state.sourceWidth + '×' + state.sourceHeight + ' px · ' + state.sourceKb + ' KB'],
        [isOr ? 'ଆଉଟପୁଟ୍ ଆକାର' : 'Output Size', state.width + '×' + state.height + ' px (JPG)'],
        [isOr ? 'JPEG ଗୁଣବତ୍ତା' : 'JPEG Quality', Math.round(out.quality * 100) + '%'],
        [isOr ? 'ଫାଇଲ୍ ଓଜନ' : 'Final KB', out.kb + ' KB']
      ].forEach(function (pair) {
        var tile = el('div', 'cso-psr-stat');
        tile.append(el('span', 'cso-psr-stat-k', pair[0]), el('b', 'cso-psr-stat-v', pair[1]));
        stats.appendChild(tile);
      });
      statusHost.appendChild(stats);
    }

    function loadFile(file) {
      if (!file || !/^image\/(jpeg|png|webp)$/i.test(file.type || '')) return;
      state.sourceLabel = file.name || 'image';
      state.sourceKb = bytesToKb(file.size || 0);
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          state.sourceImage = img;
          state.sourceWidth = img.naturalWidth || img.width;
          state.sourceHeight = img.naturalHeight || img.height;
          state.zoom = 100;
          state.offsetX = 0;
          state.offsetY = 0;
          state.rotation = 0;
          renderCanvasAndCompress();
        };
        img.src = String(reader.result || '');
      };
      reader.readAsDataURL(file);
    }

    function loadSample(kind) {
      var c = createSampleSourceCanvas(kind);
      state.sourceImage = c;
      state.sourceLabel = 'sample-' + kind + '.jpg';
      state.sourceWidth = c.width;
      state.sourceHeight = c.height;
      state.sourceKb = bytesToKb(dataUrlToBytes(c.toDataURL('image/jpeg', 0.92)));
      state.zoom = 100;
      state.offsetX = 0;
      state.offsetY = 0;
      state.rotation = 0;
      renderCanvasAndCompress();
    }

    function downloadOutput() {
      if (!state.output || !state.output.dataUrl) return;
      var a = doc.createElement('a');
      a.href = state.output.dataUrl;
      a.download = buildOutputFilename(state.presetKey, state.width, state.height, state.output.kb);
      doc.body.appendChild(a);
      a.click();
      a.remove();
    }

    function render() {
      var isOr = state.lang === 'or';
      var wrap = el('section', 'cso-psr-card');
      wrap.setAttribute('data-cso-photo-resizer', 'v409');
      wrap.setAttribute('aria-label', isOr ? 'ଫଟୋ ଓ ଦସ୍ତଖତ ରିସାଇଜର୍' : 'Browser-Side Photo, Signature & Thumb Impression Resizer');

      // Header + Privacy Badge + Language Switch
      var head = el('div', 'cso-psr-head');
      var headLeft = el('div', 'cso-psr-head-left');
      headLeft.appendChild(el('span', 'cso-psr-privacy-badge', isOr
        ? '🔒 ୧୦୦% ଆପଣଙ୍କ ଡିଭାଇସରେ · ସର୍ଭରକୁ ଅପଲୋଡ୍ ହୁଏ ନାହିଁ'
        : '🔒 100% On-Device · No Server Upload'));
      headLeft.appendChild(el('h2', 'cso-psr-title', isOr
        ? '📷 ପରୀକ୍ଷା ଫଟୋ, ଦସ୍ତଖତ ଓ ଆଙ୍ଗୁଠି ଛାପ ରିସାଇଜର୍ (OPSC / OSSC / CTET / NTA)'
        : '📷 Exam Photo, Signature & Thumb Impression Resizer / Compressor'));
      headLeft.appendChild(el('p', 'cso-psr-sub', isOr
        ? 'OPSC, OSSC, OSSSC, CBSE CTET ଓ NTA ର ସଠିକ୍ ପିକ୍ସେଲ୍ ଓ KB ସୀମା ଅନୁଯାୟୀ JPG ତିଆରି କରନ୍ତୁ।'
        : 'Crop, resize, and auto-compress JPG images to exact OPSC, OSSC, OSSSC, CTET, and NTA pixel & KB limits right inside your browser.'));

      var langWrap = el('div', 'cso-psr-lang-toggle');
      ['en', 'or'].forEach(function (code) {
        var lb = el('button', 'cso-psr-pill' + (state.lang === code ? ' is-active' : ''), code === 'or' ? 'ଓଡ଼ିଆ' : 'English');
        lb.type = 'button';
        lb.setAttribute('aria-pressed', state.lang === code ? 'true' : 'false');
        lb.addEventListener('click', function () { state.lang = code; render(); });
        langWrap.appendChild(lb);
      });
      head.append(headLeft, langWrap);
      wrap.appendChild(head);

      // 8 Exam Presets Bar
      var presetLabel = el('div', 'cso-psr-sec-label', isOr ? '୧. ପରୀକ୍ଷା ଓ ଡକ୍ୟୁମେଣ୍ଟ୍ ପ୍ରିସେଟ୍ ବାଛନ୍ତୁ' : '1. Choose Exam & Document Preset');
      wrap.appendChild(presetLabel);

      var presetGrid = el('div', 'cso-psr-preset-grid');
      presetGrid.setAttribute('role', 'group');
      presetGrid.setAttribute('aria-label', 'Exam dimension presets');
      PRESETS.forEach(function (p) {
        var active = p.key === state.presetKey;
        var pb = el('button', 'cso-psr-preset-btn' + (active ? ' is-active' : ''));
        pb.type = 'button';
        pb.setAttribute('data-psr-preset', p.key);
        pb.setAttribute('aria-pressed', active ? 'true' : 'false');
        pb.append(
          el('span', 'cso-psr-preset-name', isOr ? p.or : p.en),
          el('span', 'cso-psr-preset-note', p.note)
        );
        pb.addEventListener('click', function () { selectPreset(p.key); });
        presetGrid.appendChild(pb);
      });
      wrap.appendChild(presetGrid);

      // Custom Dimensions & KB Override Row
      if (state.presetKey === 'custom') {
        var customRow = el('div', 'cso-psr-custom-grid');
        [
          { key: 'width', label: isOr ? 'ଚଉଡ଼ା (px)' : 'Width (px)', min: 40, max: 1600 },
          { key: 'height', label: isOr ? 'ଉଚ୍ଚତା (px)' : 'Height (px)', min: 30, max: 1600 },
          { key: 'minKb', label: isOr ? 'ସର୍ବନିମ୍ନ KB' : 'Min KB', min: 1, max: 500 },
          { key: 'maxKb', label: isOr ? 'ସର୍ବାଧିକ KB' : 'Max KB', min: 2, max: 1000 }
        ].forEach(function (fld) {
          var box = el('label', 'cso-psr-field');
          box.appendChild(el('span', 'cso-psr-field-lbl', fld.label));
          var inp = el('input', 'cso-psr-input');
          inp.type = 'number';
          inp.min = String(fld.min);
          inp.max = String(fld.max);
          inp.value = String(state[fld.key]);
          inp.addEventListener('change', function () {
            state[fld.key] = Math.max(fld.min, Math.min(fld.max, Number(inp.value) || fld.min));
            renderCanvasAndCompress();
          });
          box.appendChild(inp);
          customRow.appendChild(box);
        });
        wrap.appendChild(customRow);
      }

      // Main 2-Column Workspace: Upload + Sliders | Live Canvas Preview + Download
      var workspace = el('div', 'cso-psr-workspace');

      // Left Column: Dropzone & Sliders
      var leftCol = el('div', 'cso-psr-controls');

      var dropzone = el('div', 'cso-psr-dropzone');
      var fileInp = el('input', 'cso-psr-file-input');
      fileInp.type = 'file';
      fileInp.id = 'cso-psr-file-input';
      fileInp.accept = 'image/jpeg,image/png,image/webp';
      fileInp.addEventListener('change', function () {
        if (fileInp.files && fileInp.files[0]) loadFile(fileInp.files[0]);
      });

      var pickLabel = el('label', 'cso-psr-btn cso-psr-btn--primary', isOr ? '📁 ଫଟୋ / ଦସ୍ତଖତ ବାଛନ୍ତୁ' : '📁 Choose Photo / Signature (JPG / PNG / WebP)');
      pickLabel.setAttribute('for', 'cso-psr-file-input');

      var sampleRow = el('div', 'cso-psr-sample-row');
      var samplePhotoBtn = el('button', 'cso-psr-btn', isOr ? '✨ ନମୁନା ଫଟୋ' : '✨ Try Sample Photo');
      samplePhotoBtn.type = 'button';
      samplePhotoBtn.addEventListener('click', function () { loadSample('photo'); });
      var sampleSignBtn = el('button', 'cso-psr-btn', isOr ? '✍️ ନମୁନା ଦସ୍ତଖତ' : '✍️ Try Sample Signature');
      sampleSignBtn.type = 'button';
      sampleSignBtn.addEventListener('click', function () { loadSample('signature'); });
      sampleRow.append(samplePhotoBtn, sampleSignBtn);

      dropzone.append(
        fileInp,
        pickLabel,
        el('div', 'cso-psr-drop-hint', isOr ? 'କିମ୍ବା ଏଠାରେ ଫାଇଲ୍ ଡ୍ରାଗ୍ ଓ ଡ୍ରପ୍ କରନ୍ତୁ' : 'Or drag & drop your image file here — processed 100% locally'),
        sampleRow
      );

      dropzone.addEventListener('dragover', function (ev) {
        ev.preventDefault();
        dropzone.classList.add('is-dragover');
      });
      dropzone.addEventListener('dragleave', function () {
        dropzone.classList.remove('is-dragover');
      });
      dropzone.addEventListener('drop', function (ev) {
        ev.preventDefault();
        dropzone.classList.remove('is-dragover');
        if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]) {
          loadFile(ev.dataTransfer.files[0]);
        }
      });
      leftCol.appendChild(dropzone);

      // Zoom, Pan & Orientation Sliders
      var slidersBox = el('div', 'cso-psr-sliders');
      [
        { key: 'zoom', label: isOr ? 'ଜୁମ୍ (%)' : 'Zoom (%)', min: 100, max: 300, step: 5 },
        { key: 'offsetX', label: isOr ? 'ବାମ / ଡାହାଣ ପ୍ୟାନ୍' : 'Horizontal Pan', min: -100, max: 100, step: 2 },
        { key: 'offsetY', label: isOr ? 'ଉପର / ତଳ ପ୍ୟାନ୍' : 'Vertical Pan', min: -100, max: 100, step: 2 }
      ].forEach(function (sl) {
        var row = el('label', 'cso-psr-slider-row');
        var valSpan = el('span', 'cso-psr-slider-val', String(state[sl.key]) + (sl.key === 'zoom' ? '%' : ''));
        var meta = el('div', 'cso-psr-slider-meta');
        meta.append(el('span', 'cso-psr-field-lbl', sl.label), valSpan);
        var rng = el('input', 'cso-psr-range');
        rng.type = 'range';
        rng.min = String(sl.min);
        rng.max = String(sl.max);
        rng.step = String(sl.step);
        rng.value = String(state[sl.key]);
        rng.addEventListener('input', function () {
          state[sl.key] = Number(rng.value);
          valSpan.textContent = String(state[sl.key]) + (sl.key === 'zoom' ? '%' : '');
          renderCanvasAndCompress();
        });
        row.append(meta, rng);
        slidersBox.appendChild(row);
      });
      leftCol.appendChild(slidersBox);

      // Action Toggles: Rotate 90°, Grayscale/High-Contrast Ink, Name & Date Strip
      var toggleRow = el('div', 'cso-psr-toggle-row');

      var rotBtn = el('button', 'cso-psr-btn', isOr ? '↻ ୯୦° ଘୂରାନ୍ତୁ' : '↻ Rotate 90°');
      rotBtn.type = 'button';
      rotBtn.addEventListener('click', function () {
        state.rotation = (state.rotation + 90) % 360;
        renderCanvasAndCompress();
      });

      var inkBtn = el('button', 'cso-psr-pill' + (state.highContrastInk ? ' is-active' : ''), isOr
        ? '🖨️ ଗ୍ରେସ୍କେଲ୍ / ସ୍ପଷ୍ଟ କାଳି'
        : '🖨️ Grayscale / High-Contrast Ink');
      inkBtn.type = 'button';
      inkBtn.setAttribute('aria-pressed', state.highContrastInk ? 'true' : 'false');
      inkBtn.addEventListener('click', function () {
        state.highContrastInk = !state.highContrastInk;
        render();
      });

      var stripBtn = el('button', 'cso-psr-pill' + (state.addNameDateStrip ? ' is-active' : ''), isOr
        ? '🏷️ ତଳେ ନାମ ଓ ତାରିଖ ଯୋଡ଼ନ୍ତୁ'
        : '🏷️ Add Name & Date Strip');
      stripBtn.type = 'button';
      stripBtn.setAttribute('aria-pressed', state.addNameDateStrip ? 'true' : 'false');
      stripBtn.addEventListener('click', function () {
        state.addNameDateStrip = !state.addNameDateStrip;
        render();
      });

      toggleRow.append(rotBtn, inkBtn, stripBtn);
      leftCol.appendChild(toggleRow);

      if (state.addNameDateStrip) {
        var stripGrid = el('div', 'cso-psr-custom-grid');
        var nameLbl = el('label', 'cso-psr-field');
        nameLbl.appendChild(el('span', 'cso-psr-field-lbl', isOr ? 'ପ୍ରାର୍ଥୀଙ୍କ ନାମ' : 'Candidate Name'));
        var nameInp = el('input', 'cso-psr-input');
        nameInp.type = 'text';
        nameInp.placeholder = 'e.g. ARJUN MOHANTY';
        nameInp.value = state.candidateName;
        nameInp.addEventListener('input', function () {
          state.candidateName = nameInp.value;
          renderCanvasAndCompress();
        });
        nameLbl.appendChild(nameInp);

        var dateLbl = el('label', 'cso-psr-field');
        dateLbl.appendChild(el('span', 'cso-psr-field-lbl', isOr ? 'ଫଟୋ ତାରିଖ (DOP)' : 'Photo Date (DOP)'));
        var dateInp = el('input', 'cso-psr-input');
        dateInp.type = 'text';
        dateInp.placeholder = 'DD-MM-YYYY';
        dateInp.value = state.photoDate;
        dateInp.addEventListener('input', function () {
          state.photoDate = dateInp.value;
          renderCanvasAndCompress();
        });
        dateLbl.appendChild(dateInp);

        stripGrid.append(nameLbl, dateLbl);
        leftCol.appendChild(stripGrid);
      }

      // Right Column: Live Canvas Preview + Readout + Download
      var rightCol = el('div', 'cso-psr-preview-pane');
      rightCol.appendChild(el('div', 'cso-psr-sec-label', isOr ? '୨. ଲାଇଭ୍ ପ୍ରିଭ୍ୟୁ (ଡ୍ରାଗ୍ କରି ପ୍ୟାନ୍ କରନ୍ତୁ)' : '2. Live Exact-Size Preview (Drag to Pan)'));

      var stage = el('div', 'cso-psr-canvas-stage');
      previewCanvas = doc.createElement('canvas');
      previewCanvas.className = 'cso-psr-canvas';
      previewCanvas.setAttribute('aria-label', 'Cropped and compressed exam photo preview');
      previewCanvas.addEventListener('pointerdown', function (ev) {
        if (!state.sourceImage) return;
        isDragging = true;
        dragStartX = ev.clientX;
        dragStartY = ev.clientY;
        dragBaseX = state.offsetX;
        dragBaseY = state.offsetY;
      });
      previewCanvas.addEventListener('pointermove', function (ev) {
        if (!isDragging) return;
        var dx = ev.clientX - dragStartX;
        var dy = ev.clientY - dragStartY;
        state.offsetX = Math.max(-100, Math.min(100, Math.round(dragBaseX + dx * 0.6)));
        state.offsetY = Math.max(-100, Math.min(100, Math.round(dragBaseY + dy * 0.6)));
        renderCanvasAndCompress();
      });
      previewCanvas.addEventListener('pointerup', function () { isDragging = false; });
      previewCanvas.addEventListener('pointercancel', function () { isDragging = false; });
      stage.appendChild(previewCanvas);
      rightCol.appendChild(stage);

      statusHost = el('div', 'cso-psr-readout');
      rightCol.appendChild(statusHost);

      var dlRow = el('div', 'cso-psr-dl-row');
      downloadBtn = el('button', 'cso-psr-btn cso-psr-btn--primary', isOr ? '⬇️ ପ୍ରସ୍ତୁତ JPG ଡାଉନଲୋଡ୍ କରନ୍ତୁ' : '⬇️ Download Ready JPG');
      downloadBtn.type = 'button';
      downloadBtn.disabled = !state.sourceImage;
      downloadBtn.addEventListener('click', downloadOutput);

      var resetBtn = el('button', 'cso-psr-btn', isOr ? '↻ ରିସେଟ୍' : '↻ Reset');
      resetBtn.type = 'button';
      resetBtn.addEventListener('click', function () {
        state.sourceImage = null;
        state.sourceLabel = '';
        state.sourceWidth = 0;
        state.sourceHeight = 0;
        state.sourceKb = 0;
        state.zoom = 100;
        state.offsetX = 0;
        state.offsetY = 0;
        state.rotation = 0;
        state.output = null;
        render();
      });

      dlRow.append(downloadBtn, resetBtn);
      rightCol.appendChild(dlRow);

      workspace.append(leftCol, rightCol);
      wrap.appendChild(workspace);

      container.replaceChildren(wrap);
      renderCanvasAndCompress();
    }

    render();
    return { selectPreset: selectPreset, loadSample: loadSample };
  }

  function autoInit() {
    if (!doc) return;
    var root = doc.getElementById('cso-photo-signature-resizer-root');
    if (root) mount(root);
  }

  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', autoInit);
    else autoInit();
  }

  return {
    version: 'v409',
    PRESETS: PRESETS,
    dataUrlToBytes: dataUrlToBytes,
    bytesToKb: bytesToKb,
    fitCanvasToTargetKb: fitCanvasToTargetKb,
    buildOutputFilename: buildOutputFilename,
    mount: mount
  };
});
