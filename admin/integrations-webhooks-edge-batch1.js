/* Integrations, Webhooks & Cloudflare Edge Suite Batch 1 (01-04) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/integrations';
  const MODULES = {
    'module-int-001': { num: '01', title: 'Cloudflare R2 Bucket Asset Mirroring & Storage Sync' },
    'module-int-002': { num: '02', title: 'Cloudflare Edge Cache Purging & Zone Invalidation' },
    'module-int-003': { num: '03', title: 'Outbound Webhook Dispatcher & Event Subscriptions' },
    'module-int-004': { num: '04', title: 'Telegram Broadcast Bot & Channel Alert Automation' }
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

  function textareaOf(value, placeholder) {
    const t = el('textarea', 'cso-edu-textarea');
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

  function intBadge(val, label) {
    const safe = String(val || 'unknown').replace(/[^a-z0-9_-]/gi, '');
    return el('span', `cso-int-badge is-${safe}`, label || val || '—');
  }

  function formatBytes(bytes) {
    const n = Number(bytes || 0);
    if (n < 1024) return `${n} B`;
    if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1048576).toFixed(1)} MB`;
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
      ['Synced R2 Objects', `${ov.synced_r2_objects ?? 0} (${formatBytes(ov.total_r2_bytes_synced)})`],
      ['Edge Purges Executed', ov.edge_purges_executed ?? 0],
      ['Active Webhooks & Success', `${ov.active_outbound_webhooks ?? 0} · ${ov.webhook_delivery_success_rate_pct ?? 100}%`],
      ['Active Telegram Rules', ov.active_telegram_automations ?? 0]
    ];
    cards.forEach(([lbl, val]) => {
      const c = el('div', 'cso-int-kpi-card');
      c.append(el('span', 'cso-int-kpi-label', lbl), el('span', 'cso-int-kpi-val', String(val)));
      strip.appendChild(c);
    });
    return strip;
  }

  /* ==================== MODULE 01: R2 BUCKET SYNC ==================== */
  async function renderR2Sync(root) {
    let curBucket = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-int-001', 'Cloudflare R2 bucket object parity, APAC secondary mirroring & checksum verification.', [
        btn('+ Add R2 Sync Rule', 'cso-edu-btn-primary', () => openR2Drawer(null))
      ]));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/r2-sync?bucket_name=${encodeURIComponent(curBucket)}`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      const tabs = el('div', 'cso-edu-tabs');
      [
        ['', 'All'], ['csodisha-assets', 'csodisha-assets'],
        ['csodisha-pyq-pdfs', 'csodisha-pyq-pdfs'], ['csodisha-static-backup', 'csodisha-static-backup']
      ].forEach(([v, l]) => {
        tabs.appendChild(btn(l, `cso-edu-tab ${curBucket === v ? 'is-active' : ''}`, () => { curBucket = v; draw(); }));
      });
      root.appendChild(el('div', 'cso-edu-toolbar', [tabs]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code & Bucket', 'Prefix & Target', 'Object Parity', 'Status & Last Sync (IST)', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        const scanned = Math.max(1, Number(it.objects_scanned || 1));
        const mirrored = Math.min(scanned, Number(it.objects_mirrored || 0));
        const prog = document.createElement('progress');
        prog.className = `cso-int-parity-bar ${it.sync_status === 'drift_detected' ? 'is-drift' : ''}`.trim();
        prog.max = scanned;
        prog.value = mirrored;

        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', 'cso-edu-mono', it.sync_code), el('div', 'cso-edu-muted', it.bucket_name)]),
          el('td', '', [el('div', 'cso-edu-mono', it.prefix_path), el('div', 'cso-edu-muted', it.mirror_target)]),
          el('td', '', [prog, el('div', 'cso-edu-mono', `${mirrored}/${scanned} · ${formatBytes(it.total_bytes_synced)}`)]),
          el('td', '', [intBadge(it.sync_status, it.sync_status), el('div', 'cso-edu-mono', it.last_synced_at_ist || '—')]),
          el('td', 'cso-edu-row-actions', [
            btn('Run R2 Mirror Sync', 'cso-edu-btn-sm cso-edu-btn-primary', async () => {
              try {
                await api(`${API}/r2-sync/${encodeURIComponent(it.id)}/run-sync`, 'POST', {});
                toast(`R2 mirror synced (${it.sync_code})`, 'success');
                draw();
              } catch (e) { toast(e.message, 'error'); }
            }),
            btn('Edit', 'cso-edu-btn-sm', () => openR2Drawer(it))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openR2Drawer(item) {
      const isEdit = Boolean(item);
      const codeIn = textInput('text', item ? item.sync_code : '', 'R2S-2026-0004 (auto if blank)');
      if (isEdit) codeIn.disabled = true;
      const bucketSel = selectOf([
        ['csodisha-assets', 'csodisha-assets'], ['csodisha-pyq-pdfs', 'csodisha-pyq-pdfs'], ['csodisha-static-backup', 'csodisha-static-backup']
      ], item ? item.bucket_name : 'csodisha-assets');
      const prefixIn = textInput('text', item ? item.prefix_path : '/study-library/pdfs/', '/prefix/');
      const targetSel = selectOf([
        ['r2_secondary_apac', 'r2_secondary_apac'], ['edge_kv_manifest', 'edge_kv_manifest'], ['public_cdn_origin', 'public_cdn_origin']
      ], item ? item.mirror_target : 'r2_secondary_apac');
      const statusSel = selectOf([
        ['synced_healthy', 'synced_healthy'], ['sync_queued', 'sync_queued'], ['drift_detected', 'drift_detected'], ['paused', 'paused']
      ], item ? item.sync_status : 'sync_queued');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit R2 Sync · ${item.sync_code}` : 'Add R2 Sync Rule', [
        field('Sync Code', codeIn),
        field('Bucket Name', bucketSel),
        field('Prefix Path', prefixIn),
        field('Mirror Target', targetSel),
        field('Sync Status', statusSel)
      ]);
      if (isEdit) attachRevisions(body, '01', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Sync Rule' : 'Create Sync Rule', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            sync_code: codeIn.value.trim() || undefined,
            bucket_name: bucketSel.value,
            prefix_path: prefixIn.value.trim(),
            mirror_target: targetSel.value,
            sync_status: statusSel.value
          };
          if (isEdit) await api(`${API}/r2-sync/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/r2-sync`, 'POST', payload);
          toast('R2 sync rule saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 02: CLOUDFLARE EDGE CACHE PURGING ==================== */
  async function renderCachePurge(root) {
    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-int-002', 'Instant Cloudflare Edge Cache invalidation across SEO, Events & Marketing routes.', [
        btn('+ Execute Edge Purge', 'cso-edu-btn-primary', () => openPurgeDrawer(''))
      ]));

      const [ov, data] = await Promise.all([api(`${API}/overview`), api(`${API}/cache-purge`)]);
      root.appendChild(renderKpiStrip(ov));

      const presetRow = el('div', 'cso-int-preset-row', [el('span', 'cso-edu-label', 'Quick Edge Purge Presets:')]);
      ['/api/seo/*', '/api/events/upcoming', '/api/marketing/*'].forEach(pattern => {
        presetRow.appendChild(btn(`Purge ${pattern}`, 'cso-edu-btn-sm', async () => {
          try {
            const res = await api(`${API}/cache-purge/execute`, 'POST', { purge_scope: 'url_prefix', target_pattern: pattern });
            toast(`Purged ${res.item.urls_invalidated_count} edge URL(s) for ${pattern}`, 'success');
            draw();
          } catch (e) { toast(e.message, 'error'); }
        }));
      });
      presetRow.appendChild(btn('Custom URL/Prefix', 'cso-edu-btn-sm', () => openPurgeDrawer('/study-library/*')));
      root.appendChild(el('div', 'cso-edu-toolbar', [presetRow]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Purge Code & Scope', 'Target Pattern', 'Zone & URLs Purged', 'Status', 'Triggered By & IST Time'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', 'cso-edu-mono', it.purge_code), el('div', 'cso-edu-muted', it.purge_scope)]),
          el('td', 'cso-edu-mono', it.target_pattern),
          el('td', '', [el('span', 'cso-int-secret-badge', it.zone_identifier_masked), el('div', 'cso-edu-mono', `${it.urls_invalidated_count} URL(s)`)]),
          el('td', '', intBadge(it.purge_status, it.purge_status)),
          el('td', '', [el('div', '', it.triggered_by), el('div', 'cso-edu-mono', it.created_at_ist)])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openPurgeDrawer(defaultPattern) {
      const scopeSel = selectOf([
        ['url_prefix', 'url_prefix'], ['exact_urls', 'exact_urls'],
        ['portal_tag', 'portal_tag'], ['full_api_cache', 'full_api_cache']
      ], 'url_prefix');
      const patIn = textInput('text', defaultPattern || '/api/events/upcoming', '/api/seo/*');
      const { backdrop, foot } = openDrawer('Execute Cloudflare Edge Cache Purge', [
        field('Purge Scope', scopeSel),
        field('Target Pattern / URL', patIn)
      ]);
      foot.appendChild(btn('Purge Edge Now', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/cache-purge/execute`, 'POST', { purge_scope: scopeSel.value, target_pattern: patIn.value.trim() });
          toast('Edge cache purged', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 03: OUTBOUND WEBHOOK DISPATCHER ==================== */
  async function renderOutboundWebhooks(root) {
    let curStatus = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-int-003', 'SSRF-guarded HTTPS outbound webhooks with SHA-256 HMAC signing & masked secrets.', [
        btn('+ Register Webhook', 'cso-edu-btn-primary', () => openWebhookDrawer(null))
      ]));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/outbound-webhooks?subscription_status=${encodeURIComponent(curStatus)}`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      const tabs = el('div', 'cso-edu-tabs');
      [['', 'All'], ['active_live', 'Active Live'], ['paused', 'Paused'], ['circuit_open', 'Circuit Open']].forEach(([v, l]) => {
        tabs.appendChild(btn(l, `cso-edu-tab ${curStatus === v ? 'is-active' : ''}`, () => { curStatus = v; draw(); }));
      });
      root.appendChild(el('div', 'cso-edu-toolbar', [tabs]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code & Subscriber', 'HTTPS Target & Events', 'HMAC Hint & Delivery', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        const chips = el('div', 'cso-int-chip-row');
        (it.subscribed_events || []).forEach(evName => chips.appendChild(el('span', 'cso-int-chip', evName)));

        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', 'cso-edu-mono', it.webhook_code), el('strong', '', it.subscriber_name)]),
          el('td', '', [el('div', 'cso-edu-mono', it.target_url), chips]),
          el('td', '', [
            el('span', 'cso-int-secret-badge', it.hmac_secret_masked_hint),
            el('div', 'cso-edu-mono', `OK: ${it.success_count} · Err: ${it.failure_count} · HTTP ${it.last_http_status}`)
          ]),
          el('td', '', intBadge(it.subscription_status, it.subscription_status)),
          el('td', 'cso-edu-row-actions', [
            btn('Send Signed Test Ping', 'cso-edu-btn-sm cso-edu-btn-primary', async () => {
              try {
                const res = await api(`${API}/outbound-webhooks/${encodeURIComponent(it.id)}/test-dispatch`, 'POST', {});
                toast(`Signed ping OK (${res.signature_header})`, 'success');
                draw();
              } catch (e) { toast(e.message, 'error'); }
            }),
            btn('Edit', 'cso-edu-btn-sm', () => openWebhookDrawer(it))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openWebhookDrawer(item) {
      const isEdit = Boolean(item);
      const codeIn = textInput('text', item ? item.webhook_code : '', 'WHK-OUT-003 (auto if blank)');
      if (isEdit) codeIn.disabled = true;
      const nameIn = textInput('text', item ? item.subscriber_name : '', 'Subscriber name');
      const urlIn = textInput('url', item ? item.target_url : '', 'https://hooks.csodisha.com/events');
      const evIn = textInput('text', item ? (item.subscribed_events || []).join(', ') : 'exam.admit_card_live, job.deadline_closing', 'Comma-separated events');
      const secIn = textInput('password', '', isEdit ? 'Leave blank to keep existing secret' : 'Optional signing secret (auto-generated if blank)');
      const toutIn = textInput('number', item ? String(item.delivery_timeout_ms ?? 5000) : '5000');
      const statusSel = selectOf([['active_live', 'active_live'], ['paused', 'paused'], ['circuit_open', 'circuit_open']], item ? item.subscription_status : 'active_live');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Webhook · ${item.webhook_code}` : 'Register Outbound Webhook', [
        field('Webhook Code', codeIn),
        field('Subscriber Name', nameIn),
        field('Public HTTPS Target URL (SSRF-guarded)', urlIn),
        field('Subscribed Events (comma-separated)', evIn),
        field('Signing Secret (hashed via SHA-256)', secIn),
        field('Delivery Timeout (ms)', toutIn),
        field('Subscription Status', statusSel)
      ]);
      if (isEdit) attachRevisions(body, '03', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Webhook' : 'Register Webhook', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            webhook_code: codeIn.value.trim() || undefined,
            subscriber_name: nameIn.value.trim(),
            target_url: urlIn.value.trim(),
            subscribed_events: evIn.value.split(',').map(s => s.trim()).filter(Boolean),
            signing_secret: secIn.value.trim() || undefined,
            delivery_timeout_ms: parseInt(toutIn.value || '5000', 10) || 5000,
            subscription_status: statusSel.value
          };
          if (isEdit) await api(`${API}/outbound-webhooks/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/outbound-webhooks`, 'POST', payload);
          toast('Outbound webhook saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 04: TELEGRAM BOT AUTOMATIONS ==================== */
  async function renderTelegramAutomations(root) {
    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-int-004', 'Bilingual EN & ଓଡ଼ିଆ Telegram channel broadcast rules with masked bot token hints.', [
        btn('+ Add Bot Automation', 'cso-edu-btn-primary', () => openTgDrawer(null))
      ]));

      const [ov, data] = await Promise.all([api(`${API}/overview`), api(`${API}/telegram-automations`)]);
      root.appendChild(renderKpiStrip(ov));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Rule & Bot', 'Channel & Trigger Event', 'Bilingual Templates', 'Token Hint & Dispatches', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', 'cso-edu-mono', it.rule_code), el('div', 'cso-edu-muted', it.bot_username)]),
          el('td', '', [el('strong', '', it.channel_handle), el('div', '', intBadge(it.trigger_event, it.trigger_event))]),
          el('td', '', [el('div', '', it.message_template_en), el('div', 'cso-edu-muted', it.message_template_or)]),
          el('td', '', [
            el('span', 'cso-int-secret-badge', it.bot_token_masked_hint),
            el('div', 'cso-edu-mono', `${it.dispatches_count} sent · ${it.last_triggered_at_ist || 'Never'}`)
          ]),
          el('td', 'cso-edu-row-actions', [
            btn('Test Bilingual Bot Dispatch', 'cso-edu-btn-sm cso-edu-btn-primary', async () => {
              try {
                await api(`${API}/telegram-automations/${encodeURIComponent(it.id)}/trigger-test`, 'POST', {});
                toast(`Dispatched test alert to ${it.channel_handle}`, 'success');
                draw();
              } catch (e) { toast(e.message, 'error'); }
            }),
            btn('Edit', 'cso-edu-btn-sm', () => openTgDrawer(it))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openTgDrawer(item) {
      const isEdit = Boolean(item);
      const codeIn = textInput('text', item ? item.rule_code : '', 'TGB-AUTO-003 (auto if blank)');
      if (isEdit) codeIn.disabled = true;
      const botIn = textInput('text', item ? item.bot_username : '@CSOdishaAlertBot');
      const chanIn = textInput('text', item ? item.channel_handle : '@csodisha_official');
      const trigSel = selectOf([
        ['admit_card_released', 'admit_card_released'], ['new_job_notification', 'new_job_notification'],
        ['pyq_pdf_uploaded', 'pyq_pdf_uploaded'], ['scheme_sanction_alert', 'scheme_sanction_alert'],
        ['daily_quiz_digest', 'daily_quiz_digest']
      ], item ? item.trigger_event : 'admit_card_released');
      const tmplEn = textareaOf(item ? item.message_template_en : '', 'English message template');
      const tmplOr = textareaOf(item ? item.message_template_or : '', 'ଓଡ଼ିଆ ସନ୍ଦେଶ ଟେମ୍ପଲେଟ୍');
      const tokIn = textInput('password', '', isEdit ? 'Leave blank to keep masked hint' : 'Bot token (stored as masked hint only)');
      const modeSel = selectOf([['HTML_SAFE', 'HTML_SAFE'], ['MarkdownV2', 'MarkdownV2']], item ? item.parse_mode : 'HTML_SAFE');
      const prevChk = checkboxOf(item ? Number(item.disable_web_preview) === 1 : true, 'Disable Web Page Preview');
      const statusSel = selectOf([['active_live', 'active_live'], ['paused', 'paused']], item ? item.rule_status : 'active_live');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Bot Rule · ${item.rule_code}` : 'Add Telegram Bot Automation', [
        field('Rule Code', codeIn),
        field('Bot Username', botIn),
        field('Channel Handle', chanIn),
        field('Trigger Event', trigSel),
        field('Message Template (EN)', tmplEn),
        field('Message Template (Odia)', tmplOr),
        field('Bot Token (auto-masked)', tokIn),
        field('Parse Mode', modeSel),
        prevChk.wrap,
        field('Rule Status', statusSel)
      ]);
      if (isEdit) attachRevisions(body, '04', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Automation' : 'Create Automation', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            rule_code: codeIn.value.trim() || undefined,
            bot_username: botIn.value.trim(),
            channel_handle: chanIn.value.trim(),
            trigger_event: trigSel.value,
            message_template_en: tmplEn.value.trim(),
            message_template_or: tmplOr.value.trim(),
            bot_token: tokIn.value.trim() || undefined,
            parse_mode: modeSel.value,
            disable_web_preview: prevChk.cb.checked,
            rule_status: statusSel.value
          };
          if (isEdit) await api(`${API}/telegram-automations/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/telegram-automations`, 'POST', payload);
          toast('Telegram automation saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  window.CSOIntegrationsBatch1 = {
    async render(moduleId, root) {
      if (!MODULES[moduleId] || !root) return false;
      root.className = 'cso-edu-shell';
      if (moduleId === 'module-int-001') await renderR2Sync(root);
      else if (moduleId === 'module-int-002') await renderCachePurge(root);
      else if (moduleId === 'module-int-003') await renderOutboundWebhooks(root);
      else if (moduleId === 'module-int-004') await renderTelegramAutomations(root);
      return true;
    }
  };
})();
