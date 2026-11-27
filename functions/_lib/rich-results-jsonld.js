/**
 * Common Sense Odisha — Dynamic Google Rich Results JSON-LD Engine (v385)
 * Strictly follows Google Search Central 2026 guidelines:
 *  - Escapes `<` as `\u003c` inside <script type="application/ld+json">
 *  - Emits `JobPosting` ONLY on genuine recruitment/vacancy notices on `/jobs/<slug>`
 *  - Emits `NewsArticle` + `BreadcrumbList` on exam schedules, admit cards, results,
 *    current affairs, and `/guides/<slug>` detail pages (NEVER falsely emits `JobPosting`)
 *  - Hub list pages (`/jobs/`, `/guides/`) NEVER emit `JobPosting`
 */

const SITE_ORIGIN = 'https://csodisha.com';
const PUBLISHER_LOGO_URL = `${SITE_ORIGIN}/assets/img/cso-logo-192.png`;
const FALLBACK_COVER_URL = `${SITE_ORIGIN}/assets/img/icon-512.png`;

const NON_VACANCY_STAGES = new Set([
  'exam_update',
  'admit_card',
  'exam_date',
  'answer_key',
  'result',
  'current_affairs',
  'closed'
]);

const VALID_EMPLOYMENT_TYPES = new Set([
  'FULL_TIME',
  'PART_TIME',
  'CONTRACTOR',
  'TEMPORARY',
  'INTERN',
  'VOLUNTEER',
  'PER_DIEM',
  'OTHER'
]);

export function serializeJsonLd(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

export function cleanHeadline(raw, maxLen = 110) {
  const s = String(raw || '')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1).trimEnd() + '…';
}

export function toAbsoluteHttpsUrl(raw, origin = SITE_ORIGIN) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/') && !s.startsWith('//')) {
    return `${String(origin || SITE_ORIGIN).replace(/\/+$/, '')}${s}`;
  }
  return '';
}

export function toIso8601Ist(raw, endOfDay = false) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) {
    return s;
  }
  const dtMatch = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
  if (dtMatch) {
    return `${dtMatch[1]}T${dtMatch[2]}Z`;
  }
  const dMatch = s.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dMatch) {
    return `${dMatch[1]}T${endOfDay ? '23:59:59' : '09:00:00'}+05:30`;
  }
  return '';
}

export function isVacancyJobPosting(row) {
  if (!row || typeof row !== 'object') return false;
  const stage = String(row.lifecycle_stage || '').trim().toLowerCase();
  if (NON_VACANCY_STAGES.has(stage)) return false;
  const titleBlob = `${row.title_en || ''} ${row.slug || ''}`.toLowerCase();
  if (/\b(result\b|scorecard|omr sheet|admit card|city slip|exam dates|exam schedule|22nd edition)\b/.test(titleBlob) &&
      !/\b(posts?|vacancies|recruitment|walk-?in|hiring)\b/.test(titleBlob)) {
    return false;
  }
  if (['notification', 'job_alert', 'active', 'closing_soon', ''].includes(stage)) {
    return true;
  }
  return false;
}

export function mapEmploymentType(row) {
  const explicit = String((row && row.employment_type) || '').trim().toUpperCase();
  if (VALID_EMPLOYMENT_TYPES.has(explicit)) return explicit;
  const blob = `${(row && row.title_en) || ''} ${(row && row.salary_pay_scale) || ''} ${(row && row.selection_mode) || ''} ${(row && row.summary_en) || ''}`.toLowerCase();
  if (/\bpart[\s-]?time\b/.test(blob) && !/\bfull[\s-]?time\b/.test(blob)) return 'PART_TIME';
  if (/\bcontract(?:ual)?\b|\bconsolidated\b|\bwalk[\s-]?in\b/.test(blob)) return 'CONTRACTOR';
  if (/\btemporary\b|\bguest faculty\b|\bshort[\s-]?term\b/.test(blob)) return 'TEMPORARY';
  return 'FULL_TIME';
}

