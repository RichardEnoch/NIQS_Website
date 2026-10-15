import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Icon from '../../components/common/Icon';
import { VerificationBadge } from '../../components/jobs/JobBits';
import {
  getCareerProfile, updateCareerProfile, getMyVerification, listMyCvs, uploadCv, deleteCv, downloadCvFile,
} from '../../api/jobsApi';
import { LISTING_STATES, SECTORS, fmtDate } from '../../data/jobBoard';
import { PORTAL_JOBS_CSS } from './PortalJobs';

const CV_MAX = 2 * 1024 * 1024;
const CV_EXT = /\.(pdf|docx?)$/i;

const EMPTY = {
  headline: '', summary: '', state: '', yearsExperience: 0, sectors: [], skills: '',
  qualifications: '', institution: '', openToWork: true, seekingPlacement: false,
  visibleToEmployers: false, cv: '',
};

/** Server profile → form state (skills as a comma list, cv as an id). */
function toForm(p) {
  if (!p) return { ...EMPTY };
  return {
    ...EMPTY,
    ...p,
    skills: (p.skills || []).join(', '),
    sectors: p.sectors || [],
    cv: p.cv?._id || p.cv || '',
  };
}

const kb = (n) => (n ? `${Math.max(1, Math.round(n / 1024))} KB` : '');

