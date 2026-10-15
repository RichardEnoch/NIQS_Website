import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Icon from '../../components/common/Icon';
import { Pill } from '../../components/jobs/JobBits';
import { listAlerts, createAlert, updateAlert, deleteAlert } from '../../api/jobsApi';
import { LISTING_STATES, SECTORS, JOB_TYPES, TRACKS, sectorLabel, typeLabel, fmtDate } from '../../data/jobBoard';
import { PORTAL_JOBS_CSS } from './PortalJobs';

const MAX_ALERTS = 10;
const BLANK = { name: '', states: [], sectors: [], types: [], tracks: [], keywords: '', matchMyGrade: true, active: true };
const trackLabel = (v) => TRACKS.find((t) => t.value === v)?.label || v;

/** Toggle-button chips for a short list of options. Empty = any. */
function Chips({ options, value, onChange, label }) {
  const toggle = (v) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div className="pj-chips" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className="pj-chip" aria-pressed={value.includes(o.value)} onClick={() => toggle(o.value)}>
          {value.includes(o.value) && <Icon name="check" size={12} />}{o.label}
        </button>
      ))}
    </div>
  );
}

/** One line describing what an alert matches. */
function describe(a) {
  const parts = [];
  parts.push(a.tracks?.length ? a.tracks.map(trackLabel).join(', ') : 'Any track');
  parts.push(a.states?.length ? a.states.join(', ') : 'Any state');
  if (a.sectors?.length) parts.push(a.sectors.map(sectorLabel).join(', '));
  if (a.types?.length) parts.push(a.types.map(typeLabel).join(', '));
  if (a.keywords) parts.push(`"${a.keywords}"`);
  if (a.matchMyGrade) parts.push('only roles I can apply for');
  return parts.join(' · ');
}

