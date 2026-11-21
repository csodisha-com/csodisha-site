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

  /* ---------- Tool 2: Odisha Age Relaxation & Cut-Off Calculator ---------- */
  function initAgeCalculator() {
    var form = $('age-calc-form');
    var dobEl = $('age-dob');
    var cutoffEl = $('age-cutoff');
    var maxEl = $('age-max');
    var catEl = $('age-category');
    var resultEl = $('age-result');
    var badgeEl = $('age-status-badge');
    var exactEl = $('age-exact-readout');
    var summaryEl = $('age-limit-summary');
    var resetBtn = $('age-reset-btn');
    var p32 = $('age-preset-32');
    var p38 = $('age-preset-38');
    if (!form || !dobEl || !cutoffEl) return;

    var todayIso = new Date().toISOString().slice(0, 10);
    if (!cutoffEl.value) cutoffEl.value = todayIso;

    function runCalc() {
      var utils = window.CSOStudentUtils;
      if (!utils || typeof utils.calculateOdishaAge !== 'function') return;
      if (!dobEl.value) {
        resultEl.hidden = true;
        return;
      }
      var res = utils.calculateOdishaAge({
        dob: dobEl.value,
        cutoff: cutoffEl.value || todayIso,
        maxAge: Number(maxEl.value),
        category: catEl.value
      });
      resultEl.hidden = false;
      if (!res.valid) {
        badgeEl.className = 'cso-age-badge cso-age-badge--over';
        badgeEl.textContent = 'Check Dates';
        exactEl.textContent = res.error;
        summaryEl.textContent = '';
        return;
      }
      badgeEl.className = 'cso-age-badge ' + (res.eligible ? 'cso-age-badge--ok' : 'cso-age-badge--over');
      badgeEl.textContent = res.eligible ? '✓ Eligible' : '✕ Over Age';
      exactEl.textContent = res.years + ' Years, ' + res.months + ' Months, ' + res.days + ' Days';
      summaryEl.textContent = 'Effective upper age limit: ' + res.effectiveMaxAge + ' years (Base ' + res.baseMaxAge + ' + ' + res.relaxation + ' yrs ' + res.category + ' relaxation as of ' + (cutoffEl.value || todayIso) + ').';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      runCalc();
    });
    [dobEl, cutoffEl, maxEl, catEl].forEach(function (inp) {
      inp.addEventListener('change', runCalc);
    });
    if (p32) p32.addEventListener('click', function () { maxEl.value = '32'; runCalc(); });
    if (p38) p38.addEventListener('click', function () { maxEl.value = '38'; runCalc(); });
    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        dobEl.value = '';
        cutoffEl.value = todayIso;
        maxEl.value = '38';
        catEl.value = 'UR';
        resultEl.hidden = true;
      });
    }
  }

  function boot() {
    initResizer();
    initAgeCalculator();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
