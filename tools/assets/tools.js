/* v163: Odisha Student Toolkit client controller — Photo/Signature Resizer + Age Calculator.
   100% CSP-compliant: external JS, addEventListener only, zero innerHTML or inline styles. */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }

  function formatKb(bytes) {
    return (bytes / 1024).toFixed(1) + ' KB';
  }

  /* ---------- Tool 1: Canvas Photo & Signature Resizer ---------- */
  function initResizer() {
    var presetWrap = $('resizer-presets');
    var widthEl = $('resizer-width');
    var heightEl = $('resizer-height');
    var minKbEl = $('resizer-min-kb');
    var maxKbEl = $('resizer-max-kb');
    var fileEl = $('resizer-file');
    var fileLabel = $('resizer-file-label');
    var processBtn = $('resizer-process-btn');
    var downloadBtn = $('resizer-download-btn');
    var statusEl = $('resizer-status');
    var previewGrid = $('resizer-preview-grid');
    var origImg = $('resizer-orig-img');
    var outImg = $('resizer-out-img');
    var origMeta = $('resizer-orig-meta');
    var outMeta = $('resizer-out-meta');
    var canvas = $('resizer-canvas');
    if (!presetWrap || !fileEl || !canvas) return;

    var loadedImg = null;
    var origFile = null;
    var activePreset = 'opsc-photo';
    var origObjectUrl = null;
    var outObjectUrl = null;
    var outBlob = null;

    function setStatus(msg) {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.hidden = !msg;
    }

    function canvasToJpegBlob(cvs, quality) {
      return new Promise(function (resolve) {
        cvs.toBlob(function (blob) { resolve(blob); }, 'image/jpeg', quality);
      });
    }

    async function encodeToTargetKb(cvs, minKb, maxKb) {
      var minBytes = Math.max(1024, minKb * 1024);
      var maxBytes = Math.max(minBytes, maxKb * 1024);
      var low = 0.08;
      var high = 0.98;
      var best = await canvasToJpegBlob(cvs, 0.85);
      if (!best) return null;

      if (best.size >= minBytes && best.size <= maxBytes) return best;

      for (var i = 0; i < 9; i++) {
        var mid = (low + high) / 2;
        var candidate = await canvasToJpegBlob(cvs, mid);
        if (!candidate) break;
        best = candidate;
        if (candidate.size > maxBytes) {
          high = mid;
        } else if (candidate.size < minBytes) {
          low = mid;
        } else {
          return candidate;
        }
      }
      if (best.size > maxBytes) {
        var floorBlob = await canvasToJpegBlob(cvs, low);
        if (floorBlob && floorBlob.size <= best.size) best = floorBlob;
      }
      return best;
    }

    async function processImage() {
      if (!loadedImg || !origFile) {
        setStatus('Select a photo or signature file first.');
        return;
      }
      var targetW = Math.max(40, Math.min(2000, Number(widthEl.value) || 200));
      var targetH = Math.max(20, Math.min(2000, Number(heightEl.value) || 230));
      var minKb = Math.max(5, Number(minKbEl.value) || 10);
      var maxKb = Math.max(minKb, Number(maxKbEl.value) || 50);

      canvas.width = targetW;
      canvas.height = targetH;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetW, targetH);

      var srcRatio = loadedImg.naturalWidth / loadedImg.naturalHeight;
      var dstRatio = targetW / targetH;
      var drawW = targetW;
      var drawH = targetH;
      var offsetX = 0;
      var offsetY = 0;
      if (activePreset.indexOf('sign') !== -1) {
        if (srcRatio > dstRatio) {
          drawW = targetW;
          drawH = targetW / srcRatio;
          offsetY = (targetH - drawH) / 2;
        } else {
          drawH = targetH;
          drawW = targetH * srcRatio;
          offsetX = (targetW - drawW) / 2;
        }
      } else {
        if (srcRatio > dstRatio) {
          drawH = targetH;
          drawW = targetH * srcRatio;
          offsetX = (targetW - drawW) / 2;
        } else {
          drawW = targetW;
          drawH = targetW / srcRatio;
          offsetY = (targetH - drawH) / 2;
        }
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(loadedImg, offsetX, offsetY, drawW, drawH);

      setStatus('Resizing and optimizing JPG quality in your browser…');
      var blob = await encodeToTargetKb(canvas, minKb, maxKb);
      if (!blob) {
        setStatus('Could not encode image in this browser.');
        return;
      }
      outBlob = blob;
      if (outObjectUrl) URL.revokeObjectURL(outObjectUrl);
      outObjectUrl = URL.createObjectURL(blob);
      outImg.src = outObjectUrl;
      outMeta.textContent = targetW + '×' + targetH + 'px · ' + formatKb(blob.size);
      origMeta.textContent = loadedImg.naturalWidth + '×' + loadedImg.naturalHeight + 'px · ' + formatKb(origFile.size);
      previewGrid.hidden = false;
      downloadBtn.hidden = false;
      setStatus('Ready! Output is ' + targetW + '×' + targetH + 'px (' + formatKb(blob.size) + ', target ' + minKb + '–' + maxKb + ' KB).');
    }

    presetWrap.addEventListener('click', function (e) {
      var btn = e.target.closest('.cso-preset-btn');
      if (!btn) return;
      presetWrap.querySelectorAll('.cso-preset-btn').forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      activePreset = btn.getAttribute('data-preset') || 'custom';
      if (activePreset !== 'custom') {
        widthEl.value = btn.getAttribute('data-w') || '200';
        heightEl.value = btn.getAttribute('data-h') || '230';
        minKbEl.value = btn.getAttribute('data-min-kb') || '20';
        maxKbEl.value = btn.getAttribute('data-max-kb') || '50';
      }
      if (loadedImg) processImage();
    });

    fileEl.addEventListener('change', function () {
      var file = fileEl.files && fileEl.files[0];
      if (!file) return;
      origFile = file;
      if (fileLabel) fileLabel.textContent = file.name + ' (' + formatKb(file.size) + ')';
      if (origObjectUrl) URL.revokeObjectURL(origObjectUrl);
      origObjectUrl = URL.createObjectURL(file);
      var img = new Image();
      img.addEventListener('load', function () {
        loadedImg = img;
        origImg.src = origObjectUrl;
        processBtn.disabled = false;
        processImage();
      });
      img.addEventListener('error', function () {
        setStatus('Could not read that image file. Please choose a JPG, PNG, or WebP file.');
      });
      img.src = origObjectUrl;
    });

    processBtn.addEventListener('click', processImage);

    downloadBtn.addEventListener('click', function () {
      if (!outBlob) return;
      var a = document.createElement('a');
      var url = URL.createObjectURL(outBlob);
      a.href = url;
      a.download = 'cso-' + activePreset + '-' + widthEl.value + 'x' + heightEl.value + '.jpg';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
    });
  }

  /* ---------- Tool 2: Odisha Govt Exam Age & Relaxation Calculator ---------- */
  var BOARD_AGE_PRESETS = {
    'opsc': { min: 21, max: 38 },
    'ossc-21': { min: 21, max: 38 },
    'ossc-18': { min: 18, max: 38 },
    'police-si': { min: 21, max: 25 },
    'police-const': { min: 18, max: 23 },
    'otet': { min: 21, max: 38 }
  };

  var ODISHA_RELAXATION_YEARS = {
    'UR': 0,
    'SEBC': 5,
    'SC / ST': 5,
    'Women': 5,
    'PwD (General)': 10,
    'PwD (SC/ST/SEBC)': 15
  };

  function parseFlexibleDate(raw) {
    var s = String(raw || '').trim();
    var mIso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (mIso) {
      var yi = Number(mIso[1]), mi = Number(mIso[2]), di = Number(mIso[3]);
      if (mi >= 1 && mi <= 12 && di >= 1 && di <= 31) return { y: yi, mo: mi, d: di, iso: s };
    }
    var mDmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(s);
    if (mDmy) {
      var dd = Number(mDmy[1]), mm = Number(mDmy[2]), yy = Number(mDmy[3]);
      if (mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        var iso = String(yy) + '-' + String(mm).padStart(2, '0') + '-' + String(dd).padStart(2, '0');
        return { y: yy, mo: mm, d: dd, iso: iso };
      }
    }
    return null;
  }

  function calculateOdishaExamAge(opts) {
    var dob = parseFlexibleDate(opts && opts.dob);
    var cutoff = parseFlexibleDate(opts && opts.cutoff);
    var minAge = Number(opts && opts.minAge);
    var maxAge = Number(opts && opts.maxAge);
    var category = String((opts && opts.category) || 'UR');
    var serviceYears = Math.max(0, Number(opts && opts.serviceYears) || 0);

    if (!dob || !cutoff || !Number.isFinite(minAge) || !Number.isFinite(maxAge) || maxAge <= 0) {
      return { valid: false, error: 'Enter valid DD/MM/YYYY dates and Min/Max age limits.' };
    }
    var dobUtc = Date.UTC(dob.y, dob.mo - 1, dob.d);
    var cutUtc = Date.UTC(cutoff.y, cutoff.mo - 1, cutoff.d);
    if (dobUtc > cutUtc) {
      return { valid: false, error: 'Date of Birth must be on or before the Cut-Off Date.' };
    }

    var years = cutoff.y - dob.y;
    var months = cutoff.mo - dob.mo;
    var days = cutoff.d - dob.d;
    if (days < 0) {
      var prevDays = new Date(Date.UTC(cutoff.y, cutoff.mo - 1, 0)).getUTCDate();
      days += prevDays;
      months -= 1;
    }
    if (months < 0) {
      months += 12;
      years -= 1;
    }

    var relaxation = category === 'Ex-Serviceman'
      ? serviceYears + 3
      : (Object.prototype.hasOwnProperty.call(ODISHA_RELAXATION_YEARS, category) ? ODISHA_RELAXATION_YEARS[category] : 0);
    var effectiveMaxAge = maxAge + relaxation;
    var underAge = years < minAge;
    var overAge = years > effectiveMaxAge || (years === effectiveMaxAge && (months > 0 || days > 0));
    var status = underAge ? 'Under-Age' : (overAge ? 'Over-Age' : 'Eligible');
    var remainingYears = overAge ? 0 : Math.max(0, effectiveMaxAge - years);

    return {
      valid: true,
      years: years,
      months: months,
      days: days,
      minAge: minAge,
      baseMaxAge: maxAge,
      relaxation: relaxation,
      effectiveMaxAge: effectiveMaxAge,
      category: category,
      eligible: !underAge && !overAge,
      underAge: underAge,
      overAge: overAge,
      status: status,
      remainingYears: remainingYears,
      nonCumulativeNote: category === 'Women' ? 'Note: Odisha Women (+5 yrs) relaxation is non-cumulative with SEBC/SC/ST.' : ''
    };
  }

  function calculateCbtScore(opts) {
    var total = Math.max(1, Math.floor(Number(opts && opts.total) || 0));
    var attempted = Math.max(0, Math.min(total, Math.floor(Number(opts && opts.attempted) || 0)));
    var correct = Math.max(0, Math.min(attempted, Math.floor(Number(opts && opts.correct) || 0)));
    var posMark = Number(opts && opts.posMark);
    var negMark = Number(opts && opts.negMark);
    if (!Number.isFinite(posMark) || posMark <= 0) posMark = 1;
    if (!Number.isFinite(negMark) || negMark < 0) negMark = 0;

    var wrong = Math.max(0, attempted - correct);
    var unattempted = Math.max(0, total - attempted);
    var grossScore = Number((correct * posMark).toFixed(2));
    var marksLost = Number((wrong * negMark).toFixed(2));
    var netScore = Number((grossScore - marksLost).toFixed(2));
    var maxScore = Number((total * posMark).toFixed(2));
    var pct = maxScore > 0 ? Number(((netScore / maxScore) * 100).toFixed(2)) : 0;
    var accuracyPct = attempted > 0 ? Number(((correct / attempted) * 100).toFixed(2)) : 0;

    return {
      total: total,
      attempted: attempted,
      correct: correct,
      wrong: wrong,
      unattempted: unattempted,
      grossScore: grossScore,
      marksLost: marksLost,
      netScore: netScore,
      maxScore: maxScore,
      pct: pct,
      accuracyPct: accuracyPct
    };
  }

  function initAgeCalculator() {
    var form = $('age-calc-form');
    var boardEl = $('age-board-preset');
    var dobEl = $('age-dob');
    var cutoffEl = $('age-cutoff');
    var minEl = $('age-min');
    var maxEl = $('age-max');
    var catEl = $('age-category');
    var svcWrap = $('age-service-wrap');
    var svcEl = $('age-service-years');
    var resultEl = $('age-result');
    var badgeEl = $('age-status-badge');
    var exactEl = $('age-exact-readout');
    var summaryEl = $('age-limit-summary');
    var attemptsEl = $('age-attempts-summary');
    var resetBtn = $('age-reset-btn');
    var cut2026 = $('age-cutoff-2026');
    var cut2027 = $('age-cutoff-2027');
    if (!form || !dobEl || !cutoffEl) return;

    function syncServiceVisibility() {
      if (svcWrap) svcWrap.hidden = catEl.value !== 'Ex-Serviceman';
    }

    function runCalc() {
      syncServiceVisibility();
      if (!dobEl.value.trim()) {
        resultEl.hidden = true;
        return;
      }
      var res = calculateOdishaExamAge({
        dob: dobEl.value,
        cutoff: cutoffEl.value || '01/01/2026',
        minAge: Number(minEl.value),
        maxAge: Number(maxEl.value),
        category: catEl.value,
        serviceYears: svcEl ? Number(svcEl.value) : 0
      });
      resultEl.hidden = false;
      if (!res.valid) {
        badgeEl.className = 'cso-age-badge cso-age-badge--over';
        badgeEl.textContent = 'Check Dates';
        exactEl.textContent = res.error;
        summaryEl.textContent = '';
        if (attemptsEl) attemptsEl.textContent = '';
        return;
      }
      badgeEl.className = 'cso-age-badge ' + (res.eligible ? 'cso-age-badge--ok' : 'cso-age-badge--over');
      badgeEl.textContent = res.eligible ? '✓ Eligible' : ('✕ ' + res.status);
      exactEl.textContent = res.years + ' Years, ' + res.months + ' Months, ' + res.days + ' Days';
      summaryEl.textContent = 'Effective upper age limit: ' + res.effectiveMaxAge + ' yrs (Min ' + res.minAge + ' · Base ' + res.baseMaxAge + ' + ' + res.relaxation + ' yrs ' + res.category + ' relaxation as of ' + (cutoffEl.value || '01/01/2026') + ').';
      if (attemptsEl) {
        var remText = res.eligible
          ? ('Remaining upper-age window: ~' + res.remainingYears + ' year(s) / annual exam cycle(s) remaining.')
          : (res.underAge ? 'Minimum age requirement (' + res.minAge + ' yrs) not yet met.' : 'Upper age limit exceeded for this preset.');
        attemptsEl.textContent = res.nonCumulativeNote ? (remText + ' ' + res.nonCumulativeNote) : remText;
      }
    }

    if (boardEl) {
      boardEl.addEventListener('change', function () {
        var p = BOARD_AGE_PRESETS[boardEl.value];
        if (p) {
          minEl.value = String(p.min);
          maxEl.value = String(p.max);
        }
        runCalc();
      });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      runCalc();
    });
    [dobEl, cutoffEl, minEl, maxEl, catEl, svcEl].forEach(function (inp) {
      if (inp) inp.addEventListener('change', runCalc);
    });
    if (cut2026) cut2026.addEventListener('click', function () { cutoffEl.value = '01/01/2026'; runCalc(); });
    if (cut2027) cut2027.addEventListener('click', function () { cutoffEl.value = '01/01/2027'; runCalc(); });
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (boardEl) boardEl.value = 'opsc';
        dobEl.value = '';
        cutoffEl.value = '01/01/2026';
        minEl.value = '21';
        maxEl.value = '38';
        catEl.value = 'UR';
        if (svcEl) svcEl.value = '5';
        syncServiceVisibility();
        resultEl.hidden = true;
      });
    }
    syncServiceVisibility();
  }

  /* ---------- Tool 2B: CBT Negative-Marking Score Estimator ---------- */
  var CBT_MARKING_PRESETS = {
    opsc: { pos: 2, neg: 0.66 },
    osssc: { pos: 1, neg: 0.33 },
    police: { pos: 1, neg: 0.25 },
    otet: { pos: 1, neg: 0 }
  };

  function initCbtCalculator() {
    var form = $('cbt-calc-form');
    var presetEl = $('cbt-calc-preset');
    var totalEl = $('cbt-total-q');
    var attEl = $('cbt-attempted-q');
    var corEl = $('cbt-correct-q');
    var posEl = $('cbt-pos-mark');
    var negEl = $('cbt-neg-mark');
    var resEl = $('cbt-calc-result');
    var resetBtn = $('cbt-calc-reset');
    if (!form || !resEl) return;

    function runCbtCalc() {
      var out = calculateCbtScore({
        total: totalEl.value,
        attempted: attEl.value,
        correct: corEl.value,
        posMark: posEl.value,
        negMark: negEl.value
      });
      resEl.hidden = false;
      while (resEl.firstChild) resEl.removeChild(resEl.firstChild);

      var grid = document.createElement('div');
      grid.className = 'cso-cbt-calc-grid';
      [
        ['Net Score', out.netScore + ' / ' + out.maxScore],
        ['Percentage', out.pct + '%'],
        ['Accuracy', out.accuracyPct + '%'],
        ['Wrong / Lost', out.wrong + ' Qs (-' + out.marksLost + ')']
      ].forEach(function (pair) {
        var box = document.createElement('div');
        box.className = 'cso-cbt-calc-box';
        var lbl = document.createElement('span');
        lbl.textContent = pair[0];
        var val = document.createElement('strong');
        val.textContent = pair[1];
        box.appendChild(lbl);
        box.appendChild(val);
        grid.appendChild(box);
      });
      resEl.appendChild(grid);
    }

    if (presetEl) {
      presetEl.addEventListener('change', function () {
        var p = CBT_MARKING_PRESETS[presetEl.value];
        if (p) {
          posEl.value = String(p.pos);
          negEl.value = String(p.neg);
        }
        runCbtCalc();
      });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      runCbtCalc();
    });
    [totalEl, attEl, corEl, posEl, negEl].forEach(function (inp) {
      if (inp) inp.addEventListener('input', runCbtCalc);
    });
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        if (presetEl) presetEl.value = 'opsc';
        totalEl.value = '100';
        attEl.value = '80';
        corEl.value = '65';
        posEl.value = '2';
        negEl.value = '0.66';
        resEl.hidden = true;
      });
    }
  }

  /* ---------- Tool 3: Official Link & WhatsApp Scam-Check ---------- */
  var SHORTENER_HOSTS = new Set(['bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'rb.gy', 'is.gd', 'shorturl.at', 'ow.ly', 'goo.gl']);
  var LOOKALIKE_KEYWORDS = ['opsc', 'ossc', 'osssc', 'subhadra', 'kalia', 'pmkisan', 'odishagov', 'samsodisha'];
  var SCAM_PHRASES = [
    'forward to 10 groups',
    'forward to 5 groups',
    'pay registration fee via upi',
    'pay fee via upi',
    'urgent last chance',
    'click below to claim',
    '100% guaranteed job',
    'free laptop yojana'
  ];

  function extractUrls(text) {
    var raw = String(text || '');
    var matches = raw.match(/(?:https?:\/\/[^\s<>"']+|(?:[a-z0-9-]+\.)+(?:gov\.in|nic\.in|ac\.in|odisha\.gov\.in|com|in|xyz|org|net|online|site|info|ly|co)(?:\/[^\s<>"']*)?)/gi) || [];
    var seen = new Set();
    var out = [];
    matches.forEach(function (m) {
      var clean = m.replace(/[),.;!?]+$/, '');
      if (!seen.has(clean)) {
        seen.add(clean);
        out.push(clean);
      }
    });
    return out;
  }

  function isOfficialGovHost(hostname) {
    var h = String(hostname || '').toLowerCase().replace(/:\d+$/, '');
    return (
      h === 'gov.in' ||
      h.endsWith('.gov.in') ||
      h === 'nic.in' ||
      h.endsWith('.nic.in') ||
      h.endsWith('.odisha.gov.in') ||
      h === 'ac.in' ||
      h.endsWith('.ac.in')
    );
  }

  function analyzeScamInput(rawText) {
    var text = String(rawText || '').trim();
    if (!text) {
      return { verdict: 'empty', badge: 'Enter URL or Message', reasons: ['Paste a URL or WhatsApp forward message to inspect.'], urls: [] };
    }
    var urls = extractUrls(text);
    var lower = text.toLowerCase();
    var reasons = [];
    var hasHighRisk = false;
    var hasOfficial = false;

    SCAM_PHRASES.forEach(function (phrase) {
      if (lower.includes(phrase)) {
        hasHighRisk = true;
        reasons.push('Scam phrase detected: "' + phrase + '"');
      }
    });

    urls.forEach(function (rawUrl) {
      var normalized = /^https?:\/\//i.test(rawUrl) ? rawUrl : 'https://' + rawUrl;
      var parsed;
      try {
        parsed = new URL(normalized);
      } catch (_) {
        hasHighRisk = true;
        reasons.push('Malformed URL: ' + rawUrl);
        return;
      }
      var host = parsed.hostname.toLowerCase().replace(/^www\./, '');
      if (/^http:\/\//i.test(rawUrl)) {
        hasHighRisk = true;
        reasons.push('Insecure http:// link (official portals use https://): ' + rawUrl);
      }
      if (SHORTENER_HOSTS.has(host)) {
        hasHighRisk = true;
        reasons.push('URL shortener hides true destination (' + host + ')');
        return;
      }
      if (isOfficialGovHost(host) && parsed.protocol === 'https:') {
        hasOfficial = true;
        reasons.push('Verified official domain: ' + host);
      } else if (isOfficialGovHost(host)) {
        hasHighRisk = true;
        reasons.push('Official domain served over insecure http://: ' + host);
      } else {
        var isLookalike = LOOKALIKE_KEYWORDS.some(function (kw) { return host.includes(kw); });
        if (isLookalike || /\.(xyz|blogspot\.com|wordpress\.com|online|site)$/i.test(host)) {
          hasHighRisk = true;
          reasons.push('Lookalike or non-official domain (' + host + ') — not .gov.in / .nic.in');
        } else {
          hasHighRisk = true;
          reasons.push('Unverified non-government domain: ' + host);
        }
      }
    });

    if (!urls.length && !hasHighRisk) {
      return {
        verdict: 'warn',
        badge: '⚠ No URL Found',
        reasons: ['No website link was detected in this text. Always verify official schemes on .gov.in or .nic.in portals.'],
        urls: []
      };
    }

    if (hasHighRisk) {
      return {
        verdict: 'suspicious',
        badge: '⚠ Suspicious / Unverified',
        reasons: reasons,
        urls: urls
      };
    }

    return {
      verdict: 'official',
      badge: '✓ Official Govt Domain',
      reasons: reasons,
      urls: urls
    };
  }

  function initScamChecker() {
    var inputEl = $('scam-input');
    var checkBtn = $('scam-check-btn');
    var clearBtn = $('scam-clear-btn');
    var resultEl = $('scam-result');
    if (!inputEl || !checkBtn || !resultEl) return;

    function runCheck() {
      var res = analyzeScamInput(inputEl.value);
      while (resultEl.firstChild) resultEl.removeChild(resultEl.firstChild);
      resultEl.hidden = false;

      var badgeCls = res.verdict === 'official' ? 'cso-scam-badge is-safe' : 'cso-scam-badge is-warn';
      var badge = document.createElement('span');
      badge.className = badgeCls;
      badge.textContent = res.badge;
      resultEl.appendChild(badge);

      var ul = document.createElement('ul');
      ul.className = 'cso-scam-list';
      res.reasons.forEach(function (r) {
        var li = document.createElement('li');
        li.textContent = r;
        ul.appendChild(li);
      });
      resultEl.appendChild(ul);
    }

    checkBtn.addEventListener('click', runCheck);
    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        inputEl.value = '';
        resultEl.hidden = true;
        while (resultEl.firstChild) resultEl.removeChild(resultEl.firstChild);
        inputEl.focus();
      });
    }
  }

  function boot() {
    initResizer();
    initAgeCalculator();
    initCbtCalculator();
    initScamChecker();
  }

  if (typeof window !== 'undefined') {
    window.CSOToolsScamCheck = {
      extractUrls: extractUrls,
      isOfficialGovHost: isOfficialGovHost,
      analyzeScamInput: analyzeScamInput
    };
    window.CSOToolsCalculators = {
      parseFlexibleDate: parseFlexibleDate,
      calculateOdishaExamAge: calculateOdishaExamAge,
      calculateCbtScore: calculateCbtScore
    };
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      extractUrls: extractUrls,
      isOfficialGovHost: isOfficialGovHost,
      analyzeScamInput: analyzeScamInput,
      parseFlexibleDate: parseFlexibleDate,
      calculateOdishaExamAge: calculateOdishaExamAge,
      calculateCbtScore: calculateCbtScore
    };
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})();
