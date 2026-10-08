import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import PageHero from '../../components/common/PageHero';
import { SkeletonGrid, SkeletonText } from '../../components/common/Skeleton';
import Icon from '../../components/common/Icon';
import { useMemberCopy } from '../../hooks/useMembershipStats';

const tierColors = {
  platinum: '#6b7280',
  gold:     '#D9B650',
  silver:   '#9ca3af',
  bronze:   '#b45309',
  associate:'#2563EB',
};

/* No sample partners. This page used to fill empty tiers with real companies
   (Julius Berger, Dangote, CCECC, AECOM, Setraco, …) marked "Sample". At the
   October 2026 review it was pointed out that naming real organisations as
   partners of the Institute — however labelled — is not something NIQS can
   publish before an agreement exists. Tiers with no partners are simply not
   shown; the empty state below invites enquiries instead. */

const tiers = [
  {
    name: 'Platinum',
    price: '₦10,000,000+',
    period: 'per annum',
    platinum: true,
    icon: 'diamond',
    benefits: [
      'Premier branding at all NIQS national events',
      'Exclusive naming rights for one major NIQS programme',
      'Full-page advertisement in all NIQS publications',
      'Speaking slot at the Annual Conference',
      'Logo on NIQS website homepage',
      'Access to NIQS membership database for recruitment',
      'VIP hospitality at all NIQS events (10 seats)',
      'Quarterly meetings with NIQS leadership',
    ],
  },
  {
    name: 'Gold',
    price: '₦5,000,000+',
    period: 'per annum',
    platinum: false,
    icon: 'trophy',
    benefits: [
      'Prominent branding at NIQS national events',
      'Half-page advertisement in NIQS publications',
      'Logo on NIQS website partners page',
      'Exhibition space at the Annual Conference',
      'Access to NIQS CPD workshops for staff training',
      'VIP hospitality at NIQS events (5 seats)',
      'Bi-annual meetings with NIQS leadership',
    ],
  },
  {
    name: 'Silver',
    price: '₦2,000,000+',
    period: 'per annum',
    platinum: false,
    icon: 'award',
    benefits: [
      'Branding at selected NIQS events',
      'Quarter-page advertisement in NIQS Journal',
      'Logo on NIQS website partners page',
      'Complimentary conference registration (3 delegates)',
      'Newsletter mention to NIQS membership',
      'Certificate of Silver Partnership',
    ],
  },
];

