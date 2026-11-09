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

  // Attach directly so both this._hydrateConfig and standalone _hydrateConfig work
  if (typeof window !== 'undefined' && window.CSOSuperStore) {
    window.CSOSuperStore._hydrateConfig = _hydrateConfig;
  }
  if (typeof CSOSuperStore !== 'undefined') {
    CSOSuperStore._hydrateConfig = _hydrateConfig;
  }
})(window);
