import React from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../../components/common/PageHero';
import { AGREEMENT_COUNT } from '../../data/reciprocity';
import Icon from '../../components/common/Icon';
import { OUR_STORY, services } from '../../data/institute';

/* About Us, in the order the Secretariat set on 4 Nov 2026 (Gloria Ifiorah):
   Our Story, Vision / Mission / Values, the full list of Professional
   Services, then Why NIQS. The Strategic Partners block and the "Join NIQS
   Today" button after Our Story came off; partnership has its own page. The
   two photographs are the Secretariat's own (NIQS BUILDING folder). */
export default function About() {
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
              {OUR_STORY.map((para, i) => (
                <p key={i} style={{ fontSize: '.9rem', lineHeight: 1.88, color: 'var(--text2)', marginBottom: '1rem' }}>{para}</p>
              ))}
            </div>
            <div className="rr">
              <img
                src="/about/niqs-council-chamber.jpg"
                alt="The council chamber at the NIQS National Secretariat"
                style={{ borderRadius: 14, width: '100%', height: 420, objectFit: 'cover', boxShadow: 'var(--sh2)' }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Membership statistics (MembershipStats) used to sit here. At the October
          2026 review NIQS asked that the figures be shown to members only, so
          they now live on the portal dashboard. */}

      {/* ── VISION / MISSION / VALUE ── */}
      <section style={{ background: 'var(--off)', paddingTop: 0 }}>
        <div className="ct" style={{ paddingTop: '5rem' }}>
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

      {/* ── PROFESSIONAL SERVICES ── The full list; Home shows the first three
          and links here (#services). */}
      <section id="services" style={{ background: '#fff', scrollMarginTop: '6rem' }}>
        <div className="ct">
          <div className="ey">What We Do</div>
          <h2 className="sh">Professional <em>Services</em></h2>
          <p className="sd">
            NIQS promotes, represents and advances quantity surveying practice in Nigeria — from cost planning to procurement, across all sectors of the built environment.
          </p>
          <div className="svc-grid">
            {services.map((s, i) => (
              <div className={`svc reveal${i % 4 ? ` d${i % 4}` : ''}`} key={i}>
                <div className="svc-ico"><Icon name={s.icon} size="lg" /></div>
                <div className="svc-t">{s.title}</div>
                <div className="svc-d">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY NIQS ── */}
      <section className="section-alt">
        <div className="ct">
          <div className="tc2">
            <div className="rl">
              <img
                src="/about/niqs-secretariat-building.jpg"
                alt="QS J. Segun Ajanlekoko House, the NIQS National Secretariat in Abuja"
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
                  {AGREEMENT_COUNT} signed reciprocity and partnership agreements
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
