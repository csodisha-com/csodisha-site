/* v175: Interactive Study Library & Bilingual (EN | ଓଡ଼ିଆ | Dual) Upgrades.
   Strict CSP: DOM APIs (createElement / textContent / addEventListener) only. */
(function (root) {
  'use strict';

  var LANG_MODE_KEY = 'cso_study_lang_mode';
  var MISTAKE_DECK_KEY = 'cso_study_mistake_deck';

  // Clean-slate v232: purged hardcoded flashcards; flashcards build strictly from live D1 resources authored in Admin Studio.
  var CURATED_FLASHCARDS = [];

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = String(text);
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }

  function getLangMode(storage) {
    var st = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    try {
      var m = st && st.getItem(LANG_MODE_KEY);
      if (m === 'en' || m === 'or' || m === 'dual') return m;
    } catch (_) {}
    return 'en';
  }

  function setLangMode(mode, storage) {
    var valid = (mode === 'or' || mode === 'dual') ? mode : 'en';
    var st = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    try {
      if (st) {
        st.setItem(LANG_MODE_KEY, valid);
        st.setItem('cso_lang_pref', valid === 'or' ? 'or' : 'en');
      }
    } catch (_) {}
    return valid;
  }

  function resolveBilingualContent(item, mode) {
    var it = item || {};
    var m = (mode === 'or' || mode === 'dual') ? mode : 'en';
    var enTitle = String(it.title || '');
    var orTitle = String(it.title_or || '');
    var enDesc = String(it.description || '');
    var orDesc = String(it.description_or || '');

    if (m === 'or') {
      var hasOr = Boolean(orTitle || orDesc);
      return {
        primaryTitle: orTitle || enTitle,
        secondaryTitle: '',
        primaryDesc: orDesc || enDesc,
        secondaryDesc: '',
        fallbackNote: !hasOr
      };
    }
    if (m === 'dual') {
      return {
        primaryTitle: enTitle,
        secondaryTitle: orTitle,
        primaryDesc: enDesc,
        secondaryDesc: orDesc,
        fallbackNote: false
      };
    }
    return {
      primaryTitle: enTitle,
      secondaryTitle: '',
      primaryDesc: enDesc,
      secondaryDesc: '',
      fallbackNote: false
    };
  }

  function loadMistakeDeck(storage) {
    var st = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    try {
      var raw = st && st.getItem(MISTAKE_DECK_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) { return []; }
  }

  function saveMistakeDeck(deck, storage) {
    var st = storage || (typeof localStorage !== 'undefined' ? localStorage : null);
    try { if (st) st.setItem(MISTAKE_DECK_KEY, JSON.stringify(deck)); } catch (_) {}
    return deck;
  }

  function addMistakeItem(entry, storage) {
    if (!entry || !entry.id) return loadMistakeDeck(storage);
    var deck = loadMistakeDeck(storage);
    var id = String(entry.id);
    if (!deck.some(function (x) { return String(x.id) === id; })) {
      deck.unshift({
        id: id,
        exam: String(entry.exam || 'Study Library'),
        q: String(entry.q || entry.title || 'Revision Concept'),
        a: String(entry.a || entry.description || ''),
        addedAt: Date.now()
      });
      saveMistakeDeck(deck, storage);
    }
    return deck;
  }

  function removeMistakeItem(id, storage) {
    var deck = loadMistakeDeck(storage).filter(function (x) { return String(x.id) !== String(id); });
    saveMistakeDeck(deck, storage);
    return deck;
  }

  function canSpeak() {
    return typeof window !== 'undefined' && typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance === 'function';
  }

  function speakText(text, langCode) {
    if (!canSpeak()) return false;
    try {
      window.speechSynthesis.cancel();
      var u = new window.SpeechSynthesisUtterance(String(text || ''));
      u.lang = langCode || 'en-IN';
      u.rate = 0.95;
      window.speechSynthesis.speak(u);
      return true;
    } catch (_) { return false; }
  }

  function stopSpeech() {
    if (canSpeak()) {
      try { window.speechSynthesis.cancel(); } catch (_) {}
    }
  }

  function buildFlashcardsFromResources(resources) {
    var cards = CURATED_FLASHCARDS.slice();
    (resources || []).slice(0, 8).forEach(function (r) {
      if (Array.isArray(r.key_takeaways) && r.key_takeaways.length) {
        cards.push({
          id: 'res-' + String(r.id),
          exam: r.exam || 'Study Library',
          q: r.title,
          a: r.key_takeaways[0],
          q_or: r.title_or || '',
          a_or: r.description_or || ''
        });
      }
    });
    return cards;
  }

  /* ---------- Flashcards Drawer / Modal ---------- */
  function openFlashcardsModal(opts) {
    var options = opts || {};
    var cards = buildFlashcardsFromResources(options.resources || []);
    var idx = 0;
    var flipped = false;
    var langMode = options.langMode || getLangMode();
    var onDeckChange = options.onDeckChange || function () {};
    var onToast = options.onToast || function () {};

    var existing = document.getElementById('study-flashcards-modal');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    var backdrop = el('div', 'study-modal-backdrop');
    backdrop.id = 'study-flashcards-modal';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Quick Revision Flashcards');

    var shell = el('div', 'study-modal-card study-fc-modal');
    var head = el('div', 'study-modal-head');
    var headText = el('div');
    var counter = el('p', 'study-modal-subtitle', 'Card 1 of ' + cards.length);
    headText.append(el('h2', '', '🗂 Quick Revision Flashcards'), counter);
    var closeBtn = el('button', 'study-modal-close', '✕');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close flashcards');
    head.append(headText, closeBtn);

    var body = el('div', 'study-modal-body');
    var cardBtn = el('button', 'study-fc-card');
    cardBtn.type = 'button';
    cardBtn.setAttribute('aria-label', 'Flip flashcard');

    var cardExam = el('span', 'study-badge study-badge--exam', '');
    var cardSide = el('span', 'study-badge study-badge--type', 'Question / Concept');
    var cardTop = el('div', 'study-card-top');
    cardTop.append(cardExam, cardSide);
    var cardMain = el('div', 'study-fc-text', '');
    var cardSub = el('div', 'study-fc-sub', '');
    var cardHint = el('div', 'study-fc-hint', 'Tap or press Enter/Space to flip');
    cardBtn.append(cardTop, cardMain, cardSub, cardHint);

    var controls = el('div', 'study-fc-controls');
    var prevBtn = el('button', 'study-btn', '← Previous');
    prevBtn.type = 'button';
    var nextBtn = el('button', 'study-btn', 'Next →');
    nextBtn.type = 'button';
    var shuffleBtn = el('button', 'study-btn', '🔀 Shuffle');
    shuffleBtn.type = 'button';
    var listenBtn = el('button', 'study-btn', '🔊 Listen');
    listenBtn.type = 'button';
    if (!canSpeak()) listenBtn.hidden = true;
    var needRevBtn = el('button', 'study-btn study-btn--warn', '🔁 Need Revision');
    needRevBtn.type = 'button';
    controls.append(prevBtn, nextBtn, shuffleBtn, listenBtn, needRevBtn);

    body.append(cardBtn, controls);
    shell.append(head, body);
    backdrop.appendChild(shell);

    function renderCard() {
      var c = cards[idx];
      if (!c) return;
      counter.textContent = 'Card ' + (idx + 1) + ' of ' + cards.length;
      cardExam.textContent = c.exam;
      cardSide.textContent = flipped ? 'Answer / Explanation' : 'Question / Concept';
      cardBtn.classList.toggle('is-flipped', flipped);
      var enTxt = flipped ? c.a : c.q;
      var orTxt = flipped ? c.a_or : c.q_or;
      if (langMode === 'or') {
        cardMain.textContent = orTxt || enTxt;
        cardSub.textContent = orTxt ? '' : 'ଓଡ଼ିଆ ଅନୁବାଦ ଉପଲବ୍ଧ ନାହିଁ · Showing English';
      } else if (langMode === 'dual') {
        cardMain.textContent = enTxt;
        cardSub.textContent = orTxt || '';
      } else {
        cardMain.textContent = enTxt;
        cardSub.textContent = '';
      }
    }

    function flip() {
      flipped = !flipped;
      stopSpeech();
      renderCard();
    }
    cardBtn.addEventListener('click', flip);
    prevBtn.addEventListener('click', function () {
      idx = (idx - 1 + cards.length) % cards.length;
      flipped = false;
      stopSpeech();
      renderCard();
    });
    nextBtn.addEventListener('click', function () {
      idx = (idx + 1) % cards.length;
      flipped = false;
      stopSpeech();
      renderCard();
    });
    shuffleBtn.addEventListener('click', function () {
      for (var i = cards.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = cards[i]; cards[i] = cards[j]; cards[j] = tmp;
      }
      idx = 0;
      flipped = false;
      stopSpeech();
      renderCard();
    });
    listenBtn.addEventListener('click', function () {
      var c = cards[idx];
      if (!c) return;
      speakText(flipped ? c.a : c.q, 'en-IN');
    });
    needRevBtn.addEventListener('click', function () {
      var c = cards[idx];
      if (!c) return;
      var deck = addMistakeItem(c);
      onDeckChange(deck);
      onToast('Added to Revise Again deck (' + deck.length + ')');
    });

    function close() {
      stopSpeech();
      document.removeEventListener('keydown', onKey);
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    }
    function onKey(e) {
      if (e.key === 'Escape') close();
    }
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', onKey);

    document.body.appendChild(backdrop);
    renderCard();
    closeBtn.focus();
  }

  /* ---------- Revise Again Mistake Deck Modal ---------- */
  function openReviseAgainModal(opts) {
    var options = opts || {};
    var onDeckChange = options.onDeckChange || function () {};
    var onToast = options.onToast || function () {};

    var existing = document.getElementById('study-revise-modal');
    if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

    var backdrop = el('div', 'study-modal-backdrop');
    backdrop.id = 'study-revise-modal';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Revise Again Mistake Deck');

    var shell = el('div', 'study-modal-card');
    var head = el('div', 'study-modal-head');
    var headText = el('div');
    var sub = el('p', 'study-modal-subtitle', 'Focused practice for flagged or missed items');
    headText.append(el('h2', '', '🔁 Revise Again — Mistake Deck'), sub);
    var closeBtn = el('button', 'study-modal-close', '✕');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close revise again deck');
    head.append(headText, closeBtn);

    var body = el('div', 'study-modal-body');

    function renderDeck() {
      clear(body);
      var deck = loadMistakeDeck();
      sub.textContent = deck.length + ' item' + (deck.length === 1 ? '' : 's') + ' awaiting mastery';
      onDeckChange(deck);
      if (!deck.length) {
        var empty = el('div', 'study-modal-box');
        empty.appendChild(el('p', 'study-card-desc', 'Your Revise Again deck is empty! Flag any flashcard or study item with "Need Revision" to practice it here.'));
        body.appendChild(empty);
        return;
      }
      deck.forEach(function (item) {
        var box = el('div', 'study-revise-card');
        box.appendChild(el('span', 'study-badge study-badge--exam', item.exam || 'Revision'));
        box.appendChild(el('h3', 'study-card-title', item.q));
        var ans = el('p', 'study-card-desc', item.a || 'Review this topic in the Study Library.');
        ans.hidden = true;

        var rowActions = el('div', 'study-revise-actions');
        var revealBtn = el('button', 'study-btn', '👁 Show Answer');
        revealBtn.type = 'button';
        revealBtn.addEventListener('click', function () {
          ans.hidden = !ans.hidden;
          revealBtn.textContent = ans.hidden ? '👁 Show Answer' : 'Hide Answer';
        });

        var masteredBtn = el('button', 'study-btn study-btn--primary', '✓ Mark Mastered');
        masteredBtn.type = 'button';
        masteredBtn.addEventListener('click', function () {
          var next = removeMistakeItem(item.id);
          onToast('Marked mastered! ' + next.length + ' remaining');
          renderDeck();
        });

        rowActions.append(revealBtn, masteredBtn);
        if (canSpeak()) {
          var hearBtn = el('button', 'study-btn', '🔊 Listen');
          hearBtn.type = 'button';
          hearBtn.addEventListener('click', function () { speakText(item.q + '. ' + item.a, 'en-IN'); });
          rowActions.append(hearBtn);
        }
        box.append(ans, rowActions);
        body.appendChild(box);
      });
    }

    function close() {
      stopSpeech();
      document.removeEventListener('keydown', onKey);
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    closeBtn.addEventListener('click', close);
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', onKey);

    shell.append(head, body);
    backdrop.appendChild(shell);
    document.body.appendChild(backdrop);
    renderDeck();
    closeBtn.focus();
  }

  root.CSOStudyInteractive = {
    LANG_MODE_KEY: LANG_MODE_KEY,
    MISTAKE_DECK_KEY: MISTAKE_DECK_KEY,
    CURATED_FLASHCARDS: CURATED_FLASHCARDS,
    getLangMode: getLangMode,
    setLangMode: setLangMode,
    resolveBilingualContent: resolveBilingualContent,
    loadMistakeDeck: loadMistakeDeck,
    saveMistakeDeck: saveMistakeDeck,
    addMistakeItem: addMistakeItem,
    removeMistakeItem: removeMistakeItem,
    canSpeak: canSpeak,
    speakText: speakText,
    stopSpeech: stopSpeech,
    buildFlashcardsFromResources: buildFlashcardsFromResources,
    openFlashcardsModal: openFlashcardsModal,
    openReviseAgainModal: openReviseAgainModal
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.CSOStudyInteractive;
})(typeof window !== 'undefined' ? window : globalThis);
