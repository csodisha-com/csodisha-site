/**
 * CS Odisha Admin Studio — Publish Velocity Tools (v311)
 * Provides:
 *   1. Pre-Publish Sanity Check Modal (POST /api/admin/sanity-check)
 *   2. Single-Click Publish Chain + WhatsApp/Telegram Announcement Card Modal (POST /api/admin/publish-chain)
 *   3. Bulk CSV / JSON Importer Modal with Dry-Run Validation Preview (POST /api/admin/bulk-import)
 *   4. One-Click Duplicate as Template helper (POST /api/admin/duplicate-item)
 * Strict CSP: pure DOM APIs only; no raw HTML injection or inline CSS property mutations.
 */
(function (window, document) {
  'use strict';

  var M = {
    backdrop: null,
    title: null,
    body: null,
    foot: null,
    lastFocus: null
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function clear(n) {
    while (n && n.firstChild) n.removeChild(n.firstChild);
    return n;
  }

  function toast(msg, kind) {
    if (typeof window.showToast === 'function') window.showToast(msg, kind || 'info');
  }

  function api(path, body) {
    return fetch('/api/admin/' + path, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-CSO-CSRF': '1' },
      body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error((d && d.error) || ('HTTP ' + r.status));
        return d;
      });
    });
  }

  function closeModal() {
    if (M.backdrop) M.backdrop.hidden = true;
    document.body.classList.remove('cso-modal-open');
    if (M.lastFocus && typeof M.lastFocus.focus === 'function') {
      try { M.lastFocus.focus(); } catch (_) {}
    }
  }

  function openModal(titleText) {
    if (!M.backdrop) {
      var bd = el('div', 'pt-backdrop');
      bd.id = 'csoPublishToolsModal';
      bd.hidden = true;
      bd.addEventListener('click', function (ev) { if (ev.target === bd) closeModal(); });

      var dlg = el('div', 'pt-dialog');
      dlg.setAttribute('role', 'dialog');
      dlg.setAttribute('aria-modal', 'true');
      dlg.setAttribute('aria-labelledby', 'csoPtTitle');

      var head = el('div', 'pt-head');
      M.title = el('h3', 'pt-title', '');
      M.title.id = 'csoPtTitle';
      var x = el('button', 'pt-btn', '× Close');
      x.type = 'button';
      x.addEventListener('click', closeModal);
      head.appendChild(M.title);
      head.appendChild(x);

      M.body = el('div', 'pt-body');
      M.foot = el('div', 'pt-foot');
      dlg.appendChild(head);
      dlg.appendChild(M.body);
      dlg.appendChild(M.foot);
      bd.appendChild(dlg);
      document.body.appendChild(bd);
      M.backdrop = bd;

      document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape' && M.backdrop && !M.backdrop.hidden) closeModal();
      });
    }
    M.lastFocus = document.activeElement;
    M.title.textContent = titleText;
    clear(M.body);
    clear(M.foot);
    M.backdrop.hidden = false;
    document.body.classList.add('cso-modal-open');
  }

  // 1. Pre-Publish Sanity Check Modal
  function runSanityCheck(pillar, item, onProceedPublish) {
    openModal('✅ Pre-Publish Sanity Check (' + pillar.toUpperCase() + ')');
    M.body.appendChild(el('p', 'pt-muted', 'Checking required fields, D1 slug uniqueness, closing dates, R2 /files/* attachments, and live official .gov.in URLs…'));

    api('sanity-check', { pillar: pillar, item: item })
      .then(function (d) {
        clear(M.body);
        clear(M.foot);

        var summary = d.passed
          ? 'All blocking checks passed (' + (d.warning_count || 0) + ' warning(s)). Ready to publish live!'
          : d.blocking_count + ' blocking issue(s) detected. Review before publishing.';
        M.body.appendChild(el('strong', '', summary));

        (d.checks || []).forEach(function (chk) {
          var row = el('div', 'pt-check-row');
          var left = el('div');
          left.appendChild(el('strong', '', chk.label));
          left.appendChild(el('div', 'pt-muted', chk.detail));
          row.appendChild(left);
          row.appendChild(el('span', 'pt-badge pt-badge--' + chk.status, chk.status.toUpperCase()));
          M.body.appendChild(row);
        });

        var closeBtn = el('button', 'pt-btn', 'Back to Editor');
        closeBtn.type = 'button';
        closeBtn.addEventListener('click', closeModal);
        M.foot.appendChild(closeBtn);

        if (typeof onProceedPublish === 'function') {
          var pubBtn = el('button', 'pt-btn pt-btn--primary', d.passed ? 'Publish Live + Run Chain →' : 'Publish Anyway →');
          pubBtn.type = 'button';
          pubBtn.addEventListener('click', function () {
            closeModal();
            onProceedPublish();
          });
          M.foot.appendChild(pubBtn);
        }
      })
      .catch(function (err) {
        clear(M.body);
        M.body.appendChild(el('p', 'pt-muted', 'Sanity check error: ' + err.message));
      });
  }

  // 2. Single-Click Publish Chain + WhatsApp/Telegram Card Modal
  function runPublishChain(pillar, item) {
    return api('publish-chain', {
      pillar: pillar,
      id: item.id || '',
      slug: item.slug || '',
      title_en: item.title_en || item.title || '',
      title_or: item.title_or || '',
      summary_en: item.summary_en || '',
      expires_at: item.expires_at || item.last_date || '',
      official_url: item.apply_url || item.official_apply_url || item.official_portal_url || '',
      required_docs: item.required_docs || item.required_documents || []
    }).then(function (d) {
      openModal('🚀 Published Live — Publish Chain & Announcement Card');
      var list = [
        ['Homepage Latest Updates (All)', d.homepage_synced ? 'Synced live to D1 homepage_blocks' : 'Skipped', d.homepage_synced ? 'pass' : 'warn'],
        ['Candidate Document Vault', (d.vault_docs_synced && d.vault_docs_synced.length) ? d.vault_docs_synced.length + ' required doc(s) linked' : 'No required docs selected', 'pass'],
        ['Sitemap & Public Edge Cache', 'Purged (X-CSO-Cache-Purged: 1) · ' + (d.sitemap_urls || 0) + ' URLs in /sitemap.xml', 'pass']
      ];
      list.forEach(function (r) {
        var row = el('div', 'pt-check-row');
        var left = el('div');
        left.appendChild(el('strong', '', r[0]));
        left.appendChild(el('div', 'pt-muted', r[1]));
        row.appendChild(left);
        row.appendChild(el('span', 'pt-badge pt-badge--' + r[2], 'DONE'));
        M.body.appendChild(row);
      });

      M.body.appendChild(el('strong', '', 'Ready-to-Copy WhatsApp & Telegram Announcement Card'));
      var pre = el('pre', 'pt-pre', d.whatsapp_telegram_card || '');
      M.body.appendChild(pre);

      var copyBtn = el('button', 'pt-btn pt-btn--primary', '📋 Copy WhatsApp / Telegram Card');
      copyBtn.type = 'button';
      copyBtn.addEventListener('click', function () {
        var txt = d.whatsapp_telegram_card || '';
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(txt).then(function () {
            toast('WhatsApp / Telegram Announcement Card copied!', 'ok');
          }, function () { toast('Select and copy card text above.', 'info'); });
        }
      });

      var openBtn = el('a', 'pt-btn', 'View Live Page ↗');
      openBtn.href = d.public_url || '/';
      openBtn.target = '_blank';
      openBtn.rel = 'noopener noreferrer';

      var doneBtn = el('button', 'pt-btn', 'Done');
      doneBtn.type = 'button';
      doneBtn.addEventListener('click', closeModal);

      M.foot.appendChild(openBtn);
      M.foot.appendChild(copyBtn);
      M.foot.appendChild(doneBtn);
      return d;
    }).catch(function (err) {
      toast('Publish chain warning: ' + err.message, 'crimson');
    });
  }

  // 3. Bulk CSV / JSON Importer Modal with Dry-Run Validation Preview
  function openBulkImporter(pillar, onCommitted) {
    openModal('📥 Bulk CSV / JSON Importer (' + pillar.toUpperCase() + ')');

    var fmtSel = el('select', 'pt-select');
    fmtSel.setAttribute('aria-label', 'Import format');
    var oCsv = el('option', '', 'CSV (title_en,slug,summary_en,apply_url,expires_at)'); oCsv.value = 'csv';
    var oJson = el('option', '', 'JSON Array ([{ "title_en": "...", "slug": "..." }])'); oJson.value = 'json';
    fmtSel.appendChild(oCsv);
    fmtSel.appendChild(oJson);

    var ta = el('textarea', 'pt-textarea');
    ta.placeholder = 'title_en,slug,summary_en,apply_url,expires_at\nOPSC OAS 2026,opsc-oas-2026,Odisha Civil Services exam,https://www.opsc.gov.in/,2026-12-31';

    var previewHost = el('div');

    M.body.appendChild(el('p', 'pt-muted', 'Paste CSV or JSON rows below and run Dry-Run Validate first. Duplicate slugs and invalid dates/URLs are flagged per row before anything is written to D1.'));
    M.body.appendChild(fmtSel);
    M.body.appendChild(ta);
    M.body.appendChild(previewHost);

    var commitBtn = el('button', 'pt-btn pt-btn--primary', 'Commit Valid Rows to D1');
    commitBtn.type = 'button';
    commitBtn.disabled = true;

    var validateBtn = el('button', 'pt-btn', '🔍 Dry-Run Validate Preview');
    validateBtn.type = 'button';
    validateBtn.addEventListener('click', function () {
      clear(previewHost);
      previewHost.appendChild(el('p', 'pt-muted', 'Validating rows against live D1 slugs…'));
      api('bulk-import', { pillar: pillar, format: fmtSel.value, raw: ta.value, dry_run: true })
        .then(function (d) {
          clear(previewHost);
          previewHost.appendChild(el('strong', '', 'Dry-Run Summary: ' + d.valid_count + ' valid · ' + d.error_count + ' error(s) out of ' + d.total_rows + ' row(s).'));
          var tw = el('div', 'pt-table-wrap');
          var tbl = el('table', 'pt-table');
          var thead = el('thead');
          var hr = el('tr');
          ['#', 'Title', 'Slug', 'Status', 'Validation Detail'].forEach(function (h) { hr.appendChild(el('th', '', h)); });
          thead.appendChild(hr);
          tbl.appendChild(thead);
          var tb = el('tbody');
          (d.preview || []).forEach(function (r) {
            var tr = el('tr');
            tr.appendChild(el('td', '', String(r.row_number)));
            tr.appendChild(el('td', '', r.title_en || '—'));
            tr.appendChild(el('td', '', r.slug || '—'));
            var stTd = el('td');
            stTd.appendChild(el('span', 'pt-badge pt-badge--' + (r.status === 'valid' ? 'pass' : 'fail'), r.status.toUpperCase()));
            tr.appendChild(stTd);
            tr.appendChild(el('td', '', r.errors && r.errors.length ? r.errors.join('; ') : 'Ready'));
            tb.appendChild(tr);
          });
          tbl.appendChild(tb);
          tw.appendChild(tbl);
          previewHost.appendChild(tw);
          commitBtn.disabled = !(d.valid_count > 0);
        })
        .catch(function (err) {
          clear(previewHost);
          previewHost.appendChild(el('p', 'pt-muted', 'Validation failed: ' + err.message));
          commitBtn.disabled = true;
        });
    });

    commitBtn.addEventListener('click', function () {
      commitBtn.disabled = true;
      api('bulk-import', { pillar: pillar, format: fmtSel.value, raw: ta.value, dry_run: false })
        .then(function (d) {
          toast('Imported ' + d.inserted_count + ' row(s) into ' + pillar + ' (skipped ' + d.skipped_count + ')', 'ok');
          closeModal();
          if (typeof onCommitted === 'function') onCommitted(d);
        })
        .catch(function (err) {
          toast('Import failed: ' + err.message, 'crimson');
          commitBtn.disabled = false;
        });
    });

    var cancelBtn = el('button', 'pt-btn', 'Cancel');
    cancelBtn.type = 'button';
    cancelBtn.addEventListener('click', closeModal);

    M.foot.appendChild(cancelBtn);
    M.foot.appendChild(validateBtn);
    M.foot.appendChild(commitBtn);
  }

  // 4. Duplicate as Template helper
  function duplicateItem(pillar, id, onCloned) {
    return api('duplicate-item', { pillar: pillar, id: id })
      .then(function (d) {
        toast('Cloned as draft template: ' + ((d.item && d.item.title_en) || 'Copy'), 'ok');
        if (typeof onCloned === 'function') onCloned(d.item);
        return d.item;
      })
      .catch(function (err) {
        toast('Duplicate failed: ' + err.message, 'crimson');
      });
  }

  window.CSOPublishTools = {
    runSanityCheck: runSanityCheck,
    runPublishChain: runPublishChain,
    openBulkImporter: openBulkImporter,
    duplicateItem: duplicateItem
  };
})(window, document);
