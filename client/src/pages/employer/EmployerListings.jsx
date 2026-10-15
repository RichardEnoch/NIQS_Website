import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Icon from '../../components/common/Icon';
import { ListingStatusPill, Pill } from '../../components/jobs/JobBits';
import {
  myListings, setListingStatus, requestFeatured, deleteListing, employerSummary,
} from '../../api/jobsApi';
import { TONES, fmtDate, naira } from '../../data/jobBoard';
import { Modal, errMsg, AccountBanner } from './EmployerLayout';

/* Featured placement, read from the listing's own `featured` record. */
function featuredState(job) {
  const f = job.featured || {};
  const now = new Date();
  if (f.active && (!f.until || new Date(f.until) > now)) return { kind: 'active', until: f.until };
  if (f.requested && f.paid && f.until && new Date(f.until) > now) return { kind: 'confirmed', until: f.until };
  if (f.requested && !f.paid) return { kind: 'requested' };
  return { kind: 'none' };
}

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'published', label: 'Live' },
  { value: 'pending', label: 'Awaiting approval' },
  { value: 'draft', label: 'Drafts' },
  { value: 'rejected', label: 'Changes needed' },
  { value: 'paused', label: 'Paused' },
  { value: 'closed', label: 'Closed or filled' },
];

const EmployerListings = () => {
  const { employer } = useAuth();
  const approved = employer?.status === 'approved';
  const [jobs, setJobs] = useState(null);
  const [summary, setSummary] = useState(null);
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState('');          // id of the listing an action is running on
  const [dialog, setDialog] = useState(null);    // { kind, job, result? }

  const load = useCallback(() => {
    myListings()
      .then((d) => setJobs(d.jobs || []))
      .catch((err) => { setJobs([]); toast.error(errMsg(err, 'Could not load your listings.')); });
  }, []);

  useEffect(() => {
    load();
    employerSummary().then(setSummary).catch(() => {});
  }, [load]);

  const replace = (job) => setJobs((list) => list.map((j) => (j._id === job._id ? job : j)));
  const close = useCallback(() => setDialog(null), []);

  const run = async (job, action, extra, okText) => {
    setBusy(job._id);
    try {
      const d = await setListingStatus(job._id, action, extra);
      replace(d.job);
      toast.success(okText);
      setDialog(null);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy('');
    }
  };

  const doFeature = async (job) => {
    setBusy(job._id);
    try {
      const d = await requestFeatured(job._id);
      replace(d.job);
      if (d.confirmed) {
        toast.success(d.viaPackage ? 'Featured, using a placement from your package.' : 'Featured placement confirmed.');
        setDialog(null);
      } else {
        setDialog({ kind: 'payment', job: d.job, result: d });
      }
      employerSummary().then(setSummary).catch(() => {});
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy('');
    }
  };

  const doDelete = async (job) => {
    setBusy(job._id);
    try {
      await deleteListing(job._id);
      setJobs((list) => list.filter((j) => j._id !== job._id));
      toast.success('Listing deleted');
      setDialog(null);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy('');
    }
  };

  const shown = (jobs || []).filter((j) => {
    if (!filter) return true;
    if (filter === 'closed') return j.status === 'closed' || j.status === 'filled';
    return j.status === filter;
  });

  const pricing = summary?.pricing || {};
  const pkg = summary?.package;

  return (
    <div className="emp-page">
      <div className="emp-head">
        <div>
          <h1 className="emp-title">Your <em>listings</em></h1>
          <p className="emp-lead">
            Every listing is checked by the NIQS Secretariat before it goes live. Editing a live
            listing sends it back for approval.
          </p>
        </div>
        <Link to="/employer/listings/new" className="emp-btn primary"><Icon name="add" size="sm" /> Post a job</Link>
      </div>

      <AccountBanner status={employer?.status} statusNote={employer?.statusNote} hours={pricing.approvalTargetHours} />

      <div className="emp-actions" role="group" aria-label="Filter listings by status" style={{ marginBottom: '1rem' }}>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            className={`emp-btn sm${filter === f.value ? ' primary' : ''}`}
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {jobs === null && <div className="emp-card emp-empty" aria-busy="true">Loading your listings…</div>}

      {jobs && shown.length === 0 && (
        <div className="emp-card emp-empty">
          <div className="icon"><Icon name="jobs" size="lg" /></div>
          {jobs.length === 0 ? 'You have no listings yet.' : 'No listings with this status.'}
          {jobs.length === 0 && (
            <div style={{ marginTop: '.8rem' }}>
              <Link to="/employer/listings/new" className="emp-btn primary">Post your first job</Link>
            </div>
          )}
        </div>
      )}

      <div className="emp-list">
        {shown.map((job) => {
          const fs = featuredState(job);
          const secretariatPause = job.status === 'paused' && !job.pausedByEmployer;
          const ended = job.status === 'closed' || job.status === 'filled';
          const canFeature = !ended && job.status !== 'rejected' && fs.kind === 'none';
          const isBusy = busy === job._id;
          return (
            <article key={job._id} className="emp-card emp-listing">
              <div className="emp-listing-top">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <h2 className="emp-listing-title">{job.title}</h2>
                  <div className="emp-muted">
                    {[job.location, job.state].filter(Boolean).join(', ')}
                    {' · '}Created {fmtDate(job.createdAt)}
                    {job.deadline ? ` · Closes ${fmtDate(job.deadline)}` : ''}
                  </div>
                </div>
                <div className="emp-tags" style={{ alignItems: 'center' }}>
                  <ListingStatusPill status={job.status} />
                  {fs.kind === 'active' && <Pill tone="gold"><Icon name="star" size={12} /> Featured until {fmtDate(fs.until)}</Pill>}
                  {fs.kind === 'confirmed' && <Pill tone="gold" title="Starts when the listing is live">Featured, starts when live</Pill>}
                  {fs.kind === 'requested' && <Pill tone="amber">Featured requested, awaiting payment</Pill>}
                </div>
              </div>

              {job.moderationNote && (job.status === 'rejected' || job.status === 'paused') && (
                <div className="emp-banner" style={{ background: TONES.red.bg, borderColor: TONES.red.border, color: TONES.red.color, margin: '.8rem 0 0' }}>
                  <Icon name="warning" size="sm" />
                  <div>
                    <strong>{job.status === 'rejected' ? 'Changes needed before this can go live' : 'Paused by the NIQS Secretariat'}</strong>
                    <span style={{ color: 'var(--text)' }}>{job.moderationNote}</span>
                  </div>
                </div>
              )}
              {secretariatPause && !job.moderationNote && (
                <p className="emp-error" style={{ marginTop: '.6rem' }}>Paused by the NIQS Secretariat. Please contact them to restore it.</p>
              )}

              <div className="emp-listing-stats">
                <span><Icon name="eye" size="sm" /> {job.views || 0} view{job.views === 1 ? '' : 's'}</span>
                {job.applyMethod === 'external' ? (
                  <span className="emp-muted">Applications go to your own link</span>
                ) : (
                  <Link to={`/employer/applicants?job=${job._id}`} className="emp-link">
                    <Icon name="inbox" size="sm" /> {job.applicationCount || 0} application{job.applicationCount === 1 ? '' : 's'}
                  </Link>
                )}
              </div>

              <div className="emp-actions" style={{ marginTop: '.8rem' }}>
                {(job.status === 'draft' || job.status === 'rejected') && (
                  <button
                    type="button"
                    className="emp-btn sm primary"
                    disabled={!approved || isBusy}
                    title={approved ? undefined : 'You can submit once the Secretariat has approved your account'}
                    onClick={() => run(job, 'submit', {}, 'Submitted for approval')}
                  >
                    Submit for approval
                  </button>
                )}
                {job.status === 'published' && (
                  <button type="button" className="emp-btn sm" disabled={isBusy} onClick={() => run(job, 'pause', {}, 'Listing paused')}>
                    Pause
                  </button>
                )}
                {job.status === 'paused' && job.pausedByEmployer && (
                  <button type="button" className="emp-btn sm primary" disabled={isBusy || !approved} onClick={() => run(job, 'resume', {}, 'Listing is live again')}>
                    Resume
                  </button>
                )}
                {!ended && !secretariatPause && (
                  <Link to={`/employer/listings/${job._id}/edit`} className="emp-btn sm">
                    <Icon name="edit" size={14} /> Edit
                  </Link>
                )}
                {canFeature && (
                  <button type="button" className="emp-btn sm gold" disabled={isBusy} onClick={() => setDialog({ kind: 'feature', job })}>
                    <Icon name="star" size={14} /> Feature this listing
                  </button>
                )}
                {job.status === 'published' && (
                  <Link to={`/jobs/${job._id}`} className="emp-btn sm" target="_blank" rel="noopener">
                    View public page
                  </Link>
                )}
                {!ended && job.status !== 'draft' && (
                  <>
                    <button type="button" className="emp-btn sm" disabled={isBusy} onClick={() => setDialog({ kind: 'fill', job })}>
                      Mark filled
                    </button>
                    <button type="button" className="emp-btn sm" disabled={isBusy} onClick={() => setDialog({ kind: 'close', job })}>
                      Close
                    </button>
                  </>
                )}
                {(job.status === 'draft' || job.status === 'rejected') && !(job.applicationCount > 0) && (
                  <button type="button" className="emp-btn sm danger" disabled={isBusy} onClick={() => setDialog({ kind: 'delete', job })}>
                    <Icon name="delete" size={14} /> Delete
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {/* ── Dialogs ── */}
      {dialog?.kind === 'fill' && (
        <Modal
          title="Mark this role as filled"
          onClose={close}
          footer={(
            <>
              <button type="button" className="emp-btn" onClick={close}>Cancel</button>
              <button type="button" className="emp-btn" disabled={busy === dialog.job._id} onClick={() => run(dialog.job, 'fill', { filledThroughNiqs: false }, 'Marked as filled')}>
                No, elsewhere
              </button>
              <button type="button" className="emp-btn primary" disabled={busy === dialog.job._id} onClick={() => run(dialog.job, 'fill', { filledThroughNiqs: true }, 'Marked as filled. Thank you.')}>
                Yes, through NIQS
              </button>
            </>
          )}
        >
          <p><b>{dialog.job.title}</b> will come off the board and stop taking applications.</p>
          <p style={{ marginTop: '.6rem' }}>Was this role filled through the NIQS job board? Your answer helps the Institute report how well the board works.</p>
        </Modal>
      )}

      {dialog?.kind === 'close' && (
        <Modal
          title="Close this listing"
          onClose={close}
          footer={(
            <>
              <button type="button" className="emp-btn" onClick={close}>Cancel</button>
              <button type="button" className="emp-btn primary" disabled={busy === dialog.job._id} onClick={() => run(dialog.job, 'close', {}, 'Listing closed')}>
                Close listing
              </button>
            </>
          )}
        >
          <p><b>{dialog.job.title}</b> will come off the board and stop taking applications. A closed listing cannot be reopened or edited; post a new one instead.</p>
          <p style={{ marginTop: '.6rem' }} className="emp-muted">
            You can still read its applications for now. Applicant details are deleted some time after the listing closes, in line with the NIQS privacy policy.
          </p>
        </Modal>
      )}

      {dialog?.kind === 'delete' && (
        <Modal
          title="Delete this listing"
          onClose={close}
          footer={(
            <>
              <button type="button" className="emp-btn" onClick={close}>Cancel</button>
              <button type="button" className="emp-btn danger" disabled={busy === dialog.job._id} onClick={() => doDelete(dialog.job)}>
                Delete
              </button>
            </>
          )}
        >
          <p>Delete <b>{dialog.job.title}</b>? This cannot be undone.</p>
        </Modal>
      )}

      {dialog?.kind === 'feature' && (
        <Modal
          title="Feature this listing"
          onClose={close}
          footer={(
            <>
              <button type="button" className="emp-btn" onClick={close}>Cancel</button>
              <button type="button" className="emp-btn gold" disabled={busy === dialog.job._id} onClick={() => doFeature(dialog.job)}>
                {pkg?.featuredRemaining > 0 ? 'Use a package placement' : pricing.featuredFee ? 'Request featured placement' : 'Feature it'}
              </button>
            </>
          )}
        >
          <p>
            A featured listing is shown at the top of the job board with a Featured mark
            {pricing.featuredDays ? ` for ${pricing.featuredDays} days` : ''}.
          </p>
          {pkg?.featuredRemaining > 0 ? (
            <p style={{ marginTop: '.6rem' }}>
              This uses one of the {pkg.featuredRemaining} featured placement{pkg.featuredRemaining === 1 ? '' : 's'} left
              in your {pkg.name} package. There is nothing more to pay.
            </p>
          ) : pricing.featuredFee ? (
            <p style={{ marginTop: '.6rem' }}>
              It costs <b>{naira(pricing.featuredFee)}</b>. Once you request it you will see how to pay.
              The placement starts when the Secretariat has confirmed your payment.
            </p>
          ) : (
            <p style={{ marginTop: '.6rem' }}>Featuring is free at present. It is confirmed straight away.</p>
          )}
          {dialog.job.status !== 'published' && (
            <p className="emp-muted" style={{ marginTop: '.6rem' }}>
              This listing is not live yet. The Featured mark shows once the Secretariat has approved it.
            </p>
          )}
        </Modal>
      )}

      {dialog?.kind === 'payment' && (
        <Modal
          title="How to pay for featured placement"
          onClose={close}
          footer={<button type="button" className="emp-btn primary" onClick={close}>Done</button>}
        >
          <p>
            Your request for <b>{dialog.job.title}</b> has been sent to the Secretariat.
            {dialog.result.fee ? <> The fee is <b>{naira(dialog.result.fee)}</b>.</> : null}
          </p>
          {dialog.result.paymentInstructions ? (
            <div className="emp-pay">{dialog.result.paymentInstructions}</div>
          ) : (
            <p style={{ marginTop: '.6rem' }}>The Secretariat will contact you with payment details.</p>
          )}
          <p className="emp-muted" style={{ marginTop: '.6rem' }}>
            The Featured mark appears on your listing once the Secretariat has confirmed payment.
          </p>
        </Modal>
      )}

      <style>{`
        .emp-list { display: flex; flex-direction: column; gap: .8rem; }
        .emp-list .emp-card + .emp-card { margin-top: 0; }
        .emp-listing-top { display: flex; justify-content: space-between; gap: .8rem; align-items: flex-start; flex-wrap: wrap; }
        .emp-listing-title { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.02rem; font-weight: 700; color: var(--navy); overflow-wrap: anywhere; margin-bottom: .2rem; }
        .emp-listing-stats { display: flex; gap: 1.1rem; flex-wrap: wrap; align-items: center; margin-top: .7rem; font-size: .78rem; color: var(--text2); }
        .emp-listing-stats a, .emp-listing-stats span { display: inline-flex; align-items: center; gap: .3rem; }
        .emp-pay { margin-top: .7rem; white-space: pre-wrap; background: var(--off); border: 1px solid var(--border); border-radius: 10px; padding: .8rem 1rem; font-size: .82rem; color: var(--text); overflow-wrap: anywhere; }
      `}</style>
    </div>
  );
};

export default EmployerListings;
