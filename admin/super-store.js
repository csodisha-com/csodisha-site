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

    // 25. About Us & Institutional Mission Engine (module-03-002)
    getAboutConfig() {
      let config = null;
      try {
        const raw = localStorage.getItem('cso_about_config');
        if (raw) config = JSON.parse(raw);
      } catch (_) {}

      if (!config || typeof config !== 'object') {
        config = {
          headline: "Democratizing Academic & Career Intelligence for Odisha's Youth",
          subheadline: "A dedicated non-profit digital gateway providing verified syllabi, state exam patterns, and scholarship navigation across all 30 districts.",
          mission: "To eliminate geographic and socio-economic information barriers for competitive examination aspirants in Odisha by delivering authenticated, zero-cost academic intelligence and verified state syllabus breakdowns.",
          vision: "An Odisha where every candidate from Mayurbhanj to Koraput possesses equal, transparent access to recruitment notifications, verified learning materials, and mentorship tools to realize their full potential.",
          pillars: [
            {
              id: "PIL-01",
              title: "Verified Authenticity",
              description: "All examination syllabi, government notifications, and study materials are cross-checked against official state gazettes and board notices.",
              icon: "shield"
            },
            {
              id: "PIL-02",
              title: "Universal 30-District Access",
              description: "Low-bandwidth optimized, fast static delivery ensuring aspirants in rural and tribal districts can study without interruption.",
              icon: "globe"
            },
            {
              id: "PIL-03",
              title: "100% Free & Open Public Resource",
              description: "No paywalls, subscriptions, or predatory monetization schemes on foundational public educational resources.",
              icon: "sparkles"
            },
            {
              id: "PIL-04",
              title: "Aspirant-Centric Architecture",
              description: "Engineered specifically for state candidates preparing for OSSC, OPSC, OSSSC, Teaching (OTET/OSSTET), and Odisha Police.",
              icon: "academic"
            }
          ],
          milestones: [
            {
              year: "2023",
              title: "Odisha Education Gateway Inception",
              description: "Conceptualized as a grassroots community repository for rural Odisha students lacking access to high-cost coaching institutes."
            },
            {
              year: "2024",
              title: "State Syllabus Digitization",
              description: "Digitized 1,200+ pages of official OPSC and OSSC exam syllabi into interactive online study guides."
            },
            {
              year: "2025",
              title: "30-District Aspirant Milestone",
              description: "Reached over 50,000 monthly active aspirants across all 30 revenue districts of Odisha with instant notification alerts."
            },
            {
              year: "2026",
              title: "Master Enterprise Admin & Architecture",
              description: "Deployed the 241-module sovereign admin operations suite and unified offline-first study library."
            }
          ],
          updatedAt: new Date().toISOString()
        };

        try {
          localStorage.setItem('cso_about_config', JSON.stringify(config));
        } catch (_) {}
      }

      return config;
    },

    saveAboutConfig(config) {
      if (!config || typeof config !== 'object') return false;
      config.updatedAt = new Date().toISOString();
      save('cso_about_config', config);
      this.logAudit('ABOUT_CONFIG_UPDATED', 'ABOUT_MANAGEMENT', `About Us content, pillars, and institutional milestones updated.`);
      return config;
    },

    exportAboutManifest() {
      const config = this.getAboutConfig();
      const timestamp = Date.now();
      const filename = `cso-about-mission-${timestamp}.json`;
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

      this.logAudit('ABOUT_MANIFEST_EXPORTED', 'DATA_EXPORT', `About Us & Mission manifest exported (${filename}).`);
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
