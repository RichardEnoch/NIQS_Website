import { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import Icon from '../../components/common/Icon';
import {
  Pill, ApplicationStatusPill, VerificationBadge, EmployerMarks,
} from '../../components/jobs/JobBits';
import { useAuth } from '../../context/AuthContext';
import {
  getJob, saveJob, unsaveJob, applyToJob, getMyVerification, listMyCvs, uploadCv, getCareerProfile,
} from '../../api/jobsApi';
import {
  GRADES, gradeLabel, sectorLabel, typeLabel, salaryText, fmtDate, daysLeft, TRACKS,
} from '../../data/jobBoard';

const FALLBACK_LOGO = 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=80&h=80&fit=crop';
const CV_MAX = 2 * 1024 * 1024;
const CV_EXT = /\.(pdf|docx?)$/i;
const NOTE_MAX = 4000;

const h3Style = { fontSize: '.85rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' };
const fieldStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--color-bdr)',
  background: '#fff', fontSize: '.82rem', color: 'var(--color-txt-2)', fontFamily: 'inherit',
};
const labelStyle = { display: 'block', fontSize: '.74rem', fontWeight: 700, color: 'var(--color-navy)', marginBottom: 5 };

function MapEmbed({ location }) {
  const src = `https://maps.google.com/maps?q=${encodeURIComponent(location)}&output=embed&z=13`;
  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e5e7eb', height: 220 }}>
      <iframe
        title="Job location map"
        src={src}
        width="100%"
        height="220"
        style={{ border: 0, display: 'block' }}
        allowFullScreen=""
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
    </div>
  );
}

/** Index on the grade ladder; -1 for anything off it (technician, unknown). */
const gradeRank = (g) => GRADES.findIndex((x) => x.value === g);

/** Below the listing's minimum? Only says yes when we know the member's grade. */
function clearlyBelow(memberGrade, minGrade) {
  if (!minGrade || minGrade === 'none' || !memberGrade) return false;
  const have = gradeRank(memberGrade);
  return have === -1 || have < gradeRank(minGrade);
}

const withProtocol = (url) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

