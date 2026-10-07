import React from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../../components/common/PageHero';
import { LegalBody, LegalMeta, Clause, SubHead, P, List, LI, LegalTable, Callout } from '../../components/common/LegalDoc';
import { requiresConsent, consentState, resetConsent } from '../../utils/analytics';

/*
 * Privacy notice for niqs.org.ng.
 *
 * Written against the Nigeria Data Protection Act 2023 and the NDPR 2019, and
 * against what this site *actually* does — every processor named below is one
 * the code really talks to, and every category of data is one a schema in
 * server/models really stores. A privacy notice describing a generic website is
 * worse than none: it is a published statement the Institute cannot stand
 * behind.
 *
 * Two things the Secretariat must confirm before this is treated as final:
 *   - the retention periods in clause 7, which are sensible defaults rather
 *     than a stated NIQS records policy; and
 *   - whether a dedicated Data Protection Officer address should replace the
 *     Secretariat one in clause 11. Nothing here invents an email that would
 *     bounce.
 */

const EFFECTIVE = '14 August 2026';
const UPDATED = '7 August 2026';

/** Lets someone change their mind without hunting for browser settings. */
function ConsentControl() {
  const [state, setState] = React.useState(null);
  React.useEffect(() => { setState(consentState()); }, []);

  if (!requiresConsent()) return null;

  const label = state === 'granted'
    ? 'You have accepted analytics cookies on this device.'
    : state === 'denied'
      ? 'You have declined analytics cookies on this device.'
      : 'You have not yet been asked on this device.';

  return (
    <Callout>
      <strong style={{ color: 'var(--color-navy)' }}>Your current choice.</strong> {label}{' '}
      {state !== null && (
        <button
          type="button"
          onClick={() => { resetConsent(); setState(null); window.location.reload(); }}
          style={{
            background: 'none', border: 0, padding: 0, cursor: 'pointer',
            color: 'var(--color-navy-2)', fontWeight: 700, textDecoration: 'underline',
            fontFamily: 'inherit', fontSize: 'inherit',
          }}
        >
          Change it
        </button>
      )}
    </Callout>
  );
}

