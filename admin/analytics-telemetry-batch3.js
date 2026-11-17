/* Analytics, Telemetry & User Feedback Intelligence Batch 3 (09-12) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/analytics';
  const MODULES = {
    'module-ana-009': { num: '09', title: 'Portal Outbound Referral & Official Commission Click Tracker' },
    'module-ana-010': { num: '10', title: 'Recruitment Funnel & Examination Milestone Drop-Offs' },
    'module-ana-011': { num: '11', title: 'Bilingual Content Usage (Odia vs English Preference)' },
    'module-ana-012': { num: '12', title: 'Student Community Engagement & Forum Activity Index' }
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

  /* ================= MODULE 09: OUTBOUND REFERRALS ================= */
  async function renderOutbound(root) {
    const state = { auth: '', q: '' };
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '09 · Official Commission Outbound Referral Tracker'),
        el('div', 'cso-edu-sub', 'Track outbound clicks to OPSC, OSSC, OSSSC, NTA UGC NET, and SAMS Odisha official portals.')
      );
      head.append(tb, btn('+ Record Outbound Click', 'cso-edu-btn-primary', openRecordDrawer));
      wrap.appendChild(head);

      const tabs = el('div', 'cso-urc-tabs');
      [
        ['', 'All Authorities'],
        ['opsc', 'OPSC'],
        ['ossc', 'OSSC'],
        ['osssc', 'OSSSC'],
        ['nta_ugc_net', 'NTA UGC NET'],
        ['sams_odisha', 'SAMS Odisha']
      ].forEach(([val, lbl]) => {
        const t = el('button', `cso-urc-tab ${state.auth === val ? 'is-active' : ''}`.trim(), lbl);
        t.type = 'button';
        t.addEventListener('click', () => { state.auth = val; draw(); });
        tabs.appendChild(t);
      });
      wrap.appendChild(tabs);

      const qs = new URLSearchParams();
      if (state.auth) qs.set('authority_key', state.auth);
      if (state.q) qs.set('q', state.q);
      const data = await api(`${API}/outbound?${qs.toString()}`);
      const items = data.items || [];

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No outbound referrals found.'));
        return;
      }

      const maxClicks = Math.max(1, ...items.map(i => Number(i.clicks_30d || 0)));
      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Commission / Domain', 'Category', 'Click Share (30d)', '7d / 30d', 'SSL Verified'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(o => {
        const tr = el('tr');
        const auth = el('td');
        auth.append(el('strong', '', o.authority_name_en), el('div', 'cso-edu-sub', `${o.official_domain} · ${o.source_portal_section}`));
        tr.appendChild(auth);
        tr.appendChild(el('td', '', o.link_category));

        const pc = el('td');
        const prog = document.createElement('progress');
        prog.className = 'cso-urc-progress';
        prog.max = maxClicks;
        prog.value = Number(o.clicks_30d || 0);
        pc.appendChild(prog);
        tr.appendChild(pc);

        tr.appendChild(el('td', '', `${o.clicks_7d} / ${o.clicks_30d}`));
        tr.appendChild(el('td', '', btn(
          o.verified_official_ssl ? 'Verified SSL ✓' : 'Unverified',
          `cso-edu-btn-sm ${o.verified_official_ssl ? 'cso-edu-btn-primary' : ''}`.trim(),
          async () => {
            try {
              await api(`${API}/outbound/${encodeURIComponent(o.id)}`, 'PATCH', { verified_official_ssl: !o.verified_official_ssl });
              toast('SSL verification status updated', 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }
        )));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openRecordDrawer() {
      const authSel = selectOf([
        ['opsc', 'OPSC (opsc.gov.in)'],
        ['ossc', 'OSSC (ossc.gov.in)'],
        ['osssc', 'OSSSC (osssc.gov.in)'],
        ['nta_ugc_net', 'NTA UGC NET'],
        ['sams_odisha', 'SAMS Odisha']
      ], 'opsc');
      const catSel = selectOf([
        ['apply_online', 'Apply Online'],
        ['official_notification_pdf', 'Official Notification PDF'],
        ['admit_card', 'Admit Card'],
        ['result_merit_list', 'Result / Merit List'],
        ['scheme_portal', 'Scheme Portal']
      ], 'apply_online');

      const { backdrop, foot } = openDrawer('Record Official Outbound Click', [
        field('Commission / Authority', authSel),
        field('Link Category', catSel)
      ]);
      foot.appendChild(btn('Record Click', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/outbound/record`, 'POST', {
            authority_key: authSel.value,
            link_category: catSel.value
          });
          toast('Outbound referral click recorded', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 10: EXAM FUNNELS ================= */
  async function renderFunnels(root) {
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '10 · Recruitment Funnel & Milestone Drop-Offs'),
        el('div', 'cso-edu-sub', '5-stage candidate journey: Discovery → Syllabus → PYQ → Mock → Official Apply.')
      );
      head.appendChild(tb);
      wrap.appendChild(head);

      const data = await api(`${API}/funnels`);
      const items = data.items || [];
      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No exam funnels found.'));
        return;
      }

      items.forEach(f => {
        const card = el('div', 'cso-urc-role-card');
        const ch = el('div', 'cso-urc-role-head');
        const info = el('div', '');
        info.append(
          el('strong', '', `${f.exam_title_en} (${f.funnel_key})`),
          el('div', 'cso-edu-sub', `${f.exam_title_or || ''} · Steepest Drop-off: ${f.biggest_dropoff_stage}`)
        );
        const acts = el('div', 'cso-edu-actions');
        acts.appendChild(btn('Edit Funnel & Revisions', 'cso-edu-btn-sm cso-edu-btn-primary', () => openFunnelDrawer(f)));
        ch.append(info, acts);
        card.appendChild(ch);

        const maxV = Math.max(1, Number(f.stage_1_discovery_views || 1));
        const bars = el('div', 'cso-at-bar-list');
        [
          ['1. Discovery Views', f.stage_1_discovery_views],
          ['2. Syllabus Reads', f.stage_2_syllabus_reads],
          ['3. PYQ Downloads', f.stage_3_pyq_downloads],
          ['4. Mock Attempts', f.stage_4_mock_attempts],
          ['5. Official Apply', f.stage_5_official_apply_clicks]
        ].forEach(([lbl, val]) => {
          const row = el('div', 'cso-at-bar-row');
          const prog = document.createElement('progress');
          prog.max = maxV;
          prog.value = Number(val || 0);
          const pct = Math.round((Number(val || 0) / maxV) * 100);
          row.append(el('span', '', lbl), prog, el('span', '', `${val} (${pct}%)`));
          bars.appendChild(row);
        });
        card.appendChild(bars);
        if (f.optimization_note_en) card.appendChild(el('div', 'cso-edu-sub', `Note: ${f.optimization_note_en}`));
        wrap.appendChild(card);
      });
    }

    function openFunnelDrawer(f) {
      const s1 = textInput('number', String(f.stage_1_discovery_views), '');
      const s2 = textInput('number', String(f.stage_2_syllabus_reads), '');
      const s3 = textInput('number', String(f.stage_3_pyq_downloads), '');
      const s4 = textInput('number', String(f.stage_4_mock_attempts), '');
      const s5 = textInput('number', String(f.stage_5_official_apply_clicks), '');
      const noteIn = textareaOf(f.optimization_note_en || '', 'Optimization note...');

      const { backdrop, body, foot } = openDrawer(`Edit Funnel · ${f.exam_title_en}`, [
        field('Stage 1: Discovery Views', s1),
        field('Stage 2: Syllabus Reads', s2),
        field('Stage 3: PYQ Downloads', s3),
        field('Stage 4: Mock Attempts', s4),
        field('Stage 5: Official Apply Clicks', s5),
        field('Optimization Note (EN)', noteIn)
      ]);
      attachRevisions(body, '10', f.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn('Save & Recalculate Drop-Off', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/funnels/${encodeURIComponent(f.id)}`, 'PATCH', {
            stage_1_discovery_views: Number(s1.value || 0),
            stage_2_syllabus_reads: Number(s2.value || 0),
            stage_3_pyq_downloads: Number(s3.value || 0),
            stage_4_mock_attempts: Number(s4.value || 0),
            stage_5_official_apply_clicks: Number(s5.value || 0),
            optimization_note_en: noteIn.value.trim()
          });
          toast('Funnel updated & drop-off recalculated', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 11: BILINGUAL USAGE ================= */
  async function renderBilingual(root) {
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const data = await api(`${API}/bilingual`);
      const totals = data.totals || {};
      const items = data.items || [];

      const kpis = el('div', 'cso-edu-kpis');
      [
        ['English Views', totals.english_views || 0],
        ['ଓଡ଼ିଆ (Odia) Views', totals.odia_views || 0],
        ['Overall Odia Share', `${totals.odia_share_pct || 0}%`]
      ].forEach(([lbl, val]) => {
        const c = el('div', 'cso-edu-kpi');
        c.append(el('div', 'cso-edu-kpi-lbl', lbl), el('div', 'cso-edu-kpi-val', String(val)));
        kpis.appendChild(c);
      });
      wrap.appendChild(kpis);

      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '11 · Bilingual Content Usage (Odia vs English)'),
        el('div', 'cso-edu-sub', 'Portal-by-portal English vs. ଓଡ଼ିଆ readership and language toggle switches.')
      );
      head.append(tb, btn('+ Record Language Telemetry', 'cso-edu-btn-primary', openRecordDrawer));
      wrap.appendChild(head);

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Portal Section', 'English Views', 'Odia Views', 'Odia Share %', 'Toggle Switches', 'Top Odia Topic'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(b => {
        const tr = el('tr');
        const sc = el('td');
        sc.append(el('strong', '', b.section_label_en), el('div', 'cso-edu-sub', b.section_label_or));
        tr.appendChild(sc);
        tr.appendChild(el('td', '', String(b.english_views)));
        tr.appendChild(el('td', '', String(b.odia_views)));

        const pc = el('td');
        const prog = document.createElement('progress');
        prog.className = 'cso-urc-progress';
        prog.max = 100;
        prog.value = Number(b.odia_share_pct || 0);
        pc.append(prog, el('span', 'cso-urc-pct', `${b.odia_share_pct}%`));
        tr.appendChild(pc);

        tr.appendChild(el('td', '', String(b.bilingual_toggle_switches)));
        tr.appendChild(el('td', '', b.top_odia_topic || '—'));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openRecordDrawer() {
      const secSel = selectOf([
        ['study-library', 'Study Library'],
        ['jobs-careers', 'Jobs & Careers'],
        ['schemes', 'Odisha Govt Schemes'],
        ['educational-tools', 'Educational Tools'],
        ['community', 'Community'],
        ['home', 'Home']
      ], 'schemes');
      const langSel = selectOf([['or', 'Odia (ଓଡ଼ିଆ)'], ['en', 'English']], 'or');
      const togCb = document.createElement('input');
      togCb.type = 'checkbox';
      togCb.checked = true;

      const { backdrop, foot } = openDrawer('Record Language Telemetry', [
        field('Portal Section', secSel),
        field('Language Viewed', langSel),
        field('Count as Bilingual Toggle Switch', togCb)
      ]);
      foot.appendChild(btn('Record Hit', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/bilingual/record`, 'POST', {
            portal_section: secSel.value,
            lang_mode: langSel.value,
            is_toggle_switch: togCb.checked
          });
          toast('Language telemetry recorded', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 12: COMMUNITY ENGAGEMENT INDEX ================= */
  async function renderCommunityIndex(root) {
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const data = await api(`${API}/community-index`);
      const live = data.live_snapshot || {};
      const items = data.items || [];
      const latest = items[0] || {};

      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '12 · Student Community Engagement & Forum Index'),
        el('div', 'cso-edu-sub', 'Live D1 bridge across Community Posts, Forum Threads, Verified Q&A, and Shared Knowledge.')
      );
      head.append(tb, btn('Recompute Weekly Index', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/community-index/recompute`, 'POST', { bucket_week: '2026-W47' });
          toast('Weekly engagement index recomputed', 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
      wrap.appendChild(head);

      const kpis = el('div', 'cso-edu-kpis');
      [
        ['Latest Index Score', `${latest.engagement_index_score || 0} / 100`],
        ['Live Posts (D1)', live.posts_created || 0],
        ['Live Forum Threads (D1)', live.forum_threads_created || 0],
        ['Verified Mentor Q&As (D1)', live.verified_mentor_answers || 0],
        ['Shared Notes (D1)', live.knowledge_notes_shared || 0]
      ].forEach(([lbl, val]) => {
        const c = el('div', 'cso-edu-kpi');
        c.append(el('div', 'cso-edu-kpi-lbl', lbl), el('div', 'cso-edu-kpi-val', String(val)));
        kpis.appendChild(c);
      });
      wrap.appendChild(kpis);

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Week', 'Posts / Threads', 'Questions / Verified', 'Shared Notes', 'Index Gauge (/100)', 'Top District'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(ci => {
        const tr = el('tr');
        tr.appendChild(el('td', '', ci.bucket_week));
        tr.appendChild(el('td', '', `${ci.posts_created} posts · ${ci.forum_threads_created} threads`));
        tr.appendChild(el('td', '', `${ci.questions_asked} asked · ${ci.verified_mentor_answers} verified`));
        tr.appendChild(el('td', '', String(ci.knowledge_notes_shared)));

        const gc = el('td');
        const prog = document.createElement('progress');
        prog.className = 'cso-urc-progress';
        prog.max = 100;
        prog.value = Number(ci.engagement_index_score || 0);
        gc.append(prog, el('span', 'cso-urc-pct', `${ci.engagement_index_score}/100`));
        tr.appendChild(gc);

        tr.appendChild(el('td', '', el('span', 'cso-urc-badge-district', ci.top_active_district || 'Khordha')));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    await draw();
  }

  function renderModule(moduleId, root) {
    if (!MODULES[moduleId]) return false;
    root.textContent = '';
    if (moduleId === 'module-ana-009') { renderOutbound(root); return true; }
    if (moduleId === 'module-ana-010') { renderFunnels(root); return true; }
    if (moduleId === 'module-ana-011') { renderBilingual(root); return true; }
    if (moduleId === 'module-ana-012') { renderCommunityIndex(root); return true; }
    return false;
  }

  window.CSOAnalyticsTelemetryBatch3 = { render: renderModule };
})();
