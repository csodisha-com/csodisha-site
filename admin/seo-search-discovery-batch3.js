/* SEO, Search & Discovery Batch 3 (09-12) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/seo';
  const MODULES = {
    'module-seo-009': { num: '09', title: 'Search Autocomplete & Typo-Tolerance Rules' },
    'module-seo-010': { num: '10', title: 'Zero-Result Queries & Fallback Search Fallbacks' },
    'module-seo-011': { num: '11', title: 'Google Search Console, Bing & Yandex IndexNow Engine' },
    'module-seo-012': { num: '12', title: 'Core Web Vitals, Edge Cache & Pre-rendering Hints' }
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
    if (st === 'active_live' || st === 'accepted_200' || st === 1 || st === true) cls += ' is-active';
    else if (st === 'draft' || st === 'queued_batch') cls += ' is-pending';
    else if (st === 'archived' || st === 'validation_failed' || st === 0 || st === false) cls += ' is-danger';
    const label = st === 1 || st === true ? 'active' : st === 0 || st === false ? 'inactive' : String(st);
    return el('span', cls, label);
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

  /* ==================== MODULE 09: AUTOCOMPLETE & TYPO RULES ==================== */
  async function renderAutocomplete(root) {
    let badgeFilter = '';

    async function draw() {
      root.textContent = '';
      const ov = await api(`${API}/overview`).catch(() => ({}));
      const qs = badgeFilter ? `?portal_badge=${encodeURIComponent(badgeFilter)}` : '';
      const data = await api(`${API}/autocomplete${qs}`).catch(() => ({ items: [] }));

      root.appendChild(header('09', MODULES['module-seo-009'].title,
        'Bilingual prefix autocomplete & Levenshtein typo-tolerance rules.',
        [
          btn('Live Typo & Prefix Tester', '', () => openTesterDrawer()),
          btn('+ Add Autocomplete Rule', 'cso-edu-btn-primary', () => openAcDrawer(null))
        ]));

      root.appendChild(kpiRow([
        ['Active Autocomplete', ov.active_autocomplete_rules || 0, 'Prefix + Typo rules'],
        ['Public Endpoint', '/api/seo/autocomplete', 'Edge-cached suggestions'],
        ['Max Edit Distance', '0 – 2', 'Levenshtein fuzzy match']
      ]));

      const tabs = el('div', 'cso-edu-tabs');
      ['', 'Study Library', 'Jobs & Careers', 'Odisha Schemes', 'Mock Tests'].forEach(b => {
        tabs.appendChild(btn(b || 'All', badgeFilter === b ? 'is-active' : '', () => { badgeFilter = b; draw(); }));
      });
      root.appendChild(tabs);

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code', 'Prefix', 'Suggestion (EN)', 'Portal', 'Edit Dist', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(r => {
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', r.suggestion_code),
          el('td', 'cso-edu-mono', r.trigger_prefix),
          el('td', '', r.suggestion_label_en),
          el('td', '', el('span', 'cso-seo-boost-badge', r.portal_badge)),
          el('td', '', el('span', 'cso-seo-token-chip', `Edit Distance ≤ ${r.max_edit_distance}`)),
          el('td', '', statusBadge(r.is_active)),
          el('td', 'cso-edu-row-actions', [
            btn('Edit', 'cso-edu-btn-sm', () => openAcDrawer(r))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openAcDrawer(item) {
      const isEdit = Boolean(item);
      const prefIn = textInput('text', item ? item.trigger_prefix : '', 'opsc or subh');
      const lblEn = textInput('text', item ? item.suggestion_label_en : '', 'Suggestion label (EN)');
      const lblOr = textInput('text', item ? item.suggestion_label_or : '', 'Suggestion label (Odia)');
      const tgtIn = textInput('text', item ? item.target_url : '', '/jobs-careers/opsc-ocs/');
      const badgeSel = selectOf([['Study Library', 'Study Library'], ['Jobs & Careers', 'Jobs & Careers'], ['Odisha Schemes', 'Odisha Schemes'], ['Mock Tests', 'Mock Tests']], item ? item.portal_badge : 'Jobs & Careers');
      const typosIn = textInput('text', item ? (item.typo_variants || []).join(', ') : '', 'opcs, opscc');
      const distSel = selectOf([['0', '0 (Exact)'], ['1', '1 (Typo <= 1)'], ['2', '2 (Typo <= 2)']], String(item ? item.max_edit_distance : 1));
      const popIn = textInput('number', item ? String(item.popularity_score) : '500', '1..5000');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Rule · ${item.suggestion_code}` : 'Add Autocomplete Rule', [
        field('Trigger Prefix', prefIn),
        field('Suggestion Label (EN)', lblEn),
        field('Suggestion Label (OR)', lblOr),
        field('Target URL', tgtIn),
        field('Portal Badge', badgeSel),
        field('Typo Variants (comma-separated)', typosIn),
        field('Max Edit Distance', distSel),
        field('Popularity Score', popIn)
      ]);
      if (isEdit) attachRevisions(body, '09', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Rule' : 'Create Rule', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            trigger_prefix: prefIn.value.trim(),
            suggestion_label_en: lblEn.value.trim(),
            suggestion_label_or: lblOr.value.trim(),
            target_url: tgtIn.value.trim(),
            portal_badge: badgeSel.value,
            typo_variants: typosIn.value,
            max_edit_distance: Number(distSel.value),
            popularity_score: Number(popIn.value || 100)
          };
          if (isEdit) await api(`${API}/autocomplete/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/autocomplete`, 'POST', payload);
          toast('Autocomplete rule saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    function openTesterDrawer() {
      const qIn = textInput('text', 'subhdra', 'Try subhdra, opcs, or ossc');
      const out = el('div', 'cso-edu-card', 'Test live prefix & Levenshtein typo matching.');
      const { foot } = openDrawer('Live Typo & Prefix Autocomplete Tester', [
        field('Query / Misspelling', qIn),
        out
      ]);
      foot.appendChild(btn('Test Suggest', 'cso-edu-btn-primary', async () => {
        try {
          const res = await api(`${API}/autocomplete/test-suggest`, 'POST', { query: qIn.value });
          out.textContent = '';
          if ((res.suggestions || []).length) {
            res.suggestions.forEach(s => {
              out.appendChild(el('div', 'cso-edu-rev-item', [
                el('span', '', `${s.suggestion_label_en} (${s.match_type}, d=${s.edit_distance})`),
                el('span', 'cso-edu-mono', s.target_url)
              ]));
            });
          } else {
            out.appendChild(el('div', 'cso-edu-label', `No direct match; ${(res.fallbacks || []).length} fallback(s) returned.`));
          }
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 10: ZERO-RESULT FALLBACKS ==================== */
  async function renderZeroFallbacks(root) {
    async function draw() {
      root.textContent = '';
      const data = await api(`${API}/zero-fallbacks`).catch(() => ({ items: [] }));

      root.appendChild(header('10', MODULES['module-seo-010'].title,
        'Curated cards & exam hub fallbacks for zero-result candidate queries.',
        [btn('+ Create Zero-Result Fallback', 'cso-edu-btn-primary', () => openZrfDrawer(null))]));

      root.appendChild(kpiRow([
        ['Fallback Rules', (data.items || []).length, 'Zero-result safety net'],
        ['Active Live', (data.items || []).filter(z => z.status === 'active_live').length, 'Serving unmatched queries'],
        ['Total Trigger Hits', (data.items || []).reduce((a, b) => a + Number(b.trigger_hits_count || 0), 0), 'Rescued searches']
      ]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code', 'Unmatched Pattern', 'Strategy', 'Fallback Title (EN)', 'Links', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(z => {
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', z.fallback_code),
          el('td', 'cso-edu-mono', z.unmatched_query_pattern),
          el('td', '', el('span', 'cso-seo-boost-badge', z.fallback_strategy)),
          el('td', '', z.fallback_title_en),
          el('td', '', String((z.recommended_links || []).length)),
          el('td', '', statusBadge(z.status)),
          el('td', 'cso-edu-row-actions', [
            btn('Edit', 'cso-edu-btn-sm', () => openZrfDrawer(z))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openZrfDrawer(item) {
      const isEdit = Boolean(item);
      const patIn = textInput('text', item ? item.unmatched_query_pattern : '', 'e.g. ri amin admit card');
      const stratSel = selectOf([['curated_cards', 'Curated Cards'], ['broad_portal_redirect', 'Broad Portal Redirect'], ['related_exam_hub', 'Related Exam Hub']], item ? item.fallback_strategy : 'curated_cards');
      const tEn = textInput('text', item ? item.fallback_title_en : '', 'Fallback Title (EN)');
      const tOr = textInput('text', item ? item.fallback_title_or : '', 'Fallback Title (OR)');
      const linksIn = textareaOf(JSON.stringify(item ? (item.recommended_links || []) : [{ label_en: 'Study Library', label_or: 'ଅଧ୍ୟୟନ ଲାଇବ୍ରେରୀ', url: '/study-library/' }], null, 2), 'JSON array of links');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Fallback · ${item.fallback_code}` : 'Create Zero-Result Fallback', [
        field('Unmatched Query Pattern', patIn),
        field('Fallback Strategy', stratSel),
        field('Fallback Title (EN)', tEn),
        field('Fallback Title (OR)', tOr),
        field('Recommended Links (JSON)', linksIn)
      ]);
      if (isEdit) attachRevisions(body, '10', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Fallback' : 'Create Fallback', 'cso-edu-btn-primary', async () => {
        try {
          let links = [];
          try { links = JSON.parse(linksIn.value || '[]'); } catch { throw new Error('Recommended Links must be valid JSON'); }
          const payload = {
            unmatched_query_pattern: patIn.value.trim(),
            fallback_strategy: stratSel.value,
            fallback_title_en: tEn.value.trim(),
            fallback_title_or: tOr.value.trim(),
            recommended_links: links
          };
          if (isEdit) await api(`${API}/zero-fallbacks/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/zero-fallbacks`, 'POST', payload);
          toast('Fallback rule saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 11: INDEXNOW & GSC ENGINE ==================== */
  async function renderIndexNow(root) {
    let engFilter = '';

    async function draw() {
      root.textContent = '';
      const qs = engFilter ? `?engine_target=${encodeURIComponent(engFilter)}` : '';
      const data = await api(`${API}/indexnow${qs}`).catch(() => ({ items: [], key_masked_hint: 'cso-idx-••••9a4f' }));

      root.appendChild(header('11', MODULES['module-seo-011'].title,
        'Submit same-origin https://csodisha.com/ URLs to Bing, Yandex IndexNow & Google Search Console.',
        [btn('Submit URLs for Instant Indexing', 'cso-edu-btn-primary', () => openSubmitDrawer())]));

      root.appendChild(kpiRow([
        ['Submission Batches', (data.items || []).length, 'IndexNow & GSC log'],
        ['URLs Pinged', (data.items || []).reduce((a, b) => a + Number(b.url_count || 0), 0), 'Accepted 200'],
        ['Host Key Hint', data.key_masked_hint || 'cso-idx-••••9a4f', 'Masked (raw key never exposed)']
      ]));

      const tabs = el('div', 'cso-edu-tabs');
      [['', 'All'], ['indexnow_bing_yandex', 'IndexNow Bing/Yandex'], ['google_indexing_api', 'Google Indexing API'], ['sitemap_ping_all', 'Sitemap Ping']].forEach(([e, lbl]) => {
        tabs.appendChild(btn(lbl, engFilter === e ? 'is-active' : '', () => { engFilter = e; draw(); }));
      });
      root.appendChild(tabs);

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Batch', 'Engine', 'Action', 'URLs', 'Key Hint', 'Status', 'Submitted'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(x => {
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', x.batch_code),
          el('td', '', x.engine_target),
          el('td', '', x.action_type),
          el('td', '', String(x.url_count || 0)),
          el('td', 'cso-edu-mono', x.key_masked_hint),
          el('td', '', statusBadge(x.submission_status)),
          el('td', '', x.created_at || '')
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openSubmitDrawer() {
      const engSel = selectOf([['indexnow_bing_yandex', 'IndexNow (Bing & Yandex)'], ['google_indexing_api', 'Google Indexing API'], ['sitemap_ping_all', 'Sitemap Ping All']], 'indexnow_bing_yandex');
      const actSel = selectOf([['URL_UPDATED', 'URL_UPDATED'], ['URL_DELETED', 'URL_DELETED'], ['SITEMAP_RESUBMIT', 'SITEMAP_RESUBMIT']], 'URL_UPDATED');
      const urlsIn = textareaOf('https://csodisha.com/jobs-careers/\nhttps://csodisha.com/schemes/', 'One https://csodisha.com/... URL per line');

      const { backdrop, foot } = openDrawer('Submit URLs for Instant Indexing', [
        field('Target Engine', engSel),
        field('Action Type', actSel),
        field('Same-Origin URLs (https://csodisha.com/...)', urlsIn)
      ]);
      foot.appendChild(btn('Ping Search Engines', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/indexnow/submit`, 'POST', {
            engine_target: engSel.value,
            action_type: actSel.value,
            urls: urlsIn.value
          });
          toast('IndexNow batch accepted', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 12: EDGE CACHE & PRE-RENDER HINTS ==================== */
  async function renderEdgeHints(root) {
    async function draw() {
      root.textContent = '';
      const data = await api(`${API}/edge-hints`).catch(() => ({ items: [] }));

      root.appendChild(header('12', MODULES['module-seo-012'].title,
        'Cloudflare Edge TTL, stale-while-revalidate, LCP preload & Speculation Rules pre-rendering.',
        [btn('+ Add Edge Pre-Render Hint', 'cso-edu-btn-primary', () => openEdgeDrawer(null))]));

      root.appendChild(kpiRow([
        ['Edge Hint Rules', (data.items || []).length, 'Route-level CWV policy'],
        ['Critical LCP Routes', (data.items || []).filter(e => e.priority_tier === 'critical_lcp').length, 'Preload + SWR enabled'],
        ['Active Rules', (data.items || []).filter(e => Number(e.is_active) === 1).length, 'Production edge policy']
      ]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code', 'Route', 'Priority Tier', 'Edge TTL / SWR', 'Pre-render URLs', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(e => {
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', e.hint_code),
          el('td', 'cso-edu-mono', e.route_pattern),
          el('td', '', el('span', 'cso-seo-boost-badge', e.priority_tier)),
          el('td', 'cso-edu-mono', `${e.edge_cache_ttl_sec}s / ${e.stale_while_revalidate_sec}s`),
          el('td', '', String((e.speculation_prerender_urls || []).length)),
          el('td', '', statusBadge(e.is_active)),
          el('td', 'cso-edu-row-actions', [
            btn('Edit', 'cso-edu-btn-sm', () => openEdgeDrawer(e))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openEdgeDrawer(item) {
      const isEdit = Boolean(item);
      const routeIn = textInput('text', item ? item.route_pattern : '', '/jobs-careers/');
      if (isEdit) routeIn.disabled = true;
      const tierSel = selectOf([['critical_lcp', 'Critical LCP'], ['standard_edge', 'Standard Edge'], ['dynamic_bypass', 'Dynamic Bypass']], item ? item.priority_tier : 'standard_edge');
      const ttlIn = textInput('number', item ? String(item.edge_cache_ttl_sec) : '300', '60..86400');
      const swrIn = textInput('number', item ? String(item.stale_while_revalidate_sec) : '600', '0..86400');
      const specIn = textInput('text', item ? (item.speculation_prerender_urls || []).join(', ') : '', '/study-library/, /schemes/');
      const lcpIn = textInput('text', item ? item.lcp_image_preload_hint : '', '/assets/brand/cso-hero-2026.webp');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Edge Hint · ${item.hint_code}` : 'Add Edge Pre-Render Hint', [
        field('Route Pattern', routeIn),
        field('Priority Tier', tierSel),
        field('Edge Cache TTL (sec)', ttlIn),
        field('Stale-While-Revalidate (sec)', swrIn),
        field('Speculation Pre-render URLs (comma-separated)', specIn),
        field('LCP Image Preload Hint', lcpIn)
      ]);
      if (isEdit) attachRevisions(body, '12', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Hint' : 'Create Hint', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            route_pattern: routeIn.value.trim(),
            priority_tier: tierSel.value,
            edge_cache_ttl_sec: Number(ttlIn.value || 300),
            stale_while_revalidate_sec: Number(swrIn.value || 600),
            speculation_prerender_urls: specIn.value,
            lcp_image_preload_hint: lcpIn.value.trim()
          };
          if (isEdit) await api(`${API}/edge-hints/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/edge-hints`, 'POST', payload);
          toast('Edge pre-render hint saved', 'success');
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
    if (moduleId === 'module-seo-009') { renderAutocomplete(root); return true; }
    if (moduleId === 'module-seo-010') { renderZeroFallbacks(root); return true; }
    if (moduleId === 'module-seo-011') { renderIndexNow(root); return true; }
    if (moduleId === 'module-seo-012') { renderEdgeHints(root); return true; }
    return false;
  }

  window.CSOSeoBatch3 = { render: renderModule };
})();
