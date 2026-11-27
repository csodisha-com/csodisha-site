#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

console.log('=== v408 Homepage Local-First Watchlist Digest Banner Audit ===');

const indexHtml = read('index.html');
const dfSrc = read('assets/js/odisha-district-filter.js');
const wlSrc = read('assets/js/candidate-watchlist.js');
const homeHydrationSrc = read('assets/js/home-hydration.js');
const styleCss = read('assets/style.css');
const swJs = read('sw.js');
const opsJs = read('functions/_lib/ops-sentinel.js');

// 1. Markup, Script Wiring & Strict CSP
assert.match(indexHtml, /id="cso-home-watchlist-digest-root"/, 'index.html must mount #cso-home-watchlist-digest-root');
assert.match(indexHtml, /\/assets\/js\/odisha-district-filter\.js\?v=20261127v443/, 'index.html must load odisha-district-filter.js?v=20261127v443');
assert.match(indexHtml, /\/assets\/js\/candidate-watchlist\.js\?v=20261127v443/, 'index.html must load candidate-watchlist.js?v=20261127v443');
assert.ok(!/\sstyle="/i.test(indexHtml), 'index.html must have zero inline style attributes');
assert.ok(!/\son[a-z]+="/i.test(indexHtml), 'index.html must have zero inline on* handlers');
assert.ok(homeHydrationSrc.includes('mountHomepageDigestBanner'), 'home-hydration.js must invoke mountHomepageDigestBanner');
assert.ok(!wlSrc.includes('.innerHTML') && !wlSrc.includes('.outerHTML') && !wlSrc.includes('insertAdjacentHTML') && !wlSrc.includes('.style.'), 'candidate-watchlist.js must obey strict CSP');

// 2. Interactive VM Simulation (Empty Watchlist -> HQ Alias Match -> Dismiss -> New Slug Re-surfaces)
class MiniNode {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.className = '';
    this.id = '';
    this.textContent = '';
    this.hidden = false;
    this.attrs = {};
    this.children = [];
    this.listeners = {};
  }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  appendChild(c) { this.children.push(c); return c; }
  append(...cs) { cs.forEach(c => this.children.push(c)); }
  replaceChildren(...cs) { this.children = cs.slice(); }
  addEventListener(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); }
  click() { (this.listeners.click || []).forEach(fn => fn({ preventDefault() {}, stopPropagation() {} })); }
  find(pred) {
    if (pred(this)) return this;
    for (const c of this.children) {
      if (c && typeof c.find === 'function') {
        const hit = c.find(pred);
        if (hit) return hit;
      }
    }
    return null;
  }
  findAll(pred, out = []) {
    if (pred(this)) out.push(this);
    for (const c of this.children) {
      if (c && typeof c.findAll === 'function') c.findAll(pred, out);
    }
    return out;
  }
}

const store = new Map();
const mockStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => { store.delete(k); }
};
const mockDoc = {
  documentElement: { getAttribute: () => 'en' },
  createElement: (tag) => new MiniNode(tag)
};
const mockWin = {
  localStorage: mockStorage,
  addEventListener: () => {}
};
const sandbox = { window: mockWin, globalThis: mockWin, document: mockDoc, console };
vm.runInNewContext(dfSrc, sandbox);
vm.runInNewContext(wlSrc, sandbox);

const WL = mockWin.CSOWatchlist;
assert.ok(WL && typeof WL.mountHomepageDigestBanner === 'function', 'window.CSOWatchlist.mountHomepageDigestBanner must be exported');
assert.equal(WL.DIGEST_SEEN_KEY, 'cso_watchlist_digest_seen_v1');

const mountEl = new MiniNode('div');
mountEl.id = 'cso-home-watchlist-digest-root';

const sampleFeedItems = [
  {
    slug: 'mmu-bhawanipatna-itep-teaching-recruitment-2026',
    title: 'Maa Manikeswari University Bhawanipatna ITEP Teaching Recruitment 2026',
    title_or: 'ମାଆ ମାଣିକେଶ୍ୱରୀ ବିଶ୍ୱବିଦ୍ୟାଳୟ ଭବାନୀପାଟଣା ITEP ନିଯୁକ୍ତି ୨୦୨୬',
    url: '/jobs/mmu-bhawanipatna-itep-teaching-recruitment-2026',
    published_at: '2026-11-26'
  },
  {
    slug: 'unrelated-central-notice-2026',
    title: 'National Maritime Museum Exhibition 2026',
    url: '/guides/unrelated-central-notice-2026',
    published_at: '2026-11-26'
  }
];

