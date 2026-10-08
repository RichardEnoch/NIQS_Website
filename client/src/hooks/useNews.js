import { useEffect, useState } from 'react';
import API from '../api/axios';

/**
 * The one news feed the public site reads.
 *
 * The home page used to ask for `?limit=3` and, until anything came back (and
 * forever, if the API had no articles), showed three hardcoded 2025 notices
 * with stock photos that the News page never had — so the home page announced
 * news the News page did not carry. NIQS asked at the October 2026 review for
 * every snippet to match its page. Both pages now read the same request; the
 * home page shows the first three of the News page's own first page.
 */

/* One image for an article with none, on every page that lists articles. */
export const NEWS_FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=600&q=80&fit=crop';

export const NEWS_PAGE_SIZE = 9;

/** { news, totalPages, status } for one page of the feed. */
export default function useNews({ page = 1, category = 'All' } = {}) {
  const [news, setNews] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let live = true;
    const params = new URLSearchParams({ page, limit: NEWS_PAGE_SIZE });
    if (category !== 'All') params.append('category', category);
    setStatus('loading');
    API.get(`/news?${params}`)
      .then(res => {
        if (!live) return;
        const data = res.data?.news || res.data?.data || res.data;
        setNews(Array.isArray(data) ? data : []);
        setTotalPages(res.data?.totalPages || res.data?.pages || 1);
        setStatus('ready');
      })
      .catch(() => {
        if (!live) return;
        setNews([]);
        setStatus('error');
      });
    return () => { live = false; };
  }, [page, category]);

  return { news, totalPages, status };
}
