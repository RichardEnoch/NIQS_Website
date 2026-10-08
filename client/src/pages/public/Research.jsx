import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../../components/common/PageHero';
import API from '../../api/axios';
import Icon from '../../components/common/Icon';

/* Research & Development, restructured at the October 2026 review:
   - QS Connect is the Institute's magazine and now lives under News &
     Announcements (News page, #qs-connect), so it is no longer repeated here.
   - The "Learning Resources" cards repeated the menu (workshop certificates,
     webinars, workshop materials), each of which has its own page; removed.
   - Publications are what NIQS sells, and the Journal shows abstracts only:
     neither offers a download. Interested readers contact the Institute. */
const PURCHASE_NOTE = 'Copies are sold by the Institute. Contact the National Secretariat to buy a copy.';

function PurchaseCta() {
  return (
    <Link to="/contact" className="btn bp"
      style={{ display: 'inline-flex', marginTop: '.8rem', padding: '.5rem 1.2rem', fontSize: '.74rem', textDecoration: 'none' }}>
      Contact the Institute to purchase
    </Link>
  );
}

export default function Research() {
  const [journals, setJournals] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    API.get('/journals')
      .then(r => { setJournals(r.data?.journals || []); setStatus('ready'); })
      .catch(() => { setJournals([]); setStatus('error'); });
  }, []);

  return (
    <>
      {/* ══ HERO ══ */}
      <PageHero
        label="Knowledge Hub"
        title="Research & Development"
        titleHighlight="Development"
        backgroundImage="https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?w=1400&q=80&fit=crop"
      />

      {/* ══ PUBLICATIONS ══ */}
      <section id="publications" style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
          <div className="ey">For sale</div>
          <h2 className="sh">NIQS <em>Publications</em></h2>
          <p className="sd" style={{ marginBottom: '1.5rem' }}>
            Standards, guides and reference works published by the Nigerian Institute of Quantity Surveyors. {PURCHASE_NOTE}
          </p>
          {/* No catalogue is held on the site yet: the Secretariat is supplying the
              list of publications the Institute sells. Until then, no sample titles. */}
          <div style={{ border: '1px dashed var(--color-bdr)', borderRadius: 12, padding: '1.6rem', textAlign: 'center', color: 'var(--color-txt-2)', fontSize: '.85rem' }}>
            The publications catalogue will be listed here shortly.
            <div><PurchaseCta /></div>
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
            research, and the built environment. Abstracts are shown here; {PURCHASE_NOTE.charAt(0).toLowerCase() + PURCHASE_NOTE.slice(1)}
          </p>

          {journals.length === 0 ? (
            <p style={{ color: 'var(--color-txt-3)', fontSize: '.85rem' }}>
              {status === 'loading' ? 'Loading…' : 'Abstracts of published editions will be listed here shortly.'}
            </p>
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
                    {/* The abstract only. Full editions are sold, so there is no
                        download link even when a file is on record. */}
                    {j.description && (
                      <p style={{ fontSize: '.76rem', color: 'var(--color-txt-2)', marginTop: '.5rem', lineHeight: 1.6 }}>
                        <strong style={{ color: 'var(--color-navy)' }}>Abstract.</strong> {j.description}
                      </p>
                    )}
                    <PurchaseCta />
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
