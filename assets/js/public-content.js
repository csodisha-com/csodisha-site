/**
 * Common Sense Odisha (CSO) — Public Content Utilities (Strict CSP-Compliant)
 * Safe DOM builders, DOMParser-based allowlist HTML renderer, date helpers,
 * theme sync, and live broadcast banner mount. Zero inline styles or innerHTML sinks.
 */
(function (window) {
  'use strict';

  const THEMES = ['light', 'dark', 'system', 'reading', 'sepia'];

  function syncTheme() {
    let settings = {};
    try {
      settings = JSON.parse(localStorage.getItem('cso') || '{}') || {};
    } catch (_) {
      settings = {};
    }
    const theme = THEMES.includes(settings.theme) ? settings.theme : 'system';
    if (document.documentElement) {
      document.documentElement.setAttribute('data-theme', theme);
      if (settings.lang) document.documentElement.lang = settings.lang;
    }
  }

  syncTheme();
  window.addEventListener('storage', function (event) {
    if (event.key === 'cso') syncTheme();
  });
  window.addEventListener('pageshow', syncTheme);

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function safeHref(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const u = raw.trim();
    if (!u) return null;
    if (u.startsWith('/') && !u.startsWith('//') && !u.includes('\\')) return u;
    try {
      const parsed = new URL(u);
      if (parsed.protocol === 'https:' || parsed.protocol === 'http:' || parsed.protocol === 'mailto:') {
        return parsed.href;
      }
    } catch (_) {}
    return null;
  }

  function safeMediaSrc(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const u = raw.trim();
    return /^\/api\/media\/[A-Za-z0-9._-]+$/.test(u) ? u : null;
  }

  const ALLOWED_TAGS = new Set([
    'P', 'H2', 'H3', 'H4', 'H5', 'UL', 'OL', 'LI',
    'BLOCKQUOTE', 'PRE', 'CODE', 'STRONG', 'EM', 'BR', 'HR', 'A', 'IMG'
  ]);
  const DROP_TAGS = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'SVG', 'MATH', 'FORM', 'INPUT', 'BUTTON', 'TEXTAREA']);

  function sanitizeDomNode(srcNode) {
    if (!srcNode) return null;
    if (srcNode.nodeType === 3) {
      return document.createTextNode(srcNode.nodeValue || '');
    }
    if (srcNode.nodeType !== 1) return null;

    const tag = srcNode.tagName.toUpperCase();
    if (DROP_TAGS.has(tag)) return null;

    if (!ALLOWED_TAGS.has(tag)) {
      const frag = document.createDocumentFragment();
      Array.from(srcNode.childNodes).forEach(child => {
        const clean = sanitizeDomNode(child);
        if (clean) frag.appendChild(clean);
      });
      return frag;
    }

    if (tag === 'BR' || tag === 'HR') {
      return document.createElement(tag.toLowerCase());
    }

    if (tag === 'IMG') {
      const src = safeMediaSrc(srcNode.getAttribute('src'));
      if (!src) return null;
      const img = document.createElement('img');
      img.setAttribute('src', src);
      img.setAttribute('alt', srcNode.getAttribute('alt') || '');
      img.setAttribute('loading', 'lazy');
      img.className = 'cso-content-img';
      return img;
    }

    if (tag === 'A') {
      const href = safeHref(srcNode.getAttribute('href'));
      if (!href) {
        const span = document.createElement('span');
        Array.from(srcNode.childNodes).forEach(child => {
          const clean = sanitizeDomNode(child);
          if (clean) span.appendChild(clean);
        });
        return span;
      }
      const a = document.createElement('a');
      a.setAttribute('href', href);
      a.setAttribute('rel', 'noopener noreferrer nofollow');
      a.setAttribute('target', '_blank');
      Array.from(srcNode.childNodes).forEach(child => {
        const clean = sanitizeDomNode(child);
        if (clean) a.appendChild(clean);
      });
      return a;
    }

    const out = document.createElement(tag.toLowerCase());
    Array.from(srcNode.childNodes).forEach(child => {
      const clean = sanitizeDomNode(child);
      if (clean) out.appendChild(clean);
    });
    return out;
  }

  function renderSanitizedHtml(container, htmlString) {
    if (!container) return;
    container.replaceChildren();
    const raw = String(htmlString || '').trim();
    if (!raw) return;

    if (typeof DOMParser !== 'undefined') {
      const doc = new DOMParser().parseFromString(raw, 'text/html');
      const frag = document.createDocumentFragment();
      Array.from(doc.body.childNodes).forEach(node => {
        const clean = sanitizeDomNode(node);
        if (clean) frag.appendChild(clean);
      });
      container.appendChild(frag);
    } else {
      const p = el('p', '', raw.replace(/<[^>]*>/g, ''));
      container.appendChild(p);
    }
  }

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function formatDate(iso) {
    if (!iso) return '';
    const s = String(iso).trim();
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) {
      const y = Number(m[1]);
      const mo = Number(m[2]) - 1;
      const d = Number(m[3]);
      if (mo >= 0 && mo < 12) return `${d} ${MONTHS[mo]} ${y}`;
    }
    const dt = new Date(s);
    if (Number.isNaN(dt.getTime())) return s;
    return `${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
  }

  function deadlineInfo(isoDate) {
    if (!isoDate) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate).trim());
    if (!m) return { label: formatDate(isoDate), statusClass: 'cso-dl-normal', isClosed: false };
    const target = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 23, 59, 59, 999);
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    const formatted = formatDate(isoDate);
    if (diffMs < 0) {
      return { label: `Application Closed (${formatted})`, statusClass: 'cso-dl-closed', isClosed: true };
    }
    const days = Math.floor(diffMs / 86400000);
    if (days === 0) {
      return { label: `Closes Today (${formatted})`, statusClass: 'cso-dl-urgent', isClosed: false };
    }
    if (days <= 7) {
      return { label: `Closes in ${days}d (${formatted})`, statusClass: 'cso-dl-urgent', isClosed: false };
    }
    return { label: `Last Date: ${formatted}`, statusClass: 'cso-dl-open', isClosed: false };
  }

  function createBookmarkButton(opts) {
    const btn = el('button', 'cso-bookmark-btn');
    btn.type = 'button';
    btn.dataset.bookmarkType = opts.type || 'study';
    btn.dataset.bookmarkId = String(opts.id || '');
    btn.dataset.bookmarkTitle = String(opts.title || '');
    btn.dataset.bookmarkBadge = String(opts.badge || '');
    btn.dataset.bookmarkUrl = String(opts.url || window.location.href);
    if (opts.pdfUrl) btn.dataset.bookmarkPdf = String(opts.pdfUrl);
    if (opts.deadline) btn.dataset.bookmarkDeadline = String(opts.deadline);
    btn.title = 'Save to your Student Dashboard';
    const star = el('span', 'cso-bm-star', '☆');
    star.setAttribute('aria-hidden', 'true');
    const txt = el('span', 'cso-bm-text', 'Bookmark');
    btn.append(star, ' ', txt);
    return btn;
  }

  function renderLiveBanner(data) {
    const mount = document.getElementById('csoPublicAnnouncementMount');
    if (!mount) return;
    mount.replaceChildren();
    if (!data || !data.active || !data.headline) return;
    const key = 'cso_dismissed_announcement_' + (data.updatedAt || data.headline);
    try {
      if (sessionStorage.getItem(key)) return;
    } catch (_) {}

    const sev = ['info', 'notice', 'urgent'].includes(data.severity) ? data.severity : 'info';
    const bar = el('div', `cso-live-banner cso-live-banner--${sev}`);
    bar.id = 'csoLiveBanner';
    bar.setAttribute('role', 'status');

    const left = el('div', 'cso-live-banner__left');
    left.appendChild(el('span', 'cso-live-banner__tag', sev === 'urgent' ? 'URGENT' : 'NOTICE'));
    left.appendChild(el('strong', 'cso-live-banner__headline', data.headline));
    if (data.context) {
      left.appendChild(el('span', 'cso-live-banner__sub', data.context));
    }
    if (data.ctaText && data.ctaUrl) {
      const href = safeHref(data.ctaUrl);
      if (href) {
        const cta = el('a', 'cso-live-banner__cta', `${data.ctaText} →`);
        cta.setAttribute('href', href);
        left.appendChild(cta);
      }
    }

    const close = el('button', 'cso-live-banner__close', '×');
    close.type = 'button';
    close.setAttribute('title', 'Dismiss');
    close.setAttribute('aria-label', 'Dismiss announcement');
    close.addEventListener('click', function () {
      bar.remove();
      try {
        sessionStorage.setItem(key, 'true');
      } catch (_) {}
    });

    bar.append(left, close);
    mount.appendChild(bar);
  }

  function mountLiveBanner() {
    if (!document.getElementById('csoPublicAnnouncementMount')) return;
    fetch('/api/content/banner', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d) renderLiveBanner(d); })
      .catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountLiveBanner);
  } else {
    mountLiveBanner();
  }
  setInterval(function () {
    if (!document.hidden) mountLiveBanner();
  }, 60000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) mountLiveBanner();
  });

  window.CSOPublicContent = Object.freeze({
    el,
    safeHref,
    safeMediaSrc,
    renderSanitizedHtml,
    formatDate,
    deadlineInfo,
    createBookmarkButton,
    mountLiveBanner,
    syncTheme
  });
})(window);
