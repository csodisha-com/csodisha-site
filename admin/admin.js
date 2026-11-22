/**
 * Common Sense Odisha — Compact 3-Tab Editorial Studio Controller (admin/admin.js, v199)
 * Strict CSP-compliant: zero HTML string injection, zero inline style props, zero inline handlers.
 */
(function (window, document) {
  'use strict';

  var PAGE_SIZE = 10;
  var masterNavigationSchema = null;

  var CSOState = {
    activeTab: 'jobs',
    jobsMode: 'editor', // 'editor' | 'queue' | 'digest'
    editingJobId: null,
    schemePage: 1,
    schemeFilter: '',
    selectedModuleId: ''
  };

  var dom = {
    tabsNav: document.getElementById('csoAdminTabs'),
    workspaceRoot: document.getElementById('workspaceRoot'),
    moduleHeaderActions: document.getElementById('moduleHeaderActions'),
    toastContainer: document.getElementById('toastContainer'),
    globalModal: document.getElementById('globalModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalBody: document.getElementById('modalBody'),
    modalFooter: document.getElementById('modalFooter'),
    btnModalClose: document.getElementById('btnModalClose'),
    adminUserEmail: document.getElementById('adminUserEmail'),
    brandHomeBtn: document.getElementById('brandHomeBtn')
  };

  function clearNode(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function showToast(message, type) {
    if (!dom.toastContainer) return;
    var kind = type || 'info';
    var toast = el('div', 'cso-toast cso-toast-' + kind);
    toast.appendChild(el('span', 'cso-toast-dot'));
    toast.appendChild(el('span', 'cso-toast-msg', message));
    dom.toastContainer.appendChild(toast);
    setTimeout(function () { toast.classList.add('is-visible'); }, 10);
    setTimeout(function () {
      toast.classList.remove('is-visible');
      setTimeout(function () { toast.remove(); }, 280);
    }, 3400);
  }

  function closeModal() {
    if (dom.globalModal) dom.globalModal.hidden = true;
  }

  async function apiJson(method, url, body) {
    var opts = {
      method: method,
      credentials: 'same-origin',
      headers: { 'X-CSO-CSRF': '1' }
    };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    var res = await fetch(url, opts);
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
    return data;
  }

  async function hydrateSessionIdentity() {
    try {
      var res = await fetch('/api/admin/session', { credentials: 'same-origin' });
      if (!res.ok) return;
      var d = await res.json();
      if (d && d.user && dom.adminUserEmail) {
        try { localStorage.setItem('cso_admin_active', '1'); } catch (_) {}
        dom.adminUserEmail.textContent = d.user.email || 'Staff';
      }
    } catch (_) {}
  }

  async function loadMasterNavigation() {
    if (masterNavigationSchema) return masterNavigationSchema;
    try {
      var res = await fetch('./data/master-navigation.json', { credentials: 'same-origin' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      masterNavigationSchema = await res.json();
      return masterNavigationSchema;
    } catch (_) {
      return { folders: [] };
    }
  }

  function syncTabsUI() {
    if (!dom.tabsNav) return;
    dom.tabsNav.querySelectorAll('[data-admin-tab]').forEach(function (btn) {
      var on = btn.getAttribute('data-admin-tab') === CSOState.activeTab;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', String(on));
    });
  }

  function switchTab(tab) {
    CSOState.activeTab = tab;
    syncTabsUI();
    renderActiveTab();
  }

  /* ---------- Tab 1: Jobs & .gov.in Queue ---------- */
  function renderJobsTab(root) {
    var modeBar = el('div', 'cso-mode-bar');
    modeBar.setAttribute('role', 'group');
    modeBar.setAttribute('aria-label', 'Jobs workspace mode');

    [
      ['editor', 'New / Edit Job'],
      ['queue', '.gov.in Queue'],
      ['digest', 'Daily Digest']
    ].forEach(function (pair) {
      var isAct = CSOState.jobsMode === pair[0];
      var b = el('button', 'cso-mode-btn' + (isAct ? ' is-active' : ''), pair[1]);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(isAct));
      b.addEventListener('click', function () {
        CSOState.jobsMode = pair[0];
        renderJobsTab(clearNode(root));
      });
      modeBar.appendChild(b);
    });
    root.appendChild(modeBar);

    var panelHost = el('div', 'cso-mode-panel');
    root.appendChild(panelHost);

    if (CSOState.jobsMode === 'editor') {
      renderCompactJobEditor(panelHost, null);
    } else if (CSOState.jobsMode === 'queue') {
      if (window.CSOFastPublish && typeof window.CSOFastPublish.createGovDraftQueuePanel === 'function') {
        var qPanel = window.CSOFastPublish.createGovDraftQueuePanel({
          onLoadDraft: function (draft) {
            CSOState.jobsMode = 'editor';
            renderJobsTab(clearNode(root));
            var host = root.querySelector('.cso-mode-panel');
            if (host) renderCompactJobEditor(clearNode(host), draft);
            showToast('Loaded verified .gov.in draft into Job Editor', 'info');
          }
        });
        panelHost.appendChild(qPanel.node);
      } else {
        panelHost.appendChild(el('p', 'cso-muted-note', 'Draft queue module unavailable.'));
      }
    } else if (CSOState.jobsMode === 'digest') {
      if (window.CSOFastPublish && typeof window.CSOFastPublish.renderBroadcastDigestPanel === 'function') {
        apiJson('GET', '/api/admin/posts?type=job&limit=30')
          .then(function (data) {
            window.CSOFastPublish.renderBroadcastDigestPanel(panelHost, (data && data.items) || []);
          })
          .catch(function () {
            window.CSOFastPublish.renderBroadcastDigestPanel(panelHost, []);
          });
      }
    }
  }

  function renderCompactJobEditor(host, draft) {
    var card = el('section', 'cso-compact-card');
    card.appendChild(el('h2', 'cso-compact-h2', draft ? 'Publish Verified .gov.in Job' : 'New / Edit Job Alert'));

    var form = el('form', 'cso-compact-form');
    function makeField(label, id, type, value, placeholder) {
      var wrap = el('label', 'cso-compact-field');
      wrap.appendChild(el('span', 'cso-compact-lbl', label));
      var inp = document.createElement('input');
      inp.id = id;
      inp.type = type || 'text';
      inp.className = 'cso-compact-input';
      if (value !== undefined && value !== null) inp.value = String(value);
      if (placeholder) inp.placeholder = placeholder;
      wrap.appendChild(inp);
      return { wrap: wrap, inp: inp };
    }

    var fTitle = makeField('Title *', 'cso-job-title', 'text', draft && draft.title, 'e.g. OPSC OAS Recruitment 2026');
    fTitle.inp.required = true;
    var fBoard = makeField('Board / Organization *', 'cso-job-org', 'text', draft && (draft.agency || draft.organisation), 'e.g. OPSC, OSSC, OSSSC');
    fBoard.inp.required = true;
    var fDistrict = makeField('District', 'cso-job-district', 'text', (draft && draft.district) || 'All Odisha', 'e.g. Khordha or All Odisha');
    var fLastDate = makeField('Last Date', 'cso-job-lastdate', 'date', draft && draft.last_date);
    var fUrl = makeField('Official URL *', 'cso-job-url', 'url', draft && (draft.official_url || draft.apply_url), 'https://www.opsc.gov.in/...');
    fUrl.inp.required = true;

    var coreGrid = el('div', 'cso-compact-grid');
    coreGrid.appendChild(fTitle.wrap);
    coreGrid.appendChild(fBoard.wrap);
    coreGrid.appendChild(fDistrict.wrap);
    coreGrid.appendChild(fLastDate.wrap);
    coreGrid.appendChild(fUrl.wrap);
    form.appendChild(coreGrid);

    var adv = document.createElement('details');
    adv.className = 'cso-advanced-toggle';
    var sum = document.createElement('summary');
    sum.textContent = 'More Options (Optional)';
    adv.appendChild(sum);

    var advGrid = el('div', 'cso-compact-grid cso-compact-grid--adv');
    var fQual = makeField('Qualification', 'cso-job-qual', 'text', draft && draft.qualification, 'e.g. Graduate / +2');
    var fVac = makeField('Total Vacancies', 'cso-job-vac', 'number', draft && draft.vacancies, 'e.g. 250');
    var fPay = makeField('Salary / Pay Scale', 'cso-job-pay', 'text', draft && draft.salary_pay, 'e.g. Level-9');
    var fSummary = makeField('Short Summary', 'cso-job-summary', 'text', draft && draft.summary, 'Brief eligibility & selection summary');
    advGrid.appendChild(fQual.wrap);
    advGrid.appendChild(fVac.wrap);
    advGrid.appendChild(fPay.wrap);
    advGrid.appendChild(fSummary.wrap);
    adv.appendChild(advGrid);
    form.appendChild(adv);

    var actRow = el('div', 'cso-compact-actions');
    var pubBtn = el('button', 'btn primary cso-compact-btn', 'Publish Job →');
    pubBtn.type = 'submit';
    var statusEl = el('span', 'hint');
    actRow.appendChild(pubBtn);
    actRow.appendChild(statusEl);
    form.appendChild(actRow);

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!fTitle.inp.value.trim() || !fUrl.inp.value.trim()) {
        statusEl.textContent = 'Title and Official URL are required.';
        return;
      }
      pubBtn.disabled = true;
      statusEl.textContent = 'Publishing…';
      try {
        await apiJson('POST', '/api/admin/posts', {
          type: 'job',
          status: 'published',
          title: fTitle.inp.value.trim(),
          organisation: fBoard.inp.value.trim() || 'Odisha Govt',
          state: fDistrict.inp.value.trim() || 'Odisha',
          last_date: fLastDate.inp.value.trim(),
          apply_url: fUrl.inp.value.trim(),
          source_url: fUrl.inp.value.trim(),
          qualification: fQual.inp.value.trim(),
          vacancies: fVac.inp.value ? Number(fVac.inp.value) : null,
          salary_pay: fPay.inp.value.trim(),
          summary: fSummary.inp.value.trim()
        });
        statusEl.textContent = '✓ Published to live Jobs directory!';
        showToast('Job alert published', 'info');
      } catch (err) {
        statusEl.textContent = 'Error: ' + err.message;
      } finally {
        pubBtn.disabled = false;
      }
    });

    card.appendChild(form);
    host.appendChild(card);
  }

  /* ---------- Tab 2: Schemes & Study (Paginated 10/page, No 299-Module Wall) ---------- */
  async function renderSchemesStudyTab(root) {
    var card = el('section', 'cso-compact-card');
    card.appendChild(el('h2', 'cso-compact-h2', 'Schemes & Study Modules'));

    var schema = await loadMasterNavigation();
    var allModules = [];
    (schema.folders || []).forEach(function (f) {
      (f.modules || []).forEach(function (m) {
        allModules.push({ folderId: f.id, folderTitle: f.title, id: m.id, title: m.title });
      });
    });

    var controls = el('div', 'cso-compact-controls');
    var filterInp = document.createElement('input');
    filterInp.type = 'search';
    filterInp.className = 'cso-compact-input';
    filterInp.placeholder = 'Quick filter modules or sections…';
    filterInp.value = CSOState.schemeFilter;
    filterInp.setAttribute('aria-label', 'Quick filter modules');

    var modSel = document.createElement('select');
    modSel.className = 'cso-compact-input';
    modSel.setAttribute('aria-label', 'Select module to open');

    controls.appendChild(filterInp);
    controls.appendChild(modSel);
    card.appendChild(controls);

    var tableHost = el('div', 'cso-compact-list');
    var pagerHost = el('div', 'cso-compact-pager');
    var editorHost = el('div', 'cso-compact-editor-host');
    card.appendChild(tableHost);
    card.appendChild(pagerHost);
    card.appendChild(editorHost);
    root.appendChild(card);

    function openSingleModule(mod) {
      if (!mod) return;
      CSOState.selectedModuleId = mod.id;
      clearNode(editorHost);
      if (window.CSOLive && typeof window.CSOLive.render === 'function') {
        window.CSOLive.render(mod.folderId, mod.id, editorHost, dom.moduleHeaderActions);
      } else {
        editorHost.appendChild(el('p', 'cso-muted-note', 'Selected: ' + mod.title));
      }
    }

    function paintList() {
      var q = CSOState.schemeFilter.toLowerCase().trim();
      var filtered = allModules.filter(function (m) {
        return !q || m.title.toLowerCase().includes(q) || m.folderTitle.toLowerCase().includes(q) || m.id.toLowerCase().includes(q);
      });

      clearNode(modSel);
      var defOpt = document.createElement('option');
      defOpt.value = '';
      defOpt.textContent = 'Jump to Module (' + filtered.length + ' matching)…';
      modSel.appendChild(defOpt);
      filtered.slice(0, 50).forEach(function (m) {
        var o = document.createElement('option');
        o.value = m.id;
        o.textContent = m.folderTitle + ' — ' + m.title;
        if (m.id === CSOState.selectedModuleId) o.selected = true;
        modSel.appendChild(o);
      });

      var totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
      if (CSOState.schemePage > totalPages) CSOState.schemePage = totalPages;
      var start = (CSOState.schemePage - 1) * PAGE_SIZE;
      var pageItems = filtered.slice(start, start + PAGE_SIZE);

      clearNode(tableHost);
      pageItems.forEach(function (m) {
        var row = el('div', 'cso-compact-row');
        var meta = el('div', 'cso-compact-row-main');
        meta.appendChild(el('strong', '', m.title));
        meta.appendChild(el('span', 'hint', m.folderTitle));
        var openBtn = el('button', 'btn sm primary', 'Edit');
        openBtn.type = 'button';
        openBtn.addEventListener('click', function () { openSingleModule(m); });
        row.appendChild(meta);
        row.appendChild(openBtn);
        tableHost.appendChild(row);
      });

      clearNode(pagerHost);
      var prevBtn = el('button', 'btn sm', '← Prev');
      prevBtn.type = 'button';
      prevBtn.disabled = CSOState.schemePage <= 1;
      prevBtn.addEventListener('click', function () {
        if (CSOState.schemePage > 1) { CSOState.schemePage -= 1; paintList(); }
      });

      var info = el('span', 'hint', 'Page ' + CSOState.schemePage + ' / ' + totalPages + ' (' + filtered.length + ' items)');

      var nextBtn = el('button', 'btn sm', 'Next →');
      nextBtn.type = 'button';
      nextBtn.disabled = CSOState.schemePage >= totalPages;
      nextBtn.addEventListener('click', function () {
        if (CSOState.schemePage < totalPages) { CSOState.schemePage += 1; paintList(); }
      });

      pagerHost.appendChild(prevBtn);
      pagerHost.appendChild(info);
      pagerHost.appendChild(nextBtn);
    }

    filterInp.addEventListener('input', function () {
      CSOState.schemeFilter = filterInp.value;
      CSOState.schemePage = 1;
      paintList();
    });
    modSel.addEventListener('change', function () {
      var found = allModules.find(function (m) { return m.id === modSel.value; });
      if (found) openSingleModule(found);
    });

    paintList();
  }

  /* ---------- Tab 3: System & Ops ---------- */
  function renderSystemOpsTab(root) {
    var card = el('section', 'cso-compact-card');
    card.appendChild(el('h2', 'cso-compact-h2', 'System & Ops'));
    card.appendChild(el('p', 'hint', 'Essential platform health, edge cache warmer, and read-only freeze controls.'));

    var actions = el('div', 'cso-compact-actions');
    var statusOut = el('div', 'cso-compact-ops-status');

    var healthBtn = el('button', 'btn primary cso-compact-btn', 'Check System Health');
    healthBtn.type = 'button';
    healthBtn.addEventListener('click', async function () {
      statusOut.textContent = 'Checking /api/admin/ops/health…';
      try {
        var d = await apiJson('GET', '/api/admin/ops/health');
        statusOut.textContent = '✓ OK · SW Cache: ' + ((d.canary && d.canary.expected_sw_cache) || 'active') + ' · Freeze: ' + ((d.freeze && d.freeze.enabled) ? 'ON' : 'OFF');
      } catch (err) {
        statusOut.textContent = 'Health check failed: ' + err.message;
      }
    });

    var warmBtn = el('button', 'btn cso-compact-btn', 'Warm Edge Cache');
    warmBtn.type = 'button';
    warmBtn.addEventListener('click', async function () {
      statusOut.textContent = 'Warming core routes…';
      try {
        await apiJson('POST', '/api/admin/ops/cache-warmer', {});
        statusOut.textContent = '✓ Edge cache warmed.';
      } catch (err) {
        statusOut.textContent = 'Cache warm failed: ' + err.message;
      }
    });

    actions.appendChild(healthBtn);
    actions.appendChild(warmBtn);
    card.appendChild(actions);
    card.appendChild(statusOut);
    root.appendChild(card);
  }

  function renderActiveTab() {
    if (!dom.workspaceRoot) return;
    clearNode(dom.workspaceRoot);
    clearNode(dom.moduleHeaderActions);

    if (CSOState.activeTab === 'jobs') renderJobsTab(dom.workspaceRoot);
    else if (CSOState.activeTab === 'schemes-study') renderSchemesStudyTab(dom.workspaceRoot);
    else renderSystemOpsTab(dom.workspaceRoot);
  }

  function wireGlobalEvents() {
    if (dom.tabsNav) {
      dom.tabsNav.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest ? e.target.closest('[data-admin-tab]') : null;
        if (!btn) return;
        switchTab(btn.getAttribute('data-admin-tab'));
      });
    }
    if (dom.brandHomeBtn) {
      dom.brandHomeBtn.addEventListener('click', function () { switchTab('jobs'); });
    }
    if (dom.btnModalClose) dom.btnModalClose.addEventListener('click', closeModal);
  }

  window.closeModal = closeModal;
  window.showToast = showToast;
  window.selectModule = function (_folderId, _moduleId) { switchTab('schemes-study'); };

  document.addEventListener('DOMContentLoaded', function () {
    wireGlobalEvents();
    hydrateSessionIdentity();
    syncTabsUI();
    renderActiveTab();
  });
})(window, document);
