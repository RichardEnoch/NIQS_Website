/**
 * Job Board console for the Secretariat (main + national admins).
 *
 * Six tabs, kept in `?tab=` so a link can open one directly:
 *   queue     employers and listings waiting for approval
 *   listings  every listing, with edit / pause / remove / fee / applications
 *   employers employer accounts: status, flag, QS firm mark, partner, package
 *   featured  featured requests to confirm, and placements running now
 *   reports   posted, applications, filled and income by month and state
 *   settings  the proposal's "decisions needed" (main admin only to change)
 *
 * The server enforces every rule (docs/JOB_PORTAL.md); this page makes the
 * rules easy to follow: reasons are asked for where the employer will see
 * them, and an approval that needs the employer approved first offers to do it.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import API from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { canDelete } from '../../utils/roleHelpers';
import useIsMobile from '../../hooks/useIsMobile';
import AdminHeader from '../../components/admin/AdminHeader';
import StatsCard from '../../components/admin/StatsCard';
import Icon from '../../components/common/Icon';
import {
  Pill, ListingStatusPill, ApplicationStatusPill, VerificationBadge,
} from '../../components/jobs/JobBits';
import {
  LISTING_STATES, SECTORS, GRADES, JOB_TYPES, TRACKS, LISTING_STATUS,
  sectorLabel, gradeLabel, typeLabel, naira, salaryText, fmtDate,
} from '../../data/jobBoard';
import {
  adminListJobs, adminCreateJob, adminUpdateJob, adminDeleteJob, moderateJob,
  setJobFeatured, recordListingFee, adminApplications, adminEmployers,
  setEmployerStatus, flagEmployer, updateEmployerLinks, jobReports, jobReportsCsv,
  getBoardSettings, updateBoardSettings, downloadCvFile,
} from '../../api/jobsApi';

const NAVY = '#000066';
const GOLD = '#D9B650';

const TABS = [
  { value: 'queue', label: 'Awaiting approval' },
  { value: 'listings', label: 'Listings' },
  { value: 'employers', label: 'Employers' },
  { value: 'featured', label: 'Featured' },
  { value: 'reports', label: 'Reports' },
  { value: 'settings', label: 'Settings' },
];

const EMPLOYER_STATUS = {
  pending:   { label: 'Awaiting approval', tone: 'amber' },
  approved:  { label: 'Approved', tone: 'green' },
  suspended: { label: 'Suspended', tone: 'red' },
  rejected:  { label: 'Rejected', tone: 'red' },
};

const errMsg = (err, fallback = 'Something went wrong') => err?.response?.data?.message || fallback;
const titleOf = (job) => job.employer?.companyName || job.company || '';
const reviewer = (r) => (r && (r.firstName || r.lastName) ? `${r.firstName || ''} ${r.lastName || ''}`.trim() : '');

/** "3 h", "2 days 4 h" */
function waitText(hours) {
  if (hours < 1) return 'under an hour';
  const d = Math.floor(hours / 24);
  const h = Math.floor(hours % 24);
  if (!d) return `${h} h`;
  return `${d} day${d === 1 ? '' : 's'}${h ? ` ${h} h` : ''}`;
}

export default function ManageJobs() {
  const { admin } = useAuth();
  const role = admin?.role || '';
  const isMobile = useIsMobile();
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'queue';

  const [now, setNow] = useState(null);         // jobReports().now
  const [settings, setSettings] = useState(null);

  const refreshStats = useCallback(async () => {
    try {
      const r = await jobReports();
      setNow(r.now || null);
    } catch {
      /* the figures are a nicety; each tab reports its own errors */
    }
  }, []);

  useEffect(() => {
    refreshStats();
    getBoardSettings()
      .then((r) => setSettings(r.settings || r))
      .catch(() => toast.error('Could not load the job board settings'));
  }, [refreshStats]);

  const setTab = (value) => {
    const next = new URLSearchParams(params);
    next.set('tab', value);
    setParams(next, { replace: true });
  };

  const waiting = (now?.pendingListings || 0) + (now?.pendingEmployers || 0);

  return (
    <div>
      <AdminHeader title="Job Board" breadcrumbs={['Job Board']} />

      <div style={{ padding: isMobile ? '16px' : '24px 28px' }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
          <StatsCard icon="jobs" value={now?.live} label="Live listings" />
          <StatsCard icon="task" value={now?.pendingListings} label="Listings awaiting approval" color="#b45309" />
          <StatsCard icon="office" value={now?.pendingEmployers} label="Employers awaiting approval" color="#b45309" />
          <StatsCard icon="userVerified" value={now?.approvedEmployers} label="Approved employers" color="#15803d" />
        </div>

        <div role="tablist" aria-label="Job board sections" style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button
              key={t.value}
              role="tab"
              aria-selected={tab === t.value}
              onClick={() => setTab(t.value)}
              style={tabBtn(tab === t.value)}
            >
              {t.label}
              {t.value === 'queue' && waiting > 0 && <span style={countBadge}>{waiting}</span>}
            </button>
          ))}
        </div>

        <div role="tabpanel">
          {tab === 'queue' && <QueueTab settings={settings} onChanged={refreshStats} />}
          {tab === 'listings' && <ListingsTab settings={settings} role={role} onChanged={refreshStats} />}
          {tab === 'employers' && <EmployersTab settings={settings} onChanged={refreshStats} />}
          {tab === 'featured' && <FeaturedTab settings={settings} />}
          {tab === 'reports' && <ReportsTab />}
          {tab === 'settings' && (
            <SettingsTab settings={settings} onSaved={setSettings} canEdit={role === 'main_admin'} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ═════════════ Awaiting approval ═════════════ */

function QueueTab({ settings, onChanged }) {
  const [employers, setEmployers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);     // { kind, employer?, job? }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [e, j] = await Promise.all([
        adminEmployers({ status: 'pending' }),
        adminListJobs({ status: 'pending' }),
      ]);
      setEmployers(e.employers || []);
      // Oldest first: the server sorts by submittedAt, but drafts promoted
      // by an admin can lack it, so sort again on the fallback.
      const at = (x) => new Date(x.submittedAt || x.createdAt).getTime();
      setJobs([...(j.jobs || [])].sort((a, b) => at(a) - at(b)));
    } catch (err) {
      toast.error(errMsg(err, 'Could not load the queue'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const done = () => { setModal(null); load(); onChanged(); };

  const approveEmployer = async (emp) => {
    try {
      await setEmployerStatus(emp._id, 'approved', '');
      toast.success(`${emp.companyName} approved`);
      done();
    } catch (err) {
      toast.error(errMsg(err, 'Could not approve the employer'));
    }
  };

  const approveListing = async (job) => {
    // A listing cannot go live for an employer the Secretariat has not approved.
    if (job.employer && job.employer.status !== 'approved') {
      setModal({ kind: 'employerFirst', job });
      return;
    }
    try {
      await moderateJob(job._id, 'approve');
      toast.success('Listing approved and live');
      done();
    } catch (err) {
      toast.error(errMsg(err, 'Could not approve the listing'));
    }
  };

  const approveBoth = async (job) => {
    try {
      await setEmployerStatus(job.employer._id, 'approved', '');
      await moderateJob(job._id, 'approve');
      toast.success(`${job.employer.companyName} approved, and the listing is live`);
      done();
    } catch (err) {
      toast.error(errMsg(err, 'Could not approve'));
      load();
    }
  };

  if (loading) return <Loading />;

  const target = settings?.approvalTargetHours || 48;

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      {employers.length === 0 && jobs.length === 0 && (
        <Empty title="Nothing waiting">
          New employer accounts and submitted listings appear here for approval.
        </Empty>
      )}

      {employers.length > 0 && (
        <section aria-labelledby="q-emp">
          <h2 id="q-emp" style={sectionTitle}>Employers ({employers.length})</h2>
          <p style={sectionHint}>An employer can draft listings but cannot submit any until the account is approved.</p>
          <div style={{ display: 'grid', gap: 12 }}>
            {employers.map((e) => (
              <EmployerReviewCard
                key={e._id}
                employer={e}
                onApprove={() => approveEmployer(e)}
                onReject={() => setModal({ kind: 'rejectEmployer', employer: e })}
              />
            ))}
          </div>
        </section>
      )}

      {jobs.length > 0 && (
        <section aria-labelledby="q-jobs">
          <h2 id="q-jobs" style={sectionTitle}>Listings ({jobs.length}), oldest first</h2>
          <p style={sectionHint}>Target: a decision within {target} hours of submission.</p>
          <div style={{ display: 'grid', gap: 12 }}>
            {jobs.map((j) => (
              <ListingReviewCard
                key={j._id}
                job={j}
                targetHours={target}
                onApprove={() => approveListing(j)}
                onReject={() => setModal({ kind: 'rejectJob', job: j })}
                onPause={() => setModal({ kind: 'pauseJob', job: j })}
              />
            ))}
          </div>
        </section>
      )}

      {modal?.kind === 'rejectEmployer' && (
        <ReasonModal
          title={`Reject ${modal.employer.companyName}`}
          hint="The employer sees this reason when they sign in, and it is emailed to them."
          confirmLabel="Reject employer"
          danger
          onClose={() => setModal(null)}
          onSubmit={async (note) => {
            await setEmployerStatus(modal.employer._id, 'rejected', note);
            toast.success('Employer rejected');
            done();
          }}
        />
      )}
      {modal?.kind === 'rejectJob' && (
        <ReasonModal
          title="Request changes"
          hint={`Tell ${titleOf(modal.job) || 'the employer'} what to change. They see this note on the listing and can edit and resubmit it.`}
          confirmLabel="Send back for changes"
          onClose={() => setModal(null)}
          onSubmit={async (note) => {
            await moderateJob(modal.job._id, 'reject', note);
            toast.success('Sent back to the employer');
            done();
          }}
        />
      )}
      {modal?.kind === 'pauseJob' && (
        <ReasonModal
          title="Pause this listing"
          hint="A paused listing is hidden from the board. Only the Secretariat can restore a pause it made. A note is optional."
          confirmLabel="Pause listing"
          required={false}
          onClose={() => setModal(null)}
          onSubmit={async (note) => {
            await moderateJob(modal.job._id, 'pause', note);
            toast.success('Listing paused');
            done();
          }}
        />
      )}
      {modal?.kind === 'employerFirst' && (
        <Modal title="Approve the employer first" onClose={() => setModal(null)}>
          <p style={bodyText}>
            <strong>{modal.job.employer.companyName}</strong> is not an approved employer yet
            ({(EMPLOYER_STATUS[modal.job.employer.status] || {}).label || modal.job.employer.status}).
            A listing can only go live for an approved employer.
          </p>
          {modal.job.employer.flagged && (
            <Warning>This employer is flagged for possible misuse. Check the Employers tab before approving.</Warning>
          )}
          <ModalActions>
            <button type="button" onClick={() => setModal(null)} style={cancelBtn}>Cancel</button>
            <button type="button" onClick={() => approveBoth(modal.job)} style={primaryBtn}>
              Approve employer and listing
            </button>
          </ModalActions>
        </Modal>
      )}
    </div>
  );
}

function EmployerReviewCard({ employer: e, onApprove, onReject }) {
  return (
    <article style={card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={cardTitle}>{e.companyName}</h3>
          <p style={metaText}>Registered {fmtDate(e.createdAt)}</p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {e.flagged && <Pill tone="red">Flagged</Pill>}
          <Pill tone="amber">Awaiting approval</Pill>
        </div>
      </div>
      <dl style={detailGrid}>
        <Detail label="Contact">{e.contactName}{e.contactRole ? `, ${e.contactRole}` : ''}</Detail>
        <Detail label="Email"><a href={`mailto:${e.email}`} style={link}>{e.email}</a></Detail>
        {e.phone && <Detail label="Phone"><a href={`tel:${e.phone}`} style={link}>{e.phone}</a></Detail>}
        <Detail label="RC number">{e.rcNumber || 'Not given'}</Detail>
        <Detail label="Sector">{sectorLabel(e.sector)}</Detail>
        <Detail label="State">{e.state || 'Not given'}</Detail>
        {e.address && <Detail label="Address">{e.address}</Detail>}
        {e.website && (
          <Detail label="Website">
            <a href={/^https?:\/\//i.test(e.website) ? e.website : `https://${e.website}`} target="_blank" rel="noopener noreferrer" style={link}>{e.website}</a>
          </Detail>
        )}
        {e.about && <Detail label="About"><span style={{ whiteSpace: 'pre-line' }}>{e.about}</span></Detail>}
        {e.flagged && e.flagNote && <Detail label="Flag note">{e.flagNote}</Detail>}
      </dl>
      <p style={{ ...metaText, marginTop: 10 }}>
        Check the RC number on the CAC register before approving a firm you do not know.
      </p>
      <div style={actionRow}>
        <button type="button" onClick={onApprove} style={primaryBtn}>Approve employer</button>
        <button type="button" onClick={onReject} style={dangerGhostBtn}>Reject with a reason</button>
      </div>
    </article>
  );
}

function ListingReviewCard({ job, targetHours, onApprove, onReject, onPause }) {
  const [open, setOpen] = useState(false);
  const since = job.submittedAt || job.createdAt;
  const hours = since ? (Date.now() - new Date(since).getTime()) / 3_600_000 : 0;
  const overdue = hours > targetHours;
  const emp = job.employer;

  return (
    <article style={{ ...card, borderColor: overdue ? '#fecaca' : card.borderColor }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={cardTitle}>{job.title}</h3>
          <p style={metaText}>
            {titleOf(job)} · {[job.location, job.state].filter(Boolean).join(', ')} · {typeLabel(job.type)}
          </p>
        </div>
        <Pill tone={overdue ? 'red' : 'amber'} title={`Target: ${targetHours} hours`}>
          <Icon name="clock" size={13} /> Waiting {waitText(hours)}{overdue ? ', overdue' : ''}
        </Pill>
      </div>

      {emp ? (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, alignItems: 'center', fontSize: 13, color: '#374151' }}>
          <span>Employer account: <strong>{emp.companyName}</strong>{emp.email ? ` (${emp.email})` : ''}</span>
          <Pill tone={(EMPLOYER_STATUS[emp.status] || {}).tone || 'grey'}>{(EMPLOYER_STATUS[emp.status] || {}).label || emp.status}</Pill>
          {emp.isPartner && <Pill tone="gold">NIQS Partner</Pill>}
          {emp.qsFirm && <Pill tone="blue">Registered QS Firm</Pill>}
        </div>
      ) : (
        <p style={{ ...metaText, marginTop: 10 }}>Posted by the Secretariat (no employer account).</p>
      )}
      {emp?.flagged && (
        <Warning>This employer is flagged for possible misuse. Read the listing closely and see the note on the Employers tab.</Warning>
      )}

      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} style={{ ...linkBtn, marginTop: 10 }}>
        {open ? 'Hide the full listing' : 'Read the full listing'}
      </button>
      {open && <ListingPreview job={job} />}

      <div style={actionRow}>
        <button type="button" onClick={onApprove} style={primaryBtn}>Approve</button>
        <button type="button" onClick={onReject} style={ghostBtn}>Request changes</button>
        <button type="button" onClick={onPause} style={ghostBtn}>Pause</button>
      </div>
    </article>
  );
}

/** Every field of a listing, as the moderator needs to read it. */
function ListingPreview({ job }) {
  const salary = salaryText(job);
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #EEF1F7' }}>
      <dl style={detailGrid}>
        <Detail label="Company">{job.company || 'Not given'}</Detail>
        <Detail label="Location">{[job.location, job.state].filter(Boolean).join(', ') || 'Not given'}</Detail>
        <Detail label="Type">{typeLabel(job.type)} · {(TRACKS.find((t) => t.value === job.track) || {}).label || job.track}</Detail>
        <Detail label="Sector">{sectorLabel(job.sector)}</Detail>
        <Detail label="Minimum grade">{gradeLabel(job.minGrade || 'none')}</Detail>
        <Detail label="Needs a QS">{job.requiresQS ? 'Yes, a qualified quantity surveyor' : 'No'}</Detail>
        <Detail label="Who can apply">{job.membersOnly ? 'NIQS members only' : 'Anyone'}</Detail>
        <Detail label="Salary">{salary || 'Not stated'}</Detail>
        <Detail label="Deadline">{job.deadline ? fmtDate(job.deadline) : 'None'}</Detail>
        <Detail label="Apply">
          {job.applyMethod === 'external'
            ? <>On the employer's site: <a href={job.applicationLink} target="_blank" rel="noopener noreferrer" style={link}>{job.applicationLink}</a></>
            : 'Through the NIQS portal'}
        </Detail>
        {job.logo && <Detail label="Logo"><img src={job.logo} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, border: '1px solid #e5e7eb' }} /></Detail>}
        <Detail label="Description"><span style={{ whiteSpace: 'pre-line' }}>{job.description}</span></Detail>
        {job.requirements && <Detail label="Requirements"><span style={{ whiteSpace: 'pre-line' }}>{job.requirements}</span></Detail>}
        {job.moderationNote && <Detail label="Last note">{job.moderationNote}</Detail>}
      </dl>
    </div>
  );
}

