/* Analytics, Telemetry & User Feedback Intelligence Batch 1 (01-04) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/analytics';
  const MODULES = {
    'module-ana-001': { num: '01', title: 'Zero-Cookie Edge Telemetry & Real-Time Pageview Counter' },
    'module-ana-002': { num: '02', title: 'Top Search Intent, Trending Keywords & Discovery Ranks' },
    'module-ana-003': { num: '03', title: 'Zero-Result Query Detector & Auto-Synonym Mapping' },
    'module-ana-004': { num: '04', title: 'High-Demand PYQ, Syllabus & Material Download Metrics' }
  };

  const PORTALS = ['study-library', 'jobs-careers', 'schemes', 'educational-tools', 'community', 'home'];
  const MAT_TYPES = [
    ['', 'All'],
    ['pyq_paper', 'PYQ Papers'],
    ['exam_syllabus', 'Exam Syllabus'],
    ['study_notes', 'Study Notes'],
    ['model_mock', 'Model Mocks'],
    ['govt_notification', 'Govt Notifications']
  ];
  const EXAMS = ['OPSC OAS', 'OSSC CGL', 'OSSSC RI/ARI', 'UGC NET', 'OSSTET/OTET', '+2 CHSE'];

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

  function openDrawer(title, bodyNodes) {
    const backdrop = el('div', 'cso-edu-drawer-backdrop');
    const drawer = el('div', 'cso-edu-drawer');
    const head = el('div', 'cso-edu-drawer-head');
    head.append(el('h3', '', title), btn('Close', '', () => backdrop.remove()));
    const body = el('div', 'cso-edu-drawer-body');
    bodyNodes.forEach(n => body.appendChild(n));
    const foot = el('div', 'cso-edu-drawer-foot');
    drawer.append(head, body, foot);
    backdrop.appendChild(drawer);
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
    document.body.appendChild(backdrop);
    return { backdrop, body, foot };
  }

  function attachRevisions(body, moduleCode, entityId, onDone) {
    if (!entityId) return;
    const hist = el('div', 'cso-edu-rev-list');
    body.append(el('div', 'cso-edu-section-title', 'Revision history'), hist);
    api(`${API}/revisions?module_code=${moduleCode}&entity_id=${encodeURIComponent(entityId)}`).then(r => {
      const items = r.items || [];
      if (!items.length) {
        hist.appendChild(el('div', 'cso-edu-empty', 'No revisions yet.'));
        return;
      }
      items.slice(0, 8).forEach(rev => {
        const row = el('div', 'cso-edu-rev-item');
        row.appendChild(el('span', '', `v${rev.version_num} · ${rev.change_note || 'update'} · ${rev.created_at}`));
        row.appendChild(btn('Rollback', '', async () => {
          try {
            await api(`${API}/revisions/rollback`, 'POST', { revision_id: rev.id });
            toast(`Rolled back to v${rev.version_num}`, 'success');
            onDone();
          } catch (e) { toast(e.message, 'error'); }
        }));
        hist.appendChild(row);
      });
    }).catch(() => {});
  }

  /* ================= MODULE 01: ZERO-COOKIE EDGE TELEMETRY ================= */
  async function renderPageviews(root) {
    const state = { portal: '', lang: '', device: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const ov = await api(`${API}/overview`).catch(() => ({}));
      const kpis = el('div', 'cso-edu-kpis');
      [
        ['24h Cookieless Views', ov.pageviews_24h || 0],
        ['7d Total Views', ov.pageviews_7d || 0],
        ['Top Portal', ov.top_portal_section || 'study-library'],
        ['Total Search Volume', ov.total_search_volume || 0],
        ['Total Downloads', ov.total_downloads || 0]
      ].forEach(([lbl, val]) => {
        const c = el('div', 'cso-edu-kpi');
        c.append(el('div', 'cso-edu-kpi-lbl', lbl), el('div', 'cso-edu-kpi-val', String(val)));
        kpis.appendChild(c);
      });
      wrap.appendChild(kpis);

      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '01 · Zero-Cookie Edge Telemetry & Pageviews'),
        el('div', 'cso-edu-sub', el('span', 'cso-at-privacy-badge', '0 Cookies · 0 Raw IPs · Daily Salted Bucket Hash'))
      );
      head.append(tb, btn('+ Simulate Edge Hit', 'cso-edu-btn-primary', openIngestDrawer));
      wrap.appendChild(head);

      const qs = new URLSearchParams();
      if (state.portal) qs.set('portal_section', state.portal);
      if (state.lang) qs.set('lang_mode', state.lang);
      if (state.device) qs.set('device_class', state.device);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/pageviews?${qs.toString()}`);

      // Portal share progress bars
      const byPortal = data.by_portal || [];
      const maxViews = Math.max(1, ...byPortal.map(x => Number(x.views || 0)));
      if (byPortal.length) {
        const bars = el('div', 'cso-at-bar-list');
        byPortal.forEach(bp => {
          const row = el('div', 'cso-at-bar-row');
          const prog = document.createElement('progress');
          prog.max = maxViews;
          prog.value = Number(bp.views || 0);
          row.append(el('strong', '', bp.portal_section), prog, el('span', '', `${bp.views}`));
          bars.appendChild(row);
        });
        wrap.appendChild(bars);
      }

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search route or district...');
      qIn.className = 'cso-edu-input';
      const pSel = selectOf([['', 'All Portals'], ...PORTALS.map(p => [p, p])], state.portal);
      pSel.className = 'cso-edu-select';
      const lSel = selectOf([['', 'All Languages'], ['en', 'English'], ['or', 'Odia']], state.lang);
      lSel.className = 'cso-edu-select';
      const dSel = selectOf([['', 'All Devices'], ['mobile', 'Mobile'], ['desktop', 'Desktop'], ['tablet', 'Tablet']], state.device);
      dSel.className = 'cso-edu-select';
      bar.append(qIn, pSel, lSel, dSel, btn('Filter', 'cso-edu-btn-primary', () => {
        state.q = qIn.value.trim();
        state.portal = pSel.value;
        state.lang = lSel.value;
        state.device = dSel.value;
        draw();
      }));
      wrap.appendChild(bar);

      const items = data.items || [];
      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No edge telemetry records found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Date', 'Route & Portal', 'Lang & Device', 'District', 'Views', 'Unique Hashes', 'Avg TTFB'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(pv => {
        const tr = el('tr');
        tr.appendChild(el('td', '', pv.bucket_date));
        const rp = el('td');
        rp.append(el('strong', '', pv.route_path), el('div', 'cso-edu-sub', pv.portal_section));
        tr.appendChild(rp);
        tr.appendChild(el('td', '', `${pv.lang_mode.toUpperCase()} · ${pv.device_class}`));
        tr.appendChild(el('td', '', el('span', 'cso-urc-badge-district', pv.district_odisha || 'Khordha')));
        tr.appendChild(el('td', '', String(pv.views_count)));
        tr.appendChild(el('td', '', String(pv.unique_session_hashes)));
        tr.appendChild(el('td', '', `${pv.avg_ttfb_ms} ms`));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openIngestDrawer() {
      const routeIn = textInput('text', '/study-library/', '/study-library/...');
      const portSel = selectOf(PORTALS.map(p => [p, p]), 'study-library');
      const langSel = selectOf([['en', 'English'], ['or', 'Odia']], 'en');
      const devSel = selectOf([['mobile', 'Mobile'], ['desktop', 'Desktop'], ['tablet', 'Tablet']], 'mobile');
      const distIn = textInput('text', 'Khordha', 'Odisha District');

      const { backdrop, foot } = openDrawer('Simulate Cookieless Edge Hit', [
        field('Route Path', routeIn),
        field('Portal Section', portSel),
        field('Language Mode', langSel),
        field('Device Class', devSel),
        field('District (Odisha)', distIn)
      ]);
      foot.appendChild(btn('Record Edge Hit', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/pageviews/ingest`, 'POST', {
            route_path: routeIn.value.trim(),
            portal_section: portSel.value,
            lang_mode: langSel.value,
            device_class: devSel.value,
            district_odisha: distIn.value.trim()
          });
          toast('Cookieless edge hit recorded', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 02: TOP SEARCH INTENT ================= */
  async function renderSearchIntent(root) {
    const state = { scope: '', script: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '02 · Top Search Intent & Discovery Ranks'),
        el('div', 'cso-edu-sub', 'Ranked search keywords across English & Odia scripts with trend deltas.')
      );
      head.appendChild(tb);
      wrap.appendChild(head);

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search keyword...');
      qIn.className = 'cso-edu-input';
      const scSel = selectOf([
        ['', 'All Scopes'],
        ['all', 'Global'],
        ['study-library', 'Study Library'],
        ['jobs-careers', 'Jobs & Careers'],
        ['schemes', 'Schemes'],
        ['mock-tests', 'Mock Tests']
      ], state.scope);
      scSel.className = 'cso-edu-select';
      const scrSel = selectOf([['', 'All Scripts'], ['latin_en', 'English (Latin)'], ['odia_or', 'ଓଡ଼ିଆ (Odia)']], state.script);
      scrSel.className = 'cso-edu-select';
      bar.append(qIn, scSel, scrSel, btn('Filter', 'cso-edu-btn-primary', () => {
        state.q = qIn.value.trim();
        state.scope = scSel.value;
        state.script = scrSel.value;
        draw();
      }));
      wrap.appendChild(bar);

      const qs = new URLSearchParams();
      if (state.scope) qs.set('portal_scope', state.scope);
      if (state.script) qs.set('lang_script', state.script);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/search-intent?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No search queries found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Rank', 'Keyword', 'Script & Scope', 'Searches', 'Trend', 'Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(sq => {
        const tr = el('tr');
        tr.appendChild(el('td', '', el('span', 'cso-at-rank', `#${sq.discovery_rank}`)));
        const kw = el('td');
        kw.append(el('strong', '', sq.display_query), sq.mapped_synonym_target ? el('div', 'cso-edu-sub', `→ ${sq.mapped_synonym_target}`) : el('div', '', ''));
        tr.appendChild(kw);
        tr.appendChild(el('td', '', `${sq.lang_script === 'odia_or' ? 'ଓଡ଼ିଆ' : 'EN'} · ${sq.portal_scope}`));
        tr.appendChild(el('td', '', String(sq.search_count)));
        tr.appendChild(el('td', '', el('span', 'cso-at-trend-up', `+${sq.trend_delta_pct}%`)));
        tr.appendChild(el('td', '', sq.resolution_status));
        tr.appendChild(el('td', 'cso-edu-actions', btn('Ignore', 'cso-edu-btn-sm cso-edu-btn-danger', async () => {
          try {
            await api(`${API}/search-intent/${encodeURIComponent(sq.id)}`, 'PATCH', { resolution_status: 'ignored' });
            toast('Keyword ignored', 'info');
            draw();
          } catch (e) { toast(e.message, 'error'); }
        })));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    await draw();
  }

  /* ================= MODULE 03: ZERO-RESULT & AUTO-SYNONYMS ================= */
  async function renderZeroResults(root) {
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '03 · Zero-Result Query Detector & Auto-Synonyms'),
        el('div', 'cso-edu-sub', 'Map dead-end searches to canonical Odisha exam queries & live /api/search/synonyms expansion.')
      );
      head.append(tb, btn('+ Add Synonym Rule', 'cso-edu-btn-primary', () => openMapDrawer(null)));
      wrap.appendChild(head);

      const data = await api(`${API}/zero-results`);
      const zeros = data.zero_queries || [];
      const syns = data.synonyms || [];

      const split = el('div', 'cso-at-split');

      // Left: Zero-result queries
      const left = el('div', '');
      left.appendChild(el('div', 'cso-edu-section-title', `Zero-Result Queries (${zeros.length})`));
      if (!zeros.length) {
        left.appendChild(el('div', 'cso-edu-empty', 'No zero-result queries detected.'));
      } else {
        const tbl = el('table', 'cso-edu-table');
        const thead = el('thead');
        const hr = el('tr');
        ['Query', 'Hits', 'Status', 'Action'].forEach(h => hr.appendChild(el('th', '', h)));
        thead.appendChild(hr);
        tbl.appendChild(thead);
        const tbody = el('tbody');
        zeros.forEach(z => {
          const tr = el('tr');
          const qc = el('td');
          qc.append(el('strong', '', z.display_query), z.mapped_synonym_target ? el('div', 'cso-edu-sub', `Mapped: ${z.mapped_synonym_target}`) : el('div', '', ''));
          tr.appendChild(qc);
          tr.appendChild(el('td', '', String(z.search_count)));
          tr.appendChild(el('td', '', z.resolution_status));
          tr.appendChild(el('td', '', btn('Map Synonym', 'cso-edu-btn-sm cso-edu-btn-primary', () => openMapDrawer(z))));
          tbody.appendChild(tr);
        });
        tbl.appendChild(tbody);
        left.appendChild(tbl);
      }

      // Right: Active Synonyms
      const right = el('div', '');
      right.appendChild(el('div', 'cso-edu-section-title', `Active Auto-Synonyms (${syns.length})`));
      if (!syns.length) {
        right.appendChild(el('div', 'cso-edu-empty', 'No synonym rules yet.'));
      } else {
        const tbl = el('table', 'cso-edu-table');
        const thead = el('thead');
        const hr = el('tr');
        ['Trigger → Canonical', 'Hits', 'Active', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
        thead.appendChild(hr);
        tbl.appendChild(thead);
        const tbody = el('tbody');
        syns.forEach(s => {
          const tr = el('tr');
          const tc = el('td');
          tc.append(el('strong', '', `${s.source_term} → ${s.canonical_query}`), el('div', 'cso-edu-sub', s.target_url || 'No redirect URL'));
          tr.appendChild(tc);
          tr.appendChild(el('td', '', String(s.hit_count)));
          tr.appendChild(el('td', '', s.is_active ? 'Yes' : 'Off'));
          tr.appendChild(el('td', 'cso-edu-actions', [
            btn('Revisions', 'cso-edu-btn-sm', () => {
              const { backdrop, body } = openDrawer(`Revisions · ${s.source_term}`, []);
              attachRevisions(body, '03', s.id, () => { backdrop.remove(); draw(); });
            }),
            btn('Disable', 'cso-edu-btn-sm cso-edu-btn-danger', async () => {
              try {
                await api(`${API}/zero-results/${encodeURIComponent(s.id)}`, 'DELETE');
                toast('Synonym disabled', 'info');
                draw();
              } catch (e) { toast(e.message, 'error'); }
            })
          ]));
          tbody.appendChild(tr);
        });
        tbl.appendChild(tbody);
        right.appendChild(tbl);
      }

      split.append(left, right);
      wrap.appendChild(split);
    }

    function openMapDrawer(zeroQuery) {
      const srcIn = textInput('text', zeroQuery ? zeroQuery.normalized_query : '', 'e.g. ri amin old paper');
      const canIn = textInput('text', '', 'e.g. OSSSC RI ARI Amin Previous Year Question Papers');
      const urlIn = textInput('text', '/study-library/', 'Optional target URL');
      const boostIn = textInput('number', '20', '20');

      const { backdrop, foot } = openDrawer('Map Auto-Synonym Rule', [
        field('Source Trigger Term', srcIn),
        field('Canonical Query', canIn),
        field('Target Landing URL (optional)', urlIn),
        field('Boost Weight', boostIn)
      ]);
      foot.appendChild(btn('Save & Map Synonym', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/zero-results/map-synonym`, 'POST', {
            query_id: zeroQuery ? zeroQuery.id : '',
            source_term: srcIn.value.trim(),
            canonical_query: canIn.value.trim(),
            target_url: urlIn.value.trim(),
            boost_weight: Number(boostIn.value || 20)
          });
          toast('Synonym mapped & query resolved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 04: DOWNLOAD METRICS ================= */
  async function renderDownloads(root) {
    const state = { matType: '', exam: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '04 · High-Demand PYQ, Syllabus & Material Downloads'),
        el('div', 'cso-edu-sub', 'Track most-downloaded Odisha exam PDFs, syllabi, and model mocks.')
      );
      head.append(tb, btn('+ Record Download Metric', 'cso-edu-btn-primary', openRecordDrawer));
      wrap.appendChild(head);

      const tabs = el('div', 'cso-urc-tabs');
      MAT_TYPES.forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.matType === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.matType = val; draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search title, slug...');
      qIn.className = 'cso-edu-input';
      const exSel = selectOf([['', 'All Exams'], ...EXAMS.map(e => [e, e])], state.exam);
      exSel.className = 'cso-edu-select';
      bar.append(qIn, exSel, btn('Filter', 'cso-edu-btn-primary', () => {
        state.q = qIn.value.trim();
        state.exam = exSel.value;
        draw();
      }));
      wrap.appendChild(bar);

      const qs = new URLSearchParams();
      if (state.matType) qs.set('material_type', state.matType);
      if (state.exam) qs.set('exam_tag', state.exam);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/downloads?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No download metrics found.'));
        return;
      }

      const maxDl = Math.max(1, ...items.map(i => Number(i.downloads_count || 0)));
      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Resource (EN/OR)', 'Type & Exam', 'Demand Meter', 'Downloads', 'Unique Approx'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(d => {
        const tr = el('tr');
        const rc = el('td');
        rc.append(el('strong', '', d.resource_title_en), el('div', 'cso-edu-sub', d.resource_title_or || d.resource_slug));
        tr.appendChild(rc);
        tr.appendChild(el('td', '', `${d.material_type} · ${d.exam_tag}`));

        const progCell = el('td');
        const prog = document.createElement('progress');
        prog.className = 'cso-urc-progress';
        prog.max = maxDl;
        prog.value = Number(d.downloads_count || 0);
        progCell.appendChild(prog);
        tr.appendChild(progCell);

        tr.appendChild(el('td', '', String(d.downloads_count)));
        tr.appendChild(el('td', '', `${d.unique_downloaders_approx} (${d.avg_file_kb} KB)`));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openRecordDrawer() {
      const slugIn = textInput('text', '', 'e.g. opsc-oas-2026-syllabus');
      const titleIn = textInput('text', '', 'Resource title (EN)');
      const typeSel = selectOf(MAT_TYPES.filter(([v]) => v), 'pyq_paper');
      const examSel = selectOf(EXAMS.map(e => [e, e]), 'OPSC OAS');

      const { backdrop, foot } = openDrawer('Record Download Metric', [
        field('Resource Slug', slugIn),
        field('Resource Title (EN)', titleIn),
        field('Material Type', typeSel),
        field('Exam Tag', examSel)
      ]);
      foot.appendChild(btn('Record Download', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/downloads/record`, 'POST', {
            resource_slug: slugIn.value.trim(),
            resource_title_en: titleIn.value.trim(),
            material_type: typeSel.value,
            exam_tag: examSel.value
          });
          toast('Download metric recorded', 'success');
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
    if (moduleId === 'module-ana-001') { renderPageviews(root); return true; }
    if (moduleId === 'module-ana-002') { renderSearchIntent(root); return true; }
    if (moduleId === 'module-ana-003') { renderZeroResults(root); return true; }
    if (moduleId === 'module-ana-004') { renderDownloads(root); return true; }
    return false;
  }

  window.CSOAnalyticsTelemetryBatch1 = { render: renderModule };
})();