function AlertForm({ initial, onCancel, onSaved }) {
  const [f, setF] = useState({ ...BLANK, ...initial });
  const [saving, setSaving] = useState(false);
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const body = {
      name: f.name.trim(), states: f.states, sectors: f.sectors, types: f.types, tracks: f.tracks,
      keywords: f.keywords.trim(), matchMyGrade: f.matchMyGrade, active: f.active,
    };
    try {
      const { alert } = initial?._id ? await updateAlert(initial._id, body) : await createAlert(body);
      toast.success(initial?._id ? 'Alert updated' : 'Alert created');
      onSaved(alert);
    } catch (err) {
      toast.error(err.response?.data?.message || 'The alert could not be saved');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="pj-card" style={{ padding: '1.3rem' }}>
      <h3 className="pj-h2" style={{ marginBottom: 14 }}>{initial?._id ? 'Edit alert' : 'New alert'}</h3>
      <div className="pj-grid">
        <div className="pj-full">
          <label className="pj-label" htmlFor="al-name">Name</label>
          <input id="al-name" className="pj-input" value={f.name} maxLength={80} placeholder="For example: Lagos consultancy roles" onChange={(e) => set('name')(e.target.value)} />
        </div>

        <div className="pj-full">
          <span className="pj-label" id="al-tracks">Type of opportunity</span>
          <Chips label="Type of opportunity" options={TRACKS} value={f.tracks} onChange={set('tracks')} />
          <div className="pj-hint">Choose none for every track.</div>
        </div>

        <div className="pj-full">
          <label className="pj-label" htmlFor="al-state">States</label>
          <select
            id="al-state"
            className="pj-input"
            value=""
            onChange={(e) => { const v = e.target.value; if (v && !f.states.includes(v)) set('states')([...f.states, v]); }}
          >
            <option value="">{f.states.length ? 'Add another state…' : 'Any state (or pick one to narrow it)'}</option>
            {LISTING_STATES.filter((s) => !f.states.includes(s)).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {f.states.length > 0 && (
            <div className="pj-chips" style={{ marginTop: 8 }}>
              {f.states.map((s) => (
                <button key={s} type="button" className="pj-chip" aria-pressed="true" aria-label={`Remove ${s}`} onClick={() => set('states')(f.states.filter((x) => x !== s))}>
                  {s} <Icon name="close" size={12} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="pj-full">
          <span className="pj-label">Sectors</span>
          <Chips label="Sectors" options={SECTORS} value={f.sectors} onChange={set('sectors')} />
        </div>

        <div className="pj-full">
          <span className="pj-label">Contract types</span>
          <Chips label="Contract types" options={JOB_TYPES} value={f.types} onChange={set('types')} />
        </div>

        <div className="pj-full">
          <label className="pj-label" htmlFor="al-kw">Keywords</label>
          <input id="al-kw" className="pj-input" value={f.keywords} maxLength={120} placeholder="For example: cost manager, BIM" onChange={(e) => set('keywords')(e.target.value)} />
          <div className="pj-hint">A role matches if any one of these words is in its title, company or description.</div>
        </div>

        <label className="pj-check">
          <input type="checkbox" checked={f.matchMyGrade} onChange={(e) => set('matchMyGrade')(e.target.checked)} />
          <span>Only roles I can apply for (checked against my grade when the role is posted)</span>
        </label>
        <label className="pj-check">
          <input type="checkbox" checked={f.active} onChange={(e) => set('active')(e.target.checked)} />
          <span>Send me emails for this alert</span>
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
        <button type="submit" className="btn bp" disabled={saving}>{saving ? 'Saving…' : 'Save alert'}</button>
        <button type="button" className="btn bo" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

export default function PortalJobAlerts() {
  const [alerts, setAlerts] = useState(null);
  const [error, setError] = useState(false);
  const [editing, setEditing] = useState(null); // null | 'new' | alert

  useEffect(() => {
    listAlerts().then((r) => setAlerts(r?.alerts || [])).catch(() => setError(true));
  }, []);

  const onSaved = (alert) => {
    setAlerts((list) => (list.some((a) => a._id === alert._id) ? list.map((a) => (a._id === alert._id ? alert : a)) : [alert, ...list]));
    setEditing(null);
  };

  const toggleActive = async (a) => {
    setAlerts((list) => list.map((x) => (x._id === a._id ? { ...x, active: !a.active } : x)));
    try {
      await updateAlert(a._id, { active: !a.active });
      toast.success(a.active ? 'Alert paused' : 'Alert switched on');
    } catch (err) {
      setAlerts((list) => list.map((x) => (x._id === a._id ? { ...x, active: a.active } : x)));
      toast.error(err.response?.data?.message || 'Could not update the alert');
    }
  };

  const remove = async (a) => {
    if (!window.confirm(`Delete the alert "${a.name || 'Untitled alert'}"?`)) return;
    try {
      await deleteAlert(a._id);
      setAlerts((list) => list.filter((x) => x._id !== a._id));
      if (editing?._id === a._id) setEditing(null);
      toast.success('Alert deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete the alert');
    }
  };

  const full = alerts && alerts.length >= MAX_ALERTS;

  return (
    <div className="pj">
      <h1 className="pj-title">Job <em>Alerts</em></h1>
      <p className="pj-sub">
        Tell us what you are looking for and we will email you when a matching role is approved for the job board.
        You can keep up to {MAX_ALERTS} alerts.
      </p>

      {error ? (
        <p style={{ color: 'var(--color-txt-3)', fontSize: '.85rem' }}>Your alerts could not be loaded. Please refresh the page.</p>
      ) : !alerts ? (
        <div className="pj-card"><p className="pj-muted">Loading…</p></div>
      ) : (
        <>
          <div className="pj-head">
            <h2 className="pj-h2">My alerts<span className="pj-n">{alerts.length} / {MAX_ALERTS}</span></h2>
            {editing !== 'new' && (
              <button type="button" className="btn bp" disabled={full} onClick={() => setEditing('new')} style={{ padding: '.55rem 1rem', fontSize: '.74rem', opacity: full ? 0.5 : 1 }}>
                <Icon name="add" size="sm" /> New alert
              </button>
            )}
          </div>
          {full && <p className="pj-hint" style={{ marginTop: -6, marginBottom: 12 }}>You have {MAX_ALERTS} alerts. Delete one to add another.</p>}

          {editing === 'new' && (
            <div style={{ marginBottom: 12 }}>
              <AlertForm initial={null} onCancel={() => setEditing(null)} onSaved={onSaved} />
            </div>
          )}

          {alerts.length === 0 && editing !== 'new' ? (
            <div className="pj-card pj-empty">
              <Icon name="notification" size="xl" />
              <h3>No alerts yet</h3>
              <p>Create an alert and new roles that match it will arrive in your inbox.</p>
              <button type="button" className="btn bp" onClick={() => setEditing('new')}>Create an alert</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {alerts.map((a) => (editing?._id === a._id ? (
                <AlertForm key={a._id} initial={a} onCancel={() => setEditing(null)} onSaved={onSaved} />
              ) : (
                <article key={a._id} className="pj-card" style={{ opacity: a.active ? 1 : 0.65 }}>
                  <div className="pj-row">
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="pj-jt">{a.name || 'Untitled alert'}</div>
                      <div className="pj-meta" style={{ lineHeight: 1.5 }}>{describe(a)}</div>
                      {a.lastSentAt && <div className="pj-hint">Last email {fmtDate(a.lastSentAt)}{a.sentCount ? ` · ${a.sentCount} sent` : ''}</div>}
                    </div>
                    <div className="pj-actions">
                      {a.active ? <Pill tone="green">On</Pill> : <Pill tone="grey">Paused</Pill>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                    <button type="button" className="pj-link" onClick={() => toggleActive(a)} aria-pressed={a.active}>
                      <Icon name={a.active ? 'toggleOn' : 'toggleOff'} size="sm" /> {a.active ? 'Pause' : 'Switch on'}
                    </button>
                    <button type="button" className="pj-link" onClick={() => setEditing(a)}>
                      <Icon name="edit" size="sm" /> Edit
                    </button>
                    <button type="button" className="pj-link pj-danger" onClick={() => remove(a)}>
                      <Icon name="delete" size="sm" /> Delete
                    </button>
                  </div>
                </article>
              )))}
            </div>
          )}

          <p className="pj-hint" style={{ marginTop: 18 }}>
            Emails go to the address on your NIQS account. <Link to="/jobs" style={{ color: 'var(--color-navy)', fontWeight: 600 }}>Browse current listings</Link>
          </p>
        </>
      )}

      <style>{PORTAL_JOBS_CSS}</style>
    </div>
  );
}
