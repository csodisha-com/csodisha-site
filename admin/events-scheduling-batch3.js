/* Events & Scheduling Batch 3 (07-09) — Strict CSP: no inline scripts/styles/innerHTML */
(() => {
  'use strict';

  const API = '/api/admin/events';
  const MODULES = {
    'module-es-007': { num: '07', title: 'Offline Workshops & District Meetups' },
    'module-es-008': { num: '08', title: 'Live Webinars & Virtual Counseling Sessions' },
    'module-es-009': { num: '09', title: 'Calendar Sync, ICS Feeds & Push Notification Dispatcher' }
  };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (Array.isArray(text)) {
      text.forEach(ch => {
        if (ch instanceof Node) n.appendChild(ch);
        else if (ch !== undefined && ch !== null) n.appendChild(document.createTextNode(String(ch)));
      });
    } else if (text instanceof Node) {
      n.appendChild(text);
    } else if (text !== undefined && text !== null) {
      n.textContent = String(text);
    }
    return n;
  }

  function btn(label, cls, onClick) {
    const b = el('button', `cso-edu-btn ${cls || ''}`.trim(), label);
    b.type = 'button';
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }

  function toast(msg, kind) {
    if (typeof window.showToast === 'function') { window.showToast(msg, kind || 'info'); return; }
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = el('div', 'cso-toast', msg);
    c.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  async function api(path, method, body) {
    const headers = {};
    if (method && method !== 'GET') {
      headers['X-CSO-CSRF'] = '1';
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(path, {
      method: method || 'GET',
      credentials: 'same-origin',
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data && data.error) || `HTTP ${res.status}`);
    return data;
  }

  function field(labelText, node) {
    const f = el('div', 'cso-edu-field');
    f.append(el('label', 'cso-edu-label', labelText), node);
    return f;
  }

  function textInput(type, value, placeholder) {
    const i = el('input', 'cso-edu-input cso-edu-input-full');
    i.type = type || 'text';
    if (placeholder) i.placeholder = placeholder;
    if (value !== undefined && value !== null) i.value = value;
    return i;
  }

  function selectOf(options, value) {
    const s = el('select', 'cso-edu-select cso-edu-input-full');
    options.forEach(([v, l]) => {
      const o = el('option', '', l);
      o.value = v;
      s.appendChild(o);
    });
    if (value !== undefined && value !== null) s.value = value;
    return s;
  }

  function evtBadge(val, label) {
    const safe = String(val || 'unknown').replace(/[^a-z0-9_-]/gi, '');
    return el('span', `cso-evt-badge is-${safe}`, label || val || '—');
  }

  function openDrawer(title, bodyNodes) {
    const backdrop = el('div', 'cso-edu-drawer-backdrop');
    const drawer = el('div', 'cso-edu-drawer');
    const head = el('div', 'cso-edu-drawer-head');
    head.append(el('h3', '', title), btn('Close', 'cso-edu-btn-ghost', () => backdrop.remove()));
    const body = el('div', 'cso-edu-drawer-body');
    bodyNodes.forEach(n => body.appendChild(n));
    const foot = el('div', 'cso-edu-drawer-foot');
    foot.appendChild(btn('Cancel', '', () => backdrop.remove()));
    drawer.append(head, body, foot);
    backdrop.appendChild(drawer);
    backdrop.addEventListener('click', ev => { if (ev.target === backdrop) backdrop.remove(); });
    document.body.appendChild(backdrop);
    return { backdrop, body, foot };
  }

  function attachRevisions(container, moduleCode, entityId, onRestored) {
    if (!entityId) return;
    const box = el('div', 'cso-edu-rev-list');
    box.appendChild(el('div', 'cso-edu-label', 'Revision History (Rollback)'));
    const list = el('div', 'cso-edu-rev-items');
    box.appendChild(list);
    container.appendChild(box);
    api(`${API}/revisions?module_code=${encodeURIComponent(moduleCode)}&entity_id=${encodeURIComponent(entityId)}`).then(d => {
      const items = d.items || [];
      if (!items.length) { list.appendChild(el('div', 'cso-edu-muted', 'No revisions yet.')); return; }
      items.forEach(r => {
        const row = el('div', 'cso-edu-rev-item');
        row.append(
          el('span', '', `v${r.version_num} · ${r.change_note || 'update'} (${r.created_at || ''})`),
          btn('Rollback', 'cso-edu-btn-sm', async () => {
            try {
              await api(`${API}/revisions/rollback`, 'POST', { revision_id: r.id });
              toast(`Rolled back to v${r.version_num}`, 'success');
              if (onRestored) onRestored();
            } catch (e) { toast(e.message, 'error'); }
          })
        );
        list.appendChild(row);
      });
    }).catch(() => {});
  }

  function buildHeader(modKey, subtitle, extraBtns) {
    const info = MODULES[modKey];
    const bar = el('div', 'cso-edu-header');
    const left = el('div', '');
    left.append(
      el('div', 'cso-edu-kicker', `Events & Scheduling · Module ${info.num} of 9 · IST (Asia/Kolkata)`),
      el('h2', 'cso-edu-title', info.title),
      el('p', 'cso-edu-sub', subtitle)
    );
    const right = el('div', 'cso-edu-actions');
    (extraBtns || []).forEach(b => right.appendChild(b));
    bar.append(left, right);
    return bar;
  }

  function renderKpiStrip(ov) {
    const strip = el('div', 'cso-evt-kpi-strip');
    const s = ov.suite_09 || ov;
    const cards = [
      ['Open District Workshops', s.open_district_workshops ?? 0],
      ['Upcoming / Live Webinars', s.upcoming_live_webinars ?? 0],
      ['Active ICS Feeds', s.active_ics_feeds ?? 0],
      ['Suite 01–09 Active / Pushes', `${s.active_modules || 9}/9 · ${s.total_push_dispatches ?? 0} pushes`]
    ];
    cards.forEach(([lbl, val]) => {
      const c = el('div', 'cso-evt-kpi-card');
      c.append(el('span', 'cso-evt-kpi-label', lbl), el('span', 'cso-evt-kpi-val', String(val)));
      strip.appendChild(c);
    });
    return strip;
  }

  /* ==================== MODULE 07: OFFLINE WORKSHOPS & DISTRICT MEETUPS ==================== */
  async function renderMeetups(root) {
    let curZone = '';
    let curQ = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-es-007', 'Odisha district workshops & seminars across Central, Northern & Southern RDC zones with seat capacity enforcement.', [
        btn('+ Schedule District Meetup', 'cso-edu-btn-primary', () => openMeetupDrawer(null))
      ]));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/meetups?rdc_zone=${encodeURIComponent(curZone)}&q=${encodeURIComponent(curQ)}`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      const stack = el('div', 'cso-evt-filter-stack');
      const zoneTabs = el('div', 'cso-edu-tabs');
      [['', 'All'], ['Central RDC', 'Central RDC'], ['Northern RDC', 'Northern RDC'], ['Southern RDC', 'Southern RDC']].forEach(([v, l]) => {
        zoneTabs.appendChild(btn(l, `cso-edu-tab ${curZone === v ? 'is-active' : ''}`, () => { curZone = v; draw(); }));
      });

      const searchIn = textInput('search', curQ, 'Search district, venue, or meetup title...');
      searchIn.addEventListener('keydown', ev => { if (ev.key === 'Enter') { curQ = searchIn.value.trim(); draw(); } });
      stack.append(zoneTabs, el('div', 'cso-evt-pill-row', [searchIn, btn('Search', 'cso-edu-btn-sm', () => { curQ = searchIn.value.trim(); draw(); })]));
      root.appendChild(el('div', 'cso-edu-toolbar', [stack]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code & RDC Zone', 'Workshop & Venue', 'IST Date & Timing', 'Seat Occupancy', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        const prog = document.createElement('progress');
        prog.className = `cso-evt-seat-bar ${it.occupancy_pct >= 85 ? 'is-full' : ''}`.trim();
        prog.max = Math.max(1, Number(it.seat_capacity || 1));
        prog.value = Math.min(prog.max, Number(it.seats_registered || 0));

        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', 'cso-edu-mono', it.meetup_code), el('div', 'cso-edu-muted', `${it.rdc_zone} · ${it.district_odisha}`)]),
          el('td', '', [
            el('strong', '', it.title_en),
            it.title_or ? el('div', 'cso-edu-muted', it.title_or) : null,
            it.venue_name_address ? el('div', 'cso-edu-muted', it.venue_name_address) : null
          ].filter(Boolean)),
          el('td', '', [el('div', 'cso-edu-mono', it.event_date_ist), el('div', 'cso-edu-muted', it.timing_ist)]),
          el('td', '', [
            prog,
            el('div', 'cso-edu-mono', `${it.seats_registered}/${it.seat_capacity} (${it.occupancy_pct}%)`)
          ]),
          el('td', '', evtBadge(it.meetup_status, it.meetup_status)),
          el('td', 'cso-edu-row-actions', [
            btn('+1 RSVP', 'cso-edu-btn-sm', async () => {
              try {
                await api(`${API}/meetups/${encodeURIComponent(it.id)}/increment-rsvp`, 'PATCH', { delta: 1 });
                toast('Seat registered', 'success');
                draw();
              } catch (e) { toast(e.message, 'error'); }
            }),
            btn('Edit', 'cso-edu-btn-sm', () => openMeetupDrawer(it)),
            btn('Archive', 'cso-edu-btn-sm', async () => {
              try {
                await api(`${API}/meetups/${encodeURIComponent(it.id)}`, 'DELETE');
                toast('Meetup archived', 'success');
                draw();
              } catch (e) { toast(e.message, 'error'); }
            })
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openMeetupDrawer(item) {
      const isEdit = Boolean(item);
      const codeIn = textInput('text', item ? item.meetup_code : '', 'MTP-2026-0004 (auto if blank)');
      if (isEdit) codeIn.disabled = true;
      const distIn = textInput('text', item ? item.district_odisha : 'Cuttack', 'District in Odisha');
      const zoneSel = selectOf([['Central RDC', 'Central RDC'], ['Northern RDC', 'Northern RDC'], ['Southern RDC', 'Southern RDC']], item ? item.rdc_zone : 'Central RDC');
      const titleEn = textInput('text', item ? item.title_en : '', 'Workshop title (EN)');
      const titleOr = textInput('text', item ? item.title_or : '', 'ଓଡ଼ିଆ ଶୀର୍ଷକ');
      const focusSel = selectOf([
        ['opsc_oas_strategy', 'opsc_oas_strategy'], ['ossc_osssc_orientation', 'ossc_osssc_orientation'],
        ['ugc_net_research_clinic', 'ugc_net_research_clinic'], ['digital_literacy_bootcamp', 'digital_literacy_bootcamp'],
        ['career_counseling_camp', 'career_counseling_camp']
      ], item ? item.workshop_focus : 'opsc_oas_strategy');
      const venueIn = textInput('text', item ? item.venue_name_address : '', 'Venue name & address');
      const dateIn = textInput('date', item ? item.event_date_ist : '2026-12-15');
      const timeIn = textInput('text', item ? item.timing_ist : '10:30 AM – 02:30 PM IST', '10:30 AM – 02:30 PM IST');
      const capIn = textInput('number', item ? String(item.seat_capacity ?? 100) : '100');
      const regIn = textInput('number', item ? String(item.seats_registered ?? 0) : '0');
      const coordIn = textInput('text', item ? item.coordinator_name : '', 'District coordinator');
      const statusSel = selectOf([
        ['open_registration', 'open_registration'], ['almost_full', 'almost_full'],
        ['housefull_closed', 'housefull_closed'], ['completed', 'completed']
      ], item ? item.meetup_status : 'open_registration');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Meetup · ${item.meetup_code}` : 'Schedule District Meetup', [
        field('Meetup Code', codeIn),
        field('District (Odisha)', distIn),
        field('RDC Zone', zoneSel),
        field('Title (EN)', titleEn),
        field('Title (Odia)', titleOr),
        field('Workshop Focus', focusSel),
        field('Venue Name & Address', venueIn),
        field('Event Date (IST)', dateIn),
        field('Timing (IST)', timeIn),
        field('Seat Capacity', capIn),
        field('Seats Registered', regIn),
        field('Coordinator Name', coordIn),
        field('Meetup Status', statusSel)
      ]);
      if (isEdit) attachRevisions(body, '07', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Meetup' : 'Create Meetup', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            meetup_code: codeIn.value.trim() || undefined,
            district_odisha: distIn.value.trim(),
            rdc_zone: zoneSel.value,
            title_en: titleEn.value.trim(),
            title_or: titleOr.value.trim(),
            workshop_focus: focusSel.value,
            venue_name_address: venueIn.value.trim(),
            event_date_ist: dateIn.value,
            timing_ist: timeIn.value.trim(),
            seat_capacity: parseInt(capIn.value || '100', 10) || 100,
            seats_registered: parseInt(regIn.value || '0', 10) || 0,
            coordinator_name: coordIn.value.trim(),
            meetup_status: statusSel.value
          };
          if (isEdit) await api(`${API}/meetups/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/meetups`, 'POST', payload);
          toast('District meetup saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 08: LIVE WEBINARS & VIRTUAL COUNSELING ==================== */
  async function renderWebinars(root) {
    let curStatus = '';
    let curQ = '';

    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-es-008', 'Bilingual EN & ଓଡ଼ିଆ live webinars, SAMS counseling walkthroughs & masked passcode hints.', [
        btn('+ Schedule Live Webinar', 'cso-edu-btn-primary', () => openWebinarDrawer(null))
      ]));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/webinars?webinar_status=${encodeURIComponent(curStatus)}&q=${encodeURIComponent(curQ)}`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      const stack = el('div', 'cso-evt-filter-stack');
      const statusTabs = el('div', 'cso-edu-tabs');
      [
        ['', 'All'], ['upcoming_rsvp', 'Upcoming RSVP'],
        ['live_now', 'Live Now'], ['recording_available', 'Recording Available']
      ].forEach(([v, l]) => {
        statusTabs.appendChild(btn(l, `cso-edu-tab ${curStatus === v ? 'is-active' : ''}`, () => { curStatus = v; draw(); }));
      });

      const searchIn = textInput('search', curQ, 'Search webinar title, speaker, or code...');
      searchIn.addEventListener('keydown', ev => { if (ev.key === 'Enter') { curQ = searchIn.value.trim(); draw(); } });
      stack.append(statusTabs, el('div', 'cso-evt-pill-row', [searchIn, btn('Search', 'cso-edu-btn-sm', () => { curQ = searchIn.value.trim(); draw(); })]));
      root.appendChild(el('div', 'cso-edu-toolbar', [stack]));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Code & Track', 'Webinar & Speaker', 'Platform & Medium', 'IST Start & RSVPs', 'Status', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', 'cso-edu-mono', it.webinar_code), el('div', 'cso-edu-muted', it.session_track)]),
          el('td', '', [
            el('strong', '', it.title_en),
            it.title_or ? el('div', 'cso-edu-muted', it.title_or) : null,
            it.speaker_name_role ? el('div', 'cso-edu-muted', it.speaker_name_role) : null
          ].filter(Boolean)),
          el('td', '', [
            evtBadge(it.streaming_platform, it.streaming_platform),
            el('div', 'cso-edu-muted', `${it.language_medium} · Hint: ${it.passcode_masked_hint || 'None'}`)
          ]),
          el('td', '', [
            el('div', 'cso-edu-mono', it.scheduled_start_ist),
            el('div', 'cso-edu-muted', `${it.duration_minutes}m · ${it.rsvp_count} RSVPs`)
          ]),
          el('td', '', evtBadge(it.webinar_status, it.webinar_status)),
          el('td', 'cso-edu-row-actions', [
            btn('Edit', 'cso-edu-btn-sm', () => openWebinarDrawer(it)),
            btn('Archive', 'cso-edu-btn-sm', async () => {
              try {
                await api(`${API}/webinars/${encodeURIComponent(it.id)}`, 'DELETE');
                toast('Webinar archived', 'success');
                draw();
              } catch (e) { toast(e.message, 'error'); }
            })
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openWebinarDrawer(item) {
      const isEdit = Boolean(item);
      const codeIn = textInput('text', item ? item.webinar_code : '', 'WEB-2026-0004 (auto if blank)');
      if (isEdit) codeIn.disabled = true;
      const trackSel = selectOf([
        ['exam_strategy_ama', 'exam_strategy_ama'], ['sams_counselling_walkthrough', 'sams_counselling_walkthrough'],
        ['scheme_application_clinic', 'scheme_application_clinic'], ['topper_mock_review', 'topper_mock_review'],
        ['bilingual_doubt_clearing', 'bilingual_doubt_clearing']
      ], item ? item.session_track : 'exam_strategy_ama');
      const titleEn = textInput('text', item ? item.title_en : '', 'Webinar title (EN)');
      const titleOr = textInput('text', item ? item.title_or : '', 'ଓଡ଼ିଆ ଶୀର୍ଷକ');
      const speakerIn = textInput('text', item ? item.speaker_name_role : '', 'Speaker name & role');
      const langSel = selectOf([['bilingual_en_or', 'bilingual_en_or'], ['odia_primary', 'odia_primary'], ['english_primary', 'english_primary']], item ? item.language_medium : 'bilingual_en_or');
      const startIn = textInput('text', item ? item.scheduled_start_ist : '2026-11-28T19:00:00+05:30', 'YYYY-MM-DDTHH:mm:ss+05:30');
      const durIn = textInput('number', item ? String(item.duration_minutes ?? 60) : '60');
      const platSel = selectOf([['YouTube Live', 'YouTube Live'], ['Google Meet', 'Google Meet'], ['Zoom Webinar', 'Zoom Webinar'], ['CS Odisha Live Room', 'CS Odisha Live Room']], item ? item.streaming_platform : 'YouTube Live');
      const joinIn = textInput('url', item ? item.public_join_url : '', 'https://csodisha.com/live/...');
      const hintIn = textInput('text', item ? item.passcode_masked_hint : 'CSO-••••89', 'Masked hint only (e.g. CSO-••••89)');
      const recIn = textInput('url', item ? item.recording_archive_url : '', 'Recording URL (optional)');
      const statusSel = selectOf([
        ['upcoming_rsvp', 'upcoming_rsvp'], ['live_now', 'live_now'],
        ['recording_available', 'recording_available'], ['cancelled', 'cancelled']
      ], item ? item.webinar_status : 'upcoming_rsvp');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit Webinar · ${item.webinar_code}` : 'Schedule Live Webinar', [
        field('Webinar Code', codeIn),
        field('Session Track', trackSel),
        field('Title (EN)', titleEn),
        field('Title (Odia)', titleOr),
        field('Speaker Name & Role', speakerIn),
        field('Language Medium', langSel),
        field('Scheduled Start (IST)', startIn),
        field('Duration (Minutes)', durIn),
        field('Streaming Platform', platSel),
        field('Public Join URL', joinIn),
        field('Passcode Masked Hint (auto-masked)', hintIn),
        field('Recording Archive URL', recIn),
        field('Webinar Status', statusSel)
      ]);
      if (isEdit) attachRevisions(body, '08', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Webinar' : 'Schedule Webinar', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            webinar_code: codeIn.value.trim() || undefined,
            session_track: trackSel.value,
            title_en: titleEn.value.trim(),
            title_or: titleOr.value.trim(),
            speaker_name_role: speakerIn.value.trim(),
            language_medium: langSel.value,
            scheduled_start_ist: startIn.value.trim(),
            duration_minutes: parseInt(durIn.value || '60', 10) || 60,
            streaming_platform: platSel.value,
            public_join_url: joinIn.value.trim(),
            passcode_masked_hint: hintIn.value.trim(),
            recording_archive_url: recIn.value.trim(),
            webinar_status: statusSel.value
          };
          if (isEdit) await api(`${API}/webinars/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/webinars`, 'POST', payload);
          toast('Live webinar saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  /* ==================== MODULE 09: CALENDAR SYNC, ICS FEEDS & PUSH DISPATCHER ==================== */
  async function renderCalendarSync(root) {
    async function draw() {
      root.textContent = '';
      root.appendChild(buildHeader('module-es-009', 'RFC 5545 .ics calendar subscription feeds (Asia/Kolkata) & cookieless milestone push dispatcher.', [
        btn('+ Create ICS Feed', 'cso-edu-btn-primary', () => openFeedDrawer(null))
      ]));

      const [ov, data] = await Promise.all([
        api(`${API}/overview`),
        api(`${API}/calendar-sync`)
      ]);
      root.appendChild(renderKpiStrip(ov));

      const card = el('div', 'cso-edu-card');
      const tbl = el('table', 'cso-edu-table');
      tbl.appendChild(el('thead', '', el('tr', '', ['Feed Slug & Scope', 'Title & Subscription URL', 'Syncs & Pushes', 'Last Dispatched (IST)', 'Actions'].map(h => el('th', '', h)))));
      const tbody = el('tbody', '');
      (data.items || []).forEach(it => {
        const subUrl = `${window.location.origin}/api/events/calendar/${it.feed_slug}.ics`;
        tbody.appendChild(el('tr', '', [
          el('td', '', [el('div', 'cso-edu-mono', it.feed_slug), el('div', 'cso-edu-muted', `${it.source_scope} · ${it.timezone_id}`)]),
          el('td', '', [
            el('strong', '', it.feed_title_en),
            el('div', 'cso-edu-mono', subUrl),
            it.last_push_summary_en ? el('div', 'cso-edu-muted', `Last Push: ${it.last_push_summary_en}`) : null
          ].filter(Boolean)),
          el('td', 'cso-edu-mono', `${it.subscribers_sync_count} syncs · ${it.push_dispatch_count} pushes`),
          el('td', 'cso-edu-mono', it.last_dispatched_push_at_ist || 'Never'),
          el('td', 'cso-edu-row-actions', [
            btn('Copy .ics URL', 'cso-edu-btn-sm', async () => {
              try {
                await navigator.clipboard.writeText(subUrl);
                toast('Copied .ics subscription URL', 'success');
              } catch { toast(subUrl, 'info'); }
            }),
            btn('Inspect RFC 5545 .ics', 'cso-edu-btn-sm', async () => {
              try {
                const res = await api(`${API}/calendar-sync?preview_slug=${encodeURIComponent(it.feed_slug)}`);
                const pre = el('pre', 'cso-evt-ics-pre', res.ics_preview || 'No events in scope');
                openDrawer(`RFC 5545 .ics Preview · ${it.feed_slug}.ics`, [pre]);
              } catch (e) { toast(e.message, 'error'); }
            }),
            btn('Dispatch Milestone Push Alert', 'cso-edu-btn-sm cso-edu-btn-primary', async () => {
              try {
                await api(`${API}/calendar-sync/${encodeURIComponent(it.id)}/dispatch-push`, 'POST', {
                  summary_en: `Milestone alert dispatched for ${it.feed_title_en}`
                });
                toast('Cookieless milestone push dispatched', 'success');
                draw();
              } catch (e) { toast(e.message, 'error'); }
            }),
            btn('Edit', 'cso-edu-btn-sm', () => openFeedDrawer(it))
          ])
        ]));
      });
      tbl.appendChild(tbody);
      card.appendChild(tbl);
      root.appendChild(card);
    }

    function openFeedDrawer(item) {
      const isEdit = Boolean(item);
      const slugIn = textInput('text', item ? item.feed_slug : '', 'e.g. opsc-2026-calendar');
      if (isEdit) slugIn.disabled = true;
      const titleEn = textInput('text', item ? item.feed_title_en : '', 'Feed title (EN)');
      const titleOr = textInput('text', item ? item.feed_title_or : '', 'ଓଡ଼ିଆ ଶୀର୍ଷକ');
      const scopeSel = selectOf([
        ['all_events', 'all_events'], ['exam_deadlines', 'exam_deadlines'],
        ['admit_cards_results', 'admit_cards_results'], ['meetups_webinars', 'meetups_webinars']
      ], item ? item.source_scope : 'all_events');
      const ttlIn = textInput('number', item ? String(item.ics_cache_ttl_sec ?? 300) : '300');
      const statusSel = selectOf([['active_live', 'active_live'], ['paused', 'paused']], item ? item.feed_status : 'active_live');

      const { backdrop, body, foot } = openDrawer(isEdit ? `Edit ICS Feed · ${item.feed_slug}` : 'Create ICS Calendar Feed', [
        field('Feed Slug', slugIn),
        field('Feed Title (EN)', titleEn),
        field('Feed Title (Odia)', titleOr),
        field('Source Scope', scopeSel),
        field('Edge Cache TTL (Seconds)', ttlIn),
        field('Feed Status', statusSel)
      ]);
      if (isEdit) attachRevisions(body, '09', item.id, () => { backdrop.remove(); draw(); });

      foot.appendChild(btn(isEdit ? 'Save Feed' : 'Create Feed', 'cso-edu-btn-primary', async () => {
        try {
          const payload = {
            feed_slug: slugIn.value.trim(),
            feed_title_en: titleEn.value.trim(),
            feed_title_or: titleOr.value.trim(),
            source_scope: scopeSel.value,
            ics_cache_ttl_sec: parseInt(ttlIn.value || '300', 10) || 300,
            feed_status: statusSel.value
          };
          if (isEdit) await api(`${API}/calendar-sync/${encodeURIComponent(item.id)}`, 'PUT', payload);
          else await api(`${API}/calendar-sync`, 'POST', payload);
          toast('ICS calendar feed saved', 'success');
          backdrop.remove();
          draw();
        } catch (e) { toast(e.message, 'error'); }
      }));
    }

    await draw();
  }

  window.CSOEventsBatch3 = {
    async render(moduleId, root) {
      if (!MODULES[moduleId] || !root) return false;
      root.className = 'cso-edu-shell';
      if (moduleId === 'module-es-007') await renderMeetups(root);
      else if (moduleId === 'module-es-008') await renderWebinars(root);
      else if (moduleId === 'module-es-009') await renderCalendarSync(root);
      return true;
    }
  };
})();