/* ── The inline application form for a signed-in member ── */
function ApplyForm({ job, user, onApplied }) {
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState(null);
  const [cvs, setCvs] = useState([]);
  const [profile, setProfile] = useState(null);
  const [cv, setCv] = useState('');
  const [shareProfile, setShareProfile] = useState(false);
  const [phone, setPhone] = useState(user?.phone || '');
  const [coverNote, setCoverNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.allSettled([getMyVerification(), listMyCvs(), getCareerProfile()]).then(([v, c, p]) => {
      if (v.status === 'fulfilled') setVerification(v.value?.verification || null);
      const files = c.status === 'fulfilled' ? c.value?.files || [] : [];
      setCvs(files);
      const prof = p.status === 'fulfilled' ? p.value?.profile || null : null;
      setProfile(prof);
      // Start with the CV on the member's profile, else their newest upload.
      const profileCv = prof?.cv?._id || prof?.cv;
      setCv(files.some((f) => f._id === profileCv) ? profileCv : files[0]?._id || '');
      setLoading(false);
    });
  }, []);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!CV_EXT.test(file.name)) { toast.error('Upload your CV as a PDF or Word document'); return; }
    if (file.size > CV_MAX) { toast.error('CV files must be 2 MB or smaller'); return; }
    setUploading(true);
    try {
      const saved = await uploadCv(file);
      setCvs((list) => [saved, ...list]);
      setCv(saved._id);
      toast.success('CV uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!cv && !shareProfile && !coverNote.trim()) {
      setError('Attach a CV, share your career profile, or write a note to the employer.');
      return;
    }
    setSending(true);
    try {
      const { application } = await applyToJob(job._id, { coverNote: coverNote.trim(), cv: cv || undefined, phone: phone.trim(), shareProfile });
      toast.success('Application sent');
      onApplied(application, true);
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data || {};
      let msg = data.message || 'Your application could not be sent. Please try again.';
      if (status === 403 && data.code === 'members_only') msg = `${data.message} Contact the NIQS Secretariat if your record is missing.`;
      if (status === 403 && data.code === 'register_check') msg = `${data.message} The Secretariat can check your record.`;
      if (status === 403 && data.code === 'grade') msg = `${data.message} Your recorded grade does not meet it.`;
      if (status === 409 && data.application) onApplied(data.application, false);
      setError(msg);
      toast.error(data.message || 'Application not sent');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <p style={{ fontSize: '.8rem', color: 'var(--color-txt-3)' }}>Loading your details…</p>;

  const memberGrade = verification?.grade || user?.membershipType;
  const below = clearlyBelow(memberGrade, job.minGrade);

  return (
    <form onSubmit={submit} noValidate>
      <h3 style={{ margin: '0 0 6px', fontSize: '.95rem', fontWeight: 700, color: 'var(--color-navy)' }}>Apply for this role</h3>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: '.7rem', color: 'var(--color-txt-3)', marginBottom: 5 }}>This is what the employer will see:</div>
        <VerificationBadge verification={verification || {}} />
      </div>

      {below && (
        <div role="alert" style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#b45309', borderRadius: 8, padding: '10px 12px', fontSize: '.78rem', lineHeight: 1.5, marginBottom: 14 }}>
          <Icon name="warning" size="sm" /> This role asks for at least {gradeLabel(job.minGrade)}. Your recorded grade is {gradeLabel(memberGrade) || 'not stated'}, so this application is likely to be refused.
        </div>
      )}

      {/* CV */}
      <fieldset style={{ border: 'none', padding: 0, margin: '0 0 14px' }}>
        <legend style={labelStyle}>CV</legend>
        {cvs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
            {cvs.map((f) => (
              <label key={f._id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.8rem', color: 'var(--color-txt-2)', cursor: 'pointer', minWidth: 0 }}>
                <input type="radio" name="cv" value={f._id} checked={cv === f._id} onChange={() => setCv(f._id)} />
                <Icon name="file" size="sm" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filename}</span>
              </label>
            ))}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.8rem', color: 'var(--color-txt-3)', cursor: 'pointer' }}>
              <input type="radio" name="cv" value="" checked={!cv} onChange={() => setCv('')} />
              Do not attach a CV
            </label>
          </div>
        )}
        <label className="btn bo" style={{ position: 'relative', padding: '.5rem .9rem', fontSize: '.74rem', cursor: uploading ? 'wait' : 'pointer' }}>
          <Icon name="upload" size="sm" /> {uploading ? 'Uploading…' : cvs.length ? 'Upload a different CV' : 'Upload your CV'}
          <input type="file" accept=".pdf,.doc,.docx" onChange={onFile} disabled={uploading} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
        </label>
        <div style={{ fontSize: '.7rem', color: 'var(--color-txt-3)', marginTop: 5 }}>PDF or Word, 2 MB at most. Only this employer can open it.</div>
      </fieldset>

      {profile && (
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '.8rem', color: 'var(--color-txt-2)', marginBottom: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={shareProfile} onChange={(e) => setShareProfile(e.target.checked)} style={{ marginTop: 3 }} />
          <span>Share my career profile with this employer</span>
        </label>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle} htmlFor="ap-phone">Phone</label>
        <input id="ap-phone" type="tel" style={fieldStyle} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={labelStyle} htmlFor="ap-note">Note to the employer</label>
        <textarea
          id="ap-note"
          rows={6}
          maxLength={NOTE_MAX}
          style={{ ...fieldStyle, resize: 'vertical' }}
          value={coverNote}
          onChange={(e) => setCoverNote(e.target.value)}
          aria-describedby="ap-note-count"
        />
        <div id="ap-note-count" style={{ fontSize: '.68rem', color: 'var(--color-txt-3)', textAlign: 'right' }}>{coverNote.length} / {NOTE_MAX}</div>
      </div>

      {error && (
        <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', borderRadius: 8, padding: '10px 12px', fontSize: '.78rem', lineHeight: 1.5, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <button type="submit" className="btn bp" disabled={sending || uploading} style={{ width: '100%', justifyContent: 'center', opacity: sending ? 0.7 : 1 }}>
        {sending ? 'Sending…' : 'Send application'}
      </button>
    </form>
  );
}

/* ── The right-hand panel: what this visitor can do about this listing ── */
function ApplyPanel({ job, closed, onApplied, justApplied }) {
  const { user, employer, admin } = useAuth();
  const location = useLocation();
  const mine = job.myApplication;

  const box = (tone, children) => (
    <section
      aria-label="Apply"
      style={{
        background: tone === 'gold' ? '#fff7ed' : '#f8fafc',
        border: `1px solid ${tone === 'gold' ? '#fed7aa' : 'var(--color-bdr)'}`,
        borderRadius: 12, padding: '18px 20px',
      }}
    >
      {children}
    </section>
  );

  if (closed) {
    return box('grey', <p style={{ margin: 0, fontSize: '.82rem', color: 'var(--color-txt-2)' }}>Applications are closed for this listing.</p>);
  }

  if (job.applyMethod === 'external') {
    return box('grey', (
      <>
        <h3 style={{ margin: '0 0 6px', fontSize: '.95rem', fontWeight: 700, color: 'var(--color-navy)' }}>How to apply</h3>
        <p style={{ margin: '0 0 14px', fontSize: '.8rem', color: 'var(--color-txt-2)', lineHeight: 1.6 }}>
          This employer takes applications on their own website.
        </p>
        {job.applicationLink ? (
          <a href={withProtocol(job.applicationLink)} target="_blank" rel="noopener noreferrer" className="btn bp" style={{ width: '100%', justifyContent: 'center' }}>
            Apply on the employer's site <Icon name="link" size="sm" />
          </a>
        ) : (
          <p style={{ margin: 0, fontSize: '.78rem', color: 'var(--color-txt-3)' }}>The employer has not given an application link yet.</p>
        )}
      </>
    ));
  }

  if (employer) {
    return box('grey', (
      <>
        <h3 style={{ margin: '0 0 6px', fontSize: '.95rem', fontWeight: 700, color: 'var(--color-navy)' }}>You are signed in as an employer</h3>
        <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--color-txt-2)', lineHeight: 1.6 }}>
          Only NIQS members can apply here. <Link to="/employer" style={{ color: 'var(--color-navy)', fontWeight: 600 }}>Go to your employer area</Link>.
        </p>
      </>
    ));
  }

  if (admin) {
    return box('grey', (
      <p style={{ margin: 0, fontSize: '.8rem', color: 'var(--color-txt-2)', lineHeight: 1.6 }}>
        You are signed in as an administrator. Members apply here from their own accounts.
      </p>
    ));
  }

  if (!user) {
    return box('gold', (
      <>
        <h3 style={{ margin: '0 0 6px', fontSize: '.95rem', fontWeight: 700, color: '#b45309' }}>
          <Icon name="lock" size="sm" /> {job.membersOnly ? 'Members only' : 'Apply as a member'}
        </h3>
        <p style={{ margin: '0 0 14px', fontSize: '.8rem', color: 'var(--color-txt-2)', lineHeight: 1.6 }}>
          Sign in to your NIQS member account to apply. The employer will see your NIQS grade with your application.
        </p>
        <Link to={`/login?next=${encodeURIComponent(location.pathname)}`} className="btn bg" style={{ width: '100%', justifyContent: 'center' }}>
          Sign in as a member to apply
        </Link>
        <p style={{ margin: '12px 0 0', fontSize: '.72rem', color: 'var(--color-txt-3)', lineHeight: 1.5 }}>
          Member accounts are set up by NIQS. If you do not have one, contact your state chapter.
        </p>
      </>
    ));
  }

  if (mine && mine.status !== 'withdrawn') {
    return box('grey', (
      <>
        {justApplied && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#15803d', fontWeight: 700, fontSize: '.88rem', marginBottom: 8 }}>
            <Icon name="check" size="sm" /> Your application has been sent
          </div>
        )}
        <p style={{ margin: '0 0 10px', fontSize: '.82rem', color: 'var(--color-txt-2)', lineHeight: 1.7 }}>
          You applied on {fmtDate(mine.createdAt)}. Status: <ApplicationStatusPill status={mine.status} />
        </p>
        <p style={{ margin: '0 0 14px', fontSize: '.76rem', color: 'var(--color-txt-3)', lineHeight: 1.5 }}>
          We will email you when the employer updates it.
        </p>
        <Link to="/portal/jobs" className="btn bo" style={{ width: '100%', justifyContent: 'center' }}>Track your applications</Link>
      </>
    ));
  }

  return box('grey', <ApplyForm job={job} user={user} onApplied={onApplied} />);
}

