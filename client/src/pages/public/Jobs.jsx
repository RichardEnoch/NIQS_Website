import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHero from '../../components/common/PageHero';
import Icon from '../../components/common/Icon';
import { JobCard } from '../../components/jobs/JobBits';
import { useAuth } from '../../context/AuthContext';
import { useMemberCopy } from '../../hooks/useMembershipStats';
import { listJobs, getJobMeta, saveJob, unsaveJob } from '../../api/jobsApi';
import { TRACKS, SECTORS, JOB_TYPES, GRADES, LISTING_STATES, naira } from '../../data/jobBoard';

const PAGE_SIZE = 12;
const SALARY_STEPS = [100000, 250000, 500000, 1000000];

/* Every filter lives in the query string, so a filtered board is a link
   someone can share. These are the keys the page reads. */
const FILTER_KEYS = ['q', 'state', 'sector', 'type', 'minGrade', 'eligible', 'salaryMin', 'salaryMax'];

const fieldStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--color-bdr)',
  background: '#fff', fontSize: '.8rem', color: 'var(--color-txt-2)', fontFamily: 'inherit',
};
const labelStyle = {
  display: 'block', fontSize: '.66rem', fontWeight: 700, color: 'var(--color-txt-3)',
  textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4,
};

export default function Jobs() {
  const memberCopy = useMemberCopy();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();

  const track = TRACKS.some((t) => t.value === params.get('track')) ? params.get('track') : 'job';
  const page = Math.max(1, parseInt(params.get('page'), 10) || 1);
  const urlQ = params.get('q') || '';
  // "Roles I can apply for" only means something for a signed-in member.
  const eligibleOn = Boolean(user) && params.get('eligible') === '1';

  const [meta, setMeta] = useState(null);
  const [result, setResult] = useState({ jobs: [], total: 0, pages: 1 });
  const [status, setStatus] = useState('loading');
  const [qInput, setQInput] = useState(urlQ);
  const [saved, setSaved] = useState({});   // optimistic overrides: { [jobId]: bool }
  const reqId = useRef(0);

  /** Set (or clear) one query-string key. Any filter change goes back to page 1. */
  const setParam = (key, value, { replace = false } = {}) => {
    const next = new URLSearchParams(params);
    if (value === '' || value === null || value === undefined) next.delete(key);
    else next.set(key, String(value));
    if (key !== 'page') next.delete('page');
    setParams(next, { replace });
  };

  useEffect(() => {
    getJobMeta().then(setMeta).catch(() => {});
  }, []);

  // Keep the box in step when the URL changes underneath it (back button).
  useEffect(() => { setQInput((cur) => (cur.trim() === urlQ ? cur : urlQ)); }, [urlQ]);

  // Debounce typing into the search box.
  useEffect(() => {
    if (qInput.trim() === urlQ) return undefined;
    const t = setTimeout(() => setParam('q', qInput.trim(), { replace: true }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qInput]);

  const queryKey = params.toString() + (user ? `|${user.membershipType}` : '');

  useEffect(() => {
    const id = ++reqId.current;
    setStatus('loading');
    listJobs({
      track,
      q: urlQ,
      state: params.get('state'),
      sector: params.get('sector'),
      type: params.get('type'),
      minGrade: eligibleOn ? undefined : params.get('minGrade'),
      eligible: eligibleOn ? user.membershipType : undefined,
      salaryMin: params.get('salaryMin'),
      salaryMax: params.get('salaryMax'),
      page,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        if (id !== reqId.current) return;
        setResult({ jobs: Array.isArray(res?.jobs) ? res.jobs : [], total: res?.total || 0, pages: res?.pages || 1 });
        setStatus('ready');
      })
      .catch(() => {
        if (id !== reqId.current) return;
        setResult({ jobs: [], total: 0, pages: 1 });
        setStatus('error');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey]);

  const anyFilter = FILTER_KEYS.some((k) => params.get(k));
  const clearFilters = () => {
    const next = new URLSearchParams();
    if (track !== 'job') next.set('track', track);
    setQInput('');
    setParams(next);
  };

  const isSaved = (job) => (job._id in saved ? saved[job._id] : Boolean(job.saved));
  const toggleSave = async (job) => {
    const was = isSaved(job);
    setSaved((s) => ({ ...s, [job._id]: !was }));
    try {
      if (was) { await unsaveJob(job._id); toast.success('Removed from saved jobs'); }
      else { await saveJob(job._id); toast.success('Saved. Find it under Jobs & Applications in your portal.'); }
    } catch (err) {
      setSaved((s) => ({ ...s, [job._id]: was }));
      toast.error(err.response?.data?.message || 'Could not update your saved jobs. Please try again.');
    }
  };

  const stateCounts = meta?.countsByState || {};
  const trackCounts = meta?.countsByTrack || {};
  const sectors = meta?.sectors?.length ? meta.sectors : SECTORS;
  const states = useMemo(() => {
    const list = meta?.states?.length ? [...meta.states] : [...LISTING_STATES];
    if (!list.includes('Outside Nigeria')) list.push('Outside Nigeria');
    return list;
  }, [meta]);

  const emptyText = status === 'loading'
    ? 'Loading vacancies…'
    : status === 'error'
      ? 'We could not load the vacancies just now. Please try again shortly.'
      : anyFilter
        ? 'No roles match your search. Try adjusting the filters.'
        : track === 'job'
          ? 'No vacancies are currently listed.'
          : `No ${track === 'siwes' ? 'SIWES placements' : 'internships'} are currently listed.`;

  return (
    <>
      <PageHero
        label="Careers"
        title="Career Opportunities"
        titleHighlight="Opportunities"
        backgroundImage="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1400&q=80&fit=crop"
      />

      <section style={{ background: '#fff' }}>
        <div className="ct jb" style={{ paddingTop: '4rem', paddingBottom: '5rem' }}>

          {/* Heading row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.6rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div className="ey">Job Board</div>
              <h2 className="sh" style={{ margin: 0 }}>QS Career <em>Listings</em></h2>
            </div>
            <p className="jb-intro" style={{ fontSize: '.8rem', color: 'var(--color-txt-3)', maxWidth: 380, textAlign: 'right', lineHeight: 1.6, margin: 0 }}>
              Quantity surveying and construction roles, each checked by the NIQS Secretariat before it goes live.
            </p>
          </div>

          {/* Track tabs */}
          <div role="tablist" aria-label="Type of opportunity" className="jb-tabs">
            {TRACKS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={track === t.value}
                className={track === t.value ? 'on' : ''}
                onClick={() => setParam('track', t.value === 'job' ? '' : t.value)}
              >
                {t.label}
                {trackCounts[t.value] > 0 && <span className="jb-count">{trackCounts[t.value]}</span>}
              </button>
            ))}
          </div>
          {track !== 'job' && (
            <p style={{ fontSize: '.8rem', color: 'var(--color-txt-2)', margin: '0 0 1.2rem', lineHeight: 1.6 }}>
              <Icon name="education" size="sm" /> The graduate track: internships and SIWES placements for students and probationers working toward TPC / GDE.
            </p>
          )}

          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#f9fafb', border: '1px solid #e5e7eb',
            borderRadius: 8, padding: '9px 14px', marginBottom: 12,
          }}>
            <span style={{ color: '#9ca3af' }}><Icon name="search" size="sm" /></span>
            <label htmlFor="jb-q" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Search listings</label>
            <input
              id="jb-q"
              type="search"
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Search by title, company or location…"
              style={{ border: 'none', outline: 'none', fontSize: '.82rem', flex: 1, minWidth: 0, background: 'transparent', color: '#374151' }}
            />
            {qInput && (
              <button type="button" aria-label="Clear search" onClick={() => setQInput('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', display: 'inline-flex' }}>
                <Icon name="close" size="sm" />
              </button>
            )}
          </div>

          {/* Filters */}
          <div className="jb-filters">
            <div>
              <label style={labelStyle} htmlFor="jb-state">State</label>
              <select id="jb-state" style={fieldStyle} value={params.get('state') || ''} onChange={(e) => setParam('state', e.target.value)}>
                <option value="">All states</option>
                {states.map((s) => (
                  <option key={s} value={s}>{s}{stateCounts[s] ? ` (${stateCounts[s]})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="jb-sector">Sector</label>
              <select id="jb-sector" style={fieldStyle} value={params.get('sector') || ''} onChange={(e) => setParam('sector', e.target.value)}>
                <option value="">All sectors</option>
                {sectors.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="jb-type">Contract type</label>
              <select id="jb-type" style={fieldStyle} value={params.get('type') || ''} onChange={(e) => setParam('type', e.target.value)}>
                <option value="">Any type</option>
                {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="jb-grade">Minimum grade asked</label>
              <select
                id="jb-grade"
                style={{ ...fieldStyle, opacity: eligibleOn ? 0.5 : 1 }}
                value={eligibleOn ? '' : params.get('minGrade') || ''}
                disabled={eligibleOn}
                onChange={(e) => setParam('minGrade', e.target.value)}
              >
                <option value="">Any grade</option>
                {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="jb-smin">Salary from (monthly)</label>
              <select id="jb-smin" style={fieldStyle} value={params.get('salaryMin') || ''} onChange={(e) => setParam('salaryMin', e.target.value)}>
                <option value="">No minimum</option>
                {SALARY_STEPS.map((n) => <option key={n} value={n}>{naira(n)}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle} htmlFor="jb-smax">Salary up to (monthly)</label>
              <select id="jb-smax" style={fieldStyle} value={params.get('salaryMax') || ''} onChange={(e) => setParam('salaryMax', e.target.value)}>
                <option value="">No maximum</option>
                {SALARY_STEPS.map((n) => <option key={n} value={n}>{naira(n)}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', margin: '14px 0 0' }}>
            {user ? (
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: '.8rem', fontWeight: 600, color: 'var(--color-navy)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={eligibleOn}
                  onChange={(e) => {
                    const next = new URLSearchParams(params);
                    if (e.target.checked) { next.set('eligible', '1'); next.delete('minGrade'); } else next.delete('eligible');
                    next.delete('page');
                    setParams(next);
                  }}
                />
                Roles I can apply for
              </label>
            ) : <span />}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '.76rem', color: 'var(--color-txt-3)' }}>
              {status === 'ready' && <span aria-live="polite">{result.total} {result.total === 1 ? 'listing' : 'listings'}</span>}
              {anyFilter && (
                <button type="button" onClick={clearFilters} style={{ border: 'none', background: 'none', color: 'var(--color-navy)', fontWeight: 600, cursor: 'pointer', fontSize: '.76rem', textDecoration: 'underline' }}>
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Job list */}
          <div className="job-list" aria-busy={status === 'loading'}>
            {result.jobs.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-txt-3)', padding: '3rem 0' }}>{emptyText}</p>
            ) : result.jobs.map((job) => (
              <JobCard
                key={job._id}
                job={job}
                onSave={user ? toggleSave : undefined}
                saved={user ? isSaved(job) : undefined}
              />
            ))}
          </div>

          {/* Pagination */}
          {result.pages > 1 && (
            <nav aria-label="Pages" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: '1.6rem' }}>
              <button type="button" className="btn bo" disabled={page <= 1 || status === 'loading'} onClick={() => setParam('page', page - 1)} style={{ padding: '.55rem 1rem', opacity: page <= 1 ? 0.4 : 1 }}>
                Previous
              </button>
              <span style={{ fontSize: '.78rem', color: 'var(--color-txt-3)' }}>Page {page} of {result.pages}</span>
              <button type="button" className="btn bo" disabled={page >= result.pages || status === 'loading'} onClick={() => setParam('page', page + 1)} style={{ padding: '.55rem 1rem', opacity: page >= result.pages ? 0.4 : 1 }}>
                Next
              </button>
            </nav>
          )}

          {/* Job alerts */}
          <p style={{ fontSize: '.8rem', color: 'var(--color-txt-2)', textAlign: 'center', marginTop: '2rem' }}>
            <Icon name="notification" size="sm" />{' '}
            <Link to={user ? '/portal/job-alerts' : `/login?next=${encodeURIComponent('/portal/job-alerts')}`} style={{ color: 'var(--color-navy)', fontWeight: 600 }}>
              Get an email when a role like this is posted
            </Link>
            {!user && <span style={{ color: 'var(--color-txt-3)' }}> (members, after signing in)</span>}
          </p>

          {/* Employer CTA */}
          <div style={{ background: 'var(--color-off)', border: '1px solid var(--color-bdr)', borderRadius: 14, padding: '2.5rem 1.5rem', textAlign: 'center', marginTop: '2rem' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-navy)', marginBottom: '.5rem' }}>
              Are you an employer?
            </div>
            <p style={{ fontSize: '.82rem', color: 'var(--color-txt-2)', marginBottom: '1.5rem' }}>
              Reach {memberCopy} quantity surveyors across Nigeria and see each applicant's NIQS grade.
            </p>
            <Link to="/employers" className="btn bg">Post a job</Link>
          </div>
        </div>
      </section>

      <style>{`
        .jb-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 1rem; }
        .jb-tabs button {
          padding: 8px 16px; border-radius: 20px; font-size: .78rem; font-weight: 600;
          border: 1px solid #e5e7eb; background: #fff; color: #6b7280; cursor: pointer;
          display: inline-flex; align-items: center; gap: 6px; transition: all .15s;
        }
        .jb-tabs button.on { border-color: var(--color-navy); background: var(--color-navy); color: #fff; }
        .jb-tabs button:focus-visible { outline: 2px solid var(--color-gold); outline-offset: 2px; }
        .jb-count { font-size: .66rem; font-weight: 700; padding: 1px 7px; border-radius: 10px; background: rgba(0,0,0,.08); }
        .jb-tabs button.on .jb-count { background: rgba(255,255,255,.2); }
        .jb-filters { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; }
        @media (max-width: 1024px) { .jb-filters { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
        @media (max-width: 600px) {
          .jb-filters { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .jb-intro { text-align: left !important; }
          .jb .jrow { padding: 1rem; gap: .8rem; flex-wrap: wrap; align-items: flex-start; }
          .jb .jrow > div:last-child { flex-direction: row !important; align-items: center !important; flex-wrap: wrap; width: 100%; }
        }
        @media (max-width: 380px) { .jb-filters { grid-template-columns: 1fr; } }
      `}</style>
    </>
  );
}
