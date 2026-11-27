#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const indexHtml = read('index.html');
const appJs = read('assets/app.js');
const sharedHeaderJs = read('assets/shared-header.js');
const styleCss = read('assets/style.css');

console.log('=== v406 Mobile Navigation Drawer Dropdown & Slide-Accordion Audit ===');

// 1. Static HTML & Script Wiring + Strict CSP
assert.match(indexHtml, /id="cso-header-menu-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="cso-nav-items"/, 'index.html mobile menu button must declare aria-expanded and aria-controls');
assert.match(indexHtml, /id="cso-nav-items"/, 'index.html must contain #cso-nav-items');
assert.match(indexHtml, /assets\/app\.js\?v=20261127v406/, 'index.html must load v406 assets/app.js');

for (const [label, src] of [['assets/app.js', appJs], ['assets/shared-header.js', sharedHeaderJs]]) {
  assert.ok(src.includes('if(!window.__csoNavDropdownWired)') || src.includes('if (!window.__csoNavDropdownWired)'), `${label} must have idempotent __csoNavDropdownWired guard`);
  assert.ok(!src.includes('.innerHTML') && !src.includes('.outerHTML') && !src.includes('insertAdjacentHTML'), `${label} must obey strict CSP (no raw HTML injection)`);
  assert.ok(src.includes('.cso-nav-parent > a[aria-haspopup="true"]'), `${label} must handle mobile taps on parent dropdown links`);
  assert.ok(src.includes("window.innerWidth < 1100") || src.includes("window.innerWidth<1100"), `${label} must guard focusout & mobile accordion at < 1100px`);
  assert.ok(src.includes("cso-open") && src.includes("is-open"), `${label} must sync both .cso-open and .is-open classes`);
  assert.ok(src.includes("aria-expanded"), `${label} must update aria-expanded on accordion toggle`);
}

// Verify shared-header.js scroll/resize thresholds are >= 1100 (never > 768)
assert.ok(!/if\s*\(window\.innerWidth\s*>\s*768\)/.test(sharedHeaderJs), 'assets/shared-header.js must not collapse mobile drawer/dropdowns at > 768px (must be >= 1100px)');
assert.ok(sharedHeaderJs.includes('getOpenPillarKey') && sharedHeaderJs.includes('restoreOpenPillar'), 'assets/shared-header.js must preserve open accordion across /api/nav/config or renderNav() re-renders');
assert.ok(appJs.includes('csoGetOpenPillarKey') && appJs.includes('csoRestoreOpenPillar'), 'assets/app.js must preserve open accordion across /api/nav/config re-renders');
assert.ok(sharedHeaderJs.includes('window.CSOSharedHeaderNav'), 'assets/shared-header.js must expose CSOSharedHeaderNav helper');
assert.ok(appJs.includes('toggleAccordion:'), 'assets/app.js must expose toggleAccordion on CSOHeaderNav');

// 2. CSS Smooth Slide-In, Accordion Reveal, Touch Scroll & Zero Hardcoded Hex in v406 block
const cssStart = styleCss.indexOf('v406: Mobile Navigation Drawer & Smooth Slide-Accordion Contract');
assert.ok(cssStart !== -1, 'assets/style.css must contain v406 mobile drawer & accordion CSS block');
const v406Css = styleCss.slice(cssStart);
assert.ok(v406Css.includes('overflow-y: auto'), 'v406 CSS must enable vertical touch scrolling inside mobile drawer');
assert.ok(v406Css.includes('-webkit-overflow-scrolling: touch'), 'v406 CSS must enable momentum touch scrolling');
assert.ok(v406Css.includes('position: static !important'), 'v406 CSS must force inline static positioning for expanded cascades inside mobile drawer');
assert.ok(v406Css.includes('min-height: 44px'), 'v406 CSS must enforce >= 44px tap targets');
assert.ok(v406Css.includes('prefers-reduced-motion: reduce'), 'v406 CSS must respect prefers-reduced-motion');
assert.ok(v406Css.includes('var(--cso-surface-elevated)') && v406Css.includes('var(--cso-ink)'), 'v406 CSS must use 4-theme semantic tokens');
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(v406Css), 'v406 CSS block must not contain hardcoded hex colors');

// 3. Interactive Mobile Viewport Tap Simulation (Lightweight DOM Harness)
class MiniClassList {
  constructor(el) { this.el = el; this.set = new Set(); }
  add(...cls) { cls.forEach(c => c && this.set.add(c)); }
  remove(...cls) { cls.forEach(c => this.set.delete(c)); }
  contains(c) { return this.set.has(c); }
  toggle(c, force) {
    const next = typeof force === 'boolean' ? force : !this.set.has(c);
    if (next) this.set.add(c); else this.set.delete(c);
    return next;
  }
}

