/* Admin Command Center On-Demand Lazy Suite Loader (v131) — Strict CSP: zero innerHTML/style/inline scripts */
(() => {
  'use strict';

  const SUITE_SCRIPTS = {
    '01': [],
    '02': [],
    '03': [],
    '04': [],
    '05': [
      '/admin/edu-resources-batch1.js?v=20261116d',
      '/admin/edu-resources-batch2.js?v=20261116e',
      '/admin/edu-resources-batch3.js?v=20261116f',
      '/admin/edu-resources-batch4.js?v=20261116g',
      '/admin/edu-resources-batch5.js?v=20261116h',
      '/admin/edu-resources-batch6.js?v=20261116i'
    ],
    '06': [
      '/admin/categories-nav-batch1.js?v=20261116j',
      '/admin/categories-nav-batch2.js?v=20261116k',
      '/admin/categories-nav-batch3.js?v=20261116l'
    ],
    '07': [
      '/admin/files-media-batch1.js?v=20261116m',
      '/admin/files-media-batch2.js?v=20261117a',
      '/admin/files-media-batch3.js?v=20261117b',
      '/admin/files-media-batch4.js?v=20261117c'
    ],
    '08': [
      '/admin/payments-finance-batch1.js?v=20261117d',
      '/admin/payments-finance-batch2.js?v=20261117e',
      '/admin/payments-finance-batch3.js?v=20261117f',
      '/admin/payments-finance-batch4.js?v=20261117g',
      '/admin/payments-finance-batch5.js?v=20261117h'
    ],
    '09': [
      '/admin/users-community-batch1.js?v=20261117i',
      '/admin/users-community-batch2.js?v=20261117j',
      '/admin/users-community-batch3.js?v=20261117k',
      '/admin/users-community-batch4.js?v=20261117l',
      '/admin/users-community-batch5.js?v=20261117m'
    ],
    '10': [
      '/admin/analytics-telemetry-batch1.js?v=20261117n',
      '/admin/analytics-telemetry-batch2.js?v=20261117o',
      '/admin/analytics-telemetry-batch3.js?v=20261117p',
      '/admin/analytics-telemetry-batch4.js?v=20261117q'
    ],
    '11': [
      '/admin/communications-alerts-batch1.js?v=20261117r',
      '/admin/communications-alerts-batch2.js?v=20261117s',
      '/admin/communications-alerts-batch3.js?v=20261117t'
    ],
    '12': [
      '/admin/marketing-advertising-batch1.js?v=20261117u',
      '/admin/marketing-advertising-batch2.js?v=20261117v',
      '/admin/marketing-advertising-batch3.js?v=20261117w'
    ],
    '13': [
      '/admin/seo-search-discovery-batch1.js?v=20261117x',
      '/admin/seo-search-discovery-batch2.js?v=20261117y',
      '/admin/seo-search-discovery-batch3.js?v=20261117z',
      '/admin/seo-search-discovery-batch4.js?v=20261117aa'
    ],
    '14': [
      '/admin/events-scheduling-batch1.js?v=20261117ab',
      '/admin/events-scheduling-batch2.js?v=20261117ac',
      '/admin/events-scheduling-batch3.js?v=20261117ad'
    ],
    '15': [
      '/admin/integrations-webhooks-edge-batch1.js?v=20261117ae',
      '/admin/integrations-webhooks-edge-batch2.js?v=20261117af',
      '/admin/integrations-webhooks-edge-batch3.js?v=20261117ag'
    ],
    '16': [],
    '17': [],
    '18': [
      '/admin/settings-configuration-batch1.js?v=20261117ah',
      '/admin/settings-configuration-batch2.js?v=20261117ai',
      '/admin/settings-configuration-batch3.js?v=20261117aj',
      '/admin/settings-configuration-batch4.js?v=20261117ak'
    ],
    '19': [
      '/admin/master-feature-registry-batch1.js?v=20261117al',
      '/admin/master-feature-registry-batch2.js?v=20261117am',
      '/admin/master-feature-registry-batch3.js?v=20261117an'
    ],
    '20': [],
    '21': [],
    '22': [],
    '23': []
  };

  const _loaded = new Set();
  const _inFlight = new Map();

  function resolveSuiteKey(moduleId, folderId) {
    const m = String(moduleId || '');
    const f = String(folderId || '');
    if (m.startsWith('module-nav-') || m.startsWith('cat-') || f === 'nav-manager') return '06';
    if (m.startsWith('edu-')) return '05';
    if (m.startsWith('files-')) return '07';
    if (m.startsWith('module-08-') || m.startsWith('pay-') || f === 'folder-08') return '08';
    if (m.startsWith('module-09-') || m.startsWith('usr-') || f === 'folder-09') return '09';
    if (m.startsWith('module-ana-') || m.startsWith('anl-') || m.startsWith('module-10-') || f === 'folder-10') return '10';
    if (m.startsWith('module-comms-') || m.startsWith('com-') || m.startsWith('module-11-') || f === 'folder-11') return '11';
    if (m.startsWith('module-12-') || m.startsWith('mkt-') || f === 'folder-12') return '12';
    if (m.startsWith('module-seo-') || m.startsWith('seo-') || m.startsWith('module-13-') || f === 'folder-13') return '13';
    if (m.startsWith('module-es-') || m.startsWith('es-') || m.startsWith('module-14-') || f === 'folder-14') return '14';
    if (m.startsWith('module-int-') || m.startsWith('int-') || m.startsWith('module-15-') || f === 'folder-15') return '15';
    if (m.startsWith('module-sec-') || m.startsWith('module-16-') || f === 'folder-16') return '16';
    if (m.startsWith('module-ops-') || m.startsWith('module-17-') || f === 'folder-17') return '17';
    if (m.startsWith('module-18-') || m.startsWith('18-') || f === 'folder-18') return '18';
    if (m.startsWith('module-19-') || m.startsWith('19-') || m.startsWith('module-mfr-') || f === 'folder-19') return '19';
    if (m.startsWith('module-jc-') || f === 'folder-jobs-careers') return '20';
    if (m.startsWith('module-sb-') || f === 'folder-schemes-benefits') return '21';
    if (m.startsWith('module-sl-') || f === 'folder-study-library') return '22';
    if (m.startsWith('module-cm-') || f === 'folder-community') return '23';
    return '';
  }

  function scriptsForModule(moduleId, folderId) {
    const key = resolveSuiteKey(moduleId, folderId);
    return SUITE_SCRIPTS[key] || [];
  }

  function loadScript(src) {
    if (_loaded.has(src)) return Promise.resolve();
    if (_inFlight.has(src)) return _inFlight.get(src);

    const p = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.defer = true;
      s.addEventListener('load', () => {
        _loaded.add(src);
        _inFlight.delete(src);
        resolve();
      });
      s.addEventListener('error', () => {
        _inFlight.delete(src);
        reject(new Error('Failed to load module script: ' + src));
      });
      document.head.appendChild(s);
    });
    _inFlight.set(src, p);
    return p;
  }

  async function ensureForModule(moduleId, folderId) {
    const list = scriptsForModule(moduleId, folderId);
    if (!list.length) return [];
    await Promise.all(list.map(loadScript));
    return list;
  }

  function hasScriptsFor(moduleId, folderId) {
    return scriptsForModule(moduleId, folderId).length > 0;
  }

  function needsLazyScripts(moduleId, folderId) {
    return scriptsForModule(moduleId, folderId).some(src => !_loaded.has(src));
  }

  window.CSOLazySuiteLoader = {
    SUITE_SCRIPTS,
    resolveSuiteKey,
    scriptsForModule,
    ensureForModule,
    hasScriptsFor,
    needsLazyScripts
  };
})();
