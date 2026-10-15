import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../../components/common/PageHero';
import Icon from '../../components/common/Icon';
import { useAuth } from '../../context/AuthContext';
import { getEmployerInfo } from '../../api/jobsApi';
import { naira } from '../../data/jobBoard';

/**
 * /employers: the public page for organisations that want to hire through
 * the NIQS job board. Prices and the approval target come from the server
 * (Admin → Job Board → Settings), so nothing here goes stale when the
 * Secretariat changes them.
 */

const WHY = [
  {
    icon: 'group',
    title: 'Reach qualified quantity surveyors directly',
    text: 'Your listing goes to NIQS members across all 37 state chapters, and to the job alerts they have set up.',
  },
  {
    icon: 'userVerified',
    title: 'Grades checked against the register',
    text: 'Each application shows the applicant\'s NIQS grade and whether it was checked against the membership register, so you can see who is qualified before you open a CV.',
  },
  {
    icon: 'shield',
    title: 'Listings approved by the Secretariat',
    text: 'Every employer account and every listing is checked by the NIQS Secretariat before it goes live. Applicants trust the board because it carries no fake jobs.',
  },
  {
    icon: 'office',
    title: 'The Registered QS Firm mark',
    text: 'Firms listed in the Find a QS Firm directory carry a Registered QS Firm mark on every listing. The Secretariat adds it when it links your account to your directory entry.',
  },
];

const STEPS = [
  { title: 'Register', text: 'Create an employer account with your organisation details. It takes a few minutes.' },
  { title: 'Account approval', text: 'The Secretariat checks your organisation. You can sign in and draft listings while you wait.' },
  { title: 'Post a job', text: 'Describe the role, the minimum NIQS grade if it needs a qualified QS, and how people should apply.' },
  { title: 'Listing checked', text: 'Each listing is reviewed before it is published. Changes to a live listing are checked again.' },
  { title: 'Applications arrive', text: 'Applications come to your inbox on the board with the applicant\'s grade, CV and cover note.' },
];

