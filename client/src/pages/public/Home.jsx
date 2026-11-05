import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import { AGREEMENT_COUNT } from '../../data/reciprocity';
import useChapterCount, { CHAPTERS_FALLBACK } from '../../hooks/useChapterCount';
import useEvents, { TYPE_LABEL } from '../../hooks/useEvents';
import { useMemberCopy } from '../../hooks/useMembershipStats';
import Icon from '../../components/common/Icon';
import { OUR_STORY, services, principles } from '../../data/institute';
import { sponsors } from '../../data/sponsors';

/* NIQS review, 4 Nov 2026 (Gloria Ifiorah): the Home page reads, in order,
   Who We Are, Vision / Mission / Value, three Professional Services, three
   Upcoming Events, the annual subscription notice, Sponsors & Partners, and
   ends on Ready to Join NIQS. News & Announcements and the President's quote
   came off the page; News keeps its own page. */
const HOME_SERVICES = 3;

/* Founding year, for the "years of excellence" tile — computed rather than typed
   so it does not quietly go stale each January. */
const FOUNDED = 1969;


/* The hero strip reads left to right as the story of the profession, as NIQS
   asked at the October 2026 review: the tools it started with, the Institute's
   home at the centre (the largest frame), and where the built environment is
   heading. The centre frame is the National Secretariat, QS J. Segun
   Ajanlekoko House, Abuja: the "Homepage picture" the Secretariat supplied
   on 4 Nov 2026. */
