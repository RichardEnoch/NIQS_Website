import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageHero from '../../components/common/PageHero';
import LeaderCard from '../../components/common/LeaderCard';
import StateMap from '../../components/chapters/StateMap';
import API from '../../api/axios';
import Icon from '../../components/common/Icon';

const ZONE_MAP = {
  'abia':'South East','adamawa':'North East','akwa-ibom':'South South','anambra':'South East',
  'bauchi':'North East','bayelsa':'South South','benue':'North Central','borno':'North East',
  'cross-river':'South South','delta':'South South','ebonyi':'South East','edo':'South South',
  'ekiti':'South West','enugu':'South East','fct':'North Central','gombe':'North East',
  'imo':'South East','jigawa':'North West','kaduna':'North West','kano':'North West',
  'katsina':'North West','kebbi':'North West','kogi':'North Central','kwara':'North Central',
  'lagos':'South West','nasarawa':'North Central','niger':'North Central','ogun':'South West',
  'ondo':'South West','osun':'South West','oyo':'South West','plateau':'North Central',
  'rivers':'South South','sokoto':'North West','taraba':'North East','yobe':'North East',
  'zamfara':'North West',
};

export default function ChapterDetail() {
  const { slug } = useParams();
  const [chapter, setChapter]   = useState(null);
  const [exco,    setExco]      = useState([]);
  const [events,  setEvents]    = useState([]);
  const [loading, setLoading]   = useState(true);

  /* Chapter slugs are stored as "<state>-chapter" (e.g. "cross-river-chapter"),
     so strip the suffix before deriving the state name / zone. */
  const stateSlug = slug.replace(/-chapter$/, '');

  const stateName = stateSlug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
    .replace(/\bFct\b/, 'FCT');

  useEffect(() => {
    setLoading(true);
    API.get(`/chapters/${slug}`)
      .then(res => {
        const data = res.data?.data || res.data;
        setChapter(data);
        if (data?._id) {
          API.get(`/exco?scope=chapter&chapter=${data._id}`)
            .then(r => {
              const d = r.data?.exco || r.data?.data || r.data;
              if (Array.isArray(d) && d.length > 0) setExco(d.filter(m => m.isActive !== false));
            })
            .catch(() => {});
          API.get(`/events?chapter=${data._id}&limit=3`)
            .then(r => { const d = r.data?.events || r.data?.data || r.data; if (Array.isArray(d)) setEvents(d); })
            .catch(() => {});
        }
      })
      .catch(() => {
        setChapter({
          name: `${stateName} Chapter`,
          state: stateName,
          zone: ZONE_MAP[stateSlug] || '',
          address: `NIQS ${stateName} Chapter Secretariat`,
          about: `The ${stateName} State Chapter of the Nigerian Institute of Quantity Surveyors coordinates professional activities, organises CPD events, advocates for the profession, and supports member welfare within the state.`,
          email: `${stateSlug}@niqs.org.ng`,
          phone: '+234 800 000 0000',
          memberCount: 0,
          image: '',
        });
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <>
        <PageHero
          label="State Chapter"
          title="Loading…"
          backgroundImage="/backgrounds/hero-crest.webp"
        />
        <div className="ct" style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--color-txt-3)' }}>
          Loading chapter information…
        </div>
      </>
    );
  }

  /* The hero is the institute's crest, not chapter.image: that field holds the
     chairman's portrait, which the executive list below already shows. Using it
     here as well put the same face on the page three times (review, Oct 2026). */
  const heroImg = '/backgrounds/hero-crest.webp';

  /* No executive head-count: the list of executives is right below it. */
  const stats = [
    chapter?.memberCount > 0 && { label: 'Registered QS', value: chapter.memberCount.toLocaleString() },
    chapter?.firmCount   > 0 && { label: 'QS Firms',      value: chapter.firmCount.toLocaleString() },
    chapter?.zone            && { label: 'Zone',          value: chapter.zone, small: true },
  ].filter(Boolean);

  return (
    <>
      <PageHero
        label={chapter?.zone ? `${chapter.zone} Zone` : 'State Chapter'}
        title={chapter?.name || `${stateName} Chapter`}
        titleHighlight="Chapter"
        backgroundImage={heroImg}
      />

      {/* ── ABOUT + CONTACT ── */}
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>

          {/* back link */}
          <Link to="/chapters" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-txt-3)', textDecoration: 'none', marginBottom: '2rem', fontWeight: 600 }}>
            ← All Chapters
          </Link>

          <div className="tc2">
            {/* Left: description + contact */}
            <div className="rl">
              <div className="ey">About This Chapter</div>
              <h2 className="sh">{chapter?.name || `${stateName} Chapter`}</h2>
              {/* The write-up stays (review, second pass, Oct 2026): each chapter
                  rewrites its own from the profile template the Secretariat
                  circulates, rather than the page going without one. */}
              <p style={{ fontSize: '.9rem', lineHeight: 1.85, color: 'var(--color-txt-2)', marginBottom: '1.5rem' }}>
                {chapter?.about || `The ${stateName} State Chapter of the Nigerian Institute of Quantity Surveyors coordinates professional activities, organises CPD events, and supports member welfare within the state.`}
              </p>

              {/* Stats row — only figures we actually hold are shown, so a chapter
                  whose counts the secretariat has not supplied never renders a
                  row of dashes. QS/firm counts are admin-editable. */}
              {stats.length > 0 && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                  {stats.map(s => (
                    <div key={s.label} style={{ background: 'var(--color-off)', borderRadius: 10, padding: '.8rem 1.2rem', textAlign: 'center', minWidth: 110 }}>
                      <div style={{
                        fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--color-navy)',
                        fontSize: s.small ? '.9rem' : '1.6rem',
                        letterSpacing: s.small ? '-.02em' : '-.04em',
                        paddingTop: s.small ? '.5rem' : 0,
                      }}>{s.value}</div>
                      <div style={{ fontSize: '.65rem', fontWeight: 700, color: 'var(--color-txt-3)', textTransform: 'uppercase', letterSpacing: '.08em', marginTop: s.small ? '.35rem' : 0 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Contact info */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem' }}>
                {chapter?.address && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '.85rem', color: 'var(--color-txt-2)' }}>
                    <span style={{ fontSize: '1rem', marginTop: 1 }}><Icon name="location" size="sm" /></span>
                    <span>{chapter.address}</span>
                  </div>
                )}
                {chapter?.email && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: '.85rem' }}>
                    <span><Icon name="email" size="sm" /></span>
                    <a href={`mailto:${chapter.email}`} style={{ color: 'var(--color-navy)', fontWeight: 600, textDecoration: 'none' }}>{chapter.email}</a>
                  </div>
                )}
                {chapter?.phone && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: '.85rem' }}>
                    <span><Icon name="phone" size="sm" /></span>
                    <a href={`tel:${chapter.phone}`} style={{ color: 'var(--color-navy)', fontWeight: 600, textDecoration: 'none' }}>{chapter.phone}</a>
                  </div>
                )}
                {chapter?.website && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: '.85rem' }}>
                    <span><Icon name="web" size="sm" /></span>
                    <a href={chapter.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-gold)', fontWeight: 600, textDecoration: 'none' }}>{chapter.website}</a>
                  </div>
                )}
              </div>
            </div>

            {/* Right: where the chapter is */}
            <div className="rr">
              <StateMap state={chapter?.state || stateName} zone={chapter?.zone || ZONE_MAP[stateSlug]}
                pin={{ lat: chapter?.pinLat, lng: chapter?.pinLng, label: chapter?.pinLabel }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── CHAPTER LEADERSHIP ── */}
      <section style={{ background: 'var(--color-off)' }}>
        <div className="ct" style={{ paddingTop: '3.5rem', paddingBottom: '3.5rem' }}>
          <div className="ey">Leadership</div>
          <h2 className="sh">Chapter <em>Executives</em></h2>
          <p className="sd" style={{ marginBottom: '2rem' }}>
            The executive committee leading {chapter?.name || `${stateName} Chapter`} in the current administration.
          </p>
          {exco.length > 0 ? (
            <div className="leader-grid">
              {exco.map(m => <LeaderCard key={m._id} member={m} hideState pageContact={{ email: chapter?.email, phone: chapter?.phone }} />)}
            </div>
          ) : (
            <div style={{
              padding: '3rem 2rem', textAlign: 'center', background: '#fff',
              borderRadius: 14, border: '1px dashed var(--color-bdr)',
            }}>
              <p style={{ fontSize: '.85rem', color: 'var(--color-txt-2)', margin: 0 }}>
                Executive details for this chapter will be published once confirmed by the
                National Secretariat.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ── UPCOMING EVENTS ── */}
      {events.length > 0 && (
        <section style={{ background: '#fff' }}>
          <div className="ct" style={{ paddingTop: '3rem', paddingBottom: '3rem' }}>
            <div className="ey">Events</div>
            <h2 className="sh" style={{ marginBottom: '1.5rem' }}>Upcoming <em>Events</em></h2>
            <div>
              {events.map(e => (
                <div className="erow" key={e._id}>
                  <div>
                    <div className="eday">{new Date(e.date).getDate()}</div>
                    <div className="emon">{new Date(e.date).toLocaleString('default', { month: 'short' }).toUpperCase()} {new Date(e.date).getFullYear()}</div>
                  </div>
                  <div className="einfo"><h4>{e.title}</h4><p><Icon name="location" size="sm" /> {e.location || 'Venue TBC'}</p></div>
                  {e.type && <span className="epill">{e.type}</span>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
