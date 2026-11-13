/**
 * Common Sense Odisha (CSO) — PWA Install & Offline Registration Engine
 * Registers Service Worker and provides custom CSP-safe mobile install banner.
 */
(function () {
  'use strict';

  // 1. Service Worker Registration & Update Detection
  let hadController = !!('serviceWorker' in navigator && navigator.serviceWorker.controller);

  function notifySwUpdate(registration) {
    if (typeof CustomEvent === 'function') {
      window.dispatchEvent(new CustomEvent('cso:sw-update-available', { detail: { registration } }));
    }
  }

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('[CSO PWA] Service Worker registered with scope:', reg.scope);
          if (reg.waiting && hadController) {
            notifySwUpdate(reg);
          }
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                notifySwUpdate(reg);
              }
            });
          });
        })
        .catch((err) => {
          console.warn('[CSO PWA] Service Worker registration failed:', err);
        });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) {
        notifySwUpdate(null);
      }
      hadController = true;
    });
  }

  // 2. Custom Install Banner (100% Strict CSP: zero inline style props, zero HTML string injection)
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

  function isStandaloneMode() {
    try {
      return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    } catch (e) {
      return false;
    }
  }

  function markInstallTriggersInstalled() {
    document.querySelectorAll('.cso-pwa-install-trigger, #btn-pwa-install-action, #bp-sidebar-install-btn, #topbar-pwa-install-btn, #bp-topbar-install-btn').forEach(node => {
      node.hidden = false;
      node.setAttribute('aria-disabled', 'true');
      node.disabled = true;
      node.classList.add('is-installed');
      node.title = 'CS Odisha Hub is installed';
      const textSpan = node.querySelector('.bp-nav-text, .cso-btn-label');
      const iconSpan = node.firstElementChild;
      if (iconSpan && iconSpan !== textSpan) iconSpan.textContent = '✓';
      if (textSpan) {
        textSpan.textContent = 'Installed';
      } else {
        node.textContent = '✓ Installed';
      }
    });
  }

  function openInstallGuideModal() {
    const existing = document.getElementById('cso-pwa-guide-modal');
    if (existing) {
      existing.hidden = false;
      return;
    }
    const overlay = el('div', 'bp-modal-overlay cso-pwa-guide-overlay');
    overlay.id = 'cso-pwa-guide-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Install CS Odisha App');

    const box = el('div', 'bp-modal-box cso-pwa-guide-box');
    const head = el('div', 'bp-modal-head');
    head.appendChild(el('h2', '', 'Install CS Odisha App'));
    const closeBtn = el('button', 'cso-btn', '✕');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close Install Guide');
    closeBtn.addEventListener('click', () => { overlay.hidden = true; });
    head.appendChild(closeBtn);
    box.appendChild(head);

    box.appendChild(el('p', 'cso-muted-note', 'Install the Candidate Hub on your home screen for full-screen offline access, exam countdowns, and synced syllabi.'));

    const list = el('div', 'cso-pwa-guide-steps');
    [
      ['Safari (iPhone / iPad)', 'Tap the Share button (⎋) at the bottom, then choose "Add to Home Screen".'],
      ['Chrome / Edge (Android & Desktop)', 'Open the browser menu (⋮) and tap "Install App" or "Add to Home screen".'],
      ['Firefox (Android)', 'Tap the menu (⋮) and select "Install" to pin CS Odisha Hub.']
    ].forEach(pair => {
      const item = el('div', 'cso-pwa-guide-step');
      item.appendChild(el('strong', '', pair[0]));
      item.appendChild(el('span', '', pair[1]));
      list.appendChild(item);
    });
    box.appendChild(list);

    const foot = el('div', 'cso-goal-modal-foot');
    const okBtn = el('button', 'cso-btn cso-btn-primary', 'Got it');
    okBtn.type = 'button';
    okBtn.addEventListener('click', () => { overlay.hidden = true; });
    foot.appendChild(okBtn);
    box.appendChild(foot);

    overlay.appendChild(box);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.hidden = true;
    });
    document.body.appendChild(overlay);
  }

  window.addEventListener('appinstalled', () => {
    console.log('[CSO PWA] App was successfully installed');
    const banner = document.getElementById('cso-pwa-install-banner');
    if (banner) banner.remove();
    deferredPrompt = null;
    markInstallTriggersInstalled();
  });

  // Public API for on-demand install prompt triggers
  window.CSOPwa = {
    triggerInstall: async function () {
      if (isStandaloneMode()) return 'installed';
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[CSO PWA] User response to manual install prompt: ${outcome}`);
        if (outcome === 'accepted') {
          deferredPrompt = null;
          markInstallTriggersInstalled();
        }
        return outcome;
      }
      openInstallGuideModal();
      return 'guide';
    },
    isInstallable: function () {
      return !!deferredPrompt;
    },
    isStandalone: isStandaloneMode
  };

  document.addEventListener('DOMContentLoaded', () => {
    if (isStandaloneMode()) {
      markInstallTriggersInstalled();
    }
    document.querySelectorAll('.cso-pwa-install-trigger, #btn-pwa-install-action, #bp-sidebar-install-btn, #topbar-pwa-install-btn, #bp-topbar-install-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (isStandaloneMode() || btn.getAttribute('aria-disabled') === 'true') return;
        window.CSOPwa.triggerInstall();
      });
    });
  });
})();
