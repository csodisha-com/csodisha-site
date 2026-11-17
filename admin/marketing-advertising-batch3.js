/* Marketing & Advertising Batch 3 (09-10) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/marketing';
  const MODULES = {
    'module-12-009': { num: '09', title: 'Promotional Landing Pages' },
    'module-12-010': { num: '10', title: 'Advertising Reports' }
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
    if (st === 'published_live') cls += ' is-active';
    else if (st === 'draft' || st === 'scheduled') cls += ' is-pending';
    else if (st === 'archived') cls += ' is-danger';
    return el('span', cls, st);
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

  /* ==================== MODULE 09: PROMOTIONAL LANDING PAGES ==================== */
  async function renderLandingPages(root) {
    let curStatus = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-12-009', 'Bilingual EN & ଓଡ଼ିଆ campaign landing pages with sanitized payloads and pure CSS themes.', [
        btn('+ Create Landing Page', 'cso-edu-btn-primary', () => openLpDrawer(null))
      ]));

      const tabs = el('div', 'cso-edu-tabs');
      [['', 'All'], ['published_live', 'Published Live'], ['draft', 'Drafts'], ['scheduled', 'Scheduled'], ['archived', 'Archived']].forEach(([v, l]) => {
        tabs.appendChild(btn(l, `cso-edu-tab ${curStatus === v ? 'is-active' : ''}`, () => { curStatus = v; draw(); }));
      });
      root.appendChild(el('div', 'cso-edu-toolbar', [tabs]));

      const qs = curStatus ? `?page_status=${encodeURIComponent(curStatus)}` : '';
      const data = await api(`${API}/landing-pages${qs}`);
      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code / Slug', 'Hero Title (EN)', 'Theme', 'Views / Conv (CVR)', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(lp => {
        const nextSt = lp.page_status === 'published_live' ? 'draft' : 'published_live';
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', `${lp.page_code} · /${lp.slug}`),
          el('td', '', lp.hero_title_en),
          el('td', '', lp.theme_variant),
          el('td', '', `${lp.views_count} / ${lp.conversions_count} (${lp.conversion_rate_pct}%)`),
          el('td', '', statusBadge(lp.page_status)),
          el('td', 'cso-edu-row-actions', [
            btn('Preview EN/OR', 'cso-edu-btn-sm', () => openPreviewDrawer(lp)),
            btn('Edit', 'cso-edu-btn-sm', () => openLpDrawer(lp)),
            btn(lp.page_status === 'published_live' ? 'Unpublish' : 'Publish', 'cso-edu-btn-sm', async () => {
              try {
                await api(`${API}/landing-pages/${encodeURIComponent(lp.id)}/status`, 'PATCH', { page_status: nextSt });
                toast(`Landing page ${nextSt}`, 'success');
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

    function openPreviewDrawer(lp) {
      const th = lp.theme_variant || 'forest_gold';
      const enCard = el('div', `cso-mkt-banner-preview theme-${th}`, [
        el('span', 'cso-mkt-banner-badge', lp.hero_badge_en || 'Odisha Exam Special'),
        el('h4', 'cso-mkt-banner-head', lp.hero_title_en),
        el('p', 'cso-mkt-banner-sub', lp.hero_subtitle_en || ''),
        el('span', 'cso-mkt-banner-cta', lp.primary_cta_label_en || 'Explore Now')
      ]);
      const orCard = el('div', `cso-mkt-banner-preview theme-${th}`, [
        el('span', 'cso-mkt-banner-badge', lp.hero_badge_or || 'ଓଡ଼ିଶା ପରୀକ୍ଷା ବିଶେଷ'),
        el('h4', 'cso-mkt-banner-head', lp.hero_title_or || lp.hero_title_en),
        el('p', 'cso-mkt-banner-sub', lp.hero_subtitle_or || lp.hero_subtitle_en || ''),
        el('span', 'cso-mkt-banner-cta', lp.primary_cta_label_or || 'ବର୍ତ୍ତମାନ ଦେଖନ୍ତୁ')
      ]);
      const hlBox = el('ul', '', (lp.highlights || []).map(h => el('li', '', `${h.title_en} — ${h.desc_en}`)));
      openDrawer(`Landing Page Preview · /${lp.slug}`, [
        el('div', 'cso-edu-label', 'English Hero Preview'), enCard,
        el('div', 'cso-edu-label', 'Odia (ଓଡ଼ିଆ) Hero Preview'), orCard,
        el('div', 'cso-edu-label', 'Highlights'), hlBox
      ]);
    }

    function openLpDrawer(item) {
      const isEdit = Boolean(item);
      const slugIn = textInput('text', item ? item.slug : '', 'opsc-oas-2026-kit');
      if (isEdit) slugIn.disabled = true;
      const tEn = textInput('text', item ? item.hero_title_en : '', 'Hero Title (EN)');
      const tOr = textInput('text', item ? item.hero_title_or : '', 'Hero Title (OR)');
      const sEn = textareaOf(item ? item.hero_subtitle_en : '', 'Hero Subtitle (EN)');
      const sOr = textareaOf(item ? item.hero_subtitle_or : '', 'Hero Subtitle (OR)');
      const ctaEn = textInput('text', item ? item.primary_cta_label_en : 'Explore Now', 'CTA Label (EN)');
      const urlIn = textInput('url', item ? item.primary_cta_url : 'https://csodisha.com/study-library/', 'https://csodisha.com/...');
      const thSel = selectOf([
        ['forest_gold', 'forest_gold'], ['alabaster_emerald', 'alabaster_emerald'],
        ['amber_highlight', 'amber_highlight'], ['royal_indigo', 'royal_indigo']
      ], item ? item.theme_variant : 'forest_gold');
      const stSel = selectOf([['draft', 'draft'], ['published_live', 'published_live'], ['scheduled', 'scheduled'], ['archived', 'archived']], item ? item.page_status : 'published_live');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Landing Page · ${item.page_code}` : 'Create Promotional Landing Page', [
        field('URL Slug (kebab-case)', slugIn),
        field('Hero Title (English)', tEn),
        field('Hero Title (Odia)', tOr),
        field('Hero Subtitle (English)', sEn),
        field('Hero Subtitle (Odia)', sOr),
        field('Primary CTA Label (English)', ctaEn),
        field('Primary CTA URL', urlIn),
        field('Theme Variant', thSel),
        field('Page Status', stSel)
      ]);
      if (isEdit) attachRevisions(body, '09', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Landing Page' : 'Create Landing Page', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            slug: slugIn.value.trim(),
            hero_title_en: tEn.value.trim(),
            hero_title_or: tOr.value.trim(),
            hero_subtitle_en: sEn.value.trim(),
            hero_subtitle_or: sOr.value.trim(),
            primary_cta_label_en: ctaEn.value.trim(),
            primary_cta_url: urlIn.value.trim(),
            theme_variant: thSel.value,
            page_status: stSel.value
          };
          if (isEdit) await api(`${API}/landing-pages/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/landing-pages`, 'POST', payload);
          toast('Landing page saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 10: ADVERTISING REPORTS ==================== */
  async function renderReports(root) {
    let curType = 'sponsor_roi_statement';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-12-010', 'Live cross-module marketing ledgers with snapshot persistence and CSV / JSON downloads.', [
        btn('Save Report Snapshot', 'cso-edu-btn-primary', async () => {
          try {
            await api(`${API}/reports`, 'POST', {
              report_type: curType,
              period_label: '2026-Q4 / Nov 2026',
              title_en: `Snapshot: ${curType}`
            });
            toast('Report snapshot saved', 'success');
            draw();
          } catch (e) { toast(e.message, 'error'); }
        })
      ]));

      const typeSel = selectOf([
        ['sponsor_roi_statement', 'Sponsor ROI Statement'],
        ['campaign_performance_ledger', 'Campaign Performance Ledger'],
        ['placement_yield_audit', 'Placement Yield Audit'],
        ['referral_commission_payouts', 'Referral Commission Payouts'],
        ['utm_channel_attribution', 'UTM Channel Attribution']
      ], curType);
      typeSel.addEventListener('change', () => { curType = typeSel.value; draw(); });
      root.appendChild(el('div', 'cso-edu-toolbar', [field('Report Mode', typeSel)]));

      const data = await api(`${API}/reports?report_type=${encodeURIComponent(curType)}`);

      // Live summary strip
      const sumCard = el('div', 'cso-edu-card');
      sumCard.appendChild(el('div', 'cso-edu-label', 'Live Summary Metrics'));
      const strip = el('div', 'cso-edu-tabs');
      Object.entries(data.live_summary || {}).forEach(([k, v]) => {
        strip.appendChild(el('span', 'cso-urc-badge-status is-active', `${k}: ${v}`));
      });
      sumCard.appendChild(strip);
      root.appendChild(sumCard);

      // Live ledger preview
      const liveRows = data.live_rows || [];
      const ledgerCard = el('div', 'cso-edu-card');
      ledgerCard.appendChild(el('div', 'cso-edu-label', 'Live Ledger Preview'));
      if (liveRows.length) {
        const cols = Object.keys(liveRows[0]);
        const tbl = el('table', 'cso-edu-table');
        tbl.appendChild(el('thead', '', el('tr', '', cols.map(c => el('th', '', c)))));
        const tbody = el('tbody', '');
        liveRows.forEach(r => {
          tbody.appendChild(el('tr', '', cols.map(c => el('td', '', String(r[c] ?? '')))));
        });
        tbl.appendChild(tbody);
        ledgerCard.appendChild(tbl);
      } else {
        ledgerCard.appendChild(el('div', 'cso-edu-muted', 'No rows for this report type.'));
      }
      root.appendChild(ledgerCard);

      // Saved report snapshots with CSV/JSON download links
      const savedCard = el('div', 'cso-edu-card');
      savedCard.appendChild(el('div', 'cso-edu-label', 'Saved Report Snapshots'));
      const sTbl = el('table', 'cso-edu-table');
      sTbl.appendChild(el('thead', '', el('tr', '', ['Code', 'Type', 'Period', 'Title', 'Created', 'Exports'].map(h => el('th', '', h)))));
      const sBody = el('tbody', '');
      (data.saved_reports || []).forEach(r => {
        const csvLink = el('a', 'cso-edu-btn cso-edu-btn-sm', 'Export CSV');
        csvLink.href = `${API}/reports/${encodeURIComponent(r.id)}/export?format=csv`;
        csvLink.download = `${r.report_code}.csv`;
        const jsonLink = el('a', 'cso-edu-btn cso-edu-btn-sm', 'Export JSON');
        jsonLink.href = `${API}/reports/${encodeURIComponent(r.id)}/export?format=json`;
        jsonLink.download = `${r.report_code}.json`;

        sBody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', r.report_code),
          el('td', '', r.report_type),
          el('td', '', r.period_label),
          el('td', '', r.title_en),
          el('td', '', r.created_at),
          el('td', 'cso-edu-row-actions', [csvLink, jsonLink])
        ]));
      });
      sTbl.appendChild(sBody);
      savedCard.appendChild(sTbl);
      root.appendChild(savedCard);
    }

    await draw();
  }

  function renderModule(moduleId, root) {
    if (!MODULES[moduleId]) return false;
    root.textContent = '';
    if (moduleId === 'module-12-009') { renderLandingPages(root); return true; }
    if (moduleId === 'module-12-010') { renderReports(root); return true; }
    return false;
  }

  window.CSOMarketingBatch3 = { render: renderModule };
})();
