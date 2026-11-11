/**
 * Common Sense Odisha (CSO) — Exam Countdown Engine (pure, testable)
 *
 * Pure date math + formatting + urgency classification for the dashboard
 * countdown widget grid. No DOM, no storage — everything is exported for
 * Node-based verification and attached to window.CSOCountdown in browsers.
 */
(function(root, factory) {
  'use strict';

  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CSOCountdown = factory();
  }
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const DAY_MS = 86400000;
  const HOUR_MS = 3600000;
  const MINUTE_MS = 60000;

  /**
   * Parse a countdown target into a Date (or null when unusable).
   * Accepts 'YYYY-MM-DD' (treated as end-of-day local so the deadline day
   * itself still counts), full ISO timestamps, and Date instances.
   */
  function parseTarget(value) {
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === 'number' && isFinite(value)) {
      return new Date(value);
    }
    const raw = String(value || '').trim();
    if (!raw) return null;

    // Date-only target: the deadline applies through the end of that day.
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y, m, d] = raw.split('-').map(Number);
      if (m < 1 || m > 12 || d < 1 || d > 31) return null;
      return new Date(y, m - 1, d, 23, 59, 59, 999);
    }

    const parsed = new Date(raw);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  /**
   * Compute the live countdown between `now` and `target`.
   * Returns { days, hours, minutes, seconds, isPast, isToday, urgency,
   *           urgencyClass, label, totalMs }.
   * urgency:
   *   'concluded' — deadline is past
   *   'critical'  — today or < 7 days remaining (red pulsing)
   *   'warning'   — 7–30 days remaining (amber)
   *   'normal'    — > 30 days remaining
   */
  function computeCountdown(target, now) {
    const targetDate = parseTarget(target);
    if (!targetDate) return null;

    const nowDate = now instanceof Date ? now : new Date(now || Date.now());
    if (isNaN(nowDate.getTime())) return null;

    const totalMs = targetDate.getTime() - nowDate.getTime();
    const isPast = totalMs <= 0;

    // 'Today' means the deadline's calendar day contains `now`.
    const today = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate());
    const deadlineDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const isToday = deadlineDay.getTime() === today.getTime();

    const clamped = Math.max(0, totalMs);
    const days = Math.floor(clamped / DAY_MS);
    const hours = Math.floor((clamped % DAY_MS) / HOUR_MS);
    const minutes = Math.floor((clamped % HOUR_MS) / MINUTE_MS);
    const seconds = Math.floor((clamped % MINUTE_MS) / 1000);

    let urgency;
    if (isPast) {
      urgency = 'concluded';
    } else if (isToday || days < 7) {
      urgency = 'critical';
    } else if (days <= 30) {
      urgency = 'warning';
    } else {
      urgency = 'normal';
    }

    let label;
    if (urgency === 'concluded') {
      label = 'Exam Concluded / Application Closed';
    } else if (urgency === 'critical' && isToday) {
      label = 'Today — Final Day!';
    } else if (urgency === 'critical') {
      label = 'Closing Soon';
    } else {
      label = 'Application Open';
    }

    return {
      days,
      hours,
      minutes,
      seconds,
      isPast,
      isToday,
      urgency,
      urgencyClass: 'cd-' + urgency,
      label,
      totalMs
    };
  }

  /**
   * Sort countdown cards: live (future) first ordered by soonest deadline,
   * concluded cards last. Items without a usable target go to the very end.
   */
  function sortCountdowns(cards, now) {
    const nowDate = now instanceof Date ? new Date(now.getTime()) : new Date(now || Date.now());
    const decorated = (cards || []).map(card => {
      const target = parseTarget(card && card.target);
      return { card, target };
    });

    decorated.sort((a, b) => {
      if (!a.target && !b.target) return 0;
      if (!a.target) return 1;
      if (!b.target) return -1;
      const aPast = a.target.getTime() <= nowDate.getTime();
      const bPast = b.target.getTime() <= nowDate.getTime();
      if (aPast !== bPast) return aPast ? 1 : -1; // future first, concluded last
      return a.target.getTime() - b.target.getTime();
    });

    return decorated.map(d => d.card);
  }

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /**
   * Human-friendly target date: '29 Nov 2026'. Full ISO timestamps keep
   * their time component: '29 Nov 2026, 5:00 PM'.
   */
  function formatTargetDate(value) {
    const date = parseTarget(value);
    if (!date) return '';
    const base = `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
    if (isDateOnly) return base;

    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const meridiem = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${base}, ${hours}:${minutes} ${meridiem}`;
  }

  return {
    DAY_MS,
    parseTarget,
    computeCountdown,
    sortCountdowns,
    formatTargetDate
  };
});
