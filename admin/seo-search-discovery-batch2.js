/* SEO, Search & Discovery Batch 2 (05-08) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/seo';
  const MODULES = {
    'module-seo-005': { num: '05', title: 'Canonical URL Rules & Redirect Manager (301/302)' },
    'module-seo-006': { num: '06', title: 'Robots.txt & Crawler Directives Studio' },
    'module-seo-007': { num: '07', title: 'Bilingual Search Index & Odia Tokenizer Settings' },
    'module-seo-008': { num: '08', title: 'Keyword Boosting & Synonyms (OCS, CGL, RI, ARI, Amin)' }
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

  function checkboxOf(labelText, checked) {
    const wrap = el('label', 'cso-edu-field');
    const cb = el('input');
    cb.type = 'checkbox';
    cb.checked = Boolean(checked);
    wrap.append(cb, document.createTextNode(' ' + labelText));
    return { wrap, cb };
  }

  function statusBadge(st) {
    let cls = 'cso-urc-badge-status';
    if (st === 'active_live' || st === 'active' || st === 1 || st === true) cls += ' is-active';
    else if (st === 'paused' || st === 'draft') cls += ' is-pending';
    else if (st === 'archived' || st === 0 || st === false) cls += ' is-danger';
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

  /* ==================== MODULE 05: CANONICALS & REDIRECTS ==================== */
  async function renderRedirects(root) {
    let activeKind = '';
    let searchQ = '';

    async function draw() {
      root.textContent = '';
      const ov = await api(`${API}/overview`).catch(() => ({}));
      const qs = new URLSearchParams();
      if (activeKind) qs.set('rule_kind', activeKind);
      if (searchQ) qs.set('q', searchQ);
      const data = await api(`${API}/redirects?${qs.toString()}`).catch(() => ({ items: [] }));

      root.appendChild(header('05', MODULES['module-seo-005'].title,
        '301/302 redirects & canonical URL overrides with self-loop and chain prevention.',
        [btn('+ Add Redirect / Canonical', 'cso-edu-btn-primary', () => openRedirectDrawer(null))]));

      root.appendChild(kpiRow([
        ['Active Rules', ov.active_redirects_canonicals || 0, '301 / 302 / Canonical'],
        ['Total Rules', (data.items || []).length, 'Filtered view'],
        ['Loop Guard', 'Enforced', 'Self-loop & 2-hop chain blocked']
      ]));

      const tabs = el('div', 'cso-edu-tabs');
      [['', 'All'], ['redirect_301', '301 Permanent'], ['redirect_302', '302 Temporary'], ['canonical_override', 'Canonical Override']].forEach(([k, lbl]) => {
        tabs.appendChild(btn(lbl, activeKind === k ? 'is-active' : '', () => { activeKind = k; draw(); }));
      });
      root.appendChild(tabs);

      const qIn = textInput('search', searchQ, 'Filter by source path, target URL, or rule code...');
      const bar = el('div', 'cso-edu-toolbar', [
        qIn,
        btn('Search', '', () => { searchQ = qIn.value.trim(); draw(); })
      ]);
      root.appendChild(bar);

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code', 'Type', 'Source Path', 'Target URL', 'Hits', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(r => {
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', r.rule_code),
          el('td', '', r.rule_kind),
          el('td', 'cso-edu-mono', r.source_path),
          el('td', 'cso-edu-mono', r.target_url),
          el('td', '', String(r.hits_count || 0)),
          el('td', '', statusBadge(r.rule_status)),
          el('td', 'cso-edu-row-actions', [
            btn('Edit', 'cso-edu-btn-sm', () => openRedirectDrawer(r)),
            btn(r.rule_status === 'active_live' ? 'Pause' : 'Activate', 'cso-edu-btn-sm', async () => {
              try {
                const next = r.rule_status === 'active_live' ? 'paused' : 'active_live';
                await api(`${API}/redirects/${encodeURIComponent(r.id)}/status`, 'PATCH', { rule_status: next });
                toast(`Rule ${next}`, 'success');
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

    function openRedirectDrawer(item) {
      const isEdit = Boolean(item);
      const kindSel = selectOf([['redirect_301', '301 Permanent'], ['redirect_302', '302 Temporary'], ['canonical_override', 'Canonical Override']], item ? item.rule_kind : 'redirect_301');
      const srcIn = textInput('text', item ? item.source_path : '', '/old-path');
      const tgtIn = textInput('text', item ? item.target_url : '', '/new-target/ or https://csodisha.com/...');
      const modeSel = selectOf([['exact', 'Exact Match'], ['prefix', 'Prefix Match']], item ? item.match_mode : 'exact');
      const pq = checkboxOf('Preserve query string', item ? Boolean(item.preserve_query_string) : true);
      const noteIn = textInput('text', item ? item.reason_note : '', 'Reason for redirect or canonical');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Rule · ${item.rule_code}` : 'Add Redirect / Canonical Rule', [
        field('Rule Kind', kindSel),
        field('Source Path', srcIn),
        field('Target URL', tgtIn),
        field('Match Mode', modeSel),
        pq.wrap,
        field('Reason Note', noteIn)
      ]);
      if (isEdit) attachRevisions(body, '05', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Rule' : 'Create Rule', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            rule_kind: kindSel.value,
            source_path: srcIn.value.trim(),
            target_url: tgtIn.value.trim(),
            match_mode: modeSel.value,
            preserve_query_string: pq.cb.checked,
            reason_note: noteIn.value.trim()
          };
          if (isEdit) await api(`${API}/redirects/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/redirects`, 'POST', payload);
          toast('Redirect rule saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 06: ROBOTS.TXT STUDIO ==================== */
  async function renderRobots(root) {
    let uaFilter = '';

    async function draw() {
      root.textContent = '';
      const data = await api(`${API}/robots`).catch(() => ({ items: [], compiled_robots_txt: '' }));
      const allItems = data.items || [];
      const items = uaFilter === 'AI'
        ? allItems.filter(r => ['GPTBot', 'CCBot', 'Bytespider'].includes(r.user_agent))
        : uaFilter ? allItems.filter(r => r.user_agent === uaFilter) : allItems;

      root.appendChild(header('06', MODULES['module-seo-006'].title,
        'Manage User-agent directives, AI scraper governance & locked /admin/ /api/ safety guardrails.',
        [
          btn('Preview Compiled robots.txt', '', () => {
            const { backdrop } = openDrawer('Compiled /api/seo/robots.txt', [
              el('pre', 'cso-seo-pre-box', data.compiled_robots_txt || '')
            ]);
            void backdrop;
          }),
          btn('+ Add Directive', 'cso-edu-btn-primary', () => openRobotDrawer(null))
        ]));

      root.appendChild(kpiRow([
        ['Total Directives', allItems.length, 'Active & paused'],
        ['Safety-Locked', allItems.filter(r => Number(r.is_locked_safety_rule) === 1).length, '/admin/ & /api/ protected'],
        ['Public Endpoint', '/api/seo/robots.txt', 'Edge-cached text/plain']
      ]));

      const tabs = el('div', 'cso-edu-tabs');
      [['', 'All'], ['*', '*'], ['Googlebot', 'Googlebot'], ['Bingbot', 'Bingbot'], ['AI', 'AI Crawlers']].forEach(([u, lbl]) => {
        tabs.appendChild(btn(lbl, uaFilter === u ? 'is-active' : '', () => { uaFilter = u; draw(); }));
      });
      root.appendChild(tabs);

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Order', 'User-Agent', 'Directive', 'Path / Value', 'Purpose', 'Guard', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      items.forEach(r => {
        const locked = Number(r.is_locked_safety_rule) === 1;
        const rowActions = [btn('Edit', 'cso-edu-btn-sm', () => openRobotDrawer(r))];
        if (!locked) {
          rowActions.push(btn('Delete', 'cso-edu-btn-sm', async () => {
            try {
              await api(`${API}/robots/${encodeURIComponent(r.id)}`, 'DELETE');
              toast('Directive deleted', 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }));
        }
        tbody.appendChild(el('tr', '', [
          el('td', '', String(r.rule_order)),
          el('td', 'cso-edu-mono', r.user_agent),
          el('td', '', r.directive_type),
          el('td', 'cso-edu-mono', r.path_or_value),
          el('td', '', r.policy_purpose),
          el('td', '', locked ? el('span', 'cso-seo-lock-badge', 'Safety Locked') : statusBadge(r.is_active)),
          el('td', 'cso-edu-row-actions', rowActions)
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openRobotDrawer(item) {
      const isEdit = Boolean(item);
      const locked = isEdit && Number(item.is_locked_safety_rule) === 1;
      const orderIn = textInput('number', item ? String(item.rule_order) : '90', '10');
      const uaIn = textInput('text', item ? item.user_agent : '*', '* or Googlebot or GPTBot');
      const dirSel = selectOf([['Allow', 'Allow'], ['Disallow', 'Disallow'], ['Crawl-delay', 'Crawl-delay']], item ? item.directive_type : 'Disallow');
      const pathIn = textInput('text', item ? item.path_or_value : '', '/path/ or 2');
      const purpSel = selectOf([
        ['core_search_allow', 'core_search_allow'],
        ['private_area_block', 'private_area_block'],
        ['ai_scraper_governance', 'ai_scraper_governance'],
        ['crawl_rate_guard', 'crawl_rate_guard']
      ], item ? item.policy_purpose : 'core_search_allow');
      const actCb = checkboxOf('Directive Active', item ? Boolean(item.is_active) : true);
      if (locked) {
        dirSel.disabled = true;
        pathIn.disabled = true;
        actCb.cb.disabled = true;
      }

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Directive · ${item.user_agent}` : 'Add Robots.txt Directive', [
        field('Rule Order', orderIn),
        field('User-Agent', uaIn),
        field('Directive Type', dirSel),
        field('Path or Crawl-delay Value', pathIn),
        field('Policy Purpose', purpSel),
        actCb.wrap
      ]);
      if (isEdit) attachRevisions(body, '06', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Directive' : 'Create Directive', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            rule_order: Number(orderIn.value || 90),
            user_agent: uaIn.value.trim(),
            directive_type: dirSel.value,
            path_or_value: pathIn.value.trim(),
            policy_purpose: purpSel.value,
            is_active: actCb.cb.checked
          };
          if (isEdit) await api(`${API}/robots/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/robots`, 'POST', payload);
          toast('Robots directive saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 07: ODIA TOKENIZER ==================== */
  async function renderTokenizer(root) {
    async function draw() {
      root.textContent = '';
      const data = await api(`${API}/tokenizer`).catch(() => ({ items: [] }));

      root.appendChild(header('07', MODULES['module-seo-007'].title,
        'Configure Unicode normalization, Odia matra folding, cross-script bridge & field weights.',
        [btn('Odia & EN Tokenizer Sandbox', 'cso-edu-btn-primary', () => openSandboxDrawer())]));

      root.appendChild(kpiRow([
        ['Search Indexes', (data.items || []).length, 'Bilingual EN + Odia'],
        ['Active Indexes', (data.items || []).filter(c => Number(c.is_active) === 1).length, 'Production ready'],
        ['Indexed Docs', (data.items || []).reduce((a, b) => a + Number(b.indexed_docs_count || 0), 0), 'Across portals']
      ]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Index Key', 'Name (EN / OR)', 'Unicode', 'Weights (T / OR / Tag / Body)', 'Docs', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(c => {
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', c.index_key),
          el('td', '', `${c.index_name_en} · ${c.index_name_or}`),
          el('td', '', c.unicode_normalization),
          el('td', 'cso-edu-mono', `${c.title_weight} / ${c.odia_title_weight} / ${c.tags_weight} / ${c.body_weight}`),
          el('td', '', String(c.indexed_docs_count || 0)),
          el('td', 'cso-edu-row-actions', [
            btn('Configure', 'cso-edu-btn-sm', () => openTokenizerDrawer(c))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openTokenizerDrawer(item) {
      const normSel = selectOf([['NFC', 'NFC'], ['NFKC', 'NFKC']], item.unicode_normalization);
      const matra = checkboxOf('Odia Matra Folding', Boolean(item.odia_matra_folding));
      const stopw = checkboxOf('Strip Odia & EN Stopwords', Boolean(item.strip_odia_stopwords));
      const bridge = checkboxOf('Cross-Script Phonetic Bridge', Boolean(item.cross_script_phonetic_bridge));
      const twIn = textInput('number', String(item.title_weight), '1..10');
      const owIn = textInput('number', String(item.odia_title_weight), '1..10');
      const tagIn = textInput('number', String(item.tags_weight), '1..10');
      const bodyIn = textInput('number', String(item.body_weight), '1..5');

      const { backdrop, body, foot } = openDrawer(`Configure Index · ${item.index_key}`, [
        field('Unicode Normalization', normSel),
        matra.wrap,
        stopw.wrap,
        bridge.wrap,
        field('Title Weight (1-10)', twIn),
        field('Odia Title Weight (1-10)', owIn),
        field('Tags Weight (1-10)', tagIn),
        field('Body Weight (1-5)', bodyIn)
      ]);
      attachRevisions(body, '07', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn('Save Config', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/tokenizer/${encodeURIComponent(item.id)}`, 'PUT', {
            unicode_normalization: normSel.value,
            odia_matra_folding: matra.cb.checked,
            strip_odia_stopwords: stopw.cb.checked,
            cross_script_phonetic_bridge: bridge.cb.checked,
            title_weight: Number(twIn.value || 8),
            odia_title_weight: Number(owIn.value || 9),
            tags_weight: Number(tagIn.value || 6),
            body_weight: Number(bodyIn.value || 2)
          });
          toast('Tokenizer config updated', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    function openSandboxDrawer() {
      const qIn = textInput('text', 'ଓଡ଼ିଶା ଚାକିରି OPSC OAS ଏବଂ ସୁଭଦ୍ରା ଯୋଜନା', 'Enter mixed EN + Odia query');
      const out = el('div', 'cso-edu-card', 'Run a test query to inspect normalized tokens & cross-script bridge.');
      const { foot } = openDrawer('Odia & English Tokenizer Sandbox', [
        field('Test Mixed Query', qIn),
        out
      ]);
      foot.appendChild(btn('Test Mixed Query', 'cso-edu-btn-primary', async () => {
        try {
          const res = await api(`${API}/tokenizer/test-tokenize`, 'POST', { query: qIn.value });
          out.textContent = '';
          out.appendChild(el('div', 'cso-edu-label', `Normalized (${res.unicode_normalization}): ${res.normalized_text}`));
          out.appendChild(el('div', 'cso-edu-label', 'Tokens:'));
          out.appendChild(el('div', 'cso-seo-token-row', (res.tokens || []).map(t => el('span', 'cso-seo-token-chip', t))));
          out.appendChild(el('div', 'cso-edu-label', 'Cross-Script Bridge Tokens:'));
          out.appendChild(el('div', 'cso-seo-token-row', (res.bridge_tokens || []).map(t => el('span', 'cso-seo-token-chip', t))));
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 08: KEYWORD BOOSTING & SYNONYMS ==================== */
  async function renderSynonyms(root) {
    let activeDom = '';
    const DOMAINS = ['OPSC OCS/OAS', 'OSSC CGL', 'OSSSC RI/ARI/Amin', 'NTA UGC NET', 'OSSTET/OTET', 'Odisha Schemes'];

    async function draw() {
      root.textContent = '';
      const qs = activeDom ? `?exam_or_domain=${encodeURIComponent(activeDom)}` : '';
      const data = await api(`${API}/synonyms${qs}`).catch(() => ({ items: [] }));

      root.appendChild(header('08', MODULES['module-seo-008'].title,
        'Exam acronym expansion, bilingual synonym clusters & relevance boost factors.',
        [
          btn('Query Expansion Tester', '', () => openExpandDrawer()),
          btn('+ Add Synonym Cluster', 'cso-edu-btn-primary', () => openSynonymDrawer(null))
        ]));

      root.appendChild(kpiRow([
        ['Synonym Clusters', (data.items || []).length, activeDom || 'All Odisha domains'],
        ['Active Clusters', (data.items || []).filter(s => Number(s.is_active) === 1).length, 'Live query boosting'],
        ['Max Boost', '5.0x', 'Configured per cluster']
      ]));

      const tabs = el('div', 'cso-edu-tabs');
      tabs.appendChild(btn('All', activeDom === '' ? 'is-active' : '', () => { activeDom = ''; draw(); }));
      DOMAINS.forEach(d => {
        tabs.appendChild(btn(d, activeDom === d ? 'is-active' : '', () => { activeDom = d; draw(); }));
      });
      root.appendChild(tabs);

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code', 'Domain', 'Primary Term', 'Synonyms', 'Boost', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(s => {
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', s.synonym_code),
          el('td', '', s.exam_or_domain),
          el('td', 'cso-edu-mono', s.primary_term),
          el('td', '', (s.synonyms || []).join(', ')),
          el('td', '', el('span', 'cso-seo-boost-badge', `Boost ×${s.boost_factor}`)),
          el('td', '', statusBadge(s.is_active)),
          el('td', 'cso-edu-row-actions', [
            btn('Edit', 'cso-edu-btn-sm', () => openSynonymDrawer(s))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openSynonymDrawer(item) {
      const isEdit = Boolean(item);
      const domSel = selectOf(DOMAINS.map(d => [d, d]), item ? item.exam_or_domain : 'OPSC OCS/OAS');
      const termIn = textInput('text', item ? item.primary_term : '', 'e.g. RI or OCS');
      const synsIn = textInput('text', item ? (item.synonyms || []).join(', ') : '', 'Comma-separated EN & Odia synonyms');
      const boostIn = textInput('number', item ? String(item.boost_factor) : '2.5', '1.0..5.0');
      boostIn.step = '0.1';
      const urlIn = textInput('text', item ? item.pinned_target_url : '', '/jobs-careers/...');
      const biCb = checkboxOf('Bidirectional Expansion', item ? Boolean(item.is_bidirectional) : true);

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Synonym · ${item.synonym_code}` : 'Add Synonym Cluster', [
        field('Exam / Domain', domSel),
        field('Primary Term', termIn),
        field('Synonyms (comma-separated)', synsIn),
        field('Boost Factor (1.0 - 5.0)', boostIn),
        field('Pinned Target URL (optional)', urlIn),
        biCb.wrap
      ]);
      if (isEdit) attachRevisions(body, '08', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Cluster' : 'Create Cluster', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            exam_or_domain: domSel.value,
            primary_term: termIn.value.trim(),
            synonyms: synsIn.value,
            boost_factor: Number(boostIn.value || 2.0),
            pinned_target_url: urlIn.value.trim(),
            is_bidirectional: biCb.cb.checked
          };
          if (isEdit) await api(`${API}/synonyms/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/synonyms`, 'POST', payload);
          toast('Synonym cluster saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    function openExpandDrawer() {
      const qIn = textInput('text', 'ri ari amin pyq', 'e.g. ri ari amin pyq or ocs syllabus');
      const out = el('div', 'cso-edu-card', 'Test live synonym expansion & boost factors.');
      const { foot } = openDrawer('Query Expansion Tester', [
        field('Search Query', qIn),
        out
      ]);
      foot.appendChild(btn('Expand Query', 'cso-edu-btn-primary', async () => {
        try {
          const res = await api(`${API}/synonyms/expand-query`, 'POST', { query: qIn.value });
          out.textContent = '';
          out.appendChild(el('div', 'cso-edu-label', `Max Boost Factor: ×${res.max_boost_factor}`));
          out.appendChild(el('div', 'cso-seo-token-row', (res.expanded_terms || []).map(t => el('span', 'cso-seo-token-chip', t))));
          (res.matched_clusters || []).forEach(c => {
            out.appendChild(el('div', 'cso-edu-sub', `${c.synonym_code} (${c.exam_or_domain}) · Boost ×${c.boost_factor} -> ${c.pinned_target_url || 'none'}`));
          });
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  function renderModule(moduleId, root) {
    if (!MODULES[moduleId]) return false;
    root.textContent = '';
    if (moduleId === 'module-seo-005') { renderRedirects(root); return true; }
    if (moduleId === 'module-seo-006') { renderRobots(root); return true; }
    if (moduleId === 'module-seo-007') { renderTokenizer(root); return true; }
    if (moduleId === 'module-seo-008') { renderSynonyms(root); return true; }
    return false;
  }

  window.CSOSeoBatch2 = { render: renderModule };
})();
