import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import Icon from '../../components/common/Icon';
import { Pill } from '../../components/jobs/JobBits';
import { employerMe, updateEmployerMe, changeEmployerPassword, employerSummary } from '../../api/jobsApi';
import { NIGERIAN_STATES, SECTORS, fmtDate } from '../../data/jobBoard';
import { errMsg, AccountStatusPill, AccountBanner } from './EmployerLayout';

/**
 * Company profile, password, and the things only the Secretariat can change
 * (account status, the Registered QS Firm mark, packages), shown read-only.
 */

const FIELDS = ['companyName', 'contactName', 'contactRole', 'phone', 'website', 'logo', 'address', 'state', 'sector', 'rcNumber', 'about'];
const fromEmployer = (e = {}) => Object.fromEntries(FIELDS.map((k) => [k, e[k] ?? '']));

const EmployerProfile = () => {
  const { employer, setEmployer } = useAuth();
  const [form, setForm] = useState(fromEmployer(employer || {}));
  const [full, setFull] = useState(null);         // GET /employers/me, with qsFirm populated
  const [pkg, setPkg] = useState(undefined);
  const [saving, setSaving] = useState(false);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    employerMe()
      .then((d) => { setFull(d.employer); setForm(fromEmployer(d.employer)); })
      .catch(() => {});
    employerSummary().then((s) => setPkg(s.package || null)).catch(() => setPkg(null));
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (!form.companyName.trim() || !form.contactName.trim()) {
      toast.error('Company name and contact name are required');
      return;
    }
    for (const k of ['website', 'logo']) {
      if (form[k] && !/^https?:\/\//i.test(form[k].trim())) {
        toast.error(`The ${k === 'logo' ? 'logo' : 'website'} address should start with http:// or https://`);
        return;
      }
    }
    setSaving(true);
    try {
      const d = await updateEmployerMe(form);
      // The update returns qsFirm as a bare id; keep the populated one we have.
      const merged = { ...d.employer, qsFirm: full?.qsFirm ?? d.employer.qsFirm };
      setEmployer(merged);
      setFull(merged);
      setForm(fromEmployer(merged));
      toast.success('Company profile saved');
    } catch (err) {
      toast.error(errMsg(err, 'Could not save the profile.'));
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword.length < 8) {
      toast.error('The new password must be at least 8 characters');
      return;
    }
    if (pw.newPassword !== pw.confirm) {
      toast.error('The new passwords do not match');
      return;
    }
    setPwSaving(true);
    try {
      await changeEmployerPassword({ currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      toast.success('Password changed');
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(errMsg(err, 'Could not change the password.'));
    } finally {
      setPwSaving(false);
    }
  };

  const acct = full || employer || {};
  const firm = acct.qsFirm && typeof acct.qsFirm === 'object' ? acct.qsFirm : null;

  return (
    <div className="emp-page">
      <div className="emp-head">
        <div>
          <h1 className="emp-title">Company <em>profile</em></h1>
          <p className="emp-lead">Shown with your listings on the job board.</p>
        </div>
      </div>

      <AccountBanner status={acct.status} statusNote={acct.statusNote} />

      <div className="emp-prof-layout">
        <div>
          <form className="emp-card" onSubmit={save}>
            <div className="emp-card-title">Organisation</div>
            <div className="emp-form-grid">
              <div className="fg fw">
                <label className="flbl" htmlFor="p-company">Company name *</label>
                <input id="p-company" className="fi" value={form.companyName} onChange={set('companyName')} autoComplete="organization" required />
              </div>
              <div className="fg">
                <label className="flbl" htmlFor="p-sector">Sector</label>
                <select id="p-sector" className="fi" value={form.sector} onChange={set('sector')}>
                  {SECTORS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="flbl" htmlFor="p-state">State</label>
                <select id="p-state" className="fi" value={form.state} onChange={set('state')}>
                  <option value="">Not stated</option>
                  {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="flbl" htmlFor="p-rc">CAC RC number</label>
                <input id="p-rc" className="fi" value={form.rcNumber} onChange={set('rcNumber')} />
              </div>
              <div className="fg">
                <label className="flbl" htmlFor="p-web">Website</label>
                <input id="p-web" className="fi" type="url" value={form.website} onChange={set('website')} placeholder="https://" autoComplete="url" />
              </div>
              <div className="fg fw">
                <label className="flbl" htmlFor="p-address">Address</label>
                <input id="p-address" className="fi" value={form.address} onChange={set('address')} autoComplete="street-address" />
              </div>
              <div className="fg fw">
                <label className="flbl" htmlFor="p-logo">Logo address</label>
                <div style={{ display: 'flex', gap: '.7rem', alignItems: 'center' }}>
                  {form.logo && /^https?:\/\//i.test(form.logo) && (
                    <img src={form.logo} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)', flexShrink: 0 }} />
                  )}
                  <input id="p-logo" className="fi" type="url" value={form.logo} onChange={set('logo')} placeholder="https://" />
                </div>
                <span className="emp-hint">A link to your logo image, for example from your own website. Square images look best.</span>
              </div>
              <div className="fg fw">
                <label className="flbl" htmlFor="p-about">About</label>
                <textarea id="p-about" className="fi" rows={4} maxLength={1000} value={form.about} onChange={set('about')} />
              </div>
            </div>

            <div className="emp-card-title" style={{ marginTop: '.6rem' }}>Contact person</div>
            <div className="emp-form-grid">
              <div className="fg">
                <label className="flbl" htmlFor="p-contact">Name *</label>
                <input id="p-contact" className="fi" value={form.contactName} onChange={set('contactName')} autoComplete="name" required />
              </div>
              <div className="fg">
                <label className="flbl" htmlFor="p-role">Role</label>
                <input id="p-role" className="fi" value={form.contactRole} onChange={set('contactRole')} />
              </div>
              <div className="fg">
                <label className="flbl" htmlFor="p-phone">Phone</label>
                <input id="p-phone" className="fi" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
              </div>
              <div className="fg">
                <label className="flbl" htmlFor="p-email">Sign-in email</label>
                <input id="p-email" className="fi" value={acct.email || ''} readOnly aria-describedby="p-email-hint" />
                <span id="p-email-hint" className="emp-hint">To change it, contact the NIQS Secretariat.</span>
              </div>
            </div>

            <div className="emp-actions" style={{ justifyContent: 'flex-end', marginTop: '.6rem' }}>
              <button type="submit" className="emp-btn primary" disabled={saving}>
                <Icon name="save" size={14} /> {saving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </form>

          <form className="emp-card" onSubmit={changePassword}>
            <div className="emp-card-title">Change password</div>
            {/* Lets password managers pair the new password with this account. */}
            <input type="text" name="username" autoComplete="username" value={acct.email || ''} readOnly hidden />
            <div className="emp-form-grid">
              <div className="fg fw">
                <label className="flbl" htmlFor="pw-current">Current password</label>
                <input id="pw-current" className="fi" type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} autoComplete="current-password" required />
              </div>
              <div className="fg">
                <label className="flbl" htmlFor="pw-new">New password</label>
                <input id="pw-new" className="fi" type="password" minLength={8} value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} placeholder="At least 8 characters" autoComplete="new-password" required />
              </div>
              <div className="fg">
                <label className="flbl" htmlFor="pw-confirm">Confirm new password</label>
                <input id="pw-confirm" className="fi" type="password" minLength={8} value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" required />
              </div>
            </div>
            <div className="emp-actions" style={{ justifyContent: 'flex-end' }}>
              <button type="submit" className="emp-btn primary" disabled={pwSaving}>{pwSaving ? 'Saving…' : 'Change password'}</button>
            </div>
          </form>
        </div>

        <aside>
          <div className="emp-card">
            <div className="emp-card-title">Account</div>
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <AccountStatusPill status={acct.status} />
              {acct.isPartner && <Pill tone="gold">NIQS Partner</Pill>}
            </div>
            {acct.createdAt && <p className="emp-muted" style={{ marginTop: '.5rem' }}>Registered {fmtDate(acct.createdAt)}</p>}
            <p className="emp-muted" style={{ marginTop: '.3rem' }}>Account status is set by the NIQS Secretariat.</p>
          </div>

          <div className="emp-card">
            <div className="emp-card-title">Registered QS Firm mark</div>
            {firm ? (
              <>
                <Pill tone="blue"><Icon name="office" size={13} /> Registered QS Firm</Pill>
                <p className="emp-text" style={{ marginTop: '.5rem' }}>
                  Your listings carry the mark because your account is linked to <b>{firm.name}</b> in
                  the <Link to="/search-qs-firms" className="emp-link">Find a QS Firm</Link> directory.
                </p>
              </>
            ) : acct.qsFirm ? (
              <p className="emp-text">Your account is linked to a firm in the Find a QS Firm directory, and your listings carry the mark.</p>
            ) : (
              <p className="emp-text">
                Firms listed in the <Link to="/search-qs-firms" className="emp-link">Find a QS Firm</Link> directory
                can show a Registered QS Firm mark on their listings. If your firm is in the directory, ask the
                NIQS Secretariat to link it to this account.
              </p>
            )}
          </div>

          <div className="emp-card">
            <div className="emp-card-title">Package</div>
            {pkg === undefined && <p className="emp-muted">Loading…</p>}
            {pkg === null && (
              <p className="emp-muted">
                No recruitment package. The Secretariat sets packages up for organisations that hire
                often. <Link to="/employers" className="emp-link">See prices</Link>.
              </p>
            )}
            {pkg && (
              <>
                <div style={{ fontWeight: 700, color: 'var(--navy)' }}>{pkg.name}</div>
                <ul className="emp-muted" style={{ margin: '.4rem 0 0', paddingLeft: '1.1rem', listStyle: 'disc' }}>
                  {pkg.listingsQuota > 0 && <li>{pkg.listingsQuota} listings</li>}
                  <li>{pkg.featuredRemaining} of {pkg.featuredQuota || 0} featured placements left</li>
                  {pkg.expiresAt && <li>Ends {fmtDate(pkg.expiresAt)}</li>}
                </ul>
              </>
            )}
          </div>
        </aside>
      </div>

      <style>{`
        .emp-prof-layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 1rem; align-items: start; }
        .emp-prof-layout aside .emp-card + .emp-card { margin-top: 1rem; }
        @media (max-width: 1024px) { .emp-prof-layout { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
};

export default EmployerProfile;
