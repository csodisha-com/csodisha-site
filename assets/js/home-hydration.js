/* Common Sense Odisha — Homepage Live Banner & Configuration Hydration (Strict CSP) */
(function () {
  'use strict';

  var SEV_CLASS = {
    info: 'cso-live-banner cso-live-banner--info',
    notice: 'cso-live-banner cso-live-banner--notice',
    urgent: 'cso-live-banner cso-live-banner--urgent'
  };
  var SEV_TAG = { info: 'NOTICE', notice: 'NOTICE', urgent: 'URGENT' };

  function make(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function renderLiveBanner(data) {
    var mount = document.getElementById('csoPublicAnnouncementMount');
    if (!mount) return;
    mount.textContent = '';
    if (!data || !data.active || !data.headline) return;
    var key = 'cso_dismissed_announcement_' + (data.updatedAt || data.headline);
    try { if (sessionStorage.getItem(key)) return; } catch (_) {}

    var sev = SEV_CLASS[data.severity] ? data.severity : 'info';
    var bar = make('div', SEV_CLASS[sev]);
    bar.id = 'csoLiveBanner';
    bar.setAttribute('role', 'status');

    var left = make('div', 'cso-live-banner__left');
    left.appendChild(make('span', 'cso-live-banner__tag', SEV_TAG[sev]));
    left.appendChild(make('strong', 'cso-live-banner__headline', data.headline));
    if (data.context) left.appendChild(make('span', 'cso-live-banner__context', data.context));
    if (data.ctaText && data.ctaUrl) {
      var cta = make('a', 'cso-live-banner__cta', data.ctaText + ' \u2192');
      var u = String(data.ctaUrl || '').trim();
      if (/^\/(?!\/)/.test(u) || /^https?:\/\//i.test(u)) {
        cta.setAttribute('href', u);
        left.appendChild(cta);
      }
    }

    var close = make('button', 'cso-live-banner__close', '\u00d7');
    close.type = 'button';
    close.setAttribute('title', 'Dismiss');
    close.setAttribute('aria-label', 'Dismiss announcement');
    close.addEventListener('click', function () {
      bar.remove();
      try { sessionStorage.setItem(key, 'true'); } catch (_) {}
    });

    bar.appendChild(left);
    bar.appendChild(close);
    mount.appendChild(bar);
  }

  function mountLiveBanner() {
    fetch('/api/content/banner', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d) renderLiveBanner(d); })
      .catch(function () {});
  }

  function hydrateHomepageConfig() {
    try {
      var raw = localStorage.getItem('cso_homepage_config');
      if (!raw) return;
      var config = JSON.parse(raw);
      if (!config) return;

      if (config.hero) {
        var heroSec = document.getElementById('cso-hero');
        if (heroSec) {
          heroSec.classList.toggle('cso-hidden', config.hero.enabled === false);
        }
        if (config.hero.tagline) {
          var tagEl = document.querySelector('.cso-hero-tagline');
          if (tagEl) tagEl.textContent = config.hero.tagline;
        }
        if (config.hero.subheadline) {
          var subEl = document.querySelector('.cso-hero-subtagline');
          if (subEl) subEl.textContent = config.hero.subheadline;
        }
      }

      if (Array.isArray(config.sections)) {
        config.sections.forEach(function (sec) {
          if (sec.id === 'sec-badges') {
            var chips = document.querySelector('.chips');
            if (chips) chips.classList.toggle('cso-hidden', !sec.enabled);
          } else if (sec.id === 'sec-cards') {
            var compass = document.getElementById('cso-opportunity-compass');
            if (compass) compass.classList.toggle('cso-hidden', !sec.enabled);
          } else if (sec.id === 'sec-notice') {
            var bannerMount = document.getElementById('csoPublicAnnouncementMount');
            if (bannerMount) bannerMount.classList.toggle('cso-hidden', !sec.enabled);
          }
        });
      }
    } catch (err) {
      console.warn('Homepage hydration error:', err);
    }
  }

  function init() {
    mountLiveBanner();
    hydrateHomepageConfig();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  setInterval(function () { if (!document.hidden) mountLiveBanner(); }, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) mountLiveBanner(); });
  window.addEventListener('storage', function (e) {
    if (e.key === 'cso_homepage_config') hydrateHomepageConfig();
  });
})();
