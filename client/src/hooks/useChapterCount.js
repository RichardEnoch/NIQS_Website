import { useEffect, useState } from 'react';
import API from '../api/axios';

/**
 * Number of NIQS chapters, from the chapter records.
 *
 * Note the wording wherever this is rendered: it is 36 states **plus the Federal
 * Capital Territory**, so 37 is a count of chapters, not a count of states.
 * Nigeria has 36 states. "37 states" is wrong; "37 chapters" is right.
 *
 * Returns null until loaded and whenever the request fails, so each caller
 * supplies its own fallback rather than rendering a zero.
 */
export default function useChapterCount() {
  const [count, setCount] = useState(null);

  useEffect(() => {
    let alive = true;
    API.get('/chapters')
      .then(res => {
        const data = res.data?.chapters || res.data?.data || res.data;
        if (alive && Array.isArray(data) && data.length) setCount(data.length);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return count;
}

/* 36 states + the FCT, less Kebbi (one chapter with Sokoto) and Taraba (no
   chapter) since October 2026. Used when the chapter records cannot be reached. */
export const CHAPTERS_FALLBACK = 35;
