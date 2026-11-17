/* Settings & Configuration Batch 3 (09-12) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/settings';
  const MODULES = {
    'module-18-009': { num: '09', title: 'Feature Toggles' },
    'module-18-010': { num: '10', title: 'Email Settings' },
    'module-18-011': { num: '11', title: 'Upload Limits' },
    'module-18-012': { num: '12', title: 'Content Defaults' }
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
    const strip = el('div', 'cso-cfg-kpi-strip');
    const cards = [
      ['Enabled Feature Toggles', `${ov.enabled_feature_toggles_count ?? 0} / ${ov.total_feature_toggles_count ?? 6}`],
      ['Email Transport', ov.email_transport_driver || 'aws_ses_ap_south_1'],
      ['Max PDF / Image', `${ov.max_pdf_mb ?? 25} MB / ${ov.max_image_mb ?? 5} MB`],
      ['Default Content Lang', ov.default_content_language || 'bilingual_en_or']
    ];
    cards.forEach(([lbl, val]) => {
      const c = el('div', 'cso-cfg-kpi-card');
      c.append(el('span', 'cso-cfg-kpi-label', lbl), el('span', 'cso-cfg-kpi-val', String(val)));
      strip.appendChild(c);
    });
    return strip;
  }

  /* ==================== MODULE 09: FEATURE TOGGLES ==================== */
  async function renderFeatureToggles(root) {
    let curCat = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-18-009', 'Live portal feature flags, percentage rollouts & public /api/config/public exposure.', [
        btn('+ Add Feature Flag', 'cso-edu-btn-primary', () => openFlagDrawer())
      ]));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/feature-toggles?category_group=${encodeURIComponent(curCat)}`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      const tabs = el('div', 'cso-edu-tabs');
      [
        ['', 'All'], ['candidate_portal', 'Candidate Portal'],
        ['study_tools', 'Study Tools'], ['community_engagement', 'Community'],
        ['edge_performance', 'Edge Performance']
      ].forEach(([v, l]) => {
        tabs.appendChild(btn(l, `cso-edu-tab ${curCat === v ? 'is-active' : ''}`, () => { curCat = v; draw(); }));
      });
      root.appendChild(el('div', 'cso-edu-toolbar', [tabs]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Flag Key & Category', 'Label (EN / ଓଡ଼ିଆ)', 'Rollout %', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        const prog = document.createElement('progress');
        prog.className = 'cso-cfg-cov-bar';
        prog.max = 100;
        prog.value = Math.min(100, Math.max(0, Number(it.rollout_pct || 0)));
        const isEn = Number(it.is_enabled) === 1;

        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', 'cso-edu-mono', it.flag_key), el('div', 'cso-edu-muted', `${it.category_group} · ${it.rollout_scope}`)]),
          el('td', '', [el('strong', '', it.label_en), el('div', 'cso-edu-muted', it.label_or || it.description_en)]),
          el('td', '', [prog, el('span', 'cso-edu-mono', ` ${it.rollout_pct}%`)]),
          el('td', '', el('span', `cso-int-badge ${isEn ? 'is-active_live' : 'is-paused'}`, isEn ? 'Enabled' : 'Disabled')),
          el('td', 'cso-edu-row-actions', [
            btn(isEn ? 'Disable' : 'Enable', `cso-edu-btn-sm ${isEn ? '' : 'cso-edu-btn-primary'}`.trim(), async () => {
              try {
                await api(`${API}/feature-toggles/${encodeURIComponent(it.id)}/toggle`, 'PATCH', {});
                toast(`Toggled ${it.flag_key}`, 'success');
                draw();
              } catch (e) { toast(e.message, 'error'); }
            })
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openFlagDrawer() {
      const keyIn = textInput('text', '', 'e.g. odia_voice_reader');
      const enIn = textInput('text', '', 'Feature label (EN)');
      const orIn = textInput('text', '', 'ଓଡ଼ିଆ ନାମ');
      const catSel = selectOf([
        ['candidate_portal', 'candidate_portal'], ['study_tools', 'study_tools'],
        ['community_engagement', 'community_engagement'], ['edge_performance', 'edge_performance']
      ], 'candidate_portal');
      const pctIn = textInput('number', '100');
      const { backdrop, foot } = openDrawer('Add Portal Feature Flag', [
        field('Flag Key (snake_case)', keyIn),
        field('Label (EN)', enIn),
        field('Label (Odia)', orIn),
        field('Category Group', catSel),
        field('Rollout Percentage (0-100)', pctIn)
      ]);
      foot.appendChild(btn('Create Flag', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/feature-toggles`, 'POST', {
            flag_key: keyIn.value.trim(),
            label_en: enIn.value.trim(),
            label_or: orIn.value.trim(),
            category_group: catSel.value,
            rollout_pct: parseInt(pctIn.value || '100', 10) || 100
          });
          toast('Feature flag created', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 10: EMAIL SETTINGS ==================== */
  async function renderEmailSettings(root) {
    async function draw() {
      root.textContent = '';
      const [ov, res] = await Promise.all([api(`${API}/overview`), api(`${API}/email`)]);
      const it = res.item || {};

      const drvSel = selectOf([
        ['aws_ses_ap_south_1', 'AWS SES Mumbai (ap-south-1)'],
        ['cloudflare_mailchannels', 'Cloudflare MailChannels'],
        ['resend_api', 'Resend API'],
        ['smtp_relay', 'SMTP Relay']
      ], it.transport_driver || 'aws_ses_ap_south_1');
      const hostIn = textInput('text', it.smtp_host || '');
      const portIn = textInput('number', String(it.smtp_port ?? 587));
      const encSel = selectOf([['STARTTLS', 'STARTTLS'], ['SSL_TLS', 'SSL_TLS']], it.encryption_mode || 'STARTTLS');
      const fromEn = textInput('text', it.from_name_en || '');
      const fromOr = textInput('text', it.from_name_or || '');
      const fromAddr = textInput('email', it.from_address || '');
      const repAddr = textInput('email', it.reply_to_address || '');
      const credIn = textInput('password', '', `Masked: ${it.credential_masked_hint} (leave blank to keep)`);
      const quotaIn = textInput('number', String(it.daily_send_quota ?? 50000));
      const dkimChk = checkboxOf(Number(it.dkim_spf_verified) === 1, 'DKIM & SPF Records Verified');

      const diagBtn = btn('Run SMTP / Transport Diagnostic', '', async () => {
        try {
          const d = await api(`${API}/email/test-connection`, 'POST', {});
          toast(`Transport ${d.transport_driver} OK (${d.smtp_host}:${d.smtp_port})`, 'success');
        } catch (e) { toast(e.message, 'error'); }
      });

      const saveBtn = btn('Save Email Settings', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/email`, 'PUT', {
            transport_driver: drvSel.value,
            smtp_host: hostIn.value.trim(),
            smtp_port: parseInt(portIn.value || '587', 10) || 587,
            encryption_mode: encSel.value,
            from_name_en: fromEn.value.trim(),
            from_name_or: fromOr.value.trim(),
            from_address: fromAddr.value.trim(),
            reply_to_address: repAddr.value.trim(),
            credential: credIn.value.trim() || undefined,
            daily_send_quota: parseInt(quotaIn.value || '50000', 10) || 50000,
            dkim_spf_verified: dkimChk.cb.checked
          });
          toast('Email settings saved', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      });

      root.appendChild(buildHeader('module-18-010', 'Mumbai ap-south-1 SES & MailChannels transport with SHA-256 hashed credentials & DKIM verification.', [diagBtn, saveBtn]));
      root.appendChild(renderKpiStrip(ov));

      const card = el('div', 'cso-edu-card', [
        el('div', 'cso-cfg-preview-strip', [
          el('span', 'cso-int-secret-badge', it.credential_masked_hint || 'mail_••••7c4e'),
          el('span', `cso-int-badge ${Number(it.dkim_spf_verified) === 1 ? 'is-active_live' : 'is-paused'}`, Number(it.dkim_spf_verified) === 1 ? 'DKIM / SPF Verified' : 'DKIM Pending')
        ]),
        el('div', 'cso-cfg-form-grid', [
          field('Transport Driver', drvSel),
          field('SMTP / API Host', hostIn),
          field('SMTP Port', portIn),
          field('Encryption Mode', encSel),
          field('From Name (EN)', fromEn),
          field('From Name (Odia)', fromOr),
          field('From Email Address', fromAddr),
          field('Reply-To Email', repAddr),
          field('SMTP / API Credential (hashed SHA-256)', credIn),
          field('Daily Send Quota', quotaIn),
          dkimChk.wrap
        ])
      ]);
      attachRevisions(card, '10', 'primary', draw);
      root.appendChild(card);
    }
    await draw();
  }

  /* ==================== MODULE 11: UPLOAD LIMITS ==================== */
  async function renderUploadLimits(root) {
    async function draw() {
      root.textContent = '';
      const [ov, res] = await Promise.all([api(`${API}/overview`), api(`${API}/upload-limits`)]);
      const it = res.item || {};

      const pdfIn = textInput('number', String(it.max_pdf_mb ?? 25));
      const imgIn = textInput('number', String(it.max_image_mb ?? 5));
      const audIn = textInput('number', String(it.max_audio_zip_mb ?? 50));
      const batIn = textInput('number', String(it.max_files_per_batch ?? 10));
      const mimeIn = textInput('text', (it.allowed_mime_types || []).join(', '));
      const blkIn = textInput('text', (it.blocked_extensions || []).join(', '));
      const r2In = textInput('text', it.r2_bucket_binding || 'csodisha-assets');
      const webpChk = checkboxOf(Number(it.auto_convert_images_webp) === 1, 'Auto-Convert Uploaded Images to WebP');
      const exifChk = checkboxOf(Number(it.strip_exif_metadata) === 1, 'Strip EXIF Metadata (DPDP Privacy)');

      const saveBtn = btn('Save Upload Limits', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/upload-limits`, 'PUT', {
            max_pdf_mb: parseInt(pdfIn.value || '25', 10),
            max_image_mb: parseInt(imgIn.value || '5', 10),
            max_audio_zip_mb: parseInt(audIn.value || '50', 10),
            max_files_per_batch: parseInt(batIn.value || '10', 10),
            allowed_mime_types: mimeIn.value.split(',').map(s => s.trim()).filter(Boolean),
            blocked_extensions: blkIn.value.split(',').map(s => s.trim()).filter(Boolean),
            r2_bucket_binding: r2In.value.trim(),
            auto_convert_images_webp: webpChk.cb.checked,
            strip_exif_metadata: exifChk.cb.checked
          });
          toast('Upload limits saved', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      });

      root.appendChild(buildHeader('module-18-011', 'Cloudflare R2 upload quotas, executable MIME blocking & DPDP EXIF privacy stripping.', [saveBtn]));
      root.appendChild(renderKpiStrip(ov));

      const mimeChips = el('div', 'cso-int-chip-row');
      (it.allowed_mime_types || []).forEach(m => mimeChips.appendChild(el('span', 'cso-int-chip', m)));

      const card = el('div', 'cso-edu-card', [
        mimeChips,
        el('div', 'cso-cfg-form-grid', [
          field('Max PDF Size (MB, 1-100)', pdfIn),
          field('Max Image Size (MB, 1-25)', imgIn),
          field('Max Audio/ZIP Size (MB, 5-200)', audIn),
          field('Max Files Per Batch (1-50)', batIn),
          field('Allowed MIME Types (comma-separated)', mimeIn),
          field('Blocked Extensions', blkIn),
          field('R2 Bucket Binding', r2In),
          webpChk.wrap,
          exifChk.wrap
        ])
      ]);
      attachRevisions(card, '11', 'primary', draw);
      root.appendChild(card);
    }
    await draw();
  }

  /* ==================== MODULE 12: CONTENT DEFAULTS ==================== */
  async function renderContentDefaults(root) {
    async function draw() {
      root.textContent = '';
      const [ov, res] = await Promise.all([api(`${API}/overview`), api(`${API}/content-defaults`)]);
      const it = res.item || {};

      const pubSel = selectOf([['draft', 'draft'], ['in_review', 'in_review'], ['published', 'published']], it.default_publish_status || 'in_review');
      const langSel = selectOf([['bilingual_en_or', 'Bilingual EN + ଓଡ଼ିଆ'], ['en', 'English Only'], ['or', 'Odia Only']], it.default_content_language || 'bilingual_en_or');
      const licSel = selectOf([
        ['CC-BY-NC-SA-4.0', 'CC-BY-NC-SA-4.0'],
        ['PUBLIC_GOV_RECORD', 'PUBLIC_GOV_RECORD'],
        ['CS_ODISHA_PROPRIETARY', 'CS_ODISHA_PROPRIETARY']
      ], it.default_license_type || 'CC-BY-NC-SA-4.0');
      const robSel = selectOf([['index, follow', 'index, follow'], ['noindex, follow', 'noindex, follow']], it.default_meta_robots || 'index, follow');
      const wpmIn = textInput('number', String(it.default_reading_wpm ?? 200));
      const slugChk = checkboxOf(Number(it.auto_generate_odia_slug) === 1, 'Auto-generate Odia-friendly Slugs');
      const altChk = checkboxOf(Number(it.require_alt_text_on_images) === 1, 'Require Alt Text on All Images');
      const citChk = checkboxOf(Number(it.require_source_citation_url) === 1, 'Require Official .gov.in / .nic.in Citation');

      const saveBtn = btn('Save Content Defaults', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/content-defaults`, 'PUT', {
            default_publish_status: pubSel.value,
            default_content_language: langSel.value,
            default_license_type: licSel.value,
            default_meta_robots: robSel.value,
            default_reading_wpm: parseInt(wpmIn.value || '200', 10) || 200,
            auto_generate_odia_slug: slugChk.cb.checked,
            require_alt_text_on_images: altChk.cb.checked,
            require_source_citation_url: citChk.cb.checked
          });
          toast('Content defaults saved', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      });

      root.appendChild(buildHeader('module-18-012', 'Editorial workflow defaults, bilingual EN + ଓଡ଼ିଆ standard & official government citation policy.', [saveBtn]));
      root.appendChild(renderKpiStrip(ov));

      const card = el('div', 'cso-edu-card', [
        el('div', 'cso-cfg-form-grid', [
          field('Default Publish Status', pubSel),
          field('Default Content Language', langSel),
          field('Default License Type', licSel),
          field('Default Meta Robots', robSel),
          field('Default Reading Speed (WPM)', wpmIn),
          slugChk.wrap,
          altChk.wrap,
          citChk.wrap
        ])
      ]);
      attachRevisions(card, '12', 'primary', draw);
      root.appendChild(card);
    }
    await draw();
  }

  window.CSOSettingsBatch3 = {
    async render(moduleId, root) {
      if (!MODULES[moduleId] || !root) return false;
      root.className = 'cso-edu-shell';
      if (moduleId === 'module-18-009') await renderFeatureToggles(root);
      else if (moduleId === 'module-18-010') await renderEmailSettings(root);
      else if (moduleId === 'module-18-011') await renderUploadLimits(root);
      else if (moduleId === 'module-18-012') await renderContentDefaults(root);
      return true;
    }
  };
})();
