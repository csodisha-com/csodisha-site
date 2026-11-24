/**
 * CS Odisha — Community, Interest Circles, Moderation & Pro Rewards Studio (v252)
 * Strict CSP-compliant Admin Studio module (Alt+4):
 *  - Zero HTML string sinks, zero inline style attributes, zero inline event handlers.
 *  - Every mutation writes to D1, purges Cloudflare Edge caches, and reflects live on /community/.
 *  - 5 Integrated Tabs:
 *      1. Community Feed, Moderation & Spotlights
 *      2. 3-Layer Communities of Interest Studio (Circle -> Group -> Sub-Topic)
 *      3. Pro & Permanent Contributor Rewards Manager
 *      4. Peer Q&A, Answer Key Watch, Memory Questions & DM Safety Queue
 *      5. Citizen Feedback & System Operations (Preserved Legacy Tools)
 */
(function (window, document) {
  'use strict';

  var POST_TYPES = [
    ['question', 'Question / Peer Q&A'],
    ['shared_notes', 'Shared Notes / Mind Map'],
    ['memory_question', 'Memory-Based Exam Question'],
    ['answer_key_objection', 'Answer Key Objection'],
    ['center_radar', 'Exam-Day Center Radar'],
    ['scheme_playbook', 'Scheme Resolution Playbook'],
    ['daily_checkin', 'Daily Study Check-In'],
    ['editorial_spotlight', 'Editorial Spotlight'],
    ['poll', 'Live Poll'],
    ['quiz_challenge', 'Daily Quiz Challenge']
  ];
  var POLICIES = [
    ['open_verified', 'Open for Registered Members'],
    ['pre_moderated', 'Pre-Moderated Queue'],
    ['pro_only', 'Pro & Permanent Members Only'],
    ['admin_only', 'Admin Spotlight Only']
  ];

  var S = {
    root: null,
    headerActions: null,
    activeTab: 'feed',
    taxonomyNodes: [],
    posts: [],
    kpis: { total_communities: 0, active_members: 0, answer_rate_pct: 100, pro_permanent_granted: 0, pending_moderation: 0, memory_ready_promote: 0, total_posts: 0 },
    rewardRules: null,
    contributors: [],
    moderation: { open_questions: [], answer_key_watch: [], memory_promote_queue: [], recent_replies: [], flagged_messages: [] },
    filters: { l1: '', l2: '', l3: '', type: '', status: '', search: '' },
    taxSelL1: '',
    taxSelL2: '',
    composerOpen: false,
    editingPost: null,
    legacyMountId: 'module-comm-feedback'
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

  function csrfToken() {
    var m = document.cookie.match(/(?:^|;\s*)cso_csrf=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  async function api(url, opts) {
    var o = Object.assign({ credentials: 'same-origin' }, opts || {});
    var headers = Object.assign({}, o.headers || {});
    var method = String(o.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD') {
      var tok = csrfToken();
      if (tok) headers['X-CSRF-Token'] = tok;
      if (o.body && typeof o.body === 'object' && !(o.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        o.body = JSON.stringify(o.body);
      }
    }
    o.headers = headers;
    var res = await fetch(url, o);
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) throw new Error(data.error || ('Request failed (' + res.status + ')'));
    return data;
  }

  function nodesByLevel(lvl, parentId) {
    return S.taxonomyNodes.filter(function (n) {
      if (Number(n.level) !== lvl) return false;
      if (lvl === 1) return true;
      return String(n.parent_id || '') === String(parentId || '');
    });
  }

  function copyBroadcast(p) {
    var base = window.location.origin || 'https://csodisha.com';
    var url = base + '/community/?slug=' + encodeURIComponent(p.slug || '');
    var txt = [
      '📣 ' + (p.title_en || 'CS Odisha Community Update'),
      p.title_or ? '💬 ' + p.title_or : '',
      p.body_en ? p.body_en.slice(0, 180) : '',
      '🔗 Join Discussion / Vote / Earn Pro XP: ' + url
    ].filter(Boolean).join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () {
        toast('Bilingual community broadcast copied for Telegram / WhatsApp.', 'success');
      }).catch(function () { toast('Clipboard unavailable.', 'error'); });
    }
  }

  async function loadAllData() {
    var q = new URLSearchParams();
    Object.keys(S.filters).forEach(function (k) { if (S.filters[k]) q.set(k, S.filters[k]); });
    var qs = q.toString() ? ('?' + q.toString()) : '';
    var results = await Promise.all([
      api('/api/admin/community/taxonomy').catch(function () { return { nodes: [] }; }),
      api('/api/admin/community/posts' + qs).catch(function () { return { items: [], kpis: S.kpis }; }),
      api('/api/admin/community/reward-rules').catch(function () { return { rules: null }; }),
      api('/api/admin/community/contributors').catch(function () { return { items: [] }; }),
      api('/api/admin/community/moderation').catch(function () { return S.moderation; })
    ]);
    S.taxonomyNodes = results[0].nodes || [];
    S.posts = results[1].items || [];
    S.kpis = results[1].kpis || S.kpis;
    S.rewardRules = results[2].rules || S.rewardRules;
    S.contributors = results[3].items || [];
    S.moderation = results[4] || S.moderation;
    if (window.CSOStudio && window.CSOStudio.setCommunityCount) {
      window.CSOStudio.setCommunityCount(S.kpis.total_posts || S.posts.length);
    }
  }

  async function refreshAndRender() {
    try {
      await loadAllData();
      renderWorkspace();
    } catch (e) {
      toast(e.message || 'Failed to sync Community Studio.', 'error');
    }
  }

  function renderHeaderActions() {
    if (!S.headerActions) return;
    clear(S.headerActions);

    var btnNew = el('button', 'cmps-btn cmps-btn-primary', '+ Publish Official Spotlight / Quiz / Poll');
    btnNew.type = 'button';
    btnNew.addEventListener('click', function () { openComposer(null); });

    var btnLive = el('a', 'cmps-btn', 'View Live Community ↗');
    btnLive.href = '/community/';
    btnLive.target = '_blank';
    btnLive.rel = 'noopener noreferrer';

    var btnSync = el('button', 'cmps-btn', '↻ Sync D1');
    btnSync.type = 'button';
    btnSync.addEventListener('click', function () { refreshAndRender(); toast('Community Studio synced from live D1.', 'info'); });

    S.headerActions.append(btnNew, btnLive, btnSync);
  }

  function renderTabs(shell) {
    var tabs = el('div', 'cmps-tabs');
    tabs.setAttribute('role', 'tablist');
    var defs = [
      { id: 'feed', label: '📣 Feed, Moderation & Spotlights', count: S.kpis.total_posts || 0, alert: S.kpis.pending_moderation > 0 },
      { id: 'taxonomy', label: '🗂 3-Layer Interest Circles', count: S.taxonomyNodes.length },
      { id: 'rewards', label: '👑 Pro & Permanent Rewards', count: S.kpis.pro_permanent_granted || 0 },
      { id: 'safety', label: '⚖️ Q&A, Keys, Memory & DM Safety', count: (S.moderation.flagged_messages || []).length + (S.moderation.memory_promote_queue || []).length },
      { id: 'ops', label: '🛠 Citizen Feedback & System Ops', count: 'Tools' }
    ];
    defs.forEach(function (d) {
      var b = el('button', 'cmps-tab-btn' + (S.activeTab === d.id && !S.composerOpen ? ' is-active' : ''));
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.appendChild(el('span', '', d.label));
      b.appendChild(el('span', 'cmps-tab-badge' + (d.alert ? ' is-alert' : ''), String(d.count)));
      b.addEventListener('click', function () {
        S.composerOpen = false;
        S.activeTab = d.id;
        renderWorkspace();
      });
      tabs.appendChild(b);
    });
    shell.appendChild(tabs);
  }

  // ============================================================================
  // TAB 1: COMMUNITY FEED, MODERATION & SPOTLIGHTS
  // ============================================================================
  function renderFeedTab(shell) {
    var kpis = el('div', 'cmps-kpi-grid');
    [
      ['Total Communities (3-Layer)', S.kpis.total_communities || 0, ''],
      ['Active Members', S.kpis.active_members || 0, 'is-cobalt'],
      ['Q&A Answer Rate', (S.kpis.answer_rate_pct || 100) + '%', ''],
      ['Pro & Permanent Granted', S.kpis.pro_permanent_granted || 0, 'is-gold'],
      ['Pending Moderation', S.kpis.pending_moderation || 0, 'is-rose'],
      ['Memory Qs Ready to Promote', S.kpis.memory_ready_promote || 0, 'is-violet']
    ].forEach(function (k) {
      var c = el('div', 'cmps-kpi ' + k[2]);
      c.appendChild(el('span', 'cmps-kpi-label', k[0]));
      c.appendChild(el('strong', 'cmps-kpi-val', String(k[1])));
      kpis.appendChild(c);
    });
    shell.appendChild(kpis);

    var fbar = el('div', 'cmps-filter-bar');
    var selL1 = el('select', 'cmps-select');
    selL1.appendChild(new Option('All Circles (L1)', ''));
    nodesByLevel(1).forEach(function (n) { selL1.appendChild(new Option(n.title_en, n.id)); });
    selL1.value = S.filters.l1;
    selL1.addEventListener('change', function () { S.filters.l1 = selL1.value; S.filters.l2 = ''; S.filters.l3 = ''; refreshAndRender(); });

    var selL2 = el('select', 'cmps-select');
    selL2.appendChild(new Option('All Groups (L2)', ''));
    if (S.filters.l1) nodesByLevel(2, S.filters.l1).forEach(function (n) { selL2.appendChild(new Option(n.title_en, n.id)); });
    selL2.value = S.filters.l2;
    selL2.addEventListener('change', function () { S.filters.l2 = selL2.value; S.filters.l3 = ''; refreshAndRender(); });

    var selL3 = el('select', 'cmps-select');
    selL3.appendChild(new Option('All Sub-Topics (L3)', ''));
    if (S.filters.l2) nodesByLevel(3, S.filters.l2).forEach(function (n) { selL3.appendChild(new Option(n.title_en, n.id)); });
    selL3.value = S.filters.l3;
    selL3.addEventListener('change', function () { S.filters.l3 = selL3.value; refreshAndRender(); });

    var selType = el('select', 'cmps-select');
    selType.appendChild(new Option('All Post Types', ''));
    POST_TYPES.forEach(function (p) { selType.appendChild(new Option(p[1], p[0])); });
    selType.value = S.filters.type;
    selType.addEventListener('change', function () { S.filters.type = selType.value; refreshAndRender(); });

    var selStat = el('select', 'cmps-select');
    [['', 'All Status'], ['published', 'Published'], ['pending_review', 'Pending Review'], ['hidden', 'Hidden'], ['flagged', 'Flagged']].forEach(function (s) {
      selStat.appendChild(new Option(s[1], s[0]));
    });
    selStat.value = S.filters.status;
    selStat.addEventListener('change', function () { S.filters.status = selStat.value; refreshAndRender(); });

    var qInp = el('input', 'cmps-input cmps-search');
    qInp.type = 'search';
    qInp.placeholder = 'Search posts, authors, districts, exams...';
    qInp.value = S.filters.search;
    qInp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { S.filters.search = qInp.value.trim(); refreshAndRender(); } });

    var bGo = el('button', 'cmps-btn', 'Filter'); bGo.type = 'button';
    bGo.addEventListener('click', function () { S.filters.search = qInp.value.trim(); refreshAndRender(); });
    fbar.append(selL1, selL2, selL3, selType, selStat, qInp, bGo);
    shell.appendChild(fbar);

    if (!S.posts.length) {
      shell.appendChild(el('div', 'cmps-empty', 'No community posts match your filters yet.'));
      return;
    }

    var list = el('div', 'cmps-post-list');
    S.posts.forEach(function (p) {
      var cardCls = 'cmps-post-card';
      if (p.moderation_status === 'pending_review') cardCls += ' is-pending';
      else if (p.moderation_status === 'hidden' || p.moderation_status === 'flagged') cardCls += ' is-hidden';
      else if (p.is_pinned) cardCls += ' is-pinned';

      var card = el('article', cardCls);
      var top = el('div', 'cmps-section-head');
      var meta = el('div', 'cmps-inline-row');
      meta.appendChild(el('span', 'cmps-pill' + (p.moderation_status === 'pending_review' ? ' is-pending' : (p.moderation_status === 'hidden' ? ' is-hidden' : '')), p.moderation_status.toUpperCase()));
      meta.appendChild(el('span', 'cmps-pill', p.post_type.replace(/_/g, ' ')));
      if (p.is_pinned) meta.appendChild(el('span', 'cmps-pill is-perm', '📌 PINNED'));
      if (p.is_featured_collection) meta.appendChild(el('span', 'cmps-pill is-pro', '🌟 Featured Collection'));
      if (p.bounty_xp > 0) meta.appendChild(el('span', 'cmps-pill is-pro', '+' + p.bounty_xp + ' XP Bounty'));
      top.appendChild(meta);
      top.appendChild(el('span', 'cmps-row-sub', '👍 ' + p.upvotes_count + ' · 💬 ' + p.replies_count + ' · 👁 ' + p.views_count));
      card.appendChild(top);

      card.appendChild(el('strong', '', p.title_en));
      var crumbs = [p.taxonomy && p.taxonomy.l1 && p.taxonomy.l1.title_en, p.taxonomy && p.taxonomy.l2 && p.taxonomy.l2.title_en, p.taxonomy && p.taxonomy.l3 && p.taxonomy.l3.title_en].filter(Boolean);
      card.appendChild(el('div', 'cmps-row-sub', 'By ' + p.author_display_name + (p.author_badge ? ' (' + p.author_badge + ')' : '') + ' · ' + (crumbs.join(' › ') || 'General') + (p.district_tag ? ' · ' + p.district_tag : '')));
      if (p.body_en) card.appendChild(el('div', 'cmps-row-sub', p.body_en.slice(0, 200)));

      var acts = el('div', 'cmps-actions');

      if (p.moderation_status !== 'published') {
        var bApp = el('button', 'cmps-btn cmps-btn-sm cmps-btn-primary', '✓ Approve & Publish Live'); bApp.type = 'button';
        bApp.addEventListener('click', function () { patchPost(p.id, { moderation_status: 'published' }, 'Post approved & live on public site!'); });
        acts.appendChild(bApp);
      }

      if (p.author_user_id && p.author_user_id !== 'system-editorial') {
        var bPro = el('button', 'cmps-btn cmps-btn-sm cmps-btn-gold', '⭐ Grant Pro'); bPro.type = 'button';
        bPro.addEventListener('click', function () { grantMemberTier(p.author_user_id, 'pro_member', p.id, 'Rewarded for helpful post: ' + p.title_en); });
        var bPerm = el('button', 'cmps-btn cmps-btn-sm cmps-btn-violet', '👑 Grant Permanent'); bPerm.type = 'button';
        bPerm.addEventListener('click', function () { grantMemberTier(p.author_user_id, 'permanent_member', p.id, 'Permanent Founding Member reward for: ' + p.title_en); });
        acts.append(bPro, bPerm);
      }

      var bPin = el('button', 'cmps-btn cmps-btn-sm', p.is_pinned ? 'Unpin' : '📌 Pin'); bPin.type = 'button';
      bPin.addEventListener('click', function () { patchPost(p.id, { is_pinned: p.is_pinned ? 0 : 1 }, 'Pin status updated live.'); });

      var bFeat = el('button', 'cmps-btn cmps-btn-sm', p.is_featured_collection ? 'Unfeature' : '🌟 Feature Collection'); bFeat.type = 'button';
      bFeat.addEventListener('click', function () { patchPost(p.id, { is_featured_collection: p.is_featured_collection ? 0 : 1 }, 'Featured Collection updated live.'); });

      var bLock = el('button', 'cmps-btn cmps-btn-sm', p.is_locked ? 'Unlock' : '🔒 Lock'); bLock.type = 'button';
      bLock.addEventListener('click', function () { patchPost(p.id, { is_locked: p.is_locked ? 0 : 1 }, 'Thread lock toggled.'); });

      if (!p.promoted_study_id) {
        var bProm = el('button', 'cmps-btn cmps-btn-sm cmps-btn-cobalt', '📚 Promote → Study Library'); bProm.type = 'button';
        bProm.addEventListener('click', async function () {
          try {
            await api('/api/admin/community/' + encodeURIComponent(p.id) + '/promote-study', { method: 'POST', body: {} });
            toast('Promoted to Study Library draft & featured!', 'success');
            refreshAndRender();
          } catch (err) { toast(err.message, 'error'); }
        });
        acts.appendChild(bProm);
      }

      var bEdit = el('button', 'cmps-btn cmps-btn-sm', 'Edit'); bEdit.type = 'button';
      bEdit.addEventListener('click', function () { openComposer(p); });

      var aView = el('a', 'cmps-btn cmps-btn-sm', 'View Live ↗');
      aView.href = '/community/?slug=' + encodeURIComponent(p.slug);
      aView.target = '_blank'; aView.rel = 'noopener noreferrer';

      var bCopy = el('button', 'cmps-btn cmps-btn-sm', 'Alert Copy'); bCopy.type = 'button';
      bCopy.addEventListener('click', function () { copyBroadcast(p); });

      if (p.author_user_id && p.author_user_id !== 'system-editorial') {
        var bCand = el('button', 'cmps-btn cmps-btn-sm', '👤 Candidate Hub'); bCand.type = 'button';
        bCand.addEventListener('click', function () {
          if (window.CSOStudio && window.CSOStudio.openCandidateHubTab) window.CSOStudio.openCandidateHubTab('roster');
        });
        acts.appendChild(bCand);
      }

      var bHide = el('button', 'cmps-btn cmps-btn-sm', p.moderation_status === 'hidden' ? 'Restore' : 'Hide'); bHide.type = 'button';
      bHide.addEventListener('click', function () {
        patchPost(p.id, { moderation_status: p.moderation_status === 'hidden' ? 'published' : 'hidden' }, 'Visibility updated live.');
      });

      var bDel = el('button', 'cmps-btn cmps-btn-sm cmps-btn-danger', 'Delete'); bDel.type = 'button';
      bDel.addEventListener('click', async function () {
        if (!window.confirm('Delete community post "' + p.title_en + '" permanently?')) return;
        await api('/api/admin/community/posts/' + encodeURIComponent(p.id), { method: 'DELETE' });
        toast('Post deleted & public caches invalidated.', 'success');
        refreshAndRender();
      });

      acts.append(bPin, bFeat, bLock, bEdit, aView, bCopy, bHide, bDel);
      card.appendChild(acts);
      list.appendChild(card);
    });
    shell.appendChild(list);
  }

  async function patchPost(id, patch, okMsg) {
    try {
      await api('/api/admin/community/posts/' + encodeURIComponent(id), { method: 'PUT', body: patch });
      toast(okMsg, 'success');
      refreshAndRender();
    } catch (e) { toast(e.message, 'error'); }
  }

  async function grantMemberTier(userId, tier, postId, reason) {
    try {
      await api('/api/admin/community/grant-membership', {
        method: 'POST',
        body: { user_id: userId, membership_tier: tier, post_id: postId || '', reason: reason || '' }
      });
      toast('Updated member to ' + tier.replace(/_/g, ' ') + ' & synced Candidate Hub!', 'success');
      refreshAndRender();
    } catch (e) { toast(e.message, 'error'); }
  }

  // ============================================================================
  // COMPOSER: OFFICIAL SPOTLIGHT / LIVE POLL / 5-Q DAILY QUIZ CHALLENGE
  // ============================================================================
  function openComposer(item) {
    S.editingPost = item ? JSON.parse(JSON.stringify(item)) : {
      id: '', slug: '', post_type: 'editorial_spotlight',
      category_l1_id: '', category_l2_id: '', category_l3_id: '',
      district_tag: 'All Odisha', exam_tag: '', title_en: '', title_or: '',
      body_en: '', body_or: '', cover_image_url: '', attachment_url: '', attachment_label: '',
      poll_options: ['', ''], challenge_mcqs: [],
      is_pinned: false, is_featured_collection: false, moderation_status: 'published'
    };
    S.composerOpen = true;
    renderWorkspace();
  }

  function openQuickAddTaxonomyModal(level, parentId, onCreated) {
    var modal = document.getElementById('globalModal');
    var titleEl = document.getElementById('modalTitle');
    var bodyEl = document.getElementById('modalBody');
    var footEl = document.getElementById('modalFooter');
    if (!modal || !bodyEl || !footEl) return;

    titleEl.textContent = '+ Add Community Level ' + level + ' Circle';
    clear(bodyEl); clear(footEl);
    var fEn = el('input', 'cmps-input'); fEn.placeholder = 'English Title (e.g. Puri District Chapter)';
    var fOr = el('input', 'cmps-input'); fOr.placeholder = 'ଓଡ଼ିଆ ଶୀର୍ଷକ';
    var fSub = el('input', 'cmps-input'); fSub.placeholder = 'Subtitle (EN)';
    var fIcon = el('input', 'cmps-input'); fIcon.value = level === 1 ? '🎯' : (level === 2 ? '🗺️' : '💬');
    var fPol = el('select', 'cmps-select');
    POLICIES.forEach(function (p) { fPol.appendChild(new Option(p[1], p[0])); });

    [['Title (EN) *', fEn], ['Title (ଓଡ଼ିଆ)', fOr], ['Subtitle (EN)', fSub], ['Icon', fIcon], ['Posting Policy', fPol]].forEach(function (pair) {
      var fg = el('div', 'cmps-field');
      fg.appendChild(el('label', '', pair[0]));
      fg.appendChild(pair[1]);
      bodyEl.appendChild(fg);
    });

    var bCan = el('button', 'cmps-btn', 'Cancel'); bCan.type = 'button';
    bCan.addEventListener('click', function () { modal.hidden = true; });
    var bSave = el('button', 'cmps-btn cmps-btn-primary', 'Create Live'); bSave.type = 'button';
    bSave.addEventListener('click', async function () {
      if (!fEn.value.trim()) { toast('English title required.', 'error'); return; }
      try {
        var res = await api('/api/admin/community/taxonomy', {
          method: 'POST',
          body: { level: level, parent_id: level === 1 ? null : parentId, title_en: fEn.value.trim(), title_or: fOr.value.trim(), subtitle_en: fSub.value.trim(), icon: fIcon.value.trim(), posting_policy: fPol.value, is_published: 1 }
        });
        modal.hidden = true;
        await loadAllData();
        toast('Community circle created & live!', 'success');
        if (typeof onCreated === 'function') onCreated(res.node);
      } catch (err) { toast(err.message, 'error'); }
    });
    footEl.append(bCan, bSave);
    modal.hidden = false;
  }

  function renderComposer(shell) {
    var p = S.editingPost;
    var sec = el('section', 'cmps-section');
    var head = el('div', 'cmps-section-head');
    var bBack = el('button', 'cmps-btn', '← Back to Community Feed'); bBack.type = 'button';
    bBack.addEventListener('click', function () { S.composerOpen = false; renderWorkspace(); });
    head.append(bBack, el('h2', 'cmps-section-title', p.id ? 'Edit Community Post' : 'Publish Official Spotlight / Live Poll / Daily Quiz Challenge'));
    sec.appendChild(head);

    var selL1 = el('select', 'cmps-select');
    var selL2 = el('select', 'cmps-select');
    var selL3 = el('select', 'cmps-select');
    function fillTax() {
      clear(selL1); selL1.appendChild(new Option('Select Circle (L1)...', ''));
      nodesByLevel(1).forEach(function (n) { selL1.appendChild(new Option(n.title_en, n.id)); });
      selL1.value = p.category_l1_id || '';
      clear(selL2); selL2.appendChild(new Option('Select Group (L2)...', ''));
      if (p.category_l1_id) nodesByLevel(2, p.category_l1_id).forEach(function (n) { selL2.appendChild(new Option(n.title_en, n.id)); });
      selL2.value = p.category_l2_id || '';
      clear(selL3); selL3.appendChild(new Option('Select Sub-Topic (L3)...', ''));
      if (p.category_l2_id) nodesByLevel(3, p.category_l2_id).forEach(function (n) { selL3.appendChild(new Option(n.title_en, n.id)); });
      selL3.value = p.category_l3_id || '';
    }
    fillTax();
    selL1.addEventListener('change', function () { p.category_l1_id = selL1.value; p.category_l2_id = ''; p.category_l3_id = ''; fillTax(); });
    selL2.addEventListener('change', function () { p.category_l2_id = selL2.value; p.category_l3_id = ''; fillTax(); });
    selL3.addEventListener('change', function () { p.category_l3_id = selL3.value; });

    function makeTaxBox(lbl, sel, lvl) {
      var fg = el('div', 'cmps-field');
      fg.appendChild(el('label', '', lbl));
      var r = el('div', 'cmps-inline-row');
      r.appendChild(sel);
      var b = el('button', 'cmps-btn cmps-btn-sm', '+ Add'); b.type = 'button';
      b.addEventListener('click', function () {
        if (lvl === 2 && !p.category_l1_id) { toast('Select L1 first.', 'error'); return; }
        if (lvl === 3 && !p.category_l2_id) { toast('Select L2 first.', 'error'); return; }
        openQuickAddTaxonomyModal(lvl, lvl === 2 ? p.category_l1_id : (lvl === 3 ? p.category_l2_id : null), function (node) {
          if (lvl === 1) { p.category_l1_id = node.id; p.category_l2_id = ''; p.category_l3_id = ''; }
          if (lvl === 2) { p.category_l2_id = node.id; p.category_l3_id = ''; }
          if (lvl === 3) p.category_l3_id = node.id;
          fillTax();
        });
      });
      r.appendChild(b); fg.appendChild(r); return fg;
    }

    var gTax = el('div', 'cmps-grid-3');
    gTax.append(makeTaxBox('Circle (L1)', selL1, 1), makeTaxBox('Group (L2)', selL2, 2), makeTaxBox('Sub-Topic (L3)', selL3, 3));
    sec.appendChild(gTax);

    var typeSel = el('select', 'cmps-select');
    POST_TYPES.forEach(function (pt) { typeSel.appendChild(new Option(pt[1], pt[0])); });
    typeSel.value = p.post_type || 'editorial_spotlight';
    typeSel.addEventListener('change', function () { p.post_type = typeSel.value; renderWorkspace(); });

    var distInp = el('input', 'cmps-input'); distInp.value = p.district_tag || ''; distInp.placeholder = 'e.g. All Odisha / Khordha';
    distInp.addEventListener('input', function () { p.district_tag = distInp.value; });
    var examInp = el('input', 'cmps-input'); examInp.value = p.exam_tag || ''; examInp.placeholder = 'e.g. OPSC OAS / OSSC CGL';
    examInp.addEventListener('input', function () { p.exam_tag = examInp.value; });

    var tEn = el('input', 'cmps-input'); tEn.value = p.title_en || ''; tEn.placeholder = 'Title (English) *';
    tEn.addEventListener('input', function () { p.title_en = tEn.value; });
    var tOr = el('input', 'cmps-input'); tOr.value = p.title_or || ''; tOr.placeholder = 'ଶୀର୍ଷକ (ଓଡ଼ିଆ)';
    tOr.addEventListener('input', function () { p.title_or = tOr.value; });
    var bEn = el('textarea', 'cmps-textarea'); bEn.rows = 6; bEn.value = p.body_en || ''; bEn.placeholder = 'Body (English)';
    bEn.addEventListener('input', function () { p.body_en = bEn.value; });
    var bOr = el('textarea', 'cmps-textarea'); bOr.rows = 6; bOr.value = p.body_or || ''; bOr.placeholder = 'ବିବରଣୀ (ଓଡ଼ିଆ)';
    bOr.addEventListener('input', function () { p.body_or = bOr.value; });

    var covInp = el('input', 'cmps-input'); covInp.value = p.cover_image_url || ''; covInp.placeholder = '/api/media/community-publishing/...';
    covInp.addEventListener('input', function () { p.cover_image_url = covInp.value; });
    var covFile = el('input', 'cmps-input'); covFile.type = 'file'; covFile.accept = 'image/jpeg,image/png,image/webp';
    covFile.addEventListener('change', async function () {
      if (!covFile.files || !covFile.files[0]) return;
      var fd = new FormData(); fd.append('file', covFile.files[0]); fd.append('purpose', 'cover');
      var res = await api('/api/admin/community/upload', { method: 'POST', body: fd });
      p.cover_image_url = res.url; covInp.value = res.url; toast('Cover uploaded to R2.', 'success');
    });

    var attInp = el('input', 'cmps-input'); attInp.value = p.attachment_url || ''; attInp.placeholder = 'PDF Attachment URL';
    attInp.addEventListener('input', function () { p.attachment_url = attInp.value; });
    var attFile = el('input', 'cmps-input'); attFile.type = 'file'; attFile.accept = 'application/pdf';
    attFile.addEventListener('change', async function () {
      if (!attFile.files || !attFile.files[0]) return;
      var fd = new FormData(); fd.append('file', attFile.files[0]); fd.append('purpose', 'attachment');
      var res = await api('/api/admin/community/upload', { method: 'POST', body: fd });
      p.attachment_url = res.url; p.attachment_label = res.filename; attInp.value = res.url; toast('PDF uploaded to R2.', 'success');
    });

    function fld(l, c) { var d = el('div', 'cmps-field'); d.append(el('label', '', l), c); return d; }
    var g1 = el('div', 'cmps-grid-3'); g1.append(fld('Post Type', typeSel), fld('District Tag', distInp), fld('Exam Tag', examInp));
    var g2 = el('div', 'cmps-grid-2'); g2.append(fld('Title (EN) *', tEn), fld('Title (ଓଡ଼ିଆ)', tOr), fld('Body (EN)', bEn), fld('Body (ଓଡ଼ିଆ)', bOr));
    var g3 = el('div', 'cmps-grid-2');
    var cBox = el('div', 'cmps-field'); cBox.append(el('label', '', 'Cover Image (R2)'), covFile, covInp);
    var aBox = el('div', 'cmps-field'); aBox.append(el('label', '', 'PDF Attachment (R2)'), attFile, attInp);
    g3.append(cBox, aBox);
    sec.append(g1, g2, g3);

    // Poll Builder
    if (p.post_type === 'poll') {
      if (!Array.isArray(p.poll_options)) p.poll_options = ['', ''];
      var pSec = el('div', 'cmps-field');
      pSec.appendChild(el('label', '', 'Live Poll Options (one option per input)'));
      p.poll_options.forEach(function (opt, idx) {
        var oi = el('input', 'cmps-input'); oi.value = opt; oi.placeholder = 'Option ' + (idx + 1);
        oi.addEventListener('input', function () { p.poll_options[idx] = oi.value; });
        pSec.appendChild(oi);
      });
      var bAddOpt = el('button', 'cmps-btn cmps-btn-sm', '+ Add Poll Option'); bAddOpt.type = 'button';
      bAddOpt.addEventListener('click', function () { p.poll_options.push(''); renderWorkspace(); });
      pSec.appendChild(bAddOpt);
      sec.appendChild(pSec);
    }

    // 5-Question Daily Quiz Builder
    if (p.post_type === 'quiz_challenge') {
      if (!Array.isArray(p.challenge_mcqs)) p.challenge_mcqs = [];
      var qSec = el('div', 'cmps-field');
      qSec.appendChild(el('label', '', 'Daily Peer Quiz Challenge Questions (' + p.challenge_mcqs.length + ')'));
      p.challenge_mcqs.forEach(function (q, qi) {
        var box = el('div', 'cmps-post-card');
        var qIn = el('input', 'cmps-input'); qIn.value = q.question_en || ''; qIn.placeholder = 'Q' + (qi + 1) + ' text';
        qIn.addEventListener('input', function () { q.question_en = qIn.value; });
        var og = el('div', 'cmps-grid-2');
        ['A', 'B', 'C', 'D'].forEach(function (l, oi) {
          var o = el('input', 'cmps-input'); o.value = (q.options && q.options[oi]) || ''; o.placeholder = 'Option ' + l;
          o.addEventListener('input', function () { if (!q.options) q.options = ['', '', '', '']; q.options[oi] = o.value; });
          og.appendChild(o);
        });
        var aSel = el('select', 'cmps-select');
        [['0', 'Correct: A'], ['1', 'Correct: B'], ['2', 'Correct: C'], ['3', 'Correct: D']].forEach(function (pr) { aSel.appendChild(new Option(pr[1], pr[0])); });
        aSel.value = String(q.correct_index || 0);
        aSel.addEventListener('change', function () { q.correct_index = Number(aSel.value); });
        box.append(qIn, og, aSel);
        qSec.appendChild(box);
      });
      var bAddQ = el('button', 'cmps-btn cmps-btn-sm cmps-btn-primary', '+ Add Quiz Question'); bAddQ.type = 'button';
      bAddQ.addEventListener('click', function () {
        p.challenge_mcqs.push({ id: 'cq' + (p.challenge_mcqs.length + 1), question_en: '', options: ['', '', '', ''], correct_index: 0, explanation_en: '' });
        renderWorkspace();
      });
      qSec.appendChild(bAddQ);
      sec.appendChild(qSec);
    }

    var foot = el('div', 'cmps-actions');
    var bDraft = el('button', 'cmps-btn', 'Save Draft & Open Public Preview ↗'); bDraft.type = 'button';
    bDraft.addEventListener('click', function () { saveComposer('pending_review', true); });
    var bPub = el('button', 'cmps-btn cmps-btn-primary', '🚀 Publish Live Immediately'); bPub.type = 'button';
    bPub.addEventListener('click', function () { saveComposer('published', false); });
    foot.append(bDraft, bPub);
    sec.appendChild(foot);
    shell.appendChild(sec);
  }

  async function saveComposer(modStatus, openPreview) {
    var p = S.editingPost;
    if (!p.title_en || !p.title_en.trim()) { toast('English title is required.', 'error'); return; }
    var payload = Object.assign({}, p, { moderation_status: modStatus });
    try {
      var res = p.id
        ? await api('/api/admin/community/posts/' + encodeURIComponent(p.id), { method: 'PUT', body: payload })
        : await api('/api/admin/community/posts', { method: 'POST', body: payload });
      S.editingPost = res.item;
      if (openPreview) {
        var tok = await api('/api/admin/community/' + encodeURIComponent(res.item.id) + '/preview-token', { method: 'POST', body: {} });
        window.open(tok.preview_url, '_blank', 'noopener');
        toast('Draft saved & opened real public-page preview!', 'success');
      } else {
        toast('Published live to /community/ & caches purged!', 'success');
        S.composerOpen = false;
      }
      await loadAllData();
      renderWorkspace();
    } catch (e) { toast(e.message, 'error'); }
  }

  // ============================================================================
  // TAB 2: 3-LAYER COMMUNITIES OF INTEREST STUDIO
  // ============================================================================
  function renderTaxonomyTab(shell) {
    var l1 = nodesByLevel(1);
    if (!S.taxSelL1 && l1.length) S.taxSelL1 = l1[0].id;
    var l2 = S.taxSelL1 ? nodesByLevel(2, S.taxSelL1) : [];
    if (S.taxSelL2 && !l2.some(function (n) { return n.id === S.taxSelL2; })) S.taxSelL2 = '';
    if (!S.taxSelL2 && l2.length) S.taxSelL2 = l2[0].id;
    var l3 = S.taxSelL2 ? nodesByLevel(3, S.taxSelL2) : [];

    var grid = el('div', 'cmps-tax-grid');
    function renderCol(lvl, title, list, parentId, selId, onSel) {
      var col = el('div', 'cmps-tax-col');
      var h = el('div', 'cmps-section-head');
      h.appendChild(el('strong', '', title + ' (' + list.length + ')'));
      var bAdd = el('button', 'cmps-btn cmps-btn-sm cmps-btn-primary', '+ Add'); bAdd.type = 'button';
      bAdd.addEventListener('click', function () {
        if (lvl > 1 && !parentId) { toast('Select a Level ' + (lvl - 1) + ' node first.', 'error'); return; }
        openQuickAddTaxonomyModal(lvl, parentId, function () { refreshAndRender(); });
      });
      h.appendChild(bAdd); col.appendChild(h);

      if (!list.length) {
        col.appendChild(el('div', 'cmps-empty', 'No circles here yet.'));
      } else {
        list.forEach(function (n) {
          var item = el('div', 'cmps-tax-item' + (selId === n.id ? ' is-selected' : ''));
          item.addEventListener('click', function () { if (onSel) onSel(n.id); });
          item.appendChild(el('strong', '', (n.icon ? n.icon + ' ' : '') + n.title_en));
          if (n.title_or) item.appendChild(el('div', 'cmps-row-sub', n.title_or));
          item.appendChild(el('div', 'cmps-row-sub', 'Policy: ' + n.posting_policy + ' · 👥 ' + n.members_count + ' · 💬 ' + (n.posts_count || 0)));

          var polSel = el('select', 'cmps-select');
          POLICIES.forEach(function (pr) { polSel.appendChild(new Option(pr[1], pr[0])); });
          polSel.value = n.posting_policy;
          polSel.addEventListener('click', function (ev) { ev.stopPropagation(); });
          polSel.addEventListener('change', async function () {
            await api('/api/admin/community/taxonomy/' + encodeURIComponent(n.id), { method: 'PUT', body: { posting_policy: polSel.value } });
            toast('Posting policy updated live.', 'success');
            refreshAndRender();
          });
          item.appendChild(polSel);

          var acts = el('div', 'cmps-actions');
          var bUp = el('button', 'cmps-btn cmps-btn-sm', '↑'); bUp.type = 'button';
          bUp.addEventListener('click', async function (ev) { ev.stopPropagation(); await api('/api/admin/community/taxonomy/' + encodeURIComponent(n.id) + '/move', { method: 'POST', body: { direction: 'up' } }); refreshAndRender(); });
          var bDn = el('button', 'cmps-btn cmps-btn-sm', '↓'); bDn.type = 'button';
          bDn.addEventListener('click', async function (ev) { ev.stopPropagation(); await api('/api/admin/community/taxonomy/' + encodeURIComponent(n.id) + '/move', { method: 'POST', body: { direction: 'down' } }); refreshAndRender(); });
          var bTog = el('button', 'cmps-btn cmps-btn-sm', n.is_published ? 'Hide' : 'Publish'); bTog.type = 'button';
          bTog.addEventListener('click', async function (ev) { ev.stopPropagation(); await api('/api/admin/community/taxonomy/' + encodeURIComponent(n.id), { method: 'PUT', body: { is_published: n.is_published ? 0 : 1 } }); refreshAndRender(); });
          var bDel = el('button', 'cmps-btn cmps-btn-sm cmps-btn-danger', '×'); bDel.type = 'button';
          bDel.addEventListener('click', async function (ev) {
            ev.stopPropagation();
            if (!window.confirm('Delete "' + n.title_en + '"?')) return;
            try { await api('/api/admin/community/taxonomy/' + encodeURIComponent(n.id), { method: 'DELETE' }); refreshAndRender(); }
            catch (err) { toast(err.message, 'error'); }
          });
          acts.append(bUp, bDn, bTog, bDel);
          item.appendChild(acts);
          col.appendChild(item);
        });
      }
      return col;
    }

    grid.append(
      renderCol(1, 'L1: Community Circle', l1, null, S.taxSelL1, function (id) { S.taxSelL1 = id; S.taxSelL2 = ''; renderWorkspace(); }),
      renderCol(2, 'L2: Interest Group', l2, S.taxSelL1, S.taxSelL2, function (id) { S.taxSelL2 = id; renderWorkspace(); }),
      renderCol(3, 'L3: Sub-Topic / Format', l3, S.taxSelL2, '', null)
    );
    shell.appendChild(grid);
  }

  // ============================================================================
  // TAB 3: PRO & PERMANENT CONTRIBUTOR REWARDS MANAGER
  // ============================================================================
  function renderRewardsTab(shell) {
    var rules = S.rewardRules || { auto_grant_enabled: true, pro_threshold_posts: 3, permanent_threshold_posts: 10, xp_per_approved_post: 40, xp_per_best_answer: 50 };
    var sec = el('section', 'cmps-section');
    sec.appendChild(el('h3', 'cmps-section-title', 'Automatic Pro ⭐ & Permanent 👑 Contributor Reward Thresholds'));

    var g = el('div', 'cmps-grid-3');
    var inPro = el('input', 'cmps-input'); inPro.type = 'number'; inPro.value = String(rules.pro_threshold_posts);
    var inPerm = el('input', 'cmps-input'); inPerm.type = 'number'; inPerm.value = String(rules.permanent_threshold_posts);
    var inXpPost = el('input', 'cmps-input'); inXpPost.type = 'number'; inXpPost.value = String(rules.xp_per_approved_post);
    var inXpBest = el('input', 'cmps-input'); inXpBest.type = 'number'; inXpBest.value = String(rules.xp_per_best_answer);
    var cbAuto = el('input'); cbAuto.type = 'checkbox'; cbAuto.checked = Boolean(rules.auto_grant_enabled);

    function f(l, c) { var d = el('div', 'cmps-field'); d.append(el('label', '', l), c); return d; }
    g.append(
      f('Posts to Auto-Unlock Pro Member ⭐', inPro),
      f('Posts to Auto-Unlock Permanent Member 👑', inPerm),
      f('XP per Approved Post', inXpPost),
      f('XP per Best Answer', inXpBest)
    );
    var autoLbl = el('label', 'cmps-inline-row');
    autoLbl.append(cbAuto, el('span', '', 'Enable Automatic Milestone Upgrades when users share approved helpful content'));

    var bSaveRules = el('button', 'cmps-btn cmps-btn-primary', 'Save Reward Rules Live'); bSaveRules.type = 'button';
    bSaveRules.addEventListener('click', async function () {
      await api('/api/admin/community/reward-rules', {
        method: 'PUT',
        body: {
          auto_grant_enabled: cbAuto.checked ? 1 : 0,
          pro_threshold_posts: Number(inPro.value) || 3,
          permanent_threshold_posts: Number(inPerm.value) || 10,
          xp_per_approved_post: Number(inXpPost.value) || 40,
          xp_per_best_answer: Number(inXpBest.value) || 50
        }
      });
      toast('Reward thresholds updated & reflected live on public progress meter!', 'success');
      refreshAndRender();
    });
    sec.append(g, autoLbl, bSaveRules);
    shell.appendChild(sec);

    // Roster Table
    var rSec = el('section', 'cmps-section');
    rSec.appendChild(el('h3', 'cmps-section-title', 'Pro & Permanent Contributors Roster (Synced with Candidate Hub Governance)'));
    if (!S.contributors.length) {
      rSec.appendChild(el('div', 'cmps-empty', 'No community contributor profiles yet. When users share posts or earn XP, manage their Pro / Permanent tiers here.'));
    } else {
      var tw = el('div', 'cmps-table-wrap');
      var tbl = el('table', 'cmps-table');
      var th = el('thead'); var hr = el('tr');
      ['Member', 'Tier', 'XP & Contributions', 'Reason', 'Actions'].forEach(function (h) { hr.appendChild(el('th', '', h)); });
      th.appendChild(hr); tbl.appendChild(th);
      var tb = el('tbody');
      S.contributors.forEach(function (c) {
        var tr = el('tr');
        tr.appendChild(el('td', '', c.full_name + (c.district ? ' (' + c.district + ')' : '')));
        var tdTier = el('td');
        tdTier.appendChild(el('span', 'cmps-pill ' + (c.membership_tier === 'permanent_member' ? 'is-perm' : (c.membership_tier === 'pro_member' ? 'is-pro' : '')), c.membership_tier.replace(/_/g, ' ').toUpperCase()));
        tr.appendChild(tdTier);
        tr.appendChild(el('td', '', c.reputation_xp + ' XP · ' + c.approved_contributions_count + ' Approved Posts'));
        tr.appendChild(el('td', '', c.pro_granted_reason || '—'));
        var tdA = el('td');
        var acts = el('div', 'cmps-actions');
        var bPro = el('button', 'cmps-btn cmps-btn-sm cmps-btn-gold', '⭐ Pro'); bPro.type = 'button';
        bPro.addEventListener('click', function () { grantMemberTier(c.user_id, 'pro_member', '', 'Admin Pro Member grant'); });
        var bPerm = el('button', 'cmps-btn cmps-btn-sm cmps-btn-violet', '👑 Permanent'); bPerm.type = 'button';
        bPerm.addEventListener('click', function () { grantMemberTier(c.user_id, 'permanent_member', '', 'Admin Permanent Founding Member grant'); });
        var bRev = el('button', 'cmps-btn cmps-btn-sm', 'Standard'); bRev.type = 'button';
        bRev.addEventListener('click', function () { grantMemberTier(c.user_id, 'standard', '', 'Reset to standard tier'); });
        acts.append(bPro, bPerm, bRev); tdA.appendChild(acts); tr.appendChild(tdA);
        tb.appendChild(tr);
      });
      tbl.appendChild(tb); tw.appendChild(tbl); rSec.appendChild(tw);
    }
    shell.appendChild(rSec);
  }

  // ============================================================================
  // TAB 4: PEER Q&A, ANSWER KEY WATCH, MEMORY QUESTIONS & DM SAFETY QUEUE
  // ============================================================================
  function renderSafetyTab(shell) {
    var m = S.moderation || {};

    var secMem = el('section', 'cmps-section');
    secMem.appendChild(el('h3', 'cmps-section-title', '🧠 Memory Questions & Shared Notes Ready to Promote to Study Library (' + (m.memory_promote_queue || []).length + ')'));
    if (!(m.memory_promote_queue || []).length) {
      secMem.appendChild(el('div', 'cmps-empty', 'No pending memory questions or notes waiting for promotion.'));
    } else {
      (m.memory_promote_queue || []).forEach(function (p) {
        var card = el('div', 'cmps-post-card');
        card.appendChild(el('strong', '', p.title_en));
        card.appendChild(el('div', 'cmps-row-sub', 'By ' + p.author_display_name + ' · 👍 ' + (p.upvotes_count || 0)));
        var bProm = el('button', 'cmps-btn cmps-btn-sm cmps-btn-cobalt', '📚 Promote → Study Library Draft'); bProm.type = 'button';
        bProm.addEventListener('click', async function () {
          await api('/api/admin/community/' + encodeURIComponent(p.id) + '/promote-study', { method: 'POST', body: {} });
          toast('Promoted to Study Library draft!', 'success');
          refreshAndRender();
        });
        card.appendChild(bProm);
        secMem.appendChild(card);
      });
    }
    shell.appendChild(secMem);

    var secRep = el('section', 'cmps-section');
    secRep.appendChild(el('h3', 'cmps-section-title', '✅ Recent Peer Answers — Mark Verified / Best Answer (' + (m.recent_replies || []).length + ')'));
    if (!(m.recent_replies || []).length) {
      secRep.appendChild(el('div', 'cmps-empty', 'No peer answers yet.'));
    } else {
      (m.recent_replies || []).slice(0, 15).forEach(function (r) {
        var card = el('div', 'cmps-post-card');
        card.appendChild(el('strong', '', (r.post_title || r.post_id) + ' — by ' + r.author_display_name));
        card.appendChild(el('div', 'cmps-row-sub', r.body_text.slice(0, 240)));
        var acts = el('div', 'cmps-actions');
        var bBest = el('button', 'cmps-btn cmps-btn-sm cmps-btn-primary', r.is_best_answer ? '✓ Best Answer' : 'Pin Best Answer'); bBest.type = 'button';
        bBest.addEventListener('click', async function () {
          await api('/api/admin/community/moderation/reply/' + encodeURIComponent(r.id), { method: 'PUT', body: { is_best_answer: 1, is_verified_answer: 1 } });
          toast('Marked as Verified Best Answer & awarded XP!', 'success');
          refreshAndRender();
        });
        var bHide = el('button', 'cmps-btn cmps-btn-sm cmps-btn-danger', 'Hide Reply'); bHide.type = 'button';
        bHide.addEventListener('click', async function () {
          await api('/api/admin/community/moderation/reply/' + encodeURIComponent(r.id), { method: 'PUT', body: { moderation_status: 'hidden' } });
          toast('Reply hidden live.', 'success');
          refreshAndRender();
        });
        acts.append(bBest, bHide); card.appendChild(acts); secRep.appendChild(card);
      });
    }
    shell.appendChild(secRep);

    var secDm = el('section', 'cmps-section');
    secDm.appendChild(el('h3', 'cmps-section-title', '🛡 Flagged Direct Messages & Buddy Request Safety Queue (' + (m.flagged_messages || []).length + ')'));
    if (!(m.flagged_messages || []).length) {
      secDm.appendChild(el('div', 'cmps-empty', 'Zero flagged direct messages.'));
    } else {
      (m.flagged_messages || []).forEach(function (dm) {
        var card = el('div', 'cmps-post-card is-hidden');
        card.appendChild(el('strong', '', 'From ' + dm.sender_name + ' → ' + dm.recipient_name + ' · Reason: ' + (dm.flag_reason || 'Flagged')));
        card.appendChild(el('div', 'cmps-row-sub', dm.message_text));
        var acts = el('div', 'cmps-actions');
        var bClear = el('button', 'cmps-btn cmps-btn-sm cmps-btn-primary', 'Clear Flag'); bClear.type = 'button';
        bClear.addEventListener('click', async function () {
          await api('/api/admin/community/moderation/dm/' + encodeURIComponent(dm.id), { method: 'PUT', body: {} });
          refreshAndRender();
        });
        var bDel = el('button', 'cmps-btn cmps-btn-sm cmps-btn-danger', 'Delete Message'); bDel.type = 'button';
        bDel.addEventListener('click', async function () {
          await api('/api/admin/community/moderation/dm/' + encodeURIComponent(dm.id), { method: 'DELETE' });
          refreshAndRender();
        });
        acts.append(bClear, bDel); card.appendChild(acts); secDm.appendChild(card);
      });
    }
    shell.appendChild(secDm);
  }

  // ============================================================================
  // TAB 5: CITIZEN FEEDBACK & SYSTEM OPERATIONS (PRESERVED LEGACY TOOLS)
  // ============================================================================
  function renderOpsTab(shell) {
    var sec = el('section', 'cmps-section');
    sec.appendChild(el('h3', 'cmps-section-title', 'Citizen Feedback, Freshness Audit, Backups & Site Health'));
    var tools = [
      ['module-comm-feedback', '💬 Citizen Feedback Queue', 'Review public error reports & resource suggestions'],
      ['module-ops-freshness', '🕒 Freshness Audit', 'Audit content freshness across all 5 pillars'],
      ['module-ops-backups', '💾 Operations & Backups', 'D1 snapshots, R2 vault & continuity controls'],
      ['module-ops-health', '🩺 Site Health & Sentinel', 'Live edge cache & service worker telemetry']
    ];
    var bar = el('div', 'cmps-legacy-grid');
    var mount = el('div');
    tools.forEach(function (t) {
      var b = el('button', 'cmps-btn' + (S.legacyMountId === t[0] ? ' cmps-btn-primary' : ''), t[1]);
      b.type = 'button';
      b.title = t[2];
      b.addEventListener('click', function () {
        S.legacyMountId = t[0];
        renderWorkspace();
      });
      bar.appendChild(b);
    });
    sec.appendChild(bar);
    shell.appendChild(sec);
    shell.appendChild(mount);

    if (window.CSOLive && typeof window.CSOLive.render === 'function') {
      var dummyActions = el('div');
      var rendered = window.CSOLive.render('folder-community', S.legacyMountId, mount, dummyActions);
      if (!rendered) {
        mount.appendChild(el('div', 'cmps-empty', 'Operational tool ready — select an active subsystem from Command Overview or Diagnostics.'));
      }
    }
  }

  function renderWorkspace() {
    if (!S.root) return;
    renderHeaderActions();
    clear(S.root);
    var shell = el('div', 'cmps-root');
    renderTabs(shell);
    if (S.composerOpen) renderComposer(shell);
    else if (S.activeTab === 'taxonomy') renderTaxonomyTab(shell);
    else if (S.activeTab === 'rewards') renderRewardsTab(shell);
    else if (S.activeTab === 'safety') renderSafetyTab(shell);
    else if (S.activeTab === 'ops') renderOpsTab(shell);
    else renderFeedTab(shell);
    S.root.appendChild(shell);
  }

  window.CSOCommunityPublishingStudio = {
    render: function (workspaceRoot, headerActions, initialTab) {
      S.root = workspaceRoot;
      S.headerActions = headerActions;
      if (initialTab === 'new') {
        S.activeTab = 'feed';
        loadAllData().then(function () { openComposer(null); }).catch(function () { openComposer(null); });
        return;
      }
      S.composerOpen = false;
      S.activeTab = ['feed', 'taxonomy', 'rewards', 'safety', 'ops'].indexOf(initialTab) !== -1 ? initialTab : 'feed';
      renderWorkspace();
      refreshAndRender();
    }
  };
})(window, document);
