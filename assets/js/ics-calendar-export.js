/**
 * Common Sense Odisha — Offline RFC 5545 .ics Calendar Reminder Export (v389)
 * Powers 1-Click "Add to Calendar (.ics)" & "Save All Key Dates (.ics)" across
 * /jobs/<slug>, /exams/, and /guides/<slug> with zero external APIs.
 * Strict CSP-compliant: DOM APIs only, zero inline styles/handlers, EN / ଓଡ଼ିଆ bilingual.
 */
(function (rootFactory) {
  var api = rootFactory(
    typeof window !== 'undefined' ? window : globalThis,
    typeof document !== 'undefined' ? document : null
  );
  if (typeof window !== 'undefined') window.CSOCalendarExport = api;
  if (typeof globalThis !== 'undefined') globalThis.CSOCalendarExport = api;
})(function (win, doc) {
  'use strict';

  var MONTHS = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12
  };

  function pad2(n) {
    return n < 10 ? ('0' + n) : String(n);
  }

  function slugifyFile(raw) {
    return String(raw || 'csodisha-reminder')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 72) || 'csodisha-reminder';
  }

  function isValidYmd(y, m, d) {
    if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return false;
    if (y < 2020 || y > 2035 || m < 1 || m > 12 || d < 1 || d > 31) return false;
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && (dt.getUTCMonth() + 1) === m && dt.getUTCDate() === d;
  }

  function addDaysYmd(y, m, d, deltaDays) {
    var dt = new Date(Date.UTC(y, m - 1, d + (deltaDays || 1)));
    return String(dt.getUTCFullYear()) + pad2(dt.getUTCMonth() + 1) + pad2(dt.getUTCDate());
  }

  function fmtYmd(y, m, d) {
    return String(y) + pad2(m) + pad2(d);
  }

  function fmtIso(y, m, d) {
    return String(y) + '-' + pad2(m) + '-' + pad2(d);
  }

  /**
   * Parses verified date strings into RFC 5545 all-day DATE start/end bounds.
   * Returns null if no verified calendar date is present (zero fabricated dates).
   * Supports:
   *  - YYYY-MM-DD
   *  - YYYY-MM-DD to YYYY-MM-DD / YYYY-MM-DD – YYYY-MM-DD
   *  - 10 Dec 2026 / 12–13 Dec 2026 / Dec 12–13, 2026 / December 2, 2026 / 25/11/2026
   */
  function parseDateRange(raw) {
    var s = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!s) return null;

    // 1. ISO range: 2026-12-12 to 2026-12-13
    var isoRange = s.match(/(\d{4})-(\d{2})-(\d{2})\s*(?:to|–|—|-)\s*(\d{4})-(\d{2})-(\d{2})/i);
    if (isoRange) {
      var y1 = Number(isoRange[1]), m1 = Number(isoRange[2]), d1 = Number(isoRange[3]);
      var y2 = Number(isoRange[4]), m2 = Number(isoRange[5]), d2 = Number(isoRange[6]);
      if (isValidYmd(y1, m1, d1) && isValidYmd(y2, m2, d2)) {
        return { startYmd: fmtYmd(y1, m1, d1), endExclusiveYmd: addDaysYmd(y2, m2, d2, 1), isoStart: fmtIso(y1, m1, d1), isoEnd: fmtIso(y2, m2, d2) };
      }
    }

    // 2. Single ISO date: 2026-12-10
    var isoSingle = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (isoSingle) {
      var sy = Number(isoSingle[1]), sm = Number(isoSingle[2]), sd = Number(isoSingle[3]);
      if (isValidYmd(sy, sm, sd)) {
        return { startYmd: fmtYmd(sy, sm, sd), endExclusiveYmd: addDaysYmd(sy, sm, sd, 1), isoStart: fmtIso(sy, sm, sd), isoEnd: fmtIso(sy, sm, sd) };
      }
    }

    // 3. Day[-Day] Month Year: "12–13 Dec 2026", "10 December 2026", "2 Dec 2026"
    var dmy = s.match(/\b(\d{1,2})(?:\s*(?:to|–|—|-|&)\s*(\d{1,2}))?\s+([A-Za-z]{3,9}),?\s+(20\d{2})\b/);
    if (dmy) {
      var dayA = Number(dmy[1]);
      var dayB = dmy[2] ? Number(dmy[2]) : dayA;
      var mon = MONTHS[dmy[3].toLowerCase()];
      var yr = Number(dmy[4]);
      if (mon && isValidYmd(yr, mon, dayA) && isValidYmd(yr, mon, dayB) && dayB >= dayA) {
        return { startYmd: fmtYmd(yr, mon, dayA), endExclusiveYmd: addDaysYmd(yr, mon, dayB, 1), isoStart: fmtIso(yr, mon, dayA), isoEnd: fmtIso(yr, mon, dayB) };
      }
    }

    // 4. Month Day[-Day], Year: "Dec 12–13, 2026", "December 10, 2026"
    var mdy = s.match(/\b([A-Za-z]{3,9})\s+(\d{1,2})(?:\s*(?:to|–|—|-|&)\s*(\d{1,2}))?,?\s+(20\d{2})\b/);
    if (mdy) {
      var mon2 = MONTHS[mdy[1].toLowerCase()];
      var dA = Number(mdy[2]);
      var dB = mdy[3] ? Number(mdy[3]) : dA;
      var yr2 = Number(mdy[4]);
      if (mon2 && isValidYmd(yr2, mon2, dA) && isValidYmd(yr2, mon2, dB) && dB >= dA) {
        return { startYmd: fmtYmd(yr2, mon2, dA), endExclusiveYmd: addDaysYmd(yr2, mon2, dB, 1), isoStart: fmtIso(yr2, mon2, dA), isoEnd: fmtIso(yr2, mon2, dB) };
      }
    }

    // 5. DD/MM/YYYY or DD.MM.YYYY
    var slash = s.match(/\b(\d{1,2})[\/.](\d{1,2})[\/.](20\d{2})\b/);
    if (slash) {
      var sd3 = Number(slash[1]), sm3 = Number(slash[2]), sy3 = Number(slash[3]);
      if (isValidYmd(sy3, sm3, sd3)) {
        return { startYmd: fmtYmd(sy3, sm3, sd3), endExclusiveYmd: addDaysYmd(sy3, sm3, sd3, 1), isoStart: fmtIso(sy3, sm3, sd3), isoEnd: fmtIso(sy3, sm3, sd3) };
      }
    }

    return null;
  }

  /** RFC 5545 Section 3.3.11 TEXT escaping */
  function escapeIcsText(raw) {
    return String(raw || '')
      .replace(/\\/g, '\\\\')
      .replace(/\r\n|\r|\n/g, '\\n')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,');
  }

  function utf8ByteLen(ch) {
    var code = ch.codePointAt(0);
    if (code <= 0x7f) return 1;
    if (code <= 0x7ff) return 2;
    if (code <= 0xffff) return 3;
    return 4;
  }

  /** RFC 5545 Section 3.1 Content Line Folding at 75 octets (UTF-8 safe) */
  function foldIcsLine(line) {
    var str = String(line || '');
    var out = '';
    var curBytes = 0;
    var chars = Array.from(str);
    for (var i = 0; i < chars.length; i += 1) {
      var ch = chars[i];
      var b = utf8ByteLen(ch);
      if (curBytes + b > 75 && curBytes > 0) {
        out += '\r\n ' + ch;
        curBytes = 1 + b;
      } else {
        out += ch;
        curBytes += b;
      }
    }
    return out;
  }

  function formatUtcStamp(dateObj) {
    var d = dateObj instanceof Date ? dateObj : new Date();
    return (
      String(d.getUTCFullYear()) +
      pad2(d.getUTCMonth() + 1) +
      pad2(d.getUTCDate()) + 'T' +
      pad2(d.getUTCHours()) +
      pad2(d.getUTCMinutes()) +
      pad2(d.getUTCSeconds()) + 'Z'
    );
  }

  /**
   * Builds a valid RFC 5545 VCALENDAR string with 1..N VEVENT blocks.
   * Returns '' if no event has a verified parseable date.
   */
  function buildIcsString(eventsInput, options) {
    var list = Array.isArray(eventsInput) ? eventsInput : (eventsInput ? [eventsInput] : []);
    var opts = options || {};
    var stamp = formatUtcStamp(opts.now || new Date());
    var calName = opts.calendarName || 'Common Sense Odisha — Exam & Job Alerts';

    var validEvents = [];
    for (var i = 0; i < list.length; i += 1) {
      var ev = list[i];
      if (!ev) continue;
      var parsed = parseDateRange(ev.date || ev.startDate || ev.start_date);
      if (!parsed) continue;
      if (ev.endDate || ev.end_date) {
        var parsedEnd = parseDateRange(ev.endDate || ev.end_date);
        if (parsedEnd && parsedEnd.startYmd >= parsed.startYmd) {
          parsed.endExclusiveYmd = parsedEnd.endExclusiveYmd;
          parsed.isoEnd = parsedEnd.isoStart;
        }
      }
      validEvents.push({ ev: ev, parsed: parsed });
    }
    if (!validEvents.length) return '';

    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Common Sense Odisha//CSOdisha Alerts//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:' + escapeIcsText(calName),
      'X-WR-TIMEZONE:Asia/Kolkata'
    ];

    validEvents.forEach(function (entry, idx) {
      var ev = entry.ev;
      var p = entry.parsed;
      var summary = String(ev.summary || ev.title || 'Common Sense Odisha Reminder').trim();
      var location = String(ev.location || 'Online / Official Portal').trim() || 'Online / Official Portal';
      var pageUrl = String(ev.url || 'https://csodisha.com/').trim();
      var officialUrl = String(ev.officialUrl || ev.official_url || '').trim();
      var descParts = [];
      if (ev.description) descParts.push(String(ev.description).trim());
      if (officialUrl && officialUrl !== pageUrl) descParts.push('Official Portal / PDF: ' + officialUrl);
      descParts.push('Details on Common Sense Odisha: ' + pageUrl);
      var uidBase = slugifyFile(ev.uid || (summary + '-' + p.isoStart + '-' + idx));

      lines.push('BEGIN:VEVENT');
      lines.push('UID:' + uidBase + '@csodisha.com');
      lines.push('DTSTAMP:' + stamp);
      lines.push('DTSTART;VALUE=DATE:' + p.startYmd);
      lines.push('DTEND;VALUE=DATE:' + p.endExclusiveYmd);
      lines.push('SUMMARY:' + escapeIcsText(summary));
      lines.push('LOCATION:' + escapeIcsText(location));
      lines.push('URL:' + pageUrl);
      lines.push('DESCRIPTION:' + escapeIcsText(descParts.join('\n')));
      lines.push('STATUS:CONFIRMED');
      lines.push('TRANSP:TRANSPARENT');
      // Alarm 1: 1 day before
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push('TRIGGER:-P1D');
      lines.push('DESCRIPTION:' + escapeIcsText('Tomorrow: ' + summary));
      lines.push('END:VALARM');
      // Alarm 2: 2 hours before
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push('TRIGGER:-PT2H');
      lines.push('DESCRIPTION:' + escapeIcsText('Upcoming in 2 hours: ' + summary));
      lines.push('END:VALARM');
      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    return lines.map(foldIcsLine).join('\r\n') + '\r\n';
  }

  function triggerBlobDownload(icsText, filename) {
    if (!icsText || !doc || typeof Blob === 'undefined' || typeof URL === 'undefined') return false;
    var cleanName = slugifyFile(String(filename || 'csodisha-reminder').replace(/\.ics$/i, '')) + '.ics';
    var blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' });
    var objUrl = URL.createObjectURL(blob);
    var a = doc.createElement('a');
    a.href = objUrl;
    a.download = cleanName;
    a.rel = 'noopener';
    doc.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(objUrl); }, 1500);
    return true;
  }

  function flashSavedFeedback(btnEl, isOr) {
    if (!btnEl) return;
    var orig = btnEl.getAttribute('data-ics-orig') || btnEl.textContent;
    btnEl.setAttribute('data-ics-orig', orig);
    btnEl.textContent = isOr ? '✅ .ics ସେଭ୍ ହେଲା' : '✅ .ics Saved';
    btnEl.classList.add('is-saved');
    if (btnEl._icsTimer) clearTimeout(btnEl._icsTimer);
    btnEl._icsTimer = setTimeout(function () {
      btnEl.textContent = orig;
      btnEl.classList.remove('is-saved');
    }, 2400);
  }

  function downloadSingleEvent(event, filenameHint, btnEl, isOr) {
    var ics = buildIcsString([event]);
    if (!ics) return false;
    var parsed = parseDateRange(event.date || event.startDate || event.start_date);
    var fname = (filenameHint || event.uid || event.summary || 'cso-event') + (parsed ? ('-' + parsed.isoStart) : '');
    var ok = triggerBlobDownload(ics, fname);
    if (ok && btnEl) flashSavedFeedback(btnEl, isOr);
    return ok;
  }

  function downloadEventBundle(events, filenameHint, btnEl, isOr) {
    var ics = buildIcsString(events);
    if (!ics) return false;
    var fname = (filenameHint || 'csodisha-key-dates') + '-all-dates';
    var ok = triggerBlobDownload(ics, fname);
    if (ok && btnEl) flashSavedFeedback(btnEl, isOr);
    return ok;
  }

  function createCalendarButton(opts) {
    if (!doc) return null;
    var o = opts || {};
    var isOr = Boolean(o.isOr);
    var isBundle = Boolean(o.isBundle);
    var compact = Boolean(o.compact);
    var labelEn = o.labelEn || (isBundle ? '📅 Save All Key Dates (.ics)' : '📅 Add to Calendar (.ics)');
    var labelOr = o.labelOr || (isBundle ? '📅 ସବୁ ତାରିଖ ସେଭ୍ କରନ୍ତୁ (.ics)' : '📅 କ୍ୟାଲେଣ୍ଡରରେ ଯୋଡନ୍ତୁ (.ics)');
    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'cso-ics-btn' + (isBundle ? ' cso-ics-btn--bundle' : '') + (compact ? ' cso-ics-btn--compact' : '') + (o.extraClass ? (' ' + o.extraClass) : '');
    btn.textContent = isOr ? labelOr : labelEn;
    btn.setAttribute('data-cso-ics-btn', isBundle ? 'bundle' : 'single');
    if (o.ariaLabel) btn.setAttribute('aria-label', o.ariaLabel);
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (isBundle && Array.isArray(o.events)) {
        downloadEventBundle(o.events, o.filename, btn, isOr);
      } else if (o.event) {
        downloadSingleEvent(o.event, o.filename, btn, isOr);
      }
    });
    return btn;
  }

  /** Extracts verified milestones from a Job Article record (zero fabricated dates). */
  function extractEventsFromJobArticle(article, originUrl) {
    if (!article) return [];
    var origin = originUrl || (win && win.location && win.location.origin) || 'https://csodisha.com';
    var slug = String(article.slug || article.id || 'job-notice');
    var pageUrl = origin + '/jobs/' + encodeURIComponent(slug);
    var officialUrl = article.official_apply_url || article.notification_pdf_url || article.official_website_url || '';
    var loc = (article.location_district && !/^all\s+odisha$/i.test(article.location_district))
      ? (article.location_district + ', Odisha')
      : 'Odisha / Official Portal';
    var baseTitle = String(article.title_en || 'CSOdisha Notification').trim();
    var events = [];
    var seen = {};

    function addIfValid(label, rawDate, note) {
      var p = parseDateRange(rawDate);
      if (!p) return;
      var dedupeKey = p.startYmd + '|' + label.toLowerCase().slice(0, 32);
      if (seen[dedupeKey]) return;
      seen[dedupeKey] = true;
      events.push({
        uid: slug + '-' + label + '-' + p.isoStart,
        summary: baseTitle + ' — ' + label,
        date: rawDate,
        location: loc,
        url: pageUrl,
        officialUrl: officialUrl,
        description: (note ? (note + ' · ') : '') + (article.organisation_en ? ('Authority: ' + article.organisation_en) : '')
      });
    }

    if (Array.isArray(article.important_dates)) {
      article.important_dates.forEach(function (row) {
        if (!row) return;
        addIfValid(String(row.event || row.milestone || 'Key Date').trim(), row.date, row.note || '');
      });
    }

    var stage = String(article.lifecycle_stage || '').toLowerCase();
    if (article.application_start_date) addIfValid('Application Opens', article.application_start_date, 'Online application starts');
    if (article.exam_date) addIfValid('Exam / Walk-in Date', article.exam_date, 'Official examination / interview schedule');
    if (article.last_date) {
      var lastLbl = stage === 'result'
        ? 'OMR / Certificate Window Deadline'
        : (/walk-?in/i.test(baseTitle) ? 'Walk-in Interview Date' : 'Last Date to Apply');
      addIfValid(lastLbl, article.last_date, 'Verified deadline on Common Sense Odisha');
    }

    return events;
  }

  /**
   * Auto-enhances /guides/<slug> SSR detail pages:
   * Scans structured schedule tables for verified dates, mounts per-row
   * `📅 Add to Calendar (.ics)` buttons and a header `📅 Save All Key Dates (.ics)` button.
   */
  function enhanceGuideDetailPage() {
    if (!doc || !doc.body || !doc.body.classList.contains('cso-guide-reader-page')) return;
    var articleEl = doc.querySelector('.gp-article-body');
    if (!articleEl) return;

    var isOr = doc.body.getAttribute('data-guide-lang') === 'or';
    var titleEl = doc.querySelector('.gp-article-title .gp-lang-en') || doc.querySelector('.gp-article-title');
    var titleEn = titleEl ? String(titleEl.textContent || '').trim() : doc.title;
    var pageUrl = (win && win.location && win.location.href) || 'https://csodisha.com/guides/';
    var slugMatch = pageUrl.match(/\/guides\/([^/?#]+)/);
    var slug = slugMatch ? decodeURIComponent(slugMatch[1]) : slugifyFile(titleEn);

    var officialLinkEl = doc.querySelector('.gp-links-list a[href^="http"]');
    var officialUrl = officialLinkEl ? officialLinkEl.getAttribute('href') : '';

    var allEvents = [];
    var seen = {};
    var tables = articleEl.querySelectorAll('.gp-lang-en table, .gp-lang-or table');

    tables.forEach(function (tbl) {
      var isOrTbl = Boolean(tbl.closest && tbl.closest('.gp-lang-or'));
      var rows = tbl.querySelectorAll('tbody tr');
      rows.forEach(function (tr) {
        var cells = tr.querySelectorAll('td');
        if (cells.length < 2) return;
        var labelText = String(cells[0].textContent || '').trim();
        var dateCell = null;
        var parsed = null;
        for (var ci = 1; ci < cells.length; ci += 1) {
          var cand = parseDateRange(cells[ci].textContent);
          if (cand) {
            dateCell = cells[ci];
            parsed = cand;
            break;
          }
        }
        if (!dateCell || !parsed || !labelText) return;
        if (dateCell.querySelector('[data-cso-ics-btn]')) return;

        var evObj = {
          uid: slug + '-' + labelText + '-' + parsed.isoStart,
          summary: titleEn + ' — ' + labelText,
          date: dateCell.textContent.trim(),
          location: 'Online / Official Portal',
          url: pageUrl,
          officialUrl: officialUrl,
          description: labelText + ': ' + dateCell.textContent.trim()
        };

        if (!isOrTbl) {
          var key = parsed.startYmd + '|' + labelText.toLowerCase().slice(0, 32);
          if (!seen[key]) {
            seen[key] = true;
            allEvents.push(evObj);
          }
        }

        var rowBtn = createCalendarButton({
          event: evObj,
          filename: slug + '-' + labelText,
          isOr: isOrTbl,
          compact: true,
          ariaLabel: 'Add ' + labelText + ' to calendar (.ics)'
        });
        if (rowBtn) {
          var holder = doc.createElement('div');
          holder.className = 'cso-ics-cell-wrap';
          holder.appendChild(rowBtn);
          dateCell.appendChild(holder);
        }
      });
    });

    if (allEvents.length) {
      var headerMeta = doc.querySelector('.gp-article-head .gp-share-bar') || doc.querySelector('.gp-article-head');
      if (headerMeta && !doc.querySelector('[data-cso-ics-guide-bar]')) {
        var bar = doc.createElement('div');
        bar.className = 'cso-ics-guide-bar';
        bar.setAttribute('data-cso-ics-guide-bar', '1');
        var bundleBtn = createCalendarButton({
          isBundle: allEvents.length > 1,
          events: allEvents,
          event: allEvents[0],
          filename: slug,
          isOr: isOr,
          labelEn: allEvents.length > 1 ? ('📅 Save All ' + allEvents.length + ' Key Dates (.ics)') : '📅 Add Key Date to Calendar (.ics)',
          labelOr: allEvents.length > 1 ? ('📅 ସବୁ ' + allEvents.length + ' ମୁଖ୍ୟ ତାରିଖ ସେଭ୍ କରନ୍ତୁ (.ics)') : '📅 କ୍ୟାଲେଣ୍ଡରରେ ଯୋଡନ୍ତୁ (.ics)'
        });
        if (bundleBtn) bar.appendChild(bundleBtn);
        headerMeta.parentNode.insertBefore(bar, headerMeta.nextSibling);
      }
    }
  }

  if (doc) {
    if (doc.readyState === 'loading') {
      doc.addEventListener('DOMContentLoaded', enhanceGuideDetailPage);
    } else {
      enhanceGuideDetailPage();
    }
  }

  return {
    version: 'v389',
    escapeIcsText: escapeIcsText,
    foldIcsLine: foldIcsLine,
    parseDateRange: parseDateRange,
    buildIcsString: buildIcsString,
    downloadSingleEvent: downloadSingleEvent,
    downloadEventBundle: downloadEventBundle,
    createCalendarButton: createCalendarButton,
    extractEventsFromJobArticle: extractEventsFromJobArticle,
    enhanceGuideDetailPage: enhanceGuideDetailPage
  };
});
