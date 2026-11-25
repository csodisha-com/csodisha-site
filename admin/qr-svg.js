/**
 * Common Sense Odisha — Zero-Dependency ISO/IEC 18004 QR Code SVG Renderer (v312)
 * Strict CSP-compliant: pure DOM SVG via createElementNS + setAttribute, zero innerHTML, zero .style.*.
 * Supports Byte-mode Error Correction Level L, Versions 1..10 (up to 271 UTF-8 bytes — full otpauth:// URIs).
 */
(function (window, document) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  // GF(256) with primitive polynomial x^8 + x^4 + x^3 + x^2 + 1 (0x11d)
  var GF_EXP = new Uint8Array(512);
  var GF_LOG = new Uint8Array(256);
  (function initGf() {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      GF_EXP[i] = x;
      GF_LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d;
    }
    for (var j = 255; j < 512; j++) GF_EXP[j] = GF_EXP[j - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return GF_EXP[GF_LOG[a] + GF_LOG[b]];
  }

  function rsGeneratorPoly(ecLen) {
    var poly = [1];
    for (var i = 0; i < ecLen; i++) {
      var next = new Array(poly.length + 1).fill(0);
      var factor = GF_EXP[i];
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], factor);
      }
      poly = next;
    }
    return poly;
  }

  function rsCompute(data, ecLen) {
    var gen = rsGeneratorPoly(ecLen);
    var rem = new Uint8Array(ecLen);
    for (var i = 0; i < data.length; i++) {
      var factor = data[i] ^ rem[0];
      for (var j = 0; j < ecLen - 1; j++) rem[j] = rem[j + 1];
      rem[ecLen - 1] = 0;
      if (factor !== 0) {
        for (var k = 0; k < ecLen; k++) {
          rem[k] ^= gfMul(gen[k + 1], factor);
        }
      }
    }
    return rem;
  }

  // Version 1..10 ECC-L specs: [version, totalDataCodewords, ecPerBlock, [[count, dataPerBlock], ...], alignmentCenters]
  var VER_SPECS = [
    null,
    { v: 1, data: 19, ec: 7, blocks: [[1, 19]], align: [] },
    { v: 2, data: 34, ec: 10, blocks: [[1, 34]], align: [6, 18] },
    { v: 3, data: 55, ec: 15, blocks: [[1, 55]], align: [6, 22] },
    { v: 4, data: 80, ec: 20, blocks: [[1, 80]], align: [6, 26] },
    { v: 5, data: 108, ec: 26, blocks: [[1, 108]], align: [6, 30] },
    { v: 6, data: 136, ec: 18, blocks: [[2, 68]], align: [6, 34] },
    { v: 7, data: 156, ec: 20, blocks: [[2, 78]], align: [6, 22, 38] },
    { v: 8, data: 194, ec: 24, blocks: [[2, 97]], align: [6, 24, 42] },
    { v: 9, data: 232, ec: 30, blocks: [[2, 116]], align: [6, 26, 46] },
    { v: 10, data: 274, ec: 18, blocks: [[2, 68], [2, 69]], align: [6, 28, 50] }
  ];

  // Precomputed 15-bit BCH(15,5) format strings for ECC-L (01) + masks 0..7 XOR 0x5412
  var FORMAT_L = [
    0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976
  ];

  // Precomputed 18-bit Golay(18,6) version strings for versions 7..10
  var VERSION_BITS = {
    7: 0x07c94,
    8: 0x085bc,
    9: 0x09a99,
    10: 0x0a4d3
  };

  function utf8Bytes(str) {
    if (typeof TextEncoder === 'function') return new TextEncoder().encode(String(str || ''));
    var s = unescape(encodeURIComponent(String(str || '')));
    var arr = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) arr[i] = s.charCodeAt(i);
    return arr;
  }

  function pickVersion(byteLen) {
    for (var v = 1; v < VER_SPECS.length; v++) {
      var ccBits = v <= 9 ? 8 : 16;
      var neededBits = 4 + ccBits + byteLen * 8;
      if (neededBits <= VER_SPECS[v].data * 8) return VER_SPECS[v];
    }
    throw new Error('QR payload exceeds version 10 capacity');
  }

  function buildCodewords(bytes, spec) {
    var bits = [];
    function pushBits(val, len) {
      for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1);
    }
    pushBits(0x4, 4); // Byte mode indicator
    pushBits(bytes.length, spec.v <= 9 ? 8 : 16);
    for (var i = 0; i < bytes.length; i++) pushBits(bytes[i], 8);

    var capBits = spec.data * 8;
    var termLen = Math.min(4, capBits - bits.length);
    pushBits(0, termLen);
    while (bits.length % 8 !== 0) bits.push(0);

    var data = new Uint8Array(spec.data);
    for (var b = 0; b < bits.length / 8; b++) {
      var val = 0;
      for (var k = 0; k < 8; k++) val = (val << 1) | bits[b * 8 + k];
      data[b] = val;
    }
    var padIdx = bits.length / 8;
    var padToggle = 0;
    while (padIdx < spec.data) {
      data[padIdx++] = padToggle ? 0x11 : 0xec;
      padToggle ^= 1;
    }

    // Split into RS blocks & interleave
    var dataBlocks = [];
    var ecBlocks = [];
    var offset = 0;
    for (var g = 0; g < spec.blocks.length; g++) {
      var count = spec.blocks[g][0];
      var dLen = spec.blocks[g][1];
      for (var c = 0; c < count; c++) {
        var blk = data.slice(offset, offset + dLen);
        offset += dLen;
        dataBlocks.push(blk);
        ecBlocks.push(rsCompute(blk, spec.ec));
      }
    }

    var maxDataLen = Math.max.apply(null, dataBlocks.map(function (bl) { return bl.length; }));
    var out = [];
    for (var di = 0; di < maxDataLen; di++) {
      for (var bi = 0; bi < dataBlocks.length; bi++) {
        if (di < dataBlocks[bi].length) out.push(dataBlocks[bi][di]);
      }
    }
    for (var ei = 0; ei < spec.ec; ei++) {
      for (var bj = 0; bj < ecBlocks.length; bj++) {
        out.push(ecBlocks[bj][ei]);
      }
    }
    return new Uint8Array(out);
  }

  function makeGrid(size) {
    var g = new Array(size);
    for (var i = 0; i < size; i++) g[i] = new Uint8Array(size);
    return g;
  }

  function placeFinder(mod, isFunc, r0, c0, size) {
    for (var dr = -1; dr <= 7; dr++) {
      for (var dc = -1; dc <= 7; dc++) {
        var r = r0 + dr;
        var c = c0 + dc;
        if (r < 0 || r >= size || c < 0 || c >= size) continue;
        var dist = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
        mod[r][c] = (dist !== 2 && dist !== 4) ? 1 : 0;
        isFunc[r][c] = 1;
      }
    }
  }

  function placeAlignment(mod, isFunc, r0, c0) {
    for (var dr = -2; dr <= 2; dr++) {
      for (var dc = -2; dc <= 2; dc++) {
        var dist = Math.max(Math.abs(dr), Math.abs(dc));
        mod[r0 + dr][c0 + dc] = (dist !== 1) ? 1 : 0;
        isFunc[r0 + dr][c0 + dc] = 1;
      }
    }
  }

  function writeFormat(mod, isFunc, size, maskIdx) {
    var bits = FORMAT_L[maskIdx];
    for (var i = 0; i <= 5; i++) {
      var b = (bits >>> i) & 1;
      mod[8][i] = b; isFunc[8][i] = 1;
    }
    mod[8][7] = (bits >>> 6) & 1; isFunc[8][7] = 1;
    mod[8][8] = (bits >>> 7) & 1; isFunc[8][8] = 1;
    mod[7][8] = (bits >>> 8) & 1; isFunc[7][8] = 1;
    for (var j = 9; j < 15; j++) {
      var bj = (bits >>> j) & 1;
      mod[14 - j][8] = bj; isFunc[14 - j][8] = 1;
    }
    for (var k = 0; k < 8; k++) {
      mod[8][size - 1 - k] = (bits >>> k) & 1;
      isFunc[8][size - 1 - k] = 1;
    }
    for (var m = 8; m < 15; m++) {
      mod[size - 15 + m][8] = (bits >>> m) & 1;
      isFunc[size - 15 + m][8] = 1;
    }
    mod[size - 8][8] = 1;
    isFunc[size - 8][8] = 1;
  }

  function writeVersion(mod, isFunc, size, v) {
    var bits = VERSION_BITS[v];
    if (!bits) return;
    for (var i = 0; i < 18; i++) {
      var b = (bits >>> i) & 1;
      var a = size - 11 + (i % 3);
      var c = Math.floor(i / 3);
      mod[a][c] = b; isFunc[a][c] = 1;
      mod[c][a] = b; isFunc[c][a] = 1;
    }
  }

  function maskFn(maskIdx, r, c) {
    switch (maskIdx) {
      case 0: return ((r + c) % 2) === 0;
      case 1: return (r % 2) === 0;
      case 2: return (c % 3) === 0;
      case 3: return ((r + c) % 3) === 0;
      case 4: return ((Math.floor(r / 2) + Math.floor(c / 3)) % 2) === 0;
      case 5: return (((r * c) % 2) + ((r * c) % 3)) === 0;
      case 6: return ((((r * c) % 2) + ((r * c) % 3)) % 2) === 0;
      case 7: return ((((r + c) % 2) + ((r * c) % 3)) % 2) === 0;
      default: return false;
    }
  }

  function penaltyScore(mod, size) {
    var score = 0;
    for (var r = 0; r < size; r++) {
      var runColor = mod[r][0], runLen = 1;
      for (var c = 1; c < size; c++) {
        if (mod[r][c] === runColor) {
          runLen++;
          if (runLen === 5) score += 3;
          else if (runLen > 5) score += 1;
        } else {
          runColor = mod[r][c];
          runLen = 1;
        }
      }
    }
    for (var cc = 0; cc < size; cc++) {
      var cColor = mod[0][cc], cLen = 1;
      for (var rr = 1; rr < size; rr++) {
        if (mod[rr][cc] === cColor) {
          cLen++;
          if (cLen === 5) score += 3;
          else if (cLen > 5) score += 1;
        } else {
          cColor = mod[rr][cc];
          cLen = 1;
        }
      }
    }
    for (var br = 0; br < size - 1; br++) {
      for (var bc = 0; bc < size - 1; bc++) {
        var v = mod[br][bc];
        if (v === mod[br][bc + 1] && v === mod[br + 1][bc] && v === mod[br + 1][bc + 1]) score += 3;
      }
    }
    return score;
  }

  function encodeMatrix(text) {
    var bytes = utf8Bytes(text);
    var spec = pickVersion(bytes.length);
    var size = spec.v * 4 + 17;
    var codewords = buildCodewords(bytes, spec);

    var baseMod = makeGrid(size);
    var isFunc = makeGrid(size);

    // Timing patterns
    for (var i = 0; i < size; i++) {
      baseMod[6][i] = (i % 2 === 0) ? 1 : 0; isFunc[6][i] = 1;
      baseMod[i][6] = (i % 2 === 0) ? 1 : 0; isFunc[i][6] = 1;
    }
    // Finder patterns
    placeFinder(baseMod, isFunc, 0, 0, size);
    placeFinder(baseMod, isFunc, 0, size - 7, size);
    placeFinder(baseMod, isFunc, size - 7, 0, size);

    // Alignment patterns
    var centers = spec.align;
    for (var ai = 0; ai < centers.length; ai++) {
      for (var aj = 0; aj < centers.length; aj++) {
        var ar = centers[ai], ac = centers[aj];
        if ((ar === 6 && ac === 6) || (ar === 6 && ac === size - 7) || (ar === size - 7 && ac === 6)) continue;
        placeAlignment(baseMod, isFunc, ar, ac);
      }
    }

    // Reserve format & version regions
    writeFormat(baseMod, isFunc, size, 0);
    writeVersion(baseMod, isFunc, size, spec.v);

    // Place data codewords zig-zag right-to-left
    var bitIdx = 0;
    var totalBits = codewords.length * 8;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) {
        var upward = (((right + 1) & 2) === 0);
        var row = upward ? (size - 1 - vert) : vert;
        for (var dx = 0; dx < 2; dx++) {
          var col = right - dx;
          if (!isFunc[row][col]) {
            var dark = 0;
            if (bitIdx < totalBits) {
              dark = (codewords[bitIdx >>> 3] >>> (7 - (bitIdx & 7))) & 1;
              bitIdx++;
            }
            baseMod[row][col] = dark;
          }
        }
      }
    }

    // Pick lowest-penalty mask
    var bestMask = 0;
    var bestScore = Infinity;
    var bestMod = null;
    for (var m = 0; m < 8; m++) {
      var cand = makeGrid(size);
      for (var r = 0; r < size; r++) {
        for (var c = 0; c < size; c++) {
          cand[r][c] = isFunc[r][c] ? baseMod[r][c] : (baseMod[r][c] ^ (maskFn(m, r, c) ? 1 : 0));
        }
      }
      writeFormat(cand, isFunc, size, m);
      var sc = penaltyScore(cand, size);
      if (sc < bestScore) {
        bestScore = sc;
        bestMask = m;
        bestMod = cand;
      }
    }
    return { size: size, version: spec.v, mask: bestMask, modules: bestMod };
  }

  function renderSvg(text, ariaLabel) {
    var qr = encodeMatrix(text);
    var quiet = 4;
    var dim = qr.size + quiet * 2;
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + dim + ' ' + dim);
    svg.setAttribute('width', '220');
    svg.setAttribute('height', '220');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', ariaLabel || 'TOTP Authenticator QR Code');
    svg.setAttribute('class', 'so-qr-svg');
    svg.setAttribute('shape-rendering', 'crispEdges');

    var bg = document.createElementNS(SVG_NS, 'rect');
    bg.setAttribute('x', '0');
    bg.setAttribute('y', '0');
    bg.setAttribute('width', String(dim));
    bg.setAttribute('height', String(dim));
    bg.setAttribute('fill', '#ffffff');
    svg.appendChild(bg);

    var pathParts = [];
    for (var r = 0; r < qr.size; r++) {
      for (var c = 0; c < qr.size; c++) {
        if (qr.modules[r][c]) {
          pathParts.push('M' + (c + quiet) + ',' + (r + quiet) + 'h1v1h-1z');
        }
      }
    }
    var path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', pathParts.join(''));
    path.setAttribute('fill', '#000000');
    svg.appendChild(path);
    return svg;
  }

  window.CSOQrSvg = {
    encodeMatrix: encodeMatrix,
    renderSvg: renderSvg
  };
})(window, document);
