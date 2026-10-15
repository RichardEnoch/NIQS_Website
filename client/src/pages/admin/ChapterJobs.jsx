/**
 * Chapter Jobs: live listings in one state, with tools for sharing them.
 *
 * State admins always see their own chapter's state (the server pins it, so
 * there is nothing to choose). Main and national admins pick a state first.
 * Sharing is the point: chapters pass listings on to members through
 * WhatsApp groups, LinkedIn and email, so each listing has its own share
 * buttons and the whole list can be copied as one plain-text message.
 */
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import useIsMobile from '../../hooks/useIsMobile';
import AdminHeader from '../../components/admin/AdminHeader';
import Icon from '../../components/common/Icon';
import { Pill } from '../../components/jobs/JobBits';
import { NIGERIAN_STATES, typeLabel, gradeLabel, fmtDate } from '../../data/jobBoard';
import { chapterJobs } from '../../api/jobsApi';

const NAVY = '#000066';
const GOLD = '#D9B650';

const jobUrl = (job) => `${window.location.origin}/jobs/${job._id}`;
const companyOf = (job) => job.employer?.companyName || job.company || '';
const gradeOf = (job) => (job.minGrade && job.minGrade !== 'none' ? job.minGradeLabel || gradeLabel(job.minGrade) : '');

/** Copy text, falling back to a hidden textarea where the Clipboard API is blocked. */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

/** One listing as a few lines of plain text. */
function listingText(job) {
  return [
    job.title,
    [companyOf(job), [job.location, job.state].filter(Boolean).join(', ')].filter(Boolean).join(', '),
    gradeOf(job) ? `Minimum grade: ${gradeOf(job)}` : '',
    job.deadline ? `Closes ${fmtDate(job.deadline)}` : '',
    jobUrl(job),
  ].filter(Boolean).join('\n');
}

/** The whole list, ready to paste into a chapter WhatsApp group. */
function digestText(state, jobs) {
  const head = `NIQS Job Board: ${jobs.length} live listing${jobs.length === 1 ? '' : 's'} in ${state} (${fmtDate(new Date())})`;
  const body = jobs.map((j, i) => `${i + 1}. ${listingText(j)}`).join('\n\n');
  return `${head}\n\n${body}\n\nSee every listing: ${window.location.origin}/jobs`;
}

