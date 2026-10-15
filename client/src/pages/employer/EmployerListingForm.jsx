import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Icon from '../../components/common/Icon';
import { JobCard, ListingStatusPill } from '../../components/jobs/JobBits';
import { myListings, createListing, updateListing, getEmployerInfo } from '../../api/jobsApi';
import {
  LISTING_STATES, GRADES, SECTORS, JOB_TYPES, TRACKS, TONES, gradeLabel, sectorLabel,
} from '../../data/jobBoard';
import { Modal, errMsg, AccountBanner } from './EmployerLayout';

/**
 * Create or edit a listing (/employer/listings/new, /employer/listings/:id/edit).
 *
 * The server is the authority on the rules; they are repeated here so the
 * employer hears about them before pressing save:
 *  - a role that requires a qualified QS must name a minimum NIQS grade;
 *  - an unapproved account can only save drafts;
 *  - editing a live (or paused) listing sends it back for approval.
 */

const BLANK = {
  title: '', company: '', location: '', state: '', type: 'full-time', track: 'job', sector: 'consultancy',
  requiresQS: false, minGrade: 'none', membersOnly: false, description: '', requirements: '',
  salaryMin: '', salaryMax: '', salary: '', deadline: '', applyMethod: 'portal', applicationLink: '', logo: '',
};

