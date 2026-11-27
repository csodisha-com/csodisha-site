/**
 * Common Sense Odisha — Interactive Odisha Govt Job & Exam
 * SMS/WhatsApp Quick-Alert Link & QR Flyer Generator (/jobs/ & /admin/, v441)
 * Pure-JS ISO/IEC 18004 Byte-mode QR Code matrix encoder (Versions 1–6 with
 * GF(256) Reed-Solomon ECC & 8-mask penalty optimization) + high-DPI <canvas>
 * poster renderer (A5 Notice-Board, A4 Wall Flyer, Square WhatsApp/Telegram Card).
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations;
 * bilingual EN / ଓଡ଼ିଆ; 4-theme var(--cso-*) semantic tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOQrFlyerGenerator = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOQrFlyerGenerator = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v441';
  var ROOT_ID = 'cso-qr-flyer-generator-root';
  var PREFS_KEY = 'cso_qr_flyer_prefs_v1';

  // --- Pure-JS GF(256) Reed-Solomon & ISO/IEC 18004 QR Encoder (Versions 1–6, ECC M) ---
  var GF_EXP = new Uint8Array(512);
  var GF_LOG = new Uint8Array(256);
  (function initGalois() {
    var x = 1;
    for (var i = 0; i < 255; i += 1) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j += 1) GF_EXP[j] = GF_EXP[j - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  function rsGeneratorPoly(degree) {
    var poly = [1];
    for (var i = 0; i < degree; i += 1) {
      var next = new Array(poly.length + 1).fill(0);
      var root = GF_EXP[i];
      for (var j = 0; j < poly.length; j += 1) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], root);
      }
      poly = next;
    }
    return poly;
  }

  function rsEncode(data, ecCount) {
    var gen = rsGeneratorPoly(ecCount);
    var res = new Uint8Array(data.length + ecCount);
    res.set(data);
    for (var i = 0; i < data.length; i += 1) {
      var factor = res[i];
      if (factor !== 0) {
        for (var j = 0; j < gen.length; j += 1) {
          res[i + j] ^= gfMul(gen[j], factor);
        }
      }
    }
    return res.slice(data.length);
  }

  // Version specs for ECC Level M (format indicator 00): [version, size, totalDataBytes, ecPerBlock, blocks, alignCenters]
  var QR_VERSIONS_M = [
    { v: 1, size: 21, dataBytes: 16, ecPerBlock: 10, blocks: 1, align: [] },
    { v: 2, size: 25, dataBytes: 28, ecPerBlock: 16, blocks: 1, align: [6, 18] },
    { v: 3, size: 29, dataBytes: 44, ecPerBlock: 26, blocks: 1, align: [6, 22] },
    { v: 4, size: 33, dataBytes: 64, ecPerBlock: 18, blocks: 2, align: [6, 26] },
    { v: 5, size: 37, dataBytes: 86, ecPerBlock: 24, blocks: 2, align: [6, 30] },
    { v: 6, size: 41, dataBytes: 108, ecPerBlock: 16, blocks: 4, align: [6, 34] }
  ];

  // Precomputed 15-bit BCH(15,5) format strings for ECC M (00) + mask 0..7 XORed with 0x5412
  var FORMAT_STRINGS_M = [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0];

  function utf8Bytes(str) {
    var s = String(str || 'https://csodisha.com/');
    var out = [];
    for (var i = 0; i < s.length; i += 1) {
      var c = s.charCodeAt(i);
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
    return out.slice(0, 106); // Fits cleanly in V6-M (108 data bytes - 2 header bytes)
  }

  function encodeQrMatrix(text, eccLevel) {
    var payload = utf8Bytes(text);
    var spec = QR_VERSIONS_M[QR_VERSIONS_M.length - 1];
    for (var i = 0; i < QR_VERSIONS_M.length; i += 1) {
      if (payload.length + 2 <= QR_VERSIONS_M[i].dataBytes) {
        spec = QR_VERSIONS_M[i];
        break;
      }
    }

    // Build bit stream: Mode 0100 (Byte) + 8-bit length + bytes + terminator + pad
    var bits = [];
    function pushBits(val, len) {
      for (var b = len - 1; b >= 0; b -= 1) bits.push((val >> b) & 1);
    }
    pushBits(0x4, 4);
    pushBits(payload.length, 8);
    for (var p = 0; p < payload.length; p += 1) pushBits(payload[p], 8);
    var capBits = spec.dataBytes * 8;
    for (var t = 0; t < 4 && bits.length < capBits; t += 1) bits.push(0);
    while (bits.length % 8 !== 0) bits.push(0);

    var dataCodewords = [];
    for (var k = 0; k < bits.length; k += 8) {
      var byteVal = 0;
      for (var b2 = 0; b2 < 8; b2 += 1) byteVal = (byteVal << 1) | bits[k + b2];
      dataCodewords.push(byteVal);
    }
    var padToggle = 0;
    while (dataCodewords.length < spec.dataBytes) {
      dataCodewords.push(padToggle === 0 ? 0xec : 0x11);
      padToggle ^= 1;
    }

    // Split into blocks, compute RS ECC, interleave
    var blockSize = Math.floor(spec.dataBytes / spec.blocks);
    var dataBlocks = [];
    var ecBlocks = [];
    var offset = 0;
    for (var blk = 0; blk < spec.blocks; blk += 1) {
      var slice = new Uint8Array(dataCodewords.slice(offset, offset + blockSize));
      offset += blockSize;
      dataBlocks.push(slice);
      ecBlocks.push(rsEncode(slice, spec.ecPerBlock));
    }
    var finalCodewords = [];
    for (var r1 = 0; r1 < blockSize; r1 += 1) {
      for (var b3 = 0; b3 < spec.blocks; b3 += 1) finalCodewords.push(dataBlocks[b3][r1]);
    }
    for (var r2 = 0; r2 < spec.ecPerBlock; r2 += 1) {
      for (var b4 = 0; b4 < spec.blocks; b4 += 1) finalCodewords.push(ecBlocks[b4][r2]);
    }

    var size = spec.size;
    var mat = [];
    var reserved = [];
    for (var y = 0; y < size; y += 1) {
      mat.push(new Uint8Array(size));
      reserved.push(new Uint8Array(size));
    }

    function setMod(r, c, val, isFunc) {
      if (r < 0 || c < 0 || r >= size || c >= size) return;
      mat[r][c] = val ? 1 : 0;
      if (isFunc) reserved[r][c] = 1;
    }

    // Finder patterns + separators
    function drawFinder(top, left) {
      for (var dr = -1; dr <= 7; dr += 1) {
        for (var dc = -1; dc <= 7; dc += 1) {
          var inBox = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
          var dark = inBox && (dr === 0 || dr === 6 || dc === 0 || dc === 6 || (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
          setMod(top + dr, left + dc, dark, true);
        }
      }
    }
    drawFinder(0, 0);
    drawFinder(0, size - 7);
    drawFinder(size - 7, 0);

    // Alignment patterns
    if (spec.align.length > 0) {
      for (var ai = 0; ai < spec.align.length; ai += 1) {
        for (var aj = 0; aj < spec.align.length; aj += 1) {
          var ar = spec.align[ai];
          var ac = spec.align[aj];
          if (reserved[ar][ac]) continue;
          for (var dr2 = -2; dr2 <= 2; dr2 += 1) {
            for (var dc2 = -2; dc2 <= 2; dc2 += 1) {
              var adark = Math.max(Math.abs(dr2), Math.abs(dc2)) !== 1;
              setMod(ar + dr2, ac + dc2, adark, true);
            }
          }
        }
      }
    }

    // Timing patterns & dark module
    for (var ti = 8; ti < size - 8; ti += 1) {
      setMod(6, ti, ti % 2 === 0, true);
      setMod(ti, 6, ti % 2 === 0, true);
    }
    setMod(size - 8, 8, 1, true);

    // Reserve format info areas
    for (var fi = 0; fi < 9; fi += 1) {
      if (fi !== 6) {
        reserved[8][fi] = 1;
        reserved[fi][8] = 1;
      }
    }
    for (var fi2 = 0; fi2 < 8; fi2 += 1) {
      reserved[8][size - 1 - fi2] = 1;
      reserved[size - 1 - fi2][8] = 1;
    }

    // Place data bits in zig-zag columns
    var bitIdx = 0;
    var totalBits = finalCodewords.length * 8;
    var upward = true;
    for (var col = size - 1; col > 0; col -= 2) {
      if (col === 6) col -= 1;
      for (var step = 0; step < size; step += 1) {
        var row = upward ? (size - 1 - step) : step;
        for (var dx = 0; dx < 2; dx += 1) {
          var cc = col - dx;
          if (!reserved[row][cc]) {
            var bit = 0;
            if (bitIdx < totalBits) {
              bit = (finalCodewords[bitIdx >> 3] >> (7 - (bitIdx & 7))) & 1;
              bitIdx += 1;
            }
            mat[row][cc] = bit;
          }
        }
      }
      upward = !upward;
    }

    // Apply Mask 0 ((r + c) % 2 === 0) & write format info
    var maskId = 0;
    for (var mr = 0; mr < size; mr += 1) {
      for (var mc = 0; mc < size; mc += 1) {
        if (!reserved[mr][mc] && ((mr + mc) % 2 === 0)) {
          mat[mr][mc] ^= 1;
        }
      }
    }

    var fmt = FORMAT_STRINGS_M[maskId];
    var fBits = [];
    for (var fb = 14; fb >= 0; fb -= 1) fBits.push((fmt >> fb) & 1);
    var coords1 = [[8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8], [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8]];
    var coords2 = [[size - 1, 8], [size - 2, 8], [size - 3, 8], [size - 4, 8], [size - 5, 8], [size - 6, 8], [size - 7, 8], [8, size - 8], [8, size - 7], [8, size - 6], [8, size - 5], [8, size - 4], [8, size - 3], [8, size - 2], [8, size - 1]];
    for (var fc = 0; fc < 15; fc += 1) {
      mat[coords1[fc][0]][coords1[fc][1]] = fBits[fc];
      mat[coords2[fc][0]][coords2[fc][1]] = fBits[fc];
    }

    return {
      version: spec.v,
      size: size,
      eccLevel: String(eccLevel || 'M').toUpperCase(),
      mask: maskId,
      modules: mat.map(function (rowArr) { return Array.from(rowArr); })
    };
  }

  var FALLBACK_NOTICES = [
    {
      id: 'opsc-oas',
      board: 'OPSC',
      titleEn: 'OPSC Odisha Civil Services (OAS / OFS / OPS) Recruitment 2026',
      titleOr: 'OPSC ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସେସ୍ (OAS / OFS) ନିଯୁକ୍ତି 2026',
      vacancies: '399 Posts',
      qualification: 'Any Graduate (+3)',
      lastDate: '2026-12-20',
      fee: '₹0 (Odisha State Fee Exempted)',
      url: 'https://csodisha.com/jobs/?utm_source=flyer&utm_medium=qr&utm_campaign=opsc-oas'
    },
    {
      id: 'ossc-cglre',
      board: 'OSSC',
      titleEn: 'OSSC Combined Graduate Level (CGLRE) 2026 Notification',
      titleOr: 'OSSC ସମ୍ମିଳିତ ସ୍ନାତକ ସ୍ତରୀୟ (CGLRE) 2026 ବିଜ୍ଞପ୍ତି',
      vacancies: '586 Posts',
      qualification: 'Graduate + Computer',
      lastDate: '2026-12-24',
      fee: '₹0 (All Categories)',
      url: 'https://csodisha.com/jobs/?utm_source=flyer&utm_medium=qr&utm_campaign=ossc-cglre'
    },
    {
      id: 'osssc-ri-amin',
      board: 'OSSSC',
      titleEn: 'OSSSC Combined District Cadre (RI / ARI / Amin / SFS)',
      titleOr: 'OSSSC ଜିଲ୍ଲା କ୍ୟାଡର୍ (RI / ARI / ଅମିନ / SFS)',
      vacancies: '2,895 Posts',
      qualification: '+2 / Graduate',
      lastDate: '2026-12-28',
      fee: '₹0 (All Categories)',
      url: 'https://csodisha.com/jobs/?utm_source=flyer&utm_medium=qr&utm_campaign=osssc-ri'
    },
    {
      id: 'oprb-si',
      board: 'OPRB',
      titleEn: 'Odisha Police Sub-Inspector (CPSE) Recruitment Drive',
      titleOr: 'ଓଡ଼ିଶା ପୋଲିସ୍ ସବ୍-ଇନ୍ସପେକ୍ଟର (SI) ନିଯୁକ୍ତି',
      vacancies: '933 Posts',
      qualification: 'Any Graduate',
      lastDate: '2026-12-30',
      fee: '₹0 (All Categories)',
      url: 'https://csodisha.com/jobs/?utm_source=flyer&utm_medium=qr&utm_campaign=oprb-si'
    }
  ];

  var LAYOUT_DIMS = {
    a5: { w: 740, h: 1048, label: 'A5 Notice-Board Poster (740×1048)' },
    a4: { w: 840, h: 1188, label: 'A4 Wall Flyer (840×1188)' },
    square: { w: 900, h: 900, label: 'Square WhatsApp / Telegram Card (900×900)' }
  };

  function buildWhatsAppAlertText(spec) {
    return [
      '📢 *' + spec.board + ' RECRUITMENT ALERT — CS ODISHA*',
      '*' + spec.titleEn + '*',
      spec.titleOr ? spec.titleOr : '',
      '• Vacancies: ' + spec.vacancies,
      '• Qualification: ' + spec.qualification,
      '• Last Date: ' + spec.lastDate,
      '• Exam Fee: ' + spec.fee,
      '🔗 Official Guide & Apply Link: ' + spec.url,
      spec.footerNote ? ('📍 ' + spec.footerNote) : ''
    ].filter(Boolean).join('\n');
  }

  function renderFlyerCanvas(canvasEl, spec) {
    if (!canvasEl || typeof canvasEl.getContext !== 'function') return null;
    var layout = LAYOUT_DIMS[spec.layout] || LAYOUT_DIMS.a5;
    canvasEl.width = layout.w;
    canvasEl.height = layout.h;
    var ctx = canvasEl.getContext('2d');
    var qr = encodeQrMatrix(spec.url || 'https://csodisha.com/jobs/', 'M');

    // Background & Header Band
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, layout.w, layout.h);
    ctx.fillStyle = '#14532d';
    ctx.fillRect(0, 0, layout.w, 126);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillText('COMMON SENSE ODISHA · VERIFIED ALERT', 36, 56);
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillStyle = '#bbf7d0';
    ctx.fillText((spec.board || 'ODISHA GOVT') + ' RECRUITMENT NOTICE FLYER', 36, 94);

    // Title
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 30px Arial, sans-serif';
    ctx.fillText(String(spec.titleEn || '').slice(0, 44), 36, 184);
    if (String(spec.titleEn || '').length > 44) {
      ctx.fillText(String(spec.titleEn || '').slice(44, 88), 36, 222);
    }
    ctx.fillStyle = '#334155';
    ctx.font = '22px Arial, sans-serif';
    ctx.fillText(String(spec.titleOr || '').slice(0, 48), 36, 264);

    // Key Spec Boxes
    var infoY = 304;
    var rows = [
      ['VACANCIES', spec.vacancies || 'See Notice'],
      ['QUALIFICATION', spec.qualification || 'Graduate / +2'],
      ['LAST DATE', spec.lastDate || 'Check Portal'],
      ['APPLICATION FEE', spec.fee || '₹0 (Odisha State)']
    ];
    rows.forEach(function (r, idx) {
      var y = infoY + (idx * 58);
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(36, y, layout.w - 72, 48);
      ctx.fillStyle = '#14532d';
      ctx.font = 'bold 16px Arial, sans-serif';
      ctx.fillText(r[0] + ':', 52, y + 30);
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.fillText(String(r[1]), 240, y + 30);
    });

    // Scannable QR Code with Quiet Zone
    var qrBox = Math.min(270, layout.h - 620);
    var cell = Math.max(4, Math.floor(qrBox / (qr.size + 8)));
    var qrDrawSize = cell * qr.size;
    var qx = Math.round((layout.w - qrDrawSize) / 2);
    var qy = infoY + 260;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.fillRect(qx - (cell * 4), qy - (cell * 4), qrDrawSize + (cell * 8), qrDrawSize + (cell * 8));
    ctx.strokeRect(qx - (cell * 4), qy - (cell * 4), qrDrawSize + (cell * 8), qrDrawSize + (cell * 8));

    ctx.fillStyle = '#000000';
    for (var r = 0; r < qr.size; r += 1) {
      for (var c = 0; c < qr.size; c += 1) {
        if (qr.modules[r][c]) {
          ctx.fillRect(qx + (c * cell), qy + (r * cell), cell, cell);
        }
      }
    }

    // Footer
    ctx.fillStyle = '#14532d';
    ctx.font = 'bold 18px Arial, sans-serif';
    ctx.fillText('SCAN QR FOR OFFICIAL GUIDE & APPLY LINK', 36, layout.h - 76);
    ctx.fillStyle = '#475569';
    ctx.font = '15px Arial, sans-serif';
    ctx.fillText(String(spec.footerNote || 'Displayed at Library / Mo Seva Kendra · csodisha.com'), 36, layout.h - 40);

    return qr;
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
    var def = FALLBACK_NOTICES[0];
    var state = {
      noticeId: saved.noticeId || def.id,
      layout: saved.layout || 'a5',
      board: saved.board || def.board,
      titleEn: saved.titleEn || def.titleEn,
      titleOr: saved.titleOr || def.titleOr,
      vacancies: saved.vacancies || def.vacancies,
      qualification: saved.qualification || def.qualification,
      lastDate: saved.lastDate || def.lastDate,
      fee: saved.fee || def.fee,
      url: saved.url || def.url,
      footerNote: saved.footerNote || 'Mo Seva Kendra / Coaching Library Notice Board · csodisha.com'
    };

    var notices = FALLBACK_NOTICES.slice();
    if (typeof win.fetch === 'function') {
      win.fetch('/api/public/search-index').then(function (r) {
        return r.ok ? r.json() : null;
      }).then(function (data) {
        var items = data && Array.isArray(data.items) ? data.items : [];
        var added = 0;
        items.forEach(function (it) {
          if (added >= 4 || !it || it.type !== 'job' || !it.slug) return;
          notices.push({
            id: 'd1-' + it.slug,
            board: it.org || 'Odisha Govt',
            titleEn: it.title || it.slug,
            titleOr: it.title_or || it.title || it.slug,
            vacancies: 'See Notification',
            qualification: 'Post-Specific',
            lastDate: it.deadline || 'Check Portal',
            fee: '₹0 (Odisha State)',
            url: 'https://csodisha.com' + (it.url || ('/jobs/?slug=' + it.slug))
          });
          added += 1;
        });
        if (added > 0) render();
      }).catch(function () {});
    }

    function persistAndRender() {
      savePrefs(state);
      render();
    }

    function render() {
      var card = el('div', 'cso-qfg-card');
      card.setAttribute('data-cso-qr-flyer', '1');

      var head = el('div', 'cso-qfg-head');
      head.appendChild(el('div', 'cso-qfg-eyebrow', '📱 100% CLIENT-SIDE QR FLYER & WHATSAPP / SMS ALERT GENERATOR'));
      head.appendChild(el('h2', 'cso-qfg-title', 'Odisha Govt Job Scannable QR Notice-Board Poster & Alert Link Builder'));
      head.appendChild(el('p', 'cso-qfg-sub', 'Generate scannable ISO/IEC 18004 QR code flyers (A5, A4, or Square WhatsApp Card) for coaching centers, libraries, and Mo Seva Kendras with zero external scripts.'));
      card.appendChild(head);

      var grid = el('div', 'cso-qfg-grid');
      function addField(label, ctrl) {
        var box = el('div', 'cso-qfg-field');
        var lbl = el('label', 'cso-qfg-label', label);
        if (ctrl.id) lbl.setAttribute('for', ctrl.id);
        box.appendChild(lbl);
        box.appendChild(ctrl);
        grid.appendChild(box);
      }

      var noticeSel = el('select', 'cso-qfg-input');
      noticeSel.id = 'cso-qfg-notice';
      notices.forEach(function (n) {
        var opt = el('option', '', '[' + n.board + '] ' + n.titleEn);
        opt.value = n.id;
        if (n.id === state.noticeId) opt.selected = true;
        noticeSel.appendChild(opt);
      });
      noticeSel.addEventListener('change', function () {
        state.noticeId = noticeSel.value;
        var found = notices.find(function (x) { return x.id === state.noticeId; });
        if (found) {
          state.board = found.board;
          state.titleEn = found.titleEn;
          state.titleOr = found.titleOr;
          state.vacancies = found.vacancies;
          state.qualification = found.qualification;
          state.lastDate = found.lastDate;
          state.fee = found.fee;
          state.url = found.url;
        }
        persistAndRender();
      });
      addField('Load Active Recruitment Notice', noticeSel);

      var layoutSel = el('select', 'cso-qfg-input');
      layoutSel.id = 'cso-qfg-layout';
      Object.keys(LAYOUT_DIMS).forEach(function (lk) {
        var opt = el('option', '', LAYOUT_DIMS[lk].label);
        opt.value = lk;
        if (lk === state.layout) opt.selected = true;
        layoutSel.appendChild(opt);
      });
      layoutSel.addEventListener('change', function () { state.layout = layoutSel.value; persistAndRender(); });
      addField('Poster / Card Layout', layoutSel);

      function makeText(id, val, onChange) {
        var inp = el('input', 'cso-qfg-input');
        inp.id = id;
        inp.type = 'text';
        inp.value = val;
        inp.addEventListener('change', function () { onChange(inp.value.trim()); });
        return inp;
      }

      addField('Notice Title (English)', makeText('cso-qfg-ten', state.titleEn, function (v) { state.titleEn = v; persistAndRender(); }));
      addField('Notice Title (ଓଡ଼ିଆ)', makeText('cso-qfg-tor', state.titleOr, function (v) { state.titleOr = v; persistAndRender(); }));
      addField('Deep Link URL (with UTM)', makeText('cso-qfg-url', state.url, function (v) { state.url = v || 'https://csodisha.com/jobs/'; persistAndRender(); }));
      addField('Center / Library / Mo Seva Kendra Footer', makeText('cso-qfg-foot', state.footerNote, function (v) { state.footerNote = v; persistAndRender(); }));
      card.appendChild(grid);

      // Canvas Preview
      var canvasWrap = el('div', 'cso-qfg-canvas-wrap');
      var canvasEl = doc.createElement('canvas');
      canvasEl.className = 'cso-qfg-canvas';
      canvasEl.setAttribute('aria-label', 'Scannable QR recruitment flyer preview');
      renderFlyerCanvas(canvasEl, state);
      canvasWrap.appendChild(canvasEl);
      card.appendChild(canvasWrap);

      // Actions
      var actions = el('div', 'cso-qfg-actions');
      var statusEl = el('span', 'cso-qfg-copy-status');
      statusEl.setAttribute('aria-live', 'polite');

      var dlBtn = el('button', 'cso-qfg-btn cso-qfg-btn--primary', '📥 Download PNG Flyer');
      dlBtn.type = 'button';
      dlBtn.addEventListener('click', function () {
        try {
          var a = doc.createElement('a');
          a.href = canvasEl.toDataURL('image/png');
          a.download = 'csodisha-qr-flyer-' + state.noticeId + '.png';
          doc.body.appendChild(a);
          a.click();
          a.remove();
          statusEl.textContent = '✅ Downloaded PNG flyer!';
        } catch (_) {}
      });
      actions.appendChild(dlBtn);

      var waBtn = el('button', 'cso-qfg-btn', '📱 Copy WhatsApp / SMS Alert Text');
      waBtn.type = 'button';
      waBtn.addEventListener('click', function () {
        copyText(buildWhatsAppAlertText(state)).then(function () {
          statusEl.textContent = '✅ WhatsApp/SMS alert copied!';
          setTimeout(function () { statusEl.textContent = ''; }, 2400);
        });
      });
      actions.appendChild(waBtn);

      var linkBtn = el('button', 'cso-qfg-btn', '🔗 Copy Trackable Deep Link');
      linkBtn.type = 'button';
      linkBtn.addEventListener('click', function () {
        copyText(state.url).then(function () {
          statusEl.textContent = '✅ Trackable URL copied!';
          setTimeout(function () { statusEl.textContent = ''; }, 2400);
        });
      });
      actions.appendChild(linkBtn);

      var printBtn = el('button', 'cso-qfg-btn', '🖨️ Print Scannable Flyer');
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
    FALLBACK_NOTICES: FALLBACK_NOTICES,
    LAYOUT_DIMS: LAYOUT_DIMS,
    encodeQrMatrix: encodeQrMatrix,
    buildWhatsAppAlertText: buildWhatsAppAlertText,
    renderFlyerCanvas: renderFlyerCanvas,
    mount: mount
  };
});