function escapeHtmlAttr(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildJobHtmlDescription(row) {
  const parts = [];
  if (row.summary_en) parts.push(`<p>${escapeHtmlAttr(row.summary_en)}</p>`);
  const bullets = [];
  if (row.organisation_en) bullets.push(`<li><strong>Organization:</strong> ${escapeHtmlAttr(row.organisation_en)}</li>`);
  if (Number(row.total_vacancies || 0) > 0) bullets.push(`<li><strong>Total Vacancies:</strong> ${Number(row.total_vacancies)}</li>`);
  if (row.qualification_summary || row.qualification_level) {
    bullets.push(`<li><strong>Eligibility:</strong> ${escapeHtmlAttr(row.qualification_summary || row.qualification_level)}</li>`);
  }
  if (row.salary_pay_scale) bullets.push(`<li><strong>Remuneration / Pay:</strong> ${escapeHtmlAttr(row.salary_pay_scale)}</li>`);
  if (row.location_district) bullets.push(`<li><strong>Location:</strong> ${escapeHtmlAttr(row.location_district)}, Odisha</li>`);
  if (row.last_date) bullets.push(`<li><strong>Last / Walk-in Date:</strong> ${escapeHtmlAttr(row.last_date)}</li>`);
  if (row.advt_number) bullets.push(`<li><strong>Advertisement No.:</strong> ${escapeHtmlAttr(row.advt_number)}</li>`);
  if (bullets.length) parts.push(`<ul>${bullets.join('')}</ul>`);
  return parts.join('') || `<p>${escapeHtmlAttr(row.title_en || 'Official Odisha Recruitment Notice')}</p>`;
}

export function buildJobDetailJsonLdBlocks(row, origin = SITE_ORIGIN) {
  const cleanOrigin = String(origin || SITE_ORIGIN).replace(/\/+$/, '');
  const slug = String(row.slug || row.id || '').trim();
  const canonical = `${cleanOrigin}/jobs/${encodeURIComponent(slug)}`;
  const title = cleanHeadline(row.title_en || 'CS Odisha Notice', 110);
  const summary = String(row.summary_en || row.title_en || '').trim();
  const datePosted = toIso8601Ist(row.published_at || row.created_at || row.updated_at || new Date().toISOString(), false);
  const dateModified = toIso8601Ist(row.updated_at || row.published_at || row.created_at || new Date().toISOString(), false);
  const validThrough = toIso8601Ist(row.last_date || row.expires_at || row.exam_date || '', true);
  const coverUrl = toAbsoluteHttpsUrl(row.cover_image_url || row.cover_image, cleanOrigin) || FALLBACK_COVER_URL;

  const orgName = String(row.organisation_en || row.sector_badge || 'Government of Odisha').trim();
  const officialPortal = toAbsoluteHttpsUrl(row.official_website_url || row.official_apply_url || '', cleanOrigin);
  const pdfOrResultUrl = toAbsoluteHttpsUrl(
    row.notification_pdf_url || row.result_url || row.notification_url || row.official_website_url || '',
    cleanOrigin
  );

  const stage = String(row.lifecycle_stage || '').toLowerCase();
  const isResult = stage === 'result';
  const isExamNotice = ['admit_card', 'exam_date', 'answer_key', 'exam_update'].includes(stage);
  const sectionName = isResult ? 'Results' : (isExamNotice ? 'Exams & Admit Cards' : 'Jobs');
  const sectionUrl = isResult ? `${cleanOrigin}/exams/#results` : (isExamNotice ? `${cleanOrigin}/exams/` : `${cleanOrigin}/jobs/`);

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${cleanOrigin}/` },
      { '@type': 'ListItem', position: 2, name: sectionName, item: sectionUrl },
      { '@type': 'ListItem', position: 3, name: title, item: canonical }
    ]
  };

  const newsArticleLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: title,
    description: summary,
    image: [coverUrl],
    datePublished: datePosted,
    dateModified,
    author: {
      '@type': 'Organization',
      name: 'Common Sense Odisha Editorial Desk',
      url: `${cleanOrigin}/about/`
    },
    publisher: {
      '@type': 'Organization',
      name: 'Common Sense Odisha',
      url: `${cleanOrigin}/`,
      logo: {
        '@type': 'ImageObject',
        url: `${cleanOrigin}/assets/img/cso-logo-192.png`
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonical
    }
  };
  if (pdfOrResultUrl) {
    newsArticleLd.isBasedOn = pdfOrResultUrl;
    newsArticleLd.citation = pdfOrResultUrl;
  }

  if (!isVacancyJobPosting(row)) {
    return [newsArticleLd, breadcrumbLd];
  }

  const rawLoc = String(row.location_district || '').trim();
  const locality = (!rawLoc || /^all\s+(odisha|india)$/i.test(rawLoc)) ? 'Bhubaneswar' : rawLoc;
  const hiringOrganization = {
    '@type': 'Organization',
    name: orgName
  };
  if (officialPortal && /^https:\/\//i.test(officialPortal)) {
    hiringOrganization.sameAs = officialPortal;
  }

  const jobPostingLd = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title,
    description: buildJobHtmlDescription(row),
    datePosted,
    hiringOrganization,
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: locality,
        addressRegion: 'Odisha',
        addressCountry: 'IN'
      }
    },
    employmentType: mapEmploymentType(row),
    identifier: {
      '@type': 'PropertyValue',
      name: orgName,
      value: String(row.advt_number || slug).trim()
    },
    directApply: Boolean(row.official_apply_url && /^https:\/\//i.test(row.official_apply_url) && !/walk[\s-]?in/i.test(String(row.selection_mode || ''))),
    url: canonical
  };
  if (validThrough) {
    jobPostingLd.validThrough = validThrough;
  }

  return [jobPostingLd, newsArticleLd, breadcrumbLd];
}

export function buildGuideDetailJsonLdBlocks(guide, origin = SITE_ORIGIN, categoryLabelEn = 'Exam Strategy', faqs = []) {
  const cleanOrigin = String(origin || SITE_ORIGIN).replace(/\/+$/, '');
  const slug = String(guide.slug || guide.id || '').trim();
  const canonical = `${cleanOrigin}/guides/${encodeURIComponent(slug)}`;
  const headline = cleanHeadline(guide.title_en || 'CS Odisha Guide', 110);
  const coverUrl = toAbsoluteHttpsUrl(guide.cover_image, cleanOrigin) || FALLBACK_COVER_URL;
  const datePublished = toIso8601Ist(guide.created_at || guide.updated_at || new Date().toISOString(), false);
  const dateModified = toIso8601Ist(guide.updated_at || guide.created_at || new Date().toISOString(), false);

  const links = Array.isArray(guide.links) ? guide.links : [];
  const pdfs = Array.isArray(guide.pdfs) ? guide.pdfs : [];
  const officialSource =
    (pdfs[0] && toAbsoluteHttpsUrl(pdfs[0].url, cleanOrigin)) ||
    (links.find((l) => l && l.is_official && l.url) && toAbsoluteHttpsUrl(links.find((l) => l && l.is_official && l.url).url, cleanOrigin)) ||
    '';

  const newsArticleLd = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline,
    alternativeHeadline: guide.title_or || undefined,
    description: String(guide.summary_en || guide.title_en || '').trim(),
    image: [coverUrl],
    datePublished,
    dateModified,
    articleSection: categoryLabelEn,
    keywords: guide.tags || undefined,
    inLanguage: ['en', 'or'],
    author: {
      '@type': 'Organization',
      name: 'Common Sense Odisha Editorial Desk',
      url: `${cleanOrigin}/about/`
    },
    publisher: {
      '@type': 'Organization',
      name: 'Common Sense Odisha',
      url: `${cleanOrigin}/`,
      logo: {
        '@type': 'ImageObject',
        url: `${cleanOrigin}/assets/img/cso-logo-192.png`
      }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonical
    }
  };
  if (officialSource) {
    newsArticleLd.isBasedOn = officialSource;
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${cleanOrigin}/` },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: `${cleanOrigin}/guides/` },
      { '@type': 'ListItem', position: 3, name: headline, item: canonical }
    ]
  };

  const blocks = [newsArticleLd, breadcrumbLd];
  if (Array.isArray(faqs) && faqs.length) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: { '@type': 'Answer', text: f.answer }
      }))
    });
  }
  return blocks;
}