export default function PrivacyPolicy() {
  return (
    <>
      <PageHero
        label="Legal"
        title="Privacy Policy"
        titleHighlight="Privacy"
        subtitle="How the Nigerian Institute of Quantity Surveyors collects, uses and protects personal information on this website."
      />

      <LegalBody>
        <LegalMeta effective={EFFECTIVE} updated={UPDATED} />

        <Clause n={1} title="Who we are">
          <P>
            The Nigerian Institute of Quantity Surveyors (“NIQS”, “the Institute”,
            “we”) is the professional body for quantity surveyors in Nigeria,
            established in 1969. For the purposes of the Nigeria Data Protection
            Act 2023, NIQS is the <strong>data controller</strong> for personal
            information collected through this website.
          </P>
          <P style={{ margin: 0 }}>
            National Secretariat — QS Olusegun Ajanlekoko House, No. 24, NIQS
            Crescent, Mabushi District, Abuja, Nigeria.{' '}
            <a href="mailto:info@niqs.org.ng" style={{ color: 'var(--color-navy-2)', fontWeight: 600 }}>info@niqs.org.ng</a>
          </P>
        </Clause>

        <Clause n={2} title="What this policy covers">
          <P>
            This policy applies to <strong>niqs.org.ng and niqsng.org</strong> —
            the Institute's public website — and to the forms and services
            reachable from it.
          </P>
          <Callout>
            <strong style={{ color: 'var(--color-navy)' }}>The member portal is separate.</strong>{' '}
            The membership portal at <em>portal.niqsng.org</em>, where members
            manage their records and subscriptions, is operated on the
            Institute's behalf by a different provider and holds the membership
            register itself. It has its own privacy notice, and this one does not
            describe it. If your question is about your membership record rather
            than about this website, the Secretariat can direct it to the right
            place.
          </Callout>
        </Clause>

        <Clause n={3} title="Information we collect">
          <P>
            We do not ask for personal information unless we need it for
            something. Most of this website can be read without giving us
            anything at all.
          </P>

          <LegalTable
            head={['When you…', 'We collect', 'Why']}
            rows={[
              [
                'Send a message through the contact form',
                'Name, email address, telephone number (optional), subject and the content of your message',
                'To answer you, and to keep a record of what was asked and what we replied',
              ],
              [
                'Register for an event or webinar',
                'Full name, email address, telephone number, postal address, membership number if you have one, and whether you are attending in person or online. Afterwards, whether you attended and any CPD points earned',
                'To admit you to the event, to issue attendance and CPD records, and to send you information about that event',
              ],
              [
                'Request a flyer',
                'Your name, email address, telephone number and organisation or chapter, together with the event details and any images you upload',
                'To design the flyer you asked for and to send it back to you',
              ],
              [
                'Hold a member or administrator account',
                'Your name, email address, an encrypted password, and — for members — registration number, membership grade, chapter, date of birth, gender, qualifications, employer, job title, address, membership status and subscription status',
                'To operate your account and to administer your membership of the Institute',
              ],
              [
                'Simply read the site',
                'Standard web-server records (IP address, browser type, pages requested, time of request) and, if you agree, analytics cookies — see clause 5',
                'To keep the site running and secure, and to understand which pages are useful',
              ],
            ]}
          />

          <P>
            We do not knowingly collect information about your health, religion,
            political opinions, trade union membership, ethnicity or biometrics.
            Please do not send such information through the contact form.
          </P>
        </Clause>

        <Clause n={4} title="Our lawful basis for using it">
          <P>
            Section 25 of the Nigeria Data Protection Act 2023 requires us to
            have a lawful basis for each use. Ours are:
          </P>
          <List>
            <LI>
              <strong>Consent</strong> — for analytics cookies, and for any
              newsletter or announcement you ask to receive. You may withdraw it
              at any time.
            </LI>
            <LI>
              <strong>Performance of a contract</strong> — for membership
              administration, event registration and anything you have asked us
              to provide.
            </LI>
            <LI>
              <strong>Legitimate interests</strong> — for answering enquiries,
              keeping the website secure, and maintaining the Institute's records
              of its own activities. We have considered whether these interests
              are overridden by your rights, and we think they are not; if you
              disagree, clause 8 explains how to object.
            </LI>
            <LI>
              <strong>Legal obligation</strong> — where we are required to keep
              or disclose records by Nigerian law or by a regulator.
            </LI>
          </List>
        </Clause>

        <Clause n={5} title="Cookies and analytics">
          <P>
            A cookie is a small file a website stores on your device. This site
            uses them in two ways.
          </P>

          <SubHead>Strictly necessary storage</SubHead>
          <P>
            If you sign in, we store a sign-in token in your browser so that you
            stay signed in as you move between pages. It is removed when you sign
            out. This is required for the site to work and cannot be switched
            off; no consent is sought for it, and it is not used to track you.
          </P>

          <SubHead>Analytics — only with your agreement</SubHead>
          <P>
            We use <strong>Google Analytics 4</strong> to count visits and see
            which pages people find useful. It sets cookies and sends information
            about your visit to Google. <strong>Nothing is loaded and no request
            is made to Google unless you accept the cookie notice</strong> — if
            you decline, or simply ignore it, the analytics code is never
            downloaded at all.
          </P>
          <P>
            We have configured it so that advertising features and
            ad-personalisation are switched off, and we never send your name,
            email address or membership number to it. Pages inside the
            administrator area and the member area are excluded from measurement
            entirely.
          </P>

          <ConsentControl />

          <P style={{ margin: 0 }}>
            You can also clear or block cookies in your browser settings at any
            time. Doing so will not stop you using the site.
          </P>
        </Clause>

        <Clause n={6} title="Who we share it with">
          <P>
            We do not sell personal information, and we do not share it for
            anyone else's marketing. We use the following service providers, who
            process data only on our instructions:
          </P>

          <LegalTable
            head={['Provider', 'What they do', 'Where']}
            rows={[
              ['MongoDB Atlas', 'Stores the site database', 'France (European Union)'],
              ['Amazon Web Services', 'Runs the application that serves the site’s data', 'France (European Union)'],
              ['Newfold Digital', 'Web and email hosting for niqs.org.ng', 'United States'],
              ['Cloudinary', 'Stores images uploaded to the site', 'United States'],
              ['Google (Analytics)', 'Visit statistics — only if you accept', 'United States'],
            ]}
          />

          <P style={{ margin: 0 }}>
            We may also disclose information where we are required to by law, by
            a court, or by a regulator with authority to demand it.
          </P>
        </Clause>

        <Clause n={7} title="Where it is kept, and for how long">
          <SubHead>Transfers outside Nigeria</SubHead>
          <P>
            As the table above shows, some of the systems that hold this data are
            located outside Nigeria. Sections 41 to 43 of the Nigeria Data
            Protection Act 2023 permit such transfers where the destination
            offers an adequate level of protection or where appropriate
            safeguards are in place. We rely on the contractual data-protection
            terms each provider offers, and we choose providers that publish
            them.
          </P>

          <SubHead>Retention</SubHead>
          <P>
            We keep personal information only for as long as it serves the
            purpose it was collected for:
          </P>
          <List>
            <LI><strong>Contact enquiries</strong> — 24 months after the matter is closed.</LI>
            <LI><strong>Event registration and attendance</strong> — 6 years, because attendance underpins CPD records members may need to evidence later.</LI>
            <LI><strong>Flyer requests</strong> — 24 months, together with the artwork produced.</LI>
            <LI><strong>Membership records</strong> — for the duration of membership and afterwards as part of the Institute's permanent record of its members.</LI>
            <LI><strong>Web-server logs</strong> — a short rolling period set by our hosting providers.</LI>
          </List>
        </Clause>

        <Clause n={8} title="Your rights">
          <P>
            Under the Nigeria Data Protection Act 2023 you may ask us to:
          </P>
          <List>
            <LI>tell you what personal information we hold about you, and give you a copy;</LI>
            <LI>correct anything that is wrong or incomplete;</LI>
            <LI>delete information we no longer have a reason to keep;</LI>
            <LI>restrict or stop a particular use, including direct communications;</LI>
            <LI>provide your information in a portable form, or transfer it to another organisation; and</LI>
            <LI>withdraw consent you have given, without affecting what was done before you withdrew it.</LI>
          </List>
          <P>
            Write to the address in clause 11. We will respond within{' '}
            <strong>30 days</strong>. We may ask you to confirm your identity
            first — not to delay you, but because handing someone else's record
            to the wrong person is the failure these rights exist to prevent.
          </P>
          <P style={{ margin: 0 }}>
            Some rights are qualified. We may not be able to delete a membership
            record we are required to keep, for example; if we cannot do what you
            ask, we will tell you why.
          </P>
        </Clause>

        <Clause n={9} title="How we protect it">
          <P>
            The site is served over an encrypted connection. Passwords are stored
            hashed, never in a readable form. Administrative screens require a
            sign-in and are restricted by role, so a chapter administrator cannot
            reach another chapter's records. Access to the database is limited to
            the people who need it to run the site.
          </P>
          <P style={{ margin: 0 }}>
            No system is perfect. If a breach occurs that is likely to result in
            harm, we will notify the Nigeria Data Protection Commission within 72
            hours and tell affected individuals as required by section 40 of the
            Act.
          </P>
        </Clause>

        <Clause n={10} title="Children">
          <P style={{ margin: 0 }}>
            This website is intended for practising and prospective quantity
            surveyors and is not directed at children. We do not knowingly
            collect information from anyone under 18 without the consent of a
            parent or guardian. If you believe we have, please tell us and we
            will remove it.
          </P>
        </Clause>

        <Clause n={11} title="Contact and complaints">
          <P>
            Questions about this policy, or any request under clause 8, should go
            to the Data Protection Officer, care of the National Secretariat:
          </P>
          <P>
            NIQS National Secretariat<br />
            QS Olusegun Ajanlekoko House, No. 24, NIQS Crescent<br />
            Mabushi District, Abuja, Nigeria<br />
            <a href="mailto:info@niqs.org.ng" style={{ color: 'var(--color-navy-2)', fontWeight: 600 }}>info@niqs.org.ng</a>
            {' · '}
            <a href="mailto:secretary@niqs.org.ng" style={{ color: 'var(--color-navy-2)', fontWeight: 600 }}>secretary@niqs.org.ng</a>
          </P>
          <P style={{ margin: 0 }}>
            If you are not satisfied with our response, you may complain to the{' '}
            <strong>Nigeria Data Protection Commission (NDPC)</strong>, the
            supervisory authority established under the Act.
          </P>
        </Clause>

        <Clause n={12} title="Changes to this policy">
          <P style={{ margin: 0 }}>
            We will update this policy when what we do changes. The dates at the
            top of this page always show the current version. Where a change
            materially affects how we use information you have already given us,
            we will say so on the site rather than change it quietly.
          </P>
        </Clause>

        <P style={{ marginTop: '3rem', fontSize: '.8rem' }}>
          See also our <Link to="/terms-of-use" style={{ color: 'var(--color-navy-2)', fontWeight: 600 }}>Terms of Use</Link>.
        </P>
      </LegalBody>
    </>
  );
}
