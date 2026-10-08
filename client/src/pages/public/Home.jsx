import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../api/axios';
import { AGREEMENT_COUNT } from '../../data/reciprocity';
import useChapterCount, { CHAPTERS_FALLBACK } from '../../hooks/useChapterCount';
import { useMemberCopy } from '../../hooks/useMembershipStats';
import Icon from '../../components/common/Icon';

/* Founding year, for the "years of excellence" tile — computed rather than typed
   so it does not quietly go stale each January. */
const FOUNDED = 1969;

/* ── fallback data ── */
const fallbackNews = [
  {
    _id: '1', slug: 'begm-2025-notice', title: 'BEGM 2025 Notice: Registration Now Open',
    excerpt: 'The Board of Examiners invites qualified members to register before the 28 February 2025 deadline.',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80&fit=crop',
    date: '2025-02-10', category: 'Announcement',
  },
  {
    _id: '2', slug: '2025-exam-schedule', title: '2025 Professional Examination Schedule Released',
    excerpt: 'TPC and GDE examinations slated for March 2025. Check portal for timetable and centre assignments.',
    image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&q=80&fit=crop',
    date: '2025-01-28', category: 'Examinations',
  },
  {
    _id: '3', slug: 'corporate-members-oct-2025', title: 'Corporate Financial Members List — October 2025',
    excerpt: 'Official list of corporate members in good financial standing as at 24th October 2025 now available.',
    image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80&fit=crop',
    date: '2025-10-24', category: 'Membership',
  },
];

const services = [
  { icon: 'costManagement', title: 'Cost Management', desc: 'Comprehensive building economics and cost planning for capital projects of all scales, from pre-design through to final account.', tag: 'Core' },
  { icon: 'procurement', title: 'Procurement Advice', desc: 'Strategic procurement route selection and contract administration that aligns client objectives with project risk profiles.', tag: 'Core' },
  { icon: 'contract', title: 'Contract Administration', desc: 'Professional oversight of valuations, variations, claims, and final accounts — ensuring fair dealing for all parties.', tag: 'Core' },
  { icon: 'chart', title: 'Project Monitoring', desc: 'Independent assessment of project progress and expenditure — providing clients with objective reporting and early warning of overruns.' },
  { icon: 'education', title: 'Professional Examinations', desc: 'NIQS administers rigorous entry and upgrade examinations that uphold the standard expected of all corporate members.' },
  { icon: 'web', title: 'International Engagement', desc: 'Through reciprocity agreements with leading QS bodies worldwide, NIQS members enjoy access to global recognition.' },
];

const defaultTickerItems = [
  'BEGM 2025 Notice — Registration now open for qualified members',
  '2025 Professional Examinations — TPC/GDE slated for March 2025',
  'Corporate Financial Members List as at 24th October 2025',
  'Erasure of Fees Defaulting Members — Important Notice',
  'Criteria for Mature & Experience Routes to Membership',
  'Brand Materials — Download the official NIQS brand kit',
];

/* The hero strip reads left to right as the story of the profession, as NIQS
   asked at the October 2026 review: the tools it started with, the Institute's
   home today at the centre (the largest frame), and where the built environment
   is heading. The centre frame has no photograph yet — until the Secretariat
   supplies one of the National Secretariat building, it renders as a crest card
   rather than a stock picture standing in for the Institute's own house. Drop
   the photo in /public/hero/ and set `src` to switch it over. */
const heroImages = [
  { src: 'https://images.unsplash.com/photo-1559819614-8e87b90b8e9b?w=600&q=80&fit=crop', alt: 'Slide rule — measurement before the calculator' },
  { src: 'https://images.unsplash.com/photo-1648201637025-1c77b9be3013?w=600&q=80&fit=crop', alt: 'Calculator and handwritten workings' },
  { src: null, alt: 'QS Olusegun Ajanlekoko House, NIQS National Secretariat, Abuja', badge: 'NIQS National Secretariat' },
  { src: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80&fit=crop', alt: 'Digital cost planning on screen' },
  { src: 'https://images.unsplash.com/photo-1713643957213-4a6acc242563?w=600&q=80&fit=crop', alt: 'Twisting high-rise towers — the built environment ahead' },
];

/* ── helpers ── */
const TIER_ORDER = ['platinum', 'gold', 'silver', 'bronze', 'associate'];
function tierRank(tier) {
  const i = TIER_ORDER.indexOf(String(tier || '').toLowerCase());
  return i === -1 ? TIER_ORDER.length : i;
}
function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return d; }
}
function dayNum(d) { try { return new Date(d).getDate(); } catch { return ''; } }
function monthYear(d) {
  try { return new Date(d).toLocaleDateString('en-NG', { month: 'short', year: 'numeric' }); } catch { return ''; }
}