/* ── Reusable logo block ───────────────────────────────── */
function LogoBlock({ partner, size = 'md' }) {
  const dim = size === 'lg' ? { h: 120, font: '2.2rem' } : { h: 90, font: '1.8rem' };
  return partner.logo ? (
    <div style={{ height: dim.h, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', padding: '1rem', borderBottom: '1px solid var(--color-bdr)' }}>
      <img src={partner.logo} alt={partner.name} style={{ maxHeight: dim.h - 24, maxWidth: '100%', objectFit: 'contain' }} />
    </div>
  ) : (
    <div style={{ height: dim.h, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,var(--color-off),var(--color-off-2,#eef2f7))', borderBottom: '1px solid var(--color-bdr)' }}>
      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: dim.font, color: 'var(--color-bdr)', opacity: .6 }}>{partner.name[0]}</span>
    </div>
  );
}

export default function Partnership() {
  const memberCopy = useMemberCopy();
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/partners')
      .then(res => {
        const data = res.data?.partners || res.data || [];
        setPartners(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const dbPlatinum = partners.filter(p => p.tier === 'platinum');
  const dbGold     = partners.filter(p => p.tier === 'gold');
  const dbOthers   = partners.filter(p => p.tier !== 'platinum' && p.tier !== 'gold');

  const platinum = dbPlatinum;
  const gold     = dbGold;
  const others   = dbOthers;
  const noPartnersYet = !loading && partners.length === 0;

  return (
    <>
      <PageHero
        label="Partner With Us"
        title="Strategic Partnerships"
        titleHighlight="Partnerships"
        backgroundImage="https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1400&q=80&fit=crop"
      />

      {/* ── Intro ── */}
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
          <div className="tc2">
            <div className="reveal">
              <div className="ey">Why Partner</div>
              <h2 className="sh">Partner with Nigeria's <em>Leading QS Body</em></h2>
              <p className="sd" style={{ marginBottom: '1.2rem' }}>
                The Nigerian Institute of Quantity Surveyors offers strategic partnership
                opportunities for organisations seeking to align with the leading professional
                body in construction cost management.
              </p>
              <p className="sd" style={{ marginBottom: '1.2rem' }}>
                With {memberCopy} members across 37 state chapters, NIQS provides unparalleled access to
                the quantity surveying profession in Nigeria and across West Africa.
              </p>
              <p className="sd" style={{ marginBottom: '2rem' }}>
                Whether you are a construction firm, financial institution, technology provider,
                or government agency, NIQS offers tailored packages to meet your objectives.
              </p>
              <Link to="/contact" className="btn bg">Enquire Now</Link>
            </div>
            <div className="reveal d1">
              <img
                src="https://images.unsplash.com/photo-1552664730-d307ca884978?w=700&q=80&fit=crop"
                alt="Partnership handshake"
                style={{ width: '100%', borderRadius: 14, objectFit: 'cover', border: '1px solid var(--color-bdr)' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* While partners are in flight every section below is gated off, so the
          page ended at the hero and then jumped to full height. Hold the space. */}
      {loading && (
        <section className="section-alt" aria-busy="true">
          <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
            <span className="sr-only">Loading partners…</span>
            <div style={{ maxWidth: 320, marginBottom: '2.5rem' }}>
              <SkeletonText lines={2} title />
            </div>
            <SkeletonGrid count={3} className="grid-3" />
          </div>
        </section>
      )}

      {/* ── No partners on file yet ── */}
      {noPartnersYet && (
        <section className="section-alt">
          <div className="ct" style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem' }}>
            <div className="ptn-cta">
              <div>
                <h3>Be Among the First Foundation Partners of NIQS</h3>
                <p>
                  Partner profiles will appear here as agreements are concluded. Organisations
                  interested in a partnership tier can speak to the National Secretariat today.
                </p>
              </div>
              <div className="ptn-cta-btns">
                <Link to="/contact" className="btn bp">Enquire Now</Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Platinum Partners ── */}
      {!loading && platinum.length > 0 && (
        <section className="section-alt">
          <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>

            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
              <div className="reveal">
                <div className="ey">Platinum Partners</div>
                <h2 className="sh" style={{ marginBottom: 0 }}>Our <em>Premier Partners</em></h2>
              </div>
            </div>

            {/* Platinum cards — .stagger cascades the reveal delay across however
                many partners come back, instead of the hand-numbered d1/d2 that
                left every card past the third arriving at once. */}
            <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {platinum.map((p, idx) => (
                <div
                  className="gpc reveal"
                  key={p._id || idx}
                  style={{ position: 'relative' }}
                >
                  {/* Logo panel */}
                  {p.logo ? (
                    <img src={p.logo} alt={p.name} className="gpimg" style={{ objectFit: 'contain', background: '#fff', padding: '1.5rem' }} />
                  ) : (
                    <div className="gpimg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f0f4fb, #e8edf6)', flexDirection: 'column', gap: '.5rem' }}>
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '2.8rem', color: 'var(--color-navy)', opacity: .18 }}>{p.name[0]}</span>
                      <span style={{ fontSize: '.65rem', fontWeight: 600, color: 'var(--color-txt-3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Logo</span>
                    </div>
                  )}
                  {/* Content */}
                  <div>
                    <span className="gpbadge"><Icon name="diamond" size="sm" /> Platinum Partner</span>
                    <h4>{p.name}</h4>
                    {p.industry && (
                      <div style={{ fontSize: '.78rem', color: 'var(--color-txt-3)', fontWeight: 600, marginBottom: '.6rem', letterSpacing: '.02em' }}>{p.industry}</div>
                    )}
                    {p.description && <p>{p.description}</p>}
                    {p._id
                      ? <Link to={`/partnership/${p._id}`} className="gpl">View full profile →</Link>
                      : <span style={{ fontSize: '.8rem', color: 'var(--color-txt-3)', fontStyle: 'italic' }}>Profile available once admin adds partner details</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Gold Partners ── */}
      {!loading && gold.length > 0 && (
        <section style={{ background: '#fff' }}>
          <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>

            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
              <div className="reveal">
                <div className="ey" style={{ color: 'var(--color-gold)' }}>Gold Partners</div>
                <h2 className="sh" style={{ marginBottom: 0 }}>Gold-Tier <em>Partners</em></h2>
              </div>
            </div>

            {/* Gold cards — 2-column featured grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.4rem' }}>
              {gold.map((p, idx) => {
                const tc = tierColors.gold;
                const card = (
                  <div
                    className="reveal"
                    style={{
                      
                      border: `1.5px solid ${tc}33`,
                      borderRadius: 14, overflow: 'hidden', background: '#fff',
                      boxShadow: '0 2px 8px rgba(0,0,0,.06)',
                      transition: 'box-shadow .25s, transform .25s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 28px rgba(217, 182, 80,.18)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.06)'; e.currentTarget.style.transform = ''; }}
                  >
                    {/* Gold top accent bar */}
                    <div style={{ height: 4, background: `linear-gradient(90deg, ${tc}, #e8c07a)` }} />


                    {/* Logo area */}
                    <LogoBlock partner={p} size="lg" />

                    {/* Body */}
                    <div style={{ padding: '1.25rem 1.4rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 20, fontSize: '.68rem', fontWeight: 700, background: `${tc}15`, color: tc, border: `1px solid ${tc}30`, marginBottom: '.7rem' }}>
                        <Icon name="trophy" size="sm" /> Gold Partner
                      </span>
                      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-navy)', marginBottom: '.3rem', letterSpacing: '-.02em' }}>
                        {p.name}
                      </div>
                      {p.industry && (
                        <div style={{ fontSize: '.78rem', color: 'var(--color-txt-3)', fontWeight: 600, marginBottom: '.8rem' }}>{p.industry}</div>
                      )}
                      {p.description && (
                        <p style={{ fontSize: '.84rem', color: 'var(--color-txt-2)', lineHeight: 1.7, marginBottom: '.9rem' }}>{p.description}</p>
                      )}
                      {p._id
                        ? <span style={{ fontSize: '.8rem', fontWeight: 700, color: tc }}>View profile →</span>
                        : <span style={{ fontSize: '.8rem', color: 'var(--color-txt-3)', fontStyle: 'italic' }}>Profile available once admin adds partner details</span>
                      }
                    </div>
                  </div>
                );
                return p._id
                  ? <Link key={p._id || idx} to={`/partnership/${p._id}`} style={{ textDecoration: 'none' }}>{card}</Link>
                  : <div key={idx}>{card}</div>;
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Silver / Bronze / Associate ── */}
      {!loading && others.length > 0 && (
        <section className="section-alt">
          <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
            <div style={{ marginBottom: '2.5rem' }}>
              <div className="ey reveal">Partner Network</div>
              <h2 className="sh reveal d1">Silver, Bronze <em>&amp; Associate Partners</em></h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.1rem' }}>
              {others.map((p, idx) => {
                const tc = tierColors[p.tier] || '#6b7280';
                const cardContent = (
                  <div
                    className="reveal"
                    style={{
                      
                      border: '1px solid var(--color-bdr)', borderRadius: 12,
                      overflow: 'hidden', background: '#fff',
                      boxShadow: '0 1px 4px rgba(0,0,0,.05)',
                      transition: 'box-shadow .2s, transform .2s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 6px 22px ${tc}22`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,.05)'; e.currentTarget.style.transform = ''; }}
                  >
                    <LogoBlock partner={p} />
                    <div style={{ padding: '.9rem 1rem' }}>
                      <span style={{ display: 'inline-block', marginBottom: '.45rem', padding: '2px 10px', borderRadius: 20, fontSize: '.65rem', fontWeight: 700, background: `${tc}15`, color: tc, textTransform: 'capitalize', border: `1px solid ${tc}28` }}>
                        {p.tier}
                      </span>
                      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '.95rem', color: 'var(--color-navy)', marginBottom: '.25rem' }}>{p.name}</div>
                      {p.industry && <div style={{ fontSize: '.76rem', color: 'var(--color-txt-3)' }}>{p.industry}</div>}
                    </div>
                  </div>
                );
                return p._id
                  ? <Link key={p._id} to={`/partnership/${p._id}`} style={{ textDecoration: 'none' }}>{cardContent}</Link>
                  : <div key={idx}>{cardContent}</div>;
              })}
            </div>

          </div>
        </section>
      )}

      {/* ── Partnership Tiers ── */}
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
          <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 3rem' }}>
            <div className="ey reveal" style={{ justifyContent: 'center' }}>Partnership Tiers</div>
            <h2 className="sh reveal d1">Choose Your <em>Partnership Level</em></h2>
            <p className="sd reveal d2" style={{ maxWidth: '100%' }}>
              Choose the tier that aligns with your organisation's goals and budget. All partners
              receive formal certification and exclusive benefits.
            </p>
          </div>

          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {tiers.map((tier, i) => (
              <div className={`ptcard${tier.platinum ? ' ptplat' : ''} reveal`} key={i} style={{ animationDelay: `${i * .08}s` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.2rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ color: 'var(--color-gold)' }}><Icon name={tier.icon} size="xl" /></div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.15rem', color: 'var(--color-navy)', letterSpacing: '-.03em' }}>{tier.name} Partner</div>
                      <div style={{ fontSize: '.72rem', color: 'var(--color-txt-3)' }}>{tier.period}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.4rem', color: tier.platinum ? 'var(--color-gold)' : 'var(--color-navy)', letterSpacing: '-.04em' }}>{tier.price}</div>
                    <Link to="/contact" className="btn bg" style={{ marginTop: '.5rem', padding: '6px 18px', fontSize: '.76rem' }}>Inquire</Link>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '.35rem' }}>
                  {tier.benefits.map((b, j) => (
                    <div key={j} style={{ display: 'flex', gap: '.5rem', alignItems: 'flex-start', fontSize: '.8rem', color: 'var(--color-txt-2)', lineHeight: 1.5 }}>
                      <span style={{ color: 'var(--color-gold)', fontWeight: 800, flexShrink: 0 }}><Icon name="check" size="sm" /></span>
                      {b}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="section-alt">
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
          <div className="ctaw">
            <h2>Become a <em>Strategic Partner</em></h2>
            <p>
              Interested in partnering with NIQS? Contact our partnerships team to discuss
              how your organisation can benefit from alignment with Nigeria's foremost QS body.
            </p>
            <div className="ctarow">
              <Link to="/contact" className="btn bg">Contact Us Today</Link>
              <a href="mailto:partnerships@niqs.org.ng" className="btn bo" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}>partnerships@niqs.org.ng</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
