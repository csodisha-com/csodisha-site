// Shared Edge Cache Invalidation Helper (v130)
// Safely deletes public edge-cached responses when Admin mutations occur.

export const SETTINGS_PUBLIC_PATHS = ['/api/config/public'];

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
