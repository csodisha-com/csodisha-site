/* Analytics, Telemetry & User Feedback Intelligence Batch 4 (13-14) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/analytics';
  const MODULES = {
    'module-ana-013': { num: '13', title: 'DPDP Act Audit Telemetry & Privacy Verification Logs' },
    'module-ana-014': { num: '14', title: 'Executive Analytics Digest & Weekly Automated Briefings' }
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
    if (st === 'verified_compliant' || st === 'published_briefing') cls += ' is-active';
    else if (st === 'draft' || st === 'warning_review') cls += ' is-pending';
    else if (st === 'archived') cls += ' is-danger';
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

  /* ================= MODULE 13: DPDP PRIVACY AUDITS ================= */
  async function renderDpdpAudits(root) {
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const data = await api(`${API}/dpdp-audits`);
      const posture = data.privacy_posture || {};
      const items = data.items || [];

      const kpis = el('div', 'cso-edu-kpis');
      [
        ['DPDP Compliance Posture', posture.status_label || '100% Compliant'],
        ['Verification Audits Run', posture.total_audits || 0],
        ['PII / Raw IP Leaks Detected', posture.total_leaks_detected || 0]
      ].forEach(([lbl, val]) => {
        const c = el('div', 'cso-edu-kpi');
        c.append(el('div', 'cso-edu-kpi-lbl', lbl), el('div', 'cso-edu-kpi-val', String(val)));
        kpis.appendChild(c);
      });
      wrap.appendChild(kpis);

      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '13 · DPDP Act Audit Telemetry & Privacy Verification'),
        el('div', 'cso-edu-sub', el('span', 'cso-at-privacy-badge', '100% Zero-Cookie & Zero-PII Compliant'))
      );
      const acts = el('div', 'cso-edu-actions');
      acts.append(
        btn('Run Live Privacy & PII Verification Scan', 'cso-edu-btn-primary', async () => {
          try {
            const res = await api(`${API}/dpdp-audits/run-verification`, 'POST', {});
            toast(`Scanned ${res.item.records_scanned} rows · ${res.item.pii_leaks_detected} leaks`, 'success');
            draw();
          } catch (e) { toast(e.message, 'error'); }
        }),
        btn('+ Log Manual Audit Note', '', openManualAuditDrawer)
      );
      head.append(tb, acts);
      wrap.appendChild(head);

      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No privacy verification audits logged yet.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Audit Code', 'Check Category & Scope', 'Scanned / Leaks', 'Status', 'Summary'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(a => {
        const tr = el('tr');
        tr.appendChild(el('td', '', a.audit_code));
        const cs = el('td');
        cs.append(el('strong', '', a.check_category), el('div', 'cso-edu-sub', a.scope_target));
        tr.appendChild(cs);
        tr.appendChild(el('td', '', `${a.records_scanned} rows · ${a.pii_leaks_detected} leaks`));
        tr.appendChild(el('td', '', statusBadge(a.compliance_status)));
        const sm = el('td');
        sm.append(el('div', '', a.verification_summary_en), el('div', 'cso-edu-sub', `${a.executed_by} · ${a.created_at}`));
        tr.appendChild(sm);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openManualAuditDrawer() {
      const catSel = selectOf([
        ['zero_cookie_verification', 'Zero-Cookie Verification'],
        ['raw_ip_redaction_scan', 'Raw IP Redaction Scan'],
        ['salt_rotation_check', 'Salt Rotation Check'],
        ['retention_purge_30d', '30-Day Retention Purge'],
        ['dpdp_request_sla_audit', 'DPDP Request SLA Audit']
      ], 'salt_rotation_check');
      const scopeIn = textInput('text', 'all_telemetry', 'Scope target');
      const sumEnIn = textareaOf('', 'Verification summary (EN)...');
      const sumOrIn = textareaOf('', 'ଓଡ଼ିଆ ସାରାଂଶ...');

      const { backdrop, foot } = openDrawer('Log Manual Privacy Audit Note', [
        field('Check Category', catSel),
        field('Scope Target', scopeIn),
        field('Verification Summary (EN)', sumEnIn),
        field('Verification Summary (OR)', sumOrIn)
      ]);
      foot.appendChild(btn('Save Audit Note', 'cso-edu-btn-primary', async () => {
        try {
          await api(`${API}/dpdp-audits`, 'POST', {
            check_category: catSel.value,
            scope_target: scopeIn.value.trim(),
            verification_summary_en: sumEnIn.value.trim(),
            verification_summary_or: sumOrIn.value.trim()
          });
          toast('Manual privacy audit logged', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ================= MODULE 14: EXECUTIVE DIGESTS ================= */
  async function renderExecutiveDigests(root) {
    const wrap = el('div', 'cso-edu-wrap');
    root.appendChild(wrap);

    async function draw() {
      wrap.textContent = '';
      const head = el('div', 'cso-edu-head');
      const tb = el('div', '');
      tb.append(
        el('h2', 'cso-edu-title', '14 · Executive Analytics Digest & Briefings'),
        el('div', 'cso-edu-sub', 'Auto-generated bilingual EN/OR executive briefings aggregating Modules 01-13 with JSON & Markdown export.')
      );
      head.append(tb, btn('Generate Live Weekly Briefing', 'cso-edu-btn-primary', async () => {
        try {
          const res = await api(`${API}/executive-digests/generate`, 'POST', { digest_frequency: 'weekly' });
          toast(`Generated ${res.item.digest_code}`, 'success');
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
      wrap.appendChild(head);

      const data = await api(`${API}/executive-digests`);
      const items = data.items || [];
      if (!items.length) {
        wrap.appendChild(el('div', 'cso-edu-empty', 'No executive briefings generated yet.'));
        return;
      }

      const tbl = el('table', 'cso-edu-table');
      const thead = el('thead');
      const hr = el('tr');
      ['Digest Code', 'Headline & Period', 'Status', 'Actions'].forEach(h => hr.appendChild(el('th', '', h)));
      thead.appendChild(hr);
      tbl.appendChild(thead);

      const tbody = el('tbody');
      items.forEach(d => {
        const tr = el('tr');
        tr.appendChild(el('td', '', `${d.digest_code} (${d.digest_frequency})`));
        const hc = el('td');
        hc.append(el('strong', '', d.headline_en), el('div', 'cso-edu-sub', `${d.period_label} · ${d.headline_or || ''}`));
        tr.appendChild(hc);
        tr.appendChild(el('td', '', statusBadge(d.delivery_status)));

        const act = el('td', 'cso-edu-actions');
        act.append(
          btn('Read Briefing', 'cso-edu-btn-sm cso-edu-btn-primary', () => openBriefingModal(d)),
          btn(d.delivery_status === 'published_briefing' ? 'Archive' : 'Publish', 'cso-edu-btn-sm', async () => {
            try {
              const next = d.delivery_status === 'published_briefing' ? 'archived' : 'published_briefing';
              await api(`${API}/executive-digests/${encodeURIComponent(d.id)}`, 'PATCH', { delivery_status: next });
              toast(`Digest ${d.digest_code} → ${next}`, 'success');
              draw();
            } catch (e) { toast(e.message, 'error'); }
          }),
          btn('Revisions', 'cso-edu-btn-sm', () => {
            const { backdrop, body } = openDrawer(`Revisions · ${d.digest_code}`, []);
            attachRevisions(body, '14', d.id, () => { backdrop.remove(); draw(); });
          })
        );
        tr.appendChild(act);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }

    function openBriefingModal(d) {
      const card = el('div', 'cso-urc-pubcard');
      card.append(
        el('h3', '', d.headline_en),
        el('div', 'cso-urc-pubcard-meta', `${d.digest_code} · ${d.period_label} · ${d.headline_or || ''}`)
      );
      const ul = el('ul', '');
      (d.highlights || []).forEach(h => {
        ul.appendChild(el('li', '', `[${h.metric_badge || 'KPI'}] ${h.title_en}${h.title_or ? ' — ' + h.title_or : ''}`));
      });
      card.appendChild(ul);
      const snapPre = el('pre', 'cso-fin-calc-res', JSON.stringify(d.metrics_snapshot || {}, null, 2));

      const { foot } = openDrawer(`Executive Briefing · ${d.digest_code}`, [card, snapPre]);
      const expJson = el('a', 'cso-edu-btn cso-edu-btn-sm', 'Export JSON');
      expJson.href = `${API}/executive-digests/${encodeURIComponent(d.id)}/export?format=json`;
      const expMd = el('a', 'cso-edu-btn cso-edu-btn-sm', 'Export Markdown');
      expMd.href = `${API}/executive-digests/${encodeURIComponent(d.id)}/export?format=md`;
      foot.append(expJson, expMd, btn('Print Briefing', 'cso-edu-btn-primary cso-edu-btn-sm', () => window.print()));
    }

    await draw();
  }

  function renderModule(moduleId, root) {
    if (!MODULES[moduleId]) return false;
    root.textContent = '';
    if (moduleId === 'module-ana-013') { renderDpdpAudits(root); return true; }
    if (moduleId === 'module-ana-014') { renderExecutiveDigests(root); return true; }
    return false;
  }

  window.CSOAnalyticsTelemetryBatch4 = { render: renderModule };
})();
