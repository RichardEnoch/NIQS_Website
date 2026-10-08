import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import PageHero from '../../components/common/PageHero';
import { AGREEMENT_COUNT } from '../../data/reciprocity';
import Icon from '../../components/common/Icon';
import { useMemberCopy } from '../../hooks/useMembershipStats';

export default function About() {
  const memberCopy = useMemberCopy();
  const [partners, setPartners]   = useState([]);
  const [loadingP, setLoadingP]   = useState(true);

  useEffect(() => {
    API.get('/partners')
      .then(res => {
        const data = res.data?.partners || res.data || [];
        setPartners(data);
      })
      .catch(() => {})
      .finally(() => setLoadingP(false));
  }, []);

  // Show up to 2 featured partners; prefer platinum, then gold
  const featured = (() => {
    if (loadingP) return [];
    const sorted = [...partners].sort((a, b) => {
      const order = { platinum: 0, gold: 1, silver: 2, bronze: 3, associate: 4 };
      return (order[a.tier] ?? 5) - (order[b.tier] ?? 5);
    });
    return sorted.slice(0, 2);
  })();
  const noPartnersYet = !loadingP && partners.length === 0;

  return (
    <>
      {/* ── PAGE HERO ── */}
      <PageHero
        label="Who We Are"
        title="About NIQS"
        titleHighlight="NIQS"
        backgroundImage="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1400&q=80&fit=crop"
      />

      {/* ── OUR STORY ── */}
      <section style={{ background: '#fff' }}>
        <div className="ct">
          <div className="tc2">
            <div className="rl">
              <div className="ey">Our Story</div>
              <h2 className="sh">Shaping Nigeria's <em>Built Environment</em> Since 1969</h2>
              <p style={{ fontSize: '.9rem', lineHeight: 1.88, color: 'var(--text2)', marginBottom: '1rem' }}>
                The Nigerian Institute of Quantity Surveyors was founded in 1969 by a group of Nigerians who trained, qualified and practiced in the United Kingdom but who, upon returning to Nigeria, sensed the urgent need to develop the profession of Quantity Surveying in Nigeria by establishing a parallel body to the Royal Institution of Chartered Surveyors of the United Kingdom.
              </p>
              <p style={{ fontSize: '.9rem', lineHeight: 1.88, color: 'var(--text2)', marginBottom: '1.5rem' }}>
                The profession of Quantity Surveying is practiced in Nigeria along the same pattern as in the United Kingdom and other Commonwealth countries. In America, they are known as Cost Engineers, and Quantity Surveying functions are carried out in other countries under a variety of names — the role is universal.
              </p>
              <Link to="/membership" className="btn bp">Join NIQS Today</Link>
            </div>
            <div className="rr">
              <img
                src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=700&q=80&fit=crop"
                alt="Construction Nigeria"
                style={{ borderRadius: 14, width: '100%', height: 420, objectFit: 'cover', boxShadow: 'var(--sh2)' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Membership statistics (MembershipStats) used to sit here. At the October
          2026 review NIQS asked that the figures be shown to members only, so
          they now live on the portal dashboard. */}

      {/* ── STRATEGIC PARTNERS ──
          Straight after the founding story since the October 2026 review, where
          NIQS asked for partnership to be more visible in position as well as in
          look. It used to sit last, below Why NIQS. */}
      <section style={{ background: 'var(--off)' }}>
        <div className="ct">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <div className="ey">Strategic Partners</div>
              <h2 className="sh" style={{ marginBottom: 0 }}>Partners in <em>Excellence</em></h2>
            </div>
          </div>
          <p className="sd" style={{ marginBottom: '2rem' }}>
            NIQS works alongside organisations committed to raising the bar in Nigeria's construction industry.
          </p>

          {loadingP ? (
            <div style={{ padding: '2rem 0', color: 'var(--color-txt-3)', fontSize: '.85rem' }}>Loading partners…</div>
          ) : noPartnersYet ? (
            <div style={{
              background: 'linear-gradient(135deg, #000066 0%, #12306e 100%)',
              borderRadius: 16, padding: '3rem 2.5rem', textAlign: 'center',
            }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.4rem', color: '#fff', marginBottom: '.6rem', letterSpacing: '-.02em' }}>
                Become a Foundation Partner of NIQS
              </h3>
              <p style={{ fontSize: '.88rem', color: 'rgba(255,255,255,.75)', maxWidth: 620, margin: '0 auto 1.5rem', lineHeight: 1.8 }}>
                We are inviting organisations that share our commitment to excellence in the built
                environment to partner with the Institute. Reach {memberCopy} quantity surveying
                professionals across all 36 states and the FCT.
              </p>
              <div style={{ display: 'flex', gap: '.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/partnership" className="btn bp">Explore Partnership Tiers</Link>
                <Link to="/contact" className="btn bo" style={{ borderColor: 'rgba(255,255,255,.4)', color: '#fff' }}>Contact the Secretariat</Link>
              </div>
            </div>
          ) : (
            featured.map(p => {
              const tierLabel = p.tier ? p.tier.charAt(0).toUpperCase() + p.tier.slice(1) + ' Partner' : 'Partner';
              /* A label rendered as JSX rather than a string, so the icon is an icon.
                 It was a plain string when the marker was an emoji. */
              const badgeLabel = p.tier === 'platinum'
                ? <><Icon name="diamond" size="sm" /> Platinum Partner</>
                : p.tier === 'gold'
                  ? <><Icon name="trophy" size="sm" /> Gold Partner</>
                  : tierLabel;

              const cardInner = (
                <div className="gpc" style={{ position: 'relative', cursor: 'pointer' }}>
                  {/* Logo / initial panel */}
                  {p.logo ? (
                    <img className="gpimg" src={p.logo} alt={p.name} style={{ objectFit: 'contain', background: '#fff', padding: '1.5rem' }} />
                  ) : (
                    <div className="gpimg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '.5rem', background: 'linear-gradient(135deg,#f0f4fb,#e8edf6)' }}>
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '2.8rem', color: 'var(--color-navy)', opacity: .18 }}>{p.name[0]}</span>
                      <span style={{ fontSize: '.62rem', fontWeight: 600, color: 'var(--color-txt-3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Logo</span>
                    </div>
                  )}

                  {/* Content */}
                  <div>
                    <div className="gpbadge">{badgeLabel}</div>
                    <h4>{p.name}</h4>
                    {p.industry && (
                      <div style={{ fontSize: '.76rem', color: 'var(--color-txt-3)', fontWeight: 600, marginBottom: '.5rem', letterSpacing: '.02em' }}>{p.industry}</div>
                    )}
                    {p.description && <p>{p.description}</p>}
                    <span className="gpl">View partner profile →</span>
                  </div>
                </div>
              );

              return (
                <Link key={p._id} to={`/partnership/${p._id}`} style={{ textDecoration: 'none', display: 'block' }}>{cardInner}</Link>
              );
            })
          )}

          <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
            <Link to="/partnership" className="btn bp">Explore All Partnership Opportunities →</Link>
          </div>
        </div>
      </section>
      {/* ── VISION / MISSION / VALUE ── */}
      <section style={{ background: 'var(--off)', paddingTop: 0 }}>
        <div className="ct" style={{ paddingTop: '5rem' }}>
          <div className="ey">Our Principles</div>
          <h2 className="sh">Vision, Mission &amp; <em>Values</em></h2>
          <div className="valg">
            <div className="val">
              <div className="vali"><Icon name="target" size="xl" /></div>
              <h4>Our Vision</h4>
              <p>To be the profession in Nigeria responsible for total cost and procurement management, for the achievement of client's objectives in all types of capital projects and developments, from conception to commissioning and maintenance, in all sectors of the economy, for the attainment of sustainable National development.</p>
            </div>
            <div className="val">
              <div className="vali"><Icon name="rocket" size="xl" /></div>
              <h4>Our Mission</h4>
              <p>Contributing to sustainable development of Nigeria by promoting the patronage of our world-class construction cost services and procurement management experts that meet client needs and expectations through the development of unique and distinctive competencies of the profession.</p>
            </div>
            <div className="val">
              <div className="vali"><Icon name="diamond" size="xl" /></div>
              <h4>Our Value</h4>
              {/* Vision, Mission and Value are the legacy site's exact words. NIQS
                  asked at the October 2026 review to keep them verbatim until
                  council adopts new statements, so do not paraphrase them. */}
              <p>Quantity Surveyors have value for money as their watch word. We are trained to offer comprehensive costing and cost management services.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHY NIQS ── */}
      <section style={{ background: '#fff' }}>
        <div className="ct">
          <div className="tc2">
            <div className="rl">
              <img
                src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=700&q=80&fit=crop"
                alt="QS Team"
                style={{ borderRadius: 14, width: '100%', height: 370, objectFit: 'cover', boxShadow: 'var(--sh)' }}
              />
            </div>
            <div className="rr">
              <div className="ey">Why NIQS</div>
              <h2 className="sh">A Professional Body You Can <em>Trust</em></h2>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '.8rem', marginBottom: '1.5rem' }}>
                <li style={{ display: 'flex', gap: '.8rem', fontSize: '.86rem', color: 'var(--text2)' }}>
                  <span style={{ color: 'var(--gold)', fontWeight: 800, flexShrink: 0 }}><Icon name="check" size="sm" /></span>
                  Internationally recognised qualifications and credentials
                </li>
                <li style={{ display: 'flex', gap: '.8rem', fontSize: '.86rem', color: 'var(--text2)' }}>
                  <span style={{ color: 'var(--gold)', fontWeight: 800, flexShrink: 0 }}><Icon name="check" size="sm" /></span>
                  Access to Nigeria's largest QS professional network
                </li>
                <li style={{ display: 'flex', gap: '.8rem', fontSize: '.86rem', color: 'var(--text2)' }}>
                  <span style={{ color: 'var(--gold)', fontWeight: 800, flexShrink: 0 }}><Icon name="check" size="sm" /></span>
                  Structured CPD programmes and webinar series
                </li>
                <li style={{ display: 'flex', gap: '.8rem', fontSize: '.86rem', color: 'var(--text2)' }}>
                  <span style={{ color: 'var(--gold)', fontWeight: 800, flexShrink: 0 }}><Icon name="check" size="sm" /></span>
                  Strong advocacy with government and industry stakeholders
                </li>
                <li style={{ display: 'flex', gap: '.8rem', fontSize: '.86rem', color: 'var(--text2)' }}>
                  <span style={{ color: 'var(--gold)', fontWeight: 800, flexShrink: 0 }}><Icon name="check" size="sm" /></span>
                  {AGREEMENT_COUNT} international reciprocity agreements
                </li>
              </ul>
              <Link to="/contact" className="btn bp">Get In Touch</Link>
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
