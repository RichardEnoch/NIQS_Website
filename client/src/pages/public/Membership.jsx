import React from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../../components/common/PageHero';
import MemberLookup from '../../components/qs/MemberLookup';

const categories = [
  {
    title: 'Probationer',
    type: 'Entry Level',
    price: '₦25,000',
    period: 'Annual Dues',
    featured: false,
    requirements: [
      'HND or B.Sc in Quantity Surveying from a recognised institution',
      'Must be registered with QSRBN or in the process of registration',
      'Two passport photographs and valid government-issued ID',
      'Completed application form with academic transcripts',
    ],
    benefits: [
      'Access to NIQS CPD events and workshops',
      'Eligibility to sit for professional examinations (GDE/TPC)',
      'NIQS membership certificate and ID card',
      'Access to the NIQS member portal',
      'Subscription to the QS Journal',
    ],
  },
  {
    title: 'Graduate Member',
    type: 'MNIQS',
    price: '₦50,000',
    period: 'Annual Dues',
    featured: true,
    requirements: [
      'Passed the Test of Professional Competence (TPC)',
      'Minimum of 2 years post-qualification experience',
      'Registered with QSRBN',
      'Endorsed by two FNIQS members',
      'Completed application with professional portfolio',
    ],
    benefits: [
      'Full voting rights at AGM and chapter meetings',
      'Use of MNIQS designation',
      'Eligible to practise as a corporate quantity surveyor',
      'Access to reciprocity agreements with international bodies',
      'Priority access to CPD, conferences, and networking events',
      'Professional indemnity resources and guidance',
      'Listing in the NIQS directory of practitioners',
    ],
  },
  {
    title: 'Fellow',
    type: 'FNIQS',
    price: '₦100,000',
    period: 'Annual Dues',
    featured: false,
    requirements: [
      'Minimum of 10 years as MNIQS in good standing',
      'Demonstrated outstanding contribution to the profession',
      'Nominated by the Fellowship Committee or NEC',
      'Evidence of leadership in QS practice, academia, or public service',
      'Approval by the National Executive Council',
    ],
    benefits: [
      'All MNIQS benefits plus Fellowship privileges',
      'Use of FNIQS designation',
      'Eligibility for NEC and NPC positions',
      'Invitation to Fellowship investiture ceremony',
      'Mentorship programme participation as a mentor',
      'Enhanced international recognition and reciprocity',
      'Voting rights on constitutional amendments',
    ],
  },
];

const steps = [
  { n: '01', title: 'Download the Application Form', desc: 'Obtain the appropriate membership application form from the NIQS secretariat or member portal.' },
  { n: '02', title: 'Gather Required Documents', desc: 'Prepare your academic certificates, QSRBN registration, passport photographs, and endorsement letters.' },
  { n: '03', title: 'Submit Application', desc: 'Submit your completed form and documents to the National Secretariat or your nearest state chapter.' },
  { n: '04', title: 'Pay Application Fee', desc: 'Make payment of the applicable registration and annual dues via the NIQS payment portal.' },
  { n: '05', title: 'Receive Confirmation', desc: 'Upon approval, you will receive your membership certificate, ID card, and portal access credentials.' },
];

export default function Membership() {
  return (
    <>
      <PageHero
        label="Join NIQS"
        title="Membership Categories"
        titleHighlight="Membership"
        backgroundImage="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1400&q=80&fit=crop"
      />

      {/* Categories */}
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
          <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 3rem' }}>
            <div className="ey" style={{ justifyContent: 'center' }}>Membership</div>
            <h2 className="sh">Choose Your <em>Category</em></h2>
            <p className="sd" style={{ maxWidth: '100%' }}>
              Choose the membership category that matches your professional stage. Each level
              offers increasing benefits and recognition within the profession.
            </p>
          </div>

          <div className="memcat">
            {categories.map((cat, i) => (
              <div className={`mcat${cat.featured ? ' ft' : ''}`} key={i}>
                <div className="mcat-type">{cat.type}</div>
                <h3>{cat.title}</h3>
                <p style={{ fontSize: '.82rem', color: 'var(--color-txt-3)', marginBottom: '.5rem' }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--color-navy)' }}>{cat.price}</span>
                  {'  '}<span style={{ fontSize: '.76rem' }}>{cat.period}</span>
                </p>

                <p style={{ fontSize: '.8rem', color: 'var(--color-txt-2)', marginBottom: '1.2rem', borderBottom: '1px solid var(--color-bdr)', paddingBottom: '1rem' }}>Requirements</p>
                <ul className="mcat-list" style={{ marginBottom: '1.2rem' }}>
                  {cat.requirements.map((r, j) => <li key={j}>{r}</li>)}
                </ul>

                <p style={{ fontSize: '.8rem', color: 'var(--color-txt-2)', marginBottom: '1.2rem', borderBottom: '1px solid var(--color-bdr)', paddingBottom: '1rem' }}>Benefits</p>
                <ul className="mcat-list" style={{ marginBottom: '2rem' }}>
                  {cat.benefits.map((b, j) => <li key={j}>{b}</li>)}
                </ul>

                <Link to="/contact" className={`btn ${cat.featured ? 'bg' : 'bo'}`} style={{ display: 'block', textAlign: 'center' }}>
                  Apply Now
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live register figures (MembershipStats) used to sit here. Members only
          since the October 2026 review — see the portal dashboard. */}

      {/* How to Apply + Search */}
      <section className="section-alt">
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
          <div className="tc2">
            <div>
              <div className="ey">Application Process</div>
              <h2 className="sh">How to <em>Apply</em></h2>
              <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
                {steps.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: '1.2rem', alignItems: 'flex-start' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'var(--color-gold-xl)', border: '1px solid var(--color-bdr-gold)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '.75rem',
                      color: 'var(--color-gold)',
                    }}>
                      {s.n}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '.95rem', color: 'var(--color-navy)', marginBottom: '.2rem' }}>{s.title}</div>
                      <p style={{ fontSize: '.8rem', color: 'var(--color-txt-2)', margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="ey">QS Register</div>
              <h2 className="sh">Verify a <em>Member</em></h2>
              <p style={{ fontSize: '.85rem', color: 'var(--color-txt-2)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
                Verify a quantity surveyor's membership status and registration with NIQS. Enter
                the practitioner's name or membership number to search.
              </p>
              <MemberLookup />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
