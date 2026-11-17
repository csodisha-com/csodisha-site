/* Marketing & Advertising Batch 2 (05-08) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/marketing';
  const MODULES = {
    'module-12-005': { num: '05', title: 'Referral Tracking' },
    'module-12-006': { num: '06', title: 'Campaign Analytics' },
    'module-12-007': { num: '07', title: 'UTM Management' },
    'module-12-008': { num: '08', title: 'Social Sharing' }
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

  function statusBadge(st) {
    let cls = 'cso-urc-badge-status';
    if (st === 'active' || st === 'approved_canonical' || st === 'active_live') cls += ' is-active';
    else if (st === 'paused' || st === 'draft' || st === 'capped') cls += ' is-pending';
    else if (st === 'archived' || st === 'deprecated') cls += ' is-danger';
    return el('span', cls, st);
  }

  function progressBar(pct, labelText) {
    const p = document.createElement('progress');
    p.className = 'cso-urc-progress';
    p.max = 100;
    p.value = Math.min(100, Math.max(0, Number(pct || 0)));
    return el('span', '', [p, document.createTextNode(` ${labelText || `${p.value}%`}`)]);
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
      el('div', 'cso-edu-kicker', `Marketing & Advertising · Module ${info.num} of 10`),
      el('h2', 'cso-edu-title', info.title),
      el('p', 'cso-edu-sub', subtitle)
    );
    const right = el('div', 'cso-edu-actions');
    (extraBtns || []).forEach(b => right.appendChild(b));
    bar.append(left, right);
    return bar;
  }

  /* ==================== MODULE 05: REFERRAL TRACKING ==================== */
  async function renderReferrals(root) {
    let curType = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-12-005', 'Cookieless Odisha partner & campus ambassador referral attribution with INR ₹ commission math.', [
        btn('+ Create Referral Partner', 'cso-edu-btn-primary', () => openRefDrawer(null))
      ]));

      const tabs = el('div', 'cso-edu-tabs');
      [['', 'All'], ['campus_ambassador', 'Campus Ambassador'], ['educator_creator', 'Educator Creator'], ['coaching_partner', 'Coaching Partner'], ['telegram_channel', 'Telegram Channel']].forEach(([v, l]) => {
        tabs.appendChild(btn(l, `cso-edu-tab ${curType === v ? 'is-active' : ''}`, () => { curType = v; draw(); }));
      });
      root.appendChild(el('div', 'cso-edu-toolbar', [tabs]));

      const qs = curType ? `?partner_type=${encodeURIComponent(curType)}` : '';
      const data = await api(`${API}/referrals${qs}`);
      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code', 'Partner / District', 'Type', 'Clicks / Signups / Paid', 'Commission (INR)', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(r => {
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', r.referral_code),
          el('td', '', `${r.partner_name} (${r.district_odisha})`),
          el('td', '', r.partner_type),
          el('td', '', `${r.clicks_count} / ${r.signups_attributed} / ${r.paid_conversions}`),
          el('td', '', `${r.total_commission_inr} (${r.reward_per_conv_inr}/conv)`),
          el('td', '', statusBadge(r.referral_status)),
          el('td', 'cso-edu-row-actions', [
            btn('Record Attribution', 'cso-edu-btn-sm', async () => {
              try {
                await api(`${API}/referrals/${encodeURIComponent(r.id)}/record-hit`, 'PATCH', { clicks: 5, signups: 2, paid_conversions: 1 });
                toast('Recorded attribution (+1 paid conv)', 'success');
                draw();
              } catch (e) { toast(e.message, 'error'); }
            }),
            btn('Edit', 'cso-edu-btn-sm', () => openRefDrawer(r))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openRefDrawer(item) {
      const isEdit = Boolean(item);
      const codeIn = textInput('text', item ? item.referral_code : '', 'e.g. BERHAMPUR-CAMPUS-26');
      if (isEdit) codeIn.disabled = true;
      const nameIn = textInput('text', item ? item.partner_name : '', 'Partner name');
      const ptSel = selectOf([
        ['campus_ambassador', 'campus_ambassador'], ['educator_creator', 'educator_creator'],
        ['coaching_partner', 'coaching_partner'], ['telegram_channel', 'telegram_channel'], ['alumni_network', 'alumni_network']
      ], item ? item.partner_type : 'campus_ambassador');
      const distIn = textInput('text', item ? item.district_odisha : 'Khordha', 'Odisha District');
      const destIn = textInput('text', item ? item.destination_path : '/study-library/', '/study-library/');
      const rewIn = textInput('number', item ? String(item.reward_paise_per_conv) : '5000', 'Reward paise per conv');
      const stSel = selectOf([['active', 'active'], ['paused', 'paused'], ['capped', 'capped']], item ? item.referral_status : 'active');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Partner · ${item.referral_code}` : 'Create Referral Partner', [
        field('Referral Code (UPPERCASE)', codeIn),
        field('Partner Name', nameIn),
        field('Partner Type', ptSel),
        field('District (Odisha)', distIn),
        field('Destination Path', destIn),
        field('Reward Per Conversion (Paise)', rewIn),
        field('Status', stSel)
      ]);
      if (isEdit) attachRevisions(body, '05', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Partner' : 'Create Partner', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            referral_code: codeIn.value.trim(),
            partner_name: nameIn.value.trim(),
            partner_type: ptSel.value,
            district_odisha: distIn.value.trim(),
            destination_path: destIn.value.trim(),
            reward_paise_per_conv: Math.max(0, Math.round(Number(rewIn.value || 0))),
            referral_status: stSel.value
          };
          if (isEdit) await api(`${API}/referrals/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/referrals`, 'POST', payload);
          toast('Referral partner saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 06: CAMPAIGN ANALYTICS ==================== */
  async function renderAnalytics(root) {
    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-12-006', 'Cross-channel CTR %, conversion %, INR ₹ spend vs. attributed revenue, and ROAS.', [
        btn('+ Log Metric Bucket', 'cso-edu-btn-primary', openIngestDrawer)
      ]));

      const data = await api(`${API}/analytics`);

      const chCard = el('div', 'cso-edu-card');
      chCard.appendChild(el('div', 'cso-edu-label', 'Channel Performance & ROAS'));
      const chTbl = el('table', 'cso-edu-table');
      chTbl.appendChild(el('thead', '', el('tr', '', ['Channel', 'Impressions', 'Clicks (CTR)', 'Paid Conv (CVR)', 'Spend vs Revenue (INR)', 'ROAS'].map(h => el('th', '', h)))));
      const chBody = el('tbody', '');
      (data.by_channel || []).forEach(r => {
        chBody.appendChild(el('tr', '', [
          el('td', '', r.channel_key),
          el('td', '', String(r.impressions)),
          el('td', '', `${r.clicks} (${r.ctr_pct}%)`),
          el('td', '', progressBar(r.cvr_pct, `${r.paid_conversions} (${r.cvr_pct}%)`)),
          el('td', '', `${r.spend_inr} → ${r.attributed_revenue_inr}`),
          el('td', '', el('span', 'cso-urc-badge-status is-active', `${r.roas}x ROAS`))
        ]));
      });
      chTbl.appendChild(chBody);
      chCard.appendChild(chTbl);
      root.appendChild(chCard);

      const cmpCard = el('div', 'cso-edu-card');
      cmpCard.appendChild(el('div', 'cso-edu-label', 'Campaign Attribution Breakdown'));
      const cmpTbl = el('table', 'cso-edu-table');
      cmpTbl.appendChild(el('thead', '', el('tr', '', ['Campaign', 'Impressions', 'Clicks (CTR)', 'Conversions', 'Spend / Revenue', 'ROAS'].map(h => el('th', '', h)))));
      const cmpBody = el('tbody', '');
      (data.by_campaign || []).forEach(c => {
        cmpBody.appendChild(el('tr', '', [
          el('td', '', `${c.campaign_code} · ${c.campaign_name_en}`),
          el('td', '', String(c.impressions)),
          el('td', '', `${c.clicks} (${c.ctr_pct}%)`),
          el('td', '', `${c.paid_conversions} (${c.cvr_pct}%)`),
          el('td', '', `${c.spend_inr} / ${c.attributed_revenue_inr}`),
          el('td', '', `${c.roas}x`)
        ]));
      });
      cmpTbl.appendChild(cmpBody);
      cmpCard.appendChild(cmpTbl);
      root.appendChild(cmpCard);
    }

    function openIngestDrawer() {
      const chSel = selectOf([
        ['portal_banners', 'portal_banners'], ['email_digest', 'email_digest'],
        ['telegram', 'telegram'], ['whatsapp_waba', 'whatsapp_waba'], ['social_organic', 'social_organic']
      ], 'portal_banners');
      const dtIn = textInput('text', new Date().toISOString().slice(0, 10), 'YYYY-MM-DD');
      const impIn = textInput('number', '5000', 'Impressions');
      const clkIn = textInput('number', '250', 'Clicks');
      const convIn = textInput('number', '18', 'Paid conversions');
      const spIn = textInput('number', '200000', 'Spend (paise)');
      const revIn = textInput('number', '900000', 'Attributed revenue (paise)');

      const { backdrop, foot } = openDrawer('Log Campaign Metric Bucket', [
        field('Channel Key', chSel),
        field('Bucket Date', dtIn),
        field('Impressions', impIn),
        field('Clicks', clkIn),
        field('Paid Conversions', convIn),
        field('Spend (Paise)', spIn),
        field('Attributed Revenue (Paise)', revIn)
      ]);
      foot.appendChild(btn('Log Bucket', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/analytics/ingest`, 'POST', {
            channel_key: chSel.value,
            bucket_date: dtIn.value.trim(),
            impressions: Number(impIn.value || 0),
            clicks: Number(clkIn.value || 0),
            paid_conversions: Number(convIn.value || 0),
            spend_paise: Number(spIn.value || 0),
            attributed_revenue_paise: Number(revIn.value || 0)
          });
          toast('Metric bucket logged', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 07: UTM MANAGEMENT ==================== */
  async function renderUtm(root) {
    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-12-007', 'Canonical lowercase snake_case UTM governance across Telegram, YouTube, Instagram, and WhatsApp.', [
        btn('+ Canonical UTM Builder', 'cso-edu-btn-primary', openUtmDrawer)
      ]));

      const data = await api(`${API}/utm`);
      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code', 'Label', 'Source / Medium / Campaign', 'Clicks / Conv', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(u => {
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', u.utm_code),
          el('td', '', u.label_en),
          el('td', 'cso-edu-mono', `${u.utm_source} / ${u.utm_medium} / ${u.utm_campaign}`),
          el('td', '', `${u.clicks_count} / ${u.conversions_count}`),
          el('td', '', statusBadge(u.governance_status)),
          el('td', 'cso-edu-row-actions', [
            btn('Copy Tagged URL', 'cso-edu-btn-sm', async () => {
              try {
                if (navigator.clipboard) await navigator.clipboard.writeText(u.full_tagged_url);
                toast('Copied canonical UTM URL', 'success');
              } catch { toast(u.full_tagged_url, 'info'); }
            }),
            btn('Revisions', 'cso-edu-btn-sm', () => openRevDrawer('07', u.id, u.utm_code))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openRevDrawer(mod, id, title) {
      const { backdrop, body } = openDrawer(`Revisions · ${title}`, []);
      attachRevisions(body, mod, id, () => { backdrop.remove(); draw(); });
    }

    function openUtmDrawer() {
      const lblIn = textInput('text', '', 'Link Label (e.g. Telegram OAS Mock)');
      const baseIn = textInput('url', 'https://csodisha.com/study-library/', 'https://csodisha.com/...');
      const srcIn = textInput('text', 'telegram', 'utm_source');
      const medIn = textInput('text', 'social', 'utm_medium');
      const cmpIn = textInput('text', 'opsc_oas_2026', 'utm_campaign');
      const cntIn = textInput('text', 'pinned_post', 'utm_content (optional)');

      const { backdrop, foot } = openDrawer('Canonical UTM Builder & Validator', [
        field('Label (English)', lblIn),
        field('Base URL (csodisha.com)', baseIn),
        field('utm_source (auto-normalized snake_case)', srcIn),
        field('utm_medium (auto-normalized snake_case)', medIn),
        field('utm_campaign (auto-normalized snake_case)', cmpIn),
        field('utm_content (optional)', cntIn)
      ]);
      foot.appendChild(btn('Build & Save UTM Link', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/utm`, 'POST', {
            label_en: lblIn.value.trim(),
            base_url: baseIn.value.trim(),
            utm_source: srcIn.value.trim(),
            utm_medium: medIn.value.trim(),
            utm_campaign: cmpIn.value.trim(),
            utm_content: cntIn.value.trim()
          });
          toast('Canonical UTM link saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 08: SOCIAL SHARING ==================== */
  async function renderSocialCards(root) {
    let curPreset = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-12-008', 'Bilingual EN & ଓଡ଼ିଆ OpenGraph and WhatsApp/Telegram share cards with zero inline styles.', [
        btn('+ Create Share Card', 'cso-edu-btn-primary', () => openCardDrawer(null))
      ]));

      const tabs = el('div', 'cso-edu-tabs');
      [['', 'All'], ['universal_og', 'Universal OG'], ['whatsapp_preview', 'WhatsApp Preview'], ['telegram_instant', 'Telegram'], ['x_twitter', 'X / Twitter']].forEach(([v, l]) => {
        tabs.appendChild(btn(l, `cso-edu-tab ${curPreset === v ? 'is-active' : ''}`, () => { curPreset = v; draw(); }));
      });
      root.appendChild(el('div', 'cso-edu-toolbar', [tabs]));

      const qs = curPreset ? `?platform_preset=${encodeURIComponent(curPreset)}` : '';
      const data = await api(`${API}/social-cards${qs}`);
      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code', 'Preset / Path', 'OG Title (EN)', 'Shares / Clickbacks', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(c => {
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', c.card_code),
          el('td', '', `${c.platform_preset} · ${c.target_path}`),
          el('td', '', c.og_title_en),
          el('td', '', `${c.shares_count} / ${c.clickbacks_count}`),
          el('td', '', statusBadge(c.card_status)),
          el('td', 'cso-edu-row-actions', [
            btn('Preview EN/OR Card', 'cso-edu-btn-sm', () => openPreviewDrawer(c)),
            btn('Edit', 'cso-edu-btn-sm', () => openCardDrawer(c))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openPreviewDrawer(c) {
      const enCard = el('div', 'cso-mkt-banner-preview theme-alabaster_emerald', [
        el('span', 'cso-mkt-banner-badge', `${c.platform_preset} · ${c.target_path}`),
        el('h4', 'cso-mkt-banner-head', c.og_title_en),
        el('p', 'cso-mkt-banner-sub', c.og_description_en || ''),
        el('span', 'cso-mkt-banner-cta', c.share_cta_text_en || 'Share')
      ]);
      const orCard = el('div', 'cso-mkt-banner-preview theme-forest_gold', [
        el('span', 'cso-mkt-banner-badge', `ଓଡ଼ିଆ · ${c.target_path}`),
        el('h4', 'cso-mkt-banner-head', c.og_title_or || c.og_title_en),
        el('p', 'cso-mkt-banner-sub', c.og_description_or || c.og_description_en || ''),
        el('span', 'cso-mkt-banner-cta', c.share_cta_text_or || 'ସେୟାର୍ କରନ୍ତୁ')
      ]);
      openDrawer(`Bilingual Social Share Card Preview · ${c.card_code}`, [
        el('div', 'cso-edu-label', 'English OG / Share Card'), enCard,
        el('div', 'cso-edu-label', 'Odia (ଓଡ଼ିଆ) OG / Share Card'), orCard
      ]);
    }

    function openCardDrawer(item) {
      const isEdit = Boolean(item);
      const pathIn = textInput('text', item ? item.target_path : '/study-library/', '/study-library/...');
      const preSel = selectOf([
        ['universal_og', 'universal_og'], ['whatsapp_preview', 'whatsapp_preview'],
        ['telegram_instant', 'telegram_instant'], ['x_twitter', 'x_twitter'], ['linkedin', 'linkedin']
      ], item ? item.platform_preset : 'universal_og');
      const tEn = textInput('text', item ? item.og_title_en : '', 'OG Title (EN)');
      const tOr = textInput('text', item ? item.og_title_or : '', 'OG Title (OR)');
      const dEn = textareaOf(item ? item.og_description_en : '', 'OG Description (EN)');
      const dOr = textareaOf(item ? item.og_description_or : '', 'OG Description (OR)');
      const stSel = selectOf([['active_live', 'active_live'], ['draft', 'draft'], ['archived', 'archived']], item ? item.card_status : 'active_live');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Share Card · ${item.card_code}` : 'Create Social Share Card', [
        field('Target Path', pathIn),
        field('Platform Preset', preSel),
        field('OG Title (English)', tEn),
        field('OG Title (Odia)', tOr),
        field('OG Description (English)', dEn),
        field('OG Description (Odia)', dOr),
        field('Status', stSel)
      ]);
      if (isEdit) attachRevisions(body, '08', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Card' : 'Create Card', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            target_path: pathIn.value.trim(),
            platform_preset: preSel.value,
            og_title_en: tEn.value.trim(),
            og_title_or: tOr.value.trim(),
            og_description_en: dEn.value.trim(),
            og_description_or: dOr.value.trim(),
            card_status: stSel.value
          };
          if (isEdit) await api(`${API}/social-cards/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/social-cards`, 'POST', payload);
          toast('Social share card saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  function renderModule(moduleId, root) {
    if (!MODULES[moduleId]) return false;
    root.textContent = '';
    if (moduleId === 'module-12-005') { renderReferrals(root); return true; }
    if (moduleId === 'module-12-006') { renderAnalytics(root); return true; }
    if (moduleId === 'module-12-007') { renderUtm(root); return true; }
    if (moduleId === 'module-12-008') { renderSocialCards(root); return true; }
    return false;
  }

  window.CSOMarketingBatch2 = { render: renderModule };
})();
