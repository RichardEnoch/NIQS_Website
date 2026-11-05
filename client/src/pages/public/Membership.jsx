import React, { useState } from 'react';
import PageHero from '../../components/common/PageHero';
import MemberLookup from '../../components/qs/MemberLookup';
import MEMBERSHIP_REQUIREMENTS, { APPLICATION_FLOWS } from '../../data/membershipRequirements';

/* The Membership page, in the order the Secretariat set on 4 Nov 2026
   (Gloria Ifiorah): the category strip, Eligibility & Requirements,
   Application Process (each route on its own line, steps as bullets), then
   the QS Register. The "Choose Your Category" price cards came off: their
   fees and benefits were not the Institute's. */
const CATEGORY_STRIP = ['Student', 'Technician', 'Probationer', 'Member', 'Fellow', 'Honorary Fellow'];
const STRIP_LABEL = { 'Honorary Fellow': 'Hon. Fellow' };

/* One requirement block from data/membershipRequirements.js. */
function ReqBlock({ b }) {
  const item = (it, i) => typeof it === 'string'
    ? <li key={i}>{it}</li>
    : <li key={i}>{it.text}{it.sub && <ul className="mreq-sub">{it.sub.map((s, j) => <li key={j}>{s}</li>)}</ul>}</li>;
  if (b.h) return <h4 className="mreq-h">{b.h}</h4>;
  if (b.pb) return <p className="mreq-p"><strong>{b.pb}</strong></p>;
  if (b.p) return <p className="mreq-p">{b.p}</p>;
  if (b.ol) return <ol className="mreq-list">{b.ol.map(item)}</ol>;
  if (b.ul) return <ul className="mreq-list">{b.ul.map(item)}</ul>;
  return null;
}

export default function Membership() {
  const [openCat, setOpenCat] = useState(MEMBERSHIP_REQUIREMENTS[0]?.tab);
  const showCategory = (tab) => {
    setOpenCat(tab);
    requestAnimationFrame(() => document.getElementById('eligibility')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  return (
    <>
      <PageHero
        label="Join NIQS"
        title="Membership"
        titleHighlight="Membership"
        backgroundImage="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1400&q=80&fit=crop"
      />

      {/* a. Membership Categories */}
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '4.5rem', paddingBottom: '3rem', textAlign: 'center' }}>
          <h2 className="sh">Membership <em>Categories</em></h2>
          <div className="mcat-strip" role="list">
            {CATEGORY_STRIP.map(tab => (
              <button key={tab} type="button" role="listitem" className={`mcat-chip${openCat === tab ? ' on' : ''}`} onClick={() => showCategory(tab)}>
                {STRIP_LABEL[tab] || tab}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* b. Eligibility & Requirements */}
      <section id="eligibility" className="section-alt" style={{ scrollMarginTop: '6rem' }}>
        <div className="ct" style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem', maxWidth: 980 }}>
          <h2 className="sh">Membership Eligibility &amp; <em>Requirements</em></h2>
          <p className="sd" style={{ marginBottom: '1.4rem' }}>
            Select a membership category to see who is eligible and what the application needs.
          </p>
          <div className="mreq">
            {MEMBERSHIP_REQUIREMENTS.map(c => {
              const open = openCat === c.tab;
              return (
                <div key={c.tab} className={`mreq-item${open ? ' open' : ''}`}>
                  <button type="button" className="mreq-btn" aria-expanded={open} onClick={() => setOpenCat(open ? null : c.tab)}>
                    <span>{c.title}</span><span className="mreq-ic" aria-hidden="true">{open ? '−' : '+'}</span>
                  </button>
                  {open && <div className="mreq-body">{c.blocks.map((b, i) => <ReqBlock key={i} b={b} />)}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* c-d. Application Process: one route per line, steps as bullets.
          Both open the membership portal in a new tab. */}
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem', maxWidth: 980 }}>
          <div className="ey">Application Process</div>
          <h2 className="sh">How to <em>Apply</em></h2>
          <div className="mflow">
            {APPLICATION_FLOWS.map(f => (
              <div className="mflow-card" key={f.key}>
                <h3 className="mflow-h">{f.title}</h3>
                <ul className="mreq-list mflow-steps">{f.steps.map((st, i) => <li key={i}>{st}</li>)}</ul>
                <a href={f.href} target="_blank" rel="noopener noreferrer" className="btn bg">Apply Now</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* e. QS Register */}
      <section className="section-alt">
        <div className="ct" style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem', maxWidth: 980 }}>
          <div className="ey">QS Register</div>
          <h2 className="sh">Verify a <em>Member</em></h2>
          <p style={{ fontSize: '.85rem', color: 'var(--color-txt-2)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
            Verify a quantity surveyor's membership status and registration with NIQS. Enter
            the practitioner's name or membership number to search.
          </p>
          <MemberLookup />
        </div>
      </section>
    </>
  );
}
