import React from 'react';
import { Link } from 'react-router-dom';
import PageHero from '../../components/common/PageHero';
import { LegalBody, LegalMeta, Clause, P, List, LI, Callout } from '../../components/common/LegalDoc';

/*
 * Terms of use for niqs.org.ng.
 *
 * Scoped to the website. It deliberately does not attempt to restate the
 * Institute's constitution, its membership rules or its disciplinary procedure —
 * those are governed by the NIQS Act and the Institute's own instruments, and a
 * web page that paraphrases them creates a second, conflicting version of the
 * rules. Where a question belongs to those instruments, this document says so
 * and points at the Secretariat.
 *
 * For the Secretariat / the Institute's solicitor to confirm: clause 8 assumes
 * no payment is taken on this website today, which is true — the payments page
 * lists fees and no gateway is connected. That clause must be revisited before
 * one is.
 */

const EFFECTIVE = '14 August 2026';
const UPDATED = '7 August 2026';

const link = { color: 'var(--color-navy-2)', fontWeight: 600 };

export default function TermsOfUse() {
  return (
    <>
      <PageHero
        label="Legal"
        title="Terms of Use"
        titleHighlight="Terms"
        subtitle="The terms on which the Nigerian Institute of Quantity Surveyors makes this website available."
      />

      <LegalBody>
        <LegalMeta effective={EFFECTIVE} updated={UPDATED} />

        <Clause n={1} title="These terms">
          <P>
            This website is published by the Nigerian Institute of Quantity
            Surveyors (“NIQS”, “the Institute”, “we”), National Secretariat, QS
            Olusegun Ajanlekoko House, No. 24, NIQS Crescent, Mabushi District,
            Abuja.
          </P>
          <P style={{ margin: 0 }}>
            By using this site you accept these terms. If you do not accept them,
            please do not use the site. How we handle personal information is set
            out separately in our{' '}
            <Link to="/privacy-policy" style={link}>Privacy Policy</Link>.
          </P>
        </Clause>

        <Clause n={2} title="Using the site">
          <P>You may read, print and share this site's pages freely. You may not:</P>
          <List>
            <LI>use it for anything unlawful, or in a way that damages the Institute's reputation;</LI>
            <LI>attempt to gain access to any part of it, or any account, that you are not authorised to use;</LI>
            <LI>introduce malicious code, or interfere with the site's operation or security;</LI>
            <LI>extract its content systematically — by scraping, harvesting or otherwise — to build a database or a competing service; or</LI>
            <LI>use the membership, chapter or firm listings to compile marketing lists or send unsolicited communications.</LI>
          </List>
          <P style={{ margin: 0 }}>
            We may withdraw access to the site, or to any account, from anyone who
            does.
          </P>
        </Clause>

        <Clause n={3} title="Membership status and the register">
          <Callout>
            <strong style={{ color: 'var(--color-navy)' }}>This website is not the register.</strong>{' '}
            The authoritative record of who is a member of the Institute, and of
            their grade and standing, is the membership register held by the
            National Secretariat and the membership portal. Information shown here
            is published for convenience and may lag behind it. Anyone relying on
            a person's professional standing — a client, an employer, a public
            authority — should confirm it with the Secretariat.
          </Callout>
          <P style={{ margin: 0 }}>
            The same applies to the firms directory and to examination results
            published here: they are notices, not certificates.
          </P>
        </Clause>

        <Clause n={4} title="Information on this site">
          <P>
            We take care that what we publish is accurate and current, but we give
            no warranty that it is. Content is provided for general information
            about the Institute and the profession. It is not professional,
            technical or legal advice, and it is not a substitute for engaging a
            quantity surveyor.
          </P>
          <P style={{ margin: 0 }}>
            If you find something on this site that is wrong or out of date,
            please tell us through the{' '}
            <Link to="/contact" style={link}>contact page</Link> — corrections
            are welcome and are usually quick.
          </P>
        </Clause>

        <Clause n={5} title="Intellectual property">
          <P>
            The content of this site — text, images, layout, publications and the
            NIQS name and crest — belongs to the Institute or to its licensors and
            is protected by copyright and trade mark law.
          </P>
          <P>
            You may reproduce extracts for personal, non-commercial use or for
            internal circulation within your organisation, provided the Institute
            is acknowledged and the material is not altered. Any other use —
            including commercial use, republication, or use in a way that implies
            NIQS endorsement — needs our written permission.
          </P>
          <P style={{ margin: 0 }}>
            <strong>The crest and the brand materials are a special case.</strong>{' '}
            Logos, templates and other assets on the{' '}
            <Link to="/brand-materials" style={link}>brand materials</Link> page
            are supplied for the specific uses described there, principally by
            chapters, bodies and members acting for the Institute. They may not be
            used to suggest that a person or firm is a member of, or endorsed by,
            NIQS when they are not.
          </P>
        </Clause>

        <Clause n={6} title="What you send us">
          <P>
            Several parts of this site invite you to submit something: an enquiry,
            an event registration, a flyer request with its images and details, or
            material for publication. When you do:
          </P>
          <List>
            <LI>you confirm that what you send is accurate, and that you are entitled to send it — including any photograph or logo in which someone else holds rights;</LI>
            <LI>you grant the Institute permission to use it for the purpose you sent it for, and — where the material is for an event, a flyer or an announcement — to publish it in the Institute's communications about that event; and</LI>
            <LI>you accept that we may decline, edit or withdraw any submission, and that we are not obliged to publish anything.</LI>
          </List>
          <P style={{ margin: 0 }}>
            Do not send confidential information, or anyone's personal details
            other than your own and those you are authorised to provide.
          </P>
        </Clause>

        <Clause n={7} title="Events, CPD and registrations">
          <P>
            Registering for an event through this site is a request to attend it.
            Places, fees, joining details and CPD points are set by the organiser —
            the Institute, a chapter, or a national body — and events may be
            changed, rescheduled or cancelled.
          </P>
          <P style={{ margin: 0 }}>
            CPD points are credited on attendance and are recorded against the
            details you register with. Register with your own details and your own
            membership number; attendance recorded against the wrong person cannot
            reliably be corrected afterwards.
          </P>
        </Clause>

        <Clause n={8} title="Fees and payments">
          <P style={{ margin: 0 }}>
            The payments page lists the Institute's current fees. Payment is
            <strong> not taken on this website</strong>; it is made through the
            channels the Secretariat provides, and those transactions are governed
            by the terms of whichever bank or payment provider handles them, not
            by these terms. Fees are set by the Institute and may change. If
            online payment is introduced here in future, these terms will be
            updated before it is.
          </P>
        </Clause>

        <Clause n={9} title="Links, listings and other sites">
          <P>
            This site links to other places: the membership portal, chapter and
            partner organisations, job vacancies, and the websites of firms and
            sister institutes.
          </P>
          <P style={{ margin: 0 }}>
            We do not control those sites and are not responsible for their
            content, their availability or their handling of your data. A link, a
            job listing, a firm's entry in the directory or a partner's presence
            on this site is not an endorsement, a recommendation or a warranty of
            anyone's competence, solvency or conduct. Satisfy yourself before
            acting.
          </P>
        </Clause>

        <Clause n={10} title="Availability">
          <P style={{ margin: 0 }}>
            We aim to keep the site available but do not guarantee it. It may be
            unavailable for maintenance, or because of a failure at a supplier, and
            we may change or withdraw any part of it without notice.
          </P>
        </Clause>

        <Clause n={11} title="Liability">
          <P>
            Nothing in these terms excludes liability for death or personal injury
            caused by negligence, for fraud, or for anything else that cannot
            lawfully be excluded.
          </P>
          <P style={{ margin: 0 }}>
            Subject to that, the Institute is not liable for loss of profit, loss
            of business or contracts, loss of data, or any indirect or
            consequential loss arising from use of this site or reliance on its
            content.
          </P>
        </Clause>

        <Clause n={12} title="Professional conduct">
          <P style={{ margin: 0 }}>
            Complaints about the professional conduct of a member are not a
            website matter and are not dealt with through these terms. They are
            governed by the Institute's own rules and disciplinary procedure, and
            should be directed to the National Secretariat.
          </P>
        </Clause>

        <Clause n={13} title="Changes">
          <P style={{ margin: 0 }}>
            We may amend these terms. The version on this page at the time you use
            the site is the one that applies, and the dates at the top show when
            it last changed.
          </P>
        </Clause>

        <Clause n={14} title="Governing law">
          <P style={{ margin: 0 }}>
            These terms are governed by the laws of the Federal Republic of
            Nigeria, and the Nigerian courts have exclusive jurisdiction over any
            dispute arising from them or from use of this site.
          </P>
        </Clause>

        <Clause n={15} title="Contact">
          <P style={{ margin: 0 }}>
            NIQS National Secretariat, QS Olusegun Ajanlekoko House, No. 24, NIQS
            Crescent, Mabushi District, Abuja, Nigeria —{' '}
            <a href="mailto:info@niqs.org.ng" style={link}>info@niqs.org.ng</a>
          </P>
        </Clause>

        <P style={{ marginTop: '3rem', fontSize: '.8rem' }}>
          See also our <Link to="/privacy-policy" style={link}>Privacy Policy</Link>.
        </P>
      </LegalBody>
    </>
  );
}
