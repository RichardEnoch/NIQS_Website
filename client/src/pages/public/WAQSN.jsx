import { useState, useEffect } from 'react';
import PageHero from '../../components/common/PageHero';
import LeaderCard from '../../components/common/LeaderCard';
import BodyContact from '../../components/common/BodyContact';
import API from '../../api/axios';
import Icon from '../../components/common/Icon';

const roles = [
  { icon: 'jobs', title: 'Professional Advocacy',    desc: 'WAQSN advocates for the increased participation and recognition of women in quantity surveying, construction, and the broader built environment in Nigeria.',                   tag: 'Advocacy'     },
  { icon: 'education', title: 'Mentorship & Training',     desc: 'Structured mentorship programmes pair emerging female QS professionals with experienced Fellows, providing career guidance and knowledge transfer.',                              tag: 'Mentorship'   },
  { icon: 'handshake', title: 'Networking',                desc: 'Regular forums, seminars, and social events create a strong community where women QS professionals can connect, collaborate, and grow together.',                               tag: 'Community'    },
  { icon: 'library', title: 'Capacity Building',         desc: 'Workshops on leadership, entrepreneurship, BIM, contract management, and other skills equip members to excel and advance in their careers.',                                   tag: 'Development'  },
  { icon: 'trophy', title: 'Women in QS Awards',        desc: 'Annual awards recognising outstanding female quantity surveyors who have made exceptional contributions to the profession and to society.',                                      tag: 'Recognition'  },
  { icon: 'web', title: 'International Engagement',  desc: 'WAQSN engages with global women-in-construction networks, facilitating international exposure and collaboration opportunities for Nigerian female QS professionals.',           tag: 'Global'       },
];