export default function PortalCareerProfile() {
  const [form, setForm] = useState(null);
  const [verification, setVerification] = useState(null);
  const [cvs, setCvs] = useState([]);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    Promise.allSettled([getCareerProfile(), getMyVerification(), listMyCvs()]).then(([p, v, c]) => {
      if (p.status !== 'fulfilled') { setError(true); return; }
      setForm(toForm(p.value?.profile));
      if (v.status === 'fulfilled') setVerification(v.value?.verification || null);
      if (c.status === 'fulfilled') setCvs(c.value?.files || []);
    });
  }, []);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); };

  const save = async (e) => {
    e?.preventDefault();
    setSaving(true);
    try {
      const years = Math.min(60, Math.max(0, parseInt(form.yearsExperience, 10) || 0));
      const { profile } = await updateCareerProfile({
        headline: form.headline.trim(),
        summary: form.summary.trim(),
        state: form.state,
        yearsExperience: years,
        sectors: form.sectors,
        skills: form.skills,
        qualifications: form.qualifications.trim(),
        institution: form.institution.trim(),
        openToWork: form.openToWork,
        seekingPlacement: form.seekingPlacement,
        visibleToEmployers: form.visibleToEmployers,
        cv: form.cv || null,
      });
      setForm(toForm(profile));
      setDirty(false);
      toast.success('Career profile saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Your profile could not be saved');
    } finally {
      setSaving(false);
    }
  };

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
      // A first CV goes straight onto the profile; otherwise the member chooses.
      if (!form.cv) set('cv', saved._id);
      toast.success('CV uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeCv = async (f) => {
    if (!window.confirm(`Delete ${f.filename}? Employers you have already applied to keep the copy you sent while the application is open.`)) return;
    try {
      await deleteCv(f._id);
      setCvs((list) => list.filter((x) => x._id !== f._id));
      // The server also takes it off the profile.
      if (form.cv === f._id) setForm((x) => ({ ...x, cv: '' }));
      toast.success('CV deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete the CV');
    }
  };

  const download = async (f) => {
    try { await downloadCvFile(f._id, f.filename); } catch { toast.error('Could not download the file'); }
  };

  const toggleSector = (v) => set('sectors', form.sectors.includes(v) ? form.sectors.filter((x) => x !== v) : [...form.sectors, v]);

  if (error) {
    return (
      <div className="pj">
        <h1 className="pj-title">Career <em>Profile</em></h1>
        <p style={{ color: 'var(--color-txt-3)', fontSize: '.85rem' }}>Your career profile could not be loaded. Please refresh the page.</p>
        <style>{PORTAL_JOBS_CSS}</style>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="pj">
        <h1 className="pj-title">Career <em>Profile</em></h1>
        <div className="pj-card"><p className="pj-muted">Loading…</p></div>
        <style>{PORTAL_JOBS_CSS}</style>
      </div>
    );
  }

  return (
    <div className="pj">
      <h1 className="pj-title">Career <em>Profile</em></h1>
      <p className="pj-sub">
        A short professional profile you can attach to applications. It stays private unless you choose to show it to employers.
      </p>

      <section className="pj-section">
        <h2 className="pj-h2" style={{ marginBottom: 8 }}>Your NIQS grade</h2>
        <VerificationBadge verification={verification || {}} />
        <p className="pj-hint">This is what an employer sees with your application or profile.</p>
      </section>

      <form onSubmit={save}>
        {/* Visibility */}
        <section className="pj-section">
          <div className="pj-card" style={{ borderColor: form.visibleToEmployers ? 'var(--color-bdr-gold)' : undefined, background: form.visibleToEmployers ? 'var(--color-gold-xl)' : '#fff' }}>
            <label className="pj-check" style={{ fontSize: '.88rem', fontWeight: 700, color: 'var(--color-navy)' }}>
              <input type="checkbox" checked={form.visibleToEmployers} onChange={(e) => set('visibleToEmployers', e.target.checked)} />
              <span>Let approved employers find my profile</span>
            </label>
            <div style={{ fontSize: '.78rem', color: 'var(--color-txt-2)', lineHeight: 1.6, margin: '8px 0 0 24px' }}>
              {form.visibleToEmployers ? (
                <>
                  <strong>On.</strong> Employers the NIQS Secretariat has approved can find this profile in talent search and download the CV you choose below.
                  They never see your email address or phone number. They can only send you an invitation, and you decide whether to reply.
                </>
              ) : (
                <>
                  <strong>Off (the default).</strong> Your profile is hidden. Employers see it only when you attach it to an application.
                  If you switch this on, approved employers can find it and download your chosen CV, but never see your email or phone; they can only send an invitation.
                </>
              )}
            </div>
            <div className="pj-hint" style={{ marginLeft: 24 }}>Switching it off removes you from search straight away.</div>
          </div>
        </section>

        {/* Details */}
        <section className="pj-section">
          <h2 className="pj-h2" style={{ marginBottom: 12 }}>About you</h2>
          <div className="pj-card" style={{ padding: '1.3rem' }}>
            <div className="pj-grid">
              <div className="pj-full">
                <label className="pj-label" htmlFor="cp-headline">Headline</label>
                <input id="cp-headline" className="pj-input" maxLength={140} value={form.headline} placeholder="For example: Cost manager, 8 years in commercial building" onChange={(e) => set('headline', e.target.value)} />
                <div className="pj-hint">{form.headline.length} / 140</div>
              </div>
              <div className="pj-full">
                <label className="pj-label" htmlFor="cp-summary">Summary</label>
                <textarea id="cp-summary" className="pj-input" rows={6} maxLength={3000} value={form.summary} onChange={(e) => set('summary', e.target.value)} style={{ resize: 'vertical' }} />
                <div className="pj-hint">{form.summary.length} / 3000</div>
              </div>
              <div>
                <label className="pj-label" htmlFor="cp-state">State</label>
                <select id="cp-state" className="pj-input" value={form.state} onChange={(e) => set('state', e.target.value)}>
                  <option value="">Not stated</option>
                  {LISTING_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="pj-label" htmlFor="cp-years">Years of experience</label>
                <input id="cp-years" className="pj-input" type="number" min={0} max={60} inputMode="numeric" value={form.yearsExperience} onChange={(e) => set('yearsExperience', e.target.value)} />
              </div>
              <div className="pj-full">
                <span className="pj-label">Sectors</span>
                <div className="pj-chips" role="group" aria-label="Sectors">
                  {SECTORS.map((s) => (
                    <button key={s.value} type="button" className="pj-chip" aria-pressed={form.sectors.includes(s.value)} onClick={() => toggleSector(s.value)}>
                      {form.sectors.includes(s.value) && <Icon name="check" size={12} />}{s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pj-full">
                <label className="pj-label" htmlFor="cp-skills">Skills</label>
                <input id="cp-skills" className="pj-input" value={form.skills} placeholder="For example: BIM 5D, contract administration, final accounts" onChange={(e) => set('skills', e.target.value)} />
                <div className="pj-hint">Separate skills with commas. Up to 30.</div>
              </div>
              <div className="pj-full">
                <label className="pj-label" htmlFor="cp-quals">Qualifications</label>
                <textarea id="cp-quals" className="pj-input" rows={3} maxLength={1500} value={form.qualifications} placeholder="For example: BSc Quantity Surveying, MNIQS, RQS" onChange={(e) => set('qualifications', e.target.value)} style={{ resize: 'vertical' }} />
              </div>
              <div className="pj-full">
                <label className="pj-label" htmlFor="cp-inst">Institution</label>
                <input id="cp-inst" className="pj-input" value={form.institution} placeholder="Where you studied or are studying" onChange={(e) => set('institution', e.target.value)} />
              </div>
              <label className="pj-check pj-full">
                <input type="checkbox" checked={form.openToWork} onChange={(e) => set('openToWork', e.target.checked)} />
                <span>Open to new roles</span>
              </label>
              <label className="pj-check pj-full">
                <input type="checkbox" checked={form.seekingPlacement} onChange={(e) => set('seekingPlacement', e.target.checked)} />
                <span>Looking for an internship or SIWES placement toward TPC / GDE</span>
              </label>
            </div>
          </div>
        </section>

        {/* CVs */}
        <section className="pj-section">
          <div className="pj-head">
            <h2 className="pj-h2">CVs</h2>
            <label className="btn bo" style={{ position: 'relative', padding: '.5rem .9rem', fontSize: '.74rem', cursor: uploading ? 'wait' : 'pointer' }}>
              <Icon name="upload" size="sm" /> {uploading ? 'Uploading…' : 'Upload a CV'}
              <input type="file" accept=".pdf,.doc,.docx" onChange={onFile} disabled={uploading} style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }} />
            </label>
          </div>
          <div className="pj-card">
            {cvs.length === 0 ? (
              <p className="pj-muted">No CVs yet. Upload a PDF or Word file, 2 MB at most. CVs are private: only you, employers you apply to, and (if you allow it) approved employers viewing your profile can open them.</p>
            ) : (
              <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                <legend className="pj-hint" style={{ marginBottom: 8 }}>Choose the CV shown on your profile.</legend>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {cvs.map((f) => (
                    <div key={f._id} className="pj-row" style={{ alignItems: 'center', borderBottom: '1px solid var(--color-bdr)', paddingBottom: 8 }}>
                      <label className="pj-check" style={{ minWidth: 0, flex: 1 }}>
                        <input type="radio" name="profile-cv" checked={form.cv === f._id} onChange={() => set('cv', f._id)} />
                        <span style={{ minWidth: 0 }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-navy)', overflowWrap: 'anywhere' }}>{f.filename}</span>
                          <span className="pj-hint" style={{ display: 'block', marginTop: 0 }}>
                            {[kb(f.size), f.createdAt && `uploaded ${fmtDate(f.createdAt)}`].filter(Boolean).join(' · ')}
                            {form.cv === f._id ? ' · on your profile' : ''}
                          </span>
                        </span>
                      </label>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button type="button" className="pj-link" onClick={() => download(f)} aria-label={`Download ${f.filename}`}>
                          <Icon name="download" size="sm" /> Download
                        </button>
                        <button type="button" className="pj-link pj-danger" onClick={() => removeCv(f)} aria-label={`Delete ${f.filename}`}>
                          <Icon name="delete" size="sm" /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                  <label className="pj-check">
                    <input type="radio" name="profile-cv" checked={!form.cv} onChange={() => set('cv', '')} />
                    <span>No CV on my profile</span>
                  </label>
                </div>
              </fieldset>
            )}
          </div>
        </section>

        <div className="pj-savebar">
          <button type="submit" className="btn bp" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</button>
          {dirty && <span className="pj-hint" style={{ margin: 0 }}>You have unsaved changes.</span>}
        </div>
      </form>

      <style>{PORTAL_JOBS_CSS}</style>
      <style>{`
        .pj-savebar { position: sticky; bottom: 0; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; padding: 12px 0; background: linear-gradient(transparent, var(--color-off) 30%); }
      `}</style>
    </div>
  );
}