export function injectJsonLdAndMetaIntoHtml(baseHtml, { title, description, canonical, ogImage, jsonLdBlocks = [] }) {
  let html = String(baseHtml || '');
  const safeTitle = escapeHtmlAttr(title || 'Common Sense Odisha');
  const safeDesc = escapeHtmlAttr(description || '');
  const safeCanon = escapeHtmlAttr(canonical || '');
  const safeImg = escapeHtmlAttr(ogImage || FALLBACK_COVER_URL);

  if (/<title>[\s\S]*?<\/title>/i.test(html)) {
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safeTitle} | Common Sense Odisha</title>`);
  }
  if (safeDesc && /<meta\s+name="description"[^>]*>/i.test(html)) {
    html = html.replace(/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${safeDesc}">`);
  }
  if (safeCanon) {
    if (/<link\s+rel="canonical"[^>]*>/i.test(html)) {
      html = html.replace(/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${safeCanon}">`);
    } else {
      html = html.replace(/<\/head>/i, `  <link rel="canonical" href="${safeCanon}">\n</head>`);
    }
  }

  const ogTags = [
    `<meta property="og:title" content="${safeTitle}">`,
    safeDesc ? `<meta property="og:description" content="${safeDesc}">` : '',
    safeCanon ? `<meta property="og:url" content="${safeCanon}">` : '',
    `<meta property="og:image" content="${safeImg}">`
  ].filter(Boolean).join('\n  ');

  const ldScripts = (Array.isArray(jsonLdBlocks) ? jsonLdBlocks : [])
    .map((b) => `<script type="application/ld+json">${serializeJsonLd(b)}</script>`)
    .join('\n  ');

  return html.replace(/<\/head>/i, `  ${ogTags}\n  ${ldScripts}\n</head>`);
}
