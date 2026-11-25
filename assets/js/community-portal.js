/**
 * CS Odisha — Public Community Portal, Editorial Hero, Interest Circles, Peer Q&A,
 * Polls, Daily Quiz Challenges, Peer Direct Messaging & Pro Contributor Rewards (v258)
 * Strict CSP-compliant: zero unsafe HTML string sinks, zero .style.* mutations, zero inline handlers.
 * Always fetches live D1 data with cache: 'no-store' for 100% instant public reflection.
 */
(function (window, document) {
  'use strict';

  var MEMBER_POST_TYPES = [
    ['question', '❓ Ask a Question / Peer Q&A'],
    ['shared_notes', '📝 Share Study Notes & Mind Maps (Earn Pro XP)'],
    ['memory_question', '🧠 Memory-Based Exam Question'],
    ['answer_key_objection', '⚖️ Answer Key Objection & Documentary Proof'],
    ['center_radar', '🚌 Exam-Day Center Radar & Travel Buddy'],
    ['scheme_playbook', '🛠️ Scheme Resolution Playbook'],
    ['daily_checkin', '✅ Daily Study Accountability Check-In']
  ];

  var S = {
    root: null,
    lang: 'en',
    tree: [],
    nodes: [],
    joinedIds: [],
    allPosts: [],
    posts: [],
    leaderboard: [],
    rewardRules: null,
    myProfile: null,
    filters: { l1: '', l2: '', l3: '', type: '', scope: 'all', sort: 'latest', joined_only: false, unanswered_only: false, featured_collections: false, pro_contributors: false, search: '' },
    dmMessages: [],
    dmUnread: 0,
    dmAllow: true,
    quizState: {},
    expandedWidgets: {}
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

  function num(v) {
    try { return Number(v || 0).toLocaleString('en-IN'); } catch (_e) { return String(v || 0); }
  }

  function pick(obj, field) {
    if (!obj) return '';
    if (S.lang === 'or' && obj[field + '_or']) return String(obj[field + '_or']);
    return String(obj[field + '_en'] || '');
  }

  function getLangPref() {
    try { return localStorage.getItem('cso_lang_pref') === 'or' ? 'or' : 'en'; } catch (_e) { return 'en'; }
  }

  function setLangPref(l) {
    S.lang = l === 'or' ? 'or' : 'en';
    try { localStorage.setItem('cso_lang_pref', S.lang); } catch (_e) {}
  }

  function safeHref(raw) {
    var s = String(raw || '').trim();
    if (!s) return '';
    if (s.startsWith('/') && !s.startsWith('//')) return s;
    if (/^https?:\/\//i.test(s)) return s;
    return '';
  }

  function qsParam(k) {
    try { return new URLSearchParams(window.location.search).get(k) || ''; } catch (_e) { return ''; }
  }

  // Normalize literal "\n" escapes stored in SQL seeds into actual newlines
  function normalizeNewlines(raw) {
    return String(raw || '').replace(/\\n/g, '\n');
  }

  // Strip raw Markdown syntax for crisp, readable feed card preview excerpts
  function stripMarkdownExcerpt(raw, maxLen) {
    var text = normalizeNewlines(raw)
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^\s{0,3}#{1,6}\s+/gm, '')
      .replace(/^\s*>\s?/gm, '')
      .replace(/^\s*[-*•]\s+/gm, '• ')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_`~#]+/g, '')
      .replace(/\s*\n+\s*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (!maxLen || text.length <= maxLen) return text;
    return text.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
  }

  // CSP-safe rich prose renderer for full thread view (zero HTML string sinks)
  function appendInlineFormatted(parent, text) {
    var str = String(text || '');
    var tokenRe = /(\*\*[^*]+\*\*|__[^_]+__|\[[^\]]+\]\([^)]+\)|`[^`]+`)/g;
    var last = 0;
    var m;
    while ((m = tokenRe.exec(str)) !== null) {
      if (m.index > last) parent.appendChild(document.createTextNode(str.slice(last, m.index)));
      var tok = m[0];
      if ((tok.startsWith('**') && tok.endsWith('**')) || (tok.startsWith('__') && tok.endsWith('__'))) {
        parent.appendChild(el('strong', '', tok.slice(2, -2)));
      } else if (tok.startsWith('`') && tok.endsWith('`')) {
        parent.appendChild(el('code', '', tok.slice(1, -1)));
      } else if (tok.startsWith('[')) {
        var lm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (lm) {
          var href = safeHref(lm[2]);
          if (href) {
            var a = el('a', '', lm[1]);
            a.href = href;
            if (/^https?:\/\//i.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
            parent.appendChild(a);
          } else {
            parent.appendChild(document.createTextNode(lm[1]));
          }
        }
      }
      last = tokenRe.lastIndex;
    }
    if (last < str.length) parent.appendChild(document.createTextNode(str.slice(last)));
  }

  function renderRichProse(container, markdownText) {
    var box = el('div', 'cp-prose');
    var lines = normalizeNewlines(markdownText).split(/\r?\n/);
    var ul = null;
    function flushUl() { if (ul) { box.appendChild(ul); ul = null; } }
    lines.forEach(function (rawLine) {
      var line = rawLine.trim();
      if (!line) { flushUl(); return; }
      if (line.startsWith('### ')) {
        flushUl();
        box.appendChild(el('h4', '', line.slice(4).trim()));
        return;
      }
      if (line.startsWith('## ') || line.startsWith('# ')) {
        flushUl();
        box.appendChild(el('h3', '', line.replace(/^#{1,3}\s+/, '').trim()));
        return;
      }
      if (line.startsWith('> ')) {
        flushUl();
        var call = el('div', 'cp-callout');
        appendInlineFormatted(call, line.slice(2).trim());
        box.appendChild(call);
        return;
      }
      if (/^[-*•]\s+/.test(line)) {
        if (!ul) ul = el('ul');
        var li = el('li');
        appendInlineFormatted(li, line.replace(/^[-*•]\s+/, '').trim());
        ul.appendChild(li);
        return;
      }
      flushUl();
      var p = el('p');
      appendInlineFormatted(p, line);
      box.appendChild(p);
    });
    flushUl();
    container.appendChild(box);
  }

  // Clean & deduplicate Daily Quiz prompt so Q1–Q5 never repeats twice
  function formatQuizPrompt(q, qi) {
    var raw = (S.lang === 'or' && q.question_or) ? String(q.question_or) : String(q.question_en || q.question || '');
    raw = raw.replace(/\s+/g, ' ').trim();
    // Strip any pre-existing "Q1." / "Q1:" / "1." prefix so we prepend cleanly once
    raw = raw.replace(/^(?:Q\s*\d+\s*[.):\-]\s*|\d+\s*[.):\-]\s*)+/i, '').trim();
    // Deduplicate if identical half-strings were accidentally concatenated
    var halfLen = Math.floor(raw.length / 2);
    if (raw.length > 20 && raw.length % 2 === 1 && raw[halfLen] === ' ' && raw.slice(0, halfLen) === raw.slice(halfLen + 1)) {
      raw = raw.slice(0, halfLen);
    }
    return 'Q' + (qi + 1) + '. ' + raw;
  }

  function buildLangToggle(onSwitch) {
    var w = el('div', 'cp-lang-toggle');
    [['en', 'English'], ['or', 'ଓଡ଼ିଆ']].forEach(function (p) {
      var b = el('button', 'cp-lang-btn' + (S.lang === p[0] ? ' is-active' : ''), p[1]);
      b.type = 'button';
      b.addEventListener('click', function () { setLangPref(p[0]); onSwitch(); });
      w.appendChild(b);
    });
    return w;
  }

  function computeCommunityHeroKpis() {
    var circlesCount = S.nodes.filter(function (n) { return Number(n.level) === 1 || Number(n.level) === 2; }).length;
    var srcPosts = S.allPosts.length ? S.allPosts : S.posts;
    var solvedCount = srcPosts.filter(function (p) { return Boolean(p.is_solved); }).length;
    var proSet = {};
    (S.leaderboard || []).forEach(function (m) {
      if (m && (m.membership_tier === 'pro_member' || m.membership_tier === 'permanent_member' || (m.badge_label && /pro|permanent|mentor/i.test(m.badge_label)))) {
        proSet[m.user_id || m.display_name] = true;
      }
    });
    srcPosts.forEach(function (p) {
      if (p && (p.author_membership_tier === 'pro_member' || p.author_membership_tier === 'permanent_member')) {
        proSet[p.author_user_id || p.author_display_name] = true;
      }
    });
    return {
      circlesCount: circlesCount,
      discussionsCount: srcPosts.length,
      proCount: Object.keys(proSet).length,
      solvedCount: solvedCount
    };
  }

  async function api(url, opts) {
    var o = Object.assign({ credentials: 'same-origin', cache: 'no-store' }, opts || {});
    var headers = Object.assign({}, o.headers || {});
    if (o.body && typeof o.body === 'object' && !(o.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      o.body = JSON.stringify(o.body);
    }
    o.headers = headers;
    var res = await fetch(url, o);
    var data = await res.json().catch(function () { return {}; });
    if (!res.ok) {
      var err = new Error(data.error || ('Request failed (' + res.status + ')'));
      err.status = res.status;
      throw err;
    }
    return data;
  }

  function injectThreadJsonLd(post) {
    try {
      var prev = document.getElementById('cso-community-jsonld');
      if (prev) prev.remove();
      var sc = document.createElement('script');
      sc.type = 'application/ld+json';
      sc.id = 'cso-community-jsonld';
      sc.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'DiscussionForumPosting',
        headline: post.title_en,
        text: stripMarkdownExcerpt(post.body_en || post.title_en, 500),
        author: { '@type': 'Person', name: post.author_display_name || 'CS Odisha Member' },
        datePublished: post.created_at,
        url: 'https://csodisha.com/community/?slug=' + encodeURIComponent(post.slug)
      });
      document.head.appendChild(sc);
    } catch (_e) {}
  }

  var CANONICAL_CHANNEL_SLUGS = [
    'exam-career-qa',
    'schemes-citizen-help',
    'study-groups-notes',
    'success-stories-mentorship'
  ];

  function resolveChannelNode(val) {
    if (!val) return null;
    var v = String(val).trim().toLowerCase();
    return S.nodes.find(function (n) {
      return Number(n.level) === 1 && (String(n.id || '').toLowerCase() === v || String(n.slug || '').toLowerCase() === v);
    }) || null;
  }

  function syncUrlFromFilters() {
    try {
      if (!window.history || !window.history.replaceState) return;
      var q = new URLSearchParams();
      if (S.filters.l1) {
        var ch = resolveChannelNode(S.filters.l1);
        q.set('channel', ch ? ch.slug : S.filters.l1);
      }
      if (S.filters.sort && S.filters.sort !== 'latest') q.set('sort', S.filters.sort);
      if (S.filters.scope && S.filters.scope !== 'all') q.set('scope', S.filters.scope);
      if (S.filters.search) q.set('q', S.filters.search);
      var qs = q.toString();
      window.history.replaceState(null, '', window.location.pathname + (qs ? ('?' + qs) : ''));
    } catch (_e) {}
  }

  async function loadPortalData() {
    var q = new URLSearchParams();
    if (S.filters.l1) q.set('channel', S.filters.l1);
    if (S.filters.l2) q.set('l2', S.filters.l2);
    if (S.filters.l3) q.set('l3', S.filters.l3);
    if (S.filters.type) q.set('type', S.filters.type);
    if (S.filters.scope && S.filters.scope !== 'all') q.set('scope', S.filters.scope);
    if (S.filters.sort) q.set('sort', S.filters.sort);
    if (S.filters.joined_only) q.set('joined_only', '1');
    if (S.filters.unanswered_only) q.set('unanswered_only', '1');
    if (S.filters.search) q.set('q', S.filters.search);
    var qs = q.toString() ? ('?' + q.toString()) : '';

    var res = await Promise.all([
      S.nodes.length
        ? Promise.resolve(null)
        : api('/api/public/community/bootstrap').catch(function () { return { tree: [], nodes: [], joined_node_ids: [], posts: [] }; }),
      api('/api/public/community/list' + qs).catch(function () { return { items: [], leaderboard: [], reward_rules: null, my_profile: null }; })
    ]);
    if (res[0] && res[0].ok !== false) {
      S.tree = res[0].tree || [];
      S.nodes = res[0].nodes || [];
      S.joinedIds = res[0].joined_node_ids || [];
      if (!S.allPosts.length) S.allPosts = res[0].posts || res[0].items || [];
    }
    if (Array.isArray(res[1].nav_channels) && res[1].nav_channels.length) {
      var countMap = {};
      res[1].nav_channels.forEach(function (c) {
        countMap[c.id] = Number(c.threads_count || c.posts_count || 0);
        if (c.slug) countMap[c.slug] = Number(c.threads_count || c.posts_count || 0);
      });
      S.nodes.forEach(function (n) {
        if (Number(n.level) === 1 && (n.id in countMap || n.slug in countMap)) {
          var cnt = (n.id in countMap) ? countMap[n.id] : countMap[n.slug];
          n.threads_count = cnt;
          n.posts_count = cnt;
        }
      });
    }
    S.posts = res[1].items || [];
    var isUnfiltered = !S.filters.l1 && (!S.filters.scope || S.filters.scope === 'all') && (!S.filters.sort || S.filters.sort === 'latest') && !S.filters.search;
    if (isUnfiltered) S.allPosts = S.posts.slice();
    S.leaderboard = res[1].leaderboard || [];
    S.rewardRules = res[1].reward_rules || S.rewardRules;
    S.myProfile = res[1].my_profile || null;
    if (S.myProfile) S.dmUnread = Number(S.myProfile.unread_messages || 0);

    if (S.filters.l1) {
      var matched = resolveChannelNode(S.filters.l1);
      if (matched) S.filters.l1 = matched.id;
    }
  }

  // ============================================================================
  // COMPACT HERO HEADER (v287 — no 4-box KPI grid)
  // ============================================================================
  function renderEditorialHero(shell) {
    var hero = el('section', 'cp-hero com-hero--compact');
    hero.setAttribute('aria-label', 'Odisha Citizen & Aspirant Community');

    var bar = el('div', 'com-hero-bar');
    var copy = el('div', 'cp-hero-copy');
    copy.appendChild(el('h1', 'cp-hero-title', S.lang === 'or'
      ? 'ଓଡ଼ିଶା ନାଗରିକ ଓ ପରୀକ୍ଷାର୍ଥୀ ସମୁଦାୟ'
      : 'Odisha Citizen & Aspirant Community'));
    copy.appendChild(el('p', 'cp-hero-sub', S.lang === 'or'
      ? 'ପରୀକ୍ଷା ଓ କ୍ୟାରିୟର ସନ୍ଦେହ ପଚାରନ୍ତୁ, ଓଡ଼ିଶା ଯୋଜନା ସହାୟତା ପାଆନ୍ତୁ, ଅଧ୍ୟୟନ ଦଳରେ ଯୋଗ ଦିଅନ୍ତୁ ଏବଂ ସଫଳ ମେଣ୍ଟରଙ୍କଠାରୁ ଶିଖନ୍ତୁ।'
      : 'Ask exam & career doubts, get Odisha scheme help, join study groups, and learn from verified mentors.'));
    bar.appendChild(copy);

    var acts = el('div', 'com-hero-actions');
    acts.appendChild(buildLangToggle(function () { renderBrowseView(); }));
    var btnStart = el('button', 'cp-btn cp-btn-primary', S.lang === 'or' ? '+ ଆଲୋଚନା ଆରମ୍ଭ କରନ୍ତୁ' : '+ Start a Discussion');
    btnStart.type = 'button';
    btnStart.addEventListener('click', openMemberComposerModal);
    acts.appendChild(btnStart);
    bar.appendChild(acts);

    hero.appendChild(bar);
    shell.appendChild(hero);
  }

  // ============================================================================
  // PATH TO PRO / PERMANENT MEMBERSHIP PROGRESS METER
  // ============================================================================
  function renderProProgressBanner(shell) {
    var rules = S.rewardRules || { pro_threshold_posts: 3, permanent_threshold_posts: 10, pro_perks_summary_en: 'Golden badge, zero-queue publishing & Pro Lounge access.' };
    var box = el('section', 'cp-pro-banner');
    box.setAttribute('aria-label', 'Path to Pro and Permanent Membership');

    var head = el('div', 'cp-pro-head');
    if (S.myProfile) {
      var mp = S.myProfile;
      var tierLabel = mp.membership_tier === 'permanent_member' ? '👑 Permanent Founding Member' : (mp.membership_tier === 'pro_member' ? '⭐ CS Odisha Pro Member' : '🌱 Standard Member');
      head.appendChild(el('h2', 'cp-pro-title', 'Path to Pro & Permanent Membership · ' + tierLabel));
      var chips = el('div', 'cp-chips');
      chips.appendChild(el('span', 'cp-chip ' + (mp.membership_tier === 'permanent_member' ? 'is-perm' : (mp.membership_tier === 'pro_member' ? 'is-pro' : '')), '⚡ ' + mp.reputation_xp + ' Reputation XP'));
      chips.appendChild(el('span', 'cp-chip', '✅ ' + mp.approved_contributions_count + ' Approved Contributions'));
      chips.appendChild(el('span', 'cp-chip', '🤝 ' + mp.joined_count + ' Joined Circles'));
      head.appendChild(chips);
      box.appendChild(head);

      var target = mp.next_threshold || rules.permanent_threshold_posts;
      var pct = mp.membership_tier === 'permanent_member' ? 100 : Math.min(100, Math.round((mp.approved_contributions_count / Math.max(1, target)) * 100));
      var prog = el('progress', 'cp-pro-progress');
      prog.max = 100;
      prog.value = pct;
      box.appendChild(prog);

      var remain = Math.max(0, target - mp.approved_contributions_count);
      var msg = mp.membership_tier === 'permanent_member'
        ? 'You have unlocked Lifetime Permanent Founding Member status! ' + (rules.permanent_perks_summary_en || '')
        : (remain === 0
          ? 'Milestone reached! Your next approved contribution upgrades your membership tier.'
          : 'Share ' + remain + ' more helpful notes, memory questions, or playbooks to unlock ' + (mp.next_tier === 'permanent_member' ? '👑 Permanent Founding Member' : '⭐ CS Odisha Pro Member') + ' (' + pct + '% complete). ' + (rules.pro_perks_summary_en || ''));
      box.appendChild(el('div', 'cp-muted', msg));
    } else {
      head.appendChild(el('h2', 'cp-pro-title', S.lang === 'or'
        ? '⭐ ଉପଯୋଗୀ ନୋଟ୍ସ ସେୟାର କରନ୍ତୁ ଏବଂ ମାଗଣା CS Odisha Pro / Permanent ସଦସ୍ୟତା ଲାଭ କରନ୍ତୁ'
        : '⭐ Share Helpful Notes & Earn Free CS Odisha Pro / Permanent Membership'));
      var aSign = el('a', 'cp-btn cp-btn-gold cp-btn-sm', S.lang === 'or' ? 'ସାଇନ୍ ଇନ୍ କରି ଯୋଗ ଦିଅନ୍ତୁ →' : 'Sign In to Join & Earn Pro →');
      aSign.href = '/login.html?next=/community/';
      head.appendChild(aSign);
      box.appendChild(head);
      box.appendChild(el('div', 'cp-muted', S.lang === 'or'
        ? ('Pro ସଦସ୍ୟ ⭐ ପାଇଁ ' + rules.pro_threshold_posts + ' ଟି ଏବଂ Permanent Founding Member 👑 ପାଇଁ ' + rules.permanent_threshold_posts + ' ଟି ଅନୁମୋଦିତ ଯୋଗଦାନ ସେୟାର କରନ୍ତୁ।')
        : ('Share ' + rules.pro_threshold_posts + ' approved notes/questions to unlock Pro Member ⭐ (' + rules.pro_perks_summary_en + ') and ' + rules.permanent_threshold_posts + ' for Permanent Founding Member 👑.')));
    }
    shell.appendChild(box);
  }

  // ============================================================================
  // BROWSE VIEW (v287 — Minimal Compact Explorer)
  // ============================================================================
  function renderActiveFilterChips(fPanel) {
    var chips = [];
    if (S.filters.l1) {
      var ch = resolveChannelNode(S.filters.l1);
      chips.push({ label: (S.lang === 'or' ? 'ଚ୍ୟାନେଲ୍: ' : 'Channel: ') + (ch ? pick(ch, 'title') : S.filters.l1), clear: function () { S.filters.l1 = ''; } });
    }
    if (S.filters.sort && S.filters.sort !== 'latest') {
      var sMap = { helpful: 'Most Helpful', unanswered: 'Unanswered', top_voted: 'Most Helpful' };
      chips.push({ label: (S.lang === 'or' ? 'କ୍ରମ: ' : 'Sort: ') + (sMap[S.filters.sort] || S.filters.sort), clear: function () { S.filters.sort = 'latest'; } });
    }
    if (S.filters.scope && S.filters.scope !== 'all') {
      var scMap = { odisha: 'Odisha', central: 'Central', verified: 'Verified Answer' };
      chips.push({ label: (S.lang === 'or' ? 'ପରିସର: ' : 'Scope: ') + (scMap[S.filters.scope] || S.filters.scope), clear: function () { S.filters.scope = 'all'; } });
    }
    if (S.filters.search) {
      chips.push({ label: '"' + S.filters.search + '"', clear: function () { S.filters.search = ''; } });
    }
    if (!chips.length) return;

    var bar = el('div', 'com-active-chips');
    bar.setAttribute('aria-label', 'Active filters');
    chips.forEach(function (c) {
      var btn = el('button', 'com-filter-chip');
      btn.type = 'button';
      btn.appendChild(el('span', '', c.label));
      btn.appendChild(el('span', 'com-chip-x', '×'));
      btn.addEventListener('click', function () { c.clear(); reloadBrowse(); });
      bar.appendChild(btn);
    });
    fPanel.appendChild(bar);
  }

  function renderBrowseView() {
    var activeEl = document.activeElement;
    var restoreFocusId = (activeEl && activeEl.id === 'cp-search-input') ? activeEl.id : '';

    clear(S.root);
    var hasFilter = Boolean(S.filters.l1 || (S.filters.sort && S.filters.sort !== 'latest') || (S.filters.scope && S.filters.scope !== 'all') || S.filters.search);
    var shell = el('div', 'cp-root com-shell');
    renderEditorialHero(shell);

    var l1All = S.nodes.filter(function (n) { return Number(n.level) === 1; });
    var l1Canon = l1All.filter(function (n) { return CANONICAL_CHANNEL_SLUGS.indexOf(String(n.slug || '').toLowerCase()) !== -1; });
    var l1Channels = l1Canon.length ? l1Canon : l1All;

    // Two-Column Main Workspace (1fr 310px on desktop >= 960px, single-column stack on mobile)
    var workspace = el('div', 'com-workspace-grid');

    // LEFT COLUMN: Streamlined Toolbar + Clean Discussion Feed
    var feedCol = el('div', 'com-feed-col');

    var toolbarCard = el('section', 'cp-panel com-toolbar-card');
    toolbarCard.setAttribute('aria-label', 'Search and Filter Discussions');

    var fRow = el('div', 'com-filter-row');

    var searchInp = el('input', 'cp-input com-search-input');
    searchInp.id = 'cp-search-input';
    searchInp.type = 'search';
    searchInp.setAttribute('aria-label', 'Search discussions, exams, or topics');
    searchInp.placeholder = S.lang === 'or'
      ? 'ଆଲୋଚନା, ପରୀକ୍ଷା କିମ୍ବା ବିଷୟ ଖୋଜନ୍ତୁ...'
      : 'Search discussions, exams, or topics...';
    searchInp.value = S.filters.search;
    var searchTimer = null;
    searchInp.addEventListener('input', function () {
      S.filters.search = searchInp.value.trim();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(function () { reloadBrowse(); }, 180);
    });
    searchInp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { clearTimeout(searchTimer); S.filters.search = searchInp.value.trim(); reloadBrowse(); }
    });
    fRow.appendChild(searchInp);

    var sortSel = el('select', 'cp-select com-toolbar-select');
    sortSel.id = 'cp-sel-sort';
    sortSel.setAttribute('aria-label', 'Sort community discussions');
    [
      ['latest', S.lang === 'or' ? 'ନୂତନତମ କାର୍ଯ୍ୟକଳାପ' : 'Latest Activity'],
      ['helpful', S.lang === 'or' ? 'ସର୍ବାଧିକ ସହାୟକ' : 'Most Helpful'],
      ['unanswered', S.lang === 'or' ? 'ଅନୁତ୍ତରିତ' : 'Unanswered']
    ].forEach(function (s) { sortSel.appendChild(new Option(s[1], s[0])); });
    sortSel.value = ['latest', 'helpful', 'unanswered'].indexOf(S.filters.sort) !== -1 ? S.filters.sort : 'latest';
    sortSel.addEventListener('change', function () { S.filters.sort = sortSel.value; reloadBrowse(); });
    fRow.appendChild(sortSel);

    var scopeSel = el('select', 'cp-select com-toolbar-select');
    scopeSel.id = 'cp-sel-scope';
    scopeSel.setAttribute('aria-label', 'Filter by Scope or Status');
    [
      ['all', S.lang === 'or' ? 'ସମସ୍ତ ବିଷୟ' : 'All Topics'],
      ['odisha', S.lang === 'or' ? 'ଓଡ଼ିଶା' : 'Odisha'],
      ['central', S.lang === 'or' ? 'କେନ୍ଦ୍ର' : 'Central'],
      ['verified', S.lang === 'or' ? 'ସତ୍ୟାପିତ ଉତ୍ତର' : 'Verified Answer']
    ].forEach(function (sc) { scopeSel.appendChild(new Option(sc[1], sc[0])); });
    scopeSel.value = S.filters.scope || 'all';
    scopeSel.addEventListener('change', function () { S.filters.scope = scopeSel.value; reloadBrowse(); });
    fRow.appendChild(scopeSel);

    if (hasFilter) {
      var rstBtn = el('button', 'cp-btn cp-btn-sm com-reset-btn', S.lang === 'or' ? 'ରିସେଟ୍' : 'Reset');
      rstBtn.type = 'button';
      rstBtn.addEventListener('click', function () {
        S.filters = { l1: '', l2: '', l3: '', type: '', scope: 'all', sort: 'latest', joined_only: false, unanswered_only: false, featured_collections: false, pro_contributors: false, search: '' };
        reloadBrowse();
      });
      fRow.appendChild(rstBtn);
    }

    toolbarCard.appendChild(fRow);
    renderActiveFilterChips(toolbarCard);
    feedCol.appendChild(toolbarCard);

    if (!S.posts.length) {
      var emp = el('section', 'cp-empty');
      emp.setAttribute('aria-label', 'Community Discussions Status');
      emp.appendChild(el('h2', 'com-empty-title', hasFilter
        ? (S.lang === 'or' ? 'ଆପଣଙ୍କ ଫିଲ୍ଟର୍ ସହିତ କୌଣସି ଆଲୋଚନା ମିଳିଲା ନାହିଁ' : 'No Discussions Match Your Filters')
        : (S.lang === 'or' ? 'ପ୍ରଥମ ଆଲୋଚନା ଆରମ୍ଭ କରନ୍ତୁ' : 'Start the First Community Discussion')));
      emp.appendChild(el('p', 'cp-muted com-empty-desc', hasFilter
        ? (S.lang === 'or'
          ? 'ଅନ୍ୟ ଚ୍ୟାନେଲ୍, କ୍ରମ କିମ୍ବା ପରିସର ବାଛନ୍ତୁ କିମ୍ବା ସମସ୍ତ ଫିଲ୍ଟର୍ ରିସେଟ୍ କରନ୍ତୁ।'
          : 'Try selecting a different channel, sort, or scope — or reset filters to view all discussions.')
        : (S.lang === 'or'
          ? 'OPSC, OSSC, OSSSC, ଓଡ଼ିଶା ଯୋଜନା କିମ୍ବା ଅଧ୍ୟୟନ ରଣନୀତି ବିଷୟରେ ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ।'
          : 'Ask a question on OPSC, OSSC, OSSSC, Odisha schemes, or study strategies to kick off the conversation.')));
      var empActs = el('div', 'cp-empty-actions');
      var bStart = el('button', 'cp-btn cp-btn-primary', S.lang === 'or' ? '+ ଆଲୋଚନା ଆରମ୍ଭ କରନ୍ତୁ' : '+ Start a Discussion');
      bStart.type = 'button';
      bStart.addEventListener('click', openMemberComposerModal);
      empActs.appendChild(bStart);
      if (hasFilter) {
        var rBtn = el('button', 'cp-btn', S.lang === 'or' ? 'ସମସ୍ତ ଫିଲ୍ଟର୍ ରିସେଟ୍ କରନ୍ତୁ' : 'Reset Filters');
        rBtn.type = 'button';
        rBtn.addEventListener('click', function () {
          S.filters = { l1: '', l2: '', l3: '', type: '', scope: 'all', sort: 'latest', joined_only: false, unanswered_only: false, featured_collections: false, pro_contributors: false, search: '' };
          reloadBrowse();
        });
        empActs.appendChild(rBtn);
      }
      emp.appendChild(empActs);
      feedCol.appendChild(emp);
    } else {
      var feedList = el('div', 'com-feed-list');
      S.posts.forEach(function (p) { feedList.appendChild(renderPostCard(p, false)); });
      feedCol.appendChild(feedList);
    }

    // RIGHT COLUMN: Sticky Sidebar (Channels Directory + Community Desk & Guidelines)
    var sidebar = el('aside', 'com-sidebar');
    sidebar.setAttribute('aria-label', 'Community Channels and Guidelines');

    // Card 1: Channels Directory
    var chCard = el('section', 'com-sidebar-card com-channels-card');
    chCard.appendChild(el('h2', 'com-sidebar-title', S.lang === 'or' ? 'ସମୁଦାୟ ଚ୍ୟାନେଲ୍' : 'Channels Directory'));

    var chList = el('div', 'com-channel-list com-channel-strip');
    chList.setAttribute('role', 'tablist');
    chList.setAttribute('aria-label', 'Filter by Community Channel');

    var allBtn = el('button', 'com-channel-item com-channel-pill' + (!S.filters.l1 ? ' is-active' : ''));
    allBtn.type = 'button';
    allBtn.setAttribute('role', 'tab');
    allBtn.setAttribute('aria-selected', String(!S.filters.l1));
    var allLeft = el('span', 'com-channel-item-left');
    allLeft.appendChild(el('span', 'com-channel-ico', '💬'));
    allLeft.appendChild(el('span', 'com-channel-pill-label', S.lang === 'or' ? 'ସମସ୍ତ ଆଲୋଚନା' : 'All Discussions'));
    allBtn.appendChild(allLeft);
    allBtn.appendChild(el('span', 'com-channel-pill-count', num(S.allPosts.length || S.posts.length)));
    allBtn.addEventListener('click', function () { S.filters.l1 = ''; reloadBrowse(); });
    chList.appendChild(allBtn);

    l1Channels.forEach(function (ch) {
      var isAct = S.filters.l1 === ch.id || S.filters.l1 === ch.slug;
      var btn = el('button', 'com-channel-item com-channel-pill' + (isAct ? ' is-active' : ''));
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(isAct));
      btn.setAttribute('data-channel', ch.slug || ch.id);
      var left = el('span', 'com-channel-item-left');
      left.appendChild(el('span', 'com-channel-ico', ch.icon || '📌'));
      left.appendChild(el('span', 'com-channel-pill-label', pick(ch, 'title')));
      btn.appendChild(left);
      btn.appendChild(el('span', 'com-channel-pill-count', num(ch.threads_count || ch.posts_count || 0)));
      btn.addEventListener('click', function () { S.filters.l1 = ch.id; reloadBrowse(); });
      chList.appendChild(btn);
    });
    chCard.appendChild(chList);
    sidebar.appendChild(chCard);

    // Card 2: Community Desk & Guidelines
    var guideCard = el('section', 'com-sidebar-card com-guidelines-card');
    guideCard.appendChild(el('h2', 'com-sidebar-title', S.lang === 'or' ? 'ସମୁଦାୟ ମାର୍ଗଦର୍ଶିକା' : 'Community Desk & Guidelines'));
    var gList = el('ul', 'com-guidelines-list');
    var guidePoints = S.lang === 'or'
      ? [
          'ସତ୍ୟାପିତ .gov.in / .odisha.gov.in ସରକାରୀ ସୂତ୍ର ସେୟାର କରନ୍ତୁ',
          'ଆପଣଙ୍କ ପରୀକ୍ଷା କିମ୍ବା ସରକାରୀ ଯୋଜନା ସ୍ପଷ୍ଟ ଭାବେ ଟ୍ୟାଗ୍ କରନ୍ତୁ',
          'ଆଲୋଚନାକୁ ସହାୟକ, ସଠିକ୍ ଏବଂ ସମ୍ମାନଜନକ ରଖନ୍ତୁ'
        ]
      : [
          'Share verified .gov.in / .odisha.gov.in sources',
          'Tag your exam or welfare scheme clearly',
          'Keep discussions helpful and respectful'
        ];
    guidePoints.forEach(function (pt) {
      gList.appendChild(el('li', 'com-guideline-item', pt));
    });
    guideCard.appendChild(gList);

    var sideStartBtn = el('button', 'cp-btn cp-btn-primary com-full-btn', S.lang === 'or' ? '+ ଆଲୋଚନା ଆରମ୍ଭ କରନ୍ତୁ' : '+ Start a Discussion');
    sideStartBtn.type = 'button';
    sideStartBtn.addEventListener('click', openMemberComposerModal);
    guideCard.appendChild(sideStartBtn);
    sidebar.appendChild(guideCard);

    workspace.append(feedCol, sidebar);
    shell.appendChild(workspace);
    S.root.appendChild(shell);

    if (restoreFocusId) {
      var refocus = document.getElementById(restoreFocusId);
      if (refocus && typeof refocus.focus === 'function') refocus.focus();
    }
  }

  function formatRelativeTime(isoStr) {
    if (!isoStr) return S.lang === 'or' ? 'ସମ୍ପ୍ରତି' : 'Recently';
    var normalized = String(isoStr).trim().replace(' ', 'T');
    if (!/[zZ]|[+-]\d{2}:\d{2}$/.test(normalized)) normalized += 'Z';
    var ts = Date.parse(normalized);
    if (!Number.isFinite(ts)) return S.lang === 'or' ? 'ସମ୍ପ୍ରତି' : 'Recently';
    var diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diffSec < 60) return S.lang === 'or' ? 'ଏଇକ୍ଷଣି' : 'Just now';
    var diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return S.lang === 'or' ? (diffMin + ' ମିନିଟ୍ ପୂର୍ବେ') : (diffMin + 'm ago');
    var diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return S.lang === 'or' ? (diffHr + ' ଘଣ୍ଟା ପୂର୍ବେ') : (diffHr + 'h ago');
    var diffDay = Math.floor(diffHr / 24);
    if (diffDay < 14) return S.lang === 'or' ? (diffDay + ' ଦିନ ପୂର୍ବେ') : (diffDay + 'd ago');
    try {
      return new Date(ts).toLocaleDateString(S.lang === 'or' ? 'or-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (_e) {
      return String(isoStr).slice(0, 10);
    }
  }

  function resolvePostChannelLabel(p) {
    if (p && p.taxonomy && p.taxonomy.l1) {
      return pick(p.taxonomy.l1, 'title') || p.taxonomy.l1.title_en || '';
    }
    if (p && p.category_l1_id) {
      var node = resolveChannelNode(p.category_l1_id) || resolveChannelNode(p.channel_slug);
      if (node) return pick(node, 'title') || node.title_en || '';
    }
    return S.lang === 'or' ? 'ସମୁଦାୟ ଆଲୋଚନା' : 'Community Discussion';
  }

  function getAuthorMonogram(name) {
    var parts = String(name || 'CS').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return 'CS';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  function renderPostCard(p, isDetailView) {
    var card = el('article', 'cp-post-card com-thread-card' + (p.is_pinned ? ' is-pinned' : ''));
    var threadHref = '/community/?slug=' + encodeURIComponent(p.slug);
    var relTime = formatRelativeTime(p.created_at);

    // 1. HEADER ROW: Channel badge + single status badge (Pinned or Verified Answer) + right-aligned relative timestamp
    var topRow = el('div', 'com-card-top');
    var badgeGroup = el('div', 'com-card-badges');
    var chanLabel = resolvePostChannelLabel(p);
    if (chanLabel) {
      badgeGroup.appendChild(el('span', 'com-channel-badge', chanLabel));
    }
    if (p.is_solved) {
      badgeGroup.appendChild(el('span', 'com-status-badge is-verified', S.lang === 'or' ? '✓ ସତ୍ୟାପିତ ଉତ୍ତର' : '✓ Verified Answer'));
    } else if (p.is_pinned) {
      badgeGroup.appendChild(el('span', 'com-status-badge is-pinned', S.lang === 'or' ? '📌 ପିନ୍ ହୋଇଛି' : '📌 Pinned'));
    }
    topRow.appendChild(badgeGroup);
    topRow.appendChild(el('span', 'com-card-time', relTime));
    card.appendChild(topRow);

    // 2. BODY BLOCK: Title + 2-line excerpt + optional compact Poll/Quiz bar
    var bodyBlock = el('div', 'com-card-body');

    if (p.cover_image_url && safeHref(p.cover_image_url)) {
      var img = el('img', 'cp-post-cover');
      img.src = safeHref(p.cover_image_url);
      img.alt = p.title_en;
      img.loading = 'lazy';
      img.decoding = 'async';
      bodyBlock.appendChild(img);
    }

    var displayTitle = (S.lang === 'or' && p.title_or) ? String(p.title_or) : String(p.title_en || p.title_or || '');
    var h = el(isDetailView ? 'h1' : 'h3', 'cp-post-title');
    if (isDetailView) {
      h.textContent = displayTitle;
    } else {
      var a = el('a', '', displayTitle);
      a.href = threadHref;
      h.appendChild(a);
    }
    bodyBlock.appendChild(h);

    var rawBody = pick(p, 'body') || p.body_en || '';
    if (rawBody) {
      if (isDetailView) {
        renderRichProse(bodyBlock, rawBody);
      } else {
        bodyBlock.appendChild(el('p', 'cp-post-body com-excerpt-clamp', stripMarkdownExcerpt(rawBody, 0)));
      }
    }

    if (p.attachment_url && safeHref(p.attachment_url)) {
      var aPdf = el('a', 'cp-btn cp-btn-sm', '📎 ' + (p.attachment_label || 'Open Shared PDF / Notes'));
      aPdf.href = safeHref(p.attachment_url);
      aPdf.target = '_blank';
      aPdf.rel = 'noopener noreferrer';
      bodyBlock.appendChild(aPdf);
    }

    // Interactive Poll: compact 1-line tinted pill bar in feed, expands on click
    if (p.post_type === 'poll' && Array.isArray(p.poll_options) && p.poll_options.length) {
      var votes = p.poll_votes || {};
      var totalVotes = Object.values(votes).reduce(function (s, v) { return s + Number(v || 0); }, 0);
      var isPollOpen = isDetailView || Boolean(S.expandedWidgets[p.id]);
      if (!isPollOpen) {
        var pollPrev = el('div', 'com-widget-preview');
        var pollSummary = S.lang === 'or'
          ? ('📊 ସକ୍ରିୟ ପୋଲ୍ · ' + p.poll_options.length + ' ବିକଳ୍ପ · ' + num(totalVotes) + ' ଭୋଟ୍')
          : ('📊 Active Poll · ' + p.poll_options.length + ' Options · ' + num(totalVotes) + ' Votes');
        pollPrev.appendChild(el('span', 'com-widget-pill', pollSummary));
        var bExpandPoll = el('button', 'com-widget-cta', S.lang === 'or' ? 'ଅଂଶଗ୍ରହଣ କରନ୍ତୁ →' : 'Participate →');
        bExpandPoll.type = 'button';
        bExpandPoll.addEventListener('click', function () {
          S.expandedWidgets[p.id] = true;
          renderBrowseView();
        });
        pollPrev.appendChild(bExpandPoll);
        bodyBlock.appendChild(pollPrev);
      } else {
        var pollWrap = el('div', 'cp-poll-list');
        if (!isDetailView) {
          var pollCtrl = el('div', 'com-widget-expanded-head');
          pollCtrl.appendChild(el('span', 'com-widget-pill', S.lang === 'or'
            ? ('📊 ସକ୍ରିୟ ପୋଲ୍ · ' + num(totalVotes) + ' ଭୋଟ୍')
            : ('📊 Active Poll · ' + num(totalVotes) + ' Votes')));
          var bHidePoll = el('button', 'com-ghost-pill', S.lang === 'or' ? 'ସଂକୁଚିତ କରନ୍ତୁ' : 'Collapse');
          bHidePoll.type = 'button';
          bHidePoll.addEventListener('click', function () {
            S.expandedWidgets[p.id] = false;
            renderBrowseView();
          });
          pollCtrl.appendChild(bHidePoll);
          pollWrap.appendChild(pollCtrl);
        }
        p.poll_options.forEach(function (opt, idx) {
          var cnt = Number(votes[String(idx)] || 0);
          var pct = totalVotes > 0 ? Math.round((cnt / totalVotes) * 100) : 0;
          var bOpt = el('button', 'cp-poll-opt');
          bOpt.type = 'button';
          bOpt.appendChild(el('span', '', opt + ' — ' + pct + '% (' + cnt + ' votes)'));
          var m = el('progress', 'cp-poll-meter'); m.max = 100; m.value = pct;
          bOpt.appendChild(m);
          bOpt.addEventListener('click', async function () {
            try {
              var res = await api('/api/community/react', { method: 'POST', body: { target_type: 'post', target_id: p.id, reaction_type: 'poll_vote', option_index: idx } });
              p.poll_votes = res.poll_votes;
              if (isDetailView) loadThreadView(p.slug, qsParam('preview_token'));
              else renderBrowseView();
            } catch (err) {
              if (err.status === 401) window.location.href = '/login.html?next=/community/';
              else window.alert(err.message);
            }
          });
          pollWrap.appendChild(bOpt);
        });
        bodyBlock.appendChild(pollWrap);
      }
    }

    // Interactive Quiz Challenge: compact 1-line tinted pill bar in feed, expands on click
    if (p.post_type === 'quiz_challenge' && Array.isArray(p.challenge_mcqs) && p.challenge_mcqs.length) {
      var qCount = p.challenge_mcqs.length;
      var qMins = Math.max(2, Math.ceil(qCount * 0.6));
      var qTopic = p.exam_tag || 'Odisha GK';
      var isQuizOpen = isDetailView || Boolean(S.expandedWidgets[p.id]);
      if (!isQuizOpen) {
        var quizPrev = el('div', 'com-widget-preview');
        var quizSummary = S.lang === 'or'
          ? ('⚡ ' + qCount + '-ପ୍ରଶ୍ନ ' + qTopic + ' କୁଇଜ୍ · ' + qMins + ' ମିନିଟ୍')
          : ('⚡ ' + qCount + '-Question ' + qTopic + ' Sprint · ' + qMins + ' Mins');
        quizPrev.appendChild(el('span', 'com-widget-pill', quizSummary));
        var bExpandQuiz = el('button', 'com-widget-cta', S.lang === 'or' ? 'ଅଂଶଗ୍ରହଣ କରନ୍ତୁ →' : 'Participate →');
        bExpandQuiz.type = 'button';
        bExpandQuiz.addEventListener('click', function () {
          S.expandedWidgets[p.id] = true;
          renderBrowseView();
        });
        quizPrev.appendChild(bExpandQuiz);
        bodyBlock.appendChild(quizPrev);
      } else {
        if (!isDetailView) {
          var quizCtrl = el('div', 'com-widget-expanded-head');
          quizCtrl.appendChild(el('span', 'com-widget-pill', '⚡ ' + qCount + '-Question ' + qTopic + ' Sprint'));
          var bHideQuiz = el('button', 'com-ghost-pill', S.lang === 'or' ? 'ସଂକୁଚିତ କରନ୍ତୁ' : 'Collapse');
          bHideQuiz.type = 'button';
          bHideQuiz.addEventListener('click', function () {
            S.expandedWidgets[p.id] = false;
            renderBrowseView();
          });
          quizCtrl.appendChild(bHideQuiz);
          bodyBlock.appendChild(quizCtrl);
        }
        bodyBlock.appendChild(renderInlineChallengeQuiz(p, isDetailView));
      }
    }

    card.appendChild(bodyBlock);

    // 3. SINGLE CLEAN FOOTER ROW: Author monogram avatar + name on left, matching ghost pills on right
    var foot = el('div', 'cp-post-foot com-card-foot');
    var authorName = p.author_display_name || 'CS Odisha Member';
    var authorWrap = el('div', 'com-card-author');
    var avatar = el('span', 'com-author-avatar', getAuthorMonogram(authorName));
    avatar.setAttribute('aria-hidden', 'true');
    authorWrap.append(avatar, el('span', 'com-author-name', authorName));
    foot.appendChild(authorWrap);

    var actsRight = el('div', 'com-card-actions-right');
    var bUp = el('button', 'com-ghost-pill', '▲ ' + (S.lang === 'or' ? 'ଅପଭୋଟ୍' : 'Upvote') + ' (' + num(p.upvotes_count) + ')');
    bUp.type = 'button';
    bUp.addEventListener('click', async function () {
      try {
        var r = await api('/api/community/react', { method: 'POST', body: { target_type: 'post', target_id: p.id, reaction_type: 'upvote' } });
        p.upvotes_count += r.active ? 1 : -1;
        bUp.textContent = '▲ ' + (S.lang === 'or' ? 'ଅପଭୋଟ୍' : 'Upvote') + ' (' + num(Math.max(0, p.upvotes_count)) + ')';
      } catch (err) {
        if (err.status === 401) window.location.href = '/login.html?next=/community/';
      }
    });
    actsRight.appendChild(bUp);

    if (!isDetailView) {
      var aRep = el('a', 'com-ghost-pill', '💬 ' + (S.lang === 'or' ? 'ଉତ୍ତର' : 'Replies') + ' (' + num(p.replies_count) + ')');
      aRep.href = threadHref;
      actsRight.appendChild(aRep);
    } else if (p.author_user_id && p.author_user_id !== 'system-editorial') {
      var bDm = el('button', 'com-ghost-pill', '✉️ Message / Study Buddy');
      bDm.type = 'button';
      bDm.addEventListener('click', function () {
        openQuickDmModal(p.author_user_id, p.author_display_name, p.id);
      });
      actsRight.appendChild(bDm);
    }

    foot.appendChild(actsRight);
    card.appendChild(foot);
    return card;
  }

  function renderInlineChallengeQuiz(p, isDetailView) {
    var qs = S.quizState[p.id] || { answers: {}, submitted: false, resultMsg: '' };
    S.quizState[p.id] = qs;
    var wrap = el('div', 'cp-quiz-list');

    function rerenderQuizHost() {
      if (isDetailView) loadThreadView(p.slug, qsParam('preview_token'));
      else renderBrowseView();
    }

    p.challenge_mcqs.forEach(function (q, qi) {
      var qCard = el('div', 'cp-quiz-card');
      qCard.appendChild(el('p', 'cp-quiz-prompt', formatQuizPrompt(q, qi)));
      var opts = el('div', 'cp-chips');
      (q.options || []).forEach(function (optText, oi) {
        if (!optText) return;
        var chosen = qs.answers[qi] === oi;
        var cls = 'cp-btn cp-btn-sm' + (chosen ? ' cp-btn-primary' : '');
        var b = el('button', cls, String.fromCharCode(65 + oi) + '. ' + optText);
        b.type = 'button';
        b.addEventListener('click', function () {
          if (qs.submitted) return;
          qs.answers[qi] = oi;
          rerenderQuizHost();
        });
        opts.appendChild(b);
      });
      qCard.appendChild(opts);
      if (qs.submitted && q.explanation_en) {
        qCard.appendChild(el('div', 'cp-muted', '💡 Correct: ' + String.fromCharCode(65 + q.correct_index) + ' — ' + q.explanation_en));
      }
      wrap.appendChild(qCard);
    });

    if (!qs.submitted) {
      var bSub = el('button', 'cp-btn cp-btn-gold cp-btn-sm', 'Submit Daily Challenge & Earn XP');
      bSub.type = 'button';
      bSub.addEventListener('click', async function () {
        var score = 0;
        p.challenge_mcqs.forEach(function (q, qi) { if (qs.answers[qi] === q.correct_index) score++; });
        qs.submitted = true;
        qs.resultMsg = '🏆 Score: ' + score + ' / ' + p.challenge_mcqs.length;
        try {
          var r = await api('/api/community/react', { method: 'POST', body: { target_type: 'post', target_id: p.id, reaction_type: 'quiz_attempt', score: score, total: p.challenge_mcqs.length } });
          if (r.xp_awarded) qs.resultMsg += ' (+' + r.xp_awarded + ' Reputation XP earned!)';
        } catch (_e) {}
        rerenderQuizHost();
      });
      wrap.appendChild(bSub);
    } else if (qs.resultMsg) {
      wrap.appendChild(el('strong', '', qs.resultMsg));
    }
    return wrap;
  }

  // ============================================================================
  // THREAD DETAIL & ADMIN DRAFT PREVIEW VIEW
  // ============================================================================
  async function loadThreadView(slug, previewToken) {
    clear(S.root);
    S.root.appendChild(el('div', 'cp-empty', 'Loading discussion thread...'));
    var url = '/api/public/community/post?slug=' + encodeURIComponent(slug);
    if (previewToken) url += '&preview_token=' + encodeURIComponent(previewToken);
    try {
      var data = await api(url);
      var p = data.post;
      document.title = p.title_en + ' | CS Odisha Community';
      if (!data.is_preview) injectThreadJsonLd(p);
      clear(S.root);
      var shell = el('div', 'cp-root');

      if (data.is_preview) {
        var pb = el('div', 'cp-preview-banner');
        pb.appendChild(el('span', '', '👁 ADMIN DRAFT PREVIEW — Not Yet Public'));
        pb.appendChild(el('span', '', 'Verify layout, bilingual text, poll & quiz before publishing'));
        shell.appendChild(pb);
      }

      var topNav = el('div', 'cp-hero-top');
      var backA = el('a', 'cp-btn cp-btn-sm', '← Back to Community Feed');
      backA.href = '/community/';
      topNav.appendChild(backA);
      topNav.appendChild(buildLangToggle(function () { loadThreadView(slug, previewToken); }));
      shell.appendChild(topNav);

      shell.appendChild(renderPostCard(p, true));

      if (data.best_answer) {
        var ba = el('section', 'cp-best-answer');
        ba.appendChild(el('strong', '', '✅ Recommended / Best Answer — by ' + data.best_answer.author_display_name));
        renderRichProse(ba, data.best_answer.body_text);
        shell.appendChild(ba);
      }

      var repSec = el('section', 'cp-panel');
      repSec.appendChild(el('h2', 'cp-panel-title', '💬 Peer Replies & Solutions (' + (data.replies || []).length + ')'));

      if (!p.is_locked) {
        var repTa = el('textarea', 'cp-textarea');
        repTa.placeholder = 'Write a helpful answer, explanation, or reference link (+10 XP per reply, +50 XP for Best Answer)...';
        var repStatus = el('div', 'cp-muted', '');
        var bRep = el('button', 'cp-btn cp-btn-primary', 'Post Reply');
        bRep.type = 'button';
        bRep.addEventListener('click', async function () {
          if (!repTa.value.trim()) return;
          try {
            await api('/api/community/posts/' + encodeURIComponent(p.id) + '/reply', { method: 'POST', body: { body_text: repTa.value.trim() } });
            loadThreadView(slug, previewToken);
          } catch (err) {
            if (err.status === 401) window.location.href = '/login.html?next=' + encodeURIComponent(window.location.pathname + window.location.search);
            else repStatus.textContent = err.message;
          }
        });
        repSec.append(repTa, bRep, repStatus);
      } else {
        repSec.appendChild(el('div', 'cp-muted', '🔒 This thread is locked by moderators.'));
      }

      (data.replies || []).forEach(function (r) {
        var rc = el('div', 'cp-reply-card');
        var rTop = el('div', 'cp-chips');
        rTop.appendChild(el('strong', '', r.author_display_name));
        if (r.author_badge) rTop.appendChild(el('span', 'cp-chip is-pro', r.author_badge));
        if (r.is_best_answer) rTop.appendChild(el('span', 'cp-chip', '✅ Best Answer'));
        rc.appendChild(rTop);
        renderRichProse(rc, r.body_text);

        var rActs = el('div', 'cp-chips');
        var bUpR = el('button', 'cp-btn cp-btn-sm', '👍 Helpful (' + r.upvotes_count + ')'); bUpR.type = 'button';
        bUpR.addEventListener('click', async function () {
          try {
            var rv = await api('/api/community/react', { method: 'POST', body: { target_type: 'reply', target_id: r.id, reaction_type: 'upvote' } });
            r.upvotes_count += rv.active ? 1 : -1;
            bUpR.textContent = '👍 Helpful (' + Math.max(0, r.upvotes_count) + ')';
          } catch (err) { if (err.status === 401) window.location.href = '/login.html?next=/community/'; }
        });
        var bMarkBest = el('button', 'cp-btn cp-btn-sm', '★ Mark Best Answer'); bMarkBest.type = 'button';
        bMarkBest.addEventListener('click', async function () {
          try {
            await api('/api/community/react', { method: 'POST', body: { target_type: 'reply', target_id: r.id, reaction_type: 'best_answer' } });
            loadThreadView(slug, previewToken);
          } catch (err) { window.alert(err.message); }
        });
        rActs.append(bUpR, bMarkBest);
        rc.appendChild(rActs);
        repSec.appendChild(rc);
      });

      shell.appendChild(repSec);
      S.root.appendChild(shell);
    } catch (e) {
      clear(S.root);
      var nf = el('div', 'cp-empty');
      nf.append(el('strong', '', e.message || 'Discussion not found'));
      var back = el('a', 'cp-btn cp-btn-primary', '← Back to Community'); back.href = '/community/';
      nf.appendChild(back);
      S.root.appendChild(nf);
    }
  }

  // ============================================================================
  // MEMBER COMPOSER MODAL (+ SHARE CONTENT / ASK QUESTION / UPLOAD NOTES)
  // ============================================================================
  function openMemberComposerModal() {
    var existing = document.getElementById('cp-member-modal');
    if (existing) existing.remove();
    var backdrop = el('div', 'cp-modal-backdrop');
    backdrop.id = 'cp-member-modal';
    var card = el('div', 'cp-modal-card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');

    var head = el('div', 'cp-pro-head');
    head.appendChild(el('h2', 'cp-pro-title', '✍️ Share Notes, Ask a Question, or Post Exam Intel'));
    var bClose = el('button', 'cp-btn cp-btn-sm', '✕'); bClose.type = 'button';
    bClose.addEventListener('click', function () { backdrop.remove(); });
    head.appendChild(bClose);
    card.appendChild(head);

    var typeSel = el('select', 'cp-select');
    MEMBER_POST_TYPES.forEach(function (pt) { typeSel.appendChild(new Option(pt[1], pt[0])); });

    var l1Sel = el('select', 'cp-select');
    l1Sel.appendChild(new Option('Select Community Circle...', ''));
    S.nodes.filter(function (n) { return Number(n.level) === 1; }).forEach(function (n) { l1Sel.appendChild(new Option(pick(n, 'title'), n.id)); });

    var l2Sel = el('select', 'cp-select');
    l2Sel.appendChild(new Option('Select Interest Group...', ''));
    l1Sel.addEventListener('change', function () {
      clear(l2Sel); l2Sel.appendChild(new Option('Select Interest Group...', ''));
      S.nodes.filter(function (n) { return Number(n.level) === 2 && n.parent_id === l1Sel.value; }).forEach(function (n) { l2Sel.appendChild(new Option(pick(n, 'title'), n.id)); });
    });

    var titleInp = el('input', 'cp-input'); titleInp.placeholder = 'Clear title (e.g. OPSC OAS 2025 Odisha Geography Memory Questions)';
    var bodyTa = el('textarea', 'cp-textarea'); bodyTa.rows = 6; bodyTa.placeholder = 'Share your notes, question, answer-key proof, or exam center tip...';
    var distInp = el('input', 'cp-input'); distInp.placeholder = 'District tag (e.g. Khordha, Cuttack, All Odisha)';
    var bountySel = el('select', 'cp-select');
    [['0', 'No XP Bounty'], ['25', 'Attach +25 XP Priority Doubt Bounty']].forEach(function (b) { bountySel.appendChild(new Option(b[1], b[0])); });
    var fileInp = el('input', 'cp-input'); fileInp.type = 'file'; fileInp.accept = 'application/pdf,image/jpeg,image/png,image/webp';
    var statusMsg = el('div', 'cp-muted', '');

    var bSubmit = el('button', 'cp-btn cp-btn-primary', '🚀 Publish & Earn Reputation XP');
    bSubmit.type = 'button';
    bSubmit.addEventListener('click', async function () {
      try {
        var fd = new FormData();
        fd.append('post_type', typeSel.value);
        fd.append('category_l1_id', l1Sel.value);
        fd.append('category_l2_id', l2Sel.value);
        fd.append('title_en', titleInp.value.trim());
        fd.append('body_en', bodyTa.value.trim());
        fd.append('district_tag', distInp.value.trim());
        fd.append('bounty_xp', bountySel.value);
        if (fileInp.files && fileInp.files[0]) fd.append('attachment', fileInp.files[0]);
        var res = await api('/api/community/posts', { method: 'POST', body: fd });
        backdrop.remove();
        if (res.moderation_status === 'pending_review') {
          window.alert('Submitted for moderator approval! Once approved, you earn XP toward Pro Membership.');
        }
        reloadBrowse();
      } catch (err) {
        if (err.status === 401) window.location.href = '/login.html?next=/community/';
        else statusMsg.textContent = err.message;
      }
    });

    card.append(typeSel, l1Sel, l2Sel, titleInp, bodyTa, distInp, bountySel, el('label', 'cp-muted', 'Attach PDF Notes or Screenshot (Max 10 MB)'), fileInp, bSubmit, statusMsg);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
  }

  // ============================================================================
  // SLIDE-OVER PEER DIRECT MESSAGES & STUDY BUDDY REQUESTS INBOX
  // ============================================================================
  async function openDmInboxDrawer() {
    var existing = document.getElementById('cp-dm-drawer');
    if (existing) existing.remove();
    var backdrop = el('div', 'cp-modal-backdrop');
    backdrop.id = 'cp-dm-drawer';
    var drawer = el('div', 'cp-drawer-card');

    var head = el('div', 'cp-pro-head');
    head.appendChild(el('h2', 'cp-pro-title', '✉️ Peer Direct Messages & Buddy Requests'));
    var bClose = el('button', 'cp-btn cp-btn-sm', '✕'); bClose.type = 'button';
    bClose.addEventListener('click', function () { backdrop.remove(); });
    head.appendChild(bClose);
    drawer.appendChild(head);

    var body = el('div', 'cp-poll-list');
    body.appendChild(el('div', 'cp-muted', 'Loading inbox...'));
    drawer.appendChild(body);
    backdrop.appendChild(drawer);
    document.body.appendChild(backdrop);

    try {
      var res = await api('/api/community/messages');
      S.dmMessages = res.messages || [];
      S.dmAllow = Boolean(res.allow_direct_messages);
      clear(body);

      var privRow = el('label', 'cp-chips');
      var cbDm = el('input'); cbDm.type = 'checkbox'; cbDm.checked = S.dmAllow;
      cbDm.addEventListener('change', async function () {
        await api('/api/community/join', { method: 'POST', body: { action: 'update_preferences', allow_direct_messages: cbDm.checked ? 1 : 0 } });
      });
      privRow.append(cbDm, el('span', 'cp-muted', 'Allow other members to send me Study Partner / DM requests'));
      body.appendChild(privRow);

      if (!S.dmMessages.length) {
        body.appendChild(el('div', 'cp-empty', 'Your inbox is empty. Click "Message / Study Buddy" on any member post to connect!'));
      } else {
        S.dmMessages.forEach(function (m) {
          var item = el('div', 'cp-dm-item');
          item.appendChild(el('strong', '', (m.sender_name || 'Member') + ' → ' + (m.recipient_name || 'Member') + ' (' + m.request_type.replace(/_/g, ' ') + ')'));
          item.appendChild(el('div', 'cp-post-body', m.message_text));
          item.appendChild(el('div', 'cp-muted', 'Status: ' + m.request_status + ' · ' + m.created_at));
          var acts = el('div', 'cp-chips');
          if (m.request_status === 'pending') {
            var bAcc = el('button', 'cp-btn cp-btn-sm cp-btn-primary', 'Accept'); bAcc.type = 'button';
            bAcc.addEventListener('click', async function () { await api('/api/community/messages', { method: 'POST', body: { action: 'respond_request', message_id: m.id, decision: 'accepted' } }); openDmInboxDrawer(); });
            var bDec = el('button', 'cp-btn cp-btn-sm', 'Decline'); bDec.type = 'button';
            bDec.addEventListener('click', async function () { await api('/api/community/messages', { method: 'POST', body: { action: 'respond_request', message_id: m.id, decision: 'declined' } }); openDmInboxDrawer(); });
            acts.append(bAcc, bDec);
          }
          var bRep = el('button', 'cp-btn cp-btn-sm', 'Report'); bRep.type = 'button';
          bRep.addEventListener('click', async function () {
            await api('/api/community/messages', { method: 'POST', body: { action: 'report', message_id: m.id, flag_reason: 'User safety report' } });
            window.alert('Reported to Admin Safety Queue.');
          });
          acts.appendChild(bRep);
          item.appendChild(acts);
          body.appendChild(item);
        });
      }
    } catch (err) {
      clear(body);
      if (err.status === 401) {
        var aL = el('a', 'cp-btn cp-btn-primary', 'Sign in to access Peer Direct Messages →');
        aL.href = '/login.html?next=/community/';
        body.appendChild(aL);
      } else {
        body.appendChild(el('div', 'cp-muted', err.message));
      }
    }
  }

  function openQuickDmModal(recipientId, recipientName, contextPostId) {
    var existing = document.getElementById('cp-quick-dm');
    if (existing) existing.remove();
    var backdrop = el('div', 'cp-modal-backdrop');
    backdrop.id = 'cp-quick-dm';
    var card = el('div', 'cp-modal-card');
    var head = el('div', 'cp-pro-head');
    head.appendChild(el('h2', 'cp-pro-title', '✉️ Connect with ' + recipientName));
    var bC = el('button', 'cp-btn cp-btn-sm', '✕'); bC.type = 'button';
    bC.addEventListener('click', function () { backdrop.remove(); });
    head.appendChild(bC);
    card.appendChild(head);

    var reqType = el('select', 'cp-select');
    [['direct_message', 'Direct Message'], ['study_partner_request', 'Study Partner Request'], ['exam_buddy_request', 'Exam Center Travel Buddy Request']].forEach(function (r) {
      reqType.appendChild(new Option(r[1], r[0]));
    });
    var msgTa = el('textarea', 'cp-textarea'); msgTa.placeholder = 'Introduce yourself & exam target (do not share private phone numbers)...';
    var st = el('div', 'cp-muted', '');
    var bSend = el('button', 'cp-btn cp-btn-primary', 'Send Message'); bSend.type = 'button';
    bSend.addEventListener('click', async function () {
      try {
        await api('/api/community/messages', {
          method: 'POST',
          body: { recipient_user_id: recipientId, recipient_name: recipientName, context_post_id: contextPostId || '', request_type: reqType.value, message_text: msgTa.value.trim() }
        });
        backdrop.remove();
        window.alert('Message sent to ' + recipientName + '!');
      } catch (err) {
        if (err.status === 401) window.location.href = '/login.html?next=/community/';
        else st.textContent = err.message;
      }
    });
    card.append(reqType, msgTa, bSend, st);
    backdrop.appendChild(card);
    document.body.appendChild(backdrop);
  }

  async function reloadBrowse() {
    syncUrlFromFilters();
    await loadPortalData();
    renderBrowseView();
  }

  function mountOptimisticSkeleton() {
    if (S.root && S.root.querySelector('.cso-portal-skeleton')) return;
    clear(S.root);
    var skel = el('div', 'cso-portal-skeleton');
    skel.setAttribute('aria-busy', 'true');
    skel.appendChild(el('div', 'cso-skel-hero'));
    skel.appendChild(el('div', 'cso-skel-bar'));
    var g = el('div', 'cso-skel-grid');
    g.append(el('div', 'cso-skel-card'), el('div', 'cso-skel-card'));
    skel.appendChild(g);
    S.root.appendChild(skel);
  }

  async function boot() {
    S.root = document.getElementById('cso-community-portal-root');
    if (!S.root) return;
    document.body.classList.add('cso-portal-active', 'cso-portal-community-active');
    S.lang = getLangPref();
    var slug = qsParam('slug');
    var previewToken = qsParam('preview_token');
    if (slug) {
      await loadThreadView(slug, previewToken);
      return;
    }
    S.filters.l1 = qsParam('channel') || qsParam('l1');
    S.filters.l2 = qsParam('l2');
    S.filters.l3 = qsParam('l3');
    S.filters.type = qsParam('type');
    S.filters.sort = qsParam('sort') || 'latest';
    S.filters.scope = qsParam('scope') || 'all';
    S.filters.search = qsParam('q') || qsParam('search');

    mountOptimisticSkeleton();
    var hasInitialFilter = Boolean(S.filters.l1 || S.filters.l2 || S.filters.l3 || S.filters.type || (S.filters.sort && S.filters.sort !== 'latest') || (S.filters.scope && S.filters.scope !== 'all') || S.filters.search);
    if (!hasInitialFilter) {
      var bootRes = await fetch('/api/public/community/bootstrap', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
      if (bootRes && bootRes.ok) {
        S.tree = bootRes.tree || [];
        S.nodes = bootRes.nodes || [];
        S.joinedIds = bootRes.joined_node_ids || [];
        S.posts = bootRes.posts || bootRes.items || [];
        S.allPosts = S.posts.slice();
        S.leaderboard = bootRes.leaderboard || [];
        S.rewardRules = bootRes.reward_rules || S.rewardRules;
        S.myProfile = bootRes.my_profile || null;
        if (S.myProfile) S.dmUnread = Number(S.myProfile.unread_messages || 0);
        renderBrowseView();
        return;
      }
    }
    await reloadBrowse();
  }

  window.CSOCommunityPortal = {
    stripMarkdownExcerpt: stripMarkdownExcerpt,
    formatQuizPrompt: formatQuizPrompt
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window, document);
