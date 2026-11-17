/* Settings & Configuration Batch 4 (13-17) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/settings';
  const MODULES = {
    'module-18-013': { num: '13', title: 'Registration Settings' },
    'module-18-014': { num: '14', title: 'Comment Settings' },
    'module-18-015': { num: '15', title: 'Payment Settings' },
    'module-18-016': { num: '16', title: 'Environment Status' },
    'module-18-017': { num: '17', title: 'Administrative Preferences' }
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

  function checkboxOf(checked, labelText) {
    const wrap = el('label', 'cso-edu-check');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = Boolean(checked);
    wrap.append(cb, document.createTextNode(` ${labelText}`));
    return { wrap, cb };
  }

  function attachRevisions(container, moduleCode, onRestored) {
    const box = el('div', 'cso-edu-rev-list');
    box.appendChild(el('div', 'cso-edu-label', 'Revision History (Rollback)'));
    const list = el('div', 'cso-edu-rev-items');
    box.appendChild(list);
    container.appendChild(box);
    api(`${API}/revisions?module_code=${encodeURIComponent(moduleCode)}&entity_id=primary`).then(d => {
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
      el('div', 'cso-edu-kicker', `Settings & Configuration · Module ${info.num} of 17`),
      el('h2', 'cso-edu-title', info.title),
      el('p', 'cso-edu-sub', subtitle)
    );
    const right = el('div', 'cso-edu-actions');
    (extraBtns || []).forEach(b => right.appendChild(b));
    bar.append(left, right);
    return bar;
  }

  function renderKpiStrip(ov) {
    const s = ov.suite_17 || ov;
    const strip = el('div', 'cso-cfg-kpi-strip');
    const cards = [
      ['Registration Mode', s.registration_mode || 'otp_verified_signup'],
      ['Comment Moderation', s.comment_moderation_mode || 'auto_publish_verified_filter_links'],
      ['Payment & GST', `${s.primary_payment_gateway || 'razorpay_india'} · ${s.gst_rate_pct ?? 18}% GST`],
      ['Suite 01–17 Active', `${s.active_modules || 17} / ${s.total_modules || 17} Active`]
    ];
    cards.forEach(([lbl, val]) => {
      const c = el('div', 'cso-cfg-kpi-card');
      c.append(el('span', 'cso-cfg-kpi-label', lbl), el('span', 'cso-cfg-kpi-val', String(val)));
      strip.appendChild(c);
    });
    return strip;
  }

  /* ==================== MODULE 13: REGISTRATION SETTINGS ==================== */
  async function renderRegistration(root) {
    async function draw() {
      root.textContent = '';
      const [ov, res] = await Promise.all([api(`${API}/overview`), api(`${API}/registration`)]);
      const it = res.item || {};
      const methods = it.auth_methods || [];

      const modeSel = selectOf([
        ['open_self_signup', 'Open Self-Signup'],
        ['otp_verified_signup', 'OTP Verified Signup'],
        ['invite_only', 'Invite Only'],
        ['paused', 'Paused']
      ], it.registration_mode || 'otp_verified_signup');
      const ageIn = textInput('number', String(it.minimum_age_years ?? 16));
      const ttlIn = textInput('number', String(it.session_ttl_hours ?? 168));
      const failIn = textInput('number', String(it.max_failed_login_attempts ?? 5));
      const emailChk = checkboxOf(methods.includes('email_otp'), 'Email OTP');
      const smsChk = checkboxOf(methods.includes('mobile_sms_otp'), 'Mobile SMS OTP');
      const gglChk = checkboxOf(methods.includes('google_oauth'), 'Google OAuth');
      const dpdpChk = checkboxOf(Number(it.require_dpdp_explicit_consent) === 1, 'Require DPDP Act 2023 Explicit Consent (Mandatory)');
      const distChk = checkboxOf(Number(it.collect_home_district_odisha) === 1, 'Collect Home District (30 Odisha Districts)');

      const saveBtn = btn('Save Registration Policy', 'cso-edu-btn-primary', async () => {
        try {
          const auth_methods = [];
          if (emailChk.cb.checked) auth_methods.push('email_otp');
          if (smsChk.cb.checked) auth_methods.push('mobile_sms_otp');
          if (gglChk.cb.checked) auth_methods.push('google_oauth');
          await api(`${API}/registration`, 'PUT', {
            registration_mode: modeSel.value,
            auth_methods,
            minimum_age_years: parseInt(ageIn.value || '16', 10),
            session_ttl_hours: parseInt(ttlIn.value || '168', 10),
            max_failed_login_attempts: parseInt(failIn.value || '5', 10),
            require_dpdp_explicit_consent: dpdpChk.cb.checked,
            collect_home_district_odisha: distChk.cb.checked
          });
          toast('Registration settings saved', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      });

      root.appendChild(buildHeader('module-18-013', 'Candidate signup policy, DPDP Act 2023 explicit consent lock & 30 Odisha district localization.', [saveBtn]));
      root.appendChild(renderKpiStrip(ov));

      const card = el('div', 'cso-edu-card', [
        el('div', 'cso-cfg-form-grid', [
          field('Registration Mode', modeSel),
          field('Minimum Age (14-21 years)', ageIn),
          field('Session TTL (Hours)', ttlIn),
          field('Max Failed Login Attempts (3-10)', failIn),
          emailChk.wrap,
          smsChk.wrap,
          gglChk.wrap,
          dpdpChk.wrap,
          distChk.wrap
        ])
      ]);
      attachRevisions(card, '13', draw);
      root.appendChild(card);
    }
    await draw();
  }

  /* ==================== MODULE 14: COMMENT SETTINGS ==================== */
  async function renderComments(root) {
    async function draw() {
      root.textContent = '';
      const [ov, res] = await Promise.all([api(`${API}/overview`), api(`${API}/comments`)]);
      const it = res.item || {};

      const enChk = checkboxOf(Number(it.comments_enabled_globally) === 1, 'Enable Comments Globally');
      const modSel = selectOf([
        ['pre_approve_all', 'Pre-Approve All'],
        ['auto_publish_verified_filter_links', 'Auto-Publish Verified + Block Links'],
        ['trusted_users_only', 'Trusted Users Only']
      ], it.moderation_mode || 'auto_publish_verified_filter_links');
      const urlChk = checkboxOf(Number(it.block_external_urls) === 1, 'Block External Spam URLs');
      const profChk = checkboxOf(Number(it.odia_english_profanity_filter) === 1, 'Odia + English Profanity Filter');
      const lenIn = textInput('number', String(it.max_comment_length_chars ?? 1500));
      const rateIn = textInput('number', String(it.rate_limit_comments_per_hour ?? 10));
      const depIn = textInput('number', String(it.allow_nested_replies_depth ?? 2));
      const lockIn = textInput('number', String(it.auto_lock_threads_after_days ?? 90));

      const saveBtn = btn('Save Comment Settings', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/comments`, 'PUT', {
            comments_enabled_globally: enChk.cb.checked,
            moderation_mode: modSel.value,
            block_external_urls: urlChk.cb.checked,
            odia_english_profanity_filter: profChk.cb.checked,
            max_comment_length_chars: parseInt(lenIn.value || '1500', 10),
            rate_limit_comments_per_hour: parseInt(rateIn.value || '10', 10),
            allow_nested_replies_depth: parseInt(depIn.value || '2', 10),
            auto_lock_threads_after_days: parseInt(lockIn.value || '90', 10)
          });
          toast('Comment settings saved', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      });

      root.appendChild(buildHeader('module-18-014', 'Study discussion moderation, anti-spam link blocking & Odia/English profanity filtering.', [saveBtn]));
      root.appendChild(renderKpiStrip(ov));

      const card = el('div', 'cso-edu-card', [
        el('div', 'cso-cfg-form-grid', [
          field('Moderation Mode', modSel),
          field('Max Comment Length (Chars)', lenIn),
          field('Rate Limit (Comments / Hour)', rateIn),
          field('Nested Reply Depth (1-4)', depIn),
          field('Auto-Lock Threads After (Days)', lockIn),
          enChk.wrap,
          urlChk.wrap,
          profChk.wrap
        ])
      ]);
      attachRevisions(card, '14', draw);
      root.appendChild(card);
    }
    await draw();
  }

  /* ==================== MODULE 15: PAYMENT SETTINGS ==================== */
  async function renderPayments(root) {
    async function draw() {
      root.textContent = '';
      const [ov, res] = await Promise.all([api(`${API}/overview`), api(`${API}/payments`)]);
      const it = res.item || {};

      const gwSel = selectOf([
        ['razorpay_india', 'Razorpay India'],
        ['cashfree_india', 'Cashfree India'],
        ['upi_intent_direct', 'UPI Intent Direct']
      ], it.primary_gateway || 'razorpay_india');
      const modeSel = selectOf([['live_production', 'Live Production'], ['test_sandbox', 'Test Sandbox']], it.gateway_mode || 'live_production');
      const keyIn = textInput('text', '', `Masked Key ID: ${it.key_id_masked_hint} (optional update)`);
      const secIn = textInput('password', '', 'API Secret (SHA-256 hashed, never stored plaintext)');
      const gstChk = checkboxOf(Number(it.gst_enabled) === 1, 'Enable GST Billing (18.00%)');
      const gstBps = textInput('number', String(it.gst_rate_bps ?? 1800));
      const gstinIn = textInput('text', it.gstin_masked_hint || '21•••••1Z5');
      const minIn = textInput('number', String(it.min_order_paise ?? 1000));
      const maxIn = textInput('number', String(it.max_order_paise ?? 5000000));
      const invIn = textInput('text', it.invoice_prefix || 'CSO-INV-2026-');

      const saveBtn = btn('Save Payment Settings', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/payments`, 'PUT', {
            primary_gateway: gwSel.value,
            gateway_mode: modeSel.value,
            key_id: keyIn.value.trim() || undefined,
            key_secret: secIn.value.trim() || undefined,
            gst_enabled: gstChk.cb.checked,
            gst_rate_bps: parseInt(gstBps.value || '1800', 10),
            gstin_masked_hint: gstinIn.value.trim(),
            min_order_paise: parseInt(minIn.value || '1000', 10),
            max_order_paise: parseInt(maxIn.value || '5000000', 10),
            invoice_prefix: invIn.value.trim()
          });
          toast('Payment settings saved', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      });

      root.appendChild(buildHeader('module-18-015', 'INR (₹) Razorpay/Cashfree/UPI gateway configuration, masked keys & integer paise bounds.', [saveBtn]));
      root.appendChild(renderKpiStrip(ov));

      const card = el('div', 'cso-edu-card', [
        el('div', 'cso-cfg-preview-strip', [
          el('span', 'cso-int-secret-badge', it.key_id_masked_hint || 'rzp_live_••••8f3d'),
          el('span', 'cso-int-badge is-active_live', it.gateway_mode || 'live_production'),
          el('span', 'cso-edu-mono', `Bounds: ${it.min_order_inr || '₹10.00'} – ${it.max_order_inr || '₹50,000.00'}`)
        ]),
        el('div', 'cso-cfg-form-grid', [
          field('Primary Gateway', gwSel),
          field('Gateway Mode', modeSel),
          field('Update Key ID (masked)', keyIn),
          field('Update API Secret (SHA-256 hashed)', secIn),
          field('GST Rate (Basis Points, 1800 = 18%)', gstBps),
          field('Masked GSTIN Hint', gstinIn),
          field('Min Order (Paise)', minIn),
          field('Max Order (Paise)', maxIn),
          field('Invoice Prefix', invIn),
          gstChk.wrap
        ])
      ]);
      attachRevisions(card, '15', draw);
      root.appendChild(card);
    }
    await draw();
  }

  /* ==================== MODULE 16: ENVIRONMENT STATUS ==================== */
  async function renderEnvironment(root) {
    async function draw() {
      root.textContent = '';
      const [ov, res] = await Promise.all([api(`${API}/overview`), api(`${API}/environment`)]);
      const d = res.diagnostics || {};

      const runBtn = btn('Run Live Environment Diagnostics', 'cso-edu-btn-primary', async () => {
        try {
          const r = await api(`${API}/environment/run-diagnostics`, 'POST', {});
          toast(`D1 Probe OK (${r.diagnostics.d1_database.latency_ms}ms, ${r.diagnostics.d1_database.table_count} tables)`, 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      });

      root.appendChild(buildHeader('module-18-016', 'Live non-destructive Cloudflare Worker, D1, R2, Service Worker & Strict CSP diagnostics.', [runBtn]));
      root.appendChild(renderKpiStrip(ov));

      const grid = el('div', 'cso-cfg-form-grid', [
        el('div', 'cso-cfg-kpi-card', [el('span', 'cso-cfg-kpi-label', 'Cloudflare Worker Runtime'), el('strong', '', d.runtime || 'Cloudflare Worker (Edge V8)')]),
        el('div', 'cso-cfg-kpi-card', [el('span', 'cso-cfg-kpi-label', 'D1 SQLite Database'), el('strong', '', `${d.d1_database?.status || 'healthy'} (${d.d1_database?.latency_ms ?? 1}ms · ${d.d1_database?.table_count ?? 0} tables)`)]),
        el('div', 'cso-cfg-kpi-card', [el('span', 'cso-cfg-kpi-label', 'R2 Object Storage'), el('strong', '', d.r2_storage?.status || 'fallback_manifest_mode')]),
        el('div', 'cso-cfg-kpi-card', [el('span', 'cso-cfg-kpi-label', 'Service Worker Cache'), el('strong', 'cso-edu-mono', d.service_worker?.active_cache_version || 'cso-candidate-cache-v124')]),
        el('div', 'cso-cfg-kpi-card', [el('span', 'cso-cfg-kpi-label', 'Strict CSP Shield'), el('strong', '', d.csp_shield?.policy || 'strict_zero_inline_csp')]),
        el('div', 'cso-cfg-kpi-card', [el('span', 'cso-cfg-kpi-label', 'IST Server Clock'), el('strong', 'cso-edu-mono', d.server_clock_ist || '')])
      ]);
      root.appendChild(el('div', 'cso-edu-card', [grid]));
    }
    await draw();
  }

  /* ==================== MODULE 17: ADMINISTRATIVE PREFERENCES ==================== */
  async function renderAdminPreferences(root) {
    async function draw() {
      root.textContent = '';
      const [ov, res] = await Promise.all([api(`${API}/overview`), api(`${API}/admin-preferences`)]);
      const it = res.item || {};

      const denSel = selectOf([['comfortable_alabaster', 'Comfortable Warm Alabaster'], ['compact_ops', 'Compact Ops']], it.admin_ui_density || 'comfortable_alabaster');
      const landIn = textInput('text', it.default_admin_landing_module || 'module-18-001');
      const rowsSel = selectOf([['10', '10 rows'], ['20', '20 rows'], ['50', '50 rows'], ['100', '100 rows']], String(it.table_rows_per_page ?? 20));
      const retIn = textInput('number', String(it.audit_trail_retention_days ?? 365));
      const confChk = checkboxOf(Number(it.confirm_before_destructive_action) === 1, 'Confirm Before Destructive Actions');
      const odiaChk = checkboxOf(Number(it.show_odia_bilingual_fields_expanded) === 1, 'Keep Odia (ଓଡ଼ିଆ) Bilingual Fields Expanded');
      const kbdChk = checkboxOf(Number(it.keyboard_shortcuts_enabled) === 1, 'Enable Studio Keyboard Shortcuts');

      const saveBtn = btn('Save Preferences', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/admin-preferences`, 'PUT', {
            admin_ui_density: denSel.value,
            default_admin_landing_module: landIn.value.trim(),
            table_rows_per_page: parseInt(rowsSel.value, 10),
            audit_trail_retention_days: parseInt(retIn.value || '365', 10),
            confirm_before_destructive_action: confChk.cb.checked,
            show_odia_bilingual_fields_expanded: odiaChk.cb.checked,
            keyboard_shortcuts_enabled: kbdChk.cb.checked
          });
          toast('Administrative preferences saved', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      });

      root.appendChild(buildHeader('module-18-017', 'Editorial Studio UI density, bilingual Odia field expansion & audit retention preferences.', [saveBtn]));
      root.appendChild(renderKpiStrip(ov));

      const card = el('div', 'cso-edu-card', [
        el('div', 'cso-cfg-form-grid', [
          field('Admin UI Density', denSel),
          field('Default Landing Module ID', landIn),
          field('Table Rows Per Page', rowsSel),
          field('Audit Trail Retention (Days)', retIn),
          confChk.wrap,
          odiaChk.wrap,
          kbdChk.wrap
        ])
      ]);
      attachRevisions(card, '17', draw);
      root.appendChild(card);
    }
    await draw();
  }

  window.CSOSettingsBatch4 = {
    async render(moduleId, root) {
      if (!MODULES[moduleId] || !root) return false;
      root.className = 'cso-edu-shell';
      if (moduleId === 'module-18-013') await renderRegistration(root);
      else if (moduleId === 'module-18-014') await renderComments(root);
      else if (moduleId === 'module-18-015') await renderPayments(root);
      else if (moduleId === 'module-18-016') await renderEnvironment(root);
      else if (moduleId === 'module-18-017') await renderAdminPreferences(root);
      return true;
    }
  };
})();
