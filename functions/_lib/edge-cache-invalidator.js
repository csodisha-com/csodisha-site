// Shared Edge & Isolate Cache Invalidation Helper (v231)
// Immediately purges public edge-cached responses and isolate memos when Admin mutations occur.
import { resetPublicContentMemo } from '../api/content/_public.js';
import { invalidateSitePagesCache } from './site-pages.js';
import { resetAboutOverviewMemo } from '../api/public/about-overview.js';

export const SETTINGS_PUBLIC_PATHS = ['/api/config/public'];

export const NAV_PUBLIC_PATHS = [
  '/api/nav/config',
  '/',
  '/index.html',
  '/jobs/',
  '/jobs-careers/',
  '/schemes-benefits/',
  '/schemes/',
  '/study/',
  '/study-library/',
  '/resources/',
  '/mock-tests/',
  '/current-affairs/',
  '/community/',
  '/student-dashboard/',
  '/about/'
];

export const CONTENT_PUBLIC_PATHS = [
  '/api/public/homepage-blocks',
  '/api/homepage/blocks',
  '/api/public/jobs',
  '/api/public/jobs/tree',
  '/api/public/jobs/article',
  '/api/public/schemes',
  '/api/public/schemes/tree',
  '/api/public/schemes/article',
  '/api/public/study',
  '/api/public/study/tree',
  '/api/public/study/article',
  '/api/public/community/tree',
  '/api/public/community/posts',
  '/api/public/community/post',
  '/api/public/about/tree',
  '/api/public/about/pages',
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
    const results = await Promise.allSettled(
      paths.map(p => {
        const fullUrl = new URL(p, request.url).toString();
        return edgeCache.delete(new Request(fullUrl, { method: 'GET' }));
      })
    );
    const invalidated = results.filter(r => r.status === 'fulfilled' && r.value).length;
    return { ok: true, invalidated, attempted: paths.length };
  } catch {
    return { ok: false, invalidated: 0 };
  }
}

export async function invalidateAllPublicCaches(request, extraPaths = []) {
  try { resetPublicContentMemo(); } catch {}
  try { invalidateSitePagesCache(); } catch {}
  try { resetAboutOverviewMemo(); } catch {}
  const allPaths = [
    ...new Set([
      ...NAV_PUBLIC_PATHS,
      ...CONTENT_PUBLIC_PATHS,
      ...SETTINGS_PUBLIC_PATHS,
      ...(Array.isArray(extraPaths) ? extraPaths : [])
    ])
  ];
  return invalidateEdgePaths(request, allPaths);
}
