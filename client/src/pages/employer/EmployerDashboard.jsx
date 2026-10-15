import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Icon from '../../components/common/Icon';
import { ListingStatusPill } from '../../components/jobs/JobBits';
import { employerSummary, myListings } from '../../api/jobsApi';
import { TONES, fmtDate } from '../../data/jobBoard';
import { errMsg, AccountBanner } from './EmployerLayout';

const EmployerDashboard = () => {
  const { employer, setEmployer } = useAuth();
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    Promise.all([employerSummary(), myListings()])
      .then(([s, l]) => {
        if (!live) return;
        setSummary(s);
        setRecent((l.jobs || []).slice(0, 5));
        // The Secretariat may have approved (or suspended) the account since
        // this session started; keep the sidebar pill in step.
        if (employer && (s.status !== employer.status || s.statusNote !== employer.statusNote)) {
          setEmployer({ ...employer, status: s.status, statusNote: s.statusNote });
        }
      })
      .catch((err) => live && setError(errMsg(err, 'Could not load your dashboard.')));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const n = summary?.listings || {};
  const pkg = summary?.package;
  const hours = summary?.pricing?.approvalTargetHours;

  const stats = [
    { label: 'Live', value: n.published || 0, to: '/employer/listings' },
    { label: 'Awaiting approval', value: n.pending || 0, to: '/employer/listings' },
    { label: 'Drafts', value: n.draft || 0, to: '/employer/listings' },
    { label: 'Applications', value: summary?.applications || 0, to: '/employer/applicants' },
    { label: 'New, unread', value: summary?.unread || 0, to: '/employer/applicants?status=submitted' },
  ];

  return (
    <div className="emp-page">
      <div className="emp-head">
        <div>
          <h1 className="emp-title">Welcome, <em>{employer?.contactName?.split(' ')[0] || employer?.companyName}</em></h1>
          <p className="emp-lead">Your listings and applicants on the NIQS job board.</p>
        </div>
        <Link to="/employer/listings/new" className="emp-btn primary"><Icon name="add" size="sm" /> Post a job</Link>
      </div>

      {error && <div className="emp-banner" style={{ background: TONES.red.bg, borderColor: TONES.red.border, color: TONES.red.color }}>{error}</div>}

      <AccountBanner status={summary?.status || employer?.status} statusNote={summary?.statusNote ?? employer?.statusNote} hours={hours} />

      <div className="emp-stats" aria-busy={!summary && !error}>
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="emp-stat">
            <div className="emp-stat-n">{summary ? s.value : '–'}</div>
            <div className="emp-stat-l">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="emp-dash-grid">
        <div className="emp-card">
          <div className="emp-card-title" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
            <span>Recent listings</span>
            <Link to="/employer/listings" className="emp-link" style={{ fontSize: '.78rem' }}>All listings</Link>
          </div>
          {summary && recent.length === 0 && (
            <div className="emp-empty">
              <div className="icon"><Icon name="jobs" size="lg" /></div>
              You have not posted a listing yet.
              <div style={{ marginTop: '.8rem' }}>
                <Link to="/employer/listings/new" className="emp-btn primary">Post your first job</Link>
              </div>
            </div>
          )}
          {recent.map((j) => (
            <div key={j._id} className="emp-row">
              <div style={{ minWidth: 0, flex: 1 }}>
                <Link to={`/employer/listings/${j._id}/edit`} className="emp-link" style={{ overflowWrap: 'anywhere' }}>{j.title}</Link>
                <div className="emp-muted">
                  {[j.location, j.state].filter(Boolean).join(', ')} · Created {fmtDate(j.createdAt)}
                </div>
                {j.status === 'rejected' && j.moderationNote && (
                  <div className="emp-error" style={{ marginTop: '.25rem' }}>Secretariat: {j.moderationNote}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <ListingStatusPill status={j.status} />
                {j.applicationCount > 0 && (
                  <Link to={`/employer/applicants?job=${j._id}`} className="emp-muted" style={{ fontWeight: 600 }}>
                    {j.applicationCount} application{j.applicationCount === 1 ? '' : 's'}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>

        <div>
          <div className="emp-card">
            <div className="emp-card-title">Package</div>
            {pkg ? (
              <>
                <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{pkg.name}</div>
                <div className="emp-muted" style={{ marginTop: '.3rem' }}>
                  {pkg.featuredRemaining} featured placement{pkg.featuredRemaining === 1 ? '' : 's'} left
                  {pkg.expiresAt ? ` · Ends ${fmtDate(pkg.expiresAt)}` : ''}
                </div>
              </>
            ) : (
              <p className="emp-muted">
                No recruitment package on this account. Packages bundle listings and featured
                placements for organisations that hire often; ask the Secretariat about one.
                See <Link to="/employers" className="emp-link">prices</Link>.
              </p>
            )}
          </div>

          <div className="emp-card">
            <div className="emp-card-title">Quick links</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              <Link to="/employer/applicants" className="emp-link"><Icon name="inbox" size="sm" /> Applicant inbox</Link>
              <Link to="/employer/talent" className="emp-link"><Icon name="search" size="sm" /> Search for talent</Link>
              <Link to="/employer/profile" className="emp-link"><Icon name="office" size="sm" /> Company profile</Link>
              <Link to="/jobs" className="emp-link"><Icon name="web" size="sm" /> View the public job board</Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .emp-dash-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr); gap: 1rem; align-items: start; }
        .emp-dash-grid > div > .emp-card + .emp-card { margin-top: 1rem; }
        @media (max-width: 900px) { .emp-dash-grid { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
};

export default EmployerDashboard;
