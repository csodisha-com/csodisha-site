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
    filters: { l1: '', l2: '', l3: '', type: '', sort: 'latest', joined_only: false, unanswered_only: false, featured_collections: false, pro_contributors: false, search: '' },
    dmMessages: [],
    dmUnread: 0,
    dmAllow: true,
    quizState: {}
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

  async function loadPortalData() {
    var q = new URLSearchParams();
    if (S.filters.l1) q.set('l1', S.filters.l1);
    if (S.filters.l2) q.set('l2', S.filters.l2);
    if (S.filters.l3) q.set('l3', S.filters.l3);
    if (S.filters.type) q.set('type', S.filters.type);
    if (S.filters.sort) q.set('sort', S.filters.sort);
    if (S.filters.joined_only) q.set('joined_only', '1');
    if (S.filters.unanswered_only) q.set('unanswered_only', '1');
    if (S.filters.featured_collections) q.set('featured_collections', '1');
    if (S.filters.pro_contributors) q.set('pro_contributors', '1');
    if (S.filters.search) q.set('search', S.filters.search);
    var qs = q.toString() ? ('?' + q.toString()) : '';

    var res = await Promise.all([
      api('/api/public/community/tree').catch(function () { return { tree: [], nodes: [], joined_node_ids: [] }; }),
      api('/api/public/community/posts' + qs).catch(function () { return { items: [], leaderboard: [], reward_rules: null, my_profile: null }; })
    ]);
    S.tree = res[0].tree || [];
    S.nodes = res[0].nodes || [];
    S.joinedIds = res[0].joined_node_ids || [];
    S.posts = res[1].items || [];
    var isUnfiltered = !S.filters.l1 && !S.filters.l2 && !S.filters.l3 && !S.filters.type && !S.filters.joined_only && !S.filters.unanswered_only && !S.filters.featured_collections && !S.filters.pro_contributors && !S.filters.search;
    if (isUnfiltered) S.allPosts = S.posts.slice();
    S.leaderboard = res[1].leaderboard || [];
    S.rewardRules = res[1].reward_rules || S.rewardRules;
    S.myProfile = res[1].my_profile || null;
    if (S.myProfile) S.dmUnread = Number(S.myProfile.unread_messages || 0);
  }

  // ============================================================================
  // FLAGSHIP EDITORIAL HERO BANNER (v258)
  // ============================================================================
  function renderEditorialHero(shell) {
    var kpis = computeCommunityHeroKpis();
    var hero = el('section', 'cp-hero');
    hero.setAttribute('aria-label', 'Odisha Aspirant Community, Study Circles & Civic Helpdesk');

    var top = el('div', 'cp-hero-top');
    var eyebrow = el('span', 'cp-eyebrow');
    eyebrow.appendChild(el('span', 'cp-eyebrow-dot'));
    eyebrow.appendChild(el('span', '', S.lang === 'or'
      ? 'ଓଡ଼ିଶା ପରୀକ୍ଷାର୍ଥୀ ଓ ନାଗରିକ ନେଟୱର୍କ · ପ୍ରଶ୍ନୋତ୍ତର, ଅଧ୍ୟୟନ ଚକ୍ର ଓ ପ୍ରୋ ପୁରସ୍କାର'
      : 'ODISHA ASPIRANT & CIVIC NETWORK · PEER Q&A, STUDY CIRCLES & PRO REWARDS'));
    top.appendChild(eyebrow);
    top.appendChild(buildLangToggle(function () { renderBrowseView(); }));
    hero.appendChild(top);

    var copy = el('div', 'cp-hero-copy');
    copy.appendChild(el('h1', 'cp-hero-title', S.lang === 'or'
      ? 'ଓଡ଼ିଶା ପରୀକ୍ଷାର୍ଥୀ ସମୁଦାୟ, ଅଧ୍ୟୟନ ଚକ୍ର ଏବଂ ନାଗରିକ ସହାୟତା କେନ୍ଦ୍ର'
      : 'Odisha Aspirant Community, Study Circles & Civic Helpdesk'));
    copy.appendChild(el('p', 'cp-hero-sub', S.lang === 'or'
      ? 'ଓଡ଼ିଶାର ସମସ୍ତ ୩୦ ଜିଲ୍ଲାର ପରୀକ୍ଷା ଓ ଜିଲ୍ଲା ଚକ୍ରରେ ଯୋଗ ଦିଅନ୍ତୁ, ହାତଲେଖା ନୋଟ୍ସ ଓ ସ୍ମୃତି ଆଧାରିତ PYQ ସେୟାର କରନ୍ତୁ, ସହପାଠୀଙ୍କ ସନ୍ଦେହ ସମାଧାନ କରନ୍ତୁ ଏବଂ ମାଗଣା ପ୍ରୋ ଓ ସ୍ଥାୟୀ ସଦସ୍ୟତା ଲାଭ କରନ୍ତୁ।'
      : 'Join exam & district circles across all 30 Odisha districts, share handwritten notes & memory-based PYQs, solve peer doubts, connect with study buddies, and unlock free Pro & Permanent Membership.'));
    hero.appendChild(copy);

    var kpiRow = el('div', 'cp-hero-kpis');
    [
      [num(kpis.circlesCount), S.lang === 'or' ? 'ଆଗ୍ରହ ଚକ୍ର' : 'Interest Circles'],
      [num(kpis.discussionsCount), S.lang === 'or' ? 'ସକ୍ରିୟ ଆଲୋଚନା' : 'Active Discussions'],
      [num(kpis.proCount), S.lang === 'or' ? 'ପ୍ରୋ ଓ ସ୍ଥାୟୀ ସଦସ୍ୟ' : 'Pro & Permanent Contributors'],
      [num(kpis.solvedCount), S.lang === 'or' ? 'ସମାଧାନ ପ୍ରଶ୍ନୋତ୍ତର' : 'Solved Q&As']
    ].forEach(function (pair) {
      var tile = el('div', 'cp-hero-kpi');
      tile.appendChild(el('strong', 'cp-hero-kpi-val', pair[0]));
      tile.appendChild(el('span', 'cp-hero-kpi-label', pair[1]));
      kpiRow.appendChild(tile);
    });
    hero.appendChild(kpiRow);
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
  // BROWSE VIEW
  // ============================================================================
  function renderBrowseView() {
    var activeEl = document.activeElement;
    var restoreFocusId = (activeEl && activeEl.id === 'cp-search-input') ? activeEl.id : '';

    clear(S.root);
    var shell = el('div', 'cp-root');
    renderEditorialHero(shell);
    renderProProgressBanner(shell);

    // Top Elevated Action Bar
    var bar = el('div', 'cp-toolbar');
    var left = el('div', 'cp-chips');
    var btnCompose = el('button', 'cp-btn cp-btn-primary', S.lang === 'or'
      ? '+ ବିଷୟବସ୍ତୁ ସେୟାର / ପ୍ରଶ୍ନ ପଚାରନ୍ତୁ / ନୋଟ୍ସ ଅପଲୋଡ୍'
      : '+ Share Content / Ask Question / Upload Notes');
    btnCompose.type = 'button';
    btnCompose.addEventListener('click', openMemberComposerModal);

    var btnJoined = el('button', 'cp-btn' + (S.filters.joined_only ? ' cp-btn-primary' : ''), (S.lang === 'or' ? '🤝 ମୋର ଯୋଗଦାନ ସମୁଦାୟ (' : '🤝 My Joined Communities (') + S.joinedIds.length + ')');
    btnJoined.type = 'button';
    btnJoined.addEventListener('click', function () { S.filters.joined_only = !S.filters.joined_only; reloadBrowse(); });

    var btnInbox = el('button', 'cp-btn cp-btn-violet', (S.lang === 'or' ? '✉️ ସିଧାସଳଖ ବାର୍ତ୍ତା ଓ ବଡି ଇନବକ୍ସ' : '✉️ Direct Messages & Buddy Inbox') + (S.dmUnread > 0 ? ' (' + S.dmUnread + ')' : ''));
    btnInbox.type = 'button';
    btnInbox.addEventListener('click', openDmInboxDrawer);

    left.append(btnCompose, btnJoined, btnInbox);
    bar.appendChild(left);

    var sortSel = el('select', 'cp-select');
    sortSel.setAttribute('aria-label', 'Sort community discussions');
    [['latest', 'Sort: Latest'], ['top_voted', 'Sort: Top Voted'], ['most_discussed', 'Sort: Most Discussed'], ['bounty', 'Sort: Highest XP Bounty']].forEach(function (s) {
      sortSel.appendChild(new Option(s[1], s[0]));
    });
    sortSel.value = S.filters.sort;
    sortSel.addEventListener('change', function () { S.filters.sort = sortSel.value; reloadBrowse(); });
    bar.appendChild(sortSel);
    shell.appendChild(bar);

    // 3-Layer Cascading Filters + Quick Pills
    var fPanel = el('section', 'cp-panel');
    fPanel.setAttribute('aria-label', 'Community Circle and Discussion Filters');
    var pills = el('div', 'cp-chips');
    [
      ['All Feed', function () { S.filters.type = ''; S.filters.unanswered_only = false; S.filters.featured_collections = false; S.filters.pro_contributors = false; }, !S.filters.type && !S.filters.unanswered_only && !S.filters.featured_collections && !S.filters.pro_contributors],
      ['❓ Unanswered Q&A', function () { S.filters.unanswered_only = !S.filters.unanswered_only; }, S.filters.unanswered_only],
      ['🌟 Featured Collections', function () { S.filters.featured_collections = !S.filters.featured_collections; }, S.filters.featured_collections],
      ['⭐ Pro Contributors', function () { S.filters.pro_contributors = !S.filters.pro_contributors; }, S.filters.pro_contributors],
      ['📝 Shared Notes', function () { S.filters.type = S.filters.type === 'shared_notes' ? '' : 'shared_notes'; }, S.filters.type === 'shared_notes'],
      ['🧠 Memory Questions', function () { S.filters.type = S.filters.type === 'memory_question' ? '' : 'memory_question'; }, S.filters.type === 'memory_question'],
      ['⚡ Quiz & Polls', function () { S.filters.type = S.filters.type === 'quiz_challenge' ? '' : 'quiz_challenge'; }, S.filters.type === 'quiz_challenge']
    ].forEach(function (d) {
      var b = el('button', 'cp-btn cp-btn-sm' + (d[2] ? ' cp-btn-primary' : ''), d[0]);
      b.type = 'button';
      b.addEventListener('click', function () { d[1](); reloadBrowse(); });
      pills.appendChild(b);
    });
    fPanel.appendChild(pills);

    var g3 = el('div', 'cp-grid-3');
    function makeFilterField(id, lblText, defaultLabel, opts, val, onChange) {
      var f = el('div', 'cp-field');
      var lbl = el('label', 'cp-label', lblText);
      lbl.setAttribute('for', id);
      f.appendChild(lbl);
      var sel = el('select', 'cp-select');
      sel.id = id;
      sel.appendChild(new Option(defaultLabel, ''));
      opts.forEach(function (o) { sel.appendChild(new Option(o[1], o[0])); });
      sel.value = val;
      sel.addEventListener('change', function () { onChange(sel.value); });
      f.appendChild(sel);
      return f;
    }

    var l1Nodes = S.nodes.filter(function (n) { return Number(n.level) === 1; });
    var l2Nodes = S.nodes.filter(function (n) { return Number(n.level) === 2 && (!S.filters.l1 || n.parent_id === S.filters.l1); });
    var l3Nodes = S.nodes.filter(function (n) { return Number(n.level) === 3 && (!S.filters.l2 || n.parent_id === S.filters.l2); });

    g3.appendChild(makeFilterField(
      'cp-sel-circle',
      S.lang === 'or' ? '୧. କମ୍ୟୁନିଟି ସର୍କଲ୍' : '1. Community Circle',
      S.lang === 'or' ? 'ସମସ୍ତ କମ୍ୟୁନିଟି ସର୍କଲ୍' : 'All Community Circles',
      l1Nodes.map(function (n) { return [n.id, (n.icon ? n.icon + ' ' : '') + pick(n, 'title')]; }),
      S.filters.l1,
      function (v) { S.filters.l1 = v; S.filters.l2 = ''; S.filters.l3 = ''; reloadBrowse(); }
    ));

    g3.appendChild(makeFilterField(
      'cp-sel-group',
      S.lang === 'or' ? '୨. ଆଗ୍ରହ ଗୋଷ୍ଠୀ' : '2. Interest Group',
      S.lang === 'or' ? 'ସମସ୍ତ ଆଗ୍ରହ ଗୋଷ୍ଠୀ' : 'All Interest Groups',
      l2Nodes.map(function (n) { return [n.id, (n.icon ? n.icon + ' ' : '') + pick(n, 'title')]; }),
      S.filters.l2,
      function (v) { S.filters.l2 = v; S.filters.l3 = ''; reloadBrowse(); }
    ));

    g3.appendChild(makeFilterField(
      'cp-sel-format',
      S.lang === 'or' ? '୩. ଆଲୋଚନା ପ୍ରକାର' : '3. Discussion Format',
      S.lang === 'or' ? 'ସମସ୍ତ ଆଲୋଚନା ପ୍ରକାର' : 'All Discussion Formats',
      l3Nodes.map(function (n) { return [n.id, (n.icon ? n.icon + ' ' : '') + pick(n, 'title')]; }),
      S.filters.l3,
      function (v) { S.filters.l3 = v; reloadBrowse(); }
    ));

    var sField = el('div', 'cp-field');
    var sLbl = el('label', 'cp-label', S.lang === 'or' ? '୪. ଆଲୋଚନା ଖୋଜନ୍ତୁ' : '4. Search Discussions');
    sLbl.setAttribute('for', 'cp-search-input');
    sField.appendChild(sLbl);
    var searchInp = el('input', 'cp-input');
    searchInp.id = 'cp-search-input';
    searchInp.type = 'search';
    searchInp.placeholder = S.lang === 'or' ? 'ଆଲୋଚନା, ନୋଟ୍ସ, ଓଡ଼ିଶା ଜିଲ୍ଲା ଖୋଜନ୍ତୁ...' : 'Search discussions, notes, Odisha districts...';
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
    sField.appendChild(searchInp);
    g3.appendChild(sField);

    fPanel.appendChild(g3);
    shell.appendChild(fPanel);

    // 2-Column Layout: Feed (Left) + Communities Directory & Leaderboard (Right)
    var layout = el('div', 'cp-layout');
    var mainCol = el('div', 'cp-main-col');
    var sideCol = el('aside', 'cp-side-col');

    if (!S.posts.length) {
      var emp = el('div', 'cp-empty');
      emp.appendChild(el('strong', '', S.lang === 'or'
        ? 'ଏହି ଫିଲ୍ଟର୍ ସହିତ କୌଣସି ଆଲୋଚନା ମିଳିଲା ନାହିଁ।'
        : 'No discussions match this filter yet.'));
      emp.appendChild(el('div', 'cp-muted', 'Click "+ Share Content / Ask Question / Upload Notes" to start the conversation and earn Pro XP!'));
      var rBtn = el('button', 'cp-btn cp-btn-sm cp-btn-primary', 'Reset Filters');
      rBtn.type = 'button';
      rBtn.addEventListener('click', function () {
        S.filters = { l1: '', l2: '', l3: '', type: '', sort: 'latest', joined_only: false, unanswered_only: false, featured_collections: false, pro_contributors: false, search: '' };
        reloadBrowse();
      });
      emp.appendChild(rBtn);
      mainCol.appendChild(emp);
    } else {
      S.posts.forEach(function (p) { mainCol.appendChild(renderPostCard(p, false)); });
    }

    // Sidebar 1: Communities of Interest Directory with One-Click Join
    var dirPanel = el('section', 'cp-panel');
    var dirHead = el('div', 'cp-panel-head');
    dirHead.appendChild(el('h3', 'cp-panel-title', S.lang === 'or'
      ? '🎯 ଆଗ୍ରହ ସମୁଦାୟ (ଚକ୍ରରେ ଯୋଗ ଦିଅନ୍ତୁ)'
      : '🎯 Communities of Interest (Join Circles)'));
    dirPanel.appendChild(dirHead);

    var circleList = el('div', 'cp-poll-list');
    S.nodes.filter(function (n) { return Number(n.level) === 1 || Number(n.level) === 2; }).slice(0, 12).forEach(function (n) {
      var cc = el('div', 'cp-circle-card');
      var top = el('div', 'cp-circle-top');
      var link = el('button', 'cp-circle-link', (n.icon ? n.icon + ' ' : '') + pick(n, 'title'));
      link.type = 'button';
      link.addEventListener('click', function () {
        if (Number(n.level) === 1) { S.filters.l1 = n.id; S.filters.l2 = ''; S.filters.l3 = ''; }
        else { S.filters.l1 = n.parent_id || ''; S.filters.l2 = n.id; S.filters.l3 = ''; }
        reloadBrowse();
      });
      var isJ = n.is_joined || S.joinedIds.indexOf(n.id) !== -1;
      var btnJ = el('button', 'cp-btn cp-btn-sm' + (isJ ? ' cp-btn-primary' : ''), isJ ? '✓ Joined' : '+ Join');
      btnJ.type = 'button';
      btnJ.addEventListener('click', async function () {
        try {
          await api('/api/community/join', { method: 'POST', body: { node_id: n.id } });
          reloadBrowse();
        } catch (err) {
          if (err.status === 401) window.location.href = '/login.html?next=/community/';
        }
      });
      top.append(link, btnJ);
      cc.appendChild(top);
      if (pick(n, 'subtitle')) cc.appendChild(el('div', 'cp-muted', pick(n, 'subtitle')));
      cc.appendChild(el('div', 'cp-muted', '👥 ' + num(n.members_count) + ' members · 💬 ' + num(n.posts_count || 0) + ' posts'));
      circleList.appendChild(cc);
    });
    dirPanel.appendChild(circleList);
    sideCol.appendChild(dirPanel);

    // Sidebar 2: Top Contributors & Recognized Mentors Leaderboard
    var lbPanel = el('section', 'cp-panel');
    var lbHead = el('div', 'cp-panel-head');
    lbHead.appendChild(el('h3', 'cp-panel-title', S.lang === 'or'
      ? '🏆 ଶ୍ରେଷ୍ଠ ଯୋଗଦାନକାରୀ ଓ ପ୍ରୋ ମେଣ୍ଟର'
      : '🏆 Top Contributors & Pro Mentors'));
    lbPanel.appendChild(lbHead);

    if (!S.leaderboard.length) {
      lbPanel.appendChild(el('div', 'cp-muted', 'Share helpful notes & answer doubts to claim #1 on the Odisha Community Leaderboard!'));
    } else {
      S.leaderboard.forEach(function (m, idx) {
        var row = el('div', 'cp-leaderboard-item');
        var leftM = el('div');
        leftM.appendChild(el('strong', '', '#' + (idx + 1) + ' ' + m.display_name));
        leftM.appendChild(el('div', 'cp-muted', (m.badge_label || 'Member') + (m.district ? ' · ' + m.district : '')));
        row.append(leftM, el('span', 'cp-chip is-pro', num(m.reputation_xp) + ' XP'));
        lbPanel.appendChild(row);
      });
    }
    sideCol.appendChild(lbPanel);

    layout.append(mainCol, sideCol);
    shell.appendChild(layout);
    S.root.appendChild(shell);

    if (restoreFocusId) {
      var refocus = document.getElementById(restoreFocusId);
      if (refocus && typeof refocus.focus === 'function') refocus.focus();
    }
  }

  function renderPostCard(p, isDetailView) {
    var card = el('article', 'cp-post-card' + (p.is_pinned ? ' is-pinned' : ''));

    var chips = el('div', 'cp-chips');
    chips.appendChild(el('span', 'cp-chip', String(p.post_type || 'discussion').replace(/_/g, ' ')));
    if (p.is_pinned) chips.appendChild(el('span', 'cp-chip is-perm', '📌 Pinned'));
    if (p.is_solved) chips.appendChild(el('span', 'cp-chip', '✅ Solved'));
    if (p.is_featured_collection) chips.appendChild(el('span', 'cp-chip is-pro', '🌟 Featured Collection'));
    if (p.bounty_xp > 0) chips.appendChild(el('span', 'cp-chip is-bounty', '+' + p.bounty_xp + ' XP Bounty'));
    if (p.author_membership_tier === 'permanent_member') chips.appendChild(el('span', 'cp-chip is-perm', '👑 Permanent Member'));
    else if (p.author_membership_tier === 'pro_member') chips.appendChild(el('span', 'cp-chip is-pro', '⭐ Pro Member'));
    card.appendChild(chips);

    if (p.cover_image_url && safeHref(p.cover_image_url)) {
      var img = el('img', 'cp-post-cover');
      img.src = safeHref(p.cover_image_url);
      img.alt = p.title_en;
      img.loading = 'lazy';
      img.decoding = 'async';
      card.appendChild(img);
    }

    var displayTitle = pick(p, 'title') || p.title_en;
    var h = el(isDetailView ? 'h1' : 'h3', 'cp-post-title');
    if (isDetailView) {
      h.textContent = displayTitle;
    } else {
      var a = el('a', '', displayTitle);
      a.href = '/community/?slug=' + encodeURIComponent(p.slug);
      h.appendChild(a);
    }
    card.appendChild(h);
    if (p.title_or && S.lang !== 'or') card.appendChild(el('div', 'cp-muted', p.title_or));

    var meta = 'By ' + p.author_display_name + (p.district_tag ? ' · ' + p.district_tag : '') + (p.exam_tag ? ' · ' + p.exam_tag : '');
    card.appendChild(el('div', 'cp-muted', meta));

    var rawBody = pick(p, 'body') || p.body_en || '';
    if (rawBody) {
      if (isDetailView) {
        renderRichProse(card, rawBody);
      } else {
        card.appendChild(el('div', 'cp-post-body', stripMarkdownExcerpt(rawBody, 260)));
      }
    }

    if (p.attachment_url && safeHref(p.attachment_url)) {
      var aPdf = el('a', 'cp-btn cp-btn-sm', '📎 ' + (p.attachment_label || 'Open Shared PDF / Notes'));
      aPdf.href = safeHref(p.attachment_url);
      aPdf.target = '_blank';
      aPdf.rel = 'noopener noreferrer';
      card.appendChild(aPdf);
    }

    // Live Poll Widget
    if (p.post_type === 'poll' && Array.isArray(p.poll_options) && p.poll_options.length) {
      var pollWrap = el('div', 'cp-poll-list');
      var votes = p.poll_votes || {};
      var totalVotes = Object.values(votes).reduce(function (s, v) { return s + Number(v || 0); }, 0);
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
      card.appendChild(pollWrap);
    }

    // 5-Question Daily Peer Quiz Challenge Widget (deduplicated single prompt per question)
    if (p.post_type === 'quiz_challenge' && Array.isArray(p.challenge_mcqs) && p.challenge_mcqs.length) {
      card.appendChild(renderInlineChallengeQuiz(p, isDetailView));
    }

    // Card Footer Actions
    var foot = el('div', 'cp-post-foot');
    var bUp = el('button', 'cp-btn cp-btn-sm', '👍 Upvote (' + p.upvotes_count + ')');
    bUp.type = 'button';
    bUp.addEventListener('click', async function () {
      try {
        var r = await api('/api/community/react', { method: 'POST', body: { target_type: 'post', target_id: p.id, reaction_type: 'upvote' } });
        p.upvotes_count += r.active ? 1 : -1;
        bUp.textContent = '👍 Upvote (' + Math.max(0, p.upvotes_count) + ')';
      } catch (err) {
        if (err.status === 401) window.location.href = '/login.html?next=/community/';
      }
    });
    foot.appendChild(bUp);

    if (!isDetailView) {
      var aOpen = el('a', 'cp-btn cp-btn-sm cp-btn-primary', '💬 Replies (' + p.replies_count + ') →');
      aOpen.href = '/community/?slug=' + encodeURIComponent(p.slug);
      foot.appendChild(aOpen);
    }

    if (p.author_user_id && p.author_user_id !== 'system-editorial') {
      var bDm = el('button', 'cp-btn cp-btn-sm', '✉️ Message / Study Buddy');
      bDm.type = 'button';
      bDm.addEventListener('click', function () {
        openQuickDmModal(p.author_user_id, p.author_display_name, p.id);
      });
      foot.appendChild(bDm);
    }

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
    await loadPortalData();
    renderBrowseView();
  }

  function mountOptimisticSkeleton() {
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
    S.filters.l1 = qsParam('l1');
    S.filters.l2 = qsParam('l2');
    S.filters.l3 = qsParam('l3');
    S.filters.type = qsParam('type');
    S.filters.search = qsParam('q') || qsParam('search');

    mountOptimisticSkeleton();
    var hasInitialFilter = Boolean(S.filters.l1 || S.filters.l2 || S.filters.l3 || S.filters.type || S.filters.search);
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
