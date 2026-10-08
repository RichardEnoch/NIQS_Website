import { useState, useEffect } from 'react';
import PageHero from '../../components/common/PageHero';
import API from '../../api/axios';
import { shortName } from '../../utils/names';


/* Initials avatar for presidents whose portrait hasn't been provided yet —
   never a stock stranger's face. */
function InitialsAvatar({ name }) {
  const initials = (name || '')
    .replace(/^(QS|Surv\.?|Chief|High Chief|Dr\.?|Prof\.?)\s+/gi, '')
    .split(/\s+/)
    .filter(w => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #000066 0%, #12306e 100%)',
      color: 'rgba(255,255,255,.85)', fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '2.4rem',
      letterSpacing: '.02em',
    }}>{initials || 'QS'}</div>
  );
}

/* LinkedIn SVG icon — shown on hover if URL is set */
function LinkedInIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'inline', marginLeft: 4, verticalAlign: 'middle', opacity: 0.7 }}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export default function PastPresidents() {
  const [presidents, setPresidents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/past-presidents')
      .then(res => {
        const data = res.data?.pastPresidents || res.data?.data || res.data;
        if (Array.isArray(data) && data.length > 0) setPresidents(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHero
        label="Our History"
        title="Past Presidents"
        titleHighlight="Presidents"
        backgroundImage="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1400&q=80&fit=crop"
      />

      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
          <div className="ey">1969 — Present</div>
          <h2 className="sh">Presidents Who Shaped <em>NIQS</em></h2>
          <p className="sd" style={{ marginBottom: '3rem' }}>
            Since our founding in 1969, NIQS has been led by distinguished quantity surveyors
            who each contributed uniquely to the growth of the profession.
          </p>

          {loading && presidents.length === 0 && (
            <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--color-txt-3)', fontSize: '.85rem' }}>
              Loading past presidents…
            </div>
          )}
          <div className="pp-grid">
            {presidents.map(p => (
              <div className="ppcard" key={p._id}>
                {/* Circular portrait — initials when no photo is on file */}
                <div className="ppcard-img-wrap">
                  {p.image
                    ? <img src={p.image} alt={p.name} />
                    : <InitialsAvatar name={p.name} />}
                </div>

                {/* Name — clickable if linkedIn URL is set */}
                <div className="ppcard-name" title={p.name}>
                  {p.linkedIn ? (
                    <a
                      href={p.linkedIn}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View LinkedIn Profile"
                      style={{
                        color: 'var(--color-navy)',
                        textDecoration: 'none',
                        borderBottom: '1px solid var(--color-bdr-gold)',
                        paddingBottom: 1,
                        cursor: 'pointer',
                      }}
                    >
                      {shortName(p.name, { override: p.shortName })}<LinkedInIcon />
                    </a>
                  ) : (
                    shortName(p.name, { override: p.shortName })
                  )}
                </div>

                {/* Term in gold */}
                <div className="ppcard-term">{p.term}</div>

                {/* p.info is deliberately not rendered: on every record it only
                    said "PPNIQS", which the page title already says, and the
                    review (Oct 2026) asked for it to go. */}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
