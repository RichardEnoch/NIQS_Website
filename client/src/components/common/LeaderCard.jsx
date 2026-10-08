import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from './Icon';
import { shortName } from '../../utils/names';

/* Derive a chapter page link from a chapter-chairman title, e.g.
   "Nasarawa State Chapter Chairman" / "Lagos Chapter Chairman" / "FCT Chapter
   Chairman" → "/chapters/nasarawa-chapter". Returns null for non-chapter roles
   or the bare "Chapter Chairman" (already on the chapter page). */
function chapterLinkFromTitle(title) {
  if (!title || !/chapter chairman/i.test(title)) return null;
  const state = title
    .replace(/\s*(state\s+)?chapter chairman.*/i, '')
    .trim();
  if (!state) return null;
  const slug = state.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `/chapters/${slug}-chapter`;
}

/* Fallback shown when a member has no portrait yet — initials on brand navy,
   never a stock stranger's face. Sized by the circular .lcard-img-wrap. */
function Initials({ name }) {
  const initials = (name || '')
    .replace(/^(QS|Surv\.?|Dr\.?|Prof\.?)\s+/gi, '')
    .split(/\s+/)
    .filter(w => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
  return <div className="lcard-initials" aria-hidden="true">{initials || 'QS'}</div>;
}

/**
 * Leadership card used on Council, Trustees, chapter and body pages.
 * Portrait is the 132px circle the Past Presidents page uses — the review
 * (Oct 2026) asked for one smaller, uniform frame everywhere.
 *
 * Hovering used to pop the full uncropped portrait up above the card, so a
 * viewer could see what the 4:4.6 crop had trimmed. It was read as a fault
 * rather than a feature — a second face appearing over the card above it,
 * overlapping the neighbour — so it is gone. The portraits are all normalised
 * to the same canvas and eye line now, which is what the pop-up was
 * compensating for. The quiet scale on hover stays, in CSS.
 */
export default function LeaderCard({ member, linkTo, hideState = false, pageContact = null }) {
  const m = member;
  const href = linkTo || chapterLinkFromTitle(m.title);

  const nameText = shortName(m.name, { override: m.shortName });
  const same = (a, b) => a && b && String(a).replace(/\s+/g, '').toLowerCase() === String(b).replace(/\s+/g, '').toLowerCase();
  const email = same(m.email, pageContact?.email) ? null : m.email;
  const phone = same(m.phone, pageContact?.phone) ? null : m.phone;
  const nameEl = href
    ? <Link to={href} className="lcard-name" title={m.name} style={{ display: 'inline-block', color: 'var(--color-navy)', textDecoration: 'none', borderBottom: '1.5px solid var(--color-gold)', cursor: 'pointer' }}>{nameText}</Link>
    : <div className="lcard-name" title={m.name}>{nameText}</div>;

  return (
    <motion.div
      className="lcard"
      style={{ position: 'relative' }}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      whileHover={{ y: -5 }}
    >
      <div className="lcard-img-wrap">
        {m.image ? (
          /* Plain img: the hover scale is the .lcard:hover .lcard-img rule.
             It was a motion.img before, whose inline transform silently beat
             that rule — two zooms declared, one ever running. */
          <img className="lcard-img" src={m.image} alt={m.name} />
        ) : (
          <Initials name={m.name} />
        )}
      </div>
      <div className="lcard-body">
        {nameEl}
        <div className="lcard-role">{m.title}</div>
        {m.state && !hideState && <div className="lcard-state">{m.state}</div>}
        {href && (
          <Link to={href} style={{ display: 'inline-block', marginTop: '.4rem', fontSize: '.66rem', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-gold)', textDecoration: 'none' }}>
            View chapter →
          </Link>
        )}
        {(email || phone) && (
          <div style={{ marginTop: '.5rem', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {email && (
              <a href={`mailto:${email}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, wordBreak: 'break-all', fontSize: '.7rem', color: 'var(--color-navy)', fontWeight: 600, textDecoration: 'none' }}>
                <Icon name="email" size="sm" /> {email}
              </a>
            )}
            {phone && (
              <a href={`tel:${phone.split(',')[0].trim()}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, wordBreak: 'break-all', fontSize: '.7rem', color: 'var(--color-txt-2)', fontWeight: 600, textDecoration: 'none' }}>
                <Icon name="phone" size="sm" /> {phone}
              </a>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