// Case A: Empty watchlist -> stays completely hidden
const ctrl1 = WL.mountHomepageDigestBanner(mountEl, { items: sampleFeedItems });
assert.equal(mountEl.hidden, true, 'Digest banner must stay hidden when cso_candidate_watchlist_v1 is empty');
assert.equal(mountEl.children.length, 0, 'Digest banner must render zero children when watchlist is empty');

// Case B: Pin Kalahandi district -> Bhawanipatna HQ alias matches and surfaces banner
WL.savePreferences({ districts: ['kalahandi'], tracks: ['teaching-tet'], keywords: ['ITEP'] });
ctrl1.refresh(sampleFeedItems, 'en');
assert.equal(mountEl.hidden, false, 'Digest banner must appear when unseen matching D1 alert exists');
const bannerNode = mountEl.find(n => n.id === 'cso-home-watchlist-digest');
assert.ok(bannerNode, 'Must render #cso-home-watchlist-digest');
const itemLinks = bannerNode.findAll(n => n.className === 'cso-wl-digest-item');
assert.equal(itemLinks.length, 1, 'Only the matching Kalahandi/ITEP alert should appear');
const badgeNode = bannerNode.find(n => n.className === 'cso-wl-digest-badge');
assert.ok(badgeNode && badgeNode.textContent.includes('Kalahandi'), 'HQ alias Bhawanipatna must resolve to 📍 Kalahandi badge');

// Case C: Click "Mark Seen & Dismiss" -> persists seen ledger & stays hidden on re-mount
const dismissBtn = bannerNode.find(n => n.getAttribute('data-wl-digest-dismiss') === '1');
assert.ok(dismissBtn, 'Must render Mark Seen & Dismiss button');
dismissBtn.click();
assert.equal(mountEl.hidden, true, 'Banner must hide immediately after Mark Seen & Dismiss');
const savedLedger = JSON.parse(mockStorage.getItem('cso_watchlist_digest_seen_v1'));
assert.ok(savedLedger.seenSlugs.includes('mmu-bhawanipatna-itep-teaching-recruitment-2026'), 'Dismiss must persist matched slug');

const ctrl2 = WL.mountHomepageDigestBanner(mountEl, { items: sampleFeedItems });
assert.equal(mountEl.hidden, true, 'Banner must remain dismissed on subsequent page loads with the same alerts');

// Case D: Newer matching D1 alert arrives -> banner re-surfaces cleanly
const newerItems = sampleFeedItems.concat([
  {
    slug: 'kalahandi-oavs-walkin-2026',
    title: 'Kalahandi OAVS Guest Teacher Walk-In 2026',
    url: '/jobs/kalahandi-oavs-walkin-2026',
    published_at: '2026-11-27'
  }
]);
ctrl2.refresh(newerItems, 'or');
assert.equal(mountEl.hidden, false, 'Banner must re-surface when a newer unseen matching slug arrives');
const titleNodeOr = mountEl.find(n => n.className === 'cso-wl-digest-title');
assert.ok(titleNodeOr && titleNodeOr.textContent.includes('ୱାଚଲିଷ୍ଟ'), 'Banner must render Odia title when lang=or');

// 3. CSS Semantic Tokens, Zero Hardcoded Hex, Print Hide & v408 Cache Sync
const v408CssIdx = styleCss.indexOf('v408: Homepage Local-First Watchlist Digest Banner');
assert.ok(v408CssIdx !== -1, 'assets/style.css must contain v408 Watchlist Digest Banner CSS block');
const v408Css = styleCss.slice(v408CssIdx);
assert.ok(v408Css.includes('.cso-wl-digest') && v408Css.includes('var(--cso-surface-elevated)') && v408Css.includes('var(--cso-ink)'), 'v408 CSS must use semantic --cso-* tokens');
assert.ok(v408Css.includes('min-height: 44px'), 'v408 CSS must enforce >=44px touch targets');
assert.ok(v408Css.includes('prefers-reduced-motion: reduce'), 'v408 CSS must respect prefers-reduced-motion');
assert.ok(v408Css.includes('@media print'), 'v408 CSS must hide digest banner in @media print');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v408Css), 'v408 CSS block must have zero hardcoded hex values');

assert.ok(swJs.includes("CACHE_NAME = 'cso-candidate-cache-v443'"), 'sw.js CACHE_NAME must be v408');
assert.ok(opsJs.includes("ACTIVE_SW_CACHE_VERSION = 'cso-candidate-cache-v443'"), 'ops-sentinel.js ACTIVE_SW_CACHE_VERSION must be v408');

console.log('✅ v408 Homepage Local-First Watchlist Digest Banner Audit PASSED');
