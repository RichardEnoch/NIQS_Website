/**
 * Small pieces shared by every job board screen: status pills, the
 * membership verification badge, and the listing card. Kept together so the
 * public board, the member portal, the employer area and the admin panel
 * describe a listing in the same words and colours.
 */
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import {
  TONES, LISTING_STATUS, APPLICATION_STATUS, verificationText, typeLabel,
  salaryText, daysLeft, fmtDate,
} from '../../data/jobBoard';

export function Pill({ tone = 'grey', children, title, style }) {
  const c = TONES[tone] || TONES.grey;
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: '.66rem', fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
        padding: '3px 9px', borderRadius: 20, whiteSpace: 'nowrap',
        background: c.bg, color: c.color, border: `1px solid ${c.border}`, ...style,
      }}
    >
      {children}
    </span>
  );
}

export function ListingStatusPill({ status }) {
  const s = LISTING_STATUS[status] || { label: status, tone: 'grey' };
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

export function ApplicationStatusPill({ status }) {
  const s = APPLICATION_STATUS[status] || { label: status, tone: 'grey' };
  return <Pill tone={s.tone}>{s.label}</Pill>;
}

/** What the register said about an applicant. `compact` = pill only. */
export function VerificationBadge({ verification, compact = false }) {
  const v = verificationText(verification);
  if (compact) {
    return (
      <Pill tone={v.tone} title={v.detail}>
        {verification?.verified && <Icon name="userVerified" size={14} />}
        {v.title}
      </Pill>
    );
  }
  const c = TONES[v.tone];
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px', borderRadius: 10, background: c.bg, border: `1px solid ${c.border}` }}>
      <span style={{ color: c.color, flexShrink: 0, marginTop: 1 }}>
        <Icon name={verification?.verified ? 'userVerified' : 'shield'} size="sm" />
      </span>
      <div>
        <div style={{ fontSize: '.8rem', fontWeight: 700, color: c.color }}>{v.title}</div>
        <div style={{ fontSize: '.74rem', color: 'var(--color-txt-2)', lineHeight: 1.5 }}>{v.detail}</div>
        {verification?.membershipNumber && (
          <div style={{ fontSize: '.7rem', color: 'var(--color-txt-3)', marginTop: 2 }}>Membership no. {verification.membershipNumber}</div>
        )}
      </div>
    </div>
  );
}

/** Marks shown beside a company name. */
export function EmployerMarks({ job }) {
  const e = job.employer;
  return (
    <>
      {e?.registeredFirm && (
        <Pill tone="blue" title={e.qsFirm?.name ? `Listed in Find a QS Firm as ${e.qsFirm.name}` : 'Listed in the Find a QS Firm directory'}>
          <Icon name="office" size={13} /> Registered QS Firm
        </Pill>
      )}
      {e?.isPartner && <Pill tone="gold">NIQS Partner</Pill>}
    </>
  );
}

const FALLBACK_LOGO = 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=80&h=80&fit=crop';

/**
 * One row on the board. `onSave` shows a save star for signed-in members;
 * `saved` is whether it is already saved.
 */
export function JobCard({ job, onSave, saved, to }) {
  const left = daysLeft(job.deadline);
  const salary = salaryText(job);
  return (
    <div
      className="jrow"
      style={{
        position: 'relative',
        borderColor: job.featured ? 'var(--color-bdr-gold)' : undefined,
        background: job.featured ? 'linear-gradient(90deg, rgba(217,182,80,.08), #fff 40%)' : undefined,
      }}
    >
      <img
        src={job.logo || FALLBACK_LOGO}
        alt=""
        style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: '1px solid var(--color-bdr)' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: '.25rem' }}>
          <Link
            to={to || `/jobs/${job._id}`}
            style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '.97rem', color: 'var(--color-navy)', letterSpacing: '-.02em', textDecoration: 'none' }}
          >
            {/* The whole card is clickable through this link's ::after. */}
            <span style={{ position: 'absolute', inset: 0 }} aria-hidden="true" />
            {job.title}
          </Link>
          {job.featured && <Pill tone="gold"><Icon name="star" size={12} /> Featured</Pill>}
        </div>
        <div style={{ display: 'flex', gap: '.9rem', flexWrap: 'wrap', fontSize: '.76rem', color: 'var(--color-txt-3)', alignItems: 'center' }}>
          <span><Icon name="office" size="sm" /> {job.employer?.companyName || job.company}</span>
          <span><Icon name="location" size="sm" /> {[job.location, job.state].filter(Boolean).join(', ')}</span>
          {salary && <span><Icon name="money" size="sm" /> {salary}</span>}
          {job.minGrade && job.minGrade !== 'none' && <span><Icon name="education" size="sm" /> {job.minGradeLabel || job.minGrade}</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: '.45rem' }}>
          <EmployerMarks job={job} />
          {job.membersOnly && <Pill tone="navy">Members only</Pill>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.4rem', flexShrink: 0, position: 'relative' }}>
        <Pill tone="grey">{typeLabel(job.type)}</Pill>
        {left !== null && (
          <span style={{ fontSize: '.68rem', fontWeight: 500, color: left <= 7 ? '#dc2626' : 'var(--color-txt-3)' }}>
            {left <= 0 ? 'Closed' : `Closes ${fmtDate(job.deadline)}`}
          </span>
        )}
        {onSave && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSave(job); }}
            aria-pressed={Boolean(saved)}
            aria-label={saved ? 'Remove from saved jobs' : 'Save this job'}
            title={saved ? 'Saved' : 'Save'}
            style={{
              border: '1px solid var(--color-bdr)', background: saved ? 'var(--color-gold-xl)' : '#fff',
              color: saved ? '#8a6d1a' : 'var(--color-txt-3)', borderRadius: 8, padding: '4px 8px',
              cursor: 'pointer', fontSize: '.7rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4,
            }}
          >
            <Icon name="star" size={14} /> {saved ? 'Saved' : 'Save'}
          </button>
        )}
      </div>
    </div>
  );
}
