import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../../components/common/PageHero';
import API from '../../api/axios';
import Icon from '../../components/common/Icon';

const TYPE_ICON  = { slides: 'chart', template: 'template', reading: 'book', video: 'video', other: 'folder' };
const TYPE_LABEL = { slides: 'Slides', template: 'Template', reading: 'Reading', video: 'Video', other: 'Other' };
const TYPE_COLOR = { slides: '#000066', template: '#D9B650', reading: '#1a5276', video: '#dc2626', other: '#6b7280' };
const SCOPE_LABEL = { national: 'National', chapter: 'Chapter', yqsf: 'YQSF', waqsn: 'WAQSN' };

const PLACEHOLDERS = [
  {
    _id: 'm1', type: 'slides', scope: 'national',
    title: 'Construction Cost Management — 2025 Workshop Slides',
    description: 'Full slide deck from the February 2025 national workshop on construction cost management and budgeting.',
    workshopTitle: 'Cost Management Masterclass', workshopDate: '2025-02-14T00:00:00Z',
    thumbnailUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=500&q=70&fit=crop',
    fileUrl: '',
  },
  {
    _id: 'm2', type: 'template', scope: 'national',
    title: 'Bill of Quantities Standard Template (2025 Edition)',
    description: 'Updated BoQ template aligned with NIQS SMM and ready for use in residential and commercial projects.',
    workshopTitle: 'QS Tools Workshop', workshopDate: '2025-01-10T00:00:00Z',
    thumbnailUrl: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=500&q=70&fit=crop',
    fileUrl: '',
  },
  {
    _id: 'm3', type: 'reading', scope: 'national',
    title: 'Introduction to Public Procurement Law in Nigeria',
    description: 'Comprehensive reading material on the Public Procurement Act and its implications for QS practice.',
    workshopTitle: 'Procurement Workshop', workshopDate: '2025-03-05T00:00:00Z',
    thumbnailUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=500&q=70&fit=crop',
    fileUrl: '',
  },
  {
    _id: 'm4', type: 'slides', scope: 'yqsf',
    title: 'YQSF Tech Skills Bootcamp — Digital Tools for QS',
    description: 'Slide deck from the YQSF bootcamp covering Revit, CostX, and other digital tools for young QS professionals.',
    workshopTitle: 'YQSF Tech Bootcamp', workshopDate: '2025-04-20T00:00:00Z',
    thumbnailUrl: 'https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?w=500&q=70&fit=crop',
    fileUrl: '',
  },
  {
    _id: 'm5', type: 'template', scope: 'waqsn',
    title: 'WAQSN Mentorship Programme — Session Templates',
    description: 'Structured mentorship session templates developed by WAQSN for use by mentors and mentees.',
    workshopTitle: 'WAQSN Mentorship Workshop', workshopDate: '2025-03-08T00:00:00Z',
    thumbnailUrl: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=500&q=70&fit=crop',
    fileUrl: '',
  },
  {
    _id: 'm6', type: 'reading', scope: 'chapter',
    title: 'Lagos Infrastructure: Case Studies in QS Practice',
    description: 'Reading material from the Lagos Chapter workshop covering real infrastructure project case studies.',
    workshopTitle: 'Lagos Chapter Workshop', workshopDate: '2025-05-12T00:00:00Z',
    thumbnailUrl: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=500&q=70&fit=crop',
    fileUrl: '',
  },
];

const TYPES  = ['all', 'slides', 'template', 'reading', 'video', 'other'];
const SCOPES = ['all', 'national', 'chapter', 'yqsf', 'waqsn'];

