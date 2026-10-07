import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../../components/common/PageHero';
import API from '../../api/axios';
import Icon from '../../components/common/Icon';

const MAGAZINE_IMG = 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80&fit=crop';

const PLACEHOLDER_ISSUES = [
  {
    _id: 'ph1', isFeatured: true,
    title: 'QS Connect Vol. 9.1 — March 2025', issueDate: 'March 2025',
    description: 'Industry insights, member profiles, policy updates, and CPD opportunities — essential reading for every Nigerian QS professional.',
    coverImage: MAGAZINE_IMG, fileUrl: '',
  },
  { _id: 'ph2', title: 'QS Connect Vol. 8.2 — Sept 2024', issueDate: 'September 2024', coverImage: MAGAZINE_IMG, fileUrl: '' },
  { _id: 'ph3', title: 'QS Connect Vol. 8.1 — March 2024', issueDate: 'March 2024',    coverImage: MAGAZINE_IMG, fileUrl: '' },
  { _id: 'ph4', title: 'QS Connect Vol. 7.2 — Sept 2023', issueDate: 'September 2023', coverImage: MAGAZINE_IMG, fileUrl: '' },
];

const RES_CARDS = [
  {
    to: '/login', locked: true,
    img: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=700&q=80&fit=crop',
    h4: 'Workshop Certificates',
    p: 'Download your certificates for NIQS-accredited workshops. Login required for personal records.',
    btnLabel: 'Access Certificates', btnCls: 'bo',
  },
  {
    // Webinars are listed with every other event now (October 2026 review).
    to: '/events', locked: false,
    img: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=700&q=80&fit=crop',
    h4: 'Webinars & Events',
    p: 'Upcoming NIQS CPD webinars, workshops and conferences covering cost management, procurement, sustainability, and professional practice.',
    btnLabel: 'Browse Events', btnCls: 'bp',
  },
  {
    to: '/workshop-materials', locked: false,
    img: 'https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=700&q=80&fit=crop',
    h4: 'Workshop Materials',
    p: 'Presentation slides, templates, and reading materials from NIQS workshops — available to all members.',
    btnLabel: 'Browse Materials', btnCls: 'bp',
  },
  {
    to: '/research#journal', locked: false,
    img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=700&q=80&fit=crop',
    h4: 'Journal of QS',
    p: "The peer-reviewed Journal of Quantity Surveying — Nigeria's leading academic publication in construction economics.",
    btnLabel: 'Visit Journal →', btnCls: 'bo',
  },
];

