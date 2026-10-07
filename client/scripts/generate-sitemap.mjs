/**
 * Generates client/public/sitemap.xml, then Vite copies it into the build.
 *
 * Runs automatically as npm's `prebuild`, so a sitemap can never be one deploy
 * behind the routes. Run it on its own with:
 *
 *     npm run sitemap
 *
 * Why a build step rather than a hand-written file: this is a single-page app
 * with no server rendering. Googlebot does execute JavaScript, but it does so on
 * a second pass and it discovers links by rendering pages it already knows
 * about. A sitemap gives it all 60-odd URLs up front — including the 37 chapter
 * pages, which are otherwise reachable only through a filtered list rendered in
 * the browser.
 *
 * Two sources:
 *   - Static routes and the 37 chapters come from the codebase. These are known
 *     without a network, so a sitemap is always produced.
 *   - News articles come from the live API. If it is unreachable the script
 *     warns and carries on: a build must not fail because a server is down, and
 *     a sitemap missing its news is far better than no sitemap.
 *
 * `lastmod` is only emitted where a real modification date exists (the API's
 * updatedAt). Stamping today's date on every URL at every build is a well-known
 * way to teach a search engine to ignore the field entirely.
 */
import { writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { CHAPTERS } from '../src/data/chapters.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIENT = resolve(HERE, '..');
const OUT = resolve(CLIENT, 'public/sitemap.xml');

/** Canonical origin. Overridable so a staging build does not advertise production URLs. */
const SITE = (process.env.SITE_URL || 'https://niqs.org.ng').replace(/\/+$/, '');

/** How long to wait on the API before giving up and shipping without news. */
const API_TIMEOUT_MS = 8000;

/**
 * Public routes, with the priority hint.
 *
 * Priority is relative *within this site* — it does not raise the site against
 * anyone else's, and search engines treat it as a weak signal at best. It is
 * here to say which pages matter when a crawler has a limited budget.
 *
 * Everything under /admin, /portal and the auth routes is deliberately absent,
 * as are the token routes. See public/robots.txt, which must agree with this.
 */
const STATIC_ROUTES = [
  ['/',                    1.0, 'weekly'],
  ['/about',               0.9, 'monthly'],
  ['/membership',          0.9, 'monthly'],
  ['/chapters',            0.9, 'monthly'],
  ['/news',                0.9, 'daily'],
  ['/events',              0.9, 'daily'],
  ['/contact',             0.8, 'yearly'],
  ['/president',           0.8, 'yearly'],
  ['/council',             0.8, 'yearly'],
  ['/national-bodies',     0.7, 'yearly'],
  ['/npc',                 0.7, 'yearly'],
  ['/board-of-trustees',   0.7, 'yearly'],
  ['/past-presidents',     0.7, 'yearly'],
  ['/exams',               0.8, 'monthly'],
  ['/research',            0.7, 'monthly'],
  ['/workshop-materials',  0.6, 'monthly'],
  ['/search-qs-firms',     0.8, 'weekly'],
  ['/jobs',                0.8, 'weekly'],
  ['/partnership',         0.7, 'monthly'],
  ['/waqsn',               0.6, 'yearly'],
  ['/yqsf',                0.6, 'yearly'],
  ['/reciprocity',         0.6, 'yearly'],
  ['/brand-materials',     0.6, 'monthly'],
  ['/payment',             0.6, 'yearly'],
  ['/request-flyer',       0.5, 'yearly'],
  ['/flyer-request',       0.4, 'yearly'],
  ['/privacy-policy',      0.3, 'yearly'],
  ['/terms-of-use',        0.3, 'yearly'],
];

/** Reads VITE_API_URL out of .env.production — the client has no dotenv. */
async function apiBase() {
  if (process.env.VITE_API_URL) return process.env.VITE_API_URL.replace(/\/+$/, '');
  try {
    const env = await readFile(resolve(CLIENT, '.env.production'), 'utf8');
    const line = env.split(/\r?\n/).find((l) => l.trim().startsWith('VITE_API_URL='));
    return line ? line.split('=').slice(1).join('=').trim().replace(/\/+$/, '') : null;
  } catch {
    return null;
  }
}

async function getJson(url) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** The public endpoints disagree on whether they wrap their payload. Handle both. */
const unwrap = (body, key) => {
  const data = body?.[key] ?? body?.data ?? body;
  return Array.isArray(data) ? data : [];
};

/** YYYY-MM-DD, which is a valid W3C datetime and the form Google prefers. */
function isoDay(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

const escapeXml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

function urlEntry({ path, priority, changefreq, lastmod }) {
  return [
    '  <url>',
    `    <loc>${escapeXml(SITE + path)}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : null,
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : null,
    priority != null ? `    <priority>${priority.toFixed(1)}</priority>` : null,
    '  </url>',
  ].filter(Boolean).join('\n');
}

async function main() {
  const entries = STATIC_ROUTES.map(([path, priority, changefreq]) =>
    ({ path, priority, changefreq }));

  /* ── Chapters ──
     The API is authoritative when it answers, and its list *replaces* the
     built-in one rather than merging with it. Merging looks harmless and is
     not: the two derive slugs by different rules, so the first run of this
     script emitted 74 chapter URLs — 37 real ones and 37 that 404. A sitemap
     full of dead URLs is worse than a short one; Google reports them as errors
     and trusts the rest of the file less. */
  const chapterUrls = new Map(
    CHAPTERS.map((c) => [c.slug, { path: `/chapters/${c.slug}`, priority: 0.7, changefreq: 'monthly' }])
  );

  const base = await apiBase();
  let newsCount = 0;

  if (!base) {
    console.warn('[sitemap] No VITE_API_URL — writing the static routes and the 37 chapters only.');
  } else {
    try {
      const chapters = unwrap(await getJson(`${base}/chapters`), 'chapters')
        .filter((c) => c?.slug);
      if (chapters.length) {
        chapterUrls.clear();
        for (const c of chapters) {
          chapterUrls.set(c.slug, {
            path: `/chapters/${c.slug}`,
            priority: 0.7,
            changefreq: 'monthly',
            lastmod: isoDay(c.updatedAt),
          });
        }
      }
    } catch (err) {
      console.warn(`[sitemap] Chapters unavailable (${err.message}) — using the built-in list of ${chapterUrls.size}.`);
    }

    /* News. The listing endpoint paginates; walk it rather than taking page one
       and quietly leaving every older article out of the index. */
    try {
      for (let page = 1; page <= 50; page += 1) {
        const body = await getJson(`${base}/news?page=${page}&limit=100`);
        const items = unwrap(body, 'news');
        if (!items.length) break;

        for (const n of items) {
          if (!n?.slug) continue;
          entries.push({
            path: `/news/${n.slug}`,
            priority: 0.6,
            changefreq: 'monthly',
            lastmod: isoDay(n.updatedAt || n.publishedAt || n.createdAt),
          });
          newsCount += 1;
        }

        const totalPages = body?.totalPages ?? body?.pages ?? 1;
        if (page >= totalPages) break;
      }
    } catch (err) {
      console.warn(`[sitemap] News unavailable (${err.message}) — articles omitted from this sitemap.`);
    }
  }

  entries.push(...chapterUrls.values());

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(urlEntry),
    '</urlset>',
    '',
  ].join('\n');

  await writeFile(OUT, xml, 'utf8');
  console.log(`[sitemap] ${entries.length} URLs → public/sitemap.xml  (${STATIC_ROUTES.length} static, ${chapterUrls.size} chapters, ${newsCount} news)`);
}

main().catch((err) => {
  // Still not fatal. A build that fails because a sitemap could not be written
  // is a worse outcome than a deploy carrying the previous sitemap.
  console.warn(`[sitemap] Skipped: ${err.message}`);
});
