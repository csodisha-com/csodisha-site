/**
 * Common Sense Odisha (CSO) — PWA Install & Offline Registration Engine
 * Registers Service Worker and provides custom CSP-safe mobile install banner.
 */
(function () {
  'use strict';

  // 1. Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[CSO PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.warn('[CSO PWA] Service Worker registration failed:', err);
        });
    });
  }

  // 2. Custom Install Banner (100% Strict CSP: zero .style.*, zero .innerHTML)
  let deferredPrompt = null;
  const BANNER_DISMISSED_KEY = 'cso_pwa_banner_dismissed_until';

  function isDismissed() {
    try {
      const until = localStorage.getItem(BANNER_DISMISSED_KEY);
      if (!until) return false;
      return Date.now() < parseInt(until, 10);
    } catch (e) {
      return false;
    }
  }

  function dismissBanner(hours = 24) {
    try {
      const expiry = Date.now() + (hours * 60 * 60 * 1000);
      localStorage.setItem(BANNER_DISMISSED_KEY, String(expiry));
    } catch (e) {}
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function showInstallBanner() {
    if (document.getElementById('cso-pwa-install-banner') || isDismissed()) return;

    const banner = el('div', 'cso-pwa-banner');
    banner.id = 'cso-pwa-install-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Install CSO App');

    const left = el('div', 'cso-pwa-banner-left');
    const logo = el('img', 'cso-pwa-banner-icon');
    logo.src = '/assets/favicon.svg';
    logo.alt = 'CSO Logo';

    const copy = el('div', 'cso-pwa-banner-copy');
    const title = el('h4', 'cso-pwa-banner-title', 'Install CSO Hub');
    const sub = el('p', 'cso-pwa-banner-sub', 'Add to home screen for 1-click & offline access');
    copy.appendChild(title);
    copy.appendChild(sub);
    left.appendChild(logo);
    left.appendChild(copy);

    const actions = el('div', 'cso-pwa-banner-actions');
    const dismissBtn = el('button', 'cso-pwa-btn-later', 'Later');
    dismissBtn.type = 'button';
    dismissBtn.id = 'cso-pwa-btn-dismiss';

    const installBtn = el('button', 'cso-pwa-btn-install', 'Install');
    installBtn.type = 'button';
    installBtn.id = 'cso-pwa-btn-install';

    actions.appendChild(dismissBtn);
    actions.appendChild(installBtn);

    banner.appendChild(left);
    banner.appendChild(actions);
    document.body.appendChild(banner);

    installBtn.addEventListener('click', async () => {
      banner.remove();
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[CSO PWA] User response to install prompt: ${outcome}`);
        deferredPrompt = null;
      }
    });

    dismissBtn.addEventListener('click', () => {
      dismissBanner(48);
      banner.remove();
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner();
  });

  window.addEventListener('appinstalled', () => {
    console.log('[CSO PWA] App was successfully installed');
    const banner = document.getElementById('cso-pwa-install-banner');
    if (banner) banner.remove();
    deferredPrompt = null;
    hideAllInstallTriggers();
  });

  function hideAllInstallTriggers() {
    document.querySelectorAll('.cso-pwa-install-trigger').forEach(node => {
      node.hidden = true;
    });
  }

  // Public API for on-demand install prompt triggers
  window.CSOPwa = {
    triggerInstall: async function () {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[CSO PWA] User response to manual install prompt: ${outcome}`);
        if (outcome === 'accepted') {
          deferredPrompt = null;
          hideAllInstallTriggers();
        }
        return outcome;
      } else {
        alert('To install Common Sense Odisha Hub:\n\n• On Chrome/Android: Tap menu (⋮) and choose "Install App" or "Add to Home screen".\n• On Safari/iOS: Tap Share (⎋) and select "Add to Home Screen".\n• On Desktop Chrome/Edge: Click the install icon in the URL bar.');
        return 'unsupported';
      }
    },
    isInstallable: function () {
      return !!deferredPrompt;
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.cso-pwa-install-trigger, #btn-pwa-install-action, #bp-sidebar-install-btn, #topbar-pwa-install-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.CSOPwa.triggerInstall();
      });
    });
  });
})();
