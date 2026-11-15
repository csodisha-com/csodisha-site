import { json } from '../../_lib/http.js';
import { PUBLIC_VISIBLE_SQL } from '../../_lib/validate.js';

const CACHE_CONTROL = 'public, max-age=120, s-maxage=300, stale-while-revalidate=600';

async function safeCount(db, sql) {
  if (!db) return 0;
  try {
    const row = await db.prepare(sql).first();
    return Number(row?.n || row?.cnt || 0);
  } catch {
    return 0;
  }
}

export async function getAboutOverviewData(env) {
  const db = env?.DB;
  const [
    studyFolders,
    studyItems,
    jobsFolders,
    jobsItems,
    schemesFolders,
    schemesItems,
    communityFolders,
    communityItems,
    postsCount,
    activeJobsPosts,
    aboutNodesCount,
    resolvedFeedbackCount
  ] = await Promise.all([
    safeCount(db, 'SELECT COUNT(*) AS n FROM study_library_folders WHERE is_active = 1'),
    safeCount(db, "SELECT COUNT(*) AS n FROM study_library_items WHERE status = 'published'"),
    safeCount(db, 'SELECT COUNT(*) AS n FROM jobs_directory_folders WHERE is_active = 1'),
    safeCount(db, "SELECT COUNT(*) AS n FROM jobs_directory_items WHERE status = 'published'"),
    safeCount(db, 'SELECT COUNT(*) AS n FROM schemes_directory_folders WHERE is_active = 1'),
    safeCount(db, "SELECT COUNT(*) AS n FROM schemes_directory_items WHERE status = 'published'"),
    safeCount(db, 'SELECT COUNT(*) AS n FROM community_directory_folders WHERE is_active = 1'),
    safeCount(db, "SELECT COUNT(*) AS n FROM community_directory_items WHERE status = 'published'"),
    safeCount(db, `SELECT COUNT(*) AS n FROM posts WHERE ${PUBLIC_VISIBLE_SQL}`),
    safeCount(db, `SELECT COUNT(*) AS n FROM posts WHERE type = 'job' AND ${PUBLIC_VISIBLE_SQL} AND (last_date IS NULL OR last_date >= date('now'))`),
    safeCount(db, "SELECT COUNT(*) AS n FROM about_directory_nodes WHERE status = 'published'"),
    safeCount(db, "SELECT COUNT(*) AS n FROM community_feedback WHERE status = 'resolved'")
  ]);

  const totalFolders = studyFolders + jobsFolders + schemesFolders + communityFolders;
  const totalDirectoryItems = studyItems + jobsItems + schemesItems + communityItems;
  const totalPublishedResources = totalDirectoryItems + postsCount;

  const directories = [
    {
      key: 'study-library',
      num: '01',
      label: 'Study Library',
      labelOr: 'ଅଧ୍ୟୟନ ପାଠାଗାର',
      href: '/study-library/',
      folders: studyFolders,
      items: studyItems
    },
    {
      key: 'jobs',
      num: '02',
      label: 'Jobs & Careers',
      labelOr: 'ନିଯୁକ୍ତି ଓ କ୍ୟାରିଅର୍',
      href: '/jobs/',
      folders: jobsFolders,
      items: jobsItems
    },
    {
      key: 'schemes',
      num: '03',
      label: 'Schemes & Benefits',
      labelOr: 'ସରକାରୀ ଯୋଜନା',
      href: '/schemes/',
      folders: schemesFolders,
      items: schemesItems
    },
    {
      key: 'community',
      num: '04',
      label: 'Community Directory',
      labelOr: 'ସମୁଦାୟ ଡିରେକ୍ଟୋରୀ',
      href: '/community/',
      folders: communityFolders,
      items: communityItems
    }
  ];

  return {
    ok: true,
    directories,
    totals: {
      totalFolders,
      totalDirectoryItems,
      totalPublishedResources,
      studyFolders,
      studyItems,
      jobsFolders,
      jobsItems: jobsItems + activeJobsPosts,
      schemesFolders,
      schemesItems,
      communityFolders,
      communityItems,
      postsCount,
      aboutNodesCount,
      resolvedFeedbackCount,
      districtsCount: 30
    },
    updatedAt: new Date().toISOString()
  };
}

export async function handlePublicAboutOverviewApi(request, env) {
  const data = await getAboutOverviewData(env);
  return json(data, 200, { 'Cache-Control': CACHE_CONTROL });
}

export async function onRequestGet({ request, env }) {
  return handlePublicAboutOverviewApi(request, env);
}
