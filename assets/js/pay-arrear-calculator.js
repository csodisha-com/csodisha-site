/**
 * Common Sense Odisha — Interactive Odisha Govt Pay Arrear,
 * DA Hike & Increment Back-Pay Calculator (/career-paths/, v442)
 * Verified Odisha Finance Dept DA hike presets (Nov 2026 60%->63% w.e.f July 2026,
 * May 2026 58%->60%, Oct 2025 55%->58%, Delayed 3% Increment/MACP), month-by-month
 * due-vs-drawn arrear ledger, automatic HRA recalculation, and NPS/UPS/OPS deductions.
 * Strict CSP-compliant: DOM APIs only, zero unsafe markup injection or inline style mutations;
 * bilingual EN / ଓଡ଼ିଆ; 4-theme var(--cso-*) semantic tokens.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOPayArrearCalculator = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOPayArrearCalculator = api;
})(function (win, doc) {
  'use strict';

  var VERSION = 'v442';
  var ROOT_ID = 'cso-pay-arrear-calculator-root';
  var PREFS_KEY = 'cso_pay_arrear_prefs_v1';
  var ORSP_PREFS_KEY = 'cso_orsp_salary_prefs_v1';

  var ARREAR_PRESETS = [
    {
      id: 'nov2026-da',
      en: 'Nov 17, 2026 Odisha 3% DA Hike (60% → 63%, w.e.f. July 2026)',
      or: 'ନଭେମ୍ବର 2026 ଓଡ଼ିଶା 3% DA ବୃଦ୍ଧି (60% → 63%, ଜୁଲାଇ 2026 ରୁ)',
      oldDa: 60,
      newDa: 63,
      startMonth: '2026-07',
      endMonth: '2026-10',
      stepBasic: false
    },
    {
      id: 'may2026-da',
      en: 'May 18, 2026 Odisha 2% DA Hike (58% → 60%, w.e.f. Jan 2026)',
      or: 'ମେ 2026 ଓଡ଼ିଶା 2% DA ବୃଦ୍ଧି (58% → 60%, ଜାନୁଆରୀ 2026 ରୁ)',
      oldDa: 58,
      newDa: 60,
      startMonth: '2026-01',
      endMonth: '2026-04',
      stepBasic: false
    },
    {
      id: 'oct2025-da',
      en: 'Oct 16, 2025 Odisha 3% DA Hike (55% → 58%, w.e.f. July 2025)',
      or: 'ଅକ୍ଟୋବର 2025 ଓଡ଼ିଶା 3% DA ବୃଦ୍ଧି (55% → 58%, ଜୁଲାଇ 2025 ରୁ)',
      oldDa: 55,
      newDa: 58,
      startMonth: '2025-07',
      endMonth: '2025-09',
      stepBasic: false
    },
    {
      id: 'delayed-increment',
      en: 'Delayed Annual 3% Increment / MACP Fixation (+1 ORSP Cell)',
      or: 'ବିଳମ୍ବିତ ବାର୍ଷିକ 3% ଇନକ୍ରିମେଣ୍ଟ / MACP ବେତନ ନିର୍ଦ୍ଧାରଣ',
      oldDa: 63,
      newDa: 63,
      startMonth: '2026-07',
      endMonth: '2026-10',
      stepBasic: true
    }
  ];

  function parseYm(ym) {
    var m = String(ym || '').match(/^(\d{4})-(\d{2})$/);
    if (!m) return null;
    var y = parseInt(m[1], 10);
    var mo = parseInt(m[2], 10);
    if (mo < 1 || mo > 12) return null;
    return { y: y, m: mo };
  }

  function listMonthsInclusive(startYm, endYm) {
    var s = parseYm(startYm) || { y: 2026, m: 7 };
    var e = parseYm(endYm) || { y: 2026, m: 10 };
    var out = [];
    var cy = s.y;
    var cm = s.m;
    var guard = 0;
    while ((cy < e.y || (cy === e.y && cm <= e.m)) && guard < 36) {
      out.push(cy + '-' + (cm < 10 ? '0' + cm : String(cm)));
      cm += 1;
      if (cm > 12) { cm = 1; cy += 1; }
      guard += 1;
    }
    if (out.length === 0) out.push(s.y + '-' + (s.m < 10 ? '0' + s.m : String(s.m)));
    return out;
  }

  function nextOrspCell(basic) {
    return Math.round((Math.max(10000, Number(basic) || 35400) * 1.03) / 100) * 100;
  }

  function fmtInr(n) {
    return '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');
  }

  function calculateOdishaPayArrears(params) {
    var p = params || {};
    var oldBasic = Math.max(10000, Math.round(Number(p.oldBasic !== undefined ? p.oldBasic : 44900) || 44900));
    var newBasic = Math.max(oldBasic, Math.round(Number(p.newBasic !== undefined ? p.newBasic : oldBasic) || oldBasic));
    var oldDaRate = p.oldDaRate !== undefined && p.oldDaRate !== '' ? Math.max(0, Number(p.oldDaRate) || 0) : 60;
    var newDaRate = p.newDaRate !== undefined && p.newDaRate !== '' ? Math.max(0, Number(p.newDaRate) || 0) : 63;
    var hraRate = p.hraRate !== undefined && p.hraRate !== '' ? Math.max(0, Number(p.hraRate) || 0) : 20;
    var rawTrack = String(p.pensionTrack || 'nps').toLowerCase();
    var pensionTrack = (rawTrack === 'ups' || rawTrack === 'ops') ? rawTrack : 'nps';

    var months = listMonthsInclusive(p.startMonth || '2026-07', p.endMonth || '2026-10');

    var oldDaAmt = Math.round((oldBasic * oldDaRate) / 100);
    var newDaAmt = Math.round((newBasic * newDaRate) / 100);
    var oldHraAmt = Math.round((oldBasic * hraRate) / 100);
    var newHraAmt = Math.round((newBasic * hraRate) / 100);

    var drawnGross = oldBasic + oldDaAmt + oldHraAmt;
    var dueGross = newBasic + newDaAmt + newHraAmt;
    var grossDiff = Math.max(0, dueGross - drawnGross);

    var basicDaDiff = Math.max(0, (newBasic + newDaAmt) - (oldBasic + oldDaAmt));
    var empPensionDed = (pensionTrack === 'nps' || pensionTrack === 'ups') ? Math.round(basicDaDiff * 0.10) : 0;
    var govt80CCD2 = pensionTrack === 'nps'
      ? Math.round(basicDaDiff * 0.14)
      : (pensionTrack === 'ups' ? Math.round(basicDaDiff * 0.10) : 0);
    var netCashMonthly = Math.max(0, grossDiff - empPensionDed);

    var ledger = months.map(function (ym) {
      return {
        month: ym,
        drawnGross: drawnGross,
        dueGross: dueGross,
        grossDiff: grossDiff,
        empPensionDed: empPensionDed,
        govt80CCD2: govt80CCD2,
        netCashPayable: netCashMonthly
      };
    });

    var count = ledger.length;
    return {
      monthCount: count,
      oldBasic: oldBasic,
      newBasic: newBasic,
      oldDaRate: oldDaRate,
      newDaRate: newDaRate,
      hraRate: hraRate,
      pensionTrack: pensionTrack,
      totals: {
        drawnGross: drawnGross * count,
        dueGross: dueGross * count,
        grossArrear: grossDiff * count,
        empPensionDed: empPensionDed * count,
        govt80CCD2: govt80CCD2 * count,
        netCashPayable: netCashMonthly * count
      },
      ledger: ledger
    };
  }

  function loadJson(key) {
    try {
      var raw = win.localStorage && win.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveJson(key, obj) {
    try {
      if (win.localStorage) win.localStorage.setItem(key, JSON.stringify(obj));
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
    var saved = loadJson(PREFS_KEY) || {};
    var orsp = loadJson(ORSP_PREFS_KEY) || {};
    var state = {
      lang: saved.lang === 'or' ? 'or' : 'en',
      presetId: saved.presetId || 'nov2026-da',
      oldBasic: saved.oldBasic || (orsp.customBasic ? Number(orsp.customBasic) : 44900),
      newBasic: saved.newBasic || (orsp.customBasic ? Number(orsp.customBasic) : 44900),
      oldDaRate: saved.oldDaRate !== undefined ? Number(saved.oldDaRate) : 60,
      newDaRate: saved.newDaRate !== undefined ? Number(saved.newDaRate) : 63,
      startMonth: saved.startMonth || '2026-07',
      endMonth: saved.endMonth || '2026-10',
      hraRate: saved.hraRate !== undefined ? Number(saved.hraRate) : 20,
      pensionTrack: saved.pensionTrack || 'nps'
    };

    function persistAndRender() {
      saveJson(PREFS_KEY, state);
      render();
    }

    function render() {
      var orMode = state.lang === 'or';
      var calc = calculateOdishaPayArrears(state);

      var card = el('div', 'cso-pac-card');
      card.setAttribute('data-cso-pay-arrear', '1');

      var head = el('div', 'cso-pac-head');
      var headCopy = el('div', 'cso-pac-head-copy');
      headCopy.appendChild(el('div', 'cso-pac-eyebrow', orMode
        ? '💵 ଓଡ଼ିଶା ଅର୍ଥ ବିଭାଗ DA ବୃଦ୍ଧି ଓ ବେତନ ବକେୟା (ARREAR) କାଲକୁଲେଟର'
        : '💵 ODISHA FINANCE DEPT PAY ARREAR, DA HIKE & BACK-PAY CALCULATOR'));
      headCopy.appendChild(el('h2', 'cso-pac-title', orMode
        ? 'DA ବୃଦ୍ଧି (60% → 63%) ଓ ବିଳମ୍ବିତ ଇନକ୍ରିମେଣ୍ଟ / MACP ବକେୟା ବିଲ୍'
        : 'Odisha Govt DA Hike (60% → 63%) & Delayed Increment Arrear Calculator'));
      headCopy.appendChild(el('p', 'cso-pac-sub', orMode
        ? 'ମାସୱାରୀ Due ବନାମ Drawn ତାଲିକା, HRA ପୁନଃଗଣନା, 10% NPS/UPS କର୍ମଚାରୀ କଟୌତି ଓ ନେଟ୍ ନଗଦ ବକେୟା ଗଣନା କରନ୍ତୁ।'
        : 'Generate a month-by-month Due vs. Drawn arrear bill with automatic HRA recalculation, 10% Employee / 14% Govt NPS adjustments, and net cash payable.'));
      head.appendChild(headCopy);

      var langToggle = el('div', 'cso-pac-lang-toggle');
      ['en', 'or'].forEach(function (lk) {
        var lb = el('button', 'cso-pac-lang-btn' + (state.lang === lk ? ' is-active' : ''), lk === 'en' ? 'English' : 'ଓଡ଼ିଆ');
        lb.type = 'button';
        lb.setAttribute('aria-pressed', state.lang === lk ? 'true' : 'false');
        lb.addEventListener('click', function () { state.lang = lk; persistAndRender(); });
        langToggle.appendChild(lb);
      });
      head.appendChild(langToggle);
      card.appendChild(head);

      // Verified DA Hike & Increment Presets
      var presets = el('div', 'cso-pac-presets');
      ARREAR_PRESETS.forEach(function (pr) {
        var b = el('button', 'cso-pac-pill' + (state.presetId === pr.id ? ' is-active' : ''), orMode ? pr.or : pr.en);
        b.type = 'button';
        b.addEventListener('click', function () {
          state.presetId = pr.id;
          state.oldDaRate = pr.oldDa;
          state.newDaRate = pr.newDa;
          state.startMonth = pr.startMonth;
          state.endMonth = pr.endMonth;
          state.newBasic = pr.stepBasic ? nextOrspCell(state.oldBasic) : state.oldBasic;
          persistAndRender();
        });
        presets.appendChild(b);
      });
      card.appendChild(presets);

      // Form Grid
      var grid = el('div', 'cso-pac-grid');
      function addField(label, ctrl) {
        var box = el('div', 'cso-pac-field');
        var lbl = el('label', 'cso-pac-label', label);
        if (ctrl.id) lbl.setAttribute('for', ctrl.id);
        box.appendChild(lbl);
        box.appendChild(ctrl);
        grid.appendChild(box);
      }
      function makeNum(id, val, min, max, step, onChange) {
        var inp = el('input', 'cso-pac-input');
        inp.id = id;
        inp.type = 'number';
        inp.min = String(min);
        inp.max = String(max);
        inp.step = String(step);
        inp.value = String(val);
        inp.addEventListener('change', function () { onChange(Number(inp.value) || 0); });
        return inp;
      }

      addField(orMode ? 'ପୁରୁଣା ମୂଳ ବେତନ (Old Basic ₹)' : 'Old Basic Pay (₹)', makeNum('cso-pac-ob', state.oldBasic, 10000, 300000, 100, function (v) { state.oldBasic = Math.max(10000, Math.round(v)); if (state.newBasic < state.oldBasic) state.newBasic = state.oldBasic; persistAndRender(); }));
      addField(orMode ? 'ନୂଆ ମୂଳ ବେତନ (New Basic ₹)' : 'New Basic Pay (₹)', makeNum('cso-pac-nb', state.newBasic, 10000, 300000, 100, function (v) { state.newBasic = Math.max(state.oldBasic, Math.round(v)); persistAndRender(); }));
      addField(orMode ? 'ପୁରୁଣା DA (%)' : 'Old DA (%)', makeNum('cso-pac-oda', state.oldDaRate, 0, 150, 1, function (v) { state.oldDaRate = v; persistAndRender(); }));
      addField(orMode ? 'ନୂଆ DA (%)' : 'New DA (%)', makeNum('cso-pac-nda', state.newDaRate, 0, 150, 1, function (v) { state.newDaRate = v; persistAndRender(); }));

      var smInp = el('input', 'cso-pac-input');
      smInp.id = 'cso-pac-sm';
      smInp.type = 'month';
      smInp.value = state.startMonth;
      smInp.addEventListener('change', function () { state.startMonth = smInp.value || '2026-07'; persistAndRender(); });
      addField(orMode ? 'ଆରମ୍ଭ ମାସ (Effective From)' : 'Effective Start Month', smInp);

      var emInp = el('input', 'cso-pac-input');
      emInp.id = 'cso-pac-em';
      emInp.type = 'month';
      emInp.value = state.endMonth;
      emInp.addEventListener('change', function () { state.endMonth = emInp.value || '2026-10'; persistAndRender(); });
      addField(orMode ? 'ଶେଷ ବକେୟା ମାସ (Arrear Till)' : 'Arrear End Month (Inclusive)', emInp);

      var hraSel = el('select', 'cso-pac-input');
      hraSel.id = 'cso-pac-hra';
      [{ r: 20, l: '20% (X/Y City)' }, { r: 10, l: '10% (Z District)' }, { r: 0, l: '0% (Govt Quarters)' }].forEach(function (h) {
        var opt = el('option', '', h.l);
        opt.value = String(h.r);
        if (h.r === Number(state.hraRate)) opt.selected = true;
        hraSel.appendChild(opt);
      });
      hraSel.addEventListener('change', function () { state.hraRate = Number(hraSel.value) || 0; persistAndRender(); });
      addField(orMode ? 'HRA ଶ୍ରେଣୀ (%)' : 'HRA Tier (%)', hraSel);

      var penSel = el('select', 'cso-pac-input');
      penSel.id = 'cso-pac-pen';
      [
        { id: 'nps', l: 'NPS (10% Emp + 14% Govt)' },
        { id: 'ups', l: 'UPS (10% Emp + 10%/18.5% Govt)' },
        { id: 'ops', l: 'OPS / GPF (0% Arrear Cut)' }
      ].forEach(function (pt) {
        var opt = el('option', '', pt.l);
        opt.value = pt.id;
        if (pt.id === state.pensionTrack) opt.selected = true;
        penSel.appendChild(opt);
      });
      penSel.addEventListener('change', function () { state.pensionTrack = penSel.value; persistAndRender(); });
      addField(orMode ? 'ପେନସନ୍ ଟ୍ରାକ୍' : 'Pension Track', penSel);

      card.appendChild(grid);

      // KPI Strip
      var kpis = el('div', 'cso-pac-kpis');
      [
        { lbl: orMode ? '💰 ନେଟ୍ ନଗଦ ବକେୟା (' + calc.monthCount + ' ମାସ)' : '💰 Net Cash Arrear Payable (' + calc.monthCount + ' Months)', val: fmtInr(calc.totals.netCashPayable), mod: ' cso-pac-kpi--win' },
        { lbl: orMode ? '📊 ମୋଟ ଗ୍ରସ୍ ବକେୟା' : '📊 Gross Arrear Difference', val: fmtInr(calc.totals.grossArrear), mod: '' },
        { lbl: orMode ? '🏦 କର୍ମଚାରୀ NPS/UPS କଟୌତି' : '🏦 Employee 10% NPS/UPS Arrear', val: '-' + fmtInr(calc.totals.empPensionDed), mod: '' },
        { lbl: orMode ? '🏛️ ସରକାରୀ 80CCD(2) ଯୋଗଦାନ' : '🏛️ Govt 14%/10% 80CCD(2) Credit', val: '+' + fmtInr(calc.totals.govt80CCD2), mod: '' }
      ].forEach(function (k) {
        var box = el('div', 'cso-pac-kpi' + k.mod);
        box.appendChild(el('span', 'cso-pac-kpi-lbl', k.lbl));
        box.appendChild(el('strong', 'cso-pac-kpi-val', k.val));
        kpis.appendChild(box);
      });
      card.appendChild(kpis);

      // Month-by-Month Ledger Table
      var tblWrap = el('div', 'cso-pac-table-wrap');
      var tbl = el('table', 'cso-pac-table');
      var thead = el('thead');
      var htr = el('tr');
      ['Month', 'Due Gross', 'Drawn Gross', 'Gross Diff', 'Emp NPS/UPS', 'Govt 80CCD(2)', 'Net Cash Payable'].forEach(function (h) { htr.appendChild(el('th', '', h)); });
      thead.appendChild(htr);
      tbl.appendChild(thead);

      var tbody = el('tbody');
      calc.ledger.forEach(function (row) {
        var tr = el('tr');
        tr.appendChild(el('td', '', row.month));
        tr.appendChild(el('td', '', fmtInr(row.dueGross)));
        tr.appendChild(el('td', '', fmtInr(row.drawnGross)));
        tr.appendChild(el('td', '', fmtInr(row.grossDiff)));
        tr.appendChild(el('td', '', '-' + fmtInr(row.empPensionDed)));
        tr.appendChild(el('td', '', '+' + fmtInr(row.govt80CCD2)));
        tr.appendChild(el('td', '', fmtInr(row.netCashPayable)));
        tbody.appendChild(tr);
      });
      var sumTr = el('tr', 'cso-pac-row-hi');
      sumTr.appendChild(el('td', '', 'TOTAL (' + calc.monthCount + 'm)'));
      sumTr.appendChild(el('td', '', fmtInr(calc.totals.dueGross)));
      sumTr.appendChild(el('td', '', fmtInr(calc.totals.drawnGross)));
      sumTr.appendChild(el('td', '', fmtInr(calc.totals.grossArrear)));
      sumTr.appendChild(el('td', '', '-' + fmtInr(calc.totals.empPensionDed)));
      sumTr.appendChild(el('td', '', '+' + fmtInr(calc.totals.govt80CCD2)));
      sumTr.appendChild(el('td', '', fmtInr(calc.totals.netCashPayable)));
      tbody.appendChild(sumTr);
      tbl.appendChild(tbody);
      tblWrap.appendChild(tbl);
      card.appendChild(tblWrap);

      // Actions
      var actions = el('div', 'cso-pac-actions');
      var statusEl = el('span', 'cso-pac-copy-status');
      statusEl.setAttribute('aria-live', 'polite');

      var copyBtn = el('button', 'cso-pac-btn cso-pac-btn--primary', orMode ? '📋 ମାସୱାରୀ ବକେୟା ବିବରଣୀ କପି' : '📋 Copy Month-by-Month Arrear Statement');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        var lines = [
          'CS Odisha — Odisha Govt Pay & DA Arrear Statement (' + state.startMonth + ' to ' + state.endMonth + ')',
          'Basic: ' + fmtInr(calc.oldBasic) + ' -> ' + fmtInr(calc.newBasic) + ' | DA: ' + calc.oldDaRate + '% -> ' + calc.newDaRate + '% | Track: ' + calc.pensionTrack.toUpperCase(),
          'Gross Arrear: ' + fmtInr(calc.totals.grossArrear) + ' | Emp Deduction: -' + fmtInr(calc.totals.empPensionDed) + ' | Net Cash Payable: ' + fmtInr(calc.totals.netCashPayable)
        ];
        copyText(lines.join('\n')).then(function () {
          statusEl.textContent = orMode ? '✅ କପି ହୋଇଗଲା!' : '✅ Arrear statement copied!';
          setTimeout(function () { statusEl.textContent = ''; }, 2400);
        });
      });
      actions.appendChild(copyBtn);

      var printBtn = el('button', 'cso-pac-btn', orMode ? '🖨️ ବକେୟା ବିଲ୍ ୱାର୍କସିଟ୍ ପ୍ରିଣ୍ଟ୍' : '🖨️ Print Arrear Bill Worksheet');
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
    ARREAR_PRESETS: ARREAR_PRESETS,
    nextOrspCell: nextOrspCell,
    listMonthsInclusive: listMonthsInclusive,
    calculateOdishaPayArrears: calculateOdishaPayArrears,
    mount: mount
  };
});
