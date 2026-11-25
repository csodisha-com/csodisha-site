/**
 * CS Odisha Admin Studio — Folder #10: System, Security & Billing (v312)
 * Sub-tabs:
 *   1. Security & Audit Logs      (Real RFC 6238 TOTP 2FA + SVG QR + 8 Recovery Codes,
 *                                  real admin_sessions Force Revoke, real admin_audit_logs)
 *   2. System, Flags & SEO        (live feature_flags, 301/302 redirects, Purge Public Caches,
 *                                  Sitemap Regeneration, and real D1 JSON/CSV Backup Export)
 *   3. Payments & Ads             (Live Ad Slot Manager, Membership Plans, Promo Coupons & Order Ledger)
 * Strict CSP: DOM APIs only; zero innerHTML, outerHTML, insertAdjacentHTML, or .style.*.
 */
(function (window, document) {
  'use strict';

  var BACKUP_TABLES = [
    ['all', 'All Core Tables (JSON Bundle)'],
    ['job_articles', 'job_articles'],
    ['careers_articles', 'careers_articles'],
    ['scheme_articles', 'scheme_articles'],
    ['study_articles', 'study_articles'],
    ['mock_tests', 'mock_tests'],
    ['mock_questions', 'mock_questions'],
    ['mock_attempts', 'mock_attempts'],
    ['candidate_assignments', 'candidate_assignments'],
    ['support_tickets', 'support_tickets'],
    ['community_posts', 'community_posts'],
    ['about_articles', 'about_articles'],
    ['institutional_pages', 'institutional_pages'],
    ['site_snippets', 'site_snippets'],
    ['homepage_blocks', 'homepage_blocks'],
    ['media_files', 'media_files'],
    ['ad_slots', 'ad_slots'],
    ['monetization_plans', 'monetization_plans'],
    ['payment_coupons', 'payment_coupons'],
    ['payment_orders', 'payment_orders'],
    ['feature_flags', 'feature_flags'],
    ['redirects', 'redirects'],
    ['admin_audit_logs', 'admin_audit_logs']
  ];

  var S = {
    root: null,
    headerActions: null,
    activeTab: 'security',
    auditSearch: '',
    auditItems: [],
    auditTotal: 0,
    sessions: [],
    flags: [],
    redirects: [],
    totpStatus: null,
    totpSetup: null,
    totpRecoveryCodes: null,
    emailOtpStatus: null,
    lastError: '',
    sitemapNote: ''
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

  function fmtDate(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : String(iso).replace(' ', 'T') + 'Z');
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    } catch (_) {
      return String(iso);
    }
  }

  function rawApi(url, method, body) {
    var opts = {
      method: method || 'GET',
      credentials: 'same-origin',
      headers: { 'X-CSO-CSRF': '1' }
    };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return fetch(url, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) throw new Error((d && d.error) || ('HTTP ' + r.status));
        return d;
      });
    });
  }

  function api(path, method, body) {
    return rawApi('/api/admin/system-ops/' + path, method, body);
  }

  function totpApi(sub, method, body) {
    return rawApi('/api/admin/totp' + (sub ? '/' + sub : ''), method, body);
  }

  function copyText(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        toast((label || 'Copied') + ' to clipboard.', 'ok');
      }).catch(function () {
        toast('Unable to copy automatically — select and copy manually.', 'crimson');
      });
    } else {
      toast('Clipboard API unavailable — select and copy manually.', 'crimson');
    }
  }

  function loadSecurityData() {
    S.lastError = '';
    var q = S.auditSearch ? ('?limit=60&q=' + encodeURIComponent(S.auditSearch)) : '?limit=60';
    return Promise.all([
      api('audit-logs' + q, 'GET'),
      api('sessions', 'GET'),
      totpApi('', 'GET').catch(function () { return null; }),
      api('email-otp-status', 'GET').catch(function () { return null; })
    ]).then(function (quad) {
      S.auditItems = quad[0].items || [];
      S.auditTotal = Number(quad[0].total || 0);
      S.sessions = quad[1].items || [];
      S.totpStatus = quad[2];
      S.emailOtpStatus = quad[3];
      render();
    }).catch(function (err) {
      S.lastError = err.message;
      render();
    });
  }

  function loadSystemData() {
    S.lastError = '';
    return Promise.all([
      api('flags', 'GET'),
      api('redirects', 'GET')
    ]).then(function (pair) {
      S.flags = pair[0].items || [];
      S.redirects = pair[1].items || [];
      render();
    }).catch(function (err) {
      S.lastError = err.message;
      render();
    });
  }

  function renderTabs(shell) {
    var bar = el('div', 'so-tabs');
    bar.setAttribute('role', 'tablist');
    bar.setAttribute('aria-label', 'System, Security & Billing sections');

    [
      { key: 'security', label: '🛡️ Security & Audit Logs' },
      { key: 'system', label: '⚙️ System, Flags & SEO' },
      { key: 'billing', label: '💳 Payments & Ads' }
    ].forEach(function (t) {
      var b = el('button', 'so-tab' + (S.activeTab === t.key ? ' is-active' : ''), t.label);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(S.activeTab === t.key));
      b.setAttribute('data-so-tab', t.key);
      b.addEventListener('click', function () {
        S.activeTab = t.key;
        if (window.CSOStudio && window.CSOStudio.setSystemOpsSubTab) {
          window.CSOStudio.setSystemOpsSubTab(t.key);
        }
        if (t.key === 'security') loadSecurityData();
        else if (t.key === 'system') loadSystemData();
        else render();
      });
      bar.appendChild(b);
    });

    shell.appendChild(bar);
  }

  function renderTotpCard(shell) {
    var card = el('section', 'so-card');
    card.id = 'soTotpCard';
    var st = S.totpStatus || { enabled: false, recovery_codes_remaining: 0, recovery_codes_total: 8 };

    var head = el('div', 'so-card-head');
    var left = el('div');
    left.appendChild(el('h2', 'so-title', 'Two-Factor Authentication (RFC 6238 TOTP & Recovery Codes)'));
    left.appendChild(el('p', 'so-sub', 'Protect your staff account on /admin/login.html with Google Authenticator, Authy, Aegis, or 1Password plus 8 single-use hashed recovery codes.'));
    head.appendChild(left);
    head.appendChild(el('span', 'so-badge ' + (st.enabled ? 'so-badge--on' : 'so-badge--warn'), st.enabled ? '2FA ENABLED' : '2FA NOT ENABLED'));
    card.appendChild(head);

    // Newly generated recovery codes banner (shown once)
    if (Array.isArray(S.totpRecoveryCodes) && S.totpRecoveryCodes.length) {
      var recBox = el('div', 'so-totp-recovery-box');
      recBox.setAttribute('role', 'region');
      recBox.setAttribute('aria-label', 'Single-use backup recovery codes');
      recBox.appendChild(el('strong', 'so-flag-name', 'Save These 8 Single-Use Recovery Codes Now'));
      recBox.appendChild(el('p', 'so-sub', 'Only SHA-256 hashes are stored in D1. These plaintext codes are displayed once — store them safely offline.'));
      var grid = el('div', 'so-recovery-grid');
      S.totpRecoveryCodes.forEach(function (c) {
        grid.appendChild(el('code', 'so-recovery-code', c));
      });
      recBox.appendChild(grid);
      var recActs = el('div', 'so-actions');
      var copyRec = el('button', 'so-btn so-btn--primary', 'Copy All 8 Recovery Codes');
      copyRec.type = 'button';
      copyRec.addEventListener('click', function () {
        copyText(S.totpRecoveryCodes.join('\n'), '8 recovery codes copied');
      });
      var dismissRec = el('button', 'so-btn', 'I Have Saved Them');
      dismissRec.type = 'button';
      dismissRec.addEventListener('click', function () {
        S.totpRecoveryCodes = null;
        render();
      });
      recActs.append(copyRec, dismissRec);
      recBox.appendChild(recActs);
      card.appendChild(recBox);
    }

    if (!st.enabled) {
      if (!S.totpSetup) {
        var initRow = el('div', 'so-actions');
        var startBtn = el('button', 'so-btn so-btn--primary', '🔐 Set Up Authenticator App (TOTP)');
        startBtn.type = 'button';
        startBtn.id = 'soBtnStartTotpSetup';
        startBtn.addEventListener('click', function () {
          startBtn.disabled = true;
          totpApi('setup', 'POST', {}).then(function (d) {
            S.totpSetup = d;
            toast('TOTP secret generated. Scan the QR code and verify a 6-digit code to enable.', 'ok');
            render();
          }).catch(function (err) {
            toast('Setup failed: ' + err.message, 'crimson');
          }).finally(function () { startBtn.disabled = false; });
        });
        initRow.appendChild(startBtn);
        card.appendChild(initRow);
      } else {
        var setupWrap = el('div', 'so-totp-setup');

        var qrBox = el('div', 'so-qr-panel');
        if (window.CSOQrSvg && typeof window.CSOQrSvg.renderSvg === 'function') {
          try {
            qrBox.appendChild(window.CSOQrSvg.renderSvg(S.totpSetup.otpauth_uri, 'Scan with Authenticator App'));
          } catch (_) {
            qrBox.appendChild(el('p', 'so-sub', 'QR preview unavailable; enter the manual key on the right.'));
          }
        }
        qrBox.appendChild(el('span', 'so-sub', 'Scan with Google Authenticator / Authy / 1Password'));

        var infoCol = el('div', 'so-totp-info');
        infoCol.appendChild(el('div', 'so-label', 'Manual Base32 Secret Key'));
        var secRow = el('div', 'so-actions');
        secRow.appendChild(el('code', 'so-totp-secret', S.totpSetup.secret));
        var copySec = el('button', 'so-btn', 'Copy Secret');
        copySec.type = 'button';
        copySec.addEventListener('click', function () { copyText(S.totpSetup.secret, 'Secret key copied'); });
        secRow.appendChild(copySec);
        infoCol.appendChild(secRow);

        infoCol.appendChild(el('div', 'so-label', 'Standard otpauth:// URI'));
        infoCol.appendChild(el('div', 'so-totp-uri', S.totpSetup.otpauth_uri));

        var verifyForm = el('form', 'so-form-row');
        verifyForm.noValidate = true;
        var fCode = el('div', 'so-field');
        var lCode = el('label', 'so-label', 'Enter 6-Digit Authenticator Code *');
        lCode.setAttribute('for', 'soTotpVerifyInput');
        var iCode = el('input', 'so-input so-mono');
        iCode.id = 'soTotpVerifyInput';
        iCode.type = 'text';
        iCode.inputMode = 'numeric';
        iCode.maxLength = 6;
        iCode.placeholder = '123456';
        fCode.append(lCode, iCode);

        var verifyActs = el('div', 'so-actions');
        var enableBtn = el('button', 'so-btn so-btn--primary', 'Verify & Enable 2FA');
        enableBtn.type = 'submit';
        var cancelBtn = el('button', 'so-btn', 'Cancel');
        cancelBtn.type = 'button';
        cancelBtn.addEventListener('click', function () {
          S.totpSetup = null;
          render();
        });
        verifyActs.append(enableBtn, cancelBtn);
        verifyForm.append(fCode, verifyActs);

        verifyForm.addEventListener('submit', function (ev) {
          ev.preventDefault();
          var code = iCode.value.replace(/\s+/g, '');
          if (!/^\d{6}$/.test(code)) {
            toast('Enter the 6-digit code shown in your authenticator app.', 'crimson');
            return;
          }
          enableBtn.disabled = true;
          totpApi('enable', 'POST', { code: code }).then(function (d) {
            S.totpSetup = null;
            S.totpRecoveryCodes = d.recovery_codes || [];
            toast('TOTP 2FA enabled! Save your 8 single-use recovery codes now.', 'ok');
            loadSecurityData();
          }).catch(function (err) {
            toast(err.message, 'crimson');
          }).finally(function () { enableBtn.disabled = false; });
        });

        infoCol.appendChild(verifyForm);
        setupWrap.append(qrBox, infoCol);
        card.appendChild(setupWrap);
      }
    } else {
      var metaRow = el('div', 'so-totp-meta');
      metaRow.appendChild(el('span', 'so-badge so-badge--on', 'Active for ' + (st.email || 'current account')));
      metaRow.appendChild(el('span', 'so-badge', 'Backup Recovery Codes Remaining: ' + Number(st.recovery_codes_remaining || 0) + ' / ' + Number(st.recovery_codes_total || 8)));
      if (st.updated_at) metaRow.appendChild(el('span', 'so-sub', 'Updated ' + fmtDate(st.updated_at)));
      card.appendChild(metaRow);

      var mgmtForm = el('div', 'so-form-row');
      var fVerify = el('div', 'so-field');
      var lVerify = el('label', 'so-label', 'Current 6-Digit TOTP (or Recovery Code to disable)');
      lVerify.setAttribute('for', 'soTotpMgmtCode');
      var iVerify = el('input', 'so-input so-mono');
      iVerify.id = 'soTotpMgmtCode';
      iVerify.type = 'text';
      iVerify.maxLength = 16;
      iVerify.placeholder = '123456 or XXXX-XXXX';
      fVerify.append(lVerify, iVerify);

      var mgmtActs = el('div', 'so-actions');
      var regenBtn = el('button', 'so-btn', '↻ Regenerate 8 Recovery Codes');
      regenBtn.type = 'button';
      regenBtn.addEventListener('click', function () {
        var code = iVerify.value.trim();
        if (!/^\d{6}$/.test(code.replace(/\s+/g, ''))) {
          toast('Enter your current 6-digit authenticator code to regenerate backup codes.', 'crimson');
          return;
        }
        totpApi('recovery-codes', 'POST', { code: code }).then(function (d) {
          S.totpRecoveryCodes = d.recovery_codes || [];
          toast('8 fresh recovery codes generated. Previous codes are invalidated.', 'ok');
          loadSecurityData();
        }).catch(function (err) { toast(err.message, 'crimson'); });
      });

      var disBtn = el('button', 'so-btn so-btn--danger', 'Disable 2FA');
      disBtn.type = 'button';
      disBtn.addEventListener('click', function () {
        var code = iVerify.value.trim();
        if (!code) {
          toast('Enter a valid 6-digit TOTP or backup recovery code to disable 2FA.', 'crimson');
          return;
        }
        if (!window.confirm('Disable Two-Factor Authentication for this staff account?')) return;
        totpApi('disable', 'POST', { code: code }).then(function () {
          S.totpRecoveryCodes = null;
          S.totpSetup = null;
          toast('Two-Factor Authentication disabled.', 'ok');
          loadSecurityData();
        }).catch(function (err) { toast(err.message, 'crimson'); });
      });

      mgmtActs.append(regenBtn, disBtn);
      mgmtForm.append(fVerify, mgmtActs);
      card.appendChild(mgmtForm);
    }

    shell.appendChild(card);
  }

  function renderEmailOtpCard(shell) {
    var card = el('section', 'so-card');
    card.id = 'soEmailOtpCard';
    var st = S.emailOtpStatus || { provider_configured: false, provider: null, flag_enabled: true, active: false };

    var head = el('div', 'so-card-head');
    var left = el('div');
    left.appendChild(el('h2', 'so-title', 'Admin Login Email OTP Verification (v315)'));
    left.appendChild(el('p', 'so-sub', st.provider_configured
      ? ('Requires a 6-digit single-use email code (' + String(st.provider || 'provider').toUpperCase() + ') after password verification on /admin/login.html.')
      : 'Email OTP: Provider Key Required — bind RESEND_API_KEY or BREVO_API_KEY in Cloudflare secrets to enforce Email OTP without locking out staff.'));
    head.appendChild(left);

    var badgeClass = st.active ? 'so-badge--on' : (st.provider_configured ? 'so-badge--off' : 'so-badge--warn');
    var badgeText = st.active ? 'ACTIVE' : (st.provider_configured ? 'DISABLED' : 'PROVIDER KEY REQUIRED');
    head.appendChild(el('span', 'so-badge ' + badgeClass, badgeText));
    card.appendChild(head);

    var acts = el('div', 'so-actions');
    var toggleBtn = el(
      'button',
      'so-btn ' + (st.flag_enabled ? 'so-btn--ghost' : 'so-btn--primary'),
      st.flag_enabled ? 'Disable Email OTP' : 'Enable Email OTP'
    );
    toggleBtn.type = 'button';
    if (!st.provider_configured && !st.flag_enabled) {
      toggleBtn.disabled = true;
      toggleBtn.title = 'Configure RESEND_API_KEY or BREVO_API_KEY before enabling.';
    }
    toggleBtn.addEventListener('click', function () {
      var nextVal = !st.flag_enabled;
      api('flags/admin_email_otp_enabled', 'PUT', { enabled: nextVal }).then(function () {
        toast('Admin Login Email OTP ' + (nextVal ? 'enabled' : 'disabled') + '.', 'ok');
        loadSecurityData();
      }).catch(function (err) { toast(err.message, 'crimson'); });
    });
    acts.appendChild(toggleBtn);

    var testBtn = el('button', 'so-btn so-btn--primary', 'Send Test OTP to My Email');
    testBtn.type = 'button';
    if (!st.provider_configured) {
      testBtn.disabled = true;
      testBtn.title = 'Email OTP: Provider Key Required';
    }
    testBtn.addEventListener('click', function () {
      testBtn.disabled = true;
      api('test-email-otp', 'POST', {}).then(function (d) {
        toast('Test 6-digit OTP sent to ' + (d.masked_email || 'your email') + '.', 'ok');
        testBtn.disabled = false;
      }).catch(function (err) {
        toast(err.message, 'crimson');
        testBtn.disabled = false;
      });
    });
    acts.appendChild(testBtn);

    card.appendChild(acts);
    shell.appendChild(card);
  }

  function renderSecurityTab(shell) {
    // 0. Per-Admin TOTP 2FA & Recovery Codes (v312)
    renderTotpCard(shell);
    // 0b. Admin Login Email OTP Verification (v315)
    renderEmailOtpCard(shell);

    // 1. Active Admin Sessions Card
    var sessCard = el('section', 'so-card');
    var sHead = el('div', 'so-card-head');
    var sLeft = el('div');
    sLeft.appendChild(el('h2', 'so-title', 'Active Admin & Editor Sessions (' + S.sessions.length + ')'));
    sLeft.appendChild(el('p', 'so-sub', 'Live rows from D1 admin_sessions. Force Revoke immediately terminates the session on its next request.'));
    sHead.appendChild(sLeft);
    sessCard.appendChild(sHead);

    if (!S.sessions.length) {
      sessCard.appendChild(el('div', 'so-empty', 'No active admin sessions recorded yet (0).'));
    } else {
      var stWrap = el('div', 'so-table-wrap');
      var tbl = el('table', 'so-table');
      var thead = el('thead');
      var hr = el('tr');
      ['Staff Account', 'Role', 'IP Address', 'Last Seen', 'Action'].forEach(function (h) { hr.appendChild(el('th', '', h)); });
      thead.appendChild(hr);
      tbl.appendChild(thead);

      var tbody = el('tbody');
      S.sessions.forEach(function (sess) {
        var tr = el('tr');
        var tdUser = el('td');
        tdUser.appendChild(el('strong', '', sess.email));
        if (sess.is_current) {
          tdUser.appendChild(document.createTextNode(' '));
          tdUser.appendChild(el('span', 'so-badge so-badge--on', 'Current'));
        }
        tr.appendChild(tdUser);
        tr.appendChild(el('td', '', String(sess.role || 'admin').toUpperCase()));
        tr.appendChild(el('td', 'so-mono', sess.ip_address || '—'));
        tr.appendChild(el('td', '', fmtDate(sess.last_seen_at || sess.created_at)));

        var tdAct = el('td');
        var revBtn = el('button', 'so-btn so-btn--danger', 'Force Revoke');
        revBtn.type = 'button';
        revBtn.addEventListener('click', function () {
          if (!window.confirm('Force revoke session for ' + sess.email + '?')) return;
          api('sessions/' + encodeURIComponent(sess.id), 'POST', {}).then(function () {
            toast('Session revoked for ' + sess.email, 'ok');
            loadSecurityData();
          }).catch(function (err) {
            toast('Revoke failed: ' + err.message, 'crimson');
          });
        });
        tdAct.appendChild(revBtn);
        tr.appendChild(tdAct);
        tbody.appendChild(tr);
      });
      tbl.appendChild(tbody);
      stWrap.appendChild(tbl);
      sessCard.appendChild(stWrap);
    }
    shell.appendChild(sessCard);

    // 2. Real Admin Audit Logs Card
    var logCard = el('section', 'so-card');
    var lHead = el('div', 'so-card-head');
    var lLeft = el('div');
    lLeft.appendChild(el('h2', 'so-title', 'Admin Audit Logs (' + S.auditTotal + ')'));
    lLeft.appendChild(el('p', 'so-sub', 'Asynchronous audit stream from D1 admin_audit_logs recording real logins, 2FA challenges, content writes, file uploads/deletions, flag toggles, and cache purges.'));
    lHead.appendChild(lLeft);

    var searchBox = el('input', 'so-input');
    searchBox.type = 'search';
    searchBox.placeholder = 'Filter actor, action, target, IP…';
    searchBox.setAttribute('aria-label', 'Filter audit logs');
    searchBox.value = S.auditSearch;
    searchBox.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') {
        S.auditSearch = searchBox.value.trim();
        loadSecurityData();
      }
    });
    lHead.appendChild(searchBox);
    logCard.appendChild(lHead);

    if (!S.auditItems.length) {
      logCard.appendChild(el('div', 'so-empty', 'No audit log entries recorded yet (0). Real logins and admin actions will appear here automatically.'));
    } else {
      var ltWrap = el('div', 'so-table-wrap');
      var lTbl = el('table', 'so-table');
      var lHeadRow = el('tr');
      ['Timestamp', 'Actor', 'Action', 'Target', 'IP'].forEach(function (h) { lHeadRow.appendChild(el('th', '', h)); });
      var lThead = el('thead');
      lThead.appendChild(lHeadRow);
      lTbl.appendChild(lThead);

      var lBody = el('tbody');
      S.auditItems.forEach(function (item) {
        var tr = el('tr');
        tr.appendChild(el('td', '', fmtDate(item.created_at)));
        tr.appendChild(el('td', '', item.actor_email || 'system'));
        tr.appendChild(el('td', 'so-mono', item.action));
        tr.appendChild(el('td', 'so-mono', item.target || '—'));
        tr.appendChild(el('td', 'so-mono', item.ip_address || '—'));
        lBody.appendChild(tr);
      });
      lTbl.appendChild(lBody);
      ltWrap.appendChild(lTbl);
      logCard.appendChild(ltWrap);
    }
    shell.appendChild(logCard);
  }

  function renderSystemTab(shell) {
    // 1. Live Edge Feature Flags
    var flagCard = el('section', 'so-card');
    flagCard.appendChild(el('h2', 'so-title', 'Edge-Enforced Feature Flags (Live on csodisha.com)'));
    flagCard.appendChild(el('p', 'so-sub', 'Evaluated at the edge with short isolate caching so public traffic never exhausts D1 writes. Toggles take effect immediately after cache purge.'));

    var grid = el('div', 'so-flags-grid');
    S.flags.forEach(function (fl) {
      var box = el('div', 'so-flag-item');
      var top = el('div', 'so-flag-top');
      var txt = el('div');
      txt.appendChild(el('div', 'so-flag-name', fl.label));
      txt.appendChild(el('p', 'so-flag-desc', fl.description));
      top.appendChild(txt);

      var isWarn = (fl.key === 'maintenance_mode' || fl.key === 'emergency_read_only_mode') && fl.enabled;
      var badgeCls = isWarn ? 'so-badge--warn' : (fl.enabled ? 'so-badge--on' : 'so-badge--off');
      top.appendChild(el('span', 'so-badge ' + badgeCls, fl.enabled ? 'ENABLED' : 'DISABLED'));
      box.appendChild(top);

      var foot = el('div', 'so-actions');
      var toggleBtn = el('button', 'so-btn ' + (fl.enabled ? '' : 'so-btn--primary'), fl.enabled ? 'Disable Flag' : 'Enable Flag');
      toggleBtn.type = 'button';
      toggleBtn.addEventListener('click', function () {
        var nextState = !fl.enabled;
        if ((fl.key === 'maintenance_mode' || fl.key === 'emergency_read_only_mode') && nextState) {
          if (!window.confirm('Enable "' + fl.label + '" on the live public website? (/admin/ remains accessible.)')) return;
        }
        api('flags/' + encodeURIComponent(fl.key), 'PUT', { enabled: nextState }).then(function () {
          toast(fl.label + ' ' + (nextState ? 'enabled' : 'disabled') + ' live', 'ok');
          loadSystemData();
        }).catch(function (err) {
          toast('Flag update failed: ' + err.message, 'crimson');
        });
      });
      foot.appendChild(toggleBtn);
      if (fl.updated_at) {
        foot.appendChild(el('span', 'so-sub', 'Updated ' + fmtDate(fl.updated_at)));
      }
      box.appendChild(foot);
      grid.appendChild(box);
    });
    flagCard.appendChild(grid);
    shell.appendChild(flagCard);

    // 2. Cache Purge, Sitemap Regeneration & Real D1 Backups
    var opsCard = el('section', 'so-card');
    opsCard.appendChild(el('h2', 'so-title', 'Edge Cache, Sitemap & Real D1 Backups'));
    opsCard.appendChild(el('p', 'so-sub', 'Purge all public edge caches, trigger live /sitemap.xml regeneration, or download a real JSON/CSV export of core D1 tables.'));

    var opsRow = el('div', 'so-actions');
    var purgeBtn = el('button', 'so-btn so-btn--primary', '⚡ Purge Public Caches');
    purgeBtn.type = 'button';
    purgeBtn.addEventListener('click', function () {
      purgeBtn.disabled = true;
      api('purge-caches', 'POST', {}).then(function (d) {
        toast('Public caches purged (X-CSO-Cache-Purged: 1 · ' + (d.invalidated || 0) + ' entries)', 'ok');
      }).catch(function (err) {
        toast('Cache purge failed: ' + err.message, 'crimson');
      }).finally(function () { purgeBtn.disabled = false; });
    });

    var smBtn = el('button', 'so-btn', '🗺️ Regenerate /sitemap.xml');
    smBtn.type = 'button';
    smBtn.addEventListener('click', function () {
      smBtn.disabled = true;
      api('regenerate-sitemap', 'POST', {}).then(function (d) {
        S.sitemapNote = 'Regenerated /sitemap.xml (' + (d.url_count || 0) + ' URLs) at ' + fmtDate(d.regenerated_at);
        toast(S.sitemapNote, 'ok');
        render();
      }).catch(function (err) {
        toast('Sitemap regeneration failed: ' + err.message, 'crimson');
      }).finally(function () { smBtn.disabled = false; });
    });

    opsRow.appendChild(purgeBtn);
    opsRow.appendChild(smBtn);
    if (S.sitemapNote) opsRow.appendChild(el('span', 'so-sub', S.sitemapNote));
    opsCard.appendChild(opsRow);

    var bkRow = el('div', 'so-form-row');
    var fTbl = el('div', 'so-field');
    var lTbl = el('label', 'so-label', 'D1 Backup Scope');
    lTbl.setAttribute('for', 'soBackupTableSelect');
    var selTbl = el('select', 'so-select');
    selTbl.id = 'soBackupTableSelect';
    BACKUP_TABLES.forEach(function (pair) {
      var op = el('option', '', pair[1]);
      op.value = pair[0];
      selTbl.appendChild(op);
    });
    fTbl.appendChild(lTbl);
    fTbl.appendChild(selTbl);

    var bkActs = el('div', 'so-actions');
    var dlJson = el('button', 'so-btn so-btn--primary', '⬇ Export Real D1 JSON');
    dlJson.type = 'button';
    dlJson.addEventListener('click', function () {
      var t = selTbl.value;
      window.location.href = '/api/admin/system-ops/backup?format=json' + (t && t !== 'all' ? '&table=' + encodeURIComponent(t) : '');
    });

    var dlCsv = el('button', 'so-btn', '⬇ Export Table CSV');
    dlCsv.type = 'button';
    dlCsv.addEventListener('click', function () {
      var t = selTbl.value === 'all' ? 'job_articles' : selTbl.value;
      window.location.href = '/api/admin/system-ops/backup?format=csv&table=' + encodeURIComponent(t);
    });

    bkActs.appendChild(dlJson);
    bkActs.appendChild(dlCsv);
    bkRow.appendChild(fTbl);
    bkRow.appendChild(bkActs);
    opsCard.appendChild(bkRow);
    shell.appendChild(opsCard);

    // 3. Edge 301/302 Redirects Manager
    var redCard = el('section', 'so-card');
    redCard.appendChild(el('h2', 'so-title', 'Edge 301 / 302 Redirect Rules (' + S.redirects.length + ')'));
    redCard.appendChild(el('p', 'so-sub', 'Active rules in D1 redirects are enforced at the Cloudflare Worker edge before route resolution.'));

    var addForm = el('form', 'so-form-row');
    addForm.noValidate = true;

    var fSrc = el('div', 'so-field');
    var lSrc = el('label', 'so-label', 'Source Path *');
    lSrc.setAttribute('for', 'soRedirSource');
    var iSrc = el('input', 'so-input');
    iSrc.id = 'soRedirSource';
    iSrc.placeholder = '/old-notice-path/';
    fSrc.appendChild(lSrc);
    fSrc.appendChild(iSrc);

    var fTgt = el('div', 'so-field');
    var lTgt = el('label', 'so-label', 'Target URL *');
    lTgt.setAttribute('for', 'soRedirTarget');
    var iTgt = el('input', 'so-input');
    iTgt.id = 'soRedirTarget';
    iTgt.placeholder = '/jobs/';
    fTgt.appendChild(lTgt);
    fTgt.appendChild(iTgt);

    var fCode = el('div', 'so-field');
    var lCode = el('label', 'so-label', 'HTTP Status');
    lCode.setAttribute('for', 'soRedirCode');
    var sCode = el('select', 'so-select');
    sCode.id = 'soRedirCode';
    var o301 = el('option', '', '301 Permanent'); o301.value = '301';
    var o302 = el('option', '', '302 Temporary'); o302.value = '302';
    sCode.appendChild(o301);
    sCode.appendChild(o302);
    fCode.appendChild(lCode);
    fCode.appendChild(sCode);

    var addBtn = el('button', 'so-btn so-btn--primary', '+ Add Redirect Rule');
    addBtn.type = 'submit';

    addForm.appendChild(fSrc);
    addForm.appendChild(fTgt);
    addForm.appendChild(fCode);
    addForm.appendChild(addBtn);

    addForm.addEventListener('submit', function (ev) {
      ev.preventDefault();
      api('redirects', 'POST', {
        source_path: iSrc.value.trim(),
        target_url: iTgt.value.trim(),
        status_code: Number(sCode.value)
      }).then(function () {
        toast('Redirect rule saved live at edge', 'ok');
        loadSystemData();
      }).catch(function (err) {
        toast('Redirect error: ' + err.message, 'crimson');
      });
    });
    redCard.appendChild(addForm);

    if (!S.redirects.length) {
      redCard.appendChild(el('div', 'so-empty', 'No custom redirect rules configured yet (0). Add a rule above to enforce 301/302 redirects at the edge.'));
    } else {
      var rtWrap = el('div', 'so-table-wrap');
      var rTbl = el('table', 'so-table');
      var rThead = el('thead');
      var rHr = el('tr');
      ['Source Path', 'Target URL', 'Code', 'Status', 'Actions'].forEach(function (h) { rHr.appendChild(el('th', '', h)); });
      rThead.appendChild(rHr);
      rTbl.appendChild(rThead);

      var rBody = el('tbody');
      S.redirects.forEach(function (r) {
        var tr = el('tr');
        tr.appendChild(el('td', 'so-mono', r.source_path));
        tr.appendChild(el('td', 'so-mono', r.target_url));
        tr.appendChild(el('td', '', String(r.status_code)));
        var tdSt = el('td');
        tdSt.appendChild(el('span', 'so-badge ' + (r.is_active ? 'so-badge--on' : 'so-badge--off'), r.is_active ? 'Active' : 'Paused'));
        tr.appendChild(tdSt);

        var tdAct = el('td');
        var actRow = el('div', 'so-actions');
        var tog = el('button', 'so-btn', r.is_active ? 'Pause' : 'Activate');
        tog.type = 'button';
        tog.addEventListener('click', function () {
          api('redirects/' + encodeURIComponent(r.id), 'PUT', { is_active: !r.is_active }).then(loadSystemData).catch(function (err) {
            toast(err.message, 'crimson');
          });
        });
        var del = el('button', 'so-btn so-btn--danger', 'Delete');
        del.type = 'button';
        del.addEventListener('click', function () {
          if (!window.confirm('Delete redirect ' + r.source_path + '?')) return;
          api('redirects/' + encodeURIComponent(r.id), 'DELETE').then(loadSystemData).catch(function (err) {
            toast(err.message, 'crimson');
          });
        });
        actRow.appendChild(tog);
        actRow.appendChild(del);
        tdAct.appendChild(actRow);
        tr.appendChild(tdAct);
        rBody.appendChild(tr);
      });
      rTbl.appendChild(rBody);
      rtWrap.appendChild(rTbl);
      redCard.appendChild(rtWrap);
    }
    shell.appendChild(redCard);
  }

  function renderBillingTab(shell) {
    var host = el('div', 'so-billing-host');
    shell.appendChild(host);
    if (window.CSOBillingAds && typeof window.CSOBillingAds.render === 'function') {
      window.CSOBillingAds.render(host);
    } else {
      var card = el('section', 'so-card');
      card.appendChild(el('h2', 'so-title', 'Payments & Ads Studio'));
      card.appendChild(el('div', 'so-empty', 'Loading Payments & Ads module… Reload if the script did not finish loading.'));
      host.appendChild(card);
    }
  }

  function render() {
    if (!S.root) return;
    clear(S.root);
    clear(S.headerActions);

    var refBtn = el('button', 'so-btn', '↻ Refresh Live Data');
    refBtn.type = 'button';
    refBtn.addEventListener('click', function () {
      if (S.activeTab === 'security') loadSecurityData();
      else if (S.activeTab === 'system') loadSystemData();
      else if (window.CSOBillingAds && window.CSOBillingAds.refresh) window.CSOBillingAds.refresh();
      else render();
    });
    if (S.headerActions) S.headerActions.appendChild(refBtn);

    var shell = el('div', 'so-shell');
    renderTabs(shell);

    if (S.lastError) {
      var errCard = el('section', 'so-card');
      errCard.appendChild(el('h2', 'so-title', 'System Operations Access Notice'));
      errCard.appendChild(el('p', 'so-sub', S.lastError));
      shell.appendChild(errCard);
    } else if (S.activeTab === 'security') {
      renderSecurityTab(shell);
    } else if (S.activeTab === 'system') {
      renderSystemTab(shell);
    } else {
      renderBillingTab(shell);
    }

    S.root.appendChild(shell);
  }

  window.CSOSystemOps = {
    render: function (root, headerActions, initialTab) {
      S.root = root;
      S.headerActions = headerActions;
      if (initialTab && ['security', 'system', 'billing'].indexOf(initialTab) !== -1) {
        S.activeTab = initialTab;
      }
      render();
      if (S.activeTab === 'security') loadSecurityData();
      else if (S.activeTab === 'system') loadSystemData();
    }
  };
})(window, document);
