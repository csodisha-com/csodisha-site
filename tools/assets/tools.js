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

  var CARRY_BAG_KEY = 'cso_exam_day_bag_v1';
  var CARRY_BAG_ITEMS = [
    { id: 'admit_card', en: 'Printed Admit Card / Hall Ticket', or: 'ପ୍ରିଣ୍ଟ ହୋଇଥିବା ଆଡମିଟ୍ କାର୍ଡ / ହଲ୍ ଟିକେଟ୍' },
    { id: 'photo_id', en: 'Original Govt Photo ID — Aadhaar / Voter ID / DL', or: 'ମୂଳ ସରକାରୀ ଫଟୋ ପରିଚୟପତ୍ର (ଆଧାର / ଭୋଟର୍ / DL)' },
    { id: 'passport_photos', en: '2 Recent Passport Photos matching OTR', or: 'OTR ସହିତ ମେଳ ଖାଉଥିବା ୨ଟି ସାମ୍ପ୍ରତିକ ପାସପୋର୍ଟ ଫଟୋ' },
    { id: 'ballpoint_pens', en: 'Blue / Black Ballpoint Pens (2x)', or: 'ନୀଳ / କଳା ବଲ୍-ପଏଣ୍ଟ କଲମ (୨ଟି)' },
    { id: 'water_bottle', en: 'Transparent Water Bottle', or: 'ସ୍ୱଚ୍ଛ ପାଣି ବୋତଲ' },
    { id: 'pwd_scribe', en: 'PwD / Scribe Certificate (if applicable)', or: 'PwD / ସ୍କ୍ରାଇବ୍ ପ୍ରମାଣପତ୍ର (ଯଦି ପ୍ରଯୁଜ୍ୟ)' }
  ];

  function formatMinutes12h(totalMins) {
    var mins = ((totalMins % 1440) + 1440) % 1440;
    var h24 = Math.floor(mins / 60);
    var m = mins % 60;
    var ampm = h24 >= 12 ? 'PM' : 'AM';
    var h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    var hStr = h12 < 10 ? '0' + h12 : String(h12);
    var mStr = m < 10 ? '0' + m : String(m);
    return hStr + ':' + mStr + ' ' + ampm;
  }

  function calculateExamDayLogistics(opts) {
    var o = opts && typeof opts === 'object' ? opts : {};
    var examName = String(o.examName || 'Odisha Govt Exam').trim() || 'Odisha Govt Exam';
    var homeDistrict = String(o.homeDistrict || '').trim();
    var centreDistrict = String(o.centreDistrict || '').trim();
    var examDate = String(o.examDate || '').trim();
    var gateRaw = String(o.gateTime || '09:00').trim();
    var m = gateRaw.match(/^(\d{1,2}):(\d{2})$/);
    var gateH = m ? Math.min(23, Math.max(0, Number(m[1]))) : 9;
    var gateM = m ? Math.min(59, Math.max(0, Number(m[2]))) : 0;
    var gateTotal = gateH * 60 + gateM;
    var arrivalTotal = gateTotal - 45;
    var sameDayLeaveTotal = gateTotal - 90;

    var arrivalTimeLabel = formatMinutes12h(arrivalTotal);
    var gateClosingLabel = formatMinutes12h(gateTotal);
    var sameDayLeaveLabel = formatMinutes12h(sameDayLeaveTotal);
    var isInterDistrict = Boolean(homeDistrict && centreDistrict && homeDistrict !== centreDistrict);
    var centreDisplay = o.centreDistrictLabel || centreDistrict || 'Exam Centre';

    var departureWindow = isInterDistrict
      ? 'Overnight Travel Advisory: Home district differs from exam centre (' + centreDisplay + '). Travel the previous afternoon/evening and stay near the centre to arrive by ' + arrivalTimeLabel + '.'
      : 'Same-Day Morning Departure: Start around ' + sameDayLeaveLabel + ' (90 mins before gate closure) to reach the centre comfortably by ' + arrivalTimeLabel + '.';

    return {
      examName: examName,
      homeDistrict: homeDistrict,
      centreDistrict: centreDistrict,
      examDate: examDate,
      gateClosingTime: gateRaw,
      gateClosingLabel: gateClosingLabel,
      arrivalTimeLabel: arrivalTimeLabel,
      isInterDistrict: isInterDistrict,
      departureWindow: departureWindow
    };
  }

  function buildExamDayIcs(opts) {
    var log = calculateExamDayLogistics(opts);
    if (!log.examDate) return '';
    if (typeof window !== 'undefined' && window.CSO_DEADLINE_TRACKER && typeof window.CSO_DEADLINE_TRACKER.buildIcsContent === 'function') {
      return window.CSO_DEADLINE_TRACKER.buildIcsContent({
        id: 'exam-day-' + log.examDate,
        title: log.examName + ' (Arrive ' + log.arrivalTimeLabel + ')',
        board: log.examName,
        district: opts.centreDistrictLabel || log.centreDistrict || 'Odisha',
        lastDate: log.examDate,
        applyUrl: 'https://csodisha.com/tools/#exam-centre-planner'
      });
    }
    var dt = log.examDate.replace(/-/g, '');
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Common Sense Odisha//Exam Centre Planner//EN',
      'BEGIN:VEVENT',
      'UID:exam-day-' + dt + '@csodisha.com',
      'DTSTART;VALUE=DATE:' + dt,
      'SUMMARY:' + log.examName + ' — Arrive by ' + log.arrivalTimeLabel,
      'DESCRIPTION:' + log.departureWindow,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Exam Day Tomorrow: ' + log.examName,
      'TRIGGER:-PT24H',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n') + '\r\n';
  }

  function initExamCentrePlanner() {
    var form = $('centre-planner-form');
    var examEl = $('centre-exam-name');
    var homeEl = $('centre-home-district');
    var centreEl = $('centre-exam-district');
    var dateEl = $('centre-exam-date');
    var gateEl = $('centre-gate-time');
    var icsBtn = $('centre-ics-btn');
    var resultEl = $('centre-schedule-result');
    var bagListEl = $('centre-bag-checklist');
    var bagProgEl = $('centre-bag-progress');
    var bagBadgeEl = $('centre-bag-badge');
    if (!form || !homeEl || !centreEl || !resultEl) return;

    var districts = (typeof window !== 'undefined' && Array.isArray(window.CSO_ODISHA_DISTRICTS))
      ? window.CSO_ODISHA_DISTRICTS
      : [];

    function populateDistrictSelect(sel, defaultSlug) {
      while (sel.firstChild) sel.removeChild(sel.firstChild);
      districts.forEach(function (d) {
        var opt = document.createElement('option');
        opt.value = d.slug;
        opt.textContent = d.name_en + ' (' + d.name_or + ')';
        if (d.slug === defaultSlug) opt.selected = true;
        sel.appendChild(opt);
      });
    }

    populateDistrictSelect(homeEl, 'khordha');
    populateDistrictSelect(centreEl, 'cuttack');

    if (dateEl && !dateEl.value) {
      var defDate = new Date(Date.now() + 7 * 86400000);
      dateEl.value = defDate.toISOString().slice(0, 10);
    }

    function selectedLabel(sel) {
      var opt = sel.options[sel.selectedIndex];
      return opt ? opt.textContent : sel.value;
    }

    function renderSchedule() {
      var log = calculateExamDayLogistics({
        examName: examEl ? examEl.value : '',
        homeDistrict: homeEl.value,
        centreDistrict: centreEl.value,
        centreDistrictLabel: selectedLabel(centreEl),
        examDate: dateEl ? dateEl.value : '',
        gateTime: gateEl ? gateEl.value : '09:00'
      });

      while (resultEl.firstChild) resultEl.removeChild(resultEl.firstChild);
      var grid = document.createElement('div');
      grid.className = 'cso-cbt-calc-grid';

      function addCard(label, val) {
        var box = document.createElement('div');
        box.className = 'cso-cbt-calc-box';
        var sp = document.createElement('span');
        sp.textContent = label;
        var st = document.createElement('strong');
        st.textContent = val;
        box.appendChild(sp);
        box.appendChild(st);
        grid.appendChild(box);
      }

      addCard('Centre Arrival Time (45m prior)', log.arrivalTimeLabel);
      addCard('Gate Closing Time', log.gateClosingLabel);
      addCard('Travel Type', log.isInterDistrict ? 'Inter-District Travel' : 'Same-District');
      resultEl.appendChild(grid);

      var advisory = document.createElement('p');
      advisory.className = log.isInterDistrict ? 'cso-centre-advisory is-inter' : 'cso-centre-advisory';
      advisory.textContent = log.departureWindow;
      resultEl.appendChild(advisory);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      renderSchedule();
    });
    [homeEl, centreEl, dateEl, gateEl].forEach(function (ctrl) {
      if (ctrl) ctrl.addEventListener('change', renderSchedule);
    });
    renderSchedule();

    if (icsBtn) {
      icsBtn.addEventListener('click', function () {
        var log = calculateExamDayLogistics({
          examName: examEl ? examEl.value : '',
          homeDistrict: homeEl.value,
          centreDistrict: centreEl.value,
          centreDistrictLabel: selectedLabel(centreEl),
          examDate: dateEl ? dateEl.value : '',
          gateTime: gateEl ? gateEl.value : '09:00'
        });
        if (!log.examDate) return;
        if (window.CSO_DEADLINE_TRACKER && typeof window.CSO_DEADLINE_TRACKER.downloadIcsReminder === 'function') {
          window.CSO_DEADLINE_TRACKER.downloadIcsReminder({
            id: 'exam-day-' + log.examDate,
            title: log.examName + ' — Arrive ' + log.arrivalTimeLabel,
            board: log.examName,
            district: selectedLabel(centreEl),
            lastDate: log.examDate,
            applyUrl: 'https://csodisha.com/tools/#exam-centre-planner'
          });
          return;
        }
        var ics = buildExamDayIcs({
          examName: log.examName,
          homeDistrict: log.homeDistrict,
          centreDistrict: log.centreDistrict,
          centreDistrictLabel: selectedLabel(centreEl),
          examDate: log.examDate,
          gateTime: log.gateClosingTime
        });
        if (!ics || typeof Blob === 'undefined') return;
        var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'cso-exam-day-' + log.examDate + '.ics';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 1000);
      });
    }

    if (bagListEl) {
      var bagState = {};
      try {
        bagState = JSON.parse(localStorage.getItem(CARRY_BAG_KEY) || '{}') || {};
      } catch (_) { bagState = {}; }

      function updateBagProgress() {
        var ready = CARRY_BAG_ITEMS.filter(function (it) { return Boolean(bagState[it.id]); }).length;
        if (bagProgEl) {
          bagProgEl.max = CARRY_BAG_ITEMS.length;
          bagProgEl.value = ready;
        }
        if (bagBadgeEl) {
          bagBadgeEl.textContent = ready + ' / ' + CARRY_BAG_ITEMS.length + ' Ready';
        }
      }

      while (bagListEl.firstChild) bagListEl.removeChild(bagListEl.firstChild);
      CARRY_BAG_ITEMS.forEach(function (it) {
        var row = document.createElement('label');
        row.className = 'cso-carrybag-row' + (bagState[it.id] ? ' is-packed' : '');

        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = Boolean(bagState[it.id]);
        cb.setAttribute('aria-label', it.en + ' (' + it.or + ')');
        cb.addEventListener('change', function () {
          bagState[it.id] = cb.checked;
          row.classList.toggle('is-packed', cb.checked);
          try { localStorage.setItem(CARRY_BAG_KEY, JSON.stringify(bagState)); } catch (_) {}
          updateBagProgress();
        });

        var copy = document.createElement('div');
        copy.className = 'cso-carrybag-copy';
        var enEl = document.createElement('strong');
        enEl.textContent = it.en;
        var orEl = document.createElement('span');
        orEl.textContent = it.or;
        copy.appendChild(enEl);
        copy.appendChild(orEl);

        row.appendChild(cb);
        row.appendChild(copy);
        bagListEl.appendChild(row);
      });
      updateBagProgress();
    }
  }

  var ORSP_PAY_LEVELS = {
    '4': { level: 4, basicPay: 19900, label: 'Level 4 — OSSSC ARI / Amin / Livestock Inspector' },
    '5': { level: 5, basicPay: 21700, label: 'Level 5 — Odisha Police Constable / Forest Guard' },
    '7': { level: 7, basicPay: 25500, label: 'Level 7 — OSSSC RI / Junior Assistant' },
    '9': { level: 9, basicPay: 35400, label: 'Level 9 — OSSC ASO / CGLRE / Police SI / ICDS Supervisor' },
    '10': { level: 10, basicPay: 44900, label: 'Level 10 — OPSC Group-B / Lecturer / Assistant Engineer' },
    '12': { level: 12, basicPay: 56100, label: 'Level 12 — OPSC OAS / OFS / OPS Group-A' }
  };

  function calculateOrspSalaryAndFee(opts) {
    var o = opts && typeof opts === 'object' ? opts : {};
    var lvlKey = String(o.level || '9');
    var entry = ORSP_PAY_LEVELS[lvlKey] || ORSP_PAY_LEVELS['9'];
    var basicPay = entry.basicPay;
    var daPct = Math.max(0, Math.min(200, Number(o.daPct !== undefined ? o.daPct : 53) || 0));
    var hraPct = Math.max(0, Math.min(50, Number(o.hraPct !== undefined ? o.hraPct : 8) || 0));

    var daAmount = Math.round(basicPay * (daPct / 100));
    var hraAmount = Math.round(basicPay * (hraPct / 100));
    var grossSalary = basicPay + daAmount + hraAmount;
    var npsDeduction = Math.round((basicPay + daAmount) * 0.10);
    var professionalTax = 200;
    var netInHand = grossSalary - npsDeduction - professionalTax;

    var feeCat = String(o.feeCategory || 'odisha-waived');
    var examFee = 0;
    var examFeeLabel = '₹0 (Odisha State Exam Fee Waived)';
    var isFeeWaived = true;
    if (feeCat === 'central-gen') {
      examFee = 100;
      examFeeLabel = '₹100 (Central SSC / Banking Gen/OBC)';
      isFeeWaived = false;
    } else if (feeCat === 'central-exempt') {
      examFee = 0;
      examFeeLabel = '₹0 (Central SC/ST/PwD/Female Exempt)';
      isFeeWaived = true;
    }

    return {
      level: entry.level,
      levelLabel: entry.label,
      basicPay: basicPay,
      daPct: daPct,
      daAmount: daAmount,
      hraPct: hraPct,
      hraAmount: hraAmount,
      grossSalary: grossSalary,
      npsDeduction: npsDeduction,
      professionalTax: professionalTax,
      netInHand: netInHand,
      examFee: examFee,
      examFeeLabel: examFeeLabel,
      isFeeWaived: isFeeWaived
    };
  }

  function formatInr(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN');
  }

  function initOrspSalaryCalculator() {
    var form = $('orsp-salary-form');
    var levelEl = $('orsp-pay-level');
    var hraEl = $('orsp-hra-tier');
    var daEl = $('orsp-da-pct');
    var feeEl = $('orsp-fee-category');
    var resultEl = $('orsp-salary-result');
    if (!form || !levelEl || !hraEl || !daEl || !feeEl || !resultEl) return;

    function render() {
      var res = calculateOrspSalaryAndFee({
        level: levelEl.value,
        hraPct: hraEl.value,
        daPct: daEl.value,
        feeCategory: feeEl.value
      });

      while (resultEl.firstChild) resultEl.removeChild(resultEl.firstChild);

      var badge = document.createElement('span');
      badge.className = res.isFeeWaived ? 'cso-scam-badge is-safe' : 'cso-scam-badge is-warn';
      badge.textContent = res.isFeeWaived ? '✓ Odisha State Exam Fee Waiver: ₹0' : 'ℹ Applicable Exam Fee: ₹100';
      resultEl.appendChild(badge);

      var grid = document.createElement('div');
      grid.className = 'cso-cbt-calc-grid';

      function addBox(label, val, highlightCls) {
        var box = document.createElement('div');
        box.className = 'cso-cbt-calc-box' + (highlightCls ? ' ' + highlightCls : '');
        var sp = document.createElement('span');
        sp.textContent = label;
        var st = document.createElement('strong');
        st.textContent = val;
        box.appendChild(sp);
        box.appendChild(st);
        grid.appendChild(box);
      }

      addBox('Monthly Basic Pay (Level ' + res.level + ')', formatInr(res.basicPay));
      addBox('Dearness Allowance (' + res.daPct + '% DA)', formatInr(res.daAmount));
      addBox('House Rent Allowance (' + res.hraPct + '% HRA)', formatInr(res.hraAmount));
      addBox('Monthly Gross Salary', formatInr(res.grossSalary));
      addBox('NPS (10% Basic+DA) + Prof. Tax', formatInr(res.npsDeduction) + ' + ₹' + res.professionalTax);
      addBox('Net Monthly In-Hand Salary', formatInr(res.netInHand), 'cso-orsp-net-box');
      addBox('Applicable Exam Fee', res.examFeeLabel);

      resultEl.appendChild(grid);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      render();
    });
    [levelEl, hraEl, daEl, feeEl].forEach(function (ctrl) {
      ctrl.addEventListener('change', render);
      ctrl.addEventListener('input', render);
    });
    render();
  }

  var PET_LOG_KEY = 'cso_pet_practice_log_v1';

  var ODISHA_PET_STANDARDS = {
    'police-si': {
      label: 'Odisha Police Sub-Inspector (SI)',
      Male: {
        'General / SEBC': { heightCm: 168, weightKg: 55, chestUnexpCm: 79, chestExpMinCm: 5 },
        'SC / ST': { heightCm: 163, weightKg: 50, chestUnexpCm: 76, chestExpMinCm: 5 },
        petEvents: ['1600m Run (8 mins)', 'Long Jump 3.66m (3 chances)']
      },
      Female: {
        'General / SEBC': { heightCm: 155, weightKg: 47.5 },
        'SC / ST': { heightCm: 150, weightKg: 45 },
        petEvents: ['1600m Run (10 mins)', 'Long Jump 2.75m (3 chances)']
      }
    },
    'police-constable': {
      label: 'Odisha Police Constable / Sepoy',
      Male: {
        'General / SEBC': { heightCm: 168, weightKg: 55, chestUnexpCm: 79, chestExpMinCm: 5 },
        'SC / ST': { heightCm: 163, weightKg: 50, chestUnexpCm: 76, chestExpMinCm: 5 },
        petEvents: ['1600m Run (7 mins)', 'Long Jump 3.66m', 'High Jump 1.22m']
      },
      Female: {
        'General / SEBC': { heightCm: 155, weightKg: 47.5 },
        'SC / ST': { heightCm: 150, weightKg: 45 },
        petEvents: ['1600m Run (9 mins)', 'Long Jump 2.75m', 'High Jump 0.90m']
      }
    },
    'forest-guard': {
      label: 'OSSSC Forest Guard / Forester',
      Male: {
        'General / SEBC': { heightCm: 168, weightKg: 50, chestUnexpCm: 81, chestExpMinCm: 5 },
        'SC / ST': { heightCm: 158, weightKg: 45, chestUnexpCm: 76, chestExpMinCm: 5 },
        petEvents: ['25 km Walking in 4 hrs', '1600m Run / Cycling 1600m']
      },
      Female: {
        'General / SEBC': { heightCm: 153, weightKg: 45 },
        'SC / ST': { heightCm: 148, weightKg: 40 },
        petEvents: ['16 km Walking in 4 hrs', '1600m Run / Cycling 1600m']
      }
    },
    'excise': {
      label: 'Odisha Excise Sub-Inspector / Constable',
      Male: {
        'General / SEBC': { heightCm: 168, weightKg: 55, chestUnexpCm: 79, chestExpMinCm: 5 },
        'SC / ST': { heightCm: 163, weightKg: 50, chestUnexpCm: 76, chestExpMinCm: 5 },
        petEvents: ['1600m / 3200m Endurance Run', 'Long Jump 3.66m', 'High Jump 1.22m']
      },
      Female: {
        'General / SEBC': { heightCm: 155, weightKg: 47.5 },
        'SC / ST': { heightCm: 150, weightKg: 45 },
        petEvents: ['1600m Run', 'Long Jump 2.77m']
      }
    }
  };

  function evaluateOdishaPetStandards(opts) {
    var o = opts && typeof opts === 'object' ? opts : {};
    var forceKey = ODISHA_PET_STANDARDS[o.force] ? o.force : 'police-si';
    var forceSpec = ODISHA_PET_STANDARDS[forceKey];
    var gender = o.gender === 'Female' ? 'Female' : 'Male';
    var category = o.category === 'SC / ST' ? 'SC / ST' : 'General / SEBC';
    var genderSpec = forceSpec[gender];
    var req = genderSpec[category];

    var heightCm = Number(o.heightCm) || 0;
    var weightKg = Number(o.weightKg) || 0;
    var chestUnexpCm = Number(o.chestUnexpCm) || 0;
    var chestExpCm = Number(o.chestExpCm) || 0;
    var chestExpansion = Number((chestExpCm - chestUnexpCm).toFixed(1));

    var heightOk = heightCm >= req.heightCm;
    var weightOk = weightKg >= req.weightKg;
    var chestOk = true;
    if (gender === 'Male') {
      chestOk = chestUnexpCm >= req.chestUnexpCm && chestExpansion >= req.chestExpMinCm;
    }

    return {
      eligible: heightOk && weightOk && chestOk,
      force: forceKey,
      forceLabel: forceSpec.label,
      gender: gender,
      category: category,
      req: req,
      checks: {
        heightOk: heightOk,
        weightOk: weightOk,
        chestOk: chestOk,
        chestExpansion: chestExpansion
      },
      petEvents: genderSpec.petEvents.slice()
    };
  }

  function loadPetPracticeLog(storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return [];
    try {
      var raw = s.getItem(PET_LOG_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) {
      return [];
    }
  }

  function savePetPracticeLog(list, storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    var clean = Array.isArray(list) ? list.slice(0, 25) : [];
    if (s) {
      try { s.setItem(PET_LOG_KEY, JSON.stringify(clean)); } catch (_) {}
    }
    return clean;
  }

  function addPetPracticeRun(entry, storage) {
    var e = entry && typeof entry === 'object' ? entry : {};
    var ev = String(e.event || '').trim();
    var val = String(e.value || '').trim();
    var dt = String(e.date || '').trim();
    if (!ev || !val) return loadPetPracticeLog(storage);
    var list = loadPetPracticeLog(storage);
    list.unshift({ event: ev, value: val, date: dt });
    return savePetPracticeLog(list, storage);
  }

  function removePetPracticeRun(index, storage) {
    var list = loadPetPracticeLog(storage);
    if (index >= 0 && index < list.length) {
      list.splice(index, 1);
      return savePetPracticeLog(list, storage);
    }
    return list;
  }

  function initOdishaPetChecker() {
    var form = $('pet-checker-form');
    var forceEl = $('pet-force');
    var genderEl = $('pet-gender');
    var catEl = $('pet-category');
    var heightEl = $('pet-height');
    var weightEl = $('pet-weight');
    var chestUnexpWrap = $('pet-chest-unexp-wrap');
    var chestExpWrap = $('pet-chest-exp-wrap');
    var chestUnexpEl = $('pet-chest-unexp');
    var chestExpEl = $('pet-chest-exp');
    var resultEl = $('pet-result');

    var logForm = $('pet-log-form');
    var logEventEl = $('pet-log-event');
    var logValueEl = $('pet-log-value');
    var logDateEl = $('pet-log-date');
    var logListEl = $('pet-log-list');
    if (!form || !forceEl || !genderEl || !catEl || !resultEl) return;

    function syncChestVisibility() {
      var isFemale = genderEl.value === 'Female';
      if (chestUnexpWrap) chestUnexpWrap.hidden = isFemale;
      if (chestExpWrap) chestExpWrap.hidden = isFemale;
    }

    function renderResult() {
      syncChestVisibility();
      var evalRes = evaluateOdishaPetStandards({
        force: forceEl.value,
        gender: genderEl.value,
        category: catEl.value,
        heightCm: heightEl ? heightEl.value : 0,
        weightKg: weightEl ? weightEl.value : 0,
        chestUnexpCm: chestUnexpEl ? chestUnexpEl.value : 0,
        chestExpCm: chestExpEl ? chestExpEl.value : 0
      });

      while (resultEl.firstChild) resultEl.removeChild(resultEl.firstChild);

      var badge = document.createElement('span');
      badge.className = evalRes.eligible ? 'cso-scam-badge is-safe' : 'cso-scam-badge is-warn';
      badge.textContent = evalRes.eligible
        ? '✓ Meets Physical Standards (' + evalRes.gender + ' · ' + evalRes.category + ')'
        : '⚠ Below Standard Threshold — Review Metrics Below';
      resultEl.appendChild(badge);

      var grid = document.createElement('div');
      grid.className = 'cso-cbt-calc-grid';

      function addCard(label, val, ok) {
        var box = document.createElement('div');
        box.className = 'cso-cbt-calc-box' + (ok === true ? ' cso-orsp-net-box' : '');
        var sp = document.createElement('span');
        sp.textContent = label;
        var st = document.createElement('strong');
        st.textContent = val;
        box.appendChild(sp);
        box.appendChild(st);
        grid.appendChild(box);
      }

      addCard('Height Requirement', (evalRes.checks.heightOk ? '✓ Pass' : '✗ Min ') + evalRes.req.heightCm + ' cm', evalRes.checks.heightOk);
      addCard('Weight Requirement', (evalRes.checks.weightOk ? '✓ Pass' : '✗ Min ') + evalRes.req.weightKg + ' kg', evalRes.checks.weightOk);
      if (evalRes.gender === 'Male') {
        addCard(
          'Chest & Expansion (≥ 5 cm)',
          (evalRes.checks.chestOk ? '✓ Pass' : '✗ Min ') + evalRes.req.chestUnexpCm + ' cm (+' + evalRes.checks.chestExpansion + ' cm)',
          evalRes.checks.chestOk
        );
      }
      addCard('Qualifying PET Benchmarks', evalRes.petEvents.join(' · '));
      resultEl.appendChild(grid);
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      renderResult();
    });
    [forceEl, genderEl, catEl, heightEl, weightEl, chestUnexpEl, chestExpEl].forEach(function (ctrl) {
      if (!ctrl) return;
      ctrl.addEventListener('change', renderResult);
      ctrl.addEventListener('input', renderResult);
    });
    renderResult();

    if (logDateEl && !logDateEl.value) {
      logDateEl.value = new Date().toISOString().slice(0, 10);
    }

    function renderLog() {
      if (!logListEl) return;
      while (logListEl.firstChild) logListEl.removeChild(logListEl.firstChild);
      var items = loadPetPracticeLog();
      if (!items.length) {
        var p = document.createElement('p');
        p.className = 'cso-tool-desc';
        p.textContent = 'No practice runs logged yet. Save your 1600m / 3200m run timings above.';
        logListEl.appendChild(p);
        return;
      }
      items.forEach(function (it, idx) {
        var row = document.createElement('div');
        row.className = 'cso-pet-log-row';
        var copy = document.createElement('span');
        copy.textContent = it.event + ' — ' + it.value + (it.date ? ' (' + it.date + ')' : '');
        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'cso-tool-btn';
        delBtn.textContent = 'Remove';
        delBtn.addEventListener('click', function () {
          removePetPracticeRun(idx);
          renderLog();
        });
        row.appendChild(copy);
        row.appendChild(delBtn);
        logListEl.appendChild(row);
      });
    }

    if (logForm) {
      logForm.addEventListener('submit', function (e) {
        e.preventDefault();
        addPetPracticeRun({
          event: logEventEl ? logEventEl.value : '1600m Run',
          value: logValueEl ? logValueEl.value : '',
          date: logDateEl ? logDateEl.value : ''
        });
        if (logValueEl) logValueEl.value = '';
        renderLog();
      });
    }
    renderLog();
  }

  function boot() {
    initResizer();
    initAgeCalculator();
    initCbtCalculator();
    initScamChecker();
    initExamCentrePlanner();
    initOrspSalaryCalculator();
    initOdishaPetChecker();
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
      calculateCbtScore: calculateCbtScore,
      calculateExamDayLogistics: calculateExamDayLogistics,
      buildExamDayIcs: buildExamDayIcs,
      calculateOrspSalaryAndFee: calculateOrspSalaryAndFee,
      ORSP_PAY_LEVELS: ORSP_PAY_LEVELS,
      evaluateOdishaPetStandards: evaluateOdishaPetStandards,
      ODISHA_PET_STANDARDS: ODISHA_PET_STANDARDS,
      loadPetPracticeLog: loadPetPracticeLog,
      addPetPracticeRun: addPetPracticeRun,
      removePetPracticeRun: removePetPracticeRun
    };
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      extractUrls: extractUrls,
      isOfficialGovHost: isOfficialGovHost,
      analyzeScamInput: analyzeScamInput,
      parseFlexibleDate: parseFlexibleDate,
      calculateOdishaExamAge: calculateOdishaExamAge,
      calculateCbtScore: calculateCbtScore,
      calculateExamDayLogistics: calculateExamDayLogistics,
      buildExamDayIcs: buildExamDayIcs,
      calculateOrspSalaryAndFee: calculateOrspSalaryAndFee,
      ORSP_PAY_LEVELS: ORSP_PAY_LEVELS,
      evaluateOdishaPetStandards: evaluateOdishaPetStandards,
      ODISHA_PET_STANDARDS: ODISHA_PET_STANDARDS,
      PET_LOG_KEY: PET_LOG_KEY,
      loadPetPracticeLog: loadPetPracticeLog,
      addPetPracticeRun: addPetPracticeRun,
      removePetPracticeRun: removePetPracticeRun,
      CARRY_BAG_KEY: CARRY_BAG_KEY,
      CARRY_BAG_ITEMS: CARRY_BAG_ITEMS
    };
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();
  }
})();
