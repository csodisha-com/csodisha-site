/* SEO, Search & Discovery Batch 4 (13-16) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/seo';
  const MODULES = {
    'module-seo-013': { num: '13', title: 'Rich Snippet Previewer (Google SERP, WhatsApp, Telegram, X)' },
    'module-seo-014': { num: '14', title: 'Internal Linking Graph & Orphan Node Detector' },
    'module-seo-015': { num: '15', title: 'URL Slug Normalizer & Cyrillic/Odia Transliteration' },
    'module-seo-016': { num: '16', title: 'Platform Search Analytics & Intent Tracking' }
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
    if (st === 'optimal_ready' || st === 'healthy_connected' || st === 'linked_to_hub' || st === 'rising' || st === 1) cls += ' is-active';
    else if (st === 'title_truncated' || st === 'steady' || st === 'seasonal_peak') cls += ' is-pending';
    else if (st === 'missing_og_image' || st === 'orphan_detected' || st === 0) cls += ' is-danger';
    return el('span', cls, String(st));
  }

  function openDrawer(title, bodyNodes) {
    const backdrop = el('div', 'cso-edu-drawer-backdrop');
    const drawer = el('div', 'cso-edu-drawer');
    const head = el('div', 'cso-edu-drawer-head', [
      el('h3', '', title),
      btn('Close', 'cso-edu-btn-sm', () => backdrop.remove())
    ]);
    const body = el('div', 'cso-edu-drawer-body', bodyNodes);
    const foot = el('div', 'cso-edu-drawer-foot', [
      btn('Cancel', '', () => backdrop.remove())
    ]);
    drawer.append(head, body, foot);
    backdrop.appendChild(drawer);
    document.body.appendChild(backdrop);
    return { backdrop, body, foot };
  }

  async function attachRevisions(container, moduleCode, entityId, onRestored) {
    const box = el('div', 'cso-edu-card');
    box.appendChild(el('div', 'cso-edu-label', 'Revision History & Rollback'));
    const list = el('div', 'cso-edu-rev-list', 'Loading revisions...');
    box.appendChild(list);
    container.appendChild(box);
    try {
      const data = await api(`${API}/revisions?module_code=${encodeURIComponent(moduleCode)}&entity_id=${encodeURIComponent(entityId)}`);
      list.textContent = '';
      if (!data.items || !data.items.length) { list.textContent = 'No prior revisions yet.'; return; }
      data.items.slice(0, 6).forEach(r => {
        list.appendChild(el('div', 'cso-edu-rev-item', [
          el('span', '', `v${r.version_num} · ${r.change_note || 'update'} (${r.created_at || ''})`),
          btn('Rollback', 'cso-edu-btn-sm', async () => {
            try {
              await api(`${API}/revisions/rollback`, 'POST', { revision_id: r.id });
              toast(`Restored v${r.version_num}`, 'success');
              onRestored();
            } catch (e) { toast(e.message, 'error'); }
          })
        ]));
      });
    } catch (e) { list.textContent = e.message; }
  }

  function header(num, title, subtitle, actions) {
    const h = el('div', 'cso-edu-header');
    h.appendChild(el('div', '', [
      el('h2', '', `SEO ${num} · ${title}`),
      el('div', 'cso-edu-sub', subtitle)
    ]));
    if (actions && actions.length) h.appendChild(el('div', 'cso-edu-actions', actions));
    return h;
  }

  function kpiRow(items) {
    return el('div', 'cso-edu-kpis', items.map(([label, val, sub]) => el('div', 'cso-edu-kpi', [
      el('div', 'cso-edu-kpi-label', label),
      el('div', 'cso-edu-kpi-val', String(val)),
      sub ? el('div', 'cso-edu-kpi-sub', sub) : null
    ].filter(Boolean))));
  }

  function progressBar(val, max) {
    const p = el('progress', 'cso-edu-progress');
    p.max = max || 100;
    p.value = Math.min(max || 100, Math.max(0, Number(val || 0)));
    return p;
  }

  /* ==================== MODULE 13: RICH SNIPPET PREVIEWER ==================== */
  async function renderRichSnippets(root) {
    async function draw() {
      root.textContent = '';
      const ov = await api(`${API}/overview`).catch(() => ({}));
      const data = await api(`${API}/rich-snippets`).catch(() => ({ items: [] }));

      root.appendChild(header('13', MODULES['module-seo-013'].title,
        '4-Platform Live Card Simulator (Google SERP, WhatsApp, Telegram, X) & pixel-width audit.',
        [btn('4-Platform Live Simulator', 'cso-edu-btn-primary', () => openSimulatorDrawer(null))]));

      root.appendChild(kpiRow([
        ['Suite 16 Active', `${ov.suite_16?.active_modules || 16} / 16`, 'All SEO modules live'],
        ['Saved Snapshots', (data.items || []).length, 'SERP & OpenGraph cards'],
        ['Optimal Ready', (data.items || []).filter(s => s.og_card_readiness === 'optimal_ready').length, 'Pixel width <= 580px']
      ]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code', 'Title (EN)', 'Schema', 'SERP Px', 'Readiness', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(s => {
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', s.snapshot_code),
          el('td', '', s.title_en),
          el('td', '', el('span', 'cso-seo-boost-badge', s.schema_badge_type)),
          el('td', 'cso-edu-mono', `${s.serp_pixel_width_est}px`),
          el('td', '', statusBadge(s.og_card_readiness)),
          el('td', 'cso-edu-row-actions', [
            btn('Preview 4-Card', 'cso-edu-btn-sm', () => openSimulatorDrawer(s))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openSimulatorDrawer(item) {
      const isEdit = Boolean(item);
      const urlIn = textInput('text', item ? item.target_url : 'https://csodisha.com/jobs-careers/opsc-oas-2026/', 'https://csodisha.com/...');
      const titleIn = textInput('text', item ? item.title_en : 'OPSC OAS 2026 Notification, Syllabus & PYQs', 'Title (EN)');
      const descIn = textareaOf(item ? item.description_en : 'Complete OPSC Odisha Civil Services 2026 notification, eligibility, syllabus PDF & solved PYQs.', 'Meta Description (EN)');
      const imgIn = textInput('text', item ? item.og_image_url : 'https://csodisha.com/assets/brand/cso-og-jobs.png', 'OG Image URL');
      const badgeSel = selectOf([['JobPosting', 'JobPosting'], ['GovernmentService', 'GovernmentService'], ['Quiz', 'Quiz'], ['FAQPage', 'FAQPage'], ['Article', 'Article']], item ? item.schema_badge_type : 'JobPosting');
      const previewGrid = el('div', 'cso-seo-sim-grid', 'Click "Simulate 4 Platforms" to render live cards.');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Rich Snippet · ${item.snapshot_code}` : '4-Platform Live Card Simulator', [
        field('Target URL', urlIn),
        field('Title (EN)', titleIn),
        field('Description (EN)', descIn),
        field('OG Image URL', imgIn),
        field('Schema Badge', badgeSel),
        previewGrid
      ]);
      if (isEdit) attachRevisions(body, '13', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn('Simulate 4 Platforms', '', async () => {
        try {
          const res = await api(`${API}/rich-snippets/simulate`, 'POST', {
            target_url: urlIn.value.trim(),
            title_en: titleIn.value.trim(),
            description_en: descIn.value.trim(),
            og_image_url: imgIn.value.trim(),
            schema_badge_type: badgeSel.value
          });
          const sim = res.simulation;
          previewGrid.textContent = '';
          const p = sim.platforms;
          previewGrid.appendChild(el('div', 'cso-seo-sim-card is-serp', [
            el('div', 'cso-seo-sim-plat', `Google SERP · ${sim.serp_pixel_width_est}px (${sim.og_card_readiness})`),
            el('div', 'cso-seo-sim-url', p.google_serp.breadcrumb),
            el('div', 'cso-seo-sim-title', p.google_serp.title),
            el('div', 'cso-seo-sim-desc', p.google_serp.description)
          ]));
          previewGrid.appendChild(el('div', 'cso-seo-sim-card is-wa', [
            el('div', 'cso-seo-sim-plat', 'WhatsApp Preview'),
            el('div', 'cso-seo-sim-title', p.whatsapp.title),
            el('div', 'cso-seo-sim-desc', p.whatsapp.description),
            el('div', 'cso-seo-sim-url', p.whatsapp.domain)
          ]));
          previewGrid.appendChild(el('div', 'cso-seo-sim-card is-tg', [
            el('div', 'cso-seo-sim-plat', 'Telegram Instant'),
            el('div', 'cso-seo-sim-title', p.telegram.title),
            el('div', 'cso-seo-sim-desc', p.telegram.description)
          ]));
          previewGrid.appendChild(el('div', 'cso-seo-sim-card is-x', [
            el('div', 'cso-seo-sim-plat', `X / Twitter (${p.x_card.card})`),
            el('div', 'cso-seo-sim-title', p.x_card.title),
            el('div', 'cso-seo-sim-desc', p.x_card.description)
          ]));
        } catch (e) { toast(e.message, 'error'); }
      }));

      foot.appendChild(btn(isEdit ? 'Save Snapshot' : 'Save New Snapshot', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            target_url: urlIn.value.trim(),
            title_en: titleIn.value.trim(),
            description_en: descIn.value.trim(),
            og_image_url: imgIn.value.trim(),
            schema_badge_type: badgeSel.value
          };
          if (isEdit) await api(`${API}/rich-snippets/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/rich-snippets`, 'POST', payload);
          toast('Rich snippet snapshot saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 14: INTERNAL LINK GRAPH & ORPHANS ==================== */
  async function renderLinkGraph(root) {
    let statusFilter = '';

    async function draw() {
      root.textContent = '';
      const qs = statusFilter ? `?resolution_status=${encodeURIComponent(statusFilter)}` : '';
      const data = await api(`${API}/link-graph${qs}`).catch(() => ({ items: [] }));

      root.appendChild(header('14', MODULES['module-seo-014'].title,
        'Audit internal link equity, detect orphan pages & connect them to parent hubs.',
        [btn('Run Internal Link Graph Audit', 'cso-edu-btn-primary', async () => {
          try {
            const res = await api(`${API}/link-graph/scan`, 'POST', {});
            toast(`Scanned ${res.scanned_count} nodes · ${res.orphan_count} orphan(s)`, 'info');
            draw();
          } catch (e) { toast(e.message, 'error'); }
        })]));

      root.appendChild(kpiRow([
        ['Graph Nodes', (data.items || []).length, 'Filtered view'],
        ['Orphan Nodes', (data.items || []).filter(n => Number(n.is_orphan_node) === 1).length, 'Zero inbound links'],
        ['Avg Equity Score', (data.items || []).length ? Math.round((data.items || []).reduce((a, b) => a + Number(b.link_equity_score || 0), 0) / (data.items || []).length) : 0, '0–100 link equity']
      ]));

      const tabs = el('div', 'cso-edu-tabs');
      [['', 'All Nodes'], ['orphan_detected', 'Orphan Detected'], ['healthy_connected', 'Healthy Connected'], ['linked_to_hub', 'Linked to Hub']].forEach(([s, lbl]) => {
        tabs.appendChild(btn(lbl, statusFilter === s ? 'is-active' : '', () => { statusFilter = s; draw(); }));
      });
      root.appendChild(tabs);

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Node Path', 'In / Out', 'Depth', 'Link Equity', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(n => {
        const actions = [];
        if (Number(n.is_orphan_node) === 1 || n.resolution_status === 'orphan_detected') {
          actions.push(btn('Connect to Parent Hub', 'cso-edu-btn-sm cso-edu-btn-primary', async () => {
            try {
              await api(`${API}/link-graph/${encodeURIComponent(n.id)}/link-hub`, 'PATCH', { parent_hub: n.recommended_parent_hub });
              toast(`Connected ${n.node_path} -> ${n.recommended_parent_hub}`, 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }));
        }
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', n.node_path),
          el('td', 'cso-edu-mono', `${n.inbound_links_count} / ${n.outbound_links_count}`),
          el('td', '', String(n.click_depth_from_home)),
          el('td', '', [progressBar(n.link_equity_score, 100), el('span', 'cso-edu-sub', ` ${n.link_equity_score}/100`)]),
          el('td', '', statusBadge(n.resolution_status)),
          el('td', 'cso-edu-row-actions', actions.length ? actions : [el('span', 'cso-edu-sub', 'Connected')])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    await draw();
  }

  /* ==================== MODULE 15: URL SLUG NORMALIZER ==================== */
  async function renderSlugNormalizer(root) {
    async function draw() {
      root.textContent = '';
      const data = await api(`${API}/slug-normalizer`).catch(() => ({ items: [] }));

      root.appendChild(header('15', MODULES['module-seo-015'].title,
        'Deterministic Odia, Cyrillic & accented Latin phonetic transliteration to RFC-3986 ASCII slugs.',
        [btn('Live Odia / Cyrillic Slug Sandbox', 'cso-edu-btn-primary', () => openTranslitDrawer())]));

      root.appendChild(kpiRow([
        ['Transliteration Rules', (data.items || []).length, 'Odia / Cyrillic / Latin'],
        ['Active Rules', (data.items || []).filter(r => Number(r.is_active) === 1).length, 'Production normalizer'],
        ['Total Uses', (data.items || []).reduce((a, b) => a + Number(b.usage_count || 0), 0), 'Slugs generated']
      ]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code', 'Script Family', 'Source Sample', 'Normalized Slug', 'Max Len'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(r => {
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', r.rule_code),
          el('td', '', el('span', 'cso-seo-boost-badge', r.script_family)),
          el('td', '', r.source_sample),
          el('td', 'cso-edu-mono', r.normalized_slug),
          el('td', '', String(r.max_slug_length))
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openTranslitDrawer() {
      const srcIn = textInput('text', 'ଓଡ଼ିଶା ଲୋକସେବା ଆୟୋଗ ୨୦୨୬', 'Enter Odia, Cyrillic, or Latin text');
      const outBox = el('div', 'cso-edu-card', 'Click "Transliterate" to generate ASCII slug.');
      const { foot } = openDrawer('Live Odia / Cyrillic → ASCII Slug Sandbox', [
        field('Source Text', srcIn),
        outBox
      ]);
      foot.appendChild(btn('Transliterate', 'cso-edu-btn-primary', async () => {
        try {
          const res = await api(`${API}/slug-normalizer/transliterate`, 'POST', { source_text: srcIn.value });
          outBox.textContent = '';
          outBox.appendChild(el('div', 'cso-edu-label', `Detected Script: ${res.script_family}`));
          outBox.appendChild(el('div', 'cso-seo-token-chip', res.normalized_slug));
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 16: SEARCH ANALYTICS & INTENT ==================== */
  async function renderSearchIntent(root) {
    let bucketFilter = '';
    const BUCKETS = [
      ['', 'All Intents'],
      ['exam_syllabus_pyq', 'Exam Syllabus/PYQ'],
      ['job_notification_apply', 'Job Apply'],
      ['welfare_scheme_eligibility', 'Welfare Scheme'],
      ['mock_test_practice', 'Mock Test'],
      ['navigational_portal', 'Navigational']
    ];

    async function draw() {
      root.textContent = '';
      const ov = await api(`${API}/overview`).catch(() => ({}));
      const qs = bucketFilter ? `?intent_bucket=${encodeURIComponent(bucketFilter)}` : '';
      const data = await api(`${API}/search-intent${qs}`).catch(() => ({ items: [] }));
      const maxClicks = Math.max(1, ...(data.items || []).map(i => Number(i.search_clicks_30d || 0)));

      root.appendChild(header('16', MODULES['module-seo-016'].title,
        'Privacy-safe search intent clusters, CTR % & ranking telemetry (zero cookies, zero PII).',
        [btn('+ Record Intent Cluster', 'cso-edu-btn-primary', () => openIntentDrawer())]));

      root.appendChild(kpiRow([
        ['Blended Search CTR', `${ov.blended_search_ctr_pct || 0}%`, '30-day aggregate'],
        ['Intent Clusters', (data.items || []).length, 'Tracked query groups'],
        ['Suite 16 Status', `${ov.suite_16?.active_modules || 16}/16 Active`, 'Complete SEO Suite']
      ]));

      const tabs = el('div', 'cso-edu-tabs');
      BUCKETS.forEach(([b, lbl]) => {
        tabs.appendChild(btn(lbl, bucketFilter === b ? 'is-active' : '', () => { bucketFilter = b; draw(); }));
      });
      root.appendChild(tabs);

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code', 'Query Cluster', 'Bucket / Lang', 'Clicks Share', 'CTR %', 'Avg Rank', 'Trend'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(m => {
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', m.intent_code),
          el('td', '', m.query_cluster),
          el('td', '', `${m.intent_bucket} · ${m.lang_script}`),
          el('td', '', [progressBar(m.search_clicks_30d, maxClicks), el('span', 'cso-edu-sub', ` ${m.search_clicks_30d}`)]),
          el('td', '', el('span', 'cso-seo-boost-badge', `${(Number(m.ctr_pct || 0) / 100).toFixed(2)}%`)),
          el('td', 'cso-edu-mono', `#${(Number(m.avg_result_rank_x10 || 10) / 10).toFixed(1)}`),
          el('td', '', statusBadge(m.trend_direction))
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openIntentDrawer() {
      const clIn = textInput('text', '', 'e.g. OSSSC Forest Guard Syllabus 2026');
      const bSel = selectOf(BUCKETS.slice(1), 'exam_syllabus_pyq');
      const lSel = selectOf([['mixed_bilingual', 'Mixed Bilingual'], ['en', 'English'], ['or', 'Odia']], 'mixed_bilingual');
      const impIn = textInput('number', '12000', 'Impressions 30d');
      const clkIn = textInput('number', '1650', 'Clicks 30d');
      const trSel = selectOf([['rising', 'Rising'], ['steady', 'Steady'], ['seasonal_peak', 'Seasonal Peak']], 'rising');

      const { backdrop, foot } = openDrawer('Record Search Intent Cluster', [
        field('Query Cluster', clIn),
        field('Intent Bucket', bSel),
        field('Language Script', lSel),
        field('Impressions (30d)', impIn),
        field('Clicks (30d)', clkIn),
        field('Trend Direction', trSel)
      ]);
      foot.appendChild(btn('Record Cluster', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/search-intent/record`, 'POST', {
            query_cluster: clIn.value.trim(),
            intent_bucket: bSel.value,
            lang_script: lSel.value,
            impressions_30d: Number(impIn.value || 0),
            search_clicks_30d: Number(clkIn.value || 0),
            trend_direction: trSel.value
          });
          toast('Search intent cluster recorded', 'success');
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
    if (moduleId === 'module-seo-013') { renderRichSnippets(root); return true; }
    if (moduleId === 'module-seo-014') { renderLinkGraph(root); return true; }
    if (moduleId === 'module-seo-015') { renderSlugNormalizer(root); return true; }
    if (moduleId === 'module-seo-016') { renderSearchIntent(root); return true; }
    return false;
  }

  window.CSOSeoBatch4 = { render: renderModule };
})();
