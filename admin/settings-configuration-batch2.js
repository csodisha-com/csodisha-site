/* Settings & Configuration Batch 2 (05-08) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/settings';
  const MODULES = {
    'module-18-005': { num: '05', title: 'Languages' },
    'module-18-006': { num: '06', title: 'Time Zone' },
    'module-18-007': { num: '07', title: 'Date & Number Formats' },
    'module-18-008': { num: '08', title: 'Homepage Settings' }
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
      ['Enabled Languages', `${ov.enabled_languages_count ?? 2} (Odia ${ov.odia_coverage_pct ?? 98}%)`],
      ['Active IANA Time Zone', ov.iana_timezone || 'Asia/Kolkata'],
      ['Number & Date Preset', `${ov.date_format_pattern || 'DD-MM-YYYY'} · ${ov.number_grouping || 'indian_lakhs_crores'}`],
      ['Homepage Active Sections', `${ov.homepage_active_sections_count ?? 4} / 4`]
    ];
    cards.forEach(([lbl, val]) => {
      const c = el('div', 'cso-cfg-kpi-card');
      c.append(el('span', 'cso-cfg-kpi-label', lbl), el('span', 'cso-cfg-kpi-val', String(val)));
      strip.appendChild(c);
    });
    return strip;
  }

  /* ==================== MODULE 05: LANGUAGES ==================== */
  async function renderLanguages(root) {
    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-18-005', 'Bilingual English (India) & ଓଡ଼ିଆ (Odia) language registry with translation coverage & default lock.', [
        btn('+ Add Language', 'cso-edu-btn-primary', () => openLangDrawer())
      ]));

      const [ov, data] = await Promise.all([api(`${API}/overview`), api(`${API}/languages`)]);
      root.appendChild(renderKpiStrip(ov));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code & Script', 'Language (EN / Native)', 'Translation Coverage', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        const prog = document.createElement('progress');
        prog.className = 'cso-cfg-cov-bar';
        prog.max = 100;
        prog.value = Math.min(100, Math.max(0, Number(it.translation_coverage_pct || 0)));

        const isDef = Number(it.is_default) === 1;
        const isEn = Number(it.is_enabled) === 1;
        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', 'cso-edu-mono', it.lang_code), el('div', 'cso-edu-muted', `${it.script_name} · ${it.direction.toUpperCase()}`)]),
          el('td', '', [el('strong', '', it.english_name), el('div', 'cso-edu-muted', it.native_name)]),
          el('td', '', [prog, el('span', 'cso-edu-mono', ` ${it.translation_coverage_pct}%`)]),
          el('td', '', el('span', `cso-int-badge ${isEn ? 'is-active_live' : 'is-paused'}`, isDef ? 'Default · Enabled' : isEn ? 'Enabled' : 'Disabled')),
          el('td', 'cso-edu-row-actions', [
            btn(isEn ? 'Disable' : 'Enable', 'cso-edu-btn-sm', async () => {
              try {
                await api(`${API}/languages/${encodeURIComponent(it.id)}/toggle`, 'PATCH', {});
                toast(`Updated ${it.lang_code}`, 'success');
                draw();
              } catch (e) { toast(e.message, 'error'); }
            }),
            !isDef ? btn('Set Default', 'cso-edu-btn-sm cso-edu-btn-primary', async () => {
              try {
                await api(`${API}/languages/${encodeURIComponent(it.id)}/set-default`, 'PATCH', {});
                toast(`${it.lang_code} set as default`, 'success');
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

    function openLangDrawer() {
      const codeIn = textInput('text', '', 'e.g. bn-IN');
      const enIn = textInput('text', '', 'English name (e.g. Bengali)');
      const natIn = textInput('text', '', 'Native name (e.g. বাংলা)');
      const scrSel = selectOf([['Latin', 'Latin'], ['Odia', 'Odia'], ['Devanagari', 'Devanagari']], 'Latin');
      const covIn = textInput('number', '60');
      const { backdrop, foot } = openDrawer('Add Portal Language', [
        field('Language Code (BCP-47)', codeIn),
        field('English Name', enIn),
        field('Native Name', natIn),
        field('Script', scrSel),
        field('Translation Coverage (%)', covIn)
      ]);
      foot.appendChild(btn('Add Language', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/languages`, 'POST', {
            lang_code: codeIn.value.trim(),
            english_name: enIn.value.trim(),
            native_name: natIn.value.trim(),
            script_name: scrSel.value,
            translation_coverage_pct: parseInt(covIn.value || '50', 10) || 50
          });
          toast('Language added', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 06: TIME ZONE ==================== */
  async function renderTimezone(root) {
    async function draw() {
      root.textContent = '';
      const [ov, res] = await Promise.all([api(`${API}/overview`), api(`${API}/timezone`)]);
      const it = res.item || {};

      const ianaIn = textInput('text', it.iana_timezone || 'Asia/Kolkata');
      const abbrIn = textInput('text', it.tz_abbreviation || 'IST');
      const offIn = textInput('text', it.utc_offset_label || 'UTC+05:30');
      const sessSel = selectOf([
        ['2026-27 (Apr – Mar)', '2026-27 (Apr – Mar)'],
        ['2027-28 (Apr – Mar)', '2027-28 (Apr – Mar)']
      ], it.academic_session_label || '2026-27 (Apr – Mar)');
      const ntpIn = textInput('text', it.ntp_sync_note || '');
      const enfChk = checkboxOf(Number(it.enforce_ist_on_deadlines) === 1, 'Enforce IST on All Exam Deadlines');
      const bdgChk = checkboxOf(Number(it.show_ist_badge_on_timers) === 1, 'Show IST Badge on Countdown Timers');

      const saveBtn = btn('Save Time Zone', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/timezone`, 'PUT', {
            iana_timezone: ianaIn.value.trim(),
            tz_abbreviation: abbrIn.value.trim(),
            utc_offset_label: offIn.value.trim(),
            academic_session_label: sessSel.value,
            ntp_sync_note: ntpIn.value.trim(),
            enforce_ist_on_deadlines: enfChk.cb.checked,
            show_ist_badge_on_timers: bdgChk.cb.checked
          });
          toast('Time zone settings saved', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      });

      root.appendChild(buildHeader('module-18-006', `Authoritative IST (Asia/Kolkata · UTC+05:30) clock & Odisha academic cycle. Server IST: ${res.server_ist_now || ''}`, [saveBtn]));
      root.appendChild(renderKpiStrip(ov));

      const card = el('div', 'cso-edu-card', [
        el('div', 'cso-cfg-form-grid', [
          field('IANA Time Zone', ianaIn),
          field('Abbreviation', abbrIn),
          field('UTC Offset', offIn),
          field('Academic Session (Apr – Mar)', sessSel),
          field('NTP Sync Note', ntpIn),
          enfChk.wrap,
          bdgChk.wrap
        ])
      ]);
      attachRevisions(card, '06', 'primary', draw);
      root.appendChild(card);
    }
    await draw();
  }

  /* ==================== MODULE 07: DATE & NUMBER FORMATS ==================== */
  async function renderFormats(root) {
    async function draw() {
      root.textContent = '';
      const [ov, res] = await Promise.all([api(`${API}/overview`), api(`${API}/formats`)]);
      const it = res.item || {};
      const smp = res.preview_samples || {};

      const dateSel = selectOf([['DD-MM-YYYY', 'DD-MM-YYYY'], ['DD MMM YYYY', 'DD MMM YYYY'], ['YYYY-MM-DD', 'YYYY-MM-DD']], it.date_format_pattern || 'DD-MM-YYYY');
      const timeSel = selectOf([['12h_am_pm', '12h AM/PM'], ['24h_military', '24h Military']], it.time_format_pattern || '12h_am_pm');
      const grpSel = selectOf([['indian_lakhs_crores', 'Indian Lakhs/Crores (₹1,23,456.00)'], ['international_thousands', 'International Thousands (₹123,456.00)']], it.number_grouping || 'indian_lakhs_crores');
      const posSel = selectOf([['prefix_no_space', 'Prefix No Space (₹1,23,456.00)'], ['prefix_space', 'Prefix Space (₹ 1,23,456.00)']], it.currency_position || 'prefix_no_space');
      const decSel = selectOf([['2', '2 Decimals (.00)'], ['0', '0 Decimals (Integer)']], String(it.decimal_places ?? 2));
      const odiaSel = selectOf([['latin_digits_default', 'Latin Digits (0-9)'], ['bilingual_odia_digits', 'Bilingual Odia Digits (୦-୯)']], it.odia_numerals_mode || 'latin_digits_default');

      const saveBtn = btn('Save Formats', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/formats`, 'PUT', {
            date_format_pattern: dateSel.value,
            time_format_pattern: timeSel.value,
            number_grouping: grpSel.value,
            currency_position: posSel.value,
            decimal_places: parseInt(decSel.value, 10),
            odia_numerals_mode: odiaSel.value
          });
          toast('Date & number formats saved', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      });

      root.appendChild(buildHeader('module-18-007', 'Indian Lakhs/Crores currency grouping, DD-MM-YYYY date patterns & live preview.', [saveBtn]));
      root.appendChild(renderKpiStrip(ov));

      const previewStrip = el('div', 'cso-cfg-preview-strip', [
        el('div', 'cso-cfg-preview-item', [el('span', 'cso-cfg-kpi-label', 'Date Preview'), el('strong', 'cso-edu-mono', smp.date_sample || '17-11-2026')]),
        el('div', 'cso-cfg-preview-item', [el('span', 'cso-cfg-kpi-label', 'Time Preview'), el('strong', 'cso-edu-mono', smp.time_sample || '05:30 PM IST')]),
        el('div', 'cso-cfg-preview-item', [el('span', 'cso-cfg-kpi-label', 'INR Currency Preview'), el('strong', 'cso-edu-mono', smp.currency_sample || '₹1,23,456.00')])
      ]);

      const card = el('div', 'cso-edu-card', [
        previewStrip,
        el('div', 'cso-cfg-form-grid', [
          field('Date Format Pattern', dateSel),
          field('Time Format Pattern', timeSel),
          field('Number Grouping', grpSel),
          field('Currency Position', posSel),
          field('Decimal Places', decSel),
          field('Odia Numerals Mode', odiaSel)
        ])
      ]);
      attachRevisions(card, '07', 'primary', draw);
      root.appendChild(card);
    }
    await draw();
  }

  /* ==================== MODULE 08: HOMEPAGE SETTINGS ==================== */
  async function renderHomepage(root) {
    async function draw() {
      root.textContent = '';
      const [ov, res] = await Promise.all([api(`${API}/overview`), api(`${API}/homepage`)]);
      const it = res.item || {};

      const bdgEn = textInput('text', it.hero_badge_en || '');
      const bdgOr = textInput('text', it.hero_badge_or || '');
      const headEn = textInput('text', it.hero_headline_en || '');
      const headOr = textInput('text', it.hero_headline_or || '');
      const subEn = textInput('text', it.hero_subheadline_en || '');
      const subOr = textInput('text', it.hero_subheadline_or || '');
      const ctaEn = textInput('text', it.primary_cta_label_en || '');
      const ctaOr = textInput('text', it.primary_cta_label_or || '');
      const ctaUrl = textInput('text', it.primary_cta_url || '/study-library/');
      const limIn = textInput('number', String(it.featured_cards_limit ?? 6));
      const tkrChk = checkboxOf(Number(it.show_live_deadline_ticker) === 1, 'Show Live Deadline Ticker');
      const exmChk = checkboxOf(Number(it.show_featured_exams_grid) === 1, 'Show Featured Exams Grid');
      const schChk = checkboxOf(Number(it.show_odisha_schemes_strip) === 1, 'Show Odisha Schemes Strip');
      const pyqChk = checkboxOf(Number(it.show_daily_pyq_widget) === 1, 'Show Daily PYQ Widget');

      const saveBtn = btn('Save Homepage Settings', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/homepage`, 'PUT', {
            hero_badge_en: bdgEn.value.trim(),
            hero_badge_or: bdgOr.value.trim(),
            hero_headline_en: headEn.value.trim(),
            hero_headline_or: headOr.value.trim(),
            hero_subheadline_en: subEn.value.trim(),
            hero_subheadline_or: subOr.value.trim(),
            primary_cta_label_en: ctaEn.value.trim(),
            primary_cta_label_or: ctaOr.value.trim(),
            primary_cta_url: ctaUrl.value.trim(),
            featured_cards_limit: parseInt(limIn.value || '6', 10) || 6,
            show_live_deadline_ticker: tkrChk.cb.checked,
            show_featured_exams_grid: exmChk.cb.checked,
            show_odisha_schemes_strip: schChk.cb.checked,
            show_daily_pyq_widget: pyqChk.cb.checked
          });
          toast('Homepage settings saved', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      });

      root.appendChild(buildHeader('module-18-008', 'Bilingual EN & ଓଡ଼ିଆ Hero section copy, primary CTA & homepage widget visibility switches.', [saveBtn]));
      root.appendChild(renderKpiStrip(ov));

      const card = el('div', 'cso-edu-card', [
        el('div', 'cso-cfg-form-grid', [
          field('Hero Badge (EN)', bdgEn),
          field('Hero Badge (Odia)', bdgOr),
          field('Hero Headline (EN)', headEn),
          field('Hero Headline (Odia)', headOr),
          field('Hero Subheadline (EN)', subEn),
          field('Hero Subheadline (Odia)', subOr),
          field('Primary CTA Label (EN)', ctaEn),
          field('Primary CTA Label (Odia)', ctaOr),
          field('Primary CTA URL', ctaUrl),
          field('Featured Cards Limit (4-12)', limIn),
          tkrChk.wrap,
          exmChk.wrap,
          schChk.wrap,
          pyqChk.wrap
        ])
      ]);
      attachRevisions(card, '08', 'primary', draw);
      root.appendChild(card);
    }
    await draw();
  }

  window.CSOSettingsBatch2 = {
    async render(moduleId, root) {
      if (!MODULES[moduleId] || !root) return false;
      root.className = 'cso-edu-shell';
      if (moduleId === 'module-18-005') await renderLanguages(root);
      else if (moduleId === 'module-18-006') await renderTimezone(root);
      else if (moduleId === 'module-18-007') await renderFormats(root);
      else if (moduleId === 'module-18-008') await renderHomepage(root);
      return true;
    }
  };
})();