export default function WorkshopMaterials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [typeFilter, setTypeFilter]   = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [search, setSearch]           = useState('');

  useEffect(() => {
    API.get('/workshop-materials')
      .then(r => setMaterials(r.data?.materials || []))
      .catch(() => setMaterials([]))
      .finally(() => setLoading(false));
  }, []);

  const isPlaceholder = materials.length === 0;
  const source        = isPlaceholder ? PLACEHOLDERS : materials;

  const filtered = source.filter(m => {
    if (typeFilter  !== 'all' && m.type  !== typeFilter)  return false;
    if (scopeFilter !== 'all' && m.scope !== scopeFilter) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase()) && !m.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('en-NG', { month: 'long', year: 'numeric' }) : '';

  return (
    <>
      <PageHero
        label="Research &amp; Devt"
        title="Workshop Materials"
        titleHighlight="Workshop Materials"
        backgroundImage="https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=1400&q=80&fit=crop"
      />

      {/* Intro */}
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '4rem', paddingBottom: '2rem' }}>
          <div className="ey">Learning</div>
          <h2 className="sh">Workshop <em>Materials</em></h2>
          <p className="sd">
            Presentation slides, templates, reading materials, and resources from NIQS workshops,
            chapter events, YQSF and WAQSN programmes — all in one place.
          </p>
          {isPlaceholder && !loading && (
            <p style={{ fontSize: '.73rem', color: 'var(--color-txt-3)', fontStyle: 'italic', marginTop: '.3rem' }}>
              Sample materials shown — real files will appear once the admin uploads them.
            </p>
          )}
        </div>
      </section>

      {/* Filters + Grid */}
      <section className="section-alt">
        <div className="ct" style={{ paddingTop: '2rem', paddingBottom: '5rem' }}>

          {/* Filter bar */}
          <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search materials…"
              style={{ flex: 1, minWidth: 200, padding: '8px 14px', borderRadius: 8, border: '1.5px solid var(--color-bdr)', fontSize: '.8rem', fontFamily: 'inherit', background: '#fff' }} />
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selStyle}>
              {TYPES.map(t => <option key={t} value={t}>{t === 'all' ? 'All Types' : TYPE_LABEL[t]}</option>)}
            </select>
            <select value={scopeFilter} onChange={e => setScopeFilter(e.target.value)} style={selStyle}>
              {SCOPES.map(s => <option key={s} value={s}>{s === 'all' ? 'All Scopes' : SCOPE_LABEL[s]}</option>)}
            </select>
          </div>

          <div style={{ fontSize: '.74rem', color: 'var(--color-txt-3)', marginBottom: '1.2rem' }}>
            {loading ? 'Loading…' : `${filtered.length} material${filtered.length !== 1 ? 's' : ''}`}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-txt-3)' }}>Loading materials…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-txt-3)' }}>
              <div style={{ marginBottom: '.8rem' }}><Icon name="folder" size="xl" /></div>
              <div style={{ fontWeight: 700, color: 'var(--color-navy)' }}>No materials found.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.2rem' }}>
              {filtered.map(m => (
                <MaterialCard key={m._id} m={m} fmtDate={fmtDate} isPlaceholder={isPlaceholder} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
          <div className="ctaw">
            <h2>Want to <em>Contribute?</em></h2>
            <p>Workshop facilitators can submit materials to be published in this library. Contact the secretariat.</p>
            <div className="ctarow">
              <a href="/contact" className="btn bg">Submit Materials</a>
              <Link to="/events" className="btn bo" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}>Upcoming Events</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function MaterialCard({ m, fmtDate, isPlaceholder }) {
  const tColor = TYPE_COLOR[m.type] || '#6b7280';
  return (
    <div style={{ background: '#fff', border: '1px solid var(--color-bdr)', borderRadius: 14, overflow: 'hidden',
      transition: 'box-shadow .2s, transform .2s' }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 102,.10)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}>

      {/* Thumbnail */}
      <div style={{ height: 120, overflow: 'hidden', position: 'relative' }}>
        <img src={m.thumbnailUrl || 'https://images.unsplash.com/photo-1553028826-f4804a6dba3b?w=500&q=70'} alt={m.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0, 0, 102,.5)' }} />
        <span style={{ position: 'absolute', top: 10, left: 10, color: 'var(--color-gold)' }}><Icon name={TYPE_ICON[m.type] || 'folder'} size="lg" /></span>
        <span style={{ position: 'absolute', top: 10, right: 10, fontSize: '.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', padding: '2px 8px', borderRadius: 10, background: tColor, color: '#fff' }}>
          {TYPE_LABEL[m.type] || m.type}
        </span>
        {isPlaceholder && (
          <span style={{ position: 'absolute', bottom: 8, right: 10, fontSize: '.56rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', padding: '2px 7px', borderRadius: 4, background: 'rgba(217, 182, 80,.2)', color: '#D9B650', border: '1px solid rgba(217, 182, 80,.4)' }}>
            Sample
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: '1.1rem 1.2rem' }}>
        <div style={{ display: 'flex', gap: '.4rem', marginBottom: '.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '.58rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', padding: '2px 8px', borderRadius: 10, background: '#000066', color: '#fff' }}>
            {SCOPE_LABEL[m.scope] || m.scope}
          </span>
          {m.workshopDate && (
            <span style={{ fontSize: '.6rem', color: 'var(--color-txt-3)' }}>{fmtDate(m.workshopDate)}</span>
          )}
        </div>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '.9rem', color: 'var(--color-navy)', lineHeight: 1.3, marginBottom: '.5rem' }}>{m.title}</div>
        {m.workshopTitle && (
          <div style={{ fontSize: '.7rem', color: 'var(--color-gold)', fontWeight: 600, marginBottom: '.4rem' }}><Icon name="pin" size="sm" /> {m.workshopTitle}</div>
        )}
        <p style={{ fontSize: '.78rem', color: 'var(--color-txt-2)', lineHeight: 1.6, margin: '0 0 .9rem',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {m.description}
        </p>
        {m.fileUrl ? (
          <a href={m.fileUrl} target="_blank" rel="noopener noreferrer" className="btn bp"
            style={{ display: 'inline-flex', padding: '.5rem 1.1rem', fontSize: '.74rem', textDecoration: 'none' }}>
            Download ↓
          </a>
        ) : (
          <span style={{ fontSize: '.72rem', color: 'var(--color-txt-3)', fontStyle: 'italic' }}>File coming soon</span>
        )}
      </div>
    </div>
  );
}

const selStyle = { padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--color-bdr)', fontSize: '.78rem', fontFamily: 'inherit', background: '#fff', color: 'var(--color-txt)', cursor: 'pointer' };
