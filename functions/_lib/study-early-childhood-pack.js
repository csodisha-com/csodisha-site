/* Clean-slate v234: hardcoded Early Childhood showcase pack purged.
   All Study Library categories and resources are authored strictly in Admin Studio (/admin/) via D1. */

export const EARLY_CHILDHOOD_SHOWCASE_COUNT = 0;
export const EC_BASE = '/study-library/early-childhood-primary-education';

export const EARLY_CHILDHOOD_STAGES = [];
export const EARLY_CHILDHOOD_BOARDS = [];
export const EARLY_CHILDHOOD_CLASSES = {};
export const ECCE_GUIDES = [];
export const EARLY_CHILDHOOD_TEXTBOOKS = [];
export const EARLY_CHILDHOOD_VISUALS = [];
export const EARLY_CHILDHOOD_PORTALS = [];
export const EARLY_CHILDHOOD_MCQS = [];
export const EARLY_CHILDHOOD_SEED_ITEMS = [];

export function resolveEarlyChildhoodRoute() {
  return null;
}

function emptyShowcaseHtml(kickerHtml = '') {
  return `${kickerHtml}<section class="cso-sl-pub-empty-card"><h2>No items published yet</h2><p>No items published yet — add categories or content in Admin Studio.</p><div class="cso-sl-pub-actions"><a class="cso-sl-pub-btn-secondary" href="/study-library/">← Study Library</a></div></section>`;
}

export function renderLevel1Html(kickerHtml) { return emptyShowcaseHtml(kickerHtml); }
export function renderLevel2Html(_route, kickerHtml) { return emptyShowcaseHtml(kickerHtml); }
export function renderLevel3Html(_route, kickerHtml) { return emptyShowcaseHtml(kickerHtml); }
export function renderLevel4Html(_route, kickerHtml) { return emptyShowcaseHtml(kickerHtml); }
