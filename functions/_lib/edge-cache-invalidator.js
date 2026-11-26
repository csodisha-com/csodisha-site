// Shared Edge & Isolate Cache Invalidation Helper (v231)
// Immediately purges public edge-cached responses and isolate memos when Admin mutations occur.
import { resetPublicContentMemo } from '../api/content/_public.js';
import { invalidateSitePagesCache } from './site-pages.js';
import { resetAboutOverviewMemo } from '../api/public/about-overview.js';

export const PUBLIC_EDGE_CACHE_HEADER = 'public, max-age=15, s-maxage=300, stale-while-revalidate=60';
export const EDGE_CACHE_KEY_VERSION = 'v260';

export const SETTINGS_PUBLIC_PATHS = ['/api/config/public'];

export const NAV_PUBLIC_PATHS = [
  '/api/nav/config',
  '/',
  '/index.html',
  '/jobs/',
  '/jobs-careers/',
  '/careers/',
  '/schemes-benefits/',
  '/schemes/',
  '/study/',
  '/study-library/',
  '/guides/',
  '/resources/',
  '/mock-tests/',
  '/current-affairs/',
  '/community/',
  '/student-dashboard/',
  '/about/'
];

export const CONTENT_PUBLIC_PATHS = [
  '/api/public/home-feed',
  '/api/home/feed',
  '/api/public/guides',
  '/guides/',
  '/sitemap.xml',
  '/api/public/homepage-blocks',
  '/api/homepage/blocks',
  '/api/public/jobs',
  '/api/public/jobs/list',
  '/api/public/jobs/tree',
  '/api/public/jobs/bootstrap',
  '/api/public/jobs/article',
  '/api/public/jobs-hub',
  '/api/public/careers/bootstrap',
  '/api/public/careers/list',
  '/api/public/schemes',
  '/api/public/schemes/list',
  '/api/public/schemes/tree',
  '/api/public/schemes/bootstrap',
  '/api/public/schemes/article',
  '/api/public/study',
  '/api/public/study/tree',
  '/api/public/study/bootstrap',
  '/api/public/study/article',
  '/api/public/study-library/bootstrap',
  '/api/public/study-library/list',
  '/api/public/community/tree',
  '/api/public/community/posts',
  '/api/public/community/list',
  '/api/public/community/bootstrap',
  '/api/public/community/post',
  '/api/public/about/tree',
  '/api/public/about/pages',
  '/api/public/about/bootstrap',
  '/api/public/about/article',
  '/api/public/about/sources',
  '/api/content/jobs',
  '/api/content/current-affairs',
  '/api/content/jobs-directory',
  '/api/content/schemes-directory',
  '/api/content/schemes',
  '/api/content/study-library-directory',
  '/api/content/about-directory',
  '/api/content/mock-tests',
  '/api/content/resources',
  '/api/content/banner',
  '/api/content/exam-taxonomy',
  '/api/content/platform-stats',
  '/api/content/changelog',
  '/api/public/about-overview',
  '/api/public/current-affairs',
  '/api/public/jobs-directory/overview',
  '/api/public/jobs-directory/items',
  '/api/public/schemes-directory/overview',
  '/api/public/schemes-directory/items',
  '/api/public/study-library/items',
  '/api/public/community-directory/overview',
  '/api/public/community-directory/items',
  '/api/community/posts',
  '/api/community/qna',
  '/api/about/overview',
  '/api/edu/resources',
  '/api/edu/taxonomy',
  '/api/edu/examinations',
  '/api/edu/admit-results',
  '/api/edu/syllabi',
  '/api/edu/pyqs',
  '/api/edu/quizzes',
  '/api/edu/mock-tests',
  '/api/edu/answer-keys',
  '/api/edu/collections',
  '/api/edu/scholarships',
  '/api/edu/careers',
  '/api/edu/student-hub',
  '/api/edu/tools',
  '/api/events/upcoming'
];

export const EVENTS_PUBLIC_PATHS = [
  '/api/events/upcoming',
  '/api/events/calendar/odisha-all-exams.ics',
  '/api/events/calendar/opsc-oas.ics',
  '/api/events/calendar/ossc-osssc.ics',
  '/api/events/calendar/ugc-net-admissions.ics'
];

export const SEO_PUBLIC_PATHS = [
  '/api/seo/meta?route=/',
  '/api/seo/robots.txt',
  '/api/seo/sitemap/sitemap-index.xml',
  '/api/seo/sitemap/sitemap-core.xml',
  '/api/seo/sitemap/sitemap-exams.xml',
  '/api/seo/sitemap/sitemap-schemes.xml'
];

export async function invalidateEdgePaths(request, paths = []) {
  try {
    const edgeCache = typeof caches !== 'undefined' && caches.default ? caches.default : null;
    if (!edgeCache || !request || !request.url || !Array.isArray(paths) || !paths.length) {
      return { ok: true, invalidated: 0 };
    }
    const deleteOps = [];
    for (const p of paths) {
      const fullUrl = new URL(p, request.url);
      deleteOps.push(edgeCache.delete(new Request(fullUrl.toString(), { method: 'GET' })));
      fullUrl.searchParams.set('_ecv', EDGE_CACHE_KEY_VERSION);
      deleteOps.push(edgeCache.delete(new Request(fullUrl.toString(), { method: 'GET' })));
    }
    const results = await Promise.allSettled(deleteOps);
    const invalidated = results.filter(r => r.status === 'fulfilled' && r.value).length;
    return { ok: true, invalidated, attempted: paths.length };
  } catch {
    return { ok: false, invalidated: 0 };
  }
}

var EXTRA_INVALIDATORS;

export function registerCacheInvalidator(fn) {
  if (!EXTRA_INVALIDATORS) EXTRA_INVALIDATORS = new Set();
  if (typeof fn === 'function') EXTRA_INVALIDATORS.add(fn);
}

export async function invalidateAllPublicCaches(request, extraPaths = []) {
  try { resetPublicContentMemo(); } catch {}
  try { invalidateSitePagesCache(); } catch {}
  try { resetAboutOverviewMemo(); } catch {}
  if (EXTRA_INVALIDATORS) {
    for (const fn of EXTRA_INVALIDATORS) {
      try { fn(); } catch {}
    }
  }
  const allPaths = [
    ...new Set([
      ...NAV_PUBLIC_PATHS,
      ...CONTENT_PUBLIC_PATHS,
      ...SETTINGS_PUBLIC_PATHS,
      '/terms/',
      '/terms-of-use/',
      '/privacy/',
      '/privacy-policy/',
      '/copyright/',
      '/copyright-policy/',
      '/disclaimer/',
      '/contact/',
      '/api/public/web-studio/snippets',
      ...(Array.isArray(extraPaths) ? extraPaths : [])
    ])
  ];
  return invalidateEdgePaths(request, allPaths);
}
