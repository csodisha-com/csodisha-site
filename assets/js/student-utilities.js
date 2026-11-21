/* v163: Odisha Student Utilities — Age Calculator, "Am I Eligible?" Live Badge Engine,
   WhatsApp-Ready Share Formatter, and RFC 5545 .ics Calendar Reminder Generator.
   100% CSP-compliant: DOM APIs only, addEventListener handlers, zero innerHTML / inline styles. */
(function (root) {
  'use strict';

  var PROFILE_KEY = 'cso_eligibility_profile';

  var ODISHA_DISTRICTS = [
    'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh',
    'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur',
    'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Keonjhar',
    'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh',
    'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'
  ];

  var CATEGORY_RELAXATION = {
    'UR': 0,
    'SEBC': 5,
    'SC': 5,
    'ST': 5,
    'SC / ST': 5,
    'Women': 5,
    'PwD': 10,
    'Ex-Serviceman': 5
  };

  var QUAL_RANK = {
    '10th': 1,
    '+2': 2,
    'Diploma/ITI': 2.5,
    'Graduate': 3,
    'B.Ed': 3.5,
    'PG': 4
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  /* ---------- 1. Odisha Age Relaxation & Cut-Off Calculator ---------- */
  function parseIsoDateParts(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim());
    if (!m) return null;
    var y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return { y: y, mo: mo, d: d };
  }

  function calculateOdishaAge(opts) {
    var dob = parseIsoDateParts(opts && opts.dob);
    var cutoff = parseIsoDateParts(opts && opts.cutoff);
    var maxAge = Number(opts && opts.maxAge);
    var category = String((opts && opts.category) || 'UR');
    if (!dob || !cutoff || !Number.isFinite(maxAge) || maxAge <= 0) {
      return { valid: false, error: 'Enter a valid Date of Birth, Cut-Off Date, and Post Max Age.' };
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
      var prevMonthDays = new Date(Date.UTC(cutoff.y, cutoff.mo - 1, 0)).getUTCDate();
      days += prevMonthDays;
      months -= 1;
    }
    if (months < 0) {
      months += 12;
      years -= 1;
    }

    var relaxation = Object.prototype.hasOwnProperty.call(CATEGORY_RELAXATION, category)
      ? CATEGORY_RELAXATION[category]
      : 0;
    var effectiveMaxAge = maxAge + relaxation;
    var overAge = years > effectiveMaxAge || (years === effectiveMaxAge && (months > 0 || days > 0));
    return {
      valid: true,
      years: years,
      months: months,
      days: days,
      category: category,
      baseMaxAge: maxAge,
      relaxation: relaxation,
      effectiveMaxAge: effectiveMaxAge,
      eligible: !overAge,
      statusLabel: overAge ? 'Over Age' : 'Eligible'
    };
  }

  /* ---------- 2. WhatsApp-Ready Share Formatter ---------- */
  function formatWhatsAppShare(info) {
    var title = String((info && info.title) || 'Odisha Recruitment Notice').trim();
    var org = String((info && info.organisation) || '').trim();
    var qual = String((info && info.qualification) || '').trim();
    var deadline = String((info && info.lastDate) || '').trim();
    var url = String((info && info.url) || '').trim();
    var lines = ['📌 ' + title];
    if (org) lines.push('🏛️ ' + org);
    if (qual) lines.push('🎓 ' + qual);
    if (deadline) lines.push('📅 Last Date: ' + deadline);
    if (url) lines.push('🔗 ' + url);
    return lines.join('\n');
  }

  function showToast(message) {
    if (typeof document === 'undefined' || !document.body) return;
    var toast = document.getElementById('cso-live-toast');
    if (!toast) {
      toast = el('div', 'cso-live-toast');
      toast.id = 'cso-live-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toast._csoTimer);
    toast._csoTimer = setTimeout(function () { toast.classList.remove('is-visible'); }, 2600);
  }

  async function copyPlainText(text) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (_) { /* fallback below */ }
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.className = 'cso-offscreen-copy';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (_) {
      return false;
    }
  }

  async function shareWhatsAppFormatted(info) {
    var formatted = formatWhatsAppShare(info);
    var title = String((info && info.title) || 'Job Notification');
    var url = String((info && info.url) || '');
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: title, text: formatted, url: url || undefined });
        return { shared: true, method: 'native' };
      } catch (err) {
        if (err && err.name === 'AbortError') return { shared: false, method: 'aborted' };
      }
    }
    var ok = await copyPlainText(formatted);
    showToast(ok ? 'Copied for WhatsApp!' : 'Copy link: ' + url);
    return { shared: ok, method: 'clipboard' };
  }

  /* ---------- 3. RFC 5545 .ics Calendar Reminder Generator ---------- */
  function escapeIcsText(str) {
    return String(str || '')
      .replace(/\\/g, '\\\\')
      .replace(/\r?\n/g, '\\n')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,');
  }

  function formatIcsDateCompact(y, mo, d) {
    return String(y).padStart(4, '0') + String(mo).padStart(2, '0') + String(d).padStart(2, '0');
  }

  function buildJobIcs(info) {
    var title = String((info && info.title) || 'Odisha Recruitment Deadline').trim();
    var org = String((info && info.organisation) || 'Common Sense Odisha').trim();
    var url = String((info && info.url) || 'https://csodisha.com/jobs-careers/').trim();
    var slug = String((info && info.slug) || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48) || 'job';
    var parts = parseIsoDateParts(info && info.lastDate);
    if (!parts) return null;

    var startStr = formatIcsDateCompact(parts.y, parts.mo, parts.d);
    var nextDay = new Date(Date.UTC(parts.y, parts.mo - 1, parts.d + 1));
    var endStr = formatIcsDateCompact(nextDay.getUTCFullYear(), nextDay.getUTCMonth() + 1, nextDay.getUTCDate());
    var now = new Date();
    var stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    var summary = 'Last Date: ' + title;
    var desc = 'Application deadline for ' + title + ' (' + org + '). Official details: ' + url;

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Common Sense Odisha//Job Reminder//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:' + slug + '-' + startStr + '@csodisha.com',
      'DTSTAMP:' + stamp,
      'DTSTART;VALUE=DATE:' + startStr,
      'DTEND;VALUE=DATE:' + endStr,
      'SUMMARY:' + escapeIcsText(summary),
      'DESCRIPTION:' + escapeIcsText(desc),
      'URL:' + url,
      'BEGIN:VALARM',
      'TRIGGER:-P1D',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + escapeIcsText('1 day left to apply: ' + title),
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
      ''
    ].join('\r\n');
  }

  function downloadJobIcs(info) {
    var ics = buildJobIcs(info);
    if (!ics) {
      showToast('No deadline date available for this notice.');
      return false;
    }
    try {
      var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
      var blobUrl = URL.createObjectURL(blob);
      var a = document.createElement('a');
      var slug = String((info && info.slug) || 'cso-deadline').replace(/[^a-z0-9-]+/gi, '-').toLowerCase().slice(0, 48);
      a.href = blobUrl;
      a.download = slug + '-deadline.ics';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(blobUrl); }, 1500);
      showToast('Calendar reminder (.ics) downloaded!');
      return true;
    } catch (_) {
      showToast('Unable to download calendar file.');
      return false;
    }
  }

  /* ---------- 4. "Am I Eligible?" Live Badge Engine ---------- */
  function loadProfile() {
    try {
      var raw = localStorage.getItem(PROFILE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      if (!parsed.age && !parsed.qualification && !parsed.category && !parsed.district) return null;
      return parsed;
    } catch (_) {
      return null;
    }
  }

  function saveProfile(profile) {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    } catch (_) {}
  }

  function clearProfile() {
    try {
      localStorage.removeItem(PROFILE_KEY);
    } catch (_) {}
  }

  function detectRequiredQualRank(text) {
    var t = String(text || '').toLowerCase();
    if (/\b(post[\s-]?graduate|master'?s|m\.?sc|m\.?a\b|m\.?tech|mba|phd|pg\b)/.test(t)) return 4;
    if (/\b(b\.?\s?ed|otet|osstet|teacher\s+training)\b/.test(t)) return 3.5;
    if (/\b(graduate|graduation|bachelor|degree|b\.?tech|b\.?sc|b\.?a\b|b\.?com|mbbs)\b/.test(t)) return 3;
    if (/\b(diploma|iti\b|polytechnic|gnm|anm|nursing)\b/.test(t)) return 2.5;
    if (/\b(\+2|12th|higher\s+secondary|intermediate|chse|hsc\s*\+2)\b/.test(t)) return 2;
    if (/\b(10th|matric|matriculation|hsc)\b/.test(t)) return 1;
    return 0;
  }

  function detectMaxAge(text) {
    var t = String(text || '').toLowerCase();
    var m = /(?:max(?:imum)?|upper)\s+age[^0-9]{0,12}(\d{2})/.exec(t) ||
            /\b(?:18|20|21)\s*(?:-|to|–)\s*(\d{2})\s*(?:years|yrs)\b/.exec(t);
    if (!m) return null;
    var n = Number(m[1]);
    return (n >= 22 && n <= 65) ? n : null;
  }

  function evaluateCardEligibility(cardText, profile) {
    if (!profile) return [];
    var badges = [];
    var text = String(cardText || '');
    var lower = text.toLowerCase();
    var hasIssue = false;

    if (profile.qualification && Object.prototype.hasOwnProperty.call(QUAL_RANK, profile.qualification)) {
      var userRank = QUAL_RANK[profile.qualification];
      var reqRank = detectRequiredQualRank(lower);
      if (reqRank > 0 && userRank < reqRank) {
        badges.push({ label: 'Check Qualification', tone: 'warn' });
        hasIssue = true;
      }
    }

    var ageNum = Number(profile.age);
    if (Number.isFinite(ageNum) && ageNum >= 14 && ageNum <= 80) {
      var detectedMax = detectMaxAge(lower);
      var relax = CATEGORY_RELAXATION[profile.category || 'UR'] || 0;
      var effectiveMax = (detectedMax || 38) + relax;
      if (ageNum < 18 || ageNum > effectiveMax) {
        badges.push({ label: 'Check Age', tone: 'warn' });
        hasIssue = true;
      }
    }

    if (!hasIssue && (profile.age || profile.qualification || profile.category)) {
      badges.push({ label: '✓ Eligible', tone: 'ok' });
    }

    if (profile.district) {
      var distLower = String(profile.district).toLowerCase();
      if (lower.indexOf(distLower) !== -1) {
        badges.push({ label: '📍 District Match', tone: 'match' });
      }
    }

    return badges;
  }

  function stampCardElement(card, profile) {
    var existing = card.querySelector('.cso-elig-badges');
    if (existing) existing.remove();
    if (!profile) return;
    var badges = evaluateCardEligibility(card.textContent || '', profile);
    if (!badges.length) return;

    var wrap = el('div', 'cso-elig-badges');
    wrap.setAttribute('aria-label', 'Personalised eligibility match');
    badges.forEach(function (b) {
      wrap.appendChild(el('span', 'cso-elig-badge cso-elig-badge--' + b.tone, b.label));
    });

    var anchor = card.querySelector('.live-job-card__badges') || card.querySelector('.cso-schemes-item-meta');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(wrap, anchor.nextSibling);
    } else {
      card.insertBefore(wrap, card.firstChild);
    }
  }

  function stampAllCards(profile) {
    var cards = document.querySelectorAll('.live-job-card, .cso-schemes-item-card');
    cards.forEach(function (card) { stampCardElement(card, profile); });
  }

  function buildOption(value, label) {
    var o = document.createElement('option');
    o.value = value;
    o.textContent = label;
    return o;
  }

  function mountEligibilityDrawer() {
    var host = document.getElementById('live-jobs-section') || document.getElementById('schemes-items-grid');
    if (!host || document.getElementById('cso-elig-drawer')) return;

    var profile = loadProfile();
    var details = el('details', 'cso-elig-drawer');
    details.id = 'cso-elig-drawer';

    var summary = el('summary', 'cso-elig-drawer__summary');
    summary.appendChild(el('span', 'cso-elig-drawer__title', '🎯 Am I Eligible? Quick Profile'));
    var pill = el('span', 'cso-elig-drawer__status', profile ? 'Profile Active' : 'Set 4 fields for live badges');
    pill.id = 'cso-elig-status';
    summary.appendChild(pill);
    details.appendChild(summary);

    var form = el('form', 'cso-elig-form');
    form.id = 'cso-elig-form';
    form.setAttribute('aria-label', 'Quick eligibility profile');

    var ageWrap = el('label', 'cso-elig-field');
    ageWrap.appendChild(el('span', '', 'Age'));
    var ageInput = document.createElement('input');
    ageInput.type = 'number';
    ageInput.id = 'cso-elig-age';
    ageInput.min = '14';
    ageInput.max = '80';
    ageInput.placeholder = 'e.g. 25';
    ageInput.value = profile && profile.age ? String(profile.age) : '';
    ageWrap.appendChild(ageInput);

    var qualWrap = el('label', 'cso-elig-field');
    qualWrap.appendChild(el('span', '', 'Qualification'));
    var qualSel = document.createElement('select');
    qualSel.id = 'cso-elig-qual';
    qualSel.appendChild(buildOption('', 'Any Qualification'));
    ['10th', '+2', 'Graduate', 'B.Ed', 'PG', 'Diploma/ITI'].forEach(function (q) {
      qualSel.appendChild(buildOption(q, q));
    });
    if (profile && profile.qualification) qualSel.value = profile.qualification;
    qualWrap.appendChild(qualSel);

    var catWrap = el('label', 'cso-elig-field');
    catWrap.appendChild(el('span', '', 'Category'));
    var catSel = document.createElement('select');
    catSel.id = 'cso-elig-cat';
    ['UR', 'SEBC', 'SC', 'ST', 'PwD', 'Women'].forEach(function (c) {
      catSel.appendChild(buildOption(c, c));
    });
    if (profile && profile.category) catSel.value = profile.category;
    catWrap.appendChild(catSel);

    var distWrap = el('label', 'cso-elig-field');
    distWrap.appendChild(el('span', '', 'Home District'));
    var distSel = document.createElement('select');
    distSel.id = 'cso-elig-dist';
    distSel.appendChild(buildOption('', 'All 30 Odisha Districts'));
    ODISHA_DISTRICTS.forEach(function (d) { distSel.appendChild(buildOption(d, d)); });
    if (profile && profile.district) distSel.value = profile.district;
    distWrap.appendChild(distSel);

    var actions = el('div', 'cso-elig-actions');
    var saveBtn = el('button', 'live-btn live-btn--primary', 'Save & Match');
    saveBtn.type = 'submit';
    saveBtn.id = 'cso-elig-save';
    var clearBtn = el('button', 'live-btn', 'Clear Profile');
    clearBtn.type = 'button';
    clearBtn.id = 'cso-elig-clear';
    clearBtn.hidden = !profile;
    var toolsLink = el('a', 'live-btn', 'Age & Photo Toolkit ↗');
    toolsLink.href = '/tools/';
    actions.append(saveBtn, clearBtn, toolsLink);

    form.append(ageWrap, qualWrap, catWrap, distWrap, actions);
    details.appendChild(form);

    if (host.id === 'schemes-items-grid' && host.parentNode) {
      host.parentNode.insertBefore(details, host);
    } else if (host.parentNode) {
      host.parentNode.insertBefore(details, host);
    }

    function updateStatusText(p) {
      if (!p) {
        pill.textContent = 'Set 4 fields for live badges';
        clearBtn.hidden = true;
        return;
      }
      var parts = [];
      if (p.age) parts.push(p.age + ' yrs');
      if (p.qualification) parts.push(p.qualification);
      if (p.category) parts.push(p.category);
      if (p.district) parts.push(p.district);
      pill.textContent = parts.length ? parts.join(' · ') : 'Profile Active';
      clearBtn.hidden = false;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var next = {
        age: ageInput.value.trim(),
        qualification: qualSel.value,
        category: catSel.value,
        district: distSel.value
      };
      if (!next.age && !next.qualification && !next.district && next.category === 'UR') {
        clearProfile();
        profile = null;
      } else {
        saveProfile(next);
        profile = next;
      }
      updateStatusText(profile);
      stampAllCards(profile);
      showToast(profile ? 'Eligibility badges updated!' : 'Eligibility profile cleared.');
    });

    clearBtn.addEventListener('click', function () {
      clearProfile();
      profile = null;
      ageInput.value = '';
      qualSel.value = '';
      catSel.value = 'UR';
      distSel.value = '';
      updateStatusText(null);
      stampAllCards(null);
      showToast('Eligibility profile cleared.');
    });

    updateStatusText(profile);
    if (profile) stampAllCards(profile);

    var grids = ['live-jobs-grid', 'hub-grid', 'schemes-items-grid']
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);
    if (typeof MutationObserver === 'function') {
      var obs = new MutationObserver(function () {
        var current = loadProfile();
        if (current) stampAllCards(current);
      });
      grids.forEach(function (g) { obs.observe(g, { childList: true }); });
    }
  }

  var api = {
    PROFILE_KEY: PROFILE_KEY,
    ODISHA_DISTRICTS: ODISHA_DISTRICTS,
    CATEGORY_RELAXATION: CATEGORY_RELAXATION,
    calculateOdishaAge: calculateOdishaAge,
    formatWhatsAppShare: formatWhatsAppShare,
    shareWhatsAppFormatted: shareWhatsAppFormatted,
    buildJobIcs: buildJobIcs,
    downloadJobIcs: downloadJobIcs,
    evaluateCardEligibility: evaluateCardEligibility,
    loadProfile: loadProfile,
    saveProfile: saveProfile,
    clearProfile: clearProfile,
    stampAllCards: stampAllCards,
    showToast: showToast
  };

  root.CSOStudentUtils = api;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountEligibilityDrawer);
    } else {
      mountEligibilityDrawer();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);
