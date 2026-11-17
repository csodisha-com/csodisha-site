// /api/admin/* dispatcher. Every route is gated by requireRole() (and CSRF for writes).
import { HttpError, json, errorResponse, readJson, validationError, clientIp } from '../../_lib/http.js';
import { requireRole, rateLimit, audit, STAFF_ROLES, ALL_ROLES } from '../../_lib/rbac.js';
import { renderMarkdown } from '../../_lib/markdown.js';
import { backupCodeStatus, generateBackupCodes, twoFactorChannels, isTwoFactorConfigured } from '../../_lib/admin-2fa.js';
import { handleOpsSnapshots, handleOpsR2Vault } from '../../_lib/ops-snapshots.js';
import { handleOpsSentinel } from '../../_lib/ops-sentinel.js';
import { handleOpsHygiene } from '../../_lib/ops-hygiene.js';
import { handleOpsContinuity } from '../../_lib/ops-continuity.js';
import { handleSecurityRbac } from '../../_lib/security-rbac.js';
import { handleSecurityEdge } from '../../_lib/security-edge.js';
import { handleSecurityGovernance } from '../../_lib/security-governance.js';
import { handleSecurityCompliance } from '../../_lib/security-compliance.js';
import { handleContentPublishing } from '../../_lib/content-publishing.js';
import { handleStudyLibraryStudio } from '../../_lib/study-library-studio.js';
import { handleEduBatch1Admin } from '../../_lib/edu-resources-batch1.js';
import { handleEduBatch2Admin, getBatch2Overview } from '../../_lib/edu-resources-batch2.js';
import { handleEduBatch3Admin, getBatch3Overview } from '../../_lib/edu-resources-batch3.js';
import { handleEduBatch4Admin, getBatch4Overview } from '../../_lib/edu-resources-batch4.js';
import { handleEduBatch5Admin, getBatch5Overview } from '../../_lib/edu-resources-batch5.js';
import { handleEduBatch6Admin, getBatch6Overview, getFull22ModuleOverview } from '../../_lib/edu-resources-batch6.js';
import { handleCategoriesNavBatch1Admin, getCategoriesNavOverview } from '../../_lib/categories-nav-batch1.js';
import { handleCategoriesNavBatch2Admin, getCategoriesNavBatch2Overview } from '../../_lib/categories-nav-batch2.js';
import { handleCategoriesNavBatch3Admin, getFull11ModuleNavOverview } from '../../_lib/categories-nav-batch3.js';
import { handleFilesMediaBatch1Admin, getFilesMediaOverview } from '../../_lib/files-media-batch1.js';
import { handleFilesMediaBatch2Admin, getFilesMediaBatch2Overview } from '../../_lib/files-media-batch2.js';
import { handleFilesMediaBatch3Admin, getFilesMediaBatch3Overview } from '../../_lib/files-media-batch3.js';
import { handlePaymentsFinanceBatch1Admin } from '../../_lib/payments-finance-batch1.js';
import { handlePaymentsFinanceBatch2Admin } from '../../_lib/payments-finance-batch2.js';
import { handlePaymentsFinanceBatch3Admin } from '../../_lib/payments-finance-batch3.js';
import { handlePaymentsFinanceBatch4Admin } from '../../_lib/payments-finance-batch4.js';
import { handlePaymentsFinanceBatch5Admin } from '../../_lib/payments-finance-batch5.js';
import { handleUsersCommunityBatch1Admin } from '../../_lib/users-community-batch1.js';
import { handleUsersCommunityBatch2Admin, ensureUsersCommunityBatch2Schema } from '../../_lib/users-community-batch2.js';
import { handleUsersCommunityBatch3Admin, ensureUsersCommunityBatch3Schema } from '../../_lib/users-community-batch3.js';
import { handleUsersCommunityBatch4Admin, ensureUsersCommunityBatch4Schema } from '../../_lib/users-community-batch4.js';
import { handleUsersCommunityBatch5Admin, ensureUsersCommunityBatch5Schema, getFull19ModuleUsersOverview } from '../../_lib/users-community-batch5.js';
import { handleAnalyticsBatch1Admin } from '../../_lib/analytics-telemetry-batch1.js';
import { handleAnalyticsBatch2Admin, ensureAnalyticsTelemetryBatch2Schema } from '../../_lib/analytics-telemetry-batch2.js';
import { handleAnalyticsBatch3Admin, ensureAnalyticsTelemetryBatch3Schema } from '../../_lib/analytics-telemetry-batch3.js';
import { handleAnalyticsBatch4Admin, ensureAnalyticsTelemetryBatch4Schema, getFull14ModuleAnalyticsOverview } from '../../_lib/analytics-telemetry-batch4.js';
import { handleCommunicationsBatch1Admin } from '../../_lib/communications-batch1.js';
import { handleCommunicationsBatch2Admin, ensureCommunicationsBatch2Schema } from '../../_lib/communications-batch2.js';
import { handleCommunicationsBatch3Admin, ensureCommunicationsBatch3Schema, getFull12ModuleCommunicationsOverview } from '../../_lib/communications-batch3.js';
import { handleMarketingAdvertisingBatch1Admin } from '../../_lib/marketing-advertising-batch1.js';
import { handleMarketingAdvertisingBatch2Admin, ensureMarketingAdvertisingBatch2Schema, getMarketingBatch2Overview } from '../../_lib/marketing-advertising-batch2.js';
import { handleMarketingAdvertisingBatch3Admin, ensureMarketingAdvertisingBatch3Schema, getFull10ModuleMarketingOverview } from '../../_lib/marketing-advertising-batch3.js';
import { handleSeoSearchDiscoveryBatch1Admin } from '../../_lib/seo-search-discovery-batch1.js';
import { handleSeoSearchDiscoveryBatch2Admin, ensureSeoSearchDiscoveryBatch2Schema, getFull8ModuleSeoOverview } from '../../_lib/seo-search-discovery-batch2.js';
import { handleSeoSearchDiscoveryBatch3Admin, ensureSeoSearchDiscoveryBatch3Schema, getFull12ModuleSeoOverview } from '../../_lib/seo-search-discovery-batch3.js';
import { handleSeoSearchDiscoveryBatch4Admin, ensureSeoSearchDiscoveryBatch4Schema, getFull16ModuleSeoOverview } from '../../_lib/seo-search-discovery-batch4.js';
import { handleEventsSchedulingBatch1Admin } from '../../_lib/events-scheduling-batch1.js';
import { handleEventsSchedulingBatch2Admin, ensureEventsSchedulingBatch2Schema, getFull6ModuleEventsOverview } from '../../_lib/events-scheduling-batch2.js';
import { handleEventsSchedulingBatch3Admin, ensureEventsSchedulingBatch3Schema, getFull9ModuleEventsOverview } from '../../_lib/events-scheduling-batch3.js';
import { handleIntegrationsEdgeBatch1Admin } from '../../_lib/integrations-webhooks-edge-batch1.js';
import { handleIntegrationsEdgeBatch2Admin, ensureIntegrationsEdgeBatch2Schema, getFull8ModuleIntegrationsOverview } from '../../_lib/integrations-webhooks-edge-batch2.js';
import { handleIntegrationsEdgeBatch3Admin, ensureIntegrationsEdgeBatch3Schema, getFull11ModuleIntegrationsOverview } from '../../_lib/integrations-webhooks-edge-batch3.js';
import { handleSettingsConfigBatch1Admin } from '../../_lib/settings-configuration-batch1.js';
import { handleSettingsConfigBatch2Admin, ensureSettingsConfigBatch2Schema, getFull8ModuleSettingsOverview } from '../../_lib/settings-configuration-batch2.js';
import { handleFilesMediaBatch4Admin, getFull15ModuleMediaOverview } from '../../_lib/files-media-batch4.js';
import { handleJobsDirectoryStudio } from '../../_lib/jobs-directory-studio.js';
import { handleSchemesDirectoryStudio } from '../../_lib/schemes-directory-studio.js';
import { handleCommunityDirectoryStudio } from '../../_lib/community-directory-studio.js';
import { parsePaging, likeEscape } from '../../_lib/validate.js';
import { handlePosts, POST_TYPES } from './_posts.js';
import { handleMockTests, handleQuestion } from './_mock.js';
import { handleUpload } from './_media.js';
import { handleBanner, handleSettings, handleResources, handleMediaList, handleIncidents, extraStats } from './_site.js';
import { handlePages } from './pages.js';
import { handleSeedOdisha } from './seed-odisha.js';
import { handleAiGeneratePage } from './_ai.js';
import { runLifecycleMaintenance, readLastCronRun } from './_cron.js';
import { handleExamTaxonomy } from './_taxonomy.js';
import { handleAdminCandidates } from './_candidates.js';
import {
  handleJobsDirectoryAdmin,
  handleSchemesAdmin,
  handleFeedbackAdmin,
  handleFreshnessAudit,
  handleAboutDirectoryAdmin,
  handleSchemesDirectoryTreeAdmin,
  handleStudyLibraryDirectoryAdmin
} from './_ecosystem.js';