const principles = [
  {
    icon: 'eye',
    label: 'Our Vision',
    title: 'Total Cost & Procurement Management',
    body: "To be the profession in Nigeria responsible for total cost and procurement management, for the achievement of client's objectives in all types of capital projects and developments, in all sectors of the economy.",
  },
  {
    icon: 'target',
    label: 'Our Mission',
    title: 'Advancing the Profession',
    body: 'Contributing to sustainable development of Nigeria by promoting the patronage of our world-class construction cost services and procurement management experts that meet client needs and expectations.',
  },
  {
    icon: 'advocacy',
    label: 'Our Values',
    title: 'Integrity & Excellence',
    body: 'Integrity, professionalism, innovation, inclusiveness, and service. These are the values that guide every NIQS member and every programme we deliver.',
  },
];

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

  const [news, setNews] = useState(fallbackNews);
  /* No placeholder events. The old fallback list was three 2025 events that
     showed up as "upcoming" whenever the API was slow — a calendar is the one
     place where demo content reads as fact. Empty until real events arrive. */
  const [events, setEvents] = useState([]);
  const [hasUpcoming, setHasUpcoming] = useState(true);
  const [partners, setPartners] = useState([]);
  const [tickerItems, setTickerItems] = useState(defaultTickerItems);

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
    API.get('/news?limit=3').then(res => {
      const data = res.data?.news || res.data?.data || res.data;
      if (Array.isArray(data) && data.length) setNews(data);
    }).catch(() => {});

    /* Prefer upcoming events; when none are scheduled, show the most recent
       ones instead of demo placeholders. The endpoint returns { events, total,
       page, pages }. */
    const unwrapEvents = (res) => res.data?.events || res.data?.data || res.data || [];
    API.get('/events?limit=3&upcoming=true').then(res => {
      const data = unwrapEvents(res);
      if (data.length) {
        setEvents(data);
        setHasUpcoming(true);
      } else {
        return API.get('/events?limit=3').then(r => {
          const recent = unwrapEvents(r);
          if (recent.length) {
            setEvents(recent);
            setHasUpcoming(false);
          }
        });
      }
    }).catch(() => {});

    /* Every tier, not just platinum: the strip sits directly under the hero and
       NIQS wants partnership seen by everyone who lands here. Highest tier first. */
    API.get('/partners?limit=12').then(res => {
      const data = res.data?.partners || res.data || [];
      if (!Array.isArray(data)) return;
      setPartners([...data].sort((a, b) => tierRank(a.tier) - tierRank(b.tier)).slice(0, 8));
    }).catch(() => {});

    // Load dynamic banner: site settings + upcoming events auto-appended
    Promise.all([
      API.get('/site-settings').catch(() => ({ data: {} })),
      API.get('/events?upcoming=true&limit=10').catch(() => ({ data: [] })),
    ]).then(([settingsRes, eventsRes]) => {
      const customItems = Array.isArray(settingsRes.data?.bannerItems) ? settingsRes.data.bannerItems : [];
      const rawEvts = eventsRes.data?.events ?? eventsRes.data?.data ?? eventsRes.data;
      const upcomingEvts = Array.isArray(rawEvts) ? rawEvts : [];

      // Build event ticker entries for future events
      const eventItems = upcomingEvts
        .filter(e => e.date && new Date(e.date) >= new Date())
        .slice(0, 5)
        .map(e => {
          const d = new Date(e.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
          return `${e.title} — ${d}${e.location ? ` · ${e.location}` : ''}`;
        });

      const merged = [...customItems, ...eventItems];
      if (merged.length > 0) setTickerItems(merged);
    });
  }, []);

  return (
    <>
      {/* ── TICKER ── */}
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

      {/* ── PARTNERS ──
          Directly under the hero since the October 2026 review: NIQS wanted its
          partners visible in position as well as in look, not near the foot of
          the page. A logo strip once partners are on file; until then, the call
          for partners keeps the space working rather than leaving a gap. */}
      <section className="ptn-strip" aria-labelledby="ptn-strip-h">
        <div className="ct">
          <div className="ptn-strip-head">
            <div>
              <div className="ey">Our Partners</div>
              <h2 className="sh" id="ptn-strip-h" style={{ marginBottom: 0 }}>
                {partners.length > 0 ? <>Building With <em>NIQS</em></> : <>Partner With <em>NIQS</em></>}
              </h2>
            </div>
            <Link to="/partnership" className="btn bo">
              {partners.length > 0 ? 'All Partners →' : 'Partnership Opportunities →'}
            </Link>
          </div>

          {partners.length > 0 ? (
            <div className="ptn-logos">
              {partners.map(p => (
                <Link key={p._id} to={`/partnership/${p._id}`} className="ptn-logo" title={p.name}>
                  {p.logo
                    ? <img src={p.logo} alt={p.name} loading="lazy" />
                    : <span className="ptn-logo-name">{p.name}</span>}
                </Link>
              ))}
            </div>
          ) : (
            <div className="ptn-cta">
              <div>
                <h3>Become a Foundation Partner of the New NIQS</h3>
                <p>
                  NIQS is opening its platform to organisations committed to raising the bar in
                  Nigeria's construction industry. Partner with the home of {memberCopy} quantity
                  surveyors and put your brand before the industry's decision-makers.
                </p>
              </div>
              <div className="ptn-cta-btns">
                <Link to="/partnership" className="btn bp">Explore Partnership Tiers</Link>
                <Link to="/contact" className="btn bo" style={{ borderColor: 'rgba(255,255,255,.4)', color: '#fff' }}>Contact the Secretariat</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── VISION / MISSION / VALUES ── */}
      <section style={{ background: 'var(--color-off)' }}>
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
          <div style={{ textAlign: 'center', maxWidth: 560, margin: '0 auto 3rem' }}>
            <div className="ey" style={{ justifyContent: 'center' }}>Who We Are</div>
            <h2 className="sh">Principles That <em>Guide Us</em></h2>
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
                {/* subtle grid texture on navy card */}
                {i === 1 && (
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
                )}
                {/* gold accent line on top */}
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

      {/* ── SERVICES ── */}
      <section style={{ background: '#fff' }}>
        <div className="ct">
          <div className="ey">What We Do</div>
          <h2 className="sh">Professional Services &amp; <em>Standards</em></h2>
          <p className="sd">
            NIQS promotes, represents and advances quantity surveying practice in Nigeria — from cost planning to procurement, across all sectors of the built environment.
          </p>
          <div className="svc-grid">
            {services.map((s, i) => (
              <div className={`svc reveal${i > 0 ? ` d${i}` : ''}`} key={i}>
                {s.tag && <span className="svc-tag">{s.tag}</span>}
                <div className="svc-ico"><Icon name={s.icon} size="lg" /></div>
                <div className="svc-t">{s.title}</div>
                <div className="svc-d">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── NEWS ── */}
      <section style={{ background: 'var(--color-off)' }}>
        <div className="ct">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div className="ey">Latest</div>
              <h2 className="sh" style={{ marginBottom: 0 }}>News &amp; <em>Announcements</em></h2>
            </div>
            <Link to="/news" className="btn bo">View All &rarr;</Link>
          </div>
          <div className="tc3">
            {news.map((n, i) => (
              <Link
                to={`/news/${n.slug}`}
                className={`card reveal${i > 0 ? ` d${i}` : ''}`}
                key={n._id}
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="card-img-wrap">
                  <img
                    className="card-img"
                    src={n.image || 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&q=80&fit=crop'}
                    alt={n.title}
                  />
                </div>
                <div className="card-body">
                  <div className="card-tag">{n.category || 'News'}</div>
                  <div className="card-title">{n.title}</div>
                  <div className="card-text">{n.excerpt}</div>
                  <div className="card-date">{fmtDate(n.date || n.createdAt)}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── EVENTS ── */}
      <section style={{ background: '#fff' }}>
        <div className="ct">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div className="ey">Calendar</div>
              <h2 className="sh" style={{ marginBottom: 0 }}>
                {hasUpcoming ? <>Upcoming <em>Events</em></> : <>Recent <em>Events</em></>}
              </h2>
            </div>
            <Link to="/events" className="btn bo">Full Calendar &rarr;</Link>
          </div>
          {events.length === 0 && (
            <p className="sd" style={{ margin: 0 }}>
              New events will be announced here. See the <Link to="/events">full calendar</Link> for past programmes.
            </p>
          )}
          <div className="evtl">
            {events.map((e, i) => (
              /* Was `/events/${e.slug}`. Events have no slug field — the model
                 never had one — so this produced /events/undefined on every row,
                 and there is no /events/:id route to catch it either. Every event
                 on the homepage led to the 404 page. Goes to the calendar, which
                 is the page that actually exists; the Register action lives
                 there, per event. */
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
                  <p><Icon name="location" size="sm" /> {e.location}{e.time ? ` \u00A0\u00B7\u00A0 ${e.time}` : ''}</p>
                </div>
                <span className="epill">{e.type}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUOTE ── */}
      <section style={{ background: '#fff', padding: '4rem 0' }}>
        <div className="ct">
          <div className="qblock">
            <div className="qtext">
              &ldquo;The Nigerian Institute of Quantity Surveyors remains committed to producing world-class professionals who will drive the sustainable development of our nation&rsquo;s built environment.&rdquo;
            </div>
            <div className="qattr">— The President, Nigerian Institute of Quantity Surveyors</div>
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