export default function Research() {
  const [issues,  setIssues]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [journals, setJournals] = useState([]);

  useEffect(() => {
    API.get('/qs-connect')
      .then(r => setIssues(r.data?.issues || []))
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));

    API.get('/journals')
      .then(r => setJournals(r.data?.journals || []))
      .catch(() => setJournals([]));
  }, []);

  const isPlaceholder = issues.length === 0;
  const display  = isPlaceholder ? PLACEHOLDER_ISSUES : issues;
  const featured = display.find(i => i.isFeatured) || display[0];
  const sidebar  = display.filter(i => i._id !== featured?._id).slice(0, 3);

  return (
    <>
      {/* ══ HERO ══ */}
      <PageHero
        label="Knowledge Hub"
        title="Research & Development"
        titleHighlight="Development"
        backgroundImage="https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=1400&q=80&fit=crop"
      />

      {/* ══ QS CONNECT + WORKSHOPS ══ */}
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>

          {/* QS Connect Magazine */}
          <div className="ey">Publications</div>
          <h2 className="sh">QS Connect <em>Magazine</em></h2>
          {isPlaceholder && !loading && (
            <p style={{ fontSize: '.73rem', color: 'var(--color-txt-3)', fontStyle: 'italic', marginTop: '.35rem' }}>
              Sample issues shown — live editions will appear once the admin uploads them.
            </p>
          )}

          {loading ? (
            <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-txt-3)', fontSize: '.85rem' }}>
              Loading…
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', marginTop: '2rem' }}>

              {/* Featured */}
              {featured && (
                <div className="card" style={{ flexDirection: 'row', gap: 0, alignItems: 'stretch', maxHeight: 280 }}>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <img src={featured.coverImage || MAGAZINE_IMG} alt={featured.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1.2, padding: '1.8rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div className="card-tag">Publication — QS Connect</div>
                    <div className="card-title" style={{ marginTop: '.5rem' }}>{featured.title}</div>
                    <div className="card-text" style={{ fontSize: '.78rem', marginTop: '.4rem' }}>
                      {featured.description || 'Industry insights, member profiles, policy updates, and CPD opportunities — essential reading for every Nigerian QS professional.'}
                    </div>
                    {featured.fileUrl ? (
                      <a href={featured.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="btn bp"
                        style={{ marginTop: '1rem', padding: '.55rem 1rem', fontSize: '.74rem', display: 'inline-flex', alignItems: 'center', textDecoration: 'none', width: 'fit-content' }}>
                        Download PDF
                      </a>
                    ) : (
                      <span style={{ marginTop: '1rem', fontSize: '.71rem', color: 'var(--color-txt-3)', fontStyle: 'italic' }}>PDF coming soon</span>
                    )}
                  </div>
                </div>
              )}

              {/* Sidebar past issues */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
                {sidebar.map(issue => (
                  <div key={issue._id} className="card"
                    style={{ flexDirection: 'row', gap: 0, alignItems: 'center', cursor: issue.fileUrl ? 'pointer' : 'default' }}
                    onClick={() => issue.fileUrl && window.open(issue.fileUrl, '_blank')}>
                    <img src={issue.coverImage || MAGAZINE_IMG} alt={issue.title}
                      style={{ width: 70, height: 64, objectFit: 'cover', flexShrink: 0 }} />
                    <div style={{ padding: '.9rem' }}>
                      <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--color-navy)' }}>{issue.title}</div>
                      <div style={{ fontSize: '.68rem', color: 'var(--color-txt-3)', marginTop: 2 }}>{issue.issueDate}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workshops & CPD */}
          <div className="ey" style={{ marginTop: '4rem' }}>Workshops &amp; CPD</div>
          <h2 className="sh">Learning <em>Resources</em></h2>

          <div className="res-grid">
            {RES_CARDS.map((c, i) => (
              <div className="rcard" key={i}>
                <div className="rcard-img-wrap"><img src={c.img} alt={c.h4} /></div>
                <div className="rcard-body">
                  <h4>{c.h4}</h4>
                  <p>{c.p}</p>
                  <Link to={c.to} className={`btn ${c.btnCls}`}>{c.btnLabel}</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ JOURNAL OF QS ══ */}
      <section id="journal" className="section-alt">
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
          <div className="ey">Academic</div>
          <h2 className="sh">Journal of <em>Quantity Surveying</em></h2>
          <p className="sd" style={{ marginBottom: '2.5rem' }}>
            Nigeria's leading peer-reviewed academic publication in construction economics, quantity surveying
            research, and the built environment.
          </p>

          {journals.length === 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.2rem' }}>
              {[
                { vol: 'Vol. 12, Issue 2', year: 2024, title: 'Construction Cost Estimation Using BIM Technologies in Nigeria' },
                { vol: 'Vol. 12, Issue 1', year: 2024, title: 'Procurement Strategy and Project Success in the Nigerian Public Sector' },
                { vol: 'Vol. 11, Issue 2', year: 2023, title: 'Sustainable Quantity Surveying: Trends and Future Outlook' },
              ].map((j, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid var(--color-bdr)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ height: 100, background: 'linear-gradient(135deg, var(--color-navy) 60%, #1a3a7a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="news" size="xl" /></div>
                  <div style={{ padding: '1rem 1.2rem' }}>
                    <div style={{ fontSize: '.62rem', color: 'var(--color-gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.4rem' }}>{j.vol} · {j.year}</div>
                    <div style={{ fontSize: '.82rem', fontWeight: 700, color: 'var(--color-navy)', lineHeight: 1.4 }}>{j.title}</div>
                    <div style={{ fontSize: '.71rem', color: 'var(--color-txt-3)', marginTop: '.5rem', fontStyle: 'italic' }}>Sample — admin will add real editions</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.2rem' }}>
              {journals.map(j => (
                <div key={j._id} style={{ background: '#fff', border: '1px solid var(--color-bdr)', borderRadius: 12, overflow: 'hidden' }}>
                  {j.coverImage
                    ? <img src={j.coverImage} alt={j.title} style={{ width: '100%', height: 110, objectFit: 'cover' }} />
                    : <div style={{ height: 110, background: 'linear-gradient(135deg, var(--color-navy) 60%, #1a3a7a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="news" size="xl" /></div>
                  }
                  <div style={{ padding: '1rem 1.2rem' }}>
                    {(j.volume || j.year) && (
                      <div style={{ fontSize: '.62rem', color: 'var(--color-gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '.4rem' }}>
                        {[j.volume && `Vol. ${j.volume}`, j.issue && `Issue ${j.issue}`, j.year].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    <div style={{ fontSize: '.84rem', fontWeight: 700, color: 'var(--color-navy)', lineHeight: 1.4 }}>{j.title}</div>
                    {j.description && <p style={{ fontSize: '.76rem', color: 'var(--color-txt-2)', marginTop: '.5rem', lineHeight: 1.6 }}>{j.description}</p>}
                    {j.fileUrl && (
                      <a href={j.fileUrl} target="_blank" rel="noopener noreferrer" className="btn bp"
                        style={{ display: 'inline-flex', marginTop: '.8rem', padding: '.5rem 1.2rem', fontSize: '.74rem', textDecoration: 'none' }}>
                        Download PDF
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