const Employers = () => {
  const { employer } = useAuth();
  const [info, setInfo] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getEmployerInfo().then(setInfo).catch(() => setFailed(true));
  }, []);

  const hours = info?.approvalTargetHours || 48;
  const packages = (info?.packages || []).filter((p) => p.name);

  const ctas = employer ? (
    <Link to="/employer" className="btn bg">Go to your dashboard</Link>
  ) : (
    <>
      <Link to="/employers/register" className="btn bg">Register your organisation</Link>
      <Link to="/employers/sign-in" className="btn bo">Employer sign in</Link>
    </>
  );

  const faqs = [
    {
      q: 'Who can apply to my listings?',
      a: info && info.nonMembersCanApply === false
        ? 'At present only NIQS members can apply to listings on the board. Applicants sign in with their NIQS account, so you always see their recorded grade.'
        : 'Anyone with an account on the NIQS website can apply, unless you mark the listing as members only. Every application shows the applicant\'s recorded NIQS grade, or that they are not a member.',
    },
    {
      q: 'What does "members only" mean?',
      a: 'Tick "Members only" on a listing and only signed-in NIQS members can apply. Use it when the role must be filled by someone in the Institute.',
    },
    {
      q: 'Why do I have to state a minimum grade?',
      a: 'If a role requires a qualified quantity surveyor, the listing must name the lowest NIQS grade you will accept: student, probationer, graduate member, corporate member (MNIQS) or fellow (FNIQS). This is an NIQS professional standards rule. The board then stops people below that grade from applying.',
    },
    {
      q: 'How is applicant data protected?',
      a: 'Applicant details and CVs are visible only to you and the Secretariat, never on the public site. They are for the recruitment they were sent for, and are deleted some time after the listing closes, in line with the NIQS privacy policy. Talent search shows no email address or phone number; you invite a member to apply and they decide.',
    },
    {
      q: 'How long does approval take?',
      a: `The Secretariat aims to review new employer accounts and listings within ${hours} hours on working days.`,
    },
  ];

  return (
    <>
      <PageHero
        label="For Employers"
        title="Hire Quantity Surveyors"
        titleHighlight="Quantity Surveyors"
        subtitle="Post roles on the NIQS job board and hear from qualified quantity surveyors whose grade you can see."
        backgroundImage="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1400&q=80&fit=crop"
      />

      {/* ── Intro ── */}
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem' }}>
          <div className="tc2">
            <div>
              <div className="ey">The NIQS Job Board</div>
              <h2 className="sh">Recruit through the <em>profession's own board</em></h2>
              <p className="sd" style={{ marginBottom: '1.1rem' }}>
                The Nigerian Institute of Quantity Surveyors runs a job board for consultancies,
                contractors, developers, public bodies and universities that need quantity surveyors,
                interns or SIWES students.
              </p>
              <p className="sd" style={{ marginBottom: '1.8rem' }}>
                The Institute checks who is hiring, and shows you who is applying.
              </p>
              <div style={{ display: 'flex', gap: '.7rem', flexWrap: 'wrap' }}>{ctas}</div>
            </div>
            <div className="emp-pub-why">
              {WHY.map((w) => (
                <div key={w.title} className="emp-pub-why-item">
                  <span className="emp-pub-icon"><Icon name={w.icon} size="md" /></span>
                  <div>
                    <h3>{w.title}</h3>
                    <p>{w.text}</p>
                  </div>
                </div>
              ))}
              <Link to="/search-qs-firms" className="emp-pub-link">Search the Find a QS Firm directory &rarr;</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="section-alt">
        <div className="ct" style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem' }}>
          <div className="ey">How It Works</div>
          <h2 className="sh">From registration to <em>your first applicant</em></h2>
          <ol className="emp-pub-steps">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="emp-pub-step-n">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem' }}>
          <div className="ey">Pricing</div>
          <h2 className="sh">What it <em>costs</em></h2>

          {!info && !failed && <p className="sd" aria-busy="true">Loading current prices…</p>}
          {failed && (
            <p className="sd">
              Prices could not be loaded just now. Please try again later or{' '}
              <Link to="/contact" style={{ color: 'var(--color-navy)', fontWeight: 600 }}>contact the Secretariat</Link>.
            </p>
          )}

          {info && (
            <>
              <div className="emp-pub-prices">
                <div className="emp-pub-price">
                  <div className="emp-pub-price-l">Standard listing</div>
                  <div className="emp-pub-price-n">
                    {info.standardListingFee ? naira(info.standardListingFee) : 'Free'}
                  </div>
                  <p>
                    {info.standardListingFee
                      ? 'Per listing. The Secretariat will tell you how to pay.'
                      : 'Standard listings are free.'}
                  </p>
                </div>
                <div className="emp-pub-price">
                  <div className="emp-pub-price-l">Featured listing</div>
                  <div className="emp-pub-price-n">
                    {info.featuredFee ? naira(info.featuredFee) : 'Free'}
                  </div>
                  <p>
                    Shown at the top of the board{info.featuredDays ? ` for ${info.featuredDays} days` : ''}.
                    {info.featuredFee ? ' The placement starts once the Secretariat has confirmed payment.' : ''}
                  </p>
                </div>
                <div className="emp-pub-price">
                  <div className="emp-pub-price-l">Approval target</div>
                  <div className="emp-pub-price-n">{hours} hours</div>
                  <p>For new employer accounts and for each listing, on working days.</p>
                </div>
              </div>

              {packages.length > 0 && (
                <>
                  <h3 className="emp-pub-sub">Recruitment packages</h3>
                  <p className="sd" style={{ marginBottom: '1rem', maxWidth: 640 }}>
                    For organisations that hire regularly. Ask the Secretariat to set one up on your account.
                  </p>
                  <div className="emp-pub-prices">
                    {packages.map((p) => (
                      <div key={p.name} className="emp-pub-price">
                        <div className="emp-pub-price-l">{p.name}</div>
                        <div className="emp-pub-price-n">{p.price ? naira(p.price) : 'Free'}</div>
                        <ul>
                          {p.listingsQuota > 0 && <li>{p.listingsQuota} listings</li>}
                          {p.featuredQuota > 0 && <li>{p.featuredQuota} featured placements</li>}
                          {p.months > 0 && <li>Valid for {p.months} months</li>}
                        </ul>
                        {p.description && <p>{p.description}</p>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="section-alt">
        <div className="ct" style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem' }}>
          <div className="ey">Questions</div>
          <h2 className="sh">Before you <em>post</em></h2>
          <div className="emp-pub-faq">
            {faqs.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '4.5rem', paddingBottom: '4.5rem' }}>
          <div className="ctaw">
            <h2>Ready to <em>hire?</em></h2>
            <p>
              {employer
                ? 'Your listings and applicants are in your employer dashboard.'
                : 'Register your organisation, and post your first role once the Secretariat has approved your account.'}
            </p>
            <div className="ctarow">
              {employer ? (
                <Link to="/employer" className="btn bg">Go to your dashboard</Link>
              ) : (
                <>
                  <Link to="/employers/register" className="btn bg">Register your organisation</Link>
                  <Link to="/employers/sign-in" className="btn bo" style={{ color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}>Employer sign in</Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <style>{`
        .emp-pub-why { display: flex; flex-direction: column; gap: 1rem; }
        .emp-pub-why-item { display: flex; gap: .9rem; align-items: flex-start; background: var(--color-off); border: 1px solid var(--color-bdr); border-radius: 14px; padding: 1rem 1.1rem; }
        .emp-pub-icon { color: var(--color-gold); width: 44px; height: 44px; border-radius: 12px; background: var(--color-gold-xl); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .emp-pub-why-item h3 { font-family: var(--font-heading); font-size: .95rem; font-weight: 700; color: var(--color-navy); margin-bottom: .2rem; }
        .emp-pub-why-item p { font-size: .82rem; color: var(--color-txt-2); line-height: 1.6; }
        .emp-pub-link { font-size: .8rem; font-weight: 700; color: var(--color-navy); }
        .emp-pub-link:hover { color: var(--color-gold); }

        .emp-pub-steps { list-style: none; padding: 0; margin: 2rem 0 0; display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; counter-reset: none; }
        .emp-pub-steps li { background: #fff; border: 1px solid var(--color-bdr); border-radius: 14px; padding: 1.2rem 1.1rem; }
        .emp-pub-step-n { display: inline-flex; width: 30px; height: 30px; border-radius: 50%; align-items: center; justify-content: center; background: var(--color-navy); color: #fff; font-weight: 800; font-size: .8rem; margin-bottom: .7rem; }
        .emp-pub-steps h3 { font-family: var(--font-heading); font-size: .95rem; font-weight: 700; color: var(--color-navy); margin-bottom: .3rem; }
        .emp-pub-steps p { font-size: .8rem; color: var(--color-txt-2); line-height: 1.6; }

        .emp-pub-prices { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin-top: 1.6rem; }
        .emp-pub-price { border: 1px solid var(--color-bdr); border-radius: 14px; padding: 1.3rem 1.2rem; background: #fff; }
        .emp-pub-price-l { font-size: .66rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--color-txt-3); }
        .emp-pub-price-n { font-family: var(--font-heading); font-size: 1.6rem; font-weight: 800; color: var(--color-navy); letter-spacing: -.03em; margin: .3rem 0 .4rem; }
        .emp-pub-price p { font-size: .8rem; color: var(--color-txt-2); line-height: 1.6; }
        .emp-pub-price ul { margin: 0 0 .4rem; padding-left: 1.1rem; font-size: .8rem; color: var(--color-txt-2); line-height: 1.7; list-style: disc; }
        .emp-pub-sub { font-family: var(--font-heading); font-size: 1.15rem; font-weight: 700; color: var(--color-navy); margin: 2.4rem 0 .4rem; }

        .emp-pub-faq { margin-top: 1.6rem; display: flex; flex-direction: column; gap: .6rem; max-width: 820px; }
        .emp-pub-faq details { background: #fff; border: 1px solid var(--color-bdr); border-radius: 12px; padding: .9rem 1.1rem; }
        .emp-pub-faq summary { cursor: pointer; font-weight: 700; color: var(--color-navy); font-size: .9rem; }
        .emp-pub-faq details[open] summary { margin-bottom: .5rem; }
        .emp-pub-faq p { font-size: .84rem; color: var(--color-txt-2); line-height: 1.7; }

        @media (max-width: 1024px) {
          .emp-pub-steps { grid-template-columns: repeat(3, 1fr); }
        }
        @media (max-width: 640px) {
          .emp-pub-steps { grid-template-columns: 1fr; }
          .ctaw { padding: 2.5rem 1.2rem; }
        }
      `}</style>
    </>
  );
};

export default Employers;
