/**
 * CS Odisha Admin Studio — Jobs Publishing House, 3-Layer Taxonomy & EdTech Career Engine (v249)
 * 3 Integrated Tabs:
 *   1. Published & Draft Jobs (Article Manager + Full Editorial Composer with inline + Add L1/L2/L3,
 *      PDF-to-Article Auto-Draft, Cover Banner R2 Upload/Picker, Rich Bilingual Editor + Snippets Drawer,
 *      No-Code Visual Tables & Lifecycle Builder, Eligibility & Study Cross-Linker, R2 PDFs + Page Bookmarks,
 *      Scheduled Publish + Revisions/Rollback, Real Public-Page Preview Token Link, Broadcast Copy)
 *   2. 3-Layer Category Hierarchy Studio (Main Category L1 -> Subcategory L2 -> Further Subcategory L3)
 *   3. Reusable Bilingual Snippets Library (EN & Odia)
 * Strict CSP-compliant: safe DOM APIs only, zero unsafe HTML string sinks, inline styles, or inline handlers.
 */
(function (window, document) {
  'use strict';

  var ODISHA_DISTRICTS = [
    'All Odisha', 'All India', 'Foreign / Overseas', 'Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Boudh',
    'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur',
    'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput',
    'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada',
    'Sambalpur', 'Subarnapur', 'Sundargarh'
  ];

  var REGION_SCOPES = [
    ['odisha', 'Odisha'],
    ['central', 'Central'],
    ['all-india', 'All Over India'],
    ['foreign', 'Foreign / Overseas']
  ];

  var QUAL_LEVELS = [
    '10th Pass', '12th / +2 Pass', 'ITI / Diploma', 'Graduate (Any Discipline)',
    'B.Tech / Engineering', 'B.Ed / Teaching', 'Post Graduate / NET',
    'Medical / Nursing / Pharma', 'Law / Commerce / CA', 'Other / See Notification'
  ];

  var STAGES = [
    ['notification', 'Notification Open'],
    ['exam_date', 'Exam Date Announced'],
    ['admit_card', 'Admit Card Out'],
    ['answer_key', 'Answer Key Released'],
    ['result', 'Result Declared'],
    ['closed', 'Recruitment Completed']
  ];

  var ACCENTS = ['emerald', 'cobalt', 'violet', 'amber', 'rose', 'teal'];

  var state = {
    tab: 'articles',
    mode: 'list', // 'list' | 'composer'
    root: null,
    headerActions: null,
    kpis: null,
    articles: [],
    taxonomyNodes: [],
    snippets: [],
    studyOptions: [],
    revisions: [],
    filters: { l1: '', l2: '', l3: '', region: '', stage: '', status: '', q: '' },
    taxSel: { l1: '', l2: '' },
    draft: null,
    extractedDraft: null,
    activePreviewUrl: '',
    activePreviewExp: ''
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }

  function clear(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
    return node;
  }

  function toast(msg, kind) {
    if (typeof window.showToast === 'function') window.showToast(msg, kind || 'info');
  }

  function num(v) {
    try { return Number(v || 0).toLocaleString('en-IN'); } catch (_) { return String(v || 0); }
  }

  function btn(label, cls, onClick) {
    var b = el('button', cls || 'jph-btn', label);
    b.type = 'button';
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }

  function api(url, method, body, isForm) {
    var opts = { method: method || 'GET', credentials: 'same-origin', headers: { 'X-CSO-CSRF': '1' } };
    if (body !== undefined) {
      if (isForm) opts.body = body;
      else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    }
    return fetch(url, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error((d && (d.error || d.message)) || ('HTTP ' + r.status));
        return d;
      });
    });
  }

  function isGovUrl(raw) {
    try {
      var u = new URL(String(raw || '').trim());
      return u.protocol === 'https:' && /(^|\.)(gov\.in|nic\.in|odisha\.gov\.in|ac\.in|edu\.in)$/i.test(u.hostname);
    } catch (_) { return false; }
  }

  function slugify(raw) {
    return String(raw || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 110);
  }

  function emptyDraft() {
    return {
      id: '',
      slug: '',
      category_l1_id: '',
      category_l2_id: '',
      category_l3_id: '',
      sector_badge: '',
      title_en: '',
      title_or: '',
      summary_en: '',
      summary_or: '',
      organisation_en: '',
      organisation_or: '',
      advt_number: '',
      total_vacancies: 0,
      qualification_level: '',
      qualification_summary: '',
      min_age: '',
      max_age: '',
      age_cutoff_date: '',
      age_limit_summary: '',
      odisha_domicile_required: 1,
      salary_pay_scale: '',
      selection_mode: '',
      location_district: 'All Odisha',
      region_scope: 'odisha',
      application_start_date: '',
      last_date: '',
      exam_date: '',
      cover_image_url: '',
      cover_image_caption: '',
      article_body_en: '',
      article_body_or: '',
      vacancy_breakdown: [],
      important_dates: [],
      fee_structure: [],
      selection_steps: [],
      cutoff_reference: [],
      lifecycle_updates: [],
      linked_study_ids: [],
      official_apply_url: '',
      official_website_url: '',
      notification_pdf_url: '',
      syllabus_pdf_url: '',
      pdf_index_bookmarks: [],
      extra_attachments: [],
      quiz_json: '',
      lifecycle_stage: 'notification',
      corrigendum_note_en: '',
      corrigendum_note_or: '',
      scheduled_publish_at: '',
      is_featured: 0,
      is_published: 0,
      change_summary: ''
    };
  }

  function copyToClipboard(text, okMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast(okMsg || 'Copied to clipboard!', 'ok');
      }, function () {
        toast('Copy failed — please copy manually', 'crimson');
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.className = 'jph-file-hidden';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); toast(okMsg || 'Copied to clipboard!', 'ok'); } catch (_) {}
      ta.remove();
    }
  }

  // v386: 1-Click WhatsApp & Telegram Bilingual Alert Generator (shared with Guides Studio)
  function copyTextSilent(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function () {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.className = 'jph-file-hidden';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (_) {}
        ta.remove();
      });
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.className = 'jph-file-hidden';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    ta.remove();
    return Promise.resolve();
  }

  function detectAlertChannelMeta(rec) {
    var st = String((rec && rec.lifecycle_stage) || '').toLowerCase();
    var blob = String((rec && (rec.title_en || '')) + ' ' + (rec && (rec.tags || ''))).toLowerCase();
    if (st === 'result' || /\b(result out|scorecard|osstet result)\b/.test(blob)) {
      return { emoji: '🏆', header: 'EXAM RESULT OUT | ପରୀକ୍ଷା ଫଳାଫଳ' };
    }
    if (st === 'admit_card' || st === 'exam_date' || st === 'answer_key' || /\b(admit card|city slip|exam schedule|22nd edition|ugc net)\b/.test(blob)) {
      return { emoji: '🪪', header: 'EXAM & ADMIT CARD UPDATE | ପରୀକ୍ଷା ସୂଚନା' };
    }
    if (st === 'current_affairs') {
      return { emoji: '📰', header: 'DAILY CURRENT AFFAIRS | ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ' };
    }
    return { emoji: '🚨', header: 'ODISHA JOB ALERT | ଚାକିରି ବିଜ୍ଞପ୍ତି' };
  }

  function formatSocialAlertText(rec, channel, kind) {
    var b = channel === 'telegram' ? '**' : '*';
    var meta = detectAlertChannelMeta(rec || {});
    var lines = [meta.emoji + ' ' + b + meta.header + b, ''];
    var titleEn = String((rec && rec.title_en) || '').trim();
    var titleOr = String((rec && rec.title_or) || '').trim();
    if (titleEn) lines.push(b + titleEn + b);
    if (titleOr) lines.push(titleOr);
    lines.push('');

    var org = String((rec && (rec.organisation_en || rec.organization || rec.sector_badge)) || '').trim();
    if (org) lines.push('🏛️ Authority / Org: ' + org);

    var postParts = [];
    if (Number((rec && rec.total_vacancies) || 0) > 0) postParts.push(num(rec.total_vacancies) + ' Posts');
    if (rec && rec.advt_number) postParts.push('Advt: ' + String(rec.advt_number).trim());
    if (postParts.length) lines.push('📌 Posts / Edition / Advt: ' + postParts.join(' · '));

    var keyDate = String((rec && (rec.last_date || rec.exam_date)) || '').trim();
    if (keyDate) lines.push('📅 Key Date / Deadline: ' + keyDate);

    var slug = String((rec && rec.slug) || '').trim();
    var routePrefix = kind === 'guide' ? 'guides' : 'jobs';
    var publicUrl = slug ? ('https://csodisha.com/' + routePrefix + '/' + encodeURIComponent(slug)) : ('https://csodisha.com/' + routePrefix + '/');
    lines.push('');
    lines.push('🔗 Full Details & Bilingual Guide: ' + publicUrl);

    var officialLink = '';
    if (rec) {
      officialLink = String(rec.notification_pdf_url || rec.result_url || rec.admit_card_url || rec.official_apply_url || rec.official_website_url || '').trim();
      if (!officialLink && Array.isArray(rec.pdfs) && rec.pdfs[0] && rec.pdfs[0].url) officialLink = rec.pdfs[0].url;
      if (!officialLink && Array.isArray(rec.links)) {
        var offL = rec.links.find(function (l) { return l && l.is_official && l.url; });
        if (offL) officialLink = offL.url;
      }
    }
    if (officialLink && /^https?:\/\//i.test(officialLink)) {
      lines.push('📄 Official Notification PDF / Result Link: ' + officialLink);
    }

    lines.push('');
    lines.push('📲 Join Common Sense Odisha (csodisha.com) for verified Odisha Jobs, Admit Cards & Results');
    return lines.join('\n');
  }

  function buildAlertGeneratorWidget(getRecordFn, kind) {
    var box = el('div', 'jph-alert-gen');
    var bar = el('div', 'jph-alert-gen-bar');
    var channel = 'whatsapp';
    var customEdited = false;

    var chWrap = el('div', 'jph-alert-ch-pills');
    chWrap.setAttribute('role', 'group');
    chWrap.setAttribute('aria-label', 'Social alert format');
    var waBtn = el('button', 'jph-alert-ch-pill is-active', 'WhatsApp');
    waBtn.type = 'button';
    waBtn.setAttribute('aria-pressed', 'true');
    var tgBtn = el('button', 'jph-alert-ch-pill', 'Telegram');
    tgBtn.type = 'button';
    tgBtn.setAttribute('aria-pressed', 'false');
    chWrap.append(waBtn, tgBtn);

    var copyBtn = el('button', 'jph-btn jph-btn--xs jph-btn--primary jph-alert-copy-btn', '📋 Copy Alert Post');
    copyBtn.type = 'button';

    var prevBtn = el('button', 'jph-btn jph-btn--xs jph-alert-prev-btn', '👁️ Preview / Edit Text');
    prevBtn.type = 'button';
    prevBtn.setAttribute('aria-expanded', 'false');

    var popover = el('div', 'jph-alert-popover');
    popover.hidden = true;
    var previewTa = el('textarea', 'jph-textarea jph-alert-textarea');
    previewTa.setAttribute('aria-label', 'Editable WhatsApp / Telegram alert text');
    previewTa.addEventListener('input', function () { customEdited = true; });
    var resetBtn = el('button', 'jph-btn jph-btn--xs', '↻ Reset Template');
    resetBtn.type = 'button';
    resetBtn.addEventListener('click', function () {
      customEdited = false;
      previewTa.value = formatSocialAlertText(getRecordFn(), channel, kind);
    });
    popover.append(previewTa, resetBtn);

    function syncPreview() {
      if (!customEdited) {
        previewTa.value = formatSocialAlertText(getRecordFn(), channel, kind);
      }
    }

    function setChannel(nextCh) {
      channel = nextCh;
      customEdited = false;
      waBtn.classList.toggle('is-active', channel === 'whatsapp');
      waBtn.setAttribute('aria-pressed', String(channel === 'whatsapp'));
      tgBtn.classList.toggle('is-active', channel === 'telegram');
      tgBtn.setAttribute('aria-pressed', String(channel === 'telegram'));
      syncPreview();
    }

    waBtn.addEventListener('click', function () { setChannel('whatsapp'); });
    tgBtn.addEventListener('click', function () { setChannel('telegram'); });

    prevBtn.addEventListener('click', function () {
      var open = popover.hidden;
      popover.hidden = !open;
      prevBtn.setAttribute('aria-expanded', String(open));
      if (open) syncPreview();
    });

    copyBtn.addEventListener('click', function () {
      var txt = (customEdited && previewTa.value.trim()) ? previewTa.value : formatSocialAlertText(getRecordFn(), channel, kind);
      copyTextSilent(txt).then(function () {
        copyBtn.textContent = '✅ Copied!';
        toast((channel === 'telegram' ? 'Telegram' : 'WhatsApp') + ' bilingual alert copied!', 'ok');
        setTimeout(function () { copyBtn.textContent = '📋 Copy Alert Post'; }, 2500);
      });
    });

    bar.append(chWrap, copyBtn, prevBtn);
    box.append(bar, popover);
    return box;
  }

  window.CSOAlertGenerator = {
    formatSocialAlertText: formatSocialAlertText,
    buildAlertGeneratorWidget: buildAlertGeneratorWidget
  };

  function buildBroadcastText(art) {
    var titleEn = art.title_en || 'New Job Recruitment';
    var titleOr = art.title_or || titleEn;
    var org = art.organisation_en || 'Official Notification';
    var vac = Number(art.total_vacancies || 0) > 0 ? (num(art.total_vacancies) + ' Posts') : 'See Notification';
    var lastDt = art.last_date || 'Check Official Notice';
    var url = 'https://csodisha.com/jobs/?slug=' + encodeURIComponent(art.slug || '');
    return [
      '🔔 JOB ALERT | ' + titleEn,
      '🏛 Organisation: ' + org,
      '📌 Vacancies: ' + vac + (art.qualification_level ? (' | Qualification: ' + art.qualification_level) : ''),
      '📅 Last Date: ' + lastDt,
      '',
      '📢 ଓଡ଼ିଆ ସୂଚନା: ' + titleOr,
      '✅ ସମ୍ପୂର୍ଣ୍ଣ ବିବରଣୀ, ସିଲାବସ୍ PDF ଓ ଆବେଦନ ଲିଙ୍କ୍:',
      '👉 ' + url,
      '',
      '— Common Sense Odisha (csodisha.com)'
    ].join('\n');
  }

  // ---------- Modal Helper (using Admin Studio globalModal) ----------
  function openStudioModal(title, bodyBuilder, footerButtons) {
    var modal = document.getElementById('globalModal');
    var mTitle = document.getElementById('modalTitle');
    var mBody = document.getElementById('modalBody');
    var mFoot = document.getElementById('modalFooter');
    if (!modal || !mTitle || !mBody || !mFoot) return;
    mTitle.textContent = title;
    clear(mBody);
    clear(mFoot);
    if (bodyBuilder) bodyBuilder(mBody);
    (footerButtons || []).forEach(function (b) { mFoot.appendChild(b); });
    modal.hidden = false;
  }

  function closeStudioModal() {
    if (typeof window.closeModal === 'function') window.closeModal();
    else {
      var m = document.getElementById('globalModal');
      if (m) m.hidden = true;
    }
  }

  function nodesByLevel(level, parentId) {
    return (state.taxonomyNodes || []).filter(function (n) {
      if (Number(n.level) !== Number(level)) return false;
      if (level > 1 && parentId !== undefined) return String(n.parent_id || '') === String(parentId || '');
      return true;
    });
  }

  function findNode(id) {
    return (state.taxonomyNodes || []).find(function (n) { return n.id === id; }) || null;
  }

  function isForeignSectorId(l1Id) {
    if (!l1Id) return false;
    if (String(l1Id).toLowerCase() === 'jtax_l1_foreign') return true;
    var n = findNode(l1Id);
    return Boolean(n && String(n.slug || '').toLowerCase() === 'foreign');
  }

  // ---------- Quick-Create Taxonomy Node Modal (Inline "+ Add Option" in Composer & Tab 2) ----------
  function openTaxonomyNodeModal(opts) {
    opts = opts || {};
    var level = Number(opts.level || 1);
    var parentId = opts.parentId || null;
    var editing = opts.node || null;
    var levelLabel = level === 1 ? 'Main Category (L1)' : (level === 2 ? 'Subcategory / Department (L2)' : 'Further Subcategory / Tenure (L3)');
    var parentNode = parentId ? findNode(parentId) : null;

    var fTitleEn = el('input', 'jph-input'); fTitleEn.value = editing ? editing.title_en : ''; fTitleEn.placeholder = level === 1 ? 'e.g. State Sector (Odisha)' : (level === 2 ? 'e.g. OPSC / OSSC' : 'e.g. Permanent / Regular');
    var fTitleOr = el('input', 'jph-input'); fTitleOr.value = editing ? editing.title_or : ''; fTitleOr.placeholder = 'ଓଡ଼ିଆ ନାମ (Optional)';
    var fSubEn = el('input', 'jph-input'); fSubEn.value = editing ? editing.subtitle_en : ''; fSubEn.placeholder = 'Short subtitle in English';
    var fSubOr = el('input', 'jph-input'); fSubOr.value = editing ? editing.subtitle_or : ''; fSubOr.placeholder = 'ସଂକ୍ଷିପ୍ତ ବିବରଣୀ (ଓଡ଼ିଆ)';
    var fIcon = el('input', 'jph-input'); fIcon.value = editing ? editing.icon : (level === 1 ? '🏛️' : (level === 2 ? '📋' : '✅'));
    var fAccent = el('select', 'jph-select');
    ACCENTS.forEach(function (ac) {
      var o = el('option', '', ac); o.value = ac;
      if ((editing ? editing.accent_variant : 'emerald') === ac) o.selected = true;
      fAccent.appendChild(o);
    });
    var fPub = el('input'); fPub.type = 'checkbox'; fPub.checked = editing ? Boolean(editing.is_published) : true;

    openStudioModal((editing ? 'Edit ' : '+ Add ') + levelLabel, function (body) {
      var g = el('div', 'jph-form-grid jph-form-grid--2');
      if (parentNode) {
        var pInfo = el('div', 'jph-span-2 jph-muted', 'Parent: ' + parentNode.title_en + (parentNode.title_or ? ' (' + parentNode.title_or + ')' : ''));
        g.appendChild(pInfo);
      }
      function addField(lbl, ctrl, full) {
        var w = el('div', 'jph-field' + (full ? ' jph-span-2' : ''));
        w.appendChild(el('label', 'jph-label', lbl));
        w.appendChild(ctrl);
        g.appendChild(w);
      }
      addField('Title (EN) *', fTitleEn);
      addField('Title (ଓଡ଼ିଆ)', fTitleOr);
      addField('Subtitle (EN)', fSubEn);
      addField('Subtitle (ଓଡ଼ିଆ)', fSubOr);
      addField('Icon Emoji', fIcon);
      addField('Accent Variant', fAccent);
      var pubLbl = el('label', 'jph-check-label jph-span-2');
      pubLbl.appendChild(fPub);
      pubLbl.appendChild(el('span', '', 'Published on Live Portal'));
      g.appendChild(pubLbl);
      body.appendChild(g);
    }, [
      btn('Cancel', 'jph-btn', closeStudioModal),
      btn(editing ? 'Save Changes' : 'Create Category', 'jph-btn jph-btn--primary', function () {
        var titleEn = fTitleEn.value.trim();
        if (!titleEn) { toast('English title is required', 'crimson'); return; }
        var payload = {
          level: level,
          parent_id: level === 1 ? null : parentId,
          title_en: titleEn,
          title_or: fTitleOr.value.trim(),
          subtitle_en: fSubEn.value.trim(),
          subtitle_or: fSubOr.value.trim(),
          icon: fIcon.value.trim(),
          accent_variant: fAccent.value,
          is_published: fPub.checked ? 1 : 0
        };
        var req = editing
          ? api('/api/admin/jobs/taxonomy/' + encodeURIComponent(editing.id), 'PUT', payload)
          : api('/api/admin/jobs/taxonomy', 'POST', payload);
        req.then(function (d) {
          closeStudioModal();
          toast((editing ? 'Updated ' : 'Created ') + titleEn + ' (D1 & Edge Cache synced)', 'ok');
          return loadTaxonomy().then(function () {
            if (opts.onSaved && d && d.node) opts.onSaved(d.node);
            renderCurrentView();
          });
        }).catch(function (err) { toast(err.message, 'crimson'); });
      })
    ]);
  }

  // ---------- Data Loaders ----------
  function syncSidebarAndFlyoutCache(bustSession) {
    if (bustSession) {
      try {
        sessionStorage.removeItem('cso_jobs_flyout_v277');
        sessionStorage.removeItem('cso_jobs_flyout_v276');
        sessionStorage.removeItem('cso_jobs_flyout_v275');
      } catch (_e) {}
    }
    if (window.CSOStudio && typeof window.CSOStudio.setJobsSectorNodes === 'function' && Array.isArray(state.taxonomyNodes) && state.taxonomyNodes.length) {
      window.CSOStudio.setJobsSectorNodes(state.taxonomyNodes);
    }
  }

  function loadArticles() {
    var qs = new URLSearchParams();
    if (state.filters.l1) qs.set('l1', state.filters.l1);
    if (state.filters.l2) qs.set('l2', state.filters.l2);
    if (state.filters.l3) qs.set('l3', state.filters.l3);
    if (state.filters.region) qs.set('region', state.filters.region);
    if (state.filters.stage) qs.set('stage', state.filters.stage);
    if (state.filters.status) qs.set('status', state.filters.status);
    if (state.filters.q) qs.set('q', state.filters.q);
    return api('/api/admin/jobs/articles?' + qs.toString()).then(function (d) {
      state.kpis = d.kpis || null;
      state.articles = d.items || [];
      if (Array.isArray(d.taxonomy_nodes)) state.taxonomyNodes = d.taxonomy_nodes;
      syncSidebarAndFlyoutCache(false);
      if (window.CSOStudio && window.CSOStudio.refreshBrandSummary) window.CSOStudio.refreshBrandSummary();
      return d;
    });
  }

  function loadTaxonomy() {
    return api('/api/admin/jobs/taxonomy').then(function (d) {
      state.taxonomyNodes = d.nodes || [];
      syncSidebarAndFlyoutCache(true);
      return d;
    });
  }

  function loadSnippets() {
    return api('/api/admin/jobs/snippets').then(function (d) {
      state.snippets = d.items || [];
      return d;
    });
  }

  function loadStudyOptions() {
    return api('/api/admin/jobs/study-options').then(function (d) {
      state.studyOptions = d.items || [];
      return d;
    }).catch(function () { state.studyOptions = []; });
  }

  // ---------- R2 Direct Upload Helper ----------
  function uploadJobFile(file, purpose, onDone, statusNode) {
    if (!file) return;
    var fd = new FormData();
    fd.append('file', file);
    fd.append('purpose', purpose || 'asset');
    if (statusNode) statusNode.textContent = 'Uploading ' + file.name + ' to R2…';
    api('/api/admin/jobs/upload', 'POST', fd, true).then(function (d) {
      if (statusNode) statusNode.textContent = 'Uploaded: ' + d.filename + ' (' + Math.round((d.size_bytes || 0) / 1024) + ' KB)';
      toast('Uploaded ' + d.filename + ' to R2', 'ok');
      if (onDone) onDone(d);
    }).catch(function (err) {
      if (statusNode) statusNode.textContent = 'Upload failed: ' + err.message;
      toast('Upload error: ' + err.message, 'crimson');
    });
  }

  function buildDropzone(opts) {
    var dz = el('div', 'jph-dropzone');
    var status = el('div', 'jph-muted', opts.hint || 'Drag & drop file here or choose from device');
    var input = el('input', 'jph-file-hidden');
    input.type = 'file';
    input.accept = opts.accept || 'application/pdf,image/jpeg,image/png,image/webp';
    input.id = 'jph_up_' + Math.random().toString(36).slice(2, 8);
    var lbl = el('label', 'jph-btn jph-btn--xs', opts.buttonLabel || 'Choose File & Upload to R2');
    lbl.setAttribute('for', input.id);
    input.addEventListener('change', function () {
      if (input.files && input.files[0]) {
        uploadJobFile(input.files[0], opts.purpose, opts.onUploaded, status);
        input.value = '';
      }
    });
    dz.addEventListener('dragover', function (e) { e.preventDefault(); dz.classList.add('is-dragover'); });
    dz.addEventListener('dragleave', function () { dz.classList.remove('is-dragover'); });
    dz.addEventListener('drop', function (e) {
      e.preventDefault();
      dz.classList.remove('is-dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        uploadJobFile(e.dataTransfer.files[0], opts.purpose, opts.onUploaded, status);
      }
    });
    dz.appendChild(input);
    var row = el('div', 'jph-actions-row');
    row.appendChild(lbl);
    if (opts.extraButton) row.appendChild(opts.extraButton);
    dz.appendChild(row);
    dz.appendChild(status);
    return dz;
  }

  // ---------- Dynamic JSON Table Row Builder ----------
  function buildDynamicTableCard(title, subtitle, rowsArr, columns, onChange) {
    var card = el('div', 'jph-card');
    var head = el('div', 'jph-card-head');
    var tWrap = el('div');
    tWrap.appendChild(el('h3', 'jph-card-title', title));
    if (subtitle) tWrap.appendChild(el('div', 'jph-muted', subtitle));
    head.appendChild(tWrap);
    var listBox = el('div', 'jph-rows-box');

    function redraw() {
      clear(listBox);
      if (!rowsArr.length) {
        listBox.appendChild(el('div', 'jph-muted', 'No rows added yet — click "+ Add Row" to add structured entries.'));
        return;
      }
      rowsArr.forEach(function (row, idx) {
        var item = el('div', 'jph-row-item');
        columns.forEach(function (col) {
          var ctrl;
          if (col.type === 'select') {
            ctrl = el('select', 'jph-select');
            (col.options || []).forEach(function (o) {
              var op = el('option', '', Array.isArray(o) ? o[1] : o);
              op.value = Array.isArray(o) ? o[0] : o;
              if (String(row[col.key] || '') === op.value) op.selected = true;
              ctrl.appendChild(op);
            });
            ctrl.addEventListener('change', function () { row[col.key] = ctrl.value; if (onChange) onChange(); });
          } else if (col.type === 'checkbox') {
            var chkLbl = el('label', 'jph-check-label');
            ctrl = el('input');
            ctrl.type = 'checkbox';
            ctrl.checked = Boolean(row[col.key]);
            ctrl.addEventListener('change', function () { row[col.key] = ctrl.checked; if (onChange) onChange(); });
            chkLbl.appendChild(ctrl);
            chkLbl.appendChild(el('span', '', col.label));
            item.appendChild(chkLbl);
            return;
          } else {
            ctrl = el('input', 'jph-input');
            ctrl.type = col.type || 'text';
            ctrl.placeholder = col.placeholder || col.label;
            ctrl.value = row[col.key] == null ? '' : String(row[col.key]);
            ctrl.setAttribute('aria-label', col.label);
            ctrl.addEventListener('input', function () { row[col.key] = ctrl.value; if (onChange) onChange(); });
          }
          item.appendChild(ctrl);
        });
        item.appendChild(btn('✕', 'jph-btn jph-btn--xs jph-btn--danger', function () {
          rowsArr.splice(idx, 1);
          if (onChange) onChange();
          redraw();
        }));
        listBox.appendChild(item);
      });
    }

    head.appendChild(btn('+ Add Row', 'jph-btn jph-btn--xs', function () {
      var blank = {};
      columns.forEach(function (c) { blank[c.key] = c.defaultValue !== undefined ? c.defaultValue : ''; });
      rowsArr.push(blank);
      if (onChange) onChange();
      redraw();
    }));

    card.appendChild(head);
    card.appendChild(listBox);
    redraw();
    return card;
  }

  // ======================================================================
  // TAB 1A: ARTICLES LIST VIEW
  // ======================================================================
  function renderArticlesList(container) {
    var k = state.kpis || {
      total_jobs: 0, published_live: 0, scheduled_or_draft: 0,
      closing_soon: 0, total_vacancies: 0, total_apply_clicks: 0, total_pdf_downloads: 0
    };

    // 1. KPI Strip
    var kpiGrid = el('div', 'jph-kpi-grid');
    [
      ['Total Jobs', num(k.total_jobs), 'All recruitment articles', 'emerald'],
      ['Published Live', num(k.published_live), 'Visible on /jobs/', 'teal'],
      ['Scheduled / Drafts', num(k.scheduled_or_draft), 'Editorial queue', 'amber'],
      ['Closing Soon (<=7d)', num(k.closing_soon), 'Urgent deadlines', 'rose'],
      ['Total Vacancies', num(k.total_vacancies), 'Notified posts across jobs', 'cobalt'],
      ['Engagement', num((k.total_apply_clicks || 0) + (k.total_pdf_downloads || 0)), num(k.total_apply_clicks) + ' Apply · ' + num(k.total_pdf_downloads) + ' PDFs', 'violet']
    ].forEach(function (t) {
      var card = el('div', 'jph-kpi jph-kpi--' + t[3]);
      card.appendChild(el('span', 'jph-kpi__label', t[0]));
      card.appendChild(el('strong', 'jph-kpi__value', t[1]));
      card.appendChild(el('span', 'jph-kpi__sub', t[2]));
      kpiGrid.appendChild(card);
    });
    container.appendChild(kpiGrid);

    // 2. Cascading 3-Layer Filter Bar + CTA
    var filterCard = el('section', 'jph-card');
    var fHead = el('div', 'jph-card-head');
    var fhLeft = el('div');
    fhLeft.appendChild(el('h2', 'jph-card-title', 'Published & Draft Job Articles'));
    fhLeft.appendChild(el('div', 'jph-muted', 'Filter across 3-layer taxonomy, lifecycle stage, and live status.'));
    fHead.appendChild(fhLeft);
    var fhRight = el('div', 'jph-actions-row');
    fhRight.appendChild(btn('↻ Refresh', 'jph-btn', function () {
      loadArticles().then(renderCurrentView).catch(function (e) { toast(e.message, 'crimson'); });
    }));
    if (window.CSOPublishTools && window.CSOPublishTools.openBulkImporter) {
      fhRight.appendChild(btn('📥 Bulk CSV/JSON Import', 'jph-btn', function () {
        window.CSOPublishTools.openBulkImporter('jobs', function () { loadArticles().then(renderCurrentView); });
      }));
    }
    fhRight.appendChild(btn('+ Publish New Job Article', 'jph-btn jph-btn--primary', function () {
      openComposer(null);
    }));
    fHead.appendChild(fhRight);
    filterCard.appendChild(fHead);

    var fGrid = el('div', 'jph-filter-grid');

    function makeSelect(label, options, val, onChange) {
      var w = el('div', 'jph-field');
      w.appendChild(el('label', 'jph-label', label));
      var s = el('select', 'jph-select');
      options.forEach(function (o) {
        var op = el('option', '', o[1]); op.value = o[0];
        if (o[0] === val) op.selected = true;
        s.appendChild(op);
      });
      s.addEventListener('change', function () { onChange(s.value); });
      w.appendChild(s);
      return w;
    }

    var l1Opts = [['', 'All Main Categories']].concat(nodesByLevel(1).map(function (n) { return [n.id, (n.icon ? n.icon + ' ' : '') + n.title_en]; }));
    var l2Opts = [['', 'All Subcategories']].concat(
      (state.filters.l1 ? nodesByLevel(2, state.filters.l1) : nodesByLevel(2)).map(function (n) { return [n.id, n.title_en]; })
    );
    var l3Opts = [['', 'All Further Subcategories']].concat(
      (state.filters.l2 ? nodesByLevel(3, state.filters.l2) : nodesByLevel(3)).map(function (n) { return [n.id, n.title_en]; })
    );

    fGrid.appendChild(makeSelect('1. Main Category (L1)', l1Opts, state.filters.l1, function (v) {
      state.filters.l1 = v; state.filters.l2 = ''; state.filters.l3 = '';
      if (window.CSOStudio && window.CSOStudio.setJobsActiveSector) window.CSOStudio.setJobsActiveSector(v);
      loadArticles().then(renderCurrentView);
    }));
    fGrid.appendChild(makeSelect('2. Subcategory / Dept (L2)', l2Opts, state.filters.l2, function (v) {
      state.filters.l2 = v; state.filters.l3 = '';
      loadArticles().then(renderCurrentView);
    }));
    fGrid.appendChild(makeSelect('3. Further Subcategory (L3)', l3Opts, state.filters.l3, function (v) {
      state.filters.l3 = v;
      loadArticles().then(renderCurrentView);
    }));
    fGrid.appendChild(makeSelect('Geographic Scope', [['', 'All Scopes']].concat(REGION_SCOPES), state.filters.region, function (v) {
      state.filters.region = v;
      loadArticles().then(renderCurrentView);
    }));
    fGrid.appendChild(makeSelect('Lifecycle Stage', [['', 'All Stages']].concat(STAGES), state.filters.stage, function (v) {
      state.filters.stage = v;
      loadArticles().then(renderCurrentView);
    }));
    fGrid.appendChild(makeSelect('Status', [['', 'All Statuses'], ['published', 'Published'], ['scheduled', 'Scheduled'], ['draft', 'Draft']], state.filters.status, function (v) {
      state.filters.status = v;
      loadArticles().then(renderCurrentView);
    }));

    var qWrap = el('div', 'jph-field');
    qWrap.appendChild(el('label', 'jph-label', 'Search'));
    var qInp = el('input', 'jph-input');
    qInp.type = 'search';
    qInp.placeholder = 'Title, Org, Advt No…';
    qInp.value = state.filters.q;
    var qTimer = null;
    qInp.addEventListener('input', function () {
      state.filters.q = qInp.value;
      clearTimeout(qTimer);
      qTimer = setTimeout(function () { loadArticles().then(renderCurrentView); }, 280);
    });
    qWrap.appendChild(qInp);
    fGrid.appendChild(qWrap);
    filterCard.appendChild(fGrid);

    // 3. Articles Table
    var tWrap = el('div', 'jph-table-wrap');
    var table = el('table', 'jph-table');
    var thead = el('thead');
    var hr = el('tr');
    ['Job Article & Taxonomy', 'Organisation & Vacancies', 'Last Date & Stage', 'Engagement Telemetry', 'Actions'].forEach(function (h) {
      hr.appendChild(el('th', '', h));
    });
    thead.appendChild(hr);
    table.appendChild(thead);

    var tbody = el('tbody');
    if (!state.articles.length) {
      var er = el('tr');
      var etd = el('td');
      etd.colSpan = 5;
      etd.appendChild(el('div', 'jph-muted', 'No job articles found yet. Click "+ Publish New Job Article" to create your first rich bilingual job post.'));
      er.appendChild(etd);
      tbody.appendChild(er);
    } else {
      state.articles.forEach(function (a) {
        var tr = el('tr');

        // Col 1: Title + 3-Layer Breadcrumb
        var td1 = el('td');
        var tc = el('div', 'jph-title-cell');
        tc.appendChild(el('div', 'jph-title-main', a.title_en));
        if (a.title_or) tc.appendChild(el('div', 'jph-title-or', a.title_or));
        var crumbs = el('div', 'jph-crumb-pills');
        var stCls = a.publication_status === 'published' ? 'published' : (a.publication_status === 'scheduled' ? 'scheduled' : 'draft');
        crumbs.appendChild(el('span', 'jph-pill jph-pill--' + stCls, a.publication_status.toUpperCase()));
        if (a.taxonomy && a.taxonomy.l1) crumbs.appendChild(el('span', 'jph-pill', a.taxonomy.l1.title_en));
        if (a.taxonomy && a.taxonomy.l2) crumbs.appendChild(el('span', 'jph-pill', '› ' + a.taxonomy.l2.title_en));
        if (a.taxonomy && a.taxonomy.l3) crumbs.appendChild(el('span', 'jph-pill', '› ' + a.taxonomy.l3.title_en));
        tc.appendChild(crumbs);
        td1.appendChild(tc);
        tr.appendChild(td1);

        // Col 2: Org & Vacancies
        var td2 = el('td');
        td2.appendChild(el('div', '', a.organisation_en || '—'));
        td2.appendChild(el('div', 'jph-muted', (a.total_vacancies ? num(a.total_vacancies) + ' Posts' : 'Vacancies N/A') + (a.advt_number ? ' · ' + a.advt_number : '')));
        tr.appendChild(td2);

        // Col 3: Last Date & Stage
        var td3 = el('td');
        td3.appendChild(el('div', '', a.last_date || 'No deadline set'));
        var stagePill = el('span', 'jph-pill' + (a.is_expired ? ' jph-pill--closed' : ''), a.is_expired ? 'Closed · ' + a.stage_label : a.stage_label);
        td3.appendChild(stagePill);
        tr.appendChild(td3);

        // Col 4: Telemetry
        var td4 = el('td');
        var tel = el('div', 'jph-telemetry');
        tel.appendChild(el('span', '', '👁 ' + num(a.views_count)));
        tel.appendChild(el('span', '', '🔗 ' + num(a.apply_clicks_count)));
        tel.appendChild(el('span', '', '⬇ ' + num(a.pdf_downloads_count)));
        tel.appendChild(el('span', '', '🔖 ' + num(a.bookmarks_count)));
        td4.appendChild(tel);
        tr.appendChild(td4);

        // Col 5: Actions
        var td5 = el('td');
        var act = el('div', 'jph-actions-row');
        act.appendChild(btn('Edit', 'jph-btn jph-btn--xs', function () {
          api('/api/admin/jobs/articles/' + encodeURIComponent(a.id)).then(function (d) {
            state.revisions = d.revisions || [];
            openComposer(d.item || a);
          }).catch(function () { openComposer(a); });
        }));
        act.appendChild(btn('Preview ↗', 'jph-btn jph-btn--xs jph-btn--preview', function () {
          if (a.is_published) {
            window.open('/jobs/?slug=' + encodeURIComponent(a.slug), '_blank', 'noopener');
          } else {
            api('/api/admin/jobs/' + encodeURIComponent(a.id) + '/preview-token', 'POST', {}).then(function (p) {
              window.open(p.preview_url, '_blank', 'noopener');
              toast('Opened live draft preview (expires in 2h)', 'ok');
            }).catch(function (e) { toast(e.message, 'crimson'); });
          }
        }));
        act.appendChild(btn('Broadcast', 'jph-btn jph-btn--xs', function () {
          copyToClipboard(buildBroadcastText(a), 'Copied bilingual Telegram / WhatsApp broadcast!');
        }));
        act.appendChild(btn('Duplicate', 'jph-btn jph-btn--xs', function () {
          if (window.CSOPublishTools && window.CSOPublishTools.duplicateItem) {
            window.CSOPublishTools.duplicateItem('jobs', a.id, function (cloned) {
              loadArticles().then(function () { if (cloned) openComposer(cloned); else renderCurrentView(); });
            });
          }
        }));
        act.appendChild(btn('Delete', 'jph-btn jph-btn--xs jph-btn--danger', function () {
          if (!window.confirm('Delete "' + a.title_en + '" permanently?')) return;
          api('/api/admin/jobs/articles/' + encodeURIComponent(a.id), 'DELETE').then(function () {
            toast('Job article deleted & caches purged', 'ok');
            loadArticles().then(renderCurrentView);
          }).catch(function (e) { toast(e.message, 'crimson'); });
        }));
        td5.appendChild(act);
        tr.appendChild(td5);

        tbody.appendChild(tr);
      });
    }
    table.appendChild(tbody);
    tWrap.appendChild(table);
    filterCard.appendChild(tWrap);
    container.appendChild(filterCard);
  }

  // ======================================================================
  // TAB 1B: FULL EDITORIAL COMPOSER (All 10 Capabilities)
  // ======================================================================
  function openComposer(article) {
    state.mode = 'composer';
    state.extractedDraft = null;
    state.activePreviewUrl = '';
    state.activePreviewExp = '';
    if (article) {
      state.draft = Object.assign(emptyDraft(), article, {
        vacancy_breakdown: Array.isArray(article.vacancy_breakdown) ? article.vacancy_breakdown.map(function (x) { return Object.assign({}, x); }) : [],
        important_dates: Array.isArray(article.important_dates) ? article.important_dates.map(function (x) { return Object.assign({}, x); }) : [],
        fee_structure: Array.isArray(article.fee_structure) ? article.fee_structure.map(function (x) { return Object.assign({}, x); }) : [],
        selection_steps: Array.isArray(article.selection_steps) ? article.selection_steps.map(function (x) { return Object.assign({}, x); }) : [],
        cutoff_reference: Array.isArray(article.cutoff_reference) ? article.cutoff_reference.map(function (x) { return Object.assign({}, x); }) : [],
        lifecycle_updates: Array.isArray(article.lifecycle_updates) ? article.lifecycle_updates.map(function (x) { return Object.assign({}, x); }) : [],
        pdf_index_bookmarks: Array.isArray(article.pdf_index_bookmarks) ? article.pdf_index_bookmarks.map(function (x) { return Object.assign({}, x); }) : [],
        extra_attachments: Array.isArray(article.extra_attachments) ? article.extra_attachments.map(function (x) { return Object.assign({}, x); }) : [],
        linked_study_ids: Array.isArray(article.linked_study_ids) ? article.linked_study_ids.slice() : [],
        change_summary: ''
      });
    } else {
      state.draft = emptyDraft();
      state.revisions = [];
    }
    Promise.all([loadSnippets(), loadStudyOptions()]).then(renderCurrentView);
  }

  function saveDraftToServer(publishFlag, openPreviewAfter) {
    var d = state.draft;
    if (!d.title_en || !d.title_en.trim()) {
      toast('Please enter the English Job Title before saving.', 'crimson');
      return Promise.reject(new Error('Title required'));
    }
    if (d.quiz_json && window.CSOQuizBuilder && typeof window.CSOQuizBuilder.validateQuizJsonString === 'function') {
      var qCheck = window.CSOQuizBuilder.validateQuizJsonString(d.quiz_json);
      if (!qCheck.ok) {
        toast('Practice Quiz JSON error: ' + qCheck.error, 'crimson');
        return Promise.reject(new Error(qCheck.error));
      }
    }
    if (!d.slug) d.slug = slugify(d.title_en);
    var payload = Object.assign({}, d, {
      is_published: publishFlag !== undefined ? (publishFlag ? 1 : 0) : (d.is_published ? 1 : 0)
    });
    var req = d.id
      ? api('/api/admin/jobs/articles/' + encodeURIComponent(d.id), 'PUT', payload)
      : api('/api/admin/jobs/articles', 'POST', payload);

    return req.then(function (res) {
      if (res && res.item) {
        state.draft = Object.assign(emptyDraft(), res.item, { change_summary: '' });
      }
      if (payload.is_published) {
        state.lastPublishedInfo = {
          title: state.draft.title_en || 'Post',
          slug: state.draft.slug || '',
          stage: state.draft.lifecycle_stage || 'notification',
          ts: Date.now()
        };
        try {
          localStorage.setItem('cso_home_feed_bust', String(Date.now()));
          if (typeof window.BroadcastChannel === 'function') {
            var ch = new BroadcastChannel('cso-publish-sync');
            ch.postMessage({ type: 'published', slug: state.draft.slug || '' });
            ch.close();
          }
        } catch (_) {}
      }
      toast(payload.is_published ? 'Published & Homepage Cache Purged — View Live on Homepage ↗' : 'Draft saved to D1!', 'ok');
      if (payload.is_published && !openPreviewAfter && window.CSOPublishTools && window.CSOPublishTools.runPublishChain) {
        window.CSOPublishTools.runPublishChain('jobs', state.draft);
      }
      if (openPreviewAfter && state.draft.id) {
        return api('/api/admin/jobs/' + encodeURIComponent(state.draft.id) + '/preview-token', 'POST', {}).then(function (p) {
          state.activePreviewUrl = p.preview_url;
          state.activePreviewExp = p.preview_expires_at;
          window.open(p.preview_url, '_blank', 'noopener');
          toast('Real Public Page Preview opened (valid for 2h)', 'ok');
          renderCurrentView();
          return p;
        });
      }
      return api('/api/admin/jobs/articles/' + encodeURIComponent(state.draft.id) + '/revisions').then(function (rv) {
        state.revisions = rv.revisions || [];
        renderCurrentView();
      }).catch(function () { renderCurrentView(); });
    }).catch(function (err) {
      toast('Save failed: ' + err.message, 'crimson');
    });
  }

  function renderComposer(container) {
    var d = state.draft || emptyDraft();

    // Sticky Top Editorial Bar
    var bar = el('div', 'jph-composer-bar');
    var barLeft = el('div', 'jph-actions-row');
    barLeft.appendChild(btn('← Back to Jobs List', 'jph-btn', function () {
      state.mode = 'list';
      loadArticles().then(renderCurrentView);
    }));
    barLeft.appendChild(el('strong', '', d.id ? ('Editing: ' + (d.title_en || 'Untitled')) : 'New Job Article Composer'));
    bar.appendChild(barLeft);

    var barRight = el('div', 'jph-actions-row');
    if (window.CSOAiCoAuthor && window.CSOAiCoAuthor.createTranslateAllBtn) {
      barRight.appendChild(window.CSOAiCoAuthor.createTranslateAllBtn(function () {
        return [
          { key: 'title_or', getEn: function () { return d.title_en; }, getOr: function () { return d.title_or; }, setOr: function (v) { d.title_or = v; } },
          { key: 'organisation_or', getEn: function () { return d.organisation_en; }, getOr: function () { return d.organisation_or; }, setOr: function (v) { d.organisation_or = v; } },
          { key: 'summary_or', getEn: function () { return d.summary_en; }, getOr: function () { return d.summary_or; }, setOr: function (v) { d.summary_or = v; } },
          { key: 'article_body_or', getEn: function () { return d.article_body_en; }, getOr: function () { return d.article_body_or; }, setOr: function (v) { d.article_body_or = v; } },
          { key: 'corrigendum_note_or', getEn: function () { return d.corrigendum_note_en; }, getOr: function () { return d.corrigendum_note_or; }, setOr: function (v) { d.corrigendum_note_or = v; } }
        ];
      }, function () { renderCurrentView(); }));
    }
    barRight.appendChild(btn('📋 Copy Broadcast (EN+ଓଡ଼ିଆ)', 'jph-btn', function () {
      copyToClipboard(buildBroadcastText(d), 'Bilingual Telegram / WhatsApp broadcast copied!');
    }));
    barRight.appendChild(btn('Save Draft & Open Public Preview ↗', 'jph-btn jph-btn--preview', function () {
      saveDraftToServer(false, true);
    }));
    barRight.appendChild(btn('Save Draft', 'jph-btn', function () {
      saveDraftToServer(false, false);
    }));
    barRight.appendChild(btn('Publish Live →', 'jph-btn jph-btn--primary', function () {
      saveDraftToServer(true, false);
    }));
    bar.appendChild(barRight);
    container.appendChild(bar);

    if (window.CSOAiCoAuthor && window.CSOAiCoAuthor.renderMetaSuggester) {
      container.appendChild(window.CSOAiCoAuthor.renderMetaSuggester({
        kind: 'Odisha government job recruitment',
        getSeedText: function () { return [d.title_en, d.organisation_en, d.summary_en].filter(Boolean).join(' — '); },
        onApplyTitlePair: function (en, or, sl) {
          d.title_en = en;
          if (or) d.title_or = or;
          if (sl && !d._slugTouched) d.slug = sl;
          state.draft = d;
          renderCurrentView();
        },
        onApplySlug: function (sl) {
          d.slug = sl;
          d._slugTouched = true;
          state.draft = d;
          renderCurrentView();
        },
        onApplyTag: function (tag) {
          if (!d.sector_badge) d.sector_badge = tag;
        }
      }));
    }

    if (window.CSOAiCoAuthor && window.CSOAiCoAuthor.renderDrawer) {
      container.appendChild(window.CSOAiCoAuthor.renderDrawer({
        mode: 'job',
        hint: 'Paste raw OPSC / OSSC / OSSSC / Central recruitment notice text. Auto-fills bilingual EN + ଓଡ଼ିଆ title, slug, summary & eligibility table.',
        onApply: function (data) {
          if (data.title_en) d.title_en = data.title_en;
          if (data.title_or) d.title_or = data.title_or;
          if (data.slug) d.slug = data.slug;
          if (data.summary_en) d.summary_en = data.summary_en;
          if (data.summary_or) d.summary_or = data.summary_or;
          if (data.eligibility_table_html) {
            d.article_body_en = (d.article_body_en ? d.article_body_en + '\n\n' : '') + data.eligibility_table_html;
          }
          state.draft = d;
          renderCurrentView();
        }
      }));
    }

    if (state.activePreviewUrl) {
      var pvBox = el('div', 'jph-preview-box');
      pvBox.appendChild(el('span', '', 'Live Draft Preview Token Active (Expires: ' + state.activePreviewExp.slice(0, 19).replace('T', ' ') + ' UTC)'));
      var pvActs = el('div', 'jph-actions-row');
      var pvLink = el('a', 'jph-btn jph-btn--xs jph-btn--preview', 'Open Real Public Page Preview ↗');
      pvLink.href = state.activePreviewUrl;
      pvLink.target = '_blank';
      pvLink.rel = 'noopener noreferrer';
      pvActs.appendChild(pvLink);
      pvActs.appendChild(btn('Copy Preview URL', 'jph-btn jph-btn--xs', function () {
        copyToClipboard(window.location.origin + state.activePreviewUrl, 'Preview link copied!');
      }));
      pvBox.appendChild(pvActs);
      container.appendChild(pvBox);
    }

    // SECTION 1: Cascading 3-Layer Category Selector with Inline "+ Add Option"
    var taxCard = el('section', 'jph-card');
    taxCard.appendChild(el('h3', 'jph-card-title', '1. Cascading 3-Layer Category Taxonomy (Main → Sub → Further Subcategory)'));
    var taxGrid = el('div', 'jph-form-grid');

    // L1
    var wL1 = el('div', 'jph-field');
    var l1Head = el('div', 'jph-label-row');
    l1Head.appendChild(el('label', 'jph-label', 'Main Category (Level 1)'));
    l1Head.appendChild(btn('+ Add Main Category', 'jph-btn jph-btn--xs', function () {
      openTaxonomyNodeModal({
        level: 1,
        onSaved: function (node) {
          d.category_l1_id = node.id; d.category_l2_id = ''; d.category_l3_id = '';
          if (!d.sector_badge) d.sector_badge = node.title_en;
        }
      });
    }));
    var sL1 = el('select', 'jph-select');
    sL1.appendChild(el('option', '', '-- Select Main Category --'));
    nodesByLevel(1).forEach(function (n) {
      var o = el('option', '', (n.icon ? n.icon + ' ' : '') + n.title_en + (n.title_or ? ' · ' + n.title_or : ''));
      o.value = n.id;
      if (d.category_l1_id === n.id) o.selected = true;
      sL1.appendChild(o);
    });
    sL1.addEventListener('change', function () {
      d.category_l1_id = sL1.value;
      d.category_l2_id = '';
      d.category_l3_id = '';
      var n = findNode(sL1.value);
      if (n) d.sector_badge = n.title_en;
      if (isForeignSectorId(sL1.value)) {
        d.region_scope = 'foreign';
        d.location_district = 'Foreign / Overseas';
      } else if (d.region_scope === 'foreign') {
        d.region_scope = 'odisha';
        if (d.location_district === 'Foreign / Overseas') d.location_district = 'All Odisha';
      }
      renderCurrentView();
    });
    wL1.appendChild(l1Head); wL1.appendChild(sL1);
    taxGrid.appendChild(wL1);

    // L2
    var wL2 = el('div', 'jph-field');
    var l2Head = el('div', 'jph-label-row');
    l2Head.appendChild(el('label', 'jph-label', 'Subcategory / Dept (Level 2)'));
    var addL2Btn = btn('+ Add Subcategory', 'jph-btn jph-btn--xs', function () {
      if (!d.category_l1_id) { toast('Select a Main Category (L1) first', 'crimson'); return; }
      openTaxonomyNodeModal({
        level: 2, parentId: d.category_l1_id,
        onSaved: function (node) { d.category_l2_id = node.id; d.category_l3_id = ''; }
      });
    });
    l2Head.appendChild(addL2Btn);
    var sL2 = el('select', 'jph-select');
    sL2.appendChild(el('option', '', d.category_l1_id ? '-- Select Subcategory --' : '-- Choose L1 First --'));
    (d.category_l1_id ? nodesByLevel(2, d.category_l1_id) : []).forEach(function (n) {
      var o = el('option', '', (n.icon ? n.icon + ' ' : '') + n.title_en + (n.title_or ? ' · ' + n.title_or : ''));
      o.value = n.id;
      if (d.category_l2_id === n.id) o.selected = true;
      sL2.appendChild(o);
    });
    sL2.addEventListener('change', function () {
      d.category_l2_id = sL2.value;
      d.category_l3_id = '';
      renderCurrentView();
    });
    wL2.appendChild(l2Head); wL2.appendChild(sL2);
    taxGrid.appendChild(wL2);

    // L3
    var wL3 = el('div', 'jph-field');
    var l3Head = el('div', 'jph-label-row');
    l3Head.appendChild(el('label', 'jph-label', 'Further Subcategory / Type (Level 3)'));
    l3Head.appendChild(btn('+ Add Further Subcategory', 'jph-btn jph-btn--xs', function () {
      if (!d.category_l2_id) { toast('Select a Subcategory (L2) first', 'crimson'); return; }
      openTaxonomyNodeModal({
        level: 3, parentId: d.category_l2_id,
        onSaved: function (node) { d.category_l3_id = node.id; }
      });
    }));
    var sL3 = el('select', 'jph-select');
    sL3.appendChild(el('option', '', d.category_l2_id ? '-- Select Further Subcategory --' : '-- Choose L2 First --'));
    (d.category_l2_id ? nodesByLevel(3, d.category_l2_id) : []).forEach(function (n) {
      var o = el('option', '', (n.icon ? n.icon + ' ' : '') + n.title_en + (n.title_or ? ' · ' + n.title_or : ''));
      o.value = n.id;
      if (d.category_l3_id === n.id) o.selected = true;
      sL3.appendChild(o);
    });
    sL3.addEventListener('change', function () { d.category_l3_id = sL3.value; });
    wL3.appendChild(l3Head); wL3.appendChild(sL3);
    taxGrid.appendChild(wL3);

    taxCard.appendChild(taxGrid);
    container.appendChild(taxCard);

    // SECTION 2: PDF-to-Article Auto-Draft Helper & Official PDFs
    var pdfCard = el('section', 'jph-card');
    pdfCard.appendChild(el('h3', 'jph-card-title', '2. Official Notification PDF (Auto-Draft Extractor), Syllabus PDF & Official Links'));
    var pdfGrid = el('div', 'jph-form-grid jph-form-grid--2');

    // Notification PDF dropzone + URL
    var notifWrap = el('div', 'jph-field');
    notifWrap.appendChild(el('label', 'jph-label', 'Official Notification PDF (Drag & Drop to R2 + Auto-Draft)'));
    var notifUrlInp = el('input', 'jph-input');
    notifUrlInp.placeholder = '/api/media/jobs-publishing/... or https://...pdf';
    notifUrlInp.value = d.notification_pdf_url || '';
    notifUrlInp.addEventListener('input', function () { d.notification_pdf_url = notifUrlInp.value.trim(); });
    notifWrap.appendChild(buildDropzone({
      accept: 'application/pdf',
      purpose: 'notification-pdf',
      buttonLabel: 'Upload Notification PDF to R2',
      hint: 'Drop Official Notification PDF here — auto-extracts Advt. No., Vacancies, Dates, Age, Qualification & .gov.in URL',
      onUploaded: function (res) {
        d.notification_pdf_url = res.url;
        notifUrlInp.value = res.url;
        if (res.extracted_draft) {
          state.extractedDraft = res.extracted_draft;
          renderCurrentView();
        }
      }
    }));
    notifWrap.appendChild(notifUrlInp);
    if (window.CSOFilePicker && window.CSOFilePicker.createPickerButton) {
      var nPickRow = el('div', 'fp-trigger-row');
      nPickRow.appendChild(window.CSOFilePicker.createPickerButton({
        folder: 'Jobs',
        input: notifUrlInp,
        label: '📁 Upload or Pick File from R2',
        onSelect: function (u) { d.notification_pdf_url = u; d.notification_url = u; }
      }));
      notifWrap.appendChild(nPickRow);
    }
    pdfGrid.appendChild(notifWrap);

    // Syllabus PDF dropzone + URL
    var sylWrap = el('div', 'jph-field');
    sylWrap.appendChild(el('label', 'jph-label', 'Syllabus / Exam Pattern PDF (Direct R2 Upload)'));
    var sylUrlInp = el('input', 'jph-input');
    sylUrlInp.placeholder = '/api/media/jobs-publishing/... or https://...pdf';
    sylUrlInp.value = d.syllabus_pdf_url || '';
    sylUrlInp.addEventListener('input', function () { d.syllabus_pdf_url = sylUrlInp.value.trim(); });
    sylWrap.appendChild(buildDropzone({
      accept: 'application/pdf',
      purpose: 'syllabus-pdf',
      buttonLabel: 'Upload Syllabus PDF to R2',
      hint: 'Drop Syllabus / Scheme PDF here for inline viewer & download card',
      onUploaded: function (res) { d.syllabus_pdf_url = res.url; sylUrlInp.value = res.url; }
    }));
    sylWrap.appendChild(sylUrlInp);
    if (window.CSOFilePicker && window.CSOFilePicker.createPickerButton) {
      var sPickRow = el('div', 'fp-trigger-row');
      sPickRow.appendChild(window.CSOFilePicker.createPickerButton({
        folder: 'Jobs',
        input: sylUrlInp,
        label: '📁 Upload or Pick File from R2',
        onSelect: function (u) { d.syllabus_pdf_url = u; }
      }));
      sylWrap.appendChild(sPickRow);
    }
    pdfGrid.appendChild(sylWrap);
    pdfCard.appendChild(pdfGrid);

    // Auto-draft pre-fill banner
    if (state.extractedDraft) {
      var ex = state.extractedDraft;
      var hits = [];
      if (ex.advt_number) hits.push('Advt: ' + ex.advt_number);
      if (ex.total_vacancies) hits.push('Vacancies: ' + ex.total_vacancies);
      if (ex.last_date) hits.push('Last Date: ' + ex.last_date);
      if (ex.min_age && ex.max_age) hits.push('Age: ' + ex.min_age + '-' + ex.max_age);
      if (ex.qualification_level) hits.push('Qual: ' + ex.qualification_level);
      if (ex.official_apply_url) hits.push('URL: ' + ex.official_apply_url);
      var ab = el('div', 'jph-autodraft-banner');
      ab.appendChild(el('div', '', hits.length ? ('PDF Auto-Draft Detected: ' + hits.join(' · ')) : 'PDF uploaded to R2! (Scanned/image PDF detected — fill structured fields below.)'));
      if (hits.length) {
        ab.appendChild(btn('Apply Extracted Draft Fields', 'jph-btn jph-btn--xs jph-btn--primary', function () {
          if (ex.advt_number && !d.advt_number) d.advt_number = ex.advt_number;
          if (ex.total_vacancies && !d.total_vacancies) d.total_vacancies = ex.total_vacancies;
          if (ex.application_start_date && !d.application_start_date) d.application_start_date = ex.application_start_date;
          if (ex.last_date && !d.last_date) d.last_date = ex.last_date;
          if (ex.exam_date && !d.exam_date) d.exam_date = ex.exam_date;
          if (ex.min_age && !d.min_age) d.min_age = ex.min_age;
          if (ex.max_age && !d.max_age) d.max_age = ex.max_age;
          if (ex.qualification_level && !d.qualification_level) d.qualification_level = ex.qualification_level;
          if (ex.qualification_summary && !d.qualification_summary) d.qualification_summary = ex.qualification_summary;
          if (ex.official_apply_url && !d.official_apply_url) d.official_apply_url = ex.official_apply_url;
          if (ex.official_website_url && !d.official_website_url) d.official_website_url = ex.official_website_url;
          if (ex.organisation_en && !d.organisation_en) d.organisation_en = ex.organisation_en;
          state.extractedDraft = null;
          toast('Applied extracted PDF metadata to composer!', 'ok');
          renderCurrentView();
        }));
      }
      pdfCard.appendChild(ab);
    }

    // Official Apply URL & Website URL with .gov.in badge
    var linksGrid = el('div', 'jph-form-grid jph-form-grid--2');
    function makeUrlField(label, key, placeholder) {
      var w = el('div', 'jph-field');
      var top = el('div', 'jph-label-row');
      top.appendChild(el('label', 'jph-label', label));
      var badge = el('span', 'jph-pill', '');
      function syncBadge() {
        var v = String(d[key] || '').trim();
        if (!v) { badge.textContent = 'Optional'; badge.className = 'jph-pill'; }
        else if (isGovUrl(v)) { badge.textContent = '✓ Verified .gov.in HTTPS'; badge.className = 'jph-pill jph-pill--gov'; }
        else if (/^https:\/\//i.test(v)) { badge.textContent = 'HTTPS External'; badge.className = 'jph-pill jph-pill--scheduled'; }
        else { badge.textContent = 'Use HTTPS URL'; badge.className = 'jph-pill jph-pill--closed'; }
      }
      top.appendChild(badge);
      var inp = el('input', 'jph-input');
      inp.type = 'url'; inp.placeholder = placeholder; inp.value = d[key] || '';
      inp.addEventListener('input', function () { d[key] = inp.value.trim(); syncBadge(); });
      syncBadge();
      w.appendChild(top); w.appendChild(inp);
      return w;
    }
    linksGrid.appendChild(makeUrlField('Official Apply Online URL', 'official_apply_url', 'https://www.opsc.gov.in/Public/OPSC/Default.aspx'));
    linksGrid.appendChild(makeUrlField('Official Website URL', 'official_website_url', 'https://www.opsc.gov.in/'));
    linksGrid.appendChild(makeUrlField('Notice PDF / Notification URL', 'notification_url', '/files/jobs/... or https://...'));
    linksGrid.appendChild(makeUrlField('Admit Card Download URL', 'admit_card_url', 'https://...'));
    linksGrid.appendChild(makeUrlField('Answer Key URL', 'answer_key_url', 'https://...'));
    linksGrid.appendChild(makeUrlField('Final Result / Merit List URL', 'result_url', 'https://...'));
    pdfCard.appendChild(linksGrid);
    container.appendChild(pdfCard);

    // SECTION 3: Core Job Details, Eligibility & Cover Banner
    var coreCard = el('section', 'jph-card');
    coreCard.appendChild(el('h3', 'jph-card-title', '3. Core Bilingual Details, Eligibility Criteria & Cover Banner'));
    var cg = el('div', 'jph-form-grid');

    function addInput(label, key, opts) {
      opts = opts || {};
      var w = el('div', 'jph-field' + (opts.span ? ' jph-span-' + opts.span : ''));
      var lblRow = el('div', 'jph-label-row');
      lblRow.appendChild(el('label', 'jph-label', label));
      var inp = opts.textarea ? el('textarea', 'jph-textarea') : el('input', 'jph-input');
      if (opts.translateFrom && window.CSOAiCoAuthor && window.CSOAiCoAuthor.createOdiaTranslateBtn) {
        lblRow.appendChild(window.CSOAiCoAuthor.createOdiaTranslateBtn({
          getSource: function () { return d[opts.translateFrom]; },
          targetInput: inp
        }));
      }
      w.appendChild(lblRow);
      if (!opts.textarea) inp.type = opts.type || 'text';
      if (opts.placeholder) inp.placeholder = opts.placeholder;
      inp.value = d[key] == null ? '' : String(d[key]);
      inp.addEventListener('input', function () {
        d[key] = opts.type === 'number' ? (inp.value === '' ? '' : Number(inp.value)) : inp.value;
        if (key === 'title_en' && !d.id && !d._slugTouched) {
          d.slug = slugify(inp.value);
          var slugNode = document.getElementById('jphSlugInput');
          if (slugNode) slugNode.value = d.slug;
        }
        if (key === 'slug') d._slugTouched = true;
      });
      if (opts.id) inp.id = opts.id;
      w.appendChild(inp);
      cg.appendChild(w);
    }

    function addSelect(label, key, options, span) {
      var w = el('div', 'jph-field' + (span ? ' jph-span-' + span : ''));
      w.appendChild(el('label', 'jph-label', label));
      var s = el('select', 'jph-select');
      options.forEach(function (o) {
        var val = Array.isArray(o) ? o[0] : o;
        var txt = Array.isArray(o) ? o[1] : o;
        var op = el('option', '', txt); op.value = val;
        if (String(d[key] || '') === String(val)) op.selected = true;
        s.appendChild(op);
      });
      s.addEventListener('change', function () { d[key] = s.value; });
      w.appendChild(s);
      cg.appendChild(w);
    }

    addInput('Job Title (EN) *', 'title_en', { span: 2, placeholder: 'e.g., OPSC Odisha Civil Services (OAS) Recruitment 2026' });
    addInput('URL Slug', 'slug', { id: 'jphSlugInput', placeholder: 'opsc-oas-recruitment-2026' });
    addInput('Job Title (ଓଡ଼ିଆ)', 'title_or', { span: 2, translateFrom: 'title_en', placeholder: 'ଓଡ଼ିଶା ସିଭିଲ୍ ସର୍ଭିସେସ୍ (OAS) ନିଯୁକ୍ତି ୨୦୨୬' });
    addSelect('Lifecycle Stage', 'lifecycle_stage', STAGES.concat([['current_affairs', 'Daily Current Affairs']]));

    // v384: 1-Click Homepage & Hub Placement Segmented Pill Selector (EN / ଓଡ଼ିଆ)
    var PLACEMENT_OPTIONS = [
      { key: 'job_alert', stage: 'notification', icon: '💼', en: 'Job Alert', or: 'ଚାକିରି ବିଜ୍ଞପ୍ତି', card: 'Job Alerts (jobs[])', hub: '/jobs/', cta: 'Notice →' },
      { key: 'exam_update', stage: 'admit_card', icon: '🪪', en: 'Exam Update & Admit Card', or: 'ପରୀକ୍ଷା ସୂଚନା ଓ ଆଡମିଟ୍ କାର୍ଡ', card: 'Exam Updates & Admit Cards (exam_updates[])', hub: '/exams/', cta: 'Admit Card →' },
      { key: 'exam_result', stage: 'result', icon: '🏆', en: 'Exam Result', or: 'ପରୀକ୍ଷା ଫଳାଫଳ', card: 'Results (results[])', hub: '/exams/#results', cta: 'Result →' },
      { key: 'current_affairs', stage: 'current_affairs', icon: '📰', en: 'Current Affairs', or: 'ଦୈନିକ ସାମ୍ପ୍ରତିକ ଘଟଣାବଳୀ', card: 'Daily Current Affairs (current_affairs[])', hub: '/odisha-special/', cta: 'Brief →' }
    ];
    function detectPlacementKey(draft) {
      var st = String((draft && draft.lifecycle_stage) || '').toLowerCase();
      if (st === 'result') return 'exam_result';
      if (st === 'admit_card' || st === 'exam_date' || st === 'answer_key') return 'exam_update';
      if (st === 'current_affairs') return 'current_affairs';
      var t = String((draft && draft.title_en) || '').toLowerCase();
      if (/\b(result out|scorecard|osstet result)\b/.test(t)) return 'exam_result';
      if (/\b(admit card|city slip|exam schedule|22nd edition)\b/.test(t)) return 'exam_update';
      return 'job_alert';
    }
    var placementWrap = el('div', 'jph-field jph-span-3 jph-placement-box');
    placementWrap.appendChild(el('label', 'jph-label', 'Homepage & Hub Placement / ହୋମପେଜ୍ ଓ ହବ୍ ସ୍ଥାନ (1-Click Routing)'));
    var pillGroup = el('div', 'jph-placement-pills');
    pillGroup.setAttribute('role', 'radiogroup');
    pillGroup.setAttribute('aria-label', 'Homepage & Hub Placement');
    var previewBadge = el('div', 'jph-placement-preview');
    var activeKey = detectPlacementKey(d);
    function renderPlacementPreview(opt) {
      clear(previewBadge);
      previewBadge.appendChild(el('span', 'jph-placement-preview-tag', opt.icon + ' ' + opt.card));
      previewBadge.appendChild(el('span', 'jph-placement-preview-meta', 'Hub: ' + opt.hub + ' · Action Button: '));
      previewBadge.appendChild(el('strong', 'jph-placement-preview-cta', opt.cta));
    }
    PLACEMENT_OPTIONS.forEach(function (opt) {
      var isSel = opt.key === activeKey;
      var pBtn = el('button', 'jph-placement-pill' + (isSel ? ' is-active' : ''));
      pBtn.type = 'button';
      pBtn.setAttribute('role', 'radio');
      pBtn.setAttribute('aria-checked', String(isSel));
      pBtn.setAttribute('data-placement', opt.key);
      pBtn.appendChild(el('span', 'jph-placement-pill-en', opt.icon + ' ' + opt.en));
      pBtn.appendChild(el('span', 'jph-placement-pill-or', opt.or));
      pBtn.addEventListener('click', function () {
        d.lifecycle_stage = opt.stage;
        pillGroup.querySelectorAll('.jph-placement-pill').forEach(function (b) {
          var on = b === pBtn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-checked', String(on));
        });
        var stageSel = cg.querySelector('select.jph-select');
        if (stageSel) stageSel.value = opt.stage;
        renderPlacementPreview(opt);
      });
      pillGroup.appendChild(pBtn);
      if (isSel) renderPlacementPreview(opt);
    });
    placementWrap.appendChild(pillGroup);
    placementWrap.appendChild(previewBadge);
    if (state.lastPublishedInfo && state.lastPublishedInfo.slug === d.slug) {
      var liveBanner = el('div', 'jph-publish-confirm');
      var liveLeft = el('div', 'jph-publish-confirm-left');
      liveLeft.appendChild(el('span', '', '✓ Published & Homepage Cache Purged.'));
      var liveLink = el('a', 'jph-publish-confirm-link', 'View Live on Homepage ↗');
      liveLink.href = '/?refresh=1';
      liveLink.target = '_blank';
      liveLink.rel = 'noopener noreferrer';
      liveLeft.appendChild(liveLink);
      liveBanner.appendChild(liveLeft);
      liveBanner.appendChild(buildAlertGeneratorWidget(function () { return d; }, 'job'));
      placementWrap.appendChild(liveBanner);
    } else if (d.id || d.slug) {
      var shareBar = el('div', 'jph-publish-confirm jph-publish-confirm--subtle');
      shareBar.appendChild(el('span', 'jph-muted', '1-Click WhatsApp / Telegram Alert:'));
      shareBar.appendChild(buildAlertGeneratorWidget(function () { return d; }, 'job'));
      placementWrap.appendChild(shareBar);
    }
    cg.appendChild(placementWrap);
    addInput('Organisation / Commission (EN)', 'organisation_en', { placeholder: 'e.g., Odisha Public Service Commission (OPSC)' });
    addInput('Organisation (ଓଡ଼ିଆ)', 'organisation_or', { translateFrom: 'organisation_en', placeholder: 'ଓଡ଼ିଶା ଲୋକସେବା ଆୟୋଗ' });
    addInput('Advt. / Notification No.', 'advt_number', { placeholder: 'e.g., Advt. No. 12 of 2026-27' });
    addInput('Total Vacancies', 'total_vacancies', { type: 'number', placeholder: '399' });
    addInput('Salary / Pay Scale', 'salary_pay_scale', { placeholder: 'ORSP Level-12 (₹56,100 – ₹1,77,500)' });
    addInput('Selection Mode', 'selection_mode', { placeholder: 'Prelims + Mains + Viva-Voce' });
    addSelect('Qualification Level', 'qualification_level', [['', '-- Select Level --']].concat(QUAL_LEVELS.map(function (q) { return [q, q]; })));
    addInput('Qualification Summary', 'qualification_summary', { span: 2, placeholder: 'Bachelor Degree in any discipline + Odia proficiency' });
    addInput('Min Age (Years)', 'min_age', { type: 'number', placeholder: '21' });
    addInput('Max Age (Years)', 'max_age', { type: 'number', placeholder: '38' });
    addInput('Age Cut-off Date', 'age_cutoff_date', { type: 'date' });
    addInput('Age Limit Summary', 'age_limit_summary', { span: 2, placeholder: '21–38 Years (+5 yrs SEBC/SC/ST/Women, +10 yrs PwBD)' });
    var isForeignComp = isForeignSectorId(d.category_l1_id);
    if (isForeignComp) {
      d.region_scope = 'foreign';
    } else if (d.region_scope === 'foreign') {
      d.region_scope = 'odisha';
    }
    var composerScopes = isForeignComp
      ? [['foreign', 'Foreign / Overseas (Locked for Foreign Jobs)']]
      : REGION_SCOPES.filter(function (pair) { return pair[0] !== 'foreign'; });
    addSelect('Geographic Scope (Region)', 'region_scope', composerScopes);
    if (isForeignComp) {
      var allSelects = cg.querySelectorAll('select.jph-select');
      var lastSel = allSelects[allSelects.length - 1];
      if (lastSel) lastSel.disabled = true;
    }
    addSelect('Location / District', 'location_district', ODISHA_DISTRICTS.map(function (dist) { return [dist, dist]; }));
    addInput('Application Start Date', 'application_start_date', { type: 'date' });
    addInput('Last Date to Apply', 'last_date', { type: 'date' });
    addInput('Expected Exam Date', 'exam_date', { placeholder: 'e.g., 2026-12-20 or December 2026' });
    addInput('Short Summary (EN)', 'summary_en', { span: 3, textarea: true, placeholder: 'Concise 2-sentence English summary for cards & SEO description…' });
    addInput('Short Summary (ଓଡ଼ିଆ)', 'summary_or', { span: 3, textarea: true, translateFrom: 'summary_en', placeholder: 'ଓଡ଼ିଆରେ ସଂକ୍ଷିପ୍ତ ବିବରଣୀ…' });

    var domLbl = el('label', 'jph-check-label');
    var domCb = el('input'); domCb.type = 'checkbox'; domCb.checked = Boolean(d.odisha_domicile_required);
    domCb.addEventListener('change', function () { d.odisha_domicile_required = domCb.checked ? 1 : 0; });
    domLbl.appendChild(domCb); domLbl.appendChild(el('span', '', 'Odisha Domicile / Odia Proficiency Required'));
    cg.appendChild(domLbl);

    var featLbl = el('label', 'jph-check-label');
    var featCb = el('input'); featCb.type = 'checkbox'; featCb.checked = Boolean(d.is_featured);
    featCb.addEventListener('change', function () { d.is_featured = featCb.checked ? 1 : 0; });
    featLbl.appendChild(featCb); featLbl.appendChild(el('span', '', 'Featured Job (Pin to Top)'));
    cg.appendChild(featLbl);

    coreCard.appendChild(cg);

    // Cover Banner Photo Dropzone + R2 Picker + Preview
    var coverWrap = el('div', 'jph-form-grid jph-form-grid--2');
    var coverLeft = el('div', 'jph-field');
    coverLeft.appendChild(el('label', 'jph-label', 'Cover Banner Photo (Direct R2 Upload or R2 Media Library)'));
    var r2List = el('div', 'jph-r2-list');
    r2List.hidden = true;
    var r2Btn = btn('Pick from R2 Media Library', 'jph-btn jph-btn--xs', function () {
      r2List.hidden = !r2List.hidden;
      if (!r2List.hidden) {
        clear(r2List).appendChild(el('span', 'jph-muted', 'Loading R2 images…'));
        api('/api/admin/media-library?kind=image').then(function (m) {
          clear(r2List);
          var items = m.items || [];
          if (!items.length) { r2List.appendChild(el('span', 'jph-muted', 'No R2 images uploaded yet.')); return; }
          items.slice(0, 20).forEach(function (f) {
            var row = el('div', 'jph-r2-row');
            row.appendChild(el('span', '', f.name));
            row.appendChild(btn('Select', 'jph-btn jph-btn--xs jph-btn--primary', function () {
              d.cover_image_url = f.url;
              r2List.hidden = true;
              renderCurrentView();
            }));
            r2List.appendChild(row);
          });
        }).catch(function (e) { clear(r2List).appendChild(el('span', 'jph-muted', e.message)); });
      }
    });
    coverLeft.appendChild(buildDropzone({
      accept: 'image/jpeg,image/png,image/webp',
      purpose: 'cover-banner',
      buttonLabel: 'Upload Cover Banner Photo',
      hint: 'JPEG, PNG or WebP (1200×630 recommended)',
      extraButton: r2Btn,
      onUploaded: function (res) { d.cover_image_url = res.url; renderCurrentView(); }
    }));
    coverLeft.appendChild(r2List);
    var covUrl = el('input', 'jph-input'); covUrl.placeholder = 'Cover Image URL (/api/media/...)'; covUrl.value = d.cover_image_url || '';
    covUrl.addEventListener('input', function () { d.cover_image_url = covUrl.value.trim(); });
    coverLeft.appendChild(covUrl);
    var covCap = el('input', 'jph-input'); covCap.placeholder = 'Cover Photo Caption (Optional)'; covCap.value = d.cover_image_caption || '';
    covCap.addEventListener('input', function () { d.cover_image_caption = covCap.value; });
    coverLeft.appendChild(covCap);
    coverWrap.appendChild(coverLeft);

    var coverRight = el('div', 'jph-field');
    coverRight.appendChild(el('label', 'jph-label', 'Live Banner Preview'));
    if (d.cover_image_url) {
      var img = el('img', 'jph-cover-preview');
      img.src = d.cover_image_url;
      img.alt = d.cover_image_caption || d.title_en || 'Cover Banner';
      coverRight.appendChild(img);
    } else {
      coverRight.appendChild(el('div', 'jph-dropzone', 'No cover banner selected yet.'));
    }
    coverWrap.appendChild(coverRight);
    coreCard.appendChild(coverWrap);
    container.appendChild(coreCard);

    // SECTION 4: Rich Bilingual Article Editor (EN & Odia) + Reusable Snippets Drawer
    var edCard = el('section', 'jph-card');
    var edHead = el('div', 'jph-card-head');
    edHead.appendChild(el('h3', 'jph-card-title', '4. Rich Bilingual Article Editor (EN & ଓଡ଼ିଆ) + Reusable Snippets'));

    var bodyEn = el('textarea', 'jph-textarea jph-textarea--body');
    bodyEn.placeholder = 'Write full job article in English (Markdown supported: ## Heading, **bold**, - bullet, > callout box, ![caption](/api/media/...), [Label](https://...))';
    bodyEn.value = d.article_body_en || '';
    bodyEn.addEventListener('input', function () { d.article_body_en = bodyEn.value; });

    var bodyOr = el('textarea', 'jph-textarea jph-textarea--body');
    bodyOr.placeholder = 'ଓଡ଼ିଆରେ ବିସ୍ତୃତ ବିବରଣୀ ଲେଖନ୍ତୁ (## ଶୀର୍ଷକ, **ମୋଟା**, - ତାଲିକା, > ସୂଚନା ବକ୍ସ)…';
    bodyOr.value = d.article_body_or || '';
    bodyOr.addEventListener('input', function () { d.article_body_or = bodyOr.value; });

    var activeEditor = bodyEn;
    bodyEn.addEventListener('focus', function () { activeEditor = bodyEn; });
    bodyOr.addEventListener('focus', function () { activeEditor = bodyOr; });

    function insertText(ta, snippet) {
      var start = ta.selectionStart || ta.value.length;
      var end = ta.selectionEnd || start;
      ta.value = ta.value.slice(0, start) + snippet + ta.value.slice(end);
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.focus();
    }

    // Snippet picker dropdown + insert button
    var snipWrap = el('div', 'jph-actions-row');
    var snipSel = el('select', 'jph-select');
    snipSel.appendChild(el('option', '', '-- Insert Reusable Snippet (EN + ଓଡ଼ିଆ) --'));
    (state.snippets || []).forEach(function (sn) {
      var o = el('option', '', sn.title_en + (sn.category ? ' [' + sn.category + ']' : ''));
      o.value = sn.id;
      snipSel.appendChild(o);
    });
    snipWrap.appendChild(snipSel);
    snipWrap.appendChild(btn('Insert Snippet', 'jph-btn jph-btn--xs jph-btn--primary', function () {
      var sn = (state.snippets || []).find(function (x) { return x.id === snipSel.value; });
      if (!sn) { toast('Choose a snippet first', 'crimson'); return; }
      if (sn.body_en) insertText(bodyEn, (bodyEn.value ? '\n\n' : '') + sn.body_en);
      if (sn.body_or) insertText(bodyOr, (bodyOr.value ? '\n\n' : '') + sn.body_or);
      toast('Inserted bilingual snippet: ' + sn.title_en, 'ok');
    }));
    edHead.appendChild(snipWrap);
    edCard.appendChild(edHead);

    var tb = el('div', 'jph-toolbar');
    [
      ['H2', '\n## Section Heading\n'],
      ['H3', '\n### Sub Heading\n'],
      ['Bold', '**important text**'],
      ['Bullet List', '\n- Point 1\n- Point 2\n'],
      ['Callout Box', '\n> Important Notice: Highlight key eligibility or deadline information here.\n'],
      ['Inline Photo', '\n![Image Caption](/api/media/your-image.webp)\n'],
      ['Hyperlink', '[Official Portal](https://www.opsc.gov.in/)']
    ].forEach(function (item) {
      tb.appendChild(btn(item[0], 'jph-btn jph-btn--xs', function () { insertText(activeEditor, item[1]); }));
    });
    edCard.appendChild(tb);

    var edCols = el('div', 'jph-editor-cols');
    var colEn = el('div', 'jph-field'); colEn.appendChild(el('label', 'jph-label', 'Article Body (English)')); colEn.appendChild(bodyEn);
    var colOr = el('div', 'jph-field');
    var colOrHead = el('div', 'jph-label-row');
    colOrHead.appendChild(el('label', 'jph-label', 'Article Body (ଓଡ଼ିଆ)'));
    if (window.CSOAiCoAuthor && window.CSOAiCoAuthor.createOdiaTranslateBtn) {
      colOrHead.appendChild(window.CSOAiCoAuthor.createOdiaTranslateBtn({ getSource: function () { return bodyEn.value; }, targetInput: bodyOr }));
    }
    colOr.appendChild(colOrHead); colOr.appendChild(bodyOr);
    edCols.appendChild(colEn); edCols.appendChild(colOr);
    edCard.appendChild(edCols);
    container.appendChild(edCard);

    // SECTION 5: No-Code Visual Tables & Lifecycle Thread Builder
    container.appendChild(buildDynamicTableCard(
      '5A. Post-wise Vacancy & Qualification Table',
      'Rendered as a structured responsive table on the public job article.',
      d.vacancy_breakdown,
      [
        { key: 'post_name', label: 'Post Name', placeholder: 'e.g., Odisha Administrative Service (OAS)' },
        { key: 'vacancies', label: 'Posts', placeholder: 'e.g., 120' },
        { key: 'qualification', label: 'Qualification', placeholder: 'Graduate in any stream' },
        { key: 'pay_level', label: 'Pay Level', placeholder: 'Level-12' }
      ]
    ));

    container.appendChild(buildDynamicTableCard(
      '5B. Important Dates Timeline',
      'Key application, fee, admit card, and exam milestones.',
      d.important_dates,
      [
        { key: 'event', label: 'Milestone', placeholder: 'e.g., Online Application Starts' },
        { key: 'date', label: 'Date', placeholder: '2026-12-01' },
        { key: 'note', label: 'Note', placeholder: 'Up to 11:59 PM IST' }
      ]
    ));

    container.appendChild(buildDynamicTableCard(
      '5C. Application Fee by Category (UR / SEBC / SC / ST / PwBD)',
      'Structured category fee breakdown.',
      d.fee_structure,
      [
        { key: 'category', label: 'Category', placeholder: 'e.g., UR / SEBC / SC / ST / PwBD' },
        { key: 'amount', label: 'Fee Amount', placeholder: 'e.g., ₹0 (Exempted by Govt. of Odisha)' },
        { key: 'payment_mode', label: 'Mode', placeholder: 'Online / Exempted' }
      ]
    ));

    container.appendChild(buildDynamicTableCard(
      '5D. Selection Process Steps',
      'Step-by-step exam stages, marks, and qualifying criteria.',
      d.selection_steps,
      [
        { key: 'step', label: 'Step', placeholder: 'Stage 1' },
        { key: 'stage_name', label: 'Stage Name', placeholder: 'Preliminary Exam (OMR / CBT)' },
        { key: 'marks_duration', label: 'Marks & Duration', placeholder: '200 Marks · 2 Hours' },
        { key: 'details', label: 'Details', placeholder: 'Negative marking 0.25' }
      ]
    ));

    container.appendChild(buildDynamicTableCard(
      '5E. Previous Cycle Cutoff & Vacancy Reference',
      'Helps aspirants benchmark target scores from earlier exam cycles.',
      d.cutoff_reference,
      [
        { key: 'year', label: 'Cycle Year', placeholder: '2024' },
        { key: 'category', label: 'Category', placeholder: 'UR / SEBC / SC / ST' },
        { key: 'vacancies', label: 'Prev Vacancies', placeholder: '399' },
        { key: 'cutoff_marks', label: 'Cutoff Marks', placeholder: '98.5 / 200' }
      ]
    ));

    container.appendChild(buildDynamicTableCard(
      '5F. Multi-Stage Lifecycle Updates Thread (Notification → Exam → Admit Card → Answer Key → Result)',
      'Track every official update, corrigendum badge, and attachment PDF over the exam lifecycle.',
      d.lifecycle_updates,
      [
        { key: 'stage', label: 'Stage', type: 'select', options: STAGES, defaultValue: 'notification' },
        { key: 'date', label: 'Date', type: 'date' },
        { key: 'headline', label: 'Update Headline', placeholder: 'Admit Card Link Activated / Corrigendum Issued' },
        { key: 'pdf_url', label: 'PDF / Link URL', placeholder: '/api/media/... or https://...' },
        { key: 'is_corrigendum', label: 'Corrigendum', type: 'checkbox', defaultValue: false }
      ]
    ));

    // SECTION 6: PDF Quick-Jump Page Bookmarks, Extra Annexures & Study/Mock Cross-Linker
    container.appendChild(buildDynamicTableCard(
      '6A. PDF Quick-Jump Page Bookmarks',
      'Lets candidates jump straight to Vacancy Table, Syllabus, or Age Rules inside the inline PDF viewer.',
      d.pdf_index_bookmarks,
      [
        { key: 'page', label: 'Page #', type: 'number', placeholder: '3' },
        { key: 'label', label: 'Bookmark Label', placeholder: 'Page 3: Vacancy Table' }
      ]
    ));

    container.appendChild(buildDynamicTableCard(
      '6B. Extra Annexures & Attachments',
      'Additional official PDFs (Corrigendum, Exam Calendar, Format Certificates).',
      d.extra_attachments,
      [
        { key: 'title', label: 'Document Name', placeholder: 'Corrigendum PDF / Caste Certificate Format' },
        { key: 'url', label: 'PDF URL', placeholder: '/api/media/...' }
      ]
    ));

    var studyCard = el('section', 'jph-card');
    studyCard.appendChild(el('h3', 'jph-card-title', '6C. "Prepare for This Exam" Study Library / PYQ / Mock Test Cross-Linker'));
    studyCard.appendChild(el('div', 'jph-muted', 'Select related Study Materials, Syllabus PDFs, PYQs, or Mock Tests to embed directly inside this job article.'));
    var chipBox = el('div', 'jph-study-chips');
    if (!state.studyOptions.length) {
      chipBox.appendChild(el('span', 'jph-muted', 'No published Study Library / Mock Test items found yet — publish items in Study Library to cross-link them here.'));
    } else {
      state.studyOptions.forEach(function (opt) {
        var isSel = d.linked_study_ids.indexOf(opt.id) !== -1;
        var chip = btn((isSel ? '✓ ' : '+ ') + '[' + opt.kind + '] ' + opt.title, 'jph-study-chip' + (isSel ? ' is-selected' : ''), function () {
          var idx = d.linked_study_ids.indexOf(opt.id);
          if (idx === -1) d.linked_study_ids.push(opt.id);
          else d.linked_study_ids.splice(idx, 1);
          renderCurrentView();
        });
        chipBox.appendChild(chip);
      });
    }
    studyCard.appendChild(chipBox);
    container.appendChild(studyCard);

    // SECTION 6D: Practice Quiz Editor (quiz_json Builder — v388)
    if (window.CSOQuizBuilder && typeof window.CSOQuizBuilder.buildQuizEditorAccordion === 'function') {
      container.appendChild(window.CSOQuizBuilder.buildQuizEditorAccordion({
        type: 'job',
        getSlug: function () { return d.slug || slugify(d.title_en); },
        getQuizJson: function () { return d.quiz_json || ''; },
        setQuizJson: function (val) { d.quiz_json = val; }
      }));
    }

    // SECTION 7: Scheduled Publishing, Corrigendum Alert & Revision History
    var pubCard = el('section', 'jph-card');
    pubCard.appendChild(el('h3', 'jph-card-title', '7. Corrigendum Alert, Scheduled Publish & Revision History'));
    var pg = el('div', 'jph-form-grid jph-form-grid--2');

    var corEn = el('textarea', 'jph-textarea'); corEn.placeholder = 'Optional Corrigendum / Extension alert shown at the top of the public job page…'; corEn.value = d.corrigendum_note_en || '';
    corEn.addEventListener('input', function () { d.corrigendum_note_en = corEn.value; });
    var wCorEn = el('div', 'jph-field'); wCorEn.appendChild(el('label', 'jph-label', 'Corrigendum Banner Note (EN)')); wCorEn.appendChild(corEn); pg.appendChild(wCorEn);

    var corOr = el('textarea', 'jph-textarea'); corOr.placeholder = 'ସଂଶୋଧନ / ତାରିଖ ବୃଦ୍ଧି ସୂଚନା (ଓଡ଼ିଆ)…'; corOr.value = d.corrigendum_note_or || '';
    corOr.addEventListener('input', function () { d.corrigendum_note_or = corOr.value; });
    var wCorOr = el('div', 'jph-field'); wCorOr.appendChild(el('label', 'jph-label', 'Corrigendum Banner Note (ଓଡ଼ିଆ)')); wCorOr.appendChild(corOr); pg.appendChild(wCorOr);

    var schInp = el('input', 'jph-input'); schInp.type = 'datetime-local';
    schInp.value = (d.publish_at || d.scheduled_publish_at) ? String(d.publish_at || d.scheduled_publish_at).replace(' ', 'T').slice(0, 16) : '';
    schInp.addEventListener('input', function () {
      var val = schInp.value ? schInp.value.replace('T', ' ') + ':00' : '';
      d.scheduled_publish_at = val;
      d.publish_at = val;
    });
    var wSch = el('div', 'jph-field'); wSch.appendChild(el('label', 'jph-label', 'Scheduled Auto-Publish Time (publish_at UTC)')); wSch.appendChild(schInp); pg.appendChild(wSch);

    var expInp = el('input', 'jph-input'); expInp.type = 'date';
    expInp.value = (d.expires_at || d.last_date || '').slice(0, 10);
    expInp.addEventListener('input', function () {
      d.expires_at = expInp.value;
      if (!d.last_date) d.last_date = expInp.value;
    });
    var wExp = el('div', 'jph-field'); wExp.appendChild(el('label', 'jph-label', 'Auto-Archive Expiry Date (expires_at)')); wExp.appendChild(expInp); pg.appendChild(wExp);

    var chgInp = el('input', 'jph-input'); chgInp.placeholder = 'e.g., Added admit card link & updated exam date'; chgInp.value = d.change_summary || '';
    chgInp.addEventListener('input', function () { d.change_summary = chgInp.value; });
    var wChg = el('div', 'jph-field'); wChg.appendChild(el('label', 'jph-label', 'Revision Change Summary')); wChg.appendChild(chgInp); pg.appendChild(wChg);

    if (window.CSOPublishTools && window.CSOPublishTools.runSanityCheck) {
      var sanityWrap = el('div', 'jph-field');
      sanityWrap.appendChild(el('label', 'jph-label', 'Pre-Publish Sanity Verification'));
      sanityWrap.appendChild(btn('✅ Run Pre-Publish Sanity Check', 'jph-btn jph-btn--primary', function () {
        window.CSOPublishTools.runSanityCheck('jobs', d, function () { saveDraftToServer(true, false); });
      }));
      pg.appendChild(sanityWrap);
    }

    pubCard.appendChild(pg);

    if (d.id && state.revisions && state.revisions.length) {
      pubCard.appendChild(el('div', 'jph-label', 'Saved Revision History (' + state.revisions.length + ')'));
      var revList = el('div', 'jph-rev-list');
      state.revisions.forEach(function (rv) {
        var row = el('div', 'jph-rev-item');
        row.appendChild(el('span', '', 'Rev #' + rv.revision_number + ' · ' + (rv.change_summary || 'Update') + ' · ' + (rv.created_by || 'staff') + ' (' + String(rv.created_at || '').slice(0, 16) + ')'));
        row.appendChild(btn('Restore Revision', 'jph-btn jph-btn--xs', function () {
          if (!window.confirm('Restore Revision #' + rv.revision_number + '?')) return;
          api('/api/admin/jobs/' + encodeURIComponent(d.id) + '/rollback', 'POST', { revision_id: rv.id }).then(function (r) {
            if (r && r.item) state.draft = Object.assign(emptyDraft(), r.item, { change_summary: '' });
            toast('Restored Revision #' + rv.revision_number, 'ok');
            api('/api/admin/jobs/' + encodeURIComponent(d.id) + '/revisions').then(function (rr) {
              state.revisions = rr.revisions || [];
              renderCurrentView();
            });
          }).catch(function (e) { toast(e.message, 'crimson'); });
        }));
        revList.appendChild(row);
      });
      pubCard.appendChild(revList);
    }

    container.appendChild(pubCard);
  }

  // ======================================================================
  // TAB 2: 3-LAYER CATEGORY HIERARCHY STUDIO (Main -> Sub -> Further Sub)
  // ======================================================================
  function renderTaxonomyStudio(container) {
    var l1List = nodesByLevel(1);
    if (!state.taxSel.l1 && l1List.length) state.taxSel.l1 = l1List[0].id;
    var l2List = state.taxSel.l1 ? nodesByLevel(2, state.taxSel.l1) : [];
    if (state.taxSel.l2 && !l2List.some(function (x) { return x.id === state.taxSel.l2; })) {
      state.taxSel.l2 = l2List.length ? l2List[0].id : '';
    } else if (!state.taxSel.l2 && l2List.length) {
      state.taxSel.l2 = l2List[0].id;
    }
    var l3List = state.taxSel.l2 ? nodesByLevel(3, state.taxSel.l2) : [];

    var intro = el('div', 'jph-card');
    var iHead = el('div', 'jph-card-head');
    var ihL = el('div');
    ihL.appendChild(el('h2', 'jph-card-title', '5-Sector & 3-Layer Category Hierarchy Studio (Main → Sub → Further Subcategory)'));
    ihL.appendChild(el('div', 'jph-muted', 'Active L1 sectors & L2 subcategories here directly power the public Jobs ▾ Two-Stage Cascading Menu (Stage 1 & Stage 2) and immediately purge edge caches on every change.'));
    iHead.appendChild(ihL);
    iHead.appendChild(btn('↻ Refresh Tree', 'jph-btn', function () { loadTaxonomy().then(renderCurrentView); }));
    intro.appendChild(iHead);
    container.appendChild(intro);

    var grid = el('div', 'jph-tax-grid');

    function buildColumn(level, title, items, selectedId, parentId, onSelect) {
      var col = el('div', 'jph-tax-col');
      var head = el('div', 'jph-tax-col-head');
      head.appendChild(el('strong', '', title + ' (' + items.length + ')'));
      var addBtn = btn('+ Add', 'jph-btn jph-btn--xs jph-btn--primary', function () {
        if (level > 1 && !parentId) {
          toast('Select a parent node in Level ' + (level - 1) + ' first.', 'crimson');
          return;
        }
        openTaxonomyNodeModal({ level: level, parentId: parentId });
      });
      head.appendChild(addBtn);
      col.appendChild(head);

      var list = el('div', 'jph-tax-list');
      if (!items.length) {
        list.appendChild(el('div', 'jph-muted', level > 1 && !parentId ? 'Select a parent node on the left.' : 'No categories at this level yet. Click "+ Add" to create one.'));
      } else {
        items.forEach(function (node) {
          var card = el('div', 'jph-tax-node' + (selectedId === node.id ? ' is-selected' : ''));
          card.addEventListener('click', function () { if (onSelect) onSelect(node.id); });

          var top = el('div', 'jph-tax-node-top');
          top.appendChild(el('span', 'jph-tax-node-title', (node.icon ? node.icon + ' ' : '') + node.title_en));
          top.appendChild(el('span', 'jph-pill ' + (node.is_published ? 'jph-pill--published' : 'jph-pill--draft'), node.is_published ? 'Live' : 'Hidden'));
          card.appendChild(top);

          if (node.title_or) card.appendChild(el('div', 'jph-title-or', node.title_or));
          card.appendChild(el('div', 'jph-muted', (node.published_jobs || 0) + ' live jobs · /' + node.slug));

          var acts = el('div', 'jph-actions-row');
          acts.addEventListener('click', function (e) { e.stopPropagation(); });
          acts.appendChild(btn('↑', 'jph-btn jph-btn--xs', function () {
            api('/api/admin/jobs/taxonomy/' + encodeURIComponent(node.id) + '/move', 'POST', { direction: 'up' }).then(function () { loadTaxonomy().then(renderCurrentView); });
          }));
          acts.appendChild(btn('↓', 'jph-btn jph-btn--xs', function () {
            api('/api/admin/jobs/taxonomy/' + encodeURIComponent(node.id) + '/move', 'POST', { direction: 'down' }).then(function () { loadTaxonomy().then(renderCurrentView); });
          }));
          acts.appendChild(btn('Edit', 'jph-btn jph-btn--xs', function () {
            openTaxonomyNodeModal({ level: level, parentId: node.parent_id, node: node });
          }));
          acts.appendChild(btn(node.is_published ? 'Hide' : 'Publish', 'jph-btn jph-btn--xs', function () {
            api('/api/admin/jobs/taxonomy/' + encodeURIComponent(node.id), 'PATCH', { is_published: node.is_published ? 0 : 1 }).then(function () {
              toast('Visibility updated', 'ok');
              loadTaxonomy().then(renderCurrentView);
            });
          }));
          acts.appendChild(btn('Del', 'jph-btn jph-btn--xs jph-btn--danger', function () {
            if (!window.confirm('Delete "' + node.title_en + '" and its child subcategories?')) return;
            api('/api/admin/jobs/taxonomy/' + encodeURIComponent(node.id), 'DELETE').then(function () {
              toast('Category deleted', 'ok');
              loadTaxonomy().then(renderCurrentView);
            });
          }));
          card.appendChild(acts);
          list.appendChild(card);
        });
      }
      col.appendChild(list);
      return col;
    }

    grid.appendChild(buildColumn(1, 'Level 1 · Main Category', l1List, state.taxSel.l1, null, function (id) {
      state.taxSel.l1 = id; state.taxSel.l2 = ''; renderCurrentView();
    }));
    grid.appendChild(buildColumn(2, 'Level 2 · Subcategory / Dept', l2List, state.taxSel.l2, state.taxSel.l1, function (id) {
      state.taxSel.l2 = id; renderCurrentView();
    }));
    grid.appendChild(buildColumn(3, 'Level 3 · Further Subcategory / Tenure', l3List, '', state.taxSel.l2, null));
    container.appendChild(grid);
  }

  // ======================================================================
  // TAB 3: REUSABLE BILINGUAL SNIPPETS LIBRARY
  // ======================================================================
  function openSnippetModal(editing) {
    var fTitleEn = el('input', 'jph-input'); fTitleEn.value = editing ? editing.title_en : ''; fTitleEn.placeholder = 'e.g., Odisha SEBC Age Relaxation Rules';
    var fTitleOr = el('input', 'jph-input'); fTitleOr.value = editing ? editing.title_or : ''; fTitleOr.placeholder = 'ଓଡ଼ିଆ ଶୀର୍ଷକ';
    var fCat = el('input', 'jph-input'); fCat.value = editing ? editing.category : 'eligibility'; fCat.placeholder = 'eligibility / documents / how_to_apply';
    var fBodyEn = el('textarea', 'jph-textarea'); fBodyEn.value = editing ? editing.body_en : ''; fBodyEn.placeholder = 'Reusable English Markdown block…';
    var fBodyOr = el('textarea', 'jph-textarea'); fBodyOr.value = editing ? editing.body_or : ''; fBodyOr.placeholder = 'ଓଡ଼ିଆ ବିବରଣୀ…';
    var fPub = el('input'); fPub.type = 'checkbox'; fPub.checked = editing ? Boolean(editing.is_published) : true;

    openStudioModal(editing ? 'Edit Bilingual Snippet' : '+ Add Reusable Bilingual Snippet', function (body) {
      var g = el('div', 'jph-form-grid jph-form-grid--2');
      function add(lbl, ctrl, full) {
        var w = el('div', 'jph-field' + (full ? ' jph-span-2' : ''));
        w.appendChild(el('label', 'jph-label', lbl));
        w.appendChild(ctrl);
        g.appendChild(w);
      }
      add('Snippet Title (EN) *', fTitleEn);
      add('Snippet Title (ଓଡ଼ିଆ)', fTitleOr);
      add('Category Tag', fCat, true);
      add('Body (EN)', fBodyEn, true);
      add('Body (ଓଡ଼ିଆ)', fBodyOr, true);
      var pl = el('label', 'jph-check-label jph-span-2'); pl.appendChild(fPub); pl.appendChild(el('span', '', 'Active in Editorial Composer')); g.appendChild(pl);
      body.appendChild(g);
    }, [
      btn('Cancel', 'jph-btn', closeStudioModal),
      btn(editing ? 'Update Snippet' : 'Save Snippet', 'jph-btn jph-btn--primary', function () {
        if (!fTitleEn.value.trim()) { toast('Title (EN) is required', 'crimson'); return; }
        var payload = {
          title_en: fTitleEn.value.trim(),
          title_or: fTitleOr.value.trim(),
          category: fCat.value.trim() || 'general',
          body_en: fBodyEn.value,
          body_or: fBodyOr.value,
          is_published: fPub.checked ? 1 : 0
        };
        var req = editing
          ? api('/api/admin/jobs/snippets/' + encodeURIComponent(editing.id), 'PUT', payload)
          : api('/api/admin/jobs/snippets', 'POST', payload);
        req.then(function () {
          closeStudioModal();
          toast('Snippet saved to D1!', 'ok');
          loadSnippets().then(renderCurrentView);
        }).catch(function (e) { toast(e.message, 'crimson'); });
      })
    ]);
  }

  function renderSnippetsTab(container) {
    var card = el('section', 'jph-card');
    var head = el('div', 'jph-card-head');
    var hl = el('div');
    hl.appendChild(el('h2', 'jph-card-title', 'Reusable Bilingual Snippets Library (EN & ଓଡ଼ିଆ)'));
    hl.appendChild(el('div', 'jph-muted', 'Standard Odisha recruitment rules & portal instructions ready for one-click insertion into any job article.'));
    head.appendChild(hl);
    head.appendChild(btn('+ Add New Snippet', 'jph-btn jph-btn--primary', function () { openSnippetModal(null); }));
    card.appendChild(head);

    var grid = el('div', 'jph-snippets-grid');
    if (!state.snippets.length) {
      grid.appendChild(el('div', 'jph-muted', 'No snippets found yet. Click "+ Add New Snippet" to create reusable bilingual rule blocks.'));
    } else {
      state.snippets.forEach(function (sn) {
        var sc = el('div', 'jph-snippet-card');
        var top = el('div', 'jph-card-head');
        top.appendChild(el('strong', '', sn.title_en));
        top.appendChild(el('span', 'jph-pill', sn.category || 'general'));
        sc.appendChild(top);
        if (sn.title_or) sc.appendChild(el('div', 'jph-title-or', sn.title_or));
        sc.appendChild(el('div', 'jph-muted', String(sn.body_en || '').slice(0, 190) + (String(sn.body_en || '').length > 190 ? '…' : '')));
        var acts = el('div', 'jph-actions-row');
        acts.appendChild(btn('Edit', 'jph-btn jph-btn--xs', function () { openSnippetModal(sn); }));
        acts.appendChild(btn('Delete', 'jph-btn jph-btn--xs jph-btn--danger', function () {
          if (!window.confirm('Delete snippet "' + sn.title_en + '"?')) return;
          api('/api/admin/jobs/snippets/' + encodeURIComponent(sn.id), 'DELETE').then(function () {
            toast('Snippet deleted', 'ok');
            loadSnippets().then(renderCurrentView);
          });
        }));
        sc.appendChild(acts);
        grid.appendChild(sc);
      });
    }
    card.appendChild(grid);
    container.appendChild(card);
  }

  // ======================================================================
  // MAIN SHELL RENDERER
  // ======================================================================
  function renderCurrentView() {
    if (!state.root) return;
    if (window.CSOStudio && window.CSOStudio.getActiveFolderId && window.CSOStudio.getActiveFolderId() !== 'folder-jobs-careers') {
      return;
    }
    clear(state.root);
    var wrap = el('div', 'jph-wrap');

    // Live-Sync Badge Banner (v275 — confirms Admin Jobs folder powers public Jobs ▾ two-stage dropdown)
    var activeL1Count = nodesByLevel(1).filter(function (n) { return n.is_published !== 0; }).length;
    var activeL2Count = nodesByLevel(2).filter(function (n) { return n.is_published !== 0; }).length;
    var syncBanner = el('div', 'jph-live-sync-banner');
    syncBanner.setAttribute('role', 'status');
    var syncLeft = el('div', 'jph-live-sync-left');
    var syncPill = el('span', 'jph-live-sync-pill');
    syncPill.appendChild(el('span', 'jph-live-sync-dot'));
    syncPill.appendChild(document.createTextNode(' Live Synced to Public Jobs ▾ Menu'));
    syncLeft.appendChild(syncPill);
    syncLeft.appendChild(el('span', 'jph-live-sync-copy', activeL1Count + ' active L1 sectors & ' + activeL2Count + ' active L2 subcategories in this folder power Stage 1 (vertical dropdown) and Stage 2 (right-side flyout) with instant edge cache purge.'));
    syncBanner.appendChild(syncLeft);
    var syncRight = el('div', 'jph-live-sync-actions');
    syncRight.appendChild(btn('Manage Menu Sectors', 'jph-btn jph-btn--xs', function () {
      state.tab = 'taxonomy';
      state.mode = 'list';
      if (window.CSOStudio && window.CSOStudio.setJobsSubTab) window.CSOStudio.setJobsSubTab('taxonomy');
      loadTaxonomy().then(renderCurrentView);
    }));
    syncBanner.appendChild(syncRight);
    wrap.appendChild(syncBanner);

    // Tabs Bar
    var tabs = el('div', 'jph-tabs');
    tabs.setAttribute('role', 'tablist');
    [
      ['articles', '📰 Published & Draft Jobs', state.kpis ? state.kpis.total_jobs : state.articles.length],
      ['taxonomy', '🗂️ 5-Sector & 3-Layer Hierarchy', state.taxonomyNodes.length],
      ['snippets', '🧩 Reusable Bilingual Snippets', state.snippets.length]
    ].forEach(function (t) {
      var b = el('button', 'jph-tab' + (state.tab === t[0] ? ' is-active' : ''));
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(state.tab === t[0]));
      b.appendChild(el('span', '', t[1]));
      b.appendChild(el('span', 'jph-tab-badge', String(t[2] || 0)));
      b.addEventListener('click', function () {
        state.tab = t[0];
        if (t[0] !== 'articles') state.mode = 'list';
        if (window.CSOStudio && window.CSOStudio.setJobsSubTab) window.CSOStudio.setJobsSubTab(t[0]);
        renderCurrentView();
        if (t[0] === 'taxonomy') loadTaxonomy().then(renderCurrentView);
        if (t[0] === 'snippets') loadSnippets().then(renderCurrentView);
        if (t[0] === 'articles') loadArticles().then(renderCurrentView);
      });
      tabs.appendChild(b);
    });
    wrap.appendChild(tabs);

    if (state.tab === 'articles') {
      if (state.mode === 'composer') renderComposer(wrap);
      else renderArticlesList(wrap);
    } else if (state.tab === 'taxonomy') {
      renderTaxonomyStudio(wrap);
    } else if (state.tab === 'snippets') {
      renderSnippetsTab(wrap);
    }

    state.root.appendChild(wrap);
  }

  function render(root, headerActions, initialOpt, initialSectorId) {
    state.root = root;
    state.headerActions = headerActions;
    if (initialSectorId !== undefined) {
      state.filters.l1 = initialSectorId || '';
      state.filters.l2 = '';
      state.filters.l3 = '';
    }
    if (initialOpt === 'new') {
      state.tab = 'articles';
      state.mode = 'composer';
      state.draft = emptyDraft();
    } else if (initialOpt === 'taxonomy' || initialOpt === 'snippets' || initialOpt === 'articles') {
      state.tab = initialOpt;
      state.mode = 'list';
    } else {
      state.tab = 'articles';
      state.mode = 'list';
    }

    if (headerActions) {
      clear(headerActions);
      var liveLink = el('a', 'jph-btn', 'Open Live Jobs Portal ↗');
      liveLink.href = '/jobs/?refresh=1';
      liveLink.target = '_blank';
      liveLink.rel = 'noopener noreferrer';
      headerActions.appendChild(liveLink);
      headerActions.appendChild(btn('+ Publish New Job Article', 'jph-btn jph-btn--primary', function () {
        state.tab = 'articles';
        openComposer(null);
      }));
    }

    clear(root);
    root.appendChild(el('div', 'jph-card', 'Loading Jobs Publishing House from D1…'));
    Promise.all([loadArticles(), loadTaxonomy(), loadSnippets(), loadStudyOptions()]).then(function () {
      renderCurrentView();
    }).catch(function (err) {
      clear(root);
      root.appendChild(el('div', 'jph-card', 'Failed to load Jobs Publishing House: ' + err.message));
    });
  }

  window.CSOJobsPublishingStudio = {
    render: render,
    openComposer: function (art) { state.tab = 'articles'; openComposer(art || null); },
    openTab: function (tab) { state.tab = tab; state.mode = 'list'; renderCurrentView(); },
    openSector: function (l1Id) {
      state.tab = 'articles';
      state.mode = 'list';
      state.filters.l1 = l1Id || '';
      state.filters.l2 = '';
      state.filters.l3 = '';
      loadArticles().then(renderCurrentView);
    },
    buildBroadcastText: buildBroadcastText
  };

  // =========================================================================
  // v388: Reusable Admin Studio Custom Quiz Editor (quiz_json Builder)
  // Strict CSP-safe (zero DOM markup injection, zero inline styles, 4-theme tokens)
  // =========================================================================
  (function initCSOQuizBuilder() {
    var OPTION_LETTERS = ['A', 'B', 'C', 'D'];
    var uidCounter = 1;

    function parseQuizState(raw) {
      var fallback = { mode: 'extend', questions: [] };
      if (!raw || !String(raw).trim()) return fallback;
      try {
        var parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        var mode = 'extend';
        var list = [];
        if (Array.isArray(parsed)) {
          list = parsed;
        } else if (parsed && typeof parsed === 'object') {
          mode = String(parsed.mode || 'extend').toLowerCase() === 'override' ? 'override' : 'extend';
          list = Array.isArray(parsed.questions) ? parsed.questions : [];
        }
        var clean = list.slice(0, 25).map(function (q, idx) {
          var optsEn = Array.isArray(q && q.options_en) ? q.options_en.slice(0, 4).map(String) : [];
          while (optsEn.length < 4) optsEn.push('');
          var optsOr = Array.isArray(q && q.options_or) ? q.options_or.slice(0, 4).map(String) : [];
          while (optsOr.length < 4) optsOr.push('');
          var rawIdx = q && q.answer_index !== undefined ? q.answer_index : (q && q.correct_index !== undefined ? q.correct_index : 0);
          var ansIdx = Number.isInteger(Number(rawIdx)) && Number(rawIdx) >= 0 && Number(rawIdx) <= 3 ? Number(rawIdx) : 0;
          return {
            id: String((q && q.id) || ('custom_q_' + (idx + 1))),
            tag: String((q && q.tag) || 'Custom MCQ'),
            question_en: String((q && q.question_en) || ''),
            question_or: String((q && q.question_or) || ''),
            options_en: optsEn,
            options_or: optsOr,
            answer_index: ansIdx,
            explanation_en: String((q && q.explanation_en) || ''),
            explanation_or: String((q && q.explanation_or) || '')
          };
        });
        return { mode: mode, questions: clean };
      } catch (_) {
        return fallback;
      }
    }

    function validateQuizJsonString(raw) {
      if (!raw || !String(raw).trim()) return { ok: true, normalized: '' };
      var parsed;
      try {
        parsed = JSON.parse(String(raw));
      } catch (err) {
        return { ok: false, error: 'Invalid JSON syntax: ' + (err && err.message ? err.message : 'parse error') };
      }
      var mode = 'extend';
      var list = null;
      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (parsed && typeof parsed === 'object') {
        mode = String(parsed.mode || 'extend').toLowerCase();
        if (mode !== 'extend' && mode !== 'override') {
          return { ok: false, error: '"mode" must be "extend" or "override".' };
        }
        if (!Array.isArray(parsed.questions)) {
          return { ok: false, error: 'Missing "questions" array.' };
        }
        list = parsed.questions;
      } else {
        return { ok: false, error: 'Must be an object { mode, questions } or an array.' };
      }
      if (list.length > 25) return { ok: false, error: 'Maximum 25 custom MCQs allowed.' };
      for (var i = 0; i < list.length; i += 1) {
        var q = list[i];
        if (!q || typeof q !== 'object') return { ok: false, error: 'Question #' + (i + 1) + ' must be an object.' };
        if (!String(q.question_en || '').trim()) return { ok: false, error: 'Question #' + (i + 1) + ' requires question_en.' };
        if (!Array.isArray(q.options_en) || q.options_en.length !== 4 || q.options_en.some(function (o) { return !String(o || '').trim(); })) {
          return { ok: false, error: 'Question #' + (i + 1) + ' requires 4 non-empty options_en.' };
        }
        var ai = q.answer_index !== undefined ? Number(q.answer_index) : Number(q.correct_index);
        if (!Number.isInteger(ai) || ai < 0 || ai > 3) {
          return { ok: false, error: 'Question #' + (i + 1) + ' requires answer_index 0..3.' };
        }
      }
      return { ok: true, normalized: list.length ? JSON.stringify({ mode: mode, questions: list }) : '' };
    }

    function blankMcq(idx) {
      return {
        id: 'custom_q_' + Date.now().toString(36) + '_' + idx,
        tag: 'Custom MCQ',
        question_en: '',
        question_or: '',
        options_en: ['', '', '', ''],
        options_or: ['', '', '', ''],
        answer_index: 0,
        explanation_en: '',
        explanation_or: ''
      };
    }

    function buildQuizEditorAccordion(opts) {
      var type = (opts && opts.type === 'guide') ? 'guide' : 'job';
      var getSlug = (opts && typeof opts.getSlug === 'function') ? opts.getSlug : function () { return ''; };
      var getQuizJson = (opts && typeof opts.getQuizJson === 'function') ? opts.getQuizJson : function () { return ''; };
      var setQuizJson = (opts && typeof opts.setQuizJson === 'function') ? opts.setQuizJson : function () {};

      var qState = parseQuizState(getQuizJson());
      var rawOpen = false;
      var previewOpen = false;
      var autoQuestions = null;
      var autoLoading = false;
      var autoError = '';

      var details = el('details', 'jph-card jph-quiz-details');
      details.setAttribute('data-cso-quiz-builder', type);
      if (qState.questions.length > 0) details.open = true;

      var summary = el('summary', 'jph-quiz-summary');
      var sumLeft = el('span', 'jph-quiz-summary-title', '🧠 Practice Quiz Editor (quiz_json Builder) | ଅଭ୍ୟାସ ପ୍ରଶ୍ନ ସମ୍ପାଦକ');
      var sumBadge = el('span', 'jph-quiz-badge');
      summary.appendChild(sumLeft);
      summary.appendChild(sumBadge);
      details.appendChild(summary);

      var body = el('div', 'jph-quiz-body');
      details.appendChild(body);

      var rawArea = el('textarea', 'jph-textarea jph-quiz-raw');
      rawArea.rows = 10;
      rawArea.setAttribute('aria-label', 'Raw quiz_json editor');
      var rawStatus = el('div', 'jph-quiz-raw-status');
      rawStatus.setAttribute('role', 'status');
      rawStatus.setAttribute('aria-live', 'polite');

      function updateBadge() {
        var n = qState.questions.length;
        if (!n) {
          sumBadge.textContent = 'Auto-Extracted (Default)';
          sumBadge.className = 'jph-quiz-badge';
        } else if (qState.mode === 'override') {
          sumBadge.textContent = 'Override · ' + n + ' Custom MCQ' + (n === 1 ? '' : 's');
          sumBadge.className = 'jph-quiz-badge is-override';
        } else {
          sumBadge.textContent = 'Extend · ' + n + ' Custom MCQ' + (n === 1 ? '' : 's');
          sumBadge.className = 'jph-quiz-badge is-extend';
        }
      }

      function serializeStateToParent(syncRaw) {
        var strVal = qState.questions.length
          ? JSON.stringify({ mode: qState.mode, questions: qState.questions })
          : '';
        setQuizJson(strVal);
        updateBadge();
        if (syncRaw !== false) {
          rawArea.value = qState.questions.length
            ? JSON.stringify({ mode: qState.mode, questions: qState.questions }, null, 2)
            : '';
          rawStatus.textContent = qState.questions.length
            ? ('Valid JSON · ' + qState.questions.length + ' custom MCQ' + (qState.questions.length === 1 ? '' : 's') + ' (' + qState.mode + ')')
            : 'Empty (uses auto-extracted 25-MCQ drill)';
          rawStatus.className = 'jph-quiz-raw-status is-ok';
        }
      }

      // 1. Mode Switcher
      var modeBar = el('div', 'jph-quiz-mode-bar');
      modeBar.setAttribute('role', 'radiogroup');
      modeBar.setAttribute('aria-label', 'Quiz Merge Mode');
      var modeLabel = el('span', 'jph-label', 'Delivery Mode:');
      modeBar.appendChild(modeLabel);

      var modePills = el('div', 'jph-quiz-mode-pills');
      var modes = [
        { key: 'extend', label: '➕ Extend Auto-Extracted Drill', hint: 'Custom MCQs first, then auto-extracted facts & subject MCQs up to 25' },
        { key: 'override', label: '🔄 Override Auto-Extracted Drill', hint: 'Serve ONLY your custom MCQs on this page' }
      ];
      var modeBtns = {};
      modes.forEach(function (m) {
        var b = el('button', 'jph-quiz-mode-pill' + (qState.mode === m.key ? ' is-active' : ''), m.label);
        b.type = 'button';
        b.title = m.hint;
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', qState.mode === m.key ? 'true' : 'false');
        b.addEventListener('click', function () {
          qState.mode = m.key;
          Object.keys(modeBtns).forEach(function (k) {
            var active = k === qState.mode;
            modeBtns[k].className = 'jph-quiz-mode-pill' + (active ? ' is-active' : '');
            modeBtns[k].setAttribute('aria-checked', active ? 'true' : 'false');
          });
          serializeStateToParent(true);
        });
        modeBtns[m.key] = b;
        modePills.appendChild(b);
      });
      modeBar.appendChild(modePills);
      body.appendChild(modeBar);

      // 2. Action Toolbar
      var toolbar = el('div', 'jph-quiz-toolbar');
      var previewHost = el('div', 'jph-quiz-preview-drawer');
      previewHost.hidden = true;
      var rawWrap = el('div', 'jph-quiz-raw-wrap');
      rawWrap.hidden = true;
      var listHost = el('div', 'jph-quiz-list');

      var btnPreviewAuto = btn('👁 Preview Auto-Extracted Questions', 'jph-btn jph-btn--sm', function () {
        previewOpen = !previewOpen;
        previewHost.hidden = !previewOpen;
        if (previewOpen && autoQuestions === null && !autoLoading) {
          fetchAutoPreview();
        } else {
          renderPreviewDrawer();
        }
      });

      var btnAddMcq = btn('+ Add Custom MCQ', 'jph-btn jph-btn--sm jph-btn--primary', function () {
        if (qState.questions.length >= 25) {
          toast('Maximum 25 custom MCQs per article reached.', 'amber');
          return;
        }
        qState.questions.push(blankMcq(qState.questions.length + 1));
        serializeStateToParent(true);
        renderCards();
      });

      var btnRawToggle = btn('{ } View / Edit Raw quiz_json', 'jph-btn jph-btn--sm', function () {
        rawOpen = !rawOpen;
        rawWrap.hidden = !rawOpen;
        btnRawToggle.className = 'jph-btn jph-btn--sm' + (rawOpen ? ' is-active' : '');
      });

      var btnClearAll = btn('🧹 Clear Custom MCQs (Revert to Auto)', 'jph-btn jph-btn--sm jph-btn--danger', function () {
        if (qState.questions.length && !window.confirm('Clear all custom MCQs and revert this post to the auto-extracted drill?')) return;
        qState.questions = [];
        qState.mode = 'extend';
        Object.keys(modeBtns).forEach(function (k) {
          var active = k === 'extend';
          modeBtns[k].className = 'jph-quiz-mode-pill' + (active ? ' is-active' : '');
          modeBtns[k].setAttribute('aria-checked', active ? 'true' : 'false');
        });
        serializeStateToParent(true);
        renderCards();
        toast('Cleared custom MCQs — post will use auto-extracted drill on save.', 'ok');
      });

      toolbar.append(btnPreviewAuto, btnAddMcq, btnRawToggle, btnClearAll);
      body.appendChild(toolbar);

      // 3. Auto-Preview Drawer
      function fetchAutoPreview() {
        var slug = String(getSlug() || '').trim();
        if (!slug) {
          autoError = 'Enter a title / slug and save & publish this post first to preview live auto-extracted questions.';
          renderPreviewDrawer();
          return;
        }
        autoLoading = true;
        autoError = '';
        renderPreviewDrawer();
        fetch('/api/public/article-quiz?type=' + encodeURIComponent(type) + '&slug=' + encodeURIComponent(slug) + '&auto_only=1', { credentials: 'same-origin' })
          .then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (d) {
              if (!r.ok) throw new Error((d && d.error) || ('HTTP ' + r.status));
              return d;
            });
          })
          .then(function (data) {
            autoQuestions = Array.isArray(data && data.questions) ? data.questions : [];
            autoLoading = false;
            renderPreviewDrawer();
          })
          .catch(function (err) {
            autoLoading = false;
            autoQuestions = [];
            autoError = 'Could not load live auto-extracted drill (' + err.message + '). Publish the post first to inspect its live auto-extracted MCQs.';
            renderPreviewDrawer();
          });
      }

      function renderPreviewDrawer() {
        clear(previewHost);
        var pHead = el('div', 'jph-quiz-preview-head');
        pHead.appendChild(el('strong', '', 'Auto-Extracted Bilingual Drill Preview (' + (autoQuestions ? autoQuestions.length : 0) + ' MCQs)'));
        var pBtns = el('div', 'jph-actions-row');
        pBtns.appendChild(btn('↻ Refresh', 'jph-btn jph-btn--xs', function () {
          autoQuestions = null;
          fetchAutoPreview();
        }));
        pBtns.appendChild(btn('Close ✕', 'jph-btn jph-btn--xs', function () {
          previewOpen = false;
          previewHost.hidden = true;
        }));
        pHead.appendChild(pBtns);
        previewHost.appendChild(pHead);

        if (autoLoading) {
          previewHost.appendChild(el('div', 'jph-muted', 'Fetching auto-extracted MCQs from /api/public/article-quiz…'));
          return;
        }
        if (autoError) {
          previewHost.appendChild(el('div', 'jph-muted', autoError));
          return;
        }
        if (!autoQuestions || !autoQuestions.length) {
          previewHost.appendChild(el('div', 'jph-muted', 'No auto-extracted questions returned yet.'));
          return;
        }
        var pList = el('div', 'jph-quiz-preview-list');
        autoQuestions.forEach(function (aq, idx) {
          var row = el('div', 'jph-quiz-preview-item');
          var txt = el('div', 'jph-quiz-preview-copy');
          txt.appendChild(el('div', 'jph-quiz-preview-q', 'Q' + (idx + 1) + ' [' + (aq.tag || 'Auto') + ']: ' + (aq.question_en || '')));
          var ansIdx = aq.answer_index !== undefined ? aq.answer_index : (aq.correct_index || 0);
          var ansText = Array.isArray(aq.options_en) && aq.options_en[ansIdx] ? aq.options_en[ansIdx] : '';
          txt.appendChild(el('div', 'jph-muted', 'Ans (' + (OPTION_LETTERS[ansIdx] || 'A') + '): ' + ansText));
          row.appendChild(txt);
          row.appendChild(btn('📥 Clone into Custom Editor', 'jph-btn jph-btn--xs', function () {
            if (qState.questions.length >= 25) {
              toast('Maximum 25 custom MCQs reached.', 'amber');
              return;
            }
            var cloned = {
              id: 'cloned_' + Date.now().toString(36) + '_' + (qState.questions.length + 1),
              tag: String(aq.tag || 'Custom MCQ'),
              question_en: String(aq.question_en || ''),
              question_or: String(aq.question_or || aq.question_en || ''),
              options_en: (Array.isArray(aq.options_en) ? aq.options_en.slice(0, 4) : ['', '', '', '']),
              options_or: (Array.isArray(aq.options_or) ? aq.options_or.slice(0, 4) : ['', '', '', '']),
              answer_index: Number.isInteger(Number(ansIdx)) ? Number(ansIdx) : 0,
              explanation_en: String(aq.explanation_en || ''),
              explanation_or: String(aq.explanation_or || aq.explanation_en || '')
            };
            while (cloned.options_en.length < 4) cloned.options_en.push('');
            while (cloned.options_or.length < 4) cloned.options_or.push('');
            qState.questions.push(cloned);
            serializeStateToParent(true);
            renderCards();
            toast('Cloned Q' + (idx + 1) + ' into Custom Quiz Editor!', 'ok');
          }));
          pList.appendChild(row);
        });
        previewHost.appendChild(pList);
      }
      body.appendChild(previewHost);

      // 4. Raw JSON Inspector
      rawWrap.appendChild(el('label', 'jph-label', 'Raw quiz_json Payload ({ "mode": "extend" | "override", "questions": [...] })'));
      rawArea.addEventListener('input', function () {
        var val = rawArea.value.trim();
        if (!val) {
          qState.questions = [];
          qState.mode = 'extend';
          setQuizJson('');
          updateBadge();
          renderCards();
          rawStatus.textContent = 'Empty (uses auto-extracted 25-MCQ drill)';
          rawStatus.className = 'jph-quiz-raw-status is-ok';
          return;
        }
        var chk = validateQuizJsonString(val);
        if (!chk.ok) {
          setQuizJson(val);
          rawStatus.textContent = '⚠ ' + chk.error;
          rawStatus.className = 'jph-quiz-raw-status is-err';
          return;
        }
        qState = parseQuizState(val);
        Object.keys(modeBtns).forEach(function (k) {
          var active = k === qState.mode;
          modeBtns[k].className = 'jph-quiz-mode-pill' + (active ? ' is-active' : '');
          modeBtns[k].setAttribute('aria-checked', active ? 'true' : 'false');
        });
        setQuizJson(chk.normalized);
        updateBadge();
        renderCards();
        rawStatus.textContent = '✓ Valid JSON synced with builder (' + qState.questions.length + ' MCQs, mode: ' + qState.mode + ')';
        rawStatus.className = 'jph-quiz-raw-status is-ok';
      });
      rawWrap.appendChild(rawArea);
      rawWrap.appendChild(rawStatus);
      body.appendChild(rawWrap);

      // 5. Repeatable Bilingual MCQ Cards
      function renderCards() {
        clear(listHost);
        if (!qState.questions.length) {
          listHost.appendChild(el('div', 'jph-quiz-empty', 'No custom MCQs added yet. This post currently serves the auto-extracted 25-MCQ bilingual drill. Click "+ Add Custom MCQ" or "👁 Preview Auto-Extracted Questions" to customize.'));
          return;
        }
        qState.questions.forEach(function (q, idx) {
          var card = el('div', 'jph-quiz-card');
          var radioGroupName = 'cso_quiz_ans_' + (uidCounter++);

          var head = el('div', 'jph-quiz-card-head');
          var headLeft = el('div', 'jph-quiz-card-head-left');
          headLeft.appendChild(el('span', 'jph-quiz-num', 'Q' + (idx + 1)));
          var tagInp = el('input', 'jph-input jph-quiz-tag-input');
          tagInp.placeholder = 'Tag (e.g., Official Fact, Odisha GK)';
          tagInp.value = q.tag || '';
          tagInp.setAttribute('aria-label', 'Question ' + (idx + 1) + ' tag');
          tagInp.addEventListener('input', function () {
            q.tag = tagInp.value;
            serializeStateToParent(true);
          });
          headLeft.appendChild(tagInp);

          var headBtns = el('div', 'jph-actions-row');
          var bUp = btn('↑', 'jph-btn jph-btn--xs', function () {
            if (idx === 0) return;
            var tmp = qState.questions[idx - 1];
            qState.questions[idx - 1] = qState.questions[idx];
            qState.questions[idx] = tmp;
            serializeStateToParent(true);
            renderCards();
          });
          bUp.title = 'Move Up';
          bUp.disabled = idx === 0;

          var bDown = btn('↓', 'jph-btn jph-btn--xs', function () {
            if (idx >= qState.questions.length - 1) return;
            var tmp = qState.questions[idx + 1];
            qState.questions[idx + 1] = qState.questions[idx];
            qState.questions[idx] = tmp;
            serializeStateToParent(true);
            renderCards();
          });
          bDown.title = 'Move Down';
          bDown.disabled = idx >= qState.questions.length - 1;

          var bDup = btn('⧉', 'jph-btn jph-btn--xs', function () {
            if (qState.questions.length >= 25) {
              toast('Maximum 25 custom MCQs reached.', 'amber');
              return;
            }
            var copy = JSON.parse(JSON.stringify(q));
            copy.id = 'custom_q_' + Date.now().toString(36) + '_' + (qState.questions.length + 1);
            qState.questions.splice(idx + 1, 0, copy);
            serializeStateToParent(true);
            renderCards();
          });
          bDup.title = 'Duplicate Question';

          var bDel = btn('✕', 'jph-btn jph-btn--xs jph-btn--danger', function () {
            qState.questions.splice(idx, 1);
            serializeStateToParent(true);
            renderCards();
          });
          bDel.title = 'Delete Question';

          headBtns.append(bUp, bDown, bDup, bDel);
          head.append(headLeft, headBtns);
          card.appendChild(head);

          // Question EN & OR
          var qGrid = el('div', 'jph-form-grid jph-form-grid--2');
          var qEnWrap = el('div', 'jph-field');
          qEnWrap.appendChild(el('label', 'jph-label', 'Question (English) *'));
          var qEn = el('textarea', 'jph-textarea jph-quiz-q-input');
          qEn.rows = 2;
          qEn.placeholder = 'Enter question in English…';
          qEn.value = q.question_en || '';
          qEn.addEventListener('input', function () {
            q.question_en = qEn.value;
            serializeStateToParent(true);
          });
          qEnWrap.appendChild(qEn);

          var qOrWrap = el('div', 'jph-field');
          qOrWrap.appendChild(el('label', 'jph-label', 'Question (ଓଡ଼ିଆ)'));
          var qOr = el('textarea', 'jph-textarea jph-quiz-q-input');
          qOr.rows = 2;
          qOr.placeholder = 'ଓଡ଼ିଆରେ ପ୍ରଶ୍ନ ଲେଖନ୍ତୁ…';
          qOr.value = q.question_or || '';
          qOr.addEventListener('input', function () {
            q.question_or = qOr.value;
            serializeStateToParent(true);
          });
          qOrWrap.appendChild(qOr);
          qGrid.append(qEnWrap, qOrWrap);
          card.appendChild(qGrid);

          // 4 Option rows (A, B, C, D) with answer_index radio
          var optsBox = el('div', 'jph-quiz-opts');
          optsBox.appendChild(el('div', 'jph-label', 'Options (Select the radio button for the correct answer A–D)'));
          OPTION_LETTERS.forEach(function (letter, optIdx) {
            var optRow = el('div', 'jph-quiz-opt-row' + (q.answer_index === optIdx ? ' is-correct' : ''));
            var radLabel = el('label', 'jph-quiz-radio-lbl');
            var rad = el('input');
            rad.type = 'radio';
            rad.name = radioGroupName;
            rad.checked = q.answer_index === optIdx;
            rad.setAttribute('aria-label', 'Mark Option ' + letter + ' as correct');
            rad.addEventListener('change', function () {
              if (!rad.checked) return;
              q.answer_index = optIdx;
              serializeStateToParent(true);
              renderCards();
            });
            radLabel.append(rad, el('span', 'jph-quiz-opt-letter', letter));

            var oEn = el('input', 'jph-input');
            oEn.placeholder = 'Option ' + letter + ' (English) *';
            oEn.value = (q.options_en && q.options_en[optIdx]) || '';
            oEn.addEventListener('input', function () {
              q.options_en[optIdx] = oEn.value;
              serializeStateToParent(true);
            });

            var oOr = el('input', 'jph-input');
            oOr.placeholder = 'ବିକଳ୍ପ ' + letter + ' (ଓଡ଼ିଆ)';
            oOr.value = (q.options_or && q.options_or[optIdx]) || '';
            oOr.addEventListener('input', function () {
              q.options_or[optIdx] = oOr.value;
              serializeStateToParent(true);
            });

            optRow.append(radLabel, oEn, oOr);
            optsBox.appendChild(optRow);
          });
          card.appendChild(optsBox);

          // Explanation EN & OR
          var expGrid = el('div', 'jph-form-grid jph-form-grid--2');
          var eEnWrap = el('div', 'jph-field');
          eEnWrap.appendChild(el('label', 'jph-label', 'Explanation (English)'));
          var eEn = el('input', 'jph-input');
          eEn.placeholder = 'Why this option is correct (English)…';
          eEn.value = q.explanation_en || '';
          eEn.addEventListener('input', function () {
            q.explanation_en = eEn.value;
            serializeStateToParent(true);
          });
          eEnWrap.appendChild(eEn);

          var eOrWrap = el('div', 'jph-field');
          eOrWrap.appendChild(el('label', 'jph-label', 'Explanation (ଓଡ଼ିଆ)'));
          var eOr = el('input', 'jph-input');
          eOr.placeholder = 'ସଠିକ୍ ଉତ୍ତରର ବ୍ୟାଖ୍ୟା (ଓଡ଼ିଆ)…';
          eOr.value = q.explanation_or || '';
          eOr.addEventListener('input', function () {
            q.explanation_or = eOr.value;
            serializeStateToParent(true);
          });
          eOrWrap.appendChild(eOr);
          expGrid.append(eEnWrap, eOrWrap);
          card.appendChild(expGrid);

          listHost.appendChild(card);
        });
      }

      body.appendChild(listHost);
      serializeStateToParent(true);
      renderCards();
      return details;
    }

    window.CSOQuizBuilder = {
      buildQuizEditorAccordion: buildQuizEditorAccordion,
      validateQuizJsonString: validateQuizJsonString
    };
  })();
})(window, document);
