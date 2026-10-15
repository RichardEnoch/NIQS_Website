import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../../components/common/PageHero';
import API from '../../api/axios';
import Icon from '../../components/common/Icon';

/* ── Exam card definitions — matches HTML exactly (4 cards) ── */
const EXAM_CARDS = [
  {
    id: 'tpc',
    tag: 'Corporate Membership',
    tagBg: '#000066',
    title: 'TPC — Technician Professional Competence',
    desc: 'Entry-level professional examination for associates progressing toward corporate membership. Covers core QS theory and practice.',
    heroBg: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=700&q=80&fit=crop',
    icon: 'note',
    action: { label: 'Registration Info', to: '/contact', locked: false },
  },
  {
    id: 'gde',
    tag: 'Foundation Level',
    tagBg: '#D9B650',
    title: 'GDE — Graduate Development Examination',
    desc: 'For graduates of accredited degree programmes. Tests applied knowledge in construction economics and procurement.',
    // The graduation photo that sat here started 404ing sometime before
    // 2026-08-06 — the only dead one of the 34 Unsplash images the site
    // hotlinks, but it was on a card, not a background, so it showed as a
    // broken image rather than a blank panel. Replacement checked live.
    heroBg: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=700&q=80&fit=crop',
    icon: 'education',
    action: { label: 'Registration Info', to: '/contact', locked: false },
  },
  {
    id: 'interview',
    tag: 'Professional Stage',
    tagBg: '#1a5276',
    title: 'Professional Interview',
    desc: 'Final stage of the corporate membership pathway — a structured interview assessing competency across key QS practice areas.',
    heroBg: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=700&q=80&fit=crop',
    icon: 'handshake',
    action: { label: 'View My Results', to: '/login', locked: true },
  },
  {
    id: 'logbook',
    tag: 'Work-Based Assessment',
    tagBg: '#117a65',
    title: 'Logbook Assessment',
    desc: 'Work-based assessment requiring candidates to document professional experience across a range of QS activities over a minimum period.',
    heroBg: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=700&q=80&fit=crop',
    icon: 'journal',
    action: { label: 'My Logbook', to: '/login', locked: true },
  },
];

/* ── Placeholder results (shown until admin populates DB) ── */
const PLACEHOLDER_RESULTS = [
  { _id: 'pr1', examType: 'TPC',                   sitting: 'March 2024',     centre: 'Nationwide',  resultsPublished: 'June 2024',      status: 'Published' },
  { _id: 'pr2', examType: 'GDE',                   sitting: 'March 2024',     centre: 'Nationwide',  resultsPublished: 'June 2024',      status: 'Published' },
  { _id: 'pr3', examType: 'Professional Interview', sitting: 'July 2024',      centre: 'Abuja/Lagos', resultsPublished: 'September 2024', status: 'Published' },
  { _id: 'pr4', examType: 'TPC',                   sitting: 'September 2024', centre: 'Nationwide',  resultsPublished: 'December 2024',  status: 'Published' },
  { _id: 'pr5', examType: 'GDE',                   sitting: 'September 2024', centre: 'Nationwide',  resultsPublished: 'December 2024',  status: 'Published' },
  { _id: 'pr6', examType: 'TPC/GDE',               sitting: 'March 2025',     centre: 'Nationwide',  resultsPublished: 'June 2025',      status: 'Pending'   },
];

const STATUS_COLOR = {
  Published: '#16a34a',
  Pending:   '#ca8a04',
  Upcoming:  '#2563eb',
};

