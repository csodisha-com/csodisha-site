/* Master Feature Registry Batch 2 (05-08) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/registry';
  const MODULES = {
    'module-19-005': { num: '05', title: 'API Endpoints' },
    'module-19-006': { num: '06', title: 'Admin Coverage Matrix' },
    'module-19-007': { num: '07', title: 'Missing Admin Controls' },
    'module-19-008': { num: '08', title: 'Feature Dependencies' }
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

  function textArea(value, placeholder) {
    const t = el('textarea', 'cso-edu-input cso-edu-input-full');
    t.rows = 3;
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
    const strip = el('div', 'cso-reg-kpi-strip');
    const cards = [
      ['Verified API Endpoints', ov.verified_api_endpoints_count ?? 0],
      ['Suite Coverage', `${ov.overall_coverage_pct ?? 100}% (${ov.implemented_suite_modules ?? 0}/${ov.total_suite_modules ?? 0})`],
      ['Open Control Gaps', ov.open_missing_controls_count ?? 0],
      ['Healthy Dependencies', ov.healthy_dependencies_count ?? 0]
    ];
    cards.forEach(([lbl, val]) => {
      const c = el('div', 'cso-reg-kpi-card');
      c.append(el('span', 'cso-reg-kpi-label', lbl), el('span', 'cso-reg-kpi-val', String(val)));
      strip.appendChild(c);
    });
    return strip;
  }

  /* ==================== MODULE 05: API ENDPOINTS ==================== */
  async function renderApiEndpoints(root) {
    let curMethod = '';
    let curGuard = '';
    let curQ = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-19-005', 'Contract registry for Admin RBAC/CSRF, HMAC Webhook, and Public Edge API endpoints.', [
        btn('+ Register API Endpoint', 'cso-edu-btn-primary', () => openEndpointDrawer(null))
      ]));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/api-endpoints?http_method=${encodeURIComponent(curMethod)}&auth_guard=${encodeURIComponent(curGuard)}&q=${encodeURIComponent(curQ)}`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      const tabs = el('div', 'cso-edu-tabs');
      [['', 'All'], ['GET', 'GET'], ['POST', 'POST'], ['PUT', 'PUT'], ['PATCH', 'PATCH'], ['DELETE', 'DELETE']].forEach(([v, l]) => {
        tabs.appendChild(btn(l, `cso-edu-tab ${curMethod === v ? 'is-active' : ''}`, () => { curMethod = v; draw(); }));
      });
      const guardSel = selectOf([
        ['', 'All Auth Guards'],
        ['admin_rbac_csrf', 'admin_rbac_csrf'],
        ['hmac_signature', 'hmac_signature'],
        ['public_edge_cached', 'public_edge_cached'],
        ['public_rate_limited', 'public_rate_limited']
      ], curGuard);
      guardSel.className = 'cso-edu-select';
      guardSel.addEventListener('change', () => { curGuard = guardSel.value; draw(); });

      const search = textInput('search', curQ, 'Search endpoint code, path, suite...');
      search.className = 'cso-edu-input';
      const goBtn = btn('Search', '', () => { curQ = search.value.trim(); draw(); });
      search.addEventListener('keydown', ev => { if (ev.key === 'Enter') { curQ = search.value.trim(); draw(); } });
      root.appendChild(el('div', 'cso-edu-toolbar', [tabs, el('div', 'cso-edu-actions', [guardSel, search, goBtn])]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Method & Path', 'Domain Suite', 'Auth Guard & Cache', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      const items = data.items || [];
      if (!items.length) {
        tbody.appendChild(el('tr', '', el('td', 'cso-edu-empty', 'No API endpoints match this filter.')));
      } else {
        items.forEach(it => {
          const row = el('tr', '', [
            el('td', '', [
              el('div', 'cso-edu-actions', [regBadge(it.http_method, it.http_method), el('span', 'cso-edu-mono', it.endpoint_path)]),
              el('div', 'cso-edu-muted', `${it.endpoint_code} · ${it.rate_limit_tier}`)
            ]),
            el('td', '', it.domain_suite),
            el('td', '', [regBadge(it.auth_guard, it.auth_guard), el('div', 'cso-edu-mono', it.cache_strategy)]),
            el('td', '', regBadge(it.contract_status, it.contract_status)),
            el('td', '', el('div', 'cso-edu-actions', [
              btn('Edit', 'cso-edu-btn-sm', () => openEndpointDrawer(it)),
              btn(it.contract_status === 'verified_live' ? 'Needs Audit' : 'Verify Live', 'cso-edu-btn-sm', async () => {
                try {
                  const next = it.contract_status === 'verified_live' ? 'needs_audit' : 'verified_live';
                  await api(`${API}/api-endpoints/${encodeURIComponent(it.id)}/status`, 'PATCH', { contract_status: next });
                  toast(`Updated ${it.endpoint_code} -> ${next}`, 'success');
                  draw();
                } catch (e) { toast(e.message, 'error'); }
              })
            ]))
          ]);
          tbody.appendChild(row);
        });
      }
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openEndpointDrawer(item) {
      const isEdit = Boolean(item);
      const codeIn = textInput('text', item ? item.endpoint_code : '', 'API-007 (auto if blank)');
      if (isEdit) codeIn.disabled = true;
      const methodSel = selectOf([['GET', 'GET'], ['POST', 'POST'], ['PUT', 'PUT'], ['PATCH', 'PATCH'], ['DELETE', 'DELETE']], item ? item.http_method : 'GET');
      const pathIn = textInput('text', item ? item.endpoint_path : '', '/api/...');
      const suiteIn = textInput('text', item ? item.domain_suite : 'Public Edge APIs', 'Domain suite');
      const guardSel = selectOf([
        ['admin_rbac_csrf', 'admin_rbac_csrf'],
        ['hmac_signature', 'hmac_signature'],
        ['public_edge_cached', 'public_edge_cached'],
        ['public_rate_limited', 'public_rate_limited']
      ], item ? item.auth_guard : 'admin_rbac_csrf');
      const cacheSel = selectOf([
        ['no_store', 'no_store'],
        ['edge_cache_invalidated', 'edge_cache_invalidated'],
        ['sw_stale_while_revalidate', 'sw_stale_while_revalidate']
      ], item ? item.cache_strategy : 'no_store');
      const rateSel = selectOf([
        ['admin_internal', 'admin_internal'],
        ['public_60_rpm', 'public_60_rpm'],
        ['webhook_burst', 'webhook_burst']
      ], item ? item.rate_limit_tier : 'admin_internal');
      const statusSel = selectOf([
        ['verified_live', 'verified_live'],
        ['needs_audit', 'needs_audit'],
        ['deprecated', 'deprecated']
      ], item ? item.contract_status : 'verified_live');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit API Endpoint · ${item.endpoint_code}` : 'Register API Endpoint', [
        field('Endpoint Code', codeIn),
        field('HTTP Method', methodSel),
        field('Endpoint Path', pathIn),
        field('Domain Suite', suiteIn),
        field('Auth Guard', guardSel),
        field('Cache Strategy', cacheSel),
        field('Rate Limit Tier', rateSel),
        field('Contract Status', statusSel)
      ]);
      if (isEdit) attachRevisions(body, '05', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Endpoint' : 'Register Endpoint', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            endpoint_code: codeIn.value.trim() || undefined,
            http_method: methodSel.value,
            endpoint_path: pathIn.value.trim(),
            domain_suite: suiteIn.value.trim(),
            auth_guard: guardSel.value,
            cache_strategy: cacheSel.value,
            rate_limit_tier: rateSel.value,
            contract_status: statusSel.value
          };
          if (isEdit) await api(`${API}/api-endpoints/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/api-endpoints`, 'POST', payload);
          toast('API endpoint saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 06: ADMIN COVERAGE MATRIX ==================== */
  async function renderCoverageMatrix(root) {
    let lastSync = null;

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-19-006', 'Suite-by-suite admin module coverage across all 23 Admin Studio suites (D1-backed & strict CSP).', [
        btn('Recalculate Matrix', '', async () => {
          try {
            const res = await api(`${API}/coverage-matrix/recalculate`, 'POST', {});
            toast(`Recalculated ${res.items ? res.items.length : 23} suites · Overall ${res.overall_coverage_pct}%`, 'success');
            draw();
          } catch (e) { toast(e.message, 'error'); }
        }),
        btn('Run Full 23-Suite Registry & D1 Sync', 'cso-edu-btn-primary', async () => {
          try {
            const d1Res = await api(`${API}/db-entities/introspect-live-d1`, 'POST', {});
            const covRes = await api(`${API}/coverage-matrix/recalculate`, 'POST', {});
            lastSync = {
              suites: covRes.total_suites || (covRes.items ? covRes.items.length : 23),
              implemented: covRes.implemented_modules || 0,
              total: covRes.total_modules || 0,
              pct: covRes.overall_coverage_pct ?? 100,
              tables: d1Res.tables_introspected || 0,
              ts: d1Res.introspected_at_ist || ''
            };
            toast(`Synced ${lastSync.suites} suites (${lastSync.implemented}/${lastSync.total} modules) & ${lastSync.tables} D1 tables`, 'success');
            draw();
          } catch (e) { toast(e.message, 'error'); }
        })
      ]));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/coverage-matrix`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      if (lastSync) {
        root.appendChild(el('div', 'cso-reg-sync-banner', [
          el('strong', '', `Full 23-Suite Registry & D1 Sync Complete (${lastSync.pct}%)`),
          el('span', 'cso-edu-mono', `Suites: ${lastSync.suites} · Modules: ${lastSync.implemented}/${lastSync.total} · Live D1 Tables Introspected: ${lastSync.tables} · ${lastSync.ts}`)
        ]));
      }

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Suite', 'Modules (Impl / Total)', 'D1 & CSP Counts', 'Coverage Progress', 'Release & Status'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        const prog = el('progress', 'cso-reg-progress');
        prog.max = 100;
        prog.value = Number(it.coverage_pct ?? 0);
        const progWrap = el('div', 'cso-reg-progress-wrap', [prog, el('span', 'cso-edu-mono', `${it.coverage_pct ?? 0}%`)]);
        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', '', it.suite_name), el('div', 'cso-edu-mono', it.suite_code)]),
          el('td', 'cso-edu-mono', `${it.implemented_modules_count} / ${it.total_modules_count}`),
          el('td', 'cso-edu-mono', `D1: ${it.d1_backed_count} · CSP: ${it.csp_compliant_count}`),
          el('td', '', progWrap),
          el('td', '', [regBadge(it.matrix_status, it.matrix_status), el('div', 'cso-edu-mono', it.release_range || '—')])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    await draw();
  }

  /* ==================== MODULE 07: MISSING ADMIN CONTROLS ==================== */
  async function renderMissingControls(root) {
    let curStatus = '';
    let curSev = '';
    let curQ = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-19-007', 'Audit tracker for un-wired admin controls, severity triage, and resolution sign-off.', [
        btn('+ Log Control Gap', 'cso-edu-btn-primary', () => openGapDrawer(null))
      ]));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/missing-controls?remediation_status=${encodeURIComponent(curStatus)}&severity_tier=${encodeURIComponent(curSev)}&q=${encodeURIComponent(curQ)}`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      const tabs = el('div', 'cso-edu-tabs');
      [
        ['', 'All'], ['open_gap', 'Open Gap'], ['in_development', 'In Development'],
        ['resolved_wired', 'Resolved & Wired'], ['accepted_intentional', 'Accepted']
      ].forEach(([v, l]) => {
        tabs.appendChild(btn(l, `cso-edu-tab ${curStatus === v ? 'is-active' : ''}`, () => { curStatus = v; draw(); }));
      });
      const sevSel = selectOf([['', 'All Severities'], ['p1_high', 'P1 High'], ['p2_medium', 'P2 Medium'], ['p3_enhancement', 'P3 Enhancement']], curSev);
      sevSel.className = 'cso-edu-select';
      sevSel.addEventListener('change', () => { curSev = sevSel.value; draw(); });

      const search = textInput('search', curQ, 'Search gap code, surface area...');
      search.className = 'cso-edu-input';
      const goBtn = btn('Search', '', () => { curQ = search.value.trim(); draw(); });
      search.addEventListener('keydown', ev => { if (ev.key === 'Enter') { curQ = search.value.trim(); draw(); } });
      root.appendChild(el('div', 'cso-edu-toolbar', [tabs, el('div', 'cso-edu-actions', [sevSel, search, goBtn])]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Gap & Surface Area', 'Severity & Suite', 'Target Module', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      const items = data.items || [];
      if (!items.length) {
        tbody.appendChild(el('tr', '', el('td', 'cso-edu-empty', 'No control gaps match this filter.')));
      } else {
        items.forEach(it => {
          const actionBtns = [btn('Edit', 'cso-edu-btn-sm', () => openGapDrawer(it))];
          if (it.remediation_status !== 'resolved_wired') {
            actionBtns.push(btn('Mark Resolved & Wired', 'cso-edu-btn-sm cso-edu-btn-primary', async () => {
              try {
                await api(`${API}/missing-controls/${encodeURIComponent(it.id)}/resolve`, 'PATCH', {});
                toast(`Resolved ${it.gap_code}`, 'success');
                draw();
              } catch (e) { toast(e.message, 'error'); }
            }));
          }
          tbody.appendChild(el('tr', '', [
            el('td', '', [
              el('div', '', it.surface_area),
              el('div', 'cso-edu-muted', `${it.gap_code} · ${it.gap_description_en || ''}`)
            ]),
            el('td', '', [regBadge(it.severity_tier, it.severity_tier), el('div', 'cso-edu-muted', it.domain_suite)]),
            el('td', 'cso-edu-mono', it.recommended_module_target || '—'),
            el('td', '', [regBadge(it.remediation_status, it.remediation_status), it.resolved_by ? el('div', 'cso-edu-muted', `by ${it.resolved_by}`) : el('span', '', '')]),
            el('td', '', el('div', 'cso-edu-actions', actionBtns))
          ]));
        });
      }
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openGapDrawer(item) {
      const isEdit = Boolean(item);
      const codeIn = textInput('text', item ? item.gap_code : '', 'GAP-2026-005 (auto if blank)');
      if (isEdit) codeIn.disabled = true;
      const surfaceIn = textInput('text', item ? item.surface_area : '', 'Surface area needing admin control');
      const suiteIn = textInput('text', item ? item.domain_suite : 'Candidate Portal', 'Domain suite');
      const sevSel = selectOf([['p1_high', 'p1_high'], ['p2_medium', 'p2_medium'], ['p3_enhancement', 'p3_enhancement']], item ? item.severity_tier : 'p2_medium');
      const descIn = textArea(item ? item.gap_description_en : '', 'Description of the missing control...');
      const targetIn = textInput('text', item ? item.recommended_module_target : '', 'module-19-009');
      const statusSel = selectOf([
        ['open_gap', 'open_gap'],
        ['in_development', 'in_development'],
        ['resolved_wired', 'resolved_wired'],
        ['accepted_intentional', 'accepted_intentional']
      ], item ? item.remediation_status : 'open_gap');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Control Gap · ${item.gap_code}` : 'Log Missing Admin Control', [
        field('Gap Code', codeIn),
        field('Surface Area', surfaceIn),
        field('Domain Suite', suiteIn),
        field('Severity Tier', sevSel),
        field('Description', descIn),
        field('Recommended Module Target', targetIn),
        field('Remediation Status', statusSel)
      ]);
      if (isEdit) attachRevisions(body, '07', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Gap' : 'Log Gap', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            gap_code: codeIn.value.trim() || undefined,
            surface_area: surfaceIn.value.trim(),
            domain_suite: suiteIn.value.trim(),
            severity_tier: sevSel.value,
            gap_description_en: descIn.value.trim(),
            recommended_module_target: targetIn.value.trim(),
            remediation_status: statusSel.value
          };
          if (isEdit) await api(`${API}/missing-controls/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/missing-controls`, 'POST', payload);
          toast('Control gap saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 08: FEATURE DEPENDENCIES ==================== */
  async function renderDependencies(root) {
    let curType = '';
    let curHealth = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-19-008', 'Directed dependency graph between CS Odisha features with cycle detection (self-loops & 2-node cycles blocked).', [
        btn('+ Add Dependency Edge', 'cso-edu-btn-primary', () => openDepDrawer(null))
      ]));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/dependencies?dependency_type=${encodeURIComponent(curType)}&health_status=${encodeURIComponent(curHealth)}`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      const tabs = el('div', 'cso-edu-tabs');
      [
        ['', 'All Types'],
        ['requires_d1_schema', 'D1 Schema'],
        ['invalidates_edge_cache', 'Edge Cache'],
        ['consumes_public_config', 'Public Config'],
        ['triggers_webhook_alert', 'Webhook Alert']
      ].forEach(([v, l]) => {
        tabs.appendChild(btn(l, `cso-edu-tab ${curType === v ? 'is-active' : ''}`, () => { curType = v; draw(); }));
      });
      const healthSel = selectOf([
        ['', 'All Health'],
        ['healthy_verified', 'healthy_verified'],
        ['degraded_warning', 'degraded_warning'],
        ['broken_link', 'broken_link']
      ], curHealth);
      healthSel.className = 'cso-edu-select';
      healthSel.addEventListener('change', () => { curHealth = healthSel.value; draw(); });
      root.appendChild(el('div', 'cso-edu-toolbar', [tabs, el('div', 'cso-edu-actions', [healthSel])]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Source -> Target Feature', 'Dependency Type', 'Critical Path', 'Health', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      const items = data.items || [];
      if (!items.length) {
        tbody.appendChild(el('tr', '', el('td', 'cso-edu-empty', 'No dependency edges match this filter.')));
      } else {
        items.forEach(it => {
          tbody.appendChild(el('tr', '', [
            el('td', '', [
              el('div', 'cso-edu-mono', `${it.source_feature_code} -> ${it.target_feature_code}`),
              el('div', 'cso-edu-muted', `${it.dep_code} · ${it.source_feature_name || it.source_feature_code} -> ${it.target_feature_name || it.target_feature_code}`)
            ]),
            el('td', '', regBadge(it.dependency_type, it.dependency_type)),
            el('td', '', Number(it.is_critical_path) === 1 ? regBadge('p1_high', 'Critical Path') : el('span', 'cso-edu-muted', 'Standard')),
            el('td', '', regBadge(it.health_status, it.health_status)),
            el('td', '', el('div', 'cso-edu-actions', [
              btn('Edit', 'cso-edu-btn-sm', () => openDepDrawer(it)),
              btn('Delete', 'cso-edu-btn-sm', async () => {
                try {
                  await api(`${API}/dependencies/${encodeURIComponent(it.id)}`, 'DELETE');
                  toast(`Removed ${it.dep_code}`, 'success');
                  draw();
                } catch (e) { toast(e.message, 'error'); }
              })
            ]))
          ]));
        });
      }
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openDepDrawer(item) {
      const isEdit = Boolean(item);
      const codeIn = textInput('text', item ? item.dep_code : '', 'DEP-006 (auto if blank)');
      if (isEdit) codeIn.disabled = true;
      const srcCodeIn = textInput('text', item ? item.source_feature_code : '', 'FEAT-001');
      if (isEdit) srcCodeIn.disabled = true;
      const srcNameIn = textInput('text', item ? item.source_feature_name : '', 'Source feature name');
      if (isEdit) srcNameIn.disabled = true;
      const tgtCodeIn = textInput('text', item ? item.target_feature_code : '', 'FEAT-002');
      if (isEdit) tgtCodeIn.disabled = true;
      const tgtNameIn = textInput('text', item ? item.target_feature_name : '', 'Target feature name');
      if (isEdit) tgtNameIn.disabled = true;
      const typeSel = selectOf([
        ['requires_d1_schema', 'requires_d1_schema'],
        ['invalidates_edge_cache', 'invalidates_edge_cache'],
        ['consumes_public_config', 'consumes_public_config'],
        ['triggers_webhook_alert', 'triggers_webhook_alert']
      ], item ? item.dependency_type : 'requires_d1_schema');
      const healthSel = selectOf([
        ['healthy_verified', 'healthy_verified'],
        ['degraded_warning', 'degraded_warning'],
        ['broken_link', 'broken_link']
      ], item ? item.health_status : 'healthy_verified');
      const critChk = checkboxOf(item ? Number(item.is_critical_path) === 1 : true, 'Critical Path Dependency');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Dependency · ${item.dep_code}` : 'Register Feature Dependency Edge', [
        field('Dependency Code', codeIn),
        field('Source Feature Code', srcCodeIn),
        field('Source Feature Name', srcNameIn),
        field('Target Feature Code', tgtCodeIn),
        field('Target Feature Name', tgtNameIn),
        field('Dependency Type', typeSel),
        field('Health Status', healthSel),
        critChk.wrap
      ]);
      if (isEdit) attachRevisions(body, '08', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Dependency' : 'Register Edge', 'cso-edu-btn-primary', async () => {
        try {
          if (isEdit) {
            await api(`${API}/dependencies/${encodeURIComponent(item.id)}`, 'PUT', {
              dependency_type: typeSel.value,
              health_status: healthSel.value,
              is_critical_path: critChk.cb.checked
            });
          } else {
            await api(`${API}/dependencies`, 'POST', {
              dep_code: codeIn.value.trim() || undefined,
              source_feature_code: srcCodeIn.value.trim(),
              source_feature_name: srcNameIn.value.trim(),
              target_feature_code: tgtCodeIn.value.trim(),
              target_feature_name: tgtNameIn.value.trim(),
              dependency_type: typeSel.value,
              health_status: healthSel.value,
              is_critical_path: critChk.cb.checked
            });
          }
          toast('Dependency edge saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  window.CSORegistryBatch2 = {
    async render(moduleId, root) {
      if (!MODULES[moduleId] || !root) return false;
      root.className = 'cso-edu-shell';
      if (moduleId === 'module-19-005') await renderApiEndpoints(root);
      else if (moduleId === 'module-19-006') await renderCoverageMatrix(root);
      else if (moduleId === 'module-19-007') await renderMissingControls(root);
      else if (moduleId === 'module-19-008') await renderDependencies(root);
      return true;
    }
  };
})();