const toDateInput = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const todayInput = () => {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

/** First rule the form breaks, or null. Mirrors validateListing on the server. */
function problemWith(f, isNew) {
  if (!f.title.trim()) return 'Give the listing a job title.';
  if (!f.company.trim()) return 'Enter the company name.';
  if (!f.location.trim()) return 'Enter the location.';
  if (!f.description.trim()) return 'Add a description of the role.';
  if (f.requiresQS && (!f.minGrade || f.minGrade === 'none')) {
    return 'A role that requires a qualified quantity surveyor must state the minimum NIQS grade.';
  }
  if (f.applyMethod === 'external' && !/^https?:\/\//i.test(f.applicationLink.trim())) {
    return 'The external application link must start with http:// or https://';
  }
  if (f.salaryMin !== '' && f.salaryMax !== '' && Number(f.salaryMin) > Number(f.salaryMax)) {
    return 'The minimum salary is higher than the maximum.';
  }
  if (f.deadline && isNew && f.deadline < todayInput()) return 'The closing date cannot be in the past.';
  if (f.logo && !/^https?:\/\//i.test(f.logo.trim())) return 'The logo address must start with http:// or https://';
  return null;
}

const EmployerListingForm = () => {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { employer } = useAuth();
  const approved = employer?.status === 'approved';

  const [form, setForm] = useState({ ...BLANK, company: employer?.companyName || '', state: employer?.state || '', sector: employer?.sector || 'consultancy' });
  const [original, setOriginal] = useState(null);   // the listing as loaded, when editing
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState(null);
  const [confirmLive, setConfirmLive] = useState(false);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    getEmployerInfo().then(setInfo).catch(() => {});
  }, []);

  useEffect(() => {
    if (isNew) return;
    myListings()
      .then(({ jobs = [] }) => {
        const job = jobs.find((j) => j._id === id);
        if (!job) {
          toast.error('That listing was not found.');
          navigate('/employer/listings', { replace: true });
          return;
        }
        setOriginal(job);
        setForm({
          ...BLANK,
          ...Object.fromEntries(Object.keys(BLANK).map((k) => [k, job[k] ?? BLANK[k]])),
          salaryMin: job.salaryMin ?? '',
          salaryMax: job.salaryMax ?? '',
          deadline: toDateInput(job.deadline),
        });
      })
      .catch((err) => toast.error(errMsg(err, 'Could not load the listing.')))
      .finally(() => setLoading(false));
  }, [id, isNew, navigate]);

  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [k]: v }));
  };

  const status = original?.status;
  const ended = status === 'closed' || status === 'filled';
  const secretariatPause = status === 'paused' && !original?.pausedByEmployer;
  const goesLive = status === 'published' || status === 'paused';
  // Anything past draft is resubmitted by the server on save, so a draft
  // button would mislead.
  const draftOnly = isNew || status === 'draft';
  const problem = problemWith(form, isNew);

  const payload = (submit) => ({
    ...form,
    salaryMin: form.salaryMin === '' ? '' : Number(form.salaryMin),
    salaryMax: form.salaryMax === '' ? '' : Number(form.salaryMax),
    applicationLink: form.applyMethod === 'external' ? form.applicationLink : '',
    minGrade: form.minGrade || 'none',
    submit,
  });

  const save = useCallback(async (submit) => {
    setTried(true);
    if (problem) {
      toast.error(problem);
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const d = await createListing(payload(submit));
        // 202: the account is not approved yet, so the server kept it as a draft.
        if (d.message) toast(d.message, { duration: 7000 });
        else toast.success(submit ? 'Submitted. The Secretariat will check it before it goes live.' : 'Draft saved');
      } else {
        const d = await updateListing(id, payload(submit));
        if (d.requeued) toast.success('Saved. The listing is back with the Secretariat for approval.', { duration: 6000 });
        else if (d.job?.status === 'pending') toast.success('Saved and sent for approval.');
        else if (d.job?.status === 'draft' && submit) toast('Saved as a draft. You can submit it once your account is approved.', { duration: 7000 });
        else toast.success('Saved');
      }
      navigate('/employer/listings');
    } catch (err) {
      toast.error(errMsg(err, 'Could not save the listing.'));
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, id, isNew, problem]);

  const onSaveExisting = () => {
    if (goesLive) setConfirmLive(true);
    else save(true);
  };

  const preview = useMemo(() => ({
    ...form,
    _id: id || 'preview',
    featured: false,
    salaryMin: form.salaryMin === '' ? undefined : Number(form.salaryMin),
    salaryMax: form.salaryMax === '' ? undefined : Number(form.salaryMax),
    minGradeLabel: gradeLabel(form.minGrade),
    sectorLabel: sectorLabel(form.sector),
    deadline: form.deadline || undefined,
    logo: form.logo || employer?.logo,
    employer: {
      companyName: form.company || employer?.companyName,
      registeredFirm: Boolean(employer?.qsFirm),
      isPartner: employer?.isPartner,
    },
  }), [form, id, employer]);

  if (loading) return <div className="emp-page"><div className="emp-card emp-empty" aria-busy="true">Loading the listing…</div></div>;

  if (ended || secretariatPause) {
    return (
      <div className="emp-page">
        <h1 className="emp-title">Edit <em>listing</em></h1>
        <div className="emp-card" style={{ marginTop: '1rem' }}>
          <p className="emp-text">
            {ended
              ? 'A closed or filled listing cannot be edited. Post a new listing instead.'
              : 'The NIQS Secretariat paused this listing. Please contact them about changes.'}
          </p>
          {original?.moderationNote && <p className="emp-error" style={{ marginTop: '.5rem' }}>Secretariat: {original.moderationNote}</p>}
          <div className="emp-actions" style={{ marginTop: '1rem' }}>
            <Link to="/employer/listings" className="emp-btn">Back to listings</Link>
            {ended && <Link to="/employer/listings/new" className="emp-btn primary">Post a new listing</Link>}
          </div>
        </div>
      </div>
    );
  }

  // Shown as soon as the box is ticked: this is the rule the server enforces.
  const gradeMissing = form.requiresQS && form.minGrade === 'none';

  return (
    <div className="emp-page">
      <div className="emp-head">
        <div>
          <h1 className="emp-title">{isNew ? <>Post a <em>job</em></> : <>Edit <em>listing</em></>}</h1>
          <p className="emp-lead">
            The NIQS Secretariat checks every listing before it goes live
            {info?.approvalTargetHours ? `, usually within ${info.approvalTargetHours} hours` : ''}.
          </p>
        </div>
        {status && <ListingStatusPill status={status} />}
      </div>

      <AccountBanner status={employer?.status} statusNote={employer?.statusNote} hours={info?.approvalTargetHours} />

      {original?.status === 'rejected' && original.moderationNote && (
        <div className="emp-banner" style={{ background: TONES.red.bg, borderColor: TONES.red.border, color: TONES.red.color }}>
          <Icon name="warning" size="sm" />
          <div>
            <strong>Changes the Secretariat asked for</strong>
            <span style={{ color: 'var(--text)' }}>{original.moderationNote}</span>
          </div>
        </div>
      )}
      {goesLive && (
        <div className="emp-banner" style={{ background: TONES.amber.bg, borderColor: TONES.amber.border, color: TONES.amber.color }}>
          <Icon name="warning" size="sm" />
          <div>
            <strong>This listing is {status === 'published' ? 'live' : 'paused'}</strong>
            <span style={{ color: 'var(--text2)' }}>Saving changes takes it off the board until the Secretariat approves the new version.</span>
          </div>
        </div>
      )}

      <div className="emp-form-layout">
        <form className="emp-card" onSubmit={(e) => { e.preventDefault(); if (draftOnly) save(true); else onSaveExisting(); }} noValidate>
          <div className="emp-card-title">The role</div>
          <div className="emp-form-grid">
            <div className="fg fw">
              <label className="flbl" htmlFor="l-title">Job title *</label>
              <input id="l-title" className="fi" value={form.title} onChange={set('title')} maxLength={140} placeholder="e.g. Senior Quantity Surveyor" required />
            </div>
            <div className="fg">
              <label className="flbl" htmlFor="l-company">Company *</label>
              <input id="l-company" className="fi" value={form.company} onChange={set('company')} required />
            </div>
            <div className="fg">
              <label className="flbl" htmlFor="l-location">Location *</label>
              <input id="l-location" className="fi" value={form.location} onChange={set('location')} placeholder="Town or area, e.g. Victoria Island" required />
            </div>
            <div className="fg">
              <label className="flbl" htmlFor="l-state">State</label>
              <select id="l-state" className="fi" value={form.state} onChange={set('state')}>
                <option value="">Choose a state</option>
                {LISTING_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="flbl" htmlFor="l-sector">Sector</label>
              <select id="l-sector" className="fi" value={form.sector} onChange={set('sector')}>
                {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="flbl" htmlFor="l-type">Type</label>
              <select id="l-type" className="fi" value={form.type} onChange={set('type')}>
                {JOB_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="fg">
              <label className="flbl" htmlFor="l-track">Listed under</label>
              <select id="l-track" className="fi" value={form.track} onChange={set('track')} aria-describedby="l-track-hint">
                {TRACKS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <span id="l-track-hint" className="emp-hint">
                Internships and SIWES placements are for students and new graduates. They are listed
                on the board's graduate track, separately from jobs.
              </span>
            </div>
          </div>

          <div className="emp-card-title" style={{ marginTop: '1rem' }}>Who can apply</div>
          <label className="emp-check">
            <input type="checkbox" checked={form.requiresQS} onChange={set('requiresQS')} />
            <span>
              This role requires a qualified quantity surveyor
              <span className="emp-hint" style={{ display: 'block' }}>
                NIQS rules require such a listing to state the minimum NIQS grade. Applicants below it cannot apply.
              </span>
            </span>
          </label>
          <div className="emp-form-grid">
            <div className="fg">
              <label className="flbl" htmlFor="l-grade">Minimum NIQS grade{form.requiresQS ? ' *' : ''}</label>
              <select
                id="l-grade"
                className="fi"
                value={form.minGrade}
                onChange={set('minGrade')}
                aria-invalid={gradeMissing || undefined}
                aria-describedby={gradeMissing ? 'l-grade-err' : undefined}
              >
                {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
              {gradeMissing && <span id="l-grade-err" className="emp-error">Choose the minimum grade this role needs.</span>}
            </div>
          </div>
          <label className="emp-check">
            <input type="checkbox" checked={form.membersOnly} onChange={set('membersOnly')} />
            <span>
              NIQS members only
              <span className="emp-hint" style={{ display: 'block' }}>
                {info && info.nonMembersCanApply === false
                  ? 'At present every listing on the board is open to members only.'
                  : 'Only signed-in NIQS members will be able to apply.'}
              </span>
            </span>
          </label>

          <div className="emp-card-title" style={{ marginTop: '1rem' }}>Details</div>
          <div className="fg">
            <label className="flbl" htmlFor="l-desc">Description *</label>
            <textarea id="l-desc" className="fi" rows={7} value={form.description} onChange={set('description')} placeholder="What the role involves, the projects, who it reports to" required />
          </div>
          <div className="fg">
            <label className="flbl" htmlFor="l-req">Requirements</label>
            <textarea id="l-req" className="fi" rows={5} value={form.requirements} onChange={set('requirements')} placeholder="Qualifications, years of experience, software, and so on" />
          </div>

          <div className="emp-form-grid">
            <div className="fg">
              <label className="flbl" htmlFor="l-smin">Salary from (₦ per month)</label>
              <input id="l-smin" className="fi" type="number" min="0" step="1000" inputMode="numeric" value={form.salaryMin} onChange={set('salaryMin')} />
            </div>
            <div className="fg">
              <label className="flbl" htmlFor="l-smax">Salary to (₦ per month)</label>
              <input id="l-smax" className="fi" type="number" min="0" step="1000" inputMode="numeric" value={form.salaryMax} onChange={set('salaryMax')} />
            </div>
            <div className="fg fw">
              <label className="flbl" htmlFor="l-stext">Salary as shown (optional)</label>
              <input id="l-stext" className="fi" value={form.salary} onChange={set('salary')} placeholder="e.g. Competitive, plus HMO and pension" />
              <span className="emp-hint">Shown instead of the range when filled in. The range is still used for salary filters.</span>
            </div>
            <div className="fg">
              <label className="flbl" htmlFor="l-deadline">Closing date</label>
              <input id="l-deadline" className="fi" type="date" min={todayInput()} value={form.deadline} onChange={set('deadline')} />
              <span className="emp-hint">The listing closes on its own after this date.</span>
            </div>
            <div className="fg">
              <label className="flbl" htmlFor="l-logo">Logo address (optional)</label>
              <input id="l-logo" className="fi" type="url" value={form.logo} onChange={set('logo')} placeholder={employer?.logo || 'https://'} />
              <span className="emp-hint">Leave blank to use the logo on your company profile.</span>
            </div>
          </div>

          <div className="emp-card-title" style={{ marginTop: '1rem' }}>How people apply</div>
          <fieldset className="emp-radio-set">
            <legend className="sr-only">Application method</legend>
            <label className="emp-check">
              <input type="radio" name="applyMethod" value="portal" checked={form.applyMethod === 'portal'} onChange={set('applyMethod')} />
              <span>
                On the NIQS job board (recommended)
                <span className="emp-hint" style={{ display: 'block' }}>
                  Applications arrive in your inbox here, and each shows whether the applicant's grade was checked against the NIQS register.
                </span>
              </span>
            </label>
            <label className="emp-check">
              <input type="radio" name="applyMethod" value="external" checked={form.applyMethod === 'external'} onChange={set('applyMethod')} />
              <span>
                On our own website or email link
                <span className="emp-hint" style={{ display: 'block' }}>Applicants leave the board, and their grade is not checked.</span>
              </span>
            </label>
          </fieldset>
          {form.applyMethod === 'external' && (
            <div className="fg">
              <label className="flbl" htmlFor="l-link">Application link *</label>
              <input id="l-link" className="fi" type="url" value={form.applicationLink} onChange={set('applicationLink')} placeholder="https://" required />
            </div>
          )}

          {tried && problem && <p className="emp-error" role="alert" style={{ marginTop: '.6rem' }}>{problem}</p>}

          <div className="emp-actions" style={{ marginTop: '1.2rem', justifyContent: 'flex-end' }}>
            <Link to="/employer/listings" className="emp-btn">Cancel</Link>
            {draftOnly ? (
              <>
                <button type="button" className="emp-btn" disabled={saving} onClick={() => save(false)}>
                  <Icon name="save" size={14} /> Save draft
                </button>
                <button
                  type="submit"
                  className="emp-btn primary"
                  disabled={saving || !approved}
                  aria-describedby={!approved ? 'l-submit-why' : undefined}
                >
                  Submit for approval
                </button>
              </>
            ) : (
              <button type="submit" className="emp-btn primary" disabled={saving}>
                {approved ? 'Save and send for approval' : 'Save'}
              </button>
            )}
          </div>
          {!approved && (
            <p id="l-submit-why" className="emp-hint" style={{ textAlign: 'right', marginTop: '.5rem' }}>
              {draftOnly
                ? 'You can submit listings once the NIQS Secretariat has approved your employer account. Save a draft for now.'
                : 'Your account is not approved at present, so this listing will be saved as a draft.'}
            </p>
          )}
        </form>

        <aside className="emp-preview">
          <div className="emp-card-title" style={{ fontSize: '.85rem' }}>Preview on the board</div>
          <div style={{ pointerEvents: 'none' }}>
            <JobCard job={preview} to={`/employer/listings/${id || 'new'}`} />
          </div>
          <p className="emp-hint" style={{ marginTop: '.6rem' }}>
            This is how the listing appears in search results. Featured placement can be requested from your listings page.
          </p>
        </aside>
      </div>

      {confirmLive && (
        <Modal
          title="Send this listing back for approval?"
          onClose={() => setConfirmLive(false)}
          footer={(
            <>
              <button type="button" className="emp-btn" onClick={() => setConfirmLive(false)}>Keep editing</button>
              <button type="button" className="emp-btn primary" disabled={saving} onClick={() => { setConfirmLive(false); save(true); }}>
                Save changes
              </button>
            </>
          )}
        >
          <p>
            The Secretariat approved the current version. When you save, the listing comes off the
            board and waits for approval of the new version
            {info?.approvalTargetHours ? `, usually within ${info.approvalTargetHours} hours` : ''}.
          </p>
          <p className="emp-muted" style={{ marginTop: '.6rem' }}>Applications already received are not affected.</p>
        </Modal>
      )}

      <style>{`
        .emp-form-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 1rem; align-items: start; }
        .emp-preview { position: sticky; top: 1rem; }
        .emp-preview .jrow { padding: 1rem; gap: .8rem; flex-wrap: wrap; }
        .emp-radio-set { border: none; padding: 0; margin: 0; }
        .emp-page textarea.fi { resize: vertical; }
        @media (max-width: 1024px) {
          .emp-form-layout { grid-template-columns: 1fr; }
          .emp-preview { position: static; }
        }
      `}</style>
    </div>
  );
};

export default EmployerListingForm;
