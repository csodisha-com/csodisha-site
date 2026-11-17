/* Settings & Configuration Batch 1 (01-04) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/settings';
  const MODULES = {
    'module-18-001': { num: '01', title: 'General Website Settings' },
    'module-18-002': { num: '02', title: 'Website Identity' },
    'module-18-003': { num: '03', title: 'Contact Information' },
    'module-18-004': { num: '04', title: 'Localization' }
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
    const strip = el('div', 'cso-cfg-kpi-strip');
    const cards = [
      ['Site Mode', ov.site_mode || 'live_production'],
      ['Brand Palette', ov.brand_palette || 'Warm Alabaster & Deep Forest Green'],
      ['DPDP Grievance Ready', ov.dpdp_grievance_ready ? 'Verified' : 'Incomplete'],
      ['Locale & Currency', `${ov.default_locale || 'en-IN'} / ${ov.secondary_locale || 'or-IN'} · ${ov.currency_symbol || '₹'} ${ov.currency_code || 'INR'}`]
    ];
    cards.forEach(([lbl, val]) => {
      const c = el('div', 'cso-cfg-kpi-card');
      c.append(el('span', 'cso-cfg-kpi-label', lbl), el('span', 'cso-cfg-kpi-val', String(val)));
      strip.appendChild(c);
    });
    return strip;
  }

  /* ==================== MODULE 01: GENERAL WEBSITE SETTINGS ==================== */
  async function renderGeneral(root) {
    async function draw() {
      root.textContent = '';
      const [ov, res] = await Promise.all([api(`${API}/overview`), api(`${API}/general`)]);
      const it = res.item || {};

      const nameEn = textInput('text', it.site_name_en || '');
      const nameOr = textInput('text', it.site_name_or || '');
      const tagEn = textInput('text', it.tagline_en || '');
      const tagOr = textInput('text', it.tagline_or || '');
      const origIn = textInput('url', it.canonical_origin || 'https://csodisha.com');
      const modeSel = selectOf([
        ['live_production', 'Live Production'],
        ['scheduled_maintenance', 'Scheduled Maintenance'],
        ['read_only_archive', 'Read-Only Archive']
      ], it.site_mode || 'live_production');
      const maintEn = textInput('text', it.maintenance_banner_en || '', 'Optional maintenance notice (EN)');
      const maintOr = textInput('text', it.maintenance_banner_or || '', 'ରକ୍ଷଣାବେକ୍ଷଣ ସୂଚନା (ଓଡ଼ିଆ)');
      const copyEn = textInput('text', it.copyright_notice_en || '');
      const copyOr = textInput('text', it.copyright_notice_or || '');
      const idxChk = checkboxOf(Number(it.allow_search_indexing) === 1, 'Allow Search Engine Indexing');
      const pwaChk = checkboxOf(Number(it.pwa_offline_enabled) === 1, 'Enable PWA Offline Caching');

      const saveBtn = btn('Save General Settings', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/general`, 'PUT', {
            site_name_en: nameEn.value.trim(),
            site_name_or: nameOr.value.trim(),
            tagline_en: tagEn.value.trim(),
            tagline_or: tagOr.value.trim(),
            canonical_origin: origIn.value.trim(),
            site_mode: modeSel.value,
            maintenance_banner_en: maintEn.value.trim(),
            maintenance_banner_or: maintOr.value.trim(),
            copyright_notice_en: copyEn.value.trim(),
            copyright_notice_or: copyOr.value.trim(),
            allow_search_indexing: idxChk.cb.checked,
            pwa_offline_enabled: pwaChk.cb.checked
          });
          toast('General website settings saved', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      });

      root.appendChild(buildHeader('module-18-001', 'Bilingual EN & ଓଡ଼ିଆ site identity, canonical origin, maintenance mode & PWA flags.', [saveBtn]));
      root.appendChild(renderKpiStrip(ov));

      const card = el('div', 'cso-edu-card');
      const grid = el('div', 'cso-cfg-form-grid', [
        field('Site Name (EN)', nameEn),
        field('Site Name (Odia)', nameOr),
        field('Tagline (EN)', tagEn),
        field('Tagline (Odia)', tagOr),
        field('Canonical Origin', origIn),
        field('Site Mode', modeSel),
        field('Maintenance Banner (EN)', maintEn),
        field('Maintenance Banner (Odia)', maintOr),
        field('Copyright Notice (EN)', copyEn),
        field('Copyright Notice (Odia)', copyOr),
        idxChk.wrap,
        pwaChk.wrap
      ]);
      card.appendChild(grid);
      attachRevisions(card, '01', draw);
      root.appendChild(card);
    }
    await draw();
  }

  /* ==================== MODULE 02: WEBSITE IDENTITY ==================== */
  async function renderIdentity(root) {
    async function draw() {
      root.textContent = '';
      const [ov, res] = await Promise.all([api(`${API}/overview`), api(`${API}/identity`)]);
      const it = res.item || {};

      const codeIn = textInput('text', it.brand_short_code || 'CSO');
      const palIn = textInput('text', it.primary_palette_name || '');
      const priIn = textInput('text', it.primary_hex || '#1B4332');
      const surfIn = textInput('text', it.surface_hex || '#FAF9F6');
      const accIn = textInput('text', it.accent_hex || '#D97706');
      const logoL = textInput('text', it.logo_light_url || '');
      const logoD = textInput('text', it.logo_dark_url || '');
      const favIn = textInput('text', it.favicon_svg_url || '');
      const ogIn = textInput('text', it.og_default_banner_url || '');
      const fndEn = textInput('text', it.founder_credit_en || '');
      const fndOr = textInput('text', it.founder_credit_or || '');

      const saveBtn = btn('Save Brand Identity', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/identity`, 'PUT', {
            brand_short_code: codeIn.value.trim(),
            primary_palette_name: palIn.value.trim(),
            primary_hex: priIn.value.trim(),
            surface_hex: surfIn.value.trim(),
            accent_hex: accIn.value.trim(),
            logo_light_url: logoL.value.trim(),
            logo_dark_url: logoD.value.trim(),
            favicon_svg_url: favIn.value.trim(),
            og_default_banner_url: ogIn.value.trim(),
            founder_credit_en: fndEn.value.trim(),
            founder_credit_or: fndOr.value.trim()
          });
          toast('Brand identity saved', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      });

      root.appendChild(buildHeader('module-18-002', 'Warm Alabaster & Deep Forest Green brand palette tokens, SVG logos & founder credit.', [saveBtn]));
      root.appendChild(renderKpiStrip(ov));

      const swatches = el('div', 'cso-cfg-swatch-row', [
        el('div', 'cso-cfg-swatch-card', [el('span', 'cso-cfg-swatch-dot is-primary'), el('span', 'cso-edu-mono', `Primary ${it.primary_hex}`)]),
        el('div', 'cso-cfg-swatch-card', [el('span', 'cso-cfg-swatch-dot is-surface'), el('span', 'cso-edu-mono', `Surface ${it.surface_hex}`)]),
        el('div', 'cso-cfg-swatch-card', [el('span', 'cso-cfg-swatch-dot is-accent'), el('span', 'cso-edu-mono', `Accent ${it.accent_hex}`)])
      ]);

      const card = el('div', 'cso-edu-card', [
        swatches,
        el('div', 'cso-cfg-form-grid', [
          field('Brand Short Code', codeIn),
          field('Palette Name', palIn),
          field('Primary Hex (#RRGGBB)', priIn),
          field('Surface Hex (#RRGGBB)', surfIn),
          field('Accent Hex (#RRGGBB)', accIn),
          field('Logo Light URL', logoL),
          field('Logo Dark URL', logoD),
          field('Favicon SVG URL', favIn),
          field('Default OG Banner URL', ogIn),
          field('Founder Credit (EN)', fndEn),
          field('Founder Credit (Odia)', fndOr)
        ])
      ]);
      attachRevisions(card, '02', draw);
      root.appendChild(card);
    }
    await draw();
  }

  /* ==================== MODULE 03: CONTACT INFORMATION ==================== */
  async function renderContact(root) {
    async function draw() {
      root.textContent = '';
      const [ov, res] = await Promise.all([api(`${API}/overview`), api(`${API}/contact`)]);
      const it = res.item || {};

      const supIn = textInput('email', it.support_email || '');
      const edIn = textInput('email', it.editorial_email || '');
      const grvName = textInput('text', it.grievance_officer_name || '');
      const grvEmail = textInput('email', it.grievance_email || '');
      const phoneIn = textInput('text', it.helpline_phone_display || '');
      const waIn = textInput('url', it.whatsapp_channel_url || '');
      const tgIn = textInput('url', it.telegram_channel_url || '');
      const ytIn = textInput('url', it.youtube_channel_url || '');
      const xIn = textInput('url', it.x_twitter_url || '');
      const igIn = textInput('url', it.instagram_url || '');
      const locEn = textInput('text', it.office_locality_en || '');
      const locOr = textInput('text', it.office_locality_or || '');
      const hrsIn = textInput('text', it.support_hours_ist || '');

      const saveBtn = btn('Save Contact Info', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/contact`, 'PUT', {
            support_email: supIn.value.trim(),
            editorial_email: edIn.value.trim(),
            grievance_officer_name: grvName.value.trim(),
            grievance_email: grvEmail.value.trim(),
            helpline_phone_display: phoneIn.value.trim(),
            whatsapp_channel_url: waIn.value.trim(),
            telegram_channel_url: tgIn.value.trim(),
            youtube_channel_url: ytIn.value.trim(),
            x_twitter_url: xIn.value.trim(),
            instagram_url: igIn.value.trim(),
            office_locality_en: locEn.value.trim(),
            office_locality_or: locOr.value.trim(),
            support_hours_ist: hrsIn.value.trim()
          });
          toast('Contact information saved', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      });

      root.appendChild(buildHeader('module-18-003', 'Support & editorial desks, DPDP Act 2023 Grievance Officer & Odisha social channels.', [saveBtn]));
      root.appendChild(renderKpiStrip(ov));

      const grvCard = el('div', 'cso-cfg-grievance-card', [
        el('strong', '', 'DPDP Act 2023 Statutory Grievance Officer'),
        el('div', 'cso-edu-muted', `${it.grievance_officer_name} · ${it.grievance_email} (${it.support_hours_ist})`)
      ]);

      const card = el('div', 'cso-edu-card', [
        grvCard,
        el('div', 'cso-cfg-form-grid', [
          field('Support Email', supIn),
          field('Editorial Email', edIn),
          field('DPDP Grievance Officer Name', grvName),
          field('DPDP Grievance Email', grvEmail),
          field('Helpline Display', phoneIn),
          field('Support Hours (IST)', hrsIn),
          field('Office Locality (EN)', locEn),
          field('Office Locality (Odia)', locOr),
          field('Telegram Channel URL', tgIn),
          field('WhatsApp Channel URL', waIn),
          field('YouTube Channel URL', ytIn),
          field('X (Twitter) URL', xIn),
          field('Instagram URL', igIn)
        ])
      ]);
      attachRevisions(card, '03', draw);
      root.appendChild(card);
    }
    await draw();
  }

  /* ==================== MODULE 04: LOCALIZATION ==================== */
  async function renderLocalization(root) {
    async function draw() {
      root.textContent = '';
      const [ov, res] = await Promise.all([api(`${API}/overview`), api(`${API}/localization`)]);
      const it = res.item || {};

      const ctryIn = textInput('text', it.default_country_code || 'IN');
      const stateIn = textInput('text', it.default_state_region || 'Odisha (OD)');
      const defLoc = textInput('text', it.default_locale || 'en-IN');
      const secLoc = textInput('text', it.secondary_locale || 'or-IN');
      const curIn = textInput('text', it.currency_code || 'INR');
      const symIn = textInput('text', it.currency_symbol || '₹');
      const grpSel = selectOf([
        ['indian_lakhs_crores', '₹ INR (Indian Lakhs/Crores)'],
        ['international_thousands', 'International Thousands']
      ], it.number_grouping_system || 'indian_lakhs_crores');
      const daySel = selectOf([['monday', 'Monday'], ['sunday', 'Sunday']], it.first_day_of_week || 'monday');
      const odiaChk = checkboxOf(Number(it.auto_detect_odia_script) === 1, 'Auto-detect Odia (ଓଡ଼ିଆ) Script');
      const togChk = checkboxOf(Number(it.bilingual_toggle_visible) === 1, 'Show Bilingual EN/ଓଡ଼ିଆ Toggle');

      const saveBtn = btn('Save Localization', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/localization`, 'PUT', {
            default_country_code: ctryIn.value.trim(),
            default_state_region: stateIn.value.trim(),
            default_locale: defLoc.value.trim(),
            secondary_locale: secLoc.value.trim(),
            currency_code: curIn.value.trim(),
            currency_symbol: symIn.value.trim(),
            number_grouping_system: grpSel.value,
            first_day_of_week: daySel.value,
            auto_detect_odia_script: odiaChk.cb.checked,
            bilingual_toggle_visible: togChk.cb.checked
          });
          toast('Localization settings saved', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      });

      root.appendChild(buildHeader('module-18-004', 'India / Odisha regional defaults, en-IN + or-IN (ଓଡ଼ିଆ) locales & ₹ INR Lakhs/Crores formatting.', [saveBtn]));
      root.appendChild(renderKpiStrip(ov));

      const card = el('div', 'cso-edu-card', [
        el('div', 'cso-cfg-form-grid', [
          field('Default Country Code', ctryIn),
          field('Default State / Region', stateIn),
          field('Primary Locale', defLoc),
          field('Secondary Locale (Odia)', secLoc),
          field('Currency Code', curIn),
          field('Currency Symbol', symIn),
          field('Number Grouping System', grpSel),
          field('First Day of Week', daySel),
          odiaChk.wrap,
          togChk.wrap
        ])
      ]);
      attachRevisions(card, '04', draw);
      root.appendChild(card);
    }
    await draw();
  }

  window.CSOSettingsBatch1 = {
    async render(moduleId, root) {
      if (!MODULES[moduleId] || !root) return false;
      root.className = 'cso-edu-shell';
      if (moduleId === 'module-18-001') await renderGeneral(root);
      else if (moduleId === 'module-18-002') await renderIdentity(root);
      else if (moduleId === 'module-18-003') await renderContact(root);
      else if (moduleId === 'module-18-004') await renderLocalization(root);
      return true;
    }
  };
})();