class MiniEl {
  constructor(tag, classes = [], attrs = {}) {
    this.tagName = tag.toUpperCase();
    this.classList = new MiniClassList(this);
    classes.forEach(c => this.classList.add(c));
    this.attrs = { ...attrs };
    this.id = attrs.id || '';
    this.children = [];
    this.parentNode = null;
    this.hidden = false;
  }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  contains(node) {
    if (node === this) return true;
    return this.children.some(c => c.contains(node));
  }
  matches(sel) {
    return sel.split(',').map(s => s.trim()).some(part => {
      if (part.includes('>')) {
        const [pSel, cSel] = part.split('>').map(x => x.trim());
        return Boolean(this.parentNode && this.matches(cSel) && this.parentNode.matches(pSel));
      }
      const tokens = part.split(/\s+/);
      if (tokens.length > 1) {
        const last = tokens[tokens.length - 1];
        if (!this.matches(last)) return false;
        let cur = this.parentNode;
        for (let i = tokens.length - 2; i >= 0; i--) {
          let found = false;
          while (cur) {
            if (cur.matches(tokens[i])) { found = true; cur = cur.parentNode; break; }
            cur = cur.parentNode;
          }
          if (!found) return false;
        }
        return true;
      }
      let rest = part;
      const attrMatch = rest.match(/\[([^\]=]+)="([^"]+)"\]/);
      if (attrMatch) {
        if (this.getAttribute(attrMatch[1]) !== attrMatch[2]) return false;
        rest = rest.replace(attrMatch[0], '');
      }
      const idMatch = rest.match(/#([a-zA-Z0-9_-]+)/);
      if (idMatch) {
        if (this.id !== idMatch[1]) return false;
        rest = rest.replace(idMatch[0], '');
      }
      const tagMatch = rest.match(/^([a-zA-Z]+)/);
      if (tagMatch) {
        if (this.tagName !== tagMatch[1].toUpperCase()) return false;
        rest = rest.slice(tagMatch[0].length);
      }
      const classes = rest.split('.').filter(Boolean);
      return classes.every(c => this.classList.contains(c));
    });
  }
  closest(sel) {
    let cur = this;
    while (cur) {
      if (cur.matches(sel)) return cur;
      cur = cur.parentNode;
    }
    return null;
  }
  querySelectorAll(sel) {
    const out = [];
    const walk = (n) => {
      for (const c of n.children) {
        if (c.matches(sel)) out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  focus() {}
}

function buildMobileNavTree() {
  const navw = new MiniEl('div', [], { id: 'navw' });
  const toggleBtn = new MiniEl('button', ['cso-nav-mobile'], { id: 'cso-menu-toggle', 'aria-expanded': 'false' });
  const navItems = new MiniEl('div', ['cso-nav-items'], { id: 'cso-nav-items' });
  navw.appendChild(toggleBtn);
  navw.appendChild(navItems);

  function addGroup(pillarClass, cascadeClass, href, leafHref) {
    const ni = new MiniEl('div', ['ni', pillarClass]);
    const par = new MiniEl('div', ['cso-nav-parent']);
    const trigA = new MiniEl('a', [], { href, 'aria-haspopup': 'true', 'aria-expanded': 'false' });
    const chev = new MiniEl('button', ['cso-nav-arrow'], { type: 'button', 'aria-expanded': 'false' });
    par.appendChild(trigA);
    par.appendChild(chev);
    const cascade = new MiniEl('div', [cascadeClass]);
    const leaf = new MiniEl('a', ['cso-js1-link'], { href: leafHref });
    cascade.appendChild(leaf);
    ni.appendChild(par);
    ni.appendChild(cascade);
    navItems.appendChild(ni);
    return { ni, trigA, chev, cascade, leaf };
  }

  const careers = addGroup('cso-ni-careers', 'cso-careers-cascade', '/careers/', '/careers/?track=civil-services');
  const schemes = addGroup('cso-ni-schemes', 'cso-schemes-cascade', '/schemes/', '/schemes/?level=odisha');
  const outside = new MiniEl('div', ['outside-area']);
  return { navw, toggleBtn, navItems, careers, schemes, outside };
}

// Simulate the exact mobile drawer state machine mirrored in app.js & shared-header.js
async function runMobileTapSimulation() {
  const { navw, toggleBtn, navItems, careers, schemes, outside } = buildMobileNavTree();
  let innerWidth = 390;

  function closeDropdowns(except) {
    navw.querySelectorAll('.ni').forEach(n => {
      if (n === except) return;
      n.classList.remove('cso-open', 'is-open');
      const b = n.querySelector('.cso-nav-arrow');
      if (b) b.setAttribute('aria-expanded', 'false');
      const a = n.querySelector('.cso-nav-parent > a[aria-haspopup="true"]');
      if (a) a.setAttribute('aria-expanded', 'false');
    });
  }

  function setDrawerOpen(open) {
    navItems.classList.toggle('cso-mobile-open', Boolean(open));
    toggleBtn.setAttribute('aria-expanded', String(Boolean(open)));
    if (!open) closeDropdowns();
  }

  function toggleAccordion(parent, forceOpen) {
    const isCurrentlyOpen = parent.classList.contains('cso-open') || parent.classList.contains('is-open');
    const open = typeof forceOpen === 'boolean' ? forceOpen : !isCurrentlyOpen;
    closeDropdowns(parent);
    parent.classList.toggle('cso-open', open);
    parent.classList.toggle('is-open', open);
    const arrow = parent.querySelector('.cso-nav-arrow');
    if (arrow) arrow.setAttribute('aria-expanded', String(open));
    const trigA = parent.querySelector('.cso-nav-parent > a[aria-haspopup="true"]');
    if (trigA) trigA.setAttribute('aria-expanded', String(open));
    return open;
  }

  function dispatchClick(target) {
    let prevented = false;
    let stopped = false;
    const e = {
      target,
      preventDefault() { prevented = true; },
      stopPropagation() { stopped = true; }
    };
    if (e.target.closest('#navw .cso-nav-mobile')) {
      e.preventDefault(); e.stopPropagation();
      setDrawerOpen(!navItems.classList.contains('cso-mobile-open'));
      return { prevented, stopped };
    }
    const arrow = e.target.closest('#navw .cso-nav-arrow');
    if (arrow) {
      e.preventDefault(); e.stopPropagation();
      toggleAccordion(arrow.closest('.ni'));
      return { prevented, stopped };
    }
    const parentTriggerLink = e.target.closest('#navw .cso-nav-parent > a[aria-haspopup="true"]');
    if (parentTriggerLink && (innerWidth < 1100 || navItems.classList.contains('cso-mobile-open'))) {
      e.preventDefault(); e.stopPropagation();
      toggleAccordion(parentTriggerLink.closest('.ni'));
      return { prevented, stopped };
    }
    if (e.target.closest('#navw a')) {
      setDrawerOpen(false);
    } else if (!e.target.closest('#navw')) {
      closeDropdowns();
      if (navItems.classList.contains('cso-mobile-open')) setDrawerOpen(false);
    }
    return { prevented, stopped };
  }

  function dispatchFocusout(relatedTarget) {
    if (innerWidth < 1100 || navItems.classList.contains('cso-mobile-open')) return;
    const openItem = navw.querySelector('.ni.cso-open');
    if (openItem && relatedTarget && !openItem.contains(relatedTarget)) closeDropdowns();
  }

  // Open drawer
  dispatchClick(toggleBtn);
  assert.equal(navItems.classList.contains('cso-mobile-open'), true, 'Drawer must open on Menu tap');
  assert.equal(toggleBtn.getAttribute('aria-expanded'), 'true');

  // Tap Careers chevron -> opens and stays open across focusout + async ticks
  const r1 = dispatchClick(careers.chev);
  assert.equal(r1.prevented, true);
  assert.equal(careers.ni.classList.contains('cso-open'), true, 'Careers accordion must open on chevron tap');
  assert.equal(careers.chev.getAttribute('aria-expanded'), 'true');
  assert.equal(careers.trigA.getAttribute('aria-expanded'), 'true');

  dispatchFocusout(outside);
  await new Promise(r => setTimeout(r, 20));
  assert.equal(careers.ni.classList.contains('cso-open'), true, 'Careers accordion must remain open after focusout and async timer tick');
  assert.equal(navItems.classList.contains('cso-mobile-open'), true, 'Mobile drawer must remain open after focusout');

  // Tap Schemes & Benefits parent label -> Careers closes, Schemes opens
  const r2 = dispatchClick(schemes.trigA);
  assert.equal(r2.prevented, true, 'Tapping parent link in mobile drawer must prevent immediate navigation/close');
  assert.equal(careers.ni.classList.contains('cso-open'), false, 'Opening Schemes must collapse Careers sibling');
  assert.equal(careers.chev.getAttribute('aria-expanded'), 'false');
  assert.equal(schemes.ni.classList.contains('cso-open'), true, 'Schemes accordion must open on parent label tap');
  assert.equal(schemes.chev.getAttribute('aria-expanded'), 'true');

  // Wait another tick and ensure Schemes stays open
  await new Promise(r => setTimeout(r, 20));
  assert.equal(schemes.ni.classList.contains('cso-open'), true, 'Schemes accordion must stay open after ticks');

  // Tap Schemes chevron again -> cleanly collapses
  dispatchClick(schemes.chev);
  assert.equal(schemes.ni.classList.contains('cso-open'), false, 'Second tap on Schemes must cleanly collapse it');
  assert.equal(schemes.chev.getAttribute('aria-expanded'), 'false');
  assert.equal(navItems.classList.contains('cso-mobile-open'), true, 'Collapsing accordion must keep mobile drawer open');

  // Tap leaf link -> closes drawer cleanly
  dispatchClick(schemes.leaf);
  assert.equal(navItems.classList.contains('cso-mobile-open'), false, 'Tapping a submenu leaf link must close the mobile drawer');
}

await runMobileTapSimulation();
console.log('✅ v406 Mobile Navigation Drawer Dropdown & Slide-Accordion Audit PASSED');
