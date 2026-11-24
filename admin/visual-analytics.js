/**
 * CS Odisha Admin Studio — Pure-CSP SVG Charting & Visual Tile Engine (v247)
 * Zero dependencies, strict CSP: safe DOM & SVG createElementNS APIs only, external CSS classes.
 * Uses document.createElementNS('http://www.w3.org/2000/svg', ...) and semantic CSS classes.
 */
(function (window, document) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var TONES = ['emerald', 'cobalt', 'amber', 'violet', 'rose'];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function svgEl(tag, attrs, cls) {
    var n = document.createElementNS(SVG_NS, tag);
    if (cls) n.setAttribute('class', cls);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) { n.setAttribute(k, String(attrs[k])); });
    }
    return n;
  }

  function toneClass(tone) {
    return 'va-tone-' + (TONES.indexOf(tone) !== -1 ? tone : 'emerald');
  }

  function formatNum(v) {
    try { return Number(v || 0).toLocaleString('en-IN'); } catch (_) { return String(v || 0); }
  }

  // ---------- 1. Inline 14-day SVG Sparkline ----------
  function buildSparklineSvg(values, tone) {
    var vals = Array.isArray(values) && values.length ? values.map(Number) : [0, 0];
    if (vals.length === 1) vals = [vals[0], vals[0]];
    var w = 92; var h = 32; var pad = 3;
    var min = Math.min.apply(null, vals);
    var max = Math.max.apply(null, vals);
    var span = max - min || 1;
    var pts = vals.map(function (v, idx) {
      var x = pad + (idx / (vals.length - 1)) * (w - pad * 2);
      var y = (h - pad) - ((v - min) / span) * (h - pad * 2);
      return [Number(x.toFixed(1)), Number(y.toFixed(1))];
    });
    var lineStr = pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' ');
    var areaStr = pts[0][0] + ',' + (h - pad) + ' ' + lineStr + ' ' + pts[pts.length - 1][0] + ',' + (h - pad);

    var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, role: 'img', 'aria-label': '14-day trend sparkline' }, 'va-spark-svg ' + toneClass(tone));
    svg.appendChild(svgEl('polygon', { points: areaStr }, 'va-spark-area'));
    svg.appendChild(svgEl('polyline', { points: lineStr }, 'va-spark-line'));
    return svg;
  }

  // ---------- 2. KPI Sparkline Tile ----------
  function kpiSparklineTile(opts) {
    opts = opts || {};
    var tone = opts.tone || 'emerald';
    var card = el('div', 'va-kpi ' + toneClass(tone));
    var top = el('div', 'va-kpi__top');
    top.appendChild(el('span', 'va-kpi__label', opts.label || ''));
    if (opts.deltaText) top.appendChild(el('span', 'va-kpi__delta', opts.deltaText));
    card.appendChild(top);

    var body = el('div', 'va-kpi__body');
    var left = el('div', '');
    left.appendChild(el('strong', 'va-kpi__value', opts.value === undefined ? '0' : opts.value));
    if (opts.sub) left.appendChild(el('div', 'va-kpi__sub', opts.sub));
    body.appendChild(left);
    if (Array.isArray(opts.series)) body.appendChild(buildSparklineSvg(opts.series, tone));
    card.appendChild(body);
    return card;
  }

  // ---------- 3. Color-Coded Quick-Action Tile ----------
  function quickActionTile(opts) {
    opts = opts || {};
    var b = el('button', 'va-tile ' + toneClass(opts.tone || 'emerald'));
    b.type = 'button';
    b.appendChild(el('span', 'va-tile__icon', opts.icon || '✦'));
    var copy = el('div', 'va-tile__copy');
    copy.appendChild(el('strong', '', opts.title || ''));
    if (opts.desc) copy.appendChild(el('span', '', opts.desc));
    b.appendChild(copy);
    if (typeof opts.onClick === 'function') b.addEventListener('click', opts.onClick);
    return b;
  }

  // ---------- 4. 14-Day Multi-Metric Trend Area/Line Chart ----------
  function trendAreaChart(opts) {
    opts = opts || {};
    var series = Array.isArray(opts.series) ? opts.series : [];
    var metrics = Array.isArray(opts.metrics) ? opts.metrics : [];
    var wrap = el('div', 'va-trend-wrap');
    if (!series.length || !metrics.length) {
      wrap.appendChild(el('p', 'va-muted', 'No 14-day activity recorded yet.'));
      return wrap;
    }

    var active = new Set(metrics.map(function (m) { return m.key; }));
    var legend = el('div', 'va-legend');
    var svgHost = el('div', '');

    function drawSvg() {
      while (svgHost.firstChild) svgHost.removeChild(svgHost.firstChild);
      var w = 640; var h = 210; var padL = 34; var padR = 12; var padT = 14; var padB = 26;
      var plotW = w - padL - padR; var plotH = h - padT - padB;
      var visibleMetrics = metrics.filter(function (m) { return active.has(m.key); });
      var maxVal = 1;
      visibleMetrics.forEach(function (m) {
        series.forEach(function (pt) { maxVal = Math.max(maxVal, Number(pt[m.key] || 0)); });
      });

      var svg = svgEl('svg', { viewBox: '0 0 ' + w + ' ' + h, role: 'img', 'aria-label': '14-day multi-metric activity trend chart' }, 'va-trend-svg');
      // Horizontal grid lines (0, 50%, 100%)
      [0, 0.5, 1].forEach(function (frac) {
        var y = padT + plotH - frac * plotH;
        svg.appendChild(svgEl('line', { x1: padL, y1: y.toFixed(1), x2: w - padR, y2: y.toFixed(1) }, 'va-grid-line'));
        var lbl = svgEl('text', { x: padL - 6, y: (y + 3).toFixed(1), 'text-anchor': 'end' }, 'va-axis-text');
        lbl.textContent = String(Math.round(frac * maxVal));
        svg.appendChild(lbl);
      });

      // X-axis labels (every 2nd day)
      series.forEach(function (pt, idx) {
        if (idx % 2 !== 0 && idx !== series.length - 1) return;
        var x = padL + (series.length > 1 ? (idx / (series.length - 1)) * plotW : plotW / 2);
        var xl = svgEl('text', { x: x.toFixed(1), y: h - 6, 'text-anchor': 'middle' }, 'va-axis-text');
        xl.textContent = pt.label || pt.date || '';
        svg.appendChild(xl);
      });

      visibleMetrics.forEach(function (m) {
        var g = svgEl('g', {}, toneClass(m.tone));
        var coords = series.map(function (pt, idx) {
          var x = padL + (series.length > 1 ? (idx / (series.length - 1)) * plotW : plotW / 2);
          var val = Number(pt[m.key] || 0);
          var y = padT + plotH - (val / maxVal) * plotH;
          return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)), val: val, date: pt.date };
        });
        var lineStr = coords.map(function (c) { return c.x + ',' + c.y; }).join(' ');
        var areaStr = coords[0].x + ',' + (padT + plotH) + ' ' + lineStr + ' ' + coords[coords.length - 1].x + ',' + (padT + plotH);
        g.appendChild(svgEl('polygon', { points: areaStr }, 'va-series-area'));
        g.appendChild(svgEl('polyline', { points: lineStr }, 'va-series-line'));
        coords.forEach(function (c) {
          var circle = svgEl('circle', { cx: c.x, cy: c.y, r: 3.5, tabindex: 0 }, 'va-series-pt');
          var t = svgEl('title');
          t.textContent = m.label + ' · ' + c.date + ': ' + c.val;
          circle.appendChild(t);
          g.appendChild(circle);
        });
        svg.appendChild(g);
      });
      svgHost.appendChild(svg);
    }

    metrics.forEach(function (m) {
      var b = el('button', 'va-legend-btn ' + toneClass(m.tone));
      b.type = 'button';
      b.appendChild(el('span', 'va-legend-dot'));
      b.appendChild(el('span', '', m.label));
      b.addEventListener('click', function () {
        if (active.has(m.key) && active.size > 1) active.delete(m.key);
        else active.add(m.key);
        b.classList.toggle('is-off', !active.has(m.key));
        drawSvg();
      });
      legend.appendChild(b);
    });

    wrap.appendChild(legend);
    wrap.appendChild(svgHost);
    drawSvg();
    return wrap;
  }

  // ---------- 5. Radial Donut Gauge ----------
  function donutChart(opts) {
    opts = opts || {};
    var segments = Array.isArray(opts.segments) ? opts.segments : [];
    var total = segments.reduce(function (s, seg) { return s + Number(seg.value || 0); }, 0);
    var wrap = el('div', 'va-donut-wrap');
    var r = 54; var cx = 74; var cy = 74;
    var circ = 2 * Math.PI * r;

    var svg = svgEl('svg', { viewBox: '0 0 148 148', role: 'img', 'aria-label': opts.centerLabel || 'Donut breakdown' }, 'va-donut-svg');
    svg.appendChild(svgEl('circle', { cx: cx, cy: cy, r: r }, 'va-donut-track'));

    if (total > 0) {
      var offset = 0;
      segments.forEach(function (seg) {
        var v = Number(seg.value || 0);
        if (v <= 0) return;
        var len = (v / total) * circ;
        var c = svgEl('circle', {
          cx: cx, cy: cy, r: r,
          'stroke-dasharray': len.toFixed(2) + ' ' + circ.toFixed(2),
          'stroke-dashoffset': (-offset).toFixed(2),
          transform: 'rotate(-90 ' + cx + ' ' + cy + ')'
        }, 'va-donut-seg ' + toneClass(seg.tone));
        var t = svgEl('title');
        t.textContent = seg.label + ': ' + formatNum(v) + ' (' + Math.round((v / total) * 100) + '%)';
        c.appendChild(t);
        svg.appendChild(c);
        offset += len;
      });
    }

    var cv = svgEl('text', { x: cx, y: cy + 4 }, 'va-donut-val');
    cv.textContent = opts.centerValue !== undefined ? String(opts.centerValue) : formatNum(total);
    svg.appendChild(cv);
    var cl = svgEl('text', { x: cx, y: cy + 19 }, 'va-donut-lbl');
    cl.textContent = String(opts.centerLabel || 'Total');
    svg.appendChild(cl);
    wrap.appendChild(svg);

    var legend = el('div', 'va-donut-legend');
    segments.forEach(function (seg) {
      var row = el('div', 'va-donut-row ' + toneClass(seg.tone));
      var k = el('span', 'va-donut-key');
      k.appendChild(el('span', 'va-legend-dot'));
      k.appendChild(el('span', '', seg.label));
      row.appendChild(k);
      var pct = total > 0 ? Math.round((Number(seg.value || 0) / total) * 100) + '%' : '0%';
      row.appendChild(el('strong', 'va-num', (seg.displayValue || formatNum(seg.value)) + ' (' + pct + ')'));
      legend.appendChild(row);
    });
    wrap.appendChild(legend);
    return wrap;
  }

  // ---------- 6. Ranked Horizontal SVG Bar Chart ----------
  function horizontalBarChart(opts) {
    opts = opts || {};
    var rows = Array.isArray(opts.rows) ? opts.rows : [];
    var tone = opts.tone || 'cobalt';
    var box = el('div', 'va-bars ' + toneClass(tone));
    if (!rows.length) {
      box.appendChild(el('p', 'va-muted', opts.emptyText || 'No data available yet.'));
      return box;
    }
    var max = rows.reduce(function (m, r) { return Math.max(m, Number(r.count || r.value || 0)); }, 1);
    rows.forEach(function (r) {
      var val = Number(r.count !== undefined ? r.count : r.value || 0);
      var pct = Math.max(0, Math.min(100, Math.round((val / max) * 100)));
      var row = el('div', 'va-bar-row');
      var lbl = el('span', 'va-bar-label', r.label);
      lbl.title = r.label + ': ' + formatNum(val);
      row.appendChild(lbl);

      var svg = svgEl('svg', { viewBox: '0 0 100 10', preserveAspectRatio: 'none', role: 'img', 'aria-label': r.label + ' ' + val }, 'va-bar-svg');
      svg.appendChild(svgEl('rect', { x: 0, y: 0, width: 100, height: 10 }, 'va-bar-bg'));
      var fill = svgEl('rect', { x: 0, y: 0, width: val > 0 ? Math.max(3, pct) : 0, height: 10 }, 'va-bar-fill');
      var t = svgEl('title');
      t.textContent = r.label + ': ' + (r.displayValue || formatNum(val));
      fill.appendChild(t);
      svg.appendChild(fill);
      row.appendChild(svg);

      row.appendChild(el('span', 'va-bar-val', r.displayValue || formatNum(val)));
      box.appendChild(row);
    });
    return box;
  }

  // ---------- 7. Sortable Analytical Table ----------
  function dataTable(opts) {
    opts = opts || {};
    var cols = Array.isArray(opts.columns) ? opts.columns : [];
    var rows = Array.isArray(opts.rows) ? opts.rows.slice() : [];
    var wrap = el('div', 'va-table-wrap');
    if (!rows.length) {
      wrap.appendChild(el('p', 'va-muted', opts.emptyText || 'No rows to display.'));
      return wrap;
    }
    var sortKey = opts.defaultSort || '';
    var sortDir = -1;

    function render() {
      while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
      if (sortKey) {
        rows.sort(function (a, b) {
          var av = a[sortKey]; var bv = b[sortKey];
          if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sortDir;
          return String(av || '').localeCompare(String(bv || '')) * sortDir;
        });
      }
      var tbl = el('table', 'va-table');
      var thead = el('thead');
      var htr = el('tr');
      cols.forEach(function (c) {
        var th = el('th');
        if (c.sortable !== false) {
          var b = el('button', 'va-sort-btn', c.label + (sortKey === c.key ? (sortDir === -1 ? ' ↓' : ' ↑') : ''));
          b.type = 'button';
          b.addEventListener('click', function () {
            if (sortKey === c.key) sortDir *= -1;
            else { sortKey = c.key; sortDir = -1; }
            render();
          });
          th.appendChild(b);
        } else th.textContent = c.label;
        htr.appendChild(th);
      });
      thead.appendChild(htr); tbl.appendChild(thead);

      var tbody = el('tbody');
      rows.forEach(function (r) {
        var tr = el('tr');
        cols.forEach(function (c) {
          var td = el('td', c.numeric ? 'va-num' : '');
          if (typeof c.render === 'function') td.appendChild(c.render(r));
          else td.textContent = r[c.key] === undefined || r[c.key] === null ? '' : String(r[c.key]);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    render();
    return wrap;
  }

  window.CSOVisualAnalytics = {
    kpiSparklineTile: kpiSparklineTile,
    quickActionTile: quickActionTile,
    trendAreaChart: trendAreaChart,
    donutChart: donutChart,
    horizontalBarChart: horizontalBarChart,
    dataTable: dataTable
  };
})(window, document);
