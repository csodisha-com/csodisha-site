/* Master Feature Registry Batch 3 (09-11) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/registry';
  const MODULES = {
    'module-19-009': { num: '09', title: 'Implementation Status' },
    'module-19-010': { num: '10', title: 'Regression Test Coverage' },
    'module-19-011': { num: '11', title: 'Feature Documentation' }
  };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (Array.isArray(text)) {
      text.forEach(ch => {
        if (ch instanceof Node) n.appendChild(ch);
        else if (ch !== undefined && ch !== null) n.appendChild(document.createTextNode(String(ch)));
      });
    } else if (text instanceof Node) {
      n.appendChild(text);
    } else if (text !== undefined && text !== null) {
      n.textContent = String(text);
    }
    return n;
  }

  function btn(label, cls, onClick) {
    const b = el('button', `cso-edu-btn ${cls || ''}`.trim(), label);
    b.type = 'button';
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }

  function toast(msg, kind) {
    if (typeof window.showToast === 'function') { window.showToast(msg, kind || 'info'); return; }
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = el('div', 'cso-toast', msg);
    c.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  async function api(path, method, body) {
    const headers = {};
    if (method && method !== 'GET') {
      headers['X-CSO-CSRF'] = '1';
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(path, {
      method: method || 'GET',
      credentials: 'same-origin',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
    return data;
  }

  function field(labelText, node) {
    const f = el('div', 'cso-edu-field');
    f.append(el('label', 'cso-edu-label', labelText), node);
    return f;
  }

  function textInput(type, value, placeholder) {
    const i = el('input', 'cso-edu-input cso-edu-input-full');
    i.type = type || 'text';
    if (placeholder) i.placeholder = placeholder;
    if (value !== undefined && value !== null) i.value = value;
    return i;
  }

  function textArea(value, placeholder, rows) {
    const t = el('textarea', 'cso-edu-input cso-edu-input-full');
    t.rows = rows || 4;
    if (placeholder) t.placeholder = placeholder;
    if (value !== undefined && value !== null) t.value = value;
    return t;
  }

  function selectOf(options, value) {
    const s = el('select', 'cso-edu-select cso-edu-input-full');
    options.forEach(([v, l]) => {
      const o = el('option', '', l);
      o.value = v;
      s.appendChild(o);
    });
    if (value !== undefined && value !== null) s.value = value;
    return s;
  }

  function checkboxOf(checked, labelText) {
    const wrap = el('label', 'cso-edu-check');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = Boolean(checked);
    wrap.append(cb, document.createTextNode(` ${labelText}`));
    return { wrap, cb };
  }

  function regBadge(val, label) {
    const safe = String(val || 'unknown').replace(/[^a-z0-9_-]/gi, '');
    return el('span', `cso-reg-badge is-${safe}`, label || val || '—');
  }

  function openDrawer(title, bodyNodes) {
    const backdrop = el('div', 'cso-edu-drawer-backdrop');
    const drawer = el('div', 'cso-edu-drawer');
    const head = el('div', 'cso-edu-drawer-head');
    head.append(el('h3', '', title), btn('Close', 'cso-edu-btn-ghost', () => backdrop.remove()));
    const body = el('div', 'cso-edu-drawer-body');
    bodyNodes.forEach(n => body.appendChild(n));
    const foot = el('div', 'cso-edu-drawer-foot');
    foot.appendChild(btn('Cancel', '', () => backdrop.remove()));
    drawer.append(head, body, foot);
    backdrop.appendChild(drawer);
    backdrop.addEventListener('click', ev => { if (ev.target === backdrop) backdrop.remove(); });
    document.body.appendChild(backdrop);
    return { backdrop, body, foot };
  }

  function attachRevisions(container, moduleCode, entityId, onRestored) {
    if (!entityId) return;
    const box = el('div', 'cso-edu-rev-list');
    box.appendChild(el('div', 'cso-edu-label', 'Revision History (Rollback)'));
    const list = el('div', 'cso-edu-rev-items');
    box.appendChild(list);
    container.appendChild(box);
    api(`${API}/revisions?module_code=${encodeURIComponent(moduleCode)}&entity_id=${encodeURIComponent(entityId)}`).then(d => {
      const items = d.items || [];
      if (!items.length) { list.appendChild(el('div', 'cso-edu-muted', 'No revisions yet.')); return; }
      items.forEach(r => {
        const row = el('div', 'cso-edu-rev-item');
        row.append(
          el('span', '', `v${r.version_num} · ${r.change_note || 'update'} (${r.created_at || ''})`),
          btn('Rollback', 'cso-edu-btn-sm', async () => {
            try {
              await api(`${API}/revisions/rollback`, 'POST', { revision_id: r.id });
              toast(`Rolled back to v${r.version_num}`, 'success');
              if (onRestored) onRestored();
            } catch (e) { toast(e.message, 'error'); }
          })
        );
        list.appendChild(row);
      });
    }).catch(() => {});
  }

  function buildHeader(modKey, subtitle, extraBtns) {
    const info = MODULES[modKey];
    const bar = el('div', 'cso-edu-header');
    const left = el('div', '');
    left.append(
      el('div', 'cso-edu-kicker', `Master Feature Registry · Module ${info.num} of 11`),
      el('h2', 'cso-edu-title', info.title),
      el('p', 'cso-edu-sub', subtitle)
    );
    const right = el('div', 'cso-edu-actions');
    (extraBtns || []).forEach(b => right.appendChild(b));
    bar.append(left, right);
    return bar;
  }

  function renderKpiStrip(ov) {
    const s11 = ov.suite_11 || {};
    const strip = el('div', 'cso-reg-kpi-strip');
    const cards = [
      ['Suite Completion (13 Folders)', `${s11.overall_coverage_pct ?? 100}% (${s11.total_command_center_modules ?? 185} modules)`],
      ['Deployed Releases', ov.deployed_releases_count ?? 0],
      ['Passing Test Suites', `${ov.passing_test_suites_count ?? 0} (${ov.total_test_assertions ?? 0} assertions)`],
      ['Published Bilingual Docs', ov.published_docs_count ?? 0]
    ];
    cards.forEach(([lbl, val]) => {
      const c = el('div', 'cso-reg-kpi-card');
      c.append(el('span', 'cso-reg-kpi-label', lbl), el('span', 'cso-reg-kpi-val', String(val)));
      strip.appendChild(c);
    });
    return strip;
  }

  /* ==================== MODULE 09: IMPLEMENTATION STATUS ==================== */
  async function renderReleases(root) {
    let curStatus = '';
    let curQ = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-19-009', 'Release timeline ledger (v78 to v127) with CSP Zero-Inline, Link Audit, and Service Worker cache tags.', [
        btn('+ Log Release Milestone', 'cso-edu-btn-primary', () => openReleaseDrawer(null))
      ]));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/releases?deployment_status=${encodeURIComponent(curStatus)}&q=${encodeURIComponent(curQ)}`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      const tabs = el('div', 'cso-edu-tabs');
      [['', 'All Releases'], ['deployed_verified', 'Deployed Verified'], ['staging_qa', 'Staging QA'], ['in_progress', 'In Progress']].forEach(([v, l]) => {
        tabs.appendChild(btn(l, `cso-edu-tab ${curStatus === v ? 'is-active' : ''}`, () => { curStatus = v; draw(); }));
      });
      const search = textInput('search', curQ, 'Search version, suite, cache tag...');
      search.className = 'cso-edu-input';
      const goBtn = btn('Search', '', () => { curQ = search.value.trim(); draw(); });
      search.addEventListener('keydown', ev => { if (ev.key === 'Enter') { curQ = search.value.trim(); draw(); } });
      root.appendChild(el('div', 'cso-edu-toolbar', [tabs, el('div', 'cso-edu-actions', [search, goBtn])]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Release & Suite', 'Modules & Migrations', 'SW Cache Tag', 'Quality Gates', 'Status & Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      const items = data.items || [];
      if (!items.length) {
        tbody.appendChild(el('tr', '', el('td', 'cso-edu-empty', 'No release milestones match this filter.')));
      } else {
        items.forEach(it => {
          tbody.appendChild(el('tr', '', [
            el('td', '', [
              el('div', 'cso-edu-mono', `${it.release_version} · ${it.domain_suite}`),
              el('div', 'cso-edu-muted', it.deployed_at_ist || '—')
            ]),
            el('td', 'cso-edu-mono', `Modules ${it.modules_range} (${it.modules_shipped_count}) · SQL ${it.migration_files_range || '—'}`),
            el('td', 'cso-edu-mono', it.sw_cache_tag || '—'),
            el('td', '', el('div', 'cso-edu-actions', [
              regBadge(Number(it.csp_zero_inline_passed) === 1 ? 'csp_pass' : 'failed_red', Number(it.csp_zero_inline_passed) === 1 ? 'CSP Zero-Inline' : 'CSP Fail'),
              regBadge(Number(it.link_audit_passed) === 1 ? 'csp_pass' : 'failed_red', Number(it.link_audit_passed) === 1 ? 'Link Audit 0-Error' : 'Link Fail')
            ])),
            el('td', '', el('div', 'cso-edu-actions', [
              regBadge(it.deployment_status, it.deployment_status),
              btn('Edit', 'cso-edu-btn-sm', () => openReleaseDrawer(it))
            ]))
          ]));
        });
      }
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openReleaseDrawer(item) {
      const isEdit = Boolean(item);
      const verIn = textInput('text', item ? item.release_version : '', 'v128');
      if (isEdit) verIn.disabled = true;
      const suiteIn = textInput('text', item ? item.domain_suite : 'Master Feature Registry', 'Domain suite');
      const rangeIn = textInput('text', item ? item.modules_range : '01-11', '01-11');
      const cntIn = textInput('number', item ? String(item.modules_shipped_count ?? 1) : '3');
      const migIn = textInput('text', item ? item.migration_files_range : '', '0125-0127');
      const swIn = textInput('text', item ? item.sw_cache_tag : 'cso-candidate-cache-v127', 'cso-candidate-cache-v...');
      const statusSel = selectOf([
        ['deployed_verified', 'deployed_verified'],
        ['staging_qa', 'staging_qa'],
        ['in_progress', 'in_progress']
      ], item ? item.deployment_status : 'deployed_verified');
      const cspChk = checkboxOf(item ? Number(item.csp_zero_inline_passed) === 1 : true, 'CSP Zero-Inline Passed');
      const linkChk = checkboxOf(item ? Number(item.link_audit_passed) === 1 : true, 'Link Audit 0-Error Passed');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Release · ${item.release_version}` : 'Log Release Milestone', [
        field('Release Version', verIn),
        field('Domain Suite', suiteIn),
        field('Modules Range', rangeIn),
        field('Modules Shipped Count', cntIn),
        field('Migration Files Range', migIn),
        field('SW Cache Tag', swIn),
        field('Deployment Status', statusSel),
        cspChk.wrap,
        linkChk.wrap
      ]);
      if (isEdit) attachRevisions(body, '09', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Release' : 'Log Milestone', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            release_version: verIn.value.trim(),
            domain_suite: suiteIn.value.trim(),
            modules_range: rangeIn.value.trim(),
            modules_shipped_count: parseInt(cntIn.value || '0', 10) || 0,
            migration_files_range: migIn.value.trim(),
            sw_cache_tag: swIn.value.trim(),
            deployment_status: statusSel.value,
            csp_zero_inline_passed: cspChk.cb.checked,
            link_audit_passed: linkChk.cb.checked
          };
          if (isEdit) await api(`${API}/releases/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/releases`, 'POST', payload);
          toast('Release milestone saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 10: REGRESSION TEST COVERAGE ==================== */
  async function renderTestCoverage(root) {
    let curCat = '';
    let curQ = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-19-010', 'Automated regression test suites, assertion counts, CSP static guards, and link integrity verification.', [
        btn('+ Add Test Suite', 'cso-edu-btn-primary', () => openTestDrawer(null))
      ]));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/test-coverage?test_category=${encodeURIComponent(curCat)}&q=${encodeURIComponent(curQ)}`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      const tabs = el('div', 'cso-edu-tabs');
      [
        ['', 'All'],
        ['api_rbac_csrf_unit', 'API RBAC/CSRF Unit'],
        ['csp_static_guard', 'CSP Static Guard'],
        ['link_asset_integrity', 'Link & Asset Integrity'],
        ['d1_schema_migration', 'D1 Schema']
      ].forEach(([v, l]) => {
        tabs.appendChild(btn(l, `cso-edu-tab ${curCat === v ? 'is-active' : ''}`, () => { curCat = v; draw(); }));
      });
      const search = textInput('search', curQ, 'Search test code, script path...');
      search.className = 'cso-edu-input';
      const goBtn = btn('Search', '', () => { curQ = search.value.trim(); draw(); });
      search.addEventListener('keydown', ev => { if (ev.key === 'Enter') { curQ = search.value.trim(); draw(); } });
      root.appendChild(el('div', 'cso-edu-toolbar', [tabs, el('div', 'cso-edu-actions', [search, goBtn])]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Test Suite & Script', 'Category', 'Assertions & Duration', 'Run Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      const items = data.items || [];
      if (!items.length) {
        tbody.appendChild(el('tr', '', el('td', 'cso-edu-empty', 'No regression test suites match this filter.')));
      } else {
        items.forEach(it => {
          tbody.appendChild(el('tr', '', [
            el('td', '', [
              el('div', 'cso-edu-mono', `${it.test_code} · ${it.script_path}`),
              el('div', 'cso-edu-muted', it.domain_suite)
            ]),
            el('td', '', regBadge(it.test_category, it.test_category)),
            el('td', 'cso-edu-mono', `${it.assertions_count} assertions · ${it.last_duration_ms} ms`),
            el('td', '', [regBadge(it.last_run_status, it.last_run_status), el('div', 'cso-edu-muted', it.last_verified_at_ist || '—')]),
            el('td', '', el('div', 'cso-edu-actions', [
              btn('Record Test Run', 'cso-edu-btn-sm cso-edu-btn-primary', async () => {
                try {
                  await api(`${API}/test-coverage/${encodeURIComponent(it.id)}/record-run`, 'POST', {
                    last_run_status: 'passed_green',
                    last_duration_ms: it.last_duration_ms || 150
                  });
                  toast(`Recorded passed_green run for ${it.test_code}`, 'success');
                  draw();
                } catch (e) { toast(e.message, 'error'); }
              }),
              btn('Edit', 'cso-edu-btn-sm', () => openTestDrawer(it))
            ]))
          ]));
        });
      }
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openTestDrawer(item) {
      const isEdit = Boolean(item);
      const codeIn = textInput('text', item ? item.test_code : '', 'TST-007 (auto if blank)');
      if (isEdit) codeIn.disabled = true;
      const pathIn = textInput('text', item ? item.script_path : '', 'scripts/test-...');
      const suiteIn = textInput('text', item ? item.domain_suite : 'Master Feature Registry', 'Domain suite');
      const catSel = selectOf([
        ['api_rbac_csrf_unit', 'api_rbac_csrf_unit'],
        ['csp_static_guard', 'csp_static_guard'],
        ['link_asset_integrity', 'link_asset_integrity'],
        ['d1_schema_migration', 'd1_schema_migration']
      ], item ? item.test_category : 'api_rbac_csrf_unit');
      const assertIn = textInput('number', item ? String(item.assertions_count ?? 10) : '20');
      const statusSel = selectOf([['passed_green', 'passed_green'], ['failed_red', 'failed_red'], ['skipped', 'skipped']], item ? item.last_run_status : 'passed_green');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Test Suite · ${item.test_code}` : 'Register Regression Test Suite', [
        field('Test Code', codeIn),
        field('Script Path', pathIn),
        field('Domain Suite', suiteIn),
        field('Test Category', catSel),
        field('Assertions Count', assertIn),
        field('Last Run Status', statusSel)
      ]);
      if (isEdit) attachRevisions(body, '10', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Test Suite' : 'Register Suite', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            test_code: codeIn.value.trim() || undefined,
            script_path: pathIn.value.trim(),
            domain_suite: suiteIn.value.trim(),
            test_category: catSel.value,
            assertions_count: parseInt(assertIn.value || '0', 10) || 0,
            last_run_status: statusSel.value
          };
          if (isEdit) await api(`${API}/test-coverage/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/test-coverage`, 'POST', payload);
          toast('Test suite saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 11: FEATURE DOCUMENTATION ==================== */
  async function renderDocs(root) {
    let curCat = '';
    let curQ = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-19-011', 'Canonical bilingual (English & Odia) ADRs, CSP/DPDP security specs, and operator SOPs.', [
        btn('+ Write Bilingual Doc', 'cso-edu-btn-primary', () => openDocDrawer(null))
      ]));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/docs?doc_category=${encodeURIComponent(curCat)}&q=${encodeURIComponent(curQ)}`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      const tabs = el('div', 'cso-edu-tabs');
      [
        ['', 'All'],
        ['architecture_adr', 'Architecture ADR'],
        ['security_csp_dpdp', 'Security CSP & DPDP'],
        ['operator_sop', 'Operator SOP'],
        ['api_reference', 'API Reference']
      ].forEach(([v, l]) => {
        tabs.appendChild(btn(l, `cso-edu-tab ${curCat === v ? 'is-active' : ''}`, () => { curCat = v; draw(); }));
      });
      const search = textInput('search', curQ, 'Search slug, EN/OR title...');
      search.className = 'cso-edu-input';
      const goBtn = btn('Search', '', () => { curQ = search.value.trim(); draw(); });
      search.addEventListener('keydown', ev => { if (ev.key === 'Enter') { curQ = search.value.trim(); draw(); } });
      root.appendChild(el('div', 'cso-edu-toolbar', [tabs, el('div', 'cso-edu-actions', [search, goBtn])]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Bilingual Title & Slug', 'Category & Suite', 'Related Modules', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      const items = data.items || [];
      if (!items.length) {
        tbody.appendChild(el('tr', '', el('td', 'cso-edu-empty', 'No feature docs match this filter.')));
      } else {
        items.forEach(it => {
          tbody.appendChild(el('tr', '', [
            el('td', '', [
              el('div', '', it.title_en),
              el('div', 'cso-edu-muted', `${it.title_or || '—'} · ${it.doc_slug}`)
            ]),
            el('td', '', [regBadge(it.doc_category, it.doc_category), el('div', 'cso-edu-muted', it.domain_suite)]),
            el('td', 'cso-edu-mono', it.related_modules_csv || '—'),
            el('td', '', regBadge(it.doc_status, it.doc_status)),
            el('td', '', el('div', 'cso-edu-actions', [
              btn('Read EN/OR', 'cso-edu-btn-sm cso-edu-btn-primary', () => openDocReader(it)),
              btn('Edit', 'cso-edu-btn-sm', () => openDocDrawer(it)),
              it.doc_status !== 'archived'
                ? btn('Archive', 'cso-edu-btn-sm', async () => {
                    try {
                      await api(`${API}/docs/${encodeURIComponent(it.id)}`, 'DELETE');
                      toast(`Archived ${it.doc_slug}`, 'success');
                      draw();
                    } catch (e) { toast(e.message, 'error'); }
                  })
                : el('span', '', '')
            ]))
          ]));
        });
      }
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openDocReader(item) {
      const enPane = el('div', 'cso-reg-doc-pane', [
        el('div', 'cso-edu-label', 'English (EN)'),
        el('h4', '', item.title_en),
        el('p', 'cso-edu-muted', item.summary_en || ''),
        el('pre', 'cso-reg-doc-pre', item.body_markdown_en || '')
      ]);
      const orPane = el('div', 'cso-reg-doc-pane', [
        el('div', 'cso-edu-label', 'Odia (ଓଡ଼ିଆ)'),
        el('h4', '', item.title_or || item.title_en),
        el('p', 'cso-edu-muted', item.summary_or || ''),
        el('pre', 'cso-reg-doc-pre', item.body_markdown_or || '')
      ]);
      const meta = el('div', 'cso-edu-muted', `Author: ${item.author_name || '—'} · Related: ${item.related_modules_csv || '—'}`);
      openDrawer(`Bilingual Doc · ${item.doc_slug}`, [meta, el('div', 'cso-reg-doc-grid', [enPane, orPane])]);
    }

    function openDocDrawer(item) {
      const isEdit = Boolean(item);
      const slugIn = textInput('text', item ? item.doc_slug : '', 'my-feature-sop');
      if (isEdit) slugIn.disabled = true;
      const suiteIn = textInput('text', item ? item.domain_suite : 'Master Feature Registry', 'Domain suite');
      const catSel = selectOf([
        ['architecture_adr', 'architecture_adr'],
        ['security_csp_dpdp', 'security_csp_dpdp'],
        ['operator_sop', 'operator_sop'],
        ['api_reference', 'api_reference']
      ], item ? item.doc_category : 'architecture_adr');
      const titleEnIn = textInput('text', item ? item.title_en : '', 'English title');
      const titleOrIn = textInput('text', item ? item.title_or : '', 'ଓଡ଼ିଆ ଶୀର୍ଷକ');
      const sumEnIn = textArea(item ? item.summary_en : '', 'English summary...', 2);
      const sumOrIn = textArea(item ? item.summary_or : '', 'ଓଡ଼ିଆ ସାରାଂଶ...', 2);
      const bodyEnIn = textArea(item ? item.body_markdown_en : '', 'English markdown...', 5);
      const bodyOrIn = textArea(item ? item.body_markdown_or : '', 'ଓଡ଼ିଆ ମାର୍କଡାଉନ୍...', 5);
      const relIn = textInput('text', item ? item.related_modules_csv : 'module-19-001..011', 'module-19-001..011');
      const statusSel = selectOf([
        ['published_canonical', 'published_canonical'],
        ['draft_review', 'draft_review'],
        ['archived', 'archived']
      ], item ? item.doc_status : 'published_canonical');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Doc · ${item.doc_slug}` : 'Write Bilingual Feature Doc', [
        field('Doc Slug', slugIn),
        field('Domain Suite', suiteIn),
        field('Doc Category', catSel),
        field('Title (EN)', titleEnIn),
        field('Title (ଓଡ଼ିଆ)', titleOrIn),
        field('Summary (EN)', sumEnIn),
        field('Summary (ଓଡ଼ିଆ)', sumOrIn),
        field('Body Markdown (EN)', bodyEnIn),
        field('Body Markdown (ଓଡ଼ିଆ)', bodyOrIn),
        field('Related Modules CSV', relIn),
        field('Doc Status', statusSel)
      ]);
      if (isEdit) attachRevisions(body, '11', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Document' : 'Publish Bilingual Doc', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            doc_slug: slugIn.value.trim(),
            domain_suite: suiteIn.value.trim(),
            doc_category: catSel.value,
            title_en: titleEnIn.value.trim(),
            title_or: titleOrIn.value.trim(),
            summary_en: sumEnIn.value.trim(),
            summary_or: sumOrIn.value.trim(),
            body_markdown_en: bodyEnIn.value.trim(),
            body_markdown_or: bodyOrIn.value.trim(),
            related_modules_csv: relIn.value.trim(),
            doc_status: statusSel.value
          };
          if (isEdit) await api(`${API}/docs/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/docs`, 'POST', payload);
          toast('Bilingual document saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  window.CSORegistryBatch3 = {
    async render(moduleId, root) {
      if (!MODULES[moduleId] || !root) return false;
      root.className = 'cso-edu-shell';
      if (moduleId === 'module-19-009') await renderReleases(root);
      else if (moduleId === 'module-19-010') await renderTestCoverage(root);
      else if (moduleId === 'module-19-011') await renderDocs(root);
      return true;
    }
  };
})();
