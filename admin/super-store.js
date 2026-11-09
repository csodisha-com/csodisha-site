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
          inquiries: this.getInquiries()
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
    }
  };

  window.CSOSuperStore = SuperStore;
})(window);
