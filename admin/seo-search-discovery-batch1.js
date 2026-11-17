/* SEO, Search & Discovery Batch 1 (01-04) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/seo';
  const MODULES = {
    'module-seo-001': { num: '01', title: 'Meta Tags, OpenGraph & Twitter Cards' },
    'module-seo-002': { num: '02', title: 'Dynamic JSON-LD Structured Data Schema Engine' },
    'module-seo-003': { num: '03', title: 'XML Sitemap Generator & Multi-Index Feeds' },
    'module-seo-004': { num: '04', title: 'RSS, Atom & News Syndication Hub' }
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
    if (st === 'active_live' || st === 'active' || st === 'valid_schema_org') cls += ' is-active';
    else if (st === 'draft' || st === 'paused' || st === 'warning_missing_optional') cls += ' is-pending';
    else if (st === 'archived' || st === 'invalid_json') cls += ' is-danger';
    return el('span', cls, st);
  }

  function progressBar(val, labelText) {
    const p = document.createElement('progress');
    p.className = 'cso-urc-progress';
    p.max = 100;
    p.value = Math.min(100, Math.max(0, Number(val || 0)));
    return el('span', '', [p, document.createTextNode(` ${labelText || `${p.value}/100`}`)]);
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
      el('div', 'cso-edu-kicker', `SEO, Search & Discovery · Module ${info.num} of 16`),
      el('h2', 'cso-edu-title', info.title),
      el('p', 'cso-edu-sub', subtitle)
    );
    const right = el('div', 'cso-edu-actions');
    (extraBtns || []).forEach(b => right.appendChild(b));
    bar.append(left, right);
    return bar;
  }

  /* ==================== MODULE 01: META TAGS & OPENGRAPH ==================== */
  async function renderMeta(root) {
    let curSection = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-seo-001', 'Bilingual EN & ଓଡ଼ିଆ meta titles, descriptions, OpenGraph, and Twitter Cards with live SEO health scoring.', [
        btn('+ New Meta Profile', 'cso-edu-btn-primary', () => openMetaDrawer(null))
      ]));

      const tabs = el('div', 'cso-edu-tabs');
      [['', 'All'], ['home', 'Home'], ['study-library', 'Study Library'], ['jobs-careers', 'Jobs & Careers'], ['schemes', 'Schemes'], ['educational-tools', 'Tools']].forEach(([v, l]) => {
        tabs.appendChild(btn(l, `cso-edu-tab ${curSection === v ? 'is-active' : ''}`, () => { curSection = v; draw(); }));
      });
      root.appendChild(el('div', 'cso-edu-toolbar', [tabs]));

      const qs = curSection ? `?portal_section=${encodeURIComponent(curSection)}` : '';
      const data = await api(`${API}/meta${qs}`);
      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Route', 'Meta Title (EN)', 'Lengths (T/D)', 'SEO Score', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(m => {
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', m.route_pattern),
          el('td', '', m.meta_title_en),
          el('td', '', `T:${m.title_char_count} / D:${m.desc_char_count}`),
          el('td', '', progressBar(m.seo_score, `${m.seo_score}/100`)),
          el('td', '', statusBadge(m.status)),
          el('td', 'cso-edu-row-actions', [
            btn('Edit', 'cso-edu-btn-sm', () => openMetaDrawer(m))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openMetaDrawer(item) {
      const isEdit = Boolean(item);
      const routeIn = textInput('text', item ? item.route_pattern : '/mock-tests/', '/route/');
      if (isEdit) routeIn.disabled = true;
      const secIn = textInput('text', item ? item.portal_section : 'educational-tools', 'portal_section');
      const tEn = textInput('text', item ? item.meta_title_en : '', '50-60 chars ideal');
      const tOr = textInput('text', item ? item.meta_title_or : '', 'ଓଡ଼ିଆ title');
      const dEn = textareaOf(item ? item.meta_description_en : '', '140-160 chars ideal');
      const dOr = textareaOf(item ? item.meta_description_or : '', 'ଓଡ଼ିଆ description');
      const kwEn = textInput('text', item ? item.keywords_en : '', 'comma-separated keywords');
      const ogSel = selectOf([['website', 'website'], ['article', 'article'], ['educational_resource', 'educational_resource']], item ? item.og_type : 'website');
      const robSel = selectOf([['index, follow', 'index, follow'], ['noindex, follow', 'noindex, follow'], ['noindex, nofollow', 'noindex, nofollow']], item ? item.robots_directive : 'index, follow');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Meta · ${item.route_pattern}` : 'New Meta Profile', [
        field('Route Pattern', routeIn),
        field('Portal Section', secIn),
        field('Meta Title (EN · 50-60 chars)', tEn),
        field('Meta Title (Odia)', tOr),
        field('Meta Description (EN · 140-160 chars)', dEn),
        field('Meta Description (Odia)', dOr),
        field('Keywords (EN)', kwEn),
        field('OG Type', ogSel),
        field('Robots Directive', robSel)
      ]);
      if (isEdit) attachRevisions(body, '01', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Meta Profile' : 'Create Meta Profile', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            route_pattern: routeIn.value.trim(),
            portal_section: secIn.value.trim(),
            meta_title_en: tEn.value.trim(),
            meta_title_or: tOr.value.trim(),
            meta_description_en: dEn.value.trim(),
            meta_description_or: dOr.value.trim(),
            keywords_en: kwEn.value.trim(),
            og_type: ogSel.value,
            robots_directive: robSel.value
          };
          if (isEdit) await api(`${API}/meta/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/meta`, 'POST', payload);
          toast('Meta profile saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 02: DYNAMIC JSON-LD SCHEMA ENGINE ==================== */
  async function renderSchemas(root) {
    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-seo-002', 'Schema.org JSON-LD structured data templates with script-stripping validation.', [
        btn('JSON-LD Validator', '', () => openSchemaDrawer(null)),
        btn('+ New Schema', 'cso-edu-btn-primary', () => openSchemaDrawer(null))
      ]));

      const data = await api(`${API}/schemas`);
      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code', 'Schema Type', 'Target Route', 'Name (EN)', 'Validation', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(s => {
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', s.schema_code),
          el('td', '', s.schema_type),
          el('td', 'cso-edu-mono', s.target_route_pattern),
          el('td', '', s.name_en),
          el('td', '', statusBadge(s.validation_status)),
          el('td', 'cso-edu-row-actions', [
            btn('Edit / Validate', 'cso-edu-btn-sm', () => openSchemaDrawer(s))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openSchemaDrawer(item) {
      const isEdit = Boolean(item);
      const typeSel = selectOf([
        ['EducationalOrganization', 'EducationalOrganization'], ['JobPosting', 'JobPosting'],
        ['GovernmentService', 'GovernmentService'], ['Quiz', 'Quiz'], ['FAQPage', 'FAQPage'],
        ['Article', 'Article'], ['BreadcrumbList', 'BreadcrumbList']
      ], item ? item.schema_type : 'EducationalOrganization');
      const routeIn = textInput('text', item ? item.target_route_pattern : '/', '/');
      const nameIn = textInput('text', item ? item.name_en : '', 'Schema Name (EN)');
      const defJson = JSON.stringify({ '@context': 'https://schema.org', '@type': 'EducationalOrganization', name: 'CS Odisha' }, null, 2);
      const payIn = textareaOf(item ? JSON.stringify(item.schema_payload || {}, null, 2) : defJson, '{"@context":"https://schema.org",...}');
      const valOut = el('pre', 'cso-fin-calc-res', 'Click Validate Schema.org to test.');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit JSON-LD · ${item.schema_code}` : 'JSON-LD Validator & Builder', [
        field('Schema Type', typeSel),
        field('Target Route Pattern', routeIn),
        field('Name (English)', nameIn),
        field('JSON-LD Payload', payIn),
        valOut
      ]);
      if (isEdit) attachRevisions(body, '02', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn('Validate Schema.org', '', async () => {
        try {
          const r = await api(`${API}/schemas/validate`, 'POST', {
            schema_type: typeSel.value,
            schema_payload_json: payIn.value
          });
          valOut.textContent = JSON.stringify(r, null, 2);
        } catch (e) { toast(e.message, 'error'); }
      }));

      foot.appendChild(btn(isEdit ? 'Save Schema' : 'Create Schema', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            schema_type: typeSel.value,
            target_route_pattern: routeIn.value.trim(),
            name_en: nameIn.value.trim(),
            schema_payload_json: payIn.value
          };
          if (isEdit) await api(`${API}/schemas/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/schemas`, 'POST', payload);
          toast('JSON-LD schema saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 03: XML SITEMAP GENERATOR ==================== */
  async function renderSitemaps(root) {
    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-seo-003', 'Multi-index XML sitemaps with Odia (or-IN) & English (en-IN) hreflang annotations.', [
        btn('Regenerate All Sitemaps', 'cso-edu-btn-primary', async () => {
          try {
            await api(`${API}/sitemaps/regenerate`, 'POST', {});
            toast('All sitemaps regenerated', 'success');
            draw();
          } catch (e) { toast(e.message, 'error'); }
        })
      ]));

      const data = await api(`${API}/sitemaps`);
      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Sitemap Key', 'Filename', 'Scope / Freq', 'URL Count', 'Last Generated', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(sm => {
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', sm.sitemap_key),
          el('td', 'cso-edu-mono', sm.filename),
          el('td', '', `${sm.portal_scope} · ${sm.changefreq} (p=${sm.priority_decimal})`),
          el('td', '', String(sm.url_count)),
          el('td', '', sm.last_generated_at),
          el('td', '', statusBadge(sm.status)),
          el('td', 'cso-edu-row-actions', [
            btn('Inspect XML', 'cso-edu-btn-sm', () => inspectXml(sm.sitemap_key))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    async function inspectXml(key) {
      try {
        const res = await fetch(`${API}/sitemaps/${encodeURIComponent(key)}/preview-xml`, { credentials: 'same-origin' });
        const xml = await res.text();
        openDrawer(`XML Preview · ${key}.xml`, [el('pre', 'cso-fin-calc-res', xml)]);
      } catch (e) { toast(e.message, 'error'); }
    }

    await draw();
  }

  /* ==================== MODULE 04: RSS / ATOM / JSON SYNDICATION ==================== */
  async function renderFeeds(root) {
    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-seo-004', 'RSS 2.0, Atom 1.0, and JSON Feed 1.1 syndication channels across Odisha portals.', [
        btn('+ Create Syndication Feed', 'cso-edu-btn-primary', () => openFeedDrawer(null))
      ]));

      const data = await api(`${API}/feeds`);
      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Slug', 'Format', 'Source / Lang', 'Title (EN)', 'Max Items', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(f => {
        tbody.appendChild(el('tr', '', [
          el('td', 'cso-edu-mono', f.feed_slug),
          el('td', '', f.feed_format),
          el('td', '', `${f.portal_source} · ${f.language_mode}`),
          el('td', '', f.title_en),
          el('td', '', String(f.max_items)),
          el('td', '', statusBadge(f.feed_status)),
          el('td', 'cso-edu-row-actions', [
            btn('Edit', 'cso-edu-btn-sm', () => openFeedDrawer(f))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openFeedDrawer(item) {
      const isEdit = Boolean(item);
      const slugIn = textInput('text', item ? item.feed_slug : '', 'odisha-mock-rss');
      if (isEdit) slugIn.disabled = true;
      const fmtSel = selectOf([['rss_2_0', 'RSS 2.0'], ['atom_1_0', 'Atom 1.0'], ['json_feed_1_1', 'JSON Feed 1.1']], item ? item.feed_format : 'rss_2_0');
      const srcSel = selectOf([['all', 'all'], ['jobs-careers', 'jobs-careers'], ['schemes', 'schemes'], ['study-library', 'study-library']], item ? item.portal_source : 'all');
      const langSel = selectOf([['bilingual', 'Bilingual'], ['en-IN', 'en-IN'], ['or-IN', 'or-IN']], item ? item.language_mode : 'bilingual');
      const tEn = textInput('text', item ? item.title_en : '', 'Feed Title (EN)');
      const dEn = textareaOf(item ? item.description_en : '', 'Feed Description (EN)');
      const maxIn = textInput('number', item ? String(item.max_items) : '30', '10..100');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Feed · ${item.feed_slug}` : 'Create Syndication Feed', [
        field('Feed Slug', slugIn),
        field('Format', fmtSel),
        field('Portal Source', srcSel),
        field('Language Mode', langSel),
        field('Title (English)', tEn),
        field('Description (English)', dEn),
        field('Max Items (10-100)', maxIn)
      ]);
      if (isEdit) attachRevisions(body, '04', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Feed' : 'Create Feed', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            feed_slug: slugIn.value.trim(),
            feed_format: fmtSel.value,
            portal_source: srcSel.value,
            language_mode: langSel.value,
            title_en: tEn.value.trim(),
            description_en: dEn.value.trim(),
            max_items: Number(maxIn.value || 30)
          };
          if (isEdit) await api(`${API}/feeds/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/feeds`, 'POST', payload);
          toast('Syndication feed saved', 'success');
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
    if (moduleId === 'module-seo-001') { renderMeta(root); return true; }
    if (moduleId === 'module-seo-002') { renderSchemas(root); return true; }
    if (moduleId === 'module-seo-003') { renderSitemaps(root); return true; }
    if (moduleId === 'module-seo-004') { renderFeeds(root); return true; }
    return false;
  }

  window.CSOSeoBatch1 = { render: renderModule };
})();