export default function JobDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [status, setStatus] = useState('loading');
  const [saved, setSaved] = useState(false);
  const [justApplied, setJustApplied] = useState(false);

  useEffect(() => {
    let live = true;
    setStatus('loading');
    setJustApplied(false);
    getJob(id)
      .then((data) => {
        if (!live) return;
        setJob(data);
        setSaved(Boolean(data.saved));
        setStatus('ready');
      })
      .catch((err) => {
        if (!live) return;
        setStatus(err.response?.status === 404 ? 'notfound' : 'error');
      });
    return () => { live = false; };
    // Reload when the visitor signs in, so myApplication and saved arrive.
  }, [id, user?._id]);

  useEffect(() => {
    if (!job?.title) return undefined;
    const before = document.title;
    document.title = `${job.title} — NIQS — Nigerian Institute of Quantity Surveyors`;
    return () => { document.title = before; };
  }, [job?.title]);

  const toggleSave = async () => {
    const was = saved;
    setSaved(!was);
    try {
      if (was) { await unsaveJob(job._id); toast.success('Removed from saved jobs'); }
      else { await saveJob(job._id); toast.success('Saved to your portal'); }
    } catch (err) {
      setSaved(was);
      toast.error(err.response?.data?.message || 'Could not update your saved jobs');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy the link. Copy it from the address bar instead.');
    }
  };

  const onApplied = (application, fresh) => {
    setJob((j) => ({ ...j, myApplication: { status: application.status, createdAt: application.createdAt } }));
    setJustApplied(fresh);
  };

  if (status === 'loading') {
    return (
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ padding: '6rem 0', textAlign: 'center', color: 'var(--color-txt-3)' }}>Loading the listing…</div>
      </section>
    );
  }

  if (status === 'notfound' || status === 'error') {
    return (
      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ padding: '6rem 1rem', textAlign: 'center' }}>
          <div className="ey">Job Board</div>
          <h1 className="sh">{status === 'notfound' ? <>Listing <em>not found</em></> : <>Something <em>went wrong</em></>}</h1>
          <p style={{ fontSize: '.88rem', color: 'var(--color-txt-2)', margin: '0 auto 1.6rem', maxWidth: 440, lineHeight: 1.7 }}>
            {status === 'notfound'
              ? 'This listing may have been removed, or the link is incomplete.'
              : 'We could not load this listing just now. Please try again shortly.'}
          </p>
          <Link to="/jobs" className="btn bp">See all current listings</Link>
        </div>
      </section>
    );
  }

  const left = daysLeft(job.deadline);
  const closed = ['closed', 'filled'].includes(job.status) || (left !== null && left <= 0);
  const company = job.employer?.companyName || job.company;
  const salary = salaryText(job);
  const where = [job.location, job.state].filter(Boolean).join(', ');
  const trackLabel = job.track && job.track !== 'job' ? TRACKS.find((t) => t.value === job.track)?.label : '';
  const shareText = encodeURIComponent(`${job.title} at ${company}, on the NIQS job board: ${window.location.href}`);

  const meta = [
    where && { icon: 'location', label: 'Location', value: where },
    { icon: 'money', label: 'Salary', value: salary || 'Not stated' },
    { icon: 'calendar', label: 'Closing date', value: job.deadline ? fmtDate(job.deadline, { day: 'numeric', month: 'long', year: 'numeric' }) : 'Open until filled' },
    { icon: 'clock', label: 'Type', value: typeLabel(job.type) || 'Not stated' },
    job.sector && { icon: 'industry', label: 'Sector', value: job.sectorLabel || sectorLabel(job.sector) },
    { icon: 'education', label: 'Minimum grade', value: job.minGradeLabel || gradeLabel(job.minGrade || 'none') },
    trackLabel && { icon: 'education', label: 'Track', value: trackLabel },
  ].filter(Boolean);

  return (
    <section style={{ background: '#fff' }}>
      <div className="ct" style={{ paddingTop: '2.5rem', paddingBottom: '5rem' }}>
        <Link to="/jobs" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--color-txt-3)', textDecoration: 'none', marginBottom: '1.6rem', fontWeight: 600 }}>
          ← All jobs
        </Link>

        {closed && (
          <div role="status" style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px', fontSize: '.84rem', color: '#374151', marginBottom: '1.4rem', fontWeight: 600 }}>
            This listing is closed{job.status === 'filled' ? ': the role has been filled.' : '.'}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: '1.6rem' }}>
          <img src={job.logo || job.employer?.logo || FALLBACK_LOGO} alt="" style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover', border: '1px solid var(--color-bdr)', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.3rem, 4vw, 1.9rem)', fontWeight: 800, color: 'var(--color-navy)', letterSpacing: '-.02em', lineHeight: 1.2, margin: '0 0 6px' }}>
              {job.title}
            </h1>
            <div style={{ fontSize: '.9rem', color: 'var(--color-txt-2)', marginBottom: 8 }}>{company}</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {job.featured && <Pill tone="gold"><Icon name="star" size={12} /> Featured</Pill>}
              <EmployerMarks job={job} />
              {job.membersOnly && <Pill tone="navy">Members only</Pill>}
              {job.requiresQS && <Pill tone="blue">Requires a qualified QS</Pill>}
            </div>
          </div>
        </div>

        <div className="jd-grid">
          {/* Main column */}
          <div style={{ minWidth: 0 }}>
            <div className="jd-meta">
              {meta.map((m) => (
                <div key={m.label} style={{ background: '#f9fafb', border: '1px solid #f3f4f6', borderRadius: 8, padding: '10px 12px', minWidth: 0 }}>
                  <div style={{ fontSize: '.67rem', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 3 }}>
                    <Icon name={m.icon} size="sm" /> {m.label}
                  </div>
                  <div style={{ fontSize: '.82rem', fontWeight: 600, color: '#111827', overflowWrap: 'anywhere' }}>{m.value}</div>
                </div>
              ))}
            </div>

            <section style={{ marginBottom: 24 }}>
              <h2 style={h3Style}>About the role</h2>
              <div style={{ fontSize: '.86rem', color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                {job.description || 'The employer has not added a full description yet.'}
              </div>
            </section>

            {job.requirements && (
              <section style={{ marginBottom: 24 }}>
                <h2 style={h3Style}>Requirements</h2>
                <div style={{ fontSize: '.86rem', color: '#374151', lineHeight: 1.85, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{job.requirements}</div>
              </section>
            )}

            {where && job.state !== 'Outside Nigeria' && (
              <section style={{ marginBottom: 24 }}>
                <h2 style={h3Style}><Icon name="location" size="sm" /> Location</h2>
                <MapEmbed location={`${where}, Nigeria`} />
                <p style={{ fontSize: '.75rem', color: '#9ca3af', marginTop: 6 }}>{where}</p>
              </section>
            )}

            {job.employer && (job.employer.about || job.employer.website) && (
              <section style={{ border: '1px solid var(--color-bdr)', borderRadius: 12, padding: '18px 20px', background: 'var(--color-off)' }}>
                <h2 style={h3Style}>About {job.employer.companyName || company}</h2>
                {job.employer.about && (
                  <p style={{ fontSize: '.84rem', color: 'var(--color-txt-2)', lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: '0 0 10px' }}>{job.employer.about}</p>
                )}
                {job.employer.website && (
                  <a href={withProtocol(job.employer.website)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '.8rem', color: 'var(--color-navy)', fontWeight: 600, overflowWrap: 'anywhere' }}>
                    <Icon name="web" size="sm" /> {job.employer.website.replace(/^https?:\/\//i, '')}
                  </a>
                )}
              </section>
            )}
          </div>

          {/* Side column */}
          <aside style={{ minWidth: 0 }}>
            <div className="jd-side">
              <ApplyPanel job={job} closed={closed} onApplied={onApplied} justApplied={justApplied} />

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                {user && (
                  <button type="button" className="btn bo" onClick={toggleSave} aria-pressed={saved} style={{ padding: '.5rem .9rem', fontSize: '.74rem' }}>
                    <Icon name="star" size="sm" /> {saved ? 'Saved' : 'Save'}
                  </button>
                )}
                <button type="button" className="btn bo" onClick={copyLink} style={{ padding: '.5rem .9rem', fontSize: '.74rem' }}>
                  <Icon name="link" size="sm" /> Copy link
                </button>
                <a
                  className="btn bo"
                  href={`https://wa.me/?text=${shareText}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ padding: '.5rem .9rem', fontSize: '.74rem' }}
                >
                  <Icon name="share" size="sm" /> Share on WhatsApp
                </a>
              </div>
              {job.publishedAt && (
                <p style={{ fontSize: '.7rem', color: 'var(--color-txt-3)', marginTop: 12 }}>Posted {fmtDate(job.publishedAt)}</p>
              )}
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        .jd-grid { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 2rem; align-items: start; }
        .jd-side { position: sticky; top: 96px; }
        .jd-meta { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 24px; }
        @media (max-width: 900px) {
          .jd-grid { grid-template-columns: minmax(0, 1fr); }
          .jd-grid aside { order: -1; }
          .jd-side { position: static; }
          .jd-meta { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
      `}</style>
    </section>
  );
}
