/**
 * CS Odisha Admin Studio — Unified Candidate Hub, Governance & UI/Feature Studio (v244)
 * Controls everything on /student-dashboard/ directly from D1:
 *   Tab 1: Candidates Roster & Governance (Default View + 360° Authority Drawer)
 *   Tab 2: Dashboard UI Manager & 4-Theme Live Preview
 *   Tab 3: Add & Manage Features (Custom Feature Builder)
 *   Tab 4: Provide Content & Targeted Push (with R2 Media Picker)
 *   Tab 5: Document Vault Templates
 * Strict CSP: safe DOM APIs only, external CSS classes and event listeners.
 */
(function (window, document) {
  'use strict';

  var ODISHA_30_DISTRICTS = [
    'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh', 'Cuttack', 'Deogarh',
    'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi',
    'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj',
    'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'
  ];
  var DISTRICT_ALIASES = {
    'balasore (baleswar)': 'Balasore',
    baleswar: 'Balasore',
    khurda: 'Khordha',
    sonepur: 'Subarnapur',
    nowrangpur: 'Nabarangpur',
    jajapur: 'Jajpur',
    keonjhar: 'Kendujhar',
    bolangir: 'Balangir'
  };
  var EXAM_SLUG_MAP = {
    'ugc-net': 'UGC NET',
    'odisha-bed': 'Odisha B.Ed',
    'b-ed': 'B.Ed',
    opsc: 'OPSC',
    ossc: 'OSSC',
    osssc: 'OSSSC',
    oavs: 'OAVS',
    otet: 'OTET',
    osstet: 'OSSTET',
    ctet: 'CTET',
    upsc: 'UPSC',
    ssc: 'SSC',
    'bse-odisha': 'BSE Odisha',
    chse: 'CHSE',
    banking: 'Banking',
    railways: 'Railways'
  };
  function normalizeDistrict(raw) {
    var s = String(raw || '').trim();
    if (!s) return '';
    return DISTRICT_ALIASES[s.toLowerCase()] || s;
  }
  function formatExamLabel(raw) {
    var s = String(raw || '').trim();
    if (!s) return '';
    var lower = s.toLowerCase();
    if (EXAM_SLUG_MAP[lower]) return EXAM_SLUG_MAP[lower];
    if (s.indexOf('-') === -1 && s.indexOf('_') === -1) return s;
    return s.split(/[-_]+/).filter(Boolean).map(function (w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' ');
  }
  var EXAM_BOARDS = ['OPSC', 'OSSC', 'OSSSC', 'SSB Odisha', 'OAVS', 'OPRB', 'UGC NET', 'CTET/OTET/OSSTET', 'SSC/Banking/RRB', 'BSE Odisha', 'CHSE', 'UPSC'];
  var THEMES = [
    { id: 'system', label: 'System' },
    { id: 'dark', label: 'Dark Night' },
    { id: 'reading', label: 'Reading Mode' },
    { id: 'utkal-bharat', label: 'Odisha & Bharat' }
  ];
  var FEATURE_TYPES = [
    ['custom_tool', 'Interactive Link / Tool Card'],
    ['custom_resource_hub', 'Study Resource Pack'],
    ['custom_checklist', 'Custom Checklist Widget'],
    ['custom_announcement', 'Notice / Exam Board Feed'],
    ['custom_feature', 'Embedded Action Panel']
  ];
  var ITEM_TYPES = [
    ['study_pack', 'Study Pack / PDF'],
    ['mock_test', 'Mock Test'],
    ['official_notice', 'Official Notice'],
    ['admit_card_alert', 'Admit Card Alert'],
    ['personal_guidance', 'Personal Guidance'],
    ['fee_waiver', 'Fee Waiver']
  ];

  var state = {
    tab: 'roster',
    roster: { items: [], kpis: null, q: '', status: '', tier: '', district: '', exam: '', selected: new Set(), total: 0 },
    drawer: { open: false, data: null, userId: null },
    ui: null,
    uiPreviewLang: 'en',
    modules: [],
    editingModule: null,
    assigned: [],
    editingAssigned: null,
    docs: [],
    editingDoc: null,
    root: null,
    refs: {}
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); return n; }
  function toast(msg, kind) { if (typeof window.showToast === 'function') window.showToast(msg, kind || 'info'); }
  function num(v) { try { return Number(v || 0).toLocaleString('en-IN'); } catch (_) { return String(v || 0); } }
  function btn(label, cls, handler) {
    var b = el('button', cls || 'ch-btn', label);
    b.type = 'button';
    if (handler) b.addEventListener('click', handler);
    return b;
  }
  function initials(name, email) {
    var s = String(name || email || 'CA').trim();
    var p = s.split(/\s+/);
    return (p.length >= 2 ? p[0][0] + p[1][0] : s.slice(0, 2)).toUpperCase();
  }
  function when(ts) {
    if (!ts) return 'Never';
    var d = new Date(String(ts).includes('T') ? ts : String(ts).replace(' ', 'T') + 'Z');
    return isNaN(d.getTime()) ? String(ts) : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function api(url, method, body) {
    var opts = { method: method || 'GET', credentials: 'same-origin', headers: { 'X-CSO-CSRF': '1' } };
    if (body !== undefined) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    return fetch(url, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error((d && d.error) || ('HTTP ' + r.status));
        return d;
      });
    });
  }
  function notifyCount(n) {
    if (window.CSOStudio && typeof window.CSOStudio.setCandidateCount === 'function') window.CSOStudio.setCandidateCount(n);
  }
  function fieldGroup(label, inputNode, spanFull) {
    var g = el('div', 'cso-form-group' + (spanFull ? ' ch-span-2' : ''));
    var l = el('label', 'cso-form-label', label);
    if (inputNode.id) l.setAttribute('for', inputNode.id);
    g.appendChild(l); g.appendChild(inputNode);
    return g;
  }
  function textInput(name, val, placeholder, type) {
    var i = el('input', 'cso-form-input');
    i.name = name; i.id = 'ch_' + name + '_' + Math.random().toString(36).slice(2, 6);
    i.type = type || 'text'; i.value = val == null ? '' : String(val);
    if (placeholder) i.placeholder = placeholder;
    return i;
  }
  function selectInput(name, opts, val, cls) {
    var s = el('select', cls || 'cso-form-select');
    s.name = name; s.id = 'ch_' + name + '_' + Math.random().toString(36).slice(2, 6);
    opts.forEach(function (o) {
      var op = el('option', '', Array.isArray(o) ? o[1] : o);
      op.value = Array.isArray(o) ? o[0] : o;
      if (op.value === String(val || '')) op.selected = true;
      s.appendChild(op);
    });
    return s;
  }
  function switchInput(name, label, checked) {
    var w = el('label', 'ch-switch');
    var c = el('input'); c.type = 'checkbox'; c.name = name; c.checked = Boolean(checked);
    w.appendChild(c); w.appendChild(el('span', '', label));
    return { wrap: w, input: c };
  }

  function buildR2Picker(onSelect) {
    var wrap = el('div', '');
    var list = el('div', 'ch-r2-picker');
    list.hidden = true;
    var trigger = btn('Pick from R2 Media Library', 'ch-btn ch-btn--xs', function () {
      if (!list.hidden) { list.hidden = true; return; }
      list.hidden = false;
      clear(list).appendChild(el('span', 'ch-muted', 'Loading R2 files…'));
      api('/api/admin/media-library').then(function (d) {
        clear(list);
        var files = d.items || [];
        if (!files.length) { list.appendChild(el('span', 'ch-muted', 'No files in R2 Media Library yet. Use topbar Media button to upload.')); return; }
        files.slice(0, 25).forEach(function (f) {
          var row = el('div', 'ch-r2-row');
          row.appendChild(el('span', '', f.name + ' (' + f.category + ')'));
          row.appendChild(btn('Attach', 'ch-btn ch-btn--xs is-primary', function () {
            onSelect(f);
            list.hidden = true;
            toast('Attached ' + f.name, 'ok');
          }));
          list.appendChild(row);
        });
      }).catch(function (e) { clear(list).appendChild(el('span', 'ch-error', e.message)); });
    });
    wrap.appendChild(trigger); wrap.appendChild(list);
    return wrap;
  }

  function formatBytes(n) {
    n = Number(n || 0);
    if (!n) return '0 B';
    if (n < 1024) return n + ' B';
    if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1048576).toFixed(2) + ' MB';
  }

  function uploadAndPushWithProgress(formData, onProgress) {
    return new Promise(function (resolve, reject) {
      if (typeof window.XMLHttpRequest === 'function') {
        var xhr = new window.XMLHttpRequest();
        xhr.open('POST', '/api/admin/candidate-hub/upload-and-push', true);
        xhr.withCredentials = true;
        xhr.setRequestHeader('X-CSO-CSRF', '1');
        if (xhr.upload && typeof onProgress === 'function') {
          xhr.upload.onprogress = function (ev) {
            if (ev.lengthComputable && ev.total > 0) {
              onProgress(Math.round((ev.loaded / ev.total) * 100));
            }
          };
        }
        xhr.onload = function () {
          var data = {};
          try { data = JSON.parse(xhr.responseText || '{}'); } catch (_) {}
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error((data && data.error) || ('HTTP ' + xhr.status)));
        };
        xhr.onerror = function () { reject(new Error('Network error during upload')); };
        xhr.send(formData);
      } else {
        fetch('/api/admin/candidate-hub/upload-and-push', {
          method: 'POST', credentials: 'same-origin', headers: { 'X-CSO-CSRF': '1' }, body: formData
        }).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (d) {
            if (!r.ok) throw new Error((d && d.error) || ('HTTP ' + r.status));
            resolve(d);
          });
        }).catch(reject);
      }
    });
  }

  /**
   * Reusable One-Step Direct File Upload & Instant Push Widget (v246).
   * Used in Tab 4 (Provide Content & Push), 360° Candidate Authority Drawer, and Bulk Assign Modal.
   */
  function buildDirectUploadPushWidget(opts) {
    opts = opts || {};
    var box = el('div', '');
    var selectedFile = null;
    var form = el('form'); form.noValidate = true;

    // Drag-and-drop zone
    var drop = el('label', 'ch-dropzone');
    var fileIn = el('input', 'ch-dropzone__input');
    fileIn.type = 'file';
    fileIn.accept = '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.txt,.mp3,.zip';
    var dropTitle = el('span', 'ch-dropzone__title', 'Drop PDF, Image, Doc, Audio or ZIP here — or click to browse');
    var dropMeta = el('div', 'ch-dropzone__meta');
    dropMeta.appendChild(el('span', 'ch-muted', 'Uploads directly to R2 (cso-media) & pushes to Candidate Dashboard in 1 click (max 25 MB)'));
    drop.appendChild(fileIn); drop.appendChild(dropTitle); drop.appendChild(dropMeta);

    var prog = el('progress', 'ch-progress');
    prog.max = 100; prog.value = 0; prog.hidden = true;
    var progText = el('div', 'ch-muted ch-num'); progText.hidden = true;

    var grid = el('div', 'ch-form-grid');
    var scopeSel = null; var userIn = null; var distSel = null; var boardSel = null;
    if (!opts.fixedScope) {
      scopeSel = selectInput('target_scope', [
        ['all', 'All Candidates'],
        ['individual', 'Specific Candidate (User ID)'],
        ['selected_users', 'Selected Candidates (' + (opts.selectedIds ? opts.selectedIds.length : 0) + ')'],
        ['district', 'Odisha District (30 Districts)'],
        ['exam_board', 'Exam Board']
      ], opts.target_scope || 'all');
      userIn = textInput('target_user_id', opts.target_user_id || '', 'Candidate User ID');
      distSel = selectInput('target_district', [['', 'Select Odisha District']].concat(ODISHA_30_DISTRICTS.map(function (d) { return [d, d]; })), opts.target_district || '');
      boardSel = selectInput('target_exam_board', [['', 'Select Exam Board']].concat(EXAM_BOARDS.map(function (b) { return [b, b]; })), opts.target_exam_board || '');
    }

    var typeSel = selectInput('item_type', ITEM_TYPES, opts.item_type || 'study_pack');
    var priSel = selectInput('priority', [['normal', 'Normal'], ['high', 'High'], ['urgent', 'Urgent']], opts.priority || 'high');
    var tEn = textInput('title_en', opts.title_en || '', 'Title (EN) — auto-filled from filename if blank');
    var tOr = textInput('title_or', opts.title_or || '', 'Title (ଓଡ଼ିଆ)');
    var sEn = textInput('summary_en', opts.summary_en || '', 'Summary / Instructions (EN)');
    var sOr = textInput('summary_or', opts.summary_or || '', 'Summary / Instructions (ଓଡ଼ିଆ)');
    var rUrl = textInput('resource_url', opts.resource_url || '', '/api/media/... or https://... (if not uploading a file)');
    var r2In = textInput('r2_file_key', opts.r2_file_key || '', 'R2 key (auto-filled on upload)');
    var expIn = textInput('expires_at', opts.expires_at || '', 'YYYY-MM-DD', 'date');
    var pubSw = switchInput('is_published', 'Publish immediately to Candidate Dashboard', opts.is_published !== 0);

    function applyFile(file) {
      if (!file) return;
      selectedFile = file;
      clear(dropMeta);
      var ext = (file.name.split('.').pop() || 'FILE').toUpperCase();
      dropTitle.textContent = 'Ready to upload: ' + file.name;
      dropMeta.appendChild(el('span', 'ch-badge ch-badge--active', ext));
      dropMeta.appendChild(el('span', 'ch-badge', formatBytes(file.size)));
      if (!tEn.value.trim()) {
        tEn.value = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
      }
    }

    fileIn.addEventListener('change', function () { if (fileIn.files && fileIn.files[0]) applyFile(fileIn.files[0]); });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('is-dragover'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('is-dragover'); });
    drop.addEventListener('drop', function (e) {
      e.preventDefault(); drop.classList.remove('is-dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) applyFile(e.dataTransfer.files[0]);
    });

    if (!opts.fixedScope) {
      grid.appendChild(fieldGroup('Target Audience', scopeSel));
      grid.appendChild(fieldGroup('Content Type', typeSel));
      grid.appendChild(fieldGroup('Candidate User ID', userIn));
      grid.appendChild(fieldGroup('Odisha District', distSel));
      grid.appendChild(fieldGroup('Exam Board', boardSel));
      grid.appendChild(fieldGroup('Priority', priSel));
    } else {
      grid.appendChild(fieldGroup('Content Type', typeSel));
      grid.appendChild(fieldGroup('Priority', priSel));
    }
    grid.appendChild(fieldGroup('Title (EN)', tEn, true));
    grid.appendChild(fieldGroup('Title (ଓଡ଼ିଆ)', tOr, true));
    grid.appendChild(fieldGroup('Summary (EN)', sEn, true));
    grid.appendChild(fieldGroup('Summary (ଓଡ଼ିଆ)', sOr, true));
    grid.appendChild(fieldGroup('Existing / External URL (optional)', rUrl, true));
    grid.appendChild(fieldGroup('R2 Key', r2In));
    grid.appendChild(fieldGroup('Expires On (optional)', expIn));

    form.appendChild(drop);
    form.appendChild(prog);
    form.appendChild(progText);
    form.appendChild(grid);
    form.appendChild(buildR2Picker(function (f) { rUrl.value = f.url; r2In.value = f.id; }));
    form.appendChild(pubSw.wrap);

    var acts = el('div', 'ch-form-actions');
    var submitBtn = el('button', 'ch-btn is-primary', 'Upload to R2 & Push Live');
    submitBtn.type = 'submit';
    acts.appendChild(submitBtn);
    form.appendChild(acts);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!selectedFile && !tEn.value.trim()) {
        toast('Select a file or enter a Title (EN)', 'crimson');
        return;
      }
      var fd = new window.FormData();
      if (selectedFile) fd.append('file', selectedFile);
      var effScope = opts.fixedScope || (scopeSel ? scopeSel.value : 'all');
      fd.append('target_scope', effScope);
      if (opts.fixedScope === 'individual' || opts.fixedScope === 'user') fd.append('target_user_id', opts.target_user_id || '');
      else if (userIn) fd.append('target_user_id', userIn.value.trim());
      if (effScope === 'selected_users') fd.append('target_user_ids', JSON.stringify(opts.selectedIds || []));
      if (distSel) fd.append('target_district', distSel.value);
      if (boardSel) fd.append('target_exam_board', boardSel.value);
      fd.append('item_type', typeSel.value);
      fd.append('priority', priSel.value);
      fd.append('title_en', tEn.value.trim());
      fd.append('title_or', tOr.value.trim());
      fd.append('summary_en', sEn.value.trim());
      fd.append('summary_or', sOr.value.trim());
      fd.append('resource_url', rUrl.value.trim());
      fd.append('r2_file_key', r2In.value.trim());
      fd.append('expires_at', expIn.value);
      fd.append('is_published', pubSw.input.checked ? '1' : '0');

      submitBtn.disabled = true;
      prog.hidden = !selectedFile;
      progText.hidden = false;
      progText.textContent = selectedFile ? 'Uploading to R2 & publishing… 0%' : 'Publishing to Candidate Dashboard…';
      uploadAndPushWithProgress(fd, function (pct) {
        prog.value = pct;
        progText.textContent = 'Uploading to R2… ' + pct + '%';
      }).then(function (res) {
        submitBtn.disabled = false;
        prog.value = 100;
        progText.textContent = 'Pushed live (' + (res.pushed_count || 1) + ' target)';
        toast('Uploaded & pushed to Candidate Dashboard', 'ok');
        selectedFile = null;
        if (typeof opts.onDone === 'function') opts.onDone(res);
      }).catch(function (err) {
        submitBtn.disabled = false;
        prog.hidden = true;
        progText.textContent = 'Error: ' + err.message;
        toast(err.message, 'crimson');
      });
    });

    box.appendChild(form);
    return box;
  }

  // =========================================================================
  // TAB 1: CANDIDATES ROSTER & GOVERNANCE + 360° AUTHORITY DRAWER
  // =========================================================================
  function loadRoster() {
    var r = state.roster;
    var qs = '?limit=50'
      + (r.q ? '&q=' + encodeURIComponent(r.q) : '')
      + (r.status ? '&status=' + encodeURIComponent(r.status) : '')
      + (r.tier ? '&tier=' + encodeURIComponent(r.tier) : '')
      + (r.district ? '&district=' + encodeURIComponent(r.district) : '')
      + (r.exam ? '&exam=' + encodeURIComponent(r.exam) : '');
    return api('/api/admin/candidates' + qs).then(function (d) {
      r.items = d.items || [];
      r.kpis = d.kpis || null;
      r.total = Number(d.total || 0);
      r.currentActorId = d.current_actor_id || '';
      if (r.kpis) notifyCount(r.total);
    });
  }

  function exportRosterCsv() {
    var items = state.roster.items.filter(function (i) { return !state.roster.selected.size || state.roster.selected.has(i.id); });
    var esc = function (v) { var s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    var lines = ['id,full_name,email,district,qualification,target_exam,access_tier,account_status,bookmarks,docs_pct,mocks,assigned,last_login'].concat(
      items.map(function (c) {
        return [c.id, c.full_name, c.email, c.district, c.qualification, c.target_exam, c.access_tier, c.account_status, c.bookmarks_count, c.docs_pct, c.attempts_count, c.assigned_count, c.last_login_at || ''].map(esc).join(',');
      })
    );
    var blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    var a = el('a'); a.href = URL.createObjectURL(blob); a.download = 'cso-candidates-roster.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
  }

  function runBulkCandidateAction(action) {
    var ids = Array.from(state.roster.selected);
    if (!ids.length) return;
    if (action === 'block') {
      var reason = window.prompt('Block reason shown to candidate(s) (EN / ଓଡ଼ିଆ):', 'Account restricted by CS Odisha Administrator.');
      if (reason === null) return;
      api('/api/admin/candidates/bulk', 'POST', { action: 'block', ids: ids, block_reason: reason })
        .then(function () { toast('Blocked ' + ids.length + ' candidate(s)', 'ok'); state.roster.selected.clear(); loadRoster().then(renderBody); })
        .catch(function (e) { toast(e.message, 'crimson'); });
    } else if (action === 'unblock') {
      api('/api/admin/candidates/bulk', 'POST', { action: 'unblock', ids: ids })
        .then(function () { toast('Unblocked ' + ids.length + ' candidate(s)', 'ok'); state.roster.selected.clear(); loadRoster().then(renderBody); })
        .catch(function (e) { toast(e.message, 'crimson'); });
    } else if (action === 'change_tier') {
      var tier = window.prompt('Enter Access Tier (standard, verified, mentor, vip):', 'verified');
      if (!tier) return;
      api('/api/admin/candidates/bulk', 'POST', { action: 'change_tier', ids: ids, access_tier: tier.trim().toLowerCase() })
        .then(function () { toast('Updated tier for ' + ids.length + ' candidate(s)', 'ok'); state.roster.selected.clear(); loadRoster().then(renderBody); })
        .catch(function (e) { toast(e.message, 'crimson'); });
    } else if (action === 'assign_content') {
      openBulkAssignModal(ids);
    }
  }

  function openBulkAssignModal(ids) {
    var bd = el('div', 'ch-modal-backdrop');
    var modal = el('div', 'ch-modal');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Bulk Direct Upload & Push');
    var mh = el('div', 'ch-drawer__head');
    mh.appendChild(el('h3', 'ch-card__title', 'Direct Upload & Push to ' + ids.length + ' Selected Candidate(s)'));
    var closeFn = function () { bd.remove(); };
    mh.appendChild(btn('×', 'ch-btn', closeFn));
    modal.appendChild(mh);
    modal.appendChild(buildDirectUploadPushWidget({
      fixedScope: 'selected_users',
      selectedIds: ids,
      priority: 'high',
      onDone: function () {
        closeFn();
        state.roster.selected.clear();
        loadRoster().then(renderBody);
      }
    }));
    bd.addEventListener('click', function (e) { if (e.target === bd) closeFn(); });
    bd.appendChild(modal);
    document.body.appendChild(bd);
  }

  function renderRosterTab(container) {
    var r = state.roster;
    var k = r.kpis || { total_candidates: 0, active_candidates: 0, blocked_suspended: 0, verified_mentor: 0, active_features: 0, assigned_items: 0 };
    var kpis = el('div', 'ch-kpis');
    [
      ['Total Candidates', num(r.total), ''],
      ['Active Accounts', num(k.active_candidates), 'is-ok'],
      ['Blocked / Suspended', num(k.blocked_suspended), k.blocked_suspended ? 'is-danger' : ''],
      ['Verified / Mentor Tier', num(k.verified_mentor), 'is-ok'],
      ['Active Hub Features', num(k.active_features), ''],
      ['Assigned Content Items', num(k.assigned_items), '']
    ].forEach(function (item) {
      var c = el('div', 'ch-kpi ' + item[2]);
      c.appendChild(el('span', 'ch-kpi__label', item[0]));
      c.appendChild(el('strong', 'ch-kpi__value', item[1]));
      kpis.appendChild(c);
    });
    container.appendChild(kpis);

    if (window.CSOVisualAnalytics) {
      var VA = window.CSOVisualAnalytics;
      var det = el('details', 'va-collapse');
      det.open = true;
      var sum = el('summary', '');
      sum.appendChild(el('span', '', '📊 Visual Insights & Demographics (Odisha Districts, Exam Tracks, Docs & Engagement)'));
      sum.appendChild(el('span', 'va-muted', 'Click to collapse'));
      det.appendChild(sum);
      var vGrid = el('div', 'va-collapse__grid');
      vGrid.appendChild(el('span', 'va-muted', 'Loading live D1 demographics…'));
      det.appendChild(vGrid);
      container.appendChild(det);

      api('/api/admin/visual-analytics').then(function (va) {
        clear(vGrid);
        var d = va.demographics || {};
        var p1 = el('div', 'va-mini-panel'); p1.appendChild(el('h4', '', 'Top Odisha Districts'));
        p1.appendChild(VA.horizontalBarChart({ rows: (d.districts || []).slice(0, 6), tone: 'cobalt', emptyText: 'No district profiles yet.' }));
        var p2 = el('div', 'va-mini-panel'); p2.appendChild(el('h4', '', 'Target Exam Breakdown'));
        p2.appendChild(VA.horizontalBarChart({ rows: (d.exam_boards || []).slice(0, 6), tone: 'violet', emptyText: 'No exam preferences yet.' }));
        var p3 = el('div', 'va-mini-panel'); p3.appendChild(el('h4', '', 'Document Readiness'));
        p3.appendChild(VA.horizontalBarChart({ rows: d.doc_readiness || [], tone: 'emerald', emptyText: 'No locker data yet.' }));
        var eng = d.assigned_engagement || {};
        var p4 = el('div', 'va-mini-panel'); p4.appendChild(el('h4', '', 'Assigned Content Conversion'));
        p4.appendChild(VA.horizontalBarChart({
          rows: [
            { label: 'Published Pushes', count: eng.published_items || 0 },
            { label: 'Seen by Candidates', count: eng.seen || 0 },
            { label: 'Opened / Downloaded', count: eng.downloaded || 0 },
            { label: 'Marked Completed', count: eng.completed || 0 }
          ],
          tone: 'amber'
        }));
        vGrid.appendChild(p1); vGrid.appendChild(p2); vGrid.appendChild(p3); vGrid.appendChild(p4);
      }).catch(function () {
        clear(vGrid).appendChild(el('span', 'va-muted', 'Demographics chart unavailable.'));
      });
    }

    var card = el('section', 'ch-card');
    var head = el('div', 'ch-card__head');
    head.appendChild(el('h2', 'ch-card__title', 'Master Candidate Roster & Governance'));
    head.appendChild(el('span', 'ch-muted ch-num', num(r.total) + ' registered'));
    card.appendChild(head);

    var filters = el('div', 'ch-filters');
    var qIn = textInput('roster_q', r.q, 'Search name, email, phone, district…', 'search');
    qIn.className = 'cso-form-input ch-search';
    var deb = null;
    qIn.addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(function () { r.q = qIn.value; loadRoster().then(renderBody); }, 300); });
    filters.appendChild(qIn);

    var stSel = selectInput('roster_status', [['', 'All Status'], ['active', 'Active'], ['blocked', 'Blocked'], ['suspended', 'Suspended'], ['pending_review', 'Pending Review']], r.status, 'cso-form-select ch-select');
    stSel.addEventListener('change', function () { r.status = stSel.value; loadRoster().then(renderBody); });
    filters.appendChild(stSel);

    var tierSel = selectInput('roster_tier', [['', 'All Tiers'], ['standard', 'Standard'], ['verified', 'Verified'], ['mentor', 'Mentor'], ['vip', 'VIP']], r.tier, 'cso-form-select ch-select');
    tierSel.addEventListener('change', function () { r.tier = tierSel.value; loadRoster().then(renderBody); });
    filters.appendChild(tierSel);

    var distSel = selectInput('roster_dist', [['', 'All 30 Districts']].concat(ODISHA_30_DISTRICTS.map(function (d) { return [d, d]; })), r.district, 'cso-form-select ch-select');
    distSel.addEventListener('change', function () { r.district = distSel.value; loadRoster().then(renderBody); });
    filters.appendChild(distSel);

    var examSel = selectInput('roster_exam', [['', 'All Target Exams']].concat(EXAM_BOARDS.map(function (e) { return [e, e]; })), r.exam, 'cso-form-select ch-select');
    examSel.addEventListener('change', function () { r.exam = examSel.value; loadRoster().then(renderBody); });
    filters.appendChild(examSel);

    filters.appendChild(btn('Export CSV', 'ch-btn', exportRosterCsv));
    card.appendChild(filters);

    var wrap = el('div', 'ch-table-wrap');
    if (!r.items.length) {
      wrap.appendChild(el('p', 'ch-muted', 'No candidates match the current filters.'));
    } else {
      var tbl = el('table', 'ch-table');
      var thead = el('thead');
      var htr = el('tr');
      var allCb = el('input'); allCb.type = 'checkbox'; allCb.setAttribute('aria-label', 'Select all candidates');
      allCb.checked = r.items.length > 0 && r.items.every(function (i) { return r.selected.has(i.id); });
      allCb.addEventListener('change', function () {
        r.items.forEach(function (i) { if (allCb.checked) r.selected.add(i.id); else r.selected.delete(i.id); });
        renderBody();
      });
      var th0 = el('th'); th0.appendChild(allCb); htr.appendChild(th0);
      ['Candidate', 'District & Qual.', 'Target Exam', 'Tier', 'Status', 'Workspace Activity', 'Last Active', 'Actions'].forEach(function (h) { htr.appendChild(el('th', '', h)); });
      thead.appendChild(htr); tbl.appendChild(thead);

      var tbody = el('tbody');
      r.items.forEach(function (c) {
        var tr = el('tr', r.selected.has(c.id) ? 'is-selected' : '');
        var td0 = el('td');
        var cb = el('input'); cb.type = 'checkbox'; cb.checked = r.selected.has(c.id); cb.setAttribute('aria-label', 'Select ' + c.email);
        cb.addEventListener('change', function () { if (cb.checked) r.selected.add(c.id); else r.selected.delete(c.id); renderBody(); });
        td0.appendChild(cb); tr.appendChild(td0);

        var tdP = el('td');
        var pBox = el('div', 'ch-person');
        pBox.appendChild(el('span', 'ch-avatar', initials(c.full_name, c.email)));
        var pm = el('div', 'ch-person__meta');
        var nameRow = el('div', 'ch-person__row');
        var nm = el('button', 'ch-person__name', c.full_name); nm.type = 'button';
        nm.addEventListener('click', function () { openAuthorityDrawer(c.id); });
        nameRow.appendChild(nm);
        if (c.role === 'admin' || c.role === 'editor') {
          var admBadge = el('span', 'ch-badge ch-badge--admin', 'ADMIN');
          admBadge.title = 'Staff / Administrator account (' + c.role + ')';
          nameRow.appendChild(admBadge);
        }
        pm.appendChild(nameRow);
        pm.appendChild(el('span', 'ch-muted', c.email));
        pBox.appendChild(pm); tdP.appendChild(pBox); tr.appendChild(tdP);

        var tdDist = el('td');
        tdDist.appendChild(el('div', 'ch-dist-main', normalizeDistrict(c.district) || '—'));
        var qualCat = [c.qualification, c.category].filter(Boolean).join(' · ');
        tdDist.appendChild(el('div', 'ch-muted', qualCat || '—'));
        tr.appendChild(tdDist);

        tr.appendChild(el('td', '', formatExamLabel(c.target_exam) || '—'));

        var tdT = el('td'); tdT.appendChild(el('span', 'ch-badge ch-badge--' + c.access_tier, c.access_tier)); tr.appendChild(tdT);
        var tdS = el('td'); tdS.appendChild(el('span', 'ch-badge ch-badge--' + c.account_status, c.account_status.replace(/_/g, ' '))); tr.appendChild(tdS);

        var tdA = el('td');
        var act = el('div', 'ch-activity');
        var pSaved = el('span', 'ch-activity-pill', '🔖 Saved: ' + c.bookmarks_count);
        pSaved.title = 'Saved Bookmarks & Deadlines: ' + c.bookmarks_count;
        var pDocs = el('span', 'ch-activity-pill', '🗂 Docs: ' + c.docs_pct + '%');
        pDocs.title = 'Document Readiness Vault: ' + c.docs_pct + '%';
        var pMocks = el('span', 'ch-activity-pill', '📈 Mocks: ' + c.attempts_count);
        pMocks.title = 'Mock Test Attempts: ' + c.attempts_count;
        var pAssigned = el('span', 'ch-activity-pill', '📬 Assigned: ' + c.assigned_count);
        pAssigned.title = 'Assigned Content Items: ' + c.assigned_count;
        act.appendChild(pSaved); act.appendChild(pDocs); act.appendChild(pMocks); act.appendChild(pAssigned);
        tdA.appendChild(act); tr.appendChild(tdA);

        tr.appendChild(el('td', 'ch-muted ch-num', when(c.last_login_at || c.created_at)));

        var tdAct = el('td');
        var rowActs = el('div', 'ch-row-actions');
        rowActs.appendChild(btn('Manage', 'ch-btn ch-btn--xs is-primary', function () { openAuthorityDrawer(c.id); }));
        var isSelf = Boolean(c.is_self || (r.currentActorId && c.id === r.currentActorId));
        var isBlocked = c.account_status === 'blocked' || c.account_status === 'suspended';
        var blkBtn = btn(isBlocked ? 'Unblock' : 'Block', 'ch-btn ch-btn--xs' + (isBlocked ? '' : ' is-danger'), function () {
          if (isBlocked) {
            api('/api/admin/candidates/' + encodeURIComponent(c.id), 'POST', { action: 'unblock' })
              .then(function () { toast('Candidate unblocked', 'ok'); loadRoster().then(renderBody); })
              .catch(function (e) { toast(e.message, 'crimson'); });
          } else {
            var reason = window.prompt('Block reason for ' + c.email + ':', 'Account suspended by administrator.');
            if (reason === null) return;
            api('/api/admin/candidates/' + encodeURIComponent(c.id), 'POST', { action: 'block', block_reason: reason })
              .then(function () { toast('Candidate blocked & sessions revoked', 'ok'); loadRoster().then(renderBody); })
              .catch(function (e) { toast(e.message, 'crimson'); });
          }
        });
        if (isSelf) {
          blkBtn.disabled = true;
          blkBtn.title = 'Self-lockout protection: cannot block your own active admin account';
        }
        rowActs.appendChild(blkBtn);
        rowActs.appendChild(btn('Send Content', 'ch-btn ch-btn--xs', function () {
          state.editingAssigned = { target_scope: 'user', target_user_id: c.id, item_type: 'study_pdf', priority: 'high', is_published: 1 };
          state.tab = 'content';
          renderShell();
        }));
        var loBtn = btn('Force Logout', 'ch-btn ch-btn--xs', function () {
          if (!window.confirm('Force logout ' + c.email + ' from all devices?')) return;
          api('/api/admin/candidates/' + encodeURIComponent(c.id), 'POST', { action: 'force_logout' })
            .then(function () { toast('Active sessions revoked (session_version incremented)', 'ok'); loadRoster().then(renderBody); })
            .catch(function (e) { toast(e.message, 'crimson'); });
        });
        if (isSelf) {
          loBtn.disabled = true;
          loBtn.title = 'Self-lockout protection: cannot force-logout your own active admin session';
        }
        rowActs.appendChild(loBtn);
        tdAct.appendChild(rowActs); tr.appendChild(tdAct);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
    }
    card.appendChild(wrap);

    var n = r.selected.size;
    var bulk = el('div', 'ch-bulkbar' + (n ? ' is-active' : ''));
    bulk.appendChild(el('strong', 'ch-num', n + ' selected'));
    [
      ['Bulk Block', 'block', 'is-danger'],
      ['Bulk Unblock', 'unblock', ''],
      ['Bulk Assign Content', 'assign_content', 'is-primary'],
      ['Bulk Change Tier', 'change_tier', '']
    ].forEach(function (a) {
      var b = btn(a[0], 'ch-btn ' + a[2], function () { runBulkCandidateAction(a[1]); });
      b.disabled = !n;
      b.setAttribute('aria-disabled', String(!n));
      bulk.appendChild(b);
    });
    card.appendChild(bulk);
    container.appendChild(card);
  }

  // --- 360° Candidate Authority & Task Drawer ---
  function ensureDrawerDom() {
    if (state.refs.drawer) return;
    var bd = el('div', 'ch-drawer-backdrop'); bd.hidden = true;
    bd.addEventListener('click', closeAuthorityDrawer);
    var dr = el('aside', 'ch-drawer'); dr.hidden = true;
    dr.setAttribute('aria-label', '360° Candidate Authority Drawer');
    document.body.appendChild(bd); document.body.appendChild(dr);
    state.refs.drawerBg = bd; state.refs.drawer = dr;
  }
  function closeAuthorityDrawer() {
    state.drawer.open = false;
    if (state.refs.drawer) state.refs.drawer.hidden = true;
    if (state.refs.drawerBg) state.refs.drawerBg.hidden = true;
  }
  function openAuthorityDrawer(userId) {
    ensureDrawerDom();
    state.drawer.open = true; state.drawer.userId = userId;
    state.refs.drawerBg.hidden = false; state.refs.drawer.hidden = false;
    clear(state.refs.drawer).appendChild(el('p', 'ch-muted', 'Loading 360° candidate profile…'));
    api('/api/admin/candidates/' + encodeURIComponent(userId)).then(function (d) {
      state.drawer.data = d;
      renderAuthorityDrawer();
    }).catch(function (e) { clear(state.refs.drawer).appendChild(el('p', 'ch-error', e.message)); });
  }
  function renderAuthorityDrawer() {
    var dr = clear(state.refs.drawer);
    var d = state.drawer.data;
    if (!d) return;
    var c = d.candidate; var g = d.governance;

    var head = el('div', 'ch-drawer__head');
    var ttl = el('div');
    ttl.appendChild(el('h3', 'ch-card__title', c.full_name));
    ttl.appendChild(el('div', 'ch-muted', c.email + ' · ' + (c.district || 'No district') + ' · SV #' + g.session_version));
    head.appendChild(ttl);
    head.appendChild(btn('×', 'ch-btn', closeAuthorityDrawer));
    dr.appendChild(head);

    // Governance & Access Control Form
    var govSec = el('div', 'ch-drawer__section');
    govSec.appendChild(el('h4', '', 'Account Governance, Status & Access Tier'));
    var stSel = selectInput('gov_status', [['active', 'Active'], ['blocked', 'Blocked'], ['suspended', 'Suspended'], ['pending_review', 'Pending Review']], g.account_status);
    var tierSel = selectInput('gov_tier', [['standard', 'Standard'], ['verified', 'Verified'], ['mentor', 'Mentor'], ['vip', 'VIP']], g.access_tier);
    var reasonIn = textInput('gov_reason', g.block_reason, 'Bilingual block/suspension reason (EN / ଓଡ଼ିଆ)');
    var notesIn = textInput('gov_notes', g.admin_notes, 'Internal admin notes');
    var gGrid = el('div', 'ch-form-grid');
    gGrid.appendChild(fieldGroup('Account Status', stSel));
    gGrid.appendChild(fieldGroup('Access Tier', tierSel));
    gGrid.appendChild(fieldGroup('Block / Restriction Reason (EN / ଓଡ଼ିଆ)', reasonIn, true));
    gGrid.appendChild(fieldGroup('Internal Admin Notes', notesIn, true));
    govSec.appendChild(gGrid);

    govSec.appendChild(el('span', 'cso-form-label', 'Per-Candidate Module Overrides (granted_modules_json)'));
    var modBox = el('div', 'ch-mod-toggles');
    var granted = Object.assign({}, g.granted_modules || {});
    (d.modules || []).forEach(function (m) {
      var checked = Object.prototype.hasOwnProperty.call(granted, m.module_key) ? Boolean(granted[m.module_key]) : Boolean(m.is_enabled);
      var sw = switchInput('mod_' + m.module_key, m.icon + ' ' + m.title_en, checked);
      sw.input.addEventListener('change', function () { granted[m.module_key] = sw.input.checked; });
      modBox.appendChild(sw.wrap);
    });
    govSec.appendChild(modBox);

    var gActs = el('div', 'ch-form-actions');
    gActs.appendChild(btn('Save Governance', 'ch-btn is-primary', function () {
      api('/api/admin/candidates/' + encodeURIComponent(c.id), 'POST', {
        action: 'update_governance',
        account_status: stSel.value,
        access_tier: tierSel.value,
        block_reason: reasonIn.value,
        admin_notes: notesIn.value,
        granted_modules: granted
      }).then(function () {
        toast('Candidate governance updated', 'ok');
        openAuthorityDrawer(c.id);
        loadRoster().then(renderBody);
      }).catch(function (e) { toast(e.message, 'crimson'); });
    }));
    var drLogout = btn('Force Logout (Revoke Sessions)', 'ch-btn is-danger', function () {
      api('/api/admin/candidates/' + encodeURIComponent(c.id), 'POST', { action: 'force_logout' })
        .then(function () { toast('Sessions revoked (SV incremented)', 'ok'); openAuthorityDrawer(c.id); })
        .catch(function (e) { toast(e.message, 'crimson'); });
    });
    if (c.is_self || (state.roster.currentActorId && c.id === state.roster.currentActorId)) {
      drLogout.disabled = true;
      drLogout.title = 'Self-lockout protection: cannot force-logout your own active admin session';
    }
    gActs.appendChild(drLogout);
    govSec.appendChild(gActs);
    dr.appendChild(govSec);

    // Direct File Upload & Instant Push for this Candidate (v246)
    var pushSec = el('div', 'ch-drawer__section');
    pushSec.appendChild(el('h4', '', 'Direct Upload & Push to ' + c.full_name));
    pushSec.appendChild(buildDirectUploadPushWidget({
      fixedScope: 'individual',
      target_user_id: c.id,
      priority: 'high',
      onDone: function () { openAuthorityDrawer(c.id); }
    }));
    dr.appendChild(pushSec);

    // Workspace Inspection & Reset
    var ws = d.workspace || {};
    var wsSec = el('div', 'ch-drawer__section');
    wsSec.appendChild(el('h4', '', 'Workspace Inspection & Reset'));
    wsSec.appendChild(el('div', 'ch-muted ch-num',
      'Bookmarks: ' + (ws.bookmarks ? ws.bookmarks.length : 0)
      + ' · Locker Docs Checked: ' + Object.values(ws.locker || {}).filter(Boolean).length
      + ' · Mock Scores: ' + (ws.mock_scores ? ws.mock_scores.length : 0)
      + ' · Notes: ' + (ws.notes_length || 0) + ' chars'
      + ' · Direct Assigned: ' + (ws.assigned_items ? ws.assigned_items.length : 0)));
    var wsActs = el('div', 'ch-form-actions');
    [['Reset Bookmarks', 'bookmarks'], ['Reset Locker', 'locker'], ['Reset Notes', 'notes'], ['Reset CBT', 'cbt'], ['Reset All Workspace', 'all']].forEach(function (a) {
      wsActs.appendChild(btn(a[0], 'ch-btn ch-btn--xs' + (a[1] === 'all' ? ' is-danger' : ''), function () {
        if (!window.confirm('Confirm ' + a[0] + ' for ' + c.email + '?')) return;
        api('/api/admin/candidates/' + encodeURIComponent(c.id), 'POST', { action: 'reset_workspace', scope: a[1] })
          .then(function () { toast(a[0] + ' complete', 'ok'); openAuthorityDrawer(c.id); })
          .catch(function (e) { toast(e.message, 'crimson'); });
      }));
    });
    wsSec.appendChild(wsActs);
    dr.appendChild(wsSec);
  }

  // =========================================================================
  // TAB 2: DASHBOARD UI MANAGER & 4-THEME LIVE PREVIEW
  // =========================================================================
  function renderUiManagerTab(container) {
    if (!state.ui) {
      container.appendChild(el('p', 'ch-muted', 'Loading Dashboard UI configuration…'));
      api('/api/admin/candidate-hub/ui-config').then(function (d) { state.ui = d.ui_config; renderBody(); })
        .catch(function (e) { toast(e.message, 'crimson'); });
      return;
    }
    var u = state.ui;
    var split = el('div', 'ch-split');

    var left = el('section', 'ch-card');
    left.appendChild(el('h2', 'ch-card__title', 'Candidate Dashboard UI Shell & Layout'));
    var form = el('form'); form.noValidate = true;
    var grid = el('div', 'ch-form-grid');

    var heroEn = textInput('hero_title_en', u.hero_title_en, 'Candidate Workspace');
    var heroOr = textInput('hero_title_or', u.hero_title_or, 'ପ୍ରାର୍ଥୀ କାର୍ଯ୍ୟକ୍ଷେତ୍ର');
    var subEn = textInput('hero_subtitle_en', u.hero_subtitle_en, 'Subtitle (EN)');
    var subOr = textInput('hero_subtitle_or', u.hero_subtitle_or, 'Subtitle (ଓଡ଼ିଆ)');
    var annEn = textInput('announcement_banner_en', u.announcement_banner_en, 'Top announcement banner (EN)');
    var annOr = textInput('announcement_banner_or', u.announcement_banner_or, 'Top announcement banner (ଓଡ଼ିଆ)');
    var annType = selectInput('announcement_type', [['info', 'Info'], ['success', 'Success'], ['warning', 'Warning']], u.announcement_type);
    var layoutSel = selectInput('layout_mode', [['sidebar_workspace', 'Sidebar + Workspace'], ['top_tabs_cards', 'Top Tabs + Cards']], u.layout_mode);
    var colsSel = selectInput('grid_columns', [['1', '1 Column'], ['2', '2 Columns'], ['3', '3 Columns']], String(u.grid_columns));
    var themeSel = selectInput('default_theme', [['system', 'System'], ['dark', 'Dark Night'], ['reading', 'Reading Mode'], ['utkal-bharat', 'Odisha & Bharat']], u.default_theme);
    var empEn = textInput('custom_empty_title_en', u.custom_empty_title_en, 'Empty state message (EN)');
    var empOr = textInput('custom_empty_title_or', u.custom_empty_title_or, 'Empty state message (ଓଡ଼ିଆ)');

    var showAnn = switchInput('show_announcement', 'Show Top Announcement Strip', u.show_announcement);
    var showStats = switchInput('show_quick_stats', 'Show Quick Stats Bar', u.show_quick_stats);
    var showSide = switchInput('show_sidebar', 'Show Left Sidebar Navigation', u.show_sidebar);
    var allowTheme = switchInput('allow_theme_switch', 'Allow Candidate Theme Switch', u.allow_theme_switch);

    grid.appendChild(fieldGroup('Hero Title (EN)', heroEn));
    grid.appendChild(fieldGroup('Hero Title (ଓଡ଼ିଆ)', heroOr));
    grid.appendChild(fieldGroup('Hero Subtitle (EN)', subEn, true));
    grid.appendChild(fieldGroup('Hero Subtitle (ଓଡ଼ିଆ)', subOr, true));
    grid.appendChild(fieldGroup('Announcement Strip (EN)', annEn, true));
    grid.appendChild(fieldGroup('Announcement Strip (ଓଡ଼ିଆ)', annOr, true));
    grid.appendChild(fieldGroup('Announcement Severity', annType));
    grid.appendChild(fieldGroup('Layout Mode', layoutSel));
    grid.appendChild(fieldGroup('Grid Columns', colsSel));
    grid.appendChild(fieldGroup('Default Theme', themeSel));
    grid.appendChild(fieldGroup('Empty State (EN)', empEn, true));
    grid.appendChild(fieldGroup('Empty State (ଓଡ଼ିଆ)', empOr, true));
    form.appendChild(grid);

    var swRow = el('div', 'ch-filters');
    swRow.appendChild(showAnn.wrap); swRow.appendChild(showStats.wrap);
    swRow.appendChild(showSide.wrap); swRow.appendChild(allowTheme.wrap);
    form.appendChild(swRow);

    var pvHost = el('div');
    function collectUi() {
      return {
        hero_title_en: heroEn.value, hero_title_or: heroOr.value,
        hero_subtitle_en: subEn.value, hero_subtitle_or: subOr.value,
        announcement_banner_en: annEn.value, announcement_banner_or: annOr.value,
        announcement_type: annType.value, show_announcement: showAnn.input.checked ? 1 : 0,
        layout_mode: layoutSel.value, grid_columns: Number(colsSel.value || 2),
        default_theme: themeSel.value, allow_theme_switch: allowTheme.input.checked ? 1 : 0,
        show_quick_stats: showStats.input.checked ? 1 : 0, show_sidebar: showSide.input.checked ? 1 : 0,
        custom_empty_title_en: empEn.value, custom_empty_title_or: empOr.value
      };
    }

    function drawUiPreview() {
      clear(pvHost);
      var cfg = collectUi();
      var lang = state.uiPreviewLang;
      var langBar = el('div', 'ch-filters');
      ['en', 'or'].forEach(function (code) {
        langBar.appendChild(btn(code === 'en' ? 'EN Preview' : 'ଓଡ଼ିଆ Preview', 'ch-btn ch-btn--xs' + (lang === code ? ' is-primary' : ''), function () {
          state.uiPreviewLang = code; drawUiPreview();
        }));
      });
      pvHost.appendChild(langBar);

      var pGrid = el('div', 'ch-pv-grid');
      THEMES.forEach(function (t) {
        var tile = el('div', 'ch-pv ch-pv--' + t.id);
        tile.appendChild(el('div', 'ch-pv__label', t.label + (cfg.default_theme === t.id ? ' · Default' : '')));
        var hero = el('div', 'ch-pv__hero');
        hero.appendChild(el('strong', '', (lang === 'or' && cfg.hero_title_or) ? cfg.hero_title_or : cfg.hero_title_en));
        hero.appendChild(el('span', '', (lang === 'or' && cfg.hero_subtitle_or) ? cfg.hero_subtitle_or : cfg.hero_subtitle_en));
        tile.appendChild(hero);
        if (cfg.show_announcement) {
          var bText = (lang === 'or' && cfg.announcement_banner_or) ? cfg.announcement_banner_or : (cfg.announcement_banner_en || 'Live announcement strip preview');
          tile.appendChild(el('div', 'ch-pv__banner', '[' + cfg.announcement_type.toUpperCase() + '] ' + bText));
        }
        var cards = el('div', 'ch-pv__cards ch-pv__cards--' + cfg.grid_columns);
        ['Assigned For You', 'Eligibility Matcher', 'Document Vault'].slice(0, Math.max(2, cfg.grid_columns)).forEach(function (nm) {
          cards.appendChild(el('div', 'ch-pv__card', nm));
        });
        tile.appendChild(cards);
        pGrid.appendChild(tile);
      });
      pvHost.appendChild(pGrid);
    }

    form.addEventListener('input', drawUiPreview);
    form.addEventListener('change', drawUiPreview);
    var actions = el('div', 'ch-form-actions');
    var saveBtn = el('button', 'ch-btn is-primary', 'Save & Publish Dashboard UI'); saveBtn.type = 'submit';
    actions.appendChild(saveBtn);
    form.appendChild(actions);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      api('/api/admin/candidate-hub/ui-config', 'PUT', collectUi()).then(function (d) {
        state.ui = d.ui_config;
        toast('Candidate Dashboard UI saved & published live', 'ok');
        drawUiPreview();
      }).catch(function (e2) { toast(e2.message, 'crimson'); });
    });
    left.appendChild(form);

    var right = el('section', 'ch-card');
    right.appendChild(el('h2', 'ch-card__title', '4-Theme Live UI Preview'));
    right.appendChild(pvHost);
    drawUiPreview();

    split.appendChild(left); split.appendChild(right);
    container.appendChild(split);
  }

  // =========================================================================
  // TAB 3: ADD & MANAGE FEATURES (FEATURE BUILDER)
  // =========================================================================
  function loadModules() {
    return api('/api/admin/candidate-hub/modules').then(function (d) { state.modules = d.items || []; });
  }

  function renderFeaturesTab(container) {
    var split = el('div', 'ch-split');
    var listCard = el('section', 'ch-card');
    var lh = el('div', 'ch-card__head');
    lh.appendChild(el('h2', 'ch-card__title', 'Core & Custom Candidate Hub Features'));
    lh.appendChild(btn('+ Add New Candidate Feature', 'ch-btn is-primary', function () {
      state.editingModule = { module_type: 'custom_tool', layout_slot: 'both', card_span: 'half', accent_variant: 'primary', required_access_tier: 'standard', icon: '✨', is_enabled: 1, config: {} };
      renderBody();
    }));
    listCard.appendChild(lh);

    var wrap = el('div', 'ch-table-wrap');
    var tbl = el('table', 'ch-table');
    var thead = el('thead'); var htr = el('tr');
    ['Feature', 'Type & Slot', 'Tier', 'Status', 'Order & Actions'].forEach(function (h) { htr.appendChild(el('th', '', h)); });
    thead.appendChild(htr); tbl.appendChild(thead);
    var tbody = el('tbody');
    state.modules.forEach(function (m, idx) {
      var tr = el('tr');
      var td1 = el('td');
      td1.appendChild(el('strong', '', (m.icon || '') + ' ' + m.title_en));
      if (m.title_or) td1.appendChild(el('div', 'ch-muted', m.title_or));
      tr.appendChild(td1);
      tr.appendChild(el('td', 'ch-muted', m.module_type.replace(/_/g, ' ') + ' · ' + m.layout_slot + ' (' + m.card_span + ')'));
      var tdT = el('td'); tdT.appendChild(el('span', 'ch-badge ch-badge--' + m.required_access_tier, m.required_access_tier)); tr.appendChild(tdT);
      var tdS = el('td');
      var sw = switchInput('en_' + m.id, m.is_enabled ? 'Enabled' : 'Disabled', m.is_enabled);
      sw.input.addEventListener('change', function () {
        api('/api/admin/candidate-hub/modules/' + encodeURIComponent(m.id) + '/toggle', 'POST', {})
          .then(function () { toast('Feature visibility updated', 'ok'); loadModules().then(renderBody); })
          .catch(function (e) { toast(e.message, 'crimson'); });
      });
      tdS.appendChild(sw.wrap); tr.appendChild(tdS);

      var tdA = el('td');
      var acts = el('div', 'ch-row-actions');
      var up = btn('↑', 'ch-btn ch-btn--xs', function () {
        api('/api/admin/candidate-hub/modules/' + encodeURIComponent(m.id) + '/move', 'POST', { direction: 'up' })
          .then(function (d) { state.modules = d.items; renderBody(); }).catch(function (e) { toast(e.message, 'crimson'); });
      });
      if (idx === 0) up.disabled = true;
      var dn = btn('↓', 'ch-btn ch-btn--xs', function () {
        api('/api/admin/candidate-hub/modules/' + encodeURIComponent(m.id) + '/move', 'POST', { direction: 'down' })
          .then(function (d) { state.modules = d.items; renderBody(); }).catch(function (e) { toast(e.message, 'crimson'); });
      });
      if (idx === state.modules.length - 1) dn.disabled = true;
      acts.appendChild(up); acts.appendChild(dn);
      acts.appendChild(btn('Edit', 'ch-btn ch-btn--xs', function () { state.editingModule = JSON.parse(JSON.stringify(m)); renderBody(); }));
      acts.appendChild(btn('Duplicate', 'ch-btn ch-btn--xs', function () {
        api('/api/admin/candidate-hub/modules/' + encodeURIComponent(m.id) + '/duplicate', 'POST', {})
          .then(function () { toast('Feature duplicated', 'ok'); loadModules().then(renderBody); }).catch(function (e) { toast(e.message, 'crimson'); });
      }));
      if (m.module_type !== 'core') {
        acts.appendChild(btn('Delete', 'ch-btn ch-btn--xs is-danger', function () {
          if (!window.confirm('Delete custom feature "' + m.title_en + '"?')) return;
          api('/api/admin/candidate-hub/modules/' + encodeURIComponent(m.id), 'DELETE')
            .then(function () { toast('Feature deleted', 'ok'); state.editingModule = null; loadModules().then(renderBody); })
            .catch(function (e) { toast(e.message, 'crimson'); });
        }));
      }
      tdA.appendChild(acts); tr.appendChild(tdA);
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody); wrap.appendChild(tbl); listCard.appendChild(wrap);

    // Feature Builder Form
    var edCard = el('section', 'ch-card');
    var ed = state.editingModule;
    edCard.appendChild(el('h2', 'ch-card__title', ed && ed.id ? 'Edit Feature' : '+ Add New Candidate Feature'));
    if (!ed) {
      edCard.appendChild(el('p', 'ch-muted', 'Click "+ Add New Candidate Feature" or select any module to edit.'));
    } else {
      var cfg = ed.config || {};
      var form = el('form'); form.noValidate = true;
      var grid = el('div', 'ch-form-grid');
      var fType = selectInput('module_type', FEATURE_TYPES, ed.module_type === 'core' ? 'custom_feature' : ed.module_type);
      if (ed.module_type === 'core') fType.disabled = true;
      var tEn = textInput('title_en', ed.title_en, 'Feature Title (EN)');
      var tOr = textInput('title_or', ed.title_or, 'Feature Title (ଓଡ଼ିଆ)');
      var sEn = textInput('subtitle_en', ed.subtitle_en, 'Subtitle / Description (EN)');
      var sOr = textInput('subtitle_or', ed.subtitle_or, 'Subtitle / Description (ଓଡ଼ିଆ)');
      var ic = textInput('icon', ed.icon || '✨', 'Emoji icon e.g. 🧭');
      var slot = selectInput('layout_slot', [['sidebar', 'Sidebar Tab'], ['overview', 'Overview Widget'], ['both', 'Both']], ed.layout_slot);
      var span = selectInput('card_span', [['half', 'Half Width'], ['full', 'Full Width']], ed.card_span);
      var accent = selectInput('accent_variant', [['primary', 'Primary'], ['accent', 'Accent'], ['emerald', 'Emerald'], ['amber', 'Amber'], ['blue', 'Blue']], ed.accent_variant);
      var tier = selectInput('required_access_tier', [['standard', 'Standard'], ['verified', 'Verified'], ['mentor', 'Mentor'], ['vip', 'VIP']], ed.required_access_tier);
      var order = textInput('sort_order', ed.sort_order || 90, '90', 'number');
      var targetUrl = textInput('target_url', cfg.target_url || '', '/study-library/ or https://...');
      var r2Key = textInput('r2_file_key', cfg.r2_file_key || '', 'R2 attachment key (optional)');
      var ctaEn = textInput('cta_label_en', cfg.cta_label_en || '', 'Open Tool / Download');
      var ctaOr = textInput('cta_label_or', cfg.cta_label_or || '', 'ଖୋଲନ୍ତୁ / ଡାଉନଲୋଡ୍');
      var checklist = el('textarea', 'cso-form-textarea'); checklist.rows = 3; checklist.name = 'checklist_items';
      checklist.placeholder = 'One checklist item or bullet per line (for Custom Checklist / Action Panel)';
      checklist.value = Array.isArray(cfg.checklist_items) ? cfg.checklist_items.join('\n') : '';
      var enSw = switchInput('is_enabled', 'Enabled & visible on Candidate Hub', ed.is_enabled !== 0);

      grid.appendChild(fieldGroup('Feature Type', fType, true));
      grid.appendChild(fieldGroup('Title (EN) *', tEn));
      grid.appendChild(fieldGroup('Title (ଓଡ଼ିଆ)', tOr));
      grid.appendChild(fieldGroup('Subtitle (EN)', sEn, true));
      grid.appendChild(fieldGroup('Subtitle (ଓଡ଼ିଆ)', sOr, true));
      grid.appendChild(fieldGroup('Icon', ic));
      grid.appendChild(fieldGroup('Layout Slot', slot));
      grid.appendChild(fieldGroup('Card Width', span));
      grid.appendChild(fieldGroup('Accent Style', accent));
      grid.appendChild(fieldGroup('Required Access Tier', tier));
      grid.appendChild(fieldGroup('Sort Order', order));
      grid.appendChild(fieldGroup('Target URL / Resource Link', targetUrl, true));
      grid.appendChild(fieldGroup('R2 Attachment Key', r2Key, true));
      grid.appendChild(fieldGroup('Action CTA Label (EN)', ctaEn));
      grid.appendChild(fieldGroup('Action CTA Label (ଓଡ଼ିଆ)', ctaOr));
      grid.appendChild(fieldGroup('Checklist Items / Content Lines', checklist, true));
      form.appendChild(grid);
      form.appendChild(buildR2Picker(function (f) { targetUrl.value = f.url; r2Key.value = f.id; }));
      form.appendChild(enSw.wrap);

      var acts = el('div', 'ch-form-actions');
      var sv = el('button', 'ch-btn is-primary', ed.id ? 'Save Feature' : 'Create Feature'); sv.type = 'submit';
      acts.appendChild(sv);
      acts.appendChild(btn('Cancel', 'ch-btn', function () { state.editingModule = null; renderBody(); }));
      form.appendChild(acts);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!tEn.value.trim()) { toast('English title is required', 'crimson'); return; }
        var lines = checklist.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        var payload = {
          module_type: ed.module_type === 'core' ? 'core' : fType.value,
          title_en: tEn.value.trim(), title_or: tOr.value.trim(),
          subtitle_en: sEn.value.trim(), subtitle_or: sOr.value.trim(),
          icon: ic.value.trim() || '✨', layout_slot: slot.value, card_span: span.value,
          accent_variant: accent.value, required_access_tier: tier.value,
          sort_order: Number(order.value || 0), is_enabled: enSw.input.checked ? 1 : 0,
          config: {
            target_url: targetUrl.value.trim(), r2_file_key: r2Key.value.trim(),
            cta_label_en: ctaEn.value.trim(), cta_label_or: ctaOr.value.trim(),
            checklist_items: lines
          }
        };
        var req = ed.id
          ? api('/api/admin/candidate-hub/modules/' + encodeURIComponent(ed.id), 'PUT', payload)
          : api('/api/admin/candidate-hub/modules', 'POST', payload);
        req.then(function () {
          toast(ed.id ? 'Feature updated live' : 'New Candidate Hub feature published', 'ok');
          state.editingModule = null;
          loadModules().then(renderBody);
        }).catch(function (err) { toast(err.message, 'crimson'); });
      });
      edCard.appendChild(form);
    }

    split.appendChild(listCard); split.appendChild(edCard);
    container.appendChild(split);
  }

  // =========================================================================
  // TAB 4: PROVIDE CONTENT & TARGETED PUSH
  // =========================================================================
  function loadAssigned() {
    return api('/api/admin/candidate-hub/assigned-items').then(function (d) { state.assigned = d.items || []; });
  }

  function renderContentPushTab(container) {
    var split = el('div', 'ch-split');
    var listCard = el('section', 'ch-card');
    var lh = el('div', 'ch-card__head');
    lh.appendChild(el('h2', 'ch-card__title', 'Assigned Content & Targeted Pushes'));
    lh.appendChild(btn('+ Push New Content', 'ch-btn is-primary', function () {
      state.editingAssigned = { target_scope: 'all', item_type: 'study_pdf', priority: 'normal', is_published: 1 };
      renderBody();
    }));
    listCard.appendChild(lh);

    var wrap = el('div', 'ch-table-wrap');
    if (!state.assigned.length) {
      wrap.appendChild(el('p', 'ch-muted', 'No targeted content pushed yet.'));
    } else {
      var tbl = el('table', 'ch-table');
      var thead = el('thead'); var htr = el('tr');
      ['Title & Type', 'Target Scope', 'Priority', 'Engagement', 'Status', 'Actions'].forEach(function (h) { htr.appendChild(el('th', '', h)); });
      thead.appendChild(htr); tbl.appendChild(thead);
      var tbody = el('tbody');
      state.assigned.forEach(function (it) {
        var tr = el('tr');
        var td1 = el('td');
        td1.appendChild(el('strong', '', it.title_en));
        var fileTag = it.file_ext ? ' · ' + it.file_ext + (it.file_size_bytes ? ' (' + formatBytes(it.file_size_bytes) + ')' : '') : '';
        td1.appendChild(el('div', 'ch-muted', it.item_type.replace(/_/g, ' ') + fileTag + (it.expires_at ? ' · exp ' + it.expires_at : '')));
        tr.appendChild(td1);
        var targetDesc = it.target_scope === 'all' ? 'All Candidates'
          : (it.target_scope === 'user' || it.target_scope === 'individual') ? 'User: ' + it.target_user_id
            : it.target_scope === 'district' ? 'District: ' + it.target_district
              : 'Exam Board: ' + it.target_exam_board;
        tr.appendChild(el('td', 'ch-muted', targetDesc));
        var tdP = el('td'); tdP.appendChild(el('span', 'ch-badge ch-badge--' + it.priority, it.priority)); tr.appendChild(tdP);
        var tdEng = el('td');
        var engBox = el('div', 'ch-telemetry-badges');
        var sBadge = el('span', 'ch-telemetry-pill', '👁 ' + (it.seen_count || 0) + ' seen');
        sBadge.title = 'Candidates who viewed this item';
        var dBadge = el('span', 'ch-telemetry-pill', '⬇ ' + (it.download_count || 0) + ' dl');
        dBadge.title = 'Candidates who opened or downloaded this file';
        engBox.appendChild(sBadge); engBox.appendChild(dBadge);
        tdEng.appendChild(engBox); tr.appendChild(tdEng);
        var tdS = el('td');
        var sw = switchInput('as_' + it.id, it.is_published ? 'Live' : 'Draft', it.is_published);
        sw.input.addEventListener('change', function () {
          api('/api/admin/candidate-hub/assigned-items/' + encodeURIComponent(it.id) + '/toggle', 'POST', {})
            .then(function () { toast('Status updated', 'ok'); loadAssigned().then(renderBody); })
            .catch(function (e) { toast(e.message, 'crimson'); });
        });
        tdS.appendChild(sw.wrap); tr.appendChild(tdS);
        var tdA = el('td');
        var acts = el('div', 'ch-row-actions');
        acts.appendChild(btn('Edit', 'ch-btn ch-btn--xs', function () { state.editingAssigned = JSON.parse(JSON.stringify(it)); renderBody(); }));
        acts.appendChild(btn('Delete', 'ch-btn ch-btn--xs is-danger', function () {
          if (!window.confirm('Delete "' + it.title_en + '"?')) return;
          api('/api/admin/candidate-hub/assigned-items/' + encodeURIComponent(it.id), 'DELETE')
            .then(function () { toast('Assigned item deleted', 'ok'); loadAssigned().then(renderBody); })
            .catch(function (e) { toast(e.message, 'crimson'); });
        }));
        tdA.appendChild(acts); tr.appendChild(tdA);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody); wrap.appendChild(tbl);
    }
    listCard.appendChild(wrap);

    var edCard = el('section', 'ch-card');
    var ed = state.editingAssigned;
    if (ed && ed.id) {
      edCard.appendChild(el('h2', 'ch-card__title', 'Edit Assigned Content'));
      var form = el('form'); form.noValidate = true;
      var grid = el('div', 'ch-form-grid');
      var scopeSel = selectInput('target_scope', [['all', 'All Candidates'], ['user', 'Specific Candidate (User ID)'], ['district', 'Odisha District (30 Districts)'], ['exam_board', 'Exam Board']], ed.target_scope);
      var userIn = textInput('target_user_id', ed.target_user_id || '', 'Candidate User ID');
      var distSel = selectInput('target_district', [['', 'Select Odisha District']].concat(ODISHA_30_DISTRICTS.map(function (d) { return [d, d]; })), ed.target_district || '');
      var boardSel = selectInput('target_exam_board', [['', 'Select Exam Board']].concat(EXAM_BOARDS.map(function (b) { return [b, b]; })), ed.target_exam_board || '');
      var typeSel = selectInput('item_type', ITEM_TYPES, ed.item_type);
      var priSel = selectInput('priority', [['low', 'Low'], ['normal', 'Normal'], ['high', 'High'], ['urgent', 'Urgent']], ed.priority);
      var tEn = textInput('title_en', ed.title_en || '', 'Title (EN)');
      var tOr = textInput('title_or', ed.title_or || '', 'Title (ଓଡ଼ିଆ)');
      var sEn = textInput('summary_en', ed.summary_en || '', 'Short instructions / summary (EN)');
      var sOr = textInput('summary_or', ed.summary_or || '', 'Short instructions / summary (ଓଡ଼ିଆ)');
      var rUrl = textInput('resource_url', ed.resource_url || '', '/api/media/... or https://...');
      var r2In = textInput('r2_file_key', ed.r2_file_key || '', 'R2 key (optional)');
      var expIn = textInput('expires_at', ed.expires_at || '', 'YYYY-MM-DD', 'date');
      var pubSw = switchInput('is_published', 'Publish immediately to candidate dashboards', ed.is_published !== 0);

      grid.appendChild(fieldGroup('Target Audience', scopeSel));
      grid.appendChild(fieldGroup('Content Type', typeSel));
      grid.appendChild(fieldGroup('Specific Candidate ID', userIn));
      grid.appendChild(fieldGroup('Target Odisha District', distSel));
      grid.appendChild(fieldGroup('Target Exam Board', boardSel));
      grid.appendChild(fieldGroup('Priority', priSel));
      grid.appendChild(fieldGroup('Title (EN) *', tEn, true));
      grid.appendChild(fieldGroup('Title (ଓଡ଼ିଆ)', tOr, true));
      grid.appendChild(fieldGroup('Summary (EN)', sEn, true));
      grid.appendChild(fieldGroup('Summary (ଓଡ଼ିଆ)', sOr, true));
      grid.appendChild(fieldGroup('Resource URL / PDF Link', rUrl, true));
      grid.appendChild(fieldGroup('R2 File Key', r2In));
      grid.appendChild(fieldGroup('Expires On (optional)', expIn));
      form.appendChild(grid);
      form.appendChild(buildR2Picker(function (f) { rUrl.value = f.url; r2In.value = f.id; }));
      form.appendChild(pubSw.wrap);

      var acts = el('div', 'ch-form-actions');
      var sv = el('button', 'ch-btn is-primary', 'Save Content'); sv.type = 'submit';
      acts.appendChild(sv);
      acts.appendChild(btn('New Direct Upload', 'ch-btn', function () { state.editingAssigned = null; renderBody(); }));
      form.appendChild(acts);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!tEn.value.trim()) { toast('Title (EN) is required', 'crimson'); return; }
        var payload = {
          target_scope: scopeSel.value, target_user_id: userIn.value.trim(),
          target_district: distSel.value, target_exam_board: boardSel.value,
          item_type: typeSel.value, priority: priSel.value,
          title_en: tEn.value.trim(), title_or: tOr.value.trim(),
          summary_en: sEn.value.trim(), summary_or: sOr.value.trim(),
          resource_url: rUrl.value.trim(), r2_file_key: r2In.value.trim(),
          expires_at: expIn.value, is_published: pubSw.input.checked ? 1 : 0
        };
        api('/api/admin/candidate-hub/assigned-items/' + encodeURIComponent(ed.id), 'PUT', payload)
          .then(function () { toast('Content saved & pushed', 'ok'); state.editingAssigned = null; loadAssigned().then(renderBody); })
          .catch(function (err) { toast(err.message, 'crimson'); });
      });
      edCard.appendChild(form);
    } else {
      edCard.appendChild(el('h2', 'ch-card__title', 'Direct Upload & Push to Candidate Dashboard'));
      edCard.appendChild(buildDirectUploadPushWidget({
        target_scope: (ed && ed.target_scope) || 'all',
        target_user_id: (ed && ed.target_user_id) || '',
        item_type: (ed && ed.item_type) || 'study_pack',
        priority: (ed && ed.priority) || 'high',
        selectedIds: Array.from(state.roster.selected),
        onDone: function () { state.editingAssigned = null; loadAssigned().then(renderBody); }
      }));
    }

    split.appendChild(listCard); split.appendChild(edCard);
    container.appendChild(split);
  }

  // =========================================================================
  // TAB 5: DOCUMENT VAULT TEMPLATES
  // =========================================================================
  function loadDocs() {
    return api('/api/admin/candidate-hub/doc-templates').then(function (d) { state.docs = d.items || []; });
  }

  function renderDocsTab(container) {
    var split = el('div', 'ch-split');
    var listCard = el('section', 'ch-card');
    var lh = el('div', 'ch-card__head');
    lh.appendChild(el('h2', 'ch-card__title', 'Odisha & Central Document Vault Templates'));
    lh.appendChild(btn('+ Add Document Template', 'ch-btn is-primary', function () {
      state.editingDoc = { category: 'odisha_state', is_required: 1, is_published: 1 };
      renderBody();
    }));
    listCard.appendChild(lh);

    var wrap = el('div', 'ch-table-wrap');
    var tbl = el('table', 'ch-table');
    var thead = el('thead'); var htr = el('tr');
    ['Document', 'Category', 'Required', 'Status', 'Order & Actions'].forEach(function (h) { htr.appendChild(el('th', '', h)); });
    thead.appendChild(htr); tbl.appendChild(thead);
    var tbody = el('tbody');
    state.docs.forEach(function (d, idx) {
      var tr = el('tr');
      var td1 = el('td');
      td1.appendChild(el('strong', '', d.title_en));
      if (d.title_or) td1.appendChild(el('div', 'ch-muted', d.title_or));
      tr.appendChild(td1);
      tr.appendChild(el('td', 'ch-muted', d.category));
      tr.appendChild(el('td', '', d.is_required ? 'Mandatory' : 'Optional'));
      var tdS = el('td');
      var sw = switchInput('doc_' + d.id, d.is_published ? 'Live' : 'Hidden', d.is_published);
      sw.input.addEventListener('change', function () {
        api('/api/admin/candidate-hub/doc-templates/' + encodeURIComponent(d.id) + '/toggle', 'POST', {})
          .then(function () { toast('Template status updated', 'ok'); loadDocs().then(renderBody); })
          .catch(function (e) { toast(e.message, 'crimson'); });
      });
      tdS.appendChild(sw.wrap); tr.appendChild(tdS);
      var tdA = el('td');
      var acts = el('div', 'ch-row-actions');
      var up = btn('↑', 'ch-btn ch-btn--xs', function () {
        api('/api/admin/candidate-hub/doc-templates/' + encodeURIComponent(d.id) + '/move', 'POST', { direction: 'up' })
          .then(function (r) { state.docs = r.items; renderBody(); }).catch(function (e) { toast(e.message, 'crimson'); });
      });
      if (idx === 0) up.disabled = true;
      var dn = btn('↓', 'ch-btn ch-btn--xs', function () {
        api('/api/admin/candidate-hub/doc-templates/' + encodeURIComponent(d.id) + '/move', 'POST', { direction: 'down' })
          .then(function (r) { state.docs = r.items; renderBody(); }).catch(function (e) { toast(e.message, 'crimson'); });
      });
      if (idx === state.docs.length - 1) dn.disabled = true;
      acts.appendChild(up); acts.appendChild(dn);
      acts.appendChild(btn('Edit', 'ch-btn ch-btn--xs', function () { state.editingDoc = JSON.parse(JSON.stringify(d)); renderBody(); }));
      acts.appendChild(btn('Delete', 'ch-btn ch-btn--xs is-danger', function () {
        if (!window.confirm('Delete document template "' + d.title_en + '"?')) return;
        api('/api/admin/candidate-hub/doc-templates/' + encodeURIComponent(d.id), 'DELETE')
          .then(function () { toast('Template deleted', 'ok'); loadDocs().then(renderBody); })
          .catch(function (e) { toast(e.message, 'crimson'); });
      }));
      tdA.appendChild(acts); tr.appendChild(tdA);
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody); wrap.appendChild(tbl); listCard.appendChild(wrap);

    var edCard = el('section', 'ch-card');
    var ed = state.editingDoc || { category: 'odisha_state', is_required: 1, is_published: 1 };
    edCard.appendChild(el('h2', 'ch-card__title', ed.id ? 'Edit Document Template' : 'Add Document Template'));
    var form = el('form'); form.noValidate = true;
    var grid = el('div', 'ch-form-grid');
    var tEn = textInput('title_en', ed.title_en || '', 'e.g. Odisha Resident Certificate');
    var tOr = textInput('title_or', ed.title_or || '', 'ଓଡ଼ିଆ ଶୀର୍ଷକ');
    var cat = selectInput('category', [['identity', 'Identity'], ['academic', 'Academic'], ['odisha_state', 'Odisha State'], ['category', 'Reservation / Caste'], ['application', 'Application Assets']], ed.category);
    var nEn = textInput('notes_en', ed.notes_en || '', 'Verification hint (EN)');
    var nOr = textInput('notes_or', ed.notes_or || '', 'Verification hint (ଓଡ଼ିଆ)');
    var reqSw = switchInput('is_required', 'Required for exam eligibility', ed.is_required !== 0);
    var pubSw = switchInput('is_published', 'Published to Candidate Vault', ed.is_published !== 0);

    grid.appendChild(fieldGroup('Title (EN) *', tEn, true));
    grid.appendChild(fieldGroup('Title (ଓଡ଼ିଆ)', tOr, true));
    grid.appendChild(fieldGroup('Category', cat, true));
    grid.appendChild(fieldGroup('Notes (EN)', nEn, true));
    grid.appendChild(fieldGroup('Notes (ଓଡ଼ିଆ)', nOr, true));
    form.appendChild(grid);
    var sws = el('div', 'ch-filters'); sws.appendChild(reqSw.wrap); sws.appendChild(pubSw.wrap); form.appendChild(sws);
    var acts = el('div', 'ch-form-actions');
    var sv = el('button', 'ch-btn is-primary', ed.id ? 'Save Template' : 'Create Template'); sv.type = 'submit';
    acts.appendChild(sv);
    if (ed.id) acts.appendChild(btn('New', 'ch-btn', function () { state.editingDoc = null; renderBody(); }));
    form.appendChild(acts);

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!tEn.value.trim()) { toast('Document title (EN) is required', 'crimson'); return; }
      var payload = {
        title_en: tEn.value.trim(), title_or: tOr.value.trim(), category: cat.value,
        notes_en: nEn.value.trim(), notes_or: nOr.value.trim(),
        is_required: reqSw.input.checked ? 1 : 0, is_published: pubSw.input.checked ? 1 : 0
      };
      var req = ed.id
        ? api('/api/admin/candidate-hub/doc-templates/' + encodeURIComponent(ed.id), 'PUT', payload)
        : api('/api/admin/candidate-hub/doc-templates', 'POST', payload);
      req.then(function () {
        toast('Document template saved', 'ok');
        state.editingDoc = null;
        loadDocs().then(renderBody);
      }).catch(function (err) { toast(err.message, 'crimson'); });
    });
    edCard.appendChild(form);

    split.appendChild(listCard); split.appendChild(edCard);
    container.appendChild(split);
  }

  // =========================================================================
  // SHELL & TAB ROUTER
  // =========================================================================
  function renderBody() {
    var body = clear(state.refs.body);
    if (!body) return;
    if (state.tab === 'roster') renderRosterTab(body);
    else if (state.tab === 'ui') renderUiManagerTab(body);
    else if (state.tab === 'features') renderFeaturesTab(body);
    else if (state.tab === 'content') renderContentPushTab(body);
    else if (state.tab === 'docs') renderDocsTab(body);
  }

  function renderShell() {
    if (!state.root) return;
    clear(state.root);
    var wrap = el('div', 'ch-studio');
    var tabs = el('div', 'ch-tabs'); tabs.setAttribute('role', 'tablist');
    [
      ['roster', 'Candidates Roster & Governance'],
      ['ui', 'Dashboard UI Manager & Preview'],
      ['features', 'Add & Manage Features'],
      ['content', 'Provide Content & Push'],
      ['docs', 'Document Vault Templates']
    ].forEach(function (t) {
      var b = btn(t[1], 'ch-tab' + (state.tab === t[0] ? ' is-active' : ''), function () {
        state.tab = t[0];
        renderShell();
        if (t[0] === 'roster') loadRoster().then(renderBody);
        else if (t[0] === 'ui') api('/api/admin/candidate-hub/ui-config').then(function (d) { state.ui = d.ui_config; renderBody(); });
        else if (t[0] === 'features') loadModules().then(renderBody);
        else if (t[0] === 'content') loadAssigned().then(renderBody);
        else if (t[0] === 'docs') loadDocs().then(renderBody);
      });
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(state.tab === t[0]));
      tabs.appendChild(b);
    });
    wrap.appendChild(tabs);
    state.refs.body = el('div', '');
    wrap.appendChild(state.refs.body);
    state.root.appendChild(wrap);
    renderBody();
  }

  function render(root, headerActions, initialTab) {
    state.root = root;
    if (initialTab) state.tab = initialTab;
    renderShell();
    if (headerActions) {
      headerActions.appendChild(btn('Refresh', 'ch-btn', function () {
        Promise.all([loadRoster(), loadModules(), loadAssigned(), loadDocs()]).then(renderBody).catch(function (e) { toast(e.message, 'crimson'); });
      }));
      var open = el('a', 'ch-btn', 'Open /student-dashboard/ ↗');
      open.href = '/student-dashboard/'; open.target = '_blank'; open.rel = 'noopener noreferrer';
      headerActions.appendChild(open);
    }
    Promise.all([loadRoster(), loadModules(), loadAssigned(), loadDocs()])
      .then(renderBody)
      .catch(function (e) { if (state.refs.body) clear(state.refs.body).appendChild(el('p', 'ch-error', 'Failed to load Candidate Hub: ' + e.message)); });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && state.drawer.open) closeAuthorityDrawer();
  });

  window.CSOCandidateHubStudio = {
    FOLDER_ID: 'folder-candidate-hub',
    MODULE_ID: 'module-candidate-hub',
    render: render,
    openTab: function (tab) { state.tab = tab; if (state.root) renderShell(); }
  };
})(window, document);
