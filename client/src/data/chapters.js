/**
 * The 35 NIQS chapters. One per state plus the FCT, except that Sokoto and
 * Kebbi share the Sokoto-Kebbi chapter and Taraba has none (Secretariat,
 * Oct 2026).
 *
 * This list lived inside Chapters.jsx until the sitemap generator needed it too.
 * The generator runs in Node before the build and cannot import a file
 * containing JSX, so the data moved here: plain ESM, no React, importable from
 * both sides.
 *
 * Slugs are *derived* from the state name rather than stored. That is the same
 * rule ChapterDetail resolves by, so the sitemap can never advertise a chapter
 * URL the site would answer with a 404.
 *
 * The API is still the source of truth at runtime — /chapters overlays this with
 * whatever the secretariat has published. This is the floor, not the ceiling: a
 * chapter with no profile yet still has a page, and still belongs in the sitemap.
 */

/** [state, geopolitical zone, slug?] — alphabetical, which is also the display order. */
export const CHAPTER_STATES = [
  ['Abia',        'South East'],   ['Adamawa',    'North East'],
  ['Akwa Ibom',   'South South'],  ['Anambra',    'South East'],
  ['Bauchi',      'North East'],   ['Bayelsa',    'South South'],
  ['Benue',       'North Central'],['Borno',      'North East'],
  ['Cross River', 'South South'],  ['Delta',      'South South'],
  ['Ebonyi',      'South East'],   ['Edo',        'South South'],
  ['Ekiti',       'South West'],   ['Enugu',      'South East'],
  ['FCT',         'North Central'],['Gombe',      'North East'],
  ['Imo',         'South East'],   ['Jigawa',     'North West'],
  ['Kaduna',      'North West'],   ['Kano',       'North West'],
  ['Katsina',     'North West'],
  ['Kogi',        'North Central'],['Kwara',      'North Central'],
  ['Lagos',       'South West'],   ['Nasarawa',   'North Central'],
  ['Niger',       'North Central'],['Ogun',       'South West'],
  ['Ondo',        'South West'],   ['Osun',       'South West'],
  ['Oyo',         'South West'],   ['Plateau',    'North Central'],
  ['Rivers',      'South South'],
  /* Covers Sokoto and Kebbi. Keeps the slug its record always had. */
  ['Sokoto-Kebbi', 'North West', 'sokoto-chapter'],
  ['Yobe',       'North East'],
  ['Zamfara',     'North West'],
];

/**
 * The slug ChapterDetail resolves by. One rule, used everywhere.
 *
 * The `-chapter` suffix is not decoration: it is the convention the seeded
 * records in the database actually use (`abia-chapter`, `cross-river-chapter`),
 * and ChapterDetail resolves a slug by asking the API for it. The bare
 * `state.toLowerCase()` this list carried until 2026-08-07 produced links that
 * 404 — invisible in practice, because the fallback is only reached when the API
 * is down and every chapter link is dead anyway, but it put 37 non-existent URLs
 * into the first sitemap generated from it.
 */
export const chapterSlug = (state) => `${state.toLowerCase().replace(/\s+/g, '-')}-chapter`;

/** Chapter records in the shape the API returns, for use as a fallback. */
export const CHAPTERS = CHAPTER_STATES.map(([state, zone, slug], i) => ({
  _id: String(i + 1),
  name: `${state} Chapter`,
  slug: slug || chapterSlug(state),
  state,
  zone,
  memberCount: 0,
}));
