/**
 * Keeps <link rel="canonical"> and the document title correct as the router moves.
 *
 * Both matter for the same reason and neither exists in index.html: that file is
 * served verbatim for all 60-odd routes, so anything hard-coded into it would be
 * a claim about every page at once. A canonical written there would tell Google
 * that /membership and the 37 chapter pages are duplicates of the homepage — the
 * fastest way to have subpages dropped from the index — and a single <title>
 * means every page competes in search results under identical text.
 *
 * This runs in the browser, which is a real caveat worth being clear about:
 * Googlebot renders JavaScript and will see it, but link scrapers (WhatsApp,
 * LinkedIn, X) do not, so the Open Graph tags in index.html stay as they are.
 * Pre-rendering the public routes at build time is the fix for that; see
 * docs/SEO_AND_ANALYTICS.md.
 */
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ORIGIN = 'https://niqs.org.ng';
const SUFFIX = 'NIQS — Nigerian Institute of Quantity Surveyors';

/**
 * Titles for the routes whose text is fixed. Pages built around content the API
 * supplies — a news article, a chapter, a partner — are deliberately absent:
 * their real title is the article's or the chapter's name, which is not known
 * here. They fall through to the site title, which is the same behaviour they
 * have today, and each can set its own when someone gets to it.
 */
const TITLES = {
  '/': SUFFIX,
  '/about': 'About the Institute',
  '/president': 'The President',
  '/council': 'Council',
  '/npc': 'National Programmes Committee',
  '/national-bodies': 'National Bodies',
  '/board-of-trustees': 'Board of Trustees',
  '/past-presidents': 'Past Presidents',
  '/chapters': 'State Chapters',
  '/waqsn': 'West African Quantity Surveyors Network',
  '/yqsf': 'Young Quantity Surveyors Forum',
  '/reciprocity': 'Reciprocity Agreements',
  '/brand-materials': 'Brand Materials',
  '/membership': 'Membership',
  '/search-qs-firms': 'Find a QS Firm',
  '/workshop-materials': 'Workshop Materials',
  '/exams': 'Examinations',
  '/research': 'Research & Publications',
  '/library': 'Digital Library',
  '/news': 'News & Announcements',
  '/events': 'Events',
  '/jobs': 'Jobs',
  '/employers': 'Hire Quantity Surveyors',
  '/employers/sign-in': 'Employer Sign In',
  '/employers/register': 'Register as an Employer',
  '/payment': 'Payments',
  '/contact': 'Contact Us',
  '/partnership': 'Partnership',
  '/request-flyer': 'Request a Flyer',
  '/flyer-request': 'Flyer Request Form',
  '/privacy-policy': 'Privacy Policy',
  '/terms-of-use': 'Terms of Use',
};

export default function useCanonical() {
  const { pathname } = useLocation();

  useEffect(() => {
    /* ── Title ── */
    const page = TITLES[pathname];
    document.title = !page || page === SUFFIX ? SUFFIX : `${page} — ${SUFFIX}`;

    /* ── Canonical ──
       Only for routes that should be indexed at all. The staff areas and the
       token-bearing URLs are excluded from the sitemap and disallowed in
       robots.txt; giving them a canonical would contradict both. */
    const indexable = !['/admin', '/portal', '/employer', '/employers/sign-in', '/employers/register', '/login', '/forgot-password', '/reset-password', '/flyer-request/', '/events/attend/']
      .some((p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`));

    let tag = document.querySelector('link[rel="canonical"]');

    if (!indexable) {
      tag?.remove();
      return;
    }

    if (!tag) {
      tag = document.createElement('link');
      tag.setAttribute('rel', 'canonical');
      document.head.appendChild(tag);
    }
    // No query string and no trailing slash except at the root: ?preview and a
    // stray slash are the same page, and each variant that reaches the index is
    // one more copy competing with the original.
    const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '');
    tag.setAttribute('href', ORIGIN + path);
  }, [pathname]);
}
