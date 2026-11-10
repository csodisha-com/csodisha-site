/**
 * Super Admin State & Persistence Layer (super-store.js)
 * Common Sense Odisha (csodisha.com)
 * 
 * Provides centralized, reactive persistence across all 10 Super Admin modules:
 * 1. Overview & Telemetry
 * 2. User Registry & Verification
 * 3. Role & RBAC Matrix
 * 4. Content Studio & Dynamic Page Builder
 * 5. System Settings & Node Integrations
 * 6. Security Centre & Session Monitor
 * 7. Immutable Audit Trail
 * 8. Cloudflare D1 Monitoring & Schema
 * 9. Backup & Disaster Recovery
 * 10. Notification Hub & Public Broadcasts
 */

(function (window) {
  'use strict';

  // Storage Keys
  const KEYS = {
    USERS: 'cso_super_users',
    ROLES: 'cso_super_roles',
    PAGES: 'cso_super_pages',
    SYSTEM: 'cso_super_system',
    SECURITY: 'cso_super_security',
    AUDIT: 'cso_super_audit',
    D1: 'cso_super_d1',
    NOTIFICATIONS: 'cso_super_notifications',
    BROADCAST: 'cso_active_announcement',
    SUBMISSIONS: 'cso_admin_submissions_local',
    INQUIRIES: 'cso_super_inquiries',
    RESOURCES: 'cso_super_resources'
  };

  // Seed Data Generators
  const SEED_RESOURCES = [
    { id: "RES-101", title: "OSSC CGL 2026 Detailed Syllabus & Scheme", category: "State Exams", format: "PDF (1.2 MB)", downloads: 8450, status: "Live" },
    { id: "RES-102", title: "Odisha B.Ed Entrance Pedagogy Notes & PYQ", category: "Teaching", format: "PDF (3.8 MB)", downloads: 14200, status: "Live" },
    { id: "RES-103", title: "Medhabruti Scholarship Application Checklist", category: "Scholarships", format: "Guide / Web", downloads: 5310, status: "Live" },
    { id: "RES-104", title: "CHSE Odisha +2 Science Mathematics Solutions", category: "Higher Secondary", format: "PDF (5.4 MB)", downloads: 9120, status: "Live" },
    { id: "RES-105", title: "OTET 2026 Paper I & II Exam Pattern", category: "Teacher Eligibility", format: "PDF (850 KB)", downloads: 3100, status: "Needs Review" }
  ];

  const SEED_USERS = [
    {
      id: 'USR-8901',
      name: 'Aditya Dash',
      email: 'aditya.dash@gmail.com',
      phone: '+91 94370 12345',
      status: 'Verified',
      role: 'Super Admin',
      registeredAt: '2026-10-12T09:30:00Z',
      lastLogin: '2026-11-08T15:20:00Z',
      verified: true
    },
    {
      id: 'USR-8902',
      name: 'Priyanka Mohapatra',
      email: 'priyanka.m@utkal.ac.in',
      phone: '+91 70081 98765',
      status: 'Verified',
      role: 'Administrator',
      registeredAt: '2026-10-18T14:15:00Z',
      lastLogin: '2026-11-08T11:45:00Z',
      verified: true
    },
    {
      id: 'USR-8903',
      name: 'Bikash Chandra Sahoo',
      email: 'bikash.sahoo@outlook.com',
      phone: '+91 98610 54321',
      status: 'Pending Verification',
      role: 'Moderator',
      registeredAt: '2026-11-05T08:10:00Z',
      lastLogin: '2026-11-07T16:00:00Z',
      verified: false
    },
    {
      id: 'USR-8904',
      name: 'Smrutirekha Jena',
      email: 'smruti.jena@vssut.ac.in',
      phone: '+91 82490 11223',
      status: 'Verified',
      role: 'Support Desk',
      registeredAt: '2026-10-25T11:20:00Z',
      lastLogin: '2026-11-08T14:00:00Z',
      verified: true
    },
    {
      id: 'USR-8905',
      name: 'Kailash Pattnaik (Suspicious)',
      email: 'kailash.crawler@unknown-bot.net',
      phone: '+91 91234 56789',
      status: 'Suspended',
      role: 'Support Desk',
      registeredAt: '2026-11-06T03:40:00Z',
      lastLogin: '2026-11-06T03:45:00Z',
      verified: false
    },
    {
      id: 'USR-8906',
      name: 'Lipsa Pradhan',
      email: 'lipsa.pradhan@gmail.com',
      phone: '+91 94371 67890',
      status: 'Verified',
      role: 'Administrator',
      registeredAt: '2026-10-29T16:50:00Z',
      lastLogin: '2026-11-08T10:10:00Z',
      verified: true
    }
  ];

  const SEED_ROLES = [
    {
      id: 'super_admin',
      name: 'Super Admin',
      description: 'Absolute platform authority: Full CRUD across all 10 modules, D1 direct controls, and emergency protocols.',
      usersCount: 1,
      permissions: {
        telemetry_view: true,
        users_manage: true,
        rbac_delegate: true,
        cms_publish: true,
        system_flags: true,
        security_waf: true,
        audit_export: true,
        database_run: true,
        disaster_recovery: true,
        broadcast_manage: true
      }
    },
    {
      id: 'administrator',
      name: 'Administrator',
      description: 'Operational authority: Content publishing, user verification, and inquiry resolution.',
      usersCount: 2,
      permissions: {
        telemetry_view: true,
        users_manage: true,
        rbac_delegate: false,
        cms_publish: true,
        system_flags: false,
        security_waf: false,
        audit_export: true,
        database_run: false,
        disaster_recovery: false,
        broadcast_manage: true
      }
    },
    {
      id: 'moderator',
      name: 'Moderator',
      description: 'Content review, resource tagging, and community thread dispatch.',
      usersCount: 1,
      permissions: {
        telemetry_view: true,
        users_manage: false,
        rbac_delegate: false,
        cms_publish: false,
        system_flags: false,
        security_waf: false,
        audit_export: false,
        database_run: false,
        disaster_recovery: false,
        broadcast_manage: false
      }
    },
    {
      id: 'support_desk',
      name: 'Support Desk',
      description: 'Read-only access to inquiries and public assistance tickets.',
      usersCount: 2,
      permissions: {
        telemetry_view: true,
        users_manage: false,
        rbac_delegate: false,
        cms_publish: false,
        system_flags: false,
        security_waf: false,
        audit_export: false,
        database_run: false,
        disaster_recovery: false,
        broadcast_manage: false
      }
    }
  ];

  const SEED_PAGES = [
    {
      id: 'page-1',
      title: 'Common Sense Odisha - Home Portal',
      slug: '/',
      template: 'Standard Portal',
      status: 'Published',
      updatedAt: '2026-11-08T12:00:00Z',
      seoDescription: 'Empowering Odisha’s students and professionals with transparent employment notifications, state scholarship guides, and digital study assets.',
      seoKeywords: 'Odisha jobs, OPSC, OSSSC, Odisha scholarships, Medhabruti'
    },
    {
      id: 'page-2',
      title: 'About the Common Sense Movement',
      slug: '/about/',
      template: 'Standard Article',
      status: 'Published',
      updatedAt: '2026-11-07T18:30:00Z',
      seoDescription: 'Learn why Common Sense Odisha is dedicated to verified public guidance without ad clutter or misleading portals.',
      seoKeywords: 'About CSO, Odisha education mission, student trust'
    },
    {
      id: 'page-3',
      title: 'Odisha State Schemes & Benefits Compass',
      slug: '/schemes-benefits/',
      template: 'Full-Width Resource',
      status: 'Published',
      updatedAt: '2026-11-08T14:10:00Z',
      seoDescription: 'Searchable directory of 1,066+ welfare and student assistance schemes in Odisha.',
      seoKeywords: 'Kalia, Balaram, Nirman Shramik, Medhabruti, Sudakshya'
    },
    {
      id: 'page-4',
      title: 'Jobs & Careers Public Recruitment Tracker',
      slug: '/jobs-careers/',
      template: 'Full-Width Resource',
      status: 'Published',
      updatedAt: '2026-11-08T15:00:00Z',
      seoDescription: 'Verified notifications from OPSC, OSSSC, OSSC, and Central PSU opportunities in Odisha.',
      seoKeywords: 'OPSC recruitment, OSSSC Combined Exam, Odisha Government Jobs'
    },
    {
      id: 'page-5',
      title: 'Odisha Civil Services 2026 Syllabus Master Guide',
      slug: '/study/examinations/opsc-ocs-syllabus-2026',
      template: 'Syllabus Guide',
      status: 'Published',
      updatedAt: '2026-11-06T11:20:00Z',
      seoDescription: 'Detailed breakdown of Prelims Paper I, Paper II (CSAT) qualifying marks, and Mains Optional syllabus.',
      seoKeywords: 'OPSC OCS Syllabus, Odisha civil service pattern 2026'
    },
    {
      id: 'page-6',
      title: 'Pre-Matric & Post-Matric Scholarship Renewal Draft',
      slug: '/schemes/scholarship-renewal-guide-draft',
      template: 'Standard Article',
      status: 'Draft',
      updatedAt: '2026-11-08T09:15:00Z',
      seoDescription: 'Step-by-step renewal manual for Aadhaar authentication on Odisha State Scholarship Portal.',
      seoKeywords: 'Scholarship renewal, Odisha scholarship portal'
    }
  ];

  const SEED_SYSTEM = {
    flags: {
      registrationOpen: true,
      inquiryDispatch: true,
      maintenanceMode: false,
      turnstileRequired: true,
      cacheTTLSeconds: 86400
    },
    mail: {
      inboundPrimary: 'admin@csodisha.com',
      inboundSupport: 'contact@csodisha.com',
      forwardingDestination: 'cso.team.odisha@gmail.com',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpSecure: true,
      lastSmtpCheck: '2026-11-08T14:30:00Z',
      smtpStatus: 'Connected & Verified'
    },
    customCode: {
      headCode: '<!-- Google tag (gtag.js) analytics injected via CSO Super Admin -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-CSODISHA2026"></script>',
      bodyCode: '<!-- CSO Edge Performance Beacon v2.4 -->'
    }
  };

  const SEED_SECURITY = {
    activeSessions: [
      {
        id: 'SES-001',
        user: 'admin@csodisha.com',
        role: 'Super Admin',
        ip: '103.145.74.22',
        geo: 'Bhubaneswar, Odisha (IN)',
        device: 'Chrome 131 on Linux / x86_64',
        loginTime: '2026-11-08T15:26:00Z',
        isCurrent: true
      },
      {
        id: 'SES-002',
        user: 'priyanka.m@utkal.ac.in',
        role: 'Administrator',
        ip: '117.211.88.94',
        geo: 'Cuttack, Odisha (IN)',
        device: 'Firefox 132 on Windows 11',
        loginTime: '2026-11-08T11:45:00Z',
        isCurrent: false
      },
      {
        id: 'SES-003',
        user: 'smruti.jena@vssut.ac.in',
        role: 'Support Desk',
        ip: '115.187.42.10',
        geo: 'Sambalpur, Odisha (IN)',
        device: 'Safari 18 on macOS',
        loginTime: '2026-11-08T14:00:00Z',
        isCurrent: false
      }
    ],
    ipRules: [
      { ip: '103.145.74.0/24', action: 'Whitelist', note: 'CSO Lead HQ - Master Subnet', addedAt: '2026-10-01' },
      { ip: '185.220.101.5', action: 'Block', note: 'Tor Exit Node Automated Scanner', addedAt: '2026-11-02' },
      { ip: '45.154.255.89', action: 'Block', note: 'Brute Force Attempt on /admin/login', addedAt: '2026-11-07' }
    ],
    waf: {
      rateLimitRequestsPerMin: 60,
      adminIpRestrictionEnabled: false,
      turnstileChallengeLevel: 'Managed Challenge (Cloudflare AI)'
    }
  };

  const SEED_AUDIT = [
    {
      id: 'AUD-991',
      timestamp: '2026-11-08T15:47:01Z',
      actor: 'admin@csodisha.com',
      eventType: 'AUTH_LOGIN_SUCCESS',
      target: 'admin@csodisha.com',
      ip: '103.145.74.22',
      details: 'Super Administrator authenticated via Passkey token gateway.'
    },
    {
      id: 'AUD-990',
      timestamp: '2026-11-08T15:30:12Z',
      actor: 'admin@csodisha.com',
      eventType: 'CACHE_PURGED',
      target: 'CDN-ALL-PAGES',
      ip: '103.145.74.22',
      details: 'Global edge cache purge triggered for /admin/* and /api/*'
    },
    {
      id: 'AUD-989',
      timestamp: '2026-11-08T14:12:00Z',
      actor: 'priyanka.m@utkal.ac.in',
      eventType: 'INQUIRY_STATUS_CHANGE',
      target: 'INQ-2026-1079',
      ip: '117.211.88.94',
      details: 'Marked OSHEC Grant inquiry as "Resolved" and dispatched confirmation email.'
    },
    {
      id: 'AUD-988',
      timestamp: '2026-11-08T12:05:40Z',
      actor: 'admin@csodisha.com',
      eventType: 'BANNER_PUBLISHED',
      target: 'HOMEPAGE_BROADCAST',
      ip: '103.145.74.22',
      details: 'Published notice: "OSSC Combined Recruitment Exam Admit Cards Live".'
    },
    {
      id: 'AUD-987',
      timestamp: '2026-11-07T18:22:15Z',
      actor: 'admin@csodisha.com',
      eventType: 'SECURITY_IP_BLOCKED',
      target: '45.154.255.89',
      ip: '103.145.74.22',
      details: 'Automated defense rule blocked malicious crawler attempting passkey enumeration.'
    },
    {
      id: 'AUD-986',
      timestamp: '2026-11-07T10:14:00Z',
      actor: 'admin@csodisha.com',
      eventType: 'PAGE_PUBLISHED',
      target: 'page-5',
      ip: '103.145.74.22',
      details: 'Published new resource: Odisha Civil Services 2026 Syllabus Master Guide.'
    }
  ];

  const SEED_D1 = {
    stats: {
      dbName: 'cso-primary-d1-prod',
      region: 'ap-south-1 (Bhubaneswar/Kolkata)',
      sizeBytes: 14258900, // ~13.6 MB
      readQueries24h: 84210,
      writeQueries24h: 3120,
      avgLatencyMs: 14.2
    },
    tables: [
      { name: 'users', rows: 6, columns: 8, sizeKb: 48 },
      { name: 'submissions', rows: 8, columns: 10, sizeKb: 72 },
      { name: 'pages', rows: 6, columns: 9, sizeKb: 120 },
      { name: 'audit_logs', rows: 142, columns: 7, sizeKb: 280 },
      { name: 'broadcasts', rows: 3, columns: 8, sizeKb: 24 },
      { name: 'system_config', rows: 1, columns: 4, sizeKb: 16 }
    ]
  };

  const SEED_NOTIFICATIONS = [
    {
      id: 'NOTIF-1',
      severity: 'info',
      title: 'Cloudflare Edge Synced',
      message: 'All edge nodes serving latest build with 0 broken routes.',
      timestamp: '2026-11-08T15:45:00Z',
      read: false
    },
    {
      id: 'NOTIF-2',
      severity: 'warning',
      title: 'Failed Passkey Attempt Throttled',
      message: 'Single login failure from IP 45.154.255.89 was rate-limited.',
      timestamp: '2026-11-08T14:10:00Z',
      read: false
    },
    {
      id: 'NOTIF-3',
      severity: 'emergency',
      title: 'OSSC Admit Card Surge',
      message: 'Concurrent visitors reached 4,800+ upon notification release.',
      timestamp: '2026-11-08T12:00:00Z',
      read: true
    }
  ];

  const SEED_INQUIRIES = [
    {
      id: 'INQ-2026-1082',
      name: 'Subrat Kumar Mohanty',
      email: 'subrat.mohanty@gmail.com',
      phone: '+91 94371 88290',
      district: 'Cuttack',
      subject: 'OPSC Civil Services Preliminary Syllabus clarification',
      message: "Respected team, could you please verify if the recent CSAT pattern update has been published in the jobs & careers portal? The syllabus link for General Studies Paper II seems to refer to last year's notification. Thank you for maintaining this excellent platform for Odisha students.",
      timestamp: '2026-11-08T14:45:20Z',
      status: 'unread'
    },
    {
      id: 'INQ-2026-1081',
      name: 'Priyadarshini Rout',
      email: 'priya.rout99@yahoo.co.in',
      phone: '+91 70081 23456',
      district: 'Sambalpur',
      subject: 'Medhabruti Scholarship renewal application deadline',
      message: "Hello CSO Team, I am an engineering student studying at VSSUT Burla. I wanted to confirm the last date for submitting the income declaration certificate on the State Scholarship Portal for Medhabruti renewal. Your portal's scheme tracker has been very helpful.",
      timestamp: '2026-11-08T12:15:05Z',
      status: 'unread'
    },
    {
      id: 'INQ-2026-1079',
      name: 'Dr. Bijaylaxmi Das',
      email: 'bijaylaxmi.das@utkaluniversity.ac.in',
      phone: '+91 98610 99412',
      district: 'Khordha',
      subject: 'Odisha Higher Education Faculty Research Grant details',
      message: "Dear CSO Editorial Team, We recently published a state-funded research index under OSHEC. Would it be possible to include the OSHEC Post-Doctoral Fellowship details in your Study Library under Odisha Higher Education opportunities? Happy to provide official notification PDFs.",
      timestamp: '2026-11-07T18:32:40Z',
      status: 'read'
    },
    {
      id: 'INQ-2026-1076',
      name: 'Chandan Behera',
      email: 'chandan.behera.od@outlook.com',
      phone: '+91 99380 55123',
      district: 'Balasore',
      subject: 'OSSSC Combined Recruitment Examination Admit Card link',
      message: "Greetings, The download link for OSSSC Junior Assistant admit card leads to server maintenance on the official OSSSC site. Does CSO maintain an alternative mirror link or cache? Looking forward to your guidance.",
      timestamp: '2026-11-07T09:10:15Z',
      status: 'resolved'
    }
  ];

  // Store Initialization Helper
  function getOrSet(key, defaultValue) {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
      localStorage.setItem(key, JSON.stringify(defaultValue));
      return defaultValue;
    } catch (_) {
      return defaultValue;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`SuperStore save error for [${key}]:`, e);
    }
  }

  // SuperStore Core Controller
  const SuperStore = {
    // 1. Users
    getUsers() {
      return getOrSet(KEYS.USERS, SEED_USERS);
    },
    saveUsers(users) {
      save(KEYS.USERS, users);
    },
    toggleUserStatus(userId) {
      const users = this.getUsers();
      const user = users.find(u => u.id === userId);
      if (user) {
        user.status = user.status === 'Suspended' ? 'Verified' : 'Suspended';
        this.saveUsers(users);
        this.logAudit(
          user.status === 'Suspended' ? 'USER_SUSPENDED' : 'USER_REINSTATED',
          user.id,
          `User ${user.name} (${user.email}) status changed to ${user.status}.`
        );
      }
      return user;
    },
    verifyUser(userId) {
      const users = this.getUsers();
      const user = users.find(u => u.id === userId);
      if (user) {
        user.status = 'Verified';
        user.verified = true;
        this.saveUsers(users);
        this.logAudit('USER_VERIFIED', user.id, `Manual email verification triggered for ${user.email}.`);
      }
      return user;
    },

    // 2. Roles
    getRoles() {
      return getOrSet(KEYS.ROLES, SEED_ROLES);
    },
    saveRoles(roles) {
      save(KEYS.ROLES, roles);
    },
    assignUserRole(userId, newRoleName) {
      const users = this.getUsers();
      const user = users.find(u => u.id === userId);
      if (user) {
        const oldRole = user.role;
        user.role = newRoleName;
        this.saveUsers(users);
        this.logAudit('ROLE_DELEGATION', user.id, `Delegated role for ${user.email} changed from ${oldRole} to ${newRoleName}.`);
      }
      return user;
    },

    // 3. Pages / CMS
    getPages() {
      return getOrSet(KEYS.PAGES, SEED_PAGES);
    },
    savePages(pages) {
      save(KEYS.PAGES, pages);
    },
    savePage(pageData) {
      const pages = this.getPages();
      const existingIdx = pages.findIndex(p => p.id === pageData.id);
      if (existingIdx >= 0) {
        pages[existingIdx] = { ...pages[existingIdx], ...pageData, updatedAt: new Date().toISOString() };
      } else {
        pages.unshift({
          id: 'page-' + Date.now().toString(36),
          updatedAt: new Date().toISOString(),
          ...pageData
        });
      }
      this.savePages(pages);
      this.logAudit(
        pageData.status === 'Published' ? 'PAGE_PUBLISHED' : 'PAGE_DRAFT_SAVED',
        pageData.slug || pageData.title,
        `CMS Page "${pageData.title}" (${pageData.slug}) status: ${pageData.status}.`
      );
      return pages;
    },

    // 4. System Settings
    getSystem() {
      return getOrSet(KEYS.SYSTEM, SEED_SYSTEM);
    },
    saveSystem(sys) {
      save(KEYS.SYSTEM, sys);
      this.logAudit('SYSTEM_CONFIG_UPDATED', 'GLOBAL_SETTINGS', 'System feature flags and SMTP configurations updated.');
    },

    // 5. Security
    getSecurity() {
      return getOrSet(KEYS.SECURITY, SEED_SECURITY);
    },
    saveSecurity(sec) {
      save(KEYS.SECURITY, sec);
    },
    revokeSession(sessionId) {
      const sec = this.getSecurity();
      sec.activeSessions = sec.activeSessions.filter(s => s.id !== sessionId);
      this.saveSecurity(sec);
      this.logAudit('SESSION_REVOKED', sessionId, `Super Admin revoked active session ${sessionId}.`);
      return sec.activeSessions;
    },
    addIpRule(ip, action, note) {
      const sec = this.getSecurity();
      sec.ipRules.unshift({ ip, action, note, addedAt: new Date().toISOString().split('T')[0] });
      this.saveSecurity(sec);
      this.logAudit(action === 'Block' ? 'SECURITY_IP_BLOCKED' : 'SECURITY_IP_WHITELISTED', ip, note);
      return sec.ipRules;
    },

    // 6. Audit Trail
    getAudit() {
      return getOrSet(KEYS.AUDIT, SEED_AUDIT);
    },
    logAudit(eventType, target, details) {
      const logs = this.getAudit();
      const newEntry = {
        id: 'AUD-' + Math.floor(1000 + Math.random() * 9000),
        timestamp: new Date().toISOString(),
        actor: 'admin@csodisha.com',
        eventType,
        target,
        ip: '103.145.74.22',
        details
      };
      logs.unshift(newEntry);
      if (logs.length > 200) logs.pop();
      save(KEYS.AUDIT, logs);
      return newEntry;
    },

    // Audit Query & Management Extensions (module-01-004)
    getAllAuditLogs(filterType = 'ALL', search = '') {
      let logs = this.getAudit();
      if (!Array.isArray(logs)) logs = [];

      // Normalize search term
      const s = (search || '').toLowerCase().trim();

      // Normalize filter type
      const f = (filterType || 'ALL').toUpperCase();

      return logs.filter(entry => {
        // Normalize properties across different audit schemas (eventType / type, details / description)
        const typeStr = (entry.eventType || entry.type || '').toUpperCase();
        const descStr = (entry.details || entry.description || '').toLowerCase();
        const idStr = (entry.id || '').toLowerCase();
        const actorStr = (entry.actor || '').toLowerCase();

        // 1. Filter match
        let matchesType = true;
        if (f !== 'ALL') {
          if (f === 'AUTH') {
            matchesType = typeStr.includes('AUTH');
          } else if (f === 'BROADCAST') {
            matchesType = typeStr.includes('BROADCAST') || typeStr.includes('BANNER') || typeStr.includes('FLASH');
          } else if (f === 'EDGE') {
            matchesType = typeStr.includes('EDGE') || typeStr.includes('CACHE') || typeStr.includes('CDN');
          } else if (f === 'HEALTH') {
            matchesType = typeStr.includes('HEALTH') || typeStr.includes('DIAG');
          } else if (f === 'BACKUP') {
            matchesType = typeStr.includes('BACKUP') || typeStr.includes('SNAPSHOT') || typeStr.includes('RESTORE');
          } else if (f === 'SECURITY') {
            matchesType = typeStr.includes('SECURITY') || typeStr.includes('LOCK') || typeStr.includes('ZERO_TRUST') || typeStr.includes('SESSION');
          } else {
            matchesType = typeStr === f;
          }
        }

        if (!matchesType) return false;

        // 2. Search match
        if (s) {
          const inDesc = descStr.includes(s);
          const inType = typeStr.toLowerCase().includes(s);
          const inId = idStr.includes(s);
          const inActor = actorStr.includes(s);
          if (!inDesc && !inType && !inId && !inActor) return false;
        }

        return true;
      }).sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    },

    pruneAuditLogs(keepCount = 20) {
      let logs = this.getAudit();
      if (!Array.isArray(logs)) logs = [];

      const initialCount = logs.length;
      const pruned = logs.slice(0, keepCount);
      save(KEYS.AUDIT, pruned);

      this.logAudit('AUDIT_LOGS_PRUNED', 'AUDIT_STORAGE', `Audit trail pruned: retained newest ${pruned.length} records (removed ${Math.max(0, initialCount - pruned.length)} older entries).`);
      return this.getAudit();
    },

    exportAuditLogs(filteredLogs) {
      const dataToExport = filteredLogs || this.getAudit();
      const jsonStr = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const filename = `cso-audit-stream-${Date.now()}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.logAudit('AUDIT_LOGS_EXPORTED', 'DATA_EXPORT', `Exported ${dataToExport.length} audit records to ${filename}.`);
      return filename;
    },

    // 7. D1 Telemetry
    getD1() {
      return getOrSet(KEYS.D1, SEED_D1);
    },

    // 8. Notifications & Broadcasts (module-01-005)
    getNotifications(filter = 'ALL') {
      let list = null;
      try {
        const raw = localStorage.getItem('cso_admin_notifications') || localStorage.getItem(KEYS.NOTIFICATIONS);
        if (raw) list = JSON.parse(raw);
      } catch (_) {}

      if (!list || !Array.isArray(list) || list.length === 0) {
        list = [
          {
            id: 'NOTIF-001',
            title: 'Student Inquiries Pending Review',
            category: 'STUDENT',
            priority: 'HIGH',
            message: 'New admissions and syllabus queries logged via contact.html require review.',
            read: false,
            createdAt: Date.now() - 3600000
          },
          {
            id: 'NOTIF-002',
            title: 'Edge Deployment Active',
            category: 'SYSTEM',
            priority: 'LOW',
            message: 'Cloudflare Pages deployment verified at Singapore (SIN) edge.',
            read: false,
            createdAt: Date.now() - 7200000
          },
          {
            id: 'NOTIF-003',
            title: 'SHA-256 Auth Enforcement Active',
            category: 'SECURITY',
            priority: 'MEDIUM',
            message: 'Zero-trust credential hashing and 2-hour sliding sessions are enabled.',
            read: true,
            createdAt: Date.now() - 86400000
          }
        ];
        try {
          localStorage.setItem('cso_admin_notifications', JSON.stringify(list));
          localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(list));
        } catch (_) {}
      }

      // Filter options: ALL, UNREAD, READ, SYSTEM, SECURITY, STUDENT
      const f = (filter || 'ALL').toUpperCase();
      let filtered = list;
      if (f === 'UNREAD') {
        filtered = list.filter(n => !n.read);
      } else if (f === 'READ') {
        filtered = list.filter(n => n.read);
      } else if (f !== 'ALL') {
        filtered = list.filter(n => (n.category || '').toUpperCase() === f);
      }

      return filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    },

    saveNotifications(notifs) {
      save('cso_admin_notifications', notifs);
      save(KEYS.NOTIFICATIONS, notifs);
    },

    markNotificationRead(id, isRead = true) {
      let list = this.getNotifications('ALL');
      const item = list.find(n => n.id === id);
      if (item) {
        item.read = isRead;
        this.saveNotifications(list);
        this.logAudit('NOTIFICATION_STATUS_UPDATED', 'NOTIFICATIONS', `Notification ${id} marked as ${isRead ? 'read' : 'unread'}.`);
      }
      return item;
    },

    markAllNotificationsRead() {
      let list = this.getNotifications('ALL');
      list.forEach(n => n.read = true);
      this.saveNotifications(list);
      this.logAudit('ALL_NOTIFICATIONS_READ', 'NOTIFICATIONS', 'All administrative notifications marked as read.');
      return list;
    },

    deleteNotification(id) {
      let list = this.getNotifications('ALL');
      const prevLength = list.length;
      list = list.filter(n => n.id !== id);
      if (list.length !== prevLength) {
        this.saveNotifications(list);
        this.logAudit('NOTIFICATION_DELETED', 'NOTIFICATIONS', `Notification ${id} removed from system.`);
      }
      return list;
    },

    createNotification(notifData) {
      let list = this.getNotifications('ALL');
      const newNotif = {
        id: 'NOTIF-' + Date.now().toString().slice(-4),
        title: (notifData.title || 'Administrative Notice').trim(),
        category: (notifData.category || 'SYSTEM').toUpperCase(),
        priority: (notifData.priority || 'MEDIUM').toUpperCase(),
        message: (notifData.message || '').trim(),
        read: false,
        createdAt: Date.now()
      };
      list.unshift(newNotif);
      this.saveNotifications(list);
      this.logAudit('NOTIFICATION_CREATED', 'NOTIFICATIONS', `New administrative alert created: "${newNotif.title}" [Priority: ${newNotif.priority}].`);
      return newNotif;
    },
    getActiveBroadcast() {
      try {
        const raw = localStorage.getItem(KEYS.BROADCAST);
        return raw ? JSON.parse(raw) : null;
      } catch (_) {
        return null;
      }
    },
    publishBroadcast(broadcast) {
      if (broadcast && broadcast.isActive === undefined) {
        broadcast.isActive = true;
      }
      save(KEYS.BROADCAST, broadcast);
      this.logAudit('BANNER_PUBLISHED', 'HOMEPAGE_BROADCAST', `Emergency banner published: "${broadcast.headline}" [Severity: ${broadcast.severity}]`);
    },
    takedownBroadcast() {
      localStorage.removeItem(KEYS.BROADCAST);
      this.logAudit('BANNER_TAKEDOWN', 'HOMEPAGE_BROADCAST', 'Active homepage announcement removed.');
    },

    // 14. Website Analytics & Client Environment Telemetry (module-01-007)
    getAnalyticsData() {
      let data = null;
      try {
        const raw = localStorage.getItem('cso_analytics_store');
        if (raw) data = JSON.parse(raw);
      } catch (_) {}

      const clientEnv = {
        userAgent: (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : 'Mozilla/5.0 (Server / Node Runtime)',
        platform: (typeof navigator !== 'undefined' && navigator.platform) ? navigator.platform : 'Linux x86_64',
        language: (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'en-US',
        screenResolution: (typeof window !== 'undefined' && window.screen) ? (window.screen.width + 'x' + window.screen.height) : '1920x1080',
        onlineStatus: (typeof navigator !== 'undefined' && navigator.onLine) ? 'Online (HTTP/2)' : 'Offline',
        hardwareConcurrency: (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : 4
      };

      if (!data || typeof data !== 'object') {
        data = {
          totalPageViews: 8421,
          uniqueSessions: 3120,
          cacheHitRatio: "98.4%",
          avgLatencyMs: 16,
          topRoutes: [
            { path: "/", title: "Homepage Portal", views: 4210, lastHit: "Just now", status: "200 OK" },
            { path: "/resources.html", title: "Educational Resources Directory", views: 2840, lastHit: "4m ago", status: "200 OK" },
            { path: "/contact.html", title: "Inquiry & Contact Desk", views: 820, lastHit: "12m ago", status: "200 OK" },
            { path: "/admin/", title: "Super Admin Control Console", views: 430, lastHit: "Just now", status: "200 OK" },
            { path: "/about.html", title: "About Us Mission Page", views: 121, lastHit: "1h ago", status: "200 OK" }
          ],
          deviceBreakdown: {
            mobile: 68,
            desktop: 32
          },
          currentClientEnvironment: clientEnv
        };
        try {
          localStorage.setItem('cso_analytics_store', JSON.stringify(data));
        } catch (_) {}
      } else {
        // Update client environment dynamically
        data.currentClientEnvironment = clientEnv;
      }

      return data;
    },

    recordPageView(path) {
      let data = this.getAnalyticsData();
      data.totalPageViews = (data.totalPageViews || 0) + 1;

      if (Array.isArray(data.topRoutes)) {
        const route = data.topRoutes.find(r => r.path === path);
        if (route) {
          route.views = (route.views || 0) + 1;
          route.lastHit = 'Just now';
        } else {
          data.topRoutes.push({
            path,
            title: path,
            views: 1,
            lastHit: 'Just now',
            status: '200 OK'
          });
        }
      }

      try {
        localStorage.setItem('cso_analytics_store', JSON.stringify(data));
      } catch (_) {}
      return data;
    },

    resetAnalytics() {
      const resetData = {
        totalPageViews: 0,
        uniqueSessions: 1,
        cacheHitRatio: "100%",
        avgLatencyMs: 12,
        topRoutes: [
          { path: "/", title: "Homepage Portal", views: 0, lastHit: "Reset", status: "200 OK" },
          { path: "/resources.html", title: "Educational Resources Directory", views: 0, lastHit: "Reset", status: "200 OK" },
          { path: "/contact.html", title: "Inquiry & Contact Desk", views: 0, lastHit: "Reset", status: "200 OK" },
          { path: "/admin/", title: "Super Admin Control Console", views: 0, lastHit: "Reset", status: "200 OK" },
          { path: "/about.html", title: "About Us Mission Page", views: 0, lastHit: "Reset", status: "200 OK" }
        ],
        deviceBreakdown: {
          mobile: 70,
          desktop: 30
        },
        currentClientEnvironment: {
          userAgent: (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : 'Mozilla/5.0',
          platform: (typeof navigator !== 'undefined' && navigator.platform) ? navigator.platform : 'Linux',
          language: (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : 'en-US',
          screenResolution: (typeof window !== 'undefined' && window.screen) ? (window.screen.width + 'x' + window.screen.height) : '1920x1080',
          onlineStatus: 'Online (HTTP/2)',
          hardwareConcurrency: (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : 4
        }
      };

      try {
        localStorage.setItem('cso_analytics_store', JSON.stringify(resetData));
      } catch (_) {}

      this.logAudit('ANALYTICS_COUNTERS_RESET', 'TELEMETRY_ENGINE', 'All client session analytics and route view counters reset to zero.');
      return resetData;
    },

    exportAnalyticsReport() {
      const data = this.getAnalyticsData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const filename = `cso-analytics-report-${Date.now()}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.logAudit('ANALYTICS_REPORT_EXPORTED', 'DATA_EXPORT', `Analytics telemetry report exported (${filename}).`);
      return filename;
    },

    // 15. Pages Directory & Route Tracking Engine (module-02-001)
    getAllPages(filterTemplate = 'ALL', search = '') {
      let pages = null;
      try {
        const raw = localStorage.getItem('cso_pages_store');
        if (raw) pages = JSON.parse(raw);
      } catch (_) {}

      if (!pages || !Array.isArray(pages) || pages.length === 0) {
        const today = new Date().toISOString().slice(0, 10);
        pages = [
          { id: "PAGE-001", path: "/", file: "index.html", title: "Homepage & Portal Gate", template: "Portal Landing", status: "Live", sizeKb: "23.9", lastModified: today },
          { id: "PAGE-002", path: "/resources.html", file: "resources.html", title: "Educational Resources Directory", template: "Educational Matrix", status: "Live", sizeKb: "28.5", lastModified: today },
          { id: "PAGE-003", path: "/about/", file: "about/index.html", title: "About CS Odisha Mission", template: "Standard Content", status: "Live", sizeKb: "8.8", lastModified: today },
          { id: "PAGE-004", path: "/contact.html", file: "contact.html", title: "Student Contact & Inquiries", template: "Form Desk", status: "Live", sizeKb: "14.1", lastModified: today },
          { id: "PAGE-005", path: "/privacy-policy/", file: "privacy-policy/index.html", title: "Privacy Policy", template: "Legal Core", status: "Live", sizeKb: "6.3", lastModified: today },
          { id: "PAGE-006", path: "/terms-of-use/", file: "terms-of-use/index.html", title: "Terms & Conditions", template: "Legal Core", status: "Live", sizeKb: "6.2", lastModified: today },
          { id: "PAGE-007", path: "/disclaimer/", file: "disclaimer/index.html", title: "Disclaimer & Notices", template: "Legal Core", status: "Live", sizeKb: "6.0", lastModified: today },
          { id: "PAGE-008", path: "/admin/login.html", file: "admin/login.html", title: "Security Auth Gate", template: "Security Portal", status: "Live", sizeKb: "21.7", lastModified: today },
          { id: "PAGE-009", path: "/admin/", file: "admin/index.html", title: "Master Super Admin Console", template: "Admin Workspace", status: "Live", sizeKb: "12.5", lastModified: today },
          { id: "PAGE-010", path: "/career-guidance/", file: "career-guidance/index.html", title: "Career Guidance Compass", template: "Educational Matrix", status: "Live", sizeKb: "47.0", lastModified: today },
          { id: "PAGE-011", path: "/community/", file: "community/index.html", title: "Student Community Hub", template: "Portal Landing", status: "Live", sizeKb: "8.8", lastModified: today },
          { id: "PAGE-012", path: "/community/join/", file: "community/join/index.html", title: "Join Community Forum", template: "Form Desk", status: "Live", sizeKb: "13.2", lastModified: today },
          { id: "PAGE-013", path: "/copyright-policy/", file: "copyright-policy/index.html", title: "Copyright & Intellectual Property", template: "Legal Core", status: "Live", sizeKb: "6.0", lastModified: today },
          { id: "PAGE-014", path: "/education-explorer/", file: "education-explorer/index.html", title: "Odisha Education Explorer", template: "Educational Matrix", status: "Live", sizeKb: "0.4", lastModified: today },
          { id: "PAGE-015", path: "/job-opportunity-finder/", file: "job-opportunity-finder/index.html", title: "Job Opportunity Finder", template: "Educational Matrix", status: "Live", sizeKb: "32.6", lastModified: today },
          { id: "PAGE-016", path: "/jobs-careers/", file: "jobs-careers/index.html", title: "Public Jobs & Careers", template: "Educational Matrix", status: "Live", sizeKb: "16.7", lastModified: today },
          { id: "PAGE-017", path: "/opportunity-compass/", file: "opportunity-compass/index.html", title: "State Opportunity Compass", template: "Educational Matrix", status: "Live", sizeKb: "20.3", lastModified: today },
          { id: "PAGE-018", path: "/scheme-opportunity-finder/", file: "scheme-opportunity-finder/index.html", title: "Scheme Opportunity Finder", template: "Educational Matrix", status: "Live", sizeKb: "10.1", lastModified: today },
          { id: "PAGE-019", path: "/schemes-benefits/", file: "schemes-benefits/index.html", title: "Welfare Schemes & Benefits", template: "Educational Matrix", status: "Live", sizeKb: "8.9", lastModified: today },
          { id: "PAGE-020", path: "/scholarship-guidance/", file: "scholarship-guidance/index.html", title: "State Scholarship Guidance", template: "Educational Matrix", status: "Live", sizeKb: "0.4", lastModified: today },
          { id: "PAGE-021", path: "/study-library/", file: "study-library/index.html", title: "Study Library & Repositories", template: "Educational Matrix", status: "Live", sizeKb: "8.9", lastModified: today },
          { id: "PAGE-022", path: "/study-path-finder/", file: "study-path-finder/index.html", title: "Interactive Study Path Finder", template: "Educational Matrix", status: "Live", sizeKb: "0.4", lastModified: today },
          { id: "PAGE-023", path: "/study/examinations/", file: "study/examinations/index.html", title: "State Examinations Hub", template: "Educational Matrix", status: "Live", sizeKb: "4.4", lastModified: today },
          { id: "PAGE-024", path: "/study/", file: "study/index.html", title: "Odisha Academic Studies Hub", template: "Educational Matrix", status: "Live", sizeKb: "8.3", lastModified: today },
          { id: "PAGE-025", path: "/support/", file: "support/index.html", title: "Help & Student Support", template: "Form Desk", status: "Live", sizeKb: "9.4", lastModified: today },
          { id: "PAGE-026", path: "/trust-layer/", file: "trust-layer/index.html", title: "Trust Layer & Verification", template: "Standard Content", status: "Live", sizeKb: "35.0", lastModified: today }
        ];

        try {
          localStorage.setItem('cso_pages_store', JSON.stringify(pages));
        } catch (_) {}
      }

      const templateFilter = (filterTemplate || 'ALL').toUpperCase();
      const sq = (search || '').toLowerCase().trim();

      return pages.filter(p => {
        if (templateFilter !== 'ALL' && (p.template || '').toUpperCase() !== templateFilter) {
          return false;
        }
        if (sq) {
          const matchPath = (p.path || '').toLowerCase().includes(sq);
          const matchFile = (p.file || '').toLowerCase().includes(sq);
          const matchTitle = (p.title || '').toLowerCase().includes(sq);
          if (!matchPath && !matchFile && !matchTitle) return false;
        }
        return true;
      });
    },

    saveAllPages(pages) {
      save('cso_pages_store', pages);
    },

    async probePageStatus(path) {
      const probeUrl = path.startsWith('http') ? path : (typeof window !== 'undefined' ? (window.location.origin + path) : path);
      const start = performance.now();
      try {
        const res = await fetch(probeUrl + (probeUrl.includes('?') ? '&' : '?') + 'probe=' + Date.now(), {
          method: 'HEAD',
          cache: 'no-store'
        });
        const latency = Math.round(performance.now() - start);
        return {
          path,
          status: res.status,
          statusText: res.statusText || (res.ok ? 'OK' : 'Error'),
          ok: res.ok,
          latencyMs: latency
        };
      } catch (err) {
        return {
          path,
          status: 0,
          statusText: 'Unreachable / Network Error',
          ok: false,
          latencyMs: Math.round(performance.now() - start)
        };
      }
    },

    exportPagesInventory() {
      const pages = this.getAllPages('ALL', '');
      const timestamp = Date.now();
      const filename = `cso-pages-inventory-${timestamp}.json`;
      const payload = {
        inventoryVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        totalRoutes: pages.length,
        pages: pages
      };

      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.logAudit('PAGES_INVENTORY_EXPORTED', 'ROUTING_ENGINE', `Pages directory inventory exported (${filename}, ${pages.length} routes).`);
      return filename;
    },

    // Page Builder & Provisioning Engine (module-02-002)
    generateSanitizedSlug(title) {
      if (!title || typeof title !== 'string') return 'page.html';
      let slug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      if (slug.endsWith('.html')) return slug;
      return (slug || 'untitled') + '.html';
    },

    checkSlugCollision(slug) {
      if (!slug) return false;
      const cleanSlug = slug.startsWith('/') ? slug.slice(1) : slug;
      const targetPath = '/' + cleanSlug;
      const pages = this.getAllPages('ALL', '');
      return pages.some(p => {
        const pPath = (p.path || '').toLowerCase();
        const pFile = (p.file || '').toLowerCase();
        return pPath === targetPath.toLowerCase() || pFile === cleanSlug.toLowerCase();
      });
    },

    saveNewPage(pageData, isDraft = false) {
      const pageId = 'PAGE-' + Date.now().toString().slice(-4);
      const cleanSlug = pageData.slug.startsWith('/') ? pageData.slug.slice(1) : pageData.slug;
      const content = pageData.content || '';
      const sizeKb = ((content.length * 2) / 1024).toFixed(1);

      const newPage = {
        id: pageId,
        path: '/' + cleanSlug,
        file: cleanSlug,
        title: pageData.title || 'Untitled Page',
        template: pageData.template || 'Standard Content',
        status: isDraft ? 'Draft' : 'Live',
        sizeKb: sizeKb,
        lastModified: new Date().toISOString().slice(0, 10),
        metaDescription: pageData.metaDescription || '',
        robots: pageData.robots || 'index, follow',
        htmlContent: content
      };

      const pages = this.getAllPages('ALL', '');
      pages.unshift(newPage);
      this.saveAllPages(pages);

      const auditType = isDraft ? 'PAGE_DRAFT_SAVED' : 'PAGE_CREATED';
      this.logAudit(auditType, 'PAGE_BUILDER', `New page "${newPage.title}" (${newPage.path}) provisioned as ${newPage.status}.`);

      return newPage;
    },

    downloadPageHtml(page) {
      if (!page) return;
      let html = page.htmlContent || '';

      // Wrap with full HTML5 boilerplate if not already full document
      if (!html.toLowerCase().includes('<!doctype html>')) {
        html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title} - Common Sense Odisha</title>
  <meta name="description" content="${page.metaDescription || 'Common Sense Odisha public educational resources and notices.'}">
  <meta name="robots" content="${page.robots || 'index, follow'}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-[#040810] text-slate-100 font-sans min-h-screen flex flex-col antialiased selection:bg-emerald-500 selection:text-white">
  <header class="border-b border-slate-800 bg-[#060c18]/90 backdrop-blur sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
    <a href="/" class="flex items-center gap-2 font-bold text-lg text-white">
      <span class="w-3 h-3 rounded-full bg-emerald-400"></span>
      CS Odisha
    </a>
    <nav class="flex items-center gap-4 text-xs font-semibold text-slate-300">
      <a href="/" class="hover:text-emerald-400">Home</a>
      <a href="/resources.html" class="hover:text-emerald-400">Resources</a>
      <a href="/contact.html" class="hover:text-emerald-400">Contact</a>
    </nav>
  </header>

  <main class="flex-grow max-w-5xl mx-auto w-full px-6 py-10">
    ${html}
  </main>

  <footer class="border-t border-slate-800 bg-[#060c18] py-8 text-center text-xs text-slate-500 font-mono">
    &copy; 2026 Common Sense Odisha (csodisha.com). Empowering students and youth across Odisha.
  </footer>
</body>
</html>`;
      }

      const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const filename = page.file || `${page.id.toLowerCase()}.html`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },

    // Visual Page Builder Preset Components & Mutation Engine (module-02-003)
    getBlockMarkup(blockType) {
      const blocks = {
        hero: `<!-- Block: Odisha Hero Section -->
<section class="py-12 px-6 rounded-2xl bg-gradient-to-br from-[#071328] via-[#091830] to-[#040914] border border-cyan-900/40 text-center space-y-4 my-4 shadow-xl">
  <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold">
    <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
    Verified Public Notice &bull; State of Odisha
  </div>
  <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
    Empowering Aspirants Across All 30 Districts
  </h1>
  <p class="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
    Access direct application links, authorized syllabus breakdowns, and document verification schedules without misleading ads or paywalls.
  </p>
  <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
    <a href="/resources.html" class="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg transition">
      Explore State Syllabi &rarr;
    </a>
    <a href="/contact.html" class="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition">
      Contact Help Desk
    </a>
  </div>
</section>`,

        cards: `<!-- Block: 3-Card Recruitment Grid -->
<section class="py-6 my-4 space-y-4">
  <div class="flex items-center justify-between border-b border-slate-800 pb-2">
    <h2 class="text-lg font-bold text-white">Featured Career & Examination Portals</h2>
    <span class="text-xs text-slate-500 font-mono">3 Streams Active</span>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="p-4 rounded-xl bg-[#081220] border border-slate-800 hover:border-slate-700 transition space-y-2.5">
      <div class="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold font-mono text-xs">
        OSSC
      </div>
      <h3 class="font-bold text-white text-sm">OSSC CGL & Specialist Posts</h3>
      <p class="text-xs text-slate-400">Combined Graduate Level preliminary syllabus, pattern changes, and official notifications.</p>
      <a href="/resources.html" class="inline-block text-xs font-mono text-emerald-400 hover:underline pt-1">&rarr; View OSSC Hub</a>
    </div>

    <div class="p-4 rounded-xl bg-[#081220] border border-slate-800 hover:border-slate-700 transition space-y-2.5">
      <div class="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold font-mono text-xs">
        OPSC
      </div>
      <h3 class="font-bold text-white text-sm">Odisha Civil Services (OAS/OPS)</h3>
      <p class="text-xs text-slate-400">Prelims, Mains optional papers, state service syllabus, and previous question papers.</p>
      <a href="/resources.html" class="inline-block text-xs font-mono text-cyan-400 hover:underline pt-1">&rarr; View OPSC Hub</a>
    </div>

    <div class="p-4 rounded-xl bg-[#081220] border border-slate-800 hover:border-slate-700 transition space-y-2.5">
      <div class="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold font-mono text-xs">
        B.Ed
      </div>
      <h3 class="font-bold text-white text-sm">State Teaching & OTET/OSSTET</h3>
      <p class="text-xs text-slate-400">Teacher Eligibility Test criteria, pedagogy preparation guides, and district vacancies.</p>
      <a href="/resources.html" class="inline-block text-xs font-mono text-indigo-400 hover:underline pt-1">&rarr; View Teaching Hub</a>
    </div>
  </div>
</section>`,

        notice: `<!-- Block: High-Priority Notice Banner -->
<div class="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 my-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
  <div class="flex items-start gap-3">
    <div class="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
    </div>
    <div>
      <h4 class="text-sm font-bold text-white">Urgent Notice: Document Verification Schedule Released</h4>
      <p class="text-xs text-slate-300 mt-0.5">All shortlisted candidates must report to the designated district nodal centers with original credentials.</p>
    </div>
  </div>
  <a href="/resources.html" class="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs whitespace-nowrap self-start sm:self-auto transition">
    Download Schedule (PDF)
  </a>
</div>`,

        syllabusTable: `<!-- Block: Exam Pattern & Syllabus Table -->
<div class="my-6 rounded-xl bg-[#081220] border border-slate-800 overflow-hidden shadow">
  <div class="p-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
    <h3 class="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">Examination Pattern & Marks Weightage</h3>
    <span class="text-[10px] text-emerald-400 font-mono">Updated 2026 Format</span>
  </div>
  <div class="overflow-x-auto">
    <table class="w-full text-left text-xs border-collapse">
      <thead>
        <tr class="bg-slate-950/60 text-slate-400 font-mono border-b border-slate-800">
          <th class="py-2.5 px-4">Subject / Section</th>
          <th class="py-2.5 px-4 text-center">Questions</th>
          <th class="py-2.5 px-4 text-center">Total Marks</th>
          <th class="py-2.5 px-4 text-right">Duration</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-800/60 text-slate-300 font-sans">
        <tr class="hover:bg-slate-800/30">
          <td class="py-2.5 px-4 font-semibold text-white">General Studies & Odisha Heritage</td>
          <td class="py-2.5 px-4 text-center font-mono">50</td>
          <td class="py-2.5 px-4 text-center font-mono text-emerald-400 font-bold">50</td>
          <td class="py-2.5 px-4 text-right font-mono">60 Mins</td>
        </tr>
        <tr class="hover:bg-slate-800/30">
          <td class="py-2.5 px-4 font-semibold text-white">Quantitative Aptitude & Reasoning</td>
          <td class="py-2.5 px-4 text-center font-mono">50</td>
          <td class="py-2.5 px-4 text-center font-mono text-emerald-400 font-bold">50</td>
          <td class="py-2.5 px-4 text-right font-mono">60 Mins</td>
        </tr>
        <tr class="hover:bg-slate-800/30">
          <td class="py-2.5 px-4 font-semibold text-white">Odia Language & English Grammar</td>
          <td class="py-2.5 px-4 text-center font-mono">50</td>
          <td class="py-2.5 px-4 text-center font-mono text-emerald-400 font-bold">50</td>
          <td class="py-2.5 px-4 text-right font-mono">60 Mins</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>`,

        faq: `<!-- Block: Collapsible FAQ Container -->
<div class="my-6 space-y-3">
  <h3 class="text-sm font-bold text-white mb-2">Frequently Asked Candidate Questions</h3>
  <details class="group p-3.5 rounded-xl bg-[#081220] border border-slate-800 open:border-slate-700 transition">
    <summary class="flex items-center justify-between cursor-pointer text-xs font-semibold text-slate-200">
      <span>Is there negative marking in the preliminary objective exam?</span>
      <span class="text-slate-400 group-open:rotate-180 transition-transform">&darr;</span>
    </summary>
    <p class="mt-2.5 text-xs text-slate-400 leading-relaxed pt-2 border-t border-slate-800/60">
      Yes, 0.25 marks are deducted for every incorrect response in accordance with official commission guidelines.
    </p>
  </details>

  <details class="group p-3.5 rounded-xl bg-[#081220] border border-slate-800 open:border-slate-700 transition">
    <summary class="flex items-center justify-between cursor-pointer text-xs font-semibold text-slate-200">
      <span>Are other state candidates eligible for Odisha civil exams?</span>
      <span class="text-slate-400 group-open:rotate-180 transition-transform">&darr;</span>
    </summary>
    <p class="mt-2.5 text-xs text-slate-400 leading-relaxed pt-2 border-t border-slate-800/60">
      Candidates must have passed an Odia language test equivalent to Middle School standard to be eligible for state appointments.
    </p>
  </details>
</div>`,

        cta: `<!-- Block: Navy Full-Width CTA Banner -->
<section class="py-10 px-6 my-6 rounded-2xl bg-[#030914] border border-cyan-800/30 text-center space-y-4">
  <h2 class="text-2xl font-extrabold text-white">Stay Informed with Common Sense Odisha</h2>
  <p class="text-xs text-slate-400 max-w-xl mx-auto">
    Bookmark csodisha.com for transparent, verified guidance on scholarship deadlines, job openings, and civil exams across Odisha.
  </p>
  <div class="flex items-center justify-center gap-3 pt-1">
    <a href="/contact.html" class="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition">
      Join Student Network
    </a>
  </div>
</section>`
      };

      return blocks[blockType] || '<!-- Empty Block -->';
    },

    updatePageContent(pageId, newContent) {
      const pages = this.getAllPages('ALL', '');
      const page = pages.find(p => p.id === pageId || p.file === pageId || p.path === pageId);
      if (page) {
        page.htmlContent = newContent;
        page.sizeKb = ((newContent.length * 2) / 1024).toFixed(1);
        page.lastModified = new Date().toISOString().slice(0, 10);
        this.saveAllPages(pages);
        this.logAudit('PAGE_UPDATED_VIA_BUILDER', 'VISUAL_BUILDER', `Page "${page.title}" (${page.file}) content updated via Visual Builder.`);
        return page;
      }
      return null;
    },

    // 16. Homepage Builder & Live Config Engine (module-02-004)
    getHomepageConfig() {
      let config = null;
      try {
        const raw = localStorage.getItem('cso_homepage_config');
        if (raw) config = JSON.parse(raw);
      } catch (_) {}

      if (!config || typeof config !== 'object') {
        config = {
          hero: {
            badge: "Odisha's Dedicated Academic & Recruitment Hub",
            headline: "Empowering Aspirants Across All 30 Districts of Odisha",
            subheadline: "Instant access to authentic syllabus breakdowns, previous year papers, and state recruitment updates.",
            primaryCtaText: "Explore Syllabi & PYQs",
            primaryCtaUrl: "/resources.html",
            secondaryCtaText: "Contact Helpdesk",
            secondaryCtaUrl: "/contact.html",
            enabled: true
          },
          sections: [
            { id: "sec-notice", name: "Emergency Live Broadcast Banner", enabled: true },
            { id: "sec-badges", name: "Quick Examination Access Chips", enabled: true },
            { id: "sec-cards", name: "Core Portal Cards (OSSC, OPSC, Teaching)", enabled: true },
            { id: "sec-stats", name: "Platform Statistics Strip", enabled: true }
          ],
          stats: {
            aspirants: "12,480+",
            resources: "3,790+",
            districts: "30 Districts",
            enabled: true
          },
          lastUpdated: new Date().toISOString()
        };

        try {
          localStorage.setItem('cso_homepage_config', JSON.stringify(config));
        } catch (_) {}
      }

      return config;
    },

    saveHomepageConfig(config) {
      if (!config || typeof config !== 'object') return false;
      config.lastUpdated = new Date().toISOString();
      save('cso_homepage_config', config);
      this.logAudit('HOMEPAGE_CONFIG_UPDATED', 'HOMEPAGE_BUILDER', `Homepage dynamic layout and copy configuration updated.`);
      return config;
    },

    // 17. Landing Page Campaigns Management Engine (module-02-005)
    getLandingPages(filterCategory = 'ALL', filterStatus = 'ALL', search = '') {
      let pages = null;
      try {
        const raw = localStorage.getItem('cso_landing_pages_store');
        if (raw) pages = JSON.parse(raw);
      } catch (_) {}

      if (!pages || !Array.isArray(pages) || pages.length === 0) {
        pages = [
          {
            id: 'LP-01',
            title: 'OSSC CGL 2026 Preliminary Gateway',
            slug: 'ossc-cgl-2026',
            path: '/landing/ossc-cgl-2026.html',
            category: 'OSSC',
            status: 'Live',
            views: 1840,
            conversions: 261,
            conversionRate: '14.2%',
            expiry: '2026-12-31',
            createdAt: Date.now() - 604800000
          },
          {
            id: 'LP-02',
            title: 'OTET & OSSTET Teaching Entrance Special',
            slug: 'odisha-tet-2026',
            path: '/landing/odisha-tet-2026.html',
            category: 'Teaching',
            status: 'Live',
            views: 1210,
            conversions: 224,
            conversionRate: '18.5%',
            expiry: '2026-11-30',
            createdAt: Date.now() - 1209600000
          },
          {
            id: 'LP-03',
            title: 'Medhabruti & Post-Matric Scholarship Helpdesk',
            slug: 'scholarship-guide',
            path: '/landing/scholarship-guide.html',
            category: 'Scholarships',
            status: 'Draft',
            views: 0,
            conversions: 0,
            conversionRate: '0.0%',
            expiry: '2027-01-15',
            createdAt: Date.now() - 86400000
          }
        ];

        try {
          localStorage.setItem('cso_landing_pages_store', JSON.stringify(pages));
        } catch (_) {}
      }

      const catFilter = (filterCategory || 'ALL').toUpperCase();
      const statFilter = (filterStatus || 'ALL').toUpperCase();
      const sq = (search || '').toLowerCase().trim();

      return pages.filter(p => {
        if (catFilter !== 'ALL' && (p.category || '').toUpperCase() !== catFilter) {
          return false;
        }
        if (statFilter !== 'ALL' && (p.status || '').toUpperCase() !== statFilter) {
          return false;
        }
        if (sq) {
          const matchTitle = (p.title || '').toLowerCase().includes(sq);
          const matchSlug = (p.slug || '').toLowerCase().includes(sq);
          const matchCat = (p.category || '').toLowerCase().includes(sq);
          if (!matchTitle && !matchSlug && !matchCat) return false;
        }
        return true;
      });
    },

    saveLandingPages(pages) {
      save('cso_landing_pages_store', pages);
    },

    toggleLandingPageStatus(id) {
      const pages = this.getLandingPages('ALL', 'ALL', '');
      const page = pages.find(p => p.id === id);
      if (page) {
        const oldStatus = page.status;
        page.status = (oldStatus === 'Live') ? 'Paused' : 'Live';
        this.saveLandingPages(pages);
        this.logAudit('LANDING_PAGE_STATUS_TOGGLED', 'CAMPAIGN_MANAGER', `Campaign ${page.id} ("${page.title}") status changed from ${oldStatus} to ${page.status}.`);
        return page;
      }
      return null;
    },

    createLandingPage(payload) {
      const pages = this.getLandingPages('ALL', 'ALL', '');
      const uniqueId = 'LP-' + Date.now().toString().slice(-4);
      const cleanSlug = (payload.slug || payload.title || 'campaign')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-');

      const newPage = {
        id: uniqueId,
        title: payload.title || 'Untitled Campaign',
        slug: cleanSlug,
        path: `/landing/${cleanSlug}.html`,
        category: payload.category || 'General',
        status: 'Draft',
        views: 0,
        conversions: 0,
        conversionRate: '0.0%',
        expiry: payload.expiry || '2026-12-31',
        ctaUrl: payload.ctaUrl || '/resources.html',
        createdAt: Date.now()
      };

      pages.unshift(newPage);
      this.saveLandingPages(pages);
      this.logAudit('LANDING_PAGE_CREATED', 'CAMPAIGN_MANAGER', `New landing page campaign created: "${newPage.title}" (${newPage.id}).`);
      return newPage;
    },

    deleteLandingPage(id) {
      let pages = this.getLandingPages('ALL', 'ALL', '');
      const initialLen = pages.length;
      pages = pages.filter(p => p.id !== id);
      if (pages.length !== initialLen) {
        this.saveLandingPages(pages);
        this.logAudit('LANDING_PAGE_DELETED', 'CAMPAIGN_MANAGER', `Campaign ${id} removed.`);
        return true;
      }
      return false;
    },

    exportLandingPagesReport() {
      const pages = this.getLandingPages('ALL', 'ALL', '');
      const timestamp = Date.now();
      const filename = `cso-landing-campaigns-${timestamp}.json`;
      const report = {
        reportVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        totalCampaigns: pages.length,
        campaigns: pages
      };

      const jsonStr = JSON.stringify(report, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.logAudit('LANDING_PAGES_EXPORTED', 'DATA_EXPORT', `Landing page campaigns report exported (${filename}).`);
      return filename;
    },

    // 18. Page Templates Architecture Engine (module-02-006)
    getPageTemplates() {
      let templates = null;
      try {
        const raw = localStorage.getItem('cso_page_templates');
        if (raw) templates = JSON.parse(raw);
      } catch (_) {}

      if (!templates || !Array.isArray(templates) || templates.length === 0) {
        templates = [
          {
            id: 'TMPL-01',
            title: 'Portal Landing',
            description: 'High-impact recruitment and admissions landing page with hero banner and quick chips.',
            category: 'Landing',
            boilerplate: `<section class="py-16 text-center bg-slate-900 text-white"><div class="max-w-4xl mx-auto px-4"><span class="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-500/20">Official Portal</span><h1 class="text-4xl font-extrabold mt-4">Odisha Academic Portal</h1><p class="text-slate-400 mt-2">Comprehensive examination updates and resources.</p></div></section>`,
            lastModified: Date.now()
          },
          {
            id: 'TMPL-02',
            title: 'Educational Matrix',
            description: 'Structured table format for exam syllabus, mark weightage, and download links.',
            category: 'Education',
            boilerplate: `<section class="py-12 bg-slate-950 text-white"><div class="max-w-5xl mx-auto px-4"><h2 class="text-2xl font-bold mb-6">Syllabus Breakdown</h2><div class="overflow-x-auto"><table class="w-full text-left text-sm border border-slate-800"><thead class="bg-slate-900 text-slate-300"><tr><th class="p-3">Subject</th><th class="p-3">Marks</th><th class="p-3">Duration</th></tr></thead><tbody class="divide-y divide-slate-800"><tr><td class="p-3">General Studies</td><td class="p-3">100</td><td class="p-3">2 Hours</td></tr></tbody></table></div></div></section>`,
            lastModified: Date.now()
          },
          {
            id: 'TMPL-03',
            title: 'Standard Content',
            description: 'Optimized article and guide layout with sidebar navigation and clean typography.',
            category: 'Content',
            boilerplate: `<article class="max-w-3xl mx-auto py-12 px-4 text-slate-200"><h1 class="text-3xl font-bold text-white mb-4">Official Notification Overview</h1><p class="text-slate-400 leading-relaxed mb-6">Detailed guidelines for candidates appearing in the state examination.</p></article>`,
            lastModified: Date.now()
          },
          {
            id: 'TMPL-04',
            title: 'Form Desk',
            description: 'Interactive candidate submission form with validation and feedback states.',
            category: 'Forms',
            boilerplate: `<section class="max-w-xl mx-auto py-12 px-4"><div class="bg-slate-900 p-6 rounded-xl border border-slate-800"><h2 class="text-xl font-bold text-white mb-4">Submit Query</h2><form class="space-y-4"><input type="text" placeholder="Full Name" class="w-full p-2.5 rounded bg-slate-800 border border-slate-700 text-white text-sm"/><textarea placeholder="Your message..." class="w-full p-2.5 rounded bg-slate-800 border border-slate-700 text-white text-sm" rows="4"></textarea><button type="button" class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded text-sm">Submit</button></form></div></section>`,
            lastModified: Date.now()
          },
          {
            id: 'TMPL-05',
            title: 'Legal Core',
            description: 'Sectioned layout with version dates, clause numbering, and privacy standards.',
            category: 'Legal',
            boilerplate: `<section class="max-w-4xl mx-auto py-12 px-4 text-slate-300"><h1 class="text-3xl font-bold text-white mb-2">Terms & Policies</h1><p class="text-xs text-slate-500 mb-8">Last Updated: November 2026</p><div class="space-y-6"><h3 class="text-lg font-semibold text-white">1. Scope of Service</h3><p class="text-sm text-slate-400">All materials provided on csodisha.com are for educational guidance.</p></div></section>`,
            lastModified: Date.now()
          }
        ];

        try {
          localStorage.setItem('cso_page_templates', JSON.stringify(templates));
        } catch (_) {}
      }

      return templates;
    },

    savePageTemplates(templates) {
      save('cso_page_templates', templates);
    },

    updateTemplateBoilerplate(id, newBoilerplate) {
      const templates = this.getPageTemplates();
      const tmpl = templates.find(t => t.id === id);
      if (tmpl) {
        tmpl.boilerplate = newBoilerplate;
        tmpl.lastModified = Date.now();
        this.savePageTemplates(templates);
        this.logAudit('TEMPLATE_UPDATED', 'TEMPLATE_ENGINE', `Template ${tmpl.id} ("${tmpl.title}") boilerplate code updated.`);
        return tmpl;
      }
      return null;
    },

    exportTemplates() {
      const templates = this.getPageTemplates();
      const timestamp = Date.now();
      const filename = `cso-templates-bundle-${timestamp}.json`;
      const bundle = {
        bundleVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        totalTemplates: templates.length,
        templates: templates
      };

      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.logAudit('TEMPLATES_BUNDLE_EXPORTED', 'DATA_EXPORT', `Page templates bundle exported (${filename}).`);
      return filename;
    },

    // 19. Reusable Sections Component Engine (module-02-007)
    getReusableSections(filterType = 'ALL', search = '') {
      let sections = null;
      try {
        const raw = localStorage.getItem('cso_reusable_sections');
        if (raw) sections = JSON.parse(raw);
      } catch (_) {}

      if (!sections || !Array.isArray(sections) || sections.length === 0) {
        sections = [
          {
            id: 'SEC-01',
            title: 'Global Primary Navigation Bar',
            type: 'Header',
            tag: '<!-- CSO:NAV-GLOBAL -->',
            markup: `<nav class="w-full bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between"><div class="flex items-center gap-3"><span class="w-3 h-3 rounded-full bg-emerald-500"></span><span class="font-bold text-white tracking-wide">CS ODISHA</span></div><div class="flex items-center gap-6 text-sm text-slate-300"><a href="/" class="hover:text-emerald-400">Home</a><a href="/resources.html" class="hover:text-emerald-400">Resources</a><a href="/contact.html" class="hover:text-emerald-400">Helpdesk</a></div></nav>`,
            lastModified: Date.now() - 86400000
          },
          {
            id: 'SEC-02',
            title: 'Official Footer & Compliance',
            type: 'Footer',
            tag: '<!-- CSO:FOOTER-GLOBAL -->',
            markup: `<footer class="w-full bg-slate-950 border-t border-slate-800 py-10 px-6 text-center text-slate-400 text-xs"><p class="mb-2">Common Sense Odisha — Dedicated Education & State Examination Intelligence.</p><p class="text-slate-500">&copy; 2026 CS Odisha. All rights reserved across 30 districts.</p></footer>`,
            lastModified: Date.now() - 172800000
          },
          {
            id: 'SEC-03',
            title: 'Urgent Notice Flash Banner',
            type: 'Banner',
            tag: '<!-- CSO:BANNER-ALERT -->',
            markup: `<div class="bg-emerald-950 border-b border-emerald-500/30 text-emerald-200 px-4 py-2 text-xs flex items-center justify-between font-medium"><span>⚡ OPSC & OSSC 2026 Examination Schedule released. Check resources tab.</span><a href="/resources.html" class="underline text-emerald-400 hover:text-white">View Details &rarr;</a></div>`,
            lastModified: Date.now() - 43200000
          },
          {
            id: 'SEC-04',
            title: 'Candidate FAQ Accordion',
            type: 'Block',
            tag: '<!-- CSO:FAQ-ACCORDION -->',
            markup: `<div class="w-full max-w-3xl mx-auto space-y-3"><details class="bg-slate-900 border border-slate-800 rounded-lg p-4"><summary class="font-semibold text-white cursor-pointer">How do I verify syllabus revisions?</summary><p class="mt-2 text-sm text-slate-400">All materials uploaded to CSO are reconciled directly against state gazette notifications.</p></details></div>`,
            lastModified: Date.now() - 259200000
          },
          {
            id: 'SEC-05',
            title: 'Helpline & Social Desk',
            type: 'Sidebar',
            tag: '<!-- CSO:HELPLINE-BAR -->',
            markup: `<div class="bg-slate-900 border border-slate-800 p-4 rounded-xl text-xs space-y-2"><div class="text-white font-bold">Helpline & Queries</div><p class="text-slate-400">Email: help@csodisha.com</p><p class="text-slate-400">Hours: 09:00 - 18:00 IST</p></div>`,
            lastModified: Date.now() - 345600000
          }
        ];

        try {
          localStorage.setItem('cso_reusable_sections', JSON.stringify(sections));
        } catch (_) {}
      }

      const fType = (filterType || 'ALL').toUpperCase();
      const sq = (search || '').toLowerCase().trim();

      return sections.filter(sec => {
        if (fType !== 'ALL' && (sec.type || '').toUpperCase() !== fType) {
          return false;
        }
        if (sq) {
          const matchTitle = (sec.title || '').toLowerCase().includes(sq);
          const matchTag = (sec.tag || '').toLowerCase().includes(sq);
          const matchType = (sec.type || '').toLowerCase().includes(sq);
          if (!matchTitle && !matchTag && !matchType) return false;
        }
        return true;
      });
    },

    saveReusableSections(sections) {
      save('cso_reusable_sections', sections);
    },

    saveReusableSection(sectionData) {
      const sections = this.getReusableSections('ALL', '');
      let sec = null;

      if (sectionData.id) {
        sec = sections.find(s => s.id === sectionData.id);
        if (sec) {
          sec.title = sectionData.title || sec.title;
          sec.type = sectionData.type || sec.type;
          sec.markup = sectionData.markup || sec.markup;
          sec.lastModified = Date.now();
        }
      }

      if (!sec) {
        const newId = 'SEC-' + Date.now().toString().slice(-4);
        const tag = `<!-- CSO:${(sectionData.tagLabel || newId).toUpperCase()} -->`;
        sec = {
          id: newId,
          title: sectionData.title || 'Untitled Section',
          type: sectionData.type || 'Block',
          tag: tag,
          markup: sectionData.markup || '<!-- Empty Section Markup -->',
          lastModified: Date.now()
        };
        sections.unshift(sec);
      }

      this.saveReusableSections(sections);
      this.logAudit('SECTION_SAVED', 'COMPONENT_STUDIO', `Reusable section ${sec.id} ("${sec.title}") saved.`);
      return sec;
    },

    deleteReusableSection(id) {
      let sections = this.getReusableSections('ALL', '');
      const prevLen = sections.length;
      sections = sections.filter(s => s.id !== id);
      if (sections.length !== prevLen) {
        this.saveReusableSections(sections);
        this.logAudit('SECTION_DELETED', 'COMPONENT_STUDIO', `Reusable section ${id} removed.`);
        return true;
      }
      return false;
    },

    exportReusableSections() {
      const sections = this.getReusableSections('ALL', '');
      const timestamp = Date.now();
      const filename = `cso-reusable-sections-${timestamp}.json`;
      const bundle = {
        componentVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        totalSections: sections.length,
        sections: sections
      };

      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.logAudit('REUSABLE_SECTIONS_EXPORTED', 'DATA_EXPORT', `Reusable sections bundle exported (${filename}).`);
      return filename;
    },

    // 20. Page Revisions & Historical Rollback Engine (module-02-008)
    getPageRevisions(pageFilter = 'ALL') {
      let revisions = null;
      try {
        const raw = localStorage.getItem('cso_page_revisions');
        if (raw) revisions = JSON.parse(raw);
      } catch (_) {}

      if (!revisions || !Array.isArray(revisions) || revisions.length === 0) {
        revisions = [
          {
            id: 'REV-001',
            pageId: 'PAGE-001',
            pagePath: '/',
            title: 'Homepage & Portal Gate',
            version: 'v2.4',
            author: 'admin@csodisha.com',
            timestamp: Date.now() - 86400000,
            changeSummary: 'Updated hero headline copy and quick examination tags.',
            sizeKb: '23.9',
            snapshotHtml: '<!-- Homepage Snapshot v2.4 -->\n<section class="hero">\n  <h1>Common Sense Odisha</h1>\n  <p>Be Self-Reliant | Build a Better Tomorrow</p>\n</section>'
          },
          {
            id: 'REV-002',
            pageId: 'PAGE-002',
            pagePath: '/resources.html',
            title: 'Educational Resources Directory',
            version: 'v3.1',
            author: 'admin@csodisha.com',
            timestamp: Date.now() - 172800000,
            changeSummary: 'Added OSSC CGL 2026 preliminary syllabus table.',
            sizeKb: '28.5',
            snapshotHtml: '<!-- Resources Snapshot v3.1 -->\n<div class="resources-matrix">\n  <h2>OSSC CGL 2026 Syllabus Matrix</h2>\n</div>'
          },
          {
            id: 'REV-003',
            pageId: 'PAGE-004',
            pagePath: '/contact.html',
            title: 'Student Contact & Inquiries',
            version: 'v1.8',
            author: 'admin@csodisha.com',
            timestamp: Date.now() - 259200000,
            changeSummary: 'Added Odisha district dropdown selector and storage hooks.',
            sizeKb: '14.1',
            snapshotHtml: '<!-- Contact Snapshot v1.8 -->\n<form id="contactForm">\n  <select name="district"><option>Cuttack</option><option>Khordha</option></select>\n</form>'
          },
          {
            id: 'REV-004',
            pageId: 'PAGE-005',
            pagePath: '/privacy-policy/',
            title: 'Privacy Policy',
            version: 'v1.2',
            author: 'admin@csodisha.com',
            timestamp: Date.now() - 604800000,
            changeSummary: 'Updated data retention notice for academic candidates.',
            sizeKb: '6.3',
            snapshotHtml: '<!-- Privacy Snapshot v1.2 -->\n<article>\n  <h2>Candidate Privacy Protection</h2>\n</article>'
          }
        ];

        try {
          localStorage.setItem('cso_page_revisions', JSON.stringify(revisions));
        } catch (_) {}
      }

      const pFilter = pageFilter || 'ALL';
      let filtered = revisions;

      if (pFilter !== 'ALL') {
        filtered = revisions.filter(r => r.pagePath === pFilter || r.pageId === pFilter);
      }

      return filtered.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    },

    savePageRevisions(revisions) {
      save('cso_page_revisions', revisions);
    },

    restoreRevision(revisionId) {
      const revisions = this.getPageRevisions('ALL');
      const rev = revisions.find(r => r.id === revisionId);
      if (!rev) {
        throw new Error(`Revision ${revisionId} not found`);
      }

      const pages = this.getAllPages('ALL', '');
      const page = pages.find(p => p.id === rev.pageId || p.path === rev.pagePath);

      if (page) {
        page.lastModified = new Date().toISOString().slice(0, 10);
        page.sizeKb = rev.sizeKb || page.sizeKb;
        if (rev.snapshotHtml) {
          page.htmlContent = rev.snapshotHtml;
        }
        this.saveAllPages(pages);
      }

      this.logAudit('PAGE_REVISION_RESTORED', 'REVISION_CONTROL', `Revision ${rev.id} (${rev.version}) for "${rev.title}" restored.`);
      return { success: true, page, revision: rev };
    },

    createRevisionSnapshot(pageId, changeSummary = 'Manual snapshot created') {
      const pages = this.getAllPages('ALL', '');
      const page = pages.find(p => p.id === pageId || p.path === pageId);
      if (!page) return null;

      const revisions = this.getPageRevisions('ALL');
      const uniqueId = 'REV-' + Date.now().toString().slice(-4);
      const existingCount = revisions.filter(r => r.pageId === page.id).length;
      const versionStr = `v${existingCount + 1}.0`;

      const newRev = {
        id: uniqueId,
        pageId: page.id,
        pagePath: page.path,
        title: page.title,
        version: versionStr,
        author: 'admin@csodisha.com',
        timestamp: Date.now(),
        changeSummary: changeSummary,
        sizeKb: page.sizeKb || '15.0',
        snapshotHtml: page.htmlContent || `<!-- Snapshot ${versionStr} for ${page.title} -->`
      };

      revisions.unshift(newRev);
      this.savePageRevisions(revisions);
      this.logAudit('REVISION_SNAPSHOT_CREATED', 'REVISION_CONTROL', `Snapshot ${newRev.id} (${versionStr}) created for ${page.title}.`);
      return newRev;
    },

    exportRevisions() {
      const revisions = this.getPageRevisions('ALL');
      const timestamp = Date.now();
      const filename = `cso-page-revisions-${timestamp}.json`;
      const bundle = {
        revisionManifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        totalSnapshots: revisions.length,
        revisions: revisions
      };

      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.logAudit('PAGE_REVISIONS_EXPORTED', 'DATA_EXPORT', `Page revisions archive exported (${filename}).`);
      return filename;
    },

    // 21. Staged Drafts & Previews Engine (module-02-009)
    getPageDrafts(statusFilter = 'ALL') {
      let drafts = null;
      try {
        const raw = localStorage.getItem('cso_page_drafts');
        if (raw) drafts = JSON.parse(raw);
      } catch (_) {}

      if (!drafts || !Array.isArray(drafts) || drafts.length === 0) {
        drafts = [
          {
            id: 'DFT-001',
            title: 'OSSC Traffic Sub-Inspector 2026 Notification',
            path: '/ossc-traffic-si-2026.html',
            author: 'editorial@csodisha.com',
            progress: 85,
            status: 'Review Ready',
            lastSaved: Date.now() - 7200000,
            markup: '<div class="py-12 px-6 max-w-4xl mx-auto"><span class="bg-amber-500/10 text-amber-400 text-xs px-2.5 py-1 rounded-full border border-amber-500/20">Draft Preview</span><h1 class="text-3xl font-bold text-white mt-4">OSSC Traffic SI Recruitment 2026</h1><p class="text-slate-400 mt-2">Comprehensive syllabus, physical fitness criteria, and online application dates.</p></div>'
          },
          {
            id: 'DFT-002',
            title: 'Nirman Shramik Education Assistance Guide',
            path: '/scholarships/nirman-shramik-2026.html',
            author: 'academic@csodisha.com',
            progress: 60,
            status: 'In Progress',
            lastSaved: Date.now() - 21600000,
            markup: '<div class="py-12 px-6 max-w-4xl mx-auto"><span class="bg-amber-500/10 text-amber-400 text-xs px-2.5 py-1 rounded-full border border-amber-500/20">Draft Preview</span><h1 class="text-3xl font-bold text-white mt-4">Nirman Shramik Kalyan Yojana</h1><p class="text-slate-400 mt-2">Scholarship incentives for children of registered construction workers across Odisha.</p></div>'
          },
          {
            id: 'DFT-003',
            title: 'Tentative State Recruitment Calendar 2027',
            path: '/exam-calendar-2027.html',
            author: 'admin@csodisha.com',
            progress: 40,
            status: 'In Progress',
            lastSaved: Date.now() - 86400000,
            markup: '<div class="py-12 px-6 max-w-4xl mx-auto"><span class="bg-amber-500/10 text-amber-400 text-xs px-2.5 py-1 rounded-full border border-amber-500/20">Draft Preview</span><h1 class="text-3xl font-bold text-white mt-4">State Exam Schedule 2027</h1><p class="text-slate-400 mt-2">Preliminary roadmap for OPSC, OSSC, and BSE Odisha exams.</p></div>'
          }
        ];

        try {
          localStorage.setItem('cso_page_drafts', JSON.stringify(drafts));
        } catch (_) {}
      }

      const sFilter = (statusFilter || 'ALL').toUpperCase();
      let filtered = drafts;
      if (sFilter !== 'ALL') {
        filtered = drafts.filter(d => (d.status || '').toUpperCase() === sFilter);
      }

      return filtered.sort((a, b) => (b.lastSaved || 0) - (a.lastSaved || 0));
    },

    savePageDrafts(drafts) {
      save('cso_page_drafts', drafts);
    },

    savePageDraft(draftData) {
      const drafts = this.getPageDrafts('ALL');
      let draft = null;

      if (draftData.id) {
        draft = drafts.find(d => d.id === draftData.id);
        if (draft) {
          draft.title = draftData.title || draft.title;
          draft.path = draftData.path || draft.path;
          draft.author = draftData.author || draft.author;
          draft.progress = draftData.progress !== undefined ? draftData.progress : draft.progress;
          draft.status = draftData.status || draft.status;
          draft.markup = draftData.markup !== undefined ? draftData.markup : draft.markup;
          draft.lastSaved = Date.now();
        }
      }

      if (!draft) {
        const uniqueId = 'DFT-' + Date.now().toString().slice(-4);
        draft = {
          id: uniqueId,
          title: draftData.title || 'Untitled Draft',
          path: draftData.path || `/draft-${uniqueId.toLowerCase()}.html`,
          author: draftData.author || 'admin@csodisha.com',
          progress: draftData.progress !== undefined ? draftData.progress : 50,
          status: draftData.status || 'In Progress',
          markup: draftData.markup || '<div class="p-6 text-white">Draft Content</div>',
          lastSaved: Date.now()
        };
        drafts.unshift(draft);
      }

      this.savePageDrafts(drafts);
      this.logAudit('DRAFT_SAVED', 'STAGING_STUDIO', `Page draft ${draft.id} ("${draft.title}") saved.`);
      return draft;
    },

    promoteDraftToLive(draftId) {
      const drafts = this.getPageDrafts('ALL');
      const draft = drafts.find(d => d.id === draftId);
      if (!draft) {
        throw new Error(`Draft ${draftId} not found`);
      }

      const pages = this.getAllPages('ALL', '');
      const cleanPath = draft.path.startsWith('/') ? draft.path : '/' + draft.path;
      const cleanFile = cleanPath.replace(/^\//, '');
      const markup = draft.markup || '';
      const sizeKb = ((markup.length * 2) / 1024).toFixed(1);

      let targetPage = pages.find(p => p.path === cleanPath || p.file === cleanFile);
      if (targetPage) {
        targetPage.title = draft.title;
        targetPage.htmlContent = markup;
        targetPage.sizeKb = sizeKb;
        targetPage.status = 'Live';
        targetPage.lastModified = new Date().toISOString().slice(0, 10);
      } else {
        targetPage = {
          id: 'PAGE-' + Date.now().toString().slice(-4),
          path: cleanPath,
          file: cleanFile,
          title: draft.title,
          template: 'Standard Content',
          status: 'Live',
          sizeKb: sizeKb,
          lastModified: new Date().toISOString().slice(0, 10),
          htmlContent: markup
        };
        pages.unshift(targetPage);
      }

      this.saveAllPages(pages);

      // Remove from drafts
      const remainingDrafts = drafts.filter(d => d.id !== draftId);
      this.savePageDrafts(remainingDrafts);

      this.logAudit('DRAFT_PROMOTED_TO_LIVE', 'STAGING_STUDIO', `Draft ${draft.id} ("${draft.title}") promoted to live production route ${cleanPath}.`);
      return targetPage;
    },

    deleteDraft(draftId) {
      let drafts = this.getPageDrafts('ALL');
      const prevLen = drafts.length;
      drafts = drafts.filter(d => d.id !== draftId);
      if (drafts.length !== prevLen) {
        this.savePageDrafts(drafts);
        this.logAudit('DRAFT_DELETED', 'STAGING_STUDIO', `Draft ${draftId} removed from staging.`);
        return true;
      }
      return false;
    },

    exportDrafts() {
      const drafts = this.getPageDrafts('ALL');
      const timestamp = Date.now();
      const filename = `cso-staged-drafts-${timestamp}.json`;
      const bundle = {
        stagingManifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        totalDrafts: drafts.length,
        drafts: drafts
      };

      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.logAudit('PAGE_DRAFTS_EXPORTED', 'DATA_EXPORT', `Staged drafts archive exported (${filename}).`);
      return filename;
    },

    // 22. Scheduled Page Releases Engine (module-02-010)
    getScheduledPages(statusFilter = 'ALL') {
      let schedules = null;
      try {
        const raw = localStorage.getItem('cso_scheduled_pages');
        if (raw) schedules = JSON.parse(raw);
      } catch (_) {}

      if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
        schedules = [
          {
            id: 'SCH-001',
            title: 'OPSC OCS Prelims 2026 Merit List & Cutoff',
            path: '/notices/opsc-ocs-prelims-result-2026.html',
            author: 'admin@csodisha.com',
            publishAt: Date.now() + 259200000,
            status: 'Scheduled',
            markup: '<div class="max-w-4xl mx-auto py-12 px-6"><span class="bg-cyan-500/10 text-cyan-400 text-xs px-2.5 py-1 rounded-full border border-cyan-500/20 font-semibold">Official Gazette Notice</span><h1 class="text-3xl font-bold text-white mt-4">OPSC OCS Preliminary Results 2026</h1><p class="text-slate-400 mt-2">Official roll numbers of shortlisted candidates for Mains examination.</p></div>'
          },
          {
            id: 'SCH-002',
            title: 'OTET 2026 Paper I & II Hall Ticket Gate',
            path: '/hall-tickets/otet-2026-admit-card.html',
            author: 'academic@csodisha.com',
            publishAt: Date.now() + 604800000,
            status: 'Scheduled',
            markup: '<div class="max-w-4xl mx-auto py-12 px-6"><span class="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full border border-emerald-500/20 font-semibold">Direct Download Portal</span><h1 class="text-3xl font-bold text-white mt-4">OTET 2026 Admit Card Access</h1><p class="text-slate-400 mt-2">Download link and exam day instructions for candidates.</p></div>'
          },
          {
            id: 'SCH-003',
            title: 'Medhabruti Scholarship Merit List 2026',
            path: '/scholarships/medhabruti-merit-list-2026.html',
            author: 'admin@csodisha.com',
            publishAt: Date.now() - 86400000,
            status: 'Executed',
            markup: '<div class="max-w-4xl mx-auto py-12 px-6"><h1 class="text-3xl font-bold text-white">Medhabruti 2026 Selected Candidates</h1></div>'
          }
        ];

        try {
          localStorage.setItem('cso_scheduled_pages', JSON.stringify(schedules));
        } catch (_) {}
      }

      const sFilter = (statusFilter || 'ALL').toUpperCase();
      let filtered = schedules;
      if (sFilter !== 'ALL') {
        filtered = schedules.filter(s => (s.status || '').toUpperCase() === sFilter);
      }

      return filtered.sort((a, b) => (a.publishAt || 0) - (b.publishAt || 0));
    },

    saveScheduledPages(schedules) {
      save('cso_scheduled_pages', schedules);
    },

    saveScheduledPage(scheduleData) {
      const schedules = this.getScheduledPages('ALL');
      let item = null;

      if (scheduleData.id) {
        item = schedules.find(s => s.id === scheduleData.id);
        if (item) {
          item.title = scheduleData.title || item.title;
          item.path = scheduleData.path || item.path;
          item.author = scheduleData.author || item.author;
          item.publishAt = scheduleData.publishAt || item.publishAt;
          item.status = scheduleData.status || item.status;
          item.markup = scheduleData.markup !== undefined ? scheduleData.markup : item.markup;
        }
      }

      if (!item) {
        const uniqueId = 'SCH-' + Date.now().toString().slice(-4);
        item = {
          id: uniqueId,
          title: scheduleData.title || 'Untitled Scheduled Page',
          path: scheduleData.path || `/scheduled-${uniqueId.toLowerCase()}.html`,
          author: scheduleData.author || 'admin@csodisha.com',
          publishAt: scheduleData.publishAt || (Date.now() + 86400000),
          status: 'Scheduled',
          markup: scheduleData.markup || '<div class="p-6 text-white">Scheduled Content</div>'
        };
        schedules.unshift(item);
      }

      this.saveScheduledPages(schedules);
      this.logAudit('PAGE_SCHEDULED', 'SCHEDULING_ENGINE', `Page release scheduled: "${item.title}" for ${new Date(item.publishAt).toISOString()}.`);
      return item;
    },

    executeScheduledRelease(scheduleId) {
      const schedules = this.getScheduledPages('ALL');
      const item = schedules.find(s => s.id === scheduleId);
      if (!item) {
        throw new Error(`Scheduled item ${scheduleId} not found`);
      }

      const pages = this.getAllPages('ALL', '');
      const cleanPath = item.path.startsWith('/') ? item.path : '/' + item.path;
      const cleanFile = cleanPath.replace(/^\//, '');
      const markup = item.markup || '';
      const sizeKb = ((markup.length * 2) / 1024).toFixed(1);

      let targetPage = pages.find(p => p.path === cleanPath || p.file === cleanFile);
      if (targetPage) {
        targetPage.title = item.title;
        targetPage.htmlContent = markup;
        targetPage.sizeKb = sizeKb;
        targetPage.status = 'Live';
        targetPage.lastModified = new Date().toISOString().slice(0, 10);
      } else {
        targetPage = {
          id: 'PAGE-' + Date.now().toString().slice(-4),
          path: cleanPath,
          file: cleanFile,
          title: item.title,
          template: 'Standard Content',
          status: 'Live',
          sizeKb: sizeKb,
          lastModified: new Date().toISOString().slice(0, 10),
          htmlContent: markup
        };
        pages.unshift(targetPage);
      }

      this.saveAllPages(pages);

      // Mark executed
      item.status = 'Executed';
      item.executedAt = Date.now();
      this.saveScheduledPages(schedules);

      this.logAudit('SCHEDULED_PAGE_PUBLISHED', 'SCHEDULING_ENGINE', `Scheduled release ${item.id} published live to ${cleanPath}.`);
      return { success: true, item, page: targetPage };
    },

    cancelScheduledRelease(scheduleId) {
      const schedules = this.getScheduledPages('ALL');
      const item = schedules.find(s => s.id === scheduleId);
      if (item) {
        item.status = 'Cancelled';
        this.saveScheduledPages(schedules);
        this.logAudit('SCHEDULED_PAGE_CANCELLED', 'SCHEDULING_ENGINE', `Scheduled release ${item.id} cancelled.`);
        return item;
      }
      return null;
    },

    deleteScheduledPage(scheduleId) {
      let schedules = this.getScheduledPages('ALL');
      const prevLen = schedules.length;
      schedules = schedules.filter(s => s.id !== scheduleId);
      if (schedules.length !== prevLen) {
        this.saveScheduledPages(schedules);
        this.logAudit('SCHEDULED_PAGE_DELETED', 'SCHEDULING_ENGINE', `Scheduled release ${scheduleId} removed from queue.`);
        return true;
      }
      return false;
    },

    exportScheduledPages() {
      const schedules = this.getScheduledPages('ALL');
      const timestamp = Date.now();
      const filename = `cso-scheduled-releases-${timestamp}.json`;
      const bundle = {
        scheduleManifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        totalReleases: schedules.length,
        schedules: schedules
      };

      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.logAudit('SCHEDULED_RELEASES_EXPORTED', 'DATA_EXPORT', `Scheduled page releases archive exported (${filename}).`);
      return filename;
    },

    // 23. Trash & Recovery Engine (module-02-011)
    getTrashedPages(typeFilter = 'ALL', search = '') {
      let trash = null;
      try {
        const raw = localStorage.getItem('cso_pages_trash');
        if (raw) trash = JSON.parse(raw);
      } catch (_) {}

      if (!trash || !Array.isArray(trash) || trash.length === 0) {
        trash = [
          {
            id: 'TRSH-001',
            originalId: 'PAGE-099',
            title: 'OSSC CGL 2024 Preliminary Notice (Superseded)',
            path: '/notices/archived-ossc-cgl-2024-prelims.html',
            type: 'Page',
            deletedBy: 'admin@csodisha.com',
            deletedAt: Date.now() - 172800000,
            expiresAt: Date.now() + (28 * 86400000),
            originalPayload: {
              id: 'PAGE-099',
              title: 'OSSC CGL 2024 Preliminary Notice',
              path: '/notices/archived-ossc-cgl-2024-prelims.html',
              file: 'archived-ossc-cgl-2024-prelims.html',
              template: 'Standard Content',
              status: 'Live',
              sizeKb: '24.1',
              lastModified: '2024-11-01',
              htmlContent: '<article class="p-8"><h1>Superseded Notice</h1><p>Archived examination syllabus.</p></article>'
            }
          },
          {
            id: 'TRSH-002',
            originalId: 'DFT-088',
            title: 'Obsolete Teaching Pedagogy Draft v1.0',
            path: '/drafts/old-syllabus-guide-draft.html',
            type: 'Draft',
            deletedBy: 'editorial@csodisha.com',
            deletedAt: Date.now() - 432000000,
            expiresAt: Date.now() + (25 * 86400000),
            originalPayload: {
              id: 'DFT-088',
              title: 'Obsolete Teaching Pedagogy Draft v1.0',
              path: '/drafts/old-syllabus-guide-draft.html',
              author: 'editorial@csodisha.com',
              progress: 50,
              status: 'In Progress',
              markup: '<div class="p-6"><h1>Old Teaching Pedagogy Draft</h1></div>'
            }
          },
          {
            id: 'TRSH-003',
            originalId: 'LP-077',
            title: 'Expired 2025 Special Recruitment Campaign',
            path: '/landing/expired-special-drive-2025.html',
            type: 'Campaign',
            deletedBy: 'admin@csodisha.com',
            deletedAt: Date.now() - 1036800000,
            expiresAt: Date.now() + (18 * 86400000),
            originalPayload: {
              id: 'LP-077',
              title: 'Expired 2025 Special Recruitment',
              slug: 'expired-special-drive-2025',
              path: '/landing/expired-special-drive-2025.html',
              category: 'General',
              status: 'Paused',
              views: 320,
              conversions: 12,
              conversionRate: '3.8%',
              expiry: '2025-12-31'
            }
          }
        ];

        try {
          localStorage.setItem('cso_pages_trash', JSON.stringify(trash));
        } catch (_) {}
      }

      const tFilter = (typeFilter || 'ALL').toUpperCase();
      const sq = (search || '').toLowerCase().trim();

      return trash.filter(item => {
        if (tFilter !== 'ALL' && (item.type || '').toUpperCase() !== tFilter) {
          return false;
        }
        if (sq) {
          const matchTitle = (item.title || '').toLowerCase().includes(sq);
          const matchPath = (item.path || '').toLowerCase().includes(sq);
          const matchBy = (item.deletedBy || '').toLowerCase().includes(sq);
          if (!matchTitle && !matchPath && !matchBy) return false;
        }
        return true;
      }).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
    },

    saveTrashedPages(trash) {
      save('cso_pages_trash', trash);
    },

    restoreFromTrash(trashId) {
      const trash = this.getTrashedPages('ALL', '');
      const item = trash.find(t => t.id === trashId);
      if (!item) {
        throw new Error(`Trash record ${trashId} not found`);
      }

      if (item.type === 'Page') {
        const pages = this.getAllPages('ALL', '');
        pages.unshift(item.originalPayload);
        this.saveAllPages(pages);
      } else if (item.type === 'Draft') {
        const drafts = this.getPageDrafts('ALL');
        drafts.unshift(item.originalPayload);
        this.savePageDrafts(drafts);
      } else if (item.type === 'Campaign') {
        const campaigns = this.getLandingPages('ALL', 'ALL', '');
        campaigns.unshift(item.originalPayload);
        this.saveLandingPages(campaigns);
      }

      // Remove from trash
      const remaining = trash.filter(t => t.id !== trashId);
      this.saveTrashedPages(remaining);

      this.logAudit('PAGE_RESTORED_FROM_TRASH', 'RECYCLE_BIN', `Item ${item.id} ("${item.title}", ${item.type}) restored to active repository.`);
      return { success: true, item };
    },

    permanentlyDeleteTrashItem(trashId) {
      let trash = this.getTrashedPages('ALL', '');
      const prevLen = trash.length;
      trash = trash.filter(t => t.id !== trashId);
      if (trash.length !== prevLen) {
        this.saveTrashedPages(trash);
        this.logAudit('PAGE_PERMANENTLY_PURGED', 'RECYCLE_BIN', `Trashed item ${trashId} permanently purged.`);
        return true;
      }
      return false;
    },

    emptyTrash() {
      const count = this.getTrashedPages('ALL', '').length;
      this.saveTrashedPages([]);
      this.logAudit('RECYCLE_BIN_EMPTIED', 'RECYCLE_BIN', `Recycle bin emptied (${count} assets purged).`);
      return count;
    },

    exportTrashManifest() {
      const trash = this.getTrashedPages('ALL', '');
      const timestamp = Date.now();
      const filename = `cso-recycle-bin-manifest-${timestamp}.json`;
      const bundle = {
        recycleBinManifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        retentionPolicy: "30-Day Auto Purge",
        totalTrashedItems: trash.length,
        trashManifest: trash
      };

      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.logAudit('TRASH_MANIFEST_EXPORTED', 'DATA_EXPORT', `Recycle bin manifest exported (${filename}).`);
      return filename;
    },

    // 24. Brand Identity & Global Theme Setup Engine (module-03-001)
    getBrandConfig() {
      let config = null;
      try {
        const raw = localStorage.getItem('cso_brand_config');
        if (raw) config = JSON.parse(raw);
      } catch (_) {}

      if (!config || typeof config !== 'object') {
        config = {
          siteName: "Common Sense Odisha",
          shortCode: "CSO",
          domain: "csodisha.com",
          supportEmail: "contact@csodisha.com",
          tagline: "Empowering Aspirants Across All 30 Districts of Odisha",
          description: "Dedicated examination intelligence, authentic syllabus patterns, and academic empowerment for youth across Odisha.",
          logoPath: "/assets/img/logo.svg",
          faviconPath: "/favicon.ico",
          primaryColor: "#0fa968",
          navyColor: "#081220",
          slateColor: "#0f172a",
          jurisdiction: "All 30 Districts of Odisha",
          updatedAt: new Date().toISOString()
        };

        try {
          localStorage.setItem('cso_brand_config', JSON.stringify(config));
        } catch (_) {}
      }

      return config;
    },

    saveBrandConfig(config) {
      if (!config || typeof config !== 'object') return false;
      config.updatedAt = new Date().toISOString();
      save('cso_brand_config', config);
      this.logAudit('BRAND_IDENTITY_UPDATED', 'BRAND_SETUP', `Brand constants, color tokens, and canonical settings updated.`);
      return config;
    },

    exportBrandManifest() {
      const config = this.getBrandConfig();
      const timestamp = Date.now();
      const filename = `cso-brand-identity-${timestamp}.json`;
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        brand: config
      };

      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.logAudit('BRAND_MANIFEST_EXPORTED', 'DATA_EXPORT', `Brand identity manifest exported (${filename}).`);
      return filename;
    },

    // 25. About Us & Institutional Mission Engine (module-03-001)
    getAboutConfig() {
      let config = null;
      try {
        const raw = localStorage.getItem('cso_about_config');
        if (raw) config = JSON.parse(raw);
      } catch (_) {}

      if (!config || typeof config !== 'object' || !config.meta) {
        config = {
          meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
          hero: {
            headline: "Democratizing Academic & Career Intelligence for Odisha's Youth",
            subheadline: "A dedicated digital gateway providing verified syllabi, state exam patterns, and scholarship navigation across all 30 districts.",
            badge: "Official Mission Portal",
            enabled: true
          },
          statements: {
            mission: "To eliminate geographic and socio-economic information barriers for competitive examination aspirants in Odisha by delivering authenticated, zero-cost academic intelligence.",
            vision: "An Odisha where every candidate from Mayurbhanj to Koraput possesses equal access to authenticated academic tools."
          },
          pillars: [
            { id: "PIL-01", title: "Gazette Accuracy", description: "Zero speculation. Every syllabus breakdown is verified against official state notification releases.", icon: "shield", active: true },
            { id: "PIL-02", title: "Universal 30-District Access", description: "Digital access architected for seamless loading even in remote rural blocks with low-bandwidth connections.", icon: "map", active: true },
            { id: "PIL-03", title: "100% Free Public Resource", description: "Free access to structured study templates, previous papers, and transparent guidance.", icon: "book", active: true },
            { id: "PIL-04", title: "Aspirant-Centric Architecture", description: "Interface built specifically for seamless navigation on mobile devices and low-spec hardware.", icon: "users", active: true }
          ],
          milestones: [
            { id: "MLS-01", year: "2023", title: "Foundation & Prototype", description: "Inception of Common Sense Odisha to address rural information asymmetry." },
            { id: "MLS-02", year: "2024", title: "Syllabus Digitization", description: "Coverage of OSSC, OPSC, and Odisha B.Ed curricula." },
            { id: "MLS-03", year: "2025", title: "Statewide Expansion", description: "Reaching aspirants across all 30 districts of Odisha." },
            { id: "MLS-04", year: "2026", title: "Sovereign Admin Suite", description: "Deployment of 19-folder Cloudflare Pages super admin control architecture." }
          ],
          customSections: []
        };

        try {
          localStorage.setItem('cso_about_config', JSON.stringify(config));
        } catch (_) {}
      }

      return config;
    },

    saveAboutConfig(config) {
      if (!config || typeof config !== 'object') return false;
      if (!config.meta) config.meta = {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      save('cso_about_config', config);
      this.logAudit('ABOUT_CONFIG_UPDATED', 'ABOUT_MANAGEMENT', `About Us content, pillars, and institutional milestones updated.`);
      return config;
    },

    importAboutConfig(jsonString) {
      if (!jsonString || typeof jsonString !== 'string') throw new Error("Invalid input format.");
      let parsed;
      try {
        parsed = JSON.parse(jsonString);
      } catch (err) {
        throw new Error("Invalid JSON syntax: " + err.message);
      }

      if (!parsed || typeof parsed !== 'object') {
        throw new Error("Imported data must be an object.");
      }

      if (!parsed.meta) parsed.meta = {};
      parsed.meta.updatedAt = new Date().toISOString();
      parsed.meta.lastEditedBy = "admin@csodisha.com (Import)";
      save('cso_about_config', parsed);
      this.logAudit('ABOUT_CONFIG_IMPORTED', 'ABOUT_MANAGEMENT', `About Us config imported from JSON payload.`);
      return parsed;
    },

    resetAboutConfig() {
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        hero: {
          headline: "Democratizing Academic & Career Intelligence for Odisha's Youth",
          subheadline: "A dedicated digital gateway providing verified syllabi, state exam patterns, and scholarship navigation across all 30 districts.",
          badge: "Official Mission Portal",
          enabled: true
        },
        statements: {
          mission: "To eliminate geographic and socio-economic information barriers for competitive examination aspirants in Odisha by delivering authenticated, zero-cost academic intelligence.",
          vision: "An Odisha where every candidate from Mayurbhanj to Koraput possesses equal access to authenticated academic tools."
        },
        pillars: [
          { id: "PIL-01", title: "Gazette Accuracy", description: "Zero speculation. Every syllabus breakdown is verified against official state notification releases.", icon: "shield", active: true },
          { id: "PIL-02", title: "Universal 30-District Access", description: "Digital access architected for seamless loading even in remote rural blocks with low-bandwidth connections.", icon: "map", active: true },
          { id: "PIL-03", title: "100% Free Public Resource", description: "Free access to structured study templates, previous papers, and transparent guidance.", icon: "book", active: true },
          { id: "PIL-04", title: "Aspirant-Centric Architecture", description: "Interface built specifically for seamless navigation on mobile devices and low-spec hardware.", icon: "users", active: true }
        ],
        milestones: [
          { id: "MLS-01", year: "2023", title: "Foundation & Prototype", description: "Inception of Common Sense Odisha to address rural information asymmetry." },
          { id: "MLS-02", year: "2024", title: "Syllabus Digitization", description: "Coverage of OSSC, OPSC, and Odisha B.Ed curricula." },
          { id: "MLS-03", year: "2025", title: "Statewide Expansion", description: "Reaching aspirants across all 30 districts of Odisha." },
          { id: "MLS-04", year: "2026", title: "Sovereign Admin Suite", description: "Deployment of 19-folder Cloudflare Pages super admin control architecture." }
        ],
        customSections: []
      };

      save('cso_about_config', initial);
      this.logAudit('ABOUT_CONFIG_RESET', 'ABOUT_MANAGEMENT', `About Us configuration reset to initial factory seed.`);
      return initial;
    },

    exportAboutManifest() {
      const config = this.getAboutConfig();
      const timestamp = Date.now();
      const filename = `cso-about-config-${timestamp}.json`;
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        about: config
      };

      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.logAudit('ABOUT_MANIFEST_EXPORTED', 'DATA_EXPORT', `About Us configuration manifest exported (${filename}).`);
      return filename;
    },

    // 26. Contact Us & Institutional Directory Engine (module-03-002 / module-03-003)
    getContactConfig() {
      let config = null;
      try {
        const raw = localStorage.getItem('cso_contact_config');
        if (raw) config = JSON.parse(raw);
      } catch (_) {}

      if (!config || typeof config !== 'object' || !config.meta) {
        config = {
          meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
          endpoints: {
            primaryEmail: "contact@csodisha.com",
            helplinePhone: "+91 674 239 0000",
            operatingHours: "09:30 AM - 05:30 PM IST (Mon - Sat)",
            postalAddress: "CS Odisha Academic Intelligence Node, Bhubaneswar / Balasore Liaison Desk, Odisha - 751001",
            slaResponseTime: "Within 24 business hours"
          },
          departments: [
            { id: "DEPT-01", name: "Candidate Admission & Syllabus Helpdesk", email: "academic@csodisha.com", category: "Academic", hours: "10:00 - 17:00 IST", active: true },
            { id: "DEPT-02", name: "Grievance & Statutory Redressal", email: "grievance@csodisha.com", category: "Legal", hours: "10:00 - 16:00 IST", active: true },
            { id: "DEPT-03", name: "Technical Portal & CDN Operations", email: "admin@csodisha.com", category: "Technical", hours: "24/7 Monitoring", active: true },
            { id: "DEPT-04", name: "District Community Outreach Desk", email: "outreach@csodisha.com", category: "Outreach", hours: "10:00 - 17:00 IST", active: true }
          ],
          autoResponse: {
            enabled: true,
            subject: "Inquiry Acknowledged - Common Sense Odisha",
            template: "Namaskar. We have received your query regarding Odisha state recruitment resources. Our academic desk will review your submission shortly."
          }
        };

        try {
          localStorage.setItem('cso_contact_config', JSON.stringify(config));
        } catch (_) {}
      }

      return config;
    },

    saveContactConfig(config) {
      if (!config || typeof config !== 'object') return false;
      if (!config.meta) config.meta = {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      save('cso_contact_config', config);
      this.logAudit('CONTACT_CONFIG_UPDATED', 'CONTACT_MANAGEMENT', `Contact configuration, endpoints, and departments updated.`);
      return config;
    },

    importContactConfig(jsonString) {
      if (!jsonString || typeof jsonString !== 'string') throw new Error("Invalid input format.");
      let parsed;
      try {
        parsed = JSON.parse(jsonString);
      } catch (err) {
        throw new Error("Invalid JSON syntax: " + err.message);
      }

      if (!parsed || typeof parsed !== 'object') {
        throw new Error("Imported data must be an object.");
      }

      if (!parsed.meta) parsed.meta = {};
      parsed.meta.updatedAt = new Date().toISOString();
      parsed.meta.lastEditedBy = "admin@csodisha.com (Import)";
      save('cso_contact_config', parsed);
      this.logAudit('CONTACT_CONFIG_IMPORTED', 'CONTACT_MANAGEMENT', `Contact config imported from JSON payload.`);
      return parsed;
    },

    resetContactConfig() {
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        endpoints: {
          primaryEmail: "contact@csodisha.com",
          helplinePhone: "+91 674 239 0000",
          operatingHours: "09:30 AM - 05:30 PM IST (Mon - Sat)",
          postalAddress: "CS Odisha Academic Intelligence Node, Bhubaneswar / Balasore Liaison Desk, Odisha - 751001",
          slaResponseTime: "Within 24 business hours"
        },
        departments: [
          { id: "DEPT-01", name: "Candidate Admission & Syllabus Helpdesk", email: "academic@csodisha.com", category: "Academic", hours: "10:00 - 17:00 IST", active: true },
          { id: "DEPT-02", name: "Grievance & Statutory Redressal", email: "grievance@csodisha.com", category: "Legal", hours: "10:00 - 16:00 IST", active: true },
          { id: "DEPT-03", name: "Technical Portal & CDN Operations", email: "admin@csodisha.com", category: "Technical", hours: "24/7 Monitoring", active: true },
          { id: "DEPT-04", name: "District Community Outreach Desk", email: "outreach@csodisha.com", category: "Outreach", hours: "10:00 - 17:00 IST", active: true }
        ],
        autoResponse: {
          enabled: true,
          subject: "Inquiry Acknowledged - Common Sense Odisha",
          template: "Namaskar. We have received your query regarding Odisha state recruitment resources. Our academic desk will review your submission shortly."
        }
      };

      save('cso_contact_config', initial);
      this.logAudit('CONTACT_CONFIG_RESET', 'CONTACT_MANAGEMENT', `Contact configuration reset to factory defaults.`);
      return initial;
    },

    exportContactManifest() {
      const config = this.getContactConfig();
      const timestamp = Date.now();
      const filename = `cso-contact-config-${timestamp}.json`;
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        contact: config
      };

      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.logAudit('CONTACT_DIRECTORY_EXPORTED', 'DATA_EXPORT', `Contact configuration manifest exported (${filename}).`);
      return filename;
    },

    // Legacy Contact Directory aliases for backward-compatibility
    getContactDirectory() {
      const conf = this.getContactConfig();
      return {
        primaryEmail: conf.endpoints?.primaryEmail || "contact@csodisha.com",
        helplineNumber: conf.endpoints?.helplinePhone || "+91 674 239 0000",
        operatingHours: conf.endpoints?.operatingHours || "09:30 AM - 05:30 PM IST (Mon - Sat)",
        postalAddress: conf.endpoints?.postalAddress || "CS Odisha Academic Intelligence Node, Bhubaneswar, Odisha",
        channels: conf.departments || [],
        updatedAt: conf.meta?.updatedAt || new Date().toISOString()
      };
    },

    saveContactDirectory(config) {
      if (!config || typeof config !== 'object') return false;
      const conf = this.getContactConfig();
      if (!conf.endpoints) conf.endpoints = {};
      conf.endpoints.primaryEmail = config.primaryEmail || conf.endpoints.primaryEmail;
      conf.endpoints.helplinePhone = config.helplineNumber || conf.endpoints.helplinePhone;
      conf.endpoints.operatingHours = config.operatingHours || conf.endpoints.operatingHours;
      conf.endpoints.postalAddress = config.postalAddress || conf.endpoints.postalAddress;
      if (Array.isArray(config.channels)) {
        conf.departments = config.channels;
      }
      return this.saveContactConfig(conf);
    },

    addContactChannel(channelData) {
      if (!channelData || typeof channelData !== 'object') return false;
      const config = this.getContactConfig();
      if (!Array.isArray(config.departments)) config.departments = [];

      const newDept = {
        id: "DEPT-" + Date.now().toString().slice(-4),
        name: channelData.name || "General Desk",
        email: channelData.email || "contact@csodisha.com",
        category: channelData.category || "Academic",
        hours: channelData.hours || "10:00 - 17:00 IST",
        active: channelData.active !== false
      };

      config.departments.push(newDept);
      this.saveContactConfig(config);
      this.logAudit('CONTACT_CHANNEL_ADDED', 'CONTACT_MANAGEMENT', `Added department channel: ${newDept.name} (${newDept.id})`);
      return newDept;
    },

    deleteContactChannel(id) {
      if (!id) return false;
      const config = this.getContactConfig();
      if (!Array.isArray(config.departments)) return false;

      const idx = config.departments.findIndex(c => c.id === id);
      if (idx !== -1) {
        const removed = config.departments.splice(idx, 1)[0];
        this.saveContactConfig(config);
        this.logAudit('CONTACT_CHANNEL_DELETED', 'CONTACT_MANAGEMENT', `Deleted contact channel: ${removed.name} (${id})`);
        return true;
      }
      return false;
    },

    exportContactDirectory() {
      return this.exportContactManifest();
    },

    // 27. Privacy Policy & Statutory Compliance Engine (module-03-003)
    getPrivacyConfig() {
      let config = null;
      try {
        const raw = localStorage.getItem('cso_privacy_config');
        if (raw) config = JSON.parse(raw);
      } catch (_) {}

      if (!config || typeof config !== 'object' || !config.meta) {
        config = {
          meta: { version: "2.4", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
          compliance: {
            effectiveDate: "2026-11-01",
            governingAct: "Digital Personal Data Protection Act (DPDP), 2023 & Information Technology Act, 2000",
            dataProtectionOfficer: "dpo@csodisha.com",
            jurisdiction: "Odisha, India"
          },
          clauses: [
            { id: "PRIV-01", number: "1", title: "Scope & Academic Non-Commercial Nature", body: "Common Sense Odisha (csodisha.com) operates as a free, non-monetized educational intelligence platform for candidates across Odisha. We do not sell, rent, or trade candidate personal information.", active: true },
            { id: "PRIV-02", number: "2", title: "Data We Collect", body: "We collect minimal candidate details submitted voluntarily via contact or grievance forms (name, email, district) solely to respond to academic and syllabus queries. We do not collect government ID numbers, financial instruments, or biometric data.", active: true },
            { id: "PRIV-03", number: "3", title: "Local Storage & Session Tokens", body: "The portal uses client-side browser storage (localStorage and sessionStorage) strictly to preserve user interface preferences (theme, filters) and cryptographically signed session anchors for administrative authentication.", active: true },
            { id: "PRIV-04", number: "4", title: "Edge Telemetry & Cloudflare Protection", body: "Network requests pass through Cloudflare Edge servers for bot mitigation, DDoS defense, and latency optimization. Minimal network telemetry (IP address, user-agent, round-trip time) is processed strictly for diagnostic security.", active: true },
            { id: "PRIV-05", number: "5", title: "Candidate Rights & Grievance Desk", body: "Aspirants retain the statutory right to request inspection, correction, or permanent deletion of their inquiry records by contacting grievance@csodisha.com.", active: true }
          ],
          retention: {
            inquiryDataDays: 90,
            auditLogDays: 180,
            policySummary: "All candidate inquiries are automatically purged from active triage within 90 days of resolution."
          }
        };

        try {
          localStorage.setItem('cso_privacy_config', JSON.stringify(config));
        } catch (_) {}
      }

      return config;
    },

    savePrivacyConfig(config) {
      if (!config || typeof config !== 'object') return false;
      if (!config.meta) config.meta = {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      save('cso_privacy_config', config);
      this.logAudit('PRIVACY_CONFIG_UPDATED', 'PRIVACY_COMPLIANCE', `Privacy policy version, compliance parameters, and clauses updated.`);
      return config;
    },

    importPrivacyConfig(jsonString) {
      if (!jsonString || typeof jsonString !== 'string') throw new Error("Invalid input format.");
      let parsed;
      try {
        parsed = JSON.parse(jsonString);
      } catch (err) {
        throw new Error("Invalid JSON syntax: " + err.message);
      }

      if (!parsed || typeof parsed !== 'object') {
        throw new Error("Imported data must be an object.");
      }

      if (!parsed.meta) parsed.meta = {};
      parsed.meta.updatedAt = new Date().toISOString();
      parsed.meta.lastEditedBy = "admin@csodisha.com (Import)";
      save('cso_privacy_config', parsed);
      this.logAudit('PRIVACY_CONFIG_IMPORTED', 'PRIVACY_COMPLIANCE', `Privacy policy configuration imported from JSON payload.`);
      return parsed;
    },

    resetPrivacyConfig() {
      const initial = {
        meta: { version: "2.4", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        compliance: {
          effectiveDate: "2026-11-01",
          governingAct: "Digital Personal Data Protection Act (DPDP), 2023 & Information Technology Act, 2000",
          dataProtectionOfficer: "dpo@csodisha.com",
          jurisdiction: "Odisha, India"
        },
        clauses: [
          { id: "PRIV-01", number: "1", title: "Scope & Academic Non-Commercial Nature", body: "Common Sense Odisha (csodisha.com) operates as a free, non-monetized educational intelligence platform for candidates across Odisha. We do not sell, rent, or trade candidate personal information.", active: true },
          { id: "PRIV-02", number: "2", title: "Data We Collect", body: "We collect minimal candidate details submitted voluntarily via contact or grievance forms (name, email, district) solely to respond to academic and syllabus queries. We do not collect government ID numbers, financial instruments, or biometric data.", active: true },
          { id: "PRIV-03", number: "3", title: "Local Storage & Session Tokens", body: "The portal uses client-side browser storage (localStorage and sessionStorage) strictly to preserve user interface preferences (theme, filters) and cryptographically signed session anchors for administrative authentication.", active: true },
          { id: "PRIV-04", number: "4", title: "Edge Telemetry & Cloudflare Protection", body: "Network requests pass through Cloudflare Edge servers for bot mitigation, DDoS defense, and latency optimization. Minimal network telemetry (IP address, user-agent, round-trip time) is processed strictly for diagnostic security.", active: true },
          { id: "PRIV-05", number: "5", title: "Candidate Rights & Grievance Desk", body: "Aspirants retain the statutory right to request inspection, correction, or permanent deletion of their inquiry records by contacting grievance@csodisha.com.", active: true }
        ],
        retention: {
          inquiryDataDays: 90,
          auditLogDays: 180,
          policySummary: "All candidate inquiries are automatically purged from active triage within 90 days of resolution."
        }
      };

      save('cso_privacy_config', initial);
      this.logAudit('PRIVACY_CONFIG_RESET', 'PRIVACY_COMPLIANCE', `Privacy policy configuration reset to initial factory seed.`);
      return initial;
    },

    // 28. Disclaimer & Legal Notice Engine (module-03-004)
    getDisclaimerConfig() {
      let config = null;
      try {
        const raw = localStorage.getItem('cso_disclaimer_config');
        if (raw) config = JSON.parse(raw);
      } catch (_) {}

      if (!config || typeof config !== 'object' || !config.meta) {
        config = {
          meta: { version: "2.1", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
          header: {
            title: "Official Disclaimer & Non-Affiliation Notice",
            subtitle: "Statutory clarification on independent academic intelligence, third-party trademarks, and official gazette reconciliation.",
            badge: "Statutory Disclosure",
            lastReviewed: "2026-11-01"
          },
          notices: [
            { id: "DISC-01", title: "Non-Affiliation with Government Recruitment Bodies", category: "Statutory", body: "Common Sense Odisha (csodisha.com) is an independent non-governmental educational portal. It is NOT affiliated with, sponsored by, authorized by, or in any way officially connected to the Odisha Public Service Commission (OPSC), Odisha Staff Selection Commission (OSSC), Odisha Sub-Ordinate Staff Selection Commission (OSSSC), Board of Secondary Education (BSE) Odisha, or any department of the Government of Odisha.", active: true },
            { id: "DISC-02", title: "Examination Information Accuracy & Gazette Priority", category: "Accuracy", body: "All examination dates, syllabus matrices, mark weightages, and eligibility criteria published on this portal are compiled strictly for academic reference and candidate convenience. In the event of any discrepancy or conflict between the information presented here and the official notifications published in the Odisha Gazette or official commission websites, the official government gazette release shall strictly prevail.", active: true },
            { id: "DISC-03", title: "No Legal or Professional Advice", category: "Legal", body: "The contents of csodisha.com do not constitute legal, recruitment, or professional advice. Candidates are strongly advised to verify all critical eligibility criteria, qualifying relaxations, and procedural guidelines directly with official recruitment advertisements.", active: true },
            { id: "DISC-04", title: "Third-Party Trademarks & Official Logos", category: "Trademarks", body: "All trade names, trademarks, logos, and commission insignia referenced on this website remain the registered intellectual property of their respective statutory bodies. Their appearance here is purely nominative and does not imply endorsement or partnership.", active: true }
          ],
          emergencyNotice: {
            enabled: true,
            text: "Always cross-verify admit card release dates and answer keys against the primary recruitment commission portals before taking examination day actions."
          }
        };
        try {
          localStorage.setItem('cso_disclaimer_config', JSON.stringify(config));
        } catch (_) {}
      }
      return config;
    },

    saveDisclaimerConfig(config) {
      if (!config || typeof config !== 'object') throw new Error("Invalid disclaimer configuration payload.");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem('cso_disclaimer_config', JSON.stringify(config));
      this.logAudit('DISCLAIMER_CONFIG_UPDATED', 'LEGAL_DISCLAIMER', `Disclaimer configuration updated (v${config.meta.version || '2.1'}).`);
      return config;
    },

    importDisclaimerConfig(jsonString) {
      let parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      if (!parsed || typeof parsed !== 'object') throw new Error("Invalid JSON manifest.");
      if (parsed.disclaimerConfig) parsed = parsed.disclaimerConfig;
      else if (parsed.header && parsed.notices) {
        // payload wrapped or raw
      }
      parsed.meta = parsed.meta || {};
      parsed.meta.updatedAt = new Date().toISOString();
      localStorage.setItem('cso_disclaimer_config', JSON.stringify(parsed));
      this.logAudit('DISCLAIMER_CONFIG_IMPORTED', 'LEGAL_DISCLAIMER', `Disclaimer configuration imported (v${parsed.meta.version || '2.1'}).`);
      return parsed;
    },

    resetDisclaimerConfig() {
      const initial = {
        meta: { version: "2.1", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        header: {
          title: "Official Disclaimer & Non-Affiliation Notice",
          subtitle: "Statutory clarification on independent academic intelligence, third-party trademarks, and official gazette reconciliation.",
          badge: "Statutory Disclosure",
          lastReviewed: "2026-11-01"
        },
        notices: [
          { id: "DISC-01", title: "Non-Affiliation with Government Recruitment Bodies", category: "Statutory", body: "Common Sense Odisha (csodisha.com) is an independent non-governmental educational portal. It is NOT affiliated with, sponsored by, authorized by, or in any way officially connected to the Odisha Public Service Commission (OPSC), Odisha Staff Selection Commission (OSSC), Odisha Sub-Ordinate Staff Selection Commission (OSSSC), Board of Secondary Education (BSE) Odisha, or any department of the Government of Odisha.", active: true },
          { id: "DISC-02", title: "Examination Information Accuracy & Gazette Priority", category: "Accuracy", body: "All examination dates, syllabus matrices, mark weightages, and eligibility criteria published on this portal are compiled strictly for academic reference and candidate convenience. In the event of any discrepancy or conflict between the information presented here and the official notifications published in the Odisha Gazette or official commission websites, the official government gazette release shall strictly prevail.", active: true },
          { id: "DISC-03", title: "No Legal or Professional Advice", category: "Legal", body: "The contents of csodisha.com do not constitute legal, recruitment, or professional advice. Candidates are strongly advised to verify all critical eligibility criteria, qualifying relaxations, and procedural guidelines directly with official recruitment advertisements.", active: true },
          { id: "DISC-04", title: "Third-Party Trademarks & Official Logos", category: "Trademarks", body: "All trade names, trademarks, logos, and commission insignia referenced on this website remain the registered intellectual property of their respective statutory bodies. Their appearance here is purely nominative and does not imply endorsement or partnership.", active: true }
        ],
        emergencyNotice: {
          enabled: true,
          text: "Always cross-verify admit card release dates and answer keys against the primary recruitment commission portals before taking examination day actions."
        }
      };
      localStorage.setItem('cso_disclaimer_config', JSON.stringify(initial));
      this.logAudit('DISCLAIMER_CONFIG_RESET', 'LEGAL_DISCLAIMER', `Disclaimer configuration restored to 4-notice authentic statutory schema.`);
      return initial;
    },

    exportDisclaimerManifest() {
      const config = this.getDisclaimerConfig();
      const timestamp = Date.now();
      const filename = `cso-disclaimer-config-${timestamp}.json`;
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        disclaimer: config
      };

      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.logAudit('DISCLAIMER_MANIFEST_EXPORTED', 'DATA_EXPORT', `Disclaimer manifest exported (${filename}).`);
      return filename;
    },

    // 29. Terms & Conditions Engine (module-03-005)
    getTermsConfig() {
      let config = null;
      try {
        const raw = localStorage.getItem('cso_terms_config');
        if (raw) config = JSON.parse(raw);
      } catch (_) {}

      if (!config || typeof config !== 'object' || !config.meta) {
        config = {
          meta: { version: "2.4", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
          document: {
            title: "Terms and Conditions of Use",
            version: "v2.4 (2026 Revision)",
            effectiveDate: "2026-11-01",
            governingLaw: "State of Odisha, India (Jurisdiction: High Court of Orissa / Bhubaneswar Civil Courts)"
          },
          clauses: [
            { id: "TERM-01", number: "1", title: "Acceptance of Agreement & Educational Scope", body: "By accessing or using Common Sense Odisha (csodisha.com), you agree to be bound by these Terms and Conditions. The platform operates solely as a non-profit academic intelligence and educational navigation gateway across all 30 districts of Odisha.", active: true },
            { id: "TERM-02", number: "2", title: "Intellectual Property & Fair Use", body: "Original syllabus breakdown structures, editorial notes, and portal assets are proprietary to Common Sense Odisha. State syllabus patterns and gazette releases are curated under fair dealing provisions solely for candidate guidance.", active: true },
            { id: "TERM-03", number: "3", title: "Prohibited Platform Conduct", body: "Users agree not to deploy automated scrapers, spiders, or extraction bots that burden edge server resources, nor attempt unauthorized access into administrative endpoints or authentication gates.", active: true },
            { id: "TERM-04", number: "4", title: "Statutory Non-Affiliation", body: "Common Sense Odisha is an autonomous civic platform and is NOT affiliated with, sponsored by, or endorsed by OPSC, OSSC, OSSSC, or BSE Odisha.", active: true },
            { id: "TERM-05", number: "5", title: "Limitation of Liability", body: "While every effort is made to maintain 100% gazette accuracy, candidates are strictly advised to cross-verify all critical dates, qualifying marks, and recruitment guidelines with original state notifications.", active: true }
          ],
          fairUseNotice: "All educational materials provided on csodisha.com are free for individual study and non-commercial candidate empowerment."
        };
        try {
          localStorage.setItem('cso_terms_config', JSON.stringify(config));
        } catch (_) {}
      }
      return config;
    },

    saveTermsConfig(config) {
      if (!config || typeof config !== 'object') throw new Error("Invalid terms configuration payload.");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem('cso_terms_config', JSON.stringify(config));
      this.logAudit('TERMS_CONFIG_UPDATED', 'TERMS_OF_USE', `Terms configuration updated (v${config.meta.version || '2.4'}).`);
      return config;
    },

    importTermsConfig(jsonString) {
      let parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      if (!parsed || typeof parsed !== 'object') throw new Error("Invalid JSON manifest.");
      if (parsed.termsConfig) parsed = parsed.termsConfig;
      else if (parsed.terms && parsed.clauses) {
        // payload wrapped or raw
      }
      parsed.meta = parsed.meta || {};
      parsed.meta.updatedAt = new Date().toISOString();
      localStorage.setItem('cso_terms_config', JSON.stringify(parsed));
      this.logAudit('TERMS_CONFIG_IMPORTED', 'TERMS_OF_USE', `Terms configuration imported (v${parsed.meta.version || '2.4'}).`);
      return parsed;
    },

    resetTermsConfig() {
      const initial = {
        meta: { version: "2.4", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: {
          title: "Terms and Conditions of Use",
          version: "v2.4 (2026 Revision)",
          effectiveDate: "2026-11-01",
          governingLaw: "State of Odisha, India (Jurisdiction: High Court of Orissa / Bhubaneswar Civil Courts)"
        },
        clauses: [
          { id: "TERM-01", number: "1", title: "Acceptance of Agreement & Educational Scope", body: "By accessing or using Common Sense Odisha (csodisha.com), you agree to be bound by these Terms and Conditions. The platform operates solely as a non-profit academic intelligence and educational navigation gateway across all 30 districts of Odisha.", active: true },
          { id: "TERM-02", number: "2", title: "Intellectual Property & Fair Use", body: "Original syllabus breakdown structures, editorial notes, and portal assets are proprietary to Common Sense Odisha. State syllabus patterns and gazette releases are curated under fair dealing provisions solely for candidate guidance.", active: true },
          { id: "TERM-03", number: "3", title: "Prohibited Platform Conduct", body: "Users agree not to deploy automated scrapers, spiders, or extraction bots that burden edge server resources, nor attempt unauthorized access into administrative endpoints or authentication gates.", active: true },
          { id: "TERM-04", number: "4", title: "Statutory Non-Affiliation", body: "Common Sense Odisha is an autonomous civic platform and is NOT affiliated with, sponsored by, or endorsed by OPSC, OSSC, OSSSC, or BSE Odisha.", active: true },
          { id: "TERM-05", number: "5", title: "Limitation of Liability", body: "While every effort is made to maintain 100% gazette accuracy, candidates are strictly advised to cross-verify all critical dates, qualifying marks, and recruitment guidelines with original state notifications.", active: true }
        ],
        fairUseNotice: "All educational materials provided on csodisha.com are free for individual study and non-commercial candidate empowerment."
      };
      localStorage.setItem('cso_terms_config', JSON.stringify(initial));
      this.logAudit('TERMS_CONFIG_RESET', 'TERMS_OF_USE', `Terms configuration restored to authentic 5-clause default schema.`);
      return initial;
    },

    exportTermsManifest() {
      const config = this.getTermsConfig();
      const timestamp = Date.now();
      const filename = `cso-terms-config-${timestamp}.json`;
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        terms: config
      };

      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.logAudit('TERMS_MANIFEST_EXPORTED', 'DATA_EXPORT', `Terms of use manifest exported (${filename}).`);
      return filename;
    },

    // 30. Cookie Policy & Consent Governance Engine (module-03-006)
    getCookieConfig() {
      let config = null;
      try {
        const raw = localStorage.getItem('cso_cookie_config');
        if (raw) config = JSON.parse(raw);
      } catch (_) {}

      if (!config || typeof config !== 'object' || !config.meta) {
        config = {
          meta: { version: "1.2", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
          banner: {
            headline: "We respect your academic privacy",
            description: "Common Sense Odisha uses minimal necessary cookies to keep your session secure and analyze aggregated edge traffic across all 30 districts of Odisha.",
            acceptButtonText: "Accept All Cookies",
            rejectButtonText: "Essential Only",
            retentionDays: 365,
            enabled: true
          },
          cookies: [
            { id: "CK-01", name: "cso_admin_token", category: "Strictly Necessary", domain: "csodisha.com", duration: "2 Hours (Sliding)", purpose: "Zero-trust session anchor and authentication gate", active: true },
            { id: "CK-02", name: "cf_clearance", category: "Strictly Necessary", domain: "csodisha.com", duration: "1 Year", purpose: "Cloudflare Turnstile bot defense verification", active: true },
            { id: "CK-03", name: "cso_theme", category: "Functional", domain: "csodisha.com", duration: "Persistent", purpose: "Preserves user high-contrast dark theme preference", active: true },
            { id: "CK-04", name: "cso_telemetry_id", category: "Analytics", domain: "csodisha.com", duration: "Session", purpose: "Measures edge response latency and page performance", active: true }
          ]
        };
        try {
          localStorage.setItem('cso_cookie_config', JSON.stringify(config));
        } catch (_) {}
      }
      return config;
    },

    saveCookieConfig(config) {
      if (!config || typeof config !== 'object') throw new Error("Invalid cookie configuration payload.");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem('cso_cookie_config', JSON.stringify(config));
      this.logAudit('COOKIE_CONFIG_UPDATED', 'COOKIE_CONSENT', `Cookie policy configuration updated (v${config.meta.version || '1.2'}).`);
      return config;
    },

    importCookieConfig(jsonString) {
      let parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      if (!parsed || typeof parsed !== 'object') throw new Error("Invalid JSON manifest.");
      if (parsed.cookieConfig) parsed = parsed.cookieConfig;
      else if (parsed.banner && parsed.cookies) {
        // payload wrapped or raw
      }
      parsed.meta = parsed.meta || {};
      parsed.meta.updatedAt = new Date().toISOString();
      localStorage.setItem('cso_cookie_config', JSON.stringify(parsed));
      this.logAudit('COOKIE_CONFIG_IMPORTED', 'COOKIE_CONSENT', `Cookie policy configuration imported (v${parsed.meta.version || '1.2'}).`);
      return parsed;
    },

    resetCookieConfig() {
      const initial = {
        meta: { version: "1.2", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        banner: {
          headline: "We respect your academic privacy",
          description: "Common Sense Odisha uses minimal necessary cookies to keep your session secure and analyze aggregated edge traffic across all 30 districts of Odisha.",
          acceptButtonText: "Accept All Cookies",
          rejectButtonText: "Essential Only",
          retentionDays: 365,
          enabled: true
        },
        cookies: [
          { id: "CK-01", name: "cso_admin_token", category: "Strictly Necessary", domain: "csodisha.com", duration: "2 Hours (Sliding)", purpose: "Zero-trust session anchor and authentication gate", active: true },
          { id: "CK-02", name: "cf_clearance", category: "Strictly Necessary", domain: "csodisha.com", duration: "1 Year", purpose: "Cloudflare Turnstile bot defense verification", active: true },
          { id: "CK-03", name: "cso_theme", category: "Functional", domain: "csodisha.com", duration: "Persistent", purpose: "Preserves user high-contrast dark theme preference", active: true },
          { id: "CK-04", name: "cso_telemetry_id", category: "Analytics", domain: "csodisha.com", duration: "Session", purpose: "Measures edge response latency and page performance", active: true }
        ]
      };
      localStorage.setItem('cso_cookie_config', JSON.stringify(initial));
      this.logAudit('COOKIE_CONFIG_RESET', 'COOKIE_CONSENT', `Cookie policy configuration restored to factory default schema.`);
      return initial;
    },

    exportCookieManifest() {
      const config = this.getCookieConfig();
      const timestamp = Date.now();
      const filename = `cso-cookie-config-${timestamp}.json`;
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        cookies: config
      };

      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.logAudit('COOKIE_MANIFEST_EXPORTED', 'DATA_EXPORT', `Cookie policy manifest exported (${filename}).`);
      return filename;
    },

    // 31. Copyright Notice & DMCA Engine (module-03-007)
    getCopyrightConfig() {
      let config = null;
      try {
        const raw = localStorage.getItem('cso_copyright_config');
        if (raw) config = JSON.parse(raw);
      } catch (_) {}

      if (!config || typeof config !== 'object' || !config.meta) {
        config = {
          meta: { version: "2.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
          document: {
            title: "Copyright Notice & DMCA Policy",
            copyrightYear: "2023 - 2026",
            effectiveDate: "2026-11-01",
            badge: "Intellectual Property & Fair Dealing"
          },
          officer: {
            name: "Designated Copyright & Grievance Officer",
            email: "dmca@csodisha.com",
            secondaryEmail: "legal@csodisha.com",
            address: "Common Sense Odisha Academic Node, Legal & Statutory Redressal Cell, Bhubaneswar / Balasore, Odisha - 751001",
            slaResponseHours: 48
          },
          clauses: [
            { id: "CP-01", number: "1", title: "Proprietary Original Works", category: "Proprietary", body: "All original editorial guides, pedagogical structures, examination strategy charts, UI graphics, and software code on csodisha.com are proprietary works protected under the Indian Copyright Act, 1957.", active: true },
            { id: "CP-02", number: "2", title: "Fair Dealing in State Recruitment & Academic Content", category: "Fair Use", body: "Official state recruitment notifications, syllabi outlines, and public gazette orders issued by OPSC, OSSC, OSSSC, and BSE Odisha are cited or summarized under fair dealing provisions (Section 52 of the Indian Copyright Act, 1957) purely for educational commentary, student awareness, and non-commercial candidate guidance.", active: true },
            { id: "CP-03", number: "3", title: "Third-Party Logos & Nominative Fair Use", category: "Trademarks", body: "Institutional emblems, logos, and acronyms of statutory examination boards are displayed solely for nominative identification of respective recruitment tests. Common Sense Odisha claims no ownership over third-party trademarks.", active: true },
            { id: "CP-04", number: "4", title: "DMCA & Statutory Notice Takedown Procedure", category: "Takedown", body: "If you are a copyright owner or authorized agent and believe content on this portal infringes your intellectual property, submit a written notice to dmca@csodisha.com including: proof of ownership, specific infringing URL, identification of work, and contact details. Bona fide notices are resolved within 48 business hours.", active: true },
            { id: "CP-05", number: "5", title: "Repeat Infringer Policy", category: "Enforcement", body: "In accordance with standard digital service governance, any user or contributor repeatedly uploading unauthorized materials to interactive portal sections will have their access terminated immediately.", active: true }
          ],
          fairUseNotice: "Content is published solely for candidate guidance in Odisha. Commercial reproduction or unauthorized paid redistribution is strictly prohibited."
        };
        try {
          localStorage.setItem('cso_copyright_config', JSON.stringify(config));
        } catch (_) {}
      }
      return config;
    },

    saveCopyrightConfig(config) {
      if (!config || typeof config !== 'object') throw new Error("Invalid copyright configuration payload.");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem('cso_copyright_config', JSON.stringify(config));
      this.logAudit('COPYRIGHT_CONFIG_UPDATED', 'COPYRIGHT_DMCA', `Copyright configuration updated (v${config.meta.version || '2.0'}).`);
      return config;
    },

    importCopyrightConfig(jsonString) {
      let parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      if (!parsed || typeof parsed !== 'object') throw new Error("Invalid JSON manifest.");
      if (parsed.copyrightConfig) parsed = parsed.copyrightConfig;
      else if (parsed.document && parsed.clauses) {
        // payload wrapped or raw
      }
      parsed.meta = parsed.meta || {};
      parsed.meta.updatedAt = new Date().toISOString();
      localStorage.setItem('cso_copyright_config', JSON.stringify(parsed));
      this.logAudit('COPYRIGHT_CONFIG_IMPORTED', 'COPYRIGHT_DMCA', `Copyright configuration imported (v${parsed.meta.version || '2.0'}).`);
      return parsed;
    },

    resetCopyrightConfig() {
      const initial = {
        meta: { version: "2.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: {
          title: "Copyright Notice & DMCA Policy",
          copyrightYear: "2023 - 2026",
          effectiveDate: "2026-11-01",
          badge: "Intellectual Property & Fair Dealing"
        },
        officer: {
          name: "Designated Copyright & Grievance Officer",
          email: "dmca@csodisha.com",
          secondaryEmail: "legal@csodisha.com",
          address: "Common Sense Odisha Academic Node, Legal & Statutory Redressal Cell, Bhubaneswar / Balasore, Odisha - 751001",
          slaResponseHours: 48
        },
        clauses: [
          { id: "CP-01", number: "1", title: "Proprietary Original Works", category: "Proprietary", body: "All original editorial guides, pedagogical structures, examination strategy charts, UI graphics, and software code on csodisha.com are proprietary works protected under the Indian Copyright Act, 1957.", active: true },
          { id: "CP-02", number: "2", title: "Fair Dealing in State Recruitment & Academic Content", category: "Fair Use", body: "Official state recruitment notifications, syllabi outlines, and public gazette orders issued by OPSC, OSSC, OSSSC, and BSE Odisha are cited or summarized under fair dealing provisions (Section 52 of the Indian Copyright Act, 1957) purely for educational commentary, student awareness, and non-commercial candidate guidance.", active: true },
          { id: "CP-03", number: "3", title: "Third-Party Logos & Nominative Fair Use", category: "Trademarks", body: "Institutional emblems, logos, and acronyms of statutory examination boards are displayed solely for nominative identification of respective recruitment tests. Common Sense Odisha claims no ownership over third-party trademarks.", active: true },
          { id: "CP-04", number: "4", title: "DMCA & Statutory Notice Takedown Procedure", category: "Takedown", body: "If you are a copyright owner or authorized agent and believe content on this portal infringes your intellectual property, submit a written notice to dmca@csodisha.com including: proof of ownership, specific infringing URL, identification of work, and contact details. Bona fide notices are resolved within 48 business hours.", active: true },
          { id: "CP-05", number: "5", title: "Repeat Infringer Policy", category: "Enforcement", body: "In accordance with standard digital service governance, any user or contributor repeatedly uploading unauthorized materials to interactive portal sections will have their access terminated immediately.", active: true }
        ],
        fairUseNotice: "Content is published solely for candidate guidance in Odisha. Commercial reproduction or unauthorized paid redistribution is strictly prohibited."
      };
      localStorage.setItem('cso_copyright_config', JSON.stringify(initial));
      this.logAudit('COPYRIGHT_CONFIG_RESET', 'COPYRIGHT_DMCA', `Copyright configuration restored to factory default schema.`);
      return initial;
    },

    exportCopyrightManifest() {
      const config = this.getCopyrightConfig();
      const timestamp = Date.now();
      const filename = `cso-copyright-config-${timestamp}.json`;
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        copyright: config
      };

      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.logAudit('COPYRIGHT_MANIFEST_EXPORTED', 'DATA_EXPORT', `Copyright manifest exported (${filename}).`);
      return filename;
    },

    
    // 32. Editorial Policy & Gazette Verification Standards Engine (module-03-008)
    getEditorialConfig() {
      const raw = localStorage.getItem("cso_editorial_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_editorial_config", e);
        }
      }
      const initial = {
        meta: { version: "1.5", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: { title: "Editorial Integrity & Verification Standards", badge: "Gazette-Backed Fact Checking", lastReviewed: "2026-11-01" },
        standards: [
          { id: "ED-01", title: "Dual-Source Gazette Verification", category: "Verification", body: "Every exam syllabus, eligibility cutoff, and recruitment date must be reconciled against an official government gazette or primary commission portal (OPSC, OSSC, OSSSC) before publication.", active: true },
          { id: "ED-02", title: "Non-Commercial Academic Independence", category: "Independence", body: "Our editorial staff and syllabus curators maintain complete autonomy. No sponsored coaching material or unverified promotional claims are permitted.", active: true },
          { id: "ED-03", title: "Plain Language Accessibility", category: "Pedagogy", body: "Complex recruitment notifications are translated into simplified, structured Odia and English breakdowns for equal candidate comprehension.", active: true }
        ],
        ethicsSummary: "Common Sense Odisha strictly rejects speculative clickbait, misleading recruitment dates, and unverified coaching predictions."
      };
      localStorage.setItem("cso_editorial_config", JSON.stringify(initial));
      return initial;
    },

    saveEditorialConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid editorial configuration payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_editorial_config", JSON.stringify(config));
      this.logAudit("EDITORIAL_CONFIG_UPDATED", "EDITORIAL_POLICY", "Editorial policy configuration saved.");
      return config;
    },

    importEditorialConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveEditorialConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import editorial policy: " + err.message);
      }
    },

    resetEditorialConfig() {
      const initial = {
        meta: { version: "1.5", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: { title: "Editorial Integrity & Verification Standards", badge: "Gazette-Backed Fact Checking", lastReviewed: "2026-11-01" },
        standards: [
          { id: "ED-01", title: "Dual-Source Gazette Verification", category: "Verification", body: "Every exam syllabus, eligibility cutoff, and recruitment date must be reconciled against an official government gazette or primary commission portal (OPSC, OSSC, OSSSC) before publication.", active: true },
          { id: "ED-02", title: "Non-Commercial Academic Independence", category: "Independence", body: "Our editorial staff and syllabus curators maintain complete autonomy. No sponsored coaching material or unverified promotional claims are permitted.", active: true },
          { id: "ED-03", title: "Plain Language Accessibility", category: "Pedagogy", body: "Complex recruitment notifications are translated into simplified, structured Odia and English breakdowns for equal candidate comprehension.", active: true }
        ],
        ethicsSummary: "Common Sense Odisha strictly rejects speculative clickbait, misleading recruitment dates, and unverified coaching predictions."
      };
      localStorage.setItem("cso_editorial_config", JSON.stringify(initial));
      this.logAudit("EDITORIAL_CONFIG_RESET", "EDITORIAL_POLICY", "Editorial configuration restored to defaults.");
      return initial;
    },

    exportEditorialManifest() {
      const config = this.getEditorialConfig();
      const timestamp = Date.now();
      const filename = "cso-editorial-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        editorial: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("EDITORIAL_MANIFEST_EXPORTED", "DATA_EXPORT", "Editorial manifest exported (" + filename + ").");
      return filename;
    },

    // 33. Corrections Policy & Retraction Protocol Engine (module-03-009)
    getCorrectionsConfig() {
      const raw = localStorage.getItem("cso_corrections_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_corrections_config", e);
        }
      }
      const initial = {
        meta: { version: "1.3", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: { title: "Corrections & Retraction Policy", badge: "Transparent Accountability", lastReviewed: "2026-11-01" },
        desk: {
          deskName: "Editorial Fact-Check & Retraction Desk",
          email: "corrections@csodisha.com",
          turnaroundHours: 24,
          portalSection: "Trust Layer & Verification Log"
        },
        workflow: [
          { step: 1, title: "Candidate or Reader Flag", description: "Any user flags a discrepancy with primary gazette citation via corrections desk or feedback form." },
          { step: 2, title: "Independent Verification", description: "Verification desk cross-references official gazette, corrigendum notices, and commission archives within 24 hours." },
          { step: 3, title: "Transparent Retraction Note", description: "If an error exists, the article is updated immediately with an explicit, high-visibility retraction badge and timestamped revision note." }
        ],
        recentCorrections: [
          { id: "CORR-2026-01", date: "2026-10-18", module: "OSSC CGL 2026", note: "Corrected age relaxation eligibility bracket for SEBC candidates in accordance with Corrigendum No. 418/OSSC.", verifiedBy: "Senior Fact Checker" },
          { id: "CORR-2026-02", date: "2026-10-25", module: "OPSC OCS Preliminary", note: "Reconciled CSAT qualifying benchmark from 33% to notification standard.", verifiedBy: "Academic Director" }
        ]
      };
      localStorage.setItem("cso_corrections_config", JSON.stringify(initial));
      return initial;
    },

    saveCorrectionsConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid corrections configuration payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_corrections_config", JSON.stringify(config));
      this.logAudit("CORRECTIONS_CONFIG_UPDATED", "CORRECTIONS_POLICY", "Corrections policy configuration saved.");
      return config;
    },

    importCorrectionsConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveCorrectionsConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import corrections policy: " + err.message);
      }
    },

    resetCorrectionsConfig() {
      const initial = {
        meta: { version: "1.3", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: { title: "Corrections & Retraction Policy", badge: "Transparent Accountability", lastReviewed: "2026-11-01" },
        desk: {
          deskName: "Editorial Fact-Check & Retraction Desk",
          email: "corrections@csodisha.com",
          turnaroundHours: 24,
          portalSection: "Trust Layer & Verification Log"
        },
        workflow: [
          { step: 1, title: "Candidate or Reader Flag", description: "Any user flags a discrepancy with primary gazette citation via corrections desk or feedback form." },
          { step: 2, title: "Independent Verification", description: "Verification desk cross-references official gazette, corrigendum notices, and commission archives within 24 hours." },
          { step: 3, title: "Transparent Retraction Note", description: "If an error exists, the article is updated immediately with an explicit, high-visibility retraction badge and timestamped revision note." }
        ],
        recentCorrections: [
          { id: "CORR-2026-01", date: "2026-10-18", module: "OSSC CGL 2026", note: "Corrected age relaxation eligibility bracket for SEBC candidates in accordance with Corrigendum No. 418/OSSC.", verifiedBy: "Senior Fact Checker" },
          { id: "CORR-2026-02", date: "2026-10-25", module: "OPSC OCS Preliminary", note: "Reconciled CSAT qualifying benchmark from 33% to notification standard.", verifiedBy: "Academic Director" }
        ]
      };
      localStorage.setItem("cso_corrections_config", JSON.stringify(initial));
      this.logAudit("CORRECTIONS_CONFIG_RESET", "CORRECTIONS_POLICY", "Corrections configuration restored to defaults.");
      return initial;
    },

    exportCorrectionsManifest() {
      const config = this.getCorrectionsConfig();
      const timestamp = Date.now();
      const filename = "cso-corrections-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        corrections: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("CORRECTIONS_MANIFEST_EXPORTED", "DATA_EXPORT", "Corrections manifest exported (" + filename + ").");
      return filename;
    },

    // 34. Accessibility Statement & WCAG 2.1 AA Engine (module-03-010)
    getAccessibilityConfig() {
      const raw = localStorage.getItem("cso_accessibility_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_accessibility_config", e);
        }
      }
      const initial = {
        meta: { version: "2.1", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: {
          title: "Web Accessibility Statement",
          standard: "WCAG 2.1 Level AA & Rights of Persons with Disabilities Act (RPwD), 2016",
          badge: "Inclusive Digital Access",
          lastAudited: "2026-11-01"
        },
        officer: {
          title: "Digital Accessibility Coordinator",
          email: "accessibility@csodisha.com",
          address: "Common Sense Odisha Academic Node, Bhubaneswar, Odisha - 751001",
          responseSlaHours: 48
        },
        features: [
          { id: "ACC-01", name: "High Contrast Theme Engine", status: "Supported", description: "Built-in dark mode and high-contrast color palette exceeding WCAG 4.5:1 ratio." },
          { id: "ACC-02", name: "Screen Reader & ARIA Semantics", status: "Supported", description: "Landmarks, breadcrumbs, modal traps, and tables structured with semantic HTML5 and ARIA 1.2 roles." },
          { id: "ACC-03", name: "Full Keyboard Navigation", status: "Supported", description: "All interactive controls, navigation trees, and modals are accessible via Tab/Shift+Tab and Enter/Esc." },
          { id: "ACC-04", name: "Bilingual Multilingual Support", status: "Partial", description: "Core syllabi and critical exam notices translated into Odia script; continuous expansion ongoing." }
        ],
        commitmentStatement: "Common Sense Odisha is committed to ensuring digital accessibility for candidates with disabilities across all 30 districts of Odisha. We continuously improve user experience for everyone."
      };
      localStorage.setItem("cso_accessibility_config", JSON.stringify(initial));
      return initial;
    },

    saveAccessibilityConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid accessibility configuration payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_accessibility_config", JSON.stringify(config));
      this.logAudit("ACCESSIBILITY_CONFIG_UPDATED", "ACCESSIBILITY_STATEMENT", "Accessibility statement configuration saved.");
      return config;
    },

    importAccessibilityConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveAccessibilityConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import accessibility config: " + err.message);
      }
    },

    resetAccessibilityConfig() {
      const initial = {
        meta: { version: "2.1", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: {
          title: "Web Accessibility Statement",
          standard: "WCAG 2.1 Level AA & Rights of Persons with Disabilities Act (RPwD), 2016",
          badge: "Inclusive Digital Access",
          lastAudited: "2026-11-01"
        },
        officer: {
          title: "Digital Accessibility Coordinator",
          email: "accessibility@csodisha.com",
          address: "Common Sense Odisha Academic Node, Bhubaneswar, Odisha - 751001",
          responseSlaHours: 48
        },
        features: [
          { id: "ACC-01", name: "High Contrast Theme Engine", status: "Supported", description: "Built-in dark mode and high-contrast color palette exceeding WCAG 4.5:1 ratio." },
          { id: "ACC-02", name: "Screen Reader & ARIA Semantics", status: "Supported", description: "Landmarks, breadcrumbs, modal traps, and tables structured with semantic HTML5 and ARIA 1.2 roles." },
          { id: "ACC-03", name: "Full Keyboard Navigation", status: "Supported", description: "All interactive controls, navigation trees, and modals are accessible via Tab/Shift+Tab and Enter/Esc." },
          { id: "ACC-04", name: "Bilingual Multilingual Support", status: "Partial", description: "Core syllabi and critical exam notices translated into Odia script; continuous expansion ongoing." }
        ],
        commitmentStatement: "Common Sense Odisha is committed to ensuring digital accessibility for candidates with disabilities across all 30 districts of Odisha. We continuously improve user experience for everyone."
      };
      localStorage.setItem("cso_accessibility_config", JSON.stringify(initial));
      this.logAudit("ACCESSIBILITY_CONFIG_RESET", "ACCESSIBILITY_STATEMENT", "Accessibility configuration restored to defaults.");
      return initial;
    },

    exportAccessibilityManifest() {
      const config = this.getAccessibilityConfig();
      const timestamp = Date.now();
      const filename = "cso-accessibility-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        accessibility: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("ACCESSIBILITY_MANIFEST_EXPORTED", "DATA_EXPORT", "Accessibility manifest exported (" + filename + ").");
      return filename;
    },

    
    // 35. Refund & Cancellation Policy Engine (module-03-011)
    getRefundConfig() {
      const raw = localStorage.getItem("cso_refund_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_refund_config", e);
        }
      }
      const initial = {
        meta: { version: "1.2", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: { title: "Refund & Cancellation Policy", badge: "100% Free Public Resource Guarantee", lastReviewed: "2026-11-01" },
        provisions: [
          { id: "REF-01", title: "Universal Free Access Guarantee", category: "Public Resource", body: "Common Sense Odisha provides syllabi, exam analyses, and educational resources completely free of charge. No payment gateway is integrated, and no fees are ever assessed.", active: true },
          { id: "REF-02", title: "Third-Party Fraud Warning", category: "Advisory", body: "Candidates are cautioned against fraudulent third-party agents soliciting money under our brand name. We never request payments, bank details, or UPI transfers.", active: true },
          { id: "REF-03", title: "Digital Materials Cancellation Terms", category: "Digital Services", body: "Because all digital preparatory materials and downloads are provided freely without commercial transaction, formal billing cancellations and refund requests are not applicable.", active: true }
        ],
        supportDesk: { email: "grievance@csodisha.com", note: "Report any fraudulent fee solicitations directly to our grievance desk." }
      };
      localStorage.setItem("cso_refund_config", JSON.stringify(initial));
      return initial;
    },

    saveRefundConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid refund configuration payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_refund_config", JSON.stringify(config));
      this.logAudit("REFUND_CONFIG_UPDATED", "REFUND_POLICY", "Refund policy configuration saved.");
      return config;
    },

    importRefundConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveRefundConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import refund policy: " + err.message);
      }
    },

    resetRefundConfig() {
      const initial = {
        meta: { version: "1.2", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: { title: "Refund & Cancellation Policy", badge: "100% Free Public Resource Guarantee", lastReviewed: "2026-11-01" },
        provisions: [
          { id: "REF-01", title: "Universal Free Access Guarantee", category: "Public Resource", body: "Common Sense Odisha provides syllabi, exam analyses, and educational resources completely free of charge. No payment gateway is integrated, and no fees are ever assessed.", active: true },
          { id: "REF-02", title: "Third-Party Fraud Warning", category: "Advisory", body: "Candidates are cautioned against fraudulent third-party agents soliciting money under our brand name. We never request payments, bank details, or UPI transfers.", active: true },
          { id: "REF-03", title: "Digital Materials Cancellation Terms", category: "Digital Services", body: "Because all digital preparatory materials and downloads are provided freely without commercial transaction, formal billing cancellations and refund requests are not applicable.", active: true }
        ],
        supportDesk: { email: "grievance@csodisha.com", note: "Report any fraudulent fee solicitations directly to our grievance desk." }
      };
      localStorage.setItem("cso_refund_config", JSON.stringify(initial));
      this.logAudit("REFUND_CONFIG_RESET", "REFUND_POLICY", "Refund configuration restored to defaults.");
      return initial;
    },

    exportRefundManifest() {
      const config = this.getRefundConfig();
      const timestamp = Date.now();
      const filename = "cso-refund-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        refund: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("REFUND_MANIFEST_EXPORTED", "DATA_EXPORT", "Refund manifest exported (" + filename + ").");
      return filename;
    },

    // 36. Shipping & Digital Delivery Policy Engine (module-03-012)
    getDeliveryConfig() {
      const raw = localStorage.getItem("cso_delivery_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_delivery_config", e);
        }
      }
      const initial = {
        meta: { version: "1.4", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: { title: "Shipping & Digital Delivery Policy", badge: "Instant Edge Distribution", lastReviewed: "2026-11-01" },
        modes: [
          { id: "DEL-01", title: "Immediate Digital Access", format: "Direct Web / PDF Download", speed: "Instant (< 2 Seconds)", description: "Curated syllabus guides, previous question compilations, and model tests are delivered instantaneously via high-speed Cloudflare CDN edge nodes across Odisha.", active: true },
          { id: "DEL-02", title: "Zero Physical Shipping Notice", format: "Paperless Digital", speed: "N/A", description: "Common Sense Odisha does not print, warehouse, or physically ship paper textbooks or hardcopy notes via postal services. All instructional assets remain 100% paperless.", active: true },
          { id: "DEL-03", title: "Offline & Low-Bandwidth Caching", format: "Service Worker PWA", speed: "Immediate", description: "Aspirants in interior and rural districts can access cached study notes and previous questions even with intermittent 2G/3G connectivity.", active: true }
        ],
        infrastructure: {
          cdnProvider: "Cloudflare Global Anycast Edge Network",
          odishaNodes: "Bhubaneswar Edge POP & Kolkata Regional Data Center",
          downtimeSla: "99.9% Uptime Commitment",
          supportEmail: "tech@csodisha.com"
        }
      };
      localStorage.setItem("cso_delivery_config", JSON.stringify(initial));
      return initial;
    },

    saveDeliveryConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid delivery configuration payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_delivery_config", JSON.stringify(config));
      this.logAudit("DELIVERY_CONFIG_UPDATED", "DELIVERY_POLICY", "Delivery policy configuration saved.");
      return config;
    },

    importDeliveryConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveDeliveryConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import delivery policy: " + err.message);
      }
    },

    resetDeliveryConfig() {
      const initial = {
        meta: { version: "1.4", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: { title: "Shipping & Digital Delivery Policy", badge: "Instant Edge Distribution", lastReviewed: "2026-11-01" },
        modes: [
          { id: "DEL-01", title: "Immediate Digital Access", format: "Direct Web / PDF Download", speed: "Instant (< 2 Seconds)", description: "Curated syllabus guides, previous question compilations, and model tests are delivered instantaneously via high-speed Cloudflare CDN edge nodes across Odisha.", active: true },
          { id: "DEL-02", title: "Zero Physical Shipping Notice", format: "Paperless Digital", speed: "N/A", description: "Common Sense Odisha does not print, warehouse, or physically ship paper textbooks or hardcopy notes via postal services. All instructional assets remain 100% paperless.", active: true },
          { id: "DEL-03", title: "Offline & Low-Bandwidth Caching", format: "Service Worker PWA", speed: "Immediate", description: "Aspirants in interior and rural districts can access cached study notes and previous questions even with intermittent 2G/3G connectivity.", active: true }
        ],
        infrastructure: {
          cdnProvider: "Cloudflare Global Anycast Edge Network",
          odishaNodes: "Bhubaneswar Edge POP & Kolkata Regional Data Center",
          downtimeSla: "99.9% Uptime Commitment",
          supportEmail: "tech@csodisha.com"
        }
      };
      localStorage.setItem("cso_delivery_config", JSON.stringify(initial));
      this.logAudit("DELIVERY_CONFIG_RESET", "DELIVERY_POLICY", "Delivery configuration restored to defaults.");
      return initial;
    },

    exportDeliveryManifest() {
      const config = this.getDeliveryConfig();
      const timestamp = Date.now();
      const filename = "cso-delivery-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        delivery: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("DELIVERY_MANIFEST_EXPORTED", "DATA_EXPORT", "Delivery manifest exported (" + filename + ").");
      return filename;
    },

    // 37. Community Guidelines & Code of Conduct Engine (module-03-013)
    getCommunityConfig() {
      const raw = localStorage.getItem("cso_community_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_community_config", e);
        }
      }
      const initial = {
        meta: { version: "2.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: { title: "Community Guidelines & Forum Code of Conduct", badge: "Candidate Mutual Respect", lastReviewed: "2026-11-01" },
        moderation: {
          team: "Academic Community & Forum Moderation Council",
          email: "community@csodisha.com",
          enforcementLevel: "Zero Tolerance for Hate Speech & Exam Malpractice",
          appealWindowDays: 14
        },
        rules: [
          { id: "COMM-01", number: "1", title: "Constructive Academic Discussion", category: "Conduct", description: "Discussions, comments, and study room interactions must remain strictly focused on academic preparation, syllabus doubts, and civil peer mentoring.", active: true },
          { id: "COMM-02", number: "2", title: "Zero Tolerance for Question Paper Leaks or Cheating", category: "Integrity", description: "Posting, requesting, or circulating alleged leaked question papers, examination malpractice materials, or unfair means will result in immediate permanent ban and referral to cyber authorities under the Odisha Public Examinations (Prevention of Unfair Means) Act.", active: true },
          { id: "COMM-03", number: "3", title: "No Commercial Spam or Paid Promotion", category: "Non-Commercial", description: "Promoting paid coaching batches, private Telegram links, affiliate courses, or commercial products is strictly prohibited on all portal discussion forums.", active: true },
          { id: "COMM-04", number: "4", title: "Respectful Communication & Non-Discrimination", category: "Respect", description: "Harassment, abusive language, regional discrimination, gender-based disparagement, or caste-related slurs are grounds for instant account termination.", active: true }
        ],
        reportingProcedure: "To report inappropriate forum comments, suspected unfair means, or commercial spam, click the Flag button or email community@csodisha.com with direct link and screenshot."
      };
      localStorage.setItem("cso_community_config", JSON.stringify(initial));
      return initial;
    },

    saveCommunityConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid community configuration payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_community_config", JSON.stringify(config));
      this.logAudit("COMMUNITY_CONFIG_UPDATED", "COMMUNITY_GUIDELINES", "Community guidelines configuration saved.");
      return config;
    },

    importCommunityConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveCommunityConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import community guidelines: " + err.message);
      }
    },

    resetCommunityConfig() {
      const initial = {
        meta: { version: "2.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: { title: "Community Guidelines & Forum Code of Conduct", badge: "Candidate Mutual Respect", lastReviewed: "2026-11-01" },
        moderation: {
          team: "Academic Community & Forum Moderation Council",
          email: "community@csodisha.com",
          enforcementLevel: "Zero Tolerance for Hate Speech & Exam Malpractice",
          appealWindowDays: 14
        },
        rules: [
          { id: "COMM-01", number: "1", title: "Constructive Academic Discussion", category: "Conduct", description: "Discussions, comments, and study room interactions must remain strictly focused on academic preparation, syllabus doubts, and civil peer mentoring.", active: true },
          { id: "COMM-02", number: "2", title: "Zero Tolerance for Question Paper Leaks or Cheating", category: "Integrity", description: "Posting, requesting, or circulating alleged leaked question papers, examination malpractice materials, or unfair means will result in immediate permanent ban and referral to cyber authorities under the Odisha Public Examinations (Prevention of Unfair Means) Act.", active: true },
          { id: "COMM-03", number: "3", title: "No Commercial Spam or Paid Promotion", category: "Non-Commercial", description: "Promoting paid coaching batches, private Telegram links, affiliate courses, or commercial products is strictly prohibited on all portal discussion forums.", active: true },
          { id: "COMM-04", number: "4", title: "Respectful Communication & Non-Discrimination", category: "Respect", description: "Harassment, abusive language, regional discrimination, gender-based disparagement, or caste-related slurs are grounds for instant account termination.", active: true }
        ],
        reportingProcedure: "To report inappropriate forum comments, suspected unfair means, or commercial spam, click the Flag button or email community@csodisha.com with direct link and screenshot."
      };
      localStorage.setItem("cso_community_config", JSON.stringify(initial));
      this.logAudit("COMMUNITY_CONFIG_RESET", "COMMUNITY_GUIDELINES", "Community guidelines restored to defaults.");
      return initial;
    },

    exportCommunityManifest() {
      const config = this.getCommunityConfig();
      const timestamp = Date.now();
      const filename = "cso-community-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        community: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("COMMUNITY_MANIFEST_EXPORTED", "DATA_EXPORT", "Community manifest exported (" + filename + ").");
      return filename;
    },

    
    // 38. Candidate FAQs Engine (module-03-014)
    getFaqsConfig() {
      const raw = localStorage.getItem("cso_faqs_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_faqs_config", e);
        }
      }
      const initial = {
        meta: { version: "2.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: { title: "Candidate Frequently Asked Questions", badge: "Verified Academic Knowledgebase", lastReviewed: "2026-11-01" },
        categories: ["General", "OPSC / OSSC Exams", "Syllabus Verification", "Technical Access", "Grievance Desk"],
        items: [
          { id: "FAQ-01", question: "Is Common Sense Odisha an official government portal?", answer: "No. Common Sense Odisha is an independent civic and educational intelligence gateway. We synthesize official Odisha Gazette publications and commission releases to assist aspirants across all 30 districts.", category: "General", active: true },
          { id: "FAQ-02", question: "Are study materials and syllabus breakdowns 100% free?", answer: "Yes. All digital materials, syllabus roadmaps, and PYQ analysis tools are delivered completely free without subscription paywalls.", category: "Syllabus Verification", active: true },
          { id: "FAQ-03", question: "How often are examination updates verified against official gazettes?", answer: "Our academic editorial desk runs reconciliation scans within 24 hours of any formal gazette notification released by OPSC, OSSC, OSSSC, or BSE Odisha.", category: "OPSC / OSSC Exams", active: true },
          { id: "FAQ-04", question: "Who do I contact if I discover a discrepancy in syllabus markings?", answer: "Aspirants can submit errata directly to corrections@csodisha.com or through our Corrections Desk under module-03-009.", category: "Grievance Desk", active: true }
        ]
      };
      localStorage.setItem("cso_faqs_config", JSON.stringify(initial));
      return initial;
    },

    saveFaqsConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid FAQs configuration payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_faqs_config", JSON.stringify(config));
      this.logAudit("FAQS_CONFIG_UPDATED", "FAQS_ENGINE", "FAQs knowledgebase configuration saved.");
      return config;
    },

    importFaqsConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveFaqsConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import FAQs knowledgebase: " + err.message);
      }
    },

    resetFaqsConfig() {
      const initial = {
        meta: { version: "2.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: { title: "Candidate Frequently Asked Questions", badge: "Verified Academic Knowledgebase", lastReviewed: "2026-11-01" },
        categories: ["General", "OPSC / OSSC Exams", "Syllabus Verification", "Technical Access", "Grievance Desk"],
        items: [
          { id: "FAQ-01", question: "Is Common Sense Odisha an official government portal?", answer: "No. Common Sense Odisha is an independent civic and educational intelligence gateway. We synthesize official Odisha Gazette publications and commission releases to assist aspirants across all 30 districts.", category: "General", active: true },
          { id: "FAQ-02", question: "Are study materials and syllabus breakdowns 100% free?", answer: "Yes. All digital materials, syllabus roadmaps, and PYQ analysis tools are delivered completely free without subscription paywalls.", category: "Syllabus Verification", active: true },
          { id: "FAQ-03", question: "How often are examination updates verified against official gazettes?", answer: "Our academic editorial desk runs reconciliation scans within 24 hours of any formal gazette notification released by OPSC, OSSC, OSSSC, or BSE Odisha.", category: "OPSC / OSSC Exams", active: true },
          { id: "FAQ-04", question: "Who do I contact if I discover a discrepancy in syllabus markings?", answer: "Aspirants can submit errata directly to corrections@csodisha.com or through our Corrections Desk under module-03-009.", category: "Grievance Desk", active: true }
        ]
      };
      localStorage.setItem("cso_faqs_config", JSON.stringify(initial));
      this.logAudit("FAQS_CONFIG_RESET", "FAQS_ENGINE", "FAQs knowledgebase restored to defaults.");
      return initial;
    },

    exportFaqsManifest() {
      const config = this.getFaqsConfig();
      const timestamp = Date.now();
      const filename = "cso-faqs-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        faqs: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("FAQS_MANIFEST_EXPORTED", "DATA_EXPORT", "FAQs manifest exported (" + filename + ").");
      return filename;
    },

    // 39. Custom Information Pages Engine (module-03-015)
    getCustomPagesConfig() {
      const raw = localStorage.getItem("cso_custom_pages_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_custom_pages_config", e);
        }
      }
      const initial = {
        meta: { version: "1.1", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        pages: [
          {
            id: "CUST-01",
            slug: "academic-node-charter",
            title: "Odisha Academic Node Charter",
            category: "Institutional",
            badge: "Civic Mission",
            summary: "Charter outlining our district volunteer network and grassroots educational data verification.",
            content: "The Odisha Academic Node operates decentralized study cells across Balasore, Mayurbhanj, Koraput, and Sambalpur to verify candidate notification needs directly.",
            published: true,
            updatedAt: "2026-11-01"
          },
          {
            id: "CUST-02",
            slug: "tribal-district-outreach",
            title: "Tribal District Educational Outreach",
            category: "Public Outreach",
            badge: "Low-Bandwidth Inclusion",
            summary: "Initiative to distribute offline-cached PDF syllabi to candidates with limited cellular connectivity.",
            content: "Through offline PWA distribution, educational resources reach aspiring youth in southern and western Odisha without high-speed data barriers.",
            published: true,
            updatedAt: "2026-11-01"
          }
        ]
      };
      localStorage.setItem("cso_custom_pages_config", JSON.stringify(initial));
      return initial;
    },

    saveCustomPagesConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid custom pages payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_custom_pages_config", JSON.stringify(config));
      this.logAudit("CUSTOM_PAGES_CONFIG_UPDATED", "CUSTOM_PAGES", "Custom information pages configuration saved.");
      return config;
    },

    importCustomPagesConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveCustomPagesConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import custom pages: " + err.message);
      }
    },

    resetCustomPagesConfig() {
      const initial = {
        meta: { version: "1.1", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        pages: [
          {
            id: "CUST-01",
            slug: "academic-node-charter",
            title: "Odisha Academic Node Charter",
            category: "Institutional",
            badge: "Civic Mission",
            summary: "Charter outlining our district volunteer network and grassroots educational data verification.",
            content: "The Odisha Academic Node operates decentralized study cells across Balasore, Mayurbhanj, Koraput, and Sambalpur to verify candidate notification needs directly.",
            published: true,
            updatedAt: "2026-11-01"
          },
          {
            id: "CUST-02",
            slug: "tribal-district-outreach",
            title: "Tribal District Educational Outreach",
            category: "Public Outreach",
            badge: "Low-Bandwidth Inclusion",
            summary: "Initiative to distribute offline-cached PDF syllabi to candidates with limited cellular connectivity.",
            content: "Through offline PWA distribution, educational resources reach aspiring youth in southern and western Odisha without high-speed data barriers.",
            published: true,
            updatedAt: "2026-11-01"
          }
        ]
      };
      localStorage.setItem("cso_custom_pages_config", JSON.stringify(initial));
      this.logAudit("CUSTOM_PAGES_CONFIG_RESET", "CUSTOM_PAGES", "Custom information pages restored to defaults.");
      return initial;
    },

    exportCustomPagesManifest() {
      const config = this.getCustomPagesConfig();
      const timestamp = Date.now();
      const filename = "cso-custom-pages-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        customPages: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("CUSTOM_PAGES_MANIFEST_EXPORTED", "DATA_EXPORT", "Custom pages manifest exported (" + filename + ").");
      return filename;
    },

    // 40. Legal Page Revision History Engine (module-03-016)
    getLegalRevisionsConfig() {
      const raw = localStorage.getItem("cso_legal_revisions_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_legal_revisions_config", e);
        }
      }
      const initial = {
        meta: { version: "3.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: { title: "Legal & Statutory Policy Revision Log", badge: "Statutory Transparency Audit Trail", lastAudited: "2026-11-01" },
        revisions: [
          {
            id: "REV-2026-06",
            date: "2026-11-01",
            moduleName: "module-03-007 Copyright & DMCA",
            version: "v2.0",
            editor: "Legal & Redressal Cell",
            summary: "Reconciled fair dealing statutory provisions with Section 52(1)(a) of Indian Copyright Act and configured 36h DMCA redressal SLA.",
            route: "/copyright.html"
          },
          {
            id: "REV-2026-05",
            date: "2026-11-01",
            moduleName: "module-03-006 Cookie Policy",
            version: "v1.2",
            editor: "Privacy Compliance Team",
            summary: "Codified edge telemetry cookies and session token lifecycles with 365-day retention policy.",
            route: "/cookie-policy.html"
          },
          {
            id: "REV-2026-04",
            date: "2026-11-01",
            moduleName: "module-03-005 Terms & Conditions",
            version: "v2.4",
            editor: "Statutory Governance Desk",
            summary: "Formalized 5-clause terms covering acceptance of educational scope and High Court of Orissa jurisdiction.",
            route: "/terms.html"
          },
          {
            id: "REV-2026-03",
            date: "2026-11-01",
            moduleName: "module-03-004 Official Disclaimer",
            version: "v2.1",
            editor: "Legal Counsel",
            summary: "Reinforced non-affiliation notices regarding OPSC, OSSC, and OSSSC government recruitment commissions.",
            route: "/disclaimer.html"
          },
          {
            id: "REV-2026-02",
            date: "2026-11-01",
            moduleName: "module-03-003 Privacy Policy",
            version: "v2.4",
            editor: "Data Protection Officer",
            summary: "DPDP Act 2023 compliance alignment, grievance turnaround SLA (48h), and zero-commercialization pledge.",
            route: "/privacy.html"
          },
          {
            id: "REV-2026-01",
            date: "2026-10-15",
            moduleName: "module-03-001 Site Identity & Mission",
            version: "v2.0",
            editor: "Academic Directorate",
            summary: "Standardized 30-district candidate educational mission and non-profit identity standards.",
            route: "/about.html"
          }
        ]
      };
      localStorage.setItem("cso_legal_revisions_config", JSON.stringify(initial));
      return initial;
    },

    saveLegalRevisionsConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid legal revisions configuration payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_legal_revisions_config", JSON.stringify(config));
      this.logAudit("LEGAL_REVISIONS_CONFIG_UPDATED", "LEGAL_REVISIONS", "Legal revisions log saved.");
      return config;
    },

    importLegalRevisionsConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveLegalRevisionsConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import legal revisions: " + err.message);
      }
    },

    resetLegalRevisionsConfig() {
      const initial = {
        meta: { version: "3.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        document: { title: "Legal & Statutory Policy Revision Log", badge: "Statutory Transparency Audit Trail", lastAudited: "2026-11-01" },
        revisions: [
          {
            id: "REV-2026-06",
            date: "2026-11-01",
            moduleName: "module-03-007 Copyright & DMCA",
            version: "v2.0",
            editor: "Legal & Redressal Cell",
            summary: "Reconciled fair dealing statutory provisions with Section 52(1)(a) of Indian Copyright Act and configured 36h DMCA redressal SLA.",
            route: "/copyright.html"
          },
          {
            id: "REV-2026-05",
            date: "2026-11-01",
            moduleName: "module-03-006 Cookie Policy",
            version: "v1.2",
            editor: "Privacy Compliance Team",
            summary: "Codified edge telemetry cookies and session token lifecycles with 365-day retention policy.",
            route: "/cookie-policy.html"
          },
          {
            id: "REV-2026-04",
            date: "2026-11-01",
            moduleName: "module-03-005 Terms & Conditions",
            version: "v2.4",
            editor: "Statutory Governance Desk",
            summary: "Formalized 5-clause terms covering acceptance of educational scope and High Court of Orissa jurisdiction.",
            route: "/terms.html"
          },
          {
            id: "REV-2026-03",
            date: "2026-11-01",
            moduleName: "module-03-004 Official Disclaimer",
            version: "v2.1",
            editor: "Legal Counsel",
            summary: "Reinforced non-affiliation notices regarding OPSC, OSSC, and OSSSC government recruitment commissions.",
            route: "/disclaimer.html"
          },
          {
            id: "REV-2026-02",
            date: "2026-11-01",
            moduleName: "module-03-003 Privacy Policy",
            version: "v2.4",
            editor: "Data Protection Officer",
            summary: "DPDP Act 2023 compliance alignment, grievance turnaround SLA (48h), and zero-commercialization pledge.",
            route: "/privacy.html"
          },
          {
            id: "REV-2026-01",
            date: "2026-10-15",
            moduleName: "module-03-001 Site Identity & Mission",
            version: "v2.0",
            editor: "Academic Directorate",
            summary: "Standardized 30-district candidate educational mission and non-profit identity standards.",
            route: "/about.html"
          }
        ]
      };
      localStorage.setItem("cso_legal_revisions_config", JSON.stringify(initial));
      this.logAudit("LEGAL_REVISIONS_CONFIG_RESET", "LEGAL_REVISIONS", "Legal revisions log restored to defaults.");
      return initial;
    },

    exportLegalRevisionsManifest() {
      const config = this.getLegalRevisionsConfig();
      const timestamp = Date.now();
      const filename = "cso-legal-revisions-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        legalRevisions: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("LEGAL_REVISIONS_MANIFEST_EXPORTED", "DATA_EXPORT", "Legal revisions manifest exported (" + filename + ").");
      return filename;
    },

    
    // 41. All Content Management Engine (module-04-001)
    getAllContentConfig() {
      const raw = localStorage.getItem("cso_all_content_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_all_content_config", e);
        }
      }
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        filterDefaults: { type: "All", status: "All", search: "" },
        items: [
          { id: "CNT-001", title: "OPSC OAS 2026 Prelims Syllabus Breakdown & Cutoff Trends", type: "Article", category: "Civil Services", author: "Editorial Desk", status: "Published", date: "2026-11-05", reads: 1420 },
          { id: "CNT-002", title: "OSSC CGL Tier-II Technical Services Corrigendum Released", type: "News", category: "Staff Selection", author: "Commission Watch", status: "Published", date: "2026-11-08", reads: 3200 },
          { id: "CNT-003", title: "Daily Odisha Affairs: State Cabinet Rural Clearances", type: "Current Affairs", category: "Odisha State", author: "Academic Cell", status: "Published", date: "2026-11-09", reads: 890 },
          { id: "CNT-004", title: "OSSSC Revenue Inspector & Amin District Vacancy Forecast", type: "Article", category: "Subordinate Services", author: "Editorial Desk", status: "Draft", date: "2026-11-09", reads: 0 }
        ]
      };
      localStorage.setItem("cso_all_content_config", JSON.stringify(initial));
      return initial;
    },

    saveAllContentConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid all content configuration payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_all_content_config", JSON.stringify(config));
      this.logAudit("ALL_CONTENT_CONFIG_UPDATED", "CONTENT_PUBLISHING", "All content catalog updated.");
      return config;
    },

    importAllContentConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveAllContentConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import all content config: " + err.message);
      }
    },

    resetAllContentConfig() {
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        filterDefaults: { type: "All", status: "All", search: "" },
        items: [
          { id: "CNT-001", title: "OPSC OAS 2026 Prelims Syllabus Breakdown & Cutoff Trends", type: "Article", category: "Civil Services", author: "Editorial Desk", status: "Published", date: "2026-11-05", reads: 1420 },
          { id: "CNT-002", title: "OSSC CGL Tier-II Technical Services Corrigendum Released", type: "News", category: "Staff Selection", author: "Commission Watch", status: "Published", date: "2026-11-08", reads: 3200 },
          { id: "CNT-003", title: "Daily Odisha Affairs: State Cabinet Rural Clearances", type: "Current Affairs", category: "Odisha State", author: "Academic Cell", status: "Published", date: "2026-11-09", reads: 890 },
          { id: "CNT-004", title: "OSSSC Revenue Inspector & Amin District Vacancy Forecast", type: "Article", category: "Subordinate Services", author: "Editorial Desk", status: "Draft", date: "2026-11-09", reads: 0 }
        ]
      };
      localStorage.setItem("cso_all_content_config", JSON.stringify(initial));
      this.logAudit("ALL_CONTENT_CONFIG_RESET", "CONTENT_PUBLISHING", "All content catalog restored to factory defaults.");
      return initial;
    },

    exportAllContentManifest() {
      const config = this.getAllContentConfig();
      const timestamp = Date.now();
      const filename = "cso-all-content-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        allContent: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("ALL_CONTENT_MANIFEST_EXPORTED", "DATA_EXPORT", "All content manifest exported (" + filename + ").");
      return filename;
    },

    // 42. Articles & Blogs Engine (module-04-002)
    getArticlesConfig() {
      const raw = localStorage.getItem("cso_articles_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_articles_config", e);
        }
      }
      const initial = {
        meta: { version: "1.2", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        settings: { defaultAuthor: "Editorial Desk", allowCandidateComments: true, notifyOnSubmission: true },
        articles: [
          {
            id: "ART-101",
            slug: "opsc-oas-prelims-strategy",
            title: "OPSC OAS 2026 Prelims: High-Yield Topic Matrix & Cutoff Trends",
            category: "Civil Services",
            author: "Dr. B. K. Mohapatra",
            status: "Published",
            publishedAt: "2026-11-04",
            readTime: "7 Min",
            featured: true,
            summary: "Exhaustive statistical breakdown of previous 5 years OPSC OAS prelims scoring cutoffs and thematic question distribution."
          },
          {
            id: "ART-102",
            slug: "osssc-ri-amin-computer-skill",
            title: "Mastering the OSSSC Practical Skill Test for RI, ARI & Amin",
            category: "Subordinate Services",
            author: "Academic Cell",
            status: "Published",
            publishedAt: "2026-11-07",
            readTime: "5 Min",
            featured: false,
            summary: "Step-by-step guidance on MS Office, Odia typing, and database query practicals prescribed by OSSSC."
          },
          {
            id: "ART-103",
            slug: "tribal-history-and-culture-paper",
            title: "Odisha Tribal Heritage, Languages & Forest Rights in State Exams",
            category: "State Heritage",
            author: "Cultural Heritage Team",
            status: "Draft",
            publishedAt: "2026-11-09",
            readTime: "8 Min",
            featured: false,
            summary: "Comprehensive revision guide covering 62 Scheduled Tribes of Odisha and PVTG developmental schemes."
          }
        ]
      };
      localStorage.setItem("cso_articles_config", JSON.stringify(initial));
      return initial;
    },

    saveArticlesConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid articles configuration payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_articles_config", JSON.stringify(config));
      this.logAudit("ARTICLES_CONFIG_UPDATED", "CONTENT_PUBLISHING", "Articles and blogs catalog updated.");
      return config;
    },

    importArticlesConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveArticlesConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import articles: " + err.message);
      }
    },

    resetArticlesConfig() {
      const initial = {
        meta: { version: "1.2", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        settings: { defaultAuthor: "Editorial Desk", allowCandidateComments: true, notifyOnSubmission: true },
        articles: [
          {
            id: "ART-101",
            slug: "opsc-oas-prelims-strategy",
            title: "OPSC OAS 2026 Prelims: High-Yield Topic Matrix & Cutoff Trends",
            category: "Civil Services",
            author: "Dr. B. K. Mohapatra",
            status: "Published",
            publishedAt: "2026-11-04",
            readTime: "7 Min",
            featured: true,
            summary: "Exhaustive statistical breakdown of previous 5 years OPSC OAS prelims scoring cutoffs and thematic question distribution."
          },
          {
            id: "ART-102",
            slug: "osssc-ri-amin-computer-skill",
            title: "Mastering the OSSSC Practical Skill Test for RI, ARI & Amin",
            category: "Subordinate Services",
            author: "Academic Cell",
            status: "Published",
            publishedAt: "2026-11-07",
            readTime: "5 Min",
            featured: false,
            summary: "Step-by-step guidance on MS Office, Odia typing, and database query practicals prescribed by OSSSC."
          },
          {
            id: "ART-103",
            slug: "tribal-history-and-culture-paper",
            title: "Odisha Tribal Heritage, Languages & Forest Rights in State Exams",
            category: "State Heritage",
            author: "Cultural Heritage Team",
            status: "Draft",
            publishedAt: "2026-11-09",
            readTime: "8 Min",
            featured: false,
            summary: "Comprehensive revision guide covering 62 Scheduled Tribes of Odisha and PVTG developmental schemes."
          }
        ]
      };
      localStorage.setItem("cso_articles_config", JSON.stringify(initial));
      this.logAudit("ARTICLES_CONFIG_RESET", "CONTENT_PUBLISHING", "Articles and blogs restored to defaults.");
      return initial;
    },

    exportArticlesManifest() {
      const config = this.getArticlesConfig();
      const timestamp = Date.now();
      const filename = "cso-articles-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        articles: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("ARTICLES_MANIFEST_EXPORTED", "DATA_EXPORT", "Articles manifest exported (" + filename + ").");
      return filename;
    },

    // 43. News & Updates Engine (module-04-003)
    getNewsConfig() {
      const raw = localStorage.getItem("cso_news_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_news_config", e);
        }
      }
      const initial = {
        meta: { version: "1.1", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        feedSettings: { liveTickerEnabled: true, tickerSpeedSeconds: 25, autoArchiveDays: 60 },
        dispatches: [
          {
            id: "NEWS-501",
            title: "OSSC CGL Tier-II Revised Examination Dates Announced via Gazette Notice 3892",
            source: "OSSC Official Portal",
            severity: "Urgent",
            publishedAt: "2026-11-08 17:30",
            verifiedBy: "Gazette Desk",
            activeTicker: true,
            externalRef: "https://ossc.gov.in"
          },
          {
            id: "NEWS-502",
            title: "Odisha Teacher Eligibility Test (OTET) Scoring Keys Released for Candidate Challenge",
            source: "BSE Odisha Board",
            severity: "Important",
            publishedAt: "2026-11-07 11:15",
            verifiedBy: "Academic Desk",
            activeTicker: true,
            externalRef: "http://bseodisha.ac.in"
          },
          {
            id: "NEWS-503",
            title: "Bhubaneswar Examination Center Infrastructure Upgraded for Computer-Based Testing",
            source: "Department of Higher Education",
            severity: "Standard",
            publishedAt: "2026-11-06 09:00",
            verifiedBy: "Civic Watch",
            activeTicker: false,
            externalRef: ""
          }
        ]
      };
      localStorage.setItem("cso_news_config", JSON.stringify(initial));
      return initial;
    },

    saveNewsConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid news configuration payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_news_config", JSON.stringify(config));
      this.logAudit("NEWS_CONFIG_UPDATED", "CONTENT_PUBLISHING", "News & updates feed updated.");
      return config;
    },

    importNewsConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveNewsConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import news: " + err.message);
      }
    },

    resetNewsConfig() {
      const initial = {
        meta: { version: "1.1", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        feedSettings: { liveTickerEnabled: true, tickerSpeedSeconds: 25, autoArchiveDays: 60 },
        dispatches: [
          {
            id: "NEWS-501",
            title: "OSSC CGL Tier-II Revised Examination Dates Announced via Gazette Notice 3892",
            source: "OSSC Official Portal",
            severity: "Urgent",
            publishedAt: "2026-11-08 17:30",
            verifiedBy: "Gazette Desk",
            activeTicker: true,
            externalRef: "https://ossc.gov.in"
          },
          {
            id: "NEWS-502",
            title: "Odisha Teacher Eligibility Test (OTET) Scoring Keys Released for Candidate Challenge",
            source: "BSE Odisha Board",
            severity: "Important",
            publishedAt: "2026-11-07 11:15",
            verifiedBy: "Academic Desk",
            activeTicker: true,
            externalRef: "http://bseodisha.ac.in"
          },
          {
            id: "NEWS-503",
            title: "Bhubaneswar Examination Center Infrastructure Upgraded for Computer-Based Testing",
            source: "Department of Higher Education",
            severity: "Standard",
            publishedAt: "2026-11-06 09:00",
            verifiedBy: "Civic Watch",
            activeTicker: false,
            externalRef: ""
          }
        ]
      };
      localStorage.setItem("cso_news_config", JSON.stringify(initial));
      this.logAudit("NEWS_CONFIG_RESET", "CONTENT_PUBLISHING", "News & updates feed restored to defaults.");
      return initial;
    },

    exportNewsManifest() {
      const config = this.getNewsConfig();
      const timestamp = Date.now();
      const filename = "cso-news-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        news: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("NEWS_MANIFEST_EXPORTED", "DATA_EXPORT", "News manifest exported (" + filename + ").");
      return filename;
    },

    // 44. Current Affairs Engine (module-04-004)
    getCurrentAffairsConfig() {
      const raw = localStorage.getItem("cso_current_affairs_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_current_affairs_config", e);
        }
      }
      const initial = {
        meta: { version: "2.1", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        digestMeta: { edition: "November 2026 Weekly Capsule", focus: "State Governance & Exam Relevance" },
        capsules: [
          {
            id: "CA-901",
            title: "State Cabinet Approves 14 New Rural Industrial Corridors",
            date: "2026-11-08",
            domain: "Odisha Governance",
            keyFacts: "Focus on Keonjhar, Jharsuguda, and Rayagada industrial clusters; projected employment of 45,000 youth.",
            examRelevance: "High for OPSC OAS Mains Paper-III (Odisha Economy & Industrialization).",
            status: "Approved",
            pinned: true
          },
          {
            id: "CA-902",
            title: "Bhitarkanika National Park Census Confirms Surge in Saltwater Crocodiles",
            date: "2026-11-06",
            domain: "Environment & Ecology",
            keyFacts: "Recorded population reached 1,820; mangrove regeneration program cited as prime conservation driver.",
            examRelevance: "Crucial for OPSC OAS Prelims GS-I (Environment, Biodiversity and Climate Change).",
            status: "Approved",
            pinned: false
          },
          {
            id: "CA-903",
            title: "Odisha Renewable Energy Policy 2026 Targets 10GW Solar by 2030",
            date: "2026-11-04",
            domain: "Energy & Infrastructure",
            keyFacts: "Targeting floating solar plants over Hirakud and Rengali reservoirs with public-private participation.",
            examRelevance: "Directly mapped to OSSC CGL & OPSC Mains Science & Tech syllabus.",
            status: "Approved",
            pinned: false
          }
        ]
      };
      localStorage.setItem("cso_current_affairs_config", JSON.stringify(initial));
      return initial;
    },

    saveCurrentAffairsConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid current affairs configuration payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_current_affairs_config", JSON.stringify(config));
      this.logAudit("CURRENT_AFFAIRS_CONFIG_UPDATED", "CONTENT_PUBLISHING", "Current affairs capsule updated.");
      return config;
    },

    importCurrentAffairsConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveCurrentAffairsConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import current affairs: " + err.message);
      }
    },

    resetCurrentAffairsConfig() {
      const initial = {
        meta: { version: "2.1", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        digestMeta: { edition: "November 2026 Weekly Capsule", focus: "State Governance & Exam Relevance" },
        capsules: [
          {
            id: "CA-901",
            title: "State Cabinet Approves 14 New Rural Industrial Corridors",
            date: "2026-11-08",
            domain: "Odisha Governance",
            keyFacts: "Focus on Keonjhar, Jharsuguda, and Rayagada industrial clusters; projected employment of 45,000 youth.",
            examRelevance: "High for OPSC OAS Mains Paper-III (Odisha Economy & Industrialization).",
            status: "Approved",
            pinned: true
          },
          {
            id: "CA-902",
            title: "Bhitarkanika National Park Census Confirms Surge in Saltwater Crocodiles",
            date: "2026-11-06",
            domain: "Environment & Ecology",
            keyFacts: "Recorded population reached 1,820; mangrove regeneration program cited as prime conservation driver.",
            examRelevance: "Crucial for OPSC OAS Prelims GS-I (Environment, Biodiversity and Climate Change).",
            status: "Approved",
            pinned: false
          },
          {
            id: "CA-903",
            title: "Odisha Renewable Energy Policy 2026 Targets 10GW Solar by 2030",
            date: "2026-11-04",
            domain: "Energy & Infrastructure",
            keyFacts: "Targeting floating solar plants over Hirakud and Rengali reservoirs with public-private participation.",
            examRelevance: "Directly mapped to OSSC CGL & OPSC Mains Science & Tech syllabus.",
            status: "Approved",
            pinned: false
          }
        ]
      };
      localStorage.setItem("cso_current_affairs_config", JSON.stringify(initial));
      this.logAudit("CURRENT_AFFAIRS_CONFIG_RESET", "CONTENT_PUBLISHING", "Current affairs capsule restored to defaults.");
      return initial;
    },

    exportCurrentAffairsManifest() {
      const config = this.getCurrentAffairsConfig();
      const timestamp = Date.now();
      const filename = "cso-current-affairs-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        currentAffairs: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("CURRENT_AFFAIRS_MANIFEST_EXPORTED", "DATA_EXPORT", "Current affairs manifest exported (" + filename + ").");
      return filename;
    },

    
    // 45. Announcements & Notices Engine (module-04-005)
    getAnnouncementsConfig() {
      const raw = localStorage.getItem("cso_announcements_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_announcements_config", e);
        }
      }
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        ribbonSettings: { showTopRibbon: true, globalNoticeText: "OPSC OAS 2026 Prelims application deadline extended till 30th November.", bannerType: "Urgent" },
        notices: [
          { id: "NOT-01", title: "OSSC CGL Tier-II Technical Services Examination Date Rescheduled", category: "Exam Schedule", urgency: "High", targetAudience: "All Candidates", expiryDate: "2026-12-15", dismissible: true, active: true },
          { id: "NOT-02", title: "Notice regarding verification of sports certificate for Police SI Recruitment", category: "Verification", urgency: "Medium", targetAudience: "SI Aspirants", expiryDate: "2026-11-25", dismissible: false, active: true },
          { id: "NOT-03", title: "BSE Odisha OTET Answer Key Grievance Window Open", category: "Answer Key", urgency: "High", targetAudience: "Teacher Candidates", expiryDate: "2026-11-18", dismissible: true, active: true }
        ]
      };
      localStorage.setItem("cso_announcements_config", JSON.stringify(initial));
      return initial;
    },

    saveAnnouncementsConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid announcements configuration payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_announcements_config", JSON.stringify(config));
      this.logAudit("ANNOUNCEMENTS_CONFIG_UPDATED", "CONTENT_PUBLISHING", "Announcements & notices catalog updated.");
      return config;
    },

    importAnnouncementsConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveAnnouncementsConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import announcements: " + err.message);
      }
    },

    resetAnnouncementsConfig() {
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        ribbonSettings: { showTopRibbon: true, globalNoticeText: "OPSC OAS 2026 Prelims application deadline extended till 30th November.", bannerType: "Urgent" },
        notices: [
          { id: "NOT-01", title: "OSSC CGL Tier-II Technical Services Examination Date Rescheduled", category: "Exam Schedule", urgency: "High", targetAudience: "All Candidates", expiryDate: "2026-12-15", dismissible: true, active: true },
          { id: "NOT-02", title: "Notice regarding verification of sports certificate for Police SI Recruitment", category: "Verification", urgency: "Medium", targetAudience: "SI Aspirants", expiryDate: "2026-11-25", dismissible: false, active: true },
          { id: "NOT-03", title: "BSE Odisha OTET Answer Key Grievance Window Open", category: "Answer Key", urgency: "High", targetAudience: "Teacher Candidates", expiryDate: "2026-11-18", dismissible: true, active: true }
        ]
      };
      localStorage.setItem("cso_announcements_config", JSON.stringify(initial));
      this.logAudit("ANNOUNCEMENTS_CONFIG_RESET", "CONTENT_PUBLISHING", "Announcements & notices restored to defaults.");
      return initial;
    },

    exportAnnouncementsManifest() {
      const config = this.getAnnouncementsConfig();
      const timestamp = Date.now();
      const filename = "cso-announcements-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        announcements: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("ANNOUNCEMENTS_MANIFEST_EXPORTED", "DATA_EXPORT", "Announcements manifest exported (" + filename + ").");
      return filename;
    },

    // 46. Featured Content Engine (module-04-006)
    getFeaturedContentConfig() {
      const raw = localStorage.getItem("cso_featured_content_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_featured_content_config", e);
        }
      }
      const initial = {
        meta: { version: "1.1", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        showcaseSettings: { heroSliderEnabled: true, maxShowcaseSlots: 4, autoPlayIntervalSec: 6 },
        featuredItems: [
          { id: "FEAT-01", title: "OPSC OAS 2026 Master Strategy & Cutoff Predictor", contentType: "Article", placement: "Hero Banner", priority: 1, clickUrl: "/about.html", badge: "Aspirant Choice", active: true },
          { id: "FEAT-02", title: "Odisha Gazette Reconciliation Log & Corrigenda Tracker", contentType: "Tool / Desk", placement: "Home Spotlight", priority: 2, clickUrl: "/corrections-policy.html", badge: "Trust Layer", active: true },
          { id: "FEAT-03", title: "Complete 30 Districts Candidate Study Center Directory", contentType: "Directory", placement: "Sidebar Feature", priority: 3, clickUrl: "/contact.html", badge: "Verified", active: true }
        ]
      };
      localStorage.setItem("cso_featured_content_config", JSON.stringify(initial));
      return initial;
    },

    saveFeaturedContentConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid featured content payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_featured_content_config", JSON.stringify(config));
      this.logAudit("FEATURED_CONTENT_CONFIG_UPDATED", "CONTENT_PUBLISHING", "Featured content slots updated.");
      return config;
    },

    importFeaturedContentConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveFeaturedContentConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import featured content: " + err.message);
      }
    },

    resetFeaturedContentConfig() {
      const initial = {
        meta: { version: "1.1", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        showcaseSettings: { heroSliderEnabled: true, maxShowcaseSlots: 4, autoPlayIntervalSec: 6 },
        featuredItems: [
          { id: "FEAT-01", title: "OPSC OAS 2026 Master Strategy & Cutoff Predictor", contentType: "Article", placement: "Hero Banner", priority: 1, clickUrl: "/about.html", badge: "Aspirant Choice", active: true },
          { id: "FEAT-02", title: "Odisha Gazette Reconciliation Log & Corrigenda Tracker", contentType: "Tool / Desk", placement: "Home Spotlight", priority: 2, clickUrl: "/corrections-policy.html", badge: "Trust Layer", active: true },
          { id: "FEAT-03", title: "Complete 30 Districts Candidate Study Center Directory", contentType: "Directory", placement: "Sidebar Feature", priority: 3, clickUrl: "/contact.html", badge: "Verified", active: true }
        ]
      };
      localStorage.setItem("cso_featured_content_config", JSON.stringify(initial));
      this.logAudit("FEATURED_CONTENT_CONFIG_RESET", "CONTENT_PUBLISHING", "Featured content restored to defaults.");
      return initial;
    },

    exportFeaturedContentManifest() {
      const config = this.getFeaturedContentConfig();
      const timestamp = Date.now();
      const filename = "cso-featured-content-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        featuredContent: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("FEATURED_CONTENT_MANIFEST_EXPORTED", "DATA_EXPORT", "Featured content manifest exported (" + filename + ").");
      return filename;
    },

    // 47. Content Categories Taxonomy Engine (module-04-007)
    getContentCategoriesConfig() {
      const raw = localStorage.getItem("cso_content_categories_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_content_categories_config", e);
        }
      }
      const initial = {
        meta: { version: "2.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        categories: [
          { id: "CAT-01", slug: "civil-services", name: "Civil Services (OPSC OAS)", description: "Odisha Administrative Services, Judicial Services, and State Police Services recruitment intelligence.", icon: "🏛️", count: 48, active: true },
          { id: "CAT-02", slug: "staff-selection", name: "Staff Selection (OSSC)", description: "Combined Graduate Level (CGL), Technical Services, CTSRE, and Ministerial cadres.", icon: "📋", count: 72, active: true },
          { id: "CAT-03", slug: "subordinate-services", name: "Subordinate Services (OSSSC)", description: "Revenue Inspector (RI), ARI, Amin, Panchayat Executive Officer (PEO), and Forester.", icon: "🌾", count: 65, active: true },
          { id: "CAT-04", slug: "teacher-education", name: "Teacher Education & TET", description: "OTET, OSSTET, High School Teacher (RHT), and Junior Teacher certification and recruitment.", icon: "🎓", count: 34, active: true },
          { id: "CAT-05", slug: "police-defence", name: "Police & State Uniformed Services", description: "Odisha Police Sub-Inspector, Constable, Excise SI, and Fire Services recruitment.", icon: "🛡️", count: 29, active: true }
        ]
      };
      localStorage.setItem("cso_content_categories_config", JSON.stringify(initial));
      return initial;
    },

    saveContentCategoriesConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid content categories configuration payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_content_categories_config", JSON.stringify(config));
      this.logAudit("CONTENT_CATEGORIES_CONFIG_UPDATED", "CONTENT_PUBLISHING", "Content categories taxonomy updated.");
      return config;
    },

    importContentCategoriesConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveContentCategoriesConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import content categories: " + err.message);
      }
    },

    resetContentCategoriesConfig() {
      const initial = {
        meta: { version: "2.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        categories: [
          { id: "CAT-01", slug: "civil-services", name: "Civil Services (OPSC OAS)", description: "Odisha Administrative Services, Judicial Services, and State Police Services recruitment intelligence.", icon: "🏛️", count: 48, active: true },
          { id: "CAT-02", slug: "staff-selection", name: "Staff Selection (OSSC)", description: "Combined Graduate Level (CGL), Technical Services, CTSRE, and Ministerial cadres.", icon: "📋", count: 72, active: true },
          { id: "CAT-03", slug: "subordinate-services", name: "Subordinate Services (OSSSC)", description: "Revenue Inspector (RI), ARI, Amin, Panchayat Executive Officer (PEO), and Forester.", icon: "🌾", count: 65, active: true },
          { id: "CAT-04", slug: "teacher-education", name: "Teacher Education & TET", description: "OTET, OSSTET, High School Teacher (RHT), and Junior Teacher certification and recruitment.", icon: "🎓", count: 34, active: true },
          { id: "CAT-05", slug: "police-defence", name: "Police & State Uniformed Services", description: "Odisha Police Sub-Inspector, Constable, Excise SI, and Fire Services recruitment.", icon: "🛡️", count: 29, active: true }
        ]
      };
      localStorage.setItem("cso_content_categories_config", JSON.stringify(initial));
      this.logAudit("CONTENT_CATEGORIES_CONFIG_RESET", "CONTENT_PUBLISHING", "Content categories restored to defaults.");
      return initial;
    },

    exportContentCategoriesManifest() {
      const config = this.getContentCategoriesConfig();
      const timestamp = Date.now();
      const filename = "cso-content-categories-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        contentCategories: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("CONTENT_CATEGORIES_MANIFEST_EXPORTED", "DATA_EXPORT", "Content categories manifest exported (" + filename + ").");
      return filename;
    },

    // 48. Tags & Taxonomies Engine (module-04-008)
    getTagsConfig() {
      const raw = localStorage.getItem("cso_tags_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_tags_config", e);
        }
      }
      const initial = {
        meta: { version: "1.3", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        tags: [
          { id: "TAG-01", name: "Syllabus Breakdown", slug: "syllabus-breakdown", usageCount: 64, color: "#0ea5e9", active: true },
          { id: "TAG-02", name: "Cutoff Analysis", slug: "cutoff-analysis", usageCount: 42, color: "#10b981", active: true },
          { id: "TAG-03", name: "Gazette Corrigendum", slug: "gazette-corrigendum", usageCount: 38, color: "#f59e0b", active: true },
          { id: "TAG-04", name: "Exam Date Rescheduled", slug: "exam-rescheduled", usageCount: 29, color: "#e11d48", active: true },
          { id: "TAG-05", name: "Previous Year Papers", slug: "previous-year-papers", usageCount: 85, color: "#8b5cf6", active: true },
          { id: "TAG-06", name: "Odia Typing Test", slug: "odia-typing-test", usageCount: 19, color: "#14b8a6", active: true }
        ]
      };
      localStorage.setItem("cso_tags_config", JSON.stringify(initial));
      return initial;
    },

    saveTagsConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid tags configuration payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_tags_config", JSON.stringify(config));
      this.logAudit("TAGS_CONFIG_UPDATED", "CONTENT_PUBLISHING", "Tags taxonomy updated.");
      return config;
    },

    importTagsConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveTagsConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import tags: " + err.message);
      }
    },

    resetTagsConfig() {
      const initial = {
        meta: { version: "1.3", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        tags: [
          { id: "TAG-01", name: "Syllabus Breakdown", slug: "syllabus-breakdown", usageCount: 64, color: "#0ea5e9", active: true },
          { id: "TAG-02", name: "Cutoff Analysis", slug: "cutoff-analysis", usageCount: 42, color: "#10b981", active: true },
          { id: "TAG-03", name: "Gazette Corrigendum", slug: "gazette-corrigendum", usageCount: 38, color: "#f59e0b", active: true },
          { id: "TAG-04", name: "Exam Date Rescheduled", slug: "exam-rescheduled", usageCount: 29, color: "#e11d48", active: true },
          { id: "TAG-05", name: "Previous Year Papers", slug: "previous-year-papers", usageCount: 85, color: "#8b5cf6", active: true },
          { id: "TAG-06", name: "Odia Typing Test", slug: "odia-typing-test", usageCount: 19, color: "#14b8a6", active: true }
        ]
      };
      localStorage.setItem("cso_tags_config", JSON.stringify(initial));
      this.logAudit("TAGS_CONFIG_RESET", "CONTENT_PUBLISHING", "Tags taxonomy restored to defaults.");
      return initial;
    },

    exportTagsManifest() {
      const config = this.getTagsConfig();
      const timestamp = Date.now();
      const filename = "cso-tags-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        tags: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("TAGS_MANIFEST_EXPORTED", "DATA_EXPORT", "Tags manifest exported (" + filename + ").");
      return filename;
    },
    // 49. Editorial Calendar Engine (module-04-009)
    getEditorialCalendarConfig() {
      const raw = localStorage.getItem("cso_editorial_calendar_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_editorial_calendar_config", e);
        }
      }
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        viewSettings: { defaultView: "Timeline", highlightUrgentDeadlines: true, autoSyncExamDates: true },
        events: [
          { id: "CAL-01", title: "OPSC OAS 2026 Prelims 60-Day High-Yield Revision Series", targetExam: "OPSC OAS", dueDate: "2026-11-20", curator: "Editorial Desk", priority: "High", status: "In Progress", active: true },
          { id: "CAL-02", title: "OSSC CGL Mathematics & Reasoning PYQ Solution Capsule", targetExam: "OSSC CGL", dueDate: "2026-11-25", curator: "Quant Research Team", priority: "Medium", status: "Scheduled", active: true },
          { id: "CAL-03", title: "Odisha Primary Teacher (OTET) Pedagogy Master Blueprint", targetExam: "OTET / OSSTET", dueDate: "2026-12-02", curator: "Pedagogy Cell", priority: "Normal", status: "Drafting", active: true }
        ]
      };
      localStorage.setItem("cso_editorial_calendar_config", JSON.stringify(initial));
      return initial;
    },

    saveEditorialCalendarConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid editorial calendar payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_editorial_calendar_config", JSON.stringify(config));
      this.logAudit("CALENDAR_CONFIG_UPDATED", "CONTENT_PUBLISHING", "Editorial calendar schedule and events saved.");
      return config;
    },

    importEditorialCalendarConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveEditorialCalendarConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import editorial calendar: " + err.message);
      }
    },

    resetEditorialCalendarConfig() {
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        viewSettings: { defaultView: "Timeline", highlightUrgentDeadlines: true, autoSyncExamDates: true },
        events: [
          { id: "CAL-01", title: "OPSC OAS 2026 Prelims 60-Day High-Yield Revision Series", targetExam: "OPSC OAS", dueDate: "2026-11-20", curator: "Editorial Desk", priority: "High", status: "In Progress", active: true },
          { id: "CAL-02", title: "OSSC CGL Mathematics & Reasoning PYQ Solution Capsule", targetExam: "OSSC CGL", dueDate: "2026-11-25", curator: "Quant Research Team", priority: "Medium", status: "Scheduled", active: true },
          { id: "CAL-03", title: "Odisha Primary Teacher (OTET) Pedagogy Master Blueprint", targetExam: "OTET / OSSTET", dueDate: "2026-12-02", curator: "Pedagogy Cell", priority: "Normal", status: "Drafting", active: true }
        ]
      };
      localStorage.setItem("cso_editorial_calendar_config", JSON.stringify(initial));
      this.logAudit("CALENDAR_CONFIG_RESET", "CONTENT_PUBLISHING", "Editorial calendar schedule restored to factory defaults.");
      return initial;
    },

    exportEditorialCalendarManifest() {
      const config = this.getEditorialCalendarConfig();
      const timestamp = Date.now();
      const filename = "cso-editorial-calendar-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        editorialCalendar: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("CALENDAR_MANIFEST_EXPORTED", "DATA_EXPORT", "Editorial calendar manifest exported (" + filename + ").");
      return filename;
    },

    // 50. Publishing Workflow Engine (module-04-010)
    getPublishingWorkflowConfig() {
      const raw = localStorage.getItem("cso_publishing_workflow_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_publishing_workflow_config", e);
        }
      }
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        settings: {
          requireDualApprovalForGazette: true,
          enforceFactCheckingStage: true,
          autoArchiveAfterDays: 180,
          mandatoryDisclaimerOnNotifications: true
        },
        stages: [
          { id: "STG-01", name: "Drafting", role: "Content Creator", order: 1, color: "#64748b", active: true },
          { id: "STG-02", name: "Syllabus Verification", role: "Subject Matter Expert", order: 2, color: "#0ea5e9", active: true },
          { id: "STG-03", name: "Fact & Gazette Audit", role: "Legal / Senior Editor", order: 3, color: "#f59e0b", active: true },
          { id: "STG-04", name: "Final Editorial Approval", role: "Editor-in-Chief", order: 4, color: "#8b5cf6", active: true },
          { id: "STG-05", name: "Published Live", role: "System Automation", order: 5, color: "#10b981", active: true }
        ],
        queue: [
          { id: "WF-101", title: "OPSC Combined Technical Services Paper II Key Analysis", author: "Dr. B. K. Jena", stage: "Fact & Gazette Audit", submissionDate: "2026-11-08", urgency: "High", active: true },
          { id: "WF-102", title: "OSSSC Panchayat Executive Officer (PEO) Computer Skill Syllabus", author: "M. Pattnaik", stage: "Syllabus Verification", submissionDate: "2026-11-07", urgency: "Medium", active: true },
          { id: "WF-103", title: "Odisha Subordinate Finance Service Audit Assistant Guide", author: "Editorial Cell", stage: "Drafting", submissionDate: "2026-11-09", urgency: "Low", active: true }
        ]
      };
      localStorage.setItem("cso_publishing_workflow_config", JSON.stringify(initial));
      return initial;
    },

    savePublishingWorkflowConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid publishing workflow payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_publishing_workflow_config", JSON.stringify(config));
      this.logAudit("WORKFLOW_CONFIG_UPDATED", "CONTENT_PUBLISHING", "Publishing workflow stages and governance saved.");
      return config;
    },

    importPublishingWorkflowConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.savePublishingWorkflowConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import publishing workflow: " + err.message);
      }
    },

    resetPublishingWorkflowConfig() {
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        settings: {
          requireDualApprovalForGazette: true,
          enforceFactCheckingStage: true,
          autoArchiveAfterDays: 180,
          mandatoryDisclaimerOnNotifications: true
        },
        stages: [
          { id: "STG-01", name: "Drafting", role: "Content Creator", order: 1, color: "#64748b", active: true },
          { id: "STG-02", name: "Syllabus Verification", role: "Subject Matter Expert", order: 2, color: "#0ea5e9", active: true },
          { id: "STG-03", name: "Fact & Gazette Audit", role: "Legal / Senior Editor", order: 3, color: "#f59e0b", active: true },
          { id: "STG-04", name: "Final Editorial Approval", role: "Editor-in-Chief", order: 4, color: "#8b5cf6", active: true },
          { id: "STG-05", name: "Published Live", role: "System Automation", order: 5, color: "#10b981", active: true }
        ],
        queue: [
          { id: "WF-101", title: "OPSC Combined Technical Services Paper II Key Analysis", author: "Dr. B. K. Jena", stage: "Fact & Gazette Audit", submissionDate: "2026-11-08", urgency: "High", active: true },
          { id: "WF-102", title: "OSSSC Panchayat Executive Officer (PEO) Computer Skill Syllabus", author: "M. Pattnaik", stage: "Syllabus Verification", submissionDate: "2026-11-07", urgency: "Medium", active: true },
          { id: "WF-103", title: "Odisha Subordinate Finance Service Audit Assistant Guide", author: "Editorial Cell", stage: "Drafting", submissionDate: "2026-11-09", urgency: "Low", active: true }
        ]
      };
      localStorage.setItem("cso_publishing_workflow_config", JSON.stringify(initial));
      this.logAudit("WORKFLOW_CONFIG_RESET", "CONTENT_PUBLISHING", "Publishing workflow restored to factory defaults.");
      return initial;
    },

    exportPublishingWorkflowManifest() {
      const config = this.getPublishingWorkflowConfig();
      const timestamp = Date.now();
      const filename = "cso-publishing-workflow-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        publishingWorkflow: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("WORKFLOW_MANIFEST_EXPORTED", "DATA_EXPORT", "Publishing workflow manifest exported (" + filename + ").");
      return filename;
    },

    // 51. Scheduled Content Engine (module-04-011)
    getScheduledContentConfig() {
      const raw = localStorage.getItem("cso_scheduled_content_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_scheduled_content_config", e);
        }
      }
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        dispatcherSettings: {
          timezone: "Asia/Kolkata",
          cronWorkerIntervalMinutes: 5,
          autoNotifySubscribersOnRelease: true,
          retryFailedDispatchCount: 3
        },
        items: [
          { id: "SCH-01", title: "OPSC OAS Prelims Mock Exam 01 Answer Key with Explanation", scheduledDate: "2026-11-15T09:00:00+05:30", category: "Mock Tests", channel: "Web Portal & Telegram", status: "Pending", active: true },
          { id: "SCH-02", title: "Weekly Odisha Gazetted Current Affairs Round-up (Vol. 44)", scheduledDate: "2026-11-16T08:00:00+05:30", category: "Current Affairs", channel: "Web Portal", status: "Pending", active: true },
          { id: "SCH-03", title: "OSSC Amin & Survey Officer Technical Paper Guide", scheduledDate: "2026-11-18T10:30:00+05:30", category: "Technical Exams", channel: "Web Portal & PDF Dispatch", status: "Queued", active: true }
        ]
      };
      localStorage.setItem("cso_scheduled_content_config", JSON.stringify(initial));
      return initial;
    },

    saveScheduledContentConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid scheduled content payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_scheduled_content_config", JSON.stringify(config));
      this.logAudit("SCHEDULED_CONTENT_CONFIG_UPDATED", "CONTENT_PUBLISHING", "Scheduled content dispatches and queue saved.");
      return config;
    },

    importScheduledContentConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveScheduledContentConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import scheduled content: " + err.message);
      }
    },

    resetScheduledContentConfig() {
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        dispatcherSettings: {
          timezone: "Asia/Kolkata",
          cronWorkerIntervalMinutes: 5,
          autoNotifySubscribersOnRelease: true,
          retryFailedDispatchCount: 3
        },
        items: [
          { id: "SCH-01", title: "OPSC OAS Prelims Mock Exam 01 Answer Key with Explanation", scheduledDate: "2026-11-15T09:00:00+05:30", category: "Mock Tests", channel: "Web Portal & Telegram", status: "Pending", active: true },
          { id: "SCH-02", title: "Weekly Odisha Gazetted Current Affairs Round-up (Vol. 44)", scheduledDate: "2026-11-16T08:00:00+05:30", category: "Current Affairs", channel: "Web Portal", status: "Pending", active: true },
          { id: "SCH-03", title: "OSSC Amin & Survey Officer Technical Paper Guide", scheduledDate: "2026-11-18T10:30:00+05:30", category: "Technical Exams", channel: "Web Portal & PDF Dispatch", status: "Queued", active: true }
        ]
      };
      localStorage.setItem("cso_scheduled_content_config", JSON.stringify(initial));
      this.logAudit("SCHEDULED_CONTENT_CONFIG_RESET", "CONTENT_PUBLISHING", "Scheduled content dispatches restored to factory defaults.");
      return initial;
    },

    exportScheduledContentManifest() {
      const config = this.getScheduledContentConfig();
      const timestamp = Date.now();
      const filename = "cso-scheduled-content-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        scheduledContent: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("SCHEDULED_CONTENT_MANIFEST_EXPORTED", "DATA_EXPORT", "Scheduled content manifest exported (" + filename + ").");
      return filename;
    },
    // 52. Content Archive Engine (module-04-012)
    getContentArchiveConfig() {
      const raw = localStorage.getItem("cso_content_archive_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_content_archive_config", e);
        }
      }
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        retentionPolicy: { autoArchiveAfterDays: 180, allowPermanentDeletion: false, coldStorageMirror: true },
        archivedItems: [
          { id: "ARC-01", contentId: "CNT-084", title: "OPSC OAS 2024 Preliminary Examination Marks Distribution (Archived)", category: "Civil Services", archivedDate: "2026-06-15", reason: "Superseded by 2026 notification", originalUrl: "/exams/opsc-oas-2024.html", status: "Archived", active: true },
          { id: "ARC-02", contentId: "CNT-052", title: "OSSC CTSRE 2025 Technical Corrigendum Series 1 (Superseded)", category: "Staff Selection", archivedDate: "2026-08-01", reason: "Outdated exam cycle", originalUrl: "/exams/ossc-ctsre-2025.html", status: "Archived", active: true },
          { id: "ARC-03", contentId: "CNT-039", title: "OSSSC Combined Recruitment 2024 Provisional Merit List (Historical)", category: "Subordinate Services", archivedDate: "2026-09-10", reason: "Final appointments ratified", originalUrl: "/exams/osssc-2024-merit.html", status: "Archived", active: true }
        ]
      };
      localStorage.setItem("cso_content_archive_config", JSON.stringify(initial));
      return initial;
    },

    saveContentArchiveConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid content archive payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_content_archive_config", JSON.stringify(config));
      this.logAudit("CONTENT_ARCHIVE_CONFIG_UPDATED", "CONTENT_PUBLISHING", "Content archive items and retention policy saved.");
      return config;
    },

    importContentArchiveConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveContentArchiveConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import content archive: " + err.message);
      }
    },

    resetContentArchiveConfig() {
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        retentionPolicy: { autoArchiveAfterDays: 180, allowPermanentDeletion: false, coldStorageMirror: true },
        archivedItems: [
          { id: "ARC-01", contentId: "CNT-084", title: "OPSC OAS 2024 Preliminary Examination Marks Distribution (Archived)", category: "Civil Services", archivedDate: "2026-06-15", reason: "Superseded by 2026 notification", originalUrl: "/exams/opsc-oas-2024.html", status: "Archived", active: true },
          { id: "ARC-02", contentId: "CNT-052", title: "OSSC CTSRE 2025 Technical Corrigendum Series 1 (Superseded)", category: "Staff Selection", archivedDate: "2026-08-01", reason: "Outdated exam cycle", originalUrl: "/exams/ossc-ctsre-2025.html", status: "Archived", active: true },
          { id: "ARC-03", contentId: "CNT-039", title: "OSSSC Combined Recruitment 2024 Provisional Merit List (Historical)", category: "Subordinate Services", archivedDate: "2026-09-10", reason: "Final appointments ratified", originalUrl: "/exams/osssc-2024-merit.html", status: "Archived", active: true }
        ]
      };
      localStorage.setItem("cso_content_archive_config", JSON.stringify(initial));
      this.logAudit("CONTENT_ARCHIVE_CONFIG_RESET", "CONTENT_PUBLISHING", "Content archive restored to factory defaults.");
      return initial;
    },

    exportContentArchiveManifest() {
      const config = this.getContentArchiveConfig();
      const timestamp = Date.now();
      const filename = "cso-content-archive-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        contentArchive: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("CONTENT_ARCHIVE_MANIFEST_EXPORTED", "DATA_EXPORT", "Content archive manifest exported (" + filename + ").");
      return filename;
    },

    // 53. Content Revisions Engine (module-04-013)
    getContentRevisionsConfig() {
      const raw = localStorage.getItem("cso_content_revisions_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_content_revisions_config", e);
        }
      }
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        versioningPolicy: { maxRevisionsPerArticle: 20, autoSnapshotOnPublish: true, requireRollbackAuditNote: true },
        revisions: [
          { id: "REV-101", contentId: "CNT-001", revisionNumber: 3, title: "OPSC OAS 2026 Prelims Syllabus Breakdown & Cutoff Trends", author: "Dr. B. K. Jena", timestamp: "2026-11-08T18:40:00+05:30", changesSummary: "Reconciled CSAT qualifying marks criteria as per Gazette No. 1422", rollbackAvailable: true, active: true },
          { id: "REV-102", contentId: "CNT-001", revisionNumber: 2, title: "OPSC OAS 2026 Prelims Syllabus Breakdown", author: "Editorial Cell", timestamp: "2026-11-05T14:15:00+05:30", changesSummary: "Added Paper-I Indian Polity and Odisha History subsections", rollbackAvailable: true, active: true },
          { id: "REV-103", contentId: "CNT-002", revisionNumber: 4, title: "OSSC CGL Exam Pattern: Combined Graduate Level Examination", author: "M. Pattnaik", timestamp: "2026-11-07T11:20:00+05:30", changesSummary: "Corrected negative marking ratio (0.25 vs 0.33) in accordance with Commission notice", rollbackAvailable: true, active: true }
        ]
      };
      localStorage.setItem("cso_content_revisions_config", JSON.stringify(initial));
      return initial;
    },

    saveContentRevisionsConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid content revisions payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_content_revisions_config", JSON.stringify(config));
      this.logAudit("CONTENT_REVISIONS_CONFIG_UPDATED", "CONTENT_PUBLISHING", "Content revisions and audit log saved.");
      return config;
    },

    importContentRevisionsConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveContentRevisionsConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import content revisions: " + err.message);
      }
    },

    resetContentRevisionsConfig() {
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        versioningPolicy: { maxRevisionsPerArticle: 20, autoSnapshotOnPublish: true, requireRollbackAuditNote: true },
        revisions: [
          { id: "REV-101", contentId: "CNT-001", revisionNumber: 3, title: "OPSC OAS 2026 Prelims Syllabus Breakdown & Cutoff Trends", author: "Dr. B. K. Jena", timestamp: "2026-11-08T18:40:00+05:30", changesSummary: "Reconciled CSAT qualifying marks criteria as per Gazette No. 1422", rollbackAvailable: true, active: true },
          { id: "REV-102", contentId: "CNT-001", revisionNumber: 2, title: "OPSC OAS 2026 Prelims Syllabus Breakdown", author: "Editorial Cell", timestamp: "2026-11-05T14:15:00+05:30", changesSummary: "Added Paper-I Indian Polity and Odisha History subsections", rollbackAvailable: true, active: true },
          { id: "REV-103", contentId: "CNT-002", revisionNumber: 4, title: "OSSC CGL Exam Pattern: Combined Graduate Level Examination", author: "M. Pattnaik", timestamp: "2026-11-07T11:20:00+05:30", changesSummary: "Corrected negative marking ratio (0.25 vs 0.33) in accordance with Commission notice", rollbackAvailable: true, active: true }
        ]
      };
      localStorage.setItem("cso_content_revisions_config", JSON.stringify(initial));
      this.logAudit("CONTENT_REVISIONS_CONFIG_RESET", "CONTENT_PUBLISHING", "Content revisions restored to factory defaults.");
      return initial;
    },

    exportContentRevisionsManifest() {
      const config = this.getContentRevisionsConfig();
      const timestamp = Date.now();
      const filename = "cso-content-revisions-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        contentRevisions: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("CONTENT_REVISIONS_MANIFEST_EXPORTED", "DATA_EXPORT", "Content revisions manifest exported (" + filename + ").");
      return filename;
    },

    // 54. Bulk Content Operations Engine (module-04-014)
    getBulkContentOperationsConfig() {
      const raw = localStorage.getItem("cso_bulk_content_ops_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_bulk_content_ops_config", e);
        }
      }
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        executionRules: { allowBatchTagging: true, maxBatchSelection: 100, requireTwoFactorForMassDelete: true, defaultTargetCategory: "Civil Services" },
        batchJobs: [
          { id: "JOB-01", type: "Bulk Tagging", targetCount: 14, tagApplied: "gazette-corrigendum", runBy: "admin@csodisha.com", executedAt: "2026-11-08T16:00:00+05:30", status: "Completed", active: true },
          { id: "JOB-02", type: "Mass Category Migration", targetCount: 8, fromCategory: "General Recruitment", toCategory: "Subordinate Services", runBy: "editor@csodisha.com", executedAt: "2026-11-07T12:30:00+05:30", status: "Completed", active: true },
          { id: "JOB-03", type: "Bulk Archive", targetCount: 12, reason: "End of 2024 academic cycle", runBy: "admin@csodisha.com", executedAt: "2026-11-06T10:15:00+05:30", status: "Completed", active: true }
        ]
      };
      localStorage.setItem("cso_bulk_content_ops_config", JSON.stringify(initial));
      return initial;
    },

    saveBulkContentOperationsConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid bulk content operations payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_bulk_content_ops_config", JSON.stringify(config));
      this.logAudit("BULK_OPS_CONFIG_UPDATED", "CONTENT_PUBLISHING", "Bulk content operations settings and job records saved.");
      return config;
    },

    importBulkContentOperationsConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveBulkContentOperationsConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import bulk content operations: " + err.message);
      }
    },

    resetBulkContentOperationsConfig() {
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        executionRules: { allowBatchTagging: true, maxBatchSelection: 100, requireTwoFactorForMassDelete: true, defaultTargetCategory: "Civil Services" },
        batchJobs: [
          { id: "JOB-01", type: "Bulk Tagging", targetCount: 14, tagApplied: "gazette-corrigendum", runBy: "admin@csodisha.com", executedAt: "2026-11-08T16:00:00+05:30", status: "Completed", active: true },
          { id: "JOB-02", type: "Mass Category Migration", targetCount: 8, fromCategory: "General Recruitment", toCategory: "Subordinate Services", runBy: "editor@csodisha.com", executedAt: "2026-11-07T12:30:00+05:30", status: "Completed", active: true },
          { id: "JOB-03", type: "Bulk Archive", targetCount: 12, reason: "End of 2024 academic cycle", runBy: "admin@csodisha.com", executedAt: "2026-11-06T10:15:00+05:30", status: "Completed", active: true }
        ]
      };
      localStorage.setItem("cso_bulk_content_ops_config", JSON.stringify(initial));
      this.logAudit("BULK_OPS_CONFIG_RESET", "CONTENT_PUBLISHING", "Bulk content operations restored to factory defaults.");
      return initial;
    },

    exportBulkContentOperationsManifest() {
      const config = this.getBulkContentOperationsConfig();
      const timestamp = Date.now();
      const filename = "cso-bulk-content-ops-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        bulkContentOperations: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("BULK_OPS_MANIFEST_EXPORTED", "DATA_EXPORT", "Bulk content operations manifest exported (" + filename + ").");
      return filename;
    },
    // =========================================================================
    // 55. Public Navigation Hierarchy & Menu Tree Engines
    // Keys: cso_jobs_careers_tree, cso_schemes_benefits_tree, cso_study_library_tree, cso_community_tree
    // =========================================================================

    _validateFolderKey(folderKey) {
      const allowed = [
        "cso_jobs_careers_tree",
        "cso_schemes_benefits_tree",
        "cso_study_library_tree",
        "cso_community_tree"
      ];
      if (!allowed.includes(folderKey)) {
        throw new Error("Invalid menu tree folderKey: " + folderKey + ". Must be one of: " + allowed.join(", "));
      }
      return folderKey;
    },

    getMenuTree(folderKey) {
      this._validateFolderKey(folderKey);
      const raw = localStorage.getItem(folderKey);
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse " + folderKey, e);
        }
      }

      // Check fallback trees bundle
      if (window.__CSO_FALLBACK_TREES__ && window.__CSO_FALLBACK_TREES__[folderKey]) {
        const seed = JSON.parse(JSON.stringify(window.__CSO_FALLBACK_TREES__[folderKey]));
        localStorage.setItem(folderKey, JSON.stringify(seed));
        return seed;
      }

      // Minimal safe default if fallback trees script not loaded
      const defaultTree = [
        {
          id: "NODE-01",
          title: "Directory Root",
          slug: "root",
          type: "directory",
          status: "Published",
          scheduledDate: null,
          redirectUrl: "",
          redirectTarget: "_self",
          seo: { metaTitle: "Directory Root | Common Sense Odisha", metaDescription: "Verified public directory.", ogImage: "/assets/images/og-default.jpg" },
          article: { author: "Admin", readTime: "5 min", bodyMarkdown: "# Directory Root\n\nWelcome to the directory." },
          files: [],
          children: []
        }
      ];
      localStorage.setItem(folderKey, JSON.stringify(defaultTree));
      return defaultTree;
    },

    saveMenuTree(folderKey, tree) {
      this._validateFolderKey(folderKey);
      if (!Array.isArray(tree)) throw new Error("Tree must be an array of nodes");
      localStorage.setItem(folderKey, JSON.stringify(tree));
      this.logAudit("MENU_TREE_SAVED", "NAVIGATION_ENGINE", "Menu tree updated for " + folderKey + " (" + tree.length + " root nodes).");
      return tree;
    },

    findNode(tree, nodeId) {
      if (!Array.isArray(tree)) return null;
      for (const node of tree) {
        if (node.id === nodeId) return node;
        if (node.children && node.children.length > 0) {
          const found = this.findNode(node.children, nodeId);
          if (found) return found;
        }
      }
      return null;
    },

    saveNode(folderKey, nodeId, nodeData) {
      this._validateFolderKey(folderKey);
      const tree = this.getMenuTree(folderKey);
      const target = this.findNode(tree, nodeId);
      if (!target) {
        throw new Error("Node not found: " + nodeId + " in " + folderKey);
      }

      // Merge node data
      Object.assign(target, nodeData);
      target.id = nodeId; // preserve ID
      target.updatedAt = new Date().toISOString();

      this.saveMenuTree(folderKey, tree);
      this.logAudit("MENU_NODE_UPDATED", "NAVIGATION_ENGINE", "Node " + nodeId + " ('" + target.title + "') updated in " + folderKey);
      return target;
    },

    addNode(folderKey, parentId, newNode) {
      this._validateFolderKey(folderKey);
      const tree = this.getMenuTree(folderKey);

      if (!newNode || typeof newNode !== "object") throw new Error("Invalid newNode payload");
      if (!newNode.id) {
        newNode.id = "NODE-" + Math.random().toString(36).substring(2, 9).toUpperCase();
      }
      newNode.status = newNode.status || "Published";
      newNode.type = newNode.type || "page";
      newNode.children = newNode.children || [];
      newNode.createdAt = new Date().toISOString();

      if (!parentId || parentId === "root" || parentId === null) {
        // Append to root
        tree.push(newNode);
      } else {
        const parent = this.findNode(tree, parentId);
        if (!parent) {
          throw new Error("Parent node not found: " + parentId + " in " + folderKey);
        }
        parent.children = parent.children || [];
        parent.children.push(newNode);
      }

      this.saveMenuTree(folderKey, tree);
      this.logAudit("MENU_NODE_ADDED", "NAVIGATION_ENGINE", "New node " + newNode.id + " ('" + newNode.title + "') appended under " + (parentId || "root"));
      return newNode;
    },

    deleteNode(folderKey, nodeId) {
      this._validateFolderKey(folderKey);
      const tree = this.getMenuTree(folderKey);

      function removeRecursive(nodes, id) {
        const idx = nodes.findIndex(n => n.id === id);
        if (idx !== -1) {
          const removed = nodes.splice(idx, 1)[0];
          return removed;
        }
        for (const n of nodes) {
          if (n.children && n.children.length > 0) {
            const found = removeRecursive(n.children, id);
            if (found) return found;
          }
        }
        return null;
      }

      const deleted = removeRecursive(tree, nodeId);
      if (!deleted) {
        throw new Error("Node " + nodeId + " not found for deletion in " + folderKey);
      }

      this.saveMenuTree(folderKey, tree);
      this.logAudit("MENU_NODE_DELETED", "NAVIGATION_ENGINE", "Node " + nodeId + " ('" + deleted.title + "') deleted from " + folderKey);
      return deleted;
    },

    exportMenuTree(folderKey) {
      this._validateFolderKey(folderKey);
      const tree = this.getMenuTree(folderKey);
      const timestamp = Date.now();
      const filename = folderKey + "-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        folderKey: folderKey,
        tree: tree
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("MENU_TREE_EXPORTED", "DATA_EXPORT", "Menu tree " + folderKey + " exported (" + filename + ").");
      return filename;
    },

    importMenuTree(folderKey, jsonString) {
      this._validateFolderKey(folderKey);
      try {
        let parsed = JSON.parse(jsonString);
        if (parsed && parsed.tree && Array.isArray(parsed.tree)) {
          parsed = parsed.tree;
        }
        if (!Array.isArray(parsed)) throw new Error("Parsed JSON must be an array of nodes");
        return this.saveMenuTree(folderKey, parsed);
      } catch (err) {
        throw new Error("Failed to import menu tree for " + folderKey + ": " + err.message);
      }
    },

    resetMenuTree(folderKey) {
      this._validateFolderKey(folderKey);
      localStorage.removeItem(folderKey);
      const restored = this.getMenuTree(folderKey);
      this.logAudit("MENU_TREE_RESET", "NAVIGATION_ENGINE", "Menu tree " + folderKey + " restored to initial directory defaults.");
      return restored;
    },
    // =========================================================================
    // 56. Educational Resources Batch 1 (module-05-001 to module-05-004)
    // =========================================================================

    // 56.1 Digital Library Engine (module-05-001)
    getDigitalLibraryConfig() {
      const raw = localStorage.getItem("cso_digital_library_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_digital_library_config", e);
        }
      }
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        librarySettings: { totalVolumes: 1420, bandwidthCapPerUserMb: 500, enableOfflineSync: true },
        catalog: [
          { id: "LIB-001", title: "Complete Odisha History & Heritage Compendium", format: "PDF", fileSizeBytes: 4820000, examTarget: "OPSC OAS", language: "English & Odia", accessLevel: "Public Free", active: true },
          { id: "LIB-002", title: "Quantitative Aptitude Shortcut Formula Handbook", format: "EPUB", fileSizeBytes: 2150000, examTarget: "OSSC CGL", language: "English", accessLevel: "Public Free", active: true },
          { id: "LIB-003", title: "Odisha Geography, River Basins & Mineral Map Atlas", format: "PDF", fileSizeBytes: 8900000, examTarget: "All State Exams", language: "Odia", accessLevel: "Public Free", active: true }
        ]
      };
      localStorage.setItem("cso_digital_library_config", JSON.stringify(initial));
      return initial;
    },

    saveDigitalLibraryConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid digital library payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_digital_library_config", JSON.stringify(config));
      this.logAudit("DIGITAL_LIBRARY_CONFIG_UPDATED", "EDUCATIONAL_RESOURCES", "Digital library catalog and volume settings saved.");
      return config;
    },

    importDigitalLibraryConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveDigitalLibraryConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import digital library: " + err.message);
      }
    },

    resetDigitalLibraryConfig() {
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        librarySettings: { totalVolumes: 1420, bandwidthCapPerUserMb: 500, enableOfflineSync: true },
        catalog: [
          { id: "LIB-001", title: "Complete Odisha History & Heritage Compendium", format: "PDF", fileSizeBytes: 4820000, examTarget: "OPSC OAS", language: "English & Odia", accessLevel: "Public Free", active: true },
          { id: "LIB-002", title: "Quantitative Aptitude Shortcut Formula Handbook", format: "EPUB", fileSizeBytes: 2150000, examTarget: "OSSC CGL", language: "English", accessLevel: "Public Free", active: true },
          { id: "LIB-003", title: "Odisha Geography, River Basins & Mineral Map Atlas", format: "PDF", fileSizeBytes: 8900000, examTarget: "All State Exams", language: "Odia", accessLevel: "Public Free", active: true }
        ]
      };
      localStorage.setItem("cso_digital_library_config", JSON.stringify(initial));
      this.logAudit("DIGITAL_LIBRARY_CONFIG_RESET", "EDUCATIONAL_RESOURCES", "Digital library restored to factory defaults.");
      return initial;
    },

    exportDigitalLibraryManifest() {
      const config = this.getDigitalLibraryConfig();
      const timestamp = Date.now();
      const filename = "cso-digital-library-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        digitalLibrary: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("DIGITAL_LIBRARY_MANIFEST_EXPORTED", "DATA_EXPORT", "Digital library manifest exported (" + filename + ").");
      return filename;
    },

    // 56.2 Study Materials Engine (module-05-002)
    getStudyMaterialsConfig() {
      const raw = localStorage.getItem("cso_study_materials_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_study_materials_config", e);
        }
      }
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        curriculumSettings: { academicYear: "2026-27", defaultLanguage: "Bilingual (Odia/English)", enforceVerifiedWatermark: true },
        materials: [
          { id: "MAT-001", title: "Odisha Civil Services Paper-I Indian Polity Master Capsule", category: "General Studies", targetExam: "OPSC OAS", author: "Dr. B. K. Jena", pages: 124, downloadUrl: "/assets/pdf/polity-master-capsule.pdf", active: true },
          { id: "MAT-002", title: "Reasoning & Mental Ability Shortcuts for OSSC CGL & CHSL", category: "Mental Ability", targetExam: "OSSC CGL", author: "M. Pattnaik", pages: 88, downloadUrl: "/assets/pdf/reasoning-shortcuts.pdf", active: true },
          { id: "MAT-003", title: "Odisha District-Wise General Knowledge & Statistical Handout", category: "State GK", targetExam: "OSSSC Combined", author: "Editorial Cell", pages: 64, downloadUrl: "/assets/pdf/district-gk-handout.pdf", active: true }
        ]
      };
      localStorage.setItem("cso_study_materials_config", JSON.stringify(initial));
      return initial;
    },

    saveStudyMaterialsConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid study materials payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_study_materials_config", JSON.stringify(config));
      this.logAudit("STUDY_MATERIALS_CONFIG_UPDATED", "EDUCATIONAL_RESOURCES", "Study materials curriculum and items saved.");
      return config;
    },

    importStudyMaterialsConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveStudyMaterialsConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import study materials: " + err.message);
      }
    },

    resetStudyMaterialsConfig() {
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        curriculumSettings: { academicYear: "2026-27", defaultLanguage: "Bilingual (Odia/English)", enforceVerifiedWatermark: true },
        materials: [
          { id: "MAT-001", title: "Odisha Civil Services Paper-I Indian Polity Master Capsule", category: "General Studies", targetExam: "OPSC OAS", author: "Dr. B. K. Jena", pages: 124, downloadUrl: "/assets/pdf/polity-master-capsule.pdf", active: true },
          { id: "MAT-002", title: "Reasoning & Mental Ability Shortcuts for OSSC CGL & CHSL", category: "Mental Ability", targetExam: "OSSC CGL", author: "M. Pattnaik", pages: 88, downloadUrl: "/assets/pdf/reasoning-shortcuts.pdf", active: true },
          { id: "MAT-003", title: "Odisha District-Wise General Knowledge & Statistical Handout", category: "State GK", targetExam: "OSSSC Combined", author: "Editorial Cell", pages: 64, downloadUrl: "/assets/pdf/district-gk-handout.pdf", active: true }
        ]
      };
      localStorage.setItem("cso_study_materials_config", JSON.stringify(initial));
      this.logAudit("STUDY_MATERIALS_CONFIG_RESET", "EDUCATIONAL_RESOURCES", "Study materials restored to factory defaults.");
      return initial;
    },

    exportStudyMaterialsManifest() {
      const config = this.getStudyMaterialsConfig();
      const timestamp = Date.now();
      const filename = "cso-study-materials-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        studyMaterials: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("STUDY_MATERIALS_MANIFEST_EXPORTED", "DATA_EXPORT", "Study materials manifest exported (" + filename + ").");
      return filename;
    },

    // 56.3 Notes & PDFs Engine (module-05-003)
    getNotesPdfsConfig() {
      const raw = localStorage.getItem("cso_notes_pdfs_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_notes_pdfs_config", e);
        }
      }
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        viewerSettings: { allowDirectDownload: true, embedPdfViewer: true, watermarkText: "Common Sense Odisha - csodisha.com" },
        documents: [
          { id: "NOTE-01", title: "Odisha Modern History & Freedom Movement Handwritten Summary Notes", subject: "Odisha History", exam: "OPSC OAS", contributor: "Rank 14 Topper Desk", fileSize: "3.4 MB", verified: true, active: true },
          { id: "NOTE-02", title: "General Science Physics & Chemistry Rapid Revision Formula Sheet", subject: "General Science", exam: "OSSC CGL / Railway", contributor: "Science Faculty", fileSize: "1.8 MB", verified: true, active: true },
          { id: "NOTE-03", title: "Odia Grammar & Vyakarana High-Yield Rules for Teaching Exams", subject: "Odia Language", exam: "OTET / OSSTET", contributor: "Linguistics Cell", fileSize: "2.6 MB", verified: true, active: true }
        ]
      };
      localStorage.setItem("cso_notes_pdfs_config", JSON.stringify(initial));
      return initial;
    },

    saveNotesPdfsConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid notes & pdfs payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_notes_pdfs_config", JSON.stringify(config));
      this.logAudit("NOTES_PDFS_CONFIG_UPDATED", "EDUCATIONAL_RESOURCES", "Notes & PDFs documents and viewer settings saved.");
      return config;
    },

    importNotesPdfsConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveNotesPdfsConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import notes & pdfs: " + err.message);
      }
    },

    resetNotesPdfsConfig() {
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        viewerSettings: { allowDirectDownload: true, embedPdfViewer: true, watermarkText: "Common Sense Odisha - csodisha.com" },
        documents: [
          { id: "NOTE-01", title: "Odisha Modern History & Freedom Movement Handwritten Summary Notes", subject: "Odisha History", exam: "OPSC OAS", contributor: "Rank 14 Topper Desk", fileSize: "3.4 MB", verified: true, active: true },
          { id: "NOTE-02", title: "General Science Physics & Chemistry Rapid Revision Formula Sheet", subject: "General Science", exam: "OSSC CGL / Railway", contributor: "Science Faculty", fileSize: "1.8 MB", verified: true, active: true },
          { id: "NOTE-03", title: "Odia Grammar & Vyakarana High-Yield Rules for Teaching Exams", subject: "Odia Language", exam: "OTET / OSSTET", contributor: "Linguistics Cell", fileSize: "2.6 MB", verified: true, active: true }
        ]
      };
      localStorage.setItem("cso_notes_pdfs_config", JSON.stringify(initial));
      this.logAudit("NOTES_PDFS_CONFIG_RESET", "EDUCATIONAL_RESOURCES", "Notes & PDFs documents restored to factory defaults.");
      return initial;
    },

    exportNotesPdfsManifest() {
      const config = this.getNotesPdfsConfig();
      const timestamp = Date.now();
      const filename = "cso-notes-pdfs-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        notesPdfs: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("NOTES_PDFS_MANIFEST_EXPORTED", "DATA_EXPORT", "Notes & PDFs manifest exported (" + filename + ").");
      return filename;
    },

    // 56.4 Books & References Engine (module-05-004)
    getBooksReferencesConfig() {
      const raw = localStorage.getItem("cso_books_references_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_books_references_config", e);
        }
      }
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        curationSettings: { defaultSort: "Popularity", includeIsbn: true, affiliateDisclaimer: "100% Non-commercial public education initiative" },
        books: [
          { id: "BOOK-01", title: "History of Odisha (From Ancient Era to Post-Independence)", authors: "Dr. H. K. Mahatab", publisher: "Odisha Sahitya Akademi", recommendedFor: "OPSC OAS Prelims & Mains", isbn: "978-81-7400-012-3", availability: "Public Domain / Library Copy", active: true },
          { id: "BOOK-02", title: "Comprehensive English Grammar & Composition for Competitive Exams", authors: "Wren & Martin", publisher: "S. Chand Publishing", recommendedFor: "OSSC CGL & Bank Exams", isbn: "978-93-5283-789-0", availability: "Recommended Reference", active: true },
          { id: "BOOK-03", title: "Odisha State Gazette & Administrative Laws Manual", authors: "Law Department, Govt. of Odisha", publisher: "Odisha Government Press", recommendedFor: "Legal & Administrative Services", isbn: "GOV-OD-2026-LAW", availability: "Official Gazette Release", active: true }
        ]
      };
      localStorage.setItem("cso_books_references_config", JSON.stringify(initial));
      return initial;
    },

    saveBooksReferencesConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid books & references payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_books_references_config", JSON.stringify(config));
      this.logAudit("BOOKS_REFERENCES_CONFIG_UPDATED", "EDUCATIONAL_RESOURCES", "Books & References catalog and curation settings saved.");
      return config;
    },

    importBooksReferencesConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveBooksReferencesConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import books & references: " + err.message);
      }
    },

    resetBooksReferencesConfig() {
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        curationSettings: { defaultSort: "Popularity", includeIsbn: true, affiliateDisclaimer: "100% Non-commercial public education initiative" },
        books: [
          { id: "BOOK-01", title: "History of Odisha (From Ancient Era to Post-Independence)", authors: "Dr. H. K. Mahatab", publisher: "Odisha Sahitya Akademi", recommendedFor: "OPSC OAS Prelims & Mains", isbn: "978-81-7400-012-3", availability: "Public Domain / Library Copy", active: true },
          { id: "BOOK-02", title: "Comprehensive English Grammar & Composition for Competitive Exams", authors: "Wren & Martin", publisher: "S. Chand Publishing", recommendedFor: "OSSC CGL & Bank Exams", isbn: "978-93-5283-789-0", availability: "Recommended Reference", active: true },
          { id: "BOOK-03", title: "Odisha State Gazette & Administrative Laws Manual", authors: "Law Department, Govt. of Odisha", publisher: "Odisha Government Press", recommendedFor: "Legal & Administrative Services", isbn: "GOV-OD-2026-LAW", availability: "Official Gazette Release", active: true }
        ]
      };
      localStorage.setItem("cso_books_references_config", JSON.stringify(initial));
      this.logAudit("BOOKS_REFERENCES_CONFIG_RESET", "EDUCATIONAL_RESOURCES", "Books & References restored to factory defaults.");
      return initial;
    },

    exportBooksReferencesManifest() {
      const config = this.getBooksReferencesConfig();
      const timestamp = Date.now();
      const filename = "cso-books-references-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        booksReferences: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("BOOKS_REFERENCES_MANIFEST_EXPORTED", "DATA_EXPORT", "Books & References manifest exported (" + filename + ").");
      return filename;
    },
    // =========================================================================
    // 57. Educational Resources Batch 2 (module-05-005 to module-05-007)
    // =========================================================================

    // 57.1 Subjects & Topics Engine (module-05-005)
    getSubjectsTopicsConfig() {
      const raw = localStorage.getItem("cso_subjects_topics_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_subjects_topics_config", e);
        }
      }
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        subjectSettings: { allowCrossDisciplinaryTags: true, defaultExamTarget: "All Odisha Exams" },
        subjects: [
          { id: "SUB-01", code: "OD-HIST", name: "History & Culture of Odisha", targetExams: ["OPSC OAS", "OSSC CGL"], topicCount: 18, weightagePercentage: 15, active: true },
          { id: "SUB-02", code: "OD-LANG", name: "Odia Language & Grammar (Vyakaran)", targetExams: ["OSSSC RI/Amin", "OTET", "OSSC CGL"], topicCount: 24, weightagePercentage: 20, active: true },
          { id: "SUB-03", code: "GEN-POL", name: "Indian Polity & Governance", targetExams: ["OPSC OAS", "Police SI"], topicCount: 22, weightagePercentage: 18, active: true },
          { id: "SUB-04", code: "QUANT", name: "Quantitative Aptitude & Arithmetic", targetExams: ["OSSC CGL", "OSSSC Combined"], topicCount: 30, weightagePercentage: 25, active: true }
        ],
        topicsRegistry: [
          { id: "TOP-101", subjectId: "SUB-01", name: "Kalinga War, Maurya Rule & Kharavela Inscriptions", difficulty: "Medium", highYield: true, active: true },
          { id: "TOP-102", subjectId: "SUB-02", name: "Krudanta, Taddhita & Sandhi Rules", difficulty: "Hard", highYield: true, active: true },
          { id: "TOP-103", subjectId: "SUB-03", name: "Odisha State Legislative Assembly & High Court Jurisdiction", difficulty: "Medium", highYield: true, active: true }
        ]
      };
      localStorage.setItem("cso_subjects_topics_config", JSON.stringify(initial));
      return initial;
    },

    saveSubjectsTopicsConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid subjects & topics payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_subjects_topics_config", JSON.stringify(config));
      this.logAudit("SUBJECTS_TOPICS_CONFIG_UPDATED", "EDUCATIONAL_RESOURCES", "Subjects & Topics taxonomy saved.");
      return config;
    },

    importSubjectsTopicsConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveSubjectsTopicsConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import subjects & topics: " + err.message);
      }
    },

    resetSubjectsTopicsConfig() {
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        subjectSettings: { allowCrossDisciplinaryTags: true, defaultExamTarget: "All Odisha Exams" },
        subjects: [
          { id: "SUB-01", code: "OD-HIST", name: "History & Culture of Odisha", targetExams: ["OPSC OAS", "OSSC CGL"], topicCount: 18, weightagePercentage: 15, active: true },
          { id: "SUB-02", code: "OD-LANG", name: "Odia Language & Grammar (Vyakaran)", targetExams: ["OSSSC RI/Amin", "OTET", "OSSC CGL"], topicCount: 24, weightagePercentage: 20, active: true },
          { id: "SUB-03", code: "GEN-POL", name: "Indian Polity & Governance", targetExams: ["OPSC OAS", "Police SI"], topicCount: 22, weightagePercentage: 18, active: true },
          { id: "SUB-04", code: "QUANT", name: "Quantitative Aptitude & Arithmetic", targetExams: ["OSSC CGL", "OSSSC Combined"], topicCount: 30, weightagePercentage: 25, active: true }
        ],
        topicsRegistry: [
          { id: "TOP-101", subjectId: "SUB-01", name: "Kalinga War, Maurya Rule & Kharavela Inscriptions", difficulty: "Medium", highYield: true, active: true },
          { id: "TOP-102", subjectId: "SUB-02", name: "Krudanta, Taddhita & Sandhi Rules", difficulty: "Hard", highYield: true, active: true },
          { id: "TOP-103", subjectId: "SUB-03", name: "Odisha State Legislative Assembly & High Court Jurisdiction", difficulty: "Medium", highYield: true, active: true }
        ]
      };
      localStorage.setItem("cso_subjects_topics_config", JSON.stringify(initial));
      this.logAudit("SUBJECTS_TOPICS_CONFIG_RESET", "EDUCATIONAL_RESOURCES", "Subjects & Topics restored to factory defaults.");
      return initial;
    },

    exportSubjectsTopicsManifest() {
      const config = this.getSubjectsTopicsConfig();
      const timestamp = Date.now();
      const filename = "cso-subjects-topics-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        subjectsTopics: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("SUBJECTS_TOPICS_MANIFEST_EXPORTED", "DATA_EXPORT", "Subjects & Topics manifest exported (" + filename + ").");
      return filename;
    },

    // 57.2 Class / Grade Management Engine (module-05-006)
    getClassGradeConfig() {
      const raw = localStorage.getItem("cso_class_grade_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_class_grade_config", e);
        }
      }
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        tierSettings: { activeEducationBoard: "BSE Odisha & CHSE", nep2020Compliant: true, enableVocationalTracks: true },
        grades: [
          { id: "GRD-01", code: "CLS-10", name: "Class 10 (High School Certificate / Matric)", board: "BSE Odisha", stream: "General Secondary", studentCount: 540000, active: true },
          { id: "GRD-02", code: "CLS-12-SCI", name: "Class 12 (+2 Science)", board: "CHSE Odisha", stream: "Science (PCMB)", studentCount: 110000, active: true },
          { id: "GRD-03", code: "CLS-12-ARTS", name: "Class 12 (+2 Arts & Humanities)", board: "CHSE Odisha", stream: "Arts", studentCount: 220000, active: true },
          { id: "GRD-04", code: "CLS-12-COMM", name: "Class 12 (+2 Commerce)", board: "CHSE Odisha", stream: "Commerce", studentCount: 45000, active: true },
          { id: "GRD-05", code: "GRAD-UG", name: "Undergraduate (Degree / B.A., B.Sc., B.Com, B.Tech)", board: "State Universities / SAMS", stream: "Higher Education", studentCount: 380000, active: true }
        ]
      };
      localStorage.setItem("cso_class_grade_config", JSON.stringify(initial));
      return initial;
    },

    saveClassGradeConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid class/grade payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_class_grade_config", JSON.stringify(config));
      this.logAudit("CLASS_GRADE_CONFIG_UPDATED", "EDUCATIONAL_RESOURCES", "Class & Grade educational tiers saved.");
      return config;
    },

    importClassGradeConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveClassGradeConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import class/grade config: " + err.message);
      }
    },

    resetClassGradeConfig() {
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        tierSettings: { activeEducationBoard: "BSE Odisha & CHSE", nep2020Compliant: true, enableVocationalTracks: true },
        grades: [
          { id: "GRD-01", code: "CLS-10", name: "Class 10 (High School Certificate / Matric)", board: "BSE Odisha", stream: "General Secondary", studentCount: 540000, active: true },
          { id: "GRD-02", code: "CLS-12-SCI", name: "Class 12 (+2 Science)", board: "CHSE Odisha", stream: "Science (PCMB)", studentCount: 110000, active: true },
          { id: "GRD-03", code: "CLS-12-ARTS", name: "Class 12 (+2 Arts & Humanities)", board: "CHSE Odisha", stream: "Arts", studentCount: 220000, active: true },
          { id: "GRD-04", code: "CLS-12-COMM", name: "Class 12 (+2 Commerce)", board: "CHSE Odisha", stream: "Commerce", studentCount: 45000, active: true },
          { id: "GRD-05", code: "GRAD-UG", name: "Undergraduate (Degree / B.A., B.Sc., B.Com, B.Tech)", board: "State Universities / SAMS", stream: "Higher Education", studentCount: 380000, active: true }
        ]
      };
      localStorage.setItem("cso_class_grade_config", JSON.stringify(initial));
      this.logAudit("CLASS_GRADE_CONFIG_RESET", "EDUCATIONAL_RESOURCES", "Class & Grade tiers restored to factory defaults.");
      return initial;
    },

    exportClassGradeManifest() {
      const config = this.getClassGradeConfig();
      const timestamp = Date.now();
      const filename = "cso-class-grade-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        classGrade: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("CLASS_GRADE_MANIFEST_EXPORTED", "DATA_EXPORT", "Class & Grade manifest exported (" + filename + ").");
      return filename;
    },

    // 57.3 Examination Management Engine (module-05-007)
    getExaminationManagementConfig() {
      const raw = localStorage.getItem("cso_examination_management_config");
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch (e) {
          console.error("Failed to parse cso_examination_management_config", e);
        }
      }
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        controllerSettings: { autoSyncWithGazette: true, notifyOnDateChange: true, defaultTimezone: "Asia/Kolkata" },
        examinations: [
          { id: "EXAM-01", code: "OPSC-OAS", name: "Odisha Civil Services (OAS/OPS/OFS)", conductingBody: "Odisha Public Service Commission (OPSC)", tier: "State Gazetted Level-A/B", examDate: "2026-12-15", status: "Notification Active", vacancies: 420, active: true },
          { id: "EXAM-02", code: "OSSC-CGL", name: "Combined Graduate Level Examination (CGL)", conductingBody: "Odisha Staff Selection Commission (OSSC)", tier: "State Level-B/C Group", examDate: "2026-11-28", status: "Admit Card Released", vacancies: 954, active: true },
          { id: "EXAM-03", code: "OSSSC-RI", name: "Revenue Inspector (RI) & Amin Combined Recruitment", conductingBody: "Odisha Sub-ordinate Staff Selection Commission (OSSSC)", tier: "District Cadre", examDate: "2027-01-10", status: "Form Fill-up Open", vacancies: 1480, active: true },
          { id: "EXAM-04", code: "BSE-OTET", name: "Odisha Teacher Eligibility Test (OTET)", conductingBody: "Board of Secondary Education (BSE Odisha)", tier: "State Professional Eligibility", examDate: "2026-12-05", status: "Scheduled", vacancies: 0, active: true }
        ]
      };
      localStorage.setItem("cso_examination_management_config", JSON.stringify(initial));
      return initial;
    },

    saveExaminationManagementConfig(config) {
      if (!config || typeof config !== "object") throw new Error("Invalid examination management payload");
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      config.meta.lastEditedBy = "admin@csodisha.com";
      localStorage.setItem("cso_examination_management_config", JSON.stringify(config));
      this.logAudit("EXAMINATION_MGMT_CONFIG_UPDATED", "EDUCATIONAL_RESOURCES", "Examination schedules and recruitment bodies saved.");
      return config;
    },

    importExaminationManagementConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        return this.saveExaminationManagementConfig(parsed);
      } catch (err) {
        throw new Error("Failed to import examination management config: " + err.message);
      }
    },

    resetExaminationManagementConfig() {
      const initial = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        controllerSettings: { autoSyncWithGazette: true, notifyOnDateChange: true, defaultTimezone: "Asia/Kolkata" },
        examinations: [
          { id: "EXAM-01", code: "OPSC-OAS", name: "Odisha Civil Services (OAS/OPS/OFS)", conductingBody: "Odisha Public Service Commission (OPSC)", tier: "State Gazetted Level-A/B", examDate: "2026-12-15", status: "Notification Active", vacancies: 420, active: true },
          { id: "EXAM-02", code: "OSSC-CGL", name: "Combined Graduate Level Examination (CGL)", conductingBody: "Odisha Staff Selection Commission (OSSC)", tier: "State Level-B/C Group", examDate: "2026-11-28", status: "Admit Card Released", vacancies: 954, active: true },
          { id: "EXAM-03", code: "OSSSC-RI", name: "Revenue Inspector (RI) & Amin Combined Recruitment", conductingBody: "Odisha Sub-ordinate Staff Selection Commission (OSSSC)", tier: "District Cadre", examDate: "2027-01-10", status: "Form Fill-up Open", vacancies: 1480, active: true },
          { id: "EXAM-04", code: "BSE-OTET", name: "Odisha Teacher Eligibility Test (OTET)", conductingBody: "Board of Secondary Education (BSE Odisha)", tier: "State Professional Eligibility", examDate: "2026-12-05", status: "Scheduled", vacancies: 0, active: true }
        ]
      };
      localStorage.setItem("cso_examination_management_config", JSON.stringify(initial));
      this.logAudit("EXAMINATION_MGMT_CONFIG_RESET", "EDUCATIONAL_RESOURCES", "Examination management restored to factory defaults.");
      return initial;
    },

    exportExaminationManagementManifest() {
      const config = this.getExaminationManagementConfig();
      const timestamp = Date.now();
      const filename = "cso-examination-management-config-" + timestamp + ".json";
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        examinationManagement: config
      };
      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      this.logAudit("EXAMINATION_MGMT_MANIFEST_EXPORTED", "DATA_EXPORT", "Examination management manifest exported (" + filename + ").");
      return filename;
    },
// =========================================================================
    // 58. Educational Resources Batch 3 (module-05-008 to module-05-011)
    // =========================================================================

    // --- MODULE 05-008: Recruitment & Jobs ---
    getRecruitmentJobsConfig() {
      const DEFAULT_RECRUITMENT_JOBS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "JOB-01", code: "OPSC-OCS-26", title: "Odisha Civil Services (OAS/OPS) Examination 2026", commission: "OPSC", vacancies: 399, payScale: "Level 12 (Rs. 56,100 - 1,77,500)", lastDate: "2026-11-30", applyUrl: "https://opsc.gov.in", status: "Open", active: true },
          { id: "JOB-02", code: "OSSC-CGL-26", title: "Combined Graduate Level (CGL) Recruitment", commission: "OSSC", vacancies: 624, payScale: "Level 9 (Rs. 35,400 - 1,12,400)", lastDate: "2026-12-15", applyUrl: "https://ossc.gov.in", status: "Open", active: true },
          { id: "JOB-03", code: "OSSSC-CRE-26", title: "Revenue Inspector, ARI & Amin Combined Cadre", commission: "OSSSSC", vacancies: 1890, payScale: "Level 4 - 8", lastDate: "2026-11-20", applyUrl: "https://osssc.gov.in", status: "Closing Soon", active: true },
          { id: "JOB-04", code: "POLICE-SI-26", title: "Odisha Police Sub-Inspector Direct Recruitment", commission: "Odisha Police", vacancies: 720, payScale: "Level 9", lastDate: "2026-12-05", applyUrl: "https://odishapolice.gov.in", status: "Upcoming", active: true }
        ]
      };
      DEFAULT_RECRUITMENT_JOBS.postings = DEFAULT_RECRUITMENT_JOBS.items;

      try {
        const raw = localStorage.getItem('cso_recruitment_jobs_config');
        if (!raw) {
          localStorage.setItem('cso_recruitment_jobs_config', JSON.stringify(DEFAULT_RECRUITMENT_JOBS));
          return JSON.parse(JSON.stringify(DEFAULT_RECRUITMENT_JOBS));
        }
        const parsed = JSON.parse(raw);
        const list = parsed.items || parsed.postings;
        if (!list || !Array.isArray(list) || list.length === 0) {
          localStorage.setItem('cso_recruitment_jobs_config', JSON.stringify(DEFAULT_RECRUITMENT_JOBS));
          return JSON.parse(JSON.stringify(DEFAULT_RECRUITMENT_JOBS));
        }
        parsed.items = list;
        parsed.postings = list;
        return parsed;
      } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_RECRUITMENT_JOBS));
      }
    },

    saveRecruitmentJobsConfig(cfg) {
      if (!cfg || typeof cfg !== "object") return;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.items || cfg.postings || [];
      cfg.items = list;
      cfg.postings = list;
      localStorage.setItem('cso_recruitment_jobs_config', JSON.stringify(cfg));
      this.logAudit("RECRUITMENT_JOBS_CONFIG_UPDATED", "EDUCATIONAL_RESOURCES", "Recruitment postings and vacancies saved.");
    },

    resetRecruitmentJobsConfig() {
      const DEFAULT_RECRUITMENT_JOBS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "JOB-01", code: "OPSC-OCS-26", title: "Odisha Civil Services (OAS/OPS) Examination 2026", commission: "OPSC", vacancies: 399, payScale: "Level 12 (Rs. 56,100 - 1,77,500)", lastDate: "2026-11-30", applyUrl: "https://opsc.gov.in", status: "Open", active: true },
          { id: "JOB-02", code: "OSSC-CGL-26", title: "Combined Graduate Level (CGL) Recruitment", commission: "OSSC", vacancies: 624, payScale: "Level 9 (Rs. 35,400 - 1,12,400)", lastDate: "2026-12-15", applyUrl: "https://ossc.gov.in", status: "Open", active: true },
          { id: "JOB-03", code: "OSSSC-CRE-26", title: "Revenue Inspector, ARI & Amin Combined Cadre", commission: "OSSSSC", vacancies: 1890, payScale: "Level 4 - 8", lastDate: "2026-11-20", applyUrl: "https://osssc.gov.in", status: "Closing Soon", active: true },
          { id: "JOB-04", code: "POLICE-SI-26", title: "Odisha Police Sub-Inspector Direct Recruitment", commission: "Odisha Police", vacancies: 720, payScale: "Level 9", lastDate: "2026-12-05", applyUrl: "https://odishapolice.gov.in", status: "Upcoming", active: true }
        ]
      };
      DEFAULT_RECRUITMENT_JOBS.postings = DEFAULT_RECRUITMENT_JOBS.items;
      localStorage.setItem('cso_recruitment_jobs_config', JSON.stringify(DEFAULT_RECRUITMENT_JOBS));
      this.logAudit("RECRUITMENT_JOBS_CONFIG_RESET", "EDUCATIONAL_RESOURCES", "Recruitment postings restored to factory defaults.");
      return JSON.parse(JSON.stringify(DEFAULT_RECRUITMENT_JOBS));
    },

    importRecruitmentJobsConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        this.saveRecruitmentJobsConfig(parsed);
        return parsed;
      } catch (err) {
        throw new Error("Failed to import recruitment jobs: " + err.message);
      }
    },

    exportRecruitmentJobsManifest() {
      const config = this.getRecruitmentJobsConfig();
      const filename = "recruitment_jobs_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("RECRUITMENT_JOBS_MANIFEST_EXPORTED", "DATA_EXPORT", "Recruitment jobs manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 05-009: Admit Cards & Results ---
    getAdmitCardsResultsConfig() {
      return this.getAdmitResultsConfig();
    },

    getAdmitResultsConfig() {
      const DEFAULT_ADMIT_RESULTS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "REL-01", code: "OSSSC-CRE-AC", title: "OSSSC Combined Recruitment 2026 Prelims Admit Card", examName: "OSSSC Combined Recruitment 2026 Prelims", type: "Admit Card", commission: "OSSSSC", releaseDate: "2026-11-08", downloadUrl: "https://osssc.gov.in", cutoffScore: "N/A", status: "Available", active: true },
          { id: "REL-02", code: "BSE-OTET-RES", title: "BSE Odisha OTET 2026 (Paper I & II) Merit Scorecard", examName: "BSE Odisha OTET 2026 (Paper I & II)", type: "Result", commission: "BSE Odisha", releaseDate: "2026-11-05", downloadUrl: "https://bseodisha.ac.in", cutoffScore: "Pass Mark: 60%", status: "Declared", active: true },
          { id: "REL-03", code: "OSSC-CGL-AC", title: "OSSC CGL Tier-I Written Examination Hall Ticket", examName: "OSSC CGL Tier-I Written Examination", type: "Admit Card", commission: "OSSC", releaseDate: "2026-12-01", downloadUrl: "https://ossc.gov.in", cutoffScore: "N/A", status: "Scheduled", active: true }
        ]
      };
      DEFAULT_ADMIT_RESULTS.releases = DEFAULT_ADMIT_RESULTS.items;

      try {
        const raw = localStorage.getItem('cso_admit_results_config');
        if (!raw) {
          localStorage.setItem('cso_admit_results_config', JSON.stringify(DEFAULT_ADMIT_RESULTS));
          return JSON.parse(JSON.stringify(DEFAULT_ADMIT_RESULTS));
        }
        const parsed = JSON.parse(raw);
        const list = parsed.items || parsed.releases;
        if (!list || !Array.isArray(list) || list.length === 0) {
          localStorage.setItem('cso_admit_results_config', JSON.stringify(DEFAULT_ADMIT_RESULTS));
          return JSON.parse(JSON.stringify(DEFAULT_ADMIT_RESULTS));
        }
        parsed.items = list;
        parsed.releases = list;
        return parsed;
      } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_ADMIT_RESULTS));
      }
    },

    saveAdmitCardsResultsConfig(cfg) {
      this.saveAdmitResultsConfig(cfg);
    },

    saveAdmitResultsConfig(cfg) {
      if (!cfg || typeof cfg !== "object") return;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.items || cfg.releases || [];
      cfg.items = list;
      cfg.releases = list;
      localStorage.setItem('cso_admit_results_config', JSON.stringify(cfg));
      this.logAudit("ADMIT_RESULTS_CONFIG_UPDATED", "EDUCATIONAL_RESOURCES", "Admit cards and examination results saved.");
    },

    resetAdmitCardsResultsConfig() {
      return this.resetAdmitResultsConfig();
    },

    resetAdmitResultsConfig() {
      const DEFAULT_ADMIT_RESULTS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "REL-01", code: "OSSSC-CRE-AC", title: "OSSSC Combined Recruitment 2026 Prelims Admit Card", examName: "OSSSC Combined Recruitment 2026 Prelims", type: "Admit Card", commission: "OSSSSC", releaseDate: "2026-11-08", downloadUrl: "https://osssc.gov.in", cutoffScore: "N/A", status: "Available", active: true },
          { id: "REL-02", code: "BSE-OTET-RES", title: "BSE Odisha OTET 2026 (Paper I & II) Merit Scorecard", examName: "BSE Odisha OTET 2026 (Paper I & II)", type: "Result", commission: "BSE Odisha", releaseDate: "2026-11-05", downloadUrl: "https://bseodisha.ac.in", cutoffScore: "Pass Mark: 60%", status: "Declared", active: true },
          { id: "REL-03", code: "OSSC-CGL-AC", title: "OSSC CGL Tier-I Written Examination Hall Ticket", examName: "OSSC CGL Tier-I Written Examination", type: "Admit Card", commission: "OSSC", releaseDate: "2026-12-01", downloadUrl: "https://ossc.gov.in", cutoffScore: "N/A", status: "Scheduled", active: true }
        ]
      };
      DEFAULT_ADMIT_RESULTS.releases = DEFAULT_ADMIT_RESULTS.items;
      localStorage.setItem('cso_admit_results_config', JSON.stringify(DEFAULT_ADMIT_RESULTS));
      this.logAudit("ADMIT_RESULTS_CONFIG_RESET", "EDUCATIONAL_RESOURCES", "Admit cards and results restored to factory defaults.");
      return JSON.parse(JSON.stringify(DEFAULT_ADMIT_RESULTS));
    },

    importAdmitCardsResultsConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        this.saveAdmitResultsConfig(parsed);
        return parsed;
      } catch (err) {
        throw new Error("Failed to import admit cards/results: " + err.message);
      }
    },

    exportAdmitCardsResultsManifest() {
      const config = this.getAdmitResultsConfig();
      const filename = "admit_results_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("ADMIT_RESULTS_MANIFEST_EXPORTED", "DATA_EXPORT", "Admit cards and results manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 05-010: Syllabus & Exam Patterns ---
    getSyllabusExamPatternsConfig() {
      return this.getSyllabusPatternsConfig();
    },

    getSyllabusPatternsConfig() {
      const DEFAULT_SYLLABUS_PATTERNS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "SYL-01", code: "OPSC-OCS-PAT", examCode: "OPSC-OCS", examName: "OPSC OAS Civil Services Exam Pattern", title: "OPSC OAS Civil Services Exam Pattern", totalMarks: 2000, stages: "Prelims (400M) + Mains (1400M) + Personality (200M)", negativeMarking: "0.33 per wrong answer", pdfUrl: "/assets/pdf/opsc-oas-syllabus.pdf", verified: true, active: true },
          { id: "SYL-02", code: "OSSC-CGL-PAT", examCode: "OSSC-CGL", examName: "OSSC Combined Graduate Level Pattern", title: "OSSC Combined Graduate Level Pattern", totalMarks: 350, stages: "Stage I Prelims (150M) + Stage II Mains (200M)", negativeMarking: "0.25 per wrong answer", pdfUrl: "/assets/pdf/ossc-cgl-syllabus.pdf", verified: true, active: true },
          { id: "SYL-03", code: "OSSSC-CRE-PAT", examCode: "OSSSC-CRE", examName: "OSSSC Revenue Inspector & Amin Scheme", title: "OSSSC Revenue Inspector & Amin Scheme", totalMarks: 180, stages: "Single-Day OMR (180M) + Skill Test", negativeMarking: "0.50 per wrong answer", pdfUrl: "/assets/pdf/osssc-ri-pattern.pdf", verified: true, active: true }
        ]
      };
      DEFAULT_SYLLABUS_PATTERNS.schemes = DEFAULT_SYLLABUS_PATTERNS.items;

      try {
        const raw = localStorage.getItem('cso_syllabus_patterns_config');
        if (!raw) {
          localStorage.setItem('cso_syllabus_patterns_config', JSON.stringify(DEFAULT_SYLLABUS_PATTERNS));
          return JSON.parse(JSON.stringify(DEFAULT_SYLLABUS_PATTERNS));
        }
        const parsed = JSON.parse(raw);
        const list = parsed.items || parsed.schemes;
        if (!list || !Array.isArray(list) || list.length === 0) {
          localStorage.setItem('cso_syllabus_patterns_config', JSON.stringify(DEFAULT_SYLLABUS_PATTERNS));
          return JSON.parse(JSON.stringify(DEFAULT_SYLLABUS_PATTERNS));
        }
        parsed.items = list;
        parsed.schemes = list;
        return parsed;
      } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_SYLLABUS_PATTERNS));
      }
    },

    saveSyllabusExamPatternsConfig(cfg) {
      this.saveSyllabusPatternsConfig(cfg);
    },

    saveSyllabusPatternsConfig(cfg) {
      if (!cfg || typeof cfg !== "object") return;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.items || cfg.schemes || [];
      cfg.items = list;
      cfg.schemes = list;
      localStorage.setItem('cso_syllabus_patterns_config', JSON.stringify(cfg));
      this.logAudit("SYLLABUS_PATTERNS_CONFIG_UPDATED", "EDUCATIONAL_RESOURCES", "Syllabus breakdowns and exam patterns saved.");
    },

    resetSyllabusExamPatternsConfig() {
      return this.resetSyllabusPatternsConfig();
    },

    resetSyllabusPatternsConfig() {
      const DEFAULT_SYLLABUS_PATTERNS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "SYL-01", code: "OPSC-OCS-PAT", examCode: "OPSC-OCS", examName: "OPSC OAS Civil Services Exam Pattern", title: "OPSC OAS Civil Services Exam Pattern", totalMarks: 2000, stages: "Prelims (400M) + Mains (1400M) + Personality (200M)", negativeMarking: "0.33 per wrong answer", pdfUrl: "/assets/pdf/opsc-oas-syllabus.pdf", verified: true, active: true },
          { id: "SYL-02", code: "OSSC-CGL-PAT", examCode: "OSSC-CGL", examName: "OSSC Combined Graduate Level Pattern", title: "OSSC Combined Graduate Level Pattern", totalMarks: 350, stages: "Stage I Prelims (150M) + Stage II Mains (200M)", negativeMarking: "0.25 per wrong answer", pdfUrl: "/assets/pdf/ossc-cgl-syllabus.pdf", verified: true, active: true },
          { id: "SYL-03", code: "OSSSC-CRE-PAT", examCode: "OSSSC-CRE", examName: "OSSSC Revenue Inspector & Amin Scheme", title: "OSSSC Revenue Inspector & Amin Scheme", totalMarks: 180, stages: "Single-Day OMR (180M) + Skill Test", negativeMarking: "0.50 per wrong answer", pdfUrl: "/assets/pdf/osssc-ri-pattern.pdf", verified: true, active: true }
        ]
      };
      DEFAULT_SYLLABUS_PATTERNS.schemes = DEFAULT_SYLLABUS_PATTERNS.items;
      localStorage.setItem('cso_syllabus_patterns_config', JSON.stringify(DEFAULT_SYLLABUS_PATTERNS));
      this.logAudit("SYLLABUS_PATTERNS_CONFIG_RESET", "EDUCATIONAL_RESOURCES", "Syllabus breakdowns restored to factory defaults.");
      return JSON.parse(JSON.stringify(DEFAULT_SYLLABUS_PATTERNS));
    },

    importSyllabusExamPatternsConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        this.saveSyllabusPatternsConfig(parsed);
        return parsed;
      } catch (err) {
        throw new Error("Failed to import syllabus/patterns: " + err.message);
      }
    },

    exportSyllabusExamPatternsManifest() {
      const config = this.getSyllabusPatternsConfig();
      const filename = "syllabus_patterns_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("SYLLABUS_PATTERNS_MANIFEST_EXPORTED", "DATA_EXPORT", "Syllabus patterns manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 05-011: Previous Year Questions ---
    getPyqConfig() {
      const DEFAULT_PYQ = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "PYQ-01", code: "OAS-25-GS1", exam: "OPSC OAS", examTitle: "OPSC OAS Prelims General Studies Paper I", paperTitle: "OPSC OAS Prelims General Studies Paper I", year: 2025, stage: "Prelims", totalQuestions: 100, downloadCount: 5820, paperUrl: "/assets/pyq/opsc-oas-2025-gs1.pdf", answerKeyStatus: "Official Ratified", active: true },
          { id: "PYQ-02", code: "OAS-25-CSAT", exam: "OPSC OAS", examTitle: "OPSC OAS Prelims General Studies Paper II (CSAT)", paperTitle: "OPSC OAS Prelims General Studies Paper II (CSAT)", year: 2025, stage: "Prelims", totalQuestions: 80, downloadCount: 4120, paperUrl: "/assets/pyq/opsc-oas-2025-csat.pdf", answerKeyStatus: "Official Ratified", active: true },
          { id: "PYQ-03", code: "CGL-24-T1", exam: "OSSC CGL", examTitle: "OSSC CGL Tier-I Arithmetic & Reasoning", paperTitle: "OSSC CGL Tier-I Arithmetic & Reasoning", year: 2024, stage: "Tier-I", totalQuestions: 150, downloadCount: 7910, paperUrl: "/assets/pyq/ossc-cgl-2024-tier1.pdf", answerKeyStatus: "Model Explanations Available", active: true },
          { id: "PYQ-04", code: "RI-23-MAIN", exam: "OSSSC", examTitle: "OSSSC RI & Amin Odia & General Studies", paperTitle: "OSSSC RI & Amin Odia & General Studies", year: 2023, stage: "Main", totalQuestions: 180, downloadCount: 9240, paperUrl: "/assets/pyq/osssc-ri-2023.pdf", answerKeyStatus: "Official Ratified", active: true }
        ]
      };
      DEFAULT_PYQ.papers = DEFAULT_PYQ.items;

      try {
        const raw = localStorage.getItem('cso_pyq_config');
        if (!raw) {
          localStorage.setItem('cso_pyq_config', JSON.stringify(DEFAULT_PYQ));
          return JSON.parse(JSON.stringify(DEFAULT_PYQ));
        }
        const parsed = JSON.parse(raw);
        const list = parsed.items || parsed.papers;
        if (!list || !Array.isArray(list) || list.length === 0) {
          localStorage.setItem('cso_pyq_config', JSON.stringify(DEFAULT_PYQ));
          return JSON.parse(JSON.stringify(DEFAULT_PYQ));
        }
        parsed.items = list;
        parsed.papers = list;
        return parsed;
      } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_PYQ));
      }
    },

    savePyqConfig(cfg) {
      if (!cfg || typeof cfg !== "object") return;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.items || cfg.papers || [];
      cfg.items = list;
      cfg.papers = list;
      localStorage.setItem('cso_pyq_config', JSON.stringify(cfg));
      this.logAudit("PYQ_CONFIG_UPDATED", "EDUCATIONAL_RESOURCES", "Previous Year Question papers archive saved.");
    },

    resetPyqConfig() {
      const DEFAULT_PYQ = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "PYQ-01", code: "OAS-25-GS1", exam: "OPSC OAS", examTitle: "OPSC OAS Prelims General Studies Paper I", paperTitle: "OPSC OAS Prelims General Studies Paper I", year: 2025, stage: "Prelims", totalQuestions: 100, downloadCount: 5820, paperUrl: "/assets/pyq/opsc-oas-2025-gs1.pdf", answerKeyStatus: "Official Ratified", active: true },
          { id: "PYQ-02", code: "OAS-25-CSAT", exam: "OPSC OAS", examTitle: "OPSC OAS Prelims General Studies Paper II (CSAT)", paperTitle: "OPSC OAS Prelims General Studies Paper II (CSAT)", year: 2025, stage: "Prelims", totalQuestions: 80, downloadCount: 4120, paperUrl: "/assets/pyq/opsc-oas-2025-csat.pdf", answerKeyStatus: "Official Ratified", active: true },
          { id: "PYQ-03", code: "CGL-24-T1", exam: "OSSC CGL", examTitle: "OSSC CGL Tier-I Arithmetic & Reasoning", paperTitle: "OSSC CGL Tier-I Arithmetic & Reasoning", year: 2024, stage: "Tier-I", totalQuestions: 150, downloadCount: 7910, paperUrl: "/assets/pyq/ossc-cgl-2024-tier1.pdf", answerKeyStatus: "Model Explanations Available", active: true },
          { id: "PYQ-04", code: "RI-23-MAIN", exam: "OSSSC", examTitle: "OSSSC RI & Amin Odia & General Studies", paperTitle: "OSSSC RI & Amin Odia & General Studies", year: 2023, stage: "Main", totalQuestions: 180, downloadCount: 9240, paperUrl: "/assets/pyq/osssc-ri-2023.pdf", answerKeyStatus: "Official Ratified", active: true }
        ]
      };
      DEFAULT_PYQ.papers = DEFAULT_PYQ.items;
      localStorage.setItem('cso_pyq_config', JSON.stringify(DEFAULT_PYQ));
      this.logAudit("PYQ_CONFIG_RESET", "EDUCATIONAL_RESOURCES", "PYQ repository restored to factory defaults.");
      return JSON.parse(JSON.stringify(DEFAULT_PYQ));
    },

    importPyqConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        this.savePyqConfig(parsed);
        return parsed;
      } catch (err) {
        throw new Error("Failed to import PYQ config: " + err.message);
      }
    },

    exportPyqManifest() {
      const config = this.getPyqConfig();
      const filename = "pyq_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("PYQ_MANIFEST_EXPORTED", "DATA_EXPORT", "PYQ archive manifest exported (" + filename + ").");
      return filename;
    },

    // =========================================================================
    // 59. Educational Resources Batch 4 (module-05-012 to module-05-015)
    // =========================================================================

    // --- MODULE 05-012: Question Bank ---
    getQuestionBankConfig() {
      const DEFAULT_QUESTION_BANK = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "Q-1001", code: "POL-ART214", prompt: "Under which article of the Constitution of India is the High Court of Orissa established?", subject: "Indian Polity", examTarget: "OPSC OAS", difficulty: "Medium", type: "MCQ", marks: 2, options: ["Article 214", "Article 217", "Article 226", "Article 231"], correctOptionIndex: 0, explanation: "Article 214 provides that there shall be a High Court for each State.", active: true },
          { id: "Q-1002", code: "HIST-YAYATI1", prompt: "Who was the dynamic Somavamshi ruler credited with unifying Coastal and Western Odisha?", subject: "Odisha History", examTarget: "OPSC / OSSC", difficulty: "Hard", type: "MCQ", marks: 2, options: ["Janmejaya I", "Yayati I", "Dharmaratha", "Udyotakesari"], correctOptionIndex: 1, explanation: "Yayati I is credited with the integration of Dakshina Kosala and Utkala.", active: true },
          { id: "Q-1003", code: "QUANT-SPEED1", prompt: "A train running at 72 km/hr crosses a 200m platform in 25 seconds. What is the length of the train?", subject: "Quantitative Aptitude", examTarget: "OSSC CGL", difficulty: "Easy", type: "MCQ", marks: 1, options: ["250 m", "300 m", "200 m", "350 m"], correctOptionIndex: 1, explanation: "Speed = 72 * (5/18) = 20 m/s. Total distance = 20 * 25 = 500m. Train length = 500 - 200 = 300m.", active: true },
          { id: "Q-1004", code: "ODIA-SANDHI1", prompt: "What is the correct Sandhi division for the Odia word 'ଇତ୍ୟାଦି' (Ityadi)?", subject: "Odia Grammar", examTarget: "OSSSC RI/Amin", difficulty: "Medium", type: "MCQ", marks: 1, options: ["ଇତି + ଆଦି", "ଇତ୍ୟ + ଆଦି", "ଇତ୍ + ଆଦି", "ଇତେ + ଆଦି"], correctOptionIndex: 0, explanation: "ଇତି + ଆଦି = ଇତ୍ୟାଦି (ଯ-ଫଳା ସନ୍ଧି ନିୟମ).", active: true }
        ]
      };
      DEFAULT_QUESTION_BANK.questions = DEFAULT_QUESTION_BANK.items;

      try {
        const raw = localStorage.getItem('cso_question_bank_config');
        if (!raw) {
          localStorage.setItem('cso_question_bank_config', JSON.stringify(DEFAULT_QUESTION_BANK));
          return JSON.parse(JSON.stringify(DEFAULT_QUESTION_BANK));
        }
        const parsed = JSON.parse(raw);
        const list = parsed.items || parsed.questions || [];
        if (!Array.isArray(list) || list.length === 0) {
          localStorage.setItem('cso_question_bank_config', JSON.stringify(DEFAULT_QUESTION_BANK));
          return JSON.parse(JSON.stringify(DEFAULT_QUESTION_BANK));
        }
        parsed.items = list;
        parsed.questions = list;
        return parsed;
      } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_QUESTION_BANK));
      }
    },

    saveQuestionBankConfig(cfg) {
      if (!cfg || typeof cfg !== "object") return;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.questions = cfg.items || cfg.questions || [];
      cfg.items = cfg.questions;
      localStorage.setItem('cso_question_bank_config', JSON.stringify(cfg));
      this.logAudit("QUESTION_BANK_CONFIG_UPDATED", "EDUCATIONAL_RESOURCES", "Question bank questions and repository settings saved.");
    },

    resetQuestionBankConfig() {
      const DEFAULT_QUESTION_BANK = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "Q-1001", code: "POL-ART214", prompt: "Under which article of the Constitution of India is the High Court of Orissa established?", subject: "Indian Polity", examTarget: "OPSC OAS", difficulty: "Medium", type: "MCQ", marks: 2, options: ["Article 214", "Article 217", "Article 226", "Article 231"], correctOptionIndex: 0, explanation: "Article 214 provides that there shall be a High Court for each State.", active: true },
          { id: "Q-1002", code: "HIST-YAYATI1", prompt: "Who was the dynamic Somavamshi ruler credited with unifying Coastal and Western Odisha?", subject: "Odisha History", examTarget: "OPSC / OSSC", difficulty: "Hard", type: "MCQ", marks: 2, options: ["Janmejaya I", "Yayati I", "Dharmaratha", "Udyotakesari"], correctOptionIndex: 1, explanation: "Yayati I is credited with the integration of Dakshina Kosala and Utkala.", active: true },
          { id: "Q-1003", code: "QUANT-SPEED1", prompt: "A train running at 72 km/hr crosses a 200m platform in 25 seconds. What is the length of the train?", subject: "Quantitative Aptitude", examTarget: "OSSC CGL", difficulty: "Easy", type: "MCQ", marks: 1, options: ["250 m", "300 m", "200 m", "350 m"], correctOptionIndex: 1, explanation: "Speed = 72 * (5/18) = 20 m/s. Total distance = 20 * 25 = 500m. Train length = 500 - 200 = 300m.", active: true },
          { id: "Q-1004", code: "ODIA-SANDHI1", prompt: "What is the correct Sandhi division for the Odia word 'ଇତ୍ୟାଦି' (Ityadi)?", subject: "Odia Grammar", examTarget: "OSSSC RI/Amin", difficulty: "Medium", type: "MCQ", marks: 1, options: ["ଇତି + ଆଦି", "ଇତ୍ୟ + ଆଦି", "ଇତ୍ + ଆଦି", "ଇତେ + ଆଦି"], correctOptionIndex: 0, explanation: "ଇତି + ଆଦି = ଇତ୍ୟାଦି (ଯ-ଫଳା ସନ୍ଧି ନିୟମ).", active: true }
        ]
      };
      DEFAULT_QUESTION_BANK.questions = DEFAULT_QUESTION_BANK.items;
      localStorage.setItem('cso_question_bank_config', JSON.stringify(DEFAULT_QUESTION_BANK));
      this.logAudit("QUESTION_BANK_CONFIG_RESET", "EDUCATIONAL_RESOURCES", "Question bank restored to factory defaults.");
      return JSON.parse(JSON.stringify(DEFAULT_QUESTION_BANK));
    },

    importQuestionBankConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        this.saveQuestionBankConfig(parsed);
        return parsed;
      } catch (err) {
        throw new Error("Failed to import question bank: " + err.message);
      }
    },

    exportQuestionBankManifest() {
      const config = this.getQuestionBankConfig();
      const filename = "question_bank_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("QUESTION_BANK_MANIFEST_EXPORTED", "DATA_EXPORT", "Question bank manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 05-013: MCQ & Quiz Builder ---
    getQuizBuilderConfig() {
      const DEFAULT_QUIZ_BUILDER = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "QUIZ-01", code: "DAILY-GK-45", title: "Daily Odisha Current Affairs & Static GK Quiz #45", subject: "Odisha GK", examTarget: "All State Exams", totalQuestions: 15, durationMinutes: 15, passingScore: 6, status: "Active", active: true },
          { id: "QUIZ-02", code: "POL-DPSP-20", title: "Indian Polity: Fundamental Rights & DPSP Practice Drill", subject: "Polity", examTarget: "OPSC OAS", totalQuestions: 20, durationMinutes: 20, passingScore: 8, status: "Active", active: true },
          { id: "QUIZ-03", code: "ODIA-VYAK-25", title: "Odia Vyakaran (Sandhi & Samasa) Speed Drill", subject: "Odia Language", examTarget: "OSSSC RI/Amin", totalQuestions: 25, durationMinutes: 20, passingScore: 10, status: "Active", active: true }
        ]
      };
      DEFAULT_QUIZ_BUILDER.quizzes = DEFAULT_QUIZ_BUILDER.items;

      try {
        const raw = localStorage.getItem('cso_quiz_builder_config');
        if (!raw) {
          localStorage.setItem('cso_quiz_builder_config', JSON.stringify(DEFAULT_QUIZ_BUILDER));
          return JSON.parse(JSON.stringify(DEFAULT_QUIZ_BUILDER));
        }
        const parsed = JSON.parse(raw);
        const list = parsed.items || parsed.quizzes || [];
        if (!Array.isArray(list) || list.length === 0) {
          localStorage.setItem('cso_quiz_builder_config', JSON.stringify(DEFAULT_QUIZ_BUILDER));
          return JSON.parse(JSON.stringify(DEFAULT_QUIZ_BUILDER));
        }
        parsed.items = list;
        parsed.quizzes = list;
        return parsed;
      } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_QUIZ_BUILDER));
      }
    },

    saveQuizBuilderConfig(cfg) {
      if (!cfg || typeof cfg !== "object") return;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.quizzes = cfg.items || cfg.quizzes || [];
      cfg.items = cfg.quizzes;
      localStorage.setItem('cso_quiz_builder_config', JSON.stringify(cfg));
      this.logAudit("QUIZ_BUILDER_CONFIG_UPDATED", "EDUCATIONAL_RESOURCES", "Quiz builder assessments and settings saved.");
    },

    resetQuizBuilderConfig() {
      const DEFAULT_QUIZ_BUILDER = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "QUIZ-01", code: "DAILY-GK-45", title: "Daily Odisha Current Affairs & Static GK Quiz #45", subject: "Odisha GK", examTarget: "All State Exams", totalQuestions: 15, durationMinutes: 15, passingScore: 6, status: "Active", active: true },
          { id: "QUIZ-02", code: "POL-DPSP-20", title: "Indian Polity: Fundamental Rights & DPSP Practice Drill", subject: "Polity", examTarget: "OPSC OAS", totalQuestions: 20, durationMinutes: 20, passingScore: 8, status: "Active", active: true },
          { id: "QUIZ-03", code: "ODIA-VYAK-25", title: "Odia Vyakaran (Sandhi & Samasa) Speed Drill", subject: "Odia Language", examTarget: "OSSSC RI/Amin", totalQuestions: 25, durationMinutes: 20, passingScore: 10, status: "Active", active: true }
        ]
      };
      DEFAULT_QUIZ_BUILDER.quizzes = DEFAULT_QUIZ_BUILDER.items;
      localStorage.setItem('cso_quiz_builder_config', JSON.stringify(DEFAULT_QUIZ_BUILDER));
      this.logAudit("QUIZ_BUILDER_CONFIG_RESET", "EDUCATIONAL_RESOURCES", "Quizzes restored to factory defaults.");
      return JSON.parse(JSON.stringify(DEFAULT_QUIZ_BUILDER));
    },

    importQuizBuilderConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        this.saveQuizBuilderConfig(parsed);
        return parsed;
      } catch (err) {
        throw new Error("Failed to import quiz builder config: " + err.message);
      }
    },

    exportQuizBuilderManifest() {
      const config = this.getQuizBuilderConfig();
      const filename = "quiz_builder_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("QUIZ_BUILDER_MANIFEST_EXPORTED", "DATA_EXPORT", "Quiz builder manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 05-014: Mock Tests ---
    getMockTestsConfig() {
      const DEFAULT_MOCK_TESTS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "MOCK-01", code: "OPSC-FLT-01", title: "OPSC OAS Prelims Full Length Mock Test 1 (GS Paper I)", totalQuestions: 100, totalMarks: 200, durationMinutes: 120, negativeMarkingRate: "0.33", scheduledStart: "2026-11-15T09:30:00Z", attemptsCount: 1240, status: "Live", active: true },
          { id: "MOCK-02", code: "OSSC-CGL-T1", title: "OSSC CGL Tier-I Comprehensive Mock (Arithmetic & Reasoning)", totalQuestions: 150, totalMarks: 150, durationMinutes: 120, negativeMarkingRate: "0.25", scheduledStart: "2026-11-20T14:00:00Z", attemptsCount: 2890, status: "Scheduled", active: true },
          { id: "MOCK-03", code: "OSSSC-CRE-OMR", title: "OSSSC Combined Recruitment Full Mock (GK, Odia, Arithmetic)", totalQuestions: 180, totalMarks: 180, durationMinutes: 180, negativeMarkingRate: "0.50", scheduledStart: "2026-11-22T10:00:00Z", attemptsCount: 3410, status: "Scheduled", active: true }
        ]
      };
      DEFAULT_MOCK_TESTS.tests = DEFAULT_MOCK_TESTS.items;

      try {
        const raw = localStorage.getItem('cso_mock_tests_config');
        if (!raw) {
          localStorage.setItem('cso_mock_tests_config', JSON.stringify(DEFAULT_MOCK_TESTS));
          return JSON.parse(JSON.stringify(DEFAULT_MOCK_TESTS));
        }
        const parsed = JSON.parse(raw);
        const list = parsed.items || parsed.tests || [];
        if (!Array.isArray(list) || list.length === 0) {
          localStorage.setItem('cso_mock_tests_config', JSON.stringify(DEFAULT_MOCK_TESTS));
          return JSON.parse(JSON.stringify(DEFAULT_MOCK_TESTS));
        }
        parsed.items = list;
        parsed.tests = list;
        return parsed;
      } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_MOCK_TESTS));
      }
    },

    saveMockTestsConfig(cfg) {
      if (!cfg || typeof cfg !== "object") return;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.tests = cfg.items || cfg.tests || [];
      cfg.items = cfg.tests;
      localStorage.setItem('cso_mock_tests_config', JSON.stringify(cfg));
      this.logAudit("MOCK_TESTS_CONFIG_UPDATED", "EDUCATIONAL_RESOURCES", "Mock tests series configuration saved.");
    },

    resetMockTestsConfig() {
      const DEFAULT_MOCK_TESTS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "MOCK-01", code: "OPSC-FLT-01", title: "OPSC OAS Prelims Full Length Mock Test 1 (GS Paper I)", totalQuestions: 100, totalMarks: 200, durationMinutes: 120, negativeMarkingRate: "0.33", scheduledStart: "2026-11-15T09:30:00Z", attemptsCount: 1240, status: "Live", active: true },
          { id: "MOCK-02", code: "OSSC-CGL-T1", title: "OSSC CGL Tier-I Comprehensive Mock (Arithmetic & Reasoning)", totalQuestions: 150, totalMarks: 150, durationMinutes: 120, negativeMarkingRate: "0.25", scheduledStart: "2026-11-20T14:00:00Z", attemptsCount: 2890, status: "Scheduled", active: true },
          { id: "MOCK-03", code: "OSSSC-CRE-OMR", title: "OSSSC Combined Recruitment Full Mock (GK, Odia, Arithmetic)", totalQuestions: 180, totalMarks: 180, durationMinutes: 180, negativeMarkingRate: "0.50", scheduledStart: "2026-11-22T10:00:00Z", attemptsCount: 3410, status: "Scheduled", active: true }
        ]
      };
      DEFAULT_MOCK_TESTS.tests = DEFAULT_MOCK_TESTS.items;
      localStorage.setItem('cso_mock_tests_config', JSON.stringify(DEFAULT_MOCK_TESTS));
      this.logAudit("MOCK_TESTS_CONFIG_RESET", "EDUCATIONAL_RESOURCES", "Mock tests restored to factory defaults.");
      return JSON.parse(JSON.stringify(DEFAULT_MOCK_TESTS));
    },

    importMockTestsConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        this.saveMockTestsConfig(parsed);
        return parsed;
      } catch (err) {
        throw new Error("Failed to import mock tests: " + err.message);
      }
    },

    exportMockTestsManifest() {
      const config = this.getMockTestsConfig();
      const filename = "mock_tests_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("MOCK_TESTS_MANIFEST_EXPORTED", "DATA_EXPORT", "Mock tests manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 05-015: Answer Keys & Explanations ---
    getAnswerKeysConfig() {
      const DEFAULT_ANSWER_KEYS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "KEY-01", code: "OTET-26-PROV", examCode: "BSE-OTET-2026", examTitle: "BSE Odisha OTET 2026 Paper I Provisional Answer Key", releaseStatus: "Provisional", setsAvailable: "Set A, B, C, D", releasedDate: "2026-11-04", objectionDeadline: "2026-11-11", officialKeyUrl: "/assets/keys/otet-2026-key.pdf", hasDetailedExplanations: true, active: true },
          { id: "KEY-02", code: "OAS-25-FINAL", examCode: "OPSC-OCS-2025", examTitle: "OPSC OAS Prelims 2025 Final Official Master Key", releaseStatus: "Final Ratified", setsAvailable: "Master Key", releasedDate: "2026-08-15", objectionDeadline: "Expired", officialKeyUrl: "/assets/keys/opsc-oas-2025-final.pdf", hasDetailedExplanations: true, active: true },
          { id: "KEY-03", code: "CTSRE-26-PROV", examCode: "OSSC-CTSRE-2026", examTitle: "OSSC CTSRE Technical Preliminary Answer Key", releaseStatus: "Provisional", setsAvailable: "Set A, B", releasedDate: "2026-11-06", objectionDeadline: "2026-11-13", officialKeyUrl: "/assets/keys/ossc-ctsre-key.pdf", hasDetailedExplanations: false, active: true }
        ]
      };
      DEFAULT_ANSWER_KEYS.keys = DEFAULT_ANSWER_KEYS.items;
      DEFAULT_ANSWER_KEYS.keysRegistry = DEFAULT_ANSWER_KEYS.items;

      try {
        const raw = localStorage.getItem('cso_answer_keys_config');
        if (!raw) {
          localStorage.setItem('cso_answer_keys_config', JSON.stringify(DEFAULT_ANSWER_KEYS));
          return JSON.parse(JSON.stringify(DEFAULT_ANSWER_KEYS));
        }
        const parsed = JSON.parse(raw);
        const list = parsed.items || parsed.keys || parsed.keysRegistry || [];
        if (!Array.isArray(list) || list.length === 0) {
          localStorage.setItem('cso_answer_keys_config', JSON.stringify(DEFAULT_ANSWER_KEYS));
          return JSON.parse(JSON.stringify(DEFAULT_ANSWER_KEYS));
        }
        parsed.items = list;
        parsed.keys = list;
        parsed.keysRegistry = list;
        return parsed;
      } catch (e) {
        return JSON.parse(JSON.stringify(DEFAULT_ANSWER_KEYS));
      }
    },

    getAnswerKeysExplanationsConfig() {
      return this.getAnswerKeysConfig();
    },

    saveAnswerKeysConfig(cfg) {
      if (!cfg || typeof cfg !== "object") return;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.keys = cfg.items || cfg.keys || cfg.keysRegistry || [];
      cfg.items = cfg.keys;
      cfg.keysRegistry = cfg.keys;
      localStorage.setItem('cso_answer_keys_config', JSON.stringify(cfg));
      this.logAudit("ANSWER_KEYS_CONFIG_UPDATED", "EDUCATIONAL_RESOURCES", "Answer keys registry and candidate grievance policies saved.");
    },

    saveAnswerKeysExplanationsConfig(cfg) {
      return this.saveAnswerKeysConfig(cfg);
    },

    resetAnswerKeysConfig() {
      const DEFAULT_ANSWER_KEYS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "KEY-01", code: "OTET-26-PROV", examCode: "BSE-OTET-2026", examTitle: "BSE Odisha OTET 2026 Paper I Provisional Answer Key", releaseStatus: "Provisional", setsAvailable: "Set A, B, C, D", releasedDate: "2026-11-04", objectionDeadline: "2026-11-11", officialKeyUrl: "/assets/keys/otet-2026-key.pdf", hasDetailedExplanations: true, active: true },
          { id: "KEY-02", code: "OAS-25-FINAL", examCode: "OPSC-OCS-2025", examTitle: "OPSC OAS Prelims 2025 Final Official Master Key", releaseStatus: "Final Ratified", setsAvailable: "Master Key", releasedDate: "2026-08-15", objectionDeadline: "Expired", officialKeyUrl: "/assets/keys/opsc-oas-2025-final.pdf", hasDetailedExplanations: true, active: true },
          { id: "KEY-03", code: "CTSRE-26-PROV", examCode: "OSSC-CTSRE-2026", examTitle: "OSSC CTSRE Technical Preliminary Answer Key", releaseStatus: "Provisional", setsAvailable: "Set A, B", releasedDate: "2026-11-06", objectionDeadline: "2026-11-13", officialKeyUrl: "/assets/keys/ossc-ctsre-key.pdf", hasDetailedExplanations: false, active: true }
        ]
      };
      DEFAULT_ANSWER_KEYS.keys = DEFAULT_ANSWER_KEYS.items;
      DEFAULT_ANSWER_KEYS.keysRegistry = DEFAULT_ANSWER_KEYS.items;
      localStorage.setItem('cso_answer_keys_config', JSON.stringify(DEFAULT_ANSWER_KEYS));
      this.logAudit("ANSWER_KEYS_CONFIG_RESET", "EDUCATIONAL_RESOURCES", "Answer keys registry restored to factory defaults.");
      return JSON.parse(JSON.stringify(DEFAULT_ANSWER_KEYS));
    },

    resetAnswerKeysExplanationsConfig() {
      return this.resetAnswerKeysConfig();
    },

    importAnswerKeysExplanationsConfig(jsonString) {
      try {
        const parsed = JSON.parse(jsonString);
        if (!parsed || typeof parsed !== "object") throw new Error("Parsed JSON must be an object");
        this.saveAnswerKeysConfig(parsed);
        return parsed;
      } catch (err) {
        throw new Error("Failed to import answer keys: " + err.message);
      }
    },

    exportAnswerKeysExplanationsManifest() {
      const config = this.getAnswerKeysConfig();
      const filename = "answer_keys_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("ANSWER_KEYS_MANIFEST_EXPORTED", "DATA_EXPORT", "Answer keys manifest exported (" + filename + ").");
      return filename;
    },
    // -------------------------------------------------------------
    // Universal Safe Hydration Helper
    // -------------------------------------------------------------
    _hydrateConfig(storageKey, primaryKey, fallbackFactory) {
      return _hydrateConfig(storageKey, primaryKey, fallbackFactory);
    },

    // -------------------------------------------------------------
    // ENGINE 60.1: Resource Collections Engine (module-05-016)
    // -------------------------------------------------------------
    getResourceCollectionsConfig() {
      return this._hydrateConfig("cso_resource_collections_config", "collections", () => ({
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        collectionSettings: { enableDynamicBundling: true, highlightTrendingCollections: true },
        collections: [
          { id: "COL-01", title: "OPSC OAS Foundation Bundle", category: "Civil Services", itemCount: 12, totalSize: "45.2 MB", badge: "Flagship Kit", targetExam: "OPSC OAS", downloadCount: 3820, active: true },
          { id: "COL-02", title: "OSSC CGL Quant Pack", category: "Staff Selection", itemCount: 8, totalSize: "22.8 MB", badge: "High Yield", targetExam: "OSSC CGL", downloadCount: 5190, active: true },
          { id: "COL-03", title: "30-Districts Gazetteer", category: "General Studies", itemCount: 15, totalSize: "68.4 MB", badge: "State Heritage", targetExam: "All Odisha Exams", downloadCount: 2940, active: true }
        ]
      }));
    },

    saveResourceCollectionsConfig(config) {
      if (!config) return false;
      const clean = {
        meta: {
          version: "1.0",
          lastEditedBy: "admin@csodisha.com",
          updatedAt: new Date().toISOString()
        },
        collectionSettings: {
          enableDynamicBundling: Boolean(config.collectionSettings?.enableDynamicBundling),
          highlightTrendingCollections: Boolean(config.collectionSettings?.highlightTrendingCollections)
        },
        collections: Array.isArray(config.collections || config.items) ? (config.collections || config.items).map(c => ({
          id: String(c.id || "COL-" + Math.floor(10 + Math.random() * 90)),
          title: String(c.title || "").trim(),
          category: String(c.category || "General Studies").trim(),
          itemCount: Number(c.itemCount || 0),
          totalSize: String(c.totalSize || "0 MB").trim(),
          badge: String(c.badge || "Standard").trim(),
          targetExam: String(c.targetExam || "All Odisha Exams").trim(),
          downloadCount: Number(c.downloadCount || 0),
          active: c.active !== false
        })) : []
      };
      clean.items = clean.collections;
      localStorage.setItem("cso_resource_collections_config", JSON.stringify(clean));
      this.logAudit("RESOURCE_COLLECTIONS_UPDATED", "EDUCATIONAL_RESOURCES", "Resource collections updated (" + clean.collections.length + " collections).");
      return true;
    },

    resetResourceCollectionsConfig() {
      localStorage.removeItem("cso_resource_collections_config");
      this.logAudit("RESOURCE_COLLECTIONS_RESET", "SYSTEM_RESET", "Resource collections configuration reset to factory defaults.");
      return this.getResourceCollectionsConfig();
    },

    exportResourceCollectionsManifest() {
      const config = this.getResourceCollectionsConfig();
      const filename = "resource_collections_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("RESOURCE_COLLECTIONS_MANIFEST_EXPORTED", "DATA_EXPORT", "Resource collections manifest exported (" + filename + ").");
      return filename;
    },

    // -------------------------------------------------------------
    // ENGINE 60.2: Downloads & Access Rules Engine (module-05-017)
    // -------------------------------------------------------------
    getDownloadsRulesConfig() {
      return this._hydrateConfig("cso_downloads_rules_config", "rules", () => ({
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        rulesSettings: { enforceRateLimiting: true, maxDownloadsPerHour: 50, requireAuthForProtectedPdfs: false },
        rules: [
          { id: "RULE-01", name: "Unrestricted Public Syllabi", userGroup: "Anonymous / Guest", dailyLimitMb: 500, allowedFormats: ["PDF", "HTML"], rateLimitPerHour: 100, active: true },
          { id: "RULE-02", name: "High-Volume Mock Limiter", userGroup: "Registered Aspirants", dailyLimitMb: 2048, allowedFormats: ["PDF", "EPUB", "ZIP"], rateLimitPerHour: 30, active: true },
          { id: "RULE-03", name: "Rural Low-Bandwidth Routing", userGroup: "District Mo Seva Kendras", dailyLimitMb: 5120, allowedFormats: ["PDF", "EPUB", "HTML", "TXT"], rateLimitPerHour: 200, active: true }
        ],
        accessTiers: [
          { id: "RULE-01", name: "Unrestricted Public Syllabi", userGroup: "Anonymous / Guest", dailyLimitMb: 500, allowedFormats: ["PDF", "HTML"], active: true },
          { id: "RULE-02", name: "High-Volume Mock Limiter", userGroup: "Registered Aspirants", dailyLimitMb: 2048, allowedFormats: ["PDF", "EPUB", "ZIP"], active: true },
          { id: "RULE-03", name: "Rural Low-Bandwidth Routing", userGroup: "District Mo Seva Kendras", dailyLimitMb: 5120, allowedFormats: ["PDF", "EPUB", "HTML", "TXT"], active: true }
        ]
      }));
    },

    saveDownloadsRulesConfig(config) {
      if (!config) return false;
      const list = Array.isArray(config.rules || config.accessTiers || config.items) ? (config.rules || config.accessTiers || config.items) : [];
      const clean = {
        meta: {
          version: "1.0",
          lastEditedBy: "admin@csodisha.com",
          updatedAt: new Date().toISOString()
        },
        rulesSettings: {
          enforceRateLimiting: Boolean(config.rulesSettings?.enforceRateLimiting),
          maxDownloadsPerHour: Number(config.rulesSettings?.maxDownloadsPerHour || 50),
          requireAuthForProtectedPdfs: Boolean(config.rulesSettings?.requireAuthForProtectedPdfs)
        },
        rules: list.map(t => ({
          id: String(t.id || "RULE-" + Math.floor(10 + Math.random() * 90)),
          name: String(t.name || "").trim(),
          userGroup: String(t.userGroup || "General Citizens").trim(),
          dailyLimitMb: Number(t.dailyLimitMb || 500),
          allowedFormats: Array.isArray(t.allowedFormats) ? t.allowedFormats : ["PDF"],
          rateLimitPerHour: Number(t.rateLimitPerHour || 50),
          active: t.active !== false
        }))
      };
      clean.accessTiers = clean.rules;
      clean.items = clean.rules;
      localStorage.setItem("cso_downloads_rules_config", JSON.stringify(clean));
      this.logAudit("DOWNLOADS_RULES_UPDATED", "EDUCATIONAL_RESOURCES", "Downloads & Access rules updated (" + clean.rules.length + " rules).");
      return true;
    },

    resetDownloadsRulesConfig() {
      localStorage.removeItem("cso_downloads_rules_config");
      this.logAudit("DOWNLOADS_RULES_RESET", "SYSTEM_RESET", "Downloads rules configuration reset to factory defaults.");
      return this.getDownloadsRulesConfig();
    },

    exportDownloadsRulesManifest() {
      const config = this.getDownloadsRulesConfig();
      const filename = "downloads_rules_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("DOWNLOADS_RULES_MANIFEST_EXPORTED", "DATA_EXPORT", "Downloads rules manifest exported (" + filename + ").");
      return filename;
    },

    // -------------------------------------------------------------
    // ENGINE 60.3: Government Schemes Engine (module-05-018)
    // -------------------------------------------------------------
    getGovernmentSchemesConfig() {
      return this._hydrateConfig("cso_government_schemes_config", "schemes", () => ({
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        schemeSettings: { autoSyncDbtPortals: true, showIncomeCeilingRules: true },
        schemes: [
          { id: "SCHM-01", name: "KALIA Chhatra Bruti", department: "Agriculture & Farmers' Empowerment", beneficiaryGroup: "Children of KALIA Beneficiary Farmers", financialAssistance: "Full technical / higher education support", applicationMode: "Online DBT / SAMS Odisha", active: true },
          { id: "SCHM-02", name: "Mo School Abhiyan", department: "School & Mass Education", beneficiaryGroup: "Government School Alumni & Students", financialAssistance: "2x State matching contribution for school infrastructure", applicationMode: "Mo School Portal", active: true },
          { id: "SCHM-03", name: "Odisha Skill Development (OSDA)", department: "Skill Development & Technical Education", beneficiaryGroup: "Youth Seeking Technical & Vocational Skills", financialAssistance: "Free World-Class Skill Training & Placement Assistance", applicationMode: "Skilled in Odisha Portal", active: true }
        ]
      }));
    },

    saveGovernmentSchemesConfig(config) {
      if (!config) return false;
      const clean = {
        meta: {
          version: "1.0",
          lastEditedBy: "admin@csodisha.com",
          updatedAt: new Date().toISOString()
        },
        schemeSettings: {
          autoSyncDbtPortals: Boolean(config.schemeSettings?.autoSyncDbtPortals),
          showIncomeCeilingRules: Boolean(config.schemeSettings?.showIncomeCeilingRules)
        },
        schemes: Array.isArray(config.schemes || config.items) ? (config.schemes || config.items).map(s => ({
          id: String(s.id || "SCHM-" + Math.floor(10 + Math.random() * 90)),
          name: String(s.name || "").trim(),
          department: String(s.department || "General Administration").trim(),
          beneficiaryGroup: String(s.beneficiaryGroup || "General Citizens").trim(),
          financialAssistance: String(s.financialAssistance || "N/A").trim(),
          applicationMode: String(s.applicationMode || "Online Portal").trim(),
          active: s.active !== false
        })) : []
      };
      clean.items = clean.schemes;
      localStorage.setItem("cso_government_schemes_config", JSON.stringify(clean));
      this.logAudit("GOVERNMENT_SCHEMES_UPDATED", "EDUCATIONAL_RESOURCES", "Government schemes updated (" + clean.schemes.length + " schemes).");
      return true;
    },

    resetGovernmentSchemesConfig() {
      localStorage.removeItem("cso_government_schemes_config");
      this.logAudit("GOVERNMENT_SCHEMES_RESET", "SYSTEM_RESET", "Government schemes configuration reset to factory defaults.");
      return this.getGovernmentSchemesConfig();
    },

    exportGovernmentSchemesManifest() {
      const config = this.getGovernmentSchemesConfig();
      const filename = "government_schemes_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("GOVERNMENT_SCHEMES_MANIFEST_EXPORTED", "DATA_EXPORT", "Government schemes manifest exported (" + filename + ").");
      return filename;
    },

    // -------------------------------------------------------------
    // ENGINE 60.4: Scholarships Engine (module-05-019)
    // -------------------------------------------------------------
    getScholarshipsConfig() {
      return this._hydrateConfig("cso_scholarships_config", "scholarships", () => ({
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        scholarshipSettings: { autoSyncStatePortal: true, notifyUpcomingDeadlines: true, enableMeritCalculator: true },
        scholarships: [
          { id: "SCHOL-01", name: "e-Medhabruti", level: "Higher Education (+3 / PG / Technical)", awardAmount: "Rs. 10,000 / Year", eligibility: "General/SC/ST with >= 60% marks & parent income < Rs. 6 LPA", deadline: "2026-12-15", portalUrl: "https://scholarship.odisha.gov.in", active: true },
          { id: "SCHOL-02", name: "Post-Matric ST/SC/OBC", level: "Post-Matric (Class 11 to PG)", awardAmount: "Full Maintenance Allowance + Tuition", eligibility: "ST/SC income <= Rs. 2.5 LPA; OBC income <= Rs. 1.5 LPA", deadline: "2026-12-31", portalUrl: "https://scholarship.odisha.gov.in", active: true },
          { id: "SCHOL-03", name: "Banishree", level: "Special Category (Differently Abled)", awardAmount: "Rs. 2,500 to Rs. 4,000 / Year + Escort Allowance", eligibility: "Students with >= 40% disability & parent income <= Rs. 60,000/yr", deadline: "2026-11-30", portalUrl: "https://scholarship.odisha.gov.in", active: true },
          { id: "SCHOL-04", name: "Nirman Shramik Kalyan", level: "Children of Construction Workers", awardAmount: "Rs. 10,000 - Rs. 40,000 (Trade & Degree)", eligibility: "Children of registered building/other construction workers", deadline: "2027-01-15", portalUrl: "https://scholarship.odisha.gov.in", active: true }
        ]
      }));
    },

    saveScholarshipsConfig(config) {
      if (!config) return false;
      const clean = {
        meta: {
          version: "1.0",
          lastEditedBy: "admin@csodisha.com",
          updatedAt: new Date().toISOString()
        },
        scholarshipSettings: {
          autoSyncStatePortal: Boolean(config.scholarshipSettings?.autoSyncStatePortal),
          notifyUpcomingDeadlines: Boolean(config.scholarshipSettings?.notifyUpcomingDeadlines),
          enableMeritCalculator: Boolean(config.scholarshipSettings?.enableMeritCalculator)
        },
        scholarships: Array.isArray(config.scholarships || config.items) ? (config.scholarships || config.items).map(s => ({
          id: String(s.id || "SCHOL-" + Math.floor(10 + Math.random() * 90)),
          name: String(s.name || "").trim(),
          level: String(s.level || "Higher Education").trim(),
          awardAmount: String(s.awardAmount || "N/A").trim(),
          eligibility: String(s.eligibility || "General").trim(),
          deadline: String(s.deadline || "").trim(),
          portalUrl: String(s.portalUrl || "https://scholarship.odisha.gov.in").trim(),
          active: s.active !== false
        })) : []
      };
      clean.items = clean.scholarships;
      localStorage.setItem("cso_scholarships_config", JSON.stringify(clean));
      this.logAudit("SCHOLARSHIPS_CONFIG_UPDATED", "EDUCATIONAL_RESOURCES", "Scholarships updated (" + clean.scholarships.length + " schemes).");
      return true;
    },

    resetScholarshipsConfig() {
      localStorage.removeItem("cso_scholarships_config");
      this.logAudit("SCHOLARSHIPS_CONFIG_RESET", "SYSTEM_RESET", "Scholarships configuration reset to factory defaults.");
      return this.getScholarshipsConfig();
    },

    exportScholarshipsManifest() {
      const config = this.getScholarshipsConfig();
      const filename = "scholarships_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("SCHOLARSHIPS_MANIFEST_EXPORTED", "DATA_EXPORT", "Scholarships manifest exported (" + filename + ").");
      return filename;
    },

    // -------------------------------------------------------------
    // ENGINE 60.5: Career Explorer Engine (module-05-020)
    // -------------------------------------------------------------
    getCareerExplorerConfig() {
      return this._hydrateConfig("cso_career_explorer_config", "pathways", () => ({
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        explorerSettings: { showSalaryInsights: true, enableRoadmapGraph: true },
        pathways: [
          { id: "CAR-01", title: "OAS/OFS Cadre", stream: "Civil & Administrative Services", minQualification: "Any Bachelor Degree", entryExam: "OPSC OAS Combined Services", typicalSalary: "Rs. 56,100 - Rs. 1,77,500 (Level 12)", demandLevel: "High", active: true },
          { id: "CAR-02", title: "Police Sub-Inspector", stream: "Police & Law Enforcement", minQualification: "Graduate in any discipline", entryExam: "Odisha Police Recruitment Board Exam", typicalSalary: "Rs. 35,400 - Rs. 1,12,400 (Level 9)", demandLevel: "High", active: true },
          { id: "CAR-03", title: "Primary/High School Teacher", stream: "School Education", minQualification: "Graduation + B.Ed with OTET/OSSTET", entryExam: "OSSC Regular Teacher Recruitment", typicalSalary: "Rs. 35,400 (Level 9)", demandLevel: "Moderate", active: true },
          { id: "CAR-04", title: "Revenue Inspector", stream: "Revenue & Land Administration", minQualification: "Bachelor Degree with Computer Skill", entryExam: "OSSSC Combined Recruitment Examination", typicalSalary: "Rs. 35,400 (Level 9)", demandLevel: "High", active: true }
        ],
        careerPaths: [
          { id: "CAR-01", title: "OAS/OFS Cadre", stream: "Civil & Administrative Services", minQualification: "Any Bachelor Degree", entryExam: "OPSC OAS Combined Services", typicalSalary: "Rs. 56,100 - Rs. 1,77,500 (Level 12)", demandLevel: "High", active: true },
          { id: "CAR-02", title: "Police Sub-Inspector", stream: "Police & Law Enforcement", minQualification: "Graduate in any discipline", entryExam: "Odisha Police Recruitment Board Exam", typicalSalary: "Rs. 35,400 - Rs. 1,12,400 (Level 9)", demandLevel: "High", active: true },
          { id: "CAR-03", title: "Primary/High School Teacher", stream: "School Education", minQualification: "Graduation + B.Ed with OTET/OSSTET", entryExam: "OSSC Regular Teacher Recruitment", typicalSalary: "Rs. 35,400 (Level 9)", demandLevel: "Moderate", active: true },
          { id: "CAR-04", title: "Revenue Inspector", stream: "Revenue & Land Administration", minQualification: "Bachelor Degree with Computer Skill", entryExam: "OSSSC Combined Recruitment Examination", typicalSalary: "Rs. 35,400 (Level 9)", demandLevel: "High", active: true }
        ]
      }));
    },

    saveCareerExplorerConfig(config) {
      if (!config) return false;
      const list = Array.isArray(config.pathways || config.careerPaths || config.items) ? (config.pathways || config.careerPaths || config.items) : [];
      const clean = {
        meta: {
          version: "1.0",
          lastEditedBy: "admin@csodisha.com",
          updatedAt: new Date().toISOString()
        },
        explorerSettings: {
          showSalaryInsights: Boolean(config.explorerSettings?.showSalaryInsights),
          enableRoadmapGraph: Boolean(config.explorerSettings?.enableRoadmapGraph)
        },
        pathways: list.map(c => ({
          id: String(c.id || "CAR-" + Math.floor(10 + Math.random() * 90)),
          title: String(c.title || "").trim(),
          stream: String(c.stream || "General").trim(),
          minQualification: String(c.minQualification || "Graduate").trim(),
          entryExam: String(c.entryExam || "State Competitive Exam").trim(),
          typicalSalary: String(c.typicalSalary || "State Pay Matrix").trim(),
          demandLevel: String(c.demandLevel || "Moderate").trim(),
          active: c.active !== false
        }))
      };
      clean.careerPaths = clean.pathways;
      clean.items = clean.pathways;
      localStorage.setItem("cso_career_explorer_config", JSON.stringify(clean));
      this.logAudit("CAREER_EXPLORER_CONFIG_UPDATED", "EDUCATIONAL_RESOURCES", "Career Explorer updated (" + clean.pathways.length + " career paths).");
      return true;
    },

    resetCareerExplorerConfig() {
      localStorage.removeItem("cso_career_explorer_config");
      this.logAudit("CAREER_EXPLORER_CONFIG_RESET", "SYSTEM_RESET", "Career Explorer configuration reset to factory defaults.");
      return this.getCareerExplorerConfig();
    },

    exportCareerExplorerManifest() {
      const config = this.getCareerExplorerConfig();
      const filename = "career_explorer_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("CAREER_EXPLORER_MANIFEST_EXPORTED", "DATA_EXPORT", "Career Explorer manifest exported (" + filename + ").");
      return filename;
    },

    // -------------------------------------------------------------
    // ENGINE 60.6: Student Dashboard Engine (module-05-021)
    // -------------------------------------------------------------
    getStudentDashboardConfig() {
      return this._hydrateConfig("cso_student_dashboard_config", "modules", () => ({
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        dashboardSettings: { enableStudyStreak: true, allowMockLeaderboard: true, enableOdiaLanguageToggle: true },
        modules: [
          { id: "MOD-01", name: "Bookmarked Notes", type: "Personal Study Shelf", targetAudience: "All Registered Students", refreshRateMinutes: 0, active: true },
          { id: "MOD-02", name: "Mock Scorecards", type: "Performance & Percentile Tracker", targetAudience: "OPSC / OSSC Aspirants", refreshRateMinutes: 60, active: true },
          { id: "MOD-03", name: "Revision Tracker", type: "Daily Streak & Topic Checklist", targetAudience: "Active Exam Candidates", refreshRateMinutes: 1440, active: true },
          { id: "MOD-04", name: "District Circles", type: "Peer Discussion & Study Groups", targetAudience: "Odisha 30-Districts Youth", refreshRateMinutes: 30, active: true }
        ],
        widgets: [
          { id: "MOD-01", name: "Bookmarked Notes", type: "Personal Study Shelf", targetAudience: "All Registered Students", refreshRateMinutes: 0, active: true },
          { id: "MOD-02", name: "Mock Scorecards", type: "Performance & Percentile Tracker", targetAudience: "OPSC / OSSC Aspirants", refreshRateMinutes: 60, active: true },
          { id: "MOD-03", name: "Revision Tracker", type: "Daily Streak & Topic Checklist", targetAudience: "Active Exam Candidates", refreshRateMinutes: 1440, active: true },
          { id: "MOD-04", name: "District Circles", type: "Peer Discussion & Study Groups", targetAudience: "Odisha 30-Districts Youth", refreshRateMinutes: 30, active: true }
        ]
      }));
    },

    saveStudentDashboardConfig(config) {
      if (!config) return false;
      const list = Array.isArray(config.modules || config.widgets || config.items) ? (config.modules || config.widgets || config.items) : [];
      const clean = {
        meta: {
          version: "1.0",
          lastEditedBy: "admin@csodisha.com",
          updatedAt: new Date().toISOString()
        },
        dashboardSettings: {
          enableStudyStreak: Boolean(config.dashboardSettings?.enableStudyStreak),
          allowMockLeaderboard: Boolean(config.dashboardSettings?.allowMockLeaderboard),
          enableOdiaLanguageToggle: Boolean(config.dashboardSettings?.enableOdiaLanguageToggle)
        },
        modules: list.map(w => ({
          id: String(w.id || "MOD-" + Math.floor(10 + Math.random() * 90)),
          name: String(w.name || "").trim(),
          type: String(w.type || "Card").trim(),
          targetAudience: String(w.targetAudience || "All Students").trim(),
          refreshRateMinutes: Number(w.refreshRateMinutes || 60),
          active: w.active !== false
        }))
      };
      clean.widgets = clean.modules;
      clean.items = clean.modules;
      localStorage.setItem("cso_student_dashboard_config", JSON.stringify(clean));
      this.logAudit("STUDENT_DASHBOARD_CONFIG_UPDATED", "EDUCATIONAL_RESOURCES", "Student Dashboard configuration updated (" + clean.modules.length + " modules).");
      return true;
    },

    resetStudentDashboardConfig() {
      localStorage.removeItem("cso_student_dashboard_config");
      this.logAudit("STUDENT_DASHBOARD_CONFIG_RESET", "SYSTEM_RESET", "Student Dashboard configuration reset to factory defaults.");
      return this.getStudentDashboardConfig();
    },

    exportStudentDashboardManifest() {
      const config = this.getStudentDashboardConfig();
      const filename = "student_dashboard_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("STUDENT_DASHBOARD_MANIFEST_EXPORTED", "DATA_EXPORT", "Student Dashboard manifest exported (" + filename + ").");
      return filename;
    },

    // -------------------------------------------------------------
    // ENGINE 60.7: Educational Tools Engine (module-05-022)
    // -------------------------------------------------------------
    getEducationalToolsConfig() {
      return this._hydrateConfig("cso_educational_tools_config", "tools", () => ({
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        toolSettings: { enableOfflineCalculators: true, logUsageAnalytics: true },
        tools: [
          { id: "TOOL-01", name: "OPSC/OSSC Age Calculator", category: "Exam Utilities", version: "2.1", embeddedRoute: "/education-explorer/#calc", status: "Live", active: true },
          { id: "TOOL-02", name: "Negative Marking Estimator", category: "Score Analyzers", version: "1.8", embeddedRoute: "/tools/negative-marking", status: "Live", active: true },
          { id: "TOOL-03", name: "CBCS CGPA Converter", category: "Academic Converters", version: "2.0", embeddedRoute: "/tools/grade-converter", status: "Live", active: true },
          { id: "TOOL-04", name: "Virtual OMR Simulator", category: "Exam Simulations", version: "1.4", embeddedRoute: "/tools/omr-simulator", status: "Live", active: true }
        ]
      }));
    },

    saveEducationalToolsConfig(config) {
      if (!config) return false;
      const clean = {
        meta: {
          version: "1.0",
          lastEditedBy: "admin@csodisha.com",
          updatedAt: new Date().toISOString()
        },
        toolSettings: {
          enableOfflineCalculators: Boolean(config.toolSettings?.enableOfflineCalculators),
          logUsageAnalytics: Boolean(config.toolSettings?.logUsageAnalytics)
        },
        tools: Array.isArray(config.tools || config.items) ? (config.tools || config.items).map(t => ({
          id: String(t.id || "TOOL-" + Math.floor(10 + Math.random() * 90)),
          name: String(t.name || "").trim(),
          category: String(t.category || "General Tool").trim(),
          version: String(t.version || "1.0").trim(),
          embeddedRoute: String(t.embeddedRoute || "/tools").trim(),
          status: String(t.status || "Live").trim(),
          active: t.active !== false
        })) : []
      };
      clean.items = clean.tools;
      localStorage.setItem("cso_educational_tools_config", JSON.stringify(clean));
      this.logAudit("EDUCATIONAL_TOOLS_CONFIG_UPDATED", "EDUCATIONAL_RESOURCES", "Educational Tools configuration updated (" + clean.tools.length + " tools).");
      return true;
    },

    resetEducationalToolsConfig() {
      localStorage.removeItem("cso_educational_tools_config");
      this.logAudit("EDUCATIONAL_TOOLS_CONFIG_RESET", "SYSTEM_RESET", "Educational Tools configuration reset to factory defaults.");
      return this.getEducationalToolsConfig();
    },

    exportEducationalToolsManifest() {
      const config = this.getEducationalToolsConfig();
      const filename = "educational_tools_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("EDUCATIONAL_TOOLS_MANIFEST_EXPORTED", "DATA_EXPORT", "Educational Tools manifest exported (" + filename + ").");
      return filename;
    },

    // =========================================================================
    // FOLDER 06 (BATCH 1): Categories & Navigation Engines (06-001 to 06-003)
    // =========================================================================

    // --- MODULE 06-001: Master Categories Engine ---
    getMasterCategoriesConfig() {
      return this._hydrateConfig("cso_master_categories_config", "categories", () => ({
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        categorySettings: { defaultSortOrder: "orderWeight", enableCategoryBadges: true },
        categories: [
          { id: "CAT-01", code: "JOBS", name: "Jobs & Careers", slug: "jobs-careers", icon: "briefcase", color: "#38bdf8", orderWeight: 1, postCount: 417, active: true },
          { id: "CAT-02", code: "SCHEMES", name: "Schemes & Benefits", slug: "schemes-benefits", icon: "award", color: "#34d399", orderWeight: 2, postCount: 1264, active: true },
          { id: "CAT-03", code: "LIBRARY", name: "Study Library", slug: "study-library", icon: "book-open", color: "#818cf8", orderWeight: 3, postCount: 1723, active: true },
          { id: "CAT-04", code: "COMMUNITY", name: "Community & Districts", slug: "community", icon: "users", color: "#f59e0b", orderWeight: 4, postCount: 530, active: true },
          { id: "CAT-05", code: "EDITORIAL", name: "Editorials & Opinions", slug: "editorials", icon: "feather", color: "#ec4899", orderWeight: 5, postCount: 180, active: true }
        ]
      }));
    },

    saveMasterCategoriesConfig(config) {
      if (!config) return false;
      const clean = {
        meta: {
          version: "1.0",
          lastEditedBy: "admin@csodisha.com",
          updatedAt: new Date().toISOString()
        },
        categorySettings: {
          defaultSortOrder: String(config.categorySettings?.defaultSortOrder || "orderWeight"),
          enableCategoryBadges: config.categorySettings?.enableCategoryBadges !== false
        },
        categories: Array.isArray(config.categories || config.items) ? (config.categories || config.items).map((c, i) => ({
          id: String(c.id || "CAT-" + String(i + 1).padStart(2, "0")),
          code: String(c.code || "CAT").trim().toUpperCase(),
          name: String(c.name || "").trim(),
          slug: String(c.slug || "").trim().toLowerCase(),
          icon: String(c.icon || "folder").trim(),
          color: String(c.color || "#38bdf8").trim(),
          orderWeight: parseInt(c.orderWeight, 10) || (i + 1),
          postCount: parseInt(c.postCount, 10) || 0,
          active: c.active !== false
        })) : []
      };
      clean.items = clean.categories;
      localStorage.setItem("cso_master_categories_config", JSON.stringify(clean));
      this.logAudit("MASTER_CATEGORIES_CONFIG_UPDATED", "CATEGORIES_NAVIGATION", "Master categories configuration updated (" + clean.categories.length + " categories).");
      return true;
    },

    resetMasterCategoriesConfig() {
      localStorage.removeItem("cso_master_categories_config");
      this.logAudit("MASTER_CATEGORIES_CONFIG_RESET", "SYSTEM_RESET", "Master categories reset to factory defaults.");
      return this.getMasterCategoriesConfig();
    },

    exportMasterCategoriesManifest() {
      const config = this.getMasterCategoriesConfig();
      const filename = "master_categories_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("MASTER_CATEGORIES_MANIFEST_EXPORTED", "DATA_EXPORT", "Master categories manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 06-002: Subcategories Engine ---
    getSubcategoriesConfig() {
      return this._hydrateConfig("cso_subcategories_config", "subcategories", () => ({
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        subcategorySettings: { allowCrossCategoryNesting: false, showPostCounts: true },
        subcategories: [
          { id: "SUB-01", parentCategoryId: "CAT-01", parentCategoryName: "Jobs & Careers", name: "OPSC Civil Services", slug: "opsc-civil-services", orderWeight: 1, postCount: 142, active: true },
          { id: "SUB-02", parentCategoryId: "CAT-01", parentCategoryName: "Jobs & Careers", name: "OSSC Staff Selection", slug: "ossc-staff-selection", orderWeight: 2, postCount: 198, active: true },
          { id: "SUB-03", parentCategoryId: "CAT-01", parentCategoryName: "Jobs & Careers", name: "OSSSC Combined Cadre", slug: "osssc-combined-cadre", orderWeight: 3, postCount: 77, active: true },
          { id: "SUB-04", parentCategoryId: "CAT-02", parentCategoryName: "Schemes & Benefits", name: "Education & Scholarships", slug: "education-scholarships", orderWeight: 1, postCount: 520, active: true },
          { id: "SUB-05", parentCategoryId: "CAT-02", parentCategoryName: "Schemes & Benefits", name: "Agriculture & Farmers Welfare", slug: "agriculture-farmers", orderWeight: 2, postCount: 410, active: true },
          { id: "SUB-06", parentCategoryId: "CAT-03", parentCategoryName: "Study Library", name: "Previous Year Questions (PYQ)", slug: "pyq-archive", orderWeight: 1, postCount: 890, active: true },
          { id: "SUB-07", parentCategoryId: "CAT-03", parentCategoryName: "Study Library", name: "Syllabus Blueprints", slug: "syllabus-blueprints", orderWeight: 2, postCount: 430, active: true }
        ]
      }));
    },

    saveSubcategoriesConfig(config) {
      if (!config) return false;
      const clean = {
        meta: {
          version: "1.0",
          lastEditedBy: "admin@csodisha.com",
          updatedAt: new Date().toISOString()
        },
        subcategorySettings: {
          allowCrossCategoryNesting: Boolean(config.subcategorySettings?.allowCrossCategoryNesting),
          showPostCounts: config.subcategorySettings?.showPostCounts !== false
        },
        subcategories: Array.isArray(config.subcategories || config.items) ? (config.subcategories || config.items).map((s, i) => ({
          id: String(s.id || "SUB-" + String(i + 1).padStart(2, "0")),
          parentCategoryId: String(s.parentCategoryId || "CAT-01").trim(),
          parentCategoryName: String(s.parentCategoryName || "General").trim(),
          name: String(s.name || "").trim(),
          slug: String(s.slug || "").trim().toLowerCase(),
          orderWeight: parseInt(s.orderWeight, 10) || (i + 1),
          postCount: parseInt(s.postCount, 10) || 0,
          active: s.active !== false
        })) : []
      };
      clean.items = clean.subcategories;
      localStorage.setItem("cso_subcategories_config", JSON.stringify(clean));
      this.logAudit("SUBCATEGORIES_CONFIG_UPDATED", "CATEGORIES_NAVIGATION", "Subcategories configuration updated (" + clean.subcategories.length + " subcategories).");
      return true;
    },

    resetSubcategoriesConfig() {
      localStorage.removeItem("cso_subcategories_config");
      this.logAudit("SUBCATEGORIES_CONFIG_RESET", "SYSTEM_RESET", "Subcategories reset to factory defaults.");
      return this.getSubcategoriesConfig();
    },

    exportSubcategoriesManifest() {
      const config = this.getSubcategoriesConfig();
      const filename = "subcategories_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("SUBCATEGORIES_MANIFEST_EXPORTED", "DATA_EXPORT", "Subcategories manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 06-003: Tags & Taxonomies Engine ---
    getTagsTaxonomiesConfig() {
      return this._hydrateConfig("cso_tags_taxonomies_config", "tags", () => ({
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        tagSettings: { autoSlugify: true, maxTagsPerPost: 10, enableTagCloudWidget: true },
        tags: [
          { id: "TAG-01", name: "OPSC OAS 2026", slug: "opsc-oas-2026", group: "Examinations", usageCount: 248, color: "#38bdf8", active: true },
          { id: "TAG-02", name: "OSSC CGL", slug: "ossc-cgl", group: "Examinations", usageCount: 312, color: "#34d399", active: true },
          { id: "TAG-03", name: "Admit Card Download", slug: "admit-card-download", group: "Alerts", usageCount: 185, color: "#f59e0b", active: true },
          { id: "TAG-04", name: "Negative Marking", slug: "negative-marking", group: "Rules", usageCount: 94, color: "#ef4444", active: true },
          { id: "TAG-05", name: "e-Medhabruti", slug: "e-medhabruti", group: "Scholarships", usageCount: 142, color: "#a855f7", active: true },
          { id: "TAG-06", name: "Odia Vyakaran", slug: "odia-vyakaran", group: "Subjects", usageCount: 420, color: "#ec4899", active: true },
          { id: "TAG-07", name: "District Gazettes", slug: "district-gazettes", group: "Reference", usageCount: 68, color: "#06b6d4", active: true }
        ]
      }));
    },

    saveTagsTaxonomiesConfig(config) {
      if (!config) return false;
      const clean = {
        meta: {
          version: "1.0",
          lastEditedBy: "admin@csodisha.com",
          updatedAt: new Date().toISOString()
        },
        tagSettings: {
          autoSlugify: config.tagSettings?.autoSlugify !== false,
          maxTagsPerPost: parseInt(config.tagSettings?.maxTagsPerPost, 10) || 10,
          enableTagCloudWidget: config.tagSettings?.enableTagCloudWidget !== false
        },
        tags: Array.isArray(config.tags || config.items) ? (config.tags || config.items).map((t, i) => ({
          id: String(t.id || "TAG-" + String(i + 1).padStart(2, "0")),
          name: String(t.name || "").trim(),
          slug: String(t.slug || "").trim().toLowerCase(),
          group: String(t.group || "General").trim(),
          usageCount: parseInt(t.usageCount, 10) || 0,
          color: String(t.color || "#38bdf8").trim(),
          active: t.active !== false
        })) : []
      };
      clean.items = clean.tags;
      localStorage.setItem("cso_tags_taxonomies_config", JSON.stringify(clean));
      this.logAudit("TAGS_TAXONOMIES_CONFIG_UPDATED", "CATEGORIES_NAVIGATION", "Tags & taxonomies configuration updated (" + clean.tags.length + " tags).");
      return true;
    },

    resetTagsTaxonomiesConfig() {
      localStorage.removeItem("cso_tags_taxonomies_config");
      this.logAudit("TAGS_TAXONOMIES_CONFIG_RESET", "SYSTEM_RESET", "Tags & taxonomies reset to factory defaults.");
      return this.getTagsTaxonomiesConfig();
    },

    exportTagsTaxonomiesManifest() {
      const config = this.getTagsTaxonomiesConfig();
      const filename = "tags_taxonomies_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("TAGS_TAXONOMIES_MANIFEST_EXPORTED", "DATA_EXPORT", "Tags & taxonomies manifest exported (" + filename + ").");
      return filename;
    },

    // =========================================================================
    // FOLDER 06 (BATCH 2): Navigation Structures (06-004 to 06-007)
    // =========================================================================

    // --- MODULE 06-004: Header Navigation Engine ---
    getHeaderNavigationConfig() {
      return this._hydrateConfig("cso_header_navigation_config", "navItems", () => ({
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        navbarSettings: { sticky: true, showSearchTrigger: true, enableMobileDrawer: true },
        navItems: [
          { id: "NAV-01", label: "Jobs & Careers", path: "/jobs-careers/?section=0", target: "_self", orderWeight: 1, showOnMobile: true, badge: "Updates", active: true },
          { id: "NAV-02", label: "Schemes & Benefits", path: "/schemes-benefits/?section=0", target: "_self", orderWeight: 2, showOnMobile: true, badge: "", active: true },
          { id: "NAV-03", label: "Study Library", path: "/study-library/?section=0", target: "_self", orderWeight: 3, showOnMobile: true, badge: "PYQ", active: true },
          { id: "NAV-04", label: "Community", path: "/community/?section=0", target: "_self", orderWeight: 4, showOnMobile: true, badge: "", active: true },
          { id: "NAV-05", label: "Tools", path: "/tools/", target: "_self", orderWeight: 5, showOnMobile: false, badge: "Free", active: true }
        ]
      }));
    },

    saveHeaderNavigationConfig(config) {
      if (!config) return false;
      const clean = {
        meta: {
          version: "1.0",
          lastEditedBy: "admin@csodisha.com",
          updatedAt: new Date().toISOString()
        },
        navbarSettings: {
          sticky: config.navbarSettings?.sticky !== false,
          showSearchTrigger: config.navbarSettings?.showSearchTrigger !== false,
          enableMobileDrawer: config.navbarSettings?.enableMobileDrawer !== false
        },
        navItems: Array.isArray(config.navItems || config.items) ? (config.navItems || config.items).map((item, i) => ({
          id: String(item.id || "NAV-" + String(i + 1).padStart(2, "0")),
          label: String(item.label || "").trim(),
          path: String(item.path || "/").trim(),
          target: String(item.target || "_self").trim(),
          orderWeight: parseInt(item.orderWeight, 10) || (i + 1),
          showOnMobile: item.showOnMobile !== false,
          badge: String(item.badge || "").trim(),
          active: item.active !== false
        })) : []
      };
      clean.items = clean.navItems;
      localStorage.setItem("cso_header_navigation_config", JSON.stringify(clean));
      this.logAudit("HEADER_NAV_CONFIG_UPDATED", "CATEGORIES_NAVIGATION", "Header navigation configuration updated (" + clean.navItems.length + " links).");
      return true;
    },

    resetHeaderNavigationConfig() {
      localStorage.removeItem("cso_header_navigation_config");
      this.logAudit("HEADER_NAV_CONFIG_RESET", "SYSTEM_RESET", "Header navigation reset to factory defaults.");
      return this.getHeaderNavigationConfig();
    },

    exportHeaderNavigationManifest() {
      const config = this.getHeaderNavigationConfig();
      const filename = "header_navigation_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("HEADER_NAV_MANIFEST_EXPORTED", "DATA_EXPORT", "Header navigation manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 06-005: Mega Menu Engine ---
    getMegaMenuConfig() {
      return this._hydrateConfig("cso_mega_menu_config", "panels", () => ({
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        megaMenuSettings: { animation: "fade", showFeaturedCard: true, columnCount: 3 },
        panels: [
          {
            id: "MEGA-01",
            triggerLabel: "Jobs & Recruitment",
            triggerPath: "/jobs-careers/",
            orderWeight: 1,
            featuredBadge: "Live Portals",
            columns: [
              { title: "State Recruitment", links: [{ label: "OPSC OAS & OPS", url: "/jobs-careers/#opsc" }, { label: "OSSC CGL & CTSRE", url: "/jobs-careers/#ossc" }, { label: "OSSSC Combined Amin/RI", url: "/jobs-careers/#osssc" }] },
              { title: "Admit & Hall Tickets", links: [{ label: "Preliminary Cards", url: "/jobs-careers/#admit" }, { label: "Written Exam Venues", url: "/jobs-careers/#venues" }] },
              { title: "Notifications", links: [{ label: "Gazette Corrigendums", url: "/jobs-careers/#notices" }, { label: "Cutoff Archives", url: "/jobs-careers/#cutoff" }] }
            ],
            active: true
          },
          {
            id: "MEGA-02",
            triggerLabel: "Academic Library",
            triggerPath: "/study-library/",
            orderWeight: 2,
            featuredBadge: "Free PDFs",
            columns: [
              { title: "Exam Papers", links: [{ label: "OPSC OAS Prelims (2015-2025)", url: "/study-library/#pyq-oas" }, { label: "OSSC CGL Tier-I & II", url: "/study-library/#pyq-cgl" }] },
              { title: "Bilingual Notes", links: [{ label: "Odisha History & Heritage", url: "/study-library/#hist" }, { label: "Odia Vyakaran Compendium", url: "/study-library/#odia" }] },
              { title: "Mock Series", links: [{ label: "Full Length Mock 1 (OMR)", url: "/study-library/#mock" }, { label: "Daily Speed Drills", url: "/study-library/#quiz" }] }
            ],
            active: true
          },
          {
            id: "MEGA-03",
            triggerLabel: "Schemes & Citizen Support",
            triggerPath: "/schemes-benefits/",
            orderWeight: 3,
            featuredBadge: "Direct Welfare",
            columns: [
              { title: "Student Welfare", links: [{ label: "e-Medhabruti Portal", url: "/schemes-benefits/#medha" }, { label: "Post-Matric ST/SC Support", url: "/schemes-benefits/#postmatric" }] },
              { title: "Livelihood & Agriculture", links: [{ label: "KALIA Chhatra Bruti", url: "/schemes-benefits/#kalia" }, { label: "Skill Odisha Initiatives", url: "/schemes-benefits/#osda" }] },
              { title: "Eligibility Checkers", links: [{ label: "Direct Subsidy Calculator", url: "/schemes-benefits/#checker" }] }
            ],
            active: true
          }
        ]
      }));
    },

    saveMegaMenuConfig(config) {
      if (!config) return false;
      const clean = {
        meta: {
          version: "1.0",
          lastEditedBy: "admin@csodisha.com",
          updatedAt: new Date().toISOString()
        },
        megaMenuSettings: {
          animation: String(config.megaMenuSettings?.animation || "fade").trim(),
          showFeaturedCard: config.megaMenuSettings?.showFeaturedCard !== false,
          columnCount: parseInt(config.megaMenuSettings?.columnCount, 10) || 3
        },
        panels: Array.isArray(config.panels || config.items) ? (config.panels || config.items).map((p, i) => ({
          id: String(p.id || "MEGA-" + String(i + 1).padStart(2, "0")),
          triggerLabel: String(p.triggerLabel || "").trim(),
          triggerPath: String(p.triggerPath || "/").trim(),
          orderWeight: parseInt(p.orderWeight, 10) || (i + 1),
          featuredBadge: String(p.featuredBadge || "").trim(),
          columns: Array.isArray(p.columns) ? p.columns : [],
          active: p.active !== false
        })) : []
      };
      clean.items = clean.panels;
      localStorage.setItem("cso_mega_menu_config", JSON.stringify(clean));
      this.logAudit("MEGA_MENU_CONFIG_UPDATED", "CATEGORIES_NAVIGATION", "Mega menu panels updated (" + clean.panels.length + " panels).");
      return true;
    },

    resetMegaMenuConfig() {
      localStorage.removeItem("cso_mega_menu_config");
      this.logAudit("MEGA_MENU_CONFIG_RESET", "SYSTEM_RESET", "Mega menu panels reset to factory defaults.");
      return this.getMegaMenuConfig();
    },

    exportMegaMenuManifest() {
      const config = this.getMegaMenuConfig();
      const filename = "mega_menu_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("MEGA_MENU_MANIFEST_EXPORTED", "DATA_EXPORT", "Mega menu manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 06-006: Footer Navigation Engine ---
    getFooterNavigationConfig() {
      return this._hydrateConfig("cso_footer_navigation_config", "sections", () => ({
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        footerSettings: { copyrightNotice: "© 2026 Common Sense Odisha (csodisha.com). Official Public Utility & Resource Directory.", showDisclaimerBadge: true },
        sections: [
          {
            id: "FOOT-01",
            title: "Examinations & Portals",
            orderWeight: 1,
            links: [
              { label: "OPSC Official Portal", url: "https://opsc.gov.in", external: true },
              { label: "OSSC Staff Portal", url: "https://ossc.gov.in", external: true },
              { label: "OSSSC Combined Board", url: "https://osssc.gov.in", external: true },
              { label: "BSE Odisha Board", url: "http://bseodisha.ac.in", external: true }
            ],
            active: true
          },
          {
            id: "FOOT-02",
            title: "Educational Resources",
            orderWeight: 2,
            links: [
              { label: "Previous Year Questions", url: "/study-library/?section=0" },
              { label: "Gazette Syllabus Blueprints", url: "/study-library/?section=1" },
              { label: "Model Answer Keys", url: "/study-library/?section=2" },
              { label: "Age & Cutoff Calculator", url: "/tools/" }
            ],
            active: true
          },
          {
            id: "FOOT-03",
            title: "Governance & Policies",
            orderWeight: 3,
            links: [
              { label: "About Us & Mission", url: "/about" },
              { label: "Editorial Integrity", url: "/editorial" },
              { label: "Privacy Policy", url: "/privacy" },
              { label: "Terms of Service", url: "/terms" },
              { label: "Grievance Contact Desk", url: "/contact" }
            ],
            active: true
          }
        ]
      }));
    },

    saveFooterNavigationConfig(config) {
      if (!config) return false;
      const clean = {
        meta: {
          version: "1.0",
          lastEditedBy: "admin@csodisha.com",
          updatedAt: new Date().toISOString()
        },
        footerSettings: {
          copyrightNotice: String(config.footerSettings?.copyrightNotice || "").trim(),
          showDisclaimerBadge: config.footerSettings?.showDisclaimerBadge !== false
        },
        sections: Array.isArray(config.sections || config.items) ? (config.sections || config.items).map((sec, i) => ({
          id: String(sec.id || "FOOT-" + String(i + 1).padStart(2, "0")),
          title: String(sec.title || "").trim(),
          orderWeight: parseInt(sec.orderWeight, 10) || (i + 1),
          links: Array.isArray(sec.links) ? sec.links : [],
          active: sec.active !== false
        })) : []
      };
      clean.items = clean.sections;
      localStorage.setItem("cso_footer_navigation_config", JSON.stringify(clean));
      this.logAudit("FOOTER_NAV_CONFIG_UPDATED", "CATEGORIES_NAVIGATION", "Footer navigation configuration updated (" + clean.sections.length + " columns).");
      return true;
    },

    resetFooterNavigationConfig() {
      localStorage.removeItem("cso_footer_navigation_config");
      this.logAudit("FOOTER_NAV_CONFIG_RESET", "SYSTEM_RESET", "Footer navigation reset to factory defaults.");
      return this.getFooterNavigationConfig();
    },

    exportFooterNavigationManifest() {
      const config = this.getFooterNavigationConfig();
      const filename = "footer_navigation_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("FOOTER_NAV_MANIFEST_EXPORTED", "DATA_EXPORT", "Footer navigation manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 06-007: Sidebar Menus Engine ---
    getSidebarMenusConfig() {
      return this._hydrateConfig("cso_sidebar_menus_config", "menus", () => ({
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        sidebarSettings: { collapsibleAccordions: true, rememberExpandedState: true },
        menus: [
          {
            id: "SIDE-01",
            groupKey: "JOBS_SIDEBAR",
            title: "Recruitment Portals",
            orderWeight: 1,
            items: [
              { label: "OPSC Notifications", url: "/jobs-careers/?filter=opsc", icon: "file-text" },
              { label: "OSSC Examination Dates", url: "/jobs-careers/?filter=ossc", icon: "calendar" },
              { label: "OSSSC Combined Postings", url: "/jobs-careers/?filter=osssc", icon: "briefcase" }
            ],
            active: true
          },
          {
            id: "SIDE-02",
            groupKey: "STUDY_SIDEBAR",
            title: "Study Vault Channels",
            orderWeight: 2,
            items: [
              { label: "Question Papers (2020-26)", url: "/study-library/?cat=pyq", icon: "book-open" },
              { label: "Full Length Mock Series", url: "/study-library/?cat=mock", icon: "award" },
              { label: "Odia Vyakaran Drills", url: "/study-library/?cat=odia", icon: "feather" }
            ],
            active: true
          },
          {
            id: "SIDE-03",
            groupKey: "DISTRICTS_SIDEBAR",
            title: "30 Districts of Odisha",
            orderWeight: 3,
            items: [
              { label: "Coastal Odisha (Khordha/Cuttack/Puri)", url: "/community/?region=coastal", icon: "map-pin" },
              { label: "Western Odisha (Sambalpur/Bargarh)", url: "/community/?region=western", icon: "map-pin" },
              { label: "Southern & Northern Cadres", url: "/community/?region=north-south", icon: "map-pin" }
            ],
            active: true
          }
        ]
      }));
    },

    saveSidebarMenusConfig(config) {
      if (!config) return false;
      const clean = {
        meta: {
          version: "1.0",
          lastEditedBy: "admin@csodisha.com",
          updatedAt: new Date().toISOString()
        },
        sidebarSettings: {
          collapsibleAccordions: config.sidebarSettings?.collapsibleAccordions !== false,
          rememberExpandedState: config.sidebarSettings?.rememberExpandedState !== false
        },
        menus: Array.isArray(config.menus || config.items) ? (config.menus || config.items).map((m, i) => ({
          id: String(m.id || "SIDE-" + String(i + 1).padStart(2, "0")),
          groupKey: String(m.groupKey || "SIDEBAR").trim().toUpperCase(),
          title: String(m.title || "").trim(),
          orderWeight: parseInt(m.orderWeight, 10) || (i + 1),
          items: Array.isArray(m.items) ? m.items : [],
          active: m.active !== false
        })) : []
      };
      clean.items = clean.menus;
      localStorage.setItem("cso_sidebar_menus_config", JSON.stringify(clean));
      this.logAudit("SIDEBAR_MENUS_CONFIG_UPDATED", "CATEGORIES_NAVIGATION", "Sidebar menus configuration updated (" + clean.menus.length + " groups).");
      return true;
    },

    resetSidebarMenusConfig() {
      localStorage.removeItem("cso_sidebar_menus_config");
      this.logAudit("SIDEBAR_MENUS_CONFIG_RESET", "SYSTEM_RESET", "Sidebar menus reset to factory defaults.");
      return this.getSidebarMenusConfig();
    },

    exportSidebarMenusManifest() {
      const config = this.getSidebarMenusConfig();
      const filename = "sidebar_menus_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("SIDEBAR_MENUS_MANIFEST_EXPORTED", "DATA_EXPORT", "Sidebar menus manifest exported (" + filename + ").");
      return filename;
    },

    // =========================================================================
    // FOLDER 06 (BATCH 3): Advanced Navigation (06-008 to 06-011)
    // =========================================================================

    // --- MODULE 06-008: Breadcrumbs Engine ---
    getBreadcrumbsConfig() {
      return this._hydrateConfig("cso_breadcrumbs_config", "rules", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { enableSchemaOrg: true, delimiter: "/", homeLabel: "Home", showCurrentPage: true },
        rules: [
          { id: "BC-01", pageType: "Job Details", pattern: "Home > Jobs & Careers > [Commission] > [Exam Title]", format: "JSON-LD Microdata", active: true },
          { id: "BC-02", pageType: "Study Material", pattern: "Home > Study Library > [Subject] > [Topic]", format: "JSON-LD Microdata", active: true },
          { id: "BC-03", pageType: "Scheme Directory", pattern: "Home > Schemes > [Department] > [Scheme Name]", format: "JSON-LD Microdata", active: true },
          { id: "BC-04", pageType: "Community District", pattern: "Home > Community > Odisha 30 Districts > [District]", format: "JSON-LD Microdata", active: true }
        ]
      }));
    },

    saveBreadcrumbsConfig(config) {
      if (!config) return false;
      const clean = {
        meta: {
          version: "1.0",
          lastEditedBy: "admin@csodisha.com",
          updatedAt: new Date().toISOString()
        },
        settings: {
          enableSchemaOrg: config.settings?.enableSchemaOrg !== false,
          delimiter: String(config.settings?.delimiter || "/").trim(),
          homeLabel: String(config.settings?.homeLabel || "Home").trim(),
          showCurrentPage: config.settings?.showCurrentPage !== false
        },
        rules: Array.isArray(config.rules || config.items) ? (config.rules || config.items).map((item, i) => ({
          id: String(item.id || "BC-" + String(i + 1).padStart(2, "0")),
          pageType: String(item.pageType || "").trim(),
          pattern: String(item.pattern || "").trim(),
          format: String(item.format || "JSON-LD Microdata").trim(),
          active: item.active !== false
        })) : []
      };
      clean.items = clean.rules;
      localStorage.setItem("cso_breadcrumbs_config", JSON.stringify(clean));
      this.logAudit("BREADCRUMBS_CONFIG_UPDATED", "CATEGORIES_NAVIGATION", "Breadcrumbs configuration updated (" + clean.rules.length + " rules).");
      return true;
    },

    resetBreadcrumbsConfig() {
      localStorage.removeItem("cso_breadcrumbs_config");
      this.logAudit("BREADCRUMBS_CONFIG_RESET", "SYSTEM_RESET", "Breadcrumbs reset to factory defaults.");
      return this.getBreadcrumbsConfig();
    },

    exportBreadcrumbsManifest() {
      const config = this.getBreadcrumbsConfig();
      const filename = "breadcrumbs_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("BREADCRUMBS_MANIFEST_EXPORTED", "DATA_EXPORT", "Breadcrumbs manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 06-009: Internal Links Engine ---
    getInternalLinksConfig() {
      return this._hydrateConfig("cso_internal_links_config", "links", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { maxLinksPerArticle: 4, openInNewTab: false, caseSensitive: false },
        links: [
          { id: "IL-01", keyword: "OAS 2026", targetUrl: "/jobs-careers/?filter=oas", priority: 1, matchCount: 842, active: true },
          { id: "IL-02", keyword: "Odisha GK", targetUrl: "/study-library/?topic=odisha-gk", priority: 2, matchCount: 1420, active: true },
          { id: "IL-03", keyword: "Medhabruti", targetUrl: "/schemes-benefits/?scheme=medhabruti", priority: 3, matchCount: 310, active: true },
          { id: "IL-04", keyword: "PYQ Papers", targetUrl: "/study-library/?filter=pyq", priority: 4, matchCount: 975, active: true }
        ]
      }));
    },

    saveInternalLinksConfig(config) {
      if (!config) return false;
      const clean = {
        meta: {
          version: "1.0",
          lastEditedBy: "admin@csodisha.com",
          updatedAt: new Date().toISOString()
        },
        settings: {
          maxLinksPerArticle: parseInt(config.settings?.maxLinksPerArticle, 10) || 4,
          openInNewTab: !!config.settings?.openInNewTab,
          caseSensitive: !!config.settings?.caseSensitive
        },
        links: Array.isArray(config.links || config.items) ? (config.links || config.items).map((item, i) => ({
          id: String(item.id || "IL-" + String(i + 1).padStart(2, "0")),
          keyword: String(item.keyword || "").trim(),
          targetUrl: String(item.targetUrl || "/").trim(),
          priority: parseInt(item.priority, 10) || (i + 1),
          matchCount: parseInt(item.matchCount, 10) || 0,
          active: item.active !== false
        })) : []
      };
      clean.items = clean.links;
      localStorage.setItem("cso_internal_links_config", JSON.stringify(clean));
      this.logAudit("INTERNAL_LINKS_CONFIG_UPDATED", "CATEGORIES_NAVIGATION", "Internal links configuration updated (" + clean.links.length + " links).");
      return true;
    },

    resetInternalLinksConfig() {
      localStorage.removeItem("cso_internal_links_config");
      this.logAudit("INTERNAL_LINKS_CONFIG_RESET", "SYSTEM_RESET", "Internal links reset to factory defaults.");
      return this.getInternalLinksConfig();
    },

    exportInternalLinksManifest() {
      const config = this.getInternalLinksConfig();
      const filename = "internal_links_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("INTERNAL_LINKS_MANIFEST_EXPORTED", "DATA_EXPORT", "Internal links manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 06-010: Menu Ordering Engine ---
    getMenuOrderingConfig() {
      return this._hydrateConfig("cso_menu_ordering_config", "orders", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { enforceStrictNumericWeight: true, autoRebalanceGaps: true },
        orders: [
          { id: "MO-01", menuName: "Jobs & Careers", location: "Header Nav", weight: 10, visibility: "Public", active: true },
          { id: "MO-02", menuName: "Schemes & Benefits", location: "Header Nav", weight: 20, visibility: "Public", active: true },
          { id: "MO-03", menuName: "Study Library", location: "Header Nav", weight: 30, visibility: "Public", active: true },
          { id: "MO-04", menuName: "Community", location: "Header Nav", weight: 40, visibility: "Public", active: true },
          { id: "MO-05", menuName: "Aspirant Tools", location: "Header Nav", weight: 50, visibility: "Public", active: true }
        ]
      }));
    },

    saveMenuOrderingConfig(config) {
      if (!config) return false;
      const clean = {
        meta: {
          version: "1.0",
          lastEditedBy: "admin@csodisha.com",
          updatedAt: new Date().toISOString()
        },
        settings: {
          enforceStrictNumericWeight: config.settings?.enforceStrictNumericWeight !== false,
          autoRebalanceGaps: config.settings?.autoRebalanceGaps !== false
        },
        orders: Array.isArray(config.orders || config.items) ? (config.orders || config.items).map((item, i) => ({
          id: String(item.id || "MO-" + String(i + 1).padStart(2, "0")),
          menuName: String(item.menuName || "").trim(),
          location: String(item.location || "Header Nav").trim(),
          weight: parseInt(item.weight, 10) || ((i + 1) * 10),
          visibility: String(item.visibility || "Public").trim(),
          active: item.active !== false
        })) : []
      };
      clean.items = clean.orders;
      localStorage.setItem("cso_menu_ordering_config", JSON.stringify(clean));
      this.logAudit("MENU_ORDERING_CONFIG_UPDATED", "CATEGORIES_NAVIGATION", "Menu ordering configuration updated (" + clean.orders.length + " entries).");
      return true;
    },

    resetMenuOrderingConfig() {
      localStorage.removeItem("cso_menu_ordering_config");
      this.logAudit("MENU_ORDERING_CONFIG_RESET", "SYSTEM_RESET", "Menu ordering reset to factory defaults.");
      return this.getMenuOrderingConfig();
    },

    exportMenuOrderingManifest() {
      const config = this.getMenuOrderingConfig();
      const filename = "menu_ordering_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("MENU_ORDERING_MANIFEST_EXPORTED", "DATA_EXPORT", "Menu ordering manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 06-011: Social Links Engine ---
    getSocialLinksConfig() {
      return this._hydrateConfig("cso_social_links_config", "links", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { trackClickAnalytics: true, openInNewTab: true },
        links: [
          { id: "SOC-01", platform: "Telegram", handle: "@CSOdisha_Official", url: "https://t.me/csodisha", followersCount: "48,200", badgeColor: "#0088cc", orderWeight: 1, active: true },
          { id: "SOC-02", platform: "WhatsApp Alerts", handle: "CS Odisha Aspirants Channel", url: "https://whatsapp.com/channel/csodisha", followersCount: "32,500", badgeColor: "#25d366", orderWeight: 2, active: true },
          { id: "SOC-03", platform: "YouTube", handle: "Common Sense Odisha", url: "https://youtube.com/@csodisha", followersCount: "18,400", badgeColor: "#ff0000", orderWeight: 3, active: true },
          { id: "SOC-04", platform: "Twitter / X", handle: "@CSOdisha", url: "https://x.com/csodisha", followersCount: "8,900", badgeColor: "#1da1f2", orderWeight: 4, active: true }
        ]
      }));
    },

    saveSocialLinksConfig(config) {
      if (!config) return false;
      const clean = {
        meta: {
          version: "1.0",
          lastEditedBy: "admin@csodisha.com",
          updatedAt: new Date().toISOString()
        },
        settings: {
          trackClickAnalytics: config.settings?.trackClickAnalytics !== false,
          openInNewTab: config.settings?.openInNewTab !== false
        },
        links: Array.isArray(config.links || config.items) ? (config.links || config.items).map((item, i) => ({
          id: String(item.id || "SOC-" + String(i + 1).padStart(2, "0")),
          platform: String(item.platform || "").trim(),
          handle: String(item.handle || "").trim(),
          url: String(item.url || "#").trim(),
          followersCount: String(item.followersCount || "0").trim(),
          badgeColor: String(item.badgeColor || "#0284c7").trim(),
          orderWeight: parseInt(item.orderWeight, 10) || (i + 1),
          active: item.active !== false
        })) : []
      };
      clean.items = clean.links;
      localStorage.setItem("cso_social_links_config", JSON.stringify(clean));
      this.logAudit("SOCIAL_LINKS_CONFIG_UPDATED", "CATEGORIES_NAVIGATION", "Social links configuration updated (" + clean.links.length + " links).");
      return true;
    },

    resetSocialLinksConfig() {
      localStorage.removeItem("cso_social_links_config");
      this.logAudit("SOCIAL_LINKS_CONFIG_RESET", "SYSTEM_RESET", "Social links reset to factory defaults.");
      return this.getSocialLinksConfig();
    },

    exportSocialLinksManifest() {
      const config = this.getSocialLinksConfig();
      const filename = "social_links_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("SOCIAL_LINKS_MANIFEST_EXPORTED", "DATA_EXPORT", "Social links manifest exported (" + filename + ").");
      return filename;
    },

    // =========================================================================
    // FOLDER 07: Files, Media & Cloud (07-001 to 07-015)
    // =========================================================================

    // --- MODULE 07-001: File Library Engine ---
    getFileLibraryConfig() {
      return this._hydrateConfig("cso_file_library_config", "files", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { defaultView: "grid", maxUploadSizeBytes: 52428800, allowedExtensions: ["pdf", "svg", "png", "jpg", "webp", "zip", "mp3", "mp4"] },
        files: [
          { id: "FILE-01", name: "OPSC 2026 OAS Notification PDF", filename: "opsc-oas-2026-gazette-advt.pdf", mimeType: "application/pdf", size: "2.4 MB", sizeBytes: 2516582, folder: "/syllabi/", storageProvider: "Cloudflare R2 Primary Bucket", downloadUrl: "https://r2.csodisha.com/syllabi/opsc-oas-2026-gazette-advt.pdf", uploadedAt: "2026-11-01T10:15:00Z", active: true },
          { id: "FILE-02", name: "OTET Scoring Key 2026", filename: "otet-official-provisional-answer-key-2026.pdf", mimeType: "application/pdf", size: "840 KB", sizeBytes: 860160, folder: "/notifications/2026/", storageProvider: "Cloudflare R2 Primary Bucket", downloadUrl: "https://r2.csodisha.com/notifications/otet-answer-key-2026.pdf", uploadedAt: "2026-11-03T14:30:00Z", active: true },
          { id: "FILE-03", name: "Odisha District Map SVG", filename: "odisha-30-districts-vector-contour.svg", mimeType: "image/svg+xml", size: "450 KB", sizeBytes: 460800, folder: "/banners/editorial/", storageProvider: "Asset CDN Edge", downloadUrl: "https://cdn.csodisha.com/maps/odisha-30-districts.svg", uploadedAt: "2026-10-25T08:00:00Z", active: true },
          { id: "FILE-04", name: "Constitution Summary Notes", filename: "polity-constitution-high-court-capsule.pdf", mimeType: "application/pdf", size: "3.2 MB", sizeBytes: 3355443, folder: "/pyq-archives/", storageProvider: "Cloudflare R2 Primary Bucket", downloadUrl: "https://r2.csodisha.com/pyq/polity-constitution-notes.pdf", uploadedAt: "2026-11-05T12:00:00Z", active: true }
        ]
      }));
    },

    saveFileLibraryConfig(config) {
      if (!config) return false;
      const clean = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        settings: {
          defaultView: config.settings?.defaultView || "grid",
          maxUploadSizeBytes: parseInt(config.settings?.maxUploadSizeBytes, 10) || 52428800,
          allowedExtensions: Array.isArray(config.settings?.allowedExtensions) ? config.settings.allowedExtensions : ["pdf", "svg", "png", "jpg", "webp", "zip", "mp3", "mp4"]
        },
        files: Array.isArray(config.files || config.items) ? (config.files || config.items).map((item, i) => ({
          id: String(item.id || "FILE-" + String(i + 1).padStart(2, "0")),
          name: String(item.name || "").trim(),
          filename: String(item.filename || item.name || "").trim(),
          mimeType: String(item.mimeType || "application/octet-stream").trim(),
          size: String(item.size || "1.0 MB").trim(),
          sizeBytes: parseInt(item.sizeBytes, 10) || 1048576,
          folder: String(item.folder || "/syllabi/").trim(),
          storageProvider: String(item.storageProvider || "Cloudflare R2 Primary Bucket").trim(),
          downloadUrl: String(item.downloadUrl || "#").trim(),
          uploadedAt: item.uploadedAt || new Date().toISOString(),
          active: item.active !== false
        })) : []
      };
      clean.items = clean.files;
      localStorage.setItem("cso_file_library_config", JSON.stringify(clean));
      this.logAudit("FILE_LIBRARY_CONFIG_UPDATED", "FILES_MEDIA", "File library updated (" + clean.files.length + " files).");
      return true;
    },

    resetFileLibraryConfig() {
      localStorage.removeItem("cso_file_library_config");
      this.logAudit("FILE_LIBRARY_CONFIG_RESET", "SYSTEM_RESET", "File library reset to factory defaults.");
      return this.getFileLibraryConfig();
    },

    exportFileLibraryManifest() {
      const config = this.getFileLibraryConfig();
      const filename = "file_library_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("FILE_LIBRARY_MANIFEST_EXPORTED", "DATA_EXPORT", "File library manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 07-002: Bulk Uploads Engine ---
    getBulkUploadsConfig() {
      return this._hydrateConfig("cso_bulk_uploads_config", "batches", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { maxConcurrentUploads: 4, autoExtractZip: true, notifyOnComplete: true },
        batches: [
          { id: "BATCH-104", name: "OPSC Gazette Archive", totalFiles: 18, totalSize: "42.8 MB", status: "Completed", progressPercent: 100, destinationFolder: "/syllabi/", createdAt: "2026-11-04T09:12:00Z", completedAt: "2026-11-04T09:15:30Z", active: true },
          { id: "BATCH-105", name: "District Schemes", totalFiles: 12, totalSize: "28.4 MB", status: "Processing", progressPercent: 65, destinationFolder: "/notifications/2026/", createdAt: "2026-11-09T17:40:00Z", completedAt: null, active: true },
          { id: "BATCH-106", name: "Model Papers", totalFiles: 25, totalSize: "68.2 MB", status: "Queued", progressPercent: 0, destinationFolder: "/pyq-archives/", createdAt: "2026-11-09T18:10:00Z", completedAt: null, active: true }
        ]
      }));
    },

    saveBulkUploadsConfig(config) {
      if (!config) return false;
      const clean = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        settings: {
          maxConcurrentUploads: parseInt(config.settings?.maxConcurrentUploads, 10) || 4,
          autoExtractZip: config.settings?.autoExtractZip !== false,
          notifyOnComplete: config.settings?.notifyOnComplete !== false
        },
        batches: Array.isArray(config.batches || config.items) ? (config.batches || config.items).map((item, i) => ({
          id: String(item.id || "BATCH-" + String(i + 101)),
          name: String(item.name || "").trim(),
          totalFiles: parseInt(item.totalFiles, 10) || 0,
          totalSize: String(item.totalSize || "0 MB").trim(),
          status: String(item.status || "Queued").trim(),
          progressPercent: parseInt(item.progressPercent, 10) || 0,
          destinationFolder: String(item.destinationFolder || "/syllabi/").trim(),
          createdAt: item.createdAt || new Date().toISOString(),
          completedAt: item.completedAt || null,
          active: item.active !== false
        })) : []
      };
      clean.items = clean.batches;
      localStorage.setItem("cso_bulk_uploads_config", JSON.stringify(clean));
      this.logAudit("BULK_UPLOADS_CONFIG_UPDATED", "FILES_MEDIA", "Bulk uploads updated (" + clean.batches.length + " batches).");
      return true;
    },

    resetBulkUploadsConfig() {
      localStorage.removeItem("cso_bulk_uploads_config");
      this.logAudit("BULK_UPLOADS_CONFIG_RESET", "SYSTEM_RESET", "Bulk uploads reset to factory defaults.");
      return this.getBulkUploadsConfig();
    },

    exportBulkUploadsManifest() {
      const config = this.getBulkUploadsConfig();
      const filename = "bulk_uploads_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("BULK_UPLOADS_MANIFEST_EXPORTED", "DATA_EXPORT", "Bulk uploads manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 07-003: Folders & Collections Engine ---
    getFoldersCollectionsConfig() {
      return this._hydrateConfig("cso_folders_collections_config", "folders", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { rootDirectory: "/", enableSubfolders: true, defaultSort: "name_asc" },
        folders: [
          { id: "DIR-01", path: "/syllabi/", label: "Syllabi & Gazettes", folderType: "Root", itemCount: 42, sizeUsage: "124 MB", icon: "folder", active: true },
          { id: "DIR-02", path: "/pyq-archives/", label: "PYQ Archives", folderType: "Root", itemCount: 88, sizeUsage: "386 MB", icon: "archive", active: true },
          { id: "DIR-03", path: "/notifications/2026/", label: "2026 Recruitment Notices", folderType: "Child", itemCount: 34, sizeUsage: "78 MB", icon: "bell", active: true },
          { id: "DIR-04", path: "/banners/editorial/", label: "Editorial & Web Media", folderType: "Media", itemCount: 64, sizeUsage: "215 MB", icon: "image", active: true }
        ]
      }));
    },

    saveFoldersCollectionsConfig(config) {
      if (!config) return false;
      const clean = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        settings: {
          rootDirectory: String(config.settings?.rootDirectory || "/").trim(),
          enableSubfolders: config.settings?.enableSubfolders !== false,
          defaultSort: String(config.settings?.defaultSort || "name_asc").trim()
        },
        folders: Array.isArray(config.folders || config.items) ? (config.folders || config.items).map((item, i) => ({
          id: String(item.id || "DIR-" + String(i + 1).padStart(2, "0")),
          path: String(item.path || "/").trim(),
          label: String(item.label || "").trim(),
          folderType: String(item.folderType || "Root").trim(),
          itemCount: parseInt(item.itemCount, 10) || 0,
          sizeUsage: String(item.sizeUsage || "0 MB").trim(),
          icon: String(item.icon || "folder").trim(),
          active: item.active !== false
        })) : []
      };
      clean.items = clean.folders;
      localStorage.setItem("cso_folders_collections_config", JSON.stringify(clean));
      this.logAudit("FOLDERS_COLLECTIONS_CONFIG_UPDATED", "FILES_MEDIA", "Folders updated (" + clean.folders.length + " folders).");
      return true;
    },

    resetFoldersCollectionsConfig() {
      localStorage.removeItem("cso_folders_collections_config");
      this.logAudit("FOLDERS_COLLECTIONS_CONFIG_RESET", "SYSTEM_RESET", "Folders reset to factory defaults.");
      return this.getFoldersCollectionsConfig();
    },

    exportFoldersCollectionsManifest() {
      const config = this.getFoldersCollectionsConfig();
      const filename = "folders_collections_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("FOLDERS_COLLECTIONS_MANIFEST_EXPORTED", "DATA_EXPORT", "Folders collections manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 07-004: PDF Manager Engine ---
    getPdfManagerConfig() {
      return this._hydrateConfig("cso_pdf_manager_config", "documents", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { enableFullTextSearch: true, autoGenerateThumbnails: true, watermarking: false },
        documents: [
          { id: "PDF-01", title: "OAS 2026 Detailed Gazette", filename: "oas-2026-gazette-complete.pdf", pages: 32, ocrStatus: "Indexed", fileSizeBytes: 3355443, fileSizeFormatted: "3.2 MB", checksumSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", active: true },
          { id: "PDF-02", title: "OSSC CGL Exam Scheme", filename: "ossc-cgl-scheme-syllabus.pdf", pages: 12, ocrStatus: "Indexed", fileSizeBytes: 1468006, fileSizeFormatted: "1.4 MB", checksumSha256: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb", active: true },
          { id: "PDF-03", title: "OSSSC RI Pattern", filename: "osssc-ri-amin-scheme.pdf", pages: 8, ocrStatus: "Indexed", fileSizeBytes: 943718, fileSizeFormatted: "920 KB", checksumSha256: "3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d", active: true }
        ]
      }));
    },

    savePdfManagerConfig(config) {
      if (!config) return false;
      const clean = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        settings: {
          enableFullTextSearch: config.settings?.enableFullTextSearch !== false,
          autoGenerateThumbnails: config.settings?.autoGenerateThumbnails !== false,
          watermarking: !!config.settings?.watermarking
        },
        documents: Array.isArray(config.documents || config.items) ? (config.documents || config.items).map((item, i) => ({
          id: String(item.id || "PDF-" + String(i + 1).padStart(2, "0")),
          title: String(item.title || "").trim(),
          filename: String(item.filename || item.title || "").trim(),
          pages: parseInt(item.pages, 10) || 1,
          ocrStatus: String(item.ocrStatus || "Indexed").trim(),
          fileSizeBytes: parseInt(item.fileSizeBytes, 10) || 1048576,
          fileSizeFormatted: String(item.fileSizeFormatted || "1.0 MB").trim(),
          checksumSha256: String(item.checksumSha256 || "").trim(),
          active: item.active !== false
        })) : []
      };
      clean.items = clean.documents;
      localStorage.setItem("cso_pdf_manager_config", JSON.stringify(clean));
      this.logAudit("PDF_MANAGER_CONFIG_UPDATED", "FILES_MEDIA", "PDF manager updated (" + clean.documents.length + " PDFs).");
      return true;
    },

    resetPdfManagerConfig() {
      localStorage.removeItem("cso_pdf_manager_config");
      this.logAudit("PDF_MANAGER_CONFIG_RESET", "SYSTEM_RESET", "PDF manager reset to factory defaults.");
      return this.getPdfManagerConfig();
    },

    exportPdfManagerManifest() {
      const config = this.getPdfManagerConfig();
      const filename = "pdf_manager_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("PDF_MANAGER_MANIFEST_EXPORTED", "DATA_EXPORT", "PDF manager manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 07-005: Image Library Engine ---
    getImageLibraryConfig() {
      return this._hydrateConfig("cso_image_library_config", "images", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { autoWebpConversion: true, maxResolution: "3840x2160", preserveExif: false },
        images: [
          { id: "IMG-01", name: "Hero Banner OAS 2026", format: "WebP", dimensions: "1200x630", size: "148 KB", aspectRatio: "1.91:1", url: "https://cdn.csodisha.com/banners/hero-oas-2026.webp", usageLocation: "Homepage Hero", active: true },
          { id: "IMG-02", name: "SAMS Portal Infographic", format: "AVIF", dimensions: "800x800", size: "92 KB", aspectRatio: "1:1", url: "https://cdn.csodisha.com/infographics/sams-portal-steps.avif", usageLocation: "Schemes Section", active: true },
          { id: "IMG-03", name: "CSO Emblem Seal", format: "SVG", dimensions: "Vector", size: "34 KB", aspectRatio: "1:1", url: "https://cdn.csodisha.com/brand/cso-emblem-vector.svg", usageLocation: "Header / Brand Assets", active: true }
        ]
      }));
    },

    saveImageLibraryConfig(config) {
      if (!config) return false;
      const clean = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        settings: {
          autoWebpConversion: config.settings?.autoWebpConversion !== false,
          maxResolution: String(config.settings?.maxResolution || "3840x2160").trim(),
          preserveExif: !!config.settings?.preserveExif
        },
        images: Array.isArray(config.images || config.items) ? (config.images || config.items).map((item, i) => ({
          id: String(item.id || "IMG-" + String(i + 1).padStart(2, "0")),
          name: String(item.name || "").trim(),
          format: String(item.format || "WebP").trim(),
          dimensions: String(item.dimensions || "1200x630").trim(),
          size: String(item.size || "100 KB").trim(),
          aspectRatio: String(item.aspectRatio || "16:9").trim(),
          url: String(item.url || "#").trim(),
          usageLocation: String(item.usageLocation || "General").trim(),
          active: item.active !== false
        })) : []
      };
      clean.items = clean.images;
      localStorage.setItem("cso_image_library_config", JSON.stringify(clean));
      this.logAudit("IMAGE_LIBRARY_CONFIG_UPDATED", "FILES_MEDIA", "Image library updated (" + clean.images.length + " images).");
      return true;
    },

    resetImageLibraryConfig() {
      localStorage.removeItem("cso_image_library_config");
      this.logAudit("IMAGE_LIBRARY_CONFIG_RESET", "SYSTEM_RESET", "Image library reset to factory defaults.");
      return this.getImageLibraryConfig();
    },

    exportImageLibraryManifest() {
      const config = this.getImageLibraryConfig();
      const filename = "image_library_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("IMAGE_LIBRARY_MANIFEST_EXPORTED", "DATA_EXPORT", "Image library manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 07-006: Video & Audio Engine ---
    getVideoAudioConfig() {
      return this._hydrateConfig("cso_video_audio_config", "mediaTracks", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { enableHlsStreaming: true, defaultAudioBitrate: "128k", maxVideoLengthMinutes: 180 },
        mediaTracks: [
          { id: "AV-01", title: "Odia Grammar Audio Masterclass", mediaType: "Audio (MP3)", duration: "42 mins", bitrate: "192 kbps", fileSize: "58 MB", streamUrl: "https://r2.csodisha.com/audio/odia-vyakaran-masterclass.mp3", category: "Language Study", active: true },
          { id: "AV-02", title: "OAS Prelims GS Strategy Webinar", mediaType: "Video (MP4)", duration: "64 mins", bitrate: "1080p 2.5 Mbps", fileSize: "1.2 GB", streamUrl: "https://r2.csodisha.com/video/oas-gs-strategy-2026.mp4", category: "Exam Strategy", active: true },
          { id: "AV-03", title: "Daily Odisha Current Affairs Podcast #12", mediaType: "Audio (MP3)", duration: "18 mins", bitrate: "128 kbps", fileSize: "16.4 MB", streamUrl: "https://r2.csodisha.com/audio/ca-podcast-ep12.mp3", category: "Current Affairs", active: true }
        ]
      }));
    },

    saveVideoAudioConfig(config) {
      if (!config) return false;
      const clean = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        settings: {
          enableHlsStreaming: config.settings?.enableHlsStreaming !== false,
          defaultAudioBitrate: String(config.settings?.defaultAudioBitrate || "128k").trim(),
          maxVideoLengthMinutes: parseInt(config.settings?.maxVideoLengthMinutes, 10) || 180
        },
        mediaTracks: Array.isArray(config.mediaTracks || config.items) ? (config.mediaTracks || config.items).map((item, i) => ({
          id: String(item.id || "AV-" + String(i + 1).padStart(2, "0")),
          title: String(item.title || "").trim(),
          mediaType: String(item.mediaType || "Audio (MP3)").trim(),
          duration: String(item.duration || "0 mins").trim(),
          bitrate: String(item.bitrate || "128 kbps").trim(),
          fileSize: String(item.fileSize || "10 MB").trim(),
          streamUrl: String(item.streamUrl || "#").trim(),
          category: String(item.category || "General").trim(),
          active: item.active !== false
        })) : []
      };
      clean.items = clean.mediaTracks;
      localStorage.setItem("cso_video_audio_config", JSON.stringify(clean));
      this.logAudit("VIDEO_AUDIO_CONFIG_UPDATED", "FILES_MEDIA", "Video & audio config updated (" + clean.mediaTracks.length + " tracks).");
      return true;
    },

    resetVideoAudioConfig() {
      localStorage.removeItem("cso_video_audio_config");
      this.logAudit("VIDEO_AUDIO_CONFIG_RESET", "SYSTEM_RESET", "Video & audio config reset to factory defaults.");
      return this.getVideoAudioConfig();
    },

    exportVideoAudioManifest() {
      const config = this.getVideoAudioConfig();
      const filename = "video_audio_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("VIDEO_AUDIO_MANIFEST_EXPORTED", "DATA_EXPORT", "Video & audio manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 07-007: Cloud Links Engine ---
    getCloudLinksConfig() {
      return this._hydrateConfig("cso_cloud_links_config", "cloudEndpoints", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { defaultCdnDomain: "cdn.csodisha.com", enableSslVerification: true, cacheTtlSeconds: 86400 },
        cloudEndpoints: [
          { id: "CLOUD-01", label: "Cloudflare R2 Primary Bucket", endpoint: "r2.csodisha.com", region: "APAC (Mumbai / Singapore)", protocol: "HTTPS", status: "Operational", latencyMs: 24, active: true },
          { id: "CLOUD-02", label: "Asset CDN Edge", endpoint: "cdn.csodisha.com", region: "Global Anycast (285+ cities)", protocol: "HTTPS / HTTP/3", status: "Operational", latencyMs: 8, active: true },
          { id: "CLOUD-03", label: "Static Vault Cache", endpoint: "assets.csodisha.com", region: "Cloudflare Cache Tier", protocol: "HTTPS", status: "Operational", latencyMs: 14, active: true }
        ]
      }));
    },

    saveCloudLinksConfig(config) {
      if (!config) return false;
      const clean = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        settings: {
          defaultCdnDomain: String(config.settings?.defaultCdnDomain || "cdn.csodisha.com").trim(),
          enableSslVerification: config.settings?.enableSslVerification !== false,
          cacheTtlSeconds: parseInt(config.settings?.cacheTtlSeconds, 10) || 86400
        },
        cloudEndpoints: Array.isArray(config.cloudEndpoints || config.items) ? (config.cloudEndpoints || config.items).map((item, i) => ({
          id: String(item.id || "CLOUD-" + String(i + 1).padStart(2, "0")),
          label: String(item.label || "").trim(),
          endpoint: String(item.endpoint || "").trim(),
          region: String(item.region || "Global").trim(),
          protocol: String(item.protocol || "HTTPS").trim(),
          status: String(item.status || "Operational").trim(),
          latencyMs: parseInt(item.latencyMs, 10) || 20,
          active: item.active !== false
        })) : []
      };
      clean.items = clean.cloudEndpoints;
      localStorage.setItem("cso_cloud_links_config", JSON.stringify(clean));
      this.logAudit("CLOUD_LINKS_CONFIG_UPDATED", "FILES_MEDIA", "Cloud links config updated (" + clean.cloudEndpoints.length + " endpoints).");
      return true;
    },

    resetCloudLinksConfig() {
      localStorage.removeItem("cso_cloud_links_config");
      this.logAudit("CLOUD_LINKS_CONFIG_RESET", "SYSTEM_RESET", "Cloud links reset to factory defaults.");
      return this.getCloudLinksConfig();
    },

    exportCloudLinksManifest() {
      const config = this.getCloudLinksConfig();
      const filename = "cloud_links_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("CLOUD_LINKS_MANIFEST_EXPORTED", "DATA_EXPORT", "Cloud links manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 07-008: Google Drive Links Engine ---
    getGoogleDriveLinksConfig() {
      return this._hydrateConfig("cso_gdrive_links_config", "driveItems", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { syncIntervalHours: 6, proxyLargeDownloads: true, domainRestricted: false },
        driveItems: [
          { id: "GDRV-01", title: "2018-2025 Odisha Question Paper Mirror", driveFileId: "1A2b3C-DriveID", resourceType: "Folder Mirror", fileCount: 88, syncStatus: "Synced", lastVerified: "2026-11-09T12:00:00Z", active: true },
          { id: "GDRV-02", title: "State Gazette Reference Archive", driveFileId: "4D5e6F-DriveID", resourceType: "Shared Drive", fileCount: 142, syncStatus: "Synced", lastVerified: "2026-11-09T08:30:00Z", active: true },
          { id: "GDRV-03", title: "High School Teacher Notes Folder", driveFileId: "7G8h9I-DriveID", resourceType: "Collaborative Doc", fileCount: 45, syncStatus: "Synced", lastVerified: "2026-11-08T19:00:00Z", active: true }
        ]
      }));
    },

    saveGoogleDriveLinksConfig(config) {
      if (!config) return false;
      const clean = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        settings: {
          syncIntervalHours: parseInt(config.settings?.syncIntervalHours, 10) || 6,
          proxyLargeDownloads: config.settings?.proxyLargeDownloads !== false,
          domainRestricted: !!config.settings?.domainRestricted
        },
        driveItems: Array.isArray(config.driveItems || config.items) ? (config.driveItems || config.items).map((item, i) => ({
          id: String(item.id || "GDRV-" + String(i + 1).padStart(2, "0")),
          title: String(item.title || "").trim(),
          driveFileId: String(item.driveFileId || "").trim(),
          resourceType: String(item.resourceType || "Folder Mirror").trim(),
          fileCount: parseInt(item.fileCount, 10) || 0,
          syncStatus: String(item.syncStatus || "Synced").trim(),
          lastVerified: item.lastVerified || new Date().toISOString(),
          active: item.active !== false
        })) : []
      };
      clean.items = clean.driveItems;
      localStorage.setItem("cso_gdrive_links_config", JSON.stringify(clean));
      this.logAudit("GDRIVE_LINKS_CONFIG_UPDATED", "FILES_MEDIA", "Google Drive links updated (" + clean.driveItems.length + " items).");
      return true;
    },

    resetGoogleDriveLinksConfig() {
      localStorage.removeItem("cso_gdrive_links_config");
      this.logAudit("GDRIVE_LINKS_CONFIG_RESET", "SYSTEM_RESET", "Google Drive links reset to factory defaults.");
      return this.getGoogleDriveLinksConfig();
    },

    exportGoogleDriveLinksManifest() {
      const config = this.getGoogleDriveLinksConfig();
      const filename = "gdrive_links_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("GDRIVE_LINKS_MANIFEST_EXPORTED", "DATA_EXPORT", "Google Drive manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 07-009: Storage Providers Engine ---
    getStorageProvidersConfig() {
      return this._hydrateConfig("cso_storage_providers_config", "providers", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { primaryProviderId: "SP-01", autoFailover: true, healthCheckIntervalMinutes: 5 },
        providers: [
          { id: "SP-01", name: "Cloudflare R2 Object Storage", role: "Default Active", quotaGb: 50, usedGb: 8.42, egressFee: "$0 / Free", uptimePercent: 99.99, region: "APAC Multi-Region", active: true },
          { id: "SP-02", name: "Supabase Storage Bucket", role: "Secondary Backup", quotaGb: 20, usedGb: 3.18, egressFee: "Included (Bandwidth Pool)", uptimePercent: 99.95, region: "ap-southeast-1 (Singapore)", active: true },
          { id: "SP-03", name: "Local Cloudflare D1 BLOB Mirror", role: "Internal Failover", quotaGb: 10, usedGb: 0.65, egressFee: "Internal Free", uptimePercent: 100.0, region: "Local Workers Edge", active: true }
        ]
      }));
    },

    saveStorageProvidersConfig(config) {
      if (!config) return false;
      const clean = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        settings: {
          primaryProviderId: String(config.settings?.primaryProviderId || "SP-01").trim(),
          autoFailover: config.settings?.autoFailover !== false,
          healthCheckIntervalMinutes: parseInt(config.settings?.healthCheckIntervalMinutes, 10) || 5
        },
        providers: Array.isArray(config.providers || config.items) ? (config.providers || config.items).map((item, i) => ({
          id: String(item.id || "SP-" + String(i + 1).padStart(2, "0")),
          name: String(item.name || "").trim(),
          role: String(item.role || "Secondary Backup").trim(),
          quotaGb: parseFloat(item.quotaGb) || 50,
          usedGb: parseFloat(item.usedGb) || 0,
          egressFee: String(item.egressFee || "$0").trim(),
          uptimePercent: parseFloat(item.uptimePercent) || 99.9,
          region: String(item.region || "Global").trim(),
          active: item.active !== false
        })) : []
      };
      clean.items = clean.providers;
      localStorage.setItem("cso_storage_providers_config", JSON.stringify(clean));
      this.logAudit("STORAGE_PROVIDERS_CONFIG_UPDATED", "FILES_MEDIA", "Storage providers config updated (" + clean.providers.length + " providers).");
      return true;
    },

    resetStorageProvidersConfig() {
      localStorage.removeItem("cso_storage_providers_config");
      this.logAudit("STORAGE_PROVIDERS_CONFIG_RESET", "SYSTEM_RESET", "Storage providers reset to factory defaults.");
      return this.getStorageProvidersConfig();
    },

    exportStorageProvidersManifest() {
      const config = this.getStorageProvidersConfig();
      const filename = "storage_providers_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("STORAGE_PROVIDERS_MANIFEST_EXPORTED", "DATA_EXPORT", "Storage providers manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 07-010: File Versions Engine ---
    getFileVersionsConfig() {
      return this._hydrateConfig("cso_file_versions_config", "revisions", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { maxVersionsToKeep: 5, autoPruneOldDrafts: true },
        revisions: [
          { id: "REV-01", documentName: "OAS 2026 Syllabus", versionTag: "v2.1", status: "Current Live", author: "admin@csodisha.com", publishedAt: "2026-11-06T15:20:00Z", changeNote: "Updated Mains Optional Syllabus for Anthropology & Odia Lit.", active: true },
          { id: "REV-02", documentName: "OAS 2026 Syllabus", versionTag: "v2.0", status: "Superseded", author: "editor@csodisha.com", publishedAt: "2026-10-18T11:00:00Z", changeNote: "Initial preliminary release per Draft Commission Notice.", active: false },
          { id: "REV-03", documentName: "OTET Rulebook", versionTag: "v1.4", status: "Current Live", author: "admin@csodisha.com", publishedAt: "2026-11-02T09:45:00Z", changeNote: "Revised reservation percentages per latest State Gazette.", active: true }
        ]
      }));
    },

    saveFileVersionsConfig(config) {
      if (!config) return false;
      const clean = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        settings: {
          maxVersionsToKeep: parseInt(config.settings?.maxVersionsToKeep, 10) || 5,
          autoPruneOldDrafts: config.settings?.autoPruneOldDrafts !== false
        },
        revisions: Array.isArray(config.revisions || config.items) ? (config.revisions || config.items).map((item, i) => ({
          id: String(item.id || "REV-" + String(i + 1).padStart(2, "0")),
          documentName: String(item.documentName || "").trim(),
          versionTag: String(item.versionTag || "v1.0").trim(),
          status: String(item.status || "Current Live").trim(),
          author: String(item.author || "admin@csodisha.com").trim(),
          publishedAt: item.publishedAt || new Date().toISOString(),
          changeNote: String(item.changeNote || "").trim(),
          active: item.active !== false
        })) : []
      };
      clean.items = clean.revisions;
      localStorage.setItem("cso_file_versions_config", JSON.stringify(clean));
      this.logAudit("FILE_VERSIONS_CONFIG_UPDATED", "FILES_MEDIA", "File versions config updated (" + clean.revisions.length + " revisions).");
      return true;
    },

    resetFileVersionsConfig() {
      localStorage.removeItem("cso_file_versions_config");
      this.logAudit("FILE_VERSIONS_CONFIG_RESET", "SYSTEM_RESET", "File versions reset to factory defaults.");
      return this.getFileVersionsConfig();
    },

    exportFileVersionsManifest() {
      const config = this.getFileVersionsConfig();
      const filename = "file_versions_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("FILE_VERSIONS_MANIFEST_EXPORTED", "DATA_EXPORT", "File versions manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 07-011: File Permissions Engine ---
    getFilePermissionsConfig() {
      return this._hydrateConfig("cso_file_permissions_config", "permissionRules", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { defaultAccess: "Public Free", enforceHotlinkProtection: true },
        permissionRules: [
          { id: "PERM-01", ruleName: "Public Candidate Free Download Rule", accessLevel: "Public Free", targetFolders: "/syllabi/, /notifications/", allowedRoles: ["Anonymous", "Candidate", "Admin"], dailyDownloadCap: "Unlimited", active: true },
          { id: "PERM-02", ruleName: "Registered Aspirant Mock Rule", accessLevel: "Registered Required", targetFolders: "/pyq-archives/mains/", allowedRoles: ["Candidate", "Premium Member", "Admin"], dailyDownloadCap: "20 PDFs / day", active: true },
          { id: "PERM-03", ruleName: "Super Admin System Asset Rule", accessLevel: "Super Admin Only", targetFolders: "/system/backups/, /brand/source/", allowedRoles: ["Super Admin"], dailyDownloadCap: "Unlimited", active: true }
        ]
      }));
    },

    saveFilePermissionsConfig(config) {
      if (!config) return false;
      const clean = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        settings: {
          defaultAccess: String(config.settings?.defaultAccess || "Public Free").trim(),
          enforceHotlinkProtection: config.settings?.enforceHotlinkProtection !== false
        },
        permissionRules: Array.isArray(config.permissionRules || config.items) ? (config.permissionRules || config.items).map((item, i) => ({
          id: String(item.id || "PERM-" + String(i + 1).padStart(2, "0")),
          ruleName: String(item.ruleName || "").trim(),
          accessLevel: String(item.accessLevel || "Public Free").trim(),
          targetFolders: String(item.targetFolders || "/").trim(),
          allowedRoles: Array.isArray(item.allowedRoles) ? item.allowedRoles : ["Admin"],
          dailyDownloadCap: String(item.dailyDownloadCap || "Unlimited").trim(),
          active: item.active !== false
        })) : []
      };
      clean.items = clean.permissionRules;
      localStorage.setItem("cso_file_permissions_config", JSON.stringify(clean));
      this.logAudit("FILE_PERMISSIONS_CONFIG_UPDATED", "FILES_MEDIA", "File permissions updated (" + clean.permissionRules.length + " rules).");
      return true;
    },

    resetFilePermissionsConfig() {
      localStorage.removeItem("cso_file_permissions_config");
      this.logAudit("FILE_PERMISSIONS_CONFIG_RESET", "SYSTEM_RESET", "File permissions reset to factory defaults.");
      return this.getFilePermissionsConfig();
    },

    exportFilePermissionsManifest() {
      const config = this.getFilePermissionsConfig();
      const filename = "file_permissions_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("FILE_PERMISSIONS_MANIFEST_EXPORTED", "DATA_EXPORT", "File permissions manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 07-012: Storage Usage Engine ---
    getStorageUsageConfig() {
      return this._hydrateConfig("cso_storage_usage_config", "metrics", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { storageQuotaGb: 50, bandwidthCapMonthlyGb: 1000, alertThresholdPercent: 80 },
        metrics: [
          { id: "METRIC-01", metricName: "Total Storage Allocated", value: "50 GB", numericalVal: 50, unit: "GB", category: "Capacity", trend: "Static", status: "Optimal", active: true },
          { id: "METRIC-02", metricName: "Used Storage", value: "8.42 GB", numericalVal: 8.42, unit: "GB", category: "Usage", trend: "+340 MB this week", status: "Optimal (16.8%)", active: true },
          { id: "METRIC-03", metricName: "Egress Bandwidth This Month", value: "184.2 GB", numericalVal: 184.2, unit: "GB", category: "Traffic", trend: "+12% vs last month", status: "Normal", active: true },
          { id: "METRIC-04", metricName: "Total Asset Count", value: "1,248 files", numericalVal: 1248, unit: "Files", category: "Inventory", trend: "+45 new uploads", status: "Healthy", active: true }
        ]
      }));
    },

    saveStorageUsageConfig(config) {
      if (!config) return false;
      const clean = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        settings: {
          storageQuotaGb: parseFloat(config.settings?.storageQuotaGb) || 50,
          bandwidthCapMonthlyGb: parseFloat(config.settings?.bandwidthCapMonthlyGb) || 1000,
          alertThresholdPercent: parseInt(config.settings?.alertThresholdPercent, 10) || 80
        },
        metrics: Array.isArray(config.metrics || config.items) ? (config.metrics || config.items).map((item, i) => ({
          id: String(item.id || "METRIC-" + String(i + 1).padStart(2, "0")),
          metricName: String(item.metricName || "").trim(),
          value: String(item.value || "0").trim(),
          numericalVal: parseFloat(item.numericalVal) || 0,
          unit: String(item.unit || "").trim(),
          category: String(item.category || "Usage").trim(),
          trend: String(item.trend || "Stable").trim(),
          status: String(item.status || "Normal").trim(),
          active: item.active !== false
        })) : []
      };
      clean.items = clean.metrics;
      localStorage.setItem("cso_storage_usage_config", JSON.stringify(clean));
      this.logAudit("STORAGE_USAGE_CONFIG_UPDATED", "FILES_MEDIA", "Storage usage config updated.");
      return true;
    },

    resetStorageUsageConfig() {
      localStorage.removeItem("cso_storage_usage_config");
      this.logAudit("STORAGE_USAGE_CONFIG_RESET", "SYSTEM_RESET", "Storage usage config reset to factory defaults.");
      return this.getStorageUsageConfig();
    },

    exportStorageUsageManifest() {
      const config = this.getStorageUsageConfig();
      const filename = "storage_usage_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("STORAGE_USAGE_MANIFEST_EXPORTED", "DATA_EXPORT", "Storage usage manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 07-013: Duplicate Detection Engine ---
    getDuplicateDetectionConfig() {
      return this._hydrateConfig("cso_duplicate_detection_config", "duplicates", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { hashAlgorithm: "SHA-256", autoDeleteIdenticalOrphans: false, checkOnUpload: true },
        duplicates: [
          { id: "DUP-01", scanType: "Hash Collision Check", targetAssets: "admit_card_ri_provisional.pdf & admit_card_ri_copy.pdf", hashAlgorithm: "MD5", duplicateCount: 2, potentialSavings: "1.6 MB", resolutionStatus: "Flagged for Review", active: true },
          { id: "DUP-02", scanType: "Duplicate PDF Scanner", targetAssets: "All candidate gazette PDFs in /syllabi/", hashAlgorithm: "SHA-256", duplicateCount: 0, potentialSavings: "0 KB", resolutionStatus: "Verified Clean (0 duplicates)", active: true }
        ]
      }));
    },

    saveDuplicateDetectionConfig(config) {
      if (!config) return false;
      const clean = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        settings: {
          hashAlgorithm: String(config.settings?.hashAlgorithm || "SHA-256").trim(),
          autoDeleteIdenticalOrphans: !!config.settings?.autoDeleteIdenticalOrphans,
          checkOnUpload: config.settings?.checkOnUpload !== false
        },
        duplicates: Array.isArray(config.duplicates || config.items) ? (config.duplicates || config.items).map((item, i) => ({
          id: String(item.id || "DUP-" + String(i + 1).padStart(2, "0")),
          scanType: String(item.scanType || "").trim(),
          targetAssets: String(item.targetAssets || "").trim(),
          hashAlgorithm: String(item.hashAlgorithm || "SHA-256").trim(),
          duplicateCount: parseInt(item.duplicateCount, 10) || 0,
          potentialSavings: String(item.potentialSavings || "0 KB").trim(),
          resolutionStatus: String(item.resolutionStatus || "Clean").trim(),
          active: item.active !== false
        })) : []
      };
      clean.items = clean.duplicates;
      localStorage.setItem("cso_duplicate_detection_config", JSON.stringify(clean));
      this.logAudit("DUPLICATE_DETECTION_CONFIG_UPDATED", "FILES_MEDIA", "Duplicate detection updated (" + clean.duplicates.length + " scans).");
      return true;
    },

    resetDuplicateDetectionConfig() {
      localStorage.removeItem("cso_duplicate_detection_config");
      this.logAudit("DUPLICATE_DETECTION_CONFIG_RESET", "SYSTEM_RESET", "Duplicate detection reset to factory defaults.");
      return this.getDuplicateDetectionConfig();
    },

    exportDuplicateDetectionManifest() {
      const config = this.getDuplicateDetectionConfig();
      const filename = "duplicate_detection_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("DUPLICATE_DETECTION_MANIFEST_EXPORTED", "DATA_EXPORT", "Duplicate detection manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 07-014: Broken File Links Engine ---
    getBrokenFileLinksConfig() {
      return this._hydrateConfig("cso_broken_file_links_config", "audits", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { scheduleFrequency: "Weekly", followRedirects: true, alertOnFailure: true },
        audits: [
          { id: "AUDIT-01", scanScope: "Weekly Crawler Audit", totalUrlsChecked: 1248, brokenLinksFound: 0, redirectsResolved: 3, lastRunAt: "2026-11-08T03:00:00Z", healthScore: "100%", status: "Passed", active: true }
        ]
      }));
    },

    saveBrokenFileLinksConfig(config) {
      if (!config) return false;
      const clean = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        settings: {
          scheduleFrequency: String(config.settings?.scheduleFrequency || "Weekly").trim(),
          followRedirects: config.settings?.followRedirects !== false,
          alertOnFailure: config.settings?.alertOnFailure !== false
        },
        audits: Array.isArray(config.audits || config.items) ? (config.audits || config.items).map((item, i) => ({
          id: String(item.id || "AUDIT-" + String(i + 1).padStart(2, "0")),
          scanScope: String(item.scanScope || "Full Audit").trim(),
          totalUrlsChecked: parseInt(item.totalUrlsChecked, 10) || 0,
          brokenLinksFound: parseInt(item.brokenLinksFound, 10) || 0,
          redirectsResolved: parseInt(item.redirectsResolved, 10) || 0,
          lastRunAt: item.lastRunAt || new Date().toISOString(),
          healthScore: String(item.healthScore || "100%").trim(),
          status: String(item.status || "Passed").trim(),
          active: item.active !== false
        })) : []
      };
      clean.items = clean.audits;
      localStorage.setItem("cso_broken_file_links_config", JSON.stringify(clean));
      this.logAudit("BROKEN_FILE_LINKS_CONFIG_UPDATED", "FILES_MEDIA", "Broken file links config updated.");
      return true;
    },

    resetBrokenFileLinksConfig() {
      localStorage.removeItem("cso_broken_file_links_config");
      this.logAudit("BROKEN_FILE_LINKS_CONFIG_RESET", "SYSTEM_RESET", "Broken file links reset to factory defaults.");
      return this.getBrokenFileLinksConfig();
    },

    exportBrokenFileLinksManifest() {
      const config = this.getBrokenFileLinksConfig();
      const filename = "broken_file_links_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("BROKEN_FILE_LINKS_MANIFEST_EXPORTED", "DATA_EXPORT", "Broken file links manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 07-015: Media Optimization Engine ---
    getMediaOptimizationConfig() {
      return this._hydrateConfig("cso_media_optimization_config", "pipelineRules", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { enableAutoOptimization: true, stripMetadata: true, webpQuality: 85 },
        pipelineRules: [
          { id: "OPT-01", pipelineName: "Auto-convert JPEG/PNG to WebP", targetFormat: "WebP (Quality 85%)", compressionRatio: "58% reduction", autoTrigger: "On Upload", status: "Active", active: true },
          { id: "OPT-02", pipelineName: "PDF Compression Pipeline", targetFormat: "Downsample images to 150 DPI", compressionRatio: "42% reduction", autoTrigger: "Manual / Scheduled", status: "Active", active: true },
          { id: "OPT-03", pipelineName: "Responsive Avatar Thumbnails", targetFormat: "64x64, 128x128 AVIF/WebP", compressionRatio: "74% reduction", autoTrigger: "On User Upload", status: "Active", active: true }
        ]
      }));
    },

    saveMediaOptimizationConfig(config) {
      if (!config) return false;
      const clean = {
        meta: { version: "1.0", lastEditedBy: "admin@csodisha.com", updatedAt: new Date().toISOString() },
        settings: {
          enableAutoOptimization: config.settings?.enableAutoOptimization !== false,
          stripMetadata: config.settings?.stripMetadata !== false,
          webpQuality: parseInt(config.settings?.webpQuality, 10) || 85
        },
        pipelineRules: Array.isArray(config.pipelineRules || config.items) ? (config.pipelineRules || config.items).map((item, i) => ({
          id: String(item.id || "OPT-" + String(i + 1).padStart(2, "0")),
          pipelineName: String(item.pipelineName || "").trim(),
          targetFormat: String(item.targetFormat || "").trim(),
          compressionRatio: String(item.compressionRatio || "0%").trim(),
          autoTrigger: String(item.autoTrigger || "On Upload").trim(),
          status: String(item.status || "Active").trim(),
          active: item.active !== false
        })) : []
      };
      clean.items = clean.pipelineRules;
      localStorage.setItem("cso_media_optimization_config", JSON.stringify(clean));
      this.logAudit("MEDIA_OPTIMIZATION_CONFIG_UPDATED", "FILES_MEDIA", "Media optimization config updated (" + clean.pipelineRules.length + " rules).");
      return true;
    },

    resetMediaOptimizationConfig() {
      localStorage.removeItem("cso_media_optimization_config");
      this.logAudit("MEDIA_OPTIMIZATION_CONFIG_RESET", "SYSTEM_RESET", "Media optimization reset to factory defaults.");
      return this.getMediaOptimizationConfig();
    },

    exportMediaOptimizationManifest() {
      const config = this.getMediaOptimizationConfig();
      const filename = "media_optimization_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("MEDIA_OPTIMIZATION_MANIFEST_EXPORTED", "DATA_EXPORT", "Media optimization manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 08-001: Payment Overview ---
    getPaymentOverviewConfig() {
      const DEFAULT_PAYMENT_OVERVIEW = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { totalVolumeINR: 482500, successfulCount: 1420, refundCount: 12, netRevenueINR: 476100 },
        items: [
          { id: "METRIC-01", channel: "Razorpay Standard", volumeINR: 320400, txCount: 940, successRate: "99.2%", status: "Healthy", active: true },
          { id: "METRIC-02", channel: "Cashfree UPI Direct", volumeINR: 112100, txCount: 380, successRate: "98.7%", status: "Healthy", active: true },
          { id: "METRIC-03", channel: "Stripe International", volumeINR: 50000, txCount: 100, successRate: "97.5%", status: "Healthy", active: true }
        ]
      };
      return this._hydrateConfig('cso_payment_overview_config', 'channels', () => DEFAULT_PAYMENT_OVERVIEW);
    },
    savePaymentOverviewConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.channels = cfg.items || cfg.channels || [];
      cfg.items = cfg.channels;
      localStorage.setItem('cso_payment_overview_config', JSON.stringify(cfg));
      this.logAudit("PAYMENT_OVERVIEW_UPDATED", "FINANCE", "Payment Overview metrics updated.");
      return true;
    },
    resetPaymentOverviewConfig() {
      const DEFAULT_PAYMENT_OVERVIEW = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { totalVolumeINR: 482500, successfulCount: 1420, refundCount: 12, netRevenueINR: 476100 },
        items: [
          { id: "METRIC-01", channel: "Razorpay Standard", volumeINR: 320400, txCount: 940, successRate: "99.2%", status: "Healthy", active: true },
          { id: "METRIC-02", channel: "Cashfree UPI Direct", volumeINR: 112100, txCount: 380, successRate: "98.7%", status: "Healthy", active: true },
          { id: "METRIC-03", channel: "Stripe International", volumeINR: 50000, txCount: 100, successRate: "97.5%", status: "Healthy", active: true }
        ]
      };
      localStorage.setItem('cso_payment_overview_config', JSON.stringify(DEFAULT_PAYMENT_OVERVIEW));
      this.logAudit("PAYMENT_OVERVIEW_RESET", "FINANCE", "Payment Overview metrics restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_PAYMENT_OVERVIEW));
    },
    exportPaymentOverviewManifest() {
      const config = this.getPaymentOverviewConfig();
      const filename = "payment_overview_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("PAYMENT_OVERVIEW_EXPORTED", "DATA_EXPORT", "Payment Overview manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 08-002: Payment Gateway Settings ---
    getPaymentGatewaySettingsConfig() {
      const DEFAULT_GATEWAY_SETTINGS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "GW-01", provider: "Razorpay", environment: "Production", keyId: "rzp_live_CSOdisha2026", webhookSecret: "whsec_live_rzp991", upiEnabled: true, cardsEnabled: true, active: true },
          { id: "GW-02", provider: "Cashfree", environment: "Production", keyId: "cf_app_live_8820", webhookSecret: "cfsec_live_4412", upiEnabled: true, cardsEnabled: false, active: true },
          { id: "GW-03", provider: "Stripe", environment: "Production", keyId: "pk_live_CSO_Global", webhookSecret: "whsec_stripe_001", upiEnabled: false, cardsEnabled: true, active: false }
        ]
      };
      return this._hydrateConfig('cso_gateway_settings_config', 'gateways', () => DEFAULT_GATEWAY_SETTINGS);
    },
    savePaymentGatewaySettingsConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.gateways = cfg.items || cfg.gateways || [];
      cfg.items = cfg.gateways;
      localStorage.setItem('cso_gateway_settings_config', JSON.stringify(cfg));
      this.logAudit("GATEWAY_SETTINGS_UPDATED", "FINANCE", "Payment Gateway settings updated.");
      return true;
    },
    resetPaymentGatewaySettingsConfig() {
      const DEFAULT_GATEWAY_SETTINGS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "GW-01", provider: "Razorpay", environment: "Production", keyId: "rzp_live_CSOdisha2026", webhookSecret: "whsec_live_rzp991", upiEnabled: true, cardsEnabled: true, active: true },
          { id: "GW-02", provider: "Cashfree", environment: "Production", keyId: "cf_app_live_8820", webhookSecret: "cfsec_live_4412", upiEnabled: true, cardsEnabled: false, active: true },
          { id: "GW-03", provider: "Stripe", environment: "Production", keyId: "pk_live_CSO_Global", webhookSecret: "whsec_stripe_001", upiEnabled: false, cardsEnabled: true, active: false }
        ]
      };
      localStorage.setItem('cso_gateway_settings_config', JSON.stringify(DEFAULT_GATEWAY_SETTINGS));
      this.logAudit("GATEWAY_SETTINGS_RESET", "FINANCE", "Payment Gateway settings restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_GATEWAY_SETTINGS));
    },
    exportPaymentGatewaySettingsManifest() {
      const config = this.getPaymentGatewaySettingsConfig();
      const filename = "payment_gateways_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("GATEWAYS_MANIFEST_EXPORTED", "DATA_EXPORT", "Payment Gateways manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 08-003: Transactions ---
    getTransactionsConfig() {
      const DEFAULT_TRANSACTIONS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "TXN-8801", refNo: "CSO-TX-2026-001", customerEmail: "aspirant.balasore@gmail.com", amountINR: 499, method: "UPI (Google Pay)", gatewayRef: "pay_PkJd9124", status: "Success", timestamp: "2026-11-08 14:22:10", active: true },
          { id: "TXN-8802", refNo: "CSO-TX-2026-002", customerEmail: "candidate.cuttack@gmail.com", amountINR: 299, method: "UPI (PhonePe)", gatewayRef: "pay_QlMe8311", status: "Success", timestamp: "2026-11-08 15:45:00", active: true },
          { id: "TXN-8803", refNo: "CSO-TX-2026-003", customerEmail: "student.bbsr@gmail.com", amountINR: 999, method: "Debit Card (HDFC)", gatewayRef: "pay_MnOp1290", status: "Success", timestamp: "2026-11-09 09:12:45", active: true }
        ]
      };
      return this._hydrateConfig('cso_transactions_config', 'transactions', () => DEFAULT_TRANSACTIONS);
    },
    saveTransactionsConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.transactions = cfg.items || cfg.transactions || [];
      cfg.items = cfg.transactions;
      localStorage.setItem('cso_transactions_config', JSON.stringify(cfg));
      this.logAudit("TRANSACTIONS_UPDATED", "FINANCE", "Transactions registry updated.");
      return true;
    },
    resetTransactionsConfig() {
      const DEFAULT_TRANSACTIONS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "TXN-8801", refNo: "CSO-TX-2026-001", customerEmail: "aspirant.balasore@gmail.com", amountINR: 499, method: "UPI (Google Pay)", gatewayRef: "pay_PkJd9124", status: "Success", timestamp: "2026-11-08 14:22:10", active: true },
          { id: "TXN-8802", refNo: "CSO-TX-2026-002", customerEmail: "candidate.cuttack@gmail.com", amountINR: 299, method: "UPI (PhonePe)", gatewayRef: "pay_QlMe8311", status: "Success", timestamp: "2026-11-08 15:45:00", active: true },
          { id: "TXN-8803", refNo: "CSO-TX-2026-003", customerEmail: "student.bbsr@gmail.com", amountINR: 999, method: "Debit Card (HDFC)", gatewayRef: "pay_MnOp1290", status: "Success", timestamp: "2026-11-09 09:12:45", active: true }
        ]
      };
      localStorage.setItem('cso_transactions_config', JSON.stringify(DEFAULT_TRANSACTIONS));
      this.logAudit("TRANSACTIONS_RESET", "FINANCE", "Transactions registry restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_TRANSACTIONS));
    },
    exportTransactionsManifest() {
      const config = this.getTransactionsConfig();
      const filename = "transactions_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("TRANSACTIONS_EXPORTED", "DATA_EXPORT", "Transactions manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 08-004: Orders ---
    getOrdersConfig() {
      const DEFAULT_ORDERS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "ORD-501", orderNumber: "ORD-2026-501", itemName: "OAS 2026 Prelims Mock Test Series", amountINR: 499, fulfillmentStatus: "Fulfilled", accessGranted: true, createdAt: "2026-11-08", active: true },
          { id: "ORD-502", orderNumber: "ORD-2026-502", itemName: "Odisha GK 30 Districts Capsule PDF", amountINR: 299, fulfillmentStatus: "Fulfilled", accessGranted: true, createdAt: "2026-11-08", active: true },
          { id: "ORD-503", orderNumber: "ORD-2026-503", itemName: "OSSC CGL Full Master Bundle", amountINR: 999, fulfillmentStatus: "Fulfilled", accessGranted: true, createdAt: "2026-11-09", active: true }
        ]
      };
      return this._hydrateConfig('cso_orders_config', 'orders', () => DEFAULT_ORDERS);
    },
    saveOrdersConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.orders = cfg.items || cfg.orders || [];
      cfg.items = cfg.orders;
      localStorage.setItem('cso_orders_config', JSON.stringify(cfg));
      this.logAudit("ORDERS_UPDATED", "FINANCE", "Orders ledger updated.");
      return true;
    },
    resetOrdersConfig() {
      const DEFAULT_ORDERS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "ORD-501", orderNumber: "ORD-2026-501", itemName: "OAS 2026 Prelims Mock Test Series", amountINR: 499, fulfillmentStatus: "Fulfilled", accessGranted: true, createdAt: "2026-11-08", active: true },
          { id: "ORD-502", orderNumber: "ORD-2026-502", itemName: "Odisha GK 30 Districts Capsule PDF", amountINR: 299, fulfillmentStatus: "Fulfilled", accessGranted: true, createdAt: "2026-11-08", active: true },
          { id: "ORD-503", orderNumber: "ORD-2026-503", itemName: "OSSC CGL Full Master Bundle", amountINR: 999, fulfillmentStatus: "Fulfilled", accessGranted: true, createdAt: "2026-11-09", active: true }
        ]
      };
      localStorage.setItem('cso_orders_config', JSON.stringify(DEFAULT_ORDERS));
      this.logAudit("ORDERS_RESET", "FINANCE", "Orders ledger restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_ORDERS));
    },
    exportOrdersManifest() {
      const config = this.getOrdersConfig();
      const filename = "orders_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("ORDERS_EXPORTED", "DATA_EXPORT", "Orders manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 08-005: Paid Resources ---
    getPaidResourcesConfig() {
      const DEFAULT_PAID_RESOURCES = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "PRES-01", code: "OAS-MOCK-PRO", title: "OPSC OAS Prelims 10 Full Mocks + Explanations", priceINR: 499, resourceType: "Mock Engine", salesCount: 420, active: true },
          { id: "PRES-02", code: "OD-GK-HANDBOOK", title: "Comprehensive Odisha History & Geography Gazetteer PDF", priceINR: 299, resourceType: "E-Book", salesCount: 680, active: true },
          { id: "PRES-03", code: "OSSC-CGL-KIT", title: "OSSC CGL Reasoning & Quantitative Master Pack", priceINR: 999, resourceType: "Curriculum Bundle", salesCount: 230, active: true }
        ]
      };
      return this._hydrateConfig('cso_paid_resources_config', 'resources', () => DEFAULT_PAID_RESOURCES);
    },
    savePaidResourcesConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.resources = cfg.items || cfg.resources || [];
      cfg.items = cfg.resources;
      localStorage.setItem('cso_paid_resources_config', JSON.stringify(cfg));
      this.logAudit("PAID_RESOURCES_UPDATED", "FINANCE", "Paid Resources catalog updated.");
      return true;
    },
    resetPaidResourcesConfig() {
      const DEFAULT_PAID_RESOURCES = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "PRES-01", code: "OAS-MOCK-PRO", title: "OPSC OAS Prelims 10 Full Mocks + Explanations", priceINR: 499, resourceType: "Mock Engine", salesCount: 420, active: true },
          { id: "PRES-02", code: "OD-GK-HANDBOOK", title: "Comprehensive Odisha History & Geography Gazetteer PDF", priceINR: 299, resourceType: "E-Book", salesCount: 680, active: true },
          { id: "PRES-03", code: "OSSC-CGL-KIT", title: "OSSC CGL Reasoning & Quantitative Master Pack", priceINR: 999, resourceType: "Curriculum Bundle", salesCount: 230, active: true }
        ]
      };
      localStorage.setItem('cso_paid_resources_config', JSON.stringify(DEFAULT_PAID_RESOURCES));
      this.logAudit("PAID_RESOURCES_RESET", "FINANCE", "Paid Resources catalog restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_PAID_RESOURCES));
    },
    exportPaidResourcesManifest() {
      const config = this.getPaidResourcesConfig();
      const filename = "paid_resources_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("PAID_RESOURCES_EXPORTED", "DATA_EXPORT", "Paid Resources manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 08-006: Products & Pricing ---
    getProductsPricingConfig() {
      const DEFAULT_PRODUCTS_PRICING = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "PRD-01", sku: "SKU-OAS-PRE", name: "OPSC OAS Prelims Access Pass", tier: "Standard", regularPriceINR: 799, salePriceINR: 499, taxSlab: "18% GST", active: true },
          { id: "PRD-02", sku: "SKU-GK-BOOK", name: "Odisha State Knowledge Capsule", tier: "Digital Asset", regularPriceINR: 399, salePriceINR: 299, taxSlab: "Exempt", active: true },
          { id: "PRD-03", sku: "SKU-ANNUAL-VIP", name: "CS Odisha 1-Year All-Access Pass", tier: "Subscription", regularPriceINR: 1999, salePriceINR: 1499, taxSlab: "18% GST", active: true }
        ]
      };
      return this._hydrateConfig('cso_products_pricing_config', 'products', () => DEFAULT_PRODUCTS_PRICING);
    },
    saveProductsPricingConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.products = cfg.items || cfg.products || [];
      cfg.items = cfg.products;
      localStorage.setItem('cso_products_pricing_config', JSON.stringify(cfg));
      this.logAudit("PRODUCTS_PRICING_UPDATED", "FINANCE", "Products & Pricing directory updated.");
      return true;
    },
    resetProductsPricingConfig() {
      const DEFAULT_PRODUCTS_PRICING = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "PRD-01", sku: "SKU-OAS-PRE", name: "OPSC OAS Prelims Access Pass", tier: "Standard", regularPriceINR: 799, salePriceINR: 499, taxSlab: "18% GST", active: true },
          { id: "PRD-02", sku: "SKU-GK-BOOK", name: "Odisha State Knowledge Capsule", tier: "Digital Asset", regularPriceINR: 399, salePriceINR: 299, taxSlab: "Exempt", active: true },
          { id: "PRD-03", sku: "SKU-ANNUAL-VIP", name: "CS Odisha 1-Year All-Access Pass", tier: "Subscription", regularPriceINR: 1999, salePriceINR: 1499, taxSlab: "18% GST", active: true }
        ]
      };
      localStorage.setItem('cso_products_pricing_config', JSON.stringify(DEFAULT_PRODUCTS_PRICING));
      this.logAudit("PRODUCTS_PRICING_RESET", "FINANCE", "Products & Pricing directory restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_PRODUCTS_PRICING));
    },
    exportProductsPricingManifest() {
      const config = this.getProductsPricingConfig();
      const filename = "products_pricing_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("PRODUCTS_PRICING_EXPORTED", "DATA_EXPORT", "Products & Pricing manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 08-007: Subscriptions ---
    getSubscriptionsConfig() {
      const DEFAULT_SUBSCRIPTIONS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "SUB-101", userEmail: "aspirant.balasore@gmail.com", planName: "OAS Prelims Pro Annual", billingInterval: "Yearly", amountINR: 1499, autoRenew: true, nextBillingDate: "2027-11-08", status: "Active", active: true },
          { id: "SUB-102", userEmail: "candidate.cuttack@gmail.com", planName: "Monthly Mock Pass", billingInterval: "Monthly", amountINR: 199, autoRenew: true, nextBillingDate: "2026-12-08", status: "Active", active: true },
          { id: "SUB-103", userEmail: "student.bbsr@gmail.com", planName: "Full State Exams Suite", billingInterval: "Yearly", amountINR: 2499, autoRenew: false, nextBillingDate: "2027-05-15", status: "Active", active: true }
        ]
      };
      return this._hydrateConfig('cso_subscriptions_config', 'subscriptions', () => DEFAULT_SUBSCRIPTIONS);
    },
    saveSubscriptionsConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.subscriptions = cfg.items || cfg.subscriptions || [];
      cfg.items = cfg.subscriptions;
      localStorage.setItem('cso_subscriptions_config', JSON.stringify(cfg));
      this.logAudit("SUBSCRIPTIONS_SAVED", "FINANCE", "Subscriptions registry updated with " + cfg.items.length + " entries.");
    },
    resetSubscriptionsConfig() {
      const DEFAULT_SUBSCRIPTIONS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "SUB-101", userEmail: "aspirant.balasore@gmail.com", planName: "OAS Prelims Pro Annual", billingInterval: "Yearly", amountINR: 1499, autoRenew: true, nextBillingDate: "2027-11-08", status: "Active", active: true },
          { id: "SUB-102", userEmail: "candidate.cuttack@gmail.com", planName: "Monthly Mock Pass", billingInterval: "Monthly", amountINR: 199, autoRenew: true, nextBillingDate: "2026-12-08", status: "Active", active: true },
          { id: "SUB-103", userEmail: "student.bbsr@gmail.com", planName: "Full State Exams Suite", billingInterval: "Yearly", amountINR: 2499, autoRenew: false, nextBillingDate: "2027-05-15", status: "Active", active: true }
        ]
      };
      localStorage.setItem('cso_subscriptions_config', JSON.stringify(DEFAULT_SUBSCRIPTIONS));
      this.logAudit("SUBSCRIPTIONS_RESET", "FINANCE", "Subscriptions registry restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_SUBSCRIPTIONS));
    },
    exportSubscriptionsManifest() {
      const config = this.getSubscriptionsConfig();
      const filename = "subscriptions_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("SUBSCRIPTIONS_EXPORTED", "DATA_EXPORT", "Subscriptions manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 08-008: Memberships ---
    getMembershipsConfig() {
      const DEFAULT_MEMBERSHIPS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "MEM-01", tierCode: "ASPIRANT-FREE", tierName: "General Aspirant", annualFeeINR: 0, perks: "Access to free gazette digests & basic quizzes", memberCount: 42100, badgeColor: "#94a3b8", active: true },
          { id: "MEM-02", tierCode: "SCHOLAR-PRO", tierName: "Scholar Club", annualFeeINR: 799, perks: "Full PYQ vault downloads + live test ranking", memberCount: 3840, badgeColor: "#38bdf8", active: true },
          { id: "MEM-03", tierCode: "DISTRICT-VIP", tierName: "District Circle Patron", annualFeeINR: 1999, perks: "Priority mentor doubt clearing + all full mock sets", memberCount: 890, badgeColor: "#f59e0b", active: true }
        ]
      };
      return this._hydrateConfig('cso_memberships_config', 'memberships', () => DEFAULT_MEMBERSHIPS);
    },
    saveMembershipsConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.memberships = cfg.items || cfg.memberships || [];
      cfg.items = cfg.memberships;
      localStorage.setItem('cso_memberships_config', JSON.stringify(cfg));
      this.logAudit("MEMBERSHIPS_SAVED", "FINANCE", "Memberships registry updated with " + cfg.items.length + " entries.");
    },
    resetMembershipsConfig() {
      const DEFAULT_MEMBERSHIPS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "MEM-01", tierCode: "ASPIRANT-FREE", tierName: "General Aspirant", annualFeeINR: 0, perks: "Access to free gazette digests & basic quizzes", memberCount: 42100, badgeColor: "#94a3b8", active: true },
          { id: "MEM-02", tierCode: "SCHOLAR-PRO", tierName: "Scholar Club", annualFeeINR: 799, perks: "Full PYQ vault downloads + live test ranking", memberCount: 3840, badgeColor: "#38bdf8", active: true },
          { id: "MEM-03", tierCode: "DISTRICT-VIP", tierName: "District Circle Patron", annualFeeINR: 1999, perks: "Priority mentor doubt clearing + all full mock sets", memberCount: 890, badgeColor: "#f59e0b", active: true }
        ]
      };
      localStorage.setItem('cso_memberships_config', JSON.stringify(DEFAULT_MEMBERSHIPS));
      this.logAudit("MEMBERSHIPS_RESET", "FINANCE", "Memberships registry restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_MEMBERSHIPS));
    },
    exportMembershipsManifest() {
      const config = this.getMembershipsConfig();
      const filename = "memberships_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("MEMBERSHIPS_EXPORTED", "DATA_EXPORT", "Memberships manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 08-009: Donations ---
    getDonationsConfig() {
      const DEFAULT_DONATIONS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "DON-01", receiptNo: "DON-2026-001", donorName: "R. K. Mohapatra", amountINR: 5000, cause: "Rural Aspirant Digital Resource Drive", paymentRef: "pay_Don7812", date: "2026-10-15", taxExempt80G: true, active: true },
          { id: "DON-02", receiptNo: "DON-2026-002", donorName: "Anonymous Well-Wisher", amountINR: 1000, cause: "Free Server Bandwidth Fund", paymentRef: "pay_Don9931", date: "2026-11-01", taxExempt80G: false, active: true },
          { id: "DON-03", receiptNo: "DON-2026-003", donorName: "P. Priyadarshini", amountINR: 2500, cause: "Tribal District Study Circles", paymentRef: "pay_Don1045", date: "2026-11-05", taxExempt80G: true, active: true }
        ]
      };
      return this._hydrateConfig('cso_donations_config', 'donations', () => DEFAULT_DONATIONS);
    },
    saveDonationsConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.donations = cfg.items || cfg.donations || [];
      cfg.items = cfg.donations;
      localStorage.setItem('cso_donations_config', JSON.stringify(cfg));
      this.logAudit("DONATIONS_SAVED", "FINANCE", "Donations registry updated with " + cfg.items.length + " entries.");
    },
    resetDonationsConfig() {
      const DEFAULT_DONATIONS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "DON-01", receiptNo: "DON-2026-001", donorName: "R. K. Mohapatra", amountINR: 5000, cause: "Rural Aspirant Digital Resource Drive", paymentRef: "pay_Don7812", date: "2026-10-15", taxExempt80G: true, active: true },
          { id: "DON-02", receiptNo: "DON-2026-002", donorName: "Anonymous Well-Wisher", amountINR: 1000, cause: "Free Server Bandwidth Fund", paymentRef: "pay_Don9931", date: "2026-11-01", taxExempt80G: false, active: true },
          { id: "DON-03", receiptNo: "DON-2026-003", donorName: "P. Priyadarshini", amountINR: 2500, cause: "Tribal District Study Circles", paymentRef: "pay_Don1045", date: "2026-11-05", taxExempt80G: true, active: true }
        ]
      };
      localStorage.setItem('cso_donations_config', JSON.stringify(DEFAULT_DONATIONS));
      this.logAudit("DONATIONS_RESET", "FINANCE", "Donations registry restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_DONATIONS));
    },
    exportDonationsManifest() {
      const config = this.getDonationsConfig();
      const filename = "donations_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("DONATIONS_EXPORTED", "DATA_EXPORT", "Donations manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 08-010: Coupons & Offers ---
    getCouponsOffersConfig() {
      const DEFAULT_COUPONS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "CPN-01", code: "OAS2026", discountType: "Percentage", discountValue: 20, minCartValueINR: 499, usageLimit: 500, usedCount: 142, expiryDate: "2026-12-31", active: true },
          { id: "CPN-02", code: "DIWALI50", discountType: "Flat INR", discountValue: 100, minCartValueINR: 299, usageLimit: 1000, usedCount: 890, expiryDate: "2026-11-15", active: true },
          { id: "CPN-03", code: "FIRSTODISHA", discountType: "Percentage", discountValue: 15, minCartValueINR: 199, usageLimit: 2000, usedCount: 420, expiryDate: "2027-03-31", active: true }
        ]
      };
      return this._hydrateConfig('cso_coupons_config', 'coupons', () => DEFAULT_COUPONS);
    },
    saveCouponsOffersConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.coupons = cfg.items || cfg.coupons || [];
      cfg.items = cfg.coupons;
      localStorage.setItem('cso_coupons_config', JSON.stringify(cfg));
      this.logAudit("COUPONS_OFFERS_SAVED", "FINANCE", "Coupons & Offers registry updated with " + cfg.items.length + " entries.");
    },
    resetCouponsOffersConfig() {
      const DEFAULT_COUPONS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "CPN-01", code: "OAS2026", discountType: "Percentage", discountValue: 20, minCartValueINR: 499, usageLimit: 500, usedCount: 142, expiryDate: "2026-12-31", active: true },
          { id: "CPN-02", code: "DIWALI50", discountType: "Flat INR", discountValue: 100, minCartValueINR: 299, usageLimit: 1000, usedCount: 890, expiryDate: "2026-11-15", active: true },
          { id: "CPN-03", code: "FIRSTODISHA", discountType: "Percentage", discountValue: 15, minCartValueINR: 199, usageLimit: 2000, usedCount: 420, expiryDate: "2027-03-31", active: true }
        ]
      };
      localStorage.setItem('cso_coupons_config', JSON.stringify(DEFAULT_COUPONS));
      this.logAudit("COUPONS_OFFERS_RESET", "FINANCE", "Coupons & Offers registry restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_COUPONS));
    },
    exportCouponsOffersManifest() {
      const config = this.getCouponsOffersConfig();
      const filename = "coupons_offers_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("COUPONS_OFFERS_EXPORTED", "DATA_EXPORT", "Coupons & Offers manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 08-011: Refunds & Disputes ---
    getRefundsDisputesConfig() {
      const DEFAULT_REFUNDS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "REF-01", disputeId: "DISP-2026-08", originalOrderRef: "ORD-2026-501", userEmail: "user.issue@gmail.com", amountINR: 499, reason: "Duplicate charge via UPI network glitch", status: "Resolved", refundTxnId: "rfnd_OkLd9912", filedDate: "2026-11-02", active: true },
          { id: "REF-02", disputeId: "DISP-2026-09", originalOrderRef: "ORD-2026-502", userEmail: "student.query@gmail.com", amountINR: 299, reason: "Accidental double checkout", status: "Under Review", refundTxnId: "Pending", filedDate: "2026-11-07", active: true }
        ]
      };
      return this._hydrateConfig('cso_refunds_config', 'refunds', () => DEFAULT_REFUNDS);
    },
    saveRefundsDisputesConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.refunds = cfg.items || cfg.refunds || [];
      cfg.items = cfg.refunds;
      localStorage.setItem('cso_refunds_config', JSON.stringify(cfg));
      this.logAudit("REFUNDS_DISPUTES_SAVED", "FINANCE", "Refunds & Disputes registry updated with " + cfg.items.length + " entries.");
    },
    resetRefundsDisputesConfig() {
      const DEFAULT_REFUNDS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "REF-01", disputeId: "DISP-2026-08", originalOrderRef: "ORD-2026-501", userEmail: "user.issue@gmail.com", amountINR: 499, reason: "Duplicate charge via UPI network glitch", status: "Resolved", refundTxnId: "rfnd_OkLd9912", filedDate: "2026-11-02", active: true },
          { id: "REF-02", disputeId: "DISP-2026-09", originalOrderRef: "ORD-2026-502", userEmail: "student.query@gmail.com", amountINR: 299, reason: "Accidental double checkout", status: "Under Review", refundTxnId: "Pending", filedDate: "2026-11-07", active: true }
        ]
      };
      localStorage.setItem('cso_refunds_config', JSON.stringify(DEFAULT_REFUNDS));
      this.logAudit("REFUNDS_DISPUTES_RESET", "FINANCE", "Refunds & Disputes registry restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_REFUNDS));
    },
    exportRefundsDisputesManifest() {
      const config = this.getRefundsDisputesConfig();
      const filename = "refunds_disputes_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("REFUNDS_DISPUTES_EXPORTED", "DATA_EXPORT", "Refunds & Disputes manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 08-012: Invoices & Receipts ---
    getInvoicesReceiptsConfig() {
      const DEFAULT_INVOICES = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "INV-901", invoiceNumber: "CSO-INV-2026-901", customerName: "Subhashree Nayak", state: "Odisha (21)", taxableAmountINR: 422.88, gstAmountINR: 76.12, totalAmountINR: 499.00, invoiceDate: "2026-11-08", hsnSac: "998431", status: "Paid", active: true },
          { id: "INV-902", invoiceNumber: "CSO-INV-2026-902", customerName: "Manoj Das", state: "Odisha (21)", taxableAmountINR: 253.39, gstAmountINR: 45.61, totalAmountINR: 299.00, invoiceDate: "2026-11-08", hsnSac: "998431", status: "Paid", active: true },
          { id: "INV-903", invoiceNumber: "CSO-INV-2026-903", customerName: "Amitav Patnaik", state: "Odisha (21)", taxableAmountINR: 846.61, gstAmountINR: 152.39, totalAmountINR: 999.00, invoiceDate: "2026-11-09", hsnSac: "998431", status: "Paid", active: true }
        ]
      };
      return this._hydrateConfig('cso_invoices_config', 'invoices', () => DEFAULT_INVOICES);
    },
    saveInvoicesReceiptsConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.invoices = cfg.items || cfg.invoices || [];
      cfg.items = cfg.invoices;
      localStorage.setItem('cso_invoices_config', JSON.stringify(cfg));
      this.logAudit("INVOICES_RECEIPTS_SAVED", "FINANCE", "Invoices & Receipts registry updated with " + cfg.items.length + " entries.");
    },
    resetInvoicesReceiptsConfig() {
      const DEFAULT_INVOICES = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "INV-901", invoiceNumber: "CSO-INV-2026-901", customerName: "Subhashree Nayak", state: "Odisha (21)", taxableAmountINR: 422.88, gstAmountINR: 76.12, totalAmountINR: 499.00, invoiceDate: "2026-11-08", hsnSac: "998431", status: "Paid", active: true },
          { id: "INV-902", invoiceNumber: "CSO-INV-2026-902", customerName: "Manoj Das", state: "Odisha (21)", taxableAmountINR: 253.39, gstAmountINR: 45.61, totalAmountINR: 299.00, invoiceDate: "2026-11-08", hsnSac: "998431", status: "Paid", active: true },
          { id: "INV-903", invoiceNumber: "CSO-INV-2026-903", customerName: "Amitav Patnaik", state: "Odisha (21)", taxableAmountINR: 846.61, gstAmountINR: 152.39, totalAmountINR: 999.00, invoiceDate: "2026-11-09", hsnSac: "998431", status: "Paid", active: true }
        ]
      };
      localStorage.setItem('cso_invoices_config', JSON.stringify(DEFAULT_INVOICES));
      this.logAudit("INVOICES_RECEIPTS_RESET", "FINANCE", "Invoices & Receipts registry restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_INVOICES));
    },
    exportInvoicesReceiptsManifest() {
      const config = this.getInvoicesReceiptsConfig();
      const filename = "invoices_receipts_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("INVOICES_RECEIPTS_EXPORTED", "DATA_EXPORT", "Invoices & Receipts manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 08-013: Tax Configuration ---
    getTaxConfigurationConfig() {
      const DEFAULT_TAX_CONFIG = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        taxSettings: { gstin: "21AAACC1206M1ZV", stateCode: "21 (Odisha)", compositionScheme: false, defaultCurrency: "INR" },
        items: [
          { id: "TAX-01", taxRuleName: "Intra-State Digital Education GST", slabType: "GST 18%", cgstRate: 9.0, sgstRate: 9.0, igstRate: 0.0, sacHsn: "998431", applicability: "Odisha Candidates", active: true },
          { id: "TAX-02", taxRuleName: "Inter-State Digital Subscription IGST", slabType: "IGST 18%", cgstRate: 0.0, sgstRate: 0.0, igstRate: 18.0, sacHsn: "998431", applicability: "Rest of India Candidates", active: true },
          { id: "TAX-03", taxRuleName: "Printed Gazettes & Exempt Publications", slabType: "Exempt (0%)", cgstRate: 0.0, sgstRate: 0.0, igstRate: 0.0, sacHsn: "490110", applicability: "Physical Study Materials", active: true }
        ]
      };
      return this._hydrateConfig('cso_tax_configuration_config', 'rules', () => DEFAULT_TAX_CONFIG);
    },
    saveTaxConfigurationConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.rules = cfg.items || cfg.rules || [];
      cfg.items = cfg.rules;
      localStorage.setItem('cso_tax_configuration_config', JSON.stringify(cfg));
      this.logAudit("TAX_CONFIGURATION_SAVED", "FINANCE", "Tax Configuration updated with " + cfg.items.length + " rules.");
    },
    resetTaxConfigurationConfig() {
      const DEFAULT_TAX_CONFIG = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        taxSettings: { gstin: "21AAACC1206M1ZV", stateCode: "21 (Odisha)", compositionScheme: false, defaultCurrency: "INR" },
        items: [
          { id: "TAX-01", taxRuleName: "Intra-State Digital Education GST", slabType: "GST 18%", cgstRate: 9.0, sgstRate: 9.0, igstRate: 0.0, sacHsn: "998431", applicability: "Odisha Candidates", active: true },
          { id: "TAX-02", taxRuleName: "Inter-State Digital Subscription IGST", slabType: "IGST 18%", cgstRate: 0.0, sgstRate: 0.0, igstRate: 18.0, sacHsn: "998431", applicability: "Rest of India Candidates", active: true },
          { id: "TAX-03", taxRuleName: "Printed Gazettes & Exempt Publications", slabType: "Exempt (0%)", cgstRate: 0.0, sgstRate: 0.0, igstRate: 0.0, sacHsn: "490110", applicability: "Physical Study Materials", active: true }
        ]
      };
      localStorage.setItem('cso_tax_configuration_config', JSON.stringify(DEFAULT_TAX_CONFIG));
      this.logAudit("TAX_CONFIGURATION_RESET", "FINANCE", "Tax Configuration restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_TAX_CONFIG));
    },
    exportTaxConfigurationManifest() {
      const config = this.getTaxConfigurationConfig();
      const filename = "tax_configuration_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("TAX_CONFIGURATION_EXPORTED", "DATA_EXPORT", "Tax configuration manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 08-014: Payouts & Settlements ---
    getPayoutsSettlementsConfig() {
      const DEFAULT_PAYOUTS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { totalSettledINR: 425900, pendingPayoutINR: 18240, gatewayFeesDeductedINR: 9820 },
        items: [
          { id: "PAY-901", payoutRef: "SETTL-2026-901", gateway: "Razorpay", bankAccount: "HDFC Bank (Acct: ...8821)", grossAmountINR: 84500, deductionsINR: 1690, netAmountINR: 82810, utrNumber: "UTRHDFC091823901", settlementDate: "2026-11-06", status: "Settled", active: true },
          { id: "PAY-902", payoutRef: "SETTL-2026-902", gateway: "Cashfree", bankAccount: "HDFC Bank (Acct: ...8821)", grossAmountINR: 42100, deductionsINR: 842, netAmountINR: 41258, utrNumber: "UTRHDFC091824110", settlementDate: "2026-11-07", status: "Settled", active: true },
          { id: "PAY-903", payoutRef: "SETTL-2026-903", gateway: "Razorpay", bankAccount: "HDFC Bank (Acct: ...8821)", grossAmountINR: 18600, deductionsINR: 372, netAmountINR: 18228, utrNumber: "Processing...", settlementDate: "2026-11-09", status: "In Transit", active: true }
        ]
      };
      return this._hydrateConfig('cso_payouts_settlements_config', 'settlements', () => DEFAULT_PAYOUTS);
    },
    savePayoutsSettlementsConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.settlements = cfg.items || cfg.settlements || [];
      cfg.items = cfg.settlements;
      localStorage.setItem('cso_payouts_settlements_config', JSON.stringify(cfg));
      this.logAudit("PAYOUTS_SETTLEMENTS_SAVED", "FINANCE", "Payouts & Settlements updated with " + cfg.items.length + " entries.");
    },
    resetPayoutsSettlementsConfig() {
      const DEFAULT_PAYOUTS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { totalSettledINR: 425900, pendingPayoutINR: 18240, gatewayFeesDeductedINR: 9820 },
        items: [
          { id: "PAY-901", payoutRef: "SETTL-2026-901", gateway: "Razorpay", bankAccount: "HDFC Bank (Acct: ...8821)", grossAmountINR: 84500, deductionsINR: 1690, netAmountINR: 82810, utrNumber: "UTRHDFC091823901", settlementDate: "2026-11-06", status: "Settled", active: true },
          { id: "PAY-902", payoutRef: "SETTL-2026-902", gateway: "Cashfree", bankAccount: "HDFC Bank (Acct: ...8821)", grossAmountINR: 42100, deductionsINR: 842, netAmountINR: 41258, utrNumber: "UTRHDFC091824110", settlementDate: "2026-11-07", status: "Settled", active: true },
          { id: "PAY-903", payoutRef: "SETTL-2026-903", gateway: "Razorpay", bankAccount: "HDFC Bank (Acct: ...8821)", grossAmountINR: 18600, deductionsINR: 372, netAmountINR: 18228, utrNumber: "Processing...", settlementDate: "2026-11-09", status: "In Transit", active: true }
        ]
      };
      localStorage.setItem('cso_payouts_settlements_config', JSON.stringify(DEFAULT_PAYOUTS));
      this.logAudit("PAYOUTS_SETTLEMENTS_RESET", "FINANCE", "Payouts & Settlements restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_PAYOUTS));
    },
    exportPayoutsSettlementsManifest() {
      const config = this.getPayoutsSettlementsConfig();
      const filename = "payouts_settlements_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("PAYOUTS_SETTLEMENTS_EXPORTED", "DATA_EXPORT", "Payouts & Settlements manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 08-015: Reconciliation ---
    getReconciliationConfig() {
      const DEFAULT_RECONCILIATION = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { totalAuditedCount: 1420, matchedCount: 1418, discrepancyCount: 2, matchedPercentage: "99.85%" },
        items: [
          { id: "REC-01", cyclePeriod: "November 2026 (W1)", gatewayLedgerINR: 145200, bankCreditINR: 145200, varianceINR: 0, status: "Fully Reconciled", auditedDate: "2026-11-07", active: true },
          { id: "REC-02", cyclePeriod: "October 2026 (Full)", gatewayLedgerINR: 280700, bankCreditINR: 280700, varianceINR: 0, status: "Fully Reconciled", auditedDate: "2026-11-01", active: true },
          { id: "REC-03", cyclePeriod: "Current Open Cycle", gatewayLedgerINR: 56600, bankCreditINR: 56101, varianceINR: -499, status: "Pending Settlement Window", auditedDate: "2026-11-09", active: true }
        ]
      };
      return this._hydrateConfig('cso_reconciliation_config', 'cycles', () => DEFAULT_RECONCILIATION);
    },
    saveReconciliationConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.cycles = cfg.items || cfg.cycles || [];
      cfg.items = cfg.cycles;
      localStorage.setItem('cso_reconciliation_config', JSON.stringify(cfg));
      this.logAudit("RECONCILIATION_SAVED", "FINANCE", "Reconciliation cycles updated with " + cfg.items.length + " periods.");
    },
    resetReconciliationConfig() {
      const DEFAULT_RECONCILIATION = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { totalAuditedCount: 1420, matchedCount: 1418, discrepancyCount: 2, matchedPercentage: "99.85%" },
        items: [
          { id: "REC-01", cyclePeriod: "November 2026 (W1)", gatewayLedgerINR: 145200, bankCreditINR: 145200, varianceINR: 0, status: "Fully Reconciled", auditedDate: "2026-11-07", active: true },
          { id: "REC-02", cyclePeriod: "October 2026 (Full)", gatewayLedgerINR: 280700, bankCreditINR: 280700, varianceINR: 0, status: "Fully Reconciled", auditedDate: "2026-11-01", active: true },
          { id: "REC-03", cyclePeriod: "Current Open Cycle", gatewayLedgerINR: 56600, bankCreditINR: 56101, varianceINR: -499, status: "Pending Settlement Window", auditedDate: "2026-11-09", active: true }
        ]
      };
      localStorage.setItem('cso_reconciliation_config', JSON.stringify(DEFAULT_RECONCILIATION));
      this.logAudit("RECONCILIATION_RESET", "FINANCE", "Reconciliation cycles restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_RECONCILIATION));
    },
    exportReconciliationManifest() {
      const config = this.getReconciliationConfig();
      const filename = "reconciliation_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("RECONCILIATION_EXPORTED", "DATA_EXPORT", "Reconciliation manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 08-016: Finance Reports ---
    getFinanceReportsConfig() {
      const DEFAULT_FINANCE_REPORTS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "REP-01", reportTitle: "Monthly P&L & Revenue Statement (October 2026)", period: "2026-10", grossRevenueINR: 280700, taxLiabilityINR: 42800, operationalCostsINR: 35000, netOperatingProfitINR: 202900, fileFormat: "PDF & CSV", active: true },
          { id: "REP-02", reportTitle: "Q2 FY26 Comprehensive Financial Audit", period: "Q2 FY2026-27", grossRevenueINR: 760400, taxLiabilityINR: 116000, operationalCostsINR: 92000, netOperatingProfitINR: 552400, fileFormat: "PDF & CSV", active: true },
          { id: "REP-03", reportTitle: "Gateway Processing Fees & Interchange Expense Ledger", period: "2026-10", grossRevenueINR: 280700, taxLiabilityINR: 0, operationalCostsINR: 5614, netOperatingProfitINR: -5614, fileFormat: "CSV", active: true }
        ]
      };
      return this._hydrateConfig('cso_finance_reports_config', 'reports', () => DEFAULT_FINANCE_REPORTS);
    },
    saveFinanceReportsConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.reports = cfg.items || cfg.reports || [];
      cfg.items = cfg.reports;
      localStorage.setItem('cso_finance_reports_config', JSON.stringify(cfg));
      this.logAudit("FINANCE_REPORTS_SAVED", "FINANCE", "Finance Reports registry updated with " + cfg.items.length + " statements.");
    },
    resetFinanceReportsConfig() {
      const DEFAULT_FINANCE_REPORTS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "REP-01", reportTitle: "Monthly P&L & Revenue Statement (October 2026)", period: "2026-10", grossRevenueINR: 280700, taxLiabilityINR: 42800, operationalCostsINR: 35000, netOperatingProfitINR: 202900, fileFormat: "PDF & CSV", active: true },
          { id: "REP-02", reportTitle: "Q2 FY26 Comprehensive Financial Audit", period: "Q2 FY2026-27", grossRevenueINR: 760400, taxLiabilityINR: 116000, operationalCostsINR: 92000, netOperatingProfitINR: 552400, fileFormat: "PDF & CSV", active: true },
          { id: "REP-03", reportTitle: "Gateway Processing Fees & Interchange Expense Ledger", period: "2026-10", grossRevenueINR: 280700, taxLiabilityINR: 0, operationalCostsINR: 5614, netOperatingProfitINR: -5614, fileFormat: "CSV", active: true }
        ]
      };
      localStorage.setItem('cso_finance_reports_config', JSON.stringify(DEFAULT_FINANCE_REPORTS));
      this.logAudit("FINANCE_REPORTS_RESET", "FINANCE", "Finance Reports registry restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_FINANCE_REPORTS));
    },
    exportFinanceReportsManifest() {
      const config = this.getFinanceReportsConfig();
      const filename = "finance_reports_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("FINANCE_REPORTS_EXPORTED", "DATA_EXPORT", "Finance Reports manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 08-017: Payment Webhooks ---
    getPaymentWebhooksConfig() {
      const DEFAULT_WEBHOOKS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "WHK-101", eventId: "evt_rzp_pay_90112", provider: "Razorpay", eventType: "payment.captured", entityId: "pay_PkJd9124", httpStatus: 200, deliveryStatus: "Delivered", timestamp: "2026-11-08 14:22:11", active: true },
          { id: "WHK-102", eventId: "evt_cf_ord_84102", provider: "Cashfree", eventType: "order.paid", entityId: "order_cf_9941", httpStatus: 200, deliveryStatus: "Delivered", timestamp: "2026-11-08 15:45:02", active: true },
          { id: "WHK-103", eventId: "evt_rzp_rfnd_1029", provider: "Razorpay", eventType: "refund.processed", entityId: "rfnd_OkLd9912", httpStatus: 200, deliveryStatus: "Delivered", timestamp: "2026-11-02 11:10:05", active: true }
        ]
      };
      return this._hydrateConfig('cso_payment_webhooks_config', 'logs', () => DEFAULT_WEBHOOKS);
    },
    savePaymentWebhooksConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.logs = cfg.items || cfg.logs || [];
      cfg.items = cfg.logs;
      localStorage.setItem('cso_payment_webhooks_config', JSON.stringify(cfg));
      this.logAudit("PAYMENT_WEBHOOKS_SAVED", "FINANCE", "Payment Webhooks log updated with " + cfg.items.length + " events.");
    },
    resetPaymentWebhooksConfig() {
      const DEFAULT_WEBHOOKS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "WHK-101", eventId: "evt_rzp_pay_90112", provider: "Razorpay", eventType: "payment.captured", entityId: "pay_PkJd9124", httpStatus: 200, deliveryStatus: "Delivered", timestamp: "2026-11-08 14:22:11", active: true },
          { id: "WHK-102", eventId: "evt_cf_ord_84102", provider: "Cashfree", eventType: "order.paid", entityId: "order_cf_9941", httpStatus: 200, deliveryStatus: "Delivered", timestamp: "2026-11-08 15:45:02", active: true },
          { id: "WHK-103", eventId: "evt_rzp_rfnd_1029", provider: "Razorpay", eventType: "refund.processed", entityId: "rfnd_OkLd9912", httpStatus: 200, deliveryStatus: "Delivered", timestamp: "2026-11-02 11:10:05", active: true }
        ]
      };
      localStorage.setItem('cso_payment_webhooks_config', JSON.stringify(DEFAULT_WEBHOOKS));
      this.logAudit("PAYMENT_WEBHOOKS_RESET", "FINANCE", "Payment Webhooks log restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_WEBHOOKS));
    },
    exportPaymentWebhooksManifest() {
      const config = this.getPaymentWebhooksConfig();
      const filename = "payment_webhooks_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("PAYMENT_WEBHOOKS_EXPORTED", "DATA_EXPORT", "Payment Webhooks log manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 08-018: Fraud & Risk Events ---
    getFraudRiskConfig() {
      const DEFAULT_FRAUD_RISK = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        riskPolicy: { maxFailedAttemptsPerIP: 3, blockAnonymousVPN: true, geoFencingIndiaOnly: true },
        items: [
          { id: "RISK-01", eventCode: "VEL-LIMIT-EXCEED", targetIdentifier: "IP: 185.220.101.45 (Tor Exit Node)", riskScore: "95/100 (Critical)", autoAction: "Auto-Blocked at Edge", eventTimestamp: "2026-11-07 03:14:22", active: true },
          { id: "RISK-02", eventCode: "MULTIPLE-CARD-FAIL", targetIdentifier: "candidate.spoof@tempmail.com", riskScore: "78/100 (High)", autoAction: "Rate-Limited (24h cooldown)", eventTimestamp: "2026-11-08 21:05:40", active: true },
          { id: "RISK-03", eventCode: "UNUSUAL-LOCATION-SPIKE", targetIdentifier: "Session: AS9121 (Non-IN Origin)", riskScore: "50/100 (Medium)", autoAction: "Mandatory OTP Challenge Enforced", eventTimestamp: "2026-11-09 10:12:15", active: true }
        ]
      };
      return this._hydrateConfig('cso_fraud_risk_config', 'events', () => DEFAULT_FRAUD_RISK);
    },
    saveFraudRiskConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.events = cfg.items || cfg.events || [];
      cfg.items = cfg.events;
      localStorage.setItem('cso_fraud_risk_config', JSON.stringify(cfg));
      this.logAudit("FRAUD_RISK_SAVED", "FINANCE", "Fraud & Risk events updated with " + cfg.items.length + " incidents.");
    },
    resetFraudRiskConfig() {
      const DEFAULT_FRAUD_RISK = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        riskPolicy: { maxFailedAttemptsPerIP: 3, blockAnonymousVPN: true, geoFencingIndiaOnly: true },
        items: [
          { id: "RISK-01", eventCode: "VEL-LIMIT-EXCEED", targetIdentifier: "IP: 185.220.101.45 (Tor Exit Node)", riskScore: "95/100 (Critical)", autoAction: "Auto-Blocked at Edge", eventTimestamp: "2026-11-07 03:14:22", active: true },
          { id: "RISK-02", eventCode: "MULTIPLE-CARD-FAIL", targetIdentifier: "candidate.spoof@tempmail.com", riskScore: "78/100 (High)", autoAction: "Rate-Limited (24h cooldown)", eventTimestamp: "2026-11-08 21:05:40", active: true },
          { id: "RISK-03", eventCode: "UNUSUAL-LOCATION-SPIKE", targetIdentifier: "Session: AS9121 (Non-IN Origin)", riskScore: "50/100 (Medium)", autoAction: "Mandatory OTP Challenge Enforced", eventTimestamp: "2026-11-09 10:12:15", active: true }
        ]
      };
      localStorage.setItem('cso_fraud_risk_config', JSON.stringify(DEFAULT_FRAUD_RISK));
      this.logAudit("FRAUD_RISK_RESET", "FINANCE", "Fraud & Risk events restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_FRAUD_RISK));
    },
    exportFraudRiskManifest() {
      const config = this.getFraudRiskConfig();
      const filename = "fraud_risk_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("FRAUD_RISK_EXPORTED", "DATA_EXPORT", "Fraud & Risk manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 09-001: All Users ---
    getAllUsersConfig() {
      const DEFAULT_ALL_USERS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { totalUsers: 48920, verifiedUsers: 46210, pendingVerification: 2710 },
        items: [
          { id: "USR-1001", name: "Ramesh Chandra Behera", email: "ramesh.behera@gmail.com", role: "Aspirant", district: "Balasore", joinedDate: "2026-02-14", status: "Active", active: true },
          { id: "USR-1002", name: "Subhashree Mohanty", email: "subhashree.m@gmail.com", role: "Contributor", district: "Cuttack", joinedDate: "2026-03-10", status: "Active", active: true },
          { id: "USR-1003", name: "Debabrata Nayak", email: "debabrata.n@gmail.com", role: "Faculty / Reviewer", district: "Khordha (Bhubaneswar)", joinedDate: "2026-01-20", status: "Active", active: true },
          { id: "USR-1004", name: "Pooja Priyadarshini", email: "pooja.p@gmail.com", role: "Aspirant", district: "Mayurbhanj", joinedDate: "2026-05-18", status: "Active", active: true }
        ]
      };
      return this._hydrateConfig('cso_all_users_config', 'users', () => DEFAULT_ALL_USERS);
    },
    saveAllUsersConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.users = cfg.items || cfg.users || [];
      cfg.items = cfg.users;
      localStorage.setItem('cso_all_users_config', JSON.stringify(cfg));
      this.logAudit("ALL_USERS_SAVED", "USERS_RBAC", "All Users directory updated with " + cfg.items.length + " accounts.");
    },
    resetAllUsersConfig() {
      const DEFAULT_ALL_USERS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { totalUsers: 48920, verifiedUsers: 46210, pendingVerification: 2710 },
        items: [
          { id: "USR-1001", name: "Ramesh Chandra Behera", email: "ramesh.behera@gmail.com", role: "Aspirant", district: "Balasore", joinedDate: "2026-02-14", status: "Active", active: true },
          { id: "USR-1002", name: "Subhashree Mohanty", email: "subhashree.m@gmail.com", role: "Contributor", district: "Cuttack", joinedDate: "2026-03-10", status: "Active", active: true },
          { id: "USR-1003", name: "Debabrata Nayak", email: "debabrata.n@gmail.com", role: "Faculty / Reviewer", district: "Khordha (Bhubaneswar)", joinedDate: "2026-01-20", status: "Active", active: true },
          { id: "USR-1004", name: "Pooja Priyadarshini", email: "pooja.p@gmail.com", role: "Aspirant", district: "Mayurbhanj", joinedDate: "2026-05-18", status: "Active", active: true }
        ]
      };
      localStorage.setItem('cso_all_users_config', JSON.stringify(DEFAULT_ALL_USERS));
      this.logAudit("ALL_USERS_RESET", "USERS_RBAC", "All Users directory restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_ALL_USERS));
    },
    exportAllUsersManifest() {
      const config = this.getAllUsersConfig();
      const filename = "all_users_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("ALL_USERS_EXPORTED", "DATA_EXPORT", "All Users directory manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 09-002: User Profiles ---
    getUserProfilesConfig() {
      const DEFAULT_USER_PROFILES = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "PRF-01", userId: "USR-1001", fullName: "Ramesh Chandra Behera", targetExams: ["OPSC OAS", "OSSC CGL"], education: "B.A. Political Science (F.M. University)", district: "Balasore", phone: "+91 94370 XXXXX", profileCompletion: "90%", active: true },
          { id: "PRF-02", userId: "USR-1002", fullName: "Subhashree Mohanty", targetExams: ["OSSSC RI / Amin", "OTET"], education: "B.Ed. & M.A. Odia (Ravenshaw University)", district: "Cuttack", phone: "+91 98610 XXXXX", profileCompletion: "100%", active: true },
          { id: "PRF-03", userId: "USR-1003", fullName: "Debabrata Nayak", targetExams: ["Odisha Judicial Service", "OAS Group A"], education: "LL.B. (Utkal University)", district: "Khordha", phone: "+91 70080 XXXXX", profileCompletion: "95%", active: true }
        ]
      };
      return this._hydrateConfig('cso_user_profiles_config', 'profiles', () => DEFAULT_USER_PROFILES);
    },
    saveUserProfilesConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.profiles = cfg.items || cfg.profiles || [];
      cfg.items = cfg.profiles;
      localStorage.setItem('cso_user_profiles_config', JSON.stringify(cfg));
      this.logAudit("USER_PROFILES_SAVED", "USERS_RBAC", "User Profiles directory updated with " + cfg.items.length + " records.");
    },
    resetUserProfilesConfig() {
      const DEFAULT_USER_PROFILES = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "PRF-01", userId: "USR-1001", fullName: "Ramesh Chandra Behera", targetExams: ["OPSC OAS", "OSSC CGL"], education: "B.A. Political Science (F.M. University)", district: "Balasore", phone: "+91 94370 XXXXX", profileCompletion: "90%", active: true },
          { id: "PRF-02", userId: "USR-1002", fullName: "Subhashree Mohanty", targetExams: ["OSSSC RI / Amin", "OTET"], education: "B.Ed. & M.A. Odia (Ravenshaw University)", district: "Cuttack", phone: "+91 98610 XXXXX", profileCompletion: "100%", active: true },
          { id: "PRF-03", userId: "USR-1003", fullName: "Debabrata Nayak", targetExams: ["Odisha Judicial Service", "OAS Group A"], education: "LL.B. (Utkal University)", district: "Khordha", phone: "+91 70080 XXXXX", profileCompletion: "95%", active: true }
        ]
      };
      localStorage.setItem('cso_user_profiles_config', JSON.stringify(DEFAULT_USER_PROFILES));
      this.logAudit("USER_PROFILES_RESET", "USERS_RBAC", "User Profiles directory restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_USER_PROFILES));
    },
    exportUserProfilesManifest() {
      const config = this.getUserProfilesConfig();
      const filename = "user_profiles_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("USER_PROFILES_EXPORTED", "DATA_EXPORT", "User Profiles manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 09-003: Roles & Permissions ---
    getRolesPermissionsConfig() {
      const DEFAULT_ROLES_PERMISSIONS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "ROLE-01", roleCode: "SUPER_ADMIN", roleTitle: "Super Administrator", accessLevel: "Full Root (All 241 Modules)", userCount: 2, isSystem: true, active: true },
          { id: "ROLE-02", roleCode: "CONTENT_EDITOR", roleTitle: "Editorial & Gazette Editor", accessLevel: "Publishing, Library, Syllabi (Folders 04-06)", userCount: 6, isSystem: false, active: true },
          { id: "ROLE-03", roleCode: "COMMUNITY_MODERATOR", roleTitle: "District Forum Moderator", accessLevel: "Community, Comments, Reports (Folder 09)", userCount: 12, isSystem: false, active: true },
          { id: "ROLE-04", roleCode: "ASPIRANT_MEMBER", roleTitle: "Registered Aspirant", accessLevel: "Public Portal, Mocks, Forums, Resource Vault", userCount: 48900, isSystem: true, active: true }
        ]
      };
      return this._hydrateConfig('cso_roles_permissions_config', 'roles', () => DEFAULT_ROLES_PERMISSIONS);
    },
    saveRolesPermissionsConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.roles = cfg.items || cfg.roles || [];
      cfg.items = cfg.roles;
      localStorage.setItem('cso_roles_permissions_config', JSON.stringify(cfg));
      this.logAudit("ROLES_PERMISSIONS_SAVED", "USERS_RBAC", "Roles & Permissions catalog updated with " + cfg.items.length + " roles.");
    },
    resetRolesPermissionsConfig() {
      const DEFAULT_ROLES_PERMISSIONS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "ROLE-01", roleCode: "SUPER_ADMIN", roleTitle: "Super Administrator", accessLevel: "Full Root (All 241 Modules)", userCount: 2, isSystem: true, active: true },
          { id: "ROLE-02", roleCode: "CONTENT_EDITOR", roleTitle: "Editorial & Gazette Editor", accessLevel: "Publishing, Library, Syllabi (Folders 04-06)", userCount: 6, isSystem: false, active: true },
          { id: "ROLE-03", roleCode: "COMMUNITY_MODERATOR", roleTitle: "District Forum Moderator", accessLevel: "Community, Comments, Reports (Folder 09)", userCount: 12, isSystem: false, active: true },
          { id: "ROLE-04", roleCode: "ASPIRANT_MEMBER", roleTitle: "Registered Aspirant", accessLevel: "Public Portal, Mocks, Forums, Resource Vault", userCount: 48900, isSystem: true, active: true }
        ]
      };
      localStorage.setItem('cso_roles_permissions_config', JSON.stringify(DEFAULT_ROLES_PERMISSIONS));
      this.logAudit("ROLES_PERMISSIONS_RESET", "USERS_RBAC", "Roles & Permissions catalog restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_ROLES_PERMISSIONS));
    },
    exportRolesPermissionsManifest() {
      const config = this.getRolesPermissionsConfig();
      const filename = "roles_permissions_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("ROLES_PERMISSIONS_EXPORTED", "DATA_EXPORT", "Roles & Permissions manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 09-004: Admin Accounts ---
    getAdminAccountsConfig() {
      const DEFAULT_ADMIN_ACCOUNTS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "ADM-01", username: "admin@csodisha.com", displayName: "Root Command Suite", role: "SUPER_ADMIN", twoFactorEnabled: true, lastLogin: "2026-11-09 20:15", ipAllowlist: "Static / VPN", active: true },
          { id: "ADM-02", username: "editor.jobs@csodisha.com", displayName: "Recruitment Lead Desk", role: "CONTENT_EDITOR", twoFactorEnabled: true, lastLogin: "2026-11-09 17:40", ipAllowlist: "Any", active: true },
          { id: "ADM-03", username: "mod.community@csodisha.com", displayName: "Lead Community Moderator", role: "COMMUNITY_MODERATOR", twoFactorEnabled: false, lastLogin: "2026-11-08 19:10", ipAllowlist: "Any", active: true }
        ]
      };
      return this._hydrateConfig('cso_admin_accounts_config', 'admins', () => DEFAULT_ADMIN_ACCOUNTS);
    },
    saveAdminAccountsConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.admins = cfg.items || cfg.admins || [];
      cfg.items = cfg.admins;
      localStorage.setItem('cso_admin_accounts_config', JSON.stringify(cfg));
      this.logAudit("ADMIN_ACCOUNTS_SAVED", "USERS_RBAC", "Admin Accounts registry updated with " + cfg.items.length + " administrative operators.");
    },
    resetAdminAccountsConfig() {
      const DEFAULT_ADMIN_ACCOUNTS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "ADM-01", username: "admin@csodisha.com", displayName: "Root Command Suite", role: "SUPER_ADMIN", twoFactorEnabled: true, lastLogin: "2026-11-09 20:15", ipAllowlist: "Static / VPN", active: true },
          { id: "ADM-02", username: "editor.jobs@csodisha.com", displayName: "Recruitment Lead Desk", role: "CONTENT_EDITOR", twoFactorEnabled: true, lastLogin: "2026-11-09 17:40", ipAllowlist: "Any", active: true },
          { id: "ADM-03", username: "mod.community@csodisha.com", displayName: "Lead Community Moderator", role: "COMMUNITY_MODERATOR", twoFactorEnabled: false, lastLogin: "2026-11-08 19:10", ipAllowlist: "Any", active: true }
        ]
      };
      localStorage.setItem('cso_admin_accounts_config', JSON.stringify(DEFAULT_ADMIN_ACCOUNTS));
      this.logAudit("ADMIN_ACCOUNTS_RESET", "USERS_RBAC", "Admin Accounts registry restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_ADMIN_ACCOUNTS));
    },
    exportAdminAccountsManifest() {
      const config = this.getAdminAccountsConfig();
      const filename = "admin_accounts_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("ADMIN_ACCOUNTS_EXPORTED", "DATA_EXPORT", "Admin Accounts manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 09-005: Account Status ---
    getAccountStatusConfig() {
      const DEFAULT_ACCOUNT_STATUS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { totalActive: 47820, suspendedCount: 14, shadowBanned: 3, pendingKycVerification: 1083 },
        items: [
          { id: "AST-01", userRef: "USR-1001", email: "ramesh.behera@gmail.com", currentState: "Active", riskTier: "Low", lastStateChange: "2026-02-14", moderatorNotes: "Clean history", active: true },
          { id: "AST-02", userRef: "USR-9481", email: "spam.test@tempmail.com", currentState: "Suspended", riskTier: "Critical", lastStateChange: "2026-11-04", moderatorNotes: "Commercial ad link spam in Balasore forum", active: false },
          { id: "AST-03", userRef: "USR-8821", email: "disputed.user@gmail.com", currentState: "Shadow Banned", riskTier: "High", lastStateChange: "2026-10-28", moderatorNotes: "Abusive comment reports under review", active: false }
        ]
      };
      return this._hydrateConfig('cso_account_status_config', 'statuses', () => DEFAULT_ACCOUNT_STATUS);
    },
    saveAccountStatusConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.statuses = cfg.items || cfg.statuses || [];
      cfg.items = cfg.statuses;
      localStorage.setItem('cso_account_status_config', JSON.stringify(cfg));
      this.logAudit("ACCOUNT_STATUS_SAVED", "USERS_RBAC", "Account Status registry updated with " + cfg.items.length + " moderation states.");
    },
    resetAccountStatusConfig() {
      const DEFAULT_ACCOUNT_STATUS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { totalActive: 47820, suspendedCount: 14, shadowBanned: 3, pendingKycVerification: 1083 },
        items: [
          { id: "AST-01", userRef: "USR-1001", email: "ramesh.behera@gmail.com", currentState: "Active", riskTier: "Low", lastStateChange: "2026-02-14", moderatorNotes: "Clean history", active: true },
          { id: "AST-02", userRef: "USR-9481", email: "spam.test@tempmail.com", currentState: "Suspended", riskTier: "Critical", lastStateChange: "2026-11-04", moderatorNotes: "Commercial ad link spam in Balasore forum", active: false },
          { id: "AST-03", userRef: "USR-8821", email: "disputed.user@gmail.com", currentState: "Shadow Banned", riskTier: "High", lastStateChange: "2026-10-28", moderatorNotes: "Abusive comment reports under review", active: false }
        ]
      };
      localStorage.setItem('cso_account_status_config', JSON.stringify(DEFAULT_ACCOUNT_STATUS));
      this.logAudit("ACCOUNT_STATUS_RESET", "USERS_RBAC", "Account Status registry restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_ACCOUNT_STATUS));
    },
    exportAccountStatusManifest() {
      const config = this.getAccountStatusConfig();
      const filename = "account_status_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("ACCOUNT_STATUS_EXPORTED", "DATA_EXPORT", "Account Status manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 09-006: Registrations ---
    getRegistrationsConfig() {
      const DEFAULT_REGISTRATIONS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { allowPublicRegistration: true, requireEmailVerification: true, enableCaptcha: true },
        items: [
          { id: "REG-901", candidateEmail: "chinmay.jena@gmail.com", district: "Bhadrak", sourceChannel: "Direct Web", verificationStatus: "Verified", registeredAt: "2026-11-09 18:30", active: true },
          { id: "REG-902", candidateEmail: "lipika.sahoo@gmail.com", district: "Puri", sourceChannel: "Telegram Channel Link", verificationStatus: "Verified", registeredAt: "2026-11-09 19:12", active: true },
          { id: "REG-903", candidateEmail: "tanmay.das@gmail.com", district: "Sambalpur", sourceChannel: "Mock Test Landing Page", verificationStatus: "Pending OTP", registeredAt: "2026-11-09 20:05", active: true }
        ]
      };
      return this._hydrateConfig('cso_registrations_config', 'registrations', () => DEFAULT_REGISTRATIONS);
    },
    saveRegistrationsConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.registrations = cfg.items || cfg.registrations || [];
      cfg.items = cfg.registrations;
      localStorage.setItem('cso_registrations_config', JSON.stringify(cfg));
      this.logAudit("REGISTRATIONS_SAVED", "USERS_RBAC", "Registrations stream updated with " + cfg.items.length + " signups.");
    },
    resetRegistrationsConfig() {
      const DEFAULT_REGISTRATIONS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { allowPublicRegistration: true, requireEmailVerification: true, enableCaptcha: true },
        items: [
          { id: "REG-901", candidateEmail: "chinmay.jena@gmail.com", district: "Bhadrak", sourceChannel: "Direct Web", verificationStatus: "Verified", registeredAt: "2026-11-09 18:30", active: true },
          { id: "REG-902", candidateEmail: "lipika.sahoo@gmail.com", district: "Puri", sourceChannel: "Telegram Channel Link", verificationStatus: "Verified", registeredAt: "2026-11-09 19:12", active: true },
          { id: "REG-903", candidateEmail: "tanmay.das@gmail.com", district: "Sambalpur", sourceChannel: "Mock Test Landing Page", verificationStatus: "Pending OTP", registeredAt: "2026-11-09 20:05", active: true }
        ]
      };
      localStorage.setItem('cso_registrations_config', JSON.stringify(DEFAULT_REGISTRATIONS));
      this.logAudit("REGISTRATIONS_RESET", "USERS_RBAC", "Registrations stream restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_REGISTRATIONS));
    },
    exportRegistrationsManifest() {
      const config = this.getRegistrationsConfig();
      const filename = "registrations_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("REGISTRATIONS_EXPORTED", "DATA_EXPORT", "Registrations manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 09-007: Membership Access ---
    getMembershipAccessConfig() {
      const DEFAULT_MEMBERSHIP_ACCESS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { totalEntitledUsers: 4720, activePasses: 4510, expiredPasses: 210 },
        items: [
          { id: "ACC-01", candidateEmail: "ramesh.behera@gmail.com", tier: "Scholar Club", dailyDownloadLimit: 25, accessVaults: "PYQ + Mock Series", expiresOn: "2027-11-08", status: "Active", active: true },
          { id: "ACC-02", candidateEmail: "subhashree.m@gmail.com", tier: "District Circle Patron", dailyDownloadLimit: 100, accessVaults: "Full Platform + Mentorship", expiresOn: "2027-03-31", status: "Active", active: true },
          { id: "ACC-03", candidateEmail: "pooja.p@gmail.com", tier: "General Aspirant", dailyDownloadLimit: 3, accessVaults: "Public Gazettes Only", expiresOn: "Lifetime", status: "Active", active: true }
        ]
      };
      return this._hydrateConfig('cso_membership_access_config', 'entitlements', () => DEFAULT_MEMBERSHIP_ACCESS);
    },
    saveMembershipAccessConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.entitlements = cfg.items || cfg.entitlements || [];
      cfg.items = cfg.entitlements;
      localStorage.setItem('cso_membership_access_config', JSON.stringify(cfg));
      this.logAudit("MEMBERSHIP_ACCESS_SAVED", "USERS_RBAC", "Membership Access directory updated with " + cfg.items.length + " entitlements.");
    },
    resetMembershipAccessConfig() {
      const DEFAULT_MEMBERSHIP_ACCESS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { totalEntitledUsers: 4720, activePasses: 4510, expiredPasses: 210 },
        items: [
          { id: "ACC-01", candidateEmail: "ramesh.behera@gmail.com", tier: "Scholar Club", dailyDownloadLimit: 25, accessVaults: "PYQ + Mock Series", expiresOn: "2027-11-08", status: "Active", active: true },
          { id: "ACC-02", candidateEmail: "subhashree.m@gmail.com", tier: "District Circle Patron", dailyDownloadLimit: 100, accessVaults: "Full Platform + Mentorship", expiresOn: "2027-03-31", status: "Active", active: true },
          { id: "ACC-03", candidateEmail: "pooja.p@gmail.com", tier: "General Aspirant", dailyDownloadLimit: 3, accessVaults: "Public Gazettes Only", expiresOn: "Lifetime", status: "Active", active: true }
        ]
      };
      localStorage.setItem('cso_membership_access_config', JSON.stringify(DEFAULT_MEMBERSHIP_ACCESS));
      this.logAudit("MEMBERSHIP_ACCESS_RESET", "USERS_RBAC", "Membership Access directory restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_MEMBERSHIP_ACCESS));
    },
    exportMembershipAccessManifest() {
      const config = this.getMembershipAccessConfig();
      const filename = "membership_access_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("MEMBERSHIP_ACCESS_EXPORTED", "DATA_EXPORT", "Membership Access manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 09-008: Community Posts ---
    getCommunityPostsConfig() {
      const DEFAULT_COMMUNITY_POSTS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "PST-101", title: "OPSC OAS Prelims 2026: Recommended Odia Grammar Books", authorEmail: "ramesh.behera@gmail.com", district: "Balasore", upvotes: 142, commentsCount: 28, status: "Published", publishedAt: "2026-11-05", active: true },
          { id: "PST-102", title: "OSSC CGL Mathematics Daily Practice Routine Breakdown", authorEmail: "subhashree.m@gmail.com", district: "Cuttack", upvotes: 98, commentsCount: 15, status: "Published", publishedAt: "2026-11-07", active: true },
          { id: "PST-103", title: "Bhubaneswar Offline Study Group - Weekly Mock Session", authorEmail: "debabrata.n@gmail.com", district: "Khordha", upvotes: 210, commentsCount: 44, status: "Published", publishedAt: "2026-11-09", active: true }
        ]
      };
      return this._hydrateConfig('cso_community_posts_config', 'posts', () => DEFAULT_COMMUNITY_POSTS);
    },
    saveCommunityPostsConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.posts = cfg.items || cfg.posts || [];
      cfg.items = cfg.posts;
      localStorage.setItem('cso_community_posts_config', JSON.stringify(cfg));
      this.logAudit("COMMUNITY_POSTS_SAVED", "COMMUNITY", "Community Posts forum updated with " + cfg.items.length + " threads.");
    },
    resetCommunityPostsConfig() {
      const DEFAULT_COMMUNITY_POSTS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "PST-101", title: "OPSC OAS Prelims 2026: Recommended Odia Grammar Books", authorEmail: "ramesh.behera@gmail.com", district: "Balasore", upvotes: 142, commentsCount: 28, status: "Published", publishedAt: "2026-11-05", active: true },
          { id: "PST-102", title: "OSSC CGL Mathematics Daily Practice Routine Breakdown", authorEmail: "subhashree.m@gmail.com", district: "Cuttack", upvotes: 98, commentsCount: 15, status: "Published", publishedAt: "2026-11-07", active: true },
          { id: "PST-103", title: "Bhubaneswar Offline Study Group - Weekly Mock Session", authorEmail: "debabrata.n@gmail.com", district: "Khordha", upvotes: 210, commentsCount: 44, status: "Published", publishedAt: "2026-11-09", active: true }
        ]
      };
      localStorage.setItem('cso_community_posts_config', JSON.stringify(DEFAULT_COMMUNITY_POSTS));
      this.logAudit("COMMUNITY_POSTS_RESET", "COMMUNITY", "Community Posts forum restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_COMMUNITY_POSTS));
    },
    exportCommunityPostsManifest() {
      const config = this.getCommunityPostsConfig();
      const filename = "community_posts_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("COMMUNITY_POSTS_EXPORTED", "DATA_EXPORT", "Community Posts manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 09-009: Comments & Replies ---
    getCommentsRepliesConfig() {
      const DEFAULT_COMMENTS_REPLIES = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "CMT-201", postRef: "PST-101", commenter: "Bikash Jena", content: "Is Saraswata Vyakaran sufficient for the Mains translation paper?", reported: false, likes: 14, timestamp: "2026-11-06 10:20", active: true },
          { id: "CMT-202", postRef: "PST-102", commenter: "Manas Ranjan", content: "Can anyone share shortcut tricks for compound interest problems?", reported: false, likes: 8, timestamp: "2026-11-07 14:15", active: true },
          { id: "CMT-203", postRef: "PST-103", commenter: "SpamBot99", content: "Buy exam keys fast at whatsapp link ...", reported: true, likes: 0, timestamp: "2026-11-09 11:00", active: false }
        ]
      };
      return this._hydrateConfig('cso_comments_replies_config', 'comments', () => DEFAULT_COMMENTS_REPLIES);
    },
    saveCommentsRepliesConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.comments = cfg.items || cfg.comments || [];
      cfg.items = cfg.comments;
      localStorage.setItem('cso_comments_replies_config', JSON.stringify(cfg));
      this.logAudit("COMMENTS_REPLIES_SAVED", "COMMUNITY", "Comments & Replies log updated with " + cfg.items.length + " replies.");
    },
    resetCommentsRepliesConfig() {
      const DEFAULT_COMMENTS_REPLIES = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "CMT-201", postRef: "PST-101", commenter: "Bikash Jena", content: "Is Saraswata Vyakaran sufficient for the Mains translation paper?", reported: false, likes: 14, timestamp: "2026-11-06 10:20", active: true },
          { id: "CMT-202", postRef: "PST-102", commenter: "Manas Ranjan", content: "Can anyone share shortcut tricks for compound interest problems?", reported: false, likes: 8, timestamp: "2026-11-07 14:15", active: true },
          { id: "CMT-203", postRef: "PST-103", commenter: "SpamBot99", content: "Buy exam keys fast at whatsapp link ...", reported: true, likes: 0, timestamp: "2026-11-09 11:00", active: false }
        ]
      };
      localStorage.setItem('cso_comments_replies_config', JSON.stringify(DEFAULT_COMMENTS_REPLIES));
      this.logAudit("COMMENTS_REPLIES_RESET", "COMMUNITY", "Comments & Replies log restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_COMMENTS_REPLIES));
    },
    exportCommentsRepliesManifest() {
      const config = this.getCommentsRepliesConfig();
      const filename = "comments_replies_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("COMMENTS_REPLIES_EXPORTED", "DATA_EXPORT", "Comments & Replies manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 09-010: Moderation Queue ---
    getModerationQueueConfig() {
      const DEFAULT_MODERATION_QUEUE = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { autoFilterSpamKeywords: true, quarantineThresholdScore: 70 },
        items: [
          { id: "MOD-301", itemType: "Comment", snippet: "Click here for leaked exam papers ...", author: "unknown_aspirant@tempmail.com", riskScore: "95/100", flagReason: "Prohibited Solicitation", queuedAt: "2026-11-09 16:30", status: "Pending Review", active: true },
          { id: "MOD-302", itemType: "Community Post", snippet: "Unverified protest rally date regarding OSSC exam center", author: "student_circle@gmail.com", riskScore: "75/100", flagReason: "Unverified Official Gazette Notice", queuedAt: "2026-11-09 17:45", status: "Pending Review", active: true }
        ]
      };
      return this._hydrateConfig('cso_moderation_queue_config', 'queuedItems', () => DEFAULT_MODERATION_QUEUE);
    },
    saveModerationQueueConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.queuedItems = cfg.items || cfg.queuedItems || [];
      cfg.items = cfg.queuedItems;
      localStorage.setItem('cso_moderation_queue_config', JSON.stringify(cfg));
      this.logAudit("MODERATION_QUEUE_SAVED", "COMMUNITY", "Moderation Queue updated with " + cfg.items.length + " pending reviews.");
    },
    resetModerationQueueConfig() {
      const DEFAULT_MODERATION_QUEUE = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { autoFilterSpamKeywords: true, quarantineThresholdScore: 70 },
        items: [
          { id: "MOD-301", itemType: "Comment", snippet: "Click here for leaked exam papers ...", author: "unknown_aspirant@tempmail.com", riskScore: "95/100", flagReason: "Prohibited Solicitation", queuedAt: "2026-11-09 16:30", status: "Pending Review", active: true },
          { id: "MOD-302", itemType: "Community Post", snippet: "Unverified protest rally date regarding OSSC exam center", author: "student_circle@gmail.com", riskScore: "75/100", flagReason: "Unverified Official Gazette Notice", queuedAt: "2026-11-09 17:45", status: "Pending Review", active: true }
        ]
      };
      localStorage.setItem('cso_moderation_queue_config', JSON.stringify(DEFAULT_MODERATION_QUEUE));
      this.logAudit("MODERATION_QUEUE_RESET", "COMMUNITY", "Moderation Queue restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_MODERATION_QUEUE));
    },
    exportModerationQueueManifest() {
      const config = this.getModerationQueueConfig();
      const filename = "moderation_queue_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("MODERATION_QUEUE_EXPORTED", "DATA_EXPORT", "Moderation Queue manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 09-011: User Reports ---
    getUserReportsConfig() {
      const DEFAULT_USER_REPORTS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { totalReports: 34, pendingInvestigation: 4, resolvedCount: 30 },
        items: [
          { id: "RPT-401", targetEntity: "PST-103 Comment #2", reportedBy: "aspirant.balasore@gmail.com", grievanceType: "Commercial Solicitation / Scams", priority: "High", status: "Action Taken (Deleted)", filedDate: "2026-11-08", active: true },
          { id: "RPT-402", targetEntity: "USR-9481 Profile", reportedBy: "debabrata.n@gmail.com", grievanceType: "Harassment / Abusive Remarks", priority: "Critical", status: "Investigating", filedDate: "2026-11-09", active: true }
        ]
      };
      return this._hydrateConfig('cso_user_reports_config', 'reports', () => DEFAULT_USER_REPORTS);
    },
    saveUserReportsConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.reports = cfg.items || cfg.reports || [];
      cfg.items = cfg.reports;
      localStorage.setItem('cso_user_reports_config', JSON.stringify(cfg));
      this.logAudit("USER_REPORTS_SAVED", "COMMUNITY", "User Reports grievance desk updated with " + cfg.items.length + " tickets.");
    },
    resetUserReportsConfig() {
      const DEFAULT_USER_REPORTS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { totalReports: 34, pendingInvestigation: 4, resolvedCount: 30 },
        items: [
          { id: "RPT-401", targetEntity: "PST-103 Comment #2", reportedBy: "aspirant.balasore@gmail.com", grievanceType: "Commercial Solicitation / Scams", priority: "High", status: "Action Taken (Deleted)", filedDate: "2026-11-08", active: true },
          { id: "RPT-402", targetEntity: "USR-9481 Profile", reportedBy: "debabrata.n@gmail.com", grievanceType: "Harassment / Abusive Remarks", priority: "Critical", status: "Investigating", filedDate: "2026-11-09", active: true }
        ]
      };
      localStorage.setItem('cso_user_reports_config', JSON.stringify(DEFAULT_USER_REPORTS));
      this.logAudit("USER_REPORTS_RESET", "COMMUNITY", "User Reports grievance desk restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_USER_REPORTS));
    },
    exportUserReportsManifest() {
      const config = this.getUserReportsConfig();
      const filename = "user_reports_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("USER_REPORTS_EXPORTED", "DATA_EXPORT", "User Reports manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 09-012: Blocked Accounts ---
    getBlockedAccountsConfig() {
      const DEFAULT_BLOCKED_ACCOUNTS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "BLK-01", identifier: "spam.test@tempmail.com", blockType: "Email Domain + IP", reason: "Automated forum link bombing", blockedBy: "Root Admin", blockedOn: "2026-11-04", canAppeal: false, active: true },
          { id: "BLK-02", identifier: "185.220.101.45", blockType: "IP Address (Tor Node)", reason: "Brute force authentication attempts", blockedBy: "Security Rule Engine", blockedOn: "2026-11-07", canAppeal: false, active: true },
          { id: "BLK-03", identifier: "fake.scholarship@gmail.com", blockType: "User Account", reason: "Fraudulent scheme counseling solicitation", blockedBy: "Community Lead", blockedOn: "2026-10-18", canAppeal: true, active: true }
        ]
      };
      return this._hydrateConfig('cso_blocked_accounts_config', 'blockedList', () => DEFAULT_BLOCKED_ACCOUNTS);
    },
    saveBlockedAccountsConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.blockedList = cfg.items || cfg.blockedList || [];
      cfg.items = cfg.blockedList;
      localStorage.setItem('cso_blocked_accounts_config', JSON.stringify(cfg));
      this.logAudit("BLOCKED_ACCOUNTS_SAVED", "COMMUNITY", "Blocked Accounts blackbook updated with " + cfg.items.length + " entries.");
    },
    resetBlockedAccountsConfig() {
      const DEFAULT_BLOCKED_ACCOUNTS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "BLK-01", identifier: "spam.test@tempmail.com", blockType: "Email Domain + IP", reason: "Automated forum link bombing", blockedBy: "Root Admin", blockedOn: "2026-11-04", canAppeal: false, active: true },
          { id: "BLK-02", identifier: "185.220.101.45", blockType: "IP Address (Tor Node)", reason: "Brute force authentication attempts", blockedBy: "Security Rule Engine", blockedOn: "2026-11-07", canAppeal: false, active: true },
          { id: "BLK-03", identifier: "fake.scholarship@gmail.com", blockType: "User Account", reason: "Fraudulent scheme counseling solicitation", blockedBy: "Community Lead", blockedOn: "2026-10-18", canAppeal: true, active: true }
        ]
      };
      localStorage.setItem('cso_blocked_accounts_config', JSON.stringify(DEFAULT_BLOCKED_ACCOUNTS));
      this.logAudit("BLOCKED_ACCOUNTS_RESET", "COMMUNITY", "Blocked Accounts blackbook restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_BLOCKED_ACCOUNTS));
    },
    exportBlockedAccountsManifest() {
      const config = this.getBlockedAccountsConfig();
      const filename = "blocked_accounts_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("BLOCKED_ACCOUNTS_EXPORTED", "DATA_EXPORT", "Blocked Accounts manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 09-013: User Activity ---
    getUserActivityConfig() {
      const DEFAULT_USER_ACTIVITY = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { totalEvents24h: 18420, activeSessions: 420, mockAttempts24h: 1290 },
        items: [
          { id: "ACT-01", userEmail: "ramesh.behera@gmail.com", eventType: "MOCK_SUBMISSION", details: "Completed OAS Prelims GS Mock #4 (Score: 134/200)", ipAddress: "103.24.84.12", timestamp: "2026-11-09 18:22:10", active: true },
          { id: "ACT-02", userEmail: "subhashree.m@gmail.com", eventType: "RESOURCE_DOWNLOAD", details: "Downloaded Odia Grammar 2026 Capsule PDF", ipAddress: "117.211.90.45", timestamp: "2026-11-09 19:05:40", active: true },
          { id: "ACT-03", userEmail: "candidate.cuttack@gmail.com", eventType: "LOGIN_SUCCESS", details: "Web session authenticated via OTP", ipAddress: "49.36.128.90", timestamp: "2026-11-09 19:40:15", active: true }
        ]
      };
      return this._hydrateConfig('cso_user_activity_config', 'activities', () => DEFAULT_USER_ACTIVITY);
    },
    saveUserActivityConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.activities = cfg.items || cfg.activities || [];
      cfg.items = cfg.activities;
      localStorage.setItem('cso_user_activity_config', JSON.stringify(cfg));
      this.logAudit("USER_ACTIVITY_SAVED", "COMMUNITY", "User Activity stream updated with " + cfg.items.length + " telemetry records.");
    },
    resetUserActivityConfig() {
      const DEFAULT_USER_ACTIVITY = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { totalEvents24h: 18420, activeSessions: 420, mockAttempts24h: 1290 },
        items: [
          { id: "ACT-01", userEmail: "ramesh.behera@gmail.com", eventType: "MOCK_SUBMISSION", details: "Completed OAS Prelims GS Mock #4 (Score: 134/200)", ipAddress: "103.24.84.12", timestamp: "2026-11-09 18:22:10", active: true },
          { id: "ACT-02", userEmail: "subhashree.m@gmail.com", eventType: "RESOURCE_DOWNLOAD", details: "Downloaded Odia Grammar 2026 Capsule PDF", ipAddress: "117.211.90.45", timestamp: "2026-11-09 19:05:40", active: true },
          { id: "ACT-03", userEmail: "candidate.cuttack@gmail.com", eventType: "LOGIN_SUCCESS", details: "Web session authenticated via OTP", ipAddress: "49.36.128.90", timestamp: "2026-11-09 19:40:15", active: true }
        ]
      };
      localStorage.setItem('cso_user_activity_config', JSON.stringify(DEFAULT_USER_ACTIVITY));
      this.logAudit("USER_ACTIVITY_RESET", "COMMUNITY", "User Activity stream restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_USER_ACTIVITY));
    },
    exportUserActivityManifest() {
      const config = this.getUserActivityConfig();
      const filename = "user_activity_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("USER_ACTIVITY_EXPORTED", "DATA_EXPORT", "User Activity manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 09-014: Data Access Requests ---
    getDataAccessRequestsConfig() {
      const DEFAULT_DATA_ACCESS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { complianceStandard: "DPDP Act 2023", slaDays: 15, autoDataExport: true },
        items: [
          { id: "DAR-01", requestNumber: "DAR-2026-101", requesterEmail: "aspirant.balasore@gmail.com", requestType: "Data Portability Export", status: "Completed", completionDate: "2026-11-02", filedAt: "2026-10-28", active: true },
          { id: "DAR-02", requestNumber: "DAR-2026-102", requesterEmail: "old.candidate@gmail.com", requestType: "Erasure / Account Deletion", status: "Under Review", completionDate: "Pending SLA", filedAt: "2026-11-06", active: true },
          { id: "DAR-03", requestNumber: "DAR-2026-103", requesterEmail: "privacy.user@gmail.com", requestType: "Consent Revocation", status: "Processing", completionDate: "Pending SLA", filedAt: "2026-11-08", active: true }
        ]
      };
      return this._hydrateConfig('cso_data_access_requests_config', 'requests', () => DEFAULT_DATA_ACCESS);
    },
    saveDataAccessRequestsConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.requests = cfg.items || cfg.requests || [];
      cfg.items = cfg.requests;
      localStorage.setItem('cso_data_access_requests_config', JSON.stringify(cfg));
      this.logAudit("DATA_ACCESS_REQUESTS_SAVED", "COMMUNITY", "Data Access Requests updated with " + cfg.items.length + " compliance cases.");
    },
    resetDataAccessRequestsConfig() {
      const DEFAULT_DATA_ACCESS = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { complianceStandard: "DPDP Act 2023", slaDays: 15, autoDataExport: true },
        items: [
          { id: "DAR-01", requestNumber: "DAR-2026-101", requesterEmail: "aspirant.balasore@gmail.com", requestType: "Data Portability Export", status: "Completed", completionDate: "2026-11-02", filedAt: "2026-10-28", active: true },
          { id: "DAR-02", requestNumber: "DAR-2026-102", requesterEmail: "old.candidate@gmail.com", requestType: "Erasure / Account Deletion", status: "Under Review", completionDate: "Pending SLA", filedAt: "2026-11-06", active: true },
          { id: "DAR-03", requestNumber: "DAR-2026-103", requesterEmail: "privacy.user@gmail.com", requestType: "Consent Revocation", status: "Processing", completionDate: "Pending SLA", filedAt: "2026-11-08", active: true }
        ]
      };
      localStorage.setItem('cso_data_access_requests_config', JSON.stringify(DEFAULT_DATA_ACCESS));
      this.logAudit("DATA_ACCESS_REQUESTS_RESET", "COMMUNITY", "Data Access Requests restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_DATA_ACCESS));
    },
    exportDataAccessRequestsManifest() {
      const config = this.getDataAccessRequestsConfig();
      const filename = "data_access_requests_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("DATA_ACCESS_REQUESTS_EXPORTED", "DATA_EXPORT", "Data Access Requests manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 09-015: Discussion Forum ---
    getDiscussionForumConfig() {
      const DEFAULT_DISCUSSION_FORUM = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "FRM-01", boardName: "OPSC Civil Services (OAS/OFS) Lounge", slug: "opsc-oas-lounge", assignedModerator: "debabrata.n@gmail.com", totalThreads: 480, postCount: 3910, active: true },
          { id: "FRM-02", boardName: "OSSC Combined Graduate Level Hub", slug: "ossc-cgl-hub", assignedModerator: "mod.community@csodisha.com", totalThreads: 320, postCount: 2450, active: true },
          { id: "FRM-03", boardName: "Odisha District Circles & Local Study Groups", slug: "district-circles", assignedModerator: "subhashree.m@gmail.com", totalThreads: 190, postCount: 1420, active: true },
          { id: "FRM-04", boardName: "Odia Language, Essay & Translation Desk", slug: "odia-literature-desk", assignedModerator: "editor.jobs@csodisha.com", totalThreads: 110, postCount: 890, active: true }
        ]
      };
      return this._hydrateConfig('cso_discussion_forum_config', 'boards', () => DEFAULT_DISCUSSION_FORUM);
    },
    saveDiscussionForumConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.boards = cfg.items || cfg.boards || [];
      cfg.items = cfg.boards;
      localStorage.setItem('cso_discussion_forum_config', JSON.stringify(cfg));
      this.logAudit("DISCUSSION_FORUM_SAVED", "COMMUNITY", "Discussion Forum boards updated with " + cfg.items.length + " categories.");
    },
    resetDiscussionForumConfig() {
      const DEFAULT_DISCUSSION_FORUM = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "FRM-01", boardName: "OPSC Civil Services (OAS/OFS) Lounge", slug: "opsc-oas-lounge", assignedModerator: "debabrata.n@gmail.com", totalThreads: 480, postCount: 3910, active: true },
          { id: "FRM-02", boardName: "OSSC Combined Graduate Level Hub", slug: "ossc-cgl-hub", assignedModerator: "mod.community@csodisha.com", totalThreads: 320, postCount: 2450, active: true },
          { id: "FRM-03", boardName: "Odisha District Circles & Local Study Groups", slug: "district-circles", assignedModerator: "subhashree.m@gmail.com", totalThreads: 190, postCount: 1420, active: true },
          { id: "FRM-04", boardName: "Odia Language, Essay & Translation Desk", slug: "odia-literature-desk", assignedModerator: "editor.jobs@csodisha.com", totalThreads: 110, postCount: 890, active: true }
        ]
      };
      localStorage.setItem('cso_discussion_forum_config', JSON.stringify(DEFAULT_DISCUSSION_FORUM));
      this.logAudit("DISCUSSION_FORUM_RESET", "COMMUNITY", "Discussion Forum boards restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_DISCUSSION_FORUM));
    },
    exportDiscussionForumManifest() {
      const config = this.getDiscussionForumConfig();
      const filename = "discussion_forum_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("DISCUSSION_FORUM_EXPORTED", "DATA_EXPORT", "Discussion Forum manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 09-016: Ask a Question ---
    getAskQuestionConfig() {
      const DEFAULT_ASK_QUESTION = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "QNA-01", questionTitle: "What is the age relaxation criteria for SEBC candidates in OPSC OAS 2026?", category: "Eligibility Rules", askedBy: "ramesh.behera@gmail.com", answerCount: 4, verifiedStatus: "Verified Answer Available", date: "2026-11-04", active: true },
          { id: "QNA-02", questionTitle: "Which gazette notification finalized the OSSSC Amin negative marking scheme?", category: "Exam Pattern", askedBy: "candidate.cuttack@gmail.com", answerCount: 2, verifiedStatus: "Open for Peer Input", date: "2026-11-07", active: true },
          { id: "QNA-03", questionTitle: "How to correct applicant signature mismatch on OSSC recruitment portal?", category: "Technical Form Help", askedBy: "lipika.sahoo@gmail.com", answerCount: 1, verifiedStatus: "Faculty Verified", date: "2026-11-09", active: true }
        ]
      };
      return this._hydrateConfig('cso_ask_question_config', 'questions', () => DEFAULT_ASK_QUESTION);
    },
    saveAskQuestionConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.questions = cfg.items || cfg.questions || [];
      cfg.items = cfg.questions;
      localStorage.setItem('cso_ask_question_config', JSON.stringify(cfg));
      this.logAudit("ASK_QUESTION_SAVED", "COMMUNITY", "Ask a Question board updated with " + cfg.items.length + " inquiries.");
    },
    resetAskQuestionConfig() {
      const DEFAULT_ASK_QUESTION = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "QNA-01", questionTitle: "What is the age relaxation criteria for SEBC candidates in OPSC OAS 2026?", category: "Eligibility Rules", askedBy: "ramesh.behera@gmail.com", answerCount: 4, verifiedStatus: "Verified Answer Available", date: "2026-11-04", active: true },
          { id: "QNA-02", questionTitle: "Which gazette notification finalized the OSSSC Amin negative marking scheme?", category: "Exam Pattern", askedBy: "candidate.cuttack@gmail.com", answerCount: 2, verifiedStatus: "Open for Peer Input", date: "2026-11-07", active: true },
          { id: "QNA-03", questionTitle: "How to correct applicant signature mismatch on OSSC recruitment portal?", category: "Technical Form Help", askedBy: "lipika.sahoo@gmail.com", answerCount: 1, verifiedStatus: "Faculty Verified", date: "2026-11-09", active: true }
        ]
      };
      localStorage.setItem('cso_ask_question_config', JSON.stringify(DEFAULT_ASK_QUESTION));
      this.logAudit("ASK_QUESTION_RESET", "COMMUNITY", "Ask a Question board restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_ASK_QUESTION));
    },
    exportAskQuestionManifest() {
      const config = this.getAskQuestionConfig();
      const filename = "ask_question_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("ASK_QUESTION_EXPORTED", "DATA_EXPORT", "Ask a Question manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 09-017: Share Knowledge ---
    getShareKnowledgeConfig() {
      const DEFAULT_SHARE_KNOWLEDGE = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "KNW-01", noteTitle: "Handwritten Chronology: British Resistance in Odisha (1803-1857)", contributor: "Subhashree Mohanty", subject: "Odisha History", fileType: "PDF Note", peerScore: "4.9/5", status: "Approved & Published", submittedOn: "2026-10-25", active: true },
          { id: "KNW-02", noteTitle: "Formula Cheat Sheet: Mensuration 2D & 3D for OSSSC Exams", contributor: "Chinmay Jena", subject: "Quantitative Aptitude", fileType: "Infographic", peerScore: "4.7/5", status: "Approved & Published", submittedOn: "2026-11-01", active: true },
          { id: "KNW-03", noteTitle: "Summary Table: Odisha State Wetlands & Ramsar Sites 2026", contributor: "Debabrata Nayak", subject: "State Geography", fileType: "Markdown Summary", peerScore: "Under Review", status: "In Peer Review", submittedOn: "2026-11-08", active: true }
        ]
      };
      return this._hydrateConfig('cso_share_knowledge_config', 'submissions', () => DEFAULT_SHARE_KNOWLEDGE);
    },
    saveShareKnowledgeConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.submissions = cfg.items || cfg.submissions || [];
      cfg.items = cfg.submissions;
      localStorage.setItem('cso_share_knowledge_config', JSON.stringify(cfg));
      this.logAudit("SHARE_KNOWLEDGE_SAVED", "COMMUNITY", "Share Knowledge repository updated with " + cfg.items.length + " notes.");
    },
    resetShareKnowledgeConfig() {
      const DEFAULT_SHARE_KNOWLEDGE = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "KNW-01", noteTitle: "Handwritten Chronology: British Resistance in Odisha (1803-1857)", contributor: "Subhashree Mohanty", subject: "Odisha History", fileType: "PDF Note", peerScore: "4.9/5", status: "Approved & Published", submittedOn: "2026-10-25", active: true },
          { id: "KNW-02", noteTitle: "Formula Cheat Sheet: Mensuration 2D & 3D for OSSSC Exams", contributor: "Chinmay Jena", subject: "Quantitative Aptitude", fileType: "Infographic", peerScore: "4.7/5", status: "Approved & Published", submittedOn: "2026-11-01", active: true },
          { id: "KNW-03", noteTitle: "Summary Table: Odisha State Wetlands & Ramsar Sites 2026", contributor: "Debabrata Nayak", subject: "State Geography", fileType: "Markdown Summary", peerScore: "Under Review", status: "In Peer Review", submittedOn: "2026-11-08", active: true }
        ]
      };
      localStorage.setItem('cso_share_knowledge_config', JSON.stringify(DEFAULT_SHARE_KNOWLEDGE));
      this.logAudit("SHARE_KNOWLEDGE_RESET", "COMMUNITY", "Share Knowledge repository restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_SHARE_KNOWLEDGE));
    },
    exportShareKnowledgeManifest() {
      const config = this.getShareKnowledgeConfig();
      const filename = "share_knowledge_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("SHARE_KNOWLEDGE_EXPORTED", "DATA_EXPORT", "Share Knowledge manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 09-018: Suggest a Topic ---
    getSuggestTopicConfig() {
      const DEFAULT_SUGGEST_TOPIC = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "SUG-01", topicTitle: "Step-by-step Guide on SAMS Odisha Spot Admission Counseling", category: "College & Scholarships", votesCount: 342, requestedBy: "aspirant.balasore@gmail.com", editorialStatus: "Scheduled for Draft", date: "2026-11-02", active: true },
          { id: "SUG-02", topicTitle: "Complete Analysis of Odisha Land Reforms Act for Revenue Inspector Exam", category: "Recruitment Syllabus", votesCount: 520, requestedBy: "candidate.cuttack@gmail.com", editorialStatus: "In Production", date: "2026-11-05", active: true },
          { id: "SUG-03", topicTitle: "List of Tribal Dialects & Santhali Ol Chiki Script Basics for OAS", category: "Odisha Culture", votesCount: 180, requestedBy: "student.bbsr@gmail.com", editorialStatus: "Evaluating Demand", date: "2026-11-08", active: true }
        ]
      };
      return this._hydrateConfig('cso_suggest_topic_config', 'topics', () => DEFAULT_SUGGEST_TOPIC);
    },
    saveSuggestTopicConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.topics = cfg.items || cfg.topics || [];
      cfg.items = cfg.topics;
      localStorage.setItem('cso_suggest_topic_config', JSON.stringify(cfg));
      this.logAudit("SUGGEST_TOPIC_SAVED", "COMMUNITY", "Suggest a Topic ideas registry updated with " + cfg.items.length + " topics.");
    },
    resetSuggestTopicConfig() {
      const DEFAULT_SUGGEST_TOPIC = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "SUG-01", topicTitle: "Step-by-step Guide on SAMS Odisha Spot Admission Counseling", category: "College & Scholarships", votesCount: 342, requestedBy: "aspirant.balasore@gmail.com", editorialStatus: "Scheduled for Draft", date: "2026-11-02", active: true },
          { id: "SUG-02", topicTitle: "Complete Analysis of Odisha Land Reforms Act for Revenue Inspector Exam", category: "Recruitment Syllabus", votesCount: 520, requestedBy: "candidate.cuttack@gmail.com", editorialStatus: "In Production", date: "2026-11-05", active: true },
          { id: "SUG-03", topicTitle: "List of Tribal Dialects & Santhali Ol Chiki Script Basics for OAS", category: "Odisha Culture", votesCount: 180, requestedBy: "student.bbsr@gmail.com", editorialStatus: "Evaluating Demand", date: "2026-11-08", active: true }
        ]
      };
      localStorage.setItem('cso_suggest_topic_config', JSON.stringify(DEFAULT_SUGGEST_TOPIC));
      this.logAudit("SUGGEST_TOPIC_RESET", "COMMUNITY", "Suggest a Topic ideas registry restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_SUGGEST_TOPIC));
    },
    exportSuggestTopicManifest() {
      const config = this.getSuggestTopicConfig();
      const filename = "suggest_topic_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("SUGGEST_TOPIC_EXPORTED", "DATA_EXPORT", "Suggest a Topic manifest exported (" + filename + ").");
      return filename;
    },

    // --- MODULE 09-019: Report an Error ---
    getReportErrorConfig() {
      const DEFAULT_REPORT_ERROR = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { totalReports: 28, rectifiedCount: 25, pendingCount: 3 },
        items: [
          { id: "ERR-01", pageLocation: "/study-library/odisha-history-pyq-q42", reportedIssue: "Question 42 Answer Key should be Option C (Paika Rebellion 1817), not 1827", reporter: "ramesh.behera@gmail.com", severity: "High (Exam Key Error)", status: "Rectified & Credited", resolutionDate: "2026-11-04", active: true },
          { id: "ERR-02", pageLocation: "/jobs-careers/opsc-oas-2026-prelims", reportedIssue: "Typo in Application Fee: General is ₹500, but table showed ₹0", reporter: "subhashree.m@gmail.com", severity: "Medium (Typo)", status: "Rectified & Credited", resolutionDate: "2026-11-07", active: true },
          { id: "ERR-03", pageLocation: "/schemes-benefits/kalia-scholarship", reportedIssue: "Dead portal link for official eligibility guideline PDF", reporter: "student.bbsr@gmail.com", severity: "Low (Broken Link)", status: "Investigating", resolutionDate: "Pending", active: true }
        ]
      };
      return this._hydrateConfig('cso_report_error_config', 'errors', () => DEFAULT_REPORT_ERROR);
    },
    saveReportErrorConfig(cfg) {
      cfg = cfg || {};
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      cfg.errors = cfg.items || cfg.errors || [];
      cfg.items = cfg.errors;
      localStorage.setItem('cso_report_error_config', JSON.stringify(cfg));
      this.logAudit("REPORT_ERROR_SAVED", "COMMUNITY", "Report an Error desk updated with " + cfg.items.length + " errata tickets.");
    },
    resetReportErrorConfig() {
      const DEFAULT_REPORT_ERROR = {
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { totalReports: 28, rectifiedCount: 25, pendingCount: 3 },
        items: [
          { id: "ERR-01", pageLocation: "/study-library/odisha-history-pyq-q42", reportedIssue: "Question 42 Answer Key should be Option C (Paika Rebellion 1817), not 1827", reporter: "ramesh.behera@gmail.com", severity: "High (Exam Key Error)", status: "Rectified & Credited", resolutionDate: "2026-11-04", active: true },
          { id: "ERR-02", pageLocation: "/jobs-careers/opsc-oas-2026-prelims", reportedIssue: "Typo in Application Fee: General is ₹500, but table showed ₹0", reporter: "subhashree.m@gmail.com", severity: "Medium (Typo)", status: "Rectified & Credited", resolutionDate: "2026-11-07", active: true },
          { id: "ERR-03", pageLocation: "/schemes-benefits/kalia-scholarship", reportedIssue: "Dead portal link for official eligibility guideline PDF", reporter: "student.bbsr@gmail.com", severity: "Low (Broken Link)", status: "Investigating", resolutionDate: "Pending", active: true }
        ]
      };
      localStorage.setItem('cso_report_error_config', JSON.stringify(DEFAULT_REPORT_ERROR));
      this.logAudit("REPORT_ERROR_RESET", "COMMUNITY", "Report an Error desk restored to factory default.");
      return JSON.parse(JSON.stringify(DEFAULT_REPORT_ERROR));
    },
    exportReportErrorManifest() {
      const config = this.getReportErrorConfig();
      const filename = "report_error_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("REPORT_ERROR_EXPORTED", "DATA_EXPORT", "Report an Error manifest exported (" + filename + ").");
      return filename;
    },
    // ==========================================
    // FOLDER 10 (COMMUNICATION & SUPPORT) - BATCH 1
    // ==========================================

    // --- MODULE 10-001: Contact Form Submissions ---
    getContactSubmissionsConfig() {
      return _hydrateConfig("cso_contact_submissions_config", "submissions", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        submissions: [
          {
            id: "CSO-INQ-9012",
            name: "Siddhartha Mohanty",
            email: "siddhartha.mohanty@example.com",
            phone: "+91 94370 12890",
            subject: "OAS 2026 Mains Syllabus Clarification",
            category: "Admissions & Exams",
            message: "Requesting official clarification regarding optional sociology paper revision timeline for OPSC OAS 2026.",
            status: "Resolved",
            priority: "Normal",
            assignedTo: "Debabrata Dash",
            submittedAt: "2026-11-08T09:15:00Z",
            repliedAt: "2026-11-08T14:30:00Z"
          },
          {
            id: "CSO-INQ-9013",
            name: "Padmini Panda",
            email: "padmini.p@example.com",
            phone: "+91 98611 44520",
            subject: "OTET Answer Key Challenge Fee Inquiry",
            category: "General Inquiry",
            message: "Unable to find fee portal link for raising question objection on Paper II science section.",
            status: "In Progress",
            priority: "High",
            assignedTo: "Subhadra Swain",
            submittedAt: "2026-11-09T08:20:00Z",
            repliedAt: null
          },
          {
            id: "CSO-INQ-9014",
            name: "Alok Kumar Sahoo",
            email: "alok.sahoo@example.com",
            phone: "+91 70081 22934",
            subject: "District Study Center Contact Details - Balasore",
            category: "Study Centers",
            message: "Kindly share address and timings of CSO community partner library in FM College road, Balasore.",
            status: "New",
            priority: "Normal",
            assignedTo: "Unassigned",
            submittedAt: "2026-11-09T11:45:00Z",
            repliedAt: null
          },
          {
            id: "CSO-INQ-9015",
            name: "Mihir Ranjan Jena",
            email: "mrjena.exam@example.com",
            phone: "+91 82490 66312",
            subject: "Partnership Proposal for Mock Interview Panel",
            category: "Partnership",
            message: "Retired OAS cadre officers willing to conduct mock interview panels for registered aspirants in Bhubaneswar.",
            status: "Under Review",
            priority: "High",
            assignedTo: "Debabrata Dash",
            submittedAt: "2026-11-09T14:10:00Z",
            repliedAt: null
          }
        ]
      }));
    },

    saveContactSubmissionsConfig(config) {
      if (!config) return false;
      const list = config.submissions || config.items || [];
      config.items = list;
      config.submissions = list;
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      localStorage.setItem("cso_contact_submissions_config", JSON.stringify(config));
      this.logAudit("CONTACT_SUBMISSIONS_UPDATED", "COMMUNICATIONS", `Contact submissions updated (${list.length} records).`);
      return true;
    },

    resetContactSubmissionsConfig() {
      localStorage.removeItem("cso_contact_submissions_config");
      const fresh = this.getContactSubmissionsConfig();
      this.logAudit("CONTACT_SUBMISSIONS_RESET", "COMMUNICATIONS", "Contact submissions reset to factory defaults.");
      return fresh;
    },

    exportContactSubmissionsManifest() {
      const config = this.getContactSubmissionsConfig();
      const filename = "contact_submissions_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("CONTACT_SUBMISSIONS_EXPORTED", "DATA_EXPORT", `Contact submissions exported (${filename}).`);
      return filename;
    },

    // --- MODULE 10-002: Support Tickets ---
    getSupportTicketsConfig() {
      return _hydrateConfig("cso_support_tickets_config", "tickets", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        tickets: [
          {
            id: "TCK-8801",
            ticketNumber: "#CSO-8801",
            user: "Lipika Mohapatra",
            email: "lipika.m@example.com",
            category: "Billing & Subscriptions",
            subject: "Subscription payment debited twice via UPI",
            status: "Open",
            priority: "High",
            assignedAgent: "Bikash Pradhan",
            slaHoursRemaining: 6,
            department: "Finance Helpdesk",
            createdAt: "2026-11-09T10:00:00Z",
            lastUpdate: "2026-11-09T12:30:00Z"
          },
          {
            id: "TCK-8802",
            ticketNumber: "#CSO-8802",
            user: "Rakesh Barik",
            email: "rakesh.barik@example.com",
            category: "Technical Issue",
            subject: "Odisha GK mock test test-engine freeze on Question 42",
            status: "Investigating",
            priority: "Critical",
            assignedAgent: "Soumya Nayak",
            slaHoursRemaining: 2,
            department: "IT Systems",
            createdAt: "2026-11-09T08:30:00Z",
            lastUpdate: "2026-11-09T11:45:00Z"
          },
          {
            id: "TCK-8803",
            ticketNumber: "#CSO-8803",
            user: "Pooja Panigrahi",
            email: "pooja.p@example.com",
            category: "Content Error",
            subject: "Page 14 download link 404 in Forest Ranger Syllabus",
            status: "Resolved",
            priority: "Normal",
            assignedAgent: "Debabrata Dash",
            slaHoursRemaining: 0,
            department: "Content Team",
            createdAt: "2026-11-08T15:00:00Z",
            lastUpdate: "2026-11-09T09:00:00Z"
          },
          {
            id: "TCK-8804",
            ticketNumber: "#CSO-8804",
            user: "Debashis Rout",
            email: "debashis.r@example.com",
            category: "Account Access",
            subject: "Password reset OTP not arriving on Jio network",
            status: "Escalated",
            priority: "High",
            assignedAgent: "Ananya Tripathy",
            slaHoursRemaining: 4,
            department: "User Auth Ops",
            createdAt: "2026-11-09T11:15:00Z",
            lastUpdate: "2026-11-09T13:00:00Z"
          }
        ]
      }));
    },

    saveSupportTicketsConfig(config) {
      if (!config) return false;
      const list = config.tickets || config.items || [];
      config.items = list;
      config.tickets = list;
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      localStorage.setItem("cso_support_tickets_config", JSON.stringify(config));
      this.logAudit("SUPPORT_TICKETS_UPDATED", "COMMUNICATIONS", `Support tickets updated (${list.length} records).`);
      return true;
    },

    resetSupportTicketsConfig() {
      localStorage.removeItem("cso_support_tickets_config");
      const fresh = this.getSupportTicketsConfig();
      this.logAudit("SUPPORT_TICKETS_RESET", "COMMUNICATIONS", "Support tickets reset to factory defaults.");
      return fresh;
    },

    exportSupportTicketsManifest() {
      const config = this.getSupportTicketsConfig();
      const filename = "support_tickets_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("SUPPORT_TICKETS_EXPORTED", "DATA_EXPORT", `Support tickets exported (${filename}).`);
      return filename;
    },

    // --- MODULE 10-003: Feedback ---
    getFeedbackConfig() {
      return _hydrateConfig("cso_feedback_config", "feedbackEntries", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        feedbackEntries: [
          {
            id: "FBK-4101",
            author: "Chinmay Behera",
            rating: 5,
            module: "Mock Test Engine",
            topic: "Instant Rank Prediction & Detailed Analysis",
            comment: "The real-time percentile prediction after completing the OPSC mock test was remarkably accurate compared to last year cutoffs.",
            sentiment: "Positive",
            status: "Featured",
            submittedAt: "2026-11-07T16:20:00Z",
            featuredOnHome: true
          },
          {
            id: "FBK-4102",
            author: "Jayashree Senapati",
            rating: 4,
            module: "Odia Vernacular Notes",
            topic: "Grammar & Translation Study Notes",
            comment: "Notes are very thorough and lucid. Would appreciate adding an audio pronunciation glossary for Sanskrit tatsama words.",
            sentiment: "Positive",
            status: "Reviewed",
            submittedAt: "2026-11-08T11:00:00Z",
            featuredOnHome: false
          },
          {
            id: "FBK-4103",
            author: "Dhiren Nayak",
            rating: 2,
            module: "Mobile Responsive Layout",
            topic: "Table overflow on small phone screens",
            comment: "District cutoff comparison tables scroll horizontally awkwardly on 5.5 inch screens. Please make sticky header row.",
            sentiment: "Negative",
            status: "Action Required",
            submittedAt: "2026-11-08T18:45:00Z",
            featuredOnHome: false
          },
          {
            id: "FBK-4104",
            author: "Barnali Hota",
            rating: 5,
            module: "Current Affairs Monthly PDF",
            topic: "November 2026 Edition Coverage",
            comment: "Best compilation of Odisha state budget initiatives and Kendrapara port project updates. Saved my revision time completely.",
            sentiment: "Positive",
            status: "Approved",
            submittedAt: "2026-11-09T07:15:00Z",
            featuredOnHome: true
          }
        ]
      }));
    },

    saveFeedbackConfig(config) {
      if (!config) return false;
      const list = config.feedbackEntries || config.items || [];
      config.items = list;
      config.feedbackEntries = list;
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      localStorage.setItem("cso_feedback_config", JSON.stringify(config));
      this.logAudit("FEEDBACK_CONFIG_UPDATED", "COMMUNICATIONS", `Feedback entries updated (${list.length} records).`);
      return true;
    },

    resetFeedbackConfig() {
      localStorage.removeItem("cso_feedback_config");
      const fresh = this.getFeedbackConfig();
      this.logAudit("FEEDBACK_CONFIG_RESET", "COMMUNICATIONS", "Feedback entries reset to factory defaults.");
      return fresh;
    },

    exportFeedbackManifest() {
      const config = this.getFeedbackConfig();
      const filename = "feedback_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("FEEDBACK_MANIFEST_EXPORTED", "DATA_EXPORT", `Feedback manifest exported (${filename}).`);
      return filename;
    },

    // --- MODULE 10-004: Surveys & Polls ---
    getSurveysPollsConfig() {
      return _hydrateConfig("cso_surveys_polls_config", "surveys", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        surveys: [
          {
            id: "SURV-101",
            title: "OPSC 2026 Mains Optional Subject Preference Survey",
            type: "Survey",
            category: "Civil Services",
            targetAudience: "Registered Aspirants",
            responsesCount: 1420,
            status: "Active",
            startDate: "2026-11-01",
            endDate: "2026-11-20",
            description: "Gathering aspirant preferences for live mentorship cohorts across Sociology, Public Admin, and Odia Literature."
          },
          {
            id: "POLL-202",
            title: "Should OTET Qualifying Marks Be Normalized Across Shifts?",
            type: "Poll",
            category: "Teaching Exams",
            targetAudience: "All Candidates",
            responsesCount: 3840,
            status: "Active",
            startDate: "2026-11-05",
            endDate: "2026-11-15",
            description: "Quick opinion poll regarding BSE Odisha shift-wise percentile normalization formula."
          },
          {
            id: "SURV-103",
            title: "District Study Centers Infrastructure & Book Availability Audit",
            type: "Survey",
            category: "Infrastructure",
            targetAudience: "District Members",
            responsesCount: 620,
            status: "Draft",
            startDate: "2026-11-25",
            endDate: "2026-12-10",
            description: "Evaluating physical library capacity, high-speed WiFi, and air conditioning across 30 district hubs."
          },
          {
            id: "POLL-204",
            title: "Preferred Weekend Live Class Timings (Winter 2026)",
            type: "Poll",
            category: "Live Classes",
            targetAudience: "Paid Pro Members",
            responsesCount: 2190,
            status: "Closed",
            startDate: "2026-10-15",
            endDate: "2026-10-31",
            description: "Survey concluded with 68% voting for 7:00 AM - 9:30 AM morning session."
          }
        ]
      }));
    },

    saveSurveysPollsConfig(config) {
      if (!config) return false;
      const list = config.surveys || config.items || [];
      config.items = list;
      config.surveys = list;
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      localStorage.setItem("cso_surveys_polls_config", JSON.stringify(config));
      this.logAudit("SURVEYS_POLLS_UPDATED", "COMMUNICATIONS", `Surveys and polls updated (${list.length} records).`);
      return true;
    },

    resetSurveysPollsConfig() {
      localStorage.removeItem("cso_surveys_polls_config");
      const fresh = this.getSurveysPollsConfig();
      this.logAudit("SURVEYS_POLLS_RESET", "COMMUNICATIONS", "Surveys and polls reset to factory defaults.");
      return fresh;
    },

    exportSurveysPollsManifest() {
      const config = this.getSurveysPollsConfig();
      const filename = "surveys_polls_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("SURVEYS_POLLS_EXPORTED", "DATA_EXPORT", `Surveys and polls exported (${filename}).`);
      return filename;
    },

    // --- MODULE 10-005: Email Templates ---
    getEmailTemplatesConfig() {
      return _hydrateConfig("cso_email_templates_config", "templates", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        templates: [
          {
            id: "TPL-EML-01",
            name: "Welcome Onboarding - New Aspirant",
            code: "WELCOME_ASPIRANT_2026",
            category: "Onboarding",
            subject: "Welcome to CS Odisha: Your Journey to Public Service Begins Here",
            variables: ["{{userName}}", "{{examCategory}}", "{{dashboardUrl}}", "{{telegramGroupLink}}"],
            status: "Active",
            lastEditedBy: "Editor-in-Chief",
            updatedAt: "2026-11-05T10:00:00Z"
          },
          {
            id: "TPL-EML-02",
            name: "Payment Receipt & Invoice Confirmation",
            code: "BILLING_RECEIPT_GST",
            category: "Billing",
            subject: "Receipt for Order #{{orderId}} - CS Odisha Educational Foundation",
            variables: ["{{userName}}", "{{orderId}}", "{{amount}}", "{{downloadInvoiceUrl}}", "{{gstNumber}}"],
            status: "Active",
            lastEditedBy: "Finance Ops",
            updatedAt: "2026-11-06T14:30:00Z"
          },
          {
            id: "TPL-EML-03",
            name: "Urgent Exam Alert & Notification Flash",
            code: "EXAM_ALERT_FLASH",
            category: "Alerts",
            subject: "CRITICAL ALERT: {{examName}} Admit Card / Gazette Notification Released",
            variables: ["{{examName}}", "{{downloadAdmitCardUrl}}", "{{reportingDateTime}}", "{{instructions}}"],
            status: "Active",
            lastEditedBy: "Ops Dispatch",
            updatedAt: "2026-11-07T11:15:00Z"
          },
          {
            id: "TPL-EML-04",
            name: "Password Reset & Security Verification",
            code: "AUTH_RESET_TOKEN",
            category: "Security",
            subject: "Reset your CS Odisha account password (Valid for 15 minutes)",
            variables: ["{{userName}}", "{{resetToken}}", "{{expiryMinutes}}", "{{ipAddress}}"],
            status: "Active",
            lastEditedBy: "Security Lead",
            updatedAt: "2026-11-04T08:00:00Z"
          },
          {
            id: "TPL-EML-05",
            name: "Weekly Current Affairs Digest (Bilingual)",
            code: "WEEKLY_DIGEST_ODIA_ENG",
            category: "Newsletters",
            subject: "Odisha Weekly Current Affairs Digest #{{issueNumber}} (Nov 2026)",
            variables: ["{{issueNumber}}", "{{leadStory}}", "{{quizUrl}}", "{{unsubscribeUrl}}"],
            status: "Draft",
            lastEditedBy: "Editorial Desk",
            updatedAt: "2026-11-09T09:45:00Z"
          }
        ]
      }));
    },

    saveEmailTemplatesConfig(config) {
      if (!config) return false;
      const list = config.templates || config.items || [];
      config.items = list;
      config.templates = list;
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      localStorage.setItem("cso_email_templates_config", JSON.stringify(config));
      this.logAudit("EMAIL_TEMPLATES_UPDATED", "COMMUNICATIONS", `Email templates updated (${list.length} records).`);
      return true;
    },

    resetEmailTemplatesConfig() {
      localStorage.removeItem("cso_email_templates_config");
      const fresh = this.getEmailTemplatesConfig();
      this.logAudit("EMAIL_TEMPLATES_RESET", "COMMUNICATIONS", "Email templates reset to factory defaults.");
      return fresh;
    },

    exportEmailTemplatesManifest() {
      const config = this.getEmailTemplatesConfig();
      const filename = "email_templates_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("EMAIL_TEMPLATES_EXPORTED", "DATA_EXPORT", `Email templates exported (${filename}).`);
      return filename;
    },

    // --- MODULE 10-006: Email Campaigns ---
    getEmailCampaignsConfig() {
      return _hydrateConfig("cso_email_campaigns_config", "campaigns", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        campaigns: [
          {
            id: "CMP-901",
            title: "OPSC 2026 Prelims Fast-Track Revision Launch",
            templateId: "TPL-EML-01",
            audience: "All OPSC Registered Users (18,450)",
            sentCount: 18450,
            deliveredRate: "99.4%",
            openRate: "42.8%",
            clickRate: "16.2%",
            status: "Completed",
            scheduledFor: "2026-11-02T08:00:00Z",
            completedAt: "2026-11-02T09:12:00Z"
          },
          {
            id: "CMP-902",
            title: "Diwali Special 30% Scholarship on Annual Mock Series",
            templateId: "TPL-EML-02",
            audience: "Free Tier Aspirants (24,100)",
            sentCount: 24100,
            deliveredRate: "98.9%",
            openRate: "38.5%",
            clickRate: "19.7%",
            status: "Completed",
            scheduledFor: "2026-11-01T10:00:00Z",
            completedAt: "2026-11-01T11:45:00Z"
          },
          {
            id: "CMP-903",
            title: "OTET 2026 Live Doubt Clearing Workshop Announcement",
            templateId: "TPL-EML-03",
            audience: "Teaching Exam Aspirants (9,800)",
            sentCount: 9800,
            deliveredRate: "99.1%",
            openRate: "47.2%",
            clickRate: "24.1%",
            status: "Sent",
            scheduledFor: "2026-11-08T06:30:00Z",
            completedAt: "2026-11-08T07:10:00Z"
          },
          {
            id: "CMP-904",
            title: "November Monthly Gazette Round-Up & Quiz Challenge",
            templateId: "TPL-EML-05",
            audience: "All Active Subscribers (32,500)",
            sentCount: 0,
            deliveredRate: "0.0%",
            openRate: "0.0%",
            clickRate: "0.0%",
            status: "Scheduled",
            scheduledFor: "2026-11-12T07:00:00Z",
            completedAt: null
          }
        ]
      }));
    },

    saveEmailCampaignsConfig(config) {
      if (!config) return false;
      const list = config.campaigns || config.items || [];
      config.items = list;
      config.campaigns = list;
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      localStorage.setItem("cso_email_campaigns_config", JSON.stringify(config));
      this.logAudit("EMAIL_CAMPAIGNS_UPDATED", "COMMUNICATIONS", `Email campaigns updated (${list.length} records).`);
      return true;
    },

    resetEmailCampaignsConfig() {
      localStorage.removeItem("cso_email_campaigns_config");
      const fresh = this.getEmailCampaignsConfig();
      this.logAudit("EMAIL_CAMPAIGNS_RESET", "COMMUNICATIONS", "Email campaigns reset to factory defaults.");
      return fresh;
    },

    exportEmailCampaignsManifest() {
      const config = this.getEmailCampaignsConfig();
      const filename = "email_campaigns_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("EMAIL_CAMPAIGNS_EXPORTED", "DATA_EXPORT", `Email campaigns exported (${filename}).`);
      return filename;
    },

    // --- MODULE 10-007: Newsletter Subscribers ---
    getNewsletterSubscribersConfig() {
      return _hydrateConfig("cso_newsletter_subscribers_config", "subscribers", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        subscribers: [
          {
            id: "SUB-5501",
            email: "animesh.tripathy@gmail.com",
            fullName: "Animesh Tripathy",
            district: "Cuttack",
            preferences: ["Daily Quiz", "Civil Services", "Odia Gazette"],
            status: "Subscribed",
            source: "Footer Form",
            verified: true,
            subscribedAt: "2026-10-10T14:12:00Z"
          },
          {
            id: "SUB-5502",
            email: "smita.ranjan@yahoo.co.in",
            fullName: "Smita Ranjan",
            district: "Khordha",
            preferences: ["Teaching Exams", "Weekly Digest"],
            status: "Subscribed",
            source: "Modal Pop-up",
            verified: true,
            subscribedAt: "2026-10-18T09:30:00Z"
          },
          {
            id: "SUB-5503",
            email: "bikram.rout@outlook.com",
            fullName: "Bikram Rout",
            district: "Sambalpur",
            preferences: ["Engineering & Technical", "Exam Notifications"],
            status: "Unsubscribed",
            source: "Checkout Checkbox",
            verified: true,
            subscribedAt: "2026-09-05T18:20:00Z"
          },
          {
            id: "SUB-5504",
            email: "purnima.majhi@gmail.com",
            fullName: "Purnima Majhi",
            district: "Mayurbhanj",
            preferences: ["Daily Quiz", "Police SI & Constable", "Free Study Materials"],
            status: "Subscribed",
            source: "Registration Flow",
            verified: true,
            subscribedAt: "2026-11-03T11:40:00Z"
          },
          {
            id: "SUB-5505",
            email: "tanmay.baral@rediffmail.com",
            fullName: "Tanmay Baral",
            district: "Puri",
            preferences: ["All Updates"],
            status: "Pending Verification",
            source: "Landing Page",
            verified: false,
            subscribedAt: "2026-11-09T08:15:00Z"
          }
        ]
      }));
    },

    saveNewsletterSubscribersConfig(config) {
      if (!config) return false;
      const list = config.subscribers || config.items || [];
      config.items = list;
      config.subscribers = list;
      config.meta = config.meta || {};
      config.meta.updatedAt = new Date().toISOString();
      localStorage.setItem("cso_newsletter_subscribers_config", JSON.stringify(config));
      this.logAudit("NEWSLETTER_SUBSCRIBERS_UPDATED", "COMMUNICATIONS", `Newsletter subscribers updated (${list.length} records).`);
      return true;
    },

    resetNewsletterSubscribersConfig() {
      localStorage.removeItem("cso_newsletter_subscribers_config");
      const fresh = this.getNewsletterSubscribersConfig();
      this.logAudit("NEWSLETTER_SUBSCRIBERS_RESET", "COMMUNICATIONS", "Newsletter subscribers reset to factory defaults.");
      return fresh;
    },

    exportNewsletterSubscribersManifest() {
      const config = this.getNewsletterSubscribersConfig();
      const filename = "newsletter_subscribers_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("NEWSLETTER_SUBSCRIBERS_EXPORTED", "DATA_EXPORT", `Newsletter subscribers exported (${filename}).`);
      return filename;
    },
    // ==========================================
    // FOLDER 10 (COMMUNICATION & SUPPORT) - BATCH 2
    // ==========================================

    // --- MODULE 10-008: Notifications ---
    getNotificationsConfig() {
      return _hydrateConfig("cso_notifications_config", "notifications", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { totalDispatched: 64200, unreadCount: 5210, systemAlerts: 18 },
        items: [
          { id: "NTF-01", title: "OPSC OAS 2026 Prelims Admit Card Out", recipientScope: "All Aspirants", triggerType: "Exam Gazette Alert", targetUrl: "/jobs-careers/?filter=opsc", readStatus: "Read", priority: "High", createdAt: "2026-11-08 09:30", active: true },
          { id: "NTF-02", title: "Your Mock Test #14 Ranking is Available", recipientScope: "User: USR-1001", triggerType: "Test Evaluation", targetUrl: "/study-library/mock-evaluations", readStatus: "Unread", priority: "Medium", createdAt: "2026-11-09 11:15", active: true },
          { id: "NTF-03", title: "Payment Successful: 1-Year All-Access Pass", recipientScope: "User: USR-1002", triggerType: "Billing Confirmation", targetUrl: "/admin/?folder=folder-08&module=module-08-012", readStatus: "Read", priority: "Normal", createdAt: "2026-11-09 14:20", active: true }
        ]
      }));
    },

    saveNotificationsConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.notifications || cfg.items || [];
      cfg.items = list;
      cfg.notifications = list;
      localStorage.setItem("cso_notifications_config", JSON.stringify(cfg));
      this.logAudit("NOTIFICATIONS_UPDATED", "COMMUNICATIONS", `Notifications config updated (${list.length} records).`);
      return true;
    },

    resetNotificationsConfig() {
      localStorage.removeItem("cso_notifications_config");
      const fresh = this.getNotificationsConfig();
      this.logAudit("NOTIFICATIONS_RESET", "COMMUNICATIONS", "Notifications config reset to defaults.");
      return fresh;
    },

    exportNotificationsManifest() {
      const config = this.getNotificationsConfig();
      const filename = "notifications_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("NOTIFICATIONS_EXPORTED", "DATA_EXPORT", `Notifications manifest exported (${filename}).`);
      return filename;
    },

    // --- MODULE 10-009: Push Notifications ---
    getPushNotificationsConfig() {
      return _hydrateConfig("cso_push_notifications_config", "pushes", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { activeSubscribers: 28400, deliverySuccessRate: "98.8%", totalSentToday: 14200 },
        items: [
          { id: "PSH-01", notificationTitle: "New Gazette: OSSSC Combined Recruitment 2026", bodyText: "Application window opens tomorrow for 1,200+ vacancies across Odisha districts.", targetAudience: "All WebPush Subscribers", clickActionUrl: "https://csodisha.com/jobs-careers/", sentTime: "2026-11-08 17:00", deliveryCount: 28400, active: true },
          { id: "PSH-02", notificationTitle: "Daily Odia Vyakaran Quiz #42 Live", bodyText: "10 rapid-fire questions to test your syllabus grasp today.", targetAudience: "Study Library Tagged", clickActionUrl: "https://csodisha.com/study-library/", sentTime: "2026-11-09 08:00", deliveryCount: 16100, active: true }
        ]
      }));
    },

    savePushNotificationsConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.pushes || cfg.items || [];
      cfg.items = list;
      cfg.pushes = list;
      localStorage.setItem("cso_push_notifications_config", JSON.stringify(cfg));
      this.logAudit("PUSH_NOTIFICATIONS_UPDATED", "COMMUNICATIONS", `Push notifications updated (${list.length} records).`);
      return true;
    },

    resetPushNotificationsConfig() {
      localStorage.removeItem("cso_push_notifications_config");
      const fresh = this.getPushNotificationsConfig();
      this.logAudit("PUSH_NOTIFICATIONS_RESET", "COMMUNICATIONS", "Push notifications reset to defaults.");
      return fresh;
    },

    exportPushNotificationsManifest() {
      const config = this.getPushNotificationsConfig();
      const filename = "push_notifications_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("PUSH_NOTIFICATIONS_EXPORTED", "DATA_EXPORT", `Push notifications manifest exported (${filename}).`);
      return filename;
    },

    // --- MODULE 10-010: In-App Messages ---
    getInAppMessagesConfig() {
      return _hydrateConfig("cso_inapp_messages_config", "messages", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "IAM-01", messageName: "Scheduled Platform Upgrade Notice", modalType: "Slide-In Bottom Toast", headline: "Cloudflare D1 Infrastructure Maintenance", bodyContent: "Scheduled maintenance on Sunday 02:00 AM - 04:00 AM IST. Mock test engines may experience minor latency.", dismissible: true, displayFrequency: "Once Per Session", active: true },
          { id: "IAM-02", messageName: "Balasore District Circle Launch", modalType: "Center Dialog", headline: "Connect with Fellow Aspirants in Balasore", bodyContent: "Join the verified district discussion forum to exchange local exam center updates and group notes.", dismissible: true, displayFrequency: "Once", active: true }
        ]
      }));
    },

    saveInAppMessagesConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.messages || cfg.items || [];
      cfg.items = list;
      cfg.messages = list;
      localStorage.setItem("cso_inapp_messages_config", JSON.stringify(cfg));
      this.logAudit("INAPP_MESSAGES_UPDATED", "COMMUNICATIONS", `In-app messages updated (${list.length} records).`);
      return true;
    },

    resetInAppMessagesConfig() {
      localStorage.removeItem("cso_inapp_messages_config");
      const fresh = this.getInAppMessagesConfig();
      this.logAudit("INAPP_MESSAGES_RESET", "COMMUNICATIONS", "In-app messages reset to defaults.");
      return fresh;
    },

    exportInAppMessagesManifest() {
      const config = this.getInAppMessagesConfig();
      const filename = "inapp_messages_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("INAPP_MESSAGES_EXPORTED", "DATA_EXPORT", `In-app messages manifest exported (${filename}).`);
      return filename;
    },

    // --- MODULE 10-011: Announcement Banners ---
    getAnnouncementBannersConfig() {
      return _hydrateConfig("cso_announcement_banners_config", "banners", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "BNR-01", bannerText: "OPSC OAS 2026 Notification officially published! Check vacancies, eligibility & syllabus details.", themeColor: "amber", ctaLabel: "View Details", ctaUrl: "/jobs-careers/?section=0", targetPages: "All Pages", position: "Top Fixed Bar", active: true },
          { id: "BNR-02", bannerText: "Odisha State Scholarship Portal (SSP) last date extended to December 31, 2026.", themeColor: "blue", ctaLabel: "Read Guidelines", ctaUrl: "/schemes-benefits/?section=0", targetPages: "Schemes & Tools", position: "Header Banner", active: true },
          { id: "BNR-03", bannerText: "Emergency: OSSC CGL Exam Date Rescheduled to Dec 15 due to Cyclone Alert.", themeColor: "red", ctaLabel: "Official Circular", ctaUrl: "/jobs-careers/?filter=ossc", targetPages: "Home & Jobs", position: "Top Fixed Bar", active: false }
        ]
      }));
    },

    saveAnnouncementBannersConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.banners || cfg.items || [];
      cfg.items = list;
      cfg.banners = list;
      localStorage.setItem("cso_announcement_banners_config", JSON.stringify(cfg));
      this.logAudit("ANNOUNCEMENT_BANNERS_UPDATED", "COMMUNICATIONS", `Announcement banners updated (${list.length} records).`);
      return true;
    },

    resetAnnouncementBannersConfig() {
      localStorage.removeItem("cso_announcement_banners_config");
      const fresh = this.getAnnouncementBannersConfig();
      this.logAudit("ANNOUNCEMENT_BANNERS_RESET", "COMMUNICATIONS", "Announcement banners reset to defaults.");
      return fresh;
    },

    exportAnnouncementBannersManifest() {
      const config = this.getAnnouncementBannersConfig();
      const filename = "announcement_banners_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("ANNOUNCEMENT_BANNERS_EXPORTED", "DATA_EXPORT", `Announcement banners manifest exported (${filename}).`);
      return filename;
    },

    // --- MODULE 10-012: Help Centre ---
    getHelpCentreConfig() {
      return _hydrateConfig("cso_help_centre_config", "articles", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { totalArticles: 42, viewsCount: 19840, helpfulUpvotes: 1420 },
        items: [
          { id: "HLP-01", articleTitle: "How to Download Official Gazette Notification PDFs", category: "General Navigation", readTime: "3 min", views: 4210, helpfulCount: 390, lastUpdated: "2026-10-14", active: true },
          { id: "HLP-02", articleTitle: "Troubleshooting UPI Payment Failures on Razorpay / Cashfree", category: "Payments & Invoices", readTime: "4 min", views: 6810, helpfulCount: 580, lastUpdated: "2026-11-01", active: true },
          { id: "HLP-03", articleTitle: "How Mock Test Percentiles and Statewide Ranks Are Calculated", category: "Study Library", readTime: "5 min", views: 8820, helpfulCount: 450, lastUpdated: "2026-11-05", active: true }
        ]
      }));
    },

    saveHelpCentreConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.articles || cfg.items || [];
      cfg.items = list;
      cfg.articles = list;
      localStorage.setItem("cso_help_centre_config", JSON.stringify(cfg));
      this.logAudit("HELP_CENTRE_UPDATED", "COMMUNICATIONS", `Help centre articles updated (${list.length} records).`);
      return true;
    },

    resetHelpCentreConfig() {
      localStorage.removeItem("cso_help_centre_config");
      const fresh = this.getHelpCentreConfig();
      this.logAudit("HELP_CENTRE_RESET", "COMMUNICATIONS", "Help centre reset to defaults.");
      return fresh;
    },

    exportHelpCentreManifest() {
      const config = this.getHelpCentreConfig();
      const filename = "help_centre_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("HELP_CENTRE_EXPORTED", "DATA_EXPORT", `Help centre manifest exported (${filename}).`);
      return filename;
    },

    // --- MODULE 10-013: Support Categories ---
    getSupportCategoriesConfig() {
      return _hydrateConfig("cso_support_categories_config", "categories", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "CAT-01", categoryName: "Payment & Subscription Queries", departmentLead: "CS Odisha Billing Desk", slaTarget: "4 Hours", ticketCount: 48, defaultPriority: "High", active: true },
          { id: "CAT-02", categoryName: "Account Access & OTP Issues", departmentLead: "Platform Operations", slaTarget: "2 Hours", ticketCount: 34, defaultPriority: "High", active: true },
          { id: "CAT-03", categoryName: "Syllabus & Errata Reporting", departmentLead: "Academic Editorial Board", slaTarget: "12 Hours", ticketCount: 82, defaultPriority: "Normal", active: true },
          { id: "CAT-04", categoryName: "General Exam Information & Queries", departmentLead: "Community Moderator Desk", slaTarget: "24 Hours", ticketCount: 110, defaultPriority: "Normal", active: true }
        ]
      }));
    },

    saveSupportCategoriesConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.categories || cfg.items || [];
      cfg.items = list;
      cfg.categories = list;
      localStorage.setItem("cso_support_categories_config", JSON.stringify(cfg));
      this.logAudit("SUPPORT_CATEGORIES_UPDATED", "COMMUNICATIONS", `Support categories updated (${list.length} records).`);
      return true;
    },

    resetSupportCategoriesConfig() {
      localStorage.removeItem("cso_support_categories_config");
      const fresh = this.getSupportCategoriesConfig();
      this.logAudit("SUPPORT_CATEGORIES_RESET", "COMMUNICATIONS", "Support categories reset to defaults.");
      return fresh;
    },

    exportSupportCategoriesManifest() {
      const config = this.getSupportCategoriesConfig();
      const filename = "support_categories_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("SUPPORT_CATEGORIES_EXPORTED", "DATA_EXPORT", `Support categories manifest exported (${filename}).`);
      return filename;
    },

    // --- MODULE 10-014: Spam & Abuse Reports ---
    getSpamAbuseConfig() {
      return _hydrateConfig("cso_spam_abuse_config", "incidents", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        summary: { totalSpamIncidents: 64, blockedAddresses: 19, honeypotTrapped: 45 },
        items: [
          { id: "SPM-01", suspectIdentifier: "bot_crawler_98@tempmail.com", abuseType: "Form Ingestion Flooding", trapTrigger: "Contact Form HoneyPot", ipAddress: "194.26.29.112", actionTaken: "Auto-Banned at Cloudflare Edge", loggedAt: "2026-11-07 02:40", active: true },
          { id: "SPM-02", suspectIdentifier: "scam_job_offer@gmail.com", abuseType: "Prohibited Exam Coaching Links", trapTrigger: "Keyword Regex Filter", ipAddress: "45.154.255.80", actionTaken: "Quarantined for Review", loggedAt: "2026-11-08 19:15", active: true },
          { id: "SPM-03", suspectIdentifier: "rate_limit_excess@103.44.12.9", abuseType: "Rapid OTP Request Exhaustion", trapTrigger: "Rate Limiter (20 req/min)", ipAddress: "103.44.12.9", actionTaken: "Temporary IP Cooldown (24h)", loggedAt: "2026-11-09 13:50", active: true }
        ]
      }));
    },

    saveSpamAbuseConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.incidents || cfg.items || [];
      cfg.items = list;
      cfg.incidents = list;
      localStorage.setItem("cso_spam_abuse_config", JSON.stringify(cfg));
      this.logAudit("SPAM_ABUSE_UPDATED", "COMMUNICATIONS", `Spam abuse incidents updated (${list.length} records).`);
      return true;
    },

    resetSpamAbuseConfig() {
      localStorage.removeItem("cso_spam_abuse_config");
      const fresh = this.getSpamAbuseConfig();
      this.logAudit("SPAM_ABUSE_RESET", "COMMUNICATIONS", "Spam abuse incidents reset to defaults.");
      return fresh;
    },

    exportSpamAbuseManifest() {
      const config = this.getSpamAbuseConfig();
      const filename = "spam_abuse_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("SPAM_ABUSE_EXPORTED", "DATA_EXPORT", `Spam abuse manifest exported (${filename}).`);
      return filename;
    },
    // ==========================================
    // FOLDER 11 (WEBSITE APPEARANCE STUDIO) - BATCH 1
    // ==========================================

    // --- MODULE 11-001: Brand Identity ---
    getBrandIdentityConfig() {
      return _hydrateConfig("cso_brand_identity_config", "brandAssets", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { brandName: "Common Sense Odisha", legalEntity: "CS Odisha Knowledge Media", tagline: "Democratizing Public Exam Intelligence Across All 30 Districts" },
        items: [
          { id: "BID-01", assetKey: "OFFICIAL_NAME", title: "Portal Brand Name", value: "Common Sense Odisha (csodisha.com)", usageContext: "Header Brand Mark, Title Tag", active: true },
          { id: "BID-02", assetKey: "BRAND_TAGLINE", title: "Primary Mission Tagline", value: "Aspirant-Centric Gazette Intelligence & Academic Empowerment", usageContext: "Hero Section, Meta Descriptions", active: true },
          { id: "BID-03", assetKey: "VOICE_TONE", title: "Editorial Tone Standard", value: "Objective, Authoritative, Empathetic, Strictly Verified", usageContext: "Content Styleguide", active: true }
        ]
      }));
    },

    saveBrandIdentityConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.brandAssets || cfg.items || [];
      cfg.items = list;
      cfg.brandAssets = list;
      localStorage.setItem("cso_brand_identity_config", JSON.stringify(cfg));
      this.logAudit("BRAND_IDENTITY_UPDATED", "APPEARANCE", `Brand identity config updated (${list.length} assets).`);
      return true;
    },

    resetBrandIdentityConfig() {
      localStorage.removeItem("cso_brand_identity_config");
      const fresh = this.getBrandIdentityConfig();
      this.logAudit("BRAND_IDENTITY_RESET", "APPEARANCE", "Brand identity reset to defaults.");
      return fresh;
    },

    exportBrandIdentityManifest() {
      const config = this.getBrandIdentityConfig();
      const filename = "brand_identity_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("BRAND_IDENTITY_EXPORTED", "DATA_EXPORT", `Brand identity manifest exported (${filename}).`);
      return filename;
    },

    // --- MODULE 11-002: Logo & Favicon ---
    getLogoFaviconConfig() {
      return _hydrateConfig("cso_logo_favicon_config", "assets", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { defaultLogoVariant: "Primary Dark Theme", enableSvgScaling: true },
        items: [
          { id: "LGO-01", name: "Primary Header Logo (Light Theme)", fileType: "SVG", dimensions: "240x48", assetUrl: "/assets/images/logo-cso-dark.svg", usageSlot: "Desktop Header", active: true },
          { id: "LGO-02", name: "Primary Header Logo (Dark Theme)", fileType: "SVG", dimensions: "240x48", assetUrl: "/assets/images/logo-cso-light.svg", usageSlot: "Desktop Header", active: true },
          { id: "LGO-03", name: "Mobile App Icon & Monogram", fileType: "PNG", dimensions: "192x192", assetUrl: "/assets/images/cso-monogram-192.png", usageSlot: "Mobile Drawer & PWA", active: true },
          { id: "LGO-04", name: "Browser Favicon Multi-Res", fileType: "ICO", dimensions: "32x32", assetUrl: "/favicon.ico", usageSlot: "Browser Tab & Bookmarks", active: true }
        ]
      }));
    },

    saveLogoFaviconConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.assets || cfg.items || [];
      cfg.items = list;
      cfg.assets = list;
      localStorage.setItem("cso_logo_favicon_config", JSON.stringify(cfg));
      this.logAudit("LOGO_FAVICON_UPDATED", "APPEARANCE", `Logo & favicon config updated (${list.length} assets).`);
      return true;
    },

    resetLogoFaviconConfig() {
      localStorage.removeItem("cso_logo_favicon_config");
      const fresh = this.getLogoFaviconConfig();
      this.logAudit("LOGO_FAVICON_RESET", "APPEARANCE", "Logo & favicon reset to defaults.");
      return fresh;
    },

    exportLogoFaviconManifest() {
      const config = this.getLogoFaviconConfig();
      const filename = "logo_favicon_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("LOGO_FAVICON_EXPORTED", "DATA_EXPORT", `Logo & favicon manifest exported (${filename}).`);
      return filename;
    },

    // --- MODULE 11-003: Colors & Themes ---
    getColorsThemesConfig() {
      return _hydrateConfig("cso_colors_themes_config", "palette", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { activeTheme: "Aspirant Dark Slate", autoSystemPreference: true },
        items: [
          { id: "CLR-01", tokenName: "--cso-primary", label: "Odisha Royal Emerald", hexCode: "#059669", cssVar: "var(--cso-primary)", usage: "Primary CTAs, Accent Highlights", active: true },
          { id: "CLR-02", tokenName: "--cso-surface-bg", label: "Dark Canvas Slate", hexCode: "#020617", cssVar: "var(--cso-surface-bg)", usage: "Main Background Canvas", active: true },
          { id: "CLR-03", tokenName: "--cso-card-bg", label: "Elevated Card Slate", hexCode: "#0f172a", cssVar: "var(--cso-card-bg)", usage: "Module & Metric Cards", active: true },
          { id: "CLR-04", tokenName: "--cso-accent-gold", label: "Gazette Gold", hexCode: "#f59e0b", cssVar: "var(--cso-accent-gold)", usage: "Urgent Badges, Notifications", active: true }
        ]
      }));
    },

    saveColorsThemesConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.palette || cfg.items || [];
      cfg.items = list;
      cfg.palette = list;
      localStorage.setItem("cso_colors_themes_config", JSON.stringify(cfg));
      this.logAudit("COLORS_THEMES_UPDATED", "APPEARANCE", `Colors & themes config updated (${list.length} tokens).`);
      return true;
    },

    resetColorsThemesConfig() {
      localStorage.removeItem("cso_colors_themes_config");
      const fresh = this.getColorsThemesConfig();
      this.logAudit("COLORS_THEMES_RESET", "APPEARANCE", "Colors & themes reset to defaults.");
      return fresh;
    },

    exportColorsThemesManifest() {
      const config = this.getColorsThemesConfig();
      const filename = "colors_themes_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("COLORS_THEMES_EXPORTED", "DATA_EXPORT", `Colors & themes manifest exported (${filename}).`);
      return filename;
    },

    // --- MODULE 11-004: Typography ---
    getTypographyConfig() {
      return _hydrateConfig("cso_typography_config", "fonts", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { baseFontSize: "16px", rootLineHeight: "1.6", fontSmoothing: "antialiased" },
        items: [
          { id: "TYP-01", fontRole: "Primary Headings (Display)", fontFamily: "Outfit, Inter, sans-serif", weightRange: "600, 700, 800", provider: "Google Fonts CDN", active: true },
          { id: "TYP-02", fontRole: "Body Prose & Study Notes", fontFamily: "Inter, system-ui, sans-serif", weightRange: "400, 500", provider: "Google Fonts CDN", active: true },
          { id: "TYP-03", fontRole: "Odia Regional Typography", fontFamily: "Noto Sans Oriya, Kalinga, sans-serif", weightRange: "400, 600", provider: "Google Fonts CDN", active: true },
          { id: "TYP-04", fontRole: "Code & Exam Roll Tables", fontFamily: "JetBrains Mono, monospace", weightRange: "400, 500", provider: "System Fallback", active: true }
        ]
      }));
    },

    saveTypographyConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.fonts || cfg.items || [];
      cfg.items = list;
      cfg.fonts = list;
      localStorage.setItem("cso_typography_config", JSON.stringify(cfg));
      this.logAudit("TYPOGRAPHY_UPDATED", "APPEARANCE", `Typography config updated (${list.length} fonts).`);
      return true;
    },

    resetTypographyConfig() {
      localStorage.removeItem("cso_typography_config");
      const fresh = this.getTypographyConfig();
      this.logAudit("TYPOGRAPHY_RESET", "APPEARANCE", "Typography reset to defaults.");
      return fresh;
    },

    exportTypographyManifest() {
      const config = this.getTypographyConfig();
      const filename = "typography_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("TYPOGRAPHY_EXPORTED", "DATA_EXPORT", `Typography manifest exported (${filename}).`);
      return filename;
    },

    // --- MODULE 11-005: Header Design ---
    getHeaderDesignConfig() {
      return _hydrateConfig("cso_header_design_config", "headerComponents", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { layoutStyle: "Floating Glassmorphism", isSticky: true, blurBackdrop: true, heightPx: 64 },
        items: [
          { id: "HDR-01", sectionSlot: "Top Utility Alert Strip", component: "Ticker Marquee", isVisible: true, orderWeight: 1, active: true },
          { id: "HDR-02", sectionSlot: "Main Navigation Bar", component: "Logo + Nav Links + Quick Search", isVisible: true, orderWeight: 2, active: true },
          { id: "HDR-03", sectionSlot: "User Action Cluster", component: "Theme Switcher + Notification Bell + Aspirant Profile", isVisible: true, orderWeight: 3, active: true }
        ]
      }));
    },

    saveHeaderDesignConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.headerComponents || cfg.items || [];
      cfg.items = list;
      cfg.headerComponents = list;
      localStorage.setItem("cso_header_design_config", JSON.stringify(cfg));
      this.logAudit("HEADER_DESIGN_UPDATED", "APPEARANCE", `Header design updated (${list.length} components).`);
      return true;
    },

    resetHeaderDesignConfig() {
      localStorage.removeItem("cso_header_design_config");
      const fresh = this.getHeaderDesignConfig();
      this.logAudit("HEADER_DESIGN_RESET", "APPEARANCE", "Header design reset to defaults.");
      return fresh;
    },

    exportHeaderDesignManifest() {
      const config = this.getHeaderDesignConfig();
      const filename = "header_design_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("HEADER_DESIGN_EXPORTED", "DATA_EXPORT", `Header design manifest exported (${filename}).`);
      return filename;
    },

    // --- MODULE 11-006: Footer Design ---
    getFooterDesignConfig() {
      return _hydrateConfig("cso_footer_design_config", "footerSections", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { layoutColumns: 4, showGovernmentDisclaimer: true, showDistrictBadgeGrid: true },
        items: [
          { id: "FTR-01", sectionSlot: "Brand Mission & 30-District Commitment", contentType: "Rich Text + Trust Seal", columnSpan: 1, active: true },
          { id: "FTR-02", sectionSlot: "Official Commission Directory", contentType: "Link Hierarchy (OPSC, OSSC, OSSSC)", columnSpan: 1, active: true },
          { id: "FTR-03", sectionSlot: "Aspirant Resources Vault", contentType: "Curriculum Links + Mock Hub", columnSpan: 1, active: true },
          { id: "FTR-04", sectionSlot: "Statutory & Privacy Compliance", contentType: "DPDP Act, Legal Disclaimer, Copyright", columnSpan: 1, active: true }
        ]
      }));
    },

    saveFooterDesignConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.footerSections || cfg.items || [];
      cfg.items = list;
      cfg.footerSections = list;
      localStorage.setItem("cso_footer_design_config", JSON.stringify(cfg));
      this.logAudit("FOOTER_DESIGN_UPDATED", "APPEARANCE", `Footer design updated (${list.length} sections).`);
      return true;
    },

    resetFooterDesignConfig() {
      localStorage.removeItem("cso_footer_design_config");
      const fresh = this.getFooterDesignConfig();
      this.logAudit("FOOTER_DESIGN_RESET", "APPEARANCE", "Footer design reset to defaults.");
      return fresh;
    },

    exportFooterDesignManifest() {
      const config = this.getFooterDesignConfig();
      const filename = "footer_design_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("FOOTER_DESIGN_EXPORTED", "DATA_EXPORT", `Footer design manifest exported (${filename}).`);
      return filename;
    },

    // --- MODULE 11-007: Homepage Layout ---
    getHomepageLayoutConfig() {
      return _hydrateConfig("cso_homepage_layout_config", "sections", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { containerMaxWidth: "1280px", gridGap: "24px", enableDynamicHydration: true },
        items: [
          { id: "SEC-01", sectionName: "Hero Command Hub & Live Exam Search", layoutGrid: "12-Col Centered", isDynamic: true, priorityOrder: 1, active: true },
          { id: "SEC-02", sectionName: "Active Gazette Alert Feed (Live Ticker)", layoutGrid: "Full Width Carousel", isDynamic: true, priorityOrder: 2, active: true },
          { id: "SEC-03", sectionName: "Top Commission Desks (OPSC / OSSC / OSSSC)", layoutGrid: "3-Col Card Grid", isDynamic: false, priorityOrder: 3, active: true },
          { id: "SEC-04", sectionName: "Featured Mock Tests & District Question Bank", layoutGrid: "4-Col Resource Cards", isDynamic: true, priorityOrder: 4, active: true },
          { id: "SEC-05", sectionName: "Odisha Welfare Schemes & Scholarship Directory", layoutGrid: "2-Col Featured Split", isDynamic: false, priorityOrder: 5, active: true }
        ]
      }));
    },

    saveHomepageLayoutConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.sections || cfg.items || [];
      cfg.items = list;
      cfg.sections = list;
      localStorage.setItem("cso_homepage_layout_config", JSON.stringify(cfg));
      this.logAudit("HOMEPAGE_LAYOUT_UPDATED", "APPEARANCE", `Homepage layout updated (${list.length} sections).`);
      return true;
    },

    resetHomepageLayoutConfig() {
      localStorage.removeItem("cso_homepage_layout_config");
      const fresh = this.getHomepageLayoutConfig();
      this.logAudit("HOMEPAGE_LAYOUT_RESET", "APPEARANCE", "Homepage layout reset to defaults.");
      return fresh;
    },

    exportHomepageLayoutManifest() {
      const config = this.getHomepageLayoutConfig();
      const filename = "homepage_layout_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("HOMEPAGE_LAYOUT_EXPORTED", "DATA_EXPORT", `Homepage layout manifest exported (${filename}).`);
      return filename;
    },
    // ==========================================
    // FOLDER 11 (WEBSITE APPEARANCE STUDIO) - BATCH 2
    // ==========================================

    // --- MODULE 11-008: Banners & Sliders ---
    getBannersSlidersConfig() {
      return _hydrateConfig("cso_banners_sliders_config", "slides", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { autoplay: true, slideDurationMs: 6000, transitionEffect: "fade" },
        items: [
          { id: "SLD-01", title: "OPSC OAS 2026 Comprehensive Strategy Vault", subtitle: "Complete Syllabus, Gazette Digests & 30-District Aspirant Forum", ctaLabel: "Explore Resources", ctaUrl: "/jobs-careers/?filter=opsc", imageUrl: "/assets/images/banner-oas-2026.webp", priority: 1, active: true },
          { id: "SLD-02", title: "Free Statewide Mock Test Series 2026", subtitle: "Real-time statewide candidate rank benchmarking and detailed solutions", ctaLabel: "Attempt Mock Free", ctaUrl: "/study-library/mock-tests", imageUrl: "/assets/images/banner-mock-series.webp", priority: 2, active: true },
          { id: "SLD-03", title: "Odisha State Scholarship Portal (SSP) Guide", subtitle: "Eligibility guidelines, document checklist & application tracker", ctaLabel: "Check Eligibility", ctaUrl: "/schemes-benefits/?scheme=medhabruti", imageUrl: "/assets/images/banner-scholarship.webp", priority: 3, active: true }
        ]
      }));
    },

    saveBannersSlidersConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.slides || cfg.items || [];
      cfg.items = list;
      cfg.slides = list;
      localStorage.setItem("cso_banners_sliders_config", JSON.stringify(cfg));
      this.logAudit("BANNERS_SLIDERS_UPDATED", "APPEARANCE", `Banners & sliders updated (${list.length} slides).`);
      return true;
    },

    resetBannersSlidersConfig() {
      localStorage.removeItem("cso_banners_sliders_config");
      const fresh = this.getBannersSlidersConfig();
      this.logAudit("BANNERS_SLIDERS_RESET", "APPEARANCE", "Banners & sliders reset to defaults.");
      return fresh;
    },

    exportBannersSlidersManifest() {
      const config = this.getBannersSlidersConfig();
      const filename = "banners_sliders_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("BANNERS_SLIDERS_EXPORTED", "DATA_EXPORT", `Banners & sliders manifest exported (${filename}).`);
      return filename;
    },

    // --- MODULE 11-009: Buttons & Cards ---
    getButtonsCardsConfig() {
      return _hydrateConfig("cso_buttons_cards_config", "uiComponents", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { defaultBorderRadius: "rounded-xl", activeShadowElevation: "shadow-lg shadow-black/40", buttonPadding: "px-4 py-2.5" },
        items: [
          { id: "UI-BTN-01", componentRole: "Primary Action Button", borderRadius: "12px", borderStyle: "border border-emerald-500/30", backgroundGradient: "from-emerald-600 to-emerald-700", hoverEffect: "hover:scale-[1.02] hover:shadow-emerald-500/20", active: true },
          { id: "UI-BTN-02", componentRole: "Secondary Ghost Button", borderRadius: "12px", borderStyle: "border border-slate-700", backgroundGradient: "bg-slate-900/60 hover:bg-slate-800", hoverEffect: "hover:border-slate-500", active: true },
          { id: "UI-CRD-01", componentRole: "Exam Information Card", borderRadius: "16px", borderStyle: "border border-slate-800/80", backgroundGradient: "bg-slate-900/50 backdrop-blur-md", hoverEffect: "hover:border-emerald-500/40 hover:-translate-y-0.5", active: true },
          { id: "UI-CRD-02", componentRole: "Study Module Vault Card", borderRadius: "16px", borderStyle: "border border-slate-800", backgroundGradient: "bg-slate-950/80", hoverEffect: "hover:border-sky-500/40", active: true }
        ]
      }));
    },

    saveButtonsCardsConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.uiComponents || cfg.items || [];
      cfg.items = list;
      cfg.uiComponents = list;
      localStorage.setItem("cso_buttons_cards_config", JSON.stringify(cfg));
      this.logAudit("BUTTONS_CARDS_UPDATED", "APPEARANCE", `Buttons & cards updated (${list.length} components).`);
      return true;
    },

    resetButtonsCardsConfig() {
      localStorage.removeItem("cso_buttons_cards_config");
      const fresh = this.getButtonsCardsConfig();
      this.logAudit("BUTTONS_CARDS_RESET", "APPEARANCE", "Buttons & cards reset to defaults.");
      return fresh;
    },

    exportButtonsCardsManifest() {
      const config = this.getButtonsCardsConfig();
      const filename = "buttons_cards_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("BUTTONS_CARDS_EXPORTED", "DATA_EXPORT", `Buttons & cards manifest exported (${filename}).`);
      return filename;
    },

    // --- MODULE 11-010: Reusable Components ---
    getReusableComponentsConfig() {
      return _hydrateConfig("cso_reusable_components_config", "components", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "RCO-01", componentTag: "cso-status-badge", name: "Recruitment Status Pill", htmlSnippet: `<span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Active</span>`, usageScope: "Jobs & Careers, Admit Cards", active: true },
          { id: "RCO-02", componentTag: "cso-gazette-callout", name: "Official Gazette Alert Box", htmlSnippet: `<div class="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 text-amber-300 text-xs flex gap-3 items-center">Verified Gazette</div>`, usageScope: "Notifications, Study Library", active: true },
          { id: "RCO-03", componentTag: "cso-district-chip", name: "Odisha 30-District Tag", htmlSnippet: `<span class="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">Balasore</span>`, usageScope: "Community Forums, Job Filters", active: true }
        ]
      }));
    },

    saveReusableComponentsConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.components || cfg.items || [];
      cfg.items = list;
      cfg.components = list;
      localStorage.setItem("cso_reusable_components_config", JSON.stringify(cfg));
      this.logAudit("REUSABLE_COMPONENTS_UPDATED", "APPEARANCE", `Reusable components updated (${list.length} components).`);
      return true;
    },

    resetReusableComponentsConfig() {
      localStorage.removeItem("cso_reusable_components_config");
      const fresh = this.getReusableComponentsConfig();
      this.logAudit("REUSABLE_COMPONENTS_RESET", "APPEARANCE", "Reusable components reset to defaults.");
      return fresh;
    },

    exportReusableComponentsManifest() {
      const config = this.getReusableComponentsConfig();
      const filename = "reusable_components_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("REUSABLE_COMPONENTS_EXPORTED", "DATA_EXPORT", `Reusable components manifest exported (${filename}).`);
      return filename;
    },

    // --- MODULE 11-011: Desktop & Mobile Preview ---
    getPreviewStudioConfig() {
      return _hydrateConfig("cso_preview_studio_config", "devices", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { currentSimulationUrl: "https://csodisha.com/", simulateNetworkLatency: false },
        items: [
          { id: "PRV-01", deviceName: "Mobile (iPhone 15 Pro / Pixel)", widthPx: 393, heightPx: 852, userAgentCategory: "Mobile Safari / Chrome", orientation: "Portrait", scaleFactor: "100%", active: true },
          { id: "PRV-02", deviceName: "Tablet (iPad Mini / Air)", widthPx: 768, heightPx: 1024, userAgentCategory: "Tablet Mobile", orientation: "Portrait", scaleFactor: "85%", active: true },
          { id: "PRV-03", deviceName: "Standard Desktop Display", widthPx: 1440, heightPx: 900, userAgentCategory: "Desktop Chrome", orientation: "Landscape", scaleFactor: "75%", active: true },
          { id: "PRV-04", deviceName: "Ultrawide Enterprise Monitor", widthPx: 1920, heightPx: 1080, userAgentCategory: "Desktop Workstation", orientation: "Landscape", scaleFactor: "60%", active: true }
        ]
      }));
    },

    savePreviewStudioConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.devices || cfg.items || [];
      cfg.items = list;
      cfg.devices = list;
      localStorage.setItem("cso_preview_studio_config", JSON.stringify(cfg));
      this.logAudit("PREVIEW_STUDIO_UPDATED", "APPEARANCE", `Preview studio devices updated (${list.length} devices).`);
      return true;
    },

    resetPreviewStudioConfig() {
      localStorage.removeItem("cso_preview_studio_config");
      const fresh = this.getPreviewStudioConfig();
      this.logAudit("PREVIEW_STUDIO_RESET", "APPEARANCE", "Preview studio reset to defaults.");
      return fresh;
    },

    exportPreviewStudioManifest() {
      const config = this.getPreviewStudioConfig();
      const filename = "preview_studio_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("PREVIEW_STUDIO_EXPORTED", "DATA_EXPORT", `Preview studio manifest exported (${filename}).`);
      return filename;
    },

    // --- MODULE 11-012: Accessibility Styling ---
    getAccessibilityStylingConfig() {
      return _hydrateConfig("cso_accessibility_styling_config", "rules", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { complianceTarget: "WCAG 2.1 AA", highContrastModeAvailable: true, dyslexiaFontToggle: true },
        items: [
          { id: "ACC-01", ruleName: "Interactive Element Focus Ring", selector: ":focus-visible", cssDeclaration: "outline: 2px solid #059669; outline-offset: 2px;", status: "Enforced Globally", active: true },
          { id: "ACC-02", ruleName: "Contrast Ratio Protection", selector: ".text-slate-400, .text-slate-300", cssDeclaration: "min-contrast-ratio: 4.5:1 against #020617", status: "Enforced Globally", active: true },
          { id: "ACC-03", ruleName: "Screen Reader Only Content Guard", selector: ".sr-only", cssDeclaration: "position: absolute; width: 1px; height: 1px; overflow: hidden;", status: "Enforced Globally", active: true },
          { id: "ACC-04", ruleName: "Reduced Motion Accommodation", selector: "@media (prefers-reduced-motion: reduce)", cssDeclaration: "animation-duration: 0.01ms !important; transition-duration: 0.01ms !important;", status: "Enforced Globally", active: true }
        ]
      }));
    },

    saveAccessibilityStylingConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.rules || cfg.items || [];
      cfg.items = list;
      cfg.rules = list;
      localStorage.setItem("cso_accessibility_styling_config", JSON.stringify(cfg));
      this.logAudit("ACCESSIBILITY_STYLING_UPDATED", "APPEARANCE", `Accessibility styling updated (${list.length} rules).`);
      return true;
    },

    resetAccessibilityStylingConfig() {
      localStorage.removeItem("cso_accessibility_styling_config");
      const fresh = this.getAccessibilityStylingConfig();
      this.logAudit("ACCESSIBILITY_STYLING_RESET", "APPEARANCE", "Accessibility styling reset to defaults.");
      return fresh;
    },

    exportAccessibilityStylingManifest() {
      const config = this.getAccessibilityStylingConfig();
      const filename = "accessibility_styling_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("ACCESSIBILITY_STYLING_EXPORTED", "DATA_EXPORT", `Accessibility styling manifest exported (${filename}).`);
      return filename;
    },

    // --- MODULE 11-013: Custom 404 Page ---
    getCustom404Config() {
      return _hydrateConfig("cso_custom_404_config", "sections", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        settings: { enableSmartSearch: true, showQuickNavShortcuts: true, logMissingUrlsToAudit: true },
        items: [
          { id: "P404-01", sectionKey: "HERO_MESSAGE", title: "404 Main Headline", content: "Exam Notice or Resource Not Located", description: "Display headline shown to candidate when a URL fails", active: true },
          { id: "P404-02", sectionKey: "RECOVERY_SUBTEXT", title: "Guidance Subtitle", content: "The recruitment circular or page may have migrated to an updated gazette archive.", description: "Helpful redirect suggestion", active: true },
          { id: "P404-03", sectionKey: "PRIMARY_ACTION", title: "Primary Route CTA", content: "Search Jobs & Careers (/jobs-careers/?section=0)", description: "Direct button bringing user back to active recruitment", active: true },
          { id: "P404-04", sectionKey: "SECONDARY_ACTION", title: "Secondary Route CTA", content: "Return to Homepage (/)", description: "Fallback route", active: true }
        ]
      }));
    },

    saveCustom404Config(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.sections || cfg.items || [];
      cfg.items = list;
      cfg.sections = list;
      localStorage.setItem("cso_custom_404_config", JSON.stringify(cfg));
      this.logAudit("CUSTOM_404_UPDATED", "APPEARANCE", `Custom 404 page updated (${list.length} sections).`);
      return true;
    },

    resetCustom404Config() {
      localStorage.removeItem("cso_custom_404_config");
      const fresh = this.getCustom404Config();
      this.logAudit("CUSTOM_404_RESET", "APPEARANCE", "Custom 404 page reset to defaults.");
      return fresh;
    },

    exportCustom404Manifest() {
      const config = this.getCustom404Config();
      const filename = "custom_404_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("CUSTOM_404_EXPORTED", "DATA_EXPORT", `Custom 404 manifest exported (${filename}).`);
      return filename;
    },

    // --- MODULE 11-014: Design Version History ---
    getDesignVersionsConfig() {
      return _hydrateConfig("cso_design_versions_config", "versions", () => ({
        meta: { version: "1.0", updatedAt: new Date().toISOString() },
        items: [
          { id: "VER-03", releaseTag: "v2.4-AspirantEmerald", author: "Root Admin", notes: "Integrated high-contrast accessibility tokens & glassmorphism header", deployedAt: "2026-11-08 19:40", isCurrent: true, active: true },
          { id: "VER-02", releaseTag: "v2.3-AutumnDigest", author: "UI Lead", notes: "Enhanced mobile drawer typography & Odisha district tag components", deployedAt: "2026-10-22 14:15", isCurrent: false, active: true },
          { id: "VER-01", releaseTag: "v2.0-FoundationDark", author: "Root Admin", notes: "Initial production dark theme deployment with Slate-950 canvas", deployedAt: "2026-09-15 10:00", isCurrent: false, active: true }
        ]
      }));
    },

    saveDesignVersionsConfig(cfg) {
      if (!cfg) return false;
      cfg.meta = cfg.meta || {};
      cfg.meta.updatedAt = new Date().toISOString();
      const list = cfg.versions || cfg.items || [];
      cfg.items = list;
      cfg.versions = list;
      localStorage.setItem("cso_design_versions_config", JSON.stringify(cfg));
      this.logAudit("DESIGN_VERSIONS_UPDATED", "APPEARANCE", `Design version history updated (${list.length} releases).`);
      return true;
    },

    resetDesignVersionsConfig() {
      localStorage.removeItem("cso_design_versions_config");
      const fresh = this.getDesignVersionsConfig();
      this.logAudit("DESIGN_VERSIONS_RESET", "APPEARANCE", "Design version history reset to defaults.");
      return fresh;
    },

    exportDesignVersionsManifest() {
      const config = this.getDesignVersionsConfig();
      const filename = "design_versions_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
      this.downloadJson(filename, config);
      this.logAudit("DESIGN_VERSIONS_EXPORTED", "DATA_EXPORT", `Design versions manifest exported (${filename}).`);
      return filename;
    },


















        exportPrivacyManifest() {
      const config = this.getPrivacyConfig();
      const timestamp = Date.now();
      const filename = `cso-privacy-config-${timestamp}.json`;
      const bundle = {
        manifestVersion: "2026.11",
        exportedAt: new Date(timestamp).toISOString(),
        privacy: config
      };

      const jsonStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.logAudit('PRIVACY_MANIFEST_EXPORTED', 'DATA_EXPORT', `Privacy policy manifest exported (${filename}).`);
      return filename;
    },

    // 14. Master Feature Registry Engine (module-01-008)
    getFeatureRegistryStats(schema) {
      const s = schema || (typeof window !== 'undefined' && window.masterNavigationSchema) || null;
      if (!s || !Array.isArray(s.folders)) {
        return {
          totalFolders: 19,
          totalModules: 241,
          activeCount: 0,
          plannedCount: 0,
          completionPercentage: 0,
          modulesList: []
        };
      }

      let totalFolders = s.folders.length;
      let totalModules = 0;
      let activeCount = 0;
      let plannedCount = 0;
      const modulesList = [];

      s.folders.forEach(folder => {
        const folderId = folder.id || '';
        const folderTitle = folder.title || '';
        (folder.modules || []).forEach(m => {
          totalModules++;
          const status = (m.status || 'planned').toLowerCase();
          if (status === 'active') {
            activeCount++;
          } else {
            plannedCount++;
          }
          modulesList.push({
            folderId: folderId,
            folderName: folderTitle,
            moduleId: m.id || '',
            moduleTitle: m.title || '',
            status: m.status || 'planned'
          });
        });
      });

      const completionPercentage = totalModules > 0 ? Math.round((activeCount / totalModules) * 100) : 0;

      return {
        totalFolders,
        totalModules,
        activeCount,
        plannedCount,
        completionPercentage,
        modulesList
      };
    },

    exportFeatureRegistry(format = 'json', modulesList = null) {
      let list = modulesList;
      if (!list || !Array.isArray(list)) {
        const stats = this.getFeatureRegistryStats();
        list = stats.modulesList || [];
      }

      const timestamp = Date.now();
      let filename = '';

      if (format === 'csv') {
        filename = `cso-feature-registry-${timestamp}.csv`;
        const headers = ['Folder ID', 'Folder Name', 'Module ID', 'Module Title', 'Status'];
        const csvRows = [headers.join(',')];

        list.forEach(item => {
          const row = [
            `"${(item.folderId || '').replace(/"/g, '""')}"`,
            `"${(item.folderName || '').replace(/"/g, '""')}"`,
            `"${(item.moduleId || '').replace(/"/g, '""')}"`,
            `"${(item.moduleTitle || '').replace(/"/g, '""')}"`,
            `"${(item.status || '').replace(/"/g, '""')}"`
          ];
          csvRows.push(row.join(','));
        });

        const csvContent = csvRows.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        filename = `cso-feature-registry-${timestamp}.json`;
        const payload = {
          registryVersion: '2026.11',
          exportedAt: new Date(timestamp).toISOString(),
          totalCount: list.length,
          modules: list
        };
        const jsonStr = JSON.stringify(payload, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }

      this.logAudit('FEATURE_REGISTRY_EXPORTED', 'SCHEMA_GOVERNANCE', `Master Feature Registry exported (${format.toUpperCase()}: ${filename}, ${list.length} modules).`);
      return filename;
    },

    // 13. Submission Moderation & Pending Approvals Queue (module-01-006)
    getApprovals(type = 'ALL', status = 'PENDING') {
      let list = null;
      try {
        const raw = localStorage.getItem('cso_pending_approvals');
        if (raw) list = JSON.parse(raw);
      } catch (_) {}

      if (!list || !Array.isArray(list) || list.length === 0) {
        list = [
          {
            id: 'APPR-101',
            type: 'RESOURCE',
            title: 'OSSC Reasoning Practice Shortcuts (PDF)',
            submittedBy: 'Bikash Mohapatra (bikash.m@gmail.com)',
            district: 'Cuttack',
            submittedAt: Date.now() - 7200000,
            status: 'PENDING',
            details: 'Candidate submitted a 12-page curated reasoning guide for OSSC CGL.',
            targetUrl: 'https://csodisha.com/assets/docs/reasoning-guide-sample.pdf'
          },
          {
            id: 'APPR-102',
            type: 'COMMUNITY',
            title: 'Discussion: OTET 2026 Final Year B.Ed Eligibility',
            submittedBy: 'Swagatika Sahoo (swagatika.s@gmail.com)',
            district: 'Balasore',
            submittedAt: Date.now() - 14400000,
            status: 'PENDING',
            details: 'Student posted a query asking if 4th semester B.Ed candidates can appear in upcoming OTET.'
          },
          {
            id: 'APPR-103',
            type: 'CORRECTION',
            title: 'Correction: OPSC Medical Officer Interview Schedule',
            submittedBy: 'Dr. Alok Jena (alok.jena@gov.in)',
            district: 'Khordha',
            submittedAt: Date.now() - 86400000,
            status: 'PENDING',
            details: 'Reporting that OPSC updated the document verification dates to Nov 22.'
          }
        ];
        try {
          localStorage.setItem('cso_pending_approvals', JSON.stringify(list));
        } catch (_) {}
      }

      // Filter by type (if !== 'ALL') and status (if !== 'ALL')
      const t = (type || 'ALL').toUpperCase();
      const s = (status || 'ALL').toUpperCase();

      return list.filter(item => {
        if (t !== 'ALL' && (item.type || '').toUpperCase() !== t) return false;
        if (s !== 'ALL' && (item.status || '').toUpperCase() !== s) return false;
        return true;
      }).sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
    },

    saveApprovals(list) {
      save('cso_pending_approvals', list);
    },

    approveItem(id) {
      let list = this.getApprovals('ALL', 'ALL');
      const item = list.find(x => x.id === id);
      if (item) {
        item.status = 'APPROVED';
        item.reviewedAt = Date.now();

        // If type === 'RESOURCE', append to cso_super_resources
        if (item.type === 'RESOURCE') {
          try {
            const resources = this.getResources();
            const exists = resources.some(r => r.id === item.id || r.title === item.title);
            if (!exists) {
              resources.push({
                id: item.id.replace('APPR', 'RES'),
                title: item.title,
                category: 'State Exams',
                format: 'PDF',
                downloads: 0,
                status: 'Live'
              });
              this.saveResources(resources);
            }
          } catch (_) {}
        }

        this.saveApprovals(list);
        this.logAudit('APPROVAL_GRANTED', 'MODERATION_QUEUE', `Submission ${id} ("${item.title}") approved by Super Admin.`);
      }
      return item;
    },

    rejectItem(id, reason = 'Did not meet submission guidelines') {
      let list = this.getApprovals('ALL', 'ALL');
      const item = list.find(x => x.id === id);
      if (item) {
        item.status = 'REJECTED';
        item.rejectionReason = reason;
        item.reviewedAt = Date.now();
        this.saveApprovals(list);
        this.logAudit('APPROVAL_REJECTED', 'MODERATION_QUEUE', `Submission ${id} rejected: "${reason}".`);
      }
      return item;
    },

    deleteApproval(id) {
      let list = this.getApprovals('ALL', 'ALL');
      const prevLen = list.length;
      list = list.filter(x => x.id !== id);
      if (list.length !== prevLen) {
        this.saveApprovals(list);
        this.logAudit('APPROVAL_RECORD_DELETED', 'MODERATION_QUEUE', `Submission record ${id} removed.`);
      }
      return list;
    },

    // 12. Resources & Educational Matrix
    getResources() {
      return getOrSet(KEYS.RESOURCES, SEED_RESOURCES);
    },
    saveResources(res) {
      save(KEYS.RESOURCES, res);
    },

    // Quick Actions Operational Center (module-01-003)
    purgeEdgeCache() {
      const now = Date.now();
      localStorage.setItem('cso_last_cache_purge', now.toString());
      this.logAudit('EDGE_CACHE_PURGED', 'ALL_CDN_ROUTES', `Global Cloudflare edge CDN cache purge dispatched (Timestamp: ${new Date(now).toISOString()}).`);
      return { success: true, timestamp: now };
    },

    toggleMaintenanceMode() {
      const current = localStorage.getItem('cso_maintenance_mode') === 'true';
      const newState = !current;
      localStorage.setItem('cso_maintenance_mode', newState.toString());
      
      // Keep system flags synced
      try {
        const sys = this.getSystem();
        if (sys && sys.flags) {
          sys.flags.maintenanceMode = newState;
          this.saveSystem(sys);
        }
      } catch (_) {}

      // Update header top bar maintenance indicator if present in DOM
      try {
        const dot = document.getElementById('maintenanceStatusDot');
        const txt = document.getElementById('maintenanceStatusText');
        if (dot) dot.className = newState ? "w-2 h-2 rounded-full bg-amber-400" : "w-2 h-2 rounded-full bg-slate-500";
        if (txt) txt.textContent = newState ? "Maint: ON" : "Maint: OFF";
      } catch (_) {}

      this.logAudit('MAINTENANCE_MODE_TOGGLED', 'GLOBAL_PORTAL', `Public maintenance mode turned ${newState ? 'ON' : 'OFF'}.`);
      return newState;
    },

    createFullSystemBackup() {
      const backupData = {
        meta: {
          app: "Common Sense Odisha",
          version: "CSO-SUPER-2026.11",
          createdAt: new Date().toISOString(),
          exportedBy: "admin@csodisha.com"
        },
        data: {
          users: this.getUsers(),
          resources: this.getResources(),
          inquiries: this.getInquiries(),
          audit: this.getAudit(),
          editorial: this.getEditorialConfig(),
          corrections: this.getCorrectionsConfig(),
          accessibility: this.getAccessibilityConfig(),
          refund: this.getRefundConfig(),
          delivery: this.getDeliveryConfig(),
          community: this.getCommunityConfig(),
          faqs: this.getFaqsConfig(),
          customPages: this.getCustomPagesConfig(),
          legalRevisions: this.getLegalRevisionsConfig(),
          allContent: this.getAllContentConfig(),
          articles: this.getArticlesConfig(),
          news: this.getNewsConfig(),
          currentAffairs: this.getCurrentAffairsConfig(),
          announcements: this.getAnnouncementsConfig(),
          featuredContent: this.getFeaturedContentConfig(),
          contentCategories: this.getContentCategoriesConfig(),
          tags: this.getTagsConfig(),
          editorialCalendar: this.getEditorialCalendarConfig(),
          publishingWorkflow: this.getPublishingWorkflowConfig(),
          scheduledContent: this.getScheduledContentConfig(),
          contentArchive: this.getContentArchiveConfig(),
          contentRevisions: this.getContentRevisionsConfig(),
          bulkContentOperations: this.getBulkContentOperationsConfig(),
          jobsCareersTree: this.getMenuTree("cso_jobs_careers_tree"),
          schemesBenefitsTree: this.getMenuTree("cso_schemes_benefits_tree"),
          studyLibraryTree: this.getMenuTree("cso_study_library_tree"),
          communityTree: this.getMenuTree("cso_community_tree"),
          digitalLibrary: this.getDigitalLibraryConfig(),
          studyMaterials: this.getStudyMaterialsConfig(),
          notesPdfs: this.getNotesPdfsConfig(),
          booksReferences: this.getBooksReferencesConfig(),
          subjectsTopics: this.getSubjectsTopicsConfig(),
          classGrade: this.getClassGradeConfig(),
          examinationManagement: this.getExaminationManagementConfig(),
          recruitmentJobs: this.getRecruitmentJobsConfig(),
          admitCardsResults: this.getAdmitCardsResultsConfig(),
          syllabusExamPatterns: this.getSyllabusExamPatternsConfig(),
          previousYearQuestions: this.getPyqConfig(),
          questionBank: this.getQuestionBankConfig(),
          quizBuilder: this.getQuizBuilderConfig(),
          mockTests: this.getMockTestsConfig(),
          answerKeysExplanations: this.getAnswerKeysExplanationsConfig(),
      resourceCollections: this.getResourceCollectionsConfig(),
      downloadsRules: this.getDownloadsRulesConfig(),
      governmentSchemes: this.getGovernmentSchemesConfig(),
      scholarships: this.getScholarshipsConfig(),
      careerExplorer: this.getCareerExplorerConfig(),
      studentDashboard: this.getStudentDashboardConfig(),
      educationalTools: this.getEducationalToolsConfig(),
      masterCategories: this.getMasterCategoriesConfig(),
      subcategories: this.getSubcategoriesConfig(),
      tagsTaxonomies: this.getTagsTaxonomiesConfig(),
      headerNavigation: this.getHeaderNavigationConfig(),
      megaMenu: this.getMegaMenuConfig(),
      footerNavigation: this.getFooterNavigationConfig(),
      sidebarMenus: this.getSidebarMenusConfig(),
          broadcast: this.getActiveBroadcast(),
          system: this.getSystem(),
          security: this.getSecurity(),
          roles: this.getRoles(),
          pages: this.getPages()
        }
      };

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const filename = `cso-system-backup-${Date.now()}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      this.logAudit('BACKUP_SNAPSHOT_CREATED', 'ALL_SYSTEM_MODULES', `Full platform backup exported: ${filename} (${(jsonStr.length / 1024).toFixed(1)} KB).`);
      return { filename, sizeKb: (jsonStr.length / 1024).toFixed(1) };
    },

    publishEmergencyFlash(type = 'admit_card') {
      const flashData = {
        headline: type === 'urgent_notification' 
          ? "Urgent: Official Examination Notification Released" 
          : "Urgent: Odisha OSSC CGL 2026 Official Hall Ticket Download Released",
        context: "Official examination portal has issued hall tickets. Download links and instructions verified.",
        severity: "emerald",
        ctaText: "Check Hall Ticket Link",
        ctaUrl: "/resources.html#ossc-cgl",
        active: true,
        updatedAt: Date.now()
      };

      save(KEYS.BROADCAST, flashData);
      this.logAudit('EMERGENCY_FLASH_PUBLISHED', 'HOMEPAGE_BROADCAST', `Emergency broadcast published: "${flashData.headline}".`);
      return flashData;
    },

    triggerZeroTrustLock() {
      try {
        sessionStorage.removeItem('cso_admin_token');
        sessionStorage.removeItem('cso_admin_session');
      } catch (_) {}
      this.logAudit('ZERO_TRUST_SESSION_LOCKED', 'AUTH_GATE', 'Zero-trust console lock triggered by Super Admin. Active credentials purged.');
      window.location.replace('/admin/login?reason=locked');
    },

    // Multi-Endpoint Diagnostic Probing Engine (module-01-002)
    async runSystemHealthCheck() {
      const routes = [
        { name: "Public Homepage", path: "/" },
        { name: "Academic Resources", path: "/resources.html" },
        { name: "Contact Desk", path: "/contact.html" },
        { name: "Admin Security Gate", path: "/admin/login.html" },
        { name: "Navigation Schema", path: "/admin/data/master-navigation.json" }
      ];

      const results = [];
      for (const route of routes) {
        const start = performance.now();
        try {
          const res = await fetch(route.path + '?diag=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
          const rtt = Math.round(performance.now() - start);
          results.push({
            name: route.name,
            path: route.path,
            status: res.status,
            statusText: res.statusText || 'OK',
            rttMs: rtt,
            healthy: res.ok,
            cfRay: res.headers.get('cf-ray') || 'Direct/Local',
            checkedAt: new Date().toLocaleTimeString()
          });
        } catch (err) {
          results.push({
            name: route.name,
            path: route.path,
            status: 0,
            statusText: 'Unreachable / Network Error',
            rttMs: Math.round(performance.now() - start),
            healthy: false,
            cfRay: 'N/A',
            checkedAt: new Date().toLocaleTimeString()
          });
        }
      }

      const totalRtt = results.reduce((acc, r) => acc + r.rttMs, 0);
      const avgRtt = results.length ? Math.round(totalRtt / results.length) : 0;
      const healthyCount = results.filter(r => r.healthy).length;

      // Log audit event
      this.logAudit('HEALTH_CHECK_COMPLETED', 'EDGE_DIAGNOSTICS', `System diagnostic completed: ${healthyCount}/${results.length} routes healthy, Avg Latency: ${avgRtt}ms.`);

      return results;
    },
    // Live Metrics Calculation Engine
    getLiveMetrics() {
      const users = JSON.parse(localStorage.getItem('cso_super_users') || '[]');
      const resources = JSON.parse(localStorage.getItem('cso_super_resources') || '[]');
      const inquiries = JSON.parse(localStorage.getItem('cso_super_inquiries') || '[]');
      const unreadInquiries = inquiries.filter(i => (i.status || '').toLowerCase() !== 'resolved').length;

      // Calculate actual storage footprint in KB from localStorage
      let totalBytes = 0;
      for (let key in localStorage) {
        if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
          totalBytes += (localStorage[key].length + key.length) * 2;
        }
      }
      const storageKb = (totalBytes / 1024).toFixed(2);

      return {
        userCount: users.length,
        resourceCount: resources.length,
        unreadInquiries: unreadInquiries,
        totalInquiries: inquiries.length,
        storageKb: storageKb
      };
    },
    // 11. Citizen Inquiries & Help Desk (cso_super_inquiries)
    getInquiries() {
      return getOrSet(KEYS.INQUIRIES, SEED_INQUIRIES);
    },
    saveInquiries(inquiries) {
      save(KEYS.INQUIRIES, inquiries);
    },
    addInquiry(inquiry) {
      const list = this.getInquiries();
      list.unshift(inquiry);
      this.saveInquiries(list);
      this.logAudit('INQUIRY_RECEIVED', 'CONTACT_DESK', `Citizen inquiry ${inquiry.id} received from ${inquiry.name} (${inquiry.district || 'Odisha'}).`);
      return inquiry;
    },
    updateInquiryStatus(id, status) {
      const list = this.getInquiries();
      const item = list.find(x => x.id === id);
      if (item) {
        item.status = status;
        this.saveInquiries(list);
        this.logAudit('INQUIRY_STATUS_CHANGE', 'CONTACT_DESK', `Inquiry ${id} marked as ${status}.`);
      }
      return item;
    },
    deleteInquiry(id) {
      let list = this.getInquiries();
      list = list.filter(x => x.id !== id);
      this.saveInquiries(list);
      this.logAudit('INQUIRY_DELETED', 'CONTACT_DESK', `Inquiry ${id} deleted.`);
    },

    // 9. Disaster Recovery
    createPlatformSnapshot() {
      const snapshot = {
        version: 'CSO-SUPER-2026.11',
        createdAt: new Date().toISOString(),
        exportedBy: 'admin@csodisha.com',
        state: {
          users: this.getUsers(),
          roles: this.getRoles(),
          pages: this.getPages(),
          system: this.getSystem(),
          security: this.getSecurity(),
          audit: this.getAudit(),
          broadcast: this.getActiveBroadcast(),
          inquiries: this.getInquiries(),
          headerNav: this.getHeaderNavigationConfig(),
          megaMenu: this.getMegaMenuConfig(),
          footerNav: this.getFooterNavigationConfig(),
          sidebarMenus: this.getSidebarMenusConfig(),
          breadcrumbs: this.getBreadcrumbsConfig(),
          internalLinks: this.getInternalLinksConfig(),
          menuOrdering: this.getMenuOrderingConfig(),
          socialLinks: this.getSocialLinksConfig(),
          fileLibrary: this.getFileLibraryConfig(),
          bulkUploads: this.getBulkUploadsConfig(),
          foldersCollections: this.getFoldersCollectionsConfig(),
          pdfManager: this.getPdfManagerConfig(),
          imageLibrary: this.getImageLibraryConfig(),
          videoAudio: this.getVideoAudioConfig(),
          cloudLinks: this.getCloudLinksConfig(),
          gdriveLinks: this.getGoogleDriveLinksConfig(),
          storageProviders: this.getStorageProvidersConfig(),
          fileVersions: this.getFileVersionsConfig(),
          filePermissions: this.getFilePermissionsConfig(),
          storageUsage: this.getStorageUsageConfig(),
          duplicateDetection: this.getDuplicateDetectionConfig(),
          brokenFileLinks: this.getBrokenFileLinksConfig(),
          mediaOptimization: this.getMediaOptimizationConfig(),
          paymentOverview: this.getPaymentOverviewConfig(),
          paymentGatewaySettings: this.getPaymentGatewaySettingsConfig(),
          transactions: this.getTransactionsConfig(),
          orders: this.getOrdersConfig(),
          paidResources: this.getPaidResourcesConfig(),
          productsPricing: this.getProductsPricingConfig(),
          subscriptions: this.getSubscriptionsConfig(),
          memberships: this.getMembershipsConfig(),
          donations: this.getDonationsConfig(),
          couponsOffers: this.getCouponsOffersConfig(),
          refundsDisputes: this.getRefundsDisputesConfig(),
          invoicesReceipts: this.getInvoicesReceiptsConfig(),
          taxConfiguration: this.getTaxConfigurationConfig(),
          payoutsSettlements: this.getPayoutsSettlementsConfig(),
          reconciliation: this.getReconciliationConfig(),
          financeReports: this.getFinanceReportsConfig(),
          paymentWebhooks: this.getPaymentWebhooksConfig(),
          fraudRisk: this.getFraudRiskConfig(),
          allUsers: this.getAllUsersConfig(),
          userProfiles: this.getUserProfilesConfig(),
          rolesPermissions: this.getRolesPermissionsConfig(),
          adminAccounts: this.getAdminAccountsConfig(),
          accountStatus: this.getAccountStatusConfig(),
          registrations: this.getRegistrationsConfig(),
          membershipAccess: this.getMembershipAccessConfig(),
          communityPosts: this.getCommunityPostsConfig(),
          commentsReplies: this.getCommentsRepliesConfig(),
          moderationQueue: this.getModerationQueueConfig(),
          userReports: this.getUserReportsConfig(),
          blockedAccounts: this.getBlockedAccountsConfig(),
          userActivity: this.getUserActivityConfig(),
          dataAccessRequests: this.getDataAccessRequestsConfig(),
          discussionForum: this.getDiscussionForumConfig(),
          askQuestion: this.getAskQuestionConfig(),
          shareKnowledge: this.getShareKnowledgeConfig(),
          suggestTopic: this.getSuggestTopicConfig(),
          reportError: this.getReportErrorConfig(),
          contactSubmissions: this.getContactSubmissionsConfig(),
          supportTickets: this.getSupportTicketsConfig(),
          feedback: this.getFeedbackConfig(),
          surveysPolls: this.getSurveysPollsConfig(),
          emailTemplates: this.getEmailTemplatesConfig(),
          emailCampaigns: this.getEmailCampaignsConfig(),
          newsletterSubscribers: this.getNewsletterSubscribersConfig(),
          notifications: this.getNotificationsConfig(),
          pushNotifications: this.getPushNotificationsConfig(),
          inAppMessages: this.getInAppMessagesConfig(),
          announcementBanners: this.getAnnouncementBannersConfig(),
          helpCentre: this.getHelpCentreConfig(),
          supportCategories: this.getSupportCategoriesConfig(),
          spamAbuse: this.getSpamAbuseConfig(),
          brandIdentity: this.getBrandIdentityConfig(),
          logoFavicon: this.getLogoFaviconConfig(),
          colorsThemes: this.getColorsThemesConfig(),
          typography: this.getTypographyConfig(),
          headerDesign: this.getHeaderDesignConfig(),
          footerDesign: this.getFooterDesignConfig(),
          homepageLayout: this.getHomepageLayoutConfig(),
          bannersSliders: this.getBannersSlidersConfig(),
          buttonsCards: this.getButtonsCardsConfig(),
          reusableComponents: this.getReusableComponentsConfig(),
          previewStudio: this.getPreviewStudioConfig(),
          accessibilityStyling: this.getAccessibilityStylingConfig(),
          custom404: this.getCustom404Config(),
          designVersions: this.getDesignVersionsConfig(),
          adPlacements: this.getAdPlacementsConfig ? this.getAdPlacementsConfig() : null,
          sponsors: this.getSponsorsConfig ? this.getSponsorsConfig() : null,
          promotionalBanners: this.getPromotionalBannersConfig ? this.getPromotionalBannersConfig() : null,
          campaigns: this.getCampaignsConfig ? this.getCampaignsConfig() : null,
          referralTracking: this.getReferralTrackingConfig ? this.getReferralTrackingConfig() : null,
          campaignAnalytics: this.getCampaignAnalyticsConfig ? this.getCampaignAnalyticsConfig() : null,
          utmManagement: this.getUtmManagementConfig ? this.getUtmManagementConfig() : null,
          socialSharing: this.getSocialSharingConfig ? this.getSocialSharingConfig() : null,
          promoLandingPages: this.getPromoLandingPagesConfig ? this.getPromoLandingPagesConfig() : null,
          advertisingReports: this.getAdvertisingReportsConfig ? this.getAdvertisingReportsConfig() : null,
          seoOverview: this.getSeoOverviewConfig ? this.getSeoOverviewConfig() : null,
          pageMetadata: this.getPageMetadataConfig ? this.getPageMetadataConfig() : null,
          canonicalUrls: this.getCanonicalUrlsConfig ? this.getCanonicalUrlsConfig() : null,
          openGraphPreviews: this.getOpenGraphPreviewsConfig ? this.getOpenGraphPreviewsConfig() : null,
          structuredData: this.getStructuredDataConfig ? this.getStructuredDataConfig() : null,
          xmlSitemap: this.getXmlSitemapConfig ? this.getXmlSitemapConfig() : null,
          robotsSettings: this.getRobotsSettingsConfig ? this.getRobotsSettingsConfig() : null,
          searchConsole: this.getSearchConsoleConfig ? this.getSearchConsoleConfig() : null,
          internalSearchManager: this.getInternalSearchManagerConfig ? this.getInternalSearchManagerConfig() : null,
          searchIndex: this.getSearchIndexConfig ? this.getSearchIndexConfig() : null,
          searchFilters: this.getSearchFiltersConfig ? this.getSearchFiltersConfig() : null,
          popularSearches: this.getPopularSearchesConfig ? this.getPopularSearchesConfig() : null,
          zeroResultSearches: this.getZeroResultSearchesConfig ? this.getZeroResultSearchesConfig() : null,
          urlRedirects: this.getUrlRedirectsConfig ? this.getUrlRedirectsConfig() : null,
          brokenLinks: this.getBrokenLinksConfig ? this.getBrokenLinksConfig() : null,
          reports404: this.get404ReportsConfig ? this.get404ReportsConfig() : null,
          eventCalendar: this.getEventCalendarConfig ? this.getEventCalendarConfig() : null,
          examCalendar: this.getExamCalendarConfig ? this.getExamCalendarConfig() : null,
          recruitmentDeadlines: this.getRecruitmentDeadlinesConfig ? this.getRecruitmentDeadlinesConfig() : null,
          webinarsSessions: this.getWebinarsSessionsConfig ? this.getWebinarsSessionsConfig() : null,
          eventRegistrations: this.getEventRegistrationsConfig ? this.getEventRegistrationsConfig() : null,
          scheduledPublications: this.getScheduledPublicationsConfig ? this.getScheduledPublicationsConfig() : null,
          expiryRules: this.getExpiryRulesConfig ? this.getExpiryRulesConfig() : null,
          reminderConfiguration: this.getReminderConfigurationConfig ? this.getReminderConfigurationConfig() : null,
          scheduledMaintenance: this.getScheduledMaintenanceConfig ? this.getScheduledMaintenanceConfig() : null,
          integrationDirectory: this.getIntegrationDirectoryConfig ? this.getIntegrationDirectoryConfig() : null,
          supabaseStatus: this.getSupabaseStatusConfig ? this.getSupabaseStatusConfig() : null,
          cloudflareIntegration: this.getCloudflareIntegrationConfig ? this.getCloudflareIntegrationConfig() : null,
          paymentIntegrations: this.getPaymentIntegrationsConfig ? this.getPaymentIntegrationsConfig() : null,
          emailProvider: this.getEmailProviderConfig ? this.getEmailProviderConfig() : null,
          cloudStorage: this.getCloudStorageConfig ? this.getCloudStorageConfig() : null,
          analyticsIntegrations: this.getAnalyticsIntegrationsConfig ? this.getAnalyticsIntegrationsConfig() : null,
          apiConfiguration: this.getApiConfigurationConfig ? this.getApiConfigurationConfig() : null,
          webhookManagement: this.getWebhookManagementConfig ? this.getWebhookManagementConfig() : null,
          integrationLogs: this.getIntegrationLogsConfig ? this.getIntegrationLogsConfig() : null,
          integrationHealth: this.getIntegrationHealthConfig ? this.getIntegrationHealthConfig() : null,
          authentication: this.getAuthenticationConfig ? this.getAuthenticationConfig() : null,
          twoFactor: this.getTwoFactorConfig ? this.getTwoFactorConfig() : null,
          adminSessions: this.getAdminSessionsConfig ? this.getAdminSessionsConfig() : null,
          rolesAccessPolicies: this.getRolesAccessPoliciesConfig ? this.getRolesAccessPoliciesConfig() : null,
          loginHistory: this.getLoginHistoryConfig ? this.getLoginHistoryConfig() : null,
          securityAlerts: this.getSecurityAlertsConfig ? this.getSecurityAlertsConfig() : null,
          rateLimits: this.getRateLimitsConfig ? this.getRateLimitsConfig() : null,
          uploadSecurity: this.getUploadSecurityConfig ? this.getUploadSecurityConfig() : null,
          privacyConsent: this.getPrivacyConsentConfig ? this.getPrivacyConsentConfig() : null,
          dataRetention: this.getDataRetentionConfig ? this.getDataRetentionConfig() : null,
          accountDeletion: this.getAccountDeletionConfig ? this.getAccountDeletionConfig() : null,
          securityAuditLogs: this.getSecurityAuditLogsConfig ? this.getSecurityAuditLogsConfig() : null,
          incidentResponse: this.getIncidentResponseConfig ? this.getIncidentResponseConfig() : null,
          systemHealth: this.getSystemHealthConfig ? this.getSystemHealthConfig() : null,
          websiteAvailability: this.getWebsiteAvailabilityConfig ? this.getWebsiteAvailabilityConfig() : null,
          apiDiagnostics: this.getApiDiagnosticsConfig ? this.getApiDiagnosticsConfig() : null,
          databaseHealth: this.getDatabaseHealthConfig ? this.getDatabaseHealthConfig() : null,
          storageMonitoring: this.getStorageMonitoringConfig ? this.getStorageMonitoringConfig() : null,
          backupCentre: this.getBackupCentreConfig ? this.getBackupCentreConfig() : null,
          restoreCentre: this.getRestoreCentreConfig ? this.getRestoreCentreConfig() : null,
          revisionRollback: this.getRevisionRollbackConfig ? this.getRevisionRollbackConfig() : null,
          errorLogs: this.getErrorLogsConfig ? this.getErrorLogsConfig() : null,
          scheduledJobs: this.getScheduledJobsConfig ? this.getScheduledJobsConfig() : null,
          automationRules: this.getAutomationRulesConfig ? this.getAutomationRulesConfig() : null,
          maintenanceMode: this.getMaintenanceModeConfig ? this.getMaintenanceModeConfig() : null
        }
      };
      this.logAudit('PLATFORM_SNAPSHOT_CREATED', 'ALL_MODULES', 'Comprehensive platform state snapshot exported.');
      return snapshot;
    },
    restoreFromSnapshot(snapshot) {
      if (!snapshot || !snapshot.state) {
        throw new Error('Invalid snapshot schema: Missing state payload');
      }
      const { users, roles, pages, system, security, audit, broadcast, inquiries } = snapshot.state;
      if (users) this.saveUsers(users);
      if (roles) this.saveRoles(roles);
      if (pages) this.savePages(pages);
      if (system) this.saveSystem(system);
      if (security) this.saveSecurity(security);
      if (audit) save(KEYS.AUDIT, audit);
      if (broadcast) save(KEYS.BROADCAST, broadcast);
      if (inquiries) this.saveInquiries(inquiries);

      this.logAudit('DISASTER_RECOVERY_RESTORE', 'ALL_MODULES', `Restored from snapshot created at ${snapshot.createdAt}`);
      return true;
    },

    downloadJson(filename, data) {
      try {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Error downloading JSON:', err);
      }
    }
  };

  // Universal Safe Hydration Helper
  function _hydrateConfig(storageKey, primaryKey, fallbackFactory) {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        const def = fallbackFactory();
        const defItems = def[primaryKey] || def.items || [];
        def.items = defItems;
        def[primaryKey] = defItems;
        localStorage.setItem(storageKey, JSON.stringify(def));
        return JSON.parse(JSON.stringify(def));
      }
      const parsed = JSON.parse(raw);
      const list = parsed[primaryKey] || parsed.items || [];
      if (!Array.isArray(list) || list.length === 0) {
        const def = fallbackFactory();
        const defItems = def[primaryKey] || def.items || [];
        def.items = defItems;
        def[primaryKey] = defItems;
        localStorage.setItem(storageKey, JSON.stringify(def));
        return JSON.parse(JSON.stringify(def));
      }
      parsed.items = list;
      parsed[primaryKey] = list;
      return parsed;
    } catch (e) {
      const def = fallbackFactory();
      const defItems = def[primaryKey] || def.items || [];
      def.items = defItems;
      def[primaryKey] = defItems;
      return JSON.parse(JSON.stringify(def));
    }
  }

  SuperStore._hydrateConfig = _hydrateConfig;

  window.CSOSuperStore = SuperStore;

  // --- MODULE 12-001: Advertising Placements ---
  const DEFAULT_AD_PLACEMENTS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalSlots: 8, activeSlots: 6, fillRate: "87.5%", averageCPM: "₹45.00" },
    items: [
      { id: "PLC-01", slotName: "Homepage Hero Leaderboard", location: "Homepage Top", dimensions: "728x90 / Responsive", formatType: "Display Banner", monthlyRateINR: 15000, currentSponsor: "Utkal Career Academy", status: "Occupied", active: true },
      { id: "PLC-02", slotName: "Job Alert Detail Sidebar", location: "Jobs & Careers Right Rail", dimensions: "300x250 Medium Rectangle", formatType: "Sponsored Card", monthlyRateINR: 8500, currentSponsor: "Bhubaneswar IAS Circle", status: "Occupied", active: true },
      { id: "PLC-03", slotName: "Study Library Download Gate Interstitial", location: "Library Download Trigger", dimensions: "Fluid Modal Card", formatType: "Native Sponsored Box", monthlyRateINR: 12000, currentSponsor: "None (Open)", status: "Available", active: true },
      { id: "PLC-04", slotName: "Gazette Daily Digest Footer Strip", location: "All Notification Pages", dimensions: "970x90 Super Leaderboard", formatType: "Sponsorship Tag", monthlyRateINR: 6000, currentSponsor: "Odisha Publications Hub", status: "Occupied", active: true }
    ]
  };
  SuperStore.getAdPlacementsConfig = function() {
    return _hydrateConfig('cso_ad_placements_config', 'placements', () => DEFAULT_AD_PLACEMENTS);
  };
  SuperStore.saveAdPlacementsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.placements = cfg.items || cfg.placements || []; cfg.items = cfg.placements;
    localStorage.setItem('cso_ad_placements_config', JSON.stringify(cfg));
    this.logAudit('AD_PLACEMENTS_UPDATED', 'MARKETING', `Advertising placements updated (${cfg.items.length} slots).`);
    return true;
  };
  SuperStore.resetAdPlacementsConfig = function() {
    localStorage.setItem('cso_ad_placements_config', JSON.stringify(DEFAULT_AD_PLACEMENTS));
    this.logAudit('AD_PLACEMENTS_RESET', 'MARKETING', 'Advertising placements reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_AD_PLACEMENTS));
  };
  SuperStore.exportAdPlacementsManifest = function() {
    const config = this.getAdPlacementsConfig();
    const filename = "ad_placements_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("AD_PLACEMENTS_EXPORTED", "DATA_EXPORT", `Ad placements manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 12-002: Sponsors ---
  const DEFAULT_SPONSORS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { activeSponsorsCount: 5, totalContractValueINR: 245000, renewedContracts: 4 },
    items: [
      { id: "SPN-01", sponsorName: "Utkal Career Academy", contactPerson: "S. K. Tripathy", email: "partnerships@utkalcareer.in", tier: "Gold Partner", activeSlotsCount: 2, contractValidTill: "2027-03-31", status: "Active", active: true },
      { id: "SPN-02", sponsorName: "Bhubaneswar IAS Circle", contactPerson: "P. R. Mohanty", email: "director@bbsriascircle.com", tier: "Silver Sponsor", activeSlotsCount: 1, contractValidTill: "2026-12-31", status: "Active", active: true },
      { id: "SPN-03", sponsorName: "Odisha Publications Hub", contactPerson: "Anil Nayak", email: "info@odishabooks.org", tier: "Educational Patron", activeSlotsCount: 1, contractValidTill: "2027-06-30", status: "Active", active: true }
    ]
  };
  SuperStore.getSponsorsConfig = function() {
    return _hydrateConfig('cso_sponsors_config', 'sponsors', () => DEFAULT_SPONSORS);
  };
  SuperStore.saveSponsorsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.sponsors = cfg.items || cfg.sponsors || []; cfg.items = cfg.sponsors;
    localStorage.setItem('cso_sponsors_config', JSON.stringify(cfg));
    this.logAudit('SPONSORS_UPDATED', 'MARKETING', `Sponsors directory updated (${cfg.items.length} sponsors).`);
    return true;
  };
  SuperStore.resetSponsorsConfig = function() {
    localStorage.setItem('cso_sponsors_config', JSON.stringify(DEFAULT_SPONSORS));
    this.logAudit('SPONSORS_RESET', 'MARKETING', 'Sponsors directory reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_SPONSORS));
  };
  SuperStore.exportSponsorsManifest = function() {
    const config = this.getSponsorsConfig();
    const filename = "sponsors_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("SPONSORS_EXPORTED", "DATA_EXPORT", `Sponsors manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 12-003: Promotional Banners ---
  const DEFAULT_PROMOTIONAL_BANNERS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    items: [
      { id: "PRB-01", bannerTitle: "Statewide OPSC OAS Prelims Mock Test Registration Open", targetPage: "Homepage & Library", imageSrc: "/assets/banners/promo-mock-oas.webp", destinationUrl: "/study-library/mock-tests", impressionCount: 42100, clickCount: 3820, ctrRate: "9.07%", status: "Live", active: true },
      { id: "PRB-02", bannerTitle: "Balasore District Study Circle Aspirants Meet 2026", targetPage: "Community Lounge", imageSrc: "/assets/banners/promo-meet-balasore.webp", destinationUrl: "/community/?district=balasore", impressionCount: 18400, clickCount: 1410, ctrRate: "7.66%", status: "Live", active: true },
      { id: "PRB-03", bannerTitle: "Annual All-Access Pass 25% Diwali Discount", targetPage: "Pricing & Checkout", imageSrc: "/assets/banners/promo-diwali-pass.webp", destinationUrl: "/pricing/?coupon=DIWALI50", impressionCount: 29500, clickCount: 3120, ctrRate: "10.58%", status: "Scheduled", active: true }
    ]
  };
  SuperStore.getPromotionalBannersConfig = function() {
    return _hydrateConfig('cso_promotional_banners_config', 'banners', () => DEFAULT_PROMOTIONAL_BANNERS);
  };
  SuperStore.savePromotionalBannersConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.banners = cfg.items || cfg.banners || []; cfg.items = cfg.banners;
    localStorage.setItem('cso_promotional_banners_config', JSON.stringify(cfg));
    this.logAudit('PROMOTIONAL_BANNERS_UPDATED', 'MARKETING', `Promotional banners updated (${cfg.items.length} banners).`);
    return true;
  };
  SuperStore.resetPromotionalBannersConfig = function() {
    localStorage.setItem('cso_promotional_banners_config', JSON.stringify(DEFAULT_PROMOTIONAL_BANNERS));
    this.logAudit('PROMOTIONAL_BANNERS_RESET', 'MARKETING', 'Promotional banners reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_PROMOTIONAL_BANNERS));
  };
  SuperStore.exportPromotionalBannersManifest = function() {
    const config = this.getPromotionalBannersConfig();
    const filename = "promotional_banners_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("PROMOTIONAL_BANNERS_EXPORTED", "DATA_EXPORT", `Promotional banners manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 12-004: Campaigns ---
  const DEFAULT_CAMPAIGNS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalCampaigns: 6, runningCampaigns: 3, budgetUtilizedINR: 42800, totalReach: 184500 },
    items: [
      { id: "CMPG-01", campaignName: "OPSC 2026 Notification Awareness Drive", channel: "Multi-Channel (Web + Push + Social)", startDate: "2026-11-01", endDate: "2026-12-15", budgetINR: 20000, conversionsCount: 1420, roiMetric: "3.4x", status: "Active", active: true },
      { id: "CMPG-02", campaignName: "Tribal & Rural District Study Circle Outreach", channel: "Telegram + SMS Digest", startDate: "2026-10-15", endDate: "2026-11-30", budgetINR: 15000, conversionsCount: 2190, roiMetric: "4.8x", status: "Active", active: true },
      { id: "CMPG-03", campaignName: "Scholarship Portal Form Assistance Initiative", channel: "In-App Dialog + Banner", startDate: "2026-11-05", endDate: "2026-12-31", budgetINR: 8000, conversionsCount: 890, roiMetric: "2.8x", status: "Active", active: true }
    ]
  };
  SuperStore.getCampaignsConfig = function() {
    return _hydrateConfig('cso_campaigns_config', 'campaigns', () => DEFAULT_CAMPAIGNS);
  };
  SuperStore.saveCampaignsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.campaigns = cfg.items || cfg.campaigns || []; cfg.items = cfg.campaigns;
    localStorage.setItem('cso_campaigns_config', JSON.stringify(cfg));
    this.logAudit('CAMPAIGNS_UPDATED', 'MARKETING', `Campaigns config updated (${cfg.items.length} campaigns).`);
    return true;
  };
  SuperStore.resetCampaignsConfig = function() {
    localStorage.setItem('cso_campaigns_config', JSON.stringify(DEFAULT_CAMPAIGNS));
    this.logAudit('CAMPAIGNS_RESET', 'MARKETING', 'Campaigns config reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_CAMPAIGNS));
  };
  SuperStore.exportCampaignsManifest = function() {
    const config = this.getCampaignsConfig();
    const filename = "campaigns_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("CAMPAIGNS_EXPORTED", "DATA_EXPORT", `Campaigns manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 12-005: Referral Tracking ---
  const DEFAULT_REFERRAL_TRACKING = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalReferrers: 142, successfulReferrals: 1840, rewardedCreditsINR: 92000 },
    items: [
      { id: "REF-01", referrerName: "Subhashree Mohanty", referrerEmail: "subhashree.m@gmail.com", referralCode: "CSO-SUBHA-26", totalInvited: 48, convertedSignups: 39, earnedCreditsINR: 1950, payoutStatus: "Paid", active: true },
      { id: "REF-02", referrerName: "Ramesh Chandra Behera", referrerEmail: "ramesh.behera@gmail.com", referralCode: "CSO-RAMESH-OAS", totalInvited: 34, convertedSignups: 28, earnedCreditsINR: 1400, payoutStatus: "Paid", active: true },
      { id: "REF-03", referrerName: "Debabrata Nayak", referrerEmail: "debabrata.n@gmail.com", referralCode: "CSO-DEBA-JUD", totalInvited: 22, convertedSignups: 18, earnedCreditsINR: 900, payoutStatus: "Pending", active: true }
    ]
  };
  SuperStore.getReferralTrackingConfig = function() {
    return _hydrateConfig('cso_referral_tracking_config', 'referrals', () => DEFAULT_REFERRAL_TRACKING);
  };
  SuperStore.saveReferralTrackingConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.referrals = cfg.items || cfg.referrals || []; cfg.items = cfg.referrals;
    localStorage.setItem('cso_referral_tracking_config', JSON.stringify(cfg));
    this.logAudit('REFERRAL_TRACKING_UPDATED', 'MARKETING', `Referral tracking updated (${cfg.items.length} records).`);
    return true;
  };
  SuperStore.resetReferralTrackingConfig = function() {
    localStorage.setItem('cso_referral_tracking_config', JSON.stringify(DEFAULT_REFERRAL_TRACKING));
    this.logAudit('REFERRAL_TRACKING_RESET', 'MARKETING', 'Referral tracking reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_REFERRAL_TRACKING));
  };
  SuperStore.exportReferralTrackingManifest = function() {
    const config = this.getReferralTrackingConfig();
    const filename = "referral_tracking_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("REFERRAL_TRACKING_EXPORTED", "DATA_EXPORT", `Referral tracking manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 12-006: Campaign Analytics ---
  const DEFAULT_CAMPAIGN_ANALYTICS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalImpressions: 485200, totalClicks: 41800, averageCTR: "8.61%", totalConversions: 3840, blendedCPA: "₹18.40" },
    items: [
      { id: "ANL-01", campaignName: "OAS 2026 Notification Drive", impressions: 210400, clicks: 19800, ctr: "9.41%", conversions: 1820, spendINR: 20000, roas: "4.2x", status: "Active", active: true },
      { id: "ANL-02", campaignName: "Tribal District Outreach", impressions: 145000, clicks: 12400, ctr: "8.55%", conversions: 1390, spendINR: 15000, roas: "5.1x", status: "Active", active: true },
      { id: "ANL-03", campaignName: "SSP Scholarship Assistance", impressions: 129800, clicks: 9600, ctr: "7.39%", conversions: 630, spendINR: 8000, roas: "3.2x", status: "Active", active: true }
    ]
  };
  SuperStore.getCampaignAnalyticsConfig = function() {
    return _hydrateConfig('cso_campaign_analytics_config', 'analytics', () => DEFAULT_CAMPAIGN_ANALYTICS);
  };
  SuperStore.saveCampaignAnalyticsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.analytics = cfg.items || cfg.analytics || []; cfg.items = cfg.analytics;
    localStorage.setItem('cso_campaign_analytics_config', JSON.stringify(cfg));
    this.logAudit('CAMPAIGN_ANALYTICS_UPDATED', 'MARKETING', `Campaign analytics updated (${cfg.items.length} records).`);
    return true;
  };
  SuperStore.resetCampaignAnalyticsConfig = function() {
    localStorage.setItem('cso_campaign_analytics_config', JSON.stringify(DEFAULT_CAMPAIGN_ANALYTICS));
    this.logAudit('CAMPAIGN_ANALYTICS_RESET', 'MARKETING', 'Campaign analytics reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_CAMPAIGN_ANALYTICS));
  };
  SuperStore.exportCampaignAnalyticsManifest = function() {
    const config = this.getCampaignAnalyticsConfig();
    const filename = "campaign_analytics_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("CAMPAIGN_ANALYTICS_EXPORTED", "DATA_EXPORT", `Campaign analytics manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 12-007: UTM Management ---
  const DEFAULT_UTM_MANAGEMENT = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    items: [
      { id: "UTM-01", tagTitle: "Telegram Daily Current Affairs Digest", source: "telegram", medium: "broadcast_channel", campaign: "daily_capsule_nov26", shortUrl: "https://csodisha.com/go/tg-capsule", clicksCount: 14820, active: true },
      { id: "UTM-02", tagTitle: "WhatsApp District Study Circles Alert", source: "whatsapp", medium: "community_group", campaign: "district_study_circles", shortUrl: "https://csodisha.com/go/wa-balasore", clicksCount: 9410, active: true },
      { id: "UTM-03", tagTitle: "YouTube Community Tab Gazette Link", source: "youtube", medium: "community_post", campaign: "opsc_oas_syllabus", shortUrl: "https://csodisha.com/go/yt-oas-guide", clicksCount: 18230, active: true }
    ]
  };
  SuperStore.getUtmManagementConfig = function() {
    return _hydrateConfig('cso_utm_management_config', 'utmTags', () => DEFAULT_UTM_MANAGEMENT);
  };
  SuperStore.saveUtmManagementConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.utmTags = cfg.items || cfg.utmTags || []; cfg.items = cfg.utmTags;
    localStorage.setItem('cso_utm_management_config', JSON.stringify(cfg));
    this.logAudit('UTM_MANAGEMENT_UPDATED', 'MARKETING', `UTM management updated (${cfg.items.length} tags).`);
    return true;
  };
  SuperStore.resetUtmManagementConfig = function() {
    localStorage.setItem('cso_utm_management_config', JSON.stringify(DEFAULT_UTM_MANAGEMENT));
    this.logAudit('UTM_MANAGEMENT_RESET', 'MARKETING', 'UTM management reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_UTM_MANAGEMENT));
  };
  SuperStore.exportUtmManagementManifest = function() {
    const config = this.getUtmManagementConfig();
    const filename = "utm_management_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("UTM_MANAGEMENT_EXPORTED", "DATA_EXPORT", `UTM management manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 12-008: Social Sharing ---
  const DEFAULT_SOCIAL_SHARING = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    settings: { defaultOgImage: "/assets/images/og-share-default.webp", twitterCardType: "summary_large_image", appendSiteBranding: true },
    items: [
      { id: "SOC-01", pageContext: "Recruitment Notice Detail Pages", ogTitle: "{{exam_name}} Notification & Syllabus | CS Odisha", ogDescription: "Official commission circular, eligibility rules, age criteria, and district vacancy breakdown.", ogImage: "/assets/images/og-recruitment.webp", twitterHandle: "@CSOdisha_Portal", active: true },
      { id: "SOC-02", pageContext: "Study Library Mock Test Hub", ogTitle: "Free Odisha State Mock Test Series 2026", ogDescription: "Attempt full-length prelims mocks with real-time statewide percentile ranking.", ogImage: "/assets/images/og-mock-test.webp", twitterHandle: "@CSOdisha_Portal", active: true },
      { id: "SOC-03", pageContext: "District Aspirants Lounge", ogTitle: "Connect with {{district_name}} Aspirants Circle", ogDescription: "Peer doubt solving, offline study group schedules, and local exam center coordination.", ogImage: "/assets/images/og-community.webp", twitterHandle: "@CSOdisha_Portal", active: true }
    ]
  };
  SuperStore.getSocialSharingConfig = function() {
    return _hydrateConfig('cso_social_sharing_config', 'cards', () => DEFAULT_SOCIAL_SHARING);
  };
  SuperStore.saveSocialSharingConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.cards = cfg.items || cfg.cards || []; cfg.items = cfg.cards;
    localStorage.setItem('cso_social_sharing_config', JSON.stringify(cfg));
    this.logAudit('SOCIAL_SHARING_UPDATED', 'MARKETING', `Social sharing configuration updated (${cfg.items.length} cards).`);
    return true;
  };
  SuperStore.resetSocialSharingConfig = function() {
    localStorage.setItem('cso_social_sharing_config', JSON.stringify(DEFAULT_SOCIAL_SHARING));
    this.logAudit('SOCIAL_SHARING_RESET', 'MARKETING', 'Social sharing reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_SOCIAL_SHARING));
  };
  SuperStore.exportSocialSharingManifest = function() {
    const config = this.getSocialSharingConfig();
    const filename = "social_sharing_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("SOCIAL_SHARING_EXPORTED", "DATA_EXPORT", `Social sharing manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 12-009: Promotional Landing Pages ---
  const DEFAULT_PROMO_LANDING_PAGES = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    items: [
      { id: "LND-01", pageTitle: "OPSC OAS 2026 Rapid Strategy & Capsule Pack", urlSlug: "/lp/oas-2026-strategy", targetExam: "OPSC Civil Services", heroHeading: "Master OPSC OAS Prelims in 90 Days", primaryCta: "Claim Free 30-District Capsule", conversionCount: 2410, conversionRate: "14.2%", status: "Published", active: true },
      { id: "LND-02", pageTitle: "OSSC CGL Mathematics Mastery Workshop", urlSlug: "/lp/ossc-math-mastery", targetExam: "OSSC CGL Combined", heroHeading: "Formula Cheat Sheets & PYQ Shortcuts", primaryCta: "Register for Workshop", conversionCount: 1180, conversionRate: "11.8%", status: "Published", active: true },
      { id: "LND-03", pageTitle: "Odisha State Scholarship Portal (SSP) Assistance Drive", urlSlug: "/lp/ssp-scholarship-help", targetExam: "State Welfare & Education", heroHeading: "Zero-Error Scholarship Application Walkthrough", primaryCta: "Download Document Checklist", conversionCount: 3840, conversionRate: "22.5%", status: "Published", active: true }
    ]
  };
  SuperStore.getPromoLandingPagesConfig = function() {
    return _hydrateConfig('cso_promo_landing_pages_config', 'landingPages', () => DEFAULT_PROMO_LANDING_PAGES);
  };
  SuperStore.savePromoLandingPagesConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.landingPages = cfg.items || cfg.landingPages || []; cfg.items = cfg.landingPages;
    localStorage.setItem('cso_promo_landing_pages_config', JSON.stringify(cfg));
    this.logAudit('PROMO_LANDING_PAGES_UPDATED', 'MARKETING', `Promotional landing pages updated (${cfg.items.length} pages).`);
    return true;
  };
  SuperStore.resetPromoLandingPagesConfig = function() {
    localStorage.setItem('cso_promo_landing_pages_config', JSON.stringify(DEFAULT_PROMO_LANDING_PAGES));
    this.logAudit('PROMO_LANDING_PAGES_RESET', 'MARKETING', 'Promotional landing pages reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_PROMO_LANDING_PAGES));
  };
  SuperStore.exportPromoLandingPagesManifest = function() {
    const config = this.getPromoLandingPagesConfig();
    const filename = "promo_landing_pages_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("PROMO_LANDING_PAGES_EXPORTED", "DATA_EXPORT", `Promo landing pages manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 12-010: Advertising Reports ---
  const DEFAULT_ADVERTISING_REPORTS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalAdRevenueINR: 245000, collectedRevenueINR: 215000, pendingInvoicesINR: 30000, auditedPeriod: "FY26 Q3 (Oct-Dec 2026)" },
    items: [
      { id: "ADR-01", reportMonth: "October 2026", grossRevenueINR: 85000, billableImpressions: 412000, activeAdvertisers: 3, topSponsor: "Utkal Career Academy (₹45,000)", complianceAudit: "100% SLA Met", fileFormat: "PDF & CSV", active: true },
      { id: "ADR-02", reportMonth: "November 2026 (MTD)", grossRevenueINR: 92000, billableImpressions: 485200, activeAdvertisers: 4, topSponsor: "Bhubaneswar IAS Circle (₹38,000)", complianceAudit: "100% SLA Met", fileFormat: "PDF & CSV", active: true },
      { id: "ADR-03", reportMonth: "September 2026", grossRevenueINR: 68000, billableImpressions: 340000, activeAdvertisers: 2, topSponsor: "Odisha Publications Hub (₹28,000)", complianceAudit: "100% SLA Met", fileFormat: "CSV", active: true }
    ]
  };
  SuperStore.getAdvertisingReportsConfig = function() {
    return _hydrateConfig('cso_advertising_reports_config', 'reports', () => DEFAULT_ADVERTISING_REPORTS);
  };
  SuperStore.saveAdvertisingReportsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.reports = cfg.items || cfg.reports || []; cfg.items = cfg.reports;
    localStorage.setItem('cso_advertising_reports_config', JSON.stringify(cfg));
    this.logAudit('ADVERTISING_REPORTS_UPDATED', 'MARKETING', `Advertising reports updated (${cfg.items.length} reports).`);
    return true;
  };
  SuperStore.resetAdvertisingReportsConfig = function() {
    localStorage.setItem('cso_advertising_reports_config', JSON.stringify(DEFAULT_ADVERTISING_REPORTS));
    this.logAudit('ADVERTISING_REPORTS_RESET', 'MARKETING', 'Advertising reports reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_ADVERTISING_REPORTS));
  };
  SuperStore.exportAdvertisingReportsManifest = function() {
    const config = this.getAdvertisingReportsConfig();
    const filename = "advertising_reports_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("ADVERTISING_REPORTS_EXPORTED", "DATA_EXPORT", `Advertising reports manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 13-001: SEO Overview ---
  const DEFAULT_SEO_OVERVIEW = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    healthScore: { grade: "A (94/100)", indexedPagesCount: 184, metaCoverageRate: "98.2%", canonicalIntegrity: "100%", ogImageCoverage: "96.5%" },
    items: [
      { id: "SEO-01", checkDomain: "Core Metadata Completeness", status: "Optimal", affectedUrlsCount: 0, severity: "Low", description: "All public HTML routes have unique titles and meta descriptions", lastAudited: "2026-11-09", active: true },
      { id: "SEO-02", checkDomain: "Canonical Self-Reference Consistency", status: "Optimal", affectedUrlsCount: 0, severity: "Low", description: "No circular or cross-protocol canonical tags detected", lastAudited: "2026-11-09", active: true },
      { id: "SEO-03", checkDomain: "Mobile Viewport Meta & Scaling", status: "Optimal", affectedUrlsCount: 0, severity: "Low", description: "Responsive viewport meta tags properly set with no user-scalable restrictions", lastAudited: "2026-11-08", active: true },
      { id: "SEO-04", checkDomain: "Open Graph Social Sharing Previews", status: "Needs Review", affectedUrlsCount: 4, severity: "Medium", description: "4 deep syllabus pages lack explicit 1200x630 og:image tags (using fallback)", lastAudited: "2026-11-09", active: true }
    ]
  };
  SuperStore.getSeoOverviewConfig = function() {
    return _hydrateConfig('cso_seo_overview_config', 'audits', () => DEFAULT_SEO_OVERVIEW);
  };
  SuperStore.saveSeoOverviewConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.audits = cfg.items || cfg.audits || []; cfg.items = cfg.audits;
    localStorage.setItem('cso_seo_overview_config', JSON.stringify(cfg));
    this.logAudit('SEO_OVERVIEW_UPDATED', 'SEO', `SEO overview updated (${cfg.items.length} audit checks).`);
    return true;
  };
  SuperStore.resetSeoOverviewConfig = function() {
    localStorage.setItem('cso_seo_overview_config', JSON.stringify(DEFAULT_SEO_OVERVIEW));
    this.logAudit('SEO_OVERVIEW_RESET', 'SEO', 'SEO overview reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_SEO_OVERVIEW));
  };
  SuperStore.exportSeoOverviewManifest = function() {
    const config = this.getSeoOverviewConfig();
    const filename = "seo_overview_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("SEO_OVERVIEW_EXPORTED", "DATA_EXPORT", `SEO overview manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 13-002: Page Metadata ---
  const DEFAULT_PAGE_METADATA = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    items: [
      { id: "META-01", routePath: "/", pageTitle: "Common Sense Odisha | Odisha Recruitment, Schemes & Aspirant Intelligence", metaDescription: "Verified notifications, syllabus breakdowns, free mock tests, and district study circles for OPSC, OSSC, OSSSC and Odisha state welfare schemes.", robotsRule: "index, follow", charLengthTitle: 68, charLengthDesc: 156, active: true },
      { id: "META-02", routePath: "/jobs-careers/", pageTitle: "Jobs & Careers in Odisha | OPSC, OSSC, OSSSC Notifications 2026", metaDescription: "Latest Odisha government job vacancies, official gazette circulars, exam dates, eligibility criteria, and application links across all 30 districts.", robotsRule: "index, follow", charLengthTitle: 65, charLengthDesc: 154, active: true },
      { id: "META-03", routePath: "/schemes-benefits/", pageTitle: "Odisha Welfare Schemes & Scholarships Directory 2026 | CS Odisha", metaDescription: "Complete guide to Odisha government welfare initiatives including KALIA, BSKY, Medhabruti scholarship, eligibility rules, and portal links.", robotsRule: "index, follow", charLengthTitle: 67, charLengthDesc: 152, active: true },
      { id: "META-04", routePath: "/study-library/", pageTitle: "Odisha Exam Study Library | Free PYQ PDFs & Mock Tests", metaDescription: "Download previous year question papers, Odisha GK capsules, syllabus notes, and attempt statewide rank-benchmarked mock examinations.", robotsRule: "index, follow", charLengthTitle: 59, charLengthDesc: 151, active: true },
      { id: "META-05", routePath: "/admin/", pageTitle: "Super Admin Command Control Suite | CS Odisha", metaDescription: "Administrative backend management console for Common Sense Odisha platform.", robotsRule: "noindex, nofollow", charLengthTitle: 52, charLengthDesc: 84, active: true }
    ]
  };
  SuperStore.getPageMetadataConfig = function() {
    return _hydrateConfig('cso_page_metadata_config', 'pages', () => DEFAULT_PAGE_METADATA);
  };
  SuperStore.savePageMetadataConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.pages = cfg.items || cfg.pages || []; cfg.items = cfg.pages;
    localStorage.setItem('cso_page_metadata_config', JSON.stringify(cfg));
    this.logAudit('PAGE_METADATA_UPDATED', 'SEO', `Page metadata updated (${cfg.items.length} routes).`);
    return true;
  };
  SuperStore.resetPageMetadataConfig = function() {
    localStorage.setItem('cso_page_metadata_config', JSON.stringify(DEFAULT_PAGE_METADATA));
    this.logAudit('PAGE_METADATA_RESET', 'SEO', 'Page metadata reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_PAGE_METADATA));
  };
  SuperStore.exportPageMetadataManifest = function() {
    const config = this.getPageMetadataConfig();
    const filename = "page_metadata_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("PAGE_METADATA_EXPORTED", "DATA_EXPORT", `Page metadata manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 13-003: Canonical URLs ---
  const DEFAULT_CANONICAL_URLS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    settings: { enforceHttps: true, enforceTrailingSlash: true, stripTrackingParameters: true, baseProductionDomain: "https://csodisha.com" },
    items: [
      { id: "CAN-01", requestPattern: "https://csodisha.com/jobs-careers", canonicalTarget: "https://csodisha.com/jobs-careers/", normalizationRule: "Enforce Trailing Slash", active: true },
      { id: "CAN-02", requestPattern: "https://csodisha.com/jobs-careers/?utm_source=*&utm_medium=*", canonicalTarget: "https://csodisha.com/jobs-careers/", normalizationRule: "Strip UTM Parameters", active: true },
      { id: "CAN-03", requestPattern: "http://csodisha.com/*", canonicalTarget: "https://csodisha.com/*", normalizationRule: "Enforce Strict HTTPS Protocol", active: true },
      { id: "CAN-04", requestPattern: "https://csodisha.com/schemes-benefits/index.html", canonicalTarget: "https://csodisha.com/schemes-benefits/", normalizationRule: "Strip Directory Index Fallback", active: true }
    ]
  };
  SuperStore.getCanonicalUrlsConfig = function() {
    return _hydrateConfig('cso_canonical_urls_config', 'canonicals', () => DEFAULT_CANONICAL_URLS);
  };
  SuperStore.saveCanonicalUrlsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.canonicals = cfg.items || cfg.canonicals || []; cfg.items = cfg.canonicals;
    localStorage.setItem('cso_canonical_urls_config', JSON.stringify(cfg));
    this.logAudit('CANONICAL_URLS_UPDATED', 'SEO', `Canonical URLs updated (${cfg.items.length} rules).`);
    return true;
  };
  SuperStore.resetCanonicalUrlsConfig = function() {
    localStorage.setItem('cso_canonical_urls_config', JSON.stringify(DEFAULT_CANONICAL_URLS));
    this.logAudit('CANONICAL_URLS_RESET', 'SEO', 'Canonical URLs reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_CANONICAL_URLS));
  };
  SuperStore.exportCanonicalUrlsManifest = function() {
    const config = this.getCanonicalUrlsConfig();
    const filename = "canonical_urls_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("CANONICAL_URLS_EXPORTED", "DATA_EXPORT", `Canonical URLs manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 13-004: Open Graph Previews ---
  const DEFAULT_OPEN_GRAPH_PREVIEWS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    globalDefaults: { ogSiteName: "Common Sense Odisha", twitterSite: "@CSOdisha_Portal", defaultOgImage: "/assets/images/og-share-default.webp" },
    items: [
      { id: "OGP-01", targetPage: "Homepage (/)", ogTitle: "Common Sense Odisha | Odisha Exam & Scheme Intelligence", ogDescription: "Democratizing state recruitment notifications, syllabus guides, and study materials for aspirants.", ogImageUrl: "/assets/images/og-home.webp", imageDimensions: "1200x630 (Valid)", twitterCard: "summary_large_image", active: true },
      { id: "OGP-02", targetPage: "Jobs & Careers (/jobs-careers/)", ogTitle: "Odisha Recruitment Notice Vault 2026 | CS Odisha", ogDescription: "Browse all active OPSC, OSSC, and OSSSC government vacancy circulars with verified dates.", ogImageUrl: "/assets/images/og-jobs.webp", imageDimensions: "1200x630 (Valid)", twitterCard: "summary_large_image", active: true },
      { id: "OGP-03", targetPage: "Study Library (/study-library/)", ogTitle: "Odisha Free Exam Library & Mock Tests | CS Odisha", ogDescription: "Full previous year questions, district general knowledge capsules, and online mock exams.", ogImageUrl: "/assets/images/og-library.webp", imageDimensions: "1200x630 (Valid)", twitterCard: "summary_large_image", active: true }
    ]
  };
  SuperStore.getOpenGraphPreviewsConfig = function() {
    return _hydrateConfig('cso_opengraph_previews_config', 'ogProfiles', () => DEFAULT_OPEN_GRAPH_PREVIEWS);
  };
  SuperStore.saveOpenGraphPreviewsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.ogProfiles = cfg.items || cfg.ogProfiles || []; cfg.items = cfg.ogProfiles;
    localStorage.setItem('cso_opengraph_previews_config', JSON.stringify(cfg));
    this.logAudit('OPENGRAPH_PREVIEWS_UPDATED', 'SEO', `Open Graph previews updated (${cfg.items.length} profiles).`);
    return true;
  };
  SuperStore.resetOpenGraphPreviewsConfig = function() {
    localStorage.setItem('cso_opengraph_previews_config', JSON.stringify(DEFAULT_OPEN_GRAPH_PREVIEWS));
    this.logAudit('OPENGRAPH_PREVIEWS_RESET', 'SEO', 'Open Graph previews reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_OPEN_GRAPH_PREVIEWS));
  };
  SuperStore.exportOpenGraphPreviewsManifest = function() {
    const config = this.getOpenGraphPreviewsConfig();
    const filename = "opengraph_previews_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("OPENGRAPH_PREVIEWS_EXPORTED", "DATA_EXPORT", `Open Graph previews manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 13-005: Structured Data ---
  const DEFAULT_STRUCTURED_DATA = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    settings: { autoInjectJsonLd: true, validateAgainstSchemaOrg: true },
    items: [
      { id: "SCH-01", schemaType: "JobPosting", targetUrlPattern: "/jobs-careers/?job=*", entityName: "OPSC OAS Group A & B Recruitment", validationStatus: "Valid (Schema.org)", rawJsonLd: '{"@context":"https://schema.org/","@type":"JobPosting","title":"Odisha Administrative Service (OAS) 2026","hiringOrganization":{"@type":"GovernmentOrganization","name":"Odisha Public Service Commission"}}', active: true },
      { id: "SCH-02", schemaType: "GovernmentService", targetUrlPattern: "/schemes-benefits/?scheme=*", entityName: "KALIA Welfare & Livelihood Scheme", validationStatus: "Valid (Schema.org)", rawJsonLd: '{"@context":"https://schema.org/","@type":"GovernmentService","name":"Krushak Assistance for Livelihood and Income Augmentation","serviceOperator":{"@type":"GovernmentOrganization","name":"Government of Odisha"}}', active: true },
      { id: "SCH-03", schemaType: "FAQPage", targetUrlPattern: "/study-library/faqs", entityName: "Odisha Exam Eligibility & Syllabus FAQ", validationStatus: "Valid (Schema.org)", rawJsonLd: '{"@context":"https://schema.org/","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"What is the maximum age limit for OPSC OAS?","acceptedAnswer":{"@type":"Answer","text":"The upper age relaxation is governed by official Odisha state gazette orders."}}]}', active: true },
      { id: "SCH-04", schemaType: "BreadcrumbList", targetUrlPattern: "/*", entityName: "Global Sitewide Navigation Hierarchy", validationStatus: "Valid (Schema.org)", rawJsonLd: '{"@context":"https://schema.org/","@type":"BreadcrumbList","itemListElement":[{"@type":"ListItem","position":1,"name":"Home","item":"https://csodisha.com/"}]}', active: true }
    ]
  };
  SuperStore.getStructuredDataConfig = function() {
    return _hydrateConfig('cso_structured_data_config', 'schemas', () => DEFAULT_STRUCTURED_DATA);
  };
  SuperStore.saveStructuredDataConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.schemas = cfg.items || cfg.schemas || []; cfg.items = cfg.schemas;
    localStorage.setItem('cso_structured_data_config', JSON.stringify(cfg));
    this.logAudit('STRUCTURED_DATA_UPDATED', 'SEO', `Structured data schemas updated (${cfg.items.length} schemas).`);
    return true;
  };
  SuperStore.resetStructuredDataConfig = function() {
    localStorage.setItem('cso_structured_data_config', JSON.stringify(DEFAULT_STRUCTURED_DATA));
    this.logAudit('STRUCTURED_DATA_RESET', 'SEO', 'Structured data schemas reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_STRUCTURED_DATA));
  };
  SuperStore.exportStructuredDataManifest = function() {
    const config = this.getStructuredDataConfig();
    const filename = "structured_data_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("STRUCTURED_DATA_EXPORTED", "DATA_EXPORT", `Structured data manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 13-006: XML Sitemap ---
  const DEFAULT_XML_SITEMAP = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    settings: { sitemapIndexUrl: "https://csodisha.com/sitemap.xml", autoPingGoogle: true, autoPingBing: true },
    items: [
      { id: "SIT-01", sitemapFilename: "sitemap-pages.xml", routeCategory: "Core Portal Pages", priorityWeight: "1.0", changeFrequency: "daily", urlsCount: 14, lastGenerated: "2026-11-09", active: true },
      { id: "SIT-02", sitemapFilename: "sitemap-jobs.xml", routeCategory: "Recruitment & Gazette Circulars", priorityWeight: "0.9", changeFrequency: "hourly", urlsCount: 110, lastGenerated: "2026-11-10", active: true },
      { id: "SIT-03", sitemapFilename: "sitemap-schemes.xml", routeCategory: "Welfare Schemes & Scholarships", priorityWeight: "0.8", changeFrequency: "weekly", urlsCount: 45, lastGenerated: "2026-11-08", active: true },
      { id: "SIT-04", sitemapFilename: "sitemap-library.xml", routeCategory: "Study Notes, PYQs & Mocks", priorityWeight: "0.8", changeFrequency: "daily", urlsCount: 68, lastGenerated: "2026-11-09", active: true }
    ]
  };
  SuperStore.getXmlSitemapConfig = function() {
    return _hydrateConfig('cso_xml_sitemap_config', 'sitemaps', () => DEFAULT_XML_SITEMAP);
  };
  SuperStore.saveXmlSitemapConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.sitemaps = cfg.items || cfg.sitemaps || []; cfg.items = cfg.sitemaps;
    localStorage.setItem('cso_xml_sitemap_config', JSON.stringify(cfg));
    this.logAudit('XML_SITEMAP_UPDATED', 'SEO', `XML sitemaps updated (${cfg.items.length} sitemaps).`);
    return true;
  };
  SuperStore.resetXmlSitemapConfig = function() {
    localStorage.setItem('cso_xml_sitemap_config', JSON.stringify(DEFAULT_XML_SITEMAP));
    this.logAudit('XML_SITEMAP_RESET', 'SEO', 'XML sitemaps reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_XML_SITEMAP));
  };
  SuperStore.exportXmlSitemapManifest = function() {
    const config = this.getXmlSitemapConfig();
    const filename = "xml_sitemap_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("XML_SITEMAP_EXPORTED", "DATA_EXPORT", `XML sitemap manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 13-007: Robots Settings ---
  const DEFAULT_ROBOTS_SETTINGS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    settings: { sitemapDirectiveUrl: "https://csodisha.com/sitemap.xml", defaultCrawlDelaySeconds: 0 },
    items: [
      { id: "ROB-01", userAgent: "*", directiveType: "Disallow", pathRule: "/admin/", comment: "Block administrative suite from search engine crawlers", active: true },
      { id: "ROB-02", userAgent: "*", directiveType: "Disallow", pathRule: "/api/", comment: "Block private internal API endpoints", active: true },
      { id: "ROB-03", userAgent: "*", directiveType: "Allow", pathRule: "/", comment: "Allow full public route crawling", active: true },
      { id: "ROB-04", userAgent: "GPTBot", directiveType: "Disallow", pathRule: "/study-library/mock-evaluations/", comment: "Protect proprietary mock scoring engines", active: true }
    ]
  };
  SuperStore.getRobotsSettingsConfig = function() {
    return _hydrateConfig('cso_robots_settings_config', 'rules', () => DEFAULT_ROBOTS_SETTINGS);
  };
  SuperStore.saveRobotsSettingsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.rules = cfg.items || cfg.rules || []; cfg.items = cfg.rules;
    localStorage.setItem('cso_robots_settings_config', JSON.stringify(cfg));
    this.logAudit('ROBOTS_SETTINGS_UPDATED', 'SEO', `Robots settings updated (${cfg.items.length} directives).`);
    return true;
  };
  SuperStore.resetRobotsSettingsConfig = function() {
    localStorage.setItem('cso_robots_settings_config', JSON.stringify(DEFAULT_ROBOTS_SETTINGS));
    this.logAudit('ROBOTS_SETTINGS_RESET', 'SEO', 'Robots settings reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_ROBOTS_SETTINGS));
  };
  SuperStore.exportRobotsSettingsManifest = function() {
    const config = this.getRobotsSettingsConfig();
    const filename = "robots_settings_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("ROBOTS_SETTINGS_EXPORTED", "DATA_EXPORT", `Robots settings manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 13-008: Search Console Integration ---
  const DEFAULT_SEARCH_CONSOLE = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    credentials: { googleSiteVerificationToken: "google-site-verification=csodisha_live_token_2026", bingWebmasterAuthCode: "msvalidate.01=CSODISHA_BING_AUTH_9912", propertyType: "Domain Property (URL Prefix: https://csodisha.com)" },
    items: [
      { id: "GSC-01", provider: "Google Search Console", verificationMethod: "HTML Meta Tag + DNS TXT", verifiedStatus: "Connected & Verified", sitemapStatus: "Success (sitemap.xml)", indexCoverageRate: "98.4%", lastChecked: "2026-11-10", active: true },
      { id: "GSC-02", provider: "Bing Webmaster Tools", verificationMethod: "Meta Tag", verifiedStatus: "Connected & Verified", sitemapStatus: "Success (sitemap.xml)", indexCoverageRate: "96.1%", lastChecked: "2026-11-09", active: true }
    ]
  };
  SuperStore.getSearchConsoleConfig = function() {
    return _hydrateConfig('cso_search_console_config', 'accounts', () => DEFAULT_SEARCH_CONSOLE);
  };
  SuperStore.saveSearchConsoleConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.accounts = cfg.items || cfg.accounts || []; cfg.items = cfg.accounts;
    localStorage.setItem('cso_search_console_config', JSON.stringify(cfg));
    this.logAudit('SEARCH_CONSOLE_UPDATED', 'SEO', `Search console accounts updated (${cfg.items.length} providers).`);
    return true;
  };
  SuperStore.resetSearchConsoleConfig = function() {
    localStorage.setItem('cso_search_console_config', JSON.stringify(DEFAULT_SEARCH_CONSOLE));
    this.logAudit('SEARCH_CONSOLE_RESET', 'SEO', 'Search console accounts reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_SEARCH_CONSOLE));
  };
  SuperStore.exportSearchConsoleManifest = function() {
    const config = this.getSearchConsoleConfig();
    const filename = "search_console_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("SEARCH_CONSOLE_EXPORTED", "DATA_EXPORT", `Search console manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 13-009: Internal Search Manager ---
  const DEFAULT_INTERNAL_SEARCH_MANAGER = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    settings: { fuzzyThreshold: 0.2, typoTolerance: true, minQueryLength: 2, defaultPageSize: 15, highlightSnippets: true },
    items: [
      { id: "SRM-01", paramKey: "TITLE_BOOST_FACTOR", paramTitle: "Exam Title Boosting Weight", value: "3.5x", context: "Prioritizes exact match in job or scheme title", active: true },
      { id: "SRM-02", paramKey: "TAGS_BOOST_FACTOR", paramTitle: "District & Category Tag Weight", value: "2.0x", context: "Boosts matches against Balasore, Cuttack, OPSC tags", active: true },
      { id: "SRM-03", paramKey: "CONTENT_BODY_WEIGHT", paramTitle: "Full Gazette Description Weight", value: "1.0x", context: "Baseline weight for long-form circular text", active: true },
      { id: "SRM-04", paramKey: "SYNONYM_EXPANSION", paramTitle: "Odia/English Bidirectional Aliases", value: "Enabled", context: "Maps 'OAS' to 'Odisha Administrative Service'", active: true }
    ]
  };
  SuperStore.getInternalSearchManagerConfig = function() {
    return _hydrateConfig('cso_internal_search_manager_config', 'searchRules', () => DEFAULT_INTERNAL_SEARCH_MANAGER);
  };
  SuperStore.saveInternalSearchManagerConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.searchRules = cfg.items || cfg.searchRules || []; cfg.items = cfg.searchRules;
    localStorage.setItem('cso_internal_search_manager_config', JSON.stringify(cfg));
    this.logAudit('INTERNAL_SEARCH_MANAGER_UPDATED', 'SEARCH', `Internal search manager updated (${cfg.items.length} parameters).`);
    return true;
  };
  SuperStore.resetInternalSearchManagerConfig = function() {
    localStorage.setItem('cso_internal_search_manager_config', JSON.stringify(DEFAULT_INTERNAL_SEARCH_MANAGER));
    this.logAudit('INTERNAL_SEARCH_MANAGER_RESET', 'SEARCH', 'Internal search manager reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_INTERNAL_SEARCH_MANAGER));
  };
  SuperStore.exportInternalSearchManagerManifest = function() {
    const config = this.getInternalSearchManagerConfig();
    const filename = "internal_search_manager_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("INTERNAL_SEARCH_MANAGER_EXPORTED", "DATA_EXPORT", `Internal search manager manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 13-010: Search Index ---
  const DEFAULT_SEARCH_INDEX = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalIndexedDocuments: 486, indexSizeBytes: "412 KB (Compressed)", averageQueryLatencyMs: "12ms", lastFullReindex: "2026-11-10 06:30" },
    items: [
      { id: "IDX-01", indexNamespace: "jobs-careers", collectionName: "Recruitment Circulars & Gazettes", docCount: 184, memoryFootprint: "148 KB", reindexTrigger: "Automated on Publish", status: "Healthy", active: true },
      { id: "IDX-02", indexNamespace: "schemes-benefits", collectionName: "Welfare Schemes & Scholarships", docCount: 92, memoryFootprint: "74 KB", reindexTrigger: "Automated on Publish", status: "Healthy", active: true },
      { id: "IDX-03", indexNamespace: "study-library", collectionName: "Study Notes, PYQs & Mocks", docCount: 168, memoryFootprint: "152 KB", reindexTrigger: "Automated on Publish", status: "Healthy", active: true },
      { id: "IDX-04", indexNamespace: "community-forum", collectionName: "District Discussion Threads", docCount: 42, memoryFootprint: "38 KB", reindexTrigger: "Hourly Cron", status: "Healthy", active: true }
    ]
  };
  SuperStore.getSearchIndexConfig = function() {
    return _hydrateConfig('cso_search_index_config', 'indices', () => DEFAULT_SEARCH_INDEX);
  };
  SuperStore.saveSearchIndexConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.indices = cfg.items || cfg.indices || []; cfg.items = cfg.indices;
    localStorage.setItem('cso_search_index_config', JSON.stringify(cfg));
    this.logAudit('SEARCH_INDEX_UPDATED', 'SEARCH', `Search index namespaces updated (${cfg.items.length} indices).`);
    return true;
  };
  SuperStore.resetSearchIndexConfig = function() {
    localStorage.setItem('cso_search_index_config', JSON.stringify(DEFAULT_SEARCH_INDEX));
    this.logAudit('SEARCH_INDEX_RESET', 'SEARCH', 'Search index namespaces reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_SEARCH_INDEX));
  };
  SuperStore.exportSearchIndexManifest = function() {
    const config = this.getSearchIndexConfig();
    const filename = "search_index_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("SEARCH_INDEX_EXPORTED", "DATA_EXPORT", `Search index manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 13-011: Search Filters ---
  const DEFAULT_SEARCH_FILTERS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    items: [
      { id: "FLT-01", filterLabel: "District Jurisdiction", filterKey: "district", uiComponentType: "Multi-Select Dropdown", optionsCount: 30, displayOrder: 1, active: true },
      { id: "FLT-02", filterLabel: "Recruiting Commission", filterKey: "commission", uiComponentType: "Pill Tags", optionsCount: 6, displayOrder: 2, active: true },
      { id: "FLT-03", filterLabel: "Minimum Educational Qualification", filterKey: "qualification", uiComponentType: "Radio Group", optionsCount: 5, displayOrder: 3, active: true },
      { id: "FLT-04", filterLabel: "Pay Scale & Grade Pay", filterKey: "salary_bracket", uiComponentType: "Range Slider", optionsCount: 4, displayOrder: 4, active: true },
      { id: "FLT-05", filterLabel: "Target Beneficiary Category", filterKey: "beneficiary", uiComponentType: "Checkbox List", optionsCount: 8, displayOrder: 5, active: true }
    ]
  };
  SuperStore.getSearchFiltersConfig = function() {
    return _hydrateConfig('cso_search_filters_config', 'filters', () => DEFAULT_SEARCH_FILTERS);
  };
  SuperStore.saveSearchFiltersConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.filters = cfg.items || cfg.filters || []; cfg.items = cfg.filters;
    localStorage.setItem('cso_search_filters_config', JSON.stringify(cfg));
    this.logAudit('SEARCH_FILTERS_UPDATED', 'SEARCH', `Search filters updated (${cfg.items.length} facets).`);
    return true;
  };
  SuperStore.resetSearchFiltersConfig = function() {
    localStorage.setItem('cso_search_filters_config', JSON.stringify(DEFAULT_SEARCH_FILTERS));
    this.logAudit('SEARCH_FILTERS_RESET', 'SEARCH', 'Search filters reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_SEARCH_FILTERS));
  };
  SuperStore.exportSearchFiltersManifest = function() {
    const config = this.getSearchFiltersConfig();
    const filename = "search_filters_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("SEARCH_FILTERS_EXPORTED", "DATA_EXPORT", `Search filters manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 13-012: Popular Searches ---
  const DEFAULT_POPULAR_SEARCHES = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalSearchesTracked: 184500, topTrendingCount: 10, pinnedQueriesCount: 3 },
    items: [
      { id: "POP-01", searchQuery: "OPSC OAS 2026 Notification", category: "Jobs & Careers", searchVolume7d: 28400, trendChange: "+42%", isPinned: true, active: true },
      { id: "POP-02", searchQuery: "OSSC CGL Exam Date 2026", category: "Jobs & Careers", searchVolume7d: 19800, trendChange: "+28%", isPinned: true, active: true },
      { id: "POP-03", searchQuery: "KALIA Yojana List 2026", category: "Schemes & Benefits", searchVolume7d: 14200, trendChange: "+15%", isPinned: true, active: true },
      { id: "POP-04", searchQuery: "Odisha GK 30 Districts Capsule PDF", category: "Study Library", searchVolume7d: 12900, trendChange: "+64%", isPinned: false, active: true },
      { id: "POP-05", searchQuery: "OSSSC Revenue Inspector Syllabus", category: "Jobs & Careers", searchVolume7d: 11400, trendChange: "+19%", isPinned: false, active: true }
    ]
  };
  SuperStore.getPopularSearchesConfig = function() {
    return _hydrateConfig('cso_popular_searches_config', 'queries', () => DEFAULT_POPULAR_SEARCHES);
  };
  SuperStore.savePopularSearchesConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.queries = cfg.items || cfg.queries || []; cfg.items = cfg.queries;
    localStorage.setItem('cso_popular_searches_config', JSON.stringify(cfg));
    this.logAudit('POPULAR_SEARCHES_UPDATED', 'SEARCH', `Popular searches updated (${cfg.items.length} queries).`);
    return true;
  };
  SuperStore.resetPopularSearchesConfig = function() {
    localStorage.setItem('cso_popular_searches_config', JSON.stringify(DEFAULT_POPULAR_SEARCHES));
    this.logAudit('POPULAR_SEARCHES_RESET', 'SEARCH', 'Popular searches reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_POPULAR_SEARCHES));
  };
  SuperStore.exportPopularSearchesManifest = function() {
    const config = this.getPopularSearchesConfig();
    const filename = "popular_searches_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("POPULAR_SEARCHES_EXPORTED", "DATA_EXPORT", `Popular searches manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 13-013: Zero-Result Searches ---
  const DEFAULT_ZERO_RESULT_SEARCHES = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalMissesLogged: 84, mappedToSynonymCount: 52, pendingEditorialAction: 32 },
    items: [
      { id: "ZRO-01", failedQuery: "OPSC OSAS Admit Card", attemptedCount: 412, mappedSynonym: "OPSC OAS Admit Card", resolvedStatus: "Mapped to Synonym", loggedDate: "2026-11-08", active: true },
      { id: "ZRO-02", failedQuery: "Odisha Police Constable Running Date", attemptedCount: 290, mappedSynonym: "Pending Content Creation", resolvedStatus: "Content Ticket Filed", loggedDate: "2026-11-09", active: true },
      { id: "ZRO-03", failedQuery: "SAMS Degree Spot Admission Merit List", attemptedCount: 185, mappedSynonym: "SAMS Odisha Merit List", resolvedStatus: "Mapped to Synonym", loggedDate: "2026-11-07", active: true },
      { id: "ZRO-04", failedQuery: "Balasore High Court Clerk Exam", attemptedCount: 94, mappedSynonym: "Unresolved", resolvedStatus: "Needs Investigation", loggedDate: "2026-11-10", active: true }
    ]
  };
  SuperStore.getZeroResultSearchesConfig = function() {
    return _hydrateConfig('cso_zero_result_searches_config', 'misses', () => DEFAULT_ZERO_RESULT_SEARCHES);
  };
  SuperStore.saveZeroResultSearchesConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.misses = cfg.items || cfg.misses || []; cfg.items = cfg.misses;
    localStorage.setItem('cso_zero_result_searches_config', JSON.stringify(cfg));
    this.logAudit('ZERO_RESULT_SEARCHES_UPDATED', 'SEARCH', `Zero-result searches updated (${cfg.items.length} records).`);
    return true;
  };
  SuperStore.resetZeroResultSearchesConfig = function() {
    localStorage.setItem('cso_zero_result_searches_config', JSON.stringify(DEFAULT_ZERO_RESULT_SEARCHES));
    this.logAudit('ZERO_RESULT_SEARCHES_RESET', 'SEARCH', 'Zero-result searches reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_ZERO_RESULT_SEARCHES));
  };
  SuperStore.exportZeroResultSearchesManifest = function() {
    const config = this.getZeroResultSearchesConfig();
    const filename = "zero_result_searches_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("ZERO_RESULT_SEARCHES_EXPORTED", "DATA_EXPORT", `Zero-result searches manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 13-014: URL Redirects ---
  const DEFAULT_URL_REDIRECTS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    settings: { enableAutoCloudflareRedirects: true, preserveQueryStrings: true, defaultRedirectCode: 301 },
    items: [
      { id: "RDR-01", sourcePath: "/jobs/opsc-oas-2025", targetUrl: "/jobs-careers/?filter=opsc", httpStatus: 301, redirectType: "Permanent (301)", totalHits: 4820, lastHitDate: "2026-11-09", active: true },
      { id: "RDR-02", sourcePath: "/scholarships/medhabruti", targetUrl: "/schemes-benefits/?scheme=medhabruti", httpStatus: 301, redirectType: "Permanent (301)", totalHits: 2940, lastHitDate: "2026-11-08", active: true },
      { id: "RDR-03", sourcePath: "/admit-card/latest", targetUrl: "/jobs-careers/?section=admit-cards", httpStatus: 302, redirectType: "Temporary (302)", totalHits: 6410, lastHitDate: "2026-11-10", active: true },
      { id: "RDR-04", sourcePath: "/old-gazette/*", targetUrl: "/study-library/", httpStatus: 301, redirectType: "Wildcard Pattern (301)", totalHits: 1210, lastHitDate: "2026-11-07", active: true }
    ]
  };
  SuperStore.getUrlRedirectsConfig = function() {
    return _hydrateConfig('cso_url_redirects_config', 'redirects', () => DEFAULT_URL_REDIRECTS);
  };
  SuperStore.saveUrlRedirectsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.redirects = cfg.items || cfg.redirects || []; cfg.items = cfg.redirects;
    localStorage.setItem('cso_url_redirects_config', JSON.stringify(cfg));
    this.logAudit('URL_REDIRECTS_UPDATED', 'ROUTING', `URL redirects updated (${cfg.items.length} routes).`);
    return true;
  };
  SuperStore.resetUrlRedirectsConfig = function() {
    localStorage.setItem('cso_url_redirects_config', JSON.stringify(DEFAULT_URL_REDIRECTS));
    this.logAudit('URL_REDIRECTS_RESET', 'ROUTING', 'URL redirects reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_URL_REDIRECTS));
  };
  SuperStore.exportUrlRedirectsManifest = function() {
    const config = this.getUrlRedirectsConfig();
    const filename = "url_redirects_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("URL_REDIRECTS_EXPORTED", "DATA_EXPORT", `URL redirects manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 13-015: Broken Links ---
  const DEFAULT_BROKEN_LINKS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalLinksScanned: 563, totalBrokenCount: 2, totalWarnings: 1, lastFullAuditDate: "2026-11-10 07:15" },
    items: [
      { id: "BRL-01", brokenUrl: "https://odisha.gov.in/portal/old-scholarship-doc.pdf", sourcePage: "/schemes-benefits/?scheme=medhabruti", anchorText: "Download Official Guideline PDF", httpStatusCode: 404, errorType: "External Dead Link", detectedDate: "2026-11-08", status: "Unresolved", active: true },
      { id: "BRL-02", brokenUrl: "/study-library/odisha-history-q48-solution", sourcePage: "/study-library/history-pyq-vault", anchorText: "Paika Rebellion Detailed Solution", httpStatusCode: 404, errorType: "Internal Missing Page", detectedDate: "2026-11-09", status: "Redirect Scheduled", active: true },
      { id: "BRL-03", brokenUrl: "https://opsc.gov.in/notice-archive-2021", sourcePage: "/jobs-careers/?filter=opsc", anchorText: "View 2021 Precedent Circular", httpStatusCode: 503, errorType: "Commission Gateway Timeout", detectedDate: "2026-11-10", status: "Monitoring", active: true }
    ]
  };
  SuperStore.getBrokenLinksConfig = function() {
    return _hydrateConfig('cso_broken_links_config', 'brokenLinks', () => DEFAULT_BROKEN_LINKS);
  };
  SuperStore.saveBrokenLinksConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.brokenLinks = cfg.items || cfg.brokenLinks || []; cfg.items = cfg.brokenLinks;
    localStorage.setItem('cso_broken_links_config', JSON.stringify(cfg));
    this.logAudit('BROKEN_LINKS_UPDATED', 'ROUTING', `Broken links updated (${cfg.items.length} items).`);
    return true;
  };
  SuperStore.resetBrokenLinksConfig = function() {
    localStorage.setItem('cso_broken_links_config', JSON.stringify(DEFAULT_BROKEN_LINKS));
    this.logAudit('BROKEN_LINKS_RESET', 'ROUTING', 'Broken links reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_BROKEN_LINKS));
  };
  SuperStore.exportBrokenLinksManifest = function() {
    const config = this.getBrokenLinksConfig();
    const filename = "broken_links_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("BROKEN_LINKS_EXPORTED", "DATA_EXPORT", `Broken links manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 13-016: 404 Reports ---
  const DEFAULT_404_REPORTS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { total404Incidents24h: 38, uniqueMissingUrlsCount: 5, resolvedViaRedirect: 33 },
    items: [
      { id: "R404-01", missingPath: "/jobs/ossc-cgl-admit-card", requestHits: 412, referrer: "Direct Candidate Web / WhatsApp", userAgentCategory: "Mobile Android", firstSeen: "2026-11-07", lastSeen: "2026-11-10 07:30", resolutionStatus: "Unresolved", active: true },
      { id: "R404-02", missingPath: "/scholarship-apply-portal", requestHits: 198, referrer: "Google Search", userAgentCategory: "Mobile Safari", firstSeen: "2026-11-06", lastSeen: "2026-11-09 21:15", resolutionStatus: "Unresolved", active: true },
      { id: "R404-03", missingPath: "/study/odia-vyakaran-pdf", requestHits: 142, referrer: "Telegram Link", userAgentCategory: "Desktop Chrome", firstSeen: "2026-11-05", lastSeen: "2026-11-09 18:40", resolutionStatus: "Redirected (RDR-04)", active: true }
    ]
  };
  SuperStore.get404ReportsConfig = function() {
    return _hydrateConfig('cso_404_reports_config', 'incidents', () => DEFAULT_404_REPORTS);
  };
  SuperStore.save404ReportsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.incidents = cfg.items || cfg.incidents || []; cfg.items = cfg.incidents;
    localStorage.setItem('cso_404_reports_config', JSON.stringify(cfg));
    this.logAudit('404_REPORTS_UPDATED', 'ROUTING', `404 reports updated (${cfg.items.length} incidents).`);
    return true;
  };
  SuperStore.reset404ReportsConfig = function() {
    localStorage.setItem('cso_404_reports_config', JSON.stringify(DEFAULT_404_REPORTS));
    this.logAudit('404_REPORTS_RESET', 'ROUTING', '404 reports reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_404_REPORTS));
  };
  SuperStore.export404ReportsManifest = function() {
    const config = this.get404ReportsConfig();
    const filename = "404_reports_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("404_REPORTS_EXPORTED", "DATA_EXPORT", `404 reports manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 14-001: Event Calendar ---
  const DEFAULT_EVENT_CALENDAR = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalEventsCount: 24, upcomingThisMonth: 8, physicalEvents: 4, virtualEvents: 20 },
    items: [
      { id: "EVT-01", eventTitle: "Balasore District Aspirants Strategy & Mentorship Meet", eventType: "In-Person Workshop", venueOrPlatform: "F.M. Autonomous College Hall, Balasore", startDate: "2026-11-22", endDate: "2026-11-22", timeRange: "10:00 AM - 01:00 PM", capacity: 250, rsvpCount: 218, status: "Confirmed", active: true },
      { id: "EVT-02", eventTitle: "Statewide OPSC OAS Prelims Strategy & Essay Guidance", eventType: "Live Virtual Webinar", venueOrPlatform: "Zoom / YouTube Live Stream", startDate: "2026-11-29", endDate: "2026-11-29", timeRange: "06:30 PM - 08:30 PM", capacity: 1000, rsvpCount: 842, status: "Open for RSVP", active: true },
      { id: "EVT-03", eventTitle: "Free Odisha State Offline Mock Test Drive #04", eventType: "Proctored Offline Mock", venueOrPlatform: "Cuttack & Bhubaneswar Examination Centers", startDate: "2026-12-06", endDate: "2026-12-06", timeRange: "09:30 AM - 12:30 PM", capacity: 500, rsvpCount: 470, status: "Filling Fast", active: true }
    ]
  };
  SuperStore.getEventCalendarConfig = function() {
    return _hydrateConfig('cso_event_calendar_config', 'events', () => DEFAULT_EVENT_CALENDAR);
  };
  SuperStore.saveEventCalendarConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.events = cfg.items || cfg.events || []; cfg.items = cfg.events;
    localStorage.setItem('cso_event_calendar_config', JSON.stringify(cfg));
    this.logAudit('EVENT_CALENDAR_UPDATED', 'SCHEDULING', `Event calendar updated (${cfg.items.length} events).`);
    return true;
  };
  SuperStore.resetEventCalendarConfig = function() {
    localStorage.setItem('cso_event_calendar_config', JSON.stringify(DEFAULT_EVENT_CALENDAR));
    this.logAudit('EVENT_CALENDAR_RESET', 'SCHEDULING', 'Event calendar reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_EVENT_CALENDAR));
  };
  SuperStore.exportEventCalendarManifest = function() {
    const config = this.getEventCalendarConfig();
    const filename = "event_calendar_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("EVENT_CALENDAR_EXPORTED", "DATA_EXPORT", `Event calendar manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 14-002: Exam Calendar ---
  const DEFAULT_EXAM_CALENDAR = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalScheduledExams: 18, examsNext30Days: 4, admitCardsReleased: 6 },
    items: [
      { id: "EXM-01", examName: "Odisha Civil Services (OAS/OFS) Preliminary Exam 2026", commission: "OPSC", examDate: "2026-12-20", shiftTime: "10:00 AM - 12:00 PM (Paper I) / 02:00 PM - 04:00 PM (Paper II)", admitCardReleaseDate: "2026-12-08", gazetteNoticeRef: "OPSC-OCS-2026-08", status: "Date Confirmed", active: true },
      { id: "EXM-02", examName: "OSSC Combined Graduate Level (CGL) Preliminary Stage", commission: "OSSC", examDate: "2027-01-17", shiftTime: "09:30 AM - 12:00 PM (Single Shift)", admitCardReleaseDate: "2027-01-05", gazetteNoticeRef: "OSSC-CGL-2026-14", status: "Tentative Gazette", active: true },
      { id: "EXM-03", examName: "OSSSC Revenue Inspector (RI) & Amin Combined Test", commission: "OSSSC", examDate: "2027-02-07", shiftTime: "10:00 AM - 01:00 PM", admitCardReleaseDate: "2027-01-25", gazetteNoticeRef: "OSSSC-RI-2026-22", status: "Scheduled", active: true }
    ]
  };
  SuperStore.getExamCalendarConfig = function() {
    return _hydrateConfig('cso_exam_calendar_config', 'exams', () => DEFAULT_EXAM_CALENDAR);
  };
  SuperStore.saveExamCalendarConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.exams = cfg.items || cfg.exams || []; cfg.items = cfg.exams;
    localStorage.setItem('cso_exam_calendar_config', JSON.stringify(cfg));
    this.logAudit('EXAM_CALENDAR_UPDATED', 'SCHEDULING', `Exam calendar updated (${cfg.items.length} exams).`);
    return true;
  };
  SuperStore.resetExamCalendarConfig = function() {
    localStorage.setItem('cso_exam_calendar_config', JSON.stringify(DEFAULT_EXAM_CALENDAR));
    this.logAudit('EXAM_CALENDAR_RESET', 'SCHEDULING', 'Exam calendar reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_EXAM_CALENDAR));
  };
  SuperStore.exportExamCalendarManifest = function() {
    const config = this.getExamCalendarConfig();
    const filename = "exam_calendar_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("EXAM_CALENDAR_EXPORTED", "DATA_EXPORT", `Exam calendar manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 14-003: Recruitment Deadlines ---
  const DEFAULT_RECRUITMENT_DEADLINES = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { activeWindows: 12, closingThisWeek: 3, extendedDeadlinesCount: 2 },
    items: [
      { id: "DDL-01", recruitmentTitle: "OPSC OAS 2026 Online Application Submission", commission: "OPSC", startDate: "2026-10-15", closingDate: "2026-11-20", feePaymentDeadline: "2026-11-23", correctionWindowTill: "2026-11-27", daysRemaining: 10, status: "Closing Soon", active: true },
      { id: "DDL-02", recruitmentTitle: "Odisha State Scholarship Portal (SSP) Merit-Cum-Means", commission: "Higher Education Dept", startDate: "2026-09-01", closingDate: "2026-11-30", feePaymentDeadline: "N/A (Free)", correctionWindowTill: "2026-12-05", daysRemaining: 20, status: "Active Window", active: true },
      { id: "DDL-03", recruitmentTitle: "OSSSC District Field Cadre (Amin/ARI) Registration", commission: "OSSSC", startDate: "2026-11-01", closingDate: "2026-12-10", feePaymentDeadline: "2026-12-12", correctionWindowTill: "2026-12-15", daysRemaining: 30, status: "Active Window", active: true }
    ]
  };
  SuperStore.getRecruitmentDeadlinesConfig = function() {
    return _hydrateConfig('cso_recruitment_deadlines_config', 'deadlines', () => DEFAULT_RECRUITMENT_DEADLINES);
  };
  SuperStore.saveRecruitmentDeadlinesConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.deadlines = cfg.items || cfg.deadlines || []; cfg.items = cfg.deadlines;
    localStorage.setItem('cso_recruitment_deadlines_config', JSON.stringify(cfg));
    this.logAudit('RECRUITMENT_DEADLINES_UPDATED', 'SCHEDULING', `Recruitment deadlines updated (${cfg.items.length} entries).`);
    return true;
  };
  SuperStore.resetRecruitmentDeadlinesConfig = function() {
    localStorage.setItem('cso_recruitment_deadlines_config', JSON.stringify(DEFAULT_RECRUITMENT_DEADLINES));
    this.logAudit('RECRUITMENT_DEADLINES_RESET', 'SCHEDULING', 'Recruitment deadlines reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_RECRUITMENT_DEADLINES));
  };
  SuperStore.exportRecruitmentDeadlinesManifest = function() {
    const config = this.getRecruitmentDeadlinesConfig();
    const filename = "recruitment_deadlines_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("RECRUITMENT_DEADLINES_EXPORTED", "DATA_EXPORT", `Recruitment deadlines manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 14-004: Webinars & Sessions ---
  const DEFAULT_WEBINARS_SESSIONS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalWebinarsHosted: 42, activeUpcoming: 4, totalAttendedAspirants: 14850 },
    items: [
      { id: "WBN-01", sessionTitle: "Cracking OPSC OAS General Studies Paper II (CSAT Logic & Math)", speakerName: "Debabrata Nayak (Senior Faculty)", platform: "YouTube Live & WebRTC", sessionDateTime: "2026-11-18 19:00", durationMinutes: 90, registeredCount: 620, accessTier: "Free for All Aspirants", status: "Upcoming", active: true },
      { id: "WBN-02", sessionTitle: "Odisha History Chronology & Tribal Movements Masterclass", speakerName: "Subhashree Mohanty (State Ranker)", platform: "Interactive Zoom Meeting", sessionDateTime: "2026-11-25 18:30", durationMinutes: 120, registeredCount: 450, accessTier: "Scholar Club Members", status: "Upcoming", active: true },
      { id: "WBN-03", sessionTitle: "Revenue Inspector Computer Practical Test Blueprint", speakerName: "Platform IT Lead", platform: "Recorded + Live Q&A", sessionDateTime: "2026-12-02 20:00", durationMinutes: 60, registeredCount: 290, accessTier: "Free for All Aspirants", status: "Scheduled", active: true }
    ]
  };
  SuperStore.getWebinarsSessionsConfig = function() {
    return _hydrateConfig('cso_webinars_sessions_config', 'sessions', () => DEFAULT_WEBINARS_SESSIONS);
  };
  SuperStore.saveWebinarsSessionsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.sessions = cfg.items || cfg.sessions || []; cfg.items = cfg.sessions;
    localStorage.setItem('cso_webinars_sessions_config', JSON.stringify(cfg));
    this.logAudit('WEBINARS_SESSIONS_UPDATED', 'SCHEDULING', `Webinars & sessions updated (${cfg.items.length} sessions).`);
    return true;
  };
  SuperStore.resetWebinarsSessionsConfig = function() {
    localStorage.setItem('cso_webinars_sessions_config', JSON.stringify(DEFAULT_WEBINARS_SESSIONS));
    this.logAudit('WEBINARS_SESSIONS_RESET', 'SCHEDULING', 'Webinars & sessions reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_WEBINARS_SESSIONS));
  };
  SuperStore.exportWebinarsSessionsManifest = function() {
    const config = this.getWebinarsSessionsConfig();
    const filename = "webinars_sessions_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("WEBINARS_SESSIONS_EXPORTED", "DATA_EXPORT", `Webinars & sessions manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 14-005: Event Registration ---
  const DEFAULT_EVENT_REGISTRATIONS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalRegistrations: 2180, attendanceConfirmed: 1840, cancelledCount: 42 },
    items: [
      { id: "REG-EVT-01", candidateEmail: "ramesh.behera@gmail.com", candidateName: "Ramesh Chandra Behera", eventRef: "EVT-01", district: "Balasore", phone: "+91 94370 XXXXX", ticketCode: "TKT-BAL-0142", attendanceStatus: "Confirmed", registeredAt: "2026-11-04 14:20", active: true },
      { id: "REG-EVT-02", candidateEmail: "subhashree.m@gmail.com", candidateName: "Subhashree Mohanty", eventRef: "EVT-02", district: "Cuttack", phone: "+91 98610 XXXXX", ticketCode: "TKT-WEB-0891", attendanceStatus: "Confirmed", registeredAt: "2026-11-06 18:45", active: true },
      { id: "REG-EVT-03", candidateEmail: "chinmay.jena@gmail.com", candidateName: "Chinmay Jena", eventRef: "WBN-01", district: "Bhadrak", phone: "+91 70080 XXXXX", ticketCode: "TKT-CSAT-0312", attendanceStatus: "Waitlisted", registeredAt: "2026-11-09 11:10", active: true }
    ]
  };
  SuperStore.getEventRegistrationsConfig = function() {
    return _hydrateConfig('cso_event_registrations_config', 'registrations', () => DEFAULT_EVENT_REGISTRATIONS);
  };
  SuperStore.saveEventRegistrationsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.registrations = cfg.items || cfg.registrations || []; cfg.items = cfg.registrations;
    localStorage.setItem('cso_event_registrations_config', JSON.stringify(cfg));
    this.logAudit('EVENT_REGISTRATIONS_UPDATED', 'SCHEDULING', `Event registrations updated (${cfg.items.length} records).`);
    return true;
  };
  SuperStore.resetEventRegistrationsConfig = function() {
    localStorage.setItem('cso_event_registrations_config', JSON.stringify(DEFAULT_EVENT_REGISTRATIONS));
    this.logAudit('EVENT_REGISTRATIONS_RESET', 'SCHEDULING', 'Event registrations reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_EVENT_REGISTRATIONS));
  };
  SuperStore.exportEventRegistrationsManifest = function() {
    const config = this.getEventRegistrationsConfig();
    const filename = "event_registrations_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("EVENT_REGISTRATIONS_EXPORTED", "DATA_EXPORT", `Event registrations manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 14-006: Scheduled Publications ---
  const DEFAULT_SCHEDULED_PUBLICATIONS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalQueuedCount: 8, publishingNext24h: 3, publishedThisMonth: 28 },
    items: [
      { id: "PUB-01", contentTitle: "OPSC OAS Prelims 2026 Model Answer Key & Explanations", contentType: "Mock Solution PDF", targetSection: "Study Library", scheduledPublishTime: "2026-11-15 18:00", autoSocialBroadcast: true, status: "Queued", active: true },
      { id: "PUB-02", contentTitle: "Weekly Odisha Employment Gazette Digest #46", contentType: "Editorial Article", targetSection: "Jobs & Careers", scheduledPublishTime: "2026-11-16 08:00", autoSocialBroadcast: true, status: "Queued", active: true },
      { id: "PUB-03", contentTitle: "Tribal Language Welfare Scheme Application Guide", contentType: "Scheme Guide", targetSection: "Schemes & Benefits", scheduledPublishTime: "2026-11-18 10:30", autoSocialBroadcast: false, status: "Draft Review", active: true }
    ]
  };
  SuperStore.getScheduledPublicationsConfig = function() {
    return _hydrateConfig('cso_scheduled_publications_config', 'publications', () => DEFAULT_SCHEDULED_PUBLICATIONS);
  };
  SuperStore.saveScheduledPublicationsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.publications = cfg.items || cfg.publications || []; cfg.items = cfg.publications;
    localStorage.setItem('cso_scheduled_publications_config', JSON.stringify(cfg));
    this.logAudit('SCHEDULED_PUBLICATIONS_UPDATED', 'SCHEDULING', `Scheduled publications updated (${cfg.items.length} items).`);
    return true;
  };
  SuperStore.resetScheduledPublicationsConfig = function() {
    localStorage.setItem('cso_scheduled_publications_config', JSON.stringify(DEFAULT_SCHEDULED_PUBLICATIONS));
    this.logAudit('SCHEDULED_PUBLICATIONS_RESET', 'SCHEDULING', 'Scheduled publications reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_SCHEDULED_PUBLICATIONS));
  };
  SuperStore.exportScheduledPublicationsManifest = function() {
    const config = this.getScheduledPublicationsConfig();
    const filename = "scheduled_publications_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("SCHEDULED_PUBLICATIONS_EXPORTED", "DATA_EXPORT", `Scheduled publications manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 14-007: Expiry Rules ---
  const DEFAULT_EXPIRY_RULES = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { activeRulesCount: 5, autoArchivedLast30Days: 42, customRetentionDays: 90 },
    items: [
      { id: "EXP-01", ruleName: "Closed Recruitment Notice Archival", targetContentType: "Job Postings", triggerCondition: "Application Closing Date + 7 Days", actionOnExpiry: "Archive & Disable Application Link", notifyEditor: true, status: "Active Rule", active: true },
      { id: "EXP-02", ruleName: "Temporary Alert Banner Auto-Dismissal", targetContentType: "Announcement Banners", triggerCondition: "Expiration Timestamp Reached", actionOnExpiry: "Unpublish Immediately", notifyEditor: false, status: "Active Rule", active: true },
      { id: "EXP-03", ruleName: "Superseded Syllabus Draft Cleanup", targetContentType: "Draft Syllabus PDFs", triggerCondition: "New Gazette Version Published", actionOnExpiry: "Move to Legacy Archive", notifyEditor: true, status: "Active Rule", active: true }
    ]
  };
  SuperStore.getExpiryRulesConfig = function() {
    return _hydrateConfig('cso_expiry_rules_config', 'rules', () => DEFAULT_EXPIRY_RULES);
  };
  SuperStore.saveExpiryRulesConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.rules = cfg.items || cfg.rules || []; cfg.items = cfg.rules;
    localStorage.setItem('cso_expiry_rules_config', JSON.stringify(cfg));
    this.logAudit('EXPIRY_RULES_UPDATED', 'SCHEDULING', `Expiry rules updated (${cfg.items.length} rules).`);
    return true;
  };
  SuperStore.resetExpiryRulesConfig = function() {
    localStorage.setItem('cso_expiry_rules_config', JSON.stringify(DEFAULT_EXPIRY_RULES));
    this.logAudit('EXPIRY_RULES_RESET', 'SCHEDULING', 'Expiry rules reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_EXPIRY_RULES));
  };
  SuperStore.exportExpiryRulesManifest = function() {
    const config = this.getExpiryRulesConfig();
    const filename = "expiry_rules_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("EXPIRY_RULES_EXPORTED", "DATA_EXPORT", `Expiry rules manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 14-008: Reminder Configuration ---
  const DEFAULT_REMINDER_CONFIG = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalRemindersConfigured: 6, dispatched24h: 3410, deliveryChannels: "Email + Push + Telegram" },
    items: [
      { id: "REM-01", reminderTitle: "Application Fee Cutoff Countdown", triggerOffset: "48 Hours Before Deadline", targetAudience: "Draft Incomplete Applicants", dispatchChannel: "Email + Push Notification", templateKey: "EXAM_DEADLINE_URGENT", status: "Active", active: true },
      { id: "REM-02", reminderTitle: "Live Strategy Webinar Starting Alert", triggerOffset: "1 Hour Before Start", targetAudience: "Registered Attendees", dispatchChannel: "SMS / WhatsApp + Email", templateKey: "WEBINAR_STARTING_NOW", status: "Active", active: true },
      { id: "REM-03", reminderTitle: "Mock Test Weekend Exam Reminder", triggerOffset: "Every Saturday 08:00 AM", targetAudience: "Active Mock Passholders", dispatchChannel: "Push Notification", templateKey: "WEEKEND_MOCK_INVITE", status: "Active", active: true }
    ]
  };
  SuperStore.getReminderConfigurationConfig = function() {
    return _hydrateConfig('cso_reminder_configuration_config', 'reminders', () => DEFAULT_REMINDER_CONFIG);
  };
  SuperStore.saveReminderConfigurationConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.reminders = cfg.items || cfg.reminders || []; cfg.items = cfg.reminders;
    localStorage.setItem('cso_reminder_configuration_config', JSON.stringify(cfg));
    this.logAudit('REMINDER_CONFIGURATION_UPDATED', 'SCHEDULING', `Reminder configuration updated (${cfg.items.length} reminders).`);
    return true;
  };
  SuperStore.resetReminderConfigurationConfig = function() {
    localStorage.setItem('cso_reminder_configuration_config', JSON.stringify(DEFAULT_REMINDER_CONFIG));
    this.logAudit('REMINDER_CONFIGURATION_RESET', 'SCHEDULING', 'Reminder configuration reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_REMINDER_CONFIG));
  };
  SuperStore.exportReminderConfigurationManifest = function() {
    const config = this.getReminderConfigurationConfig();
    const filename = "reminder_configuration_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("REMINDER_CONFIGURATION_EXPORTED", "DATA_EXPORT", `Reminder configuration manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 14-009: Scheduled Maintenance ---
  const DEFAULT_SCHEDULED_MAINTENANCE = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { upcomingWindowScheduled: false, nextWindowDate: "None Scheduled", platformState: "Normal Operational" },
    items: [
      { id: "MNT-01", windowTitle: "Cloudflare D1 Database Index Optimization", startDateTime: "2026-11-22 02:00", endDateTime: "2026-11-22 04:00", estimatedDowntimeMinutes: 30, userImpactLevel: "Partial (Read-Only Mode)", countdownBannerEnabled: true, status: "Scheduled", active: true },
      { id: "MNT-02", windowTitle: "Storage Gateway Asset Migration", startDateTime: "2026-10-18 01:00", endDateTime: "2026-10-18 02:30", estimatedDowntimeMinutes: 0, userImpactLevel: "Zero Downtime", countdownBannerEnabled: false, status: "Completed", active: true }
    ]
  };
  SuperStore.getScheduledMaintenanceConfig = function() {
    return _hydrateConfig('cso_scheduled_maintenance_config', 'windows', () => DEFAULT_SCHEDULED_MAINTENANCE);
  };
  SuperStore.saveScheduledMaintenanceConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.windows = cfg.items || cfg.windows || []; cfg.items = cfg.windows;
    localStorage.setItem('cso_scheduled_maintenance_config', JSON.stringify(cfg));
    this.logAudit('SCHEDULED_MAINTENANCE_UPDATED', 'SYSTEM_ADMIN', `Scheduled maintenance updated (${cfg.items.length} windows).`);
    return true;
  };
  SuperStore.resetScheduledMaintenanceConfig = function() {
    localStorage.setItem('cso_scheduled_maintenance_config', JSON.stringify(DEFAULT_SCHEDULED_MAINTENANCE));
    this.logAudit('SCHEDULED_MAINTENANCE_RESET', 'SYSTEM_ADMIN', 'Scheduled maintenance reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_SCHEDULED_MAINTENANCE));
  };
  SuperStore.exportScheduledMaintenanceManifest = function() {
    const config = this.getScheduledMaintenanceConfig();
    const filename = "scheduled_maintenance_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("SCHEDULED_MAINTENANCE_EXPORTED", "DATA_EXPORT", `Scheduled maintenance manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 15-001: Integration Directory ---
  const DEFAULT_INTEGRATION_DIRECTORY = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalConnectors: 14, activeIntegrations: 11, configuredGateways: 8, pendingSetup: 3 },
    items: [
      { id: "INT-01", serviceName: "Supabase PostgreSQL & Auth", category: "Database & Identity", connectionProtocol: "HTTPS REST / WebSocket Realtime", authType: "Service Role JWT", status: "Operational", active: true },
      { id: "INT-02", serviceName: "Cloudflare Pages & Edge Workers", category: "CDN, Edge Compute & Security", connectionProtocol: "Cloudflare v4 API", authType: "Global API Token", status: "Operational", active: true },
      { id: "INT-03", serviceName: "Razorpay Payment Gateway", category: "Financial Rails", connectionProtocol: "REST Webhooks v2", authType: "API Key + Webhook Secret", status: "Operational", active: true },
      { id: "INT-04", serviceName: "Brevo (Sendinblue) Transactional Mail", category: "Email & Notifications", connectionProtocol: "SMTP / REST API v3", authType: "Bearer API Key", status: "Operational", active: true },
      { id: "INT-05", serviceName: "Cloudflare R2 Object Storage", category: "Cloud Storage", connectionProtocol: "S3 Compatible API", authType: "Access Key ID + Secret", status: "Operational", active: true }
    ]
  };
  SuperStore.getIntegrationDirectoryConfig = function() {
    return _hydrateConfig('cso_integration_directory_config', 'integrations', () => DEFAULT_INTEGRATION_DIRECTORY);
  };
  SuperStore.saveIntegrationDirectoryConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.integrations = cfg.items || cfg.integrations || []; cfg.items = cfg.integrations;
    localStorage.setItem('cso_integration_directory_config', JSON.stringify(cfg));
    this.logAudit('INTEGRATION_DIRECTORY_UPDATED', 'INTEGRATIONS', `Integration directory updated (${cfg.items.length} connectors).`);
    return true;
  };
  SuperStore.resetIntegrationDirectoryConfig = function() {
    localStorage.setItem('cso_integration_directory_config', JSON.stringify(DEFAULT_INTEGRATION_DIRECTORY));
    this.logAudit('INTEGRATION_DIRECTORY_RESET', 'INTEGRATIONS', 'Integration directory reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_INTEGRATION_DIRECTORY));
  };
  SuperStore.exportIntegrationDirectoryManifest = function() {
    const config = this.getIntegrationDirectoryConfig();
    const filename = "integration_directory_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("INTEGRATION_DIRECTORY_EXPORTED", "DATA_EXPORT", `Integration directory manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 15-002: Supabase Connection Status ---
  const DEFAULT_SUPABASE_STATUS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    telemetry: { projectRef: "cso-odisha-db-prod", region: "ap-south-1 (Mumbai)", dbVersion: "PostgreSQL 16.2", poolMode: "Transaction (PgBouncer)", activeConnections: 18, maxPoolSize: 60, roundTripLatencyMs: "18ms" },
    items: [
      { id: "SUB-01", subsystem: "PostgreSQL Primary Node", endpoint: "db.csodisha.supabase.co:5432", healthStatus: "Healthy (0 Errors)", lastHeartbeat: "2026-11-10 08:30", latencyMs: 16, active: true },
      { id: "SUB-02", subsystem: "PostgREST Data API", endpoint: "https://cso-odisha.supabase.co/rest/v1/", healthStatus: "Healthy (0 Errors)", lastHeartbeat: "2026-11-10 08:31", latencyMs: 22, active: true },
      { id: "SUB-03", subsystem: "GoTrue Auth Engine", endpoint: "https://cso-odisha.supabase.co/auth/v1/", healthStatus: "Healthy (0 Errors)", lastHeartbeat: "2026-11-10 08:29", latencyMs: 19, active: true },
      { id: "SUB-04", subsystem: "Realtime WebSocket Hub", endpoint: "wss://cso-odisha.supabase.co/realtime/v1/", healthStatus: "Connected", lastHeartbeat: "2026-11-10 08:31", latencyMs: 14, active: true }
    ]
  };
  SuperStore.getSupabaseStatusConfig = function() {
    return _hydrateConfig('cso_supabase_status_config', 'subsystems', () => DEFAULT_SUPABASE_STATUS);
  };
  SuperStore.saveSupabaseStatusConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.subsystems = cfg.items || cfg.subsystems || []; cfg.items = cfg.subsystems;
    localStorage.setItem('cso_supabase_status_config', JSON.stringify(cfg));
    this.logAudit('SUPABASE_STATUS_UPDATED', 'DATABASE', `Supabase connection telemetry updated (${cfg.items.length} subsystems).`);
    return true;
  };
  SuperStore.resetSupabaseStatusConfig = function() {
    localStorage.setItem('cso_supabase_status_config', JSON.stringify(DEFAULT_SUPABASE_STATUS));
    this.logAudit('SUPABASE_STATUS_RESET', 'DATABASE', 'Supabase connection status reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_SUPABASE_STATUS));
  };
  SuperStore.exportSupabaseStatusManifest = function() {
    const config = this.getSupabaseStatusConfig();
    const filename = "supabase_status_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("SUPABASE_STATUS_EXPORTED", "DATA_EXPORT", `Supabase status manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 15-003: Cloudflare Integration ---
  const DEFAULT_CLOUDFLARE_INTEGRATION = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    zoneSummary: { zoneName: "csodisha.com", zoneId: "cso_cf_zone_8829104", sslMode: "Full (Strict)", ddosProtection: "Under Attack Auto-Mitigate", edgeCacheHitRate: "93.4%", wafBlocked24h: 312 },
    items: [
      { id: "CFR-01", featureName: "Cloudflare Pages Deployment Pipeline", resourceRef: "csodisha-site.pages.dev", currentCommit: "9cf8041 (main)", edgeStatus: "Active", autoDeployOnPush: true, active: true },
      { id: "CFR-02", featureName: "Edge Cache Rules & HTML Purge", resourceRef: "Cache Everything (TTL 4h)", currentCommit: "Rule #CF-01", edgeStatus: "Active", autoDeployOnPush: true, active: true },
      { id: "CFR-03", featureName: "Web Application Firewall (WAF) Rulebook", resourceRef: "OWASP ModSecurity Core Set", currentCommit: "Rule #CF-WAF-09", edgeStatus: "Active", autoDeployOnPush: true, active: true },
      { id: "CFR-04", featureName: "DNS SEC & Anycast Routing", resourceRef: "1.1.1.1 Anycast Cluster", currentCommit: "Verified Valid", edgeStatus: "Active", autoDeployOnPush: false, active: true }
    ]
  };
  SuperStore.getCloudflareIntegrationConfig = function() {
    return _hydrateConfig('cso_cloudflare_integration_config', 'rules', () => DEFAULT_CLOUDFLARE_INTEGRATION);
  };
  SuperStore.saveCloudflareIntegrationConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.rules = cfg.items || cfg.rules || []; cfg.items = cfg.rules;
    localStorage.setItem('cso_cloudflare_integration_config', JSON.stringify(cfg));
    this.logAudit('CLOUDFLARE_INTEGRATION_UPDATED', 'INFRASTRUCTURE', `Cloudflare integration updated (${cfg.items.length} features).`);
    return true;
  };
  SuperStore.resetCloudflareIntegrationConfig = function() {
    localStorage.setItem('cso_cloudflare_integration_config', JSON.stringify(DEFAULT_CLOUDFLARE_INTEGRATION));
    this.logAudit('CLOUDFLARE_INTEGRATION_RESET', 'INFRASTRUCTURE', 'Cloudflare integration reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_CLOUDFLARE_INTEGRATION));
  };
  SuperStore.exportCloudflareIntegrationManifest = function() {
    const config = this.getCloudflareIntegrationConfig();
    const filename = "cloudflare_integration_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("CLOUDFLARE_INTEGRATION_EXPORTED", "DATA_EXPORT", `Cloudflare integration manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 15-004: Payment Integrations ---
  const DEFAULT_PAYMENT_INTEGRATIONS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { activeGatewaysCount: 2, defaultRail: "Razorpay Auto-Routing", webhookSuccessRate: "99.8%", settlingCurrency: "INR (₹)" },
    items: [
      { id: "PAY-01", gatewayName: "Razorpay Standard Checkout", environment: "Production Live", merchantId: "rzp_live_CSOdisha982", supportedInstruments: "UPI (GPay/PhonePe), NetBanking, RuPay/Cards", webhookEndpoint: "https://csodisha.com/api/webhooks/razorpay", status: "Active & Processing", active: true },
      { id: "PAY-02", gatewayName: "Cashfree Backup Payment Rail", environment: "Production Standby", merchantId: "cf_live_CSOdisha412", supportedInstruments: "UPI FastRail, IMPS", webhookEndpoint: "https://csodisha.com/api/webhooks/cashfree", status: "Standby Failover", active: true },
      { id: "PAY-03", gatewayName: "Razorpay Sandbox Simulation", environment: "Test Sandbox", merchantId: "rzp_test_Simulate992", supportedInstruments: "Virtual UPI & Test Cards", webhookEndpoint: "https://csodisha.com/api/webhooks/test", status: "Sandbox Active", active: true }
    ]
  };
  SuperStore.getPaymentIntegrationsConfig = function() {
    return _hydrateConfig('cso_payment_integrations_config', 'gateways', () => DEFAULT_PAYMENT_INTEGRATIONS);
  };
  SuperStore.savePaymentIntegrationsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.gateways = cfg.items || cfg.gateways || []; cfg.items = cfg.gateways;
    localStorage.setItem('cso_payment_integrations_config', JSON.stringify(cfg));
    this.logAudit('PAYMENT_INTEGRATIONS_UPDATED', 'FINANCE', `Payment integrations updated (${cfg.items.length} gateways).`);
    return true;
  };
  SuperStore.resetPaymentIntegrationsConfig = function() {
    localStorage.setItem('cso_payment_integrations_config', JSON.stringify(DEFAULT_PAYMENT_INTEGRATIONS));
    this.logAudit('PAYMENT_INTEGRATIONS_RESET', 'FINANCE', 'Payment integrations reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_PAYMENT_INTEGRATIONS));
  };
  SuperStore.exportPaymentIntegrationsManifest = function() {
    const config = this.getPaymentIntegrationsConfig();
    const filename = "payment_integrations_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("PAYMENT_INTEGRATIONS_EXPORTED", "DATA_EXPORT", `Payment integrations manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 15-005: Email Provider ---
  const DEFAULT_EMAIL_PROVIDER = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { primaryProvider: "Brevo SMTP & API", monthlyQuota: 100000, sentThisMonth: 28410, bounceRate: "0.4%", senderIdentity: "alerts@csodisha.com" },
    items: [
      { id: "EML-01", configScope: "Transactional Exam Notices", smtpHost: "smtp-relay.brevo.com", port: 587, security: "TLS", senderAddress: "alerts@csodisha.com", status: "Connected & Verified", active: true },
      { id: "EML-02", configScope: "Aspirant Digest & Gazette Broadcasts", smtpHost: "smtp-relay.brevo.com", port: 587, security: "TLS", senderAddress: "newsletter@csodisha.com", status: "Connected & Verified", active: true },
      { id: "EML-03", configScope: "Support & Grievance Desks", smtpHost: "smtp.gmail.com (Google Workspace)", port: 465, security: "SSL", senderAddress: "support@csodisha.com", status: "Connected & Verified", active: true }
    ]
  };
  SuperStore.getEmailProviderConfig = function() {
    return _hydrateConfig('cso_email_provider_config', 'mailConfigs', () => DEFAULT_EMAIL_PROVIDER);
  };
  SuperStore.saveEmailProviderConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.mailConfigs = cfg.items || cfg.mailConfigs || []; cfg.items = cfg.mailConfigs;
    localStorage.setItem('cso_email_provider_config', JSON.stringify(cfg));
    this.logAudit('EMAIL_PROVIDER_UPDATED', 'NOTIFICATIONS', `Email provider configs updated (${cfg.items.length} scopes).`);
    return true;
  };
  SuperStore.resetEmailProviderConfig = function() {
    localStorage.setItem('cso_email_provider_config', JSON.stringify(DEFAULT_EMAIL_PROVIDER));
    this.logAudit('EMAIL_PROVIDER_RESET', 'NOTIFICATIONS', 'Email provider configs reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_EMAIL_PROVIDER));
  };
  SuperStore.exportEmailProviderManifest = function() {
    const config = this.getEmailProviderConfig();
    const filename = "email_provider_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("EMAIL_PROVIDER_EXPORTED", "DATA_EXPORT", `Email provider manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 15-006: Cloud Storage Integrations ---
  const DEFAULT_CLOUD_STORAGE = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalBuckets: 4, storageUtilizedGB: "148.6 GB", totalFilesCount: 8420, bandwidthEgress24h: "32.4 GB" },
    items: [
      { id: "STR-01", bucketName: "cso-gazette-circulars-prod", provider: "Cloudflare R2", region: "Automatic (Global Fast)", publicAccess: "Public CDN URL", cdnUrlPrefix: "https://media.csodisha.com/gazettes", status: "Connected", active: true },
      { id: "STR-02", bucketName: "cso-pyq-vault-study-docs", provider: "Cloudflare R2", region: "Automatic (Global Fast)", publicAccess: "Public CDN URL", cdnUrlPrefix: "https://media.csodisha.com/library", status: "Connected", active: true },
      { id: "STR-03", bucketName: "cso-admin-backups-snapshots", provider: "AWS S3 Compliant Bucket", region: "ap-south-1", publicAccess: "Strictly Private", cdnUrlPrefix: "s3://cso-admin-backups-prod", status: "Connected", active: true },
      { id: "STR-04", bucketName: "cso-user-verification-docs", provider: "Supabase Private Storage", region: "ap-south-1", publicAccess: "Authenticated Signed URL", cdnUrlPrefix: "supabase://storage/v1/s/users", status: "Connected", active: true }
    ]
  };
  SuperStore.getCloudStorageConfig = function() {
    return _hydrateConfig('cso_cloud_storage_config', 'buckets', () => DEFAULT_CLOUD_STORAGE);
  };
  SuperStore.saveCloudStorageConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.buckets = cfg.items || cfg.buckets || []; cfg.items = cfg.buckets;
    localStorage.setItem('cso_cloud_storage_config', JSON.stringify(cfg));
    this.logAudit('CLOUD_STORAGE_UPDATED', 'STORAGE', `Cloud storage configs updated (${cfg.items.length} buckets).`);
    return true;
  };
  SuperStore.resetCloudStorageConfig = function() {
    localStorage.setItem('cso_cloud_storage_config', JSON.stringify(DEFAULT_CLOUD_STORAGE));
    this.logAudit('CLOUD_STORAGE_RESET', 'STORAGE', 'Cloud storage configs reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_CLOUD_STORAGE));
  };
  SuperStore.exportCloudStorageManifest = function() {
    const config = this.getCloudStorageConfig();
    const filename = "cloud_storage_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("CLOUD_STORAGE_EXPORTED", "DATA_EXPORT", `Cloud storage manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 15-007: Analytics Integrations ---
  const DEFAULT_ANALYTICS_INTEGRATIONS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { activeSinksCount: 3, complianceMode: "DPDP 2023 Cookie-Less Strict", ipAnonymization: true },
    items: [
      { id: "ANL-01", platformName: "Google Analytics 4 (GA4)", trackingId: "G-CSODISHA26", integrationMethod: "Direct Global Tag (gtag.js)", privacyConsentTier: "Explicit Aspirant Consent", dailyEventsCount: 64200, status: "Active Stream", active: true },
      { id: "ANL-02", platformName: "Cloudflare Web Analytics", trackingId: "cso_cf_beacon_9941", integrationMethod: "Edge Script Injection", privacyConsentTier: "Strictly Privacy-First (No Cookies)", dailyEventsCount: 89400, status: "Active Stream", active: true },
      { id: "ANL-03", platformName: "PostHog Product Analytics", trackingId: "phc_csoLiveProductTelemetry", integrationMethod: "Self-Hosted Edge Proxy", privacyConsentTier: "Session Replay Anonymized", dailyEventsCount: 38100, status: "Active Stream", active: true }
    ]
  };
  SuperStore.getAnalyticsIntegrationsConfig = function() {
    return _hydrateConfig('cso_analytics_integrations_config', 'analyticsSinks', () => DEFAULT_ANALYTICS_INTEGRATIONS);
  };
  SuperStore.saveAnalyticsIntegrationsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.analyticsSinks = cfg.items || cfg.analyticsSinks || []; cfg.items = cfg.analyticsSinks;
    localStorage.setItem('cso_analytics_integrations_config', JSON.stringify(cfg));
    this.logAudit('ANALYTICS_INTEGRATIONS_UPDATED', 'ANALYTICS', `Analytics sinks updated (${cfg.items.length} sinks).`);
    return true;
  };
  SuperStore.resetAnalyticsIntegrationsConfig = function() {
    localStorage.setItem('cso_analytics_integrations_config', JSON.stringify(DEFAULT_ANALYTICS_INTEGRATIONS));
    this.logAudit('ANALYTICS_INTEGRATIONS_RESET', 'ANALYTICS', 'Analytics sinks reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_ANALYTICS_INTEGRATIONS));
  };
  SuperStore.exportAnalyticsIntegrationsManifest = function() {
    const config = this.getAnalyticsIntegrationsConfig();
    const filename = "analytics_integrations_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("ANALYTICS_INTEGRATIONS_EXPORTED", "DATA_EXPORT", `Analytics integrations manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 15-008: API Configuration ---
  const DEFAULT_API_CONFIGURATION = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalApiKeysIssued: 6, defaultRateLimit: "60 req/min", corsOrigins: "https://csodisha.com, https://admin.csodisha.com" },
    items: [
      { id: "API-01", keyName: "Mobile PWA Public Read-Only Key", prefix: "cso_pub_live_", rateLimitTier: "120 req/min per IP", scopes: "read:jobs, read:schemes, read:library", issuedDate: "2026-10-01", lastUsed: "2026-11-10 08:35", status: "Active", active: true },
      { id: "API-02", keyName: "Gazette Ingestion Edge Worker Token", prefix: "cso_srv_ingest_", rateLimitTier: "1000 req/min", scopes: "write:gazettes, write:notifications", issuedDate: "2026-09-15", lastUsed: "2026-11-10 07:45", status: "Active", active: true },
      { id: "API-03", keyName: "Automated Backup & DR Service Role", prefix: "cso_adm_root_", rateLimitTier: "Unlimited (Internal IP Only)", scopes: "admin:all, snapshot:export", issuedDate: "2026-09-01", lastUsed: "2026-11-09 23:59", status: "Active", active: true }
    ]
  };
  SuperStore.getApiConfigurationConfig = function() {
    return _hydrateConfig('cso_api_configuration_config', 'apiKeys', () => DEFAULT_API_CONFIGURATION);
  };
  SuperStore.saveApiConfigurationConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.apiKeys = cfg.items || cfg.apiKeys || []; cfg.items = cfg.apiKeys;
    localStorage.setItem('cso_api_configuration_config', JSON.stringify(cfg));
    this.logAudit('API_CONFIGURATION_UPDATED', 'SECURITY', `API configurations updated (${cfg.items.length} keys).`);
    return true;
  };
  SuperStore.resetApiConfigurationConfig = function() {
    localStorage.setItem('cso_api_configuration_config', JSON.stringify(DEFAULT_API_CONFIGURATION));
    this.logAudit('API_CONFIGURATION_RESET', 'SECURITY', 'API configuration reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_API_CONFIGURATION));
  };
  SuperStore.exportApiConfigurationManifest = function() {
    const config = this.getApiConfigurationConfig();
    const filename = "api_configuration_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("API_CONFIGURATION_EXPORTED", "DATA_EXPORT", `API configuration manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 15-009: Webhook Management ---
  const DEFAULT_WEBHOOK_MANAGEMENT = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalWebhooks: 5, successRate24h: "99.85%", retryPolicy: "Exponential Backoff (Max 5)" },
    items: [
      { id: "WHK-01", webhookName: "Razorpay Payment Succeeded", direction: "Inbound", targetUrl: "https://csodisha.com/api/webhooks/razorpay", eventTypes: "payment.captured, order.paid", secretHash: "sha256_rzp_sec_***9a", status: "Listening", active: true },
      { id: "WHK-02", webhookName: "Supabase User Registered Event", direction: "Inbound", targetUrl: "https://csodisha.com/api/webhooks/user-sync", eventTypes: "auth.user.created, auth.user.updated", secretHash: "sha256_sub_sec_***2b", status: "Listening", active: true },
      { id: "WHK-03", webhookName: "Brevo Hard Bounce & Unsubscribe", direction: "Inbound", targetUrl: "https://csodisha.com/api/webhooks/brevo-events", eventTypes: "email.hard_bounce, email.unsubscribed", secretHash: "sha256_brv_sec_***8c", status: "Listening", active: true },
      { id: "WHK-04", webhookName: "Telegram District Bot Gazette Push", direction: "Outbound", targetUrl: "https://api.telegram.org/bot[TOKEN]/sendMessage", eventTypes: "gazette.published, mock.released", secretHash: "Custom Header Auth", status: "Dispatched Live", active: true }
    ]
  };
  SuperStore.getWebhookManagementConfig = function() {
    return _hydrateConfig('cso_webhook_management_config', 'webhooks', () => DEFAULT_WEBHOOK_MANAGEMENT);
  };
  SuperStore.saveWebhookManagementConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.webhooks = cfg.items || cfg.webhooks || []; cfg.items = cfg.webhooks;
    localStorage.setItem('cso_webhook_management_config', JSON.stringify(cfg));
    this.logAudit('WEBHOOK_MANAGEMENT_UPDATED', 'INTEGRATIONS', `Webhook configurations updated (${cfg.items.length} webhooks).`);
    return true;
  };
  SuperStore.resetWebhookManagementConfig = function() {
    localStorage.setItem('cso_webhook_management_config', JSON.stringify(DEFAULT_WEBHOOK_MANAGEMENT));
    this.logAudit('WEBHOOK_MANAGEMENT_RESET', 'INTEGRATIONS', 'Webhook management reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_WEBHOOK_MANAGEMENT));
  };
  SuperStore.exportWebhookManagementManifest = function() {
    const config = this.getWebhookManagementConfig();
    const filename = "webhook_management_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("WEBHOOK_MANAGEMENT_EXPORTED", "DATA_EXPORT", `Webhook management manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 15-010: Integration Logs ---
  const DEFAULT_INTEGRATION_LOGS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalLogsCaptured: 1240, errorIncidents24h: 2, averageLatencyMs: "32ms" },
    items: [
      { id: "LOG-01", timestamp: "2026-11-10 08:35:12", provider: "Razorpay Live", endpoint: "POST /v1/payments/pay_9921/capture", httpStatus: 200, responseTimeMs: 145, traceId: "trc_rzp_9941a8", payloadSnippet: '{"amount":49900,"currency":"INR","status":"captured"}', active: true },
      { id: "LOG-02", timestamp: "2026-11-10 08:34:05", provider: "Brevo SMTP", endpoint: "POST /v3/smtp/email", httpStatus: 201, responseTimeMs: 88, traceId: "trc_brv_8812c4", payloadSnippet: '{"to":"aspirant@gmail.com","templateId":14,"status":"queued"}', active: true },
      { id: "LOG-03", timestamp: "2026-11-10 08:30:40", provider: "Supabase Auth", endpoint: "POST /auth/v1/token?grant_type=refresh", httpStatus: 200, responseTimeMs: 34, traceId: "trc_sub_1109ff", payloadSnippet: '{"user_id":"usr_cso_9812","role":"aspirant"}', active: true },
      { id: "LOG-04", timestamp: "2026-11-10 07:12:15", provider: "Telegram Webhook", endpoint: "POST /sendMessage", httpStatus: 429, responseTimeMs: 310, traceId: "trc_tg_error_04", payloadSnippet: '{"error":"Too Many Requests: retry after 2"}', active: true }
    ]
  };
  SuperStore.getIntegrationLogsConfig = function() {
    return _hydrateConfig('cso_integration_logs_config', 'logs', () => DEFAULT_INTEGRATION_LOGS);
  };
  SuperStore.saveIntegrationLogsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.logs = cfg.items || cfg.logs || []; cfg.items = cfg.logs;
    localStorage.setItem('cso_integration_logs_config', JSON.stringify(cfg));
    this.logAudit('INTEGRATION_LOGS_UPDATED', 'LOGGING', `Integration logs updated (${cfg.items.length} entries).`);
    return true;
  };
  SuperStore.resetIntegrationLogsConfig = function() {
    localStorage.setItem('cso_integration_logs_config', JSON.stringify(DEFAULT_INTEGRATION_LOGS));
    this.logAudit('INTEGRATION_LOGS_RESET', 'LOGGING', 'Integration logs reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_INTEGRATION_LOGS));
  };
  SuperStore.exportIntegrationLogsManifest = function() {
    const config = this.getIntegrationLogsConfig();
    const filename = "integration_logs_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("INTEGRATION_LOGS_EXPORTED", "DATA_EXPORT", `Integration logs manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 15-011: Integration Health ---
  const DEFAULT_INTEGRATION_HEALTH = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { systemSlaAvailability: "99.94%", totalHeartbeatsChecked: 11, criticalAlerts: 0 },
    items: [
      { id: "HLT-01", systemName: "Supabase Primary Database", uptimePercent: "99.98%", checkInterval: "Every 60s", failureThreshold: "3 Retries", lastIncident: "None in 90 days", healthScore: "100/100", active: true },
      { id: "HLT-02", systemName: "Cloudflare Pages & Edge Workers", uptimePercent: "100.0%", checkInterval: "Every 30s", failureThreshold: "2 Retries", lastIncident: "None in 180 days", healthScore: "100/100", active: true },
      { id: "HLT-03", systemName: "Razorpay Checkout Rails", uptimePercent: "99.92%", checkInterval: "Every 120s", failureThreshold: "2 Retries", lastIncident: "Scheduled Gateway Maintenance (Oct 22)", healthScore: "98/100", active: true },
      { id: "HLT-04", systemName: "Brevo Transactional SMTP", uptimePercent: "99.88%", checkInterval: "Every 180s", failureThreshold: "3 Retries", lastIncident: "Minor Queue Delay (Nov 02)", healthScore: "97/100", active: true },
      { id: "HLT-05", systemName: "Cloudflare R2 Storage CDN", uptimePercent: "100.0%", checkInterval: "Every 60s", failureThreshold: "2 Retries", lastIncident: "None in 180 days", healthScore: "100/100", active: true }
    ]
  };
  SuperStore.getIntegrationHealthConfig = function() {
    return _hydrateConfig('cso_integration_health_config', 'monitors', () => DEFAULT_INTEGRATION_HEALTH);
  };
  SuperStore.saveIntegrationHealthConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.monitors = cfg.items || cfg.monitors || []; cfg.items = cfg.monitors;
    localStorage.setItem('cso_integration_health_config', JSON.stringify(cfg));
    this.logAudit('INTEGRATION_HEALTH_UPDATED', 'MONITORING', `Integration health updated (${cfg.items.length} systems).`);
    return true;
  };
  SuperStore.resetIntegrationHealthConfig = function() {
    localStorage.setItem('cso_integration_health_config', JSON.stringify(DEFAULT_INTEGRATION_HEALTH));
    this.logAudit('INTEGRATION_HEALTH_RESET', 'MONITORING', 'Integration health reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_INTEGRATION_HEALTH));
  };
  SuperStore.exportIntegrationHealthManifest = function() {
    const config = this.getIntegrationHealthConfig();
    const filename = "integration_health_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("INTEGRATION_HEALTH_EXPORTED", "DATA_EXPORT", `Integration health manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 16-001: Authentication ---
  const DEFAULT_AUTHENTICATION_CONFIG = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    settings: { minPasswordLength: 12, requireSpecialChar: true, requireNumber: true, requireUppercase: true, maxFailedAttempts: 5, lockoutDurationMinutes: 30, sessionTimeoutMinutes: 120 },
    items: [
      { id: "AUTH-01", policyName: "Master Admin Password Policy", targetRole: "Super Admin / Root", enforcementLevel: "Mandatory 14-char Complex", passwordExpiryDays: 60, status: "Active", active: true },
      { id: "AUTH-02", policyName: "Staff Editorial Auth Policy", targetRole: "Editor / Content Desk", enforcementLevel: "Mandatory 12-char Complex", passwordExpiryDays: 90, status: "Active", active: true },
      { id: "AUTH-03", policyName: "Candidate Portal Password Policy", targetRole: "Aspirant / Student", enforcementLevel: "Standard 8-char Alphanumeric", passwordExpiryDays: 180, status: "Active", active: true },
      { id: "AUTH-04", policyName: "Automated Bot Brute-Force Lockout", targetRole: "Global (All Endpoints)", enforcementLevel: "5 Failed Attempts / 30m IP Jail", passwordExpiryDays: 0, status: "Active", active: true }
    ]
  };
  SuperStore.getAuthenticationConfig = function() {
    return _hydrateConfig('cso_authentication_config', 'policies', () => DEFAULT_AUTHENTICATION_CONFIG);
  };
  SuperStore.saveAuthenticationConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.policies = cfg.items || cfg.policies || []; cfg.items = cfg.policies;
    localStorage.setItem('cso_authentication_config', JSON.stringify(cfg));
    this.logAudit('AUTHENTICATION_CONFIG_UPDATED', 'SECURITY', `Authentication policies updated (${cfg.items.length} policies).`);
    return true;
  };
  SuperStore.resetAuthenticationConfig = function() {
    localStorage.setItem('cso_authentication_config', JSON.stringify(DEFAULT_AUTHENTICATION_CONFIG));
    this.logAudit('AUTHENTICATION_CONFIG_RESET', 'SECURITY', 'Authentication configuration reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_AUTHENTICATION_CONFIG));
  };
  SuperStore.exportAuthenticationManifest = function() {
    const config = this.getAuthenticationConfig();
    const filename = "authentication_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("AUTHENTICATION_EXPORTED", "DATA_EXPORT", `Authentication manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 16-002: Two-Factor Authentication ---
  const DEFAULT_TWO_FACTOR_CONFIG = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { total2FAEnrolled: 18, adminEnforcementRate: "100%", primaryMethod: "TOTP (Google/Microsoft Authenticator)", backupCodesGenerated: 180 },
    items: [
      { id: "2FA-01", adminUser: "Root Super Admin", email: "admin@csodisha.com", role: "Super Admin", method: "TOTP Authenticator", backupCodesRemaining: 8, enforcedMandatory: true, enrolledDate: "2026-08-10", status: "Active", active: true },
      { id: "2FA-02", adminUser: "Debabrata Nayak", email: "debabrata.n@csodisha.com", role: "Lead Editor", method: "TOTP Authenticator", backupCodesRemaining: 10, enforcedMandatory: true, enrolledDate: "2026-09-01", status: "Active", active: true },
      { id: "2FA-03", adminUser: "Subhashree Mohanty", email: "subhashree.m@csodisha.com", role: "Community Manager", method: "TOTP + SMS OTP", backupCodesRemaining: 6, enforcedMandatory: true, enrolledDate: "2026-09-15", status: "Active", active: true },
      { id: "2FA-04", adminUser: "Finance Auditor Desk", email: "finance@csodisha.com", role: "Finance Manager", method: "Hardware Security Key (FIDO2)", backupCodesRemaining: 10, enforcedMandatory: true, enrolledDate: "2026-10-01", status: "Active", active: true }
    ]
  };
  SuperStore.getTwoFactorConfig = function() {
    return _hydrateConfig('cso_two_factor_config', 'accounts', () => DEFAULT_TWO_FACTOR_CONFIG);
  };
  SuperStore.saveTwoFactorConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.accounts = cfg.items || cfg.accounts || []; cfg.items = cfg.accounts;
    localStorage.setItem('cso_two_factor_config', JSON.stringify(cfg));
    this.logAudit('TWO_FACTOR_CONFIG_UPDATED', 'SECURITY', `Two-factor authentication accounts updated (${cfg.items.length} accounts).`);
    return true;
  };
  SuperStore.resetTwoFactorConfig = function() {
    localStorage.setItem('cso_two_factor_config', JSON.stringify(DEFAULT_TWO_FACTOR_CONFIG));
    this.logAudit('TWO_FACTOR_CONFIG_RESET', 'SECURITY', 'Two-factor configuration reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_TWO_FACTOR_CONFIG));
  };
  SuperStore.exportTwoFactorManifest = function() {
    const config = this.getTwoFactorConfig();
    const filename = "two_factor_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("TWO_FACTOR_EXPORTED", "DATA_EXPORT", `Two-factor manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 16-003: Admin Sessions ---
  const DEFAULT_ADMIN_SESSIONS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { activeSessionsCount: 4, idleRevocationThreshold: "30 Minutes", concurrentLoginsAllowed: 2 },
    items: [
      { id: "SES-01", userEmail: "admin@csodisha.com", role: "Super Admin", ipAddress: "103.14.77.21 (Bhubaneswar)", device: "Chrome 131 / macOS Sonoma", loginTime: "2026-11-10 08:05", lastActiveTime: "2026-11-10 09:00", sessionState: "Current Active", active: true },
      { id: "SES-02", userEmail: "debabrata.n@csodisha.com", role: "Lead Editor", ipAddress: "115.240.112.44 (Cuttack)", device: "Firefox 132 / Windows 11", loginTime: "2026-11-10 07:30", lastActiveTime: "2026-11-10 08:45", sessionState: "Active", active: true },
      { id: "SES-03", userEmail: "subhashree.m@csodisha.com", role: "Community Manager", ipAddress: "157.34.89.12 (Balasore)", device: "Safari / iOS 18", loginTime: "2026-11-10 08:40", lastActiveTime: "2026-11-10 08:58", sessionState: "Active", active: true },
      { id: "SES-04", userEmail: "backup.operator@csodisha.com", role: "Backup Operator", ipAddress: "49.36.120.89 (Rourkela)", device: "Edge 130 / Ubuntu Linux", loginTime: "2026-11-09 22:15", lastActiveTime: "2026-11-09 23:30", sessionState: "Expired / Idle", active: true }
    ]
  };
  SuperStore.getAdminSessionsConfig = function() {
    return _hydrateConfig('cso_admin_sessions_config', 'sessions', () => DEFAULT_ADMIN_SESSIONS);
  };
  SuperStore.saveAdminSessionsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.sessions = cfg.items || cfg.sessions || []; cfg.items = cfg.sessions;
    localStorage.setItem('cso_admin_sessions_config', JSON.stringify(cfg));
    this.logAudit('ADMIN_SESSIONS_UPDATED', 'SECURITY', `Admin sessions updated (${cfg.items.length} sessions).`);
    return true;
  };
  SuperStore.resetAdminSessionsConfig = function() {
    localStorage.setItem('cso_admin_sessions_config', JSON.stringify(DEFAULT_ADMIN_SESSIONS));
    this.logAudit('ADMIN_SESSIONS_RESET', 'SECURITY', 'Admin sessions reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_ADMIN_SESSIONS));
  };
  SuperStore.exportAdminSessionsManifest = function() {
    const config = this.getAdminSessionsConfig();
    const filename = "admin_sessions_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("ADMIN_SESSIONS_EXPORTED", "DATA_EXPORT", `Admin sessions manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 16-004: Roles & Access Policies ---
  const DEFAULT_ROLES_ACCESS_POLICIES = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalRolesCount: 5, totalPermissionsDefined: 48, defaultAspirantRole: "Candidate Read-Only" },
    items: [
      { id: "ROL-01", roleName: "Super Admin (Root)", scopeLevel: "Platform-Wide", userCount: 2, permissionsSummary: "Full Root CRUD across all 241 modules + Snapshot restore", isSystemReserved: true, status: "Active", active: true },
      { id: "ROL-02", roleName: "Editorial & Gazette Desk Lead", scopeLevel: "Content & Exams", userCount: 4, permissionsSummary: "Read/Write in Folders 02-06, 10, 13, 14; Read-Only elsewhere", isSystemReserved: false, status: "Active", active: true },
      { id: "ROL-03", roleName: "Finance & Sponsor Auditor", scopeLevel: "Financial Vault", userCount: 2, permissionsSummary: "Read/Write in Folder 08, 12-010; No access to student PII", isSystemReserved: false, status: "Active", active: true },
      { id: "ROL-04", roleName: "District Community Moderator", scopeLevel: "Community Forums", userCount: 8, permissionsSummary: "Moderate discussions, mute bad actors, handle spam flags in Folders 09-10", isSystemReserved: false, status: "Active", active: true },
      { id: "ROL-05", roleName: "Registered Aspirant (Verified)", scopeLevel: "Public Portal", userCount: 14820, permissionsSummary: "Profile edit, attempt mock tests, comment on public forums, bookmark PYQs", isSystemReserved: true, status: "Active", active: true }
    ]
  };
  SuperStore.getRolesAccessPoliciesConfig = function() {
    return _hydrateConfig('cso_roles_access_policies_config', 'roles', () => DEFAULT_ROLES_ACCESS_POLICIES);
  };
  SuperStore.saveRolesAccessPoliciesConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.roles = cfg.items || cfg.roles || []; cfg.items = cfg.roles;
    localStorage.setItem('cso_roles_access_policies_config', JSON.stringify(cfg));
    this.logAudit('ROLES_ACCESS_POLICIES_UPDATED', 'RBAC', `Roles & access policies updated (${cfg.items.length} roles).`);
    return true;
  };
  SuperStore.resetRolesAccessPoliciesConfig = function() {
    localStorage.setItem('cso_roles_access_policies_config', JSON.stringify(DEFAULT_ROLES_ACCESS_POLICIES));
    this.logAudit('ROLES_ACCESS_POLICIES_RESET', 'RBAC', 'Roles & access policies reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_ROLES_ACCESS_POLICIES));
  };
  SuperStore.exportRolesAccessPoliciesManifest = function() {
    const config = this.getRolesAccessPoliciesConfig();
    const filename = "roles_access_policies_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("ROLES_ACCESS_POLICIES_EXPORTED", "DATA_EXPORT", `Roles access policies manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 16-005: Login History ---
  const DEFAULT_LOGIN_HISTORY = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalLoginsLogged24h: 312, successfulLogins: 301, failedAttempts: 11, flaggedGeolocations: 1 },
    items: [
      { id: "LOG-01", timestamp: "2026-11-10 08:05:22", email: "admin@csodisha.com", ipAddress: "103.14.77.21", location: "Bhubaneswar, Odisha", result: "Success", authMethod: "Password + TOTP", threatScore: "0 (Low)", active: true },
      { id: "LOG-02", timestamp: "2026-11-10 07:44:10", email: "root@csodisha.com", ipAddress: "185.220.101.4 (Tor Exit)", location: "Frankfurt, Germany", result: "Blocked (WAF Rule)", authMethod: "Brute Force Password Attempt", threatScore: "95 (Critical)", active: true },
      { id: "LOG-03", timestamp: "2026-11-10 07:30:15", email: "debabrata.n@csodisha.com", ipAddress: "115.240.112.44", location: "Cuttack, Odisha", result: "Success", authMethod: "Password + TOTP", threatScore: "0 (Low)", active: true },
      { id: "LOG-04", timestamp: "2026-11-10 06:12:40", email: "unknown_aspirant@gmail.com", ipAddress: "49.36.14.12", location: "Balasore, Odisha", result: "Failed (Wrong Password)", authMethod: "Candidate Auth", threatScore: "15 (Low)", active: true }
    ]
  };
  SuperStore.getLoginHistoryConfig = function() {
    return _hydrateConfig('cso_login_history_config', 'history', () => DEFAULT_LOGIN_HISTORY);
  };
  SuperStore.saveLoginHistoryConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.history = cfg.items || cfg.history || []; cfg.items = cfg.history;
    localStorage.setItem('cso_login_history_config', JSON.stringify(cfg));
    this.logAudit('LOGIN_HISTORY_UPDATED', 'SECURITY', `Login history updated (${cfg.items.length} records).`);
    return true;
  };
  SuperStore.resetLoginHistoryConfig = function() {
    localStorage.setItem('cso_login_history_config', JSON.stringify(DEFAULT_LOGIN_HISTORY));
    this.logAudit('LOGIN_HISTORY_RESET', 'SECURITY', 'Login history reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_LOGIN_HISTORY));
  };
  SuperStore.exportLoginHistoryManifest = function() {
    const config = this.getLoginHistoryConfig();
    const filename = "login_history_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("LOGIN_HISTORY_EXPORTED", "DATA_EXPORT", `Login history manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 16-006: Security Alerts ---
  const DEFAULT_SECURITY_ALERTS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { openAlertsCount: 2, criticalAlerts: 0, resolvedThisWeek: 14, automatedMitigationRate: "92%" },
    items: [
      { id: "ALT-01", alertTitle: "Suspicious Multi-IP Login Attempt on Admin Portal", severity: "Medium", category: "Credential Abuse", detectedAt: "2026-11-10 07:45", sourceIp: "185.220.101.4", automatedActionTaken: "IP Blocked at Cloudflare Edge (24h)", status: "Mitigated", active: true },
      { id: "ALT-02", alertTitle: "High Rate of Mock Test Scoring Requests from Single Token", severity: "Low", category: "API Rate Abuse", detectedAt: "2026-11-10 05:20", sourceIp: "49.36.12.88", automatedActionTaken: "Token Throttled to 10 req/min", status: "Under Observation", active: true },
      { id: "ALT-03", alertTitle: "Unusual Bulk Document Download Pattern Detected", severity: "Low", category: "Scraping / Crawling", detectedAt: "2026-11-09 23:10", sourceIp: "103.21.244.0/24", automatedActionTaken: "Served Cloudflare Turnstile Challenge", status: "Resolved", active: true }
    ]
  };
  SuperStore.getSecurityAlertsConfig = function() {
    return _hydrateConfig('cso_security_alerts_config', 'alerts', () => DEFAULT_SECURITY_ALERTS);
  };
  SuperStore.saveSecurityAlertsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.alerts = cfg.items || cfg.alerts || []; cfg.items = cfg.alerts;
    localStorage.setItem('cso_security_alerts_config', JSON.stringify(cfg));
    this.logAudit('SECURITY_ALERTS_UPDATED', 'SECURITY', `Security alerts updated (${cfg.items.length} alerts).`);
    return true;
  };
  SuperStore.resetSecurityAlertsConfig = function() {
    localStorage.setItem('cso_security_alerts_config', JSON.stringify(DEFAULT_SECURITY_ALERTS));
    this.logAudit('SECURITY_ALERTS_RESET', 'SECURITY', 'Security alerts reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_SECURITY_ALERTS));
  };
  SuperStore.exportSecurityAlertsManifest = function() {
    const config = this.getSecurityAlertsConfig();
    const filename = "security_alerts_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("SECURITY_ALERTS_EXPORTED", "DATA_EXPORT", `Security alerts manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 16-007: Rate Limits ---
  const DEFAULT_RATE_LIMITS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalProtectedEndpoints: 6, globalAlgorithm: "Token Bucket with Cloudflare Edge Guard", requestsThrottled24h: 84 },
    items: [
      { id: "RTL-01", endpointPath: "/api/auth/login", method: "POST", limitWindow: "1 Minute", maxRequests: 5, actionOnExceeded: "429 Too Many Requests + 15m Cooldown", active: true },
      { id: "RTL-02", endpointPath: "/api/search/*", method: "GET", limitWindow: "1 Minute", maxRequests: 60, actionOnExceeded: "Temporary 429 Throttle", active: true },
      { id: "RTL-03", endpointPath: "/api/library/download/*", method: "GET", limitWindow: "1 Hour", maxRequests: 30, actionOnExceeded: "Require Turnstile Captcha", active: true },
      { id: "RTL-04", endpointPath: "/api/mock/submit", method: "POST", limitWindow: "1 Minute", maxRequests: 3, actionOnExceeded: "Reject Duplicate Submissions", active: true }
    ]
  };
  SuperStore.getRateLimitsConfig = function() {
    return _hydrateConfig('cso_rate_limits_config', 'limits', () => DEFAULT_RATE_LIMITS);
  };
  SuperStore.saveRateLimitsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.limits = cfg.items || cfg.limits || []; cfg.items = cfg.limits;
    localStorage.setItem('cso_rate_limits_config', JSON.stringify(cfg));
    this.logAudit('RATE_LIMITS_UPDATED', 'SECURITY', `Rate limits updated (${cfg.items.length} rules).`);
    return true;
  };
  SuperStore.resetRateLimitsConfig = function() {
    localStorage.setItem('cso_rate_limits_config', JSON.stringify(DEFAULT_RATE_LIMITS));
    this.logAudit('RATE_LIMITS_RESET', 'SECURITY', 'Rate limits reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_RATE_LIMITS));
  };
  SuperStore.exportRateLimitsManifest = function() {
    const config = this.getRateLimitsConfig();
    const filename = "rate_limits_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("RATE_LIMITS_EXPORTED", "DATA_EXPORT", `Rate limits manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 16-008: Upload Security ---
  const DEFAULT_UPLOAD_SECURITY = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    settings: { scanWithClamAV: true, stripExifData: true, enforceMagicBytes: true, quarantineUnknownMime: true, maxFileSizeMB: 15 },
    items: [
      { id: "UPL-01", fileCategory: "Official Gazette & Circular PDFs", allowedExtensions: ".pdf", maxSizeBytes: "15 MB", mimeTypeCheck: "application/pdf (Magic: %PDF-)", autoSanitize: true, status: "Strict Enforced", active: true },
      { id: "UPL-02", fileCategory: "Aspirant Profile Photographs", allowedExtensions: ".jpg, .jpeg, .png, .webp", maxSizeBytes: "2 MB", mimeTypeCheck: "image/jpeg, image/png, image/webp", autoSanitize: true, status: "Strict Enforced", active: true },
      { id: "UPL-03", fileCategory: "Study Notes & Model Solutions", allowedExtensions: ".pdf, .epub", maxSizeBytes: "25 MB", mimeTypeCheck: "application/pdf, application/epub+zip", autoSanitize: true, status: "Strict Enforced", active: true },
      { id: "UPL-04", fileCategory: "Executable & Script Blacklist", allowedExtensions: ".exe, .sh, .bat, .js, .php, .py", maxSizeBytes: "0 MB", mimeTypeCheck: "All Executables Blocked", autoSanitize: false, status: "Hard Blocked", active: true }
    ]
  };
  SuperStore.getUploadSecurityConfig = function() {
    return _hydrateConfig('cso_upload_security_config', 'rules', () => DEFAULT_UPLOAD_SECURITY);
  };
  SuperStore.saveUploadSecurityConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.rules = cfg.items || cfg.rules || []; cfg.items = cfg.rules;
    localStorage.setItem('cso_upload_security_config', JSON.stringify(cfg));
    this.logAudit('UPLOAD_SECURITY_UPDATED', 'SECURITY', `Upload security rules updated (${cfg.items.length} rules).`);
    return true;
  };
  SuperStore.resetUploadSecurityConfig = function() {
    localStorage.setItem('cso_upload_security_config', JSON.stringify(DEFAULT_UPLOAD_SECURITY));
    this.logAudit('UPLOAD_SECURITY_RESET', 'SECURITY', 'Upload security reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_UPLOAD_SECURITY));
  };
  SuperStore.exportUploadSecurityManifest = function() {
    const config = this.getUploadSecurityConfig();
    const filename = "upload_security_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("UPLOAD_SECURITY_EXPORTED", "DATA_EXPORT", `Upload security manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 16-009: Privacy & Consent ---
  const DEFAULT_PRIVACY_CONSENT = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { dpdpComplianceStatus: "Enforced (DPDP Act 2023)", totalConsentRecords: 14820, optInRate: "98.4%", dpoContact: "privacy@csodisha.com" },
    items: [
      { id: "CST-01", purposeCode: "EXAM_NOTIFICATION_ALERTS", purposeTitle: "Exam & Gazette Notification Alerts", legalBasis: "Explicit Aspirant Consent", consentType: "Granular Opt-In", retentionMonths: 24, status: "Active", active: true },
      { id: "CST-02", purposeCode: "MOCK_RANK_BENCHMARKING", purposeTitle: "Statewide Mock Test Leaderboards", legalBasis: "Explicit Aspirant Consent", consentType: "Granular Opt-In", retentionMonths: 12, status: "Active", active: true },
      { id: "CST-03", purposeCode: "DISTRICT_STUDY_FORUM", purposeTitle: "District Community Group Participation", legalBasis: "Community Terms of Use", consentType: "Mandatory for Posting", retentionMonths: 36, status: "Active", active: true },
      { id: "CST-04", purposeCode: "TELEMETRY_ANALYTICS", purposeTitle: "Platform Performance & Crash Analytics", legalBasis: "Legitimate Interest (Anonymized)", consentType: "Cookie-less / Opt-Out Available", retentionMonths: 6, status: "Active", active: true }
    ]
  };
  SuperStore.getPrivacyConsentConfig = function() {
    return _hydrateConfig('cso_privacy_consent_config', 'purposes', () => DEFAULT_PRIVACY_CONSENT);
  };
  SuperStore.savePrivacyConsentConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.purposes = cfg.items || cfg.purposes || []; cfg.items = cfg.purposes;
    localStorage.setItem('cso_privacy_consent_config', JSON.stringify(cfg));
    this.logAudit('PRIVACY_CONSENT_UPDATED', 'PRIVACY', `Privacy consent purposes updated (${cfg.items.length} purposes).`);
    return true;
  };
  SuperStore.resetPrivacyConsentConfig = function() {
    localStorage.setItem('cso_privacy_consent_config', JSON.stringify(DEFAULT_PRIVACY_CONSENT));
    this.logAudit('PRIVACY_CONSENT_RESET', 'PRIVACY', 'Privacy consent reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_PRIVACY_CONSENT));
  };
  SuperStore.exportPrivacyConsentManifest = function() {
    const config = this.getPrivacyConsentConfig();
    const filename = "privacy_consent_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("PRIVACY_CONSENT_EXPORTED", "DATA_EXPORT", `Privacy consent manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 16-010: Data Retention ---
  const DEFAULT_DATA_RETENTION = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalPolicies: 4, automatedPurgeActive: true, nextScheduledPurge: "2026-11-15 02:00" },
    items: [
      { id: "RET-01", dataCategory: "Financial Transactions & Invoices", statutoryRequirement: "Companies Act & GST Rules (7 Years)", retentionPeriodMonths: 84, purgeAction: "Cryptographic Archive", status: "Active Policy", active: true },
      { id: "RET-02", dataCategory: "Inactive Aspirant Profiles (>3 Years)", statutoryRequirement: "DPDP Purpose Limitation (3 Years)", retentionPeriodMonths: 36, purgeAction: "Soft Delete + Anonymize PII", status: "Active Policy", active: true },
      { id: "RET-03", dataCategory: "Raw Access & Audit Logs", statutoryRequirement: "CERT-In Cyber Guidelines (180 Days)", retentionPeriodMonths: 6, purgeAction: "Cold Storage Archive", status: "Active Policy", active: true },
      { id: "RET-04", dataCategory: "Temporary Session Tokens & Captchas", statutoryRequirement: "Security Best Practice", retentionPeriodMonths: 1, purgeAction: "Hard Permanent Purge", status: "Active Policy", active: true }
    ]
  };
  SuperStore.getDataRetentionConfig = function() {
    return _hydrateConfig('cso_data_retention_config', 'retentionPolicies', () => DEFAULT_DATA_RETENTION);
  };
  SuperStore.saveDataRetentionConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.retentionPolicies = cfg.items || cfg.retentionPolicies || []; cfg.items = cfg.retentionPolicies;
    localStorage.setItem('cso_data_retention_config', JSON.stringify(cfg));
    this.logAudit('DATA_RETENTION_UPDATED', 'PRIVACY', `Data retention policies updated (${cfg.items.length} policies).`);
    return true;
  };
  SuperStore.resetDataRetentionConfig = function() {
    localStorage.setItem('cso_data_retention_config', JSON.stringify(DEFAULT_DATA_RETENTION));
    this.logAudit('DATA_RETENTION_RESET', 'PRIVACY', 'Data retention reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_DATA_RETENTION));
  };
  SuperStore.exportDataRetentionManifest = function() {
    const config = this.getDataRetentionConfig();
    const filename = "data_retention_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("DATA_RETENTION_EXPORTED", "DATA_EXPORT", `Data retention manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 16-011: Account Deletion Requests ---
  const DEFAULT_ACCOUNT_DELETION = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { pendingRequests: 2, completedLast30Days: 14, gracePeriodDays: 30 },
    items: [
      { id: "DEL-01", requestDate: "2026-11-02", candidateEmail: "chinmay.jena@gmail.com", district: "Bhadrak", reason: "Cleared OPSC OAS 2025; Leaving Examination Prep", gracePeriodRemainingDays: 22, verificationStatus: "Identity Verified (OTP)", deletionStage: "In Grace Period", active: true },
      { id: "DEL-02", requestDate: "2026-11-06", candidateEmail: "alok.mohapatra@yahoo.com", district: "Khordha", reason: "Account Consolidation", gracePeriodRemainingDays: 26, verificationStatus: "Identity Verified (OTP)", deletionStage: "In Grace Period", active: true },
      { id: "DEL-03", requestDate: "2026-10-08", candidateEmail: "sangeeta.rout@outlook.com", district: "Cuttack", reason: "User Preference", gracePeriodRemainingDays: 0, verificationStatus: "Fully Verified", deletionStage: "Completed & Anonymized", active: true }
    ]
  };
  SuperStore.getAccountDeletionConfig = function() {
    return _hydrateConfig('cso_account_deletion_config', 'deletionRequests', () => DEFAULT_ACCOUNT_DELETION);
  };
  SuperStore.saveAccountDeletionConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.deletionRequests = cfg.items || cfg.deletionRequests || []; cfg.items = cfg.deletionRequests;
    localStorage.setItem('cso_account_deletion_config', JSON.stringify(cfg));
    this.logAudit('ACCOUNT_DELETION_UPDATED', 'PRIVACY', `Account deletion requests updated (${cfg.items.length} requests).`);
    return true;
  };
  SuperStore.resetAccountDeletionConfig = function() {
    localStorage.setItem('cso_account_deletion_config', JSON.stringify(DEFAULT_ACCOUNT_DELETION));
    this.logAudit('ACCOUNT_DELETION_RESET', 'PRIVACY', 'Account deletion requests reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_ACCOUNT_DELETION));
  };
  SuperStore.exportAccountDeletionManifest = function() {
    const config = this.getAccountDeletionConfig();
    const filename = "account_deletion_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("ACCOUNT_DELETION_EXPORTED", "DATA_EXPORT", `Account deletion manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 16-012: Security Audit Logs ---
  const DEFAULT_SECURITY_AUDIT_LOGS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalAuditEntries: 1840, tamperEvidentHashChain: "Verified Valid (SHA-256)", lastIntegrityCheck: "2026-11-10 08:00" },
    items: [
      { id: "AUD-01", timestamp: "2026-11-10 08:35:10", actor: "Super Admin (Root)", eventType: "AUTH_POLICY_UPDATE", targetEntity: "cso_authentication_config", ipAddress: "103.14.77.21", hashSignature: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", active: true },
      { id: "AUD-02", timestamp: "2026-11-10 07:44:12", actor: "Edge WAF System", eventType: "IP_BLOCKED_BRUTEFORCE", targetEntity: "185.220.101.4", ipAddress: "Edge Cloudflare Proxy", hashSignature: "872983acbe1441a778b4562145e69e7102d918341a99bf8812c4091aefbc2041", active: true },
      { id: "AUD-03", timestamp: "2026-11-09 21:10:05", actor: "Lead Editor (Debabrata)", eventType: "PUBLISH_GAZETTE_CIRCULAR", targetEntity: "CIRCULAR_OPSC_OAS_2026", ipAddress: "115.240.112.44", hashSignature: "9a21b8f102c44812a4501982bfe881c120491823abce8812041289fe12041289", active: true }
    ]
  };
  SuperStore.getSecurityAuditLogsConfig = function() {
    return _hydrateConfig('cso_security_audit_logs_config', 'auditEntries', () => DEFAULT_SECURITY_AUDIT_LOGS);
  };
  SuperStore.saveSecurityAuditLogsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.auditEntries = cfg.items || cfg.auditEntries || []; cfg.items = cfg.auditEntries;
    localStorage.setItem('cso_security_audit_logs_config', JSON.stringify(cfg));
    this.logAudit('SECURITY_AUDIT_LOGS_UPDATED', 'AUDIT', `Security audit logs updated (${cfg.items.length} entries).`);
    return true;
  };
  SuperStore.resetSecurityAuditLogsConfig = function() {
    localStorage.setItem('cso_security_audit_logs_config', JSON.stringify(DEFAULT_SECURITY_AUDIT_LOGS));
    this.logAudit('SECURITY_AUDIT_LOGS_RESET', 'AUDIT', 'Security audit logs reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_SECURITY_AUDIT_LOGS));
  };
  SuperStore.exportSecurityAuditLogsManifest = function() {
    const config = this.getSecurityAuditLogsConfig();
    const filename = "security_audit_logs_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("SECURITY_AUDIT_LOGS_EXPORTED", "DATA_EXPORT", `Security audit logs manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 16-013: Incident Response ---
  const DEFAULT_INCIDENT_RESPONSE = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { activeIncidents: 0, certInSlaHours: 6, lastDrillDate: "2026-10-15" },
    items: [
      { id: "INC-01", incidentTitle: "Simulated DDoS Traffic Spike on Search Endpoints", severity: "P2 - Moderate", category: "Edge Availability Drill", leadResponder: "DevOps & Cloudflare Lead", status: "Resolved (Drill Completed)", resolutionSummary: "Edge rate limiting activated; zero candidate impact observed.", active: true },
      { id: "INC-02", incidentTitle: "Automated Credential Stuffing Attempt on Login API", severity: "P3 - Minor", category: "Auth Perimeter", leadResponder: "Security Auditor", status: "Resolved", resolutionSummary: "Brute-force lockout and IP jail engaged; all attacker IPs blocked.", active: true }
    ]
  };
  SuperStore.getIncidentResponseConfig = function() {
    return _hydrateConfig('cso_incident_response_config', 'incidents', () => DEFAULT_INCIDENT_RESPONSE);
  };
  SuperStore.saveIncidentResponseConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.incidents = cfg.items || cfg.incidents || []; cfg.items = cfg.incidents;
    localStorage.setItem('cso_incident_response_config', JSON.stringify(cfg));
    this.logAudit('INCIDENT_RESPONSE_UPDATED', 'SECURITY', `Incident response logs updated (${cfg.items.length} incidents).`);
    return true;
  };
  SuperStore.resetIncidentResponseConfig = function() {
    localStorage.setItem('cso_incident_response_config', JSON.stringify(DEFAULT_INCIDENT_RESPONSE));
    this.logAudit('INCIDENT_RESPONSE_RESET', 'SECURITY', 'Incident response reset to default.');
    return JSON.parse(JSON.stringify(DEFAULT_INCIDENT_RESPONSE));
  };
  SuperStore.exportIncidentResponseManifest = function() {
    const config = this.getIncidentResponseConfig();
    const filename = "incident_response_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("INCIDENT_RESPONSE_EXPORTED", "DATA_EXPORT", `Incident response manifest exported (${filename}).`);
    return filename;
  };


  // =========================================================================
  // FOLDER 17: Operations, Backups & Recovery — Batch 1 (17-001 to 17-005)
  // =========================================================================

  // --- MODULE 17-001: System Health ---
  const DEFAULT_SYSTEM_HEALTH = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { overallStatus: "Operational", cpuLoadAverage: "14.2%", memoryUsage: "38.6%", activeEdgeNodes: 310, healthScore: "99/100" },
    items: [
      { id: "SYS-01", subsystemName: "Cloudflare Edge Compute (Pages & Workers)", status: "Operational", loadMetric: "12ms TTFB", incident24h: 0, lastCheck: "2026-11-10 09:15", active: true },
      { id: "SYS-02", subsystemName: "Supabase Mumbai PostgreSQL Primary Node", status: "Operational", loadMetric: "18% CPU / 42% RAM", incident24h: 0, lastCheck: "2026-11-10 09:14", active: true },
      { id: "SYS-03", subsystemName: "Static Asset CDN & Cloudflare R2 Gateway", status: "Operational", loadMetric: "94.2% Cache Hit Rate", incident24h: 0, lastCheck: "2026-11-10 09:15", active: true },
      { id: "SYS-04", subsystemName: "Transaction Mail Relay (Brevo SMTP)", status: "Operational", loadMetric: "0.2s Avg Queue Dispatch", incident24h: 0, lastCheck: "2026-11-10 09:12", active: true }
    ]
  };
  SuperStore.getSystemHealthConfig = function() {
    return _hydrateConfig('cso_system_health_config', 'healthNodes', () => DEFAULT_SYSTEM_HEALTH);
  };
  SuperStore.saveSystemHealthConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.healthNodes = cfg.items || cfg.healthNodes || []; cfg.items = cfg.healthNodes;
    localStorage.setItem('cso_system_health_config', JSON.stringify(cfg));
    this.logAudit('SYSTEM_HEALTH_UPDATED', 'OPERATIONS', `System health nodes updated (${cfg.items.length} nodes).`);
    return true;
  };
  SuperStore.resetSystemHealthConfig = function() {
    localStorage.setItem('cso_system_health_config', JSON.stringify(DEFAULT_SYSTEM_HEALTH));
    this.logAudit('SYSTEM_HEALTH_RESET', 'OPERATIONS', 'System health config reset to factory defaults.');
    return JSON.parse(JSON.stringify(DEFAULT_SYSTEM_HEALTH));
  };
  SuperStore.exportSystemHealthManifest = function() {
    const config = this.getSystemHealthConfig();
    const filename = "system_health_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("SYSTEM_HEALTH_EXPORTED", "DATA_EXPORT", `System health manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 17-002: Website Availability ---
  const DEFAULT_WEBSITE_AVAILABILITY = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { current30DayUptime: "99.98%", totalOutageMinutes30d: 8, globalCheckInterval: "60 Seconds", sslDaysRemaining: 284 },
    items: [
      { id: "AVL-01", probeLocation: "Bhubaneswar (Odisha Local ISP)", targetUrl: "https://csodisha.com/", httpStatus: 200, responseTimeMs: 24, status: "Up", lastChecked: "2026-11-10 09:15", active: true },
      { id: "AVL-02", probeLocation: "Mumbai (AWS ap-south-1 Probe)", targetUrl: "https://csodisha.com/jobs-careers/", httpStatus: 200, responseTimeMs: 18, status: "Up", lastChecked: "2026-11-10 09:15", active: true },
      { id: "AVL-03", probeLocation: "Singapore (APAC Primary Edge)", targetUrl: "https://csodisha.com/schemes-benefits/", httpStatus: 200, responseTimeMs: 38, status: "Up", lastChecked: "2026-11-10 09:14", active: true },
      { id: "AVL-04", probeLocation: "Frankfurt (Europe Gateway Probe)", targetUrl: "https://csodisha.com/study-library/", httpStatus: 200, responseTimeMs: 110, status: "Up", lastChecked: "2026-11-10 09:13", active: true }
    ]
  };
  SuperStore.getWebsiteAvailabilityConfig = function() {
    return _hydrateConfig('cso_website_availability_config', 'probes', () => DEFAULT_WEBSITE_AVAILABILITY);
  };
  SuperStore.saveWebsiteAvailabilityConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.probes = cfg.items || cfg.probes || []; cfg.items = cfg.probes;
    localStorage.setItem('cso_website_availability_config', JSON.stringify(cfg));
    this.logAudit('WEBSITE_AVAILABILITY_UPDATED', 'OPERATIONS', `Website availability probes updated (${cfg.items.length} probes).`);
    return true;
  };
  SuperStore.resetWebsiteAvailabilityConfig = function() {
    localStorage.setItem('cso_website_availability_config', JSON.stringify(DEFAULT_WEBSITE_AVAILABILITY));
    this.logAudit('WEBSITE_AVAILABILITY_RESET', 'OPERATIONS', 'Website availability config reset to factory defaults.');
    return JSON.parse(JSON.stringify(DEFAULT_WEBSITE_AVAILABILITY));
  };
  SuperStore.exportWebsiteAvailabilityManifest = function() {
    const config = this.getWebsiteAvailabilityConfig();
    const filename = "website_availability_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("WEBSITE_AVAILABILITY_EXPORTED", "DATA_EXPORT", `Website availability manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 17-003: API Diagnostics ---
  const DEFAULT_API_DIAGNOSTICS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalEndpointsProbed: 5, avgLatencyMs: "28ms", errorRate24h: "0.02%", p99LatencyMs: "84ms" },
    items: [
      { id: "DGN-01", endpointName: "Public Jobs & Gazette Search API", path: "/api/search?q=opsc", expectedStatus: 200, lastLatencyMs: 14, errorCount24h: 0, status: "Healthy", active: true },
      { id: "DGN-02", endpointName: "Candidate Authentication Token Verification", path: "/api/auth/verify-session", expectedStatus: 200, lastLatencyMs: 22, errorCount24h: 1, status: "Healthy", active: true },
      { id: "DGN-03", endpointName: "District Mock Test Leaderboard Engine", path: "/api/mock/leaderboard?district=balasore", expectedStatus: 200, lastLatencyMs: 36, errorCount24h: 0, status: "Healthy", active: true },
      { id: "DGN-04", endpointName: "Static JSON Navigation Tree Fetch", path: "/admin/data/master-navigation.json", expectedStatus: 200, lastLatencyMs: 12, errorCount24h: 0, status: "Healthy", active: true }
    ]
  };
  SuperStore.getApiDiagnosticsConfig = function() {
    return _hydrateConfig('cso_api_diagnostics_config', 'diagnostics', () => DEFAULT_API_DIAGNOSTICS);
  };
  SuperStore.saveApiDiagnosticsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.diagnostics = cfg.items || cfg.diagnostics || []; cfg.items = cfg.diagnostics;
    localStorage.setItem('cso_api_diagnostics_config', JSON.stringify(cfg));
    this.logAudit('API_DIAGNOSTICS_UPDATED', 'OPERATIONS', `API diagnostics updated (${cfg.items.length} endpoints).`);
    return true;
  };
  SuperStore.resetApiDiagnosticsConfig = function() {
    localStorage.setItem('cso_api_diagnostics_config', JSON.stringify(DEFAULT_API_DIAGNOSTICS));
    this.logAudit('API_DIAGNOSTICS_RESET', 'OPERATIONS', 'API diagnostics reset to factory defaults.');
    return JSON.parse(JSON.stringify(DEFAULT_API_DIAGNOSTICS));
  };
  SuperStore.exportApiDiagnosticsManifest = function() {
    const config = this.getApiDiagnosticsConfig();
    const filename = "api_diagnostics_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("API_DIAGNOSTICS_EXPORTED", "DATA_EXPORT", `API diagnostics manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 17-004: Database Health ---
  const DEFAULT_DATABASE_HEALTH = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { dbEngine: "PostgreSQL 16.2 (Supabase)", poolUtilization: "30%", activeTransactions: 18, slowQueriesCount24h: 1, cacheHitRatio: "99.4%" },
    items: [
      { id: "DBH-01", metricName: "Connection Pool Saturation (PgBouncer)", currentValue: "18 / 60 Active Connections", thresholdLimit: "50 Max", status: "Optimal", active: true },
      { id: "DBH-02", metricName: "Buffer Cache Hit Ratio", currentValue: "99.42%", thresholdLimit: "Min 95.0%", status: "Optimal", active: true },
      { id: "DBH-03", metricName: "Index Scan vs Sequential Scan Ratio", currentValue: "94.8% Index Scanned", thresholdLimit: "Min 85.0%", status: "Optimal", active: true },
      { id: "DBH-04", metricName: "Dead Tuples & Vacuum Status", currentValue: "Autovacuum Healthy (0.2% Bloat)", thresholdLimit: "Max 5% Bloat", status: "Optimal", active: true }
    ]
  };
  SuperStore.getDatabaseHealthConfig = function() {
    return _hydrateConfig('cso_database_health_config', 'dbMetrics', () => DEFAULT_DATABASE_HEALTH);
  };
  SuperStore.saveDatabaseHealthConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.dbMetrics = cfg.items || cfg.dbMetrics || []; cfg.items = cfg.dbMetrics;
    localStorage.setItem('cso_database_health_config', JSON.stringify(cfg));
    this.logAudit('DATABASE_HEALTH_UPDATED', 'OPERATIONS', `Database health metrics updated (${cfg.items.length} metrics).`);
    return true;
  };
  SuperStore.resetDatabaseHealthConfig = function() {
    localStorage.setItem('cso_database_health_config', JSON.stringify(DEFAULT_DATABASE_HEALTH));
    this.logAudit('DATABASE_HEALTH_RESET', 'OPERATIONS', 'Database health config reset to factory defaults.');
    return JSON.parse(JSON.stringify(DEFAULT_DATABASE_HEALTH));
  };
  SuperStore.exportDatabaseHealthManifest = function() {
    const config = this.getDatabaseHealthConfig();
    const filename = "database_health_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("DATABASE_HEALTH_EXPORTED", "DATA_EXPORT", `Database health manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 17-005: Storage Monitoring ---
  const DEFAULT_STORAGE_MONITORING = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalAllocatedStorageGB: "500 GB", totalUsedStorageGB: "148.6 GB", utilizationPercent: "29.7%", monthlyEgressGB: "184.2 GB" },
    items: [
      { id: "STR-M01", volumeName: "Gazette Archive Storage (Cloudflare R2)", bucketRef: "cso-gazette-circulars-prod", usedGB: "84.2 GB", objectCount: 4210, storageType: "Standard Fast Tier", status: "Healthy", active: true },
      { id: "STR-M02", volumeName: "Study Library PYQ PDFs & Notes", bucketRef: "cso-pyq-vault-study-docs", usedGB: "46.1 GB", objectCount: 2840, storageType: "Standard Fast Tier", status: "Healthy", active: true },
      { id: "STR-M03", volumeName: "Encrypted Disaster Recovery Snapshots", bucketRef: "cso-admin-backups-snapshots", usedGB: "14.8 GB", objectCount: 48, storageType: "Infrequent Cold Archive", status: "Healthy", active: true },
      { id: "STR-M04", volumeName: "Candidate Verification Uploads", bucketRef: "cso-user-verification-docs", usedGB: "3.5 GB", objectCount: 1322, storageType: "Private Vault", status: "Healthy", active: true }
    ]
  };
  SuperStore.getStorageMonitoringConfig = function() {
    return _hydrateConfig('cso_storage_monitoring_config', 'storageVolumes', () => DEFAULT_STORAGE_MONITORING);
  };
  SuperStore.saveStorageMonitoringConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.storageVolumes = cfg.items || cfg.storageVolumes || []; cfg.items = cfg.storageVolumes;
    localStorage.setItem('cso_storage_monitoring_config', JSON.stringify(cfg));
    this.logAudit('STORAGE_MONITORING_UPDATED', 'OPERATIONS', `Storage monitoring volumes updated (${cfg.items.length} volumes).`);
    return true;
  };
  SuperStore.resetStorageMonitoringConfig = function() {
    localStorage.setItem('cso_storage_monitoring_config', JSON.stringify(DEFAULT_STORAGE_MONITORING));
    this.logAudit('STORAGE_MONITORING_RESET', 'OPERATIONS', 'Storage monitoring config reset to factory defaults.');
    return JSON.parse(JSON.stringify(DEFAULT_STORAGE_MONITORING));
  };
  SuperStore.exportStorageMonitoringManifest = function() {
    const config = this.getStorageMonitoringConfig();
    const filename = "storage_monitoring_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("STORAGE_MONITORING_EXPORTED", "DATA_EXPORT", `Storage monitoring manifest exported (${filename}).`);
    return filename;
  };


  // --- MODULE 17-006: Backup Centre ---
  const DEFAULT_BACKUP_CENTRE = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalSnapshots: 14, totalStorageUsedMB: "148.4 MB", automatedCadence: "Daily at 02:00 IST", lastSuccessfulBackup: "2026-11-10 02:00" },
    items: [
      { id: "BKP-01", snapshotName: "Full Platform State Snapshot v2.4", snapshotType: "Automated Daily", fileSizeMB: "12.4 MB", checksumSha256: "9f83ab20cde8812a0149bbfe120491823abce8812041289fe12041289aa45120", destination: "Cloudflare R2 + S3 Cold Vault", createdDate: "2026-11-10 02:00", status: "Verified & Encrypted", active: true },
      { id: "BKP-02", snapshotName: "Pre-Deployment Milestone Folder-16 Final", snapshotType: "Manual Checkpoint", fileSizeMB: "11.8 MB", checksumSha256: "884102c4b812a4501982bfe881c120491823abce8812041289fe12041289c412", destination: "Cloudflare R2 Vault", createdDate: "2026-11-09 23:45", status: "Verified & Encrypted", active: true },
      { id: "BKP-03", snapshotName: "Weekly Comprehensive Database Dump", snapshotType: "Automated Weekly", fileSizeMB: "38.2 MB", checksumSha256: "7712983acbe1441a778b4562145e69e7102d918341a99bf8812c4091aefbc204", destination: "AWS S3 Mumbai Archive", createdDate: "2026-11-08 03:00", status: "Verified & Encrypted", active: true }
    ]
  };
  SuperStore.getBackupCentreConfig = function() {
    return _hydrateConfig('cso_backup_centre_config', 'backups', () => DEFAULT_BACKUP_CENTRE);
  };
  SuperStore.saveBackupCentreConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.backups = cfg.items || cfg.backups || []; cfg.items = cfg.backups;
    localStorage.setItem('cso_backup_centre_config', JSON.stringify(cfg));
    this.logAudit('BACKUP_CENTRE_UPDATED', 'OPERATIONS', `Backup centre snapshots updated (${cfg.items.length} snapshots).`);
    return true;
  };
  SuperStore.resetBackupCentreConfig = function() {
    localStorage.setItem('cso_backup_centre_config', JSON.stringify(DEFAULT_BACKUP_CENTRE));
    this.logAudit('BACKUP_CENTRE_RESET', 'OPERATIONS', 'Backup centre config reset to factory defaults.');
    return JSON.parse(JSON.stringify(DEFAULT_BACKUP_CENTRE));
  };
  SuperStore.exportBackupCentreManifest = function() {
    const config = this.getBackupCentreConfig();
    const filename = "backup_centre_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("BACKUP_CENTRE_EXPORTED", "DATA_EXPORT", `Backup centre manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 17-007: Restore Centre ---
  const DEFAULT_RESTORE_CENTRE = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalRestoreDrills: 6, lastRestoreDrillDate: "2026-10-28", rtoEstimateMinutes: 5, rpoEstimateHours: 24 },
    items: [
      { id: "RST-01", targetSnapshotRef: "BKP-01 (Full Platform State v2.4)", executionEnvironment: "Staging Sandbox", restoredBy: "Root Super Admin", checksumVerified: true, domainsRestoredCount: 124, durationSeconds: 28, status: "Success (Drill)", restoredAt: "2026-11-10 03:15", active: true },
      { id: "RST-02", targetSnapshotRef: "BKP-03 (Weekly Comprehensive Dump)", executionEnvironment: "Disaster Recovery Standby", restoredBy: "DevOps Engineer", checksumVerified: true, domainsRestoredCount: 124, durationSeconds: 42, status: "Success (Drill)", restoredAt: "2026-10-28 14:00", active: true },
      { id: "RST-03", targetSnapshotRef: "BKP-02 (Pre-Deploy Milestone)", executionEnvironment: "Local Testing Sandbox", restoredBy: "Root Super Admin", checksumVerified: true, domainsRestoredCount: 118, durationSeconds: 19, status: "Success (Verification)", restoredAt: "2026-11-09 23:55", active: true }
    ]
  };
  SuperStore.getRestoreCentreConfig = function() {
    return _hydrateConfig('cso_restore_centre_config', 'restoreLogs', () => DEFAULT_RESTORE_CENTRE);
  };
  SuperStore.saveRestoreCentreConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.restoreLogs = cfg.items || cfg.restoreLogs || []; cfg.items = cfg.restoreLogs;
    localStorage.setItem('cso_restore_centre_config', JSON.stringify(cfg));
    this.logAudit('RESTORE_CENTRE_UPDATED', 'OPERATIONS', `Restore centre logs updated (${cfg.items.length} logs).`);
    return true;
  };
  SuperStore.resetRestoreCentreConfig = function() {
    localStorage.setItem('cso_restore_centre_config', JSON.stringify(DEFAULT_RESTORE_CENTRE));
    this.logAudit('RESTORE_CENTRE_RESET', 'OPERATIONS', 'Restore centre config reset to factory defaults.');
    return JSON.parse(JSON.stringify(DEFAULT_RESTORE_CENTRE));
  };
  SuperStore.exportRestoreCentreManifest = function() {
    const config = this.getRestoreCentreConfig();
    const filename = "restore_centre_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("RESTORE_CENTRE_EXPORTED", "DATA_EXPORT", `Restore centre manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 17-008: Revision Rollback ---
  const DEFAULT_REVISION_ROLLBACK = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalRevisionsTracked: 184, rollbacksTriggered30d: 2, currentHeadRevision: "rev-2026-11-10-0915" },
    items: [
      { id: "REV-01", revisionCode: "REV-16-AUTH-SEC", targetModule: "module-16-001 (Authentication)", author: "Root Admin", changeDescription: "Updated password complexity rules and lockout duration from 15m to 30m", diffSummary: "2 fields modified (+30m lockout, +12 char)", timestamp: "2026-11-10 08:35", rollbackStatus: "Stable (Active Head)", active: true },
      { id: "REV-02", revisionCode: "REV-15-CLD-R2", targetModule: "module-15-006 (Cloud Storage)", author: "DevOps Engineer", changeDescription: "Added cso-admin-backups-snapshots bucket reference to multi-cloud pool", diffSummary: "1 new bucket mount registered", timestamp: "2026-11-10 07:45", rollbackStatus: "Stable", active: true },
      { id: "REV-03", revisionCode: "REV-14-EXM-OCS", targetModule: "module-14-002 (Exam Calendar)", author: "Lead Editor (Debabrata)", changeDescription: "Confirmed OPSC OAS preliminary examination timing and shift schedule", diffSummary: "Exam status updated to Date Confirmed", timestamp: "2026-11-09 18:20", rollbackStatus: "Stable", active: true }
    ]
  };
  SuperStore.getRevisionRollbackConfig = function() {
    return _hydrateConfig('cso_revision_rollback_config', 'revisions', () => DEFAULT_REVISION_ROLLBACK);
  };
  SuperStore.saveRevisionRollbackConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.revisions = cfg.items || cfg.revisions || []; cfg.items = cfg.revisions;
    localStorage.setItem('cso_revision_rollback_config', JSON.stringify(cfg));
    this.logAudit('REVISION_ROLLBACK_UPDATED', 'OPERATIONS', `Revision rollback entries updated (${cfg.items.length} revisions).`);
    return true;
  };
  SuperStore.resetRevisionRollbackConfig = function() {
    localStorage.setItem('cso_revision_rollback_config', JSON.stringify(DEFAULT_REVISION_ROLLBACK));
    this.logAudit('REVISION_ROLLBACK_RESET', 'OPERATIONS', 'Revision rollback config reset to factory defaults.');
    return JSON.parse(JSON.stringify(DEFAULT_REVISION_ROLLBACK));
  };
  SuperStore.exportRevisionRollbackManifest = function() {
    const config = this.getRevisionRollbackConfig();
    const filename = "revision_rollback_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("REVISION_ROLLBACK_EXPORTED", "DATA_EXPORT", `Revision rollback manifest exported (${filename}).`);
    return filename;
  };


  // --- MODULE 17-009: Error Logs ---
  const DEFAULT_ERROR_LOGS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalErrorsLogged24h: 18, criticalErrors: 0, warningCount: 4, averageResolutionTime: "12m" },
    items: [
      { id: "ERR-01", timestamp: "2026-11-10 09:20:14", errorLevel: "Warning", sourceComponent: "Search Index Loader", errorMessage: "Failed to preload secondary synonym cache; fallback dictionary active", stackTraceSnippet: "Error: SynonymDictionaryLoadTimeout at flexsearch.worker.js:84", occurrences24h: 3, status: "Mitigated", active: true },
      { id: "ERR-02", timestamp: "2026-11-10 08:44:02", errorLevel: "Error", sourceComponent: "Payment Webhook Dispatcher", errorMessage: "Razorpay webhook signature verification delayed (340ms)", stackTraceSnippet: "WebhookVerificationDelay: signature clock skew < 1s at webhooks.js:112", occurrences24h: 1, status: "Resolved", active: true },
      { id: "ERR-03", timestamp: "2026-11-09 23:10:45", errorLevel: "Warning", sourceComponent: "Client Asset Prefetch", errorMessage: "404 on prefetching legacy icon /assets/icons/favicon-old.ico", stackTraceSnippet: "ResourceFetchError: 404 Not Found at sw.js:42", occurrences24h: 14, status: "Under Review", active: true }
    ]
  };
  SuperStore.getErrorLogsConfig = function() {
    return _hydrateConfig('cso_error_logs_config', 'errorEntries', () => DEFAULT_ERROR_LOGS);
  };
  SuperStore.saveErrorLogsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.errorEntries = cfg.items || cfg.errorEntries || []; cfg.items = cfg.errorEntries;
    localStorage.setItem('cso_error_logs_config', JSON.stringify(cfg));
    this.logAudit('ERROR_LOGS_UPDATED', 'OPERATIONS', `Error logs updated (${cfg.items.length} entries).`);
    return true;
  };
  SuperStore.resetErrorLogsConfig = function() {
    localStorage.setItem('cso_error_logs_config', JSON.stringify(DEFAULT_ERROR_LOGS));
    this.logAudit('ERROR_LOGS_RESET', 'OPERATIONS', 'Error logs reset to factory defaults.');
    return JSON.parse(JSON.stringify(DEFAULT_ERROR_LOGS));
  };
  SuperStore.exportErrorLogsManifest = function() {
    const config = this.getErrorLogsConfig();
    const filename = "error_logs_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("ERROR_LOGS_EXPORTED", "DATA_EXPORT", `Error logs manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 17-010: Scheduled Jobs ---
  const DEFAULT_SCHEDULED_JOBS = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { totalConfiguredJobs: 5, activeCronsCount: 5, failedExecutions24h: 0, nextScheduledJob: "2026-11-10 12:00 (Hourly Ingestion)" },
    items: [
      { id: "CRON-01", jobName: "Gazette Circular Ingestion & Digest", cronExpression: "0 * * * * (Hourly)", handlerPath: "/workers/cron/gazette-sync.js", lastRunTime: "2026-11-10 09:00", nextRunTime: "2026-11-10 10:00", durationSeconds: 4.2, status: "Success", active: true },
      { id: "CRON-02", jobName: "Automated Platform Snapshot Backup", cronExpression: "0 2 * * * (Daily at 02:00 IST)", handlerPath: "/workers/cron/backup-snapshot.js", lastRunTime: "2026-11-10 02:00", nextRunTime: "2026-11-11 02:00", durationSeconds: 28.5, status: "Success", active: true },
      { id: "CRON-03", jobName: "XML Sitemap Regeneration & Ping", cronExpression: "0 4 * * * (Daily at 04:00 IST)", handlerPath: "/workers/cron/sitemap-generator.js", lastRunTime: "2026-11-10 04:00", nextRunTime: "2026-11-11 04:00", durationSeconds: 12.1, status: "Success", active: true },
      { id: "CRON-04", jobName: "Expired Candidate Session Token Cleanup", cronExpression: "*/30 * * * * (Every 30m)", handlerPath: "/workers/cron/session-cleaner.js", lastRunTime: "2026-11-10 09:30", nextRunTime: "2026-11-10 10:00", durationSeconds: 1.8, status: "Success", active: true }
    ]
  };
  SuperStore.getScheduledJobsConfig = function() {
    return _hydrateConfig('cso_scheduled_jobs_config', 'jobs', () => DEFAULT_SCHEDULED_JOBS);
  };
  SuperStore.saveScheduledJobsConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.jobs = cfg.items || cfg.jobs || []; cfg.items = cfg.jobs;
    localStorage.setItem('cso_scheduled_jobs_config', JSON.stringify(cfg));
    this.logAudit('SCHEDULED_JOBS_UPDATED', 'OPERATIONS', `Scheduled jobs updated (${cfg.items.length} jobs).`);
    return true;
  };
  SuperStore.resetScheduledJobsConfig = function() {
    localStorage.setItem('cso_scheduled_jobs_config', JSON.stringify(DEFAULT_SCHEDULED_JOBS));
    this.logAudit('SCHEDULED_JOBS_RESET', 'OPERATIONS', 'Scheduled jobs reset to factory defaults.');
    return JSON.parse(JSON.stringify(DEFAULT_SCHEDULED_JOBS));
  };
  SuperStore.exportScheduledJobsManifest = function() {
    const config = this.getScheduledJobsConfig();
    const filename = "scheduled_jobs_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("SCHEDULED_JOBS_EXPORTED", "DATA_EXPORT", `Scheduled jobs manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 17-011: Automation Rules ---
  const DEFAULT_AUTOMATION_RULES = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    summary: { activeRulesCount: 4, automatedTriggers24h: 38, systemIntegrityCheck: "Enforced" },
    items: [
      { id: "RUL-01", ruleTitle: "Auto-Purge Cloudflare Cache on Gazette Release", triggerEvent: "ON_PUBLISH_GAZETTE", actionPayload: "PURGE_ZONE_CACHE(/jobs-careers/)", executionMode: "Synchronous Edge Call", lastTriggered: "2026-11-09 18:22", status: "Active", active: true },
      { id: "RUL-02", ruleTitle: "Instant Telegram Broadcast for OAS Notification", triggerEvent: "ON_TAG_OPSC_OAS_CONFIRMED", actionPayload: "DISPATCH_TG_CHANNEL(alerts_cso)", executionMode: "Asynchronous Queue", lastTriggered: "2026-11-09 18:25", status: "Active", active: true },
      { id: "RUL-03", ruleTitle: "Auto-Revoke Session on Password Reset", triggerEvent: "ON_ADMIN_PASSWORD_CHANGE", actionPayload: "REVOKE_ALL_SESSIONS_EXCEPT_CURRENT", executionMode: "Immediate Security Hook", lastTriggered: "2026-11-08 14:10", status: "Active", active: true },
      { id: "RUL-04", ruleTitle: "Auto-Archive Expired Recruitment Applications", triggerEvent: "ON_APPLICATION_WINDOW_CLOSE", actionPayload: "MARK_LEGACY_AND_HIDE_APPLY_BTN", executionMode: "Nightly Cron Check", lastTriggered: "2026-11-10 00:01", status: "Active", active: true }
    ]
  };
  SuperStore.getAutomationRulesConfig = function() {
    return _hydrateConfig('cso_automation_rules_config', 'rules', () => DEFAULT_AUTOMATION_RULES);
  };
  SuperStore.saveAutomationRulesConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.rules = cfg.items || cfg.rules || []; cfg.items = cfg.rules;
    localStorage.setItem('cso_automation_rules_config', JSON.stringify(cfg));
    this.logAudit('AUTOMATION_RULES_UPDATED', 'OPERATIONS', `Automation rules updated (${cfg.items.length} rules).`);
    return true;
  };
  SuperStore.resetAutomationRulesConfig = function() {
    localStorage.setItem('cso_automation_rules_config', JSON.stringify(DEFAULT_AUTOMATION_RULES));
    this.logAudit('AUTOMATION_RULES_RESET', 'OPERATIONS', 'Automation rules reset to factory defaults.');
    return JSON.parse(JSON.stringify(DEFAULT_AUTOMATION_RULES));
  };
  SuperStore.exportAutomationRulesManifest = function() {
    const config = this.getAutomationRulesConfig();
    const filename = "automation_rules_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("AUTOMATION_RULES_EXPORTED", "DATA_EXPORT", `Automation rules manifest exported (${filename}).`);
    return filename;
  };

  // --- MODULE 17-012: Maintenance Mode ---
  const DEFAULT_MAINTENANCE_MODE = {
    meta: { version: "1.0", updatedAt: new Date().toISOString() },
    state: { isMaintenanceActive: false, allowAdminBypass: true, bypassToken: "cso_admin_bypass_key_2026", estimatedWindowMinutes: 0, scheduledActivation: null },
    settings: {
      headingText: "Common Sense Odisha Scheduled Portal Upgrade",
      subtextMessage: "Our engineering team is currently optimizing examination gazette databases and statewide mock testing servers. The portal will resume normal operational status shortly.",
      contactSupportEmail: "admin@csodisha.com",
      retryAfterSeconds: 300
    },
    items: [
      { id: "MNT-CFG-01", targetScope: "Public Portal Routes (/jobs, /schemes, /study)", bypassRole: "Authenticated Super Admin Only", enforcementMethod: "Cloudflare Edge Worker HTTP 503", active: true },
      { id: "MNT-CFG-02", targetScope: "Super Admin Command Suite (/admin/)", bypassRole: "Whitelisted Developer IPs", enforcementMethod: "Direct Pass-Through", active: true }
    ]
  };
  SuperStore.getMaintenanceModeConfig = function() {
    return _hydrateConfig('cso_maintenance_mode_config', 'maintenanceRules', () => DEFAULT_MAINTENANCE_MODE);
  };
  SuperStore.saveMaintenanceModeConfig = function(cfg) {
    if (!cfg) return false;
    cfg.meta = cfg.meta || {}; cfg.meta.updatedAt = new Date().toISOString();
    cfg.maintenanceRules = cfg.items || cfg.maintenanceRules || []; cfg.items = cfg.maintenanceRules;
    localStorage.setItem('cso_maintenance_mode_config', JSON.stringify(cfg));
    this.logAudit('MAINTENANCE_MODE_UPDATED', 'OPERATIONS', `Maintenance mode settings updated (Active: ${cfg.state && cfg.state.isMaintenanceActive}).`);
    return true;
  };
  SuperStore.resetMaintenanceModeConfig = function() {
    localStorage.setItem('cso_maintenance_mode_config', JSON.stringify(DEFAULT_MAINTENANCE_MODE));
    this.logAudit('MAINTENANCE_MODE_RESET', 'OPERATIONS', 'Maintenance mode reset to factory defaults.');
    return JSON.parse(JSON.stringify(DEFAULT_MAINTENANCE_MODE));
  };
  SuperStore.exportMaintenanceModeManifest = function() {
    const config = this.getMaintenanceModeConfig();
    const filename = "maintenance_mode_manifest_" + new Date().toISOString().slice(0, 10) + ".json";
    this.downloadJson(filename, config);
    this.logAudit("MAINTENANCE_MODE_EXPORTED", "DATA_EXPORT", `Maintenance mode manifest exported (${filename}).`);
    return filename;
  };

  // Attach directly so both this._hydrateConfig and standalone _hydrateConfig work
  if (typeof window !== 'undefined' && window.CSOSuperStore) {
    window.CSOSuperStore._hydrateConfig = _hydrateConfig;
    window.CSOSuperStore.getAdPlacementsConfig = SuperStore.getAdPlacementsConfig;
    window.CSOSuperStore.saveAdPlacementsConfig = SuperStore.saveAdPlacementsConfig;
    window.CSOSuperStore.resetAdPlacementsConfig = SuperStore.resetAdPlacementsConfig;
    window.CSOSuperStore.exportAdPlacementsManifest = SuperStore.exportAdPlacementsManifest;
    window.CSOSuperStore.getSponsorsConfig = SuperStore.getSponsorsConfig;
    window.CSOSuperStore.saveSponsorsConfig = SuperStore.saveSponsorsConfig;
    window.CSOSuperStore.resetSponsorsConfig = SuperStore.resetSponsorsConfig;
    window.CSOSuperStore.exportSponsorsManifest = SuperStore.exportSponsorsManifest;
    window.CSOSuperStore.getPromotionalBannersConfig = SuperStore.getPromotionalBannersConfig;
    window.CSOSuperStore.savePromotionalBannersConfig = SuperStore.savePromotionalBannersConfig;
    window.CSOSuperStore.resetPromotionalBannersConfig = SuperStore.resetPromotionalBannersConfig;
    window.CSOSuperStore.exportPromotionalBannersManifest = SuperStore.exportPromotionalBannersManifest;
    window.CSOSuperStore.getCampaignsConfig = SuperStore.getCampaignsConfig;
    window.CSOSuperStore.saveCampaignsConfig = SuperStore.saveCampaignsConfig;
    window.CSOSuperStore.resetCampaignsConfig = SuperStore.resetCampaignsConfig;
    window.CSOSuperStore.exportCampaignsManifest = SuperStore.exportCampaignsManifest;
    window.CSOSuperStore.getReferralTrackingConfig = SuperStore.getReferralTrackingConfig;
    window.CSOSuperStore.saveReferralTrackingConfig = SuperStore.saveReferralTrackingConfig;
    window.CSOSuperStore.resetReferralTrackingConfig = SuperStore.resetReferralTrackingConfig;
    window.CSOSuperStore.exportReferralTrackingManifest = SuperStore.exportReferralTrackingManifest;
    window.CSOSuperStore.getCampaignAnalyticsConfig = SuperStore.getCampaignAnalyticsConfig;
    window.CSOSuperStore.saveCampaignAnalyticsConfig = SuperStore.saveCampaignAnalyticsConfig;
    window.CSOSuperStore.resetCampaignAnalyticsConfig = SuperStore.resetCampaignAnalyticsConfig;
    window.CSOSuperStore.exportCampaignAnalyticsManifest = SuperStore.exportCampaignAnalyticsManifest;
    window.CSOSuperStore.getUtmManagementConfig = SuperStore.getUtmManagementConfig;
    window.CSOSuperStore.saveUtmManagementConfig = SuperStore.saveUtmManagementConfig;
    window.CSOSuperStore.resetUtmManagementConfig = SuperStore.resetUtmManagementConfig;
    window.CSOSuperStore.exportUtmManagementManifest = SuperStore.exportUtmManagementManifest;
    window.CSOSuperStore.getSocialSharingConfig = SuperStore.getSocialSharingConfig;
    window.CSOSuperStore.saveSocialSharingConfig = SuperStore.saveSocialSharingConfig;
    window.CSOSuperStore.resetSocialSharingConfig = SuperStore.resetSocialSharingConfig;
    window.CSOSuperStore.exportSocialSharingManifest = SuperStore.exportSocialSharingManifest;
    window.CSOSuperStore.getPromoLandingPagesConfig = SuperStore.getPromoLandingPagesConfig;
    window.CSOSuperStore.savePromoLandingPagesConfig = SuperStore.savePromoLandingPagesConfig;
    window.CSOSuperStore.resetPromoLandingPagesConfig = SuperStore.resetPromoLandingPagesConfig;
    window.CSOSuperStore.exportPromoLandingPagesManifest = SuperStore.exportPromoLandingPagesManifest;
    window.CSOSuperStore.getAdvertisingReportsConfig = SuperStore.getAdvertisingReportsConfig;
    window.CSOSuperStore.saveAdvertisingReportsConfig = SuperStore.saveAdvertisingReportsConfig;
    window.CSOSuperStore.resetAdvertisingReportsConfig = SuperStore.resetAdvertisingReportsConfig;
    window.CSOSuperStore.exportAdvertisingReportsManifest = SuperStore.exportAdvertisingReportsManifest;
    window.CSOSuperStore.getSeoOverviewConfig = SuperStore.getSeoOverviewConfig;
    window.CSOSuperStore.saveSeoOverviewConfig = SuperStore.saveSeoOverviewConfig;
    window.CSOSuperStore.resetSeoOverviewConfig = SuperStore.resetSeoOverviewConfig;
    window.CSOSuperStore.exportSeoOverviewManifest = SuperStore.exportSeoOverviewManifest;
    window.CSOSuperStore.getPageMetadataConfig = SuperStore.getPageMetadataConfig;
    window.CSOSuperStore.savePageMetadataConfig = SuperStore.savePageMetadataConfig;
    window.CSOSuperStore.resetPageMetadataConfig = SuperStore.resetPageMetadataConfig;
    window.CSOSuperStore.exportPageMetadataManifest = SuperStore.exportPageMetadataManifest;
    window.CSOSuperStore.getCanonicalUrlsConfig = SuperStore.getCanonicalUrlsConfig;
    window.CSOSuperStore.saveCanonicalUrlsConfig = SuperStore.saveCanonicalUrlsConfig;
    window.CSOSuperStore.resetCanonicalUrlsConfig = SuperStore.resetCanonicalUrlsConfig;
    window.CSOSuperStore.exportCanonicalUrlsManifest = SuperStore.exportCanonicalUrlsManifest;
    window.CSOSuperStore.getOpenGraphPreviewsConfig = SuperStore.getOpenGraphPreviewsConfig;
    window.CSOSuperStore.saveOpenGraphPreviewsConfig = SuperStore.saveOpenGraphPreviewsConfig;
    window.CSOSuperStore.resetOpenGraphPreviewsConfig = SuperStore.resetOpenGraphPreviewsConfig;
    window.CSOSuperStore.exportOpenGraphPreviewsManifest = SuperStore.exportOpenGraphPreviewsManifest;
    window.CSOSuperStore.getStructuredDataConfig = SuperStore.getStructuredDataConfig;
    window.CSOSuperStore.saveStructuredDataConfig = SuperStore.saveStructuredDataConfig;
    window.CSOSuperStore.resetStructuredDataConfig = SuperStore.resetStructuredDataConfig;
    window.CSOSuperStore.exportStructuredDataManifest = SuperStore.exportStructuredDataManifest;
    window.CSOSuperStore.getXmlSitemapConfig = SuperStore.getXmlSitemapConfig;
    window.CSOSuperStore.saveXmlSitemapConfig = SuperStore.saveXmlSitemapConfig;
    window.CSOSuperStore.resetXmlSitemapConfig = SuperStore.resetXmlSitemapConfig;
    window.CSOSuperStore.exportXmlSitemapManifest = SuperStore.exportXmlSitemapManifest;
    window.CSOSuperStore.getRobotsSettingsConfig = SuperStore.getRobotsSettingsConfig;
    window.CSOSuperStore.saveRobotsSettingsConfig = SuperStore.saveRobotsSettingsConfig;
    window.CSOSuperStore.resetRobotsSettingsConfig = SuperStore.resetRobotsSettingsConfig;
    window.CSOSuperStore.exportRobotsSettingsManifest = SuperStore.exportRobotsSettingsManifest;
    window.CSOSuperStore.getSearchConsoleConfig = SuperStore.getSearchConsoleConfig;
    window.CSOSuperStore.saveSearchConsoleConfig = SuperStore.saveSearchConsoleConfig;
    window.CSOSuperStore.resetSearchConsoleConfig = SuperStore.resetSearchConsoleConfig;
    window.CSOSuperStore.exportSearchConsoleManifest = SuperStore.exportSearchConsoleManifest;
    window.CSOSuperStore.getInternalSearchManagerConfig = SuperStore.getInternalSearchManagerConfig;
    window.CSOSuperStore.saveInternalSearchManagerConfig = SuperStore.saveInternalSearchManagerConfig;
    window.CSOSuperStore.resetInternalSearchManagerConfig = SuperStore.resetInternalSearchManagerConfig;
    window.CSOSuperStore.exportInternalSearchManagerManifest = SuperStore.exportInternalSearchManagerManifest;
    window.CSOSuperStore.getSearchIndexConfig = SuperStore.getSearchIndexConfig;
    window.CSOSuperStore.saveSearchIndexConfig = SuperStore.saveSearchIndexConfig;
    window.CSOSuperStore.resetSearchIndexConfig = SuperStore.resetSearchIndexConfig;
    window.CSOSuperStore.exportSearchIndexManifest = SuperStore.exportSearchIndexManifest;
    window.CSOSuperStore.getSearchFiltersConfig = SuperStore.getSearchFiltersConfig;
    window.CSOSuperStore.saveSearchFiltersConfig = SuperStore.saveSearchFiltersConfig;
    window.CSOSuperStore.resetSearchFiltersConfig = SuperStore.resetSearchFiltersConfig;
    window.CSOSuperStore.exportSearchFiltersManifest = SuperStore.exportSearchFiltersManifest;
    window.CSOSuperStore.getPopularSearchesConfig = SuperStore.getPopularSearchesConfig;
    window.CSOSuperStore.savePopularSearchesConfig = SuperStore.savePopularSearchesConfig;
    window.CSOSuperStore.resetPopularSearchesConfig = SuperStore.resetPopularSearchesConfig;
    window.CSOSuperStore.exportPopularSearchesManifest = SuperStore.exportPopularSearchesManifest;
    window.CSOSuperStore.getZeroResultSearchesConfig = SuperStore.getZeroResultSearchesConfig;
    window.CSOSuperStore.saveZeroResultSearchesConfig = SuperStore.saveZeroResultSearchesConfig;
    window.CSOSuperStore.resetZeroResultSearchesConfig = SuperStore.resetZeroResultSearchesConfig;
    window.CSOSuperStore.exportZeroResultSearchesManifest = SuperStore.exportZeroResultSearchesManifest;
    window.CSOSuperStore.getUrlRedirectsConfig = SuperStore.getUrlRedirectsConfig;
    window.CSOSuperStore.saveUrlRedirectsConfig = SuperStore.saveUrlRedirectsConfig;
    window.CSOSuperStore.resetUrlRedirectsConfig = SuperStore.resetUrlRedirectsConfig;
    window.CSOSuperStore.exportUrlRedirectsManifest = SuperStore.exportUrlRedirectsManifest;
    window.CSOSuperStore.getBrokenLinksConfig = SuperStore.getBrokenLinksConfig;
    window.CSOSuperStore.saveBrokenLinksConfig = SuperStore.saveBrokenLinksConfig;
    window.CSOSuperStore.resetBrokenLinksConfig = SuperStore.resetBrokenLinksConfig;
    window.CSOSuperStore.exportBrokenLinksManifest = SuperStore.exportBrokenLinksManifest;
    window.CSOSuperStore.get404ReportsConfig = SuperStore.get404ReportsConfig;
    window.CSOSuperStore.save404ReportsConfig = SuperStore.save404ReportsConfig;
    window.CSOSuperStore.reset404ReportsConfig = SuperStore.reset404ReportsConfig;
    window.CSOSuperStore.export404ReportsManifest = SuperStore.export404ReportsManifest;
    window.CSOSuperStore.getEventCalendarConfig = SuperStore.getEventCalendarConfig;
    window.CSOSuperStore.saveEventCalendarConfig = SuperStore.saveEventCalendarConfig;
    window.CSOSuperStore.resetEventCalendarConfig = SuperStore.resetEventCalendarConfig;
    window.CSOSuperStore.exportEventCalendarManifest = SuperStore.exportEventCalendarManifest;
    window.CSOSuperStore.getExamCalendarConfig = SuperStore.getExamCalendarConfig;
    window.CSOSuperStore.saveExamCalendarConfig = SuperStore.saveExamCalendarConfig;
    window.CSOSuperStore.resetExamCalendarConfig = SuperStore.resetExamCalendarConfig;
    window.CSOSuperStore.exportExamCalendarManifest = SuperStore.exportExamCalendarManifest;
    window.CSOSuperStore.getRecruitmentDeadlinesConfig = SuperStore.getRecruitmentDeadlinesConfig;
    window.CSOSuperStore.saveRecruitmentDeadlinesConfig = SuperStore.saveRecruitmentDeadlinesConfig;
    window.CSOSuperStore.resetRecruitmentDeadlinesConfig = SuperStore.resetRecruitmentDeadlinesConfig;
    window.CSOSuperStore.exportRecruitmentDeadlinesManifest = SuperStore.exportRecruitmentDeadlinesManifest;
    window.CSOSuperStore.getWebinarsSessionsConfig = SuperStore.getWebinarsSessionsConfig;
    window.CSOSuperStore.saveWebinarsSessionsConfig = SuperStore.saveWebinarsSessionsConfig;
    window.CSOSuperStore.resetWebinarsSessionsConfig = SuperStore.resetWebinarsSessionsConfig;
    window.CSOSuperStore.exportWebinarsSessionsManifest = SuperStore.exportWebinarsSessionsManifest;
    window.CSOSuperStore.getEventRegistrationsConfig = SuperStore.getEventRegistrationsConfig;
    window.CSOSuperStore.saveEventRegistrationsConfig = SuperStore.saveEventRegistrationsConfig;
    window.CSOSuperStore.resetEventRegistrationsConfig = SuperStore.resetEventRegistrationsConfig;
    window.CSOSuperStore.exportEventRegistrationsManifest = SuperStore.exportEventRegistrationsManifest;
    window.CSOSuperStore.getScheduledPublicationsConfig = SuperStore.getScheduledPublicationsConfig;
    window.CSOSuperStore.saveScheduledPublicationsConfig = SuperStore.saveScheduledPublicationsConfig;
    window.CSOSuperStore.resetScheduledPublicationsConfig = SuperStore.resetScheduledPublicationsConfig;
    window.CSOSuperStore.exportScheduledPublicationsManifest = SuperStore.exportScheduledPublicationsManifest;
    window.CSOSuperStore.getExpiryRulesConfig = SuperStore.getExpiryRulesConfig;
    window.CSOSuperStore.saveExpiryRulesConfig = SuperStore.saveExpiryRulesConfig;
    window.CSOSuperStore.resetExpiryRulesConfig = SuperStore.resetExpiryRulesConfig;
    window.CSOSuperStore.exportExpiryRulesManifest = SuperStore.exportExpiryRulesManifest;
    window.CSOSuperStore.getReminderConfigurationConfig = SuperStore.getReminderConfigurationConfig;
    window.CSOSuperStore.saveReminderConfigurationConfig = SuperStore.saveReminderConfigurationConfig;
    window.CSOSuperStore.resetReminderConfigurationConfig = SuperStore.resetReminderConfigurationConfig;
    window.CSOSuperStore.exportReminderConfigurationManifest = SuperStore.exportReminderConfigurationManifest;
    window.CSOSuperStore.getScheduledMaintenanceConfig = SuperStore.getScheduledMaintenanceConfig;
    window.CSOSuperStore.saveScheduledMaintenanceConfig = SuperStore.saveScheduledMaintenanceConfig;
    window.CSOSuperStore.resetScheduledMaintenanceConfig = SuperStore.resetScheduledMaintenanceConfig;
    window.CSOSuperStore.exportScheduledMaintenanceManifest = SuperStore.exportScheduledMaintenanceManifest;
    window.CSOSuperStore.getIntegrationDirectoryConfig = SuperStore.getIntegrationDirectoryConfig;
    window.CSOSuperStore.saveIntegrationDirectoryConfig = SuperStore.saveIntegrationDirectoryConfig;
    window.CSOSuperStore.resetIntegrationDirectoryConfig = SuperStore.resetIntegrationDirectoryConfig;
    window.CSOSuperStore.exportIntegrationDirectoryManifest = SuperStore.exportIntegrationDirectoryManifest;
    window.CSOSuperStore.getSupabaseStatusConfig = SuperStore.getSupabaseStatusConfig;
    window.CSOSuperStore.saveSupabaseStatusConfig = SuperStore.saveSupabaseStatusConfig;
    window.CSOSuperStore.resetSupabaseStatusConfig = SuperStore.resetSupabaseStatusConfig;
    window.CSOSuperStore.exportSupabaseStatusManifest = SuperStore.exportSupabaseStatusManifest;
    window.CSOSuperStore.getCloudflareIntegrationConfig = SuperStore.getCloudflareIntegrationConfig;
    window.CSOSuperStore.saveCloudflareIntegrationConfig = SuperStore.saveCloudflareIntegrationConfig;
    window.CSOSuperStore.resetCloudflareIntegrationConfig = SuperStore.resetCloudflareIntegrationConfig;
    window.CSOSuperStore.exportCloudflareIntegrationManifest = SuperStore.exportCloudflareIntegrationManifest;
    window.CSOSuperStore.getPaymentIntegrationsConfig = SuperStore.getPaymentIntegrationsConfig;
    window.CSOSuperStore.savePaymentIntegrationsConfig = SuperStore.savePaymentIntegrationsConfig;
    window.CSOSuperStore.resetPaymentIntegrationsConfig = SuperStore.resetPaymentIntegrationsConfig;
    window.CSOSuperStore.exportPaymentIntegrationsManifest = SuperStore.exportPaymentIntegrationsManifest;
    window.CSOSuperStore.getEmailProviderConfig = SuperStore.getEmailProviderConfig;
    window.CSOSuperStore.saveEmailProviderConfig = SuperStore.saveEmailProviderConfig;
    window.CSOSuperStore.resetEmailProviderConfig = SuperStore.resetEmailProviderConfig;
    window.CSOSuperStore.exportEmailProviderManifest = SuperStore.exportEmailProviderManifest;
    window.CSOSuperStore.getCloudStorageConfig = SuperStore.getCloudStorageConfig;
    window.CSOSuperStore.saveCloudStorageConfig = SuperStore.saveCloudStorageConfig;
    window.CSOSuperStore.resetCloudStorageConfig = SuperStore.resetCloudStorageConfig;
    window.CSOSuperStore.exportCloudStorageManifest = SuperStore.exportCloudStorageManifest;
    window.CSOSuperStore.getAnalyticsIntegrationsConfig = SuperStore.getAnalyticsIntegrationsConfig;
    window.CSOSuperStore.saveAnalyticsIntegrationsConfig = SuperStore.saveAnalyticsIntegrationsConfig;
    window.CSOSuperStore.resetAnalyticsIntegrationsConfig = SuperStore.resetAnalyticsIntegrationsConfig;
    window.CSOSuperStore.exportAnalyticsIntegrationsManifest = SuperStore.exportAnalyticsIntegrationsManifest;
    window.CSOSuperStore.getApiConfigurationConfig = SuperStore.getApiConfigurationConfig;
    window.CSOSuperStore.saveApiConfigurationConfig = SuperStore.saveApiConfigurationConfig;
    window.CSOSuperStore.resetApiConfigurationConfig = SuperStore.resetApiConfigurationConfig;
    window.CSOSuperStore.exportApiConfigurationManifest = SuperStore.exportApiConfigurationManifest;
    window.CSOSuperStore.getWebhookManagementConfig = SuperStore.getWebhookManagementConfig;
    window.CSOSuperStore.saveWebhookManagementConfig = SuperStore.saveWebhookManagementConfig;
    window.CSOSuperStore.resetWebhookManagementConfig = SuperStore.resetWebhookManagementConfig;
    window.CSOSuperStore.exportWebhookManagementManifest = SuperStore.exportWebhookManagementManifest;
    window.CSOSuperStore.getIntegrationLogsConfig = SuperStore.getIntegrationLogsConfig;
    window.CSOSuperStore.saveIntegrationLogsConfig = SuperStore.saveIntegrationLogsConfig;
    window.CSOSuperStore.resetIntegrationLogsConfig = SuperStore.resetIntegrationLogsConfig;
    window.CSOSuperStore.exportIntegrationLogsManifest = SuperStore.exportIntegrationLogsManifest;
    window.CSOSuperStore.getIntegrationHealthConfig = SuperStore.getIntegrationHealthConfig;
    window.CSOSuperStore.saveIntegrationHealthConfig = SuperStore.saveIntegrationHealthConfig;
    window.CSOSuperStore.resetIntegrationHealthConfig = SuperStore.resetIntegrationHealthConfig;
    window.CSOSuperStore.exportIntegrationHealthManifest = SuperStore.exportIntegrationHealthManifest;
    window.CSOSuperStore.getAuthenticationConfig = SuperStore.getAuthenticationConfig;
    window.CSOSuperStore.saveAuthenticationConfig = SuperStore.saveAuthenticationConfig;
    window.CSOSuperStore.resetAuthenticationConfig = SuperStore.resetAuthenticationConfig;
    window.CSOSuperStore.exportAuthenticationManifest = SuperStore.exportAuthenticationManifest;
    window.CSOSuperStore.getTwoFactorConfig = SuperStore.getTwoFactorConfig;
    window.CSOSuperStore.saveTwoFactorConfig = SuperStore.saveTwoFactorConfig;
    window.CSOSuperStore.resetTwoFactorConfig = SuperStore.resetTwoFactorConfig;
    window.CSOSuperStore.exportTwoFactorManifest = SuperStore.exportTwoFactorManifest;
    window.CSOSuperStore.getAdminSessionsConfig = SuperStore.getAdminSessionsConfig;
    window.CSOSuperStore.saveAdminSessionsConfig = SuperStore.saveAdminSessionsConfig;
    window.CSOSuperStore.resetAdminSessionsConfig = SuperStore.resetAdminSessionsConfig;
    window.CSOSuperStore.exportAdminSessionsManifest = SuperStore.exportAdminSessionsManifest;
    window.CSOSuperStore.getRolesAccessPoliciesConfig = SuperStore.getRolesAccessPoliciesConfig;
    window.CSOSuperStore.saveRolesAccessPoliciesConfig = SuperStore.saveRolesAccessPoliciesConfig;
    window.CSOSuperStore.resetRolesAccessPoliciesConfig = SuperStore.resetRolesAccessPoliciesConfig;
    window.CSOSuperStore.exportRolesAccessPoliciesManifest = SuperStore.exportRolesAccessPoliciesManifest;
    window.CSOSuperStore.getLoginHistoryConfig = SuperStore.getLoginHistoryConfig;
    window.CSOSuperStore.saveLoginHistoryConfig = SuperStore.saveLoginHistoryConfig;
    window.CSOSuperStore.resetLoginHistoryConfig = SuperStore.resetLoginHistoryConfig;
    window.CSOSuperStore.exportLoginHistoryManifest = SuperStore.exportLoginHistoryManifest;
    window.CSOSuperStore.getSecurityAlertsConfig = SuperStore.getSecurityAlertsConfig;
    window.CSOSuperStore.saveSecurityAlertsConfig = SuperStore.saveSecurityAlertsConfig;
    window.CSOSuperStore.resetSecurityAlertsConfig = SuperStore.resetSecurityAlertsConfig;
    window.CSOSuperStore.exportSecurityAlertsManifest = SuperStore.exportSecurityAlertsManifest;
    window.CSOSuperStore.getRateLimitsConfig = SuperStore.getRateLimitsConfig;
    window.CSOSuperStore.saveRateLimitsConfig = SuperStore.saveRateLimitsConfig;
    window.CSOSuperStore.resetRateLimitsConfig = SuperStore.resetRateLimitsConfig;
    window.CSOSuperStore.exportRateLimitsManifest = SuperStore.exportRateLimitsManifest;
    window.CSOSuperStore.getUploadSecurityConfig = SuperStore.getUploadSecurityConfig;
    window.CSOSuperStore.saveUploadSecurityConfig = SuperStore.saveUploadSecurityConfig;
    window.CSOSuperStore.resetUploadSecurityConfig = SuperStore.resetUploadSecurityConfig;
    window.CSOSuperStore.exportUploadSecurityManifest = SuperStore.exportUploadSecurityManifest;
    window.CSOSuperStore.getPrivacyConsentConfig = SuperStore.getPrivacyConsentConfig;
    window.CSOSuperStore.savePrivacyConsentConfig = SuperStore.savePrivacyConsentConfig;
    window.CSOSuperStore.resetPrivacyConsentConfig = SuperStore.resetPrivacyConsentConfig;
    window.CSOSuperStore.exportPrivacyConsentManifest = SuperStore.exportPrivacyConsentManifest;
    window.CSOSuperStore.getDataRetentionConfig = SuperStore.getDataRetentionConfig;
    window.CSOSuperStore.saveDataRetentionConfig = SuperStore.saveDataRetentionConfig;
    window.CSOSuperStore.resetDataRetentionConfig = SuperStore.resetDataRetentionConfig;
    window.CSOSuperStore.exportDataRetentionManifest = SuperStore.exportDataRetentionManifest;
    window.CSOSuperStore.getAccountDeletionConfig = SuperStore.getAccountDeletionConfig;
    window.CSOSuperStore.saveAccountDeletionConfig = SuperStore.saveAccountDeletionConfig;
    window.CSOSuperStore.resetAccountDeletionConfig = SuperStore.resetAccountDeletionConfig;
    window.CSOSuperStore.exportAccountDeletionManifest = SuperStore.exportAccountDeletionManifest;
    window.CSOSuperStore.getSecurityAuditLogsConfig = SuperStore.getSecurityAuditLogsConfig;
    window.CSOSuperStore.saveSecurityAuditLogsConfig = SuperStore.saveSecurityAuditLogsConfig;
    window.CSOSuperStore.resetSecurityAuditLogsConfig = SuperStore.resetSecurityAuditLogsConfig;
    window.CSOSuperStore.exportSecurityAuditLogsManifest = SuperStore.exportSecurityAuditLogsManifest;
    window.CSOSuperStore.getIncidentResponseConfig = SuperStore.getIncidentResponseConfig;
    window.CSOSuperStore.saveIncidentResponseConfig = SuperStore.saveIncidentResponseConfig;
    window.CSOSuperStore.resetIncidentResponseConfig = SuperStore.resetIncidentResponseConfig;
    window.CSOSuperStore.exportIncidentResponseManifest = SuperStore.exportIncidentResponseManifest;
    window.CSOSuperStore.getSystemHealthConfig = SuperStore.getSystemHealthConfig;
    window.CSOSuperStore.saveSystemHealthConfig = SuperStore.saveSystemHealthConfig;
    window.CSOSuperStore.resetSystemHealthConfig = SuperStore.resetSystemHealthConfig;
    window.CSOSuperStore.exportSystemHealthManifest = SuperStore.exportSystemHealthManifest;
    window.CSOSuperStore.getWebsiteAvailabilityConfig = SuperStore.getWebsiteAvailabilityConfig;
    window.CSOSuperStore.saveWebsiteAvailabilityConfig = SuperStore.saveWebsiteAvailabilityConfig;
    window.CSOSuperStore.resetWebsiteAvailabilityConfig = SuperStore.resetWebsiteAvailabilityConfig;
    window.CSOSuperStore.exportWebsiteAvailabilityManifest = SuperStore.exportWebsiteAvailabilityManifest;
    window.CSOSuperStore.getApiDiagnosticsConfig = SuperStore.getApiDiagnosticsConfig;
    window.CSOSuperStore.saveApiDiagnosticsConfig = SuperStore.saveApiDiagnosticsConfig;
    window.CSOSuperStore.resetApiDiagnosticsConfig = SuperStore.resetApiDiagnosticsConfig;
    window.CSOSuperStore.exportApiDiagnosticsManifest = SuperStore.exportApiDiagnosticsManifest;
    window.CSOSuperStore.getDatabaseHealthConfig = SuperStore.getDatabaseHealthConfig;
    window.CSOSuperStore.saveDatabaseHealthConfig = SuperStore.saveDatabaseHealthConfig;
    window.CSOSuperStore.resetDatabaseHealthConfig = SuperStore.resetDatabaseHealthConfig;
    window.CSOSuperStore.exportDatabaseHealthManifest = SuperStore.exportDatabaseHealthManifest;
    window.CSOSuperStore.getStorageMonitoringConfig = SuperStore.getStorageMonitoringConfig;
    window.CSOSuperStore.saveStorageMonitoringConfig = SuperStore.saveStorageMonitoringConfig;
    window.CSOSuperStore.resetStorageMonitoringConfig = SuperStore.resetStorageMonitoringConfig;
    window.CSOSuperStore.exportStorageMonitoringManifest = SuperStore.exportStorageMonitoringManifest;
    window.CSOSuperStore.getBackupCentreConfig = SuperStore.getBackupCentreConfig;
    window.CSOSuperStore.saveBackupCentreConfig = SuperStore.saveBackupCentreConfig;
    window.CSOSuperStore.resetBackupCentreConfig = SuperStore.resetBackupCentreConfig;
    window.CSOSuperStore.exportBackupCentreManifest = SuperStore.exportBackupCentreManifest;
    window.CSOSuperStore.getRestoreCentreConfig = SuperStore.getRestoreCentreConfig;
    window.CSOSuperStore.saveRestoreCentreConfig = SuperStore.saveRestoreCentreConfig;
    window.CSOSuperStore.resetRestoreCentreConfig = SuperStore.resetRestoreCentreConfig;
    window.CSOSuperStore.exportRestoreCentreManifest = SuperStore.exportRestoreCentreManifest;
    window.CSOSuperStore.getRevisionRollbackConfig = SuperStore.getRevisionRollbackConfig;
    window.CSOSuperStore.saveRevisionRollbackConfig = SuperStore.saveRevisionRollbackConfig;
    window.CSOSuperStore.resetRevisionRollbackConfig = SuperStore.resetRevisionRollbackConfig;
    window.CSOSuperStore.exportRevisionRollbackManifest = SuperStore.exportRevisionRollbackManifest;
    window.CSOSuperStore.getErrorLogsConfig = SuperStore.getErrorLogsConfig;
    window.CSOSuperStore.saveErrorLogsConfig = SuperStore.saveErrorLogsConfig;
    window.CSOSuperStore.resetErrorLogsConfig = SuperStore.resetErrorLogsConfig;
    window.CSOSuperStore.exportErrorLogsManifest = SuperStore.exportErrorLogsManifest;
    window.CSOSuperStore.getScheduledJobsConfig = SuperStore.getScheduledJobsConfig;
    window.CSOSuperStore.saveScheduledJobsConfig = SuperStore.saveScheduledJobsConfig;
    window.CSOSuperStore.resetScheduledJobsConfig = SuperStore.resetScheduledJobsConfig;
    window.CSOSuperStore.exportScheduledJobsManifest = SuperStore.exportScheduledJobsManifest;
    window.CSOSuperStore.getAutomationRulesConfig = SuperStore.getAutomationRulesConfig;
    window.CSOSuperStore.saveAutomationRulesConfig = SuperStore.saveAutomationRulesConfig;
    window.CSOSuperStore.resetAutomationRulesConfig = SuperStore.resetAutomationRulesConfig;
    window.CSOSuperStore.exportAutomationRulesManifest = SuperStore.exportAutomationRulesManifest;
    window.CSOSuperStore.getMaintenanceModeConfig = SuperStore.getMaintenanceModeConfig;
    window.CSOSuperStore.saveMaintenanceModeConfig = SuperStore.saveMaintenanceModeConfig;
    window.CSOSuperStore.resetMaintenanceModeConfig = SuperStore.resetMaintenanceModeConfig;
    window.CSOSuperStore.exportMaintenanceModeManifest = SuperStore.exportMaintenanceModeManifest;
  }
  if (typeof CSOSuperStore !== 'undefined') {
    CSOSuperStore._hydrateConfig = _hydrateConfig;
  }
})(window);