export default function ChapterJobs() {
  const { admin } = useAuth();
  const isStateAdmin = admin?.role === 'state_admin';
  const isMobile = useIsMobile();

  const [state, setState] = useState('');
  const [data, setData] = useState(null);       // { state, chapter, jobs }
  const [loading, setLoading] = useState(isStateAdmin);
  const [error, setError] = useState('');

  useEffect(() => {
    // A state admin's chapter is fixed; anyone else waits for a choice.
    if (!isStateAdmin && !state) { setData(null); return; }
    let live = true;
    setLoading(true);
    setError('');
    chapterJobs(isStateAdmin ? undefined : state)
      .then((r) => { if (live) setData(r); })
      .catch((err) => { if (live) { setData(null); setError(err?.response?.data?.message || 'Could not load listings'); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [isStateAdmin, state]);

  const shownState = data?.state || state;
  const jobs = data?.jobs || [];
  const title = shownState ? `Jobs in ${shownState}` : 'Chapter Jobs';

  const copyAll = async () => {
    const ok = await copyText(digestText(shownState, jobs));
    if (ok) toast.success('Copied. Paste it into your chapter WhatsApp group.');
    else toast.error('Could not copy. Your browser blocked it.');
  };

  return (
    <div>
      <AdminHeader title={title} breadcrumbs={['Chapter Jobs']} />

      <div style={{ padding: isMobile ? '16px' : '24px 28px' }}>
        <p style={{ margin: '0 0 16px', fontSize: 14, color: '#5A6485', lineHeight: 1.55, maxWidth: 720 }}>
          Live listings on the NIQS Job Board{data?.chapter?.name ? ` for ${data.chapter.name}` : ''}.
          Share them with members so local roles reach local quantity surveyors.
          Every link goes to the listing on the NIQS website, where members apply.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 18 }}>
          {!isStateAdmin && (
            <div>
              <label htmlFor="cj-state" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>State</label>
              <select id="cj-state" value={state} onChange={(e) => setState(e.target.value)} style={selectStyle}>
                <option value="">Choose a state</option>
                {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {jobs.length > 0 && (
            <button type="button" onClick={copyAll} style={primaryBtn}>
              <Icon name="share" size={16} /> Copy all as a message
            </button>
          )}
        </div>

        {error ? (
          <Empty title="Could not load listings">{error}</Empty>
        ) : loading ? (
          <p role="status" style={{ color: '#5A6485', fontSize: 14 }}>Loading…</p>
        ) : !isStateAdmin && !state ? (
          <Empty title="Choose a state">Pick a state to see its live listings.</Empty>
        ) : jobs.length === 0 ? (
          <Empty title={`No live listings in ${shownState}`}>
            When an employer's listing for {shownState} is approved, it appears here ready to share.
          </Empty>
        ) : (
          <>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: '#6b7280' }}>
              {jobs.length} live listing{jobs.length === 1 ? '' : 's'}
            </p>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 12 }}>
              {jobs.map((j) => <ListingCard key={j._id} job={j} />)}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function ListingCard({ job }) {
  const url = jobUrl(job);
  const grade = gradeOf(job);
  const text = `${job.title} at ${companyOf(job)}`;

  const copy = async () => {
    const ok = await copyText(url);
    if (ok) toast.success('Link copied');
    else toast.error('Could not copy. Your browser blocked it.');
  };

  const mailto = `mailto:?subject=${encodeURIComponent(`Job: ${text}`)}&body=${encodeURIComponent(
    `This role is on the NIQS Job Board:\n\n${listingText(job)}\n`,
  )}`;

  return (
    <li style={{ background: '#fff', borderRadius: 12, border: `1.5px solid ${job.featured ? '#ecd9a0' : '#DDE3F0'}`, padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: '0 0 4px', fontSize: 16, color: NAVY, lineHeight: 1.3 }}>
            <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: NAVY, textDecoration: 'none' }}>{job.title}</a>
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#5A6485', lineHeight: 1.6 }}>
            <Icon name="office" size="sm" /> {companyOf(job)}
            {' · '}
            <Icon name="location" size="sm" /> {[job.location, job.state].filter(Boolean).join(', ')}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: '#5A6485' }}>
            {typeLabel(job.type)}
            {grade ? ` · Minimum grade: ${grade}` : ' · Open to all grades'}
            {job.deadline ? ` · Closes ${fmtDate(job.deadline)}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {job.featured && <Pill tone="gold">Featured</Pill>}
          {job.membersOnly && <Pill tone="navy">Members only</Pill>}
        </div>
      </div>

      <div role="group" aria-label={`Share ${job.title}`} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
        <button type="button" onClick={copy} style={shareBtn}>
          <Icon name="link" size={15} /> Copy link
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`}
          target="_blank" rel="noopener noreferrer" style={shareBtn}
          aria-label={`Share ${job.title} on WhatsApp`}
        >
          <Icon name="share" size={15} /> WhatsApp
        </a>
        <a
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
          target="_blank" rel="noopener noreferrer" style={shareBtn}
          aria-label={`Share ${job.title} on LinkedIn`}
        >
          <Icon name="share" size={15} /> LinkedIn
        </a>
        <a href={mailto} style={shareBtn} aria-label={`Email ${job.title}`}>
          <Icon name="email" size={15} /> Email
        </a>
      </div>
    </li>
  );
}

function Empty({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '32px 20px', textAlign: 'center', border: '1.5px solid #DDE3F0' }}>
      <p style={{ color: NAVY, fontSize: 15, fontWeight: 700, margin: 0 }}>{title}</p>
      {children && <p style={{ color: '#5A6485', fontSize: 13.5, margin: '6px 0 0' }}>{children}</p>}
    </div>
  );
}

const selectStyle = { padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, color: '#111827', background: '#fff', minWidth: 200, maxWidth: '100%' };
const primaryBtn = { padding: '9px 16px', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: 'pointer', background: NAVY, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6, boxShadow: `inset 0 -2px 0 ${GOLD}` };
const shareBtn = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6,
  border: '1.5px solid #DDE3F0', background: '#fff', color: '#374151', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', textDecoration: 'none',
};
