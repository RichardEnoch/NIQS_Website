import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Icon from '../../components/common/Icon';
import { ApplicationStatusPill, Pill } from '../../components/jobs/JobBits';
import { myApplications, withdrawApplication, savedJobs, unsaveJob } from '../../api/jobsApi';
import { APPLICATION_STATUS, fmtDate, daysLeft, typeLabel } from '../../data/jobBoard';

/* An application can still be withdrawn until it is decided. */
const ACTIVE = (s) => !['withdrawn', 'hired', 'not_selected'].includes(s);

const BY = { applicant: 'You', employer: 'Employer', admin: 'NIQS', system: 'NIQS' };

function Timeline({ history = [] }) {
  if (!history.length) return null;
  return (
    <ol className="pj-tl" aria-label="Application history">
      {history.map((h, i) => (
        <li key={`${h.status}-${h.at || i}`}>
          <span className="pj-tl-dot" aria-hidden="true" />
          <span style={{ fontWeight: 600, color: 'var(--color-navy)' }}>{APPLICATION_STATUS[h.status]?.label || h.status}</span>
          <span style={{ color: 'var(--color-txt-3)' }}>
            {' '}· {fmtDate(h.at)}{h.by && BY[h.by] ? ` · ${BY[h.by]}` : ''}
          </span>
          {h.note && <div style={{ color: 'var(--color-txt-2)', marginTop: 2 }}>{h.note}</div>}
        </li>
      ))}
    </ol>
  );
}

