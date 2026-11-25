/**
 * CS Odisha Admin Studio — Folder #9: Cloudflare R2 File & Media Manager (v310)
 * Drag-and-drop & file-picker uploads, folder filters, real R2 usage totals,
 * One-Click Copy Clean Link (/files/<file_key>), and pre-delete D1 reference warning modal.
 * Strict CSP: DOM APIs only; zero innerHTML, outerHTML, insertAdjacentHTML, or .style.*.
 */
(function (window, document) {
  'use strict';

  var FOLDERS = ['Jobs', 'Schemes', 'Study PDFs', 'Images', 'Legal'];
  var ACCEPT_ATTR = '.pdf,.webp,.png,.jpg,.jpeg,.docx,.xlsx,.csv,application/pdf,image/webp,image/png,image/jpeg,text/csv';

  var S = {
    root: null,
    headerActions: null,
    folderFilter: '',
    uploadFolder: 'Jobs',
    searchQuery: '',
    data: null,
    uploading: false,
    searchTimer: null
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

  function fmtBytes(n) {
    n = Number(n || 0);
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1073741824) return (n / 1048576).toFixed(2) + ' MB';
    return (n / 1073741824).toFixed(2) + ' GB';
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : String(iso).replace(' ', 'T') + 'Z');
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    } catch (_) {
      return String(iso);
    }
  }

  function api(path, opts) {
    var o = Object.assign({ credentials: 'same-origin' }, opts || {});
    var headers = Object.assign({ 'X-CSO-CSRF': '1' }, o.headers || {});
    o.headers = headers;
    return fetch('/api/admin/files' + path, o).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) {
          var err = new Error((d && d.error) || ('HTTP ' + r.status));
          err.status = r.status;
          err.payload = d;
          throw err;
        }
        return d;
      });
    });
  }

  function openRefWarningModal(fileItem, refs) {
    var modal = document.getElementById('globalModal');
    var title = document.getElementById('modalTitle');
    var body = document.getElementById('modalBody');
    var foot = document.getElementById('modalFooter');
    if (!modal || !title || !body || !foot) {
      if (window.confirm('This file is linked in ' + refs.length + ' content item(s). Delete permanently anyway?')) {
        performDelete(fileItem.id, true);
      }
      return;
    }

    title.textContent = 'File Referenced in Live Content (' + refs.length + ')';
    clear(body);
    clear(foot);

    body.appendChild(el('p', '', 'Deleting "' + fileItem.original_name + '" (' + fileItem.clean_url + ') will break links in the following D1 records:'));
    var list = el('ul', 'fm-ref-list');
    refs.forEach(function (ref) {
      list.appendChild(el('li', '', '[' + ref.table + '] ' + ref.title + ' (ID: ' + ref.id + ')'));
    });
    body.appendChild(list);

    var cancelBtn = el('button', 'fm-btn', 'Cancel');
    cancelBtn.type = 'button';
    cancelBtn.addEventListener('click', function () {
      if (typeof window.closeModal === 'function') window.closeModal();
      else modal.hidden = true;
    });

    var forceBtn = el('button', 'fm-btn fm-btn--danger', 'Delete Permanently Anyway');
    forceBtn.type = 'button';
    forceBtn.addEventListener('click', function () {
      if (typeof window.closeModal === 'function') window.closeModal();
      else modal.hidden = true;
      performDelete(fileItem.id, true);
    });

    foot.appendChild(cancelBtn);
    foot.appendChild(forceBtn);
    modal.hidden = false;
  }

  function performDelete(fileId, force) {
    api('/' + encodeURIComponent(fileId) + (force ? '?force=1' : ''), { method: 'DELETE' })
      .then(function () {
        toast('File deleted from R2 and D1', 'ok');
        loadFiles();
      })
      .catch(function (err) {
        if (err.status === 409 && err.payload && Array.isArray(err.payload.references)) {
          var item = (S.data && S.data.items || []).find(function (x) { return x.id === fileId; }) || { id: fileId, original_name: fileId, clean_url: '' };
          openRefWarningModal(item, err.payload.references);
        } else {
          toast('Delete failed: ' + err.message, 'crimson');
        }
      });
  }

  function requestDelete(fileItem) {
    api('/' + encodeURIComponent(fileItem.id) + '/references', { method: 'GET' })
      .then(function (d) {
        if (d.reference_count > 0) {
          openRefWarningModal(fileItem, d.references || []);
        } else if (window.confirm('Delete "' + fileItem.original_name + '" from Cloudflare R2 permanently?')) {
          performDelete(fileItem.id, false);
        }
      })
      .catch(function (err) {
        toast('Reference check failed: ' + err.message, 'crimson');
      });
  }

  function uploadFileList(fileList) {
    if (!fileList || !fileList.length || S.uploading) return;
    S.uploading = true;
    renderWorkspace();

    var files = Array.prototype.slice.call(fileList);
    var idx = 0;
    var okCount = 0;

    function next() {
      if (idx >= files.length) {
        S.uploading = false;
        if (okCount > 0) toast('Uploaded ' + okCount + ' file(s) to R2', 'ok');
        loadFiles();
        return;
      }
      var f = files[idx++];
      var fd = new FormData();
      fd.append('file', f);
      fd.append('folder', S.uploadFolder);
      api('', { method: 'POST', body: fd })
        .then(function () { okCount += 1; })
        .catch(function (err) { toast(f.name + ': ' + err.message, 'crimson'); })
        .finally(next);
    }
    next();
  }

  function loadFiles() {
    var qs = new URLSearchParams();
    if (S.folderFilter) qs.set('folder', S.folderFilter);
    if (S.searchQuery) qs.set('q', S.searchQuery);
    var qStr = qs.toString() ? ('?' + qs.toString()) : '';

    api(qStr, { method: 'GET' })
      .then(function (d) {
        S.data = d;
        if (window.CSOStudio && window.CSOStudio.setFilesCount) {
          window.CSOStudio.setFilesCount(d.total_files || 0);
        }
        renderWorkspace();
      })
      .catch(function (err) {
        toast('Failed to load File Manager: ' + err.message, 'crimson');
      });
  }

  function renderWorkspace() {
    if (!S.root) return;
    clear(S.root);
    clear(S.headerActions);

    var refreshBtn = el('button', 'fm-btn', '↻ Refresh R2 & D1');
    refreshBtn.type = 'button';
    refreshBtn.addEventListener('click', loadFiles);
    if (S.headerActions) S.headerActions.appendChild(refreshBtn);

    var shell = el('div', 'fm-shell');
    var d = S.data;

    if (!d) {
      shell.appendChild(el('div', 'fm-banner', 'Loading Cloudflare R2 storage & media catalog from D1…'));
      S.root.appendChild(shell);
      return;
    }

    // 1. Live R2 Bucket Configuration Banner
    var banner = el('div', 'fm-banner ' + (d.r2_configured ? 'fm-banner--ok' : 'fm-banner--warn'));
    banner.appendChild(el('span', '', (d.r2_configured ? '● Connected: ' : '⚠ Local / Unbound R2: ') + d.config_message));
    banner.appendChild(el('span', '', 'Binding: ' + d.bucket_binding));
    shell.appendChild(banner);

    // 2. Real R2 KPIs
    var kpis = el('div', 'fm-kpis');
    var k1 = el('div', 'fm-kpi');
    k1.appendChild(el('span', 'fm-kpi-label', 'Total Stored Files (D1)'));
    k1.appendChild(el('strong', 'fm-kpi-val', String(d.total_files || 0)));
    var k2 = el('div', 'fm-kpi');
    k2.appendChild(el('span', 'fm-kpi-label', 'Total R2 Storage Used'));
    k2.appendChild(el('strong', 'fm-kpi-val', fmtBytes(d.total_bytes || 0)));
    var k3 = el('div', 'fm-kpi');
    k3.appendChild(el('span', 'fm-kpi-label', 'Public Clean URL Prefix'));
    k3.appendChild(el('strong', 'fm-kpi-val', '/files/:key'));
    var k4 = el('div', 'fm-kpi');
    k4.appendChild(el('span', 'fm-kpi-label', 'Upload Security Policy'));
    k4.appendChild(el('strong', 'fm-kpi-val', '15 MB Docs · 3 MB Img'));
    kpis.appendChild(k1);
    kpis.appendChild(k2);
    kpis.appendChild(k3);
    kpis.appendChild(k4);
    shell.appendChild(kpis);

    // 3. Drag-and-Drop & File Picker Upload Zone
    var upCard = el('section', 'fm-upload-card');
    var controls = el('div', 'fm-upload-controls');
    var fld = el('div', 'fm-field');
    var lbl = el('label', 'fm-label', 'Target Folder');
    lbl.setAttribute('for', 'fmUploadFolderSelect');
    var sel = el('select', 'fm-select');
    sel.id = 'fmUploadFolderSelect';
    FOLDERS.forEach(function (f) {
      var op = el('option', '', f);
      op.value = f;
      if (f === S.uploadFolder) op.selected = true;
      sel.appendChild(op);
    });
    sel.addEventListener('change', function () { S.uploadFolder = sel.value; });
    fld.appendChild(lbl);
    fld.appendChild(sel);
    controls.appendChild(fld);

    var fileInput = el('input', 'fm-file-input');
    fileInput.type = 'file';
    fileInput.id = 'fmFilePickerInput';
    fileInput.multiple = true;
    fileInput.accept = ACCEPT_ATTR;
    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files.length) {
        uploadFileList(fileInput.files);
        fileInput.value = '';
      }
    });

    var pickLabel = el('label', 'fm-btn fm-btn--primary', S.uploading ? 'Uploading to R2…' : '+ Choose Files to Upload');
    pickLabel.setAttribute('for', 'fmFilePickerInput');
    controls.appendChild(fileInput);
    controls.appendChild(pickLabel);
    upCard.appendChild(controls);

    var dropzone = el('div', 'fm-dropzone');
    dropzone.setAttribute('role', 'button');
    dropzone.setAttribute('tabindex', '0');
    dropzone.setAttribute('aria-label', 'Drop files here or press Enter to pick files');
    dropzone.appendChild(el('p', 'fm-dropzone-title', S.uploading ? 'Uploading files to Cloudflare R2…' : 'Drag & drop PDFs, Images, or Spreadsheets here'));
    dropzone.appendChild(el('p', 'fm-dropzone-sub', 'Allowed: PDF, WEBP, PNG, JPG/JPEG, DOCX, XLSX, CSV · Hard-blocked: HTML, JS, SVG, executables · Max 15 MB docs / 3 MB images'));
    dropzone.addEventListener('click', function () { fileInput.click(); });
    dropzone.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); fileInput.click(); }
    });
    dropzone.addEventListener('dragover', function (ev) { ev.preventDefault(); dropzone.classList.add('is-dragover'); });
    dropzone.addEventListener('dragleave', function () { dropzone.classList.remove('is-dragover'); });
    dropzone.addEventListener('drop', function (ev) {
      ev.preventDefault();
      dropzone.classList.remove('is-dragover');
      if (ev.dataTransfer && ev.dataTransfer.files) uploadFileList(ev.dataTransfer.files);
    });
    upCard.appendChild(dropzone);
    shell.appendChild(upCard);

    // 4. Filter Bar & File Catalog Table
    var listCard = el('section', 'fm-list-card');
    var toolbar = el('div', 'fm-toolbar');
    var pills = el('div', 'fm-folder-pills');

    var allBtn = el('button', 'fm-pill' + (!S.folderFilter ? ' is-active' : ''), 'All (' + (d.total_files || 0) + ')');
    allBtn.type = 'button';
    allBtn.addEventListener('click', function () { S.folderFilter = ''; loadFiles(); });
    pills.appendChild(allBtn);

    FOLDERS.forEach(function (f) {
      var cnt = (d.folder_counts && d.folder_counts[f] && d.folder_counts[f].count) || 0;
      var pBtn = el('button', 'fm-pill' + (S.folderFilter === f ? ' is-active' : ''), f + ' (' + cnt + ')');
      pBtn.type = 'button';
      pBtn.addEventListener('click', function () { S.folderFilter = f; loadFiles(); });
      pills.appendChild(pBtn);
    });
    toolbar.appendChild(pills);

    var search = el('input', 'fm-input');
    search.type = 'search';
    search.placeholder = 'Search filename or key…';
    search.setAttribute('aria-label', 'Search uploaded files');
    search.value = S.searchQuery;
    search.addEventListener('input', function () {
      S.searchQuery = search.value;
      clearTimeout(S.searchTimer);
      S.searchTimer = setTimeout(loadFiles, 250);
    });
    toolbar.appendChild(search);
    listCard.appendChild(toolbar);

    var items = d.items || [];
    if (!items.length) {
      var empty = el('div', 'fm-empty');
      empty.appendChild(el('h3', '', S.folderFilter || S.searchQuery ? 'No files match this filter' : 'No files uploaded yet (0)'));
      empty.appendChild(el('p', '', 'Upload an official notification PDF, scheme guideline, study pack, or WebP image above to generate a permanent /files/:key CDN link.'));
      var cta = el('button', 'fm-btn fm-btn--primary', '+ Upload First File');
      cta.type = 'button';
      cta.addEventListener('click', function () { fileInput.click(); });
      empty.appendChild(cta);
      listCard.appendChild(empty);
    } else {
      var tWrap = el('div', 'fm-table-wrap');
      var tbl = el('table', 'fm-table');
      var thead = el('thead');
      var hr = el('tr');
      ['File & Clean Key', 'Folder', 'Type', 'Size', 'Uploaded', 'Actions'].forEach(function (h) {
        hr.appendChild(el('th', '', h));
      });
      thead.appendChild(hr);
      tbl.appendChild(thead);

      var tbody = el('tbody');
      items.forEach(function (it) {
        var tr = el('tr');

        var tdName = el('td');
        tdName.appendChild(el('div', 'fm-file-name', it.original_name));
        tdName.appendChild(el('span', 'fm-file-key', it.clean_url));
        tr.appendChild(tdName);

        tr.appendChild(el('td', '', it.folder));
        tr.appendChild(el('td', '', it.mime_type));
        tr.appendChild(el('td', 'cso-tabular', fmtBytes(it.size_bytes)));
        tr.appendChild(el('td', '', fmtDate(it.created_at) + (it.uploaded_by ? ' · ' + it.uploaded_by : '')));

        var tdAct = el('td');
        var actWrap = el('div', 'fm-row-actions');

        var copyBtn = el('button', 'fm-btn fm-btn--primary', 'Copy Clean Link');
        copyBtn.type = 'button';
        copyBtn.addEventListener('click', function () {
          var fullLink = it.clean_url;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(fullLink).then(function () {
              toast('Copied ' + fullLink, 'ok');
            }, function () {
              toast(fullLink, 'info');
            });
          } else {
            toast(fullLink, 'info');
          }
        });

        var openLink = el('a', 'fm-btn', 'Open ↗');
        openLink.href = it.clean_url;
        openLink.target = '_blank';
        openLink.rel = 'noopener noreferrer';

        var delBtn = el('button', 'fm-btn fm-btn--danger', 'Delete');
        delBtn.type = 'button';
        delBtn.addEventListener('click', function () { requestDelete(it); });

        actWrap.appendChild(copyBtn);
        actWrap.appendChild(openLink);
        actWrap.appendChild(delBtn);
        tdAct.appendChild(actWrap);
        tr.appendChild(tdAct);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      tWrap.appendChild(tbl);
      listCard.appendChild(tWrap);
    }

    shell.appendChild(listCard);
    S.root.appendChild(shell);
  }

  window.CSOFileManager = {
    render: function (root, headerActions) {
      S.root = root;
      S.headerActions = headerActions;
      renderWorkspace();
      loadFiles();
    }
  };
})(window, document);