/* ═════════════ All listings ═════════════ */

const STATUS_CHIPS = [{ value: '', label: 'All' }, ...Object.entries(LISTING_STATUS).map(([value, s]) => ({ value, label: s.label }))];

function ListingsTab({ settings, role, onChanged }) {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const query = useDebounced(q);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);     // { kind, job? }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminListJobs({ status, q: query });
      setJobs(r.jobs || []);
    } catch (err) {
      toast.error(errMsg(err, 'Could not load listings'));
    } finally {
      setLoading(false);
    }
  }, [status, query]);

  useEffect(() => { load(); }, [load]);

  const done = () => { setModal(null); load(); onChanged(); };

  const act = async (job, action, note, message) => {
    try {
      await moderateJob(job._id, action, note);
      toast.success(message);
      done();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <SearchBox value={q} onChange={setQ} label="Search listings by title, company or location" />
        <button type="button" onClick={() => setModal({ kind: 'form' })} style={primaryBtn}>+ Post a listing</button>
      </div>
      <Chips options={STATUS_CHIPS} value={status} onChange={setStatus} label="Filter by status" />

      {loading ? <Loading /> : jobs.length === 0 ? (
        <Empty title="No listings">{status || query ? 'Nothing matches these filters.' : 'No listings have been posted yet.'}</Empty>
      ) : (
        <TableWrap>
          <table style={table}>
            <thead>
              <tr>
                {['Title', 'Employer', 'State', 'Status', 'Featured', 'Views', 'Applications', 'Published', ''].map((h, i) => (
                  <th key={i} scope="col" style={th}>{h || <span style={srOnly}>Actions</span>}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {jobs.map((j, i) => (
                <tr key={j._id} style={{ background: i % 2 ? '#fafbfc' : '#fff' }}>
                  <td style={{ ...td, fontWeight: 600, color: NAVY, minWidth: 180 }}>{j.title}</td>
                  <td style={td}>
                    {j.employer?.companyName || j.company}
                    {j.employer?.flagged && <> <Pill tone="red">Flagged</Pill></>}
                    {!j.employer && <div style={metaText}>Posted by the Secretariat</div>}
                  </td>
                  <td style={td}>{j.state || '--'}</td>
                  <td style={td}><ListingStatusPill status={j.status} /></td>
                  <td style={td}>
                    {j.featured?.active ? <Pill tone="gold">Until {fmtDate(j.featured.until)}</Pill>
                      : j.featured?.requested && !j.featured?.paid ? <Pill tone="amber">Requested</Pill>
                      : '--'}
                  </td>
                  <td style={td}>{j.views || 0}</td>
                  <td style={td}>{j.applicationCount || 0}</td>
                  <td style={{ ...td, whiteSpace: 'nowrap' }}>{j.publishedAt ? fmtDate(j.publishedAt) : '--'}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <button type="button" onClick={() => setModal({ kind: 'manage', job: j })} style={smallBtn} aria-label={`Manage ${j.title}`}>
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      {modal?.kind === 'manage' && (
        <ListingActionsModal
          job={modal.job}
          role={role}
          onClose={() => setModal(null)}
          onPick={(kind) => {
            if (kind === 'restore') act(modal.job, 'restore', '', 'Listing restored and live');
            else setModal({ kind, job: modal.job });
          }}
        />
      )}
      {modal?.kind === 'form' && (
        <ListingFormModal job={modal.job} onClose={() => setModal(null)} onSaved={done} />
      )}
      {modal?.kind === 'pause' && (
        <ReasonModal
          title="Pause this listing"
          hint="It disappears from the board and any featured placement stops. The employer cannot resume a pause the Secretariat made. A note is optional; the employer sees it."
          confirmLabel="Pause listing"
          required={false}
          onClose={() => setModal(null)}
          onSubmit={async (note) => { await moderateJob(modal.job._id, 'pause', note); toast.success('Listing paused'); done(); }}
        />
      )}
      {modal?.kind === 'remove' && (
        <ReasonModal
          title="Remove this listing"
          hint="Removing closes the listing for good. The employer sees the reason. Applications are kept for the retention period, then deleted."
          confirmLabel="Remove listing"
          danger
          onClose={() => setModal(null)}
          onSubmit={async (note) => { await moderateJob(modal.job._id, 'remove', note); toast.success('Listing removed'); done(); }}
        />
      )}
      {modal?.kind === 'fee' && (
        <ListingFeeModal job={modal.job} settings={settings} onClose={() => setModal(null)} onSaved={done} />
      )}
      {modal?.kind === 'applications' && (
        <ApplicationsModal job={modal.job} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'delete' && (
        <ConfirmModal
          title="Delete this listing?"
          confirmLabel="Delete for good"
          onClose={() => setModal(null)}
          onConfirm={async () => {
            await adminDeleteJob(modal.job._id);
            toast.success('Listing deleted');
            done();
          }}
        >
          <p style={bodyText}>
            This deletes <strong>{modal.job.title}</strong> and <strong>every application to it</strong>,
            including applicants' CVs unless they are still on a member's profile.
            It cannot be undone. To take a listing down but keep the record, use Remove instead.
          </p>
          {modal.job.applicationCount > 0 && (
            <Warning>{modal.job.applicationCount} application{modal.job.applicationCount === 1 ? '' : 's'} will be deleted.</Warning>
          )}
        </ConfirmModal>
      )}
    </div>
  );
}

function ListingActionsModal({ job, role, onClose, onPick }) {
  const canRestore = ['paused', 'rejected', 'closed', 'filled', 'draft', 'pending'].includes(job.status);
  const canPause = ['published', 'pending'].includes(job.status);
  const canRemove = !['closed', 'filled'].includes(job.status);
  const fee = job.listingFee?.paidAt ? job.listingFee : null;

  return (
    <Modal title={job.title} onClose={onClose}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <ListingStatusPill status={job.status} />
        {job.featured?.active && <Pill tone="gold">Featured until {fmtDate(job.featured.until)}</Pill>}
      </div>
      <p style={metaText}>{titleOf(job)} · {[job.location, job.state].filter(Boolean).join(', ')}</p>
      {job.moderationNote && <p style={{ ...metaText, marginTop: 6 }}>Last note to the employer: {job.moderationNote}</p>}
      {job.reviewedBy && <p style={metaText}>Last reviewed by {reviewer(job.reviewedBy)}{job.reviewedAt ? ` on ${fmtDate(job.reviewedAt)}` : ''}</p>}
      {fee && <p style={metaText}>Listing fee recorded: {naira(fee.amount)}{fee.reference ? ` (ref. ${fee.reference})` : ''} on {fmtDate(fee.paidAt)}</p>}

      <div style={{ display: 'grid', gap: 8, marginTop: 16 }}>
        <ActionItem onClick={() => onPick('form')} title="Edit" detail="Change any field. The status stays as it is." />
        {canRestore && (
          <ActionItem
            onClick={() => onPick('restore')}
            title={job.status === 'pending' || job.status === 'draft' ? 'Approve and publish' : 'Restore'}
            detail="Puts the listing live. The employer must be approved."
          />
        )}
        {canPause && <ActionItem onClick={() => onPick('pause')} title="Pause" detail="Hide it from the board for now." />}
        {canRemove && <ActionItem onClick={() => onPick('remove')} title="Remove" detail="Close it with a reason the employer sees." />}
        <ActionItem onClick={() => onPick('fee')} title="Record listing fee" detail="Log an offline payment for income reports." />
        <ActionItem onClick={() => onPick('applications')} title={`View applications (${job.applicationCount || 0})`} detail="Who applied and how their membership checked out." />
        <a href={`/jobs/${job._id}`} target="_blank" rel="noopener noreferrer" style={{ ...actionItem, textDecoration: 'none' }}>
          <strong style={{ color: NAVY, fontSize: 14 }}>View public page</strong>
          <span style={metaText}>{job.status === 'published' ? 'Opens in a new tab.' : 'Only live listings are on the public board; closed and filled ones stay readable.'}</span>
        </a>
        {canDelete(role) && (
          <ActionItem onClick={() => onPick('delete')} title="Delete" detail="Deletes the listing and its applicant data." danger />
        )}
      </div>
    </Modal>
  );
}

function ActionItem({ title, detail, onClick, danger }) {
  return (
    <button type="button" onClick={onClick} style={{ ...actionItem, borderColor: danger ? '#fecaca' : actionItem.borderColor }}>
      <strong style={{ color: danger ? '#b91c1c' : NAVY, fontSize: 14 }}>{title}</strong>
      <span style={metaText}>{detail}</span>
    </button>
  );
}

const emptyListing = {
  title: '', company: '', location: '', state: '', type: 'full-time', track: 'job', sector: 'other',
  minGrade: 'none', requiresQS: false, membersOnly: false, description: '', requirements: '',
  salaryMin: '', salaryMax: '', salary: '', deadline: '', applyMethod: 'portal', applicationLink: '', logo: '',
};

function ListingFormModal({ job, onClose, onSaved }) {
  const [form, setForm] = useState(() => (job ? {
    ...emptyListing,
    ...Object.fromEntries(Object.keys(emptyListing).map((k) => [k, job[k] ?? emptyListing[k]])),
    salaryMin: job.salaryMin ?? '',
    salaryMax: job.salaryMax ?? '',
    deadline: job.deadline ? String(job.deadline).slice(0, 10) : '',
  } : { ...emptyListing }));
  const [asDraft, setAsDraft] = useState(false);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState('');
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    // The same rules the server applies, said before the round trip.
    if (form.requiresQS && form.minGrade === 'none') {
      setProblem('A role that requires a qualified quantity surveyor must state the minimum NIQS grade.');
      return;
    }
    if (form.applyMethod === 'external' && !/^https?:\/\//i.test(form.applicationLink)) {
      setProblem('The application link must start with http:// or https://');
      return;
    }
    if (form.salaryMin !== '' && form.salaryMax !== '' && Number(form.salaryMin) > Number(form.salaryMax)) {
      setProblem('The minimum salary is higher than the maximum.');
      return;
    }
    setProblem('');
    setSaving(true);
    const body = {
      ...form,
      salaryMin: form.salaryMin === '' ? null : Number(form.salaryMin),
      salaryMax: form.salaryMax === '' ? null : Number(form.salaryMax),
      applicationLink: form.applyMethod === 'external' ? form.applicationLink : '',
    };
    try {
      if (job) {
        await adminUpdateJob(job._id, body);
        toast.success('Listing updated');
      } else {
        await adminCreateJob({ ...body, status: asDraft ? 'draft' : undefined });
        toast.success(asDraft ? 'Saved as a draft' : 'Listing posted and live');
      }
      onSaved();
    } catch (err) {
      setProblem(errMsg(err, 'Could not save the listing'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={job ? 'Edit listing' : 'Post a listing'} onClose={onClose} wide>
      {!job && (
        <p style={{ ...sectionHint, marginTop: 0 }}>
          A listing the Secretariat posts goes live at once, without the moderation queue.
        </p>
      )}
      <form onSubmit={submit} noValidate>
        <FormField label="Job title" required>
          {(id) => <input id={id} value={form.title} onChange={set('title')} required style={inputStyle} />}
        </FormField>
        <Grid>
          <FormField label="Company" required>
            {(id) => <input id={id} value={form.company} onChange={set('company')} required style={inputStyle} />}
          </FormField>
          <FormField label="Location (town or city)">
            {(id) => <input id={id} value={form.location} onChange={set('location')} style={inputStyle} placeholder="Ikeja" />}
          </FormField>
          <FormField label="State">
            {(id) => (
              <select id={id} value={form.state} onChange={set('state')} style={inputStyle}>
                <option value="">Choose a state</option>
                {LISTING_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </FormField>
          <FormField label="Type">
            {(id) => (
              <select id={id} value={form.type} onChange={set('type')} style={inputStyle}>
                {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            )}
          </FormField>
          <FormField label="Board">
            {(id) => (
              <select id={id} value={form.track} onChange={set('track')} style={inputStyle}>
                {TRACKS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            )}
          </FormField>
          <FormField label="Sector">
            {(id) => (
              <select id={id} value={form.sector} onChange={set('sector')} style={inputStyle}>
                {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            )}
          </FormField>
          <FormField label="Minimum NIQS grade">
            {(id) => (
              <select id={id} value={form.minGrade} onChange={set('minGrade')} style={inputStyle}>
                {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            )}
          </FormField>
        </Grid>
        <Check checked={form.requiresQS} onChange={set('requiresQS')} label="This role requires a qualified quantity surveyor">
          Then a minimum grade is required.
        </Check>
        <Check checked={form.membersOnly} onChange={set('membersOnly')} label="NIQS members only">
          Non-members cannot apply through the portal.
        </Check>
        <FormField label="Description" required>
          {(id) => <textarea id={id} value={form.description} onChange={set('description')} required rows={5} style={textareaStyle} />}
        </FormField>
        <FormField label="Requirements">
          {(id) => <textarea id={id} value={form.requirements} onChange={set('requirements')} rows={3} style={textareaStyle} placeholder="One per line" />}
        </FormField>
        <Grid>
          <FormField label="Salary from (₦ a month)">
            {(id) => <input id={id} type="number" min="0" inputMode="numeric" value={form.salaryMin} onChange={set('salaryMin')} style={inputStyle} />}
          </FormField>
          <FormField label="Salary to (₦ a month)">
            {(id) => <input id={id} type="number" min="0" inputMode="numeric" value={form.salaryMax} onChange={set('salaryMax')} style={inputStyle} />}
          </FormField>
        </Grid>
        <FormField label="Salary as shown (optional)" hint="Replaces the range on the listing, for example 'Negotiable' or '₦4.8m a year'.">
          {(id) => <input id={id} value={form.salary} onChange={set('salary')} style={inputStyle} />}
        </FormField>
        <Grid>
          <FormField label="Closing date">
            {(id) => <input id={id} type="date" value={form.deadline} onChange={set('deadline')} style={inputStyle} />}
          </FormField>
          <FormField label="How people apply">
            {(id) => (
              <select id={id} value={form.applyMethod} onChange={set('applyMethod')} style={inputStyle}>
                <option value="portal">Through the NIQS portal</option>
                <option value="external">On the employer's own site</option>
              </select>
            )}
          </FormField>
        </Grid>
        {form.applyMethod === 'external' && (
          <FormField label="Application link" required>
            {(id) => <input id={id} type="url" value={form.applicationLink} onChange={set('applicationLink')} style={inputStyle} placeholder="https://" />}
          </FormField>
        )}
        <FormField label="Logo URL">
          {(id) => <input id={id} type="url" value={form.logo} onChange={set('logo')} style={inputStyle} placeholder="https://" />}
        </FormField>
        {!job && (
          <Check checked={asDraft} onChange={(e) => setAsDraft(e.target.checked)} label="Save as a draft">
            Keep it off the board until you publish it from Listings.
          </Check>
        )}
        {problem && <ErrorText>{problem}</ErrorText>}
        <ModalActions>
          <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
          <button type="submit" disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : job ? 'Save changes' : asDraft ? 'Save draft' : 'Post listing'}
          </button>
        </ModalActions>
      </form>
    </Modal>
  );
}

function ListingFeeModal({ job, settings, onClose, onSaved }) {
  const prev = job.listingFee?.paidAt ? job.listingFee : null;
  const [amount, setAmount] = useState(String(prev?.amount || settings?.standardListingFee || ''));
  const [reference, setReference] = useState(prev?.reference || '');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!(Number(amount) > 0)) { toast.error('Enter the amount received'); return; }
    setSaving(true);
    try {
      await recordListingFee(job._id, { amount: Number(amount), reference });
      toast.success('Listing fee recorded');
      onSaved();
    } catch (err) {
      toast.error(errMsg(err, 'Could not record the fee'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Record listing fee" onClose={onClose}>
      <p style={{ ...bodyText, marginTop: 0 }}>
        For <strong>{job.title}</strong>. Record money only once it has reached the NIQS account; reports count it in the month you record it.
      </p>
      {prev && <Warning>A fee of {naira(prev.amount)} was already recorded on {fmtDate(prev.paidAt)}. Saving replaces it.</Warning>}
      <form onSubmit={submit}>
        <FormField label="Amount received (₦)" required>
          {(id) => <input id={id} type="number" min="1" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} />}
        </FormField>
        <FormField label="Payment reference" hint="Bank transfer reference or receipt number.">
          {(id) => <input id={id} value={reference} onChange={(e) => setReference(e.target.value)} style={inputStyle} />}
        </FormField>
        <ModalActions>
          <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
          <button type="submit" disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Record fee'}</button>
        </ModalActions>
      </form>
    </Modal>
  );
}

function ApplicationsModal({ job, onClose }) {
  const [apps, setApps] = useState(null);

  useEffect(() => {
    adminApplications({ job: job._id })
      .then((r) => setApps(r.applications || []))
      .catch((err) => { toast.error(errMsg(err, 'Could not load applications')); setApps([]); });
  }, [job._id]);

  const cv = async (a) => {
    try {
      await downloadCvFile(a.cv._id, a.cv.filename || 'cv');
    } catch (err) {
      toast.error(errMsg(err, 'Could not download the CV'));
    }
  };

  return (
    <Modal title={`Applications: ${job.title}`} onClose={onClose} wide>
      {job.applyMethod === 'external' && (
        <p style={{ ...sectionHint, marginTop: 0 }}>This listing sends applicants to the employer's own site, so the portal only holds applications made here.</p>
      )}
      <p style={{ ...sectionHint, marginTop: 0 }}>
        "Verified" appears only once the NIQS register confirms a member. Until the register is connected, grades are shown as recorded on the website.
      </p>
      {apps === null ? <Loading /> : apps.length === 0 ? (
        <Empty title="No applications yet" />
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
          {apps.map((a) => (
            <li key={a._id} style={{ ...card, padding: '12px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ color: NAVY, fontSize: 14 }}>{a.fullName}</strong>
                  <div style={metaText}>{a.email}{a.phone ? ` · ${a.phone}` : ''} · applied {fmtDate(a.createdAt)}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <VerificationBadge verification={a.verification} compact />
                  <ApplicationStatusPill status={a.status} />
                  {a.cv?._id && <button type="button" onClick={() => cv(a)} style={smallBtn}>CV</button>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

/* ═════════════ Employers ═════════════ */

const EMPLOYER_CHIPS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Awaiting approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'rejected', label: 'Rejected' },
];

function EmployersTab({ settings, onChanged }) {
  const [status, setStatus] = useState('');
  const [flagged, setFlagged] = useState(false);
  const [q, setQ] = useState('');
  const query = useDebounced(q);
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminEmployers({ status, flagged: flagged ? 1 : undefined, q: query });
      setEmployers(r.employers || []);
    } catch (err) {
      toast.error(errMsg(err, 'Could not load employers'));
    } finally {
      setLoading(false);
    }
  }, [status, flagged, query]);

  useEffect(() => { load(); }, [load]);

  // The open record is re-read from the list after each change, so it always
  // shows what the server holds (populated firm, reviewer and counts).
  const open = employers.find((e) => e._id === openId);

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <SearchBox value={q} onChange={setQ} label="Search employers by company, contact, email or RC number" />
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13, color: '#374151' }}>
          <input type="checkbox" checked={flagged} onChange={(e) => setFlagged(e.target.checked)} /> Flagged only
        </label>
      </div>
      <Chips options={EMPLOYER_CHIPS} value={status} onChange={setStatus} label="Filter by account status" />

      {loading && !employers.length ? <Loading /> : employers.length === 0 ? (
        <Empty title="No employers">{status || flagged || query ? 'Nothing matches these filters.' : 'No employer has registered yet.'}</Empty>
      ) : (
        <TableWrap>
          <table style={table}>
            <thead>
              <tr>
                {['Company', 'Contact', 'Status', 'Listings', 'Marks', 'Package', 'Registered', ''].map((h, i) => (
                  <th key={i} scope="col" style={th}>{h || <span style={srOnly}>Actions</span>}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employers.map((e, i) => {
                const st = EMPLOYER_STATUS[e.status] || { label: e.status, tone: 'grey' };
                return (
                  <tr key={e._id} style={{ background: i % 2 ? '#fafbfc' : '#fff' }}>
                    <td style={{ ...td, fontWeight: 600, color: NAVY, minWidth: 160 }}>{e.companyName}</td>
                    <td style={td}>{e.contactName}<div style={metaText}>{e.email}</div></td>
                    <td style={td}><Pill tone={st.tone}>{st.label}</Pill></td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{e.liveCount} live / {e.listingCount}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {e.flagged && <Pill tone="red">Flagged</Pill>}
                        {e.qsFirm && <Pill tone="blue" title={e.qsFirm.name}>QS Firm</Pill>}
                        {e.isPartner && <Pill tone="gold">Partner</Pill>}
                        {!e.flagged && !e.qsFirm && !e.isPartner && '--'}
                      </div>
                    </td>
                    <td style={td}>{e.package?.name || '--'}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDate(e.createdAt)}</td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button type="button" onClick={() => setOpenId(e._id)} style={smallBtn} aria-label={`Open ${e.companyName}`}>Open</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}

      {open && (
        <EmployerModal
          employer={open}
          settings={settings}
          onClose={() => setOpenId(null)}
          onChanged={() => { load(); onChanged(); }}
        />
      )}
    </div>
  );
}

function EmployerModal({ employer: e, settings, onClose, onChanged }) {
  const st = EMPLOYER_STATUS[e.status] || { label: e.status, tone: 'grey' };

  return (
    <Modal title={e.companyName} onClose={onClose} wide>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <Pill tone={st.tone}>{st.label}</Pill>
        {e.flagged && <Pill tone="red">Flagged</Pill>}
        {e.qsFirm && <Pill tone="blue">Registered QS Firm</Pill>}
        {e.isPartner && <Pill tone="gold">NIQS Partner</Pill>}
      </div>
      <dl style={detailGrid}>
        <Detail label="Contact">{e.contactName}{e.contactRole ? `, ${e.contactRole}` : ''}</Detail>
        <Detail label="Email"><a href={`mailto:${e.email}`} style={link}>{e.email}</a></Detail>
        {e.phone && <Detail label="Phone">{e.phone}</Detail>}
        <Detail label="RC number">{e.rcNumber || 'Not given'}</Detail>
        <Detail label="Sector">{sectorLabel(e.sector)}</Detail>
        <Detail label="State">{e.state || 'Not given'}</Detail>
        {e.website && <Detail label="Website">{e.website}</Detail>}
        {e.about && <Detail label="About"><span style={{ whiteSpace: 'pre-line' }}>{e.about}</span></Detail>}
        <Detail label="Listings">{e.liveCount} live of {e.listingCount}</Detail>
        <Detail label="Registered">{fmtDate(e.createdAt)}{e.lastLogin ? ` · last signed in ${fmtDate(e.lastLogin)}` : ''}</Detail>
      </dl>

      <EmployerStatusSection employer={e} onChanged={onChanged} />
      <EmployerFlagSection employer={e} onChanged={onChanged} />
      <EmployerFirmSection employer={e} onChanged={onChanged} />
      <EmployerPartnerSection employer={e} onChanged={onChanged} />
      <EmployerPackageSection employer={e} settings={settings} onChanged={onChanged} />
    </Modal>
  );
}

function Section({ title, children }) {
  return (
    <section style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid #EEF1F7' }}>
      <h3 style={{ ...sectionTitle, fontSize: 14, marginBottom: 8 }}>{title}</h3>
      {children}
    </section>
  );
}

function EmployerStatusSection({ employer: e, onChanged }) {
  const [status, setStatus] = useState(e.status);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const needsNote = status === 'rejected' || status === 'suspended';
  const by = reviewer(e.reviewedBy);

  const save = async () => {
    if (needsNote && !note.trim()) { toast.error('Give the employer a reason'); return; }
    setSaving(true);
    try {
      const r = await setEmployerStatus(e._id, status, note.trim());
      const paused = r.pausedListings || 0;
      toast.success(paused ? `Status saved. ${paused} listing${paused === 1 ? '' : 's'} paused.` : 'Status saved');
      setNote('');
      onChanged();
    } catch (err) {
      toast.error(errMsg(err, 'Could not change the status'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Account status">
      {(e.statusNote || by) && (
        <p style={{ ...metaText, marginBottom: 10 }}>
          {e.statusNote ? <>Last note to the employer: "{e.statusNote}". </> : null}
          {by ? `Reviewed by ${by}${e.reviewedAt ? ` on ${fmtDate(e.reviewedAt)}` : ''}.` : ''}
        </p>
      )}
      <Grid>
        <FormField label="Status">
          {(id) => (
            <select id={id} value={status} onChange={(ev) => setStatus(ev.target.value)} style={inputStyle}>
              {Object.entries(EMPLOYER_STATUS).map(([v, s]) => <option key={v} value={v}>{s.label}</option>)}
            </select>
          )}
        </FormField>
      </Grid>
      {needsNote && (
        <p style={{ ...metaText, marginBottom: 8 }}>
          This pauses all of the employer's live and pending listings. They cannot resume them.
        </p>
      )}
      <FormField label={needsNote ? 'Reason (the employer sees this)' : 'Note to the employer (optional)'} required={needsNote}>
        {(id) => <textarea id={id} value={note} onChange={(ev) => setNote(ev.target.value)} rows={2} style={textareaStyle} />}
      </FormField>
      <button type="button" onClick={save} disabled={saving || (status === e.status && !note.trim())} style={{ ...primaryBtn, opacity: saving || (status === e.status && !note.trim()) ? 0.5 : 1 }}>
        {saving ? 'Saving…' : 'Save status'}
      </button>
    </Section>
  );
}

function EmployerFlagSection({ employer: e, onChanged }) {
  const [note, setNote] = useState(e.flagNote || '');
  const [saving, setSaving] = useState(false);

  const save = async (flagged) => {
    setSaving(true);
    try {
      await flagEmployer(e._id, flagged, flagged ? note.trim() : '');
      toast.success(flagged ? 'Employer flagged' : 'Flag removed');
      if (!flagged) setNote('');
      onChanged();
    } catch (err) {
      toast.error(errMsg(err, 'Could not save the flag'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Misuse flag">
      <p style={{ ...metaText, marginBottom: 8 }}>
        Internal only; the employer never sees it. A flag warns moderators when this employer's listings come up for approval.
      </p>
      <FormField label="Why it is flagged">
        {(id) => <textarea id={id} value={note} onChange={(ev) => setNote(ev.target.value)} rows={2} style={textareaStyle} />}
      </FormField>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => save(true)} disabled={saving} style={ghostBtn}>{e.flagged ? 'Update flag' : 'Flag this employer'}</button>
        {e.flagged && <button type="button" onClick={() => save(false)} disabled={saving} style={ghostBtn}>Remove flag</button>}
      </div>
    </Section>
  );
}

/** Firms in the Find a QS Firm directory, loaded once per page view. */
let firmCache = null;
function useQsFirms() {
  const [firms, setFirms] = useState(firmCache);
  useEffect(() => {
    if (firmCache) return;
    // The admin list reads the website's own directory, which is what the
    // server checks a link against (a portal-sourced id would be refused).
    API.get('/qs-firms/admin/all')
      .then(({ data }) => { firmCache = data.firms || []; setFirms(firmCache); })
      .catch(() => setFirms([]));
  }, []);
  return firms;
}

function EmployerFirmSection({ employer: e, onChanged }) {
  const firms = useQsFirms();
  const [q, setQ] = useState('');
  const [saving, setSaving] = useState(false);
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s || !firms) return [];
    return firms.filter((f) => [f.name, f.regNumber, f.city, f.state].some((v) => v && String(v).toLowerCase().includes(s))).slice(0, 8);
  }, [q, firms]);

  const save = async (qsFirm) => {
    setSaving(true);
    try {
      await updateEmployerLinks(e._id, { qsFirm });
      toast.success(qsFirm ? 'Linked to the QS firm directory' : 'Link removed');
      setQ('');
      onChanged();
    } catch (err) {
      toast.error(errMsg(err, 'Could not save the link'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Registered QS Firm mark">
      <p style={{ ...metaText, marginBottom: 8 }}>
        The mark shows on every listing from this employer. Link only a firm that is in the Find a QS Firm directory.
      </p>
      {e.qsFirm ? (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontSize: 14 }}>Linked to <strong>{e.qsFirm.name}</strong>{e.qsFirm.state ? ` (${e.qsFirm.state})` : ''}</span>
          <button type="button" onClick={() => save(null)} disabled={saving} style={ghostBtn}>Remove link</button>
        </div>
      ) : (
        <p style={{ ...metaText, marginBottom: 8 }}>Not linked.</p>
      )}
      <FormField label={e.qsFirm ? 'Link a different firm' : 'Find the firm in the directory'}>
        {(id) => <input id={id} type="search" value={q} onChange={(ev) => setQ(ev.target.value)} style={inputStyle} placeholder="Firm name, registration number or city" />}
      </FormField>
      {firms === null && q && <p style={metaText}>Loading the directory…</p>}
      {firms && q.trim() && matches.length === 0 && <p style={metaText}>No firm in the directory matches "{q}".</p>}
      {matches.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
          {matches.map((f) => (
            <li key={f._id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: '8px 10px', border: '1px solid #e5e7eb', borderRadius: 8 }}>
              <span style={{ fontSize: 13, minWidth: 0 }}>
                <strong>{f.name}</strong>
                <span style={metaText}> {[f.city, f.state, f.regNumber].filter(Boolean).join(' · ')}{f.isActive === false ? ' · hidden from the directory' : ''}</span>
              </span>
              <button type="button" onClick={() => save(f._id)} disabled={saving || String(e.qsFirm?._id) === String(f._id)} style={smallBtn}>Link</button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function EmployerPartnerSection({ employer: e, onChanged }) {
  const [partners, setPartners] = useState(null);
  const [isPartner, setIsPartner] = useState(Boolean(e.isPartner));
  const [partner, setPartner] = useState(e.partner ? String(e.partner._id || e.partner) : '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    API.get('/partners').then(({ data }) => setPartners(Array.isArray(data) ? data : data.partners || [])).catch(() => setPartners([]));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await updateEmployerLinks(e._id, { isPartner, partner: isPartner ? partner || null : null });
      toast.success('Partner details saved');
      onChanged();
    } catch (err) {
      toast.error(errMsg(err, 'Could not save'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="NIQS Partner">
      <Check checked={isPartner} onChange={(ev) => setIsPartner(ev.target.checked)} label="Show the NIQS Partner mark on this employer's listings">
        Use for firms with a partnership agreement with NIQS.
      </Check>
      {isPartner && partners && partners.length > 0 && (
        <FormField label="Partner record (optional)">
          {(id) => (
            <select id={id} value={partner} onChange={(ev) => setPartner(ev.target.value)} style={inputStyle}>
              <option value="">Not linked</option>
              {partners.map((p) => <option key={p._id} value={p._id}>{p.name}{p.tier ? ` (${p.tier})` : ''}</option>)}
            </select>
          )}
        </FormField>
      )}
      <button type="button" onClick={save} disabled={saving} style={ghostBtn}>{saving ? 'Saving…' : 'Save partner details'}</button>
    </Section>
  );
}

function EmployerPackageSection({ employer: e, settings, onChanged }) {
  const cur = e.package?.name ? e.package : null;
  const [form, setForm] = useState({
    name: cur?.name || '', listingsQuota: cur?.listingsQuota ?? '', featuredQuota: cur?.featuredQuota ?? '',
    months: 12, amountPaid: cur?.amountPaid ?? '', reference: cur?.reference || '',
    renew: !cur?.name,
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (ev) => setForm((f) => ({ ...f, [k]: ev.target.value }));
  const offered = settings?.packages || [];

  const pick = (ev) => {
    const p = offered.find((x) => x.name === ev.target.value);
    if (p) setForm((f) => ({ ...f, name: p.name, listingsQuota: p.listingsQuota, featuredQuota: p.featuredQuota, months: p.months || 12, amountPaid: p.price || '' }));
  };

  const save = async (remove) => {
    if (!remove && !form.name.trim()) { toast.error('Give the package a name'); return; }
    setSaving(true);
    try {
      await updateEmployerLinks(e._id, {
        package: remove ? null : {
          name: form.name.trim(),
          listingsQuota: Number(form.listingsQuota) || 0,
          featuredQuota: Number(form.featuredQuota) || 0,
          months: Number(form.months) || 12,
          amountPaid: Number(form.amountPaid) || 0,
          reference: form.reference,
          renew: Boolean(form.renew),
        },
      });
      toast.success(remove ? 'Package removed' : 'Package saved');
      onChanged();
    } catch (err) {
      toast.error(errMsg(err, 'Could not save the package'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Package">
      {cur ? (
        <p style={{ ...metaText, marginBottom: 10 }}>
          Current: <strong>{cur.name}</strong>, {cur.listingsQuota} listings, {cur.featuredUsed || 0} of {cur.featuredQuota} featured slots used
          {cur.expiresAt ? `, ends ${fmtDate(cur.expiresAt)}` : ''}
          {cur.amountPaid ? `. Paid ${naira(cur.amountPaid)}${cur.reference ? ` (ref. ${cur.reference})` : ''}${cur.paidAt ? ` on ${fmtDate(cur.paidAt)}` : ''}` : ''}.
        </p>
      ) : (
        <p style={{ ...metaText, marginBottom: 10 }}>No package. Record one once the employer has paid for it offline.</p>
      )}
      {offered.length > 0 && (
        <FormField label="Start from a package on offer">
          {(id) => (
            <select id={id} value="" onChange={pick} style={inputStyle}>
              <option value="">Choose…</option>
              {offered.map((p) => <option key={p.name} value={p.name}>{p.name} ({naira(p.price) || 'free'})</option>)}
            </select>
          )}
        </FormField>
      )}
      <Grid>
        <FormField label="Package name">{(id) => <input id={id} value={form.name} onChange={set('name')} style={inputStyle} />}</FormField>
        <FormField label="Listings included">{(id) => <input id={id} type="number" min="0" value={form.listingsQuota} onChange={set('listingsQuota')} style={inputStyle} />}</FormField>
        <FormField label="Featured slots">{(id) => <input id={id} type="number" min="0" value={form.featuredQuota} onChange={set('featuredQuota')} style={inputStyle} />}</FormField>
        <FormField label="Months" hint={cur?.name && !form.renew ? 'Only used when a new term starts.' : undefined}>{(id) => <input id={id} type="number" min="1" value={form.months} onChange={set('months')} style={inputStyle} />}</FormField>
        <FormField label="Amount paid (₦)">{(id) => <input id={id} type="number" min="0" value={form.amountPaid} onChange={set('amountPaid')} style={inputStyle} />}</FormField>
        <FormField label="Payment reference">{(id) => <input id={id} value={form.reference} onChange={set('reference')} style={inputStyle} />}</FormField>
        {cur?.name && (
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#374151', margin: '4px 0 12px' }}>
            <input type="checkbox" checked={Boolean(form.renew)} onChange={(ev) => setForm((f) => ({ ...f, renew: ev.target.checked }))} />
            Start a new term from today (resets the featured slots used)
          </label>
        )}
      </Grid>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => save(false)} disabled={saving} style={primaryBtn}>{saving ? 'Saving…' : 'Save package'}</button>
        {cur && <button type="button" onClick={() => save(true)} disabled={saving} style={ghostBtn}>Remove package</button>}
      </div>
    </Section>
  );
}

/* ═════════════ Featured ═════════════ */

function FeaturedTab({ settings }) {
  const [requested, setRequested] = useState([]);
  const [running, setRunning] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([
        adminListJobs({ featuredRequested: 1 }),
        adminListJobs({ status: 'published' }),
      ]);
      setRequested(r.jobs || []);
      setRunning((p.jobs || []).filter((j) => j.featured?.active));
    } catch (err) {
      toast.error(errMsg(err, 'Could not load featured listings'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleNewsletter = async (job) => {
    // No `active`: the server changes only the newsletter flag.
    try {
      await setJobFeatured(job._id, { inNewsletter: !job.featured.inNewsletter });
      toast.success(job.featured.inNewsletter ? 'Taken out of the newsletter' : 'Added to the newsletter');
      load();
    } catch (err) {
      toast.error(errMsg(err));
    }
  };

  if (loading) return <Loading />;

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <section aria-labelledby="f-req">
        <h2 id="f-req" style={sectionTitle}>Waiting for payment ({requested.length})</h2>
        <p style={sectionHint}>
          The employer has asked to be featured and has been shown the payment instructions.
          Confirm only once the money has arrived. Standard fee: {naira(settings?.featuredFee) || 'free'} for {settings?.featuredDays || 30} days.
        </p>
        {requested.length === 0 ? <Empty title="No requests waiting" /> : (
          <div style={{ display: 'grid', gap: 10 }}>
            {requested.map((j) => (
              <article key={j._id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={cardTitle}>{j.title}</h3>
                    <p style={metaText}>{titleOf(j)}{j.featured?.requestedAt ? ` · requested ${fmtDate(j.featured.requestedAt)}` : ''}</p>
                  </div>
                  <ListingStatusPill status={j.status} />
                </div>
                {j.status !== 'published' && (
                  <p style={{ ...metaText, marginTop: 8 }}>Not live yet. The placement starts when the listing is approved.</p>
                )}
                <div style={actionRow}>
                  <button type="button" onClick={() => setModal({ kind: 'confirm', job: j })} style={primaryBtn}>Confirm payment</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="f-run">
        <h2 id="f-run" style={sectionTitle}>Featured now ({running.length})</h2>
        {running.length === 0 ? <Empty title="No featured listings" /> : (
          <TableWrap>
            <table style={table}>
              <thead>
                <tr>{['Listing', 'Until', 'Paid', 'Newsletter', ''].map((h, i) => <th key={i} scope="col" style={th}>{h || <span style={srOnly}>Actions</span>}</th>)}</tr>
              </thead>
              <tbody>
                {running.map((j, i) => (
                  <tr key={j._id} style={{ background: i % 2 ? '#fafbfc' : '#fff' }}>
                    <td style={{ ...td, minWidth: 180 }}><strong style={{ color: NAVY }}>{j.title}</strong><div style={metaText}>{titleOf(j)}</div></td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{fmtDate(j.featured.until)}</td>
                    <td style={td}>
                      {j.featured.viaPackage ? 'From package'
                        : j.featured.amount ? <>{naira(j.featured.amount)}{j.featured.reference ? <div style={metaText}>ref. {j.featured.reference}</div> : null}</>
                        : 'Free'}
                    </td>
                    <td style={td}>
                      <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13 }}>
                        <input type="checkbox" checked={Boolean(j.featured.inNewsletter)} onChange={() => toggleNewsletter(j)} />
                        In newsletter
                      </label>
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <button type="button" onClick={() => setModal({ kind: 'end', job: j })} style={smallBtn}>End placement</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </section>

      {modal?.kind === 'confirm' && (
        <ConfirmFeaturedModal job={modal.job} settings={settings} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />
      )}
      {modal?.kind === 'end' && (
        <ConfirmModal
          title="End this placement?"
          confirmLabel="End placement"
          onClose={() => setModal(null)}
          onConfirm={async () => {
            await setJobFeatured(modal.job._id, { active: false });
            toast.success('Placement ended');
            setModal(null);
            load();
          }}
        >
          <p style={bodyText}>
            <strong>{modal.job.title}</strong> stops being featured now, before {fmtDate(modal.job.featured.until)}.
            The listing stays live. Any payment recorded stays in the reports.
          </p>
        </ConfirmModal>
      )}
    </div>
  );
}

function ConfirmFeaturedModal({ job, settings, onClose, onSaved }) {
  const [amount, setAmount] = useState(String(settings?.featuredFee || ''));
  const [reference, setReference] = useState('');
  const [days, setDays] = useState(String(settings?.featuredDays || 30));
  const [inNewsletter, setInNewsletter] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (ev) => {
    ev.preventDefault();
    if (!(Number(days) >= 1)) { toast.error('Enter the number of days'); return; }
    setSaving(true);
    try {
      await setJobFeatured(job._id, { active: true, amount: Number(amount) || 0, reference, days: Number(days), inNewsletter });
      toast.success('Payment confirmed; the listing is featured');
      onSaved();
    } catch (err) {
      toast.error(errMsg(err, 'Could not confirm the payment'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Confirm featured payment" onClose={onClose}>
      <p style={{ ...bodyText, marginTop: 0 }}>For <strong>{job.title}</strong> ({titleOf(job)}).</p>
      <form onSubmit={submit}>
        <Grid>
          <FormField label="Amount received (₦)" hint="Leave at 0 for a free placement.">
            {(id) => <input id={id} type="number" min="0" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} style={inputStyle} />}
          </FormField>
          <FormField label="Days featured" required>
            {(id) => <input id={id} type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)} style={inputStyle} />}
          </FormField>
        </Grid>
        <FormField label="Payment reference" hint="Bank transfer reference or receipt number.">
          {(id) => <input id={id} value={reference} onChange={(e) => setReference(e.target.value)} style={inputStyle} />}
        </FormField>
        <Check checked={inNewsletter} onChange={(e) => setInNewsletter(e.target.checked)} label="Include in the NIQS newsletter">
          Marks it for whoever compiles the next newsletter.
        </Check>
        <ModalActions>
          <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
          <button type="submit" disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Confirm and feature'}</button>
        </ModalActions>
      </form>
    </Modal>
  );
}

/* ═════════════ Reports ═════════════ */

const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const monthLabel = (m) => {
  const [y, mo] = m.split('-').map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
};

function ReportsTab() {
  const today = new Date();
  const [from, setFrom] = useState(ym(new Date(today.getFullYear(), today.getMonth() - 11, 1)));
  const [to, setTo] = useState(ym(today));
  const [state, setState] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (from && to && from > to) return;
    let live = true;
    setLoading(true);
    jobReports({ from, to, state })
      .then((r) => { if (live) setData(r); })
      .catch((err) => toast.error(errMsg(err, 'Could not load the report')))
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [from, to, state]);

  const csv = async () => {
    try {
      await jobReportsCsv({ from, to, state });
    } catch (err) {
      toast.error(errMsg(err, 'Could not download the CSV'));
    }
  };

  const t = data?.totals || {};

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
        <FormField label="From" compact>
          {(id) => <input id={id} type="month" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={{ ...inputStyle, width: 170 }} />}
        </FormField>
        <FormField label="To" compact>
          {(id) => <input id={id} type="month" value={to} min={from} onChange={(e) => setTo(e.target.value)} style={{ ...inputStyle, width: 170 }} />}
        </FormField>
        <FormField label="State" compact>
          {(id) => (
            <select id={id} value={state} onChange={(e) => setState(e.target.value)} style={{ ...inputStyle, width: 190 }}>
              <option value="">All states</option>
              {LISTING_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </FormField>
        <button type="button" onClick={csv} style={{ ...ghostBtn, marginBottom: 14 }}>
          <Icon name="download" size={16} /> Download CSV
        </button>
      </div>
      {from > to && <ErrorText>The start month is after the end month.</ErrorText>}

      {loading && !data ? <Loading /> : data && (
        <div style={{ opacity: loading ? 0.6 : 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
            <Tile label="Listings posted" value={t.posted} />
            <Tile label="Published" value={t.published} />
            <Tile label="Applications" value={t.applications} />
            <Tile label="Roles filled" value={t.filled} />
            <Tile label="Filled through NIQS" value={t.filledThroughNiqs} hint="Employer said the hire came through the board" />
            <Tile label="Income recorded" value={naira(t.income || 0)} hint="Featured fees, listing fees and packages" />
          </div>

          <MonthChart months={data.months || []} />

          <h2 style={{ ...sectionTitle, marginTop: 24 }}>By month</h2>
          <TableWrap>
            <table style={table}>
              <thead>
                <tr>{['Month', 'Posted', 'Published', 'Applications', 'Filled', 'Through NIQS', 'Income'].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {(data.months || []).map((m, i) => (
                  <tr key={m.month} style={{ background: i % 2 ? '#fafbfc' : '#fff' }}>
                    <th scope="row" style={{ ...td, fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap' }}>{monthLabel(m.month)}</th>
                    <td style={td}>{m.posted}</td>
                    <td style={td}>{m.published}</td>
                    <td style={td}>{m.applications}</td>
                    <td style={td}>{m.filled}</td>
                    <td style={td}>{m.filledThroughNiqs}</td>
                    <td style={{ ...td, whiteSpace: 'nowrap' }}>{naira(m.income || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>

          <h2 style={{ ...sectionTitle, marginTop: 24 }}>By state</h2>
          {(data.states || []).length === 0 ? <Empty title="No activity in this period" /> : (
            <TableWrap>
              <table style={table}>
                <thead>
                  <tr>{['State', 'Posted', 'Published', 'Applications', 'Filled', 'Through NIQS', 'Income'].map((h) => <th key={h} scope="col" style={th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {data.states.map((s, i) => (
                    <tr key={s.state} style={{ background: i % 2 ? '#fafbfc' : '#fff' }}>
                      <th scope="row" style={{ ...td, fontWeight: 600, textAlign: 'left' }}>{s.state}</th>
                      <td style={td}>{s.posted}</td>
                      <td style={td}>{s.published}</td>
                      <td style={td}>{s.applications}</td>
                      <td style={td}>{s.filled}</td>
                      <td style={td}>{s.filledThroughNiqs}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>{naira(s.income || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </div>
      )}
    </div>
  );
}

function Tile({ label, value, hint }) {
  return (
    <div style={{ ...card, padding: '14px 16px' }} title={hint}>
      <div style={{ fontSize: 22, fontWeight: 700, color: NAVY, lineHeight: 1.1 }}>{value ?? 0}</div>
      <div style={{ fontSize: 12.5, color: '#6b7280', marginTop: 2 }}>{label}</div>
    </div>
  );
}

/** Posted vs applications per month: paired CSS bars, the table below holds the numbers. */
function MonthChart({ months }) {
  const max = Math.max(1, ...months.map((m) => Math.max(m.posted, m.applications)));
  const H = 150;
  const summary = months.map((m) => `${monthLabel(m.month)}: ${m.posted} posted, ${m.applications} applications`).join('; ');

  return (
    <figure style={{ ...card, margin: 0 }}>
      <figcaption style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <strong style={{ color: NAVY, fontSize: 14 }}>Listings posted and applications, by month</strong>
        <span style={{ display: 'flex', gap: 14, fontSize: 12, color: '#374151' }}>
          <span><span style={{ ...swatch, background: NAVY }} /> Posted</span>
          <span><span style={{ ...swatch, background: GOLD }} /> Applications</span>
        </span>
      </figcaption>
      <div style={{ overflowX: 'auto' }}>
        <div role="img" aria-label={summary || 'No data'} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', minWidth: months.length * 46, height: H + 40, borderBottom: '1px solid #e5e7eb', paddingTop: 16 }}>
          {months.map((m) => (
            <div key={m.month} style={{ flex: '1 0 36px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: H }}>
                <Bar value={m.posted} max={max} h={H} color={NAVY} />
                <Bar value={m.applications} max={max} h={H} color={GOLD} />
              </div>
              <span style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>{monthLabel(m.month)}</span>
            </div>
          ))}
        </div>
      </div>
    </figure>
  );
}

function Bar({ value, max, h, color }) {
  const height = value ? Math.max(3, Math.round((value / max) * h)) : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: h }} aria-hidden="true">
      {value > 0 && <span style={{ fontSize: 10, color: '#374151', marginBottom: 2 }}>{value}</span>}
      <div style={{ width: 14, height, background: color, borderRadius: '3px 3px 0 0' }} />
    </div>
  );
}

/* ═════════════ Settings ═════════════ */

function SettingsTab({ settings, onSaved, canEdit }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setForm({
      moderatorEmails: (settings.moderatorEmails || []).join(', '),
      approvalTargetHours: settings.approvalTargetHours ?? 48,
      standardListingFee: settings.standardListingFee ?? 0,
      featuredFee: settings.featuredFee ?? 0,
      featuredDays: settings.featuredDays ?? 30,
      paymentInstructions: settings.paymentInstructions || '',
      nonMembersCanApply: settings.nonMembersCanApply !== false,
      requireRegisterCheck: Boolean(settings.requireRegisterCheck),
      retentionDays: settings.retentionDays ?? 180,
      talentSearchEnabled: settings.talentSearchEnabled !== false,
      packages: (settings.packages || []).map((p) => ({ ...p })),
    });
  }, [settings]);

  if (!form) return <Loading />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const setPkg = (i, k) => (e) => setForm((f) => ({ ...f, packages: f.packages.map((p, j) => (j === i ? { ...p, [k]: e.target.value } : p)) }));
  const addPkg = () => setForm((f) => ({ ...f, packages: [...f.packages, { name: '', price: 0, listingsQuota: 5, featuredQuota: 1, months: 12, description: '' }] }));
  const removePkg = (i) => setForm((f) => ({ ...f, packages: f.packages.filter((_, j) => j !== i) }));

  const save = async (e) => {
    e.preventDefault();
    const retention = Number(form.retentionDays);
    if (!(retention >= 30 && retention <= 730)) { toast.error('Keep applicant data for between 30 and 730 days'); return; }
    if (form.packages.some((p) => !String(p.name || '').trim())) { toast.error('Every package needs a name'); return; }
    setSaving(true);
    try {
      const r = await updateBoardSettings({
        ...form,
        approvalTargetHours: Number(form.approvalTargetHours) || 0,
        standardListingFee: Number(form.standardListingFee) || 0,
        featuredFee: Number(form.featuredFee) || 0,
        featuredDays: Number(form.featuredDays) || 1,
        retentionDays: retention,
        packages: form.packages.map((p) => ({
          name: String(p.name).trim(),
          price: Number(p.price) || 0,
          listingsQuota: Number(p.listingsQuota) || 0,
          featuredQuota: Number(p.featuredQuota) || 0,
          months: Number(p.months) || 12,
          description: p.description || '',
        })),
      });
      onSaved(r.settings || r);
      toast.success('Settings saved');
    } catch (err) {
      toast.error(errMsg(err, 'Could not save the settings'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} style={{ maxWidth: 820 }}>
      {!canEdit && (
        <Warning>Only the Main Administrator can change these settings. You can read them here.</Warning>
      )}
      <fieldset disabled={!canEdit} style={{ border: 'none', padding: 0, margin: 0, minWidth: 0 }}>
        <SettingsGroup title="Who approves, and how fast">
          <FormField label="Moderator emails" hint="Comma-separated. These people are emailed when an employer registers or a listing is submitted.">
            {(id) => <input id={id} value={form.moderatorEmails} onChange={set('moderatorEmails')} style={inputStyle} placeholder="secretariat@niqs.org.ng, jobs@niqs.org.ng" />}
          </FormField>
          <FormField label="Approval target (hours)" hint="The time NIQS commits to for a decision. Listings waiting longer are marked overdue in the queue, and employers are told this figure.">
            {(id) => <input id={id} type="number" min="1" value={form.approvalTargetHours} onChange={set('approvalTargetHours')} style={{ ...inputStyle, maxWidth: 160 }} />}
          </FormField>
        </SettingsGroup>

        <SettingsGroup title="Pricing">
          <p style={{ ...sectionHint, marginTop: 0 }}>
            Set a fee to 0 to make it free. There is no card payment on the site: employers see the payment instructions below,
            pay offline, and the Secretariat records the amount here.
          </p>
          <Grid>
            <FormField label="Standard listing fee (₦)" hint="Charged per listing. 0 = posting is free.">
              {(id) => <input id={id} type="number" min="0" value={form.standardListingFee} onChange={set('standardListingFee')} style={inputStyle} />}
            </FormField>
            <FormField label="Featured fee (₦)" hint="0 = featuring is confirmed at once, free.">
              {(id) => <input id={id} type="number" min="0" value={form.featuredFee} onChange={set('featuredFee')} style={inputStyle} />}
            </FormField>
            <FormField label="Featured for (days)" hint="How long a paid placement runs.">
              {(id) => <input id={id} type="number" min="1" value={form.featuredDays} onChange={set('featuredDays')} style={inputStyle} />}
            </FormField>
          </Grid>
          <FormField label="Payment instructions" hint="Shown to employers when a fee is due: bank, account name and number, and what reference to use.">
            {(id) => <textarea id={id} value={form.paymentInstructions} onChange={set('paymentInstructions')} rows={4} style={textareaStyle} />}
          </FormField>
        </SettingsGroup>

        <SettingsGroup title="Packages">
          <p style={{ ...sectionHint, marginTop: 0 }}>
            Bundles employers can buy, listed on the employers page. A package is given to an employer from the Employers tab once they have paid.
          </p>
          {form.packages.length === 0 && <p style={metaText}>No packages offered.</p>}
          <div style={{ display: 'grid', gap: 10 }}>
            {form.packages.map((p, i) => (
              <div key={i} style={{ ...card, padding: '12px 14px' }}>
                <Grid>
                  <FormField label="Name" compact>{(id) => <input id={id} value={p.name} onChange={setPkg(i, 'name')} style={inputStyle} />}</FormField>
                  <FormField label="Price (₦)" compact>{(id) => <input id={id} type="number" min="0" value={p.price} onChange={setPkg(i, 'price')} style={inputStyle} />}</FormField>
                  <FormField label="Listings" compact>{(id) => <input id={id} type="number" min="0" value={p.listingsQuota} onChange={setPkg(i, 'listingsQuota')} style={inputStyle} />}</FormField>
                  <FormField label="Featured slots" compact>{(id) => <input id={id} type="number" min="0" value={p.featuredQuota} onChange={setPkg(i, 'featuredQuota')} style={inputStyle} />}</FormField>
                  <FormField label="Months" compact>{(id) => <input id={id} type="number" min="1" value={p.months} onChange={setPkg(i, 'months')} style={inputStyle} />}</FormField>
                </Grid>
                <FormField label="Description" compact>{(id) => <input id={id} value={p.description || ''} onChange={setPkg(i, 'description')} style={inputStyle} />}</FormField>
                <button type="button" onClick={() => removePkg(i)} style={{ ...dangerGhostBtn, marginTop: 8 }} aria-label={`Remove package ${p.name || i + 1}`}>Remove package</button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addPkg} style={{ ...ghostBtn, marginTop: 10 }}>+ Add a package</button>
        </SettingsGroup>

        <SettingsGroup title="Who can apply">
          <Check checked={form.nonMembersCanApply} onChange={set('nonMembersCanApply')} label="Non-members can apply">
            Off = every listing is members-only, whatever the employer chose. On = each listing decides with its own "members only" box.
          </Check>
          <Check checked={form.requireRegisterCheck} onChange={set('requireRegisterCheck')} label="Require a register check to apply">
            Blocks any application the NIQS register cannot confirm. The register connection is not live yet, so turning this on now would block every applicant. Leave it off until the membership portal is connected.
          </Check>
          {form.requireRegisterCheck && (
            <Warning>With the register not yet connected, nobody will be able to apply while this is on.</Warning>
          )}
        </SettingsGroup>

        <SettingsGroup title="Applicant data and talent search">
          <FormField label="Keep applications and CVs for (days after a listing closes)" hint="Between 30 and 730. After this, applications and their CVs are deleted. A CV still on a member's profile is kept.">
            {(id) => <input id={id} type="number" min="30" max="730" value={form.retentionDays} onChange={set('retentionDays')} style={{ ...inputStyle, maxWidth: 160 }} />}
          </FormField>
          <Check checked={form.talentSearchEnabled} onChange={set('talentSearchEnabled')} label="Talent search">
            Approved employers can search career profiles that members have chosen to make visible. No contact details are shown; employers send an invitation and the member decides.
          </Check>
        </SettingsGroup>

        {canEdit && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="submit" disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving…' : 'Save settings'}</button>
          </div>
        )}
      </fieldset>
    </form>
  );
}

function SettingsGroup({ title, children }) {
  return (
    <section style={{ ...card, marginBottom: 16 }}>
      <h2 style={{ ...sectionTitle, marginBottom: 12 }}>{title}</h2>
      {children}
    </section>
  );
}

/* ═════════════ Shared pieces ═════════════ */

function useDebounced(value, ms = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

let modalSeq = 0;

/** Dialog that closes on Escape and on a backdrop click. */
function Modal({ title, children, onClose, wide }) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [titleId] = useState(() => `jb-modal-${++modalSeq}`);

  // Once per opening: callers pass a fresh onClose each render, and re-running
  // this would pull focus out of whatever field is being typed in.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    const prev = document.activeElement;
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      if (prev && prev.focus) prev.focus();
    };
  }, []);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 12 }}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 12, padding: '20px 22px', width: '100%', maxWidth: wide ? 760 : 560, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', outline: 'none', boxSizing: 'border-box' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
          <h3 id={titleId} style={{ margin: 0, color: NAVY, fontSize: 18, lineHeight: 1.3 }}>{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 2 }}>
            <Icon name="close" size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Ask for a note. `required` (default) blocks an empty one. */
function ReasonModal({ title, hint, confirmLabel, onSubmit, onClose, required = true, danger }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (required && !note.trim()) { setProblem('A reason is needed.'); return; }
    setSaving(true);
    try {
      await onSubmit(note.trim());
    } catch (err) {
      setProblem(errMsg(err));
      setSaving(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit}>
        {hint && <p style={{ ...bodyText, marginTop: 0 }}>{hint}</p>}
        <FormField label={required ? 'Reason' : 'Note (optional)'} required={required}>
          {(id) => <textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} rows={4} style={textareaStyle} autoFocus />}
        </FormField>
        {problem && <ErrorText>{problem}</ErrorText>}
        <ModalActions>
          <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
          <button type="submit" disabled={saving} style={{ ...(danger ? dangerBtn : primaryBtn), opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : confirmLabel}
          </button>
        </ModalActions>
      </form>
    </Modal>
  );
}

function ConfirmModal({ title, children, confirmLabel, onConfirm, onClose }) {
  const [saving, setSaving] = useState(false);
  const go = async () => {
    setSaving(true);
    try {
      await onConfirm();
    } catch (err) {
      toast.error(errMsg(err));
      setSaving(false);
    }
  };
  return (
    <Modal title={title} onClose={onClose}>
      {children}
      <ModalActions>
        <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
        <button type="button" onClick={go} disabled={saving} style={{ ...dangerBtn, opacity: saving ? 0.6 : 1 }}>{saving ? 'Working…' : confirmLabel}</button>
      </ModalActions>
    </Modal>
  );
}

let fieldSeq = 0;

/** Label + control. `children` is a function given the control's id. */
function FormField({ label, required, hint, children, compact }) {
  const [id] = useState(() => `jb-f-${++fieldSeq}`);
  return (
    <div style={{ marginBottom: compact ? 8 : 14, minWidth: 0 }}>
      <label htmlFor={id} style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>
        {label} {required && <span style={{ color: '#dc2626' }} aria-hidden="true">*</span>}
      </label>
      {typeof children === 'function' ? children(id) : children}
      {hint && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6b7280', lineHeight: 1.45 }}>{hint}</p>}
    </div>
  );
}

function Check({ checked, onChange, label, children }) {
  return (
    <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14, cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ marginTop: 3, flexShrink: 0 }} />
      <span>
        <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: '#374151' }}>{label}</span>
        {children && <span style={{ display: 'block', fontSize: 12, color: '#6b7280', lineHeight: 1.45 }}>{children}</span>}
      </span>
    </label>
  );
}

function Grid({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', columnGap: 14 }}>{children}</div>;
}

function Detail({ label, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(90px, 120px) 1fr', gap: 10, fontSize: 13, color: '#374151' }}>
      <dt style={{ color: '#8892B0', fontWeight: 600, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.04em', paddingTop: 1 }}>{label}</dt>
      <dd style={{ margin: 0, minWidth: 0, overflowWrap: 'anywhere' }}>{children}</dd>
    </div>
  );
}

function SearchBox({ value, onChange, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 6, padding: '8px 12px', border: '1px solid #d1d5db', flex: '1 1 240px', maxWidth: 420 }}>
      <Icon name="search" size={18} color="#9ca3af" />
      <input type="search" aria-label={label} placeholder="Search…" value={value} onChange={(e) => onChange(e.target.value)}
        style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 14, width: '100%', color: '#111827' }} />
    </div>
  );
}

function Chips({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
      {options.map((o) => (
        <button key={o.value || 'all'} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}
          style={{
            padding: '5px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${value === o.value ? NAVY : '#DDE3F0'}`,
            background: value === o.value ? NAVY : '#fff', color: value === o.value ? '#fff' : '#5A6485',
          }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Tables scroll sideways inside their own box, so the page never does. */
function TableWrap({ children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      {children}
    </div>
  );
}

function Loading() {
  return <p role="status" style={{ color: '#5A6485', fontSize: 14 }}>Loading…</p>;
}

function Empty({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '32px 20px', textAlign: 'center', border: '1.5px solid #DDE3F0' }}>
      <p style={{ color: NAVY, fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</p>
      {children && <p style={{ color: '#5A6485', fontSize: 13.5, margin: '6px 0 0' }}>{children}</p>}
    </div>
  );
}

function Warning({ children }) {
  return (
    <div role="note" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 10, marginBottom: 10, padding: '9px 12px', borderRadius: 8, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412', fontSize: 13, lineHeight: 1.45 }}>
      <Icon name="warning" size={16} />
      <span>{children}</span>
    </div>
  );
}

function ErrorText({ children }) {
  return <p role="alert" style={{ color: '#b91c1c', fontSize: 13, margin: '4px 0 10px' }}>{children}</p>;
}

function ModalActions({ children }) {
  return <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 18 }}>{children}</div>;
}

/* ── Styles ── */

const tabBtn = (active) => ({
  padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center',
  background: active ? NAVY : '#fff', color: active ? '#fff' : '#5A6485',
  boxShadow: active ? 'none' : 'inset 0 0 0 1.5px #DDE3F0',
});
const countBadge = { marginLeft: 8, background: GOLD, color: NAVY, borderRadius: 999, padding: '1px 7px', fontSize: 11, fontWeight: 800 };
const card = { background: '#fff', borderRadius: 12, border: '1.5px solid #DDE3F0', borderColor: '#DDE3F0', padding: '16px 18px' };
const cardTitle = { margin: '0 0 2px', fontSize: 16, color: NAVY, lineHeight: 1.3 };
const sectionTitle = { margin: '0 0 4px', fontSize: 15, color: NAVY };
const sectionHint = { margin: '0 0 12px', fontSize: 13, color: '#5A6485', lineHeight: 1.5 };
const metaText = { margin: 0, fontSize: 12.5, color: '#6b7280', lineHeight: 1.5 };
const bodyText = { fontSize: 14, color: '#374151', lineHeight: 1.55 };
const detailGrid = { display: 'grid', gap: 8, margin: '12px 0 0' };
const actionRow = { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 };
const link = { color: '#1d4ed8' };
const swatch = { display: 'inline-block', width: 10, height: 10, borderRadius: 2, marginRight: 5, verticalAlign: 'middle' };
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, color: '#111827', outline: 'none', boxSizing: 'border-box', background: '#fff' };
const textareaStyle = { ...inputStyle, resize: 'vertical', fontFamily: 'inherit' };
const btnStyle = { padding: '9px 18px', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const primaryBtn = { ...btnStyle, background: NAVY, color: '#fff' };
const dangerBtn = { ...btnStyle, background: '#dc2626', color: '#fff' };
const cancelBtn = { ...btnStyle, background: '#e5e7eb', color: '#374151' };
const ghostBtn = { ...btnStyle, background: '#fff', color: '#374151', border: '1.5px solid #DDE3F0', display: 'inline-flex', alignItems: 'center', gap: 6 };
const dangerGhostBtn = { ...ghostBtn, color: '#b91c1c', borderColor: '#fecaca' };
const smallBtn = { padding: '5px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', color: NAVY, fontWeight: 600, fontSize: 12.5, cursor: 'pointer', whiteSpace: 'nowrap' };
const linkBtn = { background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0 };
const actionItem = { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, textAlign: 'left', padding: '10px 12px', background: '#fff', border: '1.5px solid #DDE3F0', borderColor: '#DDE3F0', borderRadius: 8, cursor: 'pointer' };
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 14 };
const th = { padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' };
const srOnly = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 };
const td = { padding: '10px 14px', color: '#374151', borderBottom: '1px solid #f3f4f6', verticalAlign: 'top' };
