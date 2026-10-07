import { useEffect, useState } from 'react';
import { fetchMembershipStats } from '../api/statsApi';

/**
 * Live membership statistics.
 *
 * Returns { stats, loading }. `stats` is null both while loading and when the
 * figures are unavailable, so every consumer must have a sensible render for the
 * null case — that is the point. Callers should show their static copy or omit
 * the block, never a zero.
 */
export default function useMembershipStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchMembershipStats()
      .then((data) => { if (alive) setStats(data); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return { stats, loading };
}

/* useMemberCopy(), MEMBERS_FALLBACK and formatApprox() lived here. They put the
   membership figure into public body copy ("Join 14,000+ professionals"). At the
   October 2026 review NIQS asked for membership numbers to be shown to members
   only, so no public page quotes one any more and the helpers were removed with
   their last callers. The figures themselves are on the portal dashboard. */

/** 14023 → "14,023". Nigerian sites read grouped thousands, same as en-GB. */
export function formatCount(n) {
  return typeof n === 'number' ? n.toLocaleString('en-NG') : '—';
}

/** 0.3925 → "39%". */
export function formatShare(x, digits = 0) {
  return typeof x === 'number' ? `${(x * 100).toFixed(digits)}%` : '—';
}

/** "2026-07-31T05:00:46+01:00" → "31 July 2026", for a "figures as at" line. */
export function formatAsAt(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
}
