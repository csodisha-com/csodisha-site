/* Analytics, Telemetry & User Feedback Intelligence Batch 2 (05-08) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/analytics';
  const MODULES = {
    'module-ana-005': { num: '05', title: 'District & Regional User Engagement Demographics' },
    'module-ana-006': { num: '06', title: 'Candidate Device Breakdown, Edge Latency & Web Vitals' },
    'module-ana-007': { num: '07', title: 'Citizen Feedback Intake, CSAT & Sentiment Analysis' },
    'module-ana-008': { num: '08', title: 'Broken Link & 404 Sentinel Triage Inbox' }
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

  function ratingPill(st) {
    let cls = 'cso-urc-badge-status';
    if (st === 'good' || st === 'positive' || st === 'acknowledged' || st === 'actioned' || st === 'redirect_mapped' || st === 'fixed_source') cls += ' is-active';
    else if (st === 'needs_improvement' || st === 'neutral' || st === 'new' || st === 'open') cls += ' is-pending';
    else if (st === 'poor' || st === 'negative') cls += ' is-danger';
    return el('span', cls, st);
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

  /* ================= MODULE 05: DISTRICT DEMOGRAPHICS ================= */
  async function renderDemographics(root) {
    const state = { zone: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '05 · Odisha District & RDC Zone Demographics'),
        el('div', 'cso-edu-sub', 'Regional learner engagement across Central, Northern & Southern RDC zones with Odia preference %.')
      );
      head.append(tb, btn('+ Record District Telemetry', 'cso-edu-btn-primary', openIngestDrawer));
      wrap.appendChild(head);

      const tabs = el('div', 'cso-urc-tabs');
      [['', 'All Zones'], ['Central', 'Central RDC'], ['Northern', 'Northern RDC'], ['Southern', 'Southern RDC']].forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.zone === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.zone = val; draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search district name or code...');
      qIn.className = 'cso-edu-input';
      bar.append(qIn, btn('Filter', 'cso-edu-btn-primary', () => { state.q = qIn.value.trim(); draw(); }));
      wrap.appendChild(bar);

      const qs = new URLSearchParams();
      if (state.zone) qs.set('rdc_zone', state.zone);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/demographics?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No district demographics found.'));
        return;
      }

      const maxLearners = Math.max(1, ...items.map(d => Number(d.active_learners_count || 0)));
      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['District (EN/OR)', 'RDC Zone', 'Learner Share', 'Views & Downloads', 'Odia Pref %', 'Growth'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(d => {
        const tr = el('tr');
        const dn = el('td');
        dn.append(el('strong', '', `${d.district_name_en} (${d.district_code})`), el('div', 'cso-edu-sub', d.district_name_or || d.top_portal_section));
        tr.appendChild(dn);
        tr.appendChild(el('td', '', el('span', 'cso-urc-badge-district', d.rdc_zone)));

        const lc = el('td');
        const prog = document.createElement('progress');
        prog.className = 'cso-urc-progress';
        prog.max = maxLearners;
        prog.value = Number(d.active_learners_count || 0);
        lc.append(prog, el('span', 'cso-urc-pct', String(d.active_learners_count)));
        tr.appendChild(lc);

        tr.appendChild(el('td', '', `${d.pageviews_count} views · ${d.downloads_count} DLs`));
        tr.appendChild(el('td', '', `${d.preferred_lang_share_or_pct}% ଓଡ଼ିଆ`));
        tr.appendChild(el('td', '', el('span', 'cso-at-trend-up', `+${d.growth_delta_pct}%`)));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openIngestDrawer() {
      const codeIn = textInput('text', 'OD-KHD', 'e.g. OD-KHD');
      const nameIn = textInput('text', 'Khordha', 'District name');
      const zoneSel = selectOf([['Central', 'Central'], ['Northern', 'Northern'], ['Southern', 'Southern']], 'Central');
      const learnIn = textInput('number', '5', '5');
      const pvIn = textInput('number', '25', '25');

      const { backdrop, foot } = openDrawer('Record District Telemetry', [
        field('District Code', codeIn),
        field('District Name (EN)', nameIn),
        field('RDC Zone', zoneSel),
        field('Active Learners Increment', learnIn),
        field('Pageviews Increment', pvIn)
      ]);
      foot.appendChild(btn('Ingest Telemetry', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/demographics/ingest`, 'POST', {
            district_code: codeIn.value.trim(),
            district_name_en: nameIn.value.trim(),
            rdc_zone: zoneSel.value,
            active_learners_inc: Number(learnIn.value || 1),
            pageviews_inc: Number(pvIn.value || 1)
          });
          toast('District telemetry recorded', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 06: WEB VITALS & EDGE LATENCY ================= */
  async function renderWebVitals(root) {
    const state = { device: '', rating: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '06 · Device Breakdown, Edge Latency & Web Vitals'),
        el('div', 'cso-edu-sub', 'Core Web Vitals (p75 TTFB, LCP, INP, CLS) across Odisha mobile 4G/5G and desktop traffic.')
      );
      head.append(tb, btn('+ Ingest Web Vitals Sample', 'cso-edu-btn-primary', openIngestDrawer));
      wrap.appendChild(head);

      const tabs = el('div', 'cso-urc-tabs');
      [['', 'All Devices'], ['mobile_android', 'Android'], ['mobile_ios', 'iOS'], ['desktop', 'Desktop'], ['tablet', 'Tablet']].forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.device === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.device = val; draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      const qs = new URLSearchParams();
      if (state.device) qs.set('device_class', state.device);
      if (state.rating) qs.set('cwv_rating', state.rating);
      const data = await api(`${API}/web-vitals?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No Web Vitals samples found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Route & Device', 'Network', 'p75 TTFB', 'p75 LCP', 'p75 INP', 'p75 CLS', 'CWV Rating'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(w => {
        const tr = el('tr');
        const rd = el('td');
        rd.append(el('strong', '', w.route_group), el('div', 'cso-edu-sub', `${w.device_class} · ${w.sample_count} samples`));
        tr.appendChild(rd);
        tr.appendChild(el('td', '', w.connection_tier));
        tr.appendChild(el('td', '', `${w.p75_ttfb_ms} ms`));
        tr.appendChild(el('td', '', `${w.p75_lcp_ms} ms`));
        tr.appendChild(el('td', '', `${w.p75_inp_ms} ms`));
        tr.appendChild(el('td', '', (Number(w.p75_cls_milli || 0) / 1000).toFixed(3)));
        tr.appendChild(el('td', '', ratingPill(w.cwv_rating)));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openIngestDrawer() {
      const routeSel = selectOf([['study-library', 'study-library'], ['jobs-careers', 'jobs-careers'], ['schemes', 'schemes'], ['home', 'home'], ['community', 'community']], 'study-library');
      const devSel = selectOf([['mobile_android', 'mobile_android'], ['mobile_ios', 'mobile_ios'], ['desktop', 'desktop'], ['tablet', 'tablet']], 'mobile_android');
      const connSel = selectOf([['4g_5g', '4g_5g'], ['broadband_wifi', 'broadband_wifi'], ['slow_3g_2g', 'slow_3g_2g']], '4g_5g');
      const lcpIn = textInput('number', '1650', 'p75 LCP (ms)');
      const inpIn = textInput('number', '95', 'p75 INP (ms)');
      const clsIn = textInput('number', '30', 'p75 CLS * 1000 (e.g. 30 = 0.030)');

      const { backdrop, foot } = openDrawer('Ingest Web Vitals Sample', [
        field('Route Group', routeSel),
        field('Device Class', devSel),
        field('Connection Tier', connSel),
        field('p75 LCP (ms)', lcpIn),
        field('p75 INP (ms)', inpIn),
        field('p75 CLS (milli)', clsIn)
      ]);
      foot.appendChild(btn('Record Sample', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/web-vitals/ingest`, 'POST', {
            route_group: routeSel.value,
            device_class: devSel.value,
            connection_tier: connSel.value,
            p75_lcp_ms: Number(lcpIn.value || 1500),
            p75_inp_ms: Number(inpIn.value || 90),
            p75_cls_milli: Number(clsIn.value || 30)
          });
          toast('Web Vitals sample recorded', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 07: CITIZEN FEEDBACK & CSAT ================= */
  async function renderFeedback(root) {
    const state = { sentiment: '', status: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '07 · Citizen Feedback, CSAT & Sentiment'),
        el('div', 'cso-edu-sub', 'Cookieless 1-5 star CSAT intake with deterministic sentiment classification and triage.')
      );
      head.append(tb);
      wrap.appendChild(head);

      const tabs = el('div', 'cso-urc-tabs');
      [['', 'All'], ['positive', 'Positive'], ['neutral', 'Neutral'], ['negative', 'Negative']].forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.sentiment === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.sentiment = val; draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search feedback code or comment...');
      qIn.className = 'cso-edu-input';
      bar.append(qIn, btn('Filter', 'cso-edu-btn-primary', () => { state.q = qIn.value.trim(); draw(); }));
      wrap.appendChild(bar);

      const qs = new URLSearchParams();
      if (state.sentiment) qs.set('sentiment_label', state.sentiment);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/feedback?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No citizen feedback found.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Code & CSAT', 'Comment & Page', 'Sentiment', 'Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(f => {
        const tr = el('tr');
        const cc = el('td');
        cc.append(el('strong', '', f.feedback_code), el('div', 'cso-edu-sub', `${f.csat_score}/5 ★ · ${f.district_odisha}`));
        tr.appendChild(cc);

        const cm = el('td');
        cm.append(el('div', '', f.comment_text || '—'), el('div', 'cso-edu-sub', `${f.portal_section} · ${f.topic_tag}`));
        tr.appendChild(cm);

        tr.appendChild(el('td', '', ratingPill(f.sentiment_label)));
        tr.appendChild(el('td', '', ratingPill(f.triage_status)));
        tr.appendChild(el('td', 'cso-edu-actions', btn('Acknowledge & Respond', 'cso-edu-btn-sm cso-edu-btn-primary', () => openTriageDrawer(f))));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openTriageDrawer(f) {
      const stSel = selectOf([
        ['acknowledged', 'Acknowledged'],
        ['actioned', 'Actioned'],
        ['archived', 'Archived'],
        ['new', 'New']
      ], f.triage_status === 'new' ? 'acknowledged' : f.triage_status);
      const noteIn = textareaOf(f.admin_response_note || '', 'Admin response note...');

      const { backdrop, body, foot } = openDrawer(`Triage · ${f.feedback_code}`, [
        field('Citizen Comment', el('div', 'cso-edu-sub', f.comment_text || '—')),
        field('Triage Status', stSel),
        field('Admin Response Note', noteIn)
      ]);
      attachRevisions(body, '07', f.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn('Save Triage', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/feedback/${encodeURIComponent(f.id)}`, 'PATCH', {
            triage_status: stSel.value,
            admin_response_note: noteIn.value.trim()
          });
          toast('Feedback triaged', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 08: 404 SENTINEL TRIAGE INBOX ================= */
  async function renderSentinel404(root) {
    const state = { status: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '08 · Broken Link & 404 Sentinel Triage Inbox'),
        el('div', 'cso-edu-sub', 'Track edge 404 hits and map broken URLs to canonical destinations.')
      );
      head.append(tb);
      wrap.appendChild(head);

      const tabs = el('div', 'cso-urc-tabs');
      [['', 'All'], ['open', 'Open'], ['redirect_mapped', 'Redirect Mapped'], ['fixed_source', 'Fixed Source'], ['ignored_bot', 'Ignored Bot']].forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.status === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.status = val; draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      const bar = el('div', 'cso-edu-toolbar');
      const qIn = textInput('search', state.q, 'Search missing path or code...');
      qIn.className = 'cso-edu-input';
      bar.append(qIn, btn('Filter', 'cso-edu-btn-primary', () => { state.q = qIn.value.trim(); draw(); }));
      wrap.appendChild(bar);

      const qs = new URLSearchParams();
      if (state.status) qs.set('triage_status', state.status);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/sentinel-404?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No 404 incidents in this view.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Incident', 'Missing Path & Referrer', 'Hits', 'Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(s => {
        const tr = el('tr');
        tr.appendChild(el('td', '', s.incident_code));
        const mp = el('td');
        mp.append(
          el('strong', '', s.missing_path),
          el('div', 'cso-edu-sub', `${s.source_kind}${s.suggested_redirect_to ? ' → ' + s.suggested_redirect_to : ''}`)
        );
        tr.appendChild(mp);
        tr.appendChild(el('td', '', String(s.hit_count)));
        tr.appendChild(el('td', '', ratingPill(s.triage_status)));
        tr.appendChild(el('td', 'cso-edu-actions', btn('Map Redirect / Resolve', 'cso-edu-btn-sm cso-edu-btn-primary', () => openResolveDrawer(s))));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openResolveDrawer(s) {
      const redirIn = textInput('text', s.suggested_redirect_to || '/study-library/', '/study-library/...');
      const stSel = selectOf([
        ['redirect_mapped', 'Redirect Mapped'],
        ['fixed_source', 'Fixed Source'],
        ['ignored_bot', 'Ignored Bot'],
        ['open', 'Open']
      ], s.triage_status === 'open' ? 'redirect_mapped' : s.triage_status);
      const noteIn = textareaOf(s.resolution_note || '', 'Resolution note...');

      const { backdrop, body, foot } = openDrawer(`Resolve 404 · ${s.incident_code}`, [
        field('Missing Path', el('div', 'cso-edu-sub', s.missing_path)),
        field('Suggested Redirect Target', redirIn),
        field('Triage Status', stSel),
        field('Resolution Note', noteIn)
      ]);
      attachRevisions(body, '08', s.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn('Save Resolution', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/sentinel-404/${encodeURIComponent(s.id)}`, 'PATCH', {
            suggested_redirect_to: redirIn.value.trim(),
            triage_status: stSel.value,
            resolution_note: noteIn.value.trim()
          });
          toast(`404 incident ${s.incident_code} updated`, 'success');
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
    if (moduleId === 'module-ana-005') { renderDemographics(root); return true; }
    if (moduleId === 'module-ana-006') { renderWebVitals(root); return true; }
    if (moduleId === 'module-ana-007') { renderFeedback(root); return true; }
    if (moduleId === 'module-ana-008') { renderSentinel404(root); return true; }
    return false;
  }

  window.CSOAnalyticsTelemetryBatch2 = { render: renderModule };
})();
