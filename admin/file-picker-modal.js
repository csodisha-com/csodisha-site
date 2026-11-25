/**
 * CS Odisha Admin Studio — Inline Cloudflare R2 File Picker Modal (v311)
 * Triggered from attachment/URL inputs across Jobs, Careers, Schemes, Study Library & Web Studio.
 * Supports:
 *   1. Pick Existing File from D1 media_files (instant search + folder filter pills)
 *   2. Quick Upload directly to R2 CSO_FILES via POST /api/admin/files -> inserts /files/<file_key>
 * Strict CSP: pure DOM APIs only; no raw HTML injection or inline CSS property mutations.
 */
(function (window, document) {
  'use strict';

  var FOLDERS = ['Jobs', 'Schemes', 'Study PDFs', 'Images', 'Legal'];
  var ACCEPT_ALL = '.pdf,.webp,.png,.jpg,.jpeg,.docx,.xlsx,.csv,application/pdf,image/webp,image/png,image/jpeg,text/csv';

  var M = {
    backdrop: null,
    dialog: null,
    body: null,
    tabPick: null,
    tabUpload: null,
    activeTab: 'pick',
    folderFilter: '',
    uploadFolder: 'Jobs',
    searchQuery: '',
    onSelect: null,
    data: null,
    uploading: false,
    searchTimer: null,
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

  function fmtBytes(b) {
    b = Number(b || 0);
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(2) + ' MB';
  }

  function closeModal() {
    if (M.backdrop) M.backdrop.hidden = true;
    document.body.classList.remove('cso-modal-open');
    if (M.lastFocus && typeof M.lastFocus.focus === 'function') {
      try { M.lastFocus.focus(); } catch (_) {}
    }
  }

  function ensureModal() {
    if (M.backdrop) return;
    var bd = el('div', 'fp-backdrop');
    bd.id = 'csoR2FilePickerModal';
    bd.hidden = true;
    bd.addEventListener('click', function (ev) {
      if (ev.target === bd) closeModal();
    });

    var dlg = el('div', 'fp-dialog');
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-modal', 'true');
    dlg.setAttribute('aria-labelledby', 'csoFpModalTitle');

    var head = el('div', 'fp-head');
    var title = el('h3', 'fp-title', '📁 Upload or Pick File from Cloudflare R2');
    title.id = 'csoFpModalTitle';
    var closeBtn = el('button', 'fp-btn', '× Close');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close R2 File Picker');
    closeBtn.addEventListener('click', closeModal);
    head.appendChild(title);
    head.appendChild(closeBtn);
    dlg.appendChild(head);

    var tabs = el('div', 'fp-tabs');
    tabs.setAttribute('role', 'tablist');
    M.tabPick = el('button', 'fp-tab is-active', '📂 Pick Existing R2 File');
    M.tabPick.type = 'button';
    M.tabPick.setAttribute('role', 'tab');
    M.tabPick.addEventListener('click', function () {
      M.activeTab = 'pick';
      renderBody();
      loadExisting();
    });

    M.tabUpload = el('button', 'fp-tab', '⬆ Quick Upload to R2');
    M.tabUpload.type = 'button';
    M.tabUpload.setAttribute('role', 'tab');
    M.tabUpload.addEventListener('click', function () {
      M.activeTab = 'upload';
      renderBody();
    });

    tabs.appendChild(M.tabPick);
    tabs.appendChild(M.tabUpload);
    dlg.appendChild(tabs);

    M.body = el('div', 'fp-body');
    dlg.appendChild(M.body);
    bd.appendChild(dlg);
    document.body.appendChild(bd);
    M.backdrop = bd;
    M.dialog = dlg;

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && M.backdrop && !M.backdrop.hidden) closeModal();
    });
  }

  function loadExisting() {
    var qs = new URLSearchParams();
    if (M.folderFilter) qs.set('folder', M.folderFilter);
    if (M.searchQuery) qs.set('q', M.searchQuery);
    fetch('/api/admin/files' + (qs.toString() ? '?' + qs.toString() : ''), { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        M.data = d;
        if (M.activeTab === 'pick') renderBody();
      })
      .catch(function (err) {
        toast('Could not load R2 files: ' + err.message, 'crimson');
      });
  }

  function handleSelect(item) {
    if (typeof M.onSelect === 'function') {
      M.onSelect(item.clean_url || ('/files/' + item.file_key), item);
    }
    toast('Inserted ' + (item.clean_url || item.file_key), 'ok');
    closeModal();
  }

  function uploadFile(file) {
    if (!file || M.uploading) return;
    M.uploading = true;
    renderBody();
    var fd = new FormData();
    fd.append('file', file);
    fd.append('folder', M.uploadFolder);
    fetch('/api/admin/files', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'X-CSO-CSRF': '1' },
      body: fd
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error((d && d.error) || ('Upload failed (HTTP ' + r.status + ')'));
        return d;
      });
    }).then(function (d) {
      M.uploading = false;
      if (d && d.item) {
        handleSelect(d.item);
      }
    }).catch(function (err) {
      M.uploading = false;
      toast(err.message, 'crimson');
      renderBody();
    });
  }

  function renderBody() {
    if (!M.body) return;
    clear(M.body);
    M.tabPick.className = 'fp-tab' + (M.activeTab === 'pick' ? ' is-active' : '');
    M.tabUpload.className = 'fp-tab' + (M.activeTab === 'upload' ? ' is-active' : '');

    if (M.data && M.data.r2_configured === false) {
      M.body.appendChild(el('div', 'fp-notice', '⚠ Local R2 binding CSO_FILES is unbound. Bind CSO_FILES in wrangler.json / Cloudflare Dashboard for live uploads.'));
    }

    if (M.activeTab === 'upload') {
      var row = el('div', 'fp-toolbar');
      var sel = el('select', 'fp-select');
      sel.setAttribute('aria-label', 'Target R2 folder');
      FOLDERS.forEach(function (f) {
        var op = el('option', '', 'Folder: ' + f);
        op.value = f;
        if (f === M.uploadFolder) op.selected = true;
        sel.appendChild(op);
      });
      sel.addEventListener('change', function () { M.uploadFolder = sel.value; });
      row.appendChild(sel);

      var inp = el('input', 'fp-file-hidden');
      inp.type = 'file';
      inp.id = 'csoFpQuickUploadInput';
      inp.accept = ACCEPT_ALL;
      inp.addEventListener('change', function () {
        if (inp.files && inp.files[0]) uploadFile(inp.files[0]);
        inp.value = '';
      });
      var pickLbl = el('label', 'fp-btn fp-btn--primary', M.uploading ? 'Uploading to R2…' : '+ Choose File & Insert Link');
      pickLbl.setAttribute('for', 'csoFpQuickUploadInput');
      row.appendChild(inp);
      row.appendChild(pickLbl);
      M.body.appendChild(row);

      var dz = el('div', 'fp-dropzone');
      dz.setAttribute('role', 'button');
      dz.setAttribute('tabindex', '0');
      dz.appendChild(el('strong', '', M.uploading ? 'Uploading & validating file signature…' : 'Drop PDF, WebP, PNG, JPG, DOCX, XLSX or CSV here'));
      dz.appendChild(el('span', 'fp-item-meta', 'Max 15 MB docs · 3 MB images · Inserts clean /files/<key> link automatically'));
      dz.addEventListener('click', function () { inp.click(); });
      dz.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); inp.click(); } });
      dz.addEventListener('dragover', function (ev) { ev.preventDefault(); dz.classList.add('is-dragover'); });
      dz.addEventListener('dragleave', function () { dz.classList.remove('is-dragover'); });
      dz.addEventListener('drop', function (ev) {
        ev.preventDefault();
        dz.classList.remove('is-dragover');
        if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]) uploadFile(ev.dataTransfer.files[0]);
      });
      M.body.appendChild(dz);
      return;
    }

    // Pick Existing Tab
    var tb = el('div', 'fp-toolbar');
    var pills = el('div', 'fp-pills');
    var bAll = el('button', 'fp-pill' + (!M.folderFilter ? ' is-active' : ''), 'All');
    bAll.type = 'button';
    bAll.addEventListener('click', function () { M.folderFilter = ''; loadExisting(); });
    pills.appendChild(bAll);
    FOLDERS.forEach(function (f) {
      var b = el('button', 'fp-pill' + (M.folderFilter === f ? ' is-active' : ''), f);
      b.type = 'button';
      b.addEventListener('click', function () { M.folderFilter = f; loadExisting(); });
      pills.appendChild(b);
    });
    tb.appendChild(pills);

    var srch = el('input', 'fp-input');
    srch.type = 'search';
    srch.placeholder = 'Search R2 files…';
    srch.setAttribute('aria-label', 'Search R2 files');
    srch.value = M.searchQuery;
    srch.addEventListener('input', function () {
      M.searchQuery = srch.value;
      clearTimeout(M.searchTimer);
      M.searchTimer = setTimeout(loadExisting, 220);
    });
    tb.appendChild(srch);
    M.body.appendChild(tb);

    if (!M.data) {
      M.body.appendChild(el('p', 'fp-item-meta', 'Loading uploaded files from D1 media_files…'));
      return;
    }
    var items = M.data.items || [];
    if (!items.length) {
      var empty = el('div', 'fp-dropzone');
      empty.appendChild(el('strong', '', 'No matching files in R2 yet (0)'));
      empty.appendChild(el('span', 'fp-item-meta', 'Switch to "Quick Upload to R2" to upload and insert a file immediately.'));
      var goUp = el('button', 'fp-btn fp-btn--primary', '⬆ Quick Upload Now');
      goUp.type = 'button';
      goUp.addEventListener('click', function () { M.activeTab = 'upload'; renderBody(); });
      empty.appendChild(goUp);
      M.body.appendChild(empty);
      return;
    }

    var grid = el('div', 'fp-list');
    items.forEach(function (it) {
      var card = el('div', 'fp-item');
      card.appendChild(el('div', 'fp-item-name', it.original_name));
      card.appendChild(el('div', 'fp-item-meta', it.folder + ' · ' + fmtBytes(it.size_bytes) + ' · ' + it.mime_type));
      card.appendChild(el('div', 'fp-item-url', it.clean_url));
      var pickBtn = el('button', 'fp-btn fp-btn--primary', 'Insert Clean Link');
      pickBtn.type = 'button';
      pickBtn.addEventListener('click', function () { handleSelect(it); });
      card.appendChild(pickBtn);
      grid.appendChild(card);
    });
    M.body.appendChild(grid);
  }

  function open(opts) {
    opts = opts || {};
    ensureModal();
    M.lastFocus = document.activeElement;
    M.uploadFolder = FOLDERS.indexOf(opts.folder) !== -1 ? opts.folder : 'Jobs';
    M.folderFilter = opts.filterFolder || '';
    M.searchQuery = '';
    M.activeTab = opts.initialTab === 'upload' ? 'upload' : 'pick';
    M.onSelect = opts.onSelect || null;
    M.backdrop.hidden = false;
    document.body.classList.add('cso-modal-open');
    renderBody();
    loadExisting();
  }

  function createPickerButton(opts) {
    opts = opts || {};
    var b = el('button', opts.className || 'fp-btn', opts.label || '📁 Pick / Upload R2');
    b.type = 'button';
    b.addEventListener('click', function () {
      open({
        folder: opts.folder || 'Jobs',
        onSelect: function (cleanUrl, item) {
          if (opts.input) {
            opts.input.value = cleanUrl;
            opts.input.dispatchEvent(new Event('input', { bubbles: true }));
            opts.input.dispatchEvent(new Event('change', { bubbles: true }));
          }
          if (typeof opts.onSelect === 'function') opts.onSelect(cleanUrl, item);
        }
      });
    });
    return b;
  }

  window.CSOFilePicker = {
    open: open,
    close: closeModal,
    createPickerButton: createPickerButton
  };
})(window, document);