const heroImages = [
  { src: 'https://images.unsplash.com/photo-1559819614-8e87b90b8e9b?w=600&q=80&fit=crop', alt: 'Slide rule — measurement before the calculator' },
  { src: 'https://images.unsplash.com/photo-1648201637025-1c77b9be3013?w=600&q=80&fit=crop', alt: 'Calculator and handwritten workings' },
  { src: '/hero/niqs-secretariat-abuja.jpg', alt: 'QS J. Segun Ajanlekoko House, NIQS National Secretariat, Abuja', badge: 'NIQS National Secretariat' },
  { src: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80&fit=crop', alt: 'Digital cost planning on screen' },
  { src: 'https://images.unsplash.com/photo-1713643957213-4a6acc242563?w=600&q=80&fit=crop', alt: 'Twisting high-rise towers — the built environment ahead' },
];

/* ── helpers ── */
function dayNum(d) { try { return new Date(d).getDate(); } catch { return ''; } }
function monthYear(d) {
  try { return new Date(d).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' }); } catch { return ''; }
}

export default function Home() {
  /* The hero opens on the content block alone — logo, headline, subtitle,
     buttons — centred in the viewport. The first scroll of the session eases
     the fan strip up into the hero, and the growing strip pushes the content
     block up as flex redistributes the space. Scrolling back to the very top
     folds it away again.

     Hysteresis on purpose: it opens at 24px so a stray wheel tick does not
     trigger it, and only closes back at 4px so the reader has to actually
     return to the top rather than hover near it and watch it flicker. */
  const [heroOpen, setHeroOpen] = useState(
    () => window.scrollY > 24 || window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  /* News, events and the ticker read the same hooks as the News and Events
     pages, so a snippet here is always the first few items of the page it links
     to (October 2026 review). No placeholders: the old fallbacks were 2025
     notices and events that read as current whenever the API was slow or empty,
     and that the pages themselves never carried. */
  /* The homepage spotlight: three slots each for news and events. What the
     Secretariat marks Featured in admin comes first; empty slots fall back to
     the latest news and the next events, so the sections never sit half empty.
     Every item shown is also on its own page, unchanged. */
  const { upcoming, spotlight: events } = useEvents();
  const [bannerItems, setBannerItems] = useState([]);
  const tickerItems = [
    ...bannerItems,
    ...upcoming.slice(0, 5).map(e => {
      const d = new Date(e.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${e.title} — ${d}${e.location ? ` · ${e.location}` : ''}`;
    }),
  ];

  /* Public pages quote the size of the Institute only as a rounded figure
     ("14,000+"), never the exact register count — NIQS confirmed this at the
     October 2026 review. The detailed breakdown (and the Fellows count) is
     members-only now, in the portal. */
  const memberCopy = useMemberCopy();
  const chapterCount = useChapterCount();

  useEffect(() => {
    /* Reduced motion holds the fold open in the stylesheet, so leave the state
       open too — otherwise `inert` would hide visible content from a screen
       reader until the reader happened to scroll. */
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const onScroll = () => {
      const y = window.scrollY;
      setHeroOpen(open => (open ? y > 4 : y > 24));
    };
    onScroll();   // catch a scroll that landed between first render and mount
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // Announcements typed in Admin → Site Settings; upcoming events follow them.
    API.get('/site-settings')
      .then(res => setBannerItems(Array.isArray(res.data?.bannerItems) ? res.data.bannerItems : []))
      .catch(() => {});
  }, []);

  return (
    <>
      {/* ── TICKER ── Hidden when there is nothing current to announce, rather
          than scrolling stale notices. */}
      {tickerItems.length > 0 && (
      <div className="tkbar" id="tkbar">
        <span className="tklbl">Live</span>
        <div className="tkwrap">
          <div className="ticker">
            {/* duplicate items for seamless loop */}
            {[...tickerItems, ...tickerItems].map((t, i) => (
              <span className="ti" key={i}>
                <span className="td">&#9670;</span> {t}
              </span>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* ── HERO ── */}
      <div className={`hero${heroOpen ? ' is-open' : ''}`} id="heroWrap">
        {/* Centred content */}
        <div className="hc">
          {/* The Institute named itself here in type, directly above the
              headline. Richard asked for the mark instead (2026-08-07) — the
              official lockup says the same thing and says it in the brand's
              own letterforms. Dark-BG variant: the hero is navy. */}
          <img
            className="hc-institute-logo"
            src="/brand/lockup-horizontal-dark.png"
            alt="Nigerian Institute of Quantity Surveyors"
          />
          <h1 className="hc-title">
            Advancing Nigeria's<br />Built <em>Environment</em>
          </h1>
          <p className="hc-sub">
            The premier professional body for quantity surveying in Nigeria — setting the gold standard for construction cost management, procurement, and contract administration across {memberCopy} professionals in every state.
          </p>
          {/* Order and emphasis are the mockup's, confirmed 2026-08-12: Learn More
              leads and carries the filled treatment, membership follows as the
              outlined one. Note this demotes the Institute's own conversion CTA —
              a deliberate call, not an oversight. */}
          <div className="hc-btns">
            <Link to="/about" className="hc-btn-p">
              Learn More
            </Link>
            <Link to="/membership" className="hc-btn-s">
              Become a Member
            </Link>
          </div>
        </div>

        {/* The fold. Zero-height until the first scroll, so the content block
            above sits centred in an uncluttered hero on arrival; opening it
            grows real layout height, which is what lifts that block. Marked
            inert while shut — it is not merely transparent, it is not there
            yet, and neither a screen reader nor a Tab press should find it. */}
        <div className="hero-fold" aria-hidden={!heroOpen}>
          <div className="hero-fold-inner" {...(heroOpen ? {} : { inert: '' })}>
            {/* Image strip */}
            <div className="hstrip">
              {heroImages.map((img, i) => (
                <div className={`hstrip-img${img.src ? '' : ' hstrip-img--crest'}`} key={i}>
                  {img.src ? (
                    <img src={img.src} alt={img.alt} loading={i < 3 ? 'eager' : 'lazy'} />
                  ) : (
                    <img src="/brand/emblem-light.png" alt={img.alt} />
                  )}
                  {img.badge && <div className="hstrip-badge"><Icon name="institution" size="sm" /> {img.badge}</div>}
                </div>
              ))}
            </div>

            {/* Stat bar. Every tile is derived — from the chapter records, the
                reciprocity list, or the founding year. Nothing here is a number
                typed into the markup. Members shows the rounded figure only; the exact
                count and the Fellows tile went to the portal at the October 2026 review. */}
            <div className="hstat-row">
              <div className="hstat">
                <div className="hstat-n">{memberCopy}</div>
                <div className="hstat-l">Members</div>
              </div>
              <div className="hstat">
                <div className="hstat-n">{chapterCount ?? CHAPTERS_FALLBACK}</div>
                <div className="hstat-l">State Chapters</div>
              </div>
              <div className="hstat">
                <div className="hstat-n">{new Date().getFullYear() - FOUNDED}</div>
                <div className="hstat-l">Years of Excellence</div>
              </div>
              <div className="hstat">
                <div className="hstat-n">{AGREEMENT_COUNT}</div>
                <div className="hstat-l">International Agreements</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── WHO WE ARE ── The first paragraph of About's "Our Story", word for
          word, and a link to the rest (4 Nov 2026). */}
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '3rem' }}>
          <div className="home-who">
            <div className="ey">Who We Are</div>
            <h2 className="sh">Shaping Nigeria's <em>Built Environment</em> Since 1969</h2>
            <p className="sd" style={{ maxWidth: '100%' }}>{OUR_STORY[0]}</p>
            <Link to="/about" className="btn bo">Read More About NIQS &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ── VISION / MISSION / VALUE ── Word for word from the previous NIQS
          website (data/institute.js). "Principles That Guide Us" came off the
          heading on 4 Nov 2026. */}
      <section style={{ background: 'var(--color-off)' }}>
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
          <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 3rem' }}>
            <h2 className="sh">Our Vision, Mission <em>&amp; Value</em></h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {principles.map((p, i) => (
              <div
                key={i}
                className={`reveal d${i + 1}`}
                style={{
                  background: i === 1
                    ? 'linear-gradient(145deg, var(--color-navy), var(--color-navy-3, #2828BE))'
                    : '#fff',
                  borderRadius: 18,
                  padding: '2.2rem 2rem',
                  border: i === 1 ? 'none' : '1px solid var(--color-bdr)',
                  boxShadow: i === 1 ? '0 12px 40px rgba(0, 0, 102,.22)' : '0 2px 12px rgba(0, 0, 102,.06)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {i === 1 && (
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
                )}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, var(--color-gold), var(--color-gold-2, #E5C56A))', borderRadius: '18px 18px 0 0' }} />
                <div style={{ marginBottom: '1.2rem', position: 'relative', color: 'var(--color-gold)' }}><Icon name={p.icon} size="xl" /></div>
                <div style={{ fontSize: '.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--color-gold)', marginBottom: '.5rem', position: 'relative' }}>{p.label}</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.35rem', color: i === 1 ? '#fff' : 'var(--color-navy)', marginBottom: '1rem', letterSpacing: '-.025em', lineHeight: 1.2, position: 'relative' }}>{p.title}</div>
                <p style={{ fontSize: '1rem', color: i === 1 ? 'rgba(255,255,255,.82)' : 'var(--color-txt-2)', lineHeight: 1.8, margin: 0, position: 'relative' }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ── Three of the Institute's list; the full list is on About. */}
      <section style={{ background: '#fff' }}>
        <div className="ct">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div className="ey">What We Do</div>
              <h2 className="sh" style={{ marginBottom: 0 }}>Professional <em>Services</em></h2>
            </div>
            <Link to="/about#services" className="btn bo">All Professional Services &rarr;</Link>
          </div>
          <div className="svc-grid">
            {services.slice(0, HOME_SERVICES).map((s, i) => (
              <div className={`svc reveal${i ? ` d${i}` : ''}`} key={i}>
                <div className="svc-ico"><Icon name={s.icon} size="lg" /></div>
                <div className="svc-t">{s.title}</div>
                <div className="svc-d">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EVENTS ── Three: what the Secretariat marks Featured in admin comes
          first, then the next events (hooks/useEvents.js spotlight). */}
      <section style={{ background: 'var(--color-off)' }}>
        <div className="ct">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div className="ey">Calendar</div>
              <h2 className="sh" style={{ marginBottom: 0 }}>
                Upcoming <em>Events</em>
              </h2>
            </div>
            <Link to="/events" className="btn bo">All Upcoming Events &rarr;</Link>
          </div>
          {events.length === 0 && (
            <p className="sd" style={{ margin: 0 }}>
              New events will be announced here. See the <Link to="/events">events page</Link> for past programmes.
            </p>
          )}
          <div className="evtl">
            {events.slice(0, 3).map((e, i) => (
              <Link
                to="/events"
                className={`erow reveal d${i + 1}`}
                key={e._id}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div>
                  <div className="eday">{dayNum(e.date)}</div>
                  <div className="emon">{monthYear(e.date)}</div>
                </div>
                <div className="einfo">
                  <h4>{e.title}</h4>
                  <p><Icon name="location" size="sm" /> {e.location}{e.time ? `  ·  ${e.time}` : ''}</p>
                </div>
                <span className="epill">{TYPE_LABEL[e.type] || e.type}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── ANNUAL SUBSCRIPTION ── The Treasurer's flyer and write-up, word for
          word ("Write up for flyer.docx", 4 Nov 2026). */}
      <section style={{ background: '#fff' }} aria-labelledby="sub-h">
        <div className="ct">
          <div className="sub-note">
            <a href="/flyers/niqs-2027-subscription.jpg" target="_blank" rel="noopener noreferrer" className="sub-flyer">
              <img src="/flyers/niqs-2027-subscription.jpg" alt="NIQS 2027 annual membership subscription: payment by web portal, bank transfer or ATM card" loading="lazy" />
            </a>
            <div>
              <div className="ey">Members</div>
              <h2 className="sh" id="sub-h">2027 Annual Subscription <em>Payment</em></h2>
              <p className="sd" style={{ maxWidth: '100%' }}>
                Please see the attached flyer for full details regarding your 2027 annual subscription. For your
                convenience, you can easily make your payment using any of the three methods below:
              </p>
              <ol className="sub-steps">
                <li>
                  <strong>Online Web Portal</strong> &ndash;{' '}
                  <a href="https://portal.niqsng.org/" target="_blank" rel="noopener noreferrer">Click Here to Pay Online</a>.
                  Simply log in using your Membership Number and Password. Having trouble logging in? Click on
                  &ldquo;Forgot Password&rdquo; on the portal page to reset your credentials.
                </li>
                <li>
                  <strong>Direct Bank Transfer</strong> &ndash; You can make a direct deposit or transfer to the
                  Institute&rsquo;s official account:
                  <dl className="sub-acct">
                    <dt>Account Name</dt><dd>Nigerian Institute of Quantity Surveyors</dd>
                    <dt>Bank</dt><dd>First Bank Plc</dd>
                    <dt>Account Number</dt><dd>1000052178</dd>
                  </dl>
                  <em>Important:</em> To help us update your records promptly, please forward your payment receipt
                  or evidence of transfer to <a href="mailto:finance@niqs.org.ng">finance@niqs.org.ng</a>.
                </li>
                <li>
                  <strong>In-Person at NIQS Offices</strong> &ndash; Visit any of our offices (Abuja or Lagos) to pay
                  seamlessly via POS using your ATM card.
                </li>
              </ol>
              <p className="sd" style={{ maxWidth: '100%', marginBottom: 0 }}>
                Thank you for your continued commitment to the Institute.<br />&mdash; Treasurer
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SPONSORS & PARTNERS ── Small logos, each linking to the company's own
          site, then the call to partner (4 Nov 2026; data/sponsors.js). */}
      <section className="ptn-strip" aria-labelledby="ptn-strip-h">
        <div className="ct">
          <div className="ptn-strip-head" style={{ justifyContent: 'center', textAlign: 'center' }}>
            <div>
              <div className="ey" style={{ justifyContent: 'center' }}>Sponsors &amp; Partners</div>
              <h2 className="sh" id="ptn-strip-h" style={{ marginBottom: 0 }}>Our Sponsors <em>&amp; Partners</em></h2>
            </div>
          </div>
          <div className="spn-logos">
            {sponsors.map(p => (p.url ? (
              <a key={p.name} href={p.url} target="_blank" rel="noopener noreferrer" className="spn-logo" title={p.name}>
                <img src={p.logo} alt={p.name} loading="lazy" />
              </a>
            ) : (
              <span key={p.name} className="spn-logo" title={p.name}>
                <img src={p.logo} alt={p.name} loading="lazy" />
              </span>
            )))}
          </div>
          <div className="spn-cta">
            <h3>Partner With <em>NIQS</em></h3>
            <Link to="/partnership" className="btn bp">View Partnership Opportunities &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: '#fff' }}>
        <div className="ct">
          <div className="ctaw">
            <h2>Ready to Join <em>NIQS?</em></h2>
            <p>Join {memberCopy} professionals and unlock examinations, CPD, networking, and career growth across Nigeria and beyond.</p>
            <div className="ctarow">
              <Link to="/membership" className="btn bg">Apply for Membership</Link>
              <Link
                to="/contact"
                className="btn"
                style={{ background: 'rgba(255,255,255,.12)', color: '#fff', border: '1.5px solid rgba(255,255,255,.25)' }}
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