export default function PortalJobs() {
  const [apps, setApps] = useState(null);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState('');
  const [open, setOpen] = useState({}); // which timelines are expanded

  useEffect(() => {
    Promise.all([myApplications(), savedJobs()])
      .then(([a, s]) => { setApps(a?.applications || []); setSaved(s?.jobs || []); })
      .catch(() => setError(true));
  }, []);

  const withdraw = async (app) => {
    if (!window.confirm(`Withdraw your application for "${app.job?.title || 'this role'}"? The employer will no longer see it as active.`)) return;
    setBusy(app._id);
    try {
      const { application } = await withdrawApplication(app._id);
      setApps((list) => list.map((a) => (a._id === app._id ? { ...a, ...application, job: a.job } : a)));
      toast.success('Application withdrawn');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not withdraw the application');
    } finally {
      setBusy('');
    }
  };

  const unsave = async (job) => {
    const before = saved;
    setSaved((list) => list.filter((j) => j._id !== job._id));
    try {
      await unsaveJob(job._id);
      toast.success('Removed from saved jobs');
    } catch (err) {
      setSaved(before);
      toast.error(err.response?.data?.message || 'Could not remove it. Please try again.');
    }
  };

  const activeCount = apps ? apps.filter((a) => ACTIVE(a.status)).length : null;

  return (
    <div className="pj">
      <h1 className="pj-title">Jobs &amp; <em>Applications</em></h1>
      <p className="pj-sub">Track the roles you have applied for and the ones you have saved for later.</p>

      {error ? (
        <p style={{ color: 'var(--color-txt-3)', fontSize: '.85rem' }}>Your applications could not be loaded. Please refresh the page.</p>
      ) : (
        <>
          <section className="pj-section">
            <div className="pj-head">
              <h2 className="pj-h2">My applications{activeCount ? <span className="pj-n">{activeCount} active</span> : null}</h2>
              <Link to="/jobs" className="btn bp" style={{ padding: '.55rem 1rem', fontSize: '.74rem' }}>
                <Icon name="search" size="sm" /> Browse jobs
              </Link>
            </div>

            {!apps ? (
              <div className="pj-card"><p className="pj-muted">Loading…</p></div>
            ) : apps.length === 0 ? (
              <div className="pj-card pj-empty">
                <Icon name="jobs" size="xl" />
                <h3>No applications yet</h3>
                <p>When you apply for a role on the NIQS job board, you can follow its progress here.</p>
                <Link to="/jobs" className="btn bp">Find a role</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {apps.map((a) => {
                  const job = a.job || {};
                  return (
                    <article key={a._id} className="pj-card" style={{ opacity: a.status === 'withdrawn' ? 0.7 : 1 }}>
                      <div className="pj-row">
                        <div style={{ minWidth: 0, flex: 1 }}>
                          {job._id ? (
                            <Link to={`/jobs/${job._id}`} className="pj-jt">{job.title}</Link>
                          ) : (
                            <span className="pj-jt">Listing no longer available</span>
                          )}
                          <div className="pj-meta">
                            {job.company && <span><Icon name="office" size="sm" /> {job.company}</span>}
                            {(job.location || job.state) && <span><Icon name="location" size="sm" /> {[job.location, job.state].filter(Boolean).join(', ')}</span>}
                            <span><Icon name="calendar" size="sm" /> Applied {fmtDate(a.createdAt)}</span>
                          </div>
                        </div>
                        <div className="pj-actions">
                          <ApplicationStatusPill status={a.status} />
                          {['closed', 'filled'].includes(job.status) && <Pill tone="grey">Listing closed</Pill>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                        {a.history?.length > 0 && (
                          <button
                            type="button"
                            className="pj-link"
                            aria-expanded={Boolean(open[a._id])}
                            onClick={() => setOpen((o) => ({ ...o, [a._id]: !o[a._id] }))}
                          >
                            <Icon name="history" size="sm" /> {open[a._id] ? 'Hide history' : 'Show history'}
                          </button>
                        )}
                        {ACTIVE(a.status) && (
                          <button type="button" className="pj-link pj-danger" disabled={busy === a._id} onClick={() => withdraw(a)}>
                            {busy === a._id ? 'Withdrawing…' : 'Withdraw'}
                          </button>
                        )}
                      </div>
                      {open[a._id] && <Timeline history={a.history} />}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="pj-section">
            <div className="pj-head">
              <h2 className="pj-h2">Saved jobs</h2>
            </div>
            {!saved ? (
              <div className="pj-card"><p className="pj-muted">Loading…</p></div>
            ) : saved.length === 0 ? (
              <div className="pj-card pj-empty">
                <Icon name="star" size="xl" />
                <h3>Nothing saved</h3>
                <p>Use Save on any listing to keep it here while you decide.</p>
                <Link to="/jobs" className="btn bo">Browse jobs</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {saved.map((job) => {
                  const left = daysLeft(job.deadline);
                  const closed = job.status !== 'published' || (left !== null && left <= 0);
                  return (
                    <article key={job._id} className="pj-card" style={{ opacity: closed ? 0.6 : 1, background: closed ? '#fafafa' : '#fff' }}>
                      <div className="pj-row">
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <Link to={`/jobs/${job._id}`} className="pj-jt">{job.title}</Link>
                          <div className="pj-meta">
                            {job.company && <span><Icon name="office" size="sm" /> {job.company}</span>}
                            {(job.location || job.state) && <span><Icon name="location" size="sm" /> {[job.location, job.state].filter(Boolean).join(', ')}</span>}
                            {job.type && <span>{typeLabel(job.type)}</span>}
                            {!closed && job.deadline && <span><Icon name="calendar" size="sm" /> Closes {fmtDate(job.deadline)}</span>}
                          </div>
                        </div>
                        <div className="pj-actions">
                          {closed && <Pill tone="grey">Closed</Pill>}
                          <button type="button" className="pj-link" onClick={() => unsave(job)} aria-label={`Remove ${job.title} from saved jobs`}>
                            <Icon name="delete" size="sm" /> Remove
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      <style>{PORTAL_JOBS_CSS}</style>
    </div>
  );
}

/* Shared look for the three career pages in the member portal
   (PortalJobAlerts and PortalCareerProfile import it too). */
export const PORTAL_JOBS_CSS = `
  .pj { max-width: 920px; }
  .pj-title { font-family: var(--font-heading); font-size: 1.6rem; font-weight: 800; color: var(--color-navy); margin-bottom: .3rem; }
  .pj-title em { color: var(--color-gold); font-style: normal; }
  .pj-sub { font-size: .85rem; color: var(--color-txt-3); margin-bottom: 1.8rem; line-height: 1.6; }
  .pj-section { margin-bottom: 2.2rem; }
  .pj-head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; flex-wrap: wrap; margin-bottom: .9rem; }
  .pj-h2 { font-family: var(--font-heading); font-size: 1.05rem; font-weight: 700; color: var(--color-navy); margin: 0; display: flex; align-items: center; gap: 8px; }
  .pj-n { font-size: .66rem; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: var(--color-gold-xl); color: #8a6d1a; text-transform: uppercase; letter-spacing: .04em; }
  .pj-card { background: #fff; border: 1px solid var(--color-bdr); border-radius: 14px; padding: 1rem 1.2rem; }
  .pj-muted { font-size: .82rem; color: var(--color-txt-3); margin: 0; }
  .pj-empty { text-align: center; padding: 2.2rem 1.2rem; color: var(--color-txt-3); }
  .pj-empty h3 { font-family: var(--font-heading); font-size: 1rem; font-weight: 700; color: var(--color-navy); margin: .6rem 0 .3rem; }
  .pj-empty p { font-size: .8rem; margin: 0 auto 1rem; max-width: 380px; line-height: 1.6; }
  .pj-row { display: flex; gap: 12px; align-items: flex-start; justify-content: space-between; }
  .pj-jt { font-family: var(--font-heading); font-weight: 700; font-size: .95rem; color: var(--color-navy); text-decoration: none; letter-spacing: -.01em; overflow-wrap: anywhere; }
  .pj-jt:hover { text-decoration: underline; }
  .pj-meta { display: flex; gap: .9rem; flex-wrap: wrap; font-size: .74rem; color: var(--color-txt-3); margin-top: 4px; }
  .pj-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 6px; flex-shrink: 0; }
  .pj-link { border: 1px solid var(--color-bdr); background: #fff; color: var(--color-txt-2); border-radius: 8px; padding: 5px 10px; font-size: .72rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; font-family: inherit; }
  .pj-link:hover { border-color: var(--color-navy); color: var(--color-navy); }
  .pj-link:disabled { opacity: .5; cursor: wait; }
  .pj-danger { color: #b91c1c; border-color: #fecaca; }
  .pj-danger:hover { color: #991b1b; border-color: #f87171; }
  .pj-tl { list-style: none; margin: 12px 0 0; padding: 0 0 0 4px; border-left: 2px solid var(--color-bdr); font-size: .76rem; }
  .pj-tl li { position: relative; padding: 0 0 10px 16px; }
  .pj-tl li:last-child { padding-bottom: 0; }
  .pj-tl-dot { position: absolute; left: -7px; top: 4px; width: 10px; height: 10px; border-radius: 50%; background: #fff; border: 2px solid var(--color-gold); }
  /* Forms */
  .pj-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .pj-full { grid-column: 1 / -1; }
  .pj-label { display: block; font-size: .74rem; font-weight: 700; color: var(--color-navy); margin-bottom: 5px; }
  .pj-hint { font-size: .7rem; color: var(--color-txt-3); margin-top: 4px; line-height: 1.5; }
  .pj-input { width: 100%; padding: 9px 12px; border-radius: 8px; border: 1px solid var(--color-bdr); background: #fff; font-size: .82rem; color: var(--color-txt-2); font-family: inherit; }
  .pj-input:focus { outline: 2px solid var(--color-gold); outline-offset: 0; border-color: transparent; }
  .pj-chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .pj-chip { border: 1px solid var(--color-bdr); background: #fff; color: var(--color-txt-2); border-radius: 20px; padding: 5px 12px; font-size: .74rem; font-weight: 600; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 5px; }
  .pj-chip[aria-pressed="true"] { background: var(--color-navy); border-color: var(--color-navy); color: #fff; }
  .pj-chip:focus-visible, .pj-link:focus-visible { outline: 2px solid var(--color-gold); outline-offset: 2px; }
  .pj-check { display: flex; align-items: flex-start; gap: 8px; font-size: .8rem; color: var(--color-txt-2); cursor: pointer; line-height: 1.5; }
  .pj-check input { margin-top: 3px; flex-shrink: 0; }
  @media (max-width: 560px) {
    .pj-grid { grid-template-columns: minmax(0, 1fr); }
    .pj-row { flex-direction: column; }
    .pj-actions { flex-direction: row; align-items: center; flex-wrap: wrap; }
  }
`;
