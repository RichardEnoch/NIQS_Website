import React, { useState, useEffect } from 'react';
import API from '../../api/axios';
import PageHero from '../../components/common/PageHero';
import Icon from '../../components/common/Icon';

/* ── Fallback contact block ──────────────────────────────────────────────
   Defaults only, overlaid by /contact-info. No phone numbers here: the two
   that used to sit in this block were placeholder digits, and a wrong number
   on the contact page is worse than no number at all. The secretariat's real
   lines belong in the admin contact settings, not in the bundle.

   This page is the National Secretariat and nothing else (secretariat,
   2026-08-05). It used to carry WAQSN and YQSF tabs alongside; every other
   national body and all 37 chapters reach their audience through their own
   landing page, and two of them holding a seat here would fairly invite the
   rest to ask for one. Their blocks moved to WAQSN.jsx and YQSF.jsx, which is
   where the pattern already pointed — /contact-info still serves all three, so
   nothing was lost from the admin side. */
const FALLBACK = {
  national: {
    label: 'National Secretariat',
    phone1: '', phone2: '',
    email1: 'info@niqs.org.ng', email2: 'secretary@niqs.org.ng',
    /* The Plot 759 / Central Business District address this carried until
       2026-08-05 was stale. The secretariat confirmed the footer's — which had
       been disagreeing with this page for as long as both existed — as the
       current one. Same wording as Footer.jsx; if one moves, move both. */
    address: 'QS Olusegun Ajanlekoko House,\nNo. 24, NIQS Crescent, Mabushi District,\nAbuja, Nigeria',
    officeHours: 'Monday — Friday: 8:00 AM — 5:00 PM\nSaturday — Sunday: Closed',
    twitterUrl: '', facebookUrl: '', linkedinUrl: '',
  },
};

const SUBJECTS = ['General Inquiry', 'Membership', 'Examinations', 'Events', 'Chapters', 'WAQSN', 'YQSF', 'Partnership', 'Complaint', 'Other'];

function ContactBlock({ info }) {
  if (!info) return null;
  const rows = [
    info.phone1 || info.phone2 ? {
      icon: 'phone', title: 'Phone',
      lines: [info.phone1, info.phone2].filter(Boolean),
      hrefs: [`tel:${(info.phone1||'').replace(/\s/g,'')}`, `tel:${(info.phone2||'').replace(/\s/g,'')}`],
    } : null,
    info.email1 || info.email2 ? {
      icon: 'email', title: 'Email',
      lines: [info.email1, info.email2].filter(Boolean),
      hrefs: [`mailto:${info.email1}`, `mailto:${info.email2}`],
    } : null,
    info.address ? { icon: 'location', title: 'Address', lines: [info.address], plain: true } : null,
    info.officeHours ? { icon: 'clock', title: 'Office Hours', lines: [info.officeHours], plain: true } : null,
  ].filter(Boolean);

  const socials = [
    info.twitterUrl   && { label: 'Twitter / X', href: info.twitterUrl },
    info.facebookUrl  && { label: 'Facebook',    href: info.facebookUrl },
    info.linkedinUrl  && { label: 'LinkedIn',    href: info.linkedinUrl },
    info.instagramUrl && { label: 'Instagram',   href: info.instagramUrl },
  ].filter(Boolean);

  return (
    <>
      {rows.map((row, i) => (
        <div className="cii" key={i}>
          <h4><Icon name={row.icon} size="md" /> {row.title}</h4>
          {row.plain ? (
            <p style={{ whiteSpace: 'pre-line' }}>{row.lines[0]}</p>
          ) : (
            row.lines.map((l, j) => (
              <p key={j}><a href={row.hrefs[j]}>{l}</a></p>
            ))
          )}
        </div>
      ))}
      {socials.length > 0 && (
        <div className="cii">
          <h4><Icon name="web" size="sm" /> Follow Us</h4>
          <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '.4rem' }}>
            {socials.map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
                className="btn bo" style={{ padding: '5px 14px', fontSize: '.72rem' }}>{s.label}</a>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

export default function Contact() {
  const [contactData, setContactData] = useState(FALLBACK);
  const [form, setForm]               = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [status, setStatus]           = useState(null);
  const [submitting, setSubmitting]   = useState(false);

  useEffect(() => {
    API.get('/contact-info')
      .then(res => {
        if (res.data && Object.keys(res.data).length) {
          setContactData(prev => ({ ...prev, ...res.data }));
        }
      })
      .catch(() => {});
  }, []);

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      await API.post('/contact', { ...form, body: 'national' });
      setStatus('success');
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch {
      setStatus('error');
    } finally {
      setSubmitting(false);
    }
  };

  const info = contactData.national || FALLBACK.national;

  return (
    <>
      <PageHero
        label="Get in Touch"
        title="Contact Us"
        titleHighlight="Contact"
        backgroundImage="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1400&q=80&fit=crop"
      />

      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>

          <div style={{ marginBottom: '2rem' }}>
            <div className="ey">{info?.label || 'National Secretariat'}</div>
          </div>

          <div className="contlay">
            {/* Contact Info */}
            <div>
              <h2 className="sh" style={{ marginBottom: '1.8rem' }}>
                {/* Spelled out rather than "Reach NIQS" (secretariat, 2026-08-06).
                    The heading is the one place on the page the Institute names
                    itself, and an acronym there assumes the reader already knows
                    it — which a first-time visitor on a contact page does not. */}
                Reach the <em>Nigerian Institute of Quantity Surveyors</em>
              </h2>
              <ContactBlock info={info} />
            </div>

            {/* Contact Form */}
            <div className="cform">
              <h3>
                Send a Message to the Nigerian Institute of Quantity Surveyors
              </h3>

              {status === 'success' && (
                <div style={{ background: 'rgba(46,125,50,.1)', border: '1px solid rgba(46,125,50,.3)', color: '#2e7d32', borderRadius: 10, padding: '1rem', marginBottom: '1.2rem', fontSize: '.82rem' }}>
                  <Icon name="check" size="sm" /> Your message has been sent. We will get back to you shortly.
                </div>
              )}
              {status === 'error' && (
                <div style={{ background: 'rgba(198,40,40,.08)', border: '1px solid rgba(198,40,40,.2)', color: '#c62828', borderRadius: 10, padding: '1rem', marginBottom: '1.2rem', fontSize: '.82rem' }}>
                  <Icon name="close" size="sm" /> Failed to send. Please try again or contact us directly.
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="fg2">
                  <div className="fg">
                    <label className="flbl">Full Name *</label>
                    <input type="text" name="name" className="fi" placeholder="Your full name" value={form.name} onChange={handleChange} required />
                  </div>
                  <div className="fg">
                    <label className="flbl">Email Address *</label>
                    <input type="email" name="email" className="fi" placeholder="your.email@example.com" value={form.email} onChange={handleChange} required />
                  </div>
                </div>
                <div className="fg2">
                  <div className="fg">
                    <label className="flbl">Phone Number</label>
                    <input type="tel" name="phone" className="fi" placeholder="+234..." value={form.phone} onChange={handleChange} />
                  </div>
                  <div className="fg">
                    <label className="flbl">Subject *</label>
                    <select name="subject" className="fs" value={form.subject} onChange={handleChange} required>
                      <option value="" disabled>Select subject</option>
                      {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="fg">
                  <label className="flbl">Message *</label>
                  <textarea name="message" className="ft" placeholder="How can we help you?" rows={5} value={form.message} onChange={handleChange} required />
                </div>
                <button type="submit" className="bsub" disabled={submitting}>
                  {submitting ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
