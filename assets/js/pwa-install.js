/**
 * Common Sense Odisha (CSO) — PWA Install & Offline Registration Engine
 * Registers Service Worker and provides custom mobile install banner.
 */
(function() {
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

  // 2. Custom Install Banner
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

  function showInstallBanner() {
    if (document.getElementById('cso-pwa-install-banner') || isDismissed()) return;

    const banner = document.createElement('div');
    banner.id = 'cso-pwa-install-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Install CSO App');
    banner.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      width: calc(100% - 32px);
      max-width: 480px;
      background: #0f172a;
      border: 1px solid #0d9488;
      border-radius: 14px;
      padding: 14px 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(13, 148, 136, 0.25);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      animation: csoSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      font-family: system-ui, -apple-system, sans-serif;
    `;

    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;min-width:0;">
        <img src="/assets/favicon.svg" alt="CSO Logo" style="width:38px;height:38px;border-radius:8px;flex-shrink:0;background:#ffffff;padding:2px;">
        <div style="min-width:0;">
          <h4 style="font-size:13px;font-weight:700;color:#f8fafc;margin:0;line-height:1.2;">Install CSO Hub</h4>
          <p style="font-size:11px;color:#94a3b8;margin:2px 0 0;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Add to home screen for 1-click & offline access</p>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
        <button type="button" id="cso-pwa-btn-dismiss" style="background:transparent;border:none;color:#94a3b8;font-size:11px;padding:6px 8px;cursor:pointer;">Later</button>
        <button type="button" id="cso-pwa-btn-install" style="background:#0d9488;border:none;border-radius:8px;color:#ffffff;font-size:12px;font-weight:700;padding:7px 12px;cursor:pointer;box-shadow:0 2px 8px rgba(13,148,136,0.4);">Install</button>
      </div>
    `;

    document.body.appendChild(banner);

    document.getElementById('cso-pwa-btn-install')?.addEventListener('click', async () => {
      banner.remove();
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`[CSO PWA] User response to install prompt: ${outcome}`);
        deferredPrompt = null;
      }
    });

    document.getElementById('cso-pwa-btn-dismiss')?.addEventListener('click', () => {
      dismissBanner(48); // Dismiss for 48 hours
      banner.remove();
    });
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Show custom banner
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
    document.querySelectorAll('.cso-pwa-install-trigger').forEach(el => {
      el.style.display = 'none';
    });
  }

  function showAllInstallTriggers() {
    document.querySelectorAll('.cso-pwa-install-trigger').forEach(el => {
      el.style.display = '';
    });
  }

  // Public API for on-demand install prompt triggers
  window.CSOPwa = {
    triggerInstall: async function() {
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
        // Fallback instructions if browser already installed or doesn't support deferred prompt
        alert('To install Common Sense Odisha Hub:\n\n• On Chrome/Android: Tap menu (⋮) and choose "Install App" or "Add to Home screen".\n• On Safari/iOS: Tap Share (⎋) and select "Add to Home Screen".\n• On Desktop Chrome/Edge: Click the install icon in the URL bar.');
        return 'unsupported';
      }
    },
    isInstallable: function() {
      return !!deferredPrompt;
    }
  };

  // Auto-bind click handlers to any element marked with class 'cso-pwa-install-trigger' or id 'btn-install-pwa'
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.cso-pwa-install-trigger, #btn-pwa-install-action, #bp-sidebar-install-btn, #topbar-pwa-install-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        window.CSOPwa.triggerInstall();
      });
    });
  });

})();
