import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../../components/common/PageHero';
import LeaderCard from '../../components/common/LeaderCard';
import BodyContact from '../../components/common/BodyContact';
import API from '../../api/axios';
import useChapterCount, { CHAPTERS_FALLBACK } from '../../hooks/useChapterCount';
import Icon from '../../components/common/Icon';

const offerings = [
  { icon: 'mentorship', title: 'Mentorship Programme',  desc: 'Pairing young QS professionals with experienced Fellows for career guidance, knowledge transfer, and professional development.',                        tag: 'Mentorship'  },
  { icon: 'technology', title: 'Tech & Innovation',       desc: 'Workshops on BIM, cost estimation software, AI in construction, and digital tools transforming the QS profession.',                                  tag: 'Technology'  },
  { icon: 'trophy', title: 'Young QS Awards',          desc: 'Annual awards recognising outstanding contributions by young quantity surveyors to the profession and community.',                                    tag: 'Awards'      },
  { icon: 'web', title: 'Networking Events',        desc: 'Regular meetups, social events, and conferences designed to build connections among young professionals nationwide.',                                 tag: 'Networking'  },
  { icon: 'book', title: 'Exam Preparation',         desc: 'Study groups, mock exams, and revision workshops to help aspiring QS professionals pass the TPC and professional exams.',                           tag: 'Exams'       },
  { icon: 'international', title: 'International Exposure',  desc: 'Opportunities to participate in international QS conferences, exchange programmes, and collaborative projects.',                                      tag: 'Global'      },
];

/* Placeholder defaults — replaced by admin-set values once loaded */
const DEFAULTS = { cpdEvents: '40', totalAwards: '10+' };

