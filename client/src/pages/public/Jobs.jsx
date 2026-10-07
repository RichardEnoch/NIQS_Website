import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import PageHero from '../../components/common/PageHero';
import { useAuth } from '../../context/AuthContext';
import { useMemberCopy } from '../../hooks/useMembershipStats';
import Icon from '../../components/common/Icon';

const TYPE_COLORS = {
  'Full-time':       { bg: '#fff7ed', color: '#D9B650', border: '#f5d49b' },
  'full-time':       { bg: '#fff7ed', color: '#D9B650', border: '#f5d49b' },
  'Contract':        { bg: '#eff6ff', color: '#2563EB', border: '#bfdbfe' },
  'contract':        { bg: '#eff6ff', color: '#2563EB', border: '#bfdbfe' },
  'Graduate Trainee':{ bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  'Part-time':       { bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff' },
  'part-time':       { bg: '#faf5ff', color: '#7c3aed', border: '#e9d5ff' },
  'Remote':          { bg: '#f0fdfa', color: '#0891b2', border: '#a5f3fc' },
  'remote':          { bg: '#f0fdfa', color: '#0891b2', border: '#a5f3fc' },
};

function TypeBadge({ type }) {
  const c = TYPE_COLORS[type] || { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb' };
  return (
    <span style={{
      fontSize: '.62rem', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '.06em', padding: '3px 10px', borderRadius: 20,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      whiteSpace: 'nowrap',
    }}>
      {type}
    </span>
  );
}

function MapEmbed({ location }) {
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(location)}&output=embed&z=13`;
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e7eb', height: 220 }}>
      <iframe
        title="Job location map"
        src={src}
        width="100%"
        height="220"
        style={{ border: 0, display: 'block' }}
        allowFullScreen=""
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

function JobDetail({ job, onClose, isLoggedIn }) {
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const daysLeft = job.deadline
    ? Math.ceil((new Date(job.deadline) - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
      backdropFilter: 'blur(2px)',
    }}>
      <div
        ref={panelRef}
        style={{
          width: '100%', maxWidth: 560,
          height: '100vh', overflowY: 'auto',
          background: '#fff',
          boxShadow: '-8px 0 40px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 0.28s ease',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid #f3f4f6',
          background: '#fff',
          position: 'sticky', top: 0, zIndex: 10,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <img
            src={job.logo || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=80&h=80&fit=crop'}
            alt={job.company}
            style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: '1px solid #e5e7eb', flexShrink: 0 }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#000066', lineHeight: 1.3 }}>{job.title}</h2>
            <p style={{ margin: '3px 0 6px', fontSize: '.82rem', color: '#6b7280' }}>{job.company}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <TypeBadge type={job.type} />
              {daysLeft !== null && (
                <span style={{
                  fontSize: '.62rem', fontWeight: 600,
                  color: daysLeft <= 7 ? '#dc2626' : '#6b7280',
                  background: daysLeft <= 7 ? '#fef2f2' : '#f9fafb',
                  border: `1px solid ${daysLeft <= 7 ? '#fecaca' : '#e5e7eb'}`,
                  padding: '3px 8px', borderRadius: 20,
                }}>
                  {daysLeft <= 0 ? 'Closed' : `${daysLeft}d left`}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: '50%', border: '1px solid #e5e7eb',
              background: '#f9fafb', cursor: 'pointer', fontSize: 18, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#6b7280', flexShrink: 0,
            }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', flex: 1 }}>

          {/* Meta pills */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 10, marginBottom: 20,
          }}>
            {[
              { icon: 'location', label: 'Location', value: job.location },
              { icon: 'money', label: 'Salary', value: job.salary || 'Not specified' },
              { icon: 'calendar', label: 'Deadline', value: job.deadline ? new Date(job.deadline).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Open' },
              { icon: '⏱️', label: 'Type', value: job.type },
            ].map(m => (
              <div key={m.label} style={{
                background: '#f9fafb', border: '1px solid #f3f4f6',
                borderRadius: 8, padding: '10px 12px',
              }}>
                <div style={{ fontSize: '.67rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}><Icon name={m.icon} size="sm" /> {m.label}</div>
                <div style={{ fontSize: '.8rem', fontWeight: 600, color: '#111827' }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          <section style={{ marginBottom: 22 }}>
            <h3 style={{ fontSize: '.85rem', fontWeight: 700, color: '#000066', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
              About the Role
            </h3>
            <div style={{ fontSize: '.84rem', color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
              {job.description || 'Full job description will be provided by the employer. Please apply to receive more details.'}
            </div>
          </section>

          {/* Requirements */}
          {job.requirements && (
            <section style={{ marginBottom: 22 }}>
              <h3 style={{ fontSize: '.85rem', fontWeight: 700, color: '#000066', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                Requirements
              </h3>
              <div style={{ fontSize: '.84rem', color: '#374151', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>
                {job.requirements}
              </div>
            </section>
          )}

          {/* Google Map */}
          {job.location && (
            <section style={{ marginBottom: 22 }}>
              <h3 style={{ fontSize: '.85rem', fontWeight: 700, color: '#000066', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                <Icon name="location" size="sm" /> Location
              </h3>
              <MapEmbed location={job.location} />
              <p style={{ fontSize: '.75rem', color: '#9ca3af', marginTop: 6 }}>{job.location}</p>
            </section>
          )}

          {/* Apply section */}
          <section style={{
            background: isLoggedIn ? '#f0f9ff' : '#fff7ed',
            border: `1px solid ${isLoggedIn ? '#bae6fd' : '#fed7aa'}`,
            borderRadius: 10, padding: '18px 20px',
            marginBottom: 8,
          }}>
            {isLoggedIn ? (
              <>
                <h3 style={{ margin: '0 0 6px', fontSize: '.9rem', fontWeight: 700, color: '#000066' }}>
                  Ready to Apply?
                </h3>
                <p style={{ margin: '0 0 14px', fontSize: '.8rem', color: '#374151', lineHeight: 1.6 }}>
                  Submit your CV directly to this employer. Make sure your profile is up to date before applying.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {job.applicationLink ? (
                    <a
                      href={job.applicationLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '10px 22px', borderRadius: 8, fontWeight: 700,
                        fontSize: '.85rem', textDecoration: 'none',
                        background: '#000066', color: '#fff',
                        border: 'none', cursor: 'pointer',
                      }}
                    >
                      <Icon name="upload" size="sm" /> Apply via Company Site
                    </a>
                  ) : (
                    <Link
                      to="/portal"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '10px 22px', borderRadius: 8, fontWeight: 700,
                        fontSize: '.85rem', textDecoration: 'none',
                        background: '#000066', color: '#fff',
                      }}
                    >
                      <Icon name="upload" size="sm" /> Submit CV via Portal
                    </Link>
                  )}
                  <button style={{
                    padding: '10px 18px', borderRadius: 8, fontWeight: 600,
                    fontSize: '.85rem', background: '#fff', border: '1px solid #e5e7eb',
                    color: '#374151', cursor: 'pointer',
                  }}
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href);
                      alert('Link copied!');
                    }}
                  >
                    <Icon name="link" size="sm" /> Copy Link
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 style={{ margin: '0 0 6px', fontSize: '.9rem', fontWeight: 700, color: '#D9B650' }}>
                  <Icon name="lock" size="sm" /> Members Only
                </h3>
                <p style={{ margin: '0 0 14px', fontSize: '.8rem', color: '#374151', lineHeight: 1.6 }}>
                  Sign in to your NIQS member account to submit your CV and apply for this position.
                </p>
                <Link
                  to="/login"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '10px 22px', borderRadius: 8, fontWeight: 700,
                    fontSize: '.85rem', textDecoration: 'none',
                    background: '#D9B650', color: '#fff',
                  }}
                >
                  Sign In to Apply
                </Link>
              </>
            )}
          </section>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(60px); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
        @media (max-width: 600px) {
          .job-detail-panel { max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}

export default function Jobs() {
  const memberCopy = useMemberCopy();
  const [jobs, setJobs]       = useState([]);
  const [status, setStatus]   = useState('loading');
  const [selected, setSelected] = useState(null);
  const [search, setSearch]   = useState('');
  const [typeFilter, setType] = useState('All');
  const { admin, user }       = useAuth();
  const isLoggedIn            = !!(admin || user);

  useEffect(() => {
    API.get('/jobs')
      .then(res => {
        const data = res.data?.data || res.data;
        setJobs(Array.isArray(data) ? data : []);
        setStatus('ready');
      })
      .catch(() => {
        setJobs([]);
        setStatus('error');
      });
  }, []);

  const types = ['All', ...Array.from(new Set(jobs.map(j => j.type).filter(Boolean)))];

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase();
    const matchSearch = !q || j.title?.toLowerCase().includes(q) || j.company?.toLowerCase().includes(q) || j.location?.toLowerCase().includes(q);
    const matchType = typeFilter === 'All' || j.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <>
      <PageHero
        label="Careers"
        title="Career Opportunities"
        titleHighlight="Opportunities"
        backgroundImage="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1400&q=80&fit=crop"
      />

      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '4rem', paddingBottom: '5rem' }}>

          {/* Heading row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div className="ey">Job Board</div>
              <h2 className="sh" style={{ margin: 0 }}>QS Career <em>Listings</em></h2>
            </div>
            <p style={{ fontSize: '.8rem', color: 'var(--color-txt-3)', maxWidth: 360, textAlign: 'right', lineHeight: 1.6 }}>
              Explore quantity surveying and construction industry opportunities curated for NIQS members.
            </p>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 12, marginBottom: '1.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#f9fafb', border: '1px solid #e5e7eb',
              borderRadius: 8, padding: '9px 14px', flex: 1, minWidth: 220,
            }}>
              <span style={{ fontSize: '.9rem', color: '#9ca3af' }}><Icon name="search" size="sm" /></span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by title, company or location…"
                style={{ border: 'none', outline: 'none', fontSize: '.82rem', flex: 1, background: 'transparent', color: '#374151' }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 16, lineHeight: 1 }}>×</button>
              )}
            </div>

            {/* Type filter pills */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {types.map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  style={{
                    padding: '7px 14px', borderRadius: 20, fontSize: '.75rem', fontWeight: 600,
                    border: '1px solid',
                    borderColor: typeFilter === t ? '#000066' : '#e5e7eb',
                    background: typeFilter === t ? '#000066' : '#fff',
                    color: typeFilter === t ? '#fff' : '#6b7280',
                    cursor: 'pointer', transition: 'all .15s',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Job list */}
          <div className="job-list">
            {filtered.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--color-txt-3)', padding: '3rem 0' }}>
                {status === 'loading'
                  ? 'Loading vacancies…'
                  : status === 'error'
                    ? 'We could not load the vacancies just now. Please try again shortly.'
                    : jobs.length === 0
                      ? 'No vacancies are currently listed.'
                      : 'No jobs match your search. Try adjusting the filters.'}
              </p>
            ) : filtered.map(job => {
              const daysLeft = job.deadline
                ? Math.ceil((new Date(job.deadline) - new Date()) / (1000 * 60 * 60 * 24))
                : null;
              return (
                <div
                  className="jrow"
                  key={job._id}
                  onClick={() => setSelected(job)}
                  style={{ cursor: 'pointer', transition: 'box-shadow .15s, transform .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
                >
                  <img
                    src={job.logo || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=80&h=80&fit=crop'}
                    alt={job.company}
                    style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--color-bdr)' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '.97rem', color: 'var(--color-navy)', marginBottom: '.2rem', letterSpacing: '-.02em' }}>
                      {job.title}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '.76rem', color: 'var(--color-txt-3)' }}>
                      <span><Icon name="office" size="sm" /> {job.company}</span>
                      <span><Icon name="location" size="sm" /> {job.location}</span>
                      {job.salary && <span><Icon name="money" size="sm" /> {job.salary}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.4rem', flexShrink: 0 }}>
                    <TypeBadge type={job.type} />
                    {daysLeft !== null && (
                      <span style={{
                        fontSize: '.68rem', fontWeight: 500,
                        color: daysLeft <= 7 ? '#dc2626' : 'var(--color-txt-3)',
                      }}>
                        {daysLeft <= 0 ? 'Closed' : `Closes ${new Date(job.deadline).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                      </span>
                    )}
                  </div>
                  {/* View details cue */}
                  <div style={{ fontSize: '.72rem', color: '#D9B650', fontWeight: 600, flexShrink: 0, paddingLeft: 4 }}>
                    View →
                  </div>
                </div>
              );
            })}
          </div>

          {/* Post a job CTA */}
          <div style={{ background: 'var(--color-off)', border: '1px solid var(--color-bdr)', borderRadius: 14, padding: '2.5rem', textAlign: 'center', marginTop: '3rem' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-navy)', marginBottom: '.5rem' }}>
              Are you an employer?
            </div>
            <p style={{ fontSize: '.82rem', color: 'var(--color-txt-2)', marginBottom: '1.5rem' }}>
              Reach {memberCopy} qualified quantity surveyors across Nigeria. Post your vacancy on the NIQS job board.
            </p>
            <Link to="/contact" className="btn bg">Post a Job Listing</Link>
          </div>
        </div>
      </section>

      {/* Job detail slide-in panel */}
      {selected && (
        <JobDetail
          job={selected}
          onClose={() => setSelected(null)}
          isLoggedIn={isLoggedIn}
        />
      )}
    </>
  );
}
