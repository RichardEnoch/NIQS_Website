import React from 'react';
import { Link } from 'react-router-dom';

/**
 * ADLM's website, for the attribution below.
 *
 * Left empty deliberately: no address for ADLM Studio appears in the MoU or
 * anywhere in this repository, and a credit pointing at a guessed domain is
 * worse than one that does not link at all. Set it and the attribution becomes
 * a link; leave it and it renders as plain text, which is what the MoU requires
 * either way.
 */
const ADLM_URL = '';

/**
 * Attribution, per the MoU.
 *
 * Clause 10.1, the summary at G, Annexe E11 and the Milestone 2 go-live
 * checklist all specify the same thing: a **footer** attribution reading
 * "Powered by ADLM Studio", with placement and style aligned to NIQS brand
 * standards. The checklist item is literally
 *
 *     ☐ Footer attribution: "Powered by ADLM Studio" present and styled.
 *
 * and it is a condition of NIQS issuing written Go-Live Acceptance. Until
 * 10 August this footer read "Designed & built by ADLM" and a second, fixed
 * badge read "Built by ADLM" — neither is the contracted string, so that box
 * could not honestly be ticked. This is the wording the MoU names.
 */
function Attribution() {
  const label = <>Powered by <b style={{ fontWeight: 800, letterSpacing: '.03em' }}>ADLM Studio</b></>;
  const tone = { color: 'var(--color-gold)', textDecoration: 'none' };

  return (
    <p style={{
      marginTop: '0.6rem', fontSize: '0.78rem',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
    }}>
      <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--color-gold)', flexShrink: 0 }} />
      {ADLM_URL
        ? <a href={ADLM_URL} target="_blank" rel="noopener noreferrer" style={tone}>{label}</a>
        : <span style={tone}>{label}</span>}
    </p>
  );
}

const Footer = () => {
  return (
    <footer>
      <div className="ct">
        <div className="fg4">
          {/* Column 1: Brand */}
          <div>
            <img
              src="/NIQS-LOGO-PNG-NAV.png"
              alt="NIQS Logo"
              style={{ height: 52, width: 'auto', objectFit: 'contain', display: 'block', marginBottom: '0.8rem' }}
            />
            <div className="fdesc">
              The Nigerian Institute of Quantity Surveyors — Nigeria's professional
              construction cost managers since 1969. Committed to sustainable national
              development.
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="fcol">
            <h5>Quick Links</h5>
            <ul className="flinks">
              <li><Link to="/about">About NIQS</Link></li>
              <li><Link to="/council">Leadership</Link></li>
              <li><Link to="/membership">Membership</Link></li>
              <li><Link to="/events">Events</Link></li>
              <li><Link to="/partnership">Partnerships</Link></li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div className="fcol">
            <h5>Resources</h5>
            <ul className="flinks">
              <li><Link to="/login">Member Portal</Link></li>
              <li><Link to="/exams">Examinations</Link></li>
              {/* Was "CPD & Webinars" → /research. The Webinar Series page was
                  retired in the October 2026 review; webinars are events now. */}
              <li><Link to="/events">Upcoming Events</Link></li>
              <li><Link to="/research">QS Journal</Link></li>
              <li><Link to="/library">Digital Library</Link></li>
              {/* /brand does not exist — the route is /brand-materials. This
                  link had been landing on the 404 page. */}
              <li><Link to="/brand-materials">Brand Materials</Link></li>
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div className="fcol">
            <h5>Contact</h5>
            <ul className="flinks">
              <li><a href="tel:08028303346">08028 303 346</a></li>
              <li><a href="mailto:info@niqs.org.ng">info@niqs.org.ng</a></li>
              {/* Both office links were href="#" and went nowhere. Abuja opens the
                  Secretariat on a map. Lagos is held back until the Secretariat
                  confirms the liaison office address — a dead link is worse
                  than none. */}
              <li>
                <a
                  href="https://www.google.com/maps/search/?api=1&query=NIQS+Crescent+Mabushi+Abuja"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Abuja Head Office
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="fbot">
          {/* Legal links belong here rather than in a fifth column: the grid is
              fg4, and these are the links people look for at the very bottom of
              a page anyway. Search engines also read the footer to decide a
              site is a real organisation with a published policy. */}
          <p style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.4rem 1.2rem', marginBottom: '0.9rem' }}>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-of-use">Terms of Use</Link>
            <Link to="/contact">Contact</Link>
          </p>
          <p>&copy; {new Date().getFullYear()} <span className="fgold">Nigerian Institute of Quantity Surveyors</span>. All rights reserved.</p>
          <p>No. 24, NIQS Crescent, Mabushi District, Abuja, Nigeria.</p>
          <Attribution />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
