/**
 * QS Connect editions that have their pages rendered for the on-site reader
 * (pages/public/QSConnectReader.jsx), with each edition's page count.
 *
 * Pages are 1240px-wide WebP images rendered from the Secretariat's PDFs
 * (Drive, MATERIALS / QS CONNECT, Nov 2026) and stored on the site's CDN at
 * <base>/<volume>/p001.webp, p002.webp ... To add an edition: render its
 * pages the same way, upload them under its volume number, and add a line
 * here. Until then the edition still shows on the News page and opens its PDF.
 */
export const QSC_PAGE_BASE = 'https://dg43yr2yw6cf8.cloudfront.net/niqs/qs-connect';

export const QSC_PAGES = {
  '7.3': 36, '7.4': 28, '7.5': 36, '7.6': 28, '7.7': 32, '7.8': 36,
  '8.1': 36, '8.2': 32, '8.3': 32, '8.4': 32, '8.5': 28, '8.6': 32, '8.7': 28,
  '8.8': 36, '8.9': 52, '9.1': 48, '9.2': 44, '10.1': 60,
};

export const qscPageCount = (volume) => QSC_PAGES[String(volume)] || 0;
export const qscPageUrl = (volume, n) => `${QSC_PAGE_BASE}/${volume}/p${String(n).padStart(3, '0')}.webp`;