export default function WAQSN() {
  const [waqsnUrl, setWaqsnUrl] = useState('');
  const [femaleQS, setFemaleQS] = useState('');
  /* Nothing in the public statistics endpoint distinguishes gender today, so this
     stays null and the tile falls back to the figure the secretariat types into
     site settings. The server already reads a `by_gender[]` array if one appears
     (see normaliseFemaleMembers), so adding it upstream is the whole job — the
     same arrangement as the YQSF under-35 count. */
  const [liveFemale, setLiveFemale] = useState(null);
  const [chair, setChair] = useState(null);
  const [exec, setExec] = useState([]);

  useEffect(() => {
    API.get('/site-settings')
      .then(res => {
        if (res.data?.waqsnUrl) setWaqsnUrl(res.data.waqsnUrl);
        if (res.data?.waqsnFemaleQSCount) setFemaleQS(res.data.waqsnFemaleQSCount);
      })
      .catch(() => {});

    API.get('/stats/membership')
      .then(res => { if (res.data?.female_members) setLiveFemale(res.data.female_members); })
      .catch(() => {});

    /* The association's own executive. Its Chairperson also sits on the NEC, so
       if this scope is empty — as it was before the roster was seeded — fall back
       to finding her there, and the page still shows a Chairperson rather than
       nothing. Same shape as YQSF. */
    API.get('/exco?scope=waqsn')
      .then(res => {
        const data = res.data?.exco || res.data?.data || res.data;
        if (Array.isArray(data) && data.length) {
          setExec(data);
          const head = data.find(m => /chairperson/i.test(m.title || '')
                                   && !/deputy|past/i.test(m.title || ''));
          if (head) setChair(head);
          return;
        }
        throw new Error('no waqsn-scope records');
      })
      .catch(() => API.get('/exco?scope=national')
        .then(res => {
          const data = res.data?.exco || res.data?.data || res.data;
          if (Array.isArray(data)) {
            const found = data.find(m => (m.title || '').toUpperCase().includes('WAQSN'));
            if (found) setChair(found);
          }
        })
        .catch(() => {}));
  }, []);

  /* Officers and zonal coordinators are one roster in the register, separated by
     order: 1-10 are national officers, 11-21 the zonal coordinators. Splitting
     them here keeps the page honest if the association adds either. */
  const officers = exec.filter(m => !/zonal/i.test(m.title || ''));
  const zonal    = exec.filter(m =>  /zonal/i.test(m.title || ''));

  return (
    <>
      <PageHero
        label="Women in QS"
        title="Women Association of Quantity Surveyors in Nigeria"
        titleHighlight="Quantity Surveyors in Nigeria"
        backgroundImage="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1400&q=80&fit=crop"
      />

      {/* ── Org-hero banner ── */}
      <section style={{ background: 'var(--color-off)' }}>
        <div className="ct" style={{ paddingTop: '3.5rem', paddingBottom: '0' }}>
          <div className="org-hero">
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              backgroundImage: 'linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)',
              backgroundSize: '44px 44px',
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="ey" style={{ color: 'rgba(255,255,255,.55)' }}>
                Women Association of Quantity Surveyors in Nigeria
              </div>
              <h2>Empowering Women in Nigeria's Built Environment</h2>
              <p>
                WAQSN is the foremost platform within NIQS dedicated to advancing the professional
                growth, visibility, and leadership of women in quantity surveying across Nigeria.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Two-col: image LEFT / text RIGHT ── */}
      <section style={{ background: 'var(--color-off)' }}>
        <div className="ct" style={{ paddingTop: '4rem', paddingBottom: '5rem' }}>
          <div className="tc2">
            {/* Image — left: the WAQSN Chairperson's portrait once loaded */}
            <div>
              <img
                src={chair?.image || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=700&q=80&fit=crop'}
                alt={chair ? chair.name : 'Women QS professionals'}
                style={{ width: '100%', borderRadius: 16, objectFit: 'cover', objectPosition: 'center 20%', maxHeight: 420, border: '1px solid var(--color-bdr)', display: 'block' }}
              />
              {chair && (
                <div style={{ marginTop: '.8rem', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '.95rem', color: 'var(--color-navy)' }}>{chair.name}</div>
                  <div style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--color-gold)', letterSpacing: '.08em', textTransform: 'uppercase', marginTop: 2 }}>{chair.title}</div>
                </div>
              )}
            </div>

            {/* Text — right */}
            <div>
              <div className="ey">About WAQSN</div>
              <h2 className="sh">Women Shaping <em>Excellence</em></h2>
              <p className="sd" style={{ marginBottom: '1.2rem' }}>
                The Women Association of Quantity Surveyors in Nigeria (WAQSN) is a body within
                the Nigerian Institute of Quantity Surveyors established to champion the interests,
                welfare, and professional advancement of women in the QS profession.
              </p>
              <p className="sd" style={{ marginBottom: '1.2rem' }}>
                WAQSN provides a supportive community where female quantity surveyors at every
                stage of their career — from student to Fellow — can find mentorship, training,
                networking, and advocacy.
              </p>
              <p className="sd" style={{ marginBottom: '2rem' }}>
                Through targeted programmes and strong advocacy, WAQSN works to break barriers,
                increase female representation in leadership roles, and position women as key
                drivers of Nigeria's built environment.
              </p>

              {/* Registered female QS stat */}
              <div style={{ display: 'flex', gap: '1rem', margin: '0 0 1.8rem', flexWrap: 'wrap' }}>
                <div style={{ background: 'var(--color-off)', borderRadius: 12, padding: '1rem 1.4rem', minWidth: 150 }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-navy)', letterSpacing: '-.04em' }}>
                    {femaleQS || (liveFemale ? liveFemale.count.toLocaleString() : '—')}
                  </div>
                  <div style={{ fontSize: '.66rem', fontWeight: 700, color: 'var(--color-txt-3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Registered Female QS</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '.8rem', flexWrap: 'wrap' }}>
                <a href="/membership" className="btn bp">Join WAQSN →</a>
                {waqsnUrl && (
                  <a href={waqsnUrl} target="_blank" rel="noopener noreferrer" className="btn bo">Visit WAQSN Website →</a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Leadership ── */}
      {chair && (
        <section style={{ background: '#fff' }}>
          <div className="ct" style={{ paddingTop: '4.5rem', paddingBottom: '1rem' }}>
            <div style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 2rem' }}>
              <div className="ey" style={{ justifyContent: 'center' }}>Leadership</div>
              <h2 className="sh" style={{ textAlign: 'center' }}>Meet the <em>Chairperson</em></h2>
              <p className="sd" style={{ maxWidth: '100%', textAlign: 'center' }}>
                WAQSN is led nationally by the Chairperson, who also represents the association
                on the NIQS National Executive Council.
              </p>
            </div>
            <div style={{ maxWidth: 320, margin: '0 auto' }}>
              <LeaderCard member={chair} />
            </div>
          </div>
        </section>
      )}

      {/* ── National executive ──
          Only drawn once the waqsn scope has records; before that the page shows
          the Chairperson alone, as it did previously. The Chairperson is already
          above, so she is dropped from the officers grid rather than printed
          twice. */}
      {officers.length > 1 && (
        <section style={{ background: 'var(--color-off)' }}>
          <div className="ct" style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem' }}>
            <div style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 2.5rem' }}>
              <div className="ey" style={{ justifyContent: 'center' }}>Governance</div>
              <h2 className="sh" style={{ textAlign: 'center' }}>National <em>Executive</em></h2>
              <p className="sd" style={{ maxWidth: '100%', textAlign: 'center' }}>
                The officers who run the association nationally, alongside the Chairperson.
              </p>
            </div>
            <div className="grid-4 stagger">
              {officers
                .filter(m => m._id !== chair?._id)
                .map(m => <div className="reveal" key={m._id}><LeaderCard member={m} /></div>)}
            </div>
          </div>
        </section>
      )}

      {/* ── Zonal coordinators ── */}
      {zonal.length > 0 && (
        <section style={{ background: '#fff' }}>
          <div className="ct" style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem' }}>
            <div style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 2.5rem' }}>
              <div className="ey" style={{ justifyContent: 'center' }}>Nationwide</div>
              <h2 className="sh" style={{ textAlign: 'center' }}>Zonal <em>Coordinators</em></h2>
              <p className="sd" style={{ maxWidth: '100%', textAlign: 'center' }}>
                WAQSN coordinates its work across the northern, southern and western zones.
              </p>
            </div>
            <div className="grid-4 stagger">
              {zonal.map(m => <div className="reveal" key={m._id}><LeaderCard member={m} /></div>)}
            </div>
          </div>
        </section>
      )}

      {/* ── What WAQSN Does ── */}
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
          <div style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto 3rem' }}>
            <div className="ey" style={{ justifyContent: 'center' }}>Our Work</div>
            <h2 className="sh" style={{ textAlign: 'center' }}>What <em>WAQSN Does</em></h2>
            <p className="sd" style={{ maxWidth: '100%', textAlign: 'center' }}>
              WAQSN runs a range of programmes designed to support, develop, and celebrate
              women across all levels of the quantity surveying profession in Nigeria.
            </p>
          </div>
          <div className="svc-grid">
            {roles.map((r, i) => (
              <div className="svc" key={i}>
                <span className="svc-tag">{r.tag}</span>
                <div className="svc-ico"><Icon name={r.icon} size="lg" /></div>
                <div className="svc-t">{r.title}</div>
                <p className="svc-d">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contact ──
          The association's own details, here rather than as a tab on /contact
          (secretariat, 2026-08-05). The CTA below used to send people there for
          them, which is why this section exists at all. */}
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
          <div className="ey">Get in Touch</div>
          <BodyContact
            bodyKey="waqsn"
            heading={<>Reach <em>WAQSN</em></>}
            fallback={{
              email1: 'waqsn@niqs.org.ng',
              address: 'c/o NIQS National Secretariat,\nQS Olusegun Ajanlekoko House,\nNo. 24, NIQS Crescent, Mabushi District,\nAbuja, Nigeria',
              officeHours: 'Monday — Friday: 9:00 AM — 4:00 PM',
            }}
          />
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: 'var(--color-off)' }}>
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
          <div className="ctaw">
            <h2>Join the <em>WAQSN Community</em></h2>
            <p>
              Are you a female quantity surveyor or a student of QS? Connect with WAQSN and
              be part of a growing community shaping the future of Nigeria's built environment.
            </p>
            <div className="ctarow">
              {waqsnUrl && (
                <a href={waqsnUrl} target="_blank" rel="noopener noreferrer" className="btn bg">Visit WAQSN</a>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
