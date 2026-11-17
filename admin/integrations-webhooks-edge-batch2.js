/* Integrations, Webhooks & Cloudflare Edge Suite Batch 2 (05-08) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/integrations';
  const MODULES = {
    'module-int-005': { num: '05', title: 'WhatsApp Business API & Template Notifications' },
    'module-int-006': { num: '06', title: 'Public API Gateway & Token Rate Limiting (IP/Token Tiering)' },
    'module-int-007': { num: '07', title: 'Inbound Webhook Receivers & Signature Verification (HMAC)' },
    'module-int-008': { num: '08', title: 'Cloudflare D1 Database Sync & State Replication' }
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

  function intBadge(val, label) {
    const safe = String(val || 'unknown').replace(/[^a-z0-9_-]/gi, '');
    return el('span', `cso-int-badge is-${safe}`, label || val || '—');
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
      el('div', 'cso-edu-kicker', `Integrations, Webhooks & Cloudflare Edge · Module ${info.num} of 11`),
      el('h2', 'cso-edu-title', info.title),
      el('p', 'cso-edu-sub', subtitle)
    );
    const right = el('div', 'cso-edu-actions');
    (extraBtns || []).forEach(b => right.appendChild(b));
    bar.append(left, right);
    return bar;
  }

  function renderKpiStrip(ov) {
    const strip = el('div', 'cso-int-kpi-strip');
    const cards = [
      ['Active WABA Connectors', ov.active_whatsapp_connectors ?? 0],
      ['Gateway Tokens & 24h Req', `${ov.active_gateway_tokens ?? 0} · ${ov.gateway_requests_24h ?? 0}`],
      ['Verifying HMAC Receivers', ov.verifying_inbound_receivers ?? 0],
      ['Consistent D1 Groups', ov.consistent_d1_groups ?? 0]
    ];
    cards.forEach(([lbl, val]) => {
      const c = el('div', 'cso-int-kpi-card');
      c.append(el('span', 'cso-int-kpi-label', lbl), el('span', 'cso-int-kpi-val', String(val)));
      strip.appendChild(c);
    });
    return strip;
  }

  /* ==================== MODULE 05: WHATSAPP BUSINESS API ==================== */
  async function renderWhatsapp(root) {
    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-int-005', 'Meta WhatsApp Cloud API (v21.0) bilingual templates with hashed system tokens & daily tier quotas.', [
        btn('+ Add WABA Connector', 'cso-edu-btn-primary', () => openWabDrawer(null))
      ]));

      const [ov, data] = await Promise.all([api(`${API}/overview`), api(`${API}/whatsapp-connectors`)]);
      root.appendChild(renderKpiStrip(ov));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code & Meta IDs', 'Template & Language', 'Daily Tier Usage', 'Quality & Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        const lim = Math.max(1, Number(it.daily_tier_limit || 10000));
        const sent = Math.min(lim, Number(it.sent_today_count || 0));
        const prog = document.createElement('progress');
        prog.className = 'cso-int-parity-bar';
        prog.max = lim;
        prog.value = sent;

        tbody.appendChild(el('tr', '', [
          el('td', '', [
            el('div', 'cso-edu-mono', `${it.connector_code} (${it.graph_api_version})`),
            el('span', 'cso-int-secret-badge', it.access_token_masked_hint)
          ]),
          el('td', '', [el('strong', '', it.template_name), el('div', 'cso-edu-muted', `Language: ${it.lang_code.toUpperCase()}`)]),
          el('td', '', [prog, el('div', 'cso-edu-mono', `${sent} / ${lim} today`)]),
          el('td', '', [intBadge(it.quality_rating, it.quality_rating), el('div', '', intBadge(it.connector_status, it.connector_status))]),
          el('td', 'cso-edu-row-actions', [
            btn('Send WABA Test', 'cso-edu-btn-sm cso-edu-btn-primary', async () => {
              try {
                await api(`${API}/whatsapp-connectors/${encodeURIComponent(it.id)}/test-send`, 'POST', {});
                toast(`Dispatched WABA test (${it.template_name})`, 'success');
                draw();
              } catch (e) { toast(e.message, 'error'); }
            }),
            btn('Edit', 'cso-edu-btn-sm', () => openWabDrawer(it))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openWabDrawer(item) {
      const isEdit = Boolean(item);
      const codeIn = textInput('text', item ? item.connector_code : '', 'WAB-CONN-003 (auto if blank)');
      if (isEdit) codeIn.disabled = true;
      const tmplIn = textInput('text', item ? item.template_name : '', 'cso_admit_card_instant_or');
      const langSel = selectOf([['or', 'or (Odia)'], ['en', 'en (English)']], item ? item.lang_code : 'or');
      const tierIn = textInput('number', item ? String(item.daily_tier_limit ?? 10000) : '10000');
      const tokIn = textInput('password', '', isEdit ? 'Leave blank to keep existing token hash' : 'Meta WABA system user token (hashed SHA-256)');
      const qualSel = selectOf([['GREEN_HIGH', 'GREEN_HIGH'], ['YELLOW_MEDIUM', 'YELLOW_MEDIUM'], ['RED_LOW', 'RED_LOW']], item ? item.quality_rating : 'GREEN_HIGH');
      const statusSel = selectOf([['connected_live', 'connected_live'], ['sandbox_test', 'sandbox_test'], ['paused', 'paused']], item ? item.connector_status : 'connected_live');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit WABA · ${item.connector_code}` : 'Add WABA Connector', [
        field('Connector Code', codeIn),
        field('Template Name', tmplIn),
        field('Language', langSel),
        field('Daily Tier Limit', tierIn),
        field('System Token (SHA-256 hashed)', tokIn),
        field('Quality Rating', qualSel),
        field('Connector Status', statusSel)
      ]);
      if (isEdit) attachRevisions(body, '05', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Connector' : 'Create Connector', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            connector_code: codeIn.value.trim() || undefined,
            template_name: tmplIn.value.trim(),
            lang_code: langSel.value,
            daily_tier_limit: parseInt(tierIn.value || '10000', 10) || 10000,
            access_token: tokIn.value.trim() || undefined,
            quality_rating: qualSel.value,
            connector_status: statusSel.value
          };
          if (isEdit) await api(`${API}/whatsapp-connectors/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/whatsapp-connectors`, 'POST', payload);
          toast('WABA connector saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 06: PUBLIC API GATEWAY & RATE LIMITING ==================== */
  async function renderApiGateway(root) {
    let curTier = '';
    let oneTimeToken = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-int-006', 'Tiered Public API Gateway bearer tokens (SHA-256 hashed) with RPM & burst limits.', [
        btn('+ Issue API Token', 'cso-edu-btn-primary', () => openIssueDrawer()),
        btn('Simulate Rate Limit', '', () => openSimDrawer())
      ]));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/api-gateway?tier_level=${encodeURIComponent(curTier)}`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      if (oneTimeToken) {
        const banner = el('div', 'cso-int-reveal-banner', [
          el('strong', '', 'One-Time Bearer Token Issued (copy now — never shown again):'),
          el('div', 'cso-int-reveal-code', oneTimeToken)
        ]);
        root.appendChild(banner);
      }

      const tabs = el('div', 'cso-edu-tabs');
      [
        ['', 'All'], ['public_ip_anon', 'Public IP Anon'],
        ['partner_standard', 'Partner Standard'], ['institutional_pro', 'Institutional Pro']
      ].forEach(([v, l]) => {
        tabs.appendChild(btn(l, `cso-edu-tab ${curTier === v ? 'is-active' : ''}`, () => { curTier = v; draw(); }));
      });
      root.appendChild(el('div', 'cso-edu-toolbar', [tabs]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code & Client App', 'Tier & Masked Prefix', 'RPM / Burst', '24h Traffic & 429s', 'Status & Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', 'cso-edu-mono', it.token_code), el('strong', '', it.client_app_name)]),
          el('td', '', [el('div', '', intBadge(it.tier_level, it.tier_level)), el('span', 'cso-int-secret-badge', it.token_prefix_masked)]),
          el('td', 'cso-edu-mono', `${it.rate_limit_rpm} RPM / ${it.burst_limit} burst`),
          el('td', 'cso-edu-mono', `${it.requests_24h_count} req · ${it.rate_limited_429_count} (429)`),
          el('td', 'cso-edu-row-actions', [
            intBadge(it.token_status, it.token_status),
            it.token_status !== 'revoked' ? btn('Revoke Token', 'cso-edu-btn-sm', async () => {
              try {
                await api(`${API}/api-gateway/${encodeURIComponent(it.id)}/revoke`, 'PATCH', {});
                toast(`Revoked ${it.token_code}`, 'success');
                draw();
              } catch (e) { toast(e.message, 'error'); }
            }) : null
          ].filter(Boolean))
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openIssueDrawer() {
      const appIn = textInput('text', '', 'Client application name');
      const tierSel = selectOf([
        ['public_ip_anon', 'public_ip_anon'], ['partner_standard', 'partner_standard'],
        ['institutional_pro', 'institutional_pro'], ['internal_service', 'internal_service']
      ], 'partner_standard');
      const rpmIn = textInput('number', '300');
      const burstIn = textInput('number', '60');
      const scopesIn = textInput('text', 'read:events, read:seo', 'Comma-separated scopes');

      const { backdrop, foot } = openDrawer('Issue Public API Gateway Token', [
        field('Client App Name', appIn),
        field('Tier Level', tierSel),
        field('Rate Limit (RPM)', rpmIn),
        field('Burst Limit', burstIn),
        field('Allowed Scopes', scopesIn)
      ]);
      foot.appendChild(btn('Issue Token', 'cso-edu-btn-primary', async () => {
        try {
          const res = await api(`${API}/api-gateway`, 'POST', {
            client_app_name: appIn.value.trim(),
            tier_level: tierSel.value,
            rate_limit_rpm: parseInt(rpmIn.value || '300', 10) || 300,
            burst_limit: parseInt(burstIn.value || '60', 10) || 60,
            allowed_scopes: scopesIn.value.split(',').map(s => s.trim()).filter(Boolean)
          });
          oneTimeToken = res.one_time_plain_token || '';
          toast('Gateway token issued', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    async function openSimDrawer() {
      const data = await api(`${API}/api-gateway`);
      const opts = (data.items || []).map(t => [t.id, `${t.token_code} · ${t.client_app_name} (${t.rate_limit_rpm} RPM)`]);
      const tokSel = selectOf(opts, opts[0] ? opts[0][0] : '');
      const rpmIn = textInput('number', '350', 'Simulated RPM');
      const outBox = el('div', 'cso-edu-muted', 'Run simulation to test 200 vs 429 response.');
      const { foot } = openDrawer('Simulate API Gateway Rate Limit', [
        field('Gateway Token', tokSel),
        field('Simulated Requests/Min (RPM)', rpmIn),
        outBox
      ]);
      foot.appendChild(btn('Run Simulation', 'cso-edu-btn-primary', async () => {
        try {
          const res = await api(`${API}/api-gateway/simulate-rate-limit`, 'POST', {
            token_id: tokSel.value,
            simulated_rpm: parseInt(rpmIn.value || '0', 10) || 0
          });
          outBox.textContent = `HTTP ${res.http_status} · allowed=${res.allowed} (${res.simulated_rpm}/${res.rate_limit_rpm} RPM)`;
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 07: INBOUND HMAC RECEIVERS ==================== */
  async function renderInboundReceivers(root) {
    let oneTimeSecret = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-int-007', 'Constant-time HMAC-SHA256 inbound webhook verification at /api/webhooks/inbound/:slug.', [
        btn('+ Register Inbound Receiver', 'cso-edu-btn-primary', () => openRecDrawer(null))
      ]));

      const [ov, data] = await Promise.all([api(`${API}/overview`), api(`${API}/inbound-receivers`)]);
      root.appendChild(renderKpiStrip(ov));

      if (oneTimeSecret) {
        root.appendChild(el('div', 'cso-int-reveal-banner', [
          el('strong', '', 'One-Time Inbound Signing Secret (copy now — never shown again):'),
          el('div', 'cso-int-reveal-code', oneTimeSecret)
        ]));
      }

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Slug & Provider', 'Endpoint URL & Header', 'Verified vs Rejected', 'Secret Hint & Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        const endpoint = `${window.location.origin}/api/webhooks/inbound/${it.receiver_slug}`;
        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', 'cso-edu-mono', it.receiver_slug), el('strong', '', it.provider_name)]),
          el('td', '', [el('div', 'cso-edu-mono', endpoint), el('div', 'cso-edu-muted', `${it.signature_header} (${it.hmac_algorithm})`)]),
          el('td', 'cso-edu-mono', `Verified: ${it.verified_events_count} · Rejected: ${it.rejected_sig_count}`),
          el('td', '', [el('span', 'cso-int-secret-badge', it.signing_secret_masked_hint), el('div', '', intBadge(it.receiver_status, it.receiver_status))]),
          el('td', 'cso-edu-row-actions', [
            btn('Copy Endpoint', 'cso-edu-btn-sm', async () => {
              try { await navigator.clipboard.writeText(endpoint); toast('Copied endpoint URL', 'success'); }
              catch { toast(endpoint, 'info'); }
            }),
            btn('Test HMAC Verification', 'cso-edu-btn-sm cso-edu-btn-primary', () => openVerifyDrawer(it)),
            btn('Edit', 'cso-edu-btn-sm', () => openRecDrawer(it))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openRecDrawer(item) {
      const isEdit = Boolean(item);
      const slugIn = textInput('text', item ? item.receiver_slug : '', 'e.g. cashfree-payout-events');
      if (isEdit) slugIn.disabled = true;
      const provIn = textInput('text', item ? item.provider_name : '', 'Provider name');
      const hdrIn = textInput('text', item ? item.signature_header : 'X-CSO-Signature-256');
      const statusSel = selectOf([['active_verifying', 'active_verifying'], ['paused', 'paused']], item ? item.receiver_status : 'active_verifying');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Receiver · ${item.receiver_slug}` : 'Register Inbound Receiver', [
        field('Receiver Slug', slugIn),
        field('Provider Name', provIn),
        field('Signature Header', hdrIn),
        field('Receiver Status', statusSel)
      ]);
      if (isEdit) attachRevisions(body, '07', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Receiver' : 'Register Receiver', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            receiver_slug: slugIn.value.trim(),
            provider_name: provIn.value.trim(),
            signature_header: hdrIn.value.trim(),
            receiver_status: statusSel.value
          };
          if (isEdit) await api(`${API}/inbound-receivers/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else {
            const res = await api(`${API}/inbound-receivers`, 'POST', payload);
            oneTimeSecret = res.one_time_signing_secret || '';
          }
          toast('Inbound receiver saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    function openVerifyDrawer(item) {
      const payloadIn = textInput('text', '{"event":"sample.ping","ok":true}', 'Sample JSON payload');
      const outBox = el('div', 'cso-edu-mono', 'Click Verify to test constant-time HMAC-SHA256.');
      const { foot } = openDrawer(`Test HMAC Verification · ${item.receiver_slug}`, [
        field('Sample Payload', payloadIn),
        outBox
      ]);
      foot.appendChild(btn('Verify HMAC-SHA256', 'cso-edu-btn-primary', async () => {
        try {
          const res = await api(`${API}/inbound-receivers/${encodeURIComponent(item.id)}/verify-sample`, 'POST', {
            payload: payloadIn.value
          });
          outBox.textContent = `verified=${res.verified} · ${res.signature_header}: ${res.sample_signature}`;
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 08: D1 DATABASE SYNC & REPLICATION ==================== */
  async function renderD1Sync(root) {
    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-int-008', 'Live D1 table row-count verification & deterministic SHA-256 schema state checksums.', [
        btn('Run Live D1 Checksum & Sync Audit', 'cso-edu-btn-primary', async () => {
          try {
            const res = await api(`${API}/d1-sync/run-checksum-audit`, 'POST', { table_group: 'integrations_audit_state' });
            toast(`Checksum verified (${res.item.tables_covered_count} tables, ${res.item.total_rows_verified} rows)`, 'success');
            draw();
          } catch (e) { toast(e.message, 'error'); }
        })
      ]));

      const [ov, data] = await Promise.all([api(`${API}/overview`), api(`${API}/d1-sync`)]);
      root.appendChild(renderKpiStrip(ov));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Snapshot & Region', 'Table Group', 'Tables & Rows Verified', 'SHA-256 State Checksum', 'Status & Verified (IST)'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', 'cso-edu-mono', it.snapshot_code), el('div', 'cso-edu-muted', `${it.replica_region} (${it.replication_lag_ms}ms)`)]),
          el('td', 'cso-edu-mono', it.table_group),
          el('td', 'cso-edu-mono', `${it.tables_covered_count} tables · ${it.total_rows_verified} rows`),
          el('td', '', el('span', 'cso-int-secret-badge', `${String(it.schema_checksum_sha256 || '').slice(0, 16)}…`)),
          el('td', '', [intBadge(it.sync_status, it.sync_status), el('div', 'cso-edu-mono', it.verified_at_ist)])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    await draw();
  }

  window.CSOIntegrationsBatch2 = {
    async render(moduleId, root) {
      if (!MODULES[moduleId] || !root) return false;
      root.className = 'cso-edu-shell';
      if (moduleId === 'module-int-005') await renderWhatsapp(root);
      else if (moduleId === 'module-int-006') await renderApiGateway(root);
      else if (moduleId === 'module-int-007') await renderInboundReceivers(root);
      else if (moduleId === 'module-int-008') await renderD1Sync(root);
      return true;
    }
  };
})();