export default function YQSF() {
  const [cpdEvents,    setCpdEvents]    = useState(DEFAULTS.cpdEvents);
  const [totalAwards,  setTotalAwards]  = useState(DEFAULTS.totalAwards);
  const [under40,      setUnder40]      = useState('');
  const [liveYoung,    setLiveYoung]    = useState(null);
  const [council, setCouncil] = useState([]);
  const chapterCount = useChapterCount();

  /* The Chairman heads the council and also sits on the NEC. His council record
     is the one to show here — same portrait treatment as the rest of the EC. */
  const chair = council.find(m => (m.title || '').toLowerCase() === 'chairman') || null;

  useEffect(() => {
    API.get('/site-settings')
      .then(res => {
        if (res.data?.yqsfCpdEvents)   setCpdEvents(res.data.yqsfCpdEvents);
        if (res.data?.yqsfTotalAwards) setTotalAwards(res.data.yqsfTotalAwards);
        if (res.data?.yqsfUnder40Count) setUnder40(res.data.yqsfUnder40Count);
      })
      .catch(() => {});

    /* 503 while the statistics key is unloaded, which is the designed path: the
       tile simply falls back to the hand-set figure, or a dash. */
    API.get('/stats/membership')
      .then(res => { if (res.data?.young_members) setLiveYoung(res.data.young_members); })
      .catch(() => {});

    API.get('/exco?scope=yqsf')
      .then(res => {
        const data = res.data?.exco || res.data?.data || res.data;
        if (Array.isArray(data) && data.length) {
          setCouncil(data.filter(m => m.isActive !== false));
          return;
        }
        throw new Error('empty');
      })
      /* Before the forum's own EC was published the page borrowed the Chairman
         from the NEC. Keep that as the fallback so the section never empties. */
      .catch(() => API.get('/exco?scope=national')
        .then(res => {
          const data = res.data?.exco || res.data?.data || res.data;
          if (!Array.isArray(data)) return;
          const found = data.find(m => (m.title || '').toUpperCase().includes('YQSF'));
          if (found) setCouncil([{ ...found, title: 'Chairman' }]);
        })
        .catch(() => {}));
  }, []);

  /* Young members. The register aggregates at under 40 and YQSF eligibility is
     under 40 — which is the bracket the register already publishes, so this is a
     true count of the forum's population rather than a stand-in for it.

     The tile is still labelled from the figure's own age_limit rather than from
     a hardcoded number, so if the register is ever re-aggregated the count and
     the caption move together with no change here.

     A figure the secretariat has typed into site settings still wins: that one
     is the forum's own roll, not an aggregate that happens to share its bracket. */
  const young = liveYoung && !under40
    ? { n: liveYoung.count.toLocaleString(), l: `Registered QS Under ${liveYoung.age_limit}` }
    : { n: under40 || '—', l: 'Registered QS Under 40' };

  const stats = [
    young,
    { n: chapterCount ?? CHAPTERS_FALLBACK, l: 'State Chapters' },
    { n: cpdEvents,      l: 'CPD Events/Year' },
    { n: totalAwards,    l: 'Total Awards' },
  ];

  return (
    <>
      <PageHero
        label="Young Professionals"
        title="Young Quantity Surveyors Forum"
        titleHighlight="Quantity Surveyors"
        backgroundImage="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1400&q=80&fit=crop"
      />

      {/* About */}
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
          <div className="tc2">
            <div>
              <div className="ey">About the Forum</div>
              <h2 className="sh">Empowering the Next Generation of <em>QS Professionals</em></h2>
              <p className="sd" style={{ marginBottom: '1.2rem' }}>
                The Young Quantity Surveyors Forum (YQSF) is a dedicated platform within NIQS for
                quantity surveyors under the age of 40 or those within their first ten years of
                professional practice.
              </p>
              <p className="sd" style={{ marginBottom: '1.2rem' }}>
                YQSF serves as a bridge between academic training and professional practice,
                providing mentorship, networking opportunities, and career development resources
                for its members.
              </p>
              <p className="sd" style={{ marginBottom: '2rem' }}>
                Through the YQSF, NIQS ensures that the profession remains vibrant, innovative,
                and attractive to young Nigerians, while preparing the next generation of leaders.
              </p>
              <Link to="/membership" className="btn bg">Join the Forum</Link>
            </div>
            <div>
              <img
                src={chair?.image || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=700&q=80&fit=crop'}
                alt={chair ? chair.name : 'Young QS professionals'}
                style={{ width: '100%', borderRadius: 14, objectFit: 'cover', objectPosition: 'center 20%', maxHeight: 420, border: '1px solid var(--color-bdr)' }}
              />
              {chair && (
                <div style={{ marginTop: '.8rem', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '.95rem', color: 'var(--color-navy)' }}>{chair.name}</div>
                  <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--color-gold)', letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 2 }}>{chair.title}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Leadership */}
      {council.length > 0 && (
        <section style={{ background: 'var(--color-off)' }}>
          <div className="ct" style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem' }}>
            <div style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 2rem' }}>
              <div className="ey" style={{ justifyContent: 'center' }}>Leadership</div>
              <h2 className="sh" style={{ textAlign: 'center' }}>
                {council.length > 1
                  ? <>The <em>Executive Council</em></>
                  : <>Meet the <em>Chairman</em></>}
              </h2>
              <p className="sd" style={{ maxWidth: '100%', textAlign: 'center' }}>
                {council.length > 1
                  ? 'The YQSF is led nationally by its Chairman — who also represents young '
                    + 'professionals on the NIQS National Executive Council — supported by two '
                    + 'deputies and a coordinator for each of the six geopolitical zones.'
                  : 'The YQSF is led nationally by the Chairman, who also represents young '
                    + 'professionals on the NIQS National Executive Council.'}
              </p>
            </div>
            {council.length > 1 ? (
              <div className="leader-grid">
                {council.map(m => <LeaderCard key={m._id} member={m} />)}
              </div>
            ) : (
              <div style={{ maxWidth: 320, margin: '0 auto' }}>
                <LeaderCard member={council[0]} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* Stats strip */}
      <div className="stats-strip">
        <div className="ct">
          <div className="strip-inner" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {stats.map((s, i) => (
              <div className="strip-item" key={i} style={{ textAlign: 'center' }}>
                <div className="strip-num">{s.n}</div>
                <div className="strip-lbl">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What We Offer */}
      <section className="section-alt">
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
          <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto 3rem' }}>
            <div className="ey" style={{ justifyContent: 'center' }}>What We Offer</div>
            <h2 className="sh">Programmes & <em>Initiatives</em></h2>
            <p className="sd" style={{ maxWidth: '100%' }}>
              YQSF offers a range of targeted programmes designed to accelerate the growth of
              young QS professionals across Nigeria.
            </p>
          </div>
          <div className="svc-grid">
            {offerings.map((o, i) => (
              <div className="svc" key={i}>
                <span className="svc-tag">{o.tag}</span>
                <div className="svc-ico"><Icon name={o.icon} size="lg" /></div>
                <div className="svc-t">{o.title}</div>
                <p className="svc-d">{o.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ──
          The forum's own details, here rather than as a tab on /contact
          (secretariat, 2026-08-05). The CTA below used to send people there for
          them, which is why this section exists at all. */}
      <section style={{ background: 'var(--color-off)' }}>
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
          <div className="ey">Get in Touch</div>
          <BodyContact
            bodyKey="yqsf"
            heading={<>Reach <em>YQSF</em></>}
            fallback={{
              email1: 'yqsf@niqs.org.ng',
              address: 'c/o NIQS National Secretariat,\nQS Olusegun Ajanlekoko House,\nNo. 24, NIQS Crescent, Mabushi District,\nAbuja, Nigeria',
              officeHours: 'Monday — Friday: 9:00 AM — 4:00 PM',
            }}
          />
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
          <div className="ctaw">
            <h2>Join the <em>Young Quantity Surveyors Forum</em></h2>
            <p>
              Are you a young quantity surveyor looking to accelerate your career? Join the YQSF
              community and connect with peers and mentors across Nigeria.
            </p>
            <div className="ctarow">
              <Link to="/membership" className="btn bg">Get Started</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
