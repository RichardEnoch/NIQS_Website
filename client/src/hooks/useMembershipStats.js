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

/**
 * Shown only when the membership register is unreachable. Deliberately vague and
 * deliberately low: it is the last figure the Institute approved in writing, and
 * an understatement is the safe way to be wrong on a headline number.
 */
export const MEMBERS_FALLBACK = '10,000+';

/**
 * The membership figure as body copy — "14,000+" live, the approved fallback
 * otherwise. Several pages quote the size of the Institute in a sentence; this
 * keeps them from drifting apart, which is how one page came to say 10,000 while
 * another said 4,000.
 */
export function useMemberCopy() {
  const { stats } = useMembershipStats();
  return stats ? formatApprox(stats.total_members) : MEMBERS_FALLBACK;
}

/** 14023 → "14,023". Nigerian sites read grouped thousands, same as en-GB. */
export function formatCount(n) {
  return typeof n === 'number' ? n.toLocaleString('en-NG') : '—';
}

/** 14023 → "14,000+". For hero copy where a precise figure would date quickly. */
export function formatApprox(n) {
  if (typeof n !== 'number' || n < 100) return '—';
  const step = n >= 10_000 ? 1000 : n >= 1000 ? 500 : 100;
  return `${(Math.floor(n / step) * step).toLocaleString('en-NG')}+`;
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
