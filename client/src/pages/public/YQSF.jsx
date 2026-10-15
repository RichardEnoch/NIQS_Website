import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../../components/common/PageHero';
import LeaderCard from '../../components/common/LeaderCard';
import BodyContact from '../../components/common/BodyContact';
import API from '../../api/axios';
import Icon from '../../components/common/Icon';

const offerings = [
  { icon: 'mentorship', title: 'Mentorship Programme',  desc: 'Pairing young QS professionals with experienced Fellows for career guidance, knowledge transfer, and professional development.',                        tag: 'Mentorship'  },
  { icon: 'technology', title: 'Tech & Innovation',       desc: 'Workshops on BIM, cost estimation software, AI in construction, and digital tools transforming the QS profession.',                                  tag: 'Technology'  },
  { icon: 'trophy', title: 'Young QS Awards',          desc: 'Annual awards recognising outstanding contributions by young quantity surveyors to the profession and community.',                                    tag: 'Awards'      },
  { icon: 'web', title: 'Networking Events',        desc: 'Regular meetups, social events, and conferences designed to build connections among young professionals nationwide.',                                 tag: 'Networking'  },
  { icon: 'book', title: 'Exam Preparation',         desc: 'Study groups, mock exams, and revision workshops to help aspiring QS professionals pass the TPC and professional exams.',                           tag: 'Exams'       },
  { icon: 'international', title: 'International Exposure',  desc: 'Opportunities to participate in international QS conferences, exchange programmes, and collaborative projects.',                                      tag: 'Global'      },
];

export default function YQSF() {
  const [council, setCouncil] = useState([]);

  useEffect(() => {
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
          {/* Text only since October 2026: the Secretariat asked for the Chairman
              once, in the Leadership section below, not a second picture here. */}
          <div style={{ maxWidth: 760 }}>
            <div>
              <div className="ey">About the Forum</div>
              <h2 className="sh">Empowering the Next Generation of <em>QS Professionals</em></h2>
              <p className="sd" style={{ marginBottom: '1.2rem' }}>
                The Young Quantity Surveyors Forum (YQSF), inaugurated in July 2015, is a dedicated platform within NIQS for
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

      {/* The counts strip (QS under 40, chapters, CPD events, awards) was removed
          at the Secretariat's request, October 2026. */}

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
          The Institute's own details since October 2026: the Secretariat asked
          that the body be reached through the National Secretariat.
          The forum's own details, here rather than as a tab on /contact
          (secretariat, 2026-08-05). The CTA below used to send people there for
          them, which is why this section exists at all. */}
      <section style={{ background: 'var(--color-off)' }}>
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
          <div className="ey">Get in Touch</div>
          <BodyContact
            bodyKey="national"
            heading={<>Reach <em>YQSF</em></>}
            fallback={{
              phone1: '08167593807',
              email1: 'info@niqs.org.ng',
              email2: 'contact@niqs.org.ng',
              address: 'NIQS Head Office Secretariat,\nQS J. Segun Ajanlekoko House,\nNo. 24, NIQS Crescent, Off Michael Ama Nnachi Crescent,\nCadastral Zone B6, Mabushi District,\nAbuja, Nigeria',
              officeHours: 'Monday — Friday: 8:00 AM — 5:00 PM',
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