/* ── Single exam card ── */
function ExamCard({ card }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      className="ecard"
      style={{ padding: 0, overflow: 'hidden' }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* ── Per-card hero background ── */}
      <div style={{ position: 'relative', height: 136, overflow: 'hidden' }}>
        <img
          src={card.heroBg}
          alt={card.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover',
            transform: hov ? 'scale(1.06)' : 'scale(1)', transition: 'transform .45s ease' }}
        />
        <div style={{ position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, rgba(0, 0, 102,.52) 0%, rgba(0, 0, 102,.85) 100%)' }} />
        {/* Tag */}
        <span style={{
          position: 'absolute', top: 12, left: 14,
          fontSize: '.56rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase',
          padding: '3px 10px', borderRadius: 20,
          background: card.tagBg, color: '#fff', border: '1px solid rgba(255,255,255,.22)',
        }}>{card.tag}</span>
        {/* Icon */}
        <span style={{ position: 'absolute', bottom: 12, left: 16, color: 'var(--color-gold)' }}><Icon name={card.icon} size="lg" /></span>
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '1.4rem 1.6rem 1.7rem' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 700,
          color: 'var(--color-navy)', margin: '0 0 .65rem', lineHeight: 1.3 }}>
          {card.title}
        </h3>
        <p style={{ fontSize: '.82rem', color: 'var(--color-txt-2)', lineHeight: 1.75, margin: '0 0 1.4rem' }}>
          {card.desc}
        </p>
        <Link to={card.action.to} className="btn bp"
          style={{ fontSize: '.78rem', padding: '.6rem 1.4rem', display: 'inline-flex', alignItems: 'center', gap: '.4rem' }}>
          {card.action.label} {card.action.locked && 'lock'}
        </Link>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function Exams() {
  const [results, setResults]       = useState([]);
  const [loadingRes, setLoadingRes] = useState(true);
  const [activeYear, setActiveYear] = useState('all');

  useEffect(() => {
    API.get('/exam-results')
      .then(res => setResults(res.data?.results || []))
      .catch(() => setResults([]))
      .finally(() => setLoadingRes(false));
  }, []);

  const isPlaceholder  = results.length === 0;
  const displayResults = isPlaceholder ? PLACEHOLDER_RESULTS : results;

  /* Unique years for tab filter */
  const years = [...new Set(
    displayResults.map(r => r.year || r.sitting?.match(/\d{4}/)?.[0]).filter(Boolean)
  )].sort((a, b) => b - a);

  const displayed = activeYear === 'all'
    ? displayResults
    : displayResults.filter(r => String(r.year || r.sitting?.match(/\d{4}/)?.[0]) === String(activeYear));

  const headingYear = years[0] || new Date().getFullYear();

  return (
    <>
      {/* ══ HERO ══ */}
      <PageHero
        label="Academic"
        title="Professional Examinations"
        titleHighlight="Examinations"
        backgroundImage="https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1400&q=80&fit=crop"
      />

      {/* ══ EXAM CARDS ══ */}
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>

          <div style={{ marginBottom: '2.5rem' }}>
            <div className="ey">Pathways</div>
            <h2 className="sh">Examination <em>Structure</em></h2>
            <p className="sd" style={{ marginBottom: 0 }}>
              NIQS administers a range of examinations forming the structured pathway to full corporate membership.
            </p>
          </div>

          <div className="exam-grid">
            {EXAM_CARDS.map(card => <ExamCard key={card.id} card={card} />)}
          </div>
        </div>
      </section>

      {/* ══ PUBLISHED RESULTS ══ */}
      <section className="section-alt">
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>

          <div style={{ marginBottom: '1.8rem' }}>
            <div className="ey">Published Results</div>
            <h2 className="sh">{headingYear} <em>Published Results</em></h2>
            {isPlaceholder && (
              <p style={{ fontSize: '.74rem', color: 'var(--color-txt-3)', fontStyle: 'italic', marginTop: '.4rem' }}>
                Showing sample data — live results will display once the admin publishes them.
              </p>
            )}
          </div>

          {/* Year filter tabs — only shown when there are multiple years */}
          {years.length > 1 && (
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1.4rem' }}>
              {['all', ...years].map(y => (
                <button key={y} onClick={() => setActiveYear(y)} style={{
                  padding: '4px 14px', borderRadius: 20, fontSize: '.74rem', fontWeight: 600,
                  border: '1.5px solid var(--color-bdr)', cursor: 'pointer', transition: '.15s',
                  background: String(activeYear) === String(y) ? 'var(--color-navy)' : '#fff',
                  color:      String(activeYear) === String(y) ? '#fff' : 'var(--color-txt-3)',
                }}>
                  {y === 'all' ? 'All Years' : y}
                </button>
              ))}
            </div>
          )}

          {loadingRes ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-txt-3)' }}>Loading results…</div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--color-bdr)' }}>
              <table className="result-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Exam Type</th>
                    <th>Sitting</th>
                    <th>Centre</th>
                    <th>Results Published</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-txt-3)' }}>
                        No results for this period.
                      </td>
                    </tr>
                  ) : displayed.map(r => (
                    <tr key={r._id}>
                      <td><strong style={{ color: 'var(--color-navy)' }}>{r.examType}</strong></td>
                      <td>{r.sitting}</td>
                      <td>{r.centre}</td>
                      <td>{r.resultsPublished || '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ color: STATUS_COLOR[r.status] || STATUS_COLOR.Pending, fontWeight: 700 }}>
                          {r.status}
                        </span>
                        {r.status === 'Published' && r.resultFileUrl && (
                          <a href={r.resultFileUrl} target="_blank" rel="noopener noreferrer"
                            style={{ marginLeft: 8, fontSize: '.68rem', color: 'var(--color-gold)', fontWeight: 700, textDecoration: 'none' }}>
                            View PDF ↗
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p style={{ fontSize: '.79rem', color: 'var(--color-txt-3)', marginTop: '.9rem', fontStyle: 'italic' }}>
            * Personal results require login.{' '}
            <Link to="/login" style={{ color: 'var(--color-navy)', fontWeight: 700, textDecoration: 'none' }}>
              View my results →
            </Link>
          </p>
        </div>
      </section>

      {/* ══ SYLLABUS & POLICY ══
          The Exams menu points here (Secretariat, Oct 2026). Placeholders until
          the Secretariat sends the two documents; link the PDFs in when they do. */}
      <section className="section-alt">
        <div className="ct" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
          <div className="tc2">
            <div id="syllabus">
              <div className="ey">Examinations</div>
              <h2 className="sh">Examination <em>Syllabus</em></h2>
              <p className="sd">The Examination Syllabus will be published here.</p>
            </div>
            <div id="policy">
              <div className="ey">Examinations</div>
              <h2 className="sh">Examination <em>Policy</em></h2>
              <p className="sd">The Examination Policy will be published here.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
          <div className="ctaw">
            <h2>Ready to <em>Register?</em></h2>
            <p>Contact the Examinations Office for registration forms, timetables, and study resources.</p>
            <div className="ctarow">
              <a href="/contact" className="btn bg">Contact Exams Office</a>
              <a href="/membership" className="btn bo" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}>
                Membership Info
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
