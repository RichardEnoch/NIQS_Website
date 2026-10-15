import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Icon from '../../components/common/Icon';
import { Pill } from '../../components/jobs/JobBits';
import { searchTalent, inviteTalent, myListings, downloadCvFile } from '../../api/jobsApi';
import { NIGERIAN_STATES, SECTORS, GRADES, TONES, fmtDate } from '../../data/jobBoard';
import { Modal, errMsg } from './EmployerLayout';

/**
 * Talent search over career profiles members have chosen to show employers.
 * No email or phone number is ever shown: the employer invites the member to
 * apply to one of its live listings, and the member decides.
 */

const EMPTY_FILTERS = { q: '', state: '', sector: '', minGrade: '', placement: false };

const EmployerTalent = () => {
  const { employer } = useAuth();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [applied, setApplied] = useState(EMPTY_FILTERS);
  const [profiles, setProfiles] = useState(null);
  const [blocked, setBlocked] = useState('');     // 403 text: not approved, or talent search switched off
  const [live, setLive] = useState([]);
  const [invite, setInvite] = useState(null);     // the profile being invited
  const [inviteJob, setInviteJob] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    myListings()
      .then((d) => setLive((d.jobs || []).filter((j) => j.status === 'published')))
      .catch(() => {});
  }, []);

  useEffect(() => {
    setProfiles(null);
    searchTalent({
      q: applied.q.trim(),
      state: applied.state,
      sector: applied.sector,
      minGrade: applied.minGrade,
      placement: applied.placement ? 1 : undefined,
    })
      .then((d) => { setProfiles(d.profiles || []); setBlocked(''); })
      .catch((err) => {
        setProfiles([]);
        if (err.response?.status === 403) setBlocked(errMsg(err, 'Talent search is not available to your account.'));
        else toast.error(errMsg(err, 'Could not search profiles.'));
      });
  }, [applied]);

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const search = (e) => {
    e.preventDefault();
    setApplied(filters);
  };

  const openInvite = (p) => {
    setInvite(p);
    setInviteJob(live[0]?._id || '');
    setInviteMsg('');
  };
  const closeInvite = useCallback(() => setInvite(null), []);

  const sendInvite = async () => {
    if (!inviteJob) {
      toast.error('Choose a listing to invite them to');
      return;
    }
    setSending(true);
    try {
      const d = await inviteTalent(invite._id, { job: inviteJob, message: inviteMsg.trim() });
      if (d.sent) toast.success(`Invitation sent to ${invite.name}`);
      else toast(d.message || 'Invitation recorded');
      setInvite(null);
    } catch (err) {
      toast.error(errMsg(err, 'Could not send the invitation.'));
    } finally {
      setSending(false);
    }
  };

  const download = async (p) => {
    try {
      await downloadCvFile(p.cv._id, p.cv.filename);
    } catch (err) {
      toast.error(errMsg(err, 'Could not download the CV.'));
    }
  };

  return (
    <div className="emp-page">
      <div className="emp-head">
        <div>
          <h1 className="emp-title">Talent <em>search</em></h1>
          <p className="emp-lead">
            Career profiles NIQS members have chosen to show employers. Contact details are not shown;
            invite a member to apply to one of your live listings and they decide whether to respond.
          </p>
        </div>
      </div>

      {(blocked || (employer && employer.status !== 'approved')) && (
        <div className="emp-banner" role="status" style={{ background: TONES.amber.bg, borderColor: TONES.amber.border, color: TONES.amber.color }}>
          <Icon name="lock" size="sm" />
          <div>
            <strong>Talent search is not available</strong>
            <span style={{ color: 'var(--text2)' }}>
              {blocked || 'Talent search opens once the NIQS Secretariat has approved your employer account.'}
            </span>
          </div>
        </div>
      )}

      <form className="emp-card emp-talent-filters" onSubmit={search} role="search">
        <div className="fg emp-talent-q">
          <label className="flbl" htmlFor="t-q">Keywords</label>
          <input id="t-q" className="fi" value={filters.q} onChange={set('q')} placeholder="e.g. cost planning, CESMM, PlanSwift" />
        </div>
        <div className="fg">
          <label className="flbl" htmlFor="t-state">State</label>
          <select id="t-state" className="fi" value={filters.state} onChange={set('state')}>
            <option value="">Any state</option>
            {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="fg">
          <label className="flbl" htmlFor="t-sector">Sector</label>
          <select id="t-sector" className="fi" value={filters.sector} onChange={set('sector')}>
            <option value="">Any sector</option>
            {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div className="fg">
          <label className="flbl" htmlFor="t-grade">Minimum grade</label>
          <select id="t-grade" className="fi" value={filters.minGrade} onChange={set('minGrade')}>
            <option value="">Any grade</option>
            {GRADES.filter((g) => g.value !== 'none').map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
        </div>
        <label className="emp-check emp-talent-check">
          <input type="checkbox" checked={filters.placement} onChange={set('placement')} />
          <span>Looking for an internship or SIWES placement</span>
        </label>
        <div className="emp-actions emp-talent-btns">
          <button type="submit" className="emp-btn primary"><Icon name="search" size={14} /> Search</button>
          <button type="button" className="emp-btn" onClick={() => { setFilters(EMPTY_FILTERS); setApplied(EMPTY_FILTERS); }}>Clear</button>
        </div>
      </form>

      {profiles === null && <div className="emp-card emp-empty" aria-busy="true">Searching…</div>}
      {profiles && profiles.length === 0 && !blocked && (
        <div className="emp-card emp-empty">
          <div className="icon"><Icon name="group" size="lg" /></div>
          No profiles match this search. Try fewer filters.
        </div>
      )}

      {profiles && profiles.length > 0 && (
        <>
          <p className="emp-muted" style={{ margin: '0 0 .6rem' }}>{profiles.length} profile{profiles.length === 1 ? '' : 's'}</p>
          <div className="emp-talent-grid">
            {profiles.map((p) => (
              <article key={p._id} className="emp-card emp-talent-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.6rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <div style={{ minWidth: 0 }}>
                    <h2 className="emp-talent-name">{p.name}</h2>
                    {p.gradeLabel && <div className="emp-muted" style={{ fontWeight: 600 }}>{p.gradeLabel}</div>}
                  </div>
                  <div className="emp-tags">
                    {p.openToWork && <Pill tone="green">Open to work</Pill>}
                    {p.seekingPlacement && <Pill tone="blue">Seeking placement</Pill>}
                  </div>
                </div>
                {p.headline && <p className="emp-text" style={{ fontWeight: 600, marginTop: '.5rem' }}>{p.headline}</p>}
                <p className="emp-muted" style={{ marginTop: '.25rem' }}>
                  {[
                    p.state,
                    p.yearsExperience ? `${p.yearsExperience} year${p.yearsExperience === 1 ? '' : 's'} experience` : '',
                    p.seekingPlacement && p.institution ? p.institution : '',
                  ].filter(Boolean).join(' · ')}
                </p>
                {p.summary && <p className="emp-text emp-talent-summary">{p.summary}</p>}
                {p.sectorLabels?.length > 0 && (
                  <div className="emp-tags" style={{ marginTop: '.5rem' }}>
                    {p.sectorLabels.map((s) => <span key={s} className="emp-tag">{s}</span>)}
                  </div>
                )}
                {p.skills?.length > 0 && (
                  <div className="emp-tags" style={{ marginTop: '.4rem' }}>
                    {p.skills.slice(0, 10).map((s) => <span key={s} className="emp-tag" style={{ background: 'var(--goldxl)' }}>{s}</span>)}
                  </div>
                )}
                <div className="emp-actions" style={{ marginTop: 'auto', paddingTop: '.9rem' }}>
                  <button type="button" className="emp-btn sm primary" onClick={() => openInvite(p)}>
                    <Icon name="email" size={14} /> Invite to apply
                  </button>
                  {p.cv?._id && (
                    <button type="button" className="emp-btn sm" onClick={() => download(p)}>
                      <Icon name="download" size={14} /> CV
                    </button>
                  )}
                </div>
                {p.updatedAt && <p className="emp-hint" style={{ marginTop: '.5rem' }}>Profile updated {fmtDate(p.updatedAt)}</p>}
              </article>
            ))}
          </div>
        </>
      )}

      {invite && (
        <Modal
          title={`Invite ${invite.name} to apply`}
          onClose={closeInvite}
          footer={(
            <>
              <button type="button" className="emp-btn" onClick={closeInvite}>Cancel</button>
              <button type="button" className="emp-btn primary" onClick={sendInvite} disabled={sending || live.length === 0}>
                {sending ? 'Sending…' : 'Send invitation'}
              </button>
            </>
          )}
        >
          {live.length === 0 ? (
            <p>
              You can invite people only to a live listing, and you have none at the moment.{' '}
              <Link to="/employer/listings" className="emp-link">Go to your listings</Link>.
            </p>
          ) : (
            <>
              <p style={{ marginBottom: '.8rem' }}>
                We will email {invite.name} a link to the listing. Your message is included. Their
                contact details are not shared with you unless they apply.
              </p>
              <div className="fg">
                <label className="flbl" htmlFor="i-job">Listing</label>
                <select id="i-job" className="fi" value={inviteJob} onChange={(e) => setInviteJob(e.target.value)}>
                  {live.map((j) => <option key={j._id} value={j._id}>{j.title}{j.location ? ` (${j.location})` : ''}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="flbl" htmlFor="i-msg">Message (optional)</label>
                <textarea id="i-msg" className="fi" rows={4} maxLength={1000} value={inviteMsg} onChange={(e) => setInviteMsg(e.target.value)} placeholder="Why you think they would suit the role" />
              </div>
            </>
          )}
        </Modal>
      )}

      <style>{`
        .emp-talent-filters { display: grid; grid-template-columns: minmax(0, 2fr) repeat(3, minmax(0, 1fr)); gap: 0 1rem; margin-bottom: 1rem; align-items: end; }
        .emp-talent-check { grid-column: 1 / 3; margin-bottom: .9rem; }
        .emp-talent-btns { grid-column: 3 / -1; justify-content: flex-end; margin-bottom: .9rem; }
        .emp-talent-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: .9rem; }
        .emp-talent-grid .emp-card + .emp-card { margin-top: 0; }
        .emp-talent-card { display: flex; flex-direction: column; }
        .emp-talent-name { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.02rem; font-weight: 700; color: var(--navy); overflow-wrap: anywhere; }
        .emp-talent-summary { margin-top: .5rem; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
        @media (max-width: 900px) {
          .emp-talent-filters { grid-template-columns: 1fr 1fr; }
          .emp-talent-q { grid-column: 1 / -1; }
          .emp-talent-check, .emp-talent-btns { grid-column: 1 / -1; justify-content: flex-start; }
        }
        @media (max-width: 520px) {
          .emp-talent-filters { grid-template-columns: 1fr; }
          .emp-talent-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default EmployerTalent;
