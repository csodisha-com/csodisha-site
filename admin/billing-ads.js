/**
 * CS Odisha Admin Studio — Folder #10 Sub-Tab #3: Payments & Ads Workspace (v312)
 * Real D1-backed Ad Slot & Sponsorship Manager, Membership Plans, Promo Coupons & Payment Orders Ledger.
 * Zero mock data, zero fake orders/impressions, 100% strict CSP (DOM APIs only).
 */
(function (window, document) {
  'use strict';

  var SLOT_PRESETS = [
    ['site_banner', 'Site-Wide Sponsor Banner (site_banner)'],
    ['home_mid_banner', 'Homepage Mid Banner (home_mid_banner)'],
    ['jobs_top_sponsor', 'Jobs Explorer Sponsor (jobs_top_sponsor)'],
    ['careers_top_sponsor', 'Careers Explorer Sponsor (careers_top_sponsor)'],
    ['schemes_top_sponsor', 'Schemes Explorer Sponsor (schemes_top_sponsor)'],
    ['study_top_sponsor', 'Study Library Sponsor (study_top_sponsor)'],
    ['mock_tests_banner', 'Mock Tests Sponsor (mock_tests_banner)'],
    ['community_top_sponsor', 'Community Sponsor (community_top_sponsor)']
  ];

  var B = {
    host: null,
    subTab: 'ads',
    overview: null,
    ads: [],
    editingAd: null,
    plans: [],
    editingPlan: null,
    coupons: [],
    editingCoupon: null,
    orders: [],
    orderFilter: '',
    error: ''
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

  function api(path, method, body) {
    var opts = {
      method: method || 'GET',
      credentials: 'same-origin',
      headers: { 'X-CSO-CSRF': '1' }
    };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch('/api/admin/billing-ads/' + path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error((d && d.error) || ('HTTP ' + r.status));
        return d;
      });
    });
  }

  function loadAll() {
    B.error = '';
    var ordQs = B.orderFilter ? ('orders?status=' + encodeURIComponent(B.orderFilter)) : 'orders';
    return Promise.all([
      api('overview', 'GET'),
      api('ads', 'GET'),
      api('plans', 'GET'),
      api('coupons', 'GET'),
      api(ordQs, 'GET')
    ]).then(function (res) {
      B.overview = res[0];
      B.ads = res[1].items || [];
      B.plans = res[2].items || [];
      B.coupons = res[3].items || [];
      B.orders = res[4].items || [];
      render();
    }).catch(function (err) {
      B.error = err.message;
      render();
    });
  }

  function field(lblText, node) {
    var w = el('div', 'so-field');
    var l = el('label', 'so-label', lblText);
    if (node.id) l.setAttribute('for', node.id);
    w.append(l, node);
    return w;
  }

  function renderReadinessCard(parent) {
    var ov = B.overview || { stats: {}, gateway_readiness: {} };
    var st = ov.stats || {};
    var gw = ov.gateway_readiness || {};

    var card = el('section', 'so-card');
    var head = el('div', 'so-card-head');
    var left = el('div');
    left.appendChild(el('h2', 'so-title', 'Payments & Ads Monetization Studio (Live D1)'));
    left.appendChild(el('p', 'so-sub', 'Zero synthetic revenue or fake impressions. All counters, plans, coupons, and payment orders come strictly from Cloudflare D1 and environment secrets.'));
    head.appendChild(left);

    var gwWrap = el('div', 'so-actions');
    gwWrap.appendChild(el('span', 'so-badge ' + (gw.razorpay_ready ? 'so-badge--on' : 'so-badge--warn'), gw.razorpay_ready ? 'Razorpay Keys: Ready' : 'Razorpay Keys: Not Configured'));
    gwWrap.appendChild(el('span', 'so-badge ' + (gw.upi_ready ? 'so-badge--on' : 'so-badge--off'), gw.upi_ready ? 'UPI VPA: Ready' : 'UPI VPA: Not Configured'));
    head.appendChild(gwWrap);
    card.appendChild(head);

    var ctr = st.total_impressions > 0 ? ((st.total_clicks / st.total_impressions) * 100).toFixed(2) + '%' : '0.00%';
    var kpis = el('div', 'so-kpi-grid');
    [
      ['Active Ad Slots', (st.ads_active || 0) + ' / ' + (st.ads_total || 0)],
      ['Real Ad Impressions', String(st.total_impressions || 0)],
      ['Real Outbound Clicks (CTR)', (st.total_clicks || 0) + ' (' + ctr + ')'],
      ['Active Plans', (st.plans_active || 0) + ' / ' + (st.plans_total || 0)],
      ['Promo Coupons Used', String(st.coupons_used || 0)],
      ['Paid Revenue (INR)', '₹' + Number(st.paid_revenue_inr || 0).toLocaleString('en-IN') + ' (' + (st.orders_paid || 0) + ' orders)']
    ].forEach(function (pair) {
      var box = el('div', 'so-kpi');
      box.appendChild(el('span', 'so-kpi-lbl', pair[0]));
      box.appendChild(el('strong', 'so-kpi-val', pair[1]));
      kpis.appendChild(box);
    });
    card.appendChild(kpis);

    var subBar = el('div', 'so-subtabs');
    subBar.setAttribute('role', 'tablist');
    [
      ['ads', '📢 Ad Slots & Sponsorships (' + B.ads.length + ')'],
      ['plans', '💎 Membership Plans (' + B.plans.length + ')'],
      ['coupons', '🏷️ Promo Coupons (' + B.coupons.length + ')'],
      ['orders', '🧾 Payment Orders Ledger (' + B.orders.length + ')']
    ].forEach(function (t) {
      var btn = el('button', 'so-btn' + (B.subTab === t[0] ? ' so-btn--primary' : ''), t[1]);
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(B.subTab === t[0]));
      btn.addEventListener('click', function () {
        B.subTab = t[0];
        render();
      });
      subBar.appendChild(btn);
    });
    card.appendChild(subBar);
    parent.appendChild(card);
  }

  function renderAdsSection(parent) {
    var ed = B.editingAd || {
      slot_key: 'site_banner',
      title: '',
      image_url: '',
      target_url: '',
      badge_text: 'Sponsored',
      starts_at: '',
      ends_at: '',
      active: 1
    };

    var card = el('section', 'so-card');
    card.appendChild(el('h3', 'so-title', ed.id ? 'Edit Ad / Sponsorship Slot' : 'Create Live Ad / Sponsorship Slot'));
    card.appendChild(el('p', 'so-sub', 'Active slots render on public pages with rel="sponsored noopener noreferrer" and track real impressions & clicks via /api/public/ads/track.'));

    var form = el('form', 'so-form-row');
    form.noValidate = true;

    var selSlot = el('select', 'so-select');
    selSlot.id = 'baAdSlotKey';
    SLOT_PRESETS.forEach(function (p) {
      var op = el('option', '', p[1]);
      op.value = p[0];
      selSlot.appendChild(op);
    });
    if (ed.slot_key && !SLOT_PRESETS.some(function (p) { return p[0] === ed.slot_key; })) {
      var customOp = el('option', '', ed.slot_key);
      customOp.value = ed.slot_key;
      selSlot.appendChild(customOp);
    }
    selSlot.value = ed.slot_key || 'site_banner';

    var inTitle = el('input', 'so-input');
    inTitle.id = 'baAdTitle';
    inTitle.placeholder = 'e.g. Odisha Civil Services Scholarship Batch 2026';
    inTitle.value = ed.title || '';

    var inImg = el('input', 'so-input');
    inImg.id = 'baAdImage';
    inImg.placeholder = '/files/images/... (optional banner image)';
    inImg.value = ed.image_url || '';

    var inTarget = el('input', 'so-input');
    inTarget.id = 'baAdTarget';
    inTarget.placeholder = 'https://partner.example.org/...';
    inTarget.value = ed.target_url || '';

    var inBadge = el('input', 'so-input');
    inBadge.id = 'baAdBadge';
    inBadge.placeholder = 'Sponsored';
    inBadge.value = ed.badge_text || 'Sponsored';

    var inStart = el('input', 'so-input');
    inStart.id = 'baAdStart';
    inStart.type = 'date';
    inStart.value = (ed.starts_at || '').slice(0, 10);

    var inEnd = el('input', 'so-input');
    inEnd.id = 'baAdEnd';
    inEnd.type = 'date';
    inEnd.value = (ed.ends_at || '').slice(0, 10);

    var selAct = el('select', 'so-select');
    selAct.id = 'baAdActive';
    var opOn = el('option', '', 'Active (Live on Public Site)'); opOn.value = '1';
    var opOff = el('option', '', 'Paused (Hidden)'); opOff.value = '0';
    selAct.append(opOn, opOff);
    selAct.value = Number(ed.active) === 0 ? '0' : '1';

    form.append(
      field('Placement Slot Key *', selSlot),
      field('Sponsor / Banner Title *', inTitle),
      field('Destination URL (rel="sponsored") *', inTarget),
      field('Banner Image URL (/files/...)', inImg),
      field('Disclosure Badge', inBadge),
      field('Start Date (optional)', inStart),
      field('End Date (optional)', inEnd),
      field('Status', selAct)
    );

    var acts = el('div', 'so-actions');
    if (window.CSOFilePicker && typeof window.CSOFilePicker.open === 'function') {
      var pickBtn = el('button', 'so-btn', '📁 Pick Banner from R2');
      pickBtn.type = 'button';
      pickBtn.addEventListener('click', function () {
        window.CSOFilePicker.open({
          acceptKind: 'image',
          onSelect: function (file) {
            if (file && file.clean_url) {
              inImg.value = file.clean_url;
              toast('Attached R2 banner ' + file.clean_url, 'ok');
            }
          }
        });
      });
      acts.appendChild(pickBtn);
    }

    var saveBtn = el('button', 'so-btn so-btn--primary', ed.id ? 'Update Ad Slot' : '+ Publish Ad Slot');
    saveBtn.type = 'submit';
    acts.appendChild(saveBtn);

    if (ed.id) {
      var cancelBtn = el('button', 'so-btn', 'Cancel Edit');
      cancelBtn.type = 'button';
      cancelBtn.addEventListener('click', function () { B.editingAd = null; render(); });
      acts.appendChild(cancelBtn);
    }
    form.appendChild(acts);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var payload = {
        slot_key: selSlot.value,
        title: inTitle.value.trim(),
        image_url: inImg.value.trim(),
        target_url: inTarget.value.trim(),
        badge_text: inBadge.value.trim() || 'Sponsored',
        starts_at: inStart.value,
        ends_at: inEnd.value,
        active: selAct.value === '1' ? 1 : 0
      };
      var req = ed.id ? api('ads/' + encodeURIComponent(ed.id), 'PUT', payload) : api('ads', 'POST', payload);
      req.then(function () {
        B.editingAd = null;
        toast(ed.id ? 'Ad slot updated live.' : 'Ad slot created live.', 'ok');
        loadAll();
      }).catch(function (err) { toast(err.message, 'crimson'); });
    });

    card.appendChild(form);

    if (!B.ads.length) {
      card.appendChild(el('div', 'so-empty', 'No ad slots configured yet (0). Public pages remain 100% ad-free until you publish an active slot above.'));
    } else {
      var wrap = el('div', 'so-table-wrap');
      var tbl = el('table', 'so-table');
      var thead = el('thead');
      var hr = el('tr');
      ['Slot & Banner', 'Window', 'Status', 'Real Impressions', 'Real Clicks', 'Actions'].forEach(function (h) { hr.appendChild(el('th', '', h)); });
      thead.appendChild(hr);
      tbl.appendChild(thead);

      var tbody = el('tbody');
      B.ads.forEach(function (ad) {
        var tr = el('tr');
        var td1 = el('td');
        td1.appendChild(el('strong', '', ad.title));
        td1.appendChild(el('div', 'so-sub so-mono', ad.slot_key + ' → ' + ad.target_url));
        tr.appendChild(td1);
        tr.appendChild(el('td', '', (ad.starts_at || 'Now') + ' → ' + (ad.ends_at || 'Always')));
        var tdSt = el('td');
        tdSt.appendChild(el('span', 'so-badge ' + (Number(ad.active) ? 'so-badge--on' : 'so-badge--off'), Number(ad.active) ? 'ACTIVE' : 'PAUSED'));
        tr.appendChild(tdSt);
        tr.appendChild(el('td', 'so-mono', String(ad.impressions || 0)));
        tr.appendChild(el('td', 'so-mono', String(ad.clicks || 0)));

        var tdAct = el('td');
        var rowActs = el('div', 'so-actions');
        var tog = el('button', 'so-btn', Number(ad.active) ? 'Pause' : 'Activate');
        tog.type = 'button';
        tog.addEventListener('click', function () {
          api('ads/' + encodeURIComponent(ad.id), 'PUT', { active: Number(ad.active) ? 0 : 1 }).then(loadAll).catch(function (e) { toast(e.message, 'crimson'); });
        });
        var edB = el('button', 'so-btn', 'Edit');
        edB.type = 'button';
        edB.addEventListener('click', function () { B.editingAd = Object.assign({}, ad); render(); });
        var delB = el('button', 'so-btn so-btn--danger', 'Delete');
        delB.type = 'button';
        delB.addEventListener('click', function () {
          if (!window.confirm('Delete ad slot "' + ad.title + '"?')) return;
          api('ads/' + encodeURIComponent(ad.id), 'DELETE').then(loadAll).catch(function (e) { toast(e.message, 'crimson'); });
        });
        rowActs.append(tog, edB, delB);
        tdAct.appendChild(rowActs);
        tr.appendChild(tdAct);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
      card.appendChild(wrap);
    }
    parent.appendChild(card);
  }

  function renderPlansSection(parent) {
    var ed = B.editingPlan || { name: '', slug: '', price_inr: 199, validity_days: 90, features: [], active: 1 };
    var card = el('section', 'so-card');
    card.appendChild(el('h3', 'so-title', ed.id ? 'Edit Membership Plan' : 'Create Membership Plan'));

    var form = el('form', 'so-form-row');
    form.noValidate = true;

    var inName = el('input', 'so-input'); inName.id = 'baPlanName'; inName.placeholder = 'e.g. Odisha Aspirant Pro (Quarterly)'; inName.value = ed.name || '';
    var inSlug = el('input', 'so-input'); inSlug.id = 'baPlanSlug'; inSlug.placeholder = 'aspirant-pro-90d'; inSlug.value = ed.slug || '';
    var inPrice = el('input', 'so-input'); inPrice.id = 'baPlanPrice'; inPrice.type = 'number'; inPrice.min = '0'; inPrice.value = String(ed.price_inr ?? 199);
    var inDays = el('input', 'so-input'); inDays.id = 'baPlanDays'; inDays.type = 'number'; inDays.min = '1'; inDays.value = String(ed.validity_days ?? 90);
    var taFeat = el('textarea', 'so-textarea'); taFeat.id = 'baPlanFeatures'; taFeat.placeholder = 'One feature per line…';
    taFeat.value = Array.isArray(ed.features) ? ed.features.join('\n') : '';

    form.append(
      field('Plan Name *', inName),
      field('Slug', inSlug),
      field('Price (INR ₹)', inPrice),
      field('Validity (Days)', inDays),
      field('Included Features (newline-separated)', taFeat)
    );

    var acts = el('div', 'so-actions');
    var saveBtn = el('button', 'so-btn so-btn--primary', ed.id ? 'Update Plan' : '+ Save Plan');
    saveBtn.type = 'submit';
    acts.appendChild(saveBtn);
    if (ed.id) {
      var cancelBtn = el('button', 'so-btn', 'Cancel');
      cancelBtn.type = 'button';
      cancelBtn.addEventListener('click', function () { B.editingPlan = null; render(); });
      acts.appendChild(cancelBtn);
    }
    form.appendChild(acts);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var payload = {
        name: inName.value.trim(),
        slug: inSlug.value.trim() || undefined,
        price_inr: Number(inPrice.value) || 0,
        validity_days: Number(inDays.value) || 30,
        features: taFeat.value,
        active: Number(ed.active) === 0 ? 0 : 1
      };
      var req = ed.id ? api('plans/' + encodeURIComponent(ed.id), 'PUT', payload) : api('plans', 'POST', payload);
      req.then(function () {
        B.editingPlan = null;
        toast(ed.id ? 'Plan updated.' : 'Plan created.', 'ok');
        loadAll();
      }).catch(function (err) { toast(err.message, 'crimson'); });
    });
    card.appendChild(form);

    if (!B.plans.length) {
      card.appendChild(el('div', 'so-empty', 'No monetization plans configured yet (0).'));
    } else {
      var wrap = el('div', 'so-table-wrap');
      var tbl = el('table', 'so-table');
      var hr = el('tr');
      ['Plan', 'Price', 'Validity', 'Status', 'Actions'].forEach(function (h) { hr.appendChild(el('th', '', h)); });
      var thead = el('thead'); thead.appendChild(hr); tbl.appendChild(thead);
      var tbody = el('tbody');
      B.plans.forEach(function (p) {
        var tr = el('tr');
        var td1 = el('td');
        td1.appendChild(el('strong', '', p.name));
        td1.appendChild(el('div', 'so-sub so-mono', p.slug + (p.features && p.features.length ? (' · ' + p.features.length + ' features') : '')));
        tr.appendChild(td1);
        tr.appendChild(el('td', 'so-mono', '₹' + Number(p.price_inr || 0).toLocaleString('en-IN')));
        tr.appendChild(el('td', '', (p.validity_days || 30) + ' days'));
        var tdSt = el('td');
        tdSt.appendChild(el('span', 'so-badge ' + (Number(p.active) ? 'so-badge--on' : 'so-badge--off'), Number(p.active) ? 'ACTIVE' : 'INACTIVE'));
        tr.appendChild(tdSt);
        var tdA = el('td');
        var aRow = el('div', 'so-actions');
        var tog = el('button', 'so-btn', Number(p.active) ? 'Deactivate' : 'Activate');
        tog.type = 'button';
        tog.addEventListener('click', function () {
          api('plans/' + encodeURIComponent(p.id), 'PUT', { active: Number(p.active) ? 0 : 1 }).then(loadAll).catch(function (e) { toast(e.message, 'crimson'); });
        });
        var edB = el('button', 'so-btn', 'Edit');
        edB.type = 'button';
        edB.addEventListener('click', function () { B.editingPlan = Object.assign({}, p); render(); });
        var delB = el('button', 'so-btn so-btn--danger', 'Delete');
        delB.type = 'button';
        delB.addEventListener('click', function () {
          if (!window.confirm('Delete plan "' + p.name + '"?')) return;
          api('plans/' + encodeURIComponent(p.id), 'DELETE').then(loadAll).catch(function (e) { toast(e.message, 'crimson'); });
        });
        aRow.append(tog, edB, delB);
        tdA.appendChild(aRow);
        tr.appendChild(tdA);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
      card.appendChild(wrap);
    }
    parent.appendChild(card);
  }

  function renderCouponsSection(parent) {
    var ed = B.editingCoupon || { code: '', discount_type: 'percent', discount_value: 20, max_uses: 100, expires_at: '', active: 1 };
    var card = el('section', 'so-card');
    card.appendChild(el('h3', 'so-title', ed.id ? 'Edit Promo Coupon' : 'Create Promo Coupon'));

    var form = el('form', 'so-form-row');
    form.noValidate = true;

    var inCode = el('input', 'so-input so-mono'); inCode.id = 'baCpnCode'; inCode.placeholder = 'ODISHA20'; inCode.value = ed.code || '';
    if (ed.id) inCode.disabled = true;
    var selType = el('select', 'so-select'); selType.id = 'baCpnType';
    var oPct = el('option', '', 'Percentage (%)'); oPct.value = 'percent';
    var oFlat = el('option', '', 'Flat Amount (₹ INR)'); oFlat.value = 'flat';
    selType.append(oPct, oFlat);
    selType.value = ed.discount_type || 'percent';
    var inVal = el('input', 'so-input'); inVal.id = 'baCpnVal'; inVal.type = 'number'; inVal.min = '1'; inVal.value = String(ed.discount_value ?? 20);
    var inMax = el('input', 'so-input'); inMax.id = 'baCpnMax'; inMax.type = 'number'; inMax.min = '0'; inMax.value = String(ed.max_uses ?? 100);
    var inExp = el('input', 'so-input'); inExp.id = 'baCpnExp'; inExp.type = 'date'; inExp.value = (ed.expires_at || '').slice(0, 10);

    form.append(
      field('Coupon Code *', inCode),
      field('Discount Type', selType),
      field('Discount Value *', inVal),
      field('Max Uses (0 = Unlimited)', inMax),
      field('Expiry Date (optional)', inExp)
    );

    var acts = el('div', 'so-actions');
    var sv = el('button', 'so-btn so-btn--primary', ed.id ? 'Update Coupon' : '+ Create Coupon');
    sv.type = 'submit';
    acts.appendChild(sv);
    if (ed.id) {
      var cb = el('button', 'so-btn', 'Cancel');
      cb.type = 'button';
      cb.addEventListener('click', function () { B.editingCoupon = null; render(); });
      acts.appendChild(cb);
    }
    form.appendChild(acts);

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var payload = {
        code: inCode.value.trim().toUpperCase(),
        discount_type: selType.value,
        discount_value: Number(inVal.value),
        max_uses: Number(inMax.value) || 0,
        expires_at: inExp.value
      };
      var req = ed.id ? api('coupons/' + encodeURIComponent(ed.id), 'PUT', payload) : api('coupons', 'POST', payload);
      req.then(function () {
        B.editingCoupon = null;
        toast(ed.id ? 'Coupon updated.' : 'Coupon created.', 'ok');
        loadAll();
      }).catch(function (err) { toast(err.message, 'crimson'); });
    });
    card.appendChild(form);

    if (!B.coupons.length) {
      card.appendChild(el('div', 'so-empty', 'No promo coupons created yet (0).'));
    } else {
      var wrap = el('div', 'so-table-wrap');
      var tbl = el('table', 'so-table');
      var hr = el('tr');
      ['Code', 'Discount', 'Redemptions', 'Expires', 'Status', 'Actions'].forEach(function (h) { hr.appendChild(el('th', '', h)); });
      var thead = el('thead'); thead.appendChild(hr); tbl.appendChild(thead);
      var tbody = el('tbody');
      B.coupons.forEach(function (c) {
        var tr = el('tr');
        tr.appendChild(el('td', 'so-mono', c.code));
        tr.appendChild(el('td', '', c.discount_type === 'flat' ? ('₹' + c.discount_value + ' OFF') : (c.discount_value + '% OFF')));
        tr.appendChild(el('td', 'so-mono', (c.used_count || 0) + ' / ' + (c.max_uses ? c.max_uses : '∞')));
        tr.appendChild(el('td', '', c.expires_at || 'No Expiry'));
        var tdSt = el('td');
        tdSt.appendChild(el('span', 'so-badge ' + (Number(c.active) ? 'so-badge--on' : 'so-badge--off'), Number(c.active) ? 'ACTIVE' : 'PAUSED'));
        tr.appendChild(tdSt);
        var tdA = el('td');
        var aRow = el('div', 'so-actions');
        var tog = el('button', 'so-btn', Number(c.active) ? 'Pause' : 'Activate');
        tog.type = 'button';
        tog.addEventListener('click', function () {
          api('coupons/' + encodeURIComponent(c.id), 'PUT', { active: Number(c.active) ? 0 : 1 }).then(loadAll).catch(function (e) { toast(e.message, 'crimson'); });
        });
        var delB = el('button', 'so-btn so-btn--danger', 'Delete');
        delB.type = 'button';
        delB.addEventListener('click', function () {
          if (!window.confirm('Delete coupon ' + c.code + '?')) return;
          api('coupons/' + encodeURIComponent(c.id), 'DELETE').then(loadAll).catch(function (e) { toast(e.message, 'crimson'); });
        });
        aRow.append(tog, delB);
        tdA.appendChild(aRow);
        tr.appendChild(tdA);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
      card.appendChild(wrap);
    }
    parent.appendChild(card);
  }

  function renderOrdersSection(parent) {
    var card = el('section', 'so-card');
    var head = el('div', 'so-card-head');
    var left = el('div');
    left.appendChild(el('h3', 'so-title', 'Real Payment Orders Ledger (' + B.orders.length + ')'));
    left.appendChild(el('p', 'so-sub', 'Strictly live rows from D1 payment_orders. Configure RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET in Cloudflare Workers secrets to activate online checkout.'));
    head.appendChild(left);

    var selSt = el('select', 'so-select');
    selSt.setAttribute('aria-label', 'Filter payment orders by status');
    [['', 'All Statuses'], ['created', 'Created'], ['pending', 'Pending'], ['paid', 'Paid'], ['failed', 'Failed'], ['refunded', 'Refunded']].forEach(function (pair) {
      var op = el('option', '', pair[1]); op.value = pair[0]; selSt.appendChild(op);
    });
    selSt.value = B.orderFilter;
    selSt.addEventListener('change', function () {
      B.orderFilter = selSt.value;
      loadAll();
    });
    head.appendChild(selSt);
    card.appendChild(head);

    if (!B.orders.length) {
      card.appendChild(el('div', 'so-empty', 'No payment orders recorded yet (0). Real Razorpay / UPI candidate transactions will appear here automatically.'));
    } else {
      var wrap = el('div', 'so-table-wrap');
      var tbl = el('table', 'so-table');
      var hr = el('tr');
      ['Order Ref', 'Candidate', 'Plan & Coupon', 'Amount', 'Gateway', 'Status', 'Created'].forEach(function (h) { hr.appendChild(el('th', '', h)); });
      var thead = el('thead'); thead.appendChild(hr); tbl.appendChild(thead);
      var tbody = el('tbody');
      B.orders.forEach(function (o) {
        var tr = el('tr');
        tr.appendChild(el('td', 'so-mono', o.order_ref));
        tr.appendChild(el('td', 'so-mono', o.candidate_id || '—'));
        tr.appendChild(el('td', '', (o.plan_name || o.plan_id || '—') + (o.coupon_code ? (' · ' + o.coupon_code) : '')));
        tr.appendChild(el('td', 'so-mono', '₹' + Number(o.amount_inr || 0).toLocaleString('en-IN')));
        tr.appendChild(el('td', 'so-mono', (o.gateway || 'razorpay') + (o.gateway_payment_id ? (' (' + o.gateway_payment_id + ')') : '')));
        var tdSt = el('td');
        var cls = o.status === 'paid' ? 'so-badge--on' : (o.status === 'failed' || o.status === 'refunded' ? 'so-badge--off' : 'so-badge--warn');
        tdSt.appendChild(el('span', 'so-badge ' + cls, String(o.status || 'created').toUpperCase()));
        tr.appendChild(tdSt);
        tr.appendChild(el('td', '', o.created_at || '—'));
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      wrap.appendChild(tbl);
      card.appendChild(wrap);
    }
    parent.appendChild(card);
  }

  function render() {
    if (!B.host) return;
    clear(B.host);
    if (B.error) {
      var ec = el('section', 'so-card');
      ec.appendChild(el('h3', 'so-title', 'Payments & Ads Access Notice'));
      ec.appendChild(el('p', 'so-sub', B.error));
      B.host.appendChild(ec);
      return;
    }
    renderReadinessCard(B.host);
    if (B.subTab === 'ads') renderAdsSection(B.host);
    else if (B.subTab === 'plans') renderPlansSection(B.host);
    else if (B.subTab === 'coupons') renderCouponsSection(B.host);
    else renderOrdersSection(B.host);
  }

  window.CSOBillingAds = {
    render: function (host) {
      B.host = host;
      render();
      loadAll();
    },
    refresh: loadAll
  };
})(window, document);
