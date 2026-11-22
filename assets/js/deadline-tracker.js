(function (root) {
  'use strict';

  var STORAGE_KEY = 'cso_tracked_deadlines_v1';

  function parseDateParts(dateStr) {
    if (!dateStr) return null;
    var raw = String(dateStr).trim();
    var m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      var y = Number(m[1]);
      var mo = Number(m[2]);
      var d = Number(m[3]);
      if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
        return { year: y, month: mo, day: d };
      }
    }
    var parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return {
      year: parsed.getUTCFullYear(),
      month: parsed.getUTCMonth() + 1,
      day: parsed.getUTCDate()
    };
  }

  function calculateDaysRemaining(lastDateStr, nowDate) {
    var parts = parseDateParts(lastDateStr);
    if (!parts) return null;
    var now = nowDate instanceof Date ? nowDate : new Date();
    var targetUtc = Date.UTC(parts.year, parts.month - 1, parts.day);
    var todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((targetUtc - todayUtc) / 86400000);
  }

  function formatUrgencyLabel(days) {
    if (days === null || days === undefined || Number.isNaN(Number(days))) return 'Check Notice';
    if (days < 0) return 'Closed';
    if (days === 0) return 'Closes Today';
    if (days === 1) return '1 Day Left';
    return days + ' Days Left';
  }

  function normalizeItem(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var title = String(raw.title || '').trim();
    if (!title) return null;
    var id = String(raw.id || raw.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 64)).trim();
    if (!id) return null;
    return {
      id: id,
      title: title,
      board: String(raw.board || raw.organisation || raw.department || '').trim(),
      district: String(raw.district || raw.state || 'Odisha').trim(),
      lastDate: String(raw.lastDate || raw.last_date || '').trim(),
      applyUrl: String(raw.applyUrl || raw.apply_url || raw.notification_url || '').trim(),
      savedAt: String(raw.savedAt || new Date().toISOString())
    };
  }

  function sortDeadlines(list) {
    return list.slice().sort(function (a, b) {
      var pa = parseDateParts(a.lastDate);
      var pb = parseDateParts(b.lastDate);
      if (!pa && !pb) return 0;
      if (!pa) return 1;
      if (!pb) return -1;
      var ta = Date.UTC(pa.year, pa.month - 1, pa.day);
      var tb = Date.UTC(pb.year, pb.month - 1, pb.day);
      return ta - tb;
    });
  }

  function load(storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    if (!s) return [];
    try {
      var raw = s.getItem(STORAGE_KEY);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      var seen = {};
      var out = [];
      for (var i = 0; i < arr.length; i++) {
        var norm = normalizeItem(arr[i]);
        if (norm && !seen[norm.id]) {
          seen[norm.id] = true;
          out.push(norm);
        }
      }
      return sortDeadlines(out);
    } catch (_) {
      return [];
    }
  }

  function saveList(items, storage) {
    var s = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    var out = [];
    var seen = {};
    if (Array.isArray(items)) {
      for (var i = 0; i < items.length; i++) {
        var norm = normalizeItem(items[i]);
        if (norm && !seen[norm.id]) {
          seen[norm.id] = true;
          out.push(norm);
        }
      }
    }
    var sorted = sortDeadlines(out);
    if (s) {
      try { s.setItem(STORAGE_KEY, JSON.stringify(sorted)); } catch (_) {}
    }
    if (typeof fetch === 'function') {
      try {
        fetch('/api/sync', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tracked_deadlines: sorted })
        }).catch(function () {});
      } catch (_) {}
    }
    return sorted;
  }

  function isTracked(id, storage) {
    if (!id) return false;
    var list = load(storage);
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === String(id)) return true;
    }
    return false;
  }

  function trackItem(item, storage) {
    var norm = normalizeItem(item);
    if (!norm) return load(storage);
    var list = load(storage).filter(function (x) { return x.id !== norm.id; });
    list.push(norm);
    return saveList(list, storage);
  }

  function untrackItem(id, storage) {
    var target = String(id || '').trim();
    var list = load(storage).filter(function (x) { return x.id !== target; });
    return saveList(list, storage);
  }

  function toggleTrack(item, storage) {
    var norm = normalizeItem(item);
    if (!norm) return { tracked: false, items: load(storage) };
    if (isTracked(norm.id, storage)) {
      return { tracked: false, items: untrackItem(norm.id, storage) };
    }
    return { tracked: true, items: trackItem(norm, storage) };
  }

  function pad2(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function escapeIcsText(val) {
    return String(val || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  function formatIcsDate(parts) {
    return String(parts.year) + pad2(parts.month) + pad2(parts.day);
  }

  function addOneDay(parts) {
    var dt = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));
    return {
      year: dt.getUTCFullYear(),
      month: dt.getUTCMonth() + 1,
      day: dt.getUTCDate()
    };
  }

  function formatUtcStamp(d) {
    var now = d instanceof Date ? d : new Date();
    return String(now.getUTCFullYear()) +
      pad2(now.getUTCMonth() + 1) +
      pad2(now.getUTCDate()) + 'T' +
      pad2(now.getUTCHours()) +
      pad2(now.getUTCMinutes()) +
      pad2(now.getUTCSeconds()) + 'Z';
  }

  function buildIcsContent(item) {
    var norm = normalizeItem(item);
    if (!norm) return '';
    var parts = parseDateParts(norm.lastDate);
    if (!parts) return '';

    var dtStart = formatIcsDate(parts);
    var dtEnd = formatIcsDate(addOneDay(parts));
    var uidSafe = norm.id.replace(/[^a-zA-Z0-9._-]/g, '-') || 'deadline';
    var descParts = [];
    if (norm.board) descParts.push('Board: ' + norm.board);
    if (norm.district) descParts.push('Region: ' + norm.district);
    if (norm.applyUrl) descParts.push('Official Portal: ' + norm.applyUrl);
    descParts.push('Tracked via Common Sense Odisha (csodisha.com)');

    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Common Sense Odisha//Deadline Tracker//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + uidSafe + '@csodisha.com',
      'DTSTAMP:' + formatUtcStamp(new Date()),
      'DTSTART;VALUE=DATE:' + dtStart,
      'DTEND;VALUE=DATE:' + dtEnd,
      'SUMMARY:' + escapeIcsText(norm.title + ' (Last Date)'),
      'DESCRIPTION:' + escapeIcsText(descParts.join('\n'))
    ];

    if (/^https?:\/\//i.test(norm.applyUrl)) {
      lines.push('URL:' + norm.applyUrl);
    }

    lines.push(
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + escapeIcsText('Deadline Tomorrow: ' + norm.title),
      'TRIGGER:-PT24H',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    );

    return lines.join('\r\n') + '\r\n';
  }

  function downloadIcsReminder(item) {
    var ics = buildIcsContent(item);
    if (!ics || typeof Blob === 'undefined' || typeof URL === 'undefined' || typeof document === 'undefined') {
      return false;
    }
    var norm = normalizeItem(item);
    var slug = (norm && norm.id ? norm.id : 'cso-deadline').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
    var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'cso-' + slug + '.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () {
      try { URL.revokeObjectURL(url); } catch (_) {}
    }, 1000);
    return true;
  }

  root.CSO_DEADLINE_TRACKER = {
    STORAGE_KEY: STORAGE_KEY,
    calculateDaysRemaining: calculateDaysRemaining,
    formatUrgencyLabel: formatUrgencyLabel,
    load: load,
    saveList: saveList,
    isTracked: isTracked,
    trackItem: trackItem,
    untrackItem: untrackItem,
    toggleTrack: toggleTrack,
    buildIcsContent: buildIcsContent,
    downloadIcsReminder: downloadIcsReminder
  };
})(typeof window !== 'undefined' ? window : globalThis);
