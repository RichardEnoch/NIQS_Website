import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Icon from '../../components/common/Icon';
import { VerificationBadge, ApplicationStatusPill } from '../../components/jobs/JobBits';
import { inbox, inboxItem, updateInboxItem, myListings, downloadCvFile } from '../../api/jobsApi';
import { APPLICATION_STATUS, EMPLOYER_STATUS_ACTIONS, fmtDate, sectorLabel } from '../../data/jobBoard';
import { errMsg } from './EmployerLayout';

/**
 * The applicant inbox. A list on the left, the selected application on the
 * right (stacked on phones). Opening an application marks it viewed on the
 * server, and every status change is emailed to the applicant.
 */

const fmtTime = (d) => (d ? new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '');
const kb = (n) => (n ? `${Math.max(1, Math.round(n / 1024))} KB` : '');

function Detail({ app, onChange }) {
  const [status, setStatus] = useState(app.status);
  const [note, setNote] = useState('');
  const [privateNote, setPrivateNote] = useState(app.employerNote || '');
  const [saving, setSaving] = useState('');

  useEffect(() => {
    setStatus(app.status);
    setNote('');
    setPrivateNote(app.employerNote || '');
  }, [app._id, app.status, app.employerNote]);

  const saveStatus = async () => {
    if (status === app.status) return;
    setSaving('status');
    try {
      const d = await updateInboxItem(app._id, { status, note: note.trim() });
      onChange(d.application);
      toast.success(`Marked ${APPLICATION_STATUS[status]?.label.toLowerCase() || status}. The applicant has been emailed.`);
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving('');
    }
  };

  const saveNote = async () => {
    setSaving('note');
    try {
      const d = await updateInboxItem(app._id, { employerNote: privateNote });
      onChange(d.application);
      toast.success('Note saved');
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving('');
    }
  };

  const download = async () => {
    setSaving('cv');
    try {
      await downloadCvFile(app.cv._id, app.cv.filename);
    } catch (err) {
      toast.error(errMsg(err, 'Could not download the CV.'));
    } finally {
      setSaving('');
    }
  };

  const p = app.profile;

  return (
    <div className="emp-card emp-app-detail">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.8rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <h2 className="emp-app-name">{app.fullName}</h2>
          <div className="emp-muted">
            {app.job?.title} · Applied {fmtDate(app.createdAt)}
          </div>
        </div>
        <ApplicationStatusPill status={app.status} />
      </div>

      <div style={{ marginTop: '.9rem' }}>
        <VerificationBadge verification={app.verification} />
      </div>

      <div className="emp-app-contact">
        {app.email && <a href={`mailto:${app.email}`} className="emp-link"><Icon name="email" size="sm" /> {app.email}</a>}
        {app.phone && <a href={`tel:${app.phone}`} className="emp-link"><Icon name="phone" size="sm" /> {app.phone}</a>}
      </div>

      {app.cv?._id && (
        <button type="button" className="emp-btn" onClick={download} disabled={saving === 'cv'}>
          <Icon name="download" size="sm" /> {saving === 'cv' ? 'Downloading…' : `Download CV${app.cv.filename ? ` (${app.cv.filename}${app.cv.size ? `, ${kb(app.cv.size)}` : ''})` : ''}`}
        </button>
      )}

      {app.coverNote && (
        <div className="emp-app-sec">
          <h3>Cover note</h3>
          <p className="emp-text" style={{ whiteSpace: 'pre-wrap' }}>{app.coverNote}</p>
        </div>
      )}

      {p && (
        <div className="emp-app-sec">
          <h3>Career profile</h3>
          {p.headline && <p className="emp-text" style={{ fontWeight: 600 }}>{p.headline}</p>}
          <p className="emp-muted">
            {[p.state, p.yearsExperience ? `${p.yearsExperience} year${p.yearsExperience === 1 ? '' : 's'} experience` : '']
              .filter(Boolean).join(' · ')}
          </p>
          {p.summary && <p className="emp-text" style={{ marginTop: '.4rem', whiteSpace: 'pre-wrap' }}>{p.summary}</p>}
          {p.sectors?.length > 0 && (
            <div className="emp-tags" style={{ marginTop: '.5rem' }}>
              {p.sectors.map((s) => <span key={s} className="emp-tag">{sectorLabel(s)}</span>)}
            </div>
          )}
          {p.skills?.length > 0 && (
            <div className="emp-tags" style={{ marginTop: '.4rem' }}>
              {p.skills.map((s) => <span key={s} className="emp-tag">{s}</span>)}
            </div>
          )}
          {p.qualifications && <p className="emp-text" style={{ marginTop: '.5rem', whiteSpace: 'pre-wrap' }}><b>Qualifications:</b> {p.qualifications}</p>}
        </div>
      )}

      <div className="emp-app-sec">
        <h3>Update status</h3>
        <div className="emp-actions" role="radiogroup" aria-label="Application status">
          {EMPLOYER_STATUS_ACTIONS.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={status === s}
              className={`emp-btn sm${status === s ? ' primary' : ''}`}
              onClick={() => setStatus(s)}
            >
              {APPLICATION_STATUS[s]?.label || s}
            </button>
          ))}
        </div>
        {status !== app.status && (
          <div style={{ marginTop: '.7rem' }}>
            <div className="fg">
              <label className="flbl" htmlFor="a-note">Message to the applicant (optional)</label>
              <textarea id="a-note" className="fi" rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Interview on Tuesday at 10am at our Ikeja office" />
            </div>
            <div className="emp-actions">
              <button type="button" className="emp-btn primary" onClick={saveStatus} disabled={saving === 'status'}>
                {saving === 'status' ? 'Saving…' : `Mark as ${APPLICATION_STATUS[status]?.label.toLowerCase() || status}`}
              </button>
              <button type="button" className="emp-btn" onClick={() => setStatus(app.status)}>Cancel</button>
            </div>
            <p className="emp-hint" style={{ marginTop: '.4rem' }}>The applicant is emailed when the status changes.</p>
          </div>
        )}
      </div>

      <div className="emp-app-sec">
        <h3><label htmlFor="a-private">Private notes</label></h3>
        <textarea id="a-private" className="fi" rows={3} maxLength={2000} value={privateNote} onChange={(e) => setPrivateNote(e.target.value)} placeholder="Only your organisation and the Secretariat can see these" />
        <div className="emp-actions" style={{ marginTop: '.5rem' }}>
          <button type="button" className="emp-btn" onClick={saveNote} disabled={saving === 'note' || privateNote === (app.employerNote || '')}>
            <Icon name="save" size={14} /> Save note
          </button>
        </div>
      </div>

      {app.history?.length > 0 && (
        <div className="emp-app-sec">
          <h3>History</h3>
          <ol className="emp-timeline">
            {app.history.map((h, i) => (
              <li key={`${h.at}-${i}`}>
                <span className="emp-timeline-dot" aria-hidden="true" />
                <div>
                  <b>{APPLICATION_STATUS[h.status]?.label || h.status}</b>
                  <span className="emp-muted"> · {fmtTime(h.at)}{h.by === 'employer' ? ' · by you' : h.by === 'applicant' ? ' · by the applicant' : ''}</span>
                  {h.note && <div className="emp-text">{h.note}</div>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

const EmployerApplicants = () => {
  const [params, setParams] = useSearchParams();
  const job = params.get('job') || '';
  const status = params.get('status') || '';
  const verified = params.get('verified') === '1';

  const [listings, setListings] = useState([]);
  const [apps, setApps] = useState(null);
  const [selected, setSelected] = useState(null);
  const [opening, setOpening] = useState('');

  useEffect(() => {
    myListings().then((d) => setListings(d.jobs || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setApps(null);
    inbox({ job, status, verified: verified ? 1 : undefined })
      .then((d) => setApps(d.applications || []))
      .catch((err) => { setApps([]); toast.error(errMsg(err, 'Could not load applications.')); });
  }, [job, status, verified]);

  const setFilter = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  const merge = useCallback((a) => {
    setApps((list) => (list || []).map((x) => (x._id === a._id ? { ...x, ...a } : x)));
    setSelected(a);
  }, []);

  const open = async (a) => {
    setOpening(a._id);
    try {
      const d = await inboxItem(a._id);
      merge(d.application);
      // On phones the detail sits under the list; take the reader to it.
      if (window.matchMedia('(max-width: 900px)').matches) {
        requestAnimationFrame(() => document.getElementById('emp-app-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      }
    } catch (err) {
      toast.error(errMsg(err, 'Could not open the application.'));
    } finally {
      setOpening('');
    }
  };

  const withApps = listings.filter((l) => l.applyMethod !== 'external');

  return (
    <div className="emp-page">
      <div className="emp-head">
        <div>
          <h1 className="emp-title">Applicant <em>inbox</em></h1>
          <p className="emp-lead">
            Each application shows what the NIQS register says about the applicant. Applicant details
            are for this recruitment only and are deleted after the listing closes, in line with the
            NIQS privacy policy.
          </p>
        </div>
      </div>

      <div className="emp-card emp-filters">
        <div className="fg">
          <label className="flbl" htmlFor="f-job">Listing</label>
          <select id="f-job" className="fi" value={job} onChange={(e) => setFilter('job', e.target.value)}>
            <option value="">All listings</option>
            {withApps.map((l) => <option key={l._id} value={l._id}>{l.title}</option>)}
          </select>
        </div>
        <div className="fg">
          <label className="flbl" htmlFor="f-status">Status</label>
          <select id="f-status" className="fi" value={status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">Any status</option>
            {['submitted', ...EMPLOYER_STATUS_ACTIONS].map((s) => (
              <option key={s} value={s}>{s === 'submitted' ? 'New, not yet opened' : APPLICATION_STATUS[s]?.label}</option>
            ))}
          </select>
        </div>
        <label className="emp-check" style={{ alignSelf: 'end', marginBottom: '.9rem' }}>
          <input type="checkbox" checked={verified} onChange={(e) => setFilter('verified', e.target.checked ? '1' : '')} />
          <span>Verified against the register only</span>
        </label>
      </div>

      <div className="emp-app-layout">
        <div className="emp-card" style={{ padding: 0, overflow: 'hidden' }}>
          {apps === null && <div className="emp-empty" aria-busy="true">Loading applications…</div>}
          {apps && apps.length === 0 && (
            <div className="emp-empty">
              <div className="icon"><Icon name="inbox" size="lg" /></div>
              {job || status || verified ? 'No applications match these filters.' : 'No applications yet. They will appear here as people apply to your live listings.'}
            </div>
          )}
          {apps && apps.length > 0 && (
            <ul className="emp-app-list">
              {apps.map((a) => (
                <li key={a._id}>
                  <button
                    type="button"
                    className={`emp-app-item${selected?._id === a._id ? ' on' : ''}`}
                    onClick={() => open(a)}
                    aria-current={selected?._id === a._id || undefined}
                    disabled={opening === a._id}
                  >
                    <span className="emp-app-item-top">
                      <span className="emp-app-item-name">
                        {a.status === 'submitted' && <span className="emp-unread" title="Not yet opened"><span className="sr-only">New: </span></span>}
                        {a.fullName}
                      </span>
                      <ApplicationStatusPill status={a.status} />
                    </span>
                    <span className="emp-muted" style={{ display: 'block' }}>{a.job?.title} · {fmtDate(a.createdAt)}</span>
                    <span style={{ display: 'block', marginTop: '.35rem' }}>
                      <VerificationBadge verification={a.verification} compact />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div id="emp-app-detail">
          {selected ? (
            <Detail app={selected} onChange={merge} />
          ) : (
            apps && apps.length > 0 && (
              <div className="emp-card emp-empty">Choose an application to read it.</div>
            )
          )}
        </div>
      </div>

      <style>{`
        .emp-filters { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto; gap: 0 1rem; margin-bottom: 1rem; padding-bottom: .3rem; }
        .emp-app-layout { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr); gap: 1rem; align-items: start; }
        .emp-app-list { list-style: none; margin: 0; padding: 0; max-height: 75vh; overflow-y: auto; }
        .emp-app-list li + li { border-top: 1px solid var(--border); }
        .emp-app-item { display: block; width: 100%; text-align: left; background: none; border: none; padding: .85rem 1rem; cursor: pointer; font-family: var(--font-body); border-left: 3px solid transparent; }
        .emp-app-item:hover { background: var(--off); }
        .emp-app-item.on { background: var(--goldxl); border-left-color: var(--gold); }
        .emp-app-item-top { display: flex; justify-content: space-between; gap: .5rem; align-items: center; margin-bottom: .15rem; }
        .emp-app-item-name { font-weight: 700; color: var(--navy); font-size: .88rem; display: inline-flex; align-items: center; gap: .4rem; min-width: 0; overflow-wrap: anywhere; }
        .emp-unread { width: 8px; height: 8px; border-radius: 50%; background: var(--gold); flex-shrink: 0; display: inline-block; }
        .emp-app-name { font-family: 'Bricolage Grotesque', sans-serif; font-size: 1.2rem; font-weight: 800; color: var(--navy); overflow-wrap: anywhere; }
        .emp-app-contact { display: flex; gap: 1rem; flex-wrap: wrap; margin: .9rem 0; font-size: .84rem; }
        .emp-app-contact a { display: inline-flex; align-items: center; gap: .3rem; overflow-wrap: anywhere; }
        .emp-app-sec { margin-top: 1.2rem; padding-top: 1rem; border-top: 1px solid var(--border); }
        .emp-app-sec h3 { font-size: .7rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--text3); margin-bottom: .5rem; }
        .emp-timeline { list-style: none; margin: 0; padding: 0; }
        .emp-timeline li { display: flex; gap: .6rem; font-size: .8rem; color: var(--text2); padding-bottom: .6rem; }
        .emp-timeline-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--gold); margin-top: 5px; flex-shrink: 0; }
        @media (max-width: 900px) {
          .emp-app-layout { grid-template-columns: 1fr; }
          .emp-filters { grid-template-columns: 1fr; }
          .emp-filters .emp-check { margin-bottom: .6rem; }
          .emp-app-list { max-height: none; }
        }
      `}</style>
    </div>
  );
};

export default EmployerApplicants;