export async function handleAdminApi(request, env) {
  try {
    if (!env.DB) throw new HttpError(500, 'NO_DATABASE', 'Database unavailable');
    const url = new URL(request.url);
    const parts = url.pathname.replace(/^\/api\/admin\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const [resource, id, sub, extra] = parts;
    const method = request.method;
    const write = method !== 'GET' && method !== 'HEAD';

    // Admin-only: user role management, URC Batch 1-5 (01-19) & candidate behavior governance.
    if (resource === 'users') {
      const actor = await requireRole(request, env, ['admin']);
      if (write) await rateLimit(env, `admin-write:${actor.userId}`, 120, 300);
      if (['shared-knowledge', 'topic-suggestions', 'error-reports'].includes(id)) {
        return await handleUsersCommunityBatch5Admin(request, env, actor, id, sub, extra);
      }
      if (['activity', 'data-requests', 'forum', 'questions'].includes(id)) {
        return await handleUsersCommunityBatch4Admin(request, env, actor, id, sub, extra);
      }
      if (['comments', 'moderation', 'reports', 'blocked-accounts'].includes(id)) {
        return await handleUsersCommunityBatch3Admin(request, env, actor, id, sub, extra);
      }
      if (['account-status', 'registrations', 'membership-access', 'community-posts'].includes(id)) {
        return await handleUsersCommunityBatch2Admin(request, env, actor, id, sub, extra);
      }
      if (id === 'overview' && method === 'GET') {
        return json(await getFull19ModuleUsersOverview(env));
      }
      if (['directory', 'profiles', 'roles', 'admins', 'revisions'].includes(id)) {
        if (id === 'revisions') await ensureUsersCommunityBatch5Schema(env.DB);
        return await handleUsersCommunityBatch1Admin(request, env, actor, id, sub, extra);
      }
      return await handleUsers(request, env, actor, id, sub);
    }
    if (resource === 'analytics') {
      const actor = await requireRole(request, env, STAFF_ROLES);
      if (write) await rateLimit(env, `admin-write:${actor.userId}`, 120, 300);
      if (['dpdp-audits', 'executive-digests'].includes(id)) {
        return await handleAnalyticsBatch4Admin(request, env, actor, id, sub, extra);
      }
      if (['outbound', 'funnels', 'bilingual', 'community-index'].includes(id)) {
        return await handleAnalyticsBatch3Admin(request, env, actor, id, sub, extra);
      }
      if (['demographics', 'web-vitals', 'feedback', 'sentinel-404'].includes(id)) {
        return await handleAnalyticsBatch2Admin(request, env, actor, id, sub, extra);
      }
      if (id === 'overview' && method === 'GET') {
        return json(await getFull14ModuleAnalyticsOverview(env));
      }
      if (id === 'revisions') await ensureAnalyticsTelemetryBatch4Schema(env.DB);
      return await handleAnalyticsBatch1Admin(request, env, actor, id, sub, extra);
    }
    if (resource === 'communications') {
      const actor = await requireRole(request, env, STAFF_ROLES);
      if (write) await rateLimit(env, `admin-write:${actor.userId}`, 120, 300);
      if (['dpdp-optouts', 'variable-tags', 'dlr', 'queue'].includes(id)) {
        return await handleCommunicationsBatch3Admin(request, env, actor, id, sub, extra);
      }
      if (['scheme-alerts', 'whatsapp', 'telegram', 'frequency-caps'].includes(id)) {
        return await handleCommunicationsBatch2Admin(request, env, actor, id, sub, extra);
      }
      if (id === 'overview' && method === 'GET') {
        return json(await getFull12ModuleCommunicationsOverview(env));
      }
      if (id === 'revisions') {
        await ensureCommunicationsBatch2Schema(env.DB);
        await ensureCommunicationsBatch3Schema(env.DB);
      }
      return await handleCommunicationsBatch1Admin(request, env, actor, id, sub, extra);
    }
    if (resource === 'marketing') {
      const actor = await requireRole(request, env, STAFF_ROLES);
      if (write) await rateLimit(env, `admin-write:${actor.userId}`, 120, 300);
      if (['landing-pages', 'reports'].includes(id)) {
        return await handleMarketingAdvertisingBatch3Admin(request, env, actor, id, sub, extra);
      }
      if (['referrals', 'analytics', 'utm', 'social-cards'].includes(id)) {
        return await handleMarketingAdvertisingBatch2Admin(request, env, actor, id, sub, extra);
      }
      if (id === 'overview' && method === 'GET') {
        return json(await getFull10ModuleMarketingOverview(env));
      }
      if (id === 'revisions') {
        await ensureMarketingAdvertisingBatch2Schema(env.DB);
        await ensureMarketingAdvertisingBatch3Schema(env.DB);
      }
      return await handleMarketingAdvertisingBatch1Admin(request, env, actor, id, sub, extra);
    }
    if (resource === 'seo') {
      const actor = await requireRole(request, env, STAFF_ROLES);
      if (write) await rateLimit(env, `admin-write:${actor.userId}`, 120, 300);
      if (['rich-snippets', 'link-graph', 'slug-normalizer', 'search-intent'].includes(id)) {
        return await handleSeoSearchDiscoveryBatch4Admin(request, env, actor, id, sub, extra);
      }
      if (['autocomplete', 'zero-fallbacks', 'indexnow', 'edge-hints'].includes(id)) {
        return await handleSeoSearchDiscoveryBatch3Admin(request, env, actor, id, sub, extra);
      }
      if (['redirects', 'robots', 'tokenizer', 'synonyms'].includes(id)) {
        return await handleSeoSearchDiscoveryBatch2Admin(request, env, actor, id, sub, extra);
      }
      if (id === 'overview' && method === 'GET') {
        return json(await getFull16ModuleSeoOverview(env));
      }
      if (id === 'revisions') {
        await ensureSeoSearchDiscoveryBatch2Schema(env.DB);
        await ensureSeoSearchDiscoveryBatch3Schema(env.DB);
        await ensureSeoSearchDiscoveryBatch4Schema(env.DB);
      }
      return await handleSeoSearchDiscoveryBatch1Admin(request, env, actor, id, sub, extra);
    }
    if (resource === 'events') {
      const actor = await requireRole(request, env, STAFF_ROLES);
      if (write) await rateLimit(env, `admin-write:${actor.userId}`, 120, 300);
      if (['meetups', 'webinars', 'calendar-sync'].includes(id)) {
        return await handleEventsSchedulingBatch3Admin(request, env, actor, id, sub, extra);
      }
      if (['admit-cards', 'answer-keys', 'results-dv'].includes(id)) {
        return await handleEventsSchedulingBatch2Admin(request, env, actor, id, sub, extra);
      }
      if (id === 'overview' && method === 'GET') {
        return json(await getFull9ModuleEventsOverview(env));
      }
      if (id === 'revisions') {
        await ensureEventsSchedulingBatch3Schema(env.DB);
      }
      return await handleEventsSchedulingBatch1Admin(request, env, actor, id, sub, extra);
    }
    if (resource === 'integrations') {
      const actor = await requireRole(request, env, STAFF_ROLES);
      if (write) await rateLimit(env, `admin-write:${actor.userId}`, 120, 300);
      if (['sms-otp-gateways', 'health-monitors', 'dlq-logs'].includes(id)) {
        return await handleIntegrationsEdgeBatch3Admin(request, env, actor, id, sub, extra);
      }
      if (['whatsapp-connectors', 'api-gateway', 'inbound-receivers', 'd1-sync'].includes(id)) {
        return await handleIntegrationsEdgeBatch2Admin(request, env, actor, id, sub, extra);
      }
      if (id === 'overview' && method === 'GET') {
        return json(await getFull11ModuleIntegrationsOverview(env));
      }
      if (id === 'revisions') {
        await ensureIntegrationsEdgeBatch3Schema(env.DB);
      }
      return await handleIntegrationsEdgeBatch1Admin(request, env, actor, id, sub, extra);
    }
    if (resource === 'candidates') {
      const actor = await requireRole(request, env, ['admin']);
      if (write) await rateLimit(env, `admin-write:${actor.userId}`, 120, 300);
      return await handleAdminCandidates(request, env, actor, id);
    }

    // Admin-only: manual lifecycle & D1 maintenance trigger.
    if (resource === 'maintenance') {
      if (id === 'run') {
        if (method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
        const actor = await requireRole(request, env, ['admin']);
        await rateLimit(env, `admin-write:${actor.userId}`, 120, 300);
        const summary = await runLifecycleMaintenance(env, { actorId: actor.userId, ipAddress: clientIp(request) });
        return json({ ok: true, ...summary, last_cron_run: summary });
      }
      if (!id && method === 'GET') {
        await requireRole(request, env, STAFF_ROLES);
        return json({ last_cron_run: await readLastCronRun(env) });
      }
      throw new HttpError(404, 'NOT_FOUND', 'Unknown admin route');
    }

    // Admin-only: multi-factor recovery codes. GET => remaining unused count, POST => regenerate 8 fresh codes.
    if (resource === 'auth' && id === 'backup-codes' && !sub) {
      if (method !== 'GET' && method !== 'POST') throw new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed');
      const actor = await requireRole(request, env, ['admin']);
      if (method === 'GET') {
        const st = await backupCodeStatus(env);
        return json({ ...st, channels: twoFactorChannels(env), enforced: isTwoFactorConfigured(env) }, 200, { 'Cache-Control': 'no-store' });
      }
      await rateLimit(env, `admin-backup-codes:${actor.userId}`, 5, 3600);
      const codes = await generateBackupCodes(env);
      await audit(env, request, actor, 'auth.backup_codes.regenerate', 'admin_backup_codes', null, { count: codes.length });
      return json({ codes, remaining: codes.length, total: codes.length }, 200, { 'Cache-Control': 'no-store' });
    }

    // Admin-only: idempotent Odisha starter content seeder.
    if (resource === 'seed-odisha' && !id) {
      const actor = await requireRole(request, env, ['admin']);
      await rateLimit(env, `admin-write:${actor.userId}`, 30, 300);
      return await handleSeedOdisha(request, env, actor);
    }

    const actor = await requireRole(request, env, STAFF_ROLES);
    if (write) await rateLimit(env, `admin-write:${actor.userId}`, 120, 300);

    switch (resource) {
      case 'session':
        return json({ user: { id: actor.userId, email: actor.email, role: actor.role } });
      case 'stats':
        return await handleStats(env);
      case 'audit':
        return await handleAudit(request, env);
      case 'preview': {
        if (method !== 'POST') break;
        const body = await readJson(request, 200000);
        return json({ html: renderMarkdown(body.markdown || '') });
      }
      case 'current-affairs':
      case 'jobs':
        return await handlePosts(request, env, actor, resource, id, sub);
      case 'mock-tests':
        return await handleMockTests(request, env, actor, id, sub);
      case 'questions':
        if (id && !sub) return await handleQuestion(request, env, actor, id);
        break;
      case 'banner':
        if (!id) return await handleBanner(request, env, actor);
        break;
      case 'settings':
        if (['languages', 'timezone', 'formats', 'homepage'].includes(id)) {
          return await handleSettingsConfigBatch2Admin(request, env, actor, id, sub, extra);
        }
        if (id === 'overview' && method === 'GET') {
          return json(await getFull8ModuleSettingsOverview(env));
        }
        if (id === 'revisions') {
          await ensureSettingsConfigBatch2Schema(env.DB);
        }
        if (['general', 'identity', 'contact', 'localization', 'revisions'].includes(id)) {
          return await handleSettingsConfigBatch1Admin(request, env, actor, id, sub);
        }
        return await handleSettings(request, env, actor, id);
      case 'resources':
        if (!sub) return await handleResources(request, env, actor, id);
        break;
      case 'pages':
        return await handlePages(request, env, actor, id);
      case 'exam-taxonomy':
        if (!sub) return await handleExamTaxonomy(request, env, actor, id);
        break;
      case 'jobs-directory':
        if (id === 'tree' || id === 'folders' || id === 'items' || id === 'suggestions') {
          return await handleJobsDirectoryStudio(request, env, actor, id, sub, extra);
        }
        if (!sub) return await handleJobsDirectoryAdmin(request, env, actor, id);
        break;
      case 'about-directory':
        if (!sub) return await handleAboutDirectoryAdmin(request, env, actor, id);
        break;
      case 'schemes':
        if (!sub) return await handleSchemesAdmin(request, env, actor, id);
        break;
      case 'schemes-directory':
        if (id === 'tree' || id === 'folders' || id === 'items' || id === 'suggestions') {
          return await handleSchemesDirectoryStudio(request, env, actor, id, sub, extra);
        }
        if (!sub) return await handleSchemesDirectoryTreeAdmin(request, env, actor, id);
        break;
      case 'community-directory':
        return await handleCommunityDirectoryStudio(request, env, actor, id, sub, extra);
      case 'study-library':
        return await handleStudyLibraryStudio(request, env, actor, id, sub, extra);
      case 'edu': {
        if (id === 'resources' && sub === 'upload' && method === 'POST') {
          await rateLimit(env, `admin-upload:${actor.userId}`, 30, 600);
        }
        if (id === 'overview' && method === 'GET') {
          const b1 = await (await handleEduBatch1Admin(request, env, actor, id, sub, extra)).json();
          const b2 = await getBatch2Overview(env);
          const b3 = await getBatch3Overview(env);
          const b4 = await getBatch4Overview(env);
          const b5 = await getBatch5Overview(env);
          const b6 = await getBatch6Overview(env);
          const suite22 = await getFull22ModuleOverview(env);
          return json({ ...b1, batch2: b2, batch3: b3, batch4: b4, batch5: b5, batch6: b6, suite_22: suite22 });
        }
        const b6Res = await handleEduBatch6Admin(request, env, actor, id, sub);
        if (b6Res) return b6Res;
        const b5Res = await handleEduBatch5Admin(request, env, actor, id, sub);
        if (b5Res) return b5Res;
        const b4Res = await handleEduBatch4Admin(request, env, actor, id, sub);
        if (b4Res) return b4Res;
        const b3Res = await handleEduBatch3Admin(request, env, actor, id, sub);
        if (b3Res) return b3Res;
        const b2Res = await handleEduBatch2Admin(request, env, actor, id, sub);
        if (b2Res) return b2Res;
        return await handleEduBatch1Admin(request, env, actor, id, sub, extra);
      }
      case 'nav': {
        if (id === 'overview' && method === 'GET') {
          const b1 = await getCategoriesNavOverview(env);
          const b2 = await getCategoriesNavBatch2Overview(env);
          const suite11 = await getFull11ModuleNavOverview(env);
          return json({ ok: true, ...b1, batch2: b2, suite_11: suite11 });
        }
        const nav3Res = await handleCategoriesNavBatch3Admin(request, env, actor, id, sub);
        if (nav3Res) return nav3Res;
        const nav2Res = await handleCategoriesNavBatch2Admin(request, env, actor, id, sub);
        if (nav2Res) return nav2Res;
        const navRes = await handleCategoriesNavBatch1Admin(request, env, actor, id, sub);
        if (navRes) return navRes;
        break;
      }
      case 'study-library-directory':
        if (!sub) return await handleStudyLibraryDirectoryAdmin(request, env, actor, id);
        break;
      case 'feedback':
        if (!sub) return await handleFeedbackAdmin(request, env, actor, id);
        break;
      case 'freshness':
        if (!id && method === 'GET') return await handleFreshnessAudit(env);
        break;
      case 'ai':
        if (id === 'generate-page') return await handleAiGeneratePage(request, env, actor);
        break;
      case 'utils':
        if (id === 'check-links' && method === 'POST') return await handleCheckLinks(request, env);
        break;
      case 'incidents':
        return await handleIncidents(request, env, actor, id, sub);
      case 'content':
        if (id === 'upload' && method === 'POST') {
          await rateLimit(env, `admin-upload:${actor.userId}`, 30, 600);
        }
        return await handleContentPublishing(request, env, actor, id, sub, extra);
      case 'security':
        if (id === 'lockdown' || id === 'dpdp' || id === 'incidents') {
          return await handleSecurityCompliance(request, env, actor, id, sub, extra);
        }
        if (id === 'pii-masking' || id === 'api-keys' || id === 'origin-headers') {
          return await handleSecurityGovernance(request, env, actor, id, sub, extra);
        }
        if (id === 'bot-deterrence' || id === 'audit-stream' || id === 'ip-geofence' || id === '2fa') {
          return await handleSecurityEdge(request, env, actor, id, sub);
        }
        return await handleSecurityRbac(request, env, actor, id, sub);
      case 'ops':
        if (id === 'snapshots') return await handleOpsSnapshots(request, env, actor, sub, extra);
        if (id === 'r2-vault') return await handleOpsR2Vault(request, env, actor, sub);
        if (id === 'freeze' || id === 'cache' || id === 'cache-warmer' || id === 'health' || id === 'sentinel' || id === 'canary') return await handleOpsSentinel(request, env, actor, id, sub);
        if (id === 'schema' || id === 'ddl-journal' || id === 'vacuum' || id === 'forensics' || id === 'retention') return await handleOpsHygiene(request, env, actor, id, sub);
        if (id === 'replica' || id === 'replica-switchover' || id === 'airgap-bundle' || id === 'runbooks' || id === 'sop' || id === 'playbook') return await handleOpsContinuity(request, env, actor, id, sub, extra);
        break;
      case 'finance': {
        const fin5Res = await handlePaymentsFinanceBatch5Admin(request, env, actor, id, sub, extra);
        if (fin5Res) return fin5Res;
        const fin4Res = await handlePaymentsFinanceBatch4Admin(request, env, actor, id, sub);
        if (fin4Res) return fin4Res;
        const fin3Res = await handlePaymentsFinanceBatch3Admin(request, env, actor, id, sub);
        if (fin3Res) return fin3Res;
        const fin2Res = await handlePaymentsFinanceBatch2Admin(request, env, actor, id, sub);
        if (fin2Res) return fin2Res;
        const finRes = await handlePaymentsFinanceBatch1Admin(request, env, actor, id, sub);
        if (finRes) return finRes;
        break;
      }
      case 'media':
        if (!id && method === 'GET') return await handleMediaList(request, env);
        if (id === 'overview' && method === 'GET') {
          const b1 = await getFilesMediaOverview(env);
          const b2 = await getFilesMediaBatch2Overview(env);
          const b3 = await getFilesMediaBatch3Overview(env);
          const suite15 = await getFull15ModuleMediaOverview(env);
          return json({ ok: true, ...b1, batch2: b2, batch3: b3, suite_15: suite15 });
        }
        if (id === 'upload' && method === 'POST') {
          await rateLimit(env, `admin-upload:${actor.userId}`, 30, 600);
          const vaultRes = await handleFilesMediaBatch1Admin(request, env, actor, id, sub);
          if (vaultRes) return vaultRes;
        }
        if (id) {
          const media4Res = await handleFilesMediaBatch4Admin(request, env, actor, id, sub);
          if (media4Res) return media4Res;
          const media3Res = await handleFilesMediaBatch3Admin(request, env, actor, id, sub);
          if (media3Res) return media3Res;
          const media2Res = await handleFilesMediaBatch2Admin(request, env, actor, id, sub);
          if (media2Res) return media2Res;
          const media1Res = await handleFilesMediaBatch1Admin(request, env, actor, id, sub);
          if (media1Res) return media1Res;
        }
        break;
    }
    throw new HttpError(404, 'NOT_FOUND', 'Unknown admin route');
  } catch (e) {
    return errorResponse(e);
  }
}

async function handleStats(env) {
  const one = async sql => (await env.DB.prepare(sql).first()).n;
  const [ca, caPub, jobs, jobsPub, jobsExp, tests, testsPub, scheduled] = await Promise.all([
    one("SELECT COUNT(*) AS n FROM posts WHERE type='current_affair' AND deleted_at IS NULL"),
    one("SELECT COUNT(*) AS n FROM posts WHERE type='current_affair' AND deleted_at IS NULL AND (status='published' OR (status='scheduled' AND published_at <= datetime('now')))"),
    one("SELECT COUNT(*) AS n FROM posts WHERE type='job' AND deleted_at IS NULL"),
    one("SELECT COUNT(*) AS n FROM posts WHERE type='job' AND deleted_at IS NULL AND (status='published' OR (status='scheduled' AND published_at <= datetime('now')))"),
    one("SELECT COUNT(*) AS n FROM posts WHERE type='job' AND deleted_at IS NULL AND status='expired'"),
    one('SELECT COUNT(*) AS n FROM mock_tests WHERE deleted_at IS NULL'),
    one("SELECT COUNT(*) AS n FROM mock_tests WHERE deleted_at IS NULL AND (status='published' OR (status='scheduled' AND published_at <= datetime('now')))"),
    one("SELECT (SELECT COUNT(*) FROM posts WHERE status='scheduled' AND published_at > datetime('now') AND deleted_at IS NULL) + (SELECT COUNT(*) FROM mock_tests WHERE status='scheduled' AND published_at > datetime('now') AND deleted_at IS NULL) AS n")
  ]);
  const { results } = await env.DB.prepare(
    `SELECT a.id, a.action, a.target_type, a.target_id, a.metadata_json, a.created_at, u.email AS actor_email
     FROM audit_log a LEFT JOIN users u ON u.id = a.actor_user_id ORDER BY a.id DESC LIMIT 10`
  ).all();
  const extra = await extraStats(env);
  return json({
    ...extra,
    current_affairs: { total: ca, live: caPub }, jobs: { total: jobs, live: jobsPub, expired: jobsExp },
    mock_tests: { total: tests, live: testsPub }, scheduled_pending: scheduled, recent_audit: results
  });
}

async function handleAudit(request, env) {
  const url = new URL(request.url);
  const { page, limit, offset } = parsePaging(url, 25, 100);
  const kind = url.searchParams.get('kind') || 'all';
  const KINDS = {
    all: '1=1', incident: "a.action LIKE 'incident.%'", security: "(a.action LIKE 'incident.%' OR a.action LIKE 'user.%')",
    content: "a.action NOT LIKE 'incident.%' AND a.action NOT LIKE 'user.%'"
  };
  if (!KINDS[kind]) throw validationError({ kind: 'Unknown filter' });
  const where = [KINDS[kind]]; const binds = [];
  const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
  if (q) { where.push("(a.action LIKE ? ESCAPE '\\' OR u.email LIKE ? ESCAPE '\\')"); const l = likeEscape(q); binds.push(l, l); }
  const w = where.join(' AND ');
  const total = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM audit_log a LEFT JOIN users u ON u.id = a.actor_user_id WHERE ${w}`).bind(...binds).first()).n;
  const { results } = await env.DB.prepare(
    `SELECT a.id, a.action, a.target_type, a.target_id, a.metadata_json, a.ip_address, a.created_at, u.email AS actor_email
     FROM audit_log a LEFT JOIN users u ON u.id = a.actor_user_id WHERE ${w} ORDER BY a.id DESC LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();
  return json({ items: results, page, limit, total });
}

async function handleUsers(request, env, actor, id, sub) {
  const url = new URL(request.url);
  if (!id && request.method === 'GET') {
    const { page, limit, offset } = parsePaging(url);
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const role = url.searchParams.get('role');
    const where = []; const binds = [];
    if (q) {
      where.push("(u.email LIKE ? ESCAPE '\\' OR c.full_name LIKE ? ESCAPE '\\' OR c.phone LIKE ? ESCAPE '\\' OR c.district LIKE ? ESCAPE '\\')");
      const l = likeEscape(q); binds.push(l, l, l, l);
    }
    if (role) {
      if (!ALL_ROLES.includes(role)) throw validationError({ role: 'Unknown role' });
      where.push('u.role = ?'); binds.push(role);
    }
    const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
    const from = 'FROM users u LEFT JOIN candidates c ON c.id = u.id OR c.email = u.email';
    const total = (await env.DB.prepare(`SELECT COUNT(DISTINCT u.id) AS n ${from} ${w}`).bind(...binds).first()).n;
    const { results } = await env.DB.prepare(
      `SELECT u.id, u.email, u.role, u.created_at, MAX(c.full_name) AS full_name, MAX(c.phone) AS phone, MAX(c.district) AS district,
         MAX(c.last_login_at) AS last_login_at
       ${from} ${w} GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?`
    ).bind(...binds, limit, offset).all();
    return json({ items: results, page, limit, total });
  }
  if (id && sub === 'role' && request.method === 'PUT') {
    const body = await readJson(request, 10000);
    if (!ALL_ROLES.includes(body.role)) throw validationError({ role: 'Role must be candidate, editor or admin' });
    const target = await env.DB.prepare('SELECT id, email, role FROM users WHERE id = ?').bind(id).first();
    if (!target) throw new HttpError(404, 'NOT_FOUND', 'User not found');
    if (target.id === actor.userId && body.role !== 'admin') {
      throw new HttpError(409, 'CONFLICT', 'You cannot remove your own admin role');
    }
    await env.DB.prepare("UPDATE users SET role = ?, updated_at = ? WHERE id = ?").bind(body.role, Math.floor(Date.now() / 1000), id).run();
    await audit(env, request, actor, 'user.role_change', 'user', id, { email: target.email, from: target.role, to: body.role });
    return json({ id, role: body.role });
  }
  throw new HttpError(404, 'NOT_FOUND', 'Unknown admin route');
}

async function handleCheckLinks(request, env) {
  const body = await readJson(request, 20000);
  const rawUrls = Array.isArray(body.urls) ? body.urls : [];
  const urls = [...new Set(rawUrls.map(u => String(u || '').trim()).filter(Boolean))].slice(0, 30);
  const isPrivateHost = host => /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|\[::1\])/i.test(host);

  const results = await Promise.all(urls.map(async u => {
    if (u.startsWith('/') && !u.startsWith('//')) {
      try {
        if (u.startsWith('/api/media/') && env.MEDIA) {
          const key = decodeURIComponent(u.slice('/api/media/'.length).split('?')[0]);
          const head = await env.MEDIA.head(key);
          return { url: u, ok: !!head, status: head ? 200 : 404, note: head ? '200 OK (R2)' : '404 Not Found' };
        }
        if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
          const ar = await env.ASSETS.fetch(new URL(u, request.url));
          if (ar.ok) return { url: u, ok: true, status: ar.status, note: '200 OK' };
        }
        if (env.DB) {
          const path = u.split('?')[0];
          const row = await env.DB.prepare("SELECT status FROM site_pages WHERE route IN (?, ?, ?) LIMIT 1").bind(path, path.endsWith('/') ? path.slice(0, -1) : path + '/', path).first();
          if (row) return { url: u, ok: true, status: 200, note: '200 OK (' + row.status + ')' };
        }
        return { url: u, ok: false, status: 404, note: '404 Not Found' };
      } catch {
        return { url: u, ok: false, status: 0, note: 'Check Error' };
      }
    }
    if (!/^https?:\/\//i.test(u)) return { url: u, ok: false, status: 0, note: 'Invalid Scheme' };
    let parsed;
    try { parsed = new URL(u); } catch { return { url: u, ok: false, status: 0, note: 'Invalid URL' }; }
    if (isPrivateHost(parsed.hostname)) return { url: u, ok: false, status: 0, note: 'Blocked Host' };

    const isDrive = /(^|\.)(drive|docs)\.google\.com$/i.test(parsed.hostname);
    const pingUrl = async m => fetch(u, {
      method: m,
      redirect: 'follow',
      headers: m === 'GET' ? { 'User-Agent': 'CSOdisha-LinkChecker/1.0', Range: 'bytes=0-0' } : { 'User-Agent': 'CSOdisha-LinkChecker/1.0' },
      signal: AbortSignal.timeout(5000)
    });
    try {
      let res = await pingUrl('HEAD');
      if (res.status === 405 || res.status === 403 || res.status === 501) res = await pingUrl('GET');
      if (isDrive && (res.status === 401 || res.status === 403 || /accounts\.google\.com/i.test(res.url || ''))) {
        return { url: u, ok: false, status: res.status, note: 'Private / Auth Required' };
      }
      if (res.ok) return { url: u, ok: true, status: res.status, note: '200 OK' };
      if (res.status === 401 || res.status === 403) return { url: u, ok: false, status: res.status, note: 'Private / Auth Required' };
      return { url: u, ok: false, status: res.status, note: res.status + ' Error' };
    } catch {
      return { url: u, ok: false, status: 0, note: '404 / Timeout' };
    }
  }));
  return json({ results });
}
