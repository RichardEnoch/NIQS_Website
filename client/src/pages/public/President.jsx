import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageHero from '../../components/common/PageHero';
import API from '../../api/axios';

export default function President() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/president')
      .then(res => { if (res.data?._id) setData(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <>
        <PageHero label="Leadership" title="The President" titleHighlight="President"
          backgroundImage="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1400&q=80&fit=crop" />
        <div className="ct" style={{ padding: '5rem 0', textAlign: 'center', color: 'var(--text3)', fontSize: '.9rem' }}>
          {loading ? 'Loading the President’s message…' : 'The President’s profile will be available shortly.'}
        </div>
      </>
    );
  }

  /* Newest first; undated entries sink to the end rather than jumping the queue. */
  const speeches = [...(data.speeches || [])].sort(
    (a, b) => (b.date ? new Date(b.date) : 0) - (a.date ? new Date(a.date) : 0)
  );

  /* Name is a link if LinkedIn URL is set, otherwise plain text */
  const NameEl = data.linkedIn ? (
    <a
      href={data.linkedIn}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: 'var(--navy)', textDecoration: 'none', borderBottom: '1.5px solid var(--gold)', paddingBottom: 1, cursor: 'pointer' }}
      title="View LinkedIn Profile"
    >
      {data.name}
    </a>
  ) : (
    <span>{data.name}</span>
  );

  return (
    <>
      {/* ── HERO — uses the president photo as background ── */}
      <PageHero
        label="Leadership"
        title="The President"
        titleHighlight="President"
        backgroundImage={data.photo}
      />

      {/* ── MAIN SECTION ── */}
      <section style={{ background: '#fff' }}>
        <div className="ct">
          <div className="tc2">

            {/* ── LEFT — portrait + name card ──
                The portrait was capped at 320x400 inside a column half the
                content width, so it sat small against a right-hand column
                carrying two paragraphs, a pull quote and two buttons. It now
                fills its column up to 440px on a 4:5 ratio, and the name plate
                below shares that width so the two stack as one block rather
                than a small picture with a wider caption under it.

                The hover pop-up that used to raise the uncropped portrait over
                this one is gone, for the reason it went from the NEC cards. */}
            <div className="rl" style={{ textAlign: 'center' }}>
              <motion.div
                style={{ position: 'relative', width: '100%', maxWidth: 440, margin: '0 auto' }}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                whileHover={{ y: -5 }}
              >
                <img
                  src={data.photo}
                  alt="NIQS President"
                  style={{
                    borderRadius: 16,
                    width: '100%',
                    aspectRatio: '4 / 5',
                    height: 'auto',
                    objectFit: 'cover',
                    objectPosition: 'center 20%',
                    boxShadow: 'var(--sh2)',
                    border: '3px solid var(--borderg)',
                    display: 'block',
                  }}
                />
              </motion.div>
              <div style={{ marginTop: '1.2rem', width: '100%', maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
                <h3 style={{
                  fontFamily: "'Bricolage Grotesque', sans-serif",
                  fontSize: '1.3rem',
                  fontWeight: 800,
                  color: 'var(--navy)',
                  letterSpacing: '-.03em',
                  marginBottom: 0,
                }}>
                  {NameEl}
                </h3>
                <p style={{ color: 'var(--gold)', fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginTop: '.3rem' }}>
                  {data.title}
                </p>
                <p style={{ fontSize: '.74rem', color: 'var(--text3)', marginTop: '.2rem' }}>
                  {data.tenure}
                </p>
                {data.linkedIn && (
                  <a
                    href={data.linkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '.4rem',
                      marginTop: '.8rem',
                      fontSize: '.72rem',
                      fontWeight: 600,
                      color: 'var(--gold)',
                      textDecoration: 'none',
                      border: '1px solid var(--borderg)',
                      borderRadius: 6,
                      padding: '.3rem .8rem',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    LinkedIn Profile
                  </a>
                )}
              </div>
            </div>

            {/* ── RIGHT — message ── */}
            <div className="rr">
              <div className="ey">Leadership</div>
              <h2 className="sh">Meet the <em>President</em></h2>

              <p style={{ fontSize: '.9rem', lineHeight: 1.88, color: 'var(--text2)', marginBottom: '1rem' }}>
                {data.paragraph1}
              </p>
              <p style={{ fontSize: '.9rem', lineHeight: 1.88, color: 'var(--text2)', marginBottom: '1rem' }}>
                {data.paragraph2}
              </p>

              {/* Quote block — exact style from HTML */}
              <div style={{
                borderLeft: '3px solid var(--gold)',
                padding: '1.2rem 1.2rem 1.2rem 1.4rem',
                margin: '1.5rem 0',
                background: 'var(--off)',
                borderRadius: '0 10px 10px 0',
              }}>
                <p style={{ fontSize: '.88rem', color: 'var(--text2)', lineHeight: 1.7, fontWeight: 500, margin: 0 }}>
                  {data.quote}
                </p>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.7rem' }}>
                {data.speechBody && (
                  <a
                    href="#inaugural-speech"
                    className="btn bp"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('inaugural-speech')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Read Full Inaugural Speech
                  </a>
                )}
                {speeches.length > 0 && (
                  <a
                    href="#speeches"
                    className="btn bo"
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById('speeches')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    Speeches &amp; Addresses
                  </a>
                )}
                <Link to="/council" className="btn bo">Meet the Full Council</Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SPEECHES & ADDRESSES ──
          The President's speeches on other platforms (review, Oct 2026). Only
          drawn once there is at least one beyond the inaugural speech — a
          "list" holding the single speech already linked above would just
          repeat it. The inaugural speech leads when it exists. */}
      {speeches.length > 0 && (
        <section id="speeches" style={{ background: '#fff', padding: '4rem 0', scrollMarginTop: 90 }}>
          <div className="ct">
            <div className="ey">On Record</div>
            <h2 className="sh">Speeches &amp; <em>Addresses</em></h2>
            <p className="sd" style={{ marginBottom: '2rem' }}>
              Keynotes, addresses and interviews the President has given across the
              profession, government and the media.
            </p>
            <div className="spk-grid">
              {data.speechBody && (
                <SpeechCard
                  featured
                  speech={{ title: data.speechTitle || 'Inaugural Address', platform: data.speechSubtitle }}
                  onRead={() => document.getElementById('inaugural-speech')?.scrollIntoView({ behavior: 'smooth' })}
                />
              )}
              {speeches.map(s => <SpeechCard key={s._id || s.title} speech={s} />)}
            </div>
          </div>
        </section>
      )}

      {/* ── INAUGURAL SPEECH — shown only when the admin has published one ── */}
      {data.speechBody && (
        <section id="inaugural-speech" style={{ background: 'var(--off)', padding: '4rem 0', scrollMarginTop: 90 }}>
          <div className="ct" style={{ maxWidth: 820 }}>
            <div className="ey" style={{ textAlign: 'center' }}>From the President&rsquo;s Desk</div>
            <h2 className="sh" style={{ textAlign: 'center' }}>
              {data.speechTitle || <>The President&rsquo;s <em>Address</em></>}
            </h2>
            {data.speechSubtitle && (
              <p style={{
                textAlign: 'center', color: 'var(--text3)', fontSize: '.78rem',
                fontWeight: 600, letterSpacing: '.04em', marginTop: '.4rem', marginBottom: '2.2rem',
              }}>
                {data.speechSubtitle}
              </p>
            )}
            <SpeechBody text={data.speechBody} />
          </div>
        </section>
      )}
    </>
  );
}

/* One entry in Speeches & Addresses. A speech with full text opens in place;
   one held elsewhere links out to its PDF or video. */
function SpeechCard({ speech: s, featured, onRead }) {
  const [open, setOpen] = useState(false);
  const date = s.date
    ? new Date(s.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const meta = [s.platform, date].filter(Boolean).join(' · ');

  return (
    <article className={`spk${featured ? ' spk-ft' : ''}`}>
      {featured && <div className="spk-tag">Inaugural Speech</div>}
      {meta && <div className="spk-meta">{meta}</div>}
      <h3 className="spk-title">{s.title}</h3>
      {s.excerpt && <p className="spk-ex">{s.excerpt}</p>}
      <div className="spk-actions">
        {onRead && <button type="button" className="btn bp" onClick={onRead}>Read Speech</button>}
        {!onRead && s.body && (
          <button type="button" className="btn bp" onClick={() => setOpen(o => !o)} aria-expanded={open}>
            {open ? 'Close' : 'Read Speech'}
          </button>
        )}
        {s.pdfUrl && <a className="btn bo" href={s.pdfUrl} target="_blank" rel="noopener noreferrer">Download PDF</a>}
        {s.videoUrl && <a className="btn bo" href={s.videoUrl} target="_blank" rel="noopener noreferrer">Watch</a>}
      </div>
      {open && <div className="spk-body"><SpeechBody text={s.body} /></div>}
    </article>
  );
}

/* Renders the speech: blocks separated by blank lines; a block whose first
   line starts with "N." becomes a numbered programme card. */
function SpeechBody({ text }) {
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
  return (
    <div>
      {blocks.map((block, i) => {
        const lines = block.split('\n');
        const m = lines[0].match(/^(\d+)\.\s*(.+)$/);
        if (m) {
          const body = lines.slice(1).join(' ').trim();
          return (
            <div key={i} style={{
              background: '#fff', border: '1px solid var(--borderg)', borderRadius: 12,
              padding: '1.1rem 1.3rem', marginBottom: '.85rem', display: 'flex', gap: '1rem',
            }}>
              <div style={{
                flexShrink: 0, width: 34, height: 34, borderRadius: '50%',
                background: 'var(--navy)', color: 'var(--gold)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '.8rem', fontWeight: 800,
              }}>
                {m[1]}
              </div>
              <div>
                <h4 style={{
                  fontSize: '.82rem', fontWeight: 800, color: 'var(--navy)',
                  letterSpacing: '.03em', textTransform: 'uppercase', margin: '0 0 .35rem',
                }}>
                  {m[2]}
                </h4>
                {body && (
                  <p style={{ fontSize: '.86rem', lineHeight: 1.8, color: 'var(--text2)', margin: 0 }}>
                    {body}
                  </p>
                )}
              </div>
            </div>
          );
        }
        return (
          <p key={i} style={{ fontSize: '.9rem', lineHeight: 1.88, color: 'var(--text2)', marginBottom: '1.1rem' }}>
            {block}
          </p>
        );
      })}
    </div>
  );
}
