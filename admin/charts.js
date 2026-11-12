/**
 * CS Odisha Admin Studio — Zero-Dependency CSP-Safe SVG Analytics Module (admin/charts.js)
 * Strictly compliant with Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'
 * Zero inline styles, zero .style.* mutations, zero .innerHTML, pure createElementNS SVG geometry.
 */
(function (window) {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  function domEl(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = String(v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, v === true ? '' : String(v));
      });
    }
    if (children) {
      [].concat(children).forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
      });
    }
    return node;
  }

  function svgEl(tag, attrs, children) {
    var node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'text') node.textContent = String(v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else node.setAttribute(k, String(v));
      });
    }
    if (children) {
      [].concat(children).forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        node.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
      });
    }
    return node;
  }

  function clearNode(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function bindTooltip(target, tooltipBox, titleText, detailText) {
    function activate() {
      clearNode(tooltipBox);
      tooltipBox.className = 'cso-chart-tooltip is-active';
      tooltipBox.appendChild(domEl('strong', { class: 'cso-chart-tooltip-title', text: titleText }));
      tooltipBox.appendChild(domEl('span', { class: 'cso-chart-tooltip-detail', text: detailText }));
    }
    target.addEventListener('mouseenter', activate);
    target.addEventListener('focus', activate);
  }

  /**
   * 1. Content Pipeline Donut + Segmented Bar Chart
   * Displays Published, Scheduled, Draft, Expired, and Archived breakdown across Jobs, Current Affairs, and Mock Tests.
   */
  function renderContentPipeline(container, data, onSelectStatus) {
    if (!container) return;
    clearNode(container);

    var counts = (data && data.counts) || {};
    var byType = (data && data.byType) || {};
    var segments = [
      { key: 'published', label: 'Published', count: Number(counts.published || 0), cls: 'cso-seg-published', pillCls: 'badge published' },
      { key: 'scheduled', label: 'Scheduled', count: Number(counts.scheduled || 0), cls: 'cso-seg-scheduled', pillCls: 'badge scheduled' },
      { key: 'draft', label: 'Draft', count: Number(counts.draft || 0), cls: 'cso-seg-draft', pillCls: 'badge draft' },
      { key: 'expired', label: 'Expired', count: Number(counts.expired || 0), cls: 'cso-seg-expired', pillCls: 'badge expired' },
      { key: 'archived', label: 'Archived', count: Number(counts.archived || 0), cls: 'cso-seg-archived', pillCls: 'badge archived' }
    ];

    var total = segments.reduce(function (acc, s) { return acc + s.count; }, 0);
    var tooltipBox = domEl('div', { class: 'cso-chart-tooltip', 'aria-live': 'polite' }, [
      domEl('span', { class: 'cso-chart-tooltip-hint', text: total > 0 ? 'Hover or focus any chart segment to inspect status breakdown' : 'Pipeline is currently empty — create a post or mock test to populate chart' })
    ]);

    var svgSize = 168;
    var cx = 84;
    var cy = 84;
    var r = 56;
    var circumference = 2 * Math.PI * r;

    var donutSvg = svgEl('svg', {
      viewBox: '0 0 ' + svgSize + ' ' + svgSize,
      width: String(svgSize),
      height: String(svgSize),
      class: 'cso-donut-svg',
      role: 'img',
      'aria-label': 'Content pipeline status donut chart: ' + total + ' total items'
    }, [
      svgEl('title', { text: 'Content Pipeline Distribution (' + total + ' total items)' }),
      svgEl('circle', {
        cx: String(cx),
        cy: String(cy),
        r: String(r),
        class: 'cso-donut-track'
      })
    ]);

    if (total > 0) {
      var offsetAcc = 0;
      segments.forEach(function (seg) {
        if (seg.count <= 0) return;
        var frac = seg.count / total;
        var arcLen = Math.max(2, frac * circumference);
        var dashArray = arcLen.toFixed(2) + ' ' + Math.max(0, circumference - arcLen).toFixed(2);
        var dashOffset = (-offsetAcc).toFixed(2);
        offsetAcc += frac * circumference;
        var pct = Math.round(frac * 100);
        var summaryText = seg.label + ': ' + seg.count + ' item' + (seg.count === 1 ? '' : 's') + ' (' + pct + '% of pipeline)';

        var circle = svgEl('circle', {
          cx: String(cx),
          cy: String(cy),
          r: String(r),
          'stroke-dasharray': dashArray,
          'stroke-dashoffset': dashOffset,
          transform: 'rotate(-90 ' + cx + ' ' + cy + ')',
          class: 'cso-donut-arc ' + seg.cls,
          tabindex: '0',
          role: 'button',
          'aria-label': summaryText
        }, [
          svgEl('title', { text: summaryText })
        ]);

        bindTooltip(circle, tooltipBox, seg.label + ' (' + pct + '%)', seg.count + ' of ' + total + ' total items across Jobs, Current Affairs & Mock Tests');
        if (typeof onSelectStatus === 'function') {
          circle.addEventListener('click', function () { onSelectStatus(seg.key); });
          circle.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectStatus(seg.key); }
          });
        }
        donutSvg.appendChild(circle);
      });
    }

    donutSvg.appendChild(svgEl('text', {
      x: String(cx),
      y: String(cy - 2),
      'text-anchor': 'middle',
      class: 'cso-donut-total-num',
      text: String(total)
    }));
    donutSvg.appendChild(svgEl('text', {
      x: String(cx),
      y: String(cy + 16),
      'text-anchor': 'middle',
      class: 'cso-donut-total-sub',
      text: total === 1 ? 'TOTAL ITEM' : 'TOTAL ITEMS'
    }));

    // Segmented Horizontal Bar SVG (viewBox 0 0 360 22)
    var barWidth = 360;
    var segBarSvg = svgEl('svg', {
      viewBox: '0 0 ' + barWidth + ' 22',
      width: '100%',
      height: '22',
      class: 'cso-segbar-svg',
      role: 'img',
      'aria-label': 'Segmented pipeline status bar'
    }, [
      svgEl('title', { text: 'Segmented Content Status Ratio Bar' }),
      svgEl('rect', { x: '0', y: '2', width: String(barWidth), height: '18', rx: '5', class: 'cso-segbar-track' })
    ]);

    if (total > 0) {
      var curX = 0;
      segments.forEach(function (seg) {
        if (seg.count <= 0) return;
        var w = Math.max(6, Math.round((seg.count / total) * barWidth));
        if (curX + w > barWidth) w = Math.max(4, barWidth - curX);
        var pct = Math.round((seg.count / total) * 100);
        var rNode = svgEl('rect', {
          x: String(curX),
          y: '2',
          width: String(w),
          height: '18',
          rx: '2',
          class: 'cso-segbar-piece ' + seg.cls
        }, [
          svgEl('title', { text: seg.label + ': ' + seg.count + ' (' + pct + '%)' })
        ]);
        bindTooltip(rNode, tooltipBox, seg.label + ' Segment', seg.count + ' items (' + pct + '% of total editorial inventory)');
        segBarSvg.appendChild(rNode);
        curX += w;
      });
    }

    var legendList = domEl('div', { class: 'cso-chart-legend-list' });
    segments.forEach(function (seg) {
      var pct = total > 0 ? Math.round((seg.count / total) * 100) : 0;
      var row = domEl('button', {
        type: 'button',
        class: 'cso-chart-legend-row',
        'aria-label': 'Filter by ' + seg.label + ': ' + seg.count + ' items',
        onclick: function () {
          if (typeof onSelectStatus === 'function') onSelectStatus(seg.key);
        }
      }, [
        domEl('span', { class: 'cso-chart-legend-left' }, [
          domEl('span', { class: 'cso-chart-swatch ' + seg.cls }),
          domEl('span', { class: 'cso-chart-legend-name', text: seg.label })
        ]),
        domEl('span', { class: 'cso-chart-legend-right tabular-nums' }, [
          domEl('strong', { text: String(seg.count) }),
          domEl('span', { class: 'muted', text: ' (' + pct + '%)' })
        ])
      ]);
      bindTooltip(row, tooltipBox, seg.label + ' Status', seg.count + ' items (' + pct + '%) — click to filter content');
      legendList.appendChild(row);
    });

    // Breakdown mini-row by stream (Jobs, Current Affairs, Mock Tests)
    var streamSummary = domEl('div', { class: 'cso-pipeline-streams' }, [
      ['Job Alerts', byType.jobs || { live: 0, total: 0 }],
      ['Current Affairs', byType.current_affairs || { live: 0, total: 0 }],
      ['Mock Tests', byType.mock_tests || { live: 0, total: 0 }]
    ].map(function (pair) {
      var stObj = pair[1];
      return domEl('div', { class: 'cso-pipeline-stream-pill' }, [
        domEl('span', { class: 'muted', text: pair[0] }),
        domEl('strong', { class: 'tabular-nums', text: (stObj.live || 0) + ' live / ' + (stObj.total || 0) + ' total' })
      ]);
    }));

    var layout = domEl('div', { class: 'cso-pipeline-chart-wrap' }, [
      domEl('div', { class: 'cso-pipeline-top' }, [
        domEl('div', { class: 'cso-donut-box' }, [donutSvg]),
        domEl('div', { class: 'cso-pipeline-details' }, [
          segBarSvg,
          legendList
        ])
      ]),
      streamSummary,
      tooltipBox
    ]);

    container.appendChild(layout);
  }

  /**
   * 2. 7-Day Activity Cadence & Candidate CBT Engagement Bar + Sparkline Chart
   */
  function renderActivityAndCbtChart(container, data) {
    if (!container) return;
    clearNode(container);

    var days = (data && Array.isArray(data.days) && data.days.length) ? data.days : [];
    var cbt = (data && data.cbt) || {};

    var tooltipBox = domEl('div', { class: 'cso-chart-tooltip', 'aria-live': 'polite' }, [
      domEl('span', { class: 'cso-chart-tooltip-hint', text: 'Hover or focus any day bar or sparkline node to inspect daily cadence' })
    ]);

    var kpiStrip = domEl('div', { class: 'cso-chart-kpi-strip' }, [
      domEl('div', { class: 'cso-chart-kpi-item' }, [
        domEl('span', { class: 'muted', text: 'CBT Attempts' }),
        domEl('strong', { class: 'tabular-nums', text: String(cbt.attemptsTotal || 0) })
      ]),
      domEl('div', { class: 'cso-chart-kpi-item' }, [
        domEl('span', { class: 'muted', text: 'Saved Bookmarks' }),
        domEl('strong', { class: 'tabular-nums', text: String(cbt.bookmarksTotal || 0) })
      ]),
      domEl('div', { class: 'cso-chart-kpi-item' }, [
        domEl('span', { class: 'muted', text: '24h Audit Ops' }),
        domEl('strong', { class: 'tabular-nums', text: String(cbt.audit24h || 0) })
      ]),
      domEl('div', { class: 'cso-chart-kpi-item' }, [
        domEl('span', { class: 'muted', text: '7d New Users' }),
        domEl('strong', { class: 'tabular-nums', text: '+' + String(cbt.newUsers7d || 0) })
      ])
    ]);

    var svgW = 460;
    var svgH = 186;
    var padLeft = 34;
    var padRight = 18;
    var padTop = 22;
    var padBottom = 34;
    var plotW = svgW - padLeft - padRight;
    var plotH = svgH - padTop - padBottom;

    var maxVal = 4;
    days.forEach(function (d) {
      var sum = (Number(d.contentCount) || 0) + (Number(d.auditCount) || 0);
      if (sum > maxVal) maxVal = sum;
      if (Number(d.contentCount) > maxVal) maxVal = Number(d.contentCount);
      if (Number(d.auditCount) > maxVal) maxVal = Number(d.auditCount);
    });

    var chartSvg = svgEl('svg', {
      viewBox: '0 0 ' + svgW + ' ' + svgH,
      width: '100%',
      height: String(svgH),
      class: 'cso-activity-svg',
      role: 'img',
      'aria-label': '7-day publishing cadence and admin audit activity bar and sparkline chart'
    }, [
      svgEl('title', { text: '7-Day Publishing Cadence & Platform Activity Trend' })
    ]);

    // Horizontal reference grid lines
    [0, 0.5, 1].forEach(function (ratio) {
      var y = Math.round(padTop + plotH * (1 - ratio));
      var valLabel = Math.round(maxVal * ratio);
      chartSvg.appendChild(svgEl('line', {
        x1: String(padLeft),
        y1: String(y),
        x2: String(svgW - padRight),
        y2: String(y),
        class: 'cso-svg-grid-line'
      }));
      chartSvg.appendChild(svgEl('text', {
        x: String(padLeft - 6),
        y: String(y + 4),
        'text-anchor': 'end',
        class: 'cso-svg-axis-label tabular-nums',
        text: String(valLabel)
      }));
    });

    var stepW = days.length > 0 ? plotW / days.length : plotW;
    var sparkPoints = [];

    days.forEach(function (d, idx) {
      var cCount = Number(d.contentCount || 0);
      var aCount = Number(d.auditCount || 0);
      var totalDay = cCount + aCount;

      var groupCenter = Math.round(padLeft + stepW * idx + stepW / 2);
      var barW = 14;

      var cH = Math.max(cCount > 0 ? 5 : 2, Math.round((cCount / maxVal) * plotH));
      var aH = Math.max(aCount > 0 ? 5 : 2, Math.round((aCount / maxVal) * plotH));

      var cY = padTop + plotH - cH;
      var aY = padTop + plotH - aH;

      var contentRect = svgEl('rect', {
        x: String(groupCenter - barW - 2),
        y: String(cY),
        width: String(barW),
        height: String(cH),
        rx: '3',
        class: 'cso-bar-content',
        tabindex: '0',
        'aria-label': d.label + ' (' + d.date + '): ' + cCount + ' content updates, ' + aCount + ' audit events'
      }, [
        svgEl('title', { text: d.label + ' (' + d.date + ') — Content items updated/published: ' + cCount })
      ]);

      var auditRect = svgEl('rect', {
        x: String(groupCenter + 2),
        y: String(aY),
        width: String(barW),
        height: String(aH),
        rx: '3',
        class: 'cso-bar-audit'
      }, [
        svgEl('title', { text: d.label + ' (' + d.date + ') — Admin & CBT audit events: ' + aCount })
      ]);

      bindTooltip(
        contentRect,
        tooltipBox,
        d.label + ' · ' + d.date,
        cCount + ' content updates · ' + aCount + ' operational events (' + totalDay + ' total actions)'
      );
      bindTooltip(
        auditRect,
        tooltipBox,
        d.label + ' · ' + d.date,
        aCount + ' operational events · ' + cCount + ' content updates'
      );

      chartSvg.appendChild(contentRect);
      chartSvg.appendChild(auditRect);

      if (totalDay > 0) {
        var topY = Math.min(cY, aY) - 5;
        chartSvg.appendChild(svgEl('text', {
          x: String(groupCenter),
          y: String(Math.max(12, topY)),
          'text-anchor': 'middle',
          class: 'cso-svg-bar-val tabular-nums',
          text: String(totalDay)
        }));
      }

      chartSvg.appendChild(svgEl('text', {
        x: String(groupCenter),
        y: String(svgH - 12),
        'text-anchor': 'middle',
        class: 'cso-svg-axis-label',
        text: d.label
      }));

      var sparkY = Math.round(padTop + plotH - (Math.min(maxVal, totalDay) / maxVal) * plotH);
      sparkPoints.push({ x: groupCenter, y: sparkY, day: d, total: totalDay });
    });

    if (sparkPoints.length > 1) {
      var polyPoints = sparkPoints.map(function (pt) { return pt.x + ',' + pt.y; }).join(' ');
      chartSvg.appendChild(svgEl('polyline', {
        points: polyPoints,
        fill: 'none',
        class: 'cso-sparkline-path'
      }));
      sparkPoints.forEach(function (pt) {
        var dot = svgEl('circle', {
          cx: String(pt.x),
          cy: String(pt.y),
          r: '3.5',
          class: 'cso-sparkline-dot'
        }, [
          svgEl('title', { text: pt.day.label + ': ' + pt.total + ' combined events' })
        ]);
        bindTooltip(dot, tooltipBox, pt.day.label + ' Trend Node', pt.total + ' total content + operational events on ' + pt.day.date);
        chartSvg.appendChild(dot);
      });
    }

    var legendBar = domEl('div', { class: 'cso-activity-legend' }, [
      domEl('span', { class: 'cso-activity-legend-item' }, [
        domEl('span', { class: 'cso-chart-swatch cso-seg-published' }),
        domEl('span', { text: 'Content Updates (Posts & Tests)' })
      ]),
      domEl('span', { class: 'cso-activity-legend-item' }, [
        domEl('span', { class: 'cso-chart-swatch cso-seg-scheduled' }),
        domEl('span', { text: 'Audit & Lifecycle Events' })
      ]),
      domEl('span', { class: 'cso-activity-legend-item' }, [
        domEl('span', { class: 'cso-chart-swatch cso-seg-spark' }),
        domEl('span', { text: 'Combined 7-Day Activity Trend' })
      ])
    ]);

    container.appendChild(domEl('div', { class: 'cso-activity-chart-wrap' }, [
      kpiStrip,
      chartSvg,
      legendBar,
      tooltipBox
    ]));
  }

  /**
   * 3. Odisha Exam Category Distribution Horizontal SVG Bar Chart
   * Categories: OPSC, OSSC, OSSSC, Teaching, Banking, SSC, Police/Defence
   */
  function renderExamCategoryChart(container, categories, onSelectCategory) {
    if (!container) return;
    clearNode(container);

    var list = Array.isArray(categories) && categories.length ? categories : [
      { code: 'OPSC', label: 'OPSC', jobs: 0, currentAffairs: 0, mockTests: 0, resources: 0, total: 0 },
      { code: 'OSSC', label: 'OSSC', jobs: 0, currentAffairs: 0, mockTests: 0, resources: 0, total: 0 },
      { code: 'OSSSC', label: 'OSSSC', jobs: 0, currentAffairs: 0, mockTests: 0, resources: 0, total: 0 },
      { code: 'Teaching', label: 'Teaching', jobs: 0, currentAffairs: 0, mockTests: 0, resources: 0, total: 0 },
      { code: 'Banking', label: 'Banking', jobs: 0, currentAffairs: 0, mockTests: 0, resources: 0, total: 0 },
      { code: 'SSC', label: 'SSC', jobs: 0, currentAffairs: 0, mockTests: 0, resources: 0, total: 0 },
      { code: 'Police/Defence', label: 'Police/Defence', jobs: 0, currentAffairs: 0, mockTests: 0, resources: 0, total: 0 }
    ];

    var grandTotal = list.reduce(function (s, c) { return s + (Number(c.total) || 0); }, 0);
    var maxCat = list.reduce(function (m, c) { return Math.max(m, Number(c.total) || 0); }, 1);

    var tooltipBox = domEl('div', { class: 'cso-chart-tooltip', 'aria-live': 'polite' }, [
      domEl('span', { class: 'cso-chart-tooltip-hint', text: 'Click or hover any Odisha exam track bar to inspect Jobs, Current Affairs, Mock Tests & Syllabus coverage' })
    ]);

    var rowH = 30;
    var svgW = 460;
    var svgH = list.length * rowH + 18;
    var barStartX = 110;
    var maxBarW = 278;

    var catSvg = svgEl('svg', {
      viewBox: '0 0 ' + svgW + ' ' + svgH,
      width: '100%',
      height: String(svgH),
      class: 'cso-category-svg',
      role: 'img',
      'aria-label': 'Odisha exam category distribution horizontal bar chart'
    }, [
      svgEl('title', { text: 'Coverage across Odisha Exam Categories (OPSC, OSSC, OSSSC, Teaching, Banking, SSC, Police/Defence)' })
    ]);

    list.forEach(function (cat, idx) {
      var y = 10 + idx * rowH;
      var total = Number(cat.total || 0);
      var pct = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0;
      var detailStr = 'Jobs: ' + (cat.jobs || 0) + ' · Current Affairs: ' + (cat.currentAffairs || 0) + ' · Mock Tests: ' + (cat.mockTests || 0) + ' · Syllabus/PYQ: ' + (cat.resources || 0);

      var g = svgEl('g', {
        class: 'cso-cat-row-group',
        tabindex: '0',
        role: 'button',
        'aria-label': cat.label + ': ' + total + ' items (' + detailStr + ')'
      }, [
        svgEl('title', { text: cat.label + ' (' + total + ' items) — ' + detailStr })
      ]);

      g.appendChild(svgEl('text', {
        x: '6',
        y: String(y + 13),
        class: 'cso-svg-cat-label',
        text: cat.label
      }));

      g.appendChild(svgEl('rect', {
        x: String(barStartX),
        y: String(y),
        width: String(maxBarW),
        height: '18',
        rx: '4',
        class: 'cso-svg-bar-track'
      }));

      var curX = barStartX;
      var parts = [
        { count: Number(cat.jobs || 0), cls: 'cso-seg-published', name: 'Jobs' },
        { count: Number(cat.currentAffairs || 0), cls: 'cso-seg-scheduled', name: 'Current Affairs' },
        { count: Number(cat.mockTests || 0), cls: 'cso-seg-indigo', name: 'Mock Tests' },
        { count: Number(cat.resources || 0), cls: 'cso-seg-draft', name: 'Syllabus/PYQ' }
      ];

      parts.forEach(function (p) {
        if (p.count <= 0) return;
        var w = Math.max(5, Math.round((p.count / maxCat) * maxBarW));
        if (curX + w > barStartX + maxBarW) w = Math.max(3, barStartX + maxBarW - curX);
        g.appendChild(svgEl('rect', {
          x: String(curX),
          y: String(y),
          width: String(w),
          height: '18',
          rx: '2',
          class: 'cso-cat-bar-seg ' + p.cls
        }));
        curX += w;
      });

      g.appendChild(svgEl('text', {
        x: String(barStartX + maxBarW + 10),
        y: String(y + 13),
        class: 'cso-svg-val-label tabular-nums',
        text: total + ' (' + pct + '%)'
      }));

      bindTooltip(g, tooltipBox, cat.label + ' Track (' + total + ' items)', detailStr);
      if (typeof onSelectCategory === 'function') {
        g.addEventListener('click', function () { onSelectCategory(cat.code); });
        g.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectCategory(cat.code); }
        });
      }

      catSvg.appendChild(g);
    });

    var legendRow = domEl('div', { class: 'cso-activity-legend' }, [
      domEl('span', { class: 'cso-activity-legend-item' }, [
        domEl('span', { class: 'cso-chart-swatch cso-seg-published' }),
        domEl('span', { text: 'Jobs' })
      ]),
      domEl('span', { class: 'cso-activity-legend-item' }, [
        domEl('span', { class: 'cso-chart-swatch cso-seg-scheduled' }),
        domEl('span', { text: 'Current Affairs' })
      ]),
      domEl('span', { class: 'cso-activity-legend-item' }, [
        domEl('span', { class: 'cso-chart-swatch cso-seg-indigo' }),
        domEl('span', { text: 'Mock Tests' })
      ]),
      domEl('span', { class: 'cso-activity-legend-item' }, [
        domEl('span', { class: 'cso-chart-swatch cso-seg-draft' }),
        domEl('span', { text: 'Syllabus & PYQ' })
      ])
    ]);

    var quickFilterRow = domEl('div', { class: 'cso-cat-pill-row' }, list.map(function (cat) {
      return domEl('button', {
        type: 'button',
        class: 'btn sm cso-cat-filter-pill',
        text: cat.label + ' (' + (cat.total || 0) + ')',
        onclick: function () {
          if (typeof onSelectCategory === 'function') onSelectCategory(cat.code);
        }
      });
    }));

    container.appendChild(domEl('div', { class: 'cso-category-chart-wrap' }, [
      catSvg,
      legendRow,
      quickFilterRow,
      tooltipBox
    ]));
  }

  /**
   * Helper: Classify an item into one of the 7 Odisha Exam Categories
   */
  function classifyExamTrack(textStr) {
    var s = String(textStr || '').toUpperCase();
    if (/\bOSSSC\b|RI\b|AMIN\b|PEO\b|FOREST GUARD|LIVESTOCK|ICDS|SEVAK/.test(s)) return 'OSSSC';
    if (/\bOSSC\b|CGL\b|CHSL\b|JE\b|EXCISE|WELFARE EXTENSION/.test(s)) return 'OSSC';
    if (/\bOPSC\b|OCS\b|OAS\b|ASO\b|JUDICIAL|MEDICAL OFFICER|LECTURER/.test(s)) return 'OPSC';
    if (/TEACH|OTET|OSSTET|B\.?ED|CTET|LTR|SSB|OAVS|SSD|JT\b|JUNIOR TEACHER|EDUCATION/.test(s)) return 'Teaching';
    if (/POLICE|DEFENCE|CONSTABLE|SI\b|SUB INSPECTOR|IRB|OSAP|FIREMAN|ARMY|NAVY|NDA|CDS|HOME GUARD/.test(s)) return 'Police/Defence';
    if (/BANK|IBPS|SBI|RBI|NABARD|COOPERATIVE|OSCB/.test(s)) return 'Banking';
    if (/\bSSC\b|MTS|GD\b|RAILWAY|RRB|CENTRAL/.test(s)) return 'SSC';
    return 'OPSC';
  }

  window.CSOCharts = Object.freeze({
    renderContentPipeline: renderContentPipeline,
    renderActivityAndCbtChart: renderActivityAndCbtChart,
    renderExamCategoryChart: renderExamCategoryChart,
    classifyExamTrack: classifyExamTrack
  });
})(window);
